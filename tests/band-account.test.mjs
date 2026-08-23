import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const account = readFileSync(new URL("../lib/bandAccount.ts", import.meta.url), "utf8");
const login = readFileSync(new URL("../app/bandinlog/BandLogin.tsx", import.meta.url), "utf8");

test("beheerder en gewoon bandlid doorlopen dezelfde servergevalideerde accountcontrole", () => {
  assert.match(account, /supabase\.auth\.getUser\(\)/);
  assert.match(account, /from\("profiles"\)/);
  assert.match(account, /from\("user_roles"\)/);
  assert.doesNotMatch(account, /role\s*===\s*["']admin/);
});

test("ontbrekend profiel, rol en verkeerde achtergebleven gebruiker zijn afzonderlijk herkenbaar", () => {
  assert.match(account, /reason: "profile"/);
  assert.match(account, /reason: "role"/);
  assert.match(account, /expectedUserId && userResult\.data\.user\.id !== expectedUserId/);
  assert.match(login, /Je account is niet gekoppeld aan een bandprofiel/);
  assert.match(login, /Je account heeft geen geldige bandrol/);
});
