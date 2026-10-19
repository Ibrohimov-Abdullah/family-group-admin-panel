import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { dict, type DictKey } from './dict'
import type { Lang, Localized } from '../api/types'

interface I18n {
  lang: Lang
  setLang: (lang: Lang) => void
  t: (key: DictKey, vars?: Record<string, string | number>) => string
  /** Pick the current language from a Localized value. */
  tx: (value: Localized | null | undefined) => string
}

const LANG_KEY = 'fg_admin_lang'
const I18nContext = createContext<I18n | null>(null)

function initialLang(): Lang {
  try {
    const saved = localStorage.getItem(LANG_KEY)
    if (saved === 'uz' || saved === 'ru') return saved
  } catch { /* ignore */ }
  return 'uz'
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang)

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const setLang = useCallback((next: Lang) => {
    setLangState(next)
    try { localStorage.setItem(LANG_KEY, next) } catch { /* ignore */ }
  }, [])

  const value = useMemo<I18n>(() => ({
    lang,
    setLang,
    t: (key, vars) => {
      const entry = dict[key]
      let text: string = entry ? entry[lang === 'uz' ? 0 : 1] : key
      if (vars) for (const [k, v] of Object.entries(vars)) text = text.replaceAll(`{${k}}`, String(v))
      return text
    },
    tx: (value) => (value ? value[lang] || value.uz : ''),
  }), [lang, setLang])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18n {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n outside I18nProvider')
  return ctx
}
