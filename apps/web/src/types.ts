import type { Org } from './art/icons'
import type { Flight, Logistics } from './Map'

export type Option = { id: string; label: string }

export type Fact = { label: string; value: string; status?: string; statusLabel: string }

export type Panel = {
  organizationId: string
  name: string
  roleLabel: string
  activity: string
  items: Fact[]
}

export type Frame = {
  prompt: string | null
  options: Option[]
  selectedOptionId: string | null
  feedback: string | null
  feedbackOk: boolean | null
  highlightOptionId: string | null
  highlightLabel: string | null
  panels: Panel[]
  comm: string
}

export type RoleCard = {
  organizationId: string
  name: string
  roleLabel: string
  blurb: string
  claimed: boolean
  displayName: string | null
  ready: boolean
  connection: string
  inviteToken: string | null
}

export type Metrics = Record<string, number | string | null | string[]>

export type BdiChain = { publisher: Org; subscribers: Org[]; eventType: string; done: number; now: number | null }

export type Training = {
  sessionId: string
  sessionName: string
  gameId: string
  gameTitle: string
  code: string
  language: 'nl' | 'en'
  status: string
  paused: boolean
  comparison: boolean
  canStart: boolean
  startMode: 'without_bdi' | 'only_bdi' | 'story'
  roles: RoleCard[]
  round: null | {
    id: string
    number: number
    mode: 'without_bdi' | 'with_bdi'
    stepId: string
    state: string
    stateVersion: number
    simLabel: string
    label: string
    frame: Frame
    logistics: Logistics
    events: { sequence: number; text: string; result: string | null }[]
    history: { sequence: number; text: string; stepId: string; actorRole: string; displayType: string; result: string | null; frame: Frame }[]
    registries: null | {
      association: { organizationId: Org; name: string; status: string }[]
      orchestration: { organizationId: Org; roleLabel: string; issuedBy: string }[]
    }
    metrics: Metrics
    helpCount: number
    introPhase: 'goals' | 'bdi-agreements' | 'bdi-roles' | 'bdi-flow'
    narrative: string
    caption: string
    actor: string
    activeOrg: Org | null
    askOrg: Org | null
    bdiChain: BdiChain | null
    flights: Flight[]
  }
  rounds: { number: number; mode: 'without_bdi' | 'with_bdi'; metrics: Metrics }[]
  serverNow: string
  cursor: number
  access?: AccessTraining['access']
}

export type AccessCheckStatus = 'confirmed' | 'failed' | 'pending' | 'unknown'

export type AccessTraining = Omit<Training, 'gameId' | 'round' | 'rounds' | 'access'> & {
  gameId: 'access'
  round: null
  rounds: []
  access: null | {
    id: string
    version: number
    scene: string
    message: string | null
    compareExpiredHint: string | null
    actor: string | null
    checks: Record<string, AccessCheckStatus>
    checksLabels: { id: string; label: string; status: AccessCheckStatus; statusLabel: string }[]
    requestLabel: string | null
    prompt: string | null
    policy: { shareLoading: boolean; shareFinance: boolean; version: number }
    members: { organizationId: string; name: string; status: string }[]
    orchestration: { transportId: string; carrierName: string; role: string }[]
    proofs: { bvad: unknown; bvod: unknown; baseAccess: boolean }
    flights: { id: string; kind: 'proof' | 'data'; from: string; to: string; label: string }[]
    received: { cardId: string; title: string; payload: string; label: string }[]
    history: {
      sequence: number
      at: string
      scene: string
      actor: string
      type: string
      text: string
      result: string | null
      frame: {
        prompt: string | null
        message: string | null
        actor: string | null
        checks: Record<string, AccessCheckStatus>
        requestLabel: string | null
        options: Option[]
        selectedOptionId: string | null
        feedback: string | null
        feedbackOk: boolean | null
      }
    }[]
    debrief: null | {
      missionDone: boolean
      appropriateShare: boolean
      restoreNeeded: boolean
      oversharedFinance: boolean
      questions: string[]
    }
    termCards: { term: string; text: string }[]
    holdUntil: string | null
    metrics: Metrics
    stepTrack: {
      phase: 'once' | 'repeat'
      onceLabel: string
      repeatLabel: string
      steps: { id: string; band: 'once' | 'repeat'; label: string; status: 'done' | 'active' | 'todo' }[]
    }
  }
}

export type Player = {
  sessionId: string
  sessionName: string
  gameId: string
  code: string
  language: 'nl' | 'en'
  role: string
  organizationName: string
  displayName: string | null
  connection: string
  expired: boolean
  paused: boolean
  ready: boolean
  cursor: number
  serverNow: string
  round: null | {
    id: string
    number: number
    mode: 'without_bdi' | 'with_bdi'
    stepId: string
    stateVersion: number
    simLabel: string
    paused: boolean
    canAnswer: boolean
    waitingFor: string | null
    actorRole: Org | null
    task: null | {
      prompt: string
      hint: string | null
      options: Option[]
      selectedOptionId: string | null
      feedback: string | null
      feedbackOk: boolean | null
      highlightOptionId: string | null
      highlightLabel: string | null
      fetching: boolean
    }
    dossier: Fact[]
    notifications: { id: string; text: string; status: string }[]
    notes: string
    delivered: boolean
  }
  access?: AccessPlayer['access']
  roleLabel?: string
}

export type AccessPlayer = Omit<Player, 'gameId' | 'round' | 'access' | 'role'> & {
  gameId: 'access'
  role: string
  roleLabel: string
  round?: never
  access: null | {
    id: string
    version: number
    scene: string
    canAct: boolean
    waitingFor: string | null
    actor: string | null
    message: string | null
    compareExpiredHint: string | null
    checks: Record<string, AccessCheckStatus>
    checksLabels: { id: string; label: string; status: AccessCheckStatus; statusLabel: string }[]
    prompt: string | null
    dossier: null | {
      pending: boolean
      latest: { version: number; complete: boolean; decision: string; cards: { orgIdentity: boolean; representative: boolean; terms: boolean } } | null
      cards: { id: string; label: string; included: boolean }[]
    }
    system: null | { checks: { id: string; label: string; done: boolean }[]; registered: boolean }
    credentials: null | { id: string; label: string; status: string }[]
    selectedCredentialId: string | null
    policy: null | { shareLoading: boolean; shareFinance: boolean; version: number }
    cards: null | { id: string; title: string; asked: boolean; lastAllowed: boolean | null; lastReason: string | null }[]
    received: { cardId: string; title: string; payload: string; label: string }[]
    proofs: { bvad: boolean; bvod: boolean }
    debrief: AccessTraining['access'] extends null | infer A ? A extends { debrief: infer D } ? D : null : null
    holdUntil: string | null
  }
}

export const CONFIRM_STEPS = new Set(['S03', 'S07', 'S09', 'S11', 'S13', 'S17', 'S19'])
export const ORGS: Org[] = ['buyer', 'seller', 'carrier', 'delivery']
export const ACCESS_ORGS = ['admin', 'owner', 'provider', 'consumer'] as const
