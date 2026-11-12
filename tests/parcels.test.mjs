// Parcels from the parcel integrations: the aggregator wins, delivered ones drop out, the next one first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { parcelSensors, incomingParcels, deliveredParcels, parcelChipText, hasParcels, parcelWhen } = await import(LIB + "parcels.js");

const p = (carrier, barcode, status, from, extra = {}) => ({ carrier, barcode, status, planned_from: from, planned_to: from, delivered: status === "delivered", ...extra });

test("the aggregator's list wins over each carrier's own", () => {
  const hass = fakeHass({ states: {
    "sensor.dhl_incoming_parcels": { state: "1", attributes: { parcels: [p("DHL", "1", "in_transit", "2026-11-13T10:00:00Z")] } },
    "sensor.parcel_aggregator_incoming_parcels": { state: "1", attributes: { parcels: [p("DHL", "1", "in_transit", "2026-11-13T10:00:00Z")] } },
    "sensor.outside_temperature": "4",
  } });
  assert.deepEqual(parcelSensors(hass), ["sensor.parcel_aggregator_incoming_parcels"]);
});

test("delivered parcels drop out, twins count once, the next one comes first", () => {
  const hass = fakeHass({ states: {
    "sensor.dhl_incoming_parcels": { state: "3", attributes: { parcels: [
      p("DHL", "a", "in_transit", "2026-11-15T10:00:00Z"), p("DHL", "b", "delivered", "2026-11-10T10:00:00Z"), p("DHL", "c", "registered", null)] } },
    "sensor.gls_incoming_parcels": { state: "2", attributes: { parcels: [p("GLS", "d", "out_for_delivery", "2026-11-12T08:00:00Z"), p("GLS", "d", "out_for_delivery", "2026-11-12T08:00:00Z")] } },
  } });
  assert.deepEqual(incomingParcels(hass).map((x) => x.barcode), ["d", "a", "c"]);
});

test("today and tomorrow say so, no date says nothing", () => {
  const hass = fakeHass();
  const now = new Date(2026, 10, 12, 9, 0);
  assert.match(parcelWhen(hass, { planned_from: new Date(2026, 10, 12, 14).toISOString(), planned_to: new Date(2026, 10, 12, 16).toISOString() }, now), /^Today 14:00–16:00$/);
  assert.equal(parcelWhen(hass, { planned_from: new Date(2026, 10, 13).toISOString() }, now), "Tomorrow");
  assert.equal(parcelWhen(hass, {}, now), "");
});

test("delivered in the last two days, and what the chip says", () => {
  const now = new Date(2026, 10, 12, 9, 0);
  const hass = fakeHass({ states: {
    "sensor.parcel_aggregator_delivered_parcels": { state: "2", attributes: { parcels: [
      { carrier: "DHL", barcode: "x", status: "delivered", delivered: true, delivered_at: new Date(2026, 10, 11, 15).toISOString() },
      { carrier: "DHL", barcode: "y", status: "delivered", delivered: true, delivered_at: new Date(2026, 10, 1, 15).toISOString() }] } },
  } });
  assert.equal(hasParcels(hass), true);
  const done = deliveredParcels(hass, now.getTime());
  assert.deepEqual(done.map((p) => p.barcode), ["x"], "older than two days drops out");
  assert.equal(parcelChipText(hass, [], done, now), "1 delivered");
  const one = [{ carrier: "GLS", status: "in_transit", planned_from: new Date(2026, 10, 13).toISOString() }];
  assert.equal(parcelChipText(hass, one, done, now), "Tomorrow");
  assert.equal(parcelChipText(hass, [...one, ...one], done, now), "2 on the way");
  assert.equal(parcelChipText(hass, [], [], now), "");
  assert.equal(hasParcels(fakeHass()), false);
});
