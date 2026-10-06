import { useEffect, useState, type CSSProperties } from 'react'
import { api } from '../../api'
import { RoleIcon } from '../../art/icons'
import { tr, useDocumentLang } from '../../i18n'
import type { LiveStatus } from '../../live'
import type { AccessPlayer } from '../../types'
import { useAccessAction } from './Host'

type Live = {
  data: AccessPlayer | null
  status: LiveStatus | string
  error: { message: string; status?: number } | null
  refresh: () => void
}

export function AccessPlay({
  sessionId,
  data: view,
  status,
  error,
  refresh,
}: {
  sessionId: string
} & Live) {
  const { post, pending, error: actionError } = useAccessAction(sessionId, refresh)
  const [dossier, setDossier] = useState({ orgIdentity: true, representative: true, terms: true })
  const [policy, setPolicy] = useState({ shareLoading: true, shareFinance: false })
  useDocumentLang(view?.language)

  useEffect(() => {
    if (!sessionId) return
    const beat = () => void api(`/api/sessions/${sessionId}/heartbeat`, { method: 'POST' }).catch(() => undefined)
    beat()
    const timer = setInterval(beat, 5000)
    return () => clearInterval(timer)
  }, [sessionId])

  if (!view) {
    return (
      <main className="phone-app">
        <div className="phone-body">
          <section className="waiting-card">
            <h2>{error ? error.message : tr(null).reconnecting}</h2>
          </section>
        </div>
      </main>
    )
  }

  const t = tr(view.language)
  const access = view.access
  const version = access?.version ?? 0
  const act = (body: Record<string, unknown>) => {
    if (pending || !access?.canAct) return
    void post({ ...body, expectedVersion: version, actionId: crypto.randomUUID() })
  }

  return (
    <main className="phone-app" style={{ '--role': `var(--${view.role})` } as CSSProperties} data-testid={`phone-${view.role}`}>
      <header className="phone-head">
        <span className="role-badge"><RoleIcon org={view.role} /></span>
        <div>
          <h1>{view.roleLabel}</h1>
          <small>
            <span className={`conn-dot${status === 'live' ? '' : ' off'}`} />
            {view.organizationName}
          </small>
        </div>
      </header>
      <div className="phone-body">
        {(actionError || (status === 'offline' && t.offline)) && <p className="error-bar">{actionError || t.offline}</p>}
        {!access && (
          <section className="waiting-card">
            <RoleIcon org={view.role} />
            <h2>{t.youAre} {view.roleLabel.toLowerCase()}</h2>
            {view.ready ? (
              <p data-testid="ready-wait">{t.readyLabel}</p>
            ) : (
              <button
                type="button"
                className="btn primary"
                data-testid="ready"
                onClick={() => void api(`/api/sessions/${sessionId}/ready`, { method: 'POST' }).finally(refresh)}
              >
                {t.readyLabel}
              </button>
            )}
          </section>
        )}
        {access && (
          <>
            <div className="access-checks compact" data-testid="phone-checks">
              {access.checksLabels.map((c) => (
                <div key={c.id} className={`access-check status-${c.status}`}><strong>{c.label}</strong><span>{c.statusLabel}</span></div>
              ))}
            </div>
            {access.message && <p className="hint-text">{access.message}</p>}
            {access.waitingFor && !access.canAct && <p className="waiting-card">{access.waitingFor}</p>}
            {access.prompt && access.canAct && <h2 data-testid="access-task">{access.prompt}</h2>}

            {access.canAct && access.scene === 'dossier' && view.role === 'consumer' && access.dossier && !access.dossier.pending && (
              <section className="task-card">
                {access.dossier.cards.map((card) => (
                  <label key={card.id} className="field check">
                    <input
                      type="checkbox"
                      checked={card.id === 'org-identity' ? dossier.orgIdentity : card.id === 'representative' ? dossier.representative : dossier.terms}
                      onChange={(e) => {
                        if (card.id === 'org-identity') setDossier((d) => ({ ...d, orgIdentity: e.target.checked }))
                        if (card.id === 'representative') setDossier((d) => ({ ...d, representative: e.target.checked }))
                        if (card.id === 'terms') setDossier((d) => ({ ...d, terms: e.target.checked }))
                      }}
                    />
                    {card.label}
                  </label>
                ))}
                <button type="button" className="btn primary" data-testid="submit-dossier" disabled={pending} onClick={() => act({ type: 'submitDossier', ...dossier })}>
                  {view.language === 'nl' ? 'Dossier indienen' : 'Submit dossier'}
                </button>
              </section>
            )}

            {access.canAct && access.scene === 'dossier' && view.role === 'admin' && access.dossier?.pending && access.dossier.latest && (
              <section className="task-card">
                <p>{view.language === 'nl' ? `Versie ${access.dossier.latest.version}` : `Version ${access.dossier.latest.version}`}</p>
                <ul>{access.dossier.cards.map((c) => <li key={c.id}>{c.label}: {c.included ? '✓' : '—'}</li>)}</ul>
                {access.dossier.latest.complete ? (
                  <button type="button" className="btn primary" data-testid="commit-dossier" disabled={pending} onClick={() => act({ type: 'dossierDecision', decision: 'commit' })}>
                    {view.language === 'nl' ? 'Vastleggen' : 'Commit'}
                  </button>
                ) : (
                  <button type="button" className="btn primary" data-testid="return-dossier" disabled={pending} onClick={() => act({ type: 'dossierDecision', decision: 'return' })}>
                    {view.language === 'nl' ? 'Teruggeven' : 'Return'}
                  </button>
                )}
              </section>
            )}

            {access.canAct && access.credentials && (
              <section className="task-card tiles two">
                {access.credentials.map((cred) => (
                  <button key={cred.id} type="button" className="tile" data-testid={`cred-${cred.id}`} disabled={pending} onClick={() => act({ type: 'chooseCredential', credentialId: cred.id })}>
                    {cred.label}
                  </button>
                ))}
              </section>
            )}

            {access.canAct && access.scene === 'authCheck' && view.role === 'provider' && (
              <button type="button" className="btn primary" data-testid="check-request" disabled={pending} onClick={() => act({ type: 'checkRequest' })}>
                {view.language === 'nl' ? 'Controleer verzoek' : 'Check request'}
              </button>
            )}

            {access.canAct && access.scene === 'involveRegister' && (
              <button type="button" className="btn primary" data-testid="register-carrier" disabled={pending} onClick={() => act({ type: 'registerCarrier' })}>
                {view.language === 'nl' ? 'Vastleggen: Delta mag gegevens ophalen voor T-101' : 'Record: Delta may retrieve data for T-101'}
              </button>
            )}

            {access.canAct && access.scene === 'involveProofs' && (
              <button type="button" className="btn primary" data-testid="check-proofs" disabled={pending} onClick={() => act({ type: 'checkProofs' })}>
                {view.language === 'nl' ? 'Neem BVAD en BVOD mee in de afweging' : 'Include BVAD and BVOD in the assessment'}
              </button>
            )}

            {access.canAct && (access.scene === 'policyEdit' || access.scene === 'revoke' || access.scene === 'restore') && view.role === 'owner' && (
              <section className="task-card">
                <label className="field check">
                  <input type="checkbox" checked={access.scene === 'revoke' ? false : policy.shareLoading} onChange={(e) => setPolicy((p) => ({ ...p, shareLoading: e.target.checked }))} />
                  {view.language === 'nl' ? 'Laadinformatie delen' : 'Share loading info'}
                </label>
                <label className="field check">
                  <input type="checkbox" checked={access.scene === 'revoke' ? false : access.scene === 'restore' ? false : policy.shareFinance} onChange={(e) => setPolicy((p) => ({ ...p, shareFinance: e.target.checked }))} />
                  {view.language === 'nl' ? 'Financiële gegevens delen' : 'Share financial data'}
                </label>
                <button
                  type="button"
                  className="btn primary"
                  data-testid="set-policy"
                  disabled={pending}
                  onClick={() => {
                    if (access.scene === 'revoke') act({ type: 'setPolicy', shareLoading: false, shareFinance: false })
                    else if (access.scene === 'restore') act({ type: 'setPolicy', shareLoading: true, shareFinance: false })
                    else act({ type: 'setPolicy', ...policy })
                  }}
                >
                  {view.language === 'nl' ? 'Beleid bevestigen' : 'Confirm policy'}
                </button>
              </section>
            )}

            {access.canAct && access.cards && (
              <section className="task-card">
                {access.cards.map((card) => (
                  <button key={card.id} type="button" className="btn" data-testid={`ask-${card.id}`} disabled={pending} onClick={() => act({ type: 'askCard', cardId: card.id })}>
                    {card.title}
                    {card.lastAllowed != null && <small> · {card.lastAllowed ? '✓' : '×'}</small>}
                  </button>
                ))}
              </section>
            )}

            {access.received.length > 0 && (
              <section className="task-card">
                <h3>{view.language === 'nl' ? 'Ontvangen gegevens' : 'Received data'}</h3>
                {access.received.map((item) => (
                  <div key={`${item.cardId}-${item.payload}`} className="fact" data-testid={`received-${item.cardId}`}>
                    <strong>{item.title}</strong>
                    <em>{item.label}</em>
                    <p>{item.payload}</p>
                  </div>
                ))}
              </section>
            )}

            {access.compareExpiredHint && <p className="hint-text">{access.compareExpiredHint}</p>}
          </>
        )}
      </div>
    </main>
  )
}
