// Garden popup: every irrigation zone as a card with spraying water while it runs, minutes left,
// today's watering time and the next run; rain expected today shows as a hint.
import { h, icon } from "./util.js";
import { openMoreInfo } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";
import { num, live, slotsOf, ring, hint, btn, clock, fmt } from "./popkit.js";

const SLOTS = [
  ["running", /^binary_sensor\..*_(bewasserung|watering)$/],
  ["left", /_(verbleibende_bewasserungszeit|remaining_watering_time)$/],
  ["today", /_(tagliche_aktive_bewasserungszeit|daily_active_watering_time)$/],
  ["next", /_(nachster_zyklus|next_cycle)$/],
  ["auto", /^switch\..*_(automatische_bewasserung|automatic_watering)$/],
];

/** Irrigation zones: valves on a device that also reports watering time left. */
export function irrigationZones(hass) {
  const out = [];
  const seen = new Set();
  for (const e of Object.values(hass.entities || {})) {
    if (!e.entity_id.startsWith("valve.") || !e.device_id || seen.has(e.device_id) || e.hidden || e.disabled_by) continue;
    const s = slotsOf(hass, e.device_id, SLOTS);
    if (!s.left) continue;
    // The zone's own valve, not a helper valve made from a switch.
    const valves = Object.values(hass.entities).filter((x) => x.device_id === e.device_id && x.entity_id.startsWith("valve.") && !x.disabled_by);
    const valve = (valves.find((x) => !/automatische|automatic/.test(x.entity_id)) || e).entity_id;
    seen.add(e.device_id);
    const d = hass.devices?.[e.device_id];
    out.push({ dev: e.device_id, valve, name: d?.name_by_user || d?.name || hass.states[valve]?.attributes.friendly_name, ...s });
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
}

export const isIrrigationValve = (hass, id) => id.startsWith("valve.") && irrigationZones(hass).some((z) => z.valve === id || z.dev === hass.entities?.[id]?.device_id);

const watering = (hs, z) => hs.states[z.valve]?.state === "open" || hs.states[z.running]?.state === "on" || (num(hs, z.left) ?? 0) > 0;

export function openGarden(ctx) {
  const hass = ctx.hass;
  const zones = irrigationZones(hass);
  if (!zones.length) return;
  const sum = h("div", { class: "hp-gd-sum" });
  const rain = h("div", { class: "hp-app-hints" });
  const grid = h("div", { class: "hp-gd-grid" });
  const cards = zones.map((z) => {
    const rg = ring("hp-app-ring hp-gd-ring");
    const big = h("b");
    const drops = h("div", { class: "hp-gd-spray" }, ...[0, 1, 2, 3, 4, 5, 6].map((i) => h("i", { style: { "--i": i } })));
    const sub = h("small");
    const autoTag = h("span", { class: "hp-gd-auto" });
    const el = h("div", { class: "hp-gd-zone", role: "button", tabindex: "0" },
      h("div", { class: "hp-gd-dial" }, rg.svg, drops, h("div", { class: "hp-gd-ic" }, icon("mdi:sprinkler-variant")), big),
      h("div", { class: "hp-gd-txt" }, h("b", { class: "name" }, z.name.replace(/^Rasen /, "")), sub, autoTag));
    el.addEventListener("click", () => {
      const open = watering(ctx.hass, z);
      ctx.hass.callService("valve", open ? "close_valve" : "open_valve", { entity_id: z.valve });
      el.classList.add("pressed");
      setTimeout(() => el.classList.remove("pressed"), 600);
    });
    el.update = (hs) => {
      const on = watering(hs, z);
      el.classList.toggle("on", on);
      rg.svg.classList.toggle("idle", !on);
      const left = num(hs, z.left);
      const today = num(hs, z.today);
      const next = hs.states[z.next]?.state;
      const nextD = next && !["unknown", "unavailable"].includes(next) ? new Date(next) : null;
      rg.set(on ? (left != null && el._start ? Math.max(3, (left / el._start) * 100) : null) : 0);
      if (on && left != null && (!el._start || left > el._start)) el._start = left;
      if (!on) el._start = null;
      big.textContent = on && left != null ? `${Math.ceil(left)}′` : "";
      sub.textContent = on ? t("gd_watering") : today ? t("gd_today_min", { n: fmt(hs, today) }) : nextD ? t("gd_next", { when: nextD.toLocaleDateString(hs.locale?.language || "de", { weekday: "short" }) + " " + clock(hs, nextD) }) : t("gd_idle");
      autoTag.textContent = z.auto ? (hs.states[z.auto]?.state === "on" ? t("gd_auto_on") : t("gd_auto_off")) : "";
      autoTag.hidden = !z.auto;
    };
    return el;
  });
  grid.append(...cards);

  const sheet = openSheet(ctx, { title: t("gd_title"), subtitle: t("gd_zones", { n: zones.length }), cls: "appliance garden" });
  const stopAll = btn("mdi:stop-circle-outline", t("gd_stop_all"), "danger");
  stopAll.addEventListener("click", () => ctx.hass.callService("valve", "close_valve", { entity_id: zones.filter((z) => watering(ctx.hass, z)).map((z) => z.valve) }));
  const more = btn("mdi:home-assistant", t("more_short"));
  more.addEventListener("click", () => { sheet.close(); openMoreInfo(ctx.root, zones[0].valve); });
  sheet.body.append(sum, rain, grid, h("p", { class: "hp-muted small" }, t("gd_tap_hint")), h("div", { class: "hp-sheet-actions hp-app-foot" }, stopAll, more));

  const update = (hs) => {
    cards.forEach((c) => c.update(hs));
    const n = zones.filter((z) => watering(hs, z)).length;
    const total = zones.reduce((acc, z) => acc + (num(hs, z.today) || 0), 0);
    sum.replaceChildren(
      h("div", { class: `hp-gd-sum-item ${n ? "on" : ""}` }, icon("mdi:water"), h("b", {}, n ? t("gd_n_running", { n }) : t("gd_none_running"))),
      h("div", { class: "hp-gd-sum-item" }, icon("mdi:timer-sand"), h("b", {}, t("gd_today_total", { n: fmt(hs, total) }))));
    stopAll.hidden = !n;
  };
  update(hass);
  sheet.updaters.push(update);

  // Rain today, from the weather forecast.
  const weather = ctx.settings.s.weather || Object.keys(hass.states).find((id) => id.startsWith("weather."));
  if (weather && live(hass, weather)) {
    hass.callWS({ type: "execute_script", sequence: [{ action: "weather.get_forecasts", target: { entity_id: weather }, data: { type: "daily" }, response_variable: "r" }, { stop: "", response_variable: "r" }] })
      .then((res) => {
        const f = res?.response?.[weather]?.forecast?.[0];
        const mm = Number(f?.precipitation);
        const p = Number(f?.precipitation_probability);
        if (mm >= 1 || p >= 60) rain.replaceChildren(hint("mdi:weather-pouring", t("gd_rain", { mm: fmt(hass, mm || 0, 1), p: Number.isFinite(p) ? Math.round(p) : "–" })));
      }).catch(() => {});
  }
}
