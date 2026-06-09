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

function MobileApp({ data }) {
  const [tab, setTab] = React.useState("chart");
  const isYou = data.identity === "you";
  const identityColor = isYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass;

  const switchIdentity = () => {
    if (confirm("Switch user on this device?")) data.setIdentity(null);
  };

  return (
    <div style={{
      width: "100vw", height: "100vh", display: "flex", flexDirection: "column",
      background: CHART_PALETTE.paperDeep, overflow: "hidden",
    }}>
      <div style={{ flex: 1, minHeight: 0, position: "relative", overflow: "hidden" }}>
        {tab === "chart" && (
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
            <Logbook data={data} />
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
    <div data-screen-label="Crossing · main" style={{
      width: "100vw", height: "100vh",
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
            SOUNDINGS<br />IN<br />FATHOMS
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
