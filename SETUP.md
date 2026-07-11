# DIMINZI SOCCER APP — Setup Guide

## What's in this package
- `index.html`, `styles.css`, `app.js` — the app (dark + yellow theme, mobile-responsive)
- `config.js` — put your free API-Football key here
- `firebase-config.js` — TEMPLATE ONLY. If your repo already has a real one, keep yours, don't overwrite it.
- `manifest.json` + `service-worker.js` — makes it installable as a PWA (Add to Home Screen)
- `assets/icon-192.png`, `assets/icon-512.png` — app icons

## Step 1 — Get your API key
1. Go to https://www.api-football.com and sign up (free tier)
2. Copy your API key
3. Open `config.js` and replace `PUT_YOUR_API_KEY_HERE` with it

## Step 2 — Keep your existing Firebase config
If your repo already has a working `firebase-config.js`, **delete the one from this package** before copying files over, so you don't lose your real Firebase project values.

## Step 3 — Copy these files into your local repo folder
Copy everything from this package into your local `DIMINZI-Soccer-Prediction` folder, overwriting `index.html`, `styles.css`, `app.js`, `manifest.json`, `service-worker.js`, and the `assets` folder. Keep your own `firebase-config.js`.

## Step 4 — Push to GitHub
Open a terminal in your project folder and run:

```bash
cd DIMINZI-Soccer-Prediction
git add .
git commit -m "Redesign: dark/yellow theme, live fixtures, stats, PWA support"
git push origin main
```

## Step 5 — Turn on GitHub Pages (if not already on)
1. Go to your repo on GitHub → **Settings** → **Pages**
2. Under "Source", select the `main` branch and `/ (root)` folder
3. Save — GitHub will give you a live URL like:
   `https://abrahamdimaria76-ai.github.io/DIMINZI-Soccer-Prediction/`

## Step 6 — Install it like an app on your phone
1. Open the GitHub Pages URL in your phone's browser
2. On Android Chrome: tap the menu (⋮) → **"Add to Home screen"**
3. It'll now open full-screen like a native app, with your icon

## Notes
- Live fixtures/stats refresh automatically every 30 seconds
- Predictions save locally on your device, and to Firebase if you've entered a leaderboard name
- The API key in `config.js` is visible to anyone who views your site's source — fine for a free hobby key, but never put a paid/secret key in a public repo like this
