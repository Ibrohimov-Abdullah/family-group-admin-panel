import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Bike, Phone, Plus, Truck } from 'lucide-react'
import { api, type Courier, type Order } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { ago, money, telHref } from '../lib/format'
import { Button, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, Select, Skeleton, StatusPill, Switch, errorText } from '../components/ui'
import { useToast } from '../components/Toast'
import { refreshOrders } from '../components/OrderDetail'

export function DeliveryPage() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const open = useQuery('delivery:open', () => api.orders.list({ status: 'open', pageSize: 500 }))
  const today0 = new Date(); today0.setHours(0, 0, 0, 0)
  const since = new Date(today0.getTime() - 5 * 86_400_000)
  const done = useQuery('delivery:done', () => api.orders.list({ status: 'delivered', from: since.toISOString(), pageSize: 1000 }))
  const couriers = useQuery('couriers', () => api.couriers.list())
  const [editing, setEditing] = useState<Partial<Courier> | null>(null)
  const assign = useMutation((orderId: string, courierId: string | null) => api.orders.assignCourier(orderId, courierId))

  const orders = open.data?.items ?? []
  const deliveredToday = (done.data?.items ?? []).filter((o) => {
    const last = o.history.at(-1)
    return last && Date.parse(last.at) >= today0.getTime()
  })
  const waiting = orders.filter((o) => (o.status === 'packed' || o.status === 'confirmed') && !o.courierId)
  const assigned = orders.filter((o) => (o.status === 'packed' || o.status === 'confirmed') && o.courierId)
  const onRoute = orders.filter((o) => o.status === 'shipping')

  const onAssign = async (order: Order, courierId: string) => {
    try { await assign.run(order.id, courierId || null); toast(t('orders.courierSet')); refreshOrders() }
    catch (e) { toast(errorText(e, t), 'error') }
  }

  const column = (title: string, list: Order[], tone: string, showAssign = false) => (
    <div className="board__col">
      <div className="board__head"><Pill tone={tone} plain>{list.length}</Pill>{title}</div>
      {list.length === 0 && <p className="faint" style={{ fontSize: 12.5, padding: '6px 6px 12px' }}>{t('delivery.empty')}</p>}
      {list.slice(0, 30).map((o) => (
        <div key={o.id} className="board__card">
          <div className="row">
            <Link to={`/orders/${o.id}`} className="cell-strong num grow">{o.number}</Link>
            <StatusPill status={o.status} />
          </div>
          <div><b>{o.customerName}</b> · <span className="muted">{o.address.city}</span></div>
          <div className="muted ellipsis">{o.address.street}</div>
          <div className="row"><span className="faint grow">{ago(o.createdAt, lang, t)}</span><b className="num">{money(o.total, lang)}</b></div>
          {showAssign && couriers.data && (
            <Select size="sm" value={o.courierId ?? ''} onChange={(e) => void onAssign(o, e.target.value)} aria-label={t('orders.assign')}>
              <option value="">{t('orders.assign')}…</option>
              {couriers.data.filter((c) => c.active).map((c) => <option key={c.id} value={c.id}>{c.name} · {c.city}</option>)}
            </Select>
          )}
          {!showAssign && o.courierId && <span className="faint">{couriers.data?.find((c) => c.id === o.courierId)?.name}</span>}
        </div>
      ))}
    </div>
  )

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <PageHeader title={t('delivery.title')} sub={t('delivery.sub')} actions={<Button variant="primary" icon={<Plus />} onClick={() => setEditing({ active: true, city: 'Andijon' })}>{t('delivery.addCourier')}</Button>} />
      {open.error ? <ErrorBox error={open.error} onRetry={open.refetch} /> : null}
      {open.loading && !open.data ? <Skeleton h={320} r={14} /> : (
        <div className="board">
          {column(t('delivery.toAssign'), waiting, 'warning', true)}
          {column(t('orders.status.packed'), assigned, 'packed', true)}
          {column(t('delivery.onRoute'), onRoute, 'shipping')}
          {column(t('delivery.doneToday'), deliveredToday, 'delivered')}
        </div>
      )}

      <Panel title={t('delivery.couriers')} flush>
        {couriers.data ? (
          couriers.data.length === 0 ? <EmptyState icon={<Truck />} title={t('delivery.couriers')} /> :
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.name')}</th><th>{t('common.phone')}</th><th className="hide-sm">{t('common.city')}</th><th className="hide-sm">{t('delivery.vehicle')}</th><th>{t('delivery.load')}</th><th>{t('common.status')}</th><th /></tr></thead>
              <tbody>
                {couriers.data.map((c) => {
                  const load = orders.filter((o) => o.courierId === c.id).length
                  return (
                    <tr key={c.id}>
                      <td><div className="row"><span className="avatar"><Bike size={15} /></span><b>{c.name}</b></div></td>
                      <td><a href={telHref(c.phone)} className="num"><Phone size={13} style={{ verticalAlign: -2 }} /> {c.phone}</a></td>
                      <td className="hide-sm">{c.city}</td>
                      <td className="hide-sm muted">{c.vehicle}</td>
                      <td><b className="num">{load}</b></td>
                      <td><Pill tone={c.active ? 'success' : undefined}>{c.active ? t('common.active') : t('common.inactive')}</Pill></td>
                      <td className="t-right"><Button size="sm" variant="ghost" onClick={() => setEditing(c)}>{t('common.edit')}</Button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : <div className="panel__body"><Skeleton h={180} /></div>}
      </Panel>

      <CourierEditor value={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); invalidate('couriers'); toast(t('delivery.courierSaved')) }} />
    </div>
  )
}

function CourierEditor({ value, onClose, onSaved }: { value: Partial<Courier> | null; onClose: () => void; onSaved: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<Partial<Courier>>({})
  const [shownFor, setShownFor] = useState<Partial<Courier> | null>(null)
  if (value !== shownFor) { setShownFor(value); setForm(value ?? {}) }
  const save = useMutation(() => api.couriers.save({ id: form.id, name: form.name ?? '', phone: form.phone ?? '', city: form.city ?? '', vehicle: form.vehicle ?? '', active: form.active ?? true }))
  const valid = (form.name ?? '').trim().length > 1 && (form.phone ?? '').replace(/\D/g, '').length >= 9
  return (
    <Drawer open={!!value} onClose={onClose} title={form.id ? form.name : t('delivery.addCourier')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valid} loading={save.pending} onClick={async () => { try { await save.run(); onSaved() } catch (e) { toast(errorText(e, t), 'error') } }}>{t('common.save')}</Button></>}>
      <Field label={t('common.name')}><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label={t('common.phone')}><Input value={form.phone ?? ''} placeholder="+998 90 123 45 67" inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={t('common.city')}><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <Field label={t('delivery.vehicle')}><Input value={form.vehicle ?? ''} onChange={(e) => setForm({ ...form, vehicle: e.target.value })} /></Field>
      <Switch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} label={t('common.active')} />
    </Drawer>
  )
}
