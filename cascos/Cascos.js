import * as THREE from "three";
import * as CSG from "../libs/three-bvh-csg.js";

class Cascos extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // Se crea la parte de la interfaz que corresponde a la Taza
    // Se crea primero porque otros métodos usan las variables que se definen para la interfaz
    this.createGUI(gui, titleGui);

    const radius = 0.05;
    const scaleFactor = 1.3;
    // 0.065
   
    // Semiesfera
    const domeGeometry = new THREE.SphereGeometry(
      radius,
      32,
      16,
      0,
      Math.PI * 2,
      0,
      Math.PI / 2
    );
    domeGeometry.scale(scaleFactor, 1, 1);
   
    this.material = new THREE.MeshStandardMaterial({
      color: 0x4ea5ff,
      side: THREE.DoubleSide
    });
   
    const baseGeometry = new THREE.CircleGeometry(radius, 32);
    baseGeometry.scale(1, scaleFactor, 1);
    const torusGeometry = new THREE.TorusGeometry(radius, 0.008, 24, 24);
    torusGeometry.scale(1, scaleFactor, 1);
    
    const startPoint = new THREE.Vector3(-0.015, radius * scaleFactor - 0.007, 0);
    const endPoint = new THREE.Vector3(0.115, radius * scaleFactor - 0.007, 0);
    const control1 = new THREE.Vector3(-0.005, radius * scaleFactor + 0.08, 0);
    const control2 = new THREE.Vector3(0.105, radius * scaleFactor + 0.08, 0);
    
    const curve = new THREE.CubicBezierCurve3(startPoint, control1, control2, endPoint);
    const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.005, 8, false);

    
    const h1 = this.createHemisphere(domeGeometry, baseGeometry, this.material);
    const h2 = this.createHemisphere(domeGeometry, baseGeometry, this.material);
    const t1 = this.createTorus(torusGeometry, this.material);
    const t2 = this.createTorus(torusGeometry, this.material);
    const hb = this.createHB(tubeGeometry, this.material);
    this.add(h1);
    
    h2.translateX(0.1);
    h2.rotateY(Math.PI);
    this.add(h2);
    
    this.add(t1);
    
    t2.translateX(0.1);
    this.add(t2);

    this.add(hb);
    this.translateX(-0.05);
  }

  createGUI(gui, titleGui) {
    // Controles para el movimiento de la parte móvil
    this.guiControls = {
      rotacion: 0,
    };

    // Se crea una sección para los controles de la caja
    var folder = gui.addFolder(titleGui);
    // Estas lineas son las que añaden los componentes de la interfaz
    // Las tres cifras indican un valor mínimo, un máximo y el incremento
    folder
      .add(this.guiControls, "rotacion", -0.125, 0.2, 0.001)
      .name("Apertura : ")
      .onChange((value) => this.setAngulo(-value));
  }

  update() {
    // No hay nada que actualizar ya que la apertura de la grapadora se ha actualizado desde la interfaz
  }
  
  createHemisphere(domeGeo, baseGeo, material) {
    const group = new THREE.Group();
    const dome = new THREE.Mesh(domeGeo, material);
    dome.rotation.z = Math.PI / 2;
    const base = new THREE.Mesh(baseGeo, material);
    base.rotation.y = -Math.PI / 2;
    group.add(dome, base);
    return group;
  }
  
  createTorus(torusGeo, material) {
    const group = new THREE.Group();
    const torus = new THREE.Mesh(torusGeo, material);
    torus.rotation.y = Math.PI / 2;
    group.add(torus);
    return group;
  }
  
  createHB(hbGeo, material) {
    const group = new THREE.Group();
    const mesh = new THREE.Mesh(hbGeo, material);
    group.add(mesh);
    return group;
  }
}

export { Cascos };
