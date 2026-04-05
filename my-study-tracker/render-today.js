// ============================================================
// my-study-tracker - render-today.js
// ============================================================
const CPL = 4;

// ============================================================
// 学事アラート（期末試験・成績発表）
// ============================================================
function renderExamAlerts(sem) {
  const el = document.getElementById('today-exam-alerts');
  if (!el) return;
  el.innerHTML = '';
  if (!sem.exams && !sem.seiseki) return;

  const now     = new Date();
  const alerts  = [];

  // 期末試験アラート
  (sem.exams || []).forEach(exam => {
    const examDate = new Date(exam.date);
    examDate.setHours(23, 59, 59);
    const daysLeft = Math.ceil((examDate - now) / 86400000);
    if (daysLeft >= -3 && daysLeft <= 14) {
      alerts.push({ label: exam.label, daysLeft, isPast: daysLeft < 0, isUrgent: daysLeft <= 3 });
    }
  });

  // 成績発表アラート
  if (sem.seiseki) {
    const d = new Date(sem.seiseki);
    const daysLeft = Math.ceil((d - now) / 86400000);
    if (daysLeft >= -3 && daysLeft <= 14) {
      alerts.push({ label: '成績発表', daysLeft, isPast: daysLeft < 0, isSeiseki: true });
    }
  }

  alerts.forEach(({ label, daysLeft, isPast, isUrgent, isSeiseki }) => {
    const icon    = isSeiseki ? '📊' : '📝';
    const bg      = isPast ? 'var(--bg3)' : isUrgent ? 'var(--red-dim)' : 'var(--amber-dim)';
    const border  = isPast ? 'var(--border)' : isUrgent ? 'var(--red)' : 'var(--amber)';
    const color   = isPast ? 'var(--text3)' : isUrgent ? 'var(--red)' : 'var(--amber)';
    const dayText = isPast
      ? `${Math.abs(daysLeft)}日前に終了`
      : daysLeft === 0 ? '今日が締切！'
      : daysLeft === 1 ? '明日が締切！'
      : `あと${daysLeft}日`;

    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${border};margin-bottom:8px`;
    div.innerHTML = `
      <span style="font-size:18px">${icon}</span>
      <div style="flex:1">
        <div style="font-size:13px;font-weight:700;color:${color}">${label}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">${isPast ? '終了' : '期末試験期間'}</div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${color};flex-shrink:0">${dayText}</span>`;
    el.appendChild(div);
  });
}

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

  // 学事アラート
  renderExamAlerts(sem);

  // 遅刻アラート
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
    const late = getTodayTarget(s, sem) - doneLessons;
    if (late >= 3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`;
    else if (late >= 1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中</div>`;
  });

  // TODAY カード（目標＋章グリッド）
  renderTodayTimetable(subjects, sem, semId);

  // 今週ストリップ
  renderWeekStrip(subjects, sem);

  // 先取りおすすめ
  renderAdvance(subjects, sem, semId);

  // 迫っている締切
  renderUpcoming(subjects, sem);
}

// ============================================================
// TODAY カード：科目ごとに「今日は何章やればOK」を表示
// ============================================================
function renderTodayTimetable(subjects, sem, semId) {
  const ttEl = document.getElementById('today-timetable');
  ttEl.innerHTML = '';

  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">科目が登録されていません</div>
      <div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div>
    </div>`;
    return;
  }

  const now = new Date();
  // 今日やるべき科目を抽出・優先度順ソート
  const items = subjects.map(s => {
    const doneChapters = getCompletedLessons(s.code);
    const doneLessons  = Math.floor(doneChapters / CPL);
    const target       = getTodayTarget(s, sem);
    const recommended  = getTodayRecommended(s, sem);
    const late         = Math.max(0, target - doneLessons);
    const needThisWeek = Math.max(0, recommended - doneLessons);
    return { s, doneChapters, doneLessons, recommended, late, needThisWeek };
  }).filter(i => i.late > 0 || i.needThisWeek > 0)
    .sort((a, b) => b.late - a.late || b.needThisWeek - a.needThisWeek);

  if (items.length === 0) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の出席認定はすべてOK！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div>
    </div>`;
    return;
  }

  // 見出し：今日の時間割
  const header = document.createElement('div');
  header.style.cssText = 'font-size:11px;color:var(--text3);margin-bottom:10px;display:flex;align-items:center;gap:6px';
  header.innerHTML = `<span>📋</span><span>今日やること（タップで章管理）</span>`;
  ttEl.appendChild(header);

  items.forEach(item => {
    const card = buildTodaySubjectCard(item, sem, semId);
    ttEl.appendChild(card);
  });
}

function buildTodaySubjectCard({ s, doneChapters, doneLessons, recommended, late, needThisWeek }, sem, semId) {
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneChapters / (s.lessons * CPL) * 100);

  // 今日の目標計算
  let goalLesson, goalChapter, goalLabel, goalColor, badgeText, badgeClass;
  if (late > 0) {
    const nextCh    = doneChapters + 1;
    goalLesson      = Math.ceil(nextCh / CPL);
    goalChapter     = ((nextCh - 1) % CPL) + 1;
    goalLabel       = '今すぐ取り掛かろう';
    goalColor       = 'var(--red)';
    badgeText       = `🔴 ${late}コマ遅刻中`;
    badgeClass      = 'badge-danger';
  } else {
    goalLesson      = recommended;
    goalChapter     = CPL;
    goalLabel       = '今週中にここまでで出席認定OK';
    goalColor       = 'var(--amber)';
    badgeText       = `🟡 今週あと${needThisWeek}コマ`;
    badgeClass      = 'badge-warn';
  }

  const alreadyDone = doneChapters >= (goalLesson - 1) * CPL + goalChapter;
  const doneChInLes = doneChapters % CPL;
  const nowLabel    = doneChInLes > 0
    ? `コマ${doneLessons+1} 第${doneChInLes}章まで完了`
    : doneLessons > 0 ? `コマ${doneLessons} 完了` : '未受講';

  // ── 章グリッドコンテナ（先に作成） ──
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display:none;margin-top:10px';
  const grid = buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color);
  gridContainer.appendChild(grid);

  // ── カード本体 ──
  const card = document.createElement('div');
  card.className = 'today-subject-card';
  card.style.borderLeft = `3px solid ${color}`;

  // 科目名＋バッジ行（クリック無効）
  const topRow = document.createElement('div');
  topRow.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px';
  topRow.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
      <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
    </div>
    <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>`;
  card.appendChild(topRow);

  // 目標ボックス（クリック無効）
  const goalBox = document.createElement('div');
  goalBox.className = 'today-goal-box';
  goalBox.style.cssText = `border-color:${goalColor};background:${goalColor}18;margin-bottom:10px`;
  goalBox.innerHTML = `
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
      <div style="font-size:11px;color:${goalColor};margin-top:4px;font-weight:600">${goalLabel}</div>`}`;
  card.appendChild(goalBox);

  // プログレスバー＋展開トリガー
  const toggleArea = document.createElement('div');
  toggleArea.style.cssText = 'cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent';

  const icon = document.createElement('svg');
  icon.setAttribute('viewBox', '0 0 24 24');
  icon.setAttribute('fill', 'none');
  icon.setAttribute('stroke', 'currentColor');
  icon.setAttribute('stroke-width', '2.5');
  icon.setAttribute('width', '14');
  icon.setAttribute('height', '14');
  icon.style.cssText = 'color:var(--text3);transition:transform 0.2s;pointer-events:none;flex-shrink:0';
  icon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';

  const metaRow = document.createElement('div');
  metaRow.style.cssText = 'display:flex;align-items:center;justify-content:space-between;margin-bottom:4px';
  const nowSpan = document.createElement('span');
  nowSpan.style.cssText = 'font-size:11px;color:var(--text3)';
  nowSpan.textContent = `現在：${nowLabel}`;
  const pctDiv = document.createElement('div');
  pctDiv.style.cssText = 'display:flex;align-items:center;gap:5px';
  const pctSpan = document.createElement('span');
  pctSpan.style.cssText = `font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}`;
  pctSpan.textContent = `${pct}%`;
  pctDiv.appendChild(pctSpan);
  pctDiv.appendChild(icon);
  metaRow.appendChild(nowSpan);
  metaRow.appendChild(pctDiv);

  const progWrap = document.createElement('div');
  progWrap.className = 'prog-wrap';
  const progBar = document.createElement('div');
  progBar.className = 'prog-bar';
  progBar.style.cssText = `width:${pct}%;background:${color}`;
  progWrap.appendChild(progBar);

  toggleArea.appendChild(metaRow);
  toggleArea.appendChild(progWrap);

  // ★ アコーディオン：makeAccordionを使用
  makeAccordion(toggleArea, gridContainer, null);
  toggleArea.addEventListener('click', (e) => {
    if (gridContainer.contains(e.target)) return;
    const open = gridContainer.style.display === 'none';
    icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  card.appendChild(toggleArea);
  card.appendChild(gridContainer);
  return card;
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

    // 締切コマ
    const deadlines = [];
    subjects.forEach(s => {
      const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
      const recommended = getTodayRecommended(s, sem);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString()) {
          deadlines.push({ s, n, isDone: n <= doneLessons, isLate: n > doneLessons && dl < now });
        }
      }
      // 「この日に受講推奨」コマ（締切7日前）
    });

    // 受講推奨コマ（この日が目標日のコマ）
    const recommended_items = [];
    subjects.forEach(s => {
      const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
      for (let n = doneLessons + 1; n <= s.lessons; n++) {
        if (!isLessonAvailable(n, s, sem)) continue;
        const dl = getLessonDeadline(n, s, sem);
        const advTarget = new Date(dl.getTime() - 7 * 86400000);
        if (advTarget.toDateString() === date.toDateString()) {
          recommended_items.push(s);
          break;
        }
      }
    });

    const cell = document.createElement('div');
    cell.className = 'week-cell' + (isToday ? ' is-today' : '');

    const dots = deadlines.slice(0, 3).map(({ isDone, isLate }) => {
      const c = isDone ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--amber)';
      return `<div class="week-subject-dot" style="background:${c}"></div>`;
    }).join('');

    // 受講推奨ドット（青）
    const recDots = recommended_items.slice(0, 2).map(() =>
      `<div class="week-subject-dot" style="background:#60a5fa;opacity:0.7"></div>`
    ).join('');

    cell.innerHTML = `
      <div class="week-day-label">${LABELS[d]}</div>
      <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--amber)':'var(--text2)'}">${date.getDate()}</div>
      <div style="display:flex;gap:2px;min-height:8px;flex-wrap:wrap;justify-content:center">${dots}${recDots}</div>
      ${(deadlines.length + recommended_items.length) > 3 ? `<div style="font-size:9px;color:var(--text3)">...</div>` : ''}`;
    el.appendChild(cell);
  }
}

// ============================================================
// 先取りおすすめ（章グリッド付き）
// ============================================================
function renderAdvance(subjects, sem, semId) {
  const el = document.getElementById('today-advance');
  if (!el) return;
  const now = new Date();
  const advances = [];

  subjects.forEach(s => {
    const doneCh      = getCompletedLessons(s.code);
    const doneLessons = Math.floor(doneCh / CPL);
    const late        = Math.max(0, getTodayTarget(s, sem) - doneLessons);
    const recommended = getTodayRecommended(s, sem);
    if (late > 0 || recommended > doneLessons || doneLessons >= s.lessons) return;
    const nextLesson = doneLessons + 1;
    if (!isLessonAvailable(nextLesson, s, sem)) return;
    const nextDeadline = getLessonDeadline(nextLesson, s, sem);
    const daysUntil    = Math.ceil((nextDeadline - now) / 86400000);
    if (daysUntil < 7) return;
    advances.push({ s, doneCh, doneLessons, nextLesson, nextDeadline, daysUntil, recommended });
  });

  if (advances.length === 0) {
    el.innerHTML = `<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">先取りに余裕のある科目はありません</div>`;
    return;
  }
  advances.sort((a, b) => a.daysUntil - b.daysUntil);
  el.innerHTML = '';

  advances.slice(0, 5).forEach(({ s, doneCh, doneLessons, nextLesson, nextDeadline, daysUntil, recommended }) => {
    const color      = getCategoryColor(s.category);
    const dateStr    = nextDeadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    const labelColor = daysUntil <= 14 ? 'var(--amber)' : 'var(--green)';
    const pct        = Math.round(doneCh / (s.lessons * CPL) * 100);

    const wrapper = document.createElement('div');
    wrapper.style.cssText = 'border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:4px';

    // アコーディオンヘッダー
    const toggleRow = document.createElement('div');
    toggleRow.style.cssText = 'cursor:pointer;-webkit-user-select:none;user-select:none;-webkit-tap-highlight-color:transparent';

    const icon = document.createElement('svg');
    icon.setAttribute('viewBox','0 0 24 24');
    icon.setAttribute('fill','none');
    icon.setAttribute('stroke','currentColor');
    icon.setAttribute('stroke-width','2.5');
    icon.setAttribute('width','13');
    icon.setAttribute('height','13');
    icon.style.cssText = 'color:var(--text3);transition:transform 0.2s;pointer-events:none;flex-shrink:0';
    icon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';

    toggleRow.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${nextLesson}〜 ・ 次の締切 ${dateStr} ・ ${pct}%完了</div>
        </div>
        <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
          <span style="font-size:11px;font-weight:700;color:${labelColor}">あと${daysUntil}日</span>
        </div>
      </div>`;
    toggleRow.appendChild(icon); // iconはwrapper外に配置→追記

    // iconをflex行の末尾に入れる
    const flexRow = toggleRow.querySelector('div > div:last-child');
    if (flexRow) flexRow.appendChild(icon);

    const gridContainer = document.createElement('div');
    gridContainer.style.display = 'none';
    const grid = buildChapterGrid(s, sem, semId, doneCh, doneLessons, recommended, color);
    gridContainer.appendChild(grid);

    makeAccordion(toggleRow, gridContainer, null);
    toggleRow.addEventListener('click', (e) => {
      if (gridContainer.contains(e.target)) return;
      const open = gridContainer.style.display === 'none';
      icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
    });

    wrapper.appendChild(toggleRow);
    wrapper.appendChild(gridContainer);
    el.appendChild(wrapper);
  });
}

// ============================================================
// 迫っている締切＋期末試験日（一番下）
// ============================================================
function renderUpcoming(subjects, sem) {
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

  let html = '';

  // 期末試験バナー（30日以内）
  if (sem.attendance && sem.attendance.senmon_jyunji && sem.attendance.senmon_jyunji[16]) {
    const entry    = sem.attendance.senmon_jyunji[16];
    const deadline = new Date(typeof entry === 'string' ? entry : entry.end);
    const daysLeft = Math.ceil((deadline - now) / 86400000);
    if (daysLeft > -3 && daysLeft <= 30) {
      const isPast  = daysLeft < 0;
      const bd      = isPast ? 'var(--border)' : daysLeft <= 7 ? 'var(--red)' : 'var(--amber)';
      const bg      = isPast ? 'var(--bg3)' : daysLeft <= 7 ? 'var(--red-dim)' : 'var(--amber-dim)';
      const tx      = isPast ? 'var(--text3)' : daysLeft <= 7 ? 'var(--red)' : 'var(--amber)';
      const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
      const label   = isPast ? `${Math.abs(daysLeft)}日前に終了` : daysLeft === 0 ? '今日が締切！' : `あと${daysLeft}日`;
      html += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${bd};margin-bottom:10px">
        <span style="font-size:18px">📝</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:${tx}">期末試験（専門・順次開講）</div>
          <div style="font-size:11px;color:var(--text3)">〜 ${dateStr} 12:00 まで</div>
        </div>
        <span style="font-size:11px;font-weight:700;color:${tx};flex-shrink:0">${label}</span>
      </div>`;
    }
  }

  if (items.length === 0 && !html) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`;
    return;
  }

  items.sort((a,b) => a.deadline - b.deadline);
  html += items.map(({ s, n, deadline, isLate, daysLeft }) => {
    const color   = getCategoryColor(s.category);
    const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    let ls, lt, rs = '';
    if (isLate)            { ls='color:var(--red)';  lt='遅刻中';          rs='border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=3)  { ls='color:var(--red)';  lt=`あと${daysLeft}日`; rs='border-left:3px solid var(--red);padding-left:10px'; }
    else if (daysLeft<=7)  { ls='color:var(--amber)';lt=`あと${daysLeft}日`; rs='border-left:3px solid var(--amber);padding-left:10px'; }
    else                   { ls='color:var(--text3)';lt=`あと${daysLeft}日`; rs='border-left:3px solid var(--border);padding-left:10px'; }
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);${rs}">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 〜${dateStr} 12:00</div>
      </div>
      <span style="font-size:11px;font-weight:700;${ls};flex-shrink:0">${lt}</span>
    </div>`;
  }).join('');

  el.innerHTML = html;
}
