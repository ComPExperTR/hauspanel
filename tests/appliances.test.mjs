// Washers, dryers and dishwashers in a room: no pool pumps, and one machine seen twice shows once.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { appliancesIn } = await import(LIB + "usage.js");

test("a pool's filter pump is no appliance; a machine from two integrations shows once", () => {
  const hass = fakeHass({
    areas: { kitchen: { area_id: "kitchen", name: "Kitchen" }, garden: { area_id: "garden", name: "Garden" } },
    devices: {
      hc: { id: "hc", area_id: "kitchen", name: "Dishwasher" },
      wd: { id: "wd", area_id: "kitchen", name: "Dishwasher" },
      pool: { id: "pool", area_id: "garden", name: "Pool", model: "Pool Manager" },
    },
    entities: {
      "sensor.dishwasher_betriebszustand": { device_id: "hc" },
      "sensor.dishwasher_programm_fortschritt": { device_id: "hc" },
      "sensor.dish_zustand": { device_id: "wd" },
      "sensor.dish_fortschritt": { device_id: "wd" },
      "sensor.dish_verbleibende_zeit": { device_id: "wd" },
      "sensor.dish_aktuelle_leistung": { device_id: "wd" },
      "sensor.pool_filter_pump_state": { device_id: "pool" },
      "sensor.pool_filter_pump_progress": { device_id: "pool" },
    },
    states: {
      "sensor.dishwasher_betriebszustand": "ready", "sensor.dishwasher_programm_fortschritt": "0",
      "sensor.dish_zustand": "off", "sensor.dish_fortschritt": "0", "sensor.dish_verbleibende_zeit": "0", "sensor.dish_aktuelle_leistung": "0",
      "sensor.pool_filter_pump_state": "on", "sensor.pool_filter_pump_progress": "50",
    },
  });
  assert.deepEqual(appliancesIn(hass, "kitchen").map((a) => a.dev), ["wd"], "the one that tells more");
  assert.deepEqual(appliancesIn(hass, "garden"), [], "no pool pump");
});
