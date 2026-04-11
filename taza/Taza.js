import * as THREE from "three";
import * as CSG from "../libs/three-bvh-csg.js";

class Taza extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // Se crea la parte de la interfaz que corresponde a la Taza
    // Se crea primero porque otros métodos usan las variables que se definen para la interfaz
    this.createGUI(gui, titleGui);

    this.material = new THREE.MeshStandardMaterial({ color: 0xcf0000 });
    var cilExt = new THREE.CylinderGeometry(0.05, 0.05, 0.1, 24, 1);
    var cilInt = new THREE.CylinderGeometry(0.047, 0.047, 0.1, 24, 2);
    var toro = new THREE.TorusGeometry(0.03, 0.005, 24, 24);

    cilInt.translate(0, 0.053, 0);
    toro.translate(-0.05, 0.05, 0);
    cilExt.translate(0, 0.05, 0);

    var cilExtBrush = new CSG.Brush(cilExt, this.material);
    var cilIntBrush = new CSG.Brush(cilInt, this.material);
    var toroBrush = new CSG.Brush(toro, this.material);

    var evaluador = new CSG.Evaluator();
    var tmp = evaluador.evaluate(cilExtBrush, toroBrush, CSG.ADDITION);
    var jarra = evaluador.evaluate(tmp, cilIntBrush, CSG.SUBTRACTION);

    this.add(jarra);
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
}

export { Taza };
