import type { CSSProperties } from 'react'
import { RoleIcon, type Org } from '../art/icons'
import { FactRow } from '../ui'
import type { Panel } from '../types'

export function RolePanel({
  panel, active, ask, reveal = false, hiddenLabel,
}: {
  panel: Panel | undefined
  active: boolean
  ask: boolean
  reveal?: boolean
  hiddenLabel?: string
}) {
  if (!panel) return null
  const org: Org = panel.organizationId
  return (
    <article
      className={`role-panel${active || ask ? ' is-active' : ''}${reveal ? '' : ' is-sealed'}`}
      style={{ '--role': `var(--${org})` } as CSSProperties}
      data-testid={`panel-${org}`}
      aria-label={`${panel.roleLabel} — ${panel.name}`}
    >
      <header>
        <RoleIcon org={org} />
        <div>
          <h3>{panel.roleLabel}</h3>
          <small>{panel.name}</small>
        </div>
        <span className="activity">{panel.activity}</span>
      </header>
      {reveal ? (
        <div className="facts">
          {panel.items.map((item) => <FactRow key={`${item.label}-${item.value}-${item.status}`} fact={item} />)}
        </div>
      ) : (
        <p className="dossier-sealed">{hiddenLabel}</p>
      )}
    </article>
  )
}
