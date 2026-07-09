import { BrowserRouter, useRoutes } from 'react-router-dom'
import { I18nProvider } from './i18n'
import { AppProvider } from './store/AppContext'
import { AdminAuthProvider } from './store/AdminAuthContext'
import GlobalLoading from './components/common/GlobalLoading'
import GlobalErrorToast from './components/common/GlobalErrorToast'
import { CartProvider } from './store/CartContext'
import { UserProvider } from './store/UserContext'
import { routes } from './router'

function AppRoutes() {
  return useRoutes(routes)
}

function App() {
  return (
    <I18nProvider>
    <AppProvider>
      <GlobalLoading />
      <GlobalErrorToast />
      <UserProvider>
      <CartProvider>
        <AdminAuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
        </AdminAuthProvider>
      </CartProvider>
    </UserProvider>
    </AppProvider>
    </I18nProvider>
  )
}

export default App