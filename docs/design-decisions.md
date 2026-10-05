# Ontwerpkeuzes

De specificatie vroeg Supabase Edge Functions. De spelregels staan in één TypeScript-pakket zodat unit tests en de server dezelfde reducer gebruiken. Een Edge Function importeert dat pakket niet betrouwbaar. Daarom is `services/game-api` de autoritatieve server. Supabase blijft de plek voor Postgres, anonieme Auth en afgeschermde signalen. De service-role key komt niet in de frontend.

Lokaal zonder Supabase krijgt elke browser een eigen ondertekend dev-token. Dat is een tijdelijke gebruikersidentiteit, niet de publieke projectsleutel. Zet `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `SUPABASE_URL` en `SUPABASE_ANON_KEY` om anonieme Supabase-login te gebruiken, en daarna `ALLOW_DEV_AUTH=false`.

Met `DATABASE_URL` bewaart de API elke sessie in de Postgres-tabel `session_documents`. Zonder die variabele blijft het een lokaal JSON-bestand. Schrijven naar Postgres gebeurt niet na elke tick of heartbeat: wijzigingen worden gebundeld (`PERSIST_INTERVAL_MS`, standaard 15 s). Nieuwe en gesloten sessies gaan meteen weg. Verlaten sessies (geen commando/heartbeat gedurende `SESSION_IDLE_MS`, standaard 30 minuten) en verlopen sessies worden gesloten en uit geheugen én Postgres verwijderd, zodat idle spellen geen blijvende last blijven.

Hosting: website op Vercel, API op Render, opslag in Supabase Postgres. De repository is privé, dus GitHub Pages valt af. De API draait niet als Vercel Function omdat hij één langlopend proces is: sessies in het geheugen, een tik elke 500 ms en open SSE-verbindingen. Dat vraagt één vaste instantie, geen kortlevende functies. Met hooguit drie spellen van vijf deelnemers tegelijk is één gratis Render-instantie ruim genoeg; hoge beschikbaarheid is geen doel. Postgres is nodig omdat Render Free slaapt en geen blijvende schijf heeft. Zie [deployment.md](deployment.md).

De file staat op dag 2, 04:30, vóór 05:00, 06:00 en 08:00. Hoeveelheid is 1. De presentatie duurt 3000 ms en de BDI-pipeline 1000 ms, beide via omgevingsvariabelen.

`SUBSCRIPTIONS` bestaat alleen met BDI. Vergelijking ontstaat alleen als ronde 1 en ronde 2 allebei zijn gespeeld.

De ideeënlijst na de specificatie is niet gebouwd.
