/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // --- Legacy tokens (kept so nothing downstream breaks) ---
        'ps1-dark': '#0b0d2b',
        'ps1-gray': '#2a2e55',
        'ps1-light': '#3a3f6e',
        'ps1-accent': '#4a5188',
        'ps1-text': '#d7d9e8',
        'ps1-highlight': '#5a6199',
        'ps1-led-green': '#44cc66',
        'ps1-led-red': '#ff3e6b',

        // --- New authentic PS1 BIOS palette ---
        // Deep navy backgrounds used in the original "Memory Card Manager".
        'ps1-bios-bg': '#0b0d2b',
        'ps1-bios-bg-deep': '#05061a',
        'ps1-bios-panel': '#1a1e48',
        'ps1-bios-border': '#2e3470',
        // Cyan/teal used for selected items and highlights.
        'ps1-cyan': '#00ccff',
        'ps1-cyan-soft': '#7fd8ff',
        'ps1-cyan-deep': '#0088cc',
        // Warm yellows and oranges for confirmation / start buttons.
        'ps1-yellow': '#ffcc33',
        'ps1-yellow-soft': '#ffe07a',
        // PS1 controller face button colours (used for ✕ ○ □ △).
        'ps1-cross':   '#6fb4ff', // blue
        'ps1-circle':  '#ff6b7a', // red/pink
        'ps1-square':  '#ff7ac9', // magenta
        'ps1-triangle':'#46e0a6', // green
        // Ivory / card body colour.
        'ps1-ivory': '#ece9d8',
      },
      fontFamily: {
        // Display font (menu titles, PS1 look): Chakra Petch is a free
        // substitute for the Eurostile-ish typeface used by the original
        // BIOS. Orbitron kept as a fallback for anything still opted in.
        'display': ['"Chakra Petch"', 'Orbitron', 'system-ui', 'sans-serif'],
        'ps': ['"Chakra Petch"', 'Orbitron', 'system-ui', 'sans-serif'],
        // Chunky retro labels.
        'retro': ['"Press Start 2P"', 'monospace', 'system-ui'],
        // LCD-style readouts (room code, ping, ...).
        'lcd': ['"VT323"', 'monospace'],
      },
      boxShadow: {
        'inset': 'inset 2px 2px 5px rgba(0,0,0,0.5), inset -2px -2px 5px rgba(60,60,70,0.3)',
        'block': '4px 4px 10px rgba(0,0,0,0.6), -2px -2px 8px rgba(60,60,70,0.2)',
        'button': '2px 2px 6px rgba(0,0,0,0.5), -1px -1px 4px rgba(60,60,70,0.2)',
        'button-pressed': 'inset 1px 1px 3px rgba(0,0,0,0.6)',
        'screen': 'inset 3px 3px 10px rgba(0,0,0,0.8), 0 0 20px rgba(0,255,65,0.1)',
        'ps1-cyan-glow': '0 0 10px rgba(0,204,255,0.55), 0 0 24px rgba(0,204,255,0.25)',
        'ps1-yellow-glow': '0 0 12px rgba(255,204,51,0.55)',
      },
      borderRadius: {
        'ps': '4px',
        'ps-lg': '8px',
      },
      keyframes: {
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'slide-in-up': {
          '0%':   { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-down': {
          '0%':   { opacity: '0', transform: 'translateY(-12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'zoom-in': {
          '0%':   { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        'spin-diamond': {
          '0%':   { transform: 'rotate(0deg) scale(1)' },
          '50%':  { transform: 'rotate(180deg) scale(1.08)' },
          '100%': { transform: 'rotate(360deg) scale(1)' },
        },
      },
      animation: {
        'fade-in':       'fade-in 260ms ease-out both',
        'slide-in-up':   'slide-in-up 320ms cubic-bezier(0.2,0.8,0.2,1) both',
        'slide-in-down': 'slide-in-down 320ms cubic-bezier(0.2,0.8,0.2,1) both',
        'zoom-in':       'zoom-in 240ms cubic-bezier(0.2,0.8,0.2,1) both',
        'spin-diamond':  'spin-diamond 1.4s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}
