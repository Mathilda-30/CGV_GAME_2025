import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter, startTimer, stopTimer, isTimerPaused } from './ui.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';
import { Player } from './player2.js'; 



export function startLevel1(onComplete) {
  // === Scene Setup ===
  const scene = new THREE.Scene();
  // --- Realistic blue sky gradient + fog ---
  scene.background = new THREE.Color(0x87ceeb); // clear sky blue
  scene.fog = new THREE.Fog(0xe6c79c, 30, 120);


  const camera = new THREE.PerspectiveCamera(
    75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 10, 30);

  // === Renderer ===
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.outputEncoding = THREE.sRGBEncoding;
  document.body.innerHTML = ''; // clear old canvas + UI
  document.body.appendChild(renderer.domElement);

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
  const rockGeo = new THREE.IcosahedronGeometry(0.6, 1);
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
  }



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



const player = new Player(scene, new THREE.Vector3(0, 0, 0));
  

  // === Crystals (Collectibles) ===
let crystals = [];
const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
const crystalMat = new THREE.MeshStandardMaterial({
  color: 0x00ffff,
  emissive: 0x00ffff,
  emissiveIntensity: 1,
});
const numCrystals = 5;
const positions = Array.from({ length: numCrystals }, () => [
  (Math.random() - 0.5) * 60,
  0.75,
  (Math.random() - 0.5) * 60
]);

  positions.forEach((p) => {
    const c = new THREE.Mesh(crystalGeo, crystalMat.clone());
    c.position.set(...p);
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
      if (player.model.position.distanceTo(c.position) < 1) {
        scene.remove(c);
        crystals[i] = null;
        updateHUD(getCounter() + 1);
        if (getCounter() + 1 === positions.length) {
          // Level Complete
          setTimeout(() => {
            cleanup();
            onComplete();
          }, 800);
        }
      }
    });

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
