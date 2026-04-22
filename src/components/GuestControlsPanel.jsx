import { useCallback, useEffect, useRef, useState } from 'react'
import {
  PS1_BUTTONS,
  defaultBindings,
  humanKeyLabel,
  humanPadLabel,
  indexBindings,
  removeKeyBinding,
  removePadBinding,
  setKeyBinding,
  setPadBinding,
} from '../lib/guestControls'
import PS1Symbol from './PS1Symbols'

/**
 * Modal panel that lets the Guest remap keyboard keys and gamepad buttons
 * to PS1 buttons. Bindings are lifted to the parent (GameRoomPanel) so the
 * input-forwarding loop uses them live; the parent is also responsible for
 * persisting them to localStorage on change.
 *
 * Capture flow: the user clicks "REBIND" (or "+ ADD") next to a PS1 button.
 * The panel then captures the next `keydown` (for keyboard) or gamepad
 * button press (for pad) and writes it into `bindings`. Meanwhile, all
 * global input forwarding is suppressed by the parent so the capture key
 * doesn't also reach the host.
 */

export default function GuestControlsPanel({ bindings, onChange, onClose }) {
  const [capture, setCapture] = useState(null)
  const captureRef = useRef(null)
  useEffect(() => { captureRef.current = capture }, [capture])

  const index = indexBindings(bindings)

  const cancelCapture = useCallback(() => setCapture(null), [])

  useEffect(() => {
    if (!capture || capture.source !== 'keys') return
    const onKeyDown = (e) => {
      e.preventDefault()
      e.stopPropagation()
      if (e.code === 'Escape') {
        cancelCapture()
        return
      }
      onChange((prev) => setKeyBinding(prev, e.code, capture.libretroId))
      cancelCapture()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [capture, onChange, cancelCapture])

  useEffect(() => {
    if (!capture || capture.source !== 'pad') return
    if (typeof navigator === 'undefined' || typeof navigator.getGamepads !== 'function') return
    let rafId = null
    const seeded = new Set()
    const seed = () => {
      const pads = navigator.getGamepads() || []
      pads.forEach((p) => {
        if (!p) return
        p.buttons.forEach((btn, idx) => {
          if (btn && btn.pressed) seeded.add(`${p.index}:${idx}`)
        })
      })
    }
    seed()
    const tick = () => {
      const pads = navigator.getGamepads() || []
      for (const p of pads) {
        if (!p) continue
        for (let i = 0; i < p.buttons.length; i++) {
          const key = `${p.index}:${i}`
          const pressed = p.buttons[i] && p.buttons[i].pressed
          if (pressed && !seeded.has(key)) {
            onChange((prev) => setPadBinding(prev, i, capture.libretroId))
            cancelCapture()
            return
          }
          if (!pressed) seeded.delete(key)
        }
      }
      rafId = window.requestAnimationFrame(tick)
    }
    rafId = window.requestAnimationFrame(tick)
    return () => { if (rafId != null) window.cancelAnimationFrame(rafId) }
  }, [capture, onChange, cancelCapture])

  const resetDefaults = useCallback(() => {
    onChange(defaultBindings())
  }, [onChange])

  const startKeyCapture = useCallback((libretroId) => {
    setCapture({ libretroId, source: 'keys' })
  }, [])

  const startPadCapture = useCallback((libretroId) => {
    setCapture({ libretroId, source: 'pad' })
  }, [])

  const removeKey = useCallback((code) => {
    onChange((prev) => removeKeyBinding(prev, code))
  }, [onChange])

  const removePad = useCallback((idx) => {
    onChange((prev) => removePadBinding(prev, idx))
  }, [onChange])

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-ps1-bios-bg-deep/85 p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col bg-ps1-bios-panel border border-ps1-cyan-deep/70 rounded shadow-ps1-cyan-glow animate-slide-in-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-3 border-b border-ps1-bios-border">
          <div>
            <h3 className="font-ps font-semibold text-[13px] text-ps1-yellow tracking-[0.3em] glow-yellow">
              CONFIGURE CONTROLS
            </h3>
            <p className="font-retro text-[7px] text-ps1-cyan-soft/70 mt-1 tracking-widest">
              Bindings are saved on this device. Analog sticks are fixed.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetDefaults}
              className="px-3 py-1 bg-ps1-bios-panel hover:bg-ps1-bios-panel/70 text-ps1-cyan-soft border border-ps1-bios-border hover:border-ps1-cyan-soft font-retro text-[8px] rounded tracking-widest"
            >
              RESET DEFAULTS
            </button>
            <button
              onClick={onClose}
              className="px-3 py-1 bg-ps1-led-red/80 hover:bg-ps1-led-red text-white border border-ps1-led-red font-retro text-[8px] rounded tracking-widest"
            >
              CLOSE
            </button>
          </div>
        </div>

        <div className="grid grid-cols-[140px_1fr_1fr] gap-2 px-3 py-2 border-b border-ps1-bios-border bg-ps1-bios-bg-deep/60">
          <div className="font-retro text-[7px] text-ps1-cyan-soft/70 tracking-widest">BUTTON</div>
          <div className="font-retro text-[7px] text-ps1-cyan-soft/70 tracking-widest">KEYBOARD</div>
          <div className="font-retro text-[7px] text-ps1-cyan-soft/70 tracking-widest">GAMEPAD</div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {PS1_BUTTONS.map((btn) => {
            const entry = index[btn.id] || { keys: [], pad: [] }
            const keyCapturing = capture && capture.source === 'keys' && capture.libretroId === btn.id
            const padCapturing = capture && capture.source === 'pad'  && capture.libretroId === btn.id
            return (
              <div
                key={btn.id}
                className="grid grid-cols-[140px_1fr_1fr] gap-2 px-3 py-2 border-b border-ps1-bios-border/60 items-center"
              >
                <div className="font-ps text-[10px] text-ps1-cyan-soft tracking-[0.2em] flex items-center gap-2">
                  {btn.shape && <PS1Symbol shape={btn.shape} size={16} />}
                  <span>{btn.label}</span>
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {entry.keys.map((code) => (
                    <BindingPill
                      key={`k-${code}`}
                      label={humanKeyLabel(code)}
                      onRemove={() => removeKey(code)}
                    />
                  ))}
                  {keyCapturing ? (
                    <button
                      onClick={cancelCapture}
                      className="px-2 py-1 font-retro text-[7px] text-black bg-ps1-yellow hover:bg-ps1-yellow-soft rounded tracking-widest"
                    >
                      PRESS KEY… (ESC TO CANCEL)
                    </button>
                  ) : (
                    <button
                      onClick={() => startKeyCapture(btn.id)}
                      className="px-2 py-1 font-retro text-[7px] text-ps1-cyan-soft bg-ps1-bios-panel border border-ps1-bios-border hover:border-ps1-cyan-soft rounded tracking-widest"
                    >
                      + ADD KEY
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-1">
                  {entry.pad.map((idx) => (
                    <BindingPill
                      key={`p-${idx}`}
                      label={humanPadLabel(idx)}
                      onRemove={() => removePad(idx)}
                    />
                  ))}
                  {padCapturing ? (
                    <button
                      onClick={cancelCapture}
                      className="px-2 py-1 font-retro text-[7px] text-black bg-ps1-yellow hover:bg-ps1-yellow-soft rounded tracking-widest"
                    >
                      PRESS PAD BUTTON…
                    </button>
                  ) : (
                    <button
                      onClick={() => startPadCapture(btn.id)}
                      className="px-2 py-1 font-retro text-[7px] text-ps1-cyan-soft bg-ps1-bios-panel border border-ps1-bios-border hover:border-ps1-cyan-soft rounded tracking-widest"
                    >
                      + ADD PAD
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <div className="p-3 border-t border-ps1-bios-border">
          <p className="font-retro text-[7px] text-ps1-cyan-soft/70 leading-relaxed tracking-widest">
            Tip: Click "+ ADD KEY" or "+ ADD PAD" next to a button, then press the input you
            want to assign. Press Esc to cancel. Multiple inputs can map to the same PS1 button.
          </p>
        </div>
      </div>
    </div>
  )
}

function BindingPill({ label, onRemove }) {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-1 bg-ps1-bios-bg-deep border border-ps1-bios-border rounded font-lcd text-[13px] leading-none text-ps1-ivory">
      <span>{label}</span>
      <button
        onClick={onRemove}
        className="text-ps1-led-red hover:text-ps1-yellow font-bold"
        title="Remove binding"
      >
        ×
      </button>
    </span>
  )
}
