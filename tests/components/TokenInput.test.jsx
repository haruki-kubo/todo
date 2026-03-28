import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import TokenInput from '../../src/components/TokenInput.jsx'

const githubApiMocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  verifyToken: githubApiMocks.verifyToken,
}))

beforeEach(() => {
  githubApiMocks.verifyToken.mockReset()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('TokenInput', () => {
  test('enables submit only after token is entered', async () => {
    const user = userEvent.setup()

    render(<TokenInput onTokenSet={() => {}} />)

    const submit = screen.getByRole('button', { name: '接続する' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxx'), 'ghp_test')

    expect(submit).toBeEnabled()
  })

  test('calls onTokenSet when token is valid', async () => {
    const user = userEvent.setup()
    const onTokenSet = vi.fn()
    githubApiMocks.verifyToken.mockResolvedValue(true)

    render(<TokenInput onTokenSet={onTokenSet} />)

    await user.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxx'), ' ghp_valid ')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    await waitFor(() => {
      expect(githubApiMocks.verifyToken).toHaveBeenCalledWith('ghp_valid')
    })
    expect(onTokenSet).toHaveBeenCalledWith('ghp_valid')
  })

  test('shows an error when token is invalid', async () => {
    const user = userEvent.setup()
    githubApiMocks.verifyToken.mockResolvedValue(false)

    render(<TokenInput onTokenSet={() => {}} />)

    await user.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxx'), 'ghp_invalid')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    expect(await screen.findByText('トークンが無効です。権限を確認してください。')).toBeInTheDocument()
  })

  test('shows a connection error when verification throws', async () => {
    const user = userEvent.setup()
    githubApiMocks.verifyToken.mockRejectedValue(new Error('network'))

    render(<TokenInput onTokenSet={() => {}} />)

    await user.type(screen.getByPlaceholderText('ghp_xxxxxxxxxxxx'), 'ghp_error')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    expect(await screen.findByText('接続エラーが発生しました。')).toBeInTheDocument()
  })
})
