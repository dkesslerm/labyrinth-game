import * as THREE from 'three'

// ─────────────────────────────────────────────────────────────────────────────
// Laberinto de templo estilo Indiana Jones / Temple Run
//
// Texturas necesarias en la carpeta imgs/:
//   · stone_color.jpg    → color de la piedra de las paredes
//   · stone_normal.jpg   → mapa normal de la piedra (relieve)
//   · floor_color.jpg    → color de las losas del suelo
//   · floor_normal.jpg   → mapa normal del suelo
//   · moss_color.jpg     → color del musgo/hierba
//
// Si no tienes las texturas aún, el laberinto funciona igualmente
// con colores planos de fallback.
//
// Uso desde MyScene.js:
//   this.laberinto = new Laberinto();
//   this.add(this.laberinto);
//   var posInicial = this.laberinto.getPosicionInicial();
//   var posPuerta  = this.laberinto.getPosPuerta();
//   var colisiona  = this.laberinto.hayColision(x, z, radio);
// ─────────────────────────────────────────────────────────────────────────────

class Laberinto extends THREE.Object3D {
  constructor() {
    super();

    // ── Mapa ──────────────────────────────────────────────────────────────
    // 0 = pasillo  1 = pared  2 = inicio jugador  3 = puerta salida
    // Tablero 10x10
    this.mapa = [
      [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
      [1, 2, 0, 0, 1, 0, 0, 0, 0, 1],
      [1, 1, 1, 0, 1, 0, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1, 0, 1, 1],
      [1, 0, 1, 0, 0, 0, 0, 0, 1, 1],
      [1, 0, 1, 0, 1, 1, 1, 0, 0, 1],
      [1, 0, 0, 0, 1, 0, 0, 0, 1, 1],
      [1, 1, 1, 0, 0, 0, 1, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1, 1, 3, 1],
    ];

    this.tamCelda  = 2.0;
    this.altoPared = 4.0;
    this.paredes   = [];

    // Cargamos texturas y construimos
    this.loader = new THREE.TextureLoader();
    this.crearMateriales();
    this.crearParedes();
    this.crearSuelo();
    //this.crearTecho();
  }

  // ── HELPER: cargar textura con fallback de color ──────────────────────────
  // Si la textura no existe, Three.js mostrará un color magenta de error.
  // Con este helper se puede poner un color de fallback mientras no
  // se tengan las texturas descargadas.
  cargarTextura(ruta, repeticionX, repeticionY) {
    var tex = this.loader.load(ruta);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeticionX || 1, repeticionY || 1);
    return tex;
  }

  // ── MATERIALES ─────────────────────────────────────────────────────────────
  crearMateriales() {

    // ── Pared: piedra rugosa con mapa normal para relieve ─────────────────
    // Las texturas se repiten 2 veces por cara para que el tamaño
    // del bloque de piedra sea creíble (no losas gigantes)
    var texParedColor  = this.cargarTextura('../imgs/stone_color.jpg',  1, 1);
    var texParedNormal = this.cargarTextura('../imgs/stone_normal.jpg', 1, 1);

    this.matPared = new THREE.MeshStandardMaterial({
      map:          texParedColor,
      normalMap:    texParedNormal,
      normalScale:  new THREE.Vector2(1.5, 1.5),  // intensidad del relieve
      roughness:    0.95,
      metalness:    0.0,
      color:        '#D4C4A8'   // tinte cálido sobre la textura
    });

    // Variante más oscura para alternar bloques
    var texParedOscuraColor  = this.cargarTextura('../imgs/stone_color.jpg',  1, 1);
    var texParedOscuraNormal = this.cargarTextura('../imgs/stone_normal.jpg', 1, 1);

    this.matParedOscura = new THREE.MeshStandardMaterial({
      map:         texParedOscuraColor,
      normalMap:   texParedOscuraNormal,
      normalScale: new THREE.Vector2(1.5, 1.5),
      roughness:   1.0,
      metalness:   0.0,
      color:       '#B8A888'   // tinte más oscuro
    });

    // ── Suelo: losas con repetición más grande (losas más grandes) ────────
    var texSueloColor  = this.cargarTextura('../imgs/floor_color.jpg',  1, 1);
    var texSueloNormal = this.cargarTextura('../imgs/floor_normal.jpg', 1, 1);

    this.matSuelo = new THREE.MeshStandardMaterial({
      map:         texSueloColor,
      normalMap:   texSueloNormal,
      normalScale: new THREE.Vector2(1.0, 1.0),
      roughness:   0.9,
      metalness:   0.0,
      color:       '#E8E0D0'
    });

    // ── Techo ─────────────────────────────────────────────────────────────
    this.matTecho = new THREE.MeshStandardMaterial({
      map:      this.cargarTextura('../imgs/stone_color.jpg', 1, 1),
      roughness: 1.0,
      metalness: 0.0,
      color:    '#2A2420'
    });

  }

  // ── PAREDES ────────────────────────────────────────────────────────────────
  crearParedes() {
    for (var fila = 0; fila < this.mapa.length; fila++) {
      for (var col = 0; col < this.mapa[0].length; col++) {
        if (this.mapa[fila][col] === 1) {
          this.crearBloquePared(fila, col);
        }
      }
    }
  }

  crearBloquePared(fila, col) {
    var t = this.tamCelda;
    var h = this.altoPared;

    // Variación determinista de altura
    var variacion  = ((fila * 7 + col * 13) % 5) * 0.04;
    var altoBloque = h + variacion;

    var geo = new THREE.BoxGeometry(t, altoBloque, t);
    var mat = ((fila + col) % 3 === 0) ? this.matParedOscura : this.matPared;
    var mesh = new THREE.Mesh(geo, mat);

    var x = (col  - this.mapa[0].length / 2 + 0.5) * t;
    var z = (fila - this.mapa.length    / 2 + 0.5) * t;
    mesh.position.set(x, altoBloque / 2, z);

    var bbox = new THREE.Box3().setFromObject(mesh);
    this.paredes.push({ mesh, bbox, fila, col });
    this.add(mesh);
  }

  // ── SUELO ──────────────────────────────────────────────────────────────────
  crearSuelo() {
    var filas = this.mapa.length;
    var cols  = this.mapa[0].length;
    var t     = this.tamCelda;

    for (var fila = 0; fila < filas; fila++) {
      for (var col = 0; col < cols; col++) {
        var geo = new THREE.BoxGeometry(t, 0.15, t);
        var mat = this.matSuelo;
        var mesh = new THREE.Mesh(geo, mat);

        var x = (col  - cols  / 2 + 0.5) * t;
        var z = (fila - filas / 2 + 0.5) * t;
        mesh.position.set(x, -0.075, z);

        this.add(mesh);
      }
    }
  }

  // ── TECHO ──────────────────────────────────────────────────────────────────
  crearTecho() {
    var filas = this.mapa.length;
    var cols  = this.mapa[0].length;
    var t     = this.tamCelda;

    var geo  = new THREE.BoxGeometry(cols * t, 0.2, filas * t);
    var mesh = new THREE.Mesh(geo, this.matTecho);
    mesh.position.set(0, this.altoPared + 0.1, 0);
    this.add(mesh);
  }

  // ── UTILIDADES ─────────────────────────────────────────────────────────────

  celdaAMundo(fila, col) {
    var t = this.tamCelda;
    return {
      x: (col  - this.mapa[0].length / 2 + 0.5) * t,
      z: (fila - this.mapa.length    / 2 + 0.5) * t
    };
  }

  getPosicionInicial() {
    for (var fila = 0; fila < this.mapa.length; fila++) {
      for (var col = 0; col < this.mapa[0].length; col++) {
        if (this.mapa[fila][col] === 2) {
          var pos = this.celdaAMundo(fila, col);
          return new THREE.Vector3(pos.x, 1.7, pos.z);
        }
      }
    }
    return new THREE.Vector3(0, 1.7, 0);
  }

  getPosPuerta() {
    for (var fila = 0; fila < this.mapa.length; fila++) {
      for (var col = 0; col < this.mapa[0].length; col++) {
        if (this.mapa[fila][col] === 3) {
          var pos = this.celdaAMundo(fila, col);
          return new THREE.Vector3(pos.x, 0, pos.z);
        }
      }
    }
    return new THREE.Vector3(0, 0, 0);
  }

  getParedes() {
    return this.paredes;
  }

  hayColision(x, z, radio) {
    var cajaJugador = new THREE.Box3(
      new THREE.Vector3(x - radio, 0,   z - radio),
      new THREE.Vector3(x + radio, 3.0, z + radio)
    );
    for (var i = 0; i < this.paredes.length; i++) {
      this.paredes[i].bbox.setFromObject(this.paredes[i].mesh);
      if (cajaJugador.intersectsBox(this.paredes[i].bbox)) {
        return true;
      }
    }
    return false;
  }

  getTamCelda() {
    return this.tamCelda;
  }

  update() {
    // El laberinto es estático
  }
}

export { Laberinto }