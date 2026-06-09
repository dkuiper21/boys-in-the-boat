// V3 — Editorial journal.
// Quiet, type-led. Off-white paper, ink black, terracotta accent.
// The journey is a long letterpress-style strip. Sessions read like
// dated diary entries.

const V3_PALETTE = {
  paper: "#f5f0e6",
  paperDeep: "#ebe4d4",
  ink: "#1a1410",
  inkSoft: "#54483c",
  rule: "#cfc4ad",
  accent: "#b04a2a", // terracotta
  accentSoft: "#d68c6f",
};

function V3Strip({ data }) {
  // Long horizontal strip — line with milestone marks, you/tanner contributions stacked.
  const w = 1100, h = 130;
  const padX = 40;
  const railY = 70;
  const xAt = (m) => padX + (m / TOTAL_METERS) * (w - padX * 2);
  const youX = xAt(data.totals.you);
  const combinedX = xAt(data.totals.combined);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} style={{ width: "100%", height: h, display: "block" }}>
      {/* base line */}
      <line x1={padX} y1={railY} x2={w - padX} y2={railY} stroke={V3_PALETTE.rule} strokeWidth="1" />
      {/* hash ticks every 100km */}
      {Array.from({ length: 11 }, (_, i) => i * 100_000).map(m => (
        <line key={m} x1={xAt(m)} y1={railY - 4} x2={xAt(m)} y2={railY + 4} stroke={V3_PALETTE.rule} strokeWidth="1" />
      ))}
      {/* You ribbon */}
      <line x1={padX} y1={railY - 2} x2={youX} y2={railY - 2} stroke={V3_PALETTE.ink} strokeWidth="3" strokeLinecap="round" />
      {/* Tanner ribbon (stacked after you) */}
      <line x1={youX} y1={railY + 2} x2={combinedX} y2={railY + 2} stroke={V3_PALETTE.accent} strokeWidth="3" strokeLinecap="round" />

      {/* Milestones */}
      {MILESTONES.map((m, i) => {
        const x = xAt(m.at);
        const reached = data.totals.combined >= m.at;
        const isEnd = m.kind === "start" || m.kind === "end";
        const above = i % 2 === 0;
        const labelY = above ? railY - 18 : railY + 28;
        return (
          <g key={m.name}>
            <circle cx={x} cy={railY} r={isEnd ? 5 : 3} fill={reached ? V3_PALETTE.ink : V3_PALETTE.paper} stroke={V3_PALETTE.ink} strokeWidth="1" />
            <text
              x={x}
              y={labelY}
              textAnchor="middle"
              fontFamily="Spectral, serif"
              fontSize={isEnd ? 13 : 11}
              fontStyle={isEnd ? "normal" : "italic"}
              fontWeight={isEnd ? 600 : 400}
              fill={V3_PALETTE.ink}
            >
              {m.name}
            </text>
            {!isEnd && (
              <text x={x} y={labelY + 12} textAnchor="middle" fontFamily="Spectral, serif" fontSize="9" fill={V3_PALETTE.inkSoft}>
                {Math.round(m.at / 1000)}km
              </text>
            )}
          </g>
        );
      })}

      {/* Position marker at combined */}
      <g transform={`translate(${combinedX},${railY})`}>
        <path d="M0,-10 L4,-2 L-4,-2 Z" fill={V3_PALETTE.accent} />
        <circle r="2.5" fill={V3_PALETTE.accent} />
      </g>
    </svg>
  );
}

function V3LogForm({ data }) {
  const [person, setPerson] = React.useState("you");
  const [meters, setMeters] = React.useState("");
  const [note, setNote] = React.useState("");

  const submit = (e) => {
    e.preventDefault();
    const m = parseInt(meters, 10);
    if (!m || m <= 0) return;
    data.addSession({ person, meters: m, note });
    setMeters(""); setNote("");
  };

  return (
    <form onSubmit={submit} style={{ display: "grid", gap: 12, paddingTop: 18, borderTop: `1px solid ${V3_PALETTE.rule}` }}>
      <div style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 16, color: V3_PALETTE.ink }}>
        Add a new entry…
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr auto", gap: 12, alignItems: "end" }}>
        <div style={{ display: "flex", gap: 14 }}>
          {["you", "tanner"].map(p => (
            <label key={p} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontFamily: "Spectral, serif", fontSize: 14, color: V3_PALETTE.ink }}>
              <span style={{
                display: "inline-block", width: 14, height: 14, borderRadius: "50%",
                border: `1px solid ${V3_PALETTE.ink}`,
                background: person === p ? V3_PALETTE.ink : "transparent",
                position: "relative",
              }} />
              <input type="radio" name="person-v3" checked={person === p} onChange={() => setPerson(p)} style={{ display: "none" }} />
              <span style={{ fontStyle: "italic" }}>{p === "you" ? "Self" : "Tanner"}</span>
            </label>
          ))}
        </div>
        <input
          type="number"
          inputMode="numeric"
          placeholder="meters"
          value={meters}
          onChange={e => setMeters(e.target.value)}
          style={{
            background: "transparent", border: 0, borderBottom: `1px solid ${V3_PALETTE.ink}`,
            padding: "4px 0", fontFamily: "Spectral, serif", fontSize: 18, color: V3_PALETTE.ink, outline: "none",
          }}
        />
        <button
          type="submit"
          style={{
            background: V3_PALETTE.accent, color: V3_PALETTE.paper, border: 0,
            padding: "10px 18px", fontFamily: "Spectral, serif", fontSize: 13, letterSpacing: ".12em", textTransform: "uppercase", cursor: "pointer",
          }}
        >Record</button>
      </div>
      <input
        type="text"
        placeholder="a line about the row… (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{
          background: "transparent", border: 0, borderBottom: `1px dotted ${V3_PALETTE.rule}`,
          padding: "6px 0", fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 14, color: V3_PALETTE.inkSoft, outline: "none",
        }}
      />
    </form>
  );
}

function V3({ data }) {
  // Group sessions by date
  const sortedDesc = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));
  const byDate = [];
  for (const s of sortedDesc) {
    let bucket = byDate.find(b => b.date === s.date);
    if (!bucket) { bucket = { date: s.date, sessions: [] }; byDate.push(bucket); }
    bucket.sessions.push(s);
  }
  const recent = byDate.slice(0, 5);

  return (
    <div style={{
      width: "100%", height: "100%", background: V3_PALETTE.paper, color: V3_PALETTE.ink,
      fontFamily: "Spectral, serif", display: "grid", gridTemplateColumns: "1fr 380px",
    }}>
      {/* Left — narrative */}
      <div style={{ padding: "48px 56px 40px", display: "flex", flexDirection: "column", gap: 32, minWidth: 0 }}>
        {/* Masthead */}
        <header style={{ borderBottom: `2px solid ${V3_PALETTE.ink}`, paddingBottom: 14 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 13, color: V3_PALETTE.inkSoft }}>
              Volume I · No. 1
            </div>
            <div style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 13, color: V3_PALETTE.inkSoft }}>
              {fmtDateLong(new Date())}
            </div>
          </div>
          <h1 style={{ margin: "6px 0 0", fontSize: 56, fontWeight: 500, letterSpacing: "-0.02em", lineHeight: 1.02 }}>
            The long row <span style={{ fontStyle: "italic", fontWeight: 400 }}>south</span>.
          </h1>
          <div style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 15, color: V3_PALETTE.inkSoft, marginTop: 8 }}>
            Sherwood to Berkeley, by erg. A shared crossing, kept by two rowers.
          </div>
        </header>

        {/* Strip */}
        <div>
          <V3Strip data={data} />
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 12, color: V3_PALETTE.inkSoft, marginTop: 4 }}>
            <span><span style={{ display: "inline-block", width: 10, height: 2, background: V3_PALETTE.ink, verticalAlign: "middle", marginRight: 6 }} />self · {(data.totals.you / 1000).toFixed(1)} km</span>
            <span>Tanner · {(data.totals.tanner / 1000).toFixed(1)} km <span style={{ display: "inline-block", width: 10, height: 2, background: V3_PALETTE.accent, verticalAlign: "middle", marginLeft: 6 }} /></span>
          </div>
        </div>

        {/* Entries */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18, minHeight: 0 }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: V3_PALETTE.inkSoft, borderBottom: `1px solid ${V3_PALETTE.rule}`, paddingBottom: 6 }}>
            Recent entries
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
            {recent.map(b => (
              <article key={b.date} style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 24 }}>
                <div style={{ paddingTop: 2 }}>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 13, fontStyle: "italic", color: V3_PALETTE.inkSoft }}>
                    {new Date(b.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}
                  </div>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 22, fontWeight: 500, lineHeight: 1, marginTop: 2 }}>
                    {new Date(b.date + "T12:00:00").toLocaleDateString(undefined, { day: "numeric" })}
                  </div>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 11, letterSpacing: ".18em", textTransform: "uppercase", color: V3_PALETTE.inkSoft, marginTop: 2 }}>
                    {new Date(b.date + "T12:00:00").toLocaleDateString(undefined, { month: "long" })}
                  </div>
                </div>
                <div>
                  {b.sessions.map(s => (
                    <div key={s.id} style={{ marginBottom: 6 }}>
                      <span style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 15, color: V3_PALETTE.ink }}>
                        {s.person === "you" ? "Self" : "Tanner"}
                      </span>
                      <span style={{ fontFamily: "Spectral, serif", fontSize: 15, color: V3_PALETTE.ink }}>
                        {" "}pulled{" "}
                        <span style={{ fontWeight: 600 }}>{s.meters.toLocaleString()} meters</span>
                      </span>
                      {s.note && (
                        <span style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 15, color: V3_PALETTE.inkSoft }}>
                          {" — "}{s.note}
                        </span>
                      )}
                      <span style={{ fontFamily: "Spectral, serif", fontSize: 15 }}>.</span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>

      {/* Right — quiet sidebar */}
      <aside style={{ background: V3_PALETTE.paperDeep, padding: "48px 36px 40px", display: "flex", flexDirection: "column", gap: 26, borderLeft: `1px solid ${V3_PALETTE.rule}` }}>
        {/* Headline number */}
        <div>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: V3_PALETTE.inkSoft }}>Distance covered</div>
          <div style={{ fontSize: 64, fontWeight: 500, letterSpacing: "-0.03em", lineHeight: 1, marginTop: 4 }}>
            {(data.totals.combined / 1000).toFixed(0)}
            <span style={{ fontSize: 22, fontStyle: "italic", color: V3_PALETTE.inkSoft, marginLeft: 6 }}>km</span>
          </div>
          <div style={{ fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 15, color: V3_PALETTE.inkSoft, marginTop: 4 }}>
            of one thousand, or <span style={{ color: V3_PALETTE.accent }}>{(data.progress * 100).toFixed(1)}%</span> the journey.
          </div>
        </div>

        {/* Currently */}
        <div style={{ borderTop: `1px solid ${V3_PALETTE.rule}`, paddingTop: 18 }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: V3_PALETTE.inkSoft }}>Currently</div>
          <div style={{ fontSize: 22, fontStyle: "italic", marginTop: 4 }}>
            past {data.currentLandmark.last.name}
          </div>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 14, color: V3_PALETTE.inkSoft, marginTop: 4 }}>
            {fmtMeters(Math.max(0, data.currentLandmark.next.at - data.totals.combined))} until {data.currentLandmark.next.name}.
          </div>
        </div>

        {/* ETA */}
        <div style={{ borderTop: `1px solid ${V3_PALETTE.rule}`, paddingTop: 18 }}>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 11, letterSpacing: ".22em", textTransform: "uppercase", color: V3_PALETTE.inkSoft }}>Arriving</div>
          <div style={{ fontSize: 22, fontStyle: "italic", marginTop: 4 }}>
            {data.eta ? fmtDateLong(data.eta.arrival) : "—"}
          </div>
          <div style={{ fontFamily: "Spectral, serif", fontSize: 14, color: V3_PALETTE.inkSoft, marginTop: 4 }}>
            at the present pace of {data.eta ? Math.round(data.eta.metersPerDay).toLocaleString() : "—"} m/day.
          </div>
        </div>

        {/* Form */}
        <V3LogForm data={data} />
      </aside>
    </div>
  );
}

window.V3 = V3;
