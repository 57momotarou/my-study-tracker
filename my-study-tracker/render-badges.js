// ============================================================
// my-study-tracker - render-badges.js
// バッジタブの描画
// ============================================================

function renderBadgesPage() {
  const allCodes = new Set();
  SEMESTERS.forEach(sem => getEnrolledCodes(sem.id).forEach(c => allCodes.add(c)));

  function isBadgeEarned(badge) {
    if (!badge.requirements) return false;
    const req = badge.requirements;
    if (req.prerequisite) {
      const prereq = BADGES.find(b => b.id === req.prerequisite);
      if (prereq && !isBadgeEarned(prereq)) return false;
    }
    if (req.codes) return req.codes.every(c => allCodes.has(c));
    return false;
  }

  function getBadgeProgress(badge) {
    const req = badge.requirements;
    if (!req || !req.codes) return { done: 0, total: 0 };
    const done = req.codes.filter(c => allCodes.has(c)).length;
    return { done, total: req.codes.length };
  }

  const earned = BADGES.filter(b => isBadgeEarned(b));
  const summaryEl = document.getElementById('badge-summary');
  const bronze   = earned.filter(b => b.level === 'bronze').length;
  const silver   = earned.filter(b => b.level === 'silver').length;
  const gold     = earned.filter(b => b.level === 'gold').length;
  const platinum = earned.filter(b => b.level === 'platinum').length;

  summaryEl.innerHTML = `
    <div class="badge-summary-grid">
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#cd7f32">${bronze}</div>
        <div class="badge-summary-label">🥉 ブロンズ</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#94a3b8">${silver}</div>
        <div class="badge-summary-label">🥈 シルバー</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:var(--amber)">${gold}</div>
        <div class="badge-summary-label">🥇 ゴールド</div>
      </div>
      <div class="badge-summary-item">
        <div class="badge-summary-num" style="color:#67e8f9">${platinum}</div>
        <div class="badge-summary-label">💎 プラチナ</div>
      </div>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px;">
      合計 ${earned.length} / ${BADGES.length} バッジ取得済み
    </div>`;

  const containerEl = document.getElementById('badge-list-container');
  containerEl.innerHTML = '';
  const categories = [...new Set(BADGES.map(b => b.category))];
  categories.forEach(cat => {
    const catBadges = BADGES.filter(b => b.category === cat);
    const cfg = BADGE_LEVEL_CONFIG;
    let html = `<div class="badge-section-title">${CATEGORY_CONFIG[cat]?.icon || '📌'} ${cat}</div>`;
    catBadges.forEach(badge => {
      const isEarned = isBadgeEarned(badge);
      const levelCfg = cfg[badge.level] || cfg.bronze;
      const prog = getBadgeProgress(badge);
      const pct = prog.total > 0 ? Math.round(prog.done / prog.total * 100) : 0;
      html += `
        <div class="badge-card ${isEarned ? 'earned' : ''}" style="${isEarned ? `color:${levelCfg.color}` : 'opacity:0.6'}">
          <div class="badge-icon">${isEarned ? levelCfg.icon : '🔒'}</div>
          <div class="badge-info">
            <div class="badge-level-tag" style="${isEarned ? `background:${levelCfg.bg};color:${levelCfg.color}` : 'background:var(--bg3);color:var(--text3)'}">${levelCfg.label}</div>
            <div class="badge-name">${badge.name}</div>
            ${badge.requirements?.codes ? `
              <div class="badge-progress-text" style="color:${isEarned ? levelCfg.color : 'var(--text3)'}">
                ${prog.done}/${prog.total} 科目 (${pct}%)
              </div>
              <div class="prog-wrap" style="margin-top:4px">
                <div class="prog-bar" style="width:${pct}%;background:${isEarned ? levelCfg.color : 'var(--text3)'}"></div>
              </div>
            ` : `<div class="badge-meta">${badge.requirements?.description || ''}</div>`}
          </div>
        </div>`;
    });
    containerEl.innerHTML += html;
  });
}
