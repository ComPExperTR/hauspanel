// Sockets that measure power: the "meter only" tile text, the appliance status from WashData-like
// integrations, and the usage block in the popup (now, today, 7 days, month, last 24 hours).
import { h, icon, formatNumber, startOfDay, addDays } from "./util.js";
import { t } from "./i18n.js";

const ON_WATTS = 2; // a plug drawing more than this counts as "on"

/** Power and energy sensors of the device an entity belongs to. */
const PART = /phase|_l[123](_|\b)|\bl[123]\b|_[abc]_(power|energy|leistung)|channel_?\d|kanal_?\d|_ch\d/i;

export function meterSensors(hass, entityId) {
  const st = hass.states[entityId];
  const dc = st?.attributes.device_class;
  const dev = hass.entities?.[entityId]?.device_id;
  const out = { power: dc === "power" ? entityId : null, energy: dc === "energy" ? entityId : null };
  if (!dev) return out;
  const power = [];
  const energy = [];
  for (const e of Object.values(hass.entities)) {
    if (e.device_id !== dev || !e.entity_id.startsWith("sensor.") || e.entity_category || e.hidden) continue;
    const c = hass.states[e.entity_id]?.attributes.device_class;
    if (c === "power") power.push(e.entity_id);
    if (c === "energy" && !/einspeisung|returned|export/i.test(e.entity_id)) energy.push(e.entity_id);
  }
  // A meter with three phases or several channels: the total, not phase A.
  const best = (ids) => ids.find((id) => !PART.test(`${id} ${hass.states[id]?.attributes.friendly_name || ""}`)) || ids[0] || null;
  out.power ||= best(power);
  out.energy ||= best(energy);
  return out;
}

export function watts(hass, id) {
  const st = id && hass.states[id];
  const v = Number(st?.state);
  if (!st || !Number.isFinite(v)) return null;
  const unit = st.attributes.unit_of_measurement;
  return unit === "kW" ? v * 1000 : v;
}

export function formatWatts(hass, w) {
  if (w == null) return "–";
  return Math.abs(w) >= 1000 ? `${formatNumber(hass, w / 1000, 2)} kW` : `${formatNumber(hass, w, w < 10 ? 1 : 0)} W`;
}

export function deviceName(hass, entityId) {
  const e = hass.entities?.[entityId];
  const d = e?.device_id && hass.devices?.[e.device_id];
  return d?.name_by_user || d?.name || hass.states[entityId]?.attributes.friendly_name || entityId;
}

// ---- appliance status (WashData and similar: a device in the same room with a state, progress and time left)

const LINKS_KEY = "hauspanel.appliances";
let links = null;
const remembered = () => {
  if (!links) {
    try { links = JSON.parse(localStorage.getItem(LINKS_KEY) || "{}"); } catch { links = {}; }
  }
  return links;
};

function areaOf(hass, id) {
  const e = hass.entities?.[id];
  return e?.area_id || (e?.device_id && hass.devices?.[e.device_id]?.area_id) || null;
}

/** Appliance devices with a "state" sensor in a room: { dev, state, progress, remaining, power }. */
export function appliancesIn(hass, area) {
  const byDev = new Map();
  for (const e of Object.values(hass.entities)) {
    if (!e.device_id || !e.entity_id.startsWith("sensor.") || areaOf(hass, e.entity_id) !== area) continue;
    const id = e.entity_id;
    // WashData (zustand, fortschritt, verbleibende_zeit) and Home Connect (betriebszustand, programm_fortschritt, programm_endzeit).
    const slot = /_(zustand|betriebszustand|state|status|operation_state)$/.test(id) ? "state" : /_(fortschritt|progress)$/.test(id) ? "progress"
      : /_(verbleibende_zeit|remaining_time|time_remaining|remaining_program_time)$/.test(id) ? "remaining"
      : /_(endzeit|finish_time|program_finish_time)$/.test(id) ? "end"
      : /_(verstrichene_zeit|elapsed_time|elapsed_program_time)$/.test(id) ? "elapsed"
      : /_(aktuelle_leistung|current_power)$/.test(id) ? "power" : null;
    if (!slot) continue;
    const a = byDev.get(e.device_id) || { dev: e.device_id };
    a[slot] = id;
    byDev.set(e.device_id, a);
  }
  // Only machines you wait for: washer, dryer, dishwasher. Ovens, steamers, hobs and coffee machines report a program too.
  const NOT_LAUNDRY = /oven|ofen|dampf|steam|garer|cooktop|kochfeld|\bhob\b|herd|coffee|kaffee|fridge|k(ü|u|ue)hl|freezer|hood|haube/i;
  const machines = [...byDev.values()].filter((a) => {
    const d = hass.devices?.[a.dev];
    // Pumps and filters (a pool) report a state too, but nobody waits for them like for a washer.
    if (/pump|pumpe|filter|pool/i.test(`${a.state} ${d?.name || ""} ${d?.model || ""}`)) return false;
    return a.state && (a.progress || a.remaining || a.end) && !NOT_LAUNDRY.test(`${d?.name_by_user || ""} ${d?.name || ""} ${d?.model || ""} ${a.state}`);
  });
  // The same machine seen twice in a room (Home Connect and WashData): keep the one that tells more.
  const name = (a) => (hass.devices?.[a.dev]?.name_by_user || hass.devices?.[a.dev]?.name || a.dev).toLowerCase();
  const slots = (a) => ["state", "progress", "remaining", "end", "elapsed", "power"].filter((k) => a[k]).length;
  return machines.filter((a) => !machines.some((b) => b !== a && name(b) === name(a) && (slots(b) > slots(a) || (slots(b) === slots(a) && b.dev < a.dev))));
}

/** Every appliance in the house that runs right now (washer, dryer, dishwasher …): [{ dev, name, text }]. */
export function runningAppliances(hass) {
  const areas = new Set(Object.values(hass.entities || {}).map((e) => areaOf(hass, e.entity_id)));
  const out = [];
  for (const area of areas) {
    for (const a of appliancesIn(hass, area)) {
      const text = applianceText(hass, a);
      if (!text) continue;
      const d = hass.devices?.[a.dev];
      const name = d?.name_by_user || d?.name || a.state;
      // The same machine seen twice (Home Connect and WashData): keep the one that says more.
      const twin = out.findIndex((o) => o.area === area && o.name.toLowerCase() === name.toLowerCase());
      if (twin >= 0) {
        if (text.length > out[twin].text.length) out[twin] = { ...a, name, area, text };
        continue;
      }
      out.push({ ...a, name, area, text });
    }
  }
  return out;
}

/** The appliance a plug powers: the only one in its room, or the one drawing the same power (remembered). */
export function applianceFor(hass, entityId, powerId) {
  const known = remembered()[entityId];
  const area = areaOf(hass, entityId);
  if (!area) return null;
  const list = appliancesIn(hass, area);
  if (known) {
    const k = list.find((a) => a.dev === known);
    if (k) return k;
  }
  if (list.length === 1) return list[0];
  const w = watts(hass, powerId);
  if (!w || w < 20) return null;
  const scored = list.map((a) => ({ a, d: Math.abs((watts(hass, a.power) ?? -1e6) - w) })).sort((x, y) => x.d - y.d);
  if (scored[0] && scored[0].d < 25 && (!scored[1] || scored[1].d > 100)) {
    remembered()[entityId] = scored[0].a.dev;
    try { localStorage.setItem(LINKS_KEY, JSON.stringify(links)); } catch { /* fine */ }
    return scored[0].a;
  }
  return null;
}

// WashData: starting, running, paused, ending; Home Connect: run, pause, delayedstart.
const RUNNING = new Set(["running", "run", "starting", "ending", "läuft", "on", "active", "washing", "drying", "spinning", "rinsing"]);
const PAUSED = new Set(["paused", "pause", "interrupted"]);
const LATER = new Set(["delayedstart", "delayed_start"]);

/** "Running · 45 % · 32 min left" while the appliance runs (or pauses), else null. */
export function applianceText(hass, a) {
  const st = a && hass.states[a.state];
  const s = String(st?.state).toLowerCase();
  if (!st || !(RUNNING.has(s) || PAUSED.has(s) || LATER.has(s))) return null;
  const parts = [PAUSED.has(s) ? t("paused") : LATER.has(s) ? t("starts_later") : t("running")];
  const p = Number(hass.states[a.progress]?.state);
  if (Number.isFinite(p) && p > 0) parts.push(`${Math.round(p)} %`);
  const r = hass.states[a.remaining];
  const rv = Number(r?.state);
  if (r && Number.isFinite(rv) && rv > 0) {
    const unit = r.attributes.unit_of_measurement;
    const min = unit === "s" ? rv / 60 : unit === "h" ? rv * 60 : rv;
    parts.push(t("min_left", { n: Math.max(1, Math.round(min)) }));
  } else if (a.end) {
    const left = (Date.parse(hass.states[a.end]?.state) - Date.now()) / 60000;
    if (Number.isFinite(left) && left > 0) parts.push(t("min_left", { n: Math.max(1, Math.round(left)) }));
  }
  // No time left known yet (the program is still being detected): how long it has been running.
  if (parts.length === 1 || (parts.length === 2 && !/min/.test(parts[1]))) {
    const e = hass.states[a.elapsed];
    const ev = Number(e?.state);
    if (e && Number.isFinite(ev) && ev > 0) {
      const unit = e.attributes.unit_of_measurement;
      const min = unit === "s" ? ev / 60 : unit === "h" ? ev * 60 : ev;
      parts.push(t("min_since", { n: Math.max(1, Math.round(min)) }));
    }
  }
  return parts.join(" · ");
}

// ---- usage block in the popup

async function changes(hass, id, start, end, period) {
  const r = await hass.callWS({ type: "recorder/statistics_during_period", start_time: start.toISOString(), end_time: end.toISOString(), statistic_ids: [id], period, types: ["change"], units: { energy: "kWh" } });
  return (r?.[id] || []).map((x) => ({ start: new Date(x.start), v: Math.max(0, x.change || 0) }));
}

function priceOf(ctx) {
  const src = ctx.energyPrefs?.energy_sources?.find((s) => s.type === "grid");
  const f = src?.flow_from?.[0] || src;
  if (f?.number_energy_price != null) return Number(f.number_energy_price);
  const v = Number(ctx.hass.states[f?.entity_energy_price]?.state);
  return Number.isFinite(v) ? v : null;
}

function money(ctx, v) {
  try {
    return new Intl.NumberFormat(ctx.hass.locale?.language || ctx.hass.language, { style: "currency", currency: ctx.hass.config?.currency || "EUR" }).format(v);
  } catch {
    return `${v.toFixed(2)} €`;
  }
}

/** Now, today, last 7 days, this month, and the last 24 hours as bars. */
export function usageBlock(ctx, entityId) {
  const hass = ctx.hass;
  const { power, energy } = meterSensors(hass, entityId);
  const now = h("b", {});
  const root = h("div", { class: "hp-usage" });
  const nowRow = h("div", { class: "hp-usage-now" }, icon("mdi:flash"), h("div", {}, h("small", {}, t("power_now")), now));
  root.append(nowRow);
  root.update = (hs) => {
    const txt = formatWatts(hs, watts(hs, power));
    if (now.textContent !== txt) now.textContent = txt;
  };
  root.update(hass);
  if (!power) nowRow.hidden = true;
  if (!energy) return root;
  const cards = h("div", { class: "hp-usage-cards" }, h("div", { class: "hp-muted small" }, t("loading")));
  const chart = h("div", { class: "hp-usage-chart" });
  root.append(cards, chart);
  const price = priceOf(ctx);
  (async () => {
    const end = new Date();
    const today = startOfDay(end);
    const month = new Date(end.getFullYear(), end.getMonth(), 1);
    const from = month < addDays(today, -6) ? month : addDays(today, -6);
    const hourStart = new Date(end.getTime() - 24 * 3600 * 1000);
    hourStart.setMinutes(0, 0, 0);
    // Long-term statistics come per full hour; the hour that is running comes from the 5-minute values.
    const hourTop = new Date(end);
    hourTop.setMinutes(0, 0, 0);
    const [days, hours, recent] = await Promise.all([changes(hass, energy, from, end, "day"), changes(hass, energy, hourStart, end, "hour"),
      changes(hass, energy, hourTop, end, "5minute").catch(() => [])]);
    const partial = hours.some((x) => x.start >= hourTop) ? 0 : recent.reduce((a, x) => a + x.v, 0);
    if (partial) hours.push({ start: hourTop, v: partial });
    const sumFrom = (d) => days.filter((x) => x.start >= d).reduce((a, x) => a + x.v, 0) + (hourTop >= d ? partial : 0);
    const card = (label, kwh) => h("div", { class: "hp-usage-card" }, h("small", {}, label),
      h("b", {}, `${formatNumber(hass, kwh, kwh < 10 ? 2 : 1)} kWh`), price != null ? h("span", {}, money(ctx, kwh * price)) : null);
    cards.replaceChildren(card(t("today"), sumFrom(today)), card(t("last_7_days"), sumFrom(addDays(today, -6))), card(t("this_month"), sumFrom(month)));
    // Last 24 hours.
    const n = 24;
    const vals = new Array(n).fill(0);
    for (const x of hours) {
      const i = Math.floor((x.start - hourStart) / 3600000);
      if (i >= 0 && i < n) vals[i] = x.v;
    }
    const max = Math.max(0.0001, ...vals);
    const svg = h("div", { class: "hp-usage-bars" }, vals.map((v) => h("i", { style: { height: `${Math.max((v / max) * 100, 1)}%` } })));
    const label = (d) => `${String(d.getHours()).padStart(2, "0")}:00`;
    chart.replaceChildren(h("div", { class: "hp-usage-chart-head" }, h("small", {}, t("last_24_hours")), h("small", {}, `max ${formatNumber(hass, max, 2)} kWh/h`)), svg,
      h("div", { class: "hp-usage-axis" }, h("small", {}, label(hourStart)), h("small", {}, t("now"))));
  })().catch(() => cards.replaceChildren(h("div", { class: "hp-muted small" }, t("no_data"))));
  return root;
}

// ---- which socket powers which appliance or printer

let wdPower = null; // WashData config entry → its power sensor
let wdLoading = null;

/** Ask WashData once which power sensor each machine uses (admins only; quietly nothing otherwise). */
export function loadPlugLinks(hass, onLoaded) {
  if (wdPower || wdLoading || !hass.services?.ha_washdata) return;
  wdLoading = hass.connection.sendMessagePromise({ type: "ha_washdata/get_devices" })
    .then((r) => {
      wdPower = {};
      for (const d of r.devices || []) if (d.options?.power_sensor) wdPower[d.entry_id] = d.options.power_sensor;
      onLoaded?.();
    })
    .catch(() => { wdPower = {}; });
}

const PRINTER_PLUG = /bambu|3d.?druck|3d.?print|drucker|printer/i;

/** Machine device → the socket device that powers it: WashData's power sensor, or a socket named after the printer. */
export function plugLinks(hass) {
  const out = new Map();
  for (const [entry, power] of Object.entries(wdPower || {})) {
    const plugDev = hass.entities?.[power]?.device_id;
    if (!plugDev) continue;
    for (const d of Object.values(hass.devices || {})) {
      if (d.id !== plugDev && d.config_entries?.includes(entry)) out.set(d.id, plugDev);
    }
  }
  const printers = new Set(Object.values(hass.entities || {}).filter((e) => e.device_id && /_(druckstatus|print_status)$/.test(e.entity_id)).map((e) => e.device_id));
  for (const pd of printers) {
    const model = hass.devices?.[pd]?.model || "";
    const plug = Object.values(hass.devices || {}).find((d) => d.id !== pd && d.via_device_id !== pd
      && PRINTER_PLUG.test(`${d.name_by_user || ""} ${d.name || ""}`) && (!model || `${d.name_by_user || ""} ${d.name || ""}`.includes(model) || !/bambu/i.test(d.manufacturer || ""))
      && Object.values(hass.entities).some((e) => e.device_id === d.id && (e.entity_id.startsWith("switch.") || hass.states[e.entity_id]?.attributes.device_class === "power")));
    if (plug) out.set(pd, plug.id);
  }
  // Twins (Home Connect and WashData for one dishwasher) share the socket.
  for (const [dev, plug] of [...out]) {
    const d = hass.devices?.[dev];
    const name = (d?.name_by_user || d?.name || "").toLowerCase();
    for (const o of Object.values(hass.devices || {})) {
      if (o.id !== dev && o.area_id === d?.area_id && (o.name_by_user || o.name || "").toLowerCase() === name && !out.has(o.id)) out.set(o.id, plug);
    }
  }
  return out;
}

/** Every entity of the sockets that belong to a machine: they need no tile of their own. */
export function linkedPlugEntities(hass) {
  const devs = new Set(plugLinks(hass).values());
  return new Set(Object.values(hass.entities || {}).filter((e) => devs.has(e.device_id)).map((e) => e.entity_id));
}

/** The socket's main entity for a machine (its switch, else its power sensor), or null. */
export function plugEntityFor(hass, dev) {
  const plug = plugLinks(hass).get(dev);
  if (!plug) return null;
  const ents = Object.values(hass.entities).filter((e) => e.device_id === plug && !e.entity_category);
  return (ents.find((e) => e.entity_id.startsWith("switch.")) || ents.find((e) => hass.states[e.entity_id]?.attributes.device_class === "power"))?.entity_id || null;
}
