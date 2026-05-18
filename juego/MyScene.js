// Clases de la biblioteca
// import * as THREE from "three"

import * as THREE from "three";
import { GUI } from "gui";
import { PointerLockControls } from '../libs/PointerLockControls.js'
 
import { Laberinto } from './Laberinto.js'
import { Puerta } from './Puerta.js'
import { Llave } from './Llave.js'
import { Daga } from './Daga.js'
import { Escarabajo } from './Escarabajo.js'
import { Sombrero } from './Sombrero.js'
import { Gema } from './Gema.js'
import { Boton } from './Boton.js'

/// La clase fachada del modelo
/**
 * Usaremos una clase derivada de la clase Scene de Three.js para llevar el control de la escena y de todo lo que ocurre en ella.
 */

class MyScene extends THREE.Scene {
  // Recibe el  div  que se ha creado en el  html  que va a ser el lienzo en el que mostrar
  // la visualización de la escena
  constructor(myCanvas) {
    super();

    // Lo primero, crear el visualizador, pasándole el lienzo sobre el que realizar los renderizados.
    this.renderer = this.createRenderer(myCanvas);

    // Se crea la interfaz gráfica de usuario
    this.gui = this.createGUI();

     // Reloj para velocidad
    this.reloj = new THREE.Clock();

    // Construimos los distinos elementos que tendremos en la escena

    // Todo elemento que se desee sea tenido en cuenta en el renderizado de la escena debe pertenecer a esta. Bien como hijo de la escena (this en esta clase) o como hijo de un elemento que ya esté en la escena.
    // Tras crear cada elemento se añadirá a la escena con   this.add(variable)
    this.createLights();
    
    // Crear el laberinto
    this.laberinto = new Laberinto();
    this.add(this.laberinto);
    
    // Tendremos una cámara con un control de movimiento con el ratón
    this.createCamera();

    // Y otra cámara arriba
    this.configurarCamaraTop();

    // Colocar la cámara principal en la posición inicial del laberinto
    var posInicial = this.laberinto.getPosicionInicial();
    this.camera.position.copy(posInicial);

    //Creamos la puerta y la colocamos en su posición
    this.puerta = new Puerta(this.gui, 'Puerta');
    var posPuerta = this.laberinto.getPosPuerta();
    this.puerta.position.copy(posPuerta);
    this.puerta.rotation.y = Math.PI;
    this.add(this.puerta);

    // ── Botón en la pared de inicio (a espaldas del jugador) ────────────────
    // El jugador empieza en fila 1, col 1. La pared norte está en fila 0, col 1.
    // La cara sur de esa pared queda en z = -8 (centro de celda fila 0 es z = -9,
    // más tamCelda/2 = 1.0 → z = -8). El botón se pega a esa cara.
    const guiDummy = this.crearGUIDummy();
    this.boton = new Boton(guiDummy, 'Boton');

    // Posición: misma X que el inicio del jugador (-7), a la altura del pecho
    this.boton.position.set(-7, 1.1, -8);

    // Orientación: la base del botón es horizontal por defecto (cara superior en +Y).
    // Lo rotamos 90° en X para que quede pegado a la pared vertical, con el
    // capuchón apuntando hacia +Z (hacia el jugador).
    this.boton.rotation.x = Math.PI / 2;

    // Referencia al mesh del capuchón para el raycaster (igual que puerta.pomo)
    // traverseamos para guardar userData en todos los descendientes
    this.boton.traverse((nodo) => {
      nodo.userData.esBoton = true;
    });

    this.add(this.boton);
    
    // ── Pick-ups: Cada entrada: { objeto: Object3D, recogido: false }
    this.pickups = [];
    this.inventario = {
      daga: false,
      escarabajo: false,
      sombrero: false,
      gema: false,
      llave: false,
    };
    
    // Estado del juego
    this.todosRecogidos = false;
    this.modoDificil = false;
    
    this.crearInventario();
    this.crearPickups();

    // Estado de las teclas
    this.teclas = { w: false, s: false, a: false, d: false };

    // Velocidad
    this.velocidad = this.guiControls.velocidadJugador;   // metros por segundo

    //Raycaster para picking
    this.raycaster = new THREE.Raycaster();
    this.raycaster.far = 2.5;   // distancia máxima de interacción (metros)
    this.vecMouse = new THREE.Vector2();

    //Vectores reutilizables para colisiones
    this.dirMirada = new THREE.Vector3();

    //Eventos
    this.registrarEventos();
  }

  // --- CONFIGURACIÓN -------------------------------
  
  // Renderer
  createRenderer(myCanvas) {
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(new THREE.Color(0x111111), 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    $(myCanvas).append(renderer.domElement);
    return renderer;
  }
  
  createCamera() {
    // Para crear una cámara le indicamos
    //   El ángulo del campo de visión vértical en grados sexagesimales
    //   La razón de aspecto ancho/alto
    //   Los planos de recorte cercano y lejano
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      500,
    );
    // También se indica dónde se coloca
    this.camera.position.set(0, 1.75, 0);
    this.camera.lookAt(new THREE.Vector3(0, 1.75, -1));
    this.add(this.camera);

    // Ahora que la cámara existe, añadimos la luz y su target como hijos
    this.camera.add(this.spotLight);
    this.camera.add(this.spotLight.target);

    // PointerLockControls
    this.controls = new PointerLockControls(this.camera, this.renderer.domElement);

    // Segunda cámara para vista cenital.
    // La configuramos después con configurarCamaraTop().
    this.camaraTop = new THREE.OrthographicCamera(
      -10, 10,
       10, -10,
       0.1, 200
    );
    
    this.camaraTop.position.set(0, 50, 0);
    this.camaraTop.lookAt(0, 0, 0);
    this.add(this.camaraTop);
  }

  configurarCamaraTop() {
    if (!this.laberinto || !this.camaraTop) return;
  
    const filas = this.laberinto.mapa.length;
    const cols = this.laberinto.mapa[0].length;
    const t = this.laberinto.tamCelda;

    const semiAncho = (cols * t) / 2;
    const semiAlto = (filas * t) / 2;
  
    // Margen pequeño para que no se corte el borde exterior del laberinto.
    const margen = t * 0.35;
  
    // Como el viewport del minimapa es cuadrado, usamos el eje mayor.
    const semi = Math.max(semiAncho, semiAlto) + margen;
  
    this.camaraTop.left = -semi;
    this.camaraTop.right = semi;
    this.camaraTop.top = semi;
    this.camaraTop.bottom = -semi;
    this.camaraTop.near = 0.1;
    this.camaraTop.far = 200;
  
    this.camaraTop.position.set(0, 50, 0);
    this.camaraTop.lookAt(0, 0, 0);
    this.camaraTop.updateProjectionMatrix();
  }

  createGUI() {
    var gui = new GUI();
  
    this.guiControls = {
      luzAmbiente: 1.5,
      luzFocal: 70,
      velocidadJugador: 5.0,
    };
  
    var folderJuego = gui.addFolder('Juego');
  
    folderJuego.add(this.guiControls, 'velocidadJugador', 1.0, 10.0, 0.1)
      .name('Velocidad jugador')
      .onChange((v) => {
        this.velocidad = v;
      });
  
    var folderLuces = gui.addFolder('Iluminación');
  
    folderLuces.add(this.guiControls, 'luzAmbiente', 0, 5, 0.1)
      .name('Luz ambiente')
      .onChange((v) => {
        this.ambientLight.intensity = v;
      });
  
    folderLuces.add(this.guiControls, 'luzFocal', 0, 1000, 10)
      .name('Luz focal')
      .onChange((v) => {
        this.spotLight.power = v;
      });
  
    return gui;
  }
  
  // Se crean las luces y se añaden en la createCamera() para que se muevan con ella
  createLights() {
    // Se crea una luz ambiental, evita que se vean complentamente negras las zonas donde no incide de manera directa una fuente de luz
    // La luz ambiental solo tiene un color y una intensidad
    // Se declara como   var   y va a ser una variable local a este método
    //    se hace así puesto que no va a ser accedida desde otros métodos
    this.ambientLight = new THREE.AmbientLight(
      0xFFF5E0, this.guiControls.luzAmbiente);
      
    // La añadimos a la escena
    this.add(this.ambientLight);

    // Se crea una luz focal que va a ser la luz principal de la escena
    // La luz focal, además tiene una posición, y un punto de mira
    // Si no se le da punto de mira, apuntará al (0,0,0) en coordenadas del mundo
    // En este caso se declara como   this.atributo   para que sea un atributo accesible desde otros métodos.
    this.spotLight = new THREE.SpotLight(0xffffff);
    this.spotLight.power = this.guiControls.luzFocal;

    // Posición de la luz relativa a la cámara (ligeramente por encima)
    this.spotLight.position.set(0, 0.2, 0);

    // El target también debe colgar de la cámara y apuntar hacia delante
    this.spotLight.target.position.set(0, 0, -1);
  }

  // ── TODO RELATIVO A LOS PICKUPS ──────────────────────────────────────────────────────

  // Necesitamos una GUI de juguete para que las GUI de cada picukp individual no 
  // aparezcan en la GUI del juego. 
  crearGUIDummy() {
    const controladorDummy = {
      name: function () { return this; },
      onChange: function () { return this; },
      listen: function () { return this; },
    };
  
    const folderDummy = {
      add: function () { return controladorDummy; },
      addColor: function () { return controladorDummy; },
      addFolder: function () { return folderDummy; },
      open: function () { return this; },
      close: function () { return this; },
    };
  
    return {
      addFolder: function () { return folderDummy; },
      add: function () { return controladorDummy; },
      addColor: function () { return controladorDummy; },
    };
  } 
  
  crearPickups() {
    // Coordenadas en el mapa del laberinto: fila, columna.
    const configs = [
      {
        id: 'daga',
        nombre: 'Daga',
        icono: '🗡️',
        Clase: Daga,
        fila: 5,
        col: 6,
        escala: 2.0,
        rotY: Math.PI * 0.25,
      },
      {
        id: 'escarabajo',
        nombre: 'Escarabajo',
        icono: '🪲',
        Clase: Escarabajo,
        fila: 1,
        col: 3,
        escala: 2.2,
        rotY: 0,
      },
      {
        id: 'sombrero',
        nombre: 'Sombrero',
        icono: '🎩',
        Clase: Sombrero,
        fila: 3,
        col: 1,
        escala: 1.2,
        rotY: Math.PI * 0.5,
      },
      {
        id: 'gema',
        nombre: 'Gema',
        icono: '💎',
        Clase: Gema,
        fila: 7,
        col: 5,
        escala: 1.4,
        rotY: 0,
      },
      {
        id: 'llave',
        nombre: 'Llave',
        icono: '🔑',
        Clase: Llave,
        fila: 1,
        col: 8,
        escala: 3.0,
        rotY: Math.PI * 0.5,
      },
    ];
  
    configs.forEach((cfg) => {
      this.crearPickup(cfg);
    });
  
    this.actualizarInventario();
  }
  
  crearPickup(cfg) {
    const pos = this.laberinto.celdaAMundo(cfg.fila, cfg.col);
  
    const guiDummy = this.crearGUIDummy();
    const objeto = new cfg.Clase(guiDummy, cfg.nombre);
  
    objeto.position.set(pos.x, 0.35, pos.z);
    objeto.rotation.y = cfg.rotY || 0;
    objeto.scale.setScalar(cfg.escala || 1);
  
    objeto.userData.esPickup = true;
    objeto.userData.pickupId = cfg.id;
  
    objeto.traverse((nodo) => {
      nodo.userData.esPickup = true;
      nodo.userData.pickupId = cfg.id;
      nodo.userData.pickupRoot = objeto;
    });
  
    this.add(objeto);
  
    this.pickups.push({
      id: cfg.id,
      nombre: cfg.nombre,
      icono: cfg.icono,
      objeto: objeto,
      recogido: false,
    });
  }
  
   recogerPickup(pickup) {
     if (pickup.recogido) return;
   
     // El escarabajo requiere tener la daga primero
     if (pickup.id === 'escarabajo' && !this.inventario.daga) {
       this.mostrarMensaje('Necesitas la daga para atrapar al escarabajo.');
       return;
     }   
     
     pickup.recogido = true;
     pickup.objeto.visible = false;
   
     this.inventario[pickup.id] = true;
   
     const recogidos = this.pickups.filter(p => p.recogido).length;
     const total = this.pickups.length;
   
     if (pickup.id === 'sombrero') {
       this.mostrarMensaje(`Sombrero recogido (${recogidos}/${total}).`);
     } else if (pickup.id === 'escarabajo') {
       this.mostrarMensaje(`Escarabajo recogido (${recogidos}/${total}).`);
     } else {
       this.mostrarMensaje(`${pickup.nombre} recogida (${recogidos}/${total}).`);       
     }
   
     if (this.todosLosPickupsRecogidos()) {
       this.todosRecogidos = true;
       this.mostrarMensaje('¡Todos los artefactos recogidos! Encuentra la salida.');
     }
   
     this.actualizarInventario();
   }
 
   todosLosPickupsRecogidos() {
     return this.pickups.length > 0 && this.pickups.every(p => p.recogido);
   }

  // ── INVENTARIO ───────────────────────────────────────────────────────────────
  crearInventario() {
    let contenedor = document.getElementById('Inventario');
  
    if (!contenedor) {
      contenedor = document.createElement('div');
      contenedor.id = 'Inventario';
      document.body.appendChild(contenedor);
    }
  
    contenedor.style.position = 'absolute';
    contenedor.style.left = '20px';
    contenedor.style.bottom = '20px';
    contenedor.style.padding = '12px';
    contenedor.style.border = '2px solid #D4A017';
    contenedor.style.borderRadius = '10px';
    contenedor.style.background = 'rgba(20, 14, 6, 0.78)';
    contenedor.style.color = '#F5E6B8';
    contenedor.style.fontFamily = 'serif';
    contenedor.style.zIndex = '1000';
    contenedor.style.minWidth = '220px';
    contenedor.style.pointerEvents = 'none';
  
    this.elemInventario = contenedor;
  }
  
  actualizarInventario() {
    if (!this.elemInventario) return;
  
    const items = [
      { id: 'daga', nombre: 'Daga', icono: '🗡️' },
      { id: 'escarabajo', nombre: 'Escarabajo', icono: '🪲' },
      { id: 'sombrero', nombre: 'Sombrero', icono: '🎩' },
      { id: 'gema', nombre: 'Gema', icono: '💎' },
      { id: 'llave', nombre: 'Llave', icono: '🔑' },
    ];
  
    let html = '<h3 style="margin:0 0 8px 0;">Inventario</h3>';
  
    items.forEach((item) => {
      const recogido = this.inventario[item.id];
  
      html += `
        <div style="
          opacity:${recogido ? '1.0' : '0.35'};
          margin:4px 0;
          font-size:18px;
        ">
          <span style="display:inline-block; width:28px;">${item.icono}</span>
          ${item.nombre}
          ${recogido ? '✓' : ''}
        </div>
      `;
    });
  
    this.elemInventario.innerHTML = html;
  }

  // ── EVENTOS ───────────────────────────────────────────────────────────────────
  registrarEventos() {
    // Teclado
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup', (e) => this.onKeyUp(e));
 
    // Ratón
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));

    this.renderer.domElement.addEventListener('click', () => {
      this.controls.lock();
    });
  }
 
  // ── TECLADO: keydown ──────────────────────────────────────────────────────────
  // Usamos event.which || event.key para compatibilidad 
  onKeyDown(event) {
    var codigo = event.which || event.keyCode;
    var tecla = String.fromCharCode(codigo).toLowerCase();

    // Variables booleanas por tecla
    switch (tecla) {
      case 'w': this.teclas.w = true; break;
      case 's': this.teclas.s = true; break;
      case 'a': this.teclas.a = true; break;
      case 'd': this.teclas.d = true; break;
    }
    if (event.key === 'ArrowUp') this.teclas.w = true;
    if (event.key === 'ArrowDown') this.teclas.s = true;
    if (event.key === 'ArrowLeft') this.teclas.a = true;
    if (event.key === 'ArrowRight') this.teclas.d = true;
  }
 
  // ── TECLADO: keyup ────────────────────────────────────────────────────────────
  onKeyUp(event) {
    var codigo = event.which || event.keyCode;
    var tecla = String.fromCharCode(codigo).toLowerCase();

    switch (tecla) {
      case 'w': this.teclas.w = false; break;
      case 's': this.teclas.s = false; break;
      case 'a': this.teclas.a = false; break;
      case 'd': this.teclas.d = false; break;
    }
    if (event.key === 'ArrowUp') this.teclas.w = false;
    if (event.key === 'ArrowDown') this.teclas.s = false;
    if (event.key === 'ArrowLeft') this.teclas.a = false;
    if (event.key === 'ArrowRight') this.teclas.d = false;
  }
 
  // ── RATÓN: click (recoger pick-ups / abrir puerta / pulsar botón) ─────────────
  onMouseDown(event) {
    // Solo botón izquierdo
    if ((event.which || event.button) !== 1) return;
 
    // Solo si el ratón está capturado
    if (!this.controls.isLocked) return;
 
    // En primera persona el jugador siempre mira al centro de pantalla
    this.vecMouse.set(0, 0);
    this.raycaster.setFromCamera(this.vecMouse, this.camera);

    // ── Comprobar clic en el botón ────────────────────────────────────────
    var impactosBoton = this.raycaster.intersectObject(this.boton.pivotePulsador, true);

    if (impactosBoton.length > 0) {
      this.boton.iniciarPulsacion();
      this.onBotonPulsado();
      return;
    }
 
    // ── Comprobar clic en el pomo de la puerta ────────────────────────────
    var impactosPuerta = this.raycaster.intersectObject(this.puerta.pomo, true);
    
    if (impactosPuerta.length > 0) {
      // if (this.llaveRecogida)
      if (this.todosLosPickupsRecogidos()) {
        this.todosRecogidos = true;
        this.puerta.iniciarApertura();
        this.mostrarMensaje('¡Puerta abierta! ¡Has escapado del templo!');
      } else {
        const recogidos = this.pickups.filter(p => p.recogido).length;
        const total = this.pickups.length;
        this.mostrarMensaje(`Necesitas recoger todos los artefactos primero (${recogidos}/${total}).`);
      }
      return;
    }
 
    // ── Comprobar clic en pick-ups ────────────────────────────────────────
    var objetos = this.pickups.filter(p => !p.recogido).map(p => p.objeto);
    var impactos = this.raycaster.intersectObjects(objetos, true);
 
    if (impactos.length > 0) {
      var meshClicado = impactos[0].object;
      
      const id = meshClicado.userData.pickupId;
      const pickup = this.pickups.find(p => p.id === id);
 
      if (pickup && !pickup.recogido) {
        this.recogerPickup(pickup);
      }
    }
  }

  // ── ACCIÓN DEL BOTÓN ──────────────────────────────────────────────────────────
  onBotonPulsado() {
    this.modoDificil = !this.modoDificil;
  
    if (this.modoDificil) {
      this.ambientLight.intensity = 0;
      this.spotLight.power = 5;
      this.mostrarMensaje('¡Modo difícil activado!');
    } else {
      this.ambientLight.intensity = this.guiControls.luzAmbiente;
      this.spotLight.power = this.guiControls.luzFocal;
      this.mostrarMensaje('Modo normal restaurado.');
    }
  }
 
  // ── MENSAJE EN PANTALLA  ─────────────────────────────────
  mostrarMensaje(texto) {
    var elem = document.getElementById('Messages');
    if (elem) {
      elem.innerHTML = '<h2>' + texto + '</h2>';
      clearTimeout(this._timerMensaje);
      this._timerMensaje = setTimeout(() => { elem.innerHTML = ''; }, 3000);
    }
  }
 
  // ── MOVIMIENTO DEL JUGADOR ────────────────────────────────────────────────────

  getObjetosColision() {
    // Paredes del laberinto
    const objetos = this.laberinto.getParedes().map(p => p.mesh);
  
    // Hoja de la puerta.
    // La puerta completa incluye marco, columnas y dintel.
    // Para bloquear el paso nos interesa la hoja, que está dentro de this.puerta.pivote.
    if (this.puerta && this.puerta.pivote) {
      objetos.push(this.puerta.pivote);
    }
  
    return objetos;
  }
  
  hayColisionJugadorRaycasting(posicion) {
    const objetosColision = this.getObjetosColision();
  
    // Radio aproximado del cuerpo del jugador
    const radioJugador = 0.34;
  
    // Alturas a las que comprobamos colisión.
    // Así no dependemos solo de un rayo a la altura de los ojos.
    const alturas = [0.45, 1.15, 1.70];
  
    // Direcciones horizontales alrededor del jugador.
    // Esto simula un volumen circular usando raycasting.
    const direcciones = [
      new THREE.Vector3( 1, 0,  0),
      new THREE.Vector3(-1, 0,  0),
      new THREE.Vector3( 0, 0,  1),
      new THREE.Vector3( 0, 0, -1),
  
      new THREE.Vector3( 1, 0,  1).normalize(),
      new THREE.Vector3( 1, 0, -1).normalize(),
      new THREE.Vector3(-1, 0,  1).normalize(),
      new THREE.Vector3(-1, 0, -1).normalize(),
    ];
  
    for (let h = 0; h < alturas.length; h++) {
      const origenBase = new THREE.Vector3(
        posicion.x,
        alturas[h],
        posicion.z
      );
  
      for (let i = 0; i < direcciones.length; i++) {
        this.raycaster.set(origenBase, direcciones[i]);
        this.raycaster.far = radioJugador;
  
        const impactos = this.raycaster.intersectObjects(objetosColision, true);
  
        if (impactos.length > 0) {
          return true;
        }
      }
    }
  
    return false;
  }
  
  // Velocidad independiente del ordenador: e = v · Δt
  // Colisiones con Raycaster
  moverJugador() {
    if (!this.controls.isLocked) return;
  
    let dt = this.reloj.getDelta();
  
    // Evitamos saltos enormes si el navegador pega un tirón.
    // Esto reduce mucho los atravesamientos por tunneling.
    dt = Math.min(dt, 0.05);
  
    // Dirección real de la cámara
    this.controls.getDirection(this.dirMirada);
  
    // Proyección horizontal robusta
    const dirHorizontal = new THREE.Vector3(
      this.dirMirada.x,
      0,
      this.dirMirada.z
    );
  
    // Si miras completamente arriba/abajo, la proyección horizontal
    // puede ser casi nula.
    if (dirHorizontal.lengthSq() < 0.000001) {
      dirHorizontal.set(0, 0, -1);
      dirHorizontal.applyQuaternion(this.camera.quaternion);
      dirHorizontal.y = 0;
    }
  
    dirHorizontal.normalize();
  
    const dirLateral = new THREE.Vector3()
      .crossVectors(dirHorizontal, new THREE.Vector3(0, 1, 0))
      .normalize();
  
    // Calculamos intención de movimiento
    let movimiento = new THREE.Vector3(0, 0, 0);
  
    if (this.teclas.w) movimiento.addScaledVector(dirHorizontal, this.velocidad * dt);
    if (this.teclas.s) movimiento.addScaledVector(dirHorizontal, -this.velocidad * dt);
    if (this.teclas.a) movimiento.addScaledVector(dirLateral, -this.velocidad * dt);
    if (this.teclas.d) movimiento.addScaledVector(dirLateral, this.velocidad * dt);
  
    movimiento.y = 0;
  
    if (movimiento.lengthSq() === 0) {
      this.camera.position.y = 1.75;
      this.raycaster.far = 2.5;
      return;
    }
  
    // Dividimos el desplazamiento en pasos pequeños.
    // Si intentas moverte mucho en un frame, no saltas al otro lado de la pared.
    const maxPaso = 0.06;
    const distanciaTotal = movimiento.length();
    const numPasos = Math.ceil(distanciaTotal / maxPaso);
    const paso = movimiento.clone().divideScalar(numPasos);
  
    for (let i = 0; i < numPasos; i++) {
      // Intentamos mover primero en X y luego en Z.
      // Esto permite deslizarse por las paredes en vez de bloquearse del todo.
  
      const candidataX = this.camera.position.clone();
      candidataX.x += paso.x;
  
      if (!this.hayColisionJugadorRaycasting(candidataX)) {
        this.camera.position.x = candidataX.x;
      }
  
      const candidataZ = this.camera.position.clone();
      candidataZ.z += paso.z;
  
      if (!this.hayColisionJugadorRaycasting(candidataZ)) {
        this.camera.position.z = candidataZ.z;
      }
    }
  
    // Altura fija
    this.camera.position.y = 1.75;
  
    // Restauramos distancia para picking
    this.raycaster.far = 2.5;
  }
 
  // ── RENDERIZADO CON VIEWPORTS  ───────────────────────────────
  // Método reutilizable para renderizar una cámara en un viewport concreto.
  // left, top, width, height toman valores entre 0 y 1 (proporciones de pantalla)
  renderViewport(camara, left, top, width, height) {
    var l = left * window.innerWidth;
    var t = top * window.innerHeight;
    var w = width * window.innerWidth;
    var h = height * window.innerHeight;
 
    this.renderer.setViewport(l, t, w, h);
    this.renderer.setScissor(l, t, w, h);
    this.renderer.setScissorTest(true);
 
    // Actualizar aspecto si es perspectiva
    if (camara.isPerspectiveCamera) {
      camara.aspect = w / h;
      camara.updateProjectionMatrix();
    }
 
    this.renderer.render(this, camara);
  }

  renderMinimapa() {
    // El minimapa será siempre cuadrado.
    // Usamos el menor lado de la ventana para calcular el tamaño.
    var lado = Math.min(window.innerWidth, window.innerHeight) * 0.3;
  
    // Margen respecto a la esquina inferior derecha.
    var margen = 20;
  
    var x = window.innerWidth - lado - margen;
    var y = margen;
  
    this.renderer.setViewport(x, y, lado, lado);
    this.renderer.setScissor(x, y, lado, lado);
    this.renderer.setScissorTest(true);
  
    this.renderer.render(this, this.camaraTop);
  }


// ── GETTERS ───────────────────────────────────────────────────────────────────
  getCamera() {
    // En principio se devuelve la única cámara que tenemos
    // Si hubiera varias cámaras, este método decidiría qué cámara devuelve cada vez que es consultado
    return this.camera;
  }

  setCameraAspect(ratio) {
    // Cada vez que el usuario modifica el tamaño de la ventana desde el gestor de ventanas de
    // su sistema operativo hay que actualizar el ratio de aspecto de la cámara
    this.camera.aspect = ratio;
    // Y si se cambia ese dato hay que actualizar la matriz de proyección de la cámara
    this.camera.updateProjectionMatrix();
  }

  onWindowResize() {
    // Este método es llamado cada vez que el usuario modifica el tamapo de la ventana de la aplicación
    // Hay que actualizar el ratio de aspecto de la cámara
    this.setCameraAspect(window.innerWidth / window.innerHeight);
    
    // Actualizar cámara ortográfica del minimapa
    if (this.camaraTop) {
      this.configurarCamaraTop();
    }

    // Y también el tamaño del renderizador
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────────
  update() {
    // Mover jugador con detección de colisiones
    this.moverJugador();
 
    // Actualizar objetos animados
    this.puerta.update();
    this.boton.update();
    this.pickups.forEach(p => {
      if (!p.recogido && p.objeto.update) p.objeto.update();
    });

    // Renderizar vista principal (pantalla completa)
    this.renderViewport(this.camera, 0, 0, 1, 1);
 
    // Renderizar minimapa (esquina inferiror derecha, 25% de pantalla)
    this.renderMinimapa();
    
    // Siguiente frame
    requestAnimationFrame(() => this.update());
  }
}

/// La función main
$(function () {
  // Se instancia la escena pasándole el  div  que se ha creado en el html para visualizar
  var scene = new MyScene("#WebGL-output");

  // Se añaden los listener de la aplicación. En este caso, el que va a comprobar cuándo se modifica el tamaño de la ventana de la aplicación.
  window.addEventListener("resize", () => scene.onWindowResize());

  // Que no se nos olvide, la primera visualización.
  scene.update();
});