// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック
// ============================================================

// ============================================================
// TODAY 時間割カード（メイン）
//
// 表示対象：
//   【遅刻中】  late>0 の科目（時間割割り当て問わず）
//   【積み残し】今日より前の曜日が割り当て＆未完了（週またぎ対応）
//   【今日の予定】今日の曜日に割り当て＆未完了
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

  const now      = new Date();
  const todayDow = now.getDay(); // 0=日,1=月,...,6=土
  const todayTtIdx = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;

  const withState = subjects.map(s => {
    const doneCh  = getCompletedLessons(s.code);
    const doneLes = Math.floor(doneCh / CPL);
    const target  = getTodayTarget(s, sem);
    const rec     = getTodayRecommended(s, sem);
    const late    = Math.max(0, target - doneLes);
    const ttDay   = getTimetableDay(s.code, semId); // 0=月〜5=土 or undefined

    // 今日の曜日に割り当てられているか
    const isToday = ttDay !== undefined && ttDay === todayTtIdx;

    // 今日より前の曜日が割り当てられているか（週内比較）
    const ttDow = ttDay !== undefined ? ttDay + 1 : -1;
    const effToday = todayDow === 0 ? 7 : todayDow;
    const effTt    = ttDow === 0 ? 7 : ttDow;
    const isPastThisWeek = ttDay !== undefined && effTt < effToday;

    // 「積み残し」= 今日の曜日より前に割り当て＆未完了（週またぎでも残る）
    const isOverdue = isPastThisWeek && doneLes < s.lessons;

    // 「遅刻中」= 出席認定期限を過ぎたコマが未完了（時間割割り当て問わず）
    const isLate = late > 0;

    // 今日の予定完了判定
    const nextLesson  = doneLes + 1;
    const isTodayDone = doneCh >= nextLesson * CPL || doneLes >= s.lessons;

    return { s, doneCh, doneLes, target, rec, late, ttDay,
             isToday, isOverdue, isLate, isTodayDone, nextLesson };
  });

  // 表示対象を3種に分類（重複しないよう優先順位で排他）
  // 優先: 遅刻中 > 積み残し > 今日の予定
  const lateItems    = withState.filter(i => i.isLate);
  const lateSet      = new Set(lateItems.map(i => i.s.code));
  const overdueItems = withState.filter(i => i.isOverdue && !i.isToday && !lateSet.has(i.s.code));
  const overdueSet   = new Set(overdueItems.map(i => i.s.code));
  const todayItems   = withState.filter(i => i.isToday && !lateSet.has(i.s.code) && !overdueSet.has(i.s.code));

  const hasContent = lateItems.length > 0 || overdueItems.length > 0 || todayItems.some(i => !i.isTodayDone);

  // 何もない
  if (!hasContent && todayItems.length === 0) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はありません</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // 今日の予定が全完了かつ遅刻・積み残しなし
  if (lateItems.length === 0 && overdueItems.length === 0 &&
      todayItems.length > 0 && todayItems.every(i => i.isTodayDone)) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はすべて完了！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // ── 遅刻中（最優先） ──
  if (lateItems.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px;padding:6px 10px;background:var(--red-dim);border-radius:6px;border-left:3px solid var(--red)">🔴 遅刻中 — 今すぐ受講を</div>`;
    lateItems
      .sort((a, b) => b.late - a.late)
      .forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'late'));
  }

  // ── 積み残し ──
  if (overdueItems.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;font-weight:700;color:var(--amber);margin:${lateItems.length>0?'12px':'0'} 0 8px;padding:6px 10px;background:var(--amber-dim);border-radius:6px;border-left:3px solid var(--amber)">📌 前日以前の未消化</div>`;
    overdueItems
      .sort((a, b) => a.rec - b.rec)
      .forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'overdue'));
  }

  // ── 今日の予定 ──
  if (todayItems.length > 0) {
    const hasAbove = lateItems.length > 0 || overdueItems.length > 0;
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin:${hasAbove?'12px':'0'} 0 8px">📋 今日の予定</div>`;
    todayItems
      .sort((a, b) => {
        if (a.isTodayDone !== b.isTodayDone) return a.isTodayDone ? 1 : -1;
        return 0;
      })
      .forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'today'));
  }
}
