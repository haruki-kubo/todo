import { useState } from 'react'
import { verifyToken } from '../api/github'

const REPO_OWNER = import.meta.env.VITE_REPO_OWNER || ''
const REPO_NAME = import.meta.env.VITE_REPO_NAME || ''

function TokenInput({ onTokenSet }) {
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
        setError(result.error || 'トークンが無効です。権限を確認してください。')
      }
    } catch {
      setError('接続エラーが発生しました。')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg w-full max-w-lg">
        {/* ヘッダー */}
        <div className="p-6 pb-0">
          <h1 className="text-xl font-bold text-center mb-1">IssueBoard</h1>
          <p className="text-sm text-gray-500 text-center mb-5">
            GitHub Personal Access Token を入力して接続
          </p>

          {/* トークン入力フォーム */}
          <form onSubmit={handleSubmit}>
            <input
              aria-label="GitHub Personal Access Token"
              type="password"
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="ghp_xxxxxxxxxxxx または github_pat_xxxx"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
            />
            {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
            <button
              type="submit"
              disabled={verifying || !inputToken.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50 transition-colors"
            >
              {verifying ? '確認中...' : '接続する'}
            </button>
          </form>

          <p className="text-xs text-gray-400 mt-3 text-center">
            トークンはブラウザのセッション内にのみ保存されます。タブを閉じると自動的に削除されます。
          </p>
        </div>

        {/* ガイド */}
        <div className="border-t border-gray-100 mt-5">
          <button
            onClick={() => setShowGuide(!showGuide)}
            className="w-full px-6 py-3 text-xs text-blue-600 hover:bg-gray-50 font-medium flex items-center justify-center gap-1 transition-colors"
          >
            {showGuide ? '▲ ガイドを閉じる' : '▼ トークンの発行方法'}
          </button>

          {showGuide && (
            <div className="px-6 pb-6 space-y-4">
              {/* ステップ */}
              <div className="space-y-3">
                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">1</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">GitHub のトークン設定ページを開く</p>
                    <a
                      href="https://github.com/settings/tokens?type=beta"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-xs bg-gray-800 text-white px-3 py-1.5 rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      Fine-grained tokens を開く
                    </a>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">2</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">「Generate new token」をクリック</p>
                    <p className="text-xs text-gray-500 mt-0.5">以下を設定してください:</p>
                    <ul className="text-xs text-gray-500 mt-1 space-y-1">
                      <li><strong>Token name</strong>: 任意（例: IssueBoard）</li>
                      <li><strong>Expiration</strong>: 任意の有効期限</li>
                      <li>
                        <strong>Resource owner</strong>:
                        {REPO_OWNER && <span className="ml-1 text-gray-700 font-medium">{REPO_OWNER}</span>}
                      </li>
                      <li>
                        <strong>Repository access</strong>: 「Only select repositories」→
                        {REPO_NAME && <span className="ml-1 text-gray-700 font-medium">{REPO_NAME}</span>}
                      </li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">3</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">Permissions を設定</p>
                    <p className="text-xs text-gray-500 mt-0.5">Repository permissions:</p>
                    <div className="mt-1 bg-gray-50 rounded-lg px-3 py-2">
                      <p className="text-xs text-gray-700"><strong>Issues</strong>: Read and write</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3">
                  <span className="w-5 h-5 bg-blue-600 text-white rounded-full text-xs flex items-center justify-center shrink-0 mt-0.5">4</span>
                  <div>
                    <p className="text-xs font-medium text-gray-700">「Generate token」でトークンを生成</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      表示されたトークン（<code className="bg-gray-100 px-1 rounded">github_pat_</code> で始まる文字列）をコピーして上の入力欄に貼り付けてください。
                    </p>
                  </div>
                </div>
              </div>

              {/* 注意事項 */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
                <p className="text-xs text-amber-800">
                  <strong>注意:</strong> 組織リポジトリの場合、Fine-grained token は組織管理者の承認が必要です。
                  トークンのステータスが「Pending」の場合は管理者に承認を依頼してください。
                </p>
              </div>

              {/* Classic Token の案内 */}
              <div className="border-t border-gray-100 pt-3">
                <p className="text-xs text-gray-400">
                  Fine-grained token が使えない場合は
                  <a
                    href="https://github.com/settings/tokens/new"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline ml-1"
                  >
                    Classic token
                  </a>
                  （<code className="bg-gray-100 px-1 rounded">repo</code> スコープ）も利用できます。
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default TokenInput
