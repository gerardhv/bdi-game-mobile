# Game packs

Dit platform ondersteunt meerdere BDI-games met hetzelfde speelskelet (beamer + telefoons, claim/ready, zonder→met BDI, policy/authorize). Elk spel is een **pack**.

## Bestaande packs

| Id | Docs |
| --- | --- |
| `logistics` | [logistics.md](logistics.md) |
| `access` | [access.md](access.md) |

## Nieuw pack toevoegen

1. **Domain** onder `packages/domain/src/games/<id>/`:
   - `orgs.ts` — org- en step-constanten
   - `scenario.ts`, `steps.ts`, `policy.ts` — inhoud
   - `definition.ts` — exporteer een `GameDefinition` en registreer die in `packages/domain/src/catalog.ts`
2. **Web** onder `apps/web/src/games/<id>/`:
   - Host-visuals (kaart, explainer, …)
   - Registreer in `apps/web/src/games/registry.ts` (`hostPackFor`)
3. **Docs** — `docs/games/<id>.md` en een regel in deze tabel
4. Tests: `npm run typecheck` en `npm test`; e2e als je flow of `data-testid`s raakt

Session create stuurt `gameId`. Limieten (`MAX_OPEN_SESSIONS_PER_IP`, idle/TTL) en Postgres-flush gelden **engine-breed** over alle games — niet opnieuw per pack.

## Invarianten bij packs

- Geen I/O in domain-packs (deterministisch).
- Geen extra remote writes vanuit step-handlers; tick/persist-pad blijft debounced.
- Open-sessie-cap telt alle games per client-IP samen.
- Views lekken geen antwoorden of `scenarioSeed` naar spelers.
