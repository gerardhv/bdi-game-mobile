# Ontwerpkeuzes

De specificatie vroeg Supabase Edge Functions. De spelregels staan in één TypeScript-pakket zodat unit tests en de server dezelfde reducer gebruiken. Een Edge Function importeert dat pakket niet betrouwbaar. Daarom is `services/game-api` de autoritatieve server. Supabase blijft de plek voor Postgres, anonieme Auth en afgeschermde signalen. De service-role key komt niet in de frontend.

Lokaal zonder Supabase krijgt elke browser een eigen ondertekend dev-token. Dat is een tijdelijke gebruikersidentiteit, niet de publieke projectsleutel. Zet `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` en `SUPABASE_ANON_KEY` om anonieme Supabase-login te gebruiken, en daarna `ALLOW_DEV_AUTH=false`.

Met `DATABASE_URL` bewaart de API elke sessie in de Postgres-tabel `session_documents`. Zonder die variabele blijft het een lokaal JSON-bestand. Schrijven naar Postgres gebeurt niet na elke tick of heartbeat: wijzigingen worden gebundeld (`PERSIST_INTERVAL_MS`, standaard 15 s). Nieuwe en gesloten sessies gaan meteen weg. Verlaten sessies (geen commando/heartbeat gedurende `SESSION_IDLE_MS`, standaard 30 minuten) en verlopen sessies worden gesloten en uit geheugen én Postgres verwijderd, zodat idle spellen geen blijvende last blijven. Nieuw aanmaken is begrensd op `MAX_OPEN_SESSIONS_PER_IP` open sessies per client-IP (standaard 10), zodat één netwerk niet eindeloos lobbies kan openen. Die limiet beschermt de gehoste API en geldt standaard alleen met `NODE_ENV=production`. Lokaal komen alle verzoeken via de Vite-proxy van hetzelfde adres, zodat testtafels en herstarts de limiet anders snel vullen.

Hosting: website op Vercel, API op Render, opslag in Supabase Postgres. De repository is privé, dus GitHub Pages valt af. De API draait niet als Vercel Function omdat hij één langlopend proces is: sessies in het geheugen, een tik elke 500 ms en open SSE-verbindingen. Dat vraagt één vaste instantie, geen kortlevende functies. Met hooguit drie spellen van vijf deelnemers tegelijk is één gratis Render-instantie ruim genoeg; hoge beschikbaarheid is geen doel. Postgres is nodig omdat Render Free slaapt en geen blijvende schijf heeft. Zie [deployment.md](deployment.md).

De file staat op dag 2, 04:30, vóór 05:00, 06:00 en 08:00. Hoeveelheid is 1. De presentatie duurt 3000 ms en de BDI-pipeline 1000 ms, beide via omgevingsvariabelen.

`SUBSCRIPTIONS` bestaat alleen met BDI. Vergelijking ontstaat alleen als ronde 1 en ronde 2 allebei zijn gespeeld.

De ideeënlijst na de specificatie is niet gebouwd.

Pack `access` (*Wie mag deze gegevens zien?*) heeft een eigen reducer en `session.access`-document in plaats van de logistieke stappen S00–S20 en de zonder/met-BDI-rondes. Die game past niet in de meerkeuze-en-outbox-flow; sessie, QR-rollen, pauze, tick en persist blijven gedeeld.

In `access` neemt de speler van de Data Service Provider het toegangsbesluit zelf: per verzoek raadpleegt hij het Association Register, het Orchestration Register en het beleid van de Data Owner, en kiest leveren of weigeren. De server bepaalt de waarheid per laag en keurt het besluit goed of af (geen levering zonder alle bronnen, geen levering bij een "nee", geen weigering zonder reden). Zo ervaren spelers dat het besluit lokaal valt op bewijs uit onafhankelijke bronnen. In werkelijkheid doet de BDI Connector dit automatisch; dat komt terug in de begrippen en de nabespreking.

Authenticatie is in `access` geen losse stap maar onderdeel van elk verzoek: Delta ondertekent het token met de eigen private key (zoals in het trust-anchor-model) en LogiData controleert het met de sleutel uit het Association Register. Het token van gisteren laat zien dat authenticatie per verzoek faalt terwijl het lidmaatschap blijft. De token-claims op de beamer zijn illustratief; de BDI schrijft geen claimprofiel voor.

Voorspellingen in `access` hebben geen `expectedVersion`, verhogen de versie niet en mogen tijdens de presentatiepauze. Vier spelers voorspellen tegelijk; met versiecontrole zouden ze elkaar en LogiData steeds een conflict geven. Ze sluiten zodra LogiData de eerste bron raadpleegt of besluit, en uiterlijk 15 seconden na de presentatiepauze (pauzeren schuift die termijn mee).

Foute keuzes in `access` blijven in de scène staan, met uitleg op beamer en telefoon; de speler kiest opnieuw. Ze tellen als leermoment in de nabespreking, niet als strafpunt.