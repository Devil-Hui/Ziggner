import { createBrowserRouter, RouterProvider, Outlet, useLocation } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { AppProvider } from './store/AppContext'
import { AdminAuthProvider } from './store/AdminAuthContext'
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
