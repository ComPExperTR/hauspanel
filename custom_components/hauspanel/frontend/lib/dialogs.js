// Sheets and dialogs: details, confirm, text input, add device, hidden items.
import { h, icon, domainOf, entityName } from "./util.js";
import { entityIcon, stateText, buildControls, hasControls, openMoreInfo } from "./domains.js";
import { usageBlock, meterSensors, deviceName, watts, applianceFor, applianceText } from "./usage.js";
import { t } from "./i18n.js";
import { openAppliance } from "./appliance.js";

/** Open a sheet inside the panel. Returns { el, body, close, update }. */
/** Eat the rest of a tap (up, click) for a moment, everywhere. */
function swallowTap() {
  const stop = (e) => { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); };
  const types = ["pointerup", "mouseup", "touchend", "click"];
  for (const t of types) window.addEventListener(t, stop, { capture: true, passive: false });
  setTimeout(() => { for (const t of types) window.removeEventListener(t, stop, { capture: true }); }, 450);
}

/**
 * Pull a popup down to close it (like iOS sheets). Only when what is under the finger is scrolled to the top,
 * and never on sliders or dials. The pull is kept inside the popup, so the page behind does not reload.
 */
function swipeToClose(sheet, backdrop, close) {
  let y0 = null;
  let x0 = 0;
  let dy = 0;
  let dragging = false;
  const NO_DRAG = ".hp-slider, input, select, textarea, .hp-th-svg, .hp-ov-bri, [data-no-swipe]";
  const scrolled = (el) => {
    for (let n = el; n && n !== sheet; n = n.parentElement) if (n.scrollTop > 0) return true;
    return false;
  };
  sheet.addEventListener("touchstart", (e) => {
    if (e.touches.length !== 1 || e.target.closest(NO_DRAG) || scrolled(e.target)) { y0 = null; return; }
    y0 = e.touches[0].clientY;
    x0 = e.touches[0].clientX;
    dy = 0;
    dragging = false;
  }, { passive: true });
  sheet.addEventListener("touchmove", (e) => {
    if (y0 == null) return;
    dy = e.touches[0].clientY - y0;
    const dx = Math.abs(e.touches[0].clientX - x0);
    if (!dragging && (dy < -4 || dx > Math.abs(dy))) { y0 = null; return; }
    if (dy > 6) {
      dragging = true;
      e.preventDefault();
      sheet.style.transition = "none";
      sheet.style.transform = `translateY(${dy}px)`;
      backdrop.style.opacity = String(Math.max(0.3, 1 - dy / 500));
    }
  }, { passive: false });
  const end = () => {
    if (y0 == null) return;
    y0 = null;
    sheet.style.transition = "";
    backdrop.style.opacity = "";
    if (dragging && dy > 110) {
      sheet.style.transform = "translateY(110%)";
      close();
    } else sheet.style.transform = "";
  };
  sheet.addEventListener("touchend", end);
  sheet.addEventListener("touchcancel", end);
  // A pull on the dim area behind the popup must not reach the page either.
  backdrop.addEventListener("touchmove", (e) => { if (e.target === backdrop) e.preventDefault(); }, { passive: false });
}

export function openSheet(ctx, { title, subtitle, cls = "", content, onClose, actions }) {
  const body = h("div", { class: "hp-sheet-body" });
  const closeBtn = h("button", { class: "hp-round ghost", "aria-label": t("close") }, icon("mdi:close"));
  const head = h("div", { class: "hp-sheet-head" },
    h("div", { class: "hp-sheet-titles" }, h("div", { class: "hp-sheet-title" }, title || ""), subtitle ? h("div", { class: "hp-sheet-sub" }, subtitle) : null),
    actions || null,
    closeBtn);
  const sheet = h("div", { class: `hp-sheet ${cls}`, role: "dialog", "aria-modal": "true" }, head, body);
  const backdrop = h("div", { class: "hp-backdrop" }, sheet);
  const api = {
    el: sheet,
    body,
    head,
    updaters: [],
    update(hass) {
      api.updaters.forEach((u) => u(hass));
    },
    close() {
      backdrop.classList.remove("open");
      ctx.sheets.delete(api);
      setTimeout(() => backdrop.remove(), 220);
      onClose?.();
    },
  };
  closeBtn.addEventListener("click", () => api.close());
  backdrop.addEventListener("pointerdown", (e) => {
    if (e.target !== backdrop) return;
    e.preventDefault();
    e.stopPropagation();
    // The tap that closes the popup must not land on what is behind it (iOS sends its click after the popup is gone).
    swallowTap();
    api.close();
  });
  sheet.addEventListener("keydown", (e) => {
    if (e.key === "Escape") api.close();
  });
  if (content) body.append(content);
  swipeToClose(sheet, backdrop, () => api.close());
  ctx.layer.append(backdrop);
  ctx.sheets.add(api);
  requestAnimationFrame(() => backdrop.classList.add("open"));
  return api;
}

export function confirmDialog(ctx, { title, text, ok, danger, onOk }) {
  const sheet = openSheet(ctx, { title, cls: "small" });
  sheet.body.append(
    h("p", { class: "hp-confirm-text" }, text),
    h("div", { class: "hp-sheet-actions" },
      h("button", { class: "hp-btn ghost", onclick: () => sheet.close() }, t("cancel")),
      h("button", { class: `hp-btn ${danger ? "danger" : "primary"}`, onclick: () => { sheet.close(); onOk(); } }, ok)));
  setTimeout(() => sheet.body.querySelector(".hp-btn.ghost")?.focus(), 50);
}

export function promptDialog(ctx, title, value = "") {
  return new Promise((resolve) => {
    let done = false;
    const input = h("input", { class: "hp-input", value, type: "text" });
    const finish = (v) => {
      if (done) return;
      done = true;
      sheet.close();
      resolve(v);
    };
    const sheet = openSheet(ctx, { title, cls: "small", onClose: () => { if (!done) { done = true; resolve(null); } } });
    input.addEventListener("keydown", (e) => e.key === "Enter" && finish(input.value.trim()));
    sheet.body.append(input,
      h("div", { class: "hp-sheet-actions" },
        h("button", { class: "hp-btn ghost", onclick: () => finish(null) }, t("cancel")),
        h("button", { class: "hp-btn primary", onclick: () => finish(input.value.trim()) }, t("save"))));
    setTimeout(() => input.focus(), 60);
  });
}

/** Hold on a tile: big controls, state, and a way into Home Assistant's own dialog. */
export function detailsDialog(ctx, entityId, { plain = false } = {}) {
  const hass = ctx.hass;
  const st = hass.states[entityId];
  if (!st) return;
  const d = domainOf(entityId);
  if (d === "media_player") return ctx.openPlayer(entityId);
  // Sockets set to "meter only" show their usage instead of a power button.
  const meter = !!ctx.settings.s.meters?.[entityId];
  // A socket that powers a washer, dryer or dishwasher opens the appliance.
  if (meter && !plain) {
    const app = applianceFor(hass, entityId, meterSensors(hass, entityId).power);
    if (app) return openAppliance(ctx, app.dev, { plug: entityId });
  }
  if (!meter && !hasControls(st) && !["light", "switch", "input_boolean", "lock"].includes(d)) {
    openMoreInfo(ctx.root, entityId);
    return;
  }
  const areaId = ctx.model.areaOf[entityId];
  const areaName = ctx.model.areaById.get(areaId)?.name;
  // Meter only: the head says on, off or running; the watts are in the usage block below.
  const meterState = (hs, s) => {
    if (s.state === "unavailable") return t("unavailable");
    const ms = meterSensors(hs, entityId);
    const run = applianceText(hs, applianceFor(hs, entityId, ms.power));
    if (run) return run;
    return (d === "switch" ? s.state === "on" : (watts(hs, ms.power) ?? 0) > 2) ? t("on") : t("off");
  };
  const ic = icon(meter && d === "sensor" ? "mdi:power-socket-de" : entityIcon(hass, st));
  const stateEl = h("div", { class: "hp-details-state" }, meter ? meterState(hass, st) : stateText(hass, st));
  const controls = meter ? Object.assign(h("div", {}), { update: () => {} }) : buildControls(ctx, entityId, "sheet");
  const sensors = meter || d === "switch" ? meterSensors(hass, entityId) : {};
  const usage = sensors.power || sensors.energy ? usageBlock(ctx, entityId) : null;
  const more = h("button", { class: "hp-btn ghost" }, icon("mdi:dots-horizontal"), t("more_in_ha"));
  const sheet = openSheet(ctx, {
    title: meter && d === "sensor" ? deviceName(hass, entityId) : entityName(hass, entityId, areaName),
    subtitle: areaName,
    cls: `details details-${d}`,
  });
  more.addEventListener("click", () => {
    sheet.close();
    openMoreInfo(ctx.root, entityId);
  });
  sheet.body.append(h("div", { class: "hp-details-head" }, h("div", { class: "hp-tile-icon big" }, ic), stateEl), controls, ...(usage ? [usage] : []), h("div", { class: "hp-sheet-actions" }, more));
  if (usage) sheet.updaters.push((hs) => usage.update(hs));
  let last = st;
  sheet.updaters.push((hs) => {
    const s = hs.states[entityId];
    if (!s || s === last) return;
    last = s;
    if (!(meter && d === "sensor")) ic.icon = entityIcon(hs, s);
    stateEl.textContent = meter ? meterState(hs, s) : stateText(hs, s);
    controls.update(s);
  });
}

/** Add any device from any room to the current room or page. */
export function addDialog(ctx, { container, autoItems, onPick, domains }) {
  const hass = ctx.hass;
  const search = h("input", { class: "hp-input", type: "search", placeholder: t("search") });
  const list = h("div", { class: "hp-add-list" });
  const SPECIAL = /^(app|prn|car|pol|bel|hpu|net|bby|wbx):/;
  const current = new Set(ctx.settings.arrange(container, autoItems, (k) => !!hass.states[k] || k.startsWith("sep:") || SPECIAL.test(k)).items);
  // Popup tiles (washer, car, baby monitor …) can go anywhere too: in their room's folder, and all together on top.
  const specials = !domains && ctx.specialTiles ? ctx.specialTiles() : [];
  // Index once: big homes have thousands of entities, so rows are only built for what is shown.
  const groups = [...ctx.model.areas, ctx.model.unassigned].map((g) => ({
    g,
    items: [
      ...specials.filter((x) => x.area === g.id).map((x) => ({ id: x.key, special: x, key: `${x.name} ${x.sub || ""}`.toLowerCase() })),
      ...g.all.filter((id) => !domains || domains.includes(domainOf(id)))
        .map((id) => ({ id, key: `${(hass.states[id]?.attributes.friendly_name || "").toLowerCase()} ${id}` })),
    ],
  })).filter((x) => x.items.length);
  if (specials.length) groups.unshift({ g: { id: "_popups", name: t("popup_tiles"), icon: "mdi:star-four-points-outline" }, items: specials.map((x) => ({ id: x.key, special: x, key: `${x.name} ${x.sub || ""}`.toLowerCase() })) });
  const open = new Set();
  const LIMIT = 120;

  const rowFor = (id, special) => {
    const st = hass.states[id];
    const there = current.has(id);
    const room = special && ctx.model.areaById.get(special.area)?.name;
    const row = h("button", { class: `hp-add-row ${there ? "there" : ""} ${special ? "special" : ""}`, disabled: there },
      h("div", { class: "hp-tile-icon" }, icon(special ? special.icon : entityIcon(hass, st))),
      h("div", { class: "hp-add-text" }, h("div", {}, special ? special.name : entityName(hass, id)),
        h("small", {}, there ? t("already_here") : special ? [room, special.sub].filter(Boolean).join(" · ") : stateText(hass, st) || id)),
      icon(there ? "mdi:check" : "mdi:plus"));
    row.addEventListener("click", () => {
      onPick(id);
      current.add(id);
      row.classList.add("there");
      row.disabled = true;
      row.querySelector("small").textContent = t("already_here");
    });
    return row;
  };

  const render = () => {
    list.replaceChildren();
    const q = search.value.trim().toLowerCase();
    if (q) {
      // Search: matching rows across all rooms, capped.
      let shown = 0;
      let total = 0;
      for (const { g, items } of groups) {
        if (g.id === "_popups") continue; // they show up in their room
        const hits = items.filter((x) => x.key.includes(q));
        total += hits.length;
        if (!hits.length || shown >= LIMIT) continue;
        list.append(h("div", { class: "hp-add-group" }, g.name || t("no_room")));
        for (const x of hits.slice(0, LIMIT - shown)) list.append(rowFor(x.id, x.special));
        shown += Math.min(hits.length, LIMIT - shown);
      }
      if (!total) list.append(h("div", { class: "hp-empty" }, t("nothing_found")));
      else if (total > shown) list.append(h("div", { class: "hp-muted small center" }, t("more_results", { n: total - shown })));
      return;
    }
    // No search: rooms as folders, opened on tap.
    for (const { g, items } of groups) {
      const isOpen = open.has(g.id);
      const head = h("button", { class: `hp-add-folder ${isOpen ? "open" : ""}` },
        icon(g.icon || "mdi:texture-box"), h("span", {}, g.name || t("no_room")), h("small", {}, String(items.length)), icon(isOpen ? "mdi:chevron-up" : "mdi:chevron-down"));
      head.addEventListener("click", () => {
        if (isOpen) open.delete(g.id);
        else open.add(g.id);
        render();
      });
      list.append(head);
      if (isOpen) {
        for (const x of items.slice(0, LIMIT * 2)) list.append(rowFor(x.id, x.special));
        if (items.length > LIMIT * 2) list.append(h("div", { class: "hp-muted small center" }, t("more_results", { n: items.length - LIMIT * 2 })));
      }
    }
  };
  let timer;
  search.addEventListener("input", () => {
    clearTimeout(timer);
    timer = setTimeout(render, 120);
  });
  render();
  const sheet = openSheet(ctx, { title: t("add_devices"), cls: "tall" });
  sheet.body.append(search, list);
  setTimeout(() => search.focus(), 80);
}

/** What was hidden in a container, ready to come back with a tap. */
export function hiddenDialog(ctx, container, hidden, label) {
  const hass = ctx.hass;
  const sheet = openSheet(ctx, { title: t("hidden_items"), subtitle: label, cls: "small" });
  const list = h("div", { class: "hp-add-list" });
  const draw = (keys) => {
    list.replaceChildren();
    for (const id of keys) {
      const st = hass.states[id];
      const name = container === "rooms" ? ctx.model.areaById.get(id)?.name || id
        : container === "dock" ? ctx.tabLabel(id)
        : id === "group:smoke" ? t("smoke_alarms")
        : entityName(hass, id);
      const ic = container === "rooms" ? ctx.model.areaById.get(id)?.icon || "mdi:texture-box"
        : container === "dock" ? ctx.tabIcon(id)
        : id === "group:smoke" ? "mdi:smoke-detector-variant" : entityIcon(hass, st);
      const row = h("button", { class: "hp-add-row" }, h("div", { class: "hp-tile-icon" }, icon(ic)), h("div", { class: "hp-add-text" }, name), icon("mdi:eye"));
      row.addEventListener("click", () => {
        ctx.settings.unhide(container, id);
        keys = keys.filter((k) => k !== id);
        if (!keys.length) sheet.close();
        else draw(keys);
      });
      list.append(row);
    }
  };
  draw(hidden);
  sheet.body.append(h("p", { class: "hp-muted" }, t("hidden_hint")), list);
}

export function toast(ctx, text) {
  const el = h("div", { class: "hp-toast" }, text);
  ctx.layer.append(el);
  requestAnimationFrame(() => el.classList.add("show"));
  setTimeout(() => {
    el.classList.remove("show");
    setTimeout(() => el.remove(), 300);
  }, 2600);
}
