import { useState, useMemo } from 'react'
import { parseDeadline } from '../utils/deadline'

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土']

function dateKey(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function CalendarView({ issues, onSelectIssue, selectedIssueId }) {
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date()
    return { year: d.getFullYear(), month: d.getMonth() }
  })

  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  // 月の日付グリッドを生成
  const calendarDays = useMemo(() => {
    const { year, month } = currentDate
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startPad = firstDay.getDay()

    const days = []
    // 前月の日付で埋める
    for (let i = startPad - 1; i >= 0; i--) {
      const d = new Date(year, month, -i)
      days.push({ date: d, isCurrentMonth: false })
    }
    // 当月
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }
    // 次月で 6 週分まで埋める
    while (days.length < 42) {
      const d = new Date(year, month + 1, days.length - startPad - lastDay.getDate() + 1)
      days.push({ date: d, isCurrentMonth: false })
    }
    return days
  }, [currentDate])

  // 期限日ごとに Issue をマッピング
  const issuesByDate = useMemo(() => {
    const map = new Map()
    for (const issue of issues) {
      const deadline = parseDeadline(issue.body)
      if (!deadline) continue
      const key = dateKey(deadline)
      if (!map.has(key)) map.set(key, [])
      map.get(key).push(issue)
    }
    return map
  }, [issues])

  const prevMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev.year, prev.month - 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const nextMonth = () => {
    setCurrentDate((prev) => {
      const d = new Date(prev.year, prev.month + 1)
      return { year: d.getFullYear(), month: d.getMonth() }
    })
  }

  const goToday = () => {
    setCurrentDate({ year: today.getFullYear(), month: today.getMonth() })
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* ツールバー */}
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200">
        <button onClick={prevMonth} className="text-sm text-gray-500 hover:text-gray-700 px-2">&lt;</button>
        <h3 className="text-sm font-bold text-gray-700 w-32 text-center">
          {currentDate.year}年 {currentDate.month + 1}月
        </h3>
        <button onClick={nextMonth} className="text-sm text-gray-500 hover:text-gray-700 px-2">&gt;</button>
        <button
          onClick={goToday}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 px-3 py-1 rounded-lg transition-colors"
        >
          今日
        </button>
      </div>

      {/* カレンダーグリッド */}
      <div className="flex-1 overflow-auto p-4">
        <div className="grid grid-cols-7 border border-gray-200 rounded-xl overflow-hidden bg-white">
          {/* 曜日ヘッダー */}
          {WEEKDAYS.map((day, i) => (
            <div
              key={day}
              className={`text-center text-xs font-medium py-2 border-b border-gray-200 ${
                i === 0 ? 'text-red-400 bg-red-50/50' : i === 6 ? 'text-blue-400 bg-blue-50/50' : 'text-gray-500 bg-gray-50'
              }`}
            >
              {day}
            </div>
          ))}

          {/* 日付セル */}
          {calendarDays.map((day, i) => {
            const dk = dateKey(day.date)
            const dayIssues = issuesByDate.get(dk) || []
            const isToday = day.date.getTime() === today.getTime()
            const dayOfWeek = day.date.getDay()
            const isPast = day.date < today && day.isCurrentMonth

            return (
              <div
                key={i}
                className={`min-h-[100px] border-b border-r border-gray-100 p-1 ${
                  !day.isCurrentMonth ? 'bg-gray-50/50' : ''
                } ${dayOfWeek === 0 ? 'bg-red-50/30' : dayOfWeek === 6 ? 'bg-blue-50/30' : ''}`}
              >
                <div className={`text-right text-xs mb-1 px-1 ${
                  isToday
                    ? 'text-white bg-blue-600 rounded-full w-6 h-6 flex items-center justify-center ml-auto'
                    : !day.isCurrentMonth
                      ? 'text-gray-300'
                      : dayOfWeek === 0
                        ? 'text-red-400'
                        : dayOfWeek === 6
                          ? 'text-blue-400'
                          : 'text-gray-600'
                }`}>
                  {day.date.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayIssues.slice(0, 3).map((issue) => {
                    const isSelected = selectedIssueId === issue.id
                    return (
                      <button
                        key={issue.id}
                        onClick={() => onSelectIssue?.(issue)}
                        className={`w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate transition-colors ${
                          isSelected
                            ? 'bg-blue-100 text-blue-700'
                            : isPast
                              ? 'bg-red-50 text-red-600 hover:bg-red-100'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        #{issue.number} {issue.title}
                      </button>
                    )
                  })}
                  {dayIssues.length > 3 && (
                    <p className="text-[10px] text-gray-400 px-1">+{dayIssues.length - 3}件</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default CalendarView
