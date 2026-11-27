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
const toRad = (degrees: number) => (degrees * Math.PI) / 180;

type Vec = [number, number, number];

const toVec = (lat: number, lon: number): Vec => [
  Math.cos(toRad(lat)) * Math.sin(toRad(lon)),
  Math.sin(toRad(lat)),
  Math.cos(toRad(lat)) * Math.cos(toRad(lon)),
];

// Turns the globe around its vertical axis. z is positive when the point faces the viewer.
const rotate = ([x, y, z]: Vec, angle: number): Vec => [
  x * Math.cos(angle) + z * Math.sin(angle),
  y,
  -x * Math.sin(angle) + z * Math.cos(angle),
];

// Points along the great-circle arc between two unit vectors, lifted off the surface in the middle.
const arcPoint = (a: Vec, b: Vec, t: number): Vec => {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
  const omega = Math.acos(dot);
  const s = Math.sin(omega) || 1;
  const lift = 1 + 0.3 * Math.sin(Math.PI * t);
  return [
    ((Math.sin((1 - t) * omega) * a[0] + Math.sin(t * omega) * b[0]) / s) * lift,
    ((Math.sin((1 - t) * omega) * a[1] + Math.sin(t * omega) * b[1]) / s) * lift,
    ((Math.sin((1 - t) * omega) * a[2] + Math.sin(t * omega) * b[2]) / s) * lift,
  ];
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

const draw = (ctx: CanvasRenderingContext2D, angle: number, time: number) => {
  const c = SIZE / 2;
  const R = SIZE * 0.42;
  ctx.clearRect(0, 0, SIZE, SIZE);

  // Sphere body.
  const body = ctx.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
  body.addColorStop(0, '#222226');
  body.addColorStop(1, '#050505');
  ctx.beginPath();
  ctx.arc(c, c, R, 0, Math.PI * 2);
  ctx.fillStyle = body;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 1;
  ctx.stroke();

  const project = (v: Vec) => {
    const [x, y, z] = rotate(v, angle);
    return { x: c + R * x, y: c - R * y, visible: z > 0, z };
  };

  // Latitude and longitude lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.09)';
  ctx.lineWidth = 1;
  const drawLine = (points: Vec[]) => {
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
  for (let lon = -180; lon < 180; lon += 30) {
    const pts: Vec[] = [];
    for (let lat = -90; lat <= 90; lat += 3) pts.push(toVec(lat, lon));
    drawLine(pts);
  }
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts: Vec[] = [];
    for (let lon = -180; lon <= 180; lon += 3) pts.push(toVec(lat, lon));
    drawLine(pts);
  }

  // Payment arcs with a dot travelling along each one.
  const vectors = CITIES.map((city) => toVec(city.lat, city.lon));
  ARCS.forEach(([from, to], index) => {
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 1.2;
    ctx.setLineDash([4, 6]);
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
      ctx.arc(dot.x, dot.y, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();
    }
  });

  // City markers, pulses and payment labels.
  CITIES.forEach((city, index) => {
    const p = project(vectors[index]);
    if (!p.visible) return;

    const pulse = (time * 0.6 + index * 0.13) % 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3 + pulse * 9, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - pulse)})`;
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, 2.8, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();

    // Labels show only near the middle of the globe, where they read clearly.
    if (p.z < 0.3) return;
    const text = `${city.label} Paid`;
    ctx.font = '600 12px system-ui, -apple-system, Segoe UI, sans-serif';
    const width = ctx.measureText(text).width + 22;
    const x = p.x + 10;
    const y = p.y - 26;
    roundedRect(ctx, x, y, width, 24, 12);
    ctx.fillStyle = 'rgba(255,255,255,0.96)';
    ctx.fill();
    ctx.fillStyle = '#18181b';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + 11, y + 12.5);
  });
};

export default function SpinningGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = SIZE * dpr;
    canvas.height = SIZE * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduceMotion) {
      draw(ctx, 0.6, 0);
      return;
    }

    let angle = 0.6;
    let last = performance.now();
    let frame = 0;
    const loop = (now: number) => {
      angle += ((now - last) / 1000) * 0.18;
      last = now;
      draw(ctx, angle, now / 1000);
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label="A spinning globe showing payments arriving from customers in London, New York, Paris, Toronto, Sydney, Tokyo, Dubai and São Paulo"
      className="mx-auto aspect-square w-full max-w-[480px]"
    />
  );
}
