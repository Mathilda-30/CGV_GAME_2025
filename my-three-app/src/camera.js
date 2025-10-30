// camera.js
import * as THREE from 'three';
// Import our new player object
import { player } from './player3.js';

// The ideal offset from the player (X, Y, Z)
// 0_X = centered, 5_Y = 5 units up, 15_Z = 15 units behind
const idealOffset = new THREE.Vector3(0, 5, 15);

// How fast the camera "catches up" to the player.
// Lower value = smoother/slower. Higher value = snappier.
const cameraMoveSpeed = 0.05;

// We'll use these vectors in the loop, defining them here saves resources
const targetPosition = new THREE.Vector3();
const targetLookAt = new THREE.Vector3();

export function updateCamera(camera) {
  // If the player model hasn't loaded, don't do anything
  if (!player.model) return;

  // 1. Calculate the ideal camera position
  // Start with the player's position
  targetPosition.copy(player.model.position);
  // Add the offset
  targetPosition.add(idealOffset);

  // 2. Smoothly move the camera towards the ideal position
  camera.position.lerp(targetPosition, cameraMoveSpeed);

  // 3. Calculate the ideal "look at" point
  // Start with the player's position
  targetLookAt.copy(player.model.position);
  // Move it up slightly (so we look at their chest, not their feet)
  targetLookAt.y += 2.0;

  // 4. Make the camera look at that point
  camera.lookAt(targetLookAt);
}