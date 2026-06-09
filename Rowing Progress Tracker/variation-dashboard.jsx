// V2 — Sporty dashboard.
// Dark, data-dense. Big numbers, sparkline, route as a stylized rail,
// head-to-head stats, log form sticky in the corner.

const V2_PALETTE = {
  bg: "#0d1117",
  bgRaised: "#161c25",
  bgChip: "#1f2632",
  line: "#2a3340",
  text: "#e6ecf1",
  textDim: "#8a96a7",
  textFaint: "#5b6675",
  accent: "#9bff5a",
  accentDim: "#6ec43c",
  you: "#9bff5a",
  tanner: "#ffb84a",
};

function V2Sparkline({ sessions }) {
  // Cumulative line — you, tanner, combined.
  const sorted = [...sessions].sort((a, b) => a.date.localeCompare(b.date));
  if (sorted.length === 0) return null;

  let cy = 0, ct = 0;
  const points = sorted.map((s, i) => {
    if (s.person === "you") cy += s.meters; else ct += s.meters;
    return { i, you: cy, tanner: ct, combined: cy + ct, date: s.date };
  });
  const maxY = TOTAL_METERS;
  const w = 640, h = 160, pad = { l: 8, r: 8, t: 12, b: 18 };
  const xAt = (i) => pad.l + (i / Math.max(1, points.length - 1)) * (w - pad.l - pad.r);
  const yAt = (v) => h - pad.b - (v / maxY) * (h - pad.t - pad.b);

  const line = (key) => points.map((p, i) => `${i === 0 ? "M" : "L"} ${xAt(i)} ${yAt(p[key])}`).join(" ");
  const area = `${line("combined")} L ${xAt(points.length - 1)} ${h - pad.b} L ${pad.l} ${h - pad.b} Z`;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {/* gridlines at 25/50/75/100% */}
      {[0.25, 0.5, 0.75, 1].map(t => (
        <g key={t}>
          <line x1={pad.l} x2={w - pad.r} y1={yAt(maxY * t)} y2={yAt(maxY * t)} stroke={V2_PALETTE.line} strokeDasharray="2 4" />
          <text x={w - pad.r} y={yAt(maxY * t) - 3} textAnchor="end" fontFamily="JetBrains Mono, monospace" fontSize="9" fill={V2_PALETTE.textFaint}>
            {(maxY * t / 1000).toFixed(0)}k
          </text>
        </g>
      ))}
      <path d={area} fill={V2_PALETTE.accent} opacity="0.08" />
      <path d={line("you")} fill="none" stroke={V2_PALETTE.you} strokeWidth="1.4" opacity="0.85" />
      <path d={line("tanner")} fill="none" stroke={V2_PALETTE.tanner} strokeWidth="1.4" opacity="0.85" />
      <path d={line("combined")} fill="none" stroke={V2_PALETTE.text} strokeWidth="2" />
      {/* End dot */}
      <circle cx={xAt(points.length - 1)} cy={yAt(points[points.length - 1].combined)} r="3.5" fill={V2_PALETTE.accent} />
    </svg>
  );
}

function V2Route({ data }) {
  // Horizontal rail with milestones plotted.
  const h = 90;
  const w = 1100;
  const padX = 30;
  const railY = 56;
  const xAt = (m) => padX + (m / TOTAL_METERS) * (w - padX * 2);
  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {/* unfilled rail */}
      <line x1={padX} y1={railY} x2={w - padX} y2={railY} stroke={V2_PALETTE.line} strokeWidth="4" strokeLinecap="round" />
      {/* progress rail */}
      <line x1={padX} y1={railY} x2={xAt(data.totals.combined)} y2={railY} stroke={V2_PALETTE.accent} strokeWidth="4" strokeLinecap="round" />
      {/* milestone ticks */}
      {MILESTONES.map((m, i) => {
        const x = xAt(m.at);
        const reached = data.totals.combined >= m.at;
        const isEnd = m.kind === "start" || m.kind === "end";
        return (
          <g key={m.name}>
            <circle cx={x} cy={railY} r={isEnd ? 7 : 4} fill={reached ? V2_PALETTE.accent : V2_PALETTE.bgChip} stroke={reached ? V2_PALETTE.accent : V2_PALETTE.line} strokeWidth="1.5" />
            <text x={x} y={i % 2 === 0 ? railY - 16 : railY + 22} textAnchor="middle" fontFamily="JetBrains Mono, monospace" fontSize={isEnd ? 11 : 9} fontWeight={isEnd ? 700 : 400} fill={reached ? V2_PALETTE.text : V2_PALETTE.textFaint} letterSpacing=".06em">
              {m.name.toUpperCase()}
            </text>
          </g>
        );
      })}
      {/* Position indicator */}
      <g transform={`translate(${xAt(data.totals.combined)},${railY})`}>
        <circle r="10" fill={V2_PALETTE.accent} opacity="0.25" />
        <circle r="5" fill={V2_PALETTE.accent} stroke={V2_PALETTE.bg} strokeWidth="2" />
      </g>
    </svg>
  );
}

function V2Stat({ label, value, sub, color }) {
  return (
    <div style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, padding: "14px 16px", borderRadius: 4 }}>
      <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>{label}</div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 6 }}>
        <span style={{ fontSize: 28, fontWeight: 700, color: color || V2_PALETTE.text, letterSpacing: "-0.02em", fontFamily: "Inter, sans-serif" }}>{value}</span>
        {sub && <span style={{ fontSize: 11, color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>{sub}</span>}
      </div>
    </div>
  );
}

function V2LogForm({ data }) {
  const [person, setPerson] = React.useState("you");
  const [meters, setMeters] = React.useState("");

  const submit = (e) => {
    e.preventDefault();
    const m = parseInt(meters, 10);
    if (!m || m <= 0) return;
    data.addSession({ person, meters: m });
    setMeters("");
  };

  return (
    <form onSubmit={submit} style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, borderRadius: 4, padding: 16, display: "grid", gap: 12 }}>
      <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>Log new session</div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
        {[
          { id: "you", color: V2_PALETTE.you },
          { id: "tanner", color: V2_PALETTE.tanner },
        ].map(p => (
          <button
            key={p.id}
            type="button"
            onClick={() => setPerson(p.id)}
            style={{
              padding: "10px 8px", border: `1px solid ${person === p.id ? p.color : V2_PALETTE.line}`,
              background: person === p.id ? `${p.color}22` : "transparent",
              color: person === p.id ? p.color : V2_PALETTE.textDim,
              fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
              borderRadius: 4, cursor: "pointer",
            }}
          >{p.id}</button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="number"
          inputMode="numeric"
          placeholder="meters"
          value={meters}
          onChange={e => setMeters(e.target.value)}
          style={{
            flex: 1, background: V2_PALETTE.bg, border: `1px solid ${V2_PALETTE.line}`, color: V2_PALETTE.text,
            padding: "10px 12px", fontFamily: "JetBrains Mono, monospace", fontSize: 14, borderRadius: 4, outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            background: V2_PALETTE.accent, border: 0, color: V2_PALETTE.bg, padding: "10px 16px",
            fontFamily: "JetBrains Mono, monospace", fontSize: 11, letterSpacing: ".12em", textTransform: "uppercase",
            borderRadius: 4, cursor: "pointer", fontWeight: 700,
          }}
        >Log →</button>
      </div>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
        {[2000, 5000, 7500, 10000].map(q => (
          <button
            key={q}
            type="button"
            onClick={() => data.addSession({ person, meters: q })}
            style={{
              background: "transparent", border: `1px solid ${V2_PALETTE.line}`, color: V2_PALETTE.textDim,
              padding: "4px 10px", fontFamily: "JetBrains Mono, monospace", fontSize: 10, borderRadius: 999, cursor: "pointer",
            }}
          >+{q / 1000}k</button>
        ))}
      </div>
    </form>
  );
}

function V2({ data }) {
  const recent = data.sessions.slice(-5).reverse();
  return (
    <div style={{
      width: "100%", height: "100%", background: V2_PALETTE.bg, color: V2_PALETTE.text,
      fontFamily: "Inter, sans-serif", display: "grid", gridTemplateRows: "auto auto 1fr",
    }}>
      {/* Top strip */}
      <div style={{ padding: "20px 28px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: `1px solid ${V2_PALETTE.line}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 8, height: 8, background: V2_PALETTE.accent, borderRadius: "50%" }} />
          <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, letterSpacing: ".24em", textTransform: "uppercase" }}>
            ROW · SHERWOOD <span style={{ color: V2_PALETTE.textFaint }}>→</span> BERKELEY
          </div>
        </div>
        <div style={{ display: "flex", gap: 24, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: V2_PALETTE.textDim }}>
          <span><span style={{ color: V2_PALETTE.you }}>●</span> YOU</span>
          <span><span style={{ color: V2_PALETTE.tanner }}>●</span> TANNER</span>
          <span><span style={{ color: V2_PALETTE.text }}>●</span> COMBINED</span>
        </div>
      </div>

      {/* Route */}
      <div style={{ padding: "18px 18px 4px" }}>
        <V2Route data={data} />
      </div>

      {/* Main grid */}
      <div style={{ padding: "18px 28px 28px", display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 20, minHeight: 0 }}>
        {/* Left column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Headline number */}
          <div style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, borderRadius: 4, padding: "20px 22px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".2em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>Combined distance</div>
            <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginTop: 6 }}>
              <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", color: V2_PALETTE.accent, fontFamily: "Inter, sans-serif", lineHeight: 1 }}>
                {(data.totals.combined / 1000).toFixed(1)}
              </span>
              <span style={{ fontSize: 24, fontWeight: 500, color: V2_PALETTE.textDim }}>
                / 1,000 km
              </span>
              <span style={{ marginLeft: "auto", fontFamily: "JetBrains Mono, monospace", fontSize: 14, color: V2_PALETTE.accent, background: `${V2_PALETTE.accent}1a`, padding: "4px 10px", borderRadius: 4 }}>
                {(data.progress * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{ marginTop: 14, height: 6, background: V2_PALETTE.bgChip, borderRadius: 3, overflow: "hidden", display: "flex" }}>
              <div style={{ width: `${(data.totals.you / TOTAL_METERS) * 100}%`, background: V2_PALETTE.you }} />
              <div style={{ width: `${(data.totals.tanner / TOTAL_METERS) * 100}%`, background: V2_PALETTE.tanner }} />
            </div>
          </div>

          {/* Chart */}
          <div style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, borderRadius: 4, padding: "16px 18px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
              <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>Cumulative · meters</div>
              <div style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 10, color: V2_PALETTE.textFaint }}>{data.sessions.length} sessions</div>
            </div>
            <V2Sparkline sessions={data.sessions} />
          </div>

          {/* Head-to-head */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <V2Stat label="You · total" value={(data.totals.you / 1000).toFixed(1)} sub="km" color={V2_PALETTE.you} />
            <V2Stat label="Tanner · total" value={(data.totals.tanner / 1000).toFixed(1)} sub="km" color={V2_PALETTE.tanner} />
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <V2LogForm data={data} />

          {/* ETA + next */}
          <div style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, borderRadius: 4, padding: "16px 18px" }}>
            <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>Projected arrival</div>
            <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6, letterSpacing: "-0.01em" }}>
              {data.eta ? fmtDateLong(data.eta.arrival) : "—"}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10, fontFamily: "JetBrains Mono, monospace", fontSize: 11, color: V2_PALETTE.textDim }}>
              <span>{data.eta ? Math.round(data.eta.metersPerDay).toLocaleString() : "—"} m/day pace</span>
              <span>{data.eta ? Math.ceil(data.eta.daysLeft) : "—"} days to go</span>
            </div>
            <div style={{ borderTop: `1px solid ${V2_PALETTE.line}`, marginTop: 14, paddingTop: 12 }}>
              <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace" }}>Next landmark</div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 4 }}>
                <span style={{ fontSize: 18, fontWeight: 600 }}>{data.currentLandmark.next.name}, {data.currentLandmark.next.region}</span>
                <span style={{ fontFamily: "JetBrains Mono, monospace", fontSize: 12, color: V2_PALETTE.accent }}>
                  {fmtMeters(Math.max(0, data.currentLandmark.next.at - data.totals.combined))}
                </span>
              </div>
            </div>
          </div>

          {/* Recent sessions */}
          <div style={{ background: V2_PALETTE.bgRaised, border: `1px solid ${V2_PALETTE.line}`, borderRadius: 4, padding: "16px 18px", flex: 1 }}>
            <div style={{ fontSize: 10, letterSpacing: ".18em", textTransform: "uppercase", color: V2_PALETTE.textDim, fontFamily: "JetBrains Mono, monospace", marginBottom: 8 }}>Recent</div>
            <div style={{ display: "grid", gap: 6 }}>
              {recent.map(s => (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "10px 50px 1fr auto", gap: 10, alignItems: "center", fontSize: 12 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.person === "you" ? V2_PALETTE.you : V2_PALETTE.tanner }} />
                  <span style={{ fontFamily: "JetBrains Mono, monospace", color: V2_PALETTE.textDim }}>{fmtDate(s.date)}</span>
                  <span style={{ color: V2_PALETTE.textDim, fontStyle: "italic", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.note || (s.person === "you" ? "you" : "Tanner")}</span>
                  <span style={{ fontFamily: "JetBrains Mono, monospace", fontWeight: 600 }}>{s.meters.toLocaleString()}m</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

window.V2 = V2;
