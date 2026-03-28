// 親 Issue の本文からサブタスクの Issue 番号一覧を抽出
// 形式: - [ ] #N または - [x] #N
const TASK_LIST_REGEX = /^-\s*\[[ x]\]\s*#(\d+)/gm

export function parseChildNumbers(body) {
  if (!body) return []
  const numbers = []
  let match
  while ((match = TASK_LIST_REGEX.exec(body)) !== null) {
    numbers.push(parseInt(match[1], 10))
  }
  // regex の lastIndex をリセット
  TASK_LIST_REGEX.lastIndex = 0
  return numbers
}

// 全 Issue から親子関係マップを構築
// 返り値: { parentMap: Map<issueNumber, parentIssueNumber>, childrenMap: Map<issueNumber, childIssueNumber[]> }
export function buildHierarchy(issues) {
  const childrenMap = new Map()
  const parentMap = new Map()

  for (const issue of issues) {
    const childNumbers = parseChildNumbers(issue.body)
    if (childNumbers.length > 0) {
      childrenMap.set(issue.number, childNumbers)
      for (const childNum of childNumbers) {
        parentMap.set(childNum, issue.number)
      }
    }
  }

  return { parentMap, childrenMap }
}

// ツリー表示用に Issue をフラット化（親→子の順、子はインデント付き）
export function flattenTree(issues, hierarchy) {
  const { parentMap, childrenMap } = hierarchy
  const issueByNumber = new Map(issues.map((i) => [i.number, i]))

  // 親 Issue（他の Issue の子でないもの）を取得
  const rootIssues = issues.filter((i) => !parentMap.has(i.number))

  const result = []
  for (const issue of rootIssues) {
    const children = childrenMap.get(issue.number)
    if (children && children.length > 0) {
      result.push({ issue, depth: 0, isParent: true, childCount: children.length })
      for (const childNum of children) {
        const child = issueByNumber.get(childNum)
        if (child) {
          result.push({ issue: child, depth: 1, isParent: false, parentNumber: issue.number })
        }
      }
    } else {
      result.push({ issue, depth: 0, isParent: false })
    }
  }

  return result
}

// 親 Issue のサブタスク進捗を計算
// closedIssues が手に入らないので、本文の [x] の数をカウント
export function getSubtaskProgress(body) {
  if (!body) return null
  const allMatch = body.match(/^-\s*\[[ x]\]\s*#\d+/gm)
  if (!allMatch || allMatch.length === 0) return null
  const doneMatch = body.match(/^-\s*\[x\]\s*#\d+/gm)
  const total = allMatch.length
  const done = doneMatch ? doneMatch.length : 0
  return { done, total }
}

// 親 Issue の本文にサブタスク行を追記
export function appendChildToBody(body, childNumber) {
  const taskLine = `- [ ] #${childNumber}`
  if (!body || body.trim() === '') return `### サブタスク\n${taskLine}`

  // 既にサブタスクセクションがあればそこに追記
  if (/^-\s*\[[ x]\]\s*#\d+/m.test(body)) {
    // 最後のタスクリスト行の後に追記
    const lines = body.split('\n')
    let lastTaskIdx = -1
    for (let i = 0; i < lines.length; i++) {
      if (/^-\s*\[[ x]\]\s*#\d+/.test(lines[i])) {
        lastTaskIdx = i
      }
    }
    lines.splice(lastTaskIdx + 1, 0, taskLine)
    return lines.join('\n')
  }

  // なければ末尾にセクションを追加
  return `${body}\n\n### サブタスク\n${taskLine}`
}
