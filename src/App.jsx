import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'
import GamepadIndicator from './components/GamepadIndicator'
import CRTOverlay from './components/CRTOverlay'
import { useGamepad } from './hooks/useGamepad'

/**
 * PS1 console shell.
 *
 * The page is styled as a physical Sony PlayStation (SCPH-1001): a light
 * warm-gray plastic box whose top face hosts the iconic circular disc lid
 * (with its "OPEN" button), the two-letter "PS" logo and a "PlayStation"
 * silkscreen wordmark. The functional TV screen lives inside a recessed
 * black well. The front face carries MEMORY CARD 1/2 slots, CONTROLLER 1/2
 * ports, a rectangular red POWER switch and a dark RESET button.
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

      <div className="w-full max-w-5xl relative animate-fade-in">
        <div className="ps1-shell ps1-plastic-texture rounded-md overflow-hidden">

          {/* ===== Top face ===== */}
          <div className="relative px-8 pt-6 pb-5 border-b border-ps1-plastic-seam/70 bg-ps1-plastic">
            <div className="flex items-start justify-between gap-6">

              {/* Left: PS logo + wordmark + model label */}
              <div className="flex flex-col gap-2 pt-2 select-none">
                <div className="flex items-end gap-1 leading-none">
                  <span className="ps1-logo-p font-ps font-black text-[52px] leading-[0.8]">P</span>
                  <span className="ps1-logo-s font-ps font-black text-[52px] leading-[0.8] -ml-3">S</span>
                </div>
                <div className="ps1-wordmark text-[22px] leading-none">PlayStation</div>
                <div className="font-retro text-[8px] ps1-silkscreen tracking-[0.2em] mt-1">
                  PlayHubGX · SCPH-HUB
                </div>
              </div>

              {/* Right: disc lid */}
              <div className="relative w-[180px] shrink-0">
                <div className="ps1-disc-lid w-full">
                  {/* OPEN button pinned to the top-right of the lid */}
                  <button
                    type="button"
                    onClick={() => { /* cosmetic */ }}
                    className="ps1-open-button absolute top-3 right-3 px-2 py-[3px] rounded-[2px] font-retro text-[7px] tracking-[0.2em] active:translate-y-[1px]"
                    aria-label="OPEN disc lid"
                  >
                    OPEN
                  </button>
                </div>
              </div>
            </div>

            {/* Gamepad indicator absolute top-right so it doesn't compete with the lid */}
            <div className="absolute top-3 left-3">
              <GamepadIndicator
                isConnected={gamepadState.isConnected}
                gamepadId={gamepadState.gamepadId}
                inputSource={gamepadState.isConnected ? 'gamepad' : 'keyboard'}
              />
            </div>
          </div>

          {/* ===== Screen well (functional TV image) ===== */}
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

          {/* ===== Front face (memory cards / controllers / switches) ===== */}
          <div className="bg-ps1-plastic border-t border-ps1-plastic-seam/60">
            <div className="px-8 pt-4 pb-5 flex items-end justify-between gap-6">

              {/* Left column: memory card + controller stack */}
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <CardSlot label="MEMORY CARD 1" />
                  <CardSlot label="MEMORY CARD 2" />
                </div>
                <div className="flex items-center gap-3">
                  <ControllerPort label="CONTROLLER 1" />
                  <ControllerPort label="CONTROLLER 2" />
                </div>
              </div>

              {/* Middle: vents */}
              <div className="hidden md:block flex-1 self-stretch">
                <div className="ps1-vents h-full w-full opacity-70 rounded-sm" />
              </div>

              {/* Right column: POWER + RESET */}
              <div className="flex items-center gap-4">
                <PowerSwitch active={isPoweredOn} onClick={handlePowerToggle} />
                <ResetButton
                  onClick={() => {
                    if (isPoweredOn) handlePowerToggle()
                  }}
                />
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  )
}

function CardSlot({ label }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="ps1-port w-[90px] h-[18px] rounded-[2px] relative flex items-center">
        {/* fake memory card pin strip */}
        <div className="absolute inset-y-1 left-1 right-1 rounded-[1px] opacity-70"
             style={{
               backgroundImage:
                 'repeating-linear-gradient(90deg, rgba(210,210,200,0.4) 0 2px, transparent 2px 5px)',
             }}
        />
      </div>
      <span className="font-retro text-[6px] ps1-silkscreen tracking-[0.18em]">{label}</span>
    </div>
  )
}

function ControllerPort({ label }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div className="ps1-port w-[90px] h-[22px] rounded-t-full rounded-b-[3px] relative overflow-hidden">
        {/* row of fake contact pins */}
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="w-[2px] h-[8px] bg-[#c9b97a]/60 rounded-[1px]" />
          ))}
        </div>
      </div>
      <span className="font-retro text-[6px] ps1-silkscreen tracking-[0.18em]">{label}</span>
    </div>
  )
}

function PowerSwitch({ active, onClick }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className={`ps1-power-switch ${active ? 'is-on' : ''} w-[52px] h-[22px] rounded-[3px] active:translate-y-[1px]`}
        aria-label="POWER"
      >
        <span className="sr-only">Power</span>
      </button>
      <span className="font-retro text-[7px] ps1-silkscreen tracking-[0.22em]">POWER</span>
    </div>
  )
}

function ResetButton({ onClick }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        type="button"
        onClick={onClick}
        className="ps1-button-dark w-[52px] h-[22px] rounded-[3px] active:translate-y-[1px] font-retro text-[7px] tracking-[0.22em]"
        aria-label="RESET"
      >
        RESET
      </button>
      <span className="font-retro text-[7px] ps1-silkscreen tracking-[0.22em]">RESET</span>
    </div>
  )
}

export default App
