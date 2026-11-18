// Draws the README artwork for Virtual Theremin into ../assets.
// Run from design/: npm install && npm run build
// Every number here mirrors src/services (sound.ts, gestures.ts, pattern.ts).
import { C, F, text, paragraph, label, svg, frame, arrow, write, r2, REDUCED } from './lib.mjs';

const CYAN = '#22d3ee', BLUE = '#60a5fa', ORANGE = '#f97316', LIME = '#a3e635', PINK = '#f472b6', AMBER = '#fbbf24';
const DRUMS = [['Kick', 'Index', ORANGE, 8], ['Snare', 'Middle', CYAN, 12], ['Hi-hat', 'Ring', LIME, 16], ['Clap', 'Pinky', PINK, 20]];

// The synthetic open hand used by the tests (src/test/hands.ts), MediaPipe order.
const OPEN = [[0.5, 0.8], [0.43, 0.75], [0.38, 0.7], [0.35, 0.65], [0.32, 0.6], [0.45, 0.6], [0.44, 0.52], [0.435, 0.47], [0.43, 0.42], [0.5, 0.59], [0.5, 0.5], [0.5, 0.44], [0.5, 0.39], [0.55, 0.6], [0.555, 0.52], [0.56, 0.47], [0.565, 0.43], [0.6, 0.62], [0.61, 0.56], [0.615, 0.52], [0.62, 0.48]];
const BONES = [[0, 1], [1, 2], [2, 3], [3, 4], [0, 5], [5, 6], [6, 7], [7, 8], [0, 9], [9, 10], [10, 11], [11, 12], [0, 13], [13, 14], [14, 15], [15, 16], [0, 17], [17, 18], [18, 19], [19, 20], [5, 9], [9, 13], [13, 17]];

function rotate(pts, deg) {
  const a = (deg * Math.PI) / 180, [wx, wy] = pts[0];
  return pts.map(([x, y]) => [wx + (x - wx) * Math.cos(a) - (y - wy) * Math.sin(a), wy + (x - wx) * Math.sin(a) + (y - wy) * Math.cos(a)]);
}
function mirror(pts) { return pts.map(([x, y]) => [1 - x, y]); }
function moveThumb(pts, tip, f) { const p = pts.map((q) => [...q]); p[4] = [p[4][0] + (p[tip][0] - p[4][0]) * f, p[4][1] + (p[tip][1] - p[4][1]) * f]; return p; }
// Draws a hand skeleton: pts in 0..1, placed in a box at (x, y) of size s.
function hand(pts, x, y, s, { col = BLUE, bone = 'rgba(96,165,250,.45)', dot = 3.2 } = {}) {
  const P = pts.map(([px, py]) => [x + (px - 0.5) * s * 2.2, y + (py - 0.6) * s * 2.2]);
  let out = '';
  for (const [a, b] of BONES) out += `<path d="M${r2(P[a][0])} ${r2(P[a][1])}L${r2(P[b][0])} ${r2(P[b][1])}" stroke="${bone}" stroke-width="1.6" stroke-linecap="round"/>`;
  for (const [px, py] of P) out += `<circle cx="${r2(px)}" cy="${r2(py)}" r="${dot}" fill="${col}"/><circle cx="${r2(px)}" cy="${r2(py)}" r="1.2" fill="#fff" opacity=".7"/>`;
  return { svg: out, P };
}

// ------------------------------------------------------------------ hero
function hero(H = 440, file = 'assets/hero.svg') {
  const W = 1280, dy = (H - 440) / 2;
  const style = `.flow{animation:flow 6s linear infinite}.flow2{animation:flow 9s linear infinite}
@keyframes flow{to{transform:translateX(-240px)}}
.bob{animation:bob 4s ease-in-out infinite;transform-box:fill-box;transform-origin:center}
@keyframes bob{0%,100%{transform:translateY(-10px)}50%{transform:translateY(10px)}}${REDUCED}`;
  const wave = (amp, len, y, col, w, cls, op) => {
    let d = `M720 ${y}`;
    for (let x = 720; x <= 1520; x += len / 2) d += ` q${len / 4} ${amp * ((x / (len / 2)) % 2 ? 1 : -1)} ${len / 2} 0`;
    return `<path class="${cls}" d="${d}" stroke="${col}" stroke-width="${w}" opacity="${op}" stroke-linecap="round"/>`;
  };
  // the stage, like the profile card: a tall panel with waves and two hands
  const px = 760, py = 46 + dy, pw = 470, ph = 348;
  let stage = `<rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="20" fill="${C.paper2}" stroke="${C.rule}"/>`;
  stage += `<g clip-path="url(#st)">` + wave(46, 240, py + ph / 2, C.ice, 3, 'flow', 0.85) + wave(30, 240, py + ph / 2 + 6, C.accent, 2.5, 'flow2', 0.8) + wave(60, 240, py + ph / 2 - 4, C.haze, 2, 'flow2', 0.7) + `</g>`;
  const l = hand(moveThumb(mirror(OPEN), 8, 0.55), px + 120, py + 215, 175, { col: CYAN, bone: 'rgba(34,211,238,.4)' });
  const r = hand(rotate(OPEN, 24), px + pw - 120, py + 200, 175, { col: BLUE });
  stage += `<g class="bob">${l.svg}</g><g class="bob" style="animation-delay:-2s">${r.svg}</g>`;
  stage += label('Volume', { x: px + 24, y: py + 34, size: 11 }) + label('Pitch', { x: px + pw - 24, y: py + 34, anchor: 'end', size: 11 });
  const stats = [['2', 'Hands'], ['1', 'Webcam'], ['0', 'Controllers']];
  let st = '';
  stats.forEach(([n, t], i) => {
    st += text(n, { font: F.display, size: 40, x: 64 + i * 120, y: 330 + dy, fill: C.ink });
    st += label(t, { x: 64 + i * 120, y: 356 + dy, size: 11 });
  });
  const body = frame(W, H) +
    label('Gesture & sound · React · 2026', { x: 64, y: 96 + dy }) +
    text('Virtual Theremin', { font: F.display, size: 60, x: 62, y: 164 + dy, fill: C.ink }) +
    paragraph('A webcam instrument: move your hands to play vocals, bass and finger-tap drums. Loop a bar, change key and voice, and record your take.', { x: 64, y: 212 + dy, width: 560, size: 19 }).svg +
    st + label('Play it live', { x: 64, y: 404 + dy, fill: C.accent2 }) + arrow(186, 400 + dy, 204, 400 + dy, { stroke: C.accent2, head: 6 }) + stage;
  write(file, svg(W, H, body, {
    title: 'Virtual Theremin',
    desc: 'A webcam instrument in React: two hands, one webcam, no controllers. The left hand sets the volume and the right hand the pitch, over moving sound waves.',
    style, defs: `<clipPath id="st"><rect x="${px}" y="${py}" width="${pw}" height="${ph}" rx="20"/></clipPath>`,
  }));
}

// -------------------------------------------------------------- gestures
function gestures() {
  const W = 1280, H = 660;
  let b = frame(W, H);
  b += label('The gestures', { x: 56, y: 62 });
  b += text('Two hands, three controls', { font: F.display, size: 30, x: 56, y: 102, fill: C.ink });
  const cw = (W - 112 - 48) / 3, cy = 136, ch = 488;
  const card = (i) => `<rect x="${r2(56 + i * (cw + 24))}" y="${cy}" width="${r2(cw)}" height="${ch}" rx="18" fill="${C.paper2}" stroke="${C.rule}"/>`;
  const cx = (i) => 56 + i * (cw + 24) + cw / 2;

  // 1 — left pinch
  b += card(0);
  const lh = hand(moveThumb(mirror(OPEN), 8, 0.35), cx(0), cy + 200, 150, { col: CYAN, bone: 'rgba(34,211,238,.4)' });
  b += lh.svg;
  const [t, ix] = [lh.P[4], lh.P[8]];
  b += `<path d="M${r2(t[0])} ${r2(t[1])}L${r2(ix[0])} ${r2(ix[1])}" stroke="${AMBER}" stroke-width="2" stroke-dasharray="5 5"/>`;
  b += label('Left hand · pinch', { x: 56 + 24, y: cy + 36, fill: CYAN });
  b += text('Volume', { font: F.display, size: 26, x: 80, y: cy + 352, fill: C.ink });
  b += paragraph('Thumb-to-index distance over hand length. Apart is louder, closer is quieter. Vocal gain up to 0.4; the music player follows too.', { x: 80, y: cy + 384, width: cw - 48, size: 15 }).svg;

  // 2 — right wrist turn
  b += card(1);
  const ox = cx(1), oy = cy + 280;
  const arc = (deg) => [ox + 170 * Math.sin((deg * Math.PI) / 180), oy - 170 * Math.cos((deg * Math.PI) / 180)];
  const [ax, ay] = arc(-90), [bx, by] = arc(50);
  b += `<path d="M${r2(ax)} ${r2(ay)}A170 170 0 0 1 ${r2(bx)} ${r2(by)}" stroke="${C.rule}" stroke-width="10" stroke-linecap="round"/>`;
  b += `<path d="M${r2(ax)} ${r2(ay)}A170 170 0 0 1 ${r2(bx)} ${r2(by)}" stroke="url(#pitch)" stroke-width="4" stroke-linecap="round"/>`;
  b += hand(rotate(OPEN, 12), ox, oy - 36, 135, { col: BLUE }).svg;
  b += text('C3', { font: F.mono, size: 13, x: ax - 4, y: ay + 22, fill: C.ice, anchor: 'middle' }) + text('−90°', { font: F.mono, size: 11, x: ax - 4, y: ay + 38, fill: C.muted, anchor: 'middle' });
  b += text('C6', { font: F.mono, size: 13, x: bx + 10, y: by - 10, fill: C.ice }) + text('+50°', { font: F.mono, size: 11, x: bx + 10, y: by + 6, fill: C.muted });
  b += label('Right hand · turn the wrist', { x: 56 + cw + 24 + 24, y: cy + 36, fill: BLUE });
  b += text('Pitch and bass', { font: F.display, size: 26, x: 56 + cw + 48, y: cy + 352, fill: C.ink });
  b += paragraph('From −90° to +50° the vocal climbs the scale (16 notes of C pentatonic by default), the bass rises from 40 to 120 Hz and gets louder, and the sphere grows.', { x: 56 + cw + 48, y: cy + 384, width: cw - 48, size: 15 }).svg;

  // 3 — taps
  b += card(2);
  const tx = cx(2);
  const tapHand = hand(moveThumb(OPEN, 12, 0.92), tx - 50, cy + 205, 150, { col: BLUE });
  b += tapHand.svg;
  DRUMS.forEach(([name, finger, col, tip], i) => {
    const [fx, fy] = tapHand.P[tip];
    const y = cy + 100 + i * 50;
    b += `<path d="M${r2(fx + 6)} ${r2(fy)}C${r2(fx + 60)} ${r2(fy)} ${tx + 40} ${y} ${tx + 80} ${y}" stroke="${col}" stroke-width="1.4" opacity=".7"/>`;
    b += `<circle cx="${r2(fx)}" cy="${r2(fy)}" r="6" stroke="${col}" stroke-width="2"/>`;
    b += `<rect x="${tx + 84}" y="${y - 15}" width="86" height="30" rx="8" fill="${col}" fill-opacity=".14" stroke="${col}"/>`;
    b += text(name, { font: F.bodyMedium, size: 13, x: tx + 127, y: y + 5, fill: col, anchor: 'middle' });
  });
  const mid = tapHand.P[12], th = tapHand.P[4];
  b += `<circle cx="${r2((mid[0] + th[0]) / 2)}" cy="${r2((mid[1] + th[1]) / 2)}" r="16" fill="${CYAN}" opacity=".25"/>`;
  b += label('Right hand · thumb to finger', { x: 56 + 2 * (cw + 24) + 24, y: cy + 36, fill: ORANGE });
  b += text('Drums', { font: F.display, size: 26, x: 56 + 2 * (cw + 24) + 24, y: cy + 352, fill: C.ink });
  b += paragraph('A hit fires when the thumb comes within 0.25 hand-lengths of a fingertip, and re-arms past 0.35. Keys A S D F play them too.', { x: 56 + 2 * (cw + 24) + 24, y: cy + 384, width: cw - 48, size: 15 }).svg;

  write('assets/gestures.svg', svg(W, H, b, {
    title: 'The gestures',
    desc: 'Left hand pinch sets the volume: apart is louder. Right hand wrist turn from minus 90 to plus 50 degrees moves the vocal from C3 to C6 and raises the bass from 40 to 120 hertz. Right hand thumb to index, middle, ring and pinky plays kick, snare, hi-hat and clap.',
    defs: `<linearGradient id="pitch" x1="0" x2="1"><stop offset="0" stop-color="${BLUE}"/><stop offset="1" stop-color="${C.accent2}"/></linearGradient>`,
  }));
}

// ------------------------------------------------------------- signal flow
function flow() {
  const W = 1280, H = 640;
  let b = frame(W, H);
  b += label('How it works', { x: 56, y: 62 });
  b += text('From a camera frame to sound, in the browser', { font: F.display, size: 30, x: 56, y: 102, fill: C.ink });
  const box = (x, y, w, h, title, lines, col = C.haze, tag) => {
    let s = `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="${C.paper2}" stroke="${col}"/>`;
    if (tag) s += label(tag, { x: x + 16, y: y + 24, size: 10, fill: col });
    s += text(title, { font: F.bodyMedium, size: 16, x: x + 16, y: y + (tag ? 48 : 30), fill: C.ink });
    lines.forEach((l, i) => (s += text(l, { font: F.body, size: 13, x: x + 16, y: y + (tag ? 72 : 54) + i * 19, fill: C.ink2 })));
    return s;
  };
  // inputs
  b += box(56, 150, 200, 110, 'Webcam', ['1280 × 720 ideal', 'shown mirrored'], C.haze, 'input');
  b += box(56, 290, 200, 110, 'Play pad + keys', ['mouse across = turn', 'up = louder · A S D F'], C.haze, 'or');
  b += box(300, 150, 230, 130, 'HandLandmarker', ['MediaPipe Tasks, wasm', '2 hands × 21 points', 'GPU, CPU fallback'], C.ice, 'tracking');
  b += box(574, 150, 220, 250, 'gestures.ts', ['left pinch: 0 to 1', 'right turn: 0 to 1', 'thumb taps: 4 drums', '', 'smoothed 20% a frame', 'for the panels'], C.ice, 'pure, tested');
  // outputs
  b += box(842, 124, 190, 112, 'Vocal', ['PolySynth, 4 presets', 'band-pass + vibrato'], CYAN, 'tone.js');
  b += box(842, 246, 190, 104, 'Bass', ['triangle, 40–120 Hz', 'low-pass 200 Hz'], AMBER, 'tone.js');
  b += box(842, 360, 190, 104, 'Drums', ['CR-78 samples', 'tonejs.github.io'], ORANGE, 'tone.js');
  b += box(842, 474, 190, 104, 'Looper', ['Transport, 16 steps', '60–160 BPM, click'], LIME, 'studio');
  b += box(1074, 250, 150, 108, 'Speakers', ['Tone destination'], C.ink2, 'out');
  b += box(1074, 380, 150, 110, 'Recorder', ['MediaRecorder', 'saves a .webm take'], C.accent2, 'studio');
  b += box(300, 470, 230, 104, 'Three.js scene', ['size: volume and bass', 'colour: pitch and drums'], C.muted, 'visuals');
  b += box(574, 470, 220, 104, 'Music player', ['your file, local URL', 'volume: the left hand'], C.muted, 'player');
  // arrows
  b += arrow(256, 205, 298, 205) + arrow(530, 215, 572, 215);
  b += `<path d="M256 345H560" stroke="${C.haze}" stroke-width="1.5" stroke-dasharray="4 5"/>` + arrow(556, 345, 572, 345);
  b += arrow(794, 190, 840, 184) + arrow(794, 260, 840, 298) + arrow(794, 330, 840, 404);
  b += arrow(1032, 184, 1072, 280) + arrow(1032, 298, 1072, 300) + arrow(1032, 404, 1072, 320) + arrow(1032, 500, 1072, 340);
  b += arrow(937, 474, 937, 466, { stroke: LIME });
  b += arrow(1149, 358, 1149, 378, { stroke: C.accent2 });
  b += arrow(640, 400, 520, 468, { dash: '4 5' }) + arrow(684, 400, 684, 468, { dash: '4 5' });
  b += text('Camera frames never leave the page: the model runs locally in WebAssembly.', { font: F.body, size: 14, x: 56, y: H - 28, fill: C.muted });
  write('assets/signal-flow.svg', svg(W, H, b, {
    title: 'How it works',
    desc: 'The webcam, or the play pad and keys, feeds MediaPipe HandLandmarker, which finds 21 points on each of two hands. Pure gesture maths turns them into a pinch value, a turn value and drum taps. Tone.js plays the vocal, the bass, the drum samples and the looper to the speakers, and a recorder can capture the output. A Three.js scene and the music player follow the same values.',
  }));
}

// ------------------------------------------------------------------ studio
function studio() {
  const W = 1280, H = 600;
  let b = frame(W, H);
  b += label('The studio', { x: 56, y: 62 });
  b += text('Scales, voices and a one-bar looper', { font: F.display, size: 30, x: 56, y: 102, fill: C.ink });
  const SC = [['Major pentatonic', [0, 2, 4, 7, 9]], ['Minor pentatonic', [0, 3, 5, 7, 10]], ['Major', [0, 2, 4, 5, 7, 9, 11]], ['Natural minor', [0, 2, 3, 5, 7, 8, 10]], ['Blues', [0, 3, 5, 6, 7, 10]], ['Dorian', [0, 2, 3, 5, 7, 9, 10]], ['Chromatic', [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]]];
  const names = ['1', 'b2', '2', 'b3', '3', '4', 'b5', '5', 'b6', '6', 'b7', '7'];
  b += label('Scales · any of 12 keys', { x: 56, y: 150, size: 11 });
  names.forEach((n, i) => (b += text(n, { font: F.mono, size: 11, x: 262 + i * 30, y: 176, fill: C.muted, anchor: 'middle' })));
  SC.forEach(([name, steps], r) => {
    const y = 204 + r * 34;
    b += text(name, { font: F.body, size: 14, x: 56, y: y + 5, fill: r === 0 ? C.ink : C.ink2 });
    for (let i = 0; i < 12; i++) {
      const on = steps.includes(i);
      b += `<circle cx="${262 + i * 30}" cy="${y}" r="${on ? 8 : 3}" fill="${on ? (r === 0 ? C.accent2 : C.ice) : C.rule}"/>`;
    }
  });
  b += text('Three octaves from the root in octave 3, plus the top root: 16 to 37 notes.', { font: F.body, size: 13, x: 56, y: 470, fill: C.muted });
  // voices
  const vx = 660;
  b += label('Voices', { x: vx, y: 150, size: 11 });
  const glyph = (kind, x, y) => {
    let d = `M${x} ${y}`;
    const w = 64, a = 12;
    if (kind === 'sine') for (let i = 0; i <= 32; i++) d += `L${r2(x + (i / 32) * w)} ${r2(y - a * Math.sin((i / 32) * Math.PI * 4))}`;
    if (kind === 'saw') d = `M${x} ${y + a}L${x + 32} ${y - a}V${y + a}L${x + 64} ${y - a}V${y + a}`;
    if (kind === 'square') d = `M${x} ${y + a}V${y - a}H${x + 16}V${y + a}H${x + 32}V${y - a}H${x + 48}V${y + a}H${x + 64}`;
    return `<path d="${d}" stroke="${C.ice}" stroke-width="2" stroke-linejoin="round"/>`;
  };
  const V = [['Classic', 'saw', 'Sawtooth, band-pass, vibrato: the original'], ['Glass', 'sine', 'Pure sine, slow swell, long tail'], ['Choir', 'saw', 'Three detuned sawtooths, wide'], ['Chip', 'square', 'Square wave, fast attack']];
  V.forEach(([n, g, d], i) => {
    const y = 190 + i * 62;
    b += `<rect x="${vx}" y="${y - 22}" width="560" height="50" rx="12" fill="${C.paper2}" stroke="${i === 0 ? C.accent : C.rule}"/>`;
    b += glyph(g, vx + 18, y + 3);
    if (n === 'Choir') b += `<g opacity=".5" transform="translate(4 -4)">${glyph('saw', vx + 18, y + 3)}</g>`;
    b += text(n, { font: F.bodyMedium, size: 15, x: vx + 104, y: y + 8, fill: C.ink });
    b += text(d, { font: F.body, size: 13, x: vx + 184, y: y + 8, fill: C.ink2 });
  });
  // looper strip
  const ly = 470, lx = vx;
  b += label('Looper', { x: lx, y: ly, size: 11 });
  const seg = (x, w, t, col, fill) => `<rect x="${x}" y="${ly + 16}" width="${w}" height="34" rx="8" fill="${fill}" stroke="${col}"/>` + text(t, { font: F.body, size: 13, x: x + w / 2, y: ly + 38, fill: C.ink, anchor: 'middle' });
  b += seg(lx, 170, 'Count-in: 4 clicks', C.haze, C.paper2) + arrow(lx + 174, ly + 33, lx + 192, ly + 33);
  b += seg(lx + 196, 170, 'Record one bar', C.accent, 'rgba(219,43,51,.14)') + arrow(lx + 370, ly + 33, lx + 388, ly + 33);
  b += seg(lx + 392, 168, 'Loop · overdub', LIME, 'rgba(163,230,53,.10)');
  b += text('16 steps, snapped to sixteenths when Quantise is on. 60–160 BPM, 96 to start.', { font: F.body, size: 13, x: lx, y: ly + 76, fill: C.muted });
  write('assets/studio.svg', svg(W, H, b, {
    title: 'The studio',
    desc: 'Seven scales in any of twelve keys: major pentatonic (the default), minor pentatonic, major, natural minor, blues, dorian and chromatic. Four voices: Classic, Glass, Choir and Chip. A one-bar drum looper: four count-in clicks, record one bar, then it loops and you can overdub, at 60 to 160 BPM.',
  }));
}

hero(); hero(640, 'design/social.svg'); gestures(); flow(); studio();
