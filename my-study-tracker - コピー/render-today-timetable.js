// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック
// ============================================================
// 表示ルール（1科目ずつ順番に）：
//   1. 積み残し（期限切れコマあり or 割り当て曜日を過ぎた＆今日割り当て以外）→ 1科目 + あと〇科目
//      ※今日割り当て科目でも期限切れコマがあれば積み残し表示
//   2. 積み残しがすべて完了 → 今日の時間割科目（late===0のもの）を1科目表示
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
    const late       = Math.max(0, target - doneLes); // 期限切れコマ数
    const ttDay      = getTimetableDay(s.code, semId);
    const nextLesson = doneLes + 1;
    const allDone    = doneLes >= s.lessons;

    const isToday    = ttDay !== undefined && ttDay === todayTtIdx;
    const isTomorrow = ttDay !== undefined && ttDay === tomorrowTtIdx;

    // 先週の割り当て日（直近の割り当て日）が過ぎているか（積み残し判定）
    // ttDay: 0=月,1=火,...,5=土 → getDay(): 月=1,火=2,...,土=6
    const ttDow = ttDay !== undefined ? ttDay + 1 : -1;
    let isPast = false;
    if (ttDay !== undefined) {
      const today0 = new Date(now); today0.setHours(0, 0, 0, 0);
      // 今週の割り当て曜日の日付
      const assignedThisWeek = new Date(today0);
      assignedThisWeek.setDate(today0.getDate() + (ttDow - todayDow));
      // 直近の割り当て日：今週の割り当て日が今日以前なら今週分、今日より後なら先週分
      let lastAssigned;
      if (assignedThisWeek <= today0) {
        lastAssigned = assignedThisWeek; // 今週の割り当て日（今日 or 今日より前）
      } else {
        lastAssigned = new Date(assignedThisWeek);
        lastAssigned.setDate(assignedThisWeek.getDate() - 7); // 先週の割り当て日
      }
      // 直近の割り当て日が今日より前なら積み残し（今日の分は今日の予定）
      isPast = lastAssigned < today0;
    }

    // 積み残し：期限切れコマがある、または直近の割り当て日が今日より前で未完了
    const isOverdue = !allDone && (late > 0 || isPast);

    // 何週間分の積み残しか（表示用）
    let overdueWeeks = 0;
    if (isPast && ttDay !== undefined) {
      const today0b = new Date(now); today0b.setHours(0,0,0,0);
      const assignedThisWeekB = new Date(today0b);
      assignedThisWeekB.setDate(today0b.getDate() + (ttDow - todayDow));
      let check = assignedThisWeekB <= today0b ? assignedThisWeekB : new Date(assignedThisWeekB.getTime() - 7*86400000);
      while (check < today0b && overdueWeeks < 8) { overdueWeeks++; check = new Date(check.getTime() - 7*86400000); }
    }

    // 今日のコマを終えているか
    const isTodayDone = doneCh >= nextLesson * CPL || allDone;

    // 次コマ締切（ミリ秒）
    const nextDeadline = !allDone && nextLesson <= s.lessons
      ? getLessonDeadline(nextLesson, s, sem).getTime()
      : new Date('2099-01-01').getTime();

    return { s, doneCh, doneLes, rec, late, ttDay,
             isToday, isTomorrow, isPast, allDone, isTodayDone, isOverdue,
             nextLesson, nextDeadline, overdueWeeks };
  });

  // ── グループ分け ──

  // 1. 積み残し：割り当て曜日を過ぎた or 期限切れ
  const overdueList = withState
    .filter(i => i.isOverdue)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 2. 今日の予定：今日の割り当てで積み残しなし（late===0）かつ今日コマ未完
  const todayList = withState
    .filter(i => i.isToday && !i.allDone && !i.isTodayDone && i.late === 0)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 今日の完了済み（積み残しなし）
  const todayDoneList = withState
    .filter(i => i.isToday && i.late === 0 && (i.allDone || i.isTodayDone));

  // 3. 明日の予定
  const tomorrowList = withState
    .filter(i => i.isTomorrow && !i.allDone && !i.isOverdue)
    .sort((a, b) => a.nextDeadline - b.nextDeadline);

  // 積み残しあり → 1科目表示 + あと〇科目
  if (overdueList.length > 0) {
    const total = overdueList.length;
    const lateOnly = overdueList.filter(i => i.late > 0).length;
    const pastOnly = total - lateOnly;
    let subLabel = '';
    if (lateOnly > 0 && pastOnly > 0) subLabel = `期限切れ${lateOnly}・時間割遅れ${pastOnly}`;
    else if (lateOnly > 0) subLabel = `期限切れ${lateOnly}科目`;
    else subLabel = `時間割遅れ${pastOnly}科目`;
    ttEl.innerHTML += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:11px;color:var(--text3)">⚠️ 積み残し（締切近い順）全${total}科目</span>
      <span style="font-size:10px;color:var(--red)">${subLabel}</span>
    </div>`;
    _renderTodayCard(ttEl, overdueList[0], sem, semId, 'overdue');
    if (total > 1) {
      ttEl.innerHTML += `<div style="font-size:12px;color:var(--amber);font-weight:700;padding:10px 12px;background:var(--amber-dim);border:1px solid var(--amber);border-radius:8px;text-align:center">📌 あと ${total - 1} 科目の積み残しがあります</div>`;
    }
    return;
  }

  // 積み残しなし → 今日の予定（全科目表示）
  if (todayList.length > 0) {
    const totalH = todayList.reduce((a,i) => a + (i.s.deadline_type==='専門' ? 1.5 : 1), 0);
    ttEl.innerHTML += `<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <span style="font-size:11px;color:var(--text3)">📋 今日の予定（${todayList.length}科目）</span>
      <span style="font-size:11px;color:var(--amber);font-weight:700">⏱ 約${totalH}h</span>
    </div>`;
    todayList.forEach(item => _renderTodayCard(ttEl, item, sem, semId, 'today'));
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
