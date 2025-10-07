// src/level2.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Water } from 'three/examples/jsm/objects/Water.js';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';
import { Player } from './player2.js';

export function startLevel2(onComplete) {
    // Toggle this to true to enable debug helpers (bounding boxes, logs)
    const DEBUG = false;

    // -------------------------
    // Scene / Camera / Renderer
    // -------------------------
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0b0a08);
    scene.fog = new THREE.FogExp2(0x0b0a08, 0.028);

    const camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    camera.position.set(0, 5, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.innerHTML = '';
    document.body.appendChild(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.enabled = false; // disabled for gameplay

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
    const floorTexture = textureLoader.load('./textures/rock.jpeg');
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

        floorNormal = textureLoader.load('./textures/rock.jpeg');
        floorNormal.wrapS = floorNormal.wrapT = THREE.RepeatWrapping;
        floorNormal.repeat.set(12, 12);

        rockNormalMap = textureLoader.load('./textures/rock.jpeg');
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
    // Rocks (round boulders)
    // -------------------------
    const rocks = [];
    const rockTex = textureLoader.load('./textures/cave.jpg');
    rockTex.wrapS = rockTex.wrapT = THREE.RepeatWrapping;

    const rockMatProto = new THREE.MeshStandardMaterial({
        map: rockTex,
        normalMap: rockNormalMap,
        roughness: 0.95,
        metalness: 0.05
    });

    for (let i = 0; i < 24; i++) {
        const size = 0.6 + Math.random() * 1.6;
        const geo = new THREE.SphereGeometry(size, 12, 12);
        addNoiseToGeometry(geo, 3.0, 0.4);
        geo.computeVertexNormals();

        const m = rockMatProto.clone();
        m.color = new THREE.Color().setHSL(0.1, 0.15, 0.15 + Math.random() * 0.05);

        const rock = new THREE.Mesh(geo, m);
        rock.position.set(
            (Math.random() - 0.5) * 36,
            0.2 + Math.random() * 0.2,
            -6 + (Math.random() - 0.5) * 36
        );
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

    const caveGeo = new THREE.SphereGeometry(28, 96, 64);
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
        const tunnelGeo = new THREE.CylinderGeometry(radius, radius, length, 32, 6, true);
        tunnelGeo.rotateZ(Math.PI / 2);
        addNoiseToGeometry(tunnelGeo, 3.0, 0.9);

        const tunnelMat = new THREE.MeshStandardMaterial({
            map: wallTexture,
            normalMap: wallNormal,
            roughness: 1,
            side: THREE.BackSide
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

        // 🔥 Flame Sprite
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
    // Invisible pits (colliders)
    // -------------------------
    const pits = [];
    const pitGeo = new THREE.BoxGeometry(2.2, 0.1, 2.2);
    const pitMat = new THREE.MeshBasicMaterial({ color: 0x000000, visible: false });
    const pitPositions = [
        [5, 0, 5],
        [-4, 0, -4]
    ];
    pitPositions.forEach(p => {
        const pit = new THREE.Mesh(pitGeo, pitMat);
        pit.position.set(...p);
        pit.name = 'pit';
        scene.add(pit);
        pits.push(pit);
    });

    // -------------------------
// Mud Pits (randomized)
// -------------------------
const mudPits = [];
const mudPitGeo = new THREE.BoxGeometry(3, 0.1, 3); // width, height, depth
const mudPitMat = new THREE.MeshStandardMaterial({ 
    color: 0x523a28, // brown mud color
    roughness: 1,
    metalness: 0.05
});

// Randomized mud pit placement
for (let i = 0; i < 5; i++) { // number of mud pits
    const x = (Math.random() - 0.5) * 60; // adjust to floor bounds
    const z = (Math.random() - 0.5) * 60;
    const mud = new THREE.Mesh(mudPitGeo, mudPitMat);
    mud.position.set(x, 0.05, z); // slightly above floor
    mud.receiveShadow = true;
    mud.name = 'mudPit';
    scene.add(mud);
    mudPits.push(mud);

    // Also add invisible collider
    const mudCollider = new THREE.Mesh(
        new THREE.BoxGeometry(3, 1.0, 3),
        new THREE.MeshBasicMaterial({ visible: false })
    );
    mudCollider.position.set(x, 0.5, z);
    scene.add(mudCollider);
    pits.push(mudCollider); // add to player's pits array
}


    // -------------------------
    // Waterfall & pond
    // -------------------------
   

    function createPond(x, y, z, radius = 3) {
        const pondGeo = new THREE.CircleGeometry(radius, 32);
        const pondMat = new THREE.MeshPhongMaterial({
            color: 0x2e89b5,
            transparent: true,
            opacity: 0.8,
            emissive: 0x114466,
            emissiveIntensity: 0.3,
            side: THREE.DoubleSide
        });
        const pond = new THREE.Mesh(pondGeo, pondMat);
        pond.rotation.x = -Math.PI / 2;
        pond.position.set(x, y, z);
        scene.add(pond);
        return pond;
    }

    function createRocksAroundPond(x, y, z, radius = 3) {
        const rockMat = new THREE.MeshStandardMaterial({ color: 0x555555, roughness: 1 });
        for (let i = 0; i < 15; i++) {
            const angle = Math.random() * Math.PI * 2;
            const dist = radius + (Math.random() * 0.6 - 0.3);
            const rx = x + Math.cos(angle) * dist;
            const rz = z + Math.sin(angle) * dist;
            const rockGeo = new THREE.DodecahedronGeometry(0.3 + Math.random() * 0.3);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.position.set(rx, y, rz);
            rock.castShadow = true;
            rock.receiveShadow = true;
            scene.add(rock);
        }
    }
   
    const pond = createPond(0, 0.01, -19, 3);
    createRocksAroundPond(0, 0.01, -19, 3);

    // -------------------------
    // Crystals (pickups)
    // -------------------------
    const crystals = [];
    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x44e6ff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.1
    });
    const crystalPositions = [
        [2, 0.5, -3],
        [-6, 0.5, 2],
        [8, 0.5, -8]
    ];
    crystalPositions.forEach(p => {
        const c = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), crystalMat.clone());
        c.position.set(...p);
        c.castShadow = true;
        c.name = 'crystal';
        scene.add(c);
        crystals.push(c);

        const light = new THREE.PointLight(0x33ccff, 0.9, 8);
        light.position.copy(c.position).add(new THREE.Vector3(0, 1, 0));
        scene.add(light);
    });

    // -------------------------
    // Player (attach headlamp/light)
    // -------------------------
    let player;
    // In the player initialization section, replace the obstacle setup:
new Player(scene, new THREE.Vector3(0, 0.5, 6), pl => {
    player = pl;

    // Separate obstacles: small objects vs boundaries
    const smallObstacles = [...rocks];
    const boundaries = [...caveParts]; // Cave walls and tunnels

    // Add stalagmites and stalactites to small obstacles
    scene.traverse(obj => {
        if (obj.name === 'stalag' || obj.name === 'stalact' || obj.name === 'rock') {
            if (!smallObstacles.includes(obj)) smallObstacles.push(obj);
        }
    });

    player.setObstacles(smallObstacles);
    player.setPits(pits);
    player.setBoundaries(boundaries); // Add this line

    

        // Ensure player's model is at a reasonable scale & starting height (some GLTFs use different origins)
        if (player.model) {
            // Small safety: if model seems huge/small, scale it mildly
            const bbox = new THREE.Box3().setFromObject(player.model);
            const size = new THREE.Vector3();
            bbox.getSize(size);
            if (size.y > 4) player.model.scale.setScalar(0.5); // shrink giant models
            if (size.y < 0.6) player.model.scale.setScalar(1.2); // enlarge tiny models

            // Put player slightly above ground to avoid being "inside" the floor
            player.model.position.y = Math.max(player.model.position.y, 0.4);
        }

        // Headlamp attached to player's model (so it follows)
        const headLamp = new THREE.PointLight(0xffffff, 1.2, 14, 2);
        headLamp.position.set(0, 0.6, 0.6);
        if (player.model) {
            player.model.add(headLamp);
        } else if (player.mesh) {
            player.mesh.add(headLamp);
        }

        // Debug helpers if requested
        if (DEBUG) {
            // BoxHelper for player
            const ph = new THREE.BoxHelper(player.model, 0x00ff00);
            scene.add(ph);

            // BoxHelpers for obstacles
            simpleObstacles.forEach(o => {
                const bh = new THREE.BoxHelper(o, 0xff0000);
                scene.add(bh);
            });

            console.log('Player initial bbox:', new THREE.Box3().setFromObject(player.model));
            console.log('Obstacles count:', smallObstacles.length);
        }
    });

    // -------------------------
    // HUD, input, clock
    // -------------------------
    initInput();
    resetCounter();
    showHUD();
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

        // update player — Player.update expects dt only (keys are global import)
        if (player?.update) {
            try {
                player.update(dt);
            } catch (e) {
                console.warn('Player.update threw', e);
            }
        }

        // update torches (flicker)
    animateFlames(dt);

        // rotate crystals / handle pickup
        crystals.forEach((c, i) => {
            if (!c) return;
            c.rotation.y += 0.03;
            if (player?.model && player.model.position.distanceTo(c.position) < 1.0) {
                scene.remove(c);
                crystals[i] = null;
                incrementCounter();
                if (getCounter() === crystalPositions.length) {
                    setTimeout(() => {
                        cleanup();
                        onComplete();
                    }, 600);
                }
            }
        });

        
        // simple camera follow third-person (smooth)
        if (player?.model) {
            const camTarget = player.model.position.clone().add(new THREE.Vector3(0, 3.0, 6.0));
            camera.position.lerp(camTarget, 0.12);
            camera.lookAt(player.model.position);
            if (DEBUG) {
                // quick positional debug log
                console.log('Player pos:', player.model.position);
            }
         }

        renderer.render(scene, camera);
    }
    animate();

    // -------------------------
    // Cleanup & helpers
    // -------------------------
    function cleanup() {
        cancelAnimationFrame(animId);
        scene.traverse(obj => {
            if (obj.geometry) {
                try { obj.geometry.dispose?.(); } catch (e) {}
            }
            if (obj.material) {
                try {
                    if (Array.isArray(obj.material)) {
                        obj.material.forEach(m => m.dispose?.());
                    } else {
                        obj.material.dispose?.();
                    }
                } catch (e) {}
            }
            try { if (obj.parent) obj.parent.remove(obj); } catch (e) {}
        });
        try { renderer.dispose(); } catch (e) {}
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
