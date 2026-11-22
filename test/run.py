import asyncio, json, sys
from pathlib import Path
from playwright.async_api import async_playwright

ROOT = Path(__file__).resolve().parent
URL = (ROOT / "harness.html").as_uri()
CONFIG = {"type": "custom:cumulus-card"}
errors, failures = [], []

def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  {extra}" if extra and not cond else ""))
    if not cond: failures.append(name)

async def text(page):
    return await page.evaluate("document.querySelector('cumulus-card').shadowRoot.textContent.replace(/\\s+/g,' ')")

async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch()
        page = await b.new_page(viewport={"width": 480, "height": 900}, device_scale_factor=2)
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
        await page.goto(URL)

        # 1. Rendu avec l'état réel (cumulus éteint, marche forcée inactive)
        await page.evaluate("mount(%s, makeHass())" % json.dumps(CONFIG))
        t = await text(page)
        for needle in ["Cumulus", "Arrêté", "Puissance", "236", "971", "Marche forcée", "Désactivée",
                       "0,00", "9,55", "12,80", "Dernière chauffe", "Hier à 05:20", "Prochaine chauffe",
                       "Aujourd'hui", "Demain", "Bleu", "Inconnu"]:
            check(f"texte « {needle} »", needle in t, t[:200])
        await page.screenshot(path=str(ROOT.parent / "docs" / "screenshot-off.png"), clip={"x":0,"y":0,"width":480,"height":620})

        # 2. Clic bouton on/off
        await page.evaluate("window.__calls.length = 0")
        await page.evaluate("document.querySelector('cumulus-card').shadowRoot.querySelector('[data-action=toggle-switch]').click()")
        calls = await page.evaluate("window.__calls")
        check("bouton on/off appelle homeassistant.toggle(switch.cumulus)",
              calls == [["homeassistant", "toggle", {"entity_id": "switch.cumulus"}]], calls)

        # 3. Clic marche forcée
        await page.evaluate("window.__calls.length = 0")
        await page.evaluate("document.querySelector('cumulus-card').shadowRoot.querySelector('[data-action=toggle-force]').click()")
        calls = await page.evaluate("window.__calls")
        check("interrupteur marche forcée appelle input_boolean.toggle",
              calls == [["input_boolean", "toggle", {"entity_id": "input_boolean.marche_forcee_cumulus"}]], calls)

        # 4. Chauffe + marche forcée active avec compte à rebours
        await page.evaluate("""() => {
          const fin = new Date(Date.now() + (2*3600 + 14*60 + 5)*1000).toISOString();
          mount(%s, makeHass({states: {
            'switch.cumulus': {state:'on', attributes:{}},
            'sensor.cumulus_power': {state:'2194', attributes:{unit_of_measurement:'W'}},
            'sensor.cumulus_current': {state:'9.3', attributes:{unit_of_measurement:'A'}},
            'sensor.myelectricaldata_tempo_today': {state:'RED', attributes:{}},
            'sensor.myelectricaldata_tempo_tomorrow': {state:'WHITE', attributes:{}},
            'input_boolean.marche_forcee_cumulus': {state:'on', attributes:{}},
            'timer.cumulus_marche_forcee': {state:'active', attributes:{duration:'3:00:00', finishes_at: fin}},
          }}));
        }""" % json.dumps(CONFIG))
        t1 = await text(page)
        check("état « En chauffe »", "En chauffe" in t1)
        check("marche forcée Active", "Active" in t1)
        check("temps restant ~2 h 14", "2 h 14 min" in t1 or "2 h 13 min" in t1, t1)
        check("Tempo rouge / blanc", "Rouge" in t1 and "Blanc" in t1)
        await page.wait_for_timeout(2200)
        t2 = await text(page)
        check("compte à rebours évolue", t1 != t2)
        await page.screenshot(path=str(ROOT.parent / "docs" / "screenshot-on.png"), clip={"x":0,"y":0,"width":480,"height":680})

        # 5. Thème sombre
        await page.evaluate("document.body.classList.add('dark')")
        await page.screenshot(path=str(ROOT.parent / "docs" / "screenshot-dark.png"), clip={"x":0,"y":0,"width":480,"height":680})
        await page.evaluate("document.body.classList.remove('dark')")

        # 6. Entités manquantes / indisponibles : pas d'exception
        await page.evaluate("""() => mount({type:'custom:cumulus-card', switch:'switch.nope', tempo_today:'', tempo_tomorrow:'', cost_day:'', cost_month:'', cost_cycle:''}, makeHass({states:{'switch.cumulus': {state:'unavailable', attributes:{}}}}))""")
        t3 = await text(page)
        check("entité absente => Indisponible sans erreur", "Indisponible" in t3)

        # 7. Logique « une nuit sur deux » (parité identique à l'automatisation Python)
        res = await page.evaluate("""() => {
          const cfg = {schedule_start:'22:01', schedule_end:'06:00', schedule_parity:0};
          const out = [];
          // dates de référence : 2026-11-22 (dimanche) et suivantes
          for (const [iso, label] of [['2026-11-22T12:00:00','midi 22/11'], ['2026-11-22T23:00:00','23h 22/11'],
                                      ['2026-11-23T03:00:00','3h 23/11'], ['2026-11-23T12:00:00','midi 23/11'],
                                      ['2026-11-23T23:00:00','23h 23/11']]) {
            const r = cumulusComputeSchedule(cfg, new Date(iso));
            out.push([label, r.running ? 'en cours jusqu\\'à ' + r.until.toISOString().slice(0,16) : 'prochaine ' + r.when.getFullYear()+'-'+(r.when.getMonth()+1)+'-'+r.when.getDate()]);
          }
          out.push(['ordinal 2026-11-22', cumulusOrdinal(new Date('2026-11-22T12:00:00'))]);
          return out;
        }""")
        for r in res: print("   ", r)
        py = __import__("datetime").date(2026, 11, 22).toordinal()
        check("ordinal JS == Python", res[-1][1] == py, f"js={res[-1][1]} py={py}")

        # 8. Éditeur (ha-form simulé)
        await page.evaluate("""() => {
          customElements.define('ha-form', class extends HTMLElement {});
          const ed = document.createElement('cumulus-card-editor');
          ed.setConfig({type:'custom:cumulus-card', switch:'switch.cumulus'});
          ed.hass = makeHass();
          document.body.appendChild(ed); window.__ed = ed;
        }""")
        sch = await page.evaluate("window.__ed.querySelector('ha-form').schema.length")
        check("éditeur : ha-form créé avec un schéma", sch >= 5, sch)
        evt = await page.evaluate("""() => new Promise(res => {
          window.__ed.addEventListener('config-changed', e => res(e.detail.config));
          const f = window.__ed.querySelector('ha-form');
          f.dispatchEvent(new CustomEvent('value-changed', {detail:{value:{...f.data, name:'Ballon', schedule_parity:'1'}}}));
        })""")
        check("éditeur : config-changed (nom + parité numérique)", evt.get("name") == "Ballon" and evt.get("schedule_parity") == 1, evt)

        await b.close()
    check("aucune erreur console / page", not errors, errors)
    print("\nRÉSULTAT :", "OK" if not failures else f"{len(failures)} échec(s)")
    sys.exit(1 if failures else 0)

asyncio.run(main())
