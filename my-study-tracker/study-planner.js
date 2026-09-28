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
  for (const key of ['wake','bed','latestBed']) if (!Number.isFinite(plannerMinutes(p[key]))) fail();
  for (const key of ['workday','holiday']) {
    if (!Array.isArray(p[key]) || !p[key].length || p[key].length > 40) fail();
    let end = 0;
    for (const b of p[key]) {
      if (!isPlainObject(b) || typeof b.title !== 'string' || b.title.length > 120
          || !['life','work','commute','sleep','study','review'].includes(b.kind)
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
function buildStudyPlan(semester, now = new Date()) {
  const tasks = pendingStudyTasks(semester), sessions = [], slots = [];
  const today = japanDate(now), startDate = today > semester.start ? today : semester.start;
  let capacity = 0;
  // 未提供の遠い学期・壊れたファイルで無制限に計算しない。
  for (let day = startDate, i = 0; day <= semester.end && i < 400; day = addPlanDays(day, 1), i++) {
    for (const b of planBlocks(day).filter(b => b.kind === 'study')) {
      const start = Math.max(planTime(day,b.start), now.getTime()), end = planTime(day,b.end);
      if (start >= end) continue;
      const conflict = planEventConflicts(day,start,end,semester.id);
      slots.push({ day, start, end, conflict });
      if (conflict.length) continue;
      capacity += Math.floor((end-start)/60000);
      let cursor = start;
      while (end-cursor >= 60000) {
        const ready = tasks.filter(t => t.remaining > 0 && t.start <= cursor
          && (t.kind !== 'exam' || !tasks.some(other => other.code === t.code && other.kind === 'lesson' && other.remaining > 0)));
        const task = ready.find(t => t.kind !== 'exam' || t.remaining <= Math.floor((end-cursor)/60000));
        if (!task) break;
        const minutes = Math.min(task.remaining, Math.floor((end-cursor)/60000));
        const finish = cursor + minutes*60000;
        sessions.push({ day, start:cursor, end:finish, taskId:task.id, label:task.label, code:task.code, kind:task.kind,
          minutes, partial: minutes < task.minutes, late:finish > task.deadline, confirmed:task.confirmed });
        task.remaining -= minutes; task.finish = finish; cursor = finish;
      }
    }
  }
  return { startDate, endDate:semester.end, tasks, sessions, slots, capacity,
    required:tasks.reduce((n,t) => n+t.minutes,0), remaining:tasks.reduce((n,t) => n+t.remaining,0),
    risk:tasks.filter(t => t.remaining > 0 || t.finish > t.deadline),
    unknown:tasks.filter(t => !t.confirmed).length };
}
let plannerView = 'overview', plannerAnchor = null, plannerSemester = null;
function setPlannerView(view) { plannerView = view; renderSchedulePage(); }
function shiftPlannerDate(days) { plannerAnchor = addPlanDays(plannerAnchor, days); renderSchedulePage(); }
function renderStudyPlanner(semester) {
  const root = document.getElementById('study-planner'); if (!root) return;
  const p = state.privateData.planner, plan = buildStudyPlan(semester);
  if (plannerSemester !== semester.id || !plannerAnchor) { plannerSemester = semester.id; plannerAnchor = plan.startDate; }
  document.querySelectorAll('[data-planner-view]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.plannerView === plannerView)));
  document.getElementById('month-card').hidden = plannerView !== 'month';
  root.hidden = plannerView === 'month';
  const hours = n => (n/60).toLocaleString('ja-JP',{maximumFractionDigits:1});
  const note = `<p class="settings-note">授業1コマ＋課題を${p.lessonMinutes}分、期末枠を${p.examMinutes}分とする仮の計画です。実際の所要時間・受験方法に合わせて調整してください。チェックの記録から毎回組み直します。</p>`;
  if (plannerView === 'overview') {
    const work = p.workday.filter(b=>b.kind==='study').reduce((n,b)=>n+plannerMinutes(b.end)-plannerMinutes(b.start),0);
    const off = p.holiday.filter(b=>b.kind==='study').reduce((n,b)=>n+plannerMinutes(b.end)-plannerMinutes(b.start),0);
    const weeks = new Map();
    for (const s of plan.sessions) {
      const monday = addPlanDays(s.day, -((planDayOfWeek(s.day)+6)%7));
      if (!weeks.has(monday)) weeks.set(monday,{minutes:0,codes:new Set(),exam:false});
      const w = weeks.get(monday); w.minutes+=s.minutes;w.codes.add(s.code); w.exam ||= s.kind==='exam';
    }
    root.innerHTML = `<div class="card"><div class="card-label">OVERVIEW</div><h2 class="card-title">大まかな学習計画</h2>
      <p>${escapeText(semester.name)}</p><div class="record-stats"><div><strong>${hours(plan.required)}<small>時間</small></strong><span>残りの学習量の目安</span></div><div><strong>${hours(work*5+off*2)}<small>時間/週</small></strong><span>祝日なしの基本枠</span></div><div><strong>${hours(plan.capacity)}<small>時間</small></strong><span>学期末までの空き枠</span></div></div>
      <p class="settings-note">${escapeText(p.note)}</p>${note}
      ${plan.startDate > semester.end ? '<p class="plan-warning">この学期は終了しています。学期を切り替えると今後の計画を作れます。</p>' : ''}
      ${plan.risk.length ? `<p class="plan-warning">${plan.risk.length}件は締切に間に合わない、または枠が足りない見込みです。未配置 ${hours(plan.remaining)}時間。履修量・所要時間を見直してください。</p>` : '<p class="plan-ok">選択科目は現在の学習枠に収まる見込みです。</p>'}
      ${plan.unknown ? '<p class="settings-note">日時未確認の期末・概算の授業を含みます。正式日程の確認が必要です。</p>' : ''}
      <ol class="plan-phases"><li><b>学期はじめ</b>　履修・受験条件を確認し、締切の近い授業から着手。</li><li><b>毎週</b>　平日夜に進め、土日祝の2枠で課題と遅れを調整。空いた枠は予備・復習。</li><li><b>各科目の期末前</b>　動画・課題をそろえ、期末準備と受験時間を確保。</li></ol>
      </div><div class="card"><h2 class="card-title">週ごとの見通し</h2>${weeks.size ? [...weeks].map(([date,w])=>`<button class="plan-week-link" data-plan-week="${date}"><span>${planDateLabel(date)}〜<small>${w.codes.size}科目${w.exam?' · 期末枠あり':''}</small></span><strong>${hours(w.minutes)}時間 ›</strong></button>`).join(''):'<p class="settings-note">履修科目を選ぶと、科目別の計画がここに表示されます。</p>'}</div>`;
    root.querySelectorAll('[data-plan-week]').forEach(b=>b.addEventListener('click',()=>{plannerAnchor=b.dataset.planWeek;setPlannerView('week');}));
  } else if (plannerView === 'week') {
    const monday = addPlanDays(plannerAnchor, -((planDayOfWeek(plannerAnchor)+6)%7));
    root.innerHTML = `<div class="card"><div class="card-label">WEEK</div><h2 class="card-title">1週間のスケジュール</h2>${plannerDateNav(7)}<p class="plan-day-label">${planDateLabel(monday)}〜${planDateLabel(addPlanDays(monday,6))}</p>${note}<div class="plan-week">${Array.from({length:7},(_,i)=>{
      const day=addPlanDays(monday,i), info=planDayInfo(day), sessions=plan.sessions.filter(s=>s.day===day);
      const conflicts=plan.slots.filter(s=>s.day===day && s.conflict.length);
      return `<article class="plan-day ${info.holiday?'holiday':''}"><button class="plan-day-heading" data-plan-day="${day}"><strong>${planDateLabel(day)}</strong><span>${escapeText(info.label)} ›</span></button>
        ${sessions.map(s=>planSessionHTML(s)).join('') || `<p class="settings-note">${conflicts.length?'個人予定を優先し、空いた枠を予備にします。':day<semester.start?'開講前：資料確認・学習準備。':day>semester.end?'学期終了後：復習・次学期の準備。':'学習枠は予備・復習に使えます。'}</p>`}
        ${conflicts.map(s=>`<p class="plan-warning">${planTimeLabel(s.start)}〜 個人予定があるため学習を配置しません。</p>`).join('')}
        ${info.confirmed?'':'<p class="settings-note">祝日未登録：土日のみ休日扱い</p>'}</article>`;
    }).join('')}</div></div>`;
    root.querySelectorAll('[data-plan-day]').forEach(b=>b.addEventListener('click',()=>{plannerAnchor=b.dataset.planDay;setPlannerView('day');}));
  } else {
    const info=planDayInfo(plannerAnchor), sessions=plan.sessions.filter(s=>s.day===plannerAnchor);
    const blocks=planBlocks(plannerAnchor), wakeIndex=blocks.findIndex(b=>b.start===p.wake);
    const orderedBlocks=wakeIndex>=0 ? [...blocks.slice(wakeIndex),...blocks.slice(0,wakeIndex)] : blocks;
    root.innerHTML=`<div class="card"><div class="card-label">DAY</div><h2 class="card-title">1日の時間割</h2>${plannerDateNav(1)}<p class="plan-day-label">${planDateLabel(plannerAnchor)} · ${escapeText(info.label)}${info.confirmed?'':' · 祝日未登録（土日のみ休日扱い）'}</p>
      <div class="daily-timetable">${orderedBlocks.map(b=>`<div class="time-block ${b.kind}"><time>${plannerMinutes(b.start)<plannerMinutes(p.wake)?'翌 ':''}${b.start}<br>〜${b.end}</time><div><strong>${escapeText(b.title)}</strong>${b.kind==='study' ? sessions.filter(s=>s.start>=planTime(plannerAnchor,b.start)&&s.start<planTime(plannerAnchor,b.end)).map(s=>planSessionHTML(s)).join('') || '<p class="settings-note">予備・復習／個人予定を優先</p>':''}</div></div>`).join('')}</div>
      <p class="settings-note">${escapeText(p.note)}</p>${getApplications(semester.id).filter(e=>e.date===plannerAnchor).map(e=>`<p class="settings-note">自分の予定：${escapeText(e.allDay?'終日':e.time)} ${escapeText(e.title)}</p>`).join('')}
      </div>`;
  }
  root.querySelectorAll('[data-plan-shift]').forEach(b=>b.addEventListener('click',()=>shiftPlannerDate(Number(b.dataset.planShift))));
  root.querySelector('[data-plan-date]')?.addEventListener('change',e=>{if(validCalendarDate(e.target.value)){plannerAnchor=e.target.value;renderSchedulePage();}});
}
function plannerDateNav(step) { return `<div class="planner-date-nav"><button class="data-transfer-btn" data-plan-shift="${-step}" aria-label="前へ">‹</button><input data-plan-date type="date" aria-label="表示する日" value="${plannerAnchor}" min="2000-01-01" max="2100-12-31"><button class="data-transfer-btn" data-plan-shift="${step}" aria-label="次へ">›</button></div>`; }
function planSessionHTML(s) {return `<div class="plan-session ${s.late?'late':''}"><time>${planTimeLabel(s.start)}〜${planTimeLabel(s.end)}</time><span>${escapeText(s.label)}${s.partial?'（分割）':''}${s.late?' · 締切超過見込み':''}${s.confirmed?'':' · 日時未確認'}</span></div>`;}
