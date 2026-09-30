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

// Phone map: opens zoomed to the stretch between the two boats, centred in
// the space between the top bar and the summary strip. Drag to pan, pinch or
// use the zoom buttons (in the strip below the map) to zoom.
// Zoom and pan live in MobileApp so the controls outside the map can drive them.
function ZoomedChart({ data, zoom, setZoom, pan, setPan }) {
  const svgRef = React.useRef(null);
  const boxRef = React.useRef(null);
  const [box, setBox] = React.useState(null);
  const gesture = React.useRef({ pointers: new Map(), moved: false, startDist: 0, startZoom: 1 });

  // Track the map area's size so the view matches its shape exactly.
  React.useLayoutEffect(() => {
    const el = boxRef.current;
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Base view: the gap between the boats, including the boats' name tags
  // (~125 units to the left) and city labels (~70 to the right), centred.
  const base = React.useMemo(() => {
    const b = routeBounds(
      Math.min(data.yourPosition, data.tannerPosition),
      Math.max(data.yourPosition, data.tannerPosition)
    );
    const left = b.x0 - 125, right = b.x1 + 70, top = b.y0 - 60, bottom = b.y1 + 60;
    return { cx: (left + right) / 2, cy: (top + bottom) / 2, w: right - left, h: Math.max(300, bottom - top) };
  }, [data.yourPosition, data.tannerPosition]);

  const aspect = box && box.h > 0 ? box.w / box.h : 0.6;
  // Fit the base box to the area's shape, then apply the zoom.
  let h = Math.max(base.h, base.w / aspect) / zoom;
  let w = h * aspect;
  if (w > 600) { w = 600; h = w / aspect; }
  if (h > 1200) { h = 1200; w = h * aspect; }
  const cx = Math.max(w / 2, Math.min(600 - w / 2, base.cx + pan.x));
  const cy = Math.max(h / 2, Math.min(1200 - h / 2, base.cy + pan.y));
  const view = { x: cx - w / 2, y: cy - h / 2, w, h };

  const pxPerUnit = () => {
    const r = svgRef.current.getBoundingClientRect();
    return Math.max(r.width / view.w, r.height / view.h);
  };

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

  return (
    <div ref={boxRef} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      {box && (
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
      )}
    </div>
  );
}

const clampZoom = (z) => Math.max(0.35, Math.min(4, z));

// Shared styles for the phone bars around the map.
const BAR_MONO = {
  fontFamily: "JetBrains Mono, monospace", fontSize: 10,
  letterSpacing: ".16em", textTransform: "uppercase",
};

function IdentityChip({ data, compact }) {
  const isYou = data.identity === "you";
  const switchIdentity = () => {
    if (confirm("Switch user on this device?")) data.setIdentity(null);
  };
  return (
    <button
      type="button"
      onClick={switchIdentity}
      aria-label={`Logged in as ${isYou ? "Daniel" : "Tanner"}. Switch user`}
      style={{
        ...BAR_MONO, fontSize: compact ? 9 : 10, letterSpacing: ".18em",
        height: compact ? 28 : 40, padding: "0 12px",
        background: CHART_PALETTE.paper, color: CHART_PALETTE.ink,
        border: `1px solid ${CHART_PALETTE.ink}`, cursor: "pointer",
        display: "flex", alignItems: "center", gap: 6, flexShrink: 0,
      }}
    >
      <span style={{ width: 8, height: 8, display: "inline-block", background: isYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass }} />
      {isYou ? "Daniel" : "Tanner"}
      <span style={{ opacity: 0.5 }}>switch</span>
    </button>
  );
}

function MobileApp({ data }) {
  const P = CHART_PALETTE;
  const [tab, setTab] = React.useState("chart");
  const [mapMode, setMapMode] = React.useState("gap");
  const [zoom, setZoom] = React.useState(1);
  const [pan, setPan] = React.useState({ x: 0, y: 0 });
  const moved = zoom !== 1 || pan.x !== 0 || pan.y !== 0;

  const showBoats = () => { setMapMode("gap"); setZoom(1); setPan({ x: 0, y: 0 }); };

  const segBtn = (active) => ({
    ...BAR_MONO, height: 40, padding: "0 12px", cursor: "pointer",
    background: active ? P.ink : "transparent", color: active ? P.paper : P.ink,
    border: 0,
  });
  const iconBtn = {
    width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
    background: P.paper, border: `1px solid ${P.ink}`, color: P.ink, padding: 0, cursor: "pointer", flexShrink: 0,
  };
  const label = { ...BAR_MONO, fontSize: 9, letterSpacing: ".22em", color: P.inkSoft };
  const eta = data.eta ? data.eta.arrival.toLocaleDateString(undefined, { month: "short", year: "numeric" }) : null;

  return (
    <div className="app-fill" style={{
      display: "flex", flexDirection: "column",
      background: P.paperDeep, overflow: "hidden",
    }}>
      {tab === "chart" && (
        <>
          {/* top bar: who's logged in, and which view of the map */}
          <div style={{
            flexShrink: 0, height: 56, padding: "0 12px",
            display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
            background: P.paper, borderBottom: `1px solid ${P.ink}`,
          }}>
            <IdentityChip data={data} />
            <div role="group" aria-label="Map view" style={{ display: "flex", border: `1px solid ${P.ink}` }}>
              <button type="button" style={segBtn(mapMode === "gap" && !moved)} onClick={showBoats}
                aria-pressed={mapMode === "gap"}>{mapMode === "gap" && moved ? "Recenter" : "Boats"}</button>
              <button type="button" style={{ ...segBtn(mapMode === "full"), borderLeft: `1px solid ${P.ink}` }}
                onClick={() => setMapMode("full")} aria-pressed={mapMode === "full"}>Full route</button>
            </div>
          </div>

          {/* the map, centred in the space between the bars */}
          <div style={{
            flex: 1, minHeight: 0, position: "relative", overflow: "hidden",
            background: "#bca57a",
            backgroundImage:
              "repeating-linear-gradient(90deg,rgba(0,0,0,0.04) 0 1px,transparent 1px 80px)," +
              "repeating-linear-gradient(0deg,rgba(0,0,0,0.04) 0 1px,transparent 1px 80px)",
          }}>
            {mapMode === "gap" ? (
              <ZoomedChart data={data} zoom={zoom} setZoom={setZoom} pan={pan} setPan={setPan} />
            ) : (
              <div style={{ position: "absolute", inset: 0, padding: 10, display: "flex", justifyContent: "center", alignItems: "center" }}>
                <Chart data={data} />
              </div>
            )}
          </div>

          {/* summary strip + zoom controls, below the map */}
          <div style={{
            flexShrink: 0, padding: "8px 12px", minHeight: 60, boxSizing: "border-box",
            display: "flex", alignItems: "center", gap: 12,
            background: P.paper, borderTop: `1px solid ${P.ink}`,
          }}>
            {data.met ? (
              <div style={{ flex: 1 }}>
                <div style={label}>Met</div>
                <div style={{ fontFamily: "Spectral, serif", fontSize: 17, fontStyle: "italic", color: P.redInk }}>the row is complete</div>
              </div>
            ) : (
              <>
                <div style={{ flexShrink: 0 }}>
                  <div style={label}>Still to row</div>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 22, fontWeight: 600, lineHeight: 1.1, color: P.ink }}>
                    {(data.gap / 1000).toFixed(1)} km
                  </div>
                </div>
                <div style={{ width: 1, alignSelf: "stretch", background: P.ink, opacity: 0.3 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={label}>Meeting</div>
                  <div style={{ fontFamily: "Spectral, serif", fontSize: 14, fontStyle: "italic", lineHeight: 1.25, color: P.ink }}>
                    near {data.meeting.near.name}{eta ? <><br />{eta}</> : null}
                  </div>
                </div>
              </>
            )}
            {mapMode === "gap" && (
              <div style={{ display: "flex", gap: 6 }}>
                <button type="button" aria-label="Zoom out" style={iconBtn} onClick={() => setZoom((z) => clampZoom(z / 1.5))}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={P.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M2 8h12" /></svg>
                </button>
                <button type="button" aria-label="Zoom in" style={iconBtn} onClick={() => setZoom((z) => clampZoom(z * 1.5))}>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke={P.ink} strokeWidth="1.6" strokeLinecap="round"><path d="M8 2v12M2 8h12" /></svg>
                </button>
              </div>
            )}
          </div>
        </>
      )}
      {tab === "log" && (
        <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
          <div style={{ position: "absolute", inset: 0 }}>
            <Logbook data={data} compact />
          </div>
        </div>
      )}
      <div style={{
        height: 56, display: "flex",
        background: P.paper,
        borderTop: `1px solid ${P.ink}`,
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
              borderBottom: tab === t.id ? `2px solid ${P.ink}` : "2px solid transparent",
              display: "flex", flexDirection: "column", alignItems: "center",
              justifyContent: "center", gap: 3, cursor: "pointer",
              color: tab === t.id ? P.ink : P.inkSoft,
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

        {/* the chart, centred on the table above the marginalia */}
        <div style={{ position: "relative", zIndex: 1, height: "100%", display: "flex", justifyContent: "center", minWidth: 0 }}>
          <Chart data={data} />
        </div>
      </div>

      {/* Logbook */}
      <Logbook data={data} headerRight={<IdentityChip data={data} compact />} />
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<NauticalApp />);
