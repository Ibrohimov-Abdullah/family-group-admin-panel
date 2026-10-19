import { useEffect, useMemo, useRef, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  BarChart3, Boxes, ClipboardList, FileText, Gift, HeartHandshake, Home, LogOut, Map, Menu, MessageSquareQuote,
  PackageSearch, PanelLeftClose, PanelLeftOpen, Percent, PhoneCall, ScrollText, Search, Settings, ShieldCheck, Store,
  Truck, Users, Stethoscope, type LucideIcon,
} from 'lucide-react'
import { createPortal } from 'react-dom'
import { api, USE_MOCK, type Badges, type SearchHit } from '../api'
import { useI18n } from '../lib/i18n'
import { useAuth } from './Auth'
import { BrandMark } from './BrandMark'
import { Avatar, cx } from './ui'
import { can, type Section } from '../lib/permissions'
import { useQuery } from '../lib/query'
import type { DictKey } from '../lib/dict'

interface NavItem { to: string; section: Section | null; label: DictKey; icon: LucideIcon; badge?: keyof Badges; soon?: boolean }
interface NavGroup { label: DictKey; items: NavItem[] }

export const NAV: NavGroup[] = [
  { label: 'nav.groupWork', items: [
    { to: '/', section: 'inbox', label: 'nav.inbox', icon: Home },
    { to: '/orders', section: 'orders', label: 'nav.orders', icon: ClipboardList, badge: 'orders' },
    { to: '/consultations', section: 'consultations', label: 'nav.consultations', icon: PhoneCall, badge: 'consultations' },
    { to: '/delivery', section: 'delivery', label: 'nav.delivery', icon: Truck },
    { to: '/analytics', section: 'dashboard', label: 'nav.dashboard', icon: BarChart3 },
  ] },
  { label: 'nav.groupCatalog', items: [
    { to: '/products', section: 'products', label: 'nav.products', icon: PackageSearch },
    { to: '/stock', section: 'stock', label: 'nav.stock', icon: Boxes, badge: 'stock' },
    { to: '/promotions', section: 'promos', label: 'nav.promos', icon: Percent },
  ] },
  { label: 'nav.groupPeople', items: [
    { to: '/customers', section: 'customers', label: 'nav.customers', icon: Users },
    { to: '/reviews', section: 'reviews', label: 'nav.reviews', icon: MessageSquareQuote, badge: 'reviews' },
    { to: '/content', section: 'content', label: 'nav.content', icon: FileText },
  ] },
  { label: 'nav.groupNetwork', items: [
    { to: '/pharmacies', section: 'pharmacies', label: 'nav.pharmacies', icon: Store },
    { to: '/bonus', section: 'bonus', label: 'nav.bonus', icon: Gift },
    { to: '/checkups', section: null, label: 'nav.checkups', icon: Stethoscope, soon: true },
  ] },
  { label: 'nav.groupSystem', items: [
    { to: '/staff', section: 'staff', label: 'nav.staff', icon: ShieldCheck },
    { to: '/activity', section: 'activity', label: 'nav.activity', icon: ScrollText },
    { to: '/settings', section: 'settings', label: 'nav.settings', icon: Settings },
  ] },
]

const COLLAPSE_KEY = 'fg_admin_rail'

export function Shell() {
  const { t, lang, setLang } = useI18n()
  const { user, signOut } = useAuth()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem(COLLAPSE_KEY) === '1' } catch { return false } })
  const [menuOpen, setMenuOpen] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [userMenu, setUserMenu] = useState(false)
  const { data: badges } = useQuery('badges', () => api.inbox.badges(), { refreshMs: 30_000 })

  useEffect(() => { setMenuOpen(false); setUserMenu(false) }, [location.pathname])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setPaletteOpen((v) => !v) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggleRail = () => {
    setCollapsed((v) => { try { localStorage.setItem(COLLAPSE_KEY, v ? '0' : '1') } catch { /* ignore */ } return !v })
  }

  const groups = NAV.map((g) => ({ ...g, items: g.items.filter((i) => i.soon || can(user?.role, i.section as Section)) })).filter((g) => g.items.length)

  return (
    <div className={cx('shell', collapsed && 'is-collapsed', menuOpen && 'is-menu-open')}>
      <aside className="rail" aria-label={t('nav.menu')}>
        <div className="rail__brand">
          <BrandMark size={22} className="rail__mark" />
          <div className="rail__word">Family Group<small>{t('nav.backOffice')}</small></div>
        </div>
        <nav className="rail__nav">
          {groups.map((group) => (
            <div key={group.label} className="rail__group">
              <div className="rail__label">{t(group.label)}</div>
              {group.items.map((item) => {
                const Icon = item.icon
                const count = item.badge ? badges?.[item.badge] : 0
                if (item.soon) {
                  return (
                    <NavLink key={item.to} to={item.to} className={({ isActive }) => cx('rail__link', 'is-disabled', isActive && 'is-active')} title={`${t(item.label)} · ${t('nav.soon')}`}>
                      <Icon /><span>{t(item.label)}</span><span className="rail__soon">{t('nav.soon')}</span>
                    </NavLink>
                  )
                }
                return (
                  <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => cx('rail__link', isActive && 'is-active')} title={t(item.label)}>
                    <Icon /><span>{t(item.label)}</span>
                    {count ? <b className="rail__count" aria-label={`${count}`}>{count > 99 ? '99+' : count}</b> : null}
                  </NavLink>
                )
              })}
            </div>
          ))}
        </nav>
        <div className="rail__foot">
          <button type="button" className="rail__collapse" onClick={toggleRail} aria-label={collapsed ? t('nav.expand') : t('nav.collapse')}>
            {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}<span>{t('nav.collapse')}</span>
          </button>
        </div>
      </aside>
      {menuOpen && <div className="rail-scrim" onClick={() => setMenuOpen(false)} />}

      <div className="main">
        <header className="topbar">
          <button type="button" className="btn btn--ghost btn--icon topbar__menu" onClick={() => setMenuOpen(true)} aria-label={t('nav.menu')}><Menu /></button>
          <button type="button" className="searchbtn" onClick={() => setPaletteOpen(true)}>
            <Search /><span className="ellipsis">{t('nav.search')}</span><kbd>Ctrl K</kbd>
          </button>
          <div className="right row">
            {USE_MOCK && <span className="demo-badge" title={t('set.demoText')}><span>{t('common.demo')}</span></span>}
            <div className="langswitch" role="group" aria-label="Language">
              <button type="button" aria-pressed={lang === 'uz'} onClick={() => setLang('uz')}>UZ</button>
              <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>RU</button>
            </div>
            {user && (
              <div style={{ position: 'relative' }}>
                <button type="button" className="userchip" onClick={() => setUserMenu((v) => !v)} aria-expanded={userMenu} aria-haspopup="menu">
                  <Avatar name={user.name} />
                  <span className="userchip__meta"><b>{user.name}</b><span>{t(`role.${user.role}` as DictKey)}</span></span>
                </button>
                {userMenu && (
                  <div role="menu" className="panel" style={{ position: 'absolute', right: 0, top: 'calc(100% + 8px)', width: 220, padding: 6, zIndex: 40, boxShadow: 'var(--sh-3)' }}>
                    <div style={{ padding: '8px 10px 10px', borderBottom: '1px solid var(--line)', marginBottom: 6 }}>
                      <b style={{ display: 'block' }}>{user.name}</b>
                      <span className="faint" style={{ fontSize: 12 }}>{user.email}</span>
                    </div>
                    <button type="button" role="menuitem" className="btn btn--ghost btn--block" style={{ justifyContent: 'flex-start' }} onClick={() => void signOut()}>
                      <LogOut />{t('nav.logout')}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="content" id="main">
          <Outlet />
        </main>
      </div>
      {paletteOpen && <CommandPalette onClose={() => setPaletteOpen(false)} />}
    </div>
  )
}

/* ------------------------------------------------------- command palette */

const HIT_ROUTE: Record<SearchHit['kind'], (id: string) => string> = {
  order: (id) => `/orders/${id}`,
  product: (id) => `/products/${id}`,
  customer: (id) => `/customers/${id}`,
  pharmacy: () => '/pharmacies',
  rep: () => '/bonus',
}

const HIT_ICON: Record<SearchHit['kind'], LucideIcon> = { order: ClipboardList, product: PackageSearch, customer: Users, pharmacy: Store, rep: HeartHandshake }

function CommandPalette({ onClose }: { onClose: () => void }) {
  const { t } = useI18n()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const [hits, setHits] = useState<SearchHit[]>([])
  const [active, setActive] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { inputRef.current?.focus() }, [])
  useEffect(() => {
    if (q.trim().length < 2) { setHits([]); return }
    const id = setTimeout(() => { api.search(q).then(setHits, () => setHits([])) }, 160)
    return () => clearTimeout(id)
  }, [q])

  const pages = useMemo(() => NAV.flatMap((g) => g.items)
    .filter((i) => !i.soon && can(user?.role, i.section as Section))
    .filter((i) => !q.trim() || t(i.label).toLowerCase().includes(q.trim().toLowerCase()))
    .map((i) => ({ key: i.to, title: t(i.label), sub: '', icon: i.icon ?? Map, to: i.to })), [q, t, user?.role])

  const results = [
    ...hits.map((h) => ({ key: `${h.kind}-${h.id}`, title: h.title, sub: h.subtitle, icon: HIT_ICON[h.kind], to: HIT_ROUTE[h.kind](h.id) })),
    ...pages,
  ]

  useEffect(() => { setActive(0) }, [q, hits.length])

  const go = (to: string) => { onClose(); navigate(to) }

  return createPortal(
    <>
      <div className="overlay" onClick={onClose} />
      <div className="palette" role="dialog" aria-modal="true" aria-label={t('common.search')}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onClose()
          if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(results.length - 1, a + 1)) }
          if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)) }
          if (e.key === 'Enter' && results[active]) go(results[active].to)
        }}>
        <div className="palette__input">
          <Search />
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('nav.search')} aria-label={t('common.search')} />
        </div>
        <div className="palette__list" role="listbox">
          {results.length === 0 && <div className="palette__empty">{t('common.notFound')}</div>}
          {results.map((r, i) => {
            const Icon = r.icon
            return (
              <button key={r.key} type="button" role="option" aria-selected={i === active} className="palette__item" onMouseEnter={() => setActive(i)} onClick={() => go(r.to)}>
                <Icon />
                <span className="grow" style={{ display: 'grid' }}><b className="ellipsis">{r.title}</b>{r.sub && <span className="ellipsis">{r.sub}</span>}</span>
              </button>
            )
          })}
        </div>
      </div>
    </>,
    document.body,
  )
}
