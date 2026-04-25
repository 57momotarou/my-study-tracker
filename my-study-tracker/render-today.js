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
    today.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'});

  // 学事アラート（期末試験・成績発表）
  renderExamAlerts(sem);

  // 遅刻アラート
  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const done = Math.floor(getCompletedLessons(s.code)/CPL);
    const late = getTodayTarget(s,sem) - done;
    if (late>=3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`;
    else if (late>=1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中 — 優先受講を</div>`;
  });

  // TODAY 時間割カード
  renderTodayTimetable(subjects, sem, semId);

  // 締切
  renderUpcoming(subjects, sem);
}

// ============================================================
// 学事アラート
// ============================================================
function renderExamAlerts(sem) {
  const el = document.getElementById('today-exam-alerts');
  if (!el) return;
  el.innerHTML = '';
  if (!sem.exams && !sem.seiseki) return;
  const now = new Date();

  const alerts = [];
  (sem.exams||[]).forEach(exam => {
    const d = new Date(exam.date); d.setHours(23,59,59);
    const days = Math.ceil((d-now)/86400000);
    if (days>=-3 && days<=14) alerts.push({label:exam.label, days, isPast:days<0, isUrgent:days<=3});
  });
  if (sem.seiseki) {
    const d = new Date(sem.seiseki);
    const days = Math.ceil((d-now)/86400000);
    if (days>=-3 && days<=14) alerts.push({label:'成績発表', days, isPast:days<0, isSeiseki:true});
  }
  alerts.forEach(({label,days,isPast,isUrgent,isSeiseki}) => {
    const icon  = isSeiseki?'📊':'📝';
    const bg    = isPast?'var(--bg3)':isUrgent?'var(--red-dim)':'var(--amber-dim)';
    const bd    = isPast?'var(--border)':isUrgent?'var(--red)':'var(--amber)';
    const color = isPast?'var(--text3)':isUrgent?'var(--red)':'var(--amber)';
    const txt   = isPast?`${Math.abs(days)}日前に終了`:days===0?'今日が締切！':days===1?'明日が締切！':`あと${days}日`;
    el.innerHTML += `<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${bd};margin-bottom:8px">
      <span style="font-size:18px">${icon}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:700;color:${color}">${label}</div>
      <div style="font-size:11px;color:var(--text3)">${isPast?'終了':'期末試験期間'}</div></div>
      <span style="font-size:11px;font-weight:700;color:${color};flex-shrink:0">${txt}</span></div>`;
  });
}

// ============================================================
// 締切
// ============================================================
function renderUpcoming(subjects, sem) {
  const el=document.getElementById('today-upcoming');
  if (!el) return;
  if (!subjects.length) { el.innerHTML=''; return; }
  const now=new Date(), twoW=new Date(now.getTime()+14*86400000);
  const items=[];
  subjects.forEach(s=>{
    const done=Math.floor(getCompletedLessons(s.code)/CPL);
    for (let n=1;n<=s.lessons;n++) {
      if (n<=done) continue;
      const dl=getLessonDeadline(n,s,sem);
      if (dl>twoW) break;
      items.push({s,n,dl,isLate:dl<now,days:Math.ceil((dl-now)/86400000)});
    }
  });
  let html='';
  if (sem.attendance?.senmon_jyunji?.[16]) {
    const e=sem.attendance.senmon_jyunji[16];
    const dl=new Date(typeof e==='string'?e:e.end);
    const days=Math.ceil((dl-now)/86400000);
    if (days>-3&&days<=30) {
      const isPast=days<0,bd=isPast?'var(--border)':days<=7?'var(--red)':'var(--amber)';
      const bg=isPast?'var(--bg3)':days<=7?'var(--red-dim)':'var(--amber-dim)';
      const tx=isPast?'var(--text3)':days<=7?'var(--red)':'var(--amber)';
      const dateStr=dl.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
      const lbl=isPast?`${Math.abs(days)}日前に終了`:days===0?'今日が締切！':`あと${days}日`;
      html+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${bd};margin-bottom:10px">
        <span style="font-size:18px">📝</span>
        <div style="flex:1"><div style="font-size:13px;font-weight:700;color:${tx}">期末試験（専門・順次開講）</div>
        <div style="font-size:11px;color:var(--text3)">〜 ${dateStr} 12:00 まで</div></div>
        <span style="font-size:11px;font-weight:700;color:${tx};flex-shrink:0">${lbl}</span></div>`;
    }
  }
  if (!items.length&&!html) { el.innerHTML=`<div style="color:var(--text3);font-size:13px;text-align:center;padding:8px">2週間以内の締切はありません 🎉</div>`; return; }
  items.sort((a,b)=>a.dl-b.dl);
  html+=items.map(({s,n,dl,isLate,days})=>{
    const color=getCategoryColor(s.category);
    const dateStr=dl.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
    let ls,lt,rs='';
    if(isLate)       {ls='color:var(--red)';  lt='遅刻中';        rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=3) {ls='color:var(--red)';  lt=`あと${days}日`; rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=7) {ls='color:var(--amber)';lt=`あと${days}日`; rs='border-left:3px solid var(--amber);padding-left:10px';}
    else             {ls='color:var(--text3)';lt=`あと${days}日`; rs='border-left:3px solid var(--border);padding-left:10px';}
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border);${rs}">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 〜${dateStr} 12:00</div>
      </div>
      <span style="font-size:11px;font-weight:700;${ls};flex-shrink:0">${lt}</span></div>`;
  }).join('');
  el.innerHTML=html;
}
