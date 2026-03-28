import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'

import ProjectHeader from '../../src/components/ProjectHeader.jsx'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ProjectHeader', () => {
  test('renders active view title and issue count', () => {
    render(
      <ProjectHeader
        activeView="board"
        issueCount={3}
        onLogout={() => {}}
        onRefresh={() => {}}
        loading={false}
      />
    )

    expect(screen.getByText('ボード')).toBeInTheDocument()
    expect(screen.getByText('3件')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '↻ 更新' })).toBeInTheDocument()
  })

  test('disables refresh and changes label while loading', () => {
    render(
      <ProjectHeader
        activeView="issues"
        issueCount={0}
        onLogout={() => {}}
        onRefresh={() => {}}
        loading
      />
    )

    expect(screen.getByRole('button', { name: '読込中...' })).toBeDisabled()
  })

  test('calls refresh and logout handlers', async () => {
    const user = userEvent.setup()
    const onRefresh = vi.fn()
    const onLogout = vi.fn()

    render(
      <ProjectHeader
        activeView="issues"
        issueCount={1}
        onLogout={onLogout}
        onRefresh={onRefresh}
        loading={false}
      />
    )

    await user.click(screen.getByRole('button', { name: '↻ 更新' }))
    await user.click(screen.getByRole('button', { name: 'ログアウト' }))

    expect(onRefresh).toHaveBeenCalled()
    expect(onLogout).toHaveBeenCalled()
  })
})
