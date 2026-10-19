import { useEffect, useState } from 'react'
import { Check, ExternalLink, MapPin, MessageCircle, Phone, Printer, Send, Truck, X } from 'lucide-react'
import { api, type Order, type OrderStatus } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { ago, dateTime, money, telHref, tgHref, waHref } from '../lib/format'
import { Button, ConfirmDialog, ErrorBox, Field, Pill, Select, Skeleton, StatusPill, Textarea, Thumb, cx, errorText } from './ui'
import { TileMap } from './TileMap'
import { useToast } from './Toast'
import type { DictKey } from '../lib/dict'

const FLOW: OrderStatus[] = ['new', 'confirmed', 'packed', 'shipping', 'delivered']
const NEXT: Partial<Record<OrderStatus, OrderStatus>> = { new: 'confirmed', confirmed: 'packed', packed: 'shipping', shipping: 'delivered' }

export function refreshOrders() {
  invalidate('orders', 'order:', 'inbox', 'badges', 'dashboard', 'customer', 'stock', 'products', 'delivery')
}

export function OrderDetail({ orderId, compact }: { orderId: string; compact?: boolean }) {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const { data: order, error, loading, refetch } = useQuery(`order:${orderId}`, () => api.orders.get(orderId))
  const { data: couriers } = useQuery('couriers', () => api.couriers.list())
  const [note, setNote] = useState('')
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reason, setReason] = useState('orders.reason1')
  const setStatus = useMutation((status: OrderStatus, n: string) => api.orders.setStatus(orderId, status, n))
  const assign = useMutation((courierId: string | null) => api.orders.assignCourier(orderId, courierId))
  const saveNote = useMutation((notes: string) => api.orders.update(orderId, { notes }))

  // Opening an order turns its "lit" state off for everyone.
  useEffect(() => {
    if (order && order.seenAt === null) api.orders.markSeen(order.id).then(() => invalidate('inbox', 'badges', 'orders'))
  }, [order])
  useEffect(() => { setNote(order?.notes ?? '') }, [order?.id, order?.notes])

  if (error) return <div className="panel__body"><ErrorBox error={error} onRetry={refetch} /></div>
  if (loading || !order) return <DetailSkeleton />

  const next = NEXT[order.status]
  const courier = couriers?.find((c) => c.id === order.courierId)
  const stepIndex = FLOW.indexOf(order.status)
  const needsCourier = next === 'shipping' && !order.courierId

  const advance = async (status: OrderStatus, n = '') => {
    try {
      await setStatus.run(status, n)
      toast(t('orders.statusChanged', { status: t(`orders.status.${status}` as DictKey) }))
      refreshOrders()
    } catch (e) { toast(errorText(e, t), 'error') }
  }

  const onAssign = async (courierId: string) => {
    try {
      await assign.run(courierId || null)
      toast(t('orders.courierSet'))
      refreshOrders()
    } catch (e) { toast(errorText(e, t), 'error') }
  }

  const mapsUrl = (o: Order) => o.address.lat !== null ? `https://yandex.uz/maps/?pt=${o.address.lon},${o.address.lat}&z=17&l=map` : `https://yandex.uz/maps/?text=${encodeURIComponent(`${o.address.city}, ${o.address.street}`)}`

  return (
    <div className="stack" style={{ gap: 18 }}>
      {/* header + primary action */}
      <div className="row-wrap ohead" style={{ alignItems: 'flex-start' }}>
        <div className="grow" style={{ minWidth: 0 }}>
          <div className="row-wrap" style={{ gap: 8 }}>
            <h2 style={{ font: '800 19px/1.2 var(--f-ui)' }} className="num">{order.number}</h2>
            <StatusPill status={order.status} />
            {order.paymentStatus !== 'paid' && <Pill tone={order.paymentStatus === 'refunded' ? 'danger' : 'warning'}>{t(`orders.payStatus.${order.paymentStatus}` as DictKey)}</Pill>}
          </div>
          <p className="faint" style={{ marginTop: 4, fontSize: 12.5 }}>
            {t('orders.created')}: {dateTime(order.createdAt, lang)} · {ago(order.createdAt, lang, t)} · {t(`orders.source.${order.source}` as DictKey)}
          </p>
        </div>
        <div className="row-wrap ohead__actions">
          {next && (
            <Button variant="primary" icon={next === 'shipping' ? <Truck /> : <Check />} loading={setStatus.pending} disabled={needsCourier}
              title={needsCourier ? t('orders.assign') : undefined} onClick={() => void advance(next)}>
              {t(`orders.action.${next}` as DictKey)}
            </Button>
          )}
          {order.status !== 'delivered' && order.status !== 'cancelled' && (
            <Button variant="danger" icon={<X />} onClick={() => setCancelOpen(true)}>{t('orders.action.cancel')}</Button>
          )}
          {!compact && <Button variant="ghost" iconOnly icon={<Printer />} aria-label={t('orders.printSlip')} onClick={() => window.print()} />}
        </div>
      </div>

      {/* progress */}
      {order.status !== 'cancelled' ? (
        <div>
          <div className="ostatus" aria-label={t('common.status')}>
            {FLOW.map((s, i) => (
              <div key={s} className={cx('ostep', i < stepIndex && 'is-done', i === stepIndex && (s === 'delivered' ? 'is-done' : 'is-current'))}>
                <span className="ostep__dot">
                  {i < stepIndex || (s === order.status && s === 'delivered') ? <Check /> : i + 1}
                  <span className="ostep__label">{t(`orders.status.${s}` as DictKey)}</span>
                </span>
                {i < FLOW.length - 1 && <span className="ostep__line" />}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="callout callout--warning"><X size={17} /><span>{t('orders.status.cancelled')}{order.history.at(-1)?.note ? ` — ${order.history.at(-1)?.note}` : ''}</span></div>
      )}

      {/* courier, when it matters */}
      {(order.status === 'packed' || order.status === 'shipping' || order.status === 'confirmed') && (
        <Field label={t('orders.assign')}>
          <Select value={order.courierId ?? ''} onChange={(e) => void onAssign(e.target.value)} disabled={assign.pending}>
            <option value="">{t('orders.noCourier')}</option>
            {couriers?.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
          </Select>
        </Field>
      )}

      <div className={compact ? 'stack' : 'grid-2'} style={{ alignItems: 'start' }}>
        {/* customer & address */}
        <section className="panel">
          <div className="panel__body stack-sm">
            <div className="section-title">{t('orders.contact')}</div>
            <div style={{ fontWeight: 800, fontSize: 15 }}>{order.customerName}</div>
            <a className="num" href={telHref(order.customerPhone)} style={{ fontWeight: 700 }}>{order.customerPhone}</a>
            <div className="row-wrap" style={{ marginTop: 4 }}>
              <a className="btn btn--secondary btn--sm" href={telHref(order.customerPhone)}><Phone />{t('common.call')}</a>
              <a className="btn btn--secondary btn--sm" href={tgHref(order.customerPhone)} target="_blank" rel="noopener noreferrer"><Send />{t('orders.telegram')}</a>
              <a className="btn btn--secondary btn--sm" href={waHref(order.customerPhone, `Assalomu alaykum! Family Group, buyurtma ${order.number}.`)} target="_blank" rel="noopener noreferrer"><MessageCircle />{t('orders.whatsapp')}</a>
            </div>
            <div className="divider" style={{ margin: '10px 0' }} />
            <div className="section-title">{t('common.address')}</div>
            <div style={{ fontWeight: 700 }}>{order.address.city}</div>
            <div className="muted" style={{ fontSize: 13 }}>{order.address.street}{order.address.apt ? `, ${order.address.apt}` : ''}</div>
            {order.address.note && <div className="callout callout--gold" style={{ marginTop: 6, padding: '8px 10px' }}>{order.address.note}</div>}
            {order.address.lat !== null && order.address.lon !== null ? (
              <div style={{ marginTop: 8 }}>
                <TileMap height={150} zoom={15} center={{ lat: order.address.lat, lon: order.address.lon }} markers={[{ id: 'pin', kind: 'pin', lat: order.address.lat, lon: order.address.lon }]} />
              </div>
            ) : <p className="faint" style={{ fontSize: 12.5, marginTop: 4 }}><MapPin size={13} style={{ verticalAlign: -2 }} /> {t('orders.noPin')}</p>}
            <a className="link" href={mapsUrl(order)} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, marginTop: 4 }}>{t('orders.openMap')} <ExternalLink size={12} style={{ verticalAlign: -1 }} /></a>
          </div>
        </section>

        {/* items & totals */}
        <section className="panel">
          <div className="panel__body">
            <div className="section-title">{t('orders.items')}</div>
            <div className="lines">
              {order.items.map((it) => (
                <div key={it.productId} className="line">
                  <Thumb src={it.image} cosmetic={it.productId > 100} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700 }} className="ellipsis">{tx(it.name)}</div>
                    <div className="faint num" style={{ fontSize: 12 }}>{money(it.price, lang)} × {it.qty}</div>
                  </div>
                  <b className="num">{money(it.price * it.qty, lang)}</b>
                </div>
              ))}
            </div>
            <div className="totals num">
              <div><span className="muted">{t('orders.subtotal')}</span><span>{money(order.subtotal, lang)}</span></div>
              <div><span className="muted">{t('orders.delivery')}</span><span>{order.delivery ? money(order.delivery, lang) : t('orders.free')}</span></div>
              {order.discount > 0 && <div><span className="muted">{t('orders.discount')}{order.promoCode ? ` · ${order.promoCode}` : ''}</span><span>−{money(order.discount, lang)}</span></div>}
              <div className="grand"><span>{t('common.total')}</span><span>{money(order.total, lang)}</span></div>
            </div>
            <dl className="kv" style={{ marginTop: 14 }}>
              <dt>{t('orders.payment')}</dt><dd>{t(`orders.pay.${order.paymentMethod}` as DictKey)} · {t(`orders.payStatus.${order.paymentStatus}` as DictKey)}</dd>
              <dt>{t('orders.slot')}</dt><dd>{t(`orders.slot${order.slot}` as DictKey)}</dd>
              <dt>{t('orders.courier')}</dt><dd>{courier ? `${courier.name} · ${courier.phone}` : t('orders.noCourier')}</dd>
            </dl>
          </div>
        </section>
      </div>

      <div className={compact ? 'stack' : 'grid-2'} style={{ alignItems: 'start' }}>
        <Field label={t('orders.notes')}>
          <Textarea value={note} placeholder={t('orders.notesPh')} onChange={(e) => setNote(e.target.value)}
            onBlur={() => { if (note !== order.notes) void saveNote.run(note).then(() => { toast(t('common.saved')); invalidate(`order:${orderId}`) }) }} />
        </Field>
        <div>
          <div className="field__label" style={{ marginBottom: 8 }}>{t('orders.history')}</div>
          <ol className="timeline">
            {[...order.history].reverse().map((ev, i) => (
              <li key={i}>
                <b>{t(`orders.status.${ev.status}` as DictKey)}</b> · <span>{ev.by} · {dateTime(ev.at, lang)}</span>
                {ev.note && <div className="muted">{ev.note}</div>}
              </li>
            ))}
          </ol>
        </div>
      </div>

      <ConfirmDialog open={cancelOpen} onClose={() => setCancelOpen(false)} title={t('orders.cancelTitle')} text={t('orders.cancelText')}
        confirmLabel={t('orders.action.cancel')} tone="danger" loading={setStatus.pending}
        onConfirm={async () => { await advance('cancelled', t(reason as DictKey)); setCancelOpen(false) }}>
        <Field label={t('orders.cancelReason')}>
          <Select value={reason} onChange={(e) => setReason(e.target.value)}>
            {['orders.reason1', 'orders.reason2', 'orders.reason3', 'orders.reason4'].map((k) => <option key={k} value={k}>{t(k as DictKey)}</option>)}
          </Select>
        </Field>
      </ConfirmDialog>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="stack" aria-busy="true">
      <Skeleton w="45%" h={22} />
      <Skeleton w="70%" />
      <Skeleton h={30} />
      <div className="grid-2"><Skeleton h={200} r={14} /><Skeleton h={200} r={14} /></div>
    </div>
  )
}
