import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, ImagePlus, PackageSearch, Plus, Search, Trash2 } from 'lucide-react'
import { api, type Category, type Product, type ProductInput, type ProductLine } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { money, num } from '../lib/format'
import { Button, DataTable, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, Segmented, Select, Skeleton, SkeletonRows, Switch, Textarea, Thumb, errorText, type Column } from '../components/ui'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

type LineFilter = ProductLine | 'all'

export function ProductsPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const [line, setLine] = useState<LineFilter>('all')
  const [q, setQ] = useState('')
  const products = useQuery('products:all', () => api.products.list())
  const categories = useQuery('categories', () => api.products.categories())

  const ql = q.trim().toLowerCase()
  const list = (products.data ?? []).filter((p) => (line === 'all' || p.line === line) && (!ql || `${p.name.uz} ${p.name.ru} ${p.sku}`.toLowerCase().includes(ql)))

  const toggleVisible = async (p: Product, visible: boolean) => {
    try { await api.products.update(p.id, { visible }); invalidate('products', `product:${p.id}`); toast(t('products.saved')) }
    catch (e) { toast(errorText(e, t), 'error') }
  }

  const columns: Column<Product>[] = [
    { key: 'name', header: t('common.name'), cell: (p) => (
      <div className="row"><Thumb src={p.image} cosmetic={p.line === 'cosmetic'} /><div style={{ minWidth: 0 }}><span className="cell-strong">{tx(p.name)}</span><span className="cell-sub">{p.sku} · {tx(p.subtitle)}</span></div></div>
    ) },
    { key: 'cat', header: t('products.category'), hideSm: true, cell: (p) => <span className="muted">{tx(categories.data?.find((c) => c.id === p.categoryId)?.name)}</span> },
    { key: 'price', header: t('common.price'), align: 'right', cell: (p) => p.salePrice ? (
      <div><b className="num" style={{ color: 'var(--danger)' }}>{money(p.salePrice, lang)}</b><span className="cell-sub num" style={{ textDecoration: 'line-through' }}>{money(p.price, lang)}</span></div>
    ) : <b className="num">{money(p.price, lang)}</b> },
    { key: 'stock', header: t('products.stock'), align: 'right', cell: (p) => (
      <span className="num" style={{ fontWeight: 800, color: p.stock === 0 ? 'var(--danger)' : p.stock <= p.lowStockAt ? 'var(--warning)' : undefined }}>{num(p.stock)}</span>
    ) },
    { key: 'badge', header: t('products.badge'), hideSm: true, cell: (p) => <div className="row" style={{ gap: 6 }}>{p.badge && <Pill tone="gold" plain>{t(`products.badge.${p.badge}` as DictKey)}</Pill>}{p.salePrice && <Pill tone="danger" plain>{t('products.onSale')}</Pill>}</div> },
    { key: 'visible', header: t('products.visible'), cell: (p) => <span onClick={(e) => e.stopPropagation()}><Switch checked={p.visible} onChange={(v) => void toggleVisible(p, v)} label={<span className="sr-only">{t('products.showOnSite')}</span>} /></span> },
  ]

  return (
    <div>
      <PageHeader title={t('products.title')} sub={t('products.sub')} actions={<Link to="/products/new" className="btn btn--primary"><Plus />{t('products.new')}</Link>} />
      <div className="panel">
        <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <Segmented<LineFilter> value={line} onChange={setLine} label={t('products.line')} options={[
            { value: 'all', label: t('common.all'), count: products.data?.length },
            { value: 'supplement', label: t('common.supplement'), count: products.data?.filter((p) => p.line === 'supplement').length },
            { value: 'cosmetic', label: t('common.cosmetic'), count: products.data?.filter((p) => p.line === 'cosmetic').length },
          ]} />
          <div className="input-icon right" style={{ width: 260, maxWidth: '100%' }}>
            <Search /><Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('products.searchPh')} aria-label={t('common.search')} />
          </div>
        </div>
        {products.error ? <div className="panel__body"><ErrorBox error={products.error} onRetry={products.refetch} /></div>
          : products.loading && !products.data ? <SkeletonRows rows={8} cols={5} />
          : <DataTable rows={list} columns={columns} rowKey={(p) => String(p.id)} onRowClick={(p) => navigate(`/products/${p.id}`)}
              empty={<EmptyState icon={<PackageSearch />} title={t('products.empty')} />} />}
      </div>
    </div>
  )
}

/* ---------------------------------------------------------------- editor */

const BLANK: ProductInput = {
  line: 'supplement', sku: '', name: { uz: '', ru: '' }, subtitle: { uz: '', ru: '' }, categoryId: 3, price: 0, salePrice: null, saleEndsAt: null,
  badge: 'new', image: '', description: { uz: '', ru: '' }, usage: { uz: '', ru: '' }, howToTake: { uz: '', ru: '' }, ingredients: [],
  visible: false, lowStockAt: 15, bonusPerUnit: 0, stock: 0,
}

export function ProductEditorPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const navigate = useNavigate()
  const { id } = useParams()
  const isNew = !id
  const product = useQuery(`product:${id}`, () => api.products.get(Number(id)), { enabled: !isNew })
  const categories = useQuery('categories', () => api.products.categories())
  const [form, setForm] = useState<ProductInput>(BLANK)
  const [touched, setTouched] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const save = useMutation((input: ProductInput) => isNew ? api.products.create(input) : api.products.update(Number(id), input))
  const upload = useMutation((file: File) => api.products.upload(file))

  useEffect(() => {
    if (product.data) {
      const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = product.data
      void _id; void _c; void _u
      setForm(rest)
    }
  }, [product.data])

  const set = <K extends keyof ProductInput>(key: K, value: ProductInput[K]) => setForm((f) => ({ ...f, [key]: value }))
  const setLoc = (key: 'name' | 'subtitle' | 'description' | 'usage' | 'howToTake', l: 'uz' | 'ru', value: string) => setForm((f) => ({ ...f, [key]: { ...f[key], [l]: value } }))

  const errors = {
    nameUz: !form.name.uz.trim() ? t('common.required') : '',
    nameRu: !form.name.ru.trim() ? t('common.required') : '',
    price: !(form.price >= 1000) ? t('products.errPrice') : '',
    sale: form.salePrice !== null && form.salePrice >= form.price ? t('products.errSale') : '',
  }
  const invalid = Object.values(errors).some(Boolean)

  const onSave = async () => {
    setTouched(true)
    if (invalid) return
    try {
      const saved = await save.run({ ...form, sku: form.sku || `FG-${form.line === 'supplement' ? 'S' : 'C'}${Date.now().toString().slice(-4)}` })
      invalidate('products', 'product:', 'inbox', 'badges')
      toast(isNew ? t('products.created') : t('products.saved'))
      if (isNew) navigate(`/products/${saved.id}`, { replace: true })
    } catch (e) { toast(errorText(e, t), 'error') }
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    try { const { url } = await upload.run(file); set('image', url) } catch (e) { toast(errorText(e, t), 'error') }
  }

  if (!isNew && product.error) return <ErrorBox error={product.error} onRetry={product.refetch} />
  if (!isNew && !product.data) return <div className="stack"><Skeleton w="40%" h={30} /><Skeleton h={400} r={14} /></div>

  const err = (k: keyof typeof errors) => (touched ? errors[k] || undefined : undefined)
  const cats = (categories.data ?? []).filter((c: Category) => c.line === form.line)
  const locPair = (key: 'name' | 'subtitle' | 'description' | 'usage' | 'howToTake', labels: [DictKey, DictKey], multiline = false, errs?: [keyof typeof errors, keyof typeof errors]) => (
    <>
      {(['uz', 'ru'] as const).map((l, i) => (
        <Field key={l} label={t(labels[i])} error={errs ? err(errs[i]) : undefined} className={multiline ? 'full' : undefined}>
          {multiline
            ? <Textarea value={form[key][l]} onChange={(e) => setLoc(key, l, e.target.value)} rows={3} />
            : <Input value={form[key][l]} onChange={(e) => setLoc(key, l, e.target.value)} aria-invalid={errs && touched && !!errors[errs[i]]} />}
        </Field>
      ))}
    </>
  )

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <div className="row"><Link to="/products" className="btn btn--ghost btn--sm"><ArrowLeft />{t('products.title')}</Link></div>
      <PageHeader title={isNew ? t('products.create') : tx(form.name) || t('products.edit')} sub={!isNew ? `${form.sku} · ${t('products.stock')}: ${num(form.stock ?? 0)} ${t('common.pcs')}` : undefined}
        actions={<>
          <Switch checked={form.visible} onChange={(v) => set('visible', v)} label={t('products.showOnSite')} />
          <Button variant="primary" loading={save.pending} onClick={() => void onSave()}>{t('common.save')}</Button>
        </>} />

      <div className="grid-main-side">
        <div className="stack" style={{ gap: 'var(--gap)' }}>
          <Panel title={t('products.basics')}>
            <div className="form-grid">
              <Field label={t('products.line')}>
                <Select value={form.line} onChange={(e) => { const lineV = e.target.value as ProductLine; set('line', lineV); set('categoryId', lineV === 'cosmetic' ? 100 : 3) }}>
                  <option value="supplement">{t('common.supplement')}</option>
                  <option value="cosmetic">{t('common.cosmetic')}</option>
                </Select>
              </Field>
              <Field label={t('products.category')}>
                <Select value={form.categoryId} onChange={(e) => set('categoryId', Number(e.target.value))}>
                  {cats.map((c) => <option key={c.id} value={c.id}>{tx(c.name)}</option>)}
                </Select>
              </Field>
              {locPair('name', ['products.nameUz', 'products.nameRu'], false, ['nameUz', 'nameRu'])}
              {locPair('subtitle', ['products.subtitleUz', 'products.subtitleRu'])}
              <Field label="SKU" hint={isNew ? t('common.optional') : undefined}><Input value={form.sku} onChange={(e) => set('sku', e.target.value.toUpperCase())} /></Field>
              <Field label={t('products.badge')}>
                <Select value={form.badge ?? ''} onChange={(e) => set('badge', (e.target.value || null) as ProductInput['badge'])}>
                  <option value="">{t('products.badge.none')}</option>
                  {(['new', 'best', 'pop', 'prem'] as const).map((b) => <option key={b} value={b}>{t(`products.badge.${b}` as DictKey)}</option>)}
                </Select>
              </Field>
            </div>
          </Panel>

          <Panel title={t('products.texts')}>
            <div className="form-grid">
              {locPair('description', ['products.descUz', 'products.descRu'], true)}
              {locPair('usage', ['products.usageUz', 'products.usageRu'], true)}
              {locPair('howToTake', ['products.howUz', 'products.howRu'], true)}
            </div>
          </Panel>

          <Panel title={t('products.ingredients')} actions={<Button size="sm" icon={<Plus />} onClick={() => set('ingredients', [...form.ingredients, { name: { uz: '', ru: '' }, amount: '' }])}>{t('products.addIngredient')}</Button>}>
            {form.ingredients.length === 0 ? <p className="faint" style={{ fontSize: 13 }}>—</p> : (
              <div className="stack-sm">
                {form.ingredients.map((ing, i) => (
                  <div key={i} className="row" style={{ alignItems: 'flex-end', flexWrap: 'wrap' }}>
                    <Field label={i === 0 ? `${t('products.ingredient')} (uz)` : undefined} className="grow"><Input size="sm" value={ing.name.uz} onChange={(e) => set('ingredients', form.ingredients.map((x, k) => k === i ? { ...x, name: { ...x.name, uz: e.target.value } } : x))} /></Field>
                    <Field label={i === 0 ? `${t('products.ingredient')} (ru)` : undefined} className="grow"><Input size="sm" value={ing.name.ru} onChange={(e) => set('ingredients', form.ingredients.map((x, k) => k === i ? { ...x, name: { ...x.name, ru: e.target.value } } : x))} /></Field>
                    <Field label={i === 0 ? t('products.amount') : undefined}><Input size="sm" value={ing.amount} style={{ width: 120 }} onChange={(e) => set('ingredients', form.ingredients.map((x, k) => k === i ? { ...x, amount: e.target.value } : x))} /></Field>
                    <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('common.delete')} onClick={() => set('ingredients', form.ingredients.filter((_, k) => k !== i))} />
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t('products.pricing')}>
            <div className="form-grid">
              <Field label={`${t('common.price')} (${t('common.sum')})`} error={err('price')}><Input type="number" min={0} step={100} value={form.price || ''} onChange={(e) => set('price', Number(e.target.value))} aria-invalid={touched && !!errors.price} /></Field>
              <Field label={`${t('products.salePrice')} (${t('common.sum')})`} hint={t('common.optional')} error={err('sale')}><Input type="number" min={0} step={100} value={form.salePrice ?? ''} onChange={(e) => set('salePrice', e.target.value ? Number(e.target.value) : null)} /></Field>
              <Field label={t('products.saleEnds')}><Input type="date" value={form.saleEndsAt?.slice(0, 10) ?? ''} onChange={(e) => set('saleEndsAt', e.target.value ? new Date(`${e.target.value}T23:59:00`).toISOString() : null)} /></Field>
              <Field label={t('products.lowAt')}><Input type="number" min={0} value={form.lowStockAt} onChange={(e) => set('lowStockAt', Number(e.target.value))} /></Field>
              <Field label={`${t('products.bonus')} (${t('common.sum')})`}><Input type="number" min={0} step={500} value={form.bonusPerUnit} onChange={(e) => set('bonusPerUnit', Number(e.target.value))} /></Field>
              {isNew && <Field label={t('products.initialStock')}><Input type="number" min={0} value={form.stock ?? 0} onChange={(e) => set('stock', Number(e.target.value))} /></Field>}
            </div>
          </Panel>
        </div>

        <div className="stack" style={{ gap: 'var(--gap)', position: 'sticky', top: 'calc(var(--topbar-h) + 16px)' }}>
          <Panel title={t('products.image')}>
            <div className="stack">
              <div style={{ aspectRatio: '1 / 1.05', borderRadius: 12, display: 'grid', placeItems: 'center', background: form.line === 'cosmetic' ? 'radial-gradient(70% 60% at 50% 40%, #4B3B2C, #1F1812)' : 'radial-gradient(70% 60% at 50% 40%, #FFFDF9, #EFE5D5)', overflow: 'hidden' }}>
                {form.image ? <img src={form.image} alt="" style={{ height: '82%', width: 'auto', filter: 'drop-shadow(0 12px 16px rgba(43,33,24,.25))' }} /> : <ImagePlus size={40} color="var(--ink-3)" />}
              </div>
              <input ref={fileRef} type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => void onFile(e.target.files?.[0])} />
              <Button icon={<ImagePlus />} loading={upload.pending} onClick={() => fileRef.current?.click()}>{t('products.upload')}</Button>
              <p className="field__hint">{t('products.imageHint')}</p>
            </div>
          </Panel>
          <Panel title={t('products.preview')}>
            <PreviewCard name={tx(form.name) || '—'} subtitle={tx(form.subtitle)} price={form.price} sale={form.salePrice} image={form.image} cosmetic={form.line === 'cosmetic'}
              badge={form.badge ? t(`products.badge.${form.badge}` as DictKey) : null} lang={lang} />
          </Panel>
        </div>
      </div>
    </div>
  )
}

function PreviewCard({ name, subtitle, price, sale, image, cosmetic, badge, lang }: { name: string; subtitle: string; price: number; sale: number | null; image: string; cosmetic: boolean; badge: ReactNode; lang: 'uz' | 'ru' }) {
  return (
    <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden', background: '#fff' }}>
      <div style={{ position: 'relative', height: 170, display: 'grid', placeItems: 'end center', paddingBottom: 18, background: cosmetic ? 'linear-gradient(180deg,#2C2219,#1F1812)' : 'linear-gradient(180deg,#F6EEE2,#EEE3D2 84%,#E2D3BD 84%)' }}>
        {badge && <span className="pill pill--plain" style={{ position: 'absolute', left: 10, top: 10, background: 'rgba(255,255,255,.85)', color: 'var(--gold-deep)', borderColor: 'rgba(154,118,56,.45)', fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase' }}>{badge}</span>}
        {image ? <img src={image} alt="" style={{ height: 130, width: 'auto', filter: 'drop-shadow(0 8px 10px rgba(43,33,24,.25))' }} /> : null}
      </div>
      <div style={{ padding: '12px 14px 14px' }}>
        <div style={{ font: '600 21px/1.15 var(--f-display)' }}>{name}</div>
        <div className="faint" style={{ fontSize: 12, marginTop: 2 }}>{subtitle}</div>
        <div className="row" style={{ marginTop: 10 }}>
          {sale ? <><b className="num" style={{ color: 'var(--danger)' }}>{money(sale, lang)}</b><span className="faint num" style={{ textDecoration: 'line-through', fontSize: 12 }}>{money(price, lang)}</span></> : <b className="num">{money(price || 0, lang)}</b>}
        </div>
      </div>
    </div>
  )
}
