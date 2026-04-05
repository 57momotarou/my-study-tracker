// ============================================================
// my-study-tracker - render-badges.js
// バッジタブ（ビジュアルツリー）
// ============================================================

function renderBadgesPage() {
  const allCodes = new Set();
  SEMESTERS.forEach(sem => getEnrolledCodes(sem.id).forEach(c => allCodes.add(c)));

  function isEarned(badge) {
    if (!badge.requirements) return false;
    const req = badge.requirements;
    if (req.prerequisite) {
      const pre = BADGES.find(b => b.id === req.prerequisite);
      if (pre && !isEarned(pre)) return false;
    }
    if (!req.codes || req.codes.length === 0) return false;
    return req.codes.every(c => allCodes.has(c));
  }
  function getProg(badge) {
    const req = badge.requirements;
    if (!req || !req.codes || !req.codes.length) return {done:0,total:0};
    return { done: req.codes.filter(c => allCodes.has(c)).length, total: req.codes.length };
  }

  const LCFG = BADGE_LEVEL_CONFIG;
  const earned = BADGES.filter(b => isEarned(b));

  // サマリー
  const summaryEl = document.getElementById('badge-summary');
  const [bronze,silver,gold,platinum] = ['bronze','silver','gold','platinum'].map(l => earned.filter(b=>b.level===l).length);
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

  // ── ビジュアルツリー（専門） ──
  containerEl.appendChild(buildBadgeTree(isEarned, getProg, LCFG));

  // ── 教養・外国語：コンパクトリスト ──
  ['教養','外国語'].forEach(cat => {
    const catBadges = BADGES.filter(b => b.category === cat);
    if (!catBadges.length) return;
    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    let html = `<div class="card-label">${CATEGORY_CONFIG[cat]?.icon||'📌'} ${cat.toUpperCase()}</div>
      <div class="card-title" style="margin-bottom:10px">${cat}バッジ</div>`;
    catBadges.forEach(badge => {
      const ie   = isEarned(badge);
      const lcfg = LCFG[badge.level]||LCFG.bronze;
      const p    = getProg(badge);
      const pct  = p.total>0?Math.round(p.done/p.total*100):0;
      html += `<div class="badge-card${ie?' earned':''}" style="${ie?`color:${lcfg.color}`:'opacity:0.6'}">
        <div class="badge-icon">${ie?lcfg.icon:'🔒'}</div>
        <div class="badge-info">
          <div class="badge-level-tag" style="${ie?`background:${lcfg.bg};color:${lcfg.color}`:'background:var(--bg3);color:var(--text3)'}">${lcfg.label}</div>
          <div class="badge-name">${badge.name}</div>
          ${p.total>0?`<div class="badge-progress-text" style="color:${ie?lcfg.color:'var(--text3)'}">${p.done}/${p.total} 科目 (${pct}%)</div>
            <div class="prog-wrap" style="margin-top:4px"><div class="prog-bar" style="width:${pct}%;background:${ie?lcfg.color:'var(--text3)'}"></div></div>`
          :`<div class="badge-meta">${badge.requirements?.description||''}</div>`}
        </div></div>`;
    });
    section.innerHTML = html;
    containerEl.appendChild(section);
  });
}

// ============================================================
// バッジツリー本体（画像2枚目の構造に完全一致）
// ============================================================
function buildBadgeTree(isEarned, getProg, LCFG) {
  const section = document.createElement('div');
  section.className = 'card';
  section.style.marginBottom = '12px';

  function getBadge(id)   { return BADGES.find(b=>b.id===id); }
  function earned(id)     { const b=getBadge(id); return b&&isEarned(b); }

  // ノードHTML生成
  function node(id, size='sm') {
    const b    = getBadge(id);
    if (!b) return '<div></div>';
    const lcfg = LCFG[b.level]||LCFG.bronze;
    const ie   = isEarned(b);
    const p    = getProg(b);
    const pct  = p.total>0?Math.round(p.done/p.total*100):0;
    const icon = ie?lcfg.icon:'🔒';
    const sz   = size==='lg'?{w:'84px',fIcon:'20px',fName:'11px',fSub:'10px'}
                :size==='md'?{w:'72px',fIcon:'16px',fName:'10px',fSub:'9px'}
                :            {w:'60px',fIcon:'14px',fName:'9px', fSub:'8px'};
    return `<div style="display:flex;flex-direction:column;align-items:center;padding:7px 4px;border-radius:10px;border:1px solid ${ie?lcfg.color:'var(--border)'};background:${ie?lcfg.color+'22':'var(--bg3)'};width:${sz.w};flex-shrink:0;box-sizing:border-box">
      <div style="font-size:${sz.fIcon}">${icon}</div>
      <div style="font-size:${sz.fName};font-weight:700;color:${ie?lcfg.color:'var(--text2)'};text-align:center;line-height:1.3;margin-top:3px;word-break:keep-all">${b.name}</div>
      ${p.total>0?`<div style="font-size:${sz.fSub};color:var(--text3);margin-top:2px">${p.done}/${p.total}</div>
      <div style="width:80%;height:3px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:2px">
        <div style="width:${pct}%;height:100%;background:${ie?lcfg.color:'var(--text3)'}"></div></div>`:''}
    </div>`;
  }
  function vLine(h='14px') {
    return `<div style="width:2px;height:${h};background:var(--border);margin:0 auto"></div>`;
  }
  function hBranch(count) {
    // 横線で繋ぐ
    return `<div style="display:flex;align-items:center;height:2px;margin:0 auto;width:90%">
      <div style="flex:1;height:2px;background:var(--border)"></div>
    </div>`;
  }

  // ── レイアウト ──
  let html = `<div class="card-label">💻 専門</div><div class="card-title" style="margin-bottom:12px">専門バッジツリー</div>`;

  // ==============================
  // テクノロジー系 + ビジネス系（横2分割）
  // ==============================
  html += `<div style="display:flex;gap:6px">`;

  // ── テクノロジー系 ──
  html += `<div style="flex:1;min-width:0;background:rgba(59,130,246,0.05);border-radius:8px;padding:8px 4px">
    <div style="font-size:9px;font-weight:700;color:#60a5fa;text-align:center;margin-bottom:8px;letter-spacing:1px">テクノロジー系</div>`;

  // IT総合学基礎ブロンズ（共通ルート）
  html += `<div style="text-align:center;margin-bottom:0">${node('badge-it-bronze','md')}</div>`;
  html += vLine('12px');

  // テクノロジー基礎Ⅰ・数学基礎（横並び）
  html += `<div style="display:flex;justify-content:center;gap:6px;margin-bottom:0">
    ${node('badge-tech1-silver','sm')}
    ${node('badge-math-silver','sm')}
  </div>`;
  html += `<div style="display:flex;justify-content:flex-start;padding-left:8px">${vLine('12px')}</div>`;

  // テクノロジー基礎Ⅱ（テクノロジー基礎Ⅰの下）
  html += `<div style="display:flex;justify-content:flex-start;padding-left:8px;margin-bottom:0">${node('badge-tech2-silver','sm')}</div>`;
  html += vLine('12px');

  // ゴールド4種
  html += `<div style="display:flex;justify-content:space-around;gap:3px;margin-bottom:0">
    ${node('badge-network-gold','sm')}
    ${node('badge-security-gold','sm')}
    ${node('badge-software-gold','sm')}
    ${node('badge-ai-gold','sm')}
  </div>`;
  // 縦線4本
  html += `<div style="display:flex;justify-content:space-around;gap:3px">
    ${[1,2,3,4].map(()=>`<div style="flex:1;display:flex;justify-content:center">${vLine('10px')}</div>`).join('')}
  </div>`;

  // プラチナ4種
  html += `<div style="display:flex;justify-content:space-around;gap:3px;margin-bottom:6px">
    ${node('badge-network-platinum','sm')}
    ${node('badge-security-platinum','sm')}
    ${node('badge-software-platinum','sm')}
    ${node('badge-ai-platinum','sm')}
  </div>`;

  // IT総合学プラチナ（別行）
  html += `<div style="text-align:center;border-top:1px dashed var(--border);padding-top:6px">${node('badge-it-platinum','sm')}</div>`;
  html += `</div>`; // end テクノロジー系

  // ── ビジネス系 ──
  html += `<div style="flex:1;min-width:0;background:rgba(239,68,68,0.05);border-radius:8px;padding:8px 4px">
    <div style="font-size:9px;font-weight:700;color:#f87171;text-align:center;margin-bottom:8px;letter-spacing:1px">ビジネス系</div>`;

  // IT総合学基礎から（同じルート）→ビジネス基礎
  html += `<div style="text-align:center;margin-bottom:0">${node('badge-it-bronze','md')}</div>`;
  html += vLine('12px');
  html += `<div style="text-align:center;margin-bottom:0">${node('badge-biz-silver','md')}</div>`;
  html += vLine('12px');

  // ゴールド5種（生成AI・DM・管理・起業・経営）
  html += `<div style="display:flex;justify-content:space-around;gap:2px;margin-bottom:0">
    ${node('badge-genai-gold','sm')}
    ${node('badge-dm-gold','sm')}
    ${node('badge-mgmt-gold','sm')}
    ${node('badge-startup-gold','sm')}
    ${node('badge-biz2-gold','sm')}
  </div>`;
  // 縦線（生成AIにはプラチナなし）
  html += `<div style="display:flex;justify-content:space-around;gap:2px">
    <div style="flex:1"></div>
    ${[1,2,3,4].map(()=>`<div style="flex:1;display:flex;justify-content:center">${vLine('10px')}</div>`).join('')}
  </div>`;

  // プラチナ4種（生成AIは除く・DMからスタート）
  html += `<div style="display:flex;justify-content:space-around;gap:2px;margin-bottom:6px">
    <div style="flex:1"></div>
    ${node('badge-dm-platinum','sm')}
    ${node('badge-mgmt-platinum','sm')}
    ${node('badge-startup-platinum','sm')}
    ${node('badge-biz2-platinum','sm')}
  </div>`;

  html += `</div>`; // end ビジネス系
  html += `</div>`; // end 横2分割

  // 凡例
  html += `<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">`;
  ['bronze','silver','gold','platinum'].forEach(l => {
    const lcfg=LCFG[l];
    html+=`<span>${lcfg.icon} ${lcfg.label}</span>`;
  });
  html+=`</div>`;

  section.innerHTML = html;
  return section;
}
