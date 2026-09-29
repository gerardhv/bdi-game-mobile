import { useEffect, useState, type CSSProperties } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { api, apiUrl, withSlot } from '../api'
import { RoleIcon, type Org } from '../art/icons'
import { storedLang, tr } from '../i18n'

type Preview = {
  sessionId: string
  name: string
  language: 'nl' | 'en'
  free: { organizationId: Org; roleLabel: string; name: string; blurb: string }[]
  roles: { organizationId: Org; roleLabel: string; name: string; blurb: string; free: boolean }[]
}

export function Join() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const code = params.get('code') ?? ''
  const requested = (params.get('role') ?? '') as Org | ''
  const invite = params.get('invite') ?? ''
  const [name, setName] = useState('')
  const [preview, setPreview] = useState<Preview | null>(null)
  const [role, setRole] = useState<Org | ''>(requested)
  const [invited, setInvited] = useState(Boolean(invite))
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    const response = await fetch(apiUrl(`/api/join?code=${encodeURIComponent(code)}`))
    const body = await response.json()
    if (!response.ok) throw new Error(body.message ?? tr(storedLang()).unknownCode)
    setPreview(body as Preview)
    return body as Preview
  }

  useEffect(() => {
    if (!code) return
    load().catch((err: Error) => setError(err.message))
  }, [code])

  const t = tr(preview?.language ?? storedLang())
  const requestedCard = preview?.roles.find((r) => r.organizationId === role)
  const taken = Boolean(requestedCard && !requestedCard.free)
  const card = taken ? undefined : requestedCard

  async function claim() {
    if (!preview || !role) return
    setBusy(true)
    setError('')
    try {
      await api(`/api/sessions/${preview.sessionId}/claim`, {
        method: 'POST',
        body: JSON.stringify({ organizationId: role, inviteToken: invited ? invite : null, displayName: name }),
      })
      navigate(withSlot(`/play/${preview.sessionId}`))
    } catch (err) {
      const e = err as Error & { body?: { error?: string } }
      if (e.body?.error === 'already_seated') {
        navigate(withSlot(`/play/${preview.sessionId}`))
        return
      }
      setError(t.roleTaken)
      setRole('')
      setInvited(false)
      await load().catch(() => undefined)
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="join-screen">
      <section className="join-card" style={card ? ({ '--role': `var(--${card.organizationId})` } as CSSProperties) : undefined}>
        <small className="org">{t.session} · {preview?.name ?? code}</small>
        {card ? (
          <>
            <RoleIcon org={card.organizationId} className="big-icon" />
            <div>
              <p className="org">{t.youAre}</p>
              <h1>{card.roleLabel}</h1>
              <p className="org">{card.name}</p>
            </div>
            <p>{card.blurb}</p>
            <label className="field">
              <span>{t.nameOptional}</span>
              <input value={name} maxLength={40} onChange={(e) => setName(e.target.value)} />
            </label>
            <button type="button" className="btn go" data-testid="claim-role" disabled={busy} onClick={() => void claim()}>
              {t.takeRole}
            </button>
            {!requested && <button type="button" className="btn ghost" onClick={() => setRole('')}>{t.back}</button>}
          </>
        ) : (
          <>
            <h1>{t.chooseRole}</h1>
            <div className="choose">
              {preview?.free.map((item) => (
                <button
                  key={item.organizationId}
                  type="button"
                  className="btn"
                  data-testid={`free-${item.organizationId}`}
                  style={{ '--role': `var(--${item.organizationId})` } as CSSProperties}
                  onClick={() => { setRole(item.organizationId); setInvited(false) }}
                >
                  <RoleIcon org={item.organizationId} />
                  {item.roleLabel}
                </button>
              ))}
            </div>
          </>
        )}
        {(error || taken) && <p className="error-bar" data-testid="claim-error">{error || t.roleTaken}</p>}
      </section>
    </main>
  )
}
