// src/main.js
import { showMenu } from './menu.js';
import { startLevel1 } from './level1.js';
import { startLevel2 } from './level2.js';
import { startLevel3 } from './level3.js';

export function goToLevel1() {
  startLevel1(goToLevel2);
}
export function goToLevel2() {
  startLevel2(goToLevel3);
}
export function goToLevel3() {
  startLevel3(() => {
    alert("You Win! 🎉 Returning to Menu...");
    showMenu();
  });
}

showMenu();
