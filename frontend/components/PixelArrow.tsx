"use client";

/** Blocky pixel arrow — drawn from square cells so it reads as pixel art,
 * matching the reference's chunky lime arrow rather than a smooth glyph. */
export function PixelArrow({ size = 14, color = "var(--lime)" }: { size?: number; color?: string }) {
  // Each entry is a [col, row] cell on a 12x9 grid: a shaft plus a
  // stepped arrowhead.
  const cells: [number, number][] = [
    // shaft
    [0, 4], [1, 4], [2, 4], [3, 4], [4, 4], [5, 4], [6, 4], [7, 4],
    // stepped head
    [5, 2], [6, 3], [6, 5], [5, 6],
    [7, 3], [7, 5],
    [8, 4],
  ];
  const cell = size / 9;

  return (
    <svg
      width={cell * 10}
      height={cell * 9}
      viewBox="0 0 10 9"
      aria-hidden="true"
      style={{ display: "block", flex: "0 0 auto" }}
    >
      {cells.map(([c, r]) => (
        <rect key={`${c}-${r}`} x={c} y={r} width={1} height={1} fill={color} />
      ))}
    </svg>
  );
}
