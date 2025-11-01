import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter, startTimer, stopTimer } from './ui.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { Player } from './player2.js'; 
import { initCamera, updateCameraFollow } from './camera.js';
import { createCrystals, updateCrystals } from './crystal.js';
import { showMenu } from './menu.js';


export function startLevel1(onComplete) {
  const DEBUG = false;
  // === Scene Setup ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xe6c79c, 30, 120);

const { camera, renderer, controls } = initCamera(scene);
// -------------------------
// 🔊 Global Background Sound (Level 2)
// -------------------------
const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);

// Add the listener to the camera so 3D sound works properly
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./sound/Desert_sound.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(true);          // keep replaying forever
    sound.setVolume(0.5);         // adjust loudness (0.0–1.0)
    sound.play();
}, undefined, err => {
    console.error('Error loading Desert_sound.mp3:', err);
});


resetCounter();
showHUD();

startTimer(180, () => {
  console.log("Time’s up!");
  cleanup();
  stopTimer();

  // === Popup Overlay ===
  const overlay = document.createElement('div');
  Object.assign(overlay.style, {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100vw',
    height: '100vh',
    background: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontFamily: 'sans-serif',
    zIndex: 10000,
  });

  const box = document.createElement('div');
  Object.assign(box.style, {
    background: 'rgba(0, 0, 0, 0.85)',
    padding: '30px 50px',
    borderRadius: '16px',
    textAlign: 'center',
    boxShadow: '0 0 20px rgba(255,255,255,0.3)',
  });

  const msg = document.createElement('h2');
  msg.textContent = '⏰ Time’s Up!';
  msg.style.marginBottom = '20px';

  const restartBtn = document.createElement('button');
  restartBtn.textContent = '🔁 Restart Level';
  Object.assign(restartBtn.style, {
    padding: '10px 20px',
    margin: '10px',
    fontSize: '18px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    background: '#4CAF50',
    color: 'white',
  });

  const menuBtn = document.createElement('button');
  menuBtn.textContent = '🏠 Go to Menu';
  Object.assign(menuBtn.style, {
    padding: '10px 20px',
    margin: '10px',
    fontSize: '18px',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '8px',
    background: '#f44336',
    color: 'white',
  });

  // === Button Actions ===
  restartBtn.addEventListener('click', () => {
    overlay.remove();
    startLevel1(onComplete);
  });

  menuBtn.addEventListener('click', () => {
    overlay.remove();
    cleanup();
    showMenu(() => startLevel1(onComplete)); // Return to menu
  });

  box.appendChild(msg);
  box.appendChild(restartBtn);
  box.appendChild(menuBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
});



  
  // === Lighting ===
  const sunlight = new THREE.DirectionalLight(0xffffff, 1.4);
  sunlight.position.set(30, 40, -40);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.width = 2048;
  sunlight.shadow.mapSize.height = 2048;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 150;
  scene.add(sunlight);

  const ambient = new THREE.AmbientLight(0xffd7a0, 0.6);
  scene.add(ambient);

  const textureLoader = new THREE.TextureLoader();
  const sunTexture = textureLoader.load('/textures/lensflare1.png');
  const sunGlowMaterial = new THREE.SpriteMaterial({
    map: sunTexture,
    color: 0xffee88,
    transparent: true,
    blending: THREE.AdditiveBlending,
  });
  const sunGlow = new THREE.Sprite(sunGlowMaterial);
  sunGlow.scale.set(30, 30, 1);
  sunGlow.position.copy(sunlight.position);
  scene.add(sunGlow);

  

 const terrainGeometry = new THREE.PlaneGeometry(300, 300, 150, 150);
 terrainGeometry.rotateX(-Math.PI / 2);

  //perlin like bumps for dunes

  // === Terrain ===
  const terrainGeometry = new THREE.PlaneGeometry(300, 300, 150, 150);
  terrainGeometry.rotateX(-Math.PI / 2);
  for (let i = 0; i < terrainGeometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(terrainGeometry.attributes.position, i);
    const height =
      Math.sin(vertex.x * 0.05) * Math.cos(vertex.z * 0.05) * 2 +
      Math.sin(vertex.x * 0.01) * 0.5 +
      Math.random() * 0.3;
    terrainGeometry.attributes.position.setY(i, height);
  }
  terrainGeometry.computeVertexNormals();

  const sandTexture = textureLoader.load('public/textures/sand_texture.png');
  sandTexture.wrapS = THREE.RepeatWrapping;
  sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(15, 15);
  sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  sandTexture.encoding = THREE.sRGBEncoding;

  const sandMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    color: 0xf5deb3,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const terrain = new THREE.Mesh(terrainGeometry, sandMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain); 

  // === ROCKS ===
  const rockGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
  const rocks = [];

  function placeRock() {
    const x = (Math.random() - 0.5) * 250;
    const z = (Math.random() - 0.5) * 250;
    raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    const hit = raycaster.intersectObject(terrain);
    if (hit.length > 0) {
      const y = hit[0].point.y;
      const rock = new THREE.Mesh(rockGeo, rockMat.clone());
      const scale = 0.5 + Math.random() * 1.5;
      rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale);
      rock.position.set(x, y + 0.3, z);
      rock.rotation.y = Math.random() * Math.PI;
      rock.castShadow = true;
      rock.receiveShadow = true;
      scene.add(rock);
      rocks.push(rock);
    }
  }
  for (let i = 0; i < 25; i++) placeRock();

  // === CACTI ===
  const cacti = [];
 const cactusMat = new THREE.MeshStandardMaterial({
  color: 0x228b22, // uniform cactus green
  roughness: 0.8,
  metalness: 0.1,
});


  function createCactus(x, y, z) {
    const cactus = new THREE.Group();
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 4, 8),
      cactusMat
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    cactus.add(trunk);

    const armMat = trunk.material.clone();
    const leftArm = new THREE.Mesh(
      new THREE.CylinderGeometry(0.25, 0.25, 1.5, 8),
      armMat
    );
    leftArm.position.set(-0.6, 2.5, 0);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.castShadow = true;
    cactus.add(leftArm);

    const rightArm = leftArm.clone();
    rightArm.position.x = 0.6;
    rightArm.rotation.z = -Math.PI / 3;
    cactus.add(rightArm);

    cactus.position.set(x, y, z);
    scene.add(cactus);
    cacti.push(cactus);
  }

// Place randomly across desert
for (let i = 0; i < 10; i++) {
  createCactus((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
}



   const player = new Player(scene, new THREE.Vector3(0, 0, 0));
    player.camera = camera; // attach camera for relative movement
  

  const { crystals, crystalPositions } = createCrystals(scene);

  // === Input + HUD ===
  initInput();
  

  const clock = new THREE.Clock();
  let animId;

  // === Game Loop ===
  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    //const time = clock.getElapsedTime();

     if (isTimerPaused()) {
    renderer.render(scene, camera);
    return;
  }

    player.update(dt);

    // --- Camera Follow ---
    camera.position.lerp(
        player.model.position.clone().add(new THREE.Vector3(0, 3, 8)),
        0.1
    );
    camera.lookAt(player.model.position);

    // Replace crystal update code with:
    updateCrystals(crystals, player, scene, (i) => {
  updateHUD(getCounter() + 1);
  if (getCounter() === crystalPositions.length) {
    stopTimer(); // stop the countdown when all crystals collected
    setTimeout(() => {
      cleanup();
      onComplete();
    }, 600);
  }
});


    updateCameraFollow(camera, player?.model, DEBUG);
    renderer.render(scene, camera);
}
  animate();

   // === End Game Logic ===
   function endGame(win) {
    stopTimer();
    cancelAnimationFrame(animId);

    const timerEl = document.getElementById('game-timer');
    if (timerEl) timerEl.remove();

    if (win) {
      showMessage('You collected all crystals in time!');
      setTimeout(() => {
        cleanup();
        onComplete?.();
      }, 1500);
    } else {
      showMessage(' Time’s up! Try again.');
      setTimeout(() => {
        cleanup();
        onComplete?.();
      }, 2000);
    }
  }

  
  function showMessage(text) {
    const msgEl = document.createElement('div');
    msgEl.textContent = text;
    Object.assign(msgEl.style, {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      padding: '20px',
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      fontFamily: 'sans-serif',
      fontSize: '24px',
      borderRadius: '8px',
      zIndex: 9999,
    });
    document.body.appendChild(msgEl);
  }

  function cleanup() {
    cancelAnimationFrame(animId);
   const timerEl = document.getElementById('game-timer');
if (timerEl) timerEl.remove();

    removePauseButton();
    renderer.dispose();
  }
  
  return cleanup;
}
