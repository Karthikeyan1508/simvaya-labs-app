import * as THREE from 'three';
import type { ComponentId } from '@/lib/induction';

// Same tints as the Pelton rig: blue for the selected part, amber for the highlighted parts.
const SELECTED_TINT = 0x3b82f6;
const HIGHLIGHT_TINT = 0xf59e0b;

interface MatOpts {
  roughness?: number;
  metalness?: number;
  side?: THREE.Side;
}

// Owns every geometry, material and instanced mesh of the motor scene, so unmount frees them all.
// Materials are made per part and role. A highlight therefore tints one part and nothing else.
export class SceneKit {
  private readonly geos: THREE.BufferGeometry[] = [];
  private readonly mats: THREE.Material[] = [];
  private readonly insts: THREE.InstancedMesh[] = [];
  private readonly byId = new Map<ComponentId, THREE.MeshStandardMaterial[]>();
  private readonly dummy = new THREE.Object3D();

  private keep<T extends THREE.BufferGeometry>(g: T): T {
    this.geos.push(g);
    return g;
  }

  // Shapes are built along the shaft (X) or upright (Y) or facing the front (Z).
  cylX(r: number, len: number, seg = 32): THREE.BufferGeometry {
    return this.keep(new THREE.CylinderGeometry(r, r, len, seg).rotateZ(Math.PI / 2));
  }

  cylY(r: number, len: number, seg = 24): THREE.BufferGeometry {
    return this.keep(new THREE.CylinderGeometry(r, r, len, seg));
  }

  cylZ(r: number, len: number, seg = 24): THREE.BufferGeometry {
    return this.keep(new THREE.CylinderGeometry(r, r, len, seg).rotateX(Math.PI / 2));
  }

  torus(r: number, tube: number, seg = 8, radial = 40): THREE.BufferGeometry {
    return this.keep(new THREE.TorusGeometry(r, tube, seg, radial));
  }

  // A torus lying around the X axis.
  torusX(r: number, tube: number, seg = 8, radial = 48): THREE.BufferGeometry {
    return this.keep(new THREE.TorusGeometry(r, tube, seg, radial).rotateY(Math.PI / 2));
  }

  box(w: number, h: number, d: number): THREE.BufferGeometry {
    return this.keep(new THREE.BoxGeometry(w, h, d));
  }

  tube(points: THREE.Vector3[], radius: number, segments: number): THREE.BufferGeometry {
    return this.keep(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segments, radius, 8, false));
  }

  // Any other geometry the builders make (lathe, sphere) goes through here so it is disposed too.
  geo<T extends THREE.BufferGeometry>(g: T): T {
    return this.keep(g);
  }

  // A null id keeps the material out of the highlight tint (used for the e-stop lamp).
  mat(id: ComponentId | null, color: string | number, o: MatOpts = {}): THREE.MeshStandardMaterial {
    const m = new THREE.MeshStandardMaterial({
      color,
      roughness: o.roughness ?? 0.55,
      metalness: o.metalness ?? 0.15,
      side: o.side ?? THREE.FrontSide,
    });
    this.mats.push(m);
    if (id) {
      const list = this.byId.get(id) ?? [];
      list.push(m);
      this.byId.set(id, list);
    }
    return m;
  }

  inst(geo: THREE.BufferGeometry, mat: THREE.Material, count: number): THREE.InstancedMesh {
    const m = new THREE.InstancedMesh(geo, mat, count);
    this.insts.push(m);
    return m;
  }

  // Sets one instance. The rotation is about the X axis only, which is all the ring layouts need.
  place(m: THREE.InstancedMesh, i: number, x: number, y: number, z: number, rotX = 0): void {
    this.dummy.position.set(x, y, z);
    this.dummy.rotation.set(rotX, 0, 0);
    this.dummy.updateMatrix();
    m.setMatrixAt(i, this.dummy.matrix);
  }

  // Emissive tint for the selected part (blue) and the highlighted parts (amber).
  tint(lit: ReadonlySet<ComponentId>, selected: ComponentId | null): void {
    for (const [id, list] of this.byId) {
      const sel = id === selected;
      const hit = !sel && lit.has(id);
      const color = sel ? SELECTED_TINT : hit ? HIGHLIGHT_TINT : 0x000000;
      const intensity = sel ? 0.45 : hit ? 0.35 : 0;
      for (const m of list) {
        m.emissive.setHex(color);
        m.emissiveIntensity = intensity;
      }
    }
  }

  // Makes one part see-through (the housing in cutaway) or opaque again (opacity 1).
  setOpacity(id: ComponentId, opacity: number): void {
    for (const m of this.byId.get(id) ?? []) {
      m.transparent = opacity < 1;
      m.opacity = opacity;
      m.depthWrite = opacity >= 1;
    }
  }

  dispose(): void {
    for (const m of this.insts) m.dispose();
    for (const g of this.geos) g.dispose();
    for (const m of this.mats) m.dispose();
  }
}

// Adds a mesh at a position and returns it.
export function add(
  parent: THREE.Object3D,
  geo: THREE.BufferGeometry,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const m = new THREE.Mesh(geo, mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}

// A named group. Picking climbs from the hit mesh to the nearest group with this id.
export function part(parent: THREE.Object3D, id: ComponentId | null, x = 0, y = 0, z = 0): THREE.Group {
  const g = new THREE.Group();
  if (id) g.userData.componentId = id;
  g.position.set(x, y, z);
  parent.add(g);
  return g;
}

// Plain check before the renderer is made, so the page can show a fallback panel instead.
export function webglAvailable(): boolean {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}
