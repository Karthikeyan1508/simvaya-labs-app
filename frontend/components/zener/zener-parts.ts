import * as THREE from 'three';
import { add, part, type SceneKit } from '@/components/induction/scene-kit';

// Fixed wiring of the manual's Figure 1. Students read the meters; they do not wire the bench.
// Units are metres-ish, the bench top is y = 0. Parts lie on the bench, meters stand at the front.
const RED = 0xc62828;
const BLACK = 0x1a1a1a;
const BAND_HEX: Record<string, number> = { black: 0x1b1b1b, brown: 0x7a4a1e, red: 0xc62828, yellow: 0xfdd835, violet: 0x7b1fa2, gold: 0xd4af37 };
const RS_BANDS = ['red', 'red', 'brown', 'gold']; // 220 Ω

// Layout. Rows: rheostat at the back, Rs and the node in the middle, meters at the front, ground rail at the very front.
const SUPPLY = new THREE.Vector3(-2.1, 0, -0.7);
const RHEO = new THREE.Vector3(-0.3, 0.09, -1.05); // load rheostat RL
const RHEO_LEN = 1.2;
const RS = new THREE.Vector3(0.75, 0.06, -0.6); // series resistor Rs
const RS_LEN = 0.42;
const NODE = new THREE.Vector3(1.4, 0.06, -0.6); // output node Vout
const ZENER = new THREE.Vector3(1.9, 0.045, -0.85); // lying along Z, cathode on the node side
const METER_Z = 0.35;
const METER_X = { vs: 0.75, vout: 1.5, iz: 2.3 };
const RAIL_Z = 0.9; // ground rail
const RAIL_TOP = 0.012;
const WIRE_Y = 0.07; // height of the wire runs on the bench
const CORNER = 0.06; // radius of the bends
export const SWITCH_AT = new THREE.Vector3(-2.0, 0, 0.45);

// Highlight tints, the same as the other lab scenes: blue for the selected part, amber for the step's parts.
const SELECTED_TINT = 0x3b82f6;
const HIGHLIGHT_TINT = 0xf59e0b;

export interface ZenerReadings {
  vRs: number; // V across Rs
  vOut: number; // V
  iz: number; // A
}

export interface ZenerRig {
  root: THREE.Group;
  setReadings(r: ZenerReadings | null): void;
  setRl(rl: number | null): void;
  setSwitch(on: boolean): void;
  setRegulating(on: boolean): void;
  setHighlight(lit: ReadonlySet<string>, selected: string | null): void;
  anchor(id: string): THREE.Vector3 | null; // world point above a part, for its label
  dispose(): void;
}

// Meter face in the lab's cream and brown, drawn once per meter. Pivot sits at the arc centre.
function faceTexture(kind: string, max: number, unit: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 384;
  const g = c.getContext('2d');
  if (!g) throw new Error('2D canvas unavailable for the meter face');
  const grad = g.createLinearGradient(0, 0, 0, 384);
  grad.addColorStop(0, '#fcf8ec');
  grad.addColorStop(1, '#e9dfc2');
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 384);
  const px = 256;
  const py = 331;
  const R = 200;
  const pt = (deg: number, r: number) => [px + r * Math.sin((deg * Math.PI) / 180), py - r * Math.cos((deg * Math.PI) / 180)];
  g.strokeStyle = '#2a2a2a';
  g.fillStyle = '#2a2a2a';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (let k = 0; k <= 20; k++) {
    const deg = -60 + 6 * k;
    const major = k % 2 === 0;
    const [x1, y1] = pt(deg, R);
    const [x2, y2] = pt(deg, R - (major ? 26 : 12));
    g.lineWidth = major ? 4 : 2;
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.stroke();
  }
  g.font = 'bold 38px sans-serif';
  for (const [deg, text] of [
    [-60, '0'],
    [0, String(max / 2)],
    [60, String(max)],
  ] as const) {
    const [tx, ty] = pt(deg, R - 62);
    g.fillText(text, tx, ty);
  }
  g.font = 'bold 30px sans-serif';
  g.fillText(unit, px, py - 110);
  g.font = 'bold 34px sans-serif';
  g.fillStyle = '#4a3d2a';
  g.fillText(kind, px, 352);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// Needle: -60 degrees at zero, +60 at full scale. Rotation is clockwise for a positive reading.
const needleAngle = (frac: number) => -((-60 + 120 * Math.min(Math.max(frac, 0), 1)) * Math.PI) / 180;

// A wire run: straight segments joined by rounded bends, so it never kinks or bulges between its points.
function runCurve(points: THREE.Vector3[]): THREE.CurvePath<THREE.Vector3> {
  const pts: THREE.Vector3[] = [];
  for (const p of points) if (!pts.length || pts[pts.length - 1].distanceTo(p) > 1e-4) pts.push(p);
  const path = new THREE.CurvePath<THREE.Vector3>();
  let from = pts[0];
  for (let i = 1; i < pts.length - 1; i++) {
    const c = pts[i];
    const inDir = c.clone().sub(from);
    const outDir = pts[i + 1].clone().sub(c);
    const r = Math.min(CORNER, inDir.length() / 2, outDir.length() / 2);
    const a = c.clone().addScaledVector(inDir.normalize(), -r);
    const b = c.clone().addScaledVector(outDir.normalize(), r);
    path.add(new THREE.LineCurve3(from.clone(), a));
    path.add(new THREE.QuadraticBezierCurve3(a, c.clone(), b));
    from = b;
  }
  path.add(new THREE.LineCurve3(from.clone(), pts[pts.length - 1].clone()));
  return path;
}

// Carbon-film style resistor lying along X: body, colour bands, two leads.
function resistor(kit: SceneKit, parent: THREE.Object3D, at: THREE.Vector3, len: number, r: number, bands: string[]) {
  const g = part(parent, null, at.x, at.y, at.z);
  add(g, kit.cylX(r, len, 24), kit.mat(null, '#d9c9a0', { roughness: 0.55 }));
  const bandAt = [-0.34, -0.22, -0.1, 0.3];
  bands.forEach((b, i) => add(g, kit.cylX(r * 1.02, 0.03, 24), kit.mat(null, BAND_HEX[b], { roughness: 0.4 }), bandAt[i] * len, 0, 0));
  const lead = kit.cylX(0.01, 0.18, 8);
  const silver = kit.mat(null, '#c0c0c0', { roughness: 0.3, metalness: 0.8 });
  add(g, lead, silver, -(len / 2 + 0.09), 0, 0);
  add(g, lead, silver, len / 2 + 0.09, 0, 0);
  return g;
}

export function buildZenerBench(kit: SceneKit): ZenerRig {
  const root = new THREE.Group();
  const textures: THREE.Texture[] = [];
  const tagged = new Map<string, THREE.Object3D>();
  const tag = <T extends THREE.Object3D>(o: T, id: string): T => {
    o.userData.componentId = id;
    tagged.set(id, o);
    return o;
  };
  const V = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

  // Bench top and legs
  const wood = kit.mat(null, '#8b6a4a', { roughness: 0.8, metalness: 0 });
  add(root, kit.box(5.6, 0.06, 2.8), wood, 0.1, -0.03, -0.15);
  for (const x of [-2.6, 2.8]) for (const z of [-1.25, 0.95]) add(root, kit.box(0.12, 0.8, 0.12), wood, x, -0.43, z);

  // Ground rail along the front edge. Every ground wire ends on it.
  add(root, kit.box(5.8, RAIL_TOP, 0.1), kit.mat(null, '#1e3a8a', { roughness: 0.5 }), 0, RAIL_TOP / 2, RAIL_Z);

  // Supply: dark box with a green display and two terminals on the right face
  const supply = tag(part(root, null, SUPPLY.x, SUPPLY.y, SUPPLY.z), 'supply');
  add(supply, kit.box(0.7, 0.42, 0.5), kit.mat(null, '#2b2f36', { roughness: 0.5, metalness: 0.2 }), 0, 0.21, 0);
  const display = kit.mat(null, '#0f3d22', { roughness: 0.4 });
  display.emissive.setHex(0x22c55e);
  add(supply, kit.box(0.3, 0.1, 0.01), display, 0, 0.27, 0.256);
  const term = kit.geo(new THREE.SphereGeometry(0.035, 14, 10));
  add(supply, term, kit.mat(null, '#c62828'), 0.37, 0.33, -0.1);
  add(supply, term, kit.mat(null, '#111111'), 0.37, 0.33, 0.1);
  const plusAt = V(SUPPLY.x + 0.37, 0.33, SUPPLY.z - 0.1);
  const minusAt = V(SUPPLY.x + 0.37, 0.33, SUPPLY.z + 0.1);

  // Rheostat = load RL (coil of copper rings on a ceramic body)
  const rheo = tag(part(root, null, RHEO.x, RHEO.y, RHEO.z), 'rheostat');
  add(rheo, kit.cylX(0.09, RHEO_LEN, 32), kit.mat(null, '#d8c8a0', { roughness: 0.6 }));
  const coil = kit.inst(kit.torusX(0.094, 0.007, 6, 24), kit.mat(null, '#b87333', { roughness: 0.35, metalness: 0.6 }), 60);
  for (let i = 0; i < 60; i++) kit.place(coil, i, -0.55 + (i * 1.1) / 59, 0, 0);
  rheo.add(coil);
  for (const x of [-RHEO_LEN / 2, RHEO_LEN / 2]) add(rheo, kit.cylX(0.1, 0.04, 24), kit.mat(null, '#4a4a4a', { roughness: 0.4 }), x, 0, 0);
  const slider = add(rheo, kit.box(0.06, 0.03, 0.07), kit.mat(null, '#b33333', { roughness: 0.4 }), 0, 0.12, 0);
  const rlLeft = V(RHEO.x - RHEO_LEN / 2 - 0.1, RHEO.y, RHEO.z);
  const rlRight = V(RHEO.x + RHEO_LEN / 2 + 0.1, RHEO.y, RHEO.z);

  // Series resistor Rs (220 Ω)
  tag(resistor(kit, root, RS, RS_LEN, 0.06, RS_BANDS), 'resistor');
  const rsLeft = V(RS.x - RS_LEN / 2 - 0.1, RS.y, RS.z);
  const rsRight = V(RS.x + RS_LEN / 2 + 0.1, RS.y, RS.z);

  // Output node
  const nodeMat = kit.mat(null, '#9ca3af', { roughness: 0.3 });
  add(root, kit.geo(new THREE.SphereGeometry(0.035, 16, 12)), nodeMat, NODE.x, NODE.y, NODE.z);

  // Zener diode lying along Z: black body, silver cathode band on the node side (+Z here)
  const zener = tag(part(root, null, ZENER.x, ZENER.y, ZENER.z), 'zener');
  zener.rotation.y = -Math.PI / 2;
  add(zener, kit.cylX(0.045, 0.3, 24), kit.mat(null, '#1a1a1a', { roughness: 0.4 }));
  add(zener, kit.cylX(0.047, 0.04, 24), kit.mat(null, '#dcdcdc', { roughness: 0.3, metalness: 0.7 }), 0.11, 0, 0);
  const zCathode = V(ZENER.x, ZENER.y, ZENER.z + 0.15);
  const zAnode = V(ZENER.x, ZENER.y, ZENER.z - 0.15);

  // Meters stand at the front. Left terminal red, right terminal black; the wires leave them towards the bench.
  const meter = (x: number, id: string, kind: 'VOLTMETER' | 'AMMETER', max: number, unit: string) => {
    const g = tag(part(root, null, x, 0, METER_Z), id);
    add(g, kit.box(0.42, 0.4, 0.12), kit.mat(null, '#2a221c', { roughness: 0.5, metalness: 0.2 }), 0, 0.24, 0);
    const tex = faceTexture(kind, max, unit);
    textures.push(tex);
    const faceMat = kit.mat(null, '#ffffff', { roughness: 0.4, metalness: 0 });
    faceMat.map = tex;
    add(g, kit.geo(new THREE.PlaneGeometry(0.34, 0.255)), faceMat, 0, 0.29, 0.0605);
    const pivot = new THREE.Group();
    pivot.position.set(0, 0.198, 0.07);
    g.add(pivot);
    add(pivot, kit.box(0.006, 0.14, 0.004), kit.mat(null, '#c1121f', { roughness: 0.3 }), 0, 0.07, 0);
    const bead = kit.geo(new THREE.SphereGeometry(0.02, 12, 10));
    add(g, bead, kit.mat(null, '#b91c1c', { roughness: 0.4 }), -0.1, 0.075, 0.07);
    add(g, bead, kit.mat(null, '#111111', { roughness: 0.4 }), 0.1, 0.075, 0.07);
    return { pivot, red: V(x - 0.1, 0.075, METER_Z + 0.07), black: V(x + 0.1, 0.075, METER_Z + 0.07) };
  };
  const vs = meter(METER_X.vs, 'vs_meter', 'VOLTMETER', 15, 'V');
  const vout = meter(METER_X.vout, 'vout_meter', 'VOLTMETER', 15, 'V');
  const iz = meter(METER_X.iz, 'ammeter', 'AMMETER', 100, 'mA');

  // Switch on the front-left: its lever swings up when the supply is on
  const switchGroup = tag(part(root, null, SWITCH_AT.x, 0, SWITCH_AT.z), 'switch');
  add(switchGroup, kit.box(0.3, 0.05, 0.16), kit.mat(null, '#3a3a3a', { roughness: 0.5 }), 0, 0.025, 0);
  add(switchGroup, kit.box(0.26, 0.08, 0.12), kit.mat(null, '#202020', { roughness: 0.4 }), 0, 0.09, 0);
  const lever = new THREE.Group();
  lever.position.set(0, 0.13, 0);
  switchGroup.add(lever);
  add(lever, kit.box(0.02, 0.09, 0.02), kit.mat(null, '#e5e5e5', { roughness: 0.3, metalness: 0.5 }), 0, 0.045, 0);

  // Wires. Circuit wires are thicker; the meter probe leads are thinner.
  const red = kit.mat(null, RED, { roughness: 0.4 });
  const black = kit.mat(null, BLACK, { roughness: 0.5 });
  const wire = (pts: THREE.Vector3[], m: THREE.Material, r = 0.016) =>
    add(root, kit.geo(new THREE.TubeGeometry(runCurve(pts), 160, r, 10, false)), m);
  const probe = (pts: THREE.Vector3[], m: THREE.Material) => wire(pts, m, 0.01);
  const RAIL = (x: number) => V(x, RAIL_TOP, RAIL_Z);
  const Y = WIRE_Y;

  // Supply and ground
  wire([plusAt, V(-1.45, 0.33, -0.8), V(-1.45, Y, -0.8), V(0.3, Y, -0.8), V(0.3, Y, -0.6), rsLeft], red);
  wire([minusAt, V(-1.45, 0.33, -0.6), V(-1.45, Y, -0.6), V(-1.45, Y, RAIL_Z), RAIL(-1.45)], black);
  wire([rlLeft, V(-1.0, Y, RHEO.z), V(-2.6, Y, RHEO.z), V(-2.6, Y, RAIL_Z), RAIL(-2.6)], black);

  // Load and series resistor to the node
  wire([rlRight, V(1.4, Y, RHEO.z), NODE], red);
  wire([rsRight, NODE], red);

  // Zener: node to cathode, anode round the east side to the ammeter, ammeter out to ground
  wire([NODE, V(1.9, Y, -0.6), zCathode], red);
  wire([zAnode, V(2.0, Y, -1.0), V(2.0, Y, 0.6), V(2.2, Y, 0.6), iz.red], black);
  wire([iz.black, V(2.4, Y, RAIL_Z), RAIL(2.4)], black);

  // Voltmeter Vs across Rs: red to the supply side, black to the node side
  probe([vs.red, V(0.65, Y, 0.6), V(0.3, Y, 0.6), V(0.3, Y, -0.3), V(0.44, Y, -0.3), V(0.44, Y, -0.6), rsLeft], red);
  probe([vs.black, V(0.85, Y, 0.6), V(1.0, Y, 0.6), V(1.0, Y, -0.3), V(1.06, Y, -0.3), V(1.06, Y, -0.6), rsRight], black);

  // Voltmeter Vout across the load: red to the node, black to ground
  probe([vout.red, V(1.4, Y, 0.6), V(1.2, Y, 0.6), V(1.2, Y, -0.3), V(1.4, Y, -0.3), NODE], red);
  probe([vout.black, V(1.6, Y, RAIL_Z), RAIL(1.6)], black);

  return {
    root,
    setReadings(r) {
      vs.pivot.rotation.z = needleAngle(r ? r.vRs / 15 : 0);
      vout.pivot.rotation.z = needleAngle(r ? r.vOut / 15 : 0);
      iz.pivot.rotation.z = needleAngle(r ? (r.iz * 1000) / 100 : 0);
    },
    setRl(rl) {
      const frac = rl === null ? 1 : Math.min(Math.max((rl - 100) / 1900, 0), 1);
      slider.position.x = -RHEO_LEN / 2 + 0.1 + frac * (RHEO_LEN - 0.2);
    },
    setSwitch(on) {
      lever.rotation.z = on ? 0.5 : -0.5;
      display.emissiveIntensity = on ? 1 : 0;
    },
    setRegulating(on) {
      nodeMat.color.set(on ? '#d97706' : '#9ca3af');
      nodeMat.emissive.setHex(on ? 0xd97706 : 0x000000);
      nodeMat.emissiveIntensity = on ? 0.7 : 0;
    },
    // Each material keeps its own base emission, so clearing a highlight restores it.
    setHighlight(lit, selected) {
      for (const [id, o] of tagged) {
        const sel = id === selected;
        const hit = !sel && lit.has(id);
        o.traverse((c) => {
          const m = (c as THREE.Mesh).material;
          for (const mat of Array.isArray(m) ? m : [m]) {
            if (!(mat instanceof THREE.MeshStandardMaterial)) continue;
            mat.userData.base ??= { hex: mat.emissive.getHex(), k: mat.emissiveIntensity };
            const base = mat.userData.base as { hex: number; k: number };
            mat.emissive.setHex(sel ? SELECTED_TINT : hit ? HIGHLIGHT_TINT : base.hex);
            mat.emissiveIntensity = sel ? 0.45 : hit ? 0.35 : base.k;
          }
        });
      }
    },
    anchor(id) {
      const o = tagged.get(id);
      if (!o) return null;
      return o.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, 0.3, 0));
    },
    dispose() {
      for (const t of textures) t.dispose();
      kit.dispose();
    },
  };
}
