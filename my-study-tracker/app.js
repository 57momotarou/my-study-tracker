// ============================================================
// my-study-tracker - app.js
// 初期化・状態管理・ナビゲーション・共通ヘルパー
// ============================================================

const KEYS = {
  enrollments: 'cp-enrollments',
  progress: 'cp-progress',
  currentSem: 'cp-current-sem',
};

let state = {
  currentSemesterId: 1,
  enrollments: {},
  progress: {},
  activeSubjectFilter: 'all',
};

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
    // 移行処理：旧コマ単位→新章単位
    let migrated = false;
    Object.keys(state.progress).forEach(code => {
      const val = state.progress[code];
      if (val > 0 && val <= 15) { state.progress[code] = val * 4; migrated = true; }
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
  document.getElementById('header-settings-btn').addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-settings').classList.add('active');
    renderSettingsPage();
  });

  // 学期切り替えボタン
  document.getElementById('header-semester-btn').addEventListener('click', () => {
    toggleSemesterDrawer();
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
// 学期切り替えドロワー
// ============================================================
function toggleSemesterDrawer() {
  const drawer = document.getElementById('semester-drawer');
  const overlay = document.getElementById('semester-drawer-overlay');
  const isOpen = drawer.style.display !== 'none';
  if (isOpen) {
    closeSemesterDrawer();
  } else {
    // リストを構築
    const listEl = document.getElementById('semester-drawer-list');
    listEl.innerHTML = '';
    SEMESTERS.forEach(sem => {
      const isCurrent = sem.id === state.currentSemesterId;
      const btn = document.createElement('button');
      btn.style.cssText = `
        width:100%;text-align:left;padding:10px 12px;border-radius:8px;border:none;
        background:${isCurrent ? 'var(--amber-dim)' : 'var(--bg3)'};
        color:${isCurrent ? 'var(--amber)' : 'var(--text2)'};
        font-size:13px;font-weight:${isCurrent ? '700' : '400'};
        font-family:'Noto Sans JP',sans-serif;cursor:pointer;
        display:flex;align-items:center;justify-content:space-between;
      `;
      const codes = getEnrolledCodes(sem.id);
      btn.innerHTML = `
        <span>${sem.name}</span>
        <span style="font-size:11px;color:var(--text3)">${codes.length}科目</span>
      `;
      if (isCurrent) btn.innerHTML += `<span style="margin-left:4px;color:var(--amber)">✓</span>`;
      btn.addEventListener('click', () => {
        state.currentSemesterId = sem.id;
        saveState();
        closeSemesterDrawer();
        renderHeader();
        // 現在表示中のタブを再描画
        const activePage = document.querySelector('.page.active');
        if (activePage) {
          const pageId = activePage.id;
          if (pageId === 'page-today')    renderToday();
          if (pageId === 'page-progress') renderProgressPage();
          if (pageId === 'page-schedule') renderSchedulePage();
          if (pageId === 'page-badges')   renderBadgesPage();
        }
      });
      listEl.appendChild(btn);
    });
    drawer.style.display = 'block';
    overlay.style.display = 'block';
  }
}

function closeSemesterDrawer() {
  document.getElementById('semester-drawer').style.display = 'none';
  document.getElementById('semester-drawer-overlay').style.display = 'none';
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
// 章記録（1コマ=4章）
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const current = getCompletedLessons(code);
  if (chapterNum === current + 1) state.progress[code] = chapterNum;
  else if (chapterNum === current) state.progress[code] = chapterNum - 1;
  else return;
  saveState();
  renderProgressPage();
  renderToday();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}

function toggleLesson(code, lessonNum, semId) {
  toggleChapter(code, lessonNum * 4, semId);
}
