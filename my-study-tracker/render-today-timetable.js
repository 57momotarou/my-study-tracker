// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック
// ============================================================
// 表示ルール（1科目ずつ順番に）：
//   1. 積み残し（今日時点でlate>0の科目）を締切が近い順 → 1科目表示 + あと〇科目
//   2. 積み残しがすべて完了 → 今日の時間割科目を1科目表示
//   3. 今日も全部完了 → 明日の時間割科目を1科目表示
//   4. 全完了 → 🎉
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
  const todayDow   = now.getDay(); // 0=日,1=月,...,6=土
  const todayTtIdx = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;
  const tomorrowDow   = (todayDow + 1) % 7;
  const tomorrowTtIdx = tomorrowDow >= 1 && tomorrowDow <= 6 ? tomorrowDow - 1 : -1;

  // 各科目の状態を計算
  const withState = subjects.map(s => {
    const doneCh     = getCompletedLessons(s.code);
    const doneLes    = Math.floor(doneCh / CPL);
    const target     = getTodayTarget(s, sem);
    const rec        = getTodayRecommended(s, sem);
    const late       = Math.max(0, target - doneLes);
    const ttDay      = getTimetableDay(s.code, semId);
    const nextLesson = doneLes + 1;
    const allDone    = doneLes >= s.lessons;

    const isToday    = ttDay !== undefined && ttDay === todayTtIdx;
    const isTomorrow = ttDay !== undefined && ttDay === tomorrowTtIdx;

    // 今日のコマを終えているか
    const isTodayDone = doneCh >= nextLesson * CPL || allDone;

    // 次コマ締切（ミリ秒）
    const nextDeadline = !allDone && nextLesson <= s.lessons
      ? getLessonDeadline(nextLesson, s, sem).getTime()
      : new Date('2099-01-01').getTime();

    return { s, doneCh, doneLes, rec, late, ttDay,
             isToday, isTomorrow, allDone, isTodayDone,
             nextLesson, nextDeadline };
  });

  // ── グループ分け ──

  // 1. 積み残し：今日時点でlate>0の科目（曜日問わず）
  const overdueList = withState
    .filter(i => !i.allDone && i.late > 0)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 2. 今日の予定：今日の割り当てで未完了かつ積み残しなし
  const todayList = withState
    .filter(i => i.isToday && !i.allDone && !i.isTodayDone && i.late === 0)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 今日の完了済み
  const todayDoneList = withState
    .filter(i => i.isToday && (i.allDone || i.isTodayDone));

  // 3. 明日の予定
  const tomorrowList = withState
    .filter(i => i.isTomorrow && !i.allDone)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 積み残しあり → 1科目表示 + あと〇科目
  if (overdueList.length > 0) {
    const total = overdueList.length;
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">⚠️ 積み残しあり（締切が近い順）全${total}科目</div>`;
    _renderTodayCard(ttEl, overdueList[0], sem, semId, 'overdue');
    if (total > 1) {
      ttEl.innerHTML += `<div style="font-size:12px;color:var(--amber);font-weight:700;padding:10px 12px;background:var(--amber-dim);border:1px solid var(--amber);border-radius:8px;text-align:center">📌 あと ${total - 1} 科目の積み残しがあります</div>`;
    }
    return;
  }

  // 積み残しなし → 今日の予定
  if (todayList.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">📋 今日の予定</div>`;
    _renderTodayCard(ttEl, todayList[0], sem, semId, 'today');
    if (todayList.length > 1) {
      ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);padding:8px 12px;background:var(--bg3);border-radius:8px;text-align:center">あと ${todayList.length - 1} 科目</div>`;
    }
    todayDoneList.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'today'));
    return;
  }

  // 今日も完了 → 明日の予定を先取り
  if (tomorrowList.length > 0) {
    const dayNames = ['日','月','火','水','木','金','土'];
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">✅ 今日の予定完了！ 明日（${dayNames[tomorrowDow]}）の予定を先取り</div>`;
    _renderTodayCard(ttEl, tomorrowList[0], sem, semId, 'tomorrow');
    if (tomorrowList.length > 1) {
      ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);padding:8px 12px;background:var(--bg3);border-radius:8px;text-align:center">明日はあと ${tomorrowList.length - 1} 科目</div>`;
    }
    todayDoneList.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'today'));
    return;
  }

  // 全完了
  ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
    <div style="font-size:32px;margin-bottom:8px">🎉</div>
    <div style="font-size:15px;font-weight:700">今日の予定はすべて完了！</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">お疲れ様でした</div></div>`;
}
