// Clases de la biblioteca
// import * as THREE from "three"

import * as THREE from "three";
import { GUI } from "gui";
import { PointerLockControls } from '../libs/PointerLockControls.js'
import * as TWEEN from '../libs/tween.esm.js'
 
import { Laberinto  } from './laberinto.js'
import { Puerta     } from './puerta.js'
import { Llave      } from './Llave.js'
import { Daga       } from './Daga.js'
import { Escarabajo } from './Escarabajo.js'
import { Sombrero   } from './Sombrero.js'
import { Gema       } from './Gema.js'

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

    // Tendremos una cámara con un control de movimiento con el ratón
    this.createCamera();


    // Crear el laberinto
    this.laberinto = new Laberinto();
    this.add(this.laberinto);

    // Colocar la cámara en la posición inicial del laberinto
    var posInicial = this.laberinto.getPosicionInicial();
    this.camera.position.copy(posInicial);

    //Creamos la puerta y la colocamos en su posición
    this.puerta = new Puerta(this.gui, 'Puerta');
    var posPuerta = this.laberinto.getPosPuerta();
    this.puerta.position.copy(posPuerta);
    this.puerta.rotation.y = Math.PI;
    this.add(this.puerta);


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
    
    this.crearInventario();
    this.crearPickups();

    // Estado de las teclas
    this.teclas = { w: false, s: false, a: false, d: false };

    // Velocidad
    this.velocidad = 5.0;   // metros por segundo

    //Raycaster para picking
    this.raycaster     = new THREE.Raycaster();
    this.raycaster.far = 2.5;   // distancia máxima de interacción (metros)
    this.vecMouse      = new THREE.Vector2();
    
    //Vectores reutilizables para colisiones
    this.posJugador  = new THREE.Vector3();
    this.dirMirada   = new THREE.Vector3();

    //Eventos
    this.registrarEventos();
  }

  // ── RENDERER ─────────────────────────────────────────────────────────────────
  createRenderer(myCanvas) {
    var renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setClearColor(new THREE.Color(0x111111), 1.0);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
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

    //Segunda cámara para vista cenital
    var tam = this.laberinto ? this.laberinto.mapa[0].length * this.laberinto.tamCelda / 2 : 30;
    this.camaraTop = new THREE.OrthographicCamera(
      -tam,  tam,   // left, right
       tam, -tam,   // top, bottom
       0.1,  200    // near, far
    );
    this.camaraTop.position.set(0, 50, 0);
    this.camaraTop.lookAt(0, 0, 0);
    this.add(this.camaraTop);

  }

  createGUI() {
    // Se crea la interfaz gráfica de usuario
    var gui = new GUI();

    // La escena le va a añadir sus propios controles.
    // Se definen mediante un objeto de control
    // En este caso la intensidad de la luz y si se muestran o no los ejes
    this.guiControls = {
      luzAmbiente : 1.5,
      luzFocal    : 100,
    };
 
    var folder = gui.addFolder('Iluminación');
    folder.add(this.guiControls, 'luzAmbiente', 0, 5, 0.1)
      .name('Luz ambiente')
      .onChange((v) => { this.ambientLight.intensity = v; });
    folder.add(this.guiControls, 'luzFocal', 0, 1000, 10)
      .name('Luz focal')
      .onChange((v) => { this.spotLight.power = v; });
 
    return gui;
  }

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

    //se añaden en la createCamera() para que se muevan con ella
  }

  // ── CREACIÓN DE PICKUPS ──────────────────────────────────────────────────────
  crearPickups() {
    // Coordenadas en el mapa del laberinto: fila, columna.
    // Todas estas celdas son pasillos accesibles según tu mapa actual.
    const configs = [
      {
        id: 'daga',
        nombre: 'Daga',
        icono: '🗡️',
        Clase: Daga,
        fila: 1,
        col: 3,
        escala: 2.0,
        rotY: Math.PI * 0.25,
      },
      {
        id: 'escarabajo',
        nombre: 'Escarabajo',
        icono: '🪲',
        Clase: Escarabajo,
        fila: 5,
        col: 6,
        escala: 2.2,
        rotY: Math.PI,
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
        fila: 8,
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
  
    // Asumo que tus clases aceptan (gui, titleGui), como Puerta y Llave.
    // Si alguna clase no usa esos parámetros, no pasa nada.
    const objeto = new cfg.Clase(this.gui, cfg.nombre);
  
    objeto.position.set(pos.x, 0.35, pos.z);
    objeto.rotation.y = cfg.rotY || 0;
    objeto.scale.setScalar(cfg.escala || 1);
  
    // Marcamos la raíz del pickup.
    objeto.userData.esPickup = true;
    objeto.userData.pickupId = cfg.id;
  
    // Marcamos también todos los hijos para que el raycaster pueda
    // encontrar el pickup aunque se haga click sobre una pieza interna.
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
    // ── Teclado  ──────────────────────────────────────
    window.addEventListener('keydown', (e) => this.onKeyDown(e));
    window.addEventListener('keyup',   (e) => this.onKeyUp(e));
 
    // ── Ratón: click para recoger/abrir  ────────────
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));

    this.renderer.domElement.addEventListener('click', () => {
      this.controls.lock();
    });
  }
 
  // ── TECLADO: keydown ──────────────────────────────────────────────────────────
  // Usamos event.which || event.key para compatibilidad 
  onKeyDown(event) {
    var codigo = event.which || event.keyCode;
    var tecla  = String.fromCharCode(codigo).toLowerCase();
 
    // Variables booleanas por tecla
    switch (tecla) {
      case 'w': this.teclas.w = true; break;
      case 's': this.teclas.s = true; break;
      case 'a': this.teclas.a = true; break;
      case 'd': this.teclas.d = true; break;
    }
    if (event.key === 'ArrowUp')    this.teclas.w = true;
    if (event.key === 'ArrowDown')  this.teclas.s = true;
    if (event.key === 'ArrowLeft')  this.teclas.a = true;
    if (event.key === 'ArrowRight') this.teclas.d = true;
  }
 
  // ── TECLADO: keyup ────────────────────────────────────────────────────────────
  onKeyUp(event) {
    var codigo = event.which || event.keyCode;
    var tecla  = String.fromCharCode(codigo).toLowerCase();
 
    switch (tecla) {
      case 'w': this.teclas.w = false; break;
      case 's': this.teclas.s = false; break;
      case 'a': this.teclas.a = false; break;
      case 'd': this.teclas.d = false; break;
    }
    if (event.key === 'ArrowUp')    this.teclas.w = false;
    if (event.key === 'ArrowDown')  this.teclas.s = false;
    if (event.key === 'ArrowLeft')  this.teclas.a = false;
    if (event.key === 'ArrowRight') this.teclas.d = false;
  }
 
  // ── RATÓN: click (recoger pick-ups / abrir puerta) ────────────────────────────
  // Usa Raycaster construido una sola vez
  onMouseDown(event) {
    // Solo botón izquierdo
    if ((event.which || event.button) !== 1) return;
 
    // Solo si el ratón está capturado
    if (!this.controls.isLocked) return;
 
    // En primera persona el jugador siempre mira al centro de pantalla
    // → el rayo sale desde (0,0) en NDC
    this.vecMouse.set(0, 0);
    this.raycaster.setFromCamera(this.vecMouse, this.camera);
 
    // ── Comprobar clic en el pomo de la puerta ────────────────────────────
    var impactosPuerta = this.raycaster.intersectObject(this.puerta, true);
    
    if (impactosPuerta.length > 0) {
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
    // intersectObjects busca en los objetos indicados y sus descendientes
    var objetos = this.pickups.filter(p => !p.recogido).map(p => p.objeto);
    var impactos = this.raycaster.intersectObjects(objetos, true);
 
    if (impactos.length > 0) {
      var meshClicado = impactos[0].object;
 
      // Usamos userData para acceder a la raíz del pick-up
      // En cada Mesh de los pick-ups, userData debe apuntar al Object3D raíz
      var raiz = meshClicado.userData || meshClicado;
 
      // Buscamos el pick-up cuya jerarquía contiene el mesh clicado
      var pickup = this.pickups.find(p => {
        var enc = false;
        p.objeto.traverse((n) => { if (n === meshClicado) enc = true; });
        return enc;
      });
 
      if (pickup && !pickup.recogido) {
        this.recogerPickup(pickup);
      }
    }
  }
 
  // ── RECOGER PICK-UP ───────────────────────────────────────────────────────────
  recogerPickup(pickup) {
    if (pickup.recogido) return;
  
    pickup.recogido = true;
    pickup.objeto.visible = false;
  
    this.inventario[pickup.id] = true;
  
    const recogidos = this.pickups.filter(p => p.recogido).length;
    const total = this.pickups.length;
  
    if (pickup.id === 'llave') {
      this.mostrarMensaje(`Llave recogida (${recogidos}/${total}).`);
    } else {
      this.mostrarMensaje(`${pickup.nombre} recogido (${recogidos}/${total}).`);
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
  // Velocidad independiente del ordenador: e = v · Δt
  // Colisiones con Raycaster
  // moverJugador() {
  //   if (!this.controls.isLocked) return;
 
  //   // Δt en segundos desde el último frame
  //   var dt = this.reloj.getDelta();
 
  //   // Obtenemos la dirección en la que mira el jugador
  //   // Reutilizamos this.dirMirada para no crear objetos en cada frame
  //   this.controls.getDirection(this.dirMirada);
  //   this.dirMirada.y = 0;        // sin componente vertical → no volar
  //   this.dirMirada.normalize();
 
  //   // Calculamos el desplazamiento deseado
  //   var avance  = 0;
  //   var lateral = 0;
  //   if (this.teclas.w) avance  += this.velocidad * dt;
  //   if (this.teclas.s) avance  -= this.velocidad * dt;
  //   if (this.teclas.a) lateral -= this.velocidad * dt;
  //   if (this.teclas.d) lateral += this.velocidad * dt;
 
  //   // ── Detección de colisiones por raycasting ────────
  //   // Lanzamos un rayo en la dirección de movimiento antes de moverse.
  //   // Si el rayo impacta con una pared dentro de la distancia de seguridad,
  //   // no se mueve en esa dirección.
  //   this.camera.getWorldPosition(this.posJugador);
 
  //   if (avance !== 0) {
  //     // Rayo hacia delante/atrás
  //     var dirAvance = this.dirMirada.clone().multiplyScalar(Math.sign(avance));
  //     this.raycaster.set(this.posJugador, dirAvance);
  //     this.raycaster.far = 0.5;   // distancia de seguridad = 50cm
  //     var impactosAvance = this.raycaster.intersectObjects(
  //       this.laberinto.getParedes().map(p => p.mesh), false
  //     );
  //     if (impactosAvance.length === 0) {
  //       this.controls.moveForward(avance);
  //     }
  //   }
 
  //   if (lateral !== 0) {
  //     // Vector lateral: perpendicular a la dirección de mirada
  //     var dirLateral = new THREE.Vector3();
  //     dirLateral.crossVectors(this.dirMirada, new THREE.Vector3(0, 1, 0)).normalize();
  //     var dirRayo = dirLateral.clone().multiplyScalar(Math.sign(lateral));
  //     this.raycaster.set(this.posJugador, dirRayo);
  //     this.raycaster.far = 0.5;
  //     var impactosLateral = this.raycaster.intersectObjects(
  //       this.laberinto.getParedes().map(p => p.mesh), true
  //     );
  //     if (impactosLateral.length === 0) {
  //       this.camera.position.addScaledVector(dirLateral, lateral);
  //     }
  //   }
 
  //   // Restauramos far del raycaster para el picking
  //   this.raycaster.far = 2.5;
 
  //   // Mantenemos la altura fija a 1.75m
  //   this.camera.position.y = 1.75;
  // }
  
  moverJugador() {
    if (!this.controls.isLocked) return;
  
    var dt = this.reloj.getDelta();
  
    // Dirección de mirada horizontal robusta.
    // No usamos directamente getDirection().y = 0 porque si miras
    // completamente arriba/abajo puede quedar vector casi nulo.
    this.controls.getDirection(this.dirMirada);
  
    var dirHorizontal = new THREE.Vector3(
      this.dirMirada.x,
      0,
      this.dirMirada.z
    );
  
    if (dirHorizontal.lengthSq() < 0.000001) {
      // Si estás mirando casi perfectamente hacia arriba/abajo,
      // usamos la orientación horizontal de la cámara.
      dirHorizontal.set(0, 0, -1);
      dirHorizontal.applyQuaternion(this.camera.quaternion);
      dirHorizontal.y = 0;
    }
  
    dirHorizontal.normalize();
  
    var dirLateral = new THREE.Vector3()
      .crossVectors(dirHorizontal, new THREE.Vector3(0, 1, 0))
      .normalize();
  
    var avance = 0;
    var lateral = 0;
  
    if (this.teclas.w) avance  += this.velocidad * dt;
    if (this.teclas.s) avance  -= this.velocidad * dt;
    if (this.teclas.a) lateral -= this.velocidad * dt;
    if (this.teclas.d) lateral += this.velocidad * dt;
  
    var radioJugador = 0.32;
  
    // Movimiento por ejes separados: permite deslizarse por paredes
    // en vez de quedarse bloqueado completamente.
    var nuevaX = this.camera.position.x;
    var nuevaZ = this.camera.position.z;
  
    // Avance / retroceso
    if (avance !== 0) {
      var xAvance = nuevaX + dirHorizontal.x * avance;
      var zAvance = nuevaZ + dirHorizontal.z * avance;
  
      if (!this.laberinto.hayColision(xAvance, zAvance, radioJugador)) {
        nuevaX = xAvance;
        nuevaZ = zAvance;
      }
    }
  
    // Movimiento lateral
    if (lateral !== 0) {
      var xLateral = nuevaX + dirLateral.x * lateral;
      var zLateral = nuevaZ + dirLateral.z * lateral;
  
      if (!this.laberinto.hayColision(xLateral, zLateral, radioJugador)) {
        nuevaX = xLateral;
        nuevaZ = zLateral;
      }
    }
  
    this.camera.position.x = nuevaX;
    this.camera.position.z = nuevaZ;
    this.camera.position.y = 1.75;
  }

  
  // ── RENDERIZADO CON VIEWPORTS  ───────────────────────────────
  // Método reutilizable para renderizar una cámara en un viewport concreto.
  // left, top, width, height toman valores entre 0 y 1 (proporciones de pantalla)
  renderViewport(camara, left, top, width, height) {
    var l = left   * window.innerWidth;
    var t = top    * window.innerHeight;
    var w = width  * window.innerWidth;
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
      var tam = this.laberinto.mapa[0].length * this.laberinto.tamCelda / 2;
      var ratio = window.innerWidth / window.innerHeight;
      this.camaraTop.left   = -tam * ratio;
      this.camaraTop.right  =  tam * ratio;
      this.camaraTop.top    =  tam;
      this.camaraTop.bottom = -tam;
      this.camaraTop.updateProjectionMatrix();
    }

    // Y también el tamaño del renderizador
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── UPDATE ────────────────────────────────────────────────────────────────────
  update() {
    // 1. Mover jugador con detección de colisiones
    this.moverJugador();
 
    // 2. Actualizar Tween (PDF Animación p.19)
    //    "Solo hay que llamarla una vez por frame"
    TWEEN.update();
 
    // 3. Actualizar objetos animados
    this.puerta.update();
    this.pickups.forEach(p => {
      if (!p.recogido && p.objeto.update) p.objeto.update();
    });
 
    // 4. Renderizar vista principal (pantalla completa)
    this.renderViewport(this.camera, 0, 0, 1, 1);
 
    // 5. Renderizar minimapa (esquina inferiror derecha, 25% de pantalla)
    this.renderViewport(this.camaraTop, 0.75, 0, 0.25, 0.25);
 
    // 6. Siguiente frame
    requestAnimationFrame(() => this.update());
  }
}

/// La función   main
$(function () {
  // Se instancia la escena pasándole el  div  que se ha creado en el html para visualizar
  var scene = new MyScene("#WebGL-output");

  // Se añaden los listener de la aplicación. En este caso, el que va a comprobar cuándo se modifica el tamaño de la ventana de la aplicación.
  window.addEventListener("resize", () => scene.onWindowResize());

  // Que no se nos olvide, la primera visualización.
  scene.update();
});