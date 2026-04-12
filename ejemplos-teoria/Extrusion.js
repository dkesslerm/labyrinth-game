import * as THREE from "three";
// import * as CSG from "../libs/three-bvh-csg.js";

class Extrusion extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // Se crea la parte de la interfaz que corresponde a la Taza
    // Se crea primero porque otros métodos usan las variables que se definen para la interfaz
    this.material = new THREE.MeshStandardMaterial({ color: 0xcf0000 });
    
    var shape = new THREE.Shape ( ) ; shape . moveTo (0.1 ,0.1) ;
    shape . lineTo (0.2 ,0.1) ; shape . quadraticCurveTo (0.3 ,0.1 , 0.3 , 0.2) ;
    var options1 = { depth : 0.8 , steps : 2 , bevelEnabled : false } ;
    var geometry1 = new THREE. ExtrudeGeometry ( shape , options1 ) ;
    var options2 = { depth : 0.8 , steps : 2 , curveSegments : 20,
    bevelThickness : 0.1 , bevelSize : 0.1 , bevelSegments : 20 } ;
    var geometry2 = new THREE.ExtrudeGeometry(shape, options2);
    
    var mesh = new THREE.Mesh(geometry2, this.material);
    this.add(mesh);
  }

  update() {
    // No hay nada que actualizar ya que la apertura de la grapadora se ha actualizado desde la interfaz
  }
}

export { Extrusion };
