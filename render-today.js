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
  const alertRows = [];
  subjects.forEach(s => {
    const done = Math.floor(getCompletedLessons(s.code)/CPL);
    const late = getTodayTarget(s,sem) - done;
    if (late>=3)      alertRows.push(`<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`);
    else if (late>=1) alertRows.push(`<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中 — 優先受講を</div>`);
  });
  alertsEl.innerHTML = alertRows.join('');

  // TODAY 時間割カード
  renderTodayTimetable(subjects, sem, semId);

  // 締切
  renderUpcoming(subjects, sem);
}

// ============================================================
// 学事アラート
// start（開始日）と date（終了日）に対応
// 状態：開始前 / 期間中 / 終了
// ============================================================
function renderExamAlerts(sem) {
  const el = document.getElementById('today-exam-alerts');
  if (!el) return;
  el.innerHTML = '';
  if (!sem.exams && !sem.seiseki) return;
  const now = new Date();

  const alerts = [];
  (sem.exams||[]).forEach(exam => {
    const end        = endOfDate(exam.date);
    const start      = exam.start ? parseDateValue(exam.start) : parseDateValue(exam.date);
    const daysToEnd  = calendarDayDiff(end, now);
    const daysToStart= calendarDayDiff(start, now);
    const isActive   = now >= start && now <= end;  // 期間中
    const isPast     = now > end;                   // 終了
    const isUpcoming = !isPast && !isActive;        // 開始前
    // 表示条件：終了3日後まで、または開始14日前から
    if (daysToEnd < -3) return;
    if (isUpcoming && daysToStart > 14) return;
    alerts.push({ label: exam.label, daysToEnd, daysToStart, isPast, isActive, isUpcoming });
  });
  if (sem.seiseki) {
    const d = parseDateValue(sem.seiseki);
    const days = calendarDayDiff(d, now);
    if (days>=-3 && days<=14) alerts.push({label:'成績発表', daysToEnd:days, isPast:days<0, isSeiseki:true});
  }
  const alertHtml = [];
  alerts.forEach(({label, daysToEnd, daysToStart, isPast, isActive, isUpcoming, isSeiseki}) => {
    const icon = isSeiseki ? '📊' : '📝';
    let bg, bd, color, txt, sub;
    if (isPast) {
      bg='var(--bg3)'; bd='var(--border)'; color='var(--text3)';
      txt=`${Math.abs(daysToEnd)}日前に終了`; sub='終了';
    } else if (isActive) {
      bg='var(--amber-dim)'; bd='var(--amber)'; color='var(--amber)';
      txt=daysToEnd===0?'今日が締切！':`締切まであと${daysToEnd}日`;
      sub='📖 期末試験期間中';
    } else {
      // 開始前
      const urgent = daysToStart <= 3;
      bg=urgent?'var(--red-dim)':'var(--bg3)';
      bd=urgent?'var(--red)':'var(--border)';
      color=urgent?'var(--red)':'var(--text3)';
      txt=daysToStart===0?'今日から開始！':`あと${daysToStart}日で開始`;
      sub='期末試験開始前';
    }
    if (isSeiseki) {
      bg='var(--bg3)'; bd='var(--border)';
      color=daysToEnd>=0?'var(--amber)':'var(--text3)';
      txt=daysToEnd<0?`${Math.abs(daysToEnd)}日前`:daysToEnd===0?'今日発表':`あと${daysToEnd}日`;
      sub=daysToEnd<0?'発表済み':'';
    }
    alertHtml.push(`<div style="display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${bd};margin-bottom:8px">
      <span style="font-size:18px">${icon}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:700;color:${color}">${label}</div>
      <div style="font-size:11px;color:var(--text3)">${sub}</div></div>
      <span style="font-size:11px;font-weight:700;color:${color};flex-shrink:0">${txt}</span></div>`);
  });
  el.innerHTML = alertHtml.join('');
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
      if (n<=done) continue;
      const dl=getLessonDeadline(n,s,sem);
      const days=calendarDayDiff(dl,now);
      if (days>14) break;
      items.push({s,n,dl,isLate:dl<now,days});
    }
  });
  let html='';
  if (sem.attendance?.senmon_jyunji?.[16]) {
    const e=sem.attendance.senmon_jyunji[16];
    const dl=parseDateValue(typeof e==='string'?e:e.end);
    const days=calendarDayDiff(dl,now);
    if (days>=-3&&days<=30) {
      const isPast=dl<now,bd=isPast?'var(--border)':days<=7?'var(--red)':'var(--amber)';
      const bg=isPast?'var(--bg3)':days<=7?'var(--red-dim)':'var(--amber-dim)';
      const tx=isPast?'var(--text3)':days<=7?'var(--red)':'var(--amber)';
      const dateStr=dl.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
      const lbl=isPast?(days===0?'本日終了':`${Math.abs(days)}日前に終了`):days===0?'今日が締切！':`あと${days}日`;
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
