// ============================================================
// my-study-tracker - render-today-timetable.js
// TODAYタブ：今日やることカード
// ============================================================

// ============================================================
// TODAY 時間割カード
// 表示ルール：
//   【積み残し】今日の曜日より前に割り当てられていて、今週分（rec）が未完了の科目
//   【今日の予定】今日の曜日に割り当てられた科目（未完了）
//   【完了】今日の予定科目で今日のコマを終えたもの
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

  const now      = new Date();
  const todayDow = now.getDay(); // 0=日,1=月,...,6=土
  // ttDay 0=月〜5=土 → getDay()に変換: ttDay+1
  // 今日のttIdx（月=0〜土=5、日曜は-1）
  const todayTtIdx = todayDow >= 1 && todayDow <= 6 ? todayDow - 1 : -1;

  const withState = subjects.map(s => {
    const doneCh  = getCompletedLessons(s.code);
    const doneLes = Math.floor(doneCh / CPL);
    const target  = getTodayTarget(s, sem);
    const rec     = getTodayRecommended(s, sem);
    const late    = Math.max(0, target - doneLes);
    const ttDay   = getTimetableDay(s.code, semId); // 0=月〜5=土 or undefined

    // 今日の曜日に割り当てられているか
    const isToday = ttDay !== undefined && ttDay === todayTtIdx;

    // 今日の曜日より前（今週すでに割り当て曜日を過ぎた）かどうか
    // ttDay+1 が today の getDay() より小さい（ただし日曜 dow=0 は 7 扱い）
    const ttDow = ttDay !== undefined ? ttDay + 1 : -1; // 曜日に変換(月=1〜土=6)
    const effectiveTodayDow = todayDow === 0 ? 7 : todayDow;
    const effectiveTtDow    = ttDow === 0 ? 7 : ttDow;
    const isPastThisWeek    = ttDay !== undefined && effectiveTtDow < effectiveTodayDow;

    // 「積み残し」= 割り当て曜日が今日より前（週またぎでも残す）かつ未完了
    // isPastThisWeek: 今週の曜日比較（月<火<水...）
    // 先週以前の科目: 今週の割り当て曜日がまだ来ていないが未完了 → 先週やるべきだった
    // → 今日でなく、かつ doneLes < s.lessons（全完了でない）なら積み残しとして表示
    //   ただし「今日より後の曜日」（水〜土など未来）は除外
    const isOverdue = isPastThisWeek && doneLes < s.lessons;

    // 今日の予定：今日の曜日で未完了（今日のコマ=nextLessonを終えていない）
    const nextLesson = doneLes + 1;
    const isTodayDone = doneCh >= nextLesson * CPL || doneLes >= s.lessons;

    return { s, doneCh, doneLes, target, rec, late, ttDay, isToday, isOverdue, isTodayDone, nextLesson };
  });

  // ① 積み残し（今週の割り当て曜日を過ぎて未完了）
  const overdueItems = withState.filter(i => i.isOverdue && !i.isToday);
  // ② 今日の時間割科目
  const todayItems   = withState.filter(i => i.isToday);

  if (todayItems.length === 0 && overdueItems.length === 0) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はありません</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // 今日の予定が全完了で積み残しもなし
  if (overdueItems.length === 0 && todayItems.length > 0 && todayItems.every(i => i.isTodayDone)) {
    ttEl.innerHTML = `<div style="text-align:center;padding:24px;color:var(--green)">
      <div style="font-size:32px;margin-bottom:8px">🎉</div>
      <div style="font-size:15px;font-weight:700">今日の予定はすべて完了！</div>
      <div style="font-size:12px;color:var(--text3);margin-top:4px">余裕があれば先取りしましょう</div></div>`;
    return;
  }

  // ── 積み残しを先頭に ──
  if (overdueItems.length > 0) {
    ttEl.innerHTML += `<div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:8px;padding:6px 10px;background:var(--red-dim);border-radius:6px;border-left:3px solid var(--red)">⚠️ 積み残し（割り当て曜日を過ぎて未完了）</div>`;
    overdueItems
      .sort((a, b) => b.late - a.late || a.rec - b.rec)
      .forEach(item => _renderTodayCard(ttEl, item, sem, semId, true));
  }

  // ── 今日の時間割科目 ──
  if (todayItems.length > 0) {
    const label = overdueItems.length > 0 ? '✅ 積み残し後は今日の予定へ' : '📋 今日の予定';
    ttEl.innerHTML += `<div style="font-size:11px;color:var(--text3);margin:${overdueItems.length>0?'12px':'0'} 0 8px">${label}</div>`;
    todayItems
      .sort((a, b) => {
        if (a.isTodayDone !== b.isTodayDone) return a.isTodayDone ? 1 : -1;
        return b.late - a.late;
      })
      .forEach(item => _renderTodayCard(ttEl, item, sem, semId, false));
  }
}

// 科目カード1枚を描画
function _renderTodayCard(ttEl, item, sem, semId, forceShowAsOverdue) {
  const { s, doneCh, doneLes, rec, late, isTodayDone, nextLesson } = item;
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneCh / (s.lessons * CPL) * 100);

  // 完了カード（コンパクト）
  if (isTodayDone && late === 0 && !forceShowAsOverdue) {
    ttEl.innerHTML += `<div class="today-subject-card" style="border-left:3px solid var(--green);opacity:0.75;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">✅</span>
        <div style="flex:1;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        <span style="font-size:10px;color:var(--green)">今日完了</span>
      </div></div>`;
    return;
  }

  let goalL, goalCh, goalLabel, goalColor, badgeText, badgeClass;
  if (late > 0) {
    const next = doneCh + 1;
    goalL = Math.ceil(next / CPL); goalCh = ((next - 1) % CPL) + 1;
    goalLabel = '今すぐ取り掛かろう'; goalColor = 'var(--red)';
    badgeText = `🔴 ${late}コマ遅刻中`; badgeClass = 'badge-danger';
  } else if (forceShowAsOverdue) {
    // 積み残し（遅刻ではないが割り当て曜日を過ぎた）
    goalL = nextLesson; goalCh = CPL;
    goalLabel = '前日以前の未消化 — 先に終わらせよう'; goalColor = 'var(--amber)';
    badgeText = `📌 前日以前`; badgeClass = 'badge-warn';
  } else {
    goalL = nextLesson; goalCh = CPL;
    goalLabel = '今日の予定'; goalColor = 'var(--amber)';
    badgeText = `📅 コマ${nextLesson}`; badgeClass = 'badge-warn';
  }

  const done  = doneCh >= (goalL - 1) * CPL + goalCh;
  const inLes = doneCh % CPL;
  const nowLbl = inLes > 0 ? `コマ${doneLes+1} 第${inLes}章まで完了` : doneLes > 0 ? `コマ${doneLes} 完了` : '未受講';

  // 章グリッド（横スクロール対応）
  let btnHtml = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px;padding-bottom:2px"><div style="display:flex;flex-wrap:nowrap;gap:2px;width:max-content">';
  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateL  = isLessonLate(lesson, s, sem);
    // 今日やるべきコマ：nextLesson（今日の予定）またはrecまでの未完コマ
    const weekL  = lesson > doneLes && (lesson === nextLesson || lesson <= rec);
    const notYet = !isLessonAvailable(lesson, s, sem);
    const lOp   = notYet ? 'opacity:0.2;' : '';
    btnHtml += `<div style="display:grid;grid-template-columns:repeat(4,28px);grid-template-rows:28px;gap:1px;${lOp}">`;
    for (let ch = 1; ch <= CPL; ch++) {
      const chNum   = (lesson - 1) * CPL + ch;
      const isDone  = chNum <= doneCh;
      const isLateC = !isDone && lateL;
      const isWeekC = !isDone && !isLateC && weekL;
      const nc = notYet ? 'pointer-events:none;' : '';
      let st = '';
      if (isDone)       st = 'background:' + color + ';color:#000';
      else if (isLateC) st = 'background:var(--red-dim);color:var(--red);border:1px solid var(--red)';
      else if (isWeekC) st = 'background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)';
      btnHtml += `<button class="lesson-btn${isDone?' done':''}" onclick="toggleChapter('${s.code}',${chNum},${semId})" style="width:28px;height:28px;${st}${nc}" title="コマ${lesson} 第${ch}章">${lesson}-${ch}</button>`;
    }
    btnHtml += '</div>';
  }
  btnHtml += '</div></div>';

  ttEl.innerHTML += `
    <div class="today-subject-card" style="border-left:3px solid ${color};margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        </div>
        <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
      </div>
      <div class="today-goal-box" style="border-color:${goalColor};background:${goalColor}18;margin-bottom:10px">
        <div style="font-size:10px;letter-spacing:1.5px;color:${goalColor};font-family:'Space Mono',monospace;font-weight:700;margin-bottom:6px">TODAY'S GOAL</div>
        ${done
          ? `<div style="display:flex;align-items:center;gap:8px"><span style="font-size:22px">✅</span>
              <div><div style="font-size:15px;font-weight:700;color:var(--green)">目標達成！</div>
              <div style="font-size:11px;color:var(--text3);margin-top:2px">余裕があれば次のコマも</div></div></div>`
          : `<div style="display:flex;align-items:baseline;gap:6px;flex-wrap:wrap">
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
}
