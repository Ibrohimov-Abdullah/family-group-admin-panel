import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Download, MessageCircle, Phone, Plus, Search, Send, Users, X } from 'lucide-react'
import { api, type Customer } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { date, money, num, telHref, tgHref, waHref } from '../lib/format'
import { saveBlob } from '../lib/xlsx'
import { Avatar, Button, DataTable, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Pager, Segmented, Select, Skeleton, SkeletonRows, StatusPill, Textarea, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'

type TagFilter = 'all' | 'doimiy' | 'VIP'
type Sort = 'lastOrderAt' | 'totalSpent' | 'ordersCount'

export function CustomersPage() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [tag, setTag] = useState<TagFilter>('all')
  const [sort, setSort] = useState<Sort>('lastOrderAt')
  const [page, setPage] = useState(1)
  const [exporting, setExporting] = useState(false)
  useEffect(() => { const h = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(h) }, [q])
  useEffect(() => { setPage(1) }, [debounced, tag, sort])
  const params = { q: debounced || undefined, tag: tag === 'all' ? undefined : tag, sort, page, pageSize: 20 }
  const list = useQuery(`customers:${JSON.stringify(params)}`, () => api.customers.list(params))

  const columns: Column<Customer>[] = [
    { key: 'name', header: t('orders.customer'), cell: (c) => <div className="row"><Avatar name={c.name} /><div><span className="cell-strong">{c.name}</span><span className="cell-sub num">{c.phone}</span></div></div> },
    { key: 'city', header: t('common.city'), hideSm: true, cell: (c) => c.city },
    { key: 'orders', header: t('cust.orders'), align: 'right', cell: (c) => <b className="num">{c.ordersCount}</b> },
    { key: 'spent', header: t('cust.spent'), align: 'right', cell: (c) => <b className="num">{money(c.totalSpent, lang)}</b> },
    { key: 'last', header: t('cust.last'), hideSm: true, cell: (c) => <span className="nowrap">{date(c.lastOrderAt, lang)}</span> },
    { key: 'tags', header: t('cust.tags'), hideSm: true, cell: (c) => <div className="row" style={{ gap: 4 }}>{c.tags.map((tg) => <span key={tg} className="tag">{tg}</span>)}</div> },
  ]

  return (
    <div>
      <PageHeader title={t('cust.title')} sub={t('cust.sub')} actions={<Button icon={<Download />} loading={exporting} onClick={async () => {
        setExporting(true)
        try { saveBlob(await api.exports.customers(), `mijozlar-${new Date().toISOString().slice(0, 10)}.xlsx`); toast(t('common.exportDone')) } catch (e) { toast(errorText(e, t), 'error') } finally { setExporting(false) }
      }}>{t('common.export')}</Button>} />
      <div className="panel">
        <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="input-icon" style={{ flex: '1 1 220px', maxWidth: 320 }}><Search /><Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cust.searchPh')} aria-label={t('common.search')} /></div>
          <Segmented<TagFilter> value={tag} onChange={setTag} options={[{ value: 'all', label: t('common.all') }, { value: 'doimiy', label: t('cust.repeat') }, { value: 'VIP', label: t('cust.vip') }]} />
          <Select size="sm" value={sort} onChange={(e) => setSort(e.target.value as Sort)} style={{ width: 'auto' }} className="right" aria-label="sort">
            <option value="lastOrderAt">{t('cust.sortLast')}</option><option value="totalSpent">{t('cust.sortSpent')}</option><option value="ordersCount">{t('cust.sortOrders')}</option>
          </Select>
        </div>
        {list.error ? <div className="panel__body"><ErrorBox error={list.error} onRetry={list.refetch} /></div>
          : !list.data ? <SkeletonRows rows={8} cols={5} />
          : <>
              <DataTable rows={list.data.items} columns={columns} rowKey={(c) => c.id} selectedKey={id} onRowClick={(c) => navigate(`/customers/${c.id}`)} empty={<EmptyState icon={<Users />} title={t('cust.empty')} />} />
              <Pager page={page} pageSize={20} total={list.data.total} onPage={setPage} />
            </>}
      </div>
      <Drawer open={!!id} onClose={() => navigate('/customers')} title={t('orders.customer')}>
        {id && <CustomerDetail id={id} />}
      </Drawer>
    </div>
  )
}

function CustomerDetail({ id }: { id: string }) {
  const { t, lang } = useI18n()
  const toast = useToast()
  const customer = useQuery(`customer:${id}`, () => api.customers.get(id))
  const orders = useQuery(`customer:${id}:orders`, () => api.customers.orders(id))
  const [notes, setNotes] = useState('')
  const [newTag, setNewTag] = useState('')
  const update = useMutation((patch: Pick<Partial<Customer>, 'notes' | 'tags'>) => api.customers.update(id, patch))
  useEffect(() => { setNotes(customer.data?.notes ?? '') }, [customer.data?.notes])
  if (customer.error) return <ErrorBox error={customer.error} onRetry={customer.refetch} />
  const c = customer.data
  if (!c) return <Skeleton h={300} r={14} />

  const saveTags = async (tags: string[]) => {
    try { await update.run({ tags }); invalidate('customer', 'customers'); toast(t('common.saved')) } catch (e) { toast(errorText(e, t), 'error') }
  }

  return (
    <>
      <div className="row" style={{ gap: 14 }}>
        <Avatar name={c.name} large />
        <div className="grow">
          <h3 style={{ font: '800 18px/1.2 var(--f-ui)' }}>{c.name}</h3>
          <a className="num muted" href={telHref(c.phone)}>{c.phone}</a> <span className="faint">· {c.city}</span>
        </div>
      </div>
      <div className="row-wrap">
        <a className="btn btn--secondary btn--sm" href={telHref(c.phone)}><Phone />{t('common.call')}</a>
        <a className="btn btn--secondary btn--sm" href={tgHref(c.phone)} target="_blank" rel="noopener noreferrer"><Send />Telegram</a>
        <a className="btn btn--secondary btn--sm" href={waHref(c.phone)} target="_blank" rel="noopener noreferrer"><MessageCircle />WhatsApp</a>
      </div>
      <div className="kpis" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))' }}>
        <div className="kpi"><div className="kpi__label">{t('cust.orders')}</div><div className="kpi__value">{c.ordersCount}</div></div>
        <div className="kpi"><div className="kpi__label">{t('cust.spent')}</div><div className="kpi__value" style={{ fontSize: 19 }}>{money(c.totalSpent, lang)}</div></div>
        <div className="kpi"><div className="kpi__label">{t('cust.avg')}</div><div className="kpi__value" style={{ fontSize: 19 }}>{money(c.ordersCount ? c.totalSpent / c.ordersCount : 0, lang)}</div></div>
      </div>
      <dl className="kv">
        <dt>{t('cust.first')}</dt><dd>{date(c.firstOrderAt, lang)}</dd>
        <dt>{t('cust.last')}</dt><dd>{date(c.lastOrderAt, lang)}</dd>
      </dl>
      <Field label={t('cust.tags')}>
        <div className="row-wrap">
          {c.tags.map((tg) => (
            <span key={tg} className="tag" style={{ gap: 4 }}>{tg}<button type="button" aria-label={`${t('common.delete')} ${tg}`} onClick={() => void saveTags(c.tags.filter((x) => x !== tg))} style={{ display: 'inline-grid' }}><X size={12} /></button></span>
          ))}
          <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); const v = newTag.trim(); if (v && !c.tags.includes(v)) { void saveTags([...c.tags, v]); setNewTag('') } }}>
            <Input size="sm" value={newTag} onChange={(e) => setNewTag(e.target.value)} placeholder={t('cust.addTag')} style={{ width: 140 }} />
            <Button size="sm" type="submit" iconOnly icon={<Plus />} aria-label={t('cust.addTag')} />
          </form>
        </div>
      </Field>
      <Field label={t('cust.notes')}>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} onBlur={() => { if (notes !== c.notes) void update.run({ notes }).then(() => { invalidate(`customer:${id}`); toast(t('common.saved')) }) }} />
      </Field>
      <div>
        <div className="section-title">{t('cust.history')}</div>
        {!orders.data ? <Skeleton h={120} /> : (
          <div className="panel">
            {orders.data.map((o) => (
              <Link key={o.id} to={`/orders/${o.id}`} className="row" style={{ padding: '10px 14px', borderBottom: '1px solid var(--line)' }}>
                <div className="grow"><b className="num">{o.number}</b><span className="cell-sub">{date(o.createdAt, lang)} · {o.items.length} {t('common.pcs')}</span></div>
                <StatusPill status={o.status} />
                <b className="num" style={{ minWidth: 100, textAlign: 'right' }}>{money(o.total, lang)}</b>
              </Link>
            ))}
            {orders.data.length === 0 && <p className="faint" style={{ padding: 14 }}>—</p>}
          </div>
        )}
        <p className="faint num" style={{ fontSize: 12, marginTop: 6 }}>{num(orders.data?.length ?? 0)} · {money((orders.data ?? []).filter((o) => o.status !== 'cancelled').reduce((s, o) => s + o.total, 0), lang)}</p>
      </div>
    </>
  )
}
