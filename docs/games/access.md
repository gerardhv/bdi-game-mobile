# Wie mag deze gegevens zien?

Spelpack `access`: een trainingsgame over identificatie, onboarding, authenticatie, transportbetrokkenheid en autorisatie binnen **één** Association (Logistiek Association). Speelduur ongeveer 25 minuten inclusief nabespreking.

## Rollen

| Org-id | Schermnaam | Fictieve organisatie |
| --- | --- | --- |
| `admin` | Association Admin | Beheerder van Logistiek Association |
| `owner` | Data Owner | Verlader Atlas (ook transportorchestrator in deze oefening) |
| `provider` | Data Service Provider | LogiData |
| `consumer` | Data Consumer | Vervoerder Delta |

Atlas en LogiData zijn bij aanvang al Member. Delta doorloopt onboarding op **organisatieniveau**. Er is geen aparte applicatieregistratie en geen stemronde.

## Eenmalig versus herhalend

Op de beamer staat een **fasenstrip** met een zichtbare knip:

- **Eenmalig:** onboarding (dossier → organisatie aangesloten / BVAD)
- **Herhalend per handeling:** betrokkenheid → beleid → authenticatie → verzoek/beslissing (eventueel intrekken/herstellen)

## Starten

1. Kies op de startpagina **Wie mag deze gegevens zien?**
2. Start een nieuw spel (startmodus `story`).
3. Vier spelers claimen via QR of sessiecode de vier rollen en tikken op Klaar.
4. De spelleider start. Pauze, terugkijken, herstart en beëindigen werken zoals bij de logistieke game.

De spelleider hoeft geen verborgen toegangsbesluiten te nemen. De server bepaalt authenticatie- en toegangsuitkomsten.

## Speelstappen

1. **Onboarding (eenmalig)** — Delta dient een organisatiedossier in. Admin legt een volledig dossier vast of geeft het terug. Resultaat: BVAD, actieve deelname. Geen systeem-/app-registratie.
2. **Betrokkenheid (Data Owner)** — Atlas legt vast wie voor T-101 gegevens mag ophalen (Delta → BVOD). Dit gebeurt vóór authenticatie en vóór enig gegevensverzoek.
3. **Beleid (Data Owner)** — Atlas zet wat gedeeld mag worden (laadinformatie / financiële gegevens).
4. **Authenticatie (Data Consumer → Data Service Provider)** — Delta kiest een geldig of verlopen digitaal middel van de organisatie. LogiData controleert. Alleen het geldige middel slaagt; lidmaatschap blijft actief bij een verlopen middel.
5. **Verzoek + beslissing** — Delta vraagt drie kaarten. LogiData beoordeelt elk verzoek met identiteit, deelname, vastgelegde betrokkenheid en beleid.
6. **Toestemming verandert** — Atlas trekt in / herstelt. Geen nieuwe onboarding. Eerder ontvangen gegevens blijven gelabeld.

## Nabespreking

Op de beamer: opdracht uitgevoerd, passende gegevens gedeeld, herstel nodig geweest, eventueel onnodige financiële deling, plus bespreekvragen.

## Technische notities

- Domain: `packages/domain/src/games/access/`
- Web: `apps/web/src/games/access/` (fasenstrip op `AccessBoard`)
- Commando’s via `POST /api/sessions/:id/access`
- Geen tweede Association, onderaannemers of Authorization Registry in deze basisgame
