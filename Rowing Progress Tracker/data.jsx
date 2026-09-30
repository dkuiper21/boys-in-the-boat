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

// Dense waypoint list along the Interstate 5 corridor. Used for the status
// text and, via x/y (chart coordinates, same projection as app-chart.jsx),
// as the route the tracks and boats follow on the map.
const WAYPOINTS = [
  { name: "Sherwood", region: "OR", at: 0, x: 252, y: 197 },
  { name: "Wilsonville", region: "OR", at: 15_000, x: 258, y: 204 },
  { name: "Woodburn", region: "OR", at: 35_000, x: 251, y: 223 },
  { name: "Keizer", region: "OR", at: 52_000, x: 236, y: 240 },
  { name: "Salem", region: "OR", at: 60_000, x: 234, y: 247 },
  { name: "Albany", region: "OR", at: 100_000, x: 229, y: 284 },
  { name: "Corvallis", region: "OR", at: 118_000, x: 215, y: 292 },
  { name: "Junction City", region: "OR", at: 155_000, x: 220, y: 334 },
  { name: "Eugene", region: "OR", at: 175_000, x: 230, y: 354 },
  { name: "Cottage Grove", region: "OR", at: 210_000, x: 233, y: 384 },
  { name: "Drain", region: "OR", at: 240_000, x: 210, y: 401 },
  { name: "Sutherlin", region: "OR", at: 270_000, x: 210, y: 433 },
  { name: "Roseburg", region: "OR", at: 285_000, x: 208, y: 454 },
  { name: "Canyonville", region: "OR", at: 320_000, x: 213, y: 489 },
  { name: "Glendale", region: "OR", at: 345_000, x: 200, y: 512 },
  { name: "Grants Pass", region: "OR", at: 370_000, x: 209, y: 547 },
  { name: "Rogue River", region: "OR", at: 387_000, x: 223, y: 548 },
  { name: "Medford", region: "OR", at: 405_000, x: 250, y: 560 },
  { name: "Ashland", region: "OR", at: 425_000, x: 264, y: 577 },
  { name: "Siskiyou Summit", region: "OR", at: 440_000, x: 274, y: 592 },
  { name: "Hornbrook", region: "CA", at: 460_000, x: 278, y: 611 },
  { name: "Yreka", region: "CA", at: 475_000, x: 270, y: 632 },
  { name: "Weed", region: "CA", at: 500_000, x: 293, y: 669 },
  { name: "Mt. Shasta", region: "CA", at: 510_000, x: 300, y: 683 },
  { name: "Dunsmuir", region: "CA", at: 522_000, x: 303, y: 695 },
  { name: "Lakehead", region: "CA", at: 555_000, x: 293, y: 731 },
  { name: "Shasta Lake", region: "CA", at: 570_000, x: 294, y: 758 },
  { name: "Redding", region: "CA", at: 580_000, x: 293, y: 769 },
  { name: "Anderson", region: "CA", at: 595_000, x: 300, y: 786 },
  { name: "Red Bluff", region: "CA", at: 625_000, x: 306, y: 819 },
  { name: "Corning", region: "CA", at: 655_000, x: 311, y: 849 },
  { name: "Vina", region: "CA", at: 675_000, x: 323, y: 848 },
  { name: "Chico", region: "CA", at: 700_000, x: 341, y: 872 },
  { name: "Oroville", region: "CA", at: 730_000, x: 367, y: 898 },
  { name: "Yuba City", region: "CA", at: 775_000, x: 361, y: 943 },
  { name: "Nicolaus", region: "CA", at: 800_000, x: 365, y: 972 },
  { name: "Sacramento", region: "CA", at: 830_000, x: 373, y: 1010 },
  { name: "Davis", region: "CA", at: 855_000, x: 350, y: 1015 },
  { name: "Vacaville", region: "CA", at: 895_000, x: 328, y: 1037 },
  { name: "Fairfield", region: "CA", at: 915_000, x: 323, y: 1050 },
  { name: "Vallejo", region: "CA", at: 945_000, x: 304, y: 1066 },
  { name: "Crockett", region: "CA", at: 955_000, x: 318, y: 1079 },
  { name: "Richmond", region: "CA", at: 980_000, x: 311, y: 1086 },
  { name: "Albany", region: "CA", at: 992_000, x: 312, y: 1090 },
  { name: "Berkeley", region: "CA", at: 1_000_000, x: 313, y: 1094 },
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

  // Projected meeting point: split the remaining gap by each rower's share of
  // the distance so far (falls back to the midpoint before anyone has rowed).
  const meeting = React.useMemo(() => {
    const share = totals.combined > 0 ? totals.you / totals.combined : 0.5;
    const at = met ? yourPosition : yourPosition + share * gap;
    let near = WAYPOINTS[0];
    for (const w of WAYPOINTS) {
      if (Math.abs(w.at - at) < Math.abs(near.at - at)) near = w;
    }
    return { at, near };
  }, [totals.you, totals.combined, yourPosition, gap, met]);

  const milestoneStatus = React.useMemo(() => {
    return MILESTONES.map((m) => ({
      ...m,
      reachedByYou: m.at <= yourPosition,
      reachedByTanner: m.at >= tannerPosition,
      reached: m.at <= yourPosition || m.at >= tannerPosition,
    }));
  }, [yourPosition, tannerPosition]);

  // Landmark helpers — direction-aware, using the dense waypoint list.
  const yourLandmark = React.useMemo(() => {
    // Daniel heads south from 0 toward TOTAL.
    let justPassed = WAYPOINTS[0];
    let nextAhead = WAYPOINTS[WAYPOINTS.length - 1];
    for (let i = 0; i < WAYPOINTS.length; i++) {
      if (yourPosition >= WAYPOINTS[i].at) justPassed = WAYPOINTS[i];
      else { nextAhead = WAYPOINTS[i]; break; }
    }
    return { justPassed, nextAhead };
  }, [yourPosition]);

  const tannerLandmark = React.useMemo(() => {
    // Tanner heads north from TOTAL toward 0.
    let justPassed = WAYPOINTS[WAYPOINTS.length - 1];
    let nextAhead = WAYPOINTS[0];
    for (let i = WAYPOINTS.length - 1; i >= 0; i--) {
      if (tannerPosition <= WAYPOINTS[i].at) justPassed = WAYPOINTS[i];
      else { nextAhead = WAYPOINTS[i]; break; }
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
    meeting,
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
  useRowingData, MILESTONES, WAYPOINTS, TOTAL_METERS,
  fmtMeters, fmtMetersFull, fmtDate, fmtDateLong,
});
