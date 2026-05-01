import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
} from "../libs/three-bvh-csg.js";

class Sombrero extends THREE.Object3D {
  constructor(gui, titleGui) {
    super(); 
    
    this.createGUI(gui, titleGui);
    
    // Materiales
    this.hatMat = new THREE.MeshStandardMaterial({
      color: 0x6A4528,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    });
  
    this.bandMat = new THREE.MeshStandardMaterial({
      color: 0x2F1C10,
      roughness: 0.92,
      metalness: 0.01,
    });
    
    this.add(this.createIndianaHat());
  }
  
  createGUI(gui, titleGui) {
    this.guiControls = {
      hatColor   : '#6A4528',   
      bandColor  : '#2F1C10',   
    };

    var folder = gui.addFolder(titleGui);
    folder.addColor(this.guiControls, 'hatColor')
      .name('Color sombrero: ')
      .onChange((v) => this.hatMat.color.set(v));
    folder.addColor(this.guiControls, 'bandColor')
      .name('Color banda: ')
      .onChange((v) => this.bandMat.color.set(v));
  }
  
  makeBrush(geometry, material) {
    geometry.computeVertexNormals();
    const brush = new Brush(geometry, material);
    brush.updateMatrixWorld(true);
    return brush;
  }
  
  createIndianaHat() {
    const evaluator = new Evaluator();

    // -------------------------------------------------
    // COPA - Contorno + revolución
    // -------------------------------------------------
    const contornoCopa = [
      new THREE.Vector2(0.168, 0.0), 
      new THREE.Vector2(0.168, 0.01), 
      new THREE.Vector2(0.168, 0.03), 
      new THREE.Vector2(0.165, 0.083),
      new THREE.Vector2(0.156, 0.15), 
      new THREE.Vector2(0.135, 0.2), 
      new THREE.Vector2(0.105, 0.23), 
      new THREE.Vector2(0.072, 0.242),
      new THREE.Vector2(0.042, 0.25),
      new THREE.Vector2(0.0, 0.25),

      // grosor (rama interior, de arriba a abajo)
      // new THREE.Vector2(0.0,     0.24),
      // new THREE.Vector2(0.037,   0.24),
      // new THREE.Vector2(0.067,   0.232),
      // new THREE.Vector2(0.100,   0.22),
      // new THREE.Vector2(0.130,   0.19),
      // new THREE.Vector2(0.151,   0.14),
      // new THREE.Vector2(0.160,   0.073),
      // new THREE.Vector2(0.163,   0.01),
      // new THREE.Vector2(0.168,   0.0),
    ];
  
    const geoCopa = new THREE.LatheGeometry(contornoCopa, 96);
    geoCopa.translate(0, 0.028, 0);
    let brushCopa = this.makeBrush(geoCopa, this.hatMat);
  
    // -------------------------------------------------
    // ALA — Contorno + revolución
    // -------------------------------------------------
    const contornoAla = [
      new THREE.Vector2(0.168, 0.002),
      new THREE.Vector2(0.172, 0.0),
      new THREE.Vector2(0.19, -0.006),
      new THREE.Vector2(0.225, -0.014),
      new THREE.Vector2(0.26, -0.024),
      new THREE.Vector2(0.29, -0.032),
      new THREE.Vector2(0.31, -0.035),
      new THREE.Vector2(0.318, -0.03),
      new THREE.Vector2(0.302, -0.026),
      new THREE.Vector2(0.265, -0.018),
      new THREE.Vector2(0.22, -0.008),
      new THREE.Vector2(0.165, -0.001),
    ];

    const geoAla = new THREE.LatheGeometry(contornoAla, 128);
    geoAla.translate(0, 0.028, 0);
    let brushAla = this.makeBrush(geoAla, this.hatMat);
  
    let brushSombrero = evaluator.evaluate(brushCopa, brushAla, ADDITION);
    brushSombrero.material = this.hatMat;
  
    // -------------------------------------------------
    // SURCO - Diferencia CSG 
    // -------------------------------------------------
    const apexY = 0.25 + 0.028; // altura copa + offset traslación
  
    const geoSurco = new THREE.SphereGeometry(0.1, 48, 32);
    
    // X controla la anchura, Y la profundidad y Z la longitud del surco
    geoSurco.scale(1, 0.7, 1.5)
    geoSurco.translate(0, apexY, 0);
  
    const brushSurco = this.makeBrush(geoSurco, this.hatMat);
    brushSombrero = evaluator.evaluate(brushSombrero, brushSurco, SUBTRACTION);
    brushSombrero.material = this.hatMat;
  
    // -------------------------------------------------
    // CINTA - Contorno + revolución
    // -------------------------------------------------
    const contornoCinta = [
      new THREE.Vector2(0.168, 0.0),
      new THREE.Vector2(0.172, 0.0),
      new THREE.Vector2(0.172, 0.02),
      new THREE.Vector2(0.168, 0.02),
    ];
    const geoCinta = new THREE.LatheGeometry(contornoCinta, 96);
    geoCinta.translate(0, 0.05, 0);
    const meshCinta = new THREE.Mesh(geoCinta, this.bandMat);
    meshCinta.castShadow = true;
    meshCinta.receiveShadow = true;
  
    // -------------------------------------------------
    // Suma de todo
    // -------------------------------------------------
    const meshSombrero = new THREE.Mesh(brushSombrero.geometry, this.hatMat);
    meshSombrero.castShadow = true;
    meshSombrero.receiveShadow = true;
    
    const group = new THREE.Group();
    group.add(meshSombrero, meshCinta);
    return group;
  }
  
  update() {
    // Sin animación propia
  }

}

export { Sombrero }

