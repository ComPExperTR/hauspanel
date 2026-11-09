// Weather from Home Assistant's own weather entity, with Open-Meteo as a fallback.
import { h, icon, formatTime, formatDate, formatNumber, sameDay } from "./util.js";
import { WEATHER_ICONS } from "./domains.js";
import { openSheet } from "./dialogs.js";
import { t } from "./i18n.js";

function meteoCondition(code, isDay = true) {
  if (code === 0) return isDay ? "sunny" : "clear-night";
  if (code <= 2) return "partlycloudy";
  if (code === 3) return "cloudy";
  if (code === 45 || code === 48) return "fog";
  if (code >= 51 && code <= 57) return "rainy";
  if (code === 65 || code === 82) return "pouring";
  if (code >= 61 && code <= 64) return "rainy";
  if (code === 66 || code === 67) return "snowy-rainy";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "snowy";
  if (code >= 80 && code <= 81) return "rainy";
  if (code === 95) return "lightning-rainy";
  if (code >= 96) return "hail";
  return "cloudy";
}

export class Weather {
  constructor(ctx, onChange) {
    this.ctx = ctx;
    this.onChange = onChange;
    this.daily = [];
    this.hourly = [];
    this.meteo = null;
    this.source = null;
    this._unsubs = [];
    this._entity = undefined;
  }

  entity() {
    const sel = this.ctx.settings.s.weather;
    if (sel && this.ctx.hass.states[sel]) return sel;
    return this.ctx.model.weather[0] || null;
  }

  destroy() {
    this._unsubs.forEach((u) => u());
    this._unsubs = [];
    clearInterval(this._meteoTimer);
  }

  async start() {
    const ent = this.entity();
    if (ent === this._entity) return;
    this.destroy();
    this._entity = ent;
    this.daily = [];
    this.hourly = [];
    if (!ent) {
      this._startMeteo();
      return;
    }
    const conn = this.ctx.hass.connection;
    let got = 0;
    for (const type of ["daily", "hourly"]) {
      try {
        const unsub = await conn.subscribeMessage(
          (msg) => {
            if (type === "daily") this.daily = msg.forecast || [];
            else this.hourly = msg.forecast || [];
            this.source = "ha";
            this.onChange();
          },
          { type: "weather/subscribe_forecast", forecast_type: type, entity_id: ent }
        );
        this._unsubs.push(unsub);
        got++;
      } catch {
        /* this weather service does not offer that forecast */
      }
    }
    if (!got) this._startMeteo();
  }

  _startMeteo() {
    this.source = "meteo";
    const run = () => this._fetchMeteo().catch((e) => console.warn("HausPanel: Open-Meteo", e));
    run();
    this._meteoTimer = setInterval(run, 30 * 60 * 1000);
  }

  async _fetchMeteo() {
    const c = this.ctx.hass.config;
    if (c.latitude == null) return;
    const f = c.unit_system?.temperature === "°F";
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${c.latitude}&longitude=${c.longitude}` +
      "&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day,precipitation" +
      "&hourly=temperature_2m,weather_code,precipitation_probability,is_day" +
      "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,sunrise,sunset" +
      `&timezone=auto&forecast_days=7${f ? "&temperature_unit=fahrenheit&wind_speed_unit=mph" : ""}`;
    const r = await fetch(url);
    if (!r.ok) throw new Error(r.status);
    const j = await r.json();
    this.meteo = {
      condition: meteoCondition(j.current.weather_code, !!j.current.is_day),
      temperature: j.current.temperature_2m,
      apparent_temperature: j.current.apparent_temperature,
      humidity: j.current.relative_humidity_2m,
      wind_speed: j.current.wind_speed_10m,
      wind_speed_unit: j.current_units?.wind_speed_10m,
      precipitation: j.current.precipitation,
      sunrise: j.daily.sunrise?.[0],
      sunset: j.daily.sunset?.[0],
    };
    const now = Date.now();
    this.hourly = j.hourly.time
      .map((tm, i) => ({
        datetime: tm,
        temperature: j.hourly.temperature_2m[i],
        condition: meteoCondition(j.hourly.weather_code[i], !!j.hourly.is_day[i]),
        precipitation_probability: j.hourly.precipitation_probability[i],
      }))
      .filter((x) => new Date(x.datetime).getTime() > now - 3600e3)
      .slice(0, 24);
    this.daily = j.daily.time.map((tm, i) => ({
      datetime: tm,
      temperature: j.daily.temperature_2m_max[i],
      templow: j.daily.temperature_2m_min[i],
      condition: meteoCondition(j.daily.weather_code[i]),
      precipitation: j.daily.precipitation_sum[i],
    }));
    this.onChange();
  }

  /** What the header and screensaver show. */
  current() {
    const hass = this.ctx.hass;
    const ent = this.entity();
    const st = ent && hass.states[ent];
    const unit = hass.config.unit_system?.temperature || "°C";
    const today = this.daily[0];
    if (st && this.source !== "meteo" && st.state !== "unavailable") {
      const a = st.attributes;
      return {
        condition: st.state,
        temperature: a.temperature,
        unit: a.temperature_unit || unit,
        apparent: a.apparent_temperature,
        humidity: a.humidity,
        wind: a.wind_speed != null ? `${formatNumber(hass, a.wind_speed)} ${a.wind_speed_unit || ""}` : null,
        high: today?.temperature,
        low: today?.templow,
        precipitation: today?.precipitation != null ? `${formatNumber(hass, today.precipitation)} ${a.precipitation_unit || "mm"}` : null,
        label: hass.formatEntityState ? hass.formatEntityState(st) : st.state,
      };
    }
    if (this.meteo) {
      const m = this.meteo;
      return {
        condition: m.condition,
        temperature: m.temperature,
        unit,
        apparent: m.apparent_temperature,
        humidity: m.humidity,
        wind: m.wind_speed != null ? `${formatNumber(hass, m.wind_speed)} ${m.wind_speed_unit || ""}` : null,
        high: today?.temperature,
        low: today?.templow,
        precipitation: today?.precipitation != null ? `${formatNumber(hass, today.precipitation)} mm` : null,
        label: hass.localize?.(`component.weather.entity_component._.state.${m.condition}`) || m.condition,
        sunrise: m.sunrise,
        sunset: m.sunset,
      };
    }
    return null;
  }

  sun() {
    const s = this.ctx.hass.states["sun.sun"];
    const cur = this.current();
    const rise = s?.attributes.next_rising || cur?.sunrise;
    const set = s?.attributes.next_setting || cur?.sunset;
    // sun.sun knows whether the sun is up; its next_rising is tomorrow's while it is day.
    const up = s && ["above_horizon", "below_horizon"].includes(s.state) ? s.state === "above_horizon" : null;
    return { rise: rise ? new Date(rise) : null, set: set ? new Date(set) : null, up };
  }
}

export function weatherChip(ctx) {
  const ic = icon("mdi:weather-partly-cloudy");
  const temp = h("span", {});
  const el = h("button", { class: "hp-head-btn weather", "aria-label": t("weather") }, ic, temp);
  el.addEventListener("click", () => openWeather(ctx));
  el.update = () => {
    const c = ctx.weather.current();
    el.hidden = !c;
    if (!c) return;
    ic.icon = WEATHER_ICONS[c.condition] || "mdi:weather-partly-cloudy";
    temp.textContent = c.temperature != null ? `${formatNumber(ctx.hass, c.temperature, 0)}°` : "";
  };
  el.update();
  return el;
}

export function openWeather(ctx) {
  const hass = ctx.hass;
  const sheet = openSheet(ctx, { title: t("weather"), cls: "weather" });
  const draw = () => {
    const c = ctx.weather.current();
    sheet.body.replaceChildren();
    if (!c) {
      sheet.body.append(h("div", { class: "hp-empty" }, t("no_weather")));
      return;
    }
    const n = (v) => (v != null ? `${formatNumber(hass, v, 0)}°` : "–");
    const sun = ctx.weather.sun();
    // Everything on one screen: the sky with the facts in it, the next 24 hours, the week.
    const now = new Date();
    const sunUp = sun.up != null ? sun.up : sun.rise && sun.set ? now >= sun.rise && now <= sun.set : null;
    const nextSun = sunUp == null ? null : sunUp ? ["mdi:weather-sunset-down", sun.set] : ["mdi:weather-sunset-up", sun.rise];
    const facts = [
      c.apparent != null ? ["mdi:thermometer", n(c.apparent), t("feels_like")] : null,
      c.humidity != null ? ["mdi:water-percent", `${formatNumber(hass, c.humidity, 0)} %`, t("humidity")] : null,
      c.wind ? ["mdi:weather-windy", c.wind, t("wind")] : null,
      nextSun ? [nextSun[0], formatTime(hass, nextSun[1]), sunUp ? t("sunset") : t("sunrise")] : null,
    ].filter(Boolean).slice(0, 4);
    const sky = skyHero(c, sun, n);
    if (facts.length) sky.append(h("div", { class: "hp-wx-facts" }, facts.map(([ic, v, l]) => h("div", {}, icon(ic), h("b", {}, v), h("small", {}, l)))));
    sheet.body.append(sky);
    const hourly = ctx.weather.hourly.slice(0, 24);
    if (hourly.length > 2) sheet.body.append(h("div", { class: "hp-wx-card" }, h("div", { class: "hp-wx-cardhead" }, t("next_hours")), hourCurve(hass, hourly, n)));
    const daily = ctx.weather.daily.slice(0, 7);
    if (daily.length) {
      const lo = Math.min(...daily.map((d) => d.templow ?? d.temperature));
      const hi = Math.max(...daily.map((d) => d.temperature));
      sheet.body.append(h("div", { class: "hp-wx-card" }, h("div", { class: "hp-wx-cardhead" }, t("next_days")),
        h("div", { class: "hp-wx-days" }, daily.map((d) => {
          const dt = new Date(d.datetime);
          const low = d.templow ?? d.temperature;
          const left = ((low - lo) / (hi - lo || 1)) * 100;
          const width = ((d.temperature - low) / (hi - lo || 1)) * 100;
          const rain = d.precipitation_probability != null ? (d.precipitation_probability >= 20 ? `${Math.round(d.precipitation_probability)} %` : "")
            : Number(d.precipitation) >= 0.5 ? `${formatNumber(hass, d.precipitation, 0)}mm` : "";
          return h("div", { class: "hp-wx-day" },
            h("span", { class: "hp-wx-dname" }, sameDay(dt, new Date()) ? t("today") : formatDate(hass, dt, { weekday: "short" })),
            h("span", { class: "hp-wx-dic" }, icon(WEATHER_ICONS[d.condition] || "mdi:weather-cloudy"), h("small", { class: "hp-wx-rain" }, rain)),
            h("span", { class: "hp-wx-lo" }, n(low)),
            h("span", { class: "hp-wx-range" }, h("i", { style: { left: `${left}%`, width: `${Math.max(width, 4)}%` } })),
            h("span", { class: "hp-wx-hi" }, n(d.temperature)));
        }))));
    }
    if (ctx.weather.source === "meteo") sheet.body.append(h("div", { class: "hp-muted small" }, t("meteo_note")));
  };
  draw();
  let lastD = ctx.weather.daily;
  let lastH = ctx.weather.hourly;
  sheet.updaters.push(() => {
    if (ctx.weather.daily !== lastD || ctx.weather.hourly !== lastH) {
      lastD = ctx.weather.daily;
      lastH = ctx.weather.hourly;
      draw();
    }
  });
}

const SVGNS = "http://www.w3.org/2000/svg";
const sv = (tag, attrs = {}) => {
  const el = document.createElementNS(SVGNS, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  return el;
};

/** The sky as it is now: day or night, clouds drifting, rain or snow falling, a flash for thunder. */
function skyHero(c, sun, n) {
  const now = new Date();
  const night = sun.up != null ? !sun.up : sun.rise && sun.set ? now < sun.rise || now > sun.set : now.getHours() < 7 || now.getHours() >= 19;
  const cond = c.condition || "cloudy";
  const kind = /lightning/.test(cond) ? "storm" : /snow|hail/.test(cond) ? "snow" : /rain|pouring/.test(cond) ? "rain"
    : /fog/.test(cond) ? "fog" : /cloudy|partly/.test(cond) ? (cond === "partlycloudy" ? "partly" : "cloudy") : "clear";
  const sky = h("div", { class: `hp-wx-sky ${night ? "night" : "day"} ${kind}` });
  if (night) sky.append(h("div", { class: "stars" }, ...Array.from({ length: 26 }, (_, i) => h("i", { style: { left: `${(i * 37) % 100}%`, top: `${(i * 23) % 55}%`, "--d": `${(i % 5) * 0.7}s` } }))));
  if (kind === "clear" || kind === "partly") sky.append(h("div", { class: night ? "moon" : "sun" }));
  if (kind !== "clear") {
    const n2 = kind === "partly" ? 2 : 4;
    for (let i = 0; i < n2; i++) sky.append(h("div", { class: "cloud", style: { top: `${8 + i * 13}%`, "--s": `${38 + i * 9}s`, "--o": `${-i * 11}s`, "--w": `${130 + (i % 2) * 60}px` } }));
  }
  if (kind === "rain" || kind === "storm") sky.append(h("div", { class: "drops" }, ...Array.from({ length: 40 }, (_, i) => h("i", { style: { left: `${(i * 29) % 100}%`, "--d": `${(i % 7) * 0.13}s`, "--t": `${0.55 + (i % 4) * 0.08}s` } }))));
  if (kind === "snow") sky.append(h("div", { class: "flakes" }, ...Array.from({ length: 30 }, (_, i) => h("i", { style: { left: `${(i * 31) % 100}%`, "--d": `${(i % 9) * 0.5}s`, "--t": `${4 + (i % 5)}s` } }))));
  if (kind === "storm") sky.append(h("div", { class: "flash" }));
  if (kind === "fog") sky.append(h("div", { class: "fog" }), h("div", { class: "fog two" }));
  sky.append(h("div", { class: "hp-wx-sky-text" },
    h("div", { class: "hp-wx-temp" }, n(c.temperature)),
    h("div", { class: "hp-wx-label" }, c.label),
    h("div", { class: "hi" }, `↑ ${n(c.high)}  ↓ ${n(c.low)}`)));
  return sky;
}

/** The next 24 hours as a temperature line with rain bars underneath and an icon every few hours. */
function hourCurve(hass, hours, n) {
  const W = 600;
  const H = 92;
  const temps = hours.map((x) => Number(x.temperature)).filter(Number.isFinite);
  const lo = Math.min(...temps);
  const hi = Math.max(...temps);
  const span = Math.max(3, hi - lo);
  const X = (i) => 30 + (i / (hours.length - 1)) * (W - 60);
  const Y = (v) => 14 + (1 - (v - lo) / span) * 44;
  const svg = sv("svg", { viewBox: `0 0 ${W} ${H}`, class: "hp-wx-curve", preserveAspectRatio: "none" });
  const defs = sv("defs");
  const g = sv("linearGradient", { id: "hpWxFill", x1: 0, y1: 0, x2: 0, y2: 1 });
  g.append(sv("stop", { offset: 0, "stop-color": "#ffc069", "stop-opacity": ".35" }), sv("stop", { offset: 1, "stop-color": "#ffc069", "stop-opacity": "0" }));
  defs.append(g);
  svg.append(defs);
  const pts = hours.map((x, i) => [X(i), Y(Number(x.temperature))]);
  let d = `M${pts[0][0]} ${pts[0][1]}`;
  for (let i = 1; i < pts.length; i++) {
    const [x0, y0] = pts[i - 1];
    const [x1, y1] = pts[i];
    const mx = (x0 + x1) / 2;
    d += ` C${mx} ${y0} ${mx} ${y1} ${x1} ${y1}`;
  }
  // rain bars
  hours.forEach((x, i) => {
    const mm = Number(x.precipitation) || 0;
    const p = Number(x.precipitation_probability) || 0;
    const v = Math.max(Math.min(mm / 3, 1), p / 100 * 0.6);
    if (v > 0.02) svg.append(sv("rect", { x: X(i) - 6, y: H - 2 - v * 26, width: 12, height: v * 26, rx: 3, class: "rain" }));
  });
  svg.append(sv("path", { d: `${d} L${pts[pts.length - 1][0]} ${H} L${pts[0][0]} ${H} Z`, fill: "url(#hpWxFill)" }), sv("path", { d, class: "line" }));
  const box = h("div", { class: "hp-wx-curvebox" }, svg,
    h("i", { class: "hp-wx-now", style: { left: `${(pts[0][0] / W) * 100}%`, top: `${(pts[0][1] / H) * 74}px` } }));
  // labels every 3 hours
  const labels = h("div", { class: "hp-wx-curvelabels" });
  hours.forEach((x, i) => {
    if (i % 3 || i === 0) return; // the glowing dot is "now"
    labels.append(h("div", { class: "lab", style: { left: `${(X(i) / W) * 100}%` } },
      h("b", {}, n(x.temperature)), icon(WEATHER_ICONS[x.condition] || "mdi:weather-cloudy"), h("small", {}, formatTime(hass, new Date(x.datetime)))));
  });
  box.append(labels);
  return box;
}

/** One small tile; left out when the source has no value for it. */
function stat(ic, label, value) {
  if (value === "–" || value === "" || value == null) return null;
  return h("div", { class: "hp-wx-stat" }, icon(ic), h("div", {}, h("small", {}, label), h("b", {}, value)));
}

/** Windows (and other openings that are not doors) that are open now. */
export function openWindows(hass) {
  return Object.keys(hass.states).filter((id) => id.startsWith("binary_sensor.") && hass.states[id].state === "on"
    && ["window", "opening"].includes(hass.states[id].attributes.device_class));
}

/**
 * A heads-up for "Leaving home" and "Good night" when windows are open and the next hours bring rain,
 * a thunderstorm or frost: { icon, text } or null.
 */
export function weatherWarning(ctx, { hours = 12 } = {}) {
  const hass = ctx.hass;
  const open = openWindows(hass);
  if (!open.length) return null;
  const now = Date.now();
  const next = (ctx.weather?.hourly || []).filter((x) => {
    const tm = new Date(x.datetime).getTime();
    return tm >= now - 3600e3 && tm <= now + hours * 3600e3;
  });
  if (!next.length) return null;
  const at = (x) => formatTime(hass, new Date(Math.max(now, new Date(x.datetime).getTime())));
  const n = open.length;
  const storm = next.find((x) => /lightning/.test(x.condition || ""));
  if (storm) return { icon: "mdi:weather-lightning-rainy", text: t("wx_storm_at", { time: at(storm), n }) };
  const rain = next.find((x) => (x.precipitation_probability ?? 0) >= 60 || /rain|pouring|snowy|hail/.test(x.condition || ""));
  if (rain) return { icon: "mdi:weather-pouring", text: t("wx_rain_at", { time: at(rain), n }) };
  const f = hass.config.unit_system?.temperature === "°F";
  const frost = next.find((x) => x.temperature != null && x.temperature <= (f ? 32 : 0));
  if (frost) return { icon: "mdi:snowflake-thermometer", text: t("wx_frost_at", { time: at(frost), n }) };
  return null;
}

/** The heads-up as a row for a popup (hidden when there is nothing to say). */
export function weatherWarningRow(ctx) {
  const ic = icon("mdi:weather-pouring");
  const txt = h("span");
  const el = h("div", { class: "hp-wx-warn", hidden: true }, ic, txt);
  el.update = () => {
    const w = weatherWarning(ctx);
    el.hidden = !w;
    if (w) { ic.icon = w.icon; txt.textContent = w.text; }
  };
  el.update();
  return el;
}
