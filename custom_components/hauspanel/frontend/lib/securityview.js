// Security page: a status row (locks, doors, alarm, smoke) and a wall of live cameras.
import { h, icon, entityName, bindTapHold, domainOf, isUnavailable } from "./util.js";
import { isOn } from "./model.js";
import { entityIcon, stateText, tapAction, linkedCover } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { liveVideo, snapshotUrl, findMedia, openCameraFull } from "./camera.js";
import { sortable } from "./drag.js";
import { t } from "./i18n.js";

export const CAM_CONTAINER = "security:cameras";

const OPENING = new Set(["door", "window", "garage_door", "opening"]);
const GATES = new Set(["garage", "gate", "door"]);

const areaName = (ctx, id) => ctx.model.areaById.get(ctx.model.areaOf[id])?.name;

/** What goes in the status row, in a sensible order: alarm, locks, gates, doors, the rest. */
export function statusItems(ctx) {
  const hass = ctx.hass;
  const sec = ctx.securityItems();
  // A gate or lock whose sensor is listed shows once: the sensor stays (its tap opens the popup).
  const linked = new Set(sec.map((id) => linkedCover(hass, id)).filter(Boolean));
  const dc = (id) => hass.states[id]?.attributes.device_class;
  const gates = ctx.model.all.filter((id) => domainOf(id) === "cover" && GATES.has(dc(id)) && !linked.has(id));
  const alarm = sec.filter((id) => domainOf(id) === "alarm_control_panel");
  // Lock sensors (binary_sensor, device class lock) stand with the locks.
  const locks = sec.filter((id) => (domainOf(id) === "lock" && !linked.has(id)) || (domainOf(id) === "binary_sensor" && dc(id) === "lock"));
  const doors = sec.filter((id) => domainOf(id) === "binary_sensor" && OPENING.has(dc(id)));
  const smoke = sec.filter((id) => domainOf(id) === "binary_sensor" && ["smoke", "gas", "moisture", "safety"].includes(dc(id)));
  const other = sec.filter((id) => domainOf(id) === "binary_sensor" && !doors.includes(id) && !smoke.includes(id) && !locks.includes(id));
  return { alarm, locks, gates, doors, smoke, other };
}

// Times when a door, gate or lock may be open without counting as a warning ({id: {from, to, days}}).
let allowSrc = () => ({});
export const setSecAllowSource = (fn) => { allowSrc = fn; };
const toMin = (v) => { const [a, b] = String(v || "").split(":").map(Number); return Number.isFinite(a) ? a * 60 + (b || 0) : null; };
/** The window set for this entity, if any. */
export const allowRule = (id) => allowSrc()?.[id] || null;
/** True while the entity is inside its "may be open" window (overnight windows like 22:00–06:00 work too). */
export function allowedNow(id, now = new Date()) {
  const r = allowRule(id);
  if (!r) return false;
  const f = toMin(r.from), to = toMin(r.to);
  if (f == null || to == null) return false;
  const m = now.getHours() * 60 + now.getMinutes();
  const days = r.days?.length ? r.days : [0, 1, 2, 3, 4, 5, 6];
  if (f <= to) return days.includes(now.getDay()) && m >= f && m < to;
  // Overnight: the part after midnight belongs to the day before.
  if (m >= f) return days.includes(now.getDay());
  return m < to && days.includes((now.getDay() + 6) % 7);
}
/** Open, but allowed right now. */
export function isAllowedOpen(hass, id) {
  return rawOpen(hass, id) && allowedNow(id);
}
function rawOpen(hass, id) {
  const st = hass.states[id];
  if (!st) return false;
  const d = domainOf(id);
  if (d === "lock") return st.state !== "locked";
  if (d === "cover") return st.state !== "closed";
  if (d === "binary_sensor") return st.state === "on";
  return false;
}

export function isAlert(hass, id) {
  const st = hass.states[id];
  if (!st) return false;
  const d = domainOf(id);
  if (d !== "alarm_control_panel" && allowedNow(id)) return false;
  if (d === "lock") return st.state !== "locked";
  if (d === "cover") return st.state !== "closed";
  if (d === "alarm_control_panel") return st.state === "triggered";
  if (d === "binary_sensor") return st.state === "on";
  return false;
}

/**
 * Full name: the pills mix rooms, so "Garage Door" must not shrink to "Door".
 * A gate sensor drops "Open" ("Entry Gate Open" → "Entry Gate"), since it stands for the gate.
 */
export function pillName(hass, id) {
  // A name set by hand wins: HA puts the device name in front of it ("Garage" + "Garage Door").
  const name = hass.entities?.[id]?.name || hass.states[id]?.attributes.friendly_name || entityName(hass, id);
  if (!linkedCover(hass, id)) return name;
  return name.replace(/\s*\b(open|opened|offen|geöffnet|status|state|contact|kontakt)\b\s*/gi, " ").trim() || name;
}

/** Where a detector hangs: its room, or its device name without "Smoke Alarm" when it has no room. */
function roomLabel(ctx, id) {
  const hass = ctx.hass;
  const room = areaName(ctx, id);
  if (room && room !== t("other")) return room;
  const e = hass.entities?.[id];
  const dev = e?.device_id && hass.devices?.[e.device_id];
  const n = (dev?.name_by_user || dev?.name || "").replace(/smoke\s*alarm|rauchmelder|x-?sense/gi, "").replace(/[()]/g, " ").trim();
  return n || pillName(hass, id);
}

function statusPill(ctx, id, { byRoom = false } = {}) {
  const ic = icon("mdi:help");
  const name = h("b", {});
  const state = h("small", {});
  const el = h("div", { class: "hp-spill", role: "button", tabindex: "0", dataset: { key: id } },
    h("div", { class: "hp-spill-icon" }, ic), h("div", { class: "hp-spill-text" }, name, state));
  bindTapHold(el, {
    canStart: () => !ctx.editing,
    // Locks switch (unlocking asks first); everything else opens its details.
    tap: () => (domainOf(id) === "lock" ? tapAction(ctx, id) : ctx.openDetails(id)),
    hold: () => ctx.openDetails(id),
  });
  el.update = (hass) => {
    const st = hass.states[id];
    if (!st) return;
    ic.icon = entityIcon(hass, st);
    name.textContent = byRoom ? roomLabel(ctx, id) : pillName(hass, id);
    state.textContent = isAllowedOpen(hass, id) ? `${stateText(hass, st)} · ${t("sec_allowed_until", { t: allowRule(id).to })}` : stateText(hass, st);
    el.classList.toggle("alert", isAlert(hass, id));
    el.classList.toggle("ok", !isAlert(hass, id) && !isUnavailable(st));
    el.classList.toggle("unavail", isUnavailable(st));
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

/** The smoke detectors one by one, told apart by their room. */
function openGroupSheet(ctx, ids, label) {
  const sheet = openSheet(ctx, { title: label, subtitle: t("n_devices", { n: ids.length }), cls: "spill-list" });
  const list = h("div", { class: "hp-spill-grid" }, [...ids].sort((a, b) => roomLabel(ctx, a).localeCompare(roomLabel(ctx, b))).map((id) => statusPill(ctx, id, { byRoom: true })));
  sheet.body.append(list);
  sheet.updaters.push((hs) => list.childNodes.forEach((p) => p.update(hs)));
}

/** What closes an open thing from the list: lock a lock, close a gate (also through its sensor). */
function closeAction(hass, id) {
  // A sensor stands for its lock or gate: the button acts on that device, by what it is.
  const target = domainOf(id) === "binary_sensor" ? linkedCover(hass, id) : id;
  if (!target || !hass.states[target]) return null;
  const d = domainOf(target);
  if (d === "lock") return { label: t("lock"), icon: "mdi:lock-outline", run: () => hass.callService("lock", "lock", { entity_id: target }) };
  if (d === "cover") return { label: t("close"), icon: "mdi:arrow-down", run: () => hass.callService("cover", "close_cover", { entity_id: target }) };
  return null;
}

/** One line of the security popup: icon, name, state, and for open things a "close" that asks first. */
function secRow(ctx, id) {
  const ic = icon("mdi:help");
  const name = h("b", {});
  const state = h("small", {});
  const act = h("button", { class: "hp-sec-act", hidden: true });
  const el = h("div", { class: "hp-sec-row", role: "button", tabindex: "0", dataset: { key: id } },
    h("div", { class: "hp-sec-ic" }, ic), h("div", { class: "hp-sec-text" }, name, state), act);
  let armed = 0;
  act.addEventListener("pointerdown", (e) => e.stopPropagation());
  act.addEventListener("click", (e) => {
    e.stopPropagation();
    const a = closeAction(ctx.hass, id);
    if (!a) return;
    if (!act.classList.contains("armed")) {
      act.classList.add("armed");
      act.lastChild.textContent = t("sec_confirm");
      clearTimeout(armed);
      armed = setTimeout(() => { act.classList.remove("armed"); el.update(ctx.hass, true); }, 4000);
      return;
    }
    clearTimeout(armed);
    act.classList.remove("armed");
    a.run();
    act.disabled = true;
    setTimeout(() => { act.disabled = false; }, 3000);
  });
  bindTapHold(el, {
    canStart: () => !ctx.editing,
    tap: () => ctx.openDetails(id),
    hold: () => ctx.openDetails(id),
  });
  el.update = (hass, force) => {
    const st = hass.states[id];
    if (!st) return;
    const alert = isAlert(hass, id);
    ic.icon = entityIcon(hass, st);
    name.textContent = pillName(hass, id);
    state.textContent = stateText(hass, st);
    el.classList.toggle("alert", alert);
    el.classList.toggle("unavail", isUnavailable(st));
    const a = alert ? closeAction(hass, id) : null;
    act.hidden = !a;
    if (a && (force || !act.classList.contains("armed"))) act.replaceChildren(icon(a.icon), h("span", {}, a.label));
  };
  el.update(ctx.hass);
  return el;
}

/** The smoke detectors as one line. */
function smokeRow(ctx, ids) {
  const state = h("small", {});
  const el = h("div", { class: "hp-sec-row", role: "button", tabindex: "0", dataset: { key: SMOKE_KEY } },
    h("div", { class: "hp-sec-ic" }, icon("mdi:smoke-detector-variant")), h("div", { class: "hp-sec-text" }, h("b", {}, t("smoke_alarms")), state),
    icon("mdi:chevron-right"));
  el.addEventListener("click", () => openGroupSheet(ctx, ids, t("smoke_alarms")));
  el.update = (hass) => {
    const bad = ids.filter((id) => isAlert(hass, id));
    const off = ids.filter((id) => isUnavailable(hass.states[id]));
    state.textContent = bad.length ? t("n_alarm", { n: bad.length }) : off.length ? t("n_offline", { n: off.length }) : t("all_quiet", { n: ids.length });
    el.classList.toggle("alert", bad.length > 0);
  };
  el.update(ctx.hass);
  return el;
}

/** One pill for all smoke detectors; tap lists them. */
function groupPill(ctx, ids, { iconName, label }) {
  const name = h("b", {}, label);
  const state = h("small", {});
  const el = h("div", { class: "hp-spill", role: "button", tabindex: "0" },
    h("div", { class: "hp-spill-icon" }, icon(iconName)), h("div", { class: "hp-spill-text" }, name, state));
  el.addEventListener("click", () => {
    if (!ctx.editing) openGroupSheet(ctx, ids, label);
  });
  el.update = (hass) => {
    const bad = ids.filter((id) => isAlert(hass, id));
    const off = ids.filter((id) => isUnavailable(hass.states[id]));
    state.textContent = bad.length ? t("n_alarm", { n: bad.length }) : off.length ? t("n_offline", { n: off.length }) : t("all_quiet", { n: ids.length });
    el.classList.toggle("alert", bad.length > 0);
    el.classList.toggle("ok", !bad.length);
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

/**
 * Security chip on Home: everything that can be open, as pills (open ones first), and the smoke detectors.
 * "Customise" shows every pill with an eye to hide it, drag to reorder, and Add for more.
 * It shares its arrangement with the door list the iPhone Home used to have.
 */
export function openSecuritySheet(ctx) {
  const C = HOME_SEC_CONTAINER;
  const ADD_DOMAINS = ["lock", "cover", "binary_sensor", "alarm_control_panel", "sensor"];
  let editing = false;
  const sheet = openSheet(ctx, { title: t("security"), subtitle: "", cls: "spill-list sec-sheet" });
  const sub = sheet.head.querySelector(".hp-sheet-title")?.parentElement;
  const subEl = h("div", { class: "hp-sheet-sub" });
  sub?.append(subEl);
  const body = h("div", {});
  const editBtn = h("button", { class: "hp-btn ghost" });
  const page = h("button", { class: "hp-btn ghost" }, icon("mdi:shield-outline"), t("open_security_page"));
  page.addEventListener("click", () => { sheet.close(); ctx.goTab("security"); });
  editBtn.addEventListener("click", () => { editing = !editing; draw(); });
  sheet.body.append(body, h("div", { class: "hp-sheet-actions hp-sec-foot" }, editBtn, page));

  let pills = [];
  let sig = "";
  // At the top: one calm line for the whole house, red while something is open.
  const heroIc = icon("mdi:shield-check-outline");
  const heroBig = h("b", {});
  const heroSub = h("small", {});
  const hero = h("div", { class: "hp-sec-hero" }, h("div", { class: "hp-sec-hero-ic" }, heroIc), h("div", { class: "hp-sec-hero-text" }, heroBig, heroSub));
  const updHero = (hs) => {
    const { items } = state();
    const openIds = items.filter((k) => k !== SMOKE_KEY && isAlert(hs, k));
    hero.classList.toggle("alert", openIds.length > 0);
    heroIc.icon = openIds.length ? "mdi:shield-alert-outline" : "mdi:shield-check-outline";
    heroBig.textContent = openIds.length ? t("n_open", { n: openIds.length }) : t("sec_all_closed");
    heroSub.textContent = openIds.length ? openIds.map((k) => pillName(hs, k)).join(" · ") : t("sec_all_closed_sub");
  };
  const state = () => {
    const s = statusItems(ctx);
    const auto = [...s.alarm, ...s.locks, ...s.gates, ...s.doors];
    if (s.smoke.length) auto.push(SMOKE_KEY);
    const valid = (k) => (k === SMOKE_KEY ? s.smoke.length > 0 : !!ctx.hass.states[k]);
    return { s, auto, ...ctx.settings.arrange(C, auto, valid) };
  };
  const pillFor = (s, id) => (id === SMOKE_KEY
    ? groupPill(ctx, s.smoke, { iconName: "mdi:smoke-detector-variant", label: t("smoke_alarms") })
    : statusPill(ctx, id));

  function draw() {
    const { s, auto, items, hidden } = state();
    sig = JSON.stringify(ctx.settings.cont(C));
    const alert = (k) => k !== SMOKE_KEY && isAlert(ctx.hass, k);
    editBtn.replaceChildren(icon(editing ? "mdi:check" : "mdi:pencil-outline"), editing ? t("done") : t("customise"));
    if (!editing) {
      // Open things first, unless the list was put in order by hand: then that order stays inside each part.
      const custom = (ctx.settings.cont(C).order || []).length > 0;
      const ids = custom ? items : [...items.filter(alert), ...items.filter((k) => !alert(k))];
      const rowFor = (id) => (id === SMOKE_KEY ? smokeRow(ctx, s.smoke) : secRow(ctx, id));
      const openIds = ids.filter(alert);
      const restIds = ids.filter((k) => !alert(k));
      pills = [];
      const part = (title, list, cls) => {
        if (!list.length) return null;
        const rows = list.map(rowFor);
        pills.push(...rows);
        return h("section", { class: `hp-sec-part ${cls}` }, h("div", { class: "hp-group-label" }, title), h("div", { class: "hp-sec-list" }, rows));
      };
      subEl.textContent = "";
      body.replaceChildren(...[hero,
        ids.length ? null : h("div", { class: "hp-empty small" }, t("sec_sheet_empty")),
        part(t("sec_open_now"), openIds, "open"),
        part(t("sec_all_good"), restIds, "rest")].filter(Boolean));
      updHero(ctx.hass);
      return;
    }
    subEl.textContent = t("sec_sheet_edit_hint");
    const grid = h("div", { class: "hp-spill-grid editing" });
    const eye = (id, shown) => {
      const b = h("button", { class: `hp-spill-eye ${shown ? "" : "off"}`, "aria-label": shown ? t("hide") : t("show") },
        icon(shown ? "mdi:eye-outline" : "mdi:eye-off-outline"));
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (shown) ctx.settings.hide(C, id); else ctx.settings.unhide(C, id);
        draw();
      });
      return b;
    };
    pills = [];
    for (const id of items) {
      const el = pillFor(s, id);
      el.dataset.key = id;
      el.append(eye(id, true));
      pills.push(el);
      grid.append(el);
    }
    const off = h("div", { class: "hp-spill-grid editing" });
    for (const id of hidden) {
      const el = pillFor(s, id);
      el.classList.add("is-hidden");
      el.append(eye(id, false));
      pills.push(el);
      off.append(el);
    }
    sortable(grid, { onDrop: (keys) => { ctx.settings.setOrder(C, keys); draw(); } });
    const add = h("button", { class: "hp-chip" }, icon("mdi:plus"), t("add"));
    add.addEventListener("click", () => ctx.openAdd(C, auto, ADD_DOMAINS));
    const reset = (ctx.settings.cont(C).order || []).length
      ? h("button", { class: "hp-chip", onclick: () => { ctx.settings.resetOrder(C); draw(); } }, icon("mdi:sort"), t("sec_open_first"))
      : null;
    body.replaceChildren(...[grid,
      hidden.length ? h("div", { class: "hp-group-label" }, t("hidden_n", { n: hidden.length })) : null,
      hidden.length ? off : null,
      h("div", { class: "hp-modes hp-sec-edit-tools" }, add, reset)].filter(Boolean));
  }
  draw();
  sheet.updaters.push((hs) => {
    // Something added from the add dialog: draw again.
    if (JSON.stringify(ctx.settings.cont(C)) !== sig) return draw();
    pills.forEach((p) => p.update(hs));
    if (!editing) {
      // Something opened or closed: it moves between the parts.
      const now = pills.filter((p) => p.dataset.key !== SMOKE_KEY && isAlert(hs, p.dataset.key)).map((p) => p.dataset.key).join();
      const was = pills.filter((p) => p.closest(".hp-sec-part.open")).map((p) => p.dataset.key).join();
      if (now !== was) return draw();
      updHero(hs);
    }
  });
}

export function statusRow(ctx, { compact = false } = {}) {
  const s = statusItems(ctx);
  const row = h("div", { class: `hp-spill-row ${compact ? "compact" : ""}` });
  let ids = [...s.alarm, ...s.locks, ...s.gates, ...s.doors];
  // Compact: what is open or unlocked comes first.
  if (compact) ids = [...ids.filter((id) => isAlert(ctx.hass, id)), ...ids.filter((id) => !isAlert(ctx.hass, id))];
  for (const id of ids) row.append(statusPill(ctx, id));
  if (s.smoke.length) row.append(groupPill(ctx, s.smoke, { iconName: "mdi:smoke-detector-variant", label: t("smoke_alarms") }));
  // The compact row (iPhone Home) leaves out motion and other sensors.
  if (s.other.length && !compact) row.append(groupPill(ctx, s.other, { iconName: "mdi:motion-sensor", label: t("sensors") }));
  return row.childNodes.length ? row : null;
}

export const HOME_SEC_CONTAINER = "home:security";
const SMOKE_KEY = "group:smoke";

/**
 * iPhone Home: gates, garage, locks and doors in two columns; open ones first.
 * In edit mode: drag to reorder, − to hide, Add for any lock, cover, sensor or alarm.
 */
export function homeSecurity(ctx) {
  const s = statusItems(ctx);
  const auto = [...s.alarm, ...s.locks, ...s.gates, ...s.doors];
  if (s.smoke.length) auto.push(SMOKE_KEY);
  const valid = (k) => (k === SMOKE_KEY ? s.smoke.length > 0 : !!ctx.hass.states[k]);
  const { items, hidden } = ctx.settings.arrange(HOME_SEC_CONTAINER, auto, valid);
  if (!items.length && !ctx.editing) return null;
  const alert = (k) => k !== SMOKE_KEY && isAlert(ctx.hass, k);
  // Open things first, unless the chips were put in order by hand: then that order stays.
  const custom = (ctx.settings.cont(HOME_SEC_CONTAINER).order || []).length > 0;
  const ids = ctx.editing || custom ? items : [...items.filter(alert), ...items.filter((k) => !alert(k))];
  const row = h("div", { class: "hp-spill-row compact", dataset: { container: HOME_SEC_CONTAINER } });
  for (const id of ids) {
    const el = id === SMOKE_KEY
      ? groupPill(ctx, s.smoke, { iconName: "mdi:smoke-detector-variant", label: t("smoke_alarms") })
      : statusPill(ctx, id);
    el.dataset.key = id;
    const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide") }, icon("mdi:minus"));
    minus.addEventListener("pointerdown", (e) => e.stopPropagation());
    minus.addEventListener("click", (e) => { e.stopPropagation(); ctx.hideItem(HOME_SEC_CONTAINER, id); });
    el.append(minus);
    row.append(el);
  }
  sortable(row, { onDrop: (keys) => ctx.settings.setOrder(HOME_SEC_CONTAINER, keys) });
  const tools = h("div", { class: "hp-edit-tools" },
    h("button", { class: "hp-chip", onclick: () => ctx.openAdd(HOME_SEC_CONTAINER, auto, ["lock", "cover", "binary_sensor", "alarm_control_panel", "sensor"]) }, icon("mdi:plus"), t("add")),
    hidden.length ? h("button", { class: "hp-chip", onclick: () => ctx.openHidden(HOME_SEC_CONTAINER, hidden, t("security")) }, icon("mdi:eye-off-outline"), t("hidden_n", { n: hidden.length })) : null);
  return h("div", { class: "hp-home-sec" }, row, tools);
}

/** A live camera card; tap makes it big. */
export function cameraCard(ctx, id) {
  const name = h("div", { class: "hp-camcard-name" }, h("i", { class: "hp-live-dot" }), h("span", {}, entityName(ctx.hass, id, areaName(ctx, id))));
  const still = h("img", { class: "hp-cam-still", alt: "" });
  const view = h("div", { class: "hp-camcard-view" }, still);
  const el = h("div", { class: "hp-camcard", role: "button", tabindex: "0", dataset: { key: id } }, view, name,
    h("button", { class: "hp-camcard-zoom", "aria-label": t("fullscreen") }, icon("mdi:arrow-expand")));
  let player = null;
  // The card takes the camera's own shape (16:9, 4:3, ...), measured from its still picture.
  still.addEventListener("load", () => {
    if (!el.classList.contains("live-sized") && still.naturalWidth && still.naturalHeight) el.style.setProperty("--ar", (still.naturalWidth / still.naturalHeight).toFixed(4));
  });
  const snap = () => {
    const u = snapshotUrl(ctx.hass.states[id]);
    if (u && still.src !== location.origin + u) still.src = u;
  };
  snap();
  el.addEventListener("click", () => !ctx.editing && openCameraFull(ctx, id, cameraList(ctx).items));
  const st0 = ctx.hass.states[id];
  if (st0 && st0.state !== "unavailable") {
    player = liveVideo(ctx, id);
    view.append(player);
    // Once the live picture runs, its own shape wins (a still can come from a substream with another shape).
    let tries = 0;
    const measure = setInterval(() => {
      const m = findMedia(player) || findMedia(player.shadowRoot);
      // Security page: the picture fills the even 16:9 frame (HA's player letterboxes it otherwise).
      if (m && el.closest(".hp-camwall")) Object.assign(m.style, { objectFit: "cover", width: "100%", height: "100%" });
      const w = m?.videoWidth || m?.naturalWidth;
      const hgt = m?.videoHeight || m?.naturalHeight;
      if (w && hgt) {
        el.style.setProperty("--ar", (w / hgt).toFixed(4));
        el.classList.add("live-sized");
      }
      if (((w && hgt) && !el.closest(".hp-camwall")) || ++tries > 30 || !el.isConnected && tries > 5) clearInterval(measure);
    }, 1000);
  } else {
    el.classList.add("unavail");
  }
  el.update = (hass) => {
    const st = hass.states[id];
    if (player) player.update(hass);
    else if (st) snap();
  };
  ctx.live.push(el);
  return el;
}

/** Cameras in the order set by hand (edit mode on Security), whatever room they are in. */
export function cameraList(ctx) {
  const all = ctx.model.security.filter((id) => domainOf(id) === "camera" && ctx.hass.states[id]);
  const shown = new Set(ctx.securityItems());
  const res = ctx.settings.arrange(CAM_CONTAINER, all, (id) => id.startsWith("camera.") && !!ctx.hass.states[id]);
  // Cameras hidden in their room's security group (older setting) count as hidden here too.
  const roomHidden = all.filter((id) => !shown.has(id));
  return { items: res.items.filter((id) => shown.has(id) || !all.includes(id)), hidden: [...new Set([...res.hidden, ...roomHidden])] };
}

/** Edit mode: still pictures to drag into order, − to hide. */
export function cameraEditor(ctx) {
  const { items, hidden } = cameraList(ctx);
  const wall = h("div", { class: `hp-camwall edit n${Math.min(items.length, 4)}` });
  for (const id of items) {
    const still = h("img", { class: "hp-cam-still", alt: "", src: snapshotUrl(ctx.hass.states[id]) });
    const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide") }, icon("mdi:minus"));
    minus.addEventListener("pointerdown", (e) => e.stopPropagation());
    minus.addEventListener("click", (e) => { e.stopPropagation(); ctx.hideItem(CAM_CONTAINER, id); });
    wall.append(h("div", { class: "hp-camcard", dataset: { key: id } },
      h("div", { class: "hp-camcard-view" }, still),
      h("div", { class: "hp-camcard-name" }, h("span", {}, entityName(ctx.hass, id, areaName(ctx, id)))), minus));
  }
  sortable(wall, { onDrop: (keys) => ctx.settings.setOrder(CAM_CONTAINER, keys) });
  const tools = hidden.length
    ? h("div", { class: "hp-edit-tools" }, h("button", { class: "hp-chip", onclick: () => ctx.openHidden(CAM_CONTAINER, hidden, t("cameras")) }, icon("mdi:eye-off-outline"), t("hidden_n", { n: hidden.length })))
    : null;
  return h("div", { class: "hp-cam-edit" },
    h("div", { class: "hp-label hp-secview-label" }, t("cameras"), h("span", { class: "hp-count" }, String(items.length))),
    h("p", { class: "hp-muted small" }, t("cameras_order_hint")), wall, tools);
}

export function securityView(ctx, summary, { status = true } = {}) {
  const cams = cameraList(ctx).items;
  const wall = cams.length
    ? h("div", { class: `hp-camwall n${Math.min(cams.length, 4)}` }, cams.map((id) => cameraCard(ctx, id)))
    : null;
  // In the Panel layout the left panel already shows gates and locks: then only the cameras.
  if (!status && wall) summary = null;
  // The banner opens the security popup (alarm, what is open, last movements), so no sideways pill row under it.
  if (summary && ctx.openSecurityPopup) {
    summary.setAttribute("role", "button");
    summary.classList.add("tappable");
    summary.addEventListener("click", () => ctx.openSecurityPopup());
  }
  return h("div", { class: "hp-secview" }, summary, !summary && (status || !wall) ? statusRow(ctx) : null,
    wall ? h("div", { class: "hp-label hp-secview-label" }, t("cameras"), h("span", { class: "hp-count" }, String(cams.length))) : null,
    wall);
}
