import * as THREE from 'three';
import { add, part, type SceneKit } from './scene-kit';

// Scene units, roughly metres at 1:1. The motor group's origin is the shaft axis.
export const AXIS_Y = 0.4; // shaft height above the bench top
export const FRAME_R = 0.26; // frame core radius
export const BRAKE_X = 0.82; // brake drum centre along the shaft
export const BRAKE_R = 0.16; // brake drum radius

const FIN_N = 28;
const FIN_H = 0.075;
const TAU = Math.PI * 2;

export interface MotorRig {
  root: THREE.Group; // fixed frame, bearings, fan cover, stator; sits on the shaft axis
  spin: THREE.Group; // shaft, coupling, drum, fan blades, rotor; turns with the speed
  stator: THREE.Group;
  rotor: THREE.Group;
}

export function buildMotor(kit: SceneKit): MotorRig {
  const root = new THREE.Group();
  root.position.y = AXIS_Y;

  // Frame: solid core, ribs, end shields, terminal box, bearings
  const frame = part(root, 'housing');
  const frameMat = kit.mat('housing', '#5d7d92', { roughness: 0.5, metalness: 0.25 });
  const boltMat = kit.mat('housing', '#9ca3af', { roughness: 0.35, metalness: 0.8 });
  add(frame, kit.cylX(FRAME_R, 1, 48), frameMat);
  const fins = kit.inst(kit.box(1, FIN_H, 0.014), frameMat, FIN_N);
  for (let i = 0; i < FIN_N; i++) {
    const a = (i / FIN_N) * TAU;
    const r = FRAME_R + FIN_H / 2;
    kit.place(fins, i, 0, r * Math.cos(a), r * Math.sin(a), a);
  }
  frame.add(fins);
  for (const s of [-1, 1]) add(frame, kit.cylX(0.27, 0.04, 48), frameMat, s * 0.52);

  // Joint bolts round both end shields
  const shieldBolts = kit.inst(kit.cylX(0.012, 0.03, 8), boltMat, 16);
  for (let i = 0; i < 16; i++) {
    const a = ((i % 8) / 8) * TAU;
    kit.place(shieldBolts, i, i < 8 ? 0.545 : -0.545, 0.245 * Math.cos(a), 0.245 * Math.sin(a));
  }
  frame.add(shieldBolts);

  // Terminal box on top, with a cover, four cover bolts, a cable gland and a visible cable run
  const term = part(root, 'terminal_box');
  const termMat = kit.mat('terminal_box', '#334155', { roughness: 0.6, metalness: 0.2 });
  const termMetal = kit.mat('terminal_box', '#9ca3af', { roughness: 0.35, metalness: 0.8 });
  add(term, kit.box(0.3, 0.12, 0.16), termMat, -0.2, 0.38, 0);
  add(term, kit.box(0.31, 0.03, 0.17), termMat, -0.2, 0.46, 0);
  const coverBolts = kit.inst(kit.cylY(0.012, 0.02, 8), termMetal, 4);
  [
    [-0.32, -0.06],
    [-0.08, -0.06],
    [-0.32, 0.06],
    [-0.08, 0.06],
  ].forEach(([x, z], i) => kit.place(coverBolts, i, x, 0.48, z));
  term.add(coverBolts);
  add(term, kit.cylZ(0.022, 0.05, 16), termMetal, -0.2, 0.38, 0.105);
  const cable = kit.mat('terminal_box', '#1f2937', { roughness: 0.8 });
  const cableRun = [
    new THREE.Vector3(-0.2, 0.38, 0.13),
    new THREE.Vector3(-0.2, 0.3, 0.27),
    new THREE.Vector3(-0.2, 0.05, 0.37),
    new THREE.Vector3(-0.2, -0.2, 0.43),
    new THREE.Vector3(-0.2, -0.34, 0.45),
  ];
  add(term, kit.tube(cableRun, 0.012, 64), cable);

  // Bearing housings at both ends. The drive end (+X) carries the coupling.
  for (const [id, s] of [
    ['bearing_de', 1],
    ['bearing_nde', -1],
  ] as const) {
    const g = part(root, id);
    const m = kit.mat(id, '#c7ccd3', { roughness: 0.3, metalness: 0.8 });
    add(g, kit.cylX(0.075, 0.06, 32), m, s * 0.57);
    add(g, kit.cylX(0.085, 0.02, 32), m, s * 0.61);
  }

  // Rear fan cover: an open grille of ribs with rims and spokes, so the blades show through it
  const fan = part(root, 'fan');
  const coverMat = kit.mat('fan', '#3f4650', { roughness: 0.5, metalness: 0.2 });
  const ribs = kit.inst(kit.box(0.26, 0.02, 0.04), coverMat, 12);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU;
    kit.place(ribs, i, -0.69, 0.31 * Math.cos(a), 0.31 * Math.sin(a), a);
  }
  fan.add(ribs);
  add(fan, kit.torusX(0.31, 0.012), coverMat, -0.56);
  add(fan, kit.torusX(0.31, 0.012), coverMat, -0.82);
  const spokes = kit.inst(kit.box(0.012, 0.62, 0.02), coverMat, 4);
  for (let i = 0; i < 4; i++) kit.place(spokes, i, -0.82, 0, 0, (i / 4) * Math.PI);
  fan.add(spokes);

  // Stator: a laminated stack with teeth on the bore and copper coil ends on both faces (cutaway only)
  const stator = part(root, 'stator');
  const statorMat = kit.mat('stator', '#8e96a3', { roughness: 0.45, metalness: 0.6, side: THREE.DoubleSide });
  const copperMat = kit.mat('stator', '#b87333', { roughness: 0.35, metalness: 0.8 });
  const lamination = new THREE.LatheGeometry(
    [
      new THREE.Vector2(0.135, -0.25),
      new THREE.Vector2(0.22, -0.25),
      new THREE.Vector2(0.22, 0.25),
      new THREE.Vector2(0.135, 0.25),
      new THREE.Vector2(0.135, -0.25),
    ],
    48,
  );
  add(stator, kit.geo(lamination.rotateZ(-Math.PI / 2)), statorMat);
  const teeth = kit.inst(kit.box(0.5, 0.012, 0.02), statorMat, 36);
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU;
    kit.place(teeth, i, 0, 0.129 * Math.cos(a), 0.129 * Math.sin(a), a);
  }
  stator.add(teeth);
  for (const s of [-1, 1]) {
    const coils = kit.inst(kit.box(0.05, 0.05, 0.03), copperMat, 36);
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      kit.place(coils, i, s * 0.275, 0.18 * Math.cos(a), 0.18 * Math.sin(a), a);
    }
    stator.add(coils);
  }

  // Spinning group: shaft with key, coupling, brake drum, fan blades and the squirrel-cage rotor
  const spin = new THREE.Group();
  root.add(spin);
  const shaftMat = kit.mat('shaft', '#d7dbe0', { roughness: 0.3, metalness: 1 });
  const shaft = part(spin, 'shaft');
  add(shaft, kit.cylX(0.03, 1.85, 16), shaftMat, 0.075);
  add(shaft, kit.box(0.14, 0.012, 0.02), shaftMat, 0.92, 0.036, 0);
  add(shaft, kit.cylX(0.07, 0.05, 32), shaftMat, 0.655); // coupling flange
  add(shaft, kit.cylX(0.055, 0.06, 32), shaftMat, 0.71); // coupling hub

  const drum = part(spin, 'brake_drum');
  const drumMat = kit.mat('brake_drum', '#6b7280', { roughness: 0.4, metalness: 0.5 });
  const stripeMat = kit.mat('brake_drum', '#e5e7eb', { roughness: 0.5 });
  add(drum, kit.cylX(BRAKE_R, 0.12, 48), drumMat, BRAKE_X);
  add(drum, kit.box(0.12, 0.02, 0.035), stripeMat, BRAKE_X, BRAKE_R, 0);
  add(drum, kit.box(0.12, 0.02, 0.035), stripeMat, BRAKE_X, -BRAKE_R, 0);

  const fanSpin = part(spin, 'fan');
  add(fanSpin, kit.cylX(0.05, 0.06, 24), coverMat, -0.66);
  const blades = kit.inst(kit.box(0.03, 0.1, 0.02), coverMat, 8);
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU;
    kit.place(blades, i, -0.66, 0.1 * Math.cos(a), 0.1 * Math.sin(a), a);
  }
  fanSpin.add(blades);

  const rotor = part(spin, 'rotor');
  const rotorMat = kit.mat('rotor', '#a1a9b4', { roughness: 0.45, metalness: 0.6 });
  const alMat = kit.mat('rotor', '#d1d5db', { roughness: 0.35, metalness: 0.8 });
  add(rotor, kit.cylX(0.118, 0.5, 48), rotorMat);
  const bars = kit.inst(kit.cylX(0.008, 0.52, 8), alMat, 28);
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * TAU;
    kit.place(bars, i, 0, 0.113 * Math.cos(a), 0.113 * Math.sin(a));
  }
  rotor.add(bars);
  add(rotor, kit.torusX(0.113, 0.008, 8, 48), alMat, -0.26);
  add(rotor, kit.torusX(0.113, 0.008, 8, 48), alMat, 0.26);

  return { root, spin, stator, rotor };
}
