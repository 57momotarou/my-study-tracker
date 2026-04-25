// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック（締切ベース）
// ============================================================
// 表示ルール：
//   1. 期限切れ（late > 0）           → 遅刻中 締切近い順・1科目 + あとN科目バナー
//   2. 7日以内に締切（daysToNext <= 7）→ 全科目表示
//   3. 8日以上先（daysToNext > 7）    → 先取り推奨 最大2科目
//   4. 全完了                          → 🎉
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

  const now = new Date();

  // 各科目の状態を計算
  const withState = subjects.map(s => {
    const doneCh     = getCompletedLessons(s.code);
    const doneLes    = Math.floor(doneCh / CPL);
    const target     = getTodayTarget(s, sem);
    const rec        = getTodayRecommended(s, sem);
    const late       = Math.max(0, target - doneLes);
    const nextLesson = doneLes + 1;
    const allDone    = doneLes >= s.lessons;

    const nextDeadline = !allDone && nextLesson <= s.lessons
      ? getLessonDeadline(nextLesson, s, sem).getTime()
      : new Date('2099-01-01').getTime();

    const daysToNext = Math.ceil((nextDeadline - now.getTime()) / 86400000);

    return { s, doneCh, doneLes, rec, late, allDone, nextLesson, nextDeadline, daysToNext };
  });

  // 全完了チェック
  if (withState.every(i => i.allDone)) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">すべての科目が完了！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">お疲れ様でした</div></div>`;
    return;
  }

  // グループ1：期限切れ（late > 0）
  const lateList = withState
    .filter(i => !i.allDone && i.late > 0)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  if (lateList.length > 0) {
    const total = lateList.length;
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">🔴 遅刻中（締切が近い順）全${total}科目</div>`;
    _renderTodayCard(ttEl, lateList[0], sem, semId, 'overdue');
    if (total > 1) {
      ttEl.innerHTML += `<div style="font-size:12px;color:var(--red);font-weight:700;padding:10px 12px;background:var(--red-dim);border:1px solid var(--red);border-radius:8px;text-align:center">🔴 あと ${total - 1} 科目も遅刻中です</div>`;
    }
    return;
  }

  // グループ2：7日以内に締切（daysToNext <= 7）
  const urgentList = withState
    .filter(i => !i.allDone && i.daysToNext <= 7)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  if (urgentList.length > 0) {
    urgentList.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'today'));
    return;
  }

  // グループ3：先取り推奨（daysToNext > 7）
  const advanceList = withState
    .filter(i => !i.allDone)
    .sort((a, b) => a.nextDeadline - b.nextDeadline)
    .slice(0, 2);

  if (advanceList.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin-bottom:8px">✨ 先取り推奨（締切まで余裕あり）</div>`;
    advanceList.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'tomorrow'));
    return;
  }

  // フォールバック
  ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
    <div style="font-size:32px;margin-bottom:8px">🎉</div>
    <div style="font-size:15px;font-weight:700">今日の予定はすべて完了！</div>
    <div style="font-size:12px;color:var(--text3);margin-top:4px">お疲れ様でした</div></div>`;
}
