// GitHub から取得したラベルを description で分類する
// description に "priority" を含む → 優先度ラベル（"priority:N" で順序指定可）
// description に "category" を含む → カテゴリラベル
// description に "status" を含む → ステータスラベル（"status:N" で順序指定可）

// description から "keyword:N" の N を抽出（なければ Infinity）
function parseOrder(desc, keyword) {
  const match = desc.match(new RegExp(`${keyword}\\s*[:：]\\s*(\\d+)`, 'i'))
  return match ? parseInt(match[1], 10) : Infinity
}

export function classifyLabels(githubLabels) {
  const priorityLabels = []
  const categoryLabels = []
  const statusLabels = []

  for (const label of githubLabels) {
    const desc = (label.description || '').toLowerCase()
    const color = '#' + label.color

    if (desc.includes('priority')) {
      priorityLabels.push({
        name: label.name,
        color,
        key: label.name,
        order: parseOrder(desc, 'priority'),
        _idx: priorityLabels.length,
      })
    } else if (desc.includes('category')) {
      categoryLabels.push({
        name: label.name,
        color,
      })
    } else if (desc.includes('status')) {
      statusLabels.push({
        name: label.name,
        color,
        key: label.name,
        order: parseOrder(desc, 'status'),
        _idx: statusLabels.length,
      })
    }
  }

  // order 昇順でソート。同じ order の場合は元の配列順を維持
  const stableSort = (arr) => arr.sort((a, b) => a.order - b.order || a._idx - b._idx)
  stableSort(priorityLabels)
  stableSort(statusLabels)

  return { priorityLabels, categoryLabels, statusLabels }
}

// Issue のラベルから優先度キーを返す（未設定は null）
export function getPriorityKey(issue, priorityLabels) {
  const labelNames = issue.labels.map((l) => l.name)
  for (const p of priorityLabels) {
    if (labelNames.includes(p.name)) return p.key
  }
  return null
}

// Issue のラベルからカテゴリラベルを返す
export function getCategoryLabel(issue, categoryLabels) {
  const labelNames = issue.labels.map((l) => l.name)
  return categoryLabels.find((c) => labelNames.includes(c.name)) || null
}

// Issue のラベルから優先度ラベルを返す
export function getPriorityLabel(issue, priorityLabels) {
  const labelNames = issue.labels.map((l) => l.name)
  return priorityLabels.find((p) => labelNames.includes(p.name)) || null
}

// Issue のラベルからステータスキーを返す（未設定は null）
export function getStatusKey(issue, statusLabels) {
  const labelNames = issue.labels.map((l) => l.name)
  for (const s of statusLabels) {
    if (labelNames.includes(s.name)) return s.key
  }
  return null
}

// Issue のラベルからステータスラベルを返す
export function getStatusLabel(issue, statusLabels) {
  const labelNames = issue.labels.map((l) => l.name)
  return statusLabels.find((s) => labelNames.includes(s.name)) || null
}

// 優先度の順序（ソート用）— 配列のインデックス順
export function getPriorityOrder(issue, priorityLabels) {
  const key = getPriorityKey(issue, priorityLabels)
  const idx = priorityLabels.findIndex((p) => p.key === key)
  return idx >= 0 ? idx : 999
}

// カテゴリの順序（ソート用）
export function getCategoryOrder(issue, categoryLabels) {
  const cat = getCategoryLabel(issue, categoryLabels)
  if (!cat) return 999
  return categoryLabels.findIndex((c) => c.name === cat.name)
}
