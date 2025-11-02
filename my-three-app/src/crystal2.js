// src/crystal.js
import * as THREE from 'three';
import { updateHUD } from './ui.js';

let crystals = [];
let collected = 0;
let onAllCollected = null;
let collectSound = null;

export function initCrystals(scene, positions, callback) {
  crystals = [];
  collected = 0;
  onAllCollected = callback;

  const geo = new THREE.IcosahedronGeometry(0.4, 0);
  
  positions.forEach((p, index) => {
    const mat = new THREE.MeshStandardMaterial({ 
      color: 0xff00ff, 
      emissive: 0xaa00aa,
      emissiveIntensity: 0.5
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(p.x, p.y, p.z);
    mesh.castShadow = true;
    scene.add(mesh);
    crystals.push(mesh);

    // Add subtle point light to each crystal for glow effect
    const light = new THREE.PointLight(0xff00ff, 0.5, 3);
    light.position.copy(mesh.position);
    scene.add(light);
    mesh.userData.light = light;
  });

  // Initialize counter display
  updateHUD(0);

  // Setup collection sound (optional)
  const listener = new THREE.AudioListener();
  collectSound = new THREE.Audio(listener);
  const audioLoader = new THREE.AudioLoader();
  
  // Optional: Load a collection sound effect
  // audioLoader.load('/sounds/collect.mp3', (buffer) => {
  //   collectSound.setBuffer(buffer);
  //   collectSound.setVolume(0.3);
  // });
}

export function updateCrystals(player) {
  crystals.forEach((c, i) => {
    if (!c) return;
    
    // Rotate crystal for visual appeal
    c.rotation.y += 0.02;
    
    // Bob up and down for life-like movement
    c.position.y += Math.sin(Date.now() * 0.003 + i) * 0.002;

    // Check if player is close enough to collect
    if (player.model && player.model.position.distanceTo(c.position) < 1.5) {
      // Collection effect
      createCollectionEffect(c);
      
      // Play sound if available
      if (collectSound && collectSound.buffer) {
        collectSound.play();
      }
      
      // Remove crystal and its light
      c.visible = false;
      if (c.userData.light) {
        c.userData.light.visible = false;
      }
      
      crystals[i] = null;
      collected++;
      updateHUD(collected);

      if (collected === crystals.length && onAllCollected) {
        onAllCollected();
      }
    }
  });
}

// --- Collection Visual Effect ---
function createCollectionEffect(crystal) {
  // Scale up and fade out animation
  const duration = 300; // ms
  const startTime = Date.now();

  const animate = () => {
    const elapsed = Date.now() - startTime;
    const progress = elapsed / duration;

    if (progress < 1 && crystal.visible) {
      crystal.scale.setScalar(1 + progress * 2);
      crystal.material.opacity = 1 - progress;
      crystal.material.transparent = true;
      requestAnimationFrame(animate);
    }
  };

  animate();
}