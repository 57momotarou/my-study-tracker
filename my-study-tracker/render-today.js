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
// TODAY 時間割カード（今日の曜日に割り当てられた科目を表示）
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

  const today    = new Date();
  const todayDow = today.getDay(); // 0=日, 1=月, ..., 6=土
  // DAY_NAMESはapp.jsで定義（0=日,1=月,...,6=土）
  // 時間割のインデックスは 0=月〜5=土（日曜はなし）
  // todayDow 1=月→ttIdx=0, 2=火→1, ..., 6=土→5, 0=日→なし

  // 今日やるべき科目（優先度順）
  const now = new Date();
  const withPriority = subjects.map(s => {
    const doneCh  = getCompletedLessons(s.code);
    const doneLes = Math.floor(doneCh/CPL);
    const target  = getTodayTarget(s,sem);
    const rec     = getTodayRecommended(s,sem);
    const late    = Math.max(0,target-doneLes);
    const need    = Math.max(0,rec-doneLes);
    // 時間割の曜日（0=月〜5=土、undefined=未配置）
    const ttDay   = getTimetableDay(s.code, semId); // 0-5
    // 今日が割り当て曜日か（todayDow 1-6 → ttDay 0-5）
    const isToday = ttDay !== undefined && ttDay === (todayDow - 1);
    return {s, doneCh, doneLes, rec, late, need, isToday};
  }).filter(i => i.late>0 || i.need>0)
    .sort((a,b) => b.late-a.late || (b.isToday?1:0)-(a.isToday?1:0) || b.need-a.need);

  if (!withPriority.length) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の出席認定はすべてOK！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  ttEl.innerHTML = `<div style="font-size:11px;color:var(--text3);margin-bottom:10px">📋 今日やること（タップして章を管理できます）</div>`;

  withPriority.forEach(({s, doneCh, doneLes, rec, late, need, isToday}) => {
    const color = getCategoryColor(s.category);
    const pct   = Math.round(doneCh/(s.lessons*CPL)*100);
    let goalL, goalCh, goalLabel, goalColor, badgeText, badgeClass;
    if (late>0) {
      const next=doneCh+1;
      goalL=Math.ceil(next/CPL); goalCh=((next-1)%CPL)+1;
      goalLabel='今すぐ取り掛かろう'; goalColor='var(--red)';
      badgeText=`🔴 ${late}コマ遅刻中`; badgeClass='badge-danger';
    } else {
      goalL=rec; goalCh=CPL;
      goalLabel='今週中にここまでで出席認定OK'; goalColor='var(--amber)';
      badgeText=`🟡 今週あと${need}コマ`; badgeClass='badge-warn';
    }
    const done    = doneCh>=(goalL-1)*CPL+goalCh;
    const inLes   = doneCh%CPL;
    const nowLbl  = inLes>0?`コマ${doneLes+1} 第${inLes}章まで完了`:doneLes>0?`コマ${doneLes} 完了`:'未受講';
    const todayMark = isToday ? `<span style="font-size:10px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;margin-left:4px;font-weight:700">今日</span>` : '';

    // 章グリッド（inline onclick）
    let btnHtml = '<div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:10px">';
    for (let lesson=1; lesson<=s.lessons; lesson++) {
      const lateL = isLessonLate(lesson,s,sem);
      const weekL = lesson<=rec && lesson>doneLes;
      const notYet= !isLessonAvailable(lesson,s,sem);
      btnHtml += '<div style="display:flex;gap:2px;background:var(--bg3);border-radius:5px;padding:2px;">';
      for (let ch=1; ch<=CPL; ch++) {
        const chNum = (lesson-1)*CPL+ch;
        const isDone    = chNum<=doneCh;
        const isLateC   = !isDone&&lateL;
        const isWeekC   = !isDone&&!isLateC&&weekL;
        const isNotYet  = !isDone&&!isLateC&&!isWeekC&&notYet;
        let st='';
        if (isDone)       st='background:'+color+';color:#000';
        else if(isLateC)  st='background:var(--red-dim);color:var(--red);border:1px solid var(--red)';
        else if(isWeekC)  st='background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)';
        else if(isNotYet) st='background:#0d1220;color:#252e42;'+(ch===1&&lesson>1?'box-shadow:-2px 0 0 0 #0a0e1a;':'');
        btnHtml+=`<button class="lesson-btn${isDone?' done':''}" onclick="toggleChapter('${s.code}',${chNum},${semId})" style="${st}" title="コマ${lesson} 第${ch}章">${lesson}-${ch}</button>`;
      }
      btnHtml += '</div>';
    }
    btnHtml+='</div>';

    ttEl.innerHTML += `
      <div class="today-subject-card" style="border-left:3px solid ${color}">
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
          <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
            <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
            <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
            ${todayMark}
          </div>
          <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
        </div>
        <div class="today-goal-box" style="border-color:${goalColor};background:${goalColor}18;margin-bottom:10px">
          <div style="font-size:10px;letter-spacing:1.5px;color:${goalColor};font-family:'Space Mono',monospace;font-weight:700;margin-bottom:6px">TODAY'S GOAL</div>
          ${done?`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">✅</span>
            <div><div style="font-size:15px;font-weight:700;color:var(--green)">今日の目標達成！</div>
            <div style="font-size:11px;color:var(--text3);margin-top:2px">余裕があれば先取りしましょう</div></div></div>`
          :`<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
            <span style="font-size:13px;color:var(--text2)">コマ</span>
            <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalL}</span>
            <span style="font-size:13px;color:var(--text2)">の 第</span>
            <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalCh}</span>
            <span style="font-size:13px;color:var(--text2)">章まで</span></div>
            <div style="font-size:11px;color:${goalColor};margin-top:4px;font-weight:600">${goalLabel}</div>`}
        </div>
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
          <span style="font-size:11px;color:var(--text3)">現在：${nowLbl}</span>
          <span style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}">${pct}%</span>
        </div>
        <div class="prog-wrap" style="margin-bottom:0"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>
        ${btnHtml}
        <div style="display:flex;gap:10px;margin-top:6px;font-size:10px;color:var(--text3)">
          <span><span style="color:${color}">■</span> 完了</span>
          <span><span style="color:var(--red)">■</span> 遅刻</span>
          <span><span style="color:var(--amber)">■</span> 今週</span>
          <span style="opacity:0.4">■ 未開講</span>
        </div>
      </div>`;
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
