import { useCallback, useState } from 'react'
import { I18nContext, getInitialLang, persistLang, translations } from './context'

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState(getInitialLang)

  const setLang = useCallback((newLang) => {
    setLangState(newLang)
    persistLang(newLang)
  }, [])

  const t = useCallback((key, params) => {
    let text = translations[lang]?.[key] || translations.ja[key] || key
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        text = text.replace(`{${k}}`, v)
      }
    }
    return text
  }, [lang])

  return (
    <I18nContext value={{ lang, setLang, t }}>
      {children}
    </I18nContext>
  )
}
