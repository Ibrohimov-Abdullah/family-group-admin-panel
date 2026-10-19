import { useLayoutEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react'

/**
 * Hand-built SVG charts: no chart library, drawn from data at runtime,
 * coloured from the design tokens. Hover shows a tooltip on the nearest point.
 */

/** Draw at the container's real width so labels stay at their CSS size on every screen. */
function useWidth(ref: RefObject<HTMLDivElement | null>, fallback = 640) {
  const [width, setWidth] = useState(fallback)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(() => setWidth(Math.max(240, Math.round(el.clientWidth))))
    ro.observe(el)
    setWidth(Math.max(240, Math.round(el.clientWidth || fallback)))
    return () => ro.disconnect()
  }, [ref, fallback])
  return width
}

function niceMax(value: number): number {
  if (value <= 0) return 1
  const exp = 10 ** Math.floor(Math.log10(value))
  const f = value / exp
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * exp
}

export function AreaChart({ values, labels, height = 220, format, tip }: {
  values: number[]
  labels: string[]
  height?: number
  format: (v: number) => string
  tip?: (i: number) => ReactNode
}) {
  const [hover, setHover] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box)
  const pad = { l: 52, r: 12, t: 12, b: 26 }
  const max = niceMax(Math.max(...values, 1))
  const n = values.length
  const x = (i: number) => pad.l + (n <= 1 ? 0 : (i / (n - 1)) * (W - pad.l - pad.r))
  const y = (v: number) => pad.t + (1 - v / max) * (height - pad.t - pad.b)
  const line = values.map((v, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(n - 1)} ${height - pad.b} L${x(0)} ${height - pad.b} Z`
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 90))))

  const onMove = (e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect()
    if (!rect) return
    const px = ((e.clientX - rect.left) / rect.width) * W
    const i = Math.round(((px - pad.l) / (W - pad.l - pad.r)) * (n - 1))
    setHover(Math.max(0, Math.min(n - 1, i)))
  }

  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg ref={ref} className="chart" viewBox={`0 0 ${W} ${height}`} width={W} height={height} onPointerMove={onMove} onPointerLeave={() => setHover(null)} role="img">
        <defs>
          <linearGradient id="area-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--series-1)" stopOpacity=".28" />
            <stop offset="1" stopColor="var(--series-1)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g className="grid">
          {ticks.map((v) => <line key={v} x1={pad.l} x2={W - pad.r} y1={y(v)} y2={y(v)} />)}
        </g>
        {ticks.map((v) => <text key={v} x={pad.l - 8} y={y(v) + 3.5} textAnchor="end">{format(v)}</text>)}
        {labels.map((label, i) => (i === n - 1 || (i % every === 0 && n - 1 - i >= Math.ceil(every * 0.75))) ? (
          <text key={i} x={x(i)} y={height - 8} textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}>{label}</text>
        ) : null)}
        <path d={area} fill="url(#area-fill)" />
        <path d={line} fill="none" stroke="var(--series-1)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={pad.t} y2={height - pad.b} stroke="var(--line-2)" />
            <circle cx={x(hover)} cy={y(values[hover])} r="5" fill="var(--panel)" stroke="var(--series-1)" strokeWidth="2.5" />
          </g>
        )}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${(x(hover) / W) * 100}%`, top: `${(y(values[hover]) / height) * 100}%` }}>
          {tip ? tip(hover) : <><b>{format(values[hover])}</b>{labels[hover]}</>}
        </div>
      )}
    </div>
  )
}

export function StackedBars({ series, labels, colors, height = 200, names }: {
  series: number[][]
  labels: string[]
  colors: string[]
  names: string[]
  height?: number
}) {
  const [hover, setHover] = useState<number | null>(null)
  const box = useRef<HTMLDivElement>(null)
  const W = useWidth(box, 360)
  const pad = { l: 30, r: 8, t: 10, b: 24 }
  const n = labels.length
  const totals = labels.map((_, i) => series.reduce((s, row) => s + (row[i] ?? 0), 0))
  const max = niceMax(Math.max(...totals, 1))
  const bw = (W - pad.l - pad.r) / n
  const y = (v: number) => (v / max) * (height - pad.t - pad.b)
  const every = Math.max(1, Math.ceil(n / Math.max(3, Math.floor(W / 70))))
  return (
    <div ref={box} style={{ position: 'relative' }}>
      <svg className="chart" viewBox={`0 0 ${W} ${height}`} width={W} height={height} role="img" onPointerLeave={() => setHover(null)}>
        <g className="grid">{[0.5, 1].map((f) => <line key={f} x1={pad.l} x2={W - pad.r} y1={height - pad.b - y(f * max)} y2={height - pad.b - y(f * max)} />)}</g>
        {[0, 0.5, 1].map((f) => <text key={f} x={pad.l - 6} y={height - pad.b - y(f * max) + 3.5} textAnchor="end">{Math.round(f * max)}</text>)}
        {labels.map((label, i) => {
          let acc = 0
          return (
            <g key={i} onPointerEnter={() => setHover(i)}>
              <rect x={pad.l + i * bw} y={pad.t} width={bw} height={height - pad.t - pad.b} fill="transparent" />
              {series.map((row, s) => {
                const h = y(row[i] ?? 0)
                acc += h
                return <rect key={s} x={pad.l + i * bw + bw * 0.18} width={bw * 0.64} y={height - pad.b - acc} height={Math.max(0, h - (h > 2 ? 1 : 0))} rx="2" fill={colors[s]} opacity={hover === null || hover === i ? 1 : 0.45} />
              })}
              {(i === n - 1 || (i % every === 0 && n - 1 - i >= Math.ceil(every * 0.75))) && <text x={pad.l + i * bw + bw / 2} y={height - 7} textAnchor="middle">{label}</text>}
            </g>
          )
        })}
      </svg>
      {hover !== null && (
        <div className="chart-tip" style={{ left: `${((pad.l + hover * bw + bw / 2) / W) * 100}%`, top: `${((height - pad.b - y(totals[hover])) / height) * 100}%` }}>
          <b>{labels[hover]}</b>
          {names.map((name, s) => <div key={name}>{name}: {series[s][hover]}</div>)}
        </div>
      )}
    </div>
  )
}

export function Donut({ parts, size = 150, center }: { parts: { value: number; color: string; label: string }[]; size?: number; center?: ReactNode }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  const r = 15.9155
  let offset = 25
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg viewBox="0 0 42 42" width={size} height={size} role="img">
        <circle cx="21" cy="21" r={r} fill="none" stroke="var(--panel-2)" strokeWidth="6" />
        {parts.map((p) => {
          const len = (p.value / total) * 100
          const el = <circle key={p.label} cx="21" cy="21" r={r} fill="none" stroke={p.color} strokeWidth="6" strokeDasharray={`${Math.max(0, len - 0.6)} ${100 - len + 0.6}`} strokeDashoffset={offset}><title>{p.label}</title></circle>
          offset -= len
          return el
        })}
      </svg>
      {center && <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', textAlign: 'center' }}>{center}</div>}
    </div>
  )
}

export function Sparkline({ values, color = 'var(--series-1)', className }: { values: number[]; color?: string; className?: string }) {
  const path = useMemo(() => {
    const max = Math.max(...values, 1)
    const n = values.length
    return values.map((v, i) => `${i ? 'L' : 'M'}${((i / Math.max(1, n - 1)) * 100).toFixed(1)} ${(28 - (v / max) * 26).toFixed(1)}`).join(' ')
  }, [values])
  return (
    <svg className={className} viewBox="0 0 100 30" preserveAspectRatio="none" aria-hidden="true">
      <path d={path} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}

export function BarList({ rows }: { rows: { label: ReactNode; value: number; display: ReactNode; color?: string }[] }) {
  const max = Math.max(...rows.map((r) => r.value), 1)
  return (
    <div className="bar-list">
      {rows.map((row, i) => (
        <div key={i} className="bar-row">
          <span className="ellipsis">{row.label}</span>
          <b className="num">{row.display}</b>
          <div className="bar-row__track"><div className="bar-row__fill" style={{ width: `${(row.value / max) * 100}%`, background: row.color }} /></div>
        </div>
      ))}
    </div>
  )
}
