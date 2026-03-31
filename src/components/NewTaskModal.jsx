import { useState } from 'react'
import { createIssue, updateIssueBody, setMilestone } from '../api/github'
import { insertDeadlineToBody, insertStartDateToBody } from '../utils/deadline'
import { appendChildToBody } from '../utils/hierarchy'
import { useTranslation } from '../i18n'

function NewTaskModal({ allIssues, hierarchy, milestones, priorityLabels, categoryLabels, statusLabels, onClose, onCreated }) {
  const { t } = useTranslation()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [startDate, setStartDate] = useState('')
  const [deadline, setDeadline] = useState('')
  const [parentNumber, setParentNumber] = useState('')
  const [milestoneNumber, setMilestoneNumber] = useState('')
  const [creating, setCreating] = useState(false)

  // 親課題の候補（他の Issue の子でないもの）
  const parentCandidates = allIssues.filter((i) => !hierarchy.parentMap.has(i.number))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim()) return

    setCreating(true)
    try {
      const labels = []
      if (priority) labels.push(priority)
      if (category) labels.push(category)
      if (status) labels.push(status)

      let issueBody = insertDeadlineToBody(body, deadline)
      issueBody = insertStartDateToBody(issueBody, startDate)
      const created = await createIssue(title.trim(), issueBody, labels)

      // マイルストーンが選択されている場合、設定
      if (milestoneNumber && created?.number) {
        try {
          await setMilestone(created.number, parseInt(milestoneNumber, 10))
        } catch (msErr) {
          alert(t('error.milestoneChange') + msErr.message)
        }
      }

      // 親課題が選択されている場合、親の本文にタスクリストを追記
      if (parentNumber && created?.number) {
        const parentIssue = allIssues.find((i) => i.number === parseInt(parentNumber, 10))
        if (parentIssue) {
          try {
            const newBody = appendChildToBody(parentIssue.body, created.number)
            await updateIssueBody(parentIssue.number, newBody)
          } catch (linkErr) {
            // 子 Issue は作成済みなので一覧は再取得し、紐付け失敗のみ通知
            alert(t('error.parentLink') + linkErr.message)
            onCreated()
            return
          }
        }
      }

      onCreated()
    } catch (e) {
      alert(t('error.createIssue') + e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold">{t('newTask.title')}</h2>
          <button
            onClick={onClose}
            aria-label="課題追加モーダルを閉じる"
            className="text-gray-400 text-xl px-2 hover:text-gray-600"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-4 py-4 space-y-4">
          {/* 親課題 */}
          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {t('newTask.parentIssue')}
            </label>
            <select
              aria-label={t('newTask.parentIssue')}
              value={parentNumber}
              onChange={(e) => setParentNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
            >
              <option value="">{t('newTask.parentNone')}</option>
              {parentCandidates.map((i) => (
                <option key={i.number} value={i.number}>
                  #{i.number} {i.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {t('newTask.subject')} <span className="text-red-400">*</span>
            </label>
            <input
              aria-label={t('newTask.subject')}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('newTask.subjectPlaceholder')}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              {t('newTask.bodyLabel')}
            </label>
            <textarea
              aria-label={t('newTask.bodyLabel')}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder={t('newTask.bodyPlaceholder')}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {statusLabels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                {t('newTask.statusLabel')}
              </label>
              <div className="flex flex-wrap gap-2">
                {statusLabels.map((s) => (
                  <button
                    type="button"
                    key={s.name}
                    onClick={() => setStatus(status === s.name ? '' : s.name)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                      status === s.name
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: s.color }}
                    />
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {priorityLabels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                {t('newTask.priorityLabel')}
              </label>
              <div className="flex flex-wrap gap-2">
                {priorityLabels.map((p) => (
                  <button
                    type="button"
                    key={p.name}
                    onClick={() => setPriority(priority === p.name ? '' : p.name)}
                    className={`text-xs px-3 py-2 rounded-lg border transition-colors flex items-center gap-1.5 ${
                      priority === p.name
                        ? 'border-blue-400 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: p.color }}
                    />
                    {p.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {categoryLabels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t('newTask.categoryLabel')}
              </label>
              <select
                aria-label={t('newTask.categoryLabel')}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
              >
                <option value="">{t('common.none')}</option>
                {categoryLabels.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* マイルストーン */}
          {milestones && milestones.filter((m) => m.state === 'open').length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t('newTask.milestoneLabel')}
              </label>
              <select
                aria-label={t('newTask.milestoneLabel')}
                value={milestoneNumber}
                onChange={(e) => setMilestoneNumber(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
              >
                <option value="">{t('common.none')}</option>
                {milestones.filter((m) => m.state === 'open').map((m) => (
                  <option key={m.number} value={m.number}>{m.title}</option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t('newTask.startDateLabel')}
              </label>
              <input
                aria-label={t('newTask.startDateLabel')}
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-1">
                {t('newTask.deadlineLabel')}
              </label>
              <input
                aria-label={t('newTask.deadlineLabel')}
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-3 rounded-lg font-medium transition-colors"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {creating ? t('common.creating') : t('newTask.submit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewTaskModal
