// Baby monitor: the baby camera live without a time limit, a dimmed night view, room temperature and humidity,
// and a strip of the last three hours showing when there was movement.
import { h, icon, domainOf } from "./util.js";
import { openSheet } from "./dialogs.js";
import { liveVideo, openCameraFull } from "./camera.js";
import { t } from "./i18n.js";
import { num, stat, btn, since, clock, fmt } from "./popkit.js";

/** The baby camera: chosen in Settings → Rooms & devices, else a camera with "baby" in its name; "" = off. */
export function babyCamera(ctx) {
  const set = ctx.settings?.s.baby?.camera;
  if (set === "") return null;
  if (set && ctx.hass.states[set]) return set;
  return Object.keys(ctx.hass.states).find((id) => id.startsWith("camera.") && /baby/i.test(id) && ctx.hass.states[id].state !== "unavailable") || null;
}
export const isBabyCam = (ctx, id) => !!id && id === babyCamera(ctx);

/** Motion of the baby camera: its own device's motion sensor, else one named like the camera. */
export function babyMotion(hass, cam) {
  // Several cameras can watch the same room (Frigate and the camera's own app): take the one that reports most recently.
  const dev = hass.entities?.[cam]?.device_id;
  const base = cam.split(".")[1].replace(/_(frigate|hochauflosung|standardauflosung|high|low|main|sub)$/, "");
  const re = /_(motion|bewegung)(_\d+)?$/;
  const cands = Object.keys(hass.states).filter((id) => id.startsWith("binary_sensor.") && re.test(id) && hass.states[id].state !== "unavailable"
    && (hass.entities?.[id]?.device_id === dev || id.startsWith(`binary_sensor.${base}_`)));
  return cands.sort((x, y) => Date.parse(hass.states[y].last_changed) - Date.parse(hass.states[x].last_changed))[0] || null;
}

/** The child's room: the camera's own area, else a room named like a child's room that has a camera. */
/** A crying sensor (Reolink "baby crying") of the camera, by device or by name. */
export function babyCry(hass, cam) {
  const base = cam.split(".")[1].replace(/_(frigate|hochauflosung|standardauflosung|high|low|main|sub)$/, "");
  return Object.keys(hass.states).find((id) => id.startsWith("binary_sensor.") && /babyschrei|baby_cry|crying|weinen/i.test(id)
    && (hass.entities?.[id]?.device_id === hass.entities?.[cam]?.device_id || id.startsWith(`binary_sensor.${base}_`))) || null;
}

export function babyAreaOf(ctx, cam) {
  const chosen = ctx.settings?.s.baby?.area;
  if (chosen && ctx.model.areaById.get(chosen)) return chosen;
  const own = ctx.model.areaOf[cam];
  if (own && own !== "_other") return own;
  const rooms = ctx.model.areas.filter((a) => /kind|child|baby|nursery/i.test(`${a.id} ${a.name}`));
  return (rooms.find((a) => Object.keys(ctx.hass.states).some((id) => id.startsWith("camera.") && ctx.model.areaOf[id] === a.id)) || rooms[0])?.id || null;
}

export function openBaby(ctx, cam) {
  const hass = ctx.hass;
  const dev = hass.entities?.[cam]?.device_id;
  const devEnts = Object.values(hass.entities || {}).filter((e) => e.device_id === dev).map((e) => e.entity_id);
  const motion = babyMotion(hass, cam);
  const person = devEnts.find((id) => /^binary_sensor\..*_person_occupancy$/.test(id));
  const areaId = babyAreaOf(ctx, cam);
  const area = ctx.model.areaById.get(areaId);
  const inRoom = (cls) => Object.keys(hass.states).filter((id) => domainOf(id) === "sensor" && hass.states[id].attributes.device_class === cls && ctx.model.areaOf[id] === areaId);
  const temps = inRoom("temperature");
  const hums = inRoom("humidity");

  const media = h("div", { class: "hp-pr-media live hp-baby-media" }, h("span", { class: "hp-pr-badge" }, h("i"), t("live")));
  const video = liveVideo(ctx, cam);
  media.prepend(video);
  const sTemp = stat("mdi:thermometer", t("baby_temp"));
  const sHum = stat("mdi:water-percent", t("th_humidity"));
  const sMove = stat("mdi:motion-sensor", t("baby_motion"));
  const cry = babyCry(hass, cam);
  const sCry = stat("mdi:emoticon-cry-outline", t("baby_cry"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sTemp, sHum, sMove, ...(cry ? [sCry] : []));
  const strip = h("div", { class: "hp-baby-strip" });
  const stripBox = h("div", { class: "hp-app-chart" }, h("div", { class: "hp-app-chart-head" }, h("small", {}, t("baby_3h")), h("small", { class: "max" })), strip,
    h("div", { class: "hp-baby-axis" }), h("div", { class: "hp-baby-times" }));

  const sheet = openSheet(ctx, { title: t("baby_title"), subtitle: area?.name, cls: "appliance baby", onClose: () => video.stop() });
  // Night view only when switched on here.
  let night = false;
  const dim = btn("mdi:weather-night", t("baby_night"));
  dim.addEventListener("click", () => { night = !night; paintNight(); });
  const full = btn("mdi:fullscreen", t("fullscreen"));
  // The panel's own full-screen view (the browser's full screen does not work on the iPhone), without a time limit.
  full.addEventListener("click", () => openCameraFull(ctx, cam, [cam], { title: t("baby_title"), subtitle: area?.name || "", limit: 12 * 3600e3, cls: night ? "baby-night" : "" }));
  const paintNight = () => {
    sheet.el.classList.toggle("night", night);
    dim.classList.toggle("lit", night);
  };
  paintNight();
  sheet.body.append(media, stats, stripBox, h("div", { class: "hp-sheet-actions hp-app-foot" }, dim, full));

  const avg = (hs, ids) => {
    const v = ids.map((id) => num(hs, id)).filter((x) => x != null && x > -20 && x < 60);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  };
  const update = (hs) => {
    video.update(hs);
    const tv = avg(hs, temps);
    sTemp.set(tv != null ? `${fmt(hs, tv, 1)}°` : "–");
    sTemp.classList.toggle("warn", tv != null && (tv < 18 || tv > 22));
    const hv = avg(hs, hums);
    sHum.set(hv != null ? `${Math.round(hv)} %` : "–");
    const m = hs.states[motion];
    const now = m?.state === "on" || hs.states[person]?.state === "on";
    sMove.set(now ? t("baby_moving") : m ? since(m.last_changed) : "–");
    sMove.querySelector("small").textContent = now ? t("baby_motion") : t("baby_still_label");
    sMove.classList.toggle("warn", now);
    if (cry) {
      const c = hs.states[cry];
      const crying = c?.state === "on";
      sCry.set(crying ? t("baby_crying") : c ? since(c.last_changed) : "–");
      sCry.querySelector("small").textContent = crying ? t("baby_cry") : t("baby_quiet_label");
      sCry.classList.toggle("warn", crying);
      media.classList.toggle("crying", crying);
    }
  };
  update(hass);
  sheet.updaters.push(update);

  // Movement in the last 3 hours as bars (one per 5 minutes).
  if (motion) {
    const from = Date.now() - 3 * 3600e3;
    hass.callWS({ type: "history/history_during_period", start_time: new Date(from).toISOString(), entity_ids: [motion], minimal_response: true, no_attributes: true, significant_changes_only: false })
      .then((r) => {
        const rows = r[motion] || [];
        const bins = new Array(36).fill(0);
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].s !== "on") continue;
          const a = Math.max(from, (rows[i].lu ?? rows[i].lc) * 1000);
          const b = rows[i + 1] ? (rows[i + 1].lu ?? rows[i + 1].lc) * 1000 : Date.now();
          for (let tm = a; tm < b; tm += 60000) bins[Math.min(35, Math.floor((tm - from) / 300000))] += 1;
        }
        strip.replaceChildren(...bins.map((v, i) => h("i", { style: { height: `${v ? Math.max(35, Math.min(100, v * 25)) : 6}%` }, class: v ? "on" : "",
          title: clock(hass, new Date(from + i * 300000)) })));
        // Full hours under the bars, and the times movement started as readable chips.
        const axis = stripBox.querySelector(".hp-baby-axis");
        const ticks = [];
        const first = new Date(from);
        first.setMinutes(0, 0, 0);
        for (let tm = first.getTime() + 3600e3; tm < Date.now() - 40 * 60000; tm += 3600e3) {
          ticks.push(h("small", { style: { left: `${((tm - from) / (Date.now() - from)) * 100}%` } }, clock(hass, new Date(tm))));
        }
        axis.replaceChildren(...ticks, h("small", { class: "now" }, t("baby_now")));
        const starts = [];
        for (let i = 0; i < rows.length; i++) {
          if (rows[i].s !== "on") continue;
          const tm = (rows[i].lu ?? rows[i].lc) * 1000;
          if (tm >= from && (!starts.length || starts[starts.length - 1] - tm > 120000 || tm - starts[starts.length - 1] > 120000)) starts.push(tm);
        }
        const recent = starts.sort((a, b) => b - a).slice(0, 6);
        stripBox.querySelector(".hp-baby-times").replaceChildren(...(recent.length ? [h("small", { class: "lbl" }, t("baby_moved_at")),
          ...recent.map((tm) => h("span", {}, clock(hass, new Date(tm))))] : []));
        stripBox.querySelector(".max").textContent = t("baby_n_moves", { n: rows.filter((x) => x.s === "on").length });
      }).catch(() => {});
  } else stripBox.hidden = true;
}
