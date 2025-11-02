// platforms.js - Moving Platforms Module
import * as THREE from 'three';

let movingPlatforms = [];

/**
 * Helper to create a quaternion for rotation about the Y axis.
 * @param {number} angle Radians
 * @returns {{x:number, y:number, z:number, w:number}}
 */
function yRotationQuaternion(angle) {
  return {
    x: 0,
    y: Math.sin(angle / 2),
    z: 0,
    w: Math.cos(angle / 2)
  };
}

export function createMovingPlatforms(scene, world, RAPIER) {
  console.log('🚀 Creating moving platforms...');

  const platformData = [
    // === STEP SECTION: gradually rising zig-zag path ===
    
    
    { start: new THREE.Vector3(8, 5.5, 3), end: new THREE.Vector3(8, 7.5, 3), speed: 1.2, width: 3, height: 0.5, depth: 3, rotation: 0 }, // vertical lift
    { start: new THREE.Vector3(12, 7, 1), end: new THREE.Vector3(16, 7, 1), speed: 1.5, width: 3, height: 0.5, depth: 3, rotation: Math.PI / 2 }, // horizontal mover
    { start: new THREE.Vector3(18, 8.2, 4), end: new THREE.Vector3(16, 8.2, 6), speed: 1.0, width: 2.5, height: 0.5, depth: 2.5, rotation: Math.PI / 4 }, // diagonal swing
    { start: new THREE.Vector3(20, 9.5, 2), end: new THREE.Vector3(20, 9.5, -2), speed: 1.3, width: 3, height: 0.5, depth: 3, rotation: 0 }, // left-right mover
    { start: new THREE.Vector3(24, 10.5, 0), end: new THREE.Vector3(24, 12, 0), speed: 1.8, width: 2.8, height: 0.5, depth: 2.8, rotation: Math.PI / 3 }, // rising finale

    // === FINAL PLATFORM: goal ===
    { start: new THREE.Vector3(28, 12.5, 0), end: new THREE.Vector3(28, 12.5, 0), speed: 0, width: 5, height: 0.5, depth: 5, rotation: 0 }
  ];

  platformData.forEach((data) => {
    const geo = new THREE.BoxGeometry(data.width, data.height, data.depth);
    const mat = new THREE.MeshStandardMaterial({
      color: data.speed > 0 ? 0x00aa00 : 0x444444, // gray for static, green for moving
      roughness: 0.3,
      metalness: 0.5
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(data.start);
    mesh.rotation.y = data.rotation || 0;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);

    const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
      .setTranslation(data.start.x, data.start.y, data.start.z)
      .setRotation(yRotationQuaternion(data.rotation || 0));

    const body = world.createRigidBody(bodyDesc);
    const colliderDesc = RAPIER.ColliderDesc.cuboid(data.width / 2, data.height / 2, data.depth / 2);
    colliderDesc.setFriction(0.8);
    world.createCollider(colliderDesc, body);

    movingPlatforms.push({
      mesh,
      body,
      start: data.start.clone(),
      end: data.end.clone(),
      speed: data.speed,
      rotation: data.rotation || 0,
      forward: true,
      progress: 0,
      isStatic: data.speed <= 0 || data.start.equals(data.end)
    });
  });
}

export function updateMovingPlatforms(dt) {
  movingPlatforms.forEach((platform) => {
    if (platform.isStatic) return; // skip static platforms

    const direction = new THREE.Vector3().subVectors(platform.end, platform.start);
    const distance = direction.length();

    if (distance === 0) return; // avoid NaN for identical start/end

    const delta = (platform.speed * dt) / distance;
    platform.progress += platform.forward ? delta : -delta;

    if (platform.progress >= 1.0) {
      platform.progress = 1.0;
      platform.forward = false;
    } else if (platform.progress <= 0.0) {
      platform.progress = 0.0;
      platform.forward = true;
    }

    const newPos = new THREE.Vector3().copy(platform.start).lerp(platform.end, platform.progress);

    platform.mesh.position.copy(newPos);
    platform.mesh.rotation.y = platform.rotation || 0;
    platform.body.setNextKinematicTranslation(newPos);
    platform.body.setNextKinematicRotation(yRotationQuaternion(platform.rotation || 0));
  });
}

export function getMovingPlatforms() {
  return movingPlatforms;
}