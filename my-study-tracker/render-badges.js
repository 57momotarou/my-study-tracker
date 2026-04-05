// ============================================================
// my-study-tracker - render-badges.js
// バッジタブ（ビジュアルツリー表示）
// ============================================================

function renderBadgesPage() {
  const allCodes = new Set();
  SEMESTERS.forEach(sem => getEnrolledCodes(sem.id).forEach(c => allCodes.add(c)));

  function isBadgeEarned(badge) {
    if (!badge.requirements) return false;
    const req = badge.requirements;
    if (req.prerequisite) {
      const pre = BADGES.find(b => b.id === req.prerequisite);
      if (pre && !isBadgeEarned(pre)) return false;
    }
    if (!req.codes || req.codes.length === 0) return false;
    return req.codes.every(c => allCodes.has(c));
  }

  function getProgress(badge) {
    const req = badge.requirements;
    if (!req || !req.codes || req.codes.length === 0) return { done:0, total:0 };
    return { done: req.codes.filter(c => allCodes.has(c)).length, total: req.codes.length };
  }

  const LCFG = BADGE_LEVEL_CONFIG;
  const earned = BADGES.filter(b => isBadgeEarned(b));

  // ── サマリー ──
  const summaryEl = document.getElementById('badge-summary');
  const bronze   = earned.filter(b=>b.level==='bronze').length;
  const silver   = earned.filter(b=>b.level==='silver').length;
  const gold     = earned.filter(b=>b.level==='gold').length;
  const platinum = earned.filter(b=>b.level==='platinum').length;
  summaryEl.innerHTML = `
    <div class="badge-summary-grid">
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#cd7f32">${bronze}</div><div class="badge-summary-label">🥉 ブロンズ</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#94a3b8">${silver}</div><div class="badge-summary-label">🥈 シルバー</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:var(--amber)">${gold}</div><div class="badge-summary-label">🥇 ゴールド</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#67e8f9">${platinum}</div><div class="badge-summary-label">💎 プラチナ</div></div>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px">合計 ${earned.length} / ${BADGES.length} バッジ取得済み</div>`;

  const containerEl = document.getElementById('badge-list-container');
  containerEl.innerHTML = '';

  // ── 専門科目：ビジュアルツリー ──
  containerEl.appendChild(buildSpecialtyTree(isBadgeEarned, getProgress, LCFG));

  // ── 教養・外国語：コンパクトリスト ──
  const otherCategories = ['教養', '外国語'];
  otherCategories.forEach(cat => {
    const catBadges = BADGES.filter(b => b.category === cat);
    if (catBadges.length === 0) return;
    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    section.innerHTML = `<div class="card-label">${CATEGORY_CONFIG[cat]?.icon || '📌'} ${cat.toUpperCase()}</div>
      <div class="card-title" style="margin-bottom:10px">${cat}バッジ</div>`;
    catBadges.forEach(badge => {
      const isEarned = isBadgeEarned(badge);
      const lcfg     = LCFG[badge.level] || LCFG.bronze;
      const prog     = getProgress(badge);
      const pct      = prog.total > 0 ? Math.round(prog.done/prog.total*100) : 0;
      const item     = document.createElement('div');
      item.className = `badge-card${isEarned?' earned':''}`;
      item.style.opacity = isEarned ? '1' : '0.6';
      if (isEarned) item.style.color = lcfg.color;
      item.innerHTML = `
        <div class="badge-icon">${isEarned ? lcfg.icon : '🔒'}</div>
        <div class="badge-info">
          <div class="badge-level-tag" style="${isEarned?`background:${lcfg.bg};color:${lcfg.color}`:'background:var(--bg3);color:var(--text3)'}">${lcfg.label}</div>
          <div class="badge-name">${badge.name}</div>
          ${prog.total > 0 ? `
            <div class="badge-progress-text" style="color:${isEarned?lcfg.color:'var(--text3)'}">${prog.done}/${prog.total} 科目 (${pct}%)</div>
            <div class="prog-wrap" style="margin-top:4px"><div class="prog-bar" style="width:${pct}%;background:${isEarned?lcfg.color:'var(--text3)'}"></div></div>
          ` : `<div class="badge-meta">${badge.requirements?.description||''}</div>`}
        </div>`;
      section.appendChild(item);
    });
    containerEl.appendChild(section);
  });
}

// ============================================================
// 専門科目ビジュアルツリー
// ============================================================
function buildSpecialtyTree(isBadgeEarned, getProgress, LCFG) {
  const section = document.createElement('div');
  section.className = 'card';
  section.style.marginBottom = '12px';
  section.innerHTML = `<div class="card-label">💻 専門</div><div class="card-title" style="margin-bottom:14px">専門バッジツリー</div>`;

  // バッジ取得状況を便利に参照
  function getBadge(id)     { return BADGES.find(b => b.id === id); }
  function earned(id)       { const b=getBadge(id); return b && isBadgeEarned(b); }
  function prog(id)         { const b=getBadge(id); return b ? getProgress(b) : {done:0,total:0}; }
  function badgeNode(id, compact) {
    const b      = getBadge(id);
    if (!b) return '';
    const lcfg   = LCFG[b.level] || LCFG.bronze;
    const isE    = isBadgeEarned(b);
    const p      = getProgress(b);
    const pct    = p.total>0 ? Math.round(p.done/p.total*100) : 0;
    const icon   = isE ? lcfg.icon : '🔒';
    if (compact) {
      return `<div class="btree-node ${isE?'btree-earned':''}" style="border-color:${isE?lcfg.color:'var(--border)'};background:${isE?lcfg.color+'22':'var(--bg3)'}">
        <div style="font-size:16px">${icon}</div>
        <div style="font-size:10px;font-weight:700;color:${isE?lcfg.color:'var(--text3)'};margin-top:2px;text-align:center;line-height:1.2">${b.name}</div>
        ${p.total>0?`<div style="font-size:9px;color:var(--text3);margin-top:3px">${p.done}/${p.total}</div>`:''}
        ${p.total>0&&!isE?`<div class="btree-mini-bar"><div style="width:${pct}%;background:${lcfg.color};height:100%;border-radius:99px"></div></div>`:''}
      </div>`;
    }
    return `<div class="btree-node btree-root ${isE?'btree-earned':''}" style="border-color:${isE?lcfg.color:'var(--border)'};background:${isE?lcfg.color+'22':'var(--bg3)'}">
      <div style="font-size:20px">${icon}</div>
      <div style="font-size:11px;font-weight:700;color:${isE?lcfg.color:'var(--text2)'};margin-top:3px;text-align:center;line-height:1.3">${b.name}</div>
      ${p.total>0?`<div style="font-size:10px;color:var(--text3);margin-top:2px">${p.done}/${p.total}科目</div>`:''}
      ${p.total>0?`<div class="btree-mini-bar" style="width:60px"><div style="width:${pct}%;background:${isE?lcfg.color:'var(--text3)'};height:100%;border-radius:99px"></div></div>`:''}
    </div>`;
  }

  // ── テクノロジー系ツリー ──
  const techHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--text3);margin-bottom:8px;letter-spacing:1px">── テクノロジー系 ──</div>

    <!-- ルート -->
    <div class="btree-row btree-center">
      ${badgeNode('badge-it-bronze')}
    </div>
    <div class="btree-connector-v"></div>

    <!-- シルバー分岐 -->
    <div class="btree-row btree-spaced">
      ${badgeNode('badge-tech1-silver', true)}
      ${badgeNode('badge-math-silver', true)}
    </div>
    <div class="btree-row btree-spaced" style="padding:0 10%">
      <div class="btree-connector-v" style="flex:1"></div>
      <div style="flex:1"></div>
    </div>

    <!-- テクノロジー基礎Ⅱ（テクノロジー基礎Ⅰの下のみ） -->
    <div class="btree-row" style="justify-content:flex-start;padding-left:calc(25% - 32px)">
      ${badgeNode('badge-tech2-silver', true)}
    </div>
    <div class="btree-connector-v" style="margin-left:25%"></div>

    <!-- ゴールド4種 -->
    <div class="btree-row btree-spaced">
      ${badgeNode('badge-network-gold', true)}
      ${badgeNode('badge-security-gold', true)}
      ${badgeNode('badge-software-gold', true)}
      ${badgeNode('badge-ai-gold', true)}
    </div>
    <div class="btree-row btree-spaced">
      <div class="btree-connector-v" style="flex:1"></div>
      <div class="btree-connector-v" style="flex:1"></div>
      <div class="btree-connector-v" style="flex:1"></div>
      <div class="btree-connector-v" style="flex:1"></div>
    </div>

    <!-- プラチナ4種 -->
    <div class="btree-row btree-spaced">
      ${badgeNode('badge-network-platinum', true)}
      ${badgeNode('badge-security-platinum', true)}
      ${badgeNode('badge-software-platinum', true)}
      ${badgeNode('badge-ai-platinum', true)}
    </div>`;

  // ── ビジネス系ツリー ──
  const bizHTML = `
    <div style="font-size:11px;font-weight:700;color:var(--text3);margin:16px 0 8px;letter-spacing:1px">── ビジネス系 ──</div>

    <div class="btree-row btree-center">
      ${badgeNode('badge-biz-silver')}
    </div>
    <div class="btree-connector-v"></div>

    <!-- ゴールド5種 -->
    <div class="btree-row btree-spaced">
      ${badgeNode('badge-genai-gold', true)}
      ${badgeNode('badge-dm-gold', true)}
      ${badgeNode('badge-mgmt-gold', true)}
      ${badgeNode('badge-startup-gold', true)}
      ${badgeNode('badge-biz2-gold', true)}
    </div>
    <div class="btree-row btree-spaced">
      ${[1,2,3,4,5].map(()=>`<div class="btree-connector-v" style="flex:1"></div>`).join('')}
    </div>
    <div class="btree-row btree-spaced">
      <div></div>
      ${badgeNode('badge-dm-platinum', true)}
      ${badgeNode('badge-mgmt-platinum', true)}
      ${badgeNode('badge-startup-platinum', true)}
      ${badgeNode('badge-biz2-platinum', true)}
    </div>`;

  const treeDiv = document.createElement('div');
  treeDiv.className = 'btree-wrapper';
  treeDiv.innerHTML = techHTML + bizHTML;
  section.appendChild(treeDiv);
  return section;
}
