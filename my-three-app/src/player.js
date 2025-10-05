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

  player = { mesh: group, velocity: new THREE.Vector3(), speed: 5, isJumping: false, bbox: new THREE.Box3() };
  player.bbox.setFromObject(group);
  scene.add(group);
}

export function updatePlayer(dt) {
  if (!player) return;

  const dir = new THREE.Vector3();
  if (keys['w']) dir.z -= 1;
  if (keys['s']) dir.z += 1;
  if (keys['a']) dir.x -= 1;
  if (keys['d']) dir.x += 1;

  // Horizontal movement
  dir.normalize().multiplyScalar(player.speed * dt);
  player.mesh.position.add(dir);

  // Jump and gravity
  const gravity = -9.81; // Earth-like gravity
  player.velocity.y += gravity * dt;
  player.mesh.position.y += player.velocity.y * dt;

  // Update player bounding box
  player.bbox.setFromObject(player.mesh);

  // Collision detection with platforms (from level3.js staircase)
  const platformHeights = [2, 4, 6, 8, 10];
  const platformPositions = platformHeights.map(h => ({
    min: new THREE.Vector3(-2.5, h - 0.25, -8.5 + (-6 * (h / 2))),
    max: new THREE.Vector3(2.5, h + 0.25, -3.5 + (-6 * (h / 2)))
  }));
  let isOnPlatform = false;

  for (let platform of platformPositions) {
    if (player.bbox.intersectsBox(platform)) {
      const platformTop = platform.max.y;
      if (player.mesh.position.y + player.bbox.min.y < platformTop && player.velocity.y < 0) {
        player.mesh.position.y = platformTop - player.bbox.min.y;
        player.velocity.y = 0;
        isOnPlatform = true;
      }
    }
  }

  // Ground collision (main island)
  const groundLevel = 0;
  const groundBox = new THREE.Box3(
    new THREE.Vector3(-25, groundLevel - 0.1, -25),
    new THREE.Vector3(25, groundLevel + 0.1, 25)
  );
  if (player.bbox.intersectsBox(groundBox)) {
    if (player.mesh.position.y + player.bbox.min.y < groundLevel + 0.1 && player.velocity.y < 0) {
      player.mesh.position.y = groundLevel + 0.1 - player.bbox.min.y;
      player.velocity.y = 0;
      isOnPlatform = true; 
    }
  }

  // Jump logic
  if (isOnPlatform) {
    if (keys['j'] && !player.isJumping) {
      player.velocity.y = 15; // Jump velocity
      player.isJumping = true;
    }
  } else {
    player.isJumping = true;
  }

  if (!keys['j']) player.isJumping = false;
}