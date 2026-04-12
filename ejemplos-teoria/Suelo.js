
import * as THREE from 'three'
import { Bloque } from './Bloque.js'

class Suelo extends THREE.Object3D {
  
  constructor () {
    super();

    this.tamaSueloX = 3;
    this.tamaSueloZ = 3;
    var gapX = 0.6;
    var gapZ = 0.6;

    this.createGround();
    
    const material1 = new THREE.MeshStandardMaterial ({color: 0xFFFFFF});
    const material2  = new THREE.MeshStandardMaterial ({color: 0x7F7F7F});
    
    var n = 4;
    var unBloque;
    for (var i = 0; i < n; i++) {
      unBloque = new Bloque (material1);
      unBloque.position.x = i*gapX - gapX*(n/2-0.5);
      unBloque.position.z = -gapZ;
      this.add (unBloque);
      
      unBloque = new Bloque (material2);
      unBloque.position.x = i*gapX - gapX*(n/2-0.5);
      unBloque.position.z = gapZ;
      this.add (unBloque);
    }
  }

  createGround () {
    // El suelo es un Mesh, necesita una geometría y un material.

    // La geometría es una caja con muy poca altura
    var geometryGround = new THREE.BoxGeometry (this.tamaSueloX, 0.2,this.tamaSueloZ);

    // El material se hará con una textura de madera
    var texture = new THREE.TextureLoader().load('../imgs/wood.jpg');
    var materialGround = new THREE.MeshStandardMaterial ({map: texture});

    // Ya se puede construir el Mesh
    var ground = new THREE.Mesh (geometryGround, materialGround);

    // Todas las figuras se crean centradas en el origen.
    // El suelo lo bajamos la mitad de su altura para que el origen del mundo se quede en su lado superior
    ground.position.y = -0.1;

    // Que no se nos olvide añadirlo a la escena, que en este caso es  this
    this.add (ground);
  }
  
  update () {
    // nada
  }
}

export { Suelo }
