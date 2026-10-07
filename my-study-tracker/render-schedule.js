// 月・週間・全体で、同じ最新の学習計画を表示する。
let scheduleMonthKey=null;
let lastScheduleMinute=-1;
function renderSchedulePage() {
  const sem=getCurrentSemester();if(!sem||!privateDataReady)return;
  initializePlanner(sem);latestStudyPlan=getScheduledStudyPlan(sem);
  lastScheduleMinute=Math.floor(Date.now()/60000);
  renderMonthSchedule(getEnrolledSubjects(sem.id),sem,sem.id,latestStudyPlan);
  renderStudyPlanner(sem,latestStudyPlan);
}
function shiftScheduleMonth(offset) {
  const [year,month]=scheduleMonthKey.split('-').map(Number),next=new Date(Date.UTC(year,month-1+offset,1));
  scheduleMonthKey=next.toISOString().slice(0,10);plannerAnchor=scheduleMonthKey;plannerSelectedDay=scheduleMonthKey;renderSchedulePage();
}
function selectScheduleDay(day) {
  if(!validCalendarDate(day))return;
  plannerSelectedDay=day;plannerAnchor=day;
  document.querySelectorAll('[data-calendar-day]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.calendarDay===day)));
  renderScheduleDayDetails(day,getCurrentSemester(),latestStudyPlan);
}
function deadlinesForPlanDay(day,semester) {
  const now=new Date(),items=[];
  for(const subject of getEnrolledSubjects(semester.id))for(let n=1;n<=subject.lessons;n++) {
    const deadline=getLessonDeadline(n,subject,semester);if(japanDate(deadline)!==day)continue;
    const done=isLessonRecorded(semester.id,subject.code,n);
    items.push({subject,n,deadline,done,late:!done&&deadline<now});
  }
  return items;
}
function renderMonthSchedule(subjects,sem,semId,plan) {
  initializePlanner(sem);plan=plan||getScheduledStudyPlan(sem);latestStudyPlan=plan;
  const [year,month]=scheduleMonthKey.split('-').map(Number),firstDow=planDayOfWeek(scheduleMonthKey),days=new Date(Date.UTC(year,month,0)).getUTCDate();
  document.getElementById('schedule-month-label').textContent=`${year}年${month}月`;
  const today=japanDate(),exams=getRelevantExams(sem),el=document.getElementById('schedule-month');
  const studiedDays = new Set(getStudyEntries().map(e=>e.date));
  const byDay=new Map();plan.sessions.forEach(s=>{if(!byDay.has(s.day))byDay.set(s.day,[]);byDay.get(s.day).push(s);});
  const deadlineMap=new Map();for(const s of subjects)for(let n=1;n<=s.lessons;n++){const d=japanDate(getLessonDeadline(n,s,sem));if(d.slice(0,7)!==scheduleMonthKey.slice(0,7))continue;if(!deadlineMap.has(d))deadlineMap.set(d,0);deadlineMap.set(d,deadlineMap.get(d)+1);}
  let html='<div class="month-weekdays">'+['日','月','火','水','木','金','土'].map(d=>`<span>${d}</span>`).join('')+'</div><div class="month-grid">';
  for(let i=0;i<firstDow;i++)html+='<div class="month-blank" aria-hidden="true"></div>';
  for(let n=1;n<=days;n++) {
    const day=`${year}-${String(month).padStart(2,'0')}-${String(n).padStart(2,'0')}`,info=planDayInfo(day),sessions=byDay.get(day)||[],skip=(state.privateData.planner.skipDates||[]).includes(day);
    const dayExams=exams.filter(e=>japanDate(parseDateValue(e.date))===day),apps=getApplications(semId).filter(a=>a.date===day),count=deadlineMap.get(day)||0;
    html+=`<button type="button" class="month-day${day===today?' is-today':''}${info.holiday?' is-holiday':''}${skip?' is-skipped':''}${studiedDays.has(day)?' has-study-record':''}" data-calendar-day="${day}" aria-pressed="${plannerSelectedDay===day}" aria-label="${planDateLabel(day)}、学習${sessions.length}枠${studiedDays.has(day)?'、🍑 勉強した日':''}${skip?'、勉強しない日':''}、詳細を表示">
      <span class="month-day-top"><span class="month-day-number">${n}</span>${studiedDays.has(day)?'<span class="month-peach" aria-hidden="true">🍑</span>':''}</span>${skip?'<span class="month-rest">休み</span>':sessions.slice(0,2).map(s=>`<span class="month-study-label" title="${escapeText(s.label)}">${escapeText(SUBJECT_BY_CODE.get(s.code).name)}<small>${s.kind==='exam'?'期末':`コマ${s.lesson}`}</small></span>`).join('')}
      ${sessions.length>2?`<span class="month-more">＋${sessions.length-2}枠</span>`:''}
      ${count?`<span class="month-deadline-label">締切${count}件</span>`:''}${dayExams.length?'<span class="month-exam-label">期末締切</span>':''}${apps.length?'<span class="month-personal-label">自分の予定</span>':''}</button>`;
  }
  const studiedCount = [...studiedDays].filter(day=>day.slice(0,7)===scheduleMonthKey.slice(0,7)).length;
  html+=`</div><p class="month-legend"><span class="month-study-key">■ 学習予定</span><span class="month-deadline-key">■ 締切</span><span>🍑 学習日</span></p>`;
  const total=document.getElementById('month-study-total');if(total){total.hidden=plannerView!=='month';total.innerHTML=`<span>🍑 この月は</span><strong>${studiedCount}<small>日</small></strong><span>勉強しました</span>`;}
  el.innerHTML=html;el.querySelectorAll('[data-calendar-day]').forEach(b=>b.addEventListener('click',()=>selectScheduleDay(b.dataset.calendarDay)));
  document.getElementById('schedule-plan-status').innerHTML=plannerStatusHTML(plan);
  renderScheduleDayDetails(plannerSelectedDay,sem,plan);
}
function renderScheduleDayDetails(day,semester,plan) {
  const el=document.getElementById('schedule-day-details');if(!el||!day||!plan)return;
  const sessions=plan.sessions.filter(s=>s.day===day),info=planDayInfo(day),deadlines=deadlinesForPlanDay(day,semester);
  const exams=getRelevantExams(semester).filter(e=>japanDate(parseDateValue(e.date))===day),apps=getApplications(semester.id).filter(e=>e.date===day);
  el.innerHTML=`<div class="selected-study-heading"><h3>${planDateLabel(day)}にやること</h3><span>${escapeText(info.label)}</span></div>
    ${getStudyEntries(day).length?'<p class="record-caption">🍑 勉強した日</p>':''}
    ${sessions.map(s=>planSessionHTML(s,semester.id)).join('')||`<p class="settings-note">${planDayEmptyText(day,semester,plan)}</p>`}
    ${skipStudyDayButton(day)}
    ${deadlines.length||exams.length?`<details class="day-deadlines"><summary>この日の大学締切 ${deadlines.length+exams.length}件</summary>${deadlines.map(d=>`<p>${escapeText(d.subject.name)} コマ${d.n}<small>${planTimeLabel(d.deadline)} · ${d.done?'視聴・課題提出済み':d.late?'期限超過':'未完了'}</small></p>`).join('')}${exams.map(e=>`<p>${escapeText(e.label)}<small>${planTimeLabel(parseDateValue(e.date))}まで</small></p>`).join('')}</details>`:''}
    ${apps.map(a=>`<div class="application-item"><strong>${escapeText(a.title)}</strong><p class="settings-note">${a.allDay?'終日':escapeText(a.time)} · ${a.done?'対応済み':'自分の予定'}</p></div>`).join('')}`;
  bindPlannerActions(el,semester.id);
}
function refreshScheduleForTime() {
  if(!privateDataReady||document.visibilityState==='hidden')return;
  if(document.activeElement?.matches('input,select,textarea'))return;
  if(document.getElementById('quiz-modal')||document.querySelector('form[data-dirty="true"]'))return;
  const sem=getCurrentSemester(),snapshot=state.planSnapshots?.[sem.id];
  if(snapshot?.cycle===reallocationCycle()&&lastScheduleMinute===Math.floor(Date.now()/60000))return;
  if(document.getElementById('page-schedule')?.classList.contains('active'))renderSchedulePage();
  else if(document.getElementById('page-today')?.classList.contains('active')){renderToday();lastScheduleMinute=Math.floor(Date.now()/60000);}
}
function setupScheduleRefresh() {
  document.addEventListener('visibilitychange',refreshScheduleForTime);
  window.addEventListener('pageshow',refreshScheduleForTime);window.addEventListener('focus',refreshScheduleForTime);
  window.setInterval(refreshScheduleForTime,60000);
}

// iOSのスクロール領域内でも抑止する。スクロール・長押し・ピンチは妨げない。
function setupCalendarTouchGuard() {
  let start=null,lastTap=null;
  const inScope=target=>target instanceof Element && target.closest('#page-schedule');
  document.addEventListener('touchstart',event=>{
    if(!inScope(event.target)||event.touches.length!==1){start=null;lastTap=null;return;}
    const t=event.touches[0];start={x:t.clientX,y:t.clientY,id:t.identifier,time:event.timeStamp,moved:false};
  },{capture:true,passive:true});
  document.addEventListener('touchmove',event=>{
    if(!start)return;
    const t=[...event.touches].find(t=>t.identifier===start.id);
    if(event.touches.length!==1||!t||Math.hypot(t.clientX-start.x,t.clientY-start.y)>10){start.moved=true;lastTap=null;}
  },{capture:true,passive:true});
  document.addEventListener('touchcancel',()=>{start=null;lastTap=null;},{capture:true,passive:true});
  document.addEventListener('touchend',event=>{
    if(!start||start.moved||event.touches.length||event.changedTouches.length!==1||event.timeStamp-start.time>500||!inScope(event.target)){start=null;lastTap=null;return;}
    const t=event.changedTouches[0],tap={x:t.clientX,y:t.clientY,time:event.timeStamp};
    const repeated=lastTap&&tap.time-lastTap.time<400&&Math.hypot(tap.x-lastTap.x,tap.y-lastTap.y)<32;
    start=null;lastTap=tap;
    if(!repeated||!event.cancelable)return;
    event.preventDefault(); // 2回目のブラウザー標準ズームと合成clickを止める。
    const button=event.target.closest('button,[role="button"]');
    if(button?.isConnected&&!button.disabled)button.click(); // 操作自体は1回だけ反映。
  },{capture:true,passive:false});
  document.addEventListener('dblclick',event=>{if(inScope(event.target))event.preventDefault();},{capture:true,passive:false});
}
