// Widgets for the left panel of the Sidebar layout: weather, what's coming up, home status, room list.
// Each one can be switched on or off in Settings → Layout.
import { h, icon, formatNumber, formatTime, formatDate, sameDay, addDays, startOfDay } from "./util.js";
import { WEATHER_ICONS } from "./domains.js";
import { openWeather } from "./weather.js";
import { openCalendar } from "./agenda.js";
import { homeSecurity } from "./securityview.js";
import { t } from "./i18n.js";

export const SIDE_DEFAULTS = { weather: true, agenda: true, status: true, scenes: true, rooms: false };

/** Now, high/low and the next hours; tap opens the full forecast. */
function weatherWidget(ctx) {
  const el = h("div", { class: "hp-side-wx", role: "button", tabindex: "0" });
  el.addEventListener("click", () => !ctx.editing && openWeather(ctx));
  el.sideRefresh = () => {
    const c = ctx.weather.current();
    el.hidden = !c;
    if (!c) return;
    const n = (v) => (v != null ? `${formatNumber(ctx.hass, v, 0)}°` : "–");
    const hours = ctx.weather.hourly.filter((x) => new Date(x.datetime) > new Date()).filter((_, i) => i % 2 === 0).slice(0, 5);
    const sig = JSON.stringify([c.temperature, c.condition, c.high, c.low, hours.map((x) => [x.datetime, x.temperature, x.condition])]);
    if (el.dataset.sig === sig) return;
    el.dataset.sig = sig;
    el.replaceChildren(...[
      h("div", { class: "hp-side-wx-now" },
        icon(WEATHER_ICONS[c.condition] || "mdi:weather-partly-cloudy", "hp-side-wx-icon"),
        h("div", {}, h("b", {}, n(c.temperature)), h("small", {}, c.label)),
        h("div", { class: "hp-side-wx-hl" }, h("span", {}, `↑ ${n(c.high)}`), h("span", {}, `↓ ${n(c.low)}`))),
      hours.length
        ? h("div", { class: "hp-side-wx-hours" }, hours.map((x) =>
          h("div", {}, h("small", {}, formatTime(ctx.hass, new Date(x.datetime)).replace(/:00(?=\D|$)/, "")),
            icon(WEATHER_ICONS[x.condition] || "mdi:weather-cloudy"), h("b", {}, n(x.temperature)))))
        : null].filter(Boolean));
  };
  el.update = el.sideRefresh;
  el.sideRefresh();
  return el;
}

/** The next events (today, tomorrow, the days after) and reminders due today. */
function agendaWidget(ctx, max = 4) {
  const el = h("div", { class: "hp-side-agenda", role: "button", tabindex: "0" });
  el.addEventListener("click", (e) => !ctx.editing && openCalendar(ctx));
  el.sideRefresh = () => {
    const now = new Date();
    const today = startOfDay(now);
    const evs = (ctx.agenda.events || []).filter((e) => (e.allDay ? e.end > today : e.end > now)).slice(0, max);
    const todos = [...ctx.agenda.overdue(), ...ctx.agenda.dueToday()].slice(0, 3);
    const dayLabel = (d) => (sameDay(d, now) || d < now ? t("today") : sameDay(d, addDays(today, 1)) ? t("tomorrow") : formatDate(ctx.hass, d, { weekday: "short", day: "numeric", month: "short" }));
    const rows = [];
    let last = "";
    for (const e of evs) {
      const label = dayLabel(e.start);
      if (label !== last) {
        rows.push(h("div", { class: "hp-side-day" }, label));
        last = label;
      }
      rows.push(h("div", { class: "hp-side-ev" },
        h("i", { style: { background: ctx.agenda.color(e.cal) } }),
        h("span", {}, e.summary),
        h("small", {}, e.allDay ? t("all_day") : formatTime(ctx.hass, e.start))));
    }
    if (todos.length) {
      rows.push(h("div", { class: "hp-side-day" }, t("reminders")));
      for (const i of todos) rows.push(h("div", { class: "hp-side-ev todo" }, icon("mdi:checkbox-blank-circle-outline"), h("span", {}, i.summary)));
    }
    el.replaceChildren(h("div", { class: "hp-label" }, icon("mdi:calendar-blank-outline"), t("upcoming")),
      ...(rows.length ? rows : [h("div", { class: "hp-muted small" }, t("no_upcoming"))]));
  };
  el.update = () => {};
  el.sideRefresh();
  return el;
}

/** The parts of the panel, in order, separated by thin lines. */
export function sideWidgets(ctx, { statusBlock, roomNav, selected, scenes }) {
  const on = { ...SIDE_DEFAULTS, ...(ctx.settings.s.side || {}) };
  // The Rooms tab needs the room list to pick a room.
  const needRooms = selected && selected !== "overview";
  const parts = [];
  if (on.weather) parts.push(weatherWidget(ctx));
  // With the security chips under the home status there is room for three events.
  if (on.agenda && (ctx.agenda.calendars().length || ctx.agenda.todoLists().length)) parts.push(agendaWidget(ctx, on.status && on.scenes && ctx.allScenes().length ? 2 : on.status ? 3 : 4));
  if (on.status) {
    // Gates, garage, locks and doors (lights and the rest are in the categories on the right).
    const sec = homeSecurity(ctx);
    if (sec) parts.push(h("div", { class: "hp-side-status" }, sec));
  }
  // Scenes, small, under gates and locks (on every page, so they are always at hand).
  if (on.scenes && scenes) {
    const sc = scenes();
    if (sc) parts.push(h("div", { class: "hp-side-scenes" }, sc));
  }
  if (on.rooms || needRooms) parts.push(roomNav(ctx, selected, { overview: true }));
  for (const p of parts) if (p.sideRefresh) ctx.live.push(p);
  const out = [];
  parts.forEach((p, i) => {
    if (i) out.push(h("div", { class: "hp-side-sep" }));
    out.push(p);
  });
  return out;
}
