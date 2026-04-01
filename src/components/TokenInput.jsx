import { useState } from 'react'
import { verifyToken } from '../api/github'
import { useTranslation } from '../i18n'

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''
const AUTH_MODE = import.meta.env.VITE_AUTH_MODE || 'pat'
const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || ''

const enablePat = AUTH_MODE === 'pat' || AUTH_MODE === 'both'
const enableOAuth = (AUTH_MODE === 'oauth' || AUTH_MODE === 'both') && GITHUB_CLIENT_ID
const OAUTH_STATE_KEY = 'github_oauth_state'

function createOAuthState() {
  try {
    const array = new Uint32Array(4)
    window.crypto.getRandomValues(array)
    return Array.from(array, (value) => value.toString(16).padStart(8, '0')).join('')
  } catch {
    return `${Date.now()}-${Math.random().toString(16).slice(2)}`
  }
}

function PatForm({ onTokenSet, t }) {
  const [inputToken, setInputToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)
  const [showGuide, setShowGuide] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = inputToken.trim()
    if (!trimmed) return

    setVerifying(true)
    setError(null)
    try {
      const result = await verifyToken(trimmed)
      if (result.valid) {
        onTokenSet(trimmed)
      } else {
        setError(result.error || t('token.errorGeneric'))
      }
    } catch {
      setError(t('token.errorGeneric'))
    } finally {
      setVerifying(false)
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit}>
        <input
          aria-label="GitHub Personal Access Token"
          type="password"
          value={inputToken}
          onChange={(e) => setInputToken(e.target.value)}
          placeholder={t('token.placeholder')}
          className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
        />
        {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
        <button
          type="submit"
          disabled={verifying || !inputToken.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 transition-colors"
        >
          {verifying ? t('token.verifying') : t('token.connect')}
        </button>
      </form>

      <p className="text-xs text-gray-400 mt-3 text-center">
        {t('token.sessionNote')}
      </p>

      {/* ガイド */}
      <div className="border-t border-gray-100 mt-5">
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="w-full px-6 py-3 text-xs text-blue-600 hover:bg-gray-50 font-medium flex items-center justify-center gap-1 transition-colors"
        >
          {showGuide ? `▲ ${t('token.guideClose')}` : `▼ ${t('token.guideToggle')}`}
        </button>

        {showGuide && (
          <div className="px-6 pb-6 space-y-4">
            {/* 組織リポジトリの注意 */}
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
              <p className="text-xs text-amber-800">{t('token.orgWarning')}</p>
            </div>

            {/* Fine-grained Token ガイド */}
            <div>
              <p className="text-xs font-bold text-gray-700 mb-2">{t('token.fineGrainedHeading')}</p>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.step1')}</p>
                    <a
                      href="https://github.com/settings/tokens?type=beta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {t('token.step1Link')}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.step2')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('token.step2desc')}</p>
                    <ul className="text-xs text-gray-500 mt-1 space-y-1">
                      <li><strong>{t('token.fieldTokenName')}</strong>: {t('token.tokenNameHint')}</li>
                      <li><strong>{t('token.fieldExpiration')}</strong>: {t('token.expirationHint')}</li>
                      <li>
                        <strong>{t('token.fieldResourceOwner')}</strong>:
                        {REPO_OWNER && <span className="ml-1 text-gray-700 font-medium">{REPO_OWNER}</span>}
                      </li>
                      <li>
                        <strong>{t('token.fieldRepoAccess')}</strong>: {t('token.repoAccessHint')}
                        {REPO_NAME && <span className="ml-1 text-gray-700 font-medium">{REPO_NAME}</span>}
                      </li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.step3')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('token.step3Desc')}</p>
                    <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-700"><strong>{t('token.fieldIssues')}</strong>: {t('token.permissionDetail')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.step4')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('token.step4desc')}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Classic Token ガイド */}
            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs font-bold text-gray-700 mb-2">{t('token.classicHeading')}</p>
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 mb-3">
                <p className="text-xs text-green-800">{t('token.classicRecommend')}</p>
              </div>
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.classicStep1')}</p>
                    <a
                      href="https://github.com/settings/tokens/new"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      {t('token.classicStep1Link')}
                    </a>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.classicStep2')}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{t('token.classicStep2desc')}</p>
                    <ul className="text-xs text-gray-500 mt-1 space-y-1">
                      <li><strong>{t('token.classicFieldNote')}</strong>: {t('token.classicNoteHint')}</li>
                      <li><strong>{t('token.fieldExpiration')}</strong>: {t('token.expirationHint')}</li>
                      <li><strong>{t('token.classicFieldScopes')}</strong>: {t('token.classicScopesHint')}</li>
                    </ul>
                  </div>
                </div>
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-gray-700 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">{t('token.classicStep3')}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function OAuthForm({ oauthProcessing, oauthError, t }) {
  const handleOAuth = () => {
    const redirectUri = window.location.origin + window.location.pathname
    const state = createOAuthState()
    sessionStorage.setItem(OAUTH_STATE_KEY, state)
    const url = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`
    window.location.href = url
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500 text-center">
        {t('oauth.description')}
      </p>

      {oauthProcessing && (
        <div className="text-center py-4">
          <p className="text-sm text-blue-600">{t('oauth.processing')}</p>
        </div>
      )}

      {oauthError && (
        <p className="text-red-500 text-xs text-center">{oauthError}</p>
      )}

      <button
        onClick={handleOAuth}
        disabled={oauthProcessing}
        className="w-full bg-gray-800 hover:bg-gray-900 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
        </svg>
        {oauthProcessing ? t('oauth.processing') : t('oauth.loginButton')}
      </button>

      <p className="text-xs text-gray-400 text-center">
        {t('oauth.scopeNote')}
      </p>
    </div>
  )
}

function TokenInput({ onTokenSet, oauthProcessing, oauthError }) {
  const { t } = useTranslation()
  const showTabs = enablePat && enableOAuth
  const defaultTab = enableOAuth ? 'oauth' : 'pat'
  const [activeTab, setActiveTab] = useState(defaultTab)

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">
        <div className="p-6 pb-0">
          <h1 className="text-xl font-bold text-center mb-1">{t('token.title')}</h1>
          <p className="text-sm text-gray-500 text-center mb-5">
            {activeTab === 'oauth' ? t('oauth.subtitle') : t('token.subtitle')}
          </p>

          {/* タブ切替 */}
          {showTabs && (
            <div className="flex border-b border-gray-200 mb-5">
              <button
                onClick={() => setActiveTab('oauth')}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'oauth'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t('oauth.tabLabel')}
              </button>
              <button
                onClick={() => setActiveTab('pat')}
                className={`flex-1 pb-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'pat'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
              >
                {t('token.tabLabel')}
              </button>
            </div>
          )}

          {/* コンテンツ */}
          {activeTab === 'oauth' && enableOAuth ? (
            <OAuthForm oauthProcessing={oauthProcessing} oauthError={oauthError} t={t} />
          ) : (
            <PatForm onTokenSet={onTokenSet} t={t} />
          )}
        </div>

        {/* タブがない場合のみ下余白 */}
        {!showTabs && activeTab === 'oauth' && <div className="pb-6" />}
      </div>
    </div>
  )
}

export default TokenInput
