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
