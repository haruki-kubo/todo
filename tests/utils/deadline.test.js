import { describe, expect, test } from 'vitest'

import {
  getDeadlineInfo,
  insertDeadlineToBody,
  parseDeadline,
} from '../../src/utils/deadline.js'

function withMockedNow(isoString, fn) {
  const RealDate = Date
  const fixed = new RealDate(isoString)

  class MockDate extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        super(fixed.toISOString())
        return
      }
      super(...args)
    }

    static now() {
      return fixed.getTime()
    }

    static parse(value) {
      return RealDate.parse(value)
    }

    static UTC(...args) {
      return RealDate.UTC(...args)
    }
  }

  globalThis.Date = MockDate
  try {
    fn()
  } finally {
    globalThis.Date = RealDate
  }
}

describe('deadline utilities', () => {
  test('parseDeadline parses YYYY-MM-DD format', () => {
    const result = parseDeadline('本文\n📅 期限: 2026-04-05\nメモ')

    expect(result).toBeInstanceOf(Date)
    expect(result?.getFullYear()).toBe(2026)
    expect(result?.getMonth()).toBe(3)
    expect(result?.getDate()).toBe(5)
  })

  test('parseDeadline parses YYYY/MM/DD format', () => {
    const result = parseDeadline('📅 期限: 2026/4/7')

    expect(result).toBeInstanceOf(Date)
    expect(result?.getMonth()).toBe(3)
    expect(result?.getDate()).toBe(7)
  })

  test('parseDeadline returns null when deadline line is missing', () => {
    expect(parseDeadline('期限なしの本文')).toBeNull()
  })

  test('getDeadlineInfo returns overdue display for past dates', () => {
    withMockedNow('2026-03-28T09:00:00+09:00', () => {
      const info = getDeadlineInfo(new Date('2026-03-26T00:00:00'))

      expect(info).toEqual({
        label: '3/26',
        status: 'overdue',
        text: '🔥 3/26（2日超過）',
      })
    })
  })

  test('getDeadlineInfo returns soon display for deadlines within 3 days', () => {
    withMockedNow('2026-03-28T09:00:00+09:00', () => {
      const info = getDeadlineInfo(new Date('2026-03-30T00:00:00'))

      expect(info).toEqual({
        label: '3/30',
        status: 'soon',
        text: '⚠️ 3/30（あと2日）',
      })
    })
  })

  test('getDeadlineInfo returns normal display for later deadlines', () => {
    withMockedNow('2026-03-28T09:00:00+09:00', () => {
      const info = getDeadlineInfo(new Date('2026-04-10T00:00:00'))

      expect(info).toEqual({
        label: '4/10',
        status: 'normal',
        text: '📅 4/10',
      })
    })
  })

  test('insertDeadlineToBody prepends deadline line to body', () => {
    const result = insertDeadlineToBody('作業内容', '2026-04-05')

    expect(result).toBe('📅 期限: 2026-04-05\n\n作業内容')
  })

  test('insertDeadlineToBody returns deadline line only when body is empty', () => {
    expect(insertDeadlineToBody('', '2026-04-05')).toBe('📅 期限: 2026-04-05')
  })

  test('insertDeadlineToBody returns original body when date is empty', () => {
    expect(insertDeadlineToBody('本文のみ', '')).toBe('本文のみ')
  })
})
