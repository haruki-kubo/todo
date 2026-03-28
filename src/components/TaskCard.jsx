import { parseDeadline, getDeadlineInfo } from '../utils/deadline'
import { getSubtaskProgress } from '../utils/hierarchy'

function TaskCard({ issue, isDragging, isSelected, excludeLabels }) {
  const deadline = parseDeadline(issue.body)
  const deadlineInfo = getDeadlineInfo(deadline)
  const progress = getSubtaskProgress(issue.body)
  const excludeNames = excludeLabels ? new Set(excludeLabels.map((l) => l.name)) : new Set()
  const colorLabels = issue.labels.filter(
    (l) => l.color && l.color !== 'ededed' && !excludeNames.has(l.name)
  )

  return (
    <div
      data-testid={`board-card-${issue.number}`}
      className={`bg-white rounded-lg shadow-sm border px-3 py-2.5 ${
        isDragging ? 'opacity-50 ring-2 ring-blue-400 border-gray-100'
        : isSelected ? 'border-blue-400 bg-blue-50/50 ring-1 ring-blue-200'
        : 'border-gray-100'
      }`}
    >
      <p className="text-sm font-medium text-gray-800 leading-tight">
        <span className="text-gray-400 text-xs mr-1">#{issue.number}</span>
        {issue.title}
      </p>
      {issue.assignee && (
        <div className="flex items-center gap-1 mt-1.5">
          <img
            src={issue.assignee.avatar_url}
            alt=""
            className="w-4 h-4 rounded-full"
          />
          <span className="text-[10px] text-gray-500">{issue.assignee.login}</span>
        </div>
      )}
      {progress && (
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex-1 bg-gray-200 rounded-full h-1">
            <div
              className="bg-green-500 h-1 rounded-full"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <span className="text-[10px] text-gray-400 shrink-0">{progress.done}/{progress.total}</span>
        </div>
      )}
      {(colorLabels.length > 0 || deadlineInfo) && (
        <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
          {colorLabels.map((label) => (
            <span
              key={label.id}
              className="inline-block text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white"
              style={{ backgroundColor: '#' + label.color }}
            >
              {label.name}
            </span>
          ))}
          {deadlineInfo && (
            <span
              className={`text-[11px] ${
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
        </div>
      )}
    </div>
  )
}

export default TaskCard
