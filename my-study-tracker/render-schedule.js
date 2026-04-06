// ============================================================
// my-study-tracker - render-schedule.js
// スケジュールタブ（週/月）＋時間割統合
// ============================================================

let scheduleView        = 'week';
let scheduleMonthOffset = 0;

function renderSchedulePage() {
  const sem      = getCurrentSemester();
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);

  // 自動配置（未配置なら実行）
  ensureAutoTimetable(semId);

  // 時間割設定バナー
  renderTimetableBanner(subjects, semId);

  document.getElementById('schedule-view-week').classList.toggle('active', scheduleView==='week');
  document.getElementById('schedule-view-month').classList.toggle('active', scheduleView==='month');

  if (scheduleView === 'week') {
    document.getElementById('schedule-month-nav').style.display = 'none';
    document.getElementById('schedule-week').style.display  = 'block';
    document.getElementById('schedule-month').style.display = 'none';
    renderWeekSchedule(subjects, sem, semId);
  } else {
    document.getElementById('schedule-month-nav').style.display = 'flex';
    document.getElementById('schedule-week').style.display  = 'none';
    document.getElementById('schedule-month').style.display = 'block';
    renderMonthSchedule(subjects, sem, semId);
  }
}

// ============================================================
// 時間割設定バナー（曜日変更UI）
// ============================================================
function renderTimetableBanner(subjects, semId) {
  const el = document.getElementById('timetable-banner');
  if (!el) return;

  const tt    = loadTimetable();
  const ttSem = tt[semId] || {};

  const card = document.createElement('div');
  card.className = 'card';
  card.style.marginBottom = '12px';
  card.innerHTML = `<div class="card-label">TIMETABLE</div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
      <div class="card-title" style="margin-bottom:0">時間割</div>
      <button onclick="resetTimetable(${semId})" style="font-size:10px;background:var(--bg3);border:1px solid var(--border);color:var(--text3);padding:3px 8px;border-radius:99px;cursor:pointer;font-family:'Noto Sans JP',sans-serif">リセット</button>
    </div>
    <div style="font-size:11px;color:var(--text3);margin-bottom:10px">📌 科目名をタップして曜日を変更できます</div>`;

  // 週間時間割グリッド
  const DAYS = ['月','火','水','木','金','土','日'];
  const dayBuckets = [[],[],[],[],[],[],[]];
  subjects.forEach(s => {
    const d = getTimetableDay(s.code, semId);
    if (d !== undefined && d >= 0 && d <= 5) dayBuckets[d].push(s);
  });
  // 日曜は緊急枠（遅刻中科目）
  getSundayUrgentSubjects(semId).forEach(s => {
    if (!dayBuckets[6].find(x=>x.code===s.code)) dayBuckets[6].push(s);
  });

  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:8px;overflow:hidden;width:100%;box-sizing:border-box';

  // 曜日ヘッダー
  DAYS.forEach((d,i) => {
    const h=document.createElement('div');
    const isSun=i===6;
    h.style.cssText='text-align:center;font-size:9px;font-weight:700;color:'+(isSun?'var(--red)':'var(--text3)')+';padding:2px 0';
    h.textContent=d+(isSun?'⚡':'');
    grid.appendChild(h);
  });

  // 各曜日の科目
  const maxRows = Math.max(1, ...dayBuckets.map(b=>b.length));
  for (let row=0; row<maxRows; row++) {
    DAYS.forEach((_d,di) => {
      const s = dayBuckets[di][row];
      const cell = document.createElement('div');
      if (s) {
        const color = getCategoryColor(s.category);
        const h     = s.deadline_type==='専門'?1.5:1;
        cell.style.cssText=`background:${color}22;border:1px solid ${color}66;border-radius:5px;padding:3px 2px;cursor:pointer;min-height:40px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;-webkit-tap-highlight-color:transparent;overflow:hidden;box-sizing:border-box`;
        cell.innerHTML=`<div style="font-size:7px;font-weight:700;color:${color};line-height:1.3;overflow:hidden;text-overflow:ellipsis;width:100%;text-align:center;white-space:nowrap;padding:0 2px">${s.name.length>6?s.name.slice(0,5)+'…':s.name}</div><div style="font-size:6px;color:var(--text3);margin-top:1px">${h}h</div>`;
        cell.addEventListener('click', ()=>showDayPicker(s.code, s.name, semId, s.deadline_type));
      } else {
        cell.style.cssText='min-height:40px;border:1px dashed var(--border);border-radius:5px;opacity:0.2;box-sizing:border-box';
      }
      grid.appendChild(cell);
    });
  }
  card.appendChild(grid);

  // 週間合計時間
  const totalH = subjects.reduce((a,s)=>{
    const d=getTimetableDay(s.code,semId);
    return d!==undefined ? a+(s.deadline_type==='専門'?1.5:1) : a;
  }, 0);
  const note = document.createElement('div');
  note.style.cssText='font-size:11px;color:var(--text3)';
  note.textContent=`週間学習目安：約${totalH}時間`;
  card.appendChild(note);

  el.innerHTML='';
  el.appendChild(card);
}

function resetTimetable(semId) {
  const tt=loadTimetable();
  delete tt[semId];
  saveTimetable(tt);
  ensureAutoTimetable(semId);
  renderSchedulePage();
}

// 曜日変更ピッカー
function showDayPicker(code, name, semId, deadlineType) {
  const existing=document.getElementById('day-picker-modal');
  if (existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='day-picker-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom)';
  const DAYS=['月','火','水','木','金','土'];
  const current=getTimetableDay(code,semId);
  const rec=deadlineType==='専門'?3:1; // 専門→木(3), 教養外国語→火(1)
  let rows=DAYS.map((d,i)=>`<button onclick="assignDay('${code}',${semId},${i})" style="width:100%;padding:12px 16px;border:none;border-bottom:1px solid var(--border);background:${current===i?'var(--amber-dim)':'transparent'};color:${current===i?'var(--amber)':'var(--text2)'};font-size:14px;font-weight:${current===i?'700':'400'};font-family:'Noto Sans JP',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:space-between;-webkit-tap-highlight-color:transparent">
    <span>${d}曜日</span>
    <span style="font-size:11px;display:flex;gap:4px">
      ${i===rec?`<span style="background:var(--amber);color:#000;padding:2px 6px;border-radius:99px;font-size:10px">推奨</span>`:''}
      ${current===i?`<span style="color:var(--amber)">✓</span>`:''}
    </span></button>`).join('');
  modal.innerHTML=`<div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:70vh;overflow-y:auto">
    <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
      <div>
        <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px">ASSIGN DAY</div>
        <div style="font-size:15px;font-weight:700;margin-top:2px">${name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:2px">${deadlineType==='専門'?'専門→木曜締切':'教養外国語→火曜締切'}</div>
      </div>
      <button onclick="document.getElementById('day-picker-modal').remove()" style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
    </div>
    ${rows}
    <button onclick="assignDay('${code}',${semId},-1)" style="width:100%;padding:12px 16px;border:none;background:transparent;color:var(--red);font-size:13px;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent">
      🗑 配置を削除
    </button>
  </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}

function assignDay(code, semId, dayIdx) {
  const tt=loadTimetable();
  if (!tt[semId]) tt[semId]={};
  if (dayIdx===-1) delete tt[semId][code];
  else tt[semId][code]=dayIdx;
  saveTimetable(tt);
  document.getElementById('day-picker-modal')?.remove();
  renderSchedulePage();
  renderToday();
}

// ============================================================
// 週表示：締切 + 時間割（受講推奨日）
// ============================================================
function renderWeekSchedule(subjects, sem, semId) {
  const now=new Date(), todayDow=now.getDay();
  const DOW=['日','月','火','水','木','金','土'];
  const el=document.getElementById('schedule-week');
  el.innerHTML='';
  const kimatsuDate=getKimatsuDate(sem);

  for (let d=0;d<7;d++) {
    const date=new Date(now); date.setDate(now.getDate()-todayDow+d); date.setHours(0,0,0,0);
    const isToday=d===todayDow;
    const isPast=date<new Date(now.getFullYear(),now.getMonth(),now.getDate())&&!isToday;

    // 締切コマ
    const deadlines=[];
    subjects.forEach(s=>{
      const done=Math.floor(getCompletedLessons(s.code)/4);
      for (let n=1;n<=s.lessons;n++) {
        const dl=getLessonDeadline(n,s,sem);
        if (dl.toDateString()===date.toDateString())
          deadlines.push({s,n,isDone:n<=done,isLate:n>done&&dl<now});
      }
    });

    // 時間割：この曜日の科目（月=1→ttIdx=0,…,土=6→ttIdx=5,日=0→緊急枠）
    const ttIdx=d===0?-1:d-1;
    const ttSubjects=d===0?getSundayUrgentSubjects(semId)
      :(ttIdx>=0?subjects.filter(s=>getTimetableDay(s.code,semId)===ttIdx):[]);

    const isKimatsuDay=kimatsuDate&&kimatsuDate.toDateString()===date.toDateString();
    const dayEl=document.createElement('div');
    dayEl.style.cssText=`background:${isToday?'var(--amber-dim)':isPast?'rgba(17,24,39,0.4)':'var(--bg2)'};border:1px solid ${isToday?'var(--amber)':'var(--border)'};border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px;opacity:${isPast?'0.65':'1'}`;

    const dateLabel=date.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'});
    const todayBadge=isToday?`<span style="font-size:9px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;margin-left:auto;font-weight:700">TODAY</span>`:'';
    const cnt=(deadlines.length||0)+(ttSubjects.length||0)+(isKimatsuDay?1:0);
    const cntBadge=!isToday&&cnt?`<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:auto">${cnt}件</span>`:'';

    let rows='';
    if (isKimatsuDay) rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--purple-dim);border-radius:5px;margin-bottom:3px"><span style="font-size:13px">📝</span><div><div style="font-size:12px;font-weight:700;color:var(--purple)">期末試験 締切</div><div style="font-size:10px;color:var(--text3)">専門・順次開講 ・ 12:00</div></div></div>`;
    // 締切コマ
    deadlines.forEach(({s,n,isDone,isLate})=>{
      const c=getCategoryColor(s.category);
      const icon=isDone?'✅':isLate?'🔴':'⏰';
      const ic=isDone?c:isLate?'var(--red)':'var(--amber)';
      rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--border)">
        <div style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0"></div>
        <div style="flex:1;min-width:0"><div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:10px;color:var(--text3)">コマ${n} ・ 12:00締切</div></div>
        <span style="font-size:13px;color:${ic}">${icon}</span></div>`;
    });
    // 時間割（今日受講予定）
    ttSubjects.forEach(s=>{
      const c=getCategoryColor(s.category);
      const done=Math.floor(getCompletedLessons(s.code)/4);
      const next=done+1;
      const h=s.deadline_type==='専門'?1.5:1;
      rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px dashed var(--border)">
        <div style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0;opacity:0.7"></div>
        <div style="flex:1;min-width:0"><div style="font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:10px;color:var(--text3)">📚 受講予定 コマ${next} ・ 約${h}h</div></div>
        <span style="font-size:10px;color:#60a5fa">予定</span></div>`;
    });
    if (!rows) rows=`<div style="font-size:11px;color:var(--text3);padding:2px 0">予定なし</div>`;

    dayEl.innerHTML=`<div style="display:flex;align-items:center;gap:6px;margin-bottom:${cnt?'8px':'2px'}">
      <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:${isToday?'var(--amber)':isPast?'var(--text3)':'var(--text2)'}">${DOW[d]}</span>
      <span style="font-size:13px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--amber)':isPast?'var(--text3)':'var(--text2)'}">${dateLabel}</span>
      ${todayBadge}${cntBadge}</div>${rows}`;
    el.appendChild(dayEl);
  }
}

// 期末試験日取得
function getKimatsuDate(sem) {
  if (sem.attendance?.senmon_jyunji?.[16]) {
    const e=sem.attendance.senmon_jyunji[16];
    return new Date(typeof e==='string'?e:e.end);
  }
  return null;
}

// ============================================================
// 月表示：締切・時間割・受講推奨・期末
// ============================================================
function renderMonthSchedule(subjects, sem, semId) {
  const now=new Date();
  const base=new Date(now.getFullYear(),now.getMonth()+scheduleMonthOffset,1);
  const year=base.getFullYear(), month=base.getMonth();
  document.getElementById('schedule-month-label').textContent=`${year}年${month+1}月`;
  const firstDow=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const DOW=['日','月','火','水','木','金','土'];
  const kimatsuDate=getKimatsuDate(sem);

  // 締切マップ
  const dlMap={};
  subjects.forEach(s=>{
    const done=Math.floor(getCompletedLessons(s.code)/4);
    for (let n=1;n<=s.lessons;n++) {
      const dl=getLessonDeadline(n,s,sem);
      if (dl.getFullYear()===year&&dl.getMonth()===month) {
        const k=dl.getDate();
        if (!dlMap[k]) dlMap[k]=[];
        dlMap[k].push({s,n,isDone:n<=done,isLate:n>done&&dl<now});
      }
    }
  });

  const el=document.getElementById('schedule-month');
  let html=`<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
    ${DOW.map((d,i)=>`<div style="text-align:center;font-size:10px;padding:3px 0;font-weight:600;color:${i===0?'#ef4444':i===6?'#60a5fa':'var(--text3)'}">${d}</div>`).join('')}
  </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;

  for (let i=0;i<firstDow;i++) html+=`<div></div>`;

  for (let day=1;day<=daysInMonth;day++) {
    const date=new Date(year,month,day);
    const dow=date.getDay();
    const isToday=date.toDateString()===now.toDateString();
    const isPast=date<new Date(now.getFullYear(),now.getMonth(),now.getDate())&&!isToday;
    const dlItems=dlMap[day]||[];
    const isKimatsu=kimatsuDate&&kimatsuDate.getFullYear()===year&&kimatsuDate.getMonth()===month&&kimatsuDate.getDate()===day;

    // この曜日に割り当てられた科目（月=1→0,…,土=6→5, 日=0→緊急枠）
    // 学期開始日より前は時間割科目を表示しない
    const semStartDate = sem.start ? new Date(sem.start) : null;
    const isBeforeSemStart = semStartDate && date < semStartDate;
    const ttIdx=dow===0?-1:dow-1;
    const ttSubs=isBeforeSemStart?[]:dow===0?getSundayUrgentSubjects(semId)
      :(ttIdx>=0?subjects.filter(s=>getTimetableDay(s.code,semId)===ttIdx):[]);

    const hasLate=dlItems.some(i=>i.isLate), hasPend=dlItems.some(i=>!i.isDone&&!i.isLate), hasDone=dlItems.some(i=>i.isDone);
    let dotColor='';
    if(hasLate) dotColor='var(--red)';
    else if(hasPend) dotColor='var(--amber)';
    else if(hasDone) dotColor='var(--green)';

    // ラベル（締切優先）
    const labels=[
      ...dlItems.slice(0,2).map(({s,isDone,isLate})=>{
        const c=isDone?'var(--green)':isLate?'var(--red)':'var(--amber)';
        const bg=isDone?'rgba(16,185,129,0.12)':isLate?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)';
        const short=s.name.length>5?s.name.slice(0,4)+'…':s.name;
        return `<div style="font-size:8px;color:${c};background:${bg};border-radius:3px;padding:1px 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">${short}</div>`;
      }),
      // 締切がない日は時間割科目を表示
      ...(!hasLate&&!hasPend&&ttSubs.length?ttSubs.slice(0,1).map(s=>{
        const c=getCategoryColor(s.category);
        const short=s.name.length>5?s.name.slice(0,4)+'…':s.name;
        return `<div style="font-size:8px;color:${c};background:${c}15;border-radius:3px;padding:1px 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">📚${short}</div>`;
      }):[]),
    ];
    const more=(dlItems.length+ttSubs.length)>2?`<div style="font-size:8px;color:var(--text3)">+${dlItems.length+ttSubs.length-2}</div>`:'';
    const kimatsuLabel=isKimatsu?`<div style="font-size:8px;color:var(--purple);background:var(--purple-dim);border-radius:3px;padding:1px 3px">📝期末</div>`:'';

    const dayColor=isToday?'var(--amber)':dow===0?'#ef4444':dow===6?'#60a5fa':isPast?'var(--text3)':'var(--text2)';
    const hasContent=dlItems.length>0||ttSubs.length>0||isKimatsu;

    const tapData=encodeURIComponent(JSON.stringify({
      date:`${year}/${month+1}/${day}`,
      deadlines:dlItems.map(i=>({name:i.s.name,n:i.n,isDone:i.isDone,isLate:i.isLate,cat:i.s.category})),
      timetable:ttSubs.map(s=>({name:s.name,cat:s.category,hours:s.deadline_type==='専門'?1.5:1})),
      kimatsu:isKimatsu,
    }));

    html+=`<div onclick="${hasContent?`showDayDetail('${tapData}')`:''}"
      style="min-height:54px;border-radius:6px;padding:3px 4px;box-sizing:border-box;width:100%;overflow:hidden;
        background:${isToday?'var(--amber-dim)':isKimatsu?'var(--purple-dim)':hasContent?'var(--bg3)':'transparent'};
        border:1px solid ${isToday?'var(--amber)':isKimatsu?'var(--purple)':hasContent?'var(--border)':'transparent'};
        display:flex;flex-direction:column;gap:2px;
        cursor:${hasContent?'pointer':'default'};opacity:${isPast&&!hasContent?'0.35':'1'}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;font-weight:${isToday?'700':'500'};color:${dayColor}">${day}</span>
        ${dotColor?`<div style="width:4px;height:4px;border-radius:50%;background:${dotColor}"></div>`:''}
      </div>
      ${labels.join('')}${more}${kimatsuLabel}
    </div>`;
  }

  html+=`</div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">
    <span><span style="color:var(--amber)">■</span>締切(未)</span>
    <span><span style="color:var(--red)">■</span>遅刻</span>
    <span><span style="color:var(--green)">■</span>完了</span>
    <span>📚受講予定</span><span>📝期末</span>
    <span style="margin-left:auto">タップで詳細</span>
  </div>`;
  el.innerHTML=html;
}

// ============================================================
// 日付タップ詳細モーダル
// ============================================================
function showDayDetail(dataJson) {
  const data=JSON.parse(decodeURIComponent(dataJson));
  const existing=document.getElementById('day-detail-modal');
  if (existing) existing.remove();
  const modal=document.createElement('div');
  modal.id='day-detail-modal';
  modal.style.cssText='position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom)';

  let content='';
  if (data.kimatsu) content+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)"><span style="font-size:20px">📝</span><div><div style="font-size:13px;font-weight:700;color:var(--purple)">期末試験 締切日</div><div style="font-size:11px;color:var(--text3)">専門・順次開講科目 ・ 12:00まで</div></div></div>`;

  (data.deadlines||[]).forEach(({name,n,isDone,isLate,cat})=>{
    const color=(CATEGORY_CONFIG[cat]||{}).color||'#64748b';
    const status=isDone?`<span style="color:var(--green)">✅ 完了</span>`:isLate?`<span style="color:var(--red)">🔴 遅刻中</span>`:`<span style="color:var(--amber)">⏰ 要受講</span>`;
    content+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500">${name}</div>
      <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 締切 12:00</div></div>${status}</div>`;
  });

  (data.timetable||[]).forEach(({name,cat,hours})=>{
    const color=(CATEGORY_CONFIG[cat]||{}).color||'#64748b';
    content+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};opacity:0.7;flex-shrink:0"></div>
      <div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:500;color:var(--text2)">${name}</div>
      <div style="font-size:11px;color:var(--text3)">受講予定 ・ 約${hours}時間</div></div>
      <span style="font-size:11px;color:#60a5fa">📚予定</span></div>`;
  });

  modal.innerHTML=`<div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:70vh;overflow-y:auto;padding:20px 16px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
      <div>
        <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px">SCHEDULE</div>
        <div style="font-size:15px;font-weight:700;margin-top:2px">${data.date}</div>
      </div>
      <button onclick="document.getElementById('day-detail-modal').remove()" style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
    </div>
    ${content||'<div style="color:var(--text3);font-size:13px;text-align:center;padding:16px">この日の予定はありません</div>'}
  </div>`;
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.body.appendChild(modal);
}

// 旧互換
function showDayDeadlines(dateLabel, itemsJson, isKimatsu) {
  const items=JSON.parse(decodeURIComponent(itemsJson));
  showDayDetail(encodeURIComponent(JSON.stringify({date:dateLabel,deadlines:items,timetable:[],kimatsu:!!isKimatsu})));
}
