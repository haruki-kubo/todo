const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''
const API_BASE = 'https://api.github.com'

function getToken() {
  return localStorage.getItem('github_token')
}

async function request(path, options = {}) {
  const token = getToken()
  if (!token) throw new Error('トークンが設定されていません')

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`GitHub API エラー (${res.status}): ${body}`)
  }

  if (res.status === 204) return null
  return res.json()
}

// OPEN な Issue を全件取得（ページネーション対応）
export async function fetchIssues() {
  const issues = []
  let page = 1
  while (true) {
    const batch = await request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=open&per_page=100&page=${page}`
    )
    issues.push(...batch)
    if (batch.length < 100) break
    page++
  }
  // プルリクエストを除外
  return issues.filter((i) => !i.pull_request)
}

// 全 Issue（Open + Closed）を取得（親子関係構築用）
export async function fetchAllIssues() {
  const issues = []
  let page = 1
  while (true) {
    const batch = await request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues?state=all&per_page=100&page=${page}`
    )
    issues.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return issues.filter((i) => !i.pull_request)
}

// Issue のコメントを取得
export async function fetchComments(issueNumber) {
  return request(
    `/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments?per_page=100`
  )
}

// コメントを追加
export async function addComment(issueNumber, body) {
  return request(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/comments`, {
    method: 'POST',
    body: JSON.stringify({ body }),
  })
}

// Issue を Close
export async function closeIssue(issueNumber) {
  return request(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ state: 'closed' }),
  })
}

// Issue のラベルを設定（既存ラベルを全置換）
export async function setLabels(issueNumber, labelNames) {
  return request(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}/labels`, {
    method: 'PUT',
    body: JSON.stringify({ labels: labelNames }),
  })
}

// 新規 Issue を作成
export async function createIssue(title, body, labels) {
  return request(`/repos/${REPO_OWNER}/${REPO_NAME}/issues`, {
    method: 'POST',
    body: JSON.stringify({ title, body, labels }),
  })
}

// Issue の本文を更新
export async function updateIssueBody(issueNumber, body) {
  return request(`/repos/${REPO_OWNER}/${REPO_NAME}/issues/${issueNumber}`, {
    method: 'PATCH',
    body: JSON.stringify({ body }),
  })
}

// リポジトリのラベル一覧を取得（ページネーション対応）
export async function fetchLabels() {
  const labels = []
  let page = 1
  while (true) {
    const batch = await request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/labels?per_page=100&page=${page}`
    )
    labels.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return labels
}

// マイルストーン一覧を取得
export async function fetchMilestones() {
  const milestones = []
  let page = 1
  while (true) {
    const batch = await request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/milestones?state=all&per_page=100&page=${page}`
    )
    milestones.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return milestones
}

// マイルストーンに属する Issue（Open + Closed）を取得
export async function fetchMilestoneIssues(milestoneNumber) {
  const issues = []
  let page = 1
  while (true) {
    const batch = await request(
      `/repos/${REPO_OWNER}/${REPO_NAME}/issues?milestone=${milestoneNumber}&state=all&per_page=100&page=${page}`
    )
    issues.push(...batch)
    if (batch.length < 100) break
    page++
  }
  return issues.filter((i) => !i.pull_request)
}

// トークンの有効性を確認
export async function verifyToken(token) {
  const res = await fetch(`${API_BASE}/user`, {
    headers: {
      Authorization: `token ${token}`,
      Accept: 'application/vnd.github.v3+json',
    },
  })
  return res.ok
}
