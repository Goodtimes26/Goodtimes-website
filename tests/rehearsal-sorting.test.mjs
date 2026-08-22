import assert from "node:assert/strict";
import test from "node:test";
import { sortRehearsalsByDate } from "../lib/rehearsalSorting.ts";

const events = [
  { id: "aug", event_date: "2026-08-27" },
  { id: "sep", event_date: "2026-09-17" },
  { id: "oct", event_date: "2026-10-08" },
  { id: "past", event_date: "2026-07-10" },
];

test("toekomstige repetities staan chronologisch met de eerstvolgende bovenaan", () => {
  const input = [
    { id: "3", event_id: "oct", rehearsal_date: null },
    { id: "2", event_id: "sep", rehearsal_date: null },
    { id: "1", event_id: "aug", rehearsal_date: null },
  ];
  assert.deepEqual(sortRehearsalsByDate(input, events, "2026-08-22").map((row) => row.id), ["1", "2", "3"]);
});

test("gebruikt de zichtbare eventdatum, houdt verstreken repetities onderaan en datumloze items als laatste", () => {
  const input = [
    { id: "zonder", event_id: null, rehearsal_date: null },
    { id: "verstreken", event_id: "past", rehearsal_date: null },
    { id: "los", event_id: null, rehearsal_date: "2026-09-01" },
    { id: "gekoppeld", event_id: "aug", rehearsal_date: "2027-01-01" },
  ];
  assert.deepEqual(sortRehearsalsByDate(input, events, "2026-08-22").map((row) => row.id), ["gekoppeld", "los", "verstreken", "zonder"]);
});

test("sorteert opnieuw wanneer een repetitiedatum wordt gewijzigd", () => {
  const input = [
    { id: "a", event_id: null, rehearsal_date: "2026-09-17" },
    { id: "b", event_id: null, rehearsal_date: "2026-10-08" },
  ];
  const changed = input.map((row) => row.id === "b" ? { ...row, rehearsal_date: "2026-08-27" } : row);
  assert.deepEqual(sortRehearsalsByDate(changed, [], "2026-08-22").map((row) => row.id), ["b", "a"]);
});
