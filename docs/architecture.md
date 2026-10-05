# Architectuur

Vier lagen:

1. Spelbesturing in `packages/domain`: gedeelde engine plus game packs (stappen, scenario, policy).
2. Vertrouwenscontext: lidmaatschap, transportrollen en het spelbeleid in het actieve pack (`games/logistics/policy.ts`).
3. Organisatiediensten `buyer-data`, `seller-data`, `carrier-data` en `delivery-data`, aangesproken via `/api/data/:org/:type/:id`.
4. Trainingsprojectie, alleen voor de host, via `/api/sessions/:id/training`.

De HTTP-server staat in `services/game-api`. Elke spelhandeling is één aanroep op een gekloonde sessie die daarna atomair wordt opgeslagen. Clients sturen geen rol als bewijs; de server leidt de speler af uit het token.

## Engine en game packs

`SessionState.gameId` wijst naar een pack in `catalog.ts` (nu alleen `logistics`). De entree haalt `GET /api/games` op; `POST /api/sessions` stuurt `gameId` mee. Domain-inhoud per pack leeft onder `packages/domain/src/games/<id>/`. Host-visuals per pack onder `apps/web/src/games/<id>/`, gekozen via `hostPackFor(gameId)`.

Idle-cleanup, IP-sessielimiet en debounced Postgres-flush horen bij de engine/API, niet bij een pack. Zie ook [games/README.md](games/README.md).

## Opslag

Een sessie is één document: de domeinstaat `SessionState`, met rollen, rondes, bronnen, outbox, afleveringen, metingen en de trainingsgebeurtenissen. De API houdt alle documenten in het geheugen. Zonder `DATABASE_URL` schrijft hij ze naar `services/game-api/data/game.json`, zodat een herstart van de ontwikkelserver het spel niet kwijtraakt. Met `DATABASE_URL` laadt hij bij het opstarten alle sessies uit de tabel `session_documents` (id, code, data als `jsonb`, `updated_at`) en schrijft gewijzigde sessies terug naar Postgres — gebundeld elke `PERSIST_INTERVAL_MS` (standaard 15 s), meteen bij een nieuwe of gesloten sessie, en bij afsluiten van het proces. De tick-lus (500 ms) werkt alleen in het geheugen; een tick zonder inhoudelijke wijziging markeert de sessie niet als dirty. Sessies zonder commando’s of heartbeats langer dan `SESSION_IDLE_MS` (standaard 30 minuten), of voorbij `expiresAt` (`SESSION_TTL_HOURS`), worden gesloten en daarna uit geheugen en Postgres verwijderd. Zo blijft outbound bandbreedte naar Supabase laag. De API maakt de tabel zelf aan als hij ontbreekt, met row level security aan en zonder policies; de migratie in `supabase/migrations` doet hetzelfde. Alleen de API, via de connection string, leest en schrijft.

Omdat het geheugen de bron van waarheid is, draait er precies één API-instantie. Twee instanties naast elkaar zouden elkaars wijzigingen niet zien.

Er is bewust geen relationeel model per entiteit. De spelregels werken op het hele document in één atomaire stap, en er is geen tweede lezer die losse tabellen nodig heeft.

## Realtime

Beamer en telefoons openen `GET /api/sessions/:id/stream?kind=training|player&cursor=`. Dat is een server-sent-events-stroom met de Authorization-header (de client leest hem met `fetch`, niet met `EventSource`, omdat die geen headers kan sturen). De server stuurt direct een `snapshot` en daarna een nieuwe zodra de weergave verandert; de `cursor` is `projectionSeq * 1000 + stateVersion`. Elke tien seconden komt er een `ping`.

De client (`apps/web/src/live.ts`) valt terug op elke seconde ophalen als de stroom wegvalt, en probeert na vijf seconden opnieuw te streamen. Komt er vijftien seconden niets binnen, ook geen ping, dan breekt de client de verbinding zelf af: een half open verbinding achter een proxy of na een wifi-wissel mag niet als live gelden. Omdat elke snapshot de volledige weergave is, is er na herverbinden niets in te halen.

## Klok en animatie

De dispatcher verwerkt motorstappen en de outbox. Een herstart leest `dueAt` en de outbox opnieuw. De kaart rekent de positie van voertuigen uit `phaseEnteredAt`, `dueAt` en de servertijd in de snapshot, met een correctie voor het klokverschil van het apparaat. Animatie is een afgeleide van die klok, geen lokale timer die de beurt claimt. Bij hervatten na een pauze schuiven alle deadlines, de fase-starttijd en de begintijd van de beslissing mee, zodat pauzes niet als beslistijd meetellen.

## Identiteit

Lokaal krijgt elke browser een ondertekend dev-token (`dev.<userId>.<hmac>`). Dev-login staat standaard aan buiten productie en zonder Supabase, en kan met `ALLOW_DEV_AUTH` expliciet aan of uit. Staat hij expliciet aan, dan moet `AUTH_SECRET` gezet zijn. De testtafel op één computer geeft elk vak een eigen `slot`, zodat elk vak een eigen token in `localStorage` heeft.

Er is geen `getEverythingForSession` voor spelers. De vier diensten delen in deze simulatie één database; dat is geen fysiek decentraal netwerk.
