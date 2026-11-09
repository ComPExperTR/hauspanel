// Maintenance: devices that went quiet and consumables that are nearly used up; setup hints in the settings.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { quietAndWorn, SILENT_HOURS } = await import(LIB + "catsheets.js");
const { setupHints } = await import(LIB + "hints.js");
const { buildModel } = await import(LIB + "model.js");

const NOW = Date.parse("2026-11-09T12:00:00Z");
const ago = (h) => new Date(NOW - h * 3600e3).toISOString();

test("a chatty sensor without news for two days is quiet, a recent one is not", () => {
  const hass = fakeHass({
    entities: { "sensor.cellar_temp": { device_id: "d1" }, "sensor.cellar_hum": { device_id: "d1" }, "sensor.office_temp": { device_id: "d2" } },
    states: {
      "sensor.cellar_temp": { state: "12", last_updated: ago(SILENT_HOURS + 5), attributes: { device_class: "temperature" } },
      "sensor.cellar_hum": { state: "60", last_updated: ago(SILENT_HOURS + 5), attributes: { device_class: "humidity" } },
      "sensor.office_temp": { state: "21", last_updated: ago(2), attributes: { device_class: "temperature" } },
      "sensor.energy_total": { state: "1234", last_updated: ago(500), attributes: { device_class: "energy" } },
    },
  });
  const { silent } = quietAndWorn(hass, { now: NOW });
  assert.deepEqual(silent.map((x) => x.dev), ["d1"], "one entry per device, energy totals don't count");
});

test("unavailable, ignored or offline devices are not called quiet", () => {
  const hass = fakeHass({
    entities: { "sensor.a": { device_id: "a" }, "sensor.b": { device_id: "b" }, "sensor.c": { device_id: "c" } },
    states: {
      "sensor.a": { state: "unavailable", last_updated: ago(100), attributes: { device_class: "temperature" } },
      "sensor.b": { state: "20", last_updated: ago(100), attributes: { device_class: "temperature" } },
      "sensor.c": { state: "20", last_updated: ago(100), attributes: { device_class: "temperature" } },
    },
  });
  const { silent } = quietAndWorn(hass, { now: NOW, ignored: new Set(["b"]), offlineDev: new Set(["c"]) });
  assert.deepEqual(silent, []);
});

test("filters, brushes and ink at 10 % or less need replacing", () => {
  const hass = fakeHass({ states: {
    "sensor.vacuum_filter_left": { state: "8", attributes: { unit_of_measurement: "%" } },
    "sensor.vacuum_main_brush_left": { state: "55", attributes: { unit_of_measurement: "%" } },
    "sensor.printer_black_ink": { state: "4", attributes: { unit_of_measurement: "%" } },
    "sensor.phone_battery": { state: "5", attributes: { unit_of_measurement: "%", device_class: "battery" } },
    "sensor.humidity_bath": { state: "9", attributes: { unit_of_measurement: "%" } },
  } });
  const { consumables } = quietAndWorn(hass, { now: NOW });
  assert.deepEqual(consumables.map((x) => x.id).sort(), ["sensor.printer_black_ink", "sensor.vacuum_filter_left"]);
});

test("setup hints: devices without a room, rooms without a floor, cameras down", () => {
  const hass = fakeHass({
    floors: { g: { floor_id: "g", name: "Ground", level: 0 } },
    areas: { kitchen: { area_id: "kitchen", name: "Kitchen", floor_id: "g" }, shed: { area_id: "shed", name: "Shed" } },
    entities: { "light.k": { area_id: "kitchen" }, "light.loose": {}, "camera.yard": { area_id: "shed" } },
    states: { "light.k": "on", "light.loose": "off", "camera.yard": "unavailable" },
  });
  const ctx = { hass, model: buildModel(hass, {}) };
  const hints = Object.fromEntries(setupHints(ctx).map((x) => [x.key, x.n]));
  assert.deepEqual(hints, { no_room: 1, no_floor: 1, cams_down: 1 });
});

test("a tidy house has no hints", () => {
  const hass = fakeHass({
    areas: { kitchen: { area_id: "kitchen", name: "Kitchen" } },
    entities: { "light.k": { area_id: "kitchen" } },
    states: { "light.k": "on" },
  });
  assert.deepEqual(setupHints({ hass, model: buildModel(hass, {}) }), []);
});
