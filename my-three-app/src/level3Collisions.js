import * as THREE from 'three';

class CollisionManager {
  constructor() {
    this.platforms = [];
    this.grounds = [];
    this.walls = [];
  }

  addPlatform(position, size) {
    this.platforms.push({
      min: new THREE.Vector3(
        position.x - size.x / 2,
        position.y - size.y / 2,
        position.z - size.z / 2
      ),
      max: new THREE.Vector3(
        position.x + size.x / 2,
        position.y + size.y / 2,
        position.z + size.z / 2
      )
    });
  }

  addGround(min, max) {
    this.grounds.push({ min, max });
  }

  addWall(position, size) {
    this.walls.push({
      min: new THREE.Vector3(
        position.x - size.x / 2,
        position.y - size.y / 2,
        position.z - size.z / 2
      ),
      max: new THREE.Vector3(
        position.x + size.x / 2,
        position.y + size.y / 2,
        position.z + size.z / 2
      )
    });
  }

  checkCollisions(playerBBox, playerPos, velocity) {
    let isOnPlatform = false;

    // Check platforms (static and moving)
    for (let platform of this.platforms) {
      const box = new THREE.Box3(platform.min, platform.max);
      if (playerBBox.intersectsBox(box)) {
        const platformTop = platform.max.y;
        const playerBottom = playerBBox.min.y;
        // Player is landing on platform from above
        if (playerBottom <= platformTop && velocity.y <= 0) {
          playerPos.y = platformTop - (playerBottom - playerPos.y);
          velocity.y = 0;
          isOnPlatform = true;
        }
      }
    }

    // Check grounds
    for (let ground of this.grounds) {
      const box = new THREE.Box3(ground.min, ground.max);
      if (playerBBox.intersectsBox(box)) {
        const groundTop = ground.max.y;
        const playerBottom = playerBBox.min.y;
        if (playerBottom <= groundTop && velocity.y <= 0) {
          playerPos.y = groundTop - (playerBottom - playerPos.y);
          velocity.y = 0;
          isOnPlatform = true;
        }
      }
    }

    // Check maze walls (block movement in x/z by reverting position if collision)
    let collided = false;
    for (let wall of this.walls) {
      const box = new THREE.Box3(wall.min, wall.max);
      if (playerBBox.intersectsBox(box)) {
        collided = true;
        break;
      }
    }
    if (collided) {
      // Indicate to the caller that a wall collision occurred
      return { isOnPlatform, wallCollision: true };
    }

  return { isOnPlatform, wallCollision: false };
  }

  // Add a method to register maze wall boxes
  addMazeWall(min, max) {
    this.walls.push({ min, max });
  }

  // Add a method to update moving platforms
  updateMovingPlatforms(platforms) {
    // Remove previous moving platforms (assume they are always at the end)
    // For simplicity, clear all and re-add static after moving
    const staticPlatforms = this.platforms.filter(p => !p.isMoving);
    this.platforms = staticPlatforms;
    for (let p of platforms) {
      const min = new THREE.Vector3(
        p.position.x - p.scale.x * 2.5,
        p.position.y - 0.25,
        p.position.z - p.scale.z * 2.5
      );
      const max = new THREE.Vector3(
        p.position.x + p.scale.x * 2.5,
        p.position.y + 0.25,
        p.position.z + p.scale.z * 2.5
      );
      this.platforms.push({ min, max, isMoving: true });
    }
  }

  clear() {
    this.platforms = [];
    this.grounds = [];
    this.walls = [];
  }
}

export const collisionManager = new CollisionManager();