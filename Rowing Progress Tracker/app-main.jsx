// app-main.jsx — wires the chart + logbook into a full-viewport layout.
// Adds identity picker on first load and a loading state while Firestore connects.

function IdentityPicker({ onPick }) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      background: CHART_PALETTE.paperDeep,
      display: "flex", justifyContent: "center", alignItems: "center",
      fontFamily: "Spectral, serif",
      padding: 24,
    }}>
      <div style={{
        background: CHART_PALETTE.paper,
        border: `1px solid ${CHART_PALETTE.ink}`,
        boxShadow: "0 12px 30px rgba(20,15,5,0.18)",
        padding: "40px 44px",
        maxWidth: 520, width: "100%",
      }}>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 10,
          letterSpacing: ".25em", textTransform: "uppercase",
          color: CHART_PALETTE.inkSoft,
        }}>Boys in the Boat · Captain's Log</div>
        <h1 style={{
          fontFamily: "Spectral, serif", fontSize: 36, fontWeight: 500,
          letterSpacing: "-0.02em", marginTop: 8, marginBottom: 4,
          color: CHART_PALETTE.ink, lineHeight: 1.1,
        }}>Who are you?</h1>
        <p style={{
          fontFamily: "Spectral, serif", fontStyle: "italic",
          fontSize: 15, color: CHART_PALETTE.inkSoft, marginTop: 0,
        }}>
          Pick once — this device will remember.
        </p>
        <div style={{ display: "grid", gap: 12, marginTop: 24 }}>
          {[
            { id: "you", name: "Daniel", sub: "rowing south from Sherwood", color: CHART_PALETTE.redInk },
            { id: "tanner", name: "Tanner", sub: "rowing north from Berkeley", color: CHART_PALETTE.brass },
          ].map((opt) => (
            <button
              key={opt.id}
              onClick={() => onPick(opt.id)}
              style={{
                display: "grid", gridTemplateColumns: "auto 1fr auto",
                alignItems: "center", gap: 16,
                padding: "16px 18px",
                background: "transparent",
                border: `1px solid ${CHART_PALETTE.ink}`,
                cursor: "pointer", textAlign: "left",
                transition: "background .15s",
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = CHART_PALETTE.paperDeep}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <span style={{
                width: 16, height: 16, background: opt.color,
                display: "inline-block",
              }} />
              <span>
                <div style={{
                  fontFamily: "Spectral, serif", fontSize: 22, fontWeight: 600,
                  color: CHART_PALETTE.ink, lineHeight: 1,
                }}>{opt.name}</div>
                <div style={{
                  fontFamily: "Spectral, serif", fontStyle: "italic",
                  fontSize: 13, color: CHART_PALETTE.inkSoft, marginTop: 4,
                }}>{opt.sub}</div>
              </span>
              <span style={{
                fontFamily: "JetBrains Mono, monospace", fontSize: 11,
                color: CHART_PALETTE.inkSoft,
              }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen({ message }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: CHART_PALETTE.paperDeep,
      display: "flex", justifyContent: "center", alignItems: "center",
      fontFamily: "Spectral, serif",
    }}>
      <div style={{ textAlign: "center" }}>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 10,
          letterSpacing: ".25em", textTransform: "uppercase",
          color: CHART_PALETTE.inkSoft, marginBottom: 8,
        }}>Boys in the Boat</div>
        <div style={{
          fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 18,
          color: CHART_PALETTE.ink,
        }}>{message || "Charting the course…"}</div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div style={{
      position: "fixed", inset: 0,
      background: CHART_PALETTE.paperDeep,
      display: "flex", justifyContent: "center", alignItems: "center",
      fontFamily: "Spectral, serif", padding: 24,
    }}>
      <div style={{
        background: CHART_PALETTE.paper,
        border: `1px solid ${CHART_PALETTE.redInk}`,
        padding: "28px 32px", maxWidth: 460,
      }}>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 10,
          letterSpacing: ".25em", textTransform: "uppercase",
          color: CHART_PALETTE.redInk,
        }}>Couldn't load</div>
        <div style={{
          fontFamily: "Spectral, serif", fontSize: 16,
          color: CHART_PALETTE.ink, marginTop: 8, lineHeight: 1.45,
        }}>{message}</div>
      </div>
    </div>
  );
}

function useIsMobile() {
  const [mobile, setMobile] = React.useState(() => window.innerWidth < 768);
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth < 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
}

// Phone map: opens zoomed to the stretch between the two boats. Drag to pan,
// pinch or use the buttons to zoom, "Full route" for the whole chart.
function ZoomedChart({ data, onShowFull }) {
  const P = CHART_PALETTE;
  const svgRef = React.useRef(null);
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const gesture = React.useRef({ pointers: new Map(), moved: false, startDist: 0, startZoom: 1 });

  // Base view: the gap between the boats (and the meeting point), padded.
  const base = React.useMemo(() => {
    const b = routeBounds(
      Math.min(data.yourPosition, data.tannerPosition),
      Math.max(data.yourPosition, data.tannerPosition)
    );
    // Name tags hang ~125 units left of the boats; city labels run ~70 right.
    const left = b.x0 - 125, right = b.x1 + 70;
    const h = Math.max(320, b.y1 - b.y0 + 260, (right - left) / 0.5);
    // Sit the gap a little above centre so the summary card doesn't cover it.
    return { cx: (left + right) / 2, cy: (b.y0 + b.y1) / 2 + 50, h };
  }, [data.yourPosition, data.tannerPosition]);

  const h = Math.min(1200, base.h / zoom);
  const w = Math.max(280, h * 0.62);
  const cx = Math.max(w / 2, Math.min(600 - w / 2, base.cx + pan.x));
  const cy = Math.max(h / 2, Math.min(1200 - h / 2, base.cy + pan.y));
  const view = { x: cx - w / 2, y: cy - h / 2, w, h };

  // Screen pixels per chart unit (the chart covers the box, "slice").
  const pxPerUnit = () => {
    const r = svgRef.current.getBoundingClientRect();
    return Math.max(r.width / view.w, r.height / view.h);
  };
  const clampZoom = (z) => Math.max(base.h / 1200, Math.min(4, z));

  const onPointerDown = (e) => {
    const g = gesture.current;
    g.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (g.pointers.size === 1) g.moved = false;
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      g.startDist = Math.hypot(a.x - b.x, a.y - b.y);
      g.startZoom = zoom;
    }
  };
  const onPointerMove = (e) => {
    const g = gesture.current;
    const prev = g.pointers.get(e.pointerId);
    if (!prev) return;
    const next = { x: e.clientX, y: e.clientY };
    g.pointers.set(e.pointerId, next);
    if (g.pointers.size === 2) {
      const [a, b] = [...g.pointers.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      if (g.startDist > 0) setZoom(clampZoom(g.startZoom * dist / g.startDist));
      g.moved = true;
    } else {
      const dx = next.x - prev.x, dy = next.y - prev.y;
      if (Math.abs(dx) + Math.abs(dy) > 0) {
        if (!g.moved && Math.hypot(dx, dy) < 3) return;
        g.moved = true;
        const k = pxPerUnit();
        // Clamp so dragging past the chart's edge doesn't build up hidden offset.
        setPan((p) => ({
          x: Math.max(w / 2 - base.cx, Math.min(600 - w / 2 - base.cx, p.x - dx / k)),
          y: Math.max(h / 2 - base.cy, Math.min(1200 - h / 2 - base.cy, p.y - dy / k)),
        }));
      }
    }
  };
  const onPointerUp = (e) => { gesture.current.pointers.delete(e.pointerId); };
  // A drag shouldn't also count as a tap on a tick or city.
  const onClickCapture = (e) => {
    if (gesture.current.moved) { e.stopPropagation(); gesture.current.moved = false; }
  };

  const reset = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const iconBtn = {
    width: 44, height: 44, display: "flex", alignItems: "center", justifyContent: "center",
    background: P.paper, border: `1px solid ${P.ink}`, color: P.ink, padding: 0, cursor: "pointer",
  };
  const textBtn = {
    height: 44, padding: "0 12px", background: P.paper, color: P.ink,
    border: `1px solid ${P.ink}`, fontFamily: "JetBrains Mono, monospace", fontSize: 10,
    letterSpacing: ".16em", textTransform: "uppercase", cursor: "pointer",
  };
  const label = {
    fontFamily: "JetBrains Mono, monospace", fontSize: 9, letterSpacing: ".22em",
    textTransform: "uppercase", color: P.inkSoft,
  };

  return (
    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <Chart
        ref={svgRef}
        data={data}
        view={view}
        style={{ width: "100%", height: "100%", display: "block", touchAction: "none" }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onClickCapture={onClickCapture}
      />

      <div style={{ position: "absolute", top: 12, left: 12, display: "flex", flexDirection: "column", gap: 6 }}>
        <button type="button" aria-label="Zoom in" style={iconBtn} onClick={() => setZoom((z) => clampZoom(z * 1.5))}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={P.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
        </button>
        <button type="button" aria-label="Zoom out" style={iconBtn} onClick={() => setZoom((z) => clampZoom(z / 1.5))}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={P.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M2 8h12" /></svg>
        </button>
      </div>

      <div style={{ position: "absolute", top: 62, right: 12, display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end" }}>
        <button type="button" style={textBtn} onClick={onShowFull}>Full route</button>
        {(zoom !== 1 || pan.x !== 0 || pan.y !== 0) && (
          <button type="button" style={textBtn} onClick={reset}>Recenter</button>
        )}
      </div>

      {!data.met && (
        <div style={{
          position: "absolute", left: 12, right: 12, bottom: 12,
          background: P.paper, border: `1px solid ${P.ink}`,
          boxShadow: "0 6px 16px rgba(20,15,5,0.2)",
          padding: "12px 16px", display: "flex", alignItems: "center", gap: 14,
          pointerEvents: "none",
        }}>
          <div style={{ flex: 1 }}>
            <div style={label}>Still to row</div>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 26, fontWeight: 600, lineHeight: 1.05, color: P.ink }}>
              {(data.gap / 1000).toFixed(1)} km
            </div>
          </div>
          <div style={{ width: 1, alignSelf: "stretch", background: P.ink, opacity: 0.3 }} />
          <div style={{ flex: 1 }}>
            <div style={label}>Projected meeting</div>
            <div style={{ fontFamily: "Spectral, serif", fontSize: 15, fontStyle: "italic", lineHeight: 1.25, color: P.ink }}>
              near {data.meeting.near.name}
              {data.eta && <><br />{data.eta.arrival.toLocaleDateString(undefined, { month: "long", year: "numeric" })}</>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MobileApp({ data }) {
  const [tab, setTab] = React.useState("chart");
  const [mapMode, setMapMode] = React.useState("gap");
  const isYou = data.identity === "you";
  const identityColor = isYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass;

  const switchIdentity = () => {
    if (confirm("Switch user on this device?")) data.setIdentity(null);
  };

  return (
    <div className="app-fill" style={{
      display: "flex", flexDirection: "column",
      background: CHART_PALETTE.paperDeep, overflow: "hidden",
    }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {tab === "chart" && mapMode === "gap" && (
          <div style={{ position: "absolute", inset: 0, background: CHART_PALETTE.paper }}>
            <ZoomedChart data={data} onShowFull={() => setMapMode("full")} />
            <button
              onClick={switchIdentity}
              style={{
                position: "absolute", top: 12, right: 12,
                background: CHART_PALETTE.paper,
                border: `1px solid ${CHART_PALETTE.ink}`,
                color: CHART_PALETTE.ink,
                height: 44, padding: "0 12px",
                fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                letterSpacing: ".18em", textTransform: "uppercase",
                cursor: "pointer", zIndex: 10,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, background: identityColor, display: "inline-block" }} />
              {isYou ? "Daniel" : "Tanner"}
              <span style={{ opacity: 0.5 }}>switch</span>
            </button>
          </div>
        )}
        {tab === "chart" && mapMode === "full" && (
          <div style={{
            position: "absolute", inset: 0,
            background: "#bca57a",
            backgroundImage:
              "repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0 1px,transparent 1px 80px)," +
              "repeating-linear-gradient(0deg,rgba(0,0,0,0.04) 0 1px,transparent 1px 80px)",
            overflowY: "auto", WebkitOverflowScrolling: "touch",
            display: "flex", justifyContent: "center", paddingBottom: 16,
          }}>
            <div style={{ width: "100%", maxWidth: 520 }}>
              <Chart data={data} />
            </div>
            <button
              onClick={() => setMapMode("gap")}
              style={{
                position: "fixed", top: 12, left: 12, zIndex: 10,
                height: 44, padding: "0 12px",
                background: CHART_PALETTE.paper, color: CHART_PALETTE.ink,
                border: `1px solid ${CHART_PALETTE.ink}`,
                fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                letterSpacing: ".16em", textTransform: "uppercase", cursor: "pointer",
              }}
            >Zoom to boats</button>
            <button
              onClick={switchIdentity}
              style={{
                position: "fixed", top: 12, right: 12,
                background: CHART_PALETTE.paper,
                border: `1px solid ${CHART_PALETTE.ink}`,
                padding: "6px 12px",
                fontFamily: "JetBrains Mono, monospace", fontSize: 10,
                letterSpacing: ".18em", textTransform: "uppercase",
                cursor: "pointer", zIndex: 10,
                display: "flex", alignItems: "center", gap: 6,
              }}
            >
              <span style={{ width: 8, height: 8, background: identityColor, display: "inline-block" }} />
              {isYou ? "Daniel" : "Tanner"}
              <span style={{ opacity: 0.5 }}>switch</span>
            </button>
          </div>
        )}
        {tab === "log" && (
          <div style={{ position: "absolute", inset: 0 }}>
            <Logbook data={data} compact />
          </div>
        )}
      </div>
      <div style={{
        height: 56, display: "flex",
        background: CHART_PALETTE.paper,
        borderTop: `1px solid ${CHART_PALETTE.ink}`,
        flexShrink: 0,
      }}>
        {[
          { id: "chart", label: "Chart", icon: "◈" },
          { id: "log",   label: "Log",   icon: "≡" },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              flex: 1, border: 0, background: "transparent",
              borderBottom: tab === t.id ? `2px solid ${CHART_PALETTE.ink}` : "2px solid transparent",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, cursor: "pointer",
              color: tab === t.id ? CHART_PALETTE.ink : CHART_PALETTE.inkSoft,
            }}
          >
            <span style={{ fontSize: 18, lineHeight: 1 }}>{t.icon}</span>
            <span style={{
              fontFamily: "JetBrains Mono, monospace", fontSize: 9,
              letterSpacing: ".18em", textTransform: "uppercase",
            }}>{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NauticalApp() {
  const data = useRowingData();
  const isMobile = useIsMobile();

  if (!data.identity) return <IdentityPicker onPick={data.setIdentity} />;
  if (!data.ready) return <LoadingScreen />;
  if (data.error) return <ErrorScreen message={data.error} />;
  if (isMobile) return <MobileApp data={data} />;

  const switchIdentity = () => {
    if (confirm("Switch user on this device?")) data.setIdentity(null);
  };

  return (
    <div data-screen-label="Crossing · main" className="app-fill" style={{
      display: "grid", gridTemplateColumns: "minmax(0, 1fr) 460px",
      background: CHART_PALETTE.paperDeep,
      fontFamily: "Spectral, serif",
      overflow: "hidden",
    }}>
      {/* Chart panel — chart sits on a navigation table */}
      <div style={{
        position: "relative", minWidth: 0, minHeight: 0,
        background: "#bca57a",
        backgroundImage:
          "repeating-linear-gradient(90deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 80px)," +
          "repeating-linear-gradient(0deg, rgba(0,0,0,0.04) 0 1px, transparent 1px 80px)",
        display: "flex", justifyContent: "center", alignItems: "stretch",
        padding: "24px 28px",
        overflow: "hidden",
      }}>
        <Chart data={data} />

        {/* Identity chip */}
        <button
          onClick={switchIdentity}
          style={{
            position: "absolute", top: 16, right: 16,
            background: CHART_PALETTE.paper,
            border: `1px solid ${CHART_PALETTE.ink}`,
            color: CHART_PALETTE.ink,
            padding: "6px 12px",
            fontFamily: "JetBrains Mono, monospace", fontSize: 9,
            letterSpacing: ".18em", textTransform: "uppercase",
            cursor: "pointer",
            zIndex: 2,
            display: "flex", alignItems: "center", gap: 6,
          }}
        >
          <span style={{
            width: 8, height: 8, display: "inline-block",
            background: data.identity === "you" ? CHART_PALETTE.redInk : CHART_PALETTE.brass,
          }} />
          {data.identity === "you" ? "Daniel" : "Tanner"}
          <span style={{ opacity: 0.5, marginLeft: 4 }}>switch</span>
        </button>

        {/* Marginalia on the chart "table" */}
        <div style={{
          position: "absolute", left: 22, top: 0, bottom: 0,
          width: 80, display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "44px 0",
          pointerEvents: "none",
        }}>
          <div style={{
            writingMode: "vertical-rl", transform: "rotate(180deg)",
            fontFamily: "Spectral, serif", fontStyle: "italic",
            fontSize: 13, letterSpacing: ".4em", textTransform: "uppercase",
            color: "rgba(27,43,58,0.55)",
          }}>Pacific Ocean</div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 9,
            letterSpacing: ".18em", color: "rgba(27,43,58,0.5)",
            textAlign: "center", lineHeight: 1.6,
          }}>
            HEIGHTS<br />IN<br />FEET
          </div>
        </div>
      </div>

      {/* Logbook */}
      <Logbook data={data} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NauticalApp />);
