import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/009_app_activity.sql", import.meta.url), "utf8");

test("App-activiteit is uitsluitend als beheerfunctie bereikbaar", () => {
  assert.match(portal, /isAdmin && <button onClick=\{\(\) => setTab\("app-activity"\)\}/);
  assert.match(portal, /tab === "app-activity" && isAdmin/);
});

test("activiteit wordt beperkt en zonder paginatracking bijgewerkt", () => {
  assert.match(portal, /now - lastTouch < 60_000/);
  assert.match(portal, /setInterval\(\(\) => \{ void touch\(false\); \}, 120_000\)/);
  assert.doesNotMatch(migration, /last_page|page_path|route_name|click_count/i);
});

test("online-status en Laatst actief gebruiken dezelfde last_active_at registratie", () => {
  assert.doesNotMatch(portal, /Laatste inlog|last_login_at/);
  assert.match(portal, /const lastActive = activity\?\.last_active_at/);
  assert.match(portal, /isOnline = lastActive !== null/);
  assert.match(portal, /Laatst actief: \$\{lastActiveDetailLabel\(lastActive, now\)\}/);
  assert.match(portal, /"Nog nooit actief"/);
});

test("RLS laat alleen beheerders activiteit lezen en touch werkt alleen voor auth uid", () => {
  assert.match(migration, /for select to authenticated\s+using \(public\.is_admin\(\)\)/s);
  assert.match(migration, /actor uuid := auth\.uid\(\)/);
  assert.match(migration, /values \(actor, now\(\), reliable_last_login, now\(\)\)/);
  assert.doesNotMatch(migration, /grant (insert|update|delete)/i);
});
