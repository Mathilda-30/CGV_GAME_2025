import * as THREE from 'three';
import { keys } from './input2.js';

const PLAYER_HALF_HEIGHT = 0.9;
const PLAYER_RADIUS = 0.5;

// Physics Constants
const GRAVITY = -9.81;
const JUMP_POWER = 10.0;
const PLAYER_SPEED = 5.0; // Base walking speed
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
  RAPIER: null,
  world: null,
  speedMultiplier: 1.0 // <- Allows mud/slower zones
};

// Allows other scripts (like mud zones) to change player speed
export function setPlayerSpeedMultiplier(multiplier) {
  player.speedMultiplier = multiplier;
}

export function initPlayer3(scene, loader, world, RAPIER, startPos = { x: 5, y: 20, z: 8 }) {
  player.RAPIER = RAPIER;
  player.world = world;
  player.speedMultiplier = 1.0;

  const modelPath = './models/azri_walk_and_idle_animation.glb';
  loader.load(
    modelPath,
    (gltf) => {
      player.model = gltf.scene;
      player.model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      scene.add(player.model);

      // --- Animation setup ---
      player.mixer = new THREE.AnimationMixer(player.model);
      gltf.animations.forEach((clip) => {
        player.actions[clip.name] = player.mixer.clipAction(clip);
      });
      if (player.actions['Idle']) {
        player.actions['Idle'].play();
        player.currentAction = 'Idle';
      }

      // --- Physics (KINEMATIC BODY for walking) ---
      const bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        .setTranslation(startPos.x, startPos.y, startPos.z)
        .lockRotations();
      player.body = world.createRigidBody(bodyDesc);

      // --- Collider ---
      const colliderDesc = RAPIER.ColliderDesc.cylinder(PLAYER_HALF_HEIGHT, PLAYER_RADIUS)
        .setRestitution(0.0)
        .setFriction(1.0);
      world.createCollider(colliderDesc, player.body);

      // --- Controller ---
      player.controller = world.createCharacterController(0.01);
      player.controller.enableSnapToGround(0.5);
      player.controller.setMaxSlopeClimbAngle(Math.PI / 3);
      player.controller.setMinSlopeSlideAngle(Math.PI / 4);
      player.controller.enableAutostep(0.8, 0.5, true);

      player.model.position.set(startPos.x, startPos.y - PLAYER_HALF_HEIGHT, startPos.z);
      player.lastGroundedPosition.copy(player.model.position);
    },
    undefined,
    (err) => console.error('❌ Error loading player model:', err)
  );
}

function switchAnimation(newAction) {
  if (player.currentAction === newAction || !player.actions[newAction]) return;
  const oldAction = player.actions[player.currentAction];
  if (oldAction) oldAction.fadeOut(0.3);
  player.actions[newAction].reset().fadeIn(0.3).play();
  player.currentAction = newAction;
}

const moveVector = new THREE.Vector3();
const upVector = new THREE.Vector3(0, 1, 0);
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const targetQuaternion = new THREE.Quaternion();
const currentQuaternion = new THREE.Quaternion();

export function updatePlayer(deltaTime, camera) {
  if (!player.model || !player.mixer || !player.body || !player.controller || !camera) return;

  // --- Ground detection ---
  const wasGrounded = player.isGrounded;
  player.isGrounded = player.controller.computedGrounded();
  if (player.isGrounded && !wasGrounded) player.velocityY = 0;

  // --- Input movement ---
  moveVector.set(0, 0, 0);
  camera.getWorldDirection(forward);
  forward.y = 0;
  forward.normalize();
  right.crossVectors(upVector, forward).normalize();

  let isMoving = false;
  if (keys.w.pressed) { moveVector.add(forward); isMoving = true; }
  if (keys.s.pressed) { moveVector.sub(forward); isMoving = true; }
  if (keys.a.pressed) { moveVector.add(right); isMoving = true; }
  if (keys.d.pressed) { moveVector.sub(right); isMoving = true; }

  // --- Rotation ---
  if (isMoving) {
    const angle = Math.atan2(moveVector.x, moveVector.z);
    targetQuaternion.setFromAxisAngle(upVector, angle);
    currentQuaternion.copy(player.model.quaternion);
    currentQuaternion.slerp(targetQuaternion, ROTATION_SPEED);
    player.model.quaternion.copy(currentQuaternion);
  }

  // --- Normalize and apply speed multiplier ---
  if (isMoving) {
    moveVector.normalize();
    moveVector.multiplyScalar(PLAYER_SPEED * player.speedMultiplier * deltaTime);
  }

  // --- Jumping ---
  if (keys.space.justPressed && player.isGrounded && player.jumpCooldown <= 0) {
    player.velocityY = JUMP_POWER;
    player.isGrounded = false;
    player.jumpCooldown = 0.1;
  }
  player.jumpCooldown -= deltaTime;

  // --- Gravity ---
  if (!player.isGrounded) {
    player.velocityY += GRAVITY * deltaTime;
    player.velocityY = Math.max(player.velocityY, -50);
  }

  // --- Apply movement via CharacterController ---
  const move = new player.RAPIER.Vector3(
    moveVector.x,
    player.velocityY * deltaTime,
    moveVector.z
  );
  player.controller.computeColliderMovement(player.body, move);

  const result = player.controller.computedMovement();
  const newPos = player.body.translation();
  player.body.setNextKinematicTranslation({
    x: newPos.x + result.x,
    y: newPos.y + result.y,
    z: newPos.z + result.z
  });

  // --- Update grounded state after move ---
  player.isGrounded = player.controller.computedGrounded();
  if (player.isGrounded) player.velocityY = 0;

  // --- Animation ---
  updateAnimationState(isMoving);
  player.mixer.update(deltaTime);
}

function updateAnimationState(isMoving) {
  const target = (player.isGrounded && isMoving) ? 'Walking' : 'Idle';
  if (player.actions[target]) switchAnimation(target);
}

export function getPlayerPosition() {
  if (!player.body) return new THREE.Vector3(0, 0, 0);
  const pos = player.body.translation();
  return new THREE.Vector3(pos.x, pos.y, pos.z);
}

export function applyKnockback(direction, force) {
  if (!player.body || !player.RAPIER) return;
  player.velocityY = force * 0.5;
}
