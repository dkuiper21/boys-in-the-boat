// Shared rowing data store — Firestore-backed for real-time sync.
// Identity (who you are) lives in localStorage per-device.

const STORAGE_IDENTITY = "crossing-identity";
const TOTAL_METERS = 1_000_000;

const MILESTONES = [
  { name: "Sherwood", region: "OR", at: 0, kind: "start" },
  { name: "Salem", region: "OR", at: 60_000 },
  { name: "Eugene", region: "OR", at: 175_000 },
  { name: "Roseburg", region: "OR", at: 285_000 },
  { name: "Medford", region: "OR", at: 405_000 },
  { name: "Mt. Shasta", region: "CA", at: 510_000 },
  { name: "Redding", region: "CA", at: 580_000 },
  { name: "Chico", region: "CA", at: 700_000 },
  { name: "Sacramento", region: "CA", at: 830_000 },
  { name: "Vallejo", region: "CA", at: 945_000 },
  { name: "Berkeley", region: "CA", at: 1_000_000, kind: "end" },
];

function useRowingData() {
  const [sessions, setSessions] = React.useState([]);
  const [ready, setReady] = React.useState(false);
  const [error, setError] = React.useState(null);
  const [identity, setIdentityState] = React.useState(
    () => localStorage.getItem(STORAGE_IDENTITY) || null
  );

  // --- Firestore live subscription ---
  React.useEffect(() => {
    let unsub = null;

    function attach() {
      if (!window.firebase) return false;
      const fb = window.firebase;
      try {
        const q = fb.query(
          fb.collection(fb.db, "sessions"),
          fb.orderBy("date", "asc"),
        );
        unsub = fb.onSnapshot(
          q,
          (snap) => {
            setSessions(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
            setReady(true);
          },
          (err) => {
            console.error("Firestore subscription error:", err);
            setError(err.message || String(err));
            setReady(true);
          },
        );
        return true;
      } catch (e) {
        console.error("Firestore init error:", e);
        setError(e.message || String(e));
        setReady(true);
        return true;
      }
    }

    if (!attach()) {
      const onReady = () => attach();
      window.addEventListener("firebase-ready", onReady, { once: true });
      // Bail out and show error if Firebase never loads.
      const timeout = setTimeout(() => {
        if (!unsub) {
          setError("Firebase didn't load. Check the SDK config in index.html.");
          setReady(true);
        }
      }, 8000);
      return () => {
        window.removeEventListener("firebase-ready", onReady);
        clearTimeout(timeout);
        if (unsub) unsub();
      };
    }
    return () => { if (unsub) unsub(); };
  }, []);

  // --- Identity ---
  const setIdentity = React.useCallback((id) => {
    if (id) localStorage.setItem(STORAGE_IDENTITY, id);
    else localStorage.removeItem(STORAGE_IDENTITY);
    setIdentityState(id);
  }, []);

  // --- Mutations ---
  const addSession = React.useCallback(async (session) => {
    if (!window.firebase) return;
    const fb = window.firebase;
    try {
      await fb.addDoc(fb.collection(fb.db, "sessions"), {
        person: session.person,
        meters: session.meters,
        date: session.date || new Date().toISOString().slice(0, 10),
        note: session.note || "",
        createdAt: Date.now(),
      });
    } catch (e) {
      console.error("addSession failed:", e);
      alert("Couldn't save: " + (e.message || e));
    }
  }, []);

  const removeSession = React.useCallback(async (id) => {
    if (!window.firebase) return;
    const fb = window.firebase;
    try {
      await fb.deleteDoc(fb.doc(fb.db, "sessions", id));
    } catch (e) {
      console.error("removeSession failed:", e);
      alert("Couldn't delete: " + (e.message || e));
    }
  }, []);

  // --- Derived ---
  const totals = React.useMemo(() => {
    let you = 0, tanner = 0;
    for (const s of sessions) {
      if (s.person === "you") you += s.meters;
      else if (s.person === "tanner") tanner += s.meters;
    }
    return { you, tanner, combined: you + tanner };
  }, [sessions]);

  const progress = totals.combined / TOTAL_METERS;

  const eta = React.useMemo(() => {
    if (sessions.length < 2) return null;
    const dates = sessions.map((s) => new Date(s.date).getTime()).sort((a, b) => a - b);
    const firstDay = dates[0];
    const lastDay = dates[dates.length - 1];
    const today = Date.now();
    const spanDays = Math.max(1, (lastDay - firstDay) / 86_400_000 + 1);
    const metersPerDay = totals.combined / spanDays;
    const remaining = Math.max(0, TOTAL_METERS - totals.combined);
    const daysLeft = remaining / Math.max(1, metersPerDay);
    const arrival = new Date(today + daysLeft * 86_400_000);
    return { metersPerDay, daysLeft, arrival };
  }, [sessions, totals.combined]);

  const yourPosition = Math.min(totals.you, TOTAL_METERS);
  const tannerPosition = Math.max(0, TOTAL_METERS - totals.tanner);
  const met = yourPosition >= tannerPosition;
  const gap = Math.max(0, tannerPosition - yourPosition);

  const milestoneStatus = React.useMemo(() => {
    return MILESTONES.map((m) => ({
      ...m,
      reachedByYou: m.at <= yourPosition,
      reachedByTanner: m.at >= tannerPosition,
      reached: m.at <= yourPosition || m.at >= tannerPosition,
    }));
  }, [yourPosition, tannerPosition]);

  // Landmark helpers — direction-aware.
  const yourLandmark = React.useMemo(() => {
    // Self heads south from 0 toward TOTAL.
    let justPassed = MILESTONES[0];
    let nextAhead = MILESTONES[MILESTONES.length - 1];
    for (let i = 0; i < MILESTONES.length; i++) {
      if (yourPosition >= MILESTONES[i].at) justPassed = MILESTONES[i];
      else { nextAhead = MILESTONES[i]; break; }
    }
    return { justPassed, nextAhead };
  }, [yourPosition]);

  const tannerLandmark = React.useMemo(() => {
    // Tanner heads north from TOTAL toward 0.
    let justPassed = MILESTONES[MILESTONES.length - 1];
    let nextAhead = MILESTONES[0];
    for (let i = MILESTONES.length - 1; i >= 0; i--) {
      if (tannerPosition <= MILESTONES[i].at) justPassed = MILESTONES[i];
      else { nextAhead = MILESTONES[i]; break; }
    }
    return { justPassed, nextAhead };
  }, [tannerPosition]);

  return {
    sessions,
    ready,
    error,
    identity,
    setIdentity,
    totals,
    progress,
    eta,
    milestones: milestoneStatus,
    yourPosition,
    tannerPosition,
    met,
    gap,
    yourLandmark,
    tannerLandmark,
    totalMeters: TOTAL_METERS,
    addSession,
    removeSession,
  };
}

// --- formatters --------------------------------------------------------------
function fmtMeters(m) {
  if (m == null) return "—";
  if (m >= 1000) return (m / 1000).toFixed(1) + " km";
  return Math.round(m) + " m";
}
function fmtMetersFull(m) { return Math.round(m).toLocaleString() + " m"; }
function fmtDate(d) {
  const dt = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
function fmtDateLong(d) {
  const dt = typeof d === "string" ? new Date(d + "T12:00:00") : d;
  return dt.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

Object.assign(window, {
  useRowingData, MILESTONES, TOTAL_METERS,
  fmtMeters, fmtMetersFull, fmtDate, fmtDateLong,
});
