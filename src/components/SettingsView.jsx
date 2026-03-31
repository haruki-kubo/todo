import { useState, useEffect, useCallback } from 'react'
import {
  fetchLabels, createLabel, updateLabel, deleteLabel,
  fetchMilestones, createMilestone, updateMilestone, deleteMilestone,
} from '../api/github'
import { classifyLabels } from '../utils/labels'
import { useTranslation } from '../i18n'

function LabelForm({ initial, keyword, hasOrder, onSave, onCancel, saving, t }) {
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
        placeholder={t('settings.labelName')}
        className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      {hasOrder && (
        <input
          type="number"
          value={order}
          onChange={(e) => setOrder(e.target.value)}
          placeholder={t('settings.order')}
          min="1"
          className="w-16 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      )}
      <button
        type="submit"
        disabled={saving || !name.trim()}
        className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
      >
        {saving ? t('common.saving') : initial ? t('common.update') : t('common.create')}
      </button>
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-gray-400 hover:text-gray-600 px-2"
        >
          {t('common.cancel')}
        </button>
      )}
    </form>
  )
}

function MilestoneForm({ initial, onSave, onCancel, saving, t }) {
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
        placeholder={t('settings.milestoneTitle')}
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
          placeholder={t('settings.description')}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
        />
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving || !title.trim()}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
        >
          {saving ? t('common.saving') : initial ? t('common.update') : t('common.create')}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-gray-400 hover:text-gray-600 px-2"
          >
            {t('common.cancel')}
          </button>
        )}
      </div>
    </form>
  )
}

function SettingsView({ onDataChanged }) {
  const { t, lang } = useTranslation()

  const TABS = [
    { key: 'status', tKey: 'settings.statusTab', keyword: 'status', hasOrder: true },
    { key: 'priority', tKey: 'settings.priorityTab', keyword: 'priority', hasOrder: true },
    { key: 'category', tKey: 'settings.categoryTab', keyword: 'category', hasOrder: false },
    { key: 'milestone', tKey: 'settings.milestoneTab', keyword: null, hasOrder: false },
  ]

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

  const currentTab = TABS.find((tab) => tab.key === activeTab)

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
      alert(t('error.saveFailed') + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteLabel = async (name) => {
    if (!confirm(`「${name}」${t('settings.confirmDeleteLabel')}`)) return
    setSaving(true)
    try {
      await deleteLabel(name)
      await loadData()
      await onDataChanged?.()
    } catch (e) {
      alert(t('error.deleteFailed') + e.message)
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
      alert(t('error.saveFailed') + e.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteMilestone = async (number, title) => {
    if (!confirm(`「${title}」${t('settings.confirmDeleteMilestone')}`)) return
    setSaving(true)
    try {
      await deleteMilestone(number)
      await loadData()
      await onDataChanged?.()
    } catch (e) {
      alert(t('error.deleteFailed') + e.message)
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
      alert(t('error.updateFailed') + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="text-center py-16 text-gray-400">{t('common.loading')}</div>
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
            {t(tab.tKey)}
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
                <h3 className="text-sm font-bold text-gray-700">{t(currentTab.tKey)}</h3>
                <button
                  onClick={() => { setShowNewForm(true); setEditingItem(null) }}
                  disabled={showNewForm}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {t('settings.newLabel')}
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
                    t={t}
                  />
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {getLabelsForTab().length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">{t('settings.noLabels')}</p>
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
                            t={t}
                          />
                        ) : (
                          <div className="flex items-center gap-3 py-3">
                            <span
                              className="w-4 h-4 rounded-full shrink-0"
                              style={{ backgroundColor: label.color }}
                            />
                            <span className="text-sm text-gray-800 flex-1">{label.name}</span>
                            {currentTab.hasOrder && label.order != null && label.order !== Infinity && (
                              <span className="text-xs text-gray-400">{t('settings.order')}: {label.order}</span>
                            )}
                            <button
                              onClick={() => { setEditingItem(original); setShowNewForm(false) }}
                              disabled={saving}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteLabel(label.name)}
                              disabled={saving}
                              className="text-xs text-red-400 hover:text-red-600 px-2"
                            >
                              {t('common.delete')}
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
                  {t('settings.orderHint', { keyword: currentTab.keyword })}
                </p>
              ) : (
                <p className="text-xs text-gray-400 mt-3">
                  {t('settings.categoryHint', { keyword: currentTab.keyword })}
                </p>
              )}
            </>
          ) : (
            // マイルストーン管理
            <>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-700">{t('settings.milestoneTab')}</h3>
                <button
                  onClick={() => { setShowNewForm(true); setEditingItem(null) }}
                  disabled={showNewForm}
                  className="text-xs bg-green-500 hover:bg-green-600 text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {t('settings.newLabel')}
                </button>
              </div>

              {showNewForm && (
                <div className="bg-blue-50 rounded-lg px-4 mb-3">
                  <MilestoneForm
                    onSave={handleSaveMilestone}
                    onCancel={() => setShowNewForm(false)}
                    saving={saving}
                    t={t}
                  />
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                {milestones.length === 0 ? (
                  <p className="text-center py-8 text-gray-400 text-xs">{t('settings.noMilestones')}</p>
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
                            t={t}
                          />
                        ) : (
                          <div className="flex items-center gap-3 py-3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${ms.state === 'open' ? 'bg-green-500' : 'bg-gray-400'}`} />
                            <div className="flex-1 min-w-0">
                              <span className="text-sm text-gray-800">{ms.title}</span>
                              {ms.due_on && (
                                <span className="text-xs text-gray-400 ml-2">
                                  {t('settings.dueDate')}: {new Date(ms.due_on).toLocaleDateString(lang === 'en' ? 'en-US' : 'ja-JP')}
                                </span>
                              )}
                              {ms.description && (
                                <p className="text-xs text-gray-400 truncate">{ms.description}</p>
                              )}
                            </div>
                            <span className={`text-[10px] px-2 py-0.5 rounded ${ms.state === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                              {ms.state === 'open' ? t('settings.milestoneOpen') : t('settings.milestoneClosed')}
                            </span>
                            <button
                              onClick={() => handleCloseMilestone(ms)}
                              disabled={saving}
                              className="text-xs text-gray-500 hover:text-gray-700 px-2"
                            >
                              {ms.state === 'open' ? t('settings.milestoneClose') : t('settings.milestoneReopen')}
                            </button>
                            <button
                              onClick={() => { setEditingItem(ms); setShowNewForm(false) }}
                              disabled={saving}
                              className="text-xs text-blue-500 hover:text-blue-700 px-2"
                            >
                              {t('common.edit')}
                            </button>
                            <button
                              onClick={() => handleDeleteMilestone(ms.number, ms.title)}
                              disabled={saving}
                              className="text-xs text-red-400 hover:text-red-600 px-2"
                            >
                              {t('common.delete')}
                            </button>
                          </div>
                        )}
                      </div>
                    )
                  })
                )}
              </div>

              <p className="text-xs text-gray-400 mt-3">
                {t('settings.milestoneStartDateHint')}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default SettingsView
