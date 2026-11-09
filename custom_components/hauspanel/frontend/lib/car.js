// Car popup: the car's picture, battery ring and fuel gauge with range, charging, doors and windows,
// where it is, mileage and service, last trip, and pre-heating.
import { h, icon } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { num, live, slotsOf, ring, stat, hint, btn, twoTap, ago, clock, fmt } from "./popkit.js";
import { wallboxes, openWallbox } from "./wallbox.js";

const SLOTS = [
  ["battery", /^sensor\..*_(batteriestand|battery_level|battery_percentage)$/],
  ["fuel", /^sensor\..*_(fullstand_tank|fuel_level)$/],
  ["range", /^sensor\.(?!.*(elektrische|fossile|electric|combustion|fuel)_(reichweite|range)$).*_(reichweite|range)$/],
  ["erange", /^sensor\..*_(elektrische_reichweite|electric_range)$/],
  ["frange", /^sensor\..*_(fossile_reichweite|combustion_range|fuel_range)$/],
  ["chargeState", /^sensor\..*_(ladestatus|charging_state)$/],
  ["chargePower", /^sensor\..*_(ladeleistung|charging_power)$/],
  ["chargeLeft", /^sensor\..*_(verbleibende_ladezeit|remaining_charging_time)$/],
  ["chargeLimit", /^sensor\..*_(ladegrenze_in_prozent|target_battery_percentage)$/],
  ["cable", /^binary_sensor\..*_(ladekabel|charger_connected)$/],
  ["mileage", /^sensor\..*_(kilometerstand|mileage|odometer)$/],
  ["inspDays", /^sensor\..*_(nachste_inspektion|service_inspection)$/],
  ["inspKm", /^sensor\..*_(nachste_inspektion_2|service_inspection_distance)$/],
  ["oilDays", /^sensor\..*_(ol_service|oil_service)$/],
  ["outside", /^sensor\..*_(aussentemperatur|outside_temperature)$/],
  ["updated", /^sensor\..*_(letzte_aktualisierung|last_updated)$/],
  ["tripKm", /^sensor\..*_(last_trip_mileage)$/],
  ["tripMin", /^sensor\..*_(last_trip_travel_time)$/],
  ["tripFuel", /^sensor\..*_(last_trip_average_fuel_consumption)$/],
  ["tracker", /^device_tracker\./],
  ["lock", /^lock\./],
  ["climate", /^climate\./],
  ["windowHeat", /^switch\..*_(scheiben_beheizen|window_heating)$/],
  ["image", /^image\./],
  ["doors", /^binary_sensor\..*_(turen_offen|doors)$/],
  ["windows", /^binary_sensor\..*_(fenster|windows)$/],
  ["trunk", /^binary_sensor\..*_(kofferraum|trunk)$/],
  ["bonnet", /^binary_sensor\..*_(motorhaube|bonnet|hood)$/],
];

/** Cars: devices with a range sensor and a location. */
export function carDevices(hass) {
  const out = [];
  const seen = new Set();
  for (const e of Object.values(hass.entities || {})) {
    if (!e.device_id || seen.has(e.device_id) || !/^sensor\..*_(reichweite|range)$/.test(e.entity_id)) continue;
    seen.add(e.device_id);
    const s = slotsOf(hass, e.device_id, SLOTS);
    if (s.tracker && (s.battery || s.fuel)) out.push(e.device_id);
  }
  return out;
}
export const carOf = (hass, entityId) => {
  const dev = hass.entities?.[entityId]?.device_id;
  return dev && carDevices(hass).includes(dev) ? dev : null;
};
export function carName(hass, dev) {
  const d = hass.devices?.[dev];
  return d?.name_by_user || d?.name || "";
}
/** Short line for a tile: "82 % · 294 km" or "Lädt · 82 %". */
export function carText(hass, dev) {
  const s = slotsOf(hass, dev, SLOTS);
  const b = num(hass, s.battery);
  const r = num(hass, s.range);
  const charging = /^charging$|^laden$/i.test(hass.states[s.chargeState]?.state || "");
  return [charging ? t("car_charging") : null, b != null ? `${Math.round(b)} %` : null, r != null ? `${Math.round(r)} km` : null].filter(Boolean).join(" · ");
}

export function openCar(ctx, dev) {
  const hass = ctx.hass;
  const s = slotsOf(hass, dev, SLOTS);
  const name = carName(hass, dev);
  const area = ctx.model.areaById.get(hass.devices?.[dev]?.area_id)?.name;

  const pic = h("img", { class: "hp-car-pic", alt: "" });
  const picBox = h("div", { class: "hp-car-stage" }, h("i", { class: "hp-car-floor" }), pic, h("span", { class: "hp-car-where" }));
  const rg = ring("hp-app-ring hp-car-ring");
  const bBig = h("b");
  const battDial = h("div", { class: "hp-car-dial" }, rg.svg, h("div", { class: "hp-app-center" }, h("span", { class: "hp-car-bolt" }, icon("mdi:lightning-bolt")), bBig, h("small", {}, t("car_battery"))));
  const fuelFill = h("i");
  const fuelVal = h("b");
  const fuel = h("div", { class: "hp-car-fuel" }, h("div", { class: "head" }, h("span", {}, icon("mdi:gas-station"), t("car_fuel")), fuelVal), h("div", { class: "bar" }, fuelFill));
  const range = h("div", { class: "hp-car-range" });
  const charge = h("div", { class: "hp-car-charge" });
  const hero = h("div", { class: "hp-car-hero" }, battDial, h("div", { class: "hp-car-side" }, range, s.fuel ? fuel : "", charge));

  const sLock = stat("mdi:car-key", t("car_locked"));
  const sOpen = stat("mdi:car-door", t("car_doors"));
  const sKm = stat("mdi:counter", t("car_mileage"));
  const sService = stat("mdi:wrench-clock", t("car_service"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sLock, sOpen, sKm, sService);
  const trip = h("div", { class: "hp-car-trip" });
  const hints = h("div", { class: "hp-app-hints" });

  const sheet = openSheet(ctx, { title: name, subtitle: area, cls: "appliance car" });
  const clim = s.climate ? btn("mdi:fan", t("car_climate")) : null;
  clim?.addEventListener("click", () => {
    const on = ctx.hass.states[s.climate]?.state !== "off";
    ctx.hass.callService("climate", "set_hvac_mode", { entity_id: s.climate, hvac_mode: on ? "off" : (ctx.hass.states[s.climate].attributes.hvac_modes || []).find((m) => m !== "off") || "heat_cool" });
  });
  const heat = s.windowHeat ? btn("mdi:car-defrost-front", t("car_defrost")) : null;
  heat?.addEventListener("click", () => ctx.hass.callService("switch", "toggle", { entity_id: s.windowHeat }));
  // Only locking from here; unlocking needs the car's app and PIN.
  const lockB = s.lock ? twoTap(btn("mdi:lock-outline", t("car_lock_now")), () => ctx.hass.callService("lock", "lock", { entity_id: s.lock })) : null;
  const more = btn("mdi:home-assistant", t("more_short"));
  more.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, s.range || s.battery); });
  // With a wallbox at home, the charging popup is one tap away (instead of "More").
  const wb = wallboxes(hass)[0];
  const wbB = wb ? btn("mdi:ev-station", t("wb_title")) : null;
  wbB?.addEventListener("click", () => openWallbox(ctx, wb));
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot hp-pr-foot" }, ...[clim, heat, lockB, wbB || more].filter(Boolean));
  sheet.body.append(picBox, hero, stats, trip, hints, foot);

  const update = (hs) => {
    const img = hs.states[s.image]?.attributes.entity_picture;
    if (img && pic.dataset.src !== img) { pic.dataset.src = img; pic.src = img; }
    picBox.classList.toggle("no-pic", !img);
    const tr = hs.states[s.tracker];
    const where = tr ? (tr.state === "home" ? t("car_home") : tr.state === "not_home" ? t("car_away") : hs.formatEntityState?.(tr) || tr.state) : "";
    picBox.querySelector(".hp-car-where").replaceChildren(icon(tr?.state === "home" ? "mdi:home-outline" : "mdi:map-marker-outline"), h("span", {}, where));
    const b = num(hs, s.battery);
    rg.set(b ?? 0);
    bBig.textContent = b != null ? `${Math.round(b)}%` : "–";
    const cs = hs.states[s.chargeState]?.state || "";
    const charging = /^charging$|^laden$/i.test(cs);
    hero.classList.toggle("charging", charging);
    hero.dataset.tone = b != null && b < 20 ? "low" : "";
    const f = num(hs, s.fuel);
    fuelFill.style.width = `${f ?? 0}%`;
    fuelVal.textContent = f != null ? `${Math.round(f)} %` : "–";
    fuel.dataset.tone = f != null && f < 15 ? "low" : "";
    const r = num(hs, s.range);
    const er = num(hs, s.erange);
    const fr = num(hs, s.frange);
    range.replaceChildren(
      h("div", { class: "total" }, h("b", {}, r != null ? fmt(hs, r) : "–"), h("small", {}, "km")),
      h("div", { class: "split" }, ...(er != null ? [h("span", { class: "e" }, icon("mdi:lightning-bolt"), `${fmt(hs, er)} km`)] : []), ...(fr != null ? [h("span", { class: "f" }, icon("mdi:gas-station"), `${fmt(hs, fr)} km`)] : [])));
    const lim = num(hs, s.chargeLimit);
    const left = num(hs, s.chargeLeft);
    const pw = num(hs, s.chargePower);
    const cable = hs.states[s.cable]?.state === "on";
    let ctext = "";
    if (charging) ctext = [t("car_charging"), pw ? `${fmt(hs, pw, 1)} kW` : null, left ? t("car_until", { time: clock(hs, new Date(Date.now() + left * 60000)) }) : lim ? t("car_to", { n: lim }) : null].filter(Boolean).join(" · ");
    else if (cable) ctext = t("car_plugged");
    else if (s.chargeState) ctext = t("car_not_plugged");
    charge.replaceChildren(...(ctext ? [icon(charging ? "mdi:ev-station" : cable ? "mdi:power-plug" : "mdi:power-plug-off-outline"), h("span", {}, ctext)] : []));
    charge.classList.toggle("on", charging);
    const locked = hs.states[s.lock]?.state === "locked";
    sLock.set(s.lock ? (locked ? t("car_yes") : t("car_no")) : "–");
    sLock.classList.toggle("warn", !!s.lock && !locked);
    const opens = [["doors", "car_door"], ["windows", "car_window"], ["trunk", "car_trunk"], ["bonnet", "car_bonnet"]].filter(([k]) => hs.states[s[k]]?.state === "on").map(([, l]) => t(l));
    sOpen.set(opens.length ? opens.join(", ") : t("car_all_closed"));
    sOpen.classList.toggle("warn", opens.length > 0);
    const km = num(hs, s.mileage);
    sKm.set(km != null ? `${fmt(hs, km)} km` : "–");
    const days = num(hs, s.inspDays);
    const skm = num(hs, s.inspKm);
    sService.set(days != null ? t("car_in_days", { n: fmt(hs, days) }) : skm != null ? `${fmt(hs, skm)} km` : "–");
    sService.querySelector("small").textContent = days != null && skm != null ? `${t("car_service")} · ${fmt(hs, skm)} km` : t("car_service");
    const tk = num(hs, s.tripKm);
    trip.replaceChildren(...(tk != null ? [h("div", { class: "hp-label" }, t("car_last_trip")),
      h("div", { class: "row" }, h("span", {}, icon("mdi:map-marker-distance"), `${fmt(hs, tk)} km`), h("span", {}, icon("mdi:timer-outline"), `${fmt(hs, num(hs, s.tripMin))} min`),
        ...(num(hs, s.tripFuel) != null ? [h("span", {}, icon("mdi:gas-station-outline"), `${fmt(hs, num(hs, s.tripFuel), 1)} l/100`)] : []))] : []));
    const list = [];
    if (opens.length) list.push(hint("mdi:car-door", t("car_open_hint", { what: opens.join(", ") }), true));
    if (s.lock && !locked) list.push(hint("mdi:lock-open-variant-outline", t("car_unlocked_hint")));
    if (days != null && days < 30) list.push(hint("mdi:wrench-outline", t("car_service_soon", { n: fmt(hs, days) })));
    const upd = hs.states[s.updated]?.state;
    if (upd && live(hs, s.updated)) list.push(h("div", { class: "hp-car-updated" }, icon("mdi:update"), t("car_updated", { when: ago(hs, upd) }), num(hs, s.outside) != null ? ` · ${fmt(hs, num(hs, s.outside), 0)}° ${t("car_outside")}` : ""));
    hints.replaceChildren(...list);
    if (clim) {
      const on = hs.states[s.climate]?.state && hs.states[s.climate].state !== "off";
      clim.classList.toggle("lit", !!on);
      clim.querySelector("span").textContent = on ? t("car_climate_off") : t("car_climate");
    }
    heat?.classList.toggle("lit", hs.states[s.windowHeat]?.state === "on");
    if (lockB) lockB.hidden = locked || !live(hs, s.lock);
    // Three buttons side by side on one line; two or four as a 2×2 grid.
    const shown = [...foot.children].filter((b) => !b.hidden).length;
    foot.style.gridTemplateColumns = shown === 3 ? "repeat(3, minmax(0, 1fr))" : "";
  };
  update(hass);
  sheet.updaters.push(update);
}
