import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const portal = readFileSync(new URL("../app/bandportaal/BandPortal.tsx", import.meta.url), "utf8");
const modules = readFileSync(new URL("../app/bandportaal/BandAppModules.tsx", import.meta.url), "utf8");
const migration = readFileSync(new URL("../supabase/migrations/012_band_activity_details.sql", import.meta.url), "utf8");
const triggerFix = readFileSync(new URL("../supabase/migrations/014_fix_band_activity_event_type.sql", import.meta.url), "utf8");
const messageCleanup = readFileSync(new URL("../supabase/migrations/015_cleanup_deleted_message_activity.sql", import.meta.url), "utf8");

test("activiteitenlog bewaart oude en nieuwe waarden zonder bestaande data te wijzigen", () => {
  assert.match(migration, /old_data jsonb/);
  assert.match(migration, /new_data jsonb not null/);
  assert.match(migration, /after insert or update/);
  assert.doesNotMatch(migration, /delete from|truncate/i);
});

test("generieke activity-trigger leest event_type niet rechtstreeks uit NEW", () => {
  assert.doesNotMatch(triggerFix, /new\.event_type/i);
  assert.match(triggerFix, /payload->>'event_type' is distinct from 'performance'/);
  assert.match(triggerFix, /when 'band_messages' then 'message'/);
  assert.match(triggerFix, /create or replace function public\.log_band_activity/);
});

test("verwijderde Bandberichten laten geen verweesde activiteit achter", () => {
  assert.match(messageCleanup, /after delete on public\.band_messages/);
  assert.match(messageCleanup, /delete from public\.band_activity_log/);
  assert.match(messageCleanup, /entity_type = 'message'/);
  assert.match(messageCleanup, /entity_id = old\.id/);
  assert.match(portal, /row\.entity_type === "message" && !existingMessageIds\.has\(row\.entity_id\)/);
});

test("dashboardstatus en activiteiten gebruiken dezelfde actuele berichten-fetch", () => {
  assert.match(portal, /setUnreadMessageCount\(unreadIds\.size\)/);
  assert.match(portal, /syncAppBadge\(unreadIds\.size\)/);
  assert.match(portal, /activity\.kind === "message"/);
  assert.match(portal, /Er zijn nieuwe berichten/);
  assert.match(portal, /Er zijn geen nieuwe berichten/);
  assert.match(modules, /Bericht verwijderd\."\); await load\(\); window\.dispatchEvent\(new Event\("goodtimes:messages-changed"\)\)/);
});

test("Wat is er nieuw toont titel, wijzigingsregels en ondersteunt alle gevraagde typen", () => {
  assert.match(portal, /latestActivity\.detail/);
  assert.match(portal, /latestActivity\.changes\?\.map/);
  assert.match(portal, /Nieuw bestand\/audio/);
  assert.match(portal, /Repertoire gewijzigd/);
});

test("een melding navigeert naar en markeert het specifieke item", () => {
  assert.match(portal, /CSS\.escape\(activity\.id\)/);
  assert.match(portal, /heading\.textContent\?\.trim\(\) === activity\.detail/);
  assert.match(portal, /scrollIntoView/);
});

test("Volgende optreden gebruikt het specifieke event-id en Wat is er nieuw blijft zichtbaar", () => {
  assert.match(portal, /id: `performance:\$\{nextEvent\.id\}`/);
  assert.doesNotMatch(portal, /portal-next-event-content" onClick=\{\(\) => setTab\("agenda"\)\}/);
  assert.match(portal, /openAgendaEvent\(activity\.id\.replace/);
  assert.match(portal, /selectedAgendaEvent \? <AgendaEventDetail/);
  assert.match(portal, /#event-\$\{eventId\}/);
  assert.match(portal, /window\.history\.back\(\)/);
  assert.match(portal, /setShowActivityOverview/);
  assert.match(portal, /Er zijn nieuwe berichten/);
  assert.match(portal, /Er zijn geen nieuwe berichten/);
  assert.match(portal, /goodtimes:activity-seen:/);
  assert.match(portal, /unreadMessageCount > 0 \|\| recentActivities\.some/);
  assert.match(portal, /Er zijn nog geen nieuwe wijzigingen sinds de activiteitenregistratie is gestart/);
});
