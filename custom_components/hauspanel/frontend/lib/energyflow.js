// Energy popup: power flowing from the grid and the solar roof into the house as moving dots,
// today's use and cost, and the devices that draw the most right now.
import { h, icon } from "./util.js";
import { openSheet } from "./dialogs.js";
import { meterSensors, watts, formatWatts, deviceName } from "./usage.js";
import { t } from "./i18n.js";
import { svgEl, stat, fmt } from "./popkit.js";
import { openSolar } from "./solar.js";
import { wallboxes, openWallbox } from "./wallbox.js";

const NODES = { solar: [56, 44], grid: [56, 156], home: [262, 100] };
const path = (a, b) => {
  const [x1, y1] = NODES[a];
  const [x2, y2] = NODES[b];
  return `M${x1 + 26} ${y1} C${(x1 + x2) / 2} ${y1}, ${(x1 + x2) / 2} ${y2}, ${x2 - 30} ${y2}`;
};

async function todayChange(hass, id) {
  if (!id) return null;
  try {
    const r = await hass.callWS({ type: "recorder/statistic_during_period", statistic_id: id, calendar: { period: "day" }, types: ["change"], units: { energy: "kWh" } });
    return Number.isFinite(r?.change) ? r.change : null;
  } catch { return null; }
}

export function openEnergyFlow(ctx, rate) {
  const hass = ctx.hass;
  const prefs = ctx.energyPrefs || {};
  const grid = (prefs.energy_sources || []).find((x) => x.type === "grid");
  const solar = (prefs.energy_sources || []).find((x) => x.type === "solar");
  const solarRate = solar?.stat_rate || null;
  const priceId = grid?.entity_energy_price;
  const priceNum = grid?.number_energy_price;

  const svg = svgEl("svg", { viewBox: "0 0 320 200", class: "hp-ef-svg" });
  const lines = {};
  const mkLine = (k, from, to) => {
    const base = svgEl("path", { d: path(from, to), class: "base" });
    const flow = svgEl("path", { d: path(from, to), class: `flow ${k}` });
    svg.append(base, flow);
    lines[k] = flow;
  };
  if (solarRate) mkLine("solar", "solar", "home");
  mkLine("grid", "grid", "home");
  const node = (k, ic, label) => {
    const [x, y] = NODES[k];
    const g = svgEl("g", { class: `node ${k}`, transform: `translate(${x} ${y})` });
    g.append(svgEl("circle", { r: k === "home" ? 32 : 26 }));
    const txt = svgEl("text", { y: k === "home" ? 50 : 42, class: "val" });
    const lab = svgEl("text", { y: k === "home" ? -40 : -33, class: "lab" });
    lab.textContent = label;
    g.append(txt, lab);
    svg.append(g);
    const ic2 = h("div", { class: `hp-ef-ic ${k}` }, icon(ic));
    ic2.style.left = `${(x / 320) * 100}%`;
    ic2.style.top = `${(y / 200) * 100}%`;
    return { g, txt, ic: ic2 };
  };
  const nSolar = solarRate ? node("solar", "mdi:solar-power-variant", t("solar")) : null;
  const nGrid = node("grid", "mdi:transmission-tower", t("grid"));
  const nHome = node("home", "mdi:home-lightning-bolt", t("ef_house"));
  const stage = h("div", { class: "hp-ef-stage" }, svg, ...[nSolar, nGrid, nHome].filter(Boolean).map((n) => n.ic));

  const sUse = stat("mdi:home-import-outline", t("ef_today_grid"));
  const sCost = stat("mdi:currency-eur", t("ef_today_cost"));
  const sSun = solarRate ? stat("mdi:white-balance-sunny", t("ef_today_solar")) : null;
  const stats = h("div", { class: "hp-app-stats" }, sUse, sCost, ...(sSun ? [sSun] : []));

  const devices = (prefs.device_consumption || []).map((d) => ({
    name: d.name || deviceName(hass, d.stat_consumption),
    power: d.stat_rate || meterSensors(hass, d.stat_consumption).power,
  })).filter((d) => d.power);
  const list = h("div", { class: "hp-ef-list" });

  const sheet = openSheet(ctx, { title: t("energy"), cls: "appliance energyflow" });
  const page = h("button", { class: "hp-btn ghost" }, icon("mdi:chart-bar"), h("span", {}, t("open_energy_page")));
  page.addEventListener("click", () => { sheet.close(); ctx.goTab("energy"); });
  // The solar node opens the solar popup; wallboxes get a button.
  if (nSolar) {
    nSolar.ic.style.pointerEvents = "auto";
    nSolar.ic.style.cursor = "pointer";
    nSolar.ic.addEventListener("click", () => openSolar(ctx));
  }
  const solB = solarRate ? h("button", { class: "hp-btn ghost" }, icon("mdi:solar-power-variant"), h("span", {}, t("solar"))) : null;
  solB?.addEventListener("click", () => openSolar(ctx));
  const wbs = wallboxes(hass);
  const wbB = wbs.length ? h("button", { class: "hp-btn ghost" }, icon("mdi:ev-station"), h("span", {}, t("wb_title"))) : null;
  wbB?.addEventListener("click", () => openWallbox(ctx, wbs[0]));
  sheet.body.append(stage, stats, h("div", { class: "hp-label hp-ef-label" }, t("using_now")), list, h("div", { class: "hp-sheet-actions hp-app-foot" }, ...[solB, wbB, page].filter(Boolean)));

  const speed = (w) => `${Math.max(0.6, Math.min(6, 6 - Math.log10(Math.max(1, Math.abs(w))) * 1.4)).toFixed(2)}s`;
  const update = (hs) => {
    const g = watts(hs, rate) ?? 0;
    const s = solarRate ? Math.max(0, watts(hs, solarRate) ?? 0) : 0;
    const home = Math.max(0, g + s);
    nGrid.txt.textContent = g < -5 ? `↑ ${formatWatts(hs, -g)}` : formatWatts(hs, Math.max(0, g));
    nHome.txt.textContent = formatWatts(hs, home);
    if (nSolar) nSolar.txt.textContent = formatWatts(hs, s);
    lines.grid.classList.toggle("off", Math.abs(g) < 5);
    lines.grid.classList.toggle("export", g < -5);
    lines.grid.style.animationDuration = speed(g);
    if (lines.solar) {
      lines.solar.classList.toggle("off", s < 5);
      lines.solar.style.animationDuration = speed(s);
    }
    stage.classList.toggle("exporting", g < -5);
    const now = devices.map((d) => ({ ...d, w: watts(hs, d.power) })).filter((d) => d.w > 1).sort((a, b) => b.w - a.w).slice(0, 8);
    const top = now[0]?.w || 1;
    list.replaceChildren(...now.map((d) => {
      const el = h("div", { class: "hp-ef-row", role: "button", tabindex: "0" },
        h("span", { class: "name" }, d.name), h("b", {}, formatWatts(hs, d.w)), h("div", { class: "bar" }, h("i", { style: { width: `${(d.w / top) * 100}%` } })));
      el.addEventListener("click", () => ctx.openDetails(d.power));
      return el;
    }));
    if (!now.length) list.append(h("div", { class: "hp-qempty" }, devices.length ? t("nothing_running") : t("no_energy_devices")));
  };
  update(hass);
  sheet.updaters.push(update);

  (async () => {
    const [imp, sun] = await Promise.all([todayChange(hass, grid?.stat_energy_from), todayChange(hass, solar?.stat_energy_from)]);
    const price = priceId ? Number(hass.states[priceId]?.state) : priceNum;
    sUse.set(imp != null ? `${fmt(hass, imp, 1)} kWh` : "–");
    sCost.set(imp != null && Number.isFinite(price) ? `${fmt(hass, imp * price, 2)} €` : "–");
    sSun?.set(sun != null ? `${fmt(hass, sun, 1)} kWh` : "–");
  })();
}
