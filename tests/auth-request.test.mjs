import assert from "node:assert/strict";
import test from "node:test";
import { AuthRequestTimeoutError, isInvalidCredentials, safeAuthError, withAuthTimeout } from "../lib/authRequest.ts";

test("auth-aanvraag geeft na de ingestelde grens een herkenbare time-out", async () => {
  await assert.rejects(withAuthTimeout(new Promise(() => {}), 10), AuthRequestTimeoutError);
});

test("na een time-out kan een nieuwe aanvraag normaal slagen", async () => {
  await assert.rejects(withAuthTimeout(new Promise(() => {}), 5), AuthRequestTimeoutError);
  assert.equal(await withAuthTimeout(Promise.resolve("gelukt"), 50), "gelukt");
});

test("verkeerde inloggegevens blijven afzonderlijk herkenbaar", () => {
  assert.equal(isInvalidCredentials({ code: "invalid_credentials", status: 400 }), true);
  assert.equal(isInvalidCredentials({ status: 400, message: "Invalid login credentials" }), true);
  assert.equal(isInvalidCredentials(new TypeError("Failed to fetch")), false);
});

test("veilige logging bevat nooit wachtwoorden, sessies of tokens", () => {
  const logged = safeAuthError({ name: "AuthError", code: "network", status: 0, message: "Failed to fetch", password: "geheim", access_token: "token" });
  assert.deepEqual(logged, { name: "AuthError", code: "network", status: 0, message: "Failed to fetch" });
});
