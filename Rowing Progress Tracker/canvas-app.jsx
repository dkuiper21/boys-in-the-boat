// canvas-app.jsx — wires the three rowing variations onto the DesignCanvas.
// Each artboard is its own working interactive app, sharing one data store.

function App() {
  // Mount one shared data hook at the top so all three artboards re-render
  // on the same state. We just call useRowingData() inside each variation;
  // they all sub to the same pub/sub so this is fine.
  const data = useRowingData();

  // Tiny reset chip floating top-right.
  return (
    <>
      <DesignCanvas>
        <DCSection
          id="rowing"
          title="Sherwood → Berkeley · rowing tracker"
          subtitle="Three directions for tracking the 1,000 km combined-effort row. Add a session in any of them — all three share data."
        >
          <DCArtboard id="v1" label="A · Nautical chart" width={1100} height={720}>
            <V1 data={data} />
          </DCArtboard>
          <DCArtboard id="v2" label="B · Sport dashboard" width={1100} height={820}>
            <V2 data={data} />
          </DCArtboard>
          <DCArtboard id="v3" label="C · Editorial journal" width={1100} height={860}>
            <V3 data={data} />
          </DCArtboard>
        </DCSection>
      </DesignCanvas>

      <button
        onClick={() => { if (confirm("Reset to placeholder data?")) data.resetData(); }}
        style={{
          position: "fixed", bottom: 16, right: 16, zIndex: 50,
          background: "#fff", border: "1px solid #d4d4d4", padding: "8px 12px",
          fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
          fontSize: 11, letterSpacing: ".05em", color: "#444",
          borderRadius: 6, cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
        }}
      >reset data</button>
    </>
  );
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
