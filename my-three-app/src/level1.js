import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter, startTimer, stopTimer, isTimerPaused } from './ui.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { Player } from './player2.js'; 

export function startLevel1(onComplete) {
  // === Scene Setup ===
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  scene.fog = new THREE.Fog(0xe6c79c, 30, 120);

  const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000
  );
  camera.position.set(0, 10, 30);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.innerHTML = '';
  document.body.appendChild(renderer.domElement);

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

  const raycaster = new THREE.Raycaster();

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

  function placeCactus() {
    const x = (Math.random() - 0.5) * 250;
    const z = (Math.random() - 0.5) * 250;
    raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    const hit = raycaster.intersectObject(terrain);
    if (hit.length > 0) {
      const y = hit[0].point.y;
      createCactus(x, y, z);
    }
  }
  for (let i = 0; i < 15; i++) placeCactus();

  // === PLAYER ===
  const player = new Player(scene, new THREE.Vector3(0, 0, 0));

  // === CRYSTALS ===
  let crystals = [];
  const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1,
  });

  const positions = [
    [3, -2],
    [-4, 1],
    [0, -6],
    [6, 3],
    [-6, -4],
  ];

  positions.forEach(([x, z]) => {
    raycaster.set(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
    const hit = raycaster.intersectObject(terrain);
    const y = hit.length > 0 ? hit[0].point.y + 0.5 : 0.5;
    const c = new THREE.Mesh(crystalGeo, crystalMat.clone());
    c.position.set(x, y, z);
    c.castShadow = true;
    scene.add(c);
    crystals.push(c);
  });

  // === Input + HUD ===
  initInput();
  resetCounter();
  showHUD();

//timer 
startTimer(15, () => {
  endGame(false); 
});


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
    player.update(dt);
    const playerPos = player.model.position;

    // --- Ground Alignment ---
    raycaster.set(
      new THREE.Vector3(playerPos.x, playerPos.y + 5, playerPos.z),
      new THREE.Vector3(0, -1, 0)
    );
    const intersects = raycaster.intersectObject(terrain);
    if (intersects.length > 0) {
      const groundY = intersects[0].point.y;
      const targetY = groundY + 0.02;
      player.model.position.y = THREE.MathUtils.lerp(player.model.position.y, targetY, 0.4);
      if (player.velocity && player.velocity.y < 0) player.velocity.y = 0;
    } else {
      player.model.position.y = 0.5; // fallback if off-terrain
    }

    // --- Keep player inside terrain bounds ---
    const BOUNDS = 140;
    player.model.position.x = THREE.MathUtils.clamp(player.model.position.x, -BOUNDS, BOUNDS);
    player.model.position.z = THREE.MathUtils.clamp(player.model.position.z, -BOUNDS, BOUNDS);

    // --- Camera Follow ---
    camera.position.lerp(
      player.model.position.clone().add(new THREE.Vector3(0, 3, 8)),
      0.1
    );
    camera.lookAt(player.model.position);

    // --- Crystals Rotation + Collection ---
    crystals.forEach((c, i) => {
      if (!c) return;
      c.rotation.y += 0.02;
      if (playerPos.distanceTo(c.position) < 1) {
        scene.remove(c);
        crystals[i] = null;
        updateHUD(getCounter() + 1);
        if (getCounter() + 1 === positions.length) {
          setTimeout(() => {
            cleanup();
            onComplete();
          }, 800);
        }
      }
    });

   // --- Obstacle Collision Handling ---
const obstacles = [...rocks, ...cacti];
const playerRadius = 1.0; // adjust based on your player size

// Save last safe position before applying movement
if (!player.lastSafePos) {
  player.lastSafePos = playerPos.clone();
}

// Check for collision
let collided = false;

for (const obs of obstacles) {
  if (!obs) continue;

  const dx = playerPos.x - obs.position.x;
  const dz = playerPos.z - obs.position.z;
  const dist = Math.sqrt(dx * dx + dz * dz);

  const obsRadius = (obs.scale.x || 1) * 0.5;
  const minDist = playerRadius + obsRadius;

  if (dist < minDist) {
    collided = true;
    break; // we only need one obstacle to block the player
  }
}

if (collided) {
  // Revert to last safe position — player stops completely
  playerPos.copy(player.lastSafePos);

  if (player.velocity) {
    player.velocity.x = 0;
    player.velocity.z = 0;
  }
} else {
  // Update last safe position if no collision
  player.lastSafePos.copy(playerPos);
}




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
