import { useState, useEffect, useRef } from 'react'
import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { fetchComments, closeIssue, setLabels, setMilestone, setAssignees, updateIssueBody } from '../api/github'
import { getCategoryLabel, getPriorityLabel, getStatusLabel } from '../utils/labels'
import { parseDeadline, parseStartDate, getDeadlineInfo } from '../utils/deadline'
import { parseChildNumbers, getSubtaskProgress, parseRelatedNumbers } from '../utils/hierarchy'
import CommentForm from './CommentForm'
import { useTranslation } from '../i18n'

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''

function IssueDetailPanel({ issue, allIssues, hierarchy, milestones, collaborators, collaboratorsError, priorityLabels, categoryLabels, statusLabels, onClose, onUpdate, onSelectIssue }) {
  const { t, lang } = useTranslation()
  const [comments, setComments] = useState(null)
  const [operating, setOperating] = useState(false)
  const [draftAssignee, setDraftAssignee] = useState('')
  const [draftStatus, setDraftStatus] = useState('')
  const [draftPriority, setDraftPriority] = useState('')
  const [draftCategory, setDraftCategory] = useState('')
  const [draftStartDate, setDraftStartDate] = useState('')
  const [draftDeadline, setDraftDeadline] = useState('')
  const [draftMilestone, setDraftMilestone] = useState('')
  const fetchedRef = useRef(null)

  useEffect(() => {
    if (fetchedRef.current === issue.number) return
    fetchedRef.current = issue.number
    setComments(null)
    fetchComments(issue.number)
      .then(setComments)
      .catch(() => setComments([]))
  }, [issue.number])

  useEffect(() => {
    const formatDate = (date) => (
      date
        ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
        : ''
    )
    setDraftAssignee(issue.assignee?.login || '')
    setDraftStatus(getStatusLabel(issue, statusLabels)?.name || '')
    setDraftPriority(getPriorityLabel(issue, priorityLabels)?.name || '')
    setDraftCategory(getCategoryLabel(issue, categoryLabels)?.name || '')
    setDraftStartDate(formatDate(parseStartDate(issue.body)))
    setDraftDeadline(formatDate(parseDeadline(issue.body)))
    setDraftMilestone(issue.milestone?.number ? String(issue.milestone.number) : '')
  }, [issue, priorityLabels, categoryLabels, statusLabels])

  const issueStartDate = parseStartDate(issue.body)
  const deadline = parseDeadline(issue.body)
  const deadlineInfo = getDeadlineInfo(draftDeadline ? new Date(`${draftDeadline}T00:00:00`) : null)

  const buildBodyWithDates = (body, startDateStr, deadlineStr) => {
    const lines = (body || '')
      .split('\n')
      .filter((line) => !/^📅\s*(開始日|期限)[:：]\s*\d{4}[-/]\d{1,2}[-/]\d{1,2}\s*$/.test(line))

    const dateLines = []
    if (startDateStr) dateLines.push(`📅 開始日: ${startDateStr}`)
    if (deadlineStr) dateLines.push(`📅 期限: ${deadlineStr}`)

    const textBody = lines.join('\n').trim()
    if (dateLines.length === 0) return textBody
    if (!textBody) return dateLines.join('\n')
    return `${dateLines.join('\n')}\n\n${textBody}`
  }

  const hasChanges = (
    draftAssignee !== (issue.assignee?.login || '') ||
    draftStatus !== (getStatusLabel(issue, statusLabels)?.name || '') ||
    draftPriority !== (getPriorityLabel(issue, priorityLabels)?.name || '') ||
    draftCategory !== (getCategoryLabel(issue, categoryLabels)?.name || '') ||
    draftStartDate !== (issueStartDate ? `${issueStartDate.getFullYear()}-${String(issueStartDate.getMonth() + 1).padStart(2, '0')}-${String(issueStartDate.getDate()).padStart(2, '0')}` : '') ||
    draftDeadline !== (deadline ? `${deadline.getFullYear()}-${String(deadline.getMonth() + 1).padStart(2, '0')}-${String(deadline.getDate()).padStart(2, '0')}` : '') ||
    draftMilestone !== (issue.milestone?.number ? String(issue.milestone.number) : '')
  )

  const handleSaveChanges = async () => {
    if (!hasChanges) return

    setOperating(true)
    try {
      const currentLabels = issue.labels.map((label) => label.name)
      const managedLabels = new Set([
        ...statusLabels.map((label) => label.name),
        ...priorityLabels.map((label) => label.name),
        ...categoryLabels.map((label) => label.name),
      ])
      const baseLabels = currentLabels.filter((name) => !managedLabels.has(name))
      const nextLabelNames = [...baseLabels]
      if (draftStatus) nextLabelNames.push(draftStatus)
      if (draftPriority) nextLabelNames.push(draftPriority)
      if (draftCategory) nextLabelNames.push(draftCategory)

      const nextBody = buildBodyWithDates(issue.body || '', draftStartDate, draftDeadline)
      const nextAssignee = draftAssignee || null
      const nextMilestone = draftMilestone ? parseInt(draftMilestone, 10) : null

      let nextIssue = issue
      const currentLabelNames = issue.labels.map((label) => label.name).sort()
      const sortedNextLabelNames = [...nextLabelNames].sort()
      const labelsChanged =
        currentLabelNames.length !== sortedNextLabelNames.length ||
        currentLabelNames.some((name, index) => name !== sortedNextLabelNames[index])

      if (labelsChanged) {
        const updatedLabels = await setLabels(issue.number, nextLabelNames)
        nextIssue = { ...nextIssue, labels: updatedLabels }
      }

      if ((issue.body || '') !== nextBody) {
        nextIssue = await updateIssueBody(issue.number, nextBody)
      }

      if ((issue.assignee?.login || null) !== nextAssignee) {
        nextIssue = await setAssignees(issue.number, nextAssignee ? [nextAssignee] : [])
      }

      if ((issue.milestone?.number || null) !== nextMilestone) {
        nextIssue = await setMilestone(issue.number, nextMilestone)
      }

      onSelectIssue?.(nextIssue)
      await onUpdate({
        issueNumber: issue.number,
        isSynced: (fetchedIssue) => {
          const fetchedLabelNames = fetchedIssue.labels.map((label) => label.name).sort()
          return (
            fetchedLabelNames.length === sortedNextLabelNames.length &&
            fetchedLabelNames.every((name, index) => name === sortedNextLabelNames[index]) &&
            (fetchedIssue.body || '') === nextBody &&
            (fetchedIssue.assignee?.login || null) === nextAssignee &&
            (fetchedIssue.milestone?.number || null) === nextMilestone
          )
        },
      })
    } catch (err) {
      alert(t('error.issueUpdate') + err.message)
    } finally {
      setOperating(false)
    }
  }

  const handleClose = async () => {
    if (!confirm(t('detail.confirmClose'))) return
    setOperating(true)
    try {
      await closeIssue(issue.number)
      await onUpdate()
      onClose()
    } catch (err) {
      alert(t('error.issueClose') + err.message)
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
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.assignee')}</span>
            <select
              value={draftAssignee}
              onChange={(e) => setDraftAssignee(e.target.value)}
              disabled={operating}
              className="text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700"
            >
              <option value="">{t('common.unset')}</option>
              {collaborators.map((c) => (
                <option key={c.login} value={c.login}>{c.login}</option>
              ))}
              {issue.assignee && !collaborators.find((c) => c.login === issue.assignee.login) && (
                <option value={issue.assignee.login}>{issue.assignee.login}</option>
              )}
            </select>
            {collaboratorsError && (
              <span className="text-[10px] text-orange-500" title={collaboratorsError}>!</span>
            )}
          </div>
          {statusLabels.length > 0 && (
            <div className="flex items-start gap-3">
              <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.status')}</span>
              <div className="flex flex-wrap gap-1.5">
                {statusLabels.map((s) => {
                  const isCurrent = draftStatus === s.name
                  return (
                    <button
                      key={s.name}
                      onClick={() => setDraftStatus(s.name)}
                      disabled={operating}
                      className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
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
          <div className="flex items-start gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.priority')}</span>
            <div className="flex flex-wrap gap-1.5">
              {priorityLabels.map((p) => {
                const isCurrent = draftPriority === p.name
                return (
                  <button
                    key={p.name}
                    onClick={() => setDraftPriority(p.name)}
                    disabled={operating}
                    className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors ${
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
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.category')}</span>
            <select
              value={draftCategory}
              onChange={(e) => setDraftCategory(e.target.value)}
              disabled={operating}
              className="text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700"
            >
              <option value="">{t('common.unset')}</option>
              {categoryLabels.map((c) => (
                <option key={c.name} value={c.name}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.startDate')}</span>
            <input
              type="date"
              value={draftStartDate}
              onChange={(e) => setDraftStartDate(e.target.value)}
              disabled={operating}
              className="text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700"
            />
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.deadline')}</span>
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={draftDeadline}
                onChange={(e) => setDraftDeadline(e.target.value)}
                disabled={operating}
                className="text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700"
              />
              {deadlineInfo && (
                <span
                  className={`text-[10px] ${
                    deadlineInfo.status === 'overdue'
                      ? 'text-red-600 font-bold'
                      : deadlineInfo.status === 'soon'
                        ? 'text-orange-500 font-medium'
                        : 'text-gray-500'
                  }`}
                >
                  {deadlineInfo.status === 'overdue' ? '🔥' : deadlineInfo.status === 'soon' ? '⚠️' : ''}
                  {deadlineInfo.text.replace(/^.+?\s/, '')}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.milestone')}</span>
            <select
              value={draftMilestone}
              onChange={(e) => setDraftMilestone(e.target.value)}
              disabled={operating}
              className="text-xs border border-gray-200 rounded px-2 py-0.5 bg-white text-gray-700"
            >
              <option value="">{t('common.unset')}</option>
              {milestones.filter((m) => m.state === 'open').map((m) => (
                <option key={m.number} value={m.number}>{m.title}</option>
              ))}
              {issue.milestone && !milestones.find((m) => m.state === 'open' && m.number === issue.milestone.number) && (
                <option value={issue.milestone.number}>{issue.milestone.title} (${t('detail.closed')})</option>
              )}
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-400 w-16 shrink-0">{t('detail.created')}</span>
            <span className="text-xs text-gray-600">
              {new Date(issue.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')}
            </span>
          </div>
        </div>

        {/* 関連課題 */}
        {(() => {
          const relatedNums = parseRelatedNumbers(issue.body)
          if (relatedNums.length === 0) return null
          return (
            <div className="px-5 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-1.5">{t('detail.relatedIssues')}</h4>
              <div className="space-y-1">
                {relatedNums.map((num) => {
                  const related = allIssues.find((i) => i.number === num)
                  return (
                    <div key={num}>
                      {related ? (
                        <button
                          onClick={() => onSelectIssue(related)}
                          className={`text-xs hover:underline ${related.state === 'closed' ? 'text-gray-400 line-through' : 'text-blue-600 hover:text-blue-800'}`}
                        >
                          #{num} {related.title}
                          {related.state === 'closed' && ` (${t('detail.closed')})`}
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400">#{num}</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })()}

        {/* 親課題 */}
        {hierarchy.parentMap.has(issue.number) && (() => {
          const parentNum = hierarchy.parentMap.get(issue.number)
          const parentIssue = allIssues.find((i) => i.number === parentNum)
          return parentIssue ? (
            <div className="px-5 py-3 border-b border-gray-100">
              <h4 className="text-xs font-medium text-gray-500 mb-1.5">{t('detail.parentIssue')}</h4>
              <button
                onClick={() => onSelectIssue(parentIssue)}
                className={`text-xs hover:underline ${parentIssue.state === 'closed' ? 'text-gray-400 line-through' : 'text-blue-600 hover:text-blue-800'}`}
              >
                #{parentIssue.number} {parentIssue.title}
                {parentIssue.state === 'closed' && ` (${t('detail.closed')})`}
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
                <h4 className="text-xs font-medium text-gray-500">{t('detail.subtasks')}</h4>
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
                        #{child.number} ({t('detail.closedOrNotFound')})
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
            <h4 className="text-xs font-medium text-gray-500 mb-2">{t('detail.body')}</h4>
            <div className="text-sm text-gray-700 leading-relaxed prose prose-sm max-w-none">
              <Markdown remarkPlugins={[remarkGfm]}>{issue.body}</Markdown>
            </div>
          </div>
        )}

        {/* コメント */}
        <div className="px-5 py-4 border-b border-gray-100">
          <h4 className="text-xs font-medium text-gray-500 mb-3">
            {t('detail.comments')} {comments ? `(${comments.length}${t('common.items')})` : ''}
          </h4>
          {comments === null ? (
            <p className="text-xs text-gray-400">{t('common.loading')}</p>
          ) : comments.length === 0 ? (
            <p className="text-xs text-gray-400">{t('detail.noComments')}</p>
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
                      {new Date(comment.created_at).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP', {
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

        {/* アクション */}
        <div className="px-5 py-4 flex gap-2">
          <button
            onClick={handleSaveChanges}
            disabled={operating || !hasChanges}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {t('detail.update')}
          </button>
          <button
            onClick={handleClose}
            disabled={operating}
            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2.5 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {t('detail.complete')}
          </button>
          <a
            href={`https://github.com/${REPO_OWNER}/${REPO_NAME}/issues/${issue.number}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs py-2.5 rounded-lg font-medium text-center transition-colors"
          >
            {t('detail.openOnGithub')}
          </a>
        </div>
      </div>
    </div>
  )
}

export default IssueDetailPanel
