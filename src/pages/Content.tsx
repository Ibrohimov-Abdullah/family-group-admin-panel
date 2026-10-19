import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ArrowDown, ArrowUp, ExternalLink, FileBadge, Plus, Trash2, Upload, X } from 'lucide-react'
import { api, type Certificate, type SiteContent } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { date, dateTime } from '../lib/format'
import { Button, ConfirmDialog, Drawer, EmptyState, ErrorBox, Field, Input, PageHeader, Panel, Pill, Select, Skeleton, Tabs, Textarea, Thumb, errorText } from '../components/ui'
import { TileMap } from '../components/TileMap'
import { useToast } from '../components/Toast'

type Tab = 'texts' | 'hero' | 'contacts' | 'certs'
const SITE = 'https://familygroup.store'

function videoIdFrom(input: string): string {
  const s = input.trim()
  const m = s.match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/)
  return m ? m[1] : s
}

export function ContentPage() {
  const { t, lang } = useI18n()
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as Tab) || 'texts'
  const content = useQuery('content', () => api.content.get())
  return (
    <div>
      <PageHeader title={t('content.title')} sub={t('content.sub')} actions={<>
        {content.data && <span className="faint" style={{ fontSize: 12.5 }}>{t('content.lastUpdate', { date: dateTime(content.data.updatedAt, lang) })}</span>}
        <a className="btn btn--secondary" href={SITE} target="_blank" rel="noopener noreferrer"><ExternalLink />{t('content.preview')}</a>
      </>} />
      <Tabs<Tab> value={tab} onChange={(v) => setParams({ tab: v })} tabs={[
        { value: 'texts', label: t('content.texts') }, { value: 'hero', label: t('content.hero') },
        { value: 'contacts', label: t('content.contacts') }, { value: 'certs', label: t('content.certs') },
      ]} />
      {content.error ? <ErrorBox error={content.error} onRetry={content.refetch} />
        : !content.data ? <Skeleton h={360} r={14} />
        : tab === 'texts' ? <Texts content={content.data} />
        : tab === 'hero' ? <Hero content={content.data} />
        : tab === 'contacts' ? <Contacts content={content.data} />
        : <Certificates content={content.data} />}
    </div>
  )
}

function useSave() {
  const { t } = useI18n()
  const toast = useToast()
  const m = useMutation((patch: Partial<Omit<SiteContent, 'certificates' | 'updatedAt'>>) => api.content.update(patch))
  return {
    pending: m.pending,
    save: async (patch: Partial<Omit<SiteContent, 'certificates' | 'updatedAt'>>) => {
      try { await m.run(patch); invalidate('content'); toast(t('content.saved')) } catch (e) { toast(errorText(e, t), 'error') }
    },
  }
}

function Texts({ content }: { content: SiteContent }) {
  const { t } = useI18n()
  const [form, setForm] = useState({ quote: content.quote, aboutTitle: content.aboutTitle, aboutText: content.aboutText, videoId: content.videoId })
  const { save, pending } = useSave()
  const vid = videoIdFrom(form.videoId)
  const pair = (key: 'quote' | 'aboutTitle' | 'aboutText', label: string, rows = 2) => (
    <div className="form-grid">
      {(['uz', 'ru'] as const).map((l) => (
        <Field key={l} label={`${label} (${l})`}>
          <Textarea rows={rows} value={form[key][l]} onChange={(e) => setForm({ ...form, [key]: { ...form[key], [l]: e.target.value } })} />
        </Field>
      ))}
    </div>
  )
  return (
    <Panel footer={<div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" loading={pending} onClick={() => void save({ ...form, videoId: vid })}>{t('common.save')}</Button></div>}>
      <div className="stack">
        {pair('quote', t('content.quote'))}
        {pair('aboutTitle', t('content.aboutTitle'))}
        {pair('aboutText', t('content.aboutText'), 5)}
        <div className="grid-2" style={{ alignItems: 'end' }}>
          <Field label={t('content.video')} hint={`ID: ${vid}`}><Input value={form.videoId} onChange={(e) => setForm({ ...form, videoId: e.target.value })} /></Field>
          {vid.length === 11 && <img src={`https://img.youtube.com/vi/${vid}/mqdefault.jpg`} alt="" style={{ borderRadius: 10, width: 220, border: '1px solid var(--line)' }} />}
        </div>
      </div>
    </Panel>
  )
}

function Hero({ content }: { content: SiteContent }) {
  const { t, tx } = useI18n()
  const products = useQuery('products:all', () => api.products.list())
  const [ids, setIds] = useState(content.heroProductIds)
  const [add, setAdd] = useState('')
  const { save, pending } = useSave()
  const move = (i: number, d: number) => { const n = [...ids]; const [x] = n.splice(i, 1); n.splice(i + d, 0, x); setIds(n) }
  if (!products.data) return <Skeleton h={300} />
  return (
    <Panel sub={t('content.heroHint')} footer={<div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" loading={pending} onClick={() => void save({ heroProductIds: ids })}>{t('common.save')}</Button></div>}>
      <div className="stack-sm">
        {ids.map((id, i) => {
          const p = products.data!.find((x) => x.id === id)
          if (!p) return null
          return (
            <div key={id} className="row" style={{ padding: 10, border: '1px solid var(--line)', borderRadius: 12 }}>
              <span className="faint num" style={{ width: 20, fontWeight: 800 }}>{i + 1}</span>
              <Thumb src={p.image} cosmetic={p.line === 'cosmetic'} />
              <b className="grow">{tx(p.name)}</b>
              <Button size="sm" variant="ghost" iconOnly icon={<ArrowUp />} aria-label={t('content.moveUp')} disabled={i === 0} onClick={() => move(i, -1)} />
              <Button size="sm" variant="ghost" iconOnly icon={<ArrowDown />} aria-label={t('content.moveDown')} disabled={i === ids.length - 1} onClick={() => move(i, 1)} />
              <Button size="sm" variant="ghost" iconOnly icon={<X />} aria-label={t('content.remove')} onClick={() => setIds(ids.filter((x) => x !== id))} />
            </div>
          )
        })}
        <div className="row" style={{ marginTop: 6 }}>
          <Select value={add} onChange={(e) => setAdd(e.target.value)} style={{ maxWidth: 320 }}>
            <option value="">{t('content.heroAdd')}…</option>
            {products.data.filter((p) => !ids.includes(p.id)).map((p) => <option key={p.id} value={p.id}>{tx(p.name)}</option>)}
          </Select>
          <Button icon={<Plus />} disabled={!add} onClick={() => { setIds([...ids, Number(add)]); setAdd('') }}>{t('common.add')}</Button>
        </div>
      </div>
    </Panel>
  )
}

function Contacts({ content }: { content: SiteContent }) {
  const { t } = useI18n()
  const [c, setC] = useState(content.contacts)
  const { save, pending } = useSave()
  const text = (key: 'phone' | 'telegram' | 'whatsapp' | 'instagram' | 'youtube' | 'email', label: string) => (
    <Field label={label}><Input value={c[key]} onChange={(e) => setC({ ...c, [key]: e.target.value })} /></Field>
  )
  const loc = (key: 'address' | 'landmark' | 'hours', label: string) => (['uz', 'ru'] as const).map((l) => (
    <Field key={`${key}-${l}`} label={`${label} (${l})`}><Input value={c[key][l]} onChange={(e) => setC({ ...c, [key]: { ...c[key], [l]: e.target.value } })} /></Field>
  ))
  return (
    <div className="grid-main-side">
      <Panel footer={<div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" loading={pending} onClick={() => void save({ contacts: c })}>{t('common.save')}</Button></div>}>
        <div className="form-grid">
          {text('phone', t('common.phone'))}
          {text('email', t('content.email'))}
          {text('telegram', 'Telegram')}
          {text('whatsapp', 'WhatsApp')}
          {text('instagram', 'Instagram')}
          {text('youtube', 'YouTube')}
          {loc('address', t('common.address'))}
          {loc('landmark', t('content.landmark'))}
          {loc('hours', t('content.hours'))}
          <Field label={t('content.coords')} className="full">
            <div className="row">
              <Input type="number" step="0.000001" value={c.lat} onChange={(e) => setC({ ...c, lat: Number(e.target.value) })} aria-label="lat" />
              <Input type="number" step="0.000001" value={c.lon} onChange={(e) => setC({ ...c, lon: Number(e.target.value) })} aria-label="lon" />
            </div>
          </Field>
        </div>
      </Panel>
      <Panel title={t('orders.pin')}>
        <TileMap height={260} zoom={15} center={{ lat: c.lat, lon: c.lon }} markers={[{ id: 'office', kind: 'pin', lat: c.lat, lon: c.lon }]} />
        <p className="muted" style={{ marginTop: 10, fontSize: 13 }}>{c.address.uz}<br /><span className="faint">{c.landmark.uz}</span></p>
      </Panel>
    </div>
  )
}

function Certificates({ content }: { content: SiteContent }) {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const [editing, setEditing] = useState<Certificate | null>(null)
  const [viewing, setViewing] = useState<Certificate | null>(null)
  const [removing, setRemoving] = useState<Certificate | null>(null)
  const { data: settings } = useQuery('settings', () => api.settings.get())
  const warnDays = settings?.certificateWarnDays ?? 365
  const remove = useMutation((id: string) => api.content.removeCertificate(id))

  return (
    <>
      <div className="row" style={{ marginBottom: 'var(--gap)' }}>
        <span className="grow" />
        <Button variant="primary" icon={<Plus />} onClick={() => setEditing({ id: `cert_${Date.now().toString(36)}`, title: { uz: '', ru: '' }, number: '', issuedBy: '', validUntil: null, pdf: null, pages: [] })}>{t('content.certAdd')}</Button>
      </div>
      {content.certificates.length === 0 ? <div className="panel"><EmptyState icon={<FileBadge />} title={t('content.certs')} /></div> : (
        <div className="grid-2">
          {content.certificates.map((cert) => {
            const expiring = cert.validUntil && Date.parse(cert.validUntil) - Date.now() < warnDays * 86_400_000
            return (
              <div key={cert.id} className="cert">
                <button type="button" onClick={() => setViewing(cert)} aria-label={t('content.view')}>{cert.pages[0] ? <img src={cert.pages[0]} alt="" /> : <div className="empty__icon"><FileBadge /></div>}</button>
                <div className="stack-sm" style={{ gap: 6 }}>
                  <b style={{ fontSize: 14 }}>{tx(cert.title)}</b>
                  <span className="muted" style={{ fontSize: 12.5 }}>{cert.number} · {cert.issuedBy}</span>
                  <div className="row-wrap" style={{ gap: 6 }}>
                    {cert.validUntil ? <Pill tone={expiring ? 'warning' : 'success'}>{expiring ? t('content.certExpiring') : t('content.certValid')}: {date(cert.validUntil, lang)}</Pill> : <Pill plain>{t('content.certNoExpiry')}</Pill>}
                  </div>
                  <div className="row" style={{ gap: 4 }}>
                    <Button size="sm" variant="ghost" onClick={() => setViewing(cert)}>{t('content.view')}</Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(cert)}>{t('common.edit')}</Button>
                    {cert.pdf && <a className="btn btn--ghost btn--sm" href={cert.pdf} target="_blank" rel="noopener noreferrer">PDF</a>}
                    <Button size="sm" variant="ghost" iconOnly icon={<Trash2 />} aria-label={t('common.delete')} onClick={() => setRemoving(cert)} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
      <Drawer open={!!viewing} onClose={() => setViewing(null)} title={viewing ? tx(viewing.title) : ''} wide>
        {viewing?.pages.map((src, i) => <img key={i} src={src} alt={`${i + 1}`} style={{ width: '100%', borderRadius: 8, border: '1px solid var(--line)', background: '#fff' }} />)}
      </Drawer>
      <CertificateEditor value={editing} onClose={() => setEditing(null)} />
      <ConfirmDialog open={!!removing} onClose={() => setRemoving(null)} tone="danger" title={removing ? tx(removing.title) : ''} confirmLabel={t('common.delete')} loading={remove.pending}
        onConfirm={async () => { if (!removing) return; try { await remove.run(removing.id); invalidate('content', 'inbox'); toast(t('content.certDeleted')); setRemoving(null) } catch (e) { toast(errorText(e, t), 'error') } }} />
    </>
  )
}

function CertificateEditor({ value, onClose }: { value: Certificate | null; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const [form, setForm] = useState<Certificate | null>(value)
  useEffect(() => { setForm(value) }, [value])
  const save = useMutation((cert: Certificate) => api.content.saveCertificate(cert))
  const [uploading, setUploading] = useState(false)
  if (!form) return <Drawer open={false} onClose={onClose} title="">{null}</Drawer>
  const uploadFiles = async (files: FileList | null, kind: 'pages' | 'pdf') => {
    if (!files?.length) return
    setUploading(true)
    try {
      const urls = await Promise.all([...files].map((f) => api.products.upload(f).then((r) => r.url)))
      setForm((f) => f && (kind === 'pdf' ? { ...f, pdf: urls[0] } : { ...f, pages: [...f.pages, ...urls] }))
    } catch (e) { toast(errorText(e, t), 'error') } finally { setUploading(false) }
  }
  const valid = form.title.uz.trim() && form.number.trim()
  return (
    <Drawer open={!!value} onClose={onClose} title={form.title.uz || t('content.certAdd')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valid} loading={save.pending} onClick={async () => {
        try { await save.run(form); invalidate('content', 'inbox'); toast(t('content.certSaved')); onClose() } catch (e) { toast(errorText(e, t), 'error') }
      }}>{t('common.save')}</Button></>}>
      {(['uz', 'ru'] as const).map((l) => (
        <Field key={l} label={`${t('common.name')} (${l})`}><Input value={form.title[l]} onChange={(e) => setForm({ ...form, title: { ...form.title, [l]: e.target.value } })} /></Field>
      ))}
      <div className="form-grid">
        <Field label={t('content.certNumber')}><Input value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></Field>
        <Field label={t('content.certValid')} hint={t('content.certNoExpiry')}><Input type="date" value={form.validUntil?.slice(0, 10) ?? ''} onChange={(e) => setForm({ ...form, validUntil: e.target.value || null })} /></Field>
      </div>
      <Field label={t('content.certIssuer')}><Input value={form.issuedBy} onChange={(e) => setForm({ ...form, issuedBy: e.target.value })} /></Field>
      <Field label={t('content.certPages')}>
        <div className="row-wrap">
          {form.pages.map((src, i) => (
            <div key={src} style={{ position: 'relative' }}>
              <img src={src} alt="" style={{ width: 70, aspectRatio: '1/1.41', objectFit: 'cover', objectPosition: 'top', borderRadius: 6, border: '1px solid var(--line)' }} />
              <button type="button" className="btn btn--secondary btn--sm btn--icon" style={{ position: 'absolute', top: -8, right: -8, width: 24, height: 24, borderRadius: 99 }} aria-label={t('common.delete')} onClick={() => setForm({ ...form, pages: form.pages.filter((_, k) => k !== i) })}><X size={12} /></button>
            </div>
          ))}
          <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer' }}><Upload />{t('products.upload')}<input type="file" accept="image/*" multiple hidden onChange={(e) => void uploadFiles(e.target.files, 'pages')} /></label>
        </div>
      </Field>
      <Field label={t('content.certPdf')} hint={form.pdf ?? t('common.optional')}>
        <label className="btn btn--secondary btn--sm" style={{ cursor: 'pointer', justifySelf: 'start' }}><Upload />PDF<input type="file" accept="application/pdf" hidden onChange={(e) => void uploadFiles(e.target.files, 'pdf')} /></label>
      </Field>
      {uploading && <p className="faint">{t('common.loading')}</p>}
    </Drawer>
  )
}
