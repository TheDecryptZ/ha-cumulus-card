/*!
 * Cumulus Card — carte Lovelace pour piloter et suivre un cumulus (chauffe-eau)
 * Licence MIT — https://github.com/TheDecryptZ/ha-cumulus-card
 */
const CUMULUS_CARD_VERSION = "1.0.0";

/* ------------------------------------------------------------------ */
/* Configuration par défaut                                            */
/* ------------------------------------------------------------------ */
const CUMULUS_DEFAULTS = {
  name: "Cumulus",
  switch: "switch.cumulus",
  power: "sensor.cumulus_power",
  voltage: "sensor.cumulus_voltage",
  current: "sensor.cumulus_current",
  energy: "sensor.cumulus_energy",
  force_boolean: "input_boolean.marche_forcee_cumulus",
  force_timer: "timer.cumulus_marche_forcee",
  cost_day: "sensor.cout_cumulus_jour",
  cost_month: "sensor.cout_cumulus_mois",
  cost_cycle: "sensor.cout_cumulus_cycle",
  last_heat: "input_datetime.cumulus_derniere_chauffe",
  tempo_today: "sensor.myelectricaldata_tempo_today",
  tempo_tomorrow: "sensor.myelectricaldata_tempo_tomorrow",
  automation: "automation.gestion_cumulus_tempo_rte_dev",
  force_duration: 3, // heures, si le timer n'expose pas sa durée
  schedule_start: "22:01",
  schedule_end: "06:00",
  schedule_parity: 0, // 0 : nuits dont le quantième ordinal est pair (comme l'automatisation)
  show_metrics: true,
  show_force: true,
  show_costs: true,
  show_schedule: true,
  show_tempo: true,
};

const CUMULUS_ENTITY_KEYS = [
  "switch", "power", "voltage", "current", "energy",
  "force_boolean", "force_timer",
  "cost_day", "cost_month", "cost_cycle",
  "last_heat", "tempo_today", "tempo_tomorrow", "automation",
];

/* ------------------------------------------------------------------ */
/* Traductions                                                         */
/* ------------------------------------------------------------------ */
const CUMULUS_I18N = {
  fr: {
    heating: "En chauffe", idle: "Arrêté", unavailable: "Indisponible",
    toggle: "Allumer / éteindre le cumulus",
    power: "Puissance", voltage: "Tension", current: "Courant", energy: "Énergie",
    force: "Marche forcée", force_on: "Active", force_off: "Désactivée",
    force_hint: "{d} h max, puis retour au programme",
    remaining: "restant", paused: "En pause",
    costs: "Coûts", day: "Jour", month: "Mois", cycle: "Cycle",
    last_heat: "Dernière chauffe", next_heat: "Prochaine chauffe",
    never: "Jamais", running: "En cours, jusqu'à {t}",
    automation_off: "Automatisation désactivée",
    tempo: "Tempo", today: "Aujourd'hui", tomorrow: "Demain",
    blue: "Bleu", white: "Blanc", red: "Rouge", unknown: "Inconnu",
    d0: "Aujourd'hui", d1: "Demain", dm1: "Hier", at: "à",
    tonight: "Ce soir", missing: "Entité introuvable",
  },
  en: {
    heating: "Heating", idle: "Off", unavailable: "Unavailable",
    toggle: "Turn water heater on / off",
    power: "Power", voltage: "Voltage", current: "Current", energy: "Energy",
    force: "Boost", force_on: "On", force_off: "Off",
    force_hint: "{d} h max, then back to schedule",
    remaining: "left", paused: "Paused",
    costs: "Costs", day: "Day", month: "Month", cycle: "Cycle",
    last_heat: "Last heating", next_heat: "Next heating",
    never: "Never", running: "Running, until {t}",
    automation_off: "Automation disabled",
    tempo: "Tempo", today: "Today", tomorrow: "Tomorrow",
    blue: "Blue", white: "White", red: "Red", unknown: "Unknown",
    d0: "Today", d1: "Tomorrow", dm1: "Yesterday", at: "at",
    tonight: "Tonight", missing: "Entity not found",
  },
};

const CUMULUS_TEMPO = {
  blue: { label: "blue", color: "#1e88e5", text: "#ffffff" },
  white: { label: "white", color: "#f5f5f5", text: "#37474f" },
  red: { label: "red", color: "#e53935", text: "#ffffff" },
  unknown: { label: "unknown", color: "#9e9e9e", text: "#ffffff" },
};

/* ------------------------------------------------------------------ */
/* Icônes (SVG en ligne, indépendantes de ha-icon)                     */
/* ------------------------------------------------------------------ */
const CUMULUS_ICONS = {
  power: '<path d="M12 3v9"/><path d="M6.3 6.6a8 8 0 1 0 11.4 0"/>',
  bolt: '<polygon points="13 2 4 14 11 14 10 22 20 9 13 9 13 2"/>',
  gauge: '<path d="M4 17a8 8 0 1 1 16 0"/><path d="M12 17l4-5"/>',
  flame: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z"/>',
  timer: '<circle cx="12" cy="13" r="8"/><path d="M12 9v4l2.5 2"/><path d="M9.5 2.5h5"/>',
  euro: '<path d="M18 6.5A7 7 0 1 0 18 17.5"/><path d="M4 10h9"/><path d="M4 14h9"/>',
  history: '<path d="M3.5 12a8.5 8.5 0 1 0 2.5-6"/><path d="M3.5 4v4.5H8"/><path d="M12 8v4.5l3 1.5"/>',
  calendar: '<rect x="3.5" y="5" width="17" height="15" rx="2"/><path d="M3.5 10h17"/><path d="M8 3v4"/><path d="M16 3v4"/>',
  palette: '<circle cx="8" cy="9" r="2.2"/><circle cx="15" cy="8" r="2.2"/><circle cx="12" cy="15" r="2.2"/>',
};

function cumulusIcon(name, size = 20) {
  return `<svg class="ico" viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${CUMULUS_ICONS[name] || ""}</svg>`;
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */
function cumulusEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

function cumulusPad(n) {
  return String(n).padStart(2, "0");
}

function cumulusParseHM(value, fallback) {
  const m = /^(\d{1,2}):(\d{2})/.exec(String(value || ""));
  if (!m) return fallback;
  return { h: Number(m[1]), m: Number(m[2]) };
}

// Équivalent de datetime.date.toordinal() (1er janvier de l'an 1 = 1).
function cumulusOrdinal(date) {
  return Math.floor(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()) / 86400000) + 719163;
}

function cumulusParseDuration(value) {
  const m = /^(\d+):(\d{2}):(\d{2})/.exec(String(value || ""));
  if (!m) return null;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function cumulusFormatDuration(totalSeconds) {
  const s = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h} h ${cumulusPad(m)} min ${cumulusPad(sec)} s`;
  return `${m} min ${cumulusPad(sec)} s`;
}

function cumulusParseDateTime(state) {
  if (!state || ["unknown", "unavailable", "none", ""].includes(String(state).toLowerCase())) return null;
  const raw = String(state);
  const hasTime = raw.includes(":");
  const iso = raw.includes("T") ? raw : raw.replace(" ", "T");
  const d = new Date(hasTime ? iso : `${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return null;
  return { date: d, hasTime };
}

function cumulusTempoInfo(state) {
  const s = String(state || "").trim().toLowerCase();
  if (["blue", "bleu"].includes(s)) return "blue";
  if (["white", "blanc"].includes(s)) return "white";
  if (["red", "rouge"].includes(s)) return "red";
  return "unknown";
}

/**
 * Reproduit la logique de l'automatisation « Cumulus – gestion Tempo » :
 * chauffe une nuit sur deux, entre `schedule_start` et `schedule_end`.
 * La nuit est identifiée par le jour calendaire où elle commence.
 */
function cumulusComputeSchedule(config, now = new Date()) {
  const start = cumulusParseHM(config.schedule_start, { h: 22, m: 1 });
  const end = cumulusParseHM(config.schedule_end, { h: 6, m: 0 });
  const parity = Number(config.schedule_parity) === 1 ? 1 : 0;
  const isActiveNight = (day) => cumulusOrdinal(day) % 2 === parity;

  const nowMin = now.getHours() * 60 + now.getMinutes();
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  const inRange = nowMin >= startMin || nowMin < endMin;

  if (inRange) {
    const nightStart = new Date(now);
    if (nowMin < endMin) nightStart.setDate(nightStart.getDate() - 1);
    if (isActiveNight(nightStart)) {
      const until = new Date(now);
      if (nowMin >= startMin) until.setDate(until.getDate() + 1);
      until.setHours(end.h, end.m, 0, 0);
      return { running: true, until };
    }
  }

  for (let offset = 0; offset <= 3; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const when = new Date(day);
    when.setHours(start.h, start.m, 0, 0);
    if (when > now && isActiveNight(day)) return { running: false, when };
  }
  return null;
}

/* ------------------------------------------------------------------ */
/* Carte                                                               */
/* ------------------------------------------------------------------ */
class CumulusCard extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._config = null;
    this._hass = null;
    this._signature = "";
    this._tick = null;
    this._ready = false;
  }

  static getConfigElement() {
    return document.createElement("cumulus-card-editor");
  }

  static getStubConfig(hass) {
    const states = (hass && hass.states) || {};
    const stub = { type: "custom:cumulus-card" };
    CUMULUS_ENTITY_KEYS.forEach((key) => {
      if (states[CUMULUS_DEFAULTS[key]]) stub[key] = CUMULUS_DEFAULTS[key];
    });
    if (!stub.switch) {
      const first = Object.keys(states).find((id) => id.startsWith("switch."));
      if (first) stub.switch = first;
    }
    return stub;
  }

  setConfig(config) {
    if (!config || typeof config !== "object") {
      throw new Error("Configuration invalide");
    }
    this._config = { ...CUMULUS_DEFAULTS, ...config };
    // Une entité explicitement vidée désactive la ligne correspondante.
    CUMULUS_ENTITY_KEYS.forEach((key) => {
      if (config[key] === "" || config[key] === null) this._config[key] = "";
    });
    this._signature = "";
    if (this._hass) this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    const sig = this._computeSignature();
    if (sig !== this._signature) {
      this._signature = sig;
      this._render();
    }
  }

  connectedCallback() {
    this._startTick();
  }

  disconnectedCallback() {
    if (this._tick) clearInterval(this._tick);
    this._tick = null;
  }

  getCardSize() {
    let size = 2;
    if (this._config?.show_metrics) size += 1;
    if (this._config?.show_force) size += 1;
    if (this._config?.show_costs) size += 1;
    if (this._config?.show_schedule) size += 1;
    if (this._config?.show_tempo) size += 1;
    return size;
  }

  getGridOptions() {
    return { columns: 12, min_columns: 6, rows: "auto" };
  }

  /* --------------------------- helpers --------------------------- */
  _t(key, vars = {}) {
    const lang = String(this._hass?.locale?.language || this._hass?.language || "fr").slice(0, 2);
    const dict = CUMULUS_I18N[lang] || CUMULUS_I18N.fr;
    let text = dict[key] ?? CUMULUS_I18N.fr[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => { text = text.replace(`{${k}}`, v); });
    return text;
  }

  _lang() {
    return String(this._hass?.locale?.language || this._hass?.language || "fr");
  }

  _stateObj(key) {
    const id = this._config?.[key];
    return id && this._hass?.states ? this._hass.states[id] : undefined;
  }

  _computeSignature() {
    const parts = [Math.floor(Date.now() / 60000)];
    CUMULUS_ENTITY_KEYS.forEach((key) => {
      const s = this._stateObj(key);
      parts.push(s ? `${s.state}|${s.attributes?.finishes_at || ""}|${s.attributes?.remaining || ""}` : "-");
    });
    return parts.join("§");
  }

  _numberFormat(value, digits = 1) {
    const n = Number(value);
    if (!Number.isFinite(n)) return null;
    return new Intl.NumberFormat(this._lang(), { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(n);
  }

  _metric(key, digits, fallbackUnit) {
    const s = this._stateObj(key);
    if (!s) return { text: "—", unit: fallbackUnit || "" };
    const formatted = this._numberFormat(s.state, digits);
    return {
      text: formatted ?? "—",
      unit: s.attributes?.unit_of_measurement || fallbackUnit || "",
    };
  }

  _money(key) {
    const s = this._stateObj(key);
    if (!s) return "—";
    const n = Number(s.state);
    if (!Number.isFinite(n)) return "—";
    const unit = s.attributes?.unit_of_measurement || "€";
    return `${new Intl.NumberFormat(this._lang(), { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)}\u00a0${unit}`;
  }

  _relativeDay(date) {
    const today = new Date();
    const startOf = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((startOf(date) - startOf(today)) / 86400000);
    if (diff === 0) return this._t("d0");
    if (diff === 1) return this._t("d1");
    if (diff === -1) return this._t("dm1");
    return new Intl.DateTimeFormat(this._lang(), { weekday: "short", day: "numeric", month: "short" }).format(date);
  }

  _time(date) {
    return `${cumulusPad(date.getHours())}:${cumulusPad(date.getMinutes())}`;
  }

  _timerRemaining() {
    const timer = this._stateObj("force_timer");
    if (!timer) return null;
    if (timer.state === "active") {
      const finishes = Date.parse(timer.attributes?.finishes_at || "");
      if (Number.isFinite(finishes)) return { seconds: (finishes - Date.now()) / 1000, paused: false };
      return null;
    }
    if (timer.state === "paused") {
      const rem = cumulusParseDuration(timer.attributes?.remaining);
      return rem === null ? null : { seconds: rem, paused: true };
    }
    return null;
  }

  _timerTotal() {
    const timer = this._stateObj("force_timer");
    const fromTimer = cumulusParseDuration(timer?.attributes?.duration);
    if (fromTimer) return fromTimer;
    return Number(this._config.force_duration || 3) * 3600;
  }

  _startTick() {
    if (this._tick) clearInterval(this._tick);
    this._tick = setInterval(() => this._updateCountdown(), 1000);
  }

  _updateCountdown() {
    const root = this.shadowRoot;
    const label = root.querySelector("[data-countdown]");
    if (!label) return;
    const rem = this._timerRemaining();
    if (!rem) return;
    label.textContent = `${cumulusFormatDuration(rem.seconds)} ${this._t("remaining")}`;
    const bar = root.querySelector("[data-progress]");
    if (bar) {
      const total = this._timerTotal();
      const pct = Math.min(100, Math.max(0, (1 - rem.seconds / total) * 100));
      bar.style.width = `${pct}%`;
    }
    if (rem.seconds <= 0 && !rem.paused) this._signature = "";
  }

  /* --------------------------- actions --------------------------- */
  _moreInfo(entityId) {
    if (!entityId) return;
    this.dispatchEvent(new CustomEvent("hass-more-info", {
      bubbles: true, composed: true, detail: { entityId },
    }));
  }

  _toggleSwitch() {
    const id = this._config.switch;
    if (!id || !this._hass) return;
    this._hass.callService("homeassistant", "toggle", { entity_id: id });
  }

  _toggleForce() {
    const id = this._config.force_boolean;
    if (!id || !this._hass) return;
    // L'automatisation « fin de la marche forcée » démarre / annule le timer.
    this._hass.callService("input_boolean", "toggle", { entity_id: id });
  }

  _onClick(ev) {
    const path = ev.composedPath ? ev.composedPath() : [];
    for (const node of path) {
      if (!node.dataset) continue;
      if (node.dataset.action === "toggle-switch") { this._toggleSwitch(); return; }
      if (node.dataset.action === "toggle-force") { this._toggleForce(); return; }
      if (node.dataset.entity) { this._moreInfo(node.dataset.entity); return; }
    }
  }

  /* --------------------------- rendu ----------------------------- */
  _render() {
    if (!this._config || !this._hass) return;
    const cfg = this._config;
    const sw = this._stateObj("switch");
    const unavailable = !sw || ["unavailable", "unknown"].includes(sw.state);
    const isOn = sw?.state === "on";
    const statusText = unavailable ? this._t("unavailable") : isOn ? this._t("heating") : this._t("idle");
    const statusClass = unavailable ? "unavailable" : isOn ? "on" : "off";

    const body = [];
    if (cfg.show_metrics) body.push(this._renderMetrics());
    if (cfg.show_force && cfg.force_boolean) body.push(this._renderForce());
    if (cfg.show_costs && (cfg.cost_day || cfg.cost_month || cfg.cost_cycle)) body.push(this._renderCosts());
    if (cfg.show_schedule) body.push(this._renderSchedule());
    if (cfg.show_tempo && (cfg.tempo_today || cfg.tempo_tomorrow)) body.push(this._renderTempo());

    this.shadowRoot.innerHTML = `
      <style>${this._styles()}</style>
      <ha-card>
        <div class="header">
          <div class="title" data-entity="${cumulusEscape(cfg.switch)}">
            <span class="name">${cumulusEscape(cfg.name)}</span>
            <span class="status ${statusClass}"><i></i>${cumulusEscape(statusText)}</span>
          </div>
          <button class="power ${statusClass}" data-action="toggle-switch"
                  title="${cumulusEscape(this._t("toggle"))}" aria-label="${cumulusEscape(this._t("toggle"))}"
                  ${cfg.switch ? "" : "disabled"}>${cumulusIcon("power", 26)}</button>
        </div>
        ${body.join("")}
      </ha-card>`;

    if (!this._ready) {
      this.shadowRoot.addEventListener("click", (ev) => this._onClick(ev));
      this._ready = true;
    }
    this._updateCountdown();
  }

  _section(title, icon, content) {
    return `<section><h3>${cumulusIcon(icon, 16)}<span>${cumulusEscape(title)}</span></h3>${content}</section>`;
  }

  _renderMetrics() {
    const items = [
      ["power", "power", 0, "W", "gauge"],
      ["voltage", "voltage", 0, "V", "bolt"],
      ["current", "current", 2, "A", "bolt"],
      ["energy", "energy", 1, "kWh", "flame"],
    ].filter(([key]) => this._config[key]);
    if (!items.length) return "";
    const cells = items.map(([key, label, digits, unit, icon]) => {
      const m = this._metric(key, digits, unit);
      return `<div class="tile" data-entity="${cumulusEscape(this._config[key])}">
        <div class="tile-label">${cumulusIcon(icon, 14)}${cumulusEscape(this._t(label))}</div>
        <div class="tile-value">${cumulusEscape(m.text)}<small>${cumulusEscape(m.unit)}</small></div>
      </div>`;
    }).join("");
    return `<section><div class="grid metrics">${cells}</div></section>`;
  }

  _renderForce() {
    const boolState = this._stateObj("force_boolean");
    const active = boolState?.state === "on";
    const rem = this._timerRemaining();
    let detail = this._t("force_hint", { d: this._numberFormat(this._timerTotal() / 3600, 1) });
    let progress = "";
    if (active && rem) {
      const label = rem.paused
        ? `${this._t("paused")} · ${cumulusFormatDuration(rem.seconds)}`
        : `${cumulusFormatDuration(rem.seconds)} ${this._t("remaining")}`;
      detail = `<span data-countdown>${cumulusEscape(label)}</span>`;
      const pct = Math.min(100, Math.max(0, (1 - rem.seconds / this._timerTotal()) * 100));
      progress = `<div class="bar"><div data-progress style="width:${pct}%"></div></div>`;
    } else {
      detail = cumulusEscape(detail);
    }
    const unavailable = !boolState || boolState.state === "unavailable";
    return `<section class="force ${active ? "active" : ""}">
      <div class="force-row">
        <div class="force-info" data-entity="${cumulusEscape(this._config.force_timer || this._config.force_boolean)}">
          <div class="force-title">${cumulusIcon("timer", 18)}<span>${cumulusEscape(this._t("force"))}</span>
            <em>${cumulusEscape(active ? this._t("force_on") : this._t("force_off"))}</em></div>
          <div class="force-detail">${detail}</div>
        </div>
        <button class="switch ${active ? "on" : ""}" role="switch" aria-checked="${active}"
                data-action="toggle-force" ${unavailable ? "disabled" : ""}
                aria-label="${cumulusEscape(this._t("force"))}"><span></span></button>
      </div>
      ${progress}
    </section>`;
  }

  _renderCosts() {
    const items = [["cost_day", "day"], ["cost_month", "month"], ["cost_cycle", "cycle"]]
      .filter(([key]) => this._config[key]);
    const cells = items.map(([key, label]) => `
      <div class="tile" data-entity="${cumulusEscape(this._config[key])}">
        <div class="tile-label">${cumulusEscape(this._t(label))}</div>
        <div class="tile-value">${cumulusEscape(this._money(key))}</div>
      </div>`).join("");
    return this._section(this._t("costs"), "euro", `<div class="grid costs">${cells}</div>`);
  }

  _renderSchedule() {
    const rows = [];
    const lastObj = this._stateObj("last_heat");
    if (this._config.last_heat) {
      const parsed = cumulusParseDateTime(lastObj?.state);
      let text = this._t("never");
      if (parsed) {
        text = parsed.hasTime
          ? `${this._relativeDay(parsed.date)} ${this._t("at")} ${this._time(parsed.date)}`
          : this._relativeDay(parsed.date);
      }
      rows.push(`<div class="row" data-entity="${cumulusEscape(this._config.last_heat)}">
        <span class="row-label">${cumulusIcon("history", 18)}${cumulusEscape(this._t("last_heat"))}</span>
        <span class="row-value">${cumulusEscape(text)}</span></div>`);
    }

    const schedule = cumulusComputeSchedule(this._config);
    let nextText = "—";
    if (schedule?.running) {
      nextText = this._t("running", { t: this._time(schedule.until) });
    } else if (schedule?.when) {
      const rel = this._relativeDay(schedule.when);
      const isToday = rel === this._t("d0");
      nextText = `${isToday ? this._t("tonight") : rel} ${this._t("at")} ${this._time(schedule.when)}`;
    }
    const auto = this._stateObj("automation");
    const autoOff = this._config.automation && auto && auto.state === "off";
    rows.push(`<div class="row" ${this._config.automation ? `data-entity="${cumulusEscape(this._config.automation)}"` : ""}>
      <span class="row-label">${cumulusIcon("calendar", 18)}${cumulusEscape(this._t("next_heat"))}</span>
      <span class="row-value">${cumulusEscape(autoOff ? this._t("automation_off") : nextText)}</span></div>`);
    return `<section class="rows">${rows.join("")}</section>`;
  }

  _renderTempo() {
    const chips = [["tempo_today", "today"], ["tempo_tomorrow", "tomorrow"]]
      .filter(([key]) => this._config[key])
      .map(([key, label]) => {
        const s = this._stateObj(key);
        const info = cumulusTempoInfo(s?.state);
        const color = CUMULUS_TEMPO[info];
        return `<div class="tempo" data-entity="${cumulusEscape(this._config[key])}">
          <span class="tempo-label">${cumulusEscape(this._t(label))}</span>
          <span class="chip" style="background:${color.color};color:${color.text}">${cumulusEscape(this._t(color.label))}</span>
        </div>`;
      }).join("");
    return this._section(this._t("tempo"), "palette", `<div class="grid tempos">${chips}</div>`);
  }

  _styles() {
    return `
      :host { display: block; }
      ha-card { padding: 16px; overflow: hidden; box-sizing: border-box; }
      * { box-sizing: border-box; }
      button { font: inherit; color: inherit; }
      .ico { flex: none; vertical-align: middle; }
      .header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 4px; }
      .title { display: flex; flex-direction: column; gap: 4px; cursor: pointer; min-width: 0; }
      .name { font-size: 1.25rem; font-weight: 500; color: var(--primary-text-color); }
      .status { display: inline-flex; align-items: center; gap: 6px; font-size: 0.85rem; color: var(--secondary-text-color); }
      .status i { width: 8px; height: 8px; border-radius: 50%; background: var(--disabled-text-color, #9e9e9e); }
      .status.on { color: var(--warning-color, #ff9800); }
      .status.on i { background: var(--warning-color, #ff9800); box-shadow: 0 0 0 4px rgba(255,152,0,.2); }
      .status.unavailable i { background: var(--error-color, #db4437); }
      .power { width: 52px; height: 52px; border-radius: 50%; border: 2px solid var(--divider-color, #ccc);
        background: transparent; color: var(--secondary-text-color); cursor: pointer; display: grid; place-items: center;
        transition: background .2s, color .2s, border-color .2s; }
      .power:hover { border-color: var(--primary-color); }
      .power.on { background: var(--warning-color, #ff9800); border-color: var(--warning-color, #ff9800); color: #fff; }
      .power:disabled { opacity: .4; cursor: default; }
      section { margin-top: 14px; }
      h3 { display: flex; align-items: center; gap: 6px; margin: 0 0 8px; font-size: 0.8rem; font-weight: 500;
        letter-spacing: .04em; text-transform: uppercase; color: var(--secondary-text-color); }
      .grid { display: grid; gap: 8px; }
      .metrics { grid-template-columns: repeat(auto-fit, minmax(90px, 1fr)); }
      .costs { grid-template-columns: repeat(3, 1fr); }
      .tempos { grid-template-columns: repeat(2, 1fr); }
      .tile { background: var(--secondary-background-color, rgba(127,127,127,.12)); border-radius: 12px; padding: 10px 12px; cursor: pointer; min-width: 0; }
      .tile-label { display: flex; align-items: center; gap: 4px; font-size: 0.75rem; color: var(--secondary-text-color); }
      .tile-value { margin-top: 4px; font-size: 1.15rem; font-weight: 500; color: var(--primary-text-color); white-space: nowrap; }
      .tile-value small { margin-left: 3px; font-size: 0.75rem; font-weight: 400; color: var(--secondary-text-color); }
      .force { background: var(--secondary-background-color, rgba(127,127,127,.12)); border-radius: 12px; padding: 12px; }
      .force.active { box-shadow: inset 0 0 0 2px var(--warning-color, #ff9800); }
      .force-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
      .force-info { cursor: pointer; min-width: 0; }
      .force-title { display: flex; align-items: center; gap: 6px; font-weight: 500; color: var(--primary-text-color); }
      .force-title em { font-style: normal; font-size: 0.75rem; padding: 1px 8px; border-radius: 10px;
        background: var(--divider-color, #ddd); color: var(--secondary-text-color); }
      .force.active .force-title em { background: var(--warning-color, #ff9800); color: #fff; }
      .force-detail { margin-top: 4px; font-size: 0.85rem; color: var(--secondary-text-color); font-variant-numeric: tabular-nums; }
      .bar { height: 6px; margin-top: 10px; border-radius: 3px; background: var(--divider-color, #ddd); overflow: hidden; }
      .bar div { height: 100%; background: var(--warning-color, #ff9800); transition: width 1s linear; }
      .switch { flex: none; width: 46px; height: 26px; border-radius: 13px; border: 0; padding: 3px; cursor: pointer;
        background: var(--switch-unchecked-track-color, #9e9e9e); transition: background .2s; }
      .switch span { display: block; width: 20px; height: 20px; border-radius: 50%; background: #fff; transition: transform .2s; }
      .switch.on { background: var(--warning-color, #ff9800); }
      .switch.on span { transform: translateX(20px); }
      .switch:disabled { opacity: .4; cursor: default; }
      .rows { display: flex; flex-direction: column; }
      .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 0; cursor: pointer;
        border-bottom: 1px solid var(--divider-color, rgba(127,127,127,.2)); }
      .row:last-child { border-bottom: 0; }
      .row-label { display: flex; align-items: center; gap: 8px; color: var(--secondary-text-color); font-size: 0.9rem; }
      .row-value { color: var(--primary-text-color); font-weight: 500; text-align: right; }
      .tempo { display: flex; flex-direction: column; gap: 6px; cursor: pointer; }
      .tempo-label { font-size: 0.75rem; color: var(--secondary-text-color); }
      .chip { display: block; text-align: center; padding: 8px 10px; border-radius: 10px; font-weight: 600;
        box-shadow: inset 0 0 0 1px rgba(0,0,0,.12); }
    `;
  }
}

/* ------------------------------------------------------------------ */
/* Éditeur visuel                                                      */
/* ------------------------------------------------------------------ */
class CumulusCardEditor extends HTMLElement {
  constructor() {
    super();
    this._config = {};
    this._hass = null;
    this._form = null;
  }

  setConfig(config) {
    this._config = { ...config };
    this._update();
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  _entity(key, domains) {
    return { name: key, selector: { entity: domains ? { domain: domains } : {} } };
  }

  _schema() {
    return [
      { name: "name", selector: { text: {} } },
      {
        type: "expandable", name: "", title: "Cumulus et mesures", icon: "mdi:water-boiler", expanded: true,
        schema: [
          this._entity("switch", ["switch", "input_boolean"]),
          this._entity("power", ["sensor"]),
          this._entity("voltage", ["sensor"]),
          this._entity("current", ["sensor"]),
          this._entity("energy", ["sensor"]),
        ],
      },
      {
        type: "expandable", name: "", title: "Marche forcée", icon: "mdi:timer-outline",
        schema: [
          this._entity("force_boolean", ["input_boolean"]),
          this._entity("force_timer", ["timer"]),
          { name: "force_duration", selector: { number: { min: 0.5, max: 12, step: 0.5, unit_of_measurement: "h", mode: "box" } } },
        ],
      },
      {
        type: "expandable", name: "", title: "Coûts", icon: "mdi:currency-eur",
        schema: [
          this._entity("cost_day", ["sensor"]),
          this._entity("cost_month", ["sensor"]),
          this._entity("cost_cycle", ["sensor"]),
        ],
      },
      {
        type: "expandable", name: "", title: "Programmation et Tempo", icon: "mdi:calendar-clock",
        schema: [
          this._entity("last_heat", ["input_datetime", "sensor"]),
          this._entity("automation", ["automation"]),
          {
            type: "grid", name: "", schema: [
              { name: "schedule_start", selector: { time: {} } },
              { name: "schedule_end", selector: { time: {} } },
            ],
          },
          {
            name: "schedule_parity",
            selector: {
              select: {
                mode: "dropdown",
                options: [
                  { value: "0", label: "Quantième ordinal pair (comme l'automatisation d'origine)" },
                  { value: "1", label: "Quantième ordinal impair (décale d'une nuit)" },
                ],
              },
            },
          },
          this._entity("tempo_today", ["sensor"]),
          this._entity("tempo_tomorrow", ["sensor"]),
        ],
      },
      {
        type: "expandable", name: "", title: "Sections affichées", icon: "mdi:eye-outline",
        schema: [
          {
            type: "grid", name: "", schema: [
              { name: "show_metrics", selector: { boolean: {} } },
              { name: "show_force", selector: { boolean: {} } },
              { name: "show_costs", selector: { boolean: {} } },
              { name: "show_schedule", selector: { boolean: {} } },
              { name: "show_tempo", selector: { boolean: {} } },
            ],
          },
        ],
      },
    ];
  }

  _labels() {
    return {
      name: "Nom", switch: "Cumulus (interrupteur)", power: "Puissance", voltage: "Tension", current: "Courant",
      energy: "Énergie", force_boolean: "Marche forcée (booléen)", force_timer: "Marche forcée (minuteur)",
      force_duration: "Durée de la marche forcée", cost_day: "Coût du jour", cost_month: "Coût du mois",
      cost_cycle: "Coût du cycle", last_heat: "Dernière chauffe", automation: "Automatisation Tempo",
      schedule_start: "Début de la plage", schedule_end: "Fin de la plage", schedule_parity: "Nuits de chauffe",
      tempo_today: "Tempo aujourd'hui", tempo_tomorrow: "Tempo demain",
      show_metrics: "Afficher les mesures", show_force: "Afficher la marche forcée", show_costs: "Afficher les coûts",
      show_schedule: "Afficher la programmation", show_tempo: "Afficher Tempo",
    };
  }

  _data() {
    const data = { ...CUMULUS_DEFAULTS, ...this._config };
    data.schedule_parity = String(data.schedule_parity ?? "0");
    delete data.type;
    return data;
  }

  _update() {
    if (!this._hass) return;
    if (!this._form) {
      this._form = document.createElement("ha-form");
      this._form.computeLabel = (schema) => this._labels()[schema.name] || schema.name;
      this._form.addEventListener("value-changed", (ev) => {
        ev.stopPropagation();
        const value = { ...ev.detail.value };
        if (value.schedule_parity !== undefined) value.schedule_parity = Number(value.schedule_parity);
        const next = { ...this._config, ...value };
        // On ne conserve que ce qui diffère des valeurs par défaut, sauf les entités.
        this._config = next;
        this.dispatchEvent(new CustomEvent("config-changed", {
          detail: { config: next }, bubbles: true, composed: true,
        }));
      });
      this.appendChild(this._form);
    }
    this._form.hass = this._hass;
    this._form.schema = this._schema();
    this._form.data = this._data();
  }
}

/* ------------------------------------------------------------------ */
/* Enregistrement                                                      */
/* ------------------------------------------------------------------ */
if (!customElements.get("cumulus-card")) customElements.define("cumulus-card", CumulusCard);
if (!customElements.get("cumulus-card-editor")) customElements.define("cumulus-card-editor", CumulusCardEditor);

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === "cumulus-card")) {
  window.customCards.push({
    type: "cumulus-card",
    name: "Cumulus Card",
    description: "Pilotage et suivi d'un cumulus : état, marche forcée, coûts, prochaine chauffe et couleurs Tempo.",
    preview: true,
    documentationURL: "https://github.com/TheDecryptZ/ha-cumulus-card",
  });
}

console.info(
  `%c CUMULUS-CARD %c v${CUMULUS_CARD_VERSION} `,
  "color:#fff;background:#ff9800;font-weight:700;border-radius:3px 0 0 3px;padding:2px 4px",
  "color:#ff9800;background:#fff;font-weight:700;border-radius:0 3px 3px 0;padding:2px 4px;border:1px solid #ff9800",
);
