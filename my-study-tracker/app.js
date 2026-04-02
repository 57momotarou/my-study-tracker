// ============================================================
// my-study-tracker - App Logic
// ============================================================

// ── ストレージキー ──
const KEYS = {
  enrollments: 'cp-enrollments',
  progress: 'cp-progress',
  currentSem: 'cp-current-sem',
};

// ── 状態 ──
let state = {
  currentSemesterId: 1,
  enrollments: {},
  progress: {},
  activeSubjectFilter: 'all',
};

// ============================================================
// 初期化
// ============================================================
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
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${target}`).classList.add('active');
      if (target === 'today') renderToday();
      if (target === 'subjects') renderSubjectsPage();
      if (target === 'badges') renderBadgesPage();
      if (target === 'progress') renderProgressPage();
    });
  });
}

// ============================================================
// 全体レンダリング
// ============================================================
function render() {
  renderHeader();
  renderToday();
  renderSubjectsPage();
  renderBadgesPage();
  renderProgressPage();
}

// ============================================================
// ヘルパー
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

function getTotalCreditsAll() {
  let total = 0;
  SEMESTERS.forEach(sem => total += getTotalCredits(sem.id));
  return total;
}

function getCategoryColor(category) {
  return (CATEGORY_CONFIG[category] || {}).color || '#64748b';
}

// ============================================================
// 出席認定期限ベースのノルマ計算
// ============================================================

// 学期の最初の締切曜日（木or火）の日付を返す
function getFirstDeadline(subject, semester) {
  const start = new Date(semester.start);
  const deadlineDow = subject.deadline_type === '専門' ? 4 : 2; // 木=4, 火=2
  const daysToFirst = (deadlineDow - start.getDay() + 7) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() + daysToFirst);
  first.setHours(12, 0, 0, 0);
  return first;
}

// コマnの出席認定期限（第n週の締切日 + 2週間）
function getLessonDeadline(lessonNum, subject, semester) {
  const first = getFirstDeadline(subject, semester);
  const dl = new Date(first);
  dl.setDate(first.getDate() + (lessonNum - 1) * 7 + 14);
  return dl;
}

// 今日時点で期限が過ぎているコマ数
function getTodayTarget(subject, semester) {
  const now = new Date();
  let count = 0;
  for (let n = 1; n <= subject.lessons; n++) {
    if (getLessonDeadline(n, subject, semester) <= now) count++;
    else break;
  }
  return count;
}

// 今週末の締切までに完了すべき推奨コマ数
function getTodayRecommended(subject, semester) {
  const now = new Date();
  const deadlineDow = subject.deadline_type === '専門' ? 4 : 2;
  const todayDow = now.getDay();
  const daysToDeadline = (deadlineDow - todayDow + 7) % 7;
  const thisWeekDeadline = new Date(now);
  thisWeekDeadline.setDate(now.getDate() + daysToDeadline);
  thisWeekDeadline.setHours(12, 0, 0, 0);

  let count = 0;
  for (let n = 1; n <= subject.lessons; n++) {
    if (getLessonDeadline(n, subject, semester) <= thisWeekDeadline) count++;
    else break;
  }
  return Math.max(count, getTodayTarget(subject, semester));
}

// コマnが遅刻（期限切れ）かどうか
function isLessonLate(lessonNum, subject, semester) {
  return getLessonDeadline(lessonNum, subject, semester) < new Date();
}

// ============================================================
// ヘッダー
// ============================================================
function renderHeader() {
  const sem = getCurrentSemester();
  document.getElementById('header-semester').textContent = sem.name;
  document.getElementById('header-credits').textContent = `${getTotalCreditsAll()}単位`;
}

// ============================================================
// 今日タブ
// ============================================================
function renderToday() {
  const today = new Date();
  const dow = today.getDay();
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // アラート（遅刻コマ警告）
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const target = getTodayTarget(s, sem);
    const done = getCompletedLessons(s.code);
    const late = target - done;
    if (late >= 3) {
      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で取り組みましょう</div>`;
    } else if (late >= 1) {
      alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマが遅刻中 — 優先して受講してください</div>`;
    }
  });

  // 今日の時間割
  const ttEl = document.getElementById('today-timetable');
  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">科目が登録されていません</div><div class="empty-state-sub">「科目」タブで今学期の科目を選択してください</div></div>`;
  } else if (dow === 0 || dow === 6) {
    ttEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text3)">😴 今日は休息日</div>`;
  } else {
    const renderSection = (label, subs) => {
      if (subs.length === 0) return '';
      const rows = subs.map(s => {
        const done = getCompletedLessons(s.code);
        const target = getTodayTarget(s, sem);
        const recommended = getTodayRecommended(s, sem);
        const pct = Math.round(done / s.lessons * 100);
        const late = Math.max(0, target - done);
        const needThisWeek = Math.max(0, recommended - done);
        let badgeClass = 'badge-ok', badgeText = '✅ OK';
        if (late >= 1) { badgeClass = 'badge-danger'; badgeText = `🔴 遅刻${late}コマ`; }
        else if (needThisWeek >= 1) { badgeClass = 'badge-warn'; badgeText = `🟡 今週あと${needThisWeek}コマ`; }
        return `
          <div class="today-subject-item">
            <div class="today-subject-dot" style="background:${getCategoryColor(s.category)}"></div>
            <div class="today-subject-info">
              <div class="today-subject-name">${s.name}</div>
              <div class="today-subject-meta">${s.credits}単位 ・ ${done}/${s.lessons}コマ完了${late > 0 ? ` ・ <span style="color:var(--red)">遅刻${late}コマ</span>` : ''}</div>
              <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${getCategoryColor(s.category)}"></div></div>
            </div>
            <span class="today-subject-badge ${badgeClass}">${badgeText}</span>
          </div>`;
      }).join('');
      return `<div class="timetable-section"><div class="timetable-label">${label}</div>${rows}</div>`;
    };

    const lunchSubs = dow === 4
      ? subjects.filter(s => s.deadline_type === '専門').slice(0, 1)
      : dow === 2
        ? subjects.filter(s => s.deadline_type !== '専門').slice(0, 1)
        : subjects.slice(0, 1);

    const eveningSubs = dow === 4
      ? subjects.filter(s => s.deadline_type === '専門')
      : dow === 2
        ? subjects.filter(s => s.deadline_type !== '専門')
        : subjects;

    ttEl.innerHTML =
      renderSection('🌞 昼休み（12:00〜13:00）', lunchSubs) +
      renderSection('🌙 夜（18:30〜）', eveningSubs);
  }

  // 週間ストリップ
  const weekEl = document.getElementById('week-strip');
  weekEl.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const isToday = d === dow;
    const isRest = d === 0 || d === 6;
    let dotHtml = '';
    if (!isRest) {
      const daySubjects = d === 4
        ? subjects.filter(s => s.deadline_type === '専門').slice(0, 2)
        : subjects.filter(s => s.deadline_type !== '専門').slice(0, 2);
      dotHtml = daySubjects.map(s =>
        `<div class="week-subject-dot" style="background:${getCategoryColor(s.category)}"></div>`
      ).join('');
    }
    weekEl.innerHTML += `
      <div class="week-cell ${isToday ? 'is-today' : ''} ${isRest ? 'is-rest' : ''}">
        <div class="week-day-label">${DOW_LABELS[d]}</div>
        ${dotHtml || '<div style="height:6px"></div>'}
      </div>`;
  }

  // 今期進捗
  const progEl = document.getElementById('today-progress');
  if (subjects.length === 0) {
    progEl.innerHTML = `<div style="color:var(--text3);font-size:13px;">科目を登録するとここに進捗が表示されます</div>`;
  } else {
    const total = subjects.reduce((a, s) => a + s.lessons, 0);
    const done = subjects.reduce((a, s) => a + getCompletedLessons(s.code), 0);
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    progEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--text2)">${done} / ${total} コマ完了</span>
        <span style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700;color:var(--amber)">${pct}%</span>
      </div>
      <div class="prog-wrap" style="height:10px">
        <div class="prog-bar" style="width:${pct}%;background:var(--amber)"></div>
      </div>`;
  }
}

// ============================================================
// 科目タブ
// ============================================================
function renderSubjectsPage() {
  const tabsEl = document.getElementById('semester-tabs');
  tabsEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const btn = document.createElement('button');
    btn.className = 'sem-tab' + (sem.id === state.currentSemesterId ? ' active' : '');
    btn.textContent = sem.name;
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderHeader();
      renderSubjectsPage();
    });
    tabsEl.appendChild(btn);
  });

  const filterEl = document.getElementById('subject-filters');
  filterEl.innerHTML = '';
  [{ key: 'all', label: 'すべて' }, { key: '専門', label: '💻 専門' }, { key: '教養', label: '🌿 教養' }, { key: '外国語', label: '🌐 外国語' }].forEach(f => {
    const btn = document.createElement('button');
    btn.className = `filter-btn f-${f.key}${state.activeSubjectFilter === f.key ? ' active' : ''}`;
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      state.activeSubjectFilter = f.key;
      renderSubjectsPage();
    });
    filterEl.appendChild(btn);
  });

  const enrolled = getEnrolledCodes(state.currentSemesterId);
  const filtered = state.activeSubjectFilter === 'all'
    ? ALL_SUBJECTS
    : ALL_SUBJECTS.filter(s => s.category === state.activeSubjectFilter);

  const groups = {};
  filtered.forEach(s => {
    const key = `${s.category} / ${s.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const listEl = document.getElementById('subject-list');
  listEl.innerHTML = '';
  Object.entries(groups).forEach(([groupName, subjects]) => {
    listEl.innerHTML += `<div class="subject-group-title">${groupName}</div>`;
    subjects.forEach(s => {
      const isChecked = enrolled.includes(s.code);
      const color = getCategoryColor(s.category);
      const openTag = s.open_type === '一斉'
        ? `<span style="font-size:10px;color:var(--blue);margin-left:4px;">○一斉</span>`
        : '';
      listEl.innerHTML += `
        <div class="subject-row ${isChecked ? 'checked' : ''}" data-code="${s.code}">
          <div class="subject-row-check" style="${isChecked ? `background:${color};border-color:${color}` : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="subject-row-info">
            <div class="subject-row-name">${s.name}${openTag}</div>
            <div class="subject-row-meta">${s.code} ・ ${s.type} ・${s.lessons}回</div>
          </div>
          <div class="subject-row-credits">${s.credits}単位</div>
        </div>`;
    });
  });

  listEl.querySelectorAll('.subject-row').forEach(row => {
    row.addEventListener('click', () => {
      const code = row.dataset.code;
      const semId = state.currentSemesterId;
      if (!state.enrollments[semId]) state.enrollments[semId] = [];
      const idx = state.enrollments[semId].indexOf(code);
      if (idx >= 0) state.enrollments[semId].splice(idx, 1);
      else state.enrollments[semId].push(code);
      saveState();
      renderHeader();
      renderSubjectsPage();
    });
  });

  renderEnrolledSummary();
}

function renderEnrolledSummary() {
  const semId = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);
  const listEl = document.getElementById('enrolled-list');
  const statsEl = document.getElementById('enrolled-stats');

  if (subjects.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:12px;">上のリストから科目を選択してください</div>`;
    statsEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = subjects.map(s => `
    <div class="enrolled-item">
      <div class="enrolled-dot" style="background:${getCategoryColor(s.category)}"></div>
      <div class="enrolled-name">${s.name}</div>
      <div class="enrolled-credits">${s.credits}単位</div>
    </div>
  `).join('');

  const totalCredits = subjects.reduce((a, s) => a + s.credits, 0);
  const senmonCount = subjects.filter(s => s.category === '専門').length;
  const kyoyoCount = subjects.filter(s => s.category === '教養').length;
  const foreignCount = subjects.filter(s => s.category === '外国語').length;

  statsEl.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-num" style="color:var(--amber)">${totalCredits}</div>
      <div class="stat-box-label">合計単位</div>
    </div>
    <div class="stat-box">
      <div class="stat-box-num">${senmonCount}</div>
      <div class="stat-box-label">専門科目</div>
    </div>
    <div class="stat-box">
      <div class="stat-box-num">${kyoyoCount + foreignCount}</div>
      <div class="stat-box-label">教養+外国語</div>
    </div>`;
}

// ============================================================
// バッジタブ
// ============================================================
function renderBadgesPage() {
  const allCodes = new Set();
  SEMESTERS.forEach(sem => getEnrolledCodes(sem.id).forEach(c => allCodes.add(c)));

  function isBadgeEarned(badge) {
    if (!badge.requirements) return false;
    const req = badge.requirements;
    if (req.prerequisite) {
      const prereq = BADGES.find(b => b.id === req.prerequisite);
      if (prereq && !isBadgeEarned(prereq)) return false;
    }
    if (req.codes) return req.codes.every(c => allCodes.has(c));
    return false;
  }

  function getBadgeProgress(badge) {
    const req = badge.requirements;
    if (!req || !req.codes) return { done: 0, total: 0 };
    const done = req.codes.filter(c => allCodes.has(c)).length;
    return { done, total: req.codes.length };
  }

  const earned = BADGES.filter(b => isBadgeEarned(b));
  const summaryEl = document.getElementById('badge-summary');
  const bronze = earned.filter(b => b.level === 'bronze').length;
  const silver = earned.filter(b => b.level === 'silver').length;
  const gold = earned.filter(b => b.level === 'gold').length;
  const platinum = earned.filter(b => b.level === 'platinum').length;

  summaryEl.innerHTML = `
    <div class="badge-summary-grid">
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#cd7f32">${bronze}</div>
        <div class="badge-summary-label">🥉 ブロンズ</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#94a3b8">${silver}</div>
        <div class="badge-summary-label">🥈 シルバー</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:var(--amber)">${gold}</div>
        <div class="badge-summary-label">🥇 ゴールド</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#67e8f9">${platinum}</div>
        <div class="badge-summary-label">💎 プラチナ</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px;">
      合計 ${earned.length} / ${BADGES.length} バッジ取得済み
    </div>`;

  const containerEl = document.getElementById('badge-list-container');
  containerEl.innerHTML = '';
  const categories = [...new Set(BADGES.map(b => b.category))];
  categories.forEach(cat => {
    const catBadges = BADGES.filter(b => b.category === cat);
    const cfg = BADGE_LEVEL_CONFIG;
    let html = `<div class="badge-section-title">${CATEGORY_CONFIG[cat]?.icon || '📌'} ${cat}</div>`;
    catBadges.forEach(badge => {
      const isEarned = isBadgeEarned(badge);
      const levelCfg = cfg[badge.level] || cfg.bronze;
      const prog = getBadgeProgress(badge);
      const pct = prog.total > 0 ? Math.round(prog.done / prog.total * 100) : 0;
      html += `
        <div class="badge-card ${isEarned ? 'earned' : ''}" style="${isEarned ? `color:${levelCfg.color}` : 'opacity:0.6'}">
          <div class="badge-icon">${isEarned ? levelCfg.icon : '🔒'}</div>
          <div class="badge-info">
            <div class="badge-level-tag" style="${isEarned ? `background:${levelCfg.bg};color:${levelCfg.color}` : 'background:var(--bg3);color:var(--text3)'}">${levelCfg.label}</div>
            <div class="badge-name">${badge.name}</div>
            ${badge.requirements?.codes ? `
              <div class="badge-progress-text" style="color:${isEarned ? levelCfg.color : 'var(--text3)'}">
                ${prog.done}/${prog.total} 科目 (${pct}%)
              </div>
              <div class="prog-wrap" style="margin-top:4px">
                <div class="prog-bar" style="width:${pct}%;background:${isEarned ? levelCfg.color : 'var(--text3)'}"></div>
              </div>
            ` : `<div class="badge-meta">${badge.requirements?.description || ''}</div>`}
          </div>
        </div>`;
    });
    containerEl.innerHTML += html;
  });
}

// ============================================================
// 進捗タブ
// ============================================================
function renderProgressPage() {
  const selectorEl = document.getElementById('semester-progress-selector');
  selectorEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const codes = getEnrolledCodes(sem.id);
    if (codes.length === 0) return;
    const btn = document.createElement('button');
    btn.className = `filter-btn${state.currentSemesterId === sem.id ? ' active f-専門' : ''}`;
    btn.textContent = sem.name.replace('年度', '').replace('学期', 'S');
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderProgressPage();
    });
    selectorEl.appendChild(btn);
  });

  const semId = state.currentSemesterId;
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(semId);
  const listEl = document.getElementById('progress-subject-list');
  listEl.innerHTML = '';

  if (subjects.length === 0) {
    listEl.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">この学期に登録された科目がありません</div><div class="empty-state-sub">「科目」タブで履修登録してください</div></div></div>`;
    return;
  }

  subjects.forEach(s => {
    const done = getCompletedLessons(s.code);
    const target = getTodayTarget(s, sem);
    const recommended = getTodayRecommended(s, sem);
    const pct = Math.round(done / s.lessons * 100);
    const late = Math.max(0, target - done);
    const color = getCategoryColor(s.category);
    const openLabel = s.open_type === '一斉' ? '一斉' : '順次';

    let statusText = '✅ 出席認定 順調';
    let statusColor = 'var(--green)';
    if (late >= 1) {
      statusText = `🔴 遅刻${late}コマ — 繰り越し優先で受講を`;
      statusColor = 'var(--red)';
    } else if (recommended > done) {
      statusText = `🟡 今週あと${recommended - done}コマで出席認定`;
      statusColor = 'var(--amber)';
    }

    let btnHtml = '<div class="lesson-grid">';
    for (let i = 1; i <= s.lessons; i++) {
      const isDone = i <= done;
      const isLate = !isDone && isLessonLate(i, s, sem);
      const isThisWeek = !isDone && !isLate && i <= recommended;
      let btnStyle = '';
      if (isDone) btnStyle = `background:${color};color:#000`;
      else if (isLate) btnStyle = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
      else if (isThisWeek) btnStyle = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
      btnHtml += `<button class="lesson-btn${isDone ? ' done' : ''}" onclick="toggleLesson('${s.code}', ${i}, ${semId})" style="${btnStyle}">${i}</button>`;
    }
    btnHtml += '</div>';

    const legend = `
      <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3)">
        <span><span style="color:${color}">■</span> 完了</span>
        <span><span style="color:var(--red)">■</span> 遅刻</span>
        <span><span style="color:var(--amber)">■</span> 今週期限</span>
      </div>`;

    listEl.innerHTML += `
      <div class="progress-subject-card">
        <div class="ps-header">
          <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
            <div style="display:flex;align-items:center;gap:6px">
              <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
              <div class="ps-name">${s.name}</div>
            </div>
            <div style="font-size:11px;color:${statusColor};margin-left:14px">${statusText}</div>
          </div>
          <div class="ps-pct" style="color:${color}">${pct}%</div>
        </div>
        <div class="ps-meta">${done} / ${s.lessons} コマ完了 ・ <span style="color:var(--text3)">${openLabel}開講</span>${late > 0 ? ` ・ <span style="color:var(--red)">遅刻${late}コマ</span>` : ''}</div>
        <div class="prog-wrap">
          <div class="prog-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        ${btnHtml}
        ${legend}
      </div>`;
  });
}

// ============================================================
// コマ記録
// ============================================================
function toggleLesson(code, lessonNum, semId) {
  const current = getCompletedLessons(code);
  if (lessonNum === current + 1) state.progress[code] = lessonNum;
  else if (lessonNum === current) state.progress[code] = lessonNum - 1;
  else return;
  saveState();
  renderProgressPage();
  renderToday();
  renderBadgesPage();
}
