'use client';

import { animate, stagger, utils } from 'animejs';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Fragment, useLayoutEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { buttonVariants } from '@/components/ui/button';
import { buildEngine } from './engine-model';
import { progressOf, reducedMotion, smooth } from './motion';

// Each chapter of text is visible between `start` and `end`, with a soft fade on both sides.
const CHAPTERS = [
  { start: -1, end: 0.3 },
  { start: 0.3, end: 0.66 },
  { start: 0.66, end: 2 },
];

// The engine comes apart between 0.3 and 0.5 of the scroll and is back together after 0.8.
const explodeAt = (p: number) => smooth(0.3, 0.5, p) * (1 - smooth(0.8, 0.95, p));

const CENTER_Y = 1.5;
const RADIUS = 3.7; // about half the engine's size; grows a little as it comes apart

const chapterAlpha = (i: number, p: number) => {
  const c = CHAPTERS[i];
  const fadeIn = c.start < -0.5 ? 1 : smooth(c.start - 0.05, c.start, p);
  const fadeOut = c.end > 1.5 ? 1 : 1 - smooth(c.end - 0.05, c.end, p);
  return Math.min(fadeIn, fadeOut);
};

// Orbit the engine slowly and tilt it a little. The distance keeps the whole engine in frame at any aspect ratio.
function placeCamera(camera: THREE.PerspectiveCamera, p: number, aspect: number, e: number) {
  const yaw = 0.35 + p * 1.0; // turns with the scroll, but stays off end-on to the crank
  const tilt = 0.2 + 0.14 * Math.sin(p * Math.PI);
  const cy = CENTER_Y + 1.2 * e; // the exploded engine is taller, so the look point rises with it
  const vHalf = THREE.MathUtils.degToRad(camera.fov / 2);
  const hHalf = Math.atan(Math.tan(vHalf) * aspect);
  const dist = (RADIUS * (1 + 0.3 * e)) / Math.sin(Math.min(vHalf, hHalf));
  camera.position.set(
    dist * Math.sin(yaw) * Math.cos(tilt),
    cy + dist * Math.sin(tilt),
    dist * Math.cos(yaw) * Math.cos(tilt),
  );
  camera.lookAt(0, cy, 0);
}

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

// A tall section with a sticky 3D stage. A procedural four-cylinder engine turns, comes apart and goes
// back together as the page scrolls. Text chapters crossfade over the stage. Reduced motion only skips the headline intro.
export function EngineHero({ primaryHref, primaryLabel }: { primaryHref: string; primaryLabel: string }) {
  const section = useRef<HTMLElement>(null);
  const host = useRef<HTMLDivElement>(null);
  const chapter = useRef<(HTMLDivElement | null)[]>([]);
  const dot = useRef<(HTMLSpanElement | null)[]>([]);
  const [failed, setFailed] = useState(false);

  useLayoutEffect(() => {
    if (!section.current || !host.current) return;
    const el = section.current;
    const mount = host.current;
    const still = reducedMotion();

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.localClippingEnabled = true;
    mount.appendChild(renderer.domElement);

    // Lighting: an environment map for the reflections, and one key light for the edges.
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envMap = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envMap;
    pmrem.dispose();
    const key = new THREE.DirectionalLight('#ffffff', 1.4);
    key.position.set(4, 6, 5);
    scene.add(key);

    const engine = buildEngine();
    scene.add(engine.root);
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);

    // The headline letters rise in, unless the visitor asked for less motion.
    const letters = el.querySelectorAll('.hero-char');
    let intro: ReturnType<typeof animate> | undefined;
    if (!still) {
      utils.set(letters, { opacity: 0, y: 40 });
      intro = animate(letters, { opacity: [0, 1], y: [40, 0], delay: stagger(18), duration: 900, ease: 'out(4)' });
    }

    // Draw one frame at scroll position p, and set the text chapters and their dots to match.
    const draw = (p: number) => {
      const e = explodeAt(p);
      engine.pose(p * Math.PI * 4 + 0.6, e); // two full turns of the crank over the section
      placeCamera(camera, p, mount.clientWidth / Math.max(1, mount.clientHeight), e);
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
    let running = false;
    let last = performance.now();
    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      // Ease toward the scroll position, so the motion has weight and no jumps.
      p += (progressOf(el) - p) * Math.min(1, ((now - last) / 1000) * 7);
      last = now;
      draw(p);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = performance.now();
      frame = requestAnimationFrame(loop);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(frame);
    };

    const resize = () => {
      const w = Math.max(1, mount.clientWidth);
      const h = Math.max(1, mount.clientHeight);
      renderer.setSize(w, h);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      draw(p);
    };
    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    // Animate only while the section is on screen.
    const io = new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop()));
    io.observe(el);

    return () => {
      stop();
      io.disconnect();
      observer.disconnect();
      intro?.cancel();
      engine.dispose();
      envMap.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  return (
    <section ref={section} className="landing-hero relative h-[300vh]">
      <div className="landing-pin sticky top-0 h-dvh overflow-hidden">
        {/* The 3D stage sits on the right on large screens and at the top on small ones. */}
        <div
          ref={host}
          role="img"
          aria-label="A four-cylinder engine in a cut-away block, as a 3D model"
          className="landing-stage absolute inset-x-0 top-[9%] h-[34%] md:inset-y-0 md:left-[44%] md:h-auto"
        >
          {failed && (
            <p className="grid h-full place-items-center px-5 text-center text-sm text-muted-foreground">
              The 3D view needs WebGL, which this browser does not offer. The text still works.
            </p>
          )}
        </div>

        <div className="landing-copy absolute inset-0 flex items-end px-5 pb-16 md:items-center md:px-10 md:pb-0">
          <div className="mx-auto grid w-full max-w-7xl">
            <div className="landing-col grid md:w-[44%]">
              {/* Chapter 1: the headline and the way in. */}
              <div
                ref={(n) => {
                  chapter.current[0] = n;
                }}
                className="landing-chapter pointer-events-none [grid-area:1/1] space-y-7 md:pointer-events-auto"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Virtual labs for engineering colleges</p>
                <h1 className="text-[clamp(2.6rem,4.6vw,4.6rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  <span aria-hidden>
                    {chars('Engineering labs,')}
                    <br />
                    {chars('in your browser.', 'text-primary')}
                  </span>
                </h1>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Pelton wheel, induction motor, Zener regulator and sorting. Change a setting, take a reading, and
                  check the formula behind it.
                </p>
                <div className="flex flex-wrap gap-3">
                  <Link href={primaryHref} className={buttonVariants({ size: 'lg' })}>
                    {primaryLabel}
                    <ArrowRight />
                  </Link>
                  <Link href="#demo" className={buttonVariants({ variant: 'outline', size: 'lg' })}>
                    See the demo
                  </Link>
                </div>
              </div>

              {/* Chapter 2: take it apart. */}
              <div
                ref={(n) => {
                  chapter.current[1] = n;
                }}
                className="landing-chapter pointer-events-none [grid-area:1/1] space-y-6 opacity-0"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Look inside</p>
                <h2 className="text-[clamp(2.4rem,4.2vw,4.2rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  Every part, in its place.
                </h2>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Scroll and the model comes apart, part by part. Scroll on and it goes back together.
                </p>
              </div>

              {/* Chapter 3: read the numbers. */}
              <div
                ref={(n) => {
                  chapter.current[2] = n;
                }}
                className="landing-chapter pointer-events-none [grid-area:1/1] space-y-6 opacity-0"
              >
                <p className="text-sm font-medium tracking-wide text-primary">Measure</p>
                <h2 className="text-[clamp(2.4rem,4.2vw,4.2rem)] leading-[0.95] font-semibold tracking-[-0.04em]">
                  Change a setting. Watch the numbers move.
                </h2>
                <p className="max-w-md text-lg leading-relaxed text-muted-foreground">
                  Readings update with each change. The formula stays beside them.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Chapter dots and a scroll cue. */}
        <div className="landing-dots pointer-events-none absolute bottom-7 left-5 flex items-center gap-2 md:left-10">
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
        <p className="landing-cue pointer-events-none absolute right-5 bottom-7 text-xs tracking-wide text-muted-foreground md:right-10">
          Scroll to look inside
        </p>
      </div>
    </section>
  );
}
