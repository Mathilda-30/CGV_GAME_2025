import * as THREE from 'three';
import { player } from './player.js';
import { keys } from './input.js';

let camera;
let yaw = 0; // Horizontal rotation (y-axis)
let pitch = 0; // Vertical rotation (x-axis)
const radius = 10; // Distance from player
const minPitch = -Math.PI / 2 + 0.1; 
const maxPitch = Math.PI / 2 - 0.1; 
let isDragging = false;
let previousMouseX = 0;
let previousMouseY = 0;

export function initCamera() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  updateCameraPosition();
  return camera;
}

export function updateCamera(camera, dt) {
  if (!player) return;

  // Handle mouse drag for rotation (horizontal with left click, vertical with right click)
  document.addEventListener('mousedown', (e) => {
    isDragging = true;
    previousMouseX = e.clientX;
    previousMouseY = e.clientY;
  });
  document.addEventListener('mousemove', (e) => {
    if (isDragging) {
      const deltaX = e.clientX - previousMouseX;
      const deltaY = e.clientY - previousMouseY;
      yaw += deltaX * 0.005; // Adjust sensitivity
      pitch -= deltaY * 0.005; // Invert vertical movement
      pitch = THREE.MathUtils.clamp(pitch, minPitch, maxPitch);
      previousMouseX = e.clientX;
      previousMouseY = e.clientY;
      updateCameraPosition();
    }
  });
  document.addEventListener('mouseup', () => {
    isDragging = false;
  });
  document.addEventListener('mouseleave', () => {
    isDragging = false;
  });

  // Optional keyboard rotation (arrow keys)
  if (keys['arrowleft']) yaw -= 1 * dt;
  if (keys['arrowright']) yaw += 1 * dt;
  if (keys['arrowup']) pitch = Math.max(pitch - 1 * dt, minPitch);
  if (keys['arrowdown']) pitch = Math.min(pitch + 1 * dt, maxPitch);
  updateCameraPosition();
}

function updateCameraPosition() {
  if (!player) return;

  const playerPos = player.mesh.position;
  const offset = new THREE.Vector3(
    radius * Math.sin(yaw) * Math.cos(pitch),
    radius * Math.sin(pitch),
    radius * Math.cos(yaw) * Math.cos(pitch)
  );
  camera.position.copy(playerPos).add(offset);
  camera.lookAt(playerPos);
}