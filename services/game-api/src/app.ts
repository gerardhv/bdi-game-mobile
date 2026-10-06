import { networkInterfaces } from 'node:os'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { streamSSE } from 'hono/streaming'
import { GameError, type OrgId } from '@bdi/domain'
import { GameService, userFromAuth, type Store } from './service.js'

export function createApp(store: Store) {
  const game = new GameService(store)
  const app = new Hono()
  app.use('*', cors({
  origin: (origin) => {
    const allowed = process.env.CORS_ORIGIN
    if (!allowed || allowed === '*') return origin
    return allowed.split(',').map((item) => item.trim()).includes(origin) ? origin : null
  },
  allowHeaders: ['Authorization', 'Content-Type'],
}))
  app.onError((err, c) => {
    if (err instanceof GameError) return c.json({ error: err.code, message: err.message }, err.httpStatus as 400)
    console.error(err)
    return c.json({ error: 'server', message: 'Er ging iets mis.' }, 500)
  })
  const user = (c: { req: { header: (n: string) => string | undefined } }) => userFromAuth(c.req.header('authorization'))
  const clientIp = (c: { req: { header: (n: string) => string | undefined } }) => {
    const forwarded = c.req.header('x-forwarded-for')
    if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown'
    return c.req.header('x-real-ip')?.trim() || 'unknown'
  }
  app.get('/health', (c) => c.json({ ok: true }))
  app.get('/api/network', (c) => {
    const addresses: string[] = []
    for (const entries of Object.values(networkInterfaces())) {
      for (const entry of entries ?? []) {
        if (entry.family === 'IPv4' && !entry.internal) addresses.push(entry.address)
      }
    }
    return c.json({ addresses })
  })
  app.post('/api/dev/anonymous', async (c) => c.json(await game.anonymous()))
  app.get('/api/games', (c) => c.json({ games: game.listGames() }))
  app.post('/api/sessions', async (c) => c.json(await game.create(await user(c), await c.req.json(), clientIp(c))))
  app.get('/api/join', async (c) => c.json(await game.joinPreview(c.req.query('code') ?? '')))
  app.get('/api/sessions/:id/training', async (c) => c.json(await game.training(c.req.param('id'), await user(c))))
  app.get('/api/sessions/:id/training/history', async (c) => {
    const view = await game.training(c.req.param('id'), await user(c))
    return c.json(view.round?.history ?? [])
  })
  app.get('/api/sessions/:id/player', async (c) => c.json(await game.player(c.req.param('id'), await user(c))))
  app.get('/api/sessions/:id/stream', async (c) => {
    const sessionId = c.req.param('id')
    const userId = await user(c)
    const kind = c.req.query('kind') === 'training' ? 'training' : 'player'
    const load = () => (kind === 'training' ? game.training(sessionId, userId) : game.player(sessionId, userId))
    const first = await load()
    const since = Number(c.req.query('cursor') ?? -1)
    return streamSSE(c, async (stream) => {
      let last = ''
      let open = true
      stream.onAbort(() => { open = false })
      const send = async (view: unknown) => {
        const { serverNow: _ignored, ...stable } = view as Record<string, unknown>
        const body = JSON.stringify(stable)
        if (body === last) return
        last = body
        const cursor = typeof (view as { cursor?: number }).cursor === 'number' ? (view as { cursor: number }).cursor : 0
        await stream.writeSSE({ event: 'snapshot', id: String(cursor), data: JSON.stringify({ ...view as object, replayFrom: since }) })
      }
      await send(first)
      let beat = 0
      while (open) {
        await stream.sleep(400)
        try {
          await send(await load())
        } catch (err) {
          await stream.writeSSE({ event: 'gone', data: JSON.stringify({ message: err instanceof Error ? err.message : 'gone' }) })
          break
        }
        beat += 1
        if (beat % 25 === 0) await stream.writeSSE({ event: 'ping', data: '{}' })
      }
    })
  })
  app.get('/api/sessions/:id/recovery', async (c) => c.json(await game.player(c.req.param('id'), await user(c))))
  app.get('/api/sessions/:id/events', async (c) => c.json(await game.player(c.req.param('id'), await user(c))))
  app.post('/api/sessions/:id/claim', async (c) => {
    const body = await c.req.json()
    return c.json(await game.command(c.req.param('id'), await user(c), {
      type: 'claimRole', userId: await user(c), organizationId: body.organizationId, inviteToken: body.inviteToken ?? null, displayName: body.displayName,
    }))
  })
  app.post('/api/sessions/:id/release', async (c) => {
    const body = await c.req.json()
    return c.json(await game.command(c.req.param('id'), await user(c), { type: 'releaseRole', userId: await user(c), organizationId: body.organizationId, nextInvite: crypto.randomUUID() }))
  })
  app.post('/api/sessions/:id/ready', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'markReady', userId: await user(c) })))
  app.post('/api/sessions/:id/start', async (c) => c.json(await game.command(c.req.param('id'), await user(c), {
    type: 'startRound', userId: await user(c), roundId: crypto.randomUUID(), seed: crypto.randomUUID(), orderId: crypto.randomUUID(), transportId: crypto.randomUUID(),
  })))
  app.post('/api/sessions/:id/actions', async (c) => {
    const body = await c.req.json()
    return c.json(await game.command(c.req.param('id'), await user(c), {
      type: 'submitAction', userId: await user(c), roundId: body.roundId, stepId: body.stepId,
      expectedStateVersion: body.expectedStateVersion, actionId: body.actionId, value: body.value,
    }))
  })
  app.post('/api/sessions/:id/access', async (c) => {
    const body = await c.req.json() as Record<string, unknown>
    const userId = await user(c)
    const expectedVersion = Number(body.expectedVersion)
    const actionId = String(body.actionId ?? '')
    const kind = String(body.type ?? '')
    const base = { userId, expectedVersion, actionId }
    let command: import('@bdi/domain').Command
    switch (kind) {
      case 'submitDossier':
        command = { type: 'accessSubmitDossier', ...base, orgIdentity: Boolean(body.orgIdentity), representative: Boolean(body.representative), terms: Boolean(body.terms) }
        break
      case 'dossierDecision':
        command = { type: 'accessDossierDecision', ...base, decision: body.decision === 'return' ? 'return' : 'commit' }
        break
      case 'registerSystem':
        command = { type: 'accessRegisterSystem', ...base, belongs: Boolean(body.belongs), endpoint: Boolean(body.endpoint), credential: Boolean(body.credential) }
        break
      case 'chooseCredential':
        command = { type: 'accessChooseCredential', ...base, credentialId: body.credentialId === 'cred-expired' ? 'cred-expired' : 'cred-valid' }
        break
      case 'checkRequest':
        command = { type: 'accessCheckRequest', ...base }
        break
      case 'registerCarrier':
        command = { type: 'accessRegisterCarrier', ...base }
        break
      case 'checkProofs':
        command = { type: 'accessCheckProofs', ...base }
        break
      case 'setPolicy':
        command = { type: 'accessSetPolicy', ...base, shareLoading: Boolean(body.shareLoading), shareFinance: Boolean(body.shareFinance) }
        break
      case 'askCard':
        command = { type: 'accessAskCard', ...base, cardId: body.cardId as 'load-T-101' | 'finance-T-101' | 'load-T-102' }
        break
      case 'predict':
        command = { type: 'accessPredict', ...base, guess: body.guess === 'allow' ? 'allow' : 'deny' }
        break
      default:
        return c.json({ error: 'unknown', message: 'Onbekende access-actie.' }, 400)
    }
    return c.json(await game.command(c.req.param('id'), userId, command))
  })
  app.post('/api/sessions/:id/pause', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'pause', userId: await user(c) })))
  app.post('/api/sessions/:id/resume', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'resume', userId: await user(c) })))
  app.post('/api/sessions/:id/finish', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'finishSession', userId: await user(c) })))
  app.post('/api/sessions/:id/restart', async (c) => c.json(await game.command(c.req.param('id'), await user(c), {
    type: 'restartRound', userId: await user(c), roundId: crypto.randomUUID(), seed: crypto.randomUUID(), orderId: crypto.randomUUID(), transportId: crypto.randomUUID(),
  })))
  app.post('/api/sessions/:id/help', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'markHelp', userId: await user(c) })))
  app.post('/api/sessions/:id/notes', async (c) => {
    const body = await c.req.json()
    return c.json(await game.command(c.req.param('id'), await user(c), { type: 'saveNote', userId: await user(c), text: body.text ?? '' }))
  })
  app.post('/api/sessions/:id/heartbeat', async (c) => c.json(await game.command(c.req.param('id'), await user(c), { type: 'heartbeat', userId: await user(c) })))
  app.post('/api/sessions/:id/language', async (c) => {
    const body = await c.req.json()
    return c.json(await game.command(c.req.param('id'), await user(c), { type: 'updateLanguage', userId: await user(c), language: body.language }))
  })
  app.get('/api/data/:org/:type/:resourceId', async (c) => {
    const org = c.req.param('org').replace('-data', '') as OrgId
    const ref = `${org}-data/${c.req.param('type')}/${c.req.param('resourceId')}`
    const sessionId = c.req.query('sessionId') ?? ''
    return c.json(await game.read(sessionId, await user(c), ref))
  })
  app.post('/internal/tick', async (c) => {
    if (c.req.header('x-tick-secret') !== (process.env.INTERNAL_TICK_SECRET ?? 'dev-tick-secret')) {
      return c.json({ error: 'forbidden' }, 403)
    }
    await game.tickAll()
    return c.json({ ok: true })
  })
  return { app, game }
}
