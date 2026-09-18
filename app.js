// ============================================================
// my-study-tracker - app.js
// ============================================================

const KEYS = {
  enrollments: 'cp-enrollments',
  progress: 'cp-progress',
  currentSem: 'cp-current-sem',
  migrated: 'cp-migrated-v1',
};

let state = { currentSemesterId:1, enrollments:{}, progress:{}, activeSubjectFilter:'all' };

document.addEventListener('DOMContentLoaded', () => {
  loadState(); setupNav(); setupDataTransfer(); render(); registerSW();
});

function loadState() {
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

  const storedSemesterId = Number.parseInt(readStoredValue(KEYS.currentSem), 10);
  state.currentSemesterId = SEMESTERS.some(sem => sem.id === storedSemesterId)
    ? storedSemesterId
    : getDefaultSemesterId();

  // 移行後の値を先に保存し、成功した場合だけ完了マーカーを付ける。
  if (needsMigration && saveState()) writeStoredValue(KEYS.migrated, '1');
}

function readStoredValue(key) {
  try { return localStorage.getItem(key); }
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
  const started = SEMESTERS.filter(sem => parseDateValue(sem.start) <= now);
  return (started[started.length - 1] || SEMESTERS[0]).id;
}

function saveState() {
  const saved = [
    writeStoredValue(KEYS.enrollments, JSON.stringify(state.enrollments)),
    writeStoredValue(KEYS.progress, JSON.stringify(state.progress)),
    writeStoredValue(KEYS.currentSem, String(state.currentSemesterId)),
  ].every(Boolean);
  if (!saved) showStorageWarning();
  return saved;
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

function registerSW() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  const hadController = Boolean(navigator.serviceWorker.controller);
  let refreshing = false;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || refreshing) return;
    refreshing = true;
    location.reload();
  });

  navigator.serviceWorker.register('./sw.js')
    .then(registration => registration.update().catch(error => {
      console.warn('更新確認に失敗しました。', error);
    }))
    .catch(error => {
      console.warn('オフライン機能を登録できませんでした。', error);
    });
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
function renderHeader()            { document.getElementById('header-semester').textContent = getCurrentSemester().name; }

// ============================================================
// コマ記録
// toggleLesson: コマ単位でトグル（進捗タブ・今日タブのコマボタンから呼ばれる）
//   押したコマが未完了 → そのコマまで完了にする（lessonNum * 4 を progress に保存）
//   押したコマが最後の完了コマ → 1つ前のコマまでに戻す（(lessonNum-1) * 4 を保存）
// toggleChapter: 章単位でトグル（旧互換・未使用）
// ============================================================
function toggleLesson(code, lessonNum, semId) {
  const CPL     = 4;
  const current = getCompletedLessons(code);         // 現在の章数（コマ数×4）
  const doneLes = Math.floor(current / CPL);          // 現在の完了コマ数

  if (lessonNum > doneLes) {
    // 未完了コマを押した → そのコマまで完了
    state.progress[code] = lessonNum * CPL;
  } else if (lessonNum === doneLes) {
    // 最後の完了コマを押した → 1つ前のコマまでに戻す
    state.progress[code] = (lessonNum - 1) * CPL;
  } else {
    // それ以前の完了済みコマを押した → 何もしない
    return;
  }

  if (state.progress[code] <= 0) delete state.progress[code];

  saveState();
  rerenderAfterProgressChange();
}

function toggleChapter(code, chapterNum, semId) {
  const current = getCompletedLessons(code);
  if      (chapterNum === current + 1) state.progress[code] = chapterNum;
  else if (chapterNum === current)     state.progress[code] = chapterNum - 1;
  else return;
  if (state.progress[code] <= 0) delete state.progress[code];
  saveState();
  rerenderAfterProgressChange();
}

function rerenderAfterProgressChange() {
  const activePage = document.querySelector('.page.active');
  if (activePage?.id === 'page-today') _updateTodayAfterToggle();
  else renderActivePage();
}

// TODAYタブ更新（点滅防止 + 数字ズレ防止）
function _updateTodayAfterToggle() {
  renderToday();
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      document.querySelectorAll('#today-timetable .chapter-scroll-wrap').forEach(wrap => {
        const dl = parseInt(wrap.dataset.doneLes) || 0;
        const lw = parseInt(wrap.dataset.lessonW) || 39;
        if (dl > 0) wrap.scrollLeft = dl * lw;
      });
    });
  });
}
