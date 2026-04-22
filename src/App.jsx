import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'
import GamepadIndicator from './components/GamepadIndicator'
import CRTOverlay from './components/CRTOverlay'
import { useGamepad } from './hooks/useGamepad'

/**
 * PS1 console shell.
 *
 * The page is styled to read as a physical SCPH-1001-style PlayStation 1
 * sitting on a desk: light warm gray plastic shell with a dark disc-lid
 * area at the top, a front face with POWER (red), RESET (black) and OPEN
 * (gray) buttons, a small PS logo, and a screen "well" cut into the front
 * that hosts the emulator UI when powered on.
 */
function App() {
  const [isPoweredOn, setIsPoweredOn] = useState(false)

  const { gamepadState } = useGamepad()

  const handlePowerToggle = () => {
    setIsPoweredOn(prev => !prev)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <CRTOverlay />

      {/* Outer plastic shell */}
      <div className="w-full max-w-5xl relative animate-fade-in">
        <div className="ps1-shell ps1-plastic-texture rounded-md overflow-hidden">

          {/* ---------- Disc lid (top dark plastic slab) ---------- */}
          <div className="ps1-shell-dark px-6 py-4 border-b border-ps1-plastic-seam flex items-center justify-between">
            <div className="flex items-center gap-3 select-none">
              {/* PS logo in the four face-button colours */}
              <div className="flex items-baseline">
                <span className="font-ps font-bold text-ps1-cross text-[22px] leading-none drop-shadow-sm">P</span>
                <span className="font-ps font-bold text-ps1-circle text-[22px] leading-none drop-shadow-sm">S</span>
              </div>
              <div className="h-5 w-px bg-ps1-plastic-seam/80" />
              <span className="font-ps font-semibold text-[13px] ps1-silkscreen tracking-[0.3em]">
                PlayHubGX
              </span>
            </div>

            <div className="flex items-center gap-4">
              <GamepadIndicator
                isConnected={gamepadState.isConnected}
                gamepadId={gamepadState.gamepadId}
                inputSource={gamepadState.isConnected ? 'gamepad' : 'keyboard'}
              />
              {/* Model label like the original silkscreen on the lid */}
              <span className="font-retro text-[7px] ps1-silkscreen hidden sm:inline">
                SCPH-HUB
              </span>
            </div>
          </div>

          {/* ---------- Screen well (emulator / off-screen) ---------- */}
          <div className="px-8 py-6 bg-ps1-plastic">
            <div className="mx-auto" style={{ maxWidth: '820px' }}>
              <div className="ps1-well rounded-sm p-4">
                {isPoweredOn ? (
                  <div className="animate-zoom-in">
                    <EmulatorScreen />
                  </div>
                ) : (
                  <div
                    className="relative w-full overflow-hidden animate-fade-in"
                    style={{ aspectRatio: '4/3' }}
                  >
                    {/* Faint inner grid */}
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                      }}
                    />
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      <div className="text-center">
                        <div className="font-ps font-semibold text-ps1-ivory text-2xl tracking-[0.25em] mb-3">
                          PlayHubGX
                        </div>
                        <div className="font-retro text-[8px] text-ps1-ivory/70 tracking-widest">
                          PRESS <span className="text-ps1-power-red-h">POWER</span> TO START
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ---------- Front face (POWER / RESET / OPEN row) ---------- */}
          <div className="ps1-shell-dark border-t border-ps1-plastic-seam/70 px-8 py-4">
            <div className="flex items-center justify-between gap-6">

              {/* Vents (decorative slats like on the real shell) */}
              <div className="ps1-vents h-6 flex-1 rounded-sm opacity-70" />

              {/* Buttons row */}
              <div className="flex items-end gap-6">
                <FaceButton
                  color="power"
                  active={isPoweredOn}
                  label="POWER"
                  onClick={handlePowerToggle}
                />
                <FaceButton
                  color="reset"
                  label="RESET"
                  onClick={() => isPoweredOn && handlePowerToggle()}
                />
                <FaceButton
                  color="open"
                  label="OPEN"
                  onClick={() => { /* cosmetic; disc is abstracted */ }}
                />
              </div>

              <div className="ps1-vents h-6 flex-1 rounded-sm opacity-70" />
            </div>
          </div>

          {/* ---------- Bottom lip (memory card / controller ports silkscreen) ---------- */}
          <div className="bg-ps1-plastic-dark border-t border-ps1-plastic-seam px-6 py-2">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <PortSlot label="MEMORY CARD 1" />
                <PortSlot label="MEMORY CARD 2" />
              </div>
              <span className="font-retro text-[7px] ps1-silkscreen">
                32 BIT RISC CPU
              </span>
              <div className="flex items-center gap-3">
                <PortSlot label="CONTROLLER 1" />
                <PortSlot label="CONTROLLER 2" />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function FaceButton({ color, active, label, onClick }) {
  const palette = (() => {
    switch (color) {
      case 'power':
        return {
          body: active
            ? 'bg-ps1-power-red-h'
            : 'bg-ps1-power-red hover:bg-ps1-power-red-h',
          ring: 'border-ps1-plastic-seam',
          led: active ? 'bg-ps1-led-green shadow-[0_0_8px_rgba(68,204,102,0.7)]' : 'bg-ps1-led-red',
          text: 'text-ps1-plastic-light',
        }
      case 'reset':
        return {
          body: 'bg-ps1-reset-black hover:bg-black',
          ring: 'border-ps1-plastic-seam',
          led: 'bg-ps1-led-red/60',
          text: 'text-ps1-plastic-light',
        }
      case 'open':
      default:
        return {
          body: 'bg-ps1-open-gray hover:bg-ps1-plastic-light',
          ring: 'border-ps1-plastic-seam',
          led: 'bg-ps1-plastic-dark',
          text: 'text-ps1-ink',
        }
    }
  })()

  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={`
          w-10 h-10 rounded-full border-2 ${palette.ring} ${palette.body}
          shadow-[inset_1px_1px_0_rgba(255,255,255,0.25),inset_-1px_-1px_0_rgba(0,0,0,0.35),0_2px_4px_rgba(0,0,0,0.5)]
          active:translate-y-0.5 active:shadow-inner
          transition-all
        `}
        aria-label={label}
      >
        <span className={`block w-1.5 h-1.5 mx-auto rounded-full ${palette.led}`} />
      </button>
      <span className={`font-retro text-[7px] tracking-widest ${palette.text} ps1-silkscreen`}>
        {label}
      </span>
    </div>
  )
}

function PortSlot({ label }) {
  return (
    <div className="flex items-center gap-2" title={label}>
      <span className="inline-block w-6 h-2 rounded-[1px] bg-ps1-inner border border-ps1-plastic-seam/60" />
      <span className="font-retro text-[6px] ps1-silkscreen hidden md:inline">{label}</span>
    </div>
  )
}

export default App
