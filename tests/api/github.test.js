import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'

import {
  addComment,
  closeIssue,
  createIssue,
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
})

afterEach(() => {
  vi.clearAllMocks()
  vi.unstubAllGlobals()
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

  test('throws before making a request when token is missing', async () => {
    vi.stubGlobal('sessionStorage', createStorageMock())

    await expect(fetchIssues()).rejects.toThrow('トークンが設定されていません')
    expect(fetch).not.toHaveBeenCalled()
  })

  test('wraps GitHub API errors with status and body', async () => {
    fetch.mockResolvedValue(createErrorResponse(403, 'forbidden'))

    await expect(addComment(1, 'x')).rejects.toThrow('GitHub API エラー (403): forbidden')
  })

  test('verifyToken validates both /user and target repository access', async () => {
    fetch
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: true })
      .mockResolvedValueOnce({ ok: false })

    await expect(verifyToken('good-token')).resolves.toEqual({
      valid: true,
      error: null,
    })
    await expect(verifyToken('bad-token')).resolves.toEqual({
      valid: false,
      error: 'トークンが無効です。',
    })

    expect(fetch.mock.calls[0][0]).toBe('https://api.github.com/user')
    expect(fetch.mock.calls[0][1]).toEqual({
      headers: {
        Authorization: 'token good-token',
        Accept: 'application/vnd.github.v3+json',
      },
    })
    expect(fetch.mock.calls[1][0]).toBe('https://api.github.com/repos/haruki-kubo/todo')
  })
})
