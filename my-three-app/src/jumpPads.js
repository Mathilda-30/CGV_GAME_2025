// jumpPads.js - Jump Pads Module

import * as THREE from 'three';
import { player } from './player3.js';
import { getPlayerPosition } from './player3.js';

let jumpPads = [];
const JUMP_PAD_COOLDOWN = 0.3; // 300ms between launches

export function createJumpPads(scene, world, RAPIER) {
  console.log('⚡ Creating jump pads...');

const jumpPadPositions = [
  // Start pad: launches player up and slightly forward
  { pos: new THREE.Vector3(0, 2, 4), force: 18 },

  // 2nd pad: positioned higher and to the left
  { pos: new THREE.Vector3(-6, 5, 10), force: 16 },

  // 3rd pad: launches back toward center but higher up
  { pos: new THREE.Vector3(2, 8, 17), force: 19 },

  // 4th pad: angled to the right with extra forward force
  { pos: new THREE.Vector3(9, 10, 25), force: 20 },

  // 5th pad: higher arc, a mid-air “wow” moment
  { pos: new THREE.Vector3(3, 14, 33), force: 22 },

  // 6th pad: final one — sends player to a landing platform / reward zone
  { pos: new THREE.Vector3(0, 18, 42), force: 24 }
];

  jumpPadPositions.forEach((data, idx) => {
    // Visual mesh
    const geo = new THREE.CylinderGeometry(1, 1, 0.5, 16);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xffaa00,
      emissive: 0xff5500,
      emissiveIntensity: 0.8,
      metalness: 0.7,
      roughness: 0.2
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(data.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    // Physics body (sensor)
    const bodyDesc = RAPIER.RigidBodyDesc.fixed().setTranslation(
      data.pos.x,
      data.pos.y,
      data.pos.z
    );
    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cylinder(0.25, 1);
    colliderDesc.setSensor(true);
    const collider = world.createCollider(colliderDesc, body);

    // Data - with cooldown timer
    mesh.userData.isJumpPad = true;
    mesh.userData.jumpForce = data.force;
    mesh.userData.cooldown = 0; // Track cooldown per pad

    jumpPads.push({ mesh, body, collider });
  });
}

export function updateJumpPadEffects(dt) {
  jumpPads.forEach(pad => {
    // Pulsing effect
    const pulse = Math.sin(Date.now() * 0.005) * 0.1 + 1;
    pad.mesh.scale.y = pulse;
  });
}

export function updateJumpPadCooldowns(dt) {
  jumpPads.forEach(pad => {
    if (pad.mesh.userData.cooldown > 0) {
      pad.mesh.userData.cooldown -= dt;
    }
  });
}

export function checkJumpPadCollisions() {
  jumpPads.forEach(pad => {
    const playerPos = getPlayerPosition();
    const distance = playerPos.distanceTo(pad.mesh.position);

    // Only trigger if: player is close AND cooldown has expired
    if (distance < 1.5 && pad.mesh.userData.cooldown <= 0) {
      const jumpForce = pad.mesh.userData.jumpForce;
      
      // Apply single launch boost
      player.velocityY = jumpForce;
      
      // Set cooldown to prevent re-triggering
      pad.mesh.userData.cooldown = JUMP_PAD_COOLDOWN;

      // Visual feedback
      pad.mesh.material.emissiveIntensity = 1.0;

      console.log('⚡ JUMP PAD LAUNCHED!');
    } else if (distance >= 1.5) {
      // Reset glow when player leaves
      pad.mesh.material.emissiveIntensity = 0.8;
    }
  });
}

export function getJumpPads() {
  return jumpPads;
}
