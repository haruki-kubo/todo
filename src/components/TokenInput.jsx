import { useState } from 'react'
import { verifyToken } from '../api/github'

function TokenInput({ onTokenSet }) {
  const [inputToken, setInputToken] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = inputToken.trim()
    if (!trimmed) return

    setVerifying(true)
    setError(null)
    try {
      const valid = await verifyToken(trimmed)
      if (valid) {
        onTokenSet(trimmed)
      } else {
        setError('トークンが無効です。権限を確認してください。')
      }
    } catch {
      setError('接続エラーが発生しました。')
    } finally {
      setVerifying(false)
    }
  }

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg p-6 w-full">
        <h1 className="text-xl font-bold text-center mb-2">📋 マイタスク</h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          GitHub Personal Access Token を入力してください
        </p>
        <form onSubmit={handleSubmit}>
          <input
            aria-label="GitHub Personal Access Token"
            type="password"
            value={inputToken}
            onChange={(e) => setInputToken(e.target.value)}
            placeholder="ghp_xxxxxxxxxxxx"
            className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 mb-3"
          />
          {error && <p className="text-red-500 text-xs mb-3">{error}</p>}
          <button
            type="submit"
            disabled={verifying || !inputToken.trim()}
            className="w-full bg-blue-600 text-white rounded-lg py-3 text-sm font-medium disabled:opacity-50"
          >
            {verifying ? '確認中...' : '接続する'}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-4 text-center">
          repo スコープのトークンが必要です。
          <br />
          トークンはこの端末のみに保存されます。
        </p>
      </div>
    </div>
  )
}

export default TokenInput
