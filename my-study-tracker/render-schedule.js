// ============================================================
// my-study-tracker - render-schedule.js
// スケジュールタブ（週/月）
// ============================================================

let scheduleView        = 'week';
let scheduleMonthOffset = 0;

function renderSchedulePage() {
  const sem      = getCurrentSemester();
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);

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
// 週表示：締切のみ
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

    const isKimatsuDay=kimatsuDate&&kimatsuDate.toDateString()===date.toDateString();
    const dayEl=document.createElement('div');
    dayEl.style.cssText=`background:${isToday?'var(--amber-dim)':isPast?'rgba(17,24,39,0.4)':'var(--bg2)'};border:1px solid ${isToday?'var(--amber)':'var(--border)'};border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px;opacity:${isPast?'0.65':'1'}`;

    const dateLabel=date.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'});
    const todayBadge=isToday?`<span style="font-size:9px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;margin-left:auto;font-weight:700">TODAY</span>`:'';
    const cnt=(deadlines.length||0)+(isKimatsuDay?1:0);
    const cntBadge=!isToday&&cnt?`<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:auto">${cnt}件</span>`:'';

    let rows='';
    if (isKimatsuDay) rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--purple-dim);border-radius:5px;margin-bottom:3px"><span style="font-size:13px">📝</span><div><div style="font-size:12px;font-weight:700;color:var(--purple)">期末試験 締切</div><div style="font-size:10px;color:var(--text3)">専門・順次開講 ・ 12:00</div></div></div>`;
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
// 月表示：締切・期末のみ
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
  let html=`<div style="overflow:hidden;width:100%;box-sizing:border-box"><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px;margin-bottom:4px">
    ${DOW.map((d,i)=>`<div style="text-align:center;font-size:10px;padding:3px 0;font-weight:600;color:${i===0?'#ef4444':i===6?'#60a5fa':'var(--text3)'}">${d}</div>`).join('')}
  </div><div style="display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:1px">`;

  for (let i=0;i<firstDow;i++) html+=`<div></div>`;

  for (let day=1;day<=daysInMonth;day++) {
    const date=new Date(year,month,day);
    const dow=date.getDay();
    const isToday=date.toDateString()===now.toDateString();
    const isPast=date<new Date(now.getFullYear(),now.getMonth(),now.getDate())&&!isToday;
    const dlItems=dlMap[day]||[];
    const isKimatsu=kimatsuDate&&kimatsuDate.getFullYear()===year&&kimatsuDate.getMonth()===month&&kimatsuDate.getDate()===day;

    const hasLate=dlItems.some(i=>i.isLate), hasPend=dlItems.some(i=>!i.isDone&&!i.isLate), hasDone=dlItems.some(i=>i.isDone);
    let dotColor='';
    if(hasLate) dotColor='var(--red)';
    else if(hasPend) dotColor='var(--amber)';
    else if(hasDone) dotColor='var(--green)';

    const labels=[
      ...dlItems.slice(0,2).map(({s,isDone,isLate})=>{
        const c=isDone?'var(--green)':isLate?'var(--red)':'var(--amber)';
        const bg=isDone?'rgba(16,185,129,0.12)':isLate?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)';
        const short=s.name.length>5?s.name.slice(0,4)+'…':s.name;
        return `<div style="font-size:8px;color:${c};background:${bg};border-radius:3px;padding:1px 3px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:100%">${short}</div>`;
      }),
    ];
    const more=dlItems.length>2?`<div style="font-size:8px;color:var(--text3)">+${dlItems.length-2}</div>`:'';
    const kimatsuLabel=isKimatsu?`<div style="font-size:8px;color:var(--purple);background:var(--purple-dim);border-radius:3px;padding:1px 3px">📝期末</div>`:'';

    const dayColor=isToday?'var(--amber)':dow===0?'#ef4444':dow===6?'#60a5fa':isPast?'var(--text3)':'var(--text2)';
    const hasContent=dlItems.length>0||isKimatsu;

    const tapData=encodeURIComponent(JSON.stringify({
      date:`${year}/${month+1}/${day}`,
      deadlines:dlItems.map(i=>({name:i.s.name,n:i.n,isDone:i.isDone,isLate:i.isLate,cat:i.s.category})),
      kimatsu:isKimatsu,
    }));

    html+=`<div onclick="${hasContent?`showDayDetail('${tapData}')`:''}"
      style="min-height:44px;border-radius:4px;padding:2px 3px;overflow:hidden;
        background:${isToday?'var(--amber-dim)':isKimatsu?'var(--purple-dim)':hasContent?'var(--bg3)':'transparent'};
        border:1px solid ${isToday?'var(--amber)':isKimatsu?'var(--purple)':hasContent?'var(--border)':'transparent'};
        display:flex;flex-direction:column;gap:1px;
        cursor:${hasContent?'pointer':'default'};opacity:${isPast&&!hasContent?'0.35':'1'}">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:10px;font-weight:${isToday?'700':'500'};color:${dayColor}">${day}</span>
        ${dotColor?`<div style="width:4px;height:4px;border-radius:50%;background:${dotColor}"></div>`:''}
      </div>
      ${labels.join('')}${more}${kimatsuLabel}
    </div>`;
  }

  html+=`</div></div>
  <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">
    <span><span style="color:var(--amber)">■</span>締切(未)</span>
    <span><span style="color:var(--red)">■</span>遅刻</span>
    <span><span style="color:var(--green)">■</span>完了</span>
    <span>📝期末</span>
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
