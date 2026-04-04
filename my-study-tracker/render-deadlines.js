// ============================================================
// my-study-tracker - render-deadlines.js
// 締切一覧モーダル
// ============================================================

function showDeadlineModal(subjectCode, semId) {
  const s = ALL_SUBJECTS.find(s => s.code === subjectCode);
  const sem = SEMESTERS.find(s => s.id === semId);
  if (!s || !sem) return;

  const done = getCompletedLessons(s.code);
  const color = getCategoryColor(s.category);
  const now = new Date();

  // コマ一覧を生成
  let rows = '';
  for (let n = 1; n <= s.lessons; n++) {
    const deadline = getLessonDeadline(n, s, sem);
    const available = isLessonAvailable(n, s, sem);
    const isDone = n <= done;
    const isLate = !isDone && deadline < now;
    const isThisWeek = !isDone && !isLate && deadline <= new Date(now.getTime() + 7 * 86400000);
    const isNotYet = !available;

    const dateStr = deadline.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });

    let statusIcon = '⬜';
    let rowStyle = '';
    let deadlineStyle = 'color:var(--text3)';
    if (isDone)          { statusIcon = '✅'; deadlineStyle = `color:${color}`; }
    else if (isLate)     { statusIcon = '🔴'; deadlineStyle = 'color:var(--red)'; rowStyle = 'background:var(--red-dim)'; }
    else if (isThisWeek) { statusIcon = '🟡'; deadlineStyle = 'color:var(--amber)'; rowStyle = 'background:var(--amber-dim)'; }
    else if (isNotYet)   { statusIcon = '🔒'; deadlineStyle = 'color:var(--text3);opacity:0.4'; }

    rows += `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:6px;${rowStyle}">
        <span style="font-size:14px;width:20px;text-align:center">${statusIcon}</span>
        <span style="font-family:'Space Mono',monospace;font-size:12px;color:var(--text3);width:32px">コマ${n}</span>
        <span style="font-size:13px;${deadlineStyle};flex:1">〜 ${dateStr} 12:00</span>
        ${isDone ? `<span style="font-size:10px;color:${color}">完了</span>` : ''}
        ${isLate ? `<span style="font-size:10px;color:var(--red)">遅刻中</span>` : ''}
        ${isThisWeek ? `<span style="font-size:10px;color:var(--amber)">今週期限</span>` : ''}
      </div>`;
  }

  // モーダルHTML
  const modal = document.createElement('div');
  modal.id = 'deadline-modal';
  modal.style.cssText = `
    position:fixed;inset:0;z-index:500;
    background:rgba(0,0,0,0.7);
    display:flex;align-items:flex-end;
    padding-bottom:env(safe-area-inset-bottom);
  `;
  modal.innerHTML = `
    <div style="
      background:var(--bg2);border-radius:20px 20px 0 0;
      width:100%;max-height:80vh;overflow-y:auto;
      padding:20px 16px;
    ">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:16px">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px;margin-bottom:4px">DEADLINES</div>
          <div style="font-size:15px;font-weight:700">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${done}/${s.lessons}コマ完了</div>
        </div>
        <button onclick="document.getElementById('deadline-modal').remove()" style="
          background:var(--bg3);border:none;color:var(--text2);
          width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;
        ">×</button>
      </div>
      <div style="display:flex;flex-direction:column;gap:2px">
        ${rows}
      </div>
    </div>`;

  // 背景タップで閉じる
  modal.addEventListener('click', e => {
    if (e.target === modal) modal.remove();
  });

  document.body.appendChild(modal);
}
