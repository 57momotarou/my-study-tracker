// ============================================================
// my-study-tracker - render-progress.js
// 進捗タブ（章単位管理：1コマ=4章）
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

  const semId    = state.currentSemesterId;
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(semId);
  const listEl   = document.getElementById('progress-subject-list');
  listEl.innerHTML = '';

  if (subjects.length === 0) {
    listEl.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">この学期に登録された科目がありません</div><div class="empty-state-sub">「設定」タブで履修登録してください</div></div></div>`;
    return;
  }

  // 全体サマリー
  const CPL      = CHAPTERS_PER_LESSON;
  const totalCh  = subjects.reduce((a,s)=>a+s.lessons*CPL,0);
  const doneCh   = subjects.reduce((a,s)=>a+getCompletedLessons(s.code),0);
  const pctAll   = totalCh>0?Math.round(doneCh/totalCh*100):0;
  const doneLen  = subjects.reduce((a,s)=>a+Math.floor(getCompletedLessons(s.code)/CPL),0);
  const totalLen = subjects.reduce((a,s)=>a+s.lessons,0);
  const lateCount= subjects.filter(s=>Math.floor(getCompletedLessons(s.code)/CPL)<getTodayTarget(s,sem)).length;

  listEl.innerHTML += `<div class="card">
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--amber)">${pctAll}%</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">全体進捗</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700">${doneLen}<span style="font-size:13px;color:var(--text3)">/${totalLen}</span></div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">完了コマ</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'}">${lateCount}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">遅刻科目</div>
      </div>
    </div>
    <div class="prog-wrap" style="height:8px"><div class="prog-bar" style="width:${pctAll}%;background:var(--amber)"></div></div>
  </div>`;

  subjects.forEach(s => {
    const totalChapters    = s.lessons * CPL;
    const doneChapters     = getCompletedLessons(s.code);
    const doneLessons      = Math.floor(doneChapters / CPL);
    const doneChapterInLes = doneChapters % CPL;
    const target           = getTodayTarget(s, sem);
    const recommended      = getTodayRecommended(s, sem);
    const pct              = Math.round(doneChapters / totalChapters * 100);
    const late             = Math.max(0, target - doneLessons);
    const color            = getCategoryColor(s.category);
    const openLabel        = s.open_type === '一斉' ? '一斉' : '順次';

    let statusText  = '✅ 出席認定 順調';
    let statusColor = 'var(--green)';
    if (doneLessons >= s.lessons) { statusText='🎓 受講完了'; statusColor=color; }
    else if (late >= 1)           { statusText=`🔴 遅刻${late}コマ — 繰り越し優先で受講を`; statusColor='var(--red)'; }
    else if (recommended > doneLessons) {
      const need = recommended * CPL - doneChapters;
      statusText=`🟡 今週あと${need}章（${recommended-doneLessons}コマ分）で出席認定`; statusColor='var(--amber)';
    }

    // 章グリッド：コマごとにdivで囲み均等サイズを保証
    let btnHtml = '<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:10px">';
    for (let lesson = 1; lesson <= s.lessons; lesson++) {
      const isLessonLate_ = isLessonLate(lesson, s, sem);
      const isThisWeek    = lesson <= recommended && lesson > doneLessons;
      const isNotYet      = !isLessonAvailable(lesson, s, sem);
      const lessonOp      = isNotYet ? 'opacity:0.2;' : '';

      btnHtml += `<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:1px;${lessonOp}${lesson>1?'margin-left:2px;':''}flex-shrink:0">`;
      for (let ch = 1; ch <= CPL; ch++) {
        const chNum         = (lesson-1)*CPL + ch;
        const isDone        = chNum <= doneChapters;
        const isLateChapter = !isDone && isLessonLate_;
        const isThisWeekCh  = !isDone && !isLateChapter && isThisWeek;

        let btnStyle = '';
        const noClick = isNotYet ? 'pointer-events:none;' : '';
        if (isDone)             btnStyle = 'background:' + color + ';color:#000';
        else if (isLateChapter) btnStyle = 'background:var(--red-dim);color:var(--red);border:1px solid var(--red)';
        else if (isThisWeekCh)  btnStyle = 'background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)';

        btnHtml += `<button class="lesson-btn${isDone?' done':''}" onclick="toggleChapter('${s.code}',${chNum},${semId})" style="width:28px;height:28px;${btnStyle}${noClick}" title="コマ${lesson} 第${ch}章">${lesson}-${ch}</button>`;
      }
      btnHtml += '</div>';
    }
    btnHtml += '</div>';

    const progressLabel = doneChapterInLes > 0
      ? `コマ${doneLessons+1}の第${doneChapterInLes}章まで完了`
      : doneLessons > 0 ? `コマ${doneLessons}まで完了` : '未受講';

    // 時間割の曜日表示
    const ttDay = getTimetableDay(s.code, semId);
    const dayTag = ttDay !== undefined
      ? `<span style="font-size:10px;background:var(--bg3);border:1px solid var(--border);padding:1px 6px;border-radius:99px;color:var(--text3);margin-left:4px">📅${DAY_NAMES[ttDay+1]}曜</span>`
      : '';

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
            <button onclick="showDeadlineModal('${s.code}',${semId})" style="background:var(--bg3);border:1px solid var(--border);color:var(--text3);font-size:10px;padding:3px 8px;border-radius:99px;cursor:pointer;font-family:'Noto Sans JP',sans-serif;white-space:nowrap">締切一覧</button>
          </div>
        </div>
        <div class="ps-meta">${progressLabel} ・ <span style="color:var(--text3)">${openLabel}開講</span>${late>0?` ・ <span style="color:var(--red)">遅刻${late}コマ</span>`:''}${dayTag}</div>
        <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>
        ${btnHtml}
        <div style="display:flex;gap:12px;margin-top:8px;font-size:10px;color:var(--text3)">
          <span><span style="color:${color}">■</span> 完了</span>
          <span><span style="color:var(--red)">■</span> 遅刻</span>
          <span><span style="color:var(--amber)">■</span> 今週期限</span>
          <span style="opacity:0.4">■ 未開講</span>
        </div>
      </div>`;
  });
}
