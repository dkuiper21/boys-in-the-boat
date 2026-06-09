// V1 — Nautical chart aesthetic.
// Stylized west-coast chart with the route as a course line,
// two boats at each rower's contribution position, log sheet on the right.

const V1_PALETTE = {
  paper: "#f1e6cf",
  paperDeep: "#e6d6b5",
  ink: "#1b2b3a",
  ocean: "#234a6b",
  oceanDeep: "#16324b",
  land: "#d9c79e",
  landEdge: "#b9a376",
  brass: "#b6803a",
  brassLight: "#d9a55b",
  rope: "#7a5a2a",
  redInk: "#a8412c",
};

function V1Map({ data }) {
  // Route is a smooth bezier down the west coast.
  // We use a path and getPointAtLength to place boats + milestones.
  const pathRef = React.useRef(null);
  const [pathLen, setPathLen] = React.useState(0);

  React.useLayoutEffect(() => {
    if (pathRef.current) setPathLen(pathRef.current.getTotalLength());
  }, []);

  // Map normalized progress (0..1) to an SVG point along the route.
  const pointAt = (t) => {
    if (!pathRef.current || !pathLen) return { x: 0, y: 0 };
    const p = pathRef.current.getPointAtLength(pathLen * Math.max(0, Math.min(1, t)));
    return { x: p.x, y: p.y };
  };

  const yourProgress = data.totals.you / data.totalMeters;
  const tannerProgress = (data.totals.you + data.totals.tanner) / data.totalMeters;
  // We render Tanner's boat at the combined position (where the team currently is),
  // and "Your" boat at your individual contribution — together they form the leading edge.
  // Actually with combined-effort framing it's clearer to show ONE boat at combined position,
  // plus a faint marker for individual contributions. Let's show one team boat at combined.
  const teamProgress = data.progress;

  return (
    <svg viewBox="0 0 520 720" style={{ width: "100%", height: "100%", display: "block" }}>
      <defs>
        <pattern id="v1-paper" width="6" height="6" patternUnits="userSpaceOnUse">
          <rect width="6" height="6" fill={V1_PALETTE.paper} />
          <circle cx="1" cy="1" r="0.3" fill={V1_PALETTE.paperDeep} opacity="0.6" />
        </pattern>
        <pattern id="v1-ocean-lines" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(0)">
          <rect width="14" height="14" fill={V1_PALETTE.ocean} />
          <path d="M0 7 Q3.5 5 7 7 T14 7" fill="none" stroke={V1_PALETTE.oceanDeep} strokeWidth="0.6" opacity="0.55" />
        </pattern>
      </defs>

      {/* Paper background */}
      <rect width="520" height="720" fill="url(#v1-paper)" />

      {/* Ocean — left side */}
      <path
        d="M0,0 L240,0 C220,80 200,150 210,230 C220,310 195,380 200,460 C205,540 230,610 215,720 L0,720 Z"
        fill="url(#v1-ocean-lines)"
      />

      {/* Land — right side (rough Cascadia + N. CA shape) */}
      <path
        d="M520,0 L240,0 C260,90 245,160 260,230 C275,310 250,380 255,460 C260,540 280,610 270,720 L520,720 Z"
        fill={V1_PALETTE.land}
        stroke={V1_PALETTE.landEdge}
        strokeWidth="1.2"
      />

      {/* faint hills */}
      <g opacity="0.35" fill="none" stroke={V1_PALETTE.landEdge} strokeWidth="0.8">
        <path d="M320,80 q40,-10 80,15" />
        <path d="M340,160 q50,-15 110,5" />
        <path d="M310,260 q60,-20 130,10" />
        <path d="M330,360 q55,-15 120,12" />
        <path d="M320,470 q60,-20 140,5" />
        <path d="M310,580 q50,-15 130,10" />
      </g>

      {/* Compass rose */}
      <g transform="translate(80,90)">
        <circle r="34" fill="none" stroke={V1_PALETTE.ink} strokeWidth="0.6" opacity="0.5" />
        <circle r="26" fill="none" stroke={V1_PALETTE.ink} strokeWidth="0.4" opacity="0.4" />
        <path d="M0,-28 L4,0 L0,28 L-4,0 Z" fill={V1_PALETTE.ink} opacity="0.85" />
        <path d="M-28,0 L0,4 L28,0 L0,-4 Z" fill={V1_PALETTE.ink} opacity="0.55" />
        <text x="0" y="-36" textAnchor="middle" fontFamily="Spectral, serif" fontSize="11" fontStyle="italic" fill={V1_PALETTE.ink}>N</text>
      </g>

      {/* Route — dashed course line */}
      <path
        ref={pathRef}
        d="M310,70 C 290,140 320,200 305,280 C 290,360 320,420 310,500 C 300,580 320,640 305,690"
        fill="none"
        stroke={V1_PALETTE.ink}
        strokeWidth="1.4"
        strokeDasharray="3 4"
        opacity="0.7"
      />

      {/* Traveled portion — solid rope-thick line */}
      <path
        d="M310,70 C 290,140 320,200 305,280 C 290,360 320,420 310,500 C 300,580 320,640 305,690"
        fill="none"
        stroke={V1_PALETTE.redInk}
        strokeWidth="2.2"
        strokeDasharray={pathLen ? `${pathLen * teamProgress} ${pathLen}` : "0 9999"}
        strokeLinecap="round"
      />

      {/* Milestones */}
      {pathLen > 0 && MILESTONES.map((m, i) => {
        const t = m.at / TOTAL_METERS;
        const pt = pointAt(t);
        const reached = data.totals.combined >= m.at;
        const isEnd = m.kind === "start" || m.kind === "end";
        const labelLeft = i % 2 === 0;
        return (
          <g key={m.name} transform={`translate(${pt.x},${pt.y})`}>
            {isEnd ? (
              <>
                <circle r="7" fill={V1_PALETTE.paper} stroke={V1_PALETTE.ink} strokeWidth="1.4" />
                <circle r="3" fill={V1_PALETTE.ink} />
              </>
            ) : (
              <circle r="3" fill={reached ? V1_PALETTE.redInk : V1_PALETTE.ink} opacity={reached ? 1 : 0.6} />
            )}
            <text
              x={labelLeft ? -10 : 10}
              y={isEnd ? -10 : 3.5}
              textAnchor={labelLeft ? "end" : "start"}
              fontFamily="Spectral, serif"
              fontSize={isEnd ? 13 : 10}
              fontStyle={isEnd ? "normal" : "italic"}
              fontWeight={isEnd ? 600 : 400}
              fill={V1_PALETTE.ink}
            >
              {m.name}
              {!isEnd && <tspan fontSize="8" opacity="0.6">, {m.region}</tspan>}
            </text>
          </g>
        );
      })}

      {/* Team boat at combined progress */}
      {pathLen > 0 && (() => {
        const pt = pointAt(teamProgress);
        return (
          <g transform={`translate(${pt.x},${pt.y})`}>
            {/* wake */}
            <ellipse cx="0" cy="6" rx="14" ry="3" fill={V1_PALETTE.paper} opacity="0.55" />
            {/* hull */}
            <path d="M-12,0 Q0,7 12,0 L9,3 Q0,5 -9,3 Z" fill={V1_PALETTE.ink} />
            {/* mast/flag */}
            <line x1="0" y1="0" x2="0" y2="-12" stroke={V1_PALETTE.ink} strokeWidth="1" />
            <path d="M0,-12 L8,-9 L0,-7 Z" fill={V1_PALETTE.redInk} />
          </g>
        );
      })()}

      {/* Title cartouche */}
      <g transform="translate(380,640)">
        <rect x="-70" y="-30" width="140" height="60" fill={V1_PALETTE.paper} stroke={V1_PALETTE.ink} strokeWidth="0.6" />
        <rect x="-66" y="-26" width="132" height="52" fill="none" stroke={V1_PALETTE.ink} strokeWidth="0.3" />
        <text x="0" y="-8" textAnchor="middle" fontFamily="Spectral, serif" fontSize="10" fontStyle="italic" fill={V1_PALETTE.ink}>The Crossing</text>
        <text x="0" y="6" textAnchor="middle" fontFamily="Spectral, serif" fontSize="13" fontWeight="600" fill={V1_PALETTE.ink}>SHERWOOD → BERKELEY</text>
        <text x="0" y="20" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={V1_PALETTE.ink} opacity="0.7">1,000 km · MMXXVI</text>
      </g>

      {/* Scale bar */}
      <g transform="translate(60,680)">
        <line x1="0" y1="0" x2="120" y2="0" stroke={V1_PALETTE.ink} strokeWidth="1" />
        <line x1="0" y1="-3" x2="0" y2="3" stroke={V1_PALETTE.ink} strokeWidth="1" />
        <line x1="40" y1="-2" x2="40" y2="2" stroke={V1_PALETTE.ink} strokeWidth="0.7" />
        <line x1="80" y1="-2" x2="80" y2="2" stroke={V1_PALETTE.ink} strokeWidth="0.7" />
        <line x1="120" y1="-3" x2="120" y2="3" stroke={V1_PALETTE.ink} strokeWidth="1" />
        <text x="60" y="15" textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize="8" fill={V1_PALETTE.ink}>0 — 500 km</text>
      </g>
    </svg>
  );
}

function V1LogForm({ data }) {
  const [person, setPerson] = React.useState("you");
  const [meters, setMeters] = React.useState("");
  const [note, setNote] = React.useState("");

  const submit = (e) => {
    e.preventDefault();
    const m = parseInt(meters, 10);
    if (!m || m <= 0) return;
    data.addSession({ person, meters: m, note });
    setMeters("");
    setNote("");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 10 }}>
      <div style={{ display: "flex", gap: 6, background: V1_PALETTE.paperDeep, padding: 4, border: `1px solid ${V1_PALETTE.ink}` }}>
        {["you", "tanner"].map(p => (
          <button
            type="button"
            key={p}
            onClick={() => setPerson(p)}
            style={{
              flex: 1, padding: "8px 10px", border: 0, cursor: "pointer",
              background: person === p ? V1_PALETTE.ink : "transparent",
              color: person === p ? V1_PALETTE.paper : V1_PALETTE.ink,
              fontFamily: "Spectral, serif", fontSize: 13, letterSpacing: ".08em", textTransform: "uppercase",
            }}
          >{p}</button>
        ))}
      </div>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: V1_PALETTE.ink, opacity: .7 }}>Meters logged</span>
        <input
          type="number"
          inputMode="numeric"
          placeholder="e.g. 7500"
          value={meters}
          onChange={e => setMeters(e.target.value)}
          style={{
            background: "transparent", border: 0, borderBottom: `1px solid ${V1_PALETTE.ink}`,
            padding: "6px 0", fontFamily: "Spectral, serif", fontSize: 22, color: V1_PALETTE.ink, outline: "none",
          }}
        />
      </label>
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: ".15em", textTransform: "uppercase", color: V1_PALETTE.ink, opacity: .7 }}>Log note (optional)</span>
        <input
          type="text"
          placeholder="felt strong, headwind, …"
          value={note}
          onChange={e => setNote(e.target.value)}
          style={{
            background: "transparent", border: 0, borderBottom: `1px solid ${V1_PALETTE.ink}`,
            padding: "6px 0", fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 13, color: V1_PALETTE.ink, outline: "none",
          }}
        />
      </label>
      <button
        type="submit"
        style={{
          marginTop: 4, padding: "10px 14px", border: `1px solid ${V1_PALETTE.ink}`, background: V1_PALETTE.ink, color: V1_PALETTE.paper,
          fontFamily: "Spectral, serif", fontSize: 13, letterSpacing: ".15em", textTransform: "uppercase", cursor: "pointer",
        }}
      >Enter in log →</button>
    </form>
  );
}

function V1({ data }) {
  const lastFew = data.sessions.slice(-4).reverse();
  return (
    <div style={{
      width: "100%", height: "100%", background: V1_PALETTE.paper, color: V1_PALETTE.ink,
      display: "grid", gridTemplateColumns: "520px 1fr", fontFamily: "Spectral, serif",
    }}>
      <div style={{ borderRight: `1px solid ${V1_PALETTE.ink}` }}>
        <V1Map data={data} />
      </div>
      <div style={{ padding: "28px 32px", display: "flex", flexDirection: "column", gap: 22, overflow: "hidden" }}>
        {/* Header */}
        <div style={{ borderBottom: `1px solid ${V1_PALETTE.ink}`, paddingBottom: 14 }}>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", opacity: .65 }}>
            Captain's Log · Anno MMXXVI
          </div>
          <div style={{ fontSize: 30, fontWeight: 600, marginTop: 4, lineHeight: 1.1 }}>
            <span style={{ fontStyle: "italic", fontWeight: 400 }}>en route to </span>
            Berkeley
          </div>
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10 }}>
            <span style={{ fontSize: 44, fontWeight: 600, letterSpacing: "-0.02em" }}>
              {(data.totals.combined / 1000).toFixed(1)}
            </span>
            <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, opacity: .7 }}>
              of 1,000 km
            </span>
            <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: V1_PALETTE.redInk }}>
              {(data.progress * 100).toFixed(1)}%
            </span>
          </div>
          <div style={{ height: 8, background: V1_PALETTE.paperDeep, border: `1px solid ${V1_PALETTE.ink}`, marginTop: 8, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${data.progress * 100}%`, background: V1_PALETTE.redInk }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontFamily: "JetBrains Mono, monospace", fontSize: 9, opacity: .6 }}>
            <span>SHERWOOD</span><span>BERKELEY</span>
          </div>
        </div>

        {/* Crew breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
          {[
            { label: "Your meters", v: data.totals.you },
            { label: "Tanner's meters", v: data.totals.tanner },
          ].map((c) => (
            <div key={c.label} style={{ border: `1px solid ${V1_PALETTE.ink}`, padding: "10px 12px" }}>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", opacity: .65 }}>{c.label}</div>
              <div style={{ fontSize: 22, fontWeight: 600, marginTop: 2 }}>{(c.v / 1000).toFixed(1)} <span style={{ fontSize: 12, opacity: .6 }}>km</span></div>
            </div>
          ))}
        </div>

        {/* Next landmark + ETA */}
        <div style={{ borderTop: `1px dashed ${V1_PALETTE.ink}`, borderBottom: `1px dashed ${V1_PALETTE.ink}`, padding: "12px 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", opacity: .65 }}>Next landfall</div>
            <div style={{ fontSize: 17, fontStyle: "italic", marginTop: 2 }}>{data.currentLandmark.next.name}, {data.currentLandmark.next.region}</div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, opacity: .7 }}>
              {fmtMeters(Math.max(0, data.currentLandmark.next.at - data.totals.combined))} away
            </div>
          </div>
          <div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: ".18em", textTransform: "uppercase", opacity: .65 }}>Projected arrival</div>
            <div style={{ fontSize: 17, fontStyle: "italic", marginTop: 2 }}>
              {data.eta ? fmtDateLong(data.eta.arrival) : "—"}
            </div>
            <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, opacity: .7 }}>
              at {data.eta ? Math.round(data.eta.metersPerDay).toLocaleString() : "—"} m/day
            </div>
          </div>
        </div>

        {/* Form */}
        <V1LogForm data={data} />

        {/* Recent log entries */}
        <div>
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", opacity: .65, marginBottom: 6 }}>
            Recent entries
          </div>
          <div style={{ display: "grid", gap: 4 }}>
            {lastFew.map(s => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "60px 70px 1fr 80px", gap: 8, fontSize: 12, padding: "5px 0", borderBottom: `1px dotted ${V1_PALETTE.ink}40` }}>
                <span style={{ fontFamily: "JetBrains Mono, monospace", opacity: .7 }}>{fmtDate(s.date)}</span>
                <span style={{ fontStyle: "italic" }}>{s.person === "you" ? "self" : "Tanner"}</span>
                <span style={{ fontStyle: "italic", opacity: .7 }}>{s.note || "—"}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", textAlign: "right" }}>{s.meters.toLocaleString()}m</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

window.V1 = V1;
