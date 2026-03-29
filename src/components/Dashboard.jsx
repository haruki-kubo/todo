import { useMemo } from 'react'
import { getPriorityKey, getStatusLabel } from '../utils/labels'
import { parseDeadline, getDeadlineInfo } from '../utils/deadline'

function Dashboard({ issues, priorityLabels, statusLabels, milestones, onSelectIssue, onViewChange }) {
  const stats = useMemo(() => {
    const overdue = []
    const dueSoon = []
    const recentlyCreated = []
    const statusCounts = new Map()
    const priorityCounts = new Map()
    const assigneeCounts = new Map()

    const now = new Date()
    now.setHours(0, 0, 0, 0)

    for (const issue of issues) {
      const deadline = parseDeadline(issue.body)
      const info = getDeadlineInfo(deadline)
      if (info?.status === 'overdue') overdue.push(issue)
      if (info?.status === 'soon') dueSoon.push(issue)

      // 直近7日以内に作成
      const created = new Date(issue.created_at)
      const daysDiff = (now - created) / 86400000
      if (daysDiff <= 7) recentlyCreated.push(issue)

      // ステータス別
      const status = getStatusLabel(issue, statusLabels)
      const sKey = status?.name || '未設定'
      statusCounts.set(sKey, (statusCounts.get(sKey) || 0) + 1)

      // 優先度別
      const pKey = getPriorityKey(issue, priorityLabels)
      const pName = priorityLabels.find((p) => p.key === pKey)?.name || '未設定'
      priorityCounts.set(pName, (priorityCounts.get(pName) || 0) + 1)

      // 担当者別
      const aKey = issue.assignee?.login || '未設定'
      assigneeCounts.set(aKey, (assigneeCounts.get(aKey) || 0) + 1)
    }

    return { overdue, dueSoon, recentlyCreated, statusCounts, priorityCounts, assigneeCounts }
  }, [issues, priorityLabels, statusLabels])

  const openMilestones = milestones.filter((m) => m.state === 'open')

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* サマリーカード */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">総課題数</p>
            <p className="text-2xl font-bold text-gray-800 mt-1">{issues.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-red-200 p-4">
            <p className="text-xs text-red-500">期限超過</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.overdue.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-orange-200 p-4">
            <p className="text-xs text-orange-500">期限間近（3日以内）</p>
            <p className="text-2xl font-bold text-orange-500 mt-1">{stats.dueSoon.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-blue-200 p-4">
            <p className="text-xs text-blue-500">今週作成</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.recentlyCreated.length}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* 期限超過・間近の課題 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">要対応の課題</h3>
              <button
                onClick={() => onViewChange?.('issues')}
                className="text-[10px] text-blue-500 hover:text-blue-700"
              >
                課題一覧へ
              </button>
            </div>
            {stats.overdue.length === 0 && stats.dueSoon.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">期限超過・間近の課題はありません</p>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {[...stats.overdue, ...stats.dueSoon].map((issue) => {
                  const deadline = parseDeadline(issue.body)
                  const info = getDeadlineInfo(deadline)
                  return (
                    <button
                      key={issue.id}
                      onClick={() => onSelectIssue?.(issue)}
                      className="w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <span className={`text-[10px] shrink-0 ${info?.status === 'overdue' ? 'text-red-600' : 'text-orange-500'}`}>
                        {info?.status === 'overdue' ? '🔥' : '⚠️'}
                      </span>
                      <span className="text-xs text-gray-800 truncate flex-1">#{issue.number} {issue.title}</span>
                      <span className={`text-[10px] shrink-0 ${info?.status === 'overdue' ? 'text-red-500 font-bold' : 'text-orange-500'}`}>
                        {info?.text}
                      </span>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* ステータス別集計 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">ステータス別</h3>
              <button
                onClick={() => onViewChange?.('board')}
                className="text-[10px] text-blue-500 hover:text-blue-700"
              >
                ボードへ
              </button>
            </div>
            {statusLabels.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">ステータスラベルが未設定です</p>
            ) : (
              <div className="space-y-2">
                {[...stats.statusCounts.entries()].map(([name, count]) => {
                  const label = statusLabels.find((s) => s.name === name)
                  const pct = issues.length > 0 ? (count / issues.length) * 100 : 0
                  return (
                    <div key={name} className="flex items-center gap-2">
                      <span className="text-xs text-gray-600 w-20 truncate">{name}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{ width: `${pct}%`, backgroundColor: label?.color || '#9ca3af' }}
                        />
                      </div>
                      <span className="text-xs text-gray-500 w-8 text-right">{count}</span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* 担当者別集計 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-3">担当者別</h3>
            <div className="space-y-2">
              {[...stats.assigneeCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([name, count]) => {
                  const issue = issues.find((i) => i.assignee?.login === name)
                  return (
                    <div key={name} className="flex items-center gap-2">
                      {issue?.assignee?.avatar_url ? (
                        <img src={issue.assignee.avatar_url} alt="" className="w-5 h-5 rounded-full" />
                      ) : (
                        <span className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center text-[8px] text-gray-400">?</span>
                      )}
                      <span className="text-xs text-gray-600 flex-1 truncate">{name}</span>
                      <span className="text-xs text-gray-500">{count}件</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* マイルストーン進捗 */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-700">マイルストーン</h3>
              <button
                onClick={() => onViewChange?.('burndown')}
                className="text-[10px] text-blue-500 hover:text-blue-700"
              >
                バーンダウンへ
              </button>
            </div>
            {openMilestones.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">Open なマイルストーンがありません</p>
            ) : (
              <div className="space-y-3">
                {openMilestones.map((ms) => {
                  const open = ms.open_issues || 0
                  const closed = ms.closed_issues || 0
                  const total = open + closed
                  const pct = total > 0 ? (closed / total) * 100 : 0
                  return (
                    <div key={ms.number}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs text-gray-700 font-medium">{ms.title}</span>
                        <span className="text-[10px] text-gray-400">{closed}/{total}</span>
                      </div>
                      <div className="bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-green-500 h-2 rounded-full transition-all"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      {ms.due_on && (
                        <p className="text-[10px] text-gray-400 mt-0.5">
                          期限: {new Date(ms.due_on).toLocaleDateString('ja-JP')}
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
