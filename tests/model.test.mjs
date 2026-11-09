// Rooms: which device lands in which room, floors, hiding and the room temperature.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { buildModel, hideMatcher } = await import(LIB + "model.js");

const house = () => fakeHass({
  floors: { ground: { floor_id: "ground", name: "Ground floor", level: 0 }, upper: { floor_id: "upper", name: "Upper floor", level: 1 } },
  areas: {
    kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
    bedroom: { area_id: "bedroom", name: "Bedroom", floor_id: "upper" },
    attic: { area_id: "attic", name: "Attic", floor_id: "upper" },
  },
  devices: {
    d_lamp: { id: "d_lamp", area_id: "kitchen", name: "Ceiling lamp" },
    d_shade: { id: "d_shade", area_id: "bedroom", name: "Shade" },
  },
  entities: {
    "light.ceiling": { entity_id: "light.ceiling", device_id: "d_lamp", platform: "hue" },
    "light.bed_lamp": { entity_id: "light.bed_lamp", area_id: "bedroom", device_id: "d_lamp", platform: "hue" },
    "cover.bedroom_shade": { entity_id: "cover.bedroom_shade", device_id: "d_shade", platform: "shelly" },
    "light.loose": { entity_id: "light.loose", platform: "hue" },
    "switch.diagnostic": { entity_id: "switch.diagnostic", device_id: "d_lamp", platform: "hue", entity_category: "config" },
    "switch.secret": { entity_id: "switch.secret", device_id: "d_lamp", platform: "hue", hidden: true },
    "sensor.kitchen_temp": { entity_id: "sensor.kitchen_temp", area_id: "kitchen", platform: "zha" },
    "scene.kitchen_evening": { entity_id: "scene.kitchen_evening", area_id: "kitchen", platform: "homeassistant" },
  },
  states: {
    "light.ceiling": "on",
    "light.bed_lamp": "off",
    "cover.bedroom_shade": { state: "open", attributes: { current_position: 40 } },
    "light.loose": "off",
    "switch.diagnostic": "off",
    "switch.secret": "off",
    "sensor.kitchen_temp": { state: "21.5", attributes: { device_class: "temperature", unit_of_measurement: "°C" } },
    "scene.kitchen_evening": "unknown",
  },
});

test("a device's area puts it in that room", () => {
  const m = buildModel(house(), {});
  assert.deepEqual(m.areaById.get("kitchen").tiles, ["light.ceiling"]);
  assert.equal(m.areaOf["light.ceiling"], "kitchen");
});

test("an entity's own area wins over its device's area", () => {
  const m = buildModel(house(), {});
  assert.equal(m.areaOf["light.bed_lamp"], "bedroom");
  assert.ok(m.areaById.get("bedroom").tiles.includes("light.bed_lamp"));
});

test("devices without an area land in Other", () => {
  const m = buildModel(house(), {});
  assert.equal(m.areaOf["light.loose"], "_other");
  assert.ok(m.unassigned.tiles.includes("light.loose"));
});

test("hidden and configuration entities stay out", () => {
  const m = buildModel(house(), {});
  assert.equal(m.areaOf["switch.diagnostic"], undefined, "entity_category config");
  assert.equal(m.areaOf["switch.secret"], undefined, "hidden in Home Assistant");
});

test("rooms are sorted by floor, then by name", () => {
  const m = buildModel(house(), {});
  assert.deepEqual(m.areas.map((a) => a.id), ["kitchen", "attic", "bedroom"]);
  assert.equal(m.areaById.get("bedroom").floor.name, "Upper floor");
});

test("scenes and the room temperature belong to their room", () => {
  const m = buildModel(house(), {});
  const k = m.areaById.get("kitchen");
  assert.deepEqual(k.scenes, ["scene.kitchen_evening"]);
  assert.equal(k.temperature, "sensor.kitchen_temp");
  assert.ok(!k.tiles.includes("sensor.kitchen_temp"), "a sensor is no tile");
});

test("Settings → Hiding: one by one, by type, by integration, by text", () => {
  const hass = house();
  const byEntity = buildModel(hass, { entities: ["light.ceiling"] });
  assert.equal(byEntity.areaOf["light.ceiling"], undefined);
  const byDomain = buildModel(hass, { domains: ["light"] });
  assert.equal(byDomain.lights.length, 0);
  assert.ok(byDomain.areaById.get("bedroom").tiles.includes("cover.bedroom_shade"));
  const byPlatform = buildModel(hass, { platforms: ["shelly"] });
  assert.equal(byPlatform.areaOf["cover.bedroom_shade"], undefined);
  const byText = buildModel(hass, { patterns: ["bed"] });
  assert.equal(byText.areaOf["light.bed_lamp"], undefined);
  assert.equal(byText.areaOf["light.ceiling"], "kitchen");
});

test("text rules: plain text is contained, * is a wildcard over the whole id or name", () => {
  const hass = fakeHass({ states: { "sensor.phone_battery": "80", "sensor.battery_room": "20", "light.desk": "on" } });
  const plain = hideMatcher(hass, { patterns: ["battery"] });
  assert.equal(plain("sensor.phone_battery"), "pattern");
  assert.equal(plain("sensor.battery_room"), "pattern");
  const wild = hideMatcher(hass, { patterns: ["*_battery"] });
  assert.equal(wild("sensor.phone_battery"), "pattern");
  assert.equal(wild("sensor.battery_room"), "", "*_battery needs battery at the end");
  assert.equal(wild("light.desk"), "");
  assert.equal(hideMatcher(hass, { patterns: ["  "] })("light.desk"), "", "an empty rule hides nothing");
});
