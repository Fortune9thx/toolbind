"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Lime perspective floor grid receding to a vanishing point, drawn as SVG
 * lines with a real projection (not a CSS-rotated square grid, which
 * distorts line weight as it recedes).
 *
 * Sits behind page content on the light field-b routes. On scroll the grid
 * eases very slightly toward the camera; under prefers-reduced-motion it
 * holds completely still.
 */

const VIEW_W = 1600;
const VIEW_H = 900;
const HORIZON = 300; // y of the vanishing line
const VP_X = VIEW_W / 2;

/** Rounds to a fixed precision before it ever reaches an SVG attribute --
 * without this, server and client can format the identical float's
 * string representation with a different trailing digit (a real,
 * observed Next.js SSR/hydration float-serialization mismatch, not a
 * cosmetic one), which React logs as a hydration error on every load. */
function fix(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Depth rows, spaced so they bunch up toward the horizon. */
function rowY(i: number, rows: number, offset: number): number {
  const t = (i + offset) / rows; // 0 at horizon → 1 at viewer
  // Perspective foreshortening: y grows non-linearly away from the horizon.
  return fix(HORIZON + (VIEW_H - HORIZON) * Math.pow(t, 2.35));
}

export function PerspectiveGrid() {
  const [offset, setOffset] = useState(0);
  const raf = useRef(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const onScroll = () => {
      cancelAnimationFrame(raf.current);
      raf.current = requestAnimationFrame(() => {
        // A slow ease toward the camera — one row of travel over a long
        // scroll, never a conveyor belt.
        setOffset((window.scrollY % 600) / 600);
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  const rows = 22;
  const cols = 30;

  return (
    <svg
      viewBox={`0 0 ${VIEW_W} ${VIEW_H}`}
      preserveAspectRatio="xMidYMax slice"
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        zIndex: 0,
      }}
    >
      {/* Depth lines — horizontals bunching toward the vanishing point */}
      {Array.from({ length: rows }).map((_, i) => {
        const y = rowY(i, rows, offset);
        if (y > VIEW_H) return null;
        const fade = Math.pow((y - HORIZON) / (VIEW_H - HORIZON), 0.6);
        return (
          <line
            key={`h-${i}`}
            x1={0}
            x2={VIEW_W}
            y1={y}
            y2={y}
            stroke="var(--lime)"
            strokeWidth={0.9}
            opacity={fix(0.1 + fade * 0.42)}
          />
        );
      })}

      {/* Radials — converging on the vanishing point */}
      {Array.from({ length: cols + 1 }).map((_, i) => {
        // Spread columns across a wide span so the outer ones exit the
        // frame edges rather than all bunching centrally.
        const spread = (i / cols - 0.5) * VIEW_W * 4.2;
        return (
          <line
            key={`v-${i}`}
            x1={VP_X}
            y1={HORIZON}
            x2={fix(VP_X + spread)}
            y2={VIEW_H}
            stroke="var(--lime)"
            strokeWidth={0.9}
            opacity={0.3}
          />
        );
      })}

      {/* Soften the grid as it approaches the horizon so the vanishing
          point reads as distance rather than a hard seam. */}
      <defs>
        <linearGradient id="tb-grid-fade" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--field-b)" stopOpacity="1" />
          <stop offset="18%" stopColor="var(--field-b)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={0} y={HORIZON - 60} width={VIEW_W} height={320} fill="url(#tb-grid-fade)" />
    </svg>
  );
}
