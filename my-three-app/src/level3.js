// level3.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initInput, keys, resetJustPressed } from './input2.js';
import { player, initPlayer3, updatePlayer } from './player3.js';
import { createMovingPlatforms, updateMovingPlatforms } from './platforms.js';
import { createJumpPads, updateJumpPadEffects, updateJumpPadCooldowns, checkJumpPadCollisions } from './jumpPads.js';
import RAPIER from '@dimforge/rapier3d-compat';
import { CustomRapierDebugRenderer } from './debug.js';
import { createIsland, animateIslandElements } from './island.js';
import { initCrystals, updateCrystals } from './crystal2.js';
// --- ADDED UI imports ---
import { showHUD, resetCounter, startTimer, stopTimer, isTimerPaused } from './ui.js'; 
import { showMenu } from './menu.js'; // Assuming menu.js exists
import { createHazards, updateHazards, checkHazardCollisions } from './hazards.js';

// ============ LEVEL STATE ============
let world;
let water = null;
let scene = null;
let renderer = null;
let camera = null;
let controls = null;

const PLAYER_HALF_HEIGHT = 0.9;

const crystalPositions = [
  // === Jump Pads ===
  new THREE.Vector3(0, 2.5, 4),   // jump pad 1
  new THREE.Vector3(-6, 5.5, 10), // jump pad 2
  new THREE.Vector3(2, 8.5, 17),  // jump pad 3
  new THREE.Vector3(9, 10.5, 25), // jump pad 4
  new THREE.Vector3(3, 14.5, 33), // jump pad 5
  new THREE.Vector3(0, 18.5, 42), // jump pad 6

  // === Moving Platforms ===
  new THREE.Vector3(8, 8, 2),     // rising zig-zag vertical lift
  new THREE.Vector3(14, 9, -1),   // side mover (midpoint)
  new THREE.Vector3(17, 10.75, 3), // diagonal drift (midpoint)
  new THREE.Vector3(20, 10.8, -1.5), // left-right mover (midpoint)
  new THREE.Vector3(24, 13.6, 1), // rising finale (midpoint)
  new THREE.Vector3(28, 13.5, 0)  // final goal platform
];

export async function startLevel3(onComplete) {
  console.log('🚀 Starting Level 3...');

  // --- RAPIER INIT ---
  await RAPIER.init();
  const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
  world = new RAPIER.World(gravity);

  // --- SCENE SETUP ---
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0x87ceeb, 100, 200);

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 15);

  // --- AUDIO LISTENER ---
  const listener = new THREE.AudioListener();
  camera.add(listener);

  // --- RENDERER SETUP ---
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowShadowMap;
  document.body.innerHTML = "";
  document.body.appendChild(renderer.domElement);

  // --- HUD & TIMER ---
  showHUD();
  resetCounter(); // <-- ADDED

  // --- ADDED TIMER BLOCK ---
  startTimer(180, () => { // 180 seconds = 3 minutes
    console.log("⏰ Time’s up!");
    cleanup(); // This will call your existing cleanup function
    stopTimer();

    // Create the Time's Up popup
    const overlay = document.createElement('div');
    Object.assign(overlay.style, {
      position: 'fixed', top: 0, left: 0,
      width: '100vw', height: '100vh',
      background: 'rgba(0, 0, 0, 0.7)',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      color: 'white', fontFamily: 'sans-serif',
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
      padding: '10px 20px', margin: '10px', fontSize: '18px',
      cursor: 'pointer', border: 'none', borderRadius: '8px',
      background: '#4CAF50', color: 'white',
    });

    const menuBtn = document.createElement('button');
    menuBtn.textContent = '🏠 Go to Menu';
    Object.assign(menuBtn.style, {
      padding: '10px 20px', margin: '10px', fontSize: '18px',
      cursor: 'pointer', border: 'none', borderRadius: '8px',
      background: '#f44336', color: 'white',
    });

    restartBtn.addEventListener('click', () => {
      overlay.remove();
      startLevel3(onComplete); // Restart this level
    });

    menuBtn.addEventListener('click', () => {
      overlay.remove();
      cleanup();
      showMenu(() => startLevel3(onComplete)); // Show main menu
    });

    box.appendChild(msg);
    box.appendChild(restartBtn);
    box.appendChild(menuBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
  // --- END OF TIMER BLOCK ---


  // --- DEBUG & CONTROLS ---
  // debugRenderer = new CustomRapierDebugRenderer(scene, world); // Removed
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.target.set(0, 2, 0);
  controls.autoRotate = false;

  // --- LIGHTING ---
  const sunLight = new THREE.DirectionalLight(0xfff8d0, 1.8);
  sunLight.position.set(50, 50, 50);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.width = 2048;
  sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -50;
  sunLight.shadow.camera.right = 50;
  sunLight.shadow.camera.top = 50;
  sunLight.shadow.camera.bottom = -50;
  sunLight.shadow.camera.near = 0.5;
  sunLight.shadow.camera.far = 150;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x60a0ff, 0xd0b080, 0.85);
  scene.add(hemiLight);

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // --- CREATE ISLAND ---
  console.log('🏝️ Creating island...');
  water = createIsland(scene, world, RAPIER);

  // --- CREATE GAMEPLAY ELEMENTS ---
  console.log('⚙️ Creating gameplay elements...');
  createMovingPlatforms(scene, world, RAPIER);
  createJumpPads(scene, world, RAPIER);
  createHazards(scene, world, RAPIER);
  createWallsAndObstacles(scene, world, RAPIER);

  // --- TEST CUBE (REMOVED) ---

  // --- LOAD PLAYER ---
  console.log('🎮 Loading player...');
  initInput();
  const loader = new GLTFLoader();
  initPlayer3(scene, loader, world, RAPIER, { x: 0, y: 45.0, z: 0 });

  // --- INITIALIZE CRYSTALS ---
  console.log('💎 Initializing crystals...');
  initCrystals(scene, crystalPositions, () => {
    console.log('🎉 ALL CRYSTALS COLLECTED!');
    stopTimer(); // <-- ADDED
    // (Add level complete logic here)
  }, listener); // <-- ADDED listener

  // --- LOAD AMBIENT SOUND ---
  const audioLoader = new THREE.AudioLoader();
  const ambientSound = new THREE.Audio(listener);

  let audioLoaded = false;
  audioLoader.load(
    '/level3/sound/sea-and-seagull-wave-5932.mp3',
    function(buffer) {
      ambientSound.setBuffer(buffer);
      ambientSound.setLoop(true);
      ambientSound.setVolume(0.5);
      audioLoaded = true;
      console.log('🎵 Audio loaded');
    },
    undefined,
    function(error) {
      console.warn('⚠️ Audio load failed:', error);
    }
  );

  // --- CLICK TO START AUDIO ---
  const startAudio = () => {
    if (audioLoaded && !ambientSound.isPlaying) {
      ambientSound.play();
      console.log('🔊 Audio started');
    }
    renderer.domElement.removeEventListener('click', startAudio);
  };
  renderer.domElement.addEventListener('click', startAudio);

  // --- RENDER LOOP ---
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    
    // --- ADDED: PAUSE CHECK ---
    if (isTimerPaused()) return;

    const dt = clock.getDelta();

    if (water && water.material && water.material.uniforms) {
      water.material.uniforms['time'].value += dt * 1.0;
    }

    animateIslandElements(dt);
    updateMovingPlatforms(dt);
    updateHazards(dt);
    updateJumpPadEffects(dt);
    updateJumpPadCooldowns(dt);
    updatePlayer(dt);
    world.step();

    if (player.body && player.model) {
      const physPos = player.body.translation();
      const visualY = physPos.y - PLAYER_HALF_HEIGHT;
      player.model.position.set(physPos.x, visualY, physPos.z);
    }

    controls.update();
    updateCrystals(player, dt); // Pass player object

    checkHazardCollisions();
    checkJumpPadCollisions();

    // if (debugRenderer) debugRenderer.update(); // Removed
    renderer.render(scene, camera);
    resetJustPressed();
  }

  animate();

  function cleanup() {
    console.log('🛑 Cleaning up level...');
    cancelAnimationFrame(animId);
    stopTimer(); // <-- ADDED
    renderer.dispose();
    world.free();
    // if (debugRenderer) debugRenderer.dispose(); // Removed
    if (ambientSound.isPlaying) ambientSound.stop();
    renderer.domElement.removeEventListener('click', startAudio);
  }

  return cleanup;
}

// ============ WALLS & OBSTACLES ============
function createWallsAndObstacles(scene, world, RAPIER) {
  console.log('🧱 Creating walls and obstacles...');

  const rockPositions = [
    { pos: new THREE.Vector3(7, 0.5, -8), scale: 2 },
    { pos: new THREE.Vector3(-12, 0.5, 5), scale: 1.5 },
    { pos: new THREE.Vector3(10, 0.5, 8), scale: 1.8 },
  ];

  rockPositions.forEach(data => {
    const geo = new THREE.IcosahedronGeometry(1, 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x8b7355,
      roughness: 0.8,
      metalness: 0.1,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(data.pos);
    mesh.scale.multiplyScalar(data.scale);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(data.pos.x, data.pos.y, data.pos.z);
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.ball(data.scale * 0.8);
    world.createCollider(colliderDesc, body);
  });
}