// src/player2.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { keys } from './input.js';

export class Player {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), onLoadCallback) {
        this.scene = scene;
        this.speed = 5;
        this.jumpPower = 8;
        this.gravity = -9.8;
        this.velocity = new THREE.Vector3();
        this.onGround = true;

        this.obstacles = []; // rocks + logs
        this.pits = [];
        this.boundaries = [];
        this.terrain = null;

        this.mixer = null;
        this.model = null;
        this.collider = new THREE.Box3();

        this.currentSpeed = this.speed; // used for smooth transitions in mud
        
         // --- Sound Setup ---
        this.mudSound = new Audio('./sound/footsteps-mud-68694.mp3'); 
        this.mudSound.volume = 0.4; // tweak for balance
        this.inMudLastFrame = false;

        const loader = new GLTFLoader();
        loader.load('./models/azri_walk_and_idle_animation.glb', gltf => {
            this.model = gltf.scene;
            this.model.traverse(c => { if (c.isMesh) c.castShadow = true; });
            this.model.position.copy(position);
            scene.add(this.model);

            this.collider.setFromObject(this.model);

            this.mixer = new THREE.AnimationMixer(this.model);
            this.actions = {};
            gltf.animations.forEach(clip => {
                this.actions[clip.name] = this.mixer.clipAction(clip);
            });
            if (this.actions['Idle']) this.actions['Idle'].play();

            if (onLoadCallback) onLoadCallback(this);
        });
    }

    setObstacles(obstacles) { this.obstacles = obstacles; } // rocks + logs
    setPits(pits) { this.pits = pits; }
    setBoundaries(boundaries) { this.boundaries = boundaries; }
    setTerrain(terrain) { this.terrain = terrain; }

    getTerrainHeightAt(x, z) {
        if (!this.terrain) return 0;
        const raycaster = new THREE.Raycaster(
            new THREE.Vector3(x, 100, z),
            new THREE.Vector3(0, -1, 0)
        );
        const intersects = raycaster.intersectObject(this.terrain, true);
        if (intersects.length > 0) return intersects[0].point.y;
        return 0;
    }

    update(dt) {
    if (!this.model || !this.camera) return;

    const moveDir = new THREE.Vector3();
    let moving = false;

    // --- Camera-relative movement ---
    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0; // ignore vertical tilt
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    if (keys['w']) { moveDir.add(forward); moving = true; }
    if (keys['s']) { moveDir.sub(forward); moving = true; }
    if (keys['a']) { moveDir.sub(right); moving = true; }
    if (keys['d']) { moveDir.add(right); moving = true; }

    // --- Mud slow-down detection ---
    let inMud = false;
    if (this.pits && this.model) {
        for (const pit of this.pits) {
            const distance = this.model.position.distanceTo(pit.position);
            const radius = 2.5;
            if (distance < radius) { inMud = true; break; }
        }
    }
    const targetSpeed = inMud ? this.speed * 0.3 : this.speed;
    this.currentSpeed = THREE.MathUtils.lerp(this.currentSpeed, targetSpeed, 0.1);

    // --- Apply movement ---
    if (moveDir.length() > 0) moveDir.normalize();
    moveDir.multiplyScalar(this.currentSpeed * dt);
    const nextPos = this.model.position.clone().add(moveDir);

    // --- Play/stop mud sounds ---
    if (inMud && !this.inMudLastFrame) { this.mudSound.currentTime = 0; this.mudSound.play(); }
    if (!inMud && this.inMudLastFrame) { this.mudSound.pause(); this.mudSound.currentTime = 0; }
    this.inMudLastFrame = inMud;

    // --- Obstacle collision ---
    let hitObstacle = false;
    for (const obs of this.obstacles) {
        if (!obs) continue;
        const obsBox = new THREE.Box3().setFromObject(obs);
        obsBox.expandByScalar(0.1);
        const playerBox = new THREE.Box3().setFromCenterAndSize(
            nextPos.clone().add(new THREE.Vector3(0, 0.9, 0)),
            new THREE.Vector3(1, 1.8, 1)
        );
        if (playerBox.intersectsBox(obsBox)) { hitObstacle = true; break; }
    }
    if (!hitObstacle) this.model.position.copy(nextPos);

    // --- Boundary check ---
    const maxDist = 35;
    const dist = Math.sqrt(this.model.position.x**2 + (this.model.position.z + 6)**2);
    if (dist > maxDist) {
        const pushBack = new THREE.Vector3(-this.model.position.x, 0, -(this.model.position.z + 6)).normalize();
        this.model.position.add(pushBack.multiplyScalar(0.5));
    }

    // --- Gravity + Jump ---
    if (keys[' '] && this.onGround) { this.velocity.y = this.jumpPower; this.onGround = false; }
    this.velocity.y += this.gravity * dt;
    this.model.position.y += this.velocity.y * dt;

    // --- Terrain collision ---
    const groundY = this.getTerrainHeightAt(this.model.position.x, this.model.position.z);
    if (this.model.position.y <= groundY + 0.1) {
        this.model.position.y = groundY + 0.1;
        this.velocity.y = 0;
        this.onGround = true;
    }

    // --- Animation ---
    if (this.mixer) {
        this.mixer.update(dt);
        if (moving && this.actions['Walk'] && !this.actions['Walk'].isRunning()) this._fadeToAction('Walk', 0.2);
        else if (!moving && this.actions['Idle'] && !this.actions['Idle'].isRunning()) this._fadeToAction('Idle', 0.2);
    }

    // --- Face movement direction ---
    if (moving) {
        const angle = Math.atan2(moveDir.x, moveDir.z);
        this.model.rotation.y = angle;
    }
}


    _fadeToAction(name, duration) {
        if (!this.actions[name]) return;
        for (const key in this.actions) {
            if (key === name) this.actions[key].reset().fadeIn(duration).play();
            else this.actions[key].fadeOut(duration);
        }
    }
}