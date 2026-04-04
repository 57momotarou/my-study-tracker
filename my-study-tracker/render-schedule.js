// ============================================================
// my-study-tracker - render-schedule.js
// ============================================================

let scheduleView = 'week';
let scheduleMonthOffset = 0;

function renderSchedulePage() {
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);

  document.getElementById('schedule-view-week').classList.toggle('active', scheduleView === 'week');
  document.getElementById('schedule-view-month').classList.toggle('active', scheduleView === 'month');

  if (scheduleView === 'week') {
    document.getElementById('schedule-month-nav').style.display = 'none';
    document.getElementById('schedule-week').style.display = 'block';
    document.getElementById('schedule-month').style.display = 'none';
    renderWeekSchedule(subjects, sem);
  } else {
    document.getElementById('schedule-month-nav').style.display = 'flex';
    document.getElementById('schedule-week').style.display = 'none';
    document.getElementById('schedule-month').style.display = 'block';
    renderMonthSchedule(subjects, sem);
  }
}

// 期末試験日を取得する共通関数
function getKimatsuDate(sem) {
  if (sem.attendance && sem.attendance.senmon_jyunji && sem.attendance.senmon_jyunji[16]) {
    const entry = sem.attendance.senmon_jyunji[16];
    return new Date(typeof entry === 'string' ? entry : entry.end);
  }
  return null;
}

// ============================================================
// 週表示
// ============================================================
function renderWeekSchedule(subjects, sem) {
  const now      = new Date();
  const todayDow = now.getDay();
  const DOW      = ['日','月','火','水','木','金','土'];
  const el       = document.getElementById('schedule-week');
  el.innerHTML   = '';

  const kimatsuDate = getKimatsuDate(sem);

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() - todayDow + d);
    date.setHours(0, 0, 0, 0);
    const isToday = d === todayDow;
    const isPast  = date < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && !isToday;

    // この日の締切コマ
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

    // 期末試験日チェック
    const isKimatsuDay = kimatsuDate && kimatsuDate.toDateString() === date.toDateString();

    const dayEl = document.createElement('div');
    dayEl.style.cssText = `
      background:${isToday ? 'var(--amber-dim)' : isPast ? 'rgba(17,24,39,0.4)' : 'var(--bg2)'};
      border:1px solid ${isToday ? 'var(--amber)' : 'var(--border)'};
      border-radius:var(--radius-sm);
      padding:10px 12px;margin-bottom:6px;
      opacity:${isPast ? '0.65' : '1'};`;

    const dateLabel = date.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric' });
    const todayBadge = isToday ? `<span style="font-size:9px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;margin-left:auto;font-weight:700">TODAY</span>` : '';
    const countBadge = (deadlines.length > 0 || isKimatsuDay) && !isToday
      ? `<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:auto">${deadlines.length + (isKimatsuDay?1:0)}件</span>`
      : '';

    let rows = '';

    // 期末試験バッジ
    if (isKimatsuDay) {
      rows += `
        <div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--border);background:var(--purple-dim);border-radius:4px;padding:6px 8px;margin-bottom:2px">
          <span style="font-size:14px">📝</span>
          <div style="flex:1">
            <div style="font-size:12px;font-weight:700;color:var(--purple)">期末試験 締切</div>
            <div style="font-size:10px;color:var(--text3)">専門・順次開講科目 ・ 12:00</div>
          </div>
        </div>`;
    }

    if (deadlines.length === 0 && !isKimatsuDay) {
      rows += `<div style="font-size:11px;color:var(--text3);padding:2px 0">締切なし</div>`;
    } else {
      rows += deadlines.map(({ s, n, isDone, isLate }) => {
        const color = getCategoryColor(s.category);
        let icon, iconColor;
        if (isDone)      { icon = '✅'; iconColor = color; }
        else if (isLate) { icon = '🔴'; iconColor = 'var(--red)'; }
        else             { icon = '⏰'; iconColor = 'var(--amber)'; }
        return `
          <div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--border)">
            <div style="width:5px;height:5px;border-radius:50%;background:${color};flex-shrink:0"></div>
            <div style="flex:1;min-width:0">
              <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
              <div style="font-size:10px;color:var(--text3)">コマ${n} ・ 12:00締切</div>
            </div>
            <span style="font-size:13px;color:${iconColor}">${icon}</span>
          </div>`;
      }).join('');
    }

    dayEl.innerHTML = `
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${(deadlines.length||isKimatsuDay) ? '8px' : '2px'}">
        <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;
          color:${isToday ? 'var(--amber)' : isPast ? 'var(--text3)' : 'var(--text2)'}">${DOW[d]}</span>
        <span style="font-size:13px;font-weight:${isToday?'700':'400'};
          color:${isToday ? 'var(--amber)' : isPast ? 'var(--text3)' : 'var(--text2)'}">${dateLabel}</span>
        ${todayBadge}${countBadge}
      </div>
      ${rows}`;

    el.appendChild(dayEl);
  }
}

// ============================================================
// 月表示：科目名ラベル＋期末試験日
// ============================================================
function renderMonthSchedule(subjects, sem) {
  const now   = new Date();
  const base  = new Date(now.getFullYear(), now.getMonth() + scheduleMonthOffset, 1);
  const year  = base.getFullYear();
  const month = base.getMonth();

  document.getElementById('schedule-month-label').textContent = `${year}年${month+1}月`;

  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const DOW         = ['日','月','火','水','木','金','土'];
  const kimatsuDate = getKimatsuDate(sem);

  // 締切マップ構築
  const dlMap = {};
  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
    for (let n = 1; n <= s.lessons; n++) {
      const dl = getLessonDeadline(n, s, sem);
      if (dl.getFullYear() === year && dl.getMonth() === month) {
        const key = dl.getDate();
        if (!dlMap[key]) dlMap[key] = [];
        dlMap[key].push({ s, n, isDone: n <= doneLessons, isLate: n > doneLessons && dl < now });
      }
    }
  });

  const el = document.getElementById('schedule-month');

  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
    ${DOW.map((d,i) =>
      `<div style="text-align:center;font-size:10px;padding:3px 0;font-weight:600;
        color:${i===0?'#ef4444':i===6?'#60a5fa':'var(--text3)'}">${d}</div>`
    ).join('')}
  </div>
  <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;

  for (let i = 0; i < firstDow; i++) html += `<div></div>`;

  for (let day = 1; day <= daysInMonth; day++) {
    const dow          = new Date(year, month, day).getDay();
    const isToday      = new Date(year, month, day).toDateString() === now.toDateString();
    const isPast       = new Date(year, month, day) < new Date(now.getFullYear(), now.getMonth(), now.getDate()) && !isToday;
    const items        = dlMap[day] || [];
    const isKimatsuDay = kimatsuDate
      && kimatsuDate.getFullYear() === year
      && kimatsuDate.getMonth() === month
      && kimatsuDate.getDate() === day;

    const hasLate    = items.some(i => i.isLate);
    const hasPending = items.some(i => !i.isDone && !i.isLate);
    const hasDone    = items.some(i => i.isDone && !i.isLate);
    let dotColor = '';
    if (hasLate)         dotColor = 'var(--red)';
    else if (hasPending) dotColor = 'var(--amber)';
    else if (hasDone)    dotColor = 'var(--green)';

    // 科目名ラベル（最大2件）
    const labels = items.slice(0, 2).map(({ s, isDone, isLate }) => {
      const c  = isDone ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--amber)';
      const bg = isDone ? 'rgba(16,185,129,0.12)' : isLate ? 'rgba(239,68,68,0.12)' : 'rgba(245,158,11,0.12)';
      const short = s.name.length > 5 ? s.name.slice(0,5) + '…' : s.name;
      return `<div style="font-size:8px;color:${c};background:${bg};border-radius:3px;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${short}</div>`;
    }).join('');
    const more = items.length > 2 ? `<div style="font-size:8px;color:var(--text3)">+${items.length-2}</div>` : '';

    // 期末ラベル
    const kimatsuLabel = isKimatsuDay
      ? `<div style="font-size:8px;color:var(--purple);background:var(--purple-dim);border-radius:3px;padding:1px 3px;white-space:nowrap">📝期末</div>`
      : '';

    const dayColor = isToday ? 'var(--amber)'
      : dow === 0 ? '#ef4444' : dow === 6 ? '#60a5fa'
      : isPast ? 'var(--text3)' : 'var(--text2)';

    const hasContent = items.length > 0 || isKimatsuDay;
    const itemsJson = encodeURIComponent(JSON.stringify(
      items.map(i => ({ name: i.s.name, n: i.n, isDone: i.isDone, isLate: i.isLate, cat: i.s.category }))
    ));

    html += `
      <div onclick="${hasContent ? `showDayDeadlines('${year}/${month+1}/${day}','${itemsJson}',${isKimatsuDay})` : ''}"
        style="
          min-height:52px;border-radius:6px;padding:3px 4px;
          background:${isToday ? 'var(--amber-dim)' : isKimatsuDay ? 'var(--purple-dim)' : hasContent ? 'var(--bg3)' : 'transparent'};
          border:1px solid ${isToday ? 'var(--amber)' : isKimatsuDay ? 'var(--purple)' : hasContent ? 'var(--border)' : 'transparent'};
          display:flex;flex-direction:column;gap:2px;
          cursor:${hasContent ? 'pointer' : 'default'};
          opacity:${isPast && !hasContent ? '0.35' : '1'};
        ">
        <div style="display:flex;align-items:center;justify-content:space-between">
          <span style="font-size:11px;font-weight:${isToday?'700':'500'};color:${dayColor}">${day}</span>
          ${dotColor ? `<div style="width:4px;height:4px;border-radius:50%;background:${dotColor}"></div>` : ''}
        </div>
        ${labels}${more}${kimatsuLabel}
      </div>`;
  }

  html += `</div>
  <div style="display:flex;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;align-items:center;font-size:10px;color:var(--text3)">
    <div style="display:flex;align-items:center;gap:4px"><div style="width:8px;height:8px;border-radius:50%;background:var(--amber)"></div>未受講</div>
    <div style="display:flex;align-items:center;gap:4px"><div style="width:8px;height:8px;border-radius:50%;background:var(--red)"></div>遅刻</div>
    <div style="display:flex;align-items:center;gap:4px"><div style="width:8px;height:8px;border-radius:50%;background:var(--green)"></div>完了</div>
    <div style="display:flex;align-items:center;gap:4px"><span>📝</span>期末試験</div>
    <span style="margin-left:auto">タップで詳細</span>
  </div>`;

  el.innerHTML = html;
}

// ============================================================
// 日付タップ→詳細モーダル（期末試験対応）
// ============================================================
function showDayDeadlines(dateLabel, itemsJson, isKimatsu) {
  const items = JSON.parse(decodeURIComponent(itemsJson));
  const existing = document.getElementById('day-deadline-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'day-deadline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);
    display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom);`;

  const kimatsuRow = isKimatsu ? `
    <div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border);background:var(--purple-dim);border-radius:6px;padding:10px 12px;margin-bottom:4px">
      <span style="font-size:18px">📝</span>
      <div>
        <div style="font-size:13px;font-weight:700;color:var(--purple)">期末試験 締切</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">専門・順次開講科目 ・ 12:00まで</div>
      </div>
    </div>` : '';

  const rows = items.map(({ name, n, isDone, isLate, cat }) => {
    const color  = (CATEGORY_CONFIG[cat] || {}).color || '#64748b';
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
        <button onclick="document.getElementById('day-deadline-modal').remove()"
          style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
      </div>
      ${kimatsuRow}${rows}
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}
