import type { Ctx } from '../../runtime.js'
import { GameError, type Language, type SessionState } from '../../types.js'
import { decideCardRequest } from './decide.js'
import { accessScenario, type CardId } from './scenario.js'
import {
  blankAccess,
  currentPolicy,
  t,
  type AccessChecks,
  type AccessFrame,
  type AccessScene,
  type AccessState,
  type DossierVersion,
} from './state.js'
import type { AccessOrgId } from './orgs.js'

export type AccessCommand =
  | { type: 'accessSubmitDossier'; userId: string; expectedVersion: number; actionId: string; orgIdentity: boolean; representative: boolean; terms: boolean }
  | { type: 'accessDossierDecision'; userId: string; expectedVersion: number; actionId: string; decision: 'commit' | 'return' }
  | { type: 'accessRegisterSystem'; userId: string; expectedVersion: number; actionId: string; belongs: boolean; endpoint: boolean; credential: boolean }
  | { type: 'accessChooseCredential'; userId: string; expectedVersion: number; actionId: string; credentialId: 'cred-valid' | 'cred-expired' }
  | { type: 'accessCheckRequest'; userId: string; expectedVersion: number; actionId: string }
  | { type: 'accessRegisterCarrier'; userId: string; expectedVersion: number; actionId: string }
  | { type: 'accessCheckProofs'; userId: string; expectedVersion: number; actionId: string }
  | { type: 'accessSetPolicy'; userId: string; expectedVersion: number; actionId: string; shareLoading: boolean; shareFinance: boolean }
  | { type: 'accessAskCard'; userId: string; expectedVersion: number; actionId: string; cardId: CardId }
  | { type: 'accessPredict'; userId: string; expectedVersion: number; actionId: string; guess: 'allow' | 'deny' }

function iso(ms: number): string {
  return new Date(ms).toISOString()
}

function plus(now: string, ms: number): string {
  return iso(new Date(now).getTime() + ms)
}

function roleOf(session: SessionState, userId: string): AccessOrgId | null {
  const found = session.roles.find((role) => role.playerUserId === userId)?.organizationId
  if (!found) return null
  if (found === 'admin' || found === 'owner' || found === 'provider' || found === 'consumer') return found
  return null
}

function requireAccess(session: SessionState): AccessState {
  if (session.gameId !== 'access' || !session.access) {
    throw new GameError('bad_game', 'Deze actie hoort bij een ander spel.', 409)
  }
  return session.access
}

function assertActor(session: SessionState, userId: string, expected: AccessOrgId): AccessOrgId {
  const org = roleOf(session, userId)
  if (org !== expected) throw new GameError('forbidden', 'Deze rol is niet aan zet.', 403)
  return org
}

function assertHold(access: AccessState, now: string): void {
  if (access.holdUntil && now < access.holdUntil) {
    throw new GameError('presentation', 'De zaal bekijkt nog de vorige keuze.', 409)
  }
}

function duplicate(access: AccessState, actionId: string): Record<string, unknown> | null {
  const previous = access.attempts.find((item) => item.actionId === actionId)
  if (!previous) return null
  return { duplicate: true, outcome: previous.outcome, version: access.version }
}

function recordAttempt(access: AccessState, actionId: string, outcome: string): void {
  access.attempts.push({ actionId, outcome })
}

function bump(access: AccessState): void {
  access.version += 1
}

function hold(access: AccessState, ctx: Ctx): void {
  access.holdUntil = plus(ctx.now, ctx.presentationMs)
}

function buildFrame(access: AccessState, language: Language, extra?: Partial<AccessFrame>): AccessFrame {
  return {
    prompt: null,
    message: access.message,
    actor: null,
    checks: { ...access.checks },
    requestLabel: null,
    options: [],
    selectedOptionId: null,
    feedback: null,
    feedbackOk: null,
    ...extra,
  }
}

function pushHistory(
  access: AccessState,
  language: Language,
  input: {
    scene: AccessScene
    actor: AccessOrgId | 'system' | 'host'
    type: string
    text: string
    result?: string | null
    frame?: Partial<AccessFrame>
    at: string
  },
): void {
  access.projectionSeq += 1
  access.history.push({
    sequence: access.projectionSeq,
    at: input.at,
    scene: input.scene,
    actor: input.actor,
    type: input.type,
    text: input.text,
    result: input.result ?? null,
    frame: buildFrame(access, language, input.frame),
  })
}

function setMessage(access: AccessState, language: Language, nl: string, en: string): void {
  access.message = t(language, nl, en)
}

function pendingChecks(): AccessChecks {
  return { identity: 'pending', membership: 'pending', involvement: 'pending', policy: 'pending' }
}

export function startAccessGame(session: SessionState, accessId: string, ctx: Ctx): Record<string, unknown> {
  if (session.gameId !== 'access') throw new GameError('bad_game', 'Verkeerd spel.', 409)
  if (session.access && session.access.scene !== 'debrief') {
    throw new GameError('bad_step', 'Het spel loopt nog.', 409)
  }
  if (!session.access) {
    const ready = session.roles.filter((role) => role.playerUserId && role.ready)
    if (new Set(ready.map((role) => role.organizationId)).size !== 4) {
      throw new GameError('not_ready', 'Alle rollen moeten gereed zijn.', 409)
    }
  }
  session.access = blankAccess(accessId, ctx.now)
  session.currentRoundId = null
  session.rounds = []
  session.status = 'running'
  session.comparison = false
  setMessage(session.access, ctx.language,
    'Eerst de eenmalige onboarding op organisatieniveau. Daarna volgt de herhalende cyclus: betrokkenheid, beleid, authenticatie en toegangsbeslissing.',
    'First the one-time organisation-level onboarding. Then the repeating cycle: involvement, policy, authentication and the access decision.')
  pushHistory(session.access, ctx.language, {
    scene: 'dossier',
    actor: 'host',
    type: 'start',
    text: t(ctx.language, 'Het spel start. Eerst de eenmalige onboarding van organisatie Delta.', 'The game starts. First the one-time onboarding of organisation Delta.'),
    at: ctx.now,
    frame: { actor: 'consumer', prompt: t(ctx.language, 'Stel het onboardingdossier samen', 'Assemble the onboarding dossier') },
  })
  return { accessId }
}

export function restartAccessGame(session: SessionState, accessId: string, ctx: Ctx): Record<string, unknown> {
  if (session.gameId !== 'access') throw new GameError('bad_game', 'Verkeerd spel.', 409)
  session.access = blankAccess(accessId, ctx.now)
  session.status = 'running'
  session.comparison = false
  pushHistory(session.access, ctx.language, {
    scene: 'dossier',
    actor: 'host',
    type: 'restart',
    text: t(ctx.language, 'Nieuwe spelrun gestart.', 'New game run started.'),
    at: ctx.now,
  })
  return { accessId }
}

export function tickAccess(session: SessionState, ctx: Ctx): Record<string, unknown> {
  const access = session.access
  if (!access) return { idle: true }
  if (access.paused || session.status === 'paused') return { paused: true }
  if (access.holdUntil && ctx.now >= access.holdUntil) {
    access.metrics.presentationMs += ctx.presentationMs
    access.holdUntil = null
    return { holdCleared: true }
  }
  return { scene: access.scene }
}

export function pauseAccess(session: SessionState, ctx: Ctx): void {
  const access = requireAccess(session)
  if (!access.paused) {
    access.paused = true
    access.pauseStartedAt = ctx.now
  }
}

export function resumeAccess(session: SessionState, ctx: Ctx): void {
  const access = requireAccess(session)
  if (access.pauseStartedAt) {
    const delta = new Date(ctx.now).getTime() - new Date(access.pauseStartedAt).getTime()
    access.metrics.pauseMs += Math.max(0, delta)
    if (access.holdUntil) access.holdUntil = plus(access.holdUntil, delta)
    access.pauseStartedAt = null
    access.paused = false
  }
}

export function releasePausesAccess(session: SessionState, ctx: Ctx): void {
  if (!session.access) return
  if (!session.access.paused) {
    session.access.paused = true
    session.access.pauseStartedAt = ctx.now
  }
}

export function reduceAccess(session: SessionState, command: AccessCommand, ctx: Ctx): Record<string, unknown> {
  const access = requireAccess(session)
  assertHold(access, ctx.now)
  if (access.paused) throw new GameError('paused', 'Het spel is gepauzeerd.', 409)

  const dup = duplicate(access, command.actionId)
  if (dup) return dup

  if (command.expectedVersion !== access.version) {
    throw new GameError('conflict', 'De stand is intussen veranderd.', 409)
  }

  switch (command.type) {
    case 'accessSubmitDossier':
      return submitDossier(session, command, ctx)
    case 'accessDossierDecision':
      return dossierDecision(session, command, ctx)
    case 'accessRegisterSystem':
      return registerSystem(session, command, ctx)
    case 'accessChooseCredential':
      return chooseCredential(session, command, ctx)
    case 'accessCheckRequest':
      return checkRequest(session, command, ctx)
    case 'accessRegisterCarrier':
      return registerCarrier(session, command, ctx)
    case 'accessCheckProofs':
      return checkProofs(session, command, ctx)
    case 'accessSetPolicy':
      return setPolicy(session, command, ctx)
    case 'accessAskCard':
      return askCard(session, command, ctx)
    case 'accessPredict':
      return predict(session, command, ctx)
    default:
      throw new GameError('unknown', 'Onbekende actie.', 400)
  }
}

function submitDossier(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessSubmitDossier' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'consumer')
  if (access.scene !== 'dossier') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  const open = access.dossiers.find((d) => d.decision === 'pending')
  if (open) throw new GameError('conflict', 'Er ligt al een dossier ter beoordeling.', 409)

  const cards = {
    orgIdentity: command.orgIdentity,
    representative: command.representative,
    terms: command.terms,
  }
  const complete = cards.orgIdentity && cards.representative && cards.terms
  const version = access.dossiers.length + 1
  const dossier: DossierVersion = {
    version,
    cards,
    complete,
    submittedAt: ctx.now,
    decision: 'pending',
    decidedAt: null,
  }
  access.dossiers.push(dossier)
  bump(access)
  recordAttempt(access, command.actionId, 'submitted')
  pushHistory(access, ctx.language, {
    scene: 'dossier',
    actor: 'consumer',
    type: 'dossier',
    text: t(ctx.language, `Delta dient dossierversie ${version} in.`, `Delta submits dossier version ${version}.`),
    at: ctx.now,
    frame: { actor: 'admin', prompt: t(ctx.language, 'Beoordeel het dossier', 'Review the dossier') },
  })
  hold(access, ctx)
  return { version: access.version, dossierVersion: version, complete }
}

function dossierDecision(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessDossierDecision' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'admin')
  if (access.scene !== 'dossier') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  const dossier = [...access.dossiers].reverse().find((d) => d.decision === 'pending')
  if (!dossier) throw new GameError('bad_step', 'Er is geen dossier ter beoordeling.', 409)

  if (command.decision === 'commit') {
    if (!dossier.complete) {
      throw new GameError('incomplete', 'Een onvolledig dossier kan niet worden vastgelegd.', 409)
    }
    dossier.decision = 'committed'
    dossier.decidedAt = ctx.now
    access.members[accessScenario.organizations.consumer.id] = 'active'
    access.bvad = {
      id: `bvad-${session.id}-delta-1`,
      kind: 'bvad',
      issuer: accessScenario.association.id,
      subjectOrgId: accessScenario.organizations.consumer.id,
      subjectSystemId: null,
      context: null,
      role: 'member',
      status: 'active',
      version: 1,
      valid: true,
    }
    access.checks = { identity: 'pending', membership: 'confirmed', involvement: 'pending', policy: 'pending' }
    access.scene = 'involveRegister'
    bump(access)
    recordAttempt(access, command.actionId, 'committed')
    setMessage(access, ctx.language,
      'Eenmalige onboarding klaar: Delta is als organisatie aangesloten (BVAD). Nu begint de herhalende cyclus — eerst legt de Data Owner vast wie gegevens mag ophalen.',
      'One-time onboarding done: Delta is admitted as an organisation (BVAD). Now the repeating cycle starts — first the Data Owner records who may retrieve data.')
    pushHistory(access, ctx.language, {
      scene: 'involveRegister',
      actor: 'admin',
      type: 'dossier_commit',
      text: t(ctx.language, `Admin legt dossierversie ${dossier.version} vast. Organisatie Delta is aangesloten.`, `Admin commits dossier version ${dossier.version}. Organisation Delta is admitted.`),
      result: 'ok',
      at: ctx.now,
      frame: {
        actor: 'owner',
        prompt: t(ctx.language, 'Leg vast wie gegevens mag ophalen voor T-101', 'Record who may retrieve data for T-101'),
        checks: access.checks,
      },
    })
    hold(access, ctx)
    return { version: access.version, decision: 'commit' }
  }

  dossier.decision = 'returned'
  dossier.decidedAt = ctx.now
  bump(access)
  recordAttempt(access, command.actionId, 'returned')
  pushHistory(access, ctx.language, {
    scene: 'dossier',
    actor: 'admin',
    type: 'dossier_return',
    text: t(ctx.language, `Admin geeft dossierversie ${dossier.version} terug.`, `Admin returns dossier version ${dossier.version}.`),
    result: 'returned',
    at: ctx.now,
    frame: { actor: 'consumer', prompt: t(ctx.language, 'Vul een nieuwe dossierversie aan', 'Complete a new dossier version') },
  })
  hold(access, ctx)
  return { version: access.version, decision: 'return' }
}

function registerSystem(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessRegisterSystem' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'consumer')
  if (access.scene !== 'system') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  if (!(command.belongs && command.endpoint && command.credential)) {
    throw new GameError('incomplete', 'Alle drie de systeemcontroles moeten bevestigd zijn.', 409)
  }
  access.systemChecks = { belongs: true, endpoint: true, credential: true }
  access.systemRegistered = true
  access.bvad = {
    id: `bvad-${session.id}-delta-1`,
    kind: 'bvad',
    issuer: accessScenario.association.id,
    subjectOrgId: accessScenario.organizations.consumer.id,
    subjectSystemId: accessScenario.deltaSystem.id,
    context: null,
    role: 'member',
    status: 'active',
    version: 1,
    valid: true,
  }
  access.checks = { identity: 'pending', membership: 'confirmed', involvement: 'pending', policy: 'pending' }
  access.scene = 'authChoose'
  bump(access)
  recordAttempt(access, command.actionId, 'registered')
  setMessage(access, ctx.language,
    'Eenmalige onboarding klaar: Delta is aangesloten. Toegang tot transportgegevens volgt niet automatisch. Vanaf hier herhaalt zich per handeling: middel kiezen, betrokkenheid, beleid en beslissing van de Data Service Provider.',
    'One-time onboarding done: Delta is connected. Access to transport data does not follow automatically. From here each action repeats: choose a credential, involvement, policy and the Data Service Provider decision.')
  pushHistory(access, ctx.language, {
    scene: 'authChoose',
    actor: 'consumer',
    type: 'system',
    text: t(ctx.language, 'Delta registreert de planningsapplicatie. BVAD bevestigt actieve deelname (eenmalige onboarding).', 'Delta registers the planning application. BVAD confirms active participation (one-time onboarding).'),
    result: 'ok',
    at: ctx.now,
    frame: {
      actor: 'consumer',
      prompt: t(ctx.language, 'Kies het digitale middel voor het verzoek', 'Choose the digital credential for the request'),
      checks: access.checks,
    },
  })
  hold(access, ctx)
  return { version: access.version, bvad: true }
}

function chooseCredential(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessChooseCredential' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'consumer')
  if (access.scene !== 'authChoose' && access.scene !== 'authCheck') {
    throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  }
  access.selectedCredentialId = command.credentialId
  access.scene = 'authCheck'
  access.checks = { ...access.checks, identity: 'pending', involvement: 'pending', policy: 'pending' }
  bump(access)
  recordAttempt(access, command.actionId, 'chosen')
  const label = command.credentialId === 'cred-valid'
    ? t(ctx.language, 'geldige middel', 'valid credential')
    : t(ctx.language, 'verlopen middel', 'expired credential')
  pushHistory(access, ctx.language, {
    scene: 'authCheck',
    actor: 'consumer',
    type: 'credential',
    text: t(ctx.language, `Delta stuurt het verzoek met het ${label}.`, `Delta sends the request with the ${label}.`),
    at: ctx.now,
    frame: {
      actor: 'provider',
      prompt: t(ctx.language, 'Controleer verzoek', 'Check request'),
      requestLabel: t(ctx.language, 'Delta vraagt toegang tot de gegevensdienst', 'Delta asks for access to the data service'),
    },
  })
  hold(access, ctx)
  return { version: access.version, credentialId: command.credentialId }
}

function checkRequest(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessCheckRequest' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'provider')
  if (access.scene !== 'authCheck') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  if (!access.selectedCredentialId) throw new GameError('bad_step', 'Er is nog geen middel gekozen.', 409)

  const expired = access.selectedCredentialId === accessScenario.credentials.expired.id
  if (expired) {
    access.checks = { identity: 'failed', membership: 'confirmed', involvement: 'pending', policy: 'pending' }
    access.authenticated = false
    access.scene = 'authChoose'
    access.selectedCredentialId = null
    bump(access)
    recordAttempt(access, command.actionId, 'auth_failed')
    setMessage(access, ctx.language,
      'De organisatie is aangesloten, maar dit middel is niet meer geldig voor authenticatie.',
      'The organisation is onboarded, but this credential is no longer valid for authentication.')
    pushHistory(access, ctx.language, {
      scene: 'authChoose',
      actor: 'provider',
      type: 'auth',
      text: t(ctx.language, 'Authenticatie afgewezen: verlopen middel. Deelname blijft actief.', 'Authentication rejected: expired credential. Participation stays active.'),
      result: 'failed',
      at: ctx.now,
      frame: { actor: 'consumer', checks: access.checks, feedbackOk: false },
    })
    hold(access, ctx)
    return { version: access.version, authenticated: false }
  }

  access.checks = { identity: 'confirmed', membership: 'confirmed', involvement: 'pending', policy: 'pending' }
  access.authenticated = true
  access.baseAccessToken = {
    id: `base-${session.id}-1`,
    kind: 'base_access',
    issuer: accessScenario.organizations.provider.id,
    subjectOrgId: accessScenario.organizations.consumer.id,
    subjectSystemId: null,
    context: null,
    role: null,
    status: 'active',
    version: 1,
    valid: true,
  }
  const triedExpired = access.history.some((h) => h.type === 'auth' && h.result === 'failed')
  access.compareExpiredHint = triedExpired
    ? null
    : t(ctx.language,
      'Ter vergelijking: met het verlopen middel zou authenticatie zijn afgewezen, terwijl deelname actief bleef.',
      'For comparison: with the expired credential authentication would have been rejected while participation stayed active.')
  access.scene = 'policyAsk'
  bump(access)
  recordAttempt(access, command.actionId, 'auth_ok')
  setMessage(access, ctx.language,
    'Authenticatie geslaagd. De Data Service Provider beoordeelt nu ieder gegevensverzoek met identiteit, deelname, vastgelegde betrokkenheid en het beleid.',
    'Authentication succeeded. The Data Service Provider now judges each data request with identity, participation, recorded involvement and the policy.')
  pushHistory(access, ctx.language, {
    scene: 'policyAsk',
    actor: 'provider',
    type: 'auth',
    text: t(ctx.language, 'Authenticatie geslaagd. Organisatie-identiteit bevestigd.', 'Authentication succeeded. Organisation identity confirmed.'),
    result: 'ok',
    at: ctx.now,
    frame: {
      actor: 'consumer',
      prompt: t(ctx.language, 'Vraag gegevens op — de Data Service Provider beslist', 'Request data — the Data Service Provider decides'),
      checks: access.checks,
      feedbackOk: true,
    },
  })
  hold(access, ctx)
  return { version: access.version, authenticated: true }
}

function registerCarrier(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessRegisterCarrier' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'owner')
  if (access.scene !== 'involveRegister') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)

  access.orchestration = access.orchestration.filter((item) => item.transportId !== 'T-101')
  access.orchestration.push({
    transportId: 'T-101',
    carrierOrgId: accessScenario.organizations.consumer.id,
    role: 'carrier',
  })
  access.bvodT101 = {
    id: `bvod-${session.id}-t101-1`,
    kind: 'bvod',
    issuer: 'orchestration-registry',
    subjectOrgId: accessScenario.organizations.consumer.id,
    subjectSystemId: null,
    context: 'T-101',
    role: 'carrier',
    status: 'active',
    version: 1,
    valid: true,
  }
  access.checks = { ...access.checks, involvement: 'confirmed', policy: 'pending' }
  access.scene = 'policyEdit'
  bump(access)
  recordAttempt(access, command.actionId, 'carrier_registered')
  setMessage(access, ctx.language,
    'Betrokkenheid staat vast. Stel nu het beleid in. Authenticatie van de Data Consumer volgt daarna — de Data Service Provider beoordeelt pas dan een verzoek.',
    'Involvement is set. Now set the policy. Authentication of the Data Consumer follows next — only then does the Data Service Provider judge a request.')
  pushHistory(access, ctx.language, {
    scene: 'policyEdit',
    actor: 'owner',
    type: 'orchestration',
    text: t(ctx.language,
      'Atlas legt Delta vast als partij die voor T-101 gegevens mag ophalen.',
      'Atlas records Delta as the party that may retrieve data for T-101.'),
    result: 'ok',
    at: ctx.now,
    frame: {
      actor: 'owner',
      prompt: t(ctx.language, 'Stel het toegangsbeleid in', 'Set the access policy'),
      checks: access.checks,
    },
  })
  hold(access, ctx)
  return { version: access.version }
}

function checkProofs(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessCheckProofs' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'provider')
  if (access.scene !== 'involveProofs') throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  access.checks = {
    identity: 'confirmed',
    membership: 'confirmed',
    involvement: 'confirmed',
    policy: 'pending',
  }
  access.scene = 'policyEdit'
  bump(access)
  recordAttempt(access, command.actionId, 'proofs_ok')
  setMessage(access, ctx.language,
    'De Data Service Provider heeft BVAD en BVOD meegenomen. De Data Owner stelt nu het beleid in voordat verzoeken worden beoordeeld.',
    'The Data Service Provider has taken BVAD and BVOD into account. The Data Owner now sets policy before requests are judged.')
  pushHistory(access, ctx.language, {
    scene: 'policyEdit',
    actor: 'provider',
    type: 'proofs',
    text: t(ctx.language, 'BVAD en BVOD meegenomen in de afweging. Beleid volgt.', 'BVAD and BVOD included in the assessment. Policy is next.'),
    result: 'ok',
    at: ctx.now,
    frame: {
      actor: 'owner',
      prompt: t(ctx.language, 'Stel het toegangsbeleid in', 'Set the access policy'),
      checks: access.checks,
    },
  })
  hold(access, ctx)
  return { version: access.version }
}

function setPolicy(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessSetPolicy' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'owner')
  const allowedScenes: AccessScene[] = ['policyEdit', 'policyAsk', 'revoke', 'restore']
  if (!allowedScenes.includes(access.scene)) {
    throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  }

  const current = currentPolicy(access)
  if (current.shareLoading === command.shareLoading && current.shareFinance === command.shareFinance) {
    recordAttempt(access, command.actionId, 'noop')
    return { version: access.version, unchanged: true }
  }

  const next = {
    version: current.version + 1,
    shareLoading: command.shareLoading,
    shareFinance: command.shareFinance,
    at: ctx.now,
  }
  access.policies.push(next)

  if (access.scene === 'policyEdit' || access.scene === 'policyAsk') {
    access.policyProbe = {
      policyVersion: next.version,
      asked: [],
      appropriate: next.shareLoading && !next.shareFinance,
      oversharedFinance: next.shareFinance,
    }
    access.scene = access.authenticated ? 'policyAsk' : 'authChoose'
  } else if (access.scene === 'revoke') {
    if (!command.shareLoading) {
      access.revokedOnce = true
      access.scene = 'revokeAsk'
    }
  } else if (access.scene === 'restore') {
    if (command.shareLoading && !command.shareFinance) {
      access.restoredOnce = true
      access.scene = 'restoreAsk'
    }
  }

  bump(access)
  recordAttempt(access, command.actionId, 'policy_set')
  if (access.scene === 'authChoose') {
    setMessage(access, ctx.language,
      'Beleid staat. Nu authenticatie van de Data Consumer — daarna beoordeelt de Data Service Provider ieder verzoek.',
      'Policy is set. Next: authenticate the Data Consumer — then the Data Service Provider judges each request.')
  } else if (access.scene === 'policyAsk') {
    setMessage(access, ctx.language,
      'Beleid bijgewerkt. De Data Service Provider beoordeelt elk verzoek met identiteit, deelname, vastgelegde betrokkenheid en dit beleid.',
      'Policy updated. The Data Service Provider judges each request with identity, participation, recorded involvement and this policy.')
  }
  const overshare = next.shareFinance
    ? t(ctx.language, ' Meer gedeeld dan voor de opdracht nodig was.', ' More shared than needed for the assignment.')
    : ''
  const nextActor = access.scene === 'authChoose'
    ? 'consumer'
    : access.scene === 'policyAsk' || access.scene === 'revokeAsk' || access.scene === 'restoreAsk'
      ? 'consumer'
      : 'owner'
  const nextPrompt = access.scene === 'authChoose'
    ? t(ctx.language, 'Kies het digitale middel voor deze handeling', 'Choose the digital credential for this action')
    : access.scene === 'revoke'
      ? t(ctx.language, 'Trek leesrecht voor laadinformatie in', 'Revoke read access for loading info')
      : access.scene === 'restore'
        ? t(ctx.language, 'Herstel beperkte toestemming', 'Restore limited consent')
        : t(ctx.language, 'Vraag gegevens op — de Data Service Provider beslist', 'Request data — the Data Service Provider decides')
  pushHistory(access, ctx.language, {
    scene: access.scene,
    actor: 'owner',
    type: 'policy',
    text: t(ctx.language,
      `Atlas stelt beleid v${next.version}: laden ${next.shareLoading ? 'aan' : 'uit'}, financiën ${next.shareFinance ? 'aan' : 'uit'}.${overshare}`,
      `Atlas sets policy v${next.version}: loading ${next.shareLoading ? 'on' : 'off'}, finance ${next.shareFinance ? 'on' : 'off'}.${overshare}`),
    result: overshare ? 'overshare' : 'ok',
    at: ctx.now,
    frame: {
      actor: nextActor,
      prompt: nextPrompt,
      checks: access.checks,
    },
  })
  hold(access, ctx)
  return { version: access.version, policyVersion: next.version }
}

function askCard(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessAskCard' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  assertActor(session, command.userId, 'consumer')
  const cardId = command.cardId
  if (!accessScenario.cards[cardId]) throw new GameError('unknown', 'Onbekende gegevenskaart.', 400)

  const scene = access.scene
  if (scene !== 'policyAsk' && scene !== 'revokeAsk' && scene !== 'restoreAsk') {
    throw new GameError('bad_step', 'Deze stap is niet actief.', 409)
  }

  const credentialId = access.authenticated
    ? accessScenario.credentials.valid.id
    : access.selectedCredentialId
  const decision = decideCardRequest(access, cardId, credentialId, ctx.language)
  access.checks = decision.checks

  const policyVersion = currentPolicy(access).version
  const duplicateDelivery = access.requests.find(
    (r) => r.cardId === cardId && r.policyVersion === policyVersion && r.allowed === decision.allowed,
  )
  if (duplicateDelivery && scene === 'policyAsk') {
    recordAttempt(access, command.actionId, 'duplicate_request')
    return { version: access.version, duplicate: true, allowed: duplicateDelivery.allowed }
  }

  const request = {
    id: `req-${access.requests.length + 1}`,
    cardId,
    at: ctx.now,
    policyVersion,
    allowed: decision.allowed,
    reason: decision.reason,
    checks: decision.checks,
    payload: decision.payload,
    credentialId: credentialId ?? accessScenario.credentials.valid.id,
  }
  access.requests.push(request)
  if (decision.allowed && decision.payload) {
    access.received.push({ cardId, payload: decision.payload, at: ctx.now, requestId: request.id })
  }

  if (scene === 'policyAsk' && access.policyProbe) {
    if (access.policyProbe.policyVersion === policyVersion && !access.policyProbe.asked.includes(cardId)) {
      access.policyProbe.asked.push(cardId)
    }
    const policy = currentPolicy(access)
    const appropriate = policy.shareLoading && !policy.shareFinance
    const allAsked = (['load-T-101', 'finance-T-101', 'load-T-102'] as CardId[]).every((id) =>
      access.requests.some((r) => r.cardId === id && r.policyVersion === policy.version),
    )
    if (appropriate && allAsked) {
      access.scene = 'revoke'
      setMessage(access, ctx.language,
        'De Data Service Provider beoordeelde ieder verzoek met identiteit, deelname, betrokkenheid en beleid. Onboarding bleef een eenmalige stap; deze cyclus herhaalt zich per handeling.',
        'The Data Service Provider judged each request with identity, participation, involvement and policy. Onboarding stayed a one-time step; this cycle repeats for every action.')
    } else if (allAsked) {
      access.scene = 'policyEdit'
    }
  }

  if (scene === 'revokeAsk' && cardId === 'load-T-101' && !decision.allowed) {
    access.scene = 'restore'
    setMessage(access, ctx.language,
      'Geen nieuwe onboarding nodig. Identiteit, deelname en transportrol zijn ongewijzigd; alleen de toestemming is veranderd. Dat is de herhalende cyclus.',
      'No new onboarding needed. Identity, participation and transport role are unchanged; only consent changed. That is the repeating cycle.')
  }

  if (scene === 'restoreAsk' && cardId === 'load-T-101' && decision.allowed) {
    access.scene = 'debrief'
    access.metrics.endedAt = ctx.now
    setMessage(access, ctx.language,
      'Geen nieuwe onboarding nodig. Identiteit, deelname en transportrol zijn ongewijzigd; alleen de toestemming is veranderd. Dat is de herhalende cyclus.',
      'No new onboarding needed. Identity, participation and transport role are unchanged; only consent changed. That is the repeating cycle.')
  }

  bump(access)
  recordAttempt(access, command.actionId, decision.allowed ? 'allowed' : 'denied')
  const title = accessScenario.cards[cardId].title[ctx.language]
  pushHistory(access, ctx.language, {
    scene: access.scene,
    actor: 'consumer',
    type: 'request',
    text: t(ctx.language,
      `Delta vraagt ${title}. Data Service Provider beslist: ${decision.reason}`,
      `Delta asks for ${title}. Data Service Provider decides: ${decision.reason}`),
    result: decision.allowed ? 'allowed' : 'denied',
    at: ctx.now,
    frame: {
      actor: access.scene === 'revoke' || access.scene === 'restore' ? 'owner' : access.scene === 'debrief' ? null : 'consumer',
      requestLabel: t(ctx.language, `Delta vraagt ${title}`, `Delta asks for ${title}`),
      checks: access.checks,
      feedback: decision.reason,
      feedbackOk: decision.allowed,
    },
  })
  hold(access, ctx)
  return { version: access.version, allowed: decision.allowed, reason: decision.reason }
}

function predict(
  session: SessionState,
  command: Extract<AccessCommand, { type: 'accessPredict' }>,
  ctx: Ctx,
): Record<string, unknown> {
  const access = requireAccess(session)
  const org = roleOf(session, command.userId)
  if (!org) throw new GameError('forbidden', 'Geen rol.', 403)
  if (org === 'provider') throw new GameError('forbidden', 'De provider controleert, voorspelt niet.', 403)
  bump(access)
  recordAttempt(access, command.actionId, 'predict')
  pushHistory(access, ctx.language, {
    scene: access.scene,
    actor: org,
    type: 'predict',
    text: t(ctx.language,
      `${accessScenario.organizations[org].roleLabel.nl} voorspelt: ${command.guess === 'allow' ? 'toegestaan' : 'geweigerd'}.`,
      `${accessScenario.organizations[org].roleLabel.en} predicts: ${command.guess === 'allow' ? 'allowed' : 'denied'}.`),
    at: ctx.now,
  })
  return { version: access.version }
}

export function accessActor(access: AccessState): AccessOrgId | null {
  switch (access.scene) {
    case 'dossier': {
      const pending = access.dossiers.some((d) => d.decision === 'pending')
      return pending ? 'admin' : 'consumer'
    }
    case 'system':
    case 'authChoose':
    case 'involveAsk':
    case 'policyAsk':
    case 'revokeAsk':
    case 'restoreAsk':
      return 'consumer'
    case 'authCheck':
    case 'involveProofs':
      return 'provider'
    case 'involveRegister':
    case 'policyEdit':
    case 'revoke':
    case 'restore':
      return 'owner'
    case 'debrief':
      return null
    default:
      return null
  }
}
