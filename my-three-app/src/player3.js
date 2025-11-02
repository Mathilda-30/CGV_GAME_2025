// player3.js

import * as THREE from 'three';
import { keys } from './input2.js';

const PLAYER_HALF_HEIGHT = 0.9;
const PLAYER_RADIUS = 0.5;

// Physics Constants
const GRAVITY = -9.81;
const JUMP_POWER = 10.0;
const PLAYER_SPEED = 5.0;
const ROTATION_SPEED = 0.15;

export const player = {
  model: null,
  mixer: null,
  actions: {},
  currentAction: 'Idle',
  body: null,
  controller: null,
  velocityY: 0,
  isGrounded: false,
  jumpCooldown: 0,
  fallDistance: 0,
  maxFallDistance: 0,
  lastGroundedPosition: new THREE.Vector3(),
  // debugLastAction: 'Idle', // Removed
  RAPIER: null,
  world: null
};

export function initPlayer3(scene, loader, world, RAPIER, startPos = { x: 5, y: 20, z: 8 }) {
  player.RAPIER = RAPIER;
  player.world = world;
  
  const modelPath = '/models/azri_walk_and_idle_animation.glb';

  loader.load(
    modelPath,
    function (gltf) {
      player.model = gltf.scene;
      player.model.traverse(function(child) {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
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
      const bodyDesc = RAPIER.RigidBodyDesc.dynamic()
        .setTranslation(startPos.x, startPos.y, startPos.z)
        .lockRotations();
      
      player.body = world.createRigidBody(bodyDesc);
      player.body.setGravityScale(1.0, true);

      // --- Capsule collider ---
      const colliderDesc = RAPIER.ColliderDesc.cylinder(PLAYER_HALF_HEIGHT, PLAYER_RADIUS);
      colliderDesc.setRestitution(0.0);
      colliderDesc.setFriction(1.0);
      
      world.createCollider(colliderDesc, player.body);

      player.model.position.set(startPos.x, startPos.y - PLAYER_HALF_HEIGHT, startPos.z);
      player.lastGroundedPosition.copy(player.model.position);

      // --- CHARACTER CONTROLLER SETUP ---
      player.controller = world.createCharacterController(0.01);
      player.controller.enableSnapToGround(0.5);
      player.controller.setMaxSlopeClimbAngle(Math.PI / 3);
      player.controller.setMinSlopeSlideAngle(Math.PI / 4);
      player.controller.enableAutostep(0.8, 0.5, true);
    },
    (xhr) => { 
      // Loading progress...
    },
    (error) => { 
      console.error('❌ Error loading player model:', error); 
    }
  );
}

function switchAnimation(newActionName) {
  if (!player.actions[newActionName]) return;
  if (player.currentAction === newActionName) return;
  
  const newAction = player.actions[newActionName];
  const oldAction = player.actions[player.currentAction];
  
  if (oldAction) {
    oldAction.fadeOut(0.3);
  }
  
  newAction.reset().fadeIn(0.3).play();
  player.currentAction = newActionName;
}

const moveVector = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const currentQuaternion = new THREE.Quaternion();
const upVector = new THREE.Vector3(0, 1, 0);

export function updatePlayer(deltaTime) {
  if (!player.model || !player.mixer || !player.body || !player.controller) return;

  // --- 1. Check grounded state BEFORE anything else ---
  const wasGrounded = player.isGrounded;
  player.isGrounded = player.controller.computedGrounded();
  
  if (player.isGrounded && !wasGrounded) {
    player.velocityY = 0;
    player.maxFallDistance = 0;
  }

  // --- 2. Calculate desired horizontal movement ---
  moveVector.set(0, 0, 0);
  let isMovingHorizontally = false;

  if (keys.w.pressed) { moveVector.z -= 1; isMovingHorizontally = true; }
  if (keys.s.pressed) { moveVector.z += 1; isMovingHorizontally = true; }
  if (keys.a.pressed) { moveVector.x -= 1; isMovingHorizontally = true; }
  if (keys.d.pressed) { moveVector.x += 1; isMovingHorizontally = true; }

  // --- 3. Apply rotation to model ---
  if (isMovingHorizontally) {
    const targetAngle = Math.atan2(moveVector.x, moveVector.z);
    targetQuaternion.setFromAxisAngle(upVector, targetAngle);
    currentQuaternion.copy(player.model.quaternion);
    currentQuaternion.slerp(targetQuaternion, ROTATION_SPEED);
    player.model.quaternion.copy(currentQuaternion);
  }

  // --- 4. Normalize and scale movement ---
  if (isMovingHorizontally) {
    moveVector.normalize();
    moveVector.multiplyScalar(PLAYER_SPEED);
  }

  // --- 5. Handle jumping ---
  if (keys.space.justPressed && player.isGrounded && player.jumpCooldown <= 0) {
    player.velocityY = JUMP_POWER;
    player.isGrounded = false;
    player.jumpCooldown = 0.1;
  }
  player.jumpCooldown -= deltaTime;

  // --- 6. Apply gravity ---
  if (!player.isGrounded) {
    player.velocityY += GRAVITY * deltaTime;
    player.velocityY = Math.max(player.velocityY, -50); // Clamp fall speed
  }

  // --- 7. Build movement vector for controller ---
  const movement = new player.RAPIER.Vector3(
    moveVector.x * deltaTime,
    player.velocityY * deltaTime,
    moveVector.z * deltaTime
  );

  // --- 8. Apply movement using character controller ---
  player.controller.computeColliderMovement(player.body, movement);

  // --- 9. Check grounded AFTER computing movement ---
  player.isGrounded = player.controller.computedGrounded();
  
  if (player.isGrounded) {
    player.velocityY = 0;
  }

  // --- 10. Get the computed movement and apply it ---
  const computedMovement = player.controller.computedMovement();
  let newPos = player.body.translation();
  
  newPos = new player.RAPIER.Vector3(
    newPos.x + computedMovement.x,
    newPos.y + computedMovement.y,
    newPos.z + computedMovement.z
  );
  
  player.body.setTranslation(newPos, true);

  // --- 11. Track fall distance ---
  if (!player.isGrounded) {
    player.fallDistance += Math.abs(player.velocityY) * deltaTime;
    player.maxFallDistance = Math.max(player.maxFallDistance, player.fallDistance);
  }

  // --- 12. Animation state machine ---
  updateAnimationState(isMovingHorizontally);

  // --- 13. Update animation mixer ---
  player.mixer.update(deltaTime);
}

function updateAnimationState(isMovingHorizontally) {
  let newAction = 'Idle';

  if (player.isGrounded && isMovingHorizontally) {
    newAction = 'Walking';
  } else {
    newAction = 'Idle';
  }
  
  if (player.actions[newAction]) {
    switchAnimation(newAction);
  }
}

export function getPlayerPosition() {
  if (!player.body) return new THREE.Vector3(0, 0, 0);
  const pos = player.body.translation();
  return new THREE.Vector3(pos.x, pos.y, pos.z);
}

export function applyKnockback(direction, force) {
  if (!player.body || !player.RAPIER) return;
  player.velocityY = force * 0.5;
  player.body.applyImpulse(
    new player.RAPIER.Vector3(direction.x * force, 0, direction.z * force),
    true
  );
}