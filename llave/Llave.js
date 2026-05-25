import * as THREE from 'three'
import * as CSG from '../libs/three-bvh-csg.js'

class Llave extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // La GUI se crea primero porque otros métodos usan this.guiControls
    this.createGUI(gui, titleGui);

    // Materiales:
    var loader = new THREE.TextureLoader();
    var texColor = loader.load('../imgs/llave_color.jpg');
    texColor.wrapS = THREE.RepeatWrapping;
    texColor.wrapT = THREE.RepeatWrapping;
    texColor.repeat.set(2, 2);

    this.materialLlave = new THREE.MeshStandardMaterial({
        map: texColor,
        color: this.guiControls.colorLlave,
        metalness: 0.9,
        roughness: 0.2,
    });
    this.materialGema = new THREE.MeshPhysicalMaterial({
        color: this.guiControls.colorGema,
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

    this.reloj = new THREE.Clock();
    this.luzInterna = new THREE.PointLight(0xD4A843, 1.5, 1.5);
    this.luzInterna.position.set(0, -0.05, 0);
    this.add(this.luzInterna);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GUI
  // ─────────────────────────────────────────────────────────────────────────
  createGUI(gui, titleGui) {
    this.guiControls = {
      colorLlave: '#D4A843',
      colorGema: '#9AD8C1'
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
  // ─────────────────────────────────────────────────────────────────────────
  createShapeLlave() {
    var R = 0.038;
    var rHole = 0.014;
    var g = 0.020;
    var largo = 0.105;
 
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
    var margenIzq = largo * 0.5;
    var anchoDiente = largo * 0.10;
    var separacion = largo * 0.07;
    var altoDiente = g * 0.55;
 
    for (var i = 0; i < 3; i++) {
      var xIniD = xT + margenIzq + i * (anchoDiente + separacion);
      var xFinD = xIniD + anchoDiente;
      shape.lineTo(xIniD, -g / 2);
      shape.lineTo(xIniD, -g / 2 - altoDiente);
      shape.lineTo(xFinD, -g / 2 - altoDiente);
      shape.lineTo(xFinD, -g / 2);
    }
 
    // Extremo derecho y lado superior
    shape.lineTo(xDer, -g / 2);
    shape.lineTo(xDer, g / 2);
    shape.lineTo(xT, g / 2);
 
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
      depth: 0.008,   // 8 mm de grosor
      bevelEnabled: true,
      bevelThickness: 0.001,
      bevelSize: 0.001,
      bevelSegments: 2,
      curveSegments: 32
    };

    var geo = new THREE.ExtrudeGeometry(shape, options);

    // Centramos en Z para que la llave quede centrada en su propio eje
    geo.translate(0, 0, -options.depth / 2);

    return geo;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GEMA  por revolución
  // ─────────────────────────────────────────────────────────────────────────
  createGema() {
    var rGema = 0.013;
    var semialtura = 0.008;

    // Perfil de abajo hacia arriba
    var puntos = [
      new THREE.Vector2(0,          -semialtura*2),   // punta inferior
      new THREE.Vector2(rGema, -semialtura/2),  // faceta inferior
      
      new THREE.Vector2(rGema, semialtura/2),  // hombro
      new THREE.Vector2(0,            semialtura*2 )    // punta superior
    ];

    var geoGema = new THREE.LatheGeometry(puntos, 128, 0, Math.PI * 2);

    return geoGema;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LLAVE COMPLETA  (CSG)
  // ─────────────────────────────────────────────────────────────────────────
  createLlave() {

    // ── Geometrías ────────────────────────────────────────────────────────
    var geoCuerpo = this.createCuerpoLlave();
    var geoGema = this.createGema();

    // Esfera que servirá de hueco para alojar la gema
    var rHueco = 0.013;
    var geoHueco = new THREE.SphereGeometry(rHueco, 24, 24);

    // ── Posicionado de geometrías (antes de crear los Brush) ──────────────
    geoGema.rotateX(Math.PI / 2);

    // ── Brushes ───────────────────────────────────────────────────────────
    var brushCuerpo = new CSG.Brush(geoCuerpo, this.materialLlave);
    var brushHueco = new CSG.Brush(geoHueco, this.materialLlave);
    var brushGema = new CSG.Brush(geoGema, this.materialGema);

    // ── Operaciones CSG ───────────────────────────────────────────────────
    var evaluador = new CSG.Evaluator();
    var llaveConCavidad = evaluador.evaluate(brushCuerpo, brushHueco, CSG.SUBTRACTION);
    var llavaFinal = evaluador.evaluate(llaveConCavidad, brushGema, CSG.ADDITION);

    return llavaFinal;
  }

  update() {
    const tiempo = this.reloj.getElapsedTime();
    this.luzInterna.intensity = 1.2 + Math.sin(tiempo * 4) * 0.6;
  }
}

export { Llave }