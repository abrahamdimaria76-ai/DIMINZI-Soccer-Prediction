// DIMINZI SOCCER APP — main logic
// Plain JS, no build tools. Sections: Fixtures, Stats, Predict, Leaderboard.

let db = null;
try {
  if (typeof firebase !== "undefined" && typeof firebaseConfig !== "undefined") {
    firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
  }
} catch (e) {
  console.warn("Firebase not configured yet — leaderboard will run in local demo mode.", e);
}

const state = {
  fixtures: [],
  filter: "all",
  predictions: JSON.parse(localStorage.getItem("diminzi_predictions") || "{}"),
  userName: localStorage.getItem("diminzi_username") || null,
};

// ---------- Tab navigation ----------
document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-panel").forEach((p) => p.classList.remove("active"));
    btn.classList.add("active");
    document.getElementById(btn.dataset.tab).classList.add("active");
    if (btn.dataset.tab === "leaderboard") loadLeaderboard();
    if (btn.dataset.tab === "predict") renderPredictions();
  });
});

// ---------- Fixtures ----------
async function fetchFixtures() {
  const today = new Date().toISOString().split("T")[0];
  const statusDot = document.getElementById("apiStatus");
  try {
    const res = await fetch(
      `${API_CONFIG.API_FOOTBALL_BASE}/fixtures?date=${today}`,
      { headers: { "x-apisports-key": API_CONFIG.API_FOOTBALL_KEY } }
    );
    const data = await res.json();
    state.fixtures = data.response || [];
    statusDot.classList.add("live");
  } catch (err) {
    console.error("Failed to fetch fixtures", err);
    statusDot.classList.remove("live");
  }
  renderFixtures();
}

function statusCategory(shortStatus) {
  if (["1H", "2H", "HT", "ET", "P"].includes(shortStatus)) return "live";
  if (["FT", "AET", "PEN"].includes(shortStatus)) return "finished";
  return "upcoming";
}

function renderFixtures() {
  const list = document.getElementById("fixturesList");
  const filtered = state.fixtures.filter((m) => {
    if (state.filter === "all") return true;
    return statusCategory(m.fixture.status.short) === state.filter;
  });

  if (filtered.length === 0) {
    list.innerHTML = `<div class="empty-state">No matches to show. Add your API key in config.js to load live data.</div>`;
    return;
  }

  list.innerHTML = filtered
    .map((m) => {
      const cat = statusCategory(m.fixture.status.short);
      const time = new Date(m.fixture.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      return `
      <div class="card match-card" data-fixture-id="${m.fixture.id}">
        <div class="match-league">
          <span>${m.league.name}</span>
          ${cat === "live" ? `<span class="live-tag">● LIVE ${m.fixture.status.elapsed || ""}'</span>` : ""}
        </div>
        <div class="match-row">
          <span class="match-team">${m.teams.home.name}</span>
          <span class="match-score">${m.goals.home ?? "-"}</span>
        </div>
        <div class="match-row">
          <span class="match-team">${m.teams.away.name}</span>
          <span class="match-score">${m.goals.away ?? "-"}</span>
        </div>
        ${cat === "upcoming" ? `<div class="match-time">Kickoff ${time}</div>` : ""}
      </div>`;
    })
    .join("");

  document.querySelectorAll(".match-card").forEach((el) => {
    el.addEventListener("click", () => openMatchModal(el.dataset.fixtureId));
  });
}

document.querySelectorAll(".chip").forEach((chip) => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    state.filter = chip.dataset.filter;
    renderFixtures();
  });
});

// ---------- Match detail / stats modal ----------
async function openMatchModal(fixtureId) {
  const modal = document.getElementById("matchModal");
  const body = document.getElementById("modalBody");
  body.innerHTML = `<div class="empty-state">Loading...</div>`;
  modal.classList.add("open");

  try {
    const res = await fetch(
      `${API_CONFIG.API_FOOTBALL_BASE}/fixtures/statistics?fixture=${fixtureId}`,
      { headers: { "x-apisports-key": API_CONFIG.API_FOOTBALL_KEY } }
    );
    const data = await res.json();
    const stats = data.response || [];

    const match = state.fixtures.find((m) => m.fixture.id == fixtureId);
    const title = match ? `${match.teams.home.name} vs ${match.teams.away.name}` : "Match Stats";

    if (stats.length < 2) {
      body.innerHTML = `<h3>${title}</h3><div class="empty-state">No stats available yet for this match.</div>`;
      return;
    }

    const home = stats[0];
    const away = stats[1];
    const rows = home.statistics
      .map((stat, i) => {
        const awayVal = away.statistics[i] ? away.statistics[i].value : "-";
        return `<div class="match-row"><span>${stat.value ?? "-"}</span><span class="hint">${stat.type}</span><span>${awayVal ?? "-"}</span></div>`;
      })
      .join("");

    body.innerHTML = `<h3>${title}</h3><div style="margin-top:12px;">${rows}</div>`;
  } catch (err) {
    body.innerHTML = `<div class="empty-state">Couldn't load stats right now.</div>`;
  }
}

document.getElementById("modalClose").addEventListener("click", () => {
  document.getElementById("matchModal").classList.remove("open");
});

// ---------- Predictions ----------
function renderPredictions() {
  const list = document.getElementById("predictList");
  const upcoming = state.fixtures.filter((m) => statusCategory(m.fixture.status.short) === "upcoming");

  if (upcoming.length === 0) {
    list.innerHTML = `<div class="empty-state">No upcoming matches to predict right now.</div>`;
    return;
  }

  list.innerHTML = upcoming
    .map((m) => {
      const id = m.fixture.id;
      const saved = state.predictions[id];
      return `
      <div class="card predict-card">
        <div class="match-league"><span>${m.league.name}</span></div>
        <div class="predict-teams">
          <span class="match-team">${m.teams.home.name}</span>
          <input type="number" min="0" max="20" class="predict-input" id="home-${id}" value="${saved ? saved.home : ""}" />
          <span class="predict-vs">-</span>
          <input type="number" min="0" max="20" class="predict-input" id="away-${id}" value="${saved ? saved.away : ""}" />
          <span class="match-team">${m.teams.away.name}</span>
        </div>
        <button class="predict-save" onclick="savePrediction(${id})">Save Prediction</button>
        ${saved ? `<div class="predict-points">Saved: ${saved.home} - ${saved.away}</div>` : ""}
      </div>`;
    })
    .join("");
}

function savePrediction(fixtureId) {
  const home = document.getElementById(`home-${fixtureId}`).value;
  const away = document.getElementById(`away-${fixtureId}`).value;
  if (home === "" || away === "") return;

  state.predictions[fixtureId] = { home: Number(home), away: Number(away) };
  localStorage.setItem("diminzi_predictions", JSON.stringify(state.predictions));

  if (db && state.userName) {
    db.collection("predictions").doc(`${state.userName}_${fixtureId}`).set({
      user: state.userName,
      fixtureId,
      home: Number(home),
      away: Number(away),
      savedAt: new Date().toISOString(),
    });
  }
  renderPredictions();
}

// ---------- Leaderboard ----------
async function loadLeaderboard() {
  const list = document.getElementById("leaderboardList");
  const namePrompt = document.getElementById("namePrompt");

  if (!state.userName) {
    namePrompt.style.display = "flex";
  } else {
    namePrompt.style.display = "none";
  }

  if (!db) {
    list.innerHTML = `<div class="empty-state">Leaderboard needs Firebase configured (see firebase-config.js). Running in local demo mode for now.</div>`;
    return;
  }

  try {
    const snapshot = await db.collection("leaderboard").orderBy("points", "desc").limit(20).get();
    if (snapshot.empty) {
      list.innerHTML = `<div class="empty-state">No scores yet — be the first to predict!</div>`;
      return;
    }
    let rank = 1;
    list.innerHTML = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        return `<div class="leaderboard-row"><span class="leaderboard-rank">#${rank++}</span><span class="leaderboard-name">${d.name}</span><span class="leaderboard-points">${d.points} pts</span></div>`;
      })
      .join("");
  } catch (err) {
    list.innerHTML = `<div class="empty-state">Couldn't load leaderboard.</div>`;
  }
}

document.getElementById("saveNameBtn").addEventListener("click", () => {
  const input = document.getElementById("userNameInput");
  const name = input.value.trim();
  if (!name) return;
  state.userName = name;
  localStorage.setItem("diminzi_username", name);
  document.getElementById("namePrompt").style.display = "none";

  if (db) {
    db.collection("leaderboard").doc(name).set(
      { name, points: 0 },
      { merge: true }
    );
  }
  loadLeaderboard();
});

// ---------- Init ----------
fetchFixtures();
setInterval(fetchFixtures, 30000); // refresh every 30s for live scores

// Register service worker for PWA install support
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("service-worker.js").catch(() => {});
  });
}
