import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

type Kind = 'success' | 'error'
interface ToastItem { id: number; kind: Kind; text: string }
const ToastContext = createContext<(text: string, kind?: Kind) => void>(() => {})

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const push = useCallback((text: string, kind: Kind = 'success') => {
    const id = Date.now() + Math.random()
    setItems((list) => [...list.slice(-2), { id, kind, text }])
    setTimeout(() => setItems((list) => list.filter((t) => t.id !== id)), kind === 'error' ? 6000 : 3800)
  }, [])
  return (
    <ToastContext.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast toast--${t.kind}`}>
            {t.kind === 'error' ? <AlertTriangle /> : <CheckCircle2 />}
            <span>{t.text}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = () => useContext(ToastContext)
