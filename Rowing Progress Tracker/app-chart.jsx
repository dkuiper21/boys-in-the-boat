// app-chart.jsx — Nautical chart, v2: real geography.
// Projection: plate carrée. Top edge = 47°N, bottom = 37°N (120 px/degree).
// Longitude anchored at 125°W = x60, ~89 px/degree (cos 42°).
//   x = 60 + (lon + 125) * 89
//   y = (47 - lat) * 120

const CHART_PALETTE = {
  paper: "#f1e6cf",
  paperDeep: "#e6d6b5",
  paperEdge: "#d5c298",
  ink: "#1b2b3a",
  inkSoft: "#3b4e63",
  ocean: "#284f6f",
  oceanDeep: "#18324a",
  river: "#4a7a99",
  land: "#dac89e",
  landMid: "#cfb988",
  landEdge: "#a68a5f",
  hills: "#8a6f44",
  brass: "#b67c34",
  brassLight: "#d9a55b",
  redInk: "#a8412c",
  redInkSoft: "#c46a4c",
  snow: "#f8f0db",
};

// --- Geography (all coords derived from real lat/long) -----------------------

// Pacific coastline, 47°N → 37°N. Real capes: Blanco (42.84), Mendocino (40.44),
// Point Arena (38.95), Point Reyes (38.0). Columbia mouth at 46.25.
const COAST_PATH = `
  M 132,-10
  C 138,40 142,70 145,90
  C 147,105 150,115 152,126
  C 155,150 150,175 150,199
  C 148,230 146,258 145,286
  C 143,330 130,395 121,438
  C 110,468 95,486 99,502
  C 102,520 108,536 112,552
  C 118,580 126,606 131,630
  C 134,640 139,648 142,654
  C 138,684 136,714 135,744
  C 128,758 108,772 110,790
  C 112,815 140,860 167,907
  C 170,928 171,947 172,966
  C 178,990 210,1024 233,1044
  C 235,1056 228,1070 238,1080
  C 248,1086 262,1092 270,1096
  L 281,1100
  L 284,1107
  C 283,1120 285,1140 288,1158
  C 291,1175 294,1190 296,1210
`;
const LAND_PATH = COAST_PATH + ` L 610,1210 L 610,-10 Z`;

// San Francisco Bay — Golden Gate at (281,1100)/(284,1107), San Pablo Bay,
// Carquinez → Suisun, then the long East Bay shore past Berkeley & Oakland.
const SF_BAY_PATH = `
  M 276,1098
  C 284,1096 290,1096 294,1098
  C 291,1090 288,1082 292,1075
  C 286,1066 292,1056 302,1056
  C 312,1056 316,1062 318,1066
  C 326,1064 334,1060 342,1062
  C 344,1066 340,1070 334,1070
  C 326,1072 320,1072 314,1076
  C 310,1082 308,1090 306,1098
  C 305,1108 303,1118 298,1130
  C 294,1142 288,1148 284,1142
  C 282,1132 282,1120 281,1112
  C 280,1106 278,1102 276,1098
  Z
`;

// Rivers
const RIVERS = [
  // Columbia — mouth at 46.25°N, east through the gorge past Portland.
  "M 145,90 C 185,110 225,155 266,168 C 330,186 400,162 460,158 C 510,154 550,162 590,152",
  // Willamette — Portland south through Salem to Eugene.
  "M 266,178 C 254,200 240,222 234,247 C 228,292 233,322 230,354",
  // Sacramento — Shasta Lake south through the Central Valley to Suisun Bay.
  "M 305,758 C 308,802 322,862 340,902 C 360,950 372,982 372,1010 C 370,1035 352,1050 342,1060",
  // San Joaquin — joins at Suisun from the southeast.
  "M 408,1145 C 385,1110 360,1080 342,1064",
  // Klamath — mouth at 41.55°N, east toward Upper Klamath Lake.
  "M 142,654 C 182,660 222,648 260,628 C 292,612 322,582 334,558",
  // Rogue — Gold Beach inland toward Medford.
  "M 112,552 C 152,560 200,556 240,550",
  // Umpqua — to Roseburg.
  "M 121,418 C 158,430 186,444 208,452",
  // Russian — Jenner up the coast range.
  "M 227,1026 C 238,1010 246,988 250,962",
];

// Volcanic peaks (real positions). Shasta's triangle is unlabeled — the
// milestone supplies the name.
const PEAKS = [
  { x: 354, y: 196, h: 13, name: "Mt. Hood" },
  { x: 345, y: 280, h: 10, name: "Mt. Jefferson" },
  { x: 348, y: 348, h: 10, name: "Three Sisters" },
  { x: 298, y: 547, h: 10, name: "Mt. McLoughlin" },
  { x: 316, y: 662, h: 15, name: "" },
  { x: 370, y: 781, h: 12, name: "Lassen Pk." },
];

const LAKES = [
  { cx: 317, cy: 487, r: 4.5, name: "Crater L." },
  { cx: 338, cy: 550, rx: 5, ry: 10, name: "Upper Klamath L." },
  { cx: 305, cy: 753, rx: 8, ry: 4, name: "Shasta L." },
  { cx: 251, cy: 958, rx: 4, ry: 6, name: "Clear L." },
  { cx: 501, cy: 949, rx: 7, ry: 11, name: "L. Tahoe" },
];

function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
function generateHatches(cx, cy, w, h, count, rng) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = cx + (rng() - 0.5) * w;
    const y = cy + (rng() - 0.5) * h;
    const sw = 5 + rng() * 8;
    out.push(`M ${x.toFixed(1)},${y.toFixed(1)} q ${(sw / 2).toFixed(1)},-${(sw / 4).toFixed(1)} ${sw.toFixed(1)},${(rng() * 2 - 1).toFixed(1)}`);
  }
  return out;
}
const RANGES = [
  ...generateHatches(182, 300, 55, 380, 55, seededRng(11)),  // OR Coast Range
  ...generateHatches(352, 330, 70, 440, 75, seededRng(22)),  // OR Cascades
  ...generateHatches(235, 595, 120, 110, 40, seededRng(33)), // Klamath/Siskiyou
  ...generateHatches(205, 900, 65, 240, 45, seededRng(44)),  // CA Coast Range
  ...generateHatches(490, 1000, 110, 360, 80, seededRng(55)),// Sierra Nevada
  ...generateHatches(340, 725, 85, 140, 30, seededRng(66)),  // S. Cascades
];

// Milestone city positions — projected from real lat/long.
const CITY_XY = {
  "Sherwood":   { x: 252, y: 197 },
  "Salem":      { x: 234, y: 247 },
  "Eugene":     { x: 230, y: 354 },
  "Roseburg":   { x: 208, y: 454 },
  "Medford":    { x: 250, y: 560 },
  "Mt. Shasta": { x: 300, y: 683 },
  "Redding":    { x: 293, y: 769 },
  "Chico":      { x: 341, y: 872 },
  "Sacramento": { x: 373, y: 1010 },
  "Vallejo":    { x: 304, y: 1066 },
  "Berkeley":   { x: 313, y: 1094 },
};
const LABEL_LEFT = new Set(["Sherwood", "Salem", "Eugene", "Roseburg", "Mt. Shasta", "Vallejo"]);

const CONTEXT_CITIES = [
  { x: 266, y: 178, name: "Portland" },
  { x: 164, y: 95, name: "Astoria", small: true },
  { x: 135, y: 744, name: "Eureka", small: true },
  { x: 167, y: 907, name: "Ft. Bragg", small: true },
  { x: 286, y: 1112, name: "San Francisco", small: true, left: true },
  { x: 522, y: 896, name: "Reno", small: true },
];

const SOUNDINGS = [
  [60, 60, "742"], [100, 150, "388"], [70, 300, "516"],
  [50, 430, "698"], [60, 560, "893"], [90, 680, "1204"],
  [60, 760, "1407"], [100, 840, "962"], [50, 890, "1530"],
  [140, 1010, "206"], [180, 1090, "88"], [240, 1130, "42"],
  [60, 1120, "1872"], [130, 580, "647"], [40, 200, "904"],
  [150, 720, "310"], [200, 1040, "129"], [110, 380, "571"],
];

// Bathymetry contours (≈100 fm and 1000 fm lines paralleling the coast)
const BATHY = [
  "M 100,-10 C 108,90 112,200 108,300 C 102,400 70,470 72,510 C 78,560 92,620 100,660 C 96,710 82,760 84,800 C 90,860 130,930 142,975 C 150,1010 180,1050 205,1078 C 225,1095 245,1108 255,1125",
  "M 58,-10 C 64,120 68,260 62,360 C 56,440 36,480 38,520 C 46,580 58,640 62,690 C 56,740 44,780 48,820 C 58,880 98,950 110,1000 C 120,1040 148,1080 168,1112",
];

// Grid — real degree lines.
const LAT_LINES = [
  { y: 120, label: "46°" }, { y: 240, label: "45°" }, { y: 360, label: "44°" },
  { y: 480, label: "43°" }, { y: 600, label: "42°" }, { y: 720, label: "41°" },
  { y: 840, label: "40°" }, { y: 960, label: "39°" }, { y: 1080, label: "38°" },
];
const LON_LINES = [
  { x: 149, label: "124°" }, { x: 238, label: "123°" },
  { x: 327, label: "122°" }, { x: 416, label: "121°" }, { x: 505, label: "120°" },
];

// --- Route --------------------------------------------------------------------
// The route follows every waypoint along Interstate 5 (x/y live in data.jsx),
// so the boats move at an even on-screen pace and the line follows the valleys.
const ROUTE = WAYPOINTS.map((w) => ({ at: w.at, x: w.x, y: w.y }));

// Chart units per kilometre, from the projection (120 units per degree of
// latitude, 111.2 km per degree).
const UNITS_PER_KM = 120 / 111.2;

// Position on the route at a distance from Sherwood, plus the heading
// (degrees, pointing toward Berkeley) of the leg it sits on.
function routePositionAt(metersFromStart) {
  const m = Math.max(0, Math.min(metersFromStart, TOTAL_METERS));
  for (let i = 0; i < ROUTE.length - 1; i++) {
    const a = ROUTE[i], b = ROUTE[i + 1];
    if (m <= b.at) {
      const frac = a.at === b.at ? 0 : (m - a.at) / (b.at - a.at);
      return {
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
        heading: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI,
      };
    }
  }
  const a = ROUTE[ROUTE.length - 2], b = ROUTE[ROUTE.length - 1];
  return { x: b.x, y: b.y, heading: Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI };
}

// SVG path along the route between two distances (m0 < m1).
function routePath(m0, m1) {
  const pts = [routePositionAt(m0)];
  for (const p of ROUTE) if (p.at > m0 && p.at < m1) pts.push(p);
  pts.push(routePositionAt(m1));
  return "M " + pts.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" L ");
}

// Bounding box of the route between two distances.
function routeBounds(m0, m1) {
  const pts = [routePositionAt(m0), routePositionAt(m1)];
  for (const p of ROUTE) if (p.at > m0 && p.at < m1) pts.push(p);
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}

// Cumulative position after each of one rower's sessions, oldest first.
function sessionMarks(sessions, person, start, direction) {
  const out = [];
  let total = 0;
  for (const s of sessions) {
    if (s.person !== person) continue;
    total += s.meters;
    const at = start + direction * total;
    if (at < 0 || at > TOTAL_METERS) break;
    out.push({ id: s.id, at, date: s.date, meters: s.meters });
  }
  return out;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function fmtMonthYear(d) {
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

// --- Chart frame (degree-banded border, like a real chart) -------------------

function ChartFrame() {
  const bands = [];
  // left + right lat bands, 0.5° = 60px
  for (let i = 0; i < 20; i++) {
    const y0 = 26 + i * 60;
    if (y0 >= 1174) break;
    const h = Math.min(60, 1174 - y0);
    const fill = i % 2 ? CHART_PALETTE.paper : CHART_PALETTE.ink;
    bands.push(<rect key={`bl${i}`} x="14" y={y0} width="12" height={h} fill={fill} stroke={CHART_PALETTE.ink} strokeWidth="0.4" />);
    bands.push(<rect key={`br${i}`} x="574" y={y0} width="12" height={h} fill={fill} stroke={CHART_PALETTE.ink} strokeWidth="0.4" />);
  }
  // top + bottom lon bands, 0.5° = 44.5px
  for (let i = 0; i < 13; i++) {
    const x0 = 26 + i * 44.5;
    if (x0 >= 574) break;
    const w = Math.min(44.5, 574 - x0);
    const fill = i % 2 ? CHART_PALETTE.paper : CHART_PALETTE.ink;
    bands.push(<rect key={`bt${i}`} x={x0} y="14" width={w} height="12" fill={fill} stroke={CHART_PALETTE.ink} strokeWidth="0.4" />);
    bands.push(<rect key={`bb${i}`} x={x0} y="1174" width={w} height="12" fill={fill} stroke={CHART_PALETTE.ink} strokeWidth="0.4" />);
  }
  return (
    <g>
      {/* margin fills */}
      <rect x="0" y="0" width="600" height="26" fill="url(#chart-paper)" />
      <rect x="0" y="1174" width="600" height="26" fill="url(#chart-paper)" />
      <rect x="0" y="0" width="26" height="1200" fill="url(#chart-paper)" />
      <rect x="574" y="0" width="26" height="1200" fill="url(#chart-paper)" />
      {bands}
      {/* corner squares */}
      {[[14, 14], [574, 14], [14, 1174], [574, 1174]].map(([x, y], i) => (
        <rect key={`c${i}`} x={x} y={y} width="12" height="12" fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.6" />
      ))}
      <rect x="10" y="10" width="580" height="1180" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="1.1" />
      <rect x="26" y="26" width="548" height="1148" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.7" />
    </g>
  );
}

// --- Chart ---------------------------------------------------------------

// A rowing shell seen from above, bow along +x, rotated to its heading.
function Shell({ x, y, heading, color }) {
  const ink = CHART_PALETTE.ink;
  return (
    <g transform={`translate(${x.toFixed(1)},${y.toFixed(1)}) rotate(${heading.toFixed(1)})`}>
      {/* two rowers, each with a pair of sculls: straight shafts sweeping
          slightly aft, flat spoon blades lying along the shaft */}
      {[-7, 3].map((rx) => [1, -1].map((side) => (
        <g key={`${rx}${side}`}>
          <line x1={rx} y1={side * 3} x2={rx - 2.5} y2={side * 15}
            stroke={ink} strokeWidth="1.1" strokeLinecap="round" />
          <ellipse cx={rx - 3.1} cy={side * 17.8} rx="3.4" ry="1.4"
            transform={`rotate(${side * 101.8} ${rx - 3.1} ${side * 17.8})`}
            fill={ink} />
        </g>
      )))}
      <path d="M -22,0 Q -12,-4.2 6,-3.6 Q 18,-2.2 25,0 Q 18,2.2 6,3.6 Q -12,4.2 -22,0 Z"
        fill={color} stroke={ink} strokeWidth="1.2" />
      <line x1="-14" y1="0" x2="16" y2="0" stroke={CHART_PALETTE.paper} strokeWidth="0.8" opacity="0.7" />
    </g>
  );
}

// V-shaped wake marks trailing behind a boat. `direction` is +1 when the boat
// moves toward Berkeley (Daniel) and -1 toward Sherwood (Tanner).
function Wake({ at, direction }) {
  const marks = [];
  for (let i = 1; i <= 5; i++) {
    const m = at - direction * i * 6500;
    if (m < 0 || m > TOTAL_METERS) break;
    const p = routePositionAt(m);
    const a = (p.heading + (direction < 0 ? 180 : 0)) * Math.PI / 180;
    const w = 3 + i * 1.6;
    const nx = -Math.sin(a), ny = Math.cos(a);
    const bx = -Math.cos(a) * 4, by = -Math.sin(a) * 4;
    marks.push(
      <path key={i}
        d={`M ${(p.x + nx * w + bx).toFixed(1)},${(p.y + ny * w + by).toFixed(1)} L ${p.x.toFixed(1)},${p.y.toFixed(1)} L ${(p.x - nx * w + bx).toFixed(1)},${(p.y - ny * w + by).toFixed(1)}`}
        fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.8" strokeLinecap="round"
        opacity={(0.75 - i * 0.12).toFixed(2)} />
    );
  }
  return <g pointerEvents="none">{marks}</g>;
}

// A paper name tag to the left of a boat, joined by a leader line.
// `dy` shifts the tag up or down (used when the two boats are close together).
function BoatTag({ x, y, name, detail, color, dy = 0 }) {
  const w = 96, h = 30;
  const bx = x - w - 18, by = y + dy - h / 2;
  return (
    <g pointerEvents="none">
      <line x1={x} y1={y} x2={bx + w} y2={y + dy} stroke={CHART_PALETTE.ink} strokeWidth="0.6" />
      <rect x={bx} y={by} width={w} height={h} fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.8" />
      <rect x={bx} y={by} width="4" height={h} fill={color} />
      <text x={bx + 10} y={by + 13} fontFamily="Spectral, serif" fontWeight="600" fontSize="11" fill={CHART_PALETTE.ink}>{name}</text>
      <text x={bx + 10} y={by + 24} fontFamily="JetBrains Mono, monospace" fontSize="7.5" letterSpacing=".04em" fill={CHART_PALETTE.inkSoft}>{detail}</text>
    </g>
  );
}

// `view` (optional) zooms the chart to a region: { x, y, w, h } in chart units.
// Extra props (ref, pointer handlers, style) pass through to the <svg>.
const Chart = React.forwardRef(function Chart({ data, view, style, ...svgProps }, ref) {
  const [hovered, setHovered] = React.useState(null);
  const [tick, setTick] = React.useState(null);
  const youBoat = routePositionAt(data.yourPosition);
  const tannerBoat = routePositionAt(data.tannerPosition);
  const P = CHART_PALETTE;

  const youMarks = React.useMemo(
    () => sessionMarks(data.sessions, "you", 0, 1),
    [data.sessions]
  );
  const tannerMarks = React.useMemo(
    () => sessionMarks(data.sessions, "tanner", TOTAL_METERS, -1),
    [data.sessions]
  );

  const meetPoint = routePositionAt(data.meeting.at);
  const gapBounds = routeBounds(data.yourPosition, data.tannerPosition);
  // Bracket for the gap sits east of the route and its city labels.
  const bracketX = Math.min(470, gapBounds.x1 + 95);
  const gapMidY = (gapBounds.y0 + gapBounds.y1) / 2;

  // Keep the two name tags from stacking on top of each other: when the boats
  // are close, Tanner's tag moves just below Daniel's.
  const tagClash = Math.abs(tannerBoat.y - youBoat.y) < 34;

  // Skip the meeting label when a boat's name tag would sit on top of it.
  const meetLabelClear = data.met ||
    (Math.abs(meetPoint.y - youBoat.y) > 36 && Math.abs(meetPoint.y - tannerBoat.y) > 36);

  const toggle = (name) => setHovered((h) => (h === name ? null : name));

  return (
    <svg
      ref={ref}
      viewBox={view ? `${view.x} ${view.y} ${view.w} ${view.h}` : "0 0 600 1200"}
      preserveAspectRatio={view ? "xMidYMid slice" : "xMidYMid meet"}
      style={style || {
        height: "100%", width: "auto", maxWidth: "100%",
        display: "block",
        boxShadow: "0 6px 18px rgba(20,15,5,0.25), 0 1px 0 rgba(255,255,255,0.4) inset",
      }}
      onClick={() => { setTick(null); setHovered(null); }}
      {...svgProps}
    >
      <defs>
        <pattern id="chart-paper" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={CHART_PALETTE.paper} />
          <circle cx="1" cy="1" r="0.35" fill={CHART_PALETTE.paperDeep} opacity="0.6" />
          <circle cx="4" cy="3.5" r="0.2" fill={CHART_PALETTE.paperEdge} opacity="0.4" />
        </pattern>
        <pattern id="chart-ocean" width="14" height="14" patternUnits="userSpaceOnUse">
          <rect width="14" height="14" fill={CHART_PALETTE.ocean} />
          <path d="M0 7 Q3.5 5 7 7 T14 7" fill="none" stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.5" opacity="0.55" />
          <path d="M0 11 Q3.5 9 7 11 T14 11" fill="none" stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.4" opacity="0.35" />
        </pattern>
        <pattern id="chart-land" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={CHART_PALETTE.paper} />
          <circle cx="1" cy="1" r="0.3" fill={CHART_PALETTE.landMid} opacity="0.7" />
          <circle cx="4" cy="3.5" r="0.18" fill={CHART_PALETTE.landEdge} opacity="0.5" />
        </pattern>
        <radialGradient id="chart-vig" cx="50%" cy="48%" r="72%">
          <stop offset="62%" stopColor="rgba(90,60,20,0)" />
          <stop offset="100%" stopColor="rgba(90,60,20,0.16)" />
        </radialGradient>
        <filter id="chart-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.04 0" />
        </filter>
        <clipPath id="map-clip">
          <rect x="26" y="26" width="548" height="1148" />
        </clipPath>
      </defs>

      {/* paper base */}
      <rect width="600" height="1200" fill="url(#chart-paper)" />

      {/* ---- map content, clipped to the inner frame ---- */}
      <g clipPath="url(#map-clip)">
        <rect width="600" height="1200" fill="url(#chart-ocean)" />

        {/* bathymetry */}
        <g fill="none" stroke={CHART_PALETTE.paper} strokeWidth="0.8" strokeDasharray="1 3" opacity="0.22">
          {BATHY.map((d, i) => <path key={i} d={d} />)}
        </g>

        {/* land */}
        <path d={LAND_PATH} fill="url(#chart-land)" stroke={CHART_PALETTE.landEdge} strokeWidth="1.2" />

        {/* SF Bay */}
        <path d={SF_BAY_PATH} fill="url(#chart-ocean)" stroke={CHART_PALETTE.landEdge} strokeWidth="0.9" />

        {/* mountain hatching */}
        <g fill="none" stroke={CHART_PALETTE.hills} strokeWidth="0.7" opacity="0.5" strokeLinecap="round">
          {RANGES.map((d, i) => <path key={i} d={d} />)}
        </g>

        {/* rivers */}
        <g fill="none" stroke={CHART_PALETTE.river} strokeWidth="1.1" opacity="0.7" strokeLinecap="round">
          {RIVERS.map((d, i) => <path key={i} d={d} />)}
        </g>

        {/* lakes */}
        {LAKES.map((l) => (
          <g key={l.name}>
            {l.r ? (
              <circle cx={l.cx} cy={l.cy} r={l.r} fill={CHART_PALETTE.ocean} stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.6" />
            ) : (
              <ellipse cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={CHART_PALETTE.ocean} stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.6" />
            )}
            <text x={l.cx + (l.r || l.rx) + 3} y={l.cy + 2.5} fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={CHART_PALETTE.inkSoft}>{l.name}</text>
          </g>
        ))}

        {/* peaks */}
        {PEAKS.map((p, idx) => (
          <g key={idx}>
            <path d={`M ${p.x},${p.y - p.h} L ${p.x + p.h * 0.85},${p.y} L ${p.x - p.h * 0.85},${p.y} Z`} fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.7" />
            <path d={`M ${p.x},${p.y - p.h} L ${p.x - p.h * 0.3},${p.y - p.h * 0.35} L ${p.x + p.h * 0.2},${p.y - p.h * 0.55} Z`} fill={CHART_PALETTE.snow} />
            {p.name && <text x={p.x + p.h + 3} y={p.y - 1} fontFamily="Spectral, serif" fontStyle="italic" fontSize="9" fill={CHART_PALETTE.ink}>{p.name}</text>}
          </g>
        ))}

        {/* state line — 42°N */}
        <line x1="122" y1="600" x2="574" y2="600" stroke={CHART_PALETTE.ink} strokeWidth="0.6" strokeDasharray="9 3 2 3" opacity="0.5" />
        <text x="448" y="592" fontFamily="Spectral, serif" fontSize="9" letterSpacing=".45em" fill={CHART_PALETTE.inkSoft} opacity="0.8">OREGON</text>
        <text x="430" y="614" fontFamily="Spectral, serif" fontSize="9" letterSpacing=".45em" fill={CHART_PALETTE.inkSoft} opacity="0.8">CALIFORNIA</text>

        {/* range labels */}
        <g fontFamily="Spectral, serif" fontStyle="italic" fill={CHART_PALETTE.inkSoft}>
          <text x="398" y="240" fontSize="12" letterSpacing=".3em" opacity="0.65" transform="rotate(84 398 240)">CASCADE RANGE</text>
          <text x="455" y="1010" fontSize="12" letterSpacing=".28em" opacity="0.65" transform="rotate(62 455 1010)">SIERRA NEVADA</text>
          <text x="390" y="930" fontSize="9" letterSpacing=".22em" opacity="0.6" transform="rotate(78 390 930)">CENTRAL VALLEY</text>
          <text x="200" y="612" fontSize="8.5" letterSpacing=".2em" opacity="0.6" transform="rotate(-12 200 612)">KLAMATH MTS.</text>
          <text x="178" y="345" fontSize="8.5" letterSpacing=".2em" opacity="0.55" transform="rotate(86 178 345)">COAST RANGE</text>
        </g>

        {/* graticule */}
        <g opacity="0.3">
          {LAT_LINES.map(l => (
            <g key={l.y}>
              <line x1="26" y1={l.y} x2="574" y2={l.y} stroke={CHART_PALETTE.ink} strokeWidth="0.3" strokeDasharray="2 5" />
              <text x="32" y={l.y - 4} fontFamily="JetBrains Mono, monospace" fontSize="7" fill={CHART_PALETTE.ink}>{l.label}N</text>
            </g>
          ))}
          {LON_LINES.map(l => (
            <g key={l.x}>
              <line x1={l.x} y1="26" x2={l.x} y2="1174" stroke={CHART_PALETTE.ink} strokeWidth="0.25" strokeDasharray="2 5" />
              <text x={l.x + 3} y="38" fontFamily="JetBrains Mono, monospace" fontSize="7" fill={CHART_PALETTE.ink}>{l.label}W</text>
            </g>
          ))}
        </g>

        {/* soundings */}
        <g fill={CHART_PALETTE.paper} opacity="0.55" fontFamily="JetBrains Mono, monospace" fontSize="7">
          {SOUNDINGS.map(([x, y, n], i) => <text key={i} x={x} y={y}>{n}</text>)}
        </g>

        {/* ocean label, set along the coast */}
        <text x="74" y="430" fontFamily="Spectral, serif" fontStyle="italic" fontSize="15" fill={CHART_PALETTE.paper} opacity="0.8" letterSpacing=".5em" transform="rotate(85 74 430)">
          PACIFIC OCEAN
        </text>

        {/* capes + coastal labels */}
        <g fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={CHART_PALETTE.paper}>
          <text x="94" y="498" textAnchor="end">C. Blanco</text>
          <text x="104" y="792" textAnchor="end">C. Mendocino</text>
          <text x="166" y="972" textAnchor="end">Pt. Arena</text>
          <text x="226" y="1092" textAnchor="end">Pt. Reyes</text>
          <text x="140" y="82" textAnchor="end">Columbia R.</text>
        </g>
        <g>
          <text x="234" y="1128" textAnchor="end" fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={CHART_PALETTE.paper}>Golden Gate</text>
          <line x1="236" y1="1124" x2="276" y2="1106" stroke={CHART_PALETTE.paper} strokeWidth="0.5" opacity="0.7" />
        </g>

        {/* compass rose */}
        <g transform="translate(95,940)">
          <circle r="46" fill={CHART_PALETTE.ocean} opacity="0.5" />
          <circle r="44" fill="none" stroke={CHART_PALETTE.paper} strokeWidth="0.6" opacity="0.9" />
          <circle r="34" fill="none" stroke={CHART_PALETTE.paper} strokeWidth="0.35" opacity="0.6" />
          {Array.from({ length: 32 }, (_, i) => {
            const a = (i * 360 / 32) * Math.PI / 180;
            const r1 = 38, r2 = i % 4 === 0 ? 30 : 34;
            return (
              <line key={i}
                x1={Math.sin(a) * r2} y1={-Math.cos(a) * r2}
                x2={Math.sin(a) * r1} y2={-Math.cos(a) * r1}
                stroke={CHART_PALETTE.paper} strokeWidth={i % 4 === 0 ? "0.8" : "0.35"} opacity="0.9" />
            );
          })}
          <path d="M0,-38 L4.5,0 L0,38 L-4.5,0 Z" fill={CHART_PALETTE.paper} opacity="0.95" />
          <path d="M-38,0 L0,4.5 L38,0 L0,-4.5 Z" fill={CHART_PALETTE.paper} opacity="0.5" />
          <circle r="2" fill={CHART_PALETTE.brassLight} />
          <text x="0" y="-50" textAnchor="middle" fontFamily="Spectral, serif" fontSize="11" fontStyle="italic" fill={CHART_PALETTE.paper}>N</text>
        </g>

        {/* planned course — the full route, quiet */}
        <path
          d={routePath(0, TOTAL_METERS)}
          fill="none" stroke={P.ink} strokeWidth="0.9" strokeDasharray="3 3"
          strokeLinejoin="round" opacity="0.45"
        />

        {/* still to row — highlighted dashed stretch between the boats */}
        {!data.met && (
          <g pointerEvents="none">
            <path d={routePath(data.yourPosition, data.tannerPosition)} fill="none"
              stroke={P.brassLight} strokeWidth="7" opacity="0.28"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d={routePath(data.yourPosition, data.tannerPosition)} fill="none"
              stroke={P.ink} strokeWidth="1.4" strokeDasharray="1.5 3.5"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}

        {/* tracks — each rower's colour with an ink casing */}
        {[
          { key: "you", from: 0, to: data.yourPosition, color: P.redInk },
          { key: "tanner", from: data.tannerPosition, to: TOTAL_METERS, color: P.brass },
        ].filter((t) => t.to > t.from).map((t) => (
          <g key={t.key} pointerEvents="none">
            <path d={routePath(t.from, t.to)} fill="none" stroke={P.ink} strokeWidth="5.6"
              strokeLinecap="round" strokeLinejoin="round" />
            <path d={routePath(t.from, t.to)} fill="none" stroke={t.color} strokeWidth="3.4"
              strokeLinecap="round" strokeLinejoin="round" />
          </g>
        ))}

        {/* session ticks — one across the track per logged row */}
        {[...youMarks, ...tannerMarks].map((mk) => {
          const p = routePositionAt(mk.at);
          const a = p.heading * Math.PI / 180;
          const nx = -Math.sin(a) * 4.2, ny = Math.cos(a) * 4.2;
          const show = (e) => { e.stopPropagation(); setTick(mk); };
          return (
            <g key={mk.id} onClick={show} onMouseEnter={show} onMouseLeave={() => setTick(null)} style={{ cursor: "pointer" }}>
              <line x1={p.x + nx * 1.6} y1={p.y + ny * 1.6} x2={p.x - nx * 1.6} y2={p.y - ny * 1.6}
                stroke="transparent" strokeWidth="5" />
              <line x1={p.x + nx} y1={p.y + ny} x2={p.x - nx} y2={p.y - ny}
                stroke={P.ink} strokeWidth="0.9" strokeLinecap="round" />
            </g>
          );
        })}

        {/* context cities */}
        <g fontFamily="Spectral, serif" fill={CHART_PALETTE.inkSoft}>
          {CONTEXT_CITIES.map((c) => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r={c.small ? 1.4 : 2} fill={CHART_PALETTE.inkSoft} />
              <text
                x={c.left ? c.x - 4 : c.x + (c.small ? 4 : 5)}
                y={c.y + 3}
                textAnchor={c.left ? "end" : "start"}
                fontSize={c.small ? 8.5 : 10}
                fontStyle="italic" opacity="0.75"
              >{c.name}</text>
            </g>
          ))}
        </g>

        {/* milestones */}
        {MILESTONES.map((m) => {
          const p = CITY_XY[m.name];
          const reachedByYou = data.yourPosition >= m.at;
          const reachedByTanner = data.tannerPosition <= m.at;
          const reached = reachedByYou || reachedByTanner;
          const reachedColor = reachedByYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass;
          const isEnd = m.kind === "start" || m.kind === "end";
          const labelRight = !LABEL_LEFT.has(m.name);
          const isHovered = hovered === m.name;
          return (
            <g
              key={m.name}
              transform={`translate(${p.x},${p.y})`}
              onMouseEnter={() => setHovered(m.name)}
              onMouseLeave={() => setHovered(null)}
              onClick={(e) => { e.stopPropagation(); toggle(m.name); }}
              style={{ cursor: "pointer" }}
            >
              <circle r="14" fill="transparent" />
              {isEnd ? (
                <>
                  <circle r="8" fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="1.4" />
                  <path d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z" fill={CHART_PALETTE.ink} />
                </>
              ) : (
                <>
                  <circle r={isHovered ? 5 : 3.6} fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="1.1" />
                  <circle r={isHovered ? 2.4 : 1.8} fill={reached ? reachedColor : CHART_PALETTE.ink} opacity={reached ? 1 : 0.7} />
                </>
              )}
              <text
                x={labelRight ? 11 : -11}
                y={isEnd ? -12 : 3.5}
                textAnchor={labelRight ? "start" : "end"}
                fontFamily="Spectral, serif"
                fontSize={isEnd ? 14 : 11}
                fontStyle={isEnd ? "normal" : "italic"}
                fontWeight={isEnd ? 600 : 500}
                fill={CHART_PALETTE.ink}
              >
                {m.name}
                {!isEnd && <tspan fontSize="9" opacity="0.6">, {m.region}</tspan>}
              </text>
              {isEnd && (
                <text x={labelRight ? 11 : -11} y={0} textAnchor={labelRight ? "start" : "end"} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.inkSoft}>
                  {m.kind === "start" ? "DEPART" : "ARRIVE"}
                </text>
              )}
              {isHovered && (
                <g transform={`translate(${labelRight ? 11 : -11}, ${isEnd ? 16 : 18})`}>
                  <rect x={labelRight ? 0 : -160} y="-2" width="160" height="32" fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.5" />
                  <text x={labelRight ? 6 : -154} y="10" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.ink} letterSpacing=".06em">
                    {Math.round(m.at / 1000)} km from Sherwood
                  </text>
                  <text x={labelRight ? 6 : -154} y="22" fontFamily="Spectral, serif" fontStyle="italic" fontSize="10" fill={reached ? reachedColor : CHART_PALETTE.inkSoft}>
                    {reachedByYou
                      ? `Daniel · ${Math.round((data.yourPosition - m.at) / 1000)} km past`
                      : reachedByTanner
                        ? `Tanner · ${Math.round((m.at - data.tannerPosition) / 1000)} km past`
                        : `${((m.at - data.yourPosition) / 1000).toFixed(0)} km · Daniel, ${((data.tannerPosition - m.at) / 1000).toFixed(0)} km · Tanner`}
                  </text>
                </g>
              )}
            </g>
          );
        })}

        {/* projected meeting point */}
        <g pointerEvents="none">
          <g transform={`translate(${meetPoint.x.toFixed(1)},${meetPoint.y.toFixed(1)})`}>
            <circle r="9" fill={P.paper} stroke={P.ink} strokeWidth="1.1" strokeDasharray={data.met ? "none" : "2 2"} />
            <path d="M0,-5.5 L0,5 M-4,2 Q0,6.5 4,2 M-2.5,-3 L2.5,-3" fill="none" stroke={P.ink} strokeWidth="1.2" strokeLinecap="round" />
            <circle cx="0" cy="-6.5" r="1.4" fill="none" stroke={P.ink} strokeWidth="1" />
          </g>
          {meetLabelClear && <>
          <text x={meetPoint.x - 14} y={meetPoint.y - 2} textAnchor="end" fontFamily="Spectral, serif"
            fontSize="10" fontWeight="600" fontStyle="italic" fill={P.ink}>
            {data.met ? "Met here" : "Projected meeting"}
          </text>
          <text x={meetPoint.x - 14} y={meetPoint.y + 9} textAnchor="end" fontFamily="JetBrains Mono, monospace"
            fontSize="7.5" fill={P.inkSoft}>
            {`NEAR ${data.meeting.near.name.toUpperCase()}`}
            {!data.met && data.eta ? ` · ${fmtMonthYear(data.eta.arrival).toUpperCase()}` : ""}
          </text>
          </>}
        </g>

        {/* gap bracket + distance still to row */}
        {!data.met && (
          <g pointerEvents="none">
            {gapBounds.y1 - gapBounds.y0 > 24 && (
              <path d={`M ${bracketX - 6},${gapBounds.y0} L ${bracketX},${gapBounds.y0} L ${bracketX},${gapBounds.y1} L ${bracketX - 6},${gapBounds.y1}`}
                fill="none" stroke={P.ink} strokeWidth="0.9" />
            )}
            <rect x={bracketX + 6} y={gapMidY - 14} width="84" height="28" fill={P.paper} stroke={P.ink} strokeWidth="0.8" />
            <text x={bracketX + 48} y={gapMidY - 1} textAnchor="middle" fontFamily="Spectral, serif"
              fontSize="13" fontWeight="600" fill={P.ink}>{(data.gap / 1000).toFixed(1)} km</text>
            <text x={bracketX + 48} y={gapMidY + 9} textAnchor="middle" fontFamily="JetBrains Mono, monospace"
              fontSize="6.5" letterSpacing=".12em" fill={P.inkSoft}>STILL TO ROW</text>
          </g>
        )}

        {/* boats — shells pointed along the route, with wakes and name tags */}
        <Wake at={data.yourPosition} direction={1} />
        <Wake at={data.tannerPosition} direction={-1} />
        <Shell x={youBoat.x} y={youBoat.y} heading={youBoat.heading} color={P.redInk} />
        <Shell x={tannerBoat.x} y={tannerBoat.y} heading={tannerBoat.heading + 180} color={P.brass} />
        <BoatTag x={youBoat.x} y={youBoat.y} name="Daniel"
          detail={`${(data.totals.you / 1000).toFixed(1)} KM · S↓`} color={P.redInk} />
        <BoatTag x={tannerBoat.x} y={tannerBoat.y} name="Tanner"
          detail={`${(data.totals.tanner / 1000).toFixed(1)} KM · N↑`} color={P.brass}
          dy={tagClash ? (youBoat.y + 36 - tannerBoat.y) : 0} />

        {/* session detail — shown when a tick is tapped or hovered */}
        {tick && (() => {
          const p = routePositionAt(tick.at);
          const d = new Date(tick.date + "T12:00:00");
          const label = d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
          return (
            <g transform={`translate(${(p.x + 14).toFixed(1)},${(p.y - 12).toFixed(1)})`} pointerEvents="none">
              <rect x="0" y="-11" width="112" height="24" fill={P.paper} stroke={P.ink} strokeWidth="0.6" />
              <text x="6" y="-1" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill={P.inkSoft} letterSpacing=".04em">{label.toUpperCase()}</text>
              <text x="6" y="9" fontFamily="Spectral, serif" fontStyle="italic" fontSize="9.5" fill={P.ink}>
                {tick.meters.toLocaleString()} m rowed
              </text>
            </g>
          );
        })()}

        {/* key */}
        <g transform="translate(36,1010)" pointerEvents="none">
          <rect width="150" height="104" fill={P.paper} stroke={P.ink} strokeWidth="0.8" />
          <text x="10" y="16" fontFamily="JetBrains Mono, monospace" fontSize="7" letterSpacing=".2em" fill={P.inkSoft}>KEY</text>
          <g fontFamily="Spectral, serif" fontStyle="italic" fontSize="9.5" fill={P.ink}>
            <line x1="10" y1="30" x2="38" y2="30" stroke={P.ink} strokeWidth="5.6" strokeLinecap="round" />
            <line x1="10" y1="30" x2="38" y2="30" stroke={P.redInk} strokeWidth="3.4" strokeLinecap="round" />
            <text x="46" y="33">Daniel’s track</text>
            <line x1="10" y1="46" x2="38" y2="46" stroke={P.ink} strokeWidth="5.6" strokeLinecap="round" />
            <line x1="10" y1="46" x2="38" y2="46" stroke={P.brass} strokeWidth="3.4" strokeLinecap="round" />
            <text x="46" y="49">Tanner’s track</text>
            <line x1="10" y1="62" x2="38" y2="62" stroke={P.ink} strokeWidth="0.8" opacity="0.5" />
            <line x1="24" y1="57" x2="24" y2="67" stroke={P.ink} strokeWidth="0.9" />
            <text x="46" y="65">One logged session</text>
            <line x1="10" y1="78" x2="38" y2="78" stroke={P.brassLight} strokeWidth="7" opacity="0.35" strokeLinecap="round" />
            <line x1="10" y1="78" x2="38" y2="78" stroke={P.ink} strokeWidth="1.4" strokeDasharray="1.5 3.5" strokeLinecap="round" />
            <text x="46" y="81">Still to row</text>
            <circle cx="24" cy="93" r="5" fill={P.paper} stroke={P.ink} strokeWidth="0.9" strokeDasharray="2 2" />
            <text x="46" y="96">Projected meeting</text>
          </g>
        </g>

        {/* cartouche */}
        <g transform="translate(492,1124)">
          <rect x="-80" y="-48" width="160" height="96" fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.8" />
          <rect x="-74" y="-42" width="148" height="84" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.3" />
          <text x="0" y="-24" textAnchor="middle" fontFamily="Spectral, serif" fontSize="9" fontStyle="italic" fill={CHART_PALETTE.ink}>A Chart for the</text>
          <text x="0" y="-7" textAnchor="middle" fontFamily="Spectral, serif" fontSize="13" fontWeight="600" letterSpacing=".08em" fill={CHART_PALETTE.ink}>BOYS IN THE BOAT</text>
          {/* crossed oars */}
          <g stroke={CHART_PALETTE.ink} strokeWidth="0.9">
            <line x1="-16" y1="12" x2="16" y2="0" />
            <line x1="-16" y1="0" x2="16" y2="12" />
            <ellipse cx="-18" cy="12.7" rx="3.4" ry="1.7" fill={CHART_PALETTE.ink} transform="rotate(-20 -18 12.7)" />
            <ellipse cx="18" cy="12.7" rx="3.4" ry="1.7" fill={CHART_PALETTE.ink} transform="rotate(20 18 12.7)" />
          </g>
          <text x="0" y="28" textAnchor="middle" fontFamily="Spectral, serif" fontSize="8.5" fontStyle="italic" fill={CHART_PALETTE.inkSoft}>Sherwood to Berkeley</text>
          <text x="0" y="40" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="7.5" fill={CHART_PALETTE.ink} letterSpacing=".18em">1,000 KM · BEGUN MMXXV</text>
        </g>

        {/* scale bar — 200 km at the chart's real scale */}
        <g transform="translate(50,1148)">
          <line x1="0" y1="0" x2={200 * UNITS_PER_KM} y2="0" stroke={P.paper} strokeWidth="1.2" />
          {[0, 50, 100, 150, 200].map((km) => (
            <line key={km} x1={km * UNITS_PER_KM} y1={km % 100 === 0 ? -4 : -3} x2={km * UNITS_PER_KM} y2={km % 100 === 0 ? 4 : 3}
              stroke={P.paper} strokeWidth={km % 100 === 0 ? 1.2 : 0.8} />
          ))}
          {[[0, "0"], [100, "100"], [200, "200 km"]].map(([km, label]) => (
            <text key={km} x={km * UNITS_PER_KM} y="15" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={P.paper}>{label}</text>
          ))}
        </g>

        {/* vignette */}
        <rect width="600" height="1200" fill="url(#chart-vig)" pointerEvents="none" />
      </g>

      {/* frame on top */}
      <ChartFrame />

      {/* grain over everything */}
      <rect width="600" height="1200" filter="url(#chart-grain)" opacity="0.5" pointerEvents="none" />
    </svg>
  );
});

Object.assign(window, { Chart, CHART_PALETTE, routePositionAt, routeBounds });
