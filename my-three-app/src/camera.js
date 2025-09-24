import * as THREE from 'three';
import { player } from './player.js';

let camera;

export function initCamera() {
  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);
  return camera;
}

export function updateCamera(camera, dt) {
  if (!player) return;

  const offset = new THREE.Vector3(0, 3, -6);
  const desired = player.mesh.position.clone().add(offset);
  camera.position.lerp(desired, 0.1);
  camera.lookAt(player.mesh.position);
}
