# GoodTimes Band Web Push — productie-inrichting

De frontend bevat uitsluitend de publieke VAPID-sleutel. De private sleutel hoort alleen in Supabase Edge Function Secrets.

## Benodigde configuratie

1. Voer `supabase/migrations/020_band_web_push.sql` één keer uit op productie.
2. Zet als GitHub Actions repository variable:
   - `NEXT_PUBLIC_WEB_PUSH_VAPID_PUBLIC_KEY` = de gegenereerde publieke VAPID-sleutel.
3. Zet als Supabase Edge Function secrets:
   - `VAPID_PUBLIC_KEY` = dezelfde publieke sleutel;
   - `VAPID_PRIVATE_KEY` = de bijbehorende private sleutel;
   - `VAPID_SUBJECT` = `mailto:info@goodtimescoverband.nl`.
4. Deploy de functie:
   - `supabase functions deploy send-band-push --project-ref tjdrexjmwadnqrakixmo`

Een nieuw sleutelpaar kan lokaal worden gegenereerd met:

`pnpm dlx web-push generate-vapid-keys --json`

De private waarde mag niet in GitHub, frontendcode, logs of een `NEXT_PUBLIC_`-variabele worden gezet.

## Productiecontrole

- Installeer/open de PWA op iOS 16.4+ of Android.
- Kies onder **Meer → Pushmeldingen → Inschakelen** en sta meldingen toe.
- Controleer in `push_subscriptions` dat één record voor het ingelogde lid en toestel bestaat.
- Plaats vanaf een ander account een bericht; de auteur ontvangt zelf geen push.
- Sluit de ontvangende PWA volledig en herhaal de test.
- Tik op de melding en controleer de deeplink naar het specifieke item.
- Test een tweede toestel met hetzelfde account: beide endpoints moeten naast elkaar bestaan.
- Schakel meldingen uit en controleer dat uitsluitend die toestel-subscription verdwijnt.
- Een definitief verlopen endpoint (HTTP 404/410 van de pushprovider) wordt door de Edge Function verwijderd.
