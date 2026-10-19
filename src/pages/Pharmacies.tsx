import { useState } from 'react'
import { Phone, Plus, Store } from 'lucide-react'
import { api, type Pharmacy } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { num, telHref } from '../lib/format'
import { Button, DataTable, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, SkeletonRows, Skeleton, Switch, Thumb, errorText, type Column } from '../components/ui'
import { TileMap } from '../components/TileMap'
import { useToast } from '../components/Toast'

export function PharmaciesPage() {
  const { t } = useI18n()
  const pharmacies = useQuery('pharmacies', () => api.pharmacies.list())
  const reps = useQuery('reps', () => api.bonus.reps())
  const [selected, setSelected] = useState<string | null>(null)
  const [editing, setEditing] = useState<Partial<Pharmacy> | null>(null)
  const current = pharmacies.data?.find((p) => p.id === selected) ?? null

  const columns: Column<Pharmacy>[] = [
    { key: 'name', header: t('common.name'), cell: (p) => <div><span className="cell-strong">{p.name}</span><span className="cell-sub">{p.address}</span></div> },
    { key: 'city', header: t('common.city'), cell: (p) => p.city },
    { key: 'type', header: '', hideSm: true, cell: (p) => <Pill tone={p.own ? 'gold' : undefined} plain>{p.own ? t('ph.own') : t('ph.partner')}</Pill> },
    { key: 'manager', header: t('ph.manager'), hideSm: true, cell: (p) => <div><span>{p.manager}</span><a className="cell-sub num" href={telHref(p.phone)} onClick={(e) => e.stopPropagation()}>{p.phone}</a></div> },
    { key: 'sku', header: t('ph.products'), align: 'right', cell: (p) => <span className="num">{p.stock.filter((s) => s.qty > 0).length}</span> },
    { key: 'units', header: t('ph.units'), align: 'right', cell: (p) => <b className="num">{num(p.stock.reduce((s, x) => s + x.qty, 0))}</b> },
    { key: 'reps', header: t('ph.reps'), align: 'right', hideSm: true, cell: (p) => <span className="num">{reps.data?.filter((r) => r.pharmacyId === p.id).length ?? '—'}</span> },
    { key: 'status', header: t('common.status'), cell: (p) => <Pill tone={p.active ? 'success' : undefined}>{p.active ? t('common.active') : t('common.inactive')}</Pill> },
  ]

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <PageHeader title={t('ph.title')} sub={t('ph.sub')} actions={<Button variant="primary" icon={<Plus />} onClick={() => setEditing({ active: true, own: false, city: 'Andijon', lat: 40.7821, lon: 72.3442, stock: [] })}>{t('ph.add')}</Button>} />
      {pharmacies.error ? <ErrorBox error={pharmacies.error} onRetry={pharmacies.refetch} /> : null}
      <Panel flush>
        {pharmacies.data ? (
          <div style={{ padding: 12 }}>
            <TileMap height={300} maxZoom={9} padding={40} markers={pharmacies.data.map((p) => ({
              id: p.id, lat: p.lat, lon: p.lon, kind: 'dot', own: p.own, off: !p.active, title: `${p.name} · ${num(p.stock.reduce((s, x) => s + x.qty, 0))} ${t('common.pcs')}`,
              size: p.own ? 20 : 16,
            }))} />
            <div className="legend" style={{ marginTop: 10, paddingLeft: 4 }}>
              <span><i style={{ background: 'var(--espresso)' }} />{t('ph.own')}</span>
              <span><i style={{ background: 'rgba(154,118,56,.75)' }} />{t('ph.partner')}</span>
              <span><i style={{ background: 'rgba(117,105,91,.6)' }} />{t('common.inactive')}</span>
            </div>
          </div>
        ) : <div className="panel__body"><Skeleton h={300} /></div>}
      </Panel>
      <div className="panel">
        {!pharmacies.data ? <SkeletonRows rows={6} cols={6} /> : (
          <DataTable rows={pharmacies.data} columns={columns} rowKey={(p) => p.id} onRowClick={(p) => setSelected(p.id)} selectedKey={selected}
            empty={<EmptyState icon={<Store />} title={t('ph.title')} />} />
        )}
      </div>
      <Drawer open={!!current} onClose={() => setSelected(null)} title={current?.name ?? ''} wide>
        {current && <PharmacyDetail pharmacy={current} onEdit={() => { setEditing(current); setSelected(null) }} />}
      </Drawer>
      <PharmacyEditor value={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function PharmacyDetail({ pharmacy, onEdit }: { pharmacy: Pharmacy; onEdit: () => void }) {
  const { t, tx } = useI18n()
  const toast = useToast()
  const products = useQuery('products:all', () => api.products.list())
  const reps = useQuery('reps', () => api.bonus.reps())
  const [draft, setDraft] = useState<Record<number, string>>({})
  const setStock = useMutation((productId: number, qty: number) => api.pharmacies.setStock(pharmacy.id, productId, qty))
  const qtyOf = (id: number) => pharmacy.stock.find((s) => s.productId === id)?.qty ?? 0
  return (
    <>
      <div className="row-wrap">
        <Pill tone={pharmacy.own ? 'gold' : undefined} plain>{pharmacy.own ? t('ph.own') : t('ph.partner')}</Pill>
        <span className="muted">{pharmacy.city} · {pharmacy.address}</span>
        <span className="right row"><a className="btn btn--secondary btn--sm" href={telHref(pharmacy.phone)}><Phone />{pharmacy.phone}</a><Button size="sm" onClick={onEdit}>{t('common.edit')}</Button></span>
      </div>
      <TileMap height={180} zoom={15} center={{ lat: pharmacy.lat, lon: pharmacy.lon }} markers={[{ id: 'p', kind: 'pin', lat: pharmacy.lat, lon: pharmacy.lon }]} />
      {reps.data && reps.data.some((r) => r.pharmacyId === pharmacy.id) && (
        <div><div className="section-title">{t('ph.reps')}</div><div className="row-wrap">{reps.data.filter((r) => r.pharmacyId === pharmacy.id).map((r) => <Pill key={r.id} plain>{r.name}</Pill>)}</div></div>
      )}
      <Panel title={t('ph.stock')} flush>
        {!products.data ? <Skeleton h={200} /> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>{t('common.name')}</th><th className="t-right">{t('ph.stock')}</th><th /></tr></thead>
              <tbody>
                {products.data.map((p) => {
                  const value = draft[p.id] ?? String(qtyOf(p.id))
                  const dirty = draft[p.id] !== undefined && Number(draft[p.id]) !== qtyOf(p.id)
                  return (
                    <tr key={p.id}>
                      <td><div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><span>{tx(p.name)}</span></div></td>
                      <td className="t-right"><Input size="sm" type="number" min={0} value={value} onChange={(e) => setDraft({ ...draft, [p.id]: e.target.value })} style={{ width: 90, textAlign: 'right', marginLeft: 'auto' }} aria-label={tx(p.name)} /></td>
                      <td className="t-right" style={{ width: 110 }}>{dirty && <Button size="sm" variant="primary" loading={setStock.pending} onClick={async () => {
                        try { await setStock.run(p.id, Math.max(0, Math.round(Number(value)))); invalidate('pharmacies'); const next = { ...draft }; delete next[p.id]; setDraft(next); toast(t('ph.stockSaved')) }
                        catch (e) { toast(errorText(e, t), 'error') }
                      }}>{t('common.save')}</Button>}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  )
}

function PharmacyEditor({ value, onClose }: { value: Partial<Pharmacy> | null; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<Partial<Pharmacy>>({})
  const [shown, setShown] = useState<Partial<Pharmacy> | null>(null)
  if (value !== shown) { setShown(value); setForm(value ?? {}) }
  const save = useMutation(() => api.pharmacies.save({
    id: form.id, name: form.name ?? '', city: form.city ?? '', address: form.address ?? '', lat: Number(form.lat ?? 0), lon: Number(form.lon ?? 0),
    phone: form.phone ?? '', manager: form.manager ?? '', active: form.active ?? true, own: form.own ?? false, stock: form.stock ?? [],
  }))
  const valid = (form.name ?? '').trim().length > 2 && (form.city ?? '').trim()
  return (
    <Drawer open={!!value} onClose={onClose} title={form.id ? t('ph.edit') : t('ph.add')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valid} loading={save.pending} onClick={async () => {
        try { await save.run(); invalidate('pharmacies'); toast(t('ph.saved')); onClose() } catch (e) { toast(errorText(e, t), 'error') }
      }}>{t('common.save')}</Button></>}>
      <Field label={t('common.name')}><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <div className="form-grid">
        <Field label={t('common.city')}><Input value={form.city ?? ''} onChange={(e) => setForm({ ...form, city: e.target.value })} /></Field>
        <Field label={t('common.phone')}><Input value={form.phone ?? ''} inputMode="tel" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      </div>
      <Field label={t('common.address')}><Input value={form.address ?? ''} onChange={(e) => setForm({ ...form, address: e.target.value })} /></Field>
      <Field label={t('ph.manager')}><Input value={form.manager ?? ''} onChange={(e) => setForm({ ...form, manager: e.target.value })} /></Field>
      <div className="form-grid">
        <Field label={t('ph.lat')}><Input type="number" step="0.0001" value={form.lat ?? ''} onChange={(e) => setForm({ ...form, lat: Number(e.target.value) })} /></Field>
        <Field label={t('ph.lon')}><Input type="number" step="0.0001" value={form.lon ?? ''} onChange={(e) => setForm({ ...form, lon: Number(e.target.value) })} /></Field>
      </div>
      {form.lat && form.lon ? <TileMap height={160} zoom={14} center={{ lat: Number(form.lat), lon: Number(form.lon) }} markers={[{ id: 'p', kind: 'pin', lat: Number(form.lat), lon: Number(form.lon) }]} /> : null}
      <div className="row-wrap">
        <Switch checked={form.active ?? true} onChange={(v) => setForm({ ...form, active: v })} label={t('common.active')} />
        <Switch checked={form.own ?? false} onChange={(v) => setForm({ ...form, own: v })} label={t('ph.own')} />
      </div>
    </Drawer>
  )
}
