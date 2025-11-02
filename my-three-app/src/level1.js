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
  // --- Realistic blue sky gradient + fog ---
  scene.background = new THREE.Color(0x87ceeb); // clear sky blue
  scene.fog = new THREE.Fog(0xe6c79c, 30, 120);
  const raycaster = new THREE.Raycaster();

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



  // === Clouds ===
/*const cloudTexture = new THREE.TextureLoader().load('https://threejs.org/examples/textures/sprites/cloud.png');
const cloudMat = new THREE.SpriteMaterial({
  map: cloudTexture,
  transparent: true,
  opacity: 0.6,
  depthWrite: false,
});
const clouds = [];

for (let i = 0; i < 20; i++) {
  const cloud = new THREE.Sprite(cloudMat);
  const scale = 80 + Math.random() * 120;
  cloud.scale.set(scale, scale * 0.5, 1);
  cloud.position.set(
    (Math.random() - 0.5) * 400,
    40 + Math.random() * 20,
    (Math.random() - 0.5) * 400
  );
  scene.add(cloud);
  clouds.push(cloud);
}*/



  /*const sun = new THREE.DirectionalLight(0xffffff, 1.2);
  sun.position.set(10, 15, 5);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);*/

  // === Ground (Sand Terrain) ===
  /*const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 64, 64),
    new THREE.MeshStandardMaterial({
      color: 0xdeb887,
      roughness: 1,
      metalness: 0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);*/

 const terrainGeometry = new THREE.PlaneGeometry(300, 300, 150, 150);
 terrainGeometry.rotateX(-Math.PI / 2);

  //perlin like bumps for dunes
  for (let i = 0; i < terrainGeometry.attributes.position.count; i++) {
    const vertex=new THREE.Vector3().fromBufferAttribute(terrainGeometry.attributes.position,i);
    const height = Math.sin(vertex.x * 0.05) * Math.cos(vertex.z * 0.05) * 2 + Math.sin(vertex.x * 0.01) * 0.5 + Math.random() * 0.3;
    //const y = (Math.sin(i * 0.3) + Math.cos(i * 0.5)) * 0.7;
    terrainGeometry.attributes.position.setY(i, height);
  }
  terrainGeometry.computeVertexNormals();


  const sandTexture = new THREE.TextureLoader().load('public/textures/sand_texture.png');
  sandTexture.wrapS = THREE.RepeatWrapping;
  sandTexture.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(15, 15);
  sandTexture.anisotropy = renderer.capabilities.getMaxAnisotropy(); // sharper texture
  sandTexture.encoding = THREE.sRGBEncoding;
  sandTexture.colorSpace = THREE.SRGBColorSpace;

  const sandMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    color:0xf5deb3,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

  const terrain = new THREE.Mesh(terrainGeometry, sandMaterial);
  terrain.receiveShadow = true;
  scene.add(terrain); 

  // === ROCKS ===
  /*const rockGeo = new THREE.IcosahedronGeometry(0.6, 1);
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x888888, roughness: 0.9 });
  const rocks = [];

  for (let i = 0; i < 20; i++) {
    const rock = new THREE.Mesh(rockGeo, rockMat.clone());
    const scale = 0.5 + Math.random() * 1.5;
    rock.scale.set(scale, scale * (0.6 + Math.random() * 0.4), scale);
    rock.position.set(
      (Math.random() - 0.5) * 200,
      0.3,
      (Math.random() - 0.5) * 200
    );
    rock.rotation.y = Math.random() * Math.PI;
    rock.castShadow = true;
    rock.receiveShadow = true;
    scene.add(rock);
    rocks.push(rock);
  }*/

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




  // === CACTUSES ===
const cacti = [];

function createCactus(x, z) {
  const cactus = new THREE.Group();

  // main trunk
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.4, 0.5, 4, 8),
    new THREE.MeshStandardMaterial({ color: 0x2e8b57 }) // green
  );
  trunk.position.y = 2;
  trunk.castShadow = true;
  cactus.add(trunk);

  // side arms
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

  cactus.position.set(x, 0, z);
  scene.add(cactus);
  cacti.push(cactus);
}

// Place randomly across desert
for (let i = 0; i < 10; i++) {
  createCactus((Math.random() - 0.5) * 200, (Math.random() - 0.5) * 200);
}

// --- Obstacle Collision Handling (Rocks + Cacti) ---
const obstacles = [...rocks, ...cacti];
const playerRadius = 1.0; // Adjust based on your player size

function handleObstacleCollisions() {
  let collided = false;

  obstacles.forEach(obs => {
    if (!obs) return;

    const dx = player.model.position.x - obs.position.x;
    const dz = player.model.position.z - obs.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    const obsRadius = (obs.scale.x || 1) * 0.5;
    const minDist = playerRadius + obsRadius;

    if (dist < minDist) {
      collided = true;

      // Push the player just outside the obstacle
      const overlap = minDist - dist;
      const pushDirX = dx / dist;
      const pushDirZ = dz / dist;

      player.model.position.x += pushDirX * overlap;
      player.model.position.z += pushDirZ * overlap;

      // Completely stop all movement
      if (player.velocity) {
        player.velocity.x = 0;
        player.velocity.z = 0;
      }
      if (player.direction) {
        player.direction.x = 0;
        player.direction.z = 0;
      }
    }
  });

  // If the player collided, zero their movement inputs
  if (collided && player.input) {
    player.input.forward = 0;
    player.input.backward = 0;
    player.input.left = 0;
    player.input.right = 0;
  }
}




   const player = new Player(scene, new THREE.Vector3(0, 0, 0));
    player.camera = camera; // attach camera for relative movement

  const { crystals, crystalPositions } = createCrystals(scene);

  // --- Align crystals with terrain height (prevent burying) ---
crystals.forEach(c => {
  if (!c) return;
  const origin = new THREE.Vector3(c.position.x, 100, c.position.z);
  raycaster.set(origin, new THREE.Vector3(0, -1, 0));
  const hit = raycaster.intersectObject(terrain);
  if (hit.length > 0) {
    // place slightly above sand surface
    c.position.y = hit[0].point.y + 0.5;
  }
});


  // === Input + HUD ===
  initInput();
  

  const clock = new THREE.Clock();
  let animId;

  // === Game Loop ===
  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const time = clock.getElapsedTime();

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

    handleObstacleCollisions();


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

  function cleanup() {
    cancelAnimationFrame(animId);
    renderer.dispose();
  }

  return cleanup;
}
