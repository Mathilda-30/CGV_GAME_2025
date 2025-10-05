import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';
import { initCamera, updateCamera } from './camera.js';
import { initPlayer, updatePlayer, player } from './player.js';

export function startLevel3(onComplete) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // sky blue

  const camera = initCamera();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows
  const appDiv = document.getElementById('app');
  appDiv.innerHTML = ''; // Clear only app div
  appDiv.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Hemisphere light for subtle sky gradient
  const hemi = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
  scene.add(hemi);

  // Texture loader for shared use
  const textureLoader = new THREE.TextureLoader();

  // Main island ground
  const sandTexture = textureLoader.load('/level3/ground/Ground054_2K-JPG_Color.jpg');
  const sandNormal = textureLoader.load('/level3/ground/Ground054_2K-JPG_NormalGL.jpg');
  const sandDisplacement = textureLoader.load('/level3/ground/Ground054_2K-JPG_Displacement.jpg');
  sandTexture.wrapS = sandTexture.wrapT = THREE.RepeatWrapping;
  sandNormal.wrapS = sandNormal.wrapT = THREE.RepeatWrapping;
  sandDisplacement.wrapS = sandDisplacement.wrapT = THREE.RepeatWrapping;
  sandTexture.repeat.set(10, 10);
  sandNormal.repeat.set(10, 10);
  sandDisplacement.repeat.set(10, 10);
  const groundGeometry = new THREE.PlaneGeometry(50, 50, 64, 64);
  const groundMaterial = new THREE.MeshStandardMaterial({
    map: sandTexture,
    normalMap: sandNormal,
    displacementMap: sandDisplacement,
    displacementScale: 0.5,
    roughness: 1,
    metalness: 0
  });
  const mainIsland = new THREE.Mesh(groundGeometry, groundMaterial);
  mainIsland.rotation.x = -Math.PI / 2;
  mainIsland.receiveShadow = true;
  scene.add(mainIsland);

  // Floating islands (3 small elevated platforms)
  function addFloatingIsland(x, y, z, size) {
    const islandGeometry = new THREE.PlaneGeometry(size, size, 32, 32);
    const island = new THREE.Mesh(islandGeometry, groundMaterial.clone());
    island.rotation.x = -Math.PI / 2;
    island.position.set(x, y, z);
    island.receiveShadow = true;
    scene.add(island);
  }
  addFloatingIsland(20, 5, 20, 10); // Island 1
  addFloatingIsland(-20, 7, -20, 8); // Island 2
  addFloatingIsland(0, 10, -30, 12); // Island 3

  // Water surrounding the island
  const waterGeo = new THREE.CircleGeometry(50, 64);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1ca3ec,
    transparent: true,
    opacity: 0.7
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.01;
  scene.add(water);

  // Simple palm trees
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    trunk.position.set(x, 1, z);
    trunk.castShadow = true;

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x228b22 })
    );
    leaves.position.set(x, 2.5, z);
    leaves.castShadow = true;

    scene.add(trunk, leaves);
  }
  addPalm(3, -3);
  addPalm(-4, 2);
  addPalm(-2, -5);
  addPalm(4, 4);
  addPalm(0, 0);

  // Bushes
  function addBush(x, z) {
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
    bush.position.set(x, 0.8, z);
    bush.castShadow = true;
    scene.add(bush);
  }
  addBush(5, -5);
  addBush(-3, 3);
  addBush(1, -7);

  // Small trees
  function addSmallTree(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.15, 0.15, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x8b4513 })
    );
    trunk.position.set(x, 0.75, z);
    trunk.castShadow = true;

    const canopy = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.5, 8),
      new THREE.MeshStandardMaterial({ color: 0x3cb371 })
    );
    canopy.position.set(x, 1.8, z);
    canopy.castShadow = true;

    scene.add(trunk, canopy);
  }
  addSmallTree(-5, -2);
  addSmallTree(2, 6);
  addSmallTree(-1, -4);

  // Ferns
  function addFern(x, z) {
    const fern = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1.5),
      new THREE.MeshStandardMaterial({ color: 0x228b22, side: THREE.DoubleSide })
    );
    fern.position.set(x, 0.5, z);
    fern.rotation.x = -Math.PI / 2;
    fern.castShadow = true;
    scene.add(fern);
  }
  addFern(6, 2);
  addFern(-2, 5);
  addFern(3, -6);

  // Static staircase platforms to Island 3
  const platformMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  function addStairPlatform(x, y, z) {
    const platform = new THREE.Mesh(
      new THREE.BoxGeometry(5, 0.5, 5),
      platformMaterial
    );
    platform.position.set(x, y, z);
    platform.castShadow = true;
    platform.receiveShadow = true;
    scene.add(platform);
  }
  // Staircase from main island (y=0) to Island 3 (y=10, z=-30)
  addStairPlatform(0, 2, 0);    // Step 1
  addStairPlatform(0, 4, -6);   // Step 2
  addStairPlatform(0, 6, -12);  // Step 3
  addStairPlatform(0, 8, -18);  // Step 4
  addStairPlatform(0, 10, -24); // Step 5 (near Island 3)

  // Initialize player
  initPlayer(scene);

  // Crystals
  let crystals = [];
  const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa });
  const positions = [[0, 0.5, -2], [-4, 0.5, 1], [0, 0.5, -6]];
  positions.forEach(p => {
    const m = new THREE.Mesh(crystalGeo, crystalMat.clone());
    m.position.set(...p);
    m.castShadow = true;
    scene.add(m);
    crystals.push(m);
  });

  // Input + HUD
  initInput();
  resetCounter();
  showHUD();

  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Update player movement
    updatePlayer(dt);

    // Update camera to follow player with 360-degree orbit
    updateCamera(camera, dt);

    // Animate crystals
    crystals.forEach((c, i) => {
      if (!c) return;
      c.rotation.y += 0.02;
      if (player.mesh.position.distanceTo(c.position) < 1) {
        scene.remove(c);
        crystals[i] = null;
        updateHUD(getCounter() + 1);

        if (getCounter() === crystals.length) {
          setTimeout(() => {
            cleanup();
            onComplete();
          }, 500);
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