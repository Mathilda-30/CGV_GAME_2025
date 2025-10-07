import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';
import { Lensflare, LensflareElement } from 'three/examples/jsm/objects/Lensflare.js';



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



  // === Player ===
  const player = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.2, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc })
  );
  player.castShadow = true;
  player.position.set(0, 0.6, 0);
  scene.add(player);

  // === Crystals (Collectibles) ===
  let crystals = [];
  const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0x00ffff,
    emissive: 0x00ffff,
    emissiveIntensity: 1,
  });

  const positions = [
    [3, 0.5, -2],
    [-4, 0.5, 1],
    [0, 0.5, -6],
    [6, 0.5, 3],
    [-6, 0.5, -4],
  ];

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

  const clock = new THREE.Clock();
  let animId;

  // === Game Loop ===
  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();
    const time = clock.getElapsedTime();

    // --- Movement ---
    const dir = new THREE.Vector3();
    if (keys['w']) dir.z -= 1;
    if (keys['s']) dir.z += 1;
    if (keys['a']) dir.x -= 1;
    if (keys['d']) dir.x += 1;
    dir.normalize().multiplyScalar(5 * dt);
    player.position.add(dir);

    // --- Camera Follow ---
    camera.position.lerp(
      player.position.clone().add(new THREE.Vector3(0, 3, 8)),
      0.1
    );
    camera.lookAt(player.position);

    // --- Crystals Rotation + Collection ---
    crystals.forEach((c, i) => {
      if (!c) return;
      c.rotation.y += 0.02;
      if (player.position.distanceTo(c.position) < 1) {
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

  function cleanup() {
    cancelAnimationFrame(animId);
    renderer.dispose();
  }

  return cleanup;
}
