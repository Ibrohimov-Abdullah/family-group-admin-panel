import { lazy, Suspense, type ReactNode } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { Stethoscope } from 'lucide-react'
import { useAuth } from './components/Auth'
import { Shell } from './components/Shell'
import { EmptyState, PageHeader } from './components/ui'
import { BrandMark } from './components/BrandMark'
import { useI18n } from './lib/i18n'
import { can, type Section } from './lib/permissions'
import { LoginPage } from './pages/Login'
import { InboxPage } from './pages/Inbox'
const SettingsPage = lazy(() => import('./pages/Settings').then((m) => ({ default: m.SettingsPage })))
const ActivityPage = lazy(() => import('./pages/Activity').then((m) => ({ default: m.ActivityPage })))
const StaffPage = lazy(() => import('./pages/Staff').then((m) => ({ default: m.StaffPage })))
const BonusPage = lazy(() => import('./pages/Bonus').then((m) => ({ default: m.BonusPage })))
const PharmaciesPage = lazy(() => import('./pages/Pharmacies').then((m) => ({ default: m.PharmaciesPage })))
const ContentPage = lazy(() => import('./pages/Content').then((m) => ({ default: m.ContentPage })))
const ReviewsPage = lazy(() => import('./pages/Reviews').then((m) => ({ default: m.ReviewsPage })))
const CustomersPage = lazy(() => import('./pages/Customers').then((m) => ({ default: m.CustomersPage })))
const PromotionsPage = lazy(() => import('./pages/Promotions').then((m) => ({ default: m.PromotionsPage })))
const StockPage = lazy(() => import('./pages/Stock').then((m) => ({ default: m.StockPage })))
const ConsultationsPage = lazy(() => import('./pages/Consultations').then((m) => ({ default: m.ConsultationsPage })))
const DeliveryPage = lazy(() => import('./pages/Delivery').then((m) => ({ default: m.DeliveryPage })))
const AnalyticsPage = lazy(() => import('./pages/Analytics').then((m) => ({ default: m.AnalyticsPage })))
const OrdersPage = lazy(() => import('./pages/Orders').then((m) => ({ default: m.OrdersPage })))
const ProductsPage = lazy(() => import('./pages/Products').then((m) => ({ default: m.ProductsPage })))
const ProductEditorPage = lazy(() => import('./pages/Products').then((m) => ({ default: m.ProductEditorPage })))

function Guard({ section, children }: { section: Section; children: ReactNode }) {
  const { user } = useAuth()
  const { t } = useI18n()
  if (!can(user?.role, section)) return <EmptyState title={t('common.forbidden')} />
  return <Suspense fallback={<PageFallback />}>{children}</Suspense>
}

function PageFallback() {
  return (
    <div className="stack" aria-busy="true">
      <span className="skel" style={{ width: 260, height: 30 }} />
      <span className="skel" style={{ width: '100%', height: 360, borderRadius: 14 }} />
    </div>
  )
}

function Checkups() {
  const { t } = useI18n()
  return (
    <>
      <PageHeader title={t('checkups.title')} />
      <div className="panel"><EmptyState icon={<Stethoscope />} title={t('nav.soon')} text={t('checkups.text')} /></div>
    </>
  )
}

export function App() {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) {
    return (
      <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', background: 'var(--espresso)' }} aria-busy="true">
        <BrandMark size={34} />
      </div>
    )
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="*" element={<Navigate to="/login" replace state={{ from: location.pathname }} />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<Navigate to={(location.state as { from?: string } | null)?.from ?? '/'} replace />} />
      <Route element={<Shell />}>
        <Route index element={<InboxPage />} />
        <Route path="orders" element={<Guard section="orders"><OrdersPage /></Guard>} />
        <Route path="orders/:id" element={<Guard section="orders"><OrdersPage /></Guard>} />
        <Route path="consultations" element={<Guard section="consultations"><ConsultationsPage /></Guard>} />
        <Route path="delivery" element={<Guard section="delivery"><DeliveryPage /></Guard>} />
        <Route path="analytics" element={<Guard section="dashboard"><AnalyticsPage /></Guard>} />
        <Route path="products" element={<Guard section="products"><ProductsPage /></Guard>} />
        <Route path="products/new" element={<Guard section="products"><ProductEditorPage /></Guard>} />
        <Route path="products/:id" element={<Guard section="products"><ProductEditorPage /></Guard>} />
        <Route path="stock" element={<Guard section="stock"><StockPage /></Guard>} />
        <Route path="promotions" element={<Guard section="promos"><PromotionsPage /></Guard>} />
        <Route path="customers" element={<Guard section="customers"><CustomersPage /></Guard>} />
        <Route path="customers/:id" element={<Guard section="customers"><CustomersPage /></Guard>} />
        <Route path="reviews" element={<Guard section="reviews"><ReviewsPage /></Guard>} />
        <Route path="content" element={<Guard section="content"><ContentPage /></Guard>} />
        <Route path="pharmacies" element={<Guard section="pharmacies"><PharmaciesPage /></Guard>} />
        <Route path="bonus" element={<Guard section="bonus"><BonusPage /></Guard>} />
        <Route path="checkups" element={<Checkups />} />
        <Route path="staff" element={<Guard section="staff"><StaffPage /></Guard>} />
        <Route path="activity" element={<Guard section="activity"><ActivityPage /></Guard>} />
        <Route path="settings" element={<Guard section="settings"><SettingsPage /></Guard>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
