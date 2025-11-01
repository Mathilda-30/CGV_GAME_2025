// This file will track the state of keyboard keys

// This object will store the state (true/false) of the keys we care about.
export const keys = {
  w: { pressed: false },
  a: { pressed: false },
  s: { pressed: false },
  d: { pressed: false },
  space: { pressed: false, justPressed: false }, // <-- No change needed here
};

// This function sets up the event listeners.
// We'll call this once from level3.js.
export function initInput() {
  
  // Listens for when a key is pressed down
  window.addEventListener('keydown', (e) => {
    // We use e.key.toLowerCase() to handle 'W' and 'w' as the same key.
    switch (e.key.toLowerCase()) {
      case 'w':
        keys.w.pressed = true;
        break;
      case 'a':
        keys.a.pressed = true;
        break;
      case 's':
        keys.s.pressed = true;
        break;
      case 'd':
        keys.d.pressed = true;
        break;
      case ' ': // Space bar
        // --- FIX: This block implements 'justPressed' ---
        if (!keys.space.pressed) { // Only set justPressed if it wasn't already down
          keys.space.justPressed = true;
        }
        keys.space.pressed = true;
        break;
    }
  });

  // Listens for when a key is released
  window.addEventListener('keyup', (e) => {
    switch (e.key.toLowerCase()) {
      case 'w':
        keys.w.pressed = false;
        break;
      case 'a':
        keys.a.pressed = false;
        break;
      case 's':
        keys.s.pressed = false;
        break;
      case 'd':
        keys.d.pressed = false;
        break;
      case ' ': // Space bar
        keys.space.pressed = false;
        keys.space.justPressed = false; // --- FIX: Reset justPressed on keyup ---
        break;
    }
  });
}

// --- FIX: ADD THIS NEW EXPORTED FUNCTION ---
// This resets the "justPressed" state at the end of a frame.
export function resetJustPressed() {
  keys.space.justPressed = false;
}