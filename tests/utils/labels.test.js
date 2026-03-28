import { describe, expect, test } from 'vitest'

import {
  classifyLabels,
  getCategoryLabel,
  getCategoryOrder,
  getPriorityKey,
  getPriorityLabel,
  getPriorityOrder,
  getStatusKey,
  getStatusLabel,
} from '../../src/utils/labels.js'

const githubLabels = [
  { name: '🔴 緊急', color: 'd73a4a', description: 'priority' },
  { name: '🏢 経理総務', color: '0e8a16', description: 'category' },
  { name: '未対応', color: 'aaaaaa', description: 'status' },
  { name: '任意ラベル', color: 'ededed', description: null },
  { name: '複合', color: '123456', description: 'priority category' },
]

const issue = {
  labels: [
    { name: '🔴 緊急' },
    { name: '🏢 経理総務' },
    { name: '未対応' },
  ],
}

describe('label utilities', () => {
  test('classifyLabels groups labels by description and normalizes colors', () => {
    const result = classifyLabels(githubLabels)

    expect(result.priorityLabels).toMatchObject([
      { name: '🔴 緊急', color: '#d73a4a', key: '🔴 緊急' },
      { name: '複合', color: '#123456', key: '複合' },
    ])
    expect(result.categoryLabels).toEqual([
      { name: '🏢 経理総務', color: '#0e8a16' },
    ])
    expect(result.statusLabels).toMatchObject([
      { name: '未対応', color: '#aaaaaa', key: '未対応' },
    ])
  })

  test('getPriorityKey returns the matched priority key', () => {
    const { priorityLabels } = classifyLabels(githubLabels)

    expect(getPriorityKey(issue, priorityLabels)).toBe('🔴 緊急')
  })

  test('getPriorityKey returns null when no priority label exists', () => {
    const { priorityLabels } = classifyLabels(githubLabels)

    expect(getPriorityKey({ labels: [] }, priorityLabels)).toBeNull()
  })

  test('getStatusKey returns the matched status key', () => {
    const { statusLabels } = classifyLabels(githubLabels)

    expect(getStatusKey(issue, statusLabels)).toBe('未対応')
  })

  test('getStatusKey returns null when no status label exists', () => {
    const { statusLabels } = classifyLabels(githubLabels)

    expect(getStatusKey({ labels: [] }, statusLabels)).toBeNull()
  })

  test('getPriorityLabel, getCategoryLabel, getStatusLabel return matched label objects', () => {
    const { priorityLabels, categoryLabels, statusLabels } = classifyLabels(githubLabels)

    expect(getPriorityLabel(issue, priorityLabels)).toMatchObject({
      name: '🔴 緊急',
      color: '#d73a4a',
      key: '🔴 緊急',
    })
    expect(getCategoryLabel(issue, categoryLabels)).toEqual({
      name: '🏢 経理総務',
      color: '#0e8a16',
    })
    expect(getStatusLabel(issue, statusLabels)).toMatchObject({
      name: '未対応',
      color: '#aaaaaa',
      key: '未対応',
    })
  })

  test('priority and category order place unmatched issues at the end', () => {
    const { priorityLabels, categoryLabels } = classifyLabels(githubLabels)

    expect(getPriorityOrder(issue, priorityLabels)).toBe(0)
    expect(getPriorityOrder({ labels: [] }, priorityLabels)).toBe(999)
    expect(getCategoryOrder(issue, categoryLabels)).toBe(0)
    expect(getCategoryOrder({ labels: [] }, categoryLabels)).toBe(999)
  })

  test('classifyLabels respects explicit priority/status order and keeps API order for ties', () => {
    const ordered = classifyLabels([
      { name: '処理中', color: '111111', description: 'status:2' },
      { name: '未対応', color: '222222', description: 'status:1' },
      { name: '処理済み', color: '333333', description: 'status' },
      { name: '👀 確認待ち', color: '444444', description: 'priority:4' },
      { name: '🟡 今週', color: '555555', description: 'priority:2' },
      { name: '🔴 緊急', color: '666666', description: 'priority:1' },
      { name: '🔵 次週以降', color: '777777', description: 'priority' },
    ])

    expect(ordered.statusLabels.map((label) => label.name)).toEqual([
      '未対応',
      '処理中',
      '処理済み',
    ])
    expect(ordered.priorityLabels.map((label) => label.name)).toEqual([
      '🔴 緊急',
      '🟡 今週',
      '👀 確認待ち',
      '🔵 次週以降',
    ])
  })
})
