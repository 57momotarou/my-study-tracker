// ============================================================
// my-study-tracker - render-today-cards.js
// TODAYタブ：科目カード描画
// ============================================================

// mode: 'overdue'=遅刻中 / 'today'=今週やるべき / 'tomorrow'=先取り推奨
function buildTodayCard(item, sem, semId, mode) {
  const { s, doneLes, rec, late, nextLesson } = item;
  const color = getCategoryColor(s.category);
  const pct   = getCourseProgress(semId, s).percent;

  let badgeText, badgeClass;

  if (mode === 'overdue') {
    badgeText  = `🔴 ${late}コマ遅刻中`;
    badgeClass = 'badge-danger';
  } else if (mode === 'tomorrow') {
    badgeText  = nextLesson ? `✨ コマ${nextLesson}` : '📝 期末';
    badgeClass = 'badge-ok';
  } else {
    badgeText  = nextLesson ? `📅 コマ${nextLesson}` : '📝 期末';
    badgeClass = 'badge-warn';
  }

  const nowLbl = doneLes > 0 ? `${doneLes}/${s.lessons}コマ提出済み` : '未完了';

  const btnHtml = renderLessonButtons(s, sem, semId);

  return `
    <div class="today-subject-card" data-today-code="${s.code}" data-today-mode="${mode}" style="border-left:3px solid ${color};margin-bottom:8px">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px">
        <div style="display:flex;align-items:center;gap:8px;flex:1;min-width:0">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0;margin-top:3px"></div>
          <div style="font-size:14px;font-weight:700;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${s.name}</div>
        </div>
        <span class="today-subject-badge ${badgeClass}" style="flex-shrink:0">${badgeText}</span>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
        <span style="font-size:11px;color:var(--text3)">視聴・課題：${nowLbl}</span>
        <span style="font-family:'Space Mono',monospace;font-size:12px;font-weight:700;color:${color}">${pct}%</span>
      </div>
      <div class="prog-wrap" style="margin-bottom:0"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>
      ${mode==='tomorrow'?`<p class="today-plan-caption">${item.nextSession?`次の予定：${planDateLabel(item.nextSession.day)} ${planTimeLabel(item.nextSession.start)} · ${item.nextSession.kind==='exam'?'期末':`コマ${item.nextSession.lesson}`}`:'予定未配置：予定タブで残りの学習枠を確認してください'}</p>`:''}
      ${btnHtml}
      <div style="display:flex;gap:10px;margin-top:6px;font-size:10px;color:var(--text3)">
        <span><span style="color:${color}">■</span> 完了</span>
        <span><span style="color:var(--red)">■</span> 遅刻</span>
        <span><span style="color:var(--amber)">■</span> 今週</span>
        <span>期末まで記録すると完了</span>
      </div>
    </div>`;
  // スクロール復元はapp.jsの_updateTodayAfterToggleで一元管理（rAF二重実行防止）
}
