import { useState } from 'react'
import { Check, KeyRound, Minus, Plus, ShieldCheck } from 'lucide-react'
import { api, ApiError, type Role, type StaffMember } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { ago } from '../lib/format'
import { ACCESS, ROLES, type Section } from '../lib/permissions'
import { Avatar, Button, DataTable, Drawer, ErrorBox, Field, Input, PageHeader, Panel, Pill, Select, SkeletonRows, Switch, errorText, type Column } from '../components/ui'
import { useAuth } from '../components/Auth'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

const SECTION_LABEL: Record<Section, DictKey> = {
  inbox: 'nav.inbox', dashboard: 'nav.dashboard', orders: 'nav.orders', delivery: 'nav.delivery', consultations: 'nav.consultations',
  products: 'nav.products', stock: 'nav.stock', promos: 'nav.promos', customers: 'nav.customers', reviews: 'nav.reviews', content: 'nav.content',
  pharmacies: 'nav.pharmacies', bonus: 'nav.bonus', staff: 'nav.staff', activity: 'nav.activity', settings: 'nav.settings',
}

export function StaffPage() {
  const { t, lang } = useI18n()
  const { user } = useAuth()
  const staff = useQuery('staff', () => api.staff.list())
  const [editing, setEditing] = useState<Partial<StaffMember> | null>(null)

  const columns: Column<StaffMember>[] = [
    { key: 'name', header: t('common.name'), cell: (s) => <div className="row"><Avatar name={s.name} /><div><span className="cell-strong">{s.name}{s.id === user?.id && <span className="faint"> ({t('staff.you')})</span>}</span><span className="cell-sub">{s.email}</span></div></div> },
    { key: 'role', header: t('staff.role'), cell: (s) => <Pill tone={s.role === 'owner' ? 'gold' : undefined} plain>{t(`role.${s.role}` as DictKey)}</Pill> },
    { key: 'phone', header: t('common.phone'), hideSm: true, cell: (s) => <span className="num">{s.phone}</span> },
    { key: 'tf', header: t('staff.twoFactor'), hideSm: true, cell: (s) => s.twoFactor ? <span className="row" style={{ gap: 6, color: 'var(--success)', fontWeight: 700, fontSize: 12.5 }}><ShieldCheck size={15} />{t('common.yes')}</span> : <span className="faint">{t('common.no')}</span> },
    { key: 'seen', header: t('staff.lastSeen'), hideSm: true, cell: (s) => s.lastSeenAt ? ago(s.lastSeenAt, lang, t) : <span className="faint">{t('staff.never')}</span> },
    { key: 'st', header: t('common.status'), cell: (s) => <Pill tone={s.active ? 'success' : undefined}>{s.active ? t('common.active') : t('common.inactive')}</Pill> },
  ]

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <PageHeader title={t('staff.title')} sub={t('staff.sub')} actions={<Button variant="primary" icon={<Plus />} onClick={() => setEditing({ role: 'operator', active: true, twoFactor: false })}>{t('staff.add')}</Button>} />
      <div className="panel">
        {staff.error ? <div className="panel__body"><ErrorBox error={staff.error} onRetry={staff.refetch} /></div>
          : !staff.data ? <SkeletonRows rows={6} cols={5} />
          : <DataTable rows={staff.data} columns={columns} rowKey={(s) => s.id} onRowClick={(s) => setEditing(s)} />}
      </div>

      <Panel title={t('staff.permissions')} flush>
        <div className="table-wrap">
          <table className="perm">
            <thead><tr><th>{t('common.name')}</th>{ROLES.map((r) => <th key={r}>{t(`role.${r}` as DictKey)}</th>)}</tr></thead>
            <tbody>
              {(Object.keys(ACCESS) as Section[]).map((section) => (
                <tr key={section}>
                  <td>{t(SECTION_LABEL[section])}</td>
                  {ROLES.map((r) => <td key={r}>{ACCESS[section].includes(r) ? <Check className="yes" aria-label={t('common.yes')} /> : <Minus className="no" aria-label={t('common.no')} />}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <StaffEditor value={editing} onClose={() => setEditing(null)} />
    </div>
  )
}

function StaffEditor({ value, onClose }: { value: Partial<StaffMember> | null; onClose: () => void }) {
  const { t } = useI18n()
  const toast = useToast()
  const { user } = useAuth()
  const [form, setForm] = useState<Partial<StaffMember>>({})
  const [shown, setShown] = useState<Partial<StaffMember> | null>(null)
  const [error, setError] = useState('')
  if (value !== shown) { setShown(value); setForm(value ?? {}); setError('') }
  const save = useMutation(() => api.staff.save({
    id: form.id, name: form.name ?? '', email: (form.email ?? '').trim().toLowerCase(), phone: form.phone ?? '', role: form.role ?? 'operator',
    twoFactor: form.role === 'owner' ? true : form.twoFactor ?? false, active: form.active ?? true,
  }))
  const reset = useMutation((id: string) => api.staff.resetPassword(id))
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email ?? '')
  const valid = (form.name ?? '').trim().length > 2 && emailOk
  const self = form.id === user?.id

  return (
    <Drawer open={!!value} onClose={onClose} title={form.id ? t('staff.edit') : t('staff.add')}
      footer={<><Button variant="ghost" onClick={onClose}>{t('common.cancel')}</Button><Button variant="primary" disabled={!valid} loading={save.pending} onClick={async () => {
        try { await save.run(); invalidate('staff'); toast(form.id ? t('staff.saved') : t('staff.created')); onClose() }
        catch (e) { if (e instanceof ApiError && e.status === 409) setError(t('staff.dup')); else toast(errorText(e, t), 'error') }
      }}>{t('common.save')}</Button></>}>
      <Field label={t('common.name')}><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label={t('staff.email')} error={error || (form.email && !emailOk ? t('staff.errEmail') : undefined)}><Input type="email" value={form.email ?? ''} onChange={(e) => { setForm({ ...form, email: e.target.value }); setError('') }} /></Field>
      <Field label={t('common.phone')}><Input value={form.phone ?? ''} inputMode="tel" placeholder="+998 90 123 45 67" onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label={t('staff.role')}>
        <Select value={form.role ?? 'operator'} disabled={self} onChange={(e) => setForm({ ...form, role: e.target.value as Role })}>
          {ROLES.map((r) => <option key={r} value={r}>{t(`role.${r}` as DictKey)}</option>)}
        </Select>
      </Field>
      <Switch checked={form.role === 'owner' ? true : form.twoFactor ?? false} disabled={form.role === 'owner'} onChange={(v) => setForm({ ...form, twoFactor: v })}
        label={<span>{t('staff.twoFactor')}{form.role === 'owner' && <span className="faint" style={{ display: 'block', fontSize: 12, fontWeight: 500 }}>{t('staff.twoFactorOwner')}</span>}</span>} />
      <Switch checked={form.active ?? true} disabled={self} onChange={(v) => setForm({ ...form, active: v })} label={t('common.active')} />
      {form.id && (
        <Button icon={<KeyRound />} loading={reset.pending} style={{ justifySelf: 'start' }} onClick={async () => {
          try { await reset.run(form.id!); toast(t('staff.resetSent')) } catch (e) { toast(errorText(e, t), 'error') }
        }}>{t('staff.reset')}</Button>
      )}
    </Drawer>
  )
}
