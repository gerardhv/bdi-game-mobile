import { describe, expect, it } from 'vitest'
import { createApp } from './app.js'
import { MemoryStore } from './service.js'

async function client(app: { request: (input: string, init?: RequestInit) => Response | Promise<Response> }) {
  const anon = await (await app.request('/api/dev/anonymous', { method: 'POST' })).json() as { userId: string; token: string }
  const headers = { authorization: `Bearer ${anon.token}`, 'content-type': 'application/json' }
  return { userId: anon.userId, token: anon.token, headers }
}

describe('session isolation', () => {
  it('gives one role to one simultaneous claim and hides training from players', async () => {
    const { app } = createApp(new MemoryStore())
    const host = await client(app)
    const createResponse = await app.request('/api/sessions', { method: 'POST', headers: host.headers, body: JSON.stringify({ name: 'Zaal A' }) })
    const created = await createResponse.json() as { sessionId: string; roles: { organizationId: string; inviteToken: string }[]; message?: string }
    if (!created.roles) throw new Error(`${createResponse.status} ${JSON.stringify(created)}`)
    const buyers = await Promise.all([client(app), client(app)])
    const token = created.roles.find((r) => r.organizationId === 'buyer')!.inviteToken
    const claims = await Promise.all(buyers.map((player) => app.request(`/api/sessions/${created.sessionId}/claim`, {
      method: 'POST', headers: player.headers, body: JSON.stringify({ organizationId: 'buyer', inviteToken: token, displayName: 'A' }),
    })))
    const statuses = claims.map((r) => r.status).sort()
    expect(statuses).toEqual([200, 409])
    const training = await app.request(`/api/sessions/${created.sessionId}/training`, { headers: buyers[0].headers })
    expect(training.status).toBe(403)
    const hostView = await (await app.request(`/api/sessions/${created.sessionId}/training`, { headers: host.headers })).json() as { roles: { organizationId: string; claimed: boolean; inviteToken: string | null }[] }
    expect(hostView.roles.find((r) => r.organizationId === 'buyer')?.inviteToken).toBeNull()
  })

  it('ignores command type and user id sent in an action body', async () => {
    const { app } = createApp(new MemoryStore())
    const host = await client(app)
    const created = await (await app.request('/api/sessions', { method: 'POST', headers: host.headers, body: JSON.stringify({ name: 'Zaal B' }) })).json() as { sessionId: string }
    const intruder = await client(app)
    const spoof = await app.request(`/api/sessions/${created.sessionId}/actions`, {
      method: 'POST', headers: intruder.headers, body: JSON.stringify({ type: 'finishSession', userId: host.userId }),
    })
    expect(spoof.status).toBeGreaterThanOrEqual(400)
    const hostView = await (await app.request(`/api/sessions/${created.sessionId}/training`, { headers: host.headers })).json() as { status: string }
    expect(hostView.status).not.toBe('closed')
  })

  it('allows at most ten open sessions per client IP', async () => {
    const { app } = createApp(new MemoryStore())
    const host = await client(app)
    const ipHeaders = { ...host.headers, 'x-forwarded-for': '203.0.113.10' }
    for (let i = 0; i < 10; i += 1) {
      const response = await app.request('/api/sessions', { method: 'POST', headers: ipHeaders, body: JSON.stringify({ name: `Zaal ${i}` }) })
      expect(response.status).toBe(200)
    }
    const blocked = await app.request('/api/sessions', { method: 'POST', headers: ipHeaders, body: JSON.stringify({ name: 'Te veel' }) })
    expect(blocked.status).toBe(429)
    const otherIp = await client(app)
    const other = await app.request('/api/sessions', {
      method: 'POST',
      headers: { ...otherIp.headers, 'x-forwarded-for': '203.0.113.99' },
      body: JSON.stringify({ name: 'Ander netwerk' }),
    })
    expect(other.status).toBe(200)
  })
})
