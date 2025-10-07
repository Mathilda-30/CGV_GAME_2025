
import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';
import { initCamera, updateCamera } from './camera.js';
import { initPlayer, updatePlayer, player } from './player.js';
//import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { collisionManager } from './level3Collisions.js';

export function startLevel3(onComplete) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // sky blue

  const camera = initCamera();
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.shadowMap.enabled = true; // Enable shadows
  const appDiv = document.getElementById('app');
// Instead of just appending...
document.body.innerHTML = ""; // 🔥 clears old canvas + HUD
document.body.appendChild(renderer.domElement);

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
  addFloatingIsland(-20, 7, -20, 16); // Island 2
  addFloatingIsland(0, 10, -30, 12); // Island 3

  // Register ground
collisionManager.addGround(
  new THREE.Vector3(-25, -0.1, -25),
  new THREE.Vector3(25, 0.1, 25)
);

// Register floating islands
collisionManager.addPlatform(
  new THREE.Vector3(20, 5, 20),
  new THREE.Vector3(10, 0.5, 10)
);
collisionManager.addPlatform(
  new THREE.Vector3(-20, 7, -20),
  new THREE.Vector3(8, 0.5, 8)
);
collisionManager.addPlatform(
  new THREE.Vector3(0, 10, -30),
  new THREE.Vector3(12, 0.5, 12)
);

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
  function addBush(x, z, y = 0.8, radius = 0.8, width = 8, height = 8) {
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(radius, width, height),
      new THREE.MeshStandardMaterial({ color: 0x2e8b57 })
    );
    bush.position.set(x, y, z);
    bush.castShadow = true;
    scene.add(bush);
  }

  // Bush Wall

  function addBushWall(startX, startZ, endX, endZ, spacing, elevation, radius, width, height) {
    const length = Math.hypot(endX - startX, endZ - startZ);
    const angle = Math.atan2(endZ - startZ, endX - startX);
    const count = Math.floor(length / spacing);
    for (let i = 0; i <= count; i++) {
      const x = startX + (i / count) * (endX - startX);
      const z = startZ + (i / count) * (endZ - startZ);
      // Make bush walls taller by increasing y and radius
      addBush(x, z, elevation, radius, width, height);
    }
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

    // Register with collision manager
    collisionManager.addPlatform(
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(5, 0.5, 5)
  );
    return platform;
  }
  // Staircase from main island (y=0) to Island 3 (y=10, z=-30)
  addStairPlatform(0, 2, 0);    // Step 1
  addStairPlatform(0, 4, -6);   // Step 2
  addStairPlatform(0, 6, -12);  // Step 3
  addStairPlatform(0, 8, -18);  // Step 4
  addStairPlatform(0, 10, -24); // Step 5 (near Island 3)


// simple maze 
function addBushMaze(mazeX, mazeZ, mazeLayout, mazeSize, wallHeight) {
  const cellSize = mazeSize / mazeLayout.length;
  const bushes = [];

  for (let i = 0; i < mazeLayout.length; i++) {
    for (let j = 0; j < mazeLayout[i].length; j++) {
      if (mazeLayout[i][j] === 1) {
        const x = mazeX - (mazeLayout.length * cellSize) / 2 + j * cellSize + cellSize / 2;
        const z = mazeZ - (mazeLayout.length * cellSize) / 2 + i * cellSize + cellSize / 2;
        
        // Add bush at this wall position
        // Adjust radius to fill the cell
        addBush(x, z, wallHeight / 2 + 7, cellSize / 2, 8, 8);
        
        bushes.push({ x, z });
      }
    }
  }
  
  return bushes;
}




  // Load maps for maze walls texture
const wallAlbedoTexture = textureLoader.load('/level3/walls/albedo.png');
const wallNormalTexture = textureLoader.load('/level3/walls/ogl.png');
const wallHeightTexture = textureLoader.load('/level3/walls/height.png');
const wallAOTexture = textureLoader.load('/level3/walls/ao.png');


// Set texture wrapping + tiling
[wallAlbedoTexture, wallNormalTexture, wallHeightTexture, wallAOTexture].forEach(tex => {
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 1); // increase for more tiling (e.g. 2, 2 or 4, 4)
});


const wallMaterial = new THREE.MeshStandardMaterial({
  map: wallAlbedoTexture,
  normalMap: wallNormalTexture,
  aoMap: wallAOTexture,
  displacementMap: wallHeightTexture,
  displacementScale: 0.15, // tweak for wall geometry
  roughness: 0.8,          // tweak lighting reflection
  metalness: 0.0           
});

const greenWallMaterial = new THREE.MeshStandardMaterial({ color: 0xcccccc });

    // A simple 2D maze layout (1 = wall, 0 = path)
const mazeLayout = [
  [1,1,1,1,1,1,1,1,1,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,0,1,1,1,1,1,1,0,1],
  [1,0,1,0,0,0,0,1,0,1],
  [1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,0,0,0,1,0,1],
  [1,0,1,1,1,1,1,1,0,1],
  [1,0,0,0,0,0,0,0,0,1],
  [1,1,1,1,1,1,1,1,1,1]
];

  // Maze parameters
  const mazeSize = 25;
  const wallHeight = 3;
  const mazeX = -20;
  const mazeZ = -20;
  const cellSize = mazeSize / mazeLayout.length;
  addBushMaze(mazeX, mazeZ, mazeLayout, mazeSize, wallHeight);
  //bushMaze.position.y = 7; // maze elevation

  // Register maze wall collisions
  for (let i = 0; i < mazeLayout.length; i++) {
    for (let j = 0; j < mazeLayout[i].length; j++) {
      if (mazeLayout[i][j] === 1) {
        const min = new THREE.Vector3(
          mazeX - mazeSize / 2 + j * cellSize,
          7,
          mazeZ - mazeSize / 2 + i * cellSize
        );
        const max = new THREE.Vector3(
          mazeX - mazeSize / 2 + (j + 1) * cellSize,
          7 + wallHeight,
          mazeZ - mazeSize / 2 + (i + 1) * cellSize
        );
        collisionManager.addMazeWall(min, max);
      }
    }
  }


// Ladder for the wall of the second island
  function addLadder(x, y, z, height) {
    // Ladder sides
    const sideGeom = new THREE.CylinderGeometry(0.07, 0.07, height, 8);
    const sideMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b });
    const left = new THREE.Mesh(sideGeom, sideMat);
    const right = new THREE.Mesh(sideGeom, sideMat);
    left.position.set(x - 0.3, y + height/2, z);
    right.position.set(x + 0.3, y + height/2, z);
    // Ladder rungs
    const rungGeom = new THREE.CylinderGeometry(0.05, 0.05, 0.6, 8);
    const rungMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    for (let i = 0; i < Math.floor(height); i++) {
      const rung = new THREE.Mesh(rungGeom, rungMat);
      rung.position.set(x, y + 0.5 + i, z);
      rung.rotation.z = Math.PI / 2;
      scene.add(rung);
    }
    scene.add(left);
    scene.add(right);
  }


  addLadder(-20, 7.3, -17, 3.5); 

// Moving platforms
const movingPlatforms = [];

function addMovingPlatform(x, y, z, speed = 2, range = 5) {
  const platform = addStairPlatform(x, y, z);
  platform.userData = {
    startX: x,
    speed,
    range,
    direction: 1
  };
  movingPlatforms.push(platform);
  return platform;
}

// Create moving platforms in front of starting floating island
addMovingPlatform(-20, 7, -25, 2, 6);  // Platform 1
addMovingPlatform(-25, 7, -20, 2.5, 5); // Platform 2
addMovingPlatform(-30, 7, -30, 1.5, 7); // Platform 3




  // Initialize player
  initPlayer(scene, -0.5,-0.5);

  // Crystals
  let crystals = [];
  const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa });
  // Place one crystal on each floating island
  const positions = [
    [20, 5.7, 20],    // Island 1 (centered, slightly above surface)
    [-20, 12, -20],  // Island 2
    [0, 10.7, -30]    // Island 3
  ];
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

    // Animate moving platforms
    const time = clock.getElapsedTime();
    movingPlatforms.forEach(p => {
      p.position.x = p.userData.startX + Math.sin(time * p.userData.speed) * p.userData.range;
    });
    // Update moving platform collision boxes
    collisionManager.updateMovingPlatforms(movingPlatforms);

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