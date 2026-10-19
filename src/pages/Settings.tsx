import { useEffect, useState } from 'react'
import { Database, RefreshCw, Send } from 'lucide-react'
import { api, USE_MOCK, type Settings } from '../api'
import { useI18n } from '../lib/i18n'
import { invalidate, useMutation, useQuery } from '../lib/query'
import { Button, ConfirmDialog, ErrorBox, Field, Input, PageHeader, Panel, Pill, Skeleton, Switch, errorText } from '../components/ui'
import { useToast } from '../components/Toast'
import { resetDemoData } from '../api/mock'
import type { DictKey } from '../lib/dict'

export function SettingsPage() {
  const { t } = useI18n()
  const toast = useToast()
  const settings = useQuery('settings', () => api.settings.get())
  const [form, setForm] = useState<Settings | null>(null)
  const [resetOpen, setResetOpen] = useState(false)
  useEffect(() => { if (settings.data) setForm(structuredClone(settings.data)) }, [settings.data])
  const save = useMutation((patch: Partial<Settings>) => api.settings.update(patch))
  const test = useMutation(() => api.settings.testTelegram())

  if (settings.error) return <ErrorBox error={settings.error} onRetry={settings.refetch} />
  if (!form) return <div className="stack"><Skeleton w="30%" h={30} /><Skeleton h={300} r={14} /></div>

  const onSave = async (patch: Partial<Settings>) => {
    try { await save.run(patch); invalidate('settings'); toast(t('common.saved')) } catch (e) { toast(errorText(e, t), 'error') }
  }
  const saveBtn = (patch: () => Partial<Settings>) => <div className="row" style={{ justifyContent: 'flex-end' }}><Button variant="primary" loading={save.pending} onClick={() => void onSave(patch())}>{t('common.save')}</Button></div>

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <PageHeader title={t('set.title')} sub={t('set.sub')} />

      <Panel title={t('set.shop')} footer={saveBtn(() => ({ shopName: form.shopName, legalName: form.legalName, inn: form.inn, supportPhone: form.supportPhone }))}>
        <div className="form-grid">
          <Field label={t('set.shopName')}><Input value={form.shopName} onChange={(e) => setForm({ ...form, shopName: e.target.value })} /></Field>
          <Field label={t('set.legal')}><Input value={form.legalName} onChange={(e) => setForm({ ...form, legalName: e.target.value })} /></Field>
          <Field label={t('set.inn')}><Input value={form.inn} inputMode="numeric" onChange={(e) => setForm({ ...form, inn: e.target.value.replace(/\D/g, '').slice(0, 9) })} /></Field>
          <Field label={t('set.phone')}><Input value={form.supportPhone} onChange={(e) => setForm({ ...form, supportPhone: e.target.value })} /></Field>
        </div>
      </Panel>

      <Panel title={t('set.telegram')} actions={<Pill tone={form.telegram.connected ? 'success' : 'warning'}>{form.telegram.connected ? t('set.tgConnected') : t('set.tgNotConnected')}</Pill>}
        footer={<div className="row" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
          <Button icon={<Send />} loading={test.pending} onClick={async () => {
            try { const r = await test.run(); toast(r.ok ? t('set.tgTestOk') : t('set.tgTestFail'), r.ok ? 'success' : 'error') } catch (e) { toast(errorText(e, t), 'error') }
          }}>{t('set.tgTest')}</Button>
          <Button variant="primary" loading={save.pending} onClick={() => void onSave({ telegram: form.telegram })}>{t('common.save')}</Button>
        </div>}>
        <div className="stack">
          <p className="callout"><Send size={16} /><span>{t('set.tgHint')}</span></p>
          <Field label={t('set.tgGroup')}><Input value={form.telegram.groupName} onChange={(e) => setForm({ ...form, telegram: { ...form.telegram, groupName: e.target.value } })} style={{ maxWidth: 360 }} /></Field>
          <div className="grid-2">
            {(Object.keys(form.telegram.events) as (keyof Settings['telegram']['events'])[]).map((ev) => (
              <Switch key={ev} checked={form.telegram.events[ev]} label={t(`set.ev.${ev}` as DictKey)}
                onChange={(v) => setForm({ ...form, telegram: { ...form.telegram, events: { ...form.telegram.events, [ev]: v } } })} />
            ))}
          </div>
        </div>
      </Panel>

      <Panel title={t('set.limits')} footer={saveBtn(() => ({ lowStockDefault: form.lowStockDefault, certificateWarnDays: form.certificateWarnDays }))}>
        <div className="form-grid">
          <Field label={`${t('set.lowDefault')} (${t('common.pcs')})`}><Input type="number" min={0} value={form.lowStockDefault} onChange={(e) => setForm({ ...form, lowStockDefault: Number(e.target.value) })} /></Field>
          <Field label={`${t('set.certWarn')} (${t('common.days')})`}><Input type="number" min={1} value={form.certificateWarnDays} onChange={(e) => setForm({ ...form, certificateWarnDays: Number(e.target.value) })} /></Field>
        </div>
      </Panel>

      <Panel title={t('set.api')} actions={<Pill tone={USE_MOCK ? 'warning' : 'success'}>{USE_MOCK ? t('set.apiMock') : (import.meta.env.VITE_API_URL ?? '')}</Pill>}>
        <div className="stack">
          <p className="muted" style={{ fontSize: 13.5 }}><Database size={15} style={{ verticalAlign: -3, marginRight: 6 }} />{t('set.demoText')}</p>
          {USE_MOCK && <Button icon={<RefreshCw />} style={{ justifySelf: 'start' }} onClick={() => setResetOpen(true)}>{t('set.demoReset')}</Button>}
        </div>
      </Panel>

      <ConfirmDialog open={resetOpen} onClose={() => setResetOpen(false)} title={t('set.demoReset')} text={t('set.demoText')} confirmLabel={t('set.demoReset')}
        onConfirm={() => { resetDemoData(); invalidate(''); setResetOpen(false); toast(t('set.demoDone')) }} />
    </div>
  )
}
