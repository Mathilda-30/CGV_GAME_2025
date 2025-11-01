// level3.js

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { initInput, keys, resetJustPressed } from './input.js';
import { player, initPlayer3, updatePlayer } from './player3.js';
// import { updateCamera } from './camera.js'; // Removed unused import
import RAPIER from '@dimforge/rapier3d-compat';
import { CustomRapierDebugRenderer } from './debug.js';
import { createIsland, animateIslandElements } from './island.js';

let world;
let cubeRigidBody;
let debugRenderer = null;
let controls = null;
let cube = null;
let water = null; 

const PLAYER_HALF_HEIGHT = 0.9;

export async function startLevel3(onComplete) {

  await RAPIER.init();
  let gravity = { x: 0.0, y: -9.81, z: 0.0 };
  world = new RAPIER.World(gravity);

  // --- Scene Setup ---
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(10, 10, 15);
  
  // --- 1. ADD AUDIO LISTENER ---
  // This is the "ears" of your scene. Attach it to the camera.
  const listener = new THREE.AudioListener();
  camera.add(listener);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  document.body.innerHTML = "";
  document.body.appendChild(renderer.domElement);

  // --- Debugger & Controls ---
  debugRenderer = new CustomRapierDebugRenderer(scene, world);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.target.set(0, 1, 0);

  // --- Lighting ---
  const sunLight = new THREE.DirectionalLight(0xfff8d0, 1.5);
  sunLight.position.set(50, 50, 50);
  sunLight.castShadow = true;
  // (shadow config...)
  sunLight.shadow.mapSize.width = 2048; sunLight.shadow.mapSize.height = 2048;
  sunLight.shadow.camera.left = -30; sunLight.shadow.camera.right = 30;
  sunLight.shadow.camera.top = 30; sunLight.shadow.camera.bottom = -30;
  sunLight.shadow.camera.near = 0.5; sunLight.shadow.camera.far = 120;
  sunLight.shadow.bias = -0.001;
  scene.add(sunLight);
  const hemiLight = new THREE.HemisphereLight(0x60a0ff, 0xd0b080, 0.75);
  scene.add(hemiLight);

  // --- Create Island ---
  water = createIsland(scene, world, RAPIER);

  // --- Test Cube ---
  const cubeGeo = new THREE.BoxGeometry(2, 2, 2);
  const cubeMat = new THREE.MeshStandardMaterial({ color: 0xff0000, roughness: 0.2 });
  cube = new THREE.Mesh(cubeGeo, cubeMat);
  const cubeStartY = 5.0;
  cube.position.y = cubeStartY;
  cube.castShadow = true;
  scene.add(cube);
  // (Physics for cube...)
  let cubeBodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(0, cubeStartY, 0);
  cubeRigidBody = world.createRigidBody(cubeBodyDesc);
  let cubeColliderDesc = RAPIER.ColliderDesc.cuboid(1, 1, 1);
  world.createCollider(cubeColliderDesc, cubeRigidBody);

  // --- Load Player ---
  initInput();
  const loader = new GLTFLoader();
  const playerStartY = 5.0;
  initPlayer3(scene, loader, world, RAPIER, { x: 5, y: playerStartY, z: 8 });

  // --- 2. LOAD AMBIENT SOUND ---
  const audioLoader = new THREE.AudioLoader();
  const ambientSound = new THREE.Audio(listener);

  audioLoader.load(
    '/level3/sound/sea-and-seagull-wave-5932.mp3',
    function(buffer) {
      ambientSound.setBuffer(buffer);
      ambientSound.setLoop(true);
      ambientSound.setVolume(0.5); // Start at half volume
      // Don't call .play() here, browser will block it.
    }
  );

  // --- 3. CLICK TO START AUDIO ---
  // This handles the browser's autoplay block.
  const startAudio = () => {
    if (!ambientSound.isPlaying) {
      ambientSound.play();
      console.log('Ambient sound started.');
    }
    // Remove the listener so it only fires once
    renderer.domElement.removeEventListener('click', startAudio);
  };
  renderer.domElement.addEventListener('click', startAudio);


  // --- Render Loop ---
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Animate water
    if (water) {
      water.material.uniforms[ 'time' ].value += dt * 1.0; 
    }
    
    // Animate other island elements
    animateIslandElements(dt);

    updatePlayer(dt);
    world.step();
    controls.update();

    // Sync Player Visuals
    if (player.body && player.model) {
      const physPos = player.body.translation();
      const visualY = physPos.y - PLAYER_HALF_HEIGHT;
      player.model.position.set(physPos.x, visualY, physPos.z);
    }

    // Sync Cube Visuals
    if (cubeRigidBody && cube) {
      const cubePos = cubeRigidBody.translation();
      const cubeRot = cubeRigidBody.rotation();
      cube.position.copy(cubePos);
      cube.quaternion.copy(cubeRot);
    }

    // Update debug renderer
    if (debugRenderer) {
      debugRenderer.update();
    }

    renderer.render(scene, camera);
    resetJustPressed();
  }

  animate(); // Start the loop!

  // --- Cleanup ---
  function cleanup() {
    cancelAnimationFrame(animId);
    renderer.dispose();
    world.free();
    if (debugRenderer) {
        debugRenderer.dispose();
    }
    // Stop and clean up audio
    if (ambientSound.isPlaying) {
      ambientSound.stop();
    }
    renderer.domElement.removeEventListener('click', startAudio);
  }

  return cleanup;
}