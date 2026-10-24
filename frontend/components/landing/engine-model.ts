import * as THREE from 'three';

// A procedural four-cylinder inline engine, built from primitives and lathes. No model files.
// The crank turns about X and the bores run up Y, as in the reference images.
// Units are loose: one unit is about one bore radius.

const CYL_X = [-1.8, -0.6, 0.6, 1.8]; // cylinders, and the crank pin under each
const MAIN_X = [-2.4, -1.2, 0, 1.2, 2.4]; // five main bearings
const PIN_PHASE = [0, Math.PI, Math.PI, 0]; // crank pin angles, 0-180-180-0
const FLANGE_X = 2.7;
const NUB_X = -2.95;
const THROW = 0.5; // half the stroke
const ROD = 2.2; // centre to centre of a rod
const BLOCK_BOTTOM = -0.9;
const BLOCK_TOP = 2.9;
const CUT_Z = 0.15; // the block is cut away in front of this plane
const SPREAD = 0.45; // exploded: crank parts and cylinders move out along X in proportion to x
const PISTON_LIFT = 2.2; // exploded: pistons rise out of their bores
const HEAD_LIFT = 2.4; // exploded: cylinder heads lift off the block
const BLOCK_LIFT = 3.4; // exploded: the smoked housing lifts away and fades

export type Engine = {
  root: THREE.Group;
  // Places every part for a crank angle (radians) and an explode amount, 0 assembled to 1 apart.
  pose: (crank: number, explode: number) => void;
  dispose: () => void;
};

const V = (x: number, y: number) => new THREE.Vector2(x, y);

// Turns a Y-axis cylinder so its axis runs along X.
const alongX = <G extends THREE.BufferGeometry>(g: G): G => g.rotateZ(Math.PI / 2);

// A crank web in the plane of the crank: a cam with a boss at the pin and a counterweight opposite it.
function web(phase: number): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  const n = 72;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const c = Math.cos(a - phase);
    const r = 0.42 + 0.38 * Math.max(0, c) ** 2 + 0.14 * Math.max(0, -c) ** 2;
    // Shape x runs along -Z and shape y along Y, so the extrusion below lies along X.
    if (i === 0) shape.moveTo(-r * Math.sin(a), r * Math.cos(a));
    else shape.lineTo(-r * Math.sin(a), r * Math.cos(a));
  }
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: 0.2,
    bevelEnabled: true,
    bevelSize: 0.03,
    bevelThickness: 0.03,
    bevelSegments: 2,
    curveSegments: 1,
  });
  return g.translate(0, 0, -0.1).rotateY(Math.PI / 2);
}

// The connecting rod plate: thin across the crank axis, wide in the plane it swings in.
// Big end at y = 0, small end at y = ROD.
function rodPlate(): THREE.BufferGeometry {
  const s = new THREE.Shape();
  s.moveTo(-0.18, 0);
  s.lineTo(0.18, 0);
  s.lineTo(0.12, 0.8);
  s.lineTo(0.1, ROD - 0.5);
  s.lineTo(0.13, ROD);
  s.lineTo(-0.13, ROD);
  s.lineTo(-0.1, ROD - 0.5);
  s.lineTo(-0.12, 0.8);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.16, bevelEnabled: false });
  return g.translate(0, 0, -0.08).rotateY(Math.PI / 2);
}

// Cooling fins on the head: a bore whose outer wall has ribs.
function headSleeve(): THREE.BufferGeometry {
  const pts = [V(0.56, BLOCK_TOP), V(0.66, BLOCK_TOP)];
  for (let k = 0; k < 8; k++) {
    const y = BLOCK_TOP + 0.08 + k * 0.11;
    pts.push(V(0.66, y), V(0.94, y), V(0.94, y + 0.05), V(0.66, y + 0.05));
  }
  pts.push(V(0.66, 3.9), V(0.56, 3.9), V(0.56, BLOCK_TOP));
  return new THREE.LatheGeometry(pts, 40);
}

export function buildEngine(): Engine {
  const root = new THREE.Group();
  const materials: THREE.Material[] = [];
  const mat = (color: string, p: THREE.MeshPhysicalMaterialParameters = {}) => {
    const m = new THREE.MeshPhysicalMaterial({ color, ...p });
    materials.push(m);
    return m;
  };
  const cut = new THREE.Plane(new THREE.Vector3(0, 0, -1), CUT_Z); // keeps z <= CUT_Z

  // Crank in amber clearcoat, webs in a deeper red. Pistons brushed silver, rods dark steel, block smoked.
  const amber = mat('#d97706', { roughness: 0.38, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
  const red = mat('#b4311f', { roughness: 0.38, metalness: 0.2, clearcoat: 1, clearcoatRoughness: 0.12 });
  const silver = mat('#d8dce2', { roughness: 0.3, metalness: 1 });
  const ringMetal = mat('#8a9099', { roughness: 0.35, metalness: 1 });
  const steel = mat('#3b414b', { roughness: 0.42, metalness: 0.8 });
  const bushing = mat('#b3bac3', { roughness: 0.25, metalness: 1 });
  const alloy = mat('#8d949e', { roughness: 0.45, metalness: 0.7 });
  const alloyCut = mat('#8d949e', { roughness: 0.45, metalness: 0.7, clippingPlanes: [cut] });
  const smoke = mat('#2b2f36', {
    roughness: 0.1,
    clearcoat: 1,
    transparent: true,
    opacity: 0.26,
    depthWrite: false,
    clippingPlanes: [cut],
  });
  const smokeInside = mat('#15181d', {
    roughness: 0.6,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.BackSide,
    clippingPlanes: [cut],
  });
  const edgeMat = new THREE.LineBasicMaterial({
    color: '#f59e0b',
    transparent: true,
    opacity: 0.75,
    clippingPlanes: [cut],
  });
  materials.push(edgeMat);

  const at = (parent: THREE.Object3D, geo: THREE.BufferGeometry, m: THREE.Material, x = 0, y = 0, z = 0) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };

  // Geometry, shared by every part of its kind.
  const mainGeo = alongX(new THREE.CylinderGeometry(0.3, 0.3, 0.56, 32));
  const pinGeo = alongX(new THREE.CylinderGeometry(0.28, 0.28, 0.8, 32));
  const nubGeo = alongX(new THREE.CylinderGeometry(0.2, 0.2, 0.9, 32));
  const flangeGeo = alongX(new THREE.CylinderGeometry(0.75, 0.75, 0.14, 48));
  const boltGeo = alongX(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 12));
  const bigEndGeo = alongX(new THREE.CylinderGeometry(0.34, 0.34, 0.36, 32));
  const smallEndGeo = alongX(new THREE.CylinderGeometry(0.2, 0.2, 0.22, 32));
  const wristGeo = alongX(new THREE.CylinderGeometry(0.1, 0.1, 0.9, 16));
  const plateGeo = rodPlate();
  const pistonGeo = new THREE.LatheGeometry(
    [V(0, -0.2), V(0.4, -0.2), V(0.4, -0.58), V(0.46, -0.58), V(0.5, -0.5), V(0.5, 0.54), V(0.46, 0.6), V(0, 0.6)],
    48,
  );
  const ringGeo = new THREE.TorusGeometry(0.49, 0.025, 8, 48).rotateX(Math.PI / 2);
  const linerGeo = new THREE.LatheGeometry([V(0.56, 0.95), V(0.66, 0.95), V(0.66, BLOCK_TOP), V(0.56, BLOCK_TOP), V(0.56, 0.95)], 40);
  const headGeo = headSleeve();
  const blockGeo = new THREE.BoxGeometry(5.1, BLOCK_TOP - BLOCK_BOTTOM, 1.9);
  const blockY = (BLOCK_TOP + BLOCK_BOTTOM) / 2;

  // Crank: five mains, four throws (pin plus two webs), a flange and a nub. Each segment sits on the crank axis.
  const mains = MAIN_X.map((x) => {
    const g = new THREE.Group();
    at(g, mainGeo, amber);
    root.add(g);
    return { g, x };
  });
  const throws = CYL_X.map((x, i) => {
    const g = new THREE.Group();
    const phase = PIN_PHASE[i];
    at(g, pinGeo, amber, 0, THROW * Math.cos(phase), THROW * Math.sin(phase));
    const cheek = web(phase);
    at(g, cheek, red, -0.3);
    at(g, cheek, red, 0.3);
    root.add(g);
    return { g, x };
  });
  const flange = new THREE.Group();
  at(flange, flangeGeo, red);
  for (let k = 0; k < 6; k++) {
    const t = (k / 6) * Math.PI * 2;
    at(flange, boltGeo, red, 0, 0.56 * Math.cos(t), 0.56 * Math.sin(t));
  }
  root.add(flange);
  const nub = new THREE.Group();
  at(nub, nubGeo, amber);
  root.add(nub);

  // Block: a smoked shell cut away at the front, with the inside showing through and an amber edge.
  // It has its own group so it can lift away when the engine comes apart.
  const housing = new THREE.Group();
  root.add(housing);
  at(housing, blockGeo, smoke, 0, blockY, 0).renderOrder = 2;
  at(housing, blockGeo, smokeInside, 0, blockY, 0).renderOrder = 1;
  const edges = new THREE.LineSegments(new THREE.EdgesGeometry(blockGeo), edgeMat);
  edges.position.set(0, blockY, 0);
  edges.renderOrder = 3;
  housing.add(edges);

  // Rods, pistons and bores, one per cylinder.
  const rods = CYL_X.map(() => {
    const g = new THREE.Group();
    at(g, bigEndGeo, steel);
    at(g, plateGeo, steel);
    at(g, smallEndGeo, steel, 0, ROD, 0);
    at(g, wristGeo, bushing, 0, ROD, 0);
    root.add(g);
    return g;
  });
  const pistons = CYL_X.map(() => {
    const g = new THREE.Group();
    at(g, pistonGeo, silver);
    for (const y of [0.44, 0.36, 0.28]) at(g, ringGeo, ringMetal, 0, y, 0);
    root.add(g);
    return g;
  });
  const liners = CYL_X.map((x) => at(root, linerGeo, alloyCut, x, 0, 0));
  const heads = CYL_X.map((x) => at(root, headGeo, alloy, x, 0, 0));

  // Place every part for a crank angle and an explode amount.
  const pose = (crank: number, e: number) => {
    const s = 1 + SPREAD * e;
    mains.forEach(({ g, x }) => {
      g.position.x = x * s;
      g.rotation.x = crank;
    });
    throws.forEach(({ g, x }) => {
      g.position.x = x * s;
      g.rotation.x = crank;
    });
    flange.position.x = FLANGE_X * s;
    flange.rotation.x = crank;
    nub.position.x = NUB_X * s;
    nub.rotation.x = crank;
    CYL_X.forEach((x0, i) => {
      const a = PIN_PHASE[i] + crank;
      const py = THROW * Math.cos(a);
      const pz = THROW * Math.sin(a);
      const yw = py + Math.sqrt(ROD * ROD - pz * pz); // wrist pin height for this crank pin
      const x = x0 * s;
      rods[i].position.set(x, py, pz);
      rods[i].rotation.x = Math.atan2(-pz, yw - py);
      pistons[i].position.set(x, yw + PISTON_LIFT * e, 0);
      liners[i].position.x = x;
      heads[i].position.set(x, HEAD_LIFT * e, 0);
    });
    housing.position.y = BLOCK_LIFT * e;
    const fade = 1 - 0.8 * e; // the housing turns see-through as it lifts away
    smoke.opacity = 0.26 * fade;
    smokeInside.opacity = 0.5 * fade;
    edgeMat.opacity = 0.75 * fade;
  };

  const dispose = () => {
    root.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) o.geometry.dispose();
    });
    materials.forEach((m) => m.dispose());
  };

  return { root, pose, dispose };
}
