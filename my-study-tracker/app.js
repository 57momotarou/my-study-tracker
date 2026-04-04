// ============================================================
// my-study-tracker - app.js
// 初期化・状態管理・ナビゲーション・共通ヘルパー
// ============================================================

// ── ストレージキー ──
const KEYS = {
  enrollments: 'cp-enrollments',
  progress: 'cp-progress',
  currentSem: 'cp-current-sem',
};

// ── 状態 ──
let state = {
  currentSemesterId: 1,
  enrollments: {},
  progress: {},
  activeSubjectFilter: 'all',
};

// ============================================================
// 初期化
// ============================================================
document.addEventListener('DOMContentLoaded', () => {
  loadState();
  setupNav();
  render();
  registerSW();
});

function loadState() {
  try {
    const e = localStorage.getItem(KEYS.enrollments);
    state.enrollments = e ? JSON.parse(e) : {};
    const p = localStorage.getItem(KEYS.progress);
    state.progress = p ? JSON.parse(p) : {};
    const c = localStorage.getItem(KEYS.currentSem);
    state.currentSemesterId = c ? parseInt(c) : 1;
    // 移行処理：旧コマ単位（最大15）→ 新章単位（最大60）
    // 値が章数の最大値(60)以下かつコマ数の最大値(15)以下なら旧データと判断して4倍に変換
    let migrated = false;
    Object.keys(state.progress).forEach(code => {
      const val = state.progress[code];
      if (val > 0 && val <= 15) {
        state.progress[code] = val * 4;
        migrated = true;
      }
    });
    if (migrated) saveState();
  } catch(err) { console.error(err); }
}

function saveState() {
  localStorage.setItem(KEYS.enrollments, JSON.stringify(state.enrollments));
  localStorage.setItem(KEYS.progress, JSON.stringify(state.progress));
  localStorage.setItem(KEYS.currentSem, String(state.currentSemesterId));
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const newWorker = reg.installing;
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'activated') window.location.reload();
      });
    });
  });
  navigator.serviceWorker.ready.then(reg => reg.update());
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data === 'RELOAD') window.location.reload();
  });
}

// ============================================================
// ナビゲーション
// ============================================================
function setupNav() {
  // ヘッダー歯車ボタン → 設定ページへ（ナビのハイライトは外す）
  document.getElementById('header-settings-btn').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-settings').classList.add('active');
    renderSettingsPage();
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${target}`).classList.add('active');
      if (target === 'today')    renderToday();
      if (target === 'schedule') renderSchedulePage();
      if (target === 'settings') renderSettingsPage();
      if (target === 'badges')   renderBadgesPage();
      if (target === 'progress') renderProgressPage();
    });
  });
}

function render() {
  renderHeader();
  renderToday();
  renderSchedulePage();
  renderSettingsPage();
  renderBadgesPage();
  renderProgressPage();
}

// ============================================================
// 共通ヘルパー
// ============================================================
function getCurrentSemester() {
  return SEMESTERS.find(s => s.id === state.currentSemesterId) || SEMESTERS[0];
}

function getEnrolledCodes(semId) {
  return state.enrollments[semId] || [];
}

function getEnrolledSubjects(semId) {
  const codes = getEnrolledCodes(semId);
  return codes.map(code => ALL_SUBJECTS.find(s => s.code === code)).filter(Boolean);
}

function getCompletedLessons(code) {
  return state.progress[code] || 0;
}

function getTotalCredits(semId) {
  return getEnrolledSubjects(semId).reduce((a, s) => a + s.credits, 0);
}

function getTotalCreditsAll() {
  let total = 0;
  SEMESTERS.forEach(sem => total += getTotalCredits(sem.id));
  return total;
}

function getCategoryColor(category) {
  return (CATEGORY_CONFIG[category] || {}).color || '#64748b';
}

// ============================================================
// ヘッダー
// ============================================================
function renderHeader() {
  const sem = getCurrentSemester();
  document.getElementById('header-semester').textContent = sem.name;
}

// ============================================================
// 章記録（1コマ=4章、通し章番号で管理）
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const current = getCompletedLessons(code);
  if (chapterNum === current + 1) state.progress[code] = chapterNum;      // 次の章を完了
  else if (chapterNum === current) state.progress[code] = chapterNum - 1; // 最後の章を取り消し
  else return;
  saveState();
  renderProgressPage();
  renderToday();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}

// 後方互換：旧toggleLesson呼び出しがあった場合のフォールバック
function toggleLesson(code, lessonNum, semId) {
  toggleChapter(code, lessonNum * 4, semId);
}
