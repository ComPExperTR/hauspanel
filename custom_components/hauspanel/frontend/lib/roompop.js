// Room popup: a glowing card with the temperature ring on top, big control tiles (light, shades, music, switches),
// the room's own devices, scenes, and closed sections with every lamp, shade, switch and player.
import { h, icon, domainOf, slider, toggleSwitch, lightColor, entityName } from "./util.js";
import { isOn } from "./model.js";
import { entityIcon, tapAction } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { openThermostat } from "./thermostat.js";
import { t } from "./i18n.js";
import { num, fmt, svgEl, since } from "./popkit.js";
import { openGate, isGate } from "./gate.js";
import { deviceKeyTile, deviceKeyInfo, roomItems, machineParts } from "./layouts.js";
import { createTile } from "./tile.js";

const NOT_SHADE = new Set(["garage", "gate", "door", "damper"]);
/** Which sections were opened, per room, while the panel is open. */
const OPEN = new Map();
const posOf = (st) => st?.attributes.current_position ?? (st?.state === "closed" ? 0 : 100);
const pctOf = (st) => (isOn(st) ? (st.attributes.brightness != null ? Math.round((st.attributes.brightness / 255) * 100) : 100) : 0);
const dimmable = (st) => (st?.attributes.supported_color_modes || []).some((m) => m !== "onoff");

export function openRoomPopup(ctx, areaId) {
  const hass = ctx.hass;
  const area = ctx.model.areaById.get(areaId);
  if (!area) return;
  // The room's devices as arranged in HausPanel (hidden ones stay out, added ones come in).
  // Same list as the room page: machine sockets, car and heat pump parts stay inside their own tiles.
  const parts = machineParts(ctx);
  const arranged = ctx.settings.arrange(`room:${areaId}`, roomItems(ctx, area), (k) => !!hass.states[k] || /^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(k)).items.filter((k) => !parts.has(k));
  const tiles = arranged.filter((id) => hass.states[id]);
  const lights = tiles.filter((id) => domainOf(id) === "light");
  const shades = tiles.filter((id) => domainOf(id) === "cover" && !NOT_SHADE.has(hass.states[id]?.attributes.device_class));
  const covers = tiles.filter((id) => domainOf(id) === "cover" && NOT_SHADE.has(hass.states[id]?.attributes.device_class));
  // Heating goes into the ring; an air conditioner next to it gets its own tile.
  const climates = tiles.filter((id) => domainOf(id) === "climate");
  const heatOnly = (id) => !(hass.states[id]?.attributes.hvac_modes || []).some((m) => ["cool", "heat_cool", "dry", "fan_only"].includes(m));
  const climate = climates.find(heatOnly) || climates[0];
  const acs = climates.filter((id) => id !== climate);
  const players = tiles.filter((id) => domainOf(id) === "media_player");
  const switches = tiles.filter((id) => ["switch", "fan", "input_boolean"].includes(domainOf(id)) && !ctx.settings.s.meters?.[id]);
  const locks = tiles.filter((id) => domainOf(id) === "lock");
  const windows = area.all.filter((id) => domainOf(id) === "binary_sensor" && ["window", "opening"].includes(hass.states[id]?.attributes.device_class));
  const humidity = area.humidity;
  // Generic names ("Einschalter", "Switch 0", "Relay") get their device's name instead.
  const GENERIC = /^(einschalter|ausschalter|schalter|switch|relay|relais|power|steckdose|socket|output|kanal|channel)\b[\s\d_-]*$/i;
  const name = (id) => {
    const n = entityName(ctx.hass, id, area.name);
    if (!GENERIC.test(n.trim())) return n;
    const d = ctx.hass.devices?.[ctx.hass.entities?.[id]?.device_id];
    const dn = (d?.name_by_user || d?.name || "").replace(new RegExp(`^${area.name}\\s*`, "i"), "").trim();
    return dn || n;
  };
  const sheet = openSheet(ctx, { title: area.name, subtitle: area.floor?.name || "", cls: "appliance roompop" });
  const updaters = [];

  // ---- hero: a temperature ring (target as arc, room temperature as a dot), glowing warm while heating
  const START = 135;
  const SWEEP = 270;
  const R = 50;
  const pt = (deg) => [60 + R * Math.cos((deg * Math.PI) / 180), 60 + R * Math.sin((deg * Math.PI) / 180)];
  const arcD = (from, to) => {
    const [x1, y1] = pt(from);
    const [x2, y2] = pt(to);
    return `M${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${to - from > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
  };
  const ring = svgEl("svg", { viewBox: "0 0 120 120", class: "hp-rp-ring" });
  const gid = `rpg${Math.random().toString(36).slice(2, 7)}`;
  const defs = svgEl("defs");
  const grad = svgEl("linearGradient", { id: gid, x1: 0, y1: 1, x2: 1, y2: 0 });
  grad.append(svgEl("stop", { offset: 0, "stop-color": "#6fb4ff" }), svgEl("stop", { offset: ".55", "stop-color": "#ffc069" }), svgEl("stop", { offset: 1, "stop-color": "#ff7a45" }));
  defs.append(grad);
  const fillArc = svgEl("path", { class: "fill", stroke: `url(#${gid})` });
  const dot = svgEl("circle", { r: 5, class: "dot" });
  ring.append(defs, svgEl("path", { d: arcD(START, START + SWEEP), class: "track" }), fillArc, dot);
  const temp = h("b", { class: "big" });
  const tsub = h("small");
  const dial = h("div", { class: "hp-rp-dial", role: climate ? "button" : null }, ring, h("div", { class: "mid" }, temp, tsub));
  if (climate) dial.addEventListener("click", () => openThermostat(ctx, climate));
  const hum = h("b");
  const humBox = h("div", { class: "hp-rp-fact" }, icon("mdi:water-percent"), h("div", {}, hum, h("small", {}, t("th_humidity"))));
  const state = h("div", { class: "hp-rp-fact state" });
  const pills = h("div", { class: "hp-rp-facts" });
  const hero = h("div", { class: `hp-rp-hero2 ${climate ? "" : "noring"}` }, h("i", { class: "glow" }), dial, h("div", { class: "side" }, state, humBox, pills));
  const minT = climate ? hass.states[climate]?.attributes.min_temp ?? 5 : 15;
  const maxT = climate ? hass.states[climate]?.attributes.max_temp ?? 30 : 28;
  const lo = Math.max(minT, 14);
  const hi = Math.min(maxT, 28);
  const toDeg = (v) => START + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * SWEEP;
  updaters.push((hs) => {
    const cst = climate && hs.states[climate];
    const tv = num(hs, area.temperature) ?? cst?.attributes.current_temperature ?? null;
    const target = cst && cst.state !== "off" ? cst.attributes.temperature : null;
    fillArc.setAttribute("d", target != null ? arcD(START, Math.max(START + 1, toDeg(target))) : "");
    if (tv != null) { const [x, y] = pt(toDeg(tv)); dot.setAttribute("cx", x); dot.setAttribute("cy", y); }
    dot.style.display = tv != null ? "" : "none";
    const heating = cst && ["heating", "preheating"].includes(cst.attributes.hvac_action);
    hero.classList.toggle("heat", !!heating);
    hero.classList.toggle("cool", cst?.attributes.hvac_action === "cooling");
    tsub.textContent = target != null ? `${t("rp_target")} ${fmt(hs, target, 1)}°` : cst ? t("off") : "";
    state.replaceChildren(icon(heating ? "mdi:fire" : cst?.state === "off" ? "mdi:power" : "mdi:thermostat"),
      h("div", {}, h("b", {}, heating ? t("heating_now") : cst ? (cst.state === "off" ? t("off") : t("th_idle")) : t("rp_no_heating")), h("small", {}, cst ? t("rp_tap_ring") : "")));
  });
  const body = h("div", { class: "hp-rp-body" });

  // ---- big control tiles: light, shades, music, switches (tap = the main action, ⋯ = details below)
  const ctlGrid = h("div", { class: "hp-rp-ctl" });
  // Areas this room opens by default (Customise → Open by default).
  const defaults = ctx.settings.s.roomOpen?.[areaId] || [];
  const placeInline = (el, sec) => {
    const tilesNow = [...ctlGrid.querySelectorAll(":scope > .hp-rp-ct")];
    const i = tilesNow.indexOf(el);
    // Tiles sit in pairs; a wide tile (the last of an odd count) is a row of its own.
    let anchor = el.classList.contains("wide") ? el : tilesNow[Math.min(tilesNow.length - 1, i % 2 === 0 ? i + 1 : i)];
    // Other details already open under this row stay above the new one.
    while (anchor.nextElementSibling?.classList.contains("hp-rp-sec")) anchor = anchor.nextElementSibling;
    anchor.after(sec.el);
    sec.el.classList.add("inline");
  };
  // Tap a tile: its single devices open below it. The small round button in the corner is the quick action.
  const ctlTile = (cls, ic, label, { quickIc, quick, open, detailsKey } = {}) => {
    const icEl = icon(ic);
    const val = h("small");
    const qIc = quickIc ? icon(quickIc) : null;
    const qBtn = quick ? h("button", { class: "quick", "aria-label": label }, qIc) : null;
    const chev = detailsKey ? h("span", { class: "chev" }, icon("mdi:chevron-down")) : null;
    const el = h("div", { class: `hp-rp-ct ${cls}`, role: "button", tabindex: "0", dataset: { sec: detailsKey || "" } },
      h("span", { class: "ic" }, icEl), h("b", {}, label), val, ...(qBtn ? [qBtn] : []), ...(chev ? [chev] : []));
    qBtn?.addEventListener("click", (e) => { e.stopPropagation(); quick(); });
    el.addEventListener("click", () => {
      if (open) return open();
      const sec = sections.find((x) => x.key === detailsKey);
      if (!sec) return;
      const o = !sec.el.classList.contains("open");
      // One open at a time (besides those set to open by default), right under the row of the tapped tile.
      for (const other of sections) {
        if (other === sec || defaults.includes(other.cat) || !other.el.classList.contains("headless") || !other.el.classList.contains("open")) continue;
        other.setOpen(false);
        ctlGrid.querySelector(`.hp-rp-ct[data-sec="${CSS.escape(other.key)}"]`)?.classList.remove("expanded");
      }
      if (o) placeInline(el, sec);
      sec.setOpen(o);
      el.classList.toggle("expanded", o);
      if (o) setTimeout(() => sec.el.scrollIntoView({ behavior: "smooth", block: "nearest" }), 60);
    });
    ctlGrid.append(el);
    return { el, icEl, val, qIc };
  };
  body.append(ctlGrid);
  // devices (printer, washer, car …) as a two-column grid
  const specials = arranged.filter((k) => /^(app|prn|car|pol|bel|hpu|net|bby|wbx):/.test(k));
  const devGrid = h("div", { class: "hp-rp-devgrid" });
  for (const key of specials) {
    const el = deviceKeyTile(ctx, key, { container: `room:${areaId}`, variant: "tile" });
    devGrid.append(el);
    updaters.push((hs) => el.update?.(hs));
  }

  // ---- section helper: one calm row (icon, title, summary, quick control); a tap opens the details below it.
  const sections = [];
  const section = (ic, title, headRight, summary, cat) => {
    const list = h("div", { class: "hp-rp-list" });
    const sum = h("small");
    const chev = icon("mdi:chevron-down");
    const key = `${areaId}:${title}`;
    const head = h("div", { class: "hp-rp-sechead", role: "button", tabindex: "0" },
      h("span", { class: "ic" }, icon(ic)), h("div", { class: "tt" }, h("b", {}, title), sum), headRight || h("span"), h("span", { class: "chev" }, chev));
    const el = h("div", { class: "hp-rp-sec" }, head, list);
    const setOpen = (o) => { el.classList.toggle("open", o); OPEN.set(key, o); };
    head.addEventListener("click", (e) => { if (!e.target.closest(".hp-toggle, .hp-rp-btns, button.hp-round")) setOpen(!el.classList.contains("open")); });
    sections.push({ el, setOpen, key, cat });
    if (summary) updaters.push((hs) => { sum.textContent = summary(hs); });
    body.append(el);
    return list;
  };

  // ---- lights: all on/off + each lamp with switch and dimmer
  if (lights.length) {
    const allSw = toggleSwitch(false, () => ctx.hass.callService("light", lights.some((id) => isOn(ctx.hass.states[id])) ? "turn_off" : "turn_on", { entity_id: lights }));
    const list = section("mdi:lightbulb-group-outline", t("cat_light"), allSw, (hs) => {
      const on = lights.filter((id) => isOn(hs.states[id]));
      return on.length ? `${t("ov_n_of_m", { n: on.length, m: lights.length })} · ${Math.round(on.reduce((a, id) => a + pctOf(hs.states[id]), 0) / on.length)} %` : (lights.length === 1 ? t("off") : t("rp_all_off_n", { n: lights.length }));
    }, "light");
    for (const id of lights) {
      const ic = icon("mdi:lightbulb");
      const icBox = h("span", { class: "ic" }, ic);
      const pct = h("small");
      const sw = toggleSwitch(false, () => ctx.hass.callService("light", "toggle", { entity_id: id }));
      const bar = dimmable(hass.states[id]) ? slider({ value: 0, cls: "hp-ov-bri", label: t("brightness"), onChange: (v) => ctx.hass.callService("light", v <= 0 ? "turn_off" : "turn_on", { entity_id: id, ...(v > 0 ? { brightness_pct: v } : {}) }) }) : null;
      const row = h("div", { class: "hp-rp-row" }, icBox, h("button", { class: "txt" }, h("b", {}, name(id)), pct), sw, ...(bar ? [bar] : []));
      row.querySelector(".txt").addEventListener("click", () => ctx.openDetails(id));
      list.append(row);
      updaters.push((hs) => {
        const st = hs.states[id];
        const on = isOn(st);
        row.classList.toggle("on", on);
        sw.classList.toggle("on", on);
        const col = on ? lightColor(st) : null;
        icBox.style.background = col || "";
        icBox.style.boxShadow = col ? `0 0 14px ${col}` : "";
        ic.icon = on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline";
        pct.textContent = st?.state === "unavailable" ? t("unavailable") : on ? (st.attributes.brightness != null ? `${pctOf(st)} %` : t("on")) : t("off");
        bar?.update(pctOf(st));
        if (bar) bar.hidden = !on;
      });
    }
    updaters.push((hs) => allSw.classList.toggle("on", lights.some((id) => isOn(hs.states[id]))));
  }

  // ---- shades: all up/stop/down + each one
  if (shades.length) {
    const call = (svc, ids, data = {}) => ctx.hass.callService("cover", svc, { entity_id: ids, ...data });
    const ctl = (ids) => {
      const up = h("button", { class: "hp-round small", "aria-label": t("shades_open") }, icon("mdi:arrow-up"));
      const stop = h("button", { class: "hp-round small", "aria-label": "Stop" }, icon("mdi:stop"));
      const down = h("button", { class: "hp-round small", "aria-label": t("shades_closed") }, icon("mdi:arrow-down"));
      up.addEventListener("click", () => call("open_cover", ids));
      stop.addEventListener("click", () => call("stop_cover", ids));
      down.addEventListener("click", () => call("close_cover", ids));
      return h("div", { class: "hp-rp-btns" }, up, stop, down);
    };
    const list = section("mdi:blinds-horizontal", t("shades"), ctl(shades), (hs) => {
      const avg = Math.round(shades.reduce((a, id) => a + posOf(hs.states[id]), 0) / shades.length);
      const moving = shades.some((id) => ["opening", "closing"].includes(hs.states[id]?.state));
      return (moving ? t("shades_moving") : avg <= 0 ? t("ov_closed_short") : avg >= 100 ? t("ov_open_short") : t("open_pct", { n: avg })) + (shades.length > 1 ? ` · ${t("rp_n_shades", { n: shades.length })}` : "");
    }, "shades");
    // Expanded: one slim line per shade (small window, name, a slider to drag, up/down; Stop while moving).
    // With several shades a first line in the same shape moves all of them together.
    const shName = (id) => name(id).replace(/^(shade|rollladen|rolladen|rollo|jalousie|blind)\s+/i, "");
    const stateText = (sts, p) => {
      const moving = sts.find((st) => ["opening", "closing"].includes(st?.state))?.state;
      return moving === "opening" ? t("opening") : moving === "closing" ? t("closing")
        : sts.some((st) => !st || st.state === "unavailable") ? t("unavailable")
        : p <= 0 ? t("ov_closed_short") : p >= 100 ? t("ov_open_short") : `${p} %`;
    };
    const canPos = (id) => !!((hass.states[id]?.attributes.supported_features ?? 4) & 4);
    const shBtn = (ic, label, fn, cls = "") => {
      const b = h("button", { class: `hp-rp-shbtn ${cls}`, "aria-label": label }, icon(ic));
      b.addEventListener("click", (e) => { e.stopPropagation(); fn(); });
      return b;
    };
    const setTo = (ids, v) => {
      if (v <= 0) return call("close_cover", ids);
      if (v >= 100) return call("open_cover", ids);
      const pos = ids.filter(canPos);
      if (pos.length) call("set_cover_position", pos, { position: v });
      const rest = ids.filter((id) => !canPos(id));
      if (rest.length) call(v >= 50 ? "open_cover" : "close_cover", rest);
    };
    const shRow = (ids, label, all = false) => {
      const sl = h("i", { class: "sl" });
      const win = h("span", { class: "win" }, sl);
      const val = h("small");
      const title = h("button", { class: "txt" }, h("b", {}, label), val);
      if (!all) title.addEventListener("click", () => ctx.openDetails(ids[0]));
      const upB = shBtn("mdi:arrow-up", t("rp_sh_up"), () => call("open_cover", ids));
      const stopB = shBtn("mdi:stop", "Stop", () => call("stop_cover", ids), "stop");
      const downB = shBtn("mdi:arrow-down", t("rp_sh_down"), () => call("close_cover", ids));
      const pos = slider({ value: 0, cls: "hp-rp-shpos", label, step: 5,
        onInput: (v) => { val.textContent = `${v} %`; sl.style.height = `${100 - v}%`; },
        onChange: (v) => setTo(ids, v) });
      const hasPos = ids.some(canPos);
      const row = h("div", { class: `hp-rp-shrow ${all ? "all" : ""} ${hasPos ? "" : "nopos"}` },
        win, title, ...(hasPos ? [pos] : []), h("div", { class: "rbtns" }, upB, stopB, downB));
      list.append(row);
      updaters.push((hs) => {
        const sts = ids.map((id) => hs.states[id]);
        const p = Math.round(sts.reduce((x, st) => x + posOf(st), 0) / ids.length);
        const moving = sts.some((st) => ["opening", "closing"].includes(st?.state));
        row.classList.toggle("moving", moving);
        row.classList.toggle("on", p > 0);
        upB.classList.toggle("active", !moving && sts.every((st) => posOf(st) >= 100));
        downB.classList.toggle("active", !moving && sts.every((st) => posOf(st) <= 0));
        if (pos.isDragging()) return;
        sl.style.height = `${100 - p}%`;
        val.textContent = stateText(sts, p);
        pos.update(p);
      });
    };
    if (shades.length > 1) shRow(shades, t("all_shades_n", { n: shades.length }), true);
    for (const id of shades) shRow([id], shName(id));
  }

  // ---- gates, switches, sockets, fans
  const other = [...switches];
  if (other.length) {
    const list = section("mdi:power-socket-de", t("rp_more"), "", (hs) => {
      const on = other.filter((id) => (domainOf(id) === "cover" ? hs.states[id]?.state !== "closed" : isOn(hs.states[id]))).length;
      return on ? t("rp_n_on", { n: on, m: other.length }) : (other.length === 1 ? t("off") : t("rp_all_off_n", { n: other.length }));
    }, "switch");
    for (const id of other) {
      const d = domainOf(id);
      const ic = icon(entityIcon(hass, hass.states[id]));
      const sub = h("small");
      const right = d === "cover" ? h("button", { class: "hp-chip" }, t("rp_open_close")) : toggleSwitch(false, () => ctx.hass.callService(d === "input_boolean" ? "input_boolean" : d, "toggle", { entity_id: id }));
      if (d === "cover") right.addEventListener("click", () => ctx.openDetails(id));
      const row = h("div", { class: "hp-rp-row" }, h("span", { class: "ic" }, ic), h("button", { class: "txt" }, h("b", {}, name(id)), sub), right);
      row.querySelector(".txt").addEventListener("click", () => ctx.openDetails(id));
      list.append(row);
      updaters.push((hs) => {
        const st = hs.states[id];
        const on = d === "cover" ? st?.state !== "closed" : isOn(st);
        row.classList.toggle("on", on);
        if (d !== "cover") right.classList.toggle("on", on);
        sub.textContent = hs.formatEntityState?.(st) || st?.state || "";
        ic.icon = entityIcon(hs, st);
      });
    }
  }

  // ---- everything else the room page shows (vacuum, valves, locks, sensors …) as its normal tiles
  const known = new Set([...lights, ...shades, ...covers, ...switches, ...locks, ...players, ...(climate ? [climate] : [])]);
  const rest = tiles.filter((id) => !known.has(id) && domainOf(id) !== "climate");
  if (rest.length) {
    const list = section("mdi:dots-grid", t("rp_other"), "", () => t("rp_n_items", { n: rest.length }), "other");
    for (const id of rest) {
      const el = createTile(ctx, id, { size: 1, areaName: area.name, variant: "row", container: `room:${areaId}` });
      list.append(el);
      updaters.push((hs) => el.update?.(hs));
    }
  }

  // ---- music
  if (players.length) {
    const list = section("mdi:music", t("rp_music"), "", (hs) => {
      const p = players.find((id) => hs.states[id]?.state === "playing");
      return p ? [hs.states[p].attributes.media_title, hs.states[p].attributes.friendly_name].filter(Boolean).join(" · ") : (players.length === 1 ? t("rp_quiet") : t("rp_n_players", { n: players.length }));
    }, "music");
    for (const id of players) {
      const art = h("div", { class: "art" });
      const title = h("b");
      const sub = h("small");
      const play = h("button", { class: "play" }, icon("mdi:play"));
      const vol = slider({ value: 0, cls: "hp-rp-vol", label: t("volume"), onChange: (v) => ctx.hass.callService("media_player", "volume_set", { entity_id: id, volume_level: v / 100 }) });
      const card = h("div", { class: "hp-rp-media" }, art, h("button", { class: "txt" }, title, sub), play, vol);
      card.querySelector(".txt").addEventListener("click", () => ctx.openPlayer(id));
      play.addEventListener("click", () => {
        const st = ctx.hass.states[id];
        ctx.hass.callService("media_player", st?.state === "off" || st?.state === "standby" ? "turn_on" : "media_play_pause", { entity_id: id });
      });
      list.append(card);
      updaters.push((hs) => {
        const st = hs.states[id];
        const a = st?.attributes || {};
        const active = st?.state === "playing" || st?.state === "paused";
        const pic = a.entity_picture_local || a.entity_picture;
        art.style.backgroundImage = active && pic ? `url("${pic}")` : "";
        title.textContent = active ? a.media_title || name(id) : name(id);
        sub.textContent = active ? [a.media_artist, name(id)].filter(Boolean).join(" · ") : hs.formatEntityState?.(st) || "";
        play.firstChild.icon = st?.state === "playing" ? "mdi:pause" : st?.state === "off" ? "mdi:power" : "mdi:play";
        vol.update(Math.round((a.volume_level ?? 0) * 100));
        vol.hidden = a.volume_level == null;
        card.classList.toggle("on", st?.state === "playing");
      });
    }
  }

  // ---- scenes
  const scenes = area.scenes.map((id) => {
    const b = h("button", { class: "hp-chip" }, ctx.hass.states[id]?.attributes.friendly_name?.replace(new RegExp(`^${area.name}\\s*`, "i"), "") || id);
    b.addEventListener("click", () => { ctx.hass.callService(domainOf(id) === "script" ? "script" : "scene", "turn_on", { entity_id: id }); b.classList.add("active"); setTimeout(() => b.classList.remove("active"), 800); });
    return b;
  });
  // ---- control tiles (built once the sections exist, so ⋯ can open them)
  const secKey = (title) => `${areaId}:${title}`;
  if (lights.length) {
    const c = ctlTile("light", "mdi:lightbulb-group", t("cat_light"), { quickIc: "mdi:power", detailsKey: secKey(t("cat_light")),
      quick: () => ctx.hass.callService("light", lights.some((id) => isOn(ctx.hass.states[id])) ? "turn_off" : "turn_on", { entity_id: lights }) });
    updaters.push((hs) => {
      const on = lights.filter((id) => isOn(hs.states[id]));
      const avg = on.length ? Math.round(on.reduce((a, id) => a + pctOf(hs.states[id]), 0) / on.length) : 0;
      c.el.classList.toggle("on", on.length > 0);
      c.el.style.setProperty("--lc", on.length ? lightColor(hs.states[on[0]]) || "#ffc46e" : "transparent");
      c.el.style.setProperty("--lv", String(avg / 100));
      c.val.textContent = on.length ? `${on.length}/${lights.length} · ${avg} %` : t("off");
      c.icEl.icon = on.length ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline";
    });
  }
  if (shades.length) {
    const c = ctlTile("shades", "mdi:blinds-horizontal", t("shades"), { quickIc: "mdi:arrow-up-down", detailsKey: secKey(t("shades")),
      quick: () => {
        const anyOpen = shades.some((id) => posOf(ctx.hass.states[id]) > 5);
        ctx.hass.callService("cover", anyOpen ? "close_cover" : "open_cover", { entity_id: shades });
      } });
    const slats = h("i", { class: "slats" });
    c.el.prepend(slats);
    updaters.push((hs) => {
      const avg = Math.round(shades.reduce((a, id) => a + posOf(hs.states[id]), 0) / shades.length);
      slats.style.height = `${100 - avg}%`;
      c.el.classList.toggle("on", avg > 5);
      c.val.textContent = avg <= 5 ? t("ov_closed_short") : avg >= 100 ? t("ov_open_short") : `${avg} %`;
      c.icEl.icon = avg <= 5 ? "mdi:blinds-horizontal-closed" : "mdi:blinds-horizontal";
      c.qIc.icon = avg > 5 ? "mdi:arrow-down" : "mdi:arrow-up";
    });
  }
  if (players.length) {
    const cur = () => players.find((id) => ctx.hass.states[id]?.state === "playing") || players[0];
    const c = ctlTile("music", "mdi:music", t("rp_music"), { quickIc: "mdi:play", detailsKey: secKey(t("rp_music")),
      quick: () => {
        const st = ctx.hass.states[cur()];
        ctx.hass.callService("media_player", st?.state === "off" || st?.state === "standby" ? "turn_on" : "media_play_pause", { entity_id: cur() });
      } });
    updaters.push((hs) => {
      const st = hs.states[cur()];
      const a = st?.attributes || {};
      const playing = st?.state === "playing";
      const pic = (playing || st?.state === "paused") && (a.entity_picture_local || a.entity_picture);
      c.el.style.backgroundImage = pic ? `linear-gradient(180deg, rgba(20,14,24,.25), rgba(20,14,24,.85)), url("${pic}")` : "";
      c.el.classList.toggle("on", playing);
      c.el.classList.toggle("art", !!pic);
      c.val.textContent = playing || st?.state === "paused" ? a.media_title || name(cur()) : t("rp_quiet");
      c.icEl.icon = "mdi:music";
      c.qIc.icon = playing ? "mdi:pause" : "mdi:play";
    });
  }
  const others = [...switches];
  if (others.length) {
    const c = ctlTile("switch", "mdi:power-socket-de", t("rp_switches"), { detailsKey: secKey(t("rp_more")) });
    updaters.push((hs) => {
      const on = others.filter((id) => (domainOf(id) === "cover" ? hs.states[id]?.state !== "closed" : isOn(hs.states[id]))).length;
      c.el.classList.toggle("on", on > 0);
      c.val.textContent = on ? t("rp_n_on", { n: on, m: others.length }) : t("off");
    });
  }
  // Gates and garage doors: the door moves in the tile, a tap opens the gate popup (camera, two-tap open).
  for (const id of covers) {
    const garage = hass.states[id]?.attributes.device_class === "garage" && !/gate|tor\b|einfahrt|entry/i.test(`${id} ${hass.states[id]?.attributes.friendly_name}`);
    const c = ctlTile(`gate ${garage ? "garage" : "fence"}`, garage ? "mdi:garage-variant" : "mdi:gate", name(id).replace(/^(hörmann|hormann)\s+/i, ""), { open: () => (isGate(ctx.hass, id) ? openGate(ctx, id) : ctx.openDetails(id)) });
    const door = h("i", { class: "door" });
    c.el.prepend(door);
    updaters.push((hs) => {
      const st = hs.states[id];
      const p = st?.attributes.current_position ?? (st?.state === "closed" ? 0 : st?.state === "open" ? 100 : 50);
      const moving = st?.state === "opening" || st?.state === "closing";
      c.el.style.setProperty("--open", String(p / 100));
      c.el.classList.toggle("on", st?.state !== "closed");
      c.el.classList.toggle("moving", moving);
      c.val.textContent = moving ? (hs.formatEntityState?.(st) || st.state) : st ? `${hs.formatEntityState?.(st) || st.state} · ${since(st.last_changed)}` : "–";
      c.icEl.icon = garage ? (st?.state === "closed" ? "mdi:garage-variant" : "mdi:garage-open-variant") : st?.state === "closed" ? "mdi:gate" : "mdi:gate-open";
    });
  }
  // Locks: green when locked, red when not; a tap asks before it changes anything.
  for (const id of locks) {
    const c = ctlTile("lock", "mdi:lock", name(id), { open: () => ctx.openDetails(id) });
    updaters.push((hs) => {
      const st = hs.states[id];
      const locked = st?.state === "locked";
      c.el.classList.toggle("on", !!st && !locked);
      c.el.classList.toggle("locked", locked);
      c.val.textContent = st ? `${hs.formatEntityState?.(st) || st.state} · ${since(st.last_changed)}` : "–";
      c.icEl.icon = locked ? "mdi:lock" : st?.state === "jammed" ? "mdi:lock-alert" : "mdi:lock-open-variant";
    });
  }
  for (const id of acs) {
    const c = ctlTile("ac", "mdi:air-conditioner", acs.length > 1 ? name(id) : t("rp_ac"), { quickIc: "mdi:power", quick: () => tapAction(ctx, id), open: () => openThermostat(ctx, id) });
    updaters.push((hs) => {
      const st = hs.states[id];
      const a = st?.attributes || {};
      const on = st && st.state !== "off" && st.state !== "unavailable";
      c.el.classList.toggle("on", !!on);
      c.el.dataset.mode = on ? st.state : "";
      c.val.textContent = !st || st.state === "unavailable" ? t("unavailable") : on ? `${hs.formatEntityState?.(st) || st.state}${a.temperature != null ? ` · ${fmt(hs, a.temperature, 1)}°` : ""}` : t("off");
      c.icEl.icon = st?.state === "cool" ? "mdi:snowflake" : st?.state === "heat" ? "mdi:fire" : st?.state === "dry" ? "mdi:water-percent" : st?.state === "fan_only" ? "mdi:fan" : "mdi:air-conditioner";
    });
  }
  ctlGrid.hidden = !ctlGrid.childElementCount;
  ctlGrid.classList.toggle("odd", ctlGrid.childElementCount % 2 === 1);
  if (ctlGrid.childElementCount % 2 === 1) ctlGrid.lastElementChild.classList.add("wide");
  // Sections that have a tile lose their own header: the tile's ⋯ opens them.
  const tiled = new Set([...ctlGrid.children].map((el) => el.dataset.sec));
  for (const sec of sections) if (tiled.has(sec.key)) sec.el.classList.add("headless");
  if (specials.length) ctlGrid.after(devGrid);
  if (scenes.length) body.append(h("div", { class: "hp-rp-scenes" }, ...scenes));
  // the detail sections go below the tiles and devices, closed
  for (const sec of sections) body.append(sec.el);

  for (const sec of sections) {
    const tile = ctlGrid.querySelector(`.hp-rp-ct[data-sec="${CSS.escape(sec.key)}"]`);
    const open = defaults.includes(sec.cat);
    if (open && tile) { placeInline(tile, sec); tile.classList.add("expanded"); }
    sec.setOpen(open || (!tile && OPEN.get(sec.key) === true));
  }

  // Customise: show, hide and add the room's devices right here (the room page may be switched off).
  const goRoom = h("button", { class: "hp-btn ghost" }, icon("mdi:pencil-outline"), h("span", {}, t("rp_customise")));
  const cats = sections.map((x) => ({ cat: x.cat, label: x.key.slice(areaId.length + 1) }));
  goRoom.addEventListener("click", () => openRoomEdit(ctx, areaId, cats, () => { sheet.close(); setTimeout(() => openRoomPopup(ctx, areaId), 250); }));
  sheet.body.append(hero, body, h("div", { class: "hp-sheet-actions hp-app-foot" }, goRoom));

  const update = (hs) => {
    const tv = num(hs, area.temperature) ?? (climate ? hs.states[climate]?.attributes.current_temperature : null);
    temp.textContent = tv != null ? `${fmt(hs, tv, 1)}°` : "–";
    const hv = num(hs, humidity);
    hum.textContent = hv != null ? `${Math.round(hv)} %` : "";
    humBox.hidden = hv == null;
    const lit = lights.filter((id) => isOn(hs.states[id]));
    hero.style.setProperty("--glow", lit.length ? lightColor(hs.states[lit[0]]) || "#ffc46e" : "rgba(120,140,220,.5)");
    const openWin = windows.filter((id) => hs.states[id]?.state === "on").length;
    pills.replaceChildren(...(windows.length ? [h("div", { class: `hp-rp-fact ${openWin ? "warn" : ""}` }, icon(openWin ? "mdi:window-open-variant" : "mdi:window-closed-variant"),
      h("div", {}, h("b", {}, openWin ? t("th_n_open", { n: openWin }) : t("rp_windows_closed")), h("small", {}, t("th_windows"))))] : []));
    // A room without temperature, humidity or heating (a utility room) skips the top card.
    hero.hidden = tv == null && hv == null && !climate;
    updaters.forEach((u) => u(hs));
  };
  update(hass);
  sheet.updaters.push(update);
}

/** Show, hide and add devices of a room; closing it rebuilds the room popup. */
function openRoomEdit(ctx, areaId, cats, onDone) {
  const hass = ctx.hass;
  const area = ctx.model.areaById.get(areaId);
  const C = `room:${areaId}`;
  const SPECIAL = /^(app|prn|car|pol|bel|hpu|net|bby|wbx):/;
  let changed = false;
  const sheet = openSheet(ctx, { title: t("rp_customise"), subtitle: area.name, cls: "qsheet ov-room-edit", onClose: () => { if (changed) onDone(); } });
  const list = h("div", { class: "hp-qlist" });
  const label = (key) => {
    if (SPECIAL.test(key)) {
      const i = deviceKeyInfo(ctx, key);
      return { ic: i.icon, name: i.name, sub: i.sub || "" };
    }
    const st = hass.states[key];
    return { ic: entityIcon(hass, st), name: entityName(hass, key, area.name), sub: hass.formatEntityState?.(st) || st?.state || "" };
  };
  const draw = () => {
    const parts = machineParts(ctx);
    const exists = (k) => !!hass.states[k] || SPECIAL.test(k);
    const { items, hidden } = ctx.settings.arrange(C, roomItems(ctx, area), exists);
    const row = (key, shown) => {
      const l = label(key);
      const eye = h("button", { class: `hp-round small hp-eye ${shown ? "on" : ""}`, "aria-label": shown ? t("hide") : t("show") }, icon(shown ? "mdi:eye-outline" : "mdi:eye-off-outline"));
      eye.addEventListener("click", () => {
        changed = true;
        if (shown) ctx.settings.hide(C, key);
        else ctx.settings.unhide(C, key);
        setTimeout(draw, 50);
      });
      return h("div", { class: `hp-qrow ${shown ? "" : "off"}` }, h("span", { class: "hp-qrow-ic" }, icon(l.ic)), h("div", { class: "hp-qrow-text" }, h("b", {}, l.name), h("small", {}, l.sub)), eye);
    };
    list.replaceChildren(
      h("div", { class: "hp-label hp-ov-label" }, t("rp_shown"), h("span", { class: "hp-count" }, String(items.filter((k) => !parts.has(k) && !k.startsWith("sep:")).length))),
      ...items.filter((k) => !parts.has(k) && !k.startsWith("sep:")).map((k) => row(k, true)),
      ...(hidden.length ? [h("div", { class: "hp-label hp-ov-label" }, t("rp_hidden"), h("span", { class: "hp-count" }, String(hidden.length))), ...hidden.map((k) => row(k, false))] : []));
  };
  const add = h("button", { class: "hp-btn primary" }, icon("mdi:plus"), h("span", {}, t("add_devices")));
  add.addEventListener("click", () => { changed = true; ctx.openAdd(C, area.tiles); });
  const done = h("button", { class: "hp-btn ghost" }, icon("mdi:check"), h("span", {}, t("done")));
  done.addEventListener("click", () => sheet.close());
  // Which areas this room opens by default.
  const openBox = h("div", { class: "hp-qlist" });
  const drawOpen = () => {
    const cur = ctx.settings.s.roomOpen?.[areaId] || [];
    openBox.replaceChildren(...cats.map(({ cat, label }) => h("div", { class: "hp-qrow" }, h("div", { class: "hp-qrow-text" }, h("b", {}, label)),
      toggleSwitch(cur.includes(cat), () => {
        changed = true;
        ctx.settings.update((x) => {
          const all = { ...(x.roomOpen || {}) };
          const set = new Set(all[areaId] || []);
          if (set.has(cat)) set.delete(cat);
          else set.add(cat);
          all[areaId] = [...set];
          x.roomOpen = all;
        });
        setTimeout(drawOpen, 50);
      }))));
  };
  drawOpen();
  sheet.body.append(h("p", { class: "hp-muted small" }, t("rp_customise_hint")),
    ...(cats.length ? [h("div", { class: "hp-label hp-ov-label" }, t("rp_open_default")), openBox] : []),
    list, h("div", { class: "hp-sheet-actions hp-app-foot" }, add, done));
  draw();
  // Devices added through the add dialog show up here as soon as the settings change.
  sheet.updaters.push(() => { const sig = JSON.stringify(ctx.settings.cont(C)); if (sig !== sheet._sig) { sheet._sig = sig; draw(); } });
}
