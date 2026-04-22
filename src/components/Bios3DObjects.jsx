/**
 * CSS-only 3D BIOS objects used inside the PS1 Memory Card Manager loader.
 *
 * Both `Wrench3D` and `Disc3D` sit inside a perspective stage that rotates
 * the object slowly around the Y axis (`.spin-y` in index.css), and each
 * one is followed by a mirrored copy scaled with `scaleY(-1)` and faded
 * through a CSS mask to simulate a shiny floor reflection.
 *
 * The shape is an inline SVG for the wrench (so strokes stay crisp) and a
 * stack of radial + conic gradients for the disc (so the rainbow sheen
 * reacts naturally to the rotation via the transform on the parent).
 */

function WrenchSVG({ accent = '#00ccff' }) {
  return (
    <svg
      viewBox="0 0 64 64"
      className="w-full h-full"
      style={{
        filter: `drop-shadow(0 0 6px ${accent}66) drop-shadow(0 2px 2px rgba(0,0,0,0.55))`,
      }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="wrench-steel" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0f3f8" />
          <stop offset="45%" stopColor="#b7bdc8" />
          <stop offset="60%" stopColor="#8c95a3" />
          <stop offset="100%" stopColor="#3b424d" />
        </linearGradient>
        <linearGradient id="wrench-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="100%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
      </defs>

      {/* Main wrench body (rotated 45° so it reads as a tool at rest). */}
      <g transform="rotate(45 32 32)">
        {/* Shaft */}
        <rect
          x="28"
          y="14"
          width="8"
          height="36"
          rx="2"
          fill="url(#wrench-steel)"
          stroke="#23272f"
          strokeWidth="1"
        />
        {/* Upper open-end head */}
        <path
          d="M18 6 h28 a4 4 0 0 1 4 4 v8 a4 4 0 0 1 -4 4 h-6 v6 h-16 v-6 h-6 a4 4 0 0 1 -4 -4 v-8 a4 4 0 0 1 4 -4 z"
          fill="url(#wrench-steel)"
          stroke="#23272f"
          strokeWidth="1.2"
        />
        {/* Jaw gap */}
        <rect x="28" y="10" width="8" height="10" rx="1" fill="#0b0d1a" />
        {/* Lower box-end ring */}
        <circle cx="32" cy="52" r="8" fill="url(#wrench-steel)" stroke="#23272f" strokeWidth="1.2" />
        <circle cx="32" cy="52" r="4" fill="#0b0d1a" />
        {/* Highlight strip */}
        <rect x="29.5" y="15" width="2" height="33" fill="url(#wrench-shine)" opacity="0.9" />
      </g>
    </svg>
  )
}

function DiscArt({ accent = '#ffcc33' }) {
  return (
    <div
      className="w-full h-full rounded-full relative"
      style={{
        background: [
          // Central data surface with rainbow sheen
          `conic-gradient(from 210deg, #00d0ff 0deg, #a060ff 60deg, #ff4090 120deg, #ffcf40 180deg, #60ff9a 240deg, #40c9ff 300deg, #00d0ff 360deg)`,
        ].join(','),
        boxShadow: `0 0 14px ${accent}55, inset 0 0 22px rgba(0,0,0,0.45), inset 0 0 0 2px rgba(255,255,255,0.25)`,
      }}
    >
      {/* Outer thin silver rim */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          boxShadow:
            'inset 0 0 0 2px #e3e4e8, inset 0 0 0 4px #20232a, inset 0 0 0 5px #4a4e57',
          pointerEvents: 'none',
        }}
      />
      {/* Inner clear band (where labels normally sit) */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '32%',
          background:
            'radial-gradient(circle at 40% 35%, #f4f4f2 0%, #cbcac5 60%, #8f8e8a 100%)',
          boxShadow:
            'inset 0 0 0 1px #40444b, inset 0 2px 6px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(255,255,255,0.5)',
        }}
      >
        {/* Label text */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="font-ps font-black text-[9px] tracking-[0.2em] text-[#333]">
            PlayHubGX
          </span>
        </div>
      </div>
      {/* Spindle hole */}
      <div
        className="absolute rounded-full"
        style={{
          inset: '46%',
          background: '#0b0d1a',
          boxShadow:
            'inset 0 0 0 1px #000, 0 0 0 1px rgba(255,255,255,0.25)',
        }}
      />
      {/* Subtle highlight */}
      <div
        className="absolute inset-0 rounded-full pointer-events-none"
        style={{
          background:
            'radial-gradient(ellipse at 30% 20%, rgba(255,255,255,0.35) 0%, rgba(255,255,255,0) 45%)',
        }}
      />
    </div>
  )
}

function Reflection({ children }) {
  return (
    <div
      className="absolute left-0 right-0"
      style={{
        top: '66%',
        bottom: 0,
        WebkitMaskImage:
          'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0) 80%)',
        maskImage:
          'linear-gradient(to bottom, rgba(0,0,0,0.45) 0%, rgba(0,0,0,0.10) 40%, rgba(0,0,0,0) 80%)',
        pointerEvents: 'none',
      }}
    >
      <div
        className="w-full h-full origin-top"
        style={{ transform: 'scaleY(-1)' }}
      >
        {children}
      </div>
    </div>
  )
}

export function Wrench3D({ accent = '#44cc66' }) {
  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <div className="relative w-[66%]" style={{ aspectRatio: '1 / 1' }}>
        {/* Floor reflection (mirrored copy, same rotation cycle) */}
        <Reflection>
          <div className="stage-3d w-full h-full">
            <div className="spin-y w-full h-full">
              <WrenchSVG accent={accent} />
            </div>
          </div>
        </Reflection>
        {/* Main spinning object */}
        <div className="stage-3d absolute inset-0">
          <div className="spin-y w-full h-full">
            <WrenchSVG accent={accent} />
          </div>
        </div>
      </div>
    </div>
  )
}

export function Disc3D({ accent = '#ffcc33' }) {
  return (
    <div className="relative w-full h-full flex items-end justify-center">
      <div className="relative w-[68%]" style={{ aspectRatio: '1 / 1' }}>
        <Reflection>
          <div className="stage-3d w-full h-full">
            <div className="spin-y-reverse w-full h-full">
              <DiscArt accent={accent} />
            </div>
          </div>
        </Reflection>
        <div className="stage-3d absolute inset-0">
          <div className="spin-y-reverse w-full h-full">
            <DiscArt accent={accent} />
          </div>
        </div>
      </div>
    </div>
  )
}
