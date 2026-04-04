// ============================================================
// my-study-tracker - render-today.js
// ============================================================

const CPL = 4; // chapters per lesson

function renderToday() {
  const today    = new Date();
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);
  const semId    = state.currentSemesterId;

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  // ── アラート ──
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const target      = getTodayTarget(s, sem);
    const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
    const late        = target - doneLessons;
    if (late >= 3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`;
    else if (late >= 1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中 — 優先受講を</div>`;
  });

  // ── TODAY カード（目標＋章グリッド） ──
  const ttEl = document.getElementById('today-timetable');
  ttEl.innerHTML = '';

  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">科目が登録されていません</div>
      <div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div>
    </div>`;
  } else {
    const withPriority = subjects.map(s => {
      const doneChapters = getCompletedLessons(s.code);
      const doneLessons  = Math.floor(doneChapters / CPL);
      const target       = getTodayTarget(s, sem);
      const recommended  = getTodayRecommended(s, sem);
      const late         = Math.max(0, target - doneLessons);
      const needThisWeek = Math.max(0, recommended - doneLessons);
      return { s, doneChapters, doneLessons, recommended, late, needThisWeek };
    }).filter(({ late, needThisWeek }) => late > 0 || needThisWeek > 0)
      .sort((a, b) => b.late - a.late || b.needThisWeek - a.needThisWeek);

    if (withPriority.length === 0) {
      ttEl.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--green)">
        <div style="font-size:32px;margin-bottom:8px">🎉</div>
        <div style="font-size:15px;font-weight:700">今日の出席認定はすべてOK！</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしておきましょう</div>
      </div>`;
    } else {
      withPriority.forEach(item => buildTodayCard(item, sem, semId, ttEl));
    }
  }

  // ── 今週ストリップ ──
  renderWeekStrip(subjects, sem);

  // ── 先取りおすすめ（締切近い順） ──
  renderAdvanceRecommendations(subjects, sem);

  // ── 迫っている締切（一番下） ──
  renderUpcomingDeadlines(subjects, sem);
}

// ── 今日タブの科目カード構築 ──
function buildTodayCard(item, sem, semId, container) {
  const { s, doneChapters, doneLessons, recommended, late, needThisWeek } = item;
  const color         = getCategoryColor(s.category);
  const totalChapters = s.lessons * CPL;
  const pct           = Math.round(doneChapters / totalChapters * 100);

  // 目標計算
  let goalLesson, goalChapter, goalLabel, goalColor, badgeClass, badgeText;
  if (late > 0) {
    const nextCh = doneChapters + 1;
    goalLesson  = Math.ceil(nextCh / CPL);
    goalChapter = ((nextCh - 1) % CPL) + 1;
    goalLabel   = '今すぐ取り掛かろう';
    goalColor   = 'var(--red)';
    badgeClass  = 'badge-danger';
    badgeText   = `🔴 ${late}コマ遅刻中`;
  } else {
    goalLesson  = recommended;
    goalChapter = CPL;
    goalLabel   = '今週中にここまでで出席認定OK';
    goalColor   = 'var(--amber)';
    badgeClass  = 'badge-warn';
    badgeText   = `🟡 今週あと${needThisWeek}コマ`;
  }

  const goalChTotal = (goalLesson - 1) * CPL + goalChapter;
  const alreadyDone = doneChapters >= goalChTotal;
  const doneChInLes = doneChapters % CPL;
  const nowLabel    = doneChInLes > 0
    ? `コマ${doneLessons + 1} 第${doneChInLes}章まで完了`
    : doneLessons > 0 ? `コマ${doneLessons} 完了` : '未受講';

  // カード要素
  const card = document.createElement('div');
  card.className = 'today-subject-card';
  card.style.borderLeft = `3px solid ${color}`;
  card.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
      <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
        <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
      </div>
      <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
    </div>

    <div class="today-goal-box" style="border-color:${goalColor};background:${goalColor}18;margin-bottom:10px">
      <div style="font-size:10px;letter-spacing:1.5px;color:${goalColor};font-family:'Space Mono',monospace;font-weight:700;margin-bottom:6px">TODAY'S GOAL</div>
      ${alreadyDone ? `
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:22px">✅</span>
          <div>
            <div style="font-size:15px;font-weight:700;color:var(--green)">今日の目標達成！</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">余裕があれば先取りしましょう</div>
          </div>
        </div>` : `
        <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
          <span style="font-size:13px;color:var(--text2)">コマ</span>
          <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalLesson}</span>
          <span style="font-size:13px;color:var(--text2)">の 第</span>
          <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalChapter}</span>
          <span style="font-size:13px;color:var(--text2)">章まで</span>
        </div>
        <div style="font-size:11px;color:${goalColor};margin-top:4px;font-weight:600">${goalLabel}</div>`}
    </div>

    <div class="today-progress-toggle" id="today-toggle-${s.code}" style="cursor:pointer;-webkit-user-select:none;user-select:none">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text3)">現在：${nowLabel}</span>
        <div style="display:flex;align-items:center;gap:5px">
          <span style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}">${pct}%</span>
          <svg id="today-icon-${s.code}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="14" height="14" style="color:var(--text3);transition:transform 0.2s">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>
    </div>
    <div id="today-grid-${s.code}" style="display:none;margin-top:10px"></div>`;

  container.appendChild(card);

  // 章グリッド構築・注入
  const gridEl = document.getElementById(`today-grid-${s.code}`);
  gridEl.appendChild(buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color));

  // タップで展開
  document.getElementById(`today-toggle-${s.code}`).addEventListener('click', () => {
    const grid = document.getElementById(`today-grid-${s.code}`);
    const icon = document.getElementById(`today-icon-${s.code}`);
    const open = grid.style.display === 'none';
    grid.style.display = open ? 'block' : 'none';
    if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });
}

// ── 章グリッド（今日タブ・進捗タブ共通） ──
function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const wrapper = document.createElement('div');
  let html = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:8px">';

  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateLesson = isLessonLate(lesson, s, sem);
    const thisWeek   = lesson <= recommended && lesson > doneLessons;
    const notYet     = !isLessonAvailable(lesson, s, sem);

    for (let ch = 1; ch <= CPL; ch++) {
      const chNum   = (lesson - 1) * CPL + ch;
      const isDone  = chNum <= doneChapters;
      const isLateC = !isDone && lateLesson;
      const isWeekC = !isDone && !isLateC && thisWeek;
      const isNotYet = !isDone && !isLateC && !isWeekC && notYet;

      let style = '';
      if (isDone)    style = `background:${color};color:#000`;
      else if (isLateC) style = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
      else if (isWeekC) style = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
      else if (isNotYet) style = 'opacity:0.25;pointer-events:none';

      const ml = ch === 1 && lesson > 1 ? 'margin-left:2px;' : '';
      html += `<button class="lesson-btn${isDone ? ' done' : ''}"
        onclick="toggleChapter('${s.code}',${chNum},${semId})"
        style="${style}${ml}" title="コマ${lesson} 第${ch}章">${lesson}-${ch}</button>`;
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

// ============================================================
// 今週ストリップ
// ============================================================
function renderWeekStrip(subjects, sem) {
  const el = document.getElementById('week-strip');
  if (!el) return;
  const now      = new Date();
  const todayDow = now.getDay();
  const LABELS   = ['日','月','火','水','木','金','土'];
  el.innerHTML   = '';

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() - todayDow + d);
    date.setHours(0, 0, 0, 0);
    const isToday = d === todayDow;
    const items = [];
    subjects.forEach(s => {
      const done = Math.floor(getCompletedLessons(s.code) / CPL);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString())
          items.push({ s, isDone: n <= done, isLate: n > done && dl < now });
      }
    });
    const cell = document.createElement('div');
    cell.className = 'week-cell' + (isToday ? ' is-today' : '');
    const dots = items.slice(0, 3).map(({ isDone, isLate }) => {
      const c = isDone ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--amber)';
      return `<div class="week-subject-dot" style="background:${c}"></div>`;
    }).join('');
    cell.innerHTML = `
      <div class="week-day-label">${LABELS[d]}</div>
      <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--amber)':'var(--text2)'}">${date.getDate()}</div>
      <div style="display:flex;gap:2px;min-height:8px;flex-wrap:wrap;justify-content:center">${dots}</div>
      ${items.length > 3 ? `<div style="font-size:9px;color:var(--text3)">+${items.length-3}</div>` : ''}`;
    el.appendChild(cell);
  }
}

// ============================================================
// 先取りおすすめ（締切近い順）
// ============================================================
function renderAdvanceRecommendations(subjects, sem) {
  const el = document.getElementById('today-advance');
  if (!el) return;
  const now = new Date();
  const advances = [];

  subjects.forEach(s => {
    const doneChapters = getCompletedLessons(s.code);
    const doneLessons  = Math.floor(doneChapters / CPL);
    const late         = Math.max(0, getTodayTarget(s, sem) - doneLessons);
    const recommended  = getTodayRecommended(s, sem);

    if (late > 0)                    return; // 遅刻中は除外
    if (recommended > doneLessons)   return; // 今週要対応は除外
    if (doneLessons >= s.lessons)    return; // 完了済みは除外

    const nextLesson = doneLessons + 1;
    if (!isLessonAvailable(nextLesson, s, sem)) return; // 未開講は除外

    const nextDeadline = getLessonDeadline(nextLesson, s, sem);
    const daysUntil    = Math.ceil((nextDeadline - now) / 86400000);
    if (daysUntil < 7) return; // 余裕なし除外

    advances.push({ s, nextLesson, nextDeadline, daysUntil });
  });

  if (advances.length === 0) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">先取りに余裕のある科目はありません</div>`;
    return;
  }

  // 締切が近い順（daysUntil 昇順）
  advances.sort((a, b) => a.daysUntil - b.daysUntil);

  el.innerHTML = advances.slice(0, 5).map(({ s, nextLesson, nextDeadline, daysUntil }) => {
    const color   = getCategoryColor(s.category);
    const dateStr = nextDeadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    // 余裕度に応じてラベル色を変える
    const labelColor = daysUntil <= 14 ? 'var(--amber)' : 'var(--green)';
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${nextLesson}〜 ・ 次の締切 ${dateStr}</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${labelColor};flex-shrink:0">あと${daysUntil}日</span>
      </div>`;
  }).join('');
}

// ============================================================
// 迫っている締切一覧（一番下）
// ============================================================
function renderUpcomingDeadlines(subjects, sem) {
  const el = document.getElementById('today-upcoming');
  if (!el) return;
  if (subjects.length === 0) { el.innerHTML = ''; return; }

  const now          = new Date();
  const twoWeeks     = new Date(now.getTime() + 14 * 86400000);
  const items        = [];

  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
    for (let n = 1; n <= s.lessons; n++) {
      if (n <= doneLessons) continue;
      const deadline = getLessonDeadline(n, s, sem);
      if (deadline > twoWeeks) break;
      const isLate   = deadline < now;
      const daysLeft = Math.ceil((deadline - now) / 86400000);
      items.push({ s, n, deadline, isLate, daysLeft });
    }
  });

  if (items.length === 0) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`;
    return;
  }
  items.sort((a, b) => a.deadline - b.deadline);

  el.innerHTML = items.map(({ s, n, deadline, isLate, daysLeft }) => {
    const color   = getCategoryColor(s.category);
    const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    let labelStyle, labelText, rowStyle = '';
    if (isLate)          { labelStyle = 'color:var(--red)';   labelText = '遅刻中';          rowStyle = 'border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=3){ labelStyle = 'color:var(--red)';   labelText = `あと${daysLeft}日`; rowStyle = 'border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=7){ labelStyle = 'color:var(--amber)'; labelText = `あと${daysLeft}日`; rowStyle = 'border-left:3px solid var(--amber);padding-left:10px'; }
    else                 { labelStyle = 'color:var(--text3)'; labelText = `あと${daysLeft}日`; rowStyle = 'border-left:3px solid var(--border);padding-left:10px'; }
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);${rowStyle}">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${n} ・ 〜${dateStr} 12:00</div>
        </div>
        <span style="font-size:11px;font-weight:700;${labelStyle};flex-shrink:0">${labelText}</span>
      </div>`;
  }).join('');
}
