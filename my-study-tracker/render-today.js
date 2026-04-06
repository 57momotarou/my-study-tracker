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

  // 今週ストリップ
  renderWeekStrip(subjects, sem, semId);

  // 先取りおすすめ
  renderAdvance(subjects, sem, semId);

  // 迫っている締切
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
// 今週ストリップ（時間割の曜日も表示）
// ============================================================
function renderWeekStrip(subjects, sem, semId) {
  const el = document.getElementById('week-strip');
  if (!el) return;
  const now=new Date(), todayDow=now.getDay();
  const LABELS=['日','月','火','水','木','金','土'];
  el.innerHTML='';

  let openDay = -1;
  let panel = document.getElementById('week-strip-panel');
  if (!panel) {
    panel = document.createElement('div');
    panel.id = 'week-strip-panel';
    el.parentNode.insertBefore(panel, el.nextSibling);
  }
  panel.style.cssText = 'display:none;background:var(--bg2);border:1px solid var(--border);border-radius:8px;padding:10px 12px;margin-top:8px';

  for (let d=0;d<7;d++) {
    const date=new Date(now); date.setDate(now.getDate()-todayDow+d); date.setHours(0,0,0,0);
    const isToday=d===todayDow;

    const deadlines=[];
    subjects.forEach(s=>{
      const done=Math.floor(getCompletedLessons(s.code)/CPL);
      for (let n=1;n<=s.lessons;n++) {
        const dl=getLessonDeadline(n,s,sem);
        if (dl.toDateString()===date.toDateString())
          deadlines.push({s,n,isDone:n<=done,isLate:n>done&&dl<now});
      }
    });

    // 時間割科目（0=日は緊急枠、1-6=月-土）
    const ttIdx = d===0 ? -1 : d-1;
    const ttSubs = d===0 ? getSundayUrgentSubjects(semId)
      : subjects.filter(s=>getTimetableDay(s.code,semId)===ttIdx);

    const cell=document.createElement('div');
    cell.className='week-cell'+(isToday?' is-today':'');
    cell.style.cursor='pointer';
    cell.style.webkitTapHighlightColor='transparent';

    const dlDots=deadlines.slice(0,2).map(({isDone,isLate})=>{
      const col=isDone?'var(--green)':isLate?'var(--red)':'var(--amber)';
      return '<div class="week-subject-dot" style="background:'+col+'"></div>';
    }).join('');
    const ttDots=ttSubs.slice(0,1).map(()=>'<div class="week-subject-dot" style="background:#60a5fa;opacity:0.8"></div>').join('');
    const total=deadlines.length+ttSubs.length;

    cell.innerHTML='<div class="week-day-label">'+LABELS[d]+'</div>'
      +'<div style="font-size:12px;font-weight:'+(isToday?'700':'400')+';color:'+(isToday?'var(--amber)':'var(--text2)')+'">'+date.getDate()+'</div>'
      +'<div style="display:flex;gap:2px;min-height:8px;flex-wrap:wrap;justify-content:center">'+dlDots+ttDots+'</div>'
      +(total>0?'<div style="font-size:8px;color:var(--text3);margin-top:1px">'+total+'件</div>':'');

    const snapD=d, snapDate=new Date(date), snapDL=[...deadlines], snapTT=[...ttSubs], snapToday=isToday;
    cell.addEventListener('click', () => {
      if (openDay===snapD) { panel.style.display='none'; openDay=-1; return; }
      openDay=snapD;
      const dateStr=snapDate.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
      let html='<div style="font-size:11px;font-weight:700;color:'+(snapToday?'var(--amber)':'var(--text2)')+';margin-bottom:8px">'+dateStr+'</div>';
      if (!snapDL.length && !snapTT.length) {
        html+='<div style="font-size:12px;color:var(--text3)">予定なし</div>';
      }
      snapDL.forEach(function(item){
        const col=getCategoryColor(item.s.category);
        const icon=item.isDone?'✅':item.isLate?'🔴':'⏰';
        const ic=item.isDone?col:item.isLate?'var(--red)':'var(--amber)';
        html+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)">'
          +'<div style="width:6px;height:6px;border-radius:50%;background:'+col+';flex-shrink:0"></div>'
          +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:12px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+item.s.name+'</div>'
          +'<div style="font-size:10px;color:var(--text3)">コマ'+item.n+' ・ 締切 12:00</div>'
          +'</div><span style="font-size:13px;color:'+ic+'">'+icon+'</span></div>';
      });
      snapTT.forEach(function(s){
        const col=getCategoryColor(s.category);
        const done=Math.floor(getCompletedLessons(s.code)/CPL);
        const next=done+1;
        const h=s.deadline_type==='専門'?1.5:1;
        const urgTag=snapD===0?'<span style="font-size:9px;background:var(--red-dim);color:var(--red);padding:1px 5px;border-radius:99px;margin-left:4px">緊急</span>':'';
        html+='<div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dashed var(--border)">'
          +'<div style="width:6px;height:6px;border-radius:50%;background:'+col+';flex-shrink:0;opacity:0.7"></div>'
          +'<div style="flex:1;min-width:0">'
          +'<div style="font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+s.name+urgTag+'</div>'
          +'<div style="font-size:10px;color:var(--text3)">📚 受講予定 コマ'+next+' ・ 約'+h+'h</div>'
          +'</div><span style="font-size:10px;color:#60a5fa">予定</span></div>';
      });
      panel.innerHTML=html;
      panel.style.display='block';
    });

    el.appendChild(cell);
  }
}


// ============================================================
// 先取りおすすめ
// ============================================================
function renderAdvance(subjects, sem, semId) {
  const el=document.getElementById('today-advance');
  if (!el) return;
  const now=new Date();
  const advances=[];
  subjects.forEach(s=>{
    const doneCh=getCompletedLessons(s.code), doneLes=Math.floor(doneCh/CPL);
    const late=Math.max(0,getTodayTarget(s,sem)-doneLes), rec=getTodayRecommended(s,sem);
    if (late>0||rec>doneLes||doneLes>=s.lessons) return;
    const next=doneLes+1;
    if (!isLessonAvailable(next,s,sem)) return;
    const nextDL=getLessonDeadline(next,s,sem), days=Math.ceil((nextDL-now)/86400000);
    if (days<7) return;
    advances.push({s,doneCh,doneLes,next,nextDL,days,rec});
  });
  if (!advances.length) { el.innerHTML=`<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">先取りに余裕のある科目はありません</div>`; return; }
  advances.sort((a,b)=>a.days-b.days);
  el.innerHTML=advances.slice(0,5).map(({s,doneCh,doneLes,next,nextDL,days,rec})=>{
    const color=getCategoryColor(s.category);
    const dateStr=nextDL.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
    const lc=days<=14?'var(--amber)':'var(--green)';
    const pct=Math.round(doneCh/(s.lessons*CPL)*100);
    const ttDay=getTimetableDay(s.code,semId);
    const dayTag=ttDay!==undefined?`<span style="font-size:10px;color:#60a5fa">📅${['月','火','水','木','金','土'][ttDay]}曜</span>`:'';
    return `<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name} ${dayTag}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${next}〜 ・ 次の締切 ${dateStr} ・ ${pct}%完了</div>
      </div>
      <span style="font-size:11px;font-weight:700;color:${lc};flex-shrink:0">あと${days}日</span>
    </div>`;
  }).join('');
}

// ============================================================
// 迫っている締切
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
    if(isLate)       {ls='color:var(--red)';  lt='遅刻中';          rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=3) {ls='color:var(--red)';  lt=`あと${days}日`;   rs='border-left:3px solid var(--red);padding-left:10px';}
    else if(days<=7) {ls='color:var(--amber)';lt=`あと${days}日`;   rs='border-left:3px solid var(--amber);padding-left:10px';}
    else             {ls='color:var(--text3)';lt=`あと${days}日`;   rs='border-left:3px solid var(--border);padding-left:10px';}
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
