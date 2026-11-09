// Small DOM and Home Assistant helpers shared by every part of the panel.

/** Build an element: h("div", {class: "x", onclick: fn}, child, "text"). */
export function h(tag, props, ...children) {
  const el = document.createElement(tag);
  if (props) {
    for (const [k, v] of Object.entries(props)) {
      if (v === undefined || v === null || v === false) continue;
      if (k === "class") el.className = v;
      else if (k === "style" && typeof v === "object") Object.assign(el.style, v);
      else if (k === "dataset") Object.assign(el.dataset, v);
      else if (k.startsWith("on") && typeof v === "function") el.addEventListener(k.slice(2), v);
      else if (k in el && typeof v !== "string") el[k] = v;
      else el.setAttribute(k, v === true ? "" : v);
    }
  }
  appendChildren(el, children);
  return el;
}

function appendChildren(el, children) {
  for (const c of children) {
    if (c === undefined || c === null || c === false) continue;
    if (Array.isArray(c)) appendChildren(el, c);
    else el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
}

export const icon = (name, cls) => h("ha-icon", { icon: name, class: cls ? `hp-ic ${cls}` : "hp-ic" });

export const domainOf = (entityId) => entityId.split(".")[0];

export function clamp(v, min, max) {
  return Math.min(max, Math.max(min, v));
}

export function debounce(fn, ms) {
  let t;
  return (...a) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...a), ms);
  };
}

export const uid = () => Math.random().toString(36).slice(2, 9);

export const UNAVAILABLE = new Set(["unavailable", "unknown"]);

/** Stateless entities (scenes, buttons) report "unknown" until first used; that is not an error. */
const STATELESS = new Set(["scene", "button", "input_button", "event"]);
export function isUnavailable(st) {
  if (!st) return true;
  if (st.state === "unavailable") return true;
  return st.state === "unknown" && !STATELESS.has(st.entity_id.split(".")[0]);
}

/** Fire an event the Home Assistant shell listens to (more-info, sidebar, …). */
export function fireHass(node, type, detail) {
  node.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
}

export function sameDay(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

export function startOfDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

/** Hue/saturation (0-360/0-100) to a CSS colour. */
export const hsCss = (hs, l = 60) => `hsl(${hs[0]}, ${Math.max(hs[1], 30)}%, ${l}%)`;

/** Approximate colour of a colour temperature for the slider and glow. */
export function kelvinCss(k) {
  const t = clamp((k - 2000) / 4500, 0, 1);
  const r = Math.round(255 - t * 40);
  const g = Math.round(180 + t * 50);
  const b = Math.round(90 + t * 165);
  return `rgb(${r},${g},${b})`;
}

/** Light colour for the active tile glow. */
export function lightColor(st) {
  const a = st.attributes;
  if (a.rgb_color) return `rgb(${a.rgb_color.join(",")})`;
  if (a.hs_color) return hsCss(a.hs_color);
  if (a.color_temp_kelvin) return kelvinCss(a.color_temp_kelvin);
  return null;
}

export function supports(st, bit) {
  return ((st?.attributes?.supported_features ?? 0) & bit) !== 0;
}

/** Display name of an entity, trimmed of its device and area name when that helps. */
export function entityName(hass, entityId, areaName) {
  const st = hass.states[entityId];
  const reg = hass.entities[entityId];
  let name = reg?.name || st?.attributes?.friendly_name || entityId;
  const dev = reg?.device_id ? hass.devices[reg.device_id] : undefined;
  const devName = dev?.name_by_user || dev?.name;
  if (!reg?.name && devName && name !== devName && name.startsWith(devName + " ")) {
    name = name.slice(devName.length + 1);
    name = name.charAt(0).toUpperCase() + name.slice(1);
  }
  if (areaName && name.toLowerCase().startsWith(areaName.toLowerCase() + " ")) {
    const rest = name.slice(areaName.length + 1);
    if (rest.length > 2) name = rest.charAt(0).toUpperCase() + rest.slice(1);
  }
  return name;
}

export function formatNumber(hass, v, digits) {
  const n = Number(v);
  if (Number.isNaN(n)) return String(v);
  return n.toLocaleString(hass.locale?.language || hass.language, {
    maximumFractionDigits: digits ?? (Math.abs(n) < 10 ? 1 : 0),
  });
}

/** Clock time following the user's HA profile (time format: language, system, 12 or 24 hours). */
export function formatTime(hass, d) {
  const lang = hass.locale?.language || hass.language;
  const tf = hass.locale?.time_format;
  const opts = { hour: "2-digit", minute: "2-digit" };
  if (tf === "24") opts.hourCycle = "h23";
  else if (tf === "12") opts.hour12 = true;
  else if (tf === "system") {
    const sys = new Intl.DateTimeFormat(undefined, { hour: "numeric" }).resolvedOptions();
    opts.hour12 = sys.hour12 ?? /h1[12]/.test(sys.hourCycle || "");
  }
  return d.toLocaleTimeString(lang, opts);
}

export function formatDate(hass, d, opts) {
  return d.toLocaleDateString(hass.locale?.language || hass.language, opts);
}

/** Pointer gesture: short tap or hold (500 ms), without firing both. */
export function bindTapHold(el, { tap, hold, canStart }) {
  let timer = null;
  let held = false;
  let start = null;
  const cancel = () => {
    clearTimeout(timer);
    timer = null;
  };
  el.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || (canStart && !canStart(e))) return;
    held = false;
    start = { x: e.clientX, y: e.clientY };
    cancel();
    timer = setTimeout(() => {
      held = true;
      timer = null;
      if (navigator.vibrate) navigator.vibrate(15);
      hold?.(e);
    }, 500);
  });
  el.addEventListener("pointermove", (e) => {
    if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) {
      cancel();
      start = null;
    }
  });
  el.addEventListener("pointerup", (e) => {
    const wasTimer = timer !== null;
    cancel();
    if (start && wasTimer && !held) tap?.(e);
    start = null;
  });
  el.addEventListener("pointercancel", () => {
    cancel();
    start = null;
  });
  el.addEventListener("contextmenu", (e) => e.preventDefault());
}

/** Horizontal or vertical slider driven by pointer events; calls onChange on release. */
export function slider({ value, min = 0, max = 100, step = 1, vertical = false, cls = "", fill, onInput, onChange, label }) {
  const track = h("div", { class: `hp-slider ${vertical ? "vertical" : ""} ${cls}`, role: "slider", "aria-label": label || "" });
  const bar = h("div", { class: "hp-slider-fill" });
  if (fill) bar.style.background = fill;
  const knob = h("div", { class: "hp-slider-knob" });
  track.append(bar, knob);
  let cur = value;
  const set = (v) => {
    cur = clamp(Math.round(v / step) * step, min, max);
    const pct = max === min ? 0 : ((cur - min) / (max - min)) * 100;
    if (vertical) {
      bar.style.height = `${pct}%`;
      knob.style.bottom = `calc(${pct}% - 2px)`;
    } else {
      bar.style.width = `${pct}%`;
      knob.style.left = `calc(${pct}% - 2px)`;
    }
    track.setAttribute("aria-valuenow", cur);
  };
  set(value ?? min);
  let dragging = false;
  const fromEvent = (e) => {
    const r = track.getBoundingClientRect();
    const f = vertical ? 1 - (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    return min + clamp(f, 0, 1) * (max - min);
  };
  track.addEventListener("pointerdown", (e) => {
    e.stopPropagation();
    dragging = true;
    track.setPointerCapture(e.pointerId);
    set(fromEvent(e));
    onInput?.(cur);
  });
  track.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    set(fromEvent(e));
    onInput?.(cur);
  });
  const end = (e) => {
    if (!dragging) return;
    dragging = false;
    set(fromEvent(e));
    onChange?.(cur);
  };
  track.addEventListener("pointerup", end);
  track.addEventListener("pointercancel", () => (dragging = false));
  track.addEventListener("click", (e) => e.stopPropagation());
  track.update = (v) => {
    if (!dragging && v !== undefined && v !== null) set(v);
  };
  track.isDragging = () => dragging;
  return track;
}

/** On/off switch. */
export function toggleSwitch(on, onToggle) {
  const sw = h("button", { class: `hp-switch ${on ? "on" : ""}`, role: "switch", "aria-checked": String(!!on) }, h("span"));
  sw.addEventListener("click", (e) => {
    e.stopPropagation();
    onToggle();
  });
  sw.addEventListener("pointerdown", (e) => e.stopPropagation());
  sw.update = (v) => {
    sw.classList.toggle("on", !!v);
    sw.setAttribute("aria-checked", String(!!v));
  };
  return sw;
}

/** A lock that is not locked, or a lock sensor (binary_sensor, device class lock) that reports "unlocked". */
export function isUnlocked(hass, id) {
  const st = hass.states[id];
  if (!st) return false;
  if (id.startsWith("lock.")) return st.state !== "locked";
  return id.startsWith("binary_sensor.") && st.attributes.device_class === "lock" && st.state === "on";
}
