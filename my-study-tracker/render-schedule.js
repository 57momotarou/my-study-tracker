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
  weekStart.setDate(now.getDate() - todayDow); // 日曜始まり
  weekStart.setHours(0, 0, 0, 0);

  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
  const el = document.getElementById('schedule-week');
  el.innerHTML = '';

  for (let d = 0; d < 7; d++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + d);
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    const isToday = d === todayDow;

    // この日が締切のコマを収集
    const deadlines = [];
    subjects.forEach(s => {
      const done = getCompletedLessons(s.code);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        // この日の12:00が締切のコマ
        if (dl.toDateString() === date.toDateString()) {
          const isDone = n <= done;
          const isLate = !isDone && dl < now;
          deadlines.push({ s, n, isDone, isLate });
        }
      }
    });

    const dayCard = document.createElement('div');
    dayCard.style.cssText = `
      background:${isToday ? 'var(--amber-dim)' : 'var(--bg2)'};
      border:1px solid ${isToday ? 'var(--amber)' : 'var(--border)'};
      border-radius:var(--radius-sm);
      padding:10px 12px;
      margin-bottom:8px;
    `;

    const dateLabel = date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' });
    dayCard.innerHTML = `
      <div style="display:flex;align-items:baseline;gap:6px;margin-bottom:${deadlines.length ? '8px' : '0'}">
        <span style="font-family:'Space Mono',monospace;font-size:11px;color:${isToday ? 'var(--amber)' : 'var(--text3)'};font-weight:700">${DOW_LABELS[d]}</span>
        <span style="font-size:13px;font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--amber)' : 'var(--text2)'}">${dateLabel}</span>
        ${isToday ? '<span style="font-size:10px;color:var(--amber);margin-left:auto">TODAY</span>' : ''}
      </div>
      ${deadlines.length === 0
        ? '<div style="font-size:11px;color:var(--text3)">締切なし</div>'
        : deadlines.map(({ s, n, isDone, isLate }) => {
            const color = getCategoryColor(s.category);
            const status = isDone ? `<span style="color:${color};font-size:10px">✅完了</span>`
                         : isLate ? `<span style="color:var(--red);font-size:10px">🔴遅刻</span>`
                         : `<span style="color:var(--amber);font-size:10px">⏰期限</span>`;
            return `
              <div style="display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border)">
                <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
                <span style="font-size:12px;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</span>
                <span style="font-size:11px;color:var(--text3);flex-shrink:0">コマ${n}</span>
                ${status}
              </div>`;
          }).join('')
      }`;

    el.appendChild(dayCard);
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
  const deadlineMap = {}; // 'YYYY-M-D' → [{s, n, isDone, isLate}]
  subjects.forEach(s => {
    const done = getCompletedLessons(s.code);
    for (let n = 1; n <= s.lessons; n++) {
      const dl = getLessonDeadline(n, s, sem);
      if (dl.getFullYear() === year && dl.getMonth() === month) {
        const key = `${year}-${month}-${dl.getDate()}`;
        if (!deadlineMap[key]) deadlineMap[key] = [];
        const isDone = n <= done;
        const isLate = !isDone && dl < now;
        deadlineMap[key].push({ s, n, isDone, isLate });
      }
    }
  });

  const el = document.getElementById('schedule-month');
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  let html = `
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
      ${DOW_LABELS.map(d => `<div style="text-align:center;font-size:10px;color:var(--text3);padding:4px 0">${d}</div>`).join('')}
    </div>
    <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;

  // 月初前の空白
  for (let i = 0; i < firstDow; i++) {
    html += `<div></div>`;
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month, day);
    const isToday = date.toDateString() === now.toDateString();
    const key = `${year}-${month}-${day}`;
    const items = deadlineMap[key] || [];

    const hasLate = items.some(i => i.isLate);
    const hasPending = items.some(i => !i.isDone && !i.isLate);
    const hasDone = items.some(i => i.isDone);

    let dotColor = '';
    if (hasLate) dotColor = 'var(--red)';
    else if (hasPending) dotColor = 'var(--amber)';
    else if (hasDone) dotColor = 'var(--green)';

    const itemsJson = encodeURIComponent(JSON.stringify(
      items.map(i => ({ name: i.s.name, n: i.n, isDone: i.isDone, isLate: i.isLate, cat: i.s.category }))
    ));

    html += `
      <div onclick="showDayDeadlines('${year}/${month+1}/${day}', '${itemsJson}')"
        style="
          aspect-ratio:1;
          border-radius:6px;
          background:${isToday ? 'var(--amber-dim)' : items.length ? 'var(--bg3)' : 'transparent'};
          border:1px solid ${isToday ? 'var(--amber)' : 'var(--border)'};
          display:flex;flex-direction:column;align-items:center;justify-content:center;
          gap:2px;cursor:${items.length ? 'pointer' : 'default'};
          position:relative;
        ">
        <span style="font-size:12px;font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--amber)' : 'var(--text2)'}">${day}</span>
        ${dotColor ? `<div style="width:5px;height:5px;border-radius:50%;background:${dotColor}"></div>` : '<div style="height:5px"></div>'}
      </div>`;
  }

  html += `</div>`;
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
          <div style="font-size:11px;color:var(--text3)">コマ${n} 締切</div>
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
