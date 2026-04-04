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
  renderSemesterTabs();
  renderToday();
  renderSchedulePage();
  renderSettingsPage();
  renderBadgesPage();
  renderProgressPage();
}

// ============================================================
// ヘッダー直下の学期タブ（常時横並び表示）
// ============================================================
function renderSemesterTabs() {
  const el = document.getElementById('header-sem-row');
  if (!el) return;
  el.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const isCurrent = sem.id === state.currentSemesterId;
    const btn = document.createElement('button');
    btn.className = 'header-sem-btn' + (isCurrent ? ' active' : '');
    btn.textContent = sem.name.replace('年度', '').replace('学期', 'S');
    btn.title = sem.name;
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderSemesterTabs();
      // 現在表示中ページを再描画
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        const id = activePage.id;
        if (id === 'page-today')    renderToday();
        if (id === 'page-progress') renderProgressPage();
        if (id === 'page-schedule') renderSchedulePage();
        if (id === 'page-badges')   renderBadgesPage();
        if (id === 'page-settings') renderSettingsPage();
      }
    });
    el.appendChild(btn);
  });
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
// 章グリッド共通ビルダー
// ※ グリッド内のボタンクリックが親（アコーディオントグル）に
//   伝播しないよう、wrapperに stopPropagation を設定
// ============================================================
function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const CPL     = 4;
  const wrapper = document.createElement('div');
  // ★ イベント伝播を止める（これがタップ競合の根本修正）
  wrapper.addEventListener('click', e => e.stopPropagation());
  wrapper.addEventListener('touchend', e => e.stopPropagation());

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

  // innerHTML で生成したボタンにも stopPropagation を適用
  wrapper.querySelectorAll('.lesson-btn').forEach(btn => {
    btn.addEventListener('click', e => e.stopPropagation());
  });

  return wrapper;
}
