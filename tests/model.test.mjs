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

test("Browser Mod (the browsers themselves) stays out of rooms and security", () => {
  const hass = fakeHass({
    areas: { office: { area_id: "office", name: "Office" } },
    entities: {
      "light.browser_mod_abc_screen": { area_id: "office", platform: "browser_mod" },
      "camera.browser_mod_abc": { area_id: "office", platform: "browser_mod" },
      "light.desk": { area_id: "office", platform: "hue" },
    },
    states: { "light.browser_mod_abc_screen": "unavailable", "camera.browser_mod_abc": "unavailable", "light.desk": "on" },
  });
  const m = buildModel(hass, {});
  assert.deepEqual(m.areaById.get("office").tiles, ["light.desk"]);
  assert.ok(!m.security.includes("camera.browser_mod_abc"));
});

test("presence: occupancy sensors count, a motion sensor in the same room is left out", async () => {
  const { roomPresence } = await import(LIB + "model.js");
  const area = (ids) => ({ all: ids });
  const hass = fakeHass({ states: {
    "binary_sensor.office_presence": { state: "on", last_changed: "2026-11-09T16:00:00Z", attributes: { device_class: "occupancy" } },
    "binary_sensor.office_motion": { state: "off", last_changed: "2026-11-09T16:10:00Z", attributes: { device_class: "motion" } },
    "binary_sensor.hall_motion": { state: "off", last_changed: "2026-11-09T15:00:00Z", attributes: { device_class: "motion" } },
    "binary_sensor.attic_presence": { state: "unavailable", attributes: { device_class: "presence" } },
    "binary_sensor.attic_motion": { state: "on", attributes: { device_class: "motion" } },
  } });
  const office = roomPresence(hass, area(["binary_sensor.office_presence", "binary_sensor.office_motion"]));
  assert.equal(office.on, true, "presence says someone is there, the dropped-off motion sensor doesn't count");
  assert.deepEqual(office.ids, ["binary_sensor.office_presence"]);
  assert.equal(roomPresence(hass, area(["binary_sensor.hall_motion"])).on, false, "motion only where there is no presence sensor");
  assert.equal(roomPresence(hass, area(["binary_sensor.attic_presence", "binary_sensor.attic_motion"])), null, "an unavailable presence sensor still rules out motion");
  assert.equal(roomPresence(hass, area([])), null, "no sensor, nothing to say");
});

test("Music Assistant: a player without a room joins its twin's room and stands for it there", () => {
  const hass = fakeHass({
    areas: { office: { area_id: "office", name: "Office" } },
    devices: { ma1: { id: "ma1", name: "Desk Speaker" }, at1: { id: "at1", name: "Desk Speaker", area_id: "office" }, ma2: { id: "ma2", name: "Office TV" }, at2: { id: "at2", name: "Office TV", area_id: "office" } },
    entities: {
      "media_player.desk_speaker": { device_id: "ma1", platform: "music_assistant" },
      "media_player.desk_speaker_2": { device_id: "at1", platform: "apple_tv" },
      "media_player.office_tv_ma": { device_id: "ma2", platform: "music_assistant" },
      "media_player.apple_tv_office": { device_id: "at2", platform: "apple_tv" },
    },
    states: {
      "media_player.desk_speaker": { state: "playing", attributes: { friendly_name: "Desk Speaker" } },
      "media_player.desk_speaker_2": { state: "idle", attributes: { friendly_name: "Desk Speaker" } },
      "media_player.office_tv_ma": { state: "unavailable", attributes: { friendly_name: "Office TV" } },
      "media_player.apple_tv_office": { state: "off", attributes: { friendly_name: "Apple TV Office" } },
    },
  });
  const m = buildModel(hass, {});
  const office = m.areaById.get("office").tiles;
  assert.equal(m.areaOf["media_player.desk_speaker"], "office", "same name");
  assert.ok(office.includes("media_player.desk_speaker"));
  assert.ok(!office.includes("media_player.desk_speaker_2"), "the twin of the same name steps back");
  assert.equal(m.areaOf["media_player.office_tv_ma"], "office", "same device name");
  assert.ok(office.includes("media_player.apple_tv_office"), "a twin with another name, and an unavailable MA player, keep the original");
  assert.ok(!m.unassigned.tiles.some((id) => id.includes("desk_speaker")), "nothing left under Other");
});

test("Music Assistant: a player with no twin and no room gets no tile under Other, but stays a media player", () => {
  const hass = fakeHass({
    devices: { ma: { id: "ma", name: "Receiver" } },
    entities: { "media_player.receiver_ma": { device_id: "ma", platform: "music_assistant" } },
    states: { "media_player.receiver_ma": { state: "playing", attributes: { friendly_name: "Receiver" } } },
  });
  const m = buildModel(hass, {});
  assert.ok(!m.unassigned.tiles.includes("media_player.receiver_ma"));
  assert.ok(m.media.includes("media_player.receiver_ma"), "Home's music card can still show it");
});
