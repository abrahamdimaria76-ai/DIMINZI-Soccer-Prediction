import { firebaseConfig } from "./firebase-config.js";

/* ────────────────────────────────────────────────────────────────
   MATCH DATA
   Replace this list with real fixtures, or wire it up to a live
   football API (see README "Connecting real match data").
   To record a final result, add a `result: { home: X, away: Y }`
   field to a match below — points get calculated automatically.
──────────────────────────────────────────────────────────────── */
const MATCHES = [
  { id: "m1", competition: "UEFA Champions League", home: "Al Ahly", away: "Real Madrid", kickoff: "2026-07-15T19:00:00", result: null },
  { id: "m2", competition: "AFCON Qualifier", home: "Ethiopia", away: "Nigeria", kickoff: "2026-07-16T15:00:00", result: null },
  { id: "m3", competition: "UEFA Champions League", home: "Man City", away: "Bayern Munich", kickoff: "2026-07-18T19:45:00", result: { home: 2, away: 2 } },
  { id: "m4", competition: "Premier League", home: "Arsenal", away: "Liverpool", kickoff: "2026-07-20T14:00:00", result: null },
];

const isDemoMode = firebaseConfig.apiKey === "YOUR_API_KEY";
let db = null;

if (!isDemoMode) {
  const { initializeApp } = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js");
  const firestore = await import("https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js");
  const app = initializeApp(firebaseConfig);
  db = { ...firestore, instance: firestore.getFirestore(app) };
}

/* ── storage layer: same interface for demo (localStorage) and Firebase ── */
async function getAllPredictions() {
  if (isDemoMode) {
    return JSON.parse(localStorage.getItem("hp_predictions") || "{}");
  }
  const snap = await db.getDocs(db.collection(db.instance, "predictions"));
  const out = {};
  snap.forEach(doc => (out[doc.id] = doc.data()));
  return out;
}

async function savePrediction(userKey, matchId, home, away, name) {
  if (isDemoMode) {
    const all = JSON.parse(localStorage.getItem("hp_predictions") || "{}");
    all[userKey] = all[userKey] || { name, picks: {} };
    all[userKey].name = name;
    all[userKey].picks[matchId] = { home, away };
    localStorage.setItem("hp_predictions", JSON.stringify(all));
    return;
  }
  const ref = db.doc(db.instance, "predictions", userKey);
  const existing = await db.getDoc(ref);
  const picks = existing.exists() ? existing.data().picks || {} : {};
  picks[matchId] = { home, away };
  await db.setDoc(ref, { name, picks });
}

/* ── user identity: simple name-based key stored locally ── */
function getUserKey() {
  let key = localStorage.getItem("hp_user_key");
  if (!key) {
    key = "u_" + Math.random().toString(36).slice(2, 10);
    localStorage.setItem("hp_user_key", key);
  }
  return key;
}
function getUserName() {
  return localStorage.getItem("hp_user_name") || "";
}
function setUserName(name) {
  localStorage.setItem("hp_user_name", name);
}

/* ── points: 3 for exact score, 1 for correct outcome, 0 otherwise ── */
function pointsFor(pick, result) {
  if (!result || !pick) return 0;
  if (pick.home === result.home && pick.away === result.away) return 3;
  const pickOutcome = Math.sign(pick.home - pick.away);
  const resultOutcome = Math.sign(result.home - result.away);
  return pickOutcome === resultOutcome ? 1 : 0;
}

/* ── rendering: matches ── */
function formatKickoff(iso) {
  const d = new Date(iso);
  return d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

async function renderMatches() {
  const list = document.getElementById("matches-list");
  const allPredictions = await getAllPredictions();
  const userKey = getUserKey();
  const myPicks = allPredictions[userKey]?.picks || {};

  list.innerHTML = "";
  MATCHES.forEach(match => {
    const pick = myPicks[match.id];
    const card = document.createElement("div");
    card.className = "match-card";
    card.innerHTML = `
      <span class="match-comp">${match.competition}</span>
      <div class="match-teams">${match.home} <span class="vs-dash">vs</span> ${match.away}</div>
      <span class="match-time">${formatKickoff(match.kickoff)}</span>
      <div class="predict-form">
        <input type="number" min="0" max="20" class="score-input" data-side="home" value="${pick?.home ?? ""}">
        <span class="vs-dash">–</span>
        <input type="number" min="0" max="20" class="score-input" data-side="away" value="${pick?.away ?? ""}">
        <button class="save-btn">${pick ? "Update" : "Save"}</button>
      </div>
      ${match.result ? `<span class="result-badge">Final: ${match.result.home}–${match.result.away}</span>` : ""}
    `;

    const homeInput = card.querySelector('[data-side="home"]');
    const awayInput = card.querySelector('[data-side="away"]');
    const saveBtn = card.querySelector(".save-btn");

    saveBtn.addEventListener("click", async () => {
      const name = document.getElementById("username-input").value.trim();
      if (!name) {
        alert("Enter your name at the top first so your points can be tracked.");
        return;
      }
      setUserName(name);
      const h = parseInt(homeInput.value, 10);
      const a = parseInt(awayInput.value, 10);
      if (isNaN(h) || isNaN(a)) {
        alert("Enter a score for both teams.");
        return;
      }
      await savePrediction(userKey, match.id, h, a, name);
      saveBtn.textContent = "Saved ✓";
      saveBtn.classList.add("saved");
      setTimeout(() => { saveBtn.textContent = "Update"; saveBtn.classList.remove("saved"); }, 1500);
      updatePourRing();
    });

    list.appendChild(card);
  });
}

/* ── rendering: leaderboard ── */
async function renderLeaderboard() {
  const body = document.getElementById("leaderboard-body");
  const allPredictions = await getAllPredictions();

  const rows = Object.values(allPredictions).map(entry => {
    let points = 0, exact = 0;
    MATCHES.forEach(match => {
      const pick = entry.picks?.[match.id];
      if (!pick || !match.result) return;
      const p = pointsFor(pick, match.result);
      points += p;
      if (p === 3) exact++;
    });
    return { name: entry.name || "Anonymous", points, exact };
  }).sort((a, b) => b.points - a.points);

  body.innerHTML = rows.length
    ? rows.map((r, i) => `<tr><td>${i + 1}</td><td>${r.name}</td><td>${r.points}</td><td>${r.exact}</td></tr>`).join("")
    : `<tr><td colspan="4" style="color:var(--cream-dim)">No predictions yet — be the first.</td></tr>`;
}

/* ── points ring in hero ── */
async function updatePourRing() {
  const allPredictions = await getAllPredictions();
  const mine = allPredictions[getUserKey()];
  let points = 0;
  if (mine) {
    MATCHES.forEach(match => {
      const pick = mine.picks?.[match.id];
      if (pick && match.result) points += pointsFor(pick, match.result);
    });
  }
  const maxPossible = MATCHES.length * 3;
  const ratio = maxPossible ? Math.min(points / maxPossible, 1) : 0;
  const circumference = 552.9;
  document.getElementById("pour-fill").style.strokeDashoffset = circumference * (1 - ratio);
  document.getElementById("pour-label").textContent = `${points} pts`;
}

/* ── tabs ── */
function initTabs() {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
      document.querySelectorAll(".panel").forEach(p => p.classList.remove("active"));
      btn.classList.add("active");
      document.getElementById(`${btn.dataset.tab}-panel`).classList.add("active");
      if (btn.dataset.tab === "leaderboard") renderLeaderboard();
    });
  });
}

/* ── init ── */
function initUserBox() {
  const input = document.getElementById("username-input");
  input.value = getUserName();
  input.addEventListener("change", () => setUserName(input.value.trim()));
}

if (isDemoMode) {
  console.info("Habesha Predicts is running in DEMO MODE (local storage only). See README.md to connect Firebase so predictions are shared across everyone.");
}

initTabs();
initUserBox();
await renderMatches();
await updatePourRing();
