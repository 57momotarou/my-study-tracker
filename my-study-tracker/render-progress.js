// ============================================================
// my-study-tracker - render-progress.js
// 進捗タブの描画（章単位管理：1コマ=4章）
// ============================================================

const CHAPTERS_PER_LESSON = 4;

function renderProgressPage() {
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
    const totalChapters = s.lessons * CHAPTERS_PER_LESSON;
    const doneChapters = getCompletedLessons(s.code); // 章数で保存
    const doneLessons = Math.floor(doneChapters / CHAPTERS_PER_LESSON);
    const doneChapterInLesson = doneChapters % CHAPTERS_PER_LESSON; // コマ内の完了章

    const target      = getTodayTarget(s, sem);       // コマ単位
    const recommended = getTodayRecommended(s, sem);  // コマ単位
    const pct  = Math.round(doneChapters / totalChapters * 100);
    const late = Math.max(0, target - doneLessons);
    const color = getCategoryColor(s.category);
    const openLabel = s.open_type === '一斉' ? '一斉' : '順次';

    let statusText  = '✅ 出席認定 順調';
    let statusColor = 'var(--green)';
    if (late >= 1) {
      statusText  = `🔴 遅刻${late}コマ — 繰り越し優先で受講を`;
      statusColor = 'var(--red)';
    } else if (recommended > doneLessons) {
      const needChapters = recommended * CHAPTERS_PER_LESSON - doneChapters;
      statusText  = `🟡 今週あと${needChapters}章（${recommended - doneLessons}コマ分）で出席認定`;
      statusColor = 'var(--amber)';
    }

    // コマ×章のグリッド
    let btnHtml = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-top:10px">';
    for (let lesson = 1; lesson <= s.lessons; lesson++) {
      const isLessonLate_ = isLessonLate(lesson, s, sem);
      const isThisWeek = lesson <= recommended && lesson > doneLessons;
      const isNotYet = !isLessonAvailable(lesson, s, sem);

      for (let ch = 1; ch <= CHAPTERS_PER_LESSON; ch++) {
        const chNum = (lesson - 1) * CHAPTERS_PER_LESSON + ch; // 通し章番号
        const isDone = chNum <= doneChapters;
        const isLateChapter = !isDone && isLessonLate_;
        const isThisWeekChapter = !isDone && !isLateChapter && isThisWeek;
        const notYet = !isDone && !isLateChapter && !isThisWeekChapter && isNotYet;

        let btnStyle = '';
        if (isDone)            btnStyle = `background:${color};color:#000`;
        else if (isLateChapter)     btnStyle = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
        else if (isThisWeekChapter) btnStyle = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
        else if (notYet)       btnStyle = `opacity:0.3`;

        // コマの区切りに左ボーダー
        const borderLeft = ch === 1 && lesson > 1 ? 'margin-left:2px;' : '';

        btnHtml += `<button
          class="lesson-btn${isDone ? ' done' : ''}"
          onclick="toggleChapter('${s.code}', ${chNum}, ${semId})"
          style="${btnStyle}${borderLeft}"
          title="コマ${lesson} 第${ch}章"
        >${lesson}-${ch}</button>`;
      }
    }
    btnHtml += '</div>';

    // 進捗表示（コマ.章）
    const progressLabel = doneChapterInLesson > 0
      ? `コマ${doneLessons + 1}の第${doneChapterInLesson}章まで完了`
      : doneLessons > 0
        ? `コマ${doneLessons}まで完了`
        : '未受講';

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
        <div class="ps-meta">${progressLabel} ・ <span style="color:var(--text3)">${openLabel}開講</span>${late > 0 ? ` ・ <span style="color:var(--red)">遅刻${late}コマ</span>` : ''}</div>
        <div class="prog-wrap">
          <div class="prog-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        ${btnHtml}
        ${legend}
      </div>`;
  });
}
