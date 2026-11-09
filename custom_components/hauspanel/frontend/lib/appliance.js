// The appliance popup: washer, dryer and dishwasher with a moving drum, progress ring, time left,
// when it is done, live power, maintenance hints and the last runs (WashData and Home Connect).
import { h, icon, formatTime } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { watts, formatWatts, usageBlock, plugEntityFor } from "./usage.js";
import { t } from "./i18n.js";

const SLOTS = [
  ["state", /_(zustand|betriebszustand|state|status|operation_state)$/],
  ["program", /_(programm|program|aktives_programm|active_program)$/],
  ["phase", /_(aktuelle_phase|current_phase|programmphase|program_phase)$/],
  ["progress", /_(fortschritt|progress)$/],
  ["remaining", /_(verbleibende_zeit|remaining_time|time_remaining|remaining_program_time)$/],
  ["end", /_(endzeit|finish_time|program_finish_time)$/],
  ["elapsed", /_(verstrichene_zeit|elapsed_time|elapsed_program_time)$/],
  ["total", /_(gesamtdauer|total_duration)$/],
  ["count", /_(zyklusanzahl|cycle_count)$/],
  ["power", /_(aktuelle_leistung|current_power)$/],
  ["unload", /_(als_entladen_markieren|mark_unloaded)$/],
  ["salt", /_(salz_fast_leer|salt_nearly_empty)$/],
  ["rinse", /_(klarspuler_fast_leer|rinse_aid_nearly_empty)$/],
  ["door", /_(tur|door)$/],
];

const RUN = new Set(["running", "run", "starting", "ending", "läuft", "active", "washing", "drying", "spinning", "rinsing"]);
const PAUSE = new Set(["paused", "user_paused", "pause", "interrupted"]);
const DONE = new Set(["finished", "clean", "anti_wrinkle"]);
const LATER = new Set(["delay_wait", "delayedstart", "delayed_start"]);
const NONE = new Set(["", "none", "off", "unknown", "unavailable", "detecting...", "auto_detect"]);

/** Washer, dryer or dishwasher, from the device's name and model. */
export function applianceKind(text) {
  return /dry|trock/i.test(text) ? "dryer" : /dish|spül|spul|geschirr/i.test(text) ? "dish" : "washer";
}

/** Every entity that tells something about the appliance: its own device and a twin of the same name in the room. */
function sensorsOf(hass, dev) {
  const d = hass.devices?.[dev];
  const name = (d?.name_by_user || d?.name || "").toLowerCase();
  const devs = new Set([dev]);
  if (d?.area_id && name) {
    for (const o of Object.values(hass.devices || {})) {
      if (o.area_id === d.area_id && (o.name_by_user || o.name || "").toLowerCase() === name) devs.add(o.id);
    }
  }
  const out = {};
  // The device that ran the cycle first, so its sensors win over the twin's.
  for (const dv of [dev, ...[...devs].filter((x) => x !== dev)]) {
    for (const e of Object.values(hass.entities)) {
      if (e.device_id !== dv) continue;
      for (const [slot, re] of SLOTS) {
        if (!out[slot] && re.test(e.entity_id)) out[slot] = e.entity_id;
      }
    }
  }
  return out;
}

const num = (hass, id) => {
  const v = Number(hass.states[id]?.state);
  return id && Number.isFinite(v) ? v : null;
};
const minutes = (hass, id) => {
  const v = num(hass, id);
  if (v == null) return null;
  const u = hass.states[id].attributes.unit_of_measurement;
  return u === "s" ? v / 60 : u === "h" ? v * 60 : v;
};
const pretty = (s) => {
  // "dishcare_dishwasher_program_eco_50" → "Eco 50"
  const x = String(s).replace(/^.*program_/, "").replace(/_/g, " ").trim();
  return x.charAt(0).toUpperCase() + x.slice(1);
};
const clock = (hass, d) => formatTime(hass, d);
const MAINT = { lint_filter: "maint_lint", condenser_clean: "maint_condenser", descale: "maint_descale", drum_clean: "maint_drum", filter_clean: "maint_filter" };

function read(hass, s) {
  const raw = String(hass.states[s.state]?.state || "").toLowerCase();
  const phase = raw === "running" || raw === "run" || RUN.has(raw) ? "run" : PAUSE.has(raw) ? "pause" : DONE.has(raw) ? "done" : LATER.has(raw) ? "later" : "off";
  const prog = hass.states[s.program]?.state;
  const program = prog === "detecting..." ? t("app_detecting") : NONE.has(String(prog || "").toLowerCase()) ? null : pretty(prog);
  const ph = hass.states[s.phase]?.state;
  const step = NONE.has(String(ph || "").toLowerCase()) ? null : pretty(ph);
  let left = minutes(hass, s.remaining);
  if ((left == null || left <= 0) && s.end) {
    const e = (Date.parse(hass.states[s.end]?.state) - Date.now()) / 60000;
    if (Number.isFinite(e) && e > 0) left = e;
  }
  const elapsed = minutes(hass, s.elapsed);
  const total = minutes(hass, s.total);
  let progress = num(hass, s.progress);
  if (!(progress > 0) && elapsed && total) progress = Math.min(99, (elapsed / total) * 100);
  if (!(progress > 0) && elapsed && left) progress = (elapsed / (elapsed + left)) * 100;
  const active = phase === "run" || phase === "pause";
  return {
    raw, phase, active, program, step,
    left: active && left > 0 ? left : null,
    elapsed: active && elapsed > 0 ? elapsed : null,
    progress: active && progress > 0 ? Math.min(100, progress) : null,
    power: watts(hass, s.power),
    count: num(hass, s.count),
  };
}

function stateLabel(r) {
  if (r.phase === "run") return r.raw === "starting" ? t("app_starting") : r.raw === "ending" ? t("app_ending") : t("running");
  if (r.phase === "pause") return r.raw === "interrupted" ? t("app_interrupted") : t("paused");
  if (r.phase === "done") return r.raw === "anti_wrinkle" ? t("app_anti_wrinkle") : r.raw === "clean" ? t("app_clean") : t("app_finished");
  if (r.phase === "later") return t("starts_later");
  return r.raw === "ready" || r.raw === "idle" ? t("app_ready") : t("off");
}

/** The drum: porthole and water for the washer, tumbling laundry for the dryer, rising bubbles for the dishwasher. */
function drum(kind) {
  const inner = kind === "dish"
    ? [h("i", { class: "hp-app-rack" }), ...[0, 1, 2, 3, 4, 5].map((i) => h("b", { class: "hp-app-bubble", style: { "--i": i } }))]
    : kind === "dryer"
      ? [h("i", { class: "hp-app-tumble" }, h("b"), h("b"), h("b")), h("i", { class: "hp-app-heat" })]
      : [h("i", { class: "hp-app-water" }), h("i", { class: "hp-app-water two" }), h("i", { class: "hp-app-tumble" }, h("b"), h("b"))];
  return h("div", { class: `hp-app-drum ${kind}` }, ...inner, h("i", { class: "hp-app-glass" }));
}

const SVGNS = "http://www.w3.org/2000/svg";
function ring() {
  const svg = document.createElementNS(SVGNS, "svg");
  svg.setAttribute("viewBox", "0 0 120 120");
  svg.setAttribute("class", "hp-app-ring");
  const mk = (cls) => {
    const c = document.createElementNS(SVGNS, "circle");
    c.setAttribute("cx", "60");
    c.setAttribute("cy", "60");
    c.setAttribute("r", "55");
    c.setAttribute("pathLength", "100");
    c.setAttribute("class", cls);
    svg.append(c);
    return c;
  };
  mk("track");
  const bar = mk("bar");
  return { svg, set(p) {
    svg.classList.toggle("spin", p == null);
    bar.style.strokeDasharray = `${p == null ? 18 : Math.max(0.5, p)} 100`;
  } };
}

/** Power since the cycle began (at most 4 hours) as a soft area chart. */
function powerChart(ctx, s) {
  const box = h("div", { class: "hp-app-chart" });
  const head = h("div", { class: "hp-app-chart-head" }, h("small", {}, t("power_curve")), h("small", { class: "max" }));
  const plot = h("div", { class: "hp-app-plot" });
  box.append(head, plot);
  let pts = [];
  let from = Date.now() - 3600e3;
  const draw = () => {
    if (pts.length < 2) {
      plot.replaceChildren(h("div", { class: "hp-muted small center" }, t("no_data")));
      return;
    }
    const t0 = from;
    const t1 = Date.now();
    const max = Math.max(...pts.map((p) => p.v), 10);
    const X = (tm) => ((tm - t0) / Math.max(1, t1 - t0)) * 300;
    const Y = (v) => 70 - (v / max) * 64;
    let d = `M0 70 L${X(pts[0].t).toFixed(1)} ${Y(pts[0].v).toFixed(1)}`;
    for (let i = 1; i < pts.length; i++) d += ` H${X(pts[i].t).toFixed(1)} V${Y(pts[i].v).toFixed(1)}`;
    d += ` H300`;
    const svg = document.createElementNS(SVGNS, "svg");
    svg.setAttribute("viewBox", "0 0 300 72");
    svg.setAttribute("preserveAspectRatio", "none");
    const area = document.createElementNS(SVGNS, "path");
    area.setAttribute("d", `${d} V72 H0 Z`);
    area.setAttribute("class", "area");
    const line = document.createElementNS(SVGNS, "path");
    line.setAttribute("d", d);
    line.setAttribute("class", "line");
    svg.append(area, line);
    plot.replaceChildren(svg);
    head.querySelector(".max").textContent = `max ${formatWatts(ctx.hass, max)}`;
  };
  box.load = async (hass, startedMin) => {
    if (!s.power) {
      box.hidden = true;
      return;
    }
    from = Date.now() - Math.min(240, Math.max(30, (startedMin || 60) + 5)) * 60000;
    try {
      const r = await hass.callWS({ type: "history/history_during_period", start_time: new Date(from).toISOString(), entity_ids: [s.power], minimal_response: true, no_attributes: true });
      pts = (r[s.power] || []).map((x) => ({ t: Math.max(from, (x.lu ?? x.lc) * 1000), v: Number(x.s) })).filter((p) => Number.isFinite(p.v));
    } catch { pts = []; }
    draw();
  };
  box.push = (hass) => {
    const v = watts(hass, s.power);
    if (v == null) return;
    const last = pts[pts.length - 1];
    if (!last || last.v !== v) pts.push({ t: Date.now(), v });
    draw();
  };
  return box;
}

/** The last runs WashData remembers (admins only; quietly empty otherwise). */
async function lastRuns(ctx, dev) {
  const d = ctx.hass.devices?.[dev];
  for (const entry of d?.config_entries || []) {
    try {
      const r = await ctx.hass.connection.sendMessagePromise({ type: "ha_washdata/get_device_cycles", entry_id: entry, limit: 6, offset: 0, imported_offset: 0 });
      const list = (r.cycles || []).filter((c) => c.status === "completed" || c.status === "interrupted").slice(0, 4);
      if (list.length) return list;
    } catch { /* not WashData, or no rights */ }
  }
  return [];
}

export function openAppliance(ctx, dev, { plug } = {}) {
  const hass = ctx.hass;
  const d = hass.devices?.[dev];
  const s = sensorsOf(hass, dev);
  if (!s.state) return;
  const name = d?.name_by_user || d?.name || "";
  const kind = applianceKind(`${name} ${d?.model || ""} ${s.state}`);
  const area = d?.area_id && ctx.model.areaById.get(d.area_id)?.name;

  const rg = ring();
  const big = h("b");
  const unit = h("small");
  const center = h("div", { class: "hp-app-center" }, big, unit);
  const dial = h("div", { class: "hp-app-dial" }, rg.svg, drum(kind), center);
  const status = h("span", { class: "hp-app-status" });
  const prog = h("div", { class: "hp-app-prog" });
  const eta = h("div", { class: "hp-app-eta" });
  const hero = h("div", { class: `hp-app-hero ${kind}` }, dial, h("div", { class: "hp-app-info" }, status, prog, eta));

  const stat = (ic, label) => {
    const v = h("b");
    const el = h("div", { class: "hp-app-stat" }, icon(ic), h("div", {}, v, h("small", {}, label)));
    el.v = v;
    return el;
  };
  const sPow = stat("mdi:flash", t("power_now"));
  const sTime = stat("mdi:timer-outline", t("app_running_for"));
  const sCount = stat("mdi:counter", t("app_cycles"));
  const stats = h("div", { class: "hp-app-stats" }, sPow, sTime, sCount);
  const chart = powerChart(ctx, s);
  const hints = h("div", { class: "hp-app-hints" });
  const runs = h("div", { class: "hp-app-runs" });

  const actions = h("div", { class: "hp-sheet-actions hp-app-foot" });
  const unloadBtn = s.unload ? h("button", { class: "hp-btn primary" }, icon("mdi:check-circle-outline"), t("app_unloaded")) : null;
  unloadBtn?.addEventListener("click", () => {
    ctx.hass.callService("button", "press", { entity_id: s.unload });
    unloadBtn.disabled = true;
  });
  const more = h("button", { class: "hp-btn ghost" }, icon("mdi:home-assistant"), t("more_short"));
  // Opened from its socket: the socket's own usage popup is one tap away.
  plug ||= plugEntityFor(hass, dev);
  const usage = plug && !["unavailable", "unknown"].includes(hass.states[plug]?.state) ? usageBlock(ctx, plug) : null;
  const plugBtn = plug && plug.startsWith("switch.") ? h("button", { class: "hp-btn ghost" }, icon("mdi:power-socket-de"), t("app_socket")) : null;
  actions.append(...[unloadBtn, plugBtn, more].filter(Boolean));

  const sheet = openSheet(ctx, { title: name, subtitle: area, cls: "appliance" });
  more.addEventListener("click", () => {
    sheet.close();
    openMoreInfo(ctx.root, s.state);
  });
  plugBtn?.addEventListener("click", () => {
    sheet.close();
    ctx.openDetailsPlain?.(plug);
  });
  sheet.body.append(...[hero, stats, chart, usage, hints, runs, actions].filter(Boolean));
  if (usage) sheet.updaters.push((hs) => usage.update(hs));

  let wasActive = null;
  const update = (hs) => {
    const r = read(hs, s);
    hero.classList.toggle("active", r.active);
    hero.classList.toggle("paused", r.phase === "pause");
    hero.classList.toggle("done", r.phase === "done");
    rg.set(r.active ? r.progress : r.phase === "done" ? 100 : 0);
    rg.svg.classList.toggle("idle", !r.active && r.phase !== "done");
    if (r.active && r.left != null) {
      big.textContent = r.left >= 60 ? `${Math.floor(r.left / 60)}:${String(Math.round(r.left % 60)).padStart(2, "0")}` : String(Math.max(1, Math.round(r.left)));
      unit.textContent = r.left >= 60 ? t("app_h_left") : t("app_min_left");
    } else if (r.active && r.progress != null) {
      big.textContent = `${Math.round(r.progress)}`;
      unit.textContent = "%";
    } else if (r.active && r.elapsed != null) {
      big.textContent = String(Math.round(r.elapsed));
      unit.textContent = t("app_min_running");
    } else {
      big.textContent = "";
      unit.textContent = "";
    }
    center.classList.toggle("empty", !big.textContent);
    status.textContent = stateLabel(r);
    status.dataset.phase = r.phase;
    prog.replaceChildren(...[r.program, r.step].filter(Boolean).map((x, i) => h("span", { class: i ? "step" : "" }, x)));
    prog.hidden = !prog.childElementCount;
    eta.textContent = r.active && r.left != null ? t("app_done_at", { time: clock(hs, new Date(Date.now() + r.left * 60000)) })
      : r.phase === "done" ? t("app_take_out") : r.active ? t("app_no_eta") : "";
    eta.hidden = !eta.textContent;
    sPow.v.textContent = r.power != null ? formatWatts(hs, r.power) : "–";
    sPow.hidden = !s.power || !!usage;
    sTime.v.textContent = r.elapsed != null ? `${Math.round(r.elapsed)} min` : "–";
    sTime.hidden = !s.elapsed;
    sCount.v.textContent = r.count != null ? String(Math.round(r.count)) : "–";
    sCount.hidden = !s.count;
    stats.hidden = ![sPow, sTime, sCount].some((x) => !x.hidden);
    // Hints: maintenance, salt and rinse aid, an open door.
    const list = [];
    const due = hs.states[s.state]?.attributes.maintenance_due;
    for (const m of Array.isArray(due) ? due : []) list.push(["mdi:wrench-outline", MAINT[m] ? t(MAINT[m]) : pretty(m)]);
    const low = (id) => id && !["off", "unavailable", "unknown", "false"].includes(String(hs.states[id]?.state).toLowerCase());
    if (low(s.salt)) list.push(["mdi:shaker-outline", t("app_salt")]);
    if (low(s.rinse)) list.push(["mdi:water-outline", t("app_rinse")]);
    if (s.door && /open|offen/i.test(hs.states[s.door]?.state || "")) list.push(["mdi:door-open", t("app_door_open")]);
    hints.replaceChildren(...list.map(([ic, txt]) => h("div", { class: "hp-app-hint" }, icon(ic), h("span", {}, txt))));
    hints.hidden = !list.length;
    if (unloadBtn) unloadBtn.hidden = ["unavailable", "unknown"].includes(hs.states[s.unload]?.state) || r.active;
    if (wasActive !== r.active) {
      wasActive = r.active;
      chart.load(hs, r.elapsed);
    } else chart.push(hs);
  };
  update(hass);
  sheet.updaters.push(update);

  lastRuns(ctx, dev).then((list) => {
    if (!list.length) return;
    const lang = hass.locale?.language || "de";
    runs.append(h("div", { class: "hp-label" }, t("app_last_runs")),
      ...list.map((c) => {
        const st = new Date(c.start_time);
        const when = st.toLocaleDateString(lang, { weekday: "short" }) + " " + clock(hass, st);
        return h("div", { class: "hp-app-run" },
          h("span", { class: "when" }, when),
          h("span", { class: "what" }, c.profile_name || t("app_unknown_program")),
          h("span", { class: "dur" }, `${Math.round((c.duration || 0) / 60)} min`));
      }));
  });
}
