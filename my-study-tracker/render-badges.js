// ============================================================
// my-study-tracker - render-badges.js
// バッジタブ（ビジュアルツリー表示）
// ============================================================

function renderBadgesPage() {
  const allCodes = new Set();
  SEMESTERS.forEach(function(sem){ getEnrolledCodes(sem.id).forEach(function(c){ allCodes.add(c); }); });

  function isEarned(badge) {
    if (!badge || !badge.requirements) return false;
    var req = badge.requirements;
    if (req.prerequisite) {
      var pre = BADGES.find(function(b){ return b.id === req.prerequisite; });
      if (pre && !isEarned(pre)) return false;
    }
    if (!req.codes || !req.codes.length) return false;
    return req.codes.every(function(c){ return allCodes.has(c); });
  }
  function getProg(badge) {
    if (!badge) return { done:0, total:0 };
    var req = badge.requirements;
    if (!req || !req.codes || !req.codes.length) return { done:0, total:0 };
    return { done: req.codes.filter(function(c){ return allCodes.has(c); }).length, total: req.codes.length };
  }
  function getBadge(id) { return BADGES.find(function(b){ return b.id === id; }); }

  var LCFG = BADGE_LEVEL_CONFIG;
  var earned = BADGES.filter(function(b){ return isEarned(b); });
  var counts = ['bronze','silver','gold','platinum'].map(function(l){
    return earned.filter(function(b){ return b.level===l; }).length;
  });

  // ── サマリー ──
  document.getElementById('badge-summary').innerHTML =
    '<div class="badge-summary-grid">' +
    '<div class="badge-summary-item"><div class="badge-summary-num" style="color:#cd7f32">'+counts[0]+'</div><div class="badge-summary-label">🥉 ブロンズ</div></div>' +
    '<div class="badge-summary-item"><div class="badge-summary-num" style="color:#94a3b8">'+counts[1]+'</div><div class="badge-summary-label">🥈 シルバー</div></div>' +
    '<div class="badge-summary-item"><div class="badge-summary-num" style="color:var(--amber)">'+counts[2]+'</div><div class="badge-summary-label">🥇 ゴールド</div></div>' +
    '<div class="badge-summary-item"><div class="badge-summary-num" style="color:#67e8f9">'+counts[3]+'</div><div class="badge-summary-label">💎 プラチナ</div></div>' +
    '</div>' +
    '<div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px">合計 '+earned.length+' / '+BADGES.length+' バッジ取得済み</div>';

  var container = document.getElementById('badge-list-container');
  container.innerHTML = '';

  // ── 専門ツリー ──
  container.appendChild(buildBadgeTree(getBadge, isEarned, getProg, LCFG));

  // ── 教養・外国語リスト ──
  ['教養','外国語'].forEach(function(cat) {
    var catBadges = BADGES.filter(function(b){ return b.category === cat; });
    if (!catBadges.length) return;
    var section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    var html = '<div class="card-label">' + ((CATEGORY_CONFIG[cat]&&CATEGORY_CONFIG[cat].icon)||'📌') + ' ' + cat.toUpperCase() + '</div>';
    html += '<div class="card-title" style="margin-bottom:10px">' + cat + 'バッジ</div>';
    catBadges.forEach(function(badge) {
      var ie   = isEarned(badge);
      var lcfg = LCFG[badge.level] || LCFG.bronze;
      var p    = getProg(badge);
      var pct  = p.total>0 ? Math.round(p.done/p.total*100) : 0;
      html += '<div class="badge-card' + (ie?' earned':'') + '" style="' + (ie?'color:'+lcfg.color:'opacity:0.6') + '">';
      html += '<div class="badge-icon">' + (ie ? lcfg.icon : '🔒') + '</div>';
      html += '<div class="badge-info">';
      html += '<div class="badge-level-tag" style="' + (ie?'background:'+lcfg.bg+';color:'+lcfg.color:'background:var(--bg3);color:var(--text3)') + '">' + lcfg.label + '</div>';
      html += '<div class="badge-name">' + badge.name + '</div>';
      if (p.total > 0) {
        html += '<div class="badge-progress-text" style="color:' + (ie?lcfg.color:'var(--text3)') + '">' + p.done + '/' + p.total + ' 科目 (' + pct + '%)</div>';
        html += '<div class="prog-wrap" style="margin-top:4px"><div class="prog-bar" style="width:' + pct + '%;background:' + (ie?lcfg.color:'var(--text3)') + '"></div></div>';
      } else {
        html += '<div class="badge-meta">' + ((badge.requirements&&badge.requirements.description)||'') + '</div>';
      }
      html += '</div></div>';
    });
    section.innerHTML = html;
    container.appendChild(section);
  });
}

// ============================================================
// ビジュアルツリー（data.jsの実際のバッジIDに基づく）
// ツリー構造：
//  テクノロジー系: badge-tech-bronze → badge-tech-silver → [badge-network-gold, badge-security-gold, badge-software-gold, badge-ai-gold]
//  ビジネス系:    badge-biz-bronze  → badge-biz-silver  → [badge-genai-gold, badge-dm-gold, badge-mgmt-gold, badge-startup-gold, badge-biz2-gold]
// ============================================================
function buildBadgeTree(getBadge, isEarned, getProg, LCFG) {
  var wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.marginBottom = '12px';

  // ノード描画関数
  function node(id, w) {
    var b = getBadge(id);
    if (!b) return '<div style="width:'+w+'px"></div>';
    var ie   = isEarned(b);
    var lcfg = LCFG[b.level] || LCFG.bronze;
    var p    = getProg(b);
    var pct  = p.total>0 ? Math.round(p.done/p.total*100) : 0;
    var icon = ie ? lcfg.icon : '🔒';
    var bc   = ie ? lcfg.color : 'var(--border)';
    var bg   = ie ? lcfg.color+'22' : 'var(--bg3)';
    var tc   = ie ? lcfg.color : 'var(--text3)';
    var fi   = w >= 80 ? '16px' : w >= 64 ? '14px' : '12px';
    var fn   = w >= 80 ? '10px' : w >= 64 ? '9px' : '8px';

    var inner = '<div style="font-size:'+fi+'">'+icon+'</div>';
    inner += '<div style="font-size:'+fn+';font-weight:700;color:'+tc+';text-align:center;line-height:1.3;margin-top:3px;width:100%;overflow:hidden">'+b.name+'</div>';
    if (p.total > 0) {
      inner += '<div style="font-size:7px;color:var(--text3);margin-top:2px">'+p.done+'/'+p.total+'</div>';
      inner += '<div style="width:85%;height:2px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:2px">';
      inner += '<div style="width:'+pct+'%;height:100%;background:'+(ie?lcfg.color:'var(--text3)')+'"></div></div>';
    }
    return '<div style="display:flex;flex-direction:column;align-items:center;padding:7px 4px;border-radius:10px;border:2px solid '+bc+';background:'+bg+';width:'+w+'px;flex-shrink:0;box-sizing:border-box">'+inner+'</div>';
  }

  // 垂直接続線
  function vline(h) { return '<div style="width:1px;height:'+(h||14)+'px;background:var(--border);margin:0 auto"></div>'; }
  // 水平広がり線（子ノード間を繋ぐ）
  function hbar() { return '<div style="height:1px;background:var(--border);flex:1;margin-bottom:'+14+'px;align-self:flex-start;margin-top:'+(14/2)+'px"></div>'; }

  var html = '';
  html += '<div class="card-label">💻 専門</div>';
  html += '<div class="card-title" style="margin-bottom:14px">専門バッジツリー</div>';

  // ──────────────────────────────────────────────────────
  // テクノロジー系（左ブロック）
  // ──────────────────────────────────────────────────────
  html += '<div style="background:rgba(59,130,246,0.07);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:12px 10px;margin-bottom:12px">';
  html += '<div style="font-size:10px;font-weight:700;color:#60a5fa;margin-bottom:10px">🔷 テクノロジー系</div>';

  // Lv1: テクノロジー基礎（中央）
  html += '<div style="display:flex;justify-content:center;margin-bottom:0">'+node('badge-tech-bronze', 76)+'</div>';
  html += vline(12);
  // Lv2: テクノロジー基礎Ⅱ（中央）
  html += '<div style="display:flex;justify-content:center;margin-bottom:0">'+node('badge-tech-silver', 76)+'</div>';
  html += vline(12);
  // Lv3: ゴールド4種（横並び）
  html += '<div style="display:flex;justify-content:center;gap:6px">';
  html += node('badge-network-gold', 64);
  html += node('badge-security-gold', 64);
  html += node('badge-software-gold', 64);
  html += node('badge-ai-gold', 64);
  html += '</div>';

  html += '</div>'; // end テクノロジー系

  // ──────────────────────────────────────────────────────
  // ビジネス系（右ブロック）
  // ──────────────────────────────────────────────────────
  html += '<div style="background:rgba(239,68,68,0.07);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:12px 10px;margin-bottom:12px">';
  html += '<div style="font-size:10px;font-weight:700;color:#f87171;margin-bottom:10px">🔶 ビジネス系</div>';

  // Lv1: ビジネス基礎
  html += '<div style="display:flex;justify-content:center;margin-bottom:0">'+node('badge-biz-bronze', 76)+'</div>';
  html += vline(12);
  // Lv2: ビジネス基礎Ⅱ
  html += '<div style="display:flex;justify-content:center;margin-bottom:0">'+node('badge-biz-silver', 76)+'</div>';
  html += vline(12);
  // Lv3: ゴールド5種（横並び・少し小さめ）
  html += '<div style="display:flex;justify-content:center;gap:4px">';
  html += node('badge-genai-gold', 58);
  html += node('badge-dm-gold', 58);
  html += node('badge-mgmt-gold', 58);
  html += node('badge-startup-gold', 58);
  html += node('badge-biz2-gold', 58);
  html += '</div>';

  html += '</div>'; // end ビジネス系

  // ── 凡例 ──
  html += '<div style="display:flex;flex-wrap:wrap;gap:10px;padding-top:8px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)">';
  ['bronze','silver','gold'].forEach(function(l){
    html += '<span>'+LCFG[l].icon+' '+LCFG[l].label+'</span>';
  });
  html += '</div>';

  wrap.innerHTML = html;
  return wrap;
}
