// ============================================================
// my-study-tracker - render-schedule.js
// スケジュールタブ（週/月切り替え）
// ============================================================

let scheduleView = 'week'; // 'week' or 'month'
let scheduleMonthOffset = 0; // 月オフセット（0=今月）

function renderSchedulePage() {
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);

  // ビュー切り替えボタン
  document.getElementById('schedule-view-week').classList.toggle('active', scheduleView === 'week');
  document.getElementById('schedule-view-month').classList.toggle('active', scheduleView === 'month');

  if (scheduleView === 'week') {
    renderWeekSchedule(subjects, sem);
    document.getElementById('schedule-month-nav').style.display = 'none';
    document.getElementById('schedule-week').style.display = 'block';
    document.getElementById('schedule-month').style.display = 'none';
  } else {
    renderMonthSchedule(subjects, sem);
    document.getElementById('schedule-month-nav').style.display = 'flex';
    document.getElementById('schedule-week').style.display = 'none';
    document.getElementById('schedule-month').style.display = 'block';
  }
}

// ── 週表示 ──────────────────────────────────────
function renderWeekSchedule(subjects, sem) {
  const now = new Date();
  const todayDow = now.getDay();
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() - todayDow);
  weekStart.setHours(0, 0, 0, 0);

  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  const el = document.getElementById('schedule-week');
  el.innerHTML = '';

  let totalDeadlines = 0;

  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    const isToday = d === todayDow;
    const isPast  = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());

    // この日が締切のコマを収集
    const deadlines = [];
    subjects.forEach(s => {
      const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString()) {
          const isDone = n <= doneLessons;
          const isLate = !isDone && dl < now;
          deadlines.push({ s, n, isDone, isLate });
        }
      }
    });
    totalDeadlines += deadlines.length;

    const dayCard = document.createElement('div');
    dayCard.style.cssText = `
      background:${isToday ? 'var(--amber-dim)' : isPast ? 'rgba(17,24,39,0.5)' : 'var(--bg2)'};
      border:1px solid ${isToday ? 'var(--amber)' : 'var(--border)'};
      border-radius:var(--radius-sm);
      padding:10px 12px;
      margin-bottom:6px;
      opacity:${isPast && !isToday ? '0.7' : '1'};
    `;

    const dateLabel = date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });

    // 締切科目の行HTML
    const deadlineRows = deadlines.length === 0
      ? `<div style="font-size:11px;color:var(--text3);padding:2px 0">締切なし</div>`
      : deadlines.map(({ s, n, isDone, isLate }) => {
          const color = getCategoryColor(s.category);
          let statusIcon, statusStyle;
          if (isDone)    { statusIcon = '✅'; statusStyle = `color:${color}`; }
          else if (isLate) { statusIcon = '🔴'; statusStyle = 'color:var(--red)'; }
          else             { statusIcon = '⏰'; statusStyle = 'color:var(--amber)'; }

          return `
            <div style="display:flex;align-items:center;gap:6px;padding:5px 0;border-bottom:1px solid var(--border);">
              <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
              <div style="flex:1;min-width:0">
                <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
                <div style="font-size:10px;color:var(--text3)">コマ${n} ・ 12:00締切</div>
              </div>
              <span style="font-size:13px;${statusStyle}">${statusIcon}</span>
            </div>`;
        }).join('');

    dayCard.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${deadlines.length ? '8px' : '4px'}">
        <span style="font-size:11px;font-weight:700;color:${isToday ? 'var(--amber)' : isPast ? 'var(--text3)' : 'var(--text2)'};font-family:'Space Mono',monospace;width:16px">${DOW_LABELS[d]}</span>
        <span style="font-size:13px;font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--amber)' : isPast ? 'var(--text3)' : 'var(--text2)'}">${dateLabel}</span>
        ${isToday ? '<span style="font-size:9px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:auto">TODAY</span>' : ''}
        ${deadlines.length > 0 && !isToday ? `<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:auto">${deadlines.length}件</span>` : ''}
      </div>
      ${deadlineRows}`;

    el.appendChild(dayCard);
  }

  // 今週に締切がない場合
  if (totalDeadlines === 0) {
    const note = document.createElement('div');
    note.style.cssText = 'text-align:center;padding:12px;font-size:12px;color:var(--text3)';
    note.textContent = '今週は締切のある科目がありません';
    el.appendChild(note);
  }
}

// ── 月表示 ──────────────────────────────────────
function renderMonthSchedule(subjects, sem) {
  const now = new Date();
  const base = new Date(now.getFullYear(), now.getMonth() + scheduleMonthOffset, 1);
  const year = base.getFullYear();
  const month = base.getMonth();

  document.getElementById('schedule-month-label').textContent =
    `${year}年${month + 1}月`;

  const firstDow = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 各日の締切コマを事前収集
  const deadlineMap = {};
  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
    for (let n = 1; n <= s.lessons; n++) {
      const dl = getLessonDeadline(n, s, sem);
      if (dl.getFullYear() === year && dl.getMonth() === month) {
        const key = `${year}-${month}-${dl.getDate()}`;
        if (!deadlineMap[key]) deadlineMap[key] = [];
        const isDone = n <= doneLessons;
        const isLate = !isDone && dl < now;
        deadlineMap[key].push({ s, n, isDone, isLate });
      }
    }
  });

  const el = document.getElementById('schedule-month');
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  let html = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:6px">
      ${DOW_LABELS.map((d, i) => `<div style="text-align:center;font-size:10px;color:${i===0?'#ef4444':i===6?'#3b82f6':'var(--text3)'};padding:4px 0;font-weight:600">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;

  for (let i = 0; i < firstDow; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const dow  = date.getDay();
    const isToday = date.toDateString() === now.toDateString();
    const isPast  = date < new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const key = `${year}-${month}-${day}`;
    const items = deadlineMap[key] || [];

    const hasLate    = items.some(i => i.isLate);
    const hasPending = items.some(i => !i.isDone && !i.isLate);
    const hasDone    = items.some(i => i.isDone);

    let dotColor = '';
    if (hasLate) dotColor = 'var(--red)';
    else if (hasPending) dotColor = 'var(--amber)';
    else if (hasDone) dotColor = 'var(--green)';

    const dayColor = isToday ? 'var(--amber)' : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa' : isPast ? 'var(--text3)' : 'var(--text2)';

    // 科目名ラベル（最大2件）
    const subjectLabels = items.slice(0, 2).map(({ s, isDone, isLate }) => {
      const c = isDone ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--amber)';
      const bg = isDone ? 'rgba(16,185,129,0.12)' : isLate ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
      // 科目名を短縮（6文字まで）
      const shortName = s.name.length > 5 ? s.name.slice(0, 5) + '…' : s.name;
      return `<div style="font-size:8px;color:${c};background:${bg};border-radius:3px;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${shortName}</div>`;
    }).join('');

    const moreLabel = items.length > 2 ? `<div style="font-size:8px;color:var(--text3)">+${items.length-2}</div>` : '';

    const itemsJson = encodeURIComponent(JSON.stringify(
      items.map(i => ({ name: i.s.name, n: i.n, isDone: i.isDone, isLate: i.isLate, cat: i.s.category }))
    ));

    html += `
      <div onclick="${items.length ? `showDayDeadlines('${year}/${month+1}/${day}', '${itemsJson}')` : ''}"
        style="
          min-height:52px;
          border-radius:6px;
          background:${isToday ? 'var(--amber-dim)' : items.length ? 'var(--bg3)' : 'transparent'};
          border:1px solid ${isToday ? 'var(--amber)' : items.length ? 'var(--border)' : 'transparent'};
          padding:4px;
          display:flex;flex-direction:column;gap:2px;
          cursor:${items.length ? 'pointer' : 'default'};
          opacity:${isPast && !isToday && !items.length ? '0.4' : '1'};
        ">
        <span style="font-size:11px;font-weight:${isToday ? '700' : '500'};color:${dayColor};line-height:1.2">${day}</span>
        ${dotColor ? `<div style="width:4px;height:4px;border-radius:50%;background:${dotColor}"></div>` : ''}
        ${subjectLabels}
        ${moreLabel}
      </div>`;
  }

  html += `</div>

  <!-- 凡例 -->
  <div style="display:flex;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap">
    <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:50%;background:var(--amber)"></div>未受講</div>
    <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:50%;background:var(--red)"></div>遅刻</div>
    <div style="display:flex;align-items:center;gap:4px;font-size:10px;color:var(--text3)"><div style="width:8px;height:8px;border-radius:50%;background:var(--green)"></div>完了</div>
    <div style="font-size:10px;color:var(--text3);margin-left:auto">タップで詳細</div>
  </div>`;

  el.innerHTML = html;
}

// 月カレンダーのタップ時：その日の締切一覧をモーダルで表示
function showDayDeadlines(dateLabel, itemsJson) {
  const items = JSON.parse(decodeURIComponent(itemsJson));
  if (items.length === 0) return;

  const existing = document.getElementById('day-deadline-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'day-deadline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:500;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:flex-end;
    padding-bottom:env(safe-area-inset-bottom);
  `;

  const rows = items.map(({ name, n, isDone, isLate, cat }) => {
    const color = (CATEGORY_CONFIG[cat] || {}).color || '#64748b';
    const status = isDone ? `<span style="color:var(--green)">✅ 完了</span>`
                 : isLate ? `<span style="color:var(--red)">🔴 遅刻中</span>`
                 : `<span style="color:var(--amber)">⏰ 要受講</span>`;
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
        <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500">${name}</div>
          <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 12:00締切</div>
        </div>
        ${status}
      </div>`;
  }).join('');

  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:70vh;overflow-y:auto;padding:20px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px">DEADLINES</div>
          <div style="font-size:15px;font-weight:700;margin-top:2px">${dateLabel}</div>
        </div>
        <button onclick="document.getElementById('day-deadline-modal').remove()" style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
      </div>
      ${rows}
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
