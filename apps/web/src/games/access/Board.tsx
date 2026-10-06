import type { Lang } from '../../i18n'
import { BoxArt, ClipboardArt, ConnectorArt, TruckArt } from '../../art/icons'

type Check = { id: string; label: string; status: string; statusLabel: string }
type Flight = { id: string; kind: 'proof' | 'data'; from: string; to: string; label: string }
type Member = { organizationId: string; name: string; status: string }
type StepTrack = {
  phase: 'once' | 'repeat'
  onceLabel: string
  repeatLabel: string
  steps: { id: string; band: 'once' | 'repeat'; label: string; status: 'done' | 'active' | 'todo' }[]
}

export function AccessBoard({
  lang = 'nl',
  checks,
  flights = [],
  members = [],
  deltaActive = false,
  message,
  requestLabel,
  actor,
  stepTrack,
}: {
  lang?: Lang
  checks: Check[]
  flights?: Flight[]
  members?: Member[]
  deltaActive?: boolean
  message?: string | null
  requestLabel?: string | null
  actor?: string | null
  stepTrack?: StepTrack | null
}) {
  const titles = lang === 'nl'
    ? { assoc: 'Logistiek Association', infra: 'Ondersteunende infrastructuur', connector: 'BDI Connector' }
    : { assoc: 'Logistics Association', infra: 'Supporting infrastructure', connector: 'BDI Connector' }
  const onceSteps = stepTrack?.steps.filter((s) => s.band === 'once') ?? []
  const repeatSteps = stepTrack?.steps.filter((s) => s.band === 'repeat') ?? []

  return (
    <div className="access-board" data-testid="access-board">
      {stepTrack && (
        <div className={`access-phase-strip phase-${stepTrack.phase}`} data-testid="access-phase-strip">
          <div className={`access-phase-band${stepTrack.phase === 'once' ? ' is-active' : ''}`}>
            <span className="access-phase-label">{stepTrack.onceLabel}</span>
            <ol className="access-phase-steps">
              {onceSteps.map((step) => (
                <li key={step.id} className={`access-phase-step status-${step.status}`} data-testid={`phase-${step.id}`}>
                  {step.label}
                </li>
              ))}
            </ol>
          </div>
          <div className="access-phase-cut" aria-hidden="true" />
          <div className={`access-phase-band${stepTrack.phase === 'repeat' ? ' is-active' : ''}`}>
            <span className="access-phase-label">{stepTrack.repeatLabel}</span>
            <ol className="access-phase-steps">
              {repeatSteps.map((step) => (
                <li key={step.id} className={`access-phase-step status-${step.status}`} data-testid={`phase-${step.id}`}>
                  {step.label}
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}

      <svg viewBox="0 0 1100 700" className="access-svg" role="img" aria-label={titles.assoc}>
        <rect x="40" y="40" width="1020" height="520" rx="28" fill="#f4f7fa" stroke="#1b2a4a" strokeWidth="3" />
        <text x="70" y="85" fontSize="28" fontWeight="800" fill="#1b2a4a">{titles.assoc}</text>

        <g transform="translate(120,160)">
          <circle cx="48" cy="48" r="52" fill="#fff" stroke="#c46b2c" strokeWidth="4" />
          <g transform="translate(16,16) scale(1)"><BoxArt arrow="up" /></g>
          <text x="48" y="130" textAnchor="middle" fontSize="18" fontWeight="800" fill="#c46b2c">Atlas</text>
          <text x="48" y="152" textAnchor="middle" fontSize="14" fill="#4a5568">Data Owner</text>
        </g>

        <g transform="translate(480,150)">
          <circle cx="56" cy="56" r="60" fill="#fff" stroke="#6b4c9a" strokeWidth="4" />
          <g transform="translate(24,24)"><ConnectorArt /></g>
          <text x="56" y="140" textAnchor="middle" fontSize="18" fontWeight="800" fill="#6b4c9a">LogiData</text>
          <text x="56" y="162" textAnchor="middle" fontSize="14" fill="#4a5568">Data Service Provider</text>
          <rect x="20" y="175" width="72" height="28" rx="8" fill="#6b4c9a" />
          <text x="56" y="194" textAnchor="middle" fontSize="12" fontWeight="800" fill="#fff">{titles.connector}</text>
        </g>

        <g transform="translate(860,160)" opacity={deltaActive ? 1 : 0.45}>
          <circle cx="48" cy="48" r="52" fill="#fff" stroke="#2e7d4f" strokeWidth="4" strokeDasharray={deltaActive ? undefined : '6 6'} />
          <g transform="translate(16,16)"><TruckArt /></g>
          <text x="48" y="130" textAnchor="middle" fontSize="18" fontWeight="800" fill="#2e7d4f">Delta</text>
          <text x="48" y="152" textAnchor="middle" fontSize="14" fill="#4a5568">Data Consumer</text>
        </g>

        <g transform="translate(70,380)">
          <rect x="0" y="0" width="960" height="140" rx="18" fill="#e8eef5" stroke="#d8e0e8" strokeWidth="2" />
          <text x="24" y="36" fontSize="16" fontWeight="800" fill="#4a5568">{titles.infra}</text>
          <rect x="24" y="56" width="280" height="60" rx="12" fill="#fff" stroke="#1f6f8b" strokeWidth="2" />
          <text x="164" y="82" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1f6f8b">Association Register</text>
          <text x="164" y="102" textAnchor="middle" fontSize="12" fill="#4a5568">BVAD</text>
          <g transform="translate(40,62) scale(0.55)"><ClipboardArt /></g>

          <rect x="340" y="56" width="300" height="60" rx="12" fill="#fff" stroke="#1b2a4a" strokeWidth="2" />
          <text x="490" y="82" textAnchor="middle" fontSize="14" fontWeight="800" fill="#1b2a4a">Orchestration Registry</text>
          <text x="490" y="102" textAnchor="middle" fontSize="12" fill="#4a5568">BVOD</text>

          <g transform="translate(700,58)">
            <circle cx="28" cy="28" r="28" fill="#fff" stroke="#1f6f8b" strokeWidth="3" />
            <g transform="translate(-4,-4) scale(0.9)"><ClipboardArt /></g>
            <text x="70" y="24" fontSize="14" fontWeight="800" fill="#1f6f8b">Admin</text>
            <text x="70" y="44" fontSize="12" fill="#4a5568">Association Admin</text>
          </g>
        </g>

        {flights.map((flight, index) => {
          const y = 320 + index * 10
          if (flight.from === 'association-register') {
            return (
              <path key={flight.id} d={`M200 430 C 280 ${y}, 400 ${y}, 520 280`} fill="none" stroke="#56b8e6" strokeWidth="3" strokeDasharray="8 6" markerEnd="url(#arrow-sky)" />
            )
          }
          if (flight.from === 'orchestration-registry') {
            return (
              <path key={flight.id} d={`M490 430 C 520 ${y}, 530 ${y}, 540 280`} fill="none" stroke="#56b8e6" strokeWidth="3" strokeDasharray="8 6" />
            )
          }
          return (
            <path key={flight.id} d="M600 220 C 700 200, 780 200, 860 200" fill="none" stroke="#1b2a4a" strokeWidth="4" />
          )
        })}

        <defs>
          <marker id="arrow-sky" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill="#56b8e6" />
          </marker>
        </defs>
      </svg>

      <div className="access-checks" data-testid="access-checks">
        {checks.map((check) => (
          <div key={check.id} className={`access-check status-${check.status}`} data-testid={`check-${check.id}`}>
            <strong>{check.label}</strong>
            <span>{check.statusLabel}</span>
          </div>
        ))}
      </div>

      {(requestLabel || message) && (
        <div className="access-message" data-testid="access-message">
          {requestLabel && <strong>{requestLabel}</strong>}
          {message && <p>{message}</p>}
          {actor && <small>{lang === 'nl' ? `Aan zet: ${actor}` : `Turn: ${actor}`}</small>}
        </div>
      )}

      {members.length > 0 && (
        <ul className="access-members">
          {members.map((m) => <li key={m.organizationId}>{m.name} · {m.status}</li>)}
        </ul>
      )}
    </div>
  )
}
