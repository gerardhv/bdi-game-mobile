import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, apiUrl, setToken, withSlot } from './api'
import { RoleIcon } from './art/icons'
import { storedLang, tr, type Lang } from './i18n'
import { ORGS, type Training } from './types'
import { Wordmark } from './ui'

export { Host } from './host/Host'
export { Join } from './phone/Join'
export { Play } from './phone/Play'

type GameCard = {
  id: string
  version: number
  titles: { nl: string; en: string }
  blurbs: { nl: string; en: string }
  startModes: ('without_bdi' | 'only_bdi')[]
}

export function Home() {
  const navigate = useNavigate()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [games, setGames] = useState<GameCard[] | null>(null)
  const [gameId, setGameId] = useState<string | null>(null)
  const lang = storedLang()
  const t = tr(lang)
  const selected = games?.find((game) => game.id === gameId) ?? null

  useEffect(() => {
    void fetch(apiUrl('/api/games'))
      .then(async (response) => {
        if (!response.ok) throw new Error(t.offline)
        const body = await response.json() as { games: GameCard[] }
        setGames(body.games)
        if (body.games.length === 1) setGameId(body.games[0].id)
      })
      .catch(() => setError(t.offline))
  }, [t.offline])

  async function create(startMode: 'without_bdi' | 'only_bdi') {
    if (!gameId) return
    setBusy(true)
    try {
      const view = await api<Training>('/api/sessions', {
        method: 'POST',
        body: JSON.stringify({ language: lang, startMode, gameId }),
      })
      const path = withSlot(`/host/${view.sessionId}`)
      if (window.top && window.top !== window) {
        window.top.location.hash = `#${path}`
        return
      }
      navigate(path)
    } catch (err) {
      setError(err instanceof Error ? err.message : t.offline)
      setBusy(false)
    }
  }

  async function join(event: React.FormEvent) {
    event.preventDefault()
    const response = await fetch(apiUrl(`/api/join?code=${encodeURIComponent(code)}`)).catch(() => null)
    if (!response?.ok) {
      setError(t.unknownCode)
      return
    }
    navigate(withSlot(`/join?code=${encodeURIComponent(code)}`))
  }

  return (
    <main className="home">
      <section className="home-card">
        <Wordmark />
        <h1>{t.tagline}</h1>
        {!selected && (
          <>
            <p className="home-sub">{t.chooseGame}</p>
            <div className="game-list" data-testid="game-list">
              {(games ?? []).map((game) => (
                <button
                  key={game.id}
                  type="button"
                  className="btn game-card"
                  data-testid={`game-${game.id}`}
                  onClick={() => setGameId(game.id)}
                >
                  <strong>{game.titles[lang]}</strong>
                  <span>{game.blurbs[lang]}</span>
                </button>
              ))}
            </div>
          </>
        )}
        {selected && (
          <>
            <div className="home-roles" aria-hidden="true">{ORGS.map((org) => <RoleIcon key={org} org={org} />)}</div>
            <p className="home-sub"><strong>{selected.titles[lang]}</strong> — {selected.blurbs[lang]}</p>
            {(games?.length ?? 0) > 1 && (
              <button type="button" className="btn ghost" onClick={() => setGameId(null)}>{t.backToGames}</button>
            )}
            <button type="button" className="btn go" data-testid="start-session" disabled={busy} onClick={() => void create('without_bdi')}>{t.newGame}</button>
            {selected.startModes.includes('only_bdi') && (
              <button type="button" className="btn" disabled={busy} onClick={() => void create('only_bdi')}>{t.onlyBdi}</button>
            )}
            <Link className="btn ghost" to={`/table?game=${encodeURIComponent(selected.id)}&slot=host`}>{t.allRoles}</Link>
          </>
        )}
        <div className="divider" />
        <form onSubmit={(event) => void join(event)}>
          <label className="field">
            <span>{t.joinWithCode}</span>
            <input data-testid="join-code" value={code} autoCapitalize="characters" onChange={(e) => { setCode(e.target.value.toUpperCase()); setError('') }} />
          </label>
          <button type="submit" className="btn primary" disabled={!code}>{t.join}</button>
        </form>
        {error && <p className="error-bar" role="alert">{error}</p>}
        <div className="home-links"><Link to="/settings">{t.settings}</Link></div>
      </section>
    </main>
  )
}

export function Settings() {
  const [lang, setLang] = useState<Lang>(storedLang())
  const [volume, setVolume] = useState(localStorage.getItem('bdi-volume') ?? '0.4')
  const [muted, setMuted] = useState(localStorage.getItem('bdi-mute') === '1')
  const t = tr(lang)
  return (
    <main className="home">
      <section className="home-card">
        <Wordmark />
        <h1>{t.settings}</h1>
        <label className="field">
          <span>{t.language}</span>
          <select value={lang} onChange={(e) => { const next = e.target.value as Lang; setLang(next); localStorage.setItem('bdi-lang', next) }}>
            <option value="nl">Nederlands</option>
            <option value="en">English</option>
          </select>
        </label>
        <label className="field">
          <span>{t.volume}</span>
          <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => { setVolume(e.target.value); localStorage.setItem('bdi-volume', e.target.value) }} />
        </label>
        <label className="field check">
          <span><input type="checkbox" checked={muted} onChange={(e) => { setMuted(e.target.checked); localStorage.setItem('bdi-mute', e.target.checked ? '1' : '0') }} /> {t.mute}</span>
        </label>
        <p>{t.phonesSilent}</p>
        <Link className="btn" to="/">{t.back}</Link>
      </section>
    </main>
  )
}

export function TestTable() {
  const navigate = useNavigate()
  const { sessionId = '' } = useParams()
  const [params] = useSearchParams()
  const gameId = params.get('game') ?? 'logistics'
  const [view, setView] = useState<Training | null>(null)
  const [phones, setPhones] = useState<{ label: string; src: string }[] | null>(null)
  const creating = useRef(false)
  const t = tr(storedLang())
  useEffect(() => {
    if (sessionId || creating.current) return
    creating.current = true
    void api<Training>('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ name: t.allRoles, language: storedLang(), startMode: 'without_bdi', gameId }),
    })
      .then((created) => navigate(`/table/${created.sessionId}?slot=host`, { replace: true }))
  }, [navigate, sessionId, t.allRoles, gameId])
  useEffect(() => {
    if (!sessionId || view) return
    void api<Training>(`/api/sessions/${sessionId}/training`).then(setView)
  }, [sessionId, view])
  useEffect(() => {
    if (!view || phones) return
    const origin = window.location.href.split('#')[0]
    setPhones(view.roles.map((role) => ({
      label: role.roleLabel,
      src: role.claimed
        ? `${origin}#/play/${view.sessionId}?slot=${role.organizationId}`
        : `${origin}#/join?code=${view.code}&role=${role.organizationId}&invite=${role.inviteToken ?? ''}&slot=${role.organizationId}`,
    })))
  }, [phones, view])
  if (!view) return <p className="table-wait">{t.testTablePrep}</p>
  const origin = window.location.href.split('#')[0]
  return (
    <main className="test-table">
      <div className="test-grid">
        <iframe title="Beamer" src={`${origin}#/host/${view.sessionId}?slot=host`} />
        {phones?.map((phone) => <iframe key={phone.label} title={phone.label} src={phone.src} />)}
      </div>
    </main>
  )
}

export function Bootstrap() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const allowed = import.meta.env.DEV || import.meta.env.VITE_ALLOW_DEV_AUTH === 'true'
  useEffect(() => {
    if (!allowed) return
    const token = params.get('token')
    if (token) setToken(token)
    navigate(withSlot(params.get('next') ?? '/'))
  }, [allowed, navigate, params])
  return <p className="table-wait">{allowed ? tr(storedLang()).reconnecting : 'Not available'}</p>
}
