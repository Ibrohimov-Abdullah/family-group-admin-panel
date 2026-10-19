import { useState } from 'react'
import { AlertTriangle, Check, MessageSquareQuote, ShieldCheck, Star } from 'lucide-react'
import { api, type Review, type ReviewStatus } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useQuery } from '../lib/query'
import { date } from '../lib/format'
import { Button, EmptyState, ErrorBox, PageHeader, Pill, Segmented, Skeleton, Thumb, errorText } from '../components/ui'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type Filter = ReviewStatus | 'all'
const TONE: Record<ReviewStatus, string> = { pending: 'warning', approved: 'success', rejected: 'danger' }

export function ReviewsPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('pending')
  const reviews = useQuery('reviews:all', () => api.reviews.list({ status: 'all' }))
  const products = useQuery('products:all', () => api.products.list())
  const [busy, setBusy] = useState<string | null>(null)
  const list = (reviews.data ?? []).filter((r) => filter === 'all' || r.status === filter)
  const count = (s: ReviewStatus) => (reviews.data ?? []).filter((r) => r.status === s).length

  const act = async (r: Review, status: ReviewStatus) => {
    setBusy(r.id)
    try { await api.reviews.setStatus(r.id, status); toast(t(status === 'approved' ? 'rev.approved' : 'rev.rejected')); invalidate('reviews', 'inbox', 'badges') }
    catch (e) { toast(errorText(e, t), 'error') } finally { setBusy(null) }
  }

  return (
    <div>
      <PageHeader title={t('rev.title')} sub={t('rev.sub')} />
      <div className="row" style={{ marginBottom: 'var(--gap)' }}>
        <Segmented<Filter> value={filter} onChange={setFilter} options={[
          { value: 'pending', label: t('rev.status.pending'), count: count('pending') },
          { value: 'approved', label: t('rev.status.approved'), count: count('approved') },
          { value: 'rejected', label: t('rev.status.rejected'), count: count('rejected') },
          { value: 'all', label: t('common.all'), count: reviews.data?.length },
        ]} />
      </div>
      {reviews.error ? <ErrorBox error={reviews.error} onRetry={reviews.refetch} />
        : !reviews.data ? <div className="grid-2">{[0, 1, 2, 3].map((i) => <Skeleton key={i} h={180} r={14} />)}</div>
        : list.length === 0 ? <div className="panel"><EmptyState icon={<MessageSquareQuote />} title={t('rev.empty')} /></div>
        : (
          <div className="grid-2">
            {list.map((r) => {
              const p = products.data?.find((x) => x.id === r.productId)
              return (
                <article key={r.id} className="panel">
                  <div className="panel__body stack-sm">
                    <div className="row">
                      {p && <Thumb src={p.image} cosmetic={p.line === 'cosmetic'} />}
                      <div className="grow" style={{ minWidth: 0 }}>
                        <b>{r.name}</b> <span className="faint">· {r.city}</span>
                        <div className="faint" style={{ fontSize: 12 }}>{p ? tx(p.name) : ''} · {date(r.createdAt, lang)}</div>
                      </div>
                      <Pill tone={TONE[r.status]}>{t(`rev.status.${r.status}` as DictKey)}</Pill>
                    </div>
                    <div className="row" style={{ color: 'var(--gold-deep)', gap: 2 }} aria-label={`${r.rating}/5`}>
                      {Array.from({ length: 5 }, (_, i) => <Star key={i} size={15} fill={i < r.rating ? 'currentColor' : 'none'} />)}
                    </div>
                    <p style={{ fontSize: 14, lineHeight: 1.6 }}>{r.text}</p>
                    <div className="row" style={{ fontSize: 12.5, fontWeight: 700, color: r.consent ? 'var(--success)' : 'var(--danger)' }}>
                      {r.consent ? <ShieldCheck size={15} /> : <AlertTriangle size={15} />}
                      {r.consent ? `${t('rev.consentYes')} · ${r.consentRef}` : t('rev.consentNo')}
                    </div>
                    {r.status === 'pending' && (
                      <div className="row-wrap" style={{ marginTop: 6 }}>
                        <Button size="sm" variant="primary" icon={<Check />} disabled={!r.consent} loading={busy === r.id} onClick={() => void act(r, 'approved')}>{t('rev.approve')}</Button>
                        <Button size="sm" variant="danger" disabled={busy === r.id} onClick={() => void act(r, 'rejected')}>{t('rev.reject')}</Button>
                      </div>
                    )}
                    {r.status !== 'pending' && <Button size="sm" variant="ghost" style={{ justifySelf: 'start' }} onClick={() => void act(r, r.status === 'approved' ? 'rejected' : 'approved')} disabled={r.status === 'rejected' && !r.consent}>{r.status === 'approved' ? t('rev.reject') : t('rev.approve')}</Button>}
                  </div>
                </article>
              )
            })}
          </div>
        )}
    </div>
  )
}
