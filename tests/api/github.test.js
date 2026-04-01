import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  addComment,
  closeIssue,
  createIssue,
  exchangeOAuthCode,
  fetchComments,
  fetchIssues,
  fetchLabels,
  setLabels,
  verifyToken,
} from '../../src/api/github.js'

function createStorageMock(initialValues = {}) {
  const store = new Map(Object.entries(initialValues))
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

function createJsonResponse(data, overrides = {}) {
  return {
    ok: true,
    status: 200,
    json: vi.fn().mockResolvedValue(data),
    text: vi.fn().mockResolvedValue(''),
    ...overrides,
  }
}

function createErrorResponse(status, body) {
  return {
    ok: false,
    status,
    json: vi.fn(),
    text: vi.fn().mockResolvedValue(body),
  }
}

beforeEach(() => {
  vi.stubGlobal('sessionStorage', createStorageMock({ github_token: 'test-token' }))
  vi.stubGlobal('fetch', vi.fn())
  vi.stubEnv('VITE_OAUTH_PROXY_URL', 'https://oauth-proxy.example.com')
  vi.stubEnv('VITE_GITHUB_CLIENT_ID', 'test-client-id')
  vi.stubEnv('VITE_REPO_OWNER', 'haruki-kubo')
  vi.stubEnv('VITE_REPO_NAME', 'todo')
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('github api wrapper', () => {
  test('fetchIssues paginates and filters out pull requests', async () => {
    fetch
      .mockResolvedValueOnce(
        createJsonResponse(
          Array.from({ length: 100 }, (_, index) => ({
            id: index + 1,
            number: index + 1,
            title: `issue-${index + 1}`,
          }))
        )
      )
      .mockResolvedValueOnce(
        createJsonResponse([
          { id: 101, number: 101, title: 'issue-101', pull_request: {} },
          { id: 102, number: 102, title: 'issue-102' },
        ])
      )

    const issues = await fetchIssues()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][0]).toContain('/issues?state=open&per_page=100&page=1')
    expect(fetch.mock.calls[1][0]).toContain('/issues?state=open&per_page=100&page=2')
    expect(fetch.mock.calls[0][1].headers.Authorization).toBe('token test-token')
    expect(issues).toHaveLength(101)
    expect(issues.some((issue) => issue.pull_request)).toBe(false)
  })

  test('fetchLabels paginates until a page smaller than 100 is returned', async () => {
    fetch
      .mockResolvedValueOnce(createJsonResponse(new Array(100).fill({ name: 'page1' })))
      .mockResolvedValueOnce(createJsonResponse([{ name: 'page2' }]))

    const labels = await fetchLabels()

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0][0]).toContain('/labels?per_page=100&page=1')
    expect(fetch.mock.calls[1][0]).toContain('/labels?per_page=100&page=2')
    expect(labels).toHaveLength(101)
  })

  test('fetchComments requests the issue comments endpoint', async () => {
    fetch.mockResolvedValue(createJsonResponse([{ id: 1, body: 'comment' }]))

    const comments = await fetchComments(123)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/123/comments?per_page=100'),
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'token test-token',
        }),
      })
    )
    expect(comments).toEqual([{ id: 1, body: 'comment' }])
  })

  test('addComment sends POST with body payload', async () => {
    fetch.mockResolvedValue(createJsonResponse({ id: 1, body: 'new comment' }))

    await addComment(123, 'new comment')

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/123/comments'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ body: 'new comment' }),
        headers: expect.objectContaining({
          Authorization: 'token test-token',
          Accept: 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        }),
      })
    )
  })

  test('closeIssue sends PATCH with closed state', async () => {
    fetch.mockResolvedValue(createJsonResponse({ state: 'closed' }))

    await closeIssue(55)

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/55'),
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed' }),
      })
    )
  })

  test('setLabels sends PUT and returns null on 204', async () => {
    fetch.mockResolvedValue({
      ok: true,
      status: 204,
      json: vi.fn(),
      text: vi.fn(),
    })

    const result = await setLabels(77, ['A', 'B'])

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues/77/labels'),
      expect.objectContaining({
        method: 'PUT',
        body: JSON.stringify({ labels: ['A', 'B'] }),
      })
    )
    expect(result).toBeNull()
  })

  test('createIssue sends POST with title, body, and labels', async () => {
    fetch.mockResolvedValue(createJsonResponse({ id: 1 }))

    await createIssue('title', 'body', ['L1', 'L2'])

    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/issues'),
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          title: 'title',
          body: 'body',
          labels: ['L1', 'L2'],
        }),
      })
    )
  })

  test('exchangeOAuthCode posts code to the configured proxy', async () => {
    fetch.mockResolvedValue(
      createJsonResponse({
        access_token: 'oauth-token',
        token_type: 'bearer',
      })
    )

    const token = await exchangeOAuthCode('oauth-code')

    expect(token).toBe('oauth-token')
    expect(fetch).toHaveBeenCalledWith('https://oauth-proxy.example.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'oauth-code', client_id: 'test-client-id' }),
    })
  })

  test('throws before making a request when token is missing', async () => {
    vi.stubGlobal('sessionStorage', createStorageMock())

    await expect(fetchIssues()).rejects.toThrow('トークンが設定されていません')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('wraps GitHub API errors with status and body', async () => {
    fetch.mockResolvedValue(createErrorResponse(403, 'forbidden'))

    await expect(addComment(1, 'x')).rejects.toThrow('GitHub API エラー (403): forbidden')
  })

  test('verifyToken: valid token with write permission', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, status: 200 }) // GET /user
      .mockResolvedValueOnce({ ok: true, status: 200 }) // GET /repos/{owner}/{repo}
      .mockResolvedValueOnce({ status: 422 }) // POST /labels (already exists = write OK)

    await expect(verifyToken('good-token')).resolves.toEqual({
      valid: true,
      error: null,
    })
    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/user')
    expect(fetch.mock.calls[1][0]).toBe('https://api.github.com/repos/haruki-kubo/todo')
    expect(fetch.mock.calls[2][0]).toBe('https://api.github.com/repos/haruki-kubo/todo/labels')
    expect(fetch.mock.calls[2][1].method).toBe('POST')
    expect(fetch.mock.calls[2][1].body).toBe(
      JSON.stringify({
        name: '__write_check__',
        color: '9ca3af',
        description: 'IssueBoard write check',
      })
    )
  })

  test('verifyToken: invalid token (401)', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 401 })

    await expect(verifyToken('bad-token')).resolves.toEqual({
      valid: false,
      error: 'トークンが正しくありません。コピーし直してお試しください。',
    })
  })

  test('verifyToken: no repo access (404)', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: false, status: 404 })

    await expect(verifyToken('no-access')).resolves.toEqual({
      valid: false,
      error: expect.stringContaining('アクセスできません'),
    })
  })

  test('verifyToken: read-only token (403 on label POST)', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ status: 403 })

    await expect(verifyToken('readonly-token')).resolves.toEqual({
      valid: false,
      error: '読み取り専用のトークンです。トークンの権限を「Issues: Read and write」に変更してください。',
    })
  })

  test('verifyToken: write check creates and deletes test label', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ ok: true, status: 200 })
      .mockResolvedValueOnce({ status: 201 }) // label created
      .mockResolvedValueOnce({ ok: true }) // DELETE cleanup

    await expect(verifyToken('good-token')).resolves.toEqual({
      valid: true,
      error: null,
    })
    // 4th call should be DELETE to clean up
    expect(fetch.mock.calls[3][1].method).toBe('DELETE')
  })
})
