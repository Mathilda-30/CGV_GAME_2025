// menu.js
import * as THREE from 'three';

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

  // --- Styles ---
  const styleSheet = document.createElement("style");
  styleSheet.type = "text/css";
  styleSheet.innerText = `
    @keyframes gradientAnimation {
      0% { background-position: 0% 50%; }
      50% { background-position: 100% 50%; }
      100% { background-position: 0% 50%; }
    }
    .popup {
      position: fixed;
      top: 50%; left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(0,0,0,0.8);
      padding: 30px;
      border-radius: 12px;
      color: white;
      font-size: 18px;
      width: 60%;
      max-width: 600px;
      text-align: center;
      z-index: 10;
      box-shadow: 0 0 20px rgba(0,0,0,0.5);
    }
    .popup button {
      margin-top: 15px;
      padding: 8px 20px;
      background: #66a6ff;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: bold;
    }
    canvas#menuBG {
      position: absolute;
      top: 0; left: 0;
      width: 100%;
      height: 100%;
      z-index: 0;
    }
    button.menu-btn {
      padding: 15px 30px;
      font-size: 20px;
      cursor: pointer;
      margin-top: 20px;
      border: none;
      border-radius: 8px;
      background-color: rgba(0,0,0,0.5);
      color: white;
      font-weight: bold;
      transition: background-color 0.3s, transform 0.2s, box-shadow 0.2s;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3);
      z-index: 2;
    }
    button.menu-btn:hover {
      background-color: rgba(0,0,0,0.7);
      transform: scale(1.05);
      box-shadow: 0 6px 14px rgba(0,0,0,0.4);
    }
  `;
  document.head.appendChild(styleSheet);

  // --- THREE.js background for floating crystals ---
  const bgCanvas = document.createElement('canvas');
  bgCanvas.id = 'menuBG';
  menu.appendChild(bgCanvas);

  const renderer = new THREE.WebGLRenderer({ canvas: bgCanvas, alpha: true });
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.z = 5;

  const ambientLight = new THREE.AmbientLight(0xffffff, 1);
  scene.add(ambientLight);

  // --- CRYSTAL SETUP ---
  const textureLoader = new THREE.TextureLoader();
  const crystalTexture = textureLoader.load('./textures/Crystal.jpg');

  const crystalGeo = new THREE.DodecahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    map: crystalTexture,
    emissiveMap: crystalTexture,
    emissive: new THREE.Color(0x66ccff),
    emissiveIntensity: 1.2,
    roughness: 0.2,
    metalness: 0.7
  });

  const crystals = [];
  for (let i = 0; i < 20; i++) {
    const crystal = new THREE.Mesh(crystalGeo, crystalMat);
    crystal.position.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 6
    );

    crystal.velocity = new THREE.Vector3(
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01,
      (Math.random() - 0.5) * 0.01
    );

    crystal.rotationSpeed = new THREE.Vector3(
      Math.random() * 0.005,
      Math.random() * 0.005,
      Math.random() * 0.005
    );

    scene.add(crystal);
    crystals.push(crystal);
  }

  const light1 = new THREE.PointLight(0xffffff, 0.8);
  light1.position.set(5, 5, 5);
  scene.add(light1);

  const light2 = new THREE.PointLight(0xff66cc, 0.6);
  light2.position.set(-4, -3, 3);
  scene.add(light2);

  // --- Floating Animation ---
  function animate() {
    crystals.forEach(c => {
      c.rotation.x += c.rotationSpeed.x;
      c.rotation.y += c.rotationSpeed.y;
      c.position.add(c.velocity);

      if (Math.abs(c.position.x) > 6) c.velocity.x *= -1;
      if (Math.abs(c.position.y) > 4) c.velocity.y *= -1;
      if (Math.abs(c.position.z) > 4) c.velocity.z *= -1;
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
  }
  animate();

  // --- Title & Buttons ---
  const title = document.createElement('h1');
  title.innerText = 'Crystal Quest';
  Object.assign(title.style, { zIndex: 2 });
  menu.appendChild(title);

  const startBtn = document.createElement('button');
  startBtn.innerText = 'Start Game';
  startBtn.className = 'menu-btn';
  menu.appendChild(startBtn);

  const howBtn = document.createElement('button');
  howBtn.innerText = 'How to Play';
  howBtn.className = 'menu-btn';
  menu.appendChild(howBtn);

  const creditsBtn = document.createElement('button');
  creditsBtn.innerText = 'Credits';
  creditsBtn.className = 'menu-btn';
  menu.appendChild(creditsBtn);

 // --- Background Music ---
const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./sound/menu-song.mp3', buffer => {
  sound.setBuffer(buffer);
  sound.setLoop(true);
  sound.setVolume(0.4);

  // Wait for any click to start sound (required by browsers)
  const startAudio = () => {
    if (!sound.isPlaying) sound.play();
    window.removeEventListener('click', startAudio);
  };
  window.addEventListener('click', startAudio);
}, undefined, err => {
  console.error('Error loading menu-song.mp3:', err);
});


  document.body.appendChild(menu);

  // --- Popup logic ---
  function showPopup(titleText, contentText) {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerHTML = `<h2>${titleText}</h2><p>${contentText}</p>`;
    const closeBtn = document.createElement('button');
    closeBtn.innerText = 'Close';
    closeBtn.addEventListener('click', () => popup.remove());
    popup.appendChild(closeBtn);
    document.body.appendChild(popup);
  }

  howBtn.addEventListener('click', () => {
    showPopup('How to Play', `
      🕹️ Use W, A, S, D to move.<br>
      🖱️ Use the arrow keys to look around (Change the camera view).<br>
      💎 Collect all 10 crystals before time runs out so that you can move on to a new level!<br>
      🚫 If the timer hits zero, you lose.
    `);
  });

  creditsBtn.addEventListener('click', () => {
    showPopup('Credits', `
      <p>Game sounds: <a href="https://pixabay.com/sound-effects/" target="_blank" style="color:#4fc3f7">Pixabay</a></p>
      <p>Textures: <a href="https://polyhaven.com/" target="_blank" style="color:#4fc3f7">Poly Haven</a> & 
      <a href="https://www.freepik.com/" target="_blank" style="color:#4fc3f7">Freepik</a></p>
      <p>3D Model (Azri): <a href="https://example.com/azri-model" target="_blank" style="color:#4fc3f7">Azri Model Source</a></p>
      <p>Built with <strong>Three.js</strong> and creativity.</p>
      <p>Created by <strong>Pixel Quest</strong></p>
    `);
});


  startBtn.addEventListener('click', () => {
    if (sound && sound.isPlaying) sound.stop(); // stop menu music
    document.body.removeChild(menu);
    renderer.dispose();
    startCallback();
  });
}