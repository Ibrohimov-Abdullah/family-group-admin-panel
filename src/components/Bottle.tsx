import { useId } from 'react'

/**
 * Stock drawn as an apothecary bottle filling up — the admin's signature.
 * `level` is 0..1. Amber glass for supplements, dark jar for cosmetics.
 */
export function BottleGlass({ level, tone = 'ok', cosmetic }: { level: number; tone?: 'ok' | 'low' | 'out'; cosmetic?: boolean }) {
  const id = useId().replace(/:/g, '')
  const clamp = Math.max(0, Math.min(1, level))
  const fill = tone === 'out' ? 'transparent' : tone === 'low' ? 'var(--warning)' : cosmetic ? '#3A2D21' : 'var(--gold-deep)'
  // jar for cosmetics, bottle for supplements
  const body = cosmetic
    ? 'M6 26 Q6 22 10 22 H36 Q40 22 40 26 V58 Q40 62 36 62 H10 Q6 62 6 58 Z'
    : 'M15 14 H31 V19 Q38 21 38 29 V58 Q38 62 34 62 H12 Q8 62 8 58 V29 Q8 21 15 19 Z'
  const top = cosmetic ? 'M8 14 H38 V22 H8 Z' : 'M14 4 H32 V14 H14 Z'
  const innerTop = cosmetic ? 24 : 22
  const innerBottom = 60
  const fillY = innerBottom - (innerBottom - innerTop) * clamp
  return (
    <svg className="bottle__glass" viewBox="0 0 46 64" aria-hidden="true">
      <defs>
        <clipPath id={`c${id}`}><path d={body} /></clipPath>
        <linearGradient id={`s${id}`} x1="0" x2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".0" />
          <stop offset=".22" stopColor="#fff" stopOpacity=".45" />
          <stop offset=".34" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={top} fill={cosmetic ? '#C9A867' : '#F4EFE6'} stroke="var(--line-2)" strokeWidth="1" />
      <path d={body} fill="var(--panel-2)" />
      <g clipPath={`url(#c${id})`}>
        <rect x="0" y={fillY} width="46" height={64 - fillY} fill={fill} opacity={cosmetic ? 0.9 : 0.85} style={{ transition: 'y .4s var(--ease), height .4s var(--ease)' }} />
        {clamp > 0.04 && <rect x="0" y={fillY} width="46" height="1.4" fill="#fff" opacity=".35" />}
        <rect x="0" y="0" width="46" height="64" fill={`url(#s${id})`} />
      </g>
      <path d={body} fill="none" stroke={tone === 'out' ? 'var(--danger)' : 'var(--line-2)'} strokeWidth="1.2" strokeDasharray={tone === 'out' ? '3 2' : undefined} />
      {!cosmetic && <rect x="11" y="34" width="24" height="14" rx="1.5" fill="#FBF6EC" opacity=".92" />}
    </svg>
  )
}
