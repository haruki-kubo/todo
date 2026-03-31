import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  fetchLabels: vi.fn(),
  createLabel: vi.fn(),
  updateLabel: vi.fn(),
  deleteLabel: vi.fn(),
  fetchMilestones: vi.fn(),
  createMilestone: vi.fn(),
  updateMilestone: vi.fn(),
  deleteMilestone: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  fetchLabels: apiMocks.fetchLabels,
  createLabel: apiMocks.createLabel,
  updateLabel: apiMocks.updateLabel,
  deleteLabel: apiMocks.deleteLabel,
  fetchMilestones: apiMocks.fetchMilestones,
  createMilestone: apiMocks.createMilestone,
  updateMilestone: apiMocks.updateMilestone,
  deleteMilestone: apiMocks.deleteMilestone,
}))

import SettingsView from '../../src/components/SettingsView.jsx'

const labels = [
  { name: '未対応', color: '999999', description: 'status:1' },
  { name: '🔴 緊急', color: 'd73a4a', description: 'priority:1' },
  { name: '🏢 経理総務', color: '0e8a16', description: 'category' },
]

const milestones = [
  {
    number: 1,
    title: 'Sprint A',
    description: '開始日: 2026-03-21',
    due_on: '2026-04-03T00:00:00Z',
    state: 'open',
  },
]

beforeEach(() => {
  apiMocks.fetchLabels.mockResolvedValue(labels)
  apiMocks.fetchMilestones.mockResolvedValue(milestones)
  apiMocks.createLabel.mockResolvedValue({})
  apiMocks.updateLabel.mockResolvedValue({})
  apiMocks.deleteLabel.mockResolvedValue({})
  apiMocks.createMilestone.mockResolvedValue({})
  apiMocks.updateMilestone.mockResolvedValue({})
  apiMocks.deleteMilestone.mockResolvedValue({})
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('SettingsView', () => {
  test('creates a status label with order and notifies parent refresh', async () => {
    const user = userEvent.setup()
    const onDataChanged = vi.fn()

    render(<SettingsView onDataChanged={onDataChanged} />)

    await screen.findByText('ステータスラベル')
    await user.click(screen.getByRole('button', { name: '+ 新規作成' }))
    await user.type(screen.getByPlaceholderText('ラベル名'), '処理中')
    await user.type(screen.getByPlaceholderText('順序'), '2')
    await user.click(screen.getByRole('button', { name: '作成' }))

    await waitFor(() => {
      expect(apiMocks.createLabel).toHaveBeenCalledWith('処理中', '#9ca3af', 'status:2')
    })
    expect(onDataChanged).toHaveBeenCalled()
  })

  test('category tab hides order input and creates a category label', async () => {
    const user = userEvent.setup()

    render(<SettingsView onDataChanged={() => {}} />)

    await screen.findByText('ステータスラベル')
    await user.click(screen.getByRole('button', { name: 'カテゴリ' }))
    await screen.findByText('カテゴリラベル')

    expect(screen.queryByPlaceholderText('順序')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '+ 新規作成' }))
    await user.type(screen.getByPlaceholderText('ラベル名'), '👥 採用労務')
    expect(screen.queryByPlaceholderText('順序')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '作成' }))

    await waitFor(() => {
      expect(apiMocks.createLabel).toHaveBeenCalledWith('👥 採用労務', '#9ca3af', 'category')
    })
  })

  test('edits a milestone due date and triggers parent refresh', async () => {
    const user = userEvent.setup()
    const onDataChanged = vi.fn()

    render(<SettingsView onDataChanged={onDataChanged} />)

    await screen.findByText('ステータスラベル')
    await user.click(screen.getByRole('button', { name: 'マイルストーン' }))
    await screen.findByText('Sprint A')
    await user.click(screen.getByRole('button', { name: '編集' }))

    const dueInput = screen.getByDisplayValue('2026-04-03')
    await user.clear(dueInput)
    await user.type(dueInput, '2026-04-10')
    await user.click(screen.getByRole('button', { name: '更新' }))

    await waitFor(() => {
      expect(apiMocks.updateMilestone).toHaveBeenCalledWith(1, 'Sprint A', '開始日: 2026-03-21', '2026-04-10', 'open')
    })
    expect(onDataChanged).toHaveBeenCalled()
  })

  test('closes an open milestone', async () => {
    const user = userEvent.setup()

    render(<SettingsView onDataChanged={() => {}} />)

    await screen.findByText('ステータスラベル')
    await user.click(screen.getByRole('button', { name: 'マイルストーン' }))
    await screen.findByText('Sprint A')
    await user.click(screen.getByRole('button', { name: 'Close' }))

    await waitFor(() => {
      expect(apiMocks.updateMilestone).toHaveBeenCalledWith(1, 'Sprint A', '開始日: 2026-03-21', '2026-04-03', 'closed')
    })
  })
})
