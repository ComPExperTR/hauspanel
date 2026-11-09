// Solar popup: today's production as a glowing curve under the sun's arc, yesterday dashed for comparison,
// the best moment of the day, and what the roof made and saved today, this month and this year.
import { h, icon, formatTime } from "./util.js";
import { openSheet } from "./dialogs.js";
import { watts, formatWatts } from "./usage.js";
import { t } from "./i18n.js";
import { svgEl, num, live, stat, fmt } from "./popkit.js";

const find = (hass, re) => Object.keys(hass.states).find((id) => id.startsWith("sensor.") && re.test(id)) || null;

export function solarSource(ctx) {
  const s = (ctx.energyPrefs?.energy_sources || []).find((x) => x.type === "solar");
  return s ? { rate: s.stat_rate || null, energy: s.stat_energy_from, name: s.name } : null;
}

export function openSolar(ctx) {
  const hass = ctx.hass;
  const src = solarSource(ctx);
  if (!src) return;
  const ids = {
    day: find(hass, /tagesertrag_solar|solar.*(daily|today).*energy/), month: find(hass, /monatsertrag_solar/), year: find(hass, /jahresertrag_solar/),
    saveDay: find(hass, /tagesersparnis_solar/), saveMonth: find(hass, /monatsersparnis_solar/), saveYear: find(hass, /jahresersparnis_solar/),
  };

  const big = h("b");
  const sub = h("small");
  const svg = svgEl("svg", { viewBox: "0 0 340 150", preserveAspectRatio: "none", class: "hp-sol-svg" });
  const defs = svgEl("defs");
  const gr = svgEl("linearGradient", { id: "hpSolFill", x1: 0, y1: 0, x2: 0, y2: 1 });
  gr.append(svgEl("stop", { offset: 0, "stop-color": "#ffd166", "stop-opacity": ".75" }), svgEl("stop", { offset: 1, "stop-color": "#ffb347", "stop-opacity": "0" }));
  defs.append(gr);
  svg.append(defs, svgEl("path", { d: "M10 140 Q170 -10 330 140", class: "arc" }));
  const yest = svgEl("path", { class: "yest" });
  const area = svgEl("path", { class: "area", fill: "url(#hpSolFill)" });
  const line = svgEl("path", { class: "line" });
  const sunDot = svgEl("circle", { r: 9, class: "sun" });
  const peak = svgEl("circle", { r: 4, class: "peak" });
  svg.append(yest, area, line, peak, sunDot);
  const axis = h("div", { class: "hp-sol-axis" });
  const stage = h("div", { class: "hp-sol-stage" }, svg, h("div", { class: "hp-sol-now" }, big, sub), axis);

  const sDay = stat("mdi:white-balance-sunny", t("sol_today"));
  const sSave = stat("mdi:piggy-bank-outline", t("sol_saved_today"));
  const sMonth = stat("mdi:calendar-month", t("hp_month"));
  const sYear = stat("mdi:calendar", t("sol_year"));
  const sPeak = stat("mdi:chart-bell-curve", t("sol_peak"));
  const sYest = stat("mdi:history", t("sol_vs_yesterday"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sDay, sSave, sPeak, sYest, sMonth, sYear);
  const sheet = openSheet(ctx, { title: src.name || t("solar"), subtitle: "", cls: "appliance solar" });
  sheet.body.append(stage, stats);

  let today = [];
  let yesterday = [];
  // The day's window: 5:00 to 21:00, so the curve always fills the arc.
  const day0 = new Date(); day0.setHours(5, 0, 0, 0);
  const day1 = new Date(); day1.setHours(21, 0, 0, 0);
  const X = (tm, base) => 10 + ((tm - base) / (day1 - day0)) * 320;
  const draw = (hs) => {
    const all = [...today, ...yesterday].map((p) => p.v);
    const max = Math.max(1, ...all);
    const Y = (v) => 140 - (v / max) * 110;
    const path = (pts, base) => pts.length > 1 ? pts.map((p, i) => `${i ? "L" : "M"}${X(p.t, base).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ") : "";
    const dt = path(today, day0.getTime());
    line.setAttribute("d", dt);
    area.setAttribute("d", dt ? `${dt} L${X(today[today.length - 1].t, day0.getTime()).toFixed(1)} 140 L${X(today[0].t, day0.getTime()).toFixed(1)} 140 Z` : "");
    yest.setAttribute("d", path(yesterday, day0.getTime() - 86400e3));
    const best = today.reduce((a, p) => (p.v > (a?.v ?? -1) ? p : a), null);
    if (best && best.v > 0.01) {
      peak.setAttribute("cx", X(best.t, day0.getTime()));
      peak.setAttribute("cy", Y(best.v));
      sPeak.set(`${fmt(hs, best.v, 1)} kW · ${formatTime(hs, new Date(best.t))}`);
    } else { peak.setAttribute("cx", -20); sPeak.set("–"); }
    const sumOf = (pts) => pts.reduce((a, p, i) => (i ? a + ((p.t - pts[i - 1].t) / 3600e3) * pts[i - 1].v : 0), 0);
    const now = Date.now();
    const yUntilNow = sumOf(yesterday.filter((p) => p.t <= now - 86400e3));
    const tSum = sumOf(today);
    sYest.set(yUntilNow > 0.05 ? `${tSum >= yUntilNow ? "+" : "−"}${fmt(hs, Math.abs((tSum / yUntilNow - 1) * 100))} %` : "–");
  };
  const update = (hs) => {
    const w = watts(hs, src.rate);
    big.textContent = w != null ? formatWatts(hs, w) : "–";
    const sunSt = hs.states["sun.sun"];
    const up = sunSt?.state === "above_horizon";
    sub.textContent = up ? t("sol_producing") : t("ov_sun_down");
    stage.classList.toggle("night", !up);
    const frac = Math.max(0, Math.min(1, (now() - day0) / (day1 - day0)));
    const x = 10 + frac * 320;
    const tt = frac;
    const y = (1 - tt) * (1 - tt) * 140 + 2 * (1 - tt) * tt * -10 + tt * tt * 140;
    sunDot.setAttribute("cx", x);
    sunDot.setAttribute("cy", up ? y : 150);
    const kwh = (id) => (live(hs, id) ? `${fmt(hs, num(hs, id), 1)} kWh` : null);
    const eur = (id) => (live(hs, id) ? `${fmt(hs, num(hs, id), 2)} €` : null);
    sDay.set(kwh(ids.day) || "–");
    sSave.set(eur(ids.saveDay) || "–");
    sMonth.set([kwh(ids.month), eur(ids.saveMonth)].filter(Boolean).join(" · ") || "–");
    sYear.set([kwh(ids.year), eur(ids.saveYear)].filter(Boolean).join(" · ") || "–");
    if (today.length && w != null) {
      const last = today[today.length - 1];
      if (Date.now() - last.t > 60000) { today.push({ t: Date.now(), v: w / 1000 }); draw(hs); }
    }
  };
  const now = () => Date.now();
  axis.replaceChildren(...[6, 9, 12, 15, 18].map((hh) => {
    const d = new Date(); d.setHours(hh, 0, 0, 0);
    return h("small", { style: { left: `${((X(d.getTime(), day0.getTime())) / 340) * 100}%` } }, formatTime(hass, d));
  }));
  update(hass);
  sheet.updaters.push(update);

  if (src.rate) {
    const start = new Date(day0.getTime() - 86400e3);
    hass.callWS({ type: "history/history_during_period", start_time: start.toISOString(), entity_ids: [src.rate], minimal_response: true, no_attributes: true, significant_changes_only: false })
      .then((r) => {
        const unit = hass.states[src.rate]?.attributes.unit_of_measurement;
        const pts = (r[src.rate] || []).map((x) => ({ t: (x.lu ?? x.lc) * 1000, v: Number(x.s) / (unit === "W" ? 1000 : 1) })).filter((p) => Number.isFinite(p.v));
        today = pts.filter((p) => p.t >= day0.getTime() && p.t <= day1.getTime());
        yesterday = pts.filter((p) => p.t >= day0.getTime() - 86400e3 && p.t <= day1.getTime() - 86400e3);
        draw(ctx.hass);
      }).catch(() => {});
  }
}
