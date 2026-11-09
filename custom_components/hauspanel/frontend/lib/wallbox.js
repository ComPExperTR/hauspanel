// Wallbox popup: power flowing from the wallbox into the car (green when the sun pays for it), this charge in kWh
// and euros, the car's battery and when it will be full, and start/stop charging (two taps).
import { h, icon, formatTime } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { watts, formatWatts } from "./usage.js";
import { carDevices, carName } from "./car.js";
import { t } from "./i18n.js";
import { svgEl, num, live, slotsOf, stat, hint, btn, twoTap, fmt } from "./popkit.js";

const SLOTS = [
  ["online", /^binary_sensor\..*_status$/],
  ["plug", /^binary_sensor\..*_plug$/],
  ["charging", /^binary_sensor\..*_charging_state$/],
  ["power", /^sensor\..*_charging_power$/],
  ["session", /^sensor\..*_session_energy$/],
  ["total", /^sensor\..*_total_energy$/],
  ["current", /^sensor\..*_max_current$/],
  ["target", /^sensor\..*_energy_target$/],
];
const CAR = [
  ["battery", /^sensor\..*_(batteriestand|battery_level)$/],
  ["range", /^sensor\.(?!.*(elektrische|fossile|electric|combustion|fuel)_(reichweite|range)$).*_(reichweite|range)$/],
  ["erange", /^sensor\..*_(elektrische_reichweite|electric_range)$/],
  ["left", /^sensor\..*_(verbleibende_ladezeit|remaining_charging_time)$/],
  ["limit", /^sensor\..*_(ladegrenze_in_prozent|target_battery_percentage)$/],
  ["cstate", /^sensor\..*_(ladestatus|charging_state)$/],
  ["cpower", /^sensor\..*_(ladeleistung|charging_power)$/],
  ["sw", /^switch\..*_(laden|charging)$/],
];

/**
 * Wallboxes: a device with a charging power and a session energy sensor. Integrations without devices (KEBA)
 * are found by name instead; their key is "pfx:<entity prefix>".
 */
export function wallboxes(hass) {
  const out = new Set();
  const cars = new Set(carDevices(hass));
  for (const id of Object.keys(hass.states)) {
    const mm = /^sensor\.(.*)_charging_power$/.exec(id);
    if (!mm) continue;
    const dev = hass.entities?.[id]?.device_id;
    if (dev && cars.has(dev)) continue;
    const key = dev || `pfx:${mm[1]}`;
    const s = wbSlots(hass, key);
    if (s.session || s.total) out.add(key);
  }
  return [...out];
}
/** The wallbox's entities, by device or by name prefix. */
export function wbSlots(hass, key) {
  if (!key.startsWith("pfx:")) return slotsOf(hass, key, SLOTS);
  const pre = key.slice(4);
  const out = {};
  for (const id of Object.keys(hass.states)) {
    if (!id.split(".")[1].startsWith(`${pre}_`)) continue;
    for (const [slot, re] of SLOTS) if (!out[slot] && re.test(id)) out[slot] = id;
  }
  return out;
}
export const wallboxOf = (hass, id) => {
  const dev = hass.entities?.[id]?.device_id;
  return wallboxes(hass).find((k) => k === dev || (k.startsWith("pfx:") && id.split(".")[1]?.startsWith(`${k.slice(4)}_`))) || null;
};

const kw = (hass, id) => {
  const v = num(hass, id);
  if (v == null) return null;
  const u = hass.states[id].attributes.unit_of_measurement;
  return u === "W" ? v / 1000 : v;
};

export function wallboxText(hass, dev) {
  const s = wbSlots(hass, dev);
  const p = kw(hass, s.power);
  if (hass.states[s.charging]?.state === "on" || p > 0.1) return `${t("car_charging")} · ${fmt(hass, p, 1)} kW`;
  if (hass.states[s.plug]?.state === "on") return t("car_plugged");
  if (!live(hass, s.power) && !live(hass, s.session)) return t("wb_no_data");
  return t("wb_ready");
}

export function openWallbox(ctx, dev) {
  const hass = ctx.hass;
  const s = wbSlots(hass, dev);
  const carDev = carDevices(hass)[0];
  const c = carDev ? slotsOf(hass, carDev, CAR) : {};
  const prefs = ctx.energyPrefs || {};
  const solarRate = (prefs.energy_sources || []).find((x) => x.type === "solar")?.stat_rate;
  const priceId = (prefs.energy_sources || []).find((x) => x.type === "grid")?.entity_energy_price;
  const d = hass.devices?.[dev] || { name: dev.startsWith("pfx:") ? dev.slice(4).replace(/_/g, " ").toUpperCase() : "Wallbox" };
  const area = ctx.model.areaById.get(d?.area_id || hass.devices?.[carDev]?.area_id)?.name;

  // Flow: wallbox → cable → car battery ring
  const svg = svgEl("svg", { viewBox: "0 0 320 130", class: "hp-wb-svg" });
  const cable = svgEl("path", { d: "M78 70 C130 70 150 100 200 100 S 240 70 250 70", class: "cable" });
  const flow = svgEl("path", { d: "M78 70 C130 70 150 100 200 100 S 240 70 250 70", class: "flow" });
  svg.append(cable, flow);
  const box = h("div", { class: "hp-wb-box" }, icon("mdi:ev-station"), h("small", {}, d?.name_by_user || d?.name || "Wallbox"));
  const ringC = 2 * Math.PI * 34;
  const ringSvg = svgEl("svg", { viewBox: "0 0 80 80", class: "hp-wb-ring" });
  ringSvg.append(svgEl("circle", { cx: 40, cy: 40, r: 34, class: "track" }));
  const bar = svgEl("circle", { cx: 40, cy: 40, r: 34, class: "bar", "stroke-dasharray": `0 ${ringC}` });
  ringSvg.append(bar);
  const pct = h("b");
  const carBox = h("div", { class: "hp-wb-car" }, ringSvg, h("div", { class: "mid" }, pct, h("small", {}, carDev ? carName(hass, carDev) : t("car_battery"))));
  const stage = h("div", { class: "hp-wb-stage" }, svg, box, carBox);
  const status = h("span", { class: "hp-app-status" });
  const line = h("div", { class: "hp-wb-line" });

  const sPow = stat("mdi:flash", t("power_now"));
  const sSess = stat("mdi:battery-charging-medium", t("wb_session"));
  const sRange = stat("mdi:map-marker-distance", t("wb_range"));
  const sFull = stat("mdi:clock-check-outline", t("wb_full"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sPow, sSess, sRange, sFull);
  const hints = h("div", { class: "hp-app-hints" });

  const sheet = openSheet(ctx, { title: t("wb_title"), subtitle: area, cls: "appliance wallbox" });
  const chargeB = c.sw ? twoTap(btn("mdi:power", t("wb_start"), "primary"), () => {
    const on = ctx.hass.states[c.sw]?.state === "on";
    ctx.hass.callService("switch", on ? "turn_off" : "turn_on", { entity_id: c.sw });
  }) : null;
  const more = btn("mdi:home-assistant", t("more_short"));
  more.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, s.power || s.session); });
  sheet.body.append(stage, h("div", { class: "hp-wb-head" }, status, line), stats, hints, h("div", { class: "hp-sheet-actions hp-app-foot" }, ...(chargeB ? [chargeB] : []), more));

  const update = (hs) => {
    const p = kw(hs, s.power) ?? kw(hs, c.cpower);
    const charging = hs.states[s.charging]?.state === "on" || p > 0.1 || /^charging$/i.test(hs.states[c.cstate]?.state || "");
    const plugged = hs.states[s.plug]?.state === "on" || /connect|plug/i.test(hs.states[c.cstate]?.state || "") && !/connect_cable/i.test(hs.states[c.cstate]?.state || "");
    const offline = !live(hs, s.power) && !live(hs, s.session) && !live(hs, s.plug);
    const sun = solarRate ? Math.max(0, (watts(hs, solarRate) ?? 0) / 1000) : 0;
    const green = charging && p > 0 && sun >= p * 0.8;
    stage.classList.toggle("on", charging);
    stage.classList.toggle("green", green);
    const b = num(hs, c.battery);
    bar.setAttribute("stroke-dasharray", `${((b ?? 0) / 100) * ringC} ${ringC}`);
    pct.textContent = b != null ? `${Math.round(b)}%` : "–";
    status.textContent = offline ? t("wb_no_data") : charging ? t("car_charging") : plugged ? t("car_plugged") : t("wb_ready");
    status.dataset.phase = charging ? "run" : offline ? "fail" : "";
    line.textContent = charging ? (green ? t("wb_with_sun") : t("wb_from_grid")) : plugged ? t("wb_waiting") : t("car_not_plugged");
    sPow.set(p != null ? `${fmt(hs, p, 1)} kW` : "–");
    const e = num(hs, s.session);
    const price = Number(hs.states[priceId]?.state);
    sSess.set(e != null ? `${fmt(hs, e, 1)} kWh${Number.isFinite(price) ? ` · ${fmt(hs, e * price, 2)} €` : ""}` : "–");
    const er = num(hs, c.erange);
    sRange.set(er != null ? `${fmt(hs, er)} km` : num(hs, c.range) != null ? `${fmt(hs, num(hs, c.range))} km` : "–");
    sRange.querySelector("small").textContent = er != null ? `${t("wb_range")} · ${t("wb_electric")}` : t("wb_range");
    const left = num(hs, c.left);
    const lim = num(hs, c.limit);
    sFull.set(charging && left ? formatTime(hs, new Date(Date.now() + left * 60000)) : lim != null ? t("wb_to", { n: lim }) : "–");
    const list = [];
    if (offline) list.push(hint("mdi:lan-disconnect", t("wb_offline_hint"), true));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    if (chargeB) {
      const on = hs.states[c.sw]?.state === "on";
      chargeB.querySelector("span").textContent = on ? t("wb_stop") : t("wb_start");
      chargeB.classList.toggle("primary", !on);
    }
  };
  update(hass);
  sheet.updaters.push(update);
}
