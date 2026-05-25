import * as THREE from 'three'
import * as CSG from '../libs/three-bvh-csg.js'

// ─────────────────────────────────────────────────────────────────────────────
// Puerta del laberinto
// Piezas: Marco, hoja, anilla/pomo
// Animación:
//   · Temblor previo a la apertura
//   · Apertura: rotación en Y alrededor del pilar izquierdo
// ─────────────────────────────────────────────────────────────────────────────

class Puerta extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    this.createGUI(gui, titleGui);
    
    var loader = new THREE.TextureLoader();

    var texColor = loader.load('../imgs/puerta_color.jpg');
    texColor.wrapS = THREE.RepeatWrapping;
    texColor.wrapT = THREE.RepeatWrapping;
    texColor.repeat.set(2, 2);

    var texNormal = loader.load('../imgs/puerta_normal.jpg');
    texNormal.wrapS = THREE.RepeatWrapping;
    texNormal.wrapT = THREE.RepeatWrapping;
    texNormal.repeat.set(2, 2);
    
    // ── Materiales ──────────────────────────────────────────────────────────

    // Piedra antigua:
    this.matPiedra = new THREE.MeshStandardMaterial({
      color: '#7A7060',
      metalness: 0.0,
      roughness: 0.95,
    });

    // Madera oscura:
    this.matMadera = new THREE.MeshStandardMaterial({
      map: texColor,
      normalMap: texNormal,
      color: '#3D2010',
      metalness: 0.0,
      roughness: 0.85,
    });

    // Metal envejecido:
    this.matMetal = new THREE.MeshStandardMaterial({
      color: '#4A3828',
      metalness: 0.7,
      roughness: 0.6,
    });

    // Metal dorado:
    this.matOro = new THREE.MeshStandardMaterial({
      color: '#B8860B',
      metalness: 0.9,
      roughness: 0.2,
    });
    
    // ── Dimensiones ─────────────────────────────────────────────────────────
    this.dims = this.getDims();

    // ── Construcción ────────────────────────────────────────────────────────
    this.add(this.createMarco());

    // La hoja cuelga de un nodo pivote que está en el borde izquierdo
    this.pivote = new THREE.Object3D();
    var dims = this.dims;
    // El pivote se sitúa en el borde izquierdo de la hoja
    this.pivote.position.set(-dims.hojaMitadAncho, 0, 0);
    this.pivote.add(this.createHoja());
    this.add(this.pivote);

    // La anilla/pomo cuelga también del pivote para moverse con la puerta
    this.pivote.add(this.createAnilla());

    // ── Estado de animación ─────────────────────────────────────────────────
    this.estado = 'cerrada';
    this.temblor = 0;
    this.tiempoTemblor = 0;
    this.duracionTemblor = 1.0;
    this.anguloActual = 0;
    this.anguloObjetivo = -Math.PI / 2;
    this.velocidadApertura = 2.2;
    
    this.reloj = new THREE.Clock();
  }

  // ── GUI ────────────────────────────────────────────────────────────────────
  createGUI(gui, titleGui) {
    this.guiControls = {
      abrirPuerta: () => this.iniciarApertura()
    };
    if (gui) {
      var folder = gui.addFolder(titleGui);
      folder.add(this.guiControls, 'abrirPuerta').name('Abrir puerta');
    }
  }

  // ── DIMENSIONES ────────────────────────────────────────────────────────────
  getDims() {
    return {
      // Hueco de paso
      huechoAncho: 1.4,
      huecoAlto: 2.8,

      // Hoja de la puerta
      hojaAncho: 1.4,
      hojaAlto: 2.8,
      hojaGrosor: 0.08,
      hojaMitadAncho: 0.7,

      // Pilares
      pilarAncho: 0.35,
      pilarAlto: 3.2,    // más alto que el hueco
      pilarGrosor: 0.40,

      // Dintel
      dintelAncho: 2.1,
      dintelAlto: 0.40,
      dintelGrosor: 0.40,

      // Tablones de la hoja
      tablonesNum: 5,
      tablonGrosorRel: 0.02,

      // Refuerzo horizontal
      refuerzoAlto: 0.06,
      refuerzoGrosor: 0.05,

      // Anilla
      anillaRadio: 0.06,
      anillaTubo: 0.018,
      pomoRadio: 0.045,
    };
  }

  // ── MARCO (pilares + dintel) ───────────────────────────────────────────────
  createMarco() {
    var marco = new THREE.Object3D();
    var d = this.dims;
 
    marco.add(this.createPilar(-d.huechoAncho / 2 - d.pilarAncho / 2));
    marco.add(this.createPilar( d.huechoAncho / 2 + d.pilarAncho / 2));
    marco.add(this.createDintel());
 
    return marco;
  }
 
  // Pilar: cilindro de piedra
  createPilar(xPos) {
    var d = this.dims;
    var geo = new THREE.CylinderGeometry(
      d.pilarAncho / 2,       // radio superior
      d.pilarAncho / 2 * 1.1, // radio inferior
      d.pilarAlto,
      12                      // 12 segmentos 
    );
    // CylinderGeometry se crea centrado en y=0, lo subimos para que
    // arranque desde el suelo
    geo.translate(xPos, d.pilarAlto / 2, 0);
    return new THREE.Mesh(geo, this.matPiedra);
  }
 
  // Dintel: caja plana que cruza por encima del hueco
  createDintel() {
    var d = this.dims;
    var geo = new THREE.BoxGeometry(d.dintelAncho, d.dintelAlto, d.dintelGrosor);
    // Se coloca encima del hueco
    geo.translate(0, d.huecoAlto + d.dintelAlto / 2, 0);
    return new THREE.Mesh(geo, this.matPiedra);
  }

  // ── HOJA DE LA PUERTA ──────────────────────────────────────────────────────
  createHoja() {
    var d = this.dims;
    var contenedor = new THREE.Object3D();

    // Tablón base
    var geoBase = new THREE.BoxGeometry(d.hojaAncho, d.hojaAlto, d.hojaGrosor);

    // Ranuras verticales entre tablones (se restarán con CSG)
    var evaluador = new CSG.Evaluator();
    var brushHoja = new CSG.Brush(geoBase, this.matMadera);

    var anchoRanura = 0.012;
    var numRanuras = d.tablonesNum - 1;
    var espaciado = d.hojaAncho / d.tablonesNum;

    for (var i = 1; i < d.tablonesNum; i++) {
      var xRanura = -d.hojaAncho / 2 + i * espaciado;
      var geoRanura = new THREE.BoxGeometry(anchoRanura, d.hojaAlto * 1.01, d.hojaGrosor * 1.1);
      geoRanura.translate(xRanura, 0, 0);
      var brushRanura = new CSG.Brush(geoRanura, this.matMadera);
      brushHoja = evaluador.evaluate(brushHoja, brushRanura, CSG.SUBTRACTION);
    }

    contenedor.add(brushHoja);

    // Refuerzos horizontales de hierro (3 barras: arriba, centro, abajo)
    var yRefuerzos = [
      d.hojaAlto * 0.38,
      0,
      -d.hojaAlto * 0.38
    ];

    yRefuerzos.forEach((y) => {
      var geoRef = new THREE.BoxGeometry(
        d.hojaAncho * 0.96,
        d.refuerzoAlto,
        d.refuerzoGrosor
      );
      geoRef.translate(0, y, d.hojaGrosor / 2 + d.refuerzoGrosor / 2 - 0.005);
      var mesh = new THREE.Mesh(geoRef, this.matMetal);
      contenedor.add(mesh);

      // Clavos en los extremos de cada barra (esferas pequeñas)
      [-d.hojaAncho * 0.44, d.hojaAncho * 0.44].forEach((xClavo) => {
        var geoClavo = new THREE.SphereGeometry(0.018, 8, 8);
        geoClavo.translate(xClavo, y, d.hojaGrosor / 2 + d.refuerzoGrosor - 0.005);
        contenedor.add(new THREE.Mesh(geoClavo, this.matMetal));
      });
    });

    // La hoja se posiciona para que su borde izquierdo esté en x = 0
    contenedor.position.set(d.hojaMitadAncho, d.hojaAlto / 2, 0);

    return contenedor;
  }

  // ── ANILLA / POMO ──────────────────────────────────────────────────────────
  //
  // Un toro + una esfera de base.
  // Se sitúa en el lado derecho de la hoja, a la altura del pecho.
  //
  createAnilla() {
    var d = this.dims;
    var contenedor = new THREE.Object3D();

    // Base del pomo: esfera
    var geoPomo = new THREE.SphereGeometry(d.pomoRadio, 16, 16);
    geoPomo.scale(1, 0.7, 0.5);
    var meshPomo = new THREE.Mesh(geoPomo, this.matOro);

    // Anilla: toro colgando de la base
    var geoAnilla = new THREE.TorusGeometry(
      d.anillaRadio,
      d.anillaTubo,
      12, 24
    );
    // El toro por defecto está en el plano XY, lo dejamos así
    // para que la anilla cuelgue en vertical
    var meshAnilla = new THREE.Mesh(geoAnilla, this.matOro);
    meshAnilla.position.y = -d.anillaRadio;

    contenedor.add(meshPomo);
    contenedor.add(meshAnilla);

    // Posición: lado derecho de la hoja, altura del pecho
    contenedor.position.set(
      d.hojaMitadAncho * 1.6,
      d.hojaAlto * 0.65,
      d.hojaGrosor / 2 + d.pomoRadio * 0.5
    );

    // Guardamos referencia al pomo para la detección de clic
    this.pomo = contenedor;

    return contenedor;
  }

  // ── APERTURA ───────────────────────────────────────────────────────────────
  // La apertura tiene dos fases:
  //   1. Temblor: la puerta vibra ligeramente
  //   2. Apertura: rotación suave del pivote en Y hasta 90°
  iniciarApertura() {
    if (this.estado === 'cerrada') {
      this.estado = 'temblando';
      this.temblor = 0;
      this.tiempoTemblor = 0;
      this.reloj.getDelta();
    }
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update() {
    const dt = Math.min(this.reloj.getDelta(), 0.05);
  
    switch (this.estado) {
  
      case 'temblando':
        this.tiempoTemblor += dt;
  
        // Vibración rápida en Z durante duracionTemblor segundos
        this.pivote.rotation.z = Math.sin(this.tiempoTemblor * 40.0) * 0.03;
  
        if (this.tiempoTemblor > this.duracionTemblor) {
          this.pivote.rotation.z = 0;
          this.estado = 'abriendo';
        }
        break;
  
      case 'abriendo':
        var diferencia = this.anguloObjetivo - this.anguloActual;
  
        if (Math.abs(diferencia) > 0.001) {
          const paso = this.velocidadApertura * dt;
  
          if (Math.abs(diferencia) <= paso) {
            this.anguloActual = this.anguloObjetivo;
          } else {
            this.anguloActual += Math.sign(diferencia) * paso;
          }
  
          this.pivote.rotation.y = this.anguloActual;
        } else {
          this.anguloActual = this.anguloObjetivo;
          this.pivote.rotation.y = this.anguloActual;
          this.estado = 'abierta';
        }
        break;
  
      case 'abierta':
      case 'cerrada':
        break;
    }
  }
}

export { Puerta }