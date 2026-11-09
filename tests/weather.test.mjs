// The heads-up in Leaving home and Good night: open windows and rain, a storm or frost coming.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { weatherWarning, openWindows } = await import(LIB + "weather.js");

const hours = (list) => list.map((x, i) => ({ datetime: new Date(Date.now() + i * 3600e3).toISOString(), temperature: 10, precipitation_probability: 0, condition: "cloudy", ...x }));
const ctx = (windowOpen, hourly, unit) => ({
  hass: fakeHass({ unit, states: {
    "binary_sensor.kitchen_window": { state: windowOpen ? "on" : "off", attributes: { device_class: "window" } },
    "binary_sensor.front_door": { state: "on", attributes: { device_class: "door" } },
  } }),
  weather: { hourly },
});

test("only windows count, not doors", () => {
  assert.deepEqual(openWindows(ctx(true, []).hass), ["binary_sensor.kitchen_window"]);
  assert.deepEqual(openWindows(ctx(false, []).hass), []);
});

test("no open window, no warning", () => {
  assert.equal(weatherWarning(ctx(false, hours([{ precipitation_probability: 90 }]))), null);
});

test("rain coming: a likely shower or a rainy hour", () => {
  assert.match(weatherWarning(ctx(true, hours([{}, { precipitation_probability: 70 }]))).text, /Rain/);
  assert.match(weatherWarning(ctx(true, hours([{}, {}, { condition: "pouring" }]))).text, /Rain/);
  assert.equal(weatherWarning(ctx(true, hours([{ precipitation_probability: 40 }]))), null, "40 % is not enough");
});

test("a thunderstorm comes before rain", () => {
  const w = weatherWarning(ctx(true, hours([{ precipitation_probability: 80 }, { condition: "lightning-rainy" }])));
  assert.match(w.text, /Thunderstorm/);
});

test("frost below 0 °C, or 32 °F", () => {
  assert.match(weatherWarning(ctx(true, hours([{}, { temperature: -1 }]))).text, /Frost/);
  assert.equal(weatherWarning(ctx(true, hours([{ temperature: 1 }]))), null);
  assert.match(weatherWarning(ctx(true, hours([{ temperature: 30 }]), "°F")).text, /Frost/);
  assert.equal(weatherWarning(ctx(true, hours([{ temperature: 40 }]), "°F")), null);
});

test("only the next 12 hours count", () => {
  const later = hours(Array.from({ length: 20 }, (_, i) => (i === 15 ? { precipitation_probability: 95 } : {})));
  assert.equal(weatherWarning(ctx(true, later)), null);
});

test("the number of open windows is in the text", () => {
  assert.match(weatherWarning(ctx(true, hours([{ precipitation_probability: 90 }]))).text, /: 1$/);
});
