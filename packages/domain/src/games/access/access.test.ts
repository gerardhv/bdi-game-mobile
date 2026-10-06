import { describe, expect, it } from 'vitest'
import {
  createSession, dispatch, GameError, playerView, trainingView,
  type Ctx, type SessionState,
} from '../../index.js'
import type { AccessPlayerView, AccessTrainingView } from './view.js'

const orgs = ['admin', 'owner', 'provider', 'consumer'] as const

function ctx(now = '2026-01-01T10:00:00.000Z'): Ctx {
  return { now, language: 'nl', presentationMs: 3000, pipelineMs: 1000, animationMs: 4000, graceMs: 30000, idleMs: 30 * 60_000 }
}

function later(now: string, ms: number): string {
  return new Date(new Date(now).getTime() + ms).toISOString()
}

function accessSession(id = 'access-1'): SessionState {
  const invites = Object.fromEntries(orgs.map((org) => [org, `invite-${org}`]))
  let current = createSession({
    id, code: 'ACC123', hostUserId: 'host', name: 'Access', language: 'nl',
    startMode: 'story', now: ctx().now, expiresAt: '2026-01-02T10:00:00.000Z', invites, gameId: 'access',
  })
  for (const org of orgs) {
    current = dispatch(current, { type: 'claimRole', userId: org, organizationId: org, inviteToken: `invite-${org}` }, ctx()).state
    current = dispatch(current, { type: 'markReady', userId: org }, ctx()).state
  }
  return dispatch(current, {
    type: 'startRound', userId: 'host', roundId: 'run-1', seed: 'seed', orderId: 'o', transportId: 't',
  }, ctx()).state
}

function afterHold(state: SessionState, now: string): { state: SessionState; now: string } {
  let next = state
  for (const org of orgs) {
    next = dispatch(next, { type: 'heartbeat', userId: org }, ctx(now)).state
  }
  const nextNow = later(now, 3000)
  next = dispatch(next, { type: 'tick' }, ctx(nextNow)).state
  for (const org of orgs) {
    next = dispatch(next, { type: 'heartbeat', userId: org }, ctx(nextNow)).state
  }
  return { state: next, now: nextNow }
}

function accessAct(state: SessionState, now: string, command: Parameters<typeof dispatch>[1]): { state: SessionState; now: string } {
  let next = state
  for (const org of orgs) {
    next = dispatch(next, { type: 'heartbeat', userId: org }, ctx(now)).state
  }
  if (next.status === 'paused') {
    next = dispatch(next, { type: 'resume', userId: 'host' }, ctx(now)).state
  }
  next = dispatch(next, command, ctx(now)).state
  return afterHold(next, now)
}

describe('access game', () => {
  it('returns incomplete dossiers and commits only complete versions at organisation level', () => {
    let { state, now } = { state: accessSession(), now: ctx().now }
    ;({ state, now } = accessAct(state, now, {
      type: 'accessSubmitDossier', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'd1',
      orgIdentity: true, representative: false, terms: true,
    }))
    expect(state.access!.dossiers[0].complete).toBe(false)
    expect(() => dispatch(state, {
      type: 'accessDossierDecision', userId: 'admin', expectedVersion: state.access!.version, actionId: 'c1', decision: 'commit',
    }, ctx(now))).toThrow(GameError)

    ;({ state, now } = accessAct(state, now, {
      type: 'accessDossierDecision', userId: 'admin', expectedVersion: state.access!.version, actionId: 'r1', decision: 'return',
    }))
    expect(state.access!.dossiers[0].decision).toBe('returned')

    ;({ state, now } = accessAct(state, now, {
      type: 'accessSubmitDossier', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'd2',
      orgIdentity: true, representative: true, terms: true,
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessDossierDecision', userId: 'admin', expectedVersion: state.access!.version, actionId: 'c2', decision: 'commit',
    }))
    expect(state.access!.scene).toBe('involveRegister')
    expect(state.access!.members['org-delta']).toBe('active')
    expect(state.access!.bvad?.kind).toBe('bvad')
    expect(state.access!.bvad?.subjectSystemId).toBeNull()
    expect(state.access!.checks.membership).toBe('confirmed')
    const track = (trainingView(state, now) as AccessTrainingView).access!.stepTrack
    expect(track.phase).toBe('repeat')
    expect(track.steps.find((s) => s.id === 'onboard')?.status).toBe('done')
    expect(track.steps.find((s) => s.id === 'involve')?.status).toBe('active')
  })

  it('lets the owner set involvement and policy before consumer authentication', () => {
    let { state, now } = onboard(accessSession())
    expect(state.access!.scene).toBe('involveRegister')
    expect(state.access!.message).toMatch(/eenmalig/i)

    ;({ state, now } = accessAct(state, now, {
      type: 'accessRegisterCarrier', userId: 'owner', expectedVersion: state.access!.version, actionId: 'carrier',
    }))
    expect(state.access!.scene).toBe('policyEdit')
    expect(state.access!.bvodT101?.valid).toBe(true)

    ;({ state, now } = accessAct(state, now, {
      type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'pol',
      shareLoading: true, shareFinance: false,
    }))
    expect(state.access!.scene).toBe('authChoose')
    expect(state.access!.authenticated).toBe(false)
    expect(() => dispatch(state, {
      type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'ask-early',
      cardId: 'load-T-101',
    }, ctx(now))).toThrow(GameError)

    ;({ state, now } = accessAct(state, now, {
      type: 'accessChooseCredential', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'cred-ok',
      credentialId: 'cred-valid',
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessCheckRequest', userId: 'provider', expectedVersion: state.access!.version, actionId: 'check-ok',
    }))
    expect(state.access!.authenticated).toBe(true)
    expect(state.access!.scene).toBe('policyAsk')
    expect(state.access!.compareExpiredHint).toBeTruthy()
  })

  it('rejects expired credentials while membership stays active', () => {
    let { state, now } = playToAuth(accessSession())
    ;({ state, now } = accessAct(state, now, {
      type: 'accessChooseCredential', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'cred-bad',
      credentialId: 'cred-expired',
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessCheckRequest', userId: 'provider', expectedVersion: state.access!.version, actionId: 'check-bad',
    }))
    expect(state.access!.checks.identity).toBe('failed')
    expect(state.access!.checks.membership).toBe('confirmed')
    expect(state.access!.scene).toBe('authChoose')
    expect(state.access!.authenticated).toBe(false)
  })

  it('shares only loading T-101 under appropriate policy and records overshare', () => {
    let { state, now } = onboard(accessSession('over'))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessRegisterCarrier', userId: 'owner', expectedVersion: state.access!.version, actionId: 'carrier-o',
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'pol-wide',
      shareLoading: true, shareFinance: true,
    }))
    expect(state.access!.history.some((h) => h.result === 'overshare')).toBe(true)
    expect(state.access!.scene).toBe('authChoose')
    ;({ state, now } = accessAct(state, now, {
      type: 'accessChooseCredential', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'cred-w',
      credentialId: 'cred-valid',
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessCheckRequest', userId: 'provider', expectedVersion: state.access!.version, actionId: 'check-w',
    }))

    for (const cardId of ['load-T-101', 'finance-T-101', 'load-T-102'] as const) {
      ;({ state, now } = accessAct(state, now, {
        type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: `ask-${cardId}-wide`,
        cardId,
      }))
    }
    expect(state.access!.requests.filter((r) => r.policyVersion === state.access!.policies.at(-1)!.version && r.allowed).map((r) => r.cardId))
      .toEqual(['load-T-101', 'finance-T-101'])
    expect(state.access!.scene).toBe('policyEdit')

    ;({ state, now } = accessAct(state, now, {
      type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'pol-ok',
      shareLoading: true, shareFinance: false,
    }))
    expect(state.access!.scene).toBe('policyAsk')
    for (const cardId of ['load-T-101', 'finance-T-101', 'load-T-102'] as const) {
      ;({ state, now } = accessAct(state, now, {
        type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: `ask-${cardId}-ok`,
        cardId,
      }))
    }
    const lastPolicy = state.access!.policies.at(-1)!.version
    const under = state.access!.requests.filter((r) => r.policyVersion === lastPolicy)
    expect(under.find((r: { cardId: string }) => r.cardId === 'load-T-101')?.allowed).toBe(true)
    expect(under.find((r: { cardId: string }) => r.cardId === 'finance-T-101')?.allowed).toBe(false)
    expect(under.find((r: { cardId: string }) => r.cardId === 'load-T-102')?.allowed).toBe(false)
    expect(state.access!.scene).toBe('revoke')
  })

  it('revokes and restores without new onboarding and keeps earlier data', () => {
    let { state, now } = playHappyPath(accessSession())
    const receivedBefore = state.access!.received.length
    expect(receivedBefore).toBeGreaterThan(0)

    ;({ state, now } = accessAct(state, now, {
      type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'revoke',
      shareLoading: false, shareFinance: false,
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'ask-revoked',
      cardId: 'load-T-101',
    }))
    expect(state.access!.requests.at(-1)?.allowed).toBe(false)
    expect(state.access!.checks.identity).toBe('confirmed')
    expect(state.access!.checks.membership).toBe('confirmed')
    expect(state.access!.checks.involvement).toBe('confirmed')
    expect(state.access!.checks.policy).toBe('failed')
    expect(state.access!.received.length).toBe(receivedBefore)
    expect(state.access!.bvad).toBeTruthy()
    expect(state.access!.scene).toBe('restore')

    ;({ state, now } = accessAct(state, now, {
      type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'restore',
      shareLoading: true, shareFinance: false,
    }))
    ;({ state, now } = accessAct(state, now, {
      type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'ask-restored',
      cardId: 'load-T-101',
    }))
    expect(state.access!.requests.at(-1)?.allowed).toBe(true)
    expect(state.access!.scene).toBe('debrief')
    expect(state.access!.dossiers.some((d) => d.decision === 'committed')).toBe(true)

    const consumer = playerView(state, 'consumer', now)! as AccessPlayerView
    expect(consumer.access?.received.some((r) => r.label.includes('Eerder'))).toBe(true)
    expect(JSON.stringify(consumer)).not.toContain('invite-')
  })

  it('dedupes actionId and isolates sessions', () => {
    let { state, now } = { state: accessSession('a'), now: ctx().now }
    const first = dispatch(state, {
      type: 'accessSubmitDossier', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'same',
      orgIdentity: true, representative: true, terms: true,
    }, ctx(now))
    const after = afterHold(first.state, now)
    const second = dispatch(after.state, {
      type: 'accessSubmitDossier', userId: 'consumer', expectedVersion: after.state.access!.version, actionId: 'same',
      orgIdentity: true, representative: true, terms: true,
    }, ctx(after.now))
    expect(second.output.duplicate).toBe(true)
    expect(second.state.access!.dossiers).toHaveLength(1)

    const other = accessSession('b')
    expect(other.id).not.toBe(first.state.id)
    expect(other.access!.dossiers).toHaveLength(0)
    expect(first.state.access!.dossiers).toHaveLength(1)
  })

  it('forbids non-owner policy changes and logistics access commands', () => {
    const { state, now } = playToAuth(accessSession())
    expect(() => dispatch(state, {
      type: 'accessSetPolicy', userId: 'provider', expectedVersion: state.access!.version, actionId: 'x',
      shareLoading: true, shareFinance: true,
    }, ctx(now))).toThrow(GameError)
    expect(() => dispatch(state, {
      type: 'accessSetPolicy', userId: 'admin', expectedVersion: state.access!.version, actionId: 'y',
      shareLoading: true, shareFinance: true,
    }, ctx(now))).toThrow(GameError)

    const logistics = createSession({
      id: 'log', code: 'LOG123', hostUserId: 'host', name: 'Log', language: 'nl',
      startMode: 'without_bdi', now: ctx().now, expiresAt: '2026-01-02T10:00:00.000Z',
      invites: { buyer: 'b', seller: 's', carrier: 'c', delivery: 'd' }, gameId: 'logistics',
    })
    expect(() => dispatch(logistics, {
      type: 'accessAskCard', userId: 'buyer', expectedVersion: 1, actionId: 'z', cardId: 'load-T-101',
    }, ctx())).toThrow(GameError)
  })

  it('training view exposes beamer history without invite tokens on claimed roles', () => {
    const { state } = playHappyPath(accessSession())
    const view = trainingView(state, ctx().now) as AccessTrainingView
    expect(view.gameId).toBe('access')
    expect(view.access?.history.length).toBeGreaterThan(5)
    expect(view.access?.stepTrack.steps.some((s) => s.id === 'onboard')).toBe(true)
    expect(view.roles.every((r) => r.claimed ? r.inviteToken === null : true)).toBe(true)
  })
})

function onboard(state: SessionState): { state: SessionState; now: string } {
  let now = ctx().now
  ;({ state, now } = accessAct(state, now, {
    type: 'accessSubmitDossier', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'd',
    orgIdentity: true, representative: true, terms: true,
  }))
  ;({ state, now } = accessAct(state, now, {
    type: 'accessDossierDecision', userId: 'admin', expectedVersion: state.access!.version, actionId: 'c', decision: 'commit',
  }))
  return { state, now }
}

function playToAuth(initial: SessionState): { state: SessionState; now: string } {
  let { state, now } = onboard(initial)
  ;({ state, now } = accessAct(state, now, {
    type: 'accessRegisterCarrier', userId: 'owner', expectedVersion: state.access!.version, actionId: 'carrier',
  }))
  ;({ state, now } = accessAct(state, now, {
    type: 'accessSetPolicy', userId: 'owner', expectedVersion: state.access!.version, actionId: 'pol',
    shareLoading: true, shareFinance: false,
  }))
  return { state, now }
}

function playToAsk(initial: SessionState): { state: SessionState; now: string } {
  let { state, now } = playToAuth(initial)
  ;({ state, now } = accessAct(state, now, {
    type: 'accessChooseCredential', userId: 'consumer', expectedVersion: state.access!.version, actionId: 'cred',
    credentialId: 'cred-valid',
  }))
  ;({ state, now } = accessAct(state, now, {
    type: 'accessCheckRequest', userId: 'provider', expectedVersion: state.access!.version, actionId: 'check',
  }))
  return { state, now }
}

function playHappyPath(initial: SessionState): { state: SessionState; now: string } {
  let { state, now } = playToAsk(initial)
  for (const cardId of ['load-T-101', 'finance-T-101', 'load-T-102'] as const) {
    ;({ state, now } = accessAct(state, now, {
      type: 'accessAskCard', userId: 'consumer', expectedVersion: state.access!.version, actionId: `ask-${cardId}`,
      cardId,
    }))
  }
  return { state, now }
}
