import { showMenu } from './menu.js';
import { startLevel1 } from './level1.js';
import { startLevel2 } from './level2.js';
import { startLevel3 } from './level3.js';

// Level navigation functions
function goToLevel1() {
  startLevel1(goToLevel2);
}

function goToLevel2() {
  startLevel2(goToLevel3);
}

function goToLevel3() {
  startLevel3(() => {
    alert("You Win! 🎉 Returning to Menu...");
    showMenu(goToLevel1);  // pass the callback again for the menu
  });
}

// Start by showing the menu and pass goToLevel1 as the callback
showMenu(goToLevel1);
