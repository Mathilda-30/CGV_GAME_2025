let hud, counter = 0;

export function showHUD() {
  hud = document.createElement('div');
  hud.style.position = 'absolute';
  hud.style.top = '10px';
  hud.style.left = '10px';
  hud.style.color = 'white';
  hud.style.fontFamily = 'sans-serif';
  hud.innerHTML = 'Crystals: 0';
  document.body.appendChild(hud);
}

export function updateHUD(val) {
  counter = val;
  if (hud) hud.innerHTML = `Crystals: ${counter}`;
}

export function resetCounter() { counter = 0; }
export function getCounter() { return counter; }
