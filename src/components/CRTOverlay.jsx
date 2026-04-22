import { useEffect, useState, useCallback } from 'react'

const STORAGE_KEY = 'playhubgx.ui.crt'

function readStoredPreference() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw === 'off') return false
    if (raw === 'on') return true
  } catch (_) {
    // ignore
  }
  return true
}

function writeStoredPreference(enabled) {
  try {
    localStorage.setItem(STORAGE_KEY, enabled ? 'on' : 'off')
  } catch (_) {
    // ignore
  }
}

/**
 * Full-viewport CRT overlay: scanlines + vignette + subtle chromatic fringe.
 * - Toggled with a small pill button anchored at the bottom-right of the
 *   viewport and persisted to localStorage.
 * - Also listens for the `Ctrl+Shift+C` shortcut to toggle.
 * - Does not intercept pointer/keyboard events — everything is
 *   `pointer-events: none`.
 */
function CRTOverlay() {
  const [enabled, setEnabled] = useState(() => readStoredPreference())

  const sync = useCallback((on) => {
    if (typeof document === 'undefined') return
    const root = document.documentElement
    root.classList.toggle('crt-on', on)
    root.classList.toggle('crt-off', !on)
  }, [])

  useEffect(() => {
    sync(enabled)
    writeStoredPreference(enabled)
  }, [enabled, sync])

  useEffect(() => {
    const onKey = (e) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'C' || e.key === 'c')) {
        setEnabled((prev) => !prev)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const toggle = () => setEnabled((prev) => !prev)

  return (
    <>
      {/* The overlay itself (scanlines + vignette + chromatic fringe).
          All layers are pointer-events:none and fixed to the viewport. */}
      <div className="crt-overlay" aria-hidden="true">
        <div className="crt-scanlines" />
        <div className="crt-vignette" />
        <div className="crt-fringe" />
      </div>

      {/* Floating toggle. z-index above the overlay so it's clickable. */}
      <button
        type="button"
        onClick={toggle}
        className={`
          fixed bottom-3 right-3 z-[120]
          px-3 py-1.5 rounded-full
          font-retro text-[7px] tracking-widest
          border transition-colors
          ${enabled
            ? 'bg-ps1-cyan-deep/80 border-ps1-cyan text-white shadow-ps1-cyan-glow'
            : 'bg-black/60 border-ps1-bios-border text-ps1-text/80 hover:border-ps1-cyan-soft'}
        `}
        title="Toggle CRT overlay (Ctrl+Shift+C)"
      >
        CRT: {enabled ? 'ON' : 'OFF'}
      </button>
    </>
  )
}

export default CRTOverlay
