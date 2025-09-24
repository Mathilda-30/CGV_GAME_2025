import { startLevel1 } from './level1.js';
import { startLevel2 } from './level2.js';
import { startLevel3 } from './level3.js';

let currentCleanup = null;

export function startGame() {
  loadLevel(1);
}

export function loadLevel(n) {
  // Clear DOM from previous level
  document.body.innerHTML = "";

  if (currentCleanup) {
    currentCleanup();  // stop animation, dispose resources
    currentCleanup = null;
  }

  if (n === 1) {
    currentCleanup = startLevel1(() => loadLevel(2));
  } else if (n === 2) {
    currentCleanup = startLevel2(() => loadLevel(3));
  } else if (n === 3) {
    currentCleanup = startLevel3(() => {
      alert("You finished the game!");
      document.body.innerHTML = "<h1 style='color:white'>You Win 🎉</h1>";
    });
  }
}
