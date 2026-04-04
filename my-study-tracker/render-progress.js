// ============================================================
// my-study-tracker - render-progress.js
// 進捗タブの描画
// ============================================================

function renderProgressPage() {
  // 学期セレクター
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
    listEl.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">この学期に登録された科目がありません</div><div class="empty-state-sub">「設定」タブで履修登録してください</div></div></div>`;
    return;
  }

  subjects.forEach(s => {
    const done = getCompletedLessons(s.code);
    const target      = getTodayTarget(s, sem);
    const recommended = getTodayRecommended(s, sem);
    const pct  = Math.round(done / s.lessons * 100);
    const late = Math.max(0, target - done);
    const color = getCategoryColor(s.category);
    const openLabel = s.open_type === '一斉' ? '一斉' : '順次';

    let statusText  = '✅ 出席認定 順調';
    let statusColor = 'var(--green)';
    if (late >= 1) {
      statusText  = `🔴 遅刻${late}コマ — 繰り越し優先で受講を`;
      statusColor = 'var(--red)';
    } else if (recommended > done) {
      statusText  = `🟡 今週あと${recommended - done}コマで出席認定`;
      statusColor = 'var(--amber)';
    }

    // コマボタン
    let btnHtml = '<div class="lesson-grid">';
    for (let i = 1; i <= s.lessons; i++) {
      const isDone      = i <= done;
      const isLate      = !isDone && isLessonLate(i, s, sem);
      const isThisWeek  = !isDone && !isLate && i <= recommended;
      const notYet      = !isDone && !isLate && !isThisWeek && !isLessonAvailable(i, s, sem);
      let btnStyle = '';
      if (isDone)      btnStyle = `background:${color};color:#000`;
      else if (isLate) btnStyle = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
      else if (isThisWeek) btnStyle = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
      else if (notYet) btnStyle = `opacity:0.3`;
      btnHtml += `<button class="lesson-btn${isDone ? ' done' : ''}" onclick="toggleLesson('${s.code}', ${i}, ${semId})" style="${btnStyle}">${i}</button>`;
    }
    btnHtml += '</div>';

    const legend = `
      <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3)">
        <span><span style="color:${color}">■</span> 完了</span>
        <span><span style="color:var(--red)">■</span> 遅刻</span>
        <span><span style="color:var(--amber)">■</span> 今週期限</span>
        <span style="opacity:0.4">■ 未開講</span>
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
          <div style="display:flex;align-items:center;gap:8px">
            <div class="ps-pct" style="color:${color}">${pct}%</div>
            <button onclick="showDeadlineModal('${s.code}', ${semId})" style="
              background:var(--bg3);border:1px solid var(--border);color:var(--text3);
              font-size:10px;padding:3px 8px;border-radius:99px;cursor:pointer;
              font-family:'Noto Sans JP',sans-serif;white-space:nowrap;
            ">締切一覧</button>
          </div>
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
