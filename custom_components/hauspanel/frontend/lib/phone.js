// iPhone layout: a fixed tab bar at the bottom, a top bar with a back button, and a stack of screens
// (Home → room, Rooms → room). Swiping in from the left edge goes back too.
import { h, icon, bindTapHold } from "./util.js";
import { renderHome, renderPage, roomView, roomStats, roomTemp, onText, switchRoom, roomsByFloor, floorHeading } from "./layouts.js";
import { t } from "./i18n.js";
import { roomPresence } from "./model.js";

/** Phones: the smaller side of the screen is under 500 px (iPhone in portrait and landscape). */
export const isPhoneScreen = () => Math.min(window.innerWidth, window.innerHeight) < 500;

/** The list on the Rooms tab, by floor: one row per room with what is on, the temperature and a power button. */
function roomList(ctx) {
  // Rows or half-width cards (two per line), switched with the small buttons on top (in edit mode only).
  // "list": one per line · "grid": two per line as cards · "compact": two per line, as low as a row.
  const mode = ctx.settings.s.roomsView || (ctx.settings.s.roomsGrid ? "grid" : "list");
  const grid = mode !== "list";
  const list = h("div", { class: `hp-ph-rooms ${grid ? "grid" : ""} ${mode === "compact" ? "compact" : ""}` });
  const view = (m, ic, label) => {
    const b = h("button", { class: `hp-ph-view ${mode === m ? "active" : ""}`, "aria-label": label, title: label }, icon(ic));
    b.addEventListener("click", () => mode !== m && ctx.settings.update((x) => { x.roomsView = m; }));
    return b;
  };
  const switcher = h("div", { class: "hp-ph-views" }, view("list", "mdi:view-agenda-outline", t("rooms_rows")),
    view("grid", "mdi:view-grid-outline", t("rooms_grid")), view("compact", "mdi:view-module-outline", t("rooms_compact")));
  const groups = roomsByFloor(ctx);
  for (const a of groups.flatMap((g) => [g, ...g.rooms])) {
    if (a.rooms) {
      const head = floorHeading(groups, a, "hp-ph-floor", ctx);
      if (head) list.append(head);
      continue;
    }
    const sub = h("small", {});
    const power = h("button", { class: "hp-power", "aria-label": t("power") }, icon("mdi:power"));
    const ic = h("div", { class: "hp-tile-icon" }, icon(a.icon || "mdi:texture-box"));
    // Room names hyphenate in the user's language when two per line ("Schlaf-zimmer").
    const nameEl = h("b", { lang: ctx.hass.locale?.language || ctx.hass.language || "de" }, a.name || t("other"));
    const text = h("div", { class: "hp-ph-room-text" }, nameEl, sub);
    // Someone in the room, for people who switched it on (presence sensors; motion only without one).
    const pres = h("span", { class: "hp-presence", hidden: true, title: t("rp_motion_now") }, icon("mdi:account"));
    fitName(nameEl);
    const row = mode === "grid"
      ? h("div", { class: "hp-card hp-ph-room small", role: "button", tabindex: "0" }, h("div", { class: "hp-ph-room-top" }, ic, pres, power), text)
      : mode === "compact"
        ? h("div", { class: "hp-card hp-ph-room mini", role: "button", tabindex: "0" }, ic, text, pres, power)
        : h("div", { class: "hp-card hp-ph-room", role: "button", tabindex: "0" }, ic, text, pres, power, icon("mdi:chevron-right", "hp-ph-chev"));
    let stats;
    power.addEventListener("pointerdown", (e) => e.stopPropagation());
    power.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!ctx.editing) switchRoom(ctx, stats, !stats.on);
    });
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
    list.append(row);
  }
  if (!list.children.length) return h("div", { class: "hp-empty" }, t("no_rooms"));
  return h("div", {}, switcher, list);
}

/**
 * Every room tile keeps the same height: the name stays on one line and gets a little smaller
 * when it is too long ("Bathroom KG"), down to a floor, then ends in "…".
 */
const fitRO = typeof ResizeObserver !== "undefined" ? new ResizeObserver((es) => es.forEach((e) => fitNow(e.target))) : null;
function fitNow(el) {
  if (!el.isConnected || !el.clientWidth) return;
  el.style.fontSize = "";
  const base = parseFloat(getComputedStyle(el).fontSize) || 14;
  let size = base;
  while (el.scrollWidth > el.clientWidth + 0.5 && size > base * 0.78) {
    size -= 0.5;
    el.style.fontSize = `${size}px`;
  }
}
function fitName(el) {
  fitRO?.observe(el);
}

/** The screen below the top bar for the current tab and room. */
export function renderPhone(ctx) {
  const room = ctx.phoneRoom && ctx.roomList().find((a) => a.id === ctx.phoneRoom);
  if (room) return h("div", { class: "hp-layout hp-layout-phone" }, roomView(ctx, room, "grid", { hideName: true }));
  if (ctx.tab === "home") {
    const home = renderHome(ctx, "grid");
    home.classList.add("hp-layout-phone");
    // Gates, garage, locks and doors live in the Security chip's popup (arranged there), not on Home.
    return home;
  }
  if (ctx.tab === "rooms") return h("div", { class: "hp-layout hp-layout-phone" }, roomList(ctx));
  const page = ctx._page();
  if (!page) return null;
  const view = renderPage(ctx, "grid", { ...page, title: null });
  view.classList.add("hp-layout-phone");
  return view;
}

/** Swiping in from the left edge goes one screen back. */
export function bindEdgeSwipe(el, canBack, back) {
  let start = null;
  el.addEventListener("touchstart", (e) => {
    const p = e.touches[0];
    start = e.touches.length === 1 && p.clientX < 28 && canBack() ? { x: p.clientX, y: p.clientY } : null;
  }, { passive: true });
  el.addEventListener("touchend", (e) => {
    if (!start) return;
    const p = e.changedTouches[0];
    const dx = p.clientX - start.x;
    const dy = Math.abs(p.clientY - start.y);
    start = null;
    if (dx > 70 && dy < 60) back();
  }, { passive: true });
}
