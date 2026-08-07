import { createContext, useContext, useState, useCallback, ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'warning' | 'info'

interface GlobalError {
  message: string
  errorCode?: string
  type?: ToastType
}

interface AppContextType {
  globalLoading: boolean
  setGlobalLoading: (loading: boolean) => void
  globalError: GlobalError | null
  setGlobalError: (error: GlobalError | null) => void
  clearGlobalError: () => void
  showToast: (message: string, type?: ToastType) => void
}

const AppContext = createContext<AppContextType | undefined>(undefined)

export function AppProvider({ children }: { children: ReactNode }) {
  const [globalLoading, setGlobalLoading] = useState(false)
  const [globalError, setGlobalError] = useState<GlobalError | null>(null)

  const clearGlobalError = useCallback(() => setGlobalError(null), [])

  const showToast = useCallback((message: string, type: ToastType = 'error') => {
    setGlobalError({ message, type })
  }, [])

  return (
    <AppContext.Provider value={{
      globalLoading,
      setGlobalLoading,
      globalError,
      setGlobalError,
      clearGlobalError,
      showToast,
    }}>
      {children}
    </AppContext.Provider>
  )
}

export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext must be used within AppProvider')
  }
  return context
}