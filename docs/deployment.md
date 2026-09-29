# Online zetten (cloud)

Met deze opzet draait het spel zonder dat een laptop de server is. De beamer opent een HTTPS-adres en telefoons doen mee via wifi of mobiele data. Voor testen op je eigen computer, zie [Lokaal draaien en testen](local.md).

## Opzet

| Onderdeel | Dienst | Plan |
| --- | --- | --- |
| Broncode | GitHub, privé-repository | gratis |
| Website (beamer en telefoons) | Vercel | Hobby (gratis) |
| Game-API | Render, web service | Free |
| Opslag van sessies | Supabase Postgres | Free |

Het spel is bedoeld voor hooguit een paar gelijktijdige spellen met vijf deelnemers. Er is één API-proces; hoge beschikbaarheid is geen doel.

### Waarom deze verdeling

- **Geen GitHub Pages.** Pages publiceert niet vanuit een privé-repository op een gratis account, en kan de API sowieso niet draaien. De oude Pages-workflow is verwijderd.
- **Website op Vercel.** Het is een statische Vite-build; Vercel bouwt die bij elke push vanuit de privé-repo.
- **API op Render, niet op Vercel.** De API is één langlopend proces: hij houdt alle sessies in het geheugen, tikt elke 500 ms de spelklok door (presentatietijd, BDI-pipeline, voertuigen) en houdt per beamer en telefoon een server-sent-events-verbinding open. Vercel Functions zijn kortlevend, draaien in meerdere losse instanties zonder gedeeld geheugen en kennen geen achtergrondlus; op Hobby draait een cron hooguit dagelijks. De API daarvoor ombouwen is veel werk voor deze schaal. Render draait het bestaande proces ongewijzigd.
- **Supabase alleen als database.** Render Free slaapt na 15 minuten zonder verkeer en heeft geen blijvende schijf. Zonder database verdwijnen sessies bij slapen of een nieuwe deploy. Met `DATABASE_URL` laadt de API bij het opstarten alle sessies uit Postgres terug. Supabase-login is optioneel (zie onderaan); dev-login met een geheim token volstaat voor dit gebruik.

## Voordat je begint

- Een **persoonlijk** GitHub-account. Vercel Hobby deployt geen privé-repository die onder een GitHub-organisatie staat; daarvoor is Vercel Pro nodig.
- Accounts bij Vercel, Render en Supabase. Log bij Vercel en Render in met GitHub.
- Kies overal dezelfde regio in Europa (Supabase: Frankfurt `eu-central-1`, Render: Frankfurt), zodat de API dicht bij de database zit.

## 1. Code in een privé-repository

1. Maak op GitHub een nieuwe repository `bdi-game-mobile`, zet hem op **Private** en laat hem leeg.
2. In de map van dit project:

```bash
git remote add origin https://github.com/JOUW-NAAM/bdi-game-mobile.git
git push -u origin main
```

Render en Vercel vragen bij het koppelen toegang tot deze repository via hun GitHub-app. Geef die toegang alleen voor deze repository.

## 2. Database (Supabase)

1. Maak op https://supabase.com een nieuw project in Frankfurt. Bewaar het databasewachtwoord.
2. Kies bovenaan **Connect** en neem de connection string onder **Session pooler** (host `aws-…pooler.supabase.com`, poort `5432`). Gebruik niet de **Direct connection**: die is alleen via IPv6 bereikbaar en Render verbindt via IPv4.
3. Vul het wachtwoord in op de plek van `[YOUR-PASSWORD]`. Staan er tekens als `@`, `#` of `/` in, kies dan een wachtwoord zonder die tekens of codeer ze in de URL.
4. Plak `?sslmode=no-verify` achter de string. Dan loopt de verbinding versleuteld; de Postgres-client van Node vertrouwt het certificaat van Supabase niet uit zichzelf.

Het resultaat ziet er zo uit:

```text
postgresql://postgres.abcdefghijkl:WACHTWOORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify
```

De API maakt bij de eerste start zelf de tabel `session_documents` aan, met row level security aan en zonder policies. De publieke `anon` key kan de tabel daardoor niet lezen; alleen de API, via de connection string. Wil je het schema liever zelf beheren, voer dan eerst [`supabase/migrations/20260925180000_game.sql`](../supabase/migrations/20260925180000_game.sql) uit in de **SQL Editor**.

## 3. API (Render)

De repository bevat een Render-Blueprint, [`render.yaml`](../render.yaml), met alle instellingen.

1. Kies op https://dashboard.render.com **New → Blueprint** en koppel `bdi-game-mobile`.
2. Render vraagt om twee waarden:
   - `DATABASE_URL`: de string uit stap 2.
   - `CORS_ORIGIN`: vul voorlopig `*` in. Na stap 4 zet je hier het echte Vercel-adres.
3. Kies **Deploy Blueprint** en wacht tot de service **Live** is.
4. Kopieer het adres, bijvoorbeeld `https://bdi-game-api.onrender.com`, en open `…/health` in de browser. Je hoort `{"ok":true}` te zien. In de logs staat `Sessions worden in Postgres bewaard.`

De Blueprint zet:

- `NODE_ENV=production` en `NODE_VERSION=22`;
- `ALLOW_DEV_AUTH=true` met een door Render gegenereerd `AUTH_SECRET`, zodat elke browser een ondertekend token krijgt;
- een gegenereerd `INTERNAL_TICK_SECRET` voor `/internal/tick`;
- een health check op `/health`;
- een build-filter: alleen wijzigingen in `services/game-api`, `packages/domain` of de rootbestanden leiden tot een nieuwe API-deploy.

Liever handmatig? Maak een **Web Service** met build command `npm install --include=dev` en start command `npm run start -w @bdi/game-api`, en zet dezelfde variabelen. `--include=dev` is nodig: met `NODE_ENV=production` slaat npm anders `tsx` over en start de API niet.

## 4. Website (Vercel)

1. Kies op https://vercel.com **Add New… → Project** en importeer `bdi-game-mobile`.
2. Laat **Root Directory** leeg (de root van de repository). Build command en output directory komen uit [`vercel.json`](../vercel.json); laat die velden op de standaardwaarde staan.
3. Voeg onder **Environment Variables** toe:
   - `VITE_API_URL` = het Render-adres uit stap 3, zonder slash aan het eind.
4. Kies **Deploy** en noteer het adres, bijvoorbeeld `https://bdi-game-mobile.vercel.app`.

`VITE_PUBLIC_BASE_URL` is niet nodig: de QR-codes gebruiken het adres waarop de beamer de site opent. Zet hem alleen als je een eigen domein gebruikt en de QR-codes daarnaar moeten wijzen.

`VITE_…`-variabelen worden tijdens de build in de website gezet. Pas je er een aan, kies dan **Redeploy**.

Vercel slaat een build over als een commit niets in `apps/web` of de rootbestanden wijzigt.

## 5. CORS vastzetten

Zet in Render bij de service **Environment** `CORS_ORIGIN` op het Vercel-adres, bijvoorbeeld `https://bdi-game-mobile.vercel.app`. Meerdere adressen scheid je met komma's, bijvoorbeeld als je ook een eigen domein gebruikt. Render herstart de API daarna zelf.

## 6. Controleren

1. Open de Vercel-URL op de beamer en kies **Nieuw spel**.
2. Scan een QR-code met een telefoon op mobiele data en neem een rol.
3. Speel een paar stappen, herlaad de telefoon en controleer dat die weer op dezelfde plek zit.

## Gebruik en beheer

- **Opwarmen.** Render Free slaapt na 15 minuten zonder verkeer; de eerste aanvraag duurt dan ongeveer een minuut. Open een paar minuten voor de sessie `…/health` of de beamerpagina. Tijdens een spel houden de verbindingen van beamer en telefoons de API wakker.
- **Updates.** Een push naar `main` deployt website en API opnieuw. Een API-deploy herstart het proces; lopende sessies komen terug uit Postgres, maar verbindingen vallen even weg. Push dus niet tijdens een spel.
- **Supabase pauzeert** een gratis project na ongeveer een week zonder activiteit. Start de API dan niet op (fout bij verbinden met de database), herstart het project in het Supabase-dashboard en kies in Render **Manual Deploy → Restart**.
- **Oude sessies** verlopen na `SESSION_TTL_HOURS` (standaard 24 uur).
- **Kosten.** Alles past in de gratis plannen. Wil je geen opwarmtijd, dan haalt Render **Starter** (enkele dollars per maand) het slapen weg. Verder is er niets te schalen: één instantie is voldoende en de API is niet gemaakt voor meerdere instanties naast elkaar.

## Optioneel: anonieme Supabase-login

Standaard geeft de API zelf ondertekende tokens uit. Wil je in plaats daarvan anonieme Supabase-accounts:

1. Zet in Supabase bij **Authentication → Sign In / Providers** **Allow anonymous sign-ins** aan.
2. Kopieer bij **Project Settings → API** de project-URL en de publieke `anon` key.
3. Render: zet `SUPABASE_URL` en `SUPABASE_ANON_KEY`, en zet `ALLOW_DEV_AUTH` op `false`.
4. Vercel: zet `VITE_SUPABASE_URL` en `VITE_SUPABASE_ANON_KEY` op dezelfde waarden en kies **Redeploy**.

De `service_role` key hoort nergens in Vercel of in de website. Zet ook `VITE_ALLOW_DEV_AUTH` niet in Vercel: die schakelt de route `#/bootstrap` in, die een token uit de URL overneemt en alleen voor lokaal testen bedoeld is.

## Problemen oplossen

- **Website laadt, maar maakt geen spel aan of toont netwerkfouten in de browserconsole**: controleer `VITE_API_URL` (geen slash aan het eind, opnieuw gedeployd) en `CORS_ORIGIN` (exact het Vercel-adres, met `https://`, zonder slash).
- **API start niet, `tsx: not found`**: het build command mist `--include=dev`.
- **API start niet, `ENETUNREACH` of time-out naar `db.….supabase.co`**: je gebruikt de Direct connection; neem de Session pooler.
- **`self-signed certificate in certificate chain`**: `?sslmode=no-verify` ontbreekt achter `DATABASE_URL`.
- **`AUTH_SECRET ontbreekt`**: de variabele is leeg; laat Render hem genereren of vul een lange willekeurige tekst in.
