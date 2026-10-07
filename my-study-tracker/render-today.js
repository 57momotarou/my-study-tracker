// ============================================================
// my-study-tracker - render-today.js
// ============================================================
const CPL = 4;

function renderToday() {
  const today    = new Date();
  const sem      = getCurrentSemester();
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',year:'numeric',month:'long',day:'numeric',weekday:'long'});

  // 遅刻アラート
  const alertsEl = document.getElementById('today-alerts');
  const alertRows = [];
  subjects.forEach(s => {
    const done = Math.floor(getCompletedLessons(s.code)/CPL);
    const late = getOverdueLessonCount(semId, s, sem);
    if (late>=3)      alertRows.push(`<div class="alert alert-danger">⚠️ <b>${s.name}</b> 学習の遅れ${late}コマ！繰り越し優先で</div>`);
    else if (late>=1) alertRows.push(`<div class="alert alert-warn">📌 <b>${s.name}</b> 学習${late}コマ遅れ — 優先受講を</div>`);
  });
  alertsEl.innerHTML = alertRows.join('');

  // TODAY 時間割カード
  renderTodayTimetable(subjects, sem, semId);

  // 締切
  renderUpcoming(subjects, sem);
}

// ============================================================
// 締切
// ============================================================
function renderUpcoming(subjects, sem) {
  const el=document.getElementById('today-upcoming');
  if (!el) return;
  if (!subjects.length) {
    el.innerHTML='<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">科目を登録すると締切が表示されます</div>';
    return;
  }
  const now=new Date();
  const items=[];
  subjects.forEach(s=>{
    const done=Math.floor(getCompletedLessons(s.code)/CPL);
    for (let n=1;n<=s.lessons;n++) {
      if (isLessonRecorded(sem.id, s.code, n)) continue;
      const dl=getLessonDeadline(n,s,sem);
      const days=calendarDayDiff(dl,now);
      if (days>14) break;
      items.push({s,n,dl,isLate:dl<now,days});
    }
  });
  let html='';
  if (!items.length&&!html) { el.innerHTML=`<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`; return; }
  items.sort((a,b)=>a.dl-b.dl);
  html+=items.map(({s,n,dl,isLate,days})=>{
    const color=getCategoryColor(s.category);
    const dateStr=dl.toLocaleDateString('ja-JP',{timeZone:'Asia/Tokyo',month:'numeric',day:'numeric',weekday:'short'});
    let ls,lt,rs='';
    if(isLate)       {ls='color:var(--red)';  lt='遅刻中';        rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=3) {ls='color:var(--red)';  lt=`あと${days}日`; rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=7) {ls='color:var(--amber)';lt=`あと${days}日`; rs='border-left:3px solid var(--amber);padding-left:10px';}
    else             {ls='color:var(--text3)';lt=`あと${days}日`; rs='border-left:3px solid var(--border);padding-left:10px';}
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);${rs}">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:11px;color:var(--text3)">コマ${n} ・ ${dateStr} ${planTimeLabel(dl.getTime())}</div>
      </div>
      <span style="font-size:11px;font-weight:700;${ls};flex-shrink:0">${lt}</span></div>`;
  }).join('');
  el.innerHTML=html;
}
