import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import IssueTable from '../../src/components/IssueTable.jsx'

const emptyHierarchy = {
  parentMap: new Map(),
  childrenMap: new Map(),
}

const priorityLabels = [
  { name: '🔴 緊急', color: '#d73a4a', key: '🔴 緊急' },
  { name: '🟡 今週', color: '#fbca04', key: '🟡 今週' },
]

const categoryLabels = [
  { name: '🏢 経理総務', color: '#0e8a16' },
  { name: '👥 採用労務', color: '#d876e3' },
]

const statusLabels = [
  { name: '未対応', color: '#999999', key: '未対応' },
  { name: '処理中', color: '#6666ff', key: '処理中' },
]

function createIssue({
  id,
  number,
  title,
  createdAt,
  labels = [],
  assignee = null,
  body = '',
}) {
  return {
    id,
    number,
    title,
    body,
    created_at: createdAt,
    assignee,
    labels,
  }
}

afterEach(() => {
  cleanup()
})

describe('IssueTable', () => {
  test('renders issues in created_at descending order by default', () => {
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '古い課題',
        createdAt: '2026-03-20T09:00:00Z',
      }),
      createIssue({
        id: 2,
        number: 102,
        title: '新しい課題',
        createdAt: '2026-03-28T09:00:00Z',
      }),
    ]

    render(
      <IssueTable
        issues={issues}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onSelectIssue={() => {}}
        selectedIssueId={undefined}
      />
    )

    const rows = screen.getAllByRole('row')
    expect(within(rows[1]).getByText('新しい課題')).toBeInTheDocument()
    expect(within(rows[2]).getByText('古い課題')).toBeInTheDocument()
  })

  test('filters issues by search query and status', async () => {
    const user = userEvent.setup()
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '採用ページ確認',
        createdAt: '2026-03-28T09:00:00Z',
        labels: [{ name: '処理中', color: '6666ff' }],
      }),
      createIssue({
        id: 2,
        number: 102,
        title: '経理対応',
        createdAt: '2026-03-27T09:00:00Z',
        labels: [{ name: '未対応', color: '999999' }],
      }),
    ]

    render(
      <IssueTable
        issues={issues}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onSelectIssue={() => {}}
        selectedIssueId={undefined}
      />
    )

    await user.type(screen.getByPlaceholderText('キーワードで検索...'), '採用')
    await user.selectOptions(screen.getAllByRole('combobox')[1], '処理中')

    expect(screen.getByText('採用ページ確認')).toBeInTheDocument()
    expect(screen.queryByText('経理対応')).not.toBeInTheDocument()
    expect(screen.getByText('1件')).toBeInTheDocument()
  })

  test('hides status column and filter when no status labels exist', () => {
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: 'ステータスなし課題',
        createdAt: '2026-03-28T09:00:00Z',
      }),
    ]

    render(
      <IssueTable
        issues={issues}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={[]}
        onSelectIssue={() => {}}
        selectedIssueId={undefined}
      />
    )

    expect(screen.queryByRole('columnheader', { name: /状態/ })).not.toBeInTheDocument()
    expect(screen.queryByText('全てのステータス')).not.toBeInTheDocument()
  })

  test('calls onSelectIssue when a row is clicked', async () => {
    const user = userEvent.setup()
    const onSelectIssue = vi.fn()
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: 'クリック対象',
        createdAt: '2026-03-28T09:00:00Z',
      }),
    ]

    render(
      <IssueTable
        issues={issues}
        hierarchy={emptyHierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onSelectIssue={onSelectIssue}
        selectedIssueId={undefined}
      />
    )

    await user.click(screen.getByText('クリック対象'))

    expect(onSelectIssue).toHaveBeenCalledWith(issues[0])
  })
})
