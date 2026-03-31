import { createContext } from 'react'
import ja from './ja'
import en from './en'

export const translations = { ja, en }
export const STORAGE_KEY = 'issueboard_lang'

function getStorage() {
  if (typeof localStorage === 'object' && typeof localStorage.getItem === 'function') {
    return localStorage
  }
  return null
}

export function getInitialLang() {
  const storage = getStorage()
  const saved = storage?.getItem(STORAGE_KEY)
  if (saved && translations[saved]) return saved

  const browserLang = navigator.language?.split('-')[0]
  return browserLang === 'en' ? 'en' : 'ja'
}

export function persistLang(lang) {
  getStorage()?.setItem(STORAGE_KEY, lang)
}

export const I18nContext = createContext(null)
