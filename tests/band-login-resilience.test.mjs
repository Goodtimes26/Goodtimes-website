import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const login = readFileSync(new URL("../app/bandinlog/BandLogin.tsx", import.meta.url), "utf8");
const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const supabaseClient = readFileSync(new URL("../lib/supabase.ts", import.meta.url), "utf8");
const layout = readFileSync(new URL("../app/layout.tsx", import.meta.url), "utf8");

test("loginpagina start geen concurrerende getSession-aanvraag", () => {
  assert.doesNotMatch(login, /auth\.getSession\(/);
  assert.match(login, /event === "INITIAL_SESSION"/);
  assert.doesNotMatch(login, /event === "SIGNED_IN"/);
});

test("portaal begrenst sessie- en profielcontrole voor ieder account", () => {
  assert.match(portal, /withAuthTimeout\(supabase\.auth\.getSession\(\)\)/);
  assert.match(portal, /withAuthTimeout\(Promise\.all/);
  assert.match(portal, /\.maybeSingle\(\)/);
  assert.match(portal, /Account mist een profiel- of rolkoppeling/);
});

test("netwerkrequests worden echt afgebroken en achtergebleven sessies kunnen worden verwijderd", () => {
  assert.match(supabaseClient, /AbortController/);
  assert.match(supabaseClient, /requestUrl\.includes\("\/auth\/v1\/"\)/);
  assert.match(supabaseClient, /global: \{ fetch: fetchWithTimeout \}/);
  assert.match(supabaseClient, /clearStoredSupabaseSession/);
  assert.match(login, /validateBandAccount/);
  assert.match(login, /clearStoredSupabaseSession/);
});

test("uitloggen ruimt lokaal altijd op en activiteitfouten worden niet als nulresultaat getoond", () => {
  assert.match(portal, /signOut\(\{ scope: "local" \}\)/);
  assert.match(portal, /finally \{\s+clearStoredSupabaseSession\(\)/s);
  assert.match(portal, /appActivityLoaded/);
  assert.match(portal, /appActivityError/);
  assert.match(portal, /Activiteitenoverzicht laden mislukt/);
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
