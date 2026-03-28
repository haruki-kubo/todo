import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import NewTaskModal from '../../src/components/NewTaskModal.jsx'

const githubApiMocks = vi.hoisted(() => ({
  createIssue: vi.fn(),
  updateIssueBody: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  createIssue: githubApiMocks.createIssue,
  updateIssueBody: githubApiMocks.updateIssueBody,
}))

const priorityLabels = [
  { name: '🔴 緊急', color: '#d73a4a', key: '🔴 緊急' },
  { name: '🟡 今週', color: '#fbca04', key: '🟡 今週' },
]

const categoryLabels = [
  { name: '🏢 経理総務', color: '#0e8a16' },
]

const statusLabels = [
  { name: '未対応', color: '#999999', key: '未対応' },
  { name: '処理中', color: '#6666ff', key: '処理中' },
]

const emptyHierarchy = {
  parentMap: new Map(),
  childrenMap: new Map(),
}

beforeEach(() => {
  githubApiMocks.createIssue.mockResolvedValue({})
  githubApiMocks.updateIssueBody.mockResolvedValue({})
  vi.stubGlobal('alert', vi.fn())
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('NewTaskModal', () => {
  test('keeps submit disabled until title is entered', () => {
    render(
      <NewTaskModal
        allIssues={[]}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    expect(screen.getByRole('button', { name: '追加する' })).toBeDisabled()
  })

  test('creates an issue with deadline inserted into the body and selected labels', async () => {
    const user = userEvent.setup()
    const onCreated = vi.fn()

    render(
      <NewTaskModal
        allIssues={[]}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onClose={() => {}}
        onCreated={onCreated}
      />
    )

    await user.type(screen.getByPlaceholderText('課題の件名'), '新規課題')
    await user.type(screen.getByPlaceholderText('詳細やメモ'), '本文メモ')
    await user.click(screen.getByRole('button', { name: '処理中' }))
    await user.click(screen.getByRole('button', { name: '🔴 緊急' }))
    await user.selectOptions(screen.getByLabelText('カテゴリ'), '🏢 経理総務')
    const deadlineInput = document.querySelector('input[type="date"]')
    await user.type(deadlineInput, '2026-04-05')
    await user.click(screen.getByRole('button', { name: '追加する' }))

    await waitFor(() => {
      expect(githubApiMocks.createIssue).toHaveBeenCalledWith(
        '新規課題',
        '📅 期限: 2026-04-05\n\n本文メモ',
        ['🔴 緊急', '🏢 経理総務', '処理中']
      )
    })
    expect(onCreated).toHaveBeenCalled()
  })

  test('hides optional selectors when no labels are provided', () => {
    render(
      <NewTaskModal
        allIssues={[]}
        hierarchy={emptyHierarchy}
        priorityLabels={[]}
        categoryLabels={[]}
        statusLabels={[]}
        onClose={() => {}}
        onCreated={() => {}}
      />
    )

    expect(screen.queryByText('状態')).not.toBeInTheDocument()
    expect(screen.queryByText('優先度')).not.toBeInTheDocument()
    expect(screen.queryByText('カテゴリ')).not.toBeInTheDocument()
  })
})
