import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
} from "../libs/three-bvh-csg.js";

export function createIndianaHat() {
  const group = new THREE.Group();
  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  const hatMat = new THREE.MeshStandardMaterial({
    color: 0x6a4528,
    roughness: 0.95,
    metalness: 0.02,
    side: THREE.DoubleSide,
  });

  const bandMat = new THREE.MeshStandardMaterial({
    color: 0x2f1c10,
    roughness: 0.92,
    metalness: 0.01,
  });

  function makeBrush(geometry, material) {
    geometry.computeVertexNormals();
    const brush = new Brush(geometry, material);
    brush.updateMatrixWorld(true);
    return brush;
  }

  // -------------------------------------------------
  // 1) CROWN — lathe revolution
  //    Tapers to a narrow ring at top (r=0.42) so the
  //    apex is open and shapeable by CSG.
  // -------------------------------------------------
  var topHat = 2.5;

  const crownProfile = [
    new THREE.Vector2(1.68, 0.0), // Base stays at 0
    new THREE.Vector2(1.68, 0.1), // Slightly lowered from 0.12
    new THREE.Vector2(1.68, 0.3), // Slightly lowered from 0.38
    new THREE.Vector2(1.65, 0.83), // Lowered from 1.05
    new THREE.Vector2(1.56, 1.5), // Lowered from 1.9
    new THREE.Vector2(1.35, 2.0), // Lowered from 2.52
    new THREE.Vector2(1.05, 2.3), // Lowered from 2.9
    new THREE.Vector2(0.72, 2.42), // Lowered from 3.08
    new THREE.Vector2(0.42, topHat),
    new THREE.Vector2(0.0, topHat),
  ];

  const crownGeo = new THREE.LatheGeometry(crownProfile, 96);
  crownGeo.translate(0, 0.28, 0);
  let crownBrush = makeBrush(crownGeo, hatMat);

  // -------------------------------------------------
  // 2) BRIM — lathe revolution
  // -------------------------------------------------
  const brimProfile = [
    new THREE.Vector2(1.68, 0.02),
    new THREE.Vector2(1.72, 0.0),
    new THREE.Vector2(1.9, -0.06),
    new THREE.Vector2(2.25, -0.14),
    new THREE.Vector2(2.6, -0.24),
    new THREE.Vector2(2.9, -0.32),
    new THREE.Vector2(3.1, -0.35),
    new THREE.Vector2(3.18, -0.3),
    new THREE.Vector2(3.02, -0.26),
    new THREE.Vector2(2.65, -0.18),
    new THREE.Vector2(2.2, -0.08),
    new THREE.Vector2(1.65, -0.01),
  ];

  const brimGeo = new THREE.LatheGeometry(brimProfile, 128);
  brimGeo.translate(0, 0.28, 0);
  let brimBrush = makeBrush(brimGeo, hatMat);

  let hatBrush = evaluator.evaluate(crownBrush, brimBrush, ADDITION);
  hatBrush.material = hatMat;

  // -------------------------------------------------
  // 3) ELLIPTICAL CROWN DIP — CSG subtraction
  //    This is the key new addition. A SphereGeometry
  //    scaled into a flat ellipsoid:
  //      X (left-right): narrow  → dip doesn't spread sideways
  //      Y (up-down):    thin    → only shaves the apex, doesn't
  //                                eat into the crown body
  //      Z (front-back): wide    → elongates the dip front-to-back
  //    Positioned so its equator sits at the crown apex,
  //    meaning the bottom half of the ellipsoid carves
  //    the saddle and the top half exits above the hat.
  //    Result: a smooth elliptical concave indent that
  //    runs front-to-back — the classic fedora teardrop.
  // -------------------------------------------------
  const apexY = topHat + 0.28; // crown profile top + translate offset

  const dipGeo = new THREE.SphereGeometry(1.0, 48, 32);
  dipGeo.scale(
    1, // X narrow  — controls left-right width of the dip
    0.7, // Y thin    — controls how deep it cuts downward
    1.5, // Z wide    — elongates the dip front-to-back
  );
  // Place equator at apex so the lower hemisphere carves the indent
  dipGeo.translate(0, apexY, 0);

  const dipBrush = makeBrush(dipGeo, hatMat);
  hatBrush = evaluator.evaluate(hatBrush, dipBrush, SUBTRACTION);
  hatBrush.material = hatMat;

  // -------------------------------------------------
  // 6) HAT BAND — lathe revolution
  // -------------------------------------------------
  const bandProfile = [
    new THREE.Vector2(1.66, 0.0),
    new THREE.Vector2(1.72, 0.0),
    new THREE.Vector2(1.72, 0.2),
    new THREE.Vector2(1.66, 0.2),
  ];
  const bandGeo = new THREE.LatheGeometry(bandProfile, 96);
  bandGeo.translate(0, 0.5, 0);
  const bandMesh = new THREE.Mesh(bandGeo, bandMat);
  bandMesh.castShadow = true;
  bandMesh.receiveShadow = true;

  // -------------------------------------------------
  // 7) Final assembly
  // -------------------------------------------------
  const hatMesh = new THREE.Mesh(hatBrush.geometry, hatMat);
  hatMesh.castShadow = true;
  hatMesh.receiveShadow = true;

  group.add(hatMesh, bandMesh);
  return group;
}
