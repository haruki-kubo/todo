import { useState, useEffect, useCallback, useMemo } from 'react'
import { fetchIssues, fetchAllIssues, fetchLabels } from './api/github'
import { classifyLabels } from './utils/labels'
import { buildHierarchy } from './utils/hierarchy'
import TokenInput from './components/TokenInput'
import Sidebar from './components/Sidebar'
import ProjectHeader from './components/ProjectHeader'
import IssueTable from './components/IssueTable'
import IssueDetailPanel from './components/IssueDetailPanel'
import BoardView from './components/BoardView'
import GanttChart from './components/GanttChart'
import BurndownChart from './components/BurndownChart'
import SettingsView from './components/SettingsView'
import NewTaskModal from './components/NewTaskModal'

function App() {
  const [token, setToken] = useState(localStorage.getItem('github_token'))
  const [issues, setIssues] = useState([])
  const [allIssues, setAllIssues] = useState([])
  const [priorityLabels, setPriorityLabels] = useState([])
  const [categoryLabels, setCategoryLabels] = useState([])
  const [statusLabels, setStatusLabels] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState('issues')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)

  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [issuesData, allIssuesData, labelsData] = await Promise.all([
        fetchIssues(),
        fetchAllIssues(),
        fetchLabels(),
      ])
      setIssues(issuesData)
      setAllIssues(allIssuesData)
      // selectedIssue を最新データに同期
      setSelectedIssue((prev) => {
        if (!prev) return null
        const updated = issuesData.find((i) => i.id === prev.id)
        return updated || null
      })
      const { priorityLabels: pl, categoryLabels: cl, statusLabels: sl } = classifyLabels(labelsData)
      setPriorityLabels(pl)
      setCategoryLabels(cl)
      setStatusLabels(sl)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (token) loadData()
  }, [token, loadData])

  const handleTokenSet = (newToken) => {
    localStorage.setItem('github_token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    localStorage.removeItem('github_token')
    setToken(null)
    setIssues([])
    setAllIssues([])
    setPriorityLabels([])
    setCategoryLabels([])
    setStatusLabels([])
  }

  const hierarchy = useMemo(() => buildHierarchy(allIssues), [allIssues])

  if (!token) {
    return <TokenInput onTokenSet={handleTokenSet} />
  }

  const renderContent = () => {
    if (error) {
      return (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-red-500 text-sm mb-2">{error}</p>
            <button
              onClick={loadData}
              className="text-sm text-blue-500 hover:text-blue-700"
            >
              再試行
            </button>
          </div>
        </div>
      )
    }

    const detailPanel = selectedIssue && (
      <IssueDetailPanel
        issue={selectedIssue}
        allIssues={allIssues}
        hierarchy={hierarchy}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onClose={() => setSelectedIssue(null)}
        onUpdate={loadData}
        onSelectIssue={setSelectedIssue}
      />
    )

    switch (activeView) {
      case 'burndown':
        return <BurndownChart />
      case 'settings':
        return <SettingsView onDataChanged={loadData} />
      case 'board':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <BoardView
                issues={issues}
                hierarchy={hierarchy}
                priorityLabels={priorityLabels}
                statusLabels={statusLabels}
                onUpdate={loadData}
                onSelectIssue={setSelectedIssue}
                selectedIssueId={selectedIssue?.id}
              />
            </div>
            {detailPanel}
          </div>
        )
      case 'gantt':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <GanttChart
                issues={issues}
                allIssues={allIssues}
                hierarchy={hierarchy}
                priorityLabels={priorityLabels}
                categoryLabels={categoryLabels}
                statusLabels={statusLabels}
                onSelectIssue={setSelectedIssue}
                selectedIssueId={selectedIssue?.id}
              />
            </div>
            {detailPanel}
          </div>
        )
      case 'issues':
      default:
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <IssueTable
                issues={issues}
                hierarchy={hierarchy}
                priorityLabels={priorityLabels}
                categoryLabels={categoryLabels}
                statusLabels={statusLabels}
                onSelectIssue={setSelectedIssue}
                selectedIssueId={selectedIssue?.id}
              />
            </div>
            {detailPanel}
          </div>
        )
    }
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar
        activeView={activeView}
        onViewChange={(view) => {
          setActiveView(view)
          setSelectedIssue(null)
        }}
        onAdd={() => setShowNewTask(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <ProjectHeader
          activeView={activeView}
          issueCount={issues.length}
          onLogout={handleLogout}
          onRefresh={loadData}
          loading={loading}
        />
        {renderContent()}
      </div>

      {showNewTask && (
        <NewTaskModal
          allIssues={allIssues}
          hierarchy={hierarchy}
          priorityLabels={priorityLabels}
          categoryLabels={categoryLabels}
          statusLabels={statusLabels}
          onClose={() => setShowNewTask(false)}
          onCreated={() => {
            setShowNewTask(false)
            loadData()
          }}
        />
      )}
    </div>
  )
}

export default App
