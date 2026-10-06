import { accessScenario, type CardId } from './scenario.js'
import type { AccessOrgId } from './orgs.js'
import type { Language } from '../../types.js'

export type AccessScene =
  | 'dossier'
  | 'system'
  | 'authChoose'
  | 'authCheck'
  | 'involveAsk'
  | 'involveRegister'
  | 'involveProofs'
  | 'policyEdit'
  | 'policyAsk'
  | 'revoke'
  | 'revokeAsk'
  | 'restore'
  | 'restoreAsk'
  | 'debrief'

export type CheckStatus = 'confirmed' | 'failed' | 'pending' | 'unknown'

export type AccessChecks = {
  identity: CheckStatus
  membership: CheckStatus
  involvement: CheckStatus
  policy: CheckStatus
}

export type ProofKind = 'bvad' | 'bvod' | 'base_access'

export interface AccessProof {
  id: string
  kind: ProofKind
  issuer: string
  subjectOrgId: string
  subjectSystemId: string | null
  context: string | null
  role: string | null
  status: 'active' | 'revoked' | 'unknown'
  version: number
  valid: boolean
}

export interface DossierVersion {
  version: number
  cards: { orgIdentity: boolean; representative: boolean; terms: boolean }
  complete: boolean
  submittedAt: string
  decision: 'pending' | 'committed' | 'returned'
  decidedAt: string | null
}

export interface PolicyVersion {
  version: number
  shareLoading: boolean
  shareFinance: boolean
  at: string
}

export interface CardRequest {
  id: string
  cardId: CardId
  at: string
  policyVersion: number
  allowed: boolean
  reason: string
  checks: AccessChecks
  payload: string | null
  credentialId: string
}

export interface AccessHistoryEvent {
  sequence: number
  at: string
  scene: AccessScene
  actor: AccessOrgId | 'system' | 'host'
  type: string
  text: string
  result: string | null
  frame: AccessFrame
}

export interface AccessFrame {
  prompt: string | null
  message: string | null
  actor: AccessOrgId | null
  checks: AccessChecks
  requestLabel: string | null
  options: { id: string; label: string }[]
  selectedOptionId: string | null
  feedback: string | null
  feedbackOk: boolean | null
}

export interface AccessState {
  id: string
  version: number
  scene: AccessScene
  paused: boolean
  pauseStartedAt: string | null
  holdUntil: string | null
  projectionSeq: number
  message: string | null
  compareExpiredHint: string | null
  checks: AccessChecks
  dossiers: DossierVersion[]
  systemRegistered: boolean
  systemChecks: { belongs: boolean; endpoint: boolean; credential: boolean }
  selectedCredentialId: string | null
  authenticated: boolean
  baseAccessToken: AccessProof | null
  bvad: AccessProof | null
  bvodT101: AccessProof | null
  members: Record<string, 'active' | 'pending'>
  orchestration: { transportId: string; carrierOrgId: string; role: string }[]
  policies: PolicyVersion[]
  requests: CardRequest[]
  received: { cardId: CardId; payload: string; at: string; requestId: string }[]
  policyProbe: {
    policyVersion: number
    asked: CardId[]
    appropriate: boolean
    oversharedFinance: boolean
  } | null
  revokedOnce: boolean
  restoredOnce: boolean
  attempts: { actionId: string; outcome: string }[]
  history: AccessHistoryEvent[]
  notes: Record<string, string>
  helpCount: number
  metrics: {
    startedAt: string
    endedAt: string | null
    pauseMs: number
    presentationMs: number
    disconnects: number
  }
}

export function blankAccess(id: string, now: string): AccessState {
  const members: Record<string, 'active' | 'pending'> = {}
  for (const org of Object.values(accessScenario.organizations)) {
    if (org.memberAtStart) members[org.id] = 'active'
  }
  return {
    id,
    version: 1,
    scene: 'dossier',
    paused: false,
    pauseStartedAt: null,
    holdUntil: null,
    projectionSeq: 0,
    message: null,
    compareExpiredHint: null,
    checks: {
      identity: 'pending',
      membership: 'pending',
      involvement: 'pending',
      policy: 'pending',
    },
    dossiers: [],
    systemRegistered: false,
    systemChecks: { belongs: false, endpoint: false, credential: false },
    selectedCredentialId: null,
    authenticated: false,
    baseAccessToken: null,
    bvad: null,
    bvodT101: null,
    members,
    orchestration: [
      { transportId: 'T-102', carrierOrgId: 'org-noord', role: 'carrier' },
    ],
    policies: [{ version: 1, shareLoading: false, shareFinance: false, at: now }],
    requests: [],
    received: [],
    policyProbe: null,
    revokedOnce: false,
    restoredOnce: false,
    attempts: [],
    history: [],
    notes: {},
    helpCount: 0,
    metrics: {
      startedAt: now,
      endedAt: null,
      pauseMs: 0,
      presentationMs: 0,
      disconnects: 0,
    },
  }
}

export function currentPolicy(access: AccessState): PolicyVersion {
  return access.policies[access.policies.length - 1]!
}

export function t(language: Language, nl: string, en: string): string {
  return language === 'en' ? en : nl
}
