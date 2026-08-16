import assert from "node:assert/strict";
import test from "node:test";
import { unreadMessageIds } from "../lib/appBadge.ts";

const messages = [
  { id: "bericht-a", author_id: "eddie" },
  { id: "bericht-b", author_id: "esther" },
  { id: "bericht-c", author_id: "joost" },
];

test("houdt de leesstatus per gebruiker gescheiden", () => {
  assert.deepEqual(unreadMessageIds(messages, ["bericht-b"], "eddie"), ["bericht-c"]);
  assert.deepEqual(unreadMessageIds(messages, [], "cindy"), ["bericht-a", "bericht-b", "bericht-c"]);
});

test("beschouwt een zelf geplaatst bericht direct als gelezen", () => {
  assert.deepEqual(unreadMessageIds(messages, [], "esther"), ["bericht-a", "bericht-c"]);
});

test("verwijdert alleen voor de lezende gebruiker de nieuw-status", () => {
  assert.deepEqual(unreadMessageIds(messages, ["bericht-a"], "cindy"), ["bericht-b", "bericht-c"]);
  assert.deepEqual(unreadMessageIds(messages, [], "luuk"), ["bericht-a", "bericht-b", "bericht-c"]);
});
