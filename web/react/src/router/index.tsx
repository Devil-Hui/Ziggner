// 路由配置集中管理

import { lazy, Suspense } from 'react'
import { Navigate, type RouteObject } from 'react-router-dom'
import Home from '../pages/Home/Home'
import Category from '../pages/Category/Category'
import ProductDetail from '../pages/ProductDetail/ProductDetail'
import Cart from '../pages/Cart/Cart'
import Checkout from '../pages/Checkout/Checkout'
import PaymentReturn from '../pages/PaymentReturn/PaymentReturn'
import MockPayment from '../pages/MockPayment/MockPayment'
import Profile from '../pages/Profile/Profile'
import AuthPage from '../pages/Auth/AuthPage'
import SetPasswordPage from '../pages/Auth/SetPasswordPage'
import Coupons from '../pages/Coupons/Coupons'
import CouponShare from '../pages/CouponShare/CouponShare'
import History from '../pages/History/History'
import AboutPage from '../pages/AboutPage/AboutPage'
import Support from '../pages/Support/Support'
import Chat from '../pages/Chat/Chat'
import OrderDetail from '../pages/OrderDetail/OrderDetail'
import Notifications from '../pages/Notifications/Notifications'
import Favorites from '../pages/Favorites/Favorites'
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
  // ── Public routes ──
  { path: '/', element: <Home /> },
  { path: '/category', element: <Category /> },
  { path: '/product/:id', element: <ProductDetail /> },
  { path: '/cart', element: <Cart /> },
  { path: '/checkout', element: <Checkout /> },
  { path: '/payment/return', element: <PaymentReturn /> },
  { path: '/mock-payment/:paymentNo', element: <MockPayment /> },
  { path: '/profile', element: <Profile /> },
  { path: '/auth/set-password', element: <SetPasswordPage /> },
  { path: '/auth', element: <AuthPage /> },
  { path: '/login', element: <Navigate to="/auth?tab=login" replace /> },
  { path: '/register', element: <Navigate to="/auth?tab=register" replace /> },
  { path: '/coupons', element: <Coupons /> },
  { path: '/coupon/:code', element: <CouponShare /> },
  { path: '/coupon', element: <Navigate to="/coupons" replace /> },
  { path: '/history', element: <History /> },
  { path: '/about', element: <AboutPage /> },
  { path: '/support', element: <Support /> },
  { path: '/chat', element: <Chat /> },
  { path: '/order/:order_no', element: <OrderDetail /> },
  { path: '/notifications', element: <Notifications /> },
  { path: '/favorites', element: <Favorites /> },

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
      { path: 'chat', element: <Suspense fallback={<PageLoading />}><AdminChatList /></Suspense> },
      { path: 'chat/:id', element: <Suspense fallback={<PageLoading />}><AdminChatDetail /></Suspense> },
      { path: 'email-templates', element: <Suspense fallback={<PageLoading />}><AdminEmailTemplates /></Suspense> },
      { path: '*', element: <Navigate to="/admin/products" replace /> },
    ],
  },
]
