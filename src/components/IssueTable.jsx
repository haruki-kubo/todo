import { useState, useMemo } from 'react'
import { getPriorityKey, getPriorityLabel, getCategoryLabel, getStatusLabel } from '../utils/labels'
import { parseDeadline, getDeadlineInfo } from '../utils/deadline'
import { flattenTree, getSubtaskProgress } from '../utils/hierarchy'
import { useTranslation } from '../i18n'

function IssueTable({ issues, hierarchy, priorityLabels, categoryLabels, statusLabels, onSelectIssue, selectedIssueId }) {
  const { t, lang } = useTranslation()
  const [sortKey, setSortKey] = useState('created')
  const [sortAsc, setSortAsc] = useState(false)
  const [filterPriority, setFilterPriority] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [filterParentOnly, setFilterParentOnly] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [collapsedParents, setCollapsedParents] = useState(new Set())

  const assignees = useMemo(() => {
    const map = new Map()
    for (const issue of issues) {
      if (issue.assignee && !map.has(issue.assignee.login)) {
        map.set(issue.assignee.login, issue.assignee)
      }
    }
    return Array.from(map.values())
  }, [issues])

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc)
    } else {
      setSortKey(key)
      setSortAsc(true)
    }
  }

  const sortIcon = (key) => {
    if (sortKey !== key) return '↕'
    return sortAsc ? '↑' : '↓'
  }

  const toggleCollapse = (issueNumber, e) => {
    e.stopPropagation()
    setCollapsedParents((prev) => {
      const next = new Set(prev)
      if (next.has(issueNumber)) next.delete(issueNumber)
      else next.add(issueNumber)
      return next
    })
  }

  const filtered = useMemo(() => {
    let result = issues

    if (filterPriority !== 'all') {
      result = result.filter((i) => getPriorityKey(i, priorityLabels) === filterPriority)
    }
    if (filterCategory !== 'all') {
      result = result.filter((i) => i.labels.some((l) => l.name === filterCategory))
    }
    if (filterStatus !== 'all') {
      result = result.filter((i) => {
        const s = getStatusLabel(i, statusLabels)
        return s?.name === filterStatus
      })
    }
    if (filterAssignee !== 'all') {
      if (filterAssignee === '__unassigned__') {
        result = result.filter((i) => !i.assignee)
      } else {
        result = result.filter((i) => i.assignee?.login === filterAssignee)
      }
    }
    if (filterParentOnly) {
      result = result.filter((i) => hierarchy.childrenMap.has(i.number))
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase()
      result = result.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          String(i.number).includes(q)
      )
    }

    const sorted = [...result].sort((a, b) => {
      let cmp = 0
      switch (sortKey) {
        case 'number':
          cmp = a.number - b.number
          break
        case 'title':
          cmp = a.title.localeCompare(b.title, 'ja')
          break
        case 'priority': {
          const aIdx = priorityLabels.findIndex((p) => p.key === getPriorityKey(a, priorityLabels))
          const bIdx = priorityLabels.findIndex((p) => p.key === getPriorityKey(b, priorityLabels))
          cmp = (aIdx >= 0 ? aIdx : 999) - (bIdx >= 0 ? bIdx : 999)
          break
        }
        case 'status': {
          const aIdx = statusLabels.findIndex((s) => s.key === (getStatusLabel(a, statusLabels)?.key))
          const bIdx = statusLabels.findIndex((s) => s.key === (getStatusLabel(b, statusLabels)?.key))
          cmp = (aIdx >= 0 ? aIdx : 999) - (bIdx >= 0 ? bIdx : 999)
          break
        }
        case 'category': {
          const aLabel = getCategoryLabel(a, categoryLabels)?.name || 'zzz'
          const bLabel = getCategoryLabel(b, categoryLabels)?.name || 'zzz'
          cmp = aLabel.localeCompare(bLabel, 'ja')
          break
        }
        case 'assignee': {
          const aName = a.assignee?.login || 'zzz'
          const bName = b.assignee?.login || 'zzz'
          cmp = aName.localeCompare(bName)
          break
        }
        case 'deadline': {
          const aD = parseDeadline(a.body)?.getTime() || Infinity
          const bD = parseDeadline(b.body)?.getTime() || Infinity
          cmp = aD - bD
          break
        }
        case 'created':
        default:
          cmp = new Date(a.created_at) - new Date(b.created_at)
          break
      }
      return sortAsc ? cmp : -cmp
    })

    return sorted
  }, [issues, hierarchy, priorityLabels, categoryLabels, statusLabels, sortKey, sortAsc, filterPriority, filterCategory, filterStatus, filterAssignee, filterParentOnly, searchQuery])

  // フィルター・検索が適用されているかどうか
  const isFiltering = filterPriority !== 'all' || filterCategory !== 'all' || filterStatus !== 'all' || filterAssignee !== 'all' || filterParentOnly || searchQuery.trim() !== ''

  // ツリー構造でフラット化（フィルター時はフラット表示にフォールバック）
  const treeRows = useMemo(() => {
    if (isFiltering) {
      return filtered.map((issue) => ({ issue, depth: 0, isParent: false }))
    }
    return flattenTree(filtered, hierarchy)
  }, [filtered, hierarchy, isFiltering])

  // 折りたたみ適用
  const visibleRows = useMemo(() => {
    return treeRows.filter((row) => {
      if (row.depth === 0) return true
      return !collapsedParents.has(row.parentNumber)
    })
  }, [treeRows, collapsedParents])

  return (
    <div className="flex flex-col h-full">
      {/* フィルターバー */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 border-b border-gray-200 flex-wrap">
        <input
          aria-label="課題検索"
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t('table.search')}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 w-52 focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
        />
        <select
          aria-label="優先度フィルター"
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="all">{t('table.allPriority')}</option>
          {priorityLabels.map((p) => (
            <option key={p.key} value={p.key}>{p.name}</option>
          ))}
        </select>
        {statusLabels.length > 0 && (
          <select
            aria-label="ステータスフィルター"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
          >
            <option value="all">{t('table.allStatus')}</option>
            {statusLabels.map((s) => (
              <option key={s.key} value={s.name}>{s.name}</option>
            ))}
          </select>
        )}
        <select
          aria-label="担当者フィルター"
          value={filterAssignee}
          onChange={(e) => setFilterAssignee(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="all">{t('table.allAssignee')}</option>
          <option value="__unassigned__">{t('common.unset')}</option>
          {assignees.map((a) => (
            <option key={a.login} value={a.login}>{a.login}</option>
          ))}
        </select>
        <select
          aria-label="カテゴリフィルター"
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700"
        >
          <option value="all">{t('table.allCategory')}</option>
          {categoryLabels.map((c) => (
            <option key={c.name} value={c.name}>{c.name}</option>
          ))}
        </select>
        <label className="flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={filterParentOnly}
            onChange={(e) => setFilterParentOnly(e.target.checked)}
            className="rounded border-gray-300"
          />
          {t('table.parentOnly')}
        </label>
        <span className="text-xs text-gray-400 ml-auto">{filtered.length}{t('common.items')}</span>
      </div>

      {/* テーブル */}
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 sticky top-0 z-10">
            <tr className="border-b border-gray-200">
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-16"
                onClick={() => handleSort('number')}
              >
                {t('table.colNumber')} {sortIcon('number')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700"
                onClick={() => handleSort('title')}
              >
                {t('table.colTitle')} {sortIcon('title')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-24"
                onClick={() => handleSort('assignee')}
              >
                {t('table.colAssignee')} {sortIcon('assignee')}
              </th>
              {statusLabels.length > 0 && (
                <th
                  className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-28"
                  onClick={() => handleSort('status')}
                >
                  {t('table.colStatus')} {sortIcon('status')}
                </th>
              )}
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-28"
                onClick={() => handleSort('priority')}
              >
                {t('table.colPriority')} {sortIcon('priority')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-32"
                onClick={() => handleSort('category')}
              >
                {t('table.colCategory')} {sortIcon('category')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-32"
                onClick={() => handleSort('deadline')}
              >
                {t('table.colDeadline')} {sortIcon('deadline')}
              </th>
              <th
                className="text-left px-4 py-2.5 text-xs font-medium text-gray-500 cursor-pointer hover:text-gray-700 w-28"
                onClick={() => handleSort('created')}
              >
                {t('table.colCreated')} {sortIcon('created')}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleRows.length === 0 ? (
              <tr>
                <td colSpan={statusLabels.length > 0 ? 8 : 7} className="text-center py-12 text-gray-400">
                  {t('table.noIssues')}
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => {
                const { issue, depth, isParent } = row
                const priorityLabel = getPriorityLabel(issue, priorityLabels)
                const category = getCategoryLabel(issue, categoryLabels)
                const status = getStatusLabel(issue, statusLabels)
                const deadline = parseDeadline(issue.body)
                const deadlineInfo = getDeadlineInfo(deadline)
                const isSelected = selectedIssueId === issue.id
                const progress = isParent ? getSubtaskProgress(issue.body) : null
                const isCollapsed = collapsedParents.has(issue.number)

                return (
                  <tr
                    key={issue.id}
                    onClick={() => onSelectIssue(issue)}
                    data-testid={`issue-row-${issue.number}`}
                    className={`border-b border-gray-100 cursor-pointer transition-colors ${
                      isSelected ? 'bg-blue-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      #{issue.number}
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2" style={{ paddingLeft: depth * 20 }}>
                        {isParent && (
                          <button
                            onClick={(e) => toggleCollapse(issue.number, e)}
                            className="text-gray-400 hover:text-gray-600 text-xs w-4 shrink-0"
                          >
                            {isCollapsed ? '▶' : '▼'}
                          </button>
                        )}
                        {!isParent && depth > 0 && (
                          <span className="text-gray-300 text-xs w-4 shrink-0">└</span>
                        )}
                        {priorityLabel && (
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: priorityLabel.color }}
                          />
                        )}
                        <span className="text-gray-800 truncate">{issue.title}</span>
                        {progress && (
                          <span className="text-[10px] text-gray-400 shrink-0">
                            ({progress.done}/{progress.total})
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      {issue.assignee ? (
                        <div className="flex items-center gap-1.5">
                          <img
                            src={issue.assignee.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-xs text-gray-600 truncate">
                            {issue.assignee.login}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-300">-</span>
                      )}
                    </td>
                    {statusLabels.length > 0 && (
                      <td className="px-4 py-2.5">
                        {status ? (
                          <span
                            className="text-[11px] px-2 py-0.5 rounded text-white"
                            style={{ backgroundColor: status.color }}
                          >
                            {status.name}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-300">-</span>
                        )}
                      </td>
                    )}
                    <td className="px-4 py-2.5">
                      {priorityLabel && (
                        <span className="text-xs text-gray-600">
                          {priorityLabel.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {category && (
                        <span
                          className="text-[11px] px-2 py-0.5 rounded-full text-white"
                          style={{ backgroundColor: category.color }}
                        >
                          {category.name}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {deadlineInfo && (
                        <span
                          className={`text-xs ${
                            deadlineInfo.status === 'overdue'
                              ? 'text-red-600 font-bold'
                              : deadlineInfo.status === 'soon'
                                ? 'text-orange-500 font-medium'
                                : 'text-gray-500'
                          }`}
                        >
                          {deadlineInfo.text}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">
                      {new Date(issue.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default IssueTable
