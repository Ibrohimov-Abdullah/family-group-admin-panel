import { useEffect, useState } from 'react'
import { Pencil, Plus, Tag, Trash2 } from 'lucide-react'
import { api, type DeliverySettings, type Product, type Promo, type PromoType } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { date, money, num } from '../lib/format'
import { Button, ConfirmDialog, DataTable, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, Select, Skeleton, SkeletonRows, Switch, Tabs, Thumb, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'
import { ApiError } from '../api'
import type { DictKey } from '../lib/dict'

type Tab = 'codes' | 'sales' | 'prices' | 'delivery'

export function PromotionsPage() {
  const { t } = useI18n()
  const [tab, setTab] = useState<Tab>('codes')
  return (
    <div>
      <PageHeader title={t('promo.title')} sub={t('promo.sub')} />
      <Tabs<Tab> value={tab} onChange={setTab} tabs={[
        { value: 'codes', label: t('promo.codes') }, { value: 'sales', label: t('promo.sales') },
        { value: 'prices', label: t('promo.prices') }, { value: 'delivery', label: t('promo.delivery') },
      ]} />
      {tab === 'codes' && <PromoCodes />}
      {tab === 'sales' && <SalePrices />}
      {tab === 'prices' && <BulkPrices />}
      {tab === 'delivery' && <DeliveryRules />}
    </div>
  )
}

/* ------------------------------------------------------------ promo codes */

function promoValue(p: Promo, lang: 'uz' | 'ru', freeLabel: string) {
  if (p.type === 'percent') return `−${p.value}%`
  if (p.type === 'fixed') return `−${money(p.value, lang)}`
  return freeLabel
}

function PromoCodes() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const promos = useQuery('promos', () => api.promos.list())
  const [editing, setEditing] = useState<Partial<Promo> | null>(null)
  const [removing, setRemoving] = useState<Promo | null>(null)
  const remove = useMutation((id: string) => api.promos.remove(id))

  const toggle = async (p: Promo, active: boolean) => {
    try { await api.promos.update(p.id, { active }); invalidate('promos'); toast(t('promo.saved')) } catch (e) { toast(errorText(e, t), 'error') }
  }

  const columns: Column<Promo>[] = [
    { key: 'code', header: t('promo.code'), cell: (p) => <span className="tag mono" style={{ fontSize: 12 }}>{p.code}</span> },
    { key: 'value', header: t('promo.value'), cell: (p) => <div><b>{promoValue(p, lang, t('promo.type.free_delivery'))}</b><span className="cell-sub">{t(`promo.type.${p.type}` as DictKey)}</span></div> },
    { key: 'min', header: t('promo.minOrder'), hideSm: true, align: 'right', cell: (p) => p.minOrder ? <span className="num">{money(p.minOrder, lang)}</span> : <span className="faint">—</span> },
    { key: 'dates', header: t('promo.ends'), hideSm: true, cell: (p) => <span className="nowrap">{date(p.startsAt, lang)} → {p.endsAt ? date(p.endsAt, lang) : t('promo.noEnd')}</span> },
    { key: 'used', header: t('promo.used'), align: 'right', cell: (p) => (
      <div style={{ minWidth: 90 }}>
        <span className="num"><b>{num(p.used)}</b>{p.usageLimit ? ` / ${num(p.usageLimit)}` : ''}</span>
        {p.usageLimit ? <div className="bar-row__track" style={{ marginTop: 5 }}><div className="bar-row__fill" style={{ width: `${Math.min(100, (p.used / p.usageLimit) * 100)}%` }} /></div> : null}
      </div>
    ) },
    { key: 'active', header: t('common.status'), cell: (p) => {
      const expired = p.endsAt && Date.parse(p.endsAt) < Date.now()
      return expired ? <Pill>{lang === 'uz' ? 'Muddati tugagan' : 'Истёк'}</Pill> : <span onClick={(e) => e.stopPropagation()}><Switch checked={p.active} onChange={(v) => void toggle(p, v)} label={p.active ? t('common.active') : t('common.inactive')} /></span>
    } },
    { key: 'act', header: '', align: 'right', cell: (p) => (
      <div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
        <Button size="sm" variant="ghost" iconOnly icon={<Pencil />} aria-label={t('common.edit')} onClick={() => setEditing(p)} />
        <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('common.delete')} onClick={() => setRemoving(p)} />
      </div>
    ) },
  ]

  return (
    <>
      <Panel title={t('promo.codes')} flush actions={<Button variant="primary" size="sm" icon={<Plus />} onClick={() => setEditing({ type: 'percent', value: 10, minOrder: 0, active: true, startsAt: new Date().toISOString(), endsAt: null, usageLimit: null })}>{t('promo.new')}</Button>}>
        {promos.error ? <div className="panel__body"><ErrorBox error={promos.error} onRetry={promos.refetch} /></div>
          : !promos.data ? <SkeletonRows rows={4} cols={5} />
          : <DataTable rows={promos.data} columns={columns} rowKey={(p) => p.id} empty={<EmptyState icon={<Tag />} title={t('promo.codes')} />} />}
      </Panel>
      <PromoEditor value={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} tone="danger" loading={remove.pending}
        title={t('promo.deleteTitle', { code: removing?.code ?? '' })} text={t('promo.deleteText')} confirmLabel={t('common.delete')}
        onConfirm={async () => { if (!removing) return; try { await remove.run(removing.id); invalidate('promos'); toast(t('promo.deleted')); setRemoving(null) } catch (e) { toast(errorText(e, t), 'error') } }} />
    </>
  )
}

function PromoEditor({ value, onClose }: { value: Partial<Promo> | null; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<Partial<Promo>>({})
  const [error, setError] = useState('')
  useEffect(() => { setForm(value ?? {}); setError('') }, [value])
  const save = useMutation(async () => {
    const body = {
      code: (form.code ?? '').toUpperCase().trim(), type: form.type ?? 'percent', value: Number(form.value ?? 0), minOrder: Number(form.minOrder ?? 0),
      startsAt: form.startsAt ?? new Date().toISOString(), endsAt: form.endsAt ?? null, usageLimit: form.usageLimit ? Number(form.usageLimit) : null, active: form.active ?? true,
    }
    return form.id ? api.promos.update(form.id, body) : api.promos.create(body)
  })
  const codeOk = /^[A-Z0-9]{3,20}$/i.test(form.code ?? '')
  const valueOk = form.type === 'free_delivery' || (form.type === 'percent' ? Number(form.value) >= 1 && Number(form.value) <= 90 : Number(form.value) >= 1000)
  const onSave = async () => {
    if (!codeOk) { setError(t('promo.errCode')); return }
    try { await save.run(); invalidate('promos'); toast(t('promo.saved')); onClose() }
    catch (e) { if (e instanceof ApiError && e.status === 409) setError(t('promo.dup')); else toast(errorText(e, t), 'error') }
  }
  return (
    <Drawer open={!!value} onClose={onClose} title={form.id ? form.code : t('promo.new')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valueOk} loading={save.pending} onClick={() => void onSave()}>{t('common.save')}</Button></>}>
      <Field label={t('promo.code')} error={error || undefined} hint="A–Z, 0–9">
        <Input value={form.code ?? ''} onChange={(e) => { setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') }); setError('') }} className="mono" placeholder="YANGI10" autoFocus />
      </Field>
      <Field label={t('promo.type')}>
        <Select value={form.type ?? 'percent'} onChange={(e) => setForm({ ...form, type: e.target.value as PromoType })}>
          {(['percent', 'fixed', 'free_delivery'] as const).map((k) => <option key={k} value={k}>{t(`promo.type.${k}` as DictKey)}</option>)}
        </Select>
      </Field>
      {form.type !== 'free_delivery' && (
        <Field label={`${t('promo.value')} (${form.type === 'fixed' ? t('common.sum') : '%'})`}>
          <Input type="number" min={1} value={form.value ?? ''} onChange={(e) => setForm({ ...form, value: Number(e.target.value) })} />
        </Field>
      )}
      <Field label={`${t('promo.minOrder')} (${t('common.sum')})`}><Input type="number" min={0} step={1000} value={form.minOrder ?? 0} onChange={(e) => setForm({ ...form, minOrder: Number(e.target.value) })} /></Field>
      <div className="form-grid">
        <Field label={t('promo.starts')}><Input type="date" value={(form.startsAt ?? '').slice(0, 10)} onChange={(e) => setForm({ ...form, startsAt: new Date(`${e.target.value}T00:00:00`).toISOString() })} /></Field>
        <Field label={t('promo.ends')} hint={t('promo.noEnd')}><Input type="date" value={(form.endsAt ?? '').slice(0, 10)} onChange={(e) => setForm({ ...form, endsAt: e.target.value ? new Date(`${e.target.value}T23:59:00`).toISOString() : null })} /></Field>
      </div>
      <Field label={t('promo.limit')} hint={t('promo.noLimit')}><Input type="number" min={1} value={form.usageLimit ?? ''} onChange={(e) => setForm({ ...form, usageLimit: e.target.value ? Number(e.target.value) : null })} /></Field>
      <Switch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} label={t('common.active')} />
    </Drawer>
  )
}

/* ------------------------------------------------------------ sale prices */

function SalePrices() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const products = useQuery('products:all', () => api.products.list())
  const [draft, setDraft] = useState<Record<number, { price: string; ends: string }>>({})
  const [busy, setBusy] = useState<number | null>(null)

  const apply = async (p: Product, on: boolean) => {
    setBusy(p.id)
    try {
      const d = draft[p.id]
      const sale = on ? Number(d?.price || Math.round((p.price * 0.9) / 100) * 100) : null
      if (on && (!sale || sale >= p.price)) { toast(t('products.errSale'), 'error'); return }
      await api.products.update(p.id, { salePrice: sale, saleEndsAt: on ? (d?.ends ? new Date(`${d.ends}T23:59:00`).toISOString() : null) : null })
      invalidate('products', `product:${p.id}`)
      toast(t('products.saved'))
    } catch (e) { toast(errorText(e, t), 'error') } finally { setBusy(null) }
  }

  if (products.error) return <ErrorBox error={products.error} onRetry={products.refetch} />
  if (!products.data) return <Skeleton h={320} r={14} />
  const sorted = [...products.data].sort((a, b) => Number(!!b.salePrice) - Number(!!a.salePrice))
  return (
    <Panel title={t('promo.sales')} flush>
      <DataTable rows={sorted} rowKey={(p) => String(p.id)} columns={[
        { key: 'p', header: t('common.name'), cell: (p) => <div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><b>{tx(p.name)}</b></div> },
        { key: 'price', header: t('common.price'), align: 'right', cell: (p) => <span className="num">{money(p.price, lang)}</span> },
        { key: 'sale', header: t('products.salePrice'), cell: (p) => p.salePrice ? (
          <div><b className="num" style={{ color: 'var(--danger)' }}>{money(p.salePrice, lang)}</b><span className="cell-sub">−{Math.round((1 - p.salePrice / p.price) * 100)}% · {p.saleEndsAt ? date(p.saleEndsAt, lang) : t('promo.noEnd')}</span></div>
        ) : (
          <div className="row" style={{ gap: 6 }}>
            <Input size="sm" type="number" placeholder={String(Math.round((p.price * 0.9) / 100) * 100)} value={draft[p.id]?.price ?? ''} style={{ width: 110 }} onChange={(e) => setDraft({ ...draft, [p.id]: { ...draft[p.id], price: e.target.value, ends: draft[p.id]?.ends ?? '' } })} aria-label={t('products.salePrice')} />
            <Input size="sm" type="date" value={draft[p.id]?.ends ?? ''} style={{ width: 150 }} className="hide-sm" onChange={(e) => setDraft({ ...draft, [p.id]: { ...draft[p.id], ends: e.target.value, price: draft[p.id]?.price ?? '' } })} aria-label={t('products.saleEnds')} />
          </div>
        ) },
        { key: 'act', header: '', align: 'right', cell: (p) => p.salePrice
          ? <Button size="sm" variant="danger" loading={busy === p.id} onClick={() => void apply(p, false)}>{t('promo.endSale')}</Button>
          : <Button size="sm" variant="primary" loading={busy === p.id} onClick={() => void apply(p, true)}>{t('promo.startSale')}</Button> },
      ]} />
    </Panel>
  )
}

/* ------------------------------------------------------------ bulk prices */

function BulkPrices() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const products = useQuery('products:all', () => api.products.list())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [pctValue, setPct] = useState('5')
  const [busy, setBusy] = useState(false)
  if (!products.data) return <Skeleton h={320} r={14} />
  const pct = Number(pctValue) || 0
  const newPrice = (p: Product) => Math.max(1000, Math.round((p.price * (1 + pct / 100)) / 100) * 100)
  const all = selected.size === products.data.length

  const apply = async () => {
    setBusy(true)
    try {
      for (const id of selected) {
        const p = products.data!.find((x) => x.id === id)!
        await api.products.update(id, { price: newPrice(p) })
      }
      invalidate('products', 'product:')
      toast(t('promo.applied', { n: selected.size }))
      setSelected(new Set())
    } catch (e) { toast(errorText(e, t), 'error') } finally { setBusy(false) }
  }

  return (
    <Panel title={t('promo.prices')} flush actions={
      <div className="row-wrap">
        <Field><div className="row" style={{ gap: 6 }}><Input size="sm" type="number" value={pctValue} onChange={(e) => setPct(e.target.value)} style={{ width: 90 }} aria-label={t('promo.bulkPct')} /><span className="faint">%</span></div></Field>
        <Button size="sm" variant="primary" disabled={!selected.size || !pct} loading={busy} onClick={() => void apply()}>{t('promo.apply')} ({selected.size})</Button>
      </div>
    }>
      <div className="table-wrap">
        <table className="table">
          <thead><tr>
            <th style={{ width: 40 }}><label className="check"><input type="checkbox" checked={all} onChange={(e) => setSelected(e.target.checked ? new Set(products.data!.map((p) => p.id)) : new Set())} aria-label={t('common.all')} /></label></th>
            <th>{t('common.name')}</th><th className="t-right">{t('promo.oldPrice')}</th><th className="t-right">{t('promo.newPrice')}</th>
          </tr></thead>
          <tbody>
            {products.data.map((p) => {
              const on = selected.has(p.id)
              return (
                <tr key={p.id} className={on ? 'is-selected' : undefined}>
                  <td><label className="check"><input type="checkbox" checked={on} onChange={(e) => { const next = new Set(selected); if (e.target.checked) next.add(p.id); else next.delete(p.id); setSelected(next) }} aria-label={tx(p.name)} /></label></td>
                  <td><div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><b>{tx(p.name)}</b></div></td>
                  <td className="t-right num">{money(p.price, lang)}</td>
                  <td className="t-right num">{on ? <b style={{ color: pct > 0 ? 'var(--success)' : 'var(--danger)' }}>{money(newPrice(p), lang)}</b> : <span className="faint">—</span>}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <div className="panel__foot faint" style={{ fontSize: 12.5 }}>{t('promo.bulkPct')} · {lang === 'uz' ? "100 so'mgacha yaxlitlanadi" : 'Округляется до 100 сум'}</div>
    </Panel>
  )
}

/* ---------------------------------------------------------- delivery rules */

function DeliveryRules() {
  const { t, lang } = useI18n()
  const toast = useToast()
  const settings = useQuery('settings', () => api.settings.get())
  const [form, setForm] = useState<DeliverySettings | null>(null)
  useEffect(() => { if (settings.data) setForm(settings.data.delivery) }, [settings.data])
  const save = useMutation((delivery: DeliverySettings) => api.settings.update({ delivery }))
  if (!form) return <Skeleton h={280} r={14} />
  return (
    <Panel title={t('promo.delivery')} sub={t('promo.deliveryHint')} footer={<div className="row"><span className="faint grow" style={{ fontSize: 12.5 }}>{lang === 'uz' ? `Hozir: ${num(form.freeFrom)} so'mdan bepul, aks holda ${num(form.fee)} so'm` : `Сейчас: бесплатно от ${num(form.freeFrom)} сум, иначе ${num(form.fee)} сум`}</span>
      <Button variant="primary" loading={save.pending} onClick={async () => { try { await save.run(form); invalidate('settings'); toast(t('common.saved')) } catch (e) { toast(errorText(e, t), 'error') } }}>{t('common.save')}</Button></div>}>
      <div className="form-grid">
        <Field label={`${t('promo.freeFrom')} (${t('common.sum')})`}><Input type="number" min={0} step={1000} value={form.freeFrom} onChange={(e) => setForm({ ...form, freeFrom: Number(e.target.value) })} /></Field>
        <Field label={`${t('promo.fee')} (${t('common.sum')})`}><Input type="number" min={0} step={1000} value={form.fee} onChange={(e) => setForm({ ...form, fee: Number(e.target.value) })} /></Field>
        <Field label={t('promo.homeCity')}><Input value={form.homeCity} onChange={(e) => setForm({ ...form, homeCity: e.target.value })} /></Field>
        <Field label={t('promo.homeDays')}><Input value={form.homeCityDays} onChange={(e) => setForm({ ...form, homeCityDays: e.target.value })} /></Field>
        <Field label={t('promo.otherDays')}><Input value={form.otherCitiesDays} onChange={(e) => setForm({ ...form, otherCitiesDays: e.target.value })} /></Field>
      </div>
    </Panel>
  )
}
