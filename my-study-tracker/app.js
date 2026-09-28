// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = {
  enrollments: 'cp-enrollments',
  progress: 'cp-progress',
  currentSem: 'cp-current-sem',
  migrated: 'cp-migrated-v1',
  records: 'cp-records-v1',
  applications: 'cp-applications-v1',
  privateData: 'cp-private-data-v1',
};

let state = { currentSemesterId:1, enrollments:{}, progress:{}, records:{}, applications:[], privateData:null, activeSubjectFilter:'all' };

document.addEventListener('DOMContentLoaded', () => {
  loadState(); setupNav(); setupDataTransfer(); setupSettingsHub(); setupPrivateData(); setupCalendarTouchGuard(); setupScheduleRefresh(); render(); registerSW();
});

const SAVE_JOURNAL = 'cp-save-journal-v1';
let lastSavedState = null;

function loadState(privateOverride, persistMigration = true) {
  recoverStateSave();
  try {
    const raw = privateOverride || readStoredJson(KEYS.privateData, null);
    state.privateData = raw ? validatePrivateData(raw) : null;
    hydratePrivateData(state.privateData);
  } catch (error) { state.privateData = null; hydratePrivateData(null); privateDataError = error.message; }
  if (!privateDataReady) {
    // 資料が未読み込みでも旧記録を削除・正規化しない。
    state.enrollments = readStoredJson(KEYS.enrollments, {});
    state.progress = readStoredJson(KEYS.progress, {});
    state.records = readStoredJson(KEYS.records, {});
    state.applications = readStoredJson(KEYS.applications, []);
    lastSavedState = snapshotStudyState();
    return;
  }
  const rawEnrollments = readStoredJson(KEYS.enrollments, {});
  const rawProgress = readStoredJson(KEYS.progress, {});
  const progress = rawProgress && typeof rawProgress === 'object' && !Array.isArray(rawProgress)
    ? { ...rawProgress }
    : {};

  // 旧データ（コマ単位）→章単位への移行（一度だけ実行）
  const needsMigration = !readStoredValue(KEYS.migrated);
  if (needsMigration) {
    Object.keys(progress).forEach(code => {
      const value = Number(progress[code]);
      if (Number.isFinite(value) && value > 0 && value <= 15) progress[code] = value * 4;
    });
  }

  state.enrollments = normalizeEnrollments(rawEnrollments);
  state.progress = normalizeProgress(progress);
  state.records = normalizeRecords(readStoredJson(KEYS.records, {}));
  state.applications = normalizeApplications(readStoredJson(KEYS.applications, []));

  const storedSemesterId = Number.parseInt(readStoredValue(KEYS.currentSem), 10);
  state.currentSemesterId = SEMESTERS.some(sem => sem.id === storedSemesterId)
    ? storedSemesterId
    : getDefaultSemesterId();

  // 移行後の値を先に保存し、成功した場合だけ完了マーカーを付ける。
  lastSavedState = snapshotStudyState();
  if (needsMigration && persistMigration) saveState();
}

function readStoredValue(key) {
  try {
    const pending = localStorage.getItem(SAVE_JOURNAL);
    if (pending) {
      const previous = JSON.parse(pending);
      if (Object.hasOwn(previous, key)) return previous[key];
    }
    return localStorage.getItem(key);
  }
  catch (error) {
    console.warn('保存データを読み込めませんでした。', error);
    return null;
  }
}

function writeStoredValue(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    console.warn('保存データを書き込めませんでした。', error);
    return false;
  }
}

function readStoredJson(key, fallback) {
  const raw = readStoredValue(key);
  if (raw === null) return fallback;
  try { return JSON.parse(raw); }
  catch (error) {
    console.warn('保存データの形式が壊れているため初期値を使用します。', error);
    return fallback;
  }
}

function normalizeEnrollments(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  SEMESTERS.forEach(sem => {
    const codes = value[sem.id];
    if (!Array.isArray(codes)) return;
    normalized[sem.id] = [...new Set(codes.filter(code => typeof code === 'string' && SUBJECT_BY_CODE.has(code)))];
  });
  return normalized;
}

function normalizeProgress(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  const normalized = {};
  Object.entries(value).forEach(([code, rawValue]) => {
    const subject = SUBJECT_BY_CODE.get(code);
    const numericValue = Number(rawValue);
    if (!subject || !Number.isFinite(numericValue)) return;
    const clampedValue = Math.min(subject.lessons * 4, Math.max(0, Math.trunc(numericValue)));
    if (clampedValue > 0) normalized[code] = clampedValue;
  });
  return normalized;
}

function getDefaultSemesterId() {
  const now = new Date();
  const active = SEMESTERS.find(sem => parseDateValue(sem.start) <= now && now <= endOfDate(sem.end));
  if (active) return active.id;
  const upcoming = SEMESTERS.find(sem => parseDateValue(sem.start) > now);
  if (upcoming) return upcoming.id;
  const started = SEMESTERS.filter(sem => parseDateValue(sem.start) <= now);
  return (started[started.length - 1] || SEMESTERS[0]).id;
}

function snapshotStudyState() {
  return JSON.parse(JSON.stringify({ enrollments: state.enrollments, progress: state.progress,
    currentSemesterId: state.currentSemesterId, records: state.records, applications: state.applications, privateData: state.privateData }));
}

function restoreStoredValues(previous) {
  let recovered = true;
  for (const key of Object.values(KEYS)) {
    if (!Object.hasOwn(previous, key)) continue;
    try {
      if (localStorage.getItem(key) === previous[key]) continue;
      if (previous[key] === null) localStorage.removeItem(key);
      else localStorage.setItem(key, previous[key]);
    } catch (error) { recovered = false; }
  }
  if (recovered) {
    try { localStorage.removeItem(SAVE_JOURNAL); }
    catch (error) { recovered = false; }
  }
  return recovered;
}

function recoverStateSave() {
  try {
    const pending = localStorage.getItem(SAVE_JOURNAL);
    return !pending || restoreStoredValues(JSON.parse(pending));
  } catch (error) {
    console.warn('保存処理の回復を保留しました。', error);
    return false;
  }
}

// 複数キーへの書き込みをジャーナルで保護する。失敗・中断時は直前の記録へ戻す。
function saveState() {
  if (!privateDataReady) return false;
  const previous = {};
  let journalWritten = false;
  try {
    if (!recoverStateSave()) throw new Error('前の保存を回復できませんでした。');
    const values = {
      [KEYS.enrollments]: JSON.stringify(state.enrollments),
      [KEYS.progress]: JSON.stringify(state.progress),
      [KEYS.currentSem]: String(state.currentSemesterId),
      [KEYS.records]: JSON.stringify(state.records),
      [KEYS.applications]: JSON.stringify(state.applications),
      [KEYS.privateData]: JSON.stringify(state.privateData),
      [KEYS.migrated]: '1',
    };
    for (const key of Object.keys(values)) previous[key] = localStorage.getItem(key);
    if (Object.keys(values).some(key => values[key] !== previous[key])) {
      localStorage.setItem(SAVE_JOURNAL, JSON.stringify(previous));
      journalWritten = true;
      for (const [key, value] of Object.entries(values)) {
        if (value !== previous[key]) localStorage.setItem(key, value);
      }
      localStorage.removeItem(SAVE_JOURNAL);
    }
    lastSavedState = snapshotStudyState();
    return true;
  } catch (error) {
    if (journalWritten) restoreStoredValues(previous);
    if (lastSavedState) Object.assign(state, JSON.parse(JSON.stringify(lastSavedState)));
    hydratePrivateData(state.privateData);
    console.warn('変更を保存できなかったため、直前の記録に戻しました。', error);
    showStorageWarning();
    return false;
  }
}

let storageWarningTimer = null;
function showStorageWarning() {
  if (!document.body) return;
  let warning = document.getElementById('storage-warning');
  if (!warning) {
    warning = document.createElement('div');
    warning.id = 'storage-warning';
    warning.setAttribute('role', 'alert');
    warning.style.cssText = 'position:fixed;left:16px;right:16px;bottom:calc(var(--nav-h) + env(safe-area-inset-bottom) + 12px);z-index:700;max-width:568px;margin:auto;padding:10px 12px;border:1px solid var(--red);border-radius:8px;background:var(--red-dim);color:#fca5a5;font-size:12px;text-align:center;box-shadow:0 8px 24px rgba(0,0,0,.35)';
    warning.textContent = '端末に保存できませんでした。ブラウザの保存設定と空き容量を確認してください。';
    document.body.appendChild(warning);
  }
  clearTimeout(storageWarningTimer);
  storageWarningTimer = setTimeout(() => warning.remove(), 5000);
}

// ============================================================
// ナビゲーション
// ============================================================
function setupNav() {
  document.getElementById('header-settings-btn').addEventListener('click', () => {
    activatePage('settings');
  });
  document.getElementById('header-sem-trigger').addEventListener('click', e => {
    e.stopPropagation(); toggleSemDrawer();
  });
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      activatePage(btn.dataset.page, btn);
    });
  });

  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    closeSemDrawer();
    ['deadline-modal', 'day-detail-modal', 'badge-modal'].forEach(id => {
      document.getElementById(id)?.remove();
    });
  });
}

function render() {
  renderPrivateGate();
  if (!privateDataReady) return;
  renderHeader();
  renderActivePage();
}

function activatePage(pageName, navButton = null) {
  const page = document.getElementById(`page-${pageName}`);
  if (!page) return;
  closeSemDrawer();
  document.querySelectorAll('.nav-btn').forEach(button => button.classList.remove('active'));
  document.querySelectorAll('.page').forEach(item => item.classList.remove('active'));
  if (navButton) navButton.classList.add('active');
  page.classList.add('active');
  renderActivePage();
}

function renderActivePage() {
  if (!privateDataReady) { renderPrivateGate(); return; }
  const activePage = document.querySelector('.page.active');
  if (!activePage) return;
  if (activePage.id === 'page-today') renderToday();
  else if (activePage.id === 'page-schedule') renderSchedulePage();
  else if (activePage.id === 'page-settings') renderSettingsPage();
  else if (activePage.id === 'page-badges') renderBadgesPage();
  else if (activePage.id === 'page-progress') renderProgressPage();
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
      renderActivePage();
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
function getEnrolledSubjects(semId){ return getEnrolledCodes(semId).map(code=>SUBJECT_BY_CODE.get(code)).filter(Boolean); }
function getCompletedLessons(code) { return state.progress[code]||0; }
function getCategoryColor(cat)     { return (CATEGORY_CONFIG[cat]||{}).color||'#64748b'; }
function renderHeader() {
  const semester = getCurrentSemester();
  if (!semester) return;
  document.getElementById('header-semester').textContent = semester.name;
  const version = document.querySelector('.guide-version');
  if (version) version.textContent = state.privateData?.guideVersion || '';
  document.querySelectorAll('[data-schedule-note]').forEach(element => {
    element.hidden = Boolean(semester.attendance);
    element.textContent = 'この学期の正式な講義日程は未登録です。表示中の締切は概算のため、大学の案内で確認してください。';
  });
}

// 各コマを個別に記録する。旧累積章数は初回の参照値として保持する。
function toggleLesson(code, lessonNum, semId) {
  const subject = SUBJECT_BY_CODE.get(code);
  if (!subject || !SEMESTERS.some(s => s.id === semId) || !Number.isInteger(lessonNum) || lessonNum < 1 || lessonNum > subject.lessons) return;
  const done = new Set(getViewedLessons(semId, code));
  if (done.has(lessonNum)) done.delete(lessonNum); else done.add(lessonNum);
  changeStudyRecord(semId, code, { viewedLessons: [...done].sort((a,b) => a-b) });
  rerenderAfterProgressChange();
}
function toggleFinalExam(code, semId) {
  changeStudyRecord(semId, code, { examTaken: !getStudyRecord(semId, code).examTaken });
  rerenderAfterProgressChange();
}
function toggleChapter(code, chapterNum, semId) {
  const subject = SUBJECT_BY_CODE.get(code), sem = SEMESTERS.find(s => s.id === semId);
  if (!subject || !sem || !Number.isInteger(chapterNum) || chapterNum < 1 || chapterNum > subject.lessons*4 || !isLessonAvailable(Math.ceil(chapterNum/4),subject,sem)) return;
  const current = getCompletedLessons(code);
  if (chapterNum === current + 1) state.progress[code] = chapterNum;
  else if (chapterNum === current) state.progress[code] = chapterNum - 1;
  else return;
  if (state.progress[code] <= 0) delete state.progress[code];
  saveState(); rerenderAfterProgressChange();
}

function rerenderAfterProgressChange() {
  const scrolls = new Map([...document.querySelectorAll('[data-progress-code]')].map(el => [el.dataset.progressCode, el.scrollLeft]));
  renderActivePage();
  document.querySelectorAll('[data-progress-code]').forEach(el => { if (scrolls.has(el.dataset.progressCode)) el.scrollLeft = scrolls.get(el.dataset.progressCode); });
}
function _updateTodayAfterToggle() { rerenderAfterProgressChange(); }
