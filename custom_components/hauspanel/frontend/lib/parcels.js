// Parcels on the way, from the parcel integrations (one per carrier, or their aggregator): sensors with a `parcels` list.
import { h, icon, formatTime, formatDate } from "./util.js";
import { t } from "./i18n.js";
import { openSheet } from "./dialogs.js";

const STATUSES = new Set(["registered", "in_transit", "out_for_delivery", "at_pickup_point", "returning", "problem", "unknown"]);

/** Sensors that list parcels ("incoming" or "delivered"): the aggregator's if there is one, otherwise each carrier's own. */
export function parcelSensors(hass, kind = "incoming") {
  const ids = Object.keys(hass.states).filter((id) => id.startsWith("sensor.") && id.endsWith(`_${kind}_parcels`)
    && Array.isArray(hass.states[id].attributes.parcels));
  const agg = ids.filter((id) => hass.entities?.[id]?.platform === "parcel_aggregator" || id.startsWith("sensor.parcel_aggregator_"));
  return agg.length ? agg : ids;
}

const when = (p) => Date.parse(p.planned_from || p.planned_to || "") || Infinity;
const keyOf = (p) => `${p.carrier || ""}|${p.barcode || JSON.stringify(p)}`;

/** Parcels still on their way, the next one first; the same parcel from two sensors counts once. */
export function incomingParcels(hass) {
  const seen = new Set();
  const out = [];
  for (const id of parcelSensors(hass)) {
    for (const p of hass.states[id].attributes.parcels || []) {
      if (!p || typeof p !== "object" || p.delivered || p.status === "delivered") continue;
      const key = keyOf(p);
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out.sort((a, b) => when(a) - when(b));
}

/** Parcels delivered in the last two days, the newest first. */
export function deliveredParcels(hass, now = Date.now()) {
  const seen = new Set();
  const out = [];
  for (const id of parcelSensors(hass, "delivered")) {
    for (const p of hass.states[id].attributes.parcels || []) {
      if (!p || typeof p !== "object") continue;
      const at = Date.parse(p.delivered_at || p.planned_to || p.planned_from || "");
      if (Number.isFinite(at) && now - at > 2 * 86400e3) continue;
      if (seen.has(keyOf(p))) continue;
      seen.add(keyOf(p));
      out.push(p);
    }
  }
  const at = (p) => Date.parse(p.delivered_at || "") || 0;
  return out.sort((a, b) => at(b) - at(a));
}

/** Whether any parcel integration is there at all. */
export const hasParcels = (hass) => parcelSensors(hass).length > 0 || parcelSensors(hass, "delivered").length > 0;

/** The chip's line: the next parcel when only one comes, else how many; delivered ones when nothing comes. */
export function parcelChipText(hass, incoming, delivered, now = new Date()) {
  if (incoming.length === 1) return parcelWhen(hass, incoming[0], now) || statusText(incoming[0]);
  if (incoming.length) return t("parcels_n_on_way", { n: incoming.length });
  if (delivered.length) return t("parcels_n_delivered", { n: delivered.length });
  return "";
}

/** "Today 14:00–16:00", "Fri 12 Dec", or nothing when the carrier hasn't said. */
export function parcelWhen(hass, p, now = new Date()) {
  const from = p.planned_from ? new Date(p.planned_from) : null;
  const to = p.planned_to ? new Date(p.planned_to) : null;
  const d = from && !Number.isNaN(+from) ? from : to && !Number.isNaN(+to) ? to : null;
  if (!d) return "";
  const day = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diff = Math.round((day(d) - day(now)) / 86400000);
  const date = diff === 0 ? t("parcel_today") : diff === 1 ? t("parcel_tomorrow") : formatDate(hass, d, { weekday: "short", day: "numeric", month: "short" });
  const timed = from && to && !Number.isNaN(+from) && !Number.isNaN(+to) && (from.getHours() || from.getMinutes() || to.getHours() || to.getMinutes());
  return timed ? `${date} ${formatTime(hass, from)}–${formatTime(hass, to)}` : date;
}

const statusText = (p) => t(`parcel_${STATUSES.has(p.status) ? p.status : "unknown"}`);

const ICONS = { out_for_delivery: "mdi:truck-delivery-outline", at_pickup_point: "mdi:store-marker-outline", problem: "mdi:alert-circle-outline", returning: "mdi:keyboard-return", delivered: "mdi:package-variant-closed-check" };

/** One parcel as a row: sender (or carrier), then carrier, status and when; a tap opens the tracking page. */
function parcelRow(hass, p, delivered = false) {
  const status = delivered ? "delivered" : p.status;
  const sub = [p.sender && p.carrier ? p.carrier : null, delivered ? t("parcel_delivered") : statusText(p), delivered ? null : parcelWhen(hass, p)].filter(Boolean).join(" · ");
  return h(p.url ? "a" : "div", { class: `hp-qrow hp-parcel-row ${status || ""}`, ...(p.url ? { href: p.url, target: "_blank", rel: "noopener noreferrer" } : {}) },
    h("span", { class: "hp-qrow-ic" }, icon(ICONS[status] || "mdi:package-variant-closed")),
    h("div", { class: "hp-qrow-text" }, h("b", {}, p.sender || p.carrier || t("parcels")), h("small", {}, sub)),
    p.url ? icon("mdi:open-in-new", "hp-hint-go") : null);
}

/** The popup behind the Parcels chip: what is coming, then what came in the last two days. */
export function openParcels(ctx) {
  const sheet = openSheet(ctx, { title: t("parcels"), cls: "qsheet parcels" });
  const draw = () => {
    const hass = ctx.hass;
    const coming = incomingParcels(hass);
    const done = deliveredParcels(hass);
    sheet.body.replaceChildren(
      coming.length ? h("div", { class: "hp-qlist" }, ...coming.map((p) => parcelRow(hass, p))) : h("div", { class: "hp-qempty" }, t("parcels_none")),
      done.length ? h("div", { class: "hp-label hp-parcels-label" }, t("parcels_recent")) : null,
      done.length ? h("div", { class: "hp-qlist" }, ...done.map((p) => parcelRow(hass, p, true))) : null);
  };
  draw();
}
