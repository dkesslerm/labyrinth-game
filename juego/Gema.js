import * as THREE from "three";
import {
  Brush,
  Evaluator,
  SUBTRACTION,
} from "../libs/three-bvh-csg.js";

class Gema extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    this.createGUI(gui, titleGui);

    this.matGemaPrincipal = new THREE.MeshPhysicalMaterial({
      color:               0x22dd55,
      emissive:            0x005522,
      emissiveIntensity:   0.4,
      roughness:           0.05,
      metalness:           0.0,
      transmission:        0.75,
      thickness:           1.2,
      ior:                 1.58,
      attenuationColor:    0x00cc44,
      attenuationDistance: 0.9,
      clearcoat:           1.0,
      clearcoatRoughness:  0.02,
      side:                THREE.DoubleSide,
    });

    this.matRestoGemas = new THREE.MeshPhysicalMaterial({
      color:               0x0a3318,
      emissive:            0x001a08,
      emissiveIntensity:   0.15,
      roughness:           0.25,
      metalness:           0.0,
      transmission:        0.10,
      thickness:           0.8,
      ior:                 1.45,
      clearcoat:           0.5,
      clearcoatRoughness:  0.05,
      side:                THREE.DoubleSide,
    });

    this.matPiedra = new THREE.MeshStandardMaterial({
      color:     0x5e452d,
      roughness: 0.95,
      metalness: 0.0,
    });

    const luzInterna = new THREE.PointLight(0x00ff44, 1.8, 2.0);
    luzInterna.position.set(0, 0.05, 0);
    this.add(luzInterna);

    this.add(this.createCristalCentral());
    this.add(this.createCristalesSecundarios());
    this.add(this.createBase()); // hacer cambios, algo por revolución?
  }

  createGUI(gui, titleGui) {
    this.guiControls = { colorGema: "#22dd55", emissive: 0.4 };
    const folder = gui.addFolder(titleGui);
    folder.addColor(this.guiControls, "colorGema").name("Color cristal:")
      .onChange((v) => { this.matGemaPrincipal.color.set(v); this.matGemaPrincipal.attenuationColor.set(v); });
    folder.add(this.guiControls, "emissive", 0, 1, 0.01).name("Brillo interno:")
      .onChange((v) => (this.matGemaPrincipal.emissiveIntensity = v));
  }
  
  // -------------------------------------------------
  // GEMA - Contorno + revolución + CSG
  // -------------------------------------------------
  createCristalCentral() {
    const evaluator = new Evaluator();
    
    const contornoGema = [
          new THREE.Vector2(0, 0),
          new THREE.Vector2(0.15, 0.2),
          new THREE.Vector2(0, 0.4),
        ];

    const geo = new THREE.LatheGeometry(contornoGema, 8);
    geo.translate(0, -0.2, 0);

    const brushCristal = new Brush(geo, this.matGemaPrincipal);
    brushCristal.updateMatrixWorld();
    
    const brushTabla = new Brush(new THREE.BoxGeometry(2, 0.2, 2), this.matGemaPrincipal);
    brushTabla.position.set(0, 0.2, 0);
    brushTabla.updateMatrixWorld();
    let res = evaluator.evaluate(brushCristal, brushTabla, SUBTRACTION);

    const mesh = new THREE.Mesh(res.geometry, this.matGemaPrincipal);
    return mesh;
  }

  // ─────────────────────────────────────────────────────────────
  // GEMAS SECUNDARIAS - Contorno + revolución
  // ─────────────────────────────────────────────────────────────
  placeCristal(grupo, angulo, escY, escXZ, inclinacion, radio = 0.0) {
    const Y_ORIG = -0.15; 
    const contornoSecundario = [
        new THREE.Vector2(0.0, 0),
        new THREE.Vector2(0.1, 0),
        new THREE.Vector2(0.1, 0.1),
        new THREE.Vector2(0.1, 0.2),
        new THREE.Vector2(0.1, 0.3),
        new THREE.Vector2(0, 0.4),
    ];
    const geo = new THREE.LatheGeometry(contornoSecundario, 8);
    geo.translate(0, -0.2, 0);

    const mesh = new THREE.Mesh(geo, this.matRestoGemas);
    mesh.scale.set(escXZ, escY, escXZ);
    // Subir para que punta inferior quede en Y=0 del pivote
    mesh.position.y = 0.2 * escY;

    const pivote = new THREE.Object3D();
    pivote.add(mesh);

    // Eje tangente: perpendicular a la dirección radial en XZ
    const ejeTangente = new THREE.Vector3(-Math.cos(angulo), 0, Math.sin(angulo));
    pivote.rotateOnAxis(ejeTangente, inclinacion);

    // Posicionar el pivote con un pequeño desplazamiento radial
    // para separar los cristales del centro sin perder el origen común
    pivote.position.set(
      -Math.sin(angulo) * radio,
      Y_ORIG,
      -Math.cos(angulo) * radio
    );
    
    grupo.add(pivote);
  }

  createCristalesSecundarios() {
    const grupo = new THREE.Object3D();

    // [angulo, escaladoY, escaladoXZ, inclinación, radio]
    const medio = [
      [Math.PI * -0.125, 0.55, 0.5, 0.62, 0.1],
      [Math.PI * 0.125, 0.48, 0.44, 0.58, 0.1],
      [Math.PI * 0.375, 0.52, 0.48, 0.65, 0.1],
      [Math.PI * 0.625, 0.46, 0.42, 0.6, 0.1],
      [Math.PI * 0.875, 0.54, 0.5, 0.62, 0.1],
      [Math.PI * 1.125, 0.44, 0.41, 0.58, 0.1],
      [Math.PI * 1.375, 0.5, 0.46, 0.65, 0.1],
      [Math.PI * 1.625, 0.42, 0.4, 0.6, 0.1],
    ];
    
    const exterior = [
      [Math.PI * 0, 0.4, 0.4, 0.95, 0.15],
      [Math.PI * 0.25, 0.34, 0.36, 0.9, 0.15],
      [Math.PI * 0.5, 0.38, 0.38, 0.98, 0.15],
      [Math.PI * 0.75, 0.32, 0.34, 0.92, 0.15],
      [Math.PI * 1, 0.36, 0.37, 0.95, 0.15],
      [Math.PI * 1.25, 0.3, 0.33, 0.88, 0.15],
      [Math.PI * 1.5, 0.38, 0.39, 0.98, 0.15],
      [Math.PI * 1.75, 0.32, 0.35, 0.9, 0.15],
    ];
    
    for (const [a, escY, escXZ, incl, r] of medio) {
      this.placeCristal(grupo, a, escY, escXZ, incl, r);
    }
    for (const [a, escY, escXZ, incl, r] of exterior) {
      this.placeCristal(grupo, a, escY, escXZ, incl, r);
    }

    return grupo;
  }

  createBase() {
    const grupo = new THREE.Object3D();
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.5), this.matPiedra);
    mesh.position.set(0, -0.2, 0);
    grupo.add(mesh);
    return grupo;
  }

  update() {}
}

export { Gema };