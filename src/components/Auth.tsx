import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { api, onUnauthorized, tokenStore, type Session, type StaffMember } from '../api'

interface AuthState {
  user: StaffMember | null
  ready: boolean
  signIn: (session: Session) => void
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthState | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<StaffMember | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!tokenStore.get()) { setReady(true); return }
    api.auth.me().then(setUser, () => tokenStore.set(null)).finally(() => setReady(true))
  }, [])

  useEffect(() => {
    const handler = () => { tokenStore.set(null); setUser(null) }
    onUnauthorized.addEventListener('unauthorized', handler)
    return () => onUnauthorized.removeEventListener('unauthorized', handler)
  }, [])

  const signIn = useCallback((session: Session) => {
    tokenStore.set(session.token)
    setUser(session.user)
  }, [])

  const signOut = useCallback(async () => {
    try { await api.auth.logout() } catch { /* the token is dropped either way */ }
    tokenStore.set(null)
    setUser(null)
  }, [])

  return <AuthContext.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth outside AuthProvider')
  return ctx
}
