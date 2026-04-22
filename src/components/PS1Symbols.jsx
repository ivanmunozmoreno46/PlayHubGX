/**
 * PS1 face-button symbols (✕ ○ □ △) rendered as inline SVG in their
 * original controller colours. Designed to sit inline with text at ~1em.
 *
 * Each symbol is a self-contained React component: <Cross /> <Circle />
 * <Square /> <Triangle />. A dispatcher <PS1Symbol shape="cross" /> is
 * exported for dynamic use based on a string key.
 */

function baseProps(size, className, title) {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    role: title ? 'img' : 'presentation',
    'aria-label': title || undefined,
    className: `inline-block align-[-0.15em] ${className || ''}`,
    xmlns: 'http://www.w3.org/2000/svg',
  }
}

export function Cross({ size = 14, className, title = 'Cross' }) {
  // Stylised "✕" in PS1 blue.
  return (
    <svg {...baseProps(size, className, title)}>
      <line
        x1="6" y1="6" x2="18" y2="18"
        stroke="#6fb4ff" strokeWidth="3" strokeLinecap="round"
      />
      <line
        x1="18" y1="6" x2="6" y2="18"
        stroke="#6fb4ff" strokeWidth="3" strokeLinecap="round"
      />
    </svg>
  )
}

export function Circle({ size = 14, className, title = 'Circle' }) {
  // Hollow red/pink circle.
  return (
    <svg {...baseProps(size, className, title)}>
      <circle
        cx="12" cy="12" r="6.5"
        stroke="#ff6b7a" strokeWidth="3" fill="none"
      />
    </svg>
  )
}

export function Square({ size = 14, className, title = 'Square' }) {
  // Hollow magenta/pink square.
  return (
    <svg {...baseProps(size, className, title)}>
      <rect
        x="5.5" y="5.5" width="13" height="13" rx="1"
        stroke="#ff7ac9" strokeWidth="3" fill="none"
      />
    </svg>
  )
}

export function Triangle({ size = 14, className, title = 'Triangle' }) {
  // Hollow green/teal triangle.
  return (
    <svg {...baseProps(size, className, title)}>
      <polygon
        points="12,4 20,19 4,19"
        stroke="#46e0a6" strokeWidth="3" fill="none"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const MAP = {
  cross: Cross,
  circle: Circle,
  square: Square,
  triangle: Triangle,
}

/**
 * Dynamic dispatcher.
 * @param {{ shape: 'cross' | 'circle' | 'square' | 'triangle' }} props
 */
export default function PS1Symbol({ shape, size = 14, className, title }) {
  const Cmp = MAP[shape]
  if (!Cmp) return null
  return <Cmp size={size} className={className} title={title || shape} />
}
