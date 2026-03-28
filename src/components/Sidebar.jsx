const NAV_ITEMS = [
  { key: 'issues', name: '課題', icon: '📋' },
  { key: 'board', name: 'ボード', icon: '📊' },
  { key: 'gantt', name: 'ガントチャート', icon: '📅' },
  { key: 'burndown', name: 'バーンダウン', icon: '📉' },
]

function Sidebar({ activeView, onViewChange, onAdd }) {
  return (
    <aside className="w-56 bg-[#2c3e50] text-white flex flex-col min-h-screen shrink-0">
      <div className="px-4 py-5 border-b border-white/10">
        <h1 className="text-base font-bold tracking-wide">IssueBoard</h1>
        <p className="text-xs text-white/50 mt-0.5">GitHub Issues Manager</p>
      </div>

      <nav className="flex-1 py-3">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.key}
            onClick={() => onViewChange(item.key)}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center gap-3 transition-colors ${
              activeView === item.key
                ? 'bg-white/15 text-white font-medium'
                : 'text-white/70 hover:bg-white/5 hover:text-white'
            }`}
          >
            <span className="text-base">{item.icon}</span>
            {item.name}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-white/10">
        <button
          onClick={onAdd}
          className="w-full bg-green-500 hover:bg-green-600 text-white text-sm py-2.5 rounded-lg font-medium transition-colors"
        >
          + 課題を追加
        </button>
      </div>
    </aside>
  )
}

export default Sidebar
