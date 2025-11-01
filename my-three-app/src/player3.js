// player3.js

import * as THREE from 'three';
import { keys } from './input.js';

// Define player shape constants
const PLAYER_HALF_HEIGHT = 0.9;
const PLAYER_RADIUS = 0.5;

// Physics Constants
const GRAVITY = -9.81 * 2; // A bit "gamey"
const JUMP_POWER = 8.0;
const PLAYER_SPEED = 5.0;
const ROTATION_SPEED = 0.1; // For turning

// This object holds all our player's physics and visual components
export const player = {
  model: null,
  mixer: null,
  actions: {},
  currentAction: 'Idle',
  body: null,
  controller: null,
  velocityY: 0,
  isGrounded: false
};

// initPlayer3 (No changes needed, your setup is correct)
export function initPlayer3(scene, loader, world, RAPIER) {
  const modelPath = '/models/azri_walk_and_idle_animation.glb';

  loader.load(
    modelPath,
    function (gltf) {
      player.model = gltf.scene;
      player.model.traverse(function(child) {
        if (child.isMesh) {
          child.castShadow = true;
        }
      });
      scene.add(player.model);

      // --- Animation Setup ---
      player.mixer = new THREE.AnimationMixer(player.model);
      if (gltf.animations && gltf.animations.length) {
        gltf.animations.forEach((clip) => {
          player.actions[clip.name] = player.mixer.clipAction(clip);
        });
        if (player.actions['Idle']) {
          player.actions['Idle'].play();
          player.currentAction = 'Idle';
        }
      }

      // --- PHYSICS BODY SETUP ---
      const startX = 5;
      const startY = PLAYER_HALF_HEIGHT + 15; // Start 15 units high
      const startZ = 8;
      let bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(startX, startY, startZ)
        .lockRotations();
      player.body = world.createRigidBody(bodyDesc);

      // --- Cylinder collider ---
      let colliderDesc = RAPIER.ColliderDesc.cylinder(
        PLAYER_HALF_HEIGHT,
        PLAYER_RADIUS
      );
      world.createCollider(colliderDesc, player.body);

      // Update visual model to match physics start position
      player.model.position.set(startX, startY - PLAYER_HALF_HEIGHT, startZ);

      // --- CHARACTER CONTROLLER SETUP ---
      player.controller = world.createCharacterController(0.01);
      player.controller.setApplyImpulsesToDynamicBodies(false);
      player.controller.setUp({ x: 0, y: 1, z: 0 });
      player.controller.enableSnapToGround(0.1);
      player.controller.setMaxSlopeClimbAngle(Math.PI / 3); // 60 degrees
      player.controller.setMinSlopeSlideAngle(Math.PI / 4); // 45 degrees
      player.controller.enableAutostep(0.5, 0.35, true);
    },
    (xhr) => { /* Progress */ },
    (error) => { console.error('An error happened loading the player model:', error); }
  );
}

// --- Animation switching function (No changes) ---
function switchAnimation(newActionName) {
  if (player.currentAction === newActionName) return;
  const newAction = player.actions[newActionName];
  const oldAction = player.actions[player.currentAction];
  if (!oldAction || !newAction) {
    return;
  }
  oldAction.fadeOut(0.2);
  newAction.reset().setEffectiveTimeScale(1).setEffectiveWeight(1).fadeIn(0.2).play();
  player.currentAction = newActionName;
}

// Re-usable objects
const moveVector = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const currentQuaternion = new THREE.Quaternion();

// --- REVISED updatePlayer Function ---
export function updatePlayer(deltaTime) {
  if (!player.model || !player.mixer || !player.controller || !player.body) return;
  
  // --- 1. Update grounded state ---
  // We do this *before* movement logic
  player.isGrounded = player.controller.computedGrounded();

  // --- 2. Handle jumping ---
  if (keys.space.justPressed && player.isGrounded) {
    // Apply a direct vertical impulse for the jump
    player.body.setLinvel({ x: 0, y: JUMP_POWER, z: 0 }, true);
  }

  // --- 3. Calculate desired horizontal movement ---
  moveVector.set(0, 0, 0);
  let isMovingHorizontally = false;

  if (keys.w.pressed) { moveVector.z -= 1; isMovingHorizontally = true; }
  if (keys.s.pressed) { moveVector.z += 1; isMovingHorizontally = true; }
  if (keys.a.pressed) { moveVector.x -= 1; isMovingHorizontally = true; }
  if (keys.d.pressed) { moveVector.x += 1; isMovingHorizontally = true; }

  // --- 4. Apply rotation to model ---
  if (isMovingHorizontally) {
    const targetAngle = Math.atan2(moveVector.x, moveVector.z);
    targetQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);
    currentQuaternion.copy(player.model.quaternion);
    currentQuaternion.slerp(targetQuaternion, ROTATION_SPEED);
    player.model.quaternion.copy(currentQuaternion);
  }

  // --- 5. Normalize and scale horizontal movement ---
  if (isMovingHorizontally) {
    moveVector.normalize();
    moveVector.multiplyScalar(PLAYER_SPEED);
  }

  // --- 6. Apply final velocity to the DYNAMIC body ---
  const currentVel = player.body.linvel();
  
  // We set the new linear velocity,
  // preserving the current Y velocity (which is being handled by gravity)
  // and applying our desired X and Z velocities.
  player.body.setLinvel({
    x: moveVector.x,
    y: currentVel.y,
    z: moveVector.z
  }, true); // 'true' = Wake the body up if it's asleep

  // --- 7. Animation ---
  if (player.actions['Idle']) {
    if (isMovingHorizontally && player.isGrounded) {
      switchAnimation('Walking');
    } else if (player.isGrounded) {
      switchAnimation('Idle');
    }
    // You could add 'Jumping' or 'Falling' animations here
    // else if (currentVel.y > 0.5) { switchAnimation('Jumping'); }
    // else if (currentVel.y < -0.5) { switchAnimation('Falling'); }
  }

  player.mixer.update(deltaTime);
}