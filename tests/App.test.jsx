import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  fetchIssues: vi.fn(),
  fetchAllIssues: vi.fn(),
  fetchLabels: vi.fn(),
  fetchMilestones: vi.fn(),
  fetchCollaborators: vi.fn(),
}))

vi.mock('../src/api/github.js', () => ({
  fetchIssues: apiMocks.fetchIssues,
  fetchAllIssues: apiMocks.fetchAllIssues,
  fetchLabels: apiMocks.fetchLabels,
  fetchMilestones: apiMocks.fetchMilestones,
  fetchCollaborators: apiMocks.fetchCollaborators,
}))

vi.mock('../src/utils/labels.js', async () => {
  const actual = await vi.importActual('../src/utils/labels.js')
  return {
    ...actual,
    classifyLabels: vi.fn(() => ({
      priorityLabels: [{ name: '🔴 緊急', color: '#d73a4a', key: '🔴 緊急' }],
      categoryLabels: [{ name: '🏢 経理総務', color: '#0e8a16' }],
      statusLabels: [{ name: '未対応', color: '#999999', key: '未対応' }],
    })),
  }
})

vi.mock('../src/components/TokenInput.jsx', () => ({
  default: ({ onTokenSet }) => (
    <button onClick={() => onTokenSet('mock-token')}>Mock Token Input</button>
  ),
}))

vi.mock('../src/components/Sidebar.jsx', () => ({
  default: ({ onViewChange, onAdd }) => (
    <div>
      <button onClick={() => onViewChange('board')}>Go Board</button>
      <button onClick={onAdd}>Open Modal</button>
    </div>
  ),
}))

vi.mock('../src/components/ProjectHeader.jsx', () => ({
  default: ({ activeView, issueCount, onLogout, onRefresh }) => (
    <div>
      <span>{activeView}</span>
      <span>{issueCount} issues</span>
      <button onClick={onRefresh}>Refresh</button>
      <button onClick={onLogout}>Logout</button>
    </div>
  ),
}))

vi.mock('../src/components/IssueTable.jsx', () => ({
  default: ({ issues, onSelectIssue }) => (
    <div>
      <span>IssueTable:{issues.length}</span>
      <button onClick={() => onSelectIssue(issues[0])}>Select Issue</button>
    </div>
  ),
}))

vi.mock('../src/components/IssueDetailPanel.jsx', () => ({
  default: ({ issue, onClose }) => (
    <div>
      <span>IssueDetail:{issue.title}</span>
      <button onClick={onClose}>Close Detail</button>
    </div>
  ),
}))

vi.mock('../src/components/BoardView.jsx', () => ({
  default: () => <div>Board View</div>,
}))

vi.mock('../src/components/BurndownChart.jsx', () => ({
  default: () => <div>Burndown View</div>,
}))

vi.mock('../src/components/CalendarView.jsx', () => ({
  default: () => <div>Calendar View</div>,
}))

vi.mock('../src/components/ActivityFeed.jsx', () => ({
  default: () => <div>Activity View</div>,
}))

vi.mock('../src/components/Dashboard.jsx', () => ({
  default: ({ issues }) => <div>Dashboard:{issues.length}</div>,
}))

vi.mock('../src/components/SettingsView.jsx', () => ({
  default: () => <div>Settings View</div>,
}))

vi.mock('../src/components/GanttChart.jsx', () => ({
  default: () => <div>Gantt View</div>,
}))

vi.mock('../src/components/NewTaskModal.jsx', () => ({
  default: ({ onClose, onCreated }) => (
    <div>
      <span>NewTaskModal</span>
      <button onClick={onCreated}>Complete Create</button>
      <button onClick={onClose}>Close Modal</button>
    </div>
  ),
}))

import App from '../src/App.jsx'

function createStorageMock() {
  const store = new Map()
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

const issues = [
  {
    id: 1,
    number: 101,
    title: 'App Test Issue',
    body: '',
    created_at: '2026-03-28T09:00:00Z',
    assignee: null,
    labels: [],
  },
]

beforeEach(() => {
  const storageMock = createStorageMock()
  vi.stubGlobal('localStorage', storageMock)
  apiMocks.fetchIssues.mockResolvedValue(issues)
  apiMocks.fetchAllIssues.mockResolvedValue(issues)
  apiMocks.fetchLabels.mockResolvedValue([])
  apiMocks.fetchMilestones.mockResolvedValue([])
  apiMocks.fetchCollaborators.mockResolvedValue([])
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllGlobals()
})

describe('App', () => {
  test('renders token input when no token is stored', () => {
    render(<App />)

    expect(screen.getByRole('button', { name: 'Mock Token Input' })).toBeInTheDocument()
  })

  test('loads data when a token exists and switches views', async () => {
    localStorage.setItem('github_token', 'stored-token')

    render(<App />)

    await waitFor(() => {
      expect(apiMocks.fetchIssues).toHaveBeenCalled()
      expect(apiMocks.fetchLabels).toHaveBeenCalled()
      expect(apiMocks.fetchMilestones).toHaveBeenCalled()
      expect(apiMocks.fetchCollaborators).toHaveBeenCalled()
    })

    expect(screen.getByText('Dashboard:1')).toBeInTheDocument()
    expect(screen.getByText('1 issues')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Go Board' }))
    expect(screen.getByText('Board View')).toBeInTheDocument()
  })

  test('opens detail panel and modal through child callbacks', async () => {
    localStorage.setItem('github_token', 'stored-token')
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard:1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Open Modal' }))
    expect(screen.getByText('NewTaskModal')).toBeInTheDocument()
  })

  test('logs out and returns to token input', async () => {
    localStorage.setItem('github_token', 'stored-token')
    const user = userEvent.setup()

    render(<App />)

    await waitFor(() => {
      expect(screen.getByText('Dashboard:1')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: 'Logout' }))

    expect(localStorage.getItem('github_token')).toBeNull()
    expect(screen.getByRole('button', { name: 'Mock Token Input' })).toBeInTheDocument()
  })
})
