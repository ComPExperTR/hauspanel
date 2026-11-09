// Builds the home model by following Areas → Devices → Entities in the registries.
import { domainOf } from "./util.js";

/** Domains that get a tile, in their default order inside a room. */
export const TILE_DOMAINS = [
  "light", "switch", "fan", "cover", "climate", "humidifier", "water_heater", "media_player",
  "lock", "vacuum", "lawn_mower", "valve", "input_boolean", "alarm_control_panel", "script",
];

/** Domains that count toward "devices" (sensors and scenes don't). */
export const CONTROLLABLE = new Set(TILE_DOMAINS);

/** Extra domains a person may add by hand from the add dialog. */
export const ADDABLE = new Set([...TILE_DOMAINS, "sensor", "binary_sensor", "scene", "button", "input_button", "select", "input_select", "number", "input_number", "camera", "weather", "person", "device_tracker", "update", "siren", "event"]);

const SECURITY_BINARY = new Set(["door", "window", "garage_door", "opening", "lock", "motion", "occupancy", "smoke", "moisture", "gas", "safety", "tamper"]);

/** "*" works as a wildcard; without one the text may appear anywhere. Case does not matter. */
function patternTest(p) {
  const esc = p.trim().toLowerCase().replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  const re = new RegExp(p.includes("*") ? `^${esc}$` : esc);
  return (s) => re.test(s);
}

/** Returns why an entity is hidden by the global rules ("entity", "domain", "platform", "pattern") or "". */
export function hideMatcher(hass, hide) {
  const ents = new Set(hide?.entities || []);
  const doms = new Set(hide?.domains || []);
  const plats = new Set(hide?.platforms || []);
  const pats = (hide?.patterns || []).filter((p) => p.trim()).map(patternTest);
  return (entityId) => {
    if (ents.has(entityId)) return "entity";
    if (doms.has(domainOf(entityId))) return "domain";
    const reg = hass.entities?.[entityId];
    if (reg?.platform && plats.has(reg.platform)) return "platform";
    if (pats.length) {
      const name = (hass.states[entityId]?.attributes.friendly_name || "").toLowerCase();
      const id = entityId.toLowerCase();
      if (pats.some((test) => test(id) || test(name))) return "pattern";
    }
    return "";
  };
}

/** "Turn off all lights - Bedroom", "Open all shades": helper scripts that only do what a room already does. */
const ALL_SCRIPT = /\b(all|alle|sämtliche)\b.*\b(lights?|lamps?|shades?|blinds?|covers?|curtains?|licht|lichter|lampen|rollos?|rolll?(ä|ae)den|jalousien?|vorh(ä|ae)nge?)\b/i;
const GROUPABLE = new Set(["light", "cover", "switch", "fan", "lock", "valve"]);

/**
 * Group helpers (All Lights Bedroom, All Shades) and "all on / all off" scripts: the room
 * already switches all its lights and the shade tile moves all shades, so they would only
 * show the same devices twice.
 */
export function isHelperGroup(hass, entityId, reg) {
  const d = domainOf(entityId);
  const st = hass.states[entityId];
  if (GROUPABLE.has(d) && (reg?.platform === "group" || Array.isArray(st?.attributes.entity_id))) return true;
  if (d === "script") {
    const name = `${st?.attributes.friendly_name || ""} ${entityId.slice(7).replace(/_/g, " ")}`;
    if (ALL_SCRIPT.test(name)) return true;
  }
  return false;
}

/** Sensors that measure a thing, not the air of the room: pool, oven, heating water, printer, fridge, tank. */
const NOT_AIR = /pool|wasser|water|vorlauf|r(ü|u|ue)cklauf|flow|return|speicher|kessel|boiler|misch|tank|zisterne|cistern|level|kondens|garraum|oven|ofen|dampf|steam|druck|d(ü|u|ue)se|nozzle|bett|bed_temp|cpu|chip|board|akku|batter|k(ü|u|ue)hl|gefrier|fridge|freezer|sauna|grill|soil|boden|ziel|target|soll|setpoint/i;
const OUTSIDE = /au(ß|ss)en|outdoor|outside|exterior/i;
const OUTDOOR_ROOM = /garten|garden|terrasse|terrace|patio|balkon|balcony|einfahrt|driveway|hof|yard|outdoor|au(ß|ss)en|pool|carport/i;
const PREFERRED = /heizung|thermostat|raum|room|zimmer|klima|wandthermostat|bwth|climate/i;

const isOutdoorRoom = (area) => OUTDOOR_ROOM.test(`${area.name || ""} ${area.floor?.name || ""}`);

function roomTemperature(hass, area, ids) {
  const outdoor = isOutdoorRoom(area);
  const label = (id) => `${hass.states[id]?.attributes.friendly_name || ""} ${id}`;
  const plausible = (id) => {
    const v = Number(hass.states[id]?.state);
    return !Number.isFinite(v) || (v > -35 && v < 50);
  };
  const ok = ids.filter((id) => !NOT_AIR.test(label(id)) && plausible(id)
    // Outside only an outdoor sensor counts; inside an outdoor sensor (heat pump's) does not.
    && (outdoor ? OUTSIDE.test(label(id)) : !OUTSIDE.test(label(id))));
  const score = (id) => (PREFERRED.test(label(id)) ? 0 : 1) + (/\bac\b|klimaanlage/i.test(label(id)) ? 1 : 0);
  return ok.sort((a, b) => score(a) - score(b))[0] || null;
}

/** Every entity HausPanel could show, before the global hide rules. */
export function candidateEntities(hass) {
  const out = [];
  for (const id of Object.keys(hass.states)) {
    const reg = hass.entities?.[id];
    if (reg?.hidden || reg?.entity_category) continue;
    if (ADDABLE.has(domainOf(id))) out.push(id);
  }
  return out;
}

export function buildModel(hass, hide) {
  const hidden = hideMatcher(hass, hide);
  const areas = new Map();
  const floors = hass.floors || {};
  for (const a of Object.values(hass.areas || {})) {
    areas.set(a.area_id, {
      id: a.area_id,
      name: a.name,
      icon: a.icon || "mdi:texture-box",
      floor: a.floor_id ? floors[a.floor_id] : undefined,
      tiles: [],
      scenes: [],
      sensors: [],
      temperature: a.temperature_entity_id || null,
      humidity: a.humidity_entity_id || null,
      all: [],
    });
  }
  const model = {
    areas: [],
    areaById: areas,
    areaOf: {},
    unassigned: { id: "_other", name: null, icon: "mdi:home-outline", tiles: [], scenes: [], sensors: [], all: [] },
    weather: [],
    calendars: [],
    todos: [],
    media: [],
    security: [],
    lights: [],
    spotify: [],
    all: [],
  };

  const seen = new Set();
  const consider = (entityId, reg) => {
    if (seen.has(entityId)) return;
    seen.add(entityId);
    const st = hass.states[entityId];
    if (!st) return;
    const domain = domainOf(entityId);
    if (domain === "weather") model.weather.push(entityId);
    if (domain === "calendar") model.calendars.push(entityId);
    if (domain === "todo" && entityId !== "todo.shopping_list_disabled") model.todos.push(entityId);
    if (reg?.hidden || reg?.entity_category) return;
    // Browser Mod: the browsers (tablets, laptops) themselves, with a "screen" light, a media player and a
    // camera per browser tab. They are no devices of the house and stay out of rooms and security.
    if (reg?.platform === "browser_mod") return;
    if (!ADDABLE.has(domain)) return;
    if (hidden(entityId)) return;
    if (isHelperGroup(hass, entityId, reg)) return;

    const dev = reg?.device_id ? hass.devices[reg.device_id] : undefined;
    const areaId = reg?.area_id || dev?.area_id || null;
    const area = (areaId && areas.get(areaId)) || model.unassigned;
    model.areaOf[entityId] = area.id;
    area.all.push(entityId);
    model.all.push(entityId);

    if (domain === "light") model.lights.push(entityId);
    if (domain === "media_player") {
      model.media.push(entityId);
      if (reg?.platform === "spotify") model.spotify.push(entityId);
    }
    if (domain === "lock" || domain === "alarm_control_panel") model.security.push(entityId);
    if (domain === "binary_sensor" && SECURITY_BINARY.has(st.attributes.device_class)) model.security.push(entityId);
    if (domain === "camera") model.security.push(entityId);

    if (domain === "scene") area.scenes.push(entityId);
    else if (TILE_DOMAINS.includes(domain)) {
      // Scripts only show up when they belong to a room.
      if (domain !== "script" || area !== model.unassigned) area.tiles.push(entityId);
    } else if (domain === "sensor" || domain === "binary_sensor") {
      area.sensors.push(entityId);
      const dc = st.attributes.device_class;
      if (dc === "temperature") (area._temps ||= []).push(entityId);
      if (dc === "humidity" && !area.humidity) area.humidity = entityId;
    }
  };

  for (const [id, reg] of Object.entries(hass.entities || {})) consider(id, reg);
  // Entities without a registry entry (no unique_id) still count for a few domains.
  for (const id of Object.keys(hass.states)) {
    const d = domainOf(id);
    if (d === "calendar" || d === "todo" || (ADDABLE.has(d) && d !== "sensor" && d !== "binary_sensor" && d !== "update")) consider(id, undefined);
  }

  const rank = (id) => {
    const i = TILE_DOMAINS.indexOf(domainOf(id));
    return i === -1 ? 99 : i;
  };
  const byName = (a, b) =>
    rank(a) - rank(b) ||
    (hass.states[a]?.attributes.friendly_name || a).localeCompare(hass.states[b]?.attributes.friendly_name || b);

  // The house's own outdoor sensor (one without a room) stands in for gardens and driveways without one.
  const outdoorFallback = roomTemperature(hass, { name: "outdoor" }, model.unassigned._temps || []);
  for (const area of [...areas.values(), model.unassigned]) {
    area.tiles.sort(byName);
    area.scenes.sort(byName);
    // HA's own choice (area settings) wins; otherwise the best room sensor, never a pool, oven or flow pipe.
    if (!area.temperature) area.temperature = roomTemperature(hass, area, area._temps || [])
      || (area !== model.unassigned && isOutdoorRoom(area) ? outdoorFallback : null);
    delete area._temps;
  }
  model.areas = [...areas.values()].sort(
    (a, b) => (a.floor?.level ?? 0) - (b.floor?.level ?? 0) || a.name.localeCompare(b.name)
  );
  model.security.sort(byName);
  return model;
}

/** Signature of the parts of hass that change the model (registries), not states. */
export function registrySignature(hass) {
  return [hass.areas, hass.devices, hass.entities, hass.floors];
}

export function isOn(st) {
  if (!st) return false;
  const s = st.state;
  switch (domainOf(st.entity_id)) {
    case "cover":
    case "valve":
      return s === "open" || s === "opening" || s === "closing";
    case "climate":
    case "water_heater":
      return s !== "off" && s !== "unavailable";
    case "media_player":
      return s === "playing" || s === "paused" || s === "on" || s === "buffering";
    case "lock":
      return s === "unlocked" || s === "open" || s === "opening" || s === "jammed";
    case "vacuum":
    case "lawn_mower":
      return s === "cleaning" || s === "mowing" || s === "returning";
    case "alarm_control_panel":
      return s.startsWith("armed") || s === "triggered";
    case "binary_sensor":
    case "light":
    case "switch":
    case "fan":
    case "input_boolean":
    case "humidifier":
    case "siren":
      return s === "on";
    case "script":
      return s === "on";
    default:
      return false;
  }
}
