'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

// Full-screen WebGL background. Smooth low-frequency flow in amber, a soft lens that
// follows the pointer while it moves, and a ring that spreads from each click.
const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDark;
uniform vec2 uMouse;
uniform float uHover;
uniform vec2 uClick;
uniform float uClickT;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = p * 2.03 + vec2(17.1, 9.3);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float asp = uRes.x / uRes.y;
  vec2 p = vec2(uv.x * asp, uv.y);
  vec2 m = vec2(uMouse.x * asp, uMouse.y);
  float t = uTime * 0.05;

  // Slow, low-frequency flow field
  vec2 flow = vec2(fbm(p * 1.2 + vec2(t, -t * 0.7)), fbm(p * 1.2 + vec2(-t * 0.8, t) + 5.2));
  vec2 q = p + (flow - 0.5) * 0.8;

  // Pointer lens: pulls the field toward the cursor while the pointer is moving
  vec2 d = p - m;
  float r = length(d);
  float lens = exp(-r * r * 5.0) * uHover;
  q -= d * lens * 0.5;

  // Click ripple: a ring that expands outward and fades
  vec2 dc = p - vec2(uClick.x * asp, uClick.y);
  float age = uTime - uClickT;
  float rc = length(dc);
  float rx = (rc - age * 0.35) * 14.0;
  float ripple = exp(-rx * rx) * exp(-age * 1.6) * step(0.0, age);

  float f = fbm(q * 1.5 + vec2(t * 1.5, -t));
  float band = smoothstep(0.35, 0.75, f);

  // Palette: amber #D97706, glow #FBBF24, deep amber #92400E, paper #FFFBF5, ink #18181B
  vec3 amber = vec3(0.851, 0.467, 0.027);
  vec3 glow = vec3(0.984, 0.749, 0.141);
  vec3 deep = vec3(0.573, 0.251, 0.055);
  vec3 tint = mix(amber, glow, smoothstep(0.25, 0.8, flow.x));
  tint = mix(tint, deep, smoothstep(0.55, 0.95, flow.y) * 0.55);

  vec3 paper = vec3(1.0, 0.984, 0.961);
  vec3 ink = vec3(0.094, 0.094, 0.106);
  vec3 base = mix(paper, ink, uDark);

  float amount = band * mix(0.5, 0.62, uDark) + lens * 0.45 + ripple * 0.25;
  vec3 col = mix(base, tint, clamp(amount, 0.0, 1.0));
  col += tint * ripple * 0.12;

  // Fine grain keeps the gradient from banding
  col += (hash(gl_FragCoord.xy + fract(uTime)) - 0.5) * 0.02;

  float vig = smoothstep(1.3, 0.35, length(uv - 0.5));
  col *= mix(0.92, 1.0, vig);
  gl_FragColor = vec4(col, 1.0);
}
`;

export function ShaderBackground() {
  const ref = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const darkRef = useRef(0);
  darkRef.current = resolvedTheme === 'dark' ? 1 : 0;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const gl = canvas.getContext('webgl', { antialias: false, alpha: false });
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        console.error('Shader compile failed:', gl.getShaderInfoLog(s));
        return null;
      }
      return s;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Shader link failed:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

    const u = {
      res: gl.getUniformLocation(prog, 'uRes'),
      time: gl.getUniformLocation(prog, 'uTime'),
      dark: gl.getUniformLocation(prog, 'uDark'),
      mouse: gl.getUniformLocation(prog, 'uMouse'),
      hover: gl.getUniformLocation(prog, 'uHover'),
      click: gl.getUniformLocation(prog, 'uClick'),
      clickT: gl.getUniformLocation(prog, 'uClickT'),
    };

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    const pointer = {
      x: 0.5,
      y: 0.5,
      tx: 0.5,
      ty: 0.5,
      hover: 0,
      last: -1e9,
      click: [0.5, 0.5] as [number, number],
      clickT: -100,
    };
    let frame = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.floor(window.innerWidth * 0.5));
      canvas.height = Math.max(1, Math.floor(window.innerHeight * 0.5));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      const time = (now - t0) / 1000;
      // Hover lens fades in while the pointer moves and out after it rests
      const target = now - pointer.last < 2500 ? 1 : 0;
      pointer.hover += (target - pointer.hover) * 0.05;
      pointer.x += (pointer.tx - pointer.x) * 0.06;
      pointer.y += (pointer.ty - pointer.y) * 0.06;

      gl.uniform2f(u.res, canvas.width, canvas.height);
      gl.uniform1f(u.time, reduced ? 0 : time);
      gl.uniform1f(u.dark, darkRef.current);
      gl.uniform2f(u.mouse, pointer.x, pointer.y);
      gl.uniform1f(u.hover, reduced ? 0 : pointer.hover);
      gl.uniform2f(u.click, pointer.click[0], pointer.click[1]);
      gl.uniform1f(u.clickT, pointer.clickT);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (!reduced) frame = requestAnimationFrame(draw);
    };

    const onMove = (e: PointerEvent) => {
      pointer.tx = e.clientX / window.innerWidth;
      pointer.ty = 1 - e.clientY / window.innerHeight;
      pointer.last = performance.now();
    };
    const onDown = (e: PointerEvent) => {
      pointer.click = [e.clientX / window.innerWidth, 1 - e.clientY / window.innerHeight];
      pointer.clickT = (performance.now() - t0) / 1000;
    };

    resize();
    frame = requestAnimationFrame(draw);
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerdown', onDown);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      gl.deleteProgram(prog);
      gl.deleteBuffer(buf);
    };
  }, []);

  return <canvas ref={ref} aria-hidden className="shader-bg pointer-events-none fixed inset-0 z-0 h-full w-full" />;
}
