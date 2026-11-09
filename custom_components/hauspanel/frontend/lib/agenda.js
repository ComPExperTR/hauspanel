// Family calendar and reminders: counts by the clock, month view, reminders sheet, Today card.
import { h, icon, sameDay, startOfDay, addDays, formatTime, formatDate } from "./util.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";

const CAL_COLORS = ["#ffb547", "#5ac8fa", "#ff6b8b", "#7bd88f", "#b48cff", "#ff8f4d", "#4dd4c6", "#f5d547"];

function parseCalDate(v) {
  if (!v) return null;
  if (v.dateTime) return { date: new Date(v.dateTime), allDay: false };
  if (v.date) {
    const [y, m, d] = v.date.split("-").map(Number);
    return { date: new Date(y, m - 1, d), allDay: true };
  }
  return null;
}

function parseDue(due) {
  if (!due) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) {
    const [y, m, d] = due.split("-").map(Number);
    return { date: new Date(y, m - 1, d, 23, 59, 59), allDay: true };
  }
  return { date: new Date(due), allDay: false };
}

export class Agenda {
  constructor(ctx, onChange) {
    this.ctx = ctx;
    this.onChange = onChange;
    this.events = [];
    this.items = [];
    this._watch = new Map();
    this._timer = setInterval(() => this.refresh(), 5 * 60 * 1000);
  }

  destroy() {
    clearInterval(this._timer);
  }

  calendars() {
    const sel = this.ctx.settings.s.calendars;
    return (sel ?? this.ctx.model.calendars).filter((id) => this.ctx.hass.states[id]);
  }

  todoLists() {
    const sel = this.ctx.settings.s.todos;
    return (sel ?? this.ctx.model.todos).filter((id) => this.ctx.hass.states[id]);
  }

  color(calId) {
    const i = this.ctx.model.calendars.indexOf(calId);
    return CAL_COLORS[(i < 0 ? 0 : i) % CAL_COLORS.length];
  }

  /** Called on every hass update: refresh when a calendar or list changed. */
  watch(hass) {
    let changed = false;
    for (const id of [...this.calendars(), ...this.todoLists()]) {
      const st = hass.states[id];
      if (this._watch.get(id) !== st?.last_updated + st?.state) {
        this._watch.set(id, st?.last_updated + st?.state);
        changed = true;
      }
    }
    if (changed) this._refreshSoon();
  }

  _refreshSoon() {
    clearTimeout(this._soon);
    this._soon = setTimeout(() => this.refresh(), 300);
  }

  async fetchEvents(start, end, cals = this.calendars()) {
    const hass = this.ctx.hass;
    const out = [];
    await Promise.all(
      cals.map(async (cal) => {
        try {
          const res = await hass.callApi("GET", `calendars/${cal}?start=${encodeURIComponent(start.toISOString())}&end=${encodeURIComponent(end.toISOString())}`);
          for (const ev of res) {
            const s = parseCalDate(ev.start);
            const e = parseCalDate(ev.end);
            if (!s) continue;
            out.push({ cal, summary: ev.summary || "", location: ev.location, start: s.date, end: e?.date || s.date, allDay: s.allDay });
          }
        } catch (err) {
          console.warn("HausPanel: calendar", cal, err);
        }
      })
    );
    out.sort((a, b) => a.start - b.start);
    return out;
  }

  async refresh() {
    const today = startOfDay(new Date());
    const [events, items] = await Promise.all([this.fetchEvents(today, addDays(today, 14)), this.fetchItems()]);
    this.events = events;
    this.items = items;
    this.onChange();
  }

  async fetchItems() {
    const hass = this.ctx.hass;
    const out = [];
    await Promise.all(
      this.todoLists().map(async (list) => {
        try {
          const res = await hass.callWS({ type: "todo/item/list", entity_id: list });
          for (const it of res.items || []) {
            if (it.status !== "needs_action") continue;
            const due = parseDue(it.due);
            out.push({ list, uid: it.uid, summary: it.summary, due: due?.date || null, allDay: due?.allDay ?? true });
          }
        } catch (err) {
          console.warn("HausPanel: todo", list, err);
        }
      })
    );
    out.sort((a, b) => (a.due ?? Infinity) - (b.due ?? Infinity));
    return out;
  }

  todayEvents() {
    const now = new Date();
    return this.events.filter((e) => (e.allDay ? sameDay(e.start, now) || (e.start <= now && e.end > now) : sameDay(e.start, now) || (e.start <= now && e.end > now)));
  }

  remainingToday() {
    const now = new Date();
    return this.todayEvents().filter((e) => e.allDay || e.end > now);
  }

  overdue() {
    const now = new Date();
    return this.items.filter((i) => i.due && i.due < now && !(i.allDay && sameDay(i.due, now)));
  }

  dueToday() {
    const now = new Date();
    return this.items.filter((i) => i.due && sameDay(i.due, now) && !(i.due < now && !i.allDay));
  }

  async complete(item) {
    await this.ctx.hass.callService("todo", "update_item", { entity_id: item.list, item: item.uid, status: "completed" });
    this.items = this.items.filter((i) => i !== item);
    this.onChange();
  }

  async addItem(list, summary) {
    await this.ctx.hass.callService("todo", "add_item", { entity_id: list, item: summary });
    this._refreshSoon();
  }
}

function eventRow(ctx, ev) {
  const hass = ctx.hass;
  const time = ev.allDay ? t("all_day") : `${formatTime(hass, ev.start)} – ${formatTime(hass, ev.end)}`;
  return h("div", { class: "hp-ev" },
    h("span", { class: "hp-ev-dot", style: { background: ctx.agenda.color(ev.cal) } }),
    h("div", { class: "hp-ev-text" }, h("div", { class: "hp-ev-title" }, ev.summary), h("small", {}, [time, ev.location].filter(Boolean).join(" · "))));
}

function itemRow(ctx, item, onDone) {
  const hass = ctx.hass;
  const now = new Date();
  const over = item.due && item.due < now && !(item.allDay && sameDay(item.due, now));
  const when = item.due
    ? sameDay(item.due, now) ? (item.allDay ? t("today") : formatTime(hass, item.due)) : formatDate(hass, item.due, { day: "numeric", month: "short" })
    : "";
  const check = h("button", { class: "hp-check", "aria-label": t("done") }, icon("mdi:check"));
  const row = h("div", { class: `hp-item ${over ? "overdue" : ""}` }, check,
    h("div", { class: "hp-ev-text" }, h("div", { class: "hp-ev-title" }, item.summary),
      h("small", {}, [when, hass.states[item.list]?.attributes.friendly_name].filter(Boolean).join(" · "))));
  check.addEventListener("click", async (e) => {
    e.stopPropagation();
    row.classList.add("done");
    await ctx.agenda.complete(item);
    onDone?.();
  });
  return row;
}

/** Full-screen month with the agenda of the chosen day. */
export function openCalendar(ctx) {
  const hass = ctx.hass;
  let month = new Date();
  month.setDate(1);
  month = startOfDay(month);
  let selected = startOfDay(new Date());
  let events = [];
  const grid = h("div", { class: "hp-month" });
  const dayList = h("div", { class: "hp-day-list" });
  const title = h("div", { class: "hp-month-title" });
  const prev = h("button", { class: "hp-round ghost", "aria-label": t("previous") }, icon("mdi:chevron-left"));
  const next = h("button", { class: "hp-round ghost", "aria-label": t("next") }, icon("mdi:chevron-right"));
  const todayBtn = h("button", { class: "hp-chip" }, t("today"));
  const firstDay = hass.locale?.first_weekday === "sunday" ? 0 : 1;

  const drawDay = () => {
    dayList.replaceChildren(
      h("div", { class: "hp-day-head" }, formatDate(hass, selected, { weekday: "long", day: "numeric", month: "long" })));
    const list = events.filter((e) => sameDay(e.start, selected) || (e.start < selected && e.end > selected));
    if (!list.length) dayList.append(h("div", { class: "hp-empty" }, t("no_events")));
    list.forEach((e) => dayList.append(eventRow(ctx, e)));
  };
  const draw = () => {
    title.textContent = formatDate(hass, month, { month: "long", year: "numeric" });
    grid.replaceChildren();
    const base = new Date(2024, 0, 1 + ((firstDay + 6) % 7)); // a Monday or Sunday
    for (let i = 0; i < 7; i++) grid.append(h("div", { class: "hp-wd" }, formatDate(hass, addDays(base, i), { weekday: "short" })));
    const offset = (month.getDay() - firstDay + 7) % 7;
    const start = addDays(month, -offset);
    for (let i = 0; i < 42; i++) {
      const day = addDays(start, i);
      const evs = events.filter((e) => sameDay(e.start, day) || (e.start < day && e.end > day));
      const cell = h("button", {
        class: `hp-day ${day.getMonth() !== month.getMonth() ? "other" : ""} ${sameDay(day, new Date()) ? "today" : ""} ${sameDay(day, selected) ? "sel" : ""}`,
      }, h("span", {}, String(day.getDate())),
        h("div", { class: "hp-dots" }, evs.slice(0, 4).map((e) => h("i", { style: { background: ctx.agenda.color(e.cal) } }))));
      cell.addEventListener("click", () => {
        selected = day;
        draw();
      });
      grid.append(cell);
    }
    drawDay();
  };
  const load = async () => {
    const offset = (month.getDay() - firstDay + 7) % 7;
    const start = addDays(month, -offset);
    events = await ctx.agenda.fetchEvents(start, addDays(start, 42));
    draw();
  };
  prev.addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() - 1, 1); load(); });
  next.addEventListener("click", () => { month = new Date(month.getFullYear(), month.getMonth() + 1, 1); load(); });
  todayBtn.addEventListener("click", () => { month = new Date(); month.setDate(1); month = startOfDay(month); selected = startOfDay(new Date()); load(); });
  const sheet = openSheet(ctx, { title: t("calendar"), cls: "full", actions: h("div", { class: "hp-month-nav" }, todayBtn, prev, title, next) });
  if (!ctx.agenda.calendars().length) {
    sheet.body.append(h("div", { class: "hp-empty" }, t("no_calendars")));
    return;
  }
  sheet.body.append(h("div", { class: "hp-cal-layout" }, grid, dayList));
  draw();
  load();
}

export function openReminders(ctx) {
  const sheet = openSheet(ctx, { title: t("reminders"), cls: "tall" });
  const lists = ctx.agenda.todoLists();
  const draw = () => {
    sheet.body.replaceChildren();
    if (!lists.length) {
      sheet.body.append(h("div", { class: "hp-empty" }, t("no_lists")));
      return;
    }
    const input = h("input", { class: "hp-input", placeholder: t("new_reminder") });
    const listSel = h("select", { class: "hp-select" }, lists.map((l) => h("option", { value: l }, ctx.hass.states[l]?.attributes.friendly_name || l)));
    input.addEventListener("keydown", async (e) => {
      if (e.key === "Enter" && input.value.trim()) {
        await ctx.agenda.addItem(listSel.value, input.value.trim());
        input.value = "";
      }
    });
    sheet.body.append(h("div", { class: "hp-add-reminder" }, input, lists.length > 1 ? listSel : null));
    const over = ctx.agenda.overdue();
    const today = ctx.agenda.dueToday();
    const rest = ctx.agenda.items.filter((i) => !over.includes(i) && !today.includes(i));
    const section = (label, items, cls) => {
      if (!items.length) return;
      sheet.body.append(h("div", { class: `hp-group-label ${cls || ""}` }, label));
      items.forEach((i) => sheet.body.append(itemRow(ctx, i, draw)));
    };
    section(t("overdue"), over, "red");
    section(t("today"), today);
    section(t("later"), rest);
    if (!ctx.agenda.items.length) sheet.body.append(h("div", { class: "hp-empty" }, t("all_done")));
  };
  draw();
  sheet.updaters.push(() => {
    if (sheet._items !== ctx.agenda.items) {
      sheet._items = ctx.agenda.items;
      if (!sheet.body.contains(document.activeElement)) draw();
    }
  });
  sheet._items = ctx.agenda.items;
}

/** Card on Home with what is left of the day. */
export function todayCard(ctx) {
  const el = h("div", { class: "hp-today", role: "button", tabindex: "0" });
  el.addEventListener("click", (e) => {
    if (ctx.editing) return;
    if (e.target.closest(".hp-check")) return;
    openCalendar(ctx);
  });
  el.update = () => {
    const evs = ctx.agenda.remainingToday();
    const items = [...ctx.agenda.overdue(), ...ctx.agenda.dueToday()];
    el.replaceChildren(h("div", { class: "hp-today-head" }, icon("mdi:calendar-today"), t("today")));
    if (!evs.length && !items.length) {
      el.append(h("div", { class: "hp-muted" }, t("today_free")));
      return;
    }
    const body = h("div", { class: "hp-today-body" });
    evs.slice(0, 3).forEach((e) => body.append(eventRow(ctx, e)));
    items.slice(0, 3).forEach((i) => body.append(itemRow(ctx, i)));
    const more = evs.length + items.length - Math.min(3, evs.length) - Math.min(3, items.length);
    if (more > 0) body.append(h("div", { class: "hp-muted" }, t("and_more", { n: more })));
    el.append(body);
  };
  el.update();
  return el;
}
