import { useState } from 'react'
import { addComment } from '../api/github'
import { useTranslation } from '../i18n'

function CommentForm({ issueNumber, onCommentAdded }) {
  const { t } = useTranslation()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed) return

    setSending(true)
    try {
      const newComment = await addComment(issueNumber, trimmed)
      onCommentAdded(newComment)
      setText('')
    } catch (e) {
      alert(t('error.commentSend') + e.message)
    } finally {
      setSending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="mt-3">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={t('detail.commentPlaceholder')}
        rows={2}
        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs resize-none focus:outline-none focus:ring-2 focus:ring-blue-300"
      />
      <button
        type="submit"
        disabled={sending || !text.trim()}
        className="mt-1 w-full bg-blue-500 text-white text-xs py-2 rounded-lg font-medium disabled:opacity-40 active:bg-blue-600"
      >
        {sending ? t('common.sending') : t('detail.send')}
      </button>
    </form>
  )
}

export default CommentForm
