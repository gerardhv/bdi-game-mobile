import { useCallback, useState } from 'react'
import { api } from '../../api'
import { tr } from '../../i18n'
import type { AccessTraining } from '../../types'
import { AccessBoard } from './Board'

export function AccessHost({
  view,
  reviewing,
  reviewIndex,
  history,
  onStepReview,
  onCloseReview,
}: {
  view: AccessTraining
  reviewing: boolean
  reviewIndex: number
  history: AccessTraining['access'] extends null | infer A ? A extends { history: infer H } ? H : never : never
  onStepReview: (delta: number) => void
  onCloseReview: () => void
}) {
  const t = tr(view.language)
  const access = view.access
  if (!access) {
    return <p className="empty">{t.lobby}</p>
  }
  const frame = reviewing && history[reviewIndex] ? history[reviewIndex].frame : null
  const checks = frame?.checks
    ? access.checksLabels.map((c) => ({ ...c, status: frame.checks[c.id], statusLabel: access.checksLabels.find((x) => x.id === c.id)?.statusLabel ?? '' }))
    : access.checksLabels
  const message = frame?.message ?? access.message
  const requestLabel = frame?.requestLabel ?? access.requestLabel

  return (
    <div className="access-host" data-testid="access-host">
      <AccessBoard
        lang={view.language}
        checks={checks}
        flights={reviewing ? [] : access.flights}
        members={access.members}
        deltaActive={Boolean(access.proofs.bvad)}
        message={message}
        requestLabel={requestLabel}
        actor={access.actor}
        stepTrack={access.stepTrack}
      />
      {access.prompt && <p className="access-prompt" data-testid="access-prompt">{access.prompt}</p>}
      {access.compareExpiredHint && <p className="access-hint">{access.compareExpiredHint}</p>}
      {access.debrief && (
        <section className="access-debrief" data-testid="access-debrief">
          <h2>{view.language === 'nl' ? 'Nabespreking' : 'Debrief'}</h2>
          <ul>
            <li>{view.language === 'nl' ? 'Opdracht uitgevoerd' : 'Mission completed'}: {access.debrief.missionDone ? '✓' : '—'}</li>
            <li>{view.language === 'nl' ? 'Passende gegevens gedeeld' : 'Appropriate data shared'}: {access.debrief.appropriateShare ? '✓' : '—'}</li>
            <li>{view.language === 'nl' ? 'Herstel nodig geweest' : 'Restore was needed'}: {access.debrief.restoreNeeded ? '✓' : '—'}</li>
            {access.debrief.oversharedFinance && (
              <li>{view.language === 'nl' ? 'Onnodige financiële deling' : 'Unnecessary financial sharing'}</li>
            )}
          </ul>
          <ol>
            {access.debrief.questions.map((q) => <li key={q}>{q}</li>)}
          </ol>
        </section>
      )}
      {reviewing && (
        <div className="review-banner" data-testid="review-banner">
          <strong>{t.reviewBanner}</strong>
          <span>{reviewIndex + 1} / {history.length}</span>
          <button type="button" className="btn" onClick={() => onStepReview(-1)}>←</button>
          <button type="button" className="btn" onClick={() => onStepReview(1)}>→</button>
          <button type="button" className="btn primary" onClick={onCloseReview}>{t.backToLive}</button>
        </div>
      )}
      <details className="access-terms">
        <summary>{view.language === 'nl' ? 'Begrippen' : 'Terms'}</summary>
        <ul>
          {access.termCards.map((card) => (
            <li key={card.term}><strong>{card.term}</strong> — {card.text}</li>
          ))}
        </ul>
      </details>
    </div>
  )
}

export function useAccessAction(sessionId: string, refresh: () => void) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const post = useCallback(async (body: Record<string, unknown>) => {
    setPending(true)
    setError('')
    try {
      await api(`/api/sessions/${sessionId}/access`, { method: 'POST', body: JSON.stringify(body) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error')
    } finally {
      setPending(false)
      void refresh()
    }
  }, [refresh, sessionId])
  return { post, pending, error }
}
