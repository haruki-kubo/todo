import { useState, useEffect, useCallback } from 'react'
import { fetchIssueEvents } from '../api/github'
import { useTranslation } from '../i18n'

function ActivityFeed({ onSelectIssue, allIssues }) {
  const { t, lang } = useTranslation()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const EVENT_LABELS = {
    closed: { text: t('activity.closed'), color: 'bg-green-100 text-green-700' },
    reopened: { text: t('activity.reopened'), color: 'bg-blue-100 text-blue-700' },
    labeled: { text: t('activity.labeled'), color: 'bg-purple-100 text-purple-700' },
    unlabeled: { text: t('activity.unlabeled'), color: 'bg-gray-100 text-gray-600' },
    assigned: { text: t('activity.assigned'), color: 'bg-yellow-100 text-yellow-700' },
    unassigned: { text: t('activity.unassigned'), color: 'bg-gray-100 text-gray-600' },
    milestoned: { text: t('activity.milestoned'), color: 'bg-indigo-100 text-indigo-700' },
    demilestoned: { text: t('activity.demilestoned'), color: 'bg-gray-100 text-gray-600' },
    renamed: { text: t('activity.renamed'), color: 'bg-orange-100 text-orange-700' },
  }

  const loadEvents = useCallback(async () => {
    try {
      const data = await fetchIssueEvents()
      setEvents(data)
    } catch {
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadEvents()
  }, [loadEvents])

  if (loading) {
    return <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>
  }

  const issueByNumber = new Map(allIssues.map((i) => [i.number, i]))

  // 日付ごとにグルーピング
  const grouped = new Map()
  for (const event of events) {
    if (!EVENT_LABELS[event.event]) continue
    const date = new Date(event.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')
    if (!grouped.has(date)) grouped.set(date, [])
    grouped.get(date).push(event)
  }

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-2xl mx-auto">
        {grouped.size === 0 ? (
          <p className="text-center py-16 text-gray-400">{t('activity.noEvents')}</p>
        ) : (
          Array.from(grouped.entries()).map(([date, dayEvents]) => (
            <div key={date} className="mb-6">
              <h3 className="text-xs font-bold text-gray-500 mb-2 sticky top-0 bg-gray-50 py-1">{date}</h3>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {dayEvents.map((event) => {
                  const label = EVENT_LABELS[event.event]
                  const issueNumber = event.issue?.number
                  const issue = issueNumber ? issueByNumber.get(issueNumber) : null
                  const time = new Date(event.created_at).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })

                  return (
                    <div key={event.id} className="px-4 py-3 flex items-start gap-3">
                      <span className={`text-[10px] px-2 py-0.5 rounded shrink-0 mt-0.5 ${label.color}`}>
                        {label.text}
                      </span>
                      <div className="flex-1 min-w-0">
                        {issueNumber && (
                          <button
                            onClick={() => issue && onSelectIssue?.(issue)}
                            className="text-xs text-blue-600 hover:text-blue-800 hover:underline truncate block"
                          >
                            #{issueNumber} {event.issue?.title}
                          </button>
                        )}
                        <div className="flex items-center gap-2 mt-0.5">
                          {event.actor?.avatar_url && (
                            <img src={event.actor.avatar_url} alt="" className="w-4 h-4 rounded-full" />
                          )}
                          <span className="text-[10px] text-gray-400">
                            {event.actor?.login} - {time}
                          </span>
                          {event.event === 'labeled' && event.label && (
                            <span
                              className="text-[10px] px-1.5 py-0.5 rounded text-white"
                              style={{ backgroundColor: '#' + event.label.color }}
                            >
                              {event.label.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
        {grouped.size > 0 && (
          <p className="text-xs text-gray-400 text-center mt-4 pb-4">
            {t('activity.recentOnly')}
          </p>
        )}
      </div>
    </div>
  )
}

export default ActivityFeed
