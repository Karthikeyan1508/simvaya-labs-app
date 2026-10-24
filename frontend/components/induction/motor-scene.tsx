'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { ComponentId } from '@/lib/induction';
import { buildBench, type BenchRig } from './scene-bench';
import { AXIS_Y, buildMotor, type MotorRig } from './scene-housing';
import { SceneKit, webglAvailable } from './scene-kit';

export interface MotorSceneProps {
  running: boolean; // shaft, rotor, fan and brake drum turn only when true
  speedRpm: number; // visual rotation speed follows this
  loadFraction: number; // 0 to 1.5 of rated torque, drives the brake drum and the load indicator
  emergency: boolean; // red e-stop lamp, motor stopped
  cutaway: boolean; // housing becomes transparent, stator and rotor are visible
  selectedId: ComponentId | null;
  highlightIds: ComponentId[];
  onSelect: (id: ComponentId | null) => void;
  resetViewToken: number; // change the value to reset the camera
}

// Same studio backdrop as the Pelton rig, so both lab scenes look alike.
const STUDIO = '#3d424b';
const TARGET = new THREE.Vector3(-0.1, AXIS_Y + 0.05, 0);
const VIEW_DIR = new THREE.Vector3(-0.35, 0.5, 1).normalize();
const VIEW_RADIUS = 1.35; // the bench fits inside a sphere of this radius
// Visual spin: the rated 1440 rpm turns the parts about 1.2 times a second, slow enough to read.
const REV_PER_RPM = 1.2 / 1440;
const TAU = Math.PI * 2;
const noop = () => {};

// Hidden parents hide their children from picking too, which the raycaster does not check itself.
const isShown = (o: THREE.Object3D) => {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) if (!n.visible) return false;
  return true;
};

const ownerOf = (o: THREE.Object3D): ComponentId | undefined => {
  for (let n: THREE.Object3D | null = o; n; n = n.parent) {
    const id = n.userData.componentId as ComponentId | undefined;
    if (id) return id;
  }
  return undefined;
};

export function MotorScene(props: MotorSceneProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const latest = useRef(props);
  const wake = useRef(noop);
  const refit = useRef(noop);
  const [noWebgl, setNoWebgl] = useState(false);

  // Scene, renderer, camera and loop. Created once per mount and fully disposed on unmount.
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    if (!webglAvailable()) {
      setNoWebgl(true);
      return;
    }

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setNoWebgl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const canvas = renderer.domElement;
    host.appendChild(canvas);

    // The room environment gives the PBR materials their light. A single lamp adds form.
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    pmrem.dispose();
    scene.environment = envTarget.texture;
    const sun = new THREE.DirectionalLight(0xffffff, 0.8);
    sun.position.set(1.5, 2.5, 2);
    scene.add(sun);

    const kit = new SceneKit();
    const motor: MotorRig = buildMotor(kit);
    const bench: BenchRig = buildBench(kit);
    scene.add(motor.root, bench.root);

    const camera = new THREE.PerspectiveCamera(36, 1, 0.02, 50);
    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = true;
    controls.minDistance = 0.5;
    controls.maxDistance = 10;
    controls.target.copy(TARGET);

    // The reset glides to the default view. Once the user orbits, resizes keep their view.
    const goalPos = new THREE.Vector3();
    const goalTarget = new THREE.Vector3();
    let gliding = false;
    let userMoved = false;
    const fit = () => {
      const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
      const hHalf = Math.atan(Math.tan(vHalf) * camera.aspect);
      const dist = VIEW_RADIUS / Math.sin(Math.min(vHalf, hHalf));
      goalTarget.copy(TARGET);
      goalPos.copy(TARGET).addScaledVector(VIEW_DIR, dist);
      gliding = true;
    };
    const snap = () => {
      fit();
      camera.position.copy(goalPos);
      controls.target.copy(goalTarget);
      gliding = false;
    };

    let raf = 0;
    let last = performance.now();
    let angle = 0;
    let appliedKey = '';
    let xray = false;
    const ndc = new THREE.Vector2();
    const raycaster = new THREE.Raycaster();

    // Stator and rotor sit inside the frame. Cutaway shows them, and a selection or highlight
    // on either one makes the frame see-through so the part can be seen.
    const applyScene = (p: MotorSceneProps) => {
      const lit = new Set(p.highlightIds);
      const inside = (id: ComponentId) => p.selectedId === id || lit.has(id);
      xray = p.cutaway || inside('stator') || inside('rotor');
      motor.stator.visible = p.cutaway || inside('stator');
      motor.rotor.visible = p.cutaway || inside('rotor');
      kit.setOpacity('housing', xray ? 0.2 : 1);
      kit.tint(lit, p.selectedId);
      bench.setEstop(p.emergency);
    };

    // Demand-driven loop: runs while the motor turns, the camera glides or orbit damping settles.
    const frame = (now: number) => {
      raf = 0;
      const dt = Math.min((now - last) / 1000, 0.1);
      last = now;
      const p = latest.current;

      if (p.running) {
        const rpm = Number.isFinite(p.speedRpm) ? Math.max(p.speedRpm, 0) : 0;
        angle = (angle + rpm * REV_PER_RPM * TAU * dt) % TAU;
      }
      motor.spin.rotation.x = angle;

      const key = `${p.selectedId ?? ''}|${p.highlightIds.join(',')}|${p.cutaway}|${p.emergency}`;
      if (key !== appliedKey) {
        appliedKey = key;
        applyScene(p);
      }
      bench.setLoad(p.loadFraction);

      if (gliding) {
        const k = Math.min(1, dt * 5);
        camera.position.lerp(goalPos, k);
        controls.target.lerp(goalTarget, k);
        if (camera.position.distanceTo(goalPos) < 1e-3 && controls.target.distanceTo(goalTarget) < 1e-3) {
          gliding = false;
        }
      }
      const moved = controls.update();
      renderer.render(scene, camera);
      if (p.running || gliding || moved) raf = requestAnimationFrame(frame);
    };

    const wakeLoop = () => {
      if (raf) return;
      last = performance.now();
      raf = requestAnimationFrame(frame);
    };
    wake.current = wakeLoop;
    refit.current = () => {
      userMoved = false;
      fit();
      wakeLoop();
    };

    // Picking: the nearest visible part with an id. A see-through frame is skipped so the stator
    // and rotor behind it can be picked. Empty space, the bench and the table give null.
    const pickAt = (e: PointerEvent): ComponentId | null => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      let glass = false;
      for (const hit of raycaster.intersectObjects(scene.children, true)) {
        if (!isShown(hit.object)) continue;
        const id = ownerOf(hit.object);
        if (xray && id === 'housing') {
          glass = true;
          continue;
        }
        return id ?? null;
      }
      return glass ? 'housing' : null;
    };

    // A press that moves is an orbit drag, not a selection.
    let downAt: { x: number; y: number } | null = null;
    const onDown = (e: PointerEvent) => {
      downAt = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      const d = downAt;
      downAt = null;
      if (!d || Math.hypot(e.clientX - d.x, e.clientY - d.y) > 5) return;
      latest.current.onSelect(pickAt(e));
    };
    const onMove = (e: PointerEvent) => {
      if (e.buttons === 0) canvas.style.cursor = pickAt(e) ? 'pointer' : '';
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointermove', onMove);
    controls.addEventListener('change', wakeLoop);
    controls.addEventListener('start', () => {
      userMoved = true;
    });

    const resize = () => {
      const w = Math.max(host.clientWidth, 1);
      const h = Math.max(host.clientHeight, 1);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (!userMoved) snap();
      wakeLoop();
    };
    const observer = new ResizeObserver(resize);
    observer.observe(host);
    resize();

    return () => {
      cancelAnimationFrame(raf);
      observer.disconnect();
      controls.dispose();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointermove', onMove);
      kit.dispose();
      envTarget.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      canvas.remove();
      wake.current = noop;
      refit.current = noop;
    };
  }, []);

  // Every prop change wakes the loop, which applies the new state and draws one frame.
  useEffect(() => {
    latest.current = props;
    wake.current();
  });

  useEffect(() => {
    refit.current();
  }, [props.resetViewToken]);

  if (noWebgl) {
    return (
      <section
        role="status"
        className="glass grid h-full min-h-80 w-full place-items-center rounded-lg p-6 text-center text-sm text-muted-foreground"
      >
        <p className="max-w-sm">
          The 3D view needs WebGL, and this browser cannot start it. The readings, the circuit diagram and the tables
          still work.
        </p>
      </section>
    );
  }

  return (
    <section className="glass relative h-full min-h-80 w-full overflow-hidden rounded-lg">
      <div className="absolute inset-0" style={{ backgroundColor: STUDIO }} />
      <div ref={hostRef} className="absolute inset-0" />
      <p className="pointer-events-none absolute top-3 left-3 rounded-md bg-card/70 px-2.5 py-1 text-[11px] text-foreground backdrop-blur">
        Illustrative model, not to scale
      </p>
    </section>
  );
}
