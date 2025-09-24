// src/player.js
import * as THREE from 'three';
import { keys } from './input.js';

export let player;

export function initPlayer(scene) {
  const group = new THREE.Group();

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1, 2, 0.5),
    new THREE.MeshStandardMaterial({ color: 0xffcc00 })
  );
  body.position.y = 2;
  group.add(body);

  // Head
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.6, 16, 16),
    new THREE.MeshStandardMaterial({ color: 0xffe0bd })
  );
  head.position.y = 3.5;
  group.add(head);

  // Legs
  for (let i = -1; i <= 1; i += 2) {
    const leg = new THREE.Mesh(
      new THREE.BoxGeometry(0.4, 1.5, 0.4),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    leg.position.set(i * 0.3, 0.75, 0);
    group.add(leg);
  }

  // Arms
  for (let i = -1; i <= 1; i += 2) {
    const arm = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.2, 0.3),
      new THREE.MeshStandardMaterial({ color: 0x333333 })
    );
    arm.position.set(i * 0.8, 2.5, 0);
    group.add(arm);
  }

  group.castShadow = true;
  group.position.set(0, 0, 0);

  player = { mesh: group, velocity: new THREE.Vector3(), speed: 5 };
  scene.add(group);
}

export function updatePlayer(dt) {
  if (!player) return;

  const dir = new THREE.Vector3();
  if (keys['w']) dir.z += 1;
  if (keys['s']) dir.z -= 1;
  if (keys['a']) dir.x += 1;
  if (keys['d']) dir.x -= 1;

  dir.normalize().multiplyScalar(player.speed * dt);
  player.mesh.position.add(dir);
}
