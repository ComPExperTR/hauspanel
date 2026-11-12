// Energy page: what the house uses now, per day / week / month / year, what it costs, solar and the biggest consumers.
// Everything comes from Home Assistant's own energy settings and long-term statistics.
import { h, icon, formatNumber, formatDate, startOfDay, addDays } from "./util.js";
import { t } from "./i18n.js";

const RANGES = ["day", "week", "month", "year"];
const REFRESH_MS = 5 * 60 * 1000;

export async function loadEnergyPrefs(ctx) {
  try {
    ctx.energyPrefsRaw = await ctx.hass.callWS({ type: "energy/get_prefs" });
  } catch {
    ctx.energyPrefsRaw = null;
  }
}

/**
 * Home Assistant's energy settings with the sensors picked in Settings → Rooms & devices → Energy:
 * pick = { grid, solar, devices: { [stat_consumption]: powerSensor | "none" } }. Neither is changed.
 */
export function withEnergyPicks(raw, pick) {
  if (!raw || !pick) return raw;
  const out = JSON.parse(JSON.stringify(raw));
  const src = out.energy_sources || [];
  const grid = src.find((x) => x.type === "grid");
  if (grid && pick.grid) {
    grid.stat_rate = pick.grid;
    if (grid.power_config) grid.power_config.stat_rate = pick.grid;
  }
  const solar = src.find((x) => x.type === "solar");
  if (solar && pick.solar) solar.stat_rate = pick.solar;
  const dev = pick.devices || {};
  out.device_consumption = (out.device_consumption || [])
    .filter((d) => dev[d.stat_consumption] !== "none")
    .map((d) => (dev[d.stat_consumption] ? { ...d, stat_rate: dev[d.stat_consumption] } : d));
  return out;
}

/** Every power sensor, for the pickers. */
export const powerSensors = (hass) => Object.keys(hass.states)
  .filter((id) => id.startsWith("sensor.") && hass.states[id].attributes.device_class === "power")
  .sort((a, b) => (hass.states[a].attributes.friendly_name || a).localeCompare(hass.states[b].attributes.friendly_name || b));

export const hasEnergy = (ctx) => !!ctx.energyPrefs?.energy_sources?.length;

/** Grid meters, solar and devices from the energy settings (old and new format). */
function sources(ctx) {
  const prefs = ctx.energyPrefs;
  const meters = [];
  for (const s of prefs.energy_sources.filter((x) => x.type === "grid")) {
    const flows = s.flow_from?.length ? s.flow_from : [s];
    flows.forEach((f, i) => {
      if (!f.stat_energy_from) return;
      meters.push({
        name: s.name || (meters.length ? t("meter_n", { n: meters.length + 1 }) : t("grid")),
        from: f.stat_energy_from,
        to: i === 0 ? (s.stat_energy_to || s.flow_to?.[0]?.stat_energy_to || null) : null,
        priceEntity: f.entity_energy_price,
        priceNumber: f.number_energy_price,
        rate: s.power_config?.stat_rate || s.stat_rate || null,
      });
    });
  }
  const solar = prefs.energy_sources.filter((x) => x.type === "solar" && x.stat_energy_from);
  const gas = prefs.energy_sources.filter((x) => x.type === "gas" && x.stat_energy_from).map((s) => ({
    from: s.stat_energy_from,
    priceEntity: s.entity_energy_price,
    priceNumber: s.number_energy_price,
    unit: ctx.hass.states[s.stat_energy_from]?.attributes.unit_of_measurement || "kWh",
  }));
  const battery = prefs.energy_sources.filter((x) => x.type === "battery").map((s) => ({
    from: s.stat_energy_from || null,
    to: s.stat_energy_to || null,
  }));
  const devices = (prefs.device_consumption || []).filter((d) => d.stat_consumption);
  // A meter without its own power sensor takes the one of the device that measures the same thing (heat pump).
  for (const m of meters) if (!m.rate) m.rate = devices.find((d) => d.stat_consumption === m.from)?.stat_rate || null;
  return { meters, solar, devices, gas, battery };
}

function price(ctx, m) {
  if (m.priceNumber != null) return Number(m.priceNumber);
  const v = Number(ctx.hass.states[m.priceEntity]?.state);
  return Number.isFinite(v) ? v : null;
}

/** Start, end, statistics period and bucket count for a range, shifted by `offset` steps into the past. */
function span(range, offset) {
  const now = new Date();
  let start;
  let end;
  let period;
  if (range === "day") {
    start = addDays(startOfDay(now), offset);
    end = addDays(start, 1);
    period = "hour";
  } else if (range === "week") {
    const d = startOfDay(now);
    start = addDays(d, -((d.getDay() + 6) % 7) + offset * 7);
    end = addDays(start, 7);
    period = "day";
  } else if (range === "month") {
    start = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
    period = "day";
  } else {
    start = new Date(now.getFullYear() + offset, 0, 1);
    end = new Date(start.getFullYear() + 1, 0, 1);
    period = "month";
  }
  const buckets = [];
  for (let d = new Date(start); d < end;) {
    buckets.push(new Date(d));
    if (period === "hour") d.setHours(d.getHours() + 1);
    else if (period === "day") d.setDate(d.getDate() + 1);
    else d.setMonth(d.getMonth() + 1);
  }
  return { start, end, period, buckets };
}

async function fetchChanges(ctx, ids, start, end, period, convert = true) {
  if (!ids.length) return {};
  const msg = {
    type: "recorder/statistics_during_period",
    start_time: start.toISOString(),
    end_time: end.toISOString(),
    statistic_ids: ids,
    period,
    types: ["change"],
  };
  // Mètres à gaz comptent souvent en m³ : on garde alors l'unité du capteur.
  if (convert) msg.units = { energy: "kWh" };
  const res = await ctx.hass.callWS(msg);
  return res || {};
}

const sum = (a) => a.reduce((x, y) => x + (y || 0), 0);

/** Per-bucket values of one statistic. */
function series(raw, id, buckets) {
  const out = new Array(buckets.length).fill(0);
  const idx = new Map(buckets.map((b, i) => [b.getTime(), i]));
  for (const row of raw[id] || []) {
    const i = idx.get(new Date(row.start).getTime());
    if (i != null) out[i] = Math.max(0, row.change || 0);
  }
  return out;
}

async function loadData(ctx, range, offset) {
  const src = sources(ctx);
  const sp = span(range, offset);
  const ids = [...new Set([...src.meters.flatMap((m) => [m.from, m.to]).filter(Boolean), ...src.solar.map((s) => s.stat_energy_from), ...src.devices.map((d) => d.stat_consumption)])];
  const now = new Date();
  // The current period is compared with the same stretch of time before it.
  const prev = span(range, offset - 1);
  const prevEnd = offset === 0 ? new Date(prev.start.getTime() + (now - sp.start)) : prev.end;
  const mainIds = [...src.meters.map((m) => m.from), ...src.meters.map((m) => m.to).filter(Boolean), ...src.solar.map((s) => s.stat_energy_from)];
  const gasIds = src.gas.map((g) => g.from);
  const [raw, rawPrev, gasRaw] = await Promise.all([
    fetchChanges(ctx, ids, sp.start, sp.end, sp.period),
    fetchChanges(ctx, mainIds, prev.start, prevEnd, sp.period),
    gasIds.length ? fetchChanges(ctx, gasIds, sp.start, sp.end, sp.period, false) : Promise.resolve({}),
  ]);
  // Gas stays in the unit of its sensor (m³ for most meters).
  const withGas = (r) => (gasIds.length ? { ...r, ...Object.fromEntries(gasIds.map((id) => [id, gasRaw[id] || []])) } : r);
  const totals = (r, buckets) => {
    const imp = src.meters.map((m) => series(r, m.from, buckets));
    const exp = series(r, src.meters[0]?.to, buckets);
    const sol = src.solar.reduce((acc, s) => series(r, s.stat_energy_from, buckets).map((v, i) => v + (acc[i] || 0)), []);
    const self = buckets.map((_, i) => Math.max(0, (sol[i] || 0) - exp[i]));
    const gasKwh = src.gas.map((g) => series(r, g.from, buckets));
    const battCharge = src.battery.map((b) => (b.to ? series(r, b.to, buckets) : buckets.map(() => 0)));
    const battDischarge = src.battery.map((b) => (b.from ? series(r, b.from, buckets) : buckets.map(() => 0)));
    return { imp, exp, sol, self, gas: gasKwh, battCharge, battDischarge, use: sum(imp.map(sum)) + sum(self) };
  };
  const cur = totals(withGas(raw), sp.buckets);
  const before = totals(withGas(rawPrev), prev.buckets);
  const devices = src.devices.map((d) => ({
    id: d.stat_consumption,
    name: d.name || ctx.hass.states[d.stat_consumption]?.attributes.friendly_name?.replace(/\s*(Energie|Energy|Energieverbrauch|energy consumed)$/i, "") || d.stat_consumption,
    rate: d.stat_rate,
    kwh: sum(series(raw, d.stat_consumption, sp.buckets)),
  })).filter((d) => d.kwh > 0.005).sort((a, b) => b.kwh - a.kwh);
  return { src, sp, cur, before, devices };
}

// ---------------------------------------------------------------- drawing

function kwh(ctx, v) {
  return `${formatNumber(ctx.hass, v, v < 10 ? 2 : v < 100 ? 1 : 0)} kWh`;
}

function money(ctx, v) {
  const cur = ctx.hass.config?.currency || "EUR";
  try {
    return new Intl.NumberFormat(ctx.hass.locale?.language || ctx.hass.language, { style: "currency", currency: cur }).format(v);
  } catch {
    return `${v.toFixed(2)} ${cur}`;
  }
}

function watts(ctx, st) {
  const v = Number(st?.state);
  if (!st || !Number.isFinite(v)) return "–";
  const unit = st.attributes.unit_of_measurement;
  const w = unit === "kW" ? v * 1000 : unit === "MW" ? v * 1e6 : v;
  return Math.abs(w) >= 1000 ? `${formatNumber(ctx.hass, w / 1000, 2)} kW` : `${formatNumber(ctx.hass, w, 0)} W`;
}

function card(cls, ic, label, big, sub) {
  return h("div", { class: `hp-card hp-en-card ${cls}` },
    h("div", { class: "hp-card-label" }, h("div", { class: "hp-tile-icon" }, icon(ic)), label),
    h("div", { class: "hp-en-big" }, big),
    sub ? h("div", { class: "hp-sub" }, sub) : null);
}

const COLORS = ["var(--hp-accent)", "#7fb4e8", "#c79be8", "#e89b9b"];
const SOLAR = "var(--hp-green)";

function chart(ctx, data, range) {
  const { sp, cur, src } = data;
  const stacks = sp.buckets.map((_, i) => [...cur.imp.map((s) => s[i]), cur.self[i]]);
  const max = Math.max(0.001, ...stacks.map(sum));
  const info = h("div", { class: "hp-en-info" });
  const label = (d) => (range === "day" ? `${String(d.getHours()).padStart(2, "0")}:00`
    : range === "year" ? formatDate(ctx.hass, d, { month: "short" })
      : formatDate(ctx.hass, d, { weekday: range === "week" ? "short" : undefined, day: "numeric", month: range === "month" ? "short" : undefined }));
  // Bars are plain boxes (not a stretched picture), so they keep their shape at any width.
  const bars = h("div", { class: "hp-en-bars" });
  const cols = [];
  const showInfo = (i) => {
    cols.forEach((c, k) => c.classList.toggle("active", k === i));
    const parts = [...src.meters.map((m, k) => [m.name, cur.imp[k][i]]), [t("solar"), cur.self[i]]].filter(([, v]) => v > 0.005);
    info.replaceChildren(h("b", {}, label(sp.buckets[i])), h("span", {}, kwh(ctx, sum(stacks[i]))),
      ...parts.map(([nm, v]) => h("small", {}, `${nm} ${formatNumber(ctx.hass, v, 2)}`)));
  };
  stacks.forEach((st, i) => {
    const stack = h("div", { class: "hp-en-stack", style: { height: `${(sum(st) / max) * 100}%` } });
    st.forEach((v, k) => {
      if (v <= 0) return;
      stack.append(h("i", { style: { flexGrow: String(v), background: k === st.length - 1 ? SOLAR : COLORS[k % COLORS.length] } }));
    });
    const col = h("div", { class: "hp-en-col" }, stack);
    col.addEventListener("pointerenter", () => showInfo(i));
    col.addEventListener("click", () => showInfo(i));
    cols.push(col);
    bars.append(col);
  });
  // A few labels along the bottom.
  const every = range === "day" ? 3 : range === "month" ? 5 : 1;
  const axis = h("div", { class: "hp-en-axis" }, sp.buckets.map((d, i) => h("span", {}, i % every ? "" :
    range === "day" ? String(d.getHours()) : range === "year" ? formatDate(ctx.hass, d, { month: "narrow" }) : range === "week" ? formatDate(ctx.hass, d, { weekday: "short" }) : String(d.getDate()))));
  const legend = h("div", { class: "hp-en-legend" },
    ...src.meters.map((m, k) => h("span", {}, h("i", { style: { background: COLORS[k % COLORS.length] } }), m.name)),
    src.solar.length ? h("span", {}, h("i", { style: { background: SOLAR } }), t("solar_self")) : null);
  const last = [...stacks.keys()].reverse().find((i) => sum(stacks[i]) > 0);
  if (last != null) showInfo(last);
  return h("div", { class: "hp-card hp-en-chart" }, h("div", { class: "hp-en-chart-head" }, legend, info), bars, axis);
}

function consumers(ctx, data, mainPrice) {
  const { devices, cur } = data;
  const top = devices.slice(0, 12);
  const max = Math.max(0.001, ...top.map((d) => d.kwh));
  const rest = cur.use - sum(devices.map((d) => d.kwh));
  const rows = top.map((d) => {
    const live = h("small", { class: "hp-en-live" });
    const row = h("div", { class: "hp-en-row" },
      h("div", { class: "hp-en-row-top" }, h("b", {}, d.name), live, h("span", {}, kwh(ctx, d.kwh)), mainPrice != null ? h("small", {}, money(ctx, d.kwh * mainPrice)) : null),
      h("div", { class: "hp-en-bar" }, h("i", { style: { width: `${(d.kwh / max) * 100}%` } })));
    row.update = (hass) => {
      const txt = d.rate && hass.states[d.rate] ? watts(ctx, hass.states[d.rate]) : "";
      if (live.textContent !== txt) live.textContent = txt;
    };
    row.update(ctx.hass);
    ctx.live.push(row);
    return row;
  });
  return h("div", { class: "hp-card hp-en-list" },
    h("div", { class: "hp-label" }, icon("mdi:format-list-numbered"), t("top_consumers")),
    ...(rows.length ? rows : [h("div", { class: "hp-muted small" }, t("no_data"))]),
    rest > 0.05 ? h("div", { class: "hp-en-rest" }, h("span", {}, t("not_measured")), h("span", {}, kwh(ctx, rest))) : null);
}

function liveRow(ctx, src) {
  const items = [];
  const main = src.meters[0];
  if (main?.rate) items.push({ ic: "mdi:home-lightning-bolt-outline", label: t("house_now"), id: main.rate });
  for (const s of src.solar) if (s.stat_rate) items.push({ ic: "mdi:solar-power-variant-outline", label: s.name || t("solar"), id: s.stat_rate, solar: true });
  for (const m of src.meters.slice(1)) if (m.rate) items.push({ ic: "mdi:heat-pump-outline", label: m.name, id: m.rate });
  if (!items.length) return null;
  const row = h("div", { class: "hp-en-now" });
  const els = items.map((it) => {
    const val = h("b", {});
    const el = h("div", { class: `hp-en-now-item ${it.solar ? "solar" : ""}` }, icon(it.ic), h("div", {}, h("small", {}, it.label), val));
    el.val = val;
    row.append(el);
    return el;
  });
  row.update = (hass) => items.forEach((it, i) => {
    const txt = watts(ctx, hass.states[it.id]);
    if (els[i].val.textContent !== txt) els[i].val.textContent = txt;
    els[i].classList.toggle("active", Number(hass.states[it.id]?.state) > 0);
  });
  row.update(ctx.hass);
  ctx.live.push(row);
  // Its own part above Day/Week/Month, so the watts are not read as the day's numbers.
  return h("section", { class: "hp-en-live-sec" },
    h("div", { class: "hp-en-live-head" }, h("i", { class: "hp-en-pulse" }), h("span", {}, t("power_live")), h("small", {}, t("power_live_hint"))), row);
}

function rangeTitle(ctx, range, sp, offset) {
  if (range === "day") return offset === 0 ? t("today") : offset === -1 ? t("yesterday") : formatDate(ctx.hass, sp.start, { weekday: "short", day: "numeric", month: "short" });
  if (range === "week") return offset === 0 ? t("this_week") : `${formatDate(ctx.hass, sp.start, { day: "numeric", month: "short" })} – ${formatDate(ctx.hass, addDays(sp.end, -1), { day: "numeric", month: "short" })}`;
  if (range === "month") return formatDate(ctx.hass, sp.start, { month: "long", year: "numeric" });
  return String(sp.start.getFullYear());
}

/** The page. Keeps its range and step on ctx so a redraw stays where it was. */
export function energyView(ctx) {
  const st = (ctx._energy ||= { range: "day", offset: 0 });
  const root = h("div", { class: "hp-energy" });
  const body = h("div", { class: "hp-en-body" }, h("div", { class: "hp-muted small" }, t("loading")));
  const seg = h("div", { class: "hp-seg" }, RANGES.map((r) => {
    const b = h("button", { class: st.range === r ? "active" : "" }, t(`range_${r}`));
    b.addEventListener("click", () => { st.range = r; st.offset = 0; draw(); });
    return b;
  }));
  const title = h("b", { class: "hp-en-title" });
  const prevB = h("button", { class: "hp-round", "aria-label": t("previous") }, icon("mdi:chevron-left"));
  const nextB = h("button", { class: "hp-round", "aria-label": t("next") }, icon("mdi:chevron-right"));
  prevB.addEventListener("click", () => { st.offset--; draw(); });
  nextB.addEventListener("click", () => { if (st.offset < 0) { st.offset++; draw(); } });
  const src = sources(ctx);
  const liveSec = liveRow(ctx, src);
  root.append(...[liveSec, h("div", { class: `hp-en-bar-top ${liveSec ? "after-live" : ""}` }, seg, h("div", { class: "hp-en-nav" }, prevB, title, nextB)), body].filter(Boolean));

  let seq = 0;
  async function draw() {
    const my = ++seq;
    seg.querySelectorAll("button").forEach((b, i) => b.classList.toggle("active", RANGES[i] === st.range));
    nextB.disabled = st.offset >= 0;
    title.textContent = rangeTitle(ctx, st.range, span(st.range, st.offset), st.offset);
    body.classList.add("loading");
    let data;
    try {
      data = await loadData(ctx, st.range, st.offset);
    } catch (e) {
      if (my === seq) body.replaceChildren(h("div", { class: "hp-empty small" }, t("no_data")));
      return;
    }
    if (my !== seq || !root.isConnected && seq > 1) return;
    body.classList.remove("loading");
    const { cur, before, src: s } = data;
    const mainPrice = s.meters.length ? price(ctx, s.meters[0]) : null;
    const meterKwh = cur.imp.map(sum);
    const cost = sum(s.meters.map((m, i) => (price(ctx, m) ?? 0) * meterKwh[i]));
    const solar = sum(cur.sol);
    const exported = sum(cur.exp);
    const self = sum(cur.self);
    const diff = before.use > 0.05 ? (cur.use - before.use) / before.use : null;
    const cmp = diff == null ? null : t(st.range === "day" ? "vs_yesterday" : "vs_before", { p: `${diff > 0 ? "+" : "−"}${formatNumber(ctx.hass, Math.abs(diff * 100), 0)} %` });
    const cards = [
      card("use", "mdi:lightning-bolt-outline", t("consumption"), kwh(ctx, cur.use), cmp),
      card("cost", "mdi:currency-eur", t("costs"), money(ctx, cost), mainPrice != null ? `${money(ctx, mainPrice)}/kWh` : null),
    ];
    if (s.solar.length) {
      cards.push(card("solar", "mdi:solar-power-variant-outline", t("solar"), kwh(ctx, solar), exported > 0.01 ? t("fed_in", { v: kwh(ctx, exported) }) : null));
      cards.push(card("auto", "mdi:leaf", t("self_sufficiency"), `${formatNumber(ctx.hass, cur.use > 0 ? (self / cur.use) * 100 : 0, 0)} %`, t("own_solar", { v: kwh(ctx, self) })));
    }
    if (s.gas.length) {
      const g = s.gas[0];
      const gasTotal = sum(cur.gas[0] || []);
      const gasText = /kwh/i.test(g.unit) ? kwh(ctx, gasTotal) : `${formatNumber(ctx.hass, gasTotal, gasTotal < 10 ? 2 : 1)} ${g.unit}`;
      const gasCost = (price(ctx, g) ?? 0) * gasTotal;
      cards.push(card("gas", "mdi:fire", t("gas"), gasText, gasCost > 0 ? money(ctx, gasCost) : null));
    }
    if (s.battery.length) {
      const ch = sum(cur.battCharge.map(sum));
      const dis = sum(cur.battDischarge.map(sum));
      cards.push(card("battery", "mdi:battery-charging-outline", t("battery"), kwh(ctx, dis), t("charged", { v: kwh(ctx, ch) })));
    }
    if (s.meters.length > 1) {
      s.meters.forEach((m, i) => cards.push(card(`meter m${i}`, i === 0 ? "mdi:home-lightning-bolt-outline" : "mdi:heat-pump-outline", m.name, kwh(ctx, meterKwh[i]),
        price(ctx, m) != null ? money(ctx, meterKwh[i] * price(ctx, m)) : null)));
    }
    body.replaceChildren(h("div", { class: "hp-en-cards" }, cards), chart(ctx, data, st.range), consumers(ctx, data, mainPrice));
  }
  draw();
  // Fresh numbers every few minutes while the page is open.
  const timer = setInterval(() => (root.isConnected ? st.offset === 0 && draw() : clearInterval(timer)), REFRESH_MS);
  return root;
}
