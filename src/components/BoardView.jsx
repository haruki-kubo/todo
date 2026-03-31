import { useState, useRef, useMemo, useCallback } from 'react'
import { getPriorityKey, getStatusKey } from '../utils/labels'
import { setLabels } from '../api/github'
import TaskCard from './TaskCard'
import { useTranslation } from '../i18n'

const UNSET_COLUMN_KEY = '__unset__'
const UNSET_COLUMN_COLOR = '#9ca3af'

const STORAGE_KEY_STATUS = 'issueboard_status_order'
const STORAGE_KEY_PRIORITY = 'issueboard_priority_order'

function loadSavedOrder(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function saveLabelOrder(storageKey, labels) {
  localStorage.setItem(storageKey, JSON.stringify(labels.map((l) => l.key)))
}

function applyCustomOrder(labels, savedOrder) {
  if (!savedOrder || savedOrder.length === 0) return labels
  const orderMap = new Map(savedOrder.map((key, idx) => [key, idx]))
  return [...labels].sort((a, b) => {
    const aIdx = orderMap.has(a.key) ? orderMap.get(a.key) : Infinity
    const bIdx = orderMap.has(b.key) ? orderMap.get(b.key) : Infinity
    return aIdx - bIdx
  })
}

function BoardView({ issues, priorityLabels, statusLabels, onUpdate, onSelectIssue, selectedIssueId }) {
  const { t } = useTranslation()
  const UNSET_COLUMN = { key: UNSET_COLUMN_KEY, name: t('common.unset'), color: UNSET_COLUMN_COLOR }

  const [groupBy, setGroupBy] = useState('status')
  const [filterAssignee, setFilterAssignee] = useState('all')
  const [draggingIssue, setDraggingIssue] = useState(null)
  const [dragOverColumn, setDragOverColumn] = useState(null)
  const [updating, setUpdating] = useState(false)
  const dragCounterRef = useRef({})

  // 列並び替え用の状態
  const [draggingColumnKey, setDraggingColumnKey] = useState(null)
  const [dragOverHeaderKey, setDragOverHeaderKey] = useState(null)
  const [statusOrder, setStatusOrder] = useState(() => loadSavedOrder(STORAGE_KEY_STATUS))
  const [priorityOrder, setPriorityOrder] = useState(() => loadSavedOrder(STORAGE_KEY_PRIORITY))

  const assignees = useMemo(() => {
    const map = new Map()
    for (const issue of issues) {
      if (issue.assignee && !map.has(issue.assignee.login)) {
        map.set(issue.assignee.login, issue.assignee)
      }
    }
    return Array.from(map.values())
  }, [issues])

  const filteredIssues = useMemo(() => {
    if (filterAssignee === 'all') return issues
    if (filterAssignee === '__unassigned__') return issues.filter((i) => !i.assignee)
    return issues.filter((i) => i.assignee?.login === filterAssignee)
  }, [issues, filterAssignee])

  const effectiveGroupBy = statusLabels.length === 0 ? 'priority' : groupBy

  // カスタム順序を適用したラベル
  const orderedLabels = useMemo(() => {
    const base = effectiveGroupBy === 'status' ? statusLabels : priorityLabels
    const saved = effectiveGroupBy === 'status' ? statusOrder : priorityOrder
    return applyCustomOrder(base, saved)
  }, [effectiveGroupBy, statusLabels, priorityLabels, statusOrder, priorityOrder])

  const activeLabels = orderedLabels
  const getKey = effectiveGroupBy === 'status'
    ? (issue) => getStatusKey(issue, statusLabels)
    : (issue) => getPriorityKey(issue, priorityLabels)

  const labelColumns = activeLabels.map((label) => ({
    ...label,
    issues: filteredIssues.filter((issue) => getKey(issue) === label.key),
  }))
  const unsetIssues = filteredIssues.filter((issue) => getKey(issue) === null)
  const columns = [
    ...(unsetIssues.length > 0 ? [{ ...UNSET_COLUMN, issues: unsetIssues }] : []),
    ...labelColumns,
  ]

  // --- カード D&D ---
  const handleDragStart = (e, issue) => {
    setDraggingIssue(issue)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(issue.id))
  }

  const handleDragEnd = () => {
    setDraggingIssue(null)
    setDragOverColumn(null)
    dragCounterRef.current = {}
  }

  const handleDragEnter = (e, columnKey) => {
    e.preventDefault()
    dragCounterRef.current[columnKey] = (dragCounterRef.current[columnKey] || 0) + 1
    setDragOverColumn(columnKey)
  }

  const handleDragLeave = (e, columnKey) => {
    e.preventDefault()
    dragCounterRef.current[columnKey] = (dragCounterRef.current[columnKey] || 0) - 1
    if (dragCounterRef.current[columnKey] <= 0) {
      dragCounterRef.current[columnKey] = 0
      if (dragOverColumn === columnKey) {
        setDragOverColumn(null)
      }
    }
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e, targetColumn) => {
    e.preventDefault()
    setDragOverColumn(null)
    dragCounterRef.current = {}

    if (!draggingIssue || updating) return
    if (targetColumn.key === UNSET_COLUMN_KEY) {
      setDraggingIssue(null)
      return
    }

    const currentKey = getKey(draggingIssue)
    if (currentKey === targetColumn.key) {
      setDraggingIssue(null)
      return
    }

    setUpdating(true)
    try {
      const currentLabels = draggingIssue.labels.map((l) => l.name)
      const withoutGroup = currentLabels.filter(
        (name) => !activeLabels.some((l) => l.name === name)
      )
      await setLabels(draggingIssue.number, [...withoutGroup, targetColumn.name])
      onUpdate()
    } catch (err) {
      alert(t('error.labelChange') + err.message)
    } finally {
      setUpdating(false)
      setDraggingIssue(null)
    }
  }

  // --- 列ヘッダー D&D ---
  const handleHeaderDragStart = useCallback((e, columnKey) => {
    if (columnKey === UNSET_COLUMN_KEY) return
    setDraggingColumnKey(columnKey)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', columnKey)
  }, [])

  const handleHeaderDragEnd = useCallback(() => {
    setDraggingColumnKey(null)
    setDragOverHeaderKey(null)
  }, [])

  const handleHeaderDragOver = useCallback((e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleHeaderDragEnter = useCallback((e, columnKey) => {
    e.preventDefault()
    if (columnKey !== UNSET_COLUMN_KEY) {
      setDragOverHeaderKey(columnKey)
    }
  }, [])

  const handleHeaderDrop = useCallback((e, targetKey) => {
    e.preventDefault()
    setDragOverHeaderKey(null)

    if (!draggingColumnKey || targetKey === UNSET_COLUMN_KEY || draggingColumnKey === targetKey) {
      setDraggingColumnKey(null)
      return
    }

    // 現在のラベル順序を取得し、並び替え
    const currentOrder = activeLabels.map((l) => l.key)
    const fromIdx = currentOrder.indexOf(draggingColumnKey)
    const toIdx = currentOrder.indexOf(targetKey)
    if (fromIdx === -1 || toIdx === -1) {
      setDraggingColumnKey(null)
      return
    }

    const newOrder = [...currentOrder]
    newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, draggingColumnKey)

    if (effectiveGroupBy === 'status') {
      setStatusOrder(newOrder)
      saveLabelOrder(STORAGE_KEY_STATUS, newOrder.map((k) => ({ key: k })))
    } else {
      setPriorityOrder(newOrder)
      saveLabelOrder(STORAGE_KEY_PRIORITY, newOrder.map((k) => ({ key: k })))
    }

    setDraggingColumnKey(null)
  }, [draggingColumnKey, activeLabels, effectiveGroupBy])

  return (
    <div className="flex flex-col flex-1 min-h-0">
      <div className="flex items-center gap-4 px-4 py-2 bg-white border-b border-gray-200 flex-wrap">
        {statusLabels.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500">{t('board.viewLabel')}</span>
            <button
              onClick={() => setGroupBy('status')}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                effectiveGroupBy === 'status'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('board.statusView')}
            </button>
            <button
              onClick={() => setGroupBy('priority')}
              className={`text-xs px-3 py-1 rounded-lg transition-colors ${
                effectiveGroupBy === 'priority'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {t('board.priorityView')}
            </button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">{t('board.assigneeLabel')}</span>
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white text-gray-700"
          >
            <option value="all">{t('board.assigneeAll')}</option>
            <option value="__unassigned__">{t('common.unset')}</option>
            {assignees.map((a) => (
              <option key={a.login} value={a.login}>{a.login}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex gap-4 px-4 py-4 overflow-x-auto flex-1">
        {columns.map((column) => {
          const isUnset = column.key === UNSET_COLUMN_KEY
          const isCardOver = dragOverColumn === column.key && draggingIssue && !isUnset && getKey(draggingIssue) !== column.key
          const isHeaderOver = dragOverHeaderKey === column.key && draggingColumnKey && !isUnset
          return (
            <div
              key={column.key}
              data-testid={`board-column-${column.key}`}
              className={`flex-shrink-0 w-80 bg-gray-50 border rounded-xl flex flex-col transition-colors ${
                isCardOver
                  ? 'border-blue-400 bg-blue-50/50 ring-2 ring-blue-200'
                  : 'border-gray-200'
              }`}
              onDragEnter={(e) => {
                if (draggingIssue) handleDragEnter(e, column.key)
                if (draggingColumnKey) handleHeaderDragEnter(e, column.key)
              }}
              onDragLeave={(e) => {
                if (draggingIssue) handleDragLeave(e, column.key)
              }}
              onDragOver={(e) => {
                if (draggingIssue) handleDragOver(e)
                if (draggingColumnKey) handleHeaderDragOver(e)
              }}
              onDrop={(e) => {
                if (draggingIssue) handleDrop(e, column)
                if (draggingColumnKey) handleHeaderDrop(e, column.key)
              }}
            >
              <div
                draggable={!isUnset}
                onDragStart={(e) => handleHeaderDragStart(e, column.key)}
                onDragEnd={handleHeaderDragEnd}
                className={`text-white px-4 py-2.5 rounded-t-xl flex items-center justify-between transition-all ${
                  isUnset ? '' : 'cursor-grab active:cursor-grabbing'
                } ${isHeaderOver ? 'ring-2 ring-white/50 scale-[1.02]' : ''} ${
                  draggingColumnKey === column.key ? 'opacity-50' : ''
                }`}
                style={{ backgroundColor: column.color }}
              >
                <div className="flex items-center gap-1.5">
                  {!isUnset && (
                    <span className="text-white/50 text-xs" title="ドラッグで並び替え">⠿</span>
                  )}
                  <span className="font-medium text-sm">{column.name}</span>
                </div>
                <span className="bg-white/20 text-xs px-2 py-0.5 rounded-full">
                  {column.issues.length}
                </span>
              </div>
              <div className="flex-1 p-3 space-y-2 overflow-y-auto min-h-[100px]">
                {column.issues.length === 0 ? (
                  <p className="text-center text-gray-400 text-xs py-8">
                    {isCardOver ? t('board.dropHere') : t('board.noTasks')}
                  </p>
                ) : (
                  column.issues.map((issue) => (
                    <div
                      key={issue.id}
                      draggable={!isUnset}
                      onDragStart={(e) => handleDragStart(e, issue)}
                      onDragEnd={handleDragEnd}
                      onClick={() => onSelectIssue?.(issue)}
                      className={isUnset ? 'cursor-pointer' : 'cursor-grab active:cursor-grabbing'}
                    >
                      <TaskCard
                        issue={issue}
                        isDragging={draggingIssue?.id === issue.id}
                        isSelected={selectedIssueId === issue.id}
                        excludeLabels={activeLabels}
                      />
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        })}
      </div>

      {updating && (
        <div className="fixed bottom-4 right-4 bg-blue-600 text-white text-sm px-4 py-2 rounded-lg shadow-lg">
          {t('board.updating')}
        </div>
      )}
    </div>
  )
}

export default BoardView
