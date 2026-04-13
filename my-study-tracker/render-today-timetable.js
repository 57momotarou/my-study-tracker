// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック
// ============================================================

// ============================================================
// TODAY 時間割カード（メイン）
//
// 表示ルール：
//   【遅刻中】  late>0 の科目 → 遅刻コマ数が多い順
//   【今日やること】以下の科目を次コマ締切が近い順で一本化して表示
//     - 今日の曜日が割り当て＆未完了
//     - 今日より前の曜日が割り当て＆未完了（積み残し・週またぎ対応）
// ============================================================
function renderTodayTimetable(subjects, sem, semId) {
  const ttEl = document.getElementById('today-timetable');
  ttEl.innerHTML = '';

  if (!subjects.length) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div>
      <div class="empty-state-text">科目が登録されていません</div>
      <div class="empty-state-sub">「設定」タブで今学期の科目を選択してください</div></div>`;
    return;
  }

  const now        = new Date();
  const todayDow   = now.getDay();
  const todayTtIdx = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;

  const withState = subjects.map(s => {
    const doneCh  = getCompletedLessons(s.code);
    const doneLes = Math.floor(doneCh / CPL);
    const target  = getTodayTarget(s, sem);
    const rec     = getTodayRecommended(s, sem);
    const late    = Math.max(0, target - doneLes);
    const ttDay   = getTimetableDay(s.code, semId);

    // 今日の割り当てか
    const isToday = ttDay !== undefined && ttDay === todayTtIdx;

    // 今日より前の曜日割り当てか
    const ttDow    = ttDay !== undefined ? ttDay + 1 : -1;
    const effToday = todayDow === 0 ? 7 : todayDow;
    const effTt    = ttDow   === 0 ? 7 : ttDow;
    const isPast   = ttDay !== undefined && effTt < effToday;

    // 次コマの締切（ミリ秒）
    const nextLesson  = doneLes + 1;
    const isTodayDone = doneCh >= nextLesson * CPL || doneLes >= s.lessons;
    const nextDeadline = nextLesson <= s.lessons
      ? getLessonDeadline(nextLesson, s, sem).getTime()
      : new Date('2099-01-01').getTime();

    // 表示対象か
    const isLate    = late > 0;
    // 今日やること = 今日の曜日 or 過去の曜日 かつ 未完了
    const isWorkItem = !isLate && (isToday || isPast) && doneLes < s.lessons;

    return { s, doneCh, doneLes, target, rec, late, ttDay,
             isToday, isPast, isLate, isWorkItem, isTodayDone,
             nextLesson, nextDeadline };
  });

  const lateItems = withState.filter(i => i.isLate)
    .sort((a, b) => b.late - a.late);

  // 今日やること：締切の近い順（完了済みは末尾）
  const workItems = withState.filter(i => i.isWorkItem)
    .sort((a, b) => {
      if (a.isTodayDone !== b.isTodayDone) return a.isTodayDone ? 1 : -1;
      return a.nextDeadline - b.nextDeadline;
    });

  // 何もない
  if (lateItems.length === 0 && workItems.length === 0) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はありません</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // 全完了
  if (lateItems.length === 0 && workItems.length > 0 && workItems.every(i => i.isTodayDone)) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はすべて完了！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // ── 遅刻中（最優先） ──
  if (lateItems.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px;padding:6px 10px;background:var(--red-dim);border-radius:6px;border-left:3px solid var(--red)">🔴 遅刻中 — 今すぐ受講を</div>`;
    lateItems.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'late'));
  }

  // ── 今日やること（締切順・一本化） ──
  if (workItems.length > 0) {
    const hasAbove = lateItems.length > 0;
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin:${hasAbove ? '12px' : '0'} 0 8px">📋 今日やること（締切が近い順）</div>`;
    workItems.forEach(item => {
      // 前日以前の積み残しか今日の予定かをmodeで区別
      const mode = item.isPast ? 'overdue' : 'today';
      _renderTodayCard(ttEl, item, sem, semId, mode);
    });
  }
}
