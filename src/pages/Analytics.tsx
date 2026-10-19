import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { Download } from 'lucide-react'
import { api, type Period, type PaymentMethod, type OrderStatus } from '../api'
import { useI18n } from '../lib/i18n'
import { useQuery } from '../lib/query'
import { dayLabel, money, moneyShort, num, pct } from '../lib/format'
import { saveBlob } from '../lib/xlsx'
import { AreaChart, BarList, Donut, Sparkline, StackedBars } from '../components/charts'
import { Button, Delta, ErrorBox, PageHeader, Panel, Pill, Segmented, Skeleton, Thumb, errorText } from '../components/ui'
import { TileMap } from '../components/TileMap'
import { useToast } from '../components/Toast'
import type { DictKey } from '../lib/dict'

const PAY_COLORS: Record<PaymentMethod, string> = { payme: 'var(--series-2)', click: 'var(--series-1)', card: 'var(--series-4)' }
const STATUS_COLORS: Record<OrderStatus, string> = {
  new: 'var(--s-new)', confirmed: 'var(--s-confirmed)', packed: 'var(--s-packed)', shipping: 'var(--s-shipping)', delivered: 'var(--s-delivered)', cancelled: 'var(--s-cancelled)',
}

export function AnalyticsPage() {
  const { t, tx, lang } = useI18n()
  const toast = useToast()
  const [period, setPeriod] = useState<Period>('30d')
  const dash = useQuery(`dashboard:${period}`, () => api.dashboard.get(period))
  const an = useQuery(`analytics:${period}`, () => api.analytics.get(period))
  const products = useQuery('products:all', () => api.products.list())
  const categories = useQuery('categories', () => api.products.categories())
  const forecast = useQuery('stock:forecast', () => api.stock.forecast())
  const [busy, setBusy] = useState<string | null>(null)

  const d = dash.data
  const a = an.data
  const product = (id: number) => products.data?.find((p) => p.id === id)

  const download = async (kind: 'sales' | 'orders' | 'stock' | 'customers') => {
    setBusy(kind)
    try {
      const blob = kind === 'sales' ? await api.exports.sales(period)
        : kind === 'orders' ? await api.exports.orders({ status: 'all', from: d?.revenueByDay[0]?.date, pageSize: 100000 })
        : kind === 'stock' ? await api.exports.stock() : await api.exports.customers()
      saveBlob(blob, `${kind}-${new Date().toISOString().slice(0, 10)}.xlsx`)
      toast(t('common.exportDone'))
    } catch (e) { toast(errorText(e, t), 'error') } finally { setBusy(null) }
  }

  const sum = (r: Record<string, number> | undefined) => Object.values(r ?? {}).reduce((s, v) => s + v, 0)

  return (
    <div className="stack" style={{ gap: 'var(--gap)' }}>
      <PageHeader title={t('an.title')} sub={t('an.sub')} actions={
        <Segmented<Period> value={period} onChange={setPeriod} label={t('common.period')} options={[
          { value: '7d', label: t('common.p7') }, { value: '30d', label: t('common.p30') }, { value: '90d', label: t('common.p90') },
        ]} />
      } />

      {dash.error ? <ErrorBox error={dash.error} onRetry={dash.refetch} /> : null}

      <div className="kpis">
        <Kpi label={t('an.revenue')} value={d && moneyShort(d.revenue.value, lang)} unit={lang === 'uz' ? "so'm" : 'сум'} cur={d?.revenue.value} prev={d?.revenue.previous} series={d?.revenue.series} />
        <Kpi label={t('an.orders')} value={d && num(d.orders.value)} cur={d?.orders.value} prev={d?.orders.previous} series={d?.orders.series} />
        <Kpi label={t('an.avg')} value={d && moneyShort(d.averageOrder.value, lang)} unit={lang === 'uz' ? "so'm" : 'сум'} cur={d?.averageOrder.value} prev={d?.averageOrder.previous} series={d?.averageOrder.series} />
        <Kpi label={t('an.newCustomers')} value={d && num(d.newCustomers.value)} cur={d?.newCustomers.value} prev={d?.newCustomers.previous} series={d?.newCustomers.series} />
      </div>

      <div className="grid-main-side">
        <Panel title={t('an.revenueChart')} sub={d ? `${money(d.revenue.value, lang)} · ${num(d.orders.value)} ${t('an.orders').toLowerCase()}` : undefined}>
          {d ? (
            <AreaChart values={d.revenueByDay.map((x) => x.revenue)} labels={d.revenueByDay.map((x) => dayLabel(x.date))}
              format={(v) => moneyShort(v, lang)}
              tip={(i) => <><b>{money(d.revenueByDay[i].revenue, lang)}</b>{dayLabel(d.revenueByDay[i].date)} · {d.revenueByDay[i].orders} {t('an.orders').toLowerCase()}</>} />
          ) : <Skeleton h={220} r={10} />}
        </Panel>
        <div className="stack" style={{ gap: 'var(--gap)' }}>
          <Panel title={t('an.payments')}>
            {d ? (
              <div className="row" style={{ gap: 18 }}>
                <Donut size={120} parts={(Object.keys(d.paymentSplit) as PaymentMethod[]).map((m) => ({ value: d.paymentSplit[m], color: PAY_COLORS[m], label: t(`orders.pay.${m}` as DictKey) }))} />
                <div className="stack-sm grow">
                  {(Object.keys(d.paymentSplit) as PaymentMethod[]).map((m) => (
                    <div key={m} className="row" style={{ fontSize: 13 }}>
                      <i style={{ width: 10, height: 10, borderRadius: 3, background: PAY_COLORS[m] }} />
                      <span className="grow">{t(`orders.pay.${m}` as DictKey)}</span>
                      <b className="num">{pct(d.paymentSplit[m] / (sum(d.paymentSplit) || 1))}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Skeleton h={120} />}
          </Panel>
          <Panel title={t('an.statuses')}>
            {d ? (
              <div className="row" style={{ gap: 18 }}>
                <Donut size={120} parts={(Object.keys(d.statusCounts) as OrderStatus[]).map((s) => ({ value: d.statusCounts[s], color: STATUS_COLORS[s], label: t(`orders.status.${s}` as DictKey) }))}
                  center={<span><b className="num" style={{ fontSize: 18, display: 'block' }}>{num(sum(d.statusCounts))}</b><span className="faint" style={{ fontSize: 11 }}>{t('an.orders').toLowerCase()}</span></span>} />
                <div className="stack-sm grow" style={{ gap: 5 }}>
                  {(Object.keys(d.statusCounts) as OrderStatus[]).map((s) => (
                    <div key={s} className="row" style={{ fontSize: 12.5 }}>
                      <i style={{ width: 9, height: 9, borderRadius: 3, background: STATUS_COLORS[s] }} />
                      <span className="grow">{t(`orders.status.${s}` as DictKey)}</span>
                      <b className="num">{num(d.statusCounts[s])}</b>
                    </div>
                  ))}
                </div>
              </div>
            ) : <Skeleton h={120} />}
          </Panel>
        </div>
      </div>

      <div className="grid-2">
        <Panel title={t('an.top')} flush>
          {a && products.data ? (
            <div>
              {a.products.slice(0, 8).map((s, i) => {
                const p = product(s.productId)
                if (!p) return null
                return (
                  <div key={s.productId} className="row" style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                    <span className="faint num" style={{ width: 18, fontWeight: 800 }}>{i + 1}</span>
                    <Thumb src={p.image} cosmetic={p.line === 'cosmetic'} />
                    <div className="grow" style={{ minWidth: 0 }}>
                      <b className="ellipsis" style={{ display: 'block' }}>{tx(p.name)}</b>
                      <span className="faint num" style={{ fontSize: 12 }}>{num(s.units)} {t('an.units')}</span>
                    </div>
                    <Sparkline values={s.series} className="spark-inline hide-sm" />
                    <b className="num" style={{ minWidth: 92, textAlign: 'right' }}>{moneyShort(s.revenue, lang)}</b>
                  </div>
                )
              })}
            </div>
          ) : <div className="panel__body"><Skeleton h={300} /></div>}
        </Panel>

        <Panel title={t('an.cities')} sub={t('an.citiesSub')}>
          {a ? (
            <div className="stack">
              <TileMap height={240} maxZoom={7} padding={36} markers={a.cities.map((c) => ({
                id: c.city, lat: c.lat, lon: c.lon, kind: 'dot', title: `${c.city}: ${money(c.revenue, lang)}`,
                size: Math.round(14 + 34 * Math.sqrt(c.revenue / (a.cities[0]?.revenue || 1))), label: c.orders,
              }))} />
              <BarList rows={a.cities.slice(0, 6).map((c) => ({ label: `${c.city} · ${num(c.orders)}`, value: c.revenue, display: moneyShort(c.revenue, lang) }))} />
            </div>
          ) : <Skeleton h={360} />}
        </Panel>
      </div>

      <div className="grid-3">
        <Panel title={t('an.categories')}>
          {a && categories.data ? (
            <BarList rows={a.categories.map((c) => ({ label: tx(categories.data!.find((x) => x.id === c.categoryId)?.name), value: c.revenue, display: moneyShort(c.revenue, lang) }))} />
          ) : <Skeleton h={220} />}
        </Panel>
        <Panel title={t('an.newRepeat')} sub={d ? `${t('an.repeatShare')}: ${pct(d.repeatShare)}` : undefined}>
          {a ? (
            <>
              <StackedBars height={180} labels={a.newVsRepeat.map((x) => dayLabel(x.date))} series={[a.newVsRepeat.map((x) => x.new), a.newVsRepeat.map((x) => x.repeat)]}
                colors={['var(--series-1)', 'var(--series-2)']} names={[t('an.new'), t('an.repeat')]} />
              <div className="legend" style={{ marginTop: 10 }}><span><i style={{ background: 'var(--series-1)' }} />{t('an.new')}</span><span><i style={{ background: 'var(--series-2)' }} />{t('an.repeat')}</span></div>
            </>
          ) : <Skeleton h={200} />}
        </Panel>
        <Panel title={t('an.lines')}>
          {a ? (
            <div className="row" style={{ gap: 18 }}>
              <Donut size={120} parts={[
                { value: a.lines.supplement, color: 'var(--series-1)', label: t('common.supplement') },
                { value: a.lines.cosmetic, color: 'var(--espresso)', label: t('common.cosmetic') },
              ]} />
              <div className="stack-sm grow">
                <LineRow color="var(--series-1)" label={t('common.supplement')} value={moneyShort(a.lines.supplement, lang)} share={pct(a.lines.supplement / ((a.lines.supplement + a.lines.cosmetic) || 1))} />
                <LineRow color="var(--espresso)" label={t('common.cosmetic')} value={moneyShort(a.lines.cosmetic, lang)} share={pct(a.lines.cosmetic / ((a.lines.supplement + a.lines.cosmetic) || 1))} />
              </div>
            </div>
          ) : <Skeleton h={120} />}
        </Panel>
      </div>

      <div className="grid-2">
        <Panel title={t('an.bottom')} flush>
          {a && products.data ? a.products.slice(-5).reverse().map((s) => {
            const p = product(s.productId)
            if (!p) return null
            return (
              <div key={s.productId} className="row" style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                <Thumb src={p.image} cosmetic={p.line === 'cosmetic'} />
                <b className="grow ellipsis">{tx(p.name)}</b>
                <span className="faint num">{num(s.units)} {t('an.units')}</span>
                <b className="num" style={{ minWidth: 86, textAlign: 'right' }}>{moneyShort(s.revenue, lang)}</b>
              </div>
            )
          }) : <div className="panel__body"><Skeleton h={220} /></div>}
        </Panel>
        <Panel title={t('an.forecast')} sub={t('stock.forecastNote')} actions={<Link className="btn btn--ghost btn--sm" to="/stock">{t('nav.stock')}</Link>} flush>
          {forecast.data && products.data ? [...forecast.data].filter((f) => f.daysLeft !== null).sort((x, y) => (x.daysLeft ?? 9e9) - (y.daysLeft ?? 9e9)).slice(0, 5).map((f) => {
            const p = product(f.productId)
            if (!p) return null
            const tone = f.stock === 0 ? 'danger' : (f.daysLeft ?? 99) <= 14 ? 'warning' : 'success'
            return (
              <div key={f.productId} className="row" style={{ padding: '10px 18px', borderBottom: '1px solid var(--line)' }}>
                <Thumb src={p.image} cosmetic={p.line === 'cosmetic'} />
                <div className="grow" style={{ minWidth: 0 }}><b className="ellipsis" style={{ display: 'block' }}>{tx(p.name)}</b><span className="faint num" style={{ fontSize: 12 }}>{num(f.stock)} {t('common.pcs')} · {f.dailyRate}/{t('common.days')}</span></div>
                <Pill tone={tone}>{f.stock === 0 ? t('stock.out') : `${f.daysLeft} ${t('common.days')}`}</Pill>
              </div>
            )
          }) : <div className="panel__body"><Skeleton h={220} /></div>}
        </Panel>
      </div>

      <Panel title={t('common.export')} sub="Excel (.xlsx)">
        <div className="row-wrap">
          <Button icon={<Download />} loading={busy === 'sales'} onClick={() => void download('sales')}>{t('an.exportSales')}</Button>
          <Button icon={<Download />} loading={busy === 'orders'} onClick={() => void download('orders')}>{t('an.exportOrders')}</Button>
          <Button icon={<Download />} loading={busy === 'stock'} onClick={() => void download('stock')}>{t('an.exportStock')}</Button>
          <Button icon={<Download />} loading={busy === 'customers'} onClick={() => void download('customers')}>{t('an.exportCustomers')}</Button>
        </div>
      </Panel>
    </div>
  )
}

function Kpi({ label, value, unit, cur, prev, series }: { label: string; value: ReactNode; unit?: string; cur?: number; prev?: number; series?: number[] }) {
  const { t } = useI18n()
  return (
    <div className="kpi">
      <div className="kpi__label">{label}</div>
      <div className="kpi__value">{value ?? <Skeleton w={90} h={24} />}{value && unit && <small>{unit}</small>}</div>
      <div className="kpi__foot">{cur !== undefined && prev !== undefined && <><Delta value={prev ? (cur - prev) / prev : null} />{t('common.vsPrev')}</>}</div>
      {series && <Sparkline className="kpi__spark" values={series} />}
    </div>
  )
}

function LineRow({ color, label, value, share }: { color: string; label: string; value: string; share: string }) {
  return (
    <div style={{ fontSize: 13, display: 'grid', gridTemplateColumns: '10px minmax(0,1fr)', gap: '2px 8px', alignItems: 'center' }}>
      <i style={{ width: 10, height: 10, borderRadius: 3, background: color }} />
      <span className="ellipsis">{label}</span>
      <span />
      <span className="num"><b>{value}</b> <span className="faint">· {share}</span></span>
    </div>
  )
}
