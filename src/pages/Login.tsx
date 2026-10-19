import { useRef, useState, type FormEvent } from 'react'
import { Eye, EyeOff, LockKeyhole } from 'lucide-react'
import { api, ApiError, USE_MOCK } from '../api'
import { useAuth } from '../components/Auth'
import { BrandMark } from '../components/BrandMark'
import { Button, Field, Input } from '../components/ui'
import { useI18n } from '../lib/i18n'
import type { DictKey } from '../lib/dict'

const DEMO = [
  { login: 'owner@familygroup.store', password: 'FG-owner-2026', role: 'role.owner' },
  { login: 'manager@familygroup.store', password: 'FG-manager-2026', role: 'role.manager' },
  { login: 'operator@familygroup.store', password: 'FG-operator-2026', role: 'role.operator' },
  { login: 'bonus@familygroup.store', password: 'FG-bonus-2026', role: 'role.bonus' },
] as const

export function LoginPage() {
  const { t, lang, setLang } = useI18n()
  const { signIn } = useAuth()
  const [login, setLogin] = useState('')
  const [password, setPassword] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)
  const [ticket, setTicket] = useState<{ ticket: string; phone: string } | null>(null)
  const [code, setCode] = useState(['', '', '', '', '', ''])
  const codeRefs = useRef<(HTMLInputElement | null)[]>([])

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!login.trim() || !password) { setError(t('common.required')); return }
    setPending(true)
    try {
      const result = await api.auth.login(login.trim(), password)
      if (result.status === 'ok') signIn(result.session)
      else { setTicket({ ticket: result.ticket, phone: result.phoneHint }); setTimeout(() => codeRefs.current[0]?.focus(), 50) }
    } catch (err) {
      setError(err instanceof ApiError && err.message === 'inactive' ? t('auth.inactive') : err instanceof ApiError && err.status === 0 ? t('common.network') : t('auth.invalid'))
    } finally { setPending(false) }
  }

  const verify = async (digits = code) => {
    if (!ticket) return
    const value = digits.join('')
    if (value.length < 6) return
    setPending(true); setError(null)
    try {
      signIn(await api.auth.verify(ticket.ticket, value))
    } catch {
      setError(t('auth.otpInvalid'))
      setCode(['', '', '', '', '', ''])
      codeRefs.current[0]?.focus()
    } finally { setPending(false) }
  }

  const setDigit = (i: number, raw: string) => {
    const digits = raw.replace(/\D/g, '')
    const next = [...code]
    if (digits.length > 1) {
      digits.slice(0, 6 - i).split('').forEach((d, k) => { next[i + k] = d })
      setCode(next)
      codeRefs.current[Math.min(5, i + digits.length)]?.focus()
      if (next.every(Boolean)) void verify(next)
      return
    }
    next[i] = digits
    setCode(next)
    if (digits && i < 5) codeRefs.current[i + 1]?.focus()
    if (next.every(Boolean)) void verify(next)
  }

  return (
    <div className="login">
      <div className="login__art">
        <div className="row" style={{ gap: 12 }}>
          <BrandMark size={26} />
          <span style={{ font: '600 24px/1 var(--f-display)', color: '#FBF6EC' }}>Family Group</span>
        </div>
        <div className="login__shelf" aria-hidden="true">
          <img src="/img/products/vitamin-d3-k2.webp" alt="" />
          <img src="/img/products/omega-3.webp" alt="" />
          <img src="/img/products/collagen.webp" alt="" />
        </div>
        <h1>{t('auth.artTitle')}</h1>
        <p>{t('auth.artText')}</p>
      </div>

      <div className="login__panel">
        <div className="login__card">
          <div className="login__mbrand" aria-hidden="true">
            <BrandMark size={26} />
            <b>Family Group</b>
            <div>
              <img src="/img/products/vitamin-d3-k2.webp" alt="" />
              <img src="/img/products/omega-3.webp" alt="" />
              <img src="/img/products/collagen.webp" alt="" />
            </div>
          </div>
          <div className="row" style={{ justifyContent: 'flex-end', marginBottom: 28 }}>
            <div className="langswitch" role="group" aria-label="Language">
              <button type="button" aria-pressed={lang === 'uz'} onClick={() => setLang('uz')}>UZ</button>
              <button type="button" aria-pressed={lang === 'ru'} onClick={() => setLang('ru')}>RU</button>
            </div>
          </div>

          {!ticket ? (
            <form onSubmit={submit} noValidate>
              <h2>{t('auth.title')}</h2>
              <p className="page-sub">{t('auth.sub')}</p>
              <div className="stack">
                <Field label={t('auth.login')} htmlFor="login">
                  <Input id="login" autoComplete="username" value={login} onChange={(e) => setLogin(e.target.value)} autoFocus />
                </Field>
                <Field label={t('auth.password')} htmlFor="password">
                  <div style={{ position: 'relative' }}>
                    <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ paddingRight: 42 }} />
                    <button type="button" className="btn btn--ghost btn--icon btn--sm" style={{ position: 'absolute', right: 3, top: 3 }} onClick={() => setShow((v) => !v)} aria-label={show ? t('auth.hide') : t('auth.show')}>
                      {show ? <EyeOff /> : <Eye />}
                    </button>
                  </div>
                </Field>
                {error && <div className="field__error" role="alert">{error}</div>}
                <Button type="submit" variant="primary" size="lg" block loading={pending}>{t('auth.submit')}</Button>
              </div>
              {USE_MOCK && (
                <div className="demo-accounts">
                  <b>{t('auth.demoTitle')}</b>
                  {DEMO.map((d) => (
                    <button key={d.login} type="button" onClick={() => { setLogin(d.login); setPassword(d.password); setError(null) }}>
                      <strong>{t(d.role as DictKey)}</strong><span>{d.login}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          ) : (
            <div>
              <div className="empty__icon" style={{ marginBottom: 16 }}><LockKeyhole /></div>
              <h2>{t('auth.otpTitle')}</h2>
              <p className="page-sub">{t('auth.otpSub', { phone: ticket.phone })}</p>
              <div className="otp" onPaste={(e) => { e.preventDefault(); setDigit(0, e.clipboardData.getData('text')) }}>
                {code.map((d, i) => (
                  <input key={i} ref={(el) => { codeRefs.current[i] = el }} className="input" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'}
                    maxLength={6} value={d} aria-label={`${i + 1}`}
                    onChange={(e) => setDigit(i, e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) codeRefs.current[i - 1]?.focus() }} />
                ))}
              </div>
              {error && <div className="field__error" role="alert" style={{ marginTop: 10 }}>{error}</div>}
              <div className="stack" style={{ marginTop: 18 }}>
                <Button variant="primary" size="lg" block loading={pending} disabled={code.some((d) => !d)} onClick={() => void verify()}>{t('auth.otpVerify')}</Button>
                <Button variant="ghost" block onClick={() => { setTicket(null); setCode(['', '', '', '', '', '']); setError(null) }}>{t('auth.back')}</Button>
              </div>
              {USE_MOCK && <p className="callout callout--gold" style={{ marginTop: 18 }}>{t('auth.demoCode')}</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
