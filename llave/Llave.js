import * as THREE from 'three'
import * as CSG from '../libs/three-bvh-csg.js'

class Llave extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // La GUI se crea primero porque otros métodos usan this.guiControls
    this.createGUI(gui, titleGui);

    // Materiales: uno para el cuerpo de la llave y otro para la gema
    this.materialLlave = new THREE.MeshStandardMaterial({ color: this.guiControls.colorLlave });
    this.materialGema  = new THREE.MeshPhysicalMaterial({
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

    // Se construye la llave completa y se añade a this
    var llave = this.createLlave();
    this.add(llave);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GUI
  // ─────────────────────────────────────────────────────────────────────────
  createGUI(gui, titleGui) {
    this.guiControls = {
      colorLlave : '#D4A843',   // dorado
      colorGema  : '#E88FA0'    // rosa
    };

    var folder = gui.addFolder(titleGui);

    folder.addColor(this.guiControls, 'colorLlave')
      .name('Color llave: ')
      .onChange((v) => this.materialLlave.color.set(v));

    folder.addColor(this.guiControls, 'colorGema')
      .name('Color gema: ')
      .onChange((v) => this.materialGema.color.set(v));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SHAPE DE LA LLAVE  (plano XY, se extruirá en Z)
  //
  // Descripción del contorno (unidades en metros, escala ~15 cm de largo):
  //
  //   · Cabeza circular: círculo de radio R centrado en el origen
  //   · Agujero central de la cabeza: círculo interior (hole)
  //   · Mango: rectángulo que sale a la derecha de la cabeza
  //   · Dientes: tres muescas recortadas en el mango (holes rectangulares)
  //
  // El Shape se define en el plano XY con el centro de la cabeza en (0,0).
  // ─────────────────────────────────────────────────────────────────────────
  createShapeLlave() {
    var R      = 0.038;   // radio exterior de la cabeza
    var rHole  = 0.014;   // radio del agujero central
    var g      = 0.020;   // grosor del mango
    var largo  = 0.105;   // longitud del mango
 
    // Punto de tangencia mango-cabeza
    var xT = Math.sqrt(R * R - (g / 2) * (g / 2));
 
    // Extremo derecho del mango
    var xDer = xT + largo;
 
    // Ángulos del punto de tangencia
    var aSup = Math.atan2( g / 2, xT);
    var aInf = Math.atan2(-g / 2, xT);
 
    var shape = new THREE.Shape();
 
    // Punto inicial: unión superior mango-cabeza
    shape.moveTo(xT, g / 2);
 
    // Arco que rodea la cabeza (antihorario, por la izquierda)
    shape.absarc(0, 0, R, aSup, aInf + Math.PI * 2, false);
 
    // Estamos en (xT, -g/2). Dibujamos el mango con 3 dientes hacia abajo.
    var margenIzq   = largo * 0.5;
    var anchoDiente = largo * 0.10;
    var separacion  = largo * 0.07;
    var altoDiente  = g * 0.55;
 
    for (var i = 0; i < 3; i++) {
      var xIniD = xT + margenIzq + i * (anchoDiente + separacion);
      var xFinD = xIniD + anchoDiente;
      shape.lineTo(xIniD, -g / 2);
      shape.lineTo(xIniD, -g / 2 - altoDiente);
      shape.lineTo(xFinD, -g / 2 - altoDiente);
      shape.lineTo(xFinD, -g / 2);
    }
 
    // Extremo derecho y lado superior
    shape.lineTo(xDer,  -g / 2);
    shape.lineTo(xDer,   g / 2);
    shape.lineTo(xT,     g / 2);
 
    // Agujero central (horario)
    var hole = new THREE.Path();
    hole.absarc(0, 0, rHole, 0, Math.PI * 2, true);
    shape.holes.push(hole);
 
    return shape;
  }


  // ─────────────────────────────────────────────────────────────────────────
  // CUERPO DE LA LLAVE  por extrusión
  // ─────────────────────────────────────────────────────────────────────────
  createCuerpoLlave() {
    var shape = this.createShapeLlave();

    // Opciones de extrusión: sin bisel para que quede limpio
    var options = {
      depth          : 0.008,   // 8 mm de grosor
      bevelEnabled   : true,
      bevelThickness : 0.001,
      bevelSize      : 0.001,
      bevelSegments  : 2,
      curveSegments  : 32       // buena resolución para el círculo
    };

    var geo = new THREE.ExtrudeGeometry(shape, options);

    // Centramos en Z para que la llave quede centrada en su propio eje
    geo.translate(0, 0, -options.depth / 2);

    return geo;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GEMA  por revolución (LatheGeometry)
  //
  // Perfil: una piedra facetada vista de lado.
  // Los puntos se definen de ABAJO HACIA ARRIBA
  // y en el lado positivo del eje X (distancia al eje de revolución = Y).
  //
  // ─────────────────────────────────────────────────────────────────────────
  createGema() {
    var rGema = 0.013;   // radio máximo de la gema
    var semialtura = 0.008;   // la gema es más alta que ancha

    // Perfil de abajo hacia arriba (Vector2: x = distancia al eje, y = altura)
    var puntos = [
      new THREE.Vector2(0,          -semialtura*2),   // punta inferior
      new THREE.Vector2(rGema, -semialtura/2),  // faceta inferior
      
      new THREE.Vector2(rGema, semialtura/2),  // hombro
      new THREE.Vector2(0,            semialtura*2 )    // punta superior
    ];

    // LatheGeometry: perfil, segmentos de revolución, ángulo inicio, ángulo total
    var geoGema = new THREE.LatheGeometry(puntos, 8, 0, Math.PI * 2);

    return geoGema;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LLAVE COMPLETA  (CSG: incrustar la gema en el centro de la cabeza)
  //
  // Operaciones:
  //   1. cuerpoLlave − hueco  →  llave con cavidad  (SUBTRACTION)
  //   2. llaveConCavidad ∪ gema  →  resultado final  (ADDITION)
  //
  // El "hueco" es una esfera ligeramente más grande que la gema para
  // que encaje embutida (la gema sobresale un poco por delante y por detrás).
  // ─────────────────────────────────────────────────────────────────────────
  createLlave() {
    var profLlave = 0.013;   // debe coincidir con depth de ExtrudeGeometry

    // ── Geometrías ────────────────────────────────────────────────────────
    var geoCuerpo = this.createCuerpoLlave();
    var geoGema   = this.createGema();

    // Esfera que servirá de hueco para alojar la gema
    var rHueco  = 0.013;   // ligeramente mayor que el radio máximo de la gema
    var geoHueco = new THREE.SphereGeometry(rHueco, 24, 24);

    // ── Posicionado de geometrías (antes de crear los Brush) ──────────────
    // El PDF insiste en que las transformaciones sobre geometría se aplican
    // en el ORDEN EN QUE SE ESCRIBEN y antes de construir el Mesh/Brush.

    // La gema: centrada en el origen del plano de la cabeza (0, 0),
    // y centrada en Z respecto al grosor de la llave.
    // La LatheGeometry ya está centrada en XZ; solo hay que centrarla en Y.
    // El radio de revolución es Y, así que la rotamos 90° en X para
    // que el eje de revolución quede alineado con Z (perpendicular a la llave).
    geoGema.rotateX(Math.PI / 2);
    // Ahora el eje de simetría de la gema apunta en Z, igual que la extrusión.
    // La dejamos centrada en Z=0 (ya lo está tras la rotación).

    // El hueco: mismo centro que la gema
    // geoHueco ya está centrado en el origen, no necesita transformación.

    // ── Brushes ───────────────────────────────────────────────────────────
    var brushCuerpo = new CSG.Brush(geoCuerpo, this.materialLlave);
    var brushHueco  = new CSG.Brush(geoHueco,  this.materialLlave);
    var brushGema   = new CSG.Brush(geoGema,   this.materialGema);

    // ── Operaciones CSG ───────────────────────────────────────────────────
    var evaluador = new CSG.Evaluator();

    // Paso 1: hacer la cavidad en el cuerpo de la llave
    var llaveConCavidad = evaluador.evaluate(brushCuerpo, brushHueco, CSG.SUBTRACTION);

    // Paso 2: unir la llave con cavidad y la gema
    var llavaFinal = evaluador.evaluate(llaveConCavidad, brushGema, CSG.ADDITION);

    return llavaFinal;
  }

  update() {
    // Sin animación propia; los cambios se gestionan desde la GUI
  }
}

export { Llave }