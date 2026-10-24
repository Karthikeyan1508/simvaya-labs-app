import * as THREE from 'three';
import type { ComponentId } from '@/lib/induction';
import { add, part, type SceneKit } from './scene-kit';
import { AXIS_Y, BRAKE_R, BRAKE_X } from './scene-housing';

export interface BenchRig {
  root: THREE.Group;
  setLoad(fraction: number): void; // loadFraction, 0 to 1.5 of rated torque
  setEstop(pressed: boolean): void;
}

const LOAD_FULL = 1.5;
const OVERLOAD = 1.25; // the backend warns above 1.25 times rated torque
const AMBER = 0xf59e0b;
const RED = 0xdc2626;

export function buildBench(kit: SceneKit): BenchRig {
  const root = new THREE.Group();

  // Bench: top and four legs
  const wood = kit.mat(null, '#8b6a4a', { roughness: 0.8, metalness: 0 });
  add(root, kit.box(3.6, 0.05, 1.9), wood, 0, -0.025, 0);
  for (const x of [-1.7, 1.7]) {
    for (const z of [-0.85, 0.85]) add(root, kit.box(0.08, 0.9, 0.08), wood, x, -0.5, z);
  }

  // Base plate, four feet that stand on it, and the bolts that hold the feet
  const base = part(root, 'feet');
  const steel = kit.mat('feet', '#2b2f36', { roughness: 0.4, metalness: 0.6 });
  add(base, kit.box(2.1, 0.04, 0.7), steel, 0.05, 0.02, 0);
  const feetInst = kit.inst(kit.box(0.2, 0.2, 0.12), steel, 4);
  const boltFeet = kit.inst(kit.cylY(0.014, 0.012, 8), kit.mat('feet', '#9ca3af', { roughness: 0.35, metalness: 0.8 }), 8);
  let f = 0;
  let b = 0;
  for (const x of [-0.38, 0.38]) {
    for (const z of [-0.2, 0.2]) {
      kit.place(feetInst, f++, x, 0.14, z);
      kit.place(boltFeet, b++, x - 0.15, 0.05, z);
      kit.place(boltFeet, b++, x + 0.15, 0.05, z);
    }
  }
  base.add(feetInst, boltFeet);

  // Supply panel on the back edge: four dials, the starter and the e-stop station
  const panel = part(root, 'supply_panel');
  const panelMat = kit.mat('supply_panel', '#27272a', { roughness: 0.5, metalness: 0.2 });
  add(panel, kit.box(1.0, 0.5, 0.04), panelMat, -0.85, 0.25, -0.85);
  const dial = kit.cylZ(0.07, 0.02, 32);
  const bezel = kit.torus(0.07, 0.008, 8, 40);
  const dials: [ComponentId, number, number][] = [
    ['voltmeter', -1.2, 0xe0f2fe],
    ['ammeter', -1.02, 0xfef9c3],
    ['wattmeter_w1', -0.84, 0xfce7f3],
    ['wattmeter_w2', -0.66, 0xfce7f3],
  ];
  for (const [id, x, face] of dials) {
    const g = part(panel, id);
    add(g, dial, kit.mat(id, face, { roughness: 0.4, metalness: 0 }), x, 0.36, -0.82);
    add(g, bezel, kit.mat(id, '#1f2937', { roughness: 0.4, metalness: 0.4 }), x, 0.36, -0.81);
  }

  const starter = part(panel, 'starter');
  add(starter, kit.box(0.2, 0.16, 0.06), kit.mat('starter', '#4b5563', { roughness: 0.5, metalness: 0.3 }), -1.2, 0.12, -0.8);
  add(starter, kit.box(0.03, 0.1, 0.03), kit.mat('starter', '#111827', { roughness: 0.5 }), -1.2, 0.12, -0.75);

  const estop = part(panel, 'estop');
  add(estop, kit.box(0.14, 0.08, 0.06), kit.mat('estop', '#facc15', { roughness: 0.5 }), -0.8, 0.12, -0.8);
  const cap = add(estop, kit.cylY(0.045, 0.03, 32), kit.mat('estop', '#dc2626', { roughness: 0.3 }), -0.8, 0.175, -0.8);
  const lampMat = kit.mat(null, 0x7f1d1d, { roughness: 0.3 });
  add(estop, kit.geo(new THREE.SphereGeometry(0.018, 16, 12)), lampMat, -0.7, 0.13, -0.8);
  const capRest = cap.position.y;

  // Speed sensor on a post, aimed at the drive-end shaft tip
  const sensor = part(root, 'speed_sensor');
  const sensorMat = kit.mat('speed_sensor', '#374151', { roughness: 0.4, metalness: 0.5 });
  add(sensor, kit.box(0.04, AXIS_Y, 0.04), sensorMat, 1.16, AXIS_Y / 2, 0);
  add(sensor, kit.cylX(0.022, 0.1, 16), sensorMat, 1.09, AXIS_Y, 0);

  // Brake: rope round the drum, two spring balances on a gantry, and the load bar
  const rope = part(root, 'brake_drum');
  const ropeR = BRAKE_R + 0.008;
  const ropePts = [new THREE.Vector3(BRAKE_X, 0.83, ropeR)];
  for (let i = 0; i <= 24; i++) {
    const a = (i / 24) * Math.PI;
    ropePts.push(new THREE.Vector3(BRAKE_X, AXIS_Y - ropeR * Math.sin(a), ropeR * Math.cos(a)));
  }
  ropePts.push(new THREE.Vector3(BRAKE_X, 0.83, -ropeR));
  add(rope, kit.tube(ropePts, 0.007, 120), kit.mat('brake_drum', '#c08457', { roughness: 0.9 }));

  const balance = part(root, 'spring_balances');
  const frameMat = kit.mat('spring_balances', '#374151', { roughness: 0.5, metalness: 0.5 });
  const creamMat = kit.mat('spring_balances', '#e7e2d2', { roughness: 0.5 });
  add(balance, kit.box(0.04, 0.04, 0.84), frameMat, BRAKE_X, 1.05, 0);
  for (const z of [-0.4, 0.4]) add(balance, kit.box(0.04, 1.05, 0.04), frameMat, BRAKE_X, 0.525, z);
  for (const z of [-ropeR, ropeR]) {
    add(balance, kit.box(0.05, 0.16, 0.05), creamMat, BRAKE_X, 0.95, z);
    add(balance, kit.torus(0.02, 0.006, 8, 24), frameMat, BRAKE_X, 0.85, z);
  }

  const load = part(root, 'spring_balances');
  add(load, kit.box(0.07, 0.5, 0.04), frameMat, 1.3, 0.25, 0.55);
  const loadMat = kit.mat('spring_balances', AMBER, { roughness: 0.4 });
  const fill = add(load, kit.box(0.05, 0.44, 0.02), loadMat, 1.3, 0.25, 0.575);

  return {
    root,
    setLoad(fraction) {
      const f = Number.isFinite(fraction) ? Math.min(Math.max(fraction, 0), LOAD_FULL) : 0;
      const t = Math.max(f / LOAD_FULL, 0.001);
      fill.scale.y = t;
      fill.position.y = 0.03 + 0.22 * t;
      loadMat.color.setHex(f > OVERLOAD ? RED : AMBER);
    },
    setEstop(pressed) {
      cap.position.y = capRest - (pressed ? 0.012 : 0);
      lampMat.color.setHex(pressed ? 0xff3b30 : 0x7f1d1d);
      lampMat.emissive.setHex(0xff2a1a);
      lampMat.emissiveIntensity = pressed ? 1.4 : 0;
    },
  };
}
