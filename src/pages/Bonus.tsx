import { useMemo, useState } from 'react'
import { Gift, PackagePlus, Plus, Wallet } from 'lucide-react'
import { api, type Rep, type BonusStatus } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { date, dateTime, money, num, telHref } from '../lib/format'
import { Avatar, Button, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, Segmented, Select, Skeleton, SkeletonRows, Switch, Tabs, Thumb, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'
import { ApiError } from '../api'

type Tab = 'reps' | 'allocations' | 'sales' | 'payouts'

export function BonusPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('reps')
  return (
    <div>
      <PageHeader title={t('bonus.title')} sub={t('bonus.sub')} />
      <div className="callout callout--gold" style={{ marginBottom: 16 }}><Gift size={17} /><span>{t('bonus.app')}</span></div>
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { value: 'reps', label: t('bonus.reps') }, { value: 'allocations', label: t('bonus.allocations') },
        { value: 'sales', label: t('bonus.sales') }, { value: 'payouts', label: t('bonus.payouts') },
      ]} />
      {tab === 'reps' && <Reps />}
      {tab === 'allocations' && <Allocations />}
      {tab === 'sales' && <Sales />}
      {tab === 'payouts' && <Payouts />}
    </div>
  )
}

function useRefs() {
  const reps = useQuery('reps', () => api.bonus.reps())
  const products = useQuery('products:all', () => api.products.list())
  const pharmacies = useQuery('pharmacies', () => api.pharmacies.list())
  return { reps, products, pharmacies }
}

function Reps() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const { reps, pharmacies } = useRefs()
  const summaries = useQuery('reps:summary', () => api.bonus.summaries())
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [editing, setEditing] = useState<Partial<Rep> | null>(null)
  const [confirm, setConfirm] = useState(false)
  const payout = useMutation((ids: string[]) => api.bonus.payout(ids))
  const sum = (id: string) => summaries.data?.find((s) => s.repId === id)
  const pendingSelected = [...selected].reduce((s, id) => s + (sum(id)?.pending ?? 0), 0)
  const totalPending = (summaries.data ?? []).reduce((s, x) => s + x.pending, 0)

  const columns: Column<Rep>[] = [
    { key: 'sel', header: '', width: 40, cell: (r) => <label className="check" onClick={(e) => e.stopPropagation()}><input type="checkbox" disabled={!sum(r.id)?.pending} checked={selected.has(r.id)} onChange={(e) => { const n = new Set(selected); if (e.target.checked) n.add(r.id); else n.delete(r.id); setSelected(n) }} aria-label={r.name} /></label> },
    { key: 'name', header: t('bonus.rep'), cell: (r) => <div className="row"><Avatar name={r.name} /><div><span className="cell-strong">{r.name}</span><a className="cell-sub num" href={telHref(r.phone)} onClick={(e) => e.stopPropagation()}>{r.phone}</a></div></div> },
    { key: 'ph', header: t('bonus.pharmacy'), hideSm: true, cell: (r) => <span className="muted">{pharmacies.data?.find((p) => p.id === r.pharmacyId)?.name ?? '—'}</span> },
    { key: 'alloc', header: t('bonus.allocated'), align: 'right', hideSm: true, cell: (r) => <span className="num">{num(sum(r.id)?.allocated ?? 0)}</span> },
    { key: 'sold', header: t('bonus.sold'), align: 'right', cell: (r) => <b className="num">{num(sum(r.id)?.sold ?? 0)}</b> },
    { key: 'hand', header: t('bonus.onHand'), align: 'right', hideSm: true, cell: (r) => <span className="num">{num(sum(r.id)?.onHand ?? 0)}</span> },
    { key: 'pending', header: t('bonus.pending'), align: 'right', cell: (r) => <b className="num" style={{ color: sum(r.id)?.pending ? 'var(--gold-ink)' : 'var(--ink-3)' }}>{money(sum(r.id)?.pending ?? 0, lang)}</b> },
    { key: 'paid', header: t('bonus.paid'), align: 'right', hideSm: true, cell: (r) => <span className="num muted">{money(sum(r.id)?.paid ?? 0, lang)}</span> },
    { key: 'st', header: t('common.status'), hideSm: true, cell: (r) => <Pill tone={r.active ? 'success' : undefined}>{r.active ? t('common.active') : t('common.inactive')}</Pill> },
  ]

  return (
    <>
      <Panel flush title={`${t('bonus.totalPending')}: ${money(totalPending, lang)}`} actions={<div className="row-wrap">
        <Button size="sm" icon={<Plus />} onClick={() => setEditing({ active: true })}>{t('bonus.addRep')}</Button>
        <Button size="sm" variant="primary" icon={<Wallet />} disabled={!selected.size} onClick={() => setConfirm(true)}>{t('bonus.pay')} {selected.size ? `(${money(pendingSelected, lang)})` : ''}</Button>
      </div>}>
        {reps.error ? <div className="panel__body"><ErrorBox error={reps.error} onRetry={reps.refetch} /></div>
          : !reps.data || !summaries.data ? <SkeletonRows rows={8} cols={6} />
          : <DataTable rows={reps.data} columns={columns} rowKey={(r) => r.id} onRowClick={(r) => setEditing(r)} empty={<EmptyState icon={<Gift />} title={t('bonus.reps')} />} />}
      </Panel>
      <ConfirmDialog open={confirm} onClose={() => setConfirm(false)} loading={payout.pending} title={t('bonus.payTitle')}
        text={t('bonus.payText', { n: selected.size, amount: num(pendingSelected) })} confirmLabel={t('bonus.pay')}
        onConfirm={async () => {
          try { const r = await payout.run([...selected]); toast(t('bonus.paidOk', { amount: num(r.amount) })); setSelected(new Set()); setConfirm(false); invalidate('reps', 'bonuses') }
          catch (e) { toast(errorText(e, t), 'error') }
        }} />
      <RepEditor value={editing} onClose={() => setEditing(null)} />
    </>
  )
}

function RepEditor({ value, onClose }: { value: Partial<Rep> | null; onClose: () => void }) {
  const { t, lang } = useI18n()
  const toast = useToast()
  const pharmacies = useQuery('pharmacies', () => api.pharmacies.list())
  const [form, setForm] = useState<Partial<Rep>>({})
  const [shown, setShown] = useState<Partial<Rep> | null>(null)
  if (value !== shown) { setShown(value); setForm(value ?? {}) }
  const save = useMutation(() => api.bonus.saveRep({ id: form.id, name: form.name ?? '', phone: form.phone ?? '', city: form.city ?? '', pharmacyId: form.pharmacyId ?? null, active: form.active ?? true }))
  const valid = (form.name ?? '').trim().length > 2 && (form.phone ?? '').replace(/\D/g, '').length >= 9
  return (
    <Drawer open={!!value} onClose={onClose} title={form.id ? t('bonus.editRep') : t('bonus.addRep')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valid} loading={save.pending} onClick={async () => {
        try { await save.run(); invalidate('reps'); toast(t('bonus.repSaved')); onClose() } catch (e) { toast(errorText(e, t), 'error') }
      }}>{t('common.save')}</Button></>}>
      <Field label={t('common.name')}><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label={t('common.phone')}><Input value={form.phone ?? ''} inputMode="tel" placeholder="+998 90 123 45 67" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={t('bonus.pharmacy')}>
        <Select value={form.pharmacyId ?? ''} onChange={(e) => { const ph = pharmacies.data?.find((p) => p.id === e.target.value); setForm({ ...form, pharmacyId: e.target.value || null, city: ph?.city ?? form.city }) }}>
          <option value="">—</option>
          {pharmacies.data?.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </Select>
      </Field>
      <Field label={t('common.city')}><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
      <Switch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} label={t('common.active')} />
      {form.joinedAt && <p className="faint">{t('bonus.joined')}: {date(form.joinedAt, lang)}</p>}
    </Drawer>
  )
}

function Allocations() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const { reps, products } = useRefs()
  const allocations = useQuery('bonuses:allocations', () => api.bonus.allocations())
  const [repId, setRepId] = useState('')
  const [productId, setProductId] = useState('')
  const [qty, setQty] = useState('')
  const allocate = useMutation(() => api.bonus.allocate({ repId, productId: Number(productId), qty: Math.round(Number(qty)) }))
  const product = products.data?.find((p) => p.id === Number(productId))
  const valid = repId && productId && Number(qty) > 0 && (!product || Number(qty) <= product.stock)

  return (
    <div className="grid-main-side" style={{ gridTemplateColumns: 'minmax(0,1fr) 340px' }}>
      <Panel title={t('bonus.allocations')} flush>
        {!allocations.data || !reps.data || !products.data ? <SkeletonRows rows={8} cols={4} /> : (
          <DataTable rows={allocations.data.slice(0, 80)} rowKey={(a) => a.id} columns={[
            { key: 'at', header: t('common.date'), cell: (a) => <span className="nowrap">{dateTime(a.at, lang)}</span> },
            { key: 'rep', header: t('bonus.rep'), cell: (a) => reps.data!.find((r) => r.id === a.repId)?.name ?? '—' },
            { key: 'p', header: t('common.name'), cell: (a) => { const p = products.data!.find((x) => x.id === a.productId); return p ? <div className="row"><Thumb src={p.image} /><span>{tx(p.name)}</span></div> : '—' } },
            { key: 'q', header: t('common.qty'), align: 'right', cell: (a) => <b className="num">{a.qty}</b> },
            { key: 'by', header: t('bonus.byWhom'), hideSm: true, cell: (a) => <span className="muted">{a.by}</span> },
          ]} />
        )}
      </Panel>
      <Panel title={t('bonus.allocate')}>
        <div className="stack">
          <Field label={t('bonus.rep')}>
            <Select value={repId} onChange={(e) => setRepId(e.target.value)}>
              <option value="">{t('bonus.selectRep')}</option>
              {reps.data?.filter((r) => r.active).map((r) => <option key={r.id} value={r.id}>{r.name} · {r.city}</option>)}
            </Select>
          </Field>
          <Field label={t('common.name')} hint={product ? t('bonus.inStock', { n: product.stock }) : undefined}>
            <Select value={productId} onChange={(e) => setProductId(e.target.value)}>
              <option value="">{t('bonus.selectProduct')}</option>
              {products.data?.filter((p) => p.line === 'supplement').map((p) => <option key={p.id} value={p.id}>{tx(p.name)} ({p.stock})</option>)}
            </Select>
          </Field>
          <Field label={`${t('common.qty')} (${t('common.pcs')})`} error={product && Number(qty) > product.stock ? t('bonus.notEnough') : undefined}>
            <Input type="number" min={1} value={qty} onChange={(e) => setQty(e.target.value)} />
          </Field>
          {product && <p className="faint" style={{ fontSize: 12.5 }}>{t('products.bonus')}: <b>{money(product.bonusPerUnit, lang)}</b></p>}
          <Button variant="primary" icon={<PackagePlus />} disabled={!valid} loading={allocate.pending} onClick={async () => {
            try { await allocate.run(); toast(t('bonus.allocated.ok', { qty })); setQty(''); invalidate('bonuses', 'reps', 'products', 'stock', 'inbox', 'badges') }
            catch (e) { toast(e instanceof ApiError && e.status === 422 ? t('bonus.notEnough') : errorText(e, t), 'error') }
          }}>{t('bonus.allocate')}</Button>
        </div>
      </Panel>
    </div>
  )
}

function Sales() {
  const { t, tx, lang } = useI18n()
  const { reps, products, pharmacies } = useRefs()
  const sales = useQuery('bonuses:sales', () => api.bonus.sales())
  const [repId, setRepId] = useState('')
  const list = useMemo(() => (sales.data ?? []).filter((s) => !repId || s.repId === repId), [sales.data, repId])
  return (
    <Panel flush title={`${t('bonus.sales')} · ${num(list.reduce((s, x) => s + x.qty, 0))} ${t('common.pcs')} · ${money(list.reduce((s, x) => s + x.bonus, 0), lang)}`} actions={
      <Select size="sm" value={repId} onChange={(e) => setRepId(e.target.value)} style={{ width: 'auto' }} aria-label={t('bonus.rep')}>
        <option value="">{t('common.all')}</option>
        {reps.data?.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
      </Select>
    }>
      {!sales.data || !products.data || !reps.data ? <SkeletonRows rows={8} cols={5} /> : (
        <DataTable rows={list.slice(0, 120)} rowKey={(s) => s.id} empty={<EmptyState title={t('common.notFound')} />} columns={[
          { key: 'at', header: t('common.date'), cell: (s) => <span className="nowrap">{dateTime(s.at, lang)}</span> },
          { key: 'rep', header: t('bonus.rep'), cell: (s) => reps.data!.find((r) => r.id === s.repId)?.name ?? '—' },
          { key: 'p', header: t('common.name'), cell: (s) => { const p = products.data!.find((x) => x.id === s.productId); return p ? <div className="row"><Thumb src={p.image} /><span>{tx(p.name)}</span></div> : '—' } },
          { key: 'ph', header: t('bonus.pharmacy'), hideSm: true, cell: (s) => <span className="muted">{pharmacies.data?.find((p) => p.id === s.pharmacyId)?.name ?? '—'}</span> },
          { key: 'q', header: t('common.qty'), align: 'right', cell: (s) => <b className="num">{s.qty}</b> },
          { key: 'b', header: t('bonus.bonus'), align: 'right', cell: (s) => <span className="num">{money(s.bonus, lang)}</span> },
        ]} />
      )}
    </Panel>
  )
}

function Payouts() {
  const { t, lang } = useI18n()
  const { reps } = useRefs()
  const [status, setStatus] = useState<BonusStatus | 'all'>('pending')
  const bonuses = useQuery(`bonuses:list:${status}`, () => api.bonus.bonuses({ status }))
  const total = (bonuses.data ?? []).reduce((s, b) => s + b.amount, 0)
  return (
    <Panel flush title={`${money(total, lang)}`} actions={<Segmented<BonusStatus | 'all'> value={status} onChange={setStatus} options={[
      { value: 'pending', label: t('bonus.pending') }, { value: 'paid', label: t('bonus.paid') }, { value: 'all', label: t('common.all') },
    ]} />}>
      {!bonuses.data || !reps.data ? <Skeleton h={300} /> : bonuses.data.length === 0 ? <EmptyState icon={<Wallet />} title={t('bonus.nothingToPay')} /> : (
        <DataTable rows={bonuses.data.slice(0, 150)} rowKey={(b) => b.id} columns={[
          { key: 'at', header: t('common.date'), cell: (b) => <span className="nowrap">{date(b.at, lang)}</span> },
          { key: 'rep', header: t('bonus.rep'), cell: (b) => reps.data!.find((r) => r.id === b.repId)?.name ?? '—' },
          { key: 'amount', header: t('bonus.bonus'), align: 'right', cell: (b) => <b className="num">{money(b.amount, lang)}</b> },
          { key: 'st', header: t('common.status'), cell: (b) => <Pill tone={b.status === 'paid' ? 'success' : 'warning'}>{b.status === 'paid' ? t('bonus.paid') : t('bonus.pending')}</Pill> },
          { key: 'paidAt', header: t('bonus.paid'), hideSm: true, cell: (b) => b.paidAt ? date(b.paidAt, lang) : <span className="faint">—</span> },
        ]} />
      )}
    </Panel>
  )
}
