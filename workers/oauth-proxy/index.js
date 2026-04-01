const GITHUB_TOKEN_URL = 'https://github.com/login/oauth/access_token'

// 許可するオリジン（デプロイ先に合わせて変更）
const ALLOWED_ORIGINS = [
  // 'https://your-domain.github.io',
  'http://localhost:5173',
  'http://localhost:4173',
]

function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    'Access-Control-Allow-Origin': allowed,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || ''
    const cors = corsHeaders(origin)

    // Preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors })
    }

    if (request.method !== 'POST') {
      return Response.json(
        { error: 'method_not_allowed' },
        { status: 405, headers: cors },
      )
    }

    try {
      const { code } = await request.json()
      if (!code) {
        return Response.json(
          { error: 'missing_params', error_description: 'code is required' },
          { status: 400, headers: cors },
        )
      }

      if (!env.GITHUB_CLIENT_SECRET || !env.GITHUB_CLIENT_ID) {
        return Response.json(
          { error: 'server_config', error_description: 'GITHUB_CLIENT_ID / GITHUB_CLIENT_SECRET is not configured' },
          { status: 500, headers: cors },
        )
      }

      // GitHub にトークン交換をリクエスト
      const res = await fetch(GITHUB_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          client_id: env.GITHUB_CLIENT_ID,
          client_secret: env.GITHUB_CLIENT_SECRET,
          code,
        }),
      })

      const data = await res.json()

      return Response.json(data, {
        status: data.error ? 400 : 200,
        headers: cors,
      })
    } catch (err) {
      return Response.json(
        { error: 'internal_error', error_description: err.message },
        { status: 500, headers: cors },
      )
    }
  },
}
