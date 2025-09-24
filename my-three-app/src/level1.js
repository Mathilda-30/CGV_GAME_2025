import * as THREE from 'three';
import { initInput, keys } from './input.js';
import { showHUD, updateHUD, resetCounter, getCounter } from './ui.js';





export function startLevel1(onComplete) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x87ceeb);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
  camera.position.set(0, 5, 10);

  // Setup renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);

// Instead of just appending...
document.body.innerHTML = ""; // 🔥 clears old canvas + HUD
document.body.appendChild(renderer.domElement);


  // Lights
  scene.add(new THREE.AmbientLight(0xffffff, 0.6));
  const dir = new THREE.DirectionalLight(0xffffff, 1);
  dir.position.set(5,10,7);
  scene.add(dir);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0xdeb887 }) // sand color
  );
  ground.rotation.x = -Math.PI/2;
  scene.add(ground);

  // Player
  const player = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 1, 0.6), // smaller
    new THREE.MeshStandardMaterial({ color: 0x00ffcc })
  );
  player.position.set(0,0.5,0);
  scene.add(player);

  // Crystals
  let crystals = [];
  const geo = new THREE.IcosahedronGeometry(0.4,0);
  const mat = new THREE.MeshStandardMaterial({ color: 0xff00ff, emissive:0xaa00aa });
  const positions = [[3,0.5,-2],[-4,0.5,1],[0,0.5,-6]];
  positions.forEach(p=>{
    const m = new THREE.Mesh(geo,mat.clone());
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

    // Movement
    const dir = new THREE.Vector3();
    if (keys['w']) dir.z -= 1;
    if (keys['s']) dir.z += 1;
    if (keys['a']) dir.x -= 1;
    if (keys['d']) dir.x += 1;
    dir.normalize().multiplyScalar(5 * dt);
    player.position.add(dir);

    camera.position.lerp(player.position.clone().add(new THREE.Vector3(0,3,6)), 0.1);
    camera.lookAt(player.position);

    // Crystals check
    crystals.forEach((c,i)=>{
      if (!c) return;
      c.rotation.y += 0.02;
      if (player.position.distanceTo(c.position) < 1) {
        scene.remove(c);
        crystals[i] = null;
        updateHUD(getCounter()+1);
        if (getCounter() === 3) {
          // completed
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
