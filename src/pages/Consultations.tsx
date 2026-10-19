import { useState } from 'react'
import { Check, MessageCircle, Phone, PhoneCall, PhoneOff, Send } from 'lucide-react'
import { api, type Consultation, type ConsultationStatus } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useQuery } from '../lib/query'
import { ago, telHref, tgHref, waHref } from '../lib/format'
import { Button, DataTable, EmptyState, ErrorBox, PageHeader, Pill, Segmented, SkeletonRows, Thumb, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type Filter = ConsultationStatus | 'all'
const TONE: Record<ConsultationStatus, string> = { new: 'new', called: 'info', no_answer: 'warning', done: 'success' }

export function ConsultationsPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const [filter, setFilter] = useState<Filter>('new')
  const all = useQuery('consultations:all', () => api.consultations.list({ status: 'all' }))
  const products = useQuery('products:all', () => api.products.list())
  const [busy, setBusy] = useState<string | null>(null)

  const list = (all.data ?? []).filter((c) => filter === 'all' || c.status === filter)
  const count = (s: ConsultationStatus) => (all.data ?? []).filter((c) => c.status === s).length

  const set = async (c: Consultation, status: ConsultationStatus) => {
    setBusy(c.id)
    try { await api.consultations.update(c.id, { status }); toast(t(`cons.status.${status}` as DictKey)); invalidate('consultations', 'inbox', 'badges') }
    catch (e) { toast(errorText(e, t), 'error') } finally { setBusy(null) }
  }

  const columns: Column<Consultation>[] = [
    { key: 'who', header: t('orders.customer'), cell: (c) => <div><span className="cell-strong">{c.name || t('cons.anonymous')}</span><a className="cell-sub num" href={telHref(c.phone)} onClick={(e) => e.stopPropagation()}>{c.phone}</a></div> },
    { key: 'channel', header: t('orders.source'), hideSm: true, cell: (c) => t(`cons.channel.${c.channel}` as DictKey) },
    { key: 'product', header: t('cons.product'), hideSm: true, cell: (c) => {
      const p = products.data?.find((x) => x.id === c.productId)
      return p ? <div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><span>{tx(p.name)}</span></div> : <span className="faint">{c.page}</span>
    } },
    { key: 'when', header: t('common.date'), cell: (c) => <span className="nowrap">{ago(c.createdAt, lang, t)}</span> },
    { key: 'status', header: t('common.status'), cell: (c) => <div><Pill tone={TONE[c.status]}>{t(`cons.status.${c.status}` as DictKey)}</Pill>{c.handledBy && <span className="cell-sub">{c.handledBy}</span>}{c.note && <span className="cell-sub">{c.note}</span>}</div> },
    { key: 'act', header: '', align: 'right', cell: (c) => (
      <div className="row" style={{ justifyContent: 'flex-end', gap: 6 }}>
        <a className="btn btn--secondary btn--sm btn--icon" href={telHref(c.phone)} aria-label={t('common.call')}><Phone /></a>
        <a className="btn btn--secondary btn--sm btn--icon hide-sm" href={tgHref(c.phone)} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><Send /></a>
        <a className="btn btn--secondary btn--sm btn--icon hide-sm" href={waHref(c.phone)} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>
        {c.status !== 'done' && <>
          <Button size="sm" iconOnly icon={<PhoneOff />} aria-label={t('cons.markNoAnswer')} title={t('cons.markNoAnswer')} disabled={busy === c.id} onClick={() => void set(c, 'no_answer')} />
          <Button size="sm" iconOnly icon={<PhoneCall />} aria-label={t('cons.markCalled')} title={t('cons.markCalled')} disabled={busy === c.id} onClick={() => void set(c, 'called')} />
          <Button size="sm" variant="primary" icon={<Check />} loading={busy === c.id} onClick={() => void set(c, 'done')}>{t('cons.markDone')}</Button>
        </>}
      </div>
    ) },
  ]

  return (
    <div>
      <PageHeader title={t('cons.title')} sub={t('cons.sub')} />
      <div className="panel">
        <div className="panel__head">
          <Segmented<Filter> value={filter} onChange={setFilter} label={t('common.status')} options={[
            { value: 'new', label: t('cons.status.new'), count: count('new') },
            { value: 'no_answer', label: t('cons.status.no_answer'), count: count('no_answer') },
            { value: 'called', label: t('cons.status.called'), count: count('called') },
            { value: 'done', label: t('cons.status.done'), count: count('done') },
            { value: 'all', label: t('common.all'), count: all.data?.length },
          ]} />
        </div>
        {all.error ? <div className="panel__body"><ErrorBox error={all.error} onRetry={all.refetch} /></div>
          : all.loading && !all.data ? <SkeletonRows rows={6} cols={5} />
          : <DataTable rows={list} columns={columns} rowKey={(c) => c.id} empty={<EmptyState icon={<PhoneCall />} title={t('cons.empty')} text={t('cons.emptyText')} />} />}
      </div>
    </div>
  )
}
