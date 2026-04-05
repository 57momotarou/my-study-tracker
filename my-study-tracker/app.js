// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = { enrollments:'cp-enrollments', progress:'cp-progress', currentSem:'cp-current-sem' };

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
    state.enrollments = JSON.parse(localStorage.getItem(KEYS.enrollments) || '{}');
    state.progress    = JSON.parse(localStorage.getItem(KEYS.progress)    || '{}');
    const c = localStorage.getItem(KEYS.currentSem);
    state.currentSemesterId = c ? parseInt(c) : 1;
    let migrated = false;
    Object.keys(state.progress).forEach(code => {
      if (state.progress[code] > 0 && state.progress[code] <= 15) {
        state.progress[code] *= 4; migrated = true;
      }
    });
    if (migrated) saveState();
  } catch(e) { console.error(e); }
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
      w.addEventListener('statechange', () => { if (w.state === 'activated') location.reload(); });
    });
  });
  navigator.serviceWorker.ready.then(r => r.update());
  navigator.serviceWorker.addEventListener('message', e => { if (e.data==='RELOAD') location.reload(); });
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

  // 学期ドロワートリガー
  document.getElementById('header-sem-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    toggleSemDrawer();
  });

  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${target}`).classList.add('active');
      if (target==='today')    renderToday();
      if (target==='schedule') renderSchedulePage();
      if (target==='settings') renderSettingsPage();
      if (target==='badges')   renderBadgesPage();
      if (target==='progress') renderProgressPage();
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
// 学期ドロワー（ヘッダーボタン直下に位置指定）
// ============================================================
function toggleSemDrawer() {
  const drawer  = document.getElementById('sem-drawer');
  const overlay = document.getElementById('sem-overlay');
  if (drawer.style.display !== 'none') { closeSemDrawer(); return; }

  // ドロワーの位置をトリガーボタン直下に設定
  const trigger = document.getElementById('header-sem-trigger');
  const rect    = trigger.getBoundingClientRect();
  drawer.style.top  = (rect.bottom + 6) + 'px';
  drawer.style.left = rect.left + 'px';

  // リスト構築
  const listEl = document.getElementById('sem-drawer-list');
  listEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const isCurrent = sem.id === state.currentSemesterId;
    const codes     = getEnrolledCodes(sem.id);
    const item      = document.createElement('button');
    item.style.cssText = `
      display:flex;align-items:center;justify-content:space-between;gap:8px;
      width:100%;padding:8px 10px;border:none;border-radius:7px;
      background:${isCurrent ? 'var(--amber-dim)' : 'transparent'};
      color:${isCurrent ? 'var(--amber)' : 'var(--text2)'};
      font-size:13px;font-weight:${isCurrent ? '700' : '400'};
      font-family:'Noto Sans JP',sans-serif;cursor:pointer;
      text-align:left;white-space:nowrap;
    `;
    const nameSpan = document.createElement('span');
    nameSpan.textContent = sem.name;
    const countSpan = document.createElement('span');
    countSpan.style.cssText = 'font-size:10px;color:var(--text3)';
    countSpan.textContent = codes.length ? `${codes.length}科目` : '';
    item.appendChild(nameSpan);
    item.appendChild(countSpan);
    if (isCurrent) {
      const check = document.createElement('span');
      check.textContent = '✓';
      check.style.cssText = 'color:var(--amber);margin-left:4px';
      item.appendChild(check);
    }
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      state.currentSemesterId = sem.id;
      saveState();
      closeSemDrawer();
      renderHeader();
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        const id = activePage.id;
        if (id==='page-today')    renderToday();
        if (id==='page-progress') renderProgressPage();
        if (id==='page-schedule') renderSchedulePage();
        if (id==='page-badges')   renderBadgesPage();
        if (id==='page-settings') renderSettingsPage();
      }
    });
    listEl.appendChild(item);
  });

  drawer.style.display  = 'block';
  overlay.style.display = 'block';
}

function closeSemDrawer() {
  document.getElementById('sem-drawer').style.display  = 'none';
  document.getElementById('sem-overlay').style.display = 'none';
}

// ============================================================
// 共通ヘルパー
// ============================================================
function getCurrentSemester() {
  return SEMESTERS.find(s => s.id === state.currentSemesterId) || SEMESTERS[0];
}
function getEnrolledCodes(semId)   { return state.enrollments[semId] || []; }
function getEnrolledSubjects(semId) {
  return getEnrolledCodes(semId).map(c => ALL_SUBJECTS.find(s => s.code===c)).filter(Boolean);
}
function getCompletedLessons(code) { return state.progress[code] || 0; }
function getCategoryColor(cat)     { return (CATEGORY_CONFIG[cat]||{}).color || '#64748b'; }

function renderHeader() {
  document.getElementById('header-semester').textContent = getCurrentSemester().name;
}

// ============================================================
// 章記録
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const cur = getCompletedLessons(code);
  if      (chapterNum === cur + 1) state.progress[code] = chapterNum;
  else if (chapterNum === cur)     state.progress[code] = chapterNum - 1;
  else return;
  saveState();
  renderProgressPage();
  renderToday();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}
function toggleLesson(code, n, sid) { toggleChapter(code, n*4, sid); }

// ============================================================
// 章グリッド共通ビルダー（createElement方式・伝播完全遮断）
// ============================================================
function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const CPL = 4;

  // ラッパー：クリック伝播を完全遮断
  const wrapper = document.createElement('div');
  wrapper.addEventListener('click',    e => e.stopPropagation(), true);
  wrapper.addEventListener('touchend', e => e.stopPropagation(), true);
  wrapper.addEventListener('touchstart', e => e.stopPropagation(), true);

  // グリッド行
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:8px';

  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateLesson = isLessonLate(lesson, s, sem);
    const thisWeek   = lesson <= recommended && lesson > doneLessons;
    const notYet     = !isLessonAvailable(lesson, s, sem);

    for (let ch = 1; ch <= CPL; ch++) {
      const chNum    = (lesson-1)*CPL + ch;
      const isDone   = chNum <= doneChapters;
      const isLateC  = !isDone && lateLesson;
      const isWeekC  = !isDone && !isLateC && thisWeek;
      const isNotYet = !isDone && !isLateC && !isWeekC && notYet;

      const btn = document.createElement('button');
      btn.className = 'lesson-btn' + (isDone ? ' done' : '');
      btn.title     = `コマ${lesson} 第${ch}章`;
      btn.textContent = `${lesson}-${ch}`;

      if (isDone)      { btn.style.cssText = `background:${color};color:#000`; }
      else if (isLateC)  { btn.style.cssText = 'background:var(--red-dim);color:var(--red);border:1px solid var(--red)'; }
      else if (isWeekC)  { btn.style.cssText = 'background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)'; }
      else if (isNotYet) { btn.style.cssText = 'opacity:0.25;pointer-events:none'; }

      if (ch === 1 && lesson > 1) btn.style.marginLeft = '2px';

      // ★ ボタン個別にも伝播遮断（二重保護）
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleChapter(s.code, chNum, semId);
      });
      grid.appendChild(btn);
    }
  }
  wrapper.appendChild(grid);

  // 凡例＋締切ボタン行
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px';
  footer.innerHTML = `
    <div style="display:flex;gap:10px;font-size:10px;color:var(--text3)">
      <span><span style="color:${color}">■</span> 完了</span>
      <span><span style="color:var(--red)">■</span> 遅刻</span>
      <span><span style="color:var(--amber)">■</span> 今週</span>
      <span style="opacity:0.4">■ 未開講</span>
    </div>`;
  const dlBtn = document.createElement('button');
  dlBtn.style.cssText = 'background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:10px;padding:3px 10px;border-radius:99px;cursor:pointer;font-family:"Noto Sans JP",sans-serif';
  dlBtn.textContent = '締切一覧';
  dlBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    showDeadlineModal(s.code, semId);
  });
  footer.appendChild(dlBtn);
  wrapper.appendChild(footer);

  return wrapper;
}

// ============================================================
// アコーディオン汎用トグル（ヘッダー div ＋ 展開 div のペアに使用）
// ============================================================
function makeAccordion(headerEl, contentEl, iconId) {
  headerEl.style.cursor = 'pointer';
  headerEl.style.webkitUserSelect = 'none';
  headerEl.style.userSelect = 'none';
  headerEl.style.webkitTapHighlightColor = 'transparent';

  headerEl.addEventListener('click', (e) => {
    // contentEl 内のクリックは無視
    if (contentEl.contains(e.target)) return;
    const open = contentEl.style.display === 'none';
    contentEl.style.display = open ? 'block' : 'none';
    const icon = iconId ? document.getElementById(iconId) : null;
    if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}
