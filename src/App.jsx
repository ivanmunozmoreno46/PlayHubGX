import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'
import GamepadIndicator from './components/GamepadIndicator'
import CRTOverlay from './components/CRTOverlay'
import { useGamepad } from './hooks/useGamepad'

function App() {
  const [isPoweredOn, setIsPoweredOn] = useState(false)

  const { gamepadState } = useGamepad()

  const handlePowerToggle = () => {
    setIsPoweredOn(prev => !prev)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <CRTOverlay />

      {/* Main Console Container */}
      <div className="w-full max-w-4xl relative">

        {/* Console Body - Deep navy chassis, PS1 BIOS vibe */}
        <div
          className="rounded-lg overflow-hidden border border-ps1-bios-border animate-fade-in"
          style={{
            backgroundColor: '#111435',
            boxShadow:
              '0 12px 40px rgba(0,0,0,0.55), inset 0 1px 0 rgba(0,204,255,0.12)',
          }}
        >

          {/* Top Bar - PS1 Logo + Controls */}
          <div
            className="px-6 py-3 flex items-center justify-between border-b border-ps1-bios-border"
            style={{ backgroundColor: '#0c0e2a' }}
          >
            <div className="flex items-center gap-4">
              {/* PS Logo */}
              <div className="flex items-center select-none">
                <span className="font-ps font-bold text-ps1-cross text-2xl glow-cyan">P</span>
                <span className="font-ps font-bold text-ps1-circle text-2xl">S</span>
              </div>
              <div className="h-5 w-px bg-ps1-bios-border"></div>
              <span className="font-ps font-semibold text-[13px] text-ps1-cyan-soft tracking-[0.25em] glow-cyan">
                PlayHubGX
              </span>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <GamepadIndicator
                isConnected={gamepadState.isConnected}
                gamepadId={gamepadState.gamepadId}
                inputSource={gamepadState.isConnected ? 'gamepad' : 'keyboard'}
              />

              {/* Power LED */}
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isPoweredOn
                  ? 'bg-ps1-led-green shadow-[0_0_6px_rgba(68,204,102,0.8)]'
                  : 'bg-ps1-led-red'}`}></div>
                <span className="font-retro text-[7px] text-ps1-cyan-soft/80">PWR</span>
              </div>

              {/* Circular Power Button */}
              <button
                onClick={handlePowerToggle}
                className={`
                  w-14 h-14 rounded-full font-retro text-[8px] transition-all active:scale-95
                  ${isPoweredOn
                    ? 'bg-ps1-led-green text-black border-2 border-ps1-led-green'
                    : 'bg-ps1-bios-panel text-ps1-cyan-soft border-2 border-ps1-bios-border hover:border-ps1-cyan'
                  }
                `}
                style={{
                  boxShadow: isPoweredOn
                    ? '0 0 18px rgba(68,204,102,0.6), inset 0 2px 0 rgba(255,255,255,0.3)'
                    : '0 4px 10px rgba(0,0,0,0.4), inset 0 2px 0 rgba(0,204,255,0.15)',
                }}
              >
                POWER
              </button>
            </div>
          </div>

          {/* Screen Container - 4:3 Aspect Ratio */}
          <div className="p-6" style={{ backgroundColor: '#0a0c25' }}>
            <div className="mx-auto" style={{ maxWidth: '800px' }}>
              {isPoweredOn ? (
                <div className="animate-zoom-in">
                  <EmulatorScreen />
                </div>
              ) : (
                /* Screen Off - dark BIOS-style grid */
                <div
                  className="relative w-full overflow-hidden border border-ps1-bios-border rounded-sm animate-fade-in"
                  style={{
                    aspectRatio: '4/3',
                    backgroundColor: '#05061a',
                    boxShadow: 'inset 0 0 80px rgba(0,0,0,0.8)',
                  }}
                >
                  {/* Faint BIOS grid */}
                  <div
                    className="absolute inset-0 opacity-30"
                    style={{
                      backgroundImage:
                        'linear-gradient(rgba(0,204,255,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(0,204,255,0.12) 1px, transparent 1px)',
                      backgroundSize: '48px 48px',
                    }}
                  />

                  {/* Off screen message */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-ps font-semibold text-ps1-yellow text-2xl tracking-[0.25em] mb-3 glow-yellow">
                        PlayHubGX
                      </div>
                      <div className="font-retro text-[8px] text-ps1-cyan-soft tracking-widest">
                        PRESS <span className="text-ps1-yellow">POWER</span> TO START
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="px-6 py-2 border-t border-ps1-bios-border" style={{ backgroundColor: '#0c0e2a' }}>
            <div className="flex items-center justify-between">
              <div className="font-retro text-[7px] text-ps1-cyan-soft/70">
                32 BIT RISC CPU
              </div>
              <div className="font-retro text-[7px] text-ps1-cyan-soft/70">
                © PlayHubGX
              </div>
              <div className="font-retro text-[7px] text-ps1-cyan-soft/70">
                SCPH-HUB
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
