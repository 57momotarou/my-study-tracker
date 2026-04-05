// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = { enrollments:'cp-enrollments', progress:'cp-progress', currentSem:'cp-current-sem' };
const TT_KEY = 'cp-timetable'; // 時間割データ

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
function loadTimetable() {
  try { return JSON.parse(localStorage.getItem(TT_KEY)||'{}'); } catch(e){ return {}; }
}
function saveTimetable(tt) { localStorage.setItem(TT_KEY, JSON.stringify(tt)); }

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
  ensureAutoTimetable(state.currentSemesterId);
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
      // 時間割を自動配置（未配置なら）
      ensureAutoTimetable(sem.id);
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
// 時間割：自動配置ロジック（ページ読み込み時・学期変更時に実行）
// ============================================================
function ensureAutoTimetable(semId) {
  const subjects = getEnrolledSubjects(semId);
  if (!subjects.length) return;
  const tt = loadTimetable();
  if (!tt[semId]) tt[semId] = {};

  // 未配置の科目のみ配置（既存を上書きしない）
  const unplaced = subjects.filter(s => tt[semId][s.code] === undefined);
  if (!unplaced.length) return;

  // 専門→木(3)優先、溢れたら水(2)→金(4)→月(0)→火(1)→土(5)
  // 教養外国語→火(1)優先、溢れたら月(0)→水(2)→木(3)→金(4)→土(5)
  const senmonPrio  = [3,2,4,0,1,5];
  const kyoyoPrio   = [1,0,2,3,4,5];

  // 既配置の曜日ごとの時間を集計
  const dayHours = [0,0,0,0,0,0];
  subjects.filter(s=>tt[semId][s.code]!==undefined).forEach(s=>{
    const d=tt[semId][s.code];
    dayHours[d] += s.deadline_type==='専門'?1.5:1;
  });

  unplaced.forEach(s=>{
    const prio = s.deadline_type==='専門' ? senmonPrio : kyoyoPrio;
    const h    = s.deadline_type==='専門' ? 1.5 : 1;
    // 最も空いている優先曜日を選ぶ
    let best = prio[0], bestH = dayHours[prio[0]];
    prio.forEach(d => { if (dayHours[d] < bestH) { best=d; bestH=dayHours[d]; } });
    tt[semId][s.code] = best;
    dayHours[best] += h;
  });

  saveTimetable(tt);
}

function getTimetableDay(code, semId) {
  const tt = loadTimetable();
  return tt[semId]?.[code]; // undefined = 未配置
}

// 曜日名
const DAY_NAMES = ['日','月','火','水','木','金','土'];

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
  renderToday();
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}
function toggleLesson(code, lessonNum, semId) { toggleChapter(code, lessonNum*4, semId); }

