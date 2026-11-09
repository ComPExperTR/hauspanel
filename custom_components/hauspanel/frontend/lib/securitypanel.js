// Security tablet layout (for example a Raspberry Pi touchscreen at 1024×600): pages of live cameras,
// the last page with locks, doors and the other security devices. Only the page on screen streams.
import { h, icon, domainOf, isUnlocked } from "./util.js";
import { cameraList, cameraCard, statusRow, allowedNow } from "./securityview.js";
import { groupsBox, renderPage } from "./layouts.js";
import { t } from "./i18n.js";

/** Columns × rows for a number of cameras per page. */
const GRID = { 4: [2, 2], 6: [3, 2], 8: [4, 2], 9: [3, 3] };
export const CAMS_PER_PAGE = Object.keys(GRID).map(Number);

const OPENING = new Set(["door", "window", "garage_door", "opening"]);

/** The pages: camera pages first, then the status page. */
export function securityPages(ctx) {
  const cams = cameraList(ctx).items;
  const per = GRID[ctx.settings.device.camsPerPage] ? ctx.settings.device.camsPerPage : 6;
  const pages = [];
  for (let i = 0; i < cams.length; i += per) {
    const ids = cams.slice(i, i + per);
    pages.push({ kind: "cams", ids, per, label: cams.length > per ? `${i + 1}–${i + ids.length}` : t("cameras") });
  }
  pages.push({ kind: "status", label: t("status") });
  return pages;
}

function camPage(ctx, page) {
  const [cols, rows] = GRID[page.per];
  // A last page with fewer cameras uses fewer rows, so the pictures get bigger.
  const r = Math.min(rows, Math.ceil(page.ids.length / cols));
  const c = page.ids.length < cols ? page.ids.length : cols;
  // Each card sits in a cell and is fitted into it in the camera's own shape.
  const grid = h("div", { class: "hp-secpage-cams" }, page.ids.map((id) => h("div", { class: "hp-camcell" }, cameraCard(ctx, id))));
  grid.style.setProperty("--c", c);
  grid.style.setProperty("--r", r);
  return h("div", { class: "hp-layout hp-layout-secpanel cams" }, grid);
}

function statusPage(ctx) {
  const m = ctx.model;
  const groups = ctx._roomGroups("security", (a) => a.all.filter((id) => m.security.includes(id) && !id.startsWith("camera.")));
  return h("div", { class: "hp-layout hp-layout-secpanel status" },
    statusRow(ctx),
    groups.length ? groupsBox(ctx, groups, "grid") : null);
}

/** The view below the header; in edit mode the Security page's editor (camera order, hidden devices). */
export function renderSecurityPanel(ctx) {
  if (ctx.editing) {
    ctx.tab = "security";
    const page = ctx._page();
    return page ? renderPage(ctx, "grid", page) : h("div", { class: "hp-layout" });
  }
  const pages = securityPages(ctx);
  ctx.secPage = Math.max(0, Math.min(pages.length - 1, ctx.secPage || 0));
  const page = pages[ctx.secPage];
  return page.kind === "cams" ? camPage(ctx, page) : statusPage(ctx);
}

/** Page buttons at the bottom, in the dock. */
export function securityBar(ctx, go) {
  const pages = securityPages(ctx);
  const box = h("div", { class: "hp-dock-tabs" });
  pages.forEach((p, i) => {
    const b = h("button", { class: `hp-tab ${i === ctx.secPage ? "active" : ""}` },
      icon(p.kind === "cams" ? "mdi:cctv" : "mdi:shield-home-outline"), h("span", {}, p.label));
    b.addEventListener("click", () => go(i));
    box.append(b);
  });
  return box;
}

/** "Everything secure" / "2 open" for the header. */
export function securityStatePill(ctx) {
  const ic = icon("mdi:shield-check");
  const txt = h("span", {});
  const el = h("button", { class: "hp-sec-state" }, ic, txt);
  el.addEventListener("click", () => ctx.goSecurityPage?.(-1));
  el.update = (hass) => {
    const sec = ctx.securityItems().filter((id) => !allowedNow(id));
    const unlocked = sec.filter((id) => isUnlocked(hass, id));
    const open = sec.filter((id) => domainOf(id) === "binary_sensor" && OPENING.has(hass.states[id]?.attributes.device_class) && hass.states[id]?.state === "on");
    const bad = unlocked.length + open.length;
    const label = bad
      ? [unlocked.length ? t("unlocked_n", { n: unlocked.length }) : null, open.length ? t("open_n", { n: open.length }) : null].filter(Boolean).join(" · ")
      : t("everything_secure");
    if (txt.textContent !== label) txt.textContent = label;
    ic.icon = bad ? "mdi:shield-alert-outline" : "mdi:shield-check";
    el.classList.toggle("alert", bad > 0);
    el.classList.toggle("ok", !bad);
  };
  el.update(ctx.hass);
  ctx.live.push(el);
  return el;
}

/** Swipe sideways to change pages. */
export function bindPageSwipe(el, enabled, step) {
  let start = null;
  el.addEventListener("pointerdown", (e) => {
    start = enabled() && e.isPrimary ? { x: e.clientX, y: e.clientY } : null;
  });
  el.addEventListener("pointerup", (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = Math.abs(e.clientY - start.y);
    start = null;
    if (Math.abs(dx) > 70 && dy < 60) step(dx < 0 ? 1 : -1);
  });
  el.addEventListener("pointercancel", () => { start = null; });
}
