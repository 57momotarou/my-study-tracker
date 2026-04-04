// ============================================================
// my-study-tracker - render-today.js
// ============================================================

const CPL = 4; // chapters per lesson

// ============================================================
// メイン描画
// ============================================================
function renderToday() {
  const today    = new Date();
  const sem      = getCurrentSemester();
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP', { year:'numeric', month:'long', day:'numeric', weekday:'long' });

  // アラート（遅刻警告）
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
    const late = getTodayTarget(s, sem) - doneLessons;
    if (late >= 3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`;
    else if (late >= 1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中 — 優先受講を</div>`;
  });

  // TODAY カード（目標＋章グリッド）
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

  // 今週ストリップ
  renderWeekStrip(subjects, sem);
  // 先取りおすすめ（章グリッド付き）
  renderAdvanceRecommendations(subjects, sem, semId);
  // 迫っている締切
  renderUpcomingDeadlines(subjects, sem);
}

// ============================================================
// 今日タブ：科目カード（目標＋章グリッドアコーディオン）
// ============================================================
function buildTodayCard(item, sem, semId, container) {
  const { s, doneChapters, doneLessons, recommended, late, needThisWeek } = item;
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneChapters / (s.lessons * CPL) * 100);

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
  const nowLabel = doneChInLes > 0
    ? `コマ${doneLessons+1} 第${doneChInLes}章まで完了`
    : doneLessons > 0 ? `コマ${doneLessons} 完了` : '未受講';

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
    <div id="today-toggle-${s.code}" style="cursor:pointer;-webkit-user-select:none;user-select:none">
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

  // 章グリッド注入
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
    date.setHours(0,0,0,0);
    const isToday = d === todayDow;
    const items = [];
    subjects.forEach(s => {
      const done = Math.floor(getCompletedLessons(s.code) / CPL);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString())
          items.push({ isDone: n <= done, isLate: n > done && dl < now });
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
// 先取りおすすめ（締切近い順・章グリッド付き）
// ============================================================
function renderAdvanceRecommendations(subjects, sem, semId) {
  const el = document.getElementById('today-advance');
  if (!el) return;
  const now = new Date();
  const advances = [];

  subjects.forEach(s => {
    const doneChapters = getCompletedLessons(s.code);
    const doneLessons  = Math.floor(doneChapters / CPL);
    const late         = Math.max(0, getTodayTarget(s, sem) - doneLessons);
    const recommended  = getTodayRecommended(s, sem);

    if (late > 0)                  return;
    if (recommended > doneLessons) return;
    if (doneLessons >= s.lessons)  return;

    const nextLesson = doneLessons + 1;
    if (!isLessonAvailable(nextLesson, s, sem)) return;

    const nextDeadline = getLessonDeadline(nextLesson, s, sem);
    const daysUntil    = Math.ceil((nextDeadline - now) / 86400000);
    if (daysUntil < 7) return;

    advances.push({ s, doneChapters, doneLessons, nextLesson, nextDeadline, daysUntil, recommended });
  });

  if (advances.length === 0) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">先取りに余裕のある科目はありません</div>`;
    return;
  }

  // 締切近い順（昇順）
  advances.sort((a, b) => a.daysUntil - b.daysUntil);
  el.innerHTML = '';

  advances.slice(0, 5).forEach(({ s, doneChapters, doneLessons, nextLesson, nextDeadline, daysUntil, recommended }) => {
    const color    = getCategoryColor(s.category);
    const dateStr  = nextDeadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    const labelColor = daysUntil <= 14 ? 'var(--amber)' : 'var(--green)';
    const pct = Math.round(doneChapters / (s.lessons * CPL) * 100);

    const div = document.createElement('div');
    div.style.cssText = 'border-bottom:1px solid var(--border);padding-bottom:8px;margin-bottom:8px';
    div.innerHTML = `
      <div id="adv-toggle-${s.code}" style="display:flex;align-items:center;gap:10px;padding:8px 0;cursor:pointer;-webkit-user-select:none;user-select:none">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${nextLesson}〜 ・ 次の締切 ${dateStr} ・ ${pct}%完了</div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;color:${labelColor}">あと${daysUntil}日</span>
          <svg id="adv-icon-${s.code}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" width="13" height="13" style="color:var(--text3);transition:transform 0.2s">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </div>
      </div>
      <div id="adv-grid-${s.code}" style="display:none;margin-top:4px"></div>`;
    el.appendChild(div);

    // 章グリッド注入
    const gridEl = document.getElementById(`adv-grid-${s.code}`);
    gridEl.appendChild(buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color));

    // タップで展開
    document.getElementById(`adv-toggle-${s.code}`).addEventListener('click', () => {
      const grid = document.getElementById(`adv-grid-${s.code}`);
      const icon = document.getElementById(`adv-icon-${s.code}`);
      const open = grid.style.display === 'none';
      grid.style.display = open ? 'block' : 'none';
      if (icon) icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    });
  });
}

// ============================================================
// 迫っている締切（一番下）＋期末試験日表示
// ============================================================
function renderUpcomingDeadlines(subjects, sem) {
  const el = document.getElementById('today-upcoming');
  if (!el) return;
  if (subjects.length === 0) { el.innerHTML = ''; return; }

  const now      = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 86400000);
  const items    = [];

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

  // 期末試験日（senmon_jyunji の index 16）
  const kimatsuItems = [];
  if (sem.attendance && sem.attendance.senmon_jyunji && sem.attendance.senmon_jyunji[16]) {
    const entry    = sem.attendance.senmon_jyunji[16];
    const deadline = new Date(typeof entry === 'string' ? entry : entry.end);
    const daysLeft = Math.ceil((deadline - now) / 86400000);
    if (daysLeft <= 30 && daysLeft > -30) {
      kimatsuItems.push({ deadline, daysLeft });
    }
  }

  let html = '';

  // 期末試験バナー
  kimatsuItems.forEach(({ deadline, daysLeft }) => {
    const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    const isPast  = daysLeft < 0;
    const bgColor = isPast ? 'var(--bg3)' : daysLeft <= 7 ? 'var(--red-dim)' : 'var(--amber-dim)';
    const bdColor = isPast ? 'var(--border)' : daysLeft <= 7 ? 'var(--red)' : 'var(--amber)';
    const txColor = isPast ? 'var(--text3)' : daysLeft <= 7 ? 'var(--red)' : 'var(--amber)';
    const label   = isPast ? `${Math.abs(daysLeft)}日前に終了` : `あと${daysLeft}日`;
    html += `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bgColor};border:1px solid ${bdColor};margin-bottom:10px">
        <span style="font-size:18px">📝</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:${txColor}">期末試験（専門・順次開講）</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">〜 ${dateStr} 12:00 まで</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${txColor};flex-shrink:0">${label}</span>
      </div>`;
  });

  if (items.length === 0 && kimatsuItems.length === 0) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`;
    return;
  }

  if (items.length === 0) {
    el.innerHTML = html;
    return;
  }

  items.sort((a, b) => a.deadline - b.deadline);
  html += items.map(({ s, n, deadline, isLate, daysLeft }) => {
    const color   = getCategoryColor(s.category);
    const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    let labelStyle, labelText, rowStyle = '';
    if (isLate)           { labelStyle='color:var(--red)';   labelText='遅刻中';           rowStyle='border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=3) { labelStyle='color:var(--red)';   labelText=`あと${daysLeft}日`; rowStyle='border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=7) { labelStyle='color:var(--amber)'; labelText=`あと${daysLeft}日`; rowStyle='border-left:3px solid var(--amber);padding-left:10px'; }
    else                  { labelStyle='color:var(--text3)'; labelText=`あと${daysLeft}日`; rowStyle='border-left:3px solid var(--border);padding-left:10px'; }
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

  el.innerHTML = html;
}
