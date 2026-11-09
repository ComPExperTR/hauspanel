// Shades in the room popup: the position shown, and what a slider sends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { posOf, canPosition, shadeCalls } = await import(LIB + "roompop.js");

const hass = fakeHass({ states: {
  "cover.left": { state: "open", attributes: { current_position: 40, supported_features: 15 } },
  "cover.right": { state: "open", attributes: { current_position: 70, supported_features: 15 } },
  "cover.simple": { state: "closed", attributes: { supported_features: 11 } },
} });

test("position: the shade's own value, else closed 0 and open 100", () => {
  assert.equal(posOf(hass.states["cover.left"]), 40);
  assert.equal(posOf(hass.states["cover.simple"]), 0);
  assert.equal(posOf({ state: "open", attributes: {} }), 100);
  assert.equal(posOf({ state: "open", attributes: { current_position: 0 } }), 0, "0 % stays 0, not 100");
});

test("only shades with the position feature get a slider value", () => {
  assert.equal(canPosition(hass, "cover.left"), true);
  assert.equal(canPosition(hass, "cover.simple"), false);
});

test("0 % closes and 100 % opens, for all of them at once", () => {
  assert.deepEqual(shadeCalls(hass, ["cover.left", "cover.simple"], 0), [["close_cover", ["cover.left", "cover.simple"]]]);
  assert.deepEqual(shadeCalls(hass, ["cover.left", "cover.simple"], 100), [["open_cover", ["cover.left", "cover.simple"]]]);
});

test("in between: a position for those that can, up or down for the others", () => {
  assert.deepEqual(shadeCalls(hass, ["cover.left", "cover.right", "cover.simple"], 30), [
    ["set_cover_position", ["cover.left", "cover.right"], { position: 30 }],
    ["close_cover", ["cover.simple"]],
  ]);
  assert.deepEqual(shadeCalls(hass, ["cover.left", "cover.simple"], 50), [
    ["set_cover_position", ["cover.left"], { position: 50 }],
    ["open_cover", ["cover.simple"]],
  ], "50 % opens a shade without a position");
  assert.deepEqual(shadeCalls(hass, ["cover.simple"], 80), [["open_cover", ["cover.simple"]]]);
});
