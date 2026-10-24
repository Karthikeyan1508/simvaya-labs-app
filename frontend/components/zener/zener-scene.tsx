'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { SceneKit, webglAvailable } from '@/components/induction/scene-kit';
import { ZENER_PARTS } from '@/lib/zener/content';
import { buildZenerBench, type ZenerReadings, type ZenerRig } from './zener-parts';
import { ZENER_VIEWS, type ZenerViewName } from './zener-views';

export interface ZenerSceneProps {
  readings: ZenerReadings | null; // null when the switch is open or the setting is invalid
  rl: number | null; // null = no load
  regulating: boolean;
  switchOn: boolean;
  view: { name: ZenerViewName; nonce: number }; // a new nonce re-runs the same view (reset)
  highlight: string[]; // parts of the current procedure step
  selected: string | null;
  onSelect: (id: string | null) => void;
  showLabels: boolean;
}

// Same studio backdrop as the other lab scenes.
const STUDIO = '#3d424b';
const CLICK_SLOP = 5; // px a pointer may move between down and up and still count as a click, not an orbit drag

// The bench is drawn on demand: a frame when the props change, the camera moves or a view glides to its preset.
export function ZenerScene(props: ZenerSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const labelRefs = useRef(new Map<string, HTMLButtonElement>());
  const rig = useRef<ZenerRig | null>(null);
  const latest = useRef(props);
  const wake = useRef<() => void>(() => undefined);
  const fitView = useRef<((name: ZenerViewName) => void) | null>(null);
  const [noWebgl, setNoWebgl] = useState(false);
  latest.current = props;

  useEffect(() => {
    const el = host.current;
    if (!el) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true });
    } catch {
      setNoWebgl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const canvas = renderer.domElement;
    el.appendChild(canvas);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(STUDIO);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const env = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    scene.environment = env.texture;
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(1.5, 2.5, 2);
    scene.add(sun);

    const kit = new SceneKit();
    const bench = buildZenerBench(kit);
    rig.current = bench;
    scene.add(bench.root);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 50);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.minDistance = 1;
    controls.maxDistance = 40; // narrow panels need a longer dolly to fit the bench
    const goalPos = new THREE.Vector3();
    const goalTarget = new THREE.Vector3();
    let moving = true;

    // Place the camera so the view's sphere fits the canvas for this aspect ratio.
    const fit = (name: ZenerViewName) => {
      const v = ZENER_VIEWS[name];
      const focus = new THREE.Vector3(...v.focus);
      const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      const dist = v.radius / Math.sin(Math.min(vHalf, hHalf));
      goalTarget.copy(focus);
      goalPos.copy(focus).addScaledVector(new THREE.Vector3(...v.dir).normalize(), dist);
      moving = true;
      wake.current();
    };
    fitView.current = fit;

    const resize = () => {
      const w = el.clientWidth || 1;
      const h = el.clientHeight || 1;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      fit(latest.current.view.name);
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    // Pin each label to its part's projected point, hiding the ones behind the camera.
    const projected = new THREE.Vector3();
    const placeLabels = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      for (const part of ZENER_PARTS) {
        const node = labelRefs.current.get(part.id);
        const at = bench.anchor(part.id);
        if (!node || !at) continue;
        projected.copy(at).project(camera);
        const on = projected.z < 1 && Math.abs(projected.x) <= 1 && Math.abs(projected.y) <= 1;
        node.style.display = on ? '' : 'none';
        node.style.transform = `translate(${((projected.x + 1) / 2) * w}px, ${((1 - projected.y) / 2) * h}px)`;
      }
    };

    let raf = 0;
    const frame = () => {
      raf = 0;
      if (moving) {
        camera.position.lerp(goalPos, 0.2);
        controls.target.lerp(goalTarget, 0.2);
        if (camera.position.distanceTo(goalPos) < 1e-3 && controls.target.distanceTo(goalTarget) < 1e-3) moving = false;
      }
      const orbited = controls.update();
      renderer.render(scene, camera);
      placeLabels();
      if (moving || orbited) raf = requestAnimationFrame(frame);
    };
    const wakeFrame = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    wake.current = wakeFrame;
    controls.addEventListener('change', wakeFrame);

    // Click picks the part under the pointer. A drag (orbit) is not a click.
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();
    let down: [number, number] | null = null;
    const onDown = (e: PointerEvent) => {
      down = [e.clientX, e.clientY];
    };
    const onUp = (e: PointerEvent) => {
      if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > CLICK_SLOP) return;
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      let picked: string | null = null;
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        for (let n: THREE.Object3D | null = hit.object; n && !picked; n = n.parent) {
          picked = (n.userData.componentId as string | undefined) ?? null;
        }
        if (picked) break;
      }
      latest.current.onSelect(picked);
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);

    resize();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      controls.removeEventListener('change', wakeFrame);
      fitView.current = null;
      ro.disconnect();
      controls.dispose();
      env.dispose();
      bench.dispose();
      renderer.dispose();
      canvas.remove();
      rig.current = null;
    };
  }, []);

  // Each prop change updates the bench and draws a frame. The build effect runs first, so rig exists here.
  useEffect(() => {
    const b = rig.current;
    if (!b) return;
    b.setSwitch(props.switchOn);
    b.setRl(props.rl);
    b.setReadings(props.readings);
    b.setRegulating(props.regulating);
    b.setHighlight(new Set(props.highlight), props.selected);
    wake.current();
  }, [props.switchOn, props.rl, props.readings, props.regulating, props.highlight, props.selected]);

  // A view change (or a reset with the same name) glides the camera to the preset.
  useEffect(() => {
    fitView.current?.(props.view.name);
  }, [props.view.nonce, props.view.name]);

  // Labels show or hide with the toggle; the frame refresh places them.
  useEffect(() => {
    wake.current();
  }, [props.showLabels]);

  if (noWebgl) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted-foreground">
        The 3D bench needs WebGL. Use the readings and the schematic instead.
      </div>
    );
  }
  return (
    <div className="relative h-full w-full">
      <div ref={host} className="absolute inset-0" aria-label="Zener regulator bench" />
      <div className="pointer-events-none absolute inset-0" style={{ display: props.showLabels ? 'block' : 'none' }}>
        {ZENER_PARTS.map((part, i) => (
          <button
            key={part.id}
            type="button"
            className={`rig-label${props.selected === part.id ? ' is-selected' : ''}`}
            ref={(node) => {
              if (node) labelRefs.current.set(part.id, node);
              else labelRefs.current.delete(part.id);
            }}
            onClick={() => props.onSelect(part.id)}
          >
            <span className="rig-badge">{i + 1}</span>
            {part.label}
          </button>
        ))}
      </div>
    </div>
  );
}
