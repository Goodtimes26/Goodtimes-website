import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("../app/bandinlog/BandLogin.tsx", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("loginpagina start geen concurrerende getSession-aanvraag", () => {
  assert.doesNotMatch(login, /auth\.getSession\(/);
  assert.match(login, /event === "INITIAL_SESSION"/);
});

test("login, herstel en wachtwoord instellen zijn begrensd en sluiten loading altijd af", () => {
  assert.equal((login.match(/withAuthTimeout\(/g) ?? []).length, 3);
  assert.equal((login.match(/authRequestInFlight\.current = true/g) ?? []).length, 3);
  assert.equal((login.match(/authRequestInFlight\.current = false/g) ?? []).length, 3);
  assert.equal((login.match(/setLoading\(false\)/g) ?? []).length, 3);
  assert.match(login, /finally/);
});

test("wachtwoordherstel gebruikt de juiste productie-redirect", () => {
  assert.match(login, /redirectTo: "https:\/\/goodtimescoverband\.nl\/bandinlog\/nieuw-wachtwoord"/);
  assert.match(login, /Als dit e-mailadres bij ons bekend is/);
});

test("verkeerde gegevens en netwerkproblemen hebben afzonderlijke Nederlandse meldingen", () => {
  assert.match(login, /E-mailadres of wachtwoord is onjuist/);
  assert.match(login, /Inloggen duurde te lang/);
  assert.match(login, /Er kon geen verbinding worden gemaakt/);
});

test("zichtbare Terug naar website-link is verwijderd en stabiele favicon blijft server-side", () => {
  assert.doesNotMatch(login, /className="portal-back-link"/);
  assert.match(layout, /url: "\/favicon-48x48\.png"/);
  assert.doesNotMatch(layout, /favicon-48x48\.png\?/);
});
