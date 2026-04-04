// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = {
  enrollments: 'cp-enrollments',
  progress:    'cp-progress',
  currentSem:  'cp-current-sem',
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
    // 移行処理：旧コマ単位→章単位
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
  localStorage.setItem(KEYS.progress,    JSON.stringify(state.progress));
  localStorage.setItem(KEYS.currentSem,  String(state.currentSemesterId));
}

function registerSW() {
  if (!('serviceWorker' in navigator)) return;
  navigator.serviceWorker.register('./sw.js').then(reg => {
    reg.addEventListener('updatefound', () => {
      const w = reg.installing;
      w.addEventListener('statechange', () => {
        if (w.state === 'activated') window.location.reload();
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
// 学期切り替えドロワー（横並びピルボタン）
// ============================================================
function toggleSemesterDrawer() {
  const drawer  = document.getElementById('semester-drawer');
  const overlay = document.getElementById('semester-drawer-overlay');
  if (drawer.style.display !== 'none') {
    closeSemesterDrawer();
    return;
  }
  const listEl = document.getElementById('semester-drawer-list');
  listEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const isCurrent = sem.id === state.currentSemesterId;
    const codes = getEnrolledCodes(sem.id);
    const btn = document.createElement('button');
    // 横並びピルボタンスタイル
    btn.style.cssText = `
      flex-shrink:0;
      padding:8px 16px;
      border-radius:99px;
      border:1px solid ${isCurrent ? 'var(--amber)' : 'var(--border)'};
      background:${isCurrent ? 'var(--amber)' : 'var(--bg3)'};
      color:${isCurrent ? '#000' : 'var(--text2)'};
      font-size:12px;font-weight:${isCurrent ? '700' : '400'};
      font-family:'Noto Sans JP',sans-serif;
      cursor:pointer;white-space:nowrap;
      display:inline-flex;align-items:center;gap:6px;
    `;
    const countSpan = codes.length
      ? `<span style="font-size:10px;opacity:0.7">${codes.length}科目</span>`
      : '';
    btn.innerHTML = sem.name + countSpan;
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      closeSemesterDrawer();
      renderHeader();
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        const id = activePage.id;
        if (id === 'page-today')    renderToday();
        if (id === 'page-progress') renderProgressPage();
        if (id === 'page-schedule') renderSchedulePage();
        if (id === 'page-badges')   renderBadgesPage();
      }
    });
    listEl.appendChild(btn);
  });
  drawer.style.display  = 'block';
  overlay.style.display = 'block';
}

function closeSemesterDrawer() {
  document.getElementById('semester-drawer').style.display  = 'none';
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
  return getEnrolledCodes(semId)
    .map(code => ALL_SUBJECTS.find(s => s.code === code))
    .filter(Boolean);
}
function getCompletedLessons(code) {
  return state.progress[code] || 0;
}
function getCategoryColor(category) {
  return (CATEGORY_CONFIG[category] || {}).color || '#64748b';
}
function renderHeader() {
  document.getElementById('header-semester').textContent = getCurrentSemester().name;
}

// ============================================================
// 章記録（1コマ=4章）
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const current = getCompletedLessons(code);
  if      (chapterNum === current + 1) state.progress[code] = chapterNum;
  else if (chapterNum === current)     state.progress[code] = chapterNum - 1;
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

// ============================================================
// 章グリッド共通ビルダー（今日・進捗・先取り共通）
// ============================================================
function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const CPL = 4;
  const wrapper = document.createElement('div');
  let html = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:8px">';

  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateLesson = isLessonLate(lesson, s, sem);
    const thisWeek   = lesson <= recommended && lesson > doneLessons;
    const notYet     = !isLessonAvailable(lesson, s, sem);

    for (let ch = 1; ch <= CPL; ch++) {
      const chNum    = (lesson - 1) * CPL + ch;
      const isDone   = chNum <= doneChapters;
      const isLateC  = !isDone && lateLesson;
      const isWeekC  = !isDone && !isLateC && thisWeek;
      const isNotYet = !isDone && !isLateC && !isWeekC && notYet;

      let style = '';
      if (isDone)      style = `background:${color};color:#000`;
      else if (isLateC)  style = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
      else if (isWeekC)  style = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
      else if (isNotYet) style = 'opacity:0.25;pointer-events:none';

      const ml = ch === 1 && lesson > 1 ? 'margin-left:2px;' : '';
      html += `<button class="lesson-btn${isDone?' done':''}"
        onclick="toggleChapter('${s.code}',${chNum},${semId})"
        style="${style}${ml}"
        title="コマ${lesson} 第${ch}章">${lesson}-${ch}</button>`;
    }
  }
  html += '</div>';
  html += `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <div style="display:flex;gap:10px;font-size:10px;color:var(--text3)">
        <span><span style="color:${color}">■</span> 完了</span>
        <span><span style="color:var(--red)">■</span> 遅刻</span>
        <span><span style="color:var(--amber)">■</span> 今週</span>
        <span style="opacity:0.4">■ 未開講</span>
      </div>
      <button onclick="showDeadlineModal('${s.code}',${semId})" style="
        background:var(--bg3);border:1px solid var(--border);color:var(--text3);
        font-size:10px;padding:3px 10px;border-radius:99px;cursor:pointer;
        font-family:'Noto Sans JP',sans-serif;">締切一覧</button>
    </div>`;
  wrapper.innerHTML = html;
  return wrapper;
}
