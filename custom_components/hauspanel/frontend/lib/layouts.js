// Layouts and the building blocks they share: home status, scenes, room cards, room view, room menu.
import { h, icon, formatNumber, formatTime, formatDate, bindTapHold, domainOf, isUnlocked, entityName } from "./util.js";
import { isOn, roomPresence, roomHasContent } from "./model.js";
import { createTile, createSeparator, createScenePill } from "./tile.js";
import { MEDIA, entityIcon, stateText } from "./domains.js";
import { sortable } from "./drag.js";
import { t } from "./i18n.js";
import { sideWidgets, SIDE_DEFAULTS } from "./sidepanel.js";
import { openCalendar } from "./agenda.js";
import { openLightSheet, openClimateSheet, openEnergySheet, openMaintenanceSheet, maintenanceItems } from "./catsheets.js";
import { openSecuritySheet, allowedNow } from "./securityview.js";
import { createShadeGroupTile, shadeGroupKey } from "./shades.js";
import { openSheet } from "./dialogs.js";
import { openAppliance, applianceKind } from "./appliance.js";
import { openPrinter, printerForEntity, runningPrinters, printerText, printerName, printerOf } from "./printer.js";
import { runningAppliances, appliancesIn, linkedPlugEntities } from "./usage.js";
import { carDevices, carName, carText, openCar } from "./car.js";
import { poolDevices, openPool } from "./pool.js";
import { openEnergyFlow } from "./energyflow.js";
import { openLeave, leaveItems } from "./leave.js";
import { classicPopups, openSecurityOverview, openLightOverview, openClimateOverview } from "./overviews.js";
import { openDoor } from "./door.js";
import { heatPumps, heatPumpText, openHeatPump } from "./heatpump.js";
import { wallboxes, wallboxText, openWallbox } from "./wallbox.js";
import { openRoomPopup } from "./roompop.js";
import { unifiNet, networkText, openNetwork } from "./network.js";
import { babyCamera, babyMotion, babyCry, babyAreaOf, openBaby } from "./baby.js";
import { doorbells } from "./doorbell.js";
import { snapshotUrl } from "./camera.js";
import { ago, since } from "./popkit.js";
import { wasteSources, loadPickups, openWaste, whenText } from "./waste.js";
import { noticesBlock } from "./notices.js";
import { parcelsBlock } from "./parcels.js";

export const LAYOUTS = [
  { id: "grid", icon: "mdi:view-grid-outline" },
  { id: "sidebar", icon: "mdi:page-layout-sidebar-left" },
  { id: "list", icon: "mdi:format-list-bulleted" },
  { id: "phone", icon: "mdi:cellphone" },
  { id: "security", icon: "mdi:cctv" },
];

const exists = (ctx) => (k) => k.startsWith("sep:") || !!ctx.hass.states[k] || (k.startsWith("bby:") ? !!babyCamera(ctx) : k.startsWith("wbx:") ? wallboxes(ctx.hass).includes(k.slice(4)) : /^(app|prn|car|pol|bel|hpu|net):/.test(k) && !!ctx.hass.devices?.[k.slice(4)]);
/** Covers that are not window shades (gates, garage doors) stay out of the shade button. */
const NOT_SHADE = new Set(["garage", "gate", "door", "damper"]);

/** Lights and switches of a room, for counts, dots and the power button. */
export function roomStats(ctx, area) {
  const hass = ctx.hass;
  const items = ctx.settings.arrange(`room:${area.id}`, area.tiles, exists(ctx)).items.filter((k) => !k.startsWith("sep:"));
  const lights = items.filter((id) => domainOf(id) === "light");
  // The power buttons and "1 of 3 on" are about lights only, never sockets, heating or anything else.
  const counted = lights;
  const on = counted.filter((id) => isOn(hass.states[id]));
  const shades = items.filter((id) => domainOf(id) === "cover" && !NOT_SHADE.has(hass.states[id]?.attributes.device_class));
  // Only lights make a room card glow; sockets show as a dot of their own.
  const lightsOn = lights.filter((id) => isOn(hass.states[id])).length;
  // Meter-only sockets (fridge, network cabinet) are always on; they get no dot.
  const dotIds = [...lights, ...items.filter((id) => domainOf(id) === "switch" && !ctx.settings.s.meters?.[id])];
  return { items, lights, counted, on: on.length, total: counted.length, onIds: on, shades, lightsOn, dotIds };
}

export function roomTemp(ctx, area) {
  const st = area.temperature && ctx.hass.states[area.temperature];
  if (!st || isNaN(Number(st.state))) return "";
  return `${formatNumber(ctx.hass, st.state, 0)}°`;
}

/** Turn a room (or the whole home) on or off. */
export function switchRoom(ctx, stats, on) {
  if (!stats.lights.length) return;
  ctx.hass.callService("light", on ? "turn_on" : "turn_off", { entity_id: stats.lights });
}

/** How far a room's shades are open: { text, open, moving } or null without shades. */
function shadeState(ctx, stats) {
  const sts = stats.shades.map((id) => ctx.hass.states[id]).filter((st) => st && st.state !== "unavailable" && st.state !== "unknown");
  if (!sts.length) return null;
  const moving = sts.some((st) => st.state === "opening" || st.state === "closing");
  const pos = sts.map((st) => st.attributes.current_position ?? (st.state === "closed" ? 0 : 100));
  const avg = Math.round(pos.reduce((a, b) => a + b, 0) / pos.length);
  const text = moving ? t("shades_moving") : avg <= 0 ? t("shades_closed") : avg >= 100 ? t("shades_open") : `${avg} %`;
  return { text, open: avg > 0, moving };
}

export function onText(stats) {
  if (!stats.total) return t("no_lights");
  if (!stats.on) return t("all_off");
  return t("n_of_m_on", { n: stats.on, m: stats.total });
}

// ---------------------------------------------------------------- blocks

/** "HOME STATUS · 6 lights on at home" with Turn all on / off. */
export function statusBlock(ctx, { compact = false } = {}) {
  const big = h("div", { class: "hp-status-big" });
  const allOff = h("button", { class: "hp-btn solid" }, icon("mdi:power"), t("turn_all_off"));
  const lights = () => ctx.model.lights.filter((id) => ctx.model.areaOf[id] && ctx.model.areaOf[id] !== "_other");
  allOff.addEventListener("click", () => ctx.hass.callService("light", "turn_off", { entity_id: lights() }));
  const el = h("div", { class: `hp-status ${compact ? "compact" : ""}` },
    h("div", { class: "hp-status-text" }, h("div", { class: "hp-label" }, t("home_status")), big),
    h("div", { class: "hp-status-btns" }, allOff));
  el.update = (hass) => {
    const n = lights().filter((id) => isOn(hass.states[id])).length;
    const txt = n ? t(n === 1 ? "one_light_home" : "lights_home", { n }) : t("all_lights_off");
    if (big.textContent !== txt) big.textContent = txt;
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

const OPENINGS = ["door", "window", "garage_door", "opening"];

/**
 * The home at a glance: round category chips (light, climate, security, energy, today) and "All lights off".
 * Each chip leads to its page where there is one.
 */
export const CAT_DEFAULTS = { light: true, climate: true, shades: true, security: true, energy: true, today: true, waste: true, maint: true, leave: true };

export const CAT_ORDER = ["light", "climate", "shades", "security", "energy", "today", "waste", "maint", "leave"];

export function homeCats(ctx) {
  const box = h("div", { class: "hp-cats" });
  const editing = !!ctx.editing;
  const show = { ...CAT_DEFAULTS, ...(ctx.settings.s.cats || {}) };
  const setShown = (key, on) => ctx.settings.update((x) => { x.cats = { ...CAT_DEFAULTS, ...(x.cats || {}), [key]: on }; });
  const made = new Map();
  // In edit mode every chip shows: − hides it, + brings a hidden one back, dragging sorts them.
  const chip = (key, ic, label, onTap) => {
    if (!show[key] && !editing) return null;
    const val = h("small", {});
    const el = h("div", { class: `hp-cat ${key} ${show[key] ? "" : "is-hidden"}`, role: onTap ? "button" : null, tabindex: onTap ? "0" : null, dataset: { key } },
      h("span", { class: "hp-cat-ic" }, icon(ic)), h("div", { class: "hp-cat-text" }, h("b", {}, label), val));
    if (onTap) el.addEventListener("click", () => !ctx.editing && onTap());
    const tgl = h("button", { class: `hp-edit-minus ${show[key] ? "" : "plus"}`, "aria-label": show[key] ? t("hide") : t("show") }, icon(show[key] ? "mdi:minus" : "mdi:plus"));
    tgl.addEventListener("pointerdown", (e) => e.stopPropagation());
    tgl.addEventListener("click", (e) => { e.stopPropagation(); setShown(key, !show[key]); });
    el.append(tgl);
    el.val = val;
    made.set(key, el);
    return el;
  };
  const m = ctx.model;
  const lights = () => m.lights.filter((id) => m.areaOf[id] && m.areaOf[id] !== "_other");
  const climates = m.all.filter((id) => id.startsWith("climate."));
  // Each chip can be switched off per panel (Settings → Home, or − in edit mode); a tap always opens a popup.
  const light = chip("light", "mdi:lightbulb-outline", t("cat_light"), () => (classicPopups(ctx) ? openLightSheet(ctx, lights) : openLightOverview(ctx, lights, () => openLightSheet(ctx, lights))));
  const climate = climates.length ? chip("climate", "mdi:thermometer", t("climate"), () => (classicPopups(ctx) ? openClimateSheet(ctx, climates) : openClimateOverview(ctx, climates, () => openClimateSheet(ctx, climates)))) : null;
  const sec = m.security.length ? chip("security", "mdi:shield-outline", t("security"), () => (classicPopups(ctx) ? openSecuritySheet(ctx) : openSecurityOverview(ctx, () => openSecuritySheet(ctx)))) : null;
  const grid = ctx.energyPrefs?.energy_sources?.find((x) => x.type === "grid");
  const rate = grid && (grid.power_config?.stat_rate || grid.stat_rate);
  const energy = rate ? chip("energy", "mdi:lightning-bolt-outline", t("energy"), () => openEnergyFlow(ctx, rate)) : null;
  const hasAgenda = ctx.agenda.calendars().length;
  const today = hasAgenda ? chip("today", "mdi:calendar-blank-outline", t("today"), () => openCalendar(ctx)) : null;
  // Waste: only when a waste calendar is there, and on Home only the day before and on the day of a pickup.
  const hasWaste = (() => { const w = wasteSources(ctx.hass); return w.calendars.length + w.sensors.length > 0; })();
  const waste = hasWaste ? chip("waste", "mdi:delete-variant", t("waste"), () => openWaste(ctx, ctx._waste?.list || [])) : null;
  // Maintenance only shows up when something needs looking after.
  const maint = chip("maint", "mdi:wrench-outline", t("maintenance"), () => openMaintenanceSheet(ctx));
  const leave = chip("leave", "mdi:home-export-outline", t("leave_chip"), () => openLeave(ctx));
  // Every window shade in the house: how many are open; the popup moves all or each.
  const allShades = m.all.filter((id) => domainOf(id) === "cover" && !NOT_SHADE.has(ctx.hass.states[id]?.attributes.device_class));
  const shades = allShades.length ? chip("shades", "mdi:blinds-horizontal", t("shades"), () => ctx.openShades({ title: t("whole_house"), ids: allShades })) : null;
  // Own order first, then the rest in the default order.
  const order = [...(ctx.settings.s.catOrder || []).filter((k) => CAT_ORDER.includes(k)), ...CAT_ORDER];
  const placed = new Set();
  for (const k of order) {
    if (placed.has(k) || !made.has(k)) continue;
    placed.add(k);
    box.append(made.get(k));
  }
  sortable(box, { onDrop: (keys) => ctx.settings.update((x) => { x.catOrder = keys; }) });
  let maintAt = 0;
  let leaveAt = 0;
  // "All lights off" lives in the Light chip's popup; no big button on Home.
  box.update = (hass) => {
    const n = lights().filter((id) => isOn(hass.states[id])).length;
    if (light) {
      light.val.textContent = n ? t("n_on", { n }) : t("all_off");
      light.classList.toggle("active", n > 0);
    }
    if (climate) {
      const heating = climates.filter((id) => ["heating", "preheating"].includes(hass.states[id]?.attributes.hvac_action)).length;
      const temps = m.areas.map((a) => Number(hass.states[a.temperature]?.state)).filter((v) => Number.isFinite(v) && v > -25 && v < 60);
      const range = temps.length ? `${formatNumber(hass, Math.min(...temps), 0)}–${formatNumber(hass, Math.max(...temps), 0)}°` : "";
      climate.val.textContent = heating ? t("n_heating", { n: heating }) : range;
      climate.classList.toggle("active", heating > 0);
    }
    if (sec) {
      const items = ctx.securityItems();
      const open = items.filter((id) => !allowedNow(id)).filter((id) => isUnlocked(hass, id) || (id.startsWith("binary_sensor.") && OPENINGS.includes(hass.states[id]?.attributes.device_class) && hass.states[id]?.state === "on")).length;
      sec.val.textContent = open ? t("n_open", { n: open }) : t("all_closed_short");
      sec.classList.toggle("alert", open > 0);
      sec.classList.toggle("ok", !open);
    }
    if (energy) {
      const st = hass.states[rate];
      const v = Number(st?.state);
      const w = st?.attributes.unit_of_measurement === "kW" ? v * 1000 : v;
      energy.val.textContent = Number.isFinite(w) ? (Math.abs(w) >= 1000 ? `${formatNumber(hass, w / 1000, 1)} kW` : `${formatNumber(hass, w, 0)} W`) : "–";
    }
    if (maint && Date.now() - maintAt > 30000) {
      maintAt = Date.now();
      const k = maintenanceItems(ctx, hass).count;
      maint.hidden = !k && !editing;
      maint.val.textContent = t("n_notes", { n: k });
    }
    if (shades) {
      const live = allShades.map((id) => hass.states[id]).filter((st) => st && st.state !== "unavailable" && st.state !== "unknown");
      const pos = (st) => st.attributes.current_position ?? (st.state === "closed" ? 0 : 100);
      const open = live.filter((st) => pos(st) > 0).length;
      const moving = live.some((st) => st.state === "opening" || st.state === "closing");
      shades.val.textContent = moving ? t("shades_moving") : !open ? t("all_closed_short") : open === live.length ? t("all_open_short") : t("n_of_m_open", { n: open, m: live.length });
      shades.classList.toggle("active", open > 0);
      shades.firstChild.firstChild.icon = moving ? "mdi:unfold-more-horizontal" : open ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed";
    }
    if (leave && Date.now() - leaveAt > 5000) {
      leaveAt = Date.now();
      const k = leaveItems(ctx, hass).count;
      leave.val.textContent = k ? t("leave_n_todo", { n: k }) : t("leave_ready");
    }
    if (today) {
      const k = ctx.agenda.todayEvents().length;
      today.val.textContent = k ? t("n_events", { n: k }) : t("nothing_today");
    }
    if (waste) {
      // The pickups are fetched every half hour (and once the day changes), shared by every redraw.
      const c = ctx._waste;
      const day = new Date().toDateString();
      if (!c || (Date.now() - c.at > 1800e3 || c.day !== day) && !c.loading) {
        ctx._waste = { ...(c || { list: [] }), at: Date.now(), day, loading: true };
        loadPickups(hass, (cal, start, end) => hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`))
          .then((list) => { ctx._waste = { list, at: Date.now(), day, loading: false }; box.update(ctx.hass); })
          .catch(() => { ctx._waste = { ...ctx._waste, loading: false }; });
      }
      const list = ctx._waste?.list || [];
      const soonDays = list.filter((p) => Math.round((p.day - new Date(new Date().toDateString())) / 86400e3) <= 1);
      const first = soonDays[0];
      const same = first ? soonDays.filter((p) => p.key === first.key) : [];
      waste.hidden = !first && !editing;
      waste.classList.toggle("active", !!first);
      if (first) {
        waste.val.textContent = `${whenText(hass, first.day)}: ${same.map((p) => p.what).join(", ")}`;
        waste.style.setProperty("--bin", first.color);
      } else waste.val.textContent = list[0] ? whenText(hass, list[0].day) : "–";
    }
  };
  box.update(ctx.hass);
  ctx.live.push(box);
  return box;
}

/** "SCENES 3" and the scene strip. */
export function scenesBlock(ctx, container, autoScenes, label) {
  const { items, hidden } = ctx.settings.arrange(container, autoScenes, exists(ctx));
  if (!items.length && !ctx.editing) return null;
  const box = h("div", { class: "hp-scenes", dataset: { container } });
  for (const id of items) box.append(createScenePill(ctx, id, container));
  sortable(box, { onDrop: (keys) => ctx.settings.setOrder(container, keys), axis: "x" });
  return h("div", { class: "hp-scenes-block" },
    h("div", { class: "hp-label" }, t("scenes"), h("span", { class: "hp-count" }, String(items.length))),
    h("div", { class: "hp-scenes-wrap" }, box,
      h("div", { class: "hp-edit-tools inline" },
        h("button", { class: "hp-chip", onclick: () => ctx.openAdd(container, autoScenes, ["scene", "script"]) }, icon("mdi:plus"), t("add_scenes")),
        hidden.length ? h("button", { class: "hp-chip", onclick: () => ctx.openHidden(container, hidden, label) }, icon("mdi:eye-off-outline"), String(hidden.length)) : null)));
}

const NEXT_SIZE_ICON = { 1: "mdi:arrow-expand-horizontal", w: "mdi:arrow-expand", 2: "mdi:arrow-collapse" };

/** Room and summary cards on Home: normal, wide or big, set with the resize button in edit mode. */
function applyCardSize(ctx, el, key) {
  const size = ctx.settings.size(key);
  el.classList.toggle("wide", size === "w");
  el.classList.toggle("big", size === 2);
  const b = h("button", { class: "hp-edit-resize", "aria-label": t("resize"), title: t("resize") }, icon(NEXT_SIZE_ICON[size] || NEXT_SIZE_ICON[1]));
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.settings.cycleSize(key);
  });
  el.append(b);
}

/** Favourites: four sizes in a finer grid (columns of half a card, rows of half a card). */
const FAV_SIZES = ["2x2", "2x1", "4x1", "4x2"];
function favSize(ctx, el, key) {
  // Rooms start small (one line); devices as a card.
  const size = ctx.settings.s.favSizes?.[key] || (key.startsWith("room:") ? "2x1" : "2x2");
  el.classList.remove("wide", "big", "size2");
  el.classList.add(`fs-${size}`);
  el.classList.toggle("short", size.endsWith("x1"));
  // A device on its own: its room goes in front of the state ("Küche · 71 %"), so it is clear which lamp it is.
  const st = el.querySelector(":scope > .hp-tile-text .hp-tile-state");
  const room = !key.startsWith("room:") && ctx.model.areaById.get(ctx.model.areaOf[key])?.name;
  if (st && room) st.dataset.room = room;
  el.querySelector(":scope > .hp-edit-resize")?.remove();
  const b = h("button", { class: "hp-edit-resize hp-fav-size", "aria-label": t("resize"), title: t("resize") }, h("span", {}, size.replace("x", "×")));
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    const next = FAV_SIZES[(FAV_SIZES.indexOf(size) + 1) % FAV_SIZES.length];
    ctx.settings.update((x) => { x.favSizes = { ...(x.favSizes || {}), [key]: next }; });
  });
  el.append(b);
}

function editMinus(ctx, container, key) {
  const b = h("button", { class: "hp-edit-minus", "aria-label": t("hide") }, icon("mdi:minus"));
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.hideItem(container, key);
  });
  return b;
}

/** A room on Home: icon, power, "1 of 3 on", a dot per light, temperature. */
function roomCard(ctx, area, container) {
  const ic = h("div", { class: "hp-tile-icon" }, icon(area.icon || "mdi:texture-box"));
  const power = h("button", { class: "hp-power", "aria-label": t("power") }, icon("mdi:power"));
  const shadeBtn = h("button", { class: "hp-power hp-shade-btn", "aria-label": t("shades") }, icon("mdi:blinds-horizontal"));
  const shadeInfo = h("span", { class: "hp-shade-info" }, icon("mdi:blinds-horizontal"), h("span", {}));
  const sub = h("div", { class: "hp-sub" });
  const dots = h("div", { class: "hp-dots" });
  const flame = h("span", { class: "hp-act small", hidden: true, title: t("heating_now") }, icon("mdi:fire"));
  // Someone in the room (presence sensor; motion only without one), for people who switched it on.
  const pres = h("span", { class: "hp-presence", hidden: true, title: t("rp_motion_now") }, icon("mdi:account"));
  const temp = h("div", { class: "hp-roomcard-temp" }, pres, shadeInfo, flame, h("span", { class: "hp-temp-val" }));
  // Icon and temperature on top; name, what is on and a bar per light below, the buttons bottom right.
  const el = h("div", { class: "hp-card hp-roomcard", dataset: { key: `room:${area.id}` }, role: "button", tabindex: "0" },
    h("div", { class: "hp-roomcard-top" }, ic, temp),
    h("div", { class: "hp-roomcard-bottom" },
      h("div", { class: "hp-roomcard-info" }, h("div", { class: "hp-roomcard-name" }, area.name), sub, dots),
      h("div", { class: "hp-roomcard-btns" }, shadeBtn, power)),
    editMinus(ctx, container, `room:${area.id}`));
  let stats;
  power.addEventListener("pointerdown", (e) => e.stopPropagation());
  power.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!ctx.editing) switchRoom(ctx, stats, !stats.on);
  });
  shadeBtn.addEventListener("pointerdown", (e) => e.stopPropagation());
  shadeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    if (ctx.editing) return;
    if (!stats.shades.length) return;
    ctx.openShades({ title: area.name, ids: stats.shades });
  });
  // Tap opens the room page; holding opens the room at a glance.
  // Tap: the room popup (or the room page, see Settings); holding opens the other one.
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => ctx.tapRoom(area.id), hold: () => ctx.holdRoom(area.id) });
  el.update = (hass) => {
    stats = roomStats(ctx, area);
    el.classList.toggle("lit", stats.lightsOn > 0);
    sub.textContent = onText(stats);
    power.hidden = !stats.lights.length;
    const sig = stats.dotIds.slice(0, 8).map((id) => (isOn(hass.states[id]) ? 1 : 0)).join("");
    if (dots.dataset.sig !== sig) {
      dots.dataset.sig = sig;
      dots.replaceChildren(...[...sig].map((c) => h("i", { class: c === "1" ? "on" : "" })));
    }
    temp.lastChild.textContent = roomTemp(ctx, area);
    pres.hidden = !(ctx.prefs?.roomMotion && roomPresence(hass, area)?.on);
    flame.hidden = !area.tiles.some((id) => id.startsWith("climate.") && ["heating", "preheating"].includes(hass.states[id]?.attributes.hvac_action));
    const sh = shadeState(ctx, stats);
    shadeBtn.hidden = !sh;
    shadeInfo.hidden = !sh;
    if (sh) {
      const ico = sh.moving ? "mdi:unfold-more-horizontal" : sh.open ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed";
      shadeInfo.firstChild.icon = ico;
      shadeBtn.firstChild.icon = ico;
      shadeBtn.title = t("shades");
      shadeInfo.lastChild.textContent = sh.text;
    }
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

function securityCard(ctx, container) {
  const big = h("div", { class: "hp-card-big" });
  const sub = h("div", { class: "hp-sub" });
  const ic = h("div", { class: "hp-tile-icon" }, icon("mdi:shield-check-outline"));
  const el = h("div", { class: "hp-card hp-sumcard security", dataset: { key: "card:security" }, role: "button" },
    h("div", { class: "hp-card-label" }, ic, t("security")), big, sub, editMinus(ctx, container, "card:security"));
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => ctx.goTab("security") });
  el.update = (hass) => {
    const sec = ctx.securityItems();
    const unlocked = sec.filter((id) => isUnlocked(hass, id) && !allowedNow(id));
    const open = sec.filter((id) => !allowedNow(id) && id.startsWith("binary_sensor.") && ["door", "window", "garage_door", "opening"].includes(hass.states[id]?.attributes.device_class) && hass.states[id]?.state === "on");
    const issues = unlocked.length + open.length;
    big.textContent = issues ? t("needs_attention") : t("everything_secure");
    sub.textContent = issues
      ? [unlocked.length ? t("unlocked_n", { n: unlocked.length }) : null, open.length ? t("open_n", { n: open.length }) : null].filter(Boolean).join(" · ")
      : t("monitored_n", { n: sec.length });
    ic.querySelector("ha-icon").icon = issues ? "mdi:shield-alert-outline" : "mdi:shield-check-outline";
    el.classList.toggle("alert", issues > 0);
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

function climateCard(ctx, container) {
  const big = h("div", { class: "hp-card-big" });
  const sub = h("div", { class: "hp-sub" });
  const el = h("div", { class: "hp-card hp-sumcard climate", dataset: { key: "card:climate" }, role: "button" },
    h("div", { class: "hp-card-label" }, h("div", { class: "hp-tile-icon" }, icon("mdi:thermometer")), t("climate")), big, sub, editMinus(ctx, container, "card:climate"));
  const pick = () => {
    const c = ctx.model.all.filter((id) => id.startsWith("climate."));
    return c.find((id) => isOn(ctx.hass.states[id])) || c[0];
  };
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => { const id = pick(); if (id) ctx.openDetails(id); } });
  el.update = (hass) => {
    const id = pick();
    const st = id && hass.states[id];
    if (!st) return;
    // No lamp glow for heating: the icon turns warm only while it really heats.
    el.classList.toggle("heating", ["heating", "preheating"].includes(st.attributes.hvac_action));
    el.classList.toggle("cooling", st.attributes.hvac_action === "cooling");
    const cur = st.attributes.current_temperature;
    big.textContent = cur != null ? `${formatNumber(hass, cur, 0)}°` : (hass.formatEntityState?.(st) || st.state);
    sub.textContent = [st.attributes.friendly_name, hass.formatEntityState?.(st) || st.state].filter(Boolean).join(" · ");
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

function mediaCard(ctx, container) {
  const label = h("div", { class: "hp-card-label" }, icon("mdi:music-note"), h("span", {}));
  const title = h("div", { class: "hp-media-title" });
  const sub = h("div", { class: "hp-sub" });
  const bar = h("div", { class: "hp-bar" }, h("i", {}));
  const call = (svc) => { const id = pick(); if (id) ctx.hass.callService("media_player", svc, { entity_id: id }); };
  const btn = (ic, svc, cls = "") => {
    const b = h("button", { class: cls, "aria-label": svc }, icon(ic));
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); if (!ctx.editing) call(svc); });
    return b;
  };
  const play = btn("mdi:play", "media_play_pause", "main");
  const el = h("div", { class: "hp-card hp-sumcard media", dataset: { key: "card:media" }, role: "button" },
    label, title, sub, bar,
    h("div", { class: "hp-media-btns" }, btn("mdi:skip-previous", "media_previous_track"), play, btn("mdi:skip-next", "media_next_track")),
    editMinus(ctx, container, "card:media"));
  const pick = () => {
    const m = ctx.model.media;
    const st = (id) => ctx.hass.states[id];
    return m.find((id) => st(id)?.state === "playing") || ctx.model.spotify[0] || m.find((id) => isOn(st(id))) || m[0];
  };
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => { const id = pick(); if (id) ctx.openPlayer(id); } });
  el.update = (hass) => {
    const id = pick();
    const st = id && hass.states[id];
    if (!st) return;
    const a = st.attributes;
    const room = ctx.model.areaById.get(ctx.model.areaOf[id])?.name;
    const src = ctx.model.spotify.includes(id) ? "Spotify" : a.app_name || a.friendly_name;
    label.lastChild.textContent = [src, room].filter(Boolean).join(" · ");
    title.textContent = a.media_title || (isOn(st) ? hass.formatEntityState?.(st) || st.state : t("nothing_playing"));
    sub.textContent = a.media_artist || a.friendly_name || "";
    const d = a.media_duration;
    let p = a.media_position;
    if (p != null && st.state === "playing" && a.media_position_updated_at) p += (Date.now() - new Date(a.media_position_updated_at)) / 1000;
    bar.firstChild.style.width = d && p != null ? `${Math.min(100, (p / d) * 100)}%` : "0";
    bar.hidden = !d;
    play.querySelector("ha-icon").icon = st.state === "playing" ? "mdi:pause" : "mdi:play";
    el.querySelector(".hp-media-btns").hidden = !(st.attributes.supported_features & MEDIA.PAUSE) && !(st.attributes.supported_features & MEDIA.PLAY);
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

function todayCardEl(ctx, container) {
  const el = ctx.todayCard();
  el.classList.add("hp-card", "hp-sumcard", "today");
  el.dataset.key = "card:today";
  el.append(editMinus(ctx, container, "card:today"));
  return el;
}

/** Home: room cards, security, climate, music and anything added by hand. */
export function overview(ctx, { container = "home", own = false, onAdd = null } = {}) {
  const m = ctx.model;
  const auto = [];
  // "own": the Favourites home, where only what was added by hand shows.
  if (own) { /* nothing automatic */ } else if (ctx.settings.s.todayCard && (ctx.agenda.calendars().length || ctx.agenda.todoLists().length)) auto.push("card:today");
  if (!own) {
    for (const a of m.areas) if (roomHasContent(a)) auto.push(`room:${a.id}`);
    if (m.unassigned.tiles.length) auto.push("room:_other");
    if (m.security.length) auto.push("card:security");
    if (m.all.some((id) => id.startsWith("climate."))) auto.push("card:climate");
    if (m.media.length) auto.push("card:media");
  }
  // Summary cards that exist in this house (also for the Favourites home, where they are added by hand).
  const cards = availableCards(ctx);
  const valid = (k) => {
    if (k.startsWith("card:")) return cards.includes(k);
    if (k.startsWith("room:")) return k === "room:_other" ? !!m.unassigned.tiles.length : !!m.areaById.get(k.slice(5));
    if (k.startsWith("bby:")) return !!babyCamera(ctx);
    if (k.startsWith("wbx:")) return wallboxes(ctx.hass).includes(k.slice(4));
    if (/^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(k)) return !!ctx.hass.devices?.[k.slice(4)];
    return k.startsWith("sep:") || !!ctx.hass.states[k];
  };
  const { items, hidden } = ctx.settings.arrange(container, auto, valid);
  const grid = h("div", { class: "hp-overview", dataset: { container } });
  for (const key of items) {
    let el = null;
    if (key.startsWith("room:")) {
      const id = key.slice(5);
      const area = id === "_other" ? { ...m.unassigned, name: t("other") } : m.areaById.get(id);
      if (area) el = roomCard(ctx, area, container);
    } else if (key === "card:security") el = securityCard(ctx, container);
    else if (key === "card:climate") el = climateCard(ctx, container);
    else if (key === "card:media") el = mediaCard(ctx, container);
    else if (key === "card:today") el = todayCardEl(ctx, container);
    else if (key.startsWith("sep:")) el = createSeparator(ctx, container, key, ctx.settings.sepTitle(container, key));
    else if (/^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(key)) {
      el = deviceKeyTile(ctx, key, { container });
      ctx.live.push(el);
    } else {
      el = createTile(ctx, key, { size: own ? 1 : ctx.settings.size(key), container });
      ctx.live.push(el);
    }
    if (el && own && !key.startsWith("sep:")) favSize(ctx, el, key);
    else if (el && (key.startsWith("room:") || key.startsWith("card:"))) applyCardSize(ctx, el, key);
    if (el) grid.append(el);
  }
  if (own) grid.classList.add("hp-favgrid");
  const add = h("button", { class: "hp-addcard" }, h("span", {}, icon("mdi:plus")), t("add_devices"));
  add.addEventListener("click", () => (onAdd ? onAdd() : ctx.openAdd(container, auto)));
  grid.append(add);
  sortable(grid, { onDrop: (keys) => ctx.settings.setOrder(container, keys) });
  const tools = h("div", { class: "hp-edit-tools" },
    h("button", { class: "hp-chip", onclick: async () => {
      const title = await ctx.prompt(t("separator_title"), "");
      if (title !== null) ctx.settings.addSeparator(container, title, items);
    } }, icon("mdi:minus"), t("separator")),
    hidden.length ? h("button", { class: "hp-chip", onclick: () => ctx.openHidden(container, hidden, t("tab_home")) }, icon("mdi:eye-off-outline"), t("hidden_n", { n: hidden.length })) : null);
  if (own && !items.length && !ctx.editing) {
    const start = h("button", { class: "hp-chip", onclick: () => onAdd?.() }, icon("mdi:plus"), t("fav_add"));
    return h("div", { class: "hp-fav-empty" }, icon("mdi:star-outline"), h("div", {}, t("fav_empty")), start);
  }
  return h("div", {}, grid, tools);
}

/** The summary cards this house has: Today, Security, Climate and the music card ("now playing"). */
function availableCards(ctx) {
  const m = ctx.model;
  const out = [];
  if (ctx.agenda.calendars().length || ctx.agenda.todoLists().length) out.push("card:today");
  if (m.security.length) out.push("card:security");
  if (m.all.some((id) => id.startsWith("climate."))) out.push("card:climate");
  if (m.media.length) out.push("card:media");
  return out;
}
const CARD_INFO = { "card:media": ["mdi:music", "fav_card_media", "fav_card_media_sub"], "card:security": ["mdi:shield-outline", "security", "fav_card_security_sub"],
  "card:climate": ["mdi:thermometer", "climate", "fav_card_climate_sub"], "card:today": ["mdi:calendar-today", "card_today", "fav_card_today_sub"] };

/** Picker for the Favourites home: a room as a whole, or any device from it (also when the room is already there). */
function openFavPicker(ctx, container) {
  const sheet = openSheet(ctx, { title: t("fav_add"), subtitle: t("fav_add_hint"), cls: "fav-picker tall" });
  const list = h("div", { class: "hp-add-list" });
  const open = new Set();
  const addRow = (key, ic, name, sub, there) => {
    const b = h("button", { class: `hp-add-row ${there ? "there" : ""}`, disabled: there },
      h("div", { class: "hp-tile-icon" }, icon(ic)),
      h("div", { class: "hp-add-text" }, h("div", {}, name), h("small", {}, there ? t("already_here") : sub)),
      icon(there ? "mdi:check" : "mdi:plus"));
    b.addEventListener("click", () => { ctx.settings.add(container, key, []); setTimeout(draw, 60); });
    return b;
  };
  function draw() {
    const have = new Set(ctx.settings.arrange(container, [], () => true).items);
    const out = [];
    // Cards first: the music card (whatever plays), security, climate, today.
    const cardKeys = availableCards(ctx).sort((a, b) => (a === "card:media" ? -1 : b === "card:media" ? 1 : 0));
    if (cardKeys.length) {
      out.push(h("div", { class: "hp-group-label" }, t("fav_cards")));
      for (const k of cardKeys) {
        const [ic, name, sub] = CARD_INFO[k];
        out.push(addRow(k, ic, t(name), t(sub), have.has(k)));
      }
    }
    for (const g of roomsByFloor(ctx)) {
      if (g.floor) out.push(h("div", { class: "hp-group-label" }, g.floor.name));
      for (const a of g.rooms) {
        const isOpen = open.has(a.id);
        // Machines, the car, pool and door count as one device each (as in the room).
        const devs = (a.id === "_other" ? a.tiles : roomItems(ctx, a)).filter((id) => ctx.hass.states[id] || /^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(id));
        const toggle = h("button", { class: "hp-round ghost small", "aria-label": t("fav_devices_of", { room: a.name || t("other") }) },
          icon(isOpen ? "mdi:chevron-up" : "mdi:chevron-down"));
        toggle.addEventListener("click", () => { if (isOpen) open.delete(a.id); else open.add(a.id); draw(); });
        const row = addRow(`room:${a.id}`, a.icon || "mdi:texture-box", a.name || t("other"), t("fav_room_n", { n: devs.length }), have.has(`room:${a.id}`));
        out.push(h("div", { class: "hp-fav-roomrow" }, row, devs.length ? toggle : null));
        if (isOpen) {
          out.push(h("div", { class: "hp-fav-devs" }, devs.map((id) => {
            if (/^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(id)) {
              const info = deviceKeyInfo(ctx, id);
              return addRow(id, info.icon, info.name, info.sub, have.has(id));
            }
            return addRow(id, entityIcon(ctx.hass, ctx.hass.states[id]), entityName(ctx.hass, id, a.name), stateText(ctx.hass, ctx.hass.states[id]), have.has(id));
          })));
        }
      }
    }
    list.replaceChildren(...out);
  }
  draw();
  const dev = h("button", { class: "hp-chip" }, icon("mdi:magnify"), t("fav_search_device"));
  dev.addEventListener("click", () => ctx.openAdd(container, []));
  sheet.body.append(list, h("div", { class: "hp-sheet-actions" }, dev));
}

/** A small pill for "On now": icon, name and room; the icon switches off, the rest opens the details. */
function onPill(ctx, id) {
  const ic = icon("mdi:lightbulb");
  const name = h("b", {});
  const sub = h("small", {});
  const sw = h("button", { class: "hp-onpill-ic", "aria-label": t("toggle") }, ic);
  const el = h("div", { class: "hp-onpill", role: "button", tabindex: "0", dataset: { key: id } }, sw, h("div", { class: "hp-onpill-text" }, name, sub));
  const room = ctx.model.areaById.get(ctx.model.areaOf[id])?.name;
  sw.addEventListener("pointerdown", (e) => e.stopPropagation());
  sw.addEventListener("click", (e) => {
    e.stopPropagation();
    if (!ctx.editing) ctx.hass.callService(domainOf(id), "toggle", { entity_id: id });
  });
  // A printer's chamber light opens the printer.
  const open = () => {
    const pr = printerForEntity(ctx.hass, id);
    if (pr) openPrinter(ctx, pr);
    else ctx.openDetails(id);
  };
  bindTapHold(el, { canStart: () => !ctx.editing, tap: open, hold: open });
  el.update = (hass) => {
    const st = hass.states[id];
    if (!st) return;
    ic.icon = entityIcon(hass, st);
    name.textContent = entityName(hass, id, room);
    const bri = st.attributes.brightness != null ? `${Math.round((st.attributes.brightness / 255) * 100)} %` : "";
    sub.textContent = [room, bri].filter(Boolean).join(" · ");
    el.classList.toggle("on", isOn(st));
  };
  el.update(ctx.hass);
  return el;
}

/** A running appliance as a pill: "Washing machine · Running · 45 % · 32 min left". */
function appliancePill(ctx, a) {
  const ic = /dry|trock/i.test(a.name + a.state) ? "mdi:tumble-dryer" : /dish|spül|spul|geschirr/i.test(a.name + a.state) ? "mdi:dishwasher" : "mdi:washing-machine";
  const sub = h("small", {}, a.text);
  const el = h("div", { class: "hp-onpill appliance on", role: "button", tabindex: "0", dataset: { key: `app:${a.dev}` } },
    h("span", { class: "hp-onpill-ic" }, icon(ic)), h("div", { class: "hp-onpill-text" }, h("b", {}, a.name), sub));
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => openAppliance(ctx, a.dev), hold: () => openAppliance(ctx, a.dev) });
  el.update = (hass) => {
    const now = runningAppliances(hass).find((x) => x.dev === a.dev);
    if (now) sub.textContent = now.text;
  };
  return el;
}

/** Sockets of machines and printers' chamber lights: the machine tile covers them. */
export function machineParts(ctx) {
  const out = linkedPlugEntities(ctx.hass);
  for (const p of runningPrinters(ctx.hass, { all: true })) if (p.light) out.add(p.light);
  return out;
}

/** A room's tiles: its devices plus machine tiles; a machine's socket goes into the machine's tile. */
export function roomItems(ctx, area) {
  const plugs = machineParts(ctx);
  // A car or pool controller is one tile; its many sensors and switches stay inside the popup.
  const bundled = new Set([...carDevices(ctx.hass), ...poolDevices(ctx.hass),
    ...heatPumps(ctx.hass).flatMap((hp) => [hp.dev, hp.climate && ctx.hass.entities?.[hp.climate]?.device_id]).filter(Boolean)]);
  const inBundle = (id) => bundled.has(ctx.hass.entities?.[id]?.device_id);
  const items = [...area.tiles.filter((id) => !plugs.has(id) && !inBundle(id)), ...deviceKeys(ctx, area.id)];
  // A room with nothing to switch (a cellar with a thermometer) shows what it measures instead of "nothing here".
  if (!items.length && area.sensors?.length) {
    const read = area.sensors.filter((id) => READINGS.has(ctx.hass.states[id]?.attributes.device_class));
    const watch = area.sensors.filter((id) => id.startsWith("binary_sensor."));
    // Readings and contacts first; a room with neither shows its other sensors.
    return read.length || watch.length ? [...read, ...watch] : area.sensors.slice(0, 12);
  }
  return items;
}
const READINGS = new Set(["temperature", "humidity", "carbon_dioxide", "pm25", "pm10", "illuminance", "pressure", "volatile_organic_compounds", "moisture"]);

/** Washers, dryers, dishwashers and 3D printers of a room, as tile keys ("app:<device>", "prn:<device>"). */
export function deviceKeys(ctx, areaId) {
  const hass = ctx.hass;
  const out = [];
  const names = new Set();
  for (const a of appliancesIn(hass, areaId)) {
    if (/pump|filter|pool/i.test(a.state)) continue;
    const d = hass.devices?.[a.dev];
    const name = (d?.name_by_user || d?.name || "").toLowerCase();
    // The same machine through two integrations (WashData and Home Connect) is one tile.
    if (names.has(name)) continue;
    names.add(name);
    out.push(`app:${a.dev}`);
  }
  const prn = new Set(Object.values(hass.entities || {}).filter((e) => e.device_id && /_(druckstatus|print_status)$/.test(e.entity_id)).map((e) => e.device_id));
  for (const dev of prn) {
    const p = printerOf(hass, dev);
    if (!p) continue;
    const area = hass.devices?.[dev]?.area_id || ctx.model.areaOf[p.status];
    if (area === areaId) out.push(`prn:${dev}`);
  }
  for (const dev of carDevices(hass)) if (hass.devices?.[dev]?.area_id === areaId) out.push(`car:${dev}`);
  for (const dev of poolDevices(hass)) if (hass.devices?.[dev]?.area_id === areaId) out.push(`pol:${dev}`);
  for (const hp of heatPumps(hass)) if (hass.devices?.[hp.dev]?.area_id === areaId) out.push(`hpu:${hp.dev}`);
  const net = unifiNet(hass);
  if (net?.gw) {
    const rack = Object.keys(hass.states).find((id) => /^switch\..*(netzwerk|network_rack|rack)/i.test(id));
    if (rack && ctx.model.areaOf[rack] === areaId) out.push(`net:${net.gw.dev}`);
  }
  for (const dev of wallboxes(hass)) {
    const area = hass.devices?.[dev]?.area_id || hass.devices?.[carDevices(hass)[0]]?.area_id;
    if (area === areaId) out.push(`wbx:${dev}`);
  }
  const baby = babyCamera(ctx);
  if (baby && babyAreaOf(ctx, baby) === areaId) out.push(`bby:${hass.entities?.[baby]?.device_id || "cam"}`);
  for (const bell of doorbells(hass)) {
    const dev = hass.entities?.[bell]?.device_id;
    const area = hass.entities?.[bell]?.area_id || hass.devices?.[dev]?.area_id;
    if (dev && area === areaId) out.push(`bel:${dev}`);
  }
  return out;
}

const bellOfDevice = (hass, dev) => doorbells(hass).find((id) => hass.entities?.[id]?.device_id === dev) || null;

/** Name, icon and a short state for a machine/car/pool/door key, e.g. in the favourites picker. */
export function deviceKeyInfo(ctx, key) {
  const hass = ctx.hass;
  const dev = key.slice(4);
  const d = hass.devices?.[dev];
  const dn = d?.name_by_user || d?.name || "";
  if (key.startsWith("car:")) return { icon: "mdi:car-side", name: carName(hass, dev), sub: carText(hass, dev) };
  if (key.startsWith("pol:")) return { icon: "mdi:pool", name: t("pool_title"), sub: dn };
  if (key.startsWith("bel:")) return { icon: "mdi:doorbell-video", name: t("door_title"), sub: dn };
  if (key.startsWith("wbx:")) return { icon: "mdi:ev-station", name: t("wb_title"), sub: wallboxText(hass, key.slice(4)) };
  if (key.startsWith("hpu:")) return { icon: "mdi:heat-pump-outline", name: t("hp_title"), sub: dn };
  if (key.startsWith("net:")) return { icon: "mdi:lan", name: t("net_title"), sub: networkText(hass) };
  if (key.startsWith("bby:")) return { icon: "mdi:baby-face-outline", name: t("baby_title"), sub: dn };
  if (key.startsWith("prn:")) {
    const p = printerOf(hass, dev);
    return { icon: "mdi:printer-3d-nozzle", name: p ? printerName(hass, p) : dn, sub: (p && printerText(hass, p)) || "" };
  }
  const kind = applianceKind(`${dn} ${d?.model || ""}`);
  return { icon: { dryer: "mdi:tumble-dryer", dish: "mdi:dishwasher", washer: "mdi:washing-machine" }[kind], name: dn, sub: "" };
}

/** Every popup tile in the house (machines, car, pool, door, heat pump, network, baby monitor), for the add dialogs. */
export function specialTiles(ctx) {
  const out = [];
  for (const a of ctx.model.areas) {
    for (const key of deviceKeys(ctx, a.id)) out.push({ key, area: a.id, ...deviceKeyInfo(ctx, key) });
  }
  return out;
}

/** The tile for any machine/car/pool/door key. */
export function deviceKeyTile(ctx, key, opts) {
  return /^(car|pol|bel|hpu|net|bby|wbx):/.test(key) ? createBundleTile(ctx, key, opts) : createDeviceTile(ctx, key, opts);
}

/** A car or pool tile: picture-free, a short status line, tap opens the popup. */
function createBundleTile(ctx, key, { container, variant = "tile" }) {
  const dev = key.slice(4);
  const car = key.startsWith("car:");
  const bell = key.startsWith("bel:") ? bellOfDevice(ctx.hass, dev) : null;
  const pre = key.slice(0, 3);
  const kind = { car: "car", bel: "bell", pol: "pool", hpu: "heatpump", net: "network", bby: "baby", wbx: "wallbox" }[pre];
  const extra = { hpu: ["mdi:heat-pump-outline", t("hp_title")], net: ["mdi:lan", t("net_title")], bby: ["mdi:baby-face-outline", t("baby_title")], wbx: ["mdi:ev-station", t("wb_title")] }[pre];
  const row = variant === "row";
  const el = h("div", { class: `hp-tile hp-${variant} hp-devtile ${kind}`, dataset: { key, domain: "sensor" }, tabindex: "0", role: "button" });
  const iconBox = h("div", { class: "hp-tile-icon" }, icon(extra ? extra[0] : car ? "mdi:car-side" : bell ? "mdi:doorbell-video" : "mdi:pool"));
  const nameEl = h("div", { class: "hp-tile-name" }, extra ? extra[1] : car ? carName(ctx.hass, dev) : bell ? t("door_title") : t("pool_title"));
  // The door tile shows the last ring picture behind the text.
  const pic = bell ? h("img", { class: "hp-bell-pic", alt: "" }) : null;
  if (pic) el.append(pic);
  const stateEl = h("div", { class: "hp-tile-state" });
  const text = h("div", { class: "hp-tile-text" }, nameEl, stateEl);
  const fill = h("i", {});
  const bar = h("div", { class: "hp-cover-bar" }, fill);
  if (row) el.append(iconBox, text);
  else el.append(h("div", { class: "hp-tile-top" }, iconBox), text, bar);
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide"), title: t("hide") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => { e.stopPropagation(); ctx.hideItem(container, key); });
  el.append(minus);
  const open = () => (pre === "hpu" ? openHeatPump(ctx, heatPumps(ctx.hass).find((x) => x.dev === dev)) : pre === "net" ? openNetwork(ctx) : pre === "bby" ? openBaby(ctx, babyCamera(ctx)) : pre === "wbx" ? openWallbox(ctx, dev)
    : car ? openCar(ctx, dev) : bell ? openDoor(ctx, bell) : openPool(ctx, dev));
  bindTapHold(el, { canStart: () => !ctx.editing, tap: open, hold: open });
  el.update = (hs) => {
    if (pre === "hpu") {
      const hp = heatPumps(hs).find((x) => x.dev === dev);
      stateEl.textContent = hp ? heatPumpText(hs, hp) : t("unavailable");
      el.classList.toggle("on", !!hp && !stateEl.textContent.startsWith(t("hp_idle")));
      bar.hidden = true;
      return;
    }
    if (pre === "wbx") {
      stateEl.textContent = wallboxText(hs, dev);
      el.classList.toggle("on", stateEl.textContent.startsWith(t("car_charging")));
      bar.hidden = true;
      return;
    }
    if (pre === "net") {
      stateEl.textContent = networkText(hs) || t("unavailable");
      bar.hidden = true;
      return;
    }
    if (pre === "bby") {
      const cam = babyCamera(ctx);
      const mot = cam && babyMotion(hs, cam);
      const m = hs.states[mot];
      const crying = cam && hs.states[babyCry(hs, cam)]?.state === "on";
      stateEl.textContent = crying ? t("baby_crying") : m ? (m.state === "on" ? t("baby_moving") : t("baby_still_since", { when: since(m.last_changed) })) : t("live");
      el.classList.toggle("on", !!crying || m?.state === "on");
      bar.hidden = true;
      return;
    }
    if (bell) {
      const when = Date.parse(hs.states[bell]?.state);
      stateEl.textContent = Number.isFinite(when) ? t("door_rang_ago", { when: ago(hs, when) }) : t("door_title");
      el.classList.toggle("on", Number.isFinite(when) && Date.now() - when < 5 * 60000);
      bar.hidden = true;
      const cam = Object.values(hs.entities || {}).find((e) => e.device_id === dev && /^camera\..*(klingel|ring)/i.test(e.entity_id))?.entity_id;
      const st = cam && hs.states[cam];
      const url = st && snapshotUrl(st);
      if (pic && url && pic.dataset.k !== String(hs.states[bell]?.state)) { pic.dataset.k = String(hs.states[bell]?.state); pic.src = url; }
      el.classList.toggle("has-pic", !!url);
    } else if (car) {
      stateEl.textContent = carText(hs, dev) || t("unavailable");
      const b = Number(Object.values(hs.entities || {}).filter((e) => e.device_id === dev && /_(batteriestand|battery_level)$/.test(e.entity_id)).map((e) => hs.states[e.entity_id]?.state)[0]);
      fill.style.width = `${Number.isFinite(b) ? b : 0}%`;
      bar.hidden = !Number.isFinite(b);
      el.classList.toggle("on", /charging|laden/i.test(stateEl.textContent) || false);
    } else {
      const ent = (re) => Object.values(hs.entities || {}).find((e) => e.device_id === dev && re.test(e.entity_id))?.entity_id;
      const temp = Number(hs.states[ent(/^sensor\..*_(temperature|wassertemperatur)$/)]?.state);
      const ph = Number(hs.states[ent(/^sensor\..*_ph$/)]?.state);
      const online = hs.states[ent(/_device_online$/)]?.state;
      stateEl.textContent = [Number.isFinite(temp) && temp < 45 ? `${formatNumber(hs, temp, 1)}°` : null, Number.isFinite(ph) ? `pH ${formatNumber(hs, ph, 1)}` : null, online === "off" ? t("pool_offline_short") : null].filter(Boolean).join(" · ") || t("unavailable");
      bar.hidden = true;
    }
  };
  el.update(ctx.hass);
  return el;
}

/** A tile for a washer, dryer, dishwasher or printer: state and time left, a progress bar, tap opens its popup. */
function createDeviceTile(ctx, key, { container, variant = "tile" }) {
  const hass = ctx.hass;
  const dev = key.slice(4);
  const printer = key.startsWith("prn:");
  const p = printer ? printerOf(hass, dev) : null;
  const d = hass.devices?.[dev];
  const areaId = container.startsWith("room:") ? container.slice(5) : d?.area_id;
  const kind = printer ? "printer" : applianceKind(`${d?.name_by_user || d?.name || ""} ${d?.model || ""}`);
  const ICONS = { printer: "mdi:printer-3d-nozzle", dryer: "mdi:tumble-dryer", dish: "mdi:dishwasher", washer: "mdi:washing-machine" };
  const row = variant === "row";
  const el = h("div", { class: `hp-tile hp-${variant} hp-devtile ${kind}`, dataset: { key, domain: "sensor" }, tabindex: "0", role: "button" });
  const iconBox = h("div", { class: "hp-tile-icon" }, icon(ICONS[kind]));
  const nameEl = h("div", { class: "hp-tile-name" }, printer ? printerName(hass, p) : d?.name_by_user || d?.name || "");
  const stateEl = h("div", { class: "hp-tile-state" });
  const text = h("div", { class: "hp-tile-text" }, nameEl, stateEl);
  const fill = h("i", {});
  const bar = h("div", { class: "hp-cover-bar" }, fill);
  if (row) el.append(iconBox, text);
  else el.append(h("div", { class: "hp-tile-top" }, iconBox), text, bar);
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide"), title: t("hide") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.hideItem(container, key);
  });
  el.append(minus);
  const open = () => (printer ? openPrinter(ctx, printerOf(ctx.hass, dev)) : openAppliance(ctx, dev));
  bindTapHold(el, { canStart: () => !ctx.editing, tap: open, hold: open });
  el.update = (hs) => {
    let txt;
    let pct = null;
    let on;
    if (printer) {
      const pp = printerOf(hs, dev);
      txt = pp && printerText(hs, pp);
      on = !!txt;
      const st = pp && hs.states[pp.status]?.state;
      if (on) pct = Number(hs.states[pp.progress]?.state);
      if (!txt) txt = st ? hs.formatEntityState?.(hs.states[pp.status]) || st : t("unavailable");
    } else {
      const a = appliancesIn(hs, areaId).find((x) => x.dev === dev);
      const run = a && runningAppliances(hs).find((x) => x.name.toLowerCase() === (d?.name_by_user || d?.name || "").toLowerCase() && x.area === areaId);
      txt = run?.text;
      on = !!txt;
      if (run) pct = Number(hs.states[run.progress]?.state);
      if (!txt) {
        const st = a && hs.states[a.state];
        txt = st ? (["off", "idle", "ready", "inactive"].includes(st.state) ? t("off") : hs.formatEntityState?.(st) || st.state) : t("unavailable");
      }
    }
    el.classList.toggle("on", on);
    stateEl.textContent = txt;
    fill.style.width = `${on && pct > 0 ? Math.min(100, pct) : 0}%`;
    bar.hidden = !on;
  };
  el.update(hass);
  return el;
}

/** A printing 3D printer as a pill: "Bambu P1S · 15 % · 1:25 h left". */
function printerPill(ctx, p) {
  const name = h("b", {}, printerName(ctx.hass, p));
  const sub = h("small", {});
  const el = h("div", { class: "hp-onpill appliance printer on", role: "button", tabindex: "0", dataset: { key: `prn:${p.dev}` } },
    h("span", { class: "hp-onpill-ic" }, icon("mdi:printer-3d-nozzle")), h("div", { class: "hp-onpill-text" }, name, sub));
  bindTapHold(el, { canStart: () => !ctx.editing, tap: () => openPrinter(ctx, p), hold: () => openPrinter(ctx, p) });
  el.update = (hass) => {
    sub.textContent = printerText(hass, p) || "";
  };
  el.update(ctx.hass);
  return el;
}

/** Lights and sockets that are on right now, and appliances that run, as small pills. */
export function onNowBlock(ctx) {
  // Only lights (the 3D printer's too) and sockets meant for switching: no fans, robot settings, sprinklers, screens or helpers.
  const NOT_A_LAMP = /\bscreen\b|bildschirm|status ?led|indicator/i;
  const SOCKET = /plug|steckdose|socket|outlet|zwischenstecker|power strip|steckerleiste/i;
  const HELPER_PLATFORMS = new Set(["browser_mod", "group", "template", "fully_kiosk"]);
  const label = (id) => {
    const e = ctx.hass.entities?.[id];
    const dev = e?.device_id ? ctx.hass.devices?.[e.device_id] : null;
    return `${ctx.hass.states[id]?.attributes.friendly_name || ""} ${id} ${dev?.model || ""} ${dev?.name || ""}`;
  };
  let plugs = new Set();
  const ids = () => (plugs = linkedPlugEntities(ctx.hass), ctx.model.all).filter((id) => {
    const d = domainOf(id);
    const st = ctx.hass.states[id];
    if (!isOn(st)) return false;
    if (HELPER_PLATFORMS.has(ctx.hass.entities?.[id]?.platform)) return false;
    if (plugs.has(id)) return false;
    if (d === "light") return !NOT_A_LAMP.test(label(id));
    if (d === "switch") {
      if (ctx.settings.s.meters?.[id]) return false;
      return st.attributes.device_class === "outlet" || SOCKET.test(label(id));
    }
    return false;
  });
  const count = h("span", { class: "hp-count" });
  const box = h("div", { class: "hp-onnow" });
  const LIMIT = ctx._forceLayout === "phone" || ctx.narrow ? 6 : 8;
  let all = false;
  const more = h("button", { class: "hp-chip hp-onnow-more" });
  more.addEventListener("click", () => { all = !all; sig = null; el.update(ctx.hass); });
  const empty = h("div", { class: "hp-muted small hp-onnow-empty" }, t("on_now_none"));
  const el = h("section", { class: "hp-onnow-sec" }, h("div", { class: "hp-label hp-home-label" }, t("on_now"), count), box, more, empty);
  let sig = null;
  let tiles = [];
  el.update = (hass) => {
    const apps = runningAppliances(hass);
    const prns = runningPrinters(hass);
    // A printing printer stands for its chamber light.
    const lightsOf = new Set(prns.map((p) => p.light).filter(Boolean));
    const now = [...apps.map((a) => `app:${a.dev}`), ...prns.map((p) => `prn:${p.dev}`), ...ids().filter((id) => !lightsOf.has(id))];
    const next = now.join();
    if (next + all !== sig) {
      sig = next + all;
      const shown = all ? now : now.slice(0, LIMIT);
      tiles = shown.map((id) => (id.startsWith("app:") ? appliancePill(ctx, apps.find((a) => `app:${a.dev}` === id))
        : id.startsWith("prn:") ? printerPill(ctx, prns.find((p) => `prn:${p.dev}` === id)) : onPill(ctx, id)));
      box.replaceChildren(...tiles);
      more.hidden = now.length <= LIMIT;
      more.replaceChildren(icon(all ? "mdi:chevron-up" : "mdi:chevron-down"), all ? t("show_less") : t("n_more", { n: now.length - LIMIT }));
    }
    tiles.forEach((tl) => tl.update(hass));
    count.textContent = now.length ? String(now.length) : "";
    count.hidden = !now.length;
    box.hidden = !now.length;
    empty.hidden = !!now.length;
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

/** Home body below the chips and scenes: all rooms, or "On now" and your own favourites. */
function homeBody(ctx, layout) {
  if (ctx.settings.s.homeStyle !== "favorites") return layout === "list" ? listOverview(ctx) : overview(ctx);
  const container = "home:favs";
  return h("div", { class: "hp-home-fav" }, onNowBlock(ctx),
    h("div", { class: "hp-label hp-home-label" }, t("fav_title")),
    overview(ctx, { container, own: true, onAdd: () => openFavPicker(ctx, container) }));
}

const HEAT_ONLY = (st) => !(st?.attributes.hvac_modes || []).some((m) => m === "cool" || m === "dry" || m === "fan_only" || m === "heat_cool");

/** Default place of a tile in a room: heating, shades, air conditioning, lights, sockets, the rest. */
function tileRank(ctx, id) {
  if (/^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(id)) return 4;
  const st = ctx.hass.states[id];
  const d = domainOf(id);
  if (d === "water_heater" || (d === "climate" && HEAT_ONLY(st))) return 0;
  if (d === "cover" && !NOT_SHADE.has(st?.attributes.device_class)) return 1;
  if (d === "climate") return 2;
  if (d === "light") return 3;
  if (d === "switch" || ctx.settings.s.meters?.[id] || st?.attributes.device_class === "power") return 4;
  return 5;
}

/** Rooms: the default order until the tiles are arranged by hand (separators stay at the end). */
export const roomSort = (ctx) => (keys) => keys
  .map((k, i) => ({ k, i, r: k.startsWith("sep:") ? 9 : tileRank(ctx, k) }))
  .sort((a, b) => a.r - b.r || a.i - b.i)
  .map((x) => x.k);

/** Tiles of one container, sortable in edit mode. */
export function itemsBox(ctx, g, variant) {
  const arranged = ctx.settings.arrange(g.container, g.items, exists(ctx), g.sort || null);
  const hidden = arranged.hidden;
  // Sockets that belong to a machine tile, even when added by hand.
  let items = g.exclude ? arranged.items.filter((k) => !g.exclude.has(k)) : arranged.items;
  // Shades of a room as one tile (setting): it takes the place of the first shade.
  const gkey = g.shadeGroup ? shadeGroupKey(g.shadeGroup.areaId) : null;
  const grouped = gkey ? items.filter((k) => g.shadeGroup.ids.includes(k)) : [];
  if (grouped.length > 1) {
    const first = grouped[0];
    items = items.filter((k) => k === first || !grouped.includes(k)).map((k) => (k === first ? gkey : k));
  }
  const expand = (keys) => keys.flatMap((k) => (k === gkey ? grouped : [k]));
  const custom = !!g.sort && !!(ctx.settings.cont(g.container).order || []).length;
  const box = h("div", { class: `hp-items ${variant}`, dataset: { container: g.container } });
  for (const key of items) {
    let el;
    if (key.startsWith("sep:")) el = createSeparator(ctx, g.container, key, ctx.settings.sepTitle(g.container, key));
    else if (/^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(key)) el = deviceKeyTile(ctx, key, { container: g.container, variant: variant === "list" ? "row" : "tile" });
    else if (key === gkey) {
      el = createShadeGroupTile(ctx, { ids: grouped, areaName: g.areaName, container: g.container, key,
        variant: variant === "list" ? "row" : "tile" });
    } else {
      const size = g.forceSize || ctx.settings.size(key);
      el = createTile(ctx, key, { size, areaName: g.areaName, variant: variant === "list" ? "row" : variant === "focus" ? "focus" : "tile", container: g.container });
    }
    ctx.live.push(el);
    box.append(el);
  }
  if (variant !== "list") {
    const add = h("button", { class: "hp-addcard" }, h("span", {}, icon("mdi:plus")), t("add_devices"));
    add.addEventListener("click", () => ctx.openAdd(g.container, g.items, g.addDomains));
    box.append(add);
  }
  sortable(box, { onDrop: (keys) => ctx.settings.setOrder(g.container, expand(keys)), axis: variant === "list" ? "y" : undefined });
  const wrap = h("div", { class: "hp-items-wrap" }, box);
  if (!items.length && !ctx.editing) wrap.append(h("div", { class: "hp-empty small" }, g.emptyText || t("empty_group")));
  wrap.append(h("div", { class: "hp-edit-tools" },
    variant === "list" ? h("button", { class: "hp-chip", onclick: () => ctx.openAdd(g.container, g.items, g.addDomains) }, icon("mdi:plus"), t("add")) : null,
    h("button", { class: "hp-chip", onclick: async () => {
      const title = await ctx.prompt(t("separator_title"), "");
      if (title !== null) ctx.settings.addSeparator(g.container, title, items);
    } }, icon("mdi:minus"), t("separator")),
    hidden.length ? h("button", { class: "hp-chip", onclick: () => ctx.openHidden(g.container, hidden, g.title) }, icon("mdi:eye-off-outline"), t("hidden_n", { n: hidden.length })) : null,
    custom ? h("button", { class: "hp-chip", onclick: () => { ctx.settings.resetOrder(g.container); ctx.toast(t("default_order_done")); } }, icon("mdi:sort"), t("default_order")) : null));
  return wrap;
}

/** One room: "1 LIGHT ON", the name, Turn on/off, scenes and devices. */
export function roomView(ctx, area, variant = "grid", { big = false, hideName = false } = {}) {
  const label = h("div", { class: "hp-label" });
  const g = { container: `room:${area.id}`, title: area.name, items: roomItems(ctx, area), areaName: area.name, sort: roomSort(ctx), exclude: machineParts(ctx) };
  if (ctx.settings.s.groupShades) {
    const ids = area.tiles.filter((id) => domainOf(id) === "cover" && !NOT_SHADE.has(ctx.hass.states[id]?.attributes.device_class));
    if (ids.length > 1) g.shadeGroup = { areaId: area.id, ids };
  }
  const on = h("button", { class: "hp-btn" }, icon("mdi:lightbulb-outline"), t("turn_on"));
  const off = h("button", { class: "hp-btn solid" }, icon("mdi:power"), t("turn_off"));
  let stats;
  on.addEventListener("click", () => switchRoom(ctx, stats, true));
  off.addEventListener("click", () => switchRoom(ctx, stats, false));
  const chips = h("div", { class: "hp-room-chips" });
  const head = h("div", { class: "hp-room-head" },
    h("div", {}, label, h("div", { class: "hp-room-title", role: "button", title: t("rp_glance"), onclick: (e) => { if (!ctx.editing && !e.target.closest(".hp-room-chips")) openRoomPopup(ctx, area.id); } }, hideName ? null : area.name, chips)),
    h("div", { class: "hp-status-btns" }, on, off));
  head.update = (hass) => {
    stats = roomStats(ctx, area);
    label.textContent = stats.lights.length
      ? (stats.on ? t(stats.on === 1 ? "one_light_on" : "lights_on", { n: stats.on }) : t("all_lights_off"))
      : onText(stats);
    on.parentElement.hidden = !stats.lights.length;
    const parts = [];
    const tmp = roomTemp(ctx, area);
    if (tmp) parts.push(["mdi:thermometer", tmp]);
    const hum = area.humidity && hass.states[area.humidity];
    if (hum && !isNaN(Number(hum.state))) parts.push(["mdi:water-percent", `${formatNumber(hass, hum.state, 0)} %`]);
    const sig = parts.map((p) => p.join()).join("|");
    if (chips.dataset.sig !== sig) {
      chips.dataset.sig = sig;
      chips.replaceChildren(...parts.map(([i, v]) => h("span", { class: "hp-room-chip" }, icon(i), v)));
    }
  };
  head.update(ctx.hass);
  ctx.live.push(head);
  const content = variant === "list"
    ? h("div", { class: "hp-list-card" }, itemsBox(ctx, g, "list"))
    : itemsBox(ctx, g, big ? "focus" : "grid");
  return h("div", { class: "hp-room-view" }, head, scenesBlock(ctx, `scenes:${area.id}`, area.scenes, area.name), content);
}

/** Rooms grouped by floor, in Home Assistant's floor order; inside a floor the rooms keep their own order. */
export function roomsByFloor(ctx) {
  const groups = new Map(Object.values(ctx.hass.floors || {}).map((f) => [f.floor_id, { floor: f, rooms: [] }]));
  const rest = { floor: null, rooms: [] };
  for (const a of ctx.roomList()) (groups.get(a.floor?.floor_id) || rest).rooms.push(a);
  return [...groups.values(), rest].filter((g) => g.rooms.length);
}

/** Heading of a floor group; null when there is only one group. */
export function floorHeading(groups, g, cls, ctx = null) {
  if (groups.length < 2) return null;
  const el = h("div", { class: cls }, icon(g.floor?.icon || "mdi:layers-outline"), h("span", {}, g.floor ? g.floor.name : t("no_floor")));
  // With ctx: buttons for the whole floor (all lights, all shades up / down).
  const ctl = ctx && g.floor ? floorControls(ctx, g.rooms, g.floor.name) : null;
  if (ctl) {
    el.classList.add("has-ctl");
    el.append(h("i", { class: "line" }), ctl);
  }
  return el;
}

/**
 * Buttons for a whole floor: the lights (off when one is on, else on) and the shades (up, down).
 * Only the ones the floor has; null without any.
 */
export function floorControls(ctx, rooms, floorName) {
  const stats = () => rooms.filter((a) => a.id !== "_other").map((a) => roomStats(ctx, a));
  const lights = () => stats().flatMap((x) => x.lights);
  const shades = () => stats().flatMap((x) => x.shades);
  if (!lights().length && !shades().length) return null;
  const btn = (ic, label, fn) => {
    const b = h("button", { class: "hp-floor-btn", "aria-label": `${label} · ${floorName}`, title: `${label} · ${floorName}` }, icon(ic));
    b.addEventListener("pointerdown", (e) => e.stopPropagation());
    b.addEventListener("click", (e) => { e.stopPropagation(); if (!ctx.editing) fn(); });
    return b;
  };
  const box = h("div", { class: "hp-floor-ctl" });
  let lightB = null;
  if (lights().length) {
    lightB = btn("mdi:lightbulb-group-outline", t("floor_lights"), () => {
      const ids = lights();
      const anyOn = ids.some((id) => isOn(ctx.hass.states[id]));
      ctx.hass.callService("light", anyOn ? "turn_off" : "turn_on", { entity_id: ids });
    });
    box.append(lightB);
  }
  if (shades().length) {
    box.append(btn("mdi:arrow-up", t("floor_shades_up"), () => ctx.hass.callService("cover", "open_cover", { entity_id: shades() })),
      btn("mdi:arrow-down", t("floor_shades_down"), () => ctx.hass.callService("cover", "close_cover", { entity_id: shades() })));
  }
  box.update = (hass) => {
    if (!lightB) return;
    const on = lights().some((id) => isOn(hass.states[id]));
    lightB.classList.toggle("on", on);
    lightB.firstChild.icon = on ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline";
  };
  box.update(ctx.hass);
  ctx.live.push(box);
  return box;
}

/** Room menu: Overview (optional) and every room by floor, with a count of the lights that are on. */
export function roomNav(ctx, selected, { overview: withOverview = false, allRooms = false } = {}) {
  const nav = h("nav", { class: "hp-room-nav" });
  const item = (key, label, ic, count, onClick) => {
    const b = h("button", { class: `hp-nav-item ${selected === key ? "active" : ""}` },
      h("span", { class: "hp-nav-ic" }, icon(ic)), h("span", {}, label), count ? h("b", {}, String(count)) : null);
    b.addEventListener("click", onClick);
    return b;
  };
  if (withOverview) nav.append(item("overview", t("overview"), "mdi:home-outline", 0, () => ctx.goTab("home")));
  if (allRooms) nav.append(item("all", t("rooms_all"), "mdi:view-grid-outline", 0, () => { ctx.roomPage = null; ctx.rerender(); }));
  const groups = roomsByFloor(ctx);
  for (const g of groups) {
    const head = floorHeading(groups, g, "hp-nav-floor");
    if (head) nav.append(head);
    for (const a of g.rooms) {
      const s = roomStats(ctx, a);
      nav.append(item(a.id, a.name || t("other"), a.icon || "mdi:texture-box", s.on, () => ctx.openRoom(a.id)));
    }
  }
  return nav;
}

/** Tiles grouped by room, for Media, Security, Scenes and own pages. */
export function groupsBox(ctx, groups, variant, page) {
  const box = h("div", { class: `hp-groups ${variant}` });
  for (const g of groups) {
    const sec = h("section", { class: "hp-group", dataset: g.sortKey ? { key: g.sortKey } : {} },
      groups.length > 1 || g.showTitle ? h("div", { class: "hp-group-head" },
        g.sortKey ? h("span", { class: "hp-handle" }, icon("mdi:drag")) : null,
        h("div", { class: "hp-group-title" }, g.title)) : null,
      variant === "list" ? h("div", { class: "hp-list-card" }, itemsBox(ctx, g, "list")) : itemsBox(ctx, g, variant));
    box.append(sec);
  }
  const sortC = groups[0]?.sortContainer;
  if (sortC) sortable(box, { onDrop: (keys) => ctx.settings.setOrder(sortC, keys), handle: ".hp-handle", axis: "y" });
  if (page?.hiddenGroups?.length && ctx.editing) {
    box.append(h("div", { class: "hp-edit-tools" },
      h("button", { class: "hp-chip", onclick: () => ctx.openHidden(sortC, page.hiddenGroups, t("rooms")) }, icon("mdi:eye-off-outline"), t("hidden_rooms_n", { n: page.hiddenGroups.length }))));
  }
  return box;
}

/** List layout on Home: each room as a card with its rows and a master switch. */
function listOverview(ctx) {
  const cols = h("div", { class: "hp-list-cols" });
  for (const a of ctx.roomList()) {
    const stats0 = roomStats(ctx, a);
    if (!stats0.items.length) continue;
    const sub = h("small", { class: "hp-sub" });
    const sw = h("button", { class: "hp-switch", role: "switch" }, h("span"));
    const head = h("div", { class: "hp-list-head" }, h("div", { class: "hp-tile-icon" }, icon(a.icon || "mdi:texture-box")),
      h("div", {}, h("b", {}, a.name || t("other")), sub), sw);
    let stats = stats0;
    sw.addEventListener("click", () => switchRoom(ctx, stats, !stats.on));
    head.update = () => {
      stats = roomStats(ctx, a);
      head.classList.toggle("on", stats.on > 0);
      sub.textContent = onText(stats);
      sw.classList.toggle("on", stats.on > 0);
      sw.hidden = !stats.lights.length;
    };
    head.update();
    ctx.live.push(head);
    const g = { container: `room:${a.id}`, title: a.name, items: a.tiles, areaName: a.name, sort: roomSort(ctx) };
    cols.append(h("div", { class: "hp-list-card" }, head, itemsBox(ctx, g, "list")));
  }
  return cols;
}

// ---------------------------------------------------------------- layouts

function sidePanel(ctx, selected, { allRooms = false } = {}) {
  const date = h("div", { class: "hp-date" });
  const clock = h("div", { class: "hp-clock" });
  clock.update = (hass) => {
    const now = new Date();
    clock.textContent = formatTime(hass, now);
    date.textContent = formatDate(hass, now, { weekday: "long", month: "long", day: "2-digit" });
  };
  clock.update(ctx.hass);
  ctx.clocks.push(clock);
  // Rooms tab: the room list below, scrolling on its own, so every room fits.
  if (selected && selected !== "overview") {
    const rooms = roomNav(ctx, selected, { allRooms });
    requestAnimationFrame(() => rooms.querySelector(".hp-nav-item.active")?.scrollIntoView({ block: "nearest" }));
    return h("aside", { class: "hp-side-panel rooms" }, date, clock, h("div", { class: "hp-side-sep" }), rooms);
  }
  // With the "Coming up" widget the calendar and reminder buttons would only repeat it.
  const side = { ...SIDE_DEFAULTS, ...(ctx.settings.s.side || {}) };
  return h("aside", { class: "hp-side-panel" }, date, clock, side.agenda ? null : ctx.agendaButtons(), h("div", { class: "hp-side-sep" }),
    ...sideWidgets(ctx, { statusBlock, roomNav, selected, scenes: () => scenesBlock(ctx, "scenes:home", ctx.allScenes(), t("scenes")), onNow: () => onNowBlock(ctx) }));
}

function focusHome(ctx) {
  const date = h("div", { class: "hp-date" });
  const clock = h("div", { class: "hp-focus-clock" });
  const line = h("div", { class: "hp-focus-line" });
  clock.update = (hass) => {
    const now = new Date();
    clock.textContent = formatTime(hass, now);
    date.textContent = formatDate(hass, now, { weekday: "long", month: "long", day: "numeric" });
    const w = ctx.weather.current();
    const n = ctx.model.lights.filter((id) => ctx.model.areaOf[id] && isOn(hass.states[id])).length;
    const parts = [w ? `${formatNumber(hass, w.temperature, 0)}° · ${w.label}` : null, n ? t(n === 1 ? "one_light_home" : "lights_home", { n }) : t("all_lights_off")].filter(Boolean);
    const sig = parts.join("|");
    if (line.dataset.sig !== sig) {
      line.dataset.sig = sig;
      line.replaceChildren(...parts.map((p) => h("span", {}, p)), ctx.agendaButtons());
    }
  };
  clock.update(ctx.hass);
  ctx.clocks.push(clock);
  ctx.live.push(clock);
  const rooms = h("div", { class: "hp-focus-rooms" });
  for (const a of ctx.roomList()) {
    const s = roomStats(ctx, a);
    const pill = h("button", { class: `hp-room-pill ${s.on ? "lit" : ""}` }, icon(a.icon || "mdi:texture-box"), a.name || t("other"), s.on ? h("b", {}, String(s.on)) : null);
    pill.addEventListener("click", () => ctx.tapRoom(a.id));
    rooms.append(pill);
  }
  return h("div", { class: "hp-focus-home" }, date, clock, line, noticesBlock(ctx), parcelsBlock(ctx),
    scenesBlock(ctx, "scenes:home", ctx.allScenes(), t("scenes")), rooms);
}

/** One room per screen; swipe sideways. */
function focusRooms(ctx, selected) {
  const rooms = ctx.roomList();
  const track = h("div", { class: "hp-focus-track" });
  const dots = h("div", { class: "hp-focus-dots" });
  const slides = rooms.map((a, i) => {
    const slide = h("section", { class: "hp-focus-slide", dataset: { i, room: a.id } }, roomView(ctx, a, "focus", { big: true }));
    track.append(slide);
    dots.append(h("button", { class: "hp-dot", "aria-label": a.name, onclick: () => go(i) }));
    return slide;
  });
  let cur = Math.max(0, rooms.findIndex((a) => a.id === selected));
  const go = (i) => {
    i = Math.max(0, Math.min(slides.length - 1, i));
    slides[i]?.scrollIntoView({ behavior: "smooth", inline: "start", block: "nearest" });
  };
  const setActive = (i) => {
    cur = i;
    ctx.roomSel = rooms[i]?.id;
    [...dots.children].forEach((d, j) => d.classList.toggle("active", i === j));
  };
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) if (e.isIntersecting && e.intersectionRatio > 0.6) setActive(Number(e.target.dataset.i));
  }, { root: track, threshold: [0.6] });
  slides.forEach((s) => io.observe(s));
  setActive(cur);
  requestAnimationFrame(() => { if (slides[cur]) track.scrollLeft = slides[cur].offsetLeft; });
  const nav = h("div", { class: "hp-focus-nav" },
    h("button", { class: "hp-round", "aria-label": t("previous"), onclick: () => go(cur - 1) }, icon("mdi:chevron-left")),
    dots,
    h("button", { class: "hp-round", "aria-label": t("next"), onclick: () => go(cur + 1) }, icon("mdi:chevron-right")));
  return [track, slides.length > 1 ? nav : null];
}

/** Home in every layout. */
/** Panel layout: scenes sit in the left panel unless switched off there. */
const sideScenes = (ctx) => ({ ...SIDE_DEFAULTS, ...(ctx.settings.s.side || {}) }).scenes;

export function renderHome(ctx, layout) {
  if (layout === "focus") return h("div", { class: "hp-layout hp-layout-focus" }, h("div", { class: "hp-focus-slide" }, focusHome(ctx)));
  const scenes = scenesBlock(ctx, "scenes:home", ctx.allScenes(), t("scenes"));
  if (layout === "sidebar" && !ctx.narrow) {
    return h("div", { class: "hp-layout hp-layout-sidebar" }, sidePanel(ctx, "overview"),
      h("div", { class: "hp-side-main" }, h("div", { class: "hp-side-title" }, t("tab_home")), homeCats(ctx), sideScenes(ctx) ? null : scenes, noticesBlock(ctx), parcelsBlock(ctx),
        ctx.settings.s.homeStyle === "favorites" ? null : h("div", { class: "hp-label hp-rooms-label" }, t("rooms")), homeBody(ctx, layout)));
  }
  return h("div", { class: "hp-layout hp-layout-home" }, homeCats(ctx), scenes, noticesBlock(ctx), parcelsBlock(ctx), homeBody(ctx, layout));
}

/**
 * Every room at once, by floor, for the Rooms tab when rooms open as a popup: big cards, rows or compact rows
 * (switch top right). A tap opens the room popup, holding the room's full page.
 */
function roomsOverview(ctx) {
  const mode = ["cards", "rows", "compact"].includes(ctx.settings.s.roomsView) ? ctx.settings.s.roomsView : "cards";
  const view = (m, ic, label) => {
    const b = h("button", { class: `hp-ph-view ${mode === m ? "active" : ""}`, "aria-label": label, title: label }, icon(ic));
    b.addEventListener("click", () => mode !== m && ctx.settings.update((x) => { x.roomsView = m; }));
    return b;
  };
  const switcher = h("div", { class: "hp-rooms-views" }, view("cards", "mdi:view-grid-outline", t("rooms_v_cards")),
    view("rows", "mdi:view-agenda-outline", t("rooms_v_rows")), view("compact", "mdi:view-module-outline", t("rooms_v_compact")));
  const box = h("div", { class: `hp-rooms-all ${mode}` });
  const groups = roomsByFloor(ctx);
  for (const g of groups) {
    const head = floorHeading(groups, g, "hp-rooms-floor", ctx);
    if (head) box.append(head);
    for (const a of g.rooms) {
      if (mode === "cards") { box.append(roomCard(ctx, a, "rooms")); continue; }
      const sub = h("small");
      const power = h("button", { class: "hp-power", "aria-label": t("power") }, icon("mdi:power"));
      const pres = h("span", { class: "hp-presence", hidden: true, title: t("rp_motion_now") }, icon("mdi:account"));
      const row = h("div", { class: `hp-card hp-ph-room ${mode === "compact" ? "mini" : ""}`, role: "button", tabindex: "0" },
        h("div", { class: "hp-tile-icon" }, icon(a.icon || "mdi:texture-box")), h("div", { class: "hp-ph-room-text" }, h("b", {}, a.name || t("other")), sub), pres, power);
      let stats;
      power.addEventListener("pointerdown", (e) => e.stopPropagation());
      power.addEventListener("click", (e) => { e.stopPropagation(); switchRoom(ctx, stats, !stats.on); });
      bindTapHold(row, { canStart: () => !ctx.editing, tap: () => ctx.tapRoom(a.id), hold: () => ctx.holdRoom(a.id) });
      row.update = () => {
        stats = roomStats(ctx, a);
        row.classList.toggle("lit", stats.lightsOn > 0);
        power.hidden = !stats.lights.length;
        const txt = [onText(stats), roomTemp(ctx, a)].filter(Boolean).join(" · ");
        if (sub.textContent !== txt) sub.textContent = txt;
        pres.hidden = !(ctx.prefs?.roomMotion && roomPresence(ctx.hass, a)?.on);
      };
      row.update();
      ctx.live.push(row);
      box.append(row);
    }
  }
  return h("div", { class: "hp-layout hp-layout-roomsall" }, switcher, box);
}

/** The Rooms tab in every layout. */
export function renderRooms(ctx, layout) {
  const rooms = ctx.roomList();
  const sel = rooms.find((a) => a.id === ctx.roomSel) || rooms[0];
  if (!sel) return h("div", { class: "hp-layout" }, h("div", { class: "hp-empty" }, t("no_rooms")));
  // Rooms open as a popup: the tab shows all of them; the full page of one comes up by holding it.
  const popup = ctx.settings.s.roomPopup !== false;
  const overviewOk = popup && (layout === "grid" || layout === "list" || layout === "sidebar");
  if (overviewOk && !ctx.roomPage && !ctx.editing) {
    if (layout === "sidebar" && !ctx.narrow) return h("div", { class: "hp-layout hp-layout-sidebar" }, sidePanel(ctx, null), h("div", { class: "hp-side-main" }, roomsOverview(ctx)));
    return roomsOverview(ctx);
  }
  ctx.roomSel = sel.id;
  if (layout === "focus") return h("div", { class: "hp-layout hp-layout-focus" }, ...focusRooms(ctx, sel.id));
  if (layout === "sidebar" && !ctx.narrow) {
    return h("div", { class: "hp-layout hp-layout-sidebar" }, sidePanel(ctx, sel.id, { allRooms: overviewOk }), h("div", { class: "hp-side-main" }, roomView(ctx, sel, "grid")));
  }
  return h("div", { class: "hp-layout hp-layout-rooms" }, h("div", { class: "hp-rooms" }, roomNav(ctx, sel.id, { allRooms: overviewOk }), roomView(ctx, sel, layout === "list" ? "list" : "grid")));
}

/** Media, Security, Scenes and own pages. */
export function renderPage(ctx, layout, page) {
  const variant = layout === "list" ? "list" : layout === "focus" ? "focus" : "grid";
  const body = h("div", {}, page.title ? h("div", { class: "hp-room-head" }, h("div", {}, h("div", { class: "hp-label" }, page.label || ""), h("div", { class: "hp-room-title" }, page.title))) : null,
    page.top, groupsBox(ctx, page.groups, variant, page));
  if (layout === "sidebar" && !ctx.narrow) {
    return h("div", { class: "hp-layout hp-layout-sidebar" }, sidePanel(ctx, null), h("div", { class: "hp-side-main" }, body));
  }
  return h("div", { class: "hp-layout" }, body);
}
