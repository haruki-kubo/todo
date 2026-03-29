import { useState, useEffect, useMemo, useCallback } from 'react'
import { fetchMilestones, fetchMilestoneIssues } from '../api/github'

const CHART_PADDING = { top: 30, right: 30, bottom: 50, left: 50 }
const MILESTONE_START_DATE_PATTERN = /開始日[:：]\s*(\d{4}[-/]\d{1,2}[-/]\d{1,2})/

function parseMilestoneStartDate(description) {
  if (!description) return null

  const match = description.match(MILESTONE_START_DATE_PATTERN)
  if (!match) return null

  const normalized = match[1].replace(/\//g, '-')
  const parsed = new Date(`${normalized}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) return null

  parsed.setHours(0, 0, 0, 0)
  return parsed
}

function BurndownChart() {
  const [milestones, setMilestones] = useState([])
  const [selectedMilestone, setSelectedMilestone] = useState(null)
  const [milestoneIssues, setMilestoneIssues] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingIssues, setLoadingIssues] = useState(false)

  const loadMilestoneIssues = useCallback(async (milestone) => {
    if (!milestone) return
    setLoadingIssues(true)
    try {
      const data = await fetchMilestoneIssues(milestone.number)
      setMilestoneIssues(data)
    } catch {
      setMilestoneIssues([])
    } finally {
      setLoadingIssues(false)
    }
  }, [])

  // マイルストーン一覧を初回取得
  useEffect(() => {
    let cancelled = false
    fetchMilestones()
      .then((data) => {
        if (cancelled) return
        setMilestones(data)
        const withDue = data.filter((m) => m.due_on)
        let initial = null
        if (withDue.length > 0) {
          withDue.sort((a, b) => new Date(b.due_on) - new Date(a.due_on))
          initial = withDue[0]
        } else if (data.length > 0) {
          initial = data[0]
        }
        if (initial) {
          setSelectedMilestone(initial)
          loadMilestoneIssues(initial)
        }
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [loadMilestoneIssues])

  // バーンダウンデータを計算
  const chartData = useMemo(() => {
    if (!selectedMilestone || milestoneIssues.length === 0) return null

    const totalIssues = milestoneIssues.length

    // 終了日: マイルストーンの期限日、なければ今日 + 14 日
    let endDate
    if (selectedMilestone.due_on) {
      endDate = new Date(selectedMilestone.due_on)
    } else {
      endDate = new Date()
      endDate.setDate(endDate.getDate() + 14)
    }
    endDate.setHours(0, 0, 0, 0)

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const displayEnd = new Date(Math.max(endDate.getTime(), today.getTime()))

    // 開始日: Milestone description の「開始日」を優先、未指定時は最古の Issue 作成日
    const createdDates = milestoneIssues.map((i) => new Date(i.created_at))
    const fallbackStartDate = new Date(Math.min(...createdDates))
    fallbackStartDate.setHours(0, 0, 0, 0)
    const explicitStartDate = parseMilestoneStartDate(selectedMilestone.description)
    const startDate = explicitStartDate && explicitStartDate <= displayEnd
      ? explicitStartDate
      : fallbackStartDate

    // 日別のクローズ数を集計
    const closedByDay = new Map()
    for (const issue of milestoneIssues) {
      if (issue.state === 'closed' && issue.closed_at) {
        const d = new Date(issue.closed_at)
        d.setHours(0, 0, 0, 0)
        const key = d.getTime()
        closedByDay.set(key, (closedByDay.get(key) || 0) + 1)
      }
    }

    // 日ごとの残課題数を計算
    const days = []
    const d = new Date(startDate)
    let remaining = totalIssues

    while (d <= displayEnd) {
      const key = d.getTime()
      const closed = closedByDay.get(key) || 0
      remaining -= closed
      days.push({
        date: new Date(d),
        remaining,
        isToday: d.getTime() === today.getTime(),
        isPast: d <= today,
      })
      d.setDate(d.getDate() + 1)
    }

    const totalDays = days.length - 1

    return {
      totalIssues,
      days,
      totalDays,
      startDate,
      endDate,
      today,
      openCount: milestoneIssues.filter((i) => i.state === 'open').length,
      closedCount: milestoneIssues.filter((i) => i.state === 'closed').length,
    }
  }, [selectedMilestone, milestoneIssues])

  const handleMilestoneChange = (e) => {
    const ms = milestones.find((m) => m.number === parseInt(e.target.value, 10))
    setSelectedMilestone(ms || null)
    if (ms) loadMilestoneIssues(ms)
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">マイルストーンを読み込み中...</div>
  }

  if (milestones.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <p>マイルストーンが設定されていません</p>
        <p className="text-xs mt-2">GitHub リポジトリでマイルストーンを作成し、Issue を紐づけてください</p>
      </div>
    )
  }

  // SVG チャート描画
  const chartWidth = 800
  const chartHeight = 400
  const innerWidth = chartWidth - CHART_PADDING.left - CHART_PADDING.right
  const innerHeight = chartHeight - CHART_PADDING.top - CHART_PADDING.bottom

  const renderChart = () => {
    if (!chartData || loadingIssues) return null

    const { totalIssues, days, totalDays } = chartData

    const maxY = totalIssues
    const effectiveTotalDays = Math.max(totalDays, 1)
    const xScale = (i) => CHART_PADDING.left + (i / effectiveTotalDays) * innerWidth
    const yScale = (v) => CHART_PADDING.top + ((maxY - v) / maxY) * innerHeight

    // 理想線
    const idealPoints = days.map((_, i) => {
      const idealRemaining = totalIssues * (1 - i / effectiveTotalDays)
      return `${xScale(i)},${yScale(idealRemaining)}`
    }).join(' ')

    // 実績線（過去のみ）
    const actualDays = days.filter((d) => d.isPast)
    const actualPoints = actualDays.map((d, i) =>
      `${xScale(i)},${yScale(d.remaining)}`
    ).join(' ')

    // Y 軸グリッド
    const yTicks = []
    const step = Math.max(1, Math.ceil(maxY / 5))
    for (let i = 0; i <= maxY; i += step) yTicks.push(i)
    if (yTicks[yTicks.length - 1] !== maxY) yTicks.push(maxY)

    // X 軸ラベル間引き
    const xLabelInterval = Math.max(1, Math.floor(days.length / 10))

    return (
      <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
        {/* グリッド */}
        {yTicks.map((v) => (
          <g key={v}>
            <line
              x1={CHART_PADDING.left} y1={yScale(v)}
              x2={chartWidth - CHART_PADDING.right} y2={yScale(v)}
              stroke="#e5e7eb" strokeWidth="1"
            />
            <text
              x={CHART_PADDING.left - 8} y={yScale(v) + 4}
              textAnchor="end" className="text-[10px] fill-gray-400"
            >
              {v}
            </text>
          </g>
        ))}

        {/* X 軸ラベル */}
        {days.map((d, i) => {
          if (i % xLabelInterval !== 0 && i !== days.length - 1) return null
          return (
            <text
              key={i}
              x={xScale(i)} y={chartHeight - CHART_PADDING.bottom + 18}
              textAnchor="middle" className="text-[9px] fill-gray-400"
            >
              {d.date.getMonth() + 1}/{d.date.getDate()}
            </text>
          )
        })}

        {/* 軸線 */}
        <line
          x1={CHART_PADDING.left} y1={CHART_PADDING.top}
          x2={CHART_PADDING.left} y2={chartHeight - CHART_PADDING.bottom}
          stroke="#9ca3af" strokeWidth="1"
        />
        <line
          x1={CHART_PADDING.left} y1={chartHeight - CHART_PADDING.bottom}
          x2={chartWidth - CHART_PADDING.right} y2={chartHeight - CHART_PADDING.bottom}
          stroke="#9ca3af" strokeWidth="1"
        />

        {/* 理想線 */}
        <polyline
          points={idealPoints}
          fill="none" stroke="#9ca3af" strokeWidth="2" strokeDasharray="6 4"
        />

        {/* 実績線 */}
        {actualPoints && (
          <polyline
            points={actualPoints}
            fill="none" stroke="#3b82f6" strokeWidth="2.5"
          />
        )}

        {/* 実績線の最後のポイント */}
        {actualDays.length > 0 && (
          <circle
            cx={xScale(actualDays.length - 1)}
            cy={yScale(actualDays[actualDays.length - 1].remaining)}
            r="4" fill="#3b82f6"
          />
        )}

        {/* 今日の線 */}
        {(() => {
          const todayIdx = days.findIndex((d) => d.isToday)
          if (todayIdx < 0) return null
          return (
            <line
              x1={xScale(todayIdx)} y1={CHART_PADDING.top}
              x2={xScale(todayIdx)} y2={chartHeight - CHART_PADDING.bottom}
              stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3"
            />
          )
        })()}

        {/* 凡例 */}
        <g transform={`translate(${CHART_PADDING.left + 10}, ${CHART_PADDING.top + 10})`}>
          <line x1="0" y1="0" x2="20" y2="0" stroke="#9ca3af" strokeWidth="2" strokeDasharray="6 4" />
          <text x="26" y="4" className="text-[10px] fill-gray-500">理想線</text>
          <line x1="0" y1="16" x2="20" y2="16" stroke="#3b82f6" strokeWidth="2.5" />
          <text x="26" y="20" className="text-[10px] fill-blue-600">実績線</text>
          <line x1="0" y1="32" x2="20" y2="32" stroke="#ef4444" strokeWidth="1" strokeDasharray="4 3" />
          <text x="26" y="36" className="text-[10px] fill-red-500">今日</text>
        </g>
      </svg>
    )
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ツールバー */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">マイルストーン:</span>
          <select
            value={selectedMilestone?.number || ''}
            onChange={handleMilestoneChange}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
          >
            {milestones.map((m) => (
              <option key={m.number} value={m.number}>
                {m.title} {m.state === 'closed' ? '(Closed)' : ''}
              </option>
            ))}
          </select>
        </div>
        {chartData && (
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>総課題数: <strong className="text-gray-700">{chartData.totalIssues}</strong></span>
            <span>完了: <strong className="text-green-600">{chartData.closedCount}</strong></span>
            <span>残: <strong className="text-blue-600">{chartData.openCount}</strong></span>
          </div>
        )}
      </div>

      {/* チャート */}
      <div className="flex-1 overflow-auto p-6">
        {loadingIssues ? (
          <div className="text-center py-16 text-gray-400">課題を読み込み中...</div>
        ) : chartData ? (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-sm font-bold text-gray-700 mb-4">
                {selectedMilestone?.title} - バーンダウンチャート
              </h3>
              {renderChart()}
              {selectedMilestone?.due_on && (
                <p className="text-xs text-gray-400 mt-3 text-center">
                  期限: {new Date(selectedMilestone.due_on).toLocaleDateString('ja-JP')}
                </p>
              )}
            </div>

            {/* 説明 */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h4 className="text-xs font-bold text-gray-700 mb-3">バーンダウンチャートの見方</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-gray-600">
                <div className="flex items-start gap-2">
                  <span className="inline-block w-5 h-0.5 mt-2 bg-gray-400 shrink-0" style={{ borderTop: '2px dashed #9ca3af' }} />
                  <div>
                    <p className="font-medium text-gray-700">理想線（グレー破線）</p>
                    <p className="mt-0.5">期間内に課題を均等に消化した場合の理想的な推移です。開始時の総課題数から 0 へ向かう直線で表されます。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-5 h-0.5 mt-2 bg-blue-500 shrink-0" />
                  <div>
                    <p className="font-medium text-gray-700">実績線（青実線）</p>
                    <p className="mt-0.5">実際の残課題数の推移です。Issue を Close すると残数が減少します。理想線より下なら順調、上なら遅延しています。</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="inline-block w-5 h-0.5 mt-2 shrink-0" style={{ borderTop: '2px dashed #ef4444' }} />
                  <div>
                    <p className="font-medium text-gray-700">今日の線（赤破線）</p>
                    <p className="mt-0.5">現在の日付を示す縦線です。この線より左が過去の実績、右が残りの期間です。</p>
                  </div>
                </div>
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-400">
                <p>バーンダウンチャートは GitHub Milestone に紐づく Issue の消化状況を可視化します。</p>
                <p className="mt-1">Milestone の期限日（Due date）がチャートの終了日となり、Issue の Close が「完了」として集計されます。</p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            マイルストーンに紐づく課題がありません
          </div>
        )}
      </div>
    </div>
  )
}

export default BurndownChart
