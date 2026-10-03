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
      const viewed = isLessonViewed(semester.id, s.code, n), submitted = record.assignments.includes(n);
      if (viewed && submitted) continue;
      const minutes = (viewed ? 0 : profile.lessonMinutes - profile.assignmentMinutes) + (submitted ? 0 : profile.assignmentMinutes);
      tasks.push({ id: `${s.code}-${n}`, code: s.code, lesson: n, kind: 'lesson',
        label: `${s.name} コマ${n}${viewed ? ' 課題' : submitted ? ' 視聴' : ' 視聴・課題'}`,
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
// 過去の予定を完了と推定しない。毎回、現在の未完了記録から締切前だけに割り当てる。
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
        minutes,partial:minutes<task.minutes,reserve:slot.reserve,confirmed:task.confirmed,deadline:task.deadline,late:false});
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
      for(const slot of [...reserve].sort((a,b)=>b.start-a.start)) {
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
function buildStudyPlan(semester, now=new Date()) {
  const profile=state.privateData.planner,lead=(profile.leadDays||0)*86400000;
  const source=pendingStudyTasks(semester).map(t=>({...t,target:Math.min(t.deadline,Math.max(t.start+t.minutes*60000,t.deadline-lead))}));
  const {startDate,slots}=getStudySlots(semester,now),usable=slots.filter(s=>!s.skipped&&!s.conflict.length);
  const primary=usable.filter(s=>!s.reserve),reserve=usable.filter(s=>s.reserve),chosen=new Set();
  const overdue=source.filter(t=>t.deadline<=now.getTime()),pending=source.filter(t=>t.deadline>now.getTime());
  let allocation=allocateWithReserves(pending,primary,reserve,chosen,true);
  // 余裕日数を確保できない場合も、本来の締切までは利用する。締切後には割り当てない。
  if(allocation.tasks.some(t=>t.remaining>0))allocation=allocateWithReserves(pending,primary,reserve,chosen,false);
  const tasks=[...allocation.tasks,...overdue],sessions=allocation.sessions.sort((a,b)=>a.start-b.start);
  return {startDate,endDate:semester.end,generatedAt:now.getTime(),tasks,sessions,slots,
    capacity:usable.reduce((n,s)=>n+Math.floor((s.end-s.start)/60000),0),
    required:tasks.reduce((n,t)=>n+t.minutes,0),remaining:tasks.reduce((n,t)=>n+t.remaining,0),
    risk:tasks.filter(t=>t.remaining>0),overdue,nearDeadline:allocation.tasks.filter(t=>!t.remaining&&t.finish>t.target),
    reserveMinutes:sessions.filter(s=>s.reserve).reduce((n,s)=>n+s.minutes,0),unknown:tasks.filter(t=>!t.confirmed).length};
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
    <p>通常枠と予備枠を使っても収まりません。以下は締切後へ自動で押し出さず、要調整として残しています。</p><ul>${plan.risk.map(t=>`<li>${escapeText(t.label)}：${t.remaining}分不足${plan.overdue.some(o=>o.id===t.id)?'・すでに期限超過':''}</li>`).join('')}</ul></details>`;
  if(plan.nearDeadline.length)html+=`<p class="plan-warning">${plan.nearDeadline.length}件は余裕日数を確保できず、締切直前の予定です。</p>`;
  if(plan.unknown)html+='<p class="settings-note">概算・期末日時未確認を含むため、正式な締切も確認してください。</p>';
  return html;
}
function plannerStatusHTML(plan) {
  const p=state.privateData.planner;
  return `<p class="settings-note">未完了分は${planTimeLabel(plan.generatedAt)}時点で自動調整。できた分を記録すると再配置します。できない日は「この日は勉強しない」で先に除外できます。</p>
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
  const record=getStudyRecord(semId,s.code),subject=SUBJECT_BY_CODE.get(s.code),sem=SEMESTERS.find(s=>s.id===semId);
  const controls=s.kind==='exam'?`<button class="plan-record-btn" data-plan-exam="${s.code}">期末を受験済みにする</button>`:
    `<button class="plan-record-btn" data-plan-viewed="${s.code}" data-plan-lesson="${s.lesson}" aria-pressed="${isLessonViewed(semId,s.code,s.lesson)}">${isLessonViewed(semId,s.code,s.lesson)?'✓ 視聴済み':'視聴済みにする'}</button>
    <button class="plan-record-btn" data-plan-assignment="${s.code}" data-plan-lesson="${s.lesson}" aria-pressed="${record.assignments.includes(s.lesson)}" ${isLessonAvailable(s.lesson,subject,sem)?'':'disabled'}>${record.assignments.includes(s.lesson)?'✓ 課題提出済み':'課題提出済みにする'}</button>`;
  return `<article class="plan-session" data-plan-task="${s.taskId}"><time>${planTimeLabel(s.start)}〜${planTimeLabel(s.end)}${s.reserve?' · 予備枠':''}</time>
    <strong>${escapeText(s.label)}${s.partial?`（この枠で${s.minutes}分）`:''}</strong><small>締切 ${planDateLabel(japanDate(new Date(s.deadline)))} ${planTimeLabel(s.deadline)}${s.confirmed?'':' · 日時未確認'}</small>
    <div class="plan-record-actions">${controls}</div></article>`;
}
function bindPlannerActions(root,semId=state.currentSemesterId) {
  root.querySelectorAll('[data-skip-study-day]').forEach(b=>b.addEventListener('click',()=>toggleSkippedStudyDay(b.dataset.skipStudyDay)));
  root.querySelectorAll('[data-plan-viewed]').forEach(b=>b.addEventListener('click',()=>toggleLesson(b.dataset.planViewed,Number(b.dataset.planLesson),semId)));
  root.querySelectorAll('[data-plan-assignment]').forEach(b=>b.addEventListener('click',()=>{
    const code=b.dataset.planAssignment,n=Number(b.dataset.planLesson);
    setAssignment(semId,code,n,!getStudyRecord(semId,code).assignments.includes(n));renderSchedulePage();
  }));
  root.querySelectorAll('[data-plan-exam]').forEach(b=>b.addEventListener('click',()=>toggleFinalExam(b.dataset.planExam,semId)));
}
function planDayEmptyText(day,semester,plan) {
  if((state.privateData.planner.skipDates||[]).includes(day))return '勉強しない日。未完了分は別の日へ再配置しました。';
  if(day<semester.start)return '開講前：資料確認・学習準備。';
  if(day<japanDate())return '過去の未完了分を、今後の締切前の枠へ再配置します。入らない分は要調整として表示します。';
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
  const note=`<p class="settings-note">授業＋課題${p.lessonMinutes}分・期末枠${p.examMinutes}分を目安に、${p.leadDays||0}日前の完了を優先します。実際の所要時間は科目に合わせてください。予備枠は必要な日のみ使います。</p>`;
  if(plannerView==='overview') {
    const baseMinutes=kind=>p[kind].filter(b=>b.kind==='study'&&!b.reserve).reduce((n,b)=>n+plannerMinutes(b.end)-plannerMinutes(b.start),0);
    const weeks=new Map();for(const s of plan.sessions){const day=addPlanDays(s.day,-((planDayOfWeek(s.day)+6)%7));if(!weeks.has(day))weeks.set(day,{minutes:0,codes:new Set(),reserve:0});const w=weeks.get(day);w.minutes+=s.minutes;w.codes.add(s.code);if(s.reserve)w.reserve+=s.minutes;}
    root.innerHTML=`<div class="card"><div class="card-label">OVERVIEW</div><h2 class="card-title">全体の学習計画</h2><p>${escapeText(semester.name)}</p>
      <div class="record-stats"><div><strong>${hours(plan.required)}<small>時間</small></strong><span>残りの学習量</span></div><div><strong>${hours(baseMinutes('workday')*5+baseMinutes('holiday')*2)}<small>時間/週</small></strong><span>通常の学習枠</span></div><div><strong>${hours(plan.reserveMinutes)}<small>時間</small></strong><span>必要な予備枠の合計</span></div></div>
      <p class="settings-note">${escapeText(p.note)}</p>${note}${plannerStatusHTML(plan)}
      ${!plan.risk.length&&plan.tasks.length?'<p class="plan-ok">残りの授業・課題・期末を締切前に配置しました。</p>':''}
      <ol class="plan-phases"><li>開始済みの授業から、締切順に配置。</li><li>できなかった分は、次に開いたとき・表示中の更新時に自動で再配置。</li><li>通常枠で足りない期間だけ予備枠を使用。確保できない分は要調整として表示。</li></ol></div>
      <div class="card"><h2 class="card-title">週ごとの見通し</h2>${weeks.size?[...weeks].map(([day,w])=>`<button class="plan-week-link" data-plan-week="${day}"><span>${planDateLabel(day)}〜<small>${w.codes.size}科目${w.reserve?` · 予備${hours(w.reserve)}時間`:''}</small></span><strong>${hours(w.minutes)}時間 ›</strong></button>`).join(''):'<p class="settings-note">履修科目と残りの進捗を確認してください。</p>'}</div>`;
    root.querySelectorAll('[data-plan-week]').forEach(b=>b.addEventListener('click',()=>setPlannerView('week',b.dataset.planWeek)));
  } else {
    const weekStart=getPlannerWeekStart();
    root.innerHTML=`<div class="card"><div class="card-label">WEEK</div><h2 class="card-title">1週間のスケジュール</h2>${plannerDateNav(7)}<p class="plan-day-label">${planDateLabel(weekStart)}〜${planDateLabel(addPlanDays(weekStart,6))} <button type="button" class="inline-link" data-plan-today>今日から表示</button></p>${note}${plannerStatusHTML(plan)}
      <div class="plan-week">${Array.from({length:7},(_,i)=>{const day=addPlanDays(weekStart,i),info=planDayInfo(day),sessions=plan.sessions.filter(s=>s.day===day);return `<article class="plan-day ${info.holiday?'holiday':''}${day===japanDate()?' is-today':''}" data-plan-day="${day}"><div class="plan-day-heading"><strong>${day===japanDate()?'今日 · ':''}${planDateLabel(day)}</strong><span>${escapeText(info.label)}</span></div>
        ${sessions.map(s=>planSessionHTML(s,semester.id)).join('')||`<p class="settings-note">${planDayEmptyText(day,semester,plan)}</p>`}${skipStudyDayButton(day)}${info.confirmed?'':'<p class="settings-note">祝日未登録：土日のみ休日扱い</p>'}</article>`;}).join('')}</div></div>`;
  }
  root.querySelectorAll('[data-plan-shift]').forEach(b=>b.addEventListener('click',()=>shiftPlannerDate(Number(b.dataset.planShift))));
  root.querySelector('[data-plan-date]')?.addEventListener('change',e=>{if(validCalendarDate(e.target.value)){plannerWeekStart=e.target.value;plannerWeekToday=japanDate();renderSchedulePage();}});
  root.querySelector('[data-plan-today]')?.addEventListener('click',()=>setPlannerView('week'));
  bindPlannerActions(root,semester.id);
}
function plannerDateNav(step) {return `<div class="planner-date-nav"><button class="data-transfer-btn" data-plan-shift="${-step}" aria-label="7日前から表示">‹</button><input data-plan-date type="date" aria-label="表示を開始する日" value="${getPlannerWeekStart()}" min="2000-01-01" max="2100-12-31"><button class="data-transfer-btn" data-plan-shift="${step}" aria-label="7日後から表示">›</button></div>`;}
