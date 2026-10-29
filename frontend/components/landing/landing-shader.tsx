'use client';

import { useTheme } from 'next-themes';
import { useEffect, useRef } from 'react';

// The full-page background for the landing page. A slow, low-frequency domain warp in amber and orange
// over warm cream (light) or charcoal (dark). With no WebGL the CSS gradient in .landing-bg shows instead.
// With reduced motion it paints one still frame, and repaints when the theme changes.
const VERT = `
attribute vec2 a;
void main() { gl_Position = vec4(a, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uDark;

float hash(vec2 p) {
  p = fract(p * vec2(443.897, 441.423));
  p += dot(p, p.yx + 19.19);
  return fract((p.x + p.y) * p.x);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

// Three octaves are enough for a background this soft, and keep the cost low.
float fbm(vec2 p) {
  float s = 0.0;
  float a = 0.5;
  for (int i = 0; i < 3; i++) {
    s += a * noise(p);
    p = p * 2.02 + vec2(11.7, 7.3);
    a *= 0.5;
  }
  return s;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  vec2 p = vec2(uv.x * uRes.x / uRes.y, uv.y) * 1.3;
  float t = uTime * 0.04;

  // Two rounds of domain warping give slow folds.
  vec2 q = vec2(fbm(p + vec2(0.0, t)), fbm(p + vec2(5.2, 1.3) - vec2(t * 0.8, 0.0)));
  vec2 r = vec2(fbm(p + 1.8 * q + vec2(1.7, 9.2) + t * 0.6), fbm(p + 1.8 * q + vec2(8.3, 2.8) - t * 0.5));
  float f = fbm(p + 1.8 * r);

  vec3 cream = vec3(1.0, 0.984, 0.961);
  vec3 charcoal = vec3(0.094, 0.094, 0.106);
  vec3 amber = vec3(0.961, 0.620, 0.043);
  vec3 orange = vec3(0.918, 0.345, 0.047);
  vec3 deep = vec3(0.573, 0.251, 0.055);

  vec3 tint = mix(amber, orange, smoothstep(0.3, 0.7, r.y));
  tint = mix(tint, deep, smoothstep(0.6, 0.95, q.x) * 0.4);
  vec3 base = mix(cream, charcoal, uDark);
  float strength = mix(0.2, 0.13, uDark) * smoothstep(0.3, 0.8, f);
  vec3 col = mix(base, tint, strength);

  // A soft vignette, and a little dither against banding.
  col *= mix(0.95, 1.0, smoothstep(1.2, 0.3, length(uv - 0.5)));
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(col, 1.0);
}
`;

export function LandingShader() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const { resolvedTheme } = useTheme();
  const dark = resolvedTheme === 'dark';
  const darkRef = useRef(dark);
  const repaint = useRef<(() => void) | null>(null);

  // A theme change is picked up on the next frame, or at once when the page is still.
  useEffect(() => {
    darkRef.current = dark;
    repaint.current?.();
  }, [dark]);

  useEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const gl = el.getContext('webgl', { alpha: true, antialias: false, powerPreference: 'low-power' });
    if (!gl) return; // no WebGL: the CSS gradient stays on screen

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (gl.getShaderParameter(s, gl.COMPILE_STATUS)) return s;
      console.error('Landing shader failed to compile:', gl.getShaderInfoLog(s));
      gl.deleteShader(s);
      return null;
    };
    const vs = compile(gl.VERTEX_SHADER, VERT);
    const fs = compile(gl.FRAGMENT_SHADER, FRAG);
    const prog = gl.createProgram();
    if (!vs || !fs || !prog) return;
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      console.error('Landing shader failed to link:', gl.getProgramInfoLog(prog));
      return;
    }
    gl.useProgram(prog);

    // One oversized triangle covers the screen.
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    const uRes = gl.getUniformLocation(prog, 'uRes');
    const uTime = gl.getUniformLocation(prog, 'uTime');
    const uDark = gl.getUniformLocation(prog, 'uDark');

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t0 = performance.now();
    let frame = 0;
    let last = -1e9;

    const size = () => {
      // The pixel ratio is capped at 1.5. The shader is soft, so more would not show.
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      el.width = Math.max(1, Math.round(el.clientWidth * dpr));
      el.height = Math.max(1, Math.round(el.clientHeight * dpr));
      gl.viewport(0, 0, el.width, el.height);
      gl.uniform2f(uRes, el.width, el.height);
    };
    const paint = (now: number) => {
      gl.uniform1f(uTime, reduced ? 0 : (now - t0) / 1000);
      gl.uniform1f(uDark, darkRef.current ? 1 : 0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const tick = (now: number) => {
      frame = requestAnimationFrame(tick);
      // About 30 frames a second is plenty for motion this slow.
      if (now - last < 33) return;
      last = now;
      paint(now);
    };
    const onResize = () => {
      size();
      paint(performance.now());
    };

    repaint.current = () => paint(performance.now());
    size();
    paint(performance.now());
    if (!reduced) frame = requestAnimationFrame(tick);
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', onResize);
      repaint.current = null;
      gl.deleteProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.deleteBuffer(buf);
    };
  }, []);

  return (
    <div aria-hidden className="landing-bg pointer-events-none fixed inset-0 -z-10">
      <canvas ref={canvas} className="absolute inset-0 h-full w-full" />
    </div>
  );
}
