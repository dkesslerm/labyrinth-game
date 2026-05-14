import * as THREE from 'three'
import * as CSG from '../libs/three-bvh-csg.js'

class Boton extends THREE.Object3D {
  constructor(gui, titleGui) {
    super();

    this.createGUI(gui, titleGui);

    // ── Materiales ──────────────────────────────────────────────────────────

    // Cuerpo metálico: hierro oscuro
    this.matBase = new THREE.MeshStandardMaterial({
      color:     '#3A3A3A',
      metalness: 0.85,
      roughness: 0.45,
    });

    // Capuchón: color configurable desde la GUI
    this.matCapuchon = new THREE.MeshStandardMaterial({
      color:     this.guiControls.colorBoton,
      metalness: 0.1,
      roughness: 0.55,
    });

    // ── Dimensiones ─────────────────────────────────────────────────────────
    this.dims = this.getDims();

    // ── Construcción ────────────────────────────────────────────────────────
    this.add(this.createBase());

    // El capuchón cuelga de un pivote que se desplaza en Y durante la animación
    this.pivoteCapuchon = new THREE.Object3D();
    this.pivoteCapuchon.add(this.createCapuchon());
    this.add(this.pivoteCapuchon);

    // ── Estado de animación ─────────────────────────────────────────────────
    //   'reposo'   → capuchón arriba
    //   'pulsando' → hundimiento rápido
    //   'soltando' → retorno suave
    this.estado = 'reposo';
    this.desplazamientoActual = 0;           // Y actual del pivote
    this.desplazamientoMaximo = this.dims.hundimiento;
    this.velocidadBajada = 0.5;             // unidades/s
    this.velocidadSubida = 0.2;             // unidades/s (más lento al soltar)

    this.reloj = new THREE.Clock();
  }

  // ── GUI ────────────────────────────────────────────────────────────────────
  createGUI(gui, titleGui) {
    this.guiControls = {
      colorBoton  : '#CC2222',   // rojo intenso
      pulsar: () => this.iniciarPulsacion(),
    };

    var folder = gui.addFolder(titleGui);

    folder.addColor(this.guiControls, 'colorBoton')
      .name('Color botón')
      .onChange((v) => this.matCapuchon.color.set(v));

    folder.add(this.guiControls, 'pulsar').name('Pulsar botón');
  }

  // ── DIMENSIONES ────────────────────────────────────────────────────────────
  getDims() {
    return {
      // Base metálica
      baseAncho  : 0.18,
      baseAlto   : 0.06,
      baseGrosor: 0.18,
      
      // Capuchón
      capuchonRadio   : 0.065,  // radio del cilindro
      capuchonAlto    : 0.020,  // altura del cilindro
      domoRadio       : 0.065,  // radio de la esfera que redondea la cima

      // Hundimiento máximo al pulsar
      hundimiento : 0.025,
    };
  }

  // ── BASE metálica ──────────────────────────────────────────────────────────
  // Caja rectangular centrada en el origen; la cara superior queda en y = baseAlto/2
  createBase() {
    var d = this.dims;
    var geo = new THREE.BoxGeometry(d.baseAncho, d.baseAlto, d.baseGrosor);
    // La desplazamos para que el fondo quede en y = 0
    geo.translate(0, d.baseAlto / 2, 0);
    return new THREE.Mesh(geo, this.matBase);
  }

  // ── CAPUCHÓN (tecla) ───────────────────────────────────────────────────────
  // Cilindro con la cima abovedada: se hace con CSG (cilindro INTERSECT esfera)
  // para obtener el perfil redondeado típico de un pulsador industrial.
  createCapuchon() {
    var d = this.dims;

    // Cilindro base del capuchón
    var geoCil = new THREE.CylinderGeometry(
      d.capuchonRadio,
      d.capuchonRadio,
      d.capuchonAlto,
      32
    );

    // Esfera que redondea la cima
    var geoEsfera = new THREE.SphereGeometry(d.domoRadio, 32, 24);
    // La esfera se sube para que solo intersecte la mitad superior del cilindro
    geoEsfera.translate(0, d.capuchonAlto * 0.38, 0);

    // CSG: cilindro UNION esfera → capuchón con domo
    var evaluador = new CSG.Evaluator();
    var brushCil    = new CSG.Brush(geoCil,    this.matCapuchon);
    var brushEsfera = new CSG.Brush(geoEsfera, this.matCapuchon);
    var capuchon = evaluador.evaluate(brushCil, brushEsfera, CSG.ADDITION);

    // Posicionamos el capuchón encima de la base
    // (su centro geométrico queda a capuchonAlto/2 sobre la cara superior de la base)
    capuchon.position.set(0, d.baseAlto + d.capuchonAlto / 2, 0);

    return capuchon;
  }

  // ── PULSACIÓN ──────────────────────────────────────────────────────────────
  iniciarPulsacion() {
    if (this.estado === 'reposo') {
      this.estado = 'pulsando';
      this.reloj.getDelta();   // reinicia el delta acumulado
    }
  }

  // ── UPDATE ─────────────────────────────────────────────────────────────────
  update() {
    const dt = Math.min(this.reloj.getDelta(), 0.05);

    switch (this.estado) {

      case 'pulsando': {
        // Hundimiento: el pivote baja en Y
        const faltaBajar = this.desplazamientoMaximo - this.desplazamientoActual;

        if (faltaBajar > 0.0001) {
          const paso = this.velocidadBajada * dt;
          this.desplazamientoActual = Math.min(
            this.desplazamientoActual + paso,
            this.desplazamientoMaximo
          );
          this.pivoteCapuchon.position.y = -this.desplazamientoActual;
        } else {
          // Fondo alcanzado: pasamos a soltar
          this.desplazamientoActual = this.desplazamientoMaximo;
          this.pivoteCapuchon.position.y = -this.desplazamientoActual;
          this.estado = 'soltando';
        }
        break;
      }

      case 'soltando': {
        // Retorno: el pivote sube en Y
        const faltaSubir = this.desplazamientoActual;

        if (faltaSubir > 0.0001) {
          const paso = this.velocidadSubida * dt;
          this.desplazamientoActual = Math.max(
            this.desplazamientoActual - paso,
            0
          );
          this.pivoteCapuchon.position.y = -this.desplazamientoActual;
        } else {
          // Vuelta al reposo
          this.desplazamientoActual = 0;
          this.pivoteCapuchon.position.y = 0;
          this.estado = 'reposo';
        }
        break;
      }

      case 'reposo':
        break;
    }
  }
}

export { Boton }