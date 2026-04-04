// ============================================================
// my-study-tracker - render-deadlines.js
// 締切一覧モーダル（期末コマ対応）
// ============================================================

function showDeadlineModal(subjectCode, semId) {
  const s = ALL_SUBJECTS.find(s => s.code === subjectCode);
  const sem = SEMESTERS.find(s => s.id === semId);
  if (!s || !sem) return;

  const doneChapters = getCompletedLessons(s.code);
  const done  = Math.floor(doneChapters / 4);
  const color = getCategoryColor(s.category);
  const now   = new Date();

  // ── 通常コマ（1〜lessons）＋ 期末コマ（順次専門のみ index 16）
  const key = typeof getAttendanceKey === 'function' ? getAttendanceKey(s, sem) : null;
  const hasKimatsu = key === 'senmon_jyunji'
    && sem.attendance
    && sem.attendance.senmon_jyunji
    && sem.attendance.senmon_jyunji[16];

  // コマ一覧
  const rows = [];

  for (let n = 1; n <= s.lessons; n++) {
    rows.push(buildDeadlineRow(n, `コマ${n}`, s, sem, done, color, now));
  }

  // 期末コマ
  if (hasKimatsu) {
    const entry = sem.attendance.senmon_jyunji[16];
    const deadline = new Date(typeof entry === 'string' ? entry : entry.end);
    const available = typeof entry === 'object' && entry.start ? new Date(entry.start) <= now : true;
    const isDone  = false; // 期末は章管理外
    const isLate  = deadline < now;
    const isThisWeek = !isLate && deadline <= new Date(now.getTime() + 7 * 86400000);
    const isNotYet = !available;

    let statusIcon = '⬜', rowStyle = '', deadlineStyle = 'color:var(--text3)';
    if (isLate)     { statusIcon = '🔴'; deadlineStyle = 'color:var(--red)'; rowStyle = 'background:var(--red-dim)'; }
    else if (isThisWeek) { statusIcon = '🟡'; deadlineStyle = 'color:var(--amber)'; rowStyle = 'background:var(--amber-dim)'; }
    else if (isNotYet)   { statusIcon = '🔒'; deadlineStyle = 'color:var(--text3);opacity:0.4'; }

    const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });
    rows.push(`
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;${rowStyle};border-top:1px dashed var(--border);margin-top:4px">
        <span style="font-size:14px;width:20px;text-align:center">${statusIcon}</span>
        <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--amber);width:32px;font-weight:700">期末</span>
        <span style="font-size:13px;${deadlineStyle};flex:1">〜 ${dateStr} 12:00</span>
        ${isLate ? `<span style="font-size:10px;color:var(--red)">期限切れ</span>` : ''}
        ${isThisWeek ? `<span style="font-size:10px;color:var(--amber)">今週期限</span>` : ''}
        ${isNotYet ? `<span style="font-size:10px;color:var(--text3)">未開講</span>` : ''}
      </div>`);
  }

  const existing = document.getElementById('deadline-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'deadline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:500;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:flex-end;
    padding-bottom:env(safe-area-inset-bottom);
  `;

  const doneChInLes = doneChapters % 4;
  const progressSubText = doneChInLes > 0
    ? `${done}/${s.lessons}コマ完了（コマ${done+1} 第${doneChInLes}章途中）`
    : `${done}/${s.lessons}コマ完了`;

  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:82vh;overflow-y:auto;padding:20px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px;margin-bottom:4px">DEADLINES</div>
          <div style="font-size:15px;font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${progressSubText}</div>
        </div>
        <button onclick="document.getElementById('deadline-modal').remove()" style="
          background:var(--bg3);border:none;color:var(--text2);
          width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;
        ">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        ${rows.join('')}
      </div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function buildDeadlineRow(n, label, s, sem, done, color, now) {
  const deadline   = getLessonDeadline(n, s, sem);
  const available  = isLessonAvailable(n, s, sem);
  const isDone     = n <= done;
  const isLate     = !isDone && deadline < now;
  const isThisWeek = !isDone && !isLate && deadline <= new Date(now.getTime() + 7 * 86400000);
  const isNotYet   = !available;

  const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });

  let statusIcon = '⬜', rowStyle = '', deadlineStyle = 'color:var(--text3)';
  if (isDone)       { statusIcon = '✅'; deadlineStyle = `color:${color}`; }
  else if (isLate)  { statusIcon = '🔴'; deadlineStyle = 'color:var(--red)'; rowStyle = 'background:var(--red-dim)'; }
  else if (isThisWeek) { statusIcon = '🟡'; deadlineStyle = 'color:var(--amber)'; rowStyle = 'background:var(--amber-dim)'; }
  else if (isNotYet)   { statusIcon = '🔒'; deadlineStyle = 'color:var(--text3);opacity:0.4'; }

  return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;${rowStyle}">
      <span style="font-size:14px;width:20px;text-align:center">${statusIcon}</span>
      <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--text3);width:32px">${label}</span>
      <span style="font-size:13px;${deadlineStyle};flex:1">〜 ${dateStr} 12:00</span>
      ${isDone ? `<span style="font-size:10px;color:${color}">完了</span>` : ''}
      ${isLate ? `<span style="font-size:10px;color:var(--red)">遅刻中</span>` : ''}
      ${isThisWeek ? `<span style="font-size:10px;color:var(--amber)">今週期限</span>` : ''}
      ${isNotYet && !isDone ? `<span style="font-size:10px;color:var(--text3)">未開講</span>` : ''}
    </div>`;
}
