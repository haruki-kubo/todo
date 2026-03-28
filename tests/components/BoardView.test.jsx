import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import BoardView from '../../src/components/BoardView.jsx'
import { setLabels } from '../../src/api/github.js'

vi.mock('../../src/api/github.js', () => ({
  setLabels: vi.fn(),
}))

const priorityLabels = [
  { name: '🔴 緊急', color: '#d73a4a', key: '🔴 緊急' },
  { name: '🟡 今週', color: '#fbca04', key: '🟡 今週' },
]

const statusLabels = [
  { name: '未対応', color: '#999999', key: '未対応' },
  { name: '処理中', color: '#6666ff', key: '処理中' },
]

function createStorageMock(initial = {}) {
  const store = new Map(Object.entries(initial))
  return {
    getItem: vi.fn((key) => (store.has(key) ? store.get(key) : null)),
    setItem: vi.fn((key, value) => {
      store.set(key, String(value))
    }),
    removeItem: vi.fn((key) => {
      store.delete(key)
    }),
    clear: vi.fn(() => {
      store.clear()
    }),
  }
}

function createIssue({ id, number, title, labels = [], assignee = null, body = '' }) {
  return {
    id,
    number,
    title,
    body,
    created_at: '2026-03-28T09:00:00Z',
    assignee,
    labels,
  }
}

function getColumnByTitle(title) {
  const header = screen.getAllByText(title).find((element) =>
    element.className.includes('font-medium text-sm')
  )
  return header.closest('div')?.parentElement
}

function getDraggableWrapperForTitle(title) {
  let current = screen.getByText(title).closest('div')
  while (current && !current.hasAttribute('draggable')) {
    current = current.parentElement
  }
  return current
}

afterEach(() => {
  vi.clearAllMocks()
  cleanup()
})

describe('BoardView', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createStorageMock())
  })

  test('shows an unset column for issues without the active group label', () => {
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '未設定課題',
        labels: [{ id: 10, name: '分類対象外', color: '00aa00' }],
      }),
    ]

    render(
      <BoardView
        issues={issues}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    expect(screen.getByTestId('board-column-__unset__')).toBeInTheDocument()
    expect(screen.getByText('未設定課題')).toBeInTheDocument()
  })

  test('renders only non-group labels as badges on cards', async () => {
    const user = userEvent.setup()
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: 'ラベル表示課題',
        labels: [
          { id: 1, name: '未対応', color: '999999' },
          { id: 2, name: '分類対象外', color: '00aa00' },
        ],
      }),
    ]

    render(
      <BoardView
        issues={issues}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    const card = screen.getByText('ラベル表示課題').closest('div')
    expect(within(card).getByText('分類対象外')).toBeInTheDocument()
    expect(within(card).queryByText('未対応')).not.toBeInTheDocument()

    await user.click(screen.getAllByRole('button', { name: '優先度別' })[0])

    const updatedCard = screen.getByTestId('board-card-101')
    expect(within(updatedCard).getByText('未対応')).toBeInTheDocument()
  })

  test('prevents dragging cards from the unset column', () => {
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '未設定ドラッグ不可',
        labels: [],
      }),
    ]

    render(
      <BoardView
        issues={issues}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    const draggableWrapper = getDraggableWrapperForTitle('未設定ドラッグ不可')
    expect(draggableWrapper).toHaveAttribute('draggable', 'false')
  })

  test('calls setLabels and onUpdate when a card is dropped into another column', async () => {
    setLabels.mockResolvedValue([])
    const onUpdate = vi.fn()
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '移動対象',
        labels: [
          { id: 1, name: '未対応', color: '999999' },
          { id: 2, name: '分類対象外', color: '00aa00' },
        ],
      }),
    ]

    render(
      <BoardView
        issues={issues}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={onUpdate}
      />
    )

    const dragSource = getDraggableWrapperForTitle('移動対象')
    const targetColumn = getColumnByTitle('処理中')
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    }

    fireEvent.dragStart(dragSource, { dataTransfer })
    fireEvent.dragEnter(targetColumn, { dataTransfer })
    fireEvent.dragOver(targetColumn, { dataTransfer })
    fireEvent.drop(targetColumn, { dataTransfer })

    await waitFor(() => {
      expect(setLabels).toHaveBeenCalledWith(101, ['分類対象外', '処理中'])
    })
    expect(onUpdate).toHaveBeenCalled()
  })

  test('renders the unset column before labeled columns', () => {
    const issues = [
      createIssue({
        id: 1,
        number: 101,
        title: '未設定課題',
        labels: [],
      }),
      createIssue({
        id: 2,
        number: 102,
        title: '処理中課題',
        labels: [{ id: 2, name: '処理中', color: '6666ff' }],
      }),
    ]

    render(
      <BoardView
        issues={issues}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    const columns = screen.getAllByTestId(/board-column-/)
    expect(columns[0]).toHaveAttribute('data-testid', 'board-column-__unset__')
    expect(columns[1]).toHaveAttribute('data-testid', 'board-column-未対応')
  })

  test('restores saved column order from localStorage', async () => {
    const user = userEvent.setup()
    localStorage.setItem('issueboard_status_order', JSON.stringify(['処理中', '未対応']))

    render(
      <BoardView
        issues={[]}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    let columns = screen.getAllByTestId(/board-column-/)
    expect(columns[0]).toHaveAttribute('data-testid', 'board-column-処理中')
    expect(columns[1]).toHaveAttribute('data-testid', 'board-column-未対応')

    await user.click(screen.getByRole('button', { name: '優先度別' }))
    columns = screen.getAllByTestId(/board-column-/)
    expect(columns[0]).toHaveAttribute('data-testid', 'board-column-🔴 緊急')
    expect(columns[1]).toHaveAttribute('data-testid', 'board-column-🟡 今週')
  })

  test('saves reordered status columns to localStorage when a header is dropped', async () => {
    render(
      <BoardView
        issues={[]}
        priorityLabels={priorityLabels}
        statusLabels={statusLabels}
        onUpdate={() => {}}
      />
    )

    const sourceHeader = getColumnByTitle('未対応').children[0]
    const targetColumn = getColumnByTitle('処理中')
    const dataTransfer = {
      effectAllowed: '',
      dropEffect: '',
      setData: vi.fn(),
    }

    fireEvent.dragStart(sourceHeader, { dataTransfer })
    fireEvent.dragEnter(targetColumn, { dataTransfer })
    fireEvent.dragOver(targetColumn, { dataTransfer })
    fireEvent.drop(targetColumn, { dataTransfer })
    fireEvent.dragEnd(sourceHeader, { dataTransfer })

    expect(JSON.parse(localStorage.getItem('issueboard_status_order'))).toEqual(['処理中', '未対応'])
  })
})
