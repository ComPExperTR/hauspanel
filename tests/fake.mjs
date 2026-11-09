// A small stand-in for Home Assistant's hass object, enough for HausPanel's logic.
export const LIB = new URL("../custom_components/hauspanel/frontend/lib/", import.meta.url).href;

/**
 * fakeHass({ states: { "light.x": "on" | { state, attributes } }, areas, floors, devices, entities })
 */
export function fakeHass({ states = {}, areas = {}, floors = {}, devices = {}, entities = {}, unit = "°C" } = {}) {
  const st = {};
  for (const [id, v] of Object.entries(states)) {
    const s = typeof v === "string" ? { state: v, attributes: {} } : { attributes: {}, ...v };
    st[id] = { entity_id: id, ...s, attributes: { friendly_name: id.split(".")[1].replace(/_/g, " "), ...s.attributes } };
  }
  return {
    states: st,
    areas,
    floors,
    devices,
    entities,
    language: "en",
    locale: { language: "en", time_format: "24" },
    config: { unit_system: { temperature: unit }, time_zone: "UTC" },
  };
}

/** A date on a given weekday (0 = Sunday) at hh:mm, local time. */
export function at(weekday, hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(2026, 10, 1, h, m); // 1 Nov 2026 is a Sunday
  d.setDate(d.getDate() + weekday);
  return d;
}
