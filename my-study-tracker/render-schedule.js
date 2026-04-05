// ============================================================
// my-study-tracker - render-schedule.js
// ============================================================

let scheduleView        = 'week';
let scheduleMonthOffset = 0;

function renderSchedulePage() {
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(sem.id);
  document.getElementById('schedule-view-week').classList.toggle('active', scheduleView==='week');
  document.getElementById('schedule-view-month').classList.toggle('active', scheduleView==='month');
  if (scheduleView === 'week') {
    document.getElementById('schedule-month-nav').style.display = 'none';
    document.getElementById('schedule-week').style.display  = 'block';
    document.getElementById('schedule-month').style.display = 'none';
    renderWeekSchedule(subjects, sem);
  } else {
    document.getElementById('schedule-month-nav').style.display = 'flex';
    document.getElementById('schedule-week').style.display  = 'none';
    document.getElementById('schedule-month').style.display = 'block';
    renderMonthSchedule(subjects, sem);
  }
}

// 期末試験日を取得
function getKimatsuDate(sem) {
  if (sem.attendance?.senmon_jyunji?.[16]) {
    const e = sem.attendance.senmon_jyunji[16];
    return new Date(typeof e==='string'?e:e.end);
  }
  return null;
}

// ============================================================
// 週表示：締切 + 受講推奨コマ
// ============================================================
function renderWeekSchedule(subjects, sem) {
  const now      = new Date();
  const todayDow = now.getDay();
  const DOW      = ['日','月','火','水','木','金','土'];
  const el       = document.getElementById('schedule-week');
  el.innerHTML   = '';
  const kimatsuDate = getKimatsuDate(sem);

  for (let d = 0; d < 7; d++) {
    const date = new Date(now);
    date.setDate(now.getDate() - todayDow + d);
    date.setHours(0,0,0,0);
    const isToday = d === todayDow;
    const isPast  = date < new Date(now.getFullYear(),now.getMonth(),now.getDate()) && !isToday;

    // 締切コマ
    const deadlines = [];
    subjects.forEach(s => {
      const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
      for (let n = 1; n <= s.lessons; n++) {
        const dl = getLessonDeadline(n, s, sem);
        if (dl.toDateString() === date.toDateString()) {
          deadlines.push({ s, n, isDone: n<=doneLessons, isLate: n>doneLessons&&dl<now });
        }
      }
    });

    // 受講推奨コマ（締切7日前）
    const recItems = [];
    subjects.forEach(s => {
      const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
      for (let n = doneLessons+1; n <= s.lessons; n++) {
        if (!isLessonAvailable(n, s, sem)) continue;
        const dl        = getLessonDeadline(n, s, sem);
        const advTarget = new Date(dl.getTime() - 7*86400000);
        if (advTarget.toDateString() === date.toDateString()) {
          recItems.push({ s, n });
          break;
        }
      }
    });

    const isKimatsuDay = kimatsuDate && kimatsuDate.toDateString()===date.toDateString();

    const dayEl = document.createElement('div');
    dayEl.style.cssText = `
      background:${isToday?'var(--amber-dim)':isPast?'rgba(17,24,39,0.4)':'var(--bg2)'};
      border:1px solid ${isToday?'var(--amber)':'var(--border)'};
      border-radius:var(--radius-sm);padding:10px 12px;margin-bottom:6px;
      opacity:${isPast?'0.65':'1'};`;

    const dateLabel = date.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'});
    const todayBadge= isToday?`<span style="font-size:9px;background:var(--amber);color:#000;padding:1px 6px;border-radius:99px;margin-left:auto;font-weight:700">TODAY</span>`:'';
    const cntBadge  = !isToday&&(deadlines.length||recItems.length||isKimatsuDay)
      ? `<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 6px;border-radius:99px;margin-left:auto">${deadlines.length+recItems.length+(isKimatsuDay?1:0)}件</span>`:'';

    let rows = '';
    if (isKimatsuDay) {
      rows += `<div style="display:flex;align-items:center;gap:7px;padding:5px 8px;background:var(--purple-dim);border-radius:5px;margin-bottom:3px">
        <span style="font-size:13px">📝</span>
        <div><div style="font-size:12px;font-weight:700;color:var(--purple)">期末試験 締切</div>
        <div style="font-size:10px;color:var(--text3)">専門・順次開講 ・ 12:00</div></div></div>`;
    }
    deadlines.forEach(({s,n,isDone,isLate})=>{
      const c=getCategoryColor(s.category);
      const icon=isDone?'✅':isLate?'🔴':'⏰';
      const ic=isDone?c:isLate?'var(--red)':'var(--amber)';
      rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px solid var(--border)">
        <div style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:10px;color:var(--text3)">コマ${n} ・ 12:00締切</div>
        </div>
        <span style="font-size:13px;color:${ic}">${icon}</span></div>`;
    });
    // 受講推奨
    recItems.forEach(({s,n})=>{
      const c=getCategoryColor(s.category);
      rows+=`<div style="display:flex;align-items:center;gap:7px;padding:5px 0;border-bottom:1px dashed var(--border)">
        <div style="width:5px;height:5px;border-radius:50%;background:${c};flex-shrink:0;opacity:0.6"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;color:var(--text2);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${s.name}</div>
          <div style="font-size:10px;color:var(--text3)">コマ${n} ・ 受講推奨日 📚</div>
        </div>
        <span style="font-size:10px;color:#60a5fa">推奨</span></div>`;
    });
    if (!rows) rows=`<div style="font-size:11px;color:var(--text3);padding:2px 0">予定なし</div>`;

    dayEl.innerHTML=`
      <div style="display:flex;align-items:center;gap:6px;margin-bottom:${rows?'8px':'2px'}">
        <span style="font-family:'Space Mono',monospace;font-size:11px;font-weight:700;color:${isToday?'var(--amber)':isPast?'var(--text3)':'var(--text2)'}">${DOW[d]}</span>
        <span style="font-size:13px;font-weight:${isToday?'700':'400'};color:${isToday?'var(--amber)':isPast?'var(--text3)':'var(--text2)'}">${dateLabel}</span>
        ${todayBadge}${cntBadge}
      </div>${rows}`;
    el.appendChild(dayEl);
  }
}

// ============================================================
// 月表示：科目ラベル＋受講推奨＋期末試験・タップで詳細
// ============================================================
function renderMonthSchedule(subjects, sem) {
  const now   = new Date();
  const base  = new Date(now.getFullYear(), now.getMonth()+scheduleMonthOffset, 1);
  const year  = base.getFullYear();
  const month = base.getMonth();
  document.getElementById('schedule-month-label').textContent = `${year}年${month+1}月`;

  const firstDow    = new Date(year,month,1).getDay();
  const daysInMonth = new Date(year,month+1,0).getDate();
  const DOW         = ['日','月','火','水','木','金','土'];
  const kimatsuDate = getKimatsuDate(sem);

  // 締切マップ
  const dlMap  = {};
  // 受講推奨マップ
  const recMap = {};

  subjects.forEach(s => {
    const doneLessons = Math.floor(getCompletedLessons(s.code) / 4);
    for (let n = 1; n <= s.lessons; n++) {
      const dl = getLessonDeadline(n, s, sem);
      if (dl.getFullYear()===year && dl.getMonth()===month) {
        const k = dl.getDate();
        if (!dlMap[k]) dlMap[k]=[];
        dlMap[k].push({ s, n, isDone: n<=doneLessons, isLate: n>doneLessons&&dl<now });
      }
    }
    // 受講推奨（締切7日前）
    for (let n = doneLessons+1; n <= s.lessons; n++) {
      if (!isLessonAvailable(n, s, sem)) continue;
      const dl        = getLessonDeadline(n, s, sem);
      const advTarget = new Date(dl.getTime() - 7*86400000);
      if (advTarget.getFullYear()===year && advTarget.getMonth()===month) {
        const k = advTarget.getDate();
        if (!recMap[k]) recMap[k]=[];
        recMap[k].push({ s, n });
        break; // 1科目につき1件
      }
    }
  });

  const el = document.getElementById('schedule-month');
  let html = `<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:4px">
    ${DOW.map((d,i)=>`<div style="text-align:center;font-size:10px;padding:3px 0;font-weight:600;color:${i===0?'#ef4444':i===6?'#60a5fa':'var(--text3)'}">${d}</div>`).join('')}
  </div><div style="display:grid;grid-template-columns:repeat(7,1fr);gap:3px">`;

  for (let i=0;i<firstDow;i++) html+=`<div></div>`;

  for (let day=1; day<=daysInMonth; day++) {
    const dow       = new Date(year,month,day).getDay();
    const isToday   = new Date(year,month,day).toDateString()===now.toDateString();
    const isPast    = new Date(year,month,day) < new Date(now.getFullYear(),now.getMonth(),now.getDate()) && !isToday;
    const dlItems   = dlMap[day]  || [];
    const recItems  = recMap[day] || [];
    const isKimatsu = kimatsuDate && kimatsuDate.getFullYear()===year && kimatsuDate.getMonth()===month && kimatsuDate.getDate()===day;

    const hasLate    = dlItems.some(i=>i.isLate);
    const hasPending = dlItems.some(i=>!i.isDone&&!i.isLate);
    const hasDone    = dlItems.some(i=>i.isDone);
    let dotColor='';
    if (hasLate) dotColor='var(--red)';
    else if (hasPending) dotColor='var(--amber)';
    else if (hasDone)    dotColor='var(--green)';

    // ラベル（締切優先・受講推奨）
    const allLabels = [
      ...dlItems.slice(0,2).map(({s,isDone,isLate})=>{
        const c=isDone?'var(--green)':isLate?'var(--red)':'var(--amber)';
        const bg=isDone?'rgba(16,185,129,0.12)':isLate?'rgba(239,68,68,0.12)':'rgba(245,158,11,0.12)';
        const short=s.name.length>5?s.name.slice(0,5)+'…':s.name;
        return `<div style="font-size:8px;color:${c};background:${bg};border-radius:3px;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">${short}</div>`;
      }),
      ...(!hasPending&&!hasLate&&recItems.length?recItems.slice(0,1).map(({s})=>{
        const short=s.name.length>5?s.name.slice(0,5)+'…':s.name;
        return `<div style="font-size:8px;color:#60a5fa;background:rgba(96,165,250,0.12);border-radius:3px;padding:1px 3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:100%">📚${short}</div>`;
      }):[]),
    ];
    const more = (dlItems.length+recItems.length)>2
      ? `<div style="font-size:8px;color:var(--text3)">+${dlItems.length+recItems.length-2}</div>`:'';;
    const kimatsuLabel = isKimatsu
      ? `<div style="font-size:8px;color:var(--purple);background:var(--purple-dim);border-radius:3px;padding:1px 3px">📝期末</div>`:'';

    const dayColor=isToday?'var(--amber)':dow===0?'#ef4444':dow===6?'#60a5fa':isPast?'var(--text3)':'var(--text2)';
    const hasContent=dlItems.length>0||recItems.length>0||isKimatsu;

    // タップデータをまとめてJSONにエンコード
    const tapData = encodeURIComponent(JSON.stringify({
      date:`${year}/${month+1}/${day}`,
      deadlines: dlItems.map(i=>({name:i.s.name, n:i.n, isDone:i.isDone, isLate:i.isLate, cat:i.s.category})),
      recommended: recItems.map(i=>({name:i.s.name, n:i.n, cat:i.s.category})),
      kimatsu: isKimatsu,
    }));

    html+=`<div onclick="${hasContent?`showDayDetail('${tapData}')`:''}"
      style="min-height:54px;border-radius:6px;padding:3px 4px;
        background:${isToday?'var(--amber-dim)':isKimatsu?'var(--purple-dim)':hasContent?'var(--bg3)':'transparent'};
        border:1px solid ${isToday?'var(--amber)':isKimatsu?'var(--purple)':hasContent?'var(--border)':'transparent'};
        display:flex;flex-direction:column;gap:2px;
        cursor:${hasContent?'pointer':'default'};
        opacity:${isPast&&!hasContent?'0.35':'1'};">
      <div style="display:flex;align-items:center;justify-content:space-between">
        <span style="font-size:11px;font-weight:${isToday?'700':'500'};color:${dayColor}">${day}</span>
        ${dotColor?`<div style="width:4px;height:4px;border-radius:50%;background:${dotColor}"></div>`:''}
      </div>
      ${allLabels.join('')}${more}${kimatsuLabel}
    </div>`;
  }

  html+=`</div>
  <div style="display:flex;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap;font-size:10px;color:var(--text3)">
    <div style="display:flex;align-items:center;gap:3px"><div style="width:7px;height:7px;border-radius:50%;background:var(--amber)"></div>締切(未)</div>
    <div style="display:flex;align-items:center;gap:3px"><div style="width:7px;height:7px;border-radius:50%;background:var(--red)"></div>遅刻</div>
    <div style="display:flex;align-items:center;gap:3px"><div style="width:7px;height:7px;border-radius:50%;background:var(--green)"></div>完了</div>
    <div style="display:flex;align-items:center;gap:3px"><span>📚</span>受講推奨</div>
    <div style="display:flex;align-items:center;gap:3px"><span>📝</span>期末</div>
    <span style="margin-left:auto">タップで詳細</span>
  </div>`;
  el.innerHTML = html;
}

// ============================================================
// 日付タップ詳細モーダル（締切・受講推奨・期末を統合表示）
// ============================================================
function showDayDetail(dataJson) {
  const data = JSON.parse(decodeURIComponent(dataJson));
  const existing = document.getElementById('day-detail-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'day-detail-modal';
  modal.style.cssText = `position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom)`;

  let content = '';

  // 期末試験
  if (data.kimatsu) {
    content += `<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:20px">📝</span>
      <div><div style="font-size:13px;font-weight:700;color:var(--purple)">期末試験 締切日</div>
      <div style="font-size:11px;color:var(--text3)">専門・順次開講科目 ・ 12:00まで</div></div>
    </div>`;
  }

  // 締切コマ
  (data.deadlines||[]).forEach(({name,n,isDone,isLate,cat})=>{
    const color=(CATEGORY_CONFIG[cat]||{}).color||'#64748b';
    const status=isDone?`<span style="color:var(--green)">✅ 完了</span>`
      :isLate?`<span style="color:var(--red)">🔴 遅刻中</span>`
      :`<span style="color:var(--amber)">⏰ 要受講</span>`;
    content+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500">${name}</div>
        <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 締切 12:00</div>
      </div>${status}</div>`;
  });

  // 受講推奨
  (data.recommended||[]).forEach(({name,n,cat})=>{
    const color=(CATEGORY_CONFIG[cat]||{}).color||'#64748b';
    content+=`<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px dashed var(--border)">
      <div style="width:8px;height:8px;border-radius:50%;background:${color};opacity:0.7;flex-shrink:0"></div>
      <div style="flex:1;min-width:0">
        <div style="font-size:13px;font-weight:500;color:var(--text2)">${name}</div>
        <div style="font-size:11px;color:var(--text3)">コマ${n} ・ 受講推奨日 📚</div>
      </div>
      <span style="font-size:11px;color:#60a5fa">受講推奨</span>
    </div>`;
  });

  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:70vh;overflow-y:auto;padding:20px 16px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:var(--amber);letter-spacing:2px">SCHEDULE</div>
          <div style="font-size:15px;font-weight:700;margin-top:2px">${data.date}</div>
        </div>
        <button onclick="document.getElementById('day-detail-modal').remove()"
          style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
      </div>
      ${content || '<div style="color:var(--text3);font-size:13px;text-align:center;padding:16px">この日の予定はありません</div>'}
    </div>`;
  modal.addEventListener('click', e => { if (e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

// 旧関数との互換性維持
function showDayDeadlines(dateLabel, itemsJson, isKimatsu) {
  const items = JSON.parse(decodeURIComponent(itemsJson));
  const tapData = encodeURIComponent(JSON.stringify({
    date: dateLabel,
    deadlines: items,
    recommended: [],
    kimatsu: !!isKimatsu,
  }));
  showDayDetail(tapData);
}
