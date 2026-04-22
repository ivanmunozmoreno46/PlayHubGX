import EmulatorScreen from './components/EmulatorScreen'

/**
 * PSX BIOS "Memory Card Manager" desktop.
 *
 * The whole viewport is now a full-screen BIOS-style desktop with a
 * memory-card grid background; the physical PS1 console chassis is gone
 * so the emulator, loader and sala de juego share the same flat surface.
 *
 * Layout contract:
 *   - root = `h-screen w-screen overflow-hidden` → never scrolls.
 *   - EmulatorScreen takes the full area and manages its own internal
 *     states (idle BIOS desktop, loading, running canvas, guest stream).
 */
function App() {
  return (
    <div className="h-screen w-screen overflow-hidden bg-[#0a0a12]">
      <EmulatorScreen />
    </div>
  )
}

export default App
