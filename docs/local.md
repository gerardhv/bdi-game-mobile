# Lokaal draaien en testen

Voor ontwikkelen, testen en spelen in één ruimte. Alles draait op je eigen computer; een cloudaccount is niet nodig. Telefoons doen mee via hetzelfde wifi-netwerk.

Wil je spelen zonder dat je computer de server is, of met telefoons op mobiele data, zie dan [Online zetten](deployment.md).

## Vereisten

- Node.js 20 of nieuwer (https://nodejs.org)
- Een browser. Voor de acceptatietests installeert Playwright zelf Chromium.

## Starten

Twee terminals in de map van het project:

```bash
npm install
npm run dev:api     # game-API op http://localhost:8787
```

```bash
npm run dev         # website op http://localhost:5173
```

De ontwikkelserver stuurt `/api` door naar de API, dus je hoeft niets in te stellen.

Open http://localhost:5173 op de computer en kies:

- **Alle rollen op deze computer**: beamer bovenaan en vier telefoonvakken eronder, elk met een eigen identiteit. Handig om alleen te testen.
- **Nieuw spel**: echte telefoons scannen de QR-code (zie hieronder).
- **Direct de BDI-ronde**: slaat de ronde zonder BDI over.

Beamer-sneltoetsen: spatie pauzeert, ← opent de terugblik en bladert terug, → bladert vooruit, Esc opent het beheer, F geeft volledig scherm.

## Spelen met echte telefoons op wifi

De computer en de telefoons moeten op hetzelfde wifi-netwerk zitten. Mobiele data op de telefoon werkt niet. Gastnetwerken die apparaten van elkaar afschermen (vaak op kantoor of in hotels) werken ook niet; gebruik dan een hotspot of de [cloudversie](deployment.md).

1. Start API en website zoals hierboven en kies **Nieuw spel**.
2. De QR-codes wijzen naar het wifi-adres van de computer, bijvoorbeeld `http://192.168.1.20:5173`, niet naar `localhost`.
3. Vraagt Windows of Node.js netwerktoegang mag: kies **privénetwerk** en sta het toe.
4. Scan een code met de gewone camera van de telefoon, tik op de link en kies **Neem deze rol**.
5. Lukt scannen niet, typ dan het adres boven de QR-codes in de browser van de telefoon en gebruik **Deelnemen** met de sessiecode.

## Instellingen

De API en de website lezen geen `.env`-bestand. Standaardwaarden zijn voor lokaal gebruik goed. Wil je iets aanpassen, zet de variabele dan in de terminal voordat je start, bijvoorbeeld in PowerShell:

```powershell
$env:PRESENTATION_MS = "1500"
npm run dev:api
```

Alle variabelen met uitleg staan in [`.env.example`](../.env.example). Lokaal staat dev-login automatisch aan: elke browser krijgt een ondertekend tijdelijk token.

## Opslag

Zonder verdere instelling bewaart de API sessies in `services/game-api/data/game.json`. Een herstart van de API verliest het spel dus niet. Verwijder dat bestand om met een schone lei te beginnen.

Optioneel kun je lokaal tegen Postgres testen, net als in de cloud. Met de [Supabase CLI](https://supabase.com/docs/guides/local-development) en Docker:

```powershell
npx supabase start
$env:DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:54322/postgres"
npm run dev:api
```

De API maakt de tabel `session_documents` zelf aan. `npx supabase stop` zet de lokale database weer uit.

## Hulpscripts

- `node scripts/seed-session.mjs` maakt een sessie met vier geclaimde, gereed gemelde rollen en print per rol een inloglink. Met `--start` start ronde 1, met `--keepalive` blijven de rollen verbonden, en met `--autoplay S16` speelt het script zelf tot die stap en logt elke handeling. Alleen lokaal: het gebruikt dev-login.
- `npm run dispatcher` post elke halve seconde een tick naar de API. De API doet dat zelf ook; de losse dispatcher is de herstartbare variant.
- `npm run testmode` opent een hostvenster. `npm run sessions:two` opent twee onafhankelijke hosts.
- `npm run check:bundle` bouwt de website en controleert dat er geen geheime sleutels in de bundel staan.

## Tests

```bash
npm run typecheck   # TypeScript-controle van domein, API en website
npm test            # domein- en API-tests (Vitest)
npx playwright install chromium
npm run test:e2e    # acceptatietests in echte browsers (Playwright)
```

De acceptatietests starten zelf de API en de website als die nog niet draaien. Elke rol krijgt een eigen browsercontext, dus een eigen identiteit; de beamer draait op 1920×1080 en de telefoons op 360×640, 390×844 en 430×932.

Teststatus:

- `npm test`: 7 tests slagen. Ze dekken productbevestiging op id, het file-voorbeeld 06:00/06:30 zonder BDI, meldingen pas na een BDI-abonnement, geweigerde bronlezing, pauzetijd die niet als beslistijd telt, gelijktijdige rolclaim, de afgeschermde trainingsweergave, en dat de API commandotype en gebruiker nooit uit de request-body overneemt.
- `npm run test:e2e`: 3 scenario's slagen lokaal in Chromium, samen in ongeveer 6 minuten:
  - Twee volledige rondes met beamer en vier losse telefoons. Daarbij wordt een telefoon midden in de ronde herladen, scrolt de beamer niet, scrollen telefoons niet horizontaal, komen meldingen alleen in de BDI-ronde en maakt de BDI-ronde minder foute pogingen.
  - Een bezette rol toont direct de vrije rollen.
  - De spelleider kan pauzeren, terugblikken en hervatten met het toetsenbord.

  Met `E2E_VERBOSE=1` logt de test elke tik en het antwoord van de server.

Niet automatisch getest: geluid, de kaartanimaties zelf (alleen dat ze op servertijd lopen), en echte telefoons op wifi. Die zijn met de hand in de browser bekeken.
