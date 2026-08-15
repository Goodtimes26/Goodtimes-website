import assert from "node:assert/strict";
import test from "node:test";
import {
  deduplicateDashboardActivities,
  setlistActivityKey,
} from "../lib/dashboardActivities.ts";

const now = new Date("2026-08-15T12:00:00+02:00");

function setlistActivity(id, entityKey, updatedAt, actorId, isNew = false) {
  return { id, entityKey, kind: "setlist", detail: "SET 1", updatedAt, actorId, isNew };
}

test("houdt per setlist alleen de nieuwste wijziging en de laatste gebruiker", () => {
  const result = deduplicateDashboardActivities([
    setlistActivity("setlist:oud", "setlist:set 1:event:2026-10-10", "2026-08-12T10:00:00+02:00", "eddie"),
    setlistActivity("setlist:nieuw", "setlist:set 1:event:2026-10-10", "2026-08-15T09:30:00+02:00", "esther", true),
  ], now);

  assert.equal(result.length, 1);
  assert.equal(result[0].id, "setlist:nieuw");
  assert.equal(result[0].actorId, "esther");
  assert.equal(result[0].isNew, false);
});

test("houdt verschillende setlists als afzonderlijke meldingen", () => {
  const result = deduplicateDashboardActivities([
    setlistActivity("setlist:1", "setlist:set 1::", "2026-08-15T09:30:00+02:00", "eddie"),
    setlistActivity("setlist:2", "setlist:set 2::", "2026-08-14T09:30:00+02:00", "joost"),
    setlistActivity("setlist:3", "setlist:set 3::", "2026-08-13T09:30:00+02:00", "eric"),
  ], now);

  assert.deepEqual(result.map((activity) => activity.id), ["setlist:1", "setlist:2", "setlist:3"]);
});

test("behoudt Nieuwe setlist voor een werkelijk nieuw, enkel record", () => {
  const result = deduplicateDashboardActivities([
    setlistActivity("setlist:nieuw", "setlist:nieuwe set::", "2026-08-15T09:30:00+02:00", "eddie", true),
  ], now);

  assert.equal(result.length, 1);
  assert.equal(result[0].isNew, true);
});

test("verbergt meldingen die ouder zijn dan veertien dagen", () => {
  const result = deduplicateDashboardActivities([
    setlistActivity("setlist:recent", "setlist:recent::", "2026-08-01T12:00:00+02:00", "eddie"),
    setlistActivity("setlist:oud", "setlist:oud::", "2026-07-31T12:00:00+02:00", "eddie"),
  ], now);

  assert.deepEqual(result.map((activity) => activity.id), ["setlist:recent"]);
});

test("gebruikt bronidentiteit voor opnieuw geïmporteerde setlists", () => {
  const first = setlistActivityKey({ id: "a", name: "SET 1", eventId: null, setlistDate: null, sourceSystem: "maker", sourceId: "set-1" });
  const second = setlistActivityKey({ id: "b", name: "Andere naam", eventId: null, setlistDate: null, sourceSystem: "maker", sourceId: "set-1" });
  assert.equal(first, second);
});
