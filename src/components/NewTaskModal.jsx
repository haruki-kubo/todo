import { useState } from 'react'
import { createIssue, updateIssueBody } from '../api/github'
import { insertDeadlineToBody } from '../utils/deadline'
import { appendChildToBody } from '../utils/hierarchy'

function NewTaskModal({ allIssues, hierarchy, priorityLabels, categoryLabels, statusLabels, onClose, onCreated }) {
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [priority, setPriority] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('')
  const [deadline, setDeadline] = useState('')
  const [parentNumber, setParentNumber] = useState('')
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

      const issueBody = insertDeadlineToBody(body, deadline)
      const created = await createIssue(title.trim(), issueBody, labels)

      // 親課題が選択されている場合、親の本文にタスクリストを追記
      if (parentNumber && created?.number) {
        const parentIssue = allIssues.find((i) => i.number === parseInt(parentNumber, 10))
        if (parentIssue) {
          try {
            const newBody = appendChildToBody(parentIssue.body, created.number)
            await updateIssueBody(parentIssue.number, newBody)
          } catch (linkErr) {
            // 子 Issue は作成済みなので一覧は再取得し、紐付け失敗のみ通知
            alert(`課題 #${created.number} は作成されましたが、親課題への紐付けに失敗しました。親課題の本文にサブタスクを手動で追加してください。\n\nエラー: ${linkErr.message}`)
            onCreated()
            return
          }
        }
      }

      onCreated()
    } catch (e) {
      alert('課題作成に失敗しました: ' + e.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center">
      <div className="bg-white w-full max-w-lg rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-bold">課題の追加</h2>
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
              親課題
            </label>
            <select
              aria-label="親課題"
              value={parentNumber}
              onChange={(e) => setParentNumber(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
            >
              <option value="">なし（独立した課題）</option>
              {parentCandidates.map((i) => (
                <option key={i.number} value={i.number}>
                  #{i.number} {i.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              件名 <span className="text-red-400">*</span>
            </label>
            <input
              aria-label="件名"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="課題の件名"
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
              autoFocus
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              詳細
            </label>
            <textarea
              aria-label="詳細"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="詳細やメモ"
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {statusLabels.length > 0 && (
            <div>
              <label className="text-xs font-medium text-gray-600 block mb-2">
                状態
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
                優先度
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
                カテゴリ
              </label>
              <select
                aria-label="カテゴリ"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
              >
                <option value="">なし</option>
                {categoryLabels.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-gray-600 block mb-1">
              期限
            </label>
            <input
              aria-label="期限"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white text-gray-700"
            />
          </div>

          <div className="flex gap-2 pt-2 pb-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm py-3 rounded-lg font-medium transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm py-3 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              {creating ? '作成中...' : '追加する'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewTaskModal
