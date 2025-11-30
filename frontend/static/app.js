// app.js — fixed: buttons reliably start sessions, offline-first, server calls optional.
// Key fixes:
// 1. startDailySession no longer blocks on ensureUser — it will try to get a user but proceeds offline if none.
// 2. ensureUser uses the correct backend path (/api/auth/login) and tolerates many server shapes.
// 3. CTA and splash buttons always call startDailySession directly (no fragile onclick wiring).
// 4. Minor defensive fixes to avoid runtime errors when optional DOM nodes are missing.
// 5. Prevent restarting today's session once completed (removes replay ritual mechanism).
"use strict";

/* ===========================
   Minimal data & fallback
   =========================== */

const archetypes = [
  { key: "seeker", name: "Seeker", emoji: "🧭" },
  { key: "analyst", name: "Analyst", emoji: "🧠" },
  { key: "empath", name: "Empath", emoji: "💙" },
  { key: "builder", name: "Builder", emoji: "🧱" },
  { key: "anchor", name: "Anchor", emoji: "⚓" },
  { key: "visionary", name: "Visionary", emoji: "🌌" },
  { key: "mystic", name: "Mystic", emoji: "🔮" },
  { key: "narrator", name: "Narrator", emoji: "📖" },
  { key: "guardian", name: "Guardian", emoji: "🛡️" },
  { key: "rebel", name: "Rebel", emoji: "🔥" }
];

const sampleQuestions = [
  "Today, I've focused more on protecting my boundaries than making new connections",
  "Right now, I'm more interested in testing ideas than accepting them",
  "This week, I've trusted my ability to adapt more than my ability to plan ahead",
  "Today, I've felt most alive when things suddenly made sense rather than when they opened up new questions",
  "Right now, I'm more aware of emotional truth than factual truth",
  "In the past few days, I've wanted to bring things together more than keep them separate",
  "Today, I've focused more on immediate results than long-term effects",
  "Right now, I need to feel stable and grounded more than inspired and excited",
  "This week, I've been more comfortable breaking patterns than keeping them going",
  "Today, I've been more drawn to what's hidden than what's obvious",
  "Right now, I trust my logical mind more than my intuition",
  "In recent conversations, I've focused more on what we're building together than on what's being said",
  "Today, I've felt more energized when things make sense than when they're new and different",
  "Right now, I feel like I'm receiving direction rather than creating it myself",
  "This week, I've been more aware of my responsibilities than my possibilities",
  "Today, I've been more drawn to stillness and quiet than to action and movement",
  "Right now, I'm more focused on what's dependable than what's exciting",
  "In the past few hours, I've been more aware of the weight of emotions than the emotions themselves",
  "Today, I've felt most alive when connecting the dots rather than gathering new information",
  "Right now, I trust what happens naturally more than what's carefully planned",
  "This week, I've been more comfortable with things being unfinished than wrapped up neatly",
  "Today, I've been more drawn to what challenges me than what makes me comfortable",
  "Right now, I need to express something more than understand something",
  "In recent days, I've felt like I'm protecting something precious rather than sharing something valuable",
  "Today, I've focused more on what resonates with me than on what makes logical sense",
  "Right now, I feel connected to a bigger story than just my own personal one",
  "This week, I've trusted my inner knowing more than what others validate or approve",
  "Today, I've felt more energized by bringing things together than by expanding outward",
  "Right now, I'm more aware of what's falling apart than what's coming together",
  "In the past few days, I've been more pulled toward the core of things than toward expressing them",
  "Today, I've focused more on being efficient than on exploring",
  "Right now, things need to feel right more than they need to be right",
  "This week, I've been more comfortable going my own way than fitting in",
  "Today, I've been more drawn to contradictions and paradoxes than to clear answers",
  "Right now, I trust taking direct action more than thinking things through carefully",
  "In recent conversations, I've been more aware of what people aren't saying than what they are",
  "Today, I've felt more energized by questions than by answers",
  "Right now, I feel like I'm describing or interpreting my experience rather than just having it",
  "This week, I've focused more on protecting what's stable than creating change",
  "Today, I've been more drawn to what brings people together than what sets them apart",
  "Right now, I'm more aware of what could be than what actually is",
  "In the past few hours, I've focused more on adjusting and fine-tuning than on producing results",
  "Today, I've felt most alive when sensing the truth rather than proving it",
  "Right now, I trust step-by-step thinking more than sudden insights",
  "This week, I've been more comfortable with mystery and the unknown than with explanations",
  "Today, I've been more drawn to what's flexible and flowing than what's fixed and solid",
  "Right now, I need to hold in what I'm experiencing more than let it out",
  "In recent days, I've felt like I'm spotting patterns rather than creating stories",
  "Today, I've focused more on what I'm giving than what I'm getting",
  "Right now, I feel more connected to the space between things than to the things themselves",
  "This week, I've trusted visible progress more than invisible personal growth",
  "Today, I've felt more energized by pushback and resistance than by agreement and support",
  "Right now, I'm more aware of what feels sacred or special than what's practical",
  "In the past few days, I've been more interested in what's left unsaid than what's spoken out loud",
  "Today, I've focused more on defending what matters to me than discovering new things",
  "Right now, I need a clear explanation more than a gut feeling",
  "This week, I've been more comfortable questioning people in charge than respecting tradition",
  "Today, I've been more drawn to in-between spaces than to solid ground",
  "Right now, I trust what's been proven and tested more than what's imagined",
  "In recent conversations, I've focused more on creating something together than on understanding each other",
  "Today, I've felt more energized by simplifying and removing things than by adding more",
  "Right now, I feel like something is flowing through me rather than me actively choosing it",
  "This week, I've been more aware of what I'm keeping safe than what I'm going after",
  "Today, I've been more drawn to the deeper question underneath than to finding the answer",
  "Right now, I'm more focused on what's changing inside me than what's happening around me"
];

const sampleAdvices = [
  "Today, don’t try to fix everything. Just choose one thing you’ll meet with honesty.",
  "Let your questions exist without needing instant answers.",
  "Notice one moment today where you actually felt okay.",
  "You don’t have to be productive to be worthy of rest."
];

const sampleRituals = [
  "For 60 seconds, focus on the feeling of your feet on the ground and your breath.",
  "Write one sentence that starts with: “Today, I’m willing to…”.",
  "Place your hand on your chest, breathe slowly, and silently say: “I’m here.”",
  "Look at one object in your room and imagine it’s a witness to your growth."
];

// replace your todayKey with this local-version (avoids toISOString UTC problems)
function todayKey(d = new Date()) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/* ===========================
   Small safe DOM helpers
   =========================== */

function $id(id) { return document.getElementById(id); }
function safeText(el, text) { if (!el) return; el.textContent = text; }

/* ===========================
   API helpers
   =========================== */

async function apiGet(path) {
  try {
    const res = await fetch(path, { method: "GET", headers: { Accept: "application/json" }, credentials: "same-origin" });
    if (!res.ok) throw new Error("Network error: " + res.status);
    return await res.json();
  } catch (err) { console.warn("apiGet failed", path, err); return null; }
}

async function apiPost(path, body) {
  try {
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body || {})
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error("Network error: " + res.status + " | " + text);
    }
    return await res.json();
  } catch (err) { console.warn("apiPost failed", path, err); return null; }
}

/* ===========================
   Local fallback state
   =========================== */

let _localState = (() => {
  try { return JSON.parse(localStorage.getItem("praxis_state") || "{}"); } catch { return {}; }
})();
if (!_localState.sessions) _localState.sessions = {};
if (!_localState.streak) _localState.streak = { count: 0, buffer: 0, lastDate: null };
if (!_localState.archetypeCounts) _localState.archetypeCounts = {};
if (!_localState.moods) _localState.moods = {};
function saveLocalState() { try { localStorage.setItem("praxis_state", JSON.stringify(_localState)); } catch (e) {} }

/* ===========================
   Toast helper
   =========================== */

const toastEl = $id("toast"), toastTitleEl = $id("toastTitle"), toastBodyEl = $id("toastBody");
function showToast(title, body) {
  if (!toastEl) { console.info("TOAST:", title, body); return; }
  if (toastTitleEl) toastTitleEl.textContent = title || "";
  if (toastBodyEl) toastBodyEl.textContent = body || "";
  toastEl.classList.remove("active"); void toastEl.offsetWidth; toastEl.classList.add("active");
}

/* ===========================
   Auth / user helper (uses /api/auth/login)
   =========================== */

function getLocalUserId() { return localStorage.getItem("praxis_user_id"); }

async function ensureUser() {
  const uid = getLocalUserId();
  if (uid) return uid;
  try {
    const demoEmail = localStorage.getItem("praxis_demo_email") || prompt("Enter email for demo login", "kamaal@example.com") || "demo@example.com";
    if (demoEmail) {
      localStorage.setItem("praxis_demo_email", demoEmail);
      const r = await apiPost("/api/auth/login", { email: demoEmail, name: "Demo" });
      if (r) {
        const id = (r.user && r.user.id) || r.user_id || r.userId || (r.user && r.user.user_id) || (r.id);
        if (id) {
          localStorage.setItem("praxis_user_id", String(id));
          localStorage.setItem("praxis_logged_in", "true");
          return String(id);
        }
        if (r.user && r.user_id) {
          localStorage.setItem("praxis_user_id", String(r.user_id));
          localStorage.setItem("praxis_logged_in", "true");
          return String(r.user_id);
        }
      }
    }
  } catch (e) { console.warn("ensureUser failed", e); }
  return null;
}

/* ===========================
   Dashboard elements
   =========================== */

const topArchetypeChip = $id("topArchetypeChip");
const topStreakChip = $id("topStreakChip");
const dashboardArchetypeEmoji = $id("dashboardArchetypeEmoji");
const dashboardArchetypeName = $id("dashboardArchetypeName");
const dashboardArchetypeSummary = $id("dashboardArchetypeSummary");
const dashboardStreakText = $id("dashboardStreakText");
const dashboardBufferCount = $id("dashboardBufferCount");
const miniMoodArc = $id("miniMoodArc");
const archetypeBars = $id("archetypeBars");
const consistencyLabel = $id("consistencyLabel");
const consistencyFill = $id("consistencyFill");
const miniWeekRow = $id("miniWeekRow");
const miniFriendsRow = $id("miniFriendsRow");
const ctaDailyFromDashboard = $id("ctaDailyFromDashboard");

async function renderDashboard() {
  if (!dashboardArchetypeEmoji) return;
  const userId = await ensureUser().catch(()=>null);
  let session = null;
  if (userId) {
    try {
      const now = new Date();
      await apiGet(`/calendar/get?user_id=${userId}&year=${now.getFullYear()}&month=${now.getMonth()+1}`);
    } catch (e) { /* ignore */ }
  }
  session = _localState.sessions?.[todayKey()] || null;
  if (session && session.archetype) {
    const arch = archetypes.find(a => a.key === (session.archetype.key || session.archetype)) || { emoji: session.archetype.emoji || "✨", name: session.archetype.name || session.archetype };
    safeText(dashboardArchetypeEmoji, arch.emoji);
    safeText(dashboardArchetypeName, arch.name);
    safeText(dashboardArchetypeSummary, session.summary || "You’re slowly shifting over time. Check the calendar to see your trail.");
    if (topArchetypeChip) topArchetypeChip.textContent = `Today: ${arch.emoji} ${arch.name}`;
  } else {
    safeText(dashboardArchetypeEmoji, "🌀");
    safeText(dashboardArchetypeName, "No archetype yet");
    safeText(dashboardArchetypeSummary, "Complete today’s session to unlock today’s archetype.");
    if (topArchetypeChip) topArchetypeChip.textContent = "Today: —";
  }
  if (dashboardStreakText) {
    const stCount = _localState.streak?.count || 0;
    dashboardStreakText.textContent = `${stCount}-day streak`;
    if (topStreakChip) topStreakChip.textContent = `🔥 ${stCount}-day streak`;
    if (dashboardBufferCount) dashboardBufferCount.textContent = String(_localState.streak?.buffer || 0);
  }

  if (miniMoodArc) {
    miniMoodArc.innerHTML = "";
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const mood = _localState.moods[key] || 0;
      const dot = document.createElement("div");
      dot.className = "mini-arc-dot";
      dot.style.height = (mood ? 30 + mood * 4 : 20) + "px";
      const emojiSpan = document.createElement("span");
      emojiSpan.textContent = mood >= 8 ? "😄" : mood >= 5 ? "🙂" : mood >= 3 ? "😐" : mood > 0 ? "😔" : "·";
      dot.appendChild(emojiSpan);
      miniMoodArc.appendChild(dot);
    }
  }

  if (archetypeBars) {
    archetypeBars.innerHTML = "";
    const totalDays = Object.keys(_localState.sessions || {}).length || 1;
    archetypes.forEach(a => {
      const count = _localState.archetypeCounts?.[a.key] || 0;
      const row = document.createElement("div"); row.className = "bar-row";
      const label = document.createElement("div"); label.className = "bar-label"; label.textContent = `${a.emoji} ${a.name}`;
      const bar = document.createElement("div"); bar.className = "bar";
      const fill = document.createElement("div"); fill.className = "bar-fill";
      const fraction = count / totalDays;
      fill.style.transform = `scaleX(${fraction || 0.02})`;
      bar.appendChild(fill); row.appendChild(label); row.appendChild(bar); archetypeBars.appendChild(row);
    });
  }

  if (consistencyLabel && consistencyFill) {
    let last30Count = 0;
    const todayDate = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(todayDate);
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const s = _localState.sessions?.[key];
      if (s && s.completed) last30Count++;
    }
    consistencyLabel.textContent = `${last30Count} / 30 days`;
    consistencyFill.style.transform = `scaleX(${last30Count / 30 || 0.01})`;
  }

  if (miniWeekRow) {
    miniWeekRow.innerHTML = "";
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = todayKey(d);
      const sess = _localState.sessions?.[key];
      const div = document.createElement("div"); div.className = "calendar-mini-day";
      const dateSpan = document.createElement("span"); dateSpan.className = "date"; dateSpan.textContent = d.getDate();
      const emojiSpan = document.createElement("span"); emojiSpan.textContent = (sess && sess.archetype ? (sess.archetype.emoji || sess.archetype) : "·");
      div.appendChild(dateSpan); div.appendChild(emojiSpan); miniWeekRow.appendChild(div);
    }
  }

  if (miniFriendsRow) {
    miniFriendsRow.innerHTML = "";
    const mf = getMockFriends().slice(0, 3);
    mf.forEach(f => {
      const chip = document.createElement("div"); chip.className = "friend-chip";
      const av = document.createElement("div"); av.className = "friend-chip-avatar"; av.textContent = f.emoji;
      const text = document.createElement("div"); text.textContent = `${f.name} · 🔥 ${f.streak}`;
      chip.appendChild(av); chip.appendChild(text); miniFriendsRow.appendChild(chip);
    });
  }

  syncDashboardCTA();
}

/* helper used above */
function randomArchetype() { return archetypes[Math.floor(Math.random() * archetypes.length)]; }

function getMockFriends() {
  return [
    { name: "Aria", handle: "@aria", emoji: "🌙", archetype: "Mystic", streak: 21, today: "🔮" },
    { name: "Ravi", handle: "@ravi", emoji: "🔥", archetype: "Rebel", streak: 7, today: "🔥" },
    { name: "Sara", handle: "@sara", emoji: "💙", archetype: "Empath", streak: 3, today: "💙" },
    { name: "Imran", handle: "@imran", emoji: "🧠", archetype: "Analyst", streak: 2, today: "🧠" }
  ];
}

/* Changes the dashboard CTA text depending on whether a session exists */
// hide dashboard CTA entirely (remove the "Do another session / Start today's Praxis" pill)
function syncDashboardCTA() {
  if (!ctaDailyFromDashboard) return;
  ctaDailyFromDashboard.style.display = "none";
  try { ctaDailyFromDashboard.onclick = null; } catch (e) {}
}

/* ===========================
   Daily Session flow (client)
   =========================== */

const dailyContainer = $id("dailyContainer");
let sessionQuestions = [];
let sessionAnswers = [];
let currentQuestionIndex = 0;
let currentMoodEmoji = null;
let timerInterval = null;
let timerProgress = 0;
let ritualCompleted = false;
let ritualDuration = 45;
let serverSessionId = null;

function resetDailySessionState() {
  sessionQuestions = []; sessionAnswers = []; currentQuestionIndex = 0;
  currentMoodEmoji = null; timerInterval = null; timerProgress = 0; ritualCompleted = false; serverSessionId = null;
}

/* Fisher–Yates shuffle */
function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/* startDailySession: picks 5 randomized questions; tries server but proceeds offline even if server not available */
async function startDailySession() {
  if (!dailyContainer) return;
  // Guard: if today's session already completed, do not start a fresh one (removes replay)
  const existing = _localState.sessions?.[todayKey()];
  if (existing && existing.completed) {
    renderAfterCompletionShort(); // show completed UI, don't restart
    return;
  }

  resetDailySessionState();
  renderDailySplash();

  let userId = null;
  try { userId = await ensureUser().catch(()=>null); } catch(e){ userId = null; }

  let gotFromServer = false;

  if (userId) {
    try {
      const tryPaths = ["/session/start", "/api/session/start", "/api/session"];
      for (const p of tryPaths) {
        try {
          const resp = await apiPost(p, { user_id: userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
          if (!resp) continue;
          if (Array.isArray(resp.questions) && resp.questions.length) {
            sessionQuestions = resp.questions.map(q => (typeof q === "string" ? q : (q.text || q)));
            serverSessionId = resp.session_id || resp.id || null;
            gotFromServer = true;
            break;
          }
          if (resp.session && Array.isArray(resp.session.questions)) {
            sessionQuestions = resp.session.questions.map(q => (typeof q === "string" ? q : (q.text || q)));
            serverSessionId = resp.session.id || resp.session.session_id || null;
            gotFromServer = true;
            break;
          }
        } catch (err) { /* ignore and try next path */ }
      }
    } catch (e) { /* ignore server issues */ }
  }

  if (!gotFromServer) {
    sessionQuestions = shuffle(sampleQuestions).slice(0, 5);
    serverSessionId = null;
  } else {
    if (sessionQuestions.length > 5) sessionQuestions = shuffle(sessionQuestions).slice(0, 5);
  }

  sessionAnswers = new Array(sessionQuestions.length).fill(null);
  currentQuestionIndex = 0;
  currentMoodEmoji = null;
  ritualCompleted = false;

  renderQuestionStep();
}

/* swipe handlers */
let swipeStartX = null;
function handleSwipeStart(e) { swipeStartX = e.clientX || (e.touches && e.touches[0] && e.touches[0].clientX) || null; }
function handleSwipeEnd(e) {
  if (swipeStartX == null) return;
  const currentX = e.clientX || (e.changedTouches && e.changedTouches[0] && e.changedTouches[0].clientX) || null;
  if (currentX == null) { swipeStartX = null; return; }
  const deltaX = currentX - swipeStartX;
  if (deltaX > 80 && currentQuestionIndex > 0) {
    sessionAnswers[currentQuestionIndex] = sessionAnswers[currentQuestionIndex] || 5;
    currentQuestionIndex--; renderQuestionStep();
  } else if (deltaX < -80 && currentQuestionIndex < sessionQuestions.length - 1) {
    sessionAnswers[currentQuestionIndex] = sessionAnswers[currentQuestionIndex] || 5;
    currentQuestionIndex++; renderQuestionStep();
  }
  swipeStartX = null;
}

/* renderQuestionStep builds the slider/question UI (quick-emotion UI removed) */
function renderQuestionStep() {
  if (!dailyContainer) return;
  dailyContainer.innerHTML = "";

  const stepWrap = document.createElement("div");
  stepWrap.className = "card glass";

  const progressRow = document.createElement("div");
  progressRow.className = "session-progress";
  const stepText = document.createElement("div");
  stepText.textContent = `Question ${currentQuestionIndex + 1} of ${sessionQuestions.length}`;
  const progressBar = document.createElement("div");
  progressBar.className = "progress-bar";
  const progressFill = document.createElement("div");
  progressFill.className = "progress-fill";
  const fraction = currentQuestionIndex / Math.max(1, sessionQuestions.length);
  progressFill.style.transform = `scaleX(${Math.max(0.03, fraction)})`;
  progressBar.appendChild(progressFill);
  progressRow.appendChild(stepText);
  progressRow.appendChild(progressBar);
  stepWrap.appendChild(progressRow);

  const qCard = document.createElement("div");
  qCard.className = "question-card";
  qCard.addEventListener("pointerdown", handleSwipeStart, { passive: true });
  qCard.addEventListener("pointerup", handleSwipeEnd, { passive: true });
  qCard.addEventListener("touchstart", handleSwipeStart, { passive: true });
  qCard.addEventListener("touchend", handleSwipeEnd, { passive: true });

  const meta = document.createElement("div");
  meta.className = "question-meta";
  const metaLeft = document.createElement("span");
  metaLeft.textContent = "Present-focused";
  const metaRight = document.createElement("span");
  metaRight.textContent = "Swipe to answer →";
  meta.appendChild(metaLeft);
  meta.appendChild(metaRight);

  const qText = document.createElement("div");
  qText.className = "question-text";
  qText.textContent = sessionQuestions[currentQuestionIndex];
  const holdHint = document.createElement("span");
  holdHint.className = "hold-hint";
  holdHint.textContent = "Press & hold (or long tap) to focus just on this question.";
  qText.appendChild(holdHint);
  let holdTimeout;
  qText.addEventListener("pointerdown", () => {
    holdTimeout = setTimeout(() => { qText.style.fontSize = "18px"; }, 350);
  });
  const resetQText = () => {
    clearTimeout(holdTimeout);
    qText.style.fontSize = "15px";
  };
  qText.addEventListener("pointerup", resetQText);
  qText.addEventListener("pointerleave", resetQText);

  const sliderRow = document.createElement("div");
  sliderRow.className = "slider-row";
  const labels = document.createElement("div");
  labels.className = "slider-labels";
  const l1 = document.createElement("span"); l1.textContent = "Not at all";
  const l2 = document.createElement("span"); l2.textContent = "Totally";
  labels.appendChild(l1); labels.appendChild(l2);

  const range = document.createElement("input");
  range.type = "range";
  range.min = "1";
  range.max = "10";
  range.value = sessionAnswers[currentQuestionIndex] || 5;
  range.className = "range-input";
  sliderRow.appendChild(labels);
  sliderRow.appendChild(range);

  const swipeHints = document.createElement("div");
  swipeHints.className = "swipe-hints";
  const hintText = document.createElement("span"); hintText.textContent = "Swipe left/right or use buttons.";
  const swipeBtns = document.createElement("div"); swipeBtns.className = "swipe-btns";
  const prevBtn = document.createElement("button"); prevBtn.className = "swipe-btn"; prevBtn.innerHTML = "← Back";
  prevBtn.disabled = currentQuestionIndex === 0;
  prevBtn.addEventListener("click", () => {
    sessionAnswers[currentQuestionIndex] = parseInt(range.value, 10);
    if (currentQuestionIndex > 0) {
      currentQuestionIndex--;
      renderQuestionStep();
    }
  });
  const nextBtn = document.createElement("button"); nextBtn.className = "swipe-btn";
  nextBtn.innerHTML = currentQuestionIndex === sessionQuestions.length - 1 ? "Finish →" : "Next →";
  nextBtn.addEventListener("click", () => {
    sessionAnswers[currentQuestionIndex] = parseInt(range.value, 10);
    if (currentQuestionIndex < sessionQuestions.length - 1) {
      currentQuestionIndex++;
      renderQuestionStep();
    } else {
      renderSessionSummary();
    }
  });
  swipeBtns.appendChild(prevBtn);
  swipeBtns.appendChild(nextBtn);
  swipeHints.appendChild(hintText);
  swipeHints.appendChild(swipeBtns);

  qCard.appendChild(meta);
  qCard.appendChild(qText);
  qCard.appendChild(sliderRow);
  qCard.appendChild(swipeHints);

  stepWrap.appendChild(qCard);
  dailyContainer.appendChild(stepWrap);
}

/* Session summary = aggregation & prepare for ritual */
function renderSessionSummary() {
  if (!dailyContainer) return;
  dailyContainer.innerHTML = "";
  const card = document.createElement("div"); card.className = "card glass summary-card";

  const title = document.createElement("div"); title.className = "completion-title"; title.textContent = "Today’s emotional signature";
  const sub = document.createElement("div"); sub.className = "completion-sub"; sub.textContent = "We’ll compress your answers into one small nudge.";

  const summaryBadges = document.createElement("div"); summaryBadges.className = "summary-badges";

  const avg = sessionAnswers.reduce((a,b)=>a+(b||5),0)/Math.max(1,sessionAnswers.length);
  const axisLogicEmotionVal = avg;
  const axisActionReflectionVal = 11 - avg;
  const axis1 = document.createElement("div"); axis1.className = "summary-pill";
  axis1.innerHTML = "🧮 Logic vs Emotion · <strong>" + (axisLogicEmotionVal >= 6 ? "Emotion-tilted" : "Logic-tilted") + "</strong>";
  const axis2 = document.createElement("div"); axis2.className = "summary-pill";
  axis2.innerHTML = "⚡ Action vs Reflection · <strong>" + (axisActionReflectionVal >= 6 ? "Reflection-heavy" : "Action-heavy") + "</strong>";
  const moodPill = document.createElement("div"); moodPill.className = "summary-pill";
  moodPill.innerHTML = "🎭 Mood · " + (currentMoodEmoji || "mixed") + " · " + avg.toFixed(1) + "/10";

  summaryBadges.appendChild(axis1);
  summaryBadges.appendChild(axis2);
  summaryBadges.appendChild(moodPill);

  const btnRow = document.createElement("div");
  btnRow.style.display = "flex"; btnRow.style.gap = "8px"; btnRow.style.marginTop = "10px";

  const primary = document.createElement("button"); primary.className = "btn btn-full";
  primary.innerHTML = '<span class="emoji">📜</span> See today’s guidance';
  primary.addEventListener("click", renderRitualScreen);

  const secondary = document.createElement("button"); secondary.className = "btn-secondary btn btn-full";
  secondary.textContent = "Review my answers";
  secondary.addEventListener("click", () => renderQuestionStep());

  btnRow.appendChild(primary); btnRow.appendChild(secondary);

  card.appendChild(title); card.appendChild(sub); card.appendChild(summaryBadges); card.appendChild(btnRow);
  dailyContainer.appendChild(card);
}

/* Ritual screen */
async function renderRitualScreen() {
  if (!dailyContainer) return;
  dailyContainer.innerHTML = "";

  if (serverSessionId) {
    const payloadAnswers = sessionAnswers.map((v, idx) => ({ question_index: idx, value: v || 5 }));
    const resp = await apiPost("/session/submit", { session_id: serverSessionId, answers: payloadAnswers });
    if (resp && resp.dominant) {
      const arch = { name: resp.dominant, emoji: resp.emoji || "✨" };
      _localState.sessions = _localState.sessions || {};
      _localState.sessions[todayKey()] = { completed: true, archetype: arch, summary: resp.summary || resp.dominant, answeredCount: sessionAnswers.length, moodEmoji: currentMoodEmoji || "😐" };
      _localState.archetypeCounts = _localState.archetypeCounts || {};
      _localState.archetypeCounts[resp.dominant.toLowerCase()] = (_localState.archetypeCounts[resp.dominant.toLowerCase()] || 0) + 1;
      saveLocalState();
      const adviceText = (resp.advice || sampleAdvices[Math.floor(Math.random() * sampleAdvices.length)]);
      const ritualText = (resp.ritual || sampleRituals[Math.floor(Math.random() * sampleRituals.length)]);
      buildRitualScreen({ name: resp.dominant, emoji: resp.emoji || "✨" }, adviceText, ritualText);
      renderDashboard();
      return;
    }
  }

  const arch = randomArchetype();
  const advice = sampleAdvices[Math.floor(Math.random() * sampleAdvices.length)];
  const ritual = sampleRituals[Math.floor(Math.random() * sampleRituals.length)];
  buildRitualScreen(arch, advice, ritual);
}

/* Build ritual UI */
function buildRitualScreen(arch, advice, ritual) {
  if (!dailyContainer) return;
  const card = document.createElement("div"); card.className = "ritual-screen";

  const heading = document.createElement("div"); heading.className = "ritual-heading";
  heading.innerHTML = `${arch.emoji} Today, you’re in <strong>${arch.name}</strong> mode`;
  const sub = document.createElement("div"); sub.className = "ritual-sub"; sub.textContent = advice;
  const layout = document.createElement("div"); layout.className = "ritual-layout";

  const timerOrb = document.createElement("div"); timerOrb.className = "timer-orb";
  const timerCircle = document.createElement("div"); timerCircle.className = "timer-orb-circle";
  const timerInner = document.createElement("div"); timerInner.className = "timer-orb-inner"; timerInner.textContent = ritualDuration;
  const timerLabel = document.createElement("div"); timerLabel.className = "timer-orb-label"; timerLabel.textContent = "seconds";
  timerOrb.appendChild(timerCircle); timerOrb.appendChild(timerInner); timerOrb.appendChild(timerLabel);

  const steps = document.createElement("ul"); steps.className = "ritual-steps";
  ritual.split(". ").forEach(segment => { if (!segment.trim()) return; const li = document.createElement("li"); li.textContent = segment.trim(); steps.appendChild(li); });

  layout.appendChild(timerOrb); layout.appendChild(steps);

  const btnRow = document.createElement("div"); btnRow.style.display = "flex"; btnRow.style.gap = "8px"; btnRow.style.marginTop = "12px";
  const startBtn = document.createElement("button"); startBtn.className = "btn"; startBtn.innerHTML = '<span class="emoji">▶️</span> Start ritual';
  const skipBtn = document.createElement("button"); skipBtn.className = "btn-secondary btn"; skipBtn.textContent = "Skip ritual";

  startBtn.addEventListener("click", () => {
    if (timerInterval) return;
    let remaining = ritualDuration; timerInner.textContent = remaining; timerProgress = 0; timerCircle.style.transform = "rotate(0deg)";
    timerInterval = setInterval(() => {
      remaining--; timerInner.textContent = remaining;
      timerProgress = ((ritualDuration - remaining) / ritualDuration) * 270;
      timerCircle.style.transform = `rotate(${timerProgress}deg)`;
      if (remaining <= 0) {
        clearInterval(timerInterval); timerInterval = null; ritualCompleted = true; timerInner.textContent = "✓"; timerLabel.textContent = "Locked in";
        showToast("Ritual complete", "We’ll protect your streak once if you miss a day.");
      }
    }, 1000);
  });

  skipBtn.addEventListener("click", () => { ritualCompleted = false; renderCompletion(arch, advice, ritual); });

  btnRow.appendChild(startBtn); btnRow.appendChild(skipBtn);
  card.appendChild(heading); card.appendChild(sub); card.appendChild(layout); card.appendChild(btnRow);
  dailyContainer.appendChild(card);

  const continueCard = document.createElement("div"); continueCard.className = "card glass completion-card"; continueCard.style.marginTop = "8px";
  const cTitle = document.createElement("div"); cTitle.className = "completion-sub"; cTitle.textContent = "When you’re ready, we’ll stamp today on your calendar.";
  const cBtn = document.createElement("button"); cBtn.className = "btn btn-full"; cBtn.innerHTML = '<span class="emoji">📆</span> Mark today as complete';
  cBtn.addEventListener("click", () => renderCompletion(arch, advice, ritual));
  continueCard.appendChild(cTitle); continueCard.appendChild(cBtn); dailyContainer.appendChild(continueCard);
}

/* Emoji overlay elements (optional) */
const emojiDropOverlay = $id("emojiDropOverlay");
const emojiDropCalendar = $id("emojiDropCalendar");
const emojiDropEmoji = $id("emojiDropEmoji");
const closeEmojiOverlayBtn = $id("closeEmojiOverlayBtn");
if (closeEmojiOverlayBtn && emojiDropOverlay) closeEmojiOverlayBtn.addEventListener("click", () => emojiDropOverlay.classList.remove("active"));

async function syncCalendarWithServer(userId, dateStr, archetype) {
  // best-effort: try common calendar endpoints so server (if implemented) sees the new stamp
  if (!userId) return null;
  const payload = { user_id: userId, date: dateStr, archetype: (archetype && (archetype.name || archetype.key || archetype)) || archetype };
  const tryPaths = ["/calendar/mark", "/api/calendar/mark", "/calendar/add", "/api/calendar/add", "/api/session/mark_calendar"];
  for (const p of tryPaths) {
    try {
      const resp = await apiPost(p, payload);
      if (resp) return resp;
    } catch (e) {
      // ignore and try next
    }
  }
  return null;
}

/* render completion: persist locally and show final UI */
async function renderCompletion(arch, advice, ritual) {
  if (!dailyContainer) return;
  const avgMood = sessionAnswers.reduce((a,b) => a + (b || 5), 0) / Math.max(1, sessionAnswers.length);
  const moodScore = Math.round(avgMood);
  _localState.moods = _localState.moods || {};
  _localState.moods[todayKey()] = moodScore;

  const session = {
    date: todayKey(), completed: true, questions: sessionQuestions,
    answers: sessionAnswers.map((v,i)=>({question_index:i, value: v||5})),
    archetype: { key: (arch.name||"").toLowerCase(), name: arch.name, emoji: arch.emoji },
    advice, ritual,
    summary: `Today you showed a ${avgMood >= 6 ? "emotion-leaning" : "logic-leaning"} pattern with ${arch.name} vibes.`,
    moodEmoji: currentMoodEmoji || "😐", moodScore, answeredCount: sessionQuestions.length
  };

  // Try to sync with server session endpoint if available
  const userId = await ensureUser().catch(()=>null);
  if (userId && serverSessionId) {
    try {
      const resp = await apiPost("/session/submit", { session_id: serverSessionId, answers: session.answers });
      if (resp && resp.dominant) session.archetype = { key: resp.dominant.toLowerCase(), name: resp.dominant, emoji: resp.emoji || arch.emoji };
    } catch (e) { /* ignore server submit failure */ }
  }

  // persist locally
  _localState.sessions = _localState.sessions || {};
  _localState.sessions[todayKey()] = session;
  _localState.archetypeCounts = _localState.archetypeCounts || {};
  _localState.archetypeCounts[session.archetype.key] = (_localState.archetypeCounts[session.archetype.key] || 0) + 1;
  saveLocalState();

  // streak updates
  _localState.streak = _localState.streak || { count:0, buffer:0, lastDate:null };
  const today = new Date(todayKey());
  const lastDateStr = _localState.streak.lastDate;
  if (!lastDateStr) _localState.streak.count = 1;
  else {
    const lastDate = new Date(lastDateStr);
    const diffDays = Math.round((today - lastDate)/(1000*60*60*24));
    if (diffDays === 1) _localState.streak.count += 1;
    else if (diffDays === 2 || diffDays === 3) {
      if ((_localState.streak.buffer || 0) > 0) { _localState.streak.buffer -= 1; _localState.streak.count += 1; } else _localState.streak.count = 1;
    } else _localState.streak.count = 1;
  }
  if (ritualCompleted) _localState.streak.buffer = (_localState.streak.buffer || 0) + 1;
  _localState.streak.lastDate = todayKey();
  saveLocalState();

  // Immediately refresh UI: dashboard + calendar
  try {
    renderDashboard();
  } catch (e) { console.warn("renderDashboard failed after completion", e); }

  try {
    // refresh month grid so today's cell shows the new emoji immediately
    renderCalendar();
  } catch (e) { console.warn("renderCalendar failed after completion", e); }

  // Try to notify server calendar endpoints (best-effort)
  try {
    await syncCalendarWithServer(userId, todayKey(), session.archetype);
  } catch (e) { /* ignore */ }

  // Build completion UI
  dailyContainer.innerHTML = "";
  const card = document.createElement("div"); card.className = "card glass completion-card";
  const title = document.createElement("div"); title.className = "completion-title"; title.textContent = "You showed up today.";
  const sub = document.createElement("div"); sub.className = "completion-sub"; sub.textContent = `${arch.emoji} You moved like a ${arch.name} today.`;
  const streakRow = document.createElement("div"); streakRow.style.display = "flex"; streakRow.style.justifyContent = "center"; streakRow.style.marginBottom = "8px";
  const streakPill = document.createElement("div"); streakPill.className = "streak-pill";
  const flame = document.createElement("span"); flame.className = "flame"; flame.textContent = "🔥";
  const label = document.createElement("span"); label.textContent = `${_localState.streak.count || 1}-day streak · Buffers: ${_localState.streak.buffer || 0}`;
  streakPill.appendChild(flame); streakPill.appendChild(label); streakRow.appendChild(streakPill);

  const btn = document.createElement("button"); btn.className = "btn btn-full"; btn.innerHTML = '<span class="emoji">📆</span> Watch today’s emoji land';
  btn.addEventListener("click", () => openEmojiDropOverlay(session.archetype));

  const btn2 = document.createElement("a"); btn2.className = "btn-secondary btn btn-full"; btn2.textContent = "Back to dashboard"; btn2.style.marginTop = "6px";
  btn2.href = "dashboard.html";

  card.appendChild(title); card.appendChild(sub); card.appendChild(streakRow); card.appendChild(btn); card.appendChild(btn2);
  dailyContainer.appendChild(card);

  // If overlay exists, open it (this will visually show the today emoji)
  if (emojiDropOverlay) openEmojiDropOverlay(session.archetype);
}

/* After completion short card — REPLAY REMOVED */
function renderAfterCompletionShort() {
  if (!dailyContainer) return;
  const session = _localState.sessions?.[todayKey()];
  if (!session || !session.archetype) { renderDailySplash(); return; }
  dailyContainer.innerHTML = "";
  const card = document.createElement("div"); card.className = "card glass completion-card";
  const title = document.createElement("div"); title.className = "completion-title"; title.textContent = "Today’s Praxis is complete.";
  const sub = document.createElement("div"); sub.className = "completion-sub"; sub.textContent = `${session.archetype.emoji} You’re in ${session.archetype.name} mode.`;
  // Removed "Do another session" button to prevent replay
  const btn = document.createElement("a"); btn.className = "btn btn-full"; btn.innerHTML = '<span class="emoji">📆</span> Jump to calendar';
  btn.href = "calendar.html";
  btn.style.marginBottom = "8px";
  const btn2 = document.createElement("a"); btn2.className = "btn-secondary btn btn-full"; btn2.textContent = "Back to dashboard"; btn2.href = "dashboard.html";
  card.appendChild(title); card.appendChild(sub); card.appendChild(btn); card.appendChild(btn2);
  dailyContainer.appendChild(card);
}

/* ===========================
   Calendar rendering functions
   =========================== */

const calendarMonthLabel = $id("calendarMonthLabel");
const calendarGrid = $id("calendarGrid");
const calendarPrevBtn = $id("calendarPrevBtn");
const calendarNextBtn = $id("calendarNextBtn");
const calendarTodayBtn = $id("calendarTodayBtn");
const calendarDetailSheet = $id("calendarDetailSheet");
const detailDateLabel = $id("detailDateLabel");
const detailArchetypeLabel = $id("detailArchetypeLabel");
const detailQuestionsLabel = $id("detailQuestionsLabel");
const detailAdviceSummary = $id("detailAdviceSummary");
const detailRitualSummary = $id("detailRitualSummary");
const detailMoodSummary = $id("detailMoodSummary");

let calendarViewDate = new Date();

async function renderCalendar(viewDate = calendarViewDate) {
  if (!calendarGrid || !calendarMonthLabel) return;

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  calendarMonthLabel.textContent = viewDate.toLocaleDateString(undefined, { month: "long", year: "numeric" });
  calendarGrid.innerHTML = "";

  const weekdays = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
  weekdays.forEach(day => {
    const header = document.createElement("div");
    header.className = "calendar-day-header";
    header.textContent = day;
    calendarGrid.appendChild(header);
  });

  // first weekday of month (Monday=0)
  const firstDay = new Date(year, month, 1);
  const startDay = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < startDay; i++) {
    const empty = document.createElement("div");
    calendarGrid.appendChild(empty);
  }

  // local today string (uses same format as todayKey)
  const todayStr = todayKey(new Date());

  const userId = getLocalUserId();
  let stampsMap = {};

  if (userId) {
    try {
      const res = await apiGet(`/calendar/get?user_id=${userId}&year=${year}&month=${month+1}`);
      if (res && Array.isArray(res)) res.forEach(s => { if (s && s.date) stampsMap[s.date] = s; });
    } catch (e) {
      // non-fatal, fallback to local state
      console.warn("calendar server fetch failed", e);
    }
  }

  // helper to build local YYYY-MM-DD for a Date instance (ensures local timezone)
  function localKeyFor(date) {
    return todayKey(date);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const cell = document.createElement("div");
    cell.className = "calendar-tile";

    // create a local Date with (year, month, day) which is local-time safe
    const d = new Date(year, month, day);
    const key = localKeyFor(d);

    // prefer server stamp, otherwise local session
    const sess = stampsMap[key] || _localState.sessions?.[key];

    const dateSpan = document.createElement("div");
    dateSpan.className = "calendar-tile-date";
    dateSpan.textContent = day;

    const emojiSpan = document.createElement("div");
    emojiSpan.className = "calendar-tile-emoji";
    emojiSpan.textContent = (sess && sess.archetype ? (sess.archetype.emoji || sess.emoji || sess.archetype) : "·");

    if (!sess || !sess.completed) cell.classList.add("calendar-empty");
    if (key === todayStr) cell.classList.add("calendar-today-outline");

    cell.appendChild(dateSpan);
    cell.appendChild(emojiSpan);

    cell.addEventListener("click", () => {
      if (!calendarDetailSheet || !detailDateLabel || !detailArchetypeLabel || !detailQuestionsLabel || !detailAdviceSummary || !detailRitualSummary || !detailMoodSummary) return;
      calendarDetailSheet.style.display = "block";
      detailDateLabel.textContent = formatDateHuman(key);
      if (sess && sess.completed) {
        const archeName = (sess.archetype && (sess.archetype.name || sess.archetype)) || sess.archetype || sess.archetype;
        detailArchetypeLabel.textContent = `${(sess.archetype && (sess.archetype.emoji || "")) || (sess.emoji || "")} ${archeName}`;
        detailQuestionsLabel.textContent = `${sess.answeredCount || sess.questions_answered || 0} questions`;
        detailAdviceSummary.textContent = (sess.advice || "").slice(0,80) + ((sess.advice||"").length > 80 ? "…" : "");
        detailRitualSummary.textContent = (sess.ritual || "").slice(0,80) + ((sess.ritual||"").length > 80 ? "…" : "");
        detailMoodSummary.textContent = `${sess.moodEmoji || "—"} · ${sess.moodScore || sess.mood || 0}/10`;
      } else {
        detailArchetypeLabel.textContent = "No session";
        detailQuestionsLabel.textContent = "0 questions";
        detailAdviceSummary.textContent = "—";
        detailRitualSummary.textContent = "—";
        detailMoodSummary.textContent = "—";
      }
    });

    calendarGrid.appendChild(cell);
  }
}


// ---------- add/replace these date helpers near the top of your app.js ----------
// Always parse YYYY-MM-DD as a local date at midnight to avoid UTC shift issues.
function parseLocalDate(dateStr) {
  // dateStr expected as "YYYY-MM-DD" — create a local Date at midnight
  if (!dateStr || typeof dateStr !== "string") return new Date(dateStr);
  const parts = dateStr.split("-");
  if (parts.length < 3) return new Date(dateStr);
  const y = parseInt(parts[0], 10), m = parseInt(parts[1], 10), d = parseInt(parts[2], 10);
  if (Number.isNaN(y) || Number.isNaN(m) || Number.isNaN(d)) return new Date(dateStr);
  return new Date(y, m - 1, d);
}

// Replace your formatDateHuman with this version that uses parseLocalDate
function formatDateHuman(dateStr) {
  const d = parseLocalDate(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
// ---------- end helpers ----------

/* ===========================
   Friends view logic
   =========================== */

const friendsListEl = $id("friendsList");
const friendSearchInput = $id("friendSearchInput");
const friendSearchResults = $id("friendSearchResults");
const sendNudgeRandom = $id("sendNudgeRandom");

function renderFriends() {
  if (!friendsListEl) return;
  const friends = getMockFriends().sort((a,b)=>b.streak - a.streak);
  friendsListEl.innerHTML = "";
  friends.forEach(f => {
    const row = document.createElement("div"); row.className = "friend-row";
    const main = document.createElement("div"); main.className = "friend-main";
    const av = document.createElement("div"); av.className = "friend-avatar"; av.textContent = f.emoji;
    const info = document.createElement("div"); info.className = "friend-info";
    const name = document.createElement("div"); name.className = "friend-name"; name.textContent = f.name;
    const meta = document.createElement("div"); meta.className = "friend-meta"; meta.textContent = `${f.handle} · ${f.archetype}`;
    info.appendChild(name); info.appendChild(meta); main.appendChild(av); main.appendChild(info);
    const right = document.createElement("div"); right.className = "friend-right";
    const streak = document.createElement("div"); streak.textContent = `🔥 ${f.streak} days`;
    const today = document.createElement("div"); today.textContent = `Today: ${f.today}`;
    right.appendChild(streak); right.appendChild(today); row.appendChild(main); row.appendChild(right);
    row.addEventListener("click", () => showToast("Friend streak", `${f.name} is on a ${f.streak}-day streak. You’re not far behind.`));
    friendsListEl.appendChild(row);
  });
}

if (friendSearchInput && friendSearchResults) {
  friendSearchInput.addEventListener("input", async () => {
    const q = friendSearchInput.value.trim().toLowerCase();
    friendSearchResults.innerHTML = "";
    if (!q) return;
    const res = await apiGet(`/friends/search?q=${encodeURIComponent(q)}`);
    if (res && res.length) {
      res.forEach(r => {
        const chip = document.createElement("div"); chip.className = "chip"; chip.textContent = `${r.username || r.name} · 🔥 0`;
        chip.addEventListener("click", async () => showToast("Friend request sent", `We’ll send a soft “Hey ${r.name}, someone wants to buddy up.”`));
        friendSearchResults.appendChild(chip);
      });
    } else {
      const chip = document.createElement("div"); chip.className = "chip"; chip.textContent = "No users found.";
      friendSearchResults.appendChild(chip);
    }
  });
}

if (sendNudgeRandom) {
  sendNudgeRandom.addEventListener("click", () => {
    const friends = getMockFriends(); const f = friends[Math.floor(Math.random() * friends.length)];
    const nudges = ["You got this. 2 minutes only.","Tiny step > perfect plan.","Today counts, even if it’s small."];
    showToast("Nudge sent", `${f.name}: “${nudges[Math.floor(Math.random() * nudges.length)]}”`);
  });
}

/* ===========================
   Profile / theme toggles
   =========================== */

document.querySelectorAll(".toggle-switch").forEach(t => t.addEventListener("click", () => t.classList.toggle("active")));
document.querySelectorAll(".theme-chip").forEach(c => c.addEventListener("click", () => {
  document.querySelectorAll(".theme-chip").forEach(x => x.classList.remove("active")); c.classList.add("active");
  const theme = c.getAttribute("data-theme");
  if (theme === "calm") document.body.style.background = "";
  else if (theme === "playful") document.body.style.background = "radial-gradient(circle at top, #4c1d95, #020617 60%, #000 100%)";
  else document.body.style.background = "#020617";
}));

/* ===========================
   Dark/Light theme toggle
   =========================== */

const themeToggleBtn = $id("themeToggleBtn");
const themeToggleIcon = $id("themeToggleIcon");
function applyTheme(theme) {
  if (!themeToggleIcon) return;
  if (theme === "light") { document.body.classList.add("light-mode"); themeToggleIcon.textContent = "☀️"; }
  else { document.body.classList.remove("light-mode"); themeToggleIcon.textContent = "🌙"; }
  localStorage.setItem("praxis_theme", theme);
}
const savedTheme = localStorage.getItem("praxis_theme") || "dark"; applyTheme(savedTheme);
if (themeToggleBtn) themeToggleBtn.addEventListener("click", () => { const current = document.body.classList.contains("light-mode") ? "light" : "dark"; applyTheme(current === "light" ? "dark" : "light"); });

/* ===========================
   Login guard / auth UI
   =========================== */

function checkLogin() {
  const loggedIn = localStorage.getItem("praxis_logged_in") === "true";
  const overlay = $id("loginOverlay");
  if (overlay) {
    if (loggedIn) overlay.classList.add("hidden"); else overlay.classList.remove("hidden");
  } else {
    if (!loggedIn) {
      try { if (!window.location.pathname.endsWith("/auth.html") && !window.location.pathname.endsWith("/auth")) window.location.href = "auth.html"; } catch (e) {}
    }
  }
}

/* ===========================
   Emoji drop overlay (visual)
   =========================== */

function openEmojiDropOverlay(arch) {
  if (!emojiDropOverlay || !emojiDropCalendar || !emojiDropEmoji) return;
  emojiDropEmoji.textContent = arch.emoji || "✨"; emojiDropCalendar.innerHTML = "";
  const now = new Date(); const year = now.getFullYear(); const month = now.getMonth();
  const firstDay = new Date(year, month, 1); const startDay = (firstDay.getDay() + 6) % 7; const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let i = 0; i < startDay; i++) { const tile = document.createElement("div"); tile.className = "calendar-tile calendar-empty"; emojiDropCalendar.appendChild(tile); }
  const todayDate = now.getDate();
  for (let day = 1; day <= daysInMonth; day++) {
    const tile = document.createElement("div"); tile.className = "calendar-tile";
    const dateSpan = document.createElement("div"); dateSpan.className = "calendar-tile-date"; dateSpan.textContent = day;
    const emojiSpan = document.createElement("div"); emojiSpan.className = "calendar-tile-emoji";
    const key = todayKey(new Date(year, month, day));
    const sess = _localState.sessions?.[key];
    emojiSpan.textContent = sess && sess.archetype ? (sess.archetype.emoji || sess.emoji) : "";
    tile.appendChild(dateSpan); tile.appendChild(emojiSpan); emojiDropCalendar.appendChild(tile);
    if (day === todayDate) {
      setTimeout(() => {
        const rect = tile.getBoundingClientRect(); const parentRect = emojiDropCalendar.getBoundingClientRect();
        const glow = document.createElement("div"); glow.className = "emoji-drop-today";
        glow.style.left = rect.left - parentRect.left + "px"; glow.style.top = rect.top - parentRect.top + "px";
        glow.style.width = rect.width + "px"; glow.style.height = rect.height + "px"; emojiDropCalendar.appendChild(glow);
        tile.querySelector(".calendar-tile-emoji").textContent = arch.emoji || "✨";
      }, 600);
    }
  }
  emojiDropOverlay.classList.add("active");
}

/* ===========================
   Init: render pages safely
   =========================== */

async function renderDailyView() {
  if (!dailyContainer) return;
  dailyContainer.innerHTML = "";
  const userId = await ensureUser().catch(()=>null);
  if (userId) {
    try {
      const resp = await apiPost("/session/start", { user_id: userId, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone });
      if (resp && resp.session_id) {
        serverSessionId = resp.session_id;
        const local = _localState.sessions?.[todayKey()];
        if (local && local.completed) { renderAfterCompletionShort(); return; }
        renderDailySplash(); return;
      }
    } catch (e) { /* ignore */ }
  }
  const localSess = _localState.sessions?.[todayKey()];
  if (localSess && localSess.completed) renderAfterCompletionShort(); else renderDailySplash();
}

function renderDailySplash() {
  if (!dailyContainer) return;
  dailyContainer.innerHTML = "";
  const div = document.createElement("div"); div.className = "splash-gradient";
  const heading = document.createElement("div"); heading.className = "splash-heading"; heading.textContent = "New day. New questions.";
  const text = document.createElement("div"); text.className = "splash-text"; text.textContent = "In under 2 minutes, we’ll listen to how you feel and give you one tiny shift for today.";
  const bottom = document.createElement("div"); bottom.className = "splash-bottom";
  const left = document.createElement("div"); left.textContent = "No courses. No feed. Just one small practice.";
  const orbit = document.createElement("div"); orbit.className = "orbit-row";
  ["🧭","💙","🔥"].forEach(e => { const dot = document.createElement("div"); dot.className = "orbit-dot"; dot.textContent = e; orbit.appendChild(dot); });
  bottom.appendChild(left); bottom.appendChild(orbit);
  const btn = document.createElement("button"); btn.className = "btn btn-full";
  btn.innerHTML = '<span class="emoji">✨</span> Begin today’s Praxis'; btn.style.marginTop = "16px";
  btn.addEventListener("click", () => startDailySession());
  div.appendChild(heading); div.appendChild(text); div.appendChild(bottom); div.appendChild(btn);
  dailyContainer.appendChild(div);
}

/* Run init safely */
function initAll() {
  try { renderDashboard(); renderCalendar(); renderFriends(); renderDailyView(); checkLogin(); } catch (e) { console.error("initAll error", e); }
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initAll); else initAll();
