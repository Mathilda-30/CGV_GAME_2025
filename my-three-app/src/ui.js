let hud, counter = 0;
// === TIMER LOGIC ===

let totalTime = 15;
let timeLeft = totalTime;
let lastUpdate = performance.now();
let isPaused = false;
let timerRunning = true;
let timerRAF = null;
let onTimerEnd = null;
let lastDisplayedSecond = null;

let pauseOverlay = null;

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
    padding: '8px 12px',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '18px',
    zIndex: 9999,
    pointerEvents: 'none',
  });
  timerEl.textContent = `Time: ${Math.floor(timeLeft)}s`;
  document.body.appendChild(timerEl);
}

function updateTimerUI(seconds) {
  const timerEl = document.getElementById('game-timer');
  const currentSecond = Math.max(0, Math.floor(seconds));
  if (timerEl && currentSecond !== lastDisplayedSecond) {
    timerEl.textContent = `Time: ${currentSecond}s`;
    lastDisplayedSecond = currentSecond;
  }
}

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
    // Keep updating lastUpdate to prevent big jumps after resume
    lastUpdate = now;
  }

  timerRAF = requestAnimationFrame(timerLoop);
}

// === PAUSE BUTTON ===
let pauseBtn = null;

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
    fontSize: '10px',
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

// === PAUSE OVERLAY ===
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

// === PUBLIC FUNCTIONS ===
export function startTimer(durationSeconds, onEndCallback) {
  stopTimer(); // ensure clean start

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
  const timerEl = document.getElementById('game-timer');
  if (timerEl) timerEl.remove();
  if (pauseBtn) pauseBtn.remove();
  if (pauseOverlay) pauseOverlay.remove();
}

export function isTimerPaused() {
  return isPaused;
}

export function getTimeLeft() {
  return Math.max(0, Math.floor(timeLeft));
}