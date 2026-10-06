import { accessScenario, type CardId } from './scenario.js'
import type { AccessChecks, AccessState, CheckStatus } from './state.js'
import { currentPolicy, t } from './state.js'
import type { Language } from '../../types.js'

export type Decision = {
  allowed: boolean
  reason: string
  checks: AccessChecks
  payload: string | null
}

function membershipStatus(access: AccessState): CheckStatus {
  if (!access.bvad) return 'unknown'
  if (!access.bvad.valid || access.bvad.status !== 'active') return 'failed'
  if (access.bvad.subjectOrgId !== accessScenario.organizations.consumer.id) return 'failed'
  if (access.bvad.issuer !== accessScenario.association.id) return 'failed'
  return 'confirmed'
}

function involvementFor(access: AccessState, transportId: string): CheckStatus {
  if (transportId === 'T-101') {
    if (!access.bvodT101) return 'unknown'
    if (!access.bvodT101.valid || access.bvodT101.status !== 'active') return 'failed'
    if (access.bvodT101.subjectOrgId !== accessScenario.organizations.consumer.id) return 'failed'
    if (access.bvodT101.context !== 'T-101') return 'failed'
    return 'confirmed'
  }
  const entry = access.orchestration.find((item) => item.transportId === transportId)
  if (!entry) return 'unknown'
  if (entry.carrierOrgId !== accessScenario.organizations.consumer.id) return 'failed'
  return 'confirmed'
}

function authenticate(access: AccessState, credentialId: string | null): CheckStatus {
  if (!credentialId) return 'pending'
  if (credentialId === accessScenario.credentials.expired.id) return 'failed'
  if (credentialId !== accessScenario.credentials.valid.id) return 'failed'
  const cred = accessScenario.credentials.valid
  if (cred.organizationId !== accessScenario.organizations.consumer.id) return 'failed'
  return 'confirmed'
}

export function decideCardRequest(
  access: AccessState,
  cardId: CardId,
  credentialId: string | null,
  language: Language,
): Decision {
  const card = accessScenario.cards[cardId]
  const identity = authenticate(access, credentialId)
  const membership = membershipStatus(access)
  const involvement = involvementFor(access, card.transportId)
  const checks: AccessChecks = {
    identity,
    membership,
    involvement,
    policy: 'pending',
  }

  if (identity !== 'confirmed') {
    return {
      allowed: false,
      reason: t(language,
        'De organisatie is aangesloten, maar dit middel is niet meer geldig voor authenticatie.',
        'The organisation is onboarded, but this credential is no longer valid for authentication.'),
      checks: { ...checks, membership: membership === 'confirmed' ? 'confirmed' : membership, policy: 'pending' },
      payload: null,
    }
  }

  if (membership === 'unknown') {
    return {
      allowed: false,
      reason: t(language, 'Deelname is niet vast te stellen. Geen gegevenslevering.', 'Participation cannot be established. No data delivery.'),
      checks: { ...checks, policy: 'pending' },
      payload: null,
    }
  }
  if (membership !== 'confirmed') {
    return {
      allowed: false,
      reason: t(language, 'Association-deelname is niet in orde.', 'Association participation is not in order.'),
      checks: { ...checks, policy: 'pending' },
      payload: null,
    }
  }

  if (involvement === 'unknown') {
    return {
      allowed: false,
      reason: t(language,
        'Betrokkenheid bij dit transport is nog niet digitaal vastgelegd.',
        'Involvement in this transport is not yet digitally recorded.'),
      checks: { ...checks, policy: 'pending' },
      payload: null,
    }
  }
  if (involvement !== 'confirmed') {
    return {
      allowed: false,
      reason: t(language,
        'Delta is niet betrokken bij dit transport.',
        'Delta is not involved in this transport.'),
      checks: { ...checks, policy: 'pending' },
      payload: null,
    }
  }

  const policy = currentPolicy(access)
  const share = card.kind === 'finance' ? policy.shareFinance : policy.shareLoading
  if (!share) {
    return {
      allowed: false,
      reason: t(language,
        card.kind === 'finance'
          ? 'Het beleid van Atlas deelt deze financiële gegevens niet.'
          : 'Het leesrecht voor laadinformatie is ingetrokken of nog niet verleend.',
        card.kind === 'finance'
          ? 'Atlas policy does not share this financial data.'
          : 'Read access for loading info is revoked or not yet granted.'),
      checks: { ...checks, policy: 'failed' },
      payload: null,
    }
  }

  const transport = accessScenario.transports[card.transportId as 'T-101' | 'T-102']
  const payload = card.kind === 'finance'
    ? (transport as typeof accessScenario.transports['T-101']).financeInfo[language]
    : transport.loadInfo[language]

  return {
    allowed: true,
    reason: t(language, 'Toegang toegestaan volgens het actuele beleid.', 'Access allowed under the current policy.'),
    checks: { ...checks, policy: 'confirmed' },
    payload,
  }
}

/** Unit-test helper: reject name-only "proof" that is not a bound credential. */
export function authenticateNameOnly(): CheckStatus {
  return 'failed'
}
