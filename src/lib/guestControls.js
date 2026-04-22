/**
 * Guest-side control bindings for the Game Room.
 *
 * The Host receives already-translated libretro RetroPad button ids
 * (`{type: 'pad_button', id, value}`) from the Guest over the PeerJS
 * DataChannel, so remapping happens entirely on the Guest's machine.
 *
 * Two input sources are remappable:
 *  - Keyboard: `KeyboardEvent.code` -> libretro id
 *  - Gamepad:  Standard Gamepad button index -> libretro id
 *
 * Analog sticks are NOT remappable (they are always forwarded as the four
 * logical axes `lx/ly/rx/ry`). That keeps the UI simple and matches how
 * most emulator front-ends behave: you remap digital buttons but leave
 * stick axes alone.
 *
 * Bindings are persisted to `localStorage` so the user doesn't have to
 * reconfigure every time they rejoin a room.
 */

// Libretro RetroPad button ids the Guest can drive. These match the ids
// used by EmulatorJS and the values written by `gameManager.simulateInput`
// on the Host. Order defines the order of rows in the UI.
export const PS1_BUTTONS = [
  { id: 4,  label: 'D-PAD UP' },
  { id: 5,  label: 'D-PAD DOWN' },
  { id: 6,  label: 'D-PAD LEFT' },
  { id: 7,  label: 'D-PAD RIGHT' },
  { id: 0,  label: 'CROSS'    },
  { id: 8,  label: 'CIRCLE'   },
  { id: 1,  label: 'SQUARE'   },
  { id: 9,  label: 'TRIANGLE' },
  { id: 10, label: 'L1' },
  { id: 11, label: 'R1' },
  { id: 12, label: 'L2' },
  { id: 13, label: 'R2' },
  { id: 14, label: 'L3' },
  { id: 15, label: 'R3' },
  { id: 2,  label: 'SELECT' },
  { id: 3,  label: 'START'  },
]

export const VALID_LIBRETRO_IDS = new Set(PS1_BUTTONS.map((b) => b.id))

// Default keyboard bindings: `KeyboardEvent.code` -> libretro button id.
// Matches the layout the Game Room panel historically advertised.
export const DEFAULT_KEY_BINDINGS = {
  ArrowUp: 4,    KeyW: 4,
  ArrowDown: 5,  KeyS: 5,
  ArrowLeft: 6,  KeyA: 6,
  ArrowRight: 7, KeyD: 7,
  Enter: 3,      Space: 3,
  ShiftLeft: 2,  ShiftRight: 2,
  KeyZ: 0,   // Cross
  KeyX: 8,   // Circle
  KeyC: 1,   // Square
  KeyV: 9,   // Triangle
  KeyQ: 10,  // L1
  KeyE: 11,  // R1
  KeyR: 12,  // L2
  KeyT: 13,  // R2
}

// Default gamepad bindings: Standard Gamepad button index -> libretro id.
// See https://w3c.github.io/gamepad/#remapping for the canonical layout.
export const DEFAULT_PAD_BINDINGS = {
  0:  0,   // A / South / Cross
  1:  8,   // B / East  / Circle
  2:  1,   // X / West  / Square
  3:  9,   // Y / North / Triangle
  4:  10,  // LB -> L1
  5:  11,  // RB -> R1
  6:  12,  // LT -> L2
  7:  13,  // RT -> R2
  8:  2,   // Select / Back
  9:  3,   // Start
  10: 14,  // L-stick press -> L3
  11: 15,  // R-stick press -> R3
  12: 4,   // D-Up
  13: 5,   // D-Down
  14: 6,   // D-Left
  15: 7,   // D-Right
}

const STORAGE_KEY = 'playhubgx.guestControls.v1'

export function defaultBindings() {
  return {
    keys: { ...DEFAULT_KEY_BINDINGS },
    pad:  { ...DEFAULT_PAD_BINDINGS },
  }
}

/**
 * Load bindings from `localStorage`, falling back to defaults when the
 * stored value is missing or corrupted. Always returns a fully-formed
 * object with `keys` and `pad` sub-objects.
 */
export function loadBindings() {
  if (typeof localStorage === 'undefined') return defaultBindings()
  let raw
  try {
    raw = localStorage.getItem(STORAGE_KEY)
  } catch (_) {
    return defaultBindings()
  }
  if (!raw) return defaultBindings()
  let parsed
  try {
    parsed = JSON.parse(raw)
  } catch (_) {
    return defaultBindings()
  }
  if (!parsed || typeof parsed !== 'object') return defaultBindings()
  const rawKeys = parsed.keys && typeof parsed.keys === 'object' ? parsed.keys : {}
  const rawPad  = parsed.pad  && typeof parsed.pad  === 'object' ? parsed.pad  : {}
  const keys = {}
  Object.entries(rawKeys).forEach(([code, id]) => {
    const libretroId = Number(id)
    if (typeof code === 'string' && VALID_LIBRETRO_IDS.has(libretroId)) {
      keys[code] = libretroId
    }
  })
  const pad = {}
  Object.entries(rawPad).forEach(([idx, id]) => {
    const padIndex   = Number(idx)
    const libretroId = Number(id)
    if (Number.isInteger(padIndex) && padIndex >= 0 && padIndex < 32 &&
        VALID_LIBRETRO_IDS.has(libretroId)) {
      pad[padIndex] = libretroId
    }
  })
  return { keys, pad }
}

export function saveBindings(bindings) {
  if (typeof localStorage === 'undefined' || !bindings) return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(bindings))
  } catch (_) { /* noop — storage quota / disabled */ }
}

export function clearStoredBindings() {
  if (typeof localStorage === 'undefined') return
  try { localStorage.removeItem(STORAGE_KEY) } catch (_) { /* noop */ }
}

/**
 * Build an inverse index: `{libretroId: {keys: [code], pad: [index]}}`
 * so the UI can render every binding associated with each PS1 button.
 */
export function indexBindings(bindings) {
  const result = {}
  PS1_BUTTONS.forEach((b) => { result[b.id] = { keys: [], pad: [] } })
  Object.entries(bindings.keys || {}).forEach(([code, id]) => {
    if (result[id]) result[id].keys.push(code)
  })
  Object.entries(bindings.pad || {}).forEach(([idx, id]) => {
    if (result[id]) result[id].pad.push(Number(idx))
  })
  Object.values(result).forEach((entry) => {
    entry.keys.sort()
    entry.pad.sort((a, b) => a - b)
  })
  return result
}

/**
 * Return a new bindings object with an additional `code -> id` entry.
 * Replaces any existing mapping of that key so the same input never
 * drives two different PS1 buttons.
 */
export function setKeyBinding(bindings, code, libretroId) {
  if (!code || !VALID_LIBRETRO_IDS.has(libretroId)) return bindings
  const keys = { ...bindings.keys, [code]: libretroId }
  return { ...bindings, keys }
}

export function removeKeyBinding(bindings, code) {
  if (!bindings.keys || !(code in bindings.keys)) return bindings
  const keys = { ...bindings.keys }
  delete keys[code]
  return { ...bindings, keys }
}

export function setPadBinding(bindings, padIndex, libretroId) {
  if (!Number.isInteger(padIndex) || !VALID_LIBRETRO_IDS.has(libretroId)) return bindings
  const pad = { ...bindings.pad, [padIndex]: libretroId }
  return { ...bindings, pad }
}

export function removePadBinding(bindings, padIndex) {
  const key = String(padIndex)
  if (!bindings.pad || !(key in bindings.pad)) return bindings
  const pad = { ...bindings.pad }
  delete pad[key]
  return { ...bindings, pad }
}

/**
 * Short human-readable label for a `KeyboardEvent.code`. Prefer what a user
 * would recognise on their keyboard: "Z", "↑", "Enter", "L Shift", ...
 */
export function humanKeyLabel(code) {
  if (!code) return ''
  const arrow = { ArrowUp: '↑', ArrowDown: '↓', ArrowLeft: '←', ArrowRight: '→' }
  if (arrow[code]) return arrow[code]
  if (code.startsWith('Key')) return code.slice(3)
  if (code.startsWith('Digit')) return code.slice(5)
  if (code === 'Space') return 'Space'
  if (code === 'Enter') return 'Enter'
  if (code === 'Escape') return 'Esc'
  if (code === 'Tab') return 'Tab'
  if (code === 'Backspace') return 'Backspace'
  if (code === 'ShiftLeft') return 'L Shift'
  if (code === 'ShiftRight') return 'R Shift'
  if (code === 'ControlLeft') return 'L Ctrl'
  if (code === 'ControlRight') return 'R Ctrl'
  if (code === 'AltLeft') return 'L Alt'
  if (code === 'AltRight') return 'R Alt'
  if (code === 'MetaLeft') return 'L Meta'
  if (code === 'MetaRight') return 'R Meta'
  return code
}

const PAD_BUTTON_NAMES = [
  'A / South', 'B / East', 'X / West', 'Y / North',
  'LB', 'RB', 'LT', 'RT',
  'Select / Back', 'Start', 'L-Stick', 'R-Stick',
  'D-Up', 'D-Down', 'D-Left', 'D-Right',
]

export function humanPadLabel(index) {
  if (!Number.isInteger(index) || index < 0) return `PAD ${index}`
  return PAD_BUTTON_NAMES[index] || `PAD ${index}`
}
