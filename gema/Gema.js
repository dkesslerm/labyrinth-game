import * as THREE from "three";
import {
  Brush,
  Evaluator,
  ADDITION,
  SUBTRACTION,
} from "../libs/three-bvh-csg.js";

export function createGem() {
  const group = new THREE.Group();
  const evaluator = new Evaluator();
  evaluator.useGroups = false;

  const gemMat = new THREE.MeshPhysicalMaterial({
    color: 0x9ad8c1,
    roughness: 0.04,
    metalness: 0.0,
    transmission: 0.9,
    thickness: 1.0,
    ior: 1.58,
    attenuationColor: 0x72c7ab,
    attenuationDistance: 1.0,
    clearcoat: 0.3,
    clearcoatRoughness: 0.02,
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

  const gemProfile = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(1.5, 2),
    new THREE.Vector2(0, 4),
  ];

  const gemGeo = new THREE.LatheGeometry(gemProfile, 8);
  gemGeo.translate(0, -2, 0);
  let gemBrush = makeBrush(gemGeo, gemMat);

  // -------------------------------------------------
  // 7) Final assembly
  // -------------------------------------------------
  const gemMesh = new THREE.Mesh(gemBrush.geometry, gemMat);
  gemMesh.castShadow = true;
  gemMesh.receiveShadow = true;

  group.add(gemMesh);
  return group;
}
