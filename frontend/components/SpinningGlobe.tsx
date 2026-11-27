'use client';

import { useEffect, useRef } from 'react';

// Illustrative payment points. The amounts are example prices in each local currency.
const CITIES = [
  { name: 'London', lat: 51.5, lon: -0.1, label: '£45' },
  { name: 'New York', lat: 40.7, lon: -74, label: '$48' },
  { name: 'Paris', lat: 48.9, lon: 2.3, label: '€35' },
  { name: 'Toronto', lat: 43.7, lon: -79.4, label: 'CA$65' },
  { name: 'Sydney', lat: -33.9, lon: 151.2, label: 'A$72' },
  { name: 'Tokyo', lat: 35.7, lon: 139.7, label: '¥6,800' },
  { name: 'Dubai', lat: 25.2, lon: 55.3, label: 'AED 180' },
  { name: 'São Paulo', lat: -23.5, lon: -46.6, label: 'R$240' },
];

// Pairs of cities joined by an arc, by index into CITIES.
const ARCS: [number, number][] = [
  [0, 1],
  [0, 2],
  [4, 5],
  [6, 0],
  [3, 7],
  [1, 7],
];

const SIZE = 480;
const MAX_TILT = 1.1;
const RAD = Math.PI / 180;
const INK = '#1d1a16';
const TOMATO = '#ef6b4a';

type Vec = [number, number, number];
type View = { yaw: number; pitch: number };

const toVec = (lat: number, lon: number): Vec => [
  Math.cos(lat * RAD) * Math.sin(lon * RAD),
  Math.sin(lat * RAD),
  Math.cos(lat * RAD) * Math.cos(lon * RAD),
];

// Turns a point on the globe into the viewer's frame: turn around the vertical axis (yaw), then tilt (pitch).
// The third value is positive when the point faces the viewer.
const toView = ([x, y, z]: Vec, { yaw, pitch }: View): Vec => {
  const cy = Math.cos(yaw);
  const sy = Math.sin(yaw);
  const x1 = x * cy + z * sy;
  const z1 = -x * sy + z * cy;
  const cp = Math.cos(pitch);
  const sp = Math.sin(pitch);
  return [x1, y * cp - z1 * sp, y * sp + z1 * cp];
};

// Points along the great-circle arc between two unit vectors, lifted off the surface in the middle.
const arcPoint = (a: Vec, b: Vec, t: number): Vec => {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const s = Math.sin(omega) || 1;
  const lift = 1 + 0.3 * Math.sin(Math.PI * t);
  const wa = (Math.sin((1 - t) * omega) / s) * lift;
  const wb = (Math.sin(t * omega) / s) * lift;
  return [wa * a[0] + wb * b[0], wa * a[1] + wb * b[1], wa * a[2] + wb * b[2]];
};

const roundedRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

const draw = (ctx: CanvasRenderingContext2D, view: View, time: number, land: Vec[][]) => {
  const c = SIZE / 2;
  const R = SIZE * 0.42;
  ctx.clearRect(0, 0, SIZE, SIZE);

  const project = (v: Vec) => {
    const [x, y, z] = toView(v, view);
    return { x: c + R * x, y: c - R * y, visible: z > 0, z };
  };

  // Ocean.
  const ocean = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
  ocean.addColorStop(0, '#a9d8f7');
  ocean.addColorStop(0.7, '#4f94d6');
  ocean.addColorStop(1, '#2a5f9e');
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fillStyle = ocean;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.clip();

  // Latitude and longitude lines.
  const traceVisible = (points: Vec[]) => {
    ctx.beginPath();
    let pen = false;
    for (const v of points) {
      const p = project(v);
      if (p.visible) {
        if (pen) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        pen = true;
      } else {
        pen = false;
      }
    }
    ctx.stroke();
  };
  ctx.strokeStyle = 'rgba(255,255,255,0.22)';
  ctx.lineWidth = 0.8;
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: Vec[] = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(toVec(lat, lon));
    traceVisible(pts);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: Vec[] = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(toVec(lat, lon));
    traceVisible(pts);
  }

  // Countries: filled where fully on the near side, outlined where they reach the edge.
  for (const ring of land) {
    const pts = ring.map(project);
    if (pts.length < 3) continue;
    const allVisible = pts.every((p) => p.visible);
    const anyVisible = pts.some((p) => p.visible);
    if (!anyVisible) continue;
    if (allVisible) {
      ctx.beginPath();
      pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.closePath();
      ctx.fillStyle = 'rgba(243,237,226,0.94)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(29,26,22,0.5)';
      ctx.lineWidth = 0.6;
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(29,26,22,0.5)';
      ctx.lineWidth = 0.6;
      traceVisible(ring);
    }
  }
  ctx.restore();

  // Edge of the globe.
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255,255,255,0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Payment arcs with a dot travelling along each one.
  const vectors = CITIES.map((city) => toVec(city.lat, city.lon));
  ARCS.forEach(([from, to], index) => {
    ctx.strokeStyle = TOMATO;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 6]);
    ctx.lineDashOffset = -time * 20;
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= 50; i++) {
      const p = project(arcPoint(vectors[from], vectors[to], i / 50));
      if (p.visible) {
        if (pen) ctx.lineTo(p.x, p.y);
        else ctx.moveTo(p.x, p.y);
        pen = true;
      } else {
        pen = false;
      }
    }
    ctx.stroke();
    ctx.setLineDash([]);

    const t = (time * 0.12 + index * 0.17) % 1;
    const dot = project(arcPoint(vectors[from], vectors[to], t));
    if (dot.visible) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, 3.2, 0, Math.PI * 2);
      ctx.fillStyle = TOMATO;
      ctx.fill();
      ctx.strokeStyle = '#fffdf8';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }
  });

  // City markers, pulses and payment labels. A label is skipped if it would sit on one already drawn.
  const placed: { x: number; y: number; w: number; h: number }[] = [];
  CITIES.forEach((city, index) => {
    const p = project(vectors[index]);
    if (!p.visible) return;

    const pulse = (time * 0.6 + index * 0.13) % 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + pulse * 10, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(239,107,74,${0.7 * (1 - pulse)})`;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.4, 0, Math.PI * 2);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    ctx.strokeStyle = TOMATO;
    ctx.lineWidth = 2;
    ctx.stroke();

    // Labels show only near the middle of the globe, where they read clearly.
    if (p.z < 0.3) return;
    const text = `${city.label} Paid`;
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    const width = ctx.measureText(text).width + 22;
    const x = p.x + 10;
    const y = p.y - 26;
    const overlaps = placed.some((b) => x < b.x + b.w + 6 && x + width + 6 > b.x && y < b.y + b.h + 6 && y + 24 + 6 > b.y);
    if (overlaps) return;
    placed.push({ x, y, w: width, h: 24 });
    roundedRect(ctx, x, y, width, 24, 12);
    ctx.fillStyle = '#fffdf8';
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 11, y + 12.5);
  });
};

export default function SpinningGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const landRef = useRef<Vec[][]>([]);
  const viewRef = useRef<View>({ yaw: 0.6, pitch: 0.35 });

  // Country outlines, loaded once from the public folder.
  useEffect(() => {
    let cancelled = false;
    fetch('/geo/countries-110m.json')
      .then((response) => (response.ok ? response.json() : []))
      .then((rings: [number, number][][]) => {
        if (cancelled) return;
        landRef.current = rings.map((ring) => ring.map(([lon, lat]) => toVec(lat, lon)));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;
    let lastInteraction = -Infinity;

    const onDown = (e: PointerEvent) => {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      canvas.style.cursor = 'grabbing';
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const view = viewRef.current;
      view.yaw += (e.clientX - lastX) * 0.006;
      view.pitch = Math.max(-MAX_TILT, Math.min(MAX_TILT, view.pitch + (e.clientY - lastY) * 0.006));
      lastX = e.clientX;
      lastY = e.clientY;
      lastInteraction = performance.now();
    };
    const onUp = () => {
      dragging = false;
      canvas.style.cursor = 'grab';
      lastInteraction = performance.now();
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    let frame = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = (now - last) / 1000;
      last = now;
      // Slow spin when nobody is touching it. Motion stops for visitors who ask for reduced motion.
      const idle = now - lastInteraction > 2500;
      if (!reduceMotion && !dragging && idle) viewRef.current.yaw += dt * 0.12;
      draw(ctx, viewRef.current, now / 1000, landRef.current);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A globe you can drag to turn, showing payments arriving from customers in London, New York, Paris, Toronto, Sydney, Tokyo, Dubai and São Paulo"
      className="mx-auto aspect-square w-full max-w-[480px] cursor-grab touch-pan-y select-none"
    />
  );
}
