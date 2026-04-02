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

  // 今日の時間割
  const ttEl = document.getElementById('today-timetable');
  if (subjects.length === 0) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">科目が登録されていません</div><div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div></div>`;
  } else if (dow === 0 || dow === 6) {
    ttEl.innerHTML = `<div style="text-align:center;padding:20px;color:var(--text3)">😴 今日は休息日</div>`;
  } else {
    const renderSection = (label, subs) => {
      if (subs.length === 0) return '';
      const rows = subs.map(s => {
        const done = getCompletedLessons(s.code);
        const target = getTodayTarget(s, sem);
        const recommended = getTodayRecommended(s, sem);
        const pct = Math.round(done / s.lessons * 100);
        const late = Math.max(0, target - done);
        const needThisWeek = Math.max(0, recommended - done);
        let badgeClass = 'badge-ok', badgeText = '✅ OK';
        if (late >= 1) { badgeClass = 'badge-danger'; badgeText = `🔴 遅刻${late}コマ`; }
        else if (needThisWeek >= 1) { badgeClass = 'badge-warn'; badgeText = `🟡 今週あと${needThisWeek}コマ`; }
        return `
          <div class="today-subject-item">
            <div class="today-subject-dot" style="background:${getCategoryColor(s.category)}"></div>
            <div class="today-subject-info">
              <div class="today-subject-name">${s.name}</div>
              <div class="today-subject-meta">${s.credits}単位 ・ ${done}/${s.lessons}コマ完了${late > 0 ? ` ・ <span style="color:var(--red)">遅刻${late}コマ</span>` : ''}</div>
              <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${getCategoryColor(s.category)}"></div></div>
            </div>
            <span class="today-subject-badge ${badgeClass}">${badgeText}</span>
          </div>`;
      }).join('');
      return `<div class="timetable-section"><div class="timetable-label">${label}</div>${rows}</div>`;
    };

    const lunchSubs = dow === 4
      ? subjects.filter(s => s.deadline_type === '専門').slice(0, 1)
      : dow === 2
        ? subjects.filter(s => s.deadline_type !== '専門').slice(0, 1)
        : subjects.slice(0, 1);

    const eveningSubs = dow === 4
      ? subjects.filter(s => s.deadline_type === '専門')
      : dow === 2
        ? subjects.filter(s => s.deadline_type !== '専門')
        : subjects;

    ttEl.innerHTML =
      renderSection('🌞 昼休み（12:00〜13:00）', lunchSubs) +
      renderSection('🌙 夜（18:30〜）', eveningSubs);
  }

  // 週間ストリップ
  const weekEl = document.getElementById('week-strip');
  weekEl.innerHTML = '';
  for (let d = 0; d < 7; d++) {
    const isToday = d === dow;
    const isRest = d === 0 || d === 6;
    let dotHtml = '';
    if (!isRest) {
      const daySubjects = d === 4
        ? subjects.filter(s => s.deadline_type === '専門').slice(0, 2)
        : subjects.filter(s => s.deadline_type !== '専門').slice(0, 2);
      dotHtml = daySubjects.map(s =>
        `<div class="week-subject-dot" style="background:${getCategoryColor(s.category)}"></div>`
      ).join('');
    }
    weekEl.innerHTML += `
      <div class="week-cell ${isToday ? 'is-today' : ''} ${isRest ? 'is-rest' : ''}">
        <div class="week-day-label">${DOW_LABELS[d]}</div>
        ${dotHtml || '<div style="height:6px"></div>'}
      </div>`;
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
