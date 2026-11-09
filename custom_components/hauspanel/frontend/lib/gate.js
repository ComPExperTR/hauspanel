// Gate and garage door popup: a door that rolls up and down with the real state, "open for 12 min",
// the camera of that place, the light, and open/close with two taps.
import { h, icon } from "./util.js";
import { openSheet } from "./dialogs.js";
import { liveVideo } from "./camera.js";
import { t } from "./i18n.js";
import { hint, btn, twoTap, since } from "./popkit.js";
import { openVisitors } from "./visitors.js";

export const isGate = (hass, id) => id.startsWith("cover.") && ["garage", "gate"].includes(hass.states[id]?.attributes.device_class);

/** The camera that looks at this gate: one named after its room or the gate. */
function gateCamera(ctx, id) {
  const hass = ctx.hass;
  const area = ctx.model.areaOf[id];
  const cams = Object.keys(hass.states).filter((c) => c.startsWith("camera.") && hass.states[c].state !== "unavailable" && !/letzte|letztes|last_|snapshot|_person|_car/i.test(c));
  return cams.find((c) => area && c.split(".")[1].startsWith(area) && !/doorstation/.test(c))
    || cams.find((c) => area && ctx.model.areaOf[c] === area && !/doorstation/.test(c)) || null;
}

export function openGate(ctx, id) {
  const hass = ctx.hass;
  const st0 = hass.states[id];
  if (!st0) return;
  const dev = hass.entities?.[id]?.device_id;
  const light = Object.values(hass.entities || {}).find((e) => e.device_id === dev && e.entity_id.startsWith("light."))?.entity_id;
  const areaName = ctx.model.areaById.get(ctx.model.areaOf[id])?.name;
  const garage = st0.attributes.device_class === "garage" && !/gate|tor\b|einfahrt|entry/i.test(`${id} ${st0.attributes.friendly_name}`);
  const cam = gateCamera(ctx, id);

  const slats = h("div", { class: "hp-gate-door" }, ...Array.from({ length: 8 }, () => h("i")));
  const frame = h("div", { class: `hp-gate-frame ${garage ? "garage" : "gate"}` }, h("div", { class: "hp-gate-inside" }, icon(garage ? "mdi:car-side" : "mdi:road-variant")), slats);
  const status = h("span", { class: "hp-app-status" });
  const sinceEl = h("div", { class: "hp-app-eta" });
  const hero = h("div", { class: "hp-gate-hero" }, frame, h("div", { class: "hp-app-info" }, status, sinceEl));
  const media = cam ? h("div", { class: "hp-pr-media live" }, h("span", { class: "hp-pr-badge" }, h("i"), t("live"))) : null;
  const video = cam ? liveVideo(ctx, cam) : null;
  if (video) media.prepend(video);
  const hints = h("div", { class: "hp-app-hints" });

  const sheet = openSheet(ctx, { title: st0.attributes.friendly_name?.replace(/^(Garage|Entry Gate)\s+/, "") || id, subtitle: areaName, cls: "appliance gate", onClose: () => video?.stop() });
  const call = (svc) => ctx.hass.callService("cover", svc, { entity_id: id });
  const openB = twoTap(btn(garage ? "mdi:arrow-up-bold" : "mdi:gate-open", t("gate_open"), "primary"), () => call("open_cover"), t("pk_tap_again"));
  const closeB = twoTap(btn(garage ? "mdi:arrow-down-bold" : "mdi:gate", t("gate_close"), "primary"), () => call("close_cover"), t("pk_tap_again"));
  const stopB = btn("mdi:stop", t("gate_stop"), "danger");
  stopB.addEventListener("click", () => call("stop_cover"));
  const lightB = light ? btn("mdi:lightbulb-outline", t("gate_light")) : null;
  lightB?.addEventListener("click", () => ctx.hass.callService("light", "toggle", { entity_id: light }));
  const more = btn("mdi:account-search-outline", t("vis_short"));
  more.addEventListener("click", () => { sheet.close(); openVisitors(ctx); });
  // The big action (open / close / stop) on its own line, the rest below it.
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot hp-pr-foot hp-gate-foot" }, openB, closeB, stopB, ...(lightB ? [lightB] : []), more);
  sheet.body.append(hero, ...(media ? [media] : []), hints, foot);

  const update = (hs) => {
    const st = hs.states[id];
    if (!st) return;
    const a = st.attributes;
    const pos = a.current_position ?? (st.state === "closed" ? 0 : st.state === "open" ? 100 : 50);
    const moving = st.state === "opening" || st.state === "closing";
    frame.style.setProperty("--open", String(pos / 100));
    frame.dataset.state = st.state;
    status.textContent = hs.formatEntityState?.(st) || st.state;
    status.dataset.phase = st.state === "open" ? "pause" : moving ? "run" : st.state === "closed" ? "done" : "";
    sinceEl.textContent = st.state === "open" ? t("gate_open_since", { when: since(st.last_changed) }) : st.state === "closed" ? t("gate_closed_since", { when: since(st.last_changed) }) : "";
    openB.hidden = st.state === "open" || moving;
    closeB.hidden = st.state === "closed" || moving;
    stopB.hidden = !moving;
    if (lightB) lightB.classList.toggle("lit", hs.states[light]?.state === "on");
    const list = [];
    if (a["obstruction-detected"] || a.obstruction_detected) list.push(hint("mdi:alert-octagon-outline", t("gate_obstruction"), true));
    if (st.state === "open" && Date.now() - Date.parse(st.last_changed) > 30 * 60000) list.push(hint("mdi:clock-alert-outline", t("gate_open_long")));
    hints.replaceChildren(...list);
    hints.hidden = !list.length;
    video?.update(hs);

  };
  update(hass);
  sheet.updaters.push(update);
}
