import { createBrowserRouter, RouterProvider, Outlet, useLocation, useRouteError } from 'react-router-dom'
import { I18nProvider, useTranslation } from './i18n'
import { AppProvider } from './store/AppContext'
import { AdminAuthProvider } from './store/AdminAuthContext'
import { Color, FocusRing, FontSize, FontWeight, Radius, Spacing } from './theme/tokens'
import GlobalLoading from './components/common/GlobalLoading'
import GlobalErrorToast from './components/common/GlobalErrorToast'
import MiniCartToast from './components/common/MiniCartToast'
import { CartProvider } from './store/CartContext'
import { UserProvider } from './store/UserContext'
import { CurrencyProvider } from './store/CurrencyContext'
import { routes } from './router'
import AppErrorBoundary from './components/common/AppErrorBoundary/AppErrorBoundary'
import ReauthModal from './components/common/ReauthModal'
import CustomerServiceFAB from './components/common/CustomerServiceFAB'

/** 路由级错误兜底：data router 会接管路由内渲染错误（不再冒泡到 AppErrorBoundary），
 * 这里保持一致的兜底呈现，避免用户看到 react-router 默认英文错误页。 */
function RouteErrorFallback() {
  const error = useRouteError()
  console.error('Route render error', error)
  const { t } = useTranslation()
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      padding: Spacing.xxl,
      background: Color.bg.page,
      color: Color.text.body,
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 480 }}>
        <p style={{
          margin: `0 0 ${Spacing.sm}px`,
          color: Color.primary,
          fontSize: FontSize.sm,
          fontWeight: FontWeight.semibold,
        }}>
          Ziggner
        </p>
        <h1 style={{
          margin: `0 0 ${Spacing.md}px`,
          color: Color.text.heading,
          fontSize: FontSize.heading,
          fontWeight: FontWeight.semibold,
          lineHeight: 1.25,
        }}>
          {t('common.errorBoundary.title')}
        </h1>
        <p style={{
          margin: `0 0 ${Spacing.xxl}px`,
          color: Color.text.secondary,
          fontSize: FontSize.md,
          lineHeight: 1.6,
        }}>
          {t('common.errorBoundary.description')}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          style={{
            minWidth: 136,
            minHeight: 44,
            padding: `0 ${Spacing.xl}px`,
            border: 0,
            borderRadius: Radius.md,
            background: Color.primary,
            color: Color.text.inverse,
            fontSize: FontSize.base,
            fontWeight: FontWeight.semibold,
            cursor: 'pointer',
          }}
          onFocus={(event) => { event.currentTarget.style.boxShadow = FocusRing.style }}
          onBlur={(event) => { event.currentTarget.style.boxShadow = 'none' }}
        >
          {t('common.errorBoundary.reload')}
        </button>
      </div>
    </main>
  )
}

/**
 * 电商全局浮层（登录失效弹窗 / 客服悬浮球 / 加购提示）。
 * 落地页（/）为沉浸式品牌体验，不渲染这些电商界面元素。
 */
function CommerceOverlays() {
  const { pathname } = useLocation()
  if (pathname === '/') return null
  return (
    <>
      <ReauthModal />
      <CustomerServiceFAB />
      <MiniCartToast />
    </>
  )
}

/** 无路径布局层：承载全局浮层 + 路由出口 */
function AppShell() {
  return (
    <>
      <CommerceOverlays />
      <Outlet />
    </>
  )
}

// data router：useBlocker / loader 等 data API 的前置要求
const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteErrorFallback />,
    children: routes,
  },
])

function App() {
  return (
    <I18nProvider>
    <AppErrorBoundary>
    <AppProvider>
      <GlobalLoading />
      <GlobalErrorToast />
      <CurrencyProvider>
      <UserProvider>
      <CartProvider>
        <AdminAuthProvider>
          <RouterProvider router={router} />
        </AdminAuthProvider>
      </CartProvider>
      </UserProvider>
      </CurrencyProvider>
    </AppProvider>
    </AppErrorBoundary>
    </I18nProvider>
  )
}

export default App
