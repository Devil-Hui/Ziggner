// 路由配置集中管理

import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import Home from '../pages/Home/Home'
const Category = lazy(() => import('../pages/Category/Category'))
const ProductDetail = lazy(() => import('../pages/ProductDetail/ProductDetail'))
const Cart = lazy(() => import('../pages/Cart/Cart'))
const Checkout = lazy(() => import('../pages/Checkout/Checkout'))
const PaymentReturn = lazy(() => import('../pages/PaymentReturn/PaymentReturn'))
const MockPayment = lazy(() => import('../pages/MockPayment/MockPayment'))
const Profile = lazy(() => import('../pages/Profile/Profile'))
const AuthPage = lazy(() => import('../pages/Auth/AuthPage'))
const SetPasswordPage = lazy(() => import('../pages/Auth/SetPasswordPage'))
const Coupons = lazy(() => import('../pages/Coupons/Coupons'))
const CouponCenter = lazy(() => import('../pages/CouponCenter/CouponCenter'))
const CouponShare = lazy(() => import('../pages/CouponShare/CouponShare'))
const History = lazy(() => import('../pages/History/History'))
const TrackOrder = lazy(() => import('../pages/TrackOrder/TrackOrder'))
const DownloadApp = lazy(() => import('../pages/DownloadApp/DownloadApp'))
const AboutPage = lazy(() => import('../pages/AboutPage/AboutPage'))
const Support = lazy(() => import('../pages/Support/Support'))
const Chat = lazy(() => import('../pages/Chat/Chat'))
const OrderDetail = lazy(() => import('../pages/OrderDetail/OrderDetail'))
const Notifications = lazy(() => import('../pages/Notifications/Notifications'))
const Favorites = lazy(() => import('../pages/Favorites/Favorites'))
import { RoleProtectedRoute } from '../components/admin/ProtectedRoute'

// Admin pages — lazy loaded
const AdminLogin = lazy(() => import('../pages/admin/AdminLogin'))
const AdminLayout = lazy(() => import('../pages/admin/AdminLayout'))
const AdminProducts = lazy(() => import('../pages/admin/AdminProducts'))
const AdminProductForm = lazy(() => import('../pages/admin/AdminProductForm'))
const AdminProductAudit = lazy(() => import('../pages/admin/AdminProductAudit'))
const AdminCategories = lazy(() => import('../pages/admin/AdminCategories'))
const AdminBrands = lazy(() => import('../pages/admin/AdminBrands'))
const AdminTags = lazy(() => import('../pages/admin/AdminTags'))
const AdminNotifications = lazy(() => import('../pages/admin/AdminNotifications'))
const AdminApplications = lazy(() => import('../pages/admin/AdminApplications'))
const AdminCoupons = lazy(() => import('../pages/admin/AdminCoupons'))
const AdminActivities = lazy(() => import('../pages/admin/AdminActivities'))
const AdminAuditLogs = lazy(() => import('../pages/admin/AdminAuditLogs'))
const AdminRecycleBin = lazy(() => import('../pages/admin/AdminRecycleBin'))
const AdminGroups = lazy(() => import('../pages/admin/AdminGroups'))
const AdminTasks = lazy(() => import('../pages/admin/AdminTasks'))
const AdminOrders = lazy(() => import('../pages/admin/AdminOrders'))
const AdminChatList = lazy(() => import('../pages/admin/AdminChatList'))
const AdminChatDetail = lazy(() => import('../pages/admin/AdminChatDetail'))
const AdminEmailTemplates = lazy(() => import('../pages/admin/AdminEmailTemplates'))
const AdminRbac = lazy(() => import('../pages/admin/AdminRbac'))

const PageLoading = () => (
  <div style={{
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100vh',
    fontSize: '14px',
    color: '#999',
  }}>
    Loading...
  </div>
)

export const routes: RouteObject[] = [
  // ── admin.ziggner.com → 自动跳转管理登录 ──
  {
    path: '/',
    element: typeof window !== 'undefined' && window.location.hostname === 'admin.ziggner.com'
      ? <Navigate to="/admin/login" replace />
      : <Home />,
  },
  { path: '/category', element: <Suspense fallback={<PageLoading />}><Category /></Suspense> },
  { path: '/product/:id', element: <Suspense fallback={<PageLoading />}><ProductDetail /></Suspense> },
  { path: '/cart', element: <Suspense fallback={<PageLoading />}><Cart /></Suspense> },
  { path: '/checkout', element: <Suspense fallback={<PageLoading />}><Checkout /></Suspense> },
  { path: '/payment/return', element: <Suspense fallback={<PageLoading />}><PaymentReturn /></Suspense> },
  { path: '/mock-payment/:paymentNo', element: <Suspense fallback={<PageLoading />}><MockPayment /></Suspense> },
  { path: '/profile', element: <Suspense fallback={<PageLoading />}><Profile /></Suspense> },
  { path: '/auth/set-password', element: <Suspense fallback={<PageLoading />}><SetPasswordPage /></Suspense> },
  { path: '/auth', element: <Suspense fallback={<PageLoading />}><AuthPage /></Suspense> },
  { path: '/login', element: <Navigate to="/auth?tab=login" replace /> },
  { path: '/register', element: <Navigate to="/auth?tab=register" replace /> },
  { path: '/coupons', element: <Suspense fallback={<PageLoading />}><Coupons /></Suspense> },
  { path: '/coupons/center', element: <Suspense fallback={<PageLoading />}><CouponCenter /></Suspense> },
  { path: '/coupon/:code', element: <Suspense fallback={<PageLoading />}><CouponShare /></Suspense> },
  { path: '/coupon', element: <Navigate to="/coupons" replace /> },
  { path: '/history', element: <Suspense fallback={<PageLoading />}><History /></Suspense> },
  { path: '/about', element: <Suspense fallback={<PageLoading />}><AboutPage /></Suspense> },
  { path: '/support', element: <Suspense fallback={<PageLoading />}><Support /></Suspense> },
  { path: '/chat', element: <Suspense fallback={<PageLoading />}><Chat /></Suspense> },
  { path: '/order/:order_no', element: <Suspense fallback={<PageLoading />}><OrderDetail /></Suspense> },
  { path: '/notifications', element: <Suspense fallback={<PageLoading />}><Notifications /></Suspense> },
  { path: '/favorites', element: <Suspense fallback={<PageLoading />}><Favorites /></Suspense> },
  { path: '/track', element: <Suspense fallback={<PageLoading />}><TrackOrder /></Suspense> },
  { path: '/download', element: <Suspense fallback={<PageLoading />}><DownloadApp /></Suspense> },

  // ── Admin login (standalone, no layout) ──
  {
    path: '/admin/login',
    element: (
      <Suspense fallback={<PageLoading />}>
        <AdminLogin />
      </Suspense>
    ),
  },

  // ── Admin protected routes (wrapped in layout) ──
  {
    path: '/admin',
    element: (
      <Suspense fallback={<PageLoading />}>
        <RoleProtectedRoute>
          <AdminLayout />
        </RoleProtectedRoute>
      </Suspense>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/products" replace /> },
      { path: 'products', element: <Suspense fallback={<PageLoading />}><AdminProducts /></Suspense> },
      { path: 'products/create', element: <Suspense fallback={<PageLoading />}><AdminProductForm /></Suspense> },
      { path: 'products/:id', element: <Suspense fallback={<PageLoading />}><AdminProductForm /></Suspense> },
      { path: 'products/:id/audit', element: <Suspense fallback={<PageLoading />}><AdminProductAudit /></Suspense> },
      { path: 'categories', element: <Suspense fallback={<PageLoading />}><AdminCategories /></Suspense> },
      { path: 'brands', element: <Suspense fallback={<PageLoading />}><AdminBrands /></Suspense> },
      { path: 'tags', element: <Suspense fallback={<PageLoading />}><AdminTags /></Suspense> },
      { path: 'notifications', element: <Suspense fallback={<PageLoading />}><AdminNotifications /></Suspense> },
      { path: 'applications', element: <Suspense fallback={<PageLoading />}><AdminApplications /></Suspense> },
      { path: 'coupons', element: <Suspense fallback={<PageLoading />}><AdminCoupons /></Suspense> },
      { path: 'orders', element: <Suspense fallback={<PageLoading />}><AdminOrders /></Suspense> },
      { path: 'activities', element: <Suspense fallback={<PageLoading />}><AdminActivities /></Suspense> },
      { path: 'audit-logs', element: <Suspense fallback={<PageLoading />}><AdminAuditLogs /></Suspense> },
      { path: 'recycle-bin', element: <Suspense fallback={<PageLoading />}><AdminRecycleBin /></Suspense> },
      { path: 'groups', element: <Suspense fallback={<PageLoading />}><AdminGroups /></Suspense> },
      { path: 'tasks', element: <Suspense fallback={<PageLoading />}><AdminTasks /></Suspense> },
      { path: 'rbac', element: <Suspense fallback={<PageLoading />}><AdminRbac /></Suspense> },
      { path: 'chat', element: <Suspense fallback={<PageLoading />}><AdminChatList /></Suspense> },
      { path: 'chat/:id', element: <Suspense fallback={<PageLoading />}><AdminChatDetail /></Suspense> },
      { path: 'email-templates', element: <Suspense fallback={<PageLoading />}><AdminEmailTemplates /></Suspense> },
      { path: '*', element: <Navigate to="/admin/products" replace /> },
    ],
  },
]
