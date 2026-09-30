# Boys in the Boat — Sherwood → Berkeley

A nautical-chart rowing tracker. Daniel rows south from Sherwood; Tanner rows
north from Berkeley. They meet in the middle of 1,000 km.

## Stack

- Static HTML + in-browser Babel JSX (no build step)
- React 18 via UMD CDN
- **Firebase Firestore** for shared session data (live sync between the two devices)
- **Vercel** for hosting

## Files

```
index.html              ← entry point, initializes Firebase
data.jsx                ← Firestore-backed useRowingData hook
app-chart.jsx           ← the nautical chart SVG
terrain.webp            ← shaded-relief background for the chart (land, sea floor, coastline)
map-data.js             ← generated geography: highway route, lakes, rivers, state line
app-log.jsx             ← the logbook (header stats, entries, form)
app-main.jsx            ← layout, identity picker, loading + error states
(boys-in-the-boat / a rowing tracker)
Rowing Tracker.html     ← the original 3-up exploration (canvas variations)
```

## Deploying to Vercel

1. Push this folder to a GitHub repo (see below).
2. Go to **vercel.com** → New Project → Import the repo.
3. Framework Preset: **Other** (it's a static site, no build step).
4. Build Command: leave blank. Output Directory: leave blank.
5. Click **Deploy** — about 30 seconds. You'll get a `*.vercel.app` URL.
6. Share that URL with Tanner.

### Pushing to GitHub (first time)

```bash
cd /path/to/this/folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/the-crossing.git
git push -u origin main
```

After this, any `git push` re-deploys automatically.

## Firestore rules

You're currently in **test mode** (open read/write for 30 days). Before that
expires, paste these rules in the Firebase Console → Firestore Database → Rules
to keep it working for just the two of you:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /sessions/{sessionId} {
      allow read, write: if true;
    }
  }
}
```

This still lets anyone with the URL read/write the `sessions` collection —
fine for an unlisted Vercel URL with two trusted users. If you want real auth
(Google sign-in, etc.) that's a follow-on change.

## Map data

The chart uses a plate carrée projection: `x = 60 + (lon + 125) * 89`,
`y = (47 - lat) * 120`, on a 600 × 1200 frame (37°N–47°N).

- **Terrain** (`terrain.webp`, 1200 × 2400): hillshade and elevation tint from
  [AWS Terrain Tiles](https://registry.opendata.aws/terrain-tiles/) (zoom 8),
  which combine SRTM, GMTED2010 and ETOPO1 among other sources; coastline from
  Natural Earth 1:10m land polygons.
- **Vectors** (`map-data.js`): lakes, rivers, the Oregon–California line and the
  highway network from [Natural Earth](https://www.naturalearthdata.com/)
  (public domain). The route follows Interstate 5, Highway 99 and Interstate 80
  through the waypoint towns in `data.jsx`; each vertex stores its distance
  from Sherwood.

Both files are generated; regenerate them rather than editing by hand.

## Data model

`sessions` collection in Firestore, one document per row:

```json
{
  "person": "you" | "tanner",
  "meters": 7500,
  "date": "2026-06-09",
  "note": "negative split",
  "createdAt": 1717920000000
}
```

## Local development

Just open `index.html` in a browser — it'll connect to the same Firestore as
production. (If you want a separate dev DB, create a second Firebase project
and swap the config in `index.html`.)
