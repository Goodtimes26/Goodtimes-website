import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const { amsterdamIsoDate, nextFutureRehearsal } = await import("../lib/rehearsalSorting.ts");

test("homepage chooses only the first rehearsal from today onward", () => {
  const rehearsals = [
    { id: "r3", event_id: null, name: "8 oktober", rehearsal_date: "2026-10-08" },
    { id: "r1", event_id: null, name: "27 augustus", rehearsal_date: "2026-08-27" },
    { id: "r2", event_id: null, name: "17 september", rehearsal_date: "2026-09-17" },
  ];
  assert.equal(nextFutureRehearsal(rehearsals, [], "2026-08-26")?.id, "r1");
  assert.equal(nextFutureRehearsal(rehearsals, [], "2026-08-28")?.id, "r2");
  assert.equal(nextFutureRehearsal(rehearsals, [], "2026-10-09"), null);
});

test("linked and agenda-only rehearsals are combined without duplicates", () => {
  const rehearsals = [{ id: "r1", event_id: "e1", name: "Bandrepetitie", rehearsal_date: "2026-08-29" }];
  const events = [
    { id: "e1", event_type: "rehearsal", event_date: "2026-08-27", description: "Agenda-repetitie", start_time: "20:00" },
    { id: "e2", event_type: "rehearsal", event_date: "2026-09-17", description: "Los agenda-item" },
    { id: "e3", event_type: "performance", event_date: "2026-08-26", description: "Optreden" },
  ];
  assert.deepEqual(nextFutureRehearsal(rehearsals, events, "2026-08-26"), {
    id: "r1", date: "2026-08-27", name: "Bandrepetitie", location: null, startTime: "20:00",
  });
});

test("today follows the Europe/Amsterdam calendar day", () => {
  assert.equal(amsterdamIsoDate(new Date("2026-08-26T22:30:00Z")), "2026-08-27");
});

test("dashboard keeps next performance and renders the rehearsal empty state", () => {
  const dashboard = fs.readFileSync("app/bandportaal/BandPortal.tsx", "utf8");
  assert.match(dashboard, /Volgende optreden/);
  assert.match(dashboard, /Volgende repetitie/);
  assert.match(dashboard, /Nog geen volgende repetitie gepland\./);
});
