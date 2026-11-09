// Doors, gates and locks: when they count as a warning, and the "may be open" time windows.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass, at } from "./fake.mjs";

const sv = await import(LIB + "securityview.js");
const rules = {};
sv.setSecAllowSource(() => rules);
const setRule = (id, r) => { for (const k of Object.keys(rules)) delete rules[k]; if (r) rules[id] = r; };

test("a daytime window allows inside and not outside", () => {
  setRule("cover.gate", { from: "07:00", to: "19:00", days: [] });
  assert.equal(sv.allowedNow("cover.gate", at(1, "07:00")), true, "starts at 07:00");
  assert.equal(sv.allowedNow("cover.gate", at(1, "12:30")), true);
  assert.equal(sv.allowedNow("cover.gate", at(1, "18:59")), true);
  assert.equal(sv.allowedNow("cover.gate", at(1, "19:00")), false, "ends before 19:00");
  assert.equal(sv.allowedNow("cover.gate", at(1, "06:59")), false);
});

test("a window over midnight belongs to the day it starts", () => {
  setRule("lock.door", { from: "22:00", to: "06:00", days: [5] }); // Friday night only
  assert.equal(sv.allowedNow("lock.door", at(5, "23:30")), true, "Friday 23:30");
  assert.equal(sv.allowedNow("lock.door", at(6, "05:00")), true, "Saturday 05:00 is still Friday night");
  assert.equal(sv.allowedNow("lock.door", at(6, "07:00")), false, "Saturday 07:00");
  assert.equal(sv.allowedNow("lock.door", at(6, "23:30")), false, "Saturday night is not allowed");
  assert.equal(sv.allowedNow("lock.door", at(5, "05:00")), false, "Friday 05:00 belongs to Thursday night");
});

test("weekdays limit a window, no weekdays means every day", () => {
  setRule("cover.gate", { from: "08:00", to: "18:00", days: [1, 2, 3, 4, 5] });
  assert.equal(sv.allowedNow("cover.gate", at(3, "10:00")), true, "Wednesday");
  assert.equal(sv.allowedNow("cover.gate", at(0, "10:00")), false, "Sunday");
  setRule("cover.gate", { from: "08:00", to: "18:00" });
  assert.equal(sv.allowedNow("cover.gate", at(0, "10:00")), true, "Sunday without a weekday list");
});

test("broken or missing rules never allow", () => {
  setRule("cover.gate", null);
  assert.equal(sv.allowedNow("cover.gate", at(1, "12:00")), false);
  setRule("cover.gate", { from: "", to: "19:00" });
  assert.equal(sv.allowedNow("cover.gate", at(1, "12:00")), false, "empty start");
  setRule("cover.gate", { from: "7", to: "19:00" });
  assert.equal(sv.allowedNow("cover.gate", at(1, "12:00")), false, "no minutes");
  setRule("cover.gate", { from: "07:00", to: "25:00" });
  assert.equal(sv.allowedNow("cover.gate", at(1, "12:00")), false, "no such time");
  setRule("cover.gate", { from: "00:00", to: "24:00" });
  assert.equal(sv.allowedNow("cover.gate", at(1, "23:59")), true, "the whole day");
});

test("what counts as a warning", () => {
  setRule("x", null);
  const hass = fakeHass({ states: {
    "lock.front": "unlocked", "lock.back": "locked",
    "cover.garage": "open", "cover.gate": "closed",
    "binary_sensor.window": { state: "on", attributes: { device_class: "window" } },
    "binary_sensor.door": { state: "off", attributes: { device_class: "door" } },
    "alarm_control_panel.home": "armed_away",
  } });
  assert.equal(sv.isAlert(hass, "lock.front"), true, "unlocked lock");
  assert.equal(sv.isAlert(hass, "lock.back"), false);
  assert.equal(sv.isAlert(hass, "cover.garage"), true, "open garage");
  assert.equal(sv.isAlert(hass, "cover.gate"), false);
  assert.equal(sv.isAlert(hass, "binary_sensor.window"), true, "open window");
  assert.equal(sv.isAlert(hass, "binary_sensor.door"), false);
  assert.equal(sv.isAlert(hass, "alarm_control_panel.home"), false, "armed is fine");
  assert.equal(sv.isAlert(hass, "lock.missing"), false, "unknown entity");
});

test("an allowed window silences the warning, but never a triggered alarm", () => {
  const hass = fakeHass({ states: { "cover.gate": "open", "alarm_control_panel.home": "triggered" } });
  const now = new Date();
  const hhmm = (d) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  const from = new Date(now.getTime() - 3600e3), to = new Date(now.getTime() + 3600e3);
  for (const id of ["cover.gate", "alarm_control_panel.home"]) rules[id] = { from: hhmm(from), to: hhmm(to), days: [] };
  if (from.getDate() !== to.getDate()) return; // close to midnight the window crosses days; covered above
  assert.equal(sv.isAlert(hass, "cover.gate"), false, "open gate inside its window");
  assert.equal(sv.isAllowedOpen(hass, "cover.gate"), true);
  assert.equal(sv.isAlert(hass, "alarm_control_panel.home"), true, "a triggered alarm always warns");
});
