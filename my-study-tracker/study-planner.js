// 学習計画は端末の生活時間・履修・進捗から組み立てる。外部送信しない。
function plannerMinutes(value) {
  if (value === '24:00') return 1440;
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value || '') ? Number(value.slice(0, 2)) * 60 + Number(value.slice(3)) : NaN;
}
function validatePlannerProfile(p) {
  const fail = () => { throw new Error('生活時間データに不足・重複・不正な時刻があります。'); };
  if (!isPlainObject(p) || typeof p.note !== 'string') fail();
  for (const key of ['lessonMinutes','assignmentMinutes','examMinutes']) if (!Number.isInteger(p[key]) || p[key] < 1 || p[key] > 240) fail();
  if (p.lessonMinutes <= p.assignmentMinutes) fail();
  if (p.leadDays !== undefined && (!Number.isInteger(p.leadDays) || p.leadDays < 0 || p.leadDays > 14)) fail();
  if (p.skipDates !== undefined && (!Array.isArray(p.skipDates) || p.skipDates.length > 1000 || p.skipDates.some(d => !validCalendarDate(d)))) fail();
  for (const key of ['wake','bed','latestBed']) if (!Number.isFinite(plannerMinutes(p[key]))) fail();
  for (const key of ['workday','holiday']) {
    if (!Array.isArray(p[key]) || !p[key].length || p[key].length > 40) fail();
    let end = 0;
    for (const b of p[key]) {
      if (!isPlainObject(b) || typeof b.title !== 'string' || b.title.length > 120
          || !['life','work','commute','sleep','study','review'].includes(b.kind)
          || (b.reserve !== undefined && typeof b.reserve !== 'boolean')
          || plannerMinutes(b.start) !== end || !(plannerMinutes(b.end) > end)) fail();
      end = plannerMinutes(b.end);
      if (['study','review'].includes(b.kind) && plannerMinutes(b.start) < plannerMinutes(p.wake)) fail();
    }
    if (end !== 1440) fail();
  }
  if (!isPlainObject(p.holidays) || !Array.isArray(p.holidayYears) || p.holidayYears.some(y => !Number.isInteger(y))
      || Object.entries(p.holidays).some(([d, title]) => !validCalendarDate(d) || typeof title !== 'string')) fail();
}
function japanDate(date = new Date()) { return new Date(date.getTime() + 9 * 3600000).toISOString().slice(0, 10); }
function addPlanDays(key, days) { const d = new Date(key + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days); return d.toISOString().slice(0, 10); }
function planDayOfWeek(key) { return new Date(key + 'T00:00:00Z').getUTCDay(); }
function planTime(key, time) { return new Date(`${key}T${time === '24:00' ? '00:00' : time}:00+09:00`).getTime() + (time === '24:00' ? 86400000 : 0); }
function planTimeLabel(time) { return new Date(time).toLocaleTimeString('ja-JP', { timeZone: 'Asia/Tokyo', hour: '2-digit', minute: '2-digit', hour12: false }); }
function planDateLabel(key) { return new Date(key + 'T00:00:00+09:00').toLocaleDateString('ja-JP', { timeZone: 'Asia/Tokyo', month: 'numeric', day: 'numeric', weekday: 'short' }); }
function planDayInfo(key, profile = state.privateData.planner) {
  const dow = planDayOfWeek(key), holiday = profile.holidays[key];
  return { holiday: Boolean(dow === 0 || dow === 6 || holiday), label: holiday || (dow === 0 || dow === 6 ? '休日' : '勤務日'), confirmed: profile.holidayYears.includes(Number(key.slice(0, 4))) };
}
function planBlocks(key) {
  const p = state.privateData.planner;
  return planDayInfo(key, p).holiday ? p.holiday : p.workday;
}
function planEventConflicts(key, start, end, semId) {
  // 時間の長さが未入力の個人予定は、重なる学習枠を丸ごと予備枠として空ける。
  return getApplications(semId).filter(e => !e.done && e.date === key && (e.allDay || (planTime(key, e.time) >= start && planTime(key, e.time) < end)));
}
function getSubjectExam(subject, semester) {
  const key = getAttendanceKey(subject, semester);
  return (semester.exams || []).find(exam => exam.keys?.includes(key)) || null;
}
function pendingStudyTasks(semester) {
  const profile = state.privateData.planner, tasks = [];
  for (const s of getEnrolledSubjects(semester.id)) {
    const record = getStudyRecord(semester.id, s.code);
    for (let n = 1; n <= s.lessons; n++) {
      if (isLessonRecorded(semester.id, s.code, n)) continue;
      const minutes = profile.lessonMinutes;
      tasks.push({ id: `${s.code}-${n}`, code: s.code, lesson: n, kind: 'lesson',
        label: `${s.name} コマ${n} 視聴・課題`,
        minutes, remaining: minutes, start: getLessonStart(n, s, semester).getTime(),
        deadline: getLessonDeadline(n, s, semester).getTime(), confirmed: Boolean(confirmedLessonDeadline(s, semester, n)) });
    }
    if (!record.examTaken) {
      const exam = getSubjectExam(s, semester);
      tasks.push({ id: `${s.code}-exam`, code: s.code, kind: 'exam', label: `${s.name} 期末準備・受験枠`,
        minutes: profile.examMinutes, remaining: profile.examMinutes,
        start: exam?.start ? parseDateValue(exam.start).getTime() : getLessonStart(1, s, semester).getTime(),
        deadline: exam ? parseDateValue(exam.date).getTime() : planTime(semester.end, '24:00'),
        confirmed: Boolean(exam && /T/.test(exam.date)) });
    }
  }
  return tasks.sort((a,b) => a.deadline - b.deadline || a.code.localeCompare(b.code) || (a.lesson || 999) - (b.lesson || 999));
}
// 過去の予定を完了と推定しない。割当の再生成は日本時間6時の周期ごと。
function getStudySlots(semester, now) {
  const today = japanDate(now), startDate = today > semester.start ? today : semester.start, slots = [];
  const skipped = new Set(state.privateData.planner.skipDates || []);
  for (let day=startDate, i=0;day<=semester.end && i<400;day=addPlanDays(day,1),i++) {
    for (const [index,b] of planBlocks(day).entries()) {
      if (b.kind !== 'study') continue;
      // 分の途中で開いても開始時刻を切り上げる。過去の時間を空き時間に数えない。
      const start=Math.max(planTime(day,b.start),Math.ceil(now.getTime()/60000)*60000),end=planTime(day,b.end);
      if(start>=end)continue;
      slots.push({id:`${day}-${index}`,day,start,end,reserve:b.reserve===true,skipped:skipped.has(day),conflict:planEventConflicts(day,start,end,semester.id)});
    }
  }
  return {startDate,slots};
}
function allocateStudyTasks(sourceTasks, slots, useTargets) {
  const tasks=sourceTasks.map(t=>({...t,remaining:t.minutes,finish:null})),sessions=[];
  const limit=t=>useTargets?t.target:t.deadline;
  const ordered=[...tasks].sort((a,b)=>limit(a)-limit(b)||a.deadline-b.deadline||a.code.localeCompare(b.code)||(a.lesson||999)-(b.lesson||999));
  for(const slot of [...slots].sort((a,b)=>a.start-b.start)) {
    let cursor=slot.start;
    while(slot.end-cursor>=60000) {
      const task=ordered.find(t=>t.remaining>0 && t.start<=cursor && limit(t)>cursor
        && (t.kind!=='exam'||!tasks.some(other=>other.code===t.code&&other.kind==='lesson'&&other.remaining>0))
        && (t.kind!=='exam'||Math.min(slot.end,limit(t))-cursor>=t.remaining*60000));
      if(!task) {
        // 枠の途中で開講になるケースにも対応。
        const next=ordered.filter(t=>t.remaining>0&&t.start>cursor&&t.start<slot.end&&limit(t)>t.start).map(t=>t.start);
        if(!next.length)break;
        cursor=Math.min(...next);continue;
      }
      const minutes=Math.min(task.remaining,Math.floor((Math.min(slot.end,limit(task))-cursor)/60000));
      if(minutes<1)break;
      const end=cursor+minutes*60000;
      sessions.push({day:slot.day,start:cursor,end,taskId:task.id,code:task.code,lesson:task.lesson,kind:task.kind,label:task.label,
        minutes,partial:minutes<task.minutes,reserve:slot.reserve,weekendAdjustment:slot.reserve && isPlanWeekend(slot.day),confirmed:task.confirmed,deadline:task.deadline,late:false});
      task.remaining-=minutes;task.finish=end;cursor=end;
    }
  }
  return {tasks,sessions};
}
function allocateWithReserves(tasks, primary, reserve, chosen, useTargets) {
  let allocation=allocateStudyTasks(tasks,[...primary,...reserve.filter(s=>chosen.has(s.id))],useTargets);
  // 必要な分だけ、締切前の予備枠を追加する。追加するたびに全体を再配置。
  for(let pass=0;pass<=reserve.length;pass++) {
    const missing=allocation.tasks.filter(t=>t.remaining>0).sort((a,b)=>(useTargets?a.target:a.deadline)-(useTargets?b.target:b.deadline));
    if(!missing.length)break;
    let added=false;
    for(const task of missing) {
      const end=useTargets?task.target:task.deadline;
      let shortage=task.remaining;
      for(const slot of [...reserve].sort((a,b)=>Number(isPlanWeekend(b.day))-Number(isPlanWeekend(a.day)) || b.start-a.start)) {
        if(chosen.has(slot.id))continue;
        const usable=Math.floor((Math.min(slot.end,end)-Math.max(slot.start,task.start))/60000);
        if(usable<=0||(task.kind==='exam'&&usable<task.minutes))continue;
        chosen.add(slot.id);shortage-=usable;added=true;
        if(shortage<=0)break;
      }
    }
    if(!added)break;
    allocation=allocateStudyTasks(tasks,[...primary,...reserve.filter(s=>chosen.has(s.id))],useTargets);
  }
  return allocation;
}
function isPlanWeekend(day) { return [0,6].includes(planDayOfWeek(day)); }
function buildStudyPlan(semester, now=new Date()) {
  const source=pendingStudyTasks(semester).map(t=>({...t,target:t.deadline}));
  const {startDate,slots}=getStudySlots(semester,now),usable=slots.filter(s=>!s.skipped&&!s.conflict.length);
  const primary=usable.filter(s=>!s.reserve),reserve=usable.filter(s=>s.reserve),chosen=new Set();
  const overdue=source.filter(t=>t.deadline<=now.getTime()),pending=source.filter(t=>t.deadline>now.getTime());
  const allocation=allocateWithReserves(pending,primary,reserve,chosen,false);
  const tasks=[...allocation.tasks,...overdue],sessions=allocation.sessions.sort((a,b)=>a.start-b.start);
  return {startDate,endDate:semester.end,generatedAt:now.getTime(),tasks,sessions,slots,
    capacity:usable.reduce((n,s)=>n+Math.floor((s.end-s.start)/60000),0),
    required:tasks.reduce((n,t)=>n+t.minutes,0),remaining:tasks.reduce((n,t)=>n+t.remaining,0),
    risk:tasks.filter(t=>t.remaining>0),overdue,nearDeadline:allocation.tasks.filter(t=>!t.remaining&&t.finish>t.target),
    reserveMinutes:sessions.filter(s=>s.reserve).reduce((n,s)=>n+s.minutes,0),unknown:tasks.filter(t=>!t.confirmed).length};
}
function reallocationCycle(now=new Date()) {
  const day=japanDate(now);return now.getTime()<planTime(day,'06:00')?addPlanDays(day,-1):day;
}
function planTaskIdentity(taskId,semester) {
  if(typeof taskId!=='string')return null;
  const match=/^(.+)-(exam|[1-9]\d*)$/.exec(taskId),subject=match&&SUBJECT_BY_CODE.get(match[1]);
  if(!subject||!semester||!validStudyUnit(match[2],subject))return null;
  return {subject,code:subject.code,unit:match[2]};
}
function normalizePlanSnapshots(value,strict=false) {
  const result={},invalid=()=>{if(strict)throw new Error('朝6時の学習計画の形式が不正です。');};
  if(!isPlainObject(value)){invalid();return result;}
  for(const [id,snapshot] of Object.entries(value)) {
    const semester=SEMESTERS.find(s=>String(s.id)===id);
    if(!semester||!isPlainObject(snapshot)||!validCalendarDate(snapshot.cycle)||typeof snapshot.basis!=='string'||snapshot.basis.length>40||!Array.isArray(snapshot.sessions)||snapshot.sessions.length>8000){invalid();continue;}
    const sessions=[];
    for(const session of snapshot.sessions){
      const task=planTaskIdentity(session?.taskId,semester);
      if(!isPlainObject(session)||!task||!Number.isSafeInteger(session.start)||!Number.isSafeInteger(session.end)||session.end<=session.start||session.end-session.start>240*60000
        ||session.start<planTime(semester.start,'00:00')||session.end>planTime(semester.end,'24:00')||typeof session.reserve!=='boolean'){invalid();continue;}
      sessions.push({taskId:session.taskId,start:session.start,end:session.end,reserve:session.reserve});
    }
    sessions.sort((a,b)=>a.start-b.start);
    if(sessions.some((s,i)=>i>0&&s.start<sessions[i-1].end)){invalid();continue;}
    result[id]={cycle:snapshot.cycle,basis:snapshot.basis,sessions};
  }
  return result;
}
function studyPlanBasis(semester) {
  const text=JSON.stringify([semester,getEnrolledSubjects(semester.id),state.privateData.planner,getApplications(semester.id)]);
  let hash=2166136261;for(let i=0;i<text.length;i++){hash^=text.charCodeAt(i);hash=Math.imul(hash,16777619);}
  return String(hash>>>0);
}
function getScheduledStudyPlan(semester,now=new Date()) {
  const cycle=reallocationCycle(now),anchor=new Date(planTime(cycle,'06:00')),basis=studyPlanBasis(semester);
  let snapshot=state.planSnapshots?.[semester.id];
  if(!snapshot||snapshot.cycle!==cycle){
    const created=buildStudyPlan(semester,anchor);
    snapshot={cycle,basis,sessions:created.sessions.map(s=>({taskId:s.taskId,start:s.start,end:s.end,reserve:s.reserve}))};
    state.planSnapshots={...state.planSnapshots,[semester.id]:snapshot};
    saveState();
  }
  const tasks=pendingStudyTasks(semester).map(t=>({...t,target:t.deadline,finish:null})),byId=new Map(tasks.map(t=>[t.id,t]));
  const {startDate,slots}=getStudySlots(semester,anchor),sessions=[];
  for(const s of snapshot.sessions){
    const task=byId.get(s.taskId),day=japanDate(new Date(s.start));
    if(!task||task.remaining<=0||s.start<task.start||s.end>task.deadline||(state.privateData.planner.skipDates||[]).includes(day)||planEventConflicts(day,s.start,s.end,semester.id).length)continue;
    const minutes=Math.min(task.remaining,(s.end-s.start)/60000);
    if(task.kind==='exam'&&minutes<task.minutes)continue;
    sessions.push({...s,day,end:s.start+minutes*60000,code:task.code,lesson:task.lesson,kind:task.kind,label:task.label,minutes,
      partial:minutes<task.minutes,weekendAdjustment:s.reserve&&isPlanWeekend(day),confirmed:task.confirmed,deadline:task.deadline,late:false});
    task.remaining-=minutes;task.finish=s.start+minutes*60000;
  }
  // 完了を解除した授業がある場合、期末を授業より前へ置かない。次の6時に再配置。
  for(const task of tasks.filter(t=>t.kind==='exam'&&!t.remaining)){
    if(tasks.some(t=>t.code===task.code&&t.kind==='lesson'&&(t.remaining>0||t.finish>task.finish-task.minutes*60000))){
      for(let i=sessions.length-1;i>=0;i--)if(sessions[i].taskId===task.id)sessions.splice(i,1);
      task.remaining=task.minutes;task.finish=null;
    }
  }
  const overdue=tasks.filter(t=>t.deadline<=now.getTime()&&(t.remaining>0||sessions.some(s=>s.taskId===t.id))),risk=tasks.filter(t=>t.remaining>0);
  return {startDate,endDate:semester.end,generatedAt:anchor.getTime(),cycle,tasks,sessions,slots,
    required:tasks.reduce((n,t)=>n+t.minutes,0),remaining:tasks.reduce((n,t)=>n+t.remaining,0),risk,overdue,nearDeadline:[],
    capacity:slots.filter(s=>!s.skipped&&!s.conflict.length).reduce((n,s)=>n+(s.end-s.start)/60000,0),
    reserveMinutes:sessions.filter(s=>s.reserve).reduce((n,s)=>n+s.minutes,0),unknown:tasks.filter(t=>!t.confirmed).length,
    pendingChanges:snapshot.basis!==basis,nextReallocation:planTime(addPlanDays(cycle,1),'06:00')};
}
let plannerView='month',plannerAnchor=null,plannerSemester=null,plannerSelectedDay=null,latestStudyPlan=null;
let plannerWeekStart=null,plannerWeekToday=null;
function getPlannerWeekStart(now=new Date()) {
  const today=japanDate(now);
  if(!plannerWeekStart||plannerWeekToday!==today){plannerWeekStart=today;plannerWeekToday=today;}
  return plannerWeekStart;
}
function setPlannerView(view,weekStart=null) {
  plannerView=['month','week','overview'].includes(view)?view:'month';
  if(plannerView==='week'){plannerWeekToday=japanDate();plannerWeekStart=validCalendarDate(weekStart)?weekStart:plannerWeekToday;}
  renderSchedulePage();
}
function shiftPlannerDate(days) {plannerWeekStart=addPlanDays(getPlannerWeekStart(),days);renderSchedulePage();}
function initializePlanner(semester,now=new Date()) {
  if(plannerSemester!==semester.id||!plannerAnchor){
    plannerSemester=semester.id;plannerAnchor=japanDate(now)<semester.start?semester.start:japanDate(now);
    plannerSelectedDay=plannerAnchor;scheduleMonthKey=plannerAnchor.slice(0,7)+'-01';
    plannerWeekStart=japanDate(now);plannerWeekToday=plannerWeekStart;
  }
}
function plannerRiskHTML(plan) {
  const hours=n=>(n/60).toLocaleString('ja-JP',{maximumFractionDigits:1});
  let html='';
  if(plan.risk.length)html+=`<details class="plan-warning"><summary>締切前に入らない学習 ${plan.risk.length}件（残り${hours(plan.remaining)}時間）</summary>
    <ul>${plan.risk.map(t=>`<li>${escapeText(t.label)}：${t.remaining}分${plan.overdue.some(o=>o.id===t.id)?'・期限超過':'・未配置'}</li>`).join('')}</ul></details>`;
  if(plan.nearDeadline.length)html+=`<p class="plan-warning">${plan.nearDeadline.length}件は余裕日数を確保できず、締切直前の予定です。</p>`;
  return html;
}
function plannerStatusHTML(plan) {
  const p=state.privateData.planner;
  const weekendMinutes = plan.sessions.filter(s=>s.weekendAdjustment).reduce((n,s)=>n+s.minutes,0);
  return `${plan.pendingChanges?'<p class="plan-warning">予定の変更は、次の朝6時に再配置へ反映します。</p>':''}
    ${weekendMinutes ? `<p class="plan-ok">土日の夜に${weekendMinutes}分を追加して調整しています。</p>` : ''}
    ${(p.scheduleRevision||0)<2?'<p class="plan-warning">生活時間の更新があります。今回の非公開JSONを設定 → データから読み直してください。</p>':''}${plannerRiskHTML(plan)}`;
}
function toggleSkippedStudyDay(day) {
  if(!validCalendarDate(day)||day<japanDate())return;
  const dates=new Set(state.privateData.planner.skipDates||[]);
  if(dates.has(day))dates.delete(day);else dates.add(day);
  if(dates.size>1000)return;
  state.privateData={...state.privateData,planner:{...state.privateData.planner,skipDates:[...dates].sort()}};
  saveState();renderSchedulePage();
}
function skipStudyDayButton(day) {
  if(day<japanDate())return '';
  const skipped=(state.privateData.planner.skipDates||[]).includes(day);
  return `<button type="button" class="data-transfer-btn skip-study-day" data-skip-study-day="${day}" aria-pressed="${skipped}">${skipped?'この日の学習を再開':'この日は勉強しない'}</button>`;
}
function planSessionHTML(s,semId=state.currentSemesterId) {
  return `<article class="plan-session" data-plan-task="${s.taskId}"><strong>${escapeText(s.label.replace(' 視聴・課題',''))}</strong><small>締切 ${planDateLabel(japanDate(new Date(s.deadline)))}${s.confirmed?'':' · 概算'}${s.weekendAdjustment?' · 土日調整':''}</small></article>`;
}
function bindPlannerActions(root,semId=state.currentSemesterId) {
  root.querySelectorAll('[data-skip-study-day]').forEach(b=>b.addEventListener('click',()=>toggleSkippedStudyDay(b.dataset.skipStudyDay)));
}
function planDayEmptyText(day,semester,plan) {
  if((state.privateData.planner.skipDates||[]).includes(day))return '勉強しない日';
  if(day<semester.start)return '開講前：資料確認・学習準備。';
  if(day<japanDate())return 'この日の学習予定はありません';
  if(day>semester.end)return '学期終了後：復習・次学期の準備。';
  if(plan.slots.some(s=>s.day===day&&s.conflict.length))return '自分の予定を優先します。空いた枠は休息・復習に。';
  return '授業の割当はありません。休息・復習に使えます。';
}
function renderStudyPlanner(semester,plan) {
  const root=document.getElementById('study-planner');if(!root)return;
  const p=state.privateData.planner;
  document.querySelectorAll('[data-planner-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.plannerView===plannerView)));
  document.getElementById('month-card').hidden=plannerView!=='month';root.hidden=plannerView==='month';
  if(plannerView==='month')return;
  const hours=n=>(n/60).toLocaleString('ja-JP',{maximumFractionDigits:1});
  const note='';
  if(plannerView==='overview') {
    const baseMinutes=kind=>p[kind].filter(b=>b.kind==='study'&&!b.reserve).reduce((n,b)=>n+plannerMinutes(b.end)-plannerMinutes(b.start),0);
    const weeks=new Map();for(const s of plan.sessions){const day=addPlanDays(s.day,-((planDayOfWeek(s.day)+6)%7));if(!weeks.has(day))weeks.set(day,{minutes:0,codes:new Set(),reserve:0});const w=weeks.get(day);w.minutes+=s.minutes;w.codes.add(s.code);if(s.reserve)w.reserve+=s.minutes;}
    root.innerHTML=`<div class="card"><div class="card-label">OVERVIEW</div><h2 class="card-title">全体の学習計画</h2><p>${escapeText(semester.name)}</p>
      <div class="record-stats"><div><strong>${hours(plan.required)}<small>時間</small></strong><span>残りの学習量</span></div><div><strong>${hours(baseMinutes('workday')*5+baseMinutes('holiday')*2)}<small>時間/週</small></strong><span>通常の学習枠</span></div><div><strong>${hours(plan.reserveMinutes)}<small>時間</small></strong><span>必要な予備枠の合計</span></div></div>
      ${plannerStatusHTML(plan)}
      ${!plan.risk.length&&plan.tasks.length?'<p class="plan-ok">残りの授業・課題・期末を締切前に配置しました。</p>':''}
      </div>
      <div class="card"><h2 class="card-title">週ごとの見通し</h2>${weeks.size?[...weeks].map(([day,w])=>`<button class="plan-week-link" data-plan-week="${day}"><span>${planDateLabel(day)}〜<small>${w.codes.size}科目${w.reserve?` · 予備${hours(w.reserve)}時間`:''}</small></span><strong>${hours(w.minutes)}時間 ›</strong></button>`).join(''):'<p class="settings-note">履修科目と残りの進捗を確認してください。</p>'}</div>`;
    root.querySelectorAll('[data-plan-week]').forEach(b=>b.addEventListener('click',()=>setPlannerView('week',b.dataset.planWeek)));
  } else {
    const weekStart=getPlannerWeekStart();
    root.innerHTML=`<div class="card"><div class="card-label">WEEK</div><h2 class="card-title">1週間のスケジュール</h2>${plannerDateNav(7)}<p class="plan-day-label">${planDateLabel(weekStart)}〜${planDateLabel(addPlanDays(weekStart,6))} <button type="button" class="inline-link" data-plan-today>今日から表示</button></p>${note}${plannerStatusHTML(plan)}
      <div class="plan-week">${Array.from({length:7},(_,i)=>{const day=addPlanDays(weekStart,i),info=planDayInfo(day),sessions=plan.sessions.filter(s=>s.day===day);return `<article class="plan-day ${info.holiday?'holiday':''}${day===japanDate()?' is-today':''}" data-plan-day="${day}"><div class="plan-day-heading"><strong>${day===japanDate()?'今日 · ':''}${planDateLabel(day)}</strong><span>${escapeText(info.label)}</span></div>
        ${getStudyEntries(day).length?'<p class="record-caption">🍑 勉強した日</p>':''}${sessions.map(s=>planSessionHTML(s,semester.id)).join('')||`<p class="record-caption">${planDayEmptyText(day,semester,plan)}</p>`}${skipStudyDayButton(day)}</article>`;}).join('')}</div></div>`;
  }
  root.querySelectorAll('[data-plan-shift]').forEach(b=>b.addEventListener('click',()=>shiftPlannerDate(Number(b.dataset.planShift))));
  root.querySelector('[data-plan-date]')?.addEventListener('change',e=>{if(validCalendarDate(e.target.value)){plannerWeekStart=e.target.value;plannerWeekToday=japanDate();renderSchedulePage();}});
  root.querySelector('[data-plan-today]')?.addEventListener('click',()=>setPlannerView('week'));
  bindPlannerActions(root,semester.id);
}
function plannerDateNav(step) {return `<div class="planner-date-nav"><button class="data-transfer-btn" data-plan-shift="${-step}" aria-label="7日前から表示">‹</button><input data-plan-date type="date" aria-label="表示を開始する日" value="${getPlannerWeekStart()}" min="2000-01-01" max="2100-12-31"><button class="data-transfer-btn" data-plan-shift="${step}" aria-label="7日後から表示">›</button></div>`;}
