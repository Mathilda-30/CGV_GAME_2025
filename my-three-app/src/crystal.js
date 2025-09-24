// src/crystal.js
import * as THREE from 'three';
import { setCounter } from './ui.js';

let crystals = [];
let collected = 0;
let onAllCollected = null;

export function initCrystals(scene, positions, callback) {
  crystals = [];
  collected = 0;
  onAllCollected = callback;

  const geo = new THREE.IcosahedronGeometry(0.4, 0);
  positions.forEach(p => {
    const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(...p);
    scene.add(mesh);
    crystals.push(mesh);
  });

  setCounter(0);
}

export function updateCrystals(player) {
  crystals.forEach((c, i) => {
    if (!c) return;
    c.rotation.y += 0.02;

    if (player.mesh.position.distanceTo(c.position) < 1) {
      c.visible = false;
      crystals[i] = null;
      collected++;
      setCounter(collected);

      if (collected === crystals.length && onAllCollected) {
        onAllCollected();
      }
    }
  });
}
