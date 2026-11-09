// Popups behind the status chips on Home: lights that are on, thermostats, security and power.
import { h, icon, entityName, formatNumber, toggleSwitch } from "./util.js";
import { isOn, hideMatcher } from "./model.js";
import { entityIcon } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { meterSensors, watts, formatWatts, deviceName } from "./usage.js";
import { t } from "./i18n.js";

const roomOf = (ctx, id) => ctx.model.areaById.get(ctx.model.areaOf[id])?.name || "";

/** One line: icon, name and room, something on the right; a tap opens the device. */
function listRow(ctx, id, right) {
  const ic = icon(entityIcon(ctx.hass, ctx.hass.states[id]));
  const sub = h("small", {});
  const el = h("div", { class: "hp-qrow", role: "button", tabindex: "0" },
    h("span", { class: "hp-qrow-ic" }, ic),
    h("div", { class: "hp-qrow-text" }, h("b", {}, entityName(ctx.hass, id, roomOf(ctx, id))), sub),
    right || null);
  el.addEventListener("click", (e) => {
    if (e.target.closest(".hp-toggle")) return;
    ctx.openDetails(id);
  });
  el.sub = sub;
  el.ic = ic;
  return el;
}

const empty = (text) => h("div", { class: "hp-qempty" }, text);

/** Lights that are on (and those switched on while the popup is open), each with a switch. */
export function openLightSheet(ctx, lights) {
  const sheet = openSheet(ctx, { title: t("cat_light"), cls: "qsheet" });
  const shown = new Set(lights().filter((id) => isOn(ctx.hass.states[id])));
  const list = h("div", { class: "hp-qlist" });
  const offAll = h("button", { class: "hp-btn solid" }, icon("mdi:power"), t("all_lights_off_btn"));
  offAll.addEventListener("click", () => ctx.hass.callService("light", "turn_off", { entity_id: lights() }));
  const draw = (hass) => {
    for (const id of lights()) if (isOn(hass.states[id])) shown.add(id);
    const ids = [...shown].sort((a, b) => roomOf(ctx, a).localeCompare(roomOf(ctx, b)) || a.localeCompare(b));
    const on = ids.filter((id) => isOn(hass.states[id])).length;
    sheet.el.querySelector(".hp-sheet-sub")?.replaceChildren(on ? t("n_on", { n: on }) : t("all_off"));
    list.replaceChildren(...ids.map((id) => {
      const st = hass.states[id];
      const sw = toggleSwitch(isOn(st), () => hass.callService("light", "toggle", { entity_id: id }));
      const row = listRow(ctx, id, sw);
      const b = st?.attributes.brightness;
      row.sub.textContent = [roomOf(ctx, id), isOn(st) ? (b ? `${Math.round((b / 255) * 100)} %` : t("on")) : t("off")].filter(Boolean).join(" · ");
      row.classList.toggle("on", isOn(st));
      return row;
    }));
    if (!ids.length) list.append(empty(t("no_lights_on")));
    offAll.hidden = !on;
  };
  if (!sheet.el.querySelector(".hp-sheet-sub")) sheet.el.querySelector(".hp-sheet-titles").append(h("div", { class: "hp-sheet-sub" }));
  sheet.body.append(list, h("div", { class: "hp-sheet-actions" }, offAll));
  draw(ctx.hass);
  sheet.updaters.push(draw);
}

/** Every thermostat: room, temperature now and target; the ones heating first. */
export function openClimateSheet(ctx, climates) {
  const heats = (hass, id) => ["heating", "preheating"].includes(hass.states[id]?.attributes.hvac_action);
  const cools = (hass, id) => hass.states[id]?.attributes.hvac_action === "cooling";
  const ids = [...climates].sort((a, b) => (heats(ctx.hass, b) - heats(ctx.hass, a)) || roomOf(ctx, a).localeCompare(roomOf(ctx, b)));
  const sheet = openSheet(ctx, { title: t("climate"), cls: "qsheet" });
  const sub = h("div", { class: "hp-sheet-sub" });
  sheet.el.querySelector(".hp-sheet-titles").append(sub);
  const rows = ids.map((id) => {
    const temp = h("span", { class: "hp-qrow-val" });
    const row = listRow(ctx, id, temp);
    row.temp = temp;
    return row;
  });
  const list = h("div", { class: "hp-qlist" }, rows);
  const num = (v) => (Number.isFinite(Number(v)) && v !== null ? formatNumber(ctx.hass, Number(v), 1) : null);
  const draw = (hass) => {
    rows.forEach((row, i) => {
      const id = ids[i];
      const a = hass.states[id]?.attributes || {};
      const cur = num(a.current_temperature);
      const target = num(a.temperature ?? a.target_temp_low);
      row.temp.textContent = [cur ? `${cur}°` : null, target ? `→ ${target}°` : null].filter(Boolean).join(" ");
      row.sub.textContent = [roomOf(ctx, id), heats(hass, id) ? t("heating_now") : cools(hass, id) ? t("cooling_now") : hass.states[id]?.state === "off" ? t("off") : null].filter(Boolean).join(" · ");
      row.classList.toggle("heating", heats(hass, id));
      row.classList.toggle("cooling", cools(hass, id));
    });
    const n = ids.filter((id) => heats(hass, id)).length;
    sub.textContent = n ? t("n_heating", { n }) : t("n_devices", { n: ids.length });
  };
  sheet.body.append(list);
  draw(ctx.hass);
  sheet.updaters.push(draw);
}

/** Power from the grid now and the devices drawing the most right now. */
export function openEnergySheet(ctx, rate) {
  const sheet = openSheet(ctx, { title: t("energy"), cls: "qsheet" });
  const big = h("div", { class: "hp-qbig" });
  const list = h("div", { class: "hp-qlist" });
  // Devices from Home Assistant's energy settings, with their power sensor (set there or found on the device).
  const devices = (ctx.energyPrefs?.device_consumption || []).map((d) => ({
    name: d.name || deviceName(ctx.hass, d.stat_consumption),
    power: d.stat_rate || meterSensors(ctx.hass, d.stat_consumption).power,
    id: d.stat_rate || d.stat_consumption,
  })).filter((d) => d.power);
  const draw = (hass) => {
    big.replaceChildren(h("small", {}, t("power_now")), h("b", {}, formatWatts(hass, watts(hass, rate))));
    const now = devices.map((d) => ({ ...d, w: watts(hass, d.power) })).filter((d) => d.w > 1).sort((a, b) => b.w - a.w).slice(0, 10);
    list.replaceChildren(...now.map((d) => {
      const el = h("div", { class: "hp-qrow", role: "button", tabindex: "0" },
        h("span", { class: "hp-qrow-ic" }, icon("mdi:power-plug-outline")),
        h("div", { class: "hp-qrow-text" }, h("b", {}, d.name)),
        h("span", { class: "hp-qrow-val" }, formatWatts(hass, d.w)));
      el.addEventListener("click", () => ctx.openDetails(d.power));
      return el;
    }));
    if (!now.length) list.append(empty(devices.length ? t("nothing_running") : t("no_energy_devices")));
  };
  const page = h("button", { class: "hp-btn ghost" }, icon("mdi:chart-bar"), t("open_energy_page"));
  page.addEventListener("click", () => { sheet.close(); ctx.goTab("energy"); });
  sheet.body.append(big, h("div", { class: "hp-label" }, icon("mdi:format-list-numbered"), t("using_now")), list,
    h("div", { class: "hp-sheet-actions" }, page));
  draw(ctx.hass);
  sheet.updaters.push(draw);
}

/** What needs looking after: low batteries and devices that are gone. Platforms hidden in HausPanel are left out. */
export function maintenanceItems(ctx, hass, now = Date.now()) {
  // Anything hidden in HausPanel (by rule or by hand) was put aside on purpose and does not count.
  const hiddenRule = hideMatcher(hass, ctx.settings.s.hide);
  const shown = new Set(ctx.model.all);
  const skip = (id) => !!hiddenRule(id) || !shown.has(id) && !(hass.states[id]?.attributes.device_class === "battery");
  const batteries = [];
  const seenDev = new Set();
  const byDev = new Map();
  for (const [id, st] of Object.entries(hass.states)) {
    const reg = hass.entities?.[id];
    if (skip(id) || reg?.hidden) continue;
    const dc = st.attributes.device_class;
    if (dc === "battery") {
      const low = id.startsWith("binary_sensor.") ? st.state === "on"
        : id.startsWith("sensor.") && st.attributes.unit_of_measurement === "%" && Number.isFinite(Number(st.state)) && Number(st.state) <= 20;
      const dev = reg?.device_id || id;
      if (low && !seenDev.has(dev) && !(ctx.settings.s.maintIgnore || []).includes(dev)) {
        seenDev.add(dev);
        batteries.push(id);
      }
    }
    if (reg?.device_id && !reg.entity_category) {
      if (!byDev.has(reg.device_id)) byDev.set(reg.device_id, []);
      byDev.get(reg.device_id).push(id);
    }
  }
  const ignored = new Set(ctx.settings.s.maintIgnore || []);
  const offline = [...byDev.entries()].filter(([dev]) => !ignored.has(dev)).filter(([, ids]) => ids.every((id) => hass.states[id].state === "unavailable")).map(([dev, ids]) => ({ dev, id: ids[0] }));
  const offlineDev = new Set(offline.map((o) => o.dev));
  const { silent, consumables } = quietAndWorn(hass, { skip: (id) => skip(id) || !!hass.entities?.[id]?.hidden, ignored, offlineDev, now });
  return { batteries, offline, silent, consumables, count: batteries.length + offline.length + silent.length + consumables.length };
}

/** Sensors that report on their own every few minutes to hours: silent for two days means something is wrong. */
const CHATTY = new Set(["temperature", "humidity", "battery", "illuminance", "pressure", "carbon_dioxide", "voltage"]);
export const SILENT_HOURS = 48;
/** Filters, brushes, mops, dust bags, water filters, toner and ink. */
const WORN = /filter|brush|b(ü|ue)rste|mop|wischtuch|wischpad|dust_?bag|staubbeutel|toner|ink\b|tinte|cartridge|patrone|sensor_dirty|sensor_verschmutz/i;

/**
 * Devices that went quiet (a chatty sensor with no news for SILENT_HOURS, though not unavailable) and
 * consumables that are nearly used up (10 % or less left). One entry per device; ignored devices stay out.
 */
export function quietAndWorn(hass, { skip = () => false, ignored = new Set(), offlineDev = new Set(), now = Date.now() } = {}) {
  const silent = [];
  const consumables = [];
  const seenQuiet = new Set();
  const seenWorn = new Set();
  for (const [id, st] of Object.entries(hass.states)) {
    if (!id.startsWith("sensor.") || skip(id)) continue;
    const reg = hass.entities?.[id];
    const dev = reg?.device_id || id;
    if (ignored.has(dev) || offlineDev.has(dev)) continue;
    const a = st.attributes;
    if (["unavailable", "unknown"].includes(st.state)) continue;
    const seen = Date.parse(st.last_updated || st.last_changed || "");
    if (CHATTY.has(a.device_class) && Number.isFinite(seen) && now - seen > SILENT_HOURS * 3600e3 && !seenQuiet.has(dev)) {
      seenQuiet.add(dev);
      silent.push({ id, dev, since: seen });
    }
    const v = Number(st.state);
    if (a.unit_of_measurement === "%" && a.device_class !== "battery" && Number.isFinite(v) && v <= 10
      && WORN.test(`${id} ${a.friendly_name || ""}`) && !seenWorn.has(`${dev}|${id}`)) {
      seenWorn.add(`${dev}|${id}`);
      consumables.push({ id, dev, left: v });
    }
  }
  return { silent, consumables };
}

/** Maintenance popup: batteries and offline devices, each opens its device in Home Assistant. */
export function openMaintenanceSheet(ctx) {
  const sheet = openSheet(ctx, { title: t("maintenance"), cls: "qsheet" });
  const body = h("div", {});
  const devName = (dev) => {
    const d = ctx.hass.devices?.[dev];
    return d?.name_by_user || d?.name || dev;
  };
  const draw = (hass) => {
    const m = maintenanceItems(ctx, hass);
    const parts = [];
    const block = (title, rows) => rows.length && parts.push(h("div", { class: "hp-set-title" }, `${title} · ${rows.length}`), h("div", { class: "hp-qlist" }, rows));
    block(t("maint_batteries"), m.batteries.map((id) => {
      const st = hass.states[id];
      const r = listRow(ctx, id, h("span", { class: "hp-qval warn" }, id.startsWith("sensor.") ? `${formatNumber(hass, st.state, 0)} %` : t("low")));
      r.ic.icon = "mdi:battery-alert-variant-outline";
      const dev = hass.entities?.[id]?.device_id;
      if (dev) r.querySelector("b").textContent = devName(dev);
      r.dataset.dev = dev || id;
      r.sub.textContent = roomOf(ctx, id);
      return r;
    }));
    block(t("maint_offline"), m.offline.map(({ dev, id }) => {
      const r = listRow(ctx, id, h("span", { class: "hp-qval" }, t("unavailable")));
      r.ic.icon = "mdi:lan-disconnect";
      r.dataset.dev = dev;
      r.querySelector("b").textContent = devName(dev);
      const area = ctx.hass.areas?.[ctx.hass.devices?.[dev]?.area_id]?.name;
      r.sub.textContent = area || "";
      return r;
    }));
    block(t("maint_silent"), m.silent.map(({ dev, id, since }) => {
      const days = Math.max(2, Math.floor((Date.now() - since) / 86400e3));
      const r = listRow(ctx, id, h("span", { class: "hp-qval" }, t("maint_days", { n: days })));
      r.ic.icon = "mdi:signal-off";
      r.dataset.dev = dev;
      if (hass.devices?.[dev]) r.querySelector("b").textContent = devName(dev);
      r.sub.textContent = roomOf(ctx, id);
      return r;
    }));
    block(t("maint_worn"), m.consumables.map(({ dev, id, left }) => {
      const r = listRow(ctx, id, h("span", { class: "hp-qval warn" }, `${formatNumber(hass, left, 0)} %`));
      r.ic.icon = "mdi:filter-remove-outline";
      r.dataset.dev = dev;
      const dn = hass.devices?.[dev] ? devName(dev) : "";
      r.sub.textContent = [dn, roomOf(ctx, id)].filter(Boolean).join(" · ");
      return r;
    }));
    // Each row can be put aside for good (a pool pump in winter, say).
    const ignoreBtn = (row, dev) => {
      const b = h("button", { class: "hp-round ghost small", "aria-label": t("maint_ignore"), title: t("maint_ignore") }, icon("mdi:eye-off-outline"));
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.settings.update((x) => { x.maintIgnore = [...new Set([...(x.maintIgnore || []), dev])]; });
        row.remove();
        last = 0;
        setTimeout(() => draw(ctx.hass), 300);
      });
      row.append(b);
    };
    for (const p of parts) for (const r of p.querySelectorAll?.("[data-dev]") || []) ignoreBtn(r, r.dataset.dev);
    if (!parts.length) parts.push(empty(t("maint_all_good")));
    const nIgnored = (ctx.settings.s.maintIgnore || []).length;
    if (nIgnored) {
      const reset = h("button", { class: "hp-chip" }, icon("mdi:eye-outline"), t("maint_ignored_n", { n: nIgnored }));
      reset.addEventListener("click", () => {
        ctx.settings.update((x) => { x.maintIgnore = []; });
        setTimeout(() => draw(ctx.hass), 300);
      });
      parts.push(h("div", { class: "hp-set-row-end" }, reset));
    }
    body.replaceChildren(...parts);
  };
  let last = 0;
  draw(ctx.hass);
  sheet.body.append(body);
  sheet.updaters.push((hass) => {
    if (Date.now() - last < 5000) return;
    last = Date.now();
    draw(hass);
  });
}
