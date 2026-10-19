import { useEffect, useState } from 'react'
import { ScrollText, Search } from 'lucide-react'
import { api, type ActivityEntry } from '../api'
import { useI18n } from '../lib/i18n'
import { useQuery } from '../lib/query'
import { dateTime } from '../lib/format'
import { Avatar, DataTable, EmptyState, ErrorBox, Input, PageHeader, Pager, Pill, Select, SkeletonRows, type Column } from '../components/ui'
import type { DictKey } from '../lib/dict'

const ENTITIES: ActivityEntry['entity'][] = ['order', 'product', 'stock', 'customer', 'promo', 'consultation', 'review', 'content', 'pharmacy', 'rep', 'bonus', 'courier', 'staff', 'settings', 'auth']

export function ActivityPage() {
  const { t, lang } = useI18n()
  const [q, setQ] = useState('')
  const [debounced, setDebounced] = useState('')
  const [entity, setEntity] = useState<ActivityEntry['entity'] | 'all'>('all')
  const [userId, setUserId] = useState('')
  const [page, setPage] = useState(1)
  useEffect(() => { const h = setTimeout(() => setDebounced(q), 250); return () => clearTimeout(h) }, [q])
  useEffect(() => { setPage(1) }, [debounced, entity, userId])
  const params = { q: debounced || undefined, entity, userId: userId || undefined, page, pageSize: 30 }
  const log = useQuery(`activity:${JSON.stringify(params)}`, () => api.activity.list(params))
  const staff = useQuery('staff', () => api.staff.list())

  const columns: Column<ActivityEntry>[] = [
    { key: 'at', header: t('common.date'), cell: (a) => <span className="nowrap num">{dateTime(a.at, lang)}</span> },
    { key: 'user', header: t('act.user'), cell: (a) => <div className="row"><Avatar name={a.userName} /><div><span className="cell-strong">{a.userName}</span><span className="cell-sub">{t(`role.${a.role}` as DictKey)}</span></div></div> },
    { key: 'entity', header: t('act.object'), cell: (a) => <Pill plain>{t(`act.entity.${a.entity}` as DictKey)}</Pill> },
    { key: 'summary', header: t('act.action'), cell: (a) => <span>{a.summary}</span> },
  ]

  return (
    <div>
      <PageHeader title={t('act.title')} sub={t('act.sub')} />
      <div className="panel">
        <div className="panel__head" style={{ flexWrap: 'wrap', gap: 10 }}>
          <div className="input-icon" style={{ flex: '1 1 220px', maxWidth: 320 }}><Search /><Input size="sm" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('act.searchPh')} aria-label={t('common.search')} /></div>
          <Select size="sm" value={entity} onChange={(e) => setEntity(e.target.value as ActivityEntry['entity'] | 'all')} style={{ width: 'auto' }} aria-label={t('act.object')}>
            <option value="all">{t('act.allEntities')}</option>
            {ENTITIES.map((en) => <option key={en} value={en}>{t(`act.entity.${en}` as DictKey)}</option>)}
          </Select>
          <Select size="sm" value={userId} onChange={(e) => setUserId(e.target.value)} style={{ width: 'auto' }} aria-label={t('act.user')}>
            <option value="">{t('act.allUsers')}</option>
            {staff.data?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </div>
        {log.error ? <div className="panel__body"><ErrorBox error={log.error} onRetry={log.refetch} /></div>
          : !log.data ? <SkeletonRows rows={10} cols={4} />
          : <>
              <DataTable rows={log.data.items} columns={columns} rowKey={(a) => a.id} empty={<EmptyState icon={<ScrollText />} title={t('act.empty')} />} />
              <Pager page={page} pageSize={30} total={log.data.total} onPage={setPage} />
            </>}
      </div>
    </div>
  )
}
