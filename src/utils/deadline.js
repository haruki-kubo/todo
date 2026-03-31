// Issue本文から期限を抽出する
// 形式: 📅 期限: YYYY-MM-DD または 📅 期限: YYYY/MM/DD
const DEADLINE_REGEX = /📅\s*期限[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/

export function parseDeadline(body) {
  if (!body) return null
  const match = body.match(DEADLINE_REGEX)
  if (!match) return null
  const normalized = match[1].replace(/\//g, '-')
  const [yearStr, monthStr, dayStr] = normalized.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  // JS Date の自動補正を弾いて、実在する日付だけ受け付ける
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

// 期限の表示テキストとステータスを返す
export function getDeadlineInfo(deadline) {
  if (!deadline) return null

  const now = new Date()
  now.setHours(0, 0, 0, 0)
  const diffDays = Math.ceil((deadline - now) / (1000 * 60 * 60 * 24))

  const month = deadline.getMonth() + 1
  const day = deadline.getDate()
  const label = `${month}/${day}`

  if (diffDays < 0) {
    return { label: `${label}`, status: 'overdue', text: `🔥 ${label}（${Math.abs(diffDays)}日超過）` }
  }
  if (diffDays <= 3) {
    return { label: `${label}`, status: 'soon', text: `⚠️ ${label}（あと${diffDays}日）` }
  }
  return { label: `${label}`, status: 'normal', text: `📅 ${label}` }
}

// Issue本文から開始日を抽出する
// 形式: 📅 開始日: YYYY-MM-DD または 📅 開始日: YYYY/MM/DD
const START_DATE_REGEX = /📅\s*開始日[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/

export function parseStartDate(body) {
  if (!body) return null
  const match = body.match(START_DATE_REGEX)
  if (!match) return null
  const normalized = match[1].replace(/\//g, '-')
  const [yearStr, monthStr, dayStr] = normalized.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const day = Number(dayStr)
  if (!year || !month || !day) return null

  const date = new Date(year, month - 1, day)
  date.setHours(0, 0, 0, 0)

  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null
  }

  return date
}

// 開始日テキストを Issue 本文に挿入する
export function insertStartDateToBody(body, dateStr) {
  if (!dateStr) return body || ''
  const startLine = `📅 開始日: ${dateStr}`
  if (!body || body.trim() === '') return startLine
  return `${startLine}\n${body}`
}

// 期限テキストを Issue 本文に挿入する
export function insertDeadlineToBody(body, dateStr) {
  if (!dateStr) return body || ''
  const deadlineLine = `📅 期限: ${dateStr}`
  if (!body || body.trim() === '') return deadlineLine
  return `${deadlineLine}\n\n${body}`
}
