// Waste collection: which calendars count, what kind of bin, and which pickups show.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { wasteSources, wasteKind, loadPickups, whenText } = await import(LIB + "waste.js");

const NOW = new Date(2026, 10, 9, 10, 0); // Monday 9 Nov 2026, 10:00
const day = (d) => `2026-11-${String(d).padStart(2, "0")}`;

test("waste calendars and day-count sensors are found, other calendars not", () => {
  const hass = fakeHass({
    entities: { "calendar.home_wcs": { platform: "waste_collection_schedule" } },
    states: {
      "calendar.home_wcs": "off",
      "calendar.abfallkalender": "off",
      "calendar.family": "off",
      "sensor.muell_gelb": { state: "1", attributes: { daysTo: 1 } },
      "sensor.outside_temp": { state: "4", attributes: {} },
    },
  });
  const w = wasteSources(hass);
  assert.deepEqual(w.calendars.sort(), ["calendar.abfallkalender", "calendar.home_wcs"]);
  assert.deepEqual(w.sensors, ["sensor.muell_gelb"]);
});

test("the kind of bin from its name, in several languages", () => {
  assert.equal(wasteKind("Gelbe Tonne").kind, "yellow");
  assert.equal(wasteKind("Wertstoffe").kind, "yellow");
  assert.equal(wasteKind("Papiertonne").kind, "paper");
  assert.equal(wasteKind("Biomüll").kind, "bio");
  assert.equal(wasteKind("Restmüll").kind, "rest");
  assert.equal(wasteKind("General waste").kind, "rest");
  assert.equal(wasteKind("Glass").kind, "glass");
  assert.equal(wasteKind("Sperrmüll").kind, "bulky");
  assert.equal(wasteKind("GFT").kind, "bio");
  assert.equal(wasteKind("Something else").kind, "other");
});

test("pickups from calendars and sensors, sorted, without doubles and only the next two weeks", async () => {
  const hass = fakeHass({ states: {
    "calendar.abfall": "off",
    "sensor.waste_paper": { state: "3", attributes: { daysTo: 3, types: ["Papier"] } },
  } });
  const events = [
    { summary: "Gelbe Tonne", start: { date: day(10) } },
    { summary: "Gelbe Tonne", start: { date: day(10) } }, // twice in the calendar
    { summary: "Restmüll", start: { dateTime: `${day(9)}T06:00:00` } },
    { summary: "Biomüll", start: { date: day(30) } }, // too far
    { summary: "Glas", start: { date: day(2) } }, // in the past
  ];
  const list = await loadPickups(hass, async () => events, { now: NOW });
  assert.deepEqual(list.map((p) => [p.key, p.what, p.kind]), [
    [day(9), "Restmüll", "rest"],
    [day(10), "Gelbe Tonne", "yellow"],
    [day(12), "Papier", "paper"],
  ]);
});

test("a calendar that fails doesn't stop the others", async () => {
  const hass = fakeHass({ states: { "calendar.abfall_a": "off", "calendar.abfall_b": "off" } });
  const list = await loadPickups(hass, async (cal) => {
    if (cal === "calendar.abfall_a") throw new Error("offline");
    return [{ summary: "Papier", start: { date: day(11) } }];
  }, { now: NOW });
  assert.deepEqual(list.map((p) => p.what), ["Papier"]);
});

test("today and tomorrow are named, later days get a weekday", () => {
  const hass = fakeHass();
  assert.equal(whenText(hass, new Date(2026, 10, 9), NOW), "Today");
  assert.equal(whenText(hass, new Date(2026, 10, 10), NOW), "Tomorrow");
  assert.match(whenText(hass, new Date(2026, 10, 12), NOW), /Thursday/);
});

test("the same pickup from two calendars shows once", async () => {
  const hass = fakeHass({ states: { "calendar.abfall_a": "off", "calendar.abfall_b": "off" } });
  const list = await loadPickups(hass, async (cal) => cal === "calendar.abfall_a"
    ? [{ summary: "Biotonne", start: { date: day(16) } }, { summary: "Restmüll", start: { date: day(16) } }]
    : [{ summary: "Biotonne in Sometown", start: { date: day(16) } }, { summary: "Restmüll in Sometown", start: { date: day(16) } }], { now: NOW });
  assert.deepEqual(list.map((p) => p.what), ["Biotonne", "Restmüll"]);
});
