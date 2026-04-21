import { useState } from 'react'
import EmulatorScreen from './components/EmulatorScreen'
import GamepadIndicator from './components/GamepadIndicator'
import { useGamepad } from './hooks/useGamepad'

function App() {
  const [isPoweredOn, setIsPoweredOn] = useState(false)

  const { gamepadState } = useGamepad()

  const handlePowerToggle = () => {
    setIsPoweredOn(prev => !prev)
  }

  return (
    <div className="min-h-screen bg-gray-300 flex items-center justify-center p-4">
      {/* Main Console Container - Light Gray PS1 Style */}
      <div className="w-full max-w-4xl">
        
        {/* Console Body - Medium Gray */}
        <div 
          className="rounded-lg overflow-hidden"
          style={{ 
            backgroundColor: '#909090',
            boxShadow: '0 8px 32px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          
          {/* Top Bar - PS1 Logo + Controls */}
          <div className="px-6 py-3 flex items-center justify-between border-b border-gray-500"
               style={{ backgroundColor: '#787878' }}>
            <div className="flex items-center gap-4">
              {/* PS Logo */}
              <div className="flex items-center">
                <span className="font-ps text-blue-500 text-xl">P</span>
                <span className="font-ps text-red-500 text-xl">S</span>
              </div>
              <div className="h-5 w-px bg-gray-400"></div>
              <span className="font-retro text-[8px] text-gray-600 tracking-widest">
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
                <div className={`w-2 h-2 rounded-full ${isPoweredOn ? 'bg-green-500' : 'bg-red-500'}`}></div>
                <span className="font-retro text-[7px] text-gray-600">PWR</span>
              </div>
              
              {/* Circular Power Button */}
              <button
                onClick={handlePowerToggle}
                className={`
                  w-14 h-14 rounded-full font-retro text-[8px] transition-all active:scale-95
                  ${isPoweredOn 
                    ? 'bg-green-500 text-white border-2 border-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]' 
                    : 'bg-gray-400 text-gray-700 border-2 border-gray-300'
                  }
                `}
                style={{
                  boxShadow: isPoweredOn 
                    ? '0 0 15px rgba(34,197,94,0.5), inset 0 2px 0 rgba(255,255,255,0.3)'
                    : '0 4px 8px rgba(0,0,0,0.2), inset 0 2px 0 rgba(255,255,255,0.4)',
                }}
              >
                POWER
              </button>
            </div>
          </div>

          {/* Screen Container - 4:3 Aspect Ratio */}
          <div className="p-6" style={{ backgroundColor: '#707070' }}>
            <div className="mx-auto" style={{ maxWidth: '800px' }}>
              {isPoweredOn ? (
                <EmulatorScreen />
              ) : (
                /* Screen Off - Medium Gray Grid */
                <div className="relative w-full border-2 border-gray-500 overflow-hidden"
                     style={{ aspectRatio: '4/3', backgroundColor: '#585858' }}>
                  {/* Grid pattern */}
                  <div className="absolute inset-0 grid grid-cols-12 grid-rows-8 gap-0">
                    {Array.from({ length: 96 }).map((_, i) => (
                      <div key={i} className="border border-gray-600" style={{
                        backgroundColor: '#484848',
                        boxShadow: 'inset 1px 1px 0 #585858, inset -1px -1px 0 #383838',
                      }}></div>
                    ))}
                  </div>
                  
                  {/* Off screen message */}
                  <div className="relative z-10 w-full h-full flex items-center justify-center">
                    <div className="text-center">
                      <div className="font-retro text-[12px] text-yellow-600 mb-2">
                        PlayHubGX
                      </div>
                      <div className="font-retro text-[8px] text-gray-600">
                        PRESS POWER TO START
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="px-6 py-2 border-t border-gray-500" style={{ backgroundColor: '#787878' }}>
            <div className="flex items-center justify-between">
              <div className="font-retro text-[7px] text-gray-600">
                32 BIT RISC CPU
              </div>
              <div className="font-retro text-[7px] text-gray-600">
                © Sony Computer Entertainment
              </div>
              <div className="font-retro text-[7px] text-gray-600">
                SCPH-1001
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App
