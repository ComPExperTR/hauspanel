// Camera popup with the live stream, plus snapshot refresh for camera tiles.
import { h, icon, entityName } from "./util.js";
import { openSheet } from "./dialogs.js";
import { openMoreInfo } from "./domains.js";
import { t } from "./i18n.js";

const SNAPSHOT_EVERY = 10000;

/** Snapshot URL with a cache buster, so the picture actually changes. */
export function snapshotUrl(st) {
  const pic = st?.attributes.entity_picture;
  if (!pic) return "";
  return `${pic}${pic.includes("?") ? "&" : "?"}_=${Math.floor(Date.now() / SNAPSHOT_EVERY)}`;
}

/** Keeps a background picture fresh while the element is on screen; loads first, then swaps (no flicker). */
export function keepSnapshot(el, art, getState) {
  let shown = "";
  let seen = false;
  let misses = 0;
  const load = () => {
    if (document.hidden) return;
    const url = snapshotUrl(getState());
    if (!url || url === shown) return;
    const img = new Image();
    img.onload = () => {
      shown = url;
      art.style.backgroundImage = `url("${url}")`;
      el.classList.add("has-art");
    };
    img.src = url;
  };
  // First picture as soon as the tile is on the page.
  const first = () => {
    if (el.isConnected) {
      seen = true;
      load();
    } else if (++misses < 20) setTimeout(first, 150);
  };
  first();
  const timer = setInterval(() => {
    if (el.isConnected) {
      seen = true;
      load();
    } else if (seen || ++misses > 40) clearInterval(timer); // gone, or never shown
  }, SNAPSHOT_EVERY);
  return load;
}

/** Home Assistant's own stream player (WebRTC, HLS or MJPEG, whatever the camera offers). */
export async function streamElement() {
  if (!customElements.get("ha-camera-stream")) {
    try {
      // Building a picture card makes HA load its camera player.
      const helpers = await window.loadCardHelpers?.();
      helpers?.createCardElement({ type: "picture-entity", entity: "camera.none", camera_view: "live" });
      await Promise.race([customElements.whenDefined("ha-camera-stream"), new Promise((r) => setTimeout(r, 4000))]);
    } catch {
      /* fall back to snapshots */
    }
  }
  return customElements.get("ha-camera-stream") ? document.createElement("ha-camera-stream") : null;
}

// Cameras whose normal stream gave no picture here (for example WebRTC through a tunnel): next time straight to MJPEG.
const NEEDS_MJPEG = new Set();
const WATCHDOG_MS = 6000;

export function findMedia(root) {
  if (!root) return null;
  for (const e of root.querySelectorAll("*")) {
    if (e.tagName === "VIDEO" || e.tagName === "IMG") return e;
    if (e.shadowRoot) {
      const x = findMedia(e.shadowRoot);
      if (x) return x;
    }
  }
  return null;
}

const hasPicture = (m) => !!m && (m.tagName === "VIDEO" ? m.readyState >= 2 && m.videoWidth > 0 : m.naturalWidth > 0);

/** A moving picture that keeps working: HA's player first, MJPEG when that shows nothing. */
export function liveVideo(ctx, entityId, { controls = false } = {}) {
  const wrap = h("div", { class: "hp-live-wrap" });
  let player = null;
  let mjpeg = null;
  let watchdog = null;

  const startMjpeg = () => {
    NEEDS_MJPEG.add(entityId);
    player?.remove();
    player = null;
    const st = ctx.hass.states[entityId];
    const token = st?.attributes.access_token;
    if (!token) return;
    mjpeg = h("img", { class: "hp-cam-live", alt: "" });
    mjpeg.onerror = () => {
      // The token rotates every few minutes; reconnect with the current one.
      setTimeout(() => {
        if (!mjpeg?.isConnected) return;
        const t2 = ctx.hass.states[entityId]?.attributes.access_token;
        if (t2) mjpeg.src = `/api/camera_proxy_stream/${entityId}?token=${t2}&_=${Date.now()}`;
      }, 3000);
    };
    mjpeg.src = `/api/camera_proxy_stream/${entityId}?token=${token}`;
    wrap.append(mjpeg);
  };

  const start = async () => {
    const st = ctx.hass.states[entityId];
    if (!st || st.state === "unavailable") return;
    if (NEEDS_MJPEG.has(entityId)) return startMjpeg();
    const el = await streamElement();
    if (!el) return startMjpeg();
    player = el;
    el.hass = ctx.hass;
    el.stateObj = st;
    el.controls = controls;
    el.muted = true;
    el.classList.add("hp-cam-live");
    wrap.append(el);
    // WebRTC either connects quickly or not at all; HLS (often 4K) can take a while to start.
    const check = (round) => {
      if (!wrap.isConnected || !player) return;
      if (hasPicture(findMedia(player.shadowRoot))) return;
      const hls = !!player.shadowRoot?.querySelector("ha-hls-player");
      if (hls && round < 3) watchdog = setTimeout(() => check(round + 1), WATCHDOG_MS);
      else startMjpeg();
    };
    watchdog = setTimeout(() => check(1), WATCHDOG_MS);
  };
  wrap.update = (hass) => {
    if (!player) return;
    player.hass = hass;
    const st = hass.states[entityId];
    if (st && player.stateObj !== st) player.stateObj = st;
  };
  wrap.stop = () => {
    clearTimeout(watchdog);
    if (mjpeg) mjpeg.src = "";
    wrap.replaceChildren();
    player = null;
    mjpeg = null;
  };
  // Leaving the page drops the element; close its stream then (an MJPEG picture keeps loading otherwise).
  // It also marks the picture as "playing" while frames really arrive, so a Live badge can tell the truth.
  let seen = false;
  let lastFrame = 0;
  let lastTime = -1;
  const guard = setInterval(() => {
    const media = mjpeg || findMedia(player?.shadowRoot);
    let ok = hasPicture(media);
    if (ok && media?.tagName === "VIDEO") {
      // A video only counts while its time moves on (a frozen stream keeps its last picture).
      if (media.currentTime !== lastTime) { lastTime = media.currentTime; lastFrame = Date.now(); }
      ok = !media.paused && Date.now() - lastFrame < 4000;
    }
    wrap.classList.toggle("playing", ok);
    if (wrap.isConnected) seen = true;
    else if (seen) {
      clearInterval(guard);
      wrap.stop();
    }
  }, 1000);
  start();
  return wrap;
}

export function openCamera(ctx, entityId) {
  const hass = ctx.hass;
  if (!hass.states[entityId]) return;
  const visible = () => {
    const all = ctx.securityItems ? ctx.securityItems() : ctx.model.security;
    const cams = all.filter((id) => id.startsWith("camera.") && ctx.hass.states[id]);
    return cams.includes(entityId) ? cams : [entityId, ...cams];
  };
  let current = entityId;
  const areaName = (id) => ctx.model.areaById.get(ctx.model.areaOf[id])?.name;

  const view = h("div", { class: "hp-cam-view" });
  const full = h("button", { class: "hp-round ghost", "aria-label": t("fullscreen"), title: t("fullscreen") }, icon("mdi:fullscreen"));
  const sheet = openSheet(ctx, { title: "", subtitle: "", cls: "camera", actions: full });
  full.addEventListener("click", () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else view.requestFullscreen?.().catch(() => {});
  });
  const picks = h("div", { class: "hp-cam-picks" });
  const more = h("button", { class: "hp-btn ghost" }, icon("mdi:dots-horizontal"), t("more_in_ha"));
  more.addEventListener("click", () => {
    sheet.close();
    openMoreInfo(ctx.root, current);
  });
  sheet.body.append(view, picks, h("div", { class: "hp-sheet-actions" }, more));

  let player = null;
  let snapTimer = null;
  const show = async (id) => {
    current = id;
    const st = ctx.hass.states[id];
    sheet.head.querySelector(".hp-sheet-title").textContent = entityName(ctx.hass, id, areaName(id));
    sheet.head.querySelector(".hp-sheet-sub")?.remove();
    const sub = areaName(id);
    if (sub) sheet.head.querySelector(".hp-sheet-titles").append(h("div", { class: "hp-sheet-sub" }, sub));
    clearInterval(snapTimer);
    view.replaceChildren(h("div", { class: "hp-cam-loading" }, icon("mdi:cctv"), t("loading")));
    // A still picture right away, the live stream on top as soon as it runs.
    const still = h("img", { class: "hp-cam-still", alt: "" });
    const url = snapshotUrl(st);
    if (url) still.src = url;
    still.onload = () => view.querySelector(".hp-cam-loading")?.remove();
    view.append(still);
    snapTimer = setInterval(() => {
      const u = snapshotUrl(ctx.hass.states[current]);
      if (u && u !== still.src) still.src = u;
    }, SNAPSHOT_EVERY);

    player?.stop();
    player = null;
    if (st && st.state !== "unavailable") {
      player = liveVideo(ctx, id, { controls: true });
      view.append(player);
    } else if (st?.state === "unavailable") {
      view.append(h("div", { class: "hp-cam-loading" }, icon("mdi:cctv-off"), t("unavailable")));
    }
    picks.querySelectorAll(".hp-chip").forEach((b) => b.classList.toggle("active", b.dataset.id === id));
  };

  const cams = visible();
  if (cams.length > 1) {
    for (const id of cams) {
      const b = h("button", { class: "hp-chip", dataset: { id } }, icon("mdi:cctv"), entityName(ctx.hass, id, areaName(id)));
      b.addEventListener("click", () => show(id));
      picks.append(b);
    }
  }

  sheet.updaters.push((hs) => {
    player?.update(hs);
  });
  const close = sheet.close;
  sheet.close = () => {
    clearInterval(snapTimer);
    player?.stop();
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    view.replaceChildren();
    close();
  };
  show(entityId);
}

/** Security page: a tap on a camera opens its live picture over the whole screen. Swipe or arrows for the next camera. */
export function openCameraFull(ctx, entityId, list = [entityId], { title: heading = "", subtitle = "", actions = [], limit = 10 * 60 * 1000, cls = "" } = {}) {
  if (!ctx.hass.states[entityId]) return;
  const cams = list.includes(entityId) ? list : [entityId, ...list];
  let idx = cams.indexOf(entityId);
  const areaName = (id) => ctx.model.areaById.get(ctx.model.areaOf[id])?.name;
  const stage = h("div", { class: "hp-camfull-stage" });
  const title = h("div", { class: "hp-camfull-name" });
  const closeBtn = h("button", { class: "hp-round", "aria-label": t("cam_close"), title: t("cam_close") }, icon("mdi:close"));
  const prev = h("button", { class: "hp-round hp-camfull-nav prev", "aria-label": "‹" }, icon("mdi:chevron-left"));
  const next = h("button", { class: "hp-round hp-camfull-nav next", "aria-label": "›" }, icon("mdi:chevron-right"));
  const root = h("div", { class: `hp-camfull ${cls}`, role: "dialog", "aria-modal": "true", tabindex: "-1" },
    stage, h("div", { class: "hp-camfull-bar" }, h("i", { class: "hp-live-dot" }), heading ? h("div", { class: "hp-camfull-heading" }, h("b", {}, heading), title) : title, closeBtn),
    actions.length ? h("div", { class: "hp-camfull-actions" }, actions) : null,
    cams.length > 1 ? prev : null, cams.length > 1 ? next : null);

  let player = null;
  let snapTimer = null;
  let idle = null;
  const show = (i) => {
    idx = (i + cams.length) % cams.length;
    const id = cams[idx];
    const st = ctx.hass.states[id];
    title.textContent = subtitle || entityName(ctx.hass, id, areaName(id));
    player?.stop();
    player = null;
    clearInterval(snapTimer);
    const still = h("img", { class: "hp-cam-still", alt: "" });
    const url = snapshotUrl(st);
    if (url) still.src = url;
    stage.replaceChildren(still);
    snapTimer = setInterval(() => {
      const u = snapshotUrl(ctx.hass.states[id]);
      if (u && u !== still.src) still.src = u;
    }, SNAPSHOT_EVERY);
    if (st && st.state !== "unavailable") {
      const p = liveVideo(ctx, id);
      player = p;
      stage.append(p);
      // HA's player puts its picture at the top; centre it like the still underneath.
      let tries = 0;
      const fit = setInterval(() => {
        const m = findMedia(p) || findMedia(p.shadowRoot);
        if (m) Object.assign(m.style, { objectFit: "contain", width: "100%", height: "100%" });
        if (player !== p || ++tries > 20) clearInterval(fit);
      }, 500);
    }
  };
  // Controls fade out after a few seconds; any touch brings them back.
  const wake = () => {
    root.classList.remove("calm");
    clearTimeout(idle);
    idle = setTimeout(() => root.classList.add("calm"), 4000);
  };
  const api = {
    update(hass) { player?.update(hass); },
    close() {
      clearInterval(snapTimer);
      clearTimeout(idle);
      clearTimeout(api._limit);
      player?.stop();
      ctx.sheets.delete(api);
      document.removeEventListener("keydown", onKey, true);
      root.classList.remove("open");
      setTimeout(() => root.remove(), 200);
    },
  };
  const onKey = (e) => {
    if (e.key === "Escape") api.close();
    else if (e.key === "ArrowRight") show(idx + 1);
    else if (e.key === "ArrowLeft") show(idx - 1);
    else return;
    e.stopPropagation();
  };
  closeBtn.addEventListener("click", (e) => { e.stopPropagation(); api.close(); });
  prev.addEventListener("click", (e) => { e.stopPropagation(); show(idx - 1); wake(); });
  next.addEventListener("click", (e) => { e.stopPropagation(); show(idx + 1); wake(); });
  let sx = null;
  root.addEventListener("pointerdown", (e) => { sx = e.clientX; wake(); });
  root.addEventListener("pointerup", (e) => {
    if (sx === null || e.target.closest(".hp-camfull-actions")) return;
    const dx = e.clientX - sx;
    sx = null;
    if (Math.abs(dx) > 60 && cams.length > 1) show(idx + (dx < 0 ? 1 : -1));
  });
  document.addEventListener("keydown", onKey, true);
  ctx.layer.append(root);
  ctx.sheets.add(api);
  // A live stream left open on a wall tablet would run all day: close after 10 minutes (doorbell: 2).
  api._limit = setTimeout(() => api.close(), limit);
  show(idx);
  wake();
  requestAnimationFrame(() => root.classList.add("open"));
  return api;
}
