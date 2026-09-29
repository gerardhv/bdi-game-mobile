import { serve } from '@hono/node-server'
import { createApp } from './app.js'
import { attachPostgres } from './postgres.js'
import { MemoryStore } from './service.js'

process.env.GAME_FILE ??= 'data/game.json'
const store = new MemoryStore()
if (process.env.DATABASE_URL) {
  await attachPostgres(store, process.env.DATABASE_URL)
  console.log('Sessions worden in Postgres bewaard.')
}
const { app, game } = createApp(store)
const port = Number(process.env.PORT ?? 8787)
setInterval(() => { void game.tickAll() }, 500)
serve({ fetch: app.fetch, port }, () => {
  console.log(`BDI game API on http://localhost:${port}`)
})
