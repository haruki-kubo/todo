const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''

const VIEW_TITLES = {
  issues: '課題',
  board: 'ボード',
  gantt: 'ガントチャート',
  calendar: 'カレンダー',
  burndown: 'バーンダウンチャート',
  activity: '更新履歴',
  settings: '設定',
  dashboard: 'ダッシュボード',
}

function ProjectHeader({ activeView, issueCount, onLogout, onRefresh, loading }) {
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-gray-800">
          {VIEW_TITLES[activeView] || '課題'}
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {REPO_OWNER}/{REPO_NAME}
        </span>
        <span className="text-xs text-gray-500">
          {issueCount}件
        </span>
      </div>
      <div className="flex items-center gap-3">
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          title="再読み込み"
        >
          {loading ? '読込中...' : '↻ 更新'}
        </button>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          ログアウト
        </button>
      </div>
    </header>
  )
}

export default ProjectHeader
