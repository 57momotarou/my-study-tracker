// ============================================================
// my-study-tracker - render-today-cards.js
// TODAYタブ：科目カード描画
// ============================================================

// mode: 'overdue'=遅刻中 / 'today'=今週やるべき / 'tomorrow'=先取り推奨
function _renderTodayCard(ttEl, item, sem, semId, mode) {
  const { s, doneLes, rec, late, nextLesson } = item;
  const color = getCategoryColor(s.category);
  const pct   = Math.round(doneLes / s.lessons * 100);

  let badgeText, badgeClass;

  if (mode === 'overdue') {
    badgeText  = `🔴 ${late}コマ遅刻中`;
    badgeClass = 'badge-danger';
  } else if (mode === 'tomorrow') {
    badgeText  = `✨ コマ${nextLesson}`;
    badgeClass = 'badge-ok';
  } else {
    badgeText  = `📅 コマ${nextLesson}`;
    badgeClass = 'badge-warn';
  }

  const nowLbl = doneLes > 0 ? `コマ${doneLes} 完了` : '未受講';

  // コマ単位ボタン（横スクロール対応）
  // data-done-les: 完了済みコマ数（スクロール復元用）
  // data-lesson-w: 1コマのピクセル幅（app.jsのスクロール計算用）
  const LESSON_W = 39; // 36px + gap 3px
  let btnHtml = `<div class="chapter-scroll-wrap" style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin-top:10px;padding-bottom:2px" data-done-les="${doneLes}" data-lesson-w="${LESSON_W}"><div style="display:flex;flex-wrap:nowrap;gap:3px;width:max-content">`;
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
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        </div>
        <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
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
