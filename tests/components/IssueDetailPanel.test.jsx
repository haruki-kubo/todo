import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import IssueDetailPanel from '../../src/components/IssueDetailPanel.jsx'

const githubApiMocks = vi.hoisted(() => ({
  fetchComments: vi.fn(),
  addComment: vi.fn(),
  closeIssue: vi.fn(),
  setLabels: vi.fn(),
  setMilestone: vi.fn(),
  setAssignees: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  fetchComments: githubApiMocks.fetchComments,
  addComment: githubApiMocks.addComment,
  closeIssue: githubApiMocks.closeIssue,
  setLabels: githubApiMocks.setLabels,
  setMilestone: githubApiMocks.setMilestone,
  setAssignees: githubApiMocks.setAssignees,
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

const collaborators = [
  { login: 'tester', avatar_url: 'https://example.com/avatar.png' },
]

const milestones = []

function createIssue(overrides = {}) {
  return {
    id: 1,
    number: 101,
    title: '詳細テスト課題',
    body: '📅 期限: 2026-04-05\n\n本文',
    created_at: '2026-03-28T09:00:00Z',
    assignee: {
      login: 'tester',
      avatar_url: 'https://example.com/avatar.png',
    },
    labels: [
      { id: 1, name: '🔴 緊急', color: 'd73a4a' },
      { id: 2, name: '未対応', color: '999999' },
      { id: 3, name: '🏢 経理総務', color: '0e8a16' },
      { id: 4, name: '分類対象外', color: '00aa00' },
    ],
    ...overrides,
  }
}

function renderPanel(props = {}) {
  return render(
    <IssueDetailPanel
      issue={createIssue()}
      allIssues={[createIssue()]}
      hierarchy={emptyHierarchy}
      milestones={milestones}
      collaborators={collaborators}
      priorityLabels={priorityLabels}
      categoryLabels={categoryLabels}
      statusLabels={statusLabels}
      onClose={() => {}}
      onUpdate={() => {}}
      onSelectIssue={() => {}}
      {...props}
    />
  )
}

beforeEach(() => {
  githubApiMocks.fetchComments.mockResolvedValue([])
  githubApiMocks.addComment.mockResolvedValue({
    id: 900,
    body: '追加コメント',
    created_at: '2026-03-28T10:00:00Z',
    user: { login: 'tester', avatar_url: 'https://example.com/avatar.png' },
  })
  githubApiMocks.closeIssue.mockResolvedValue({})
  githubApiMocks.setLabels.mockResolvedValue([])
  githubApiMocks.setMilestone.mockResolvedValue({})
  githubApiMocks.setAssignees.mockResolvedValue({})
  vi.stubGlobal('alert', vi.fn())
  vi.stubGlobal('confirm', vi.fn(() => true))
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('IssueDetailPanel', () => {
  test('fetches and renders comments on mount', async () => {
    githubApiMocks.fetchComments.mockResolvedValue([
      {
        id: 1,
        body: '既存コメント',
        created_at: '2026-03-28T10:00:00Z',
        user: { login: 'reviewer', avatar_url: 'https://example.com/reviewer.png' },
      },
    ])

    renderPanel()

    await waitFor(() => {
      expect(githubApiMocks.fetchComments).toHaveBeenCalledWith(101)
    })
    expect(await screen.findByText('既存コメント')).toBeInTheDocument()
  })

  test('submits a new comment and appends it to the list', async () => {
    const user = userEvent.setup()

    renderPanel()

    await user.type(screen.getByPlaceholderText('メモを追加...'), '追加コメント')
    await user.click(screen.getByRole('button', { name: '送信' }))

    await waitFor(() => {
      expect(githubApiMocks.addComment).toHaveBeenCalledWith(101, '追加コメント')
    })
    expect(await screen.findByText('追加コメント')).toBeInTheDocument()
  })

  test('updates labels and calls onUpdate when status is changed', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()

    renderPanel({ onUpdate })

    await user.click(screen.getByRole('button', { name: '処理中' }))

    await waitFor(() => {
      expect(githubApiMocks.setLabels).toHaveBeenCalledWith(101, ['🔴 緊急', '🏢 経理総務', '分類対象外', '処理中'])
    })
    expect(onUpdate).toHaveBeenCalled()
  })

  test('closes an issue after confirmation and calls onUpdate/onClose', async () => {
    const user = userEvent.setup()
    const onUpdate = vi.fn()
    const onClose = vi.fn()

    renderPanel({ onClose, onUpdate })

    await user.click(screen.getByRole('button', { name: '完了にする' }))

    await waitFor(() => {
      expect(githubApiMocks.closeIssue).toHaveBeenCalledWith(101)
    })
    expect(onUpdate).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
