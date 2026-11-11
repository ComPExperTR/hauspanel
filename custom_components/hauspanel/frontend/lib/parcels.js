// Parcels on the way, from the parcel integrations (one per carrier, or their aggregator): sensors with a `parcels` list.
import { h, icon, formatTime, formatDate } from "./util.js";
import { t } from "./i18n.js";

const STATUSES = new Set(["registered", "in_transit", "out_for_delivery", "at_pickup_point", "returning", "problem", "unknown"]);

/** Sensors that list incoming parcels: the aggregator's if there is one, otherwise each carrier's own. */
export function parcelSensors(hass) {
  const ids = Object.keys(hass.states).filter((id) => id.startsWith("sensor.") && id.endsWith("_incoming_parcels")
    && Array.isArray(hass.states[id].attributes.parcels));
  const agg = ids.filter((id) => hass.entities?.[id]?.platform === "parcel_aggregator" || id.startsWith("sensor.parcel_aggregator_"));
  return agg.length ? agg : ids;
}

const when = (p) => Date.parse(p.planned_from || p.planned_to || "") || Infinity;

/** Parcels still on their way, the next one first; the same parcel from two sensors counts once. */
export function incomingParcels(hass) {
  const seen = new Set();
  const out = [];
  for (const id of parcelSensors(hass)) {
    for (const p of hass.states[id].attributes.parcels || []) {
      if (!p || typeof p !== "object" || p.delivered || p.status === "delivered") continue;
      const key = `${p.carrier || ""}|${p.barcode || JSON.stringify(p)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out.sort((a, b) => when(a) - when(b));
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

function parcelPill(ctx, p) {
  const sub = h("small", {});
  const name = p.sender || p.carrier || t("parcels");
  const el = h(p.url ? "a" : "div", { class: `hp-onpill parcel on ${p.status === "problem" ? "problem" : ""}`, ...(p.url ? { href: p.url, target: "_blank", rel: "noopener noreferrer" } : {}) },
    h("span", { class: "hp-onpill-ic" }, icon(p.status === "out_for_delivery" ? "mdi:truck-delivery-outline" : p.status === "at_pickup_point" ? "mdi:store-marker-outline" : "mdi:package-variant-closed")),
    h("div", { class: "hp-onpill-text" }, h("b", {}, name), sub));
  el.update = (hass) => {
    sub.textContent = [p.sender && p.carrier ? p.carrier : null, statusText(p), parcelWhen(hass, p)].filter(Boolean).join(" · ");
  };
  el.update(ctx.hass);
  return el;
}

/** Parcels on Home: hidden while none is on its way, or when switched off. */
export function parcelsBlock(ctx) {
  const box = h("div", { class: "hp-onnow" });
  const count = h("span", { class: "hp-count" });
  const el = h("section", { class: "hp-onnow-sec hp-notices hp-parcels" }, h("div", { class: "hp-label hp-home-label" }, t("parcels"), count), box);
  let sig = null;
  el.update = (hass) => {
    const list = ctx.settings.s.parcels === false ? [] : incomingParcels(hass);
    const next = JSON.stringify(list.map((p) => [p.carrier, p.barcode, p.status, p.planned_from, p.planned_to]));
    if (next !== sig) {
      sig = next;
      box.replaceChildren(...list.map((p) => parcelPill(ctx, p)));
    }
    count.textContent = list.length ? String(list.length) : "";
    el.hidden = !list.length;
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}
