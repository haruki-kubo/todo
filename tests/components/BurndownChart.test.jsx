import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const apiMocks = vi.hoisted(() => ({
  fetchMilestones: vi.fn(),
  fetchMilestoneIssues: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  fetchMilestones: apiMocks.fetchMilestones,
  fetchMilestoneIssues: apiMocks.fetchMilestoneIssues,
}))

import BurndownChart from '../../src/components/BurndownChart.jsx'

describe('BurndownChart', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-28T12:00:00+09:00'))
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  test('uses the milestone description start date when provided', async () => {
    apiMocks.fetchMilestones.mockResolvedValue([
      {
        number: 1,
        title: 'Sprint Burndown Sample',
        due_on: '2026-04-03T00:00:00Z',
        description: 'デモ用\n開始日: 2026-03-21',
        state: 'open',
      },
    ])
    apiMocks.fetchMilestoneIssues.mockResolvedValue([
      { id: 1, state: 'open', created_at: '2026-03-28T10:00:00Z', closed_at: null },
      { id: 2, state: 'open', created_at: '2026-03-28T11:00:00Z', closed_at: null },
      { id: 3, state: 'closed', created_at: '2026-03-28T12:00:00Z', closed_at: '2026-03-28T13:00:00Z' },
    ])

    await act(async () => {
      render(<BurndownChart />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('Sprint Burndown Sample - バーンダウンチャート')).toBeInTheDocument()
    expect(apiMocks.fetchMilestoneIssues).toHaveBeenCalledWith(1)
    expect(screen.getByText('3/21')).toBeInTheDocument()
    expect(screen.getByText('3/28')).toBeInTheDocument()
    expect(screen.getByText('総課題数:')).toBeInTheDocument()
  })

  test('falls back to the oldest issue created date when no start date is defined', async () => {
    apiMocks.fetchMilestones.mockResolvedValue([
      {
        number: 2,
        title: 'Fallback Milestone',
        due_on: '2026-04-03T00:00:00Z',
        description: '開始日の明示なし',
        state: 'open',
      },
    ])
    apiMocks.fetchMilestoneIssues.mockResolvedValue([
      { id: 10, state: 'open', created_at: '2026-03-24T10:00:00Z', closed_at: null },
      { id: 11, state: 'open', created_at: '2026-03-28T11:00:00Z', closed_at: null },
    ])

    await act(async () => {
      render(<BurndownChart />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('Fallback Milestone - バーンダウンチャート')).toBeInTheDocument()
    expect(screen.getByText('3/24')).toBeInTheDocument()
    expect(screen.queryByText('3/21')).not.toBeInTheDocument()
  })

  test('updates the due date display when milestone props are refreshed', async () => {
    apiMocks.fetchMilestones
      .mockResolvedValueOnce([
        {
          number: 3,
          title: 'Prop Milestone',
          due_on: '2026-04-03T00:00:00Z',
          description: '',
          state: 'open',
        },
      ])
      .mockResolvedValueOnce([
        {
          number: 3,
          title: 'Prop Milestone',
          due_on: '2026-04-10T00:00:00Z',
          description: '',
          state: 'open',
        },
      ])
    apiMocks.fetchMilestoneIssues.mockResolvedValue([
      { id: 20, state: 'open', created_at: '2026-03-24T10:00:00Z', closed_at: null },
    ])

    const initialMilestones = [
      {
        number: 3,
        title: 'Prop Milestone',
        due_on: '2026-04-03T00:00:00Z',
        description: '',
        state: 'open',
      },
    ]

    const { rerender } = render(<BurndownChart milestones={initialMilestones} />)

    await act(async () => {
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('期限: 2026/4/3')).toBeInTheDocument()

    const updatedMilestones = [
      {
        ...initialMilestones[0],
        due_on: '2026-04-10T00:00:00Z',
      },
    ]

    await act(async () => {
      rerender(<BurndownChart milestones={updatedMilestones} />)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(screen.getByText('期限: 2026/4/10')).toBeInTheDocument()
  })
})
