// ============================================================
// my-study-tracker - render-today.js
// ============================================================
const CPL = 4;

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
    if (days>=-3 && days<=14) alerts.push({ label:exam.label, days, isPast:days<0, isUrgent:days<=3 });
  });
  if (sem.seiseki) {
    const d = new Date(sem.seiseki);
    const days = Math.ceil((d-now)/86400000);
    if (days>=-3 && days<=14) alerts.push({ label:'成績発表', days, isPast:days<0, isSeiseki:true });
  }
  alerts.forEach(({ label, days, isPast, isUrgent, isSeiseki }) => {
    const icon   = isSeiseki ? '📊' : '📝';
    const bg     = isPast ? 'var(--bg3)' : isUrgent ? 'var(--red-dim)' : 'var(--amber-dim)';
    const border = isPast ? 'var(--border)' : isUrgent ? 'var(--red)' : 'var(--amber)';
    const color  = isPast ? 'var(--text3)' : isUrgent ? 'var(--red)' : 'var(--amber)';
    const dayTxt = isPast ? `${Math.abs(days)}日前に終了`
      : days===0 ? '今日が締切！' : days===1 ? '明日が締切！' : `あと${days}日`;
    const div = document.createElement('div');
    div.style.cssText = `display:flex;align-items:center;gap:10px;padding:10px 12px;border-radius:8px;background:${bg};border:1px solid ${border};margin-bottom:8px`;
    div.innerHTML = `<span style="font-size:18px">${icon}</span>
      <div style="flex:1"><div style="font-size:13px;font-weight:700;color:${color}">${label}</div>
      <div style="font-size:11px;color:var(--text3)">${isPast?'終了':'期末試験期間'}</div></div>
      <span style="font-size:11px;font-weight:700;color:${color};flex-shrink:0">${dayTxt}</span>`;
    el.appendChild(div);
  });
}

// ============================================================
// メイン
// ============================================================
function renderToday() {
  const today    = new Date();
  const sem      = getCurrentSemester();
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);

  document.getElementById('today-date').textContent =
    today.toLocaleDateString('ja-JP',{year:'numeric',month:'long',day:'numeric',weekday:'long'});

  renderExamAlerts(sem);

  const alertsEl = document.getElementById('today-alerts');
  alertsEl.innerHTML = '';
  subjects.forEach(s => {
    const done = Math.floor(getCompletedLessons(s.code)/CPL);
    const late = getTodayTarget(s,sem)-done;
    if (late>=3)      alertsEl.innerHTML += `<div class="alert alert-danger">⚠️ <b>${s.name}</b> 遅刻${late}コマ！繰り越し優先で</div>`;
    else if (late>=1) alertsEl.innerHTML += `<div class="alert alert-warn">📌 <b>${s.name}</b> ${late}コマ遅刻中</div>`;
  });

  renderTodayCards(subjects, sem, semId);
  renderWeekStrip(subjects, sem);
  renderAdvance(subjects, sem, semId);
  renderUpcoming(subjects, sem);
}

// ============================================================
// 今日やること（科目カード）
// ============================================================
function renderTodayCards(subjects, sem, semId) {
  const ttEl = document.getElementById('today-timetable');
  ttEl.innerHTML = '';
  if (!subjects.length) {
    ttEl.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📭</div>
      <div class="empty-state-text">科目が登録されていません</div>
      <div class="empty-state-sub">「設定」タブで科目を選択してください</div></div>`;
    return;
  }
  const items = subjects.map(s => {
    const doneCh  = getCompletedLessons(s.code);
    const doneLen = Math.floor(doneCh/CPL);
    const late    = Math.max(0,getTodayTarget(s,sem)-doneLen);
    const rec     = getTodayRecommended(s,sem);
    const need    = Math.max(0,rec-doneLen);
    return { s, doneCh, doneLen, rec, late, need };
  }).filter(i=>i.late>0||i.need>0)
    .sort((a,b)=>b.late-a.late||b.need-a.need);

  if (!items.length) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の出席認定はすべてOK！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  const lbl = document.createElement('div');
  lbl.style.cssText = 'font-size:11px;color:var(--text3);margin-bottom:10px';
  lbl.innerHTML = '📋 今日やること（進捗行をタップで章管理）';
  ttEl.appendChild(lbl);
  items.forEach(item => ttEl.appendChild(buildTodayCard(item, sem, semId)));
}

function buildTodayCard({ s, doneCh, doneLen, rec, late, need }, sem, semId) {
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
  const done = doneCh>=(goalL-1)*CPL+goalCh;
  const inLes= doneCh%CPL;
  const nowLbl = inLes>0?`コマ${doneLen+1} 第${inLes}章まで完了`
    : doneLen>0?`コマ${doneLen} 完了`:'未受講';

  const card = document.createElement('div');
  card.className = 'today-subject-card';
  card.style.borderLeft = `3px solid ${color}`;

  // 科目名行＋バッジ（クリック無効エリア）
  const topEl = document.createElement('div');
  topEl.style.cssText = 'display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px';
  topEl.innerHTML = `
    <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
      <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
    </div>
    <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>`;
  card.appendChild(topEl);

  // 目標ボックス（クリック無効エリア）
  const goalEl = document.createElement('div');
  goalEl.className = 'today-goal-box';
  goalEl.style.cssText = `border-color:${goalColor};background:${goalColor}18;margin-bottom:10px`;
  goalEl.innerHTML = `<div style="font-size:10px;letter-spacing:1.5px;color:${goalColor};font-family:'Space Mono',monospace;font-weight:700;margin-bottom:6px">TODAY'S GOAL</div>
    ${done?`<div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">✅</span>
      <div><div style="font-size:15px;font-weight:700;color:var(--green)">今日の目標達成！</div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">余裕があれば先取りしましょう</div></div></div>`
    :`<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
      <span style="font-size:13px;color:var(--text2)">コマ</span>
      <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalL}</span>
      <span style="font-size:13px;color:var(--text2)">の 第</span>
      <span style="font-size:32px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalCh}</span>
      <span style="font-size:13px;color:var(--text2)">章まで</span></div>
      <div style="font-size:11px;color:${goalColor};margin-top:4px;font-weight:600">${goalLabel}</div>`}`;
  card.appendChild(goalEl);

  // ★ 進捗バー（タップで章グリッド展開）
  const iconSvg = document.createElementNS('http://www.w3.org/2000/svg','svg');
  iconSvg.setAttribute('viewBox','0 0 24 24');
  iconSvg.setAttribute('fill','none');
  iconSvg.setAttribute('stroke','currentColor');
  iconSvg.setAttribute('stroke-width','2.5');
  iconSvg.setAttribute('width','14');
  iconSvg.setAttribute('height','14');
  iconSvg.style.cssText = 'color:var(--text3);transition:transform 0.2s;pointer-events:none;flex-shrink:0';
  iconSvg.innerHTML = '<polyline points="6 9 12 15 18 9"/>';

  const toggleEl = document.createElement('div');
  toggleEl.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
      <span style="font-size:11px;color:var(--text3)">現在：${nowLbl}</span>
      <div style="display:flex;align-items:center;gap:5px">
        <span style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}">${pct}%</span>
      </div>
    </div>
    <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>`;
  // アイコンをpct横に
  const pctDiv = toggleEl.querySelector('div > div:first-child > div:last-child');
  if (pctDiv) pctDiv.appendChild(iconSvg);

  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display:none;margin-top:10px';
  gridContainer.appendChild(buildChapterGrid(s, sem, semId, doneCh, doneLen, rec, color));

  // ★ attachAccordion で確実接続
  attachAccordion(toggleEl, gridContainer, () => iconSvg);

  card.appendChild(toggleEl);
  card.appendChild(gridContainer);
  return card;
}

// ============================================================
// 今週ストリップ
// ============================================================
function renderWeekStrip(subjects, sem) {
  const el = document.getElementById('week-strip');
  if (!el) return;
  const now=new Date(), todayDow=now.getDay();
  const LABELS=['日','月','火','水','木','金','土'];
  el.innerHTML='';
  for (let d=0;d<7;d++) {
    const date=new Date(now); date.setDate(now.getDate()-todayDow+d); date.setHours(0,0,0,0);
    const isToday=d===todayDow;
    const items=[];
    subjects.forEach(s => {
      const done=Math.floor(getCompletedLessons(s.code)/CPL);
      for (let n=1;n<=s.lessons;n++) {
        const dl=getLessonDeadline(n,s,sem);
        if (dl.toDateString()===date.toDateString())
          items.push({isDone:n<=done,isLate:n>done&&dl<now});
      }
    });
    const cell=document.createElement('div');
    cell.className='week-cell'+(isToday?' is-today':'');
    const dots=items.slice(0,3).map(({isDone,isLate})=>{
      const c=isDone?'var(--green)':isLate?'var(--red)':'var(--amber)';
      return `<div class="week-subject-dot" style="background:${c}"></div>`;
    }).join('');
    cell.innerHTML=`<div class="week-day-label">${LABELS[d]}</div>
      <div style="font-size:12px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--amber)':'var(--text2)'}">${date.getDate()}</div>
      <div style="display:flex;gap:2px;min-height:8px;flex-wrap:wrap;justify-content:center">${dots}</div>
      ${items.length>3?`<div style="font-size:9px;color:var(--text3)">+${items.length-3}</div>`:''}`;
    el.appendChild(cell);
  }
}

// ============================================================
// 先取りおすすめ（章グリッド付き）
// ============================================================
function renderAdvance(subjects, sem, semId) {
  const el=document.getElementById('today-advance');
  if (!el) return;
  const now=new Date();
  const advances=[];
  subjects.forEach(s=>{
    const doneCh=getCompletedLessons(s.code), doneLess=Math.floor(doneCh/CPL);
    const late=Math.max(0,getTodayTarget(s,sem)-doneLess), rec=getTodayRecommended(s,sem);
    if (late>0||rec>doneLess||doneLess>=s.lessons) return;
    const next=doneLess+1;
    if (!isLessonAvailable(next,s,sem)) return;
    const nextDL=getLessonDeadline(next,s,sem), days=Math.ceil((nextDL-now)/86400000);
    if (days<7) return;
    advances.push({s,doneCh,doneLess,next,nextDL,days,rec});
  });
  if (!advances.length) { el.innerHTML=`<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">先取りに余裕のある科目はありません</div>`; return; }
  advances.sort((a,b)=>a.days-b.days);
  el.innerHTML='';
  advances.slice(0,5).forEach(({s,doneCh,doneLess,next,nextDL,days,rec})=>{
    const color=getCategoryColor(s.category);
    const dateStr=nextDL.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric',weekday:'short'});
    const lc=days<=14?'var(--amber)':'var(--green)';
    const pct=Math.round(doneCh/(s.lessons*CPL)*100);

    const wrapper=document.createElement('div');
    wrapper.style.cssText='border-bottom:1px solid var(--border);padding-bottom:4px;margin-bottom:4px';

    const iconSvg=document.createElementNS('http://www.w3.org/2000/svg','svg');
    iconSvg.setAttribute('viewBox','0 0 24 24'); iconSvg.setAttribute('fill','none');
    iconSvg.setAttribute('stroke','currentColor'); iconSvg.setAttribute('stroke-width','2.5');
    iconSvg.setAttribute('width','13'); iconSvg.setAttribute('height','13');
    iconSvg.style.cssText='color:var(--text3);transition:transform 0.2s;pointer-events:none;flex-shrink:0';
    iconSvg.innerHTML='<polyline points="6 9 12 15 18 9"/>';

    const toggleRow=document.createElement('div');
    toggleRow.innerHTML=`<div style="display:flex;align-items:center;gap:10px;padding:8px 0">
      <div style="width:6px;height:6px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
        <div style="font-size:11px;color:var(--text3);margin-top:1px">コマ${next}〜 ・ 次の締切 ${dateStr} ・ ${pct}%完了</div>
      </div>
      <div style="display:flex;align-items:center;gap:5px;flex-shrink:0">
        <span style="font-size:11px;font-weight:700;color:${lc}">あと${days}日</span>
      </div>
    </div>`;
    // アイコンを右端に
    const rightDiv=toggleRow.querySelector('div > div:last-child');
    if (rightDiv) rightDiv.appendChild(iconSvg);

    const gridContainer=document.createElement('div');
    gridContainer.style.display='none';
    gridContainer.appendChild(buildChapterGrid(s,sem,semId,doneCh,doneLess,rec,color));

    attachAccordion(toggleRow,gridContainer,()=>iconSvg);
    wrapper.appendChild(toggleRow);
    wrapper.appendChild(gridContainer);
    el.appendChild(wrapper);
  });
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
      const isPast=days<0, bd=isPast?'var(--border)':days<=7?'var(--red)':'var(--amber)';
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
    if (isLate)           { ls='color:var(--red)';  lt='遅刻中';          rs='border-left:3px solid var(--red);padding-left:10px'; }
    else if (days<=3)     { ls='color:var(--red)';  lt=`あと${days}日`;   rs='border-left:3px solid var(--red);padding-left:10px'; }
    else if (days<=7)     { ls='color:var(--amber)';lt=`あと${days}日`;   rs='border-left:3px solid var(--amber);padding-left:10px'; }
    else                  { ls='color:var(--text3)';lt=`あと${days}日`;   rs='border-left:3px solid var(--border);padding-left:10px'; }
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
