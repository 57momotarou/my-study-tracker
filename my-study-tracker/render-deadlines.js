// ============================================================
// my-study-tracker - render-deadlines.js
// 締切一覧モーダル（期末コマ対応）
// ============================================================

function showDeadlineModal(subjectCode, semId) {
  const s   = ALL_SUBJECTS.find(s => s.code === subjectCode);
  const sem = SEMESTERS.find(s => s.id === semId);
  if (!s || !sem) return;

  const doneCh  = getCompletedLessons(s.code);
  const done    = Math.floor(doneCh / 4);
  const color   = getCategoryColor(s.category);
  const now     = new Date();

  // 期末コマの有無チェック
  const key = getAttendanceKey(s, sem);
  const hasKimatsu = key === 'senmon_jyunji'
    && sem.attendance
    && sem.attendance.senmon_jyunji
    && sem.attendance.senmon_jyunji[16];

  const rows = [];

  // 通常コマ
  for (let n = 1; n <= s.lessons; n++) {
    rows.push(buildRow(n, `コマ${n}`, false, s, sem, done, color, now));
  }

  // 期末コマ
  if (hasKimatsu) {
    rows.push(buildKimatsuRow(sem.attendance.senmon_jyunji[16], now));
  }

  const existing = document.getElementById('deadline-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'deadline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);
    display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom);`;

  const doneChInLes = doneCh % 4;
  const sub = doneChInLes > 0
    ? `${done}/${s.lessons}コマ完了（コマ${done+1} 第${doneChInLes}章途中）`
    : `${done}/${s.lessons}コマ完了`;

  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:82vh;overflow-y:auto;padding:20px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px;margin-bottom:4px">DEADLINES</div>
          <div style="font-size:15px;font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${sub}</div>
        </div>
        <button onclick="document.getElementById('deadline-modal').remove()"
          style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">${rows.join('')}</div>
    </div>`;

  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
  document.body.appendChild(modal);
}

function buildRow(n, label, isKimatsu, s, sem, done, color, now) {
  const deadline  = getLessonDeadline(n, s, sem);
  const available = isLessonAvailable(n, s, sem);
  const isDone    = !isKimatsu && n <= done;
  const isLate    = !isDone && deadline < now;
  const isThisWk  = !isDone && !isLate && deadline <= new Date(now.getTime() + 7*86400000);
  const isNotYet  = !available;

  const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });

  let icon = '⬜', rowStyle = '', dlStyle = 'color:var(--text3)';
  if (isDone)      { icon = '✅'; dlStyle = `color:${color}`; }
  else if (isLate) { icon = '🔴'; dlStyle = 'color:var(--red)';   rowStyle = 'background:var(--red-dim)'; }
  else if (isThisWk){ icon = '🟡'; dlStyle = 'color:var(--amber)'; rowStyle = 'background:var(--amber-dim)'; }
  else if (isNotYet){ icon = '🔒'; dlStyle = 'color:var(--text3);opacity:0.4'; }

  return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;${rowStyle}">
      <span style="font-size:14px;width:20px;text-align:center">${icon}</span>
      <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--text3);width:36px">${label}</span>
      <span style="font-size:13px;${dlStyle};flex:1">〜 ${dateStr} 12:00</span>
      ${isDone    ? `<span style="font-size:10px;color:${color}">完了</span>` : ''}
      ${isLate    ? `<span style="font-size:10px;color:var(--red)">遅刻中</span>` : ''}
      ${isThisWk  ? `<span style="font-size:10px;color:var(--amber)">今週期限</span>` : ''}
      ${isNotYet && !isDone ? `<span style="font-size:10px;color:var(--text3)">未開講</span>` : ''}
    </div>`;
}

function buildKimatsuRow(entry, now) {
  const deadline  = new Date(typeof entry === 'string' ? entry : entry.end);
  const available = typeof entry === 'object' && entry.start ? new Date(entry.start) <= now : true;
  const isLate    = deadline < now;
  const isThisWk  = !isLate && deadline <= new Date(now.getTime() + 7*86400000);
  const isNotYet  = !available;

  const dateStr = deadline.toLocaleDateString('ja-JP', { month:'numeric', day:'numeric', weekday:'short' });

  let icon = '⬜', rowStyle = 'border-top:1px dashed var(--border);margin-top:4px', dlStyle = 'color:var(--text3)';
  if (isLate)   { icon = '🔴'; dlStyle = 'color:var(--red)';   rowStyle += ';background:var(--red-dim)'; }
  else if (isThisWk){ icon = '🟡'; dlStyle = 'color:var(--amber)'; rowStyle += ';background:var(--amber-dim)'; }
  else if (isNotYet){ icon = '🔒'; dlStyle = 'color:var(--text3);opacity:0.4'; }

  return `
    <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;${rowStyle}">
      <span style="font-size:14px;width:20px;text-align:center">${icon}</span>
      <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--amber);width:36px;font-weight:700">期末</span>
      <span style="font-size:13px;${dlStyle};flex:1">〜 ${dateStr} 12:00</span>
      ${isLate   ? `<span style="font-size:10px;color:var(--red)">期限切れ</span>` : ''}
      ${isThisWk ? `<span style="font-size:10px;color:var(--amber)">今週期限</span>` : ''}
      ${isNotYet ? `<span style="font-size:10px;color:var(--text3)">未開講</span>` : ''}
    </div>`;
}
