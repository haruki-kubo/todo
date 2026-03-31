import { useTranslation } from '../i18n'

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''

const VIEW_TITLE_KEYS = {
  dashboard: 'nav.dashboard',
  issues: 'nav.issues',
  board: 'nav.board',
  gantt: 'nav.gantt',
  calendar: 'nav.calendar',
  burndown: 'nav.burndown',
  activity: 'nav.activity',
  settings: 'nav.settings',
}

function ProjectHeader({ activeView, issueCount, onLogout, onRefresh, loading }) {
  const { t, lang, setLang } = useTranslation()
  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-gray-800">
          {t(VIEW_TITLE_KEYS[activeView] || 'nav.issues')}
        </h2>
        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
          {REPO_OWNER}/{REPO_NAME}
        </span>
        <span className="text-xs text-gray-500">
          {issueCount}{t('common.items')}
        </span>
      </div>
      <div className="flex items-center gap-3">
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          className="text-xs border border-gray-200 rounded px-2 py-1 bg-white text-gray-600"
        >
          <option value="ja">{t('lang.ja')}</option>
          <option value="en">{t('lang.en')}</option>
        </select>
        <button
          onClick={onRefresh}
          disabled={loading}
          className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1 rounded hover:bg-gray-100 transition-colors disabled:opacity-50"
          title={t('header.refresh')}
        >
          {loading ? t('header.refreshing') : t('header.refresh')}
        </button>
        <button
          onClick={onLogout}
          className="text-xs text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-gray-100 transition-colors"
        >
          {t('header.logout')}
        </button>
      </div>
    </header>
  )
}

export default ProjectHeader
