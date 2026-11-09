// Waste collection: the next pickups from a waste calendar (Waste Collection Schedule, an ICS calendar
// named Abfall/Müll/Waste …) or sensors that count the days. A chip on Home the day before and on the day,
// a popup with the next two weeks.
import { h, icon, startOfDay, addDays } from "./util.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";

const WASTE = /abfall|m(ü|ue)ll|waste|trash|garbage|recycl|tonne|\bbin\b|bins|afval|d(é|e)chet|poubelle|basura|residuos|rifiuti|odpad|sopor|avfall/i;

/** The calendars and day-count sensors that tell about pickups. */
export function wasteSources(hass) {
  const name = (id) => `${id} ${hass.states[id]?.attributes.friendly_name || ""}`;
  const plat = (id) => hass.entities?.[id]?.platform;
  const calendars = Object.keys(hass.states).filter((id) => id.startsWith("calendar.") && (plat(id) === "waste_collection_schedule" || WASTE.test(name(id))));
  const sensors = Object.keys(hass.states).filter((id) => id.startsWith("sensor.") && hass.states[id].attributes.daysTo != null
    && (plat(id) === "waste_collection_schedule" || WASTE.test(name(id))));
  return { calendars, sensors };
}

/** Colour and icon by kind of bin, from the words in the event (German and English, a few others). */
export function wasteKind(text) {
  const s = String(text || "").toLowerCase();
  if (/gelb|yellow|plastic|plastik|verpack|packag|wertstoff|pmd|lvp/.test(s)) return { kind: "yellow", color: "#f6c945" };
  if (/papier|paper|pappe|cardboard|karton|blau|blue/.test(s)) return { kind: "paper", color: "#4ea5f5" };
  if (/bio|organic|garden|gr(ü|ue)n|braun|brown|kompost|compost|food|gft/.test(s)) return { kind: "bio", color: "#a2763f" };
  if (/glas|glass/.test(s)) return { kind: "glass", color: "#5cc879" };
  if (/sperr|bulky|grobvuil|encombrant/.test(s)) return { kind: "bulky", color: "#a985f5" };
  if (/rest|residual|grau|grey|gray|schwarz|black|general|household|haus/.test(s)) return { kind: "rest", color: "#8f9bab" };
  return { kind: "other", color: "#6cc7b2" };
}

const dayKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** All-day events give a date ("2026-11-10"), others a date and time; both as a local day. */
function eventDay(ev) {
  const s = ev.start?.date || ev.start?.dateTime || ev.start;
  if (!s) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split("-").map(Number);
    return new Date(y, m - 1, d);
  }
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : startOfDay(d);
}

/**
 * Pickups in the next `days` days: [{ day: Date, key: "YYYY-MM-DD", what: "Gelbe Tonne", kind, color }], by day.
 * `fetchEvents(calendarId, start, end)` is the calendar API (Home Assistant's REST call in the panel).
 */
export async function loadPickups(hass, fetchEvents, { days = 14, now = new Date() } = {}) {
  const { calendars, sensors } = wasteSources(hass);
  const start = startOfDay(now);
  const end = addDays(start, days);
  const out = [];
  const seen = new Set();
  const add = (day, what) => {
    if (!day || day < start || day >= end) return;
    const key = dayKey(day);
    const label = String(what || "").trim() || t("waste");
    if (seen.has(`${key}|${label.toLowerCase()}`)) return;
    seen.add(`${key}|${label.toLowerCase()}`);
    out.push({ day, key, what: label, ...wasteKind(label) });
  };
  for (const cal of calendars) {
    try {
      const evs = await fetchEvents(cal, start, end);
      for (const ev of evs || []) add(eventDay(ev), ev.summary || ev.message);
    } catch { /* that calendar can't be read: skip it */ }
  }
  for (const id of sensors) {
    const a = hass.states[id].attributes;
    const n = Number(a.daysTo);
    if (!Number.isFinite(n)) continue;
    const types = Array.isArray(a.types) && a.types.length ? a.types : [a.friendly_name?.replace(WASTE, "").trim() || a.friendly_name];
    for (const what of types) add(addDays(start, n), what);
  }
  // Two calendars for the same town often say the same thing a little differently ("Biotonne" and
  // "Biotonne in Townname"): on one day, an entry that starts with another one is that one.
  const lower = (p) => p.what.toLowerCase();
  const kept = out.filter((p) => !out.some((o) => o !== p && o.key === p.key && lower(o).length < lower(p).length && lower(p).startsWith(lower(o))));
  return kept.sort((x, y) => x.day - y.day || x.what.localeCompare(y.what));
}

/** "Today", "Tomorrow" or the weekday with date. */
export function whenText(hass, day, now = new Date()) {
  const d = Math.round((startOfDay(day) - startOfDay(now)) / 86400e3);
  if (d === 0) return t("today");
  if (d === 1) return t("tomorrow");
  return day.toLocaleDateString(hass.locale?.language || "en", { weekday: "long", day: "numeric", month: "short" });
}

/** The popup: the next two weeks, one line per day with a coloured bin for each kind. */
export function openWaste(ctx, pickups) {
  const sheet = openSheet(ctx, { title: t("waste"), subtitle: t("waste_sub"), cls: "qsheet waste" });
  if (!pickups.length) {
    sheet.body.append(h("div", { class: "hp-qempty" }, t("waste_none")));
    return;
  }
  const byDay = new Map();
  for (const p of pickups) (byDay.get(p.key) || byDay.set(p.key, []).get(p.key)).push(p);
  const list = h("div", { class: "hp-qlist hp-waste-list" });
  for (const [, items] of byDay) {
    const soon = Math.round((startOfDay(items[0].day) - startOfDay(new Date())) / 86400e3) <= 1;
    list.append(h("div", { class: `hp-qrow hp-waste-row ${soon ? "soon" : ""}` },
      h("div", { class: "hp-waste-bins" }, ...items.map((p) => h("span", { class: "bin", style: `--bin:${p.color}` }, icon("mdi:delete-variant")))),
      h("div", { class: "hp-qrow-text" }, h("b", {}, items.map((p) => p.what).join(" · ")), h("small", {}, whenText(ctx.hass, items[0].day)))));
  }
  sheet.body.append(list);
}
