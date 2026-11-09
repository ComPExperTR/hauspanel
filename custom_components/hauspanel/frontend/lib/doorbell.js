// Doorbell: when it rings, the camera opens full screen with a button to open the gate or door.
import { h, icon, domainOf } from "./util.js";
import { openCameraFull } from "./camera.js";
import { t } from "./i18n.js";

const OPENER_COVERS = new Set(["gate", "garage"]);

/** Doorbell event entities (device class doorbell). */
export function doorbells(hass) {
  return Object.keys(hass.states).filter((id) => id.startsWith("event.") && hass.states[id].attributes.device_class === "doorbell");
}

const deviceOf = (hass, id) => hass.entities?.[id]?.device_id;
const areaOf = (hass, id) => {
  const reg = hass.entities?.[id];
  return reg?.area_id || hass.devices?.[reg?.device_id]?.area_id;
};

/** Cameras to choose from, and the one picked by default: the bell's own live camera. */
export function bellCameras(hass) {
  return Object.keys(hass.states).filter((id) => id.startsWith("camera."));
}
function autoCamera(hass, bell) {
  const dev = deviceOf(hass, bell);
  const own = bellCameras(hass).filter((id) => dev && deviceOf(hass, id) === dev);
  return own.find((id) => /live/i.test(id)) || own[0] || bellCameras(hass).find((id) => areaOf(hass, id) && areaOf(hass, id) === areaOf(hass, bell)) || null;
}

/** What can open: gates and garage doors, locks, and the bell's own buttons (door relay). */
export function openers(hass, bell) {
  const dev = bell && deviceOf(hass, bell);
  return Object.keys(hass.states).filter((id) => {
    const d = domainOf(id);
    if (d === "cover") return OPENER_COVERS.has(hass.states[id].attributes.device_class);
    if (d === "lock") return true;
    // Only real door openers: relays or buttons named "open"/"buzzer" (not "doorstation", not "reset favourites").
    if (d === "button") return !!dev && deviceOf(hass, id) === dev && /relay|buzzer|summer|(^|[_\s])(open|öffn|oeffn|offn)/i.test(`${id.split(".")[1]} ${hass.states[id].attributes.friendly_name || ""}`.replace(/doorstation/gi, ""));
    return false;
  });
}
/** Default: the bell's own door buzzer (relay 1 first); without one, a gate in the bell's area. */
function autoOpener(hass, bell) {
  const all = openers(hass, bell);
  const relays = all.filter((id) => domainOf(id) === "button").sort();
  if (relays.length) return relays[0];
  const area = areaOf(hass, bell);
  return all.find((id) => domainOf(id) === "cover" && area && areaOf(hass, id) === area) || null;
}

export const bellConfig = (ctx) => ctx.settings.s.doorbell || {};
/** On by default on wall and security screens, off on the phone (it gets the app's own notification). */
export const bellEnabled = (ctx) => {
  const v = bellConfig(ctx).enabled;
  return v === undefined ? ctx._forceLayout !== "phone" : v;
};
export function bellCamera(ctx, bell) {
  const c = bellConfig(ctx).camera;
  return c && ctx.hass.states[c] ? c : autoCamera(ctx.hass, bell);
}
export function bellOpener(ctx, bell) {
  const o = bellConfig(ctx).opener;
  if (o === "") return null;
  return o && ctx.hass.states[o] ? o : autoOpener(ctx.hass, bell);
}

/** Opens the doorbell view (also used by "Try it" in the settings). */
export function ringNow(ctx, bell) {
  const cam = bellCamera(ctx, bell);
  if (!cam) return null;
  const actions = [];
  const opener = bellOpener(ctx, bell);
  if (opener) {
    const dev = ctx.hass.devices?.[deviceOf(ctx.hass, opener)];
    const isBuzzer = domainOf(opener) === "button";
    const name = isBuzzer ? t("doorbell_buzzer") : dev?.name_by_user || dev?.name || ctx.hass.states[opener]?.attributes.friendly_name || opener;
    const label = h("span", {}, name);
    const b = h("button", { class: "hp-camfull-act" }, icon(isBuzzer ? "mdi:door-open" : domainOf(opener) === "lock" ? "mdi:lock-open-variant-outline" : "mdi:gate-open"), label);
    let timer = null;
    // Opening is outward-facing: the first tap arms, the second opens.
    b.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!b.classList.contains("armed")) {
        b.classList.add("armed");
        label.textContent = t("doorbell_open_confirm");
        clearTimeout(timer);
        timer = setTimeout(() => { b.classList.remove("armed"); label.textContent = name; }, 4000);
        return;
      }
      clearTimeout(timer);
      b.classList.remove("armed");
      b.classList.add("done");
      label.textContent = name;
      const d = domainOf(opener);
      if (d === "cover") ctx.hass.callService("cover", "open_cover", { entity_id: opener });
      else if (d === "lock") ctx.hass.callService("lock", "unlock", { entity_id: opener });
      else ctx.hass.callService("button", "press", { entity_id: opener });
      setTimeout(() => b.classList.remove("done"), 2500);
    });
    actions.push(b);
  }
  const area = ctx.hass.areas?.[areaOf(ctx.hass, bell)]?.name || "";
  return openCameraFull(ctx, cam, [cam], { title: t("doorbell_ringing"), subtitle: area, actions, limit: 2 * 60 * 1000, cls: "ring" });
}

/** Call on every state update: opens the view when a doorbell event fires while the panel is open. */
export function doorbellWatcher(ctx) {
  const seen = new Map();
  let open = null;
  return (hass) => {
    for (const id of doorbells(hass)) {
      const s = hass.states[id].state;
      const prev = seen.get(id);
      seen.set(id, s);
      if (prev === undefined || s === prev || s === "unavailable" || s === "unknown") continue;
      if (!bellEnabled(ctx) || Math.abs(Date.now() - Date.parse(s)) > 60000) continue;
      if (open && ctx.sheets.has(open)) continue;
      open = ringNow(ctx, id);
    }
  };
}
