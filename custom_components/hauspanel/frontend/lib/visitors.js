// "Who was there": the last people, cars and animals the outdoor cameras (Frigate) saw, as pictures with
// name or number plate when Frigate knows them, filterable, a tap shows the big picture.
import { h, icon, toggleSwitch } from "./util.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { clock } from "./popkit.js";

const INDOOR = /baby|nursery|kind|technik|wand|tablet|wohn|schlaf|buero|büro|office|flur|hallway|kueche|küche|kitchen/i;
const OUTSIDE = /outdoor|outside|garten|garden|einfahrt|driveway|drive|terrasse|terrace|patio|hof|yard|au(ß|ss)en|pool|carport|strasse|straße|street|eingang|entrance|front/i;
/** A camera inside the house: by its room (and that room's floor) when it has one, else by its name. */
function indoorCam(hass, id) {
  const e = hass.entities?.[id];
  const areaId = e?.area_id || hass.devices?.[e?.device_id]?.area_id;
  const area = areaId && hass.areas?.[areaId];
  if (area) return !OUTSIDE.test(`${area.area_id} ${area.name} ${area.floor_id || ""}`);
  return INDOOR.test(`${id} ${hass.states[id].attributes.camera_name}`);
}
export const LABEL_IC = { person: "mdi:account", car: "mdi:car", dog: "mdi:dog", cat: "mdi:cat", bicycle: "mdi:bicycle", motorcycle: "mdi:motorbike", package: "mdi:package-variant" };

/** Frigate's outdoor cameras: { instance, cameras: [frigate camera names], names: { cam: HA name } }. */
export function frigateOutdoor(hass, { only = null } = {}) {
  const cams = Object.keys(hass.states).filter((id) => id.startsWith("camera.") && hass.states[id].attributes.client_id && hass.states[id].attributes.camera_name);
  // With "only" (the cameras on the Security page): those, indoors or not.
  const outdoor = only ? cams.filter((id) => only.includes(id)) : cams.filter((id) => !indoorCam(hass, id));
  if (!outdoor.length) return null;
  const names = {};
  // Frigate's own camera name may differ from the entity id in case ("Einfahrt" vs einfahrt): ask for both.
  const keys = outdoor.flatMap((id) => {
    const a = hass.states[id].attributes;
    const key = id.split(".")[1].replace(/_frigate$/, "");
    const label = a.friendly_name || a.camera_name || key;
    names[key] = label;
    names[a.camera_name] = label;
    return [...new Set([key, a.camera_name])];
  });
  return { instance: hass.states[outdoor[0]].attributes.client_id, cameras: keys, names };
}

export async function loadVisits(hass, { hours = 24, labels = ["person", "car", "dog", "cat"], limit = 40, only = null } = {}) {
  const f = frigateOutdoor(hass, { only });
  if (!f) return [];
  try {
    const q = { type: "frigate/events/get", instance_id: f.instance, cameras: f.cameras, limit, has_snapshot: true, after: Math.floor(Date.now() / 1000 - hours * 3600) };
    if (labels) q.labels = labels;
    const r = await hass.callWS(q);
    const list = typeof r === "string" ? JSON.parse(r) : r;
    return (list || []).map((e) => ({ ...e, camName: f.names[e.camera] || e.camera, instance: f.instance }));
  } catch { return []; }
}

export const subLabel = (e) => (Array.isArray(e.sub_label) ? e.sub_label[0] : e.sub_label) || e.data?.recognized_license_plate || null;

export function openVisitors(ctx) {
  const hass = ctx.hass;
  let filter = "all";
  let events = [];
  const chips = h("div", { class: "hp-modes hp-pk-chips hp-vis-chips" });
  const FILTERS = [["all", "mdi:eye-outline", "vis_all"], ["person", "mdi:account", "vis_people"], ["car", "mdi:car", "vis_cars"], ["animal", "mdi:paw", "vis_animals"]];
  const chipEls = FILTERS.map(([k, ic, l]) => {
    const b = h("button", { class: "hp-chip" }, icon(ic), h("span", {}, t(l)));
    b.addEventListener("click", () => { filter = k; draw(); });
    chips.append(b);
    return [k, b];
  });
  const big = h("div", { class: "hp-vis-big", hidden: true });
  const grid = h("div", { class: "hp-vis-grid" }, h("div", { class: "hp-muted small" }, t("loading")));
  const sheet = openSheet(ctx, { title: t("vis_title"), subtitle: t("vis_sub"), cls: "appliance visitors" });
  sheet.body.append(chips, big, grid);

  const lang = hass.locale?.language || "de";
  const when = (ts) => {
    const d = new Date(ts * 1000);
    return new Date().toDateString() === d.toDateString() ? clock(hass, d) : `${d.toLocaleDateString(lang, { weekday: "short" })} ${clock(hass, d)}`;
  };
  const showBig = (e) => {
    const img = h("img", { alt: "", src: `/api/frigate/${e.instance}/notifications/${e.id}/snapshot.jpg` });
    const close = h("button", { class: "hp-round ghost small", "aria-label": t("close") }, icon("mdi:close"));
    close.addEventListener("click", () => { big.hidden = true; big.replaceChildren(); });
    big.replaceChildren(img, h("div", { class: "cap" }, icon(LABEL_IC[e.label] || "mdi:eye"), h("b", {}, subLabel(e) || t(`vis_l_${e.label}`) || e.label), h("small", {}, `${e.camName} · ${when(e.start_time)}`)), close);
    big.hidden = false;
    big.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  const draw = () => {
    chipEls.forEach(([k, b]) => b.classList.toggle("active", k === filter));
    const list = events.filter((e) => filter === "all" || (filter === "animal" ? ["dog", "cat"].includes(e.label) : e.label === filter));
    if (!list.length) {
      grid.replaceChildren(h("div", { class: "hp-qempty" }, t("vis_none")));
      return;
    }
    grid.replaceChildren(...list.map((e) => {
      const name = subLabel(e);
      const el = h("button", { class: `hp-vis-item ${e.label} ${name ? "known" : ""}` },
        h("img", { alt: "", loading: "lazy", src: `/api/frigate/${e.instance}/notifications/${e.id}/thumbnail.jpg` }),
        h("span", { class: "tag" }, icon(LABEL_IC[e.label] || "mdi:eye")),
        h("div", { class: "cap" }, h("b", {}, name || t(`vis_l_${e.label}`)), h("small", {}, `${when(e.start_time)} · ${e.camName}`)));
      el.addEventListener("click", () => showBig(e));
      return el;
    }));
  };
  chipEls.forEach(([k, b]) => b.classList.toggle("active", k === filter));
  loadVisits(hass, { hours: 48 }).then((list) => { events = list; draw(); });
}

// Which cameras "Last movements" shows is a choice of each user, kept by Home Assistant with the user
// (frontend user data), so it follows them to every screen and does not change it for the others.
const MOTION_KEY = "hauspanel_motion_cams";
/** The cameras Frigate knows (entity ids). */
export const frigateCams = (hass) => Object.keys(hass.states).filter((id) => id.startsWith("camera.") && hass.states[id].attributes.client_id && hass.states[id].attributes.camera_name);
/** The user's own choice (entity ids), or null: the cameras of the Security page. */
export async function motionCamPref(hass) {
  try {
    const r = await hass.callWS({ type: "frontend/get_user_data", key: MOTION_KEY });
    return Array.isArray(r?.value) ? r.value : null;
  } catch { return null; }
}
const setMotionCamPref = (hass, value) => hass.callWS({ type: "frontend/set_user_data", key: MOTION_KEY, value });

/** Pick the cameras for "Last movements"; only for the signed-in user. onDone runs after a change. */
export async function openMotionCams(ctx, defaults, onDone = () => {}) {
  const hass = ctx.hass;
  const all = frigateCams(hass);
  const saved = await motionCamPref(hass);
  let chosen = new Set(saved ?? defaults.filter((id) => all.includes(id)));
  let changed = false;
  const sheet = openSheet(ctx, { title: t("sec_recent_cams"), subtitle: hass.user?.name || "", cls: "qsheet", onClose: () => { if (changed) onDone(); } });
  const save = () => { changed = true; setMotionCamPref(hass, [...chosen]).catch(() => {}); };
  const list = h("div", { class: "hp-qlist" });
  const draw = () => list.replaceChildren(...all.map((id) => {
    const sw = toggleSwitch(chosen.has(id), () => {
      if (chosen.has(id)) chosen.delete(id); else chosen.add(id);
      sw.update(chosen.has(id));
      row.classList.toggle("off", !chosen.has(id));
      save();
    });
    const st = hass.states[id];
    const row = h("div", { class: `hp-qrow ${chosen.has(id) ? "" : "off"}` }, h("span", { class: "hp-qrow-ic" }, icon("mdi:cctv")),
      h("div", { class: "hp-qrow-text" }, h("b", {}, st?.attributes.friendly_name || id)), sw);
    row.addEventListener("click", () => sw.click());
    return row;
  }));
  draw();
  const reset = h("button", { class: "hp-btn ghost" }, icon("mdi:restore"), h("span", {}, t("sec_recent_reset")));
  reset.addEventListener("click", () => {
    chosen = new Set(defaults.filter((id) => all.includes(id)));
    changed = true;
    hass.callWS({ type: "frontend/set_user_data", key: MOTION_KEY, value: null }).catch(() => {});
    draw();
  });
  sheet.body.append(h("p", { class: "hp-muted small" }, t("sec_recent_cams_hint")),
    all.length ? list : h("div", { class: "hp-qempty" }, t("sec_recent_no_cams")), h("div", { class: "hp-sheet-actions hp-app-foot" }, reset));
}

/**
 * The last few things the cameras saw (any label), as a small picture grid: the cameras the user picked,
 * else those on the Security page. A tap plays the clip big; the camera button picks the cameras.
 */
export function recentMotions(ctx, camIds, { limit = 6 } = {}) {
  const hass = ctx.hass;
  const big = h("div", { class: "hp-vis-big", hidden: true });
  const grid = h("div", { class: "hp-vis-grid hp-sec-recent" }, h("div", { class: "hp-muted small" }, t("loading")));
  const pick = h("button", { class: "hp-round ghost small hp-sec-recent-pick", "aria-label": t("sec_recent_cams"), title: t("sec_recent_cams") }, icon("mdi:cctv"));
  const head = h("div", { class: "hp-label hp-ov-label hp-sec-recent-head" }, h("span", {}, t("sec_recent")), pick);
  const box = h("div", { class: "hp-sec-recent-box" }, head, big, grid);
  const lang = hass.locale?.language || "de";
  const when = (ts) => {
    const d = new Date(ts * 1000);
    return new Date().toDateString() === d.toDateString() ? clock(hass, d) : `${d.toLocaleDateString(lang, { weekday: "short" })} ${clock(hass, d)}`;
  };
  const label = (e) => subLabel(e) || t(`vis_l_${e.label}`) || e.label;
  pick.addEventListener("click", () => openMotionCams(ctx, camIds, () => load()));
  const load = async () => {
    // Without Frigate there are no movements to show: the part stays away.
    if (!frigateCams(hass).length) { box.hidden = true; return; }
    const own = await motionCamPref(hass);
    const only = own ?? camIds;
    big.hidden = true;
    big.replaceChildren();
    const list = only.length ? await loadVisits(hass, { hours: 72, labels: null, limit, only }) : [];
    if (!list.length) { grid.replaceChildren(h("div", { class: "hp-qempty" }, t(only.length ? "sec_recent_none" : "sec_recent_no_pick"))); return; }
    grid.replaceChildren(...list.slice(0, limit).map((e) => {
      // Like Frigate: the short animated preview in the grid (the still picture until it has loaded or if there is none).
      const base = `/api/frigate/${e.instance}/notifications/${e.id}`;
      const img = h("img", { alt: "", loading: "lazy", src: `${base}/thumbnail.jpg` });
      if (e.has_clip) {
        const gif = new Image();
        gif.onload = () => { img.src = gif.src; };
        gif.src = `${base}/event_preview.gif`;
      }
      const el = h("button", { class: `hp-vis-item ${e.label} ${subLabel(e) ? "known" : ""} ${e.has_clip ? "clip" : ""}` },
        img,
        h("span", { class: "tag" }, icon(LABEL_IC[e.label] || "mdi:motion-sensor")),
        h("div", { class: "cap" }, h("b", {}, label(e)), h("small", {}, `${when(e.start_time)} · ${e.camName}`)));
      el.addEventListener("click", () => {
        const close = h("button", { class: "hp-round ghost small", "aria-label": t("close") }, icon("mdi:close"));
        // The clip shown before is let go first.
        big._stop?.();
        let blobUrl = null;
        const stop = () => { if (blobUrl) URL.revokeObjectURL(blobUrl); blobUrl = null; };
        big._stop = stop;
        close.addEventListener("click", (ev) => { ev.stopPropagation(); stop(); big.hidden = true; big.replaceChildren(); });
        // The clip plays big (muted, inline, with controls); without a clip the snapshot.
        // Home Assistant passes Frigate's clip on without a length and without byte ranges, which iPhones need
        // to play an MP4: so the short clip is loaded in full first and played from memory.
        let media;
        let wait = null;
        if (e.has_clip) {
          media = h("video", { poster: `${base}/snapshot.jpg`, muted: true, playsinline: true, controls: true, loop: true, preload: "auto" });
          media.muted = true; media.playsInline = true; media.loop = true; media.controls = true; media.setAttribute("playsinline", "");
          wait = h("span", { class: "hp-vis-wait" }, icon("mdi:loading"));
          big.classList.add("loading");
          fetch(`${base}/clip.mp4`).then((r) => (r.ok ? r.blob() : Promise.reject(r.status))).then((b) => {
            if (!media.isConnected) return;
            stop();
            blobUrl = URL.createObjectURL(b.type ? b : new Blob([b], { type: "video/mp4" }));
            media.src = blobUrl;
            media.play?.().catch(() => {});
          }).catch(() => {
            // No clip yet (the event may still be running): the snapshot instead.
            if (media.isConnected) media.replaceWith(h("img", { alt: "", src: `${base}/snapshot.jpg` }));
          }).finally(() => { big.classList.remove("loading"); wait.remove(); });
        } else media = h("img", { alt: "", src: `${base}/snapshot.jpg` });
        // Full screen: the iPhone only lets the video itself go full screen; elsewhere the whole picture with its caption.
        const full = h("button", { class: "hp-round ghost small full", "aria-label": t("fullscreen"), title: t("fullscreen") }, icon("mdi:fullscreen"));
        // A still picture on an iPhone can't go full screen at all: no button then.
        if (!e.has_clip && !big.requestFullscreen) full.hidden = true;
        full.addEventListener("click", (ev) => {
          ev.stopPropagation();
          const m = big.querySelector("video, img");
          if (document.fullscreenElement) return document.exitFullscreen?.();
          if (m?.tagName === "VIDEO" && m.webkitEnterFullscreen && !big.requestFullscreen) return m.webkitEnterFullscreen();
          (big.requestFullscreen?.() || Promise.reject()).catch(() => m?.webkitEnterFullscreen?.());
        });
        big.replaceChildren(media, ...(wait ? [wait] : []),
          h("div", { class: "cap" }, icon(LABEL_IC[e.label] || "mdi:motion-sensor"), h("b", {}, label(e)), h("small", {}, `${e.camName} · ${when(e.start_time)}`)), full, close);
        big.hidden = false;
        big.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      return el;
    }));
  };
  load();
  return box;
}
