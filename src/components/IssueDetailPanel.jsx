import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchComments, closeIssue, setLabels } from '../api/github'
import { getCategoryLabel, getPriorityLabel, getStatusLabel } from '../utils/labels'
import { parseDeadline, getDeadlineInfo } from '../utils/deadline'
import { parseChildNumbers, getSubtaskProgress } from '../utils/hierarchy'
import CommentForm from './CommentForm'

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''

function IssueDetailPanel({ issue, allIssues, hierarchy, priorityLabels, categoryLabels, statusLabels, onClose, onUpdate, onSelectIssue }) {
  const [comments, setComments] = useState(null)
  const [operating, setOperating] = useState(false)
  const fetchedRef = useRef(null)

  useEffect(() => {
    if (fetchedRef.current === issue.number) return
    fetchedRef.current = issue.number
    setComments(null)
    fetchComments(issue.number)
      .then(setComments)
      .catch(() => setComments([]))
  }, [issue.number])

  const priority = getPriorityLabel(issue, priorityLabels)
  const category = getCategoryLabel(issue, categoryLabels)
  const status = getStatusLabel(issue, statusLabels)
  const deadline = parseDeadline(issue.body)
  const deadlineInfo = getDeadlineInfo(deadline)

  const handleLabelChange = async (newLabelName, labelGroup) => {
    setOperating(true)
    try {
      const currentLabels = issue.labels.map((l) => l.name)
      const withoutGroup = currentLabels.filter(
        (name) => !labelGroup.some((l) => l.name === name)
      )
      await setLabels(issue.number, [...withoutGroup, newLabelName])
      onUpdate()
    } catch (e) {
      alert('ラベル変更に失敗しました: ' + e.message)
    } finally {
      setOperating(false)
    }
  }

  const handleClose = async () => {
    if (!confirm('この課題を完了にしますか？')) return
    setOperating(true)
    try {
      await closeIssue(issue.number)
      onUpdate()
      onClose()
    } catch (e) {
      alert('完了処理に失敗しました: ' + e.message)
    } finally {
      setOperating(false)
    }
  }

  const handleCommentAdded = (newComment) => {
    setComments((prev) => [...(prev || []), newComment])
  }

  return (
    <div
      data-testid="issue-detail-panel"
      className="w-[420px] bg-white border-l border-gray-200 flex flex-col h-full shrink-0"
    >
      {/* ヘッダー */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs text-gray-400 shrink-0">#{issue.number}</span>
          <h3 className="text-sm font-bold text-gray-800 truncate">{issue.title}</h3>
        </div>
        <button
          onClick={onClose}
          aria-label="詳細パネルを閉じる"
          className="text-gray-400 hover:text-gray-600 text-lg px-1 shrink-0"
        >
          ✕
        </button>
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-y-auto">
        {/* 属性 */}
        <div className="px-5 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">担当者</span>
            {issue.assignee ? (
              <div className="flex items-center gap-1.5">
                <img
                  src={issue.assignee.avatar_url}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="text-xs text-gray-700">{issue.assignee.login}</span>
              </div>
            ) : (
              <span className="text-xs text-gray-400">未設定</span>
            )}
          </div>
          {statusLabels.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400 w-16 shrink-0">状態</span>
              {status ? (
                <span
                  className="text-[11px] px-2 py-0.5 rounded text-white"
                  style={{ backgroundColor: status.color }}
                >
                  {status.name}
                </span>
              ) : (
                <span className="text-xs text-gray-400">未設定</span>
              )}
            </div>
          )}
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">優先度</span>
            {priority ? (
              <span className="text-xs flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: priority.color }} />
                {priority.name}
              </span>
            ) : (
              <span className="text-xs text-gray-400">未設定</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">カテゴリ</span>
            {category ? (
              <span
                className="text-[11px] px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: category.color }}
              >
                {category.name}
              </span>
            ) : (
              <span className="text-xs text-gray-400">未設定</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">期限</span>
            {deadlineInfo ? (
              <span
                className={`text-xs ${
                  deadlineInfo.status === 'overdue'
                    ? 'text-red-600 font-bold'
                    : deadlineInfo.status === 'soon'
                      ? 'text-orange-500 font-medium'
                      : 'text-gray-600'
                }`}
              >
                {deadlineInfo.text}
              </span>
            ) : (
              <span className="text-xs text-gray-400">未設定</span>
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">作成日</span>
            <span className="text-xs text-gray-600">
              {new Date(issue.created_at).toLocaleDateString('ja-JP')}
            </span>
          </div>
        </div>

        {/* 親課題 */}
        {hierarchy.parentMap.has(issue.number) && (() => {
          const parentNum = hierarchy.parentMap.get(issue.number)
          const parentIssue = allIssues.find((i) => i.number === parentNum)
          return parentIssue ? (
            <div className="px-5 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-1.5">親課題</h4>
              <button
                onClick={() => onSelectIssue(parentIssue)}
                className={`text-xs hover:underline ${parentIssue.state === 'closed' ? 'text-gray-400 line-through' : 'text-blue-600 hover:text-blue-800'}`}
              >
                #{parentIssue.number} {parentIssue.title}
                {parentIssue.state === 'closed' && ' (Closed)'}
              </button>
            </div>
          ) : null
        })()}

        {/* サブタスク */}
        {(() => {
          const childNumbers = parseChildNumbers(issue.body)
          if (childNumbers.length === 0) return null
          const progress = getSubtaskProgress(issue.body)
          const childIssues = childNumbers.map((num) => ({
            number: num,
            issue: allIssues.find((i) => i.number === num),
            done: issue.body?.match(new RegExp(`^-\\s*\\[x\\]\\s*#${num}`, 'm')) != null,
          }))
          return (
            <div className="px-5 py-3 border-b border-gray-100">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="text-xs font-medium text-gray-500">サブタスク</h4>
                {progress && (
                  <span className="text-[10px] text-gray-400">
                    {progress.done}/{progress.total}
                  </span>
                )}
              </div>
              {progress && (
                <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
                  <div
                    className="bg-green-500 h-1.5 rounded-full transition-all"
                    style={{ width: `${(progress.done / progress.total) * 100}%` }}
                  />
                </div>
              )}
              <div className="space-y-1">
                {childIssues.map((child) => (
                  <div key={child.number} className="flex items-center gap-2">
                    <span className={`text-xs ${child.done ? 'text-green-500' : 'text-gray-300'}`}>
                      {child.done ? '✓' : '○'}
                    </span>
                    {child.issue ? (
                      <button
                        onClick={() => onSelectIssue(child.issue)}
                        className={`text-xs hover:underline truncate ${
                          child.done ? 'text-gray-400 line-through' : 'text-blue-600 hover:text-blue-800'
                        }`}
                      >
                        #{child.number} {child.issue.title}
                      </button>
                    ) : (
                      <span className="text-xs text-gray-400">
                        #{child.number} (Closed または未取得)
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )
        })()}

        {/* 本文 */}
        {issue.body && (
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 mb-2">詳細</h4>
            <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{issue.body}</Markdown>
            </div>
          </div>
        )}

        {/* コメント */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-3">
            コメント {comments ? `(${comments.length}件)` : ''}
          </h4>
          {comments === null ? (
            <p className="text-xs text-gray-400">読み込み中...</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400">コメントなし</p>
          ) : (
            <div className="space-y-3">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-1">
                    {comment.user?.avatar_url && (
                      <img
                        src={comment.user.avatar_url}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                    )}
                    <span className="text-xs text-gray-500">
                      {comment.user?.login || ''}
                    </span>
                    <span className="text-[10px] text-gray-400">
                      {new Date(comment.created_at).toLocaleDateString('ja-JP', {
                        month: 'numeric',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <div className="text-xs text-gray-600 prose prose-sm max-w-none">
                    <Markdown remarkPlugins={[remarkGfm]}>{comment.body}</Markdown>
                  </div>
                </div>
              ))}
            </div>
          )}
          <CommentForm issueNumber={issue.number} onCommentAdded={handleCommentAdded} />
        </div>

        {/* ステータス変更 */}
        {statusLabels.length > 0 && (
          <div className="px-5 py-4 border-b border-gray-100">
            <h4 className="text-xs font-medium text-gray-500 mb-2">状態変更</h4>
            <div className="flex flex-wrap gap-1.5">
              {statusLabels.map((s) => {
                const isCurrent = status?.name === s.name
                return (
                  <button
                    key={s.name}
                    onClick={() => handleLabelChange(s.name, statusLabels)}
                    disabled={isCurrent || operating}
                    className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                      isCurrent
                        ? 'border-blue-300 bg-blue-50 text-blue-600'
                        : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                    } disabled:opacity-50`}
                  >
                    {s.name}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 優先度変更 */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-2">優先度変更</h4>
          <div className="flex flex-wrap gap-1.5">
            {priorityLabels.map((p) => {
              const isCurrent = priority?.name === p.name
              return (
                <button
                  key={p.name}
                  onClick={() => handleLabelChange(p.name, priorityLabels)}
                  disabled={isCurrent || operating}
                  className={`text-[11px] px-2.5 py-1.5 rounded-lg border transition-colors ${
                    isCurrent
                      ? 'border-blue-300 bg-blue-50 text-blue-600'
                      : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
                  } disabled:opacity-50`}
                >
                  {p.name}
                </button>
              )
            })}
          </div>
        </div>

        {/* アクション */}
        <div className="px-5 py-4 flex gap-2">
          <button
            onClick={handleClose}
            disabled={operating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            完了にする
          </button>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${issue.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-2.5 rounded-lg font-medium text-center transition-colors"
          >
            GitHubで開く
          </a>
        </div>
      </div>
    </div>
  )
}

export default IssueDetailPanel
