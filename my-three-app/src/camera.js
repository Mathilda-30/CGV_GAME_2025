// src/camera.js
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let cameraRotation = new THREE.Vector2(0, 0); // yaw (left/right), pitch (up/down)
const rotationSpeed = 0.02;
const minPitch = -0.6;
const maxPitch = 0.6;

/**
 * Initializes and returns a PerspectiveCamera, renderer, and OrbitControls.
 * @param {THREE.Scene} scene - The scene to render.
 * @returns {{ camera: THREE.PerspectiveCamera, renderer: THREE.WebGLRenderer, controls: OrbitControls }}
 */
export function initCamera(scene) {
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
    controls.enabled = false; // disable for gameplay

    // Handle window resize
    function onResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    window.addEventListener('resize', onResize);

    // --- Arrow Key Controls for Manual Rotation ---
    window.addEventListener('keydown', (e) => {
        switch (e.code) {
            case 'ArrowLeft':
                cameraRotation.x -= rotationSpeed;
                break;
            case 'ArrowRight':
                cameraRotation.x += rotationSpeed;
                break;
            case 'ArrowUp':
                cameraRotation.y = Math.min(maxPitch, cameraRotation.y + rotationSpeed);
                break;
            case 'ArrowDown':
                cameraRotation.y = Math.max(minPitch, cameraRotation.y - rotationSpeed);
                break;
        }
    });

    return { camera, renderer, controls };
}

/**
 * Smoothly follows a target (usually the player model)
 */
export function updateCameraFollow(camera, target, DEBUG = false) {
    if (target) {
        // Orbit around target using cameraRotation.x (yaw) and cameraRotation.y (pitch)
        const distance = 8.0;
        const offset = new THREE.Vector3(
            Math.sin(cameraRotation.x) * distance,
            3.0 + cameraRotation.y * 5.0, // vertical offset with pitch
            Math.cos(cameraRotation.x) * distance
        );

        const desiredPosition = target.position.clone().add(offset);
        camera.position.lerp(desiredPosition, 0.12);
        camera.lookAt(target.position);

        if (DEBUG) console.log('Camera follow pos:', target.position);
    }
}
