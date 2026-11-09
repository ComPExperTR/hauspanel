// Small parts the big popups share: progress ring, stat boxes, hints, level bars, a history chart and two-tap buttons.
import { h, icon, formatTime } from "./util.js";
import { t } from "./i18n.js";

export const SVGNS = "http://www.w3.org/2000/svg";
export const svgEl = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

export const num = (hass, id) => {
  if (!id) return null;
  const v = Number(hass.states[id]?.state);
  return Number.isFinite(v) ? v : null;
};
export const live = (hass, id) => !!id && !!hass.states[id] && !["unavailable", "unknown"].includes(hass.states[id].state);
/** A time in the user's own format (24 h or 12 h, as set in their Home Assistant profile). */
export const clock = (hass, d) => formatTime(hass, d);
export const fmt = (hass, v, digits = 0) => (v == null ? "–" : Number(v).toLocaleString(hass.locale?.language || "de", { maximumFractionDigits: digits, minimumFractionDigits: digits }));

/** Since when, in words: "vor 5 min", "vor 3 Std.", "Mo 14:20". */
export function ago(hass, when) {
  const d = when instanceof Date ? when : new Date(when);
  const s = (Date.now() - d.getTime()) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 90) return t("pk_just_now");
  if (s < 3600) return t("pk_min_ago", { n: Math.round(s / 60) });
  if (s < 86400 * 0.75) return t("pk_h_ago", { n: Math.round(s / 3600) });
  return d.toLocaleDateString(hass.locale?.language || "de", { weekday: "short" }) + " " + clock(hass, d);
}

/** How long since, as a duration: "12 min", "3 Std.", "2 Tagen". */
export function since(when) {
  const s = (Date.now() - new Date(when).getTime()) / 1000;
  if (!Number.isFinite(s)) return "";
  if (s < 3600) return t("pk_dur_min", { n: Math.max(1, Math.round(s / 60)) });
  if (s < 86400 * 2) return t("pk_dur_h", { n: Math.round(s / 3600) });
  return t("pk_dur_d", { n: Math.round(s / 86400) });
}

/** Every entity of a device, as { slot: entity_id } for the first entity each pattern matches. */
export function slotsOf(hass, dev, slots) {
  const out = {};
  for (const e of Object.values(hass.entities || {})) {
    if (e.device_id !== dev) continue;
    for (const [slot, re] of slots) if (!out[slot] && re.test(e.entity_id)) out[slot] = e.entity_id;
  }
  return out;
}

/** A round progress ring (0–100, null spins). */
export function ring(cls = "hp-app-ring") {
  const svg = svgEl("svg", { viewBox: "0 0 120 120", class: cls });
  svg.append(svgEl("circle", { cx: 60, cy: 60, r: 55, pathLength: 100, class: "track" }));
  const bar = svgEl("circle", { cx: 60, cy: 60, r: 55, pathLength: 100, class: "bar" });
  svg.append(bar);
  return { svg, set(p) {
    svg.classList.toggle("spin", p == null);
    bar.style.strokeDasharray = `${p == null ? 18 : Math.max(0.5, Math.min(100, p))} 100`;
  } };
}

export function stat(ic, label) {
  const v = h("b");
  const el = h("div", { class: "hp-app-stat" }, icon(ic), h("div", {}, v, h("small", {}, label)));
  el.v = v;
  el.set = (txt) => { v.textContent = txt ?? "–"; };
  return el;
}

export function hint(ic, txt, bad = false, cls = "") {
  return h("div", { class: `hp-app-hint ${bad ? "bad" : ""} ${cls}` }, icon(ic), h("span", {}, txt));
}

/** A labelled level bar (filter life, pH …). */
export function level(label, ic) {
  const fill = h("i");
  const val = h("b");
  const el = h("div", { class: "hp-pk-level" }, h("div", { class: "hp-pk-level-head" }, h("span", {}, icon(ic), label), val), h("div", { class: "hp-pk-level-bar" }, fill));
  el.set = (pct, text, tone = "") => {
    fill.style.width = `${Math.max(0, Math.min(100, pct ?? 0))}%`;
    val.textContent = text;
    el.dataset.tone = tone;
  };
  return el;
}

/** A button that asks once ("Tap again …") before it runs. */
export function twoTap(btn, run, armedText = t("pk_tap_again")) {
  let timer = null;
  const label = () => btn.querySelector("span") || btn;
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!btn.classList.contains("armed")) {
      btn.dataset.text = label().textContent;
      btn.classList.add("armed");
      label().textContent = armedText;
      clearTimeout(timer);
      timer = setTimeout(() => { btn.classList.remove("armed"); label().textContent = btn.dataset.text; }, 4000);
      return;
    }
    clearTimeout(timer);
    btn.classList.remove("armed");
    label().textContent = btn.dataset.text;
    run();
  });
  return btn;
}

export const btn = (ic, text, cls = "ghost") => h("button", { class: `hp-btn ${cls}` }, icon(ic), h("span", {}, text));

/**
 * A soft line/area chart from history: series = [{ id, attr?, cls }]. Hours back, optional dashed target series.
 * Returns an element with load(hass).
 */
export function historyChart(ctx, { label, hours = 24, series, unit = "", digits = 1, minSpan = 1 }) {
  const box = h("div", { class: "hp-app-chart hp-pk-chart" });
  const range = h("small", { class: "max" });
  const plot = h("div", { class: "hp-app-plot" });
  box.append(h("div", { class: "hp-app-chart-head" }, h("small", {}, label), range), plot);
  box.load = async (hass) => {
    const from = Date.now() - hours * 3600e3;
    const ids = [...new Set(series.map((s) => s.id))];
    let res = {};
    try {
      const needAttr = series.some((s) => s.attr);
      res = await hass.callWS({ type: "history/history_during_period", start_time: new Date(from).toISOString(), entity_ids: ids, minimal_response: !needAttr, no_attributes: !needAttr, significant_changes_only: false });
    } catch { res = {}; }
    const lines = series.map((s) => {
      const pts = (res[s.id] || []).map((x) => {
        const v = s.attr ? Number((x.a || x.attributes || {})[s.attr]) : Number(x.s ?? x.state);
        return { t: Math.max(from, ((x.lu ?? x.lc) || Date.parse(x.last_updated) / 1000) * 1000), v };
      }).filter((p) => Number.isFinite(p.v));
      // attributes are only sent when they change; carry the last value forward
      return { ...s, pts };
    }).filter((s) => s.pts.length);
    if (!lines.length) {
      plot.replaceChildren(h("div", { class: "hp-muted small center" }, t("no_data")));
      return;
    }
    const all = lines.flatMap((l) => l.pts.map((p) => p.v));
    let lo = Math.min(...all);
    let hi = Math.max(...all);
    if (hi - lo < minSpan) { const m = (hi + lo) / 2; lo = m - minSpan / 2; hi = m + minSpan / 2; }
    const t1 = Date.now();
    const X = (tm) => ((tm - from) / (t1 - from)) * 300;
    const Y = (v) => 66 - ((v - lo) / (hi - lo)) * 60;
    const svg = svgEl("svg", { viewBox: "0 0 300 72", preserveAspectRatio: "none" });
    for (const l of lines) {
      let d = `M${X(l.pts[0].t).toFixed(1)} ${Y(l.pts[0].v).toFixed(1)}`;
      for (const p of l.pts.slice(1)) d += l.step ? ` H${X(p.t).toFixed(1)} V${Y(p.v).toFixed(1)}` : ` L${X(p.t).toFixed(1)} ${Y(p.v).toFixed(1)}`;
      d += ` H300`;
      if (l.area) svg.append(svgEl("path", { d: `${d} V72 H${X(l.pts[0].t).toFixed(1)} Z`, class: `area ${l.cls || ""}` }));
      svg.append(svgEl("path", { d, class: `line ${l.cls || ""}` }));
    }
    plot.replaceChildren(svg);
    range.textContent = `${fmt(hass, lo, digits)}–${fmt(hass, hi, digits)}${unit}`;
  };
  return box;
}

/** "Mehr" → Home Assistant's own dialog. */
export function moreButton(ctx, sheet, entityId, openMoreInfo) {
  const b = btn("mdi:home-assistant", t("more_short"));
  b.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, entityId); });
  return b;
}
