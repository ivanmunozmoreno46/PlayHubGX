import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'

/**
 * PS1 console shell.
 *
 * The whole page behaves as a single viewport-sized "console":
 * - The root is `h-screen` with `overflow-hidden` so the UI never needs
 *   to be scrolled.
 * - The shell is a vertical flex container with a fixed-height top face,
 *   a fluid screen well in the middle (takes all remaining height while
 *   preserving its 4:3 aspect ratio via `min-h-0 + flex-1`) and a fixed-
 *   height front face at the bottom.
 * - Paddings, gaps, font sizes and button diameters use `clamp()` so the
 *   console shrinks gracefully on mobile / narrow viewports without losing
 *   its silhouette.
 */
function App() {
  const [isPoweredOn, setIsPoweredOn] = useState(false)

  const handlePowerToggle = () => {
    setIsPoweredOn(prev => !prev)
  }

  return (
    <div className="h-screen w-screen overflow-hidden flex items-center justify-center p-[clamp(6px,1.5vw,24px)]">
      <div className="w-full max-w-5xl h-full relative animate-fade-in flex">
        <div className="ps1-shell ps1-plastic-texture rounded-md overflow-hidden flex flex-col w-full h-full">

          {/* ===== Top face ===== */}
          <div className="relative shrink-0 bg-ps1-plastic border-b border-ps1-plastic-seam/70
                          px-[clamp(10px,2vw,24px)] py-[clamp(6px,1vh,14px)]">
            <div className="flex items-center justify-between gap-4">

              {/* Left: PS logo + wordmark */}
              <div className="flex items-center gap-3 select-none min-w-0">
                <div className="flex items-end leading-none shrink-0">
                  <span
                    className="ps1-logo-p font-ps font-black leading-[0.8]"
                    style={{ fontSize: 'clamp(20px, 3.2vw, 30px)' }}
                  >
                    P
                  </span>
                  <span
                    className="ps1-logo-s font-ps font-black leading-[0.8] -ml-2"
                    style={{ fontSize: 'clamp(20px, 3.2vw, 30px)' }}
                  >
                    S
                  </span>
                </div>
                <div className="flex flex-col min-w-0">
                  <div
                    className="ps1-wordmark leading-none truncate"
                    style={{ fontSize: 'clamp(10px, 1.4vw, 14px)' }}
                  >
                    PlayStation
                  </div>
                  <div className="font-retro ps1-silkscreen tracking-[0.2em] mt-0.5 hidden sm:block"
                       style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}>
                    PlayHubGX · SCPH-HUB
                  </div>
                </div>
              </div>

              {/* Right: compact disc lid */}
              <div
                className="relative shrink-0"
                style={{ width: 'clamp(56px, 8vw, 92px)' }}
              >
                <div className="ps1-disc-lid w-full" />
              </div>
            </div>
          </div>

          {/* ===== Screen well (functional TV image) ===== */}
          <div className="flex-1 min-h-0 bg-ps1-plastic px-[clamp(10px,2vw,32px)] py-[clamp(6px,1.2vh,20px)]">
            <div className="h-full w-full flex items-center justify-center">
              <div
                className="ps1-well rounded-sm h-full"
                style={{
                  aspectRatio: '4 / 3',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  padding: 'clamp(4px, 0.8vw, 14px)',
                }}
              >
                {isPoweredOn ? (
                  <div className="w-full h-full animate-zoom-in">
                    <EmulatorScreen />
                  </div>
                ) : (
                  <div className="relative w-full h-full overflow-hidden animate-fade-in">
                    <div
                      className="absolute inset-0 opacity-25"
                      style={{
                        backgroundImage:
                          'linear-gradient(rgba(255,255,255,0.10) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.10) 1px, transparent 1px)',
                        backgroundSize: '48px 48px',
                      }}
                    />
                    <div className="relative z-10 w-full h-full flex items-center justify-center">
                      <div className="text-center px-4">
                        <div
                          className="font-ps font-semibold text-ps1-ivory tracking-[0.25em] mb-2"
                          style={{ fontSize: 'clamp(14px, 2.4vw, 24px)' }}
                        >
                          PlayHubGX
                        </div>
                        <div
                          className="font-retro text-ps1-ivory/70 tracking-widest"
                          style={{ fontSize: 'clamp(7px, 0.9vw, 9px)' }}
                        >
                          PRESS <span className="text-ps1-power-red-h">POWER</span> TO START
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ===== Front face ===== */}
          <div className="shrink-0 bg-ps1-plastic border-t border-ps1-plastic-seam/60
                          px-[clamp(10px,2vw,32px)] py-[clamp(6px,1vh,14px)]">
            <div className="flex items-center justify-between gap-3 sm:gap-6">

              {/* Left: POWER */}
              <div className="shrink-0">
                <PowerSwitch active={isPoweredOn} onClick={handlePowerToggle} />
              </div>

              <div className="hidden md:flex flex-1 self-stretch items-center">
                <div className="ps1-vents h-4 w-full opacity-60 rounded-sm" />
              </div>

              {/* Centre: memory cards on top, controller ports below */}
              <div className="flex flex-col items-center gap-2 shrink-0">
                <div className="flex items-center gap-2 sm:gap-3">
                  <CardSlot label="MEMORY CARD 1" />
                  <CardSlot label="MEMORY CARD 2" />
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                  <ControllerPort label="CONTROLLER 1" />
                  <ControllerPort label="CONTROLLER 2" />
                </div>
              </div>

              <div className="hidden md:flex flex-1 self-stretch items-center">
                <div className="ps1-vents h-4 w-full opacity-60 rounded-sm" />
              </div>

              {/* Right: RESET */}
              <div className="shrink-0">
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
      <div
        className="ps1-port rounded-[2px] relative flex items-center"
        style={{ width: 'clamp(54px, 9vw, 90px)', height: 'clamp(12px, 1.8vh, 18px)' }}
      >
        <div
          className="absolute inset-y-1 left-1 right-1 rounded-[1px] opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(90deg, rgba(210,210,200,0.4) 0 2px, transparent 2px 5px)',
          }}
        />
      </div>
      <span
        className="font-retro ps1-silkscreen tracking-[0.18em] hidden sm:block"
        style={{ fontSize: 'clamp(5px, 0.7vw, 7px)' }}
      >
        {label}
      </span>
    </div>
  )
}

function ControllerPort({ label }) {
  return (
    <div className="flex flex-col items-start gap-1">
      <div
        className="ps1-port rounded-t-full rounded-b-[3px] relative overflow-hidden"
        style={{ width: 'clamp(54px, 9vw, 90px)', height: 'clamp(14px, 2.2vh, 22px)' }}
      >
        <div className="absolute inset-x-3 top-1/2 -translate-y-1/2 flex items-center justify-between">
          {Array.from({ length: 9 }).map((_, i) => (
            <span key={i} className="w-[2px] h-[8px] bg-[#c9b97a]/60 rounded-[1px]" />
          ))}
        </div>
      </div>
      <span
        className="font-retro ps1-silkscreen tracking-[0.18em] hidden sm:block"
        style={{ fontSize: 'clamp(5px, 0.7vw, 7px)' }}
      >
        {label}
      </span>
    </div>
  )
}

function PowerSwitch({ active, onClick }) {
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={onClick}
        className={`ps1-round-button ${active ? 'is-on-green' : ''} rounded-full active:translate-y-[1px] flex items-center justify-center`}
        style={{ width: 'clamp(44px, 7vw, 72px)', height: 'clamp(44px, 7vw, 72px)' }}
        aria-label="POWER"
      >
        <svg
          viewBox="0 0 24 24"
          className={active ? 'text-[#57e38a]' : 'text-[#2d9c4f]'}
          style={{
            width: '55%',
            height: '55%',
            filter: active
              ? 'drop-shadow(0 0 6px rgba(87,227,138,0.9))'
              : 'drop-shadow(0 0 2px rgba(45,156,79,0.7))',
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 3v10" />
          <path d="M6.3 7.5a8 8 0 1 0 11.4 0" />
        </svg>
      </button>
      <span
        className="font-retro ps1-silkscreen tracking-[0.22em]"
        style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}
      >
        POWER
      </span>
    </div>
  )
}

function ResetButton({ onClick }) {
  return (
    <div className="flex flex-col items-center gap-1 sm:gap-2">
      <button
        type="button"
        onClick={onClick}
        className="ps1-round-button rounded-full active:translate-y-[1px] flex items-center justify-center"
        style={{ width: 'clamp(44px, 7vw, 72px)', height: 'clamp(44px, 7vw, 72px)' }}
        aria-label="RESET"
      >
        <svg
          viewBox="0 0 24 24"
          className="text-[#4aa8ff]"
          style={{
            width: '55%',
            height: '55%',
            filter: 'drop-shadow(0 0 3px rgba(74,168,255,0.75))',
          }}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </button>
      <span
        className="font-retro ps1-silkscreen tracking-[0.22em]"
        style={{ fontSize: 'clamp(6px, 0.8vw, 8px)' }}
      >
        RESET
      </span>
    </div>
  )
}

export default App
