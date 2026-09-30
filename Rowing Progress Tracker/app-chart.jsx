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

// --- Geography ----------------------------------------------------------------
// The land, sea floor and coastline come from terrain.webp: real elevation
// (AWS Terrain Tiles: SRTM, GMTED, ETOPO1) shaded into a 1200 x 2400 image in
// this projection, with Natural Earth 1:10m coastlines. Lakes, rivers, the
// state line and the highway route come from map-data.js (Natural Earth).
const MAP = window.MAP_DATA;
const X_OF = (lon) => 60 + (lon + 125) * 89;
const Y_OF = (lat) => (47 - lat) * 120;

// Volcanic peaks: [name, lat, lon, height in feet]
const PEAKS = [
  ["Mt. Hood", 45.373, -121.696, 11250], ["Mt. Jefferson", 44.674, -121.800, 10495],
  ["Three Sisters", 44.103, -121.769, 10358], ["Mt. McLoughlin", 42.445, -122.315, 9495],
  ["Mt. Shasta", 41.409, -122.195, 14179], ["Lassen Peak", 40.488, -121.505, 10457],
].map(([name, lat, lon, ft]) => ({ name, x: X_OF(lon), y: Y_OF(lat), ft, dy: name === "Mt. McLoughlin" ? -12 : 0 }));

// Lake labels: [name, lat, lon, dx] (negative dx = label to the left)
const LAKE_LABELS = [
  ["Crater L.", 42.94, -122.10, 6], ["Upper Klamath L.", 42.30, -121.80, 10], ["Shasta L.", 40.80, -122.30, 8],
  ["L. Almanor", 40.25, -121.14, 8], ["Clear L.", 39.05, -122.83, -8], ["L. Tahoe", 39.10, -120.03, 10],
  ["Goose L.", 41.75, -120.42, -9], ["Pyramid L.", 40.05, -119.62, -9],
].map(([name, lat, lon, dx]) => ({ name, x: X_OF(lon), y: Y_OF(lat), dx }));

// Milestone labels that sit to the left of the route.
const LABEL_LEFT = new Set(["Sherwood", "Salem", "Eugene", "Roseburg", "Mt. Shasta", "Vallejo", "Redding"]);

// Towns off the route, for context. `water`: label sits on the sea.
const CONTEXT_CITIES = [
  ["Portland", 45.52, -122.68, false, false], ["Astoria", 46.19, -123.83, true, false],
  ["Eureka", 40.80, -124.16, true, false], ["Ft. Bragg", 39.45, -123.80, true, false],
  ["San Francisco", 37.77, -122.42, true, true], ["Reno", 39.53, -119.81, true, false],
  ["Bend", 44.06, -121.31, true, false],
].map(([name, lat, lon, small, water]) => ({ name, x: X_OF(lon), y: Y_OF(lat), small, water }));

const CAPES = [
  ["C. Blanco", 42.84, -124.56], ["C. Mendocino", 40.44, -124.41],
  ["Pt. Arena", 38.95, -123.74], ["Pt. Reyes", 38.0, -123.02],
].map(([name, lat, lon]) => ({ name, x: X_OF(lon) - 5, y: Y_OF(lat) + 3 }));

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
// The route follows the actual highways (Interstate 5, Highway 99, Interstate
// 80) through the waypoint towns; every vertex carries its distance from
// Sherwood, so the boats move at a true pace along the road.
const ROUTE = MAP.route.map(([x, y, at]) => ({ x, y, at }));

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
        <radialGradient id="chart-vig" cx="50%" cy="48%" r="72%">
          <stop offset="62%" stopColor="rgba(90,60,20,0)" />
          <stop offset="100%" stopColor="rgba(90,60,20,0.16)" />
        </radialGradient>
        <clipPath id="map-clip">
          <rect x="26" y="26" width="548" height="1148" />
        </clipPath>
      </defs>

      {/* paper base */}
      <rect width="600" height="1200" fill="url(#chart-paper)" />

      {/* ---- map content, clipped to the inner frame ---- */}
      <g clipPath="url(#map-clip)">
        {/* terrain, sea floor and coastline */}
        <image href="terrain.webp" x="0" y="0" width="600" height="1200" preserveAspectRatio="none" />

        {/* lakes */}
        <g fill="#3f6f8f" stroke={P.ink} strokeWidth="0.6" fillRule="evenodd">
          {MAP.lakes.map((d, i) => <path key={i} d={d} />)}
          {/* Crater Lake is below Natural Earth's size cut-off */}
          <circle cx={X_OF(-122.108)} cy={Y_OF(42.941)} r="3.6" />
        </g>

        {/* rivers */}
        <g fill="none" stroke={P.river} strokeLinecap="round" strokeLinejoin="round" opacity="0.85">
          {MAP.rivers.map(([d, w], i) => <path key={i} d={d} strokeWidth={w} />)}
        </g>

        {/* state line */}
        {MAP.stateLine.map((d, i) => (
          <path key={i} d={d} fill="none" stroke={P.ink} strokeWidth="0.7" strokeDasharray="9 3 2 3" opacity="0.55" />
        ))}
        <g fontFamily="Spectral, serif" fontSize="9" letterSpacing=".45em" fill={P.inkSoft} opacity="0.85">
          <text x="168" y="592">OREGON</text>
          <text x="156" y="614">CALIFORNIA</text>
        </g>

        {/* graticule */}
        <g opacity="0.28">
          {LAT_LINES.map(l => (
            <g key={l.y}>
              <line x1="26" y1={l.y} x2="574" y2={l.y} stroke={P.ink} strokeWidth="0.3" strokeDasharray="2 5" />
              <text x="32" y={l.y - 4} fontFamily="JetBrains Mono, monospace" fontSize="7" fill={P.paper}>{l.label}N</text>
            </g>
          ))}
          {LON_LINES.map(l => (
            <g key={l.x}>
              <line x1={l.x} y1="26" x2={l.x} y2="1174" stroke={P.ink} strokeWidth="0.25" strokeDasharray="2 5" />
              <text x={l.x + 3} y="38" fontFamily="JetBrains Mono, monospace" fontSize="7" fill={P.ink}>{l.label}W</text>
            </g>
          ))}
        </g>

        {/* range and valley labels */}
        <g fontFamily="Spectral, serif" fontStyle="italic" fill={P.ink} opacity="0.62" pointerEvents="none">
          <text x="402" y="232" fontSize="12" letterSpacing=".32em" transform="rotate(84 402 232)">CASCADE RANGE</text>
          <text x="470" y="990" fontSize="12" letterSpacing=".3em" transform="rotate(62 470 990)">SIERRA NEVADA</text>
          <text x="330" y="905" fontSize="9" letterSpacing=".24em" transform="rotate(72 330 905)">SACRAMENTO VALLEY</text>
          <text x="150" y="660" fontSize="8.5" letterSpacing=".22em" transform="rotate(-8 150 660)">KLAMATH MTS.</text>
          <text x="172" y="300" fontSize="8.5" letterSpacing=".22em" transform="rotate(86 172 300)">COAST RANGE</text>
          <text x="218" y="300" fontSize="8.5" letterSpacing=".2em" transform="rotate(86 218 300)">WILLAMETTE VALLEY</text>
        </g>

        {/* peaks, with heights */}
        <g pointerEvents="none">
          {PEAKS.map((pk) => (
            <g key={pk.name}>
              <path d={`M ${pk.x},${pk.y - 6} L ${pk.x + 5},${pk.y + 2.5} L ${pk.x - 5},${pk.y + 2.5} Z`} fill={P.ink} opacity="0.8" />
              <text x={pk.x + 8} y={pk.y + 1 + pk.dy} fontFamily="Spectral, serif" fontStyle="italic" fontSize="9" fill={P.ink}
                paintOrder="stroke" stroke={P.paper} strokeWidth="2.2" strokeOpacity="0.6">{pk.name}</text>
              <text x={pk.x + 8} y={pk.y + 10 + pk.dy} fontFamily="JetBrains Mono, monospace" fontSize="6.5" fill={P.inkSoft}>
                {pk.ft.toLocaleString()} FT
              </text>
            </g>
          ))}
        </g>

        {/* lake labels */}
        <g fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={P.ink} opacity="0.8" pointerEvents="none">
          {LAKE_LABELS.map((l) => (
            <text key={l.name} x={l.x + l.dx} y={l.y + 3} textAnchor={l.dx > 0 ? "start" : "end"}>{l.name}</text>
          ))}
        </g>

        {/* ocean label */}
        <text x="70" y="430" fontFamily="Spectral, serif" fontStyle="italic" fontSize="15" fill={P.paper} opacity="0.8"
          letterSpacing=".5em" transform="rotate(85 70 430)" pointerEvents="none">
          PACIFIC OCEAN
        </text>

        {/* capes */}
        <g fontFamily="Spectral, serif" fontStyle="italic" fontSize="8" fill={P.paper} pointerEvents="none">
          {CAPES.map((cp) => <text key={cp.name} x={cp.x} y={cp.y} textAnchor="end">{cp.name}</text>)}
        </g>

        {/* compass rose */}
        <g transform="translate(95,905)" pointerEvents="none">
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
        <g fontFamily="Spectral, serif" fontStyle="italic" pointerEvents="none">
          {CONTEXT_CITIES.map((c) => (
            <g key={c.name}>
              <circle cx={c.x} cy={c.y} r={c.small ? 1.4 : 2} fill={c.water ? P.paper : P.inkSoft} />
              {c.water ? (
                <text x={c.x - 4} y={c.y + 3} textAnchor="end" fontSize="8.5" fill={P.paper}>{c.name}</text>
              ) : (
                <text x={c.x + 5} y={c.y + 3} fontSize={c.small ? 8.5 : 10} fill={P.inkSoft}
                  paintOrder="stroke" stroke={P.paper} strokeWidth="2.4" strokeOpacity="0.7">{c.name}</text>
              )}
            </g>
          ))}
        </g>

        {/* milestones */}
        {MILESTONES.map((m) => {
          const p = routePositionAt(m.at);
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
              transform={`translate(${p.x.toFixed(1)},${p.y.toFixed(1)})`}
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
                paintOrder="stroke" stroke={CHART_PALETTE.paper} strokeWidth="2.6" strokeOpacity="0.75"
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
        <g transform="translate(36,996)" pointerEvents="none">
          <rect width="150" height="136" fill={P.paper} stroke={P.ink} strokeWidth="0.8" />
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
            <path d="M 24,104.5 L 28.5,112 L 19.5,112 Z" fill={P.ink} opacity="0.8" />
            <text x="46" y="112">Peak, height in feet</text>
          </g>
          <text x="10" y="126" fontFamily="JetBrains Mono, monospace" fontSize="5" fill={P.inkSoft} letterSpacing=".04em">
            TERRAIN: AWS TERRAIN TILES · NATURAL EARTH
          </text>
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
    </svg>
  );
});

Object.assign(window, { Chart, CHART_PALETTE, routePositionAt, routeBounds });
