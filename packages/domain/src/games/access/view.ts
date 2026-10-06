import { getGame } from '../../catalog.js'
import type { Language, SessionState } from '../../types.js'
import { orgNameOf, roleLabelOf } from '../../game-definition.js'
import { accessScenario, type CardId } from './scenario.js'
import { accessActor } from './reduce.js'
import { currentPolicy, t, type AccessChecks, type AccessScene, type AccessState } from './state.js'
import type { AccessOrgId } from './orgs.js'

export type AccessPlayerView = {
  sessionId: string
  sessionName: string
  gameId: 'access'
  code: string
  language: Language
  role: AccessOrgId
  organizationName: string
  roleLabel: string
  displayName: string | null
  connection: string
  expired: boolean
  paused: boolean
  ready: boolean
  cursor: number
  serverNow: string
  access: null | AccessPlayPayload
}

export type AccessPlayPayload = {
  id: string
  version: number
  scene: AccessState['scene']
  canAct: boolean
  waitingFor: string | null
  actor: AccessOrgId | null
  message: string | null
  compareExpiredHint: string | null
  checks: AccessChecks
  checksLabels: { id: keyof AccessChecks; label: string; status: AccessChecks[keyof AccessChecks]; statusLabel: string }[]
  prompt: string | null
  dossier: null | {
    pending: boolean
    latest: AccessState['dossiers'][number] | null
    cards: { id: string; label: string; included: boolean }[]
  }
  system: null | { checks: { id: string; label: string; done: boolean }[]; registered: boolean }
  credentials: null | { id: string; label: string; status: string }[]
  selectedCredentialId: string | null
  policy: null | { shareLoading: boolean; shareFinance: boolean; version: number }
  cards: null | { id: CardId; title: string; asked: boolean; lastAllowed: boolean | null; lastReason: string | null }[]
  received: { cardId: CardId; title: string; payload: string; label: string }[]
  proofs: { bvad: boolean; bvod: boolean }
  debrief: null | {
    missionDone: boolean
    appropriateShare: boolean
    restoreNeeded: boolean
    oversharedFinance: boolean
    questions: string[]
  }
  holdUntil: string | null
}

export type AccessTrainingView = {
  sessionId: string
  sessionName: string
  gameId: 'access'
  gameTitle: string
  code: string
  language: Language
  status: SessionState['status']
  paused: boolean
  comparison: boolean
  canStart: boolean
  startMode: SessionState['startMode']
  roles: {
    organizationId: string
    name: string
    roleLabel: string
    blurb: string
    claimed: boolean
    displayName: string | null
    ready: boolean
    connection: string
    inviteToken: string | null
  }[]
  access: null | {
    id: string
    version: number
    scene: AccessState['scene']
    message: string | null
    compareExpiredHint: string | null
    actor: AccessOrgId | null
    checks: AccessChecks
    checksLabels: AccessPlayPayload['checksLabels']
    requestLabel: string | null
    prompt: string | null
    policy: { shareLoading: boolean; shareFinance: boolean; version: number }
    members: { organizationId: string; name: string; status: string }[]
    orchestration: { transportId: string; carrierName: string; role: string }[]
    proofs: {
      bvad: AccessState['bvad']
      bvod: AccessState['bvodT101']
      baseAccess: boolean
    }
    flights: { id: string; kind: 'proof' | 'data'; from: string; to: string; label: string }[]
    received: AccessPlayPayload['received']
    history: AccessState['history']
    debrief: AccessPlayPayload['debrief']
    termCards: { term: string; text: string }[]
    holdUntil: string | null
    metrics: AccessState['metrics']
    stepTrack: AccessStepTrack
  }
  rounds: []
  round: null
  serverNow: string
  cursor: number
}

function checkLabels(checks: AccessChecks, language: Language): AccessPlayPayload['checksLabels'] {
  const statusLabel = (status: AccessChecks[keyof AccessChecks]) => {
    if (status === 'confirmed') return t(language, 'Bevestigd', 'Confirmed')
    if (status === 'failed') return t(language, 'Niet in orde', 'Not in order')
    if (status === 'unknown') return t(language, 'Niet vast te stellen', 'Cannot be established')
    return t(language, 'Nog niet beoordeeld', 'Not yet assessed')
  }
  return [
    { id: 'identity', label: t(language, 'Identiteit', 'Identity'), status: checks.identity, statusLabel: statusLabel(checks.identity) },
    { id: 'membership', label: t(language, 'Association-deelname', 'Association participation'), status: checks.membership, statusLabel: statusLabel(checks.membership) },
    { id: 'involvement', label: t(language, 'Transportbetrokkenheid', 'Transport involvement'), status: checks.involvement, statusLabel: statusLabel(checks.involvement) },
    { id: 'policy', label: t(language, 'Toegang volgens beleid', 'Access under policy'), status: checks.policy, statusLabel: statusLabel(checks.policy) },
  ]
}

function waitingLabel(access: AccessState, language: Language): string {
  const actor = accessActor(access)
  if (!actor) return t(language, 'Nabespreking', 'Debrief')
  return t(language,
    `Wacht op ${accessScenario.organizations[actor].roleLabel.nl}`,
    `Waiting for ${accessScenario.organizations[actor].roleLabel.en}`)
}

export type AccessPhase = 'once' | 'repeat'
export type AccessStepId = 'onboard' | 'involve' | 'policy' | 'auth' | 'request' | 'debrief'

export type AccessStepTrack = {
  phase: AccessPhase
  onceLabel: string
  repeatLabel: string
  steps: { id: AccessStepId; band: AccessPhase; label: string; status: 'done' | 'active' | 'todo' }[]
}

function stepIdForScene(scene: AccessScene): AccessStepId {
  switch (scene) {
    case 'dossier':
    case 'system':
      return 'onboard'
    case 'involveAsk':
    case 'involveRegister':
    case 'involveProofs':
      return 'involve'
    case 'policyEdit':
    case 'revoke':
    case 'restore':
      return 'policy'
    case 'authChoose':
    case 'authCheck':
      return 'auth'
    case 'policyAsk':
    case 'revokeAsk':
    case 'restoreAsk':
      return 'request'
    case 'debrief':
      return 'debrief'
  }
}

export function accessStepTrack(access: AccessState, language: Language): AccessStepTrack {
  const active = stepIdForScene(access.scene)
  const defs: { id: AccessStepId; band: AccessPhase; nl: string; en: string }[] = [
    { id: 'onboard', band: 'once', nl: 'Onboarding', en: 'Onboarding' },
    { id: 'involve', band: 'repeat', nl: 'Betrokkenheid', en: 'Involvement' },
    { id: 'policy', band: 'repeat', nl: 'Beleid', en: 'Policy' },
    { id: 'auth', band: 'repeat', nl: 'Authenticatie', en: 'Authentication' },
    { id: 'request', band: 'repeat', nl: 'Verzoek', en: 'Request' },
    { id: 'debrief', band: 'repeat', nl: 'Nabespreking', en: 'Debrief' },
  ]
  const activeIndex = defs.findIndex((d) => d.id === active)
  return {
    phase: active === 'onboard' ? 'once' : 'repeat',
    onceLabel: t(language, 'Eenmalig', 'One-time'),
    repeatLabel: t(language, 'Herhalend per handeling', 'Repeating per action'),
    steps: defs.map((def, index) => ({
      id: def.id,
      band: def.band,
      label: language === 'en' ? def.en : def.nl,
      status: index < activeIndex ? 'done' : index === activeIndex ? 'active' : 'todo',
    })),
  }
}

function promptFor(access: AccessState, role: AccessOrgId, language: Language): string | null {
  const actor = accessActor(access)
  if (actor !== role) return null
  switch (access.scene) {
    case 'dossier':
      return role === 'consumer'
        ? t(language, 'Stel het eenmalige onboardingdossier samen', 'Assemble the one-time onboarding dossier')
        : t(language, 'Beoordeel het onboardingdossier', 'Review the onboarding dossier')
    case 'system':
      return t(language, 'Onboarding afronden', 'Finish onboarding')
    case 'authChoose':
      return t(language, 'Kies het digitale middel van de organisatie', 'Choose the organisation digital credential')
    case 'authCheck':
      return t(language, 'Controleer authenticatie van de organisatie', 'Check organisation authentication')
    case 'involveAsk':
      return t(language, 'Vraag laadinformatie T-101', 'Request loading info T-101')
    case 'involveRegister':
      return t(language, 'Leg vast wie gegevens mag ophalen voor T-101', 'Record who may retrieve data for T-101')
    case 'involveProofs':
      return t(language, 'Neem BVAD en BVOD mee in de afweging', 'Include BVAD and BVOD in the assessment')
    case 'policyEdit':
      return t(language, 'Stel het toegangsbeleid in', 'Set the access policy')
    case 'policyAsk':
      return t(language, 'Vraag gegevens op — de Data Service Provider beslist', 'Request data — the Data Service Provider decides')
    case 'revoke':
      return t(language, 'Trek leesrecht voor laadinformatie in', 'Revoke loading-info read access')
    case 'revokeAsk':
      return t(language, 'Vraag laadinformatie T-101 opnieuw', 'Request loading info T-101 again')
    case 'restore':
      return t(language, 'Herstel beperkte toestemming', 'Restore limited consent')
    case 'restoreAsk':
      return t(language, 'Vraag laadinformatie T-101 opnieuw', 'Request loading info T-101 again')
    default:
      return null
  }
}

function debriefSummary(access: AccessState, language: Language): AccessPlayPayload['debrief'] {
  if (access.scene !== 'debrief') return null
  const overshared = access.policies.some((p) => p.shareFinance)
  const appropriate = access.requests.some((r) => {
    const policy = access.policies.find((p) => p.version === r.policyVersion)
    return policy && policy.shareLoading && !policy.shareFinance
      && (['load-T-101', 'finance-T-101', 'load-T-102'] as CardId[]).every((id) =>
        access.requests.some((x) => x.cardId === id && x.policyVersion === policy.version))
  })
  return {
    missionDone: true,
    appropriateShare: Boolean(appropriate),
    restoreNeeded: access.revokedOnce && access.restoredOnce,
    oversharedFinance: overshared,
    questions: accessScenario.debriefQuestions.map((q) => q[language]),
  }
}

function canAct(access: AccessState, role: AccessOrgId, now: string): boolean {
  if (access.paused) return false
  if (access.holdUntil && now < access.holdUntil) return false
  return accessActor(access) === role
}

function playPayload(access: AccessState, role: AccessOrgId, language: Language, now: string): AccessPlayPayload {
  const latest = access.dossiers.at(-1) ?? null
  const policy = currentPolicy(access)
  const cardIds = Object.keys(accessScenario.cards) as CardId[]
  return {
    id: access.id,
    version: access.version,
    scene: access.scene,
    canAct: canAct(access, role, now),
    waitingFor: canAct(access, role, now) ? null : waitingLabel(access, language),
    actor: accessActor(access),
    message: access.message,
    compareExpiredHint: role === 'consumer' || role === 'provider' ? access.compareExpiredHint : null,
    checks: access.checks,
    checksLabels: checkLabels(access.checks, language),
    prompt: promptFor(access, role, language),
    dossier: role === 'consumer' || role === 'admin' ? {
      pending: Boolean(latest && latest.decision === 'pending'),
      latest,
      cards: accessScenario.dossierCards.map((card) => ({
        id: card.id,
        label: card.label[language],
        included: latest
          ? (card.id === 'org-identity' ? latest.cards.orgIdentity
            : card.id === 'representative' ? latest.cards.representative
              : latest.cards.terms)
          : false,
      })),
    } : null,
    system: null,
    credentials: role === 'consumer' && (access.scene === 'authChoose' || access.scene === 'authCheck')
      ? [
        { id: accessScenario.credentials.expired.id, label: accessScenario.credentials.expired.label[language], status: 'expired' },
        { id: accessScenario.credentials.valid.id, label: accessScenario.credentials.valid.label[language], status: 'active' },
      ]
      : null,
    selectedCredentialId: access.selectedCredentialId,
    policy: role === 'owner' ? { shareLoading: policy.shareLoading, shareFinance: policy.shareFinance, version: policy.version } : null,
    cards: role === 'consumer' && ['involveAsk', 'policyAsk', 'revokeAsk', 'restoreAsk'].includes(access.scene)
      ? cardIds.filter((id) => access.scene === 'involveAsk' ? id === 'load-T-101' : true).map((id) => {
        const last = [...access.requests].reverse().find((r) => r.cardId === id)
        return {
          id,
          title: accessScenario.cards[id].title[language],
          asked: Boolean(last),
          lastAllowed: last ? last.allowed : null,
          lastReason: last?.reason ?? null,
        }
      })
      : null,
    received: access.received
      .filter((item) => role === 'consumer' || role === 'provider' /* host sees via training */)
      .filter(() => role === 'consumer')
      .map((item) => ({
        cardId: item.cardId,
        title: accessScenario.cards[item.cardId].title[language],
        payload: item.payload,
        label: t(language, 'Eerder ontvangen', 'Previously received'),
      })),
    proofs: { bvad: Boolean(access.bvad), bvod: Boolean(access.bvodT101) },
    debrief: debriefSummary(access, language),
    holdUntil: access.holdUntil,
  }
}

export function accessPlayerView(session: SessionState, userId: string, now: string): AccessPlayerView | null {
  const role = session.roles.find((item) => item.playerUserId === userId)
  if (!role) return null
  const org = role.organizationId as AccessOrgId
  const game = getGame(session.gameId)
  const access = session.access
  return {
    sessionId: session.id,
    sessionName: session.name,
    gameId: 'access',
    code: session.code,
    language: session.language,
    role: org,
    organizationName: orgNameOf(game, org, session.language),
    roleLabel: roleLabelOf(game, org, session.language),
    displayName: role.displayName,
    connection: role.connectionStatus,
    expired: session.status === 'closed',
    paused: session.status === 'paused' || Boolean(access?.paused),
    ready: role.ready,
    cursor: (access?.projectionSeq ?? 0) * 1000 + (access?.version ?? 0),
    serverNow: now,
    access: access ? playPayload(access, org, session.language, now) : null,
  }
}

export function accessTrainingView(session: SessionState, now: string): AccessTrainingView {
  const game = getGame(session.gameId)
  const ready = session.roles.every((role) => role.playerUserId && role.ready)
  const access = session.access
  const lastRequest = access?.history.filter((h) => h.type === 'request').at(-1)
  return {
    sessionId: session.id,
    sessionName: session.name,
    gameId: 'access',
    gameTitle: game.titles[session.language],
    code: session.code,
    language: session.language,
    status: session.status,
    paused: session.status === 'paused' || Boolean(access?.paused),
    comparison: false,
    canStart: ready && session.status !== 'closed',
    startMode: session.startMode,
    roles: session.roles.map((role) => {
      const def = game.orgs.find((o) => o.id === role.organizationId)!
      return {
        organizationId: role.organizationId,
        name: def.name[session.language],
        roleLabel: def.roleLabel[session.language],
        blurb: def.blurb[session.language],
        claimed: Boolean(role.playerUserId),
        displayName: role.displayName,
        ready: role.ready,
        connection: role.connectionStatus,
        inviteToken: role.playerUserId ? null : role.inviteToken,
      }
    }),
    access: access ? {
      id: access.id,
      version: access.version,
      scene: access.scene,
      message: access.message,
      compareExpiredHint: access.compareExpiredHint,
      actor: accessActor(access),
      checks: access.checks,
      checksLabels: checkLabels(access.checks, session.language),
      requestLabel: lastRequest?.frame.requestLabel ?? null,
      prompt: lastRequest?.frame.prompt ?? promptFor(access, accessActor(access) ?? 'consumer', session.language),
      policy: currentPolicy(access),
      members: Object.entries(access.members).map(([organizationId, status]) => {
        const org = Object.values(accessScenario.organizations).find((o) => o.id === organizationId)
        return {
          organizationId,
          name: org?.name[session.language] ?? organizationId,
          status: status === 'active'
            ? t(session.language, 'Actief', 'Active')
            : t(session.language, 'In behandeling', 'Pending'),
        }
      }),
      orchestration: access.orchestration.map((item) => ({
        transportId: item.transportId,
        carrierName: item.carrierOrgId === accessScenario.organizations.consumer.id
          ? accessScenario.organizations.consumer.name[session.language]
          : (accessScenario.transports['T-102'].carrierName[session.language]),
        role: t(session.language, 'Vervoerder', 'Carrier'),
      })),
      proofs: {
        bvad: access.bvad,
        bvod: access.bvodT101,
        baseAccess: Boolean(access.baseAccessToken),
      },
      flights: buildFlights(access, session.language),
      received: access.received.map((item) => ({
        cardId: item.cardId,
        title: accessScenario.cards[item.cardId].title[session.language],
        payload: item.payload,
        label: t(session.language, 'Eerder ontvangen', 'Previously received'),
      })),
      history: access.history,
      debrief: debriefSummary(access, session.language),
      termCards: accessScenario.termCards.map((card) => ({ term: card.term, text: card[session.language] })),
      holdUntil: access.holdUntil,
      metrics: access.metrics,
      stepTrack: accessStepTrack(access, session.language),
    } : null,
    rounds: [],
    round: null,
    serverNow: now,
    cursor: (access?.projectionSeq ?? 0) * 1000 + (access?.version ?? 0),
  }
}

function buildFlights(access: AccessState, language: Language): { id: string; kind: 'proof' | 'data'; from: string; to: string; label: string }[] {
  const flights: { id: string; kind: 'proof' | 'data'; from: string; to: string; label: string }[] = []
  if (access.bvad) {
    flights.push({
      id: 'bvad',
      kind: 'proof',
      from: 'association-register',
      to: 'provider',
      label: 'BVAD',
    })
  }
  if (access.bvodT101) {
    flights.push({
      id: 'bvod',
      kind: 'proof',
      from: 'orchestration-registry',
      to: 'provider',
      label: 'BVOD',
    })
  }
  const lastAllowed = [...access.requests].reverse().find((r) => r.allowed)
  if (lastAllowed) {
    flights.push({
      id: `data-${lastAllowed.id}`,
      kind: 'data',
      from: 'provider',
      to: 'consumer',
      label: accessScenario.cards[lastAllowed.cardId].title[language],
    })
  }
  return flights
}
