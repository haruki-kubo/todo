import { useState, useEffect, useCallback } from 'react'
import {
  fetchLabels, createLabel, updateLabel, deleteLabel,
  fetchMilestones, createMilestone, updateMilestone, deleteMilestone,
} from '../api/github'
import { classifyLabels } from '../utils/labels'

const TABS = [
  { key: 'status', name: 'ステータス', keyword: 'status', hasOrder: true },
  { key: 'priority', name: '優先度', keyword: 'priority', hasOrder: true },
  { key: 'category', name: 'カテゴリ', keyword: 'category', hasOrder: false },
  { key: 'milestone', name: 'マイルストーン', keyword: null, hasOrder: false },
]

function LabelForm({ initial, keyword, hasOrder, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || '')
  const [color, setColor] = useState(initial?.color ? '#' + initial.color : '#9ca3af')
  const [order, setOrder] = useState(() => {
    if (hasOrder && initial?.description) {
      const match = initial.description.match(new RegExp(`${keyword}\\s*[:：]\\s*(\\d+)`, 'i'))
      if (match) return match[1]
    }
    return ''
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) return
    const desc = hasOrder && order ? `${keyword}:${order}` : keyword
    onSave(name.trim(), color, desc)
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 py-2">
      <input
        type="color"
        value={color}
        onChange={(e) => setColor(e.target.value)}
        className="w-8 h-8 rounded border border-gray-200 cursor-pointer"
      />
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="ラベル名"
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      {hasOrder && (
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder="順序"
          min="1"
          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      )}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        {saving ? '保存中...' : initial ? '更新' : '作成'}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          キャンセル
        </button>
      )}
    </form>
  )
}

function MilestoneForm({ initial, onSave, onCancel, saving }) {
  const [title, setTitle] = useState(initial?.title || '')
  const [description, setDescription] = useState(initial?.description || '')
  const [dueOn, setDueOn] = useState(initial?.due_on ? initial.due_on.split('T')[0] : '')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!title.trim()) return
    onSave(title.trim(), description, dueOn || null)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-2 py-2">
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="マイルストーン名"
        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <div className="flex gap-2">
        <input
          type="date"
          value={dueOn}
          onChange={(e) => setDueOn(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="説明（任意。開始日: YYYY-MM-DD で開始日指定可）"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? '保存中...' : initial ? '更新' : '作成'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            キャンセル
          </button>
        )}
      </div>
    </form>
  )
}

function SettingsView({ onDataChanged }) {
  const [activeTab, setActiveTab] = useState('status')
  const [labels, setLabels] = useState([])
  const [milestones, setMilestones] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [showNewForm, setShowNewForm] = useState(false)

  const loadData = useCallback(async () => {
    try {
      const [labelsData, milestonesData] = await Promise.all([
        fetchLabels(),
        fetchMilestones(),
      ])
      setLabels(labelsData)
      setMilestones(milestonesData)
    } catch {
      // エラーは無視
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const currentTab = TABS.find((t) => t.key === activeTab)

  // ラベルを分類して表示用に取得
  const classified = classifyLabels(labels)
  const getLabelsForTab = () => {
    switch (activeTab) {
      case 'status': return classified.statusLabels
      case 'priority': return classified.priorityLabels
      case 'category': return classified.categoryLabels
      default: return []
    }
  }

  // 分類済みラベルに対応する元の GitHub ラベルを取得
  const getOriginalLabel = (classifiedLabel) => {
    return labels.find((l) => l.name === classifiedLabel.name)
  }

  const handleSaveLabel = async (name, color, description) => {
    setSaving(true)
    try {
      if (editingItem) {
        await updateLabel(editingItem.name, name, color, description)
      } else {
        await createLabel(name, color, description)
      }
      await loadData()
      await onDataChanged?.()
      setEditingItem(null)
      setShowNewForm(false)
    } catch (e) {
      alert('保存に失敗しました: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLabel = async (name) => {
    if (!confirm(`「${name}」を削除しますか？このラベルが付与された Issue からも除去されます。`)) return
    setSaving(true)
    try {
      await deleteLabel(name)
      await loadData()
      await onDataChanged?.()
    } catch (e) {
      alert('削除に失敗しました: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveMilestone = async (title, description, dueOn) => {
    setSaving(true)
    try {
      let milestoneNumber = editingItem?.number ?? null
      if (editingItem) {
        await updateMilestone(editingItem.number, title, description, dueOn, editingItem.state)
      } else {
        const created = await createMilestone(title, description, dueOn)
        milestoneNumber = created?.number ?? null
      }
      await loadData()
      await onDataChanged?.(
        milestoneNumber
          ? {
              milestoneNumber,
              isMilestoneSynced: (milestone) => (
                milestone.title === title &&
                (milestone.description || '') === (description || '') &&
                (milestone.due_on ? milestone.due_on.split('T')[0] : null) === (dueOn || null)
              ),
            }
          : null
      )
      setEditingItem(null)
      setShowNewForm(false)
    } catch (e) {
      alert('保存に失敗しました: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMilestone = async (number, title) => {
    if (!confirm(`「${title}」を削除しますか？紐づく Issue のマイルストーンが解除されます。`)) return
    setSaving(true)
    try {
      await deleteMilestone(number)
      await loadData()
      await onDataChanged?.()
    } catch (e) {
      alert('削除に失敗しました: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleCloseMilestone = async (milestone) => {
    setSaving(true)
    try {
      const newState = milestone.state === 'open' ? 'closed' : 'open'
      await updateMilestone(milestone.number, milestone.title, milestone.description, milestone.due_on?.split('T')[0], newState)
      await loadData()
      await onDataChanged?.()
    } catch (e) {
      alert('更新に失敗しました: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">読み込み中...</div>
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* タブ */}
      <div className="flex bg-white border-b border-gray-200">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setActiveTab(tab.key); setEditingItem(null); setShowNewForm(false) }}
            className={`px-5 py-3 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-2xl mx-auto">
          {activeTab !== 'milestone' ? (
            // ラベル管理
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">{currentTab.name}ラベル</h3>
                <button
                  onClick={() => { setShowNewForm(true); setEditingItem(null) }}
                  disabled={showNewForm}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  + 新規作成
                </button>
              </div>

              {showNewForm && (
                <div className="bg-blue-50 rounded-lg px-4 mb-3">
                  <LabelForm
                    keyword={currentTab.keyword}
                    hasOrder={currentTab.hasOrder}
                    onSave={handleSaveLabel}
                    onCancel={() => setShowNewForm(false)}
                    saving={saving}
                  />
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {getLabelsForTab().length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">{currentTab.name}ラベルがありません</p>
                ) : (
                  getLabelsForTab().map((label) => {
                    const original = getOriginalLabel(label)
                    const isEditing = editingItem?.name === label.name
                    return (
                      <div key={label.name} className="px-4">
                        {isEditing ? (
                          <LabelForm
                            initial={original}
                            keyword={currentTab.keyword}
                            hasOrder={currentTab.hasOrder}
                            onSave={handleSaveLabel}
                            onCancel={() => setEditingItem(null)}
                            saving={saving}
                          />
                        ) : (
                          <div className="flex items-center gap-3 py-3">
                            <span
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="text-sm text-gray-800 flex-1">{label.name}</span>
                            {currentTab.hasOrder && label.order != null && label.order !== Infinity && (
                              <span className="text-xs text-gray-400">順序: {label.order}</span>
                            )}
                            <button
                              onClick={() => { setEditingItem(original); setShowNewForm(false) }}
                              disabled={saving}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteLabel(label.name)}
                              disabled={saving}
                              className="text-xs text-red-400 hover:text-red-600 px-2"
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              {currentTab.hasOrder ? (
                <p className="text-xs text-gray-400 mt-3">
                  ラベルの description に「<code className="bg-gray-100 px-1 rounded">{currentTab.keyword}:N</code>」で表示順序を指定できます（N が小さいほど先頭）。
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-3">
                  ラベルの description に「<code className="bg-gray-100 px-1 rounded">{currentTab.keyword}</code>」が設定されます。
                </p>
              )}
            </>
          ) : (
            // マイルストーン管理
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">マイルストーン</h3>
                <button
                  onClick={() => { setShowNewForm(true); setEditingItem(null) }}
                  disabled={showNewForm}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  + 新規作成
                </button>
              </div>

              {showNewForm && (
                <div className="bg-blue-50 rounded-lg px-4 mb-3">
                  <MilestoneForm
                    onSave={handleSaveMilestone}
                    onCancel={() => setShowNewForm(false)}
                    saving={saving}
                  />
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {milestones.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">マイルストーンがありません</p>
                ) : (
                  milestones.map((ms) => {
                    const isEditing = editingItem?.number === ms.number
                    return (
                      <div key={ms.number} className="px-4">
                        {isEditing ? (
                          <MilestoneForm
                            initial={ms}
                            onSave={handleSaveMilestone}
                            onCancel={() => setEditingItem(null)}
                            saving={saving}
                          />
                        ) : (
                          <div className="flex items-center gap-3 py-3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${ms.state === 'open' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-800">{ms.title}</span>
                              {ms.due_on && (
                                <span className="text-xs text-gray-400 ml-2">
                                  期限: {new Date(ms.due_on).toLocaleDateString('ja-JP')}
                                </span>
                              )}
                              {ms.description && (
                                <p className="text-xs text-gray-400 truncate">{ms.description}</p>
                              )}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${ms.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {ms.state === 'open' ? 'Open' : 'Closed'}
                            </span>
                            <button
                              onClick={() => handleCloseMilestone(ms)}
                              disabled={saving}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2"
                            >
                              {ms.state === 'open' ? 'Close' : 'Reopen'}
                            </button>
                            <button
                              onClick={() => { setEditingItem(ms); setShowNewForm(false) }}
                              disabled={saving}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2"
                            >
                              編集
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(ms.number, ms.title)}
                              disabled={saving}
                              className="text-xs text-red-400 hover:text-red-600 px-2"
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                説明欄に「<code className="bg-gray-100 px-1 rounded">開始日: YYYY-MM-DD</code>」を記載すると、バーンダウンチャートの開始日として使用されます。
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsView
