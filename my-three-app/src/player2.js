// src/player.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { keys } from './input.js';

export class Player {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), onLoadCallback) {
        this.scene = scene;
        this.speed = 5;
        this.jumpPower = 5;
        this.gravity = -9.8;
        this.velocity = new THREE.Vector3();
        this.onGround = true;

        this.obstacles = [];
        this.pits = [];
        this.boundaries = []; // For cave walls and boundaries

        this.mixer = null;
        this.model = null;
        this.collider = new THREE.Box3();

        const loader = new GLTFLoader();
        loader.load('./models/azri_walk_and_idle_animation.glb', gltf => {
            this.model = gltf.scene;
            this.model.traverse(c => { if (c.isMesh) c.castShadow = true; });
            this.model.position.copy(position);
            scene.add(this.model);

            // collider setup
            this.collider.setFromObject(this.model);

            // Animation
            this.mixer = new THREE.AnimationMixer(this.model);
            this.actions = {};
            gltf.animations.forEach(clip => {
                this.actions[clip.name] = this.mixer.clipAction(clip);
            });
            if (this.actions['Idle']) this.actions['Idle'].play();

            if (onLoadCallback) onLoadCallback(this);
        });
    }

    setObstacles(obstacles) { this.obstacles = obstacles; }
    setPits(pits) { this.pits = pits; }
    setBoundaries(boundaries) { this.boundaries = boundaries; }

    update(dt) {
        if (!this.model) return;

        const moveDir = new THREE.Vector3();
        let moving = false;

        // --- Movement input ---
        if (keys['w']) { moveDir.z -= 1; moving = true; }
        if (keys['s']) { moveDir.z += 1; moving = true; }
        if (keys['a']) { moveDir.x -= 1; moving = true; }
        if (keys['d']) { moveDir.x += 1; moving = true; }

        moveDir.normalize().multiplyScalar(this.speed * dt);

        // Define player collider (capsule for better collision)
        const playerRadius = 0.4;
        const playerHeight = 1.8;
        const playerCenter = this.model.position.clone();
        playerCenter.y += playerHeight / 2;

        // Predict next position
        const nextPos = this.model.position.clone().add(moveDir);
        const nextCenter = nextPos.clone();
        nextCenter.y += playerHeight / 2;

        // --- Enhanced Collision Detection ---
        let collision = false;
        let resolvedMoveDir = moveDir.clone();

        // Test against all obstacles
        for (const obstacle of this.obstacles) {
            obstacle.updateMatrixWorld(true);
            const obstacleBox = new THREE.Box3().setFromObject(obstacle);
            const expandedBox = new THREE.Box3().copy(obstacleBox).expandByScalar(playerRadius);

            const capsuleStart = new THREE.Vector3(nextCenter.x, nextCenter.y - playerHeight/2 + playerRadius, nextCenter.z);
            const capsuleEnd = new THREE.Vector3(nextCenter.x, nextCenter.y + playerHeight/2 - playerRadius, nextCenter.z);

            if (this._capsuleBoxIntersection(capsuleStart, capsuleEnd, playerRadius, expandedBox)) {
                collision = true;

                const obstacleCenter = new THREE.Vector3();
                expandedBox.getCenter(obstacleCenter);
                const pushDir = nextCenter.clone().sub(obstacleCenter).normalize();

                const tangent = new THREE.Vector3().crossVectors(pushDir, new THREE.Vector3(0, 1, 0)).normalize();
                const slideAmount = moveDir.dot(tangent);
                resolvedMoveDir.copy(tangent).multiplyScalar(slideAmount);
                break;
            }
        }

        // --- Boundary Collision (Cave Walls) ---
        for (const boundary of this.boundaries) {
            boundary.updateMatrixWorld(true);
            const boundaryBox = new THREE.Box3().setFromObject(boundary);
            const expandedBoundaryBox = new THREE.Box3().copy(boundaryBox).expandByScalar(playerRadius);

            const capsuleStart = new THREE.Vector3(nextCenter.x, nextCenter.y - playerHeight/2 + playerRadius, nextCenter.z);
            const capsuleEnd = new THREE.Vector3(nextCenter.x, nextCenter.y + playerHeight/2 - playerRadius, nextCenter.z);

            if (this._capsuleBoxIntersection(capsuleStart, capsuleEnd, playerRadius, expandedBoundaryBox)) {
                collision = true;

                const pushDir = new THREE.Vector3(0, 0, -6).sub(nextCenter).normalize();
                const tangent = new THREE.Vector3().crossVectors(pushDir, new THREE.Vector3(0, 1, 0)).normalize();
                const slideAmount = moveDir.dot(tangent);
                resolvedMoveDir.copy(tangent).multiplyScalar(slideAmount);
                break;
            }
        }

        // Apply movement
        if (!collision) {
            this.model.position.add(moveDir);
        } else {
            this.model.position.add(resolvedMoveDir.multiplyScalar(0.8));
        }

        // --- World Boundaries (Prevent escaping cave) ---
        const maxDistanceFromCenter = 35;
        const distanceFromCenter = Math.sqrt(
            this.model.position.x * this.model.position.x +
            (this.model.position.z + 6) * (this.model.position.z + 6)
        );

        if (distanceFromCenter > maxDistanceFromCenter) {
            const pushBack = new THREE.Vector3(-this.model.position.x, 0, -(this.model.position.z + 6)).normalize();
            this.model.position.add(pushBack.multiplyScalar(0.5));
        }

        // --- Gravity & Jump ---
        if (keys[' '] && this.onGround) {
            this.velocity.y = this.jumpPower;
            this.onGround = false;
        }

        this.velocity.y += this.gravity * dt;
        this.model.position.y += this.velocity.y * dt;

        // Ground collision
        if (this.model.position.y <= 0.1) {
            this.model.position.y = 0.1;
            this.velocity.y = 0;
            this.onGround = true;
        }

        // --- Mud (Pit) Slowdown Mechanic ---
        let onMud = false;
        for (const pit of this.pits) {
            pit.updateMatrixWorld(true);
            const pitBox = new THREE.Box3().setFromObject(pit);
            if (pitBox.containsPoint(this.model.position)) {
                onMud = true;
                break;
            }
        }

        // Smooth speed transition
        const targetSpeed = onMud ? 0.2 : 5;
        this.speed += (targetSpeed - this.speed) * 0.02;

        // --- Animation ---
        if (this.mixer) {
            this.mixer.update(dt);
            if (moving && this.actions['Walk'] && !this.actions['Walk'].isRunning()) {
                this._fadeToAction('Walk', 0.2);
            } else if (!moving && this.actions['Idle'] && !this.actions['Idle'].isRunning()) {
                this._fadeToAction('Idle', 0.2);
            }
        }

        // --- Rotate in movement direction ---
        if (moving) {
            const angle = Math.atan2(moveDir.x, moveDir.z);
            this.model.rotation.y = angle;
        }
    }

    // --- Enhanced Collision: Capsule vs Box ---
    _capsuleBoxIntersection(capsuleStart, capsuleEnd, radius, box) {
        const closestPoint = new THREE.Vector3();
        this._closestPointOnBoxToSegment(capsuleStart, capsuleEnd, box, closestPoint);

        const capsuleClosest = this._closestPointOnSegment(capsuleStart, capsuleEnd, closestPoint);
        const distance = capsuleClosest.distanceTo(closestPoint);
        return distance <= radius;
    }

    _closestPointOnSegment(start, end, point) {
        const segment = new THREE.Vector3().subVectors(end, start);
        const segmentLength = segment.length();
        segment.normalize();

        const t = Math.max(0, Math.min(segmentLength, point.clone().sub(start).dot(segment)));
        return start.clone().add(segment.multiplyScalar(t));
    }

    _closestPointOnBoxToSegment(start, end, box, result) {
        const boxCenter = new THREE.Vector3();
        box.getCenter(boxCenter);

        const toStart = start.clone().sub(boxCenter);
        const toEnd = end.clone().sub(boxCenter);

        const dir = toStart.clone().add(toEnd).normalize();
        const boxSize = new THREE.Vector3();
        box.getSize(boxSize);

        const scaledDir = dir.multiply(boxSize.multiplyScalar(0.5));
        result.copy(boxCenter).add(scaledDir);
        result.clamp(box.min, box.max);
    }

    _fadeToAction(name, duration) {
        if (!this.actions[name]) return;
        for (const key in this.actions) {
            if (key === name) this.actions[key].reset().fadeIn(duration).play();
            else this.actions[key].fadeOut(duration);
        }
    }
}
