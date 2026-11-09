// A device tile (grid, focus) or row (list). Each one updates itself when its state changes.
import { h, icon, domainOf, bindTapHold, toggleSwitch, lightColor, isUnavailable, entityName, slider } from "./util.js";
import { isOn } from "./model.js";
import { entityIcon, stateText, tapAction, buildControls, hasControls } from "./domains.js";
import { meterSensors, watts, formatWatts, deviceName, applianceFor, applianceText } from "./usage.js";

/** These open their controls on tap; lights, sockets and speakers switch or play with the small icon instead. */
const OPEN_ON_TAP = new Set(["climate", "water_heater", "cover", "light", "switch", "media_player", "vacuum", "valve"]);
const QUICK_ICON = new Set(["light", "switch", "media_player"]);

/** Sockets set to "meter only" in edit mode: no switching from the dashboard, a tap shows the usage. */
export const isMeter = (ctx, entityId) => !!ctx.settings.s.meters?.[entityId];

function tapOrOpen(ctx, entityId) {
  if (entityId.startsWith("camera.")) return ctx.openCamera(entityId);
  if (isMeter(ctx, entityId)) return ctx.openDetails(entityId);
  if (OPEN_ON_TAP.has(entityId.split(".")[0]) || !tapAction(ctx, entityId)) ctx.openDetails(entityId);
}
import { t } from "./i18n.js";
import { keepSnapshot } from "./camera.js";

const TOGGLE_ROW = new Set(["light", "switch", "fan", "input_boolean", "humidifier", "siren", "climate", "water_heater", "cover", "valve", "media_player"]);

export function createTile(ctx, entityId, { size = 1, areaName, variant = "tile", container } = {}) {
  const d = domainOf(entityId);
  const st0 = ctx.hass.states[entityId];
  const big = size === 2 && variant !== "row";
  const meter = isMeter(ctx, entityId) ? meterSensors(ctx.hass, entityId) : null;
  const wide = size === "w" && variant !== "row";
  const el = h("div", {
    class: `hp-tile hp-${variant} ${big ? "size2" : ""} ${wide ? "wide" : ""} ${meter ? "hp-meter" : ""}`,
    dataset: { key: entityId, domain: d },
    tabindex: "0",
    role: "button",
  });
  const ic = icon(entityIcon(ctx.hass, st0));
  const iconBox = h("div", { class: "hp-tile-icon" }, ic);
  const nameEl = h("div", { class: "hp-tile-name" });
  const stateEl = h("div", { class: "hp-tile-state" });
  const text = h("div", { class: "hp-tile-text" }, nameEl, stateEl);
  let art = null;
  let controls = null;
  let sw = null;

  if (variant === "row") {
    el.append(iconBox, text);
    if (TOGGLE_ROW.has(d) && !meter) {
      sw = toggleSwitch(isOn(st0), () => tapAction(ctx, entityId));
      el.append(h("div", { class: "hp-row-end" }, sw));
    } else if (d === "lock" || d === "scene" || d === "script" || d === "button" || d === "input_button") {
      const b = h("button", { class: "hp-chip small" }, d === "lock" ? icon("mdi:lock-outline") : icon("mdi:play"));
      b.addEventListener("pointerdown", (e) => e.stopPropagation());
      b.addEventListener("click", (e) => {
        e.stopPropagation();
        if (!ctx.editing) tapAction(ctx, entityId);
      });
      el.append(h("div", { class: "hp-row-end" }, b));
    }
  } else {
    if (d === "media_player" || d === "camera") {
      art = h("div", { class: "hp-tile-art" });
      el.append(art);
    }
    if (d === "camera") {
      el.classList.add("hp-cam-tile");
      el.append(h("div", { class: "hp-cam-badge" }, icon("mdi:play")));
      keepSnapshot(el, art, () => ctx.hass.states[entityId]);
    }
    // Heating and cooling right now (not just switched on): a small flame or snowflake in the corner.
    const act = d === "climate" || d === "water_heater" ? h("span", { class: "hp-act", hidden: true }, icon("mdi:fire")) : null;
    el.append(h("div", { class: "hp-tile-top" }, iconBox, act), text);
    if (act) el._act = act;
    if (QUICK_ICON.has(d) && !meter) {
      // The icon is the on/off button; the rest of the tile opens the popup.
      iconBox.classList.add("hp-quick");
      iconBox.setAttribute("role", "switch");
      iconBox.setAttribute("aria-label", t("toggle"));
      iconBox.addEventListener("pointerdown", (e) => { if (!ctx.editing) e.stopPropagation(); });
      iconBox.addEventListener("click", (e) => {
        if (ctx.editing) return;
        e.stopPropagation();
        tapAction(ctx, entityId);
      });
    }
    // Shades: a thin bar shows how far they are open (gates only know open and closed, so no bar).
    const isShade = d === "cover" && !["garage", "gate", "door"].includes(st0?.attributes.device_class);
    if (isShade && !(big && hasControls(st0))) {
      const fill = h("i", {});
      el._coverBar = fill;
      el.append(h("div", { class: "hp-cover-bar" }, fill));
    }
    if (big && hasControls(st0)) {
      controls = buildControls(ctx, entityId, "card");
      el.append(controls);
    } else if (d === "light" && (st0?.attributes.supported_color_modes || []).some((m) => m !== "onoff")) {
      // A slim brightness bar, like a dimmer.
      const bri = (st) => (st?.state === "on" ? Math.round(((st.attributes.brightness ?? 255) / 255) * 100) : 0);
      const mini = slider({ value: bri(st0), min: 0, max: 100, cls: "mini", label: t("brightness"),
        onChange: (v) => ctx.hass.callService("light", v ? "turn_on" : "turn_off", v ? { entity_id: entityId, brightness_pct: v } : { entity_id: entityId }) });
      mini.addEventListener("pointerdown", (e) => { if (ctx.editing) e.preventDefault(); });
      el.append(mini);
      controls = { update: (st) => mini.update(bri(st)) };
    }
  }

  // Edit mode buttons: hide (−) and resize.
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide"), title: t("hide") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.hideItem(container, entityId);
  });
  el.append(minus);
  if (variant !== "row" && d !== "scene") {
    const resize = h("button", { class: "hp-edit-resize", "aria-label": t("resize"), title: t("resize") },
      icon(big ? "mdi:arrow-collapse" : wide ? "mdi:arrow-expand" : "mdi:arrow-expand-horizontal"));
    resize.addEventListener("pointerdown", (e) => e.stopPropagation());
    resize.addEventListener("click", (e) => {
      e.stopPropagation();
      ctx.settings.toggleSize(entityId);
    });
    el.append(resize);
  }

  // Edit mode: sockets that measure power switch between "switchable" and "meter only".
  if (ctx.editing && variant !== "row" && d === "switch" && (meter || meterSensors(ctx.hass, entityId).power)) {
    const mb = h("button", { class: `hp-edit-meter ${meter ? "active" : ""}`, "aria-label": t("meter_only"), title: t("meter_only") },
      icon(meter ? "mdi:flash" : "mdi:power"), h("span", {}, meter ? t("meter_short") : t("switch_short")));
    mb.addEventListener("pointerdown", (e) => e.stopPropagation());
    mb.addEventListener("click", (e) => {
      e.stopPropagation();
      ctx.settings.toggleMeter(entityId);
      ctx.toast(`${entityName(ctx.hass, entityId, areaName)}: ${meter ? t("now_switchable") : t("now_meter_only")}`);
    });
    el.append(mb);
  }

  bindTapHold(el, {
    canStart: () => !ctx.editing,
    tap: () => tapOrOpen(ctx, entityId),
    hold: () => ctx.openDetails(entityId),
  });
  el.addEventListener("keydown", (e) => {
    if (ctx.editing) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      tapOrOpen(ctx, entityId);
    }
  });

  let last = null;
  let appliance = null;
  let applianceAt = 0;
  el.update = (hass) => {
    const st = hass.states[entityId];
    // A meter tile also follows its power sensor and the appliance it powers.
    if (meter && !appliance && Date.now() - applianceAt > 30000) {
      appliance = applianceFor(hass, entityId, meter.power);
      applianceAt = Date.now();
    }
    const key = meter ? [st, hass.states[meter.power], appliance && hass.states[appliance.state], appliance && hass.states[appliance.progress], appliance && hass.states[appliance.remaining]] : [st];
    if (last && key.every((x, i) => x === last[i])) return;
    last = key;
    if (!st) {
      el.classList.add("unavail");
      nameEl.textContent = entityId;
      stateEl.textContent = t("unavailable");
      return;
    }
    // Meter only: on means power flows (a switched-off socket shows Off); the text gives the watts or the appliance's run.
    const w = meter ? watts(hass, meter.power) : null;
    const on = meter ? (d === "switch" ? st.state === "on" : (w ?? 0) > 2) : isOn(st);
    el.classList.toggle("on", on);
    el.classList.toggle("unavail", isUnavailable(st));
    el.classList.toggle("alert", st.state === "jammed" || st.state === "triggered" || (d === "lock" && on));
    el.dataset.state = st.state;
    ic.icon = entityIcon(hass, st);
    nameEl.textContent = meter && d === "sensor" ? deviceName(hass, entityId) : entityName(hass, entityId, areaName);
    if (meter) {
      if (d !== "switch") ic.icon = "mdi:power-socket-de";
      const run = applianceText(hass, appliance);
      // "Running" alone says little: add the watts until the appliance reports progress or time left.
      const runText = run && !run.includes("·") && w != null ? `${run} · ${formatWatts(hass, w)}` : run;
      stateEl.textContent = isUnavailable(st) ? t("unavailable") : runText || (on ? `${t("on")} · ${formatWatts(hass, w)}` : t("off"));
      el.classList.toggle("running", !!run);
    } else if (d === "cover") {
      // Open, closed, "30 % open" or moving up/down; the bar follows the position.
      const moving = st.state === "opening" || st.state === "closing";
      const pos = st.attributes.current_position ?? (st.state === "closed" ? 0 : 100);
      el.classList.toggle("moving", moving);
      el.classList.toggle("closed", st.state === "closed");
      stateEl.textContent = isUnavailable(st) ? t("unavailable")
        : st.state === "opening" ? t("moving_up") : st.state === "closing" ? t("moving_down")
          : st.state === "closed" || pos <= 0 ? t("shades_closed") : pos >= 100 ? t("shades_open") : t("pct_open", { n: pos });
      if (el._coverBar) el._coverBar.style.width = `${Math.max(0, Math.min(100, pos))}%`;
    } else stateEl.textContent = stateText(hass, st);
    const glow = d === "light" && on ? lightColor(st) : null;
    el.style.setProperty("--hp-glow", glow || "");
    if (art && d !== "camera") {
      const pic = st.attributes.entity_picture_local || st.attributes.entity_picture;
      art.style.backgroundImage = pic && on ? `url("${pic}")` : "";
      el.classList.toggle("has-art", !!(pic && on));
    }
    if (el._act) {
      const a = st.attributes.hvac_action;
      const heating = a === "heating" || a === "preheating";
      const cooling = a === "cooling";
      el._act.hidden = !(heating || cooling);
      el.classList.toggle("heating", heating);
      el.classList.toggle("cooling", cooling);
      if (heating || cooling) stateEl.textContent = `${t(heating ? "heats" : "cools")} · ${stateText(hass, st)}`;
      el._act.classList.toggle("cool", cooling);
      el._act.firstChild.icon = cooling ? "mdi:snowflake" : "mdi:fire";
      el._act.title = heating ? t("heating_now") : cooling ? t("cooling_now") : "";
    }
    sw?.update(on);
    controls?.update(st);
  };
  el.update(ctx.hass);
  return el;
}

/** A titled separator inside a room or page. */
export function createSeparator(ctx, container, key, title) {
  const el = h("div", { class: "hp-sep", dataset: { key } }, h("span", { class: "hp-sep-title" }, title || t("separator")));
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("remove") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.hideItem(container, key);
  });
  const rename = h("button", { class: "hp-edit-resize", "aria-label": t("rename") }, icon("mdi:pencil"));
  rename.addEventListener("pointerdown", (e) => e.stopPropagation());
  rename.addEventListener("click", async (e) => {
    e.stopPropagation();
    const v = await ctx.prompt(t("separator_title"), title);
    if (v !== null) ctx.settings.renameSeparator(container, key, v);
  });
  el.append(minus, rename);
  el.update = () => {};
  return el;
}

/** A pill in the scene strip. */
export function createScenePill(ctx, entityId, container) {
  const st = ctx.hass.states[entityId];
  const name = st?.attributes.friendly_name || entityId;
  const label = h("span", {}, name);
  const el = h("div", { class: "hp-scene", dataset: { key: entityId }, role: "button", tabindex: "0", title: name },
    icon(entityIcon(ctx.hass, st)), label);
  const disarm = () => {
    clearTimeout(el._disarm);
    el.classList.remove("armed");
    label.textContent = name;
  };
  const minus = h("button", { class: "hp-edit-minus", "aria-label": t("hide") }, icon("mdi:minus"));
  minus.addEventListener("pointerdown", (e) => e.stopPropagation());
  minus.addEventListener("click", (e) => {
    e.stopPropagation();
    ctx.hideItem(container, entityId);
  });
  el.append(minus);
  bindTapHold(el, {
    canStart: () => !ctx.editing,
    tap: () => {
      // "Good night" first shows the check (what is still open, alarm), and runs from there.
      if (/gute nacht|good ?night|schlafen|bedtime/i.test(name) && ctx.openGoodNight && ctx.settings.s.nightCheck === true) {
        ctx.openGoodNight(entityId);
        return;
      }
      // Inline confirm: the first tap arms the pill, a second tap within 4 s runs it.
      if (ctx.settings.s.sceneConfirm !== false && !el.classList.contains("armed")) {
        el.classList.add("armed");
        label.textContent = t("scene_confirm");
        clearTimeout(el._disarm);
        el._disarm = setTimeout(disarm, 4000);
        return;
      }
      disarm();
      const d = domainOf(entityId);
      ctx.hass.callService(d === "script" ? "script" : "scene", "turn_on", { entity_id: entityId });
      el.classList.add("flash");
      setTimeout(() => el.classList.remove("flash"), 700);
    },
    hold: () => ctx.openDetails(entityId),
  });
  el.update = () => {};
  return el;
}
