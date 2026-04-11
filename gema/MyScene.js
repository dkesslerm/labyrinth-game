import * as THREE from "three";
import { OrbitControls } from "../libs/OrbitControls.js";
import { createGem } from "./Gema.js";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xd8c5a4);

const camera = new THREE.PerspectiveCamera(
  45,
  innerWidth / innerHeight,
  0.1,
  100,
);
camera.position.set(6, 4.5, 7);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

scene.add(new THREE.HemisphereLight(0xfff0d2, 0x6b5848, 1.15));
scene.add(new THREE.AmbientLight(0xfff5e0, 0.45));
scene.add(new THREE.AxesHelper(5));

const dir = new THREE.DirectionalLight(0xffffff, 1.3);
// dir.position.set(0, -8, 0);
dir.position.set(6, 8, 5);
dir.castShadow = true;
scene.add(dir);

const gem = createGem();
scene.add(gem);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener("resize", () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});
