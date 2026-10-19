import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react'
import { createPortal } from 'react-dom'
import { AlertTriangle, ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Inbox, X } from 'lucide-react'
import { useI18n } from '../lib/i18n'
import { ApiError } from '../api'
import { initials, num } from '../lib/format'
import type { DictKey } from '../lib/dict'

const cx = (...parts: (string | false | null | undefined)[]) => parts.filter(Boolean).join(' ')
export { cx }

/* ---------------------------------------------------------------- button */

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'gold' | 'danger'
  size?: 'sm' | 'md' | 'lg'
  icon?: ReactNode
  iconOnly?: boolean
  loading?: boolean
  block?: boolean
}

export function Button({ variant = 'secondary', size = 'md', icon, iconOnly, loading, block, className, children, disabled, type = 'button', ...rest }: ButtonProps) {
  return (
    <button
      type={type}
      className={cx('btn', `btn--${variant}`, size !== 'md' && `btn--${size}`, iconOnly && 'btn--icon', block && 'btn--block', loading && 'is-loading', className)}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {icon}
      {!iconOnly && children}
    </button>
  )
}

/* ---------------------------------------------------------------- fields */

export function Field({ label, hint, error, children, className, htmlFor }: { label?: ReactNode; hint?: ReactNode; error?: ReactNode; children: ReactNode; className?: string; htmlFor?: string }) {
  return (
    <div className={cx('field', className)}>
      {label && <label htmlFor={htmlFor}>{label}</label>}
      {children}
      {error ? <span className="field__error" role="alert">{error}</span> : hint ? <span className="field__hint">{hint}</span> : null}
    </div>
  )
}

export function Input({ className, size, ...rest }: Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & { size?: 'sm' }) {
  return <input className={cx('input', size === 'sm' && 'input--sm', className)} {...rest} />
}

export function Select({ className, size, children, ...rest }: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & { size?: 'sm' }) {
  return <select className={cx('select', size === 'sm' && 'select--sm', className)} {...rest}>{children}</select>
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cx('textarea', className)} {...rest} />
}

export function Switch({ checked, onChange, label, disabled }: { checked: boolean; onChange: (value: boolean) => void; label?: ReactNode; disabled?: boolean }) {
  return (
    <label className="switch" style={disabled ? { opacity: .55, cursor: 'not-allowed' } : undefined}>
      <input type="checkbox" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} role="switch" aria-checked={checked} />
      <span className="switch__track" aria-hidden="true" />
      {label && <span>{label}</span>}
    </label>
  )
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (value: T) => void; options: { value: T; label: ReactNode; count?: number; title?: string }[]; label?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const check = () => { el.dataset.overflow = String(el.scrollWidth > el.clientWidth + 1 && el.scrollLeft + el.clientWidth < el.scrollWidth - 4) }
    const ro = new ResizeObserver(check)
    ro.observe(el)
    el.addEventListener('scroll', check, { passive: true })
    check()
    return () => { ro.disconnect(); el.removeEventListener('scroll', check) }
  }, [options.length])
  return (
    <div ref={ref} className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={o.value === value} onClick={() => onChange(o.value)} title={o.title} aria-label={o.title}>
          {o.label}
          {o.count !== undefined && <span className="count">{num(o.count)}</span>}
        </button>
      ))}
    </div>
  )
}

export function Tabs<T extends string>({ value, onChange, tabs }: { value: T; onChange: (value: T) => void; tabs: { value: T; label: ReactNode }[] }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((tab) => (
        <button key={tab.value} type="button" role="tab" aria-selected={tab.value === value} onClick={() => onChange(tab.value)}>{tab.label}</button>
      ))}
    </div>
  )
}

/* ----------------------------------------------------------------- pills */

export function Pill({ tone, children, plain }: { tone?: string; children: ReactNode; plain?: boolean }) {
  return <span className={cx('pill', tone && `pill--${tone}`, plain && 'pill--plain')}>{children}</span>
}

export function StatusPill({ status }: { status: string }) {
  const { t } = useI18n()
  return <Pill tone={status}>{t(`orders.status.${status}` as DictKey)}</Pill>
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  return <span className={cx('avatar', large && 'avatar--lg')} aria-hidden="true">{initials(name)}</span>
}

export function Thumb({ src, alt = '', large, cosmetic }: { src: string; alt?: string; large?: boolean; cosmetic?: boolean }) {
  return (
    <span className={cx('thumb', large && 'thumb--lg', cosmetic && 'thumb--cos')}>
      <img src={src} alt={alt} loading="lazy" decoding="async" />
    </span>
  )
}

/* ---------------------------------------------------------------- panels */

export function Panel({ title, sub, actions, children, flush, footer, className }: { title?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; flush?: boolean; footer?: ReactNode; className?: string }) {
  return (
    <section className={cx('panel', flush && 'panel--flush', className)}>
      {(title || actions) && (
        <header className="panel__head">
          <div className="grow">
            {title && <h2 className="panel__title">{title}</h2>}
            {sub && <p className="panel__sub">{sub}</p>}
          </div>
          {actions}
        </header>
      )}
      <div className="panel__body">{children}</div>
      {footer && <footer className="panel__foot">{footer}</footer>}
    </section>
  )
}

export function PageHeader({ title, sub, actions }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-head">
      <div>
        <h1 className="page-title">{title}</h1>
        {sub && <p className="page-sub">{sub}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  )
}

/* ----------------------------------------------------- empty / loading */

export function EmptyState({ icon, title, text, action }: { icon?: ReactNode; title: ReactNode; text?: ReactNode; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__icon" aria-hidden="true">{icon ?? <Inbox />}</div>
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      {action}
    </div>
  )
}

export function Skeleton({ w = '100%', h = 14, r }: { w?: number | string; h?: number; r?: number }) {
  return <span className="skel" style={{ width: w, height: h, borderRadius: r }} aria-hidden="true" />
}

export function SkeletonRows({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div style={{ padding: '6px 0' }} aria-busy="true" aria-label="loading">
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} style={{ display: 'grid', gridTemplateColumns: `40px repeat(${cols - 1}, 1fr)`, gap: 16, alignItems: 'center', padding: '12px 16px', borderBottom: '1px solid var(--line)' }}>
          <Skeleton w={40} h={40} r={9} />
          {Array.from({ length: cols - 1 }, (_, c) => <Skeleton key={c} w={`${60 + ((r * 7 + c * 13) % 35)}%`} />)}
        </div>
      ))}
    </div>
  )
}

export function errorText(error: unknown, t: (k: DictKey) => string): string {
  if (error instanceof ApiError) {
    if (error.status === 0) return t('common.network')
    if (error.status === 403) return t('common.forbidden')
    if (error.status === 404) return t('common.notFound')
  }
  return t('common.error')
}

export function ErrorBox({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const { t } = useI18n()
  return (
    <div className="error-box" role="alert">
      <AlertTriangle size={18} />
      <span className="grow">{errorText(error, t)}</span>
      {onRetry && <Button size="sm" onClick={onRetry}>{t('common.retry')}</Button>}
    </div>
  )
}

/* ---------------------------------------------------------------- tables */

export interface Column<T> {
  key: string
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'right'
  sortable?: boolean
  className?: string
  hideSm?: boolean
  width?: number | string
}

export function DataTable<T>({ rows, columns, rowKey, onRowClick, selectedKey, sort, onSort, empty }: {
  rows: T[]
  columns: Column<T>[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  selectedKey?: string | null
  sort?: { key: string; dir: 'asc' | 'desc' }
  onSort?: (key: string) => void
  empty?: ReactNode
}) {
  if (!rows.length && empty) return <>{empty}</>
  return (
    <div className="table-wrap">
      <table className="table table--stack">
        <thead>
          <tr>
            {columns.map((c) => (
              <th key={c.key} className={cx(c.align === 'right' && 't-right', c.hideSm && 'hide-sm', c.className)} style={c.width ? { width: c.width } : undefined}
                aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}>
                {c.sortable && onSort ? (
                  <button type="button" onClick={() => onSort(c.key)}>
                    {c.header}
                    {sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp /> : <ArrowDown />)}
                  </button>
                ) : c.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const key = rowKey(row)
            return (
              <tr key={key} className={cx(onRowClick && 'is-clickable', selectedKey === key && 'is-selected')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter') onRowClick(row) } : undefined}
                tabIndex={onRowClick ? 0 : undefined}>
                {columns.map((c) => (
                  <td key={c.key} className={cx(c.align === 'right' && 't-right', c.hideSm && 'hide-sm', !c.header && 'cell-actions', c.className)}
                    data-label={typeof c.header === 'string' && c.header ? c.header : undefined}>{c.cell(row)}</td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function Pager({ page, pageSize, total, onPage }: { page: number; pageSize: number; total: number; onPage: (page: number) => void }) {
  const { t } = useI18n()
  if (total <= pageSize) return null
  const from = (page - 1) * pageSize + 1
  const to = Math.min(total, page * pageSize)
  return (
    <div className="pager">
      <span className="num">{t('common.page', { from: num(from), to: num(to), total: num(total) })}</span>
      <span className="right row">
        <Button size="sm" iconOnly icon={<ChevronLeft />} aria-label={t('common.prev')} disabled={page <= 1} onClick={() => onPage(page - 1)} />
        <Button size="sm" iconOnly icon={<ChevronRight />} aria-label={t('common.next')} disabled={to >= total} onClick={() => onPage(page + 1)} />
      </span>
    </div>
  )
}

/* -------------------------------------------------------- drawer & dialog */

function useEscape(onClose: () => void, active = true) {
  const ref = useRef(onClose)
  ref.current = onClose
  useEffect(() => {
    if (!active) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') ref.current() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [active])
}

function useBodyLock(active: boolean) {
  useEffect(() => {
    if (!active) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [active])
}

export function Drawer({ open, onClose, title, children, footer, wide }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const { t } = useI18n()
  const titleId = useId()
  const panelRef = useRef<HTMLDivElement>(null)
  useEscape(onClose, open)
  useBodyLock(open)
  useEffect(() => { if (open) panelRef.current?.focus() }, [open])
  if (!open) return null
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div ref={panelRef} className={cx('drawer', wide && 'drawer--wide')} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="drawer__head">
          <h2 id={titleId} className="drawer__title grow">{title}</h2>
          <Button variant="ghost" iconOnly icon={<X />} aria-label={t('common.close')} onClick={onClose} />
        </header>
        <div className="drawer__body">{children}</div>
        {footer && <footer className="drawer__foot">{footer}</footer>}
      </div>
    </>,
    document.body,
  )
}

export function ConfirmDialog({ open, title, text, confirmLabel, tone = 'primary', onConfirm, onClose, loading, children }: {
  open: boolean; title: ReactNode; text?: ReactNode; confirmLabel: ReactNode; tone?: 'primary' | 'danger'
  onConfirm: () => void; onClose: () => void; loading?: boolean; children?: ReactNode
}) {
  const { t } = useI18n()
  const titleId = useId()
  useEscape(onClose, open)
  useBodyLock(open)
  if (!open) return null
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className="dialog" role="alertdialog" aria-modal="true" aria-labelledby={titleId}>
        <h2 id={titleId}>{title}</h2>
        {text && <p>{text}</p>}
        {children && <div style={{ marginTop: 14 }}>{children}</div>}
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button>
          <Button variant={tone === 'danger' ? 'danger' : 'primary'} loading={loading} onClick={onConfirm} autoFocus>{confirmLabel}</Button>
        </div>
      </div>
    </>,
    document.body,
  )
}

/* ------------------------------------------------------------------ misc */

export function Delta({ value }: { value: number | null }) {
  if (value === null || !Number.isFinite(value)) return null
  const up = value >= 0
  return (
    <span className={cx('delta', up ? 'delta--up' : 'delta--down')}>
      {up ? <ArrowUp /> : <ArrowDown />}
      {Math.abs(Math.round(value * 100))}%
    </span>
  )
}
