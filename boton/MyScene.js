import * as THREE from 'three'
import { GUI } from 'gui'
import { TrackballControls } from 'trackball'
import { Boton } from './Boton.js'

// ─────────────────────────────────────────────────────────────────────────────
// Escena de prueba independiente para el Botón
// ─────────────────────────────────────────────────────────────────────────────

class MyScene extends THREE.Scene {
  constructor(myCanvas) {
    super();

    this.renderer = this.createRenderer(myCanvas);
    this.gui      = this.createGUI();

    this.createLights();
    this.createCamera();
    this.createModel();

    this.reloj = new THREE.Clock();
  }

  // ── Renderer ───────────────────────────────────────────────────────────────
  createRenderer(myCanvas) {
    // Se recibe el lienzo sobre el que se van a hacer los renderizados. Un div definido en el html.

    // Se instancia un Renderer   WebGL
    var renderer = new THREE.WebGLRenderer();

    // Se establece un color de fondo en las imágenes que genera el render
    renderer.setClearColor(new THREE.Color(0xeeeeee), 1.0);

    // Se establece el tamaño, se aprovecha la totalidad de la ventana del navegador
    renderer.setSize(window.innerWidth, window.innerHeight);

    // La visualización se muestra en el lienzo recibido
    $(myCanvas).append(renderer.domElement);

    return renderer;
  }

  // ── Cámara + TrackballControls ─────────────────────────────────────────────
  createCamera() {
    this.camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.01,
      100
    );
    this.camera.position.set(0.3, 0.35, 0.55);
    this.camera.lookAt(0, 0.08, 0);
    this.add(this.camera);

    this.trackball = new TrackballControls(
      this.camera,
      this.renderer.domElement
    );
    this.trackball.rotateSpeed = 3.0;
    this.trackball.zoomSpeed   = 1.2;
    this.trackball.panSpeed    = 0.8;
    this.trackball.target.set(0, 0.08, 0);
  }

  // ── GUI ────────────────────────────────────────────────────────────────────
  createGUI() {
    return new GUI();
  }

  // ── Luces ──────────────────────────────────────────────────────────────────
  createLights() {
    // Luz ambiental suave para que el metal no quede negro en las sombras
    var ambientLight = new THREE.AmbientLight(0xfff0e0, 0.6);
    this.add(ambientLight);

    // Luz principal: desde arriba-delante-derecha
    var dirLight = new THREE.DirectionalLight(0xffeedd, 1.8);
    dirLight.position.set(0.6, 1.2, 0.8);
    dirLight.castShadow = true;
    this.add(dirLight);

    // Contraluz fría para remarcar perfiles del metal
    var backLight = new THREE.DirectionalLight(0x8899cc, 0.5);
    backLight.position.set(-0.8, 0.4, -0.6);
    this.add(backLight);

    // Luz desde abajo: simula rebote en el suelo
    var fillLight = new THREE.PointLight(0xffd080, 0.4, 2.0);
    fillLight.position.set(0, -0.1, 0.2);
    this.add(fillLight);
  }

  // ── Modelo: Botón + plano base ─────────────────────────────────────────────
  createModel() {
    // El botón
    this.boton = new Boton(this.gui, 'Botón');
    this.boton.position.set(0, 0, 0);
    this.add(this.boton);
  }

  // ── Resize ─────────────────────────────────────────────────────────────────
  setCameraAspect(ratio) {
    this.camera.aspect = ratio;
    this.camera.updateProjectionMatrix();
  }

  onWindowResize() {
    this.setCameraAspect(window.innerWidth / window.innerHeight);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // ── Update / render loop ───────────────────────────────────────────────────
  update() {
    this.boton.update();
    this.trackball.update();
    this.renderer.render(this, this.camera);
    requestAnimationFrame(() => this.update());
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────
$(function () {
  var scene = new MyScene('#WebGL-output');
  window.addEventListener('resize', () => scene.onWindowResize());
  scene.update();
});