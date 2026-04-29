/**
 * Vercel serverless function that mints short-lived Cloudflare Realtime TURN
 * credentials for a single client.
 *
 * The actual TURN secret (CLOUDFLARE_TURN_TOKEN) never leaves the server.
 * Clients receive only an `iceServers` object with a username/credential
 * that expires after `ttl` seconds.
 *
 * Cloudflare endpoint:
 *   POST https://rtc.live.cloudflare.com/v1/turn/keys/{KEY_ID}/credentials/generate-ice-servers
 *   Headers: Authorization: Bearer {TURN_TOKEN}
 *   Body:    { "ttl": <seconds> }
 *
 * Required environment variables (configured per-environment in Vercel):
 *   - CLOUDFLARE_TURN_TOKEN_ID: public app/key id (UUID)
 *   - CLOUDFLARE_TURN_TOKEN:    secret app token
 */

const DEFAULT_TTL_SECONDS = 60 * 60 // 1 hour

export default async function handler(req, res) {
  if (req.method && req.method !== 'GET' && req.method !== 'POST') {
    res.setHeader('Allow', 'GET, POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const keyId = process.env.CLOUDFLARE_TURN_TOKEN_ID
  const token = process.env.CLOUDFLARE_TURN_TOKEN

  if (!keyId || !token) {
    return res.status(500).json({
      error: 'TURN service not configured',
      detail: 'Missing CLOUDFLARE_TURN_TOKEN_ID or CLOUDFLARE_TURN_TOKEN env vars.',
    })
  }

  const ttl = clampTtl(req.query?.ttl ?? req.body?.ttl)

  try {
    const cfRes = await fetch(
      `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ ttl }),
      },
    )

    if (!cfRes.ok) {
      const text = await cfRes.text()
      return res.status(502).json({
        error: 'Cloudflare TURN API rejected the request',
        status: cfRes.status,
        detail: text.slice(0, 500),
      })
    }

    const data = await cfRes.json()

    // Tell intermediate caches to never cache this response - credentials are
    // short-lived and per-client.
    res.setHeader('Cache-Control', 'no-store, max-age=0')
    return res.status(200).json({
      iceServers: data.iceServers,
      ttl,
    })
  } catch (err) {
    return res.status(502).json({
      error: 'Failed to reach Cloudflare TURN API',
      detail: err instanceof Error ? err.message : String(err),
    })
  }
}

function clampTtl(raw) {
  const n = Number(raw)
  if (!Number.isFinite(n) || n <= 0) return DEFAULT_TTL_SECONDS
  // Cloudflare allows up to 48h; we cap at 24h to keep credentials fresh.
  return Math.min(Math.max(Math.floor(n), 60), 24 * 60 * 60)
}
