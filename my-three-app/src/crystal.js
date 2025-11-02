import * as THREE from 'three';

/**
 * Creates and adds glowing crystals to the scene.
 * @param {THREE.Scene} scene
 * @param {number} count Number of crystals to spawn
 * @param {object} bounds { xMin, xMax, zMin, zMax, y } for spawn area
 * @returns {{ crystals: THREE.Mesh[], crystalPositions: number[][] }}
 */


export function createCrystals(scene) {
    const crystals = [];
    const crystalPositions = [];

    const raycaster = new THREE.Raycaster();

    const crystalMat = new THREE.MeshStandardMaterial({
        color: 0x44e6ff,
        emissive: 0x00aaff,
        emissiveIntensity: 1.8,
        roughness: 0.2,
        metalness: 0.1,
    });

    const groundObjects = rocks.filter(r => r.position.y < 2);

    let placed = 0, tries = 0;
    while (placed < NUM_CRYSTALS && tries < MAX_ATTEMPTS) {
        tries++;

        const x = THREE.MathUtils.randFloatSpread(40);
        const z = THREE.MathUtils.randFloatSpread(40);

        const dist = Math.hypot(x, z);
        if (dist > caveRadius - 2) continue;
        if (tooCloseToRocks(x, z)) continue;

        // Raycast down to find floor height (approx)
        raycaster.set(new THREE.Vector3(x, 15, z), down);
        const intersects = raycaster.intersectObjects(groundObjects, true);
        let y = 0.4;
        if (intersects.length > 0) {
            y = intersects[0].point.y + 0.4;
        }

        const crystal = new THREE.Mesh(crystalGeo, crystalMat.clone());
        crystal.position.set(x, y, z);
        crystal.castShadow = true;
        crystal.name = 'crystal';
        scene.add(crystal);

        // Add subtle glow
        const light = new THREE.PointLight(0x33ccff, 1.2, 6);
        light.position.set(x, y + 0.5, z);
        scene.add(light);

        crystals.push(crystal);
        crystalPositions.push([x, y, z]);
        placed++;
        console.log(` Crystal placed at (${x.toFixed(2)}, ${y.toFixed(2)}, ${z.toFixed(2)})`);
    }

    if (placed === 0) {
        console.warn(' No crystals placed — check spawn area or floor geometry!');
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
            // Remove from scene
            scene.remove(c);
            crystals[i] = null;

            //  Play shine sound
            const audio = new Audio('./sound/shine.mp3');
            audio.volume = 0.6; // adjust volume if needed
            audio.play().catch(err => console.warn(' Crystal sound failed:', err));

            // Update counter or trigger callback
            if (onPickup) onPickup(i);
        }
    });
}

