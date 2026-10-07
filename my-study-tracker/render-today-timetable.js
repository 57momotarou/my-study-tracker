// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：表示対象の判定ロジック（締切ベース）
// ============================================================
// 月カレンダーと同じ朝6時の計画順。未配置は最後に締切順で表示する。
function sortAdvanceRecommendations(items, plan) {
  const nextByCode=new Map();
  for(const session of plan.sessions) {
    if(!nextByCode.has(session.code)||session.start<nextByCode.get(session.code).start)nextByCode.set(session.code,session);
  }
  return items.filter(i=>!i.allDone).map(i=>{
    const nextSession=nextByCode.get(i.s.code)||null;
    return {...i,nextSession,...(nextSession ? {nextLesson:nextSession.kind==='exam' ? null : nextSession.lesson, nextDeadline:nextSession.deadline ?? i.nextDeadline} : {})};
  })
    .sort((a,b)=>(a.nextSession?.start??Infinity)-(b.nextSession?.start??Infinity)||a.nextDeadline-b.nextDeadline||a.s.code.localeCompare(b.s.code));
}
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
    const p          = getCourseProgress(semId, s);
    const doneLes    = p.viewed;
    const target     = getTodayTarget(s, sem);
    const rec        = getTodayRecommended(s, sem);
    const late       = getOverdueLessonCount(semId, s, sem);
    const nextLesson = p.next;
    const allDone    = p.complete;

    const nextDeadline = nextLesson !== null
      ? getLessonDeadline(nextLesson, s, sem).getTime()
      : (getSubjectExam(s, sem) ? parseDateValue(getSubjectExam(s, sem).date).getTime() : new Date(2099, 0, 1).getTime());

    const daysToNext = calendarDayDiff(nextDeadline, now);

    return { s, doneCh, doneLes, rec, late, allDone, nextLesson, nextDeadline, daysToNext };
  });

  // 全完了チェック
  if (withState.every(i => i.allDone)) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">全科目のコマ・期末が完了！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">正式な成績は「進捗」で登録できます</div></div>`;
    return;
  }

  const ordered=sortAdvanceRecommendations(withState,getScheduledStudyPlan(sem,now));
  ttEl.innerHTML=ordered.map(item=>buildTodayCard(item,sem,semId,item.late?'overdue':item.daysToNext<=7?'today':'tomorrow')).join('');
  return;


}
