// app-chart.jsx — Nautical chart with realistic Pacific NW → SF Bay geography.
// Coordinate system: viewBox 600x1200, ~120 units per degree latitude,
// ~86 units per degree longitude. Top edge ~47°N, bottom ~37°N.

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

// --- Geography ---------------------------------------------------------------

// Coastline: from top of viewBox down to where land meets bottom (Pacifica).
// Bumps for Cape Blanco, Cape Mendocino, Point Reyes are exaggerated to read.
const COAST_PATH = `
  M 180,0
  L 185,40 L 188,72
  Q 180,80 172,90 L 195,98
  L 198,128 L 208,162 L 213,200 L 218,238
  L 218,275 L 213,300 L 220,335 L 213,372
  L 205,410 L 207,440 L 217,465 L 200,490
  L 175,505 L 188,525 L 200,560 L 215,592
  L 207,622 L 198,652 L 193,688 L 195,720
  L 212,750 L 200,772 L 162,792 L 185,822
  L 207,852 L 222,882 L 233,915 L 242,948
  L 246,978 L 240,1008 L 233,1032 L 230,1055
  L 215,1078 L 252,1094 L 268,1118 L 282,1142
  L 288,1158 L 294,1178 L 302,1200
`;

// Full land polygon — coastline + right edge + top.
const LAND_PATH = COAST_PATH + ` L 600,1200 L 600,0 Z`;

// San Francisco Bay system — an interior pocket cut into the land.
// Enters at Golden Gate (~290,1158), spreads east into San Pablo / Suisun,
// south through East Bay. Berkeley sits on the east shore.
const SF_BAY_PATH = `
  M 290,1158
  L 308,1156 L 318,1148 L 326,1132 L 332,1110
  L 336,1085 L 332,1062 L 326,1052
  L 348,1048 L 372,1052 L 392,1056 L 398,1068
  L 384,1080 L 372,1088 L 364,1102 L 360,1124
  L 358,1148 L 355,1172 L 352,1200
  L 322,1200 L 314,1180 L 308,1166
  Z
`;

// Major rivers (faint blue brush strokes).
const RIVERS = [
  // Columbia — enters from top, flows east-ish along the OR/WA border.
  "M 172,90 Q 240,98 320,84 T 480,68 L 540,52",
  // Willamette — Eugene area north through Salem to join Columbia.
  "M 250,354 Q 258,310 268,260 T 280,170 L 286,130 L 300,98 L 320,84",
  // Sacramento — from Klamath/Shasta region south through Central Valley to bay.
  "M 340,690 Q 360,740 376,790 T 392,890 L 396,950 L 392,1010 L 380,1042 L 360,1058 L 340,1064",
  // American River branch joining at Sacramento.
  "M 460,990 Q 430,1000 396,1010",
  // Russian River → coast.
  "M 290,990 Q 270,1010 245,1025 L 232,1035",
  // Klamath River → coast.
  "M 320,640 Q 290,660 260,668 L 230,680 L 200,684 L 193,688",
];

// Mountain peak triangles: x, y, height, label
const PEAKS = [
  { x: 372, y: 196, h: 14, name: "Mt. Hood" },
  { x: 366, y: 232, h: 11, name: "Mt. Jefferson" },
  { x: 358, y: 290, h: 11, name: "Three Sisters" },
  { x: 348, y: 524, h: 11, name: "Mt. McLoughlin" },
  { x: 340, y: 668, h: 17, name: "Mt. Shasta" },
  { x: 380, y: 768, h: 13, name: "Lassen Peak" },
  { x: 290, y: 1110, h: 9, name: "Mt. Tam" },
];

// Lakes
const LAKES = [
  { cx: 342, cy: 488, r: 5.5, name: "Crater Lake" },
  { cx: 532, cy: 944, rx: 8, ry: 12, name: "Lake Tahoe" },
  { cx: 360, cy: 712, rx: 10, ry: 4, name: "Shasta Lake" },
];

// Mountain hatching — patches of short curves to indicate ranges.
// Each range is an array of [x, y, w] tuples for hatch strokes.
function generateHatches(cx, cy, w, h, count, rng) {
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = cx + (rng() - 0.5) * w;
    const y = cy + (rng() - 0.5) * h;
    const sw = 5 + rng() * 8;
    out.push(`M ${x.toFixed(1)},${y.toFixed(1)} q ${(sw/2).toFixed(1)},-${(sw/4).toFixed(1)} ${sw.toFixed(1)},${(rng()*2-1).toFixed(1)}`);
  }
  return out;
}
function seededRng(seed) {
  let s = seed;
  return () => {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}
const RANGES = [
  // Coast Range OR
  ...generateHatches(280, 250, 60, 380, 50, seededRng(11)),
  // Cascades OR
  ...generateHatches(410, 350, 70, 500, 80, seededRng(22)),
  // Klamath / Siskiyou
  ...generateHatches(310, 600, 80, 100, 30, seededRng(33)),
  // Northern California Coast Range
  ...generateHatches(275, 880, 60, 280, 50, seededRng(44)),
  // Sierra Nevada
  ...generateHatches(530, 950, 80, 380, 90, seededRng(55)),
  // Cascades CA (Shasta/Lassen region)
  ...generateHatches(400, 720, 60, 160, 25, seededRng(66)),
];

// Cities — every milestone gets a chart position (x,y).
// Plus a few decorative non-milestone references for context.
const CITY_XY = {
  "Sherwood":   { x: 286, y: 144 },
  "Salem":      { x: 268, y: 200 },
  "Eugene":     { x: 256, y: 308 },
  "Roseburg":   { x: 238, y: 408 },
  "Medford":    { x: 272, y: 512 },
  "Mt. Shasta": { x: 332, y: 642 },
  "Redding":    { x: 322, y: 728 },
  "Chico":      { x: 364, y: 832 },
  "Sacramento": { x: 392, y: 970 },
  "Vallejo":    { x: 340, y: 1030 },
  "Berkeley":   { x: 380, y: 1102 },
};

// A few non-milestone decorative cities for richness.
const CONTEXT_CITIES = [
  { x: 308, y: 102, name: "Portland" },
  { x: 280, y: 86, name: "Astoria", small: true },
  { x: 196, y: 753, name: "Eureka", small: true },
  { x: 350, y: 1148, name: "San Francisco" },
  { x: 384, y: 1170, name: "Oakland", small: true },
  { x: 450, y: 990, name: "Folsom", small: true },
  { x: 510, y: 900, name: "Reno", small: true },
];

// Depth soundings scattered in the ocean.
const SOUNDINGS = [
  [70, 80, "412"], [120, 180, "508"], [55, 260, "623"],
  [105, 350, "541"], [70, 460, "688"], [130, 540, "612"],
  [60, 620, "725"], [110, 720, "611"], [55, 820, "693"],
  [120, 900, "548"], [70, 990, "612"], [115, 1080, "584"],
  [155, 130, "421"], [170, 320, "522"], [175, 540, "606"],
  [155, 760, "612"], [170, 980, "548"], [110, 1140, "215"],
];

// Lat/long grid
const LAT_LINES = [
  { y: 120, label: "46° N" }, { y: 240, label: "45° N" },
  { y: 360, label: "44° N" }, { y: 480, label: "43° N" },
  { y: 600, label: "42° N" }, { y: 720, label: "41° N" },
  { y: 840, label: "40° N" }, { y: 960, label: "39° N" },
  { y: 1080, label: "38° N" },
];
const LON_LINES = [
  { x: 172, label: "124° W" },
  { x: 344, label: "122° W" },
  { x: 516, label: "120° W" },
];

// Boat position — lerp along route segments by real-distance fraction.
// metersFromStart=0 → Sherwood, metersFromStart=TOTAL → Berkeley.
function boatPositionAt(metersFromStart) {
  const m = Math.max(0, Math.min(metersFromStart, TOTAL_METERS));
  for (let i = 0; i < MILESTONES.length - 1; i++) {
    const m1 = MILESTONES[i], m2 = MILESTONES[i + 1];
    if (m <= m2.at) {
      const frac = m1.at === m2.at ? 0 : (m - m1.at) / (m2.at - m1.at);
      const a = CITY_XY[m1.name], b = CITY_XY[m2.name];
      return {
        x: a.x + (b.x - a.x) * frac,
        y: a.y + (b.y - a.y) * frac,
        segment: i,
        frac,
      };
    }
  }
  const last = CITY_XY[MILESTONES[MILESTONES.length - 1].name];
  return { x: last.x, y: last.y, segment: MILESTONES.length - 2, frac: 1 };
}

// --- Chart component --------------------------------------------------------

function Chart({ data }) {
  const [hovered, setHovered] = React.useState(null);
  const youBoat = boatPositionAt(data.yourPosition);
  const tannerBoat = boatPositionAt(data.tannerPosition);

  // Wake — sampled positions behind each boat.
  const youWake = React.useMemo(() => {
    const pts = [];
    for (let i = 1; i < 9; i++) {
      pts.push(boatPositionAt(data.yourPosition - i * 9000));
    }
    return pts;
  }, [data.yourPosition]);
  const tannerWake = React.useMemo(() => {
    const pts = [];
    for (let i = 1; i < 9; i++) {
      pts.push(boatPositionAt(data.tannerPosition + i * 9000));
    }
    return pts;
  }, [data.tannerPosition]);

  return (
    <svg
      viewBox="0 0 600 1200"
      preserveAspectRatio="xMidYMid meet"
      style={{
        height: "100%", width: "auto", maxWidth: "100%",
        display: "block",
        boxShadow: "0 6px 18px rgba(20,15,5,0.25), 0 1px 0 rgba(255,255,255,0.4) inset",
      }}
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
        <filter id="chart-grain">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" />
          <feColorMatrix values="0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.06  0 0 0 0.04 0" />
        </filter>
      </defs>

      {/* Ocean fills the whole canvas — land paints over it */}
      <rect width="600" height="1200" fill="url(#chart-ocean)" />

      {/* Land mass */}
      <path d={LAND_PATH} fill="url(#chart-land)" stroke={CHART_PALETTE.landEdge} strokeWidth="1.2" />

      {/* SF Bay — ocean cuts back into the land */}
      <path d={SF_BAY_PATH} fill="url(#chart-ocean)" stroke={CHART_PALETTE.landEdge} strokeWidth="1" />

      {/* Mountain hatching */}
      <g fill="none" stroke={CHART_PALETTE.hills} strokeWidth="0.7" opacity="0.55" strokeLinecap="round">
        {RANGES.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* Rivers */}
      <g fill="none" stroke={CHART_PALETTE.river} strokeWidth="1.2" opacity="0.7" strokeLinecap="round">
        {RIVERS.map((d, i) => <path key={i} d={d} />)}
      </g>

      {/* Lakes */}
      {LAKES.map((l) => (
        <g key={l.name}>
          {l.r ? (
            <circle cx={l.cx} cy={l.cy} r={l.r} fill={CHART_PALETTE.ocean} stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.6" />
          ) : (
            <ellipse cx={l.cx} cy={l.cy} rx={l.rx} ry={l.ry} fill={CHART_PALETTE.ocean} stroke={CHART_PALETTE.oceanDeep} strokeWidth="0.6" />
          )}
          <text
            x={l.cx + (l.r || l.rx) + 4} y={l.cy + 2}
            fontFamily="Spectral, serif" fontStyle="italic" fontSize="8"
            fill={CHART_PALETTE.inkSoft}
          >{l.name}</text>
        </g>
      ))}

      {/* Peaks */}
      {PEAKS.map((p) => (
        <g key={p.name}>
          <path
            d={`M ${p.x},${p.y - p.h} L ${p.x + p.h * 0.85},${p.y} L ${p.x - p.h * 0.85},${p.y} Z`}
            fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.7"
          />
          <path
            d={`M ${p.x},${p.y - p.h} L ${p.x - p.h * 0.3},${p.y - p.h * 0.35} L ${p.x + p.h * 0.2},${p.y - p.h * 0.55} Z`}
            fill={CHART_PALETTE.snow}
          />
          <text x={p.x + p.h + 3} y={p.y - 1} fontFamily="Spectral, serif" fontStyle="italic" fontSize="9" fill={CHART_PALETTE.ink}>
            {p.name}
          </text>
        </g>
      ))}

      {/* Range labels (italic, sparse) */}
      <g fontFamily="Spectral, serif" fontStyle="italic" fill={CHART_PALETTE.inkSoft}>
        <text x="412" y="118" fontSize="13" letterSpacing=".25em" opacity="0.7" transform="rotate(78 412 118)">CASCADE RANGE</text>
        <text x="540" y="700" fontSize="13" letterSpacing=".25em" opacity="0.7" transform="rotate(82 540 700)">SIERRA NEVADA</text>
        <text x="450" y="1090" fontSize="10" letterSpacing=".18em" opacity="0.6">CENTRAL VALLEY</text>
        <text x="295" y="678" fontSize="9" letterSpacing=".18em" opacity="0.6" transform="rotate(-15 295 678)">KLAMATH MTS.</text>
        <text x="248" y="996" fontSize="9" letterSpacing=".18em" opacity="0.55" transform="rotate(80 248 996)">COAST RANGE</text>
      </g>

      {/* Lat/long grid */}
      <g opacity="0.3">
        {LAT_LINES.map(l => (
          <g key={l.y}>
            <line x1="0" y1={l.y} x2="600" y2={l.y} stroke={CHART_PALETTE.ink} strokeWidth="0.3" strokeDasharray="2 5" />
            <text x="6" y={l.y - 3} fontFamily="JetBrains Mono, monospace" fontSize="7" fill={CHART_PALETTE.ink}>{l.label}</text>
          </g>
        ))}
        {LON_LINES.map(l => (
          <g key={l.x}>
            <line x1={l.x} y1="0" x2={l.x} y2="1200" stroke={CHART_PALETTE.ink} strokeWidth="0.25" strokeDasharray="2 5" />
            <text x={l.x + 3} y="12" fontFamily="JetBrains Mono, monospace" fontSize="7" fill={CHART_PALETTE.ink}>{l.label}</text>
          </g>
        ))}
      </g>

      {/* Depth soundings */}
      <g fill={CHART_PALETTE.oceanDeep} opacity="0.65" fontFamily="JetBrains Mono, monospace" fontSize="7">
        {SOUNDINGS.map(([x, y, n], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r="0.8" fill={CHART_PALETTE.paper} opacity="0.8" />
            <text x={x + 2} y={y + 2.5}>{n}</text>
          </g>
        ))}
      </g>

      {/* Ocean labels */}
      <text x="80" y="450" fontFamily="Spectral, serif" fontStyle="italic" fontSize="16"
        fill={CHART_PALETTE.paper} opacity="0.85" letterSpacing=".35em">
        P A C I F I C
      </text>
      <text x="98" y="475" fontFamily="Spectral, serif" fontStyle="italic" fontSize="13"
        fill={CHART_PALETTE.paper} opacity="0.7" letterSpacing=".35em">
        O C E A N
      </text>

      {/* Capes & bays — small italic labels along coast */}
      <g fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={CHART_PALETTE.ink}>
        <text x="160" y="510">C. Blanco</text>
        <text x="146" y="797">C. Mendocino</text>
        <text x="198" y="1083">Pt. Reyes</text>
        <text x="305" y="1166" fontSize="9">Golden Gate</text>
        <text x="170" y="92">Columbia R.</text>
      </g>

      {/* Compass rose, top-left in ocean */}
      <g transform="translate(85,95)">
        <circle r="44" fill={CHART_PALETTE.paper} opacity="0.85" />
        <circle r="42" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.5" />
        <circle r="32" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.3" opacity="0.5" />
        {Array.from({ length: 32 }, (_, i) => {
          const a = (i * 360 / 32) * Math.PI / 180;
          const r1 = 36, r2 = i % 4 === 0 ? 28 : 32;
          return (
            <line
              key={i}
              x1={Math.sin(a) * r2} y1={-Math.cos(a) * r2}
              x2={Math.sin(a) * r1} y2={-Math.cos(a) * r1}
              stroke={CHART_PALETTE.ink} strokeWidth={i % 4 === 0 ? "0.7" : "0.3"}
            />
          );
        })}
        <path d="M0,-36 L4,0 L0,36 L-4,0 Z" fill={CHART_PALETTE.ink} opacity="0.85" />
        <path d="M-36,0 L0,4 L36,0 L0,-4 Z" fill={CHART_PALETTE.ink} opacity="0.4" />
        <circle r="2" fill={CHART_PALETTE.brass} />
        <text x="0" y="-48" textAnchor="middle" fontFamily="Spectral, serif" fontSize="11" fontStyle="italic" fill={CHART_PALETTE.ink}>N</text>
      </g>

      {/* Planned route — dashed polyline through cities */}
      <path
        d={MILESTONES.map((m, i) => {
          const p = CITY_XY[m.name];
          return `${i === 0 ? "M" : "L"} ${p.x},${p.y}`;
        }).join(" ")}
        fill="none"
        stroke={CHART_PALETTE.ink}
        strokeWidth="1.4"
        strokeDasharray="4 4"
        opacity="0.65"
      />

      {/* Traveled portion — segment by segment, painted from both ends. */}
      <g>
        {MILESTONES.slice(0, -1).map((m, i) => {
          const next = MILESTONES[i + 1];
          const a = CITY_XY[m.name];
          const b = CITY_XY[next.name];
          const segLen = next.at - m.at;
          const lerp = (frac) => ({
            x: a.x + (b.x - a.x) * frac,
            y: a.y + (b.y - a.y) * frac,
          });
          // Self portion of this segment (from a → toward b).
          const yourEnd = Math.min(data.yourPosition, next.at);
          const yourStarts = data.yourPosition > m.at;
          // Tanner portion of this segment (from b → toward a).
          const tannerStart = Math.max(data.tannerPosition, m.at);
          const tannerStarts = data.tannerPosition < next.at;
          const yourFrac = yourStarts ? (yourEnd - m.at) / segLen : 0;
          const tannerFrac = tannerStarts ? (tannerStart - m.at) / segLen : 1;
          const yourEndPt = lerp(yourFrac);
          const tannerStartPt = lerp(tannerFrac);
          return (
            <g key={i}>
              {yourStarts && (
                <line
                  x1={a.x} y1={a.y}
                  x2={yourEndPt.x} y2={yourEndPt.y}
                  stroke={CHART_PALETTE.redInk}
                  strokeWidth="2.4" strokeLinecap="round"
                />
              )}
              {tannerStarts && (
                <line
                  x1={tannerStartPt.x} y1={tannerStartPt.y}
                  x2={b.x} y2={b.y}
                  stroke={CHART_PALETTE.brass}
                  strokeWidth="2.4" strokeLinecap="round"
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Wake — Self heading south */}
      {youWake.map((p, i) => (
        <circle key={`yw-${i}`} cx={p.x} cy={p.y} r={2.2 - i * 0.18} fill={CHART_PALETTE.paper} opacity={0.55 - i * 0.05} />
      ))}
      {/* Wake — Tanner heading north */}
      {tannerWake.map((p, i) => (
        <circle key={`tw-${i}`} cx={p.x} cy={p.y} r={2.2 - i * 0.18} fill={CHART_PALETTE.paper} opacity={0.55 - i * 0.05} />
      ))}

      {/* Context (non-milestone) cities */}
      <g fontFamily="Spectral, serif" fill={CHART_PALETTE.inkSoft}>
        {CONTEXT_CITIES.map((c) => (
          <g key={c.name}>
            <circle cx={c.x} cy={c.y} r={c.small ? 1.4 : 2} fill={CHART_PALETTE.inkSoft} />
            <text
              x={c.x + (c.small ? 4 : 5)}
              y={c.y + 3}
              fontSize={c.small ? 9 : 10}
              fontStyle="italic"
              opacity="0.75"
            >{c.name}</text>
          </g>
        ))}
      </g>

      {/* Milestones — labeled city dots */}
      {MILESTONES.map((m, i) => {
        const p = CITY_XY[m.name];
        const reachedByYou = data.yourPosition >= m.at;
        const reachedByTanner = data.tannerPosition <= m.at;
        const reached = reachedByYou || reachedByTanner;
        const reachedColor = reachedByYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass;
        const isEnd = m.kind === "start" || m.kind === "end";
        // Determine label side — most cities are inland, so most labels go right.
        // But for endpoints push label up.
        const labelRight = m.name !== "Roseburg" && m.name !== "Vallejo" && m.name !== "Mt. Shasta";
        const isHovered = hovered === m.name;
        return (
          <g
            key={m.name}
            transform={`translate(${p.x},${p.y})`}
            onMouseEnter={() => setHovered(m.name)}
            onMouseLeave={() => setHovered(null)}
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
              x={labelRight ? 10 : -10}
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
              <text x={labelRight ? 10 : -10} y={0} textAnchor={labelRight ? "start" : "end"} fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.inkSoft}>
                {m.kind === "start" ? "DEPART" : "ARRIVE"}
              </text>
            )}
            {isHovered && (
              <g transform={`translate(${labelRight ? 10 : -10}, ${isEnd ? 16 : 18})`}>
                <rect
                  x={labelRight ? 0 : -160} y="-2"
                  width="160" height="32"
                  fill={CHART_PALETTE.paper}
                  stroke={CHART_PALETTE.ink}
                  strokeWidth="0.5"
                />
                <text
                  x={labelRight ? 6 : -154} y="10"
                  fontFamily="JetBrains Mono, monospace" fontSize="8"
                  fill={CHART_PALETTE.ink} letterSpacing=".06em"
                >
                  {Math.round(m.at / 1000)} km from Sherwood
                </text>
                <text
                  x={labelRight ? 6 : -154} y="22"
                  fontFamily="Spectral, serif" fontStyle="italic" fontSize="10"
                  fill={reached ? reachedColor : CHART_PALETTE.inkSoft}
                >
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

      {/* Self boat */}
      <g transform={`translate(${youBoat.x},${youBoat.y})`}>
        <ellipse cx="0" cy="6" rx="14" ry="3" fill={CHART_PALETTE.paper} opacity="0.55" />
        <path d="M-11,0 Q0,7 11,0 L8,3 Q0,5 -8,3 Z" fill={CHART_PALETTE.ink} />
        <line x1="0" y1="0" x2="0" y2="-12" stroke={CHART_PALETTE.ink} strokeWidth="1" />
        <path d="M0,-12 L9,-9 L0,-7 Z" fill={CHART_PALETTE.redInk} />
        <text x="12" y="-7" fontFamily="Spectral, serif" fontStyle="italic" fontSize="9" fill={CHART_PALETTE.ink}>Daniel</text>
      </g>

      {/* Tanner boat */}
      <g transform={`translate(${tannerBoat.x},${tannerBoat.y})`}>
        <ellipse cx="0" cy="6" rx="14" ry="3" fill={CHART_PALETTE.paper} opacity="0.55" />
        <path d="M-11,0 Q0,7 11,0 L8,3 Q0,5 -8,3 Z" fill={CHART_PALETTE.ink} />
        <line x1="0" y1="0" x2="0" y2="-12" stroke={CHART_PALETTE.ink} strokeWidth="1" />
        <path d="M0,-12 L-9,-9 L0,-7 Z" fill={CHART_PALETTE.brass} />
        <text x="-12" y="-7" textAnchor="end" fontFamily="Spectral, serif" fontStyle="italic" fontSize="9" fill={CHART_PALETTE.ink}>Tanner</text>
      </g>

      {/* Title cartouche — bottom-right on Sierra foothills */}
      <g transform="translate(490,1130)">
        <rect x="-95" y="-50" width="190" height="100" fill={CHART_PALETTE.paper} stroke={CHART_PALETTE.ink} strokeWidth="0.7" />
        <rect x="-89" y="-44" width="178" height="88" fill="none" stroke={CHART_PALETTE.ink} strokeWidth="0.3" />
        <text x="0" y="-22" textAnchor="middle" fontFamily="Spectral, serif" fontSize="10" fontStyle="italic" fill={CHART_PALETTE.ink}>A Chart for</text>
        <text x="0" y="-2" textAnchor="middle" fontFamily="Spectral, serif" fontSize="14" fontWeight="600" letterSpacing=".06em" fill={CHART_PALETTE.ink}>BOYS IN THE BOAT</text>
        <text x="0" y="14" textAnchor="middle" fontFamily="Spectral, serif" fontSize="9" fontStyle="italic" fill={CHART_PALETTE.inkSoft}>Sherwood to Berkeley</text>
        <line x1="-50" y1="22" x2="50" y2="22" stroke={CHART_PALETTE.ink} strokeWidth="0.4" />
        <text x="0" y="35" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.ink} letterSpacing=".18em">1,000 KM · MMXXVI</text>
      </g>

      {/* Scale bar, bottom-left */}
      <g transform="translate(60,1170)">
        <line x1="0" y1="0" x2="160" y2="0" stroke={CHART_PALETTE.ink} strokeWidth="1.2" />
        <line x1="0" y1="-4" x2="0" y2="4" stroke={CHART_PALETTE.ink} strokeWidth="1.2" />
        <line x1="40" y1="-3" x2="40" y2="3" stroke={CHART_PALETTE.ink} strokeWidth="0.8" />
        <line x1="80" y1="-3" x2="80" y2="3" stroke={CHART_PALETTE.ink} strokeWidth="0.8" />
        <line x1="120" y1="-3" x2="120" y2="3" stroke={CHART_PALETTE.ink} strokeWidth="0.8" />
        <line x1="160" y1="-4" x2="160" y2="4" stroke={CHART_PALETTE.ink} strokeWidth="1.2" />
        <text x="0" y="16" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.ink}>0</text>
        <text x="80" y="16" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.ink}>250</text>
        <text x="160" y="16" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={CHART_PALETTE.ink}>500 km</text>
      </g>

      {/* Subtle grain */}
      <rect width="600" height="1200" filter="url(#chart-grain)" opacity="0.5" pointerEvents="none" />
      {/* Paper edge */}
      <rect x="0" y="0" width="600" height="1200" fill="none" stroke={CHART_PALETTE.paperEdge} strokeWidth="6" />
    </svg>
  );
}

Object.assign(window, { Chart, CHART_PALETTE });
