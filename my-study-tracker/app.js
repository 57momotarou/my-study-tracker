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
// ensureAutoTimetable: 締切近い順に優先配置・遅刻中科目は日曜にも追加
// ttIdx 0=月〜5=土、6=日（緊急枠）
function ensureAutoTimetable(semId) {
  const subjects = getEnrolledSubjects(semId);
  if (!subjects.length) return;
  const sem = SEMESTERS.find(s=>s.id===semId)||SEMESTERS[0];
  const tt  = loadTimetable();
  if (!tt[semId]) tt[semId] = {};
  const now = new Date();

  // 未配置の科目のみ配置（既存を上書きしない）
  const unplaced = subjects.filter(s => tt[semId][s.code] === undefined);
  if (!unplaced.length) return;

  // 開講済み科目のみ対象（開講前は配置しない）
  const availableUnplaced = unplaced.filter(s => isLessonAvailable(1, s, sem));

  // 締切近い順にソート（今日時点での次の未完了コマの締切）
  const withUrgency = availableUnplaced.map(s => {
    const done = Math.floor((state.progress[s.code]||0) / 4);
    const late = Math.max(0, getTodayTarget(s,sem) - done);
    const nextN = done + 1;
    const nextDL = nextN <= s.lessons ? getLessonDeadline(nextN, s, sem) : new Date('2099-01-01');
    const daysLeft = Math.ceil((nextDL - now) / 86400000);
    return { s, late, daysLeft };
  }).sort((a,b) => b.late - a.late || a.daysLeft - b.daysLeft); // 遅刻優先、次に締切近い順

  // 専門→木(3)優先、教養外国語→火(1)優先
  // 0=月,1=火,2=水,3=木,4=金,5=土（6=日は緊急枠）
  const senmonPrio = [3,2,4,0,1,5];
  const kyoyoPrio  = [1,0,2,3,4,5];

  // 既配置の曜日ごとの科目数を集計（月〜土+日）
  const dayCount = [0,0,0,0,0,0,0]; // index 0-6（0=月,6=日）
  subjects.filter(s=>tt[semId][s.code]!==undefined).forEach(s=>{
    const d=tt[semId][s.code];
    if (d>=0 && d<=6) dayCount[d]++;
  });

  withUrgency.forEach(({s, late}) => {
    const h = s.deadline_type==='専門' ? 1.5 : 1;

    // 遅刻中 or 今日期限 → 日曜にも追加枠（別途配置）
    if (late > 0) {
      // 最優先曜日に配置
      const prio = s.deadline_type==='専門' ? senmonPrio : kyoyoPrio;
      let best = prio[0], bestC = dayCount[prio[0]];
      prio.forEach(d => { if (dayCount[d] < bestC) { best=d; bestC=dayCount[d]; } });
      tt[semId][s.code] = best;
      dayCount[best]++;
      // さらに日曜にも「緊急」フラグで追加（コードに _sun サフィックスで管理）
      // → 日曜枠は専用キーで管理
      if (!tt[semId]['__sun__']) tt[semId]['__sun__'] = [];
      if (!tt[semId]['__sun__'].includes(s.code)) tt[semId]['__sun__'].push(s.code);
    } else {
      const prio = s.deadline_type==='専門' ? senmonPrio : kyoyoPrio;
      let best = prio[0], bestC = dayCount[prio[0]];
      prio.forEach(d => { if (dayCount[d] < bestC) { best=d; bestC=dayCount[d]; } });
      tt[semId][s.code] = best;
      dayCount[best]++;
    }
  });

  saveTimetable(tt);
}

// 日曜枠（緊急科目）取得
function getSundayUrgentSubjects(semId) {
  const tt = loadTimetable();
  const sunCodes = tt[semId]?.['__sun__'] || [];
  return sunCodes.map(code => ALL_SUBJECTS.find(s=>s.code===code)).filter(Boolean);
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
  // TODAYタブは全再描画せず章ボタンの色だけ差分更新（点滅防止）
  _updateTodayChapterButtons(code, semId);
  renderBadgesPage();
  if (document.getElementById('page-schedule').classList.contains('active')) renderSchedulePage();
}
function toggleLesson(code, lessonNum, semId) { toggleChapter(code, lessonNum*4, semId); }

// TODAYタブの章グリッドボタンを再描画せずに色だけ更新
function _updateTodayChapterButtons(code, semId) {
  const doneCh = getCompletedLessons(code);
  const s = ALL_SUBJECTS.find(x => x.code === code);
  if (!s) return;
  const sem = getCurrentSemester();
  const color = getCategoryColor(s.category);
  const doneLes = Math.floor(doneCh / 4);
  const rec = getTodayRecommended(s, sem);

  // 積み残しリストが変化した（コマ完了 or 取り消し）場合は時間割カードを再描画
  // isPast判定はrenderTodayTimetable内と同じロジックで計算
  const now = new Date();
  const todayDow = now.getDay();
  const effToday = todayDow === 0 ? 7 : todayDow;
  const ttDay = getTimetableDay(code, semId);
  const ttDow = ttDay !== undefined ? ttDay + 1 : -1;
  const effTt = ttDow === 0 ? 7 : ttDow;
  const isPast = ttDay !== undefined && effTt < effToday;
  const allDone = doneLes >= s.lessons;

  // この科目がisPast（積み残し対象）かつ今タップでコマ完了/取り消しが起きたなら再描画
  if (isPast) {
    const subjects = getEnrolledSubjects(semId);
    renderTodayTimetable(subjects, sem, semId);
    // アラートも更新
    const alertsEl = document.getElementById('today-alerts');
    if (alertsEl) {
      alertsEl.innerHTML = '';
      subjects.forEach(s2 => {
        const done2 = Math.floor(getCompletedLessons(s2.code) / 4);
        const late2 = getTodayTarget(s2, sem) - done2;
        if (late2 >= 3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s2.name}</b> 遅刻${late2}コマ！繰り越し優先で</div>`;
        else if (late2 >= 1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s2.name}</b> ${late2}コマ遅刻中 — 優先受講を</div>`;
      });
    }
    return; // 全再描画したので以降の差分更新は不要
  }

  document.querySelectorAll('#today-timetable .lesson-btn').forEach(btn => {
    const onclick = btn.getAttribute('onclick') || '';
    if (!onclick.includes(`'${code}'`)) return;
    // chapterNumを取得
    const m = onclick.match(/toggleChapter\('[^']+',(\d+),/);
    if (!m) return;
    const chNum = parseInt(m[1]);
    const lesson = Math.ceil(chNum / 4);
    const isDone  = chNum <= doneCh;
    const lateL   = isLessonLate(lesson, s, sem);
    const notYet  = !isLessonAvailable(lesson, s, sem);
    const isTargetLesson = lesson > doneLes && (lesson === doneLes + 1 || lesson <= rec);
    const isLateC = !isDone && lateL;
    const isWeekC = !isDone && !isLateC && isTargetLesson;

    btn.className = 'lesson-btn' + (isDone ? ' done' : '');
    if (isDone)       { btn.style.background = color; btn.style.color = '#000'; btn.style.border = ''; }
    else if (isLateC) { btn.style.background = 'var(--red-dim)'; btn.style.color = 'var(--red)'; btn.style.border = '1px solid var(--red)'; }
    else if (isWeekC) { btn.style.background = 'var(--amber-dim)'; btn.style.color = 'var(--amber)'; btn.style.border = '1px solid var(--amber)'; }
    else              { btn.style.background = 'var(--bg3)'; btn.style.color = 'var(--text3)'; btn.style.border = ''; }
    btn.style.pointerEvents = notYet ? 'none' : '';
  });

  // progress%・ステータステキストもついでに更新（今日カードの外のやつは触らない）
  // アラートと迫っている締切は再描画
  const alertsEl = document.getElementById('today-alerts');
  if (alertsEl) {
    const subjects = getEnrolledSubjects(semId);
    alertsEl.innerHTML = '';
    subjects.forEach(s2 => {
      const done2 = Math.floor(getCompletedLessons(s2.code) / 4);
      const late2 = getTodayTarget(s2, sem) - done2;
      if (late2 >= 3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s2.name}</b> 遅刻${late2}コマ！繰り越し優先で</div>`;
      else if (late2 >= 1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s2.name}</b> ${late2}コマ遅刻中 — 優先受講を</div>`;
    });
  }
}

