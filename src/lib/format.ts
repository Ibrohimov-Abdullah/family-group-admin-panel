import type { Lang } from '../api/types'

/** 1234567 → "1 234 567". Uses a plain space so it never wraps oddly. */
export const num = (value: number) =>
  Math.round(value).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ')

export const money = (value: number, lang: Lang) => `${num(value)} ${lang === 'uz' ? "so'm" : 'сум'}`

/** Short money for charts and KPI tiles: 12.4 mln, 840 ming. */
export function moneyShort(value: number, lang: Lang): string {
  const abs = Math.abs(value)
  if (abs >= 1e9) return `${(value / 1e9).toFixed(1).replace('.0', '')} ${lang === 'uz' ? 'mlrd' : 'млрд'}`
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1).replace('.0', '')} ${lang === 'uz' ? 'mln' : 'млн'}`
  if (abs >= 1e3) return `${Math.round(value / 1e3)} ${lang === 'uz' ? 'ming' : 'тыс.'}`
  return num(value)
}

export const pct = (value: number) => `${Math.round(value * 100)}%`

export function delta(current: number, previous: number): number | null {
  if (!previous) return current ? null : 0
  return (current - previous) / previous
}

const two = (n: number) => String(n).padStart(2, '0')

const MONTHS: Record<Lang, string[]> = {
  uz: ['yan', 'fev', 'mar', 'apr', 'may', 'iyun', 'iyul', 'avg', 'sen', 'okt', 'noy', 'dek'],
  ru: ['янв', 'фев', 'мар', 'апр', 'мая', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'],
}

/** "19 okt", "6 sen 2027" — written by hand: browsers' uz-UZ dates are unreliable. */
export function date(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  const year = d.getFullYear() === new Date().getFullYear() ? '' : ` ${d.getFullYear()}`
  return `${d.getDate()} ${MONTHS[lang][d.getMonth()]}${year}`
}

/** Day + month label for chart axes: "19.10". */
export const dayLabel = (iso: string) => { const d = new Date(iso); return `${two(d.getDate())}.${two(d.getMonth() + 1)}` }

export function dateTime(iso: string | null | undefined, lang: Lang): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return `${date(iso, lang)}, ${two(d.getHours())}:${two(d.getMinutes())}`
}

export const time = (iso: string) => { const d = new Date(iso); return `${two(d.getHours())}:${two(d.getMinutes())}` }

/** "5 daq. oldin", "14:20", "Kecha", "3 okt". */
export function ago(iso: string, lang: Lang, t: (k: 'common.justNow' | 'common.minAgo' | 'common.hAgo' | 'common.yesterday', v?: Record<string, number>) => string): string {
  const diff = Date.now() - Date.parse(iso)
  const min = Math.floor(diff / 60_000)
  if (min < 1) return t('common.justNow')
  if (min < 60) return t('common.minAgo', { n: min })
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const t0 = today.getTime()
  const ts = Date.parse(iso)
  if (ts >= t0) return min < 6 * 60 ? t('common.hAgo', { n: Math.floor(min / 60) }) : time(iso)
  if (ts >= t0 - 86_400_000) return `${t('common.yesterday')}, ${time(iso)}`
  return date(iso, lang)
}

/** "+998 90 123 45 67" → "tel:+998901234567". */
export const telHref = (phone: string) => `tel:+${phone.replace(/\D/g, '')}`
export const waHref = (phone: string, text = '') => `https://wa.me/${phone.replace(/\D/g, '')}${text ? `?text=${encodeURIComponent(text)}` : ''}`
export const tgHref = (phone: string) => `https://t.me/+${phone.replace(/\D/g, '')}`

export const initials = (name: string) => name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase()

export const isoDay = (d = new Date()) => `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())}`
