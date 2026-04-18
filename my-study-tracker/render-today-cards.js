// ============================================================
// my-study-tracker - render-today-cards.js
// TODAYタブ：科目カード描画
// ============================================================

// mode: 'late'=遅刻中 / 'overdue'=積み残し / 'today'=今日の予定
function _renderTodayCard(ttEl, item, sem, semId, mode) {
  const { s, doneCh, doneLes, rec, late, isTodayDone, nextLesson } = item;
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneCh / (s.lessons * CPL) * 100);

  // 完了カード（コンパクト）
  if (isTodayDone && mode === 'today') {
    ttEl.innerHTML += `<div class="today-subject-card" style="border-left:3px solid var(--green);opacity:0.75;margin-bottom:8px">
      <div style="display:flex;align-items:center;gap:8px">
        <span style="font-size:18px">✅</span>
        <div style="flex:1;font-size:13px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        <span style="font-size:10px;color:var(--green)">今日完了</span>
      </div></div>`;
    return;
  }

  let goalL, goalCh, goalLabel, goalColor, badgeText, badgeClass;

  if (mode === 'late') {
    const next = doneCh + 1;
    goalL     = Math.ceil(next / CPL);
    goalCh    = ((next - 1) % CPL) + 1;
    goalLabel = '今すぐ取り掛かろう';
    goalColor = 'var(--red)';
    badgeText = `🔴 ${late}コマ遅刻中`;
    badgeClass = 'badge-danger';
  } else if (mode === 'overdue') {
    goalL     = nextLesson;
    goalCh    = CPL;
    goalLabel = '前日以前の未消化 — 先に終わらせよう';
    goalColor = 'var(--amber)';
    badgeText = '📌 前日以前';
    badgeClass = 'badge-warn';
  } else if (mode === 'tomorrow') {
    goalL     = nextLesson;
    goalCh    = CPL;
    goalLabel = '明日の予定（先取り）';
    goalColor = 'var(--green)';
    badgeText = `📅 明日コマ${nextLesson}`;
    badgeClass = 'badge-ok';
  } else {
    // today
    goalL     = nextLesson;
    goalCh    = CPL;
    goalLabel = '今日の予定';
    goalColor = 'var(--amber)';
    badgeText = `📅 コマ${nextLesson}`;
    badgeClass = 'badge-warn';
  }

  const done   = doneCh >= (goalL - 1) * CPL + goalCh;
  const inLes  = doneCh % CPL;
  const nowLbl = inLes > 0
    ? `コマ${doneLes+1} 第${inLes}章まで完了`
    : doneLes > 0 ? `コマ${doneLes} 完了` : '未受講';

  // 章グリッド（横スクロール・自動スクロール対応）
  let btnHtml = `<div class="chapter-scroll-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px;padding-bottom:2px" data-done-les="${doneLes}"><div style="display:flex;flex-wrap:nowrap;gap:2px;width:max-content">`;
  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const lateL  = isLessonLate(lesson, s, sem);
    const notYet = !isLessonAvailable(lesson, s, sem);
    const lOp    = notYet ? 'opacity:0.2;' : '';
    // 今日やるべきコマ：nextLesson か recまでの未完コマ
    const isTargetLesson = lesson > doneLes && (lesson === nextLesson || lesson <= rec);
    btnHtml += `<div style="display:grid;grid-template-columns:repeat(4,28px);grid-template-rows:28px;gap:1px;${lOp}">`;
    for (let ch = 1; ch <= CPL; ch++) {
      const chNum   = (lesson - 1) * CPL + ch;
      const isDone  = chNum <= doneCh;
      const isLateC = !isDone && lateL;
      const isWeekC = !isDone && !isLateC && isTargetLesson;
      const nc      = notYet ? 'pointer-events:none;' : '';
      let st = '';
      if (isDone)       st = `background:${color};color:#000`;
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
        <span><span style="color:var(--amber)">■</span> 今日</span>
        <span style="opacity:0.4">■ 未開講</span>
      </div>
    </div>`;

  // 章グリッドを自動スクロール：この呼び出しで追加した最後のwrapだけをスクロール
  const LESSON_W = 117; // 4px×28 + gap1×3=115 + コマ間gap2 = 117
  const wraps = ttEl.querySelectorAll('.chapter-scroll-wrap');
  if (wraps.length > 0) {
    const wrap = wraps[wraps.length - 1]; // 最後に追加されたもの
    const dl = parseInt(wrap.dataset.doneLes) || 0;
    if (dl > 0) { wrap.scrollLeft = dl * LESSON_W; }
  }
}
