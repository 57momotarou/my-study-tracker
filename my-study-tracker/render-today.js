// ============================================================
// my-study-tracker - render-today.js
// 今日タブの描画
// ============================================================

function renderToday() {
  const today = new Date();
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);
  const CPL = 4;

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

  // アラート（遅刻コマ警告）
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const target = getTodayTarget(s, sem);
    const doneLessons = Math.floor(getCompletedLessons(s.code) / CPL);
    const late = target - doneLessons;
    if (late >= 3) {
      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で取り組みましょう</div>`;
    } else if (late >= 1) {
      alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマが遅刻中 — 優先して受講してください</div>`;
    }
  });

  // 迫っている締切一覧
  renderUpcomingDeadlines(subjects, sem);

  // ── 今日の目標カード ──
  const ttEl = document.getElementById('today-timetable');
  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">科目が登録されていません</div><div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div></div>`;
  } else {
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
      ttEl.innerHTML = `<div style="text-align:center;padding:24px 16px;color:var(--green)">
        <div style="font-size:32px;margin-bottom:8px">🎉</div>
        <div style="font-size:15px;font-weight:700">今日の出席認定はすべてOK！</div>
        <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしておきましょう</div>
      </div>`;
    } else {
      ttEl.innerHTML = withPriority.map(({ s, doneChapters, doneLessons, late, needThisWeek, recommended }) => {
        const color = getCategoryColor(s.category);
        const totalChapters = s.lessons * CPL;
        const pct = Math.round(doneChapters / totalChapters * 100);

        // ── 今日の目標を計算 ──
        // 「今日時点でここまでやればペースOK」= recommendedコマ の最終章
        // 遅刻中の場合は今すぐ取り掛かるべきコマ・章を示す
        let goalLesson, goalChapter, goalLabel, goalColor, badgeClass, badgeText;

        if (late > 0) {
          // 遅刻：今すぐ次の章から
          const nextCh = doneChapters + 1;
          goalLesson  = Math.ceil(nextCh / CPL);
          goalChapter = ((nextCh - 1) % CPL) + 1;
          goalLabel   = '今すぐ取り掛かろう';
          goalColor   = 'var(--red)';
          badgeClass  = 'badge-danger';
          badgeText   = `🔴 ${late}コマ遅刻中`;
        } else {
          // 今週締切に向けて：recommendedコマの第4章まで
          goalLesson  = recommended;
          goalChapter = CPL;
          goalLabel   = '今週中にここまでで出席認定OK';
          goalColor   = 'var(--amber)';
          badgeClass  = 'badge-warn';
          badgeText   = `🟡 今週あと${needThisWeek}コマ`;
        }

        // 現在の進捗ラベル
        const doneChInLesson = doneChapters % CPL;
        const nowLabel = doneChInLesson > 0
          ? `コマ${doneLessons + 1} 第${doneChInLesson}章まで完了`
          : doneLessons > 0 ? `コマ${doneLessons} 完了` : '未受講';

        // 目標が既に達成済みかチェック
        const goalChTotal = (goalLesson - 1) * CPL + goalChapter;
        const alreadyDone = doneChapters >= goalChTotal;

        return `
          <div class="today-subject-card" style="border-left:3px solid ${color}">
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
              <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
                <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
                <div style="font-size:14px;font-weight:700;line-height:1.3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
              </div>
              <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
            </div>

            <!-- 今日の目標ボックス -->
            <div class="today-goal-box" style="border-color:${goalColor};background:${goalColor}18">
              <div style="font-size:10px;letter-spacing:1.5px;color:${goalColor};font-family:'Space Mono',monospace;font-weight:700;margin-bottom:6px">
                TODAY'S GOAL
              </div>
              ${alreadyDone ? `
                <div style="display:flex;align-items:center;gap:8px">
                  <span style="font-size:22px">✅</span>
                  <div>
                    <div style="font-size:15px;font-weight:700;color:var(--green)">今日の目標達成！</div>
                    <div style="font-size:11px;color:var(--text3);margin-top:2px">余裕があれば先取りしましょう</div>
                  </div>
                </div>
              ` : `
                <div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
                  <span style="font-size:13px;color:var(--text2)">コマ</span>
                  <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalLesson}</span>
                  <span style="font-size:13px;color:var(--text2)">の</span>
                  <span style="font-size:13px;color:var(--text2)">第</span>
                  <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalChapter}</span>
                  <span style="font-size:13px;color:var(--text2)">章まで</span>
                </div>
                <div style="font-size:11px;color:${goalColor};margin-top:4px;font-weight:600">${goalLabel}</div>
              `}
            </div>

            <!-- 現在の進捗 -->
            <div style="display:flex;align-items:center;justify-content:space-between;margin-top:8px;margin-bottom:4px">
              <span style="font-size:11px;color:var(--text3)">現在：${nowLabel}</span>
              <span style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}">${pct}%</span>
            </div>
            <div class="prog-wrap">
              <div class="prog-bar" style="width:${pct}%;background:${color}"></div>
            </div>
          </div>`;
      }).join('');
    }
  }

  // 今週のストリップ
  renderWeekStrip(subjects, sem);

  // 今期進捗
  const progEl = document.getElementById('today-progress');
  if (subjects.length === 0) {
    progEl.innerHTML = `<div style="color:var(--text3);font-size:13px;">科目を登録するとここに進捗が表示されます</div>`;
  } else {
    const totalLessons   = subjects.reduce((a, s) => a + s.lessons, 0);
    const totalChapters  = totalLessons * CPL;
    const doneChapters   = subjects.reduce((a, s) => a + getCompletedLessons(s.code), 0);
    const doneLessons    = subjects.reduce((a, s) => a + Math.floor(getCompletedLessons(s.code) / CPL), 0);
    const pct = totalChapters > 0 ? Math.round(doneChapters / totalChapters * 100) : 0;

    // 遅刻・要注意の科目数
    const lateCount = subjects.filter(s => {
      const t = getTodayTarget(s, sem);
      return Math.floor(getCompletedLessons(s.code) / CPL) < t;
    }).length;

    progEl.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:12px">
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--amber)">${pct}%</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">全体進捗</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--text)">${doneLessons}<span style="font-size:13px;color:var(--text3)">/${totalLessons}</span></div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">完了コマ</div>
        </div>
        <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
          <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:${lateCount > 0 ? 'var(--red)' : 'var(--green)'}">${lateCount}</div>
          <div style="font-size:10px;color:var(--text3);margin-top:2px">遅刻科目</div>
        </div>
      </div>
      <div class="prog-wrap" style="height:8px">
        <div class="prog-bar" style="width:${pct}%;background:var(--amber)"></div>
      </div>`;
  }
}

// ============================================================
// 今週のストリップ（今日タブ）
// ============================================================
function renderWeekStrip(subjects, sem) {
  const el = document.getElementById('week-strip');
  if (!el) return;

  const now = new Date();
  const todayDow = now.getDay();
  const DOW_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

  el.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() - todayDow + d);
    date.setHours(0, 0, 0, 0);
    const isToday = d === todayDow;

    // この日が締切のコマを収集
    const items = [];
    subjects.forEach(s => {
      const done = Math.floor(getCompletedLessons(s.code) / 4);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString()) {
          items.push({ s, n, isDone: n <= done, isLate: !( n <= done) && dl < now });
        }
      }
    });

    const cell = document.createElement('div');
    cell.className = 'week-cell' + (isToday ? ' is-today' : '');
    cell.style.cssText = 'cursor:default';

    const dots = items.slice(0, 3).map(({ s, isDone, isLate }) => {
      const c = isDone ? 'var(--green)' : isLate ? 'var(--red)' : 'var(--amber)';
      return `<div class="week-subject-dot" style="background:${c}"></div>`;
    }).join('');

    cell.innerHTML = `
      <div class="week-day-label">${DOW_LABELS[d]}</div>
      <div style="font-size:12px;font-weight:${isToday ? '700' : '400'};color:${isToday ? 'var(--amber)' : 'var(--text2)'}">${date.getDate()}</div>
      <div style="display:flex;gap:2px;min-height:8px;flex-wrap:wrap;justify-content:center">${dots}</div>
      ${items.length > 3 ? `<div style="font-size:9px;color:var(--text3)">+${items.length-3}</div>` : ''}`;
    el.appendChild(cell);
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
  const CPL = 4;

  const items = [];
  subjects.forEach(s => {
    const doneChapters = getCompletedLessons(s.code);
    const doneLessons  = Math.floor(doneChapters / CPL);
    for (let n = 1; n <= s.lessons; n++) {
      if (n <= doneLessons) continue;
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
