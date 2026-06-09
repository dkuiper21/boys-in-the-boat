// app-log.jsx — Captain's logbook panel.
// Header stats, scrollable session log grouped by date, log entry form.

function LogStat({ label, value, sub, large }) {
  return (
    <div>
      <div style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 9,
        letterSpacing: ".22em", textTransform: "uppercase",
        color: CHART_PALETTE.inkSoft,
      }}>{label}</div>
      <div style={{
        fontFamily: "Spectral, serif",
        fontSize: large ? 36 : 22,
        fontWeight: large ? 600 : 500,
        letterSpacing: "-0.01em",
        marginTop: 2,
        color: CHART_PALETTE.ink,
        lineHeight: 1.05,
      }}>{value}</div>
      {sub && (
        <div style={{
          fontFamily: "Spectral, serif", fontStyle: "italic",
          fontSize: 12, color: CHART_PALETTE.inkSoft, marginTop: 2,
        }}>{sub}</div>
      )}
    </div>
  );
}

function ProgressMeter({ data }) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span style={{
          fontFamily: "Spectral, serif", fontSize: 56, fontWeight: 600,
          letterSpacing: "-0.03em", lineHeight: 1, color: CHART_PALETTE.ink,
        }}>{(data.totals.combined / 1000).toFixed(1)}</span>
        <span style={{
          fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 18,
          color: CHART_PALETTE.inkSoft,
        }}>of 1,000 km</span>
        <span style={{
          marginLeft: "auto",
          fontFamily: "JetBrains Mono, monospace", fontSize: 13,
          color: data.met ? CHART_PALETTE.redInk : CHART_PALETTE.redInk,
          fontWeight: 700,
        }}>{(data.progress * 100).toFixed(1)}%</span>
      </div>
      {/* meter — self fills from left, Tanner fills from right, gap in middle */}
      <div style={{
        marginTop: 10, height: 10, position: "relative",
        background: CHART_PALETTE.paperDeep,
        border: `1px solid ${CHART_PALETTE.ink}`,
      }}>
        <div style={{
          position: "absolute", top: 0, bottom: 0, left: 0,
          width: `${(data.yourPosition / data.totalMeters) * 100}%`,
          background: CHART_PALETTE.redInk,
        }} />
        <div style={{
          position: "absolute", top: 0, bottom: 0, right: 0,
          width: `${(data.totals.tanner / data.totalMeters) * 100}%`,
          background: CHART_PALETTE.brass,
        }} />
      </div>
      <div style={{
        display: "flex", justifyContent: "space-between", marginTop: 6,
        fontFamily: "JetBrains Mono, monospace", fontSize: 9,
        letterSpacing: ".18em", color: CHART_PALETTE.inkSoft,
      }}>
        <span>SHERWOOD, OR</span>
        <span>BERKELEY, CA</span>
      </div>
      {/* legend */}
      <div style={{
        display: "flex", gap: 18, marginTop: 10,
        fontFamily: "Spectral, serif", fontSize: 12,
        color: CHART_PALETTE.ink,
      }}>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ display: "inline-block", width: 14, height: 8, background: CHART_PALETTE.redInk }} />
          <span style={{ fontStyle: "italic" }}>Daniel → {(data.totals.you / 1000).toFixed(1)} km</span>
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{ fontStyle: "italic" }}>{(data.totals.tanner / 1000).toFixed(1)} km ← Tanner</span>
          <span style={{ display: "inline-block", width: 14, height: 8, background: CHART_PALETTE.brass }} />
        </span>
      </div>
    </div>
  );
}

function CurrentBearing({ data }) {
  const youRemaining = Math.max(0, data.yourLandmark.nextAhead.at - data.yourPosition);
  const tannerRemaining = Math.max(0, data.tannerPosition - data.tannerLandmark.nextAhead.at);

  return (
    <div style={{
      borderTop: `1px solid ${CHART_PALETTE.ink}`,
      borderBottom: `1px solid ${CHART_PALETTE.ink}`,
      padding: "14px 0", display: "grid", gap: 14,
    }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
        <div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 9,
            letterSpacing: ".22em", textTransform: "uppercase", color: CHART_PALETTE.inkSoft,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 8, height: 8, background: CHART_PALETTE.redInk, display: "inline-block" }} />
            Daniel · S↓
          </div>
          <div style={{
            fontFamily: "Spectral, serif", fontSize: 17, fontStyle: "italic",
            color: CHART_PALETTE.ink, marginTop: 4, lineHeight: 1.2,
          }}>past {data.yourLandmark.justPassed.name}</div>
          <div style={{
            fontFamily: "Spectral, serif", fontSize: 13,
            color: CHART_PALETTE.inkSoft, marginTop: 2,
          }}>
            {(youRemaining / 1000).toFixed(1)} km to {data.yourLandmark.nextAhead.name}
          </div>
        </div>
        <div>
          <div style={{
            fontFamily: "JetBrains Mono, monospace", fontSize: 9,
            letterSpacing: ".22em", textTransform: "uppercase", color: CHART_PALETTE.inkSoft,
            display: "flex", alignItems: "center", gap: 6,
          }}>
            <span style={{ width: 8, height: 8, background: CHART_PALETTE.brass, display: "inline-block" }} />
            Tanner · N↑
          </div>
          <div style={{
            fontFamily: "Spectral, serif", fontSize: 17, fontStyle: "italic",
            color: CHART_PALETTE.ink, marginTop: 4, lineHeight: 1.2,
          }}>past {data.tannerLandmark.justPassed.name}</div>
          <div style={{
            fontFamily: "Spectral, serif", fontSize: 13,
            color: CHART_PALETTE.inkSoft, marginTop: 2,
          }}>
            {(tannerRemaining / 1000).toFixed(1)} km to {data.tannerLandmark.nextAhead.name}
          </div>
        </div>
      </div>

      {/* Gap / meeting */}
      <div style={{
        background: CHART_PALETTE.paperDeep,
        border: `1px solid ${CHART_PALETTE.ink}`,
        padding: "10px 12px",
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
      }}>
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9,
          letterSpacing: ".22em", textTransform: "uppercase", color: CHART_PALETTE.inkSoft,
        }}>{data.met ? "Met!" : "Distance between"}</span>
        <span style={{
          fontFamily: "Spectral, serif",
          fontSize: data.met ? 17 : 20, fontWeight: 600,
          color: data.met ? CHART_PALETTE.redInk : CHART_PALETTE.ink,
          fontStyle: data.met ? "italic" : "normal",
        }}>
          {data.met ? "the row is complete" : `${(data.gap / 1000).toFixed(1)} km`}
        </span>
      </div>

      {/* ETA */}
      <div>
        <div style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9,
          letterSpacing: ".22em", textTransform: "uppercase", color: CHART_PALETTE.inkSoft,
        }}>Projected meeting</div>
        <div style={{
          fontFamily: "Spectral, serif", fontSize: 18, fontStyle: "italic",
          color: CHART_PALETTE.ink, marginTop: 2,
        }}>
          {data.eta ? fmtDateLong(data.eta.arrival) : "—"}
        </div>
        <div style={{
          fontFamily: "Spectral, serif", fontSize: 13,
          color: CHART_PALETTE.inkSoft, marginTop: 2,
        }}>
          at the combined pace of {data.eta ? Math.round(data.eta.metersPerDay).toLocaleString() : "—"} m/day
        </div>
      </div>
    </div>
  );
}

function LogEntry({ session, onDelete }) {
  const isYou = session.person === "you";
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "70px 1fr auto",
        gap: 12, padding: "10px 0",
        borderBottom: `1px dotted ${CHART_PALETTE.ink}40`,
        alignItems: "baseline",
      }}
      className="log-entry"
    >
      <span style={{
        fontFamily: "JetBrains Mono, monospace", fontSize: 10,
        color: CHART_PALETTE.inkSoft, letterSpacing: ".06em",
      }}>{fmtDate(session.date)}</span>
      <span style={{ fontFamily: "Spectral, serif", fontSize: 13, color: CHART_PALETTE.ink }}>
        <span style={{ fontStyle: "italic" }}>
          {isYou ? "Daniel" : "Tanner"}
        </span>
        {session.note && (
          <span style={{ fontStyle: "italic", color: CHART_PALETTE.inkSoft }}> — {session.note}</span>
        )}
      </span>
      <span style={{
        display: "flex", alignItems: "center", gap: 8,
      }}>
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 12,
          fontWeight: 700,
          color: isYou ? CHART_PALETTE.ink : CHART_PALETTE.redInk,
        }}>{session.meters.toLocaleString()}m</span>
        <button
          onClick={() => onDelete(session.id)}
          className="log-entry-del"
          style={{
            background: "transparent", border: "none",
            color: CHART_PALETTE.inkSoft, opacity: 0, cursor: "pointer",
            fontFamily: "JetBrains Mono, monospace", fontSize: 12,
            padding: 0, transition: "opacity .15s",
          }}
          aria-label="Delete entry"
        >×</button>
      </span>
    </div>
  );
}

function LogForm({ data }) {
  const [meters, setMeters] = React.useState("");
  const [note, setNote] = React.useState("");
  const inputRef = React.useRef(null);

  const person = data.identity;
  const isYou = person === "you";

  const submit = (e) => {
    e.preventDefault();
    const m = parseInt(meters, 10);
    if (!m || m <= 0) return;
    data.addSession({ person, meters: m, note });
    setMeters(""); setNote("");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={submit} style={{
      display: "grid", gap: 10,
      padding: "16px 28px 24px",
      background: CHART_PALETTE.paperDeep,
      borderTop: `1px solid ${CHART_PALETTE.ink}`,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        fontFamily: "Spectral, serif", fontStyle: "italic",
        fontSize: 14, color: CHART_PALETTE.ink,
      }}>
        <span>Enter in the log…</span>
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9, fontStyle: "normal",
          letterSpacing: ".22em", textTransform: "uppercase",
          color: CHART_PALETTE.inkSoft,
          display: "flex", alignItems: "center", gap: 6,
        }}>
          <span style={{
            width: 8, height: 8, display: "inline-block",
            background: isYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass,
          }} />
          Logging as {isYou ? "Daniel" : "Tanner"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 10, alignItems: "center" }}>
        <input
          ref={inputRef}
          type="number"
          inputMode="numeric"
          placeholder="meters"
          value={meters}
          onChange={e => setMeters(e.target.value)}
          style={{
            background: "transparent", border: 0,
            borderBottom: `1px solid ${CHART_PALETTE.ink}`,
            padding: "6px 0",
            fontFamily: "Spectral, serif", fontSize: 18,
            color: CHART_PALETTE.ink, outline: "none",
            minWidth: 0, width: "100%",
          }}
        />
        <button
          type="submit"
          style={{
            background: isYou ? CHART_PALETTE.redInk : CHART_PALETTE.brass,
            color: CHART_PALETTE.paper,
            border: 0, padding: "10px 16px",
            fontFamily: "Spectral, serif", fontSize: 12,
            letterSpacing: ".15em", textTransform: "uppercase",
            cursor: "pointer",
          }}
        >Record →</button>
      </div>
      <input
        type="text"
        placeholder="a note for the log… (optional)"
        value={note}
        onChange={e => setNote(e.target.value)}
        style={{
          background: "transparent", border: 0,
          borderBottom: `1px dotted ${CHART_PALETTE.ink}50`,
          padding: "5px 0",
          fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 13,
          color: CHART_PALETTE.ink, outline: "none",
        }}
      />
    </form>
  );
}

function Logbook({ data }) {
  const sortedDesc = [...data.sessions].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <div style={{
      display: "grid", gridTemplateRows: "auto auto 1fr auto",
      height: "100%", background: CHART_PALETTE.paper,
      borderLeft: `1px solid ${CHART_PALETTE.ink}`,
      minHeight: 0,
    }}>
      {/* Stats header */}
      <div style={{
        padding: "26px 28px 22px",
        display: "flex", flexDirection: "column", gap: 22,
        borderBottom: `1px solid ${CHART_PALETTE.ink}`,
        background: CHART_PALETTE.paper,
      }}>
        {/* Top brand strip */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontFamily: "JetBrains Mono, monospace", fontSize: 9,
          letterSpacing: ".22em", textTransform: "uppercase",
          color: CHART_PALETTE.inkSoft,
        }}>
          <span>Captain's Log</span>
          <span>Vol. I · MMXXVI</span>
        </div>
        <ProgressMeter data={data} />
        <CurrentBearing data={data} />
      </div>

      {/* Log section header */}
      <div style={{
        padding: "16px 28px 8px",
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        background: CHART_PALETTE.paper,
      }}>
        <span style={{
          fontFamily: "JetBrains Mono, monospace", fontSize: 9,
          letterSpacing: ".22em", textTransform: "uppercase",
          color: CHART_PALETTE.inkSoft,
        }}>Entries · {data.sessions.length}</span>
        <span style={{
          fontFamily: "Spectral, serif", fontStyle: "italic", fontSize: 12,
          color: CHART_PALETTE.inkSoft,
        }}>most recent first</span>
      </div>

      {/* Scrollable log */}
      <div style={{
        overflowY: "auto", padding: "0 28px 12px", minHeight: 0,
      }}>
        {sortedDesc.map(s => (
          <LogEntry key={s.id} session={s} onDelete={data.removeSession} />
        ))}
      </div>

      {/* Form pinned bottom */}
      <LogForm data={data} />
    </div>
  );
}

Object.assign(window, { Logbook });
