import { useMemo, useState } from 'react'
import { Download, PackagePlus, SlidersHorizontal } from 'lucide-react'
import { api, type Product, type StockReason } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { dateTime, num } from '../lib/format'
import { saveBlob } from '../lib/xlsx'
import { BottleGlass } from '../components/Bottle'
import { Button, DataTable, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Pager, Panel, Pill, Segmented, Select, Skeleton, SkeletonRows, Tabs, Textarea, Thumb, cx, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type Tab = 'shelf' | 'movements' | 'forecast'
type Shelf = 'all' | 'low' | 'supplement' | 'cosmetic'
const REASONS: StockReason[] = ['order', 'restock', 'adjustment', 'return', 'writeoff', 'allocation']

export function StockPage() {
  const { t, tx } = useI18n()
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('shelf')
  const [shelf, setShelf] = useState<Shelf>('all')
  const [adjusting, setAdjusting] = useState<Product | null>(null)
  const products = useQuery('products:all', () => api.products.list())
  const forecast = useQuery('stock:forecast', () => api.stock.forecast())
  const [exporting, setExporting] = useState(false)

  const list = (products.data ?? []).filter((p) => shelf === 'all' || (shelf === 'low' ? p.stock <= p.lowStockAt : p.line === shelf))
  const lowCount = (products.data ?? []).filter((p) => p.stock <= p.lowStockAt).length
  const totalUnits = (products.data ?? []).reduce((s, p) => s + p.stock, 0)
  const ref = Math.max(...(products.data ?? []).map((p) => p.stock), 1)

  const exportXlsx = async () => {
    setExporting(true)
    try { saveBlob(await api.exports.stock(), `ombor-${new Date().toISOString().slice(0, 10)}.xlsx`); toast(t('common.exportDone')) }
    catch (e) { toast(errorText(e, t), 'error') } finally { setExporting(false) }
  }

  return (
    <div>
      <PageHeader title={t('stock.title')} sub={t('stock.sub')} actions={<>
        <Button icon={<Download />} loading={exporting} onClick={() => void exportXlsx()}>{t('common.export')}</Button>
        <Button variant="primary" icon={<PackagePlus />} onClick={() => products.data && setAdjusting(products.data[0])}>{t('stock.restock')}</Button>
      </>} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { value: 'shelf', label: t('stock.shelf') }, { value: 'movements', label: t('stock.movements') }, { value: 'forecast', label: t('stock.forecast') },
      ]} />

      {products.error ? <ErrorBox error={products.error} onRetry={products.refetch} /> : null}

      {tab === 'shelf' && (
        <Panel title={t('stock.shelf')} sub={t('stock.shelfSub')} actions={
          <Segmented<Shelf> value={shelf} onChange={setShelf} label={t('stock.shelf')} options={[
            { value: 'all', label: t('common.all') },
            { value: 'low', label: t('stock.low'), count: lowCount },
            { value: 'supplement', label: t('common.supplement') },
            { value: 'cosmetic', label: t('common.cosmetic') },
          ]} />
        }>
          {!products.data ? <Skeleton h={300} /> : (
            <>
              <p className="faint num" style={{ fontSize: 12.5, marginBottom: 12 }}>{num(products.data.length)} SKU · {num(totalUnits)} {t('common.pcs')}</p>
              {list.length === 0 ? <EmptyState title={t('products.empty')} /> : (
                <div className="bottles">
                  {list.map((p) => {
                    const tone = p.stock === 0 ? 'out' : p.stock <= p.lowStockAt ? 'low' : 'ok'
                    const f = forecast.data?.find((x) => x.productId === p.id)
                    return (
                      <button key={p.id} type="button" className={cx('bottle', tone === 'low' && 'is-low', tone === 'out' && 'is-out')} onClick={() => setAdjusting(p)}
                        title={`${tx(p.name)} · ${p.stock} ${t('common.pcs')}${f?.daysLeft !== null && f?.daysLeft !== undefined ? ` · ${f.daysLeft} ${t('common.days')}` : ''}`}>
                        <BottleGlass level={p.stock / ref} tone={tone} cosmetic={p.line === 'cosmetic'} />
                        <span className="bottle__name ellipsis" style={{ maxWidth: '100%' }}>{tx(p.name)}</span>
                        <span className="bottle__qty">{tone === 'out' ? t('stock.out') : `${num(p.stock)} ${t('common.pcs')}`}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </>
          )}
        </Panel>
      )}

      {tab === 'movements' && <Movements />}

      {tab === 'forecast' && (
        <Panel title={t('stock.forecast')} sub={t('stock.forecastNote')} flush>
          {!products.data || !forecast.data ? <SkeletonRows rows={8} cols={5} /> : (
            <DataTable rows={[...forecast.data].sort((a, b) => (a.daysLeft ?? 1e9) - (b.daysLeft ?? 1e9))} rowKey={(f) => String(f.productId)}
              onRowClick={(f) => { const p = products.data!.find((x) => x.id === f.productId); if (p) setAdjusting(p) }}
              columns={[
                { key: 'p', header: t('common.name'), cell: (f) => { const p = products.data!.find((x) => x.id === f.productId)!; return <div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><b>{tx(p.name)}</b></div> } },
                { key: 's', header: t('stock.balance'), align: 'right', cell: (f) => <b className="num">{num(f.stock)}</b> },
                { key: 'r', header: t('stock.dailyRate'), align: 'right', cell: (f) => <span className="num">{f.dailyRate}</span> },
                { key: 'd', header: t('stock.daysLeft'), align: 'right', cell: (f) => f.stock === 0 ? <Pill tone="danger">{t('stock.out')}</Pill> : f.daysLeft === null ? <span className="faint">{t('stock.noSales')}</span> : <Pill tone={f.daysLeft <= 14 ? 'warning' : 'success'}>{f.daysLeft} {t('common.days')}</Pill> },
              ]} />
          )}
        </Panel>
      )}

      <AdjustDrawer product={adjusting} products={products.data ?? []} onClose={() => setAdjusting(null)} />
    </div>
  )
}

function Movements() {
  const { t, tx, lang } = useI18n()
  const [productId, setProductId] = useState<string>('')
  const [reason, setReason] = useState<StockReason | ''>('')
  const [page, setPage] = useState(1)
  const params = useMemo(() => ({ productId: productId ? Number(productId) : undefined, reason: reason || undefined, page, pageSize: 25 }), [productId, reason, page])
  const moves = useQuery(`stock:moves:${JSON.stringify(params)}`, () => api.stock.movements(params))
  const products = useQuery('products:all', () => api.products.list())

  const columns: Column<NonNullable<typeof moves.data>['items'][number]>[] = [
    { key: 'at', header: t('common.date'), cell: (m) => <span className="nowrap">{dateTime(m.at, lang)}</span> },
    { key: 'p', header: t('common.name'), cell: (m) => { const p = products.data?.find((x) => x.id === m.productId); return p ? <div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><span>{tx(p.name)}</span></div> : m.productId } },
    { key: 'reason', header: t('stock.reason'), cell: (m) => <Pill tone={m.delta > 0 ? 'success' : m.reason === 'writeoff' ? 'danger' : undefined} plain>{t(`stock.reason.${m.reason}` as DictKey)}</Pill> },
    { key: 'delta', header: t('stock.delta'), align: 'right', cell: (m) => <b className="num" style={{ color: m.delta > 0 ? 'var(--success)' : m.delta < 0 ? 'var(--ink)' : 'var(--ink-3)' }}>{m.delta > 0 ? `+${m.delta}` : m.delta}</b> },
    { key: 'bal', header: t('stock.balance'), align: 'right', cell: (m) => <span className="num">{num(m.balance)}</span> },
    { key: 'ref', header: t('stock.ref'), hideSm: true, cell: (m) => <div><span className="num">{m.ref}</span>{m.note && <span className="cell-sub">{m.note}</span>}</div> },
    { key: 'by', header: t('stock.by'), hideSm: true, cell: (m) => <span className="muted">{m.by}</span> },
  ]

  return (
    <div className="panel">
      <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
        <Select size="sm" value={productId} onChange={(e) => { setProductId(e.target.value); setPage(1) }} style={{ width: 'auto', maxWidth: 260 }} aria-label={t('common.name')}>
          <option value="">{t('stock.allProducts')}</option>
          {products.data?.map((p) => <option key={p.id} value={p.id}>{tx(p.name)}</option>)}
        </Select>
        <Select size="sm" value={reason} onChange={(e) => { setReason(e.target.value as StockReason | ''); setPage(1) }} style={{ width: 'auto' }} aria-label={t('stock.reason')}>
          <option value="">{t('stock.allReasons')}</option>
          {REASONS.map((r) => <option key={r} value={r}>{t(`stock.reason.${r}` as DictKey)}</option>)}
        </Select>
      </div>
      {moves.error ? <div className="panel__body"><ErrorBox error={moves.error} onRetry={moves.refetch} /></div>
        : !moves.data ? <SkeletonRows rows={8} cols={6} />
        : <>
            <DataTable rows={moves.data.items} columns={columns} rowKey={(m) => m.id} empty={<EmptyState title={t('common.notFound')} />} />
            <Pager page={page} pageSize={25} total={moves.data.total} onPage={setPage} />
          </>}
    </div>
  )
}

function AdjustDrawer({ product, products, onClose }: { product: Product | null; products: Product[]; onClose: () => void }) {
  const { t, tx } = useI18n()
  const toast = useToast()
  const [productId, setProductId] = useState<number>(0)
  const [type, setType] = useState<'restock' | 'writeoff' | 'adjustment' | 'return'>('restock')
  const [qty, setQty] = useState('')
  const [note, setNote] = useState('')
  const [shown, setShown] = useState<Product | null>(null)
  if (product !== shown) { setShown(product); if (product) { setProductId(product.id); setQty(''); setNote(''); setType('restock') } }
  const adjust = useMutation(() => {
    const n = Math.round(Number(qty))
    const delta = type === 'writeoff' ? -Math.abs(n) : type === 'adjustment' ? n : Math.abs(n)
    return api.stock.adjust({ productId, delta, reason: type, note })
  })
  const current = products.find((p) => p.id === productId)
  const n = Number(qty)
  const valid = Number.isFinite(n) && n !== 0 && (type === 'adjustment' || n > 0)
  const after = current ? Math.max(0, current.stock + (type === 'writeoff' ? -Math.abs(n || 0) : type === 'adjustment' ? (n || 0) : Math.abs(n || 0))) : 0

  return (
    <Drawer open={!!product} onClose={onClose} title={t('stock.adjust')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" icon={<SlidersHorizontal />} disabled={!valid} loading={adjust.pending} onClick={async () => {
        try { await adjust.run(); toast(t('stock.adjusted')); invalidate('stock', 'products', 'product:', 'inbox', 'badges', 'dashboard'); onClose() }
        catch (e) { toast(errorText(e, t), 'error') }
      }}>{t('common.save')}</Button></>}>
      <Field label={t('common.name')}>
        <Select value={productId} onChange={(e) => setProductId(Number(e.target.value))}>
          {products.map((p) => <option key={p.id} value={p.id}>{tx(p.name)} — {p.stock} {t('common.pcs')}</option>)}
        </Select>
      </Field>
      {current && (
        <div className="row" style={{ gap: 18, padding: 14, background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="bottle" style={{ padding: 0 }}><BottleGlass level={after / Math.max(current.stock, after, current.lowStockAt * 4, 1)} tone={after === 0 ? 'out' : after <= current.lowStockAt ? 'low' : 'ok'} cosmetic={current.line === 'cosmetic'} /></div>
          <div className="stack-sm">
            <span className="muted">{t('stock.balance')}: <b className="num">{num(current.stock)}</b> → <b className="num" style={{ color: 'var(--gold-ink)' }}>{num(after)}</b> {t('common.pcs')}</span>
            <span className="faint" style={{ fontSize: 12 }}>{t('products.lowAt')}: {current.lowStockAt}</span>
          </div>
        </div>
      )}
      <Field label={t('stock.type')}>
        <Segmented value={type} onChange={setType} options={[
          { value: 'restock', label: t('stock.reason.restock') }, { value: 'return', label: t('stock.reason.return') },
          { value: 'writeoff', label: t('stock.reason.writeoff') }, { value: 'adjustment', label: t('stock.reason.adjustment') },
        ]} />
      </Field>
      <Field label={`${t('stock.qty')} (${t('common.pcs')})`} hint={type === 'adjustment' ? '+ / −' : undefined}>
        <Input type="number" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
      </Field>
      <Field label={t('common.note')} hint={t('common.optional')}><Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} /></Field>
    </Drawer>
  )
}
