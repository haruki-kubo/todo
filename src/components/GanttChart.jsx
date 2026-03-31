import { useMemo, useState } from 'react'
import { getPriorityLabel, getStatusLabel, getCategoryLabel } from '../utils/labels'
import { parseDeadline, parseStartDate, getDeadlineInfo } from '../utils/deadline'
import { getSubtaskProgress } from '../utils/hierarchy'
import { useTranslation } from '../i18n'

const SCALES = [
  { key: 'day', tKey: 'gantt.scaleDay', unitDays: 1, colWidth: 40 },
  { key: 'week', tKey: 'gantt.scaleWeek', unitDays: 7, colWidth: 50 },
  { key: 'month', tKey: 'gantt.scaleMonth', unitDays: 30, colWidth: 60 },
  { key: 'quarter', tKey: 'gantt.scaleQuarter', unitDays: 91, colWidth: 80 },
]

const GROUP_OPTIONS = [
  { key: 'none', tKey: 'gantt.groupNone' },
  { key: 'parent', tKey: 'gantt.groupParent' },
  { key: 'assignee', tKey: 'gantt.groupAssignee' },
  { key: 'priority', tKey: 'gantt.groupPriority' },
  { key: 'category', tKey: 'gantt.groupCategory' },
]

function GanttChart({ issues, allIssues, hierarchy, priorityLabels, categoryLabels, statusLabels, onSelectIssue, selectedIssueId }) {
  const { t, lang } = useTranslation()
  const [scaleKey, setScaleKey] = useState('day')
  const [groupByKey, setGroupByKey] = useState('none')
  const [collapsedParents, setCollapsedParents] = useState(new Set())

  const toggleCollapse = (issueNumber, e) => {
    e.stopPropagation()
    setCollapsedParents((prev) => {
      const next = new Set(prev)
      if (next.has(issueNumber)) next.delete(issueNumber)
      else next.add(issueNumber)
      return next
    })
  }

  const scale = SCALES.find((s) => s.key === scaleKey) || SCALES[0]

  // Issue にメタデータを付加（開始日: 本文の📅開始日 → 起票日の優先順）
  const items = useMemo(() => {
    return issues.map((issue) => {
      const created = new Date(issue.created_at)
      created.setHours(0, 0, 0, 0)
      const startDate = parseStartDate(issue.body) || created
      const deadline = parseDeadline(issue.body)
      return { issue, created, startDate, deadline }
    })
  }, [issues])

  // タイムライン範囲計算
  const { startDate, endDate, totalDays } = useMemo(() => {
    const now = new Date()
    now.setHours(0, 0, 0, 0)

    if (items.length === 0) {
      const s = new Date(now)
      s.setDate(s.getDate() - 7)
      const e = new Date(now)
      e.setDate(e.getDate() + 30)
      return { startDate: s, endDate: e, totalDays: 38 }
    }

    const allDates = items.flatMap((i) => [i.startDate, i.deadline].filter(Boolean))
    allDates.push(now)

    const minDate = new Date(Math.min(...allDates))
    const maxDate = new Date(Math.max(...allDates))

    minDate.setDate(minDate.getDate() - 3)
    maxDate.setDate(maxDate.getDate() + 7)

    const totalDays = Math.ceil((maxDate - minDate) / (1000 * 60 * 60 * 24)) + 1
    return { startDate: minDate, endDate: maxDate, totalDays }
  }, [items])

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // グルーピング
  const groupedRows = useMemo(() => {
    const getGroupKey = (issue) => {
      switch (groupByKey) {
        case 'parent': {
          const parentNum = hierarchy.parentMap.get(issue.number)
          if (parentNum) {
            const parentIssue = allIssues.find((i) => i.number === parentNum)
            return parentIssue ? `#${parentNum} ${parentIssue.title}` : `#${parentNum}`
          }
          // 親 Issue 自身かどうか
          if (hierarchy.childrenMap.has(issue.number)) {
            return `#${issue.number} ${issue.title}`
          }
          return t('gantt.independentIssues')
        }
        case 'assignee':
          return issue.assignee?.login || t('common.unset')
        case 'priority':
          return getPriorityLabel(issue, priorityLabels)?.name || t('common.unset')
        case 'category':
          return getCategoryLabel(issue, categoryLabels)?.name || t('common.unset')
        default:
          return null
      }
    }

    if (groupByKey === 'none') {
      // ツリー表示: 親→子の順にフラット化
      const itemByNumber = new Map(items.map((it) => [it.issue.number, it]))
      // root = 親を持たない OR 親が items にいない（Closed 親）
      const rootItems = items.filter((it) => {
        const parentNum = hierarchy.parentMap.get(it.issue.number)
        if (!parentNum) return true
        return !itemByNumber.has(parentNum) // 親が Open でなければ root 扱い
      })
      const treeItems = []
      for (const item of rootItems) {
        const childNums = hierarchy.childrenMap.get(item.issue.number)
        if (childNums && childNums.length > 0) {
          treeItems.push({ ...item, depth: 0, isParent: true })
          for (const cn of childNums) {
            const child = itemByNumber.get(cn)
            if (child) {
              treeItems.push({ ...child, depth: 1, isParent: false, parentNumber: item.issue.number })
            }
          }
        } else {
          treeItems.push({ ...item, depth: 0, isParent: false })
        }
      }
      return [{ groupName: null, treeItems }]
    }

    const groups = new Map()
    for (const item of items) {
      const key = getGroupKey(item.issue)
      if (!groups.has(key)) groups.set(key, [])
      groups.get(key).push(item)
    }
    return Array.from(groups.entries()).map(([groupName, groupItems]) => ({
      groupName,
      treeItems: groupItems.map((it) => ({ ...it, depth: 0, isParent: false })),
    }))
  }, [items, allIssues, hierarchy, groupByKey, priorityLabels, categoryLabels, t])

  // スケール用のヘッダーカラム生成
  const { columns, topHeaders, totalColumns, colWidth } = useMemo(() => {
    const colWidth = scale.colWidth
    const columns = []
    const d = new Date(startDate)

    if (scale.key === 'day') {
      for (let i = 0; i < totalDays; i++) {
        const dayOfWeek = d.getDay()
        columns.push({
          label: String(d.getDate()),
          isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
          isToday: d.getTime() === today.getTime(),
          startDay: i,
          span: 1,
        })
        d.setDate(d.getDate() + 1)
      }
    } else if (scale.key === 'week') {
      // 週の月曜始まりに揃える
      let weekStart = new Date(startDate)
      const dayOfWeek = weekStart.getDay()
      const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek
      weekStart.setDate(weekStart.getDate() + diff)
      while (weekStart <= endDate) {
        const dayOffset = Math.max(0, Math.floor((weekStart - startDate) / 86400000))
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)
        const m = weekStart.getMonth() + 1
        const day = weekStart.getDate()
        columns.push({
          label: `${m}/${day}`,
          isWeekend: false,
          isToday: today >= weekStart && today <= weekEnd,
          startDay: dayOffset,
          span: 1,
        })
        weekStart.setDate(weekStart.getDate() + 7)
      }
    } else if (scale.key === 'month') {
      const d = new Date(startDate)
      d.setDate(1)
      while (d <= endDate) {
        const dayOffset = Math.max(0, Math.floor((d - startDate) / 86400000))
        columns.push({
          label: `${d.getMonth() + 1}月`,
          isWeekend: false,
          isToday: today.getFullYear() === d.getFullYear() && today.getMonth() === d.getMonth(),
          startDay: dayOffset,
          span: 1,
        })
        d.setMonth(d.getMonth() + 1)
      }
    } else {
      // quarter
      const d = new Date(startDate)
      d.setDate(1)
      d.setMonth(Math.floor(d.getMonth() / 3) * 3)
      while (d <= endDate) {
        const q = Math.floor(d.getMonth() / 3) + 1
        const dayOffset = Math.max(0, Math.floor((d - startDate) / 86400000))
        columns.push({
          label: `${d.getFullYear()} Q${q}`,
          isWeekend: false,
          isToday: false,
          startDay: dayOffset,
          span: 1,
        })
        d.setMonth(d.getMonth() + 3)
      }
    }

    // 上段ヘッダー（日スケール時のみ月表示）
    let topHeaders = []
    if (scale.key === 'day') {
      const d = new Date(startDate)
      let prev = ''
      for (let i = 0; i < totalDays; i++) {
        const key = `${d.getFullYear()}/${d.getMonth() + 1}`
        if (key !== prev) {
          topHeaders.push({ label: key, offset: i })
          prev = key
        }
        d.setDate(d.getDate() + 1)
      }
    } else if (scale.key === 'week') {
      // 月を上段に
      for (let i = 0; i < columns.length; i++) {
        const dayOffset = columns[i].startDay
        const d = new Date(startDate)
        d.setDate(d.getDate() + dayOffset)
        const key = `${d.getFullYear()}/${d.getMonth() + 1}`
        if (i === 0 || topHeaders[topHeaders.length - 1]?.label !== key) {
          topHeaders.push({ label: key, colIndex: i })
        }
      }
    } else if (scale.key === 'month') {
      for (let i = 0; i < columns.length; i++) {
        const dayOffset = columns[i].startDay
        const d = new Date(startDate)
        d.setDate(d.getDate() + dayOffset)
        const key = `${d.getFullYear()}`
        if (i === 0 || topHeaders[topHeaders.length - 1]?.label !== key) {
          topHeaders.push({ label: key, colIndex: i })
        }
      }
    }

    return { columns, topHeaders, totalColumns: columns.length, colWidth }
  }, [startDate, endDate, totalDays, today, scale])

  const chartWidth = totalColumns * colWidth
  const rowHeight = 40
  const headerHeight = scale.key === 'day' || topHeaders.length > 0 ? 60 : 36
  const labelWidth = 320
  const groupRowHeight = 32

  // 日付からピクセル位置を算出
  const dateToPx = (date) => {
    const dayOffset = (date - startDate) / 86400000
    // 各カラムの startDay を使って位置を算出
    if (scale.key === 'day') {
      return dayOffset * colWidth
    }
    // 他のスケールでは日数ベースで比例配置
    const totalPx = chartWidth
    return (dayOffset / totalDays) * totalPx
  }

  const todayPx = dateToPx(today)

  if (items.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        {t('gantt.noTasks')}
      </div>
    )
  }

  // 親サマリーバーの範囲を計算
  const getParentBarRange = (item) => {
    const childNums = hierarchy.childrenMap.get(item.issue.number)
    if (!childNums || childNums.length === 0) return null
    const itemByNumber = new Map(items.map((it) => [it.issue.number, it]))
    const dates = [item.startDate]
    if (item.deadline) dates.push(item.deadline)
    for (const cn of childNums) {
      const child = itemByNumber.get(cn)
      if (child) {
        dates.push(child.startDate)
        if (child.deadline) dates.push(child.deadline)
      }
    }
    return {
      start: new Date(Math.min(...dates)),
      end: new Date(Math.max(...dates)),
    }
  }

  const renderRow = (treeItem) => {
    const { issue, startDate: itemStartDate, deadline } = treeItem
    const depth = treeItem.depth || 0
    const isParentRow = treeItem.isParent || false
    const priorityLabel = getPriorityLabel(issue, priorityLabels)
    const status = statusLabels ? getStatusLabel(issue, statusLabels) : null
    const barColor = priorityLabel?.color || '#9ca3af'
    const isSelected = selectedIssueId === issue.id
    const isCollapsed = collapsedParents.has(issue.number)
    const progress = isParentRow ? getSubtaskProgress(issue.body) : null
    const deadlineInfo = !isParentRow ? getDeadlineInfo(deadline) : null

    // バー計算
    let barLeft, barWidth
    if (isParentRow) {
      const range = getParentBarRange(treeItem)
      if (range) {
        barLeft = dateToPx(range.start)
        const endPx = dateToPx(range.end)
        barWidth = Math.max(endPx - barLeft + (scale.key === 'day' ? colWidth : colWidth / 2), colWidth / 2)
      } else {
        barLeft = dateToPx(itemStartDate)
        barWidth = colWidth / 2
      }
    } else {
      barLeft = dateToPx(itemStartDate)
      if (deadline) {
        const deadlinePx = dateToPx(deadline)
        barWidth = Math.max(deadlinePx - barLeft + (scale.key === 'day' ? colWidth : colWidth / 2), colWidth / 2)
      } else {
        barWidth = colWidth / 2
      }
    }

    return (
      <div
        key={issue.id}
        onClick={() => onSelectIssue?.(issue)}
        className={`flex border-b border-gray-100 cursor-pointer ${
          isSelected ? 'bg-blue-50' : isParentRow ? 'bg-gray-50/50 hover:bg-gray-100/50' : 'hover:bg-gray-50'
        }`}
        style={{ height: rowHeight }}
      >
        {/* 左列 */}
        <div
          className={`sticky left-0 z-10 border-r border-gray-200 flex items-center gap-1.5 ${
            isSelected ? 'bg-blue-50' : isParentRow ? 'bg-gray-50/50' : 'bg-white hover:bg-gray-50'
          }`}
          style={{ width: labelWidth, minWidth: labelWidth, paddingLeft: 12 + depth * 18 }}
        >
          {isParentRow ? (
            <button
              onClick={(e) => toggleCollapse(issue.number, e)}
              className="text-gray-400 hover:text-gray-600 text-[10px] w-3.5 shrink-0"
            >
              {isCollapsed ? '▶' : '▼'}
            </button>
          ) : depth > 0 ? (
            <span className="text-gray-300 text-[10px] w-3.5 shrink-0">└</span>
          ) : null}
          <span
            className="w-2 h-2 rounded-full shrink-0"
            style={{ backgroundColor: barColor }}
          />
          <span className="text-xs text-gray-400 shrink-0">#{issue.number}</span>
          <span className={`text-xs truncate flex-1 min-w-0 ${isParentRow ? 'font-medium text-gray-900' : 'text-gray-800'}`}>
            {issue.title}
          </span>
          {progress && (
            <span className="text-[10px] text-gray-400 shrink-0">({progress.done}/{progress.total})</span>
          )}
          {status && (
            <span
              className="text-[10px] px-1.5 py-0.5 rounded text-white shrink-0"
              style={{ backgroundColor: status.color }}
            >
              {status.name}
            </span>
          )}
          {deadlineInfo && (deadlineInfo.status === 'overdue' || deadlineInfo.status === 'soon') && (
            <span
              className={`text-[10px] shrink-0 ${
                deadlineInfo.status === 'overdue'
                  ? 'text-red-600 font-bold'
                  : 'text-orange-500 font-medium'
              }`}
              title={deadlineInfo.text}
            >
              {deadlineInfo.status === 'overdue' ? '🔥' : '⚠️'}
            </span>
          )}
          {issue.assignee && (
            <img
              src={issue.assignee.avatar_url}
              alt=""
              className="w-4 h-4 rounded-full shrink-0"
            />
          )}
        </div>
        {/* チャート部分 */}
        <div className="relative" style={{ width: chartWidth }}>
          {scale.key === 'day' && columns.map((col, i) =>
            col.isWeekend ? (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-gray-50/50"
                style={{ left: i * colWidth, width: colWidth }}
              />
            ) : null
          )}
          {todayPx >= 0 && todayPx < chartWidth && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-blue-400 z-5"
              style={{ left: todayPx + (scale.key === 'day' ? colWidth / 2 : 0) }}
            />
          )}
          {isParentRow ? (
            // 親サマリーバー: 菱形の両端 + 細い線
            <div
              className="absolute flex items-center"
              style={{ left: barLeft, width: barWidth, top: rowHeight / 2 - 3, height: 6 }}
              title={`${issue.title}（サブタスク ${progress ? `${progress.done}/${progress.total}` : ''}）`}
            >
              <div className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ backgroundColor: barColor, marginLeft: -1 }} />
              <div className="flex-1 h-0.5" style={{ backgroundColor: barColor, opacity: 0.6 }} />
              <div className="w-2.5 h-2.5 rotate-45 shrink-0" style={{ backgroundColor: barColor, marginRight: -1 }} />
            </div>
          ) : (
            <div
              className="absolute top-2 rounded-md shadow-sm flex items-center px-2 cursor-default"
              style={{
                left: barLeft,
                width: barWidth,
                height: rowHeight - 16,
                backgroundColor: barColor,
                opacity: deadline ? 0.85 : 0.5,
              }}
              title={`${issue.title}${deadline ? `\n${t('detail.deadline')}: ${deadline.toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')}` : `\n${t('gantt.noDeadline')}`}`}
            >
              {barWidth > 80 && (
                <span className="text-[10px] text-white truncate font-medium">
                  {issue.title}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ツールバー */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('gantt.scaleLabel')}</span>
          {SCALES.map((s) => (
            <button
              key={s.key}
              onClick={() => setScaleKey(s.key)}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                scaleKey === s.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t(s.tKey)}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('gantt.groupLabel')}</span>
          <select
            value={groupByKey}
            onChange={(e) => setGroupByKey(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
          >
            {GROUP_OPTIONS.map((g) => (
              <option key={g.key} value={g.key}>{t(g.tKey)}</option>
            ))}
          </select>
        </div>
      </div>

      {/* チャート */}
      <div
        data-testid="gantt-chart"
        className="overflow-auto border-t border-gray-200 bg-white flex-1"
      >
        <div className="relative" style={{ minWidth: labelWidth + chartWidth }}>
          {/* ヘッダー */}
          <div className="sticky top-0 z-10 flex bg-white border-b border-gray-200" style={{ height: headerHeight }}>
            <div
              className="sticky left-0 z-20 bg-gray-50 border-r border-gray-200 flex items-end px-3 pb-2 text-xs font-medium text-gray-500"
              style={{ width: labelWidth, minWidth: labelWidth }}
            >
              {t('gantt.taskName')}
            </div>
            <div className="relative" style={{ width: chartWidth }}>
              {/* 上段ヘッダー */}
              {topHeaders.length > 0 && (
                <div className="flex h-[28px] border-b border-gray-100">
                  {topHeaders.map((h, i) => {
                    const nextH = topHeaders[i + 1]
                    let widthCols
                    if (scale.key === 'day') {
                      const nextOffset = nextH ? nextH.offset : totalDays
                      widthCols = nextOffset - h.offset
                      return (
                        <div
                          key={h.label + h.offset}
                          className="text-xs font-medium text-gray-600 border-r border-gray-100 flex items-center px-2 absolute"
                          style={{ left: h.offset * colWidth, width: widthCols * colWidth }}
                        >
                          {h.label}
                        </div>
                      )
                    } else {
                      const nextIdx = nextH ? nextH.colIndex : totalColumns
                      widthCols = nextIdx - h.colIndex
                      return (
                        <div
                          key={h.label + h.colIndex}
                          className="text-xs font-medium text-gray-600 border-r border-gray-100 flex items-center px-2 absolute"
                          style={{ left: h.colIndex * colWidth, width: widthCols * colWidth }}
                        >
                          {h.label}
                        </div>
                      )
                    }
                  })}
                </div>
              )}
              {/* 下段ヘッダー */}
              <div className="flex" style={{ height: topHeaders.length > 0 ? 32 : headerHeight }}>
                {columns.map((col, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-center text-[10px] border-r border-gray-100 ${
                      col.isToday
                        ? 'bg-blue-100 text-blue-700 font-bold'
                        : col.isWeekend
                          ? 'bg-gray-50 text-gray-400'
                          : 'text-gray-500'
                    }`}
                    style={{ width: colWidth, minWidth: colWidth }}
                  >
                    {col.label}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 行 */}
          {groupedRows.map((group, gi) => {
            const visibleItems = group.treeItems.filter((it) => {
              if ((it.depth || 0) === 0) return true
              return !collapsedParents.has(it.parentNumber)
            })
            return (
              <div key={group.groupName || gi}>
                {group.groupName && (
                  <div
                    className="flex items-center border-b border-gray-200 bg-gray-100 sticky left-0"
                    style={{ height: groupRowHeight }}
                  >
                    <div
                      className="sticky left-0 z-10 px-4 text-xs font-bold text-gray-700"
                      style={{ width: labelWidth, minWidth: labelWidth }}
                    >
                      {group.groupName}
                      <span className="ml-2 text-gray-400 font-normal">({group.treeItems.length})</span>
                    </div>
                  </div>
                )}
                {visibleItems.map(renderRow)}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default GanttChart
