// The overview popups behind the Home chips: security, light and climate with a ring at the top like the car and
// heat pump, then calm rows; shades as windows under the sun. Each has a "List" button to the classic view,
// and Settings → Look can switch back to the classic popups altogether.
import { h, icon, domainOf, slider, toggleSwitch, entityName, formatTime } from "./util.js";
import { isOn, hideMatcher } from "./model.js";
import { openSheet } from "./dialogs.js";
import { snapshotUrl } from "./camera.js";
import { statusItems, isAlert, isAllowedOpen, allowRule, pillName, cameraList, HOME_SEC_CONTAINER, secIcon } from "./securityview.js";
import { openThermostat } from "./thermostat.js";
import { heatPumps, openHeatPump } from "./heatpump.js";
import { loadVisits } from "./visitors.js";
import { openLeave } from "./leave.js";
import { t } from "./i18n.js";
import { svgEl, btn, twoTap, fmt, ring, stat, ago, since, hint } from "./popkit.js";
import { openVisitors, recentMotions, frigateCams } from "./visitors.js";

export const classicPopups = (ctx) => !!ctx.settings.s.classicPopups;

/** The small "List" button in the head that opens the classic popup. */
function listButton(onClick) {
  const b = h("button", { class: "hp-btn ghost hp-ov-list", title: t("ov_list") }, icon("mdi:format-list-bulleted"), h("span", {}, t("ov_list")));
  b.addEventListener("click", onClick);
  return b;
}

const OUTDOOR = /garten|garden|einfahrt|drive|terrasse|terrace|hof|yard|outdoor|außen|aussen|pool/i;
const isOutside = (a) => !a || /outdoor|outside|garten|garden/i.test(a.floor?.floor_id || "") || OUTDOOR.test(`${a.id} ${a.name}`);
const shortName = (hass, id, ctx) => {
  const area = ctx.model.areaById.get(ctx.model.areaOf[id])?.name || "";
  let n = pillName(hass, id).replace(/\s*(open|offen|status|kontakt|contact|sensor)$/i, "");
  if (area && n.toLowerCase().startsWith(area.toLowerCase() + " ") && n.length > area.length + 3) n = n.slice(area.length + 1);
  return n.length > 16 ? n.slice(0, 15) + "…" : n;
};

// ---------------------------------------------------------------- shared

/** The hero at the top: a ring with something in its middle, and a status block beside it (like the car and heat pump). */
function hero(tone = "") {
  const rg = ring("hp-app-ring hp-ov-ring");
  const mid = h("div", { class: "hp-app-center hp-ov-mid" });
  const dial = h("div", { class: "hp-pr-dial" }, rg.svg, mid);
  const status = h("span", { class: "hp-app-status" });
  const title = h("div", { class: "hp-ov-h1" });
  const sub = h("div", { class: "hp-app-eta hp-ov-h2" });
  const extra = h("div", { class: "hp-ov-hx" });
  const el = h("div", { class: `hp-pr-hero hp-ov-hero ${tone}` }, dial, h("div", { class: "hp-app-info" }, status, title, sub, extra));
  return { el, rg, mid, status, title, sub, extra };
}

/** One calm row: icon, name and a line under it, something on the right. */
function row({ ic, onClick }) {
  const icEl = icon(ic);
  const name = h("b");
  const sub = h("small");
  const right = h("div", { class: "hp-ov-right" });
  const el = h("div", { class: "hp-ov-row", role: "button", tabindex: "0" }, h("span", { class: "hp-ov-ic" }, icEl), h("div", { class: "hp-ov-txt" }, name, sub), right);
  if (onClick) el.addEventListener("click", (e) => { if (!e.target.closest(".hp-toggle, .hp-slider")) onClick(); });
  Object.assign(el, { icEl, name, sub, right });
  return el;
}

// ---------------------------------------------------------------- security

const ALARM_LOOK = {
  disarmed: ["mdi:shield-off-outline", "off"], armed_home: ["mdi:shield-home", "on"], armed_away: ["mdi:shield-lock", "on"],
  armed_night: ["mdi:shield-moon", "on"], armed_vacation: ["mdi:shield-airplane", "on"], armed_custom_bypass: ["mdi:shield-star", "on"],
  arming: ["mdi:shield-sync", "wait"], pending: ["mdi:shield-alert-outline", "wait"], triggered: ["mdi:bell-ring", "alarm"],
};
const MODES = [["disarm", "disarmed", "mdi:shield-off-outline", "ov_mode_off", 0], ["arm_home", "armed_home", "mdi:shield-home", "ov_mode_home", 1],
  ["arm_away", "armed_away", "mdi:shield-lock", "ov_mode_away", 2], ["arm_night", "armed_night", "mdi:shield-moon", "ov_mode_night", 4]];

/** A number pad for the alarm code; the code goes to Home Assistant only. */
export function codePad(ctx, { title, onCode }) {
  const sheet = openSheet(ctx, { title, subtitle: t("ov_enter_code"), cls: "small ov-pad" });
  let code = "";
  const dots = h("div", { class: "hp-ov-dots" });
  const paint = () => dots.replaceChildren(...Array.from({ length: Math.max(4, code.length) }, (_, i) => h("i", { class: i < code.length ? "on" : "" })));
  const keys = h("div", { class: "hp-ov-keys" });
  const press = (k) => {
    if (k === "del") code = code.slice(0, -1);
    else if (k === "ok") {
      if (!code) return;
      const c = code;
      code = "";
      paint();
      onCode(c, sheet);
      return;
    } else if (code.length < 10) code += k;
    paint();
  };
  for (const k of ["1", "2", "3", "4", "5", "6", "7", "8", "9", "del", "0", "ok"]) {
    const b = h("button", { class: `hp-ov-key ${k === "ok" ? "ok" : k === "del" ? "del" : ""}` }, k === "del" ? icon("mdi:backspace-outline") : k === "ok" ? icon("mdi:check") : k);
    b.addEventListener("click", () => press(k));
    keys.append(b);
  }
  paint();
  sheet.body.append(dots, keys);
  return sheet;
}

/** Every door, gate and lock the security popup can watch (also the hidden ones), in the saved order. */
export function secWatchAll(ctx) {
  const s = statusItems(ctx);
  const hiddenRule = hideMatcher(ctx.hass, ctx.settings.s.hide);
  const order = ctx.settings.cont(HOME_SEC_CONTAINER).order || [];
  const pos = (id) => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
  return [...new Set([...s.doors, ...s.gates, ...s.locks])].filter((id) => !hiddenRule(id))
    .map((id, i) => [id, i]).sort((a, b) => pos(a[0]) - pos(b[0]) || a[1] - b[1]).map(([id]) => id);
}

export function openSecurityOverview(ctx, openClassic) {
  const hass = ctx.hass;
  const s = statusItems(ctx);
  const alarmId = s.alarm[0] || Object.keys(hass.states).find((id) => id.startsWith("alarm_control_panel."));
  // Everything that can be open: doors, gates, windows and locks from the security list, plus the alarm's door sensors.
  // What was hidden in HausPanel (by rule, or with − in the security popup) stays out, wherever it comes from.
  const hiddenRule = hideMatcher(hass, ctx.settings.s.hide);
  const hiddenSec = new Set(Object.entries(ctx.settings.s.containers || {})
    .filter(([k]) => k === "home:security" || k.startsWith("security:")).flatMap(([, c]) => c.hidden || []));
  const shown = (id) => !hiddenRule(id) && !hiddenSec.has(id);
  const byOrder = (ids) => {
    const order = ctx.settings.cont(HOME_SEC_CONTAINER).order || [];
    const pos = (id) => { const i = order.indexOf(id); return i < 0 ? 1e6 : i; };
    return ids.map((id, i) => [id, i]).sort((a, b) => pos(a[0]) - pos(b[0]) || a[1] - b[1]).map(([id]) => id);
  };
  const watchAll = () => byOrder([...new Set([...s.doors, ...s.gates, ...s.locks])].filter((id) => !hiddenRule(id)));
  let watch = byOrder([...new Set([...s.doors, ...s.gates, ...s.locks])].filter(shown));
  const blocking = new Set();
  // The head button arranges the popup (the classic list is still in Settings → Look).
  const editB = h("button", { class: "hp-round ghost", "aria-label": t("rp_customise"), title: t("rp_customise") }, icon("mdi:pencil-outline"));
  const sheet = openSheet(ctx, { title: t("security"), subtitle: "", cls: "appliance ov-sec", actions: editB });
  editB.addEventListener("click", () => openSecurityEdit(ctx, watchAll, () => { sheet.close(); setTimeout(() => openSecurityOverview(ctx, openClassic), 250); }));

  // ---- the alarm panel
  const aIc = icon("mdi:shield-off-outline");
  const aState = h("b");
  const aSub = h("small");
  const aCard = h("div", { class: "hp-ov-alarm-card" }, h("div", { class: "hp-ov-alarm-ic" }, aIc), h("div", { class: "txt" }, aState, aSub));
  const modeBox = h("div", { class: "hp-ov-modes" });
  const blockers = h("div", { class: "hp-app-hints" });
  const supported = alarmId ? hass.states[alarmId].attributes.supported_features || 0 : 0;
  const modes = MODES.filter(([, , , , bit]) => bit === 0 || supported & bit);
  const modeBtns = modes.map(([svc, state, ic, label]) => {
    const b = h("button", { class: "hp-ov-mode" }, icon(ic), h("span", {}, t(label)));
    b.dataset.state = state;
    b.addEventListener("click", () => {
      const st = ctx.hass.states[alarmId];
      if (!st || st.state === state) return;
      const a = st.attributes;
      const needs = svc === "disarm" ? a.code_format != null : a.code_arm_required && a.code_format != null;
      const run = (code, pad) => ctx.hass.callService("alarm_control_panel", `alarm_${svc}`, { entity_id: alarmId, ...(code ? { code } : {}) })
        .then(() => pad?.close())
        .catch(() => { ctx.toast?.(t("ov_code_wrong")); pad?.el.classList.add("shake"); setTimeout(() => pad?.el.classList.remove("shake"), 500); });
      if (needs) codePad(ctx, { title: t(label), onCode: run });
      else run();
    });
    return b;
  });
  modeBox.append(...modeBtns);

  // ---- open and closed
  const openBox = h("div", { class: "hp-ov-list-rows" });
  const closedHead = h("div", { class: "hp-label hp-ov-label" });
  const closedBox = h("div", { class: "hp-ov-closed" });
  const smokeRow = s.smoke.length ? row({ ic: "mdi:smoke-detector-variant", onClick: () => openSmoke(ctx, s.smoke) }) : null;
  smokeRow?.classList.add("smoke");
  // The big line on top, as in the classic popup: "All closed" in green, or what is open in red.
  const banIc = icon("mdi:shield-check-outline");
  const banBig = h("b");
  const banSub = h("small");
  const banner = h("div", { class: "hp-sec-hero hp-ov-banner" }, h("div", { class: "hp-sec-hero-ic" }, banIc), h("div", { class: "hp-sec-hero-text" }, banBig, banSub));

  const locks = s.locks.filter((id) => domainOf(id) === "lock");
  const lockB = locks.length ? twoTap(btn("mdi:lock-outline", t("ov_lock_all"), "primary"), () => ctx.hass.callService("lock", "lock", { entity_id: locks.filter((id) => ctx.hass.states[id]?.state !== "locked") })) : null;
  const leaveB = btn("mdi:home-export-outline", t("leave_chip"));
  leaveB.addEventListener("click", () => { sheet.close(); openLeave(ctx); });
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot" }, ...(lockB ? [lockB] : []), leaveB);

  const cams = cameraList(ctx).items;
  const lay = secLayout(ctx);
  const recent = frigateCams(ctx.hass).length && lay.on.has("recent") ? recentMotions(ctx, cams) : null;
  const parts = {
    alarm: alarmId ? [aCard, modeBox, blockers] : [],
    doors: [openBox, closedHead, closedBox],
    smoke: smokeRow ? [smokeRow] : [],
    recent: recent ? [recent] : [],
    leave: [foot],
  };
  // "All closed" always on top; the rest in the saved order, without what was switched off.
  sheet.body.append(banner, ...lay.order.filter((k) => lay.on.has(k)).flatMap((k) => parts[k] || []));
  if (!lay.on.has("leave") && lockB) sheet.body.append(h("div", { class: "hp-sheet-actions hp-app-foot" }, lockB));
  const nameOf = (hs, id) => pillName(hs, id);

  const update = (hs) => {
    // Alarm
    if (alarmId) {
      const st = hs.states[alarmId];
      const [ic, tone] = ALARM_LOOK[st?.state] || ["mdi:shield-outline", "off"];
      aIc.icon = ic;
      aCard.dataset.tone = tone;
      aState.textContent = st ? (hs.formatEntityState?.(st) || st.state) : t("unavailable");
      const by = st?.attributes.changed_by;
      aSub.textContent = [by ? t("ov_by", { who: by }) : null, st ? t("ov_since", { when: since(st.last_changed) }) : null].filter(Boolean).join(" · ");
      modeBtns.forEach((b) => b.classList.toggle("active", b.dataset.state === st?.state || (st?.state === "arming" && b.dataset.state === st.attributes.next_state)));
      // Sensors the alarm reports as open join the list (and are marked as blocking).
      blocking.clear();
      for (const id of Object.keys(st?.attributes.open_sensors || {}).filter(shown)) {
        blocking.add(id);
        if (!watch.includes(id)) watch = [...watch, id];
      }
      blockers.hidden = true;
    }
    // Open first, as red rows; the closed ones as a calm list.
    const open = watch.filter((id) => isAlert(hs, id));
    const closed = watch.filter((id) => !isAlert(hs, id));
    openBox.replaceChildren(...open.map((id) => {
      const d = domainOf(id);
      const r = row({ ic: secIcon(hs, id, true), onClick: () => ctx.openDetails(id) });
      r.classList.add("bad");
      r.name.textContent = nameOf(hs, id);
      r.sub.textContent = [t("ov_open_for", { when: since(hs.states[id].last_changed) }), blocking.has(id) ? t("ov_blocks_short") : null].filter(Boolean).join(" · ");
      r.right.replaceChildren(h("span", { class: "hp-ov-tag bad" }, d === "lock" ? t("ov_unlocked") : t("ov_open_short")));
      return r;
    }));
    const smokeOn = s.smoke.filter((id) => hs.states[id]?.state === "on");
    const bad = open.length + smokeOn.length;
    banner.classList.toggle("alert", bad > 0);
    banIc.icon = smokeOn.length ? "mdi:fire-alert" : bad ? "mdi:shield-alert-outline" : "mdi:shield-check-outline";
    banBig.textContent = smokeOn.length ? t("ov_smoke_alarm") : bad ? t("n_open", { n: bad }) : t("sec_all_closed");
    banSub.textContent = bad ? [...smokeOn, ...open].map((id) => nameOf(hs, id)).join(" · ") : t("sec_all_closed_sub");
    closedHead.replaceChildren(h("span", {}, open.length ? t("ov_rest_closed") : t("ov_watched_label")), h("span", { class: "avg" }, `${closed.length}/${watch.length}`));
    closedBox.replaceChildren(...closed.map((id) => {
      const d = domainOf(id);
      const ok = isAllowedOpen(hs, id);
      const el = ok
        ? h("button", { class: "hp-ov-ok allowed" }, icon(secIcon(hs, id, true)),
          h("span", {}, nameOf(hs, id)), h("small", {}, t("sec_allowed_until", { t: allowRule(id).to })))
        : h("button", { class: "hp-ov-ok" }, icon(secIcon(hs, id, false)),
          h("span", {}, nameOf(hs, id)));
      el.addEventListener("click", () => ctx.openDetails(id));
      return el;
    }));
    closedHead.hidden = !closed.length;
    if (smokeRow) {
      const alarm = s.smoke.filter((id) => hs.states[id]?.state === "on");
      smokeRow.name.textContent = t("smoke_alarms");
      smokeRow.sub.textContent = alarm.length ? alarm.map((id) => nameOf(hs, id)).join(", ") : t("ov_all_quiet_n", { n: s.smoke.length });
      smokeRow.classList.toggle("bad", alarm.length > 0);
      smokeRow.right.replaceChildren(h("span", { class: `hp-ov-tag ${alarm.length ? "bad" : "ok"}` }, alarm.length ? t("ov_alarm") : "OK"));
    }
    if (lockB) lockB.hidden = !locks.some((id) => hs.states[id]?.state === "unlocked");
  };
  update(hass);
  sheet.updaters.push(update);
  // The alarm's own door and window sensors belong in the list too.
  if (alarmId) {
    hass.callWS({ type: "alarmo/sensors" }).then((r) => {
      const extra = Object.values(r || {}).filter((x) => x.enabled !== false && ["door", "window", "tamper"].includes(x.type)).map((x) => x.entity_id).filter((id) => hass.states[id] && shown(id));
      watch = [...new Set([...watch, ...extra])];
      update(ctx.hass);
    }).catch(() => {});
  }
}

const SEC_PARTS = [["alarm", "mdi:shield-home-outline", "ov_sec_alarm"], ["doors", "mdi:door-closed", "ov_watched_label"],
  ["smoke", "mdi:smoke-detector-variant", "smoke_alarms"], ["recent", "mdi:motion-play-outline", "sec_recent"], ["leave", "mdi:home-export-outline", "leave_title"]];

/** The security popup's sections in their saved order, and which are on. */
function secLayout(ctx) {
  const c = ctx.settings.s.secPopup || {};
  const keys = SEC_PARTS.map(([k]) => k);
  const order = [...(c.order || []).filter((k) => keys.includes(k)), ...keys.filter((k) => !(c.order || []).includes(k))];
  return { order, on: new Set(keys.filter((k) => !(c.off || []).includes(k))) };
}

/** Arrange the security popup: sections up/down and on/off, the doors, gates and locks up/down and shown/hidden. */
function openSecurityEdit(ctx, watchAll, onDone) {
  let changed = false;
  const sheet = openSheet(ctx, { title: t("rp_customise"), subtitle: t("security"), cls: "qsheet ov-room-edit ov-sec-edit", onClose: () => { if (changed) onDone(); } });
  const ed = securityEditor(ctx, watchAll, () => { changed = true; });
  const done = h("button", { class: "hp-btn primary" }, icon("mdi:check"), h("span", {}, t("done")));
  done.addEventListener("click", () => sheet.close());
  sheet.body.append(h("p", { class: "hp-muted small" }, t("sec_edit_hint")),
    h("div", { class: "hp-label hp-ov-label" }, t("sec_edit_parts")), ed.parts,
    h("div", { class: "hp-label hp-ov-label" }, t("ov_watched_label")), ed.items,
    h("div", { class: "hp-sheet-actions hp-app-foot" }, done));
}

/**
 * The security popup's sections (order, on/off) and its doors, gates and locks (order, shown, when they may be open).
 * Used by the popup's pencil and by Settings → Security.
 */
export function securityEditor(ctx, watchAll = () => secWatchAll(ctx), onChange = () => {}) {
  const hass = ctx.hass;
  const C = HOME_SEC_CONTAINER;
  const partsBox = h("div", { class: "hp-qlist" });
  const itemsBox = h("div", { class: "hp-qlist" });
  const arrows = (i, n, move) => {
    const up = h("button", { class: "hp-round small", "aria-label": t("move_up"), disabled: i === 0 }, icon("mdi:chevron-up"));
    const down = h("button", { class: "hp-round small", "aria-label": t("move_down"), disabled: i === n - 1 }, icon("mdi:chevron-down"));
    up.addEventListener("click", () => move(-1));
    down.addEventListener("click", () => move(1));
    return h("div", { class: "hp-se-arrows" }, up, down);
  };
  const swap = (arr, i, d) => { const a = [...arr]; [a[i], a[i + d]] = [a[i + d], a[i]]; return a; };
  const drawParts = () => {
    const lay = secLayout(ctx);
    partsBox.replaceChildren(...lay.order.map((k, i) => {
      const [, ic, label] = SEC_PARTS.find(([x]) => x === k);
      const on = lay.on.has(k);
      const sw = toggleSwitch(on, () => {
        onChange();
        ctx.settings.update((x) => {
          const c = { ...(x.secPopup || {}) };
          const off = new Set(c.off || []);
          if (off.has(k)) off.delete(k); else off.add(k);
          c.off = [...off];
          x.secPopup = c;
        });
        setTimeout(drawParts, 50);
      });
      return h("div", { class: `hp-qrow ${on ? "" : "off"}` }, h("span", { class: "hp-qrow-ic" }, icon(ic)), h("div", { class: "hp-qrow-text" }, h("b", {}, t(label))),
        arrows(i, lay.order.length, (d) => {
          onChange();
          ctx.settings.update((x) => { x.secPopup = { ...(x.secPopup || {}), order: swap(lay.order, i, d) }; });
          setTimeout(drawParts, 50);
        }), sw);
    }));
  };
  const drawItems = () => {
    const all = watchAll();
    const hidden = new Set(ctx.settings.cont(C).hidden || []);
    const shownIds = all.filter((id) => !hidden.has(id));
    const row = (id, i, shownNow) => {
      const st = hass.states[id];
      const eye = h("button", { class: `hp-round small hp-eye ${shownNow ? "on" : ""}`, "aria-label": shownNow ? t("hide") : t("show") }, icon(shownNow ? "mdi:eye-outline" : "mdi:eye-off-outline"));
      eye.addEventListener("click", () => {
        onChange();
        if (shownNow) ctx.settings.hide(C, id); else ctx.settings.unhide(C, id);
        setTimeout(drawItems, 50);
      });
      const d = domainOf(id);
      const rule = allowRule(id);
      const clock = h("button", { class: `hp-round small hp-se-clock ${rule ? "on" : ""}`, "aria-label": t("sec_allow_title") }, icon(rule ? "mdi:clock-check-outline" : "mdi:clock-outline"));
      clock.addEventListener("click", () => openAllowSheet(ctx, id, () => { onChange(); setTimeout(drawItems, 50); }));
      const where = ctx.model.areaById.get(ctx.model.areaOf[id])?.name || "";
      return h("div", { class: `hp-qrow ${shownNow ? "" : "off"}` },
        h("span", { class: "hp-qrow-ic" }, icon(secIcon(hass, id, false))),
        h("div", { class: "hp-qrow-text" }, h("b", {}, pillName(hass, id)), h("small", {}, rule ? [where, allowText(rule)].filter(Boolean).join(" · ") : where)),
        ...(shownNow ? [clock, arrows(i, shownIds.length, (dd) => {
          onChange();
          // Keep what else the order holds (the classic row's smoke pill and others) behind the doors.
          const rest = (ctx.settings.cont(C).order || []).filter((k) => !shownIds.includes(k));
          ctx.settings.setOrder(C, [...swap(shownIds, i, dd), ...rest]);
          setTimeout(drawItems, 50);
        })] : []), eye);
    };
    const hid = all.filter((id) => hidden.has(id));
    itemsBox.replaceChildren(...shownIds.map((id, i) => row(id, i, true)),
      ...(hid.length ? [h("div", { class: "hp-label hp-ov-label" }, t("rp_hidden"), h("span", { class: "hp-count" }, String(hid.length))), ...hid.map((id) => row(id, -1, false))] : []));
  };
  drawParts();
  drawItems();
  return { parts: partsBox, items: itemsBox };
}

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const dayName = (d) => new Date(2024, 0, 7 + d).toLocaleDateString(document.documentElement.lang || undefined, { weekday: "short" });
/** "07:00–19:00 · Mo–Fr" style text for a rule. */
function allowText(r) {
  const days = r.days?.length && r.days.length < 7 ? DAY_ORDER.filter((d) => r.days.includes(d)).map(dayName).join(" ") : t("sec_allow_daily");
  return `${r.from}–${r.to} · ${days}`;
}

/** When a door, gate or lock may stay open: one window per entity, with weekdays. */
function openAllowSheet(ctx, id, onSave) {
  const cur = ctx.settings.s.secAllow?.[id];
  let on = !!cur;
  let days = new Set(cur?.days?.length ? cur.days : DAY_ORDER);
  const from = h("input", { type: "time", class: "hp-input", value: cur?.from || "07:00" });
  const to = h("input", { type: "time", class: "hp-input", value: cur?.to || "19:00" });
  const sheet = openSheet(ctx, { title: t("sec_allow_title"), subtitle: pillName(ctx.hass, id), cls: "qsheet ov-allow" });
  const body = h("div", { class: "hp-allow-body" });
  const chips = h("div", { class: "hp-allow-days" });
  const drawDays = () => chips.replaceChildren(...DAY_ORDER.map((d) => {
    const b = h("button", { class: `hp-chip ${days.has(d) ? "on" : ""}` }, dayName(d));
    b.addEventListener("click", () => { if (days.has(d)) { if (days.size > 1) days.delete(d); } else days.add(d); drawDays(); });
    return b;
  }));
  const sw = toggleSwitch(on, () => { on = !on; body.hidden = !on; sw.update(on); });
  drawDays();
  body.append(h("div", { class: "hp-allow-times" }, h("label", {}, h("small", {}, t("sec_allow_from")), from), h("label", {}, h("small", {}, t("sec_allow_to")), to)), chips);
  body.hidden = !on;
  const save = h("button", { class: "hp-btn primary" }, icon("mdi:check"), h("span", {}, t("done")));
  save.addEventListener("click", () => {
    ctx.settings.update((x) => {
      const all = { ...(x.secAllow || {}) };
      if (on && from.value && to.value) all[id] = { from: from.value, to: to.value, days: days.size === 7 ? [] : DAY_ORDER.filter((d) => days.has(d)) };
      else delete all[id];
      x.secAllow = all;
    });
    onSave();
    sheet.close();
  });
  sheet.body.append(h("p", { class: "hp-muted small" }, t("sec_allow_hint")),
    h("div", { class: "hp-qrow" }, h("span", { class: "hp-qrow-ic" }, icon("mdi:clock-outline")), h("div", { class: "hp-qrow-text" }, h("b", {}, t("sec_allow_on"))), sw),
    body, h("div", { class: "hp-sheet-actions hp-app-foot" }, save));
}

/** Smoke alarms: each with its room, state and battery. */
function openSmoke(ctx, ids) {
  const sheet = openSheet(ctx, { title: t("smoke_alarms"), subtitle: "", cls: "appliance ov-smoke" });
  const list = h("div", { class: "hp-ov-list-rows" });
  const batteryOf = (hs, id) => {
    const dev = hs.entities?.[id]?.device_id;
    const b = dev && Object.values(hs.entities).find((e) => e.device_id === dev && e.entity_id.startsWith("sensor.") && hs.states[e.entity_id]?.attributes.device_class === "battery");
    return b ? Number(hs.states[b.entity_id]?.state) : null;
  };
  const rows = ids.map((id) => {
    const r = row({ ic: "mdi:smoke-detector-variant", onClick: () => ctx.openDetails(id) });
    r.upd = (hs) => {
      const st = hs.states[id];
      const alarm = st?.state === "on";
      const off = !st || ["unavailable", "unknown"].includes(st.state);
      const bat = batteryOf(hs, id);
      const area = ctx.model.areaById.get(ctx.model.areaOf[id])?.name;
      const raw = hs.states[id]?.attributes.friendly_name || pillName(hs, id);
      const short = raw.replace(/smoke alarm|rauchmelder|alarm ?status|smoke status|\([^)]*\)/gi, "").trim();
      r.name.textContent = area || short || raw;
      r.sub.textContent = Number.isFinite(bat) ? `${t("ov_battery")} ${Math.round(bat)} %` : "";
      r.classList.toggle("bad", alarm);
      r.right.replaceChildren(h("span", { class: `hp-ov-tag ${alarm ? "bad" : off ? "" : Number.isFinite(bat) && bat < 20 ? "warn" : "ok"}` },
        alarm ? t("ov_alarm") : off ? t("unavailable") : Number.isFinite(bat) && bat < 20 ? t("low") : "OK"));
    };
    return r;
  });
  list.append(...rows);
  const banner = h("div", { class: "hp-sec-hero hp-ov-banner" });
  sheet.body.append(banner, list);
  const upd = (hs) => {
    rows.forEach((r) => r.upd(hs));
    const n = ids.filter((id) => hs.states[id]?.state === "on").length;
    banner.classList.toggle("alert", n > 0);
    banner.replaceChildren(h("div", { class: "hp-sec-hero-ic" }, icon(n ? "mdi:fire-alert" : "mdi:check")),
      h("div", { class: "hp-sec-hero-text" }, h("b", {}, n ? t("ov_smoke_alarm") : t("ov_all_quiet_n", { n: ids.length })), h("small", {}, n ? "" : t("ov_smoke_ok"))));
  };
  upd(ctx.hass);
  sheet.updaters.push(upd);
}

// ---------------------------------------------------------------- light

export function openLightOverview(ctx, lights, openClassic) {
  const sheet = openSheet(ctx, { title: t("cat_light"), subtitle: "", cls: "appliance ov-light", actions: listButton(() => { sheet.close(); openClassic(); }) });
  const all = lights();
  const pct = (st) => (isOn(st) ? (st.attributes.brightness != null ? Math.round((st.attributes.brightness / 255) * 100) : 100) : 0);
  const rooms = ctx.model.areas.map((a) => ({ a, ids: all.filter((id) => ctx.model.areaOf[id] === a.id) })).filter((r) => r.ids.length)
    .sort((x, y) => (y.ids.some((id) => isOn(ctx.hass.states[id])) - x.ids.some((id) => isOn(ctx.hass.states[id]))));
  let onlyOn = rooms.some((r) => r.ids.some((id) => isOn(ctx.hass.states[id])));

  const hr = hero("warm");
  const count = h("b");
  hr.mid.append(count, h("small", {}, t("ov_lamps_on")));
  const chips = h("div", { class: "hp-modes hp-pk-chips hp-ov-chips" });
  const cOn = h("button", { class: "hp-chip" }, t("ov_only_on"));
  const cAll = h("button", { class: "hp-chip" }, t("ov_all_rooms"));
  cOn.addEventListener("click", () => { onlyOn = true; draw(ctx.hass); });
  cAll.addEventListener("click", () => { onlyOn = false; draw(ctx.hass); });
  chips.append(cOn, cAll);
  const list = h("div", { class: "hp-ov-list-rows" });
  const rows = rooms.map((r) => {
    const el = row({ ic: "mdi:lightbulb-group-outline", onClick: () => openRoomLights(ctx, r) });
    const sw = toggleSwitch(false, () => {
      const any = r.ids.some((id) => isOn(ctx.hass.states[id]));
      ctx.hass.callService("light", any ? "turn_off" : "turn_on", { entity_id: r.ids });
    });
    const bar = slider({ value: 0, cls: "hp-ov-bri", label: t("brightness"), onChange: (v) => {
      if (v <= 0) ctx.hass.callService("light", "turn_off", { entity_id: r.ids });
      else ctx.hass.callService("light", "turn_on", { entity_id: r.ids.filter((id) => isOn(ctx.hass.states[id])).length ? r.ids.filter((id) => isOn(ctx.hass.states[id])) : r.ids, brightness_pct: v });
    } });
    el.right.append(sw);
    el.append(bar);
    el.upd = (hs) => {
      const on = r.ids.filter((id) => isOn(hs.states[id]));
      const avg = on.length ? Math.round(on.reduce((a, id) => a + pct(hs.states[id]), 0) / on.length) : 0;
      el.name.textContent = r.a.name;
      el.sub.textContent = on.length ? `${r.ids.length > 1 ? t("ov_n_of_m", { n: on.length, m: r.ids.length }) : t("on")} · ${avg} %` : r.ids.length > 1 ? t("ov_n_lamps", { n: r.ids.length }) : t("off");
      el.classList.toggle("lit", on.length > 0);
      el.icEl.icon = on.length ? "mdi:lightbulb-group" : "mdi:lightbulb-group-outline";
      sw.classList.toggle("on", on.length > 0);
      bar.update(avg);
      bar.hidden = !on.length;
      el.hidden = onlyOn && !on.length;
    };
    return el;
  });
  list.append(...rows);
  const offAll = btn("mdi:power", t("all_lights_off_btn"), "primary");
  offAll.addEventListener("click", () => ctx.hass.callService("light", "turn_off", { entity_id: all }));
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot" }, offAll);
  sheet.body.append(hr.el, chips, list, foot);

  const draw = (hs) => {
    cOn.classList.toggle("active", onlyOn);
    cAll.classList.toggle("active", !onlyOn);
    rows.forEach((r) => r.upd(hs));
    const on = all.filter((id) => isOn(hs.states[id]));
    const roomsOn = rooms.filter((r) => r.ids.some((id) => isOn(hs.states[id]))).length;
    const avg = on.length ? Math.round(on.reduce((a, id) => a + pct(hs.states[id]), 0) / on.length) : 0;
    hr.rg.set(on.length ? avg : 0);
    hr.el.classList.toggle("dark", !on.length);
    count.textContent = String(on.length);
    hr.status.textContent = on.length ? t("on") : t("all_off");
    hr.status.dataset.phase = on.length ? "run" : "";
    hr.title.textContent = on.length ? t("ov_lights_sub", { n: on.length, r: roomsOn }) : t("no_lights_on");
    hr.sub.textContent = on.length ? t("ov_avg_bri", { n: avg }) : "";
    offAll.hidden = !on.length;
    if (!on.length && onlyOn) { onlyOn = false; rows.forEach((r) => r.upd(hs)); cOn.classList.remove("active"); cAll.classList.add("active"); }
  };
  draw(ctx.hass);
  sheet.updaters.push(draw);
}

/** One room's lamps with a switch each; closing it goes back to the overview underneath. */
function openRoomLights(ctx, r) {
  const sheet = openSheet(ctx, { title: r.a.name, subtitle: t("cat_light"), cls: "qsheet ov-room-lights" });
  const list = h("div", { class: "hp-qlist" });
  const rows = r.ids.map((id) => {
    const sw = toggleSwitch(isOn(ctx.hass.states[id]), () => ctx.hass.callService("light", "toggle", { entity_id: id }));
    const sub = h("small");
    const el = h("div", { class: "hp-qrow", role: "button", tabindex: "0" }, h("span", { class: "hp-qrow-ic" }, icon("mdi:lightbulb-outline")),
      h("div", { class: "hp-qrow-text" }, h("b", {}, entityName(ctx.hass, id, r.a.name)), sub), sw);
    el.addEventListener("click", (e) => { if (!e.target.closest(".hp-toggle")) ctx.openDetails(id); });
    el.upd = (hs) => {
      const st = hs.states[id];
      const b = st?.attributes.brightness;
      sub.textContent = isOn(st) ? (b ? `${Math.round((b / 255) * 100)} %` : t("on")) : t("off");
      el.classList.toggle("on", isOn(st));
      sw.classList.toggle("on", isOn(st));
    };
    return el;
  });
  list.append(...rows);
  const back = btn("mdi:arrow-left", t("back"));
  back.addEventListener("click", () => sheet.close());
  sheet.body.append(list, h("div", { class: "hp-sheet-actions" }, back));
  const upd = (hs) => rows.forEach((x) => x.upd(hs));
  upd(ctx.hass);
  sheet.updaters.push(upd);
}

// ---------------------------------------------------------------- climate

/** Soft temperature tint: below the house's middle cool, above warm. */
const tempTone = (v, mid) => (v == null ? "" : v < mid - 1.2 ? "cool" : v < mid - 0.4 ? "mild" : v > mid + 0.8 ? "hot" : v > mid + 0.3 ? "warm" : "even");

export function openClimateOverview(ctx, climates, openClassic) {
  const hass = ctx.hass;
  const sheet = openSheet(ctx, { title: t("climate"), subtitle: "", cls: "appliance ov-clim", actions: listButton(() => { sheet.close(); openClassic(); }) });
  const climOf = (a) => climates.filter((id) => ctx.model.areaOf[id] === a.id);
  const rooms = ctx.model.areas.filter((a) => !isOutside(a) && (a.temperature || climOf(a).length));
  const readT = (hs, a) => {
    let v = Number(hs.states[a.temperature]?.state);
    const cl = climOf(a)[0];
    if (!Number.isFinite(v) && cl) v = Number(hs.states[cl]?.attributes.current_temperature);
    return Number.isFinite(v) && v > -20 && v < 50 ? v : null;
  };
  const heating = (hs, a) => climOf(a).some((id) => ["heating", "preheating"].includes(hs.states[id]?.attributes.hvac_action));
  const outdoor = ctx.model.areas.filter((a) => isOutside(a) && a.temperature).map((a) => a.temperature)[0]
    || Object.keys(hass.states).find((id) => /aussentemperatur|outdoor_temp|outside_temp/i.test(id) && hass.states[id].attributes.device_class === "temperature");

  const hr = hero("warm");
  const avgEl = h("b");
  hr.mid.append(avgEl, h("small", {}, t("ov_avg")));
  const groups = new Map();
  for (const a of rooms) {
    const k = a.floor?.floor_id || "_";
    if (!groups.has(k)) groups.set(k, { floor: a.floor, rooms: [] });
    groups.get(k).rooms.push(a);
  }
  const ordered = [...groups.values()].sort((a, b) => (b.floor?.level ?? -9) - (a.floor?.level ?? -9));
  const body = h("div", {});
  const rowsAll = [];
  for (const g of ordered) {
    const head = h("div", { class: "hp-label hp-ov-label" }, h("span", {}, g.floor?.name || t("no_floor")), h("span", { class: "avg" }));
    const list = h("div", { class: "hp-ov-list-rows" });
    const rows = g.rooms.map((a) => {
      const cl = climOf(a);
      const r = row({ ic: "mdi:thermometer", onClick: () => (cl[0] ? openThermostat(ctx, cl[0]) : a.temperature && ctx.openDetails(a.temperature)) });
      const big = h("b", { class: "hp-ov-temp" });
      r.right.append(big);
      r.upd = (hs, mid) => {
        const v = readT(hs, a);
        const heat = heating(hs, a);
        const st = cl[0] && hs.states[cl[0]];
        const target = st && st.state !== "off" ? st.attributes.temperature : null;
        r.name.textContent = a.name;
        r.sub.textContent = [heat ? t("heating_now") : st?.state === "off" ? t("off") : null, target != null ? t("ov_target", { v: fmt(hs, target, 1) }) : null].filter(Boolean).join(" · ") || "–";
        big.textContent = v != null ? `${fmt(hs, v, 1)}°` : "–";
        r.dataset.tone = tempTone(v, mid);
        r.classList.toggle("heat", heat);
        r.icEl.icon = heat ? "mdi:fire" : "mdi:thermometer";
        return v;
      };
      return r;
    });
    list.append(...rows);
    body.append(head, list);
    rowsAll.push({ head, rows, g });
  }
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot" });
  const hp = heatPumps(hass)[0];
  if (hp) {
    const b = btn("mdi:heat-pump-outline", t("hp_title"));
    b.addEventListener("click", () => openHeatPump(ctx, hp));
    foot.append(b);
  }
  sheet.body.append(hr.el, body, ...(foot.childElementCount ? [foot] : []));

  const upd = (hs) => {
    const raw = rooms.map((a) => readT(hs, a)).filter((v) => v != null).sort((x, y) => x - y);
    const mid = raw.length ? raw[Math.floor(raw.length / 2)] : 21;
    // A broken sensor (0° in the garage) must not spoil the average and the range.
    const vals = raw.filter((v) => Math.abs(v - mid) <= 8);
    const avg = vals.length ? vals.reduce((x, y) => x + y, 0) / vals.length : null;
    for (const { head, rows } of rowsAll) {
      const vs = rows.map((r) => r.upd(hs, mid)).filter((v) => v != null);
      head.querySelector(".avg").textContent = vs.length ? `Ø ${fmt(hs, vs.reduce((x, y) => x + y, 0) / vs.length, 1)}°` : "";
    }
    const n = rooms.filter((a) => heating(hs, a)).length;
    avgEl.textContent = avg != null ? `${fmt(hs, avg, 1)}°` : "–";
    // The ring: where the house's average sits between 16° and 26°.
    hr.rg.set(avg != null ? Math.max(4, Math.min(100, ((avg - 16) / 10) * 100)) : 0);
    hr.status.textContent = n ? t("n_heating", { n }) : t("th_idle");
    hr.status.dataset.phase = n ? "run" : "";
    hr.title.textContent = vals.length ? `${fmt(hs, vals[0], 1)}–${fmt(hs, vals[vals.length - 1], 1)}°` : "";
    const o = Number(hs.states[outdoor]?.state);
    hr.sub.textContent = [t("ov_n_rooms", { n: rooms.length }), Number.isFinite(o) ? `${fmt(hs, o, 0)}° ${t("hp_outside")}` : null].filter(Boolean).join(" · ");
  };
  upd(hass);
  sheet.updaters.push(upd);
}

// ---------------------------------------------------------------- shades

const posOf = (st) => st?.attributes.current_position ?? (st?.state === "closed" ? 0 : 100);

export function openShadesOverview(ctx, { title, ids: all }, openClassic) {
  const hass = ctx.hass;
  // Only shades that report a state (a pool cover without one is no window).
  const ids = all.filter((id) => hass.states[id] && !["unknown", "unavailable"].includes(hass.states[id].state));
  const sheet = openSheet(ctx, { title: t("shades"), subtitle: title, cls: "appliance ov-shades", actions: listButton(() => { sheet.close(); openClassic(); }) });
  const subEl = sheet.el.querySelector(".hp-sheet-sub") || h("div", { class: "hp-sheet-sub" });
  if (!subEl.isConnected) sheet.el.querySelector(".hp-sheet-titles").append(subEl);

  // The sun's arc today with where it is now.
  const sunSvg = svgEl("svg", { viewBox: "0 0 340 96", preserveAspectRatio: "none" });
  sunSvg.append(svgEl("path", { d: "M10 90 Q170 -30 330 90", class: "arc" }));
  const sunGlow = svgEl("circle", { r: 18, class: "glow" });
  const sunDot = svgEl("circle", { r: 10, class: "sun" });
  sunSvg.append(sunGlow, sunDot);
  const sunL = h("small");
  const sunR = h("b");
  const sun = h("div", { class: "hp-ov-sun" }, sunSvg, sunL, sunR);

  // One window per room: a room's shades move together, the popup of the room has each one.
  const groups = new Map();
  for (const id of ids) {
    const k = ctx.model.areaOf[id] || id;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(id);
  }
  const avg = (hs, g) => Math.round(g.reduce((a, id) => a + posOf(hs.states[id]), 0) / g.length);
  const order = [...groups.entries()].sort((x, y) => avg(hass, y[1]) - avg(hass, x[1]));
  const wins = order.map(([k, g]) => {
    const sl = h("div", { class: "sl" });
    const lab = h("small");
    const areaName = ctx.model.areaById.get(k)?.name;
    const nm = areaName || entityName(hass, g[0]).replace(/^(shade|shades|rollladen|rolladen|rollo|jalousie|blind|raffstore)\s+/i, "");
    const frame = h("div", { class: `frame ${g.length > 1 ? "duo" : ""}` }, sl, ...(g.length > 1 ? [h("i", { class: "mullion" })] : []));
    const el = h("button", { class: "hp-ov-win" }, frame, h("b", {}, nm), lab);
    el.addEventListener("click", () => (g.length > 1 ? ctx.openShadesClassic?.({ title: nm, ids: g }) : ctx.openDetails(g[0])));
    el.upd = (hs) => {
      const p = avg(hs, g);
      sl.style.height = `${100 - p}%`;
      const moving = g.some((id) => ["opening", "closing"].includes(hs.states[id]?.state));
      el.classList.toggle("moving", moving);
      const n = g.length > 1 ? ` · ${g.length}` : "";
      lab.textContent = (moving ? t("shades_moving") : p <= 0 ? t("ov_closed_short") : p >= 100 ? t("ov_open_short") : t("open_pct", { n: p })) + n;
    };
    return el;
  });
  const grid = h("div", { class: "hp-ov-wins" }, ...wins);
  const call = (svc) => ctx.hass.callService("cover", svc, { entity_id: ids });
  const closeB = btn("mdi:arrow-down", t("ov_all_close"), "primary");
  closeB.addEventListener("click", () => call("close_cover"));
  const openB = btn("mdi:arrow-up", t("ov_all_open"));
  openB.addEventListener("click", () => call("open_cover"));
  sheet.body.append(sun, grid, h("div", { class: "hp-sheet-actions hp-app-foot" }, closeB, openB));

  const upd = (hs) => {
    wins.forEach((w) => w.upd(hs));
    const open = ids.filter((id) => posOf(hs.states[id]) > 0).length;
    subEl.textContent = [title, open ? t("n_of_m_open", { n: open, m: ids.length }) : t("all_closed_short")].filter(Boolean).join(" · ");
    const s = hs.states["sun.sun"];
    if (s) {
      const a = s.attributes;
      const up = s.state === "above_horizon";
      const az = Math.max(60, Math.min(300, a.azimuth ?? 180));
      const x = 10 + ((az - 60) / 240) * 320;
      const tt = (x - 10) / 320;
      const yArc = (1 - tt) * (1 - tt) * 90 + 2 * (1 - tt) * tt * -30 + tt * tt * 90;
      const y = up ? yArc : 92;
      sunDot.setAttribute("cx", x);
      sunDot.setAttribute("cy", y);
      sunGlow.setAttribute("cx", x);
      sunGlow.setAttribute("cy", y);
      sun.classList.toggle("night", !up);
      const next = up ? a.next_setting : a.next_rising;
      sunL.textContent = next ? `${up ? t("ov_sunset") : t("ov_sunrise")} ${formatTime(hs, new Date(next))}` : "";
      sunR.textContent = up ? `${fmt(hs, a.elevation, 0)}° ${t("ov_high")}` : t("ov_sun_down");
    }
  };
  upd(hass);
  sheet.updaters.push(upd);
}
