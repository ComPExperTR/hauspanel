// Notices: own entities that show on Home only while they say so.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { noticeActive, activeNotices, parseWhen } = await import(LIB + "notices.js");

test("a helper or switch shows while it is on", () => {
  const hass = fakeHass({ states: { "input_boolean.mail": "on", "binary_sensor.letterbox": "off", "switch.x": "unavailable" } });
  assert.equal(noticeActive(hass.states["input_boolean.mail"], { id: "input_boolean.mail" }), true);
  assert.equal(noticeActive(hass.states["binary_sensor.letterbox"], { id: "binary_sensor.letterbox" }), false);
  assert.equal(noticeActive(hass.states["switch.x"], { id: "switch.x" }), false);
});

test("a sensor shows at the states you enter, numbers compared", () => {
  const hass = fakeHass({ states: { "sensor.washer": "Finished", "sensor.mail_count": "2", "sensor.tank": "15,5" } });
  assert.equal(noticeActive(hass.states["sensor.washer"], { when: ["finished"] }), true, "case does not matter");
  assert.equal(noticeActive(hass.states["sensor.washer"], { when: [] }), false, "a sensor without states never shows");
  assert.equal(noticeActive(hass.states["sensor.mail_count"], { when: [">0"] }), true);
  assert.equal(noticeActive(hass.states["sensor.mail_count"], { when: [">=3"] }), false);
  assert.equal(noticeActive(hass.states["sensor.washer"], { when: ["<20"] }), false, "text is no number");
  assert.deepEqual(parseWhen(" done, finished ;  >0 ,"), ["done", "finished", ">0"]);
});

test("only the active notices, in their order", () => {
  const hass = fakeHass({ states: { "input_boolean.b": "on", "input_boolean.a": "on", "input_boolean.c": "off" } });
  const list = [{ id: "input_boolean.b" }, { id: "input_boolean.c" }, { id: "input_boolean.a" }, { id: "input_boolean.gone" }];
  assert.deepEqual(activeNotices(hass, list).map((n) => n.id), ["input_boolean.b", "input_boolean.a"]);
  assert.deepEqual(activeNotices(hass, undefined), []);
});
