import * as THREE from 'three';

class Escarabajo extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    this.matOro = new THREE.MeshStandardMaterial({
      color: 0xD4A017,
      metalness: 0.90,
      roughness: 0.22,
    });

    this.matLapis = new THREE.MeshStandardMaterial({
      color: 0x028027,
      metalness: 0.55,
      roughness: 0.35,
      side: THREE.DoubleSide,
    });

    this.matPata = new THREE.MeshStandardMaterial({
      color: 0xA97710,
      metalness: 0.78,
      roughness: 0.32,
    });

    this.matColmillo = new THREE.MeshStandardMaterial({
      color: 0xF1E5C8,
      metalness: 0.0,
      roughness: 0.65,
    });
    
    this.pivoteColmilloIzq = null;
    this.pivoteColmilloDer = null;
    this.legs = [];

    this.reloj = new THREE.Clock();
    this.t = 0;
    this.animaciones = true;

    this.createGUI(gui, titleGui);
    this.add(this.createEscarabajo());
  }

  createGUI(gui, titleGui) {
    this.guiControls = {
      colorOro: '#D4A017',
      colorLapis: '#028027',
      velMarcha: 2.5,
      ampColmillo: 0.3,
      velAlas: 0.8,
      ampAlas: 0.9,
      animaciones: true,
    };

    const folder = gui.addFolder(titleGui);
    folder.addColor(this.guiControls, 'colorOro')
      .name('Color dorado: ')
      .onChange((v) => this.matOro.color.set(v));

    folder.addColor(this.guiControls, 'colorLapis')
      .name('Color lapislázuli: ')
      .onChange((v) => this.matLapis.color.set(v));
    
    folder.add(this.guiControls, 'velMarcha', 0.1, 4.0)
      .name('Velocidad patas: ');

    folder.add(this.guiControls, 'ampColmillo', 0.0, 0.8)
      .name('Apertura colmillos: ');

    folder.add(this.guiControls, 'velAlas', 0.1, 3.0)
      .name('Velocidad alas: ');

    folder.add(this.guiControls, 'ampAlas', 0.0, 1.2)
      .name('Apertura alas: ');

    folder.add(this.guiControls, 'animaciones')
      .name('Animaciones activadas')
      .onChange((v) => { this.animaciones = v; });
  }

  getDims() {
    return {
      cuerpoRX: 0.13,
      cuerpoRY: 0.072,
      cuerpoRZ: 0.18,

      pronotoRX: 0.088,
      pronotoRY: 0.046,
      pronotoRZ: 0.060,

      cabezaRX: 0.056,
      cabezaRY: 0.040,
      cabezaRZ: 0.050,

      ojoRX: 0.010,
      ojoRY: 0.006,
      ojoRZ: 0.004,

      colmilloLargo: 0.048,
      colmilloRadio: 0.006,

      elitroLargo: 0.17,
      elitroAncho: 0.118,
      elitroAlto: 0.05,
      elitroLift: 0.03,

      coxaLargo: 0.028,
      coxaRadio: 0.008,
      femurLargo: 0.052,
      femurRadio: 0.007,
      tibiaLargo: 0.078,
      tibiaRadio: 0.0055,
    };
  }

  createScaledSphere(rx, ry, rz, wSeg = 24, hSeg = 16) {
    const geo = new THREE.SphereGeometry(1, wSeg, hSeg);
    geo.scale(rx, ry, rz);
    return geo;
  }

  createCylinderBetween(p0, p1, rTop, rBottom, material, radialSegments = 8) {
    const dir = new THREE.Vector3().subVectors(p1, p0);
    const len = dir.length();
    const geo = new THREE.CylinderGeometry(rTop, rBottom, len, radialSegments);
    const mesh = new THREE.Mesh(geo, material);

    const mid = new THREE.Vector3().addVectors(p0, p1).multiplyScalar(0.5);
    mesh.position.copy(mid);
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir.clone().normalize()
    );

    return mesh;
  }

  createElitroMesh(d, lado) {
    const pivoteAla = new THREE.Object3D();

    const elitroGeo = new THREE.SphereGeometry(1, 128, 128, 0, Math.PI / 2 - 0.015);
    
    elitroGeo.rotateX(-Math.PI / 2);
  
    const outer = new THREE.Mesh(elitroGeo, this.matLapis);
  
    // Importante:
    // No escalamos el pivote con scale.x = -1.
    // Escalamos directamente el mesh para evitar ejes raros al animar.
    outer.scale.set(
      lado * d.elitroAncho,
      d.elitroAlto,
      d.elitroLargo
    );
  
    // Posición cerrada que ya estabas usando para los élitros.
    const posCerrada = new THREE.Vector3(
      -0.001,
      d.elitroLift,
      -0.008
    );
  
    // Punto fijo de giro: detrás del cuello, donde empiezan las alas.
    // Este punto está en coordenadas locales del cuerpo.
    const puntoFijo = new THREE.Vector3(
      lado * d.cuerpoRX * 0.075,
      d.cuerpoRY * 0.58,
      d.cuerpoRZ * 0.48
    );
  
    // El pivote se coloca en el punto fijo.
    pivoteAla.position.copy(puntoFijo);
  
    // El ala se coloca relativa al pivote.
    // Así, al rotar pivoteAla, el punto fijo no se mueve.
    outer.position.copy(posCerrada).sub(puntoFijo);
  
    pivoteAla.add(outer);
  
    return pivoteAla;
  }

  createCuerpo(d) {
    const grupo = new THREE.Group();
  
    const cuerpo = new THREE.Mesh(
      this.createScaledSphere(d.cuerpoRX, d.cuerpoRY, d.cuerpoRZ, 40, 28),
      this.matOro
    );
    grupo.add(cuerpo);
  
    this.pivoteAlaIzq = this.createElitroMesh(d, -1);
    this.pivoteAlaDer = this.createElitroMesh(d, 1);
  
    grupo.add(this.pivoteAlaIzq);
    grupo.add(this.pivoteAlaDer);
  
    return grupo;
  }

  createOjo(d, lado) {
    const grupo = new THREE.Group();
  
    const baseOjo = d.cabezaRX * 0.165;
    const largoOjo = d.cabezaRZ * 0.185;
  
    const x = lado * d.cabezaRX * 0.48;
  
    const z = d.cabezaRZ * 0.58;
  
    const val = 1.0 -
      (x * x) / (d.cabezaRX * d.cabezaRX) -
      (z * z) / (d.cabezaRZ * d.cabezaRZ);
  
    const ySuperficie = d.cabezaRY * Math.sqrt(Math.max(0.0, val));
  
    const offsetExterior = 0.0015;
  
    grupo.position.set(
      x,
      ySuperficie + offsetExterior,
      z
    );
  
    const normalCabeza = new THREE.Vector3(
      x / (d.cabezaRX * d.cabezaRX),
      ySuperficie / (d.cabezaRY * d.cabezaRY),
      z / (d.cabezaRZ * d.cabezaRZ)
    ).normalize();
  
    const dirFrontal = new THREE.Vector3(lado * 0.38, 0.10, 1.0).normalize();
  
    const dir = normalCabeza.clone().lerp(dirFrontal, 0.32).normalize();
  
    const montaje = new THREE.Object3D();
    montaje.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 1, 0),
      dir
    );
  
    // Pirámide / gema.
    const geoPir = new THREE.ConeGeometry(baseOjo, largoOjo, 4, 1);
    geoPir.rotateY(Math.PI / 4);
  
    const ojo = new THREE.Mesh(geoPir, this.matLapis);
    ojo.position.y = largoOjo * 0.5;
  
    const geoSurco = new THREE.TorusGeometry(
      baseOjo * 1.08,
      baseOjo * 0.12,
      6,
      8
    );
  
    geoSurco.rotateX(Math.PI / 2);
    geoSurco.scale(1.0, 0.78, 1.0);
  
    const surco = new THREE.Mesh(geoSurco, this.matPata);
  
    // Un poco hundido respecto a la pirámide para que parezca incrustado.
    surco.position.y = -0.0004;
  
    montaje.add(surco);
    montaje.add(ojo);
    grupo.add(montaje);
  
    return grupo;
  }

  createCabeza(d) {
    const grupo = new THREE.Group();
  
    const cabeza = new THREE.Mesh(
      this.createScaledSphere(d.cabezaRX, d.cabezaRY, d.cabezaRZ, 28, 20),
      this.matOro
    );
    grupo.add(cabeza);
  
    // Ojos nuevos
    grupo.add(this.createOjo(d, -1));
    grupo.add(this.createOjo(d, 1));
  
    // Colmillos
    const zBase = d.cabezaRZ * 0.72;
    const yBase = -d.cabezaRY * 0.18;
    const xSep = d.cabezaRX * 0.26;
  
    [-1, 1].forEach((lado) => {
      const pivote = new THREE.Object3D();
      pivote.position.set(lado * xSep, yBase, zBase);
  
      const L = d.colmilloLargo;
      const p0 = new THREE.Vector3(0, 0, 0);
      const p1 = new THREE.Vector3(lado * L * 0.18, -L * 0.12, L * 0.42);
      const p2 = new THREE.Vector3(lado * L * 0.06, -L * 0.58, L * 0.72);
      const curva = new THREE.QuadraticBezierCurve3(p0, p1, p2);
  
      const geoTubo = new THREE.TubeGeometry(curva, 128, d.colmilloRadio, 128, false);
      pivote.add(new THREE.Mesh(geoTubo, this.matColmillo));
  
      const tangente = curva.getTangent(1).normalize();
      const altoPunta = L * 0.22;
  
      const geoCono = new THREE.ConeGeometry(d.colmilloRadio, altoPunta, 128);
      const cono = new THREE.Mesh(geoCono, this.matColmillo);
  
      cono.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tangente);
      cono.position.copy(p2).addScaledVector(tangente, altoPunta * 0.5);
  
      pivote.add(cono);
      grupo.add(pivote);
  
      if (lado === -1) this.pivoteColmilloIzq = pivote;
      else this.pivoteColmilloDer = pivote;
    });
  
    return grupo;
  }

  createPata(d, lado, tipo) {
    const pivoteCadera = new THREE.Object3D();

    const zBias = tipo === 'delantera' ? 0.018 : (tipo === 'trasera' ? -0.018 : 0.0);

    const pCoxa = new THREE.Vector3(lado * d.coxaLargo, -0.004, zBias * 0.25);
    pivoteCadera.add(this.createCylinderBetween(
      new THREE.Vector3(0, 0, 0), pCoxa,
      d.coxaRadio * 0.9, d.coxaRadio,
      this.matPata
    ));

    const pFemur = new THREE.Vector3(
      lado * (d.coxaLargo + d.femurLargo),
      -d.femurLargo * 0.30,
      zBias
    );
    pivoteCadera.add(this.createCylinderBetween(
      pCoxa, pFemur,
      d.femurRadio * 0.88, d.femurRadio,
      this.matPata
    ));

    const pivoteRodilla = new THREE.Object3D();
    pivoteRodilla.position.copy(pFemur);
    pivoteRodilla.add(new THREE.Mesh(
      new THREE.SphereGeometry(d.femurRadio * 1.15, 10, 8),
      this.matOro
    ));

    const pTibia = new THREE.Vector3(
      lado * d.tibiaLargo * 0.52,
      -d.tibiaLargo * 0.88,
      zBias * 0.55
    );
    pivoteRodilla.add(this.createCylinderBetween(
      new THREE.Vector3(0, 0, 0), pTibia,
      d.tibiaRadio * 0.50, d.tibiaRadio,
      this.matPata
    ));

    pivoteCadera.add(pivoteRodilla);

    return { pivoteCadera, pivoteRodilla };
  }

  createEscarabajo() {
    const d = this.getDims();
    const grupo = new THREE.Group();

    this.legs = [];
    this.pivoteColmilloIzq = null;
    this.pivoteColmilloDer = null;
    this.pivoteAlaIzq = null;
    this.pivoteAlaDer = null;

    grupo.add(this.createCuerpo(d));

    const cabeza = this.createCabeza(d);
    cabeza.position.set(0, d.cuerpoRY * 0.03, d.cuerpoRZ + d.cabezaRZ * 0.22);
    grupo.add(cabeza);

    const patasConfig = [
      { tipo: 'delantera', z: d.cuerpoRZ * 0.46, yaw: 0.42 },
      { tipo: 'central',   z: 0.0,                yaw: 0.00 },
      { tipo: 'trasera',   z: -d.cuerpoRZ * 0.44, yaw: -0.42 },
    ];

    patasConfig.forEach((cfg) => {
      [-1, 1].forEach((lado) => {
        const { pivoteCadera, pivoteRodilla } = this.createPata(d, lado, cfg.tipo);

        const z = cfg.z;
        const xSurface = d.cuerpoRX * Math.sqrt(
          Math.max(0.0, 1.0 - (z * z) / (d.cuerpoRZ * d.cuerpoRZ))
        ) * 0.96;

        pivoteCadera.position.set(lado * xSurface, -d.cuerpoRY * 0.04, z);

        const baseSplay = lado * 0.38;
        const baseYaw = (lado == -1) ? cfg.yaw : -cfg.yaw;
        const baseKnee = lado * 0.34;

        pivoteCadera.rotation.z = baseSplay;
        pivoteCadera.rotation.y = baseYaw;
        pivoteRodilla.rotation.z = baseKnee;

        grupo.add(pivoteCadera);

        this.legs.push({
          pivoteCadera,
          pivoteRodilla,
          lado,
          tipo: cfg.tipo,
          baseSplay,
          baseYaw,
          baseKnee,
        });
      });
    });

    return grupo;
  }

  update() {
    if (!this.animaciones) return;

    const dt = this.reloj.getDelta();
    this.t += dt;

    const t = this.t;
    const vel = this.guiControls.velMarcha;
    const fases = [Math.PI, 0, 0, Math.PI, Math.PI, 0];

    this.legs.forEach((leg, idx) => {
      const fase = fases[idx] || 0;
      const paso = Math.sin(t * vel * 4.0 + fase);
      const recoger = Math.max(0, Math.sin(t * vel * 4.0 + fase + Math.PI / 3));

      // Movimiento principal: adelante / atrás
      leg.pivoteCadera.rotation.y = leg.baseYaw + paso * 0.2;

      // Pequeña elevación lateral
      leg.pivoteCadera.rotation.z = leg.baseSplay + recoger * leg.lado * 0.08;

      // Rodilla
      leg.pivoteRodilla.rotation.z = leg.baseKnee + recoger * leg.lado * 0.26;
    });

    const amp = this.guiControls.ampColmillo;
    const angFauces = (Math.sin(t * 2.5) * 0.5 + 0.5) * amp;

    if (this.pivoteColmilloIzq) this.pivoteColmilloIzq.rotation.y = angFauces;
    if (this.pivoteColmilloDer) this.pivoteColmilloDer.rotation.y = -angFauces;

    if (this.pivoteAlaIzq && this.pivoteAlaDer) {
      const velAlas = this.guiControls.velAlas;
      const ampAlas = this.guiControls.ampAlas;
    
      const apertura = (Math.sin(t * velAlas * 2.0) * 0.5 + 0.5) * ampAlas;
    
      // Reiniciamos antes de aplicar la animación para evitar acumulaciones raras.
      this.pivoteAlaIzq.rotation.set(0, 0, 0);
      this.pivoteAlaDer.rotation.set(0, 0, 0);
    
      // Apertura:
      // - rotation.z levanta el borde exterior del élitro.
      // - rotation.x le da un pequeño movimiento hacia atrás/arriba.
      //
      // Los signos están invertidos entre lados para que abran simétricamente.
      this.pivoteAlaIzq.rotation.z = apertura * 0.70;
      this.pivoteAlaDer.rotation.z = -apertura * 0.70;
    
      this.pivoteAlaIzq.rotation.x = apertura * 0.22;
      this.pivoteAlaDer.rotation.x = apertura * 0.22;

      this.pivoteAlaIzq.rotation.y = -apertura * 0.25;
      this.pivoteAlaDer.rotation.y = apertura * 0.25;
    }
  }
}

export { Escarabajo };