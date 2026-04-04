// ============================================================
// my-study-tracker - render-today.js
// 今日タブの描画
// ============================================================

function renderToday() {
  const today = new Date();
  const dow = today.getDay();
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // アラート（遅刻コマ警告）
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const target = getTodayTarget(s, sem);
    const done = getCompletedLessons(s.code);
    const late = target - done;
    if (late >= 3) {
      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で取り組みましょう</div>`;
    } else if (late >= 1) {
      alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマが遅刻中 — 優先して受講してください</div>`;
    }
  });

  // 迫っている締切一覧
  renderUpcomingDeadlines(subjects, sem);

  // 今日の時間割（今日やるべき科目とペース）
  const ttEl = document.getElementById('today-timetable');
  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">科目が登録されていません</div><div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div></div>`;
  } else {
    // 今日やるべき科目を優先度順に並べる
    // 遅刻中 → 今週締切あり → その他
    const CPL = 4; // chapters per lesson
    const withPriority = subjects.map(s => {
      const doneChapters = getCompletedLessons(s.code);
      const doneLessons  = Math.floor(doneChapters / CPL);
      const target       = getTodayTarget(s, sem);
      const recommended  = getTodayRecommended(s, sem);
      const late         = Math.max(0, target - doneLessons);
      const needThisWeek = Math.max(0, recommended - doneLessons);
      return { s, doneChapters, doneLessons, target, recommended, late, needThisWeek };
    }).filter(({ late, needThisWeek }) => late > 0 || needThisWeek > 0)
      .sort((a, b) => b.late - a.late || b.needThisWeek - a.needThisWeek);

    if (withPriority.length === 0) {
      ttEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--green);font-size:14px;font-weight:600">🎉 今週の出席認定はすべてOKです！</div>`;
    } else {
      ttEl.innerHTML = withPriority.map(({ s, doneChapters, doneLessons, late, needThisWeek, recommended }) => {
        const color = getCategoryColor(s.category);
        const totalChapters = s.lessons * CPL;
        const pct = Math.round(doneChapters / totalChapters * 100);
        const doneChInLesson = doneChapters % CPL;
        const currentLabel = doneChInLesson > 0
          ? `コマ${doneLessons + 1}第${doneChInLesson}章まで完了`
          : doneLessons > 0 ? `コマ${doneLessons}まで完了` : '未受講';
        let badgeClass, badgeText, paceText, paceColor;

        if (late > 0) {
          badgeClass = 'badge-danger';
          badgeText  = `🔴 遅刻${late}コマ`;
          const nextCh = doneChapters + 1;
          const nextLesson = Math.ceil(nextCh / CPL);
          const nextChInLesson = ((nextCh - 1) % CPL) + 1;
          paceText   = `コマ${nextLesson}第${nextChInLesson}章から受講してください`;
          paceColor  = 'var(--red)';
        } else {
          badgeClass = 'badge-warn';
          badgeText  = `🟡 今週あと${needThisWeek}コマ`;
          const goalChapters = recommended * CPL;
          const goalLesson = recommended;
          paceText   = `今週中にコマ${goalLesson}第${CPL}章まで完了で出席認定OK`;
          paceColor  = 'var(--amber)';
        }

        return `
          <div class="today-subject-item">
            <div class="today-subject-dot" style="background:${color}"></div>
            <div class="today-subject-info">
              <div class="today-subject-name">${s.name}</div>
              <div class="today-subject-meta">${done}/${s.lessons}コマ完了</div>
              <div style="font-size:11px;color:${paceColor};margin-top:3px;font-weight:500">📖 ${paceText}</div>
              <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>
            </div>
            <span class="today-subject-badge ${badgeClass}">${badgeText}</span>
          </div>`;
      }).join('');
    }
  }

  // 今期進捗
  const progEl = document.getElementById('today-progress');
  if (subjects.length === 0) {
    progEl.innerHTML = `<div style="color:var(--text3);font-size:13px;">科目を登録するとここに進捗が表示されます</div>`;
  } else {
    const total = subjects.reduce((a, s) => a + s.lessons, 0);
    const done = subjects.reduce((a, s) => a + getCompletedLessons(s.code), 0);
    const pct = total > 0 ? Math.round(done / total * 100) : 0;
    progEl.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:6px;">
        <span style="font-size:13px;color:var(--text2)">${done} / ${total} コマ完了</span>
        <span style="font-family:'Space Mono',monospace;font-size:20px;font-weight:700;color:var(--amber)">${pct}%</span>
      </div>
      <div class="prog-wrap" style="height:10px">
        <div class="prog-bar" style="width:${pct}%;background:var(--amber)"></div>
      </div>`;
  }
}

// ============================================================
// 迫っている締切一覧（今日タブ）
// ============================================================
function renderUpcomingDeadlines(subjects, sem) {
  const el = document.getElementById('today-upcoming');
  if (!el) return;
  if (subjects.length === 0) { el.innerHTML = ''; return; }

  const now = new Date();
  const twoWeeksLater = new Date(now.getTime() + 14 * 86400000);

  const items = [];
  subjects.forEach(s => {
    const done = getCompletedLessons(s.code);
    for (let n = 1; n <= s.lessons; n++) {
      if (n <= done) continue;
      const deadline = getLessonDeadline(n, s, sem);
      if (deadline > twoWeeksLater) break;
      const isLate = deadline < now;
      const daysLeft = Math.ceil((deadline - now) / 86400000);
      items.push({ s, n, deadline, isLate, daysLeft });
    }
  });

  if (items.length === 0) {
    el.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`;
    return;
  }

  items.sort((a, b) => a.deadline - b.deadline);

  el.innerHTML = items.map(({ s, n, deadline, isLate, daysLeft }) => {
    const color = getCategoryColor(s.category);
    const dateStr = deadline.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric', weekday: 'short' });
    let labelStyle, labelText, rowStyle = '';
    if (isLate) {
      labelStyle = 'color:var(--red)'; labelText = '遅刻中';
      rowStyle = 'border-left:3px solid var(--red);padding-left:10px';
    } else if (daysLeft <= 3) {
      labelStyle = 'color:var(--red)'; labelText = `あと${daysLeft}日`;
      rowStyle = 'border-left:3px solid var(--red);padding-left:10px';
    } else if (daysLeft <= 7) {
      labelStyle = 'color:var(--amber)'; labelText = `あと${daysLeft}日`;
      rowStyle = 'border-left:3px solid var(--amber);padding-left:10px';
    } else {
      labelStyle = 'color:var(--text3)'; labelText = `あと${daysLeft}日`;
      rowStyle = 'border-left:3px solid var(--border);padding-left:10px';
    }
    return `
      <div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);${rowStyle}">
        <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${n} ・ 〜${dateStr} 12:00</div>
        </div>
        <span style="font-size:11px;font-weight:700;${labelStyle};flex-shrink:0">${labelText}</span>
      </div>`;
  }).join('');
}
