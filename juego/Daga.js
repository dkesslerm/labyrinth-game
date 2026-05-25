import * as THREE from 'three'
import * as CSG from '../libs/three-bvh-csg.js'

class Daga extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    // GUI
    this.createGUI(gui, titleGui);

    // Materiales

    //HOJA
    this.materialHoja = new THREE.MeshPhysicalMaterial({
      color: '#D8E0E8',
      metalness: 0.6,
      roughness: 0.08,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      reflectivity: 1.0,
      side: THREE.DoubleSide,
      ior: 2.5
    });
 
    // GUARDA:
    this.materialGuarda = new THREE.MeshStandardMaterial({
      color: '#8A7A50',
      metalness: 0.80,
      roughness: 0.40,
      envMapIntensity: 0.8
    });
 
    // MANGO:
    this.materialMango = new THREE.MeshStandardMaterial({
      color: '#3A2A1A',
      metalness: 0.0,
      roughness: 0.85,
      envMapIntensity: 0.3
    });
 
    // CUERDA:
    this.materialCuerda = new THREE.MeshPhysicalMaterial({
      color: '#B89040',
      sheen: 1.0,
      sheenColor: '#FFD080',
      roughness: 0.6,
      metalness: 0.0,
    });

    // La hoja se hace por separado (BufferGeometry no es compatible con CSG)
    var dims = this.getDims();
    
    this.add( this.createGeoHoja(dims) );
    this.add(this.createDaga(dims));

    this.reloj = new THREE.Clock();
    this.luzInterna = new THREE.PointLight(0xC0C8D0, 1.5, 1.5);
    this.luzInterna.position.set(0, -0.05, 0);
    this.add(this.luzInterna);
    
  }

  // ── GUI ──────────────────────────────────────────────────────────────────
  createGUI(gui, titleGui) {
    this.guiControls = {
      colorHoja: '#C0C8D0',
      colorMango: '#3A2A1A',
      colorCuerda: '#C8A830',
      colorGuarda: '#8A7A50'
    };

    var folder = gui.addFolder(titleGui);
    folder.addColor(this.guiControls, 'colorHoja')
      .name('Color hoja: ')
      .onChange((v) => this.materialHoja.color.set(v));
    folder.addColor(this.guiControls, 'colorMango')
      .name('Color mango: ')
      .onChange((v) => this.materialMango.color.set(v));
    folder.addColor(this.guiControls, 'colorCuerda')
      .name('Color cuerda: ')
      .onChange((v) => this.materialCuerda.color.set(v));
    folder.addColor(this.guiControls, 'colorGuarda')
      .name('Color guarda: ')
      .onChange((v) => this.materialGuarda.color.set(v));
  }

  // ── DIMENSIONES COMPARTIDAS ──────────────────────────────────────────────
  getDims() {
    return {
      // Hoja
      hojaAlto: 0.15,
      hojaAncho: 0.035,
      hojaGrosor: 0.010,

      // Guarda
      guardaAlto: 0.012,
      guardaAncho: 0.045,
      guardaGrosor: 0.018,

      // Mango
      mangoAlto: 0.090,
      mangoAncho: 0.022,
      mangoGrosor: 0.022,

      // Pomo
      pomoRadio: 0.016,

      // Cuerda
      cuerdaRadio: 0.002,
      cuerdaVueltas: 20,
    };
  }

  // ── HOJA (geometría manual con BufferGeometry) ───────────────────────────
  // La hoja se construye como una pirámide de BASE HEXAGONAL.
  // El hexágono no es regular
  // ──────────────────────────────────────────────────────────────────────────
  createGeoHoja(dims) {
    var h = dims.hojaAlto;
    var w = dims.hojaAncho;
    var g = dims.hojaGrosor;
 
    
    var vertices = new Float32Array([
      // x       y    z
      -g/2,     0,   g/2,   // v0 lomo izq
       g/2,     0,   g/2,   // v1 lomo der
       w/2,     0,     0,   // v2 extremo der
       g/2,     0,  -g/2,   // v3 filo der
      -g/2,     0,  -g/2,   // v4 filo izq
      -w/2,     0,     0,   // v5 extremo izq
         0,     h,     0    // v6 punta
    ]);

    
    //Caras:
    var indices = [
      // Base hexagonal: 4 triángulos en abanico desde v0
      0, 2, 1,
      0, 3, 2,
      0, 4, 3,
      0, 5, 4,
      // Caras laterales: cada lado sube hasta la punta v6
      1, 0, 6,
      2, 1, 6,
      3, 2, 6,
      4, 3, 6,
      5, 4, 6,
      0, 5, 6
    ];

    var geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geo.setIndex(indices);
    geo.computeVertexNormals();

    // Se devuelve como Mesh normal: BufferGeometry no es compatible con CSG.
    // La hoja se añadirá directamente a this en createDaga.
    return new THREE.Mesh(geo, this.materialHoja);
  }

  // ── GUARDA (primitiva) ───────────────────────────────────────────────────
  // Caja plana y ancha que separa hoja de mango.
  // Se crea centrada en y = 0; luego se posicionará con translate.
  createGeoGuarda(dims) {
    var geo = new THREE.BoxGeometry(dims.guardaAncho, dims.guardaAlto, dims.guardaGrosor);
    return new THREE.Mesh(geo, this.materialGuarda);
  }

  // ── MANGO (primitiva) ────────────────────────────────────────────────────
  // Cilindro ligeramente octogonal para dar aspecto de madera trabajada.
  createGeoMango(dims) {
    var geo = new THREE.CylinderGeometry(
      dims.mangoAncho / 2,
      dims.mangoAncho / 2 * 1.1,
      dims.mangoAlto,
      8, 1
    );

    return new THREE.Mesh(geo, this.materialMango);
  }

  // ── POMO (primitiva) ─────────────────────────────────────────────────────
  // Esfera achatada en el extremo inferior del mango.
  createGeoPomo(dims) {
    var geo = new THREE.SphereGeometry(dims.pomoRadio, 12, 12);
    geo.scale(1, 0.65, 1);
    return new THREE.Mesh(geo, this.materialGuarda);
  }

  // ── CUERDA ENROLLADA (barrido) ───────────────────────────────────────────
  createCuerda(dims) {
    var rMango = dims.mangoAncho / 2;
    var rCuerda = dims.cuerdaRadio;
    var vueltas = dims.cuerdaVueltas;
    var hMango = dims.mangoAlto;

    // ── Sección de la cuerda
    var seccion = new THREE.Shape();
    seccion.absarc(0, 0, rCuerda, 0, Math.PI * 2, false);

    // ── Trayectoria
    var N      = vueltas * 24;   // 24 puntos por vuelta
    var rHelix = rMango + rCuerda * 0.5;   // la cuerda se apoya en el mango

    var yInicio = -hMango / 2 + rCuerda;
    var yFin    =  hMango / 2 - rCuerda;
    var altura  = yFin - yInicio;

    var pts = [];
    for (var i = 0; i <= N; i++) {
      var t      = (2 * Math.PI * vueltas * i) / N;
      var x      = rHelix * Math.cos(t);
      var z      = rHelix * Math.sin(t);
      var y      = yInicio + (altura * i) / N;
      pts.push(new THREE.Vector3(x, y, z));
    }

    // CatmullRomCurve3
    var helice = new THREE.CatmullRomCurve3(pts);

    // ── ExtrudeGeometry con extrudePath
    var options = {
      steps: N,
      curveSegments: 8,
      extrudePath: helice
    };

    var geo = new THREE.ExtrudeGeometry(seccion, options);

    return new THREE.Mesh(geo, this.materialCuerda);
  }

  // ── ENSAMBLAJE COMPLETO CON CSG ──────────────────────────────────────────
  createDaga(dims) {
    var yGuarda = -dims.guardaAlto / 2;
    var yMango  = yGuarda - dims.guardaAlto / 2 - dims.mangoAlto / 2;
    var yPomo   = yMango  - dims.mangoAlto  / 2 - dims.pomoRadio * 0.65;

    var meshGuarda = this.createGeoGuarda(dims);
    meshGuarda.geometry.translate(0, yGuarda, 0);

    var meshMango = this.createGeoMango(dims);
    meshMango.geometry.translate(0, yMango, 0);

    var meshPomo = this.createGeoPomo(dims);
    meshPomo.geometry.translate(0, yPomo, 0);

    var meshCuerda = this.createCuerda(dims);
    meshCuerda.geometry.translate(0, yMango, 0);

    var brushGuarda = new CSG.Brush(meshGuarda.geometry, this.materialGuarda);
    var brushMango = new CSG.Brush(meshMango.geometry, this.materialMango);
    var brushPomo = new CSG.Brush(meshPomo.geometry, this.materialGuarda);
    var brushCuerda = new CSG.Brush(meshCuerda.geometry, this.materialCuerda);

    var evaluador = new CSG.Evaluator();
    var tmp1 = evaluador.evaluate(brushGuarda, brushMango, CSG.ADDITION);
    var tmp2 = evaluador.evaluate(tmp1, brushPomo, CSG.ADDITION);
    return evaluador.evaluate(tmp2, brushCuerda, CSG.ADDITION);
  }

  update() {
    const tiempo = this.reloj.getElapsedTime();
    this.luzInterna.intensity = 1.2 + Math.sin(tiempo * 4) * 0.6;
  }
}

export { Daga }