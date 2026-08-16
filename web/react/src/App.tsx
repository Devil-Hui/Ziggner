import { BrowserRouter, useRoutes } from 'react-router-dom'
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
import CustomerServiceFAB from './components/common/CustomerServiceFAB'

function AppRoutes() {
  return useRoutes(routes)
}

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
        <BrowserRouter>
          <AppRoutes />
          <CustomerServiceFAB />
          <MiniCartToast />
        </BrowserRouter>
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
