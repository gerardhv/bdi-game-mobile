# BDI Game

Educatief multiplayer-platform voor BDI-lesspellen. Games delen één skelet (beamer + telefoons, zonder→met BDI). Het eerste pack is de logistieke keten: koper, verkoper, vervoerder en bezorger — fictieve organisaties, geen aansluiting op echte BDI-registers. Op de entree kies je welk spel je start; packs staan beschreven in [docs/games/](docs/games/).

De beamer toont een eiland met wegen waarover de lading rijdt, een vraagkaart met grote tegels, per rol wat die partij weet, en in de BDI-ronde de keten melding → toegang gecontroleerd → gegevens opgehaald → beschikbaar → bevestigd. De telefoon is een controller in de kleur van de rol: opdracht, meldingen en eigen dossier. Alleen de beamer maakt geluid.

## Draaien: lokaal of in de cloud

Er zijn twee manieren om het spel te draaien. Beide gebruiken dezelfde code.

| | Lokaal | Cloud |
| --- | --- | --- |
| Bedoeld voor | ontwikkelen, testen, spelen in één ruimte | spelen zonder laptop als server |
| Server | je eigen computer | Render (API) en Vercel (website) |
| Telefoons | op hetzelfde wifi-netwerk | overal, ook via mobiele data |
| Opslag | `services/game-api/data/game.json` | Supabase Postgres |
| Accounts nodig | geen | GitHub, Vercel, Render, Supabase (alle gratis) |
| Handleiding | [docs/local.md](docs/local.md) | [docs/deployment.md](docs/deployment.md) |

### Snel lokaal starten

Node.js 20+ is genoeg:

```bash
npm install
npm run dev:api
npm run dev          # in een tweede terminal
```

Open http://localhost:5173 en kies **Alle rollen op deze computer** om alleen te testen, of **Nieuw spel** om telefoons op hetzelfde wifi te laten scannen. Wifi-instellingen, hulpscripts en tests staan in [docs/local.md](docs/local.md).

### Online zetten

De website staat op Vercel, de game-API op Render en de sessies in Supabase Postgres, alle drie op het gratis plan en vanuit een privé GitHub-repository. De API draait op Render en niet op Vercel omdat het één langlopend proces is met een spelklok en open verbindingen. Stap voor stap: [docs/deployment.md](docs/deployment.md).

## Documentatie

Spel en inhoud:

- [Spelverloop](docs/gameplay.md): rollen, rondes, stappen S00 tot S20 en de file.
- [BDI-model in dit spel](docs/bdi-model.md): registers, rechten en de meldingsstroom.

Techniek:

- [Architectuur](docs/architecture.md): lagen, opslag, realtime, klok en identiteit.
- [Ontwerpkeuzes](docs/design-decisions.md): afwijkingen van de specificatie en waarom.
- [AGENTS.md](AGENTS.md): instructies voor AI-agents (Engels): commando's, codekaart, invarianten en werkwijze bij veelvoorkomende wijzigingen.

Draaien en beheren:

- [Lokaal draaien en testen](docs/local.md): starten, telefoons op wifi, instellingen, hulpscripts, tests.
- [Online zetten (cloud)](docs/deployment.md): Vercel, Render en Supabase, beheer en problemen oplossen.
- [`.env.example`](.env.example): alle omgevingsvariabelen met uitleg.
- [`render.yaml`](render.yaml) en [`vercel.json`](vercel.json): de cloudconfiguratie.

## Mappen

- `packages/domain`: spelregels, scenario en beleid (TypeScript, gedeeld door server en tests).
- `services/game-api`: de autoritatieve HTTP-server (Hono op Node).
- `apps/web`: beamer- en telefoonapp (React, Vite).
- `supabase/`: lokale Supabase-configuratie en de databasemigratie.
- `e2e/`: Playwright-acceptatietests. `scripts/`: hulpscripts.
