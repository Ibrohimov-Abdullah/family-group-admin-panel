import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ClipboardList, Download, Search } from 'lucide-react'
import { api, type Order, type OrderQuery, type OrderStatus, type PaymentMethod } from '../api'
import { useI18n } from '../lib/i18n'
import { useQuery } from '../lib/query'
import { ago, money, num } from '../lib/format'
import { saveBlob } from '../lib/xlsx'
import { Button, DataTable, Drawer, EmptyState, ErrorBox, Input, PageHeader, Pager, Pill, Segmented, Select, SkeletonRows, StatusPill, Thumb, errorText, type Column } from '../components/ui'
import { OrderDetail } from '../components/OrderDetail'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type StatusFilter = OrderStatus | 'all' | 'open'
type Range = 'today' | '7d' | '30d' | 'all'
const PAGE_SIZE = 20
const CITIES = ['Andijon', 'Namangan', "Farg'ona", 'Toshkent', 'Samarqand', 'Buxoro', 'Qarshi', 'Nukus', 'Navoiy', 'Jizzax', 'Guliston', 'Termiz', 'Urganch', 'Xiva']

function rangeFrom(range: Range): string | undefined {
  if (range === 'all') return undefined
  const d = new Date(); d.setHours(0, 0, 0, 0)
  if (range === '7d') d.setDate(d.getDate() - 6)
  if (range === '30d') d.setDate(d.getDate() - 29)
  return d.toISOString()
}

export function OrdersPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [status, setStatus] = useState<StatusFilter>('open')
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [city, setCity] = useState('')
  const [payment, setPayment] = useState<PaymentMethod | 'all'>('all')
  const [range, setRange] = useState<Range>('30d')
  const [page, setPage] = useState(1)
  const [sort, setSort] = useState<{ key: 'createdAt' | 'total'; dir: 'asc' | 'desc' }>({ key: 'createdAt', dir: 'desc' })
  const [exporting, setExporting] = useState(false)

  useEffect(() => { const h = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(h) }, [q])
  useEffect(() => { setPage(1) }, [status, debounced, city, payment, range])

  const query: OrderQuery = useMemo(() => ({
    status, q: debounced || undefined, city: city || undefined, payment, from: rangeFrom(range), page, pageSize: PAGE_SIZE, sort: sort.key, dir: sort.dir,
  }), [status, debounced, city, payment, range, page, sort])
  const { data, error, loading, refetch } = useQuery(`orders:${JSON.stringify(query)}`, () => api.orders.list(query))
  const { data: counts } = useQuery('orders:counts', () => api.orders.counts())
  const { data: couriers } = useQuery('couriers', () => api.couriers.list())

  const open = Object.values(counts?.byStatus ?? {}).length
    ? (counts!.byStatus.new + counts!.byStatus.confirmed + counts!.byStatus.packed + counts!.byStatus.shipping) : undefined

  const columns: Column<Order>[] = [
    { key: 'number', header: t('orders.number'), cell: (o) => (
      <div>
        <span className={`cell-strong num${o.seenAt === null ? ' is-unseen' : ''}`}>{o.number}</span>
        <span className="cell-sub">{ago(o.createdAt, lang, t)} · {t(`orders.source.${o.source}` as DictKey)}</span>
      </div>
    ) },
    { key: 'customer', header: t('orders.customer'), cell: (o) => <div><span className="cell-strong">{o.customerName}</span><span className="cell-sub num">{o.customerPhone}</span></div> },
    { key: 'city', header: t('common.city'), hideSm: true, cell: (o) => o.address.city },
    { key: 'items', header: t('orders.items'), hideSm: true, cell: (o) => (
      <div className="row" style={{ gap: 4 }} title={o.items.map((i) => `${tx(i.name)} × ${i.qty}`).join(', ')}>
        {o.items.slice(0, 3).map((i) => <Thumb key={i.productId} src={i.image} cosmetic={i.productId > 100} />)}
        {o.items.length > 3 && <span className="faint" style={{ fontSize: 12 }}>+{o.items.length - 3}</span>}
      </div>
    ) },
    { key: 'total', header: t('common.total'), align: 'right', sortable: true, cell: (o) => <b className="num">{money(o.total, lang)}</b> },
    { key: 'payment', header: t('orders.payment'), hideSm: true, cell: (o) => (
      <div><span>{t(`orders.pay.${o.paymentMethod}` as DictKey)}</span>{o.paymentStatus !== 'paid' && <span className="cell-sub" style={{ color: o.paymentStatus === 'refunded' ? 'var(--danger)' : 'var(--warning)' }}>{t(`orders.payStatus.${o.paymentStatus}` as DictKey)}</span>}</div>
    ) },
    { key: 'status', header: t('common.status'), cell: (o) => <StatusPill status={o.status} /> },
    { key: 'courier', header: t('orders.courier'), hideSm: true, cell: (o) => couriers?.find((c) => c.id === o.courierId)?.name ?? <span className="faint">—</span> },
  ]

  const exportXlsx = async () => {
    setExporting(true)
    try {
      saveBlob(await api.exports.orders({ ...query, page: 1, pageSize: 100000 }), `buyurtmalar-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast(t('common.exportDone'))
    } catch (e) { toast(errorText(e, t), 'error') } finally { setExporting(false) }
  }

  return (
    <div>
      <PageHeader title={t('orders.title')} sub={t('orders.sub')}
        actions={<Button icon={<Download />} loading={exporting} onClick={() => void exportXlsx()}>{t('common.export')}</Button>} />

      <div className="panel">
        <div className="panel__head" style={{ flexWrap: 'wrap', gap: 12 }}>
          <Segmented<StatusFilter> value={status} onChange={setStatus} label={t('common.status')} options={[
            { value: 'open', label: t('orders.open'), count: open },
            { value: 'new', label: t('orders.status.new'), count: counts?.byStatus.new },
            { value: 'confirmed', label: t('orders.status.confirmed'), count: counts?.byStatus.confirmed },
            { value: 'packed', label: t('orders.status.packed'), count: counts?.byStatus.packed },
            { value: 'shipping', label: t('orders.status.shipping'), count: counts?.byStatus.shipping },
            { value: 'delivered', label: t('orders.status.delivered') },
            { value: 'cancelled', label: t('orders.status.cancelled') },
            { value: 'all', label: t('common.all') },
          ]} />
        </div>
        <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10, background: 'var(--panel-2)' }}>
          <div className="input-icon" style={{ flex: '1 1 240px', maxWidth: 360 }}>
            <Search />
            <Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('orders.searchPh')} aria-label={t('common.search')} />
          </div>
          <Select size="sm" value={city} onChange={(e) => setCity(e.target.value)} style={{ width: 'auto' }} aria-label={t('common.city')}>
            <option value="">{t('orders.allCities')}</option>
            {CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </Select>
          <Select size="sm" value={payment} onChange={(e) => setPayment(e.target.value as PaymentMethod | 'all')} style={{ width: 'auto' }} aria-label={t('orders.payment')}>
            <option value="all">{t('orders.allPayments')}</option>
            {(['payme', 'click', 'card'] as const).map((m) => <option key={m} value={m}>{t(`orders.pay.${m}` as DictKey)}</option>)}
          </Select>
          <Segmented<Range> value={range} onChange={setRange} label={t('common.period')} options={[
            { value: 'today', label: t('common.today') }, { value: '7d', label: t('common.p7') }, { value: '30d', label: t('common.p30') }, { value: 'all', label: t('common.all') },
          ]} />
          {data && <span className="right faint num" style={{ fontSize: 12.5 }}>{num(data.total)} · {money(data.items.reduce((s, o) => s + o.total, 0), lang)} <Pill plain>{t('common.page', { from: data.total ? (page - 1) * PAGE_SIZE + 1 : 0, to: Math.min(page * PAGE_SIZE, data.total), total: data.total })}</Pill></span>}
        </div>

        {error ? <div className="panel__body"><ErrorBox error={error} onRetry={refetch} /></div>
          : loading && !data ? <SkeletonRows rows={8} cols={6} />
          : (
            <>
              <DataTable rows={data?.items ?? []} columns={columns} rowKey={(o) => o.id} selectedKey={id}
                onRowClick={(o) => navigate(`/orders/${o.id}`)}
                sort={sort} onSort={(key) => setSort((s) => ({ key: key as 'createdAt' | 'total', dir: s.key === key && s.dir === 'desc' ? 'asc' : 'desc' }))}
                empty={<EmptyState icon={<ClipboardList />} title={t('orders.empty')} text={t('orders.emptyText')} />} />
              {data && <Pager page={page} pageSize={PAGE_SIZE} total={data.total} onPage={setPage} />}
            </>
          )}
      </div>

      <Drawer open={!!id} onClose={() => navigate('/orders')} title={t('orders.number')} wide>
        {id && <OrderDetail orderId={id} />}
      </Drawer>
    </div>
  )
}
