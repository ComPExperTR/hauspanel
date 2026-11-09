// What each kind of device looks like, what one tap does and which controls it gets.
import { h, icon, domainOf, supports, slider, clamp, kelvinCss, isUnavailable, fireHass, formatNumber } from "./util.js";
import { isOn } from "./model.js";
import { t } from "./i18n.js";
import { positionChips } from "./shades.js";

const COVER = { OPEN: 1, CLOSE: 2, SET_POSITION: 4, STOP: 8 };
const FAN = { SET_SPEED: 1, OSCILLATE: 2 };
export const MEDIA = {
  PAUSE: 1, SEEK: 2, VOLUME_SET: 4, VOLUME_MUTE: 8, PREVIOUS: 16, NEXT: 32, TURN_ON: 128, TURN_OFF: 256,
  PLAY_MEDIA: 512, VOLUME_STEP: 1024, SELECT_SOURCE: 2048, STOP: 4096, PLAY: 16384, SHUFFLE: 32768,
  BROWSE: 131072, REPEAT: 262144,
};
const CLIMATE_TARGET = 1;

const BINARY_ICONS = {
  door: ["mdi:door-open", "mdi:door-closed"],
  garage_door: ["mdi:garage-open", "mdi:garage"],
  window: ["mdi:window-open-variant", "mdi:window-closed-variant"],
  opening: ["mdi:square-rounded-outline", "mdi:square-rounded"],
  motion: ["mdi:motion-sensor", "mdi:motion-sensor-off"],
  occupancy: ["mdi:home-account", "mdi:home-outline"],
  presence: ["mdi:home-account", "mdi:home-outline"],
  smoke: ["mdi:smoke-detector-alert", "mdi:smoke-detector"],
  moisture: ["mdi:water-alert", "mdi:water-off"],
  gas: ["mdi:alert", "mdi:check-circle-outline"],
  lock: ["mdi:lock-open-variant", "mdi:lock"],
  battery: ["mdi:battery-alert", "mdi:battery"],
  connectivity: ["mdi:lan-connect", "mdi:lan-disconnect"],
  plug: ["mdi:power-plug", "mdi:power-plug-off"],
};

const SENSOR_ICONS = {
  temperature: "mdi:thermometer", humidity: "mdi:water-percent", power: "mdi:flash", energy: "mdi:lightning-bolt",
  battery: "mdi:battery", illuminance: "mdi:brightness-5", carbon_dioxide: "mdi:molecule-co2", pressure: "mdi:gauge",
  pm25: "mdi:blur", voltage: "mdi:sine-wave", current: "mdi:current-ac", gas: "mdi:meter-gas", water: "mdi:water",
  timestamp: "mdi:clock-outline", monetary: "mdi:cash", signal_strength: "mdi:wifi",
};

export const WEATHER_ICONS = {
  "clear-night": "mdi:weather-night", cloudy: "mdi:weather-cloudy", exceptional: "mdi:alert-circle-outline",
  fog: "mdi:weather-fog", hail: "mdi:weather-hail", lightning: "mdi:weather-lightning",
  "lightning-rainy": "mdi:weather-lightning-rainy", partlycloudy: "mdi:weather-partly-cloudy",
  pouring: "mdi:weather-pouring", rainy: "mdi:weather-rainy", snowy: "mdi:weather-snowy",
  "snowy-rainy": "mdi:weather-snowy-rainy", sunny: "mdi:weather-sunny", windy: "mdi:weather-windy",
  "windy-variant": "mdi:weather-windy-variant",
};

export function entityIcon(hass, st) {
  if (!st) return "mdi:help-circle-outline";
  const reg = hass.entities[st.entity_id];
  if (reg?.icon) return reg.icon;
  if (st.attributes.icon) return st.attributes.icon;
  const on = isOn(st);
  const dc = st.attributes.device_class;
  const s = st.state;
  switch (domainOf(st.entity_id)) {
    case "light": return on ? "mdi:lightbulb" : "mdi:lightbulb-outline";
    case "switch":
      if (dc === "outlet") return on ? "mdi:power-plug" : "mdi:power-plug-off";
      return on ? "mdi:toggle-switch-variant" : "mdi:toggle-switch-variant-off";
    case "input_boolean": return on ? "mdi:toggle-switch-variant" : "mdi:toggle-switch-variant-off";
    case "fan": return on ? "mdi:fan" : "mdi:fan-off";
    case "cover":
      if (dc === "curtain") return on ? "mdi:curtains" : "mdi:curtains-closed";
      if (dc === "blind" || dc === "shade") return on ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed";
      if (dc === "garage" || dc === "gate") return on ? "mdi:garage-open" : "mdi:garage";
      if (dc === "window") return on ? "mdi:window-open" : "mdi:window-closed";
      if (dc === "door") return on ? "mdi:door-open" : "mdi:door-closed";
      return on ? "mdi:window-shutter-open" : "mdi:window-shutter";
    case "climate":
      if (s === "heat") return "mdi:fire";
      if (s === "cool") return "mdi:snowflake";
      if (s === "dry") return "mdi:water-percent";
      if (s === "fan_only") return "mdi:fan";
      return on ? "mdi:air-conditioner" : "mdi:thermostat";
    case "humidifier": return on ? "mdi:air-humidifier" : "mdi:air-humidifier-off";
    case "water_heater": return on ? "mdi:water-boiler" : "mdi:water-boiler-off";
    case "media_player":
      if (dc === "tv") return on ? "mdi:television-play" : "mdi:television";
      if (dc === "speaker") return on ? "mdi:speaker-play" : "mdi:speaker";
      if (dc === "receiver") return "mdi:audio-video";
      return on ? "mdi:cast-connected" : "mdi:cast";
    case "lock":
      if (s === "jammed") return "mdi:lock-alert";
      if (s === "locking" || s === "unlocking" || s === "opening") return "mdi:lock-clock";
      return on ? "mdi:lock-open-variant" : "mdi:lock";
    case "vacuum": return "mdi:robot-vacuum";
    case "lawn_mower": return "mdi:robot-mower";
    case "valve": return on ? "mdi:valve-open" : "mdi:valve-closed";
    case "alarm_control_panel": return on ? "mdi:shield-lock" : "mdi:shield-off-outline";
    case "script": return "mdi:script-text-play-outline";
    case "scene": return "mdi:palette-outline";
    case "button":
    case "input_button": return "mdi:gesture-tap-button";
    case "select":
    case "input_select": return "mdi:format-list-bulleted";
    case "number":
    case "input_number": return "mdi:ray-vertex";
    case "camera": return "mdi:cctv";
    case "person": return s === "home" ? "mdi:account" : "mdi:account-outline";
    case "device_tracker": return s === "home" ? "mdi:map-marker-account" : "mdi:map-marker-off";
    case "update": return on ? "mdi:package-up" : "mdi:package";
    case "weather": return WEATHER_ICONS[s] || "mdi:weather-partly-cloudy";
    case "binary_sensor": {
      const pair = BINARY_ICONS[dc];
      if (pair) return on ? pair[0] : pair[1];
      return on ? "mdi:checkbox-marked-circle" : "mdi:checkbox-blank-circle-outline";
    }
    case "sensor": return SENSOR_ICONS[dc] || "mdi:eye-outline";
    default: return "mdi:circle-outline";
  }
}

export function stateText(hass, st) {
  if (!st) return t("unavailable");
  if (isUnavailable(st)) return t("unavailable");
  const d = domainOf(st.entity_id);
  const a = st.attributes;
  if (d === "light" && st.state === "on" && a.brightness != null) return `${Math.round((a.brightness / 255) * 100)} %`;
  if (d === "cover" && a.current_position != null && st.state === "open" && a.current_position < 100)
    return `${t("open")} · ${a.current_position} %`;
  if (d === "climate") {
    // Some devices report a placeholder (a heat pump says -39°): impossible room temperatures are left out.
    const c = a.current_temperature;
    const cur = c != null && c > -25 && c < 60 ? `${formatNumber(hass, c)}°` : "";
    if (st.state === "off") return cur ? `${t("off")} · ${cur}` : t("off");
    const target = a.temperature != null ? (cur ? `→ ${formatNumber(hass, a.temperature)}°` : t("target_temp", { v: formatNumber(hass, a.temperature) })) : "";
    return [cur, target].filter(Boolean).join(" ") || hass.formatEntityState(st);
  }
  if (d === "fan" && st.state === "on" && a.percentage != null) return `${a.percentage} %`;
  if (d === "media_player" && (st.state === "playing" || st.state === "paused") && a.media_title)
    return [a.media_title, a.media_artist].filter(Boolean).join(" · ");
  if (d === "scene" || d === "button" || d === "input_button") return "";
  if (d === "script") return st.state === "on" ? t("running") : "";
  return hass.formatEntityState ? hass.formatEntityState(st) : st.state;
}

/** One tap: turn on/off, open/close, play/pause. Returns false when the tap should open details. */
export function tapAction(ctx, entityId) {
  const { hass } = ctx;
  const st = hass.states[entityId];
  if (isUnavailable(st)) return false;
  const d = domainOf(entityId);
  const call = (dom, svc, data = {}) => hass.callService(dom, svc, { entity_id: entityId, ...data });
  switch (d) {
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "humidifier":
    case "siren":
      call(d, "toggle");
      return true;
    case "cover":
      if ((st.state === "opening" || st.state === "closing") && supports(st, COVER.STOP)) call("cover", "stop_cover");
      else if (st.state === "closed") call("cover", "open_cover");
      else call("cover", "close_cover");
      return true;
    case "valve":
      call("valve", st.state === "closed" ? "open_valve" : "close_valve");
      return true;
    case "climate": {
      if (st.state === "off") {
        const mode = lastClimateMode(st);
        if (mode) call("climate", "set_hvac_mode", { hvac_mode: mode });
        else call("climate", "turn_on");
      } else {
        rememberClimateMode(st);
        call("climate", "set_hvac_mode", { hvac_mode: "off" });
      }
      return true;
    }
    case "water_heater":
      call("water_heater", st.state === "off" ? "turn_on" : "turn_off");
      return true;
    case "media_player":
      if (st.state === "playing") call("media_player", supports(st, MEDIA.PAUSE) ? "media_pause" : "media_stop");
      else if (st.state === "off" || st.state === "standby") {
        if (supports(st, MEDIA.TURN_ON)) call("media_player", "turn_on");
        else return false;
      } else call("media_player", "media_play");
      return true;
    case "lock":
      if (st.state === "jammed") return false;
      ctx.confirm({
        title: entityIconTitle(hass, st),
        text: st.state === "locked" ? t("confirm_unlock") : t("confirm_lock"),
        ok: st.state === "locked" ? t("unlock") : t("lock"),
        danger: st.state === "locked",
        onOk: () => call("lock", st.state === "locked" ? "unlock" : "lock"),
      });
      return true;
    case "vacuum":
      call("vacuum", st.state === "cleaning" ? "return_to_base" : "start");
      return true;
    case "lawn_mower":
      call("lawn_mower", st.state === "mowing" ? "dock" : "start_mowing");
      return true;
    case "script":
      call("script", st.state === "on" ? "turn_off" : "turn_on");
      return true;
    case "scene":
      call("scene", "turn_on");
      return true;
    case "button":
    case "input_button":
      call(d, "press");
      return true;
    default:
      return false;
  }
}

function entityIconTitle(hass, st) {
  return st.attributes.friendly_name || st.entity_id;
}

const CLIMATE_KEY = "hauspanel.climate";
function rememberClimateMode(st) {
  try {
    const m = JSON.parse(localStorage.getItem(CLIMATE_KEY) || "{}");
    m[st.entity_id] = st.state;
    localStorage.setItem(CLIMATE_KEY, JSON.stringify(m));
  } catch { /* ignore */ }
}
function lastClimateMode(st) {
  const modes = st.attributes.hvac_modes || [];
  try {
    const m = JSON.parse(localStorage.getItem(CLIMATE_KEY) || "{}")[st.entity_id];
    if (m && modes.includes(m)) return m;
  } catch { /* ignore */ }
  return ["heat_cool", "auto", "heat", "cool"].find((x) => modes.includes(x)) || modes.find((x) => x !== "off");
}

export function openMoreInfo(node, entityId) {
  fireHass(node, "hass-more-info", { entityId });
}

const SHEET_POWER = new Set(["light", "switch", "input_boolean"]);
const READING_ICON = { power: "mdi:flash", energy: "mdi:lightning-bolt-outline", current: "mdi:current-ac", voltage: "mdi:sine-wave" };

/** Power and energy sensors of the same device (a smart plug's watts, for example). */
function deviceReadings(hass, entityId) {
  const dev = hass.entities?.[entityId]?.device_id;
  if (!dev) return [];
  return Object.values(hass.entities)
    .filter((e) => e.device_id === dev && e.entity_id.startsWith("sensor.") && !e.hidden && READING_ICON[hass.states[e.entity_id]?.attributes.device_class])
    .map((e) => e.entity_id)
    .sort((a, b) => Object.keys(READING_ICON).indexOf(hass.states[a].attributes.device_class) - Object.keys(READING_ICON).indexOf(hass.states[b].attributes.device_class))
    .slice(0, 3);
}

/** Whether a tile of this entity gets inline controls when it is double size. */
export function hasControls(st) {
  if (!st) return false;
  const d = domainOf(st.entity_id);
  if (d === "light") return (st.attributes.supported_color_modes || []).some((m) => m !== "onoff");
  if (d === "cover") return supports(st, COVER.SET_POSITION) || supports(st, COVER.OPEN);
  if (d === "fan") return supports(st, FAN.SET_SPEED) || supports(st, FAN.OSCILLATE);
  if (d === "climate") return true;
  if (d === "media_player") return true;
  return false;
}

function throttle(fn, ms) {
  let last = 0;
  let timer;
  return (...a) => {
    const now = Date.now();
    clearTimeout(timer);
    if (now - last > ms) {
      last = now;
      fn(...a);
    } else timer = setTimeout(() => { last = Date.now(); fn(...a); }, ms - (now - last));
  };
}

const SWATCHES = [[0, 90], [25, 95], [45, 100], [90, 70], [150, 70], [195, 85], [230, 85], [270, 75], [310, 80]];

/**
 * Controls for a big tile ("card") or the details sheet ("sheet").
 * Returns an element with update(stateObj).
 */
export function buildControls(ctx, entityId, mode = "card") {
  const st0 = ctx.hass.states[entityId];
  const d = domainOf(entityId);
  const call = (dom, svc, data = {}) => ctx.hass.callService(dom, svc, { entity_id: entityId, ...data });
  const root = h("div", { class: `hp-controls hp-controls-${d} ${mode}` });
  const updaters = [];
  root.update = (st) => updaters.forEach((u) => u(st));
  root.addEventListener("pointerdown", (e) => e.stopPropagation());
  root.addEventListener("click", (e) => e.stopPropagation());

  if (mode === "sheet" && SHEET_POWER.has(d)) {
    const label = h("span", {});
    const pw = h("button", { class: "hp-power-big", role: "switch" }, icon("mdi:power"), label);
    pw.addEventListener("click", () => call(d, "toggle"));
    const readings = h("div", { class: "hp-readings" });
    // Sockets show their watts in the usage block below; dimmers keep the readings here.
    const siblings = d === "switch" ? [] : deviceReadings(ctx.hass, entityId);
    root.append(h("div", { class: "hp-power-row" }, pw, readings));
    updaters.push((st) => {
      const on = st.state === "on";
      pw.classList.toggle("on", on);
      pw.setAttribute("aria-checked", String(on));
      label.textContent = on ? t("turn_off") : t("turn_on");
      readings.replaceChildren(...siblings.map((id) => {
        const s2 = ctx.hass.states[id];
        if (!s2 || isNaN(Number(s2.state))) return "";
        return h("span", { class: "hp-room-chip" }, icon(READING_ICON[s2.attributes.device_class] || "mdi:gauge"), stateText(ctx.hass, s2));
      }));
    });    updaters[updaters.length - 1](st0);
  }

  if (d === "light") {
    const modes = st0.attributes.supported_color_modes || [];
    const dims = modes.some((m) => m !== "onoff");
    if (dims) {
      const send = throttle((v) => call("light", "turn_on", { brightness_pct: v }), 350);
      const s = slider({
        value: st0.state === "on" ? Math.round(((st0.attributes.brightness ?? 255) / 255) * 100) : 0,
        min: 1, max: 100, cls: "brightness", label: t("brightness"), vertical: mode === "sheet",
        onInput: send, onChange: (v) => call("light", "turn_on", { brightness_pct: v }),
      });
      root.append(mode === "sheet" ? h("div", { class: "hp-sheet-big" }, s) : s);
      updaters.push((st) => s.update(st.state === "on" ? Math.round(((st.attributes.brightness ?? 255) / 255) * 100) : 0));
    }
    if (modes.includes("color_temp")) {
      const min = st0.attributes.min_color_temp_kelvin || 2000;
      const max = st0.attributes.max_color_temp_kelvin || 6500;
      const s = slider({
        value: st0.attributes.color_temp_kelvin || min, min, max, step: 50, cls: "kelvin", label: t("color_temp"),
        fill: "transparent",
        onChange: (v) => call("light", "turn_on", { color_temp_kelvin: v }),
      });
      s.style.background = `linear-gradient(90deg, ${kelvinCss(min)}, ${kelvinCss(max)})`;
      root.append(s);
      updaters.push((st) => s.update(st.attributes.color_temp_kelvin));
    }
    if (modes.some((m) => ["hs", "xy", "rgb", "rgbw", "rgbww"].includes(m))) {
      const row = h("div", { class: "hp-swatches" },
        SWATCHES.map((hs) =>
          h("button", {
            class: "hp-swatch", style: { background: `hsl(${hs[0]}, ${hs[1]}%, 58%)` }, "aria-label": `${hs[0]}`,
            onclick: (e) => { e.stopPropagation(); call("light", "turn_on", { hs_color: hs }); },
          })
        )
      );
      root.append(row);
    }
  } else if (d === "lock" && mode === "sheet") {
    // Locks: Lock and Unlock as big buttons, Open (unlatch) when the lock can.
    const big = (ic, label, svc, cls) => {
      const b = h("button", { class: `hp-gate-btn ${cls}` }, icon(ic), h("span", {}, label));
      b.addEventListener("click", (e) => { e.stopPropagation(); call("lock", svc); });
      return b;
    };
    const unlock = big("mdi:lock-open-variant-outline", t("unlock"), "unlock", "open");
    const lock = big("mdi:lock-outline", t("lock"), "lock", "close");
    const row = h("div", { class: "hp-gate-row" }, unlock, lock);
    if (supports(st0, 1)) row.append(big("mdi:door-open", t("open_action"), "open", "stop"));
    root.append(row);
    updaters.push((st) => {
      const busy = ["locking", "unlocking", "opening"].includes(st.state);
      unlock.classList.toggle("active", st.state === "unlocking");
      lock.classList.toggle("active", st.state === "locking");
      unlock.disabled = !busy && (st.state === "unlocked" || st.state === "open");
      lock.disabled = !busy && st.state === "locked";
    });
    updaters[updaters.length - 1](st0);
  } else if (d === "cover" && mode === "sheet" && GATE_COVER.has(st0.attributes.device_class) && !supports(st0, COVER.SET_POSITION)) {
    // Gates and garage doors: two big buttons, Stop while it moves.
    const big = (ic, label, svc, cls) => {
      const b = h("button", { class: `hp-gate-btn ${cls}` }, icon(ic), h("span", {}, label));
      b.addEventListener("click", (e) => { e.stopPropagation(); call("cover", svc); });
      return b;
    };
    const open = big("mdi:arrow-up-bold", t("open_action"), "open_cover", "open");
    const stop = big("mdi:stop", t("stop"), "stop_cover", "stop");
    const close = big("mdi:arrow-down-bold", t("close"), "close_cover", "close");
    root.append(h("div", { class: "hp-gate-row" }, open, stop, close));
    updaters.push((st) => {
      const moving = st.state === "opening" || st.state === "closing";
      stop.hidden = !moving || !supports(st, COVER.STOP);
      open.classList.toggle("active", st.state === "opening");
      close.classList.toggle("active", st.state === "closing");
      open.disabled = st.state === "open";
      close.disabled = st.state === "closed";
    });
    updaters[updaters.length - 1](st0);
  } else if (d === "cover") {
    const wrap = h("div", { class: "hp-cover-row" });
    if (supports(st0, COVER.SET_POSITION)) {
      const s = slider({
        value: st0.attributes.current_position ?? 0, vertical: true, cls: "position", label: t("position"),
        onChange: (v) => call("cover", "set_cover_position", { position: v }),
      });
      wrap.append(s);
      updaters.push((st) => s.update(st.attributes.current_position));
    }
    const btns = h("div", { class: "hp-btn-col" },
      supports(st0, COVER.OPEN) && roundBtn("mdi:arrow-up", t("open"), () => call("cover", "open_cover")),
      supports(st0, COVER.STOP) && roundBtn("mdi:stop", t("stop"), () => call("cover", "stop_cover")),
      supports(st0, COVER.CLOSE) && roundBtn("mdi:arrow-down", t("close"), () => call("cover", "close_cover")),
    );
    wrap.append(btns);
    root.append(wrap);
    if (mode === "sheet" && supports(st0, COVER.SET_POSITION)) {
      const chips = positionChips((v) => call("cover", "set_cover_position", { position: v }));
      root.append(chips);
      updaters.push((st) => chips.update(st.attributes.current_position));
    }
  } else if (d === "fan") {
    if (supports(st0, FAN.SET_SPEED)) {
      const s = slider({
        value: st0.state === "on" ? st0.attributes.percentage ?? 0 : 0, step: st0.attributes.percentage_step || 1,
        cls: "speed", label: t("speed"),
        onChange: (v) => (v === 0 ? call("fan", "turn_off") : call("fan", "set_percentage", { percentage: Math.round(v) })),
      });
      root.append(s);
      updaters.push((st) => s.update(st.state === "on" ? st.attributes.percentage ?? 0 : 0));
    }
    if (supports(st0, FAN.OSCILLATE)) {
      const b = h("button", { class: "hp-chip" }, icon("mdi:arrow-oscillating"), t("oscillate"));
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        call("fan", "oscillate", { oscillating: !ctx.hass.states[entityId].attributes.oscillating });
      });
      root.append(b);
      updaters.push((st) => b.classList.toggle("active", !!st.attributes.oscillating));
    }
  } else if (d === "climate") {
    root.append(climateRing(ctx, entityId, mode, updaters));
  } else if (d === "media_player") {
    const row = h("div", { class: "hp-media-row" },
      supports(st0, MEDIA.PREVIOUS) && roundBtn("mdi:skip-previous", t("previous"), () => call("media_player", "media_previous_track")),
      roundBtn("mdi:play-pause", t("play_pause"), () => call("media_player", "media_play_pause"), "main"),
      supports(st0, MEDIA.NEXT) && roundBtn("mdi:skip-next", t("next"), () => call("media_player", "media_next_track")),
    );
    root.append(row);
    if (supports(st0, MEDIA.VOLUME_SET)) {
      const s = slider({
        value: Math.round((st0.attributes.volume_level ?? 0) * 100), cls: "volume", label: t("volume"),
        onChange: (v) => call("media_player", "volume_set", { volume_level: v / 100 }),
      });
      root.append(h("div", { class: "hp-vol" }, icon("mdi:volume-low"), s));
      updaters.push((st) => s.update(Math.round((st.attributes.volume_level ?? 0) * 100)));
    }
    updaters.push((st) => {
      const pp = row.querySelector(".main ha-icon");
      if (pp) pp.icon = st.state === "playing" ? "mdi:pause" : "mdi:play";
    });
  }
  root.update(st0);
  return root;
}

export function roundBtn(ic, label, onClick, cls = "") {
  const b = h("button", { class: `hp-round ${cls}`, "aria-label": label, title: label }, icon(ic));
  b.addEventListener("pointerdown", (e) => e.stopPropagation());
  b.addEventListener("click", (e) => {
    e.stopPropagation();
    onClick();
  });
  return b;
}

/** Temperature ring with drag, +/− and the HVAC modes. */
function climateRing(ctx, entityId, mode, updaters) {
  const st0 = ctx.hass.states[entityId];
  const a = st0.attributes;
  const min = a.min_temp ?? 7;
  const max = a.max_temp ?? 35;
  const step = a.target_temp_step || (ctx.hass.config.unit_system.temperature === "°F" ? 1 : 0.5);
  const R = 52;
  const C = 2 * Math.PI * R;
  const ARC = 0.75; // 270°
  const ns = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(ns, "svg");
  svg.setAttribute("viewBox", "0 0 128 128");
  svg.classList.add("hp-ring-svg");
  const mk = (cls) => {
    const c = document.createElementNS(ns, "circle");
    c.setAttribute("cx", "64");
    c.setAttribute("cy", "64");
    c.setAttribute("r", String(R));
    c.setAttribute("class", cls);
    c.setAttribute("transform", "rotate(135 64 64)");
    c.style.strokeDasharray = `${C * ARC} ${C}`;
    svg.append(c);
    return c;
  };
  mk("track");
  const val = mk("value");
  const knob = document.createElementNS(ns, "circle");
  knob.setAttribute("r", "7");
  knob.setAttribute("class", "knob");
  svg.append(knob);

  const big = h("div", { class: "hp-ring-temp" });
  const sub = h("div", { class: "hp-ring-sub" });
  const ring = h("div", { class: `hp-ring ${mode}` }, svg, h("div", { class: "hp-ring-center" }, big, sub));
  let target = a.temperature ?? min;
  let dragging = false;
  const hasTarget = (st) => supports(st, CLIMATE_TARGET) && st.attributes.temperature != null;
  const draw = (st) => {
    const f = clamp((target - min) / (max - min), 0, 1);
    val.style.strokeDasharray = `${C * ARC * f} ${C}`;
    const ang = ((135 + 270 * f) * Math.PI) / 180;
    knob.setAttribute("cx", String(64 + R * Math.cos(ang)));
    knob.setAttribute("cy", String(64 + R * Math.sin(ang)));
    big.textContent = hasTarget(st) ? `${formatNumber(ctx.hass, target, 1)}°` : "–";
    const cur = st.attributes.current_temperature;
    sub.textContent = cur != null ? `${t("now")} ${formatNumber(ctx.hass, cur, 1)}°` : "";
    ring.dataset.mode = st.state;
  };
  const send = () => ctx.hass.callService("climate", "set_temperature", { entity_id: entityId, temperature: target });
  const fromEvent = (e) => {
    const r = svg.getBoundingClientRect();
    let ang = (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    ang = (ang - 135 + 360) % 360;
    if (ang > 270) ang = ang > 315 ? 0 : 270;
    const v = min + (ang / 270) * (max - min);
    target = clamp(Math.round(v / step) * step, min, max);
    draw(ctx.hass.states[entityId]);
  };
  svg.addEventListener("pointerdown", (e) => {
    if (!hasTarget(ctx.hass.states[entityId])) return;
    e.stopPropagation();
    dragging = true;
    svg.setPointerCapture(e.pointerId);
    fromEvent(e);
  });
  svg.addEventListener("pointermove", (e) => dragging && fromEvent(e));
  svg.addEventListener("pointerup", () => {
    if (dragging) send();
    dragging = false;
  });
  const bump = (dir) => {
    target = clamp(Math.round((target + dir * step) / step) * step, min, max);
    draw(ctx.hass.states[entityId]);
    sendSoon();
  };
  let sendTimer;
  const sendSoon = () => {
    clearTimeout(sendTimer);
    sendTimer = setTimeout(() => {
      sendTimer = null;
      send();
    }, 700);
  };
  const wrap = h("div", { class: "hp-climate" },
    h("div", { class: "hp-ring-wrap" }, roundBtn("mdi:minus", "−", () => bump(-1)), ring, roundBtn("mdi:plus", "+", () => bump(1))),
  );
  const modes = h("div", { class: "hp-modes" });
  const MODE_ICONS = { off: "mdi:power", heat: "mdi:fire", cool: "mdi:snowflake", heat_cool: "mdi:sun-snowflake-variant", auto: "mdi:thermostat-auto", dry: "mdi:water-percent", fan_only: "mdi:fan" };
  for (const m of a.hvac_modes || []) {
    const b = h("button", { class: "hp-chip", dataset: { mode: m }, title: ctx.hass.formatEntityAttributeValue?.(st0, "hvac_mode", m) || m },
      icon(MODE_ICONS[m] || "mdi:thermostat"),
      mode === "sheet" ? (ctx.hass.formatEntityState?.({ ...st0, state: m }) || m) : null);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      ctx.hass.callService("climate", "set_hvac_mode", { entity_id: entityId, hvac_mode: m });
    });
    modes.append(b);
  }
  wrap.append(modes);

  // In the popup: presets (Boost, Eco, …) and fan speeds, when the device has them.
  const chipRow = (list, attr, service, icons) => {
    if (mode !== "sheet" || !list?.length || list.length < 2) return null;
    const row = h("div", { class: "hp-modes hp-modes-extra" });
    for (const v of list) {
      const label = ctx.hass.formatEntityAttributeValue?.(st0, attr, v) || v;
      const b = h("button", { class: "hp-chip", dataset: { value: v }, title: label }, icon(icons[v] || icons._ || "mdi:tune"), label);
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        ctx.hass.callService("climate", service, { entity_id: entityId, [attr]: v });
      });
      row.append(b);
    }
    wrap.append(row);
    return (st) => row.querySelectorAll(".hp-chip").forEach((b) => b.classList.toggle("active", b.dataset.value === st.attributes[attr]));
  };
  const presetSync = chipRow(a.preset_modes, "preset_mode", "set_preset_mode", {
    none: "mdi:thermostat", boost: "mdi:rocket-launch-outline", eco: "mdi:leaf", away: "mdi:home-export-outline", home: "mdi:home-outline",
    comfort: "mdi:sofa-outline", sleep: "mdi:power-sleep", activity: "mdi:run", quiet: "mdi:volume-low", wind_free: "mdi:weather-windy", wind_free_sleep: "mdi:weather-night",
  });
  const fanSync = chipRow(a.fan_modes, "fan_mode", "set_fan_mode", { auto: "mdi:fan-auto", low: "mdi:fan-speed-1", medium: "mdi:fan-speed-2", high: "mdi:fan-speed-3", _: "mdi:fan" });

  updaters.push((st) => {
    if (!dragging && !sendTimer) target = st.attributes.temperature ?? target;
    if (!dragging) draw(st);
    modes.querySelectorAll(".hp-chip").forEach((b) => b.classList.toggle("active", b.dataset.mode === st.state));
    presetSync?.(st);
    fanSync?.(st);
  });
  return wrap;
}

const GATE_SENSOR = new Set(["door", "garage_door", "opening", "gate"]);
const GATE_COVER = new Set(["garage", "gate", "door"]);
const FILLER = /\b(open|opened|offen|geöffnet|status|state|sensor|contact|kontakt|zustand)\b/g;

/**
 * The gate or garage door a door sensor belongs to, so tapping "Entry Gate Open" opens the gate's
 * open/close popup instead of the sensor's history. Same device first, then by name.
 */
export function linkedCover(hass, entityId) {
  if (!entityId.startsWith("binary_sensor.")) return null;
  const st = hass.states[entityId];
  if (st?.attributes.device_class === "lock") return linkedLock(hass, entityId, st);
  if (!st || !GATE_SENSOR.has(st.attributes.device_class)) return null;
  const dev = hass.entities?.[entityId]?.device_id;
  if (dev) {
    const same = Object.values(hass.entities).find((e) => e.device_id === dev && e.entity_id.startsWith("cover.") && hass.states[e.entity_id]);
    if (same) return same.entity_id;
  }
  const words = (st.attributes.friendly_name || "").toLowerCase().replace(FILLER, " ").split(/[^\p{L}\p{N}]+/u).filter((w) => w.length > 1);
  if (!words.length) return null;
  const phrase = words.join(" ");
  const match = Object.keys(hass.states)
    .filter((k) => k.startsWith("cover.") && GATE_COVER.has(hass.states[k].attributes.device_class))
    .map((k) => ({ k, n: (hass.states[k].attributes.friendly_name || "").toLowerCase() }))
    .filter((c) => words.every((w) => c.n.includes(w)))
    .sort((a, b) => Number(b.n.startsWith(phrase)) - Number(a.n.startsWith(phrase)) || a.n.length - b.n.length);
  return match[0]?.k || null;
}

const LINKS_KEY = "hauspanel.links";
let links = null;
function remembered() {
  if (!links) {
    try { links = JSON.parse(localStorage.getItem(LINKS_KEY) || "{}"); } catch { links = {}; }
  }
  return links;
}
function remember(sensor, target) {
  remembered()[sensor] = target;
  try { localStorage.setItem(LINKS_KEY, JSON.stringify(links)); } catch { /* fine for this visit */ }
}

function areaNameOf(hass, id) {
  const e = hass.entities?.[id];
  const area = e?.area_id || (e?.device_id && hass.devices?.[e.device_id]?.area_id);
  return area ? (hass.areas?.[area]?.name || "").toLowerCase() : "";
}

/**
 * The lock a lock sensor (binary_sensor, device class lock) stands for, so its tap opens the lock popup.
 * Same device first. Otherwise among the real locks (not settings like a thermostat's child lock):
 * the one whose state agrees (sensor on = not locked), preferring a lock in the room named in the sensor
 * ("Garage Side Door" → a lock in Garage), then the one that changed closest in time. A match that was
 * the only possible one is remembered on this device.
 */
function linkedLock(hass, entityId, st) {
  const dev = hass.entities?.[entityId]?.device_id;
  if (dev) {
    const same = Object.values(hass.entities).find((e) => e.device_id === dev && e.entity_id.startsWith("lock.") && hass.states[e.entity_id]);
    if (same) return same.entity_id;
  }
  const known = remembered()[entityId];
  if (known && hass.states[known]) return known;
  const on = st.state === "on";
  const t0 = new Date(st.last_changed).getTime();
  const name = (st.attributes.friendly_name || "").toLowerCase();
  const real = Object.keys(hass.states).filter((k) => k.startsWith("lock.") && !hass.entities?.[k]?.entity_category && !hass.entities?.[k]?.hidden);
  const cands = real
    .filter((k) => (hass.states[k].state !== "locked") === on)
    .map((k) => {
      const area = areaNameOf(hass, k);
      return { k, room: area && name.includes(area) ? 1 : 0, dt: Math.abs(new Date(hass.states[k].last_changed).getTime() - t0) };
    })
    .sort((a, b) => b.room - a.room || a.dt - b.dt);
  if (!cands.length) return null;
  const best = cands.filter((c) => c.room === cands[0].room);
  if (best.length === 1) remember(entityId, best[0].k);
  return cands[0].k;
}
