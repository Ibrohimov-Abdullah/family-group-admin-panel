import { useMemo, useState, type ReactNode } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { AlertTriangle, ArrowLeft, Boxes, ClipboardList, FileBadge, MessageSquareQuote, PhoneCall, PhoneOff, Check, Star, Send, MessageCircle, Phone } from 'lucide-react'
import { api, type InboxItem, type InboxKind } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { ago, date, money, moneyShort, num, telHref, tgHref, waHref } from '../lib/format'
import { Button, Delta, EmptyState, ErrorBox, Field, Input, Panel, Pill, Segmented, Skeleton, Textarea, Thumb, cx, errorText } from '../components/ui'
import { Sparkline } from '../components/charts'
import { OrderDetail } from '../components/OrderDetail'
import { BottleGlass } from '../components/Bottle'
import { useAuth } from '../components/Auth'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type Filter = 'all' | InboxKind
const ICON: Record<InboxKind, ReactNode> = {
  order: <ClipboardList />, consultation: <PhoneCall />, stock: <Boxes />, review: <MessageSquareQuote />, certificate: <FileBadge />,
}

export function InboxPage() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const { data: items, error, loading, refetch } = useQuery('inbox', () => api.inbox.list(), { refreshMs: 30_000 })
  const { data: dash } = useQuery('dashboard:30d', () => api.dashboard.get('30d'))
  const open = params.get('item')

  const counts = useMemo(() => {
    const c: Record<Filter, number> = { all: 0, order: 0, consultation: 0, stock: 0, review: 0, certificate: 0 }
    for (const i of items ?? []) { c.all += 1; c[i.kind] += 1 }
    return c
  }, [items])
  const visible = (items ?? []).filter((i) => filter === 'all' || i.kind === filter)
  const unseen = (items ?? []).filter((i) => i.lit).length
  const openItem = items?.find((i) => `${i.kind}:${i.id}` === open) ?? null

  const select = (item: InboxItem | null) => {
    const next = new URLSearchParams(params)
    if (item) next.set('item', `${item.kind}:${item.id}`)
    else next.delete('item')
    setParams(next, { replace: !item })
  }

  const today = dash ? dash.revenue.series.at(-1) ?? 0 : 0
  const yesterday = dash ? dash.revenue.series.at(-2) ?? 0 : 0
  const todayOrders = dash ? dash.orders.series.at(-1) ?? 0 : 0
  const alerts = dash ? dash.queue.lowStock + dash.queue.expiringCertificates : 0

  return (
    <div>
      <header className="page-head">
        <div>
          <h1 className="page-title">{user ? t('inbox.greeting', { name: user.name.split(' ')[0] }) : t('inbox.title')}</h1>
          <p className="page-sub">{t('inbox.sub')}</p>
        </div>
      </header>

      <div className="kpis" aria-label={t('nav.dashboard')}>
        <Kpi label={t('inbox.today')} value={dash ? moneyShort(today, lang) : null} unit={lang === 'uz' ? "so'm" : 'сум'}
          foot={dash && <><Delta value={yesterday ? (today - yesterday) / yesterday : null} /> {t('common.yesterday').toLowerCase()}: {moneyShort(yesterday, lang)}</>}
          spark={dash?.revenue.series.slice(-14)} />
        <Kpi label={t('inbox.todayOrders')} value={dash ? num(todayOrders) : null}
          foot={dash && <span className="row-wrap" style={{ gap: '2px 10px' }}><span className="nowrap">{t('orders.status.new')}: <b className="num">{dash.queue.newOrders}</b></span><span className="nowrap">{t('orders.status.confirmed')}: <b className="num">{dash.queue.toPack}</b></span></span>}
          spark={dash?.orders.series.slice(-14)} />
        <Kpi label={t('inbox.avg')} value={dash ? moneyShort(dash.averageOrder.value, lang) : null} unit={lang === 'uz' ? "so'm" : 'сум'}
          foot={dash && <><Delta value={dash.averageOrder.previous ? (dash.averageOrder.value - dash.averageOrder.previous) / dash.averageOrder.previous : null} /> {t('common.vsPrev')}</>} />
        <Kpi label={t('inbox.alerts')} value={dash ? num(alerts) : null} foot={<>{t('inbox.alertsSub')}</>} tone={alerts ? 'warning' : undefined} />
      </div>

      <div className={cx('inbox', openItem && 'has-open')}>
        <section className="panel queue" aria-label={t('inbox.title')}>
          <div className="queue__filters">
            <div className="row" style={{ marginBottom: 10 }}>
              <h2 className="panel__title grow">{t('inbox.title')}</h2>
              {unseen > 0 && <Pill tone="gold">{t('inbox.unseen', { n: unseen })}</Pill>}
            </div>
            <Segmented<Filter> value={filter} onChange={setFilter} label={t('inbox.title')} options={[
              { value: 'all', label: t('inbox.fAll'), count: counts.all },
              { value: 'order', label: <ClipboardList />, count: counts.order, title: t('inbox.fOrders') },
              { value: 'consultation', label: <PhoneCall />, count: counts.consultation, title: t('inbox.fRequests') },
              { value: 'stock', label: <Boxes />, count: counts.stock, title: t('inbox.fStock') },
              { value: 'review', label: <MessageSquareQuote />, count: counts.review, title: t('inbox.fReviews') },
              ...(counts.certificate ? [{ value: 'certificate' as const, label: <FileBadge />, count: counts.certificate, title: t('inbox.fDocs') }] : []),
            ]} />
          </div>
          <div className="queue__list">
            {error ? <div style={{ padding: 14 }}><ErrorBox error={error} onRetry={refetch} /></div>
              : loading && !items ? Array.from({ length: 7 }, (_, i) => (
                <div key={i} className="qitem" aria-hidden="true"><Skeleton w={36} h={36} r={10} /><div className="stack-sm"><Skeleton w="70%" /><Skeleton w="45%" h={11} /></div><Skeleton w={44} h={11} /></div>
              ))
              : visible.length === 0 ? <EmptyState icon={<Check />} title={t('inbox.empty')} text={t('inbox.emptyText')} />
              : visible.map((item) => <QueueRow key={`${item.kind}:${item.id}`} item={item} open={open === `${item.kind}:${item.id}`} onOpen={() => select(item)} />)}
          </div>
        </section>

        <section className="panel detail" aria-live="polite">
          {openItem ? (
            <div className="panel__body">
              <Button variant="ghost" size="sm" icon={<ArrowLeft />} className="mobile-only" style={{ marginBottom: 10 }} onClick={() => select(null)}>{t('inbox.title')}</Button>
              {openItem.kind === 'order' && <OrderDetail orderId={openItem.id} compact />}
              {openItem.kind === 'consultation' && <ConsultationAction id={openItem.id} />}
              {openItem.kind === 'stock' && <StockAction productId={Number(openItem.id)} />}
              {openItem.kind === 'review' && <ReviewAction id={openItem.id} />}
              {openItem.kind === 'certificate' && <CertificateAction id={openItem.id} />}
            </div>
          ) : (
            <div className="detail__empty"><EmptyState icon={<ClipboardList />} title={t('inbox.pick')} text={t('inbox.pickText')} /></div>
          )}
        </section>
      </div>
    </div>
  )
}

function Kpi({ label, value, unit, foot, spark, tone }: { label: string; value: string | null; unit?: string; foot?: ReactNode; spark?: number[]; tone?: 'warning' }) {
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value" style={tone === 'warning' ? { color: 'var(--warning)' } : undefined}>
        {value ?? <Skeleton w={90} h={24} />}{value && unit && <small>{unit}</small>}
      </div>
      <div className="kpi__foot">{foot}</div>
      {spark && <Sparkline className="kpi__spark" values={spark} />}
    </div>
  )
}

function QueueRow({ item, open, onOpen }: { item: InboxItem; open: boolean; onOpen: () => void }) {
  const { t, lang } = useI18n()
  const { data: products } = useQuery('products:all', () => api.products.list())
  const product = item.meta.productId ? products?.find((p) => p.id === item.meta.productId) : undefined
  let sub: ReactNode = null
  if (item.kind === 'order') sub = <><Pill tone={item.meta.status}>{t(`orders.status.${item.meta.status}` as DictKey)}</Pill><span>{item.meta.city}</span><span>· {item.meta.units} {t('common.pcs')}</span></>
  if (item.kind === 'consultation') sub = <><span>{t(`cons.channel.${item.meta.channel}` as DictKey)}</span>{product && <span>· {product.name[lang]}</span>}{item.meta.status === 'no_answer' && <Pill tone="warning">{t('cons.status.no_answer')}</Pill>}</>
  if (item.kind === 'stock') sub = item.meta.stock === 0 ? <Pill tone="danger">{t('inbox.outStock')}</Pill> : <><span style={{ color: 'var(--warning)', fontWeight: 700 }}>{t('inbox.lowStock', { n: item.meta.stock ?? 0 })}</span>{item.meta.daysLeft !== null && item.meta.daysLeft !== undefined && <span>· {t('inbox.daysLeft', { n: item.meta.daysLeft })}</span>}</>
  if (item.kind === 'review') sub = <><span className="row" style={{ gap: 3 }}><Star size={12} fill="currentColor" color="var(--gold-deep)" aria-hidden="true" />{item.meta.rating} · {t('inbox.review')}</span>{product && <span>· {product.name[lang]}</span>}{!item.meta.consent && <Pill tone="danger">{t('inbox.noConsent')}</Pill>}</>
  if (item.kind === 'certificate') sub = <span>{t('inbox.certExpiring', { date: date(item.meta.validUntil, lang) })}</span>
  return (
    <button type="button" className={cx('qitem', item.lit && 'is-lit', open && 'is-open')} onClick={onOpen} aria-current={open || undefined}>
      <span className={cx('qitem__icon', item.severity !== 'normal' && `qitem__icon--${item.severity}`)}>{ICON[item.kind]}</span>
      <span style={{ minWidth: 0 }}>
        <span className="qitem__title ellipsis" style={{ display: 'block' }}>{item.title}</span>
        <span className="qitem__sub">{sub}</span>
      </span>
      <span className="qitem__meta">
        {item.kind === 'stock' || item.kind === 'certificate' ? '' : ago(item.at, lang, t)}
        {item.amount !== undefined && <b>{moneyShort(item.amount, lang)}</b>}
      </span>
    </button>
  )
}

/* ------------------------------------------------- non-order actions */

function ConsultationAction({ id }: { id: string }) {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const { data: list } = useQuery('consultations:all', () => api.consultations.list({ status: 'all' }))
  const { data: products } = useQuery('products:all', () => api.products.list())
  const item = list?.find((c) => c.id === id)
  const [note, setNote] = useState('')
  const update = useMutation((status: 'called' | 'no_answer' | 'done') => api.consultations.update(id, { status, note: note || item?.note || '' }))
  if (!item) return <Skeleton h={160} r={14} />
  const product = products?.find((p) => p.id === item.productId)
  const act = async (status: 'called' | 'no_answer' | 'done') => {
    try { await update.run(status); toast(t(`cons.status.${status}` as DictKey)); invalidate('inbox', 'badges', 'consultations') }
    catch (e) { toast(errorText(e, t), 'error') }
  }
  return (
    <div className="stack">
      <div>
        <h2 style={{ font: '800 19px/1.2 var(--f-ui)' }}>{item.name || t('cons.anonymous')}</h2>
        <p className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>{t(`cons.channel.${item.channel}` as DictKey)} · {ago(item.createdAt, lang, t)} · {item.page}</p>
      </div>
      <a className="num" href={telHref(item.phone)} style={{ fontWeight: 800, fontSize: 20 }}>{item.phone}</a>
      <div className="row-wrap">
        <a className="btn btn--primary" href={telHref(item.phone)}><Phone />{t('common.call')}</a>
        <a className="btn btn--secondary" href={tgHref(item.phone)} target="_blank" rel="noopener noreferrer"><Send />Telegram</a>
        <a className="btn btn--secondary" href={waHref(item.phone, 'Assalomu alaykum! Family Group konsultatsiya.')} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp</a>
      </div>
      {product && (
        <div className="row" style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 12 }}>
          <Thumb src={product.image} cosmetic={product.line === 'cosmetic'} />
          <div><div className="field__label">{t('cons.product')}</div><b>{tx(product.name)}</b></div>
        </div>
      )}
      <Field label={t('common.note')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder={item.note} /></Field>
      <div className="row-wrap">
        <Button variant="primary" icon={<Check />} loading={update.pending} onClick={() => void act('done')}>{t('cons.markDone')}</Button>
        <Button icon={<PhoneCall />} onClick={() => void act('called')}>{t('cons.markCalled')}</Button>
        <Button icon={<PhoneOff />} onClick={() => void act('no_answer')}>{t('cons.markNoAnswer')}</Button>
      </div>
    </div>
  )
}

function StockAction({ productId }: { productId: number }) {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const { data: product } = useQuery(`product:${productId}`, () => api.products.get(productId))
  const { data: forecast } = useQuery('stock:forecast', () => api.stock.forecast())
  const [qty, setQty] = useState('100')
  const adjust = useMutation((delta: number) => api.stock.adjust({ productId, delta, reason: 'restock', note: '' }))
  if (!product) return <Skeleton h={160} r={14} />
  const f = forecast?.find((x) => x.productId === productId)
  const tone = product.stock === 0 ? 'out' : 'low'
  return (
    <div className="stack">
      <div className="row" style={{ gap: 16, alignItems: 'center' }}>
        <div className="bottle" style={{ padding: 0 }}><BottleGlass level={product.stock / Math.max(product.lowStockAt * 4, 1)} tone={tone} cosmetic={product.line === 'cosmetic'} /></div>
        <div>
          <h2 style={{ font: '800 19px/1.2 var(--f-ui)' }}>{tx(product.name)}</h2>
          <p className="faint" style={{ marginTop: 4, fontSize: 12.5 }}>{product.sku} · {tx(product.subtitle)}</p>
          <div className="row" style={{ marginTop: 8 }}>
            {product.stock === 0 ? <Pill tone="danger">{t('inbox.outStock')}</Pill> : <Pill tone="warning">{t('inbox.lowStock', { n: product.stock })}</Pill>}
            {f && f.dailyRate > 0 && <span className="muted" style={{ fontSize: 12.5 }}>{t('stock.dailyRate')}: <b className="num">{f.dailyRate}</b></span>}
          </div>
        </div>
      </div>
      <div className="callout callout--warning"><AlertTriangle size={17} /><span>{t('stock.reorder')} · {t('products.lowAt')}: {product.lowStockAt} {t('common.pcs')}</span></div>
      <div className="row-wrap" style={{ alignItems: 'flex-end' }}>
        <Field label={`${t('inbox.restock')} (${t('common.pcs')})`}><Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} style={{ width: 140 }} /></Field>
        <Button variant="primary" loading={adjust.pending} disabled={!(Number(qty) > 0)} onClick={async () => {
          try { await adjust.run(Math.round(Number(qty))); toast(t('stock.adjusted')); invalidate('inbox', 'badges', 'stock', 'product', 'products', 'dashboard') }
          catch (e) { toast(errorText(e, t), 'error') }
        }}>{t('inbox.restock')}</Button>
        <Link className="btn btn--ghost" to="/stock">{t('inbox.openStock')}</Link>
      </div>
      <p className="faint" style={{ fontSize: 12.5 }}>{money(product.price, lang)} · {t('stock.forecastNote')}</p>
    </div>
  )
}

function ReviewAction({ id }: { id: string }) {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const { data: list } = useQuery('reviews:all', () => api.reviews.list({ status: 'all' }))
  const { data: products } = useQuery('products:all', () => api.products.list())
  const set = useMutation((status: 'approved' | 'rejected') => api.reviews.setStatus(id, status))
  const review = list?.find((r) => r.id === id)
  if (!review) return <Skeleton h={160} r={14} />
  const product = products?.find((p) => p.id === review.productId)
  const act = async (status: 'approved' | 'rejected') => {
    try { await set.run(status); toast(t(status === 'approved' ? 'rev.approved' : 'rev.rejected')); invalidate('inbox', 'badges', 'reviews') }
    catch (e) { toast(errorText(e, t), 'error') }
  }
  return (
    <div className="stack">
      <div>
        <h2 style={{ font: '800 19px/1.2 var(--f-ui)' }}>{review.name}</h2>
        <p className="faint" style={{ fontSize: 12.5, marginTop: 4 }}>{review.city} · {date(review.createdAt, lang)} · {product ? tx(product.name) : ''}</p>
      </div>
      <div className="row" style={{ color: 'var(--gold-deep)' }} aria-label={`${review.rating}/5`}>
        {Array.from({ length: 5 }, (_, i) => <Star key={i} size={18} fill={i < review.rating ? 'currentColor' : 'none'} />)}
      </div>
      <blockquote style={{ margin: 0, padding: '14px 16px', background: 'var(--panel-2)', borderRadius: 12, fontSize: 14.5, lineHeight: 1.6 }}>{review.text}</blockquote>
      {review.consent
        ? <div className="callout"><Check size={17} /><span>{t('rev.consentYes')} · {review.consentRef}</span></div>
        : <div className="callout callout--warning"><AlertTriangle size={17} /><span>{t('rev.noConsent')}</span></div>}
      <div className="row-wrap">
        <Button variant="primary" icon={<Check />} disabled={!review.consent} loading={set.pending} onClick={() => void act('approved')}>{t('rev.approve')}</Button>
        <Button variant="danger" onClick={() => void act('rejected')}>{t('rev.reject')}</Button>
      </div>
    </div>
  )
}

function CertificateAction({ id }: { id: string }) {
  const { t, tx, lang } = useI18n()
  const { data: content } = useQuery('content', () => api.content.get())
  const cert = content?.certificates.find((c) => c.id === id)
  if (!cert) return <Skeleton h={160} r={14} />
  return (
    <div className="stack">
      <div className="cert" style={{ gridTemplateColumns: '110px minmax(0,1fr)' }}>
        <img src={cert.pages[0]} alt="" style={{ width: 110 }} />
        <div className="stack-sm">
          <h2 style={{ font: '800 17px/1.25 var(--f-ui)' }}>{tx(cert.title)}</h2>
          <span className="muted">{cert.number} · {cert.issuedBy}</span>
          <Pill tone="warning">{t('inbox.certExpiring', { date: date(cert.validUntil, lang) })}</Pill>
        </div>
      </div>
      <Panel><p className="muted" style={{ fontSize: 13 }}>{t('content.certValid')}: <b>{date(cert.validUntil, lang)}</b>. {t('set.certWarn')}.</p></Panel>
      <Link className="btn btn--primary" to="/content?tab=certs" style={{ justifySelf: 'start' }}>{t('inbox.openContent')}</Link>
    </div>
  )
}
