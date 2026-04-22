import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'

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

  const handlePowerToggle = () => {
    setIsPoweredOn(prev => !prev)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-5xl relative animate-fade-in">
        <div className="ps1-shell ps1-plastic-texture rounded-md overflow-hidden">

          {/* ===== Top face (compact) ===== */}
          <div className="relative px-6 py-3 border-b border-ps1-plastic-seam/70 bg-ps1-plastic">
            <div className="flex items-center justify-between gap-6">

              {/* Left: PS logo + wordmark */}
              <div className="flex items-center gap-3 select-none">
                <div className="flex items-end leading-none">
                  <span className="ps1-logo-p font-ps font-black text-[30px] leading-[0.8]">P</span>
                  <span className="ps1-logo-s font-ps font-black text-[30px] leading-[0.8] -ml-2">S</span>
                </div>
                <div className="flex flex-col">
                  <div className="ps1-wordmark text-[14px] leading-none">PlayStation</div>
                  <div className="font-retro text-[7px] ps1-silkscreen tracking-[0.2em] mt-1">
                    PlayHubGX · SCPH-HUB
                  </div>
                </div>
              </div>

              {/* Right: compact disc lid */}
              <div className="relative w-[92px] shrink-0">
                <div className="ps1-disc-lid w-full" />
              </div>
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

          {/* ===== Front face =====
           * Layout: POWER (left), memory cards + controller ports (centre),
           * RESET (right). Thin vent strips fill the gaps on either side of
           * the centre block.
           */}
          <div className="bg-ps1-plastic border-t border-ps1-plastic-seam/60">
            <div className="px-8 pt-4 pb-5 flex items-center justify-between gap-6">

              {/* Left: POWER */}
              <div className="shrink-0">
                <PowerSwitch active={isPoweredOn} onClick={handlePowerToggle} />
              </div>

              <div className="hidden md:block flex-1 self-stretch">
                <div className="ps1-vents h-5 w-full opacity-60 rounded-sm my-auto" />
              </div>

              {/* Centre: memory cards on top, controller ports below */}
              <div className="flex flex-col items-center gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <CardSlot label="MEMORY CARD 1" />
                  <CardSlot label="MEMORY CARD 2" />
                </div>
                <div className="flex items-center gap-3">
                  <ControllerPort label="CONTROLLER 1" />
                  <ControllerPort label="CONTROLLER 2" />
                </div>
              </div>

              <div className="hidden md:block flex-1 self-stretch">
                <div className="ps1-vents h-5 w-full opacity-60 rounded-sm my-auto" />
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
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className={`ps1-round-button ${active ? 'is-on-green' : ''} w-[72px] h-[72px] rounded-full active:translate-y-[1px] flex items-center justify-center`}
        aria-label="POWER"
      >
        <svg
          viewBox="0 0 24 24"
          className={`w-9 h-9 ${active ? 'text-[#57e38a]' : 'text-[#2d9c4f]'}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: active ? 'drop-shadow(0 0 6px rgba(87,227,138,0.9))' : 'drop-shadow(0 0 2px rgba(45,156,79,0.7))' }}
        >
          <path d="M12 3v10" />
          <path d="M6.3 7.5a8 8 0 1 0 11.4 0" />
        </svg>
      </button>
      <span className="font-retro text-[8px] ps1-silkscreen tracking-[0.22em]">POWER</span>
    </div>
  )
}

function ResetButton({ onClick }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        onClick={onClick}
        className="ps1-round-button w-[72px] h-[72px] rounded-full active:translate-y-[1px] flex items-center justify-center"
        aria-label="RESET"
      >
        <svg
          viewBox="0 0 24 24"
          className="w-9 h-9 text-[#4aa8ff]"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ filter: 'drop-shadow(0 0 3px rgba(74,168,255,0.75))' }}
        >
          <path d="M3 12a9 9 0 1 0 3-6.7" />
          <path d="M3 4v5h5" />
        </svg>
      </button>
      <span className="font-retro text-[8px] ps1-silkscreen tracking-[0.22em]">RESET</span>
    </div>
  )
}

export default App
