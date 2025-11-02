// src/level2.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter, startTimer, stopTimer } from './ui.js';
import { Player } from './player2.js';
import { initCamera, updateCameraFollow } from './camera.js';
import { createCrystals, updateCrystals } from './crystal.js';
import { showMenu } from './menu.js';



export function startLevel2(onComplete) {
    // Toggle this to true to enable debug helpers (bounding boxes, logs)
    const DEBUG = false;

    // Scene setup
    const scene = new THREE.Scene();

    

    
    scene.background = new THREE.Color(0x0b0a08);
    scene.fog = new THREE.FogExp2(0x0b0a08, 0.028);

    const { camera, renderer, controls } = initCamera(scene);
    // -------------------------
//  Global Background Sound (Level 2)
// -------------------------
const listener = new THREE.AudioListener();
const sound = new THREE.Audio(listener);

// Add the listener to the camera so 3D sound works properly
camera.add(listener);

const audioLoader = new THREE.AudioLoader();
audioLoader.load('./sound/level2-sound.mp3', buffer => {
    sound.setBuffer(buffer);
    sound.setLoop(true);          // keep replaying forever
    sound.setVolume(0.5);         // adjust loudness (0.0–1.0)
    sound.play();
}, undefined, err => {
    console.error('Error loading level2-sound.mp3:', err);
});


resetCounter();
    showHUD();
    
   startTimer(180, () => {
  console.log("Time’s up!");
  stopTimer();
  cancelAnimationFrame(animId); // stop rendering
  renderer.domElement.style.filter = 'blur(6px)'; // optional blur

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
    zIndex: 99999, // very high to ensure it's visible
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

  restartBtn.addEventListener('click', () => {
    overlay.remove();
    cleanup();
    renderer.domElement.style.filter = ''; // remove blur
    startLevel2(onComplete);
  });

  menuBtn.addEventListener('click', () => {
    overlay.remove();
    cleanup();
    renderer.domElement.style.filter = '';
    showMenu(() => startLevel2(onComplete));
  });

  box.appendChild(msg);
  box.appendChild(restartBtn);
  box.appendChild(menuBtn);
  overlay.appendChild(box);
  document.body.appendChild(overlay);
});


    // -------------------------
    // Lights (ambient + sun + global)
    // -------------------------
    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    scene.add(ambient);

    const dirLight = new THREE.DirectionalLight(0xfff1d0, 0.45);
    dirLight.position.set(8, 15, 6);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.set(2048, 2048);
    scene.add(dirLight);

    // a subtle global warm fill
    const globalPoint = new THREE.PointLight(0xffe7c0, 0.18, 60);
    globalPoint.position.set(0, 8, -6);
    scene.add(globalPoint);

    // -------------------------
    // Textures & normals
    // -------------------------
    const textureLoader = new THREE.TextureLoader();
    const floorTexture = textureLoader.load('./textures/cave.jpg');
    floorTexture.wrapS = floorTexture.wrapT = THREE.RepeatWrapping;
    floorTexture.repeat.set(12, 12);

    const wallTexture = textureLoader.load('./textures/cave.jpg');
    wallTexture.wrapS = wallTexture.wrapT = THREE.RepeatWrapping;
    wallTexture.repeat.set(6, 3);

    let wallNormal = null, floorNormal = null, rockNormalMap = null;
    try {
        wallNormal = textureLoader.load('./textures/cave.jpg');
        wallNormal.wrapS = wallNormal.wrapT = THREE.RepeatWrapping;
        wallNormal.repeat.set(6, 3);

        floorNormal = textureLoader.load('./textures/cave.jpg');
        floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping;
        floorNormal.repeat.set(12, 12);

        rockNormalMap = textureLoader.load('./textures/cave.jpg');
        rockNormalMap.wrapS = rockNormalMap.wrapT = THREE.RepeatWrapping;
        rockNormalMap.repeat.set(2, 2);
    } catch (e) {
        // missing normals are fine
    }

    // -------------------------
    // Utility: add procedural noise
    // -------------------------
    function addNoiseToGeometry(geometry, scale = 4, strength = 1.5) {
        if (!geometry.attributes.position) return;
        const pos = geometry.attributes.position;
        const tmp = new THREE.Vector3();
        const noise = new ImprovedNoise();
        for (let i = 0; i < pos.count; i++) {
            tmp.fromBufferAttribute(pos, i);
            const n = noise.noise(tmp.x / scale, tmp.y / scale, tmp.z / scale);
            tmp.x += n * strength * (Math.random() * 0.9 + 0.1);
            tmp.y += n * strength * 0.6 * (Math.random() * 0.9 + 0.1);
            tmp.z += n * strength * (Math.random() * 0.9 + 0.1);
            pos.setXYZ(i, tmp.x, tmp.y, tmp.z);
        }
        pos.needsUpdate = true;
        geometry.computeVertexNormals();
    }

    // -------------------------
    // Floor
    // -------------------------
    const soilTexture = textureLoader.load('./textures/soil.jpg'); // <-- your soil image
    soilTexture.wrapS = soilTexture.wrapT = THREE.RepeatWrapping;
    soilTexture.repeat.set(16, 16);

    const floorGeo = new THREE.PlaneGeometry(80, 80, 80, 80);
    addNoiseToGeometry(floorGeo, 25, 0.3);
    floorGeo.rotateX(-Math.PI / 2);

    const floorMat = new THREE.MeshStandardMaterial({
        map: soilTexture,
        roughness: 0.95,
        metalness: 0.05
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.receiveShadow = true;
    floor.name = 'ground_floor';
    scene.add(floor);

    

 // -------------------------
// Falling Rocks (same style as stationary rocks)
// -------------------------

const newObstacles = []; // 

const fallingRocks = [];
const rockTex = textureLoader.load('./textures/cave.jpg');
const fallingRockPositions = [
    [-6, 2], [4, 0], [10, -3], [-10, -5], [0, -10],
    [5, -8], [-8, -2], [12, -6], [-12, 3], [2, -12]
];

// Use the same material/texture as stationary rocks
const fallingRockMatProto = new THREE.MeshStandardMaterial({
    map: rockTex,         // same texture as stationary rocks
    normalMap: rockNormalMap,
    roughness: 0.95,
    metalness: 0.05
});

fallingRockPositions.forEach((pos, i) => {
    const size = 0.5 + Math.random() * 0.7; // smaller or varied sizes than stationary rocks
    const geo = new THREE.SphereGeometry(size, 12, 12);
    addNoiseToGeometry(geo, 3.0, 0.4);
    geo.computeVertexNormals();

    const mat = fallingRockMatProto.clone();
    mat.color = new THREE.Color().setHSL(0.08, 0.15, 0.15 + (i % 5) * 0.04);

    const rock = new THREE.Mesh(geo, mat);
    rock.position.set(pos[0], 15 + Math.random() * 5, pos[1]); // spawn above scene
    rock.castShadow = true;
    rock.receiveShadow = true;
    rock.visible = false; // hidden initially
    rock.name = 'fallingRock';
    scene.add(rock);

    // initial collider
    const collider = new THREE.Box3().setFromObject(rock);

    fallingRocks.push({
        mesh: rock,
        collider,
        type: 'rock',
        falling: false,
        triggered: false,
        targetY: floor.position.y + 0.3,
        delay: i * 12 // staggered fall
    });

    newObstacles.push(fallingRocks[i]);
});


// --- Place new obstacles in the scene ---



function triggerFall() {
    if (player.falling) return;
    player.falling = true;

    // Show popup
    const popup = document.getElementById('popup');
    popup.style.display = 'block';

    // Start falling animation (GSAP)
    gsap.to(player.model.position, {
        y: -5,
        duration: 1.2,
        onComplete: () => {
            // Hide popup
            popup.style.display = 'none';

            // Reset player to spawn
            const spawnX = 0, spawnZ = 6;
            const spawnY = player.getTerrainHeightAt(spawnX, spawnZ) + 0.3;
            player.model.position.set(spawnX, spawnY, spawnZ);
            player.falling = false;
        }
    });
}

    // -------------------------
    // Rocks (scattered around cave, stationary — on both sides, entrance clear)
    // -------------------------
    const rocks = [];
    //const rockTex = textureLoader.load('./textures/cave.jpg');
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;

    const rockMatProto = new THREE.MeshStandardMaterial({
        map: rockTex,
        normalMap: rockNormalMap,
        roughness: 0.95,
        metalness: 0.05
    });

    // Rocks positioned around the cave: both before (-z) and after (+z) tunnels
    const rockPositions = [
        // --- Front / Entrance area (z from 8 to 2) ---
        [-18, 0.2, 10], [-15, 0.2, 8], [-12, 0.2, 11],
        [-8, 0.2, 9], [-5, 0.2, 12], [5, 0.2, 11],
        [8, 0.2, 9], [10, 0.2, 13], [14, 0.2, 8],
        [17, 0.2, 10], [20, 0.2, 12], [-20, 0.2, 7],
        [22, 0.2, 9], [-10, 0.2, 6], [12, 0.2, 6],

        // --- Entrance edges (z from 2 to -6) ---
        [-18, 0.2, 0], [-14, 0.2, -2], [-10, 0.2, -4],
        [-6, 0.2, -5], [6, 0.2, -5], [10, 0.2, -3],
        [14, 0.2, -2], [18, 0.2, -4], [20, 0.2, -6],
        [-20, 0.2, -3], [-22, 0.2, -5],

        // --- Mid cave (z from -8 to -14) ---
        [-16, 0.2, -10], [-12, 0.2, -12], [-8, 0.2, -8],
        [-4, 0.2, -12], [4, 0.2, -10], [8, 0.2, -13],
        [12, 0.2, -9], [16, 0.2, -12], [20, 0.2, -10],
        [-20, 0.2, -14], [22, 0.2, -13],

        // --- Deep cave / tunnels (z from -16 to -24) ---
        [-18, 0.2, -18], [-15, 0.2, -20], [-10, 0.2, -22],
        [-6, 0.2, -19], [-2, 0.2, -23], [2, 0.2, -20],
        [6, 0.2, -24], [10, 0.2, -21], [14, 0.2, -23],
        [18, 0.2, -19], [20, 0.2, -22], [-22, 0.2, -18],
        [-24, 0.2, -20], [22, 0.2, -24], [24, 0.2, -18]
    ];

    for (let i = 0; i < rockPositions.length; i++) {
        const size = 0.7 + (i % 4) * 0.35; // slightly varied sizes for realism
        const geo = new THREE.SphereGeometry(size, 12, 12);
        addNoiseToGeometry(geo, 3.0, 0.4);
        geo.computeVertexNormals();

        const m = rockMatProto.clone();
        m.color = new THREE.Color().setHSL(0.08, 0.15, 0.15 + (i % 5) * 0.04);

        const rock = new THREE.Mesh(geo, m);
        rock.position.set(...rockPositions[i]);
        rock.castShadow = true;
        rock.receiveShadow = true;
        rock.name = 'rock';
        scene.add(rock);
        rocks.push(rock);
    }

    
    // -------------------------
    // Cave shell & tunnels
    // -------------------------
    const caveParts = [];

    const caveGeo = new THREE.SphereGeometry(28, 48, 32);
    caveGeo.scale(1.05, 0.75, 1.05);
    addNoiseToGeometry(caveGeo, 5.5, 2.4);
    caveGeo.computeVertexNormals();

    const caveMat = new THREE.MeshStandardMaterial({
        map: wallTexture,
        normalMap: wallNormal,
        roughness: 1,
        metalness: 0.03,
        side: THREE.BackSide,
        color: new THREE.Color(0x9a8f82)
    });
    wallTexture.repeat.set(4, 2);
    if (wallNormal) wallNormal.repeat.set(4, 2);

    const caveShell = new THREE.Mesh(caveGeo, caveMat);
    caveShell.position.set(0, 8, -6);
    caveShell.receiveShadow = true;
    caveShell.name = 'cave_shell';
    scene.add(caveShell);
    caveParts.push(caveShell);

    function createTunnel(x, y, z, length = 20, radius = 4, yaw = 0) {
    const tunnelGeo = new THREE.CylinderGeometry(radius, radius, length, 24, 6, true);
    tunnelGeo.rotateZ(Math.PI / 2);
    addNoiseToGeometry(tunnelGeo, 3.0, 0.9);
    tunnelGeo.computeVertexNormals();

    // Create new instances of texture for tunnels (so we can tweak repeats independently)
    const tunnelTex = wallTexture;
    const tunnelNormal = wallNormal;


    // Adjust texture tiling to match cylindrical UVs better
    tunnelTex.wrapS = tunnelTex.wrapT = THREE.RepeatWrapping;
    tunnelTex.repeat.set(8, 2); // wider repeat for long tunnels
    if (tunnelNormal) {
        tunnelNormal.wrapS = tunnelNormal.wrapT = THREE.RepeatWrapping;
        tunnelNormal.repeat.set(8, 2);
    }

    const tunnelMat = new THREE.MeshStandardMaterial({
        map: tunnelTex,
        normalMap: tunnelNormal,
        roughness: 1,
        metalness: 0.03,
        side: THREE.BackSide,
        color: new THREE.Color(0x9a8f82) // same tint as cave walls
    });

    const tunnel = new THREE.Mesh(tunnelGeo, tunnelMat);
    tunnel.position.set(x, y + 6, z);
    tunnel.rotation.y = yaw;
    tunnel.castShadow = false;
    tunnel.receiveShadow = true;
    tunnel.name = 'tunnel';

    scene.add(tunnel);
    caveParts.push(tunnel);

    return tunnel;
}


    createTunnel(-12, -1, -6, 20, 4.5, Math.PI * 0.12);
    createTunnel(12, -1, -6, 20, 4.5, -Math.PI * 0.12);
    createTunnel(0, -1, -30, 36, 6.0, 0);
    createTunnel(-22, -1, -18, 18, 3.2, Math.PI * 0.18);

    // -------------------------
    // Torches
    // -------------------------
    const torchGroups = [];
    function createTorch(x, y, z) {
        const g = new THREE.Group();

        // Torch stick
        const stickGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8);
        const stickMat = new THREE.MeshStandardMaterial({ color: 0x402b18, roughness: 1 });
        const stick = new THREE.Mesh(stickGeo, stickMat);
        stick.position.y = 0.6;
        g.add(stick);

        // Metal bowl
        const bowlGeo = new THREE.CylinderGeometry(0.2, 0.3, 0.2, 12);
        const bowlMat = new THREE.MeshStandardMaterial({ color: 0x555555, metalness: 0.6, roughness: 0.3 });
        const bowl = new THREE.Mesh(bowlGeo, bowlMat);
        bowl.position.y = 1.1;
        g.add(bowl);

        //  Flame Sprite
        const flameTexture = new THREE.TextureLoader().load('./textures/torch_flame.png');
        flameTexture.minFilter = THREE.LinearFilter;
        flameTexture.magFilter = THREE.LinearFilter;
        const flameMaterial = new THREE.SpriteMaterial({
            map: flameTexture,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            opacity: 1.0
        });

        const flame = new THREE.Sprite(flameMaterial);
        flame.scale.set(0.9, 1.8, 1);
        flame.position.y = 1.9;
        g.add(flame);

        // Point light for glow
        const light = new THREE.PointLight(0xffa040, 1.4, 8, 2);
        light.position.copy(flame.position);
        g.add(light);

        g.userData = { flame, light, flickerTime: Math.random() * 100 };
        g.position.set(x, y, z);
        scene.add(g);
        torchGroups.push(g);
    }

    // Add torches in the cave
    createTorch(4, 0, 4);
    createTorch(-4, 0, -4);
    createTorch(0, 0, -8);

    function animateFlames(dt) {
        torchGroups.forEach(t => {
            const data = t.userData;
            const time = performance.now() * 0.004 + data.flickerTime;

            // === Flicker intensity ===
            const flicker = 0.85 + Math.sin(time * 1.5) * 0.15;
            // === Opacity and light flicker ===
            data.flame.material.opacity = 0.9 + Math.sin(time * 2.0) * 0.1;
            data.light.intensity = 1.3 + Math.sin(time * 4) * 0.3;
            data.light.color.setHSL(0.08 + Math.sin(time * 2.0) * 0.02, 1.0, 0.5);

            // === Vertical flicker only (no side motion) ===
            const baseHeight = 1.85; // bottom of flame — just above the bowl
            const upFlicker = Math.abs(Math.sin(time * 2.5)) * 0.15; // small upward-only motion
            data.flame.position.y = baseHeight + upFlicker;

            // === Scale flicker: gentle upward stretching ===
            const scaleY = 1.6 + Math.sin(time * 4.0) * 0.25; // vertical “breathing”
            const scaleX = 0.9 + Math.sin(time * 4.0) * 0.1;  // small horizontal flicker
            data.flame.scale.set(scaleX, scaleY, scaleX);
        });
    }

    // -------------------------
    // Mud Pits (front and back, non-colliding)
    // -------------------------
    const mudPits = [];

    // Load mud texture
    const mudTexture = new THREE.TextureLoader().load('./textures/mud.jpg');
    mudTexture.wrapS = THREE.RepeatWrapping;
    mudTexture.wrapT = THREE.RepeatWrapping;

    // Material with texture
    const mudPitMat = new THREE.MeshStandardMaterial({
        map: mudTexture,
        color: 0x946b4a, // lighter warm brown tint
        roughness: 0.85,
        metalness: 0.15
    });

    // FRONT of tunnel (3 mud pits)
    const frontMudZones = [
        { x: -18, z: 5 },
        { x: 0, z: 8 },
        { x: 16, z: 6 }
    ];

    // BEHIND the tunnel (2 mud pits)
    const backMudZones = [
        { x: -8, z: -14 },
        { x: 10, z: -16 }
    ];

    // Combine zones
    const allMudZones = [...frontMudZones, ...backMudZones];

    // Helper: irregular mud shape
    function createMudShape() {
        const shape = new THREE.Shape();
        shape.moveTo(0, 0);
        shape.splineThru([
            new THREE.Vector2(2, 0.5),
            new THREE.Vector2(3, 1.5),
            new THREE.Vector2(2.2, 2.8),
            new THREE.Vector2(0.5, 3.3),
            new THREE.Vector2(-1.5, 3),
            new THREE.Vector2(-2.8, 1.8),
            new THREE.Vector2(-3, 0),
            new THREE.Vector2(-2, -1.5),
            new THREE.Vector2(-0.5, -2.2),
            new THREE.Vector2(1.5, -1.8),
            new THREE.Vector2(2, 0.5)
        ]);
        return shape;
    }

    // Helper: Fix stretched UVs on ShapeGeometry
    function fixUVMapping(geom, textureRepeat = 2) {
        geom.computeBoundingBox();

        const max = geom.boundingBox.max;
        const min = geom.boundingBox.min;
        const offset = new THREE.Vector2(0 - min.x, 0 - min.y);
        const range = new THREE.Vector2(max.x - min.x, max.y - min.y);

        const uv = [];
        const posAttr = geom.attributes.position;

        for (let i = 0; i < posAttr.count; i++) {
            const x = posAttr.getX(i);
            const y = posAttr.getY(i);
            uv.push(((x + offset.x) / range.x) * textureRepeat);
            uv.push(((y + offset.y) / range.y) * textureRepeat);
        }

        geom.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    }

    // Create mud pits
    allMudZones.forEach(zone => {
        const shape = createMudShape();

        const scale = 1 + Math.random() * 0.5;
        const geom = new THREE.ShapeGeometry(shape);
        geom.scale(scale, scale, 1);
        geom.rotateZ(Math.random() * Math.PI);

        //  Fix UV stretching here
        fixUVMapping(geom, 3); // try changing '3' to adjust tiling density

        const mud = new THREE.Mesh(geom, mudPitMat);
        mud.rotation.x = -Math.PI / 2;
        mud.position.set(zone.x, 0.01, zone.z);
        mud.receiveShadow = true;
        mud.name = 'mudPit';
        scene.add(mud);
        mudPits.push(mud);

        // Collider for this mud pit
        const collider = new THREE.Mesh(
            new THREE.CylinderGeometry(2.5 * scale, 2.5 * scale, 1, 12),
            new THREE.MeshBasicMaterial({ visible: false })
        );
        collider.position.set(mud.position.x, 0.5, mud.position.z);
        scene.add(collider);
    });

    // -------------------------
    // Crystals (pickups)
    // -------------------------
    const { crystals, crystalPositions } = createCrystals(scene);

    // -------------------------
    // Player (attach headlamp/light)
    // -------------------------
    let player;
    new Player(scene, new THREE.Vector3(0, 0.5, 6), pl => {
        player = pl;
        player.camera = camera; // attach camera for relative movement
        // Separate obstacles: small objects vs boundaries
        const smallObstacles = [...rocks];
        const boundaries = [...caveParts]; // Cave walls and tunnels

        // Add stalagmites, stalactites, rocks to obstacles
        scene.traverse(obj => {
            if (obj.name === 'stalag' || obj.name === 'stalact' || obj.name === 'rock') {
                if (!smallObstacles.includes(obj)) smallObstacles.push(obj);
            }
        });

       // Add falling rocks to obstacles so player cannot pass through them once they appear
        newObstacles.forEach(ob => {
            if (ob.type === 'rock') {
                player.obstacles.push(ob.mesh);
            }
        });




        player.setObstacles(smallObstacles);
        player.setPits(mudPits);
        player.setBoundaries(boundaries); // Cave walls and tunnels
        // water removed — no setWaterColliders call

        //  Set terrain for height detection
        player.setTerrain(floor);

        //  Set player initial spawn height based on terrain
        const spawnX = 0, spawnZ = 6;
        const spawnY = player.getTerrainHeightAt(spawnX, spawnZ) + 0.3; // offset above ground
        if (player.model) player.model.position.set(spawnX, spawnY, spawnZ);

        // Headlamp attached to player's model
        const headLamp = new THREE.PointLight(0xffffff, 1.2, 14, 2);
        headLamp.position.set(0, 0.6, 0.6);
        if (player.model) player.model.add(headLamp);
        else if (player.mesh) player.mesh.add(headLamp);

        // Debug helpers if requested
        if (DEBUG) {
            const ph = new THREE.BoxHelper(player.model, 0x00ff00);
            scene.add(ph);
            smallObstacles.forEach(o => {
                const bh = new THREE.BoxHelper(o, 0xff0000);
                scene.add(bh);
            });
        }
    });

    // -------------------------
    // HUD, input, clock
    // -------------------------
    initInput();
    
    const clock = new THREE.Clock();
    let animId;

    function incrementCounter() {
        updateHUD(getCounter() + 1);
    }

  // -------------------------
// Animation loop
// -------------------------
function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // --- Update player movement ---
    if (player?.update) {
        try {
            player.update(dt);
        } catch (e) {
            console.warn('Player.update threw', e);
        }
    }

    // --- Torch flicker ---
    animateFlames(dt);

    // --- Crystals / pickups ---
   
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

   if (player && player.model) {
    newObstacles.forEach(ob => {
        if (ob.type === 'rock') { // <-- now checks for 'rock'

            // Trigger fall after interval
            if (!ob.triggered) {
                const distance = player.model.position.distanceTo(new THREE.Vector3(ob.mesh.position.x, 0, ob.mesh.position.z));
                if (distance < 15) { // player nearby
                    ob.triggered = true;
                    setTimeout(() => {
                        ob.falling = true;
                        ob.mesh.visible = true;

                        // Add log to player obstacles so they cannot pass through it
                        player.obstacles.push(ob.mesh);

                    }, ob.delay * 1000);
                }
            }

            if (ob.falling) {
                // Check collision first (prevent passing through player)
                if (ob.collider.containsPoint(player.model.position)) {
                    const pushBack = player.model.position.clone().sub(ob.mesh.position).normalize();
                    player.model.position.add(pushBack.multiplyScalar(0.4));
                    ob.mesh.position.y = Math.max(ob.mesh.position.y, player.model.position.y + 0.6);
                } else {
                    ob.mesh.position.y -= dt * 0.5; // slow fall
                    if (ob.mesh.position.y <= ob.targetY) {
                        ob.mesh.position.y = ob.targetY;
                        ob.falling = false;
                    }
                }

                // Update collider
                ob.collider.min.y = ob.mesh.position.y - 0.5;
                ob.collider.max.y = ob.mesh.position.y + 0.5;
            }
        }
    });
}




    

    // --- Camera follow ---
    updateCameraFollow(camera, player?.model, DEBUG);

    // --- Render the scene ---
    renderer.render(scene, camera);
}
animate();



    // -------------------------
    // Cleanup & helpers
    // -------------------------
    function cleanup() {
  cancelAnimationFrame(animId);
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose?.();
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose?.());
      else obj.material.dispose?.();
    }
  });
  
}


    // WebGL events
    renderer.domElement.addEventListener('webglcontextlost', e => {
        e.preventDefault();
        console.warn('WebGL context lost');
    });
    renderer.domElement.addEventListener('webglcontextrestored', () => {
        console.warn('WebGL context restored');
    });

    // Resize handler
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    return cleanup;
}