/**
 * Client helper that fetches short-lived Cloudflare Realtime TURN credentials
 * from our `/api/turn-credentials` Vercel function and caches them in memory
 * until they expire.
 *
 * Returned shape matches the `RTCConfiguration` passed to PeerJS as `config`:
 *   {
 *     iceServers: [{ urls: [...], username: '...', credential: '...' }],
 *     iceTransportPolicy: 'relay' | 'all',
 *   }
 *
 * If the API is unreachable (e.g. running `vite dev` without the env vars
 * configured), we fall back to PeerJS' default public STUN servers and log a
 * warning. The streaming flow keeps working over LANs / non-symmetric NATs;
 * only relay-only fallback breaks.
 */

const CREDENTIAL_TTL_SECONDS = 60 * 60 // 1 hour
// Refresh ~5 min before the credentials actually expire.
const REFRESH_LEAD_SECONDS = 5 * 60

let cache = null // { iceServers, expiresAt }
let inFlight = null

/**
 * Resolve the API endpoint. Always relative so it works on both Vercel
 * deployments and local `vite dev` (where it 404s and we fall back).
 */
const TURN_ENDPOINT = '/api/turn-credentials'

async function fetchFreshCredentials() {
  const url = `${TURN_ENDPOINT}?ttl=${CREDENTIAL_TTL_SECONDS}`
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ttl: CREDENTIAL_TTL_SECONDS }),
  })
  if (!res.ok) {
    throw new Error(`TURN credentials endpoint returned ${res.status}`)
  }
  const data = await res.json()
  // Cloudflare's `generate-ice-servers` endpoint returns either a single
  // object or an array of objects under `iceServers`. Normalize to array.
  const iceServers = Array.isArray(data.iceServers) ? data.iceServers : [data.iceServers]
  const ttl = Number(data.ttl) || CREDENTIAL_TTL_SECONDS
  return {
    iceServers,
    expiresAt: Date.now() + (ttl - REFRESH_LEAD_SECONDS) * 1000,
  }
}

/**
 * Get a `RTCConfiguration` ready to be passed to PeerJS. Always returns
 * something usable, never throws — falls back to defaults if Cloudflare is
 * unreachable.
 *
 * @param {{ relayOnly?: boolean }} options
 * @returns {Promise<{ iceServers: RTCIceServer[], iceTransportPolicy: 'relay' | 'all' }>}
 */
export async function getPeerRtcConfig({ relayOnly = true } = {}) {
  const now = Date.now()
  if (cache && cache.expiresAt > now) {
    return buildConfig(cache.iceServers, relayOnly)
  }
  if (!inFlight) {
    inFlight = fetchFreshCredentials()
      .then((next) => {
        cache = next
        return next
      })
      .catch((err) => {
        console.warn('[TURN] Falling back to default STUN servers:', err)
        cache = null
        return null
      })
      .finally(() => { inFlight = null })
  }
  const next = await inFlight
  if (next) return buildConfig(next.iceServers, relayOnly)
  return buildFallbackConfig(relayOnly)
}

function buildConfig(iceServers, relayOnly) {
  return {
    iceServers,
    // Force traffic through TURN. Falls back to 'all' silently if no relay
    // candidate is available so the connection still has a chance.
    iceTransportPolicy: relayOnly ? 'relay' : 'all',
  }
}

function buildFallbackConfig(relayOnly) {
  // PeerJS' default STUN. Used only when /api/turn-credentials is missing
  // (e.g. local `vite dev` without env vars). Cannot honour relay-only since
  // there is no TURN server configured.
  return {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' },
    ],
    iceTransportPolicy: relayOnly ? 'all' : 'all',
  }
}
