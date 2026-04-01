import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

const githubApiMocks = vi.hoisted(() => ({
  verifyToken: vi.fn(),
}))

vi.mock('../../src/api/github.js', () => ({
  verifyToken: githubApiMocks.verifyToken,
}))

beforeEach(() => {
  githubApiMocks.verifyToken.mockReset()
  vi.resetModules()
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.unstubAllEnvs()
})

describe('TokenInput', () => {
  async function renderPatTokenInput(props = {}) {
    vi.stubEnv('VITE_AUTH_MODE', 'pat')
    vi.stubEnv('VITE_GITHUB_CLIENT_ID', '')
    const { I18nProvider } = await import('../../src/i18n')
    const { default: TokenInput } = await import('../../src/components/TokenInput.jsx')
    render(
      <I18nProvider>
        <TokenInput onTokenSet={() => {}} {...props} />
      </I18nProvider>
    )
  }

  test('enables submit only after token is entered', async () => {
    const user = userEvent.setup()

    await renderPatTokenInput()

    const tokenInput = screen.getByLabelText('GitHub Personal Access Token')
    const submit = screen.getByRole('button', { name: '接続する' })
    expect(submit).toBeDisabled()

    await user.type(tokenInput, 'ghp_test')

    expect(submit).toBeEnabled()
  })

  test('calls onTokenSet when token is valid', async () => {
    const user = userEvent.setup()
    const onTokenSet = vi.fn()
    githubApiMocks.verifyToken.mockResolvedValue({ valid: true, error: null })

    await renderPatTokenInput({ onTokenSet })

    await user.type(screen.getByLabelText('GitHub Personal Access Token'), ' ghp_valid ')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    await waitFor(() => {
      expect(githubApiMocks.verifyToken).toHaveBeenCalledWith('ghp_valid')
    })
    expect(onTokenSet).toHaveBeenCalledWith('ghp_valid')
  })

  test('shows an error when token is invalid', async () => {
    const user = userEvent.setup()
    githubApiMocks.verifyToken.mockResolvedValue({
      valid: false,
      error: 'トークンが無効です。権限を確認してください。',
    })

    await renderPatTokenInput()

    await user.type(screen.getByLabelText('GitHub Personal Access Token'), 'ghp_invalid')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    expect(await screen.findByText('トークンが無効です。権限を確認してください。')).toBeInTheDocument()
  })

  test('shows a connection error when verification throws', async () => {
    const user = userEvent.setup()
    githubApiMocks.verifyToken.mockRejectedValue(new Error('network'))

    await renderPatTokenInput()

    await user.type(screen.getByLabelText('GitHub Personal Access Token'), 'ghp_error')
    await user.click(screen.getByRole('button', { name: '接続する' }))

    expect(await screen.findByText('接続エラーが発生しました。')).toBeInTheDocument()
  })
})
