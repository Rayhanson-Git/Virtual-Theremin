// Synthetic 21-point MediaPipe hands for the tests, in normalised image
// coordinates (0 to 1, y pointing down), like HandLandmarker returns.
export interface Point { x: number; y: number; z: number }

// An open right hand, palm to the camera, fingers pointing straight up.
// Index order follows MediaPipe: 0 wrist, 1-4 thumb, 5-8 index, 9-12 middle,
// 13-16 ring, 17-20 pinky.
const OPEN: [number, number][] = [
  [0.5, 0.8],
  [0.43, 0.75], [0.38, 0.7], [0.35, 0.65], [0.32, 0.6],
  [0.45, 0.6], [0.44, 0.52], [0.435, 0.47], [0.43, 0.42],
  [0.5, 0.59], [0.5, 0.5], [0.5, 0.44], [0.5, 0.39],
  [0.55, 0.6], [0.555, 0.52], [0.56, 0.47], [0.565, 0.43],
  [0.6, 0.62], [0.61, 0.56], [0.615, 0.52], [0.62, 0.48],
];

export function openHand(): Point[] {
  return OPEN.map(([x, y]) => ({ x, y, z: 0 }));
}

// The same hand turned about the wrist by `degrees` (positive = clockwise on screen).
export function rotatedHand(degrees: number, base: Point[] = openHand()): Point[] {
  const a = (degrees * Math.PI) / 180;
  const w = base[0];
  return base.map((p) => {
    const dx = p.x - w.x, dy = p.y - w.y;
    return { x: w.x + dx * Math.cos(a) - dy * Math.sin(a), y: w.y + dx * Math.sin(a) + dy * Math.cos(a), z: p.z };
  });
}

// Moves the thumb tip to lie `fraction` of the way from where it is to `tip`.
export function thumbTowards(tip: number, fraction: number, base: Point[] = openHand()): Point[] {
  const h = base.map((p) => ({ ...p }));
  const t = h[4], f = h[tip];
  h[4] = { x: t.x + (f.x - t.x) * fraction, y: t.y + (f.y - t.y) * fraction, z: 0 };
  return h;
}

// A closed fist: fingertips folded back to their knuckles.
export function fist(): Point[] {
  const h = openHand();
  for (const [tip, mcp] of [[8, 5], [12, 9], [16, 13], [20, 17]]) h[tip] = { x: h[mcp].x, y: h[mcp].y + 0.03, z: 0 };
  h[4] = { x: 0.46, y: 0.64, z: 0 };
  return h;
}
