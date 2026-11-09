// Robot vacuum popup: a small floor where the robot drives while it cleans, battery, area and time,
// suction power, and how worn the filter, brushes, mop and dust bag are.
import { h, icon } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { num, live, slotsOf, stat, hint, level, btn, moreButton, fmt } from "./popkit.js";

const SLOTS = [
  ["battery", /_battery_level$/],
  ["status", /_status$/],
  ["area", /_cleaning_area$/],
  ["time", /_cleaning_time$/],
  ["filter", /_filter_life_level$/],
  ["brush", /_brush_life_level$/],
  ["side", /_brush_life_level_2$/],
  ["mop", /_mop_life_level$/],
  ["bag", /_dust_bag_life_level$/],
  ["pause", /^button\..*_pause_sweeping$/],
  ["resume", /^button\..*_continue_sweep$/],
  ["dust", /^button\..*_start_dust_arrest$/],
];

/** The vacuum entity for any entity of a robot vacuum's device. */
export function vacuumFor(hass, entityId) {
  if (entityId.startsWith("vacuum.")) return entityId;
  const dev = hass.entities?.[entityId]?.device_id;
  if (!dev) return null;
  return Object.values(hass.entities).find((e) => e.device_id === dev && e.entity_id.startsWith("vacuum."))?.entity_id || null;
}

const PHASE = { cleaning: "run", returning: "home", paused: "pause", docked: "dock", idle: "idle", error: "error" };

export function openVacuum(ctx, entityId) {
  const hass = ctx.hass;
  const st = hass.states[entityId];
  if (!st) return;
  const dev = hass.entities?.[entityId]?.device_id;
  const d = hass.devices?.[dev];
  const s = dev ? slotsOf(hass, dev, SLOTS) : {};
  const name = d?.name_by_user || d?.name || st.attributes.friendly_name;
  const area = ctx.model.areaById.get(ctx.model.areaOf[entityId] || d?.area_id)?.name;

  // The floor: tiles, a dock, the robot and the trail it leaves.
  const robot = h("div", { class: "hp-vac-robot" }, h("i", { class: "eye" }), h("i", { class: "brush" }));
  const floor = h("div", { class: "hp-vac-floor" }, h("div", { class: "hp-vac-trail" }), h("div", { class: "hp-vac-dock" }), robot);
  const status = h("span", { class: "hp-app-status" });
  const what = h("div", { class: "hp-app-prog" });
  const batt = h("div", { class: "hp-vac-batt" }, h("i"), h("span"));
  const hero = h("div", { class: "hp-app-hero hp-vac-hero" }, floor, h("div", { class: "hp-app-info" }, status, what, batt));

  const sArea = stat("mdi:texture-box", t("vac_area"));
  const sTime = stat("mdi:timer-outline", t("vac_time"));
  const sFan = stat("mdi:fan", t("vac_power"));
  const stats = h("div", { class: "hp-app-stats" }, sArea, sTime, sFan);

  const fans = h("div", { class: "hp-modes hp-pk-chips" });
  const fanList = st.attributes.fan_speed_list || [];
  const fanBtns = fanList.map((f) => {
    const b = h("button", { class: "hp-chip" }, f);
    b.addEventListener("click", () => ctx.hass.callService("vacuum", "set_fan_speed", { entity_id: entityId, fan_speed: f }));
    fans.append(b);
    return b;
  });

  const wear = [
    ["filter", "vac_filter", "mdi:air-filter"], ["brush", "vac_brush", "mdi:broom"], ["side", "vac_side", "mdi:fan"],
    ["mop", "vac_mop", "mdi:water"], ["bag", "vac_bag", "mdi:delete-outline"],
  ].filter(([k]) => s[k]).map(([k, label, ic]) => ({ k, el: level(t(label), ic) }));
  const wearBox = h("div", { class: "hp-pk-levels" }, h("div", { class: "hp-label" }, t("vac_wear")), ...wear.map((w) => w.el));
  const hints = h("div", { class: "hp-app-hints" });

  const sheet = openSheet(ctx, { title: name, subtitle: area, cls: "appliance vacuum" });
  const call = (svc) => ctx.hass.callService("vacuum", svc, { entity_id: entityId });
  const main = btn("mdi:play", t("vac_start"), "primary");
  const home = btn("mdi:home-import-outline", t("vac_home"));
  const dust = s.dust ? btn("mdi:delete-empty-outline", t("vac_empty")) : null;
  main.addEventListener("click", () => {
    const now = ctx.hass.states[entityId]?.state;
    if (now === "cleaning") {
      if (ctx.hass.states[entityId].attributes.supported_features & 4) call("pause");
      else if (s.pause) ctx.hass.callService("button", "press", { entity_id: s.pause });
      else call("stop");
    } else if (now === "paused" && s.resume) ctx.hass.callService("button", "press", { entity_id: s.resume });
    else call("start");
  });
  home.addEventListener("click", () => call("return_to_base"));
  dust?.addEventListener("click", () => ctx.hass.callService("button", "press", { entity_id: s.dust }));
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot hp-pr-foot" }, main, home, ...(dust ? [dust] : []), moreButton(ctx, sheet, entityId, openMoreInfo));
  sheet.body.append(hero, stats, fanList.length ? fans : "", wear.length ? wearBox : "", hints, foot);

  const update = (hs) => {
    const v = hs.states[entityId];
    if (!v) return;
    const a = v.attributes;
    const phase = PHASE[v.state] || "idle";
    hero.dataset.phase = phase;
    const charging = /charg/i.test(hs.states[s.status]?.state || a["vacuum.status_desc"] || "") && !/complet/i.test(hs.states[s.status]?.state || a["vacuum.status_desc"] || "");
    hero.classList.toggle("charging", phase === "dock" && charging);
    status.dataset.phase = phase === "run" ? "run" : phase === "pause" ? "pause" : phase === "error" ? "fail" : phase === "dock" ? "done" : "";
    status.textContent = t({ run: "vac_run", home: "vac_home_state", pause: "vac_pause_state", dock: "vac_dock", idle: "vac_idle", error: "vac_error" }[phase]);
    const desc = live(hs, s.status) ? hs.formatEntityState?.(hs.states[s.status]) || hs.states[s.status].state : a["vacuum.status_desc"];
    what.textContent = desc && desc.toLowerCase() !== status.textContent.toLowerCase() ? desc.charAt(0).toUpperCase() + desc.slice(1) : "";
    what.hidden = !what.textContent;
    const b = num(hs, s.battery) ?? a.battery_level;
    batt.firstChild.style.width = `${b ?? 0}%`;
    batt.dataset.tone = b < 20 ? "bad" : b < 40 ? "warn" : "";
    batt.lastChild.textContent = b != null ? `${Math.round(b)} % ${charging ? "· " + t("vac_charging") : ""}` : "";
    const ar = num(hs, s.area) ?? a["vacuum.cleaning_area"] ?? a["vacuum_extend.cleaning_area"];
    sArea.set(ar != null && ar < 1000 ? `${fmt(hs, ar)} m²` : "–");
    const tm = num(hs, s.time) ?? a["vacuum.cleaning_time"] ?? a["vacuum_extend.cleaning_time"];
    sTime.set(tm != null && tm < 600 ? `${Math.round(tm)} min` : "–");
    sFan.set(a.fan_speed || "–");
    fanBtns.forEach((fb, i) => fb.classList.toggle("active", fanList[i] === a.fan_speed));
    const list = [];
    for (const w of wear) {
      const p = num(hs, s[w.k]);
      w.el.set(p, p == null ? "–" : `${Math.round(p)} %`, p == null ? "" : p < 10 ? "bad" : p < 25 ? "warn" : "");
      if (p != null && p < 10) list.push(hint("mdi:wrench-outline", t("vac_replace", { what: w.el.querySelector("span").textContent }), p <= 2));
    }
    if (phase === "error") list.unshift(hint("mdi:alert-circle-outline", a["vacuum.status_desc"] || t("vac_error"), true));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    const ic = phase === "run" ? "mdi:pause" : "mdi:play";
    main.querySelector("ha-icon").icon = ic;
    main.querySelector("span").textContent = phase === "run" ? t("vac_pause") : phase === "pause" ? t("vac_resume") : t("vac_start");
    home.hidden = phase === "dock";
  };
  update(hass);
  sheet.updaters.push(update);
}
