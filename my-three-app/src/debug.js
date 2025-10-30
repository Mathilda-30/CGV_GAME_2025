// debug.js
import * as THREE from 'three';

// This is the custom class to render Rapier's debug lines
export class CustomRapierDebugRenderer {
  mesh;
  world;
  enabled = true;
  _lines;
  _material;

  constructor(scene, world) {
    this.world = world;
    this._lines = new THREE.BufferGeometry();
    this._material = new THREE.LineBasicMaterial({
      color: 0xffffff,
      vertexColors: true // Use colors provided by Rapier
    });
    this.mesh = new THREE.LineSegments(this._lines, this._material);
    this.mesh.frustumCulled = false; // Prevent lines disappearing
    scene.add(this.mesh);
    console.log('Custom Rapier debug renderer created.');
  }

  update() {
    if (this.enabled && this.world) {
      const { vertices, colors } = this.world.debugRender();
      this._lines.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
      this._lines.setAttribute('color', new THREE.BufferAttribute(colors, 4));
      this.mesh.visible = true;
    } else {
      this.mesh.visible = false;
    }
  }

  setEnabled(enabled) {
    this.enabled = enabled;
  }

  dispose() {
     this._lines.dispose();
     this._material.dispose();
     if (this.mesh.parent) {
       this.mesh.parent.remove(this.mesh);
     }
  }
}