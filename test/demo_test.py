import sys, http.server, threading, functools
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
failures, errors = [], []

def check(name, cond, extra=""):
    print(("PASS " if cond else "FAIL ") + name + (f"  {extra}" if extra and not cond else ""))
    if not cond: failures.append(name)

handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
handler.log_message = lambda *a, **k: None
srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f"http://127.0.0.1:{srv.server_port}/index.html"

def txt(page):
    return page.evaluate("document.querySelector('cumulus-card').shadowRoot.textContent.replace(/\\s+/g,' ')")

def click_card(page, sel):
    page.evaluate("s => document.querySelector('cumulus-card').shadowRoot.querySelector(s).click()", sel)

with sync_playwright() as p:
    b = p.chromium.launch()
    page = b.new_page(viewport={"width": 1100, "height": 900}, device_scale_factor=1)
    page.on("pageerror", lambda e: errors.append(str(e)))
    page.on("console", lambda m: errors.append(m.text) if m.type == "error" else None)
    page.goto(URL)
    page.wait_for_selector("cumulus-card")

    t = txt(page)
    check("rendu initial (arrêté, Tempo bleu/inconnu)", "Arrêté" in t and "Bleu" in t and "Inconnu" in t, t[:150])

    page.click('[data-scenario="heating"]')
    t = txt(page)
    check("scénario chauffe : En chauffe + 2 194 W", "En chauffe" in t and "2 194" in t.replace("\u202f", " ").replace("\u00a0", " "), t[:200])

    page.click('[data-scenario="force"]')
    t1 = txt(page)
    check("scénario marche forcée : Active + 2 h 14/15 min", "Active" in t1 and ("2 h 14 min" in t1 or "2 h 15 min" in t1), t1)
    page.wait_for_timeout(2100)
    check("compte à rebours évolue", txt(page) != t1)

    # Interrupteur de la carte -> modifie le faux état
    click_card(page, "[data-action=toggle-force]")
    t = txt(page)
    check("interrupteur carte : marche forcée coupée", "Désactivée" in t, t[:200])
    click_card(page, "[data-action=toggle-force]")
    t = txt(page)
    check("interrupteur carte : marche forcée relancée (2 h 59/3 h)", "Active" in t and ("2 h 59 min" in t or "3 h 00 min" in t), t)

    # Bouton rond
    page.click('[data-scenario="off"]')
    click_card(page, "[data-action=toggle-switch]")
    check("bouton rond : allume le cumulus", "En chauffe" in txt(page))
    click_card(page, "[data-action=toggle-switch]")
    check("bouton rond : éteint le cumulus", "Arrêté" in txt(page))

    # Tempo
    page.click('[data-day="today"][data-color="RED"]')
    page.click('[data-day="tomorrow"][data-color="WHITE"]')
    t = txt(page)
    check("Tempo rouge aujourd'hui / blanc demain", "Rouge" in t and "Blanc" in t, t)

    # Fin de minuteur
    page.click('[data-scenario="force-end"]')
    check("fin de marche forcée : active au départ", "Active" in txt(page))
    page.wait_for_timeout(11500)
    check("fin de marche forcée : coupée après 10 s", "Désactivée" in txt(page))

    # Clic sur tuile -> journal
    click_card(page, "[data-entity='sensor.cout_cumulus_mois']")
    check("clic tuile : more-info journalisé", "sensor.cout_cumulus_mois" in page.inner_text("#log"))

    # Thème
    page.evaluate("document.body.classList.remove('dark')")
    page.click("#theme")
    check("thème sombre activé", page.evaluate("document.body.classList.contains('dark')"))
    page.screenshot(path=str(ROOT / "test" / "demo-dark.png"))
    page.click("#theme")
    check("thème clair rétabli", not page.evaluate("document.body.classList.contains('dark')"))
    page.click('[data-scenario="force"]')
    page.screenshot(path=str(ROOT / "test" / "demo-light.png"))

    # Mobile
    m = b.new_page(viewport={"width": 390, "height": 800}, device_scale_factor=1)
    m.goto(URL); m.wait_for_selector("cumulus-card")
    overflow = m.evaluate("document.documentElement.scrollWidth > document.documentElement.clientWidth")
    check("mobile : pas de défilement horizontal", not overflow)
    b.close()

srv.shutdown()
check("aucune erreur console / page", not errors, errors)
print("\nRÉSULTAT :", "OK" if not failures else f"{len(failures)} échec(s)")
sys.exit(1 if failures else 0)
