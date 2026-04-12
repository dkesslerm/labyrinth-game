
import * as THREE from 'three'

class Bloque extends THREE.Object3D {
    
  // Usamos una variable de clase para la única geometría 
  // que van a compartir todos los peones
  static geometria = null;
  
  constructor(material) {
    super();
    
    if (Bloque.geometria == null)
        Bloque.geometria = this.crearGeometria ();
    
    const meshBloqueNuevo = new THREE.Mesh (Bloque.geometria, material);
    
    this.add (meshBloqueNuevo);
  }
  
  crearGeometria () {
    const geoBloque = new THREE.BoxGeometry (0.5, 2, 0.5);
    // Queremos que su origen de coordenadas local esté en el centro de la base
    // Como el cono se ha creado con el origen centrado, 
    // subimos el cono la mitad de su altura
    geoBloque.translate (0, 1, 0);
    return geoBloque;
  }
  
  update () {
    // No hay nada que actualizar ya que no hay nodos que cambien continuamente entre frames
  }
}

export { Bloque }
