import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { fetchIssues, fetchAllIssues, fetchLabels, fetchMilestones, fetchCollaborators, exchangeOAuthCode, verifyToken } from './api/github'
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
import CalendarView from './components/CalendarView'
import ActivityFeed from './components/ActivityFeed'
import Dashboard from './components/Dashboard'
import SettingsView from './components/SettingsView'
import NewTaskModal from './components/NewTaskModal'

const OAUTH_STATE_KEY = 'github_oauth_state'

function App() {
  const [token, setToken] = useState(sessionStorage.getItem('github_token'))
  const [oauthProcessing, setOauthProcessing] = useState(false)
  const [oauthError, setOauthError] = useState(null)
  const oauthHandled = useRef(false)
  const [issues, setIssues] = useState([])
  const [allIssues, setAllIssues] = useState([])
  const [priorityLabels, setPriorityLabels] = useState([])
  const [categoryLabels, setCategoryLabels] = useState([])
  const [statusLabels, setStatusLabels] = useState([])
  const [milestones, setMilestones] = useState([])
  const [collaborators, setCollaborators] = useState([])
  const [collaboratorsError, setCollaboratorsError] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [activeView, setActiveView] = useState('dashboard')
  const [selectedIssue, setSelectedIssue] = useState(null)
  const [showNewTask, setShowNewTask] = useState(false)

  const loadData = useCallback(async (syncOptions = null) => {
    setLoading(true)
    setError(null)
    try {
      let latestData = null
      const maxAttempts = syncOptions ? 5 : 1

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const [issuesData, allIssuesData, labelsData, milestonesData, collaboratorsData] = await Promise.all([
          fetchIssues(),
          fetchAllIssues(),
          fetchLabels(),
          fetchMilestones(),
          fetchCollaborators(),
        ])
        latestData = { issuesData, allIssuesData, labelsData, milestonesData, collaboratorsData }

        if (!syncOptions) break

        const issueSynced = syncOptions.issueNumber
          ? (() => {
              const targetIssue = allIssuesData.find((i) => i.number === syncOptions.issueNumber)
              return targetIssue && syncOptions.isSynced?.(targetIssue)
            })()
          : false

        const milestoneSynced = syncOptions.milestoneNumber
          ? (() => {
              const targetMilestone = milestonesData.find((m) => m.number === syncOptions.milestoneNumber)
              return targetMilestone && syncOptions.isMilestoneSynced?.(targetMilestone)
            })()
          : false

        if (issueSynced || milestoneSynced) {
          break
        }

        if (attempt < maxAttempts - 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      const { issuesData, allIssuesData, labelsData, milestonesData, collaboratorsData } = latestData
      setIssues(issuesData)
      setAllIssues(allIssuesData)
      setMilestones(milestonesData)
      setCollaborators(collaboratorsData.data)
      setCollaboratorsError(collaboratorsData.error)
      // selectedIssue を最新データに同期（allIssues ベースで検索）
      setSelectedIssue((prev) => {
        if (!prev) return null
        const fetchedIssue = allIssuesData.find((i) => i.id === prev.id)
        if (!fetchedIssue) return null
        if (
          syncOptions &&
          syncOptions.issueNumber &&
          prev.number === syncOptions.issueNumber &&
          !syncOptions.isSynced(fetchedIssue)
        ) {
          return prev
        }
        return fetchedIssue
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

  // OAuth callback: URL に ?code= があればトークン交換を実行
  useEffect(() => {
    if (oauthHandled.current) return
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const state = params.get('state')
    if (!code || token) return
    oauthHandled.current = true

    // URL からコードパラメータを除去
    const cleanUrl = window.location.pathname + window.location.hash
    window.history.replaceState({}, '', cleanUrl)

    setOauthProcessing(true)
    setOauthError(null)
    ;(async () => {
      try {
        const expectedState = sessionStorage.getItem(OAUTH_STATE_KEY)
        sessionStorage.removeItem(OAUTH_STATE_KEY)
        if (!state || !expectedState || state !== expectedState) {
          throw new Error('OAuth 認証の整合性チェックに失敗しました。もう一度ログインしてください。')
        }

        const accessToken = await exchangeOAuthCode(code)
        const result = await verifyToken(accessToken)
        if (!result.valid) {
          setOauthError(result.error)
          return
        }
        sessionStorage.setItem('github_token', accessToken)
        setToken(accessToken)
      } catch (e) {
        setOauthError(e.message)
      } finally {
        setOauthProcessing(false)
      }
    })()
  }, [token])

  useEffect(() => {
    if (token) loadData()
  }, [token, loadData])

  const handleTokenSet = (newToken) => {
    sessionStorage.setItem('github_token', newToken)
    setToken(newToken)
  }

  const handleLogout = () => {
    sessionStorage.removeItem('github_token')
    setToken(null)
    setIssues([])
    setAllIssues([])
    setMilestones([])
    setCollaborators([])
    setPriorityLabels([])
    setCategoryLabels([])
    setStatusLabels([])
  }

  const hierarchy = useMemo(() => buildHierarchy(allIssues), [allIssues])

  if (!token) {
    return <TokenInput onTokenSet={handleTokenSet} oauthProcessing={oauthProcessing} oauthError={oauthError} />
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
        milestones={milestones}
        collaborators={collaborators}
        collaboratorsError={collaboratorsError}
        priorityLabels={priorityLabels}
        categoryLabels={categoryLabels}
        statusLabels={statusLabels}
        onClose={() => setSelectedIssue(null)}
        onUpdate={loadData}
        onSelectIssue={setSelectedIssue}
      />
    )

    switch (activeView) {
      case 'dashboard':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <Dashboard
                issues={issues}
                priorityLabels={priorityLabels}
                statusLabels={statusLabels}
                milestones={milestones}
                onSelectIssue={setSelectedIssue}
                onViewChange={setActiveView}
              />
            </div>
            {detailPanel}
          </div>
        )
      case 'calendar':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <CalendarView
                issues={issues}
                onSelectIssue={setSelectedIssue}
                selectedIssueId={selectedIssue?.id}
              />
            </div>
            {detailPanel}
          </div>
        )
      case 'activity':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <ActivityFeed
                allIssues={allIssues}
                onSelectIssue={setSelectedIssue}
              />
            </div>
            {detailPanel}
          </div>
        )
      case 'burndown':
        return <BurndownChart milestones={milestones} />
      case 'settings':
        return <SettingsView onDataChanged={loadData} />
      case 'board':
        return (
          <div className="flex flex-1 min-h-0">
            <div className="flex-1 flex flex-col min-w-0">
              <BoardView
                issues={issues}
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
          milestones={milestones}
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
