// Heat pump popup: the outdoor unit with its fan, hot flow and cool return as moving pipes, the hot water tank,
// pumps and heating rods, power now and what heating costs today and this month.
import { h, icon } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { watts, formatWatts } from "./usage.js";
import { t } from "./i18n.js";
import { num, live, slotsOf, stat, hint, btn, historyChart, fmt } from "./popkit.js";

const SLOTS = [
  ["flow", /^sensor\..*_vorlauftemperatur$|_flow_temperature$/],
  ["ret", /^sensor\..*_rucklauftemperatur$|_return_temperature$/],
  ["outside", /^sensor\..*_(aussentemperatur|outside_temperature)$/],
  ["tank", /^sensor\..*_(speichertemperatur|tank_water_temperature)$/],
  ["fan", /^sensor\..*_(lufterfrequenz|fan_frequency)$/],
  ["demand", /^sensor\..*_(nachfrageanteil|demand_percentage)$/],
  ["valve3", /^binary_sensor\..*_3_wege_ventil$/],
  ["rod", /^binary_sensor\..*_heizstab$/],
  ["boost1", /^binary_sensor\..*_zuheizer_1$/],
  ["boost2", /^binary_sensor\..*_zuheizer_2$/],
];

/** Heat pumps: a water heater whose device also reports flow temperature. Returns { dev, wh, climate }. */
export function heatPumps(hass) {
  const out = [];
  for (const e of Object.values(hass.entities || {})) {
    if (!e.entity_id.startsWith("water_heater.") || !e.device_id) continue;
    const s = slotsOf(hass, e.device_id, SLOTS);
    if (!s.flow && !s.tank) continue;
    // The heating zone of the same integration (its own device).
    const climate = Object.values(hass.entities).find((x) => x.entity_id.startsWith("climate.") && x.platform === e.platform)?.entity_id || null;
    out.push({ dev: e.device_id, wh: e.entity_id, climate });
  }
  return out;
}
export function heatPumpOf(hass, entityId) {
  const dev = hass.entities?.[entityId]?.device_id;
  return heatPumps(hass).find((p) => p.dev === dev || (p.climate && hass.entities?.[p.climate]?.device_id === dev)) || null;
}

const pumps = (hass, dev) => Object.values(hass.entities).filter((e) => e.device_id === dev && /^binary_sensor\..*_(wasserpumpe|water_pump)_\d+$/.test(e.entity_id)).map((e) => e.entity_id);
const costSensor = (hass, re) => Object.keys(hass.states).find((id) => id.startsWith("sensor.") && re.test(id));

export function heatPumpText(hass, p) {
  const s = slotsOf(hass, p.dev, SLOTS);
  const running = pumps(hass, p.dev).some((id) => hass.states[id]?.state === "on");
  const hot = hass.states[s.valve3]?.state === "on";
  const tank = num(hass, s.tank);
  return [running ? (hot ? t("hp_hot_water") : t("hp_heating")) : t("hp_idle"), tank != null ? `${fmt(hass, tank, 0)}° ${t("hp_tank_short")}` : null].filter(Boolean).join(" · ");
}

export function openHeatPump(ctx, p) {
  const hass = ctx.hass;
  const s = slotsOf(hass, p.dev, SLOTS);
  const pumpIds = pumps(hass, p.dev);
  const powerId = (ctx.energyPrefs?.device_consumption || []).find((d) => /w(a|ä|ae)rmepumpe|heat.?pump/i.test(`${d.name || ""} ${d.stat_consumption}`))?.stat_rate || null;
  const costDay = costSensor(hass, /tageskosten_w(a|ae)rmepumpe|heat_pump.*cost.*day/);
  const costMonth = costSensor(hass, /monatskosten_w(a|ae)rmepumpe/);
  const useDay = costSensor(hass, /tagesverbrauch_w(a|ae)rmepumpe/);
  const area = ctx.model.areaById.get(hass.devices?.[p.dev]?.area_id)?.name;

  // Scene: outdoor unit → pipes → tank / house
  const fan = h("div", { class: "hp-hp-fan" }, h("i"), h("i"), h("i"));
  const unit = h("div", { class: "hp-hp-unit" }, fan);
  const flowT = h("b", { class: "flow" });
  const retT = h("b", { class: "ret" });
  const pipes = h("div", { class: "hp-hp-pipes" }, h("div", { class: "pipe hot" }, h("i")), h("div", { class: "pipe cold" }, h("i")), flowT, retT);
  const tankFill = h("i", { class: "fill" });
  const tankT = h("b");
  const tank = h("div", { class: "hp-hp-tank" }, tankFill, h("div", { class: "lbl" }, tankT, h("small", {}, t("hp_tank"))));
  const mode = h("span", { class: "hp-app-status" });
  const outside = h("span", { class: "hp-hp-out" });
  // Top: what it does and the weather; below: outdoor unit → pipes → tank.
  const scene = h("div", { class: "hp-hp-scene" }, h("div", { class: "hp-hp-head" }, mode, outside), h("div", { class: "hp-hp-graphic" }, unit, pipes, tank));

  const sPow = stat("mdi:flash", t("power_now"));
  const sDay = stat("mdi:currency-eur", t("hp_today"));
  const sMonth = stat("mdi:calendar-month", t("hp_month"));
  const sDemand = stat("mdi:speedometer", t("hp_demand"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sPow, sDay, sMonth, sDemand);
  const parts = h("div", { class: "hp-hp-parts" });
  const hints = h("div", { class: "hp-app-hints" });
  const chart = historyChart(ctx, { label: t("hp_24h"), hours: 24, unit: "°", digits: 0, minSpan: 5,
    series: [{ id: s.flow, cls: "now", area: true }, ...(s.tank ? [{ id: s.tank, cls: "target" }] : [])].filter((x) => x.id) });

  const sheet = openSheet(ctx, { title: t("hp_title"), subtitle: area, cls: "appliance heatpump" });
  const boost = btn("mdi:water-boiler", t("hp_boost"));
  boost.addEventListener("click", () => {
    const st = ctx.hass.states[p.wh];
    const on = st?.attributes.operation_mode === "force_hot_water";
    ctx.hass.callService("water_heater", "set_operation_mode", { entity_id: p.wh, operation_mode: on ? "auto" : "force_hot_water" });
  });
  const canBoost = (hass.states[p.wh]?.attributes.operation_list || []).includes("force_hot_water");
  const more = btn("mdi:home-assistant", t("more_short"));
  more.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, p.wh); });
  sheet.body.append(scene, stats, parts, hints, chart, h("div", { class: "hp-sheet-actions hp-app-foot" }, ...(canBoost ? [boost] : []), more));

  const update = (hs) => {
    const running = pumpIds.some((id) => hs.states[id]?.state === "on");
    const hot = hs.states[s.valve3]?.state === "on";
    scene.classList.toggle("run", running);
    scene.classList.toggle("dhw", hot);
    const fq = num(hs, s.fan);
    fan.style.animationDuration = fq ? `${Math.max(0.25, 6 / fq).toFixed(2)}s` : "";
    fan.classList.toggle("spin", !!fq);
    outside.replaceChildren(...(live(hs, s.outside) ? [icon("mdi:thermometer"), `${fmt(hs, num(hs, s.outside), 0)}° ${t("hp_outside")}`] : []));
    flowT.textContent = live(hs, s.flow) ? `${fmt(hs, num(hs, s.flow), 1)}°` : "";
    retT.textContent = live(hs, s.ret) ? `${fmt(hs, num(hs, s.ret), 1)}°` : "";
    const tv = num(hs, s.tank);
    tankT.textContent = tv != null ? `${fmt(hs, tv, 0)}°` : "–";
    tankFill.style.height = `${tv != null ? Math.max(8, Math.min(100, ((tv - 20) / 40) * 100)) : 0}%`;
    mode.textContent = running ? (hot ? t("hp_hot_water") : t("hp_heating")) : t("hp_idle");
    mode.dataset.phase = running ? "run" : "";
    const w = watts(hs, powerId);
    sPow.set(w != null ? formatWatts(hs, w) : "–");
    sPow.hidden = !powerId;
    sDay.set(live(hs, costDay) ? `${fmt(hs, num(hs, costDay), 2)} €` : live(hs, useDay) ? `${fmt(hs, num(hs, useDay), 1)} kWh` : "–");
    sDay.querySelector("small").textContent = live(hs, costDay) && live(hs, useDay) ? `${t("hp_today")} · ${fmt(hs, num(hs, useDay), 1)} kWh` : t("hp_today");
    sMonth.set(live(hs, costMonth) ? `${fmt(hs, num(hs, costMonth), 0)} €` : "–");
    const dem = num(hs, s.demand);
    sDemand.set(dem != null ? `${Math.round(dem)} %` : "–");
    sDemand.hidden = !s.demand;
    // Only what is running right now; the rest is quiet.
    const onParts = [
      ...pumpIds.map((id, i) => [id, "mdi:pump", t("hp_pump_n", { n: i + 1 }), ""]),
      ...[["valve3", "mdi:valve", "hp_valve"], ["rod", "mdi:heating-coil", "hp_rod"], ["boost1", "mdi:fire", "hp_backup"]].filter(([k]) => s[k]).map(([k, ic, l]) => [s[k], ic, t(l), k]),
    ].filter(([id]) => hs.states[id]?.state === "on");
    parts.replaceChildren(h("small", { class: "lbl" }, t("hp_running_now")),
      ...(onParts.length ? onParts.map(([, ic, l, k]) => h("span", { class: `hp-hp-part on ${k}` }, icon(ic), l)) : [h("span", { class: "hp-hp-part" }, icon("mdi:sleep"), t("hp_all_quiet"))]));
    const list = [];
    if (["rod", "boost1", "boost2"].some((k) => hs.states[s[k]]?.state === "on")) list.push(hint("mdi:heating-coil", t("hp_rod_on"), true));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    const forced = hs.states[p.wh]?.attributes.operation_mode === "force_hot_water";
    boost.classList.toggle("lit", forced);
    boost.querySelector("span").textContent = forced ? t("hp_boost_stop") : t("hp_boost");
  };
  update(hass);
  sheet.updaters.push(update);
  chart.load(hass);
}
