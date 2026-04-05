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
    let migrated = false;
    Object.keys(state.progress).forEach(code => {
      if (state.progress[code] > 0 && state.progress[code] <= 15) { state.progress[code] *= 4; migrated = true; }
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
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-settings').classList.add('active');
    renderSettingsPage();
  });
  document.getElementById('header-sem-trigger').addEventListener('click', e => {
    e.stopPropagation(); toggleSemDrawer();
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${t}`).classList.add('active');
      if (t==='today')     renderToday();
      if (t==='schedule')  renderSchedulePage();
      if (t==='settings')  renderSettingsPage();
      if (t==='badges')    renderBadgesPage();
      if (t==='progress')  renderProgressPage();
      if (t==='timetable') renderTimetablePage();
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
// 学期ドロワー
// ============================================================
function toggleSemDrawer() {
  const drawer  = document.getElementById('sem-drawer');
  const overlay = document.getElementById('sem-overlay');
  if (drawer.style.display !== 'none') { closeSemDrawer(); return; }

  const trigger = document.getElementById('header-sem-trigger');
  const rect    = trigger.getBoundingClientRect();
  drawer.style.top  = (rect.bottom + 8) + 'px';
  drawer.style.left = rect.left + 'px';

  const listEl = document.getElementById('sem-drawer-list');
  listEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const isCurrent = sem.id === state.currentSemesterId;
    const codes     = getEnrolledCodes(sem.id);
    const btn = document.createElement('button');
    btn.style.cssText = `display:flex;align-items:center;justify-content:space-between;gap:12px;width:100%;padding:9px 12px;border:none;border-radius:7px;background:${isCurrent?'var(--amber-dim)':'transparent'};color:${isCurrent?'var(--amber)':'var(--text2)'};font-size:13px;font-weight:${isCurrent?'700':'400'};font-family:'Noto Sans JP',sans-serif;cursor:pointer;text-align:left;white-space:nowrap`;
    btn.innerHTML = `<span>${sem.name}</span><span style="font-size:10px;color:var(--text3)">${codes.length?codes.length+'科目':''}</span>`;
    if (isCurrent) btn.innerHTML += `<span style="color:var(--amber)">✓</span>`;
    btn.addEventListener('click', e => {
      e.stopPropagation();
      state.currentSemesterId = sem.id;
      saveState(); closeSemDrawer(); renderHeader();
      const activePage = document.querySelector('.page.active');
      if (activePage) {
        const id = activePage.id;
        if (id==='page-today')     renderToday();
        if (id==='page-progress')  renderProgressPage();
        if (id==='page-schedule')  renderSchedulePage();
        if (id==='page-badges')    renderBadgesPage();
        if (id==='page-settings')  renderSettingsPage();
        if (id==='page-timetable') renderTimetablePage();
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
function renderHeader() { document.getElementById('header-semester').textContent = getCurrentSemester().name; }

// ============================================================
// 章記録
// ============================================================
function toggleChapter(code, chapterNum, semId) {
  const cur = getCompletedLessons(code);
  if      (chapterNum === cur+1) state.progress[code] = chapterNum;
  else if (chapterNum === cur)   state.progress[code] = chapterNum-1;
  else return;
  saveState();
  renderProgressPage();
  renderToday();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}
function toggleLesson(code,n,sid){ toggleChapter(code,n*4,sid); }

// ============================================================
// ★ 章グリッド共通ビルダー（完全createElement・伝播確実遮断）
// ============================================================
function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const CPL = 4;
  // ★ 最外ラッパー：すべての伝播を止める
  const wrapper = document.createElement('div');
  const stopAll = e => { e.stopPropagation(); e.stopImmediatePropagation(); };
  wrapper.addEventListener('click',      stopAll, true);
  wrapper.addEventListener('touchstart', stopAll, true);
  wrapper.addEventListener('touchend',   stopAll, true);

  // グリッド
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:8px';

  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateL  = isLessonLate(lesson, s, sem);
    const weekL  = lesson <= recommended && lesson > doneLessons;
    const notYet = !isLessonAvailable(lesson, s, sem);

    for (let ch = 1; ch <= CPL; ch++) {
      const chNum    = (lesson-1)*CPL + ch;
      const isDone   = chNum <= doneChapters;
      const isLateC  = !isDone && lateL;
      const isWeekC  = !isDone && !isLateC && weekL;
      const isNotYet = !isDone && !isLateC && !isWeekC && notYet;

      const btn = document.createElement('button');
      btn.className   = 'lesson-btn' + (isDone?' done':'');
      btn.textContent = `${lesson}-${ch}`;
      btn.title       = `コマ${lesson} 第${ch}章`;
      btn.style.cssText = isDone    ? `background:${color};color:#000`
        : isLateC  ? 'background:var(--red-dim);color:var(--red);border:1px solid var(--red)'
        : isWeekC  ? 'background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)'
        : isNotYet ? 'opacity:0.25;pointer-events:none'
        : '';
      if (ch===1 && lesson>1) btn.style.marginLeft = '2px';

      // ★ ボタンに直接クリックハンドラ（伝播なし）
      const _code = s.code, _ch = chNum, _sid = semId;
      btn.addEventListener('click', e => {
        e.stopPropagation(); e.stopImmediatePropagation();
        toggleChapter(_code, _ch, _sid);
      });
      grid.appendChild(btn);
    }
  }
  wrapper.appendChild(grid);

  // フッター（凡例＋締切一覧ボタン）
  const footer = document.createElement('div');
  footer.style.cssText = 'display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px';
  footer.innerHTML = `<div style="display:flex;gap:10px;font-size:10px;color:var(--text3)">
    <span><span style="color:${color}">■</span> 完了</span>
    <span><span style="color:var(--red)">■</span> 遅刻</span>
    <span><span style="color:var(--amber)">■</span> 今週</span>
    <span style="opacity:0.4">■ 未開講</span>
  </div>`;
  const dlBtn = document.createElement('button');
  dlBtn.style.cssText = 'background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:10px;padding:3px 10px;border-radius:99px;cursor:pointer;font-family:"Noto Sans JP",sans-serif';
  dlBtn.textContent = '締切一覧';
  dlBtn.addEventListener('click', e => { e.stopPropagation(); showDeadlineModal(s.code, semId); });
  footer.appendChild(dlBtn);
  wrapper.appendChild(footer);
  return wrapper;
}

// ============================================================
// アコーディオン：ヘッダー部タップで展開。
// gridContainer 内のクリックは必ず伝播が止まっているので、
// ここでは「ヘッダーが直接タップされた」ときだけ反応する。
// ============================================================
function attachAccordion(headerEl, contentEl, getIcon) {
  headerEl.style.cursor = 'pointer';
  headerEl.style.webkitTapHighlightColor = 'transparent';
  headerEl.addEventListener('click', e => {
    // contentEl 内のクリックは無視（二重保護）
    if (contentEl.contains(e.target)) return;
    const open = contentEl.style.display === 'none';
    contentEl.style.display = open ? 'block' : 'none';
    const icon = getIcon ? getIcon() : null;
    if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}
