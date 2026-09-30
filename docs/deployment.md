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

1. Maak op https://supabase.com een nieuw project in Frankfurt (`eu-central-1`). Bewaar het databasewachtwoord.
2. Kies bovenaan **Connect** en neem de connection string onder **Session pooler** (host `aws-…pooler.supabase.com`, poort `5432`). Gebruik niet de **Direct connection**: die is alleen via IPv6 bereikbaar en Render verbindt via IPv4.
3. Vul het wachtwoord in op de plek van `[YOUR-PASSWORD]`. Staan er tekens als `@`, `#` of `/` in, kies dan een wachtwoord zonder die tekens of codeer ze in de URL.
4. Plak `?sslmode=no-verify` achter de string. Dan loopt de verbinding versleuteld; de Postgres-client van Node vertrouwt het certificaat van Supabase niet uit zichzelf.

Het resultaat ziet er zo uit:

```text
postgresql://postgres.abcdefghijkl:WACHTWOORD@aws-0-eu-central-1.pooler.supabase.com:5432/postgres?sslmode=no-verify
```

### Keuzes in het Supabase-dashboard

De game-API praat **rechtstreeks met Postgres** via `DATABASE_URL`. Browsers praten niet met Supabase (tenzij je later optionele anonieme login aanzet). Daarom:

| Instelling | Keuze | Waarom |
| --- | --- | --- |
| **Data API** (PostgREST / “Enable Data API”) | Uit laten, of aan laten staan als Supabase dat standaard doet | Niet nodig voor dit spel. De API gebruikt geen REST-/Data-API, alleen de Postgres-connection string. |
| **Automatically expose new tables in Data API** | **Uit** | Zodat nieuwe tabellen niet automatisch via de publieke `anon` key bereikbaar worden. |
| **Exposed schemas** | Alleen `public` mag zichtbaar zijn; geen `session_documents` openzetten voor clients | De tabel is alleen voor de API via de connection string. |
| **Row Level Security** | Aan (de API zet dit zelf bij de eerste start) | Zonder RLS zou de Data API, als die aan staat, elke rij kunnen tonen. Met RLS aan en zonder policies is de tabel via de Data API leeg voor `anon`/`authenticated`. |
| **Authentication → Anonymous sign-ins** | Uit, tenzij je de optionele Supabase-login hieronder aanzet | Standaard gebruikt de API dev-login met `AUTH_SECRET`. |

De API maakt bij de eerste start zelf de tabel `session_documents` aan, met RLS aan. Wil je het schema liever zelf beheren, voer dan eerst [`supabase/migrations/20260925180000_game.sql`](../supabase/migrations/20260925180000_game.sql) uit in de **SQL Editor**. Die migratie zet RLS aan, forceert RLS, en trekt rechten in voor `anon` en `authenticated`.

## 3. API (Render)

Er zijn **twee manieren** om de API op Render te zetten. Ze zijn niet hetzelfde:

| Pad in het dashboard | Wat er gebeurt | Wanneer |
| --- | --- | --- |
| **New → Blueprint** | Render leest [`render.yaml`](../render.yaml) uit de root van de repo en vult build, start, health check en env-vars in. | Voorkeur: minder typwerk, configuratie staat in Git. |
| **New → Web Service** | Render negeert `render.yaml` volledig. Je vult alles handmatig in. | Prima als je al in dat scherm zit, of als Blueprint niet zichtbaar is. |

Belangrijk: **New → Web Service leest nooit `render.yaml`.** Dat is geen fout. Alleen Blueprint doet dat. `render.yaml` moet bovendien op de branch staan die je koppelt (meestal `main`); een bestand dat alleen lokaal bestaat, ziet Render niet.

Kies in het “Create a new Service”-scherm dus **niet** Static Site, Private Service, Worker, Cron, Postgres of Key Value. Alleen **Web Services** (handmatig) of, via het hoofdmenu, **Blueprint**.

### Optie A — Blueprint (leest `render.yaml`)

1. Op https://dashboard.render.com: **New → Blueprint** (niet “Web Service”).
2. Koppel de repository `bdi-game-mobile`, branch `main`. Laat **Blueprint Path** op `render.yaml` staan (root van de repo).
3. Render toont een preview van de service `bdi-game-api` en vraagt om twee waarden die in `render.yaml` op `sync: false` staan:
   - `DATABASE_URL`: de Session-pooler-string uit stap 2.
   - `CORS_ORIGIN`: vul voorlopig `*` in. Na stap 4 zet je hier het echte Vercel-adres.
4. Kies **Deploy Blueprint** en wacht tot de service **Live** is.
5. Kopieer het adres, bijvoorbeeld `https://bdi-game-api.onrender.com`, en open `…/health`. Je hoort `{"ok":true}` te zien. In de logs staat `Sessions worden in Postgres bewaard.`

De Blueprint zet verder automatisch: `NODE_ENV=production`, `NODE_VERSION=22`, `ALLOW_DEV_AUTH=true`, gegenereerde `AUTH_SECRET` en `INTERNAL_TICK_SECRET`, health check op `/health`, en een build-filter zodat alleen wijzigingen aan de API een nieuwe deploy starten.

### Optie B — Web Service (alles handmatig)

1. **New → Web Service** → koppel `bdi-game-mobile`.
2. Vul in:

| Veld | Waarde |
| --- | --- |
| Name | `bdi-game-api` |
| Region | Frankfurt |
| Language / Runtime | Node |
| Branch | `main` |
| Root Directory | leeg (repository-root) |
| Build Command | `npm install --include=dev` |
| Start Command | `npm run start -w @bdi/game-api` |
| Instance type | Free |

`--include=dev` is nodig: met `NODE_ENV=production` slaat npm anders `tsx` over en start de API niet.

3. Onder **Environment** (vóór de eerste deploy):

| Key | Value |
| --- | --- |
| `NODE_ENV` | `production` |
| `NODE_VERSION` | `22` |
| `ALLOW_DEV_AUTH` | `true` |
| `AUTH_SECRET` | lange willekeurige tekst, of laat Render “Generate” gebruiken |
| `INTERNAL_TICK_SECRET` | idem, andere willekeurige tekst |
| `DATABASE_URL` | Session-pooler-string uit stap 2 |
| `CORS_ORIGIN` | voorlopig `*` |

4. Onder **Health Check Path**: `/health`.
5. Deploy, wacht tot **Live**, en controleer `…/health` zoals bij optie A.

Je hebt geen Render-Postgres of Redis nodig; sessies staan in Supabase.

## 4. Website (Vercel)

1. Kies op https://vercel.com **Add New… → Project** en importeer `bdi-game-mobile`.
2. Vercel ziet in de monorepo twee apps (`apps/web` en `services/game-api`). **Importeer alleen `apps/web`.** Klik bij `web` op **Import single project**. Zet `game-api` niet op Vercel: die draait op Render (zie stap 3). Kies ook niet “Services” om beide te groeperen.
3. Zet daarna **Root Directory** op de **repository-root** (`.` / leeg), niet op `apps/web`. De build komt uit [`vercel.json`](../vercel.json) in de root (`npm run build -w @bdi/web` → `apps/web/dist`). Als Root Directory op `apps/web` blijft staan, vindt npm de monorepo-workspaces niet en faalt de build.
4. Voeg onder **Environment Variables** toe (Production + Preview):
   - `VITE_API_URL` = het Render-adres uit stap 3, zonder slash aan het eind, bijvoorbeeld `https://bdi-game-api.onrender.com`.
5. Kies **Deploy**. Zie je daarna “No Production Deployment” / “No Active Branches”, dan is de eerste deploy nooit gestart — zie [Problemen oplossen](#problemen-oplossen).

`VITE_PUBLIC_BASE_URL` is niet nodig: de QR-codes gebruiken het adres waarop de beamer de site opent. Zet hem alleen als je een eigen domein gebruikt en de QR-codes daarnaar moeten wijzen.

`VITE_…`-variabelen worden tijdens de build in de website gezet. Pas je er een aan, kies dan **Redeploy**.

Vercel slaat een build over als een commit niets in `apps/web` of de rootbestanden wijzigt (zie `ignoreCommand` in `vercel.json`).

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

- **Render vraagt alle velden handmatig en lijkt `render.yaml` te negeren**: je zit in **New → Web Service**. Dat pad leest het YAML-bestand nooit. Gebruik **New → Blueprint**, of vul de tabel onder “Optie B” in. `render.yaml` moet op GitHub staan op de gekoppelde branch.
- **Vercel wil `web` én `game-api` importeren**: importeer alleen `apps/web` via **Import single project**. De API blijft op Render. Zet daarna **Root Directory** terug naar de repository-root (`.`), zodat `vercel.json` en de npm-workspaces werken.
- **Vercel toont “No Production Deployment” / “No Active Branches”**: het project is aangemaakt, maar er is nog geen deploy geweest. Doe dit:
  1. **Settings → Environment Variables**: zet `VITE_API_URL` = `https://bdi-game-api.onrender.com` (Production + Preview).
  2. **Settings → General → Root Directory**: leeg / `.` (niet `apps/web`).
  3. **Settings → Git**: gekoppeld aan `gerardhv/bdi-game-mobile`, Production Branch `main`.
  4. **Deployments → Create Deployment** (of **Redeploy**), kies branch `main`. Of push een nieuwe commit naar `main` zodat Vercel opnieuw bouwt.
- **Website laadt, maar maakt geen spel aan of toont netwerkfouten in de browserconsole**: controleer `VITE_API_URL` (geen slash aan het eind, opnieuw gedeployd) en `CORS_ORIGIN` (exact het Vercel-adres, met `https://`, zonder slash).
- **API start niet, `tsx: not found`**: het build command mist `--include=dev`.
- **API start niet, `ENETUNREACH` of time-out naar `db.….supabase.co`**: je gebruikt de Direct connection; neem de Session pooler.
- **`self-signed certificate in certificate chain`**: `?sslmode=no-verify` ontbreekt achter `DATABASE_URL`.
- **`AUTH_SECRET ontbreekt`**: de variabele is leeg; laat Render hem genereren of vul een lange willekeurige tekst in.
