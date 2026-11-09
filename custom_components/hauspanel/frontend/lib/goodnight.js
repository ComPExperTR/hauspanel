// Good night check: before the night scene runs, what is still on or open, each with a button to fix it,
// then the scene and (optionally) the alarm on "home".
import { h, icon, domainOf } from "./util.js";
import { isOn, hideMatcher } from "./model.js";
import { openSheet } from "./dialogs.js";
import { statusItems, isAlert, pillName } from "./securityview.js";
import { runningAppliances } from "./usage.js";
import { t } from "./i18n.js";
import { ring, btn, twoTap } from "./popkit.js";
import { codePad } from "./overviews.js";

const NOT_SHADE = new Set(["garage", "gate", "door", "damper"]);

export function openGoodNight(ctx, sceneId) {
  const hass = ctx.hass;
  const m = ctx.model;
  const s = statusItems(ctx);
  const hiddenRule = hideMatcher(hass, ctx.settings.s.hide);
  const hiddenSec = new Set(Object.entries(ctx.settings.s.containers || {}).filter(([k]) => k === "home:security" || k.startsWith("security:")).flatMap(([, c]) => c.hidden || []));
  const shown = (id) => !hiddenRule(id) && !hiddenSec.has(id);
  const alarmId = s.alarm[0];
  const inHouse = (id) => !!m.areaOf[id] && m.areaOf[id] !== "_other";

  const groups = [
    { key: "lights", ic: "mdi:lightbulb-on-outline", okIc: "mdi:lightbulb-off-outline", label: "gn_lights", okLabel: "gn_lights_ok",
      ids: () => m.lights.filter((id) => inHouse(id) && isOn(ctx.hass.states[id])), fix: (ids) => ctx.hass.callService("light", "turn_off", { entity_id: ids }), fixLabel: "gn_off" },
    { key: "doors", ic: "mdi:door-open", okIc: "mdi:door-closed", label: "gn_doors", okLabel: "gn_doors_ok",
      ids: () => s.doors.filter(shown).filter((id) => isAlert(ctx.hass, id)) },
    { key: "gates", ic: "mdi:garage-open-variant", okIc: "mdi:garage-variant", label: "gn_gates", okLabel: "gn_gates_ok", two: true,
      ids: () => s.gates.filter(shown).filter((id) => isAlert(ctx.hass, id)), fix: (ids) => ctx.hass.callService("cover", "close_cover", { entity_id: ids }), fixLabel: "gn_close" },
    { key: "locks", ic: "mdi:lock-open-variant-outline", okIc: "mdi:lock", label: "gn_locks", okLabel: "gn_locks_ok",
      ids: () => s.locks.filter(shown).filter((id) => domainOf(id) === "lock" && isAlert(ctx.hass, id)), fix: (ids) => ctx.hass.callService("lock", "lock", { entity_id: ids }), fixLabel: "gn_lock" },
    { key: "shades", ic: "mdi:blinds-horizontal", okIc: "mdi:blinds-horizontal-closed", label: "gn_shades", okLabel: "gn_shades_ok",
      ids: () => m.all.filter((id) => domainOf(id) === "cover" && !NOT_SHADE.has(ctx.hass.states[id]?.attributes.device_class)
        && !["unknown", "unavailable"].includes(ctx.hass.states[id]?.state) && (ctx.hass.states[id]?.attributes.current_position ?? (ctx.hass.states[id]?.state === "closed" ? 0 : 100)) > 5),
      fix: (ids) => ctx.hass.callService("cover", "close_cover", { entity_id: ids }), fixLabel: "gn_close" },
  ];

  const sheet = openSheet(ctx, { title: t("gn_title"), subtitle: t("gn_sub"), cls: "appliance goodnight" });
  const rg = ring("hp-app-ring hp-ov-ring");
  const frac = h("b");
  const dial = h("div", { class: "hp-pr-dial" }, rg.svg, h("div", { class: "hp-app-center hp-ov-mid" }, frac, h("small", {}, t("gn_ready"))));
  const status = h("span", { class: "hp-app-status" });
  const title = h("div", { class: "hp-ov-h1" });
  const sub = h("div", { class: "hp-app-eta hp-ov-h2" });
  const hero = h("div", { class: "hp-pr-hero hp-ov-hero hp-gn-hero" }, dial, h("div", { class: "hp-app-info" }, status, title, sub));
  const list = h("div", { class: "hp-ov-list-rows" });

  const rows = groups.map((g) => {
    const icEl = icon(g.ic);
    const name = h("b");
    const small = h("small");
    const right = h("div", { class: "hp-ov-right" });
    const el = h("div", { class: "hp-ov-row" }, h("span", { class: "hp-ov-ic" }, icEl), h("div", { class: "hp-ov-txt" }, name, small), right);
    let fixB = null;
    if (g.fix) {
      fixB = h("button", { class: "hp-ov-fix" }, h("span", {}, t(g.fixLabel)));
      const run = () => g.fix(g.ids());
      if (g.two) twoTap(fixB, run, t("pk_tap_again"));
      else fixB.addEventListener("click", (e) => { e.stopPropagation(); run(); });
    }
    el.upd = (hs) => {
      const ids = g.ids();
      const bad = ids.length > 0;
      el.classList.toggle("bad", bad);
      el.classList.toggle("ok", !bad);
      icEl.icon = bad ? g.ic : g.okIc;
      name.textContent = bad ? t(g.label, { n: ids.length }) : t(g.okLabel);
      small.textContent = bad ? ids.slice(0, 3).map((id) => g.key === "lights" ? (m.areaById.get(m.areaOf[id])?.name || pillName(hs, id)) : pillName(hs, id))
        .filter((v, i, a) => a.indexOf(v) === i).join(" · ") + (ids.length > 3 ? " …" : "") : "";
      right.replaceChildren(bad ? (fixB || h("span", { class: "hp-ov-tag bad" }, t("ov_open_short"))) : h("span", { class: "hp-gn-check" }, icon("mdi:check")));
      return bad;
    };
    return el;
  });
  // Machines still running: just good to know.
  const apps = h("div", { class: "hp-ov-row ok" });
  list.append(...rows, apps);

  const goB = btn("mdi:weather-night", t("gn_go"), "primary");
  const noAlarmB = alarmId ? btn("mdi:shield-off-outline", t("gn_no_alarm")) : null;
  const runScene = () => ctx.hass.callService(domainOf(sceneId) === "script" ? "script" : "scene", "turn_on", { entity_id: sceneId });
  goB.addEventListener("click", () => {
    if (!alarmId || ctx.hass.states[alarmId]?.state !== "disarmed") { runScene(); sheet.close(); return; }
    const a = ctx.hass.states[alarmId].attributes;
    const arm = (code, pad) => ctx.hass.callService("alarm_control_panel", "alarm_arm_home", { entity_id: alarmId, ...(code ? { code } : {}) })
      .then(() => { runScene(); pad?.close(); sheet.close(); })
      .catch(() => { ctx.toast?.(t("ov_code_wrong")); });
    if (a.code_arm_required && a.code_format != null) codePad(ctx, { title: t("gn_title"), onCode: arm });
    else arm();
  });
  noAlarmB?.addEventListener("click", () => { runScene(); sheet.close(); });
  sheet.body.append(hero, list, h("div", { class: "hp-sheet-actions hp-app-foot" }, goB, ...(noAlarmB ? [noAlarmB] : [])));

  const update = (hs) => {
    const bad = rows.map((r) => r.upd(hs)).filter(Boolean).length;
    const total = rows.length;
    rg.set(((total - bad) / total) * 100);
    frac.textContent = `${total - bad}/${total}`;
    hero.classList.toggle("alert", false);
    status.textContent = bad ? t("gn_almost") : t("gn_all_set");
    status.dataset.phase = bad ? "pause" : "done";
    title.textContent = bad === 1 ? t("gn_one_open") : bad ? t("gn_n_open", { n: bad }) : t("gn_sleep_well");
    sub.textContent = alarmId ? t("gn_then_alarm") : t("gn_then_scene");
    const run = runningAppliances(hs);
    apps.replaceChildren(h("span", { class: "hp-ov-ic" }, icon("mdi:washing-machine")),
      h("div", { class: "hp-ov-txt" }, h("b", {}, run.length === 1 ? t("gn_app_running") : run.length ? t("gn_apps_running", { n: run.length }) : t("gn_apps_none")), h("small", {}, run.map((a) => `${a.name} · ${a.text}`).join(" · "))),
      h("div", { class: "hp-ov-right" }, h("span", { class: "hp-gn-check" }, icon(run.length ? "mdi:information-outline" : "mdi:check"))));
  };
  update(hass);
  sheet.updaters.push(update);
}
