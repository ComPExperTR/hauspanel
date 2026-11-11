// Parcels from the parcel integrations: the aggregator wins, delivered ones drop out, the next one first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { LIB, fakeHass } from "./fake.mjs";

const { parcelSensors, incomingParcels, parcelWhen } = await import(LIB + "parcels.js");

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
