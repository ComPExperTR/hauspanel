// "Who was there": the last people, cars and animals the outdoor cameras (Frigate) saw, as pictures with
// name or number plate when Frigate knows them, filterable, a tap shows the big picture.
import { h, icon } from "./util.js";
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

/**
 * The last few things the cameras on the Security page saw (any label), as a small picture grid.
 * A tap shows the snapshot big; "All" opens "Who was there".
 */
export function recentMotions(ctx, camIds, { limit = 6 } = {}) {
  const hass = ctx.hass;
  const big = h("div", { class: "hp-vis-big", hidden: true });
  const grid = h("div", { class: "hp-vis-grid hp-sec-recent" }, h("div", { class: "hp-muted small" }, t("loading")));
  const head = h("div", { class: "hp-label hp-ov-label" }, h("span", {}, t("sec_recent")));
  const box = h("div", { class: "hp-sec-recent-box" }, head, big, grid);
  const lang = hass.locale?.language || "de";
  const when = (ts) => {
    const d = new Date(ts * 1000);
    return new Date().toDateString() === d.toDateString() ? clock(hass, d) : `${d.toLocaleDateString(lang, { weekday: "short" })} ${clock(hass, d)}`;
  };
  const label = (e) => subLabel(e) || t(`vis_l_${e.label}`) || e.label;
  loadVisits(hass, { hours: 72, labels: null, limit, only: camIds }).then((list) => {
    if (!list.length) { box.hidden = true; return; }
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
        close.addEventListener("click", (ev) => { ev.stopPropagation(); big.hidden = true; big.replaceChildren(); });
        // The clip plays big (muted, inline, with controls); without a clip the snapshot.
        const media = e.has_clip
          ? h("video", { src: `${base}/clip.mp4`, poster: `${base}/snapshot.jpg`, autoplay: true, muted: true, playsinline: true, controls: true, loop: true, preload: "auto" })
          : h("img", { alt: "", src: `${base}/snapshot.jpg` });
        if (media.tagName === "VIDEO") { media.muted = true; media.playsInline = true; media.autoplay = true; media.loop = true; media.controls = true; media.setAttribute("playsinline", ""); }
        big.replaceChildren(media,
          h("div", { class: "cap" }, icon(LABEL_IC[e.label] || "mdi:motion-sensor"), h("b", {}, label(e)), h("small", {}, `${e.camName} · ${when(e.start_time)}`)), close);
        big.hidden = false;
        big.scrollIntoView({ block: "nearest", behavior: "smooth" });
      });
      return el;
    }));
  });
  return box;
}
