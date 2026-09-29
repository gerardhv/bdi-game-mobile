import { useEffect, useState, type ReactNode } from 'react'
import QRCode from 'qrcode'
import { phoneBase } from './api'
import {
  BellIcon, CheckBadge, ClockIcon, CrossBadge, DriverPortrait, isDriver, ProductIcon, RoleIcon, type Org,
} from './art/icons'

export function Qr({ path }: { path: string }) {
  const [href, setHref] = useState('')
  const [svg, setSvg] = useState('')
  useEffect(() => {
    let stop = false
    void phoneBase().then((base) => {
      if (stop) return
      const next = `${base}/${path.replace(/^\//, '')}`
      setHref(next)
      void QRCode.toString(next, { type: 'svg', margin: 3, width: 320, color: { dark: '#1b2a4a', light: '#ffffff' } }).then((image) => {
        if (!stop) setSvg(image)
      })
    })
    return () => { stop = true }
  }, [path])
  return <div className="qr" data-join-url={href} dangerouslySetInnerHTML={{ __html: svg }} />
}

export function Wordmark({ light = false }: { light?: boolean }) {
  const text = light ? '#ffffff' : '#1b2a4a'
  return (
    <svg className="wordmark" viewBox="0 0 250 64" role="img" aria-label="BDI Game">
      <g transform="translate(2 4)">
        <path d="M4 18 28 7l24 11v26L28 56 4 44Z" fill="#c9905a" />
        <path d="M28 29v27L4 44V18Z" fill="#b57a45" />
        <path d="M4 18 28 29l24-11L28 7Z" fill="#dca774" />
        <circle cx="42" cy="12" r="10" fill="#f2c230" stroke="#fff" strokeWidth="3" />
        <path d="M37 12h10M42 7v10" stroke="#1b2a4a" strokeWidth="3" strokeLinecap="round" />
      </g>
      <text x="64" y="44" fontFamily="'Nunito Variable', Nunito, sans-serif" fontWeight="900" fontSize="38" fill={text}>BDI</text>
      <text x="140" y="44" fontFamily="'Nunito Variable', Nunito, sans-serif" fontWeight="800" fontSize="38" fill="#4aa3e8">Game</text>
    </svg>
  )
}

export function timeOf(label: string): string | null {
  return label.match(/(\d{1,2}:\d{2})/)?.[1] ?? null
}

export function OptionArt({ id, label }: { id: string; label: string }) {
  if (isDriver(id)) return <DriverPortrait id={id} />
  if (['camera', 'phone', 'television'].includes(id)) return <ProductIcon id={id} />
  if (id === 'subscribe') return <BellIcon />
  const time = timeOf(label)
  if (time) return <ClockIcon time={time} />
  return null
}

export type TileState = 'neutral' | 'selected' | 'available' | 'wrong' | 'ok' | 'pending'

export function Tile({
  id, label, state = 'neutral', note, onClick, disabled, testId,
}: {
  id: string
  label: string
  state?: TileState
  note?: string | null
  onClick?: () => void
  disabled?: boolean
  testId?: string
}) {
  const art = <OptionArt id={id} label={label} />
  const body: ReactNode = (
    <>
      {art && <span className="tile-art">{art}</span>}
      <span className="tile-label">{label}</span>
      {note && <span className="tile-note">{note}</span>}
      {(state === 'selected' || state === 'ok') && <CheckBadge className="badge" />}
      {state === 'wrong' && <CrossBadge className="badge" />}
    </>
  )
  const className = `tile is-${state}`
  if (!onClick) return <div className={className} data-testid={testId}>{body}</div>
  return (
    <button type="button" className={className} data-testid={testId} onClick={onClick} disabled={disabled} aria-pressed={state === 'selected'}>
      {body}
    </button>
  )
}

export function Caption({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`caption ${className}`} role="status" aria-live="polite">{children}</p>
}

export function RoleBadge({ org, className }: { org: Org; className?: string }) {
  return <RoleIcon org={org} className={className} />
}

const PRODUCT_BY_NAME: Record<string, string> = {
  camera: 'camera', telefoon: 'phone', phone: 'phone', televisie: 'television', television: 'television',
}

const DRIVER_BY_NAME: Record<string, string> = {
  'Noor Bakker': 'carrier-noor',
  'Jamal de Vries': 'carrier-jamal',
  'Lin Vos': 'carrier-lin',
  'Sara Mendes': 'delivery-sara',
  'Otto Klein': 'delivery-otto',
  'Mina Rahimi': 'delivery-mina',
}

export function FactArt({ label, value }: { label: string; value: string }) {
  const product = PRODUCT_BY_NAME[value.toLowerCase()]
  if (product) return <ProductIcon id={product} />
  const driver = DRIVER_BY_NAME[value]
  if (driver) return <DriverPortrait id={driver} />
  const time = timeOf(value)
  if (time) return <ClockIcon time={time} />
  if (/eta/i.test(label)) return <ClockIcon time="12:00" />
  return <FolderGlyph />
}

function FolderGlyph() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <path d="M6 18c0-3 2-5 5-5h14l6 6h22c3 0 5 2 5 5v24c0 3-2 5-5 5H11c-3 0-5-2-5-5Z" fill="#9aa3b2" />
      <path d="M6 26h52v22c0 3-2 5-5 5H11c-3 0-5-2-5-5Z" fill="#c3c9d3" />
    </svg>
  )
}

export function FactRow({ fact }: { fact: { label: string; value: string; status?: string; statusLabel: string } }) {
  return (
    <div className={`fact st-${fact.status ?? 'source'}`}>
      <FactArt label={fact.label} value={fact.value} />
      <strong>{fact.label}: {fact.value}</strong>
      <em>{fact.statusLabel}</em>
    </div>
  )
}
