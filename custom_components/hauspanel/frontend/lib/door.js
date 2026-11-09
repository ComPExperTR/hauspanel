// Front door popup: the live picture, the last ring and last motion as pictures, when it rang lately,
// and opening the door (two taps).
import { h, icon, domainOf } from "./util.js";
import { openSheet } from "./dialogs.js";
import { liveVideo, snapshotUrl } from "./camera.js";
import { doorbells, bellCamera, bellOpener } from "./doorbell.js";
import { t } from "./i18n.js";
import { btn, twoTap, ago, clock } from "./popkit.js";
import { openVisitors } from "./visitors.js";

/** Is this camera (or event) the doorbell's? Returns the bell's event entity. */
export function bellFor(ctx, entityId) {
  const hass = ctx.hass;
  for (const bell of doorbells(hass)) {
    if (entityId === bell || bellCamera(ctx, bell) === entityId) return bell;
    const dev = hass.entities?.[bell]?.device_id;
    if (dev && hass.entities?.[entityId]?.device_id === dev && entityId.startsWith("camera.")) return bell;
  }
  return null;
}

export function openDoor(ctx, bell) {
  const hass = ctx.hass;
  const cam = bellCamera(ctx, bell);
  const dev = hass.entities?.[bell]?.device_id;
  const devCams = Object.values(hass.entities || {}).filter((e) => e.device_id === dev && e.entity_id.startsWith("camera.")).map((e) => e.entity_id);
  const ringCam = devCams.find((id) => /klingel|ring/i.test(id));
  const motionCam = devCams.find((id) => /bewegung|motion/i.test(id));
  const area = hass.areas?.[hass.devices?.[dev]?.area_id]?.name || "";

  const media = h("div", { class: "hp-pr-media live hp-door-media" }, h("span", { class: "hp-pr-badge" }, h("i"), t("live")));
  const video = cam ? liveVideo(ctx, cam) : null;
  if (video) media.prepend(video);
  const shot = (id, label, whenOf) => {
    const img = h("img", { alt: "" });
    const when = h("small");
    const el = h("div", { class: "hp-door-shot" }, img, h("div", { class: "cap" }, h("b", {}, label), when));
    el.update = (hs) => {
      const st = hs.states[id];
      const url = st && snapshotUrl(st);
      if (url && img.dataset.k !== st.last_updated) { img.dataset.k = st.last_updated; img.src = url; }
      const w = whenOf?.(hs);
      when.textContent = w ? ago(hs, w) : "";
    };
    return el;
  };
  const shots = [ringCam && shot(ringCam, t("door_last_ring"), (hs) => (Number.isFinite(Date.parse(hs.states[bell]?.state)) ? hs.states[bell].state : null)), motionCam && shot(motionCam, t("door_last_motion"))].filter(Boolean);
  const strip = h("div", { class: "hp-door-strip" }, ...shots);
  const rings = h("div", { class: "hp-door-rings" });

  const sheet = openSheet(ctx, { title: t("door_title"), subtitle: area, cls: "appliance door", onClose: () => video?.stop() });
  const opener = bellOpener(ctx, bell);
  const foot = h("div", { class: "hp-sheet-actions hp-app-foot hp-pr-foot" });
  if (opener) {
    const isLock = domainOf(opener) === "lock";
    const b = twoTap(btn(isLock ? "mdi:lock-open-variant-outline" : domainOf(opener) === "cover" ? "mdi:gate-open" : "mdi:door-open", t("doorbell_buzzer"), "primary"), () => {
      const d = domainOf(opener);
      if (d === "cover") ctx.hass.callService("cover", "open_cover", { entity_id: opener });
      else if (d === "lock") ctx.hass.callService("lock", "unlock", { entity_id: opener });
      else ctx.hass.callService("button", "press", { entity_id: opener });
    }, t("doorbell_open_confirm"));
    foot.append(b);
  }
  const visBtn = btn("mdi:account-search-outline", t("vis_title"));
  visBtn.addEventListener("click", () => { sheet.close(); openVisitors(ctx); });
  foot.append(visBtn);
  const camBtn = btn("mdi:cctv", t("door_cameras"));
  camBtn.addEventListener("click", () => { sheet.close(); ctx.openCameraPlain?.(cam); });
  foot.append(camBtn);
  sheet.body.append(media, strip, rings, foot);

  const update = (hs) => {
    video?.update(hs);
    shots.forEach((s) => s.update(hs));
  };
  update(hass);
  sheet.updaters.push(update);

  // When it rang in the last week.
  const from = new Date(Date.now() - 7 * 86400e3).toISOString();
  hass.callWS({ type: "history/history_during_period", start_time: from, entity_ids: [bell], minimal_response: true, no_attributes: true, significant_changes_only: false })
    .then((r) => {
      const times = (r[bell] || []).map((x) => Date.parse(x.s)).filter((v) => Number.isFinite(v) && v > Date.parse(from)).sort((a, b) => b - a);
      const uniq = times.filter((v, i) => !i || times[i - 1] - v > 120000).slice(0, 6);
      if (!uniq.length) return;
      const lang = hass.locale?.language || "de";
      rings.replaceChildren(h("div", { class: "hp-label" }, icon("mdi:bell-ring-outline"), t("door_rang")),
        h("div", { class: "hp-door-times" }, ...uniq.map((v) => {
          const d = new Date(v);
          const today = new Date().toDateString() === d.toDateString();
          return h("span", {}, today ? clock(hass, d) : `${d.toLocaleDateString(lang, { weekday: "short" })} ${clock(hass, d)}`);
        })));
    }).catch(() => {});
}
