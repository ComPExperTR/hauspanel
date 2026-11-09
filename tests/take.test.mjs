// Taking settings from another panel: "house" copies only what is about the house, "all" everything.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB } from "./fake.mjs";

const { takeSettings, HOUSE_KEYS } = await import(LIB + "store.js");

const mobile = {
  hide: { entities: ["light.x"], domains: [], platforms: [], patterns: ["*_battery"] },
  secAllow: { "cover.gate": { from: "07:00", to: "19:00", days: [] } },
  doorbell: { enabled: true, camera: "camera.door" },
  calendars: ["calendar.family"],
  look: { background: "forest" },
  catOrder: ["leave", "light"],
  containers: { "security:cameras": { hidden: ["camera.yard"] }, "room:kitchen": { order: ["light.a", "light.b"] } },
};
const panel = {
  hide: { entities: [], domains: ["button"], platforms: [], patterns: [] },
  look: { background: "ember" },
  catOrder: ["light", "leave"],
  roomPopup: false,
  containers: { "security:cameras": { hidden: [] }, "room:kitchen": { order: ["light.b", "light.a"] }, "home": { order: ["room:kitchen"] } },
  nightCheck: true,
};

test("house settings come over, looks and order stay", () => {
  const out = takeSettings(panel, mobile, "house");
  assert.deepEqual(out.hide, mobile.hide);
  assert.deepEqual(out.secAllow, mobile.secAllow);
  assert.deepEqual(out.doorbell, mobile.doorbell);
  assert.deepEqual(out.calendars, mobile.calendars);
  assert.deepEqual(out.containers["security:cameras"], mobile.containers["security:cameras"], "cameras of the Security page");
  assert.deepEqual(out.look, panel.look, "look stays");
  assert.deepEqual(out.catOrder, panel.catOrder, "chip order stays");
  assert.equal(out.roomPopup, false, "room opening stays");
  assert.deepEqual(out.containers["room:kitchen"], panel.containers["room:kitchen"], "room order stays");
  assert.deepEqual(out.containers.home, panel.containers.home);
});

test("a house setting the other panel doesn't have is dropped, not kept", () => {
  const out = takeSettings(panel, mobile, "house");
  assert.equal("nightCheck" in out, false, "nightCheck follows the source, which has none");
});

test("everything replaces everything", () => {
  assert.deepEqual(takeSettings(panel, mobile, "all"), mobile);
});

test("neither panel's settings are changed", () => {
  const before = JSON.stringify([panel, mobile]);
  takeSettings(panel, mobile, "house");
  takeSettings(panel, mobile, "all");
  assert.equal(JSON.stringify([panel, mobile]), before);
});

test("the house list covers hiding, door windows, cameras, doorbell, baby, calendars and weather", () => {
  for (const k of ["hide", "secAllow", "doorbell", "baby", "calendars", "todos", "weather"]) assert.ok(HOUSE_KEYS.includes(k), k);
  for (const k of ["look", "catOrder", "homeStyle", "cats", "roomPopup"]) assert.ok(!HOUSE_KEYS.includes(k), k);
});
