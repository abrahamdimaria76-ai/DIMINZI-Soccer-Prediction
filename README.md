# Habesha Predicts

A soccer score-prediction app: people pick scores for upcoming matches, points are
scored automatically (3 for an exact score, 1 for the correct winner/draw), and a
shared leaderboard shows who's on top.

## How it's built

- Plain HTML/CSS/JS — no build tools, no framework, easy to read and change.
- Hosted for free on **GitHub Pages**.
- Shared data (everyone's predictions + the leaderboard) is stored in **Firebase
  Firestore**, also free at this scale. Until you set that up, the app runs in
  **demo mode** and just saves your picks in your own browser, so you can test
  everything locally first.

## Step 1 — Get it running locally (demo mode, no setup needed)

1. Download/clone these files into a folder.
2. Because the app uses JS modules, you can't just double-click `index.html` —
   open it through a local server. Easiest way, if you have Python installed:
   ```
   cd habesha-predicts
   python3 -m http.server 8000
   ```
   Then open `http://localhost:8000` in your browser.
3. Enter a name, pick some scores, hit Save. It'll work — just only visible to you.

## Step 2 — Push it to your GitHub repo

```
cd habesha-predicts
git init                     # skip if the repo is already initialized
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git add .
git commit -m "Initial version of Habesha Predicts"
git branch -M main
git push -u origin main
```

## Step 3 — Turn on GitHub Pages

1. On GitHub, go to your repo → **Settings** → **Pages**.
2. Under "Build and deployment," set **Source** to `Deploy from a branch`.
3. Branch: `main`, folder: `/ (root)`. Save.
4. Wait a minute, then your site is live at:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

At this point the site is live, but still in demo mode — everyone who visits
only sees their own predictions. Step 4 makes it shared.

## Step 4 — Connect Firebase (makes predictions/leaderboard shared for everyone)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** → name it (e.g. `habesha-predicts`) → follow the prompts
   (you can skip Google Analytics).
2. In your new project: **Build → Firestore Database → Create database** →
   start in **test mode** (fine for a small community app; tighten rules later
   if it grows).
3. Go to **Project settings** (gear icon) → scroll to "Your apps" → click the
   `</>` (web) icon → register the app (nickname anything) → it'll show you a
   `firebaseConfig` object.
4. Copy those values into `firebase-config.js` in your project, replacing the
   placeholders (`YOUR_API_KEY`, etc.).
5. Commit and push:
   ```
   git add firebase-config.js
   git commit -m "Connect Firebase"
   git push
   ```
6. Refresh your GitHub Pages site — predictions and the leaderboard are now
   shared across every visitor.

**Note:** Firebase config values aren't secret in the way an API key for a paid
service is — they identify your project, not authenticate as an admin. The
Firestore *security rules* (set in the Firebase console) are what actually
control who can read/write. Test mode is open to anyone with the config, which
is fine for a small group; if it grows, look up "Firestore security rules" to
lock it down (e.g. so a user can only write to their own prediction doc).

## Step 5 — Enter real results (so points/leaderboard populate)

Right now, results are entered by hand in `app.js`, in the `MATCHES` array —
add a `result: { home: X, away: Y }` to a match once it's final, then commit
and push. That's the simplest possible version. A natural next step, once
you're comfortable with the code, is building a small admin page or wiring
this to a live football API so results fill in automatically.

## Connecting real match data (optional next step)

The `MATCHES` array in `app.js` is currently just sample fixtures. To pull real
upcoming matches automatically, a free option is
[football-data.org](https://www.football-data.org/) — register for a free API
key, then fetch fixtures for the competitions you care about and map them into
the same `{ id, competition, home, away, kickoff, result }` shape the app
expects.

## Customizing

- Colors, fonts: `styles.css`, top `:root` block.
- App name / copy: `index.html`.
- Scoring rules: `pointsFor()` in `app.js`.
- Matches: `MATCHES` array in `app.js`.

## File structure

```
habesha-predicts/
├── index.html          — page structure
├── styles.css           — all styling
├── app.js                — app logic (matches, predictions, leaderboard)
├── firebase-config.js    — your Firebase credentials go here
└── README.md             — this file
```
