// Popup for all shades of a room: everything at once, or each one on its own.
import { h, icon, slider, entityName, bindTapHold } from "./util.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";

const SET_POSITION = 4;
const STOP = 8;
const supports = (st, f) => ((st?.attributes.supported_features || 0) & f) !== 0;
const posOf = (st) => st?.attributes.current_position ?? (st?.state === "closed" ? 0 : 100);
const live = (st) => st && st.state !== "unavailable" && st.state !== "unknown";

function stateLabel(st) {
  if (!live(st)) return t("unavailable");
  if (st.state === "opening") return t("opening");
  if (st.state === "closing") return t("closing");
  const p = posOf(st);
  return p <= 0 ? t("shades_closed") : p >= 100 ? t("shades_open") : `${p} %`;
}

/** Quick positions; closed first like a window going down to up. */
export function positionChips(onPick) {
  const row = h("div", { class: "hp-modes hp-pos-chips" });
  for (const [v, label] of [[0, t("shades_closed")], [25, "25 %"], [50, "50 %"], [75, "75 %"], [100, t("shades_open")]]) {
    const b = h("button", { class: "hp-chip", dataset: { v: String(v) } }, label);
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      onPick(v);
    });
    row.append(b);
  }
  row.update = (p) => row.querySelectorAll(".hp-chip").forEach((b) => b.classList.toggle("active", Number(b.dataset.v) === p));
  return row;
}

export function openShades(ctx, { title, ids }) {
  const hass = ctx.hass;
  const sheet = openSheet(ctx, { title: t("shades"), subtitle: title, cls: "shades" });
  const call = (svc, entity_id, data = {}) => ctx.hass.callService("cover", svc, { entity_id, ...data });
  const positional = () => ids.filter((id) => supports(ctx.hass.states[id], SET_POSITION));

  // All shades together
  const avgOf = (hs) => {
    const sts = ids.map((id) => hs.states[id]).filter(live);
    return sts.length ? Math.round(sts.reduce((a, st) => a + posOf(st), 0) / sts.length) : 0;
  };
  const bigState = h("div", { class: "hp-shades-big" });
  const allChips = positionChips((v) => {
    const pos = positional();
    if (v === 0) call("close_cover", ids);
    else if (v === 100) call("open_cover", ids);
    else if (pos.length) call("set_cover_position", pos, { position: v });
  });
  // The same shade bar as for one shade, here for all of them together.
  const allSlider = ids.length > 1 && positional().length
    ? slider({ value: avgOf(hass), cls: "shade", label: t("position"), onChange: (v) => {
      const pos = positional();
      if (v <= 0) call("close_cover", ids);
      else if (v >= 100) call("open_cover", ids);
      else if (pos.length) call("set_cover_position", pos, { position: v });
    } })
    : null;
  const anyStop = ids.some((id) => supports(hass.states[id], STOP));
  const allBtns = h("div", { class: "hp-shades-btns" },
    h("button", { class: "hp-btn", onclick: () => call("open_cover", ids) }, icon("mdi:arrow-up"), t("open_shades")),
    anyStop ? h("button", { class: "hp-btn", onclick: () => call("stop_cover", ids) }, icon("mdi:stop"), t("stop")) : null,
    h("button", { class: "hp-btn", onclick: () => call("close_cover", ids) }, icon("mdi:arrow-down"), t("close_shades")));
  sheet.body.append(h("div", { class: "hp-shades-all" },
    h("div", { class: "hp-shades-head" }, h("div", { class: "hp-tile-icon big" }, icon("mdi:blinds-horizontal")),
      h("div", {}, h("div", { class: "hp-label" }, ids.length > 1 ? t("all_shades_n", { n: ids.length }) : t("shades")), bigState)),
    allSlider, allBtns, positional().length ? allChips : null));

  // Each shade
  const list = h("div", { class: "hp-shades-list" });
  const rows = ids.map((id) => {
    const st = hass.states[id];
    const stateEl = h("small", {});
    const sl = supports(st, SET_POSITION)
      ? slider({ value: posOf(st), cls: "shade", label: t("position"), onChange: (v) => call("set_cover_position", id, { position: v }) })
      : null;
    const btn = (ic, svc, label) => {
      const b = h("button", { class: "hp-round ghost", "aria-label": label, title: label }, icon(ic));
      b.addEventListener("click", (e) => { e.stopPropagation(); call(svc, id); });
      return b;
    };
    const r = h("div", { class: "hp-shade-row" },
      h("div", { class: "hp-shade-name" }, h("b", {}, entityName(ctx.hass, id, title)), stateEl),
      sl || h("div", { class: "hp-shade-spacer" }),
      h("div", { class: "hp-shade-btns" }, btn("mdi:arrow-up", "open_cover", t("open")),
        supports(st, STOP) ? btn("mdi:stop", "stop_cover", t("stop")) : null, btn("mdi:arrow-down", "close_cover", t("close"))));
    return { id, r, sl, stateEl };
  });
  for (const x of rows) list.append(x.r);
  if (ids.length > 1) {
    // Mostly all of them move together; one by one is a tap away.
    list.hidden = true;
    const more = h("button", { class: "hp-chip hp-shades-more" }, icon("mdi:chevron-down"), t("each_shade_show", { n: ids.length }));
    more.addEventListener("click", () => {
      list.hidden = !list.hidden;
      more.firstChild.icon = list.hidden ? "mdi:chevron-down" : "mdi:chevron-up";
      more.lastChild.textContent = list.hidden ? t("each_shade_show", { n: ids.length }) : t("each_shade_hide");
    });
    sheet.body.append(h("div", { class: "hp-shades-more-row" }, more), list);
  } else sheet.body.append(list);

  const update = (hs) => {
    const avg = avgOf(hs);
    const moving = ids.some((id) => ["opening", "closing"].includes(hs.states[id]?.state));
    bigState.textContent = moving ? t("shades_moving") : avg <= 0 ? t("shades_closed") : avg >= 100 ? t("shades_open") : t("open_pct", { n: avg });
    allChips.update(moving ? -1 : avg);
    if (!moving) allSlider?.update(avg);
    for (const x of rows) {
      const st = hs.states[x.id];
      x.stateEl.textContent = stateLabel(st);
      x.r.classList.toggle("unavail", !live(st));
      x.sl?.update(posOf(st));
    }
  };
  sheet.updaters.push(update);
  update(hass);
}

/** Key of the one tile that stands for all shades of a room. */
export const shadeGroupKey = (areaId) => `shades:${areaId}`;

/**
 * One tile for all shades of a room: average position, a bar, and a tap opens the popup
 * where they move together or one by one.
 */
export function createShadeGroupTile(ctx, { ids, areaName, container, variant = "tile", key }) {
  const row = variant === "row";
  const el = h("div", {
    class: `hp-tile hp-${variant} hp-shadegroup`,
    dataset: { key, domain: "cover" },
    tabindex: "0",
    role: "button",
  });
  const ic = icon("mdi:blinds-horizontal");
  const iconBox = h("div", { class: "hp-tile-icon" }, ic);
  const count = h("span", { class: "hp-shadegroup-n" }, String(ids.length));
  const nameEl = h("div", { class: "hp-tile-name" }, t("shades"));
  const stateEl = h("div", { class: "hp-tile-state" });
  const text = h("div", { class: "hp-tile-text" }, nameEl, stateEl);
  const fill = h("i", {});
  if (row) el.append(iconBox, text, h("div", { class: "hp-row-end" }, count));
  else el.append(h("div", { class: "hp-tile-top" }, iconBox, count), text, h("div", { class: "hp-cover-bar" }, fill));

  // Edit mode: the minus hides every shade of the group.
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide"), title: t("hide") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => {
    e.stopPropagation();
    for (const id of ids) ctx.hideItem(container, id);
  });
  el.append(minus);

  const open = () => ctx.openShades({ title: areaName, ids });
  bindTapHold(el, { canStart: () => !ctx.editing, tap: open, hold: open });
  el.addEventListener("keydown", (e) => {
    if (ctx.editing || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    open();
  });

  let sig = "";
  el.update = (hass) => {
    const all = ids.map((id) => hass.states[id]);
    const s = all.map((st) => (st ? `${st.state}:${st.attributes.current_position}` : "")).join("|");
    if (s === sig) return;
    sig = s;
    const sts = all.filter(live);
    const moving = sts.some((st) => st.state === "opening" || st.state === "closing");
    const pos = sts.map(posOf);
    const avg = pos.length ? Math.round(pos.reduce((a, b) => a + b, 0) / pos.length) : 0;
    const mixed = pos.length > 1 && Math.max(...pos) - Math.min(...pos) > 5;
    el.classList.toggle("unavail", !sts.length);
    el.classList.toggle("moving", moving);
    el.classList.toggle("closed", !!sts.length && avg <= 0);
    el.classList.toggle("on", avg > 0);
    ic.icon = moving ? "mdi:unfold-more-horizontal" : avg > 0 ? "mdi:blinds-horizontal" : "mdi:blinds-horizontal-closed";
    stateEl.textContent = !sts.length ? t("unavailable")
      : moving ? t("shades_moving")
        : avg <= 0 ? t("shades_closed")
          : avg >= 100 && !mixed ? t("shades_open")
            : mixed ? t("shades_mixed", { n: avg }) : t("pct_open", { n: avg });
    fill.style.width = `${Math.max(0, Math.min(100, avg))}%`;
  };
  el.update(ctx.hass);
  return el;
}
