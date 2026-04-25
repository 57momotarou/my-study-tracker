// ============================================================
// my-study-tracker - render-today-cards.js
// TODAYタブ：科目カード描画
// ============================================================

// mode: 'overdue'=遅刻中 / 'today'=今週やるべき / 'tomorrow'=先取り推奨
function _renderTodayCard(ttEl, item, sem, semId, mode) {
  const { s, doneLes, rec, late, nextLesson } = item;
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneLes / s.lessons * 100);

  let goalLesson, goalLabel, goalColor, badgeText, badgeClass;

  if (mode === 'overdue') {
    goalLesson = doneLes + 1; // 次に受けるべきコマ
    goalLabel  = '今すぐ取り掛かろう';
    goalColor  = 'var(--red)';
    badgeText  = `🔴 ${late}コマ遅刻中`;
    badgeClass = 'badge-danger';
  } else if (mode === 'tomorrow') {
    goalLesson = nextLesson;
    goalLabel  = '先取り推奨（締切に余裕あり）';
    goalColor  = 'var(--green)';
    badgeText  = `✨ コマ${nextLesson}`;
    badgeClass = 'badge-ok';
  } else {
    // today（7日以内）
    goalLesson = nextLesson;
    goalLabel  = '今週中に受講しよう';
    goalColor  = 'var(--amber)';
    badgeText  = `📅 コマ${nextLesson}`;
    badgeClass = 'badge-warn';
  }

  const done   = doneLes >= goalLesson;
  const nowLbl = doneLes > 0 ? `コマ${doneLes} 完了` : '未受講';

  // コマ単位ボタン（横スクロール対応）
  let btnHtml = `<div class="chapter-scroll-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px;padding-bottom:2px" data-done-les="${doneLes}"><div style="display:flex;flex-wrap:nowrap;gap:3px;width:max-content">`;
  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const isDone    = lesson <= doneLes;
    const isLate_   = !isDone && isLessonLate(lesson, s, sem);
    const isTarget  = !isDone && lesson <= rec && lesson > doneLes;
    const isNotYet  = !isLessonAvailable(lesson, s, sem);
    const noClick   = isNotYet ? 'pointer-events:none;' : '';
    const opacity   = isNotYet ? 'opacity:0.25;' : '';

    let btnStyle = '';
    if (isDone)        btnStyle = `background:${color};color:#000;border-color:${color}`;
    else if (isLate_)  btnStyle = 'background:var(--red-dim);color:var(--red);border:1px solid var(--red)';
    else if (isTarget) btnStyle = 'background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)';
    else               btnStyle = 'background:var(--bg3);color:var(--text3);border:1px solid var(--border)';

    btnHtml += `<button class="lesson-btn${isDone?' done':''}" onclick="toggleLesson('${s.code}',${lesson},${semId})" style="width:36px;height:36px;font-size:11px;${btnStyle}${noClick}${opacity}" title="コマ${lesson}">${lesson}</button>`;
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
              <span style="font-size:40px;font-weight:700;font-family:'Space Mono',monospace;color:${goalColor};line-height:1">${goalLesson}</span>
              <span style="font-size:13px;color:var(--text2)">を受講</span></div>
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
  // スクロール復元はapp.jsの_updateTodayAfterToggleで一元管理（rAF二重実行防止）
}
