'use client';

import { animate, stagger, utils } from 'animejs';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { applyExplode, buildRig, type RigHandles } from '@/components/pelton/rig-model';
import { VIEWS, type ViewName } from '@/components/pelton/views';
import { buttonVariants } from '@/components/ui/button';
import { reducedMotion } from './motion';

// Camera views along the scroll, from views.ts. `at` is the scroll position from 0 to 1.
const KEYS: { at: number; view: ViewName }[] = [
  { at: 0, view: 'iso' },
  { at: 0.4, view: 'front' },
  { at: 0.7, view: 'side' },
  { at: 1, view: 'iso' },
];

// Each chapter of text is visible between `start` and `end`, with a soft fade on both sides.
const CHAPTERS = [
  { start: -1, end: 0.3 },
  { start: 0.3, end: 0.66 },
  { start: 0.66, end: 2 },
];

const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

// The rig comes apart in the middle of the scroll and goes back together at the end.
const explodeAt = (p: number) => smooth(0.3, 0.5, p) * (1 - smooth(0.8, 0.95, p));

const chapterAlpha = (i: number, p: number) => {
  const c = CHAPTERS[i];
  const fadeIn = c.start < -0.5 ? 1 : smooth(c.start - 0.08, c.start, p);
  const fadeOut = c.end > 1.5 ? 1 : 1 - smooth(c.end - 0.08, c.end, p);
  return Math.min(fadeIn, fadeOut);
};

// The camera direction and distance for a scroll position, blended between the keyframes.
const viewAt = (p: number) => {
  let i = 0;
  while (i < KEYS.length - 2 && p > KEYS[i + 1].at) i++;
  const a = VIEWS[KEYS[i].view];
  const b = VIEWS[KEYS[i + 1].view];
  const t = smooth(KEYS[i].at, KEYS[i + 1].at, p);
  const dir = new THREE.Vector3(...a.dir)
    .normalize()
    .lerp(new THREE.Vector3(...b.dir).normalize(), t);
  return { dir, radius: a.radius + (b.radius - a.radius) * t };
};

// How far through the tall section the page has scrolled, from 0 to 1.
const progressOf = (el: HTMLElement) => {
  const total = el.offsetHeight - window.innerHeight;
  if (total <= 0) return 0;
  return Math.min(1, Math.max(0, -el.getBoundingClientRect().top / total));
};

// Frames the rig so a sphere of the view's radius fits the canvas at any aspect ratio.
const placeCamera = (camera: THREE.PerspectiveCamera, p: number, aspect: number) => {
  const v = viewAt(p);
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  // Pull back a little as the parts separate, so the exploded rig stays in frame.
  const dist = (v.radius * (1 + 0.4 * explodeAt(p))) / Math.sin(Math.min(vHalf, hHalf));
  camera.position.copy(v.dir).multiplyScalar(dist);
  camera.lookAt(0, 0, 0);
};

// Headline letters, each in its own span so they can rise in one by one.
// Words stay whole when a line wraps; the space goes outside each word so the browser keeps it.
const chars = (text: string, className = '') =>
  text.split(' ').map((word, w, words) => (
    <Fragment key={w}>
      <span className="inline-block whitespace-nowrap">
        {[...word].map((c, i) => (
          <span key={i} className={`hero-char inline-block ${className}`}>
            {c}
          </span>
        ))}
      </span>
      {w < words.length - 1 ? ' ' : null}
    </Fragment>
  ));

// A tall section with a sticky 3D stage. The Pelton model turns, the camera moves between views,
// and the parts come apart as the page scrolls. Text chapters crossfade over the stage.
export function ModelHero({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chapter = useRef<(HTMLDivElement | null)[]>([]);
  const dot = useRef<(HTMLSpanElement | null)[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  useLayoutEffect(() => {
    if (!section.current || !host.current) return;
    const el = section.current;
    const mount = host.current;
    const still = reducedMotion();

    // Intro letters rise in, unless the visitor asked for less motion.
    const letters = el.querySelectorAll('.hero-char');
    utils.set(letters, { opacity: 0, y: 40 });
    const intro = still
      ? (utils.set(letters, { opacity: 1, y: 0 }), undefined)
      : animate(letters, { opacity: [0, 1], y: [40, 0], delay: stagger(18), duration: 900, ease: 'out(4)' });

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    mount.appendChild(renderer.domElement);

    // Lighting comes from an environment map, as in the lab. There are no lamps or shadows.
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();

    const camera = new THREE.PerspectiveCamera(38, 1, 0.02, 50);
    const pivot = new THREE.Group();
    scene.add(pivot);

    let handles: RigHandles | null = null;
    let disposed = false;
    new GLTFLoader()
      .loadAsync('/models/pelton-turbine.glb')
      .then((gltf) => {
        if (disposed) return;
        // Move the rig's centre to the origin, so the pivot turns it on the spot.
        gltf.scene.position.set(0.33, -0.56, 0.19);
        pivot.add(gltf.scene);
        handles = buildRig(gltf.scene);
        setStatus('ready');
      })
      .catch(() => {
        if (!disposed) setStatus('error');
      });

    const resize = () => {
      const w = mount.clientWidth;
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(mount);

    // Draw one frame at scroll position p, and set the text chapters and their dots to match.
    const render = (p: number) => {
      if (handles) applyExplode(handles, explodeAt(p));
      pivot.rotation.y = -0.6 + p * Math.PI * 1.25;
      placeCamera(camera, p, mount.clientWidth / Math.max(1, mount.clientHeight));
      renderer.render(scene, camera);
      CHAPTERS.forEach((_, i) => {
        const a = chapterAlpha(i, p);
        const node = chapter.current[i];
        if (node) utils.set(node, { opacity: a, y: (1 - a) * 24 });
        const fill = dot.current[i];
        if (fill) utils.set(fill, { opacity: 0.25 + 0.75 * a });
      });
    };

    let p = 0;
    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      frame = requestAnimationFrame(loop);
      const target = still ? 0 : progressOf(el);
      p += (target - p) * Math.min(1, ((now - last) / 1000) * 7);
      last = now;
      render(p);
    };
    render(0);
    frame = requestAnimationFrame(loop);

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      intro?.cancel();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh) {
          o.geometry.dispose();
          (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose());
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section ref={section} className="relative h-[300vh]">
      <div className="sticky top-0 h-dvh overflow-hidden">
        {/* The 3D stage sits on the right on large screens and fills the back on small ones. */}
        <div ref={host} className="absolute inset-0 md:left-[44%]" aria-label="Pelton wheel turbine, 3D model" />

        {status !== 'ready' && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-muted-foreground md:left-[44%]">
            {status === 'error' ? 'Could not load the 3D model.' : 'Loading the rig…'}
          </div>
        )}

        <div className="absolute inset-0 flex items-end px-5 pb-16 md:items-center md:px-10 md:pb-0">
          <div className="mx-auto grid w-full max-w-7xl">
            <div className="grid md:w-[44%]">
              {/* Chapter 1: the headline and the way in. */}
              <div
                ref={(n) => {
                  chapter.current[0] = n;
                }}
                className="pointer-events-none [grid-area:1/1] space-y-7 md:pointer-events-auto"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Virtual labs for engineering colleges</p>
                <h1 className="text-[clamp(2.6rem,4.6vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  <span aria-hidden>
                    {chars('The lab,')}
                    <br />
                    {chars('in your browser.', 'text-primary')}
                  </span>
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Digital twins of college lab rigs. Set the valves, record the readings, and check every formula
                  against the manual.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link
                    href={primaryHref}
                    className={buttonVariants({ size: 'lg' })}
                  >
                    {primaryLabel}
                    <ArrowRight />
                  </Link>
                  <Link
                    href="#demo"
                    className={buttonVariants({ variant: 'outline', size: 'lg' })}
                  >
                    Explore the demo
                  </Link>
                </div>
              </div>

              {/* Chapter 2: take it apart. */}
              <div
                ref={(n) => {
                  chapter.current[1] = n;
                }}
                className="pointer-events-none [grid-area:1/1] space-y-6"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Take it apart</p>
                <h2 className="text-[clamp(2.4rem,4.2vw,4.2rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  Every part, named and in its place.
                </h2>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  The runner, the nozzle, the venturi and the brake drum separate on scroll. Each one is labelled as it
                  is on the lab sheet.
                </p>
              </div>

              {/* Chapter 3: read the numbers. */}
              <div
                ref={(n) => {
                  chapter.current[2] = n;
                }}
                className="pointer-events-none [grid-area:1/1] space-y-6"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Read the numbers</p>
                <h2 className="text-[clamp(2.4rem,4.2vw,4.2rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  Set the valves. Watch the efficiency move.
                </h2>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Brake power, input power and efficiency follow each reading, and every formula is shown with its
                  numbers filled in.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter dots and a scroll cue. */}
        <div className="pointer-events-none absolute bottom-7 left-5 flex items-center gap-2 md:left-10">
          {CHAPTERS.map((_, i) => (
            <span key={i} className="h-1.5 w-10 overflow-hidden rounded-sm bg-foreground/15">
              <span
                ref={(n) => {
                  dot.current[i] = n;
                }}
                className="orange-gradient block h-full w-full"
              />
            </span>
          ))}
        </div>
        <p className="pointer-events-none absolute right-5 bottom-7 text-xs tracking-wide text-muted-foreground md:right-10">
          Scroll to explore
        </p>
      </div>
    </section>
  );
}
