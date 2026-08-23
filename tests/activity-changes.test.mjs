import assert from "node:assert/strict";
import test from "node:test";
import { formatActivityChanges } from "../lib/activityChanges.ts";

test("YouTube-wijziging toont geen URL of video-id", () => {
  const changes = formatActivityChanges({
    action: "updated",
    title: "Forget Me Nots",
    old_data: { youtube_url: "https://youtube.com/watch?v=oudeVideoId" },
    new_data: { youtube_url: "https://youtu.be/nieuweVideoId" },
  });
  assert.deepEqual(changes, ["YouTube-link bijgewerkt"]);
  assert.doesNotMatch(changes.join(" "), /https?:|oudeVideoId|nieuweVideoId/);
});

test("andere links en lange velden worden eveneens compact weergegeven", () => {
  assert.deepEqual(formatActivityChanges({ action: "updated", title: "Bestand", old_data: { external_url: "https://example.com/oud" }, new_data: { external_url: "https://example.com/nieuw" } }), ["Link bijgewerkt"]);
  assert.deepEqual(formatActivityChanges({ action: "updated", title: "Item", old_data: { custom_field: "kort" }, new_data: { custom_field: "x".repeat(80) } }), ["Custom field bijgewerkt"]);
});

test("korte gewone velden behouden een begrijpelijke wijzigingsomschrijving", () => {
  assert.deepEqual(formatActivityChanges({ action: "updated", title: "Nummer", old_data: { bpm: 110 }, new_data: { bpm: 115 } }), ["Gewijzigd: BPM van 110 naar 115"]);
});
