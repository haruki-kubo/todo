import { test, expect } from '@playwright/test'

const tokenCandidates = (process.env.E2E_GITHUB_TOKEN || '')
  .split(/\s+/)
  .filter((value) => value.startsWith('github_pat_') || value.startsWith('ghp_'))
const repoOwner = process.env.E2E_REPO_OWNER || 'haruki-kubo'
const repoName = process.env.E2E_REPO_NAME || 'todo'
let token = null

const seededIssues = {
  overdue: '[E2E] TC-DATA-01 緊急の期限超過課題',
  soon: '[E2E] TC-DATA-02 3日以内の課題',
  normal: '[E2E] TC-DATA-03 通常期限の課題',
  noDeadline: '[E2E] TC-DATA-04 期限なし課題',
  extraLabel: '[E2E] TC-DATA-05 分類対象外ラベル付き課題',
}

const seededIssueEntries = Object.entries(seededIssues)
const seededIssueMap = new Map()

async function loginToApp(page) {
  await page.addInitScript((storedToken) => {
    window.sessionStorage.setItem('github_token', storedToken)
  }, token)

  await page.goto('/')
  await expect(page.getByText(`${repoOwner}/${repoName}`)).toBeVisible()
  await expect(page.getByRole('button', { name: '📋 課題' })).toBeVisible()
}

async function openIssuesView(page) {
  await page.getByRole('button', { name: '📋 課題' }).click()
  await expect(page.locator('[data-testid^="issue-row-"]').first()).toBeVisible()
}

async function githubRequest(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    method: options.method || 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'Content-Type': 'application/json',
      'User-Agent': 'codex-playwright-e2e',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${options.method || 'GET'} ${path} failed: ${response.status} ${text}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function resolveWritableToken() {
  for (const candidate of tokenCandidates) {
    const userRes = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${candidate}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'codex-playwright-e2e',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!userRes.ok) continue

    const repoRes = await fetch(`https://api.github.com/repos/${repoOwner}/${repoName}`, {
      headers: {
        Authorization: `Bearer ${candidate}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'codex-playwright-e2e',
        'X-GitHub-Api-Version': '2022-11-28',
      },
    })
    if (!repoRes.ok) continue

    const repoData = await repoRes.json()
    const permissions = repoData.permissions
    if (permissions?.push || permissions?.admin) {
      return candidate
    }
  }

  return null
}

async function findIssueByTitle(title) {
  const issues = await githubRequest(`/repos/${repoOwner}/${repoName}/issues?state=all&per_page=100`)
  return issues.find((issue) => !issue.pull_request && issue.title === title) || null
}

async function getIssue(issueNumber) {
  return githubRequest(`/repos/${repoOwner}/${repoName}/issues/${issueNumber}`)
}

async function setIssueLabels(issueNumber, labels) {
  return githubRequest(`/repos/${repoOwner}/${repoName}/issues/${issueNumber}/labels`, {
    method: 'PUT',
    body: { labels },
  })
}

async function listComments(issueNumber) {
  return githubRequest(`/repos/${repoOwner}/${repoName}/issues/${issueNumber}/comments?per_page=100`)
}

test.describe('Tasgy E2E', () => {
  test.skip(tokenCandidates.length === 0, 'E2E_GITHUB_TOKEN is required')

  test.beforeAll(async () => {
    token = await resolveWritableToken()
    if (!token) {
      throw new Error('書き込み可能な E2E_GITHUB_TOKEN が見つかりません')
    }

    for (const [key, title] of seededIssueEntries) {
      const issue = await findIssueByTitle(title)
      if (!issue) {
        throw new Error(`Seed issue not found: ${title}`)
      }
      seededIssueMap.set(key, issue)
    }
  })

  test.beforeEach(async ({ page }) => {
    await loginToApp(page)
  })

  test('loads seeded issues and opens the detail panel', async ({ page }) => {
    const overdueIssue = seededIssueMap.get('overdue')
    const soonIssue = seededIssueMap.get('soon')

    await openIssuesView(page)

    await expect(page.getByTestId(`issue-row-${overdueIssue.number}`)).toContainText(seededIssues.overdue)
    await expect(page.getByTestId(`issue-row-${soonIssue.number}`)).toContainText(seededIssues.soon)

    await page.getByTestId(`issue-row-${soonIssue.number}`).click()

    const detail = page.getByTestId('issue-detail-panel')
    await expect(detail).toBeVisible()
    await expect(detail).toContainText(seededIssues.soon)
    await expect(detail).toContainText('E2E seed comment: コメント表示確認用')
    await expect(detail).toContainText('⚠️ 3/30')
    await expect(detail.getByRole('link', { name: 'GitHubで開く' })).toHaveAttribute(
      'href',
      `https://github.com/${repoOwner}/${repoName}/issues/${soonIssue.number}`
    )
  })

  test('shows seeded issues in board and gantt views', async ({ page }) => {
    await page.getByRole('button', { name: '📊 ボード' }).click()
    await expect(page.getByTestId('board-column-未対応')).toContainText(seededIssues.overdue)
    await expect(page.getByTestId('board-column-処理中')).toContainText(seededIssues.soon)

    await page.getByRole('button', { name: '優先度別' }).click()
    await expect(page.getByTestId('board-column-🔴 緊急')).toContainText(seededIssues.overdue)
    await expect(page.getByTestId('board-column-🟡 今週')).toContainText(seededIssues.soon)
    await expect(page.getByTestId('board-column-__unset__')).toContainText(seededIssues.extraLabel)

    await page.getByRole('button', { name: '📅 ガントチャート' }).click()
    const gantt = page.getByTestId('gantt-chart')
    await expect(gantt).toBeVisible()
    await expect(gantt).toContainText(seededIssues.overdue)
    await expect(gantt).toContainText(seededIssues.normal)
    await expect(gantt).toContainText(seededIssues.noDeadline)
  })

  test('creates a new issue from the modal and cleans it up', async ({ page }) => {
    const title = `[E2E] TC-RUN-${Date.now()} 新規作成フロー`
    let createdIssueNumber = null

    try {
      await page.getByRole('button', { name: '課題を追加' }).click()

      await page.getByLabel('件名').fill(title)
      await page.getByLabel('詳細').fill('Playwright から作成した課題です。')
      await page.getByRole('button', { name: '未対応' }).click()
      await page.getByRole('button', { name: '🟡 今週' }).click()
      await page.getByLabel('カテゴリ', { exact: true }).selectOption('👥 採用労務')
      await page.getByLabel('期限').fill('2026-03-31')
      await page.getByRole('button', { name: '追加する' }).click()

      await expect
        .poll(async () => {
          const issue = await findIssueByTitle(title)
          return issue?.number ?? null
        })
        .not.toBeNull()

      createdIssueNumber = (await findIssueByTitle(title))?.number ?? null
      await openIssuesView(page)
      await page.getByRole('button', { name: '↻ 更新' }).click()

      const searchInput = page.getByLabel('課題検索')
      await expect(searchInput).toBeVisible()
      await searchInput.fill(title)
      await expect(page.getByRole('button', { name: '+ 課題を追加' })).toBeVisible()
    } finally {
      if (createdIssueNumber) {
        await githubRequest(`/repos/${repoOwner}/${repoName}/issues/${createdIssueNumber}`, {
          method: 'PATCH',
          body: { state: 'closed' },
        })
      }
    }
  })

  test('adds a comment and changes status from the detail panel', async ({ page }) => {
    const issueNumber = seededIssueMap.get('soon').number
    const originalIssue = await getIssue(issueNumber)
    const originalLabels = originalIssue.labels.map((label) => label.name)
    const commentBody = `[E2E] comment ${Date.now()}`
    let createdCommentId = null

    try {
      await openIssuesView(page)
      await page.getByTestId(`issue-row-${issueNumber}`).click()

      const detail = page.getByTestId('issue-detail-panel')
      await expect(detail).toContainText(seededIssues.soon)

      await detail.getByPlaceholder('メモを追加...').fill(commentBody)
      await detail.getByRole('button', { name: '送信' }).click()
      await expect(detail).toContainText(commentBody)

      await expect
        .poll(async () => {
          const comments = await listComments(issueNumber)
          return comments.find((comment) => comment.body === commentBody)?.id ?? null
        })
        .not.toBeNull()

      const comments = await listComments(issueNumber)
      createdCommentId = comments.find((comment) => comment.body === commentBody)?.id ?? null

      await detail.getByRole('button', { name: '処理済み' }).click()

      await expect
        .poll(async () => {
          const issue = await getIssue(issueNumber)
          return issue.labels.some((label) => label.name === '処理済み')
        })
        .toBe(true)

      await expect(detail).toContainText('処理済み')
    } finally {
      await setIssueLabels(issueNumber, originalLabels)

      if (createdCommentId) {
        await githubRequest(`/repos/${repoOwner}/${repoName}/issues/comments/${createdCommentId}`, {
          method: 'DELETE',
        })
      }
    }
  })

  test('changes priority from the detail panel and restores it', async ({ page }) => {
    const issueNumber = seededIssueMap.get('overdue').number
    const originalIssue = await getIssue(issueNumber)
    const originalLabels = originalIssue.labels.map((label) => label.name)

    try {
      await openIssuesView(page)
      await page.getByTestId(`issue-row-${issueNumber}`).click()

      const detail = page.getByTestId('issue-detail-panel')
      await expect(detail).toContainText(seededIssues.overdue)

      await detail.getByRole('button', { name: '🔵 次週以降' }).click()

      await expect
        .poll(async () => {
          const issue = await getIssue(issueNumber)
          return issue.labels.some((label) => label.name === '🔵 次週以降')
        })
        .toBe(true)

      await expect(detail).toContainText('🔵 次週以降')
    } finally {
      await setIssueLabels(issueNumber, originalLabels)
    }
  })

  test('moves a card across board columns and restores labels', async ({ page }) => {
    const issueNumber = seededIssueMap.get('overdue').number
    const originalIssue = await getIssue(issueNumber)
    const originalLabels = originalIssue.labels.map((label) => label.name)

    try {
      await page.getByRole('button', { name: '📊 ボード' }).click()

      const card = page.getByTestId(`board-card-${issueNumber}`)
      const targetColumn = page.getByTestId('board-column-処理中')
      await expect(card).toBeVisible()
      await expect(targetColumn).toBeVisible()

      await card.dragTo(targetColumn)

      await expect
        .poll(async () => {
          const issue = await getIssue(issueNumber)
          return issue.labels.some((label) => label.name === '処理中')
        })
        .toBe(true)
    } finally {
      await setIssueLabels(issueNumber, originalLabels)
    }
  })

  test('closes an issue from the detail panel', async ({ page }) => {
    const issueNumber = seededIssueMap.get('noDeadline').number
    const title = seededIssues.noDeadline

    try {
      await openIssuesView(page)
      const searchInput = page.getByLabel('課題検索')
      await searchInput.fill(title)
      await expect(page.getByTestId(`issue-row-${issueNumber}`)).toContainText(title)
      await page.getByTestId(`issue-row-${issueNumber}`).click()

      page.once('dialog', (dialog) => dialog.accept())
      await page.getByRole('button', { name: '完了にする' }).click()

      await expect
        .poll(async () => {
          const issue = await getIssue(issueNumber)
          return issue.state
        })
        .toBe('closed')

      await page.getByRole('button', { name: '↻ 更新' }).click()
      await expect(page.getByTestId('issue-detail-panel')).toHaveCount(0)
    } finally {
      await githubRequest(`/repos/${repoOwner}/${repoName}/issues/${issueNumber}`, {
        method: 'PATCH',
        body: { state: 'open' },
      })
    }
  })
})
