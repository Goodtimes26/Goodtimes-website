# GoodTimes-bandportaal installeren

Het bandportaal gebruikt Supabase Authentication en een Supabase-database. De openbare website blijft statisch op GitHub Pages staan. Privégegevens worden beveiligd door Supabase Row Level Security (RLS), niet door alleen een verborgen webadres.

## 1. Gratis Supabase-project maken

1. Ga naar [supabase.com](https://supabase.com/) en maak een account.
2. Kies **New project**.
3. Kies een organisatie, projectnaam en regio in Europa.
4. Maak een sterk databasewachtwoord en bewaar dat uitsluitend in een wachtwoordmanager.
5. Wacht tot het project gereed is.

## 2. Supabase URL en anon key vinden

1. Open in Supabase **Project Settings → API**.
2. Kopieer **Project URL**.
3. Kopieer onder **Project API keys** de publieke **anon** key.
4. Gebruik nooit de `service_role` key in deze website of in GitHub Pages.

De anon key is bedoeld voor browsergebruik. De daadwerkelijke bescherming komt van de RLS-regels uit de migratie.

## 3. Omgevingsvariabelen instellen

### Lokaal

1. Kopieer `.env.example` naar `.env.local`.
2. Vul in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://jouw-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=jouw-publieke-anon-key
```

Commit `.env.local` nooit naar GitHub.

### GitHub Pages

1. Open de repository op GitHub.
2. Ga naar **Settings → Secrets and variables → Actions → Variables**.
3. Voeg twee repository variables toe:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Start daarna de workflow **Deploy to GitHub Pages** opnieuw of merge de pull request naar `main`.

## 4. Tabellen en beveiligingsregels aanmaken

1. Open in Supabase **SQL Editor**.
2. Kies **New query**.
3. Kopieer de volledige inhoud van `supabase/migrations/001_band_portal.sql`.
4. Voer de query uit.
5. Voer daarna, in deze volgorde, ook uit:
   - `supabase/migrations/002_privacy_analytics.sql`
   - `supabase/migrations/003_band_app.sql`
   - `supabase/migrations/004_setlist_maker_import.sql`
   - `supabase/migrations/005_internal_setlist_editor.sql`
   - `supabase/migrations/006_song_youtube_management.sql`
   - `supabase/migrations/007_band_audio_storage.sql`
6. Controleer in **Table Editor** of deze tabellen bestaan:
   - `profiles`
   - `user_roles`
   - `availability`
   - `requests`
   - `request_responses`
   - `events`
   - `songs`
   - `song_notes`
   - `setlists`
   - `setlist_items`
   - `rehearsals`
   - `rehearsal_songs`
   - `band_messages`
   - `message_reads`
   - `band_files`
7. Controleer bij iedere tabel dat RLS is ingeschakeld.

Migratie 003 bewaart repertoire, gedeelde setlists, repetitieplannen, bandberichten,
bestandslinks en uitgebreide profielen centraal in Supabase. Zonder deze migratie
blijven inloggen, de bestaande agenda, aanvragen en beschikbaarheid werken; de
nieuwe modules tonen dan een duidelijke installatiemelding.

Migratie 007 maakt de privébucket `band-audio`, koppelt audio optioneel aan de
centrale `songs`-tabel en staat alleen ingelogde bandleden toe audio te lezen.
Alleen beheerders mogen audiobestanden uploaden en verwijderen.

## 5. De zes persoonlijke accounts toevoegen

Maak geen gedeeld account.

1. Ga naar **Authentication → Users**.
2. Kies **Add user → Create new user**.
3. Maak afzonderlijke accounts voor:
   - Eddie
   - Esther
   - Cindy
   - Joost
   - Luuk
   - Eric
4. Gebruik voor ieder bandlid een eigen e-mailadres.
5. Geef ieder bandlid een uniek tijdelijk wachtwoord via een veilig kanaal.
6. Vul bij user metadata `display_name` in met de juiste voornaam.

De databasetrigger maakt automatisch een profiel en de standaardrol `member`.

## 6. Eddie beheerder maken

Voer in de Supabase SQL Editor uit:

```sql
update public.user_roles
set role = 'admin'
where user_id = (
  select id
  from public.profiles
  where lower(display_name) = 'eddie'
);
```

Controleer:

```sql
select p.display_name, r.role
from public.profiles p
join public.user_roles r on r.user_id = p.id
order by p.display_name;
```

Een bestaande beheerder kan later via het portaal een tweede beheerder aanwijzen.

## 7. Lokaal testen

### URL-configuratie voor wachtwoordherstel

Open in Supabase **Authentication → URL Configuration** en stel handmatig in:

- **Site URL:** `https://goodtimescoverband.nl`
- **Redirect URLs:**
  - `https://goodtimescoverband.nl/bandinlog/`
  - `https://goodtimescoverband.nl/bandinlog/nieuw-wachtwoord`

Deze URL's zijn nodig om uitnodigingen en wachtwoordherstellinks na controle terug te sturen naar het beveiligde GoodTimes-bandportaal.

1. Zorg dat `.env.local` correct is ingevuld.
2. Installeer de dependencies met `npm ci`.
3. Start de site met `npm run dev`.
4. Open `/bandinlog`.
5. Test met Eddie:
   - aanvragen aanmaken, wijzigen en verwijderen;
   - activiteiten toevoegen;
   - datumcontrole;
   - rollen bekijken en aanpassen.
6. Test met ieder bandlid:
   - eigen beschikbaarheid en blokkades;
   - reageren op aanvragen;
   - activiteiten bekijken;
   - geen wijzigingen aan andere gebruikers of aanvragen kunnen uitvoeren.
7. Log uit en controleer dat `/bandportaal` terugstuurt naar `/bandinlog`.
8. Controleer in een privévenster dat rechtstreekse Supabase-verzoeken zonder sessie geen data teruggeven.

## 8. De Band-app op een telefoon installeren

De interne app gebruikt een eigen manifest met `/bandinlog/` als startpunt. Het
app-icoon opent daardoor direct de Bandinlog of, met een geldige sessie, het
dashboard.

### iPhone / iPad

1. Open `https://goodtimescoverband.nl/bandinlog/` in Safari.
2. Log in.
3. Tik op **Deel**.
4. Kies **Zet op beginscherm** en daarna **Voeg toe**.

### Android

1. Open `https://goodtimescoverband.nl/bandinlog/` in Chrome.
2. Log in.
3. Open het browsermenu.
4. Kies **App installeren** of **Toevoegen aan startscherm**.

De service worker bewaart alleen de app-shell en statische bestanden. Banddata
blijft afkomstig uit Supabase en wordt niet als onbeveiligde lokale database
opgeslagen.

## 9. Veilig publiceren naar GitHub Pages

1. Controleer dat `.env.local` niet in `git status` staat.
2. Controleer dat nergens een `service_role` key of wachtwoord is opgenomen.
3. Open en review de pull request.
4. Voeg eerst de twee GitHub Actions-variabelen toe.
5. Merge daarna pas naar `main`.
6. Controleer of **Deploy to GitHub Pages** slaagt.
7. Open `/bandinlog` op het custom domain en test één beheerder en één bandlid.

## 10. Handmatige stappen die nog nodig zijn

- Een Supabase-project aanmaken.
- De Project URL en publieke anon key instellen.
- Alle SQL-migraties in volgorde uitvoeren.
- Zes Authentication-accounts met echte e-mailadressen aanmaken.
- Eddie via SQL de rol `admin` geven.
- E-mailbevestiging en eventueel wachtwoordherstel in Supabase configureren.
- De pull request beoordelen en handmatig mergen.
- Na deployment de rollen en RLS met minimaal twee accounts testen.

## Beveiligingsmodel

- Wachtwoorden worden uitsluitend door Supabase Authentication verwerkt.
- De browser bewaart alleen de beveiligde Supabase-sessie, nooit een wachtwoord.
- Zonder geldige sessie weigert RLS alle portaaldata.
- Bandleden kunnen de teamstatus zien, maar alleen hun eigen beschikbaarheid en reacties wijzigen.
- Privé-opmerkingen bij beschikbaarheid zijn alleen opvraagbaar door de eigenaar en beheerders.
- Alleen beheerders kunnen aanvragen, activiteiten en rollen beheren.
- De portalroutes hebben `noindex, nofollow`.
