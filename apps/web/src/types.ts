import type { Org } from './art/icons'
import type { Flight, Logistics } from './Map'

export type Option = { id: string; label: string }

export type Fact = { label: string; value: string; status?: string; statusLabel: string }

export type Panel = {
  organizationId: Org
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
  organizationId: Org
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
  code: string
  language: 'nl' | 'en'
  status: string
  paused: boolean
  comparison: boolean
  canStart: boolean
  startMode: 'without_bdi' | 'only_bdi'
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
}

export type Player = {
  sessionId: string
  sessionName: string
  code: string
  language: 'nl' | 'en'
  role: Org
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
}

export const CONFIRM_STEPS = new Set(['S03', 'S07', 'S09', 'S11', 'S13', 'S17', 'S19'])
export const ORGS: Org[] = ['buyer', 'seller', 'carrier', 'delivery']
