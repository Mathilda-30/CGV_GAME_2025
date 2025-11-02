import * as THREE from 'three';
import { initInput, keys, resetJustPressed } from './input2.js'; 
import { showHUD, updateHUD, resetCounter, getCounter, startTimer, stopTimer, isTimerPaused } from './ui.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { player, initPlayer3, updatePlayer } from './player3.js'; 
import { initCamera, updateCameraFollow } from './camera.js';
import { createCrystals, updateCrystals } from './crystal.js';
import { showMenu } from './menu.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import RAPIER from '@dimforge/rapier3d-compat';
// import { CustomRapierDebugRenderer } from './debug.js';

let world; // The physics world

// let debugRenderer = null;
const PLAYER_HALF_HEIGHT = 0.9; // From player3.js

export async function startLevel1(onComplete) {
  const DEBUG = false;
  
  // === RAPIER INIT ===
  await RAPIER.init();
  const gravity = new RAPIER.Vector3(0.0, -9.81, 0.0);
  world = new RAPIER.World(gravity);

  // === Scene Setup ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xe6c79c, 30, 120);
  const raycaster = new THREE.Raycaster();

  const { camera, renderer, controls } = initCamera(scene);
  // debugRenderer = new CustomRapierDebugRenderer(scene, world);

  // === Audio ===
  const listener = new THREE.AudioListener();
  camera.add(listener);
  const audioLoader = new THREE.AudioLoader();
  audioLoader.load('./sound/Desert_sound.mp3', buffer => {
    const sound = new THREE.Audio(listener); // Create sound here
    sound.setBuffer(buffer);
    sound.setLoop(true);
    sound.setVolume(0.5);
    sound.play();
  }, undefined, err => {
    console.error('Error loading Desert_sound.mp3:', err);
  });

  // === HUD & Timer ===
  resetCounter();
  showHUD();
  startTimer(60, () => {
    console.log("⏰ Time’s up!");
    cleanup();
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
      startLevel1(onComplete);
    });
    menuBtn.addEventListener('click', () => {
      overlay.remove();
      cleanup();
      showMenu(() => startLevel1(onComplete));
    });
    box.appendChild(msg);
    box.appendChild(restartBtn);
    box.appendChild(menuBtn);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
  
  // === Lighting ===
  const sunlight = new THREE.DirectionalLight(0xffffff, 1.4);
  sunlight.position.set(10, 15, 5);
  sunlight.castShadow = true;
  sunlight.shadow.mapSize.width = 2048;
  sunlight.shadow.mapSize.height = 2048;
  sunlight.shadow.camera.near = 1;
  sunlight.shadow.camera.far = 150;
  scene.add(sunlight);
  const ambient = new THREE.AmbientLight(0xffd7a0, 0.5);
  ambient.intensity = 0.6;
  scene.add(ambient);
  const textureLoader = new THREE.TextureLoader();
  const sunTexture = textureLoader.load('./textures/lensflare1.png');
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

  // === Ground (Sand Terrain) ===
  const terrainGeometry = new THREE.PlaneGeometry(300, 300, 150, 150);
  terrainGeometry.rotateX(-Math.PI / 2);

  const vertices = []; // Array for physics vertices
  for (let i = 0; i < terrainGeometry.attributes.position.count; i++) {
    const vertex = new THREE.Vector3().fromBufferAttribute(terrainGeometry.attributes.position, i);
    const height = Math.sin(vertex.x * 0.05) * Math.cos(vertex.z * 0.05) * 2 + Math.sin(vertex.x * 0.01) * 0.5 + Math.random() * 0.3;
    terrainGeometry.attributes.position.setY(i, height);
    vertices.push(vertex.x, height, vertex.z); // Store X, Y, Z
  }
  terrainGeometry.computeVertexNormals();

  const sandTexture = new THREE.TextureLoader().load('./textures/sand_texture.png');
  sandTexture.wrapS = THREE.RepeatWrapping;
  sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(150, 150);
  sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  sandTexture.colorSpace = THREE.SRGBColorSpace;
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

  // --- Terrain Physics ---
  const indices = terrainGeometry.index.array;
  const verticesFloat32 = new Float32Array(vertices);
  let groundColliderDesc = RAPIER.ColliderDesc.trimesh(verticesFloat32, indices);
  let groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
  world.createCollider(groundColliderDesc, world.createRigidBody(groundBodyDesc));
  console.log('Level 1 terrain physics created.');

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

      // --- Rock Physics ---
      let bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, y + 0.3, z);
      let colliderDesc = RAPIER.ColliderDesc.ball(scale * 0.6);
      world.createCollider(colliderDesc, world.createRigidBody(bodyDesc));
    }
  }
  for (let i = 0; i < 25; i++) placeRock();

  // === CACTUSES ===
  const cacti = [];
  function createCactus(x, z) {
    const cactus = new THREE.Group();
    // main trunk
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.4, 0.5, 4, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
    trunk.position.y = 2;
    trunk.castShadow = true;
    cactus.add(trunk);
    // side arms
    const armMat = trunk.material.clone();
    const leftArm = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 1.5, 8), armMat);
    leftArm.position.set(-0.6, 2.5, 0);
    leftArm.rotation.z = Math.PI / 3;
    leftArm.castShadow = true;
    cactus.add(leftArm);
    const rightArm = leftArm.clone();
    rightArm.position.x = 0.6;
    rightArm.rotation.z = -Math.PI / 3;
    cactus.add(rightArm);
    
    // Align cactus with terrain height
    raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    const groundHit = raycaster.intersectObject(terrain);
    let groundY = 0;
    if (groundHit.length > 0) {
      groundY = groundHit[0].point.y;
    }
    cactus.position.set(x, groundY, z);
    scene.add(cactus);
    cacti.push(cactus);

    // --- Cactus Physics ---
    const cactusHeight = 4;
    const cactusRadius = 0.5;
    let bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, groundY + cactusHeight / 2, z);
    let colliderDesc = RAPIER.ColliderDesc.cylinder(cactusHeight / 2, cactusRadius);
    world.createCollider(colliderDesc, world.createRigidBody(bodyDesc));
  }
  for (let i = 0; i < 10; i++) {
    createCactus((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
  }

  // === Player ===
  initInput();
  const loader = new GLTFLoader(); 
  initPlayer3(scene, loader, world, RAPIER, { x: 0, y: 5, z: 0 }); // Start 5 units high

  const { crystals, crystalPositions } = createCrystals(scene);
  // --- Align crystals with terrain height ---
  crystals.forEach(c => {
    if (!c) return;
    const origin = new THREE.Vector3(c.position.x, 100, c.position.z);
    raycaster.set(origin, new THREE.Vector3(0, -1, 0));
    const hit = raycaster.intersectObject(terrain);
    if (hit.length > 0) {
      c.position.y = hit[0].point.y + 0.5;
    }
  });

  // === Game Loop ===
  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);

    if (isTimerPaused()) return;
    const dt = clock.getDelta();

  
    updatePlayer(dt, camera); 
    world.step();     // Steps the physics world

    // Sync player visual model to physics body
    if (player.body && player.model) {
      const physPos = player.body.translation();
      const visualY = physPos.y - PLAYER_HALF_HEIGHT;
      player.model.position.set(physPos.x, visualY, physPos.z);
    }
    
    // --- Camera logic ---
    updateCameraFollow(camera, player.model, DEBUG);
    // controls.update(); // Keep commented out if using follow-cam

    // Crystal logic
    updateCrystals(crystals, player, scene, () => {
      updateHUD(getCounter() + 1);
      if (getCounter() === crystalPositions.length) {
        stopTimer();
        setTimeout(() => {
          cleanup();
          onComplete();
        }, 600);
      }
    });

    // if (debugRenderer) debugRenderer.update();
    renderer.render(scene, camera);
    resetJustPressed(); // For jump input
  }

  animate();

  function cleanup() {
    cancelAnimationFrame(animId);
    stopTimer(); // Ensure timer stops on cleanup
    world.free(); // Clean up physics world
    renderer.dispose();
  }

  return cleanup;
}