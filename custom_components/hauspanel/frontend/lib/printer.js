// The 3D printer popup (Bambu Lab and alike): small live view, progress ring with time left,
// layers, temperatures, filament, chamber light, pause/resume/stop with a second tap.
import { h, icon, formatTime } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { liveVideo } from "./camera.js";
import { t } from "./i18n.js";
import { usageBlock, plugEntityFor } from "./usage.js";

const SLOTS = [
  ["status", "sensor", /_(druckstatus|print_status)$/],
  ["stage", "sensor", /_(aktueller_arbeitsschritt|current_stage)$/],
  ["progress", "sensor", /_(druckfortschritt|print_progress)$/],
  ["remaining", "sensor", /_(verbleibende_zeit|remaining_time)$/],
  ["end", "sensor", /_(endzeit|end_time)$/],
  ["start", "sensor", /_(startzeit|start_time)$/],
  ["layer", "sensor", /_(aktuelle_schicht|current_layer)$/],
  ["layers", "sensor", /_(gesamtzahl_der_schichten|total_layer_count)$/],
  ["job", "sensor", /_(name_der_aufgabe|task_name)$/],
  ["printer", "sensor", /_(name_des_druckers|printer_name)$/],
  ["nozzle", "sensor", /_(temperatur_der_duse|nozzle_temperature)$/],
  ["nozzleT", "sensor", /_(zieltemperatur_der_duse|nozzle_target_temperature)$/],
  ["bed", "sensor", /_(druckbetttemperatur|bed_temperature)$/],
  ["bedT", "sensor", /_(zieltemperatur_vom_druckbett|bed_target_temperature)$/],
  ["weight", "sensor", /_(gewicht_des_drucks|print_weight)$/],
  ["length", "sensor", /_(drucklange|print_length)$/],
  ["tray", "sensor", /_(aktiver_slot|active_tray)$/],
  ["speed", "select", /_(druckgeschwindigkeit|printing_speed)$/],
  ["light", "light", /_(druckraumbeleuchtung|chamber_light)$/],
  ["camera", "camera", /./],
  ["cover", "image", /_(titelbild|cover_image)$/],
  ["pause", "button", /_(druckvorgang_anhalten|pause)$/],
  ["resume", "button", /_(druckvorgang_fortsetzen|resume)$/],
  ["stop", "button", /_(druckvorgang_beenden|stop)$/],
  ["hms", "binary_sensor", /_(hms_fehler|hms_errors)$/],
  ["error", "binary_sensor", /_(druckfehler|print_error)$/],
];
const ACTIVE = new Set(["running", "pause", "prepare", "slicing", "init"]);

/** Printer devices: a device with a print status sensor. Returns its slots, or null. */
export function printerOf(hass, dev) {
  if (!dev) return null;
  const out = { dev };
  const ents = Object.values(hass.entities).filter((e) => e.device_id === dev);
  for (const [slot, domain, re] of SLOTS) {
    const e = ents.find((x) => x.entity_id.startsWith(`${domain}.`) && re.test(x.entity_id) && !x.disabled_by);
    if (e) out[slot] = e.entity_id;
  }
  if (!out.status || !out.progress) return null;
  // Filament slots live on the AMS, a device of its own behind the printer.
  out.ams = Object.values(hass.devices || {}).filter((d) => d.via_device_id === dev)
    .flatMap((d) => Object.values(hass.entities).filter((e) => e.device_id === d.id && /_slot_\d+$/.test(e.entity_id)).map((e) => e.entity_id))
    .sort();
  return out;
}

/** The printer an entity (its chamber light, say) belongs to. */
export function printerForEntity(hass, entityId) {
  return printerOf(hass, hass.entities?.[entityId]?.device_id);
}

/** Every printer in the house that prints right now. */
export function runningPrinters(hass, { all = false } = {}) {
  const devs = new Set(Object.values(hass.entities || {}).filter((e) => /_(druckstatus|print_status)$/.test(e.entity_id) && e.device_id).map((e) => e.device_id));
  return [...devs].map((d) => printerOf(hass, d)).filter((p) => p && (all || ACTIVE.has(hass.states[p.status]?.state)));
}

const num = (hass, id) => {
  const v = Number(hass.states[id]?.state);
  return id && Number.isFinite(v) ? v : null;
};
const leftMin = (hass, p) => {
  const v = num(hass, p.remaining);
  if (v != null) {
    const u = hass.states[p.remaining].attributes.unit_of_measurement;
    return u === "h" ? v * 60 : u === "s" ? v / 60 : v;
  }
  const e = (Date.parse(hass.states[p.end]?.state) - Date.now()) / 60000;
  return Number.isFinite(e) ? e : null;
};
const fmtLeft = (m) => (m >= 60 ? `${Math.floor(m / 60)}:${String(Math.round(m % 60)).padStart(2, "0")} h` : `${Math.max(1, Math.round(m))} min`);
const fmtState = (hass, id) => {
  const st = hass.states[id];
  if (!st) return "";
  try { return hass.formatEntityState ? hass.formatEntityState(st) : st.state; } catch { return st.state; }
};

export function printerName(hass, p) {
  const d = hass.devices?.[p.dev];
  return d?.name_by_user || hass.states[p.printer]?.state || d?.model || d?.name || "3D printer";
}

/** "15 % · 1:25 h left" while printing. */
export function printerText(hass, p) {
  const s = hass.states[p.status]?.state;
  if (!ACTIVE.has(s)) return null;
  const parts = [s === "pause" ? t("paused") : s === "running" ? `${Math.round(num(hass, p.progress) || 0)} %` : t("printer_preparing")];
  const m = leftMin(hass, p);
  if (s === "running" && m > 0) parts.push(t("left_n", { n: fmtLeft(m) }));
  return parts.join(" · ");
}

const SVGNS = "http://www.w3.org/2000/svg";

export function openPrinter(ctx, p) {
  const hass = ctx.hass;
  const area = ctx.model.areaById.get(ctx.model.areaOf[p.status] || hass.devices?.[p.dev]?.area_id)?.name;

  // Live view on top; the model's picture while nothing prints or the camera is off.
  const media = h("div", { class: "hp-pr-media" });
  let live = null;
  const cover = p.cover ? h("img", { class: "hp-pr-cover", alt: "" }) : null;
  const badge = h("div", { class: "hp-pr-badge" }, h("i"), t("live"));
  media.append(...[cover, badge].filter(Boolean));
  media.addEventListener("click", () => p.camera && ctx.openCamera(p.camera));

  // Progress ring with the percentage; time left and end time beside it.
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("class", "hp-app-ring");
  const circle = (cls) => {
    const c = document.createElementNS(SVGNS, "circle");
    for (const [k, v] of [["cx", 60], ["cy", 60], ["r", 54], ["pathLength", 100], ["class", cls]]) c.setAttribute(k, v);
    svg.append(c);
    return c;
  };
  circle("track");
  const bar = circle("bar");
  const pct = h("b");
  const dial = h("div", { class: "hp-pr-dial" }, svg, h("div", { class: "hp-app-center" }, pct, h("small", {}, t("printed"))));
  const status = h("span", { class: "hp-app-status" });
  const job = h("div", { class: "hp-app-prog" });
  const left = h("div", { class: "hp-pr-left" });
  const eta = h("div", { class: "hp-app-eta" });
  const hero = h("div", { class: "hp-pr-hero" }, dial, h("div", { class: "hp-app-info" }, status, job, left, eta));

  const stat = (ic, label) => {
    const v = h("b");
    const el = h("div", { class: "hp-app-stat" }, icon(ic), h("div", {}, v, h("small", {}, label)));
    el.v = v;
    return el;
  };
  const sLayer = stat("mdi:layers-triple-outline", t("printer_layer"));
  const sNoz = stat("mdi:printer-3d-nozzle-heat-outline", t("printer_nozzle"));
  const sBed = stat("mdi:radiator", t("printer_bed"));
  const sMat = stat("mdi:weight-gram", t("printer_material"));
  const stats = h("div", { class: "hp-app-stats hp-pr-stats" }, sLayer, sNoz, sBed, sMat);

  // Filament: the AMS slots as colour dots, the one in use ringed.
  const fil = h("div", { class: "hp-pr-fil" });
  const hints = h("div", { class: "hp-app-hints" });

  // Controls: light toggles; pause/resume and stop need a second tap.
  const lightBtn = p.light ? h("button", { class: "hp-btn ghost" }) : null;
  lightBtn?.addEventListener("click", () => ctx.hass.callService("light", "toggle", { entity_id: p.light }));
  const armed = new Map();
  const confirmBtn = (key, ic, label, run) => {
    const b = h("button", { class: `hp-btn ${key === "stop" ? "danger" : "ghost"}` }, icon(ic), h("span", {}, label));
    b.addEventListener("click", () => {
      if (armed.get(key)) {
        clearTimeout(armed.get(key));
        armed.delete(key);
        b.classList.remove("armed");
        b.querySelector("span").textContent = label;
        run();
        return;
      }
      b.classList.add("armed");
      b.querySelector("span").textContent = t("sec_confirm");
      armed.set(key, setTimeout(() => {
        armed.delete(key);
        b.classList.remove("armed");
        b.querySelector("span").textContent = label;
      }, 4000));
    });
    return b;
  };
  const press = (id) => id && ctx.hass.callService("button", "press", { entity_id: id });
  const pauseBtn = p.pause ? confirmBtn("pause", "mdi:pause", t("printer_pause"), () => press(p.pause)) : null;
  const resumeBtn = p.resume ? confirmBtn("resume", "mdi:play", t("printer_resume"), () => press(p.resume)) : null;
  const stopBtn = p.stop ? confirmBtn("stop", "mdi:stop", t("printer_stop"), () => press(p.stop)) : null;
  const more = h("button", { class: "hp-btn ghost" }, icon("mdi:home-assistant"), t("more_short"));
  const actions = h("div", { class: "hp-sheet-actions hp-app-foot hp-pr-foot" }, ...[lightBtn, pauseBtn, resumeBtn, stopBtn, more].filter(Boolean));

  const sheet = openSheet(ctx, { title: printerName(hass, p), subtitle: area, cls: "appliance printer", onClose: () => live?.stop() });
  more.addEventListener("click", () => {
    sheet.close();
    openMoreInfo(ctx.root, p.status);
  });
  // The printer's socket: its usage below the filament, when the socket is online.
  const plug = plugEntityFor(hass, p.dev);
  const usage = plug && !["unavailable", "unknown"].includes(hass.states[plug]?.state) ? usageBlock(ctx, plug) : null;
  sheet.body.append(...[media, hero, stats, fil, usage, hints, actions].filter(Boolean));
  if (usage) sheet.updaters.push((hs) => usage.update(hs));

  let liveOn = null;
  const update = (hs) => {
    const s = hs.states[p.status]?.state;
    const active = ACTIVE.has(s);
    const camOk = p.camera && !["unavailable", "unknown", "idle"].includes(hs.states[p.camera]?.state);
    if (camOk !== liveOn) {
      liveOn = camOk;
      if (camOk) {
        live = liveVideo(ctx, p.camera);
        media.prepend(live);
      } else {
        live?.stop();
        live?.remove();
        live = null;
      }
    } else live?.update?.(hs);
    media.classList.toggle("live", !!camOk);
    const pic = hs.states[p.cover]?.attributes.entity_picture;
    if (cover && pic && cover.getAttribute("src") !== pic) cover.src = pic;
    media.hidden = !camOk && !pic;

    const prog = num(hs, p.progress) ?? 0;
    bar.style.strokeDasharray = `${Math.max(0.5, s === "finish" ? 100 : prog)} 100`;
    pct.textContent = `${Math.round(s === "finish" ? 100 : prog)}`;
    pct.append(h("span", {}, "%"));
    hero.classList.toggle("active", active);
    status.textContent = fmtState(hs, p.status);
    status.dataset.phase = s === "running" ? "run" : s === "pause" ? "pause" : s === "finish" ? "done" : s === "failed" ? "fail" : active ? "run" : "off";
    const stage = hs.states[p.stage]?.state;
    job.replaceChildren(...[hs.states[p.job]?.state, active && stage && !["printing", "idle", "unknown"].includes(stage) ? fmtState(hs, p.stage) : null]
      .filter((x) => x && x !== "unknown" && x !== "unavailable").map((x, i) => h("span", { class: i ? "step" : "" }, x)));
    job.hidden = !job.childElementCount;
    const m = leftMin(hs, p);
    left.textContent = active && m > 0 ? t("left_n", { n: fmtLeft(m) }) : "";
    left.hidden = !left.textContent;
    const end = Date.parse(hs.states[p.end]?.state);
    eta.textContent = active && Number.isFinite(end) ? t("app_done_at", { time: formatTime(hs, new Date(end)) }) : s === "finish" ? t("printer_done") : "";
    eta.hidden = !eta.textContent;

    const L = num(hs, p.layer);
    const LL = num(hs, p.layers);
    sLayer.v.textContent = L != null && LL ? `${L} / ${LL}` : "–";
    const temp = (a, b) => {
      const v = num(hs, a);
      const tg = num(hs, b);
      return v == null ? "–" : tg ? `${Math.round(v)}° / ${Math.round(tg)}°` : `${Math.round(v)}°`;
    };
    sNoz.v.textContent = temp(p.nozzle, p.nozzleT);
    sBed.v.textContent = temp(p.bed, p.bedT);
    const g = num(hs, p.weight);
    const len = num(hs, p.length);
    sMat.v.textContent = g ? `${Math.round(g)} g${len ? ` · ${len.toFixed(1)} m` : ""}` : "–";
    sMat.hidden = !p.weight;

    const tray = hs.states[p.tray]?.attributes || {};
    const dots = p.ams.map((id) => {
      const a = hs.states[id]?.attributes || {};
      const col = String(a.color || "#888888").slice(0, 7);
      const on = a.active === true || (tray.tray_uuid && a.tray_uuid === tray.tray_uuid);
      return h("div", { class: `hp-pr-spool ${on ? "on" : ""} ${a.empty ? "empty" : ""}`, title: a.name || "" },
        h("i", { style: { background: a.empty ? "transparent" : col } }),
        h("small", {}, a.empty ? "–" : a.remain >= 0 ? `${a.remain} %` : a.type || ""));
    });
    fil.replaceChildren(...(dots.length ? [h("div", { class: "hp-pr-fil-head" }, h("small", {}, t("printer_filament")), h("small", {}, [tray.type, tray.name].filter(Boolean).join(" · "))), h("div", { class: "hp-pr-spools" }, ...dots)] : []));
    fil.hidden = !dots.length;

    const list = [];
    if (hs.states[p.hms]?.state === "on") list.push(["mdi:alert-circle-outline", t("printer_hms")]);
    if (hs.states[p.error]?.state === "on") list.push(["mdi:alert-octagon-outline", t("printer_error")]);
    hints.replaceChildren(...list.map(([ic, txt]) => h("div", { class: "hp-app-hint bad" }, icon(ic), h("span", {}, txt))));
    hints.hidden = !list.length;

    if (lightBtn) {
      const on = hs.states[p.light]?.state === "on";
      lightBtn.replaceChildren(icon(on ? "mdi:lightbulb-on" : "mdi:lightbulb-outline"), t(on ? "printer_light_off" : "printer_light_on"));
      lightBtn.classList.toggle("lit", on);
    }
    const usable = (id) => id && !["unavailable"].includes(hs.states[id]?.state);
    if (pauseBtn) pauseBtn.hidden = !(s === "running" && usable(p.pause));
    if (resumeBtn) resumeBtn.hidden = !(s === "pause" && usable(p.resume));
    if (stopBtn) stopBtn.hidden = !(active && usable(p.stop));
  };
  update(hass);
  sheet.updaters.push(update);
}
