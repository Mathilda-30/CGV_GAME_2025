// island.js

import * as THREE from 'three';
import { createNoise2D } from 'simplex-noise';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Water } from 'three/addons/objects/Water.js';

const ISLAND_SEED = 'my-cool-island-123';
const noise2D = createNoise2D(() => ISLAND_SEED);

const textureLoader = new THREE.TextureLoader();
// Textures
const colorMap = textureLoader.load('./level3/ground/Ground054_2K-JPG_Color.jpg');
const aoMap = textureLoader.load('./level3/ground/Ground054_2K-JPG_AmbientOcclusion.jpg');
const roughnessMap = textureLoader.load('./level3/ground/Ground054_2K-JPG_Roughness.jpg');
const normalMap = textureLoader.load('./level3/ground/Ground054_2K-JPG_NormalDX.jpg');
const textureRepeat = 20;
for (let map of [colorMap, aoMap, roughnessMap, normalMap]) {
  map.wrapS = THREE.RepeatWrapping; map.wrapT = THREE.RepeatWrapping;
  map.repeat.set(textureRepeat, textureRepeat);
}

// Store terrain height data for direct access
let terrainHeights = [];
let terrainSize = 100;
let segments = 100;

// Create GLTF loader instance
const gltfLoader = new GLTFLoader();
let palmTreeModel = null;
let palmTreeLoading = false;
let palmTreeLoadCallbacks = [];

// Animation objects
let ambientLife = null;
let water = null; // Holds the water object

// Load the palm tree model once
function loadPalmTreeModel() {
  if (palmTreeModel) return Promise.resolve(palmTreeModel);
  if (palmTreeLoading) {
    return new Promise((resolve) => {
      palmTreeLoadCallbacks.push(resolve);
    });
  }
  palmTreeLoading = true;
  return new Promise((resolve, reject) => {
    gltfLoader.load(
      './level3/palm/quiver_tree_02_4k.gltf',
      (gltf) => {
        console.log('Palm tree GLTF model loaded successfully!');
        const model = gltf.scene;
        model.scale.set(4, 4, 4);
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });
        palmTreeModel = model;
        palmTreeLoading = false;
        palmTreeLoadCallbacks.forEach(callback => callback(palmTreeModel));
        palmTreeLoadCallbacks = [];
        resolve(palmTreeModel);
      },
      (progress) => { /* Loading... */ },
      (error) => {
        console.error('Error loading palm tree GLTF:', error);
        palmTreeLoading = false;
        reject(error);
      }
    );
  });
}

// ==================== BEACH & SHORELINE ====================
function createBeachDetails(scene) {
  console.log('Creating beach details...');
  const beachGeometry = new THREE.RingGeometry(35, 45, 32);
  const beachMaterial = new THREE.MeshStandardMaterial({
    color: 0xF0E68C,
    roughness: 0.9
  });
  const beach = new THREE.Mesh(beachGeometry, beachMaterial);
  beach.rotation.x = -Math.PI / 2;
  beach.position.y = -0.3;
  beach.receiveShadow = true;
  scene.add(beach);

  // Sea shells and pebbles
  for (let i = 0; i < 50; i++) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 38 + Math.random() * 6;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const shellSize = 0.05 + Math.random() * 0.08;
    const shell = new THREE.Mesh(
      new THREE.SphereGeometry(shellSize, 4, 4),
      new THREE.MeshStandardMaterial({ 
        color: Math.random() > 0.5 ? 0xFFEBCD : 0xFFD700,
        roughness: 0.8
      })
    );
    shell.position.set(x, -0.35, z);
    shell.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    scene.add(shell);
  }
  console.log('Beach with shells created');
}

// ==================== ROCK FORMATIONS ====================
function createRockFormations(scene, world, RAPIER) {
  console.log('Creating rock formations...');
  const rockPositions = [
    [35, 35], [-35, 35], [35, -35], [-35, -35],
    [30, 0], [-30, 0], [0, 30], [0, -30],
    [32, 25], [-32, 25], [32, -25], [-32, -25]
  ];
  rockPositions.forEach(([x, z]) => {
    const rockGroup = new THREE.Group();
    const rockCount = 3 + Math.floor(Math.random() * 4);
    for (let i = 0; i < rockCount; i++) {
      const rockSize = 0.8 + Math.random() * 1.5;
      const rockGeo = new THREE.DodecahedronGeometry(rockSize, 0);
      const rockMat = new THREE.MeshStandardMaterial({ 
        color: 0x666666,
        roughness: 0.9,
        metalness: 0.1
      });
      const rock = new THREE.Mesh(rockGeo, rockMat);
      const offsetX = (Math.random() - 0.5) * 4;
      const offsetZ = (Math.random() - 0.5) * 4;
      rock.position.set(offsetX, rockSize, offsetZ);
      rock.rotation.set(Math.random() * 0.5, Math.random() * Math.PI, Math.random() * 0.5);
      rock.castShadow = true;
      rockGroup.add(rock);
    }
    const gridX = Math.floor((x + 50) / 100 * 100);
    const gridZ = Math.floor((z + 50) / 100 * 100);
    const vertexIndex = gridZ * 101 + gridX;
    const groundY = vertexIndex < terrainHeights.length ? terrainHeights[vertexIndex] : 0;
    rockGroup.position.set(x, groundY, z);
    scene.add(rockGroup);
    const rockBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, groundY + 2, z);
    const rockRigidBody = world.createRigidBody(rockBodyDesc);
    const rockColliderDesc = RAPIER.ColliderDesc.ball(2);
    world.createCollider(rockColliderDesc, rockRigidBody);
  });
  console.log('Rock formations created');
}

// ==================== VEGETATION & UNDERBRUSH ====================
function createUnderbrush(scene) {
  console.log('Creating underbrush vegetation...');
  const bushCount = 60;
  let bushesPlanted = 0;
  for (let i = 0; i < bushCount * 3; i++) {
    const x = (Math.random() - 0.5) * 60;
    const z = (Math.random() - 0.5) * 60;
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 12 || distanceFromCenter > 35) continue;
    const gridX = Math.floor((x + 50) / 100 * 100);
    const gridZ = Math.floor((z + 50) / 100 * 100);
    const vertexIndex = gridZ * 101 + gridX;
    if (vertexIndex >= terrainHeights.length) continue;
    const groundY = terrainHeights[vertexIndex];
    if (groundY < -0.3) continue;
    const bushSize = 0.4 + Math.random() * 0.3;
    const bush = new THREE.Mesh(
      new THREE.SphereGeometry(bushSize, 6, 6),
      new THREE.MeshStandardMaterial({ 
        color: new THREE.Color().setHSL(0.3, 0.7, 0.3 + Math.random() * 0.2),
        roughness: 0.9
      })
    );
    bush.position.set(x, groundY + bushSize/2, z);
    bush.castShadow = true;
    scene.add(bush);
    bushesPlanted++;
    if (bushesPlanted >= bushCount) break;
  }
  console.log(`Created ${bushesPlanted} bushes as underbrush`);
}

// ==================== AMBIENT LIFE ====================
function createAmbientLife(scene) {
  console.log('Creating ambient life...');
  const lifeGeometry = new THREE.BufferGeometry();
  const lifeCount = 20;
  const positions = new Float32Array(lifeCount * 3);
  const colors = new Float32Array(lifeCount * 3);
  for (let i = 0; i < lifeCount * 3; i += 3) {
    const angle = Math.random() * Math.PI * 2;
    const radius = 15 + Math.random() * 30;
    positions[i] = Math.cos(angle) * radius;
    positions[i + 1] = 3 + Math.random() * 8;
    positions[i + 2] = Math.sin(angle) * radius;
    colors[i] = Math.random() * 0.5 + 0.5;
    colors[i + 1] = Math.random() * 0.3 + 0.3;
    colors[i + 2] = Math.random() * 0.5 + 0.2;
  }
  lifeGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  lifeGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  const lifeParticles = new THREE.Points(
    lifeGeometry,
    new THREE.PointsMaterial({ 
      size: 0.3, vertexColors: true, transparent: true, opacity: 0.7
    })
  );
  scene.add(lifeParticles);
  console.log('Ambient life particles created');
  return lifeParticles;
}

// ==================== ANIMATION FUNCTIONS ====================
export function animateIslandElements(dt) { // dt is passed in
  if (ambientLife) {
    animateAmbientLife();
  }
  // Animate water
  if (water) {
    water.material.uniforms[ 'time' ].value += dt * 1.0; // Use dt for smooth animation
  }
}

function animateAmbientLife() {
  const positions = ambientLife.geometry.attributes.position.array;
  const time = Date.now() * 0.001;
  for (let i = 0; i < positions.length; i += 3) {
    positions[i + 1] += Math.sin(time + i * 0.1) * 0.005;
    positions[i] += Math.cos(time + i * 0.05) * 0.002;
    positions[i + 2] += Math.sin(time + i * 0.05) * 0.002;
  }
  ambientLife.geometry.attributes.position.needsUpdate = true;
}

// ==================== EXISTING TREE FUNCTIONS ====================
function createTree(scene, world, RAPIER, x, z) {
  const gridX = Math.floor((x + 50) / 100 * 100);
  const gridZ = Math.floor((z + 50) / 100 * 100);
  const vertexIndex = gridZ * 101 + gridX;
  if (vertexIndex >= terrainHeights.length) return false;
  const groundY = terrainHeights[vertexIndex];
  const waterLevel = -0.5;
  if (groundY < waterLevel) return false;
  const baseY = groundY + 0.1;
  if (palmTreeModel) {
    const palmInstance = palmTreeModel.clone();
    palmInstance.position.set(x, baseY, z);
    const scaleVariation = 0.7 + Math.random() * 0.6;
    palmInstance.scale.set(4 * scaleVariation, 4 * scaleVariation, 4 * scaleVariation);
    palmInstance.rotation.y = Math.random() * Math.PI * 2;
    scene.add(palmInstance);
    const trunkHeight = 5;
    const trunkRadius = 0.5;
    const trunkBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(x, baseY + trunkHeight / 2, z);
    const trunkRigidBody = world.createRigidBody(trunkBodyDesc);
    const trunkColliderDesc = RAPIER.ColliderDesc.cylinder(trunkHeight / 2, trunkRadius);
    world.createCollider(trunkColliderDesc, trunkRigidBody);
    return true;
  }
  return false;
}

function plantAllTrees(scene, world, RAPIER) {
  console.log('Planting palm trees...');
  const treeCount = 40;
  let treesPlanted = 0;
  const testPositions = [
    [5, 5], [10, 10], [15, 15], [-10, 10], [10, -10], [-15, -15], [20, 0], [0, 20],
    [25, 5], [-5, 25], [30, -15], [-20, 20], [35, 10], [-35, 10], [10, 35], [-10, 35]
  ];
  for (let [x, z] of testPositions) {
    if (treesPlanted >= treeCount) break;
    if (createTree(scene, world, RAPIER, x, z)) treesPlanted++;
  }
  let attempts = 0;
  const maxAttempts = 80;
  while (treesPlanted < treeCount && attempts < maxAttempts) {
    attempts++;
    const x = (Math.random() - 0.5) * (terrainSize - 30);
    const z = (Math.random() - 0.5) * (terrainSize - 30);
    const distanceFromCenter = Math.sqrt(x * x + z * z);
    if (distanceFromCenter < 12) continue;
    if (createTree(scene, world, RAPIER, x, z)) treesPlanted++;
  }
  console.log(`FINAL: ${treesPlanted} / ${treeCount} palm trees planted.`);
}

// ==================== MAIN ISLAND CREATION ====================
export function createIsland(scene, world, RAPIER) {
  console.log('Creating complete island environment...');
  
  // --- Create Terrain First ---
  const geometry = new THREE.PlaneGeometry(terrainSize, terrainSize, segments, segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const vertices = [];
  terrainHeights = []; // Clear array

  const noiseScale1 = 50, amplitude1 = 3.5;
  const noiseScale2 = 25, amplitude2 = 1.0;
  const noiseScale3 = 10, amplitude3 = 0.3;

  console.log('Generating terrain hills using seed:', ISLAND_SEED);
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    let height = noise2D(x / noiseScale1, z / noiseScale1) * amplitude1;
    height += noise2D(x / noiseScale2, z / noiseScale2) * amplitude2;
    height += noise2D(x / noiseScale3, z / noiseScale3) * amplitude3;
    positions.setY(i, height);
    vertices.push(x, height, z);
    terrainHeights.push(height);
  }

  geometry.attributes.position.needsUpdate = true;
  geometry.setAttribute('uv2', new THREE.BufferAttribute(geometry.attributes.uv.array, 2));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    map: colorMap, normalMap: normalMap, roughnessMap: roughnessMap,
    aoMap: aoMap, aoMapIntensity: 1, roughness: 1,
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  scene.add(mesh);

  // --- Add New Features ---
  createBeachDetails(scene);
  createRockFormations(scene, world, RAPIER);
  createUnderbrush(scene);
  ambientLife = createAmbientLife(scene);

  // --- Physics: Trimesh Collider ---
  if (!geometry.index) {
    console.error("Geometry has no index buffer! Cannot create trimesh.");
    return;
  }
  const indices = geometry.index.array;
  const verticesFloat32 = new Float32Array(vertices);

  console.log(`Creating trimesh collider...`);
  const groundColliderDesc = RAPIER.ColliderDesc.trimesh(verticesFloat32, indices);
  const groundBodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(0, 0, 0);
  const groundRigidBody = world.createRigidBody(groundBodyDesc);
  world.createCollider(groundColliderDesc, groundRigidBody);
  console.log('Island trimesh physics created.');

  // --- Load and Plant Palm Trees ---
  console.log('Pre-loading palm tree GLTF model...');
  loadPalmTreeModel()
    .then(() => {
      console.log('Palm tree model ready! Planting trees now...');
      plantAllTrees(scene, world, RAPIER);
    })
    .catch(error => {
      console.error('Failed to load palm tree model:', error);
    });

  console.log('Island creation complete with beach, rocks, and vegetation!');

  // --- DYNAMIC WATER (REFINED) ---
  const waterNormals = textureLoader.load(
    './level3/water/Water_002_NORM.jpg', 
    function ( texture ) {
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  });

  const waterGeo = new THREE.PlaneGeometry(200, 200);
  
  water = new Water( // Assign to module-level variable
      waterGeo,
      {
          textureWidth: 512,
          textureHeight: 512,
          waterNormals: waterNormals,
          sunDirection: new THREE.Vector3(50, 50, 50).normalize(),
          sunColor: 0xffffff,
          waterColor: 0x0099ff,
          distortionScale: 2.0,
          fog: scene.fog !== undefined,
          alpha: 0.8
      }
  );

  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.5;
  scene.add(water);
  console.log('Dynamic Water object added.');

  
  return water;
}