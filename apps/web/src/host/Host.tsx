import { useCallback, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { api, phoneBase } from '../api'
import { tr, useDocumentLang } from '../i18n'
import { useLive } from '../live'
import { MapView } from '../Map'
import { play, setSoundEnabled, soundEnabled, unlockAudio } from '../sound'
import { ORGS, type Training } from '../types'
import { Caption, Wordmark } from '../ui'
import { CommStrip, EventsCard, RegistryCard } from './CommStrip'
import { Comparison } from './Comparison'
import { Explainer } from './Explainer'
import { Lobby } from './Lobby'
import { ManageDrawer, type ManageAction } from './ManageDrawer'
import { QuestionCard } from './QuestionCard'
import { RolePanel } from './RolePanels'

export function Host() {
  const { sessionId = '' } = useParams()
  const { data: view, status, error, refresh } = useLive<Training>(sessionId, { kind: 'training' })
  const [review, setReview] = useState<number | null>(null)
  const [pausedForReview, setPausedForReview] = useState(false)
  const [drawer, setDrawer] = useState(false)
  const [sound, setSound] = useState(soundEnabled())
  const [phoneUrl, setPhoneUrl] = useState('')
  const [hideComparison, setHideComparison] = useState(false)
  const [showDossiers, setShowDossiers] = useState(false)
  const lastSequence = useRef<number | null>(null)
  useDocumentLang(view?.language)

  useEffect(() => { void phoneBase().then(setPhoneUrl).catch(() => setPhoneUrl('')) }, [])

  const post = useCallback(async (path: string, body?: unknown) => {
    try {
      await api(`/api/sessions/${sessionId}/${path}`, { method: 'POST', body: body ? JSON.stringify(body) : undefined })
    } finally {
      void refresh()
    }
  }, [refresh, sessionId])

  const hostStep = useCallback((value: 'continue' | 'skip') => {
    if (!view?.round) return
    void post('actions', {
      roundId: view.round.id,
      stepId: view.round.stepId,
      expectedStateVersion: view.round.stateVersion,
      actionId: crypto.randomUUID(),
      value,
    })
  }, [post, view?.round])

  const history = view?.round?.history ?? []
  const reviewIndex = review == null ? -1 : history.findIndex((event) => event.sequence === review)

  const openReview = useCallback(() => {
    if (!view?.round || history.length === 0) return
    setReview(history.at(-1)!.sequence)
    setDrawer(false)
    if (!view.paused) {
      setPausedForReview(true)
      void post('pause')
    }
  }, [history, post, view?.paused, view?.round])

  const closeReview = useCallback(() => {
    setReview(null)
    if (pausedForReview) {
      setPausedForReview(false)
      void post('resume')
    }
  }, [pausedForReview, post])

  const stepReview = useCallback((delta: number) => {
    if (reviewIndex < 0) return
    const next = history[Math.max(0, Math.min(history.length - 1, reviewIndex + delta))]
    if (next) setReview(next.sequence)
  }, [history, reviewIndex])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return
      if (event.key === 'Escape') {
        if (review != null) closeReview()
        else setDrawer((open) => !open)
      } else if (event.key === ' ') {
        event.preventDefault()
        if (view?.round) void post(view.paused ? 'resume' : 'pause')
      } else if (event.key === 'ArrowLeft') {
        if (review == null) openReview()
        else stepReview(-1)
      } else if (event.key === 'ArrowRight') {
        if (review != null) {
          if (reviewIndex === history.length - 1) closeReview()
          else stepReview(1)
        }
      } else if (event.key === 'f' || event.key === 'F') {
        if (document.fullscreenElement) void document.exitFullscreen()
        else void document.documentElement.requestFullscreen?.()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeReview, history.length, openReview, post, review, reviewIndex, stepReview, view?.paused, view?.round])

  useEffect(() => {
    const latest = history.at(-1)
    if (!latest) return
    const previous = lastSequence.current
    lastSequence.current = latest.sequence
    if (previous == null || latest.sequence <= previous) return
    const fresh = history.filter((event) => event.sequence > previous)
    const types = new Set(fresh.map((event) => event.displayType))
    const wrong = fresh.some((event) => event.displayType === 'feedback' && event.result === 'wrong')
    if (view?.round?.logistics.phase === 'delivered' && fresh.some((event) => event.stepId === 'S18' || event.stepId === 'S19' || event.stepId === 'S20')) play('delivered')
    else if (wrong) play('wrong')
    else if (types.has('feedback')) play('ok')
    else if (types.has('notification')) play('bell')
    else if (types.has('fetch')) play('fetch')
    else if (types.has('engine')) play('engine')
    else if (types.has('choice')) play('tick')
  }, [history, view?.round?.logistics.phase])

  if (!view) {
    return (
      <main className="stage stage-wait">
        <Wordmark light />
        <p>{error ? error.message : tr(null).updating}</p>
      </main>
    )
  }

  const t = tr(view.language)
  const round = view.round
  const reviewing = review != null && reviewIndex >= 0
  const frame = reviewing ? history[reviewIndex].frame : round?.frame
  const panel = (org: string) => frame?.panels.find((p) => p.organizationId === org)
  const isActive = (org: string) => !reviewing && round?.activeOrg === org
  const isAsk = (org: string) => !reviewing && round?.askOrg === org
  const startLabel = view.startMode === 'only_bdi' ? t.startOnlyBdi : view.rounds.length === 0 ? t.startWithout : t.startWith
  const nextRound = round && round.stepId === 'S20' && round.mode === 'without_bdi' && !view.comparison
    ? () => void post('start')
    : null

  const onAction = (action: ManageAction) => {
    if (action === 'resume') setPausedForReview(false)
    void post(action)
  }

  return (
    <main
      className="stage"
      data-testid="training-root"
      onPointerDown={() => unlockAudio()}
    >
      <header className="hud-top">
        <Wordmark light />
        <strong className="hud-name">{view.sessionName}</strong>
        {round ? (
          <>
            <span className={`hud-pill${round.mode === 'with_bdi' ? ' round-bdi' : ''}`}>{t.round} {round.number} · {round.mode === 'with_bdi' ? t.withBdi : t.withoutBdi}</span>
            <span className="hud-pill" data-testid="sim-time">{round.simLabel}</span>
          </>
        ) : (
          <span className="hud-pill">{t.lobby}</span>
        )}
        {view.paused && round && (
          <button type="button" className="hud-pill paused" data-testid="hud-resume" onClick={() => void post('resume')}>{t.resume}</button>
        )}
        {round && <span className="hud-pill training">{t.training}</span>}
        <span className="hud-spacer" />
        {status !== 'live' && <span className="hud-pill paused" data-testid="live-status">{status === 'polling' ? t.reconnecting : status === 'offline' ? t.offline : t.updating}</span>}
        {round && (
          <button
            type="button"
            className="btn ghost"
            data-testid="toggle-dossiers"
            aria-pressed={showDossiers}
            onClick={() => setShowDossiers((open) => !open)}
          >
            {showDossiers ? t.hideDossiers : t.showDossiers}
          </button>
        )}
        <button type="button" className="btn ghost" aria-label={t.sound} data-testid="hud-sound" onClick={() => { unlockAudio(); setSoundEnabled(!sound); setSound(!sound) }}>{sound ? t.soundOn : t.soundOff}</button>
        <button type="button" className="btn ghost" onClick={() => void document.documentElement.requestFullscreen?.()}>{t.fullscreen}</button>
        <button type="button" className="btn ghost" data-testid="manage" onClick={() => setDrawer(true)}>{t.manage}</button>
      </header>

      {!round && (
        <Lobby
          view={view}
          phoneUrl={phoneUrl}
          startLabel={startLabel}
          onRelease={(org) => void post('release', { organizationId: org })}
          onStart={() => { unlockAudio(); void post('start') }}
        />
      )}

      {round && frame && (
        <>
          <div className="side side-left">
            <RolePanel panel={panel('carrier')} active={isActive('carrier')} ask={isAsk('carrier')} reveal={showDossiers} hiddenLabel={t.dossiersHidden} />
            {showDossiers && <EventsCard round={round} lang={view.language} />}
            {showDossiers && round.mode === 'with_bdi' && <RegistryCard round={round} lang={view.language} />}
            <RolePanel panel={panel('seller')} active={isActive('seller')} ask={isAsk('seller')} reveal={showDossiers} hiddenLabel={t.dossiersHidden} />
          </div>
          <div className="map-wrap">
            <MapView
              logistics={round.logistics}
              flights={reviewing ? [] : round.flights}
              serverNow={view.serverNow}
              paused={view.paused}
              lang={view.language}
              activeOrg={reviewing ? null : round.activeOrg}
            />
            {reviewing && (
              <div className="review-banner" data-testid="review-banner">
                <strong>{t.reviewBanner}</strong>
                <span>{reviewIndex + 1} / {history.length} · {history[reviewIndex].text}</span>
                <button type="button" className="btn" onClick={() => stepReview(-1)} aria-label="←">←</button>
                <button type="button" className="btn" onClick={() => stepReview(1)} aria-label="→">→</button>
                <button type="button" className="btn primary" onClick={closeReview}>{t.backToLive}</button>
              </div>
            )}
            {round.stepId === 'S00' && !reviewing ? (
              <Explainer
                key={`${round.id}-${round.introPhase}`}
                mode={round.mode}
                introPhase={round.introPhase}
                lang={view.language}
                onContinue={() => hostStep('continue')}
                onSkip={() => hostStep('skip')}
              />
            ) : (
              <QuestionCard
                round={round}
                frame={frame}
                lang={view.language}
                onNextRound={nextRound}
                nextRoundLabel={t.startWith}
                review={reviewing ? { org: ORGS.find((org) => org === history[reviewIndex].actorRole) ?? null, stepId: history[reviewIndex].stepId } : undefined}
              />
            )}
            {!reviewing && round.stepId !== 'S00' && round.stepId !== 'S20' && round.caption && <div className="map-caption"><Caption>{round.caption}</Caption></div>}
          </div>
          <div className="side side-right">
            <RolePanel panel={panel('delivery')} active={isActive('delivery')} ask={isAsk('delivery')} reveal={showDossiers} hiddenLabel={t.dossiersHidden} />
            <CommStrip round={round} comm={frame.comm} lang={view.language} />
            <RolePanel panel={panel('buyer')} active={isActive('buyer')} ask={isAsk('buyer')} reveal={showDossiers} hiddenLabel={t.dossiersHidden} />
          </div>
        </>
      )}

      {view.comparison && !hideComparison && <Comparison view={view} onClose={() => setHideComparison(true)} />}

      {drawer && (
        <ManageDrawer
          view={view}
          live={status}
          sound={sound}
          onSound={(on) => { unlockAudio(); setSoundEnabled(on); setSound(on) }}
          onAction={onAction}
          onReview={openReview}
          onLanguage={(language) => void post('language', { language })}
          onClose={() => setDrawer(false)}
        />
      )}
    </main>
  )
}
