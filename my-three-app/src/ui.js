// src/ui.js
let hud, counter = 0;

// === TIMER LOGIC ===
let totalTime = 15;
let timeLeft = totalTime;
let lastUpdate = performance.now();
let isPaused = false;
let timerRunning = false;
let timerRAF = null;
let onTimerEnd = null;
let lastDisplayedSecond = null;

let pauseOverlay = null;
let pauseBtn = null;

// === HUD (Crystals) ===
// === HUD (Crystals) ===
export function showHUD() {
  const oldHud = document.getElementById('crystal-hud');
  if (oldHud) oldHud.remove();

  hud = document.createElement('div');
  hud.id = 'crystal-hud';
  Object.assign(hud.style, {
    position: 'fixed',
    top: '10px',
    left: '10px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(0, 0, 0, 0.6)',
    borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '18px',
    zIndex: 9999,
  });

  const icon = document.createElement('span');
  icon.textContent = '💎'; // crystal emoji
  icon.style.fontSize = '20px';

  const text = document.createElement('span');
  text.id = 'crystal-count';
  text.textContent = '0';

  hud.appendChild(icon);
  hud.appendChild(text);
  document.body.appendChild(hud);
}

export function updateHUD(val) {
  counter = val;
  const el = document.getElementById('crystal-count');
  if (el) el.textContent = counter;
}

// === TIMER UI ===
function createTimerUI() {
  const old = document.getElementById('game-timer');
  if (old) old.remove();

  const timerEl = document.createElement('div');
  timerEl.id = 'game-timer';
  Object.assign(timerEl.style, {
    position: 'fixed',
    top: '12px',
    right: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: 'rgba(0,0,0,0.6)',
    borderRadius: '10px',
    boxShadow: '0 0 10px rgba(0,0,0,0.5)',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '18px',
    zIndex: 9999,
    pointerEvents: 'none',
  });

  const icon = document.createElement('span');
  icon.textContent = '⏰';
  icon.style.fontSize = '20px';

  const text = document.createElement('span');
  text.id = 'timer-text';
  text.textContent = `${Math.floor(timeLeft)}s`;

  timerEl.appendChild(icon);
  timerEl.appendChild(text);
  document.body.appendChild(timerEl);
}

function updateTimerUI(seconds) {
  const timerEl = document.getElementById('timer-text');
  const currentSecond = Math.max(0, Math.floor(seconds));
  if (timerEl && currentSecond !== lastDisplayedSecond) {
    timerEl.textContent = `${currentSecond}s`;
    lastDisplayedSecond = currentSecond;
  }
}



export function resetCounter() { counter = 0; }
export function getCounter() { return counter; }



// === MAIN TIMER LOOP ===
function timerLoop() {
  if (!timerRunning) return;
  const now = performance.now();

  if (!isPaused) {
    const delta = (now - lastUpdate) / 1000;
    timeLeft -= delta;
    lastUpdate = now;

    if (timeLeft <= 0) {
      timeLeft = 0;
      updateTimerUI(0);
      stopTimer();
      if (typeof onTimerEnd === 'function') onTimerEnd();
      return;
    }

    updateTimerUI(timeLeft);
  } else {
    lastUpdate = now;
  }

  timerRAF = requestAnimationFrame(timerLoop);
}

// === PAUSE UI ===
function createPauseButton() {
  if (pauseBtn) pauseBtn.remove();

  pauseBtn = document.createElement('button');
  pauseBtn.id = 'pause-btn';
  pauseBtn.textContent = '⏸ Pause';
  Object.assign(pauseBtn.style, {
    position: 'fixed',
    top: '40px',
    right: '15px',
    padding: '8px 12px',
    background: 'rgba(0,0,0,0.6)',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    zIndex: 9999,
  });

  pauseBtn.onclick = () => {
    isPaused = !isPaused;
    pauseBtn.textContent = isPaused ? '▶ Resume' : '⏸ Pause';
    togglePauseOverlay(isPaused);
  };

  document.body.appendChild(pauseBtn);
}

function createPauseOverlay() {
  pauseOverlay = document.createElement('div');
  pauseOverlay.id = 'pause-overlay';
  Object.assign(pauseOverlay.style, {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '48px',
    background: 'rgba(0, 0, 0, 0.5)',
    padding: '30px 60px',
    borderRadius: '12px',
    textAlign: 'center',
    opacity: '0',
    transition: 'opacity 0.3s ease',
    zIndex: 10000,
    pointerEvents: 'none',
  });
  pauseOverlay.textContent = 'Game Paused';
  document.body.appendChild(pauseOverlay);
}

function togglePauseOverlay(show) {
  if (!pauseOverlay) createPauseOverlay();
  pauseOverlay.style.opacity = show ? '1' : '0';
}

// === PUBLIC TIMER CONTROL ===
export function startTimer(durationSeconds, onEndCallback) {
  stopTimer(); // reset first
  totalTime = durationSeconds;
  timeLeft = durationSeconds;
  lastUpdate = performance.now();
  timerRunning = true;
  onTimerEnd = onEndCallback;
  lastDisplayedSecond = null;

  createTimerUI();
  createPauseButton();
  createPauseOverlay();
  timerLoop();
}

export function pauseTimer() {
  isPaused = true;
  if (pauseBtn) pauseBtn.textContent = '▶ Resume';
  togglePauseOverlay(true);
}

export function resumeTimer() {
  isPaused = false;
  lastUpdate = performance.now();
  if (pauseBtn) pauseBtn.textContent = '⏸ Pause';
  togglePauseOverlay(false);
}

export function stopTimer() {
  timerRunning = false;
  cancelAnimationFrame(timerRAF);
  ['game-timer', 'pause-btn', 'pause-overlay'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.remove();
  });
}

export function isTimerPaused() { return isPaused; }
export function getTimeLeft() { return Math.max(0, Math.floor(timeLeft)); }
