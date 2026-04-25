// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = { enrollments:'cp-enrollments', progress:'cp-progress', currentSem:'cp-current-sem' };

let state = { currentSemesterId:1, enrollments:{}, progress:{}, activeSubjectFilter:'all' };

document.addEventListener('DOMContentLoaded', () => {
  loadState(); setupNav(); render(); registerSW();
});

function loadState() {
  try {
    state.enrollments = JSON.parse(localStorage.getItem(KEYS.enrollments)||'{}');
    state.progress    = JSON.parse(localStorage.getItem(KEYS.progress)||'{}');
    const c = localStorage.getItem(KEYS.currentSem);
    state.currentSemesterId = c ? parseInt(c) : 1;
    // 旧データ（コマ単位）→章単位への移行（一度だけ実行）
    const migratedKey = 'cp-migrated-v1';
    if (!localStorage.getItem(migratedKey)) {
      let migrated = false;
      Object.keys(state.progress).forEach(code => {
        if (state.progress[code] > 0 && state.progress[code] <= 15) {
          state.progress[code] *= 4; migrated = true;
        }
      });
      if (migrated) saveState();
      localStorage.setItem(migratedKey, '1');
    }
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
      w.addEventListener('statechange', () => { if (w.state==='activated') location.reload(); });
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
    document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
    document.getElementById('page-settings').classList.add('active');
    renderSettingsPage();
  });
  document.getElementById('header-sem-trigger').addEventListener('click', e => {
    e.stopPropagation(); toggleSemDrawer();
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${t}`).classList.add('active');
      if (t==='today')    renderToday();
      if (t==='schedule') renderSchedulePage();
      if (t==='settings') renderSettingsPage();
      if (t==='badges')   renderBadgesPage();
      if (t==='progress') renderProgressPage();
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
// 学期ドロワー（ボタン直下に展開）
// ============================================================
function toggleSemDrawer() {
  const drawer  = document.getElementById('sem-drawer');
  const overlay = document.getElementById('sem-overlay');
  if (drawer.style.display !== 'none') { closeSemDrawer(); return; }

  const trigger = document.getElementById('header-sem-trigger');
  const rect    = trigger.getBoundingClientRect();
  drawer.style.top  = (rect.bottom + 6) + 'px';
  drawer.style.left = rect.left + 'px';

  const listEl = document.getElementById('sem-drawer-list');
  listEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const isCurrent = sem.id === state.currentSemesterId;
    const codes     = getEnrolledCodes(sem.id);
    const btn = document.createElement('button');
    btn.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;padding:9px 12px;border:none;border-radius:7px;background:${isCurrent?'var(--amber-dim)':'transparent'};color:${isCurrent?'var(--amber)':'var(--text2)'};font-size:13px;font-weight:${isCurrent?'700':'400'};font-family:'Noto Sans JP',sans-serif;cursor:pointer;text-align:left;white-space:nowrap;-webkit-tap-highlight-color:transparent`;
    btn.innerHTML = `<span>${sem.name}</span><span style="font-size:10px;color:var(--text3)">${codes.length?codes.length+'科目':''}</span>${isCurrent?'<span style="color:var(--amber)">✓</span>':''}`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.currentSemesterId = sem.id;
      saveState(); closeSemDrawer(); renderHeader();
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
    listEl.appendChild(btn);
  });
  drawer.style.display = 'block';
  overlay.style.display = 'block';
}
function closeSemDrawer() {
  document.getElementById('sem-drawer').style.display  = 'none';
  document.getElementById('sem-overlay').style.display = 'none';
}

// ============================================================
// 共通ヘルパー
// ============================================================
function getCurrentSemester() { return SEMESTERS.find(s=>s.id===state.currentSemesterId)||SEMESTERS[0]; }
function getEnrolledCodes(semId)   { return state.enrollments[semId]||[]; }
function getEnrolledSubjects(semId){ return getEnrolledCodes(semId).map(c=>ALL_SUBJECTS.find(s=>s.code===c)).filter(Boolean); }
function getCompletedLessons(code) { return state.progress[code]||0; }
function getCategoryColor(cat)     { return (CATEGORY_CONFIG[cat]||{}).color||'#64748b'; }
function renderHeader()            { document.getElementById('header-semester').textContent = getCurrentSemester().name; }

// ============================================================
// 章記録（toggleChapterはインラインonclickから呼ばれる）
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const current = getCompletedLessons(code);
  if      (chapterNum === current + 1) state.progress[code] = chapterNum;
  else if (chapterNum === current)     state.progress[code] = chapterNum - 1;
  else return;
  saveState();
  renderProgressPage();
  _updateTodayAfterToggle();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}
function toggleLesson(code, lessonNum, semId) { toggleChapter(code, lessonNum*4, semId); }

// TODAYタブ更新（点滅防止 + 数字ズレ防止）
function _updateTodayAfterToggle() {
  const LESSON_W = 117;
  renderToday();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('#today-timetable .chapter-scroll-wrap').forEach(wrap => {
        const dl = parseInt(wrap.dataset.doneLes) || 0;
        if (dl > 0) wrap.scrollLeft = dl * LESSON_W;
      });
    });
  });
}
