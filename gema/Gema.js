import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
} from "../libs/three-bvh-csg.js";

class Gema extends THREE.Object3D {
  constructor(gui, titleGui) {
    super(); 
    
    this.createGUI(gui, titleGui);
    
    // Materiales 
  
    this.matGema = new THREE.MeshPhysicalMaterial({
      color: 0x9ad8c1,
      roughness: 0.04,
      metalness: 0.0,
      transmission: 0.9,
      thickness: 1.0,
      ior: 1.58,
      attenuationColor: 0x72c7ab,
      attenuationDistance: 1.0,
      clearcoat: 0.3,
      clearcoatRoughness: 0.02,
    });
    
    this.add(this.createGem()); 
  }
  
  createGUI(gui, titleGui) {
    this.guiControls = {
      colorGema   : '#9AD8C1',   
    };

    var folder = gui.addFolder(titleGui);
    folder.addColor(this.guiControls, 'colorGema')
      .name('Color gema: ')
      .onChange((v) => this.matGema.color.set(v));
  }
  
  createGem() {
    // -------------------------------------------------
    // GEMA - Contorno + revolución
    // -------------------------------------------------
    const contornoGema = [
      new THREE.Vector2(0, 0),
      new THREE.Vector2(0.15, 0.2),
      new THREE.Vector2(0, 0.4),
    ];
  
    const geoGema = new THREE.LatheGeometry(contornoGema, 8);
    geoGema.translate(0, -0.2, 0);
    
    // -------------------------------------------------
    // TODO: PIEDRAS INCRUSTADAS CON CSG
    // -------------------------------------------------
  
    // -------------------------------------------------
    // Suma de todo
    // -------------------------------------------------
    const meshGema = new THREE.Mesh(geoGema, this.matGema);
    meshGema.castShadow = true;
    meshGema.receiveShadow = true;
  
    return meshGema;
  }
  
  update() {
    // Sin animación propia
  }
}

export { Gema };

