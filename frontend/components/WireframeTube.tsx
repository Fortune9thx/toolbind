"use client";

import { useEffect, useRef } from "react";

/**
 * Lime 3D wireframe tube — a lattice "hose" of square grid cells winding
 * from bottom-right up to top-right, drawn on canvas with a hand-rolled
 * perspective projection (no three.js dependency for one hero object).
 *
 * The surface is a real swept tube: a 3D centerline, a rotation-minimizing
 * frame at each step along it, and a ring of points around that frame.
 * Drawing both the along-length edges and the around-ring edges is what
 * produces square cells rather than the concentric ellipses / sine ribbon
 * this deliberately replaces.
 *
 * Motion: the tube GROWS along its length once on mount, then holds. It
 * never loops or spins. Under prefers-reduced-motion it renders complete
 * and static on the first frame.
 */

const RINGS = 116; // steps along the tube's length
const SIDES = 12; // points around the circumference
const FOCAL = 1180;
const CAMERA_Z = 1000;

type V3 = { x: number; y: number; z: number };

const sub = (a: V3, b: V3): V3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });
const cross = (a: V3, b: V3): V3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});
const norm = (a: V3): V3 => {
  const l = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / l, y: a.y / l, z: a.z / l };
};

/** The tube's centerline: enters low-right, S-bends left, exits top-right. */
function centerline(t: number, h: number): V3 {
  const a = t * Math.PI;
  return {
    x: Math.sin(a * 1.45 + 0.6) * 172 + 40,
    y: (0.5 - t) * h * 1.22,
    z: Math.cos(a * 1.15 + 0.35) * 232,
  };
}

/** Tube thickness — tapers slightly at both ends so it reads as swept. */
function radius(t: number): number {
  return 54 + Math.sin(t * Math.PI) * 26;
}

export function WireframeTube() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let raf = 0;
    let start = 0;
    let width = 0;
    let height = 0;

    const resize = () => {
      const parent = canvas.parentElement;
      if (!parent) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = parent.clientWidth;
      height = parent.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** Build every ring's projected points for the current geometry. */
    const buildRings = () => {
      const pts: { x: number; y: number; depth: number }[][] = [];

      // Rotation-minimizing frame, carried along the curve so the lattice
      // doesn't twist arbitrarily between steps.
      let up: V3 = { x: 0, y: 1, z: 0 };

      for (let i = 0; i < RINGS; i++) {
        const t = i / (RINGS - 1);
        const p = centerline(t, height);
        const ahead = centerline(Math.min(1, t + 0.004), height);
        const behind = centerline(Math.max(0, t - 0.004), height);
        const tangent = norm(sub(ahead, behind));

        let side = cross(up, tangent);
        if (Math.hypot(side.x, side.y, side.z) < 1e-4) side = { x: 1, y: 0, z: 0 };
        side = norm(side);
        up = norm(cross(tangent, side));

        const r = radius(t);
        const ring: { x: number; y: number; depth: number }[] = [];

        for (let s = 0; s < SIDES; s++) {
          const a = (s / SIDES) * Math.PI * 2;
          const ca = Math.cos(a) * r;
          const sa = Math.sin(a) * r;
          const wx = p.x + side.x * ca + up.x * sa;
          const wy = p.y + side.y * ca + up.y * sa;
          const wz = p.z + side.z * ca + up.z * sa;

          const denom = Math.max(1, CAMERA_Z - wz);
          const scale = FOCAL / denom;
          ring.push({
            x: width * 0.5 + wx * scale,
            y: height * 0.5 - wy * scale,
            depth: denom,
          });
        }
        pts.push(ring);
      }
      return pts;
    };

    let rings = buildRings();

    const draw = (progress: number) => {
      ctx.clearRect(0, 0, width, height);
      const visible = Math.max(2, Math.floor(rings.length * progress));

      ctx.lineWidth = 1;
      ctx.lineCap = "round";

      for (let i = 0; i < visible; i++) {
        const ring = rings[i];
        const next = rings[i + 1];

        for (let s = 0; s < SIDES; s++) {
          const p = ring[s];
          const q = ring[(s + 1) % SIDES];

          // Depth fade: far side of the tube recedes instead of reading
          // as a flat tangle of equally-weighted lines.
          const far = p.depth > CAMERA_Z - 40;
          const alpha = far ? 0.16 : 0.62;

          // Around-the-ring edge
          ctx.strokeStyle = `rgba(124, 255, 77, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(q.x, q.y);
          ctx.stroke();

          // Along-the-length edge — together with the ring edge above,
          // this closes each square cell of the lattice.
          if (next && i + 1 < visible) {
            const n = next[s];
            ctx.strokeStyle = `rgba(124, 255, 77, ${alpha * 0.85})`;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(n.x, n.y);
            ctx.stroke();
          }
        }
      }

      // Leading edge glows slightly brighter while the tube is growing.
      if (progress < 1 && visible > 1) {
        const tip = rings[visible - 1];
        ctx.strokeStyle = "rgba(182, 255, 59, 0.95)";
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        tip.forEach((p, s) => (s === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
        ctx.closePath();
        ctx.stroke();
      }
    };

    const frame = (now: number) => {
      if (!start) start = now;
      const elapsed = now - start;
      const progress = Math.min(1, elapsed / 1750);
      // easeOutCubic — fast out of the gate, settles rather than stopping dead
      const eased = 1 - Math.pow(1 - progress, 3);
      draw(eased);
      if (progress < 1) raf = requestAnimationFrame(frame);
    };

    const onResize = () => {
      resize();
      rings = buildRings();
      draw(1);
    };

    resize();
    rings = buildRings();

    if (reduced) {
      draw(1);
    } else {
      raf = requestAnimationFrame(frame);
    }

    window.addEventListener("resize", onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />;
}
