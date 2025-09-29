import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';

export function startLevel3(onComplete) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb); // sky blue

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  // Renderer
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  document.body.innerHTML = ""; // clears previous DOM (canvas + HUD)
  document.body.appendChild(renderer.domElement);

  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dirLight = new THREE.DirectionalLight(0xffffff, 1);
  dirLight.position.set(5, 10, 7);
  scene.add(dirLight);

  // Hemisphere light for subtle sky gradient
  const hemi = new THREE.HemisphereLight(0xffffbb, 0x080820, 0.5);
  scene.add(hemi);

  // Ground (sand)
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0xdeb887, roughness: 1, metalness: 0 })
  );
  ground.rotation.x = -Math.PI / 2;
  scene.add(ground);

  // Water surrounding the island
  const waterGeo = new THREE.CircleGeometry(50, 64);
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x1ca3ec,
    transparent: true,
    opacity: 0.7
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI/2;
  water.position.y = -0.01; 
  scene.add(water);

  // Simple palm trees
  function addPalm(x, z) {
    const trunk = new THREE.Mesh(
      new THREE.CylinderGeometry(0.2, 0.2, 2),
      new THREE.MeshStandardMaterial({ color: 0x8b5a2b })
    );
    trunk.position.set(x, 1, z);

    const leaves = new THREE.Mesh(
      new THREE.ConeGeometry(1, 2, 8),
      new THREE.MeshStandardMaterial({ color: 0x228b22 })
    );
    leaves.position.set(x, 2.5, z);

    scene.add(trunk, leaves);
  }
  addPalm(3, -3);
  addPalm(-4, 2);
  addPalm(-2, -5);
  addPalm(4, 4);
  addPalm(0, 0);

  // Player
  const player = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1, 0.6),
    new THREE.MeshStandardMaterial({ color: 0x00ffcc })
  );
  player.position.set(0, 0.5, 0);
  scene.add(player);

  // Crystals
  let crystals = [];
  const crystalGeo = new THREE.IcosahedronGeometry(0.4, 0);
  const crystalMat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive: 0xaa00aa });
  const positions = [[0,0.5,-2],[-4,0.5,1],[0,0.5,-6]];
  positions.forEach(p=>{
    const m = new THREE.Mesh(crystalGeo, crystalMat.clone());
    m.position.set(...p);
    scene.add(m);
    crystals.push(m);
  });

  // Input + HUD
  initInput();
  resetCounter();
  showHUD();

  const clock = new THREE.Clock();
  let animId;

  function animate() {
    animId = requestAnimationFrame(animate);
    const dt = clock.getDelta();

    // Player movement
    const dir = new THREE.Vector3();
    if (keys['w']) dir.z -= 1;
    if (keys['s']) dir.z += 1;
    if (keys['a']) dir.x -= 1;
    if (keys['d']) dir.x += 1;
    dir.normalize().multiplyScalar(5 * dt);
    player.position.add(dir);

    // Camera follows player smoothly
    const camTarget = player.position.clone().add(new THREE.Vector3(0, 3, 6));
    camera.position.lerp(camTarget, 0.1);
    camera.lookAt(player.position);

    // Animate crystals
    crystals.forEach((c,i)=>{
      if (!c) return;
      c.rotation.y += 0.02;
      if (player.position.distanceTo(c.position) < 1) {
        scene.remove(c);
        crystals[i] = null;
        updateHUD(getCounter() + 1);

        if (getCounter() === crystals.length) {
          // Level completed
          setTimeout(()=>{
            cleanup();
            onComplete();
          }, 500);
        }
      }
    });

    renderer.render(scene, camera);
  }
  animate();

  function cleanup() {
    cancelAnimationFrame(animId);
    renderer.dispose();
  }

  return cleanup;
}
