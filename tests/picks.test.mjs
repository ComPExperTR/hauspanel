// Picking the right sensors and cameras: meter totals, own energy picks, second camera streams.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { meterSensors } = await import(LIB + "usage.js");
const { withEnergyPicks } = await import(LIB + "energy.js");
const { extraCameras } = await import(LIB + "securityview.js");

test("a three-phase meter gives its total, not phase A", () => {
  const p = (n) => ({ state: "100", attributes: { device_class: "power", friendly_name: n } });
  const hass = fakeHass({
    states: { "sensor.em_phase_a_power": p("EM Phase A power"), "sensor.em_phase_b_power": p("EM Phase B power"), "sensor.em_total_power": p("EM Total power"), "sensor.em_energy": { state: "5", attributes: { device_class: "energy" } } },
    entities: { "sensor.em_phase_a_power": { device_id: "em" }, "sensor.em_phase_b_power": { device_id: "em" }, "sensor.em_total_power": { device_id: "em" }, "sensor.em_energy": { device_id: "em" } },
  });
  assert.equal(meterSensors(hass, "sensor.em_energy").power, "sensor.em_total_power");
});

test("own energy picks replace the power sensors, and a device can be left out", () => {
  const raw = {
    energy_sources: [{ type: "grid", stat_rate: "sensor.wrong", power_config: { stat_rate: "sensor.wrong" } }, { type: "solar", stat_energy_from: "sensor.pv_kwh" }],
    device_consumption: [{ stat_consumption: "sensor.washer_kwh" }, { stat_consumption: "sensor.tv_kwh", stat_rate: "sensor.tv_w" }],
  };
  const out = withEnergyPicks(raw, { grid: "sensor.house_w", solar: "sensor.pv_w", devices: { "sensor.washer_kwh": "sensor.washer_w", "sensor.tv_kwh": "none" } });
  assert.equal(out.energy_sources[0].stat_rate, "sensor.house_w");
  assert.equal(out.energy_sources[0].power_config.stat_rate, "sensor.house_w");
  assert.equal(out.energy_sources[1].stat_rate, "sensor.pv_w");
  assert.deepEqual(out.device_consumption, [{ stat_consumption: "sensor.washer_kwh", stat_rate: "sensor.washer_w" }]);
  assert.equal(raw.energy_sources[0].stat_rate, "sensor.wrong", "Home Assistant's settings stay as they are");
  assert.equal(withEnergyPicks(raw, null), raw, "no picks, nothing changes");
});

test("second streams and still pictures are extra, a camera of its own is not", () => {
  const cam = (n) => ({ state: "idle", attributes: { friendly_name: n } });
  const hass = fakeHass({
    states: {
      "camera.drive_clear": cam("Drive Clear"), "camera.drive_fluent": cam("Drive Fluent"),
      "camera.yard_high": cam("Yard High"), "camera.yard_low": cam("Yard Low"),
      "camera.garden": cam("Garden"), "camera.garden_person": cam("Garden person"),
      "camera.nvr_1": cam("NVR 1"), "camera.nvr_2": cam("NVR 2"),
      "camera.lonely_sub": cam("Lonely sub"),
    },
    entities: {
      "camera.drive_clear": { device_id: "d" }, "camera.drive_fluent": { device_id: "d" },
      "camera.yard_high": { device_id: "y" }, "camera.yard_low": { device_id: "y" },
      "camera.garden": { device_id: "g" }, "camera.nvr_1": { device_id: "n" }, "camera.nvr_2": { device_id: "n" },
      "camera.lonely_sub": { device_id: "l" },
    },
  });
  const extra = extraCameras(hass, Object.keys(hass.states));
  assert.deepEqual([...extra].sort(), ["camera.drive_fluent", "camera.garden_person", "camera.yard_low"]);
});
