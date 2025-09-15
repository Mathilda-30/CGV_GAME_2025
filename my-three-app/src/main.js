// src/main.js
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

// --- basic scene, camera, renderer
const container = document.getElementById('app');

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x111218);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(3, 2, 6);

// renderer
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
container.appendChild(renderer.domElement);

// --- a cube
const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const mat = new THREE.MeshStandardMaterial({ color: 0x00aaff, metalness: 0.3, roughness: 0.4 });
const cube = new THREE.Mesh(geo, mat);
scene.add(cube);

// --- lights
const ambient = new THREE.AmbientLight(0xffffff, 0.35);
scene.add(ambient);

const dir = new THREE.DirectionalLight(0xffffff, 0.9);
dir.position.set(5, 10, 7);
scene.add(dir);

// --- helpers (optional)
const grid = new THREE.GridHelper(10, 10, 0x444444, 0x222222);
scene.add(grid);

// --- controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true; // smooth movement

// --- handle resizing
function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
}
window.addEventListener('resize', onWindowResize);

// --- animation loop
const clock = new THREE.Clock();
function animate() {
  requestAnimationFrame(animate);
  const t = clock.getElapsedTime();

  // animate cube
  cube.rotation.x = t * 0.5;
  cube.rotation.y = t * 0.8;

  controls.update();
  renderer.render(scene, camera);
}
animate();
