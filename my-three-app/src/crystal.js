import * as THREE from 'three';

/**
 * Creates and adds glowing crystals to the scene.
 * @param {THREE.Scene} scene
 * @param {number} count Number of crystals to spawn
 * @param {object} bounds { xMin, xMax, zMin, zMax, y } for spawn area
 * @returns {{ crystals: THREE.Mesh[], crystalPositions: number[][] }}
 */
export function createCrystals(scene, count = 10, bounds = { xMin: -20, xMax: 20, zMin: -20, zMax: 10, y: 0.5 }) {
    const crystals = [];
    const crystalPositions = [];

    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x44e6ff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.5,
        roughness: 0.2,
        metalness: 0.1
    });

    for (let i = 0; i < count; i++) {
        const x = Math.random() * (bounds.xMax - bounds.xMin) + bounds.xMin;
        const z = Math.random() * (bounds.zMax - bounds.zMin) + bounds.zMin;
        const y = bounds.y;

        const crystal = new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 0), crystalMat.clone());
        crystal.position.set(x, y, z);
        crystal.castShadow = true;
        crystal.name = 'crystal';
        scene.add(crystal);
        crystals.push(crystal);
        crystalPositions.push([x, y, z]);

        // Add glowing light for ambiance
        const light = new THREE.PointLight(0x33ccff, 0.9, 8);
        light.position.set(x, y + 1, z);
        scene.add(light);
    }

    return { crystals, crystalPositions };
}

/**
 * Updates crystals each frame (rotation + pickup detection)
 */
export function updateCrystals(crystals, player, scene, onPickup) {
    crystals.forEach((c, i) => {
        if (!c) return;
        c.rotation.y += 0.03;
        if (player?.model && player.model.position.distanceTo(c.position) < 1.0) {
            scene.remove(c);
            crystals[i] = null;
            if (onPickup) onPickup(i);
        }
    });
}

