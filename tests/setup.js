import React from 'react'
import '@testing-library/jest-dom/vitest'
import { afterEach, beforeEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { I18nProvider } from '../src/i18n'

vi.mock('@testing-library/react', async (importOriginal) => {
  const actual = await importOriginal()

  const wrapUi = (ui, wrapper) => {
    if (typeof localStorage?.getItem === 'function' && !localStorage.getItem('issueboard_lang')) {
      localStorage.setItem('issueboard_lang', 'ja')
    }

    return wrapper
      ? React.createElement(
          I18nProvider,
          null,
          React.createElement(wrapper, null, ui),
        )
      : React.createElement(I18nProvider, null, ui)
  }

  return {
    ...actual,
    render: (ui, options = {}) => {
      const rendered = actual.render(wrapUi(ui, options.wrapper), { ...options, wrapper: undefined })
      return {
        ...rendered,
        rerender: (nextUi, nextOptions = options) => rendered.rerender(wrapUi(nextUi, nextOptions.wrapper)),
      }
    },
  }
})

afterEach(() => {
  cleanup()
  if (typeof localStorage?.clear === 'function') localStorage.clear()
  if (typeof sessionStorage?.clear === 'function') sessionStorage.clear()
})

beforeEach(() => {
  Object.defineProperty(window.navigator, 'language', {
    configurable: true,
    value: 'ja-JP',
  })
})
