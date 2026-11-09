// Thermostat popup: a big dial from cool blue to warm orange you can drag, the room now, humidity,
// open windows in the room, modes and the last 24 hours.
import { h, icon, domainOf } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { svgEl, stat, hint, historyChart, moreButton, fmt } from "./popkit.js";

const START = 135; // degrees, dial runs 270° clockwise
const SWEEP = 270;
const R = 92;
const pt = (deg, r = R) => {
  const a = (deg * Math.PI) / 180;
  return [110 + r * Math.cos(a), 110 + r * Math.sin(a)];
};
const arc = (from, to, r = R) => {
  const [x1, y1] = pt(from, r);
  const [x2, y2] = pt(to, r);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const MODE_IC = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", auto: "mdi:calendar-sync", heat_cool: "mdi:sun-snowflake-variant", dry: "mdi:water-percent", fan_only: "mdi:fan" };

export function openThermostat(ctx, entityId) {
  const hass = ctx.hass;
  const st0 = hass.states[entityId];
  if (!st0) return;
  const a0 = st0.attributes;
  const min = a0.min_temp ?? 7;
  const max = a0.max_temp ?? 30;
  const step = a0.target_temp_step || (a0.temperature_unit === "°F" ? 1 : 0.5);
  const areaId = ctx.model.areaOf[entityId];
  const areaName = ctx.model.areaById.get(areaId)?.name;
  const dev = hass.entities?.[entityId]?.device_id;
  const toDeg = (v) => START + ((Math.min(max, Math.max(min, v)) - min) / (max - min)) * SWEEP;

  // Dial
  const svg = svgEl("svg", { viewBox: "0 0 220 220", class: "hp-th-svg" });
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: "hpThGrad", x1: "0", y1: "1", x2: "1", y2: "0" });
  for (const [o, c] of [["0", "#5fb4ff"], ["0.45", "#9be7c4"], ["0.7", "#ffc069"], ["1", "#ff7a45"]]) grad.append(svgEl("stop", { offset: o, "stop-color": c }));
  defs.append(grad);
  const track = svgEl("path", { d: arc(START, START + SWEEP), class: "track" });
  const fill = svgEl("path", { class: "fill" });
  const ticks = svgEl("g", { class: "ticks" });
  for (let i = 0; i <= 54; i++) {
    const d = START + (i / 54) * SWEEP;
    const [x1, y1] = pt(d, R - 16);
    const [x2, y2] = pt(d, R - (i % 6 ? 20 : 24));
    ticks.append(svgEl("line", { x1, y1, x2, y2 }));
  }
  const curDot = svgEl("circle", { r: 5, class: "cur" });
  const knob = svgEl("circle", { r: 13, class: "knob" });
  svg.append(defs, track, fill, ticks, curDot, knob);
  const big = h("b");
  const sub = h("small");
  const action = h("span", { class: "hp-th-action" });
  const center = h("div", { class: "hp-th-center" }, action, big, sub);
  const minus = h("button", { class: "hp-round hp-th-step", "aria-label": "−" }, icon("mdi:minus"));
  const plus = h("button", { class: "hp-round hp-th-step", "aria-label": "+" }, icon("mdi:plus"));
  const dial = h("div", { class: "hp-th-dial" }, svg, center);
  const hero = h("div", { class: "hp-th-hero" }, minus, dial, plus);

  // Modes and presets
  const modes = h("div", { class: "hp-modes hp-pk-chips hp-th-modes" });
  const modeBtns = (a0.hvac_modes || []).map((m) => {
    const b = h("button", { class: "hp-chip" }, icon(MODE_IC[m] || "mdi:thermostat"), t(`th_mode_${m}`) !== `th_mode_${m}` ? t(`th_mode_${m}`) : m);
    b.dataset.mode = m;
    b.addEventListener("click", () => ctx.hass.callService("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: m }));
    modes.append(b);
    return b;
  });
  const boost = (a0.preset_modes || []).includes("boost") ? h("button", { class: "hp-chip" }, icon("mdi:rocket-launch-outline"), t("th_boost")) : null;
  boost?.addEventListener("click", () => {
    const on = ctx.hass.states[entityId].attributes.preset_mode === "boost";
    ctx.hass.callService("climate", "set_preset_mode", { entity_id: entityId, preset_mode: on ? (a0.preset_modes.find((p) => p !== "boost") || "none") : "boost" });
  });
  if (boost) modes.append(boost);

  // Room facts: humidity, windows
  const windows = Object.keys(hass.states).filter((id) => domainOf(id) === "binary_sensor" && ["window", "opening"].includes(hass.states[id].attributes.device_class)
    && areaId && ctx.model.areaOf[id] === areaId);
  const humidId = Object.keys(hass.states).find((id) => domainOf(id) === "sensor" && hass.states[id].attributes.device_class === "humidity"
    && (hass.entities?.[id]?.device_id === dev || (areaId && ctx.model.areaOf[id] === areaId)));
  const sNow = stat("mdi:thermometer", t("th_now"));
  const sHum = stat("mdi:water-percent", t("th_humidity"));
  const sWin = stat("mdi:window-closed-variant", t("th_windows"));
  const stats = h("div", { class: "hp-app-stats" }, sNow, sHum, ...(windows.length ? [sWin] : []));
  const hints = h("div", { class: "hp-app-hints" });
  const chart = historyChart(ctx, {
    label: t("th_24h"), hours: 24, unit: "°", digits: 1, minSpan: 2,
    series: [{ id: entityId, attr: "temperature", cls: "target", step: true }, { id: entityId, attr: "current_temperature", cls: "now", area: true }],
  });

  const sheet = openSheet(ctx, { title: areaName || st0.attributes.friendly_name, subtitle: areaName ? st0.attributes.friendly_name : "", cls: "appliance thermostat" });
  sheet.body.append(hero, modes, stats, hints, chart, h("div", { class: "hp-sheet-actions hp-app-foot" }, moreButton(ctx, sheet, entityId, openMoreInfo)));

  // Setting the target: drag on the dial or +/−; sent once the finger rests.
  let target = null;
  let sendTimer = null;
  let holdUntil = 0;
  const show = (v) => {
    const deg = toDeg(v);
    fill.setAttribute("d", arc(START, Math.max(START + 0.5, deg)));
    const [x, y] = pt(deg);
    knob.setAttribute("cx", x);
    knob.setAttribute("cy", y);
    big.textContent = `${fmt(ctx.hass, v, step < 1 ? 1 : 0)}°`;
  };
  const setTarget = (v) => {
    v = Math.round(Math.min(max, Math.max(min, v)) / step) * step;
    target = v;
    holdUntil = Date.now() + 4000;
    show(v);
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => ctx.hass.callService("climate", "set_temperature", { entity_id: entityId, temperature: v }), 700);
  };
  const cur = () => target ?? ctx.hass.states[entityId]?.attributes.temperature ?? min;
  minus.addEventListener("click", () => setTarget(cur() - step));
  plus.addEventListener("click", () => setTarget(cur() + step));
  const fromPointer = (e) => {
    const r = svg.getBoundingClientRect();
    let deg = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    if (deg < 0) deg += 360;
    let rel = deg - START;
    if (rel < 0) rel += 360;
    if (rel > SWEEP) rel = rel > SWEEP + (360 - SWEEP) / 2 ? 0 : SWEEP;
    setTarget(min + (rel / SWEEP) * (max - min));
  };
  let dragging = false;
  svg.addEventListener("pointerdown", (e) => {
    if (ctx.hass.states[entityId]?.state === "off") return;
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    fromPointer(e);
  });
  svg.addEventListener("pointermove", (e) => dragging && fromPointer(e));
  svg.addEventListener("pointerup", () => { dragging = false; });
  svg.addEventListener("pointercancel", () => { dragging = false; });

  const update = (hs) => {
    const st = hs.states[entityId];
    if (!st) return;
    const a = st.attributes;
    const off = st.state === "off";
    hero.classList.toggle("off", off);
    const act = a.hvac_action;
    hero.dataset.action = act === "heating" || act === "preheating" ? "heat" : act === "cooling" ? "cool" : "";
    action.textContent = off ? t("off") : act === "heating" || act === "preheating" ? t("heating_now") : act === "cooling" ? t("cooling_now") : act === "idle" ? t("th_idle") : "";
    if (Date.now() > holdUntil) target = null;
    const tv = target ?? a.temperature ?? a.target_temp_low;
    if (tv != null) show(tv);
    else big.textContent = "–";
    if (off) big.textContent = t("off");
    const now = a.current_temperature;
    const okNow = now != null && now > -30 && now < 60;
    sub.textContent = okNow ? t("th_now_is", { v: fmt(hs, now, 1) }) : "";
    if (okNow) {
      const [x, y] = pt(toDeg(now));
      curDot.setAttribute("cx", x);
      curDot.setAttribute("cy", y);
    }
    curDot.style.display = okNow ? "" : "none";
    sNow.set(okNow ? `${fmt(hs, now, 1)}°` : "–");
    const hum = a.current_humidity ?? Number(hs.states[humidId]?.state);
    sHum.set(Number.isFinite(hum) ? `${Math.round(hum)} %` : "–");
    sHum.hidden = !Number.isFinite(hum);
    const open = windows.filter((id) => hs.states[id]?.state === "on");
    sWin.set(open.length ? t("th_n_open", { n: open.length }) : t("th_closed"));
    sWin.classList.toggle("warn", open.length > 0);
    const list = [];
    if (open.length && !off) list.push(hint("mdi:window-open-variant", t("th_window_hint"), false));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.mode === st.state));
    boost?.classList.toggle("active", a.preset_mode === "boost");
  };
  update(hass);
  sheet.updaters.push(update);
  chart.load(hass);
}
