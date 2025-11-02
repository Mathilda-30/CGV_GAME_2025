export function showMenu(startCallback) {
  const menu = document.createElement('section');
  menu.id = 'menu';
  Object.assign(menu.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'sans-serif',
    fontSize: '32px',
    overflow: 'hidden',
    backgroundImage: 'linear-gradient(120deg, #89f7fe, #66a6ff, #89f7fe, #66a6ff)',
    backgroundSize: '200% 200%',
    animation: 'gradientAnimation 10s ease infinite'
  });

  // Keyframes for gradient animation
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes gradientAnimation {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
  `;
  document.head.appendChild(styleSheet);

  // Title
  const title = document.createElement('h1');
  title.innerText = 'Crystal Quest';
  menu.appendChild(title);

  // Start button
  const startBtn = document.createElement('button');
  startBtn.innerText = 'Start Game';
  Object.assign(startBtn.style, {
    padding: '15px 30px',
    fontSize: '20px',
    cursor: 'pointer',
    marginTop: '20px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: 'rgba(0,0,0,0.5)',
    color: 'white',
    fontWeight: 'bold',
    transition: 'background-color 0.3s, transform 0.2s, box-shadow 0.2s',
    boxShadow: '0 4px 10px rgba(0,0,0,0.3)'
  });

  // Hover effect
  startBtn.addEventListener('mouseenter', () => {
    startBtn.style.backgroundColor = 'rgba(0,0,0,0.7)';
    startBtn.style.transform = 'scale(1.05)';
    startBtn.style.boxShadow = '0 6px 14px rgba(0,0,0,0.4)';
  });
  startBtn.addEventListener('mouseleave', () => {
    startBtn.style.backgroundColor = 'rgba(0,0,0,0.5)';
    startBtn.style.transform = 'scale(1)';
    startBtn.style.boxShadow = '0 4px 10px rgba(0,0,0,0.3)';
  });
  menu.appendChild(startBtn);

  // Add menu to DOM
  document.body.appendChild(menu);

  // Start button click
  startBtn.addEventListener('click', () => {
    document.body.removeChild(menu);
    startCallback();
  });
}
