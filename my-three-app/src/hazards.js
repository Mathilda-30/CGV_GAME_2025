// hazards.js
import * as THREE from 'three';
import { getPlayerPosition, applyKnockback } from './player3.js';

let hazards = [];

// ============ CREATE ============
export function createHazards(scene, world, RAPIER) {
  console.log('🔴 Creating hazards...');

  const hazardData = [

    // 2️⃣ KNOCKER BAR – over the middle horizontal platform
    
    { pos: new THREE.Vector3(18, 9, 0), axis: 'x', speed: 1.5, width: 0.5, depth: 4 },
  ];

  hazardData.forEach(data => {
    const geo = new THREE.BoxGeometry(data.width, 0.5, data.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 0.6,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(data.pos);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    hazards.push({
      mesh,
      axis: data.axis,
      speed: data.speed,
      rotation: 0,
      damage: 20,
    });
  });
}

// ============ UPDATE ============
export function updateHazards(dt) {
  hazards.forEach(hazard => {
    hazard.rotation += hazard.speed * dt;

    if (hazard.axis === 'y') {
      hazard.mesh.rotation.y = hazard.rotation;
    } else if (hazard.axis === 'x') {
      hazard.mesh.rotation.x = hazard.rotation;
    }

    const pulse = Math.sin(Date.now() * 0.007) * 0.3 + 0.6;
    hazard.mesh.material.emissiveIntensity = pulse;
  });
}

// ============ COLLISION CHECK ============
export function checkHazardCollisions() {
  hazards.forEach(hazard => {
    const playerPos = getPlayerPosition();
    const distance = playerPos.distanceTo(hazard.mesh.position);

    if (distance < 2.0) {
      const knockbackDir = new THREE.Vector3()
        .subVectors(playerPos, hazard.mesh.position)
        .normalize();
      applyKnockback(knockbackDir, 15);

      console.log('💥 HIT BY HAZARD!');
    }
  });
}