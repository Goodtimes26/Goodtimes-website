import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const worker = fs.readFileSync("public/band-sw.js", "utf8");
const migration = fs.readFileSync("supabase/migrations/020_band_web_push.sql", "utf8");
const pushClient = fs.readFileSync("lib/pushNotifications.ts", "utf8");
const portal = fs.readFileSync("app/bandportaal/BandPortal.tsx", "utf8");
const modules = fs.readFileSync("app/bandportaal/BandAppModules.tsx", "utf8");
const edgeFunction = fs.readFileSync("supabase/functions/send-band-push/index.ts", "utf8");
const supabaseConfig = fs.readFileSync("supabase/config.toml", "utf8");

test("service worker handles background push and notification deeplinks", () => {
  assert.match(worker, /addEventListener\("push"/);
  assert.match(worker, /showNotification/);
  assert.match(worker, /addEventListener\("notificationclick"/);
  assert.match(worker, /openWindow/);
});

test("subscriptions are private per member and support multiple devices", () => {
  assert.match(migration, /create table if not exists public\.push_subscriptions/);
  assert.match(migration, /endpoint text not null unique/);
  assert.match(migration, /user_id = auth\.uid\(\)/);
  assert.match(migration, /register_push_subscription/);
  assert.doesNotMatch(migration, /grant select[^;]*push_subscriptions to anon/i);
});

test("private VAPID material stays server-side", () => {
  assert.match(edgeFunction, /VAPID_PRIVATE_KEY/);
  assert.doesNotMatch(pushClient, /VAPID_PRIVATE_KEY|SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(pushClient, /NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY/);
});

test("one push hook follows each supported successful mutation", () => {
  assert.match(modules, /sendBandPush\("message_created", createdMessage\.id\)/);
  assert.match(modules, /await sendBandPush\("message_created", createdMessage\.id\)/);
  assert.match(modules, /sendBandPush\("rehearsal_updated"/);
  assert.match(portal, /"performance_created" : "rehearsal_created"/);
  assert.match(portal, /"performance_updated" : "rehearsal_updated"/);
  assert.match(edgeFunction, /neq\("user_id", user\.id\)/);
  assert.match(edgeFunction, /eq\("author_id", user\.id\)/);
  assert.match(edgeFunction, /actorRole\?\.role !== "admin"/);
  assert.match(edgeFunction, /statusCode === 404 \|\| statusCode === 410/);
});

test("berichtpush gebruikt de actuele sessie en rapporteert ontvangers en afleverfouten", () => {
  assert.match(pushClient, /supabase\.auth\.getSession\(\)/);
  assert.match(pushClient, /Authorization: `Bearer \$\{sessionData\.session\.access_token\}`/);
  assert.match(edgeFunction, /recipients: subscriptions\?\.length \?\? 0, sent, failed/);
  assert.match(edgeFunction, /subscriptionId: subscription\.id/);
  assert.match(edgeFunction, /Access-Control-Allow-Headers[^\n]*x-client-info/);
  assert.match(supabaseConfig, /\[functions\.send-band-push\][\s\S]*verify_jwt = false/);
  assert.match(edgeFunction, /userClient\.auth\.getUser\(\)/);
});

test("push settings and per-device unsubscribe are present", () => {
  assert.match(portal, /<PushNotificationSettings prompt \/>/);
  assert.match(portal, /<PushNotificationSettings \/>/);
  assert.match(pushClient, /unregister_push_subscription/);
  assert.match(pushClient, /Notification\.requestPermission\(\)/);
});
