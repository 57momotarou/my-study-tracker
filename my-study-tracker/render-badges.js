// ============================================================
// my-study-tracker - render-badges.js（ビジュアルツリー）
// ============================================================

function renderBadgesPage() {
  var allCodes = new Set();
  SEMESTERS.forEach(function(sem){ getEnrolledCodes(sem.id).forEach(function(c){ allCodes.add(c); }); });

  function isEarned(badge) {
    if (!badge || !badge.requirements) return false;
    var req = badge.requirements;
    if (req.prerequisite) {
      var pre = BADGES.find(function(b){ return b.id===req.prerequisite; });
      if (pre && !isEarned(pre)) return false;
    }
    if (!req.codes || !req.codes.length) return false;
    return req.codes.every(function(c){ return allCodes.has(c); });
  }
  function getProg(badge) {
    if (!badge) return {done:0,total:0};
    var req = badge.requirements;
    if (!req || !req.codes || !req.codes.length) return {done:0,total:0};
    return { done: req.codes.filter(function(c){ return allCodes.has(c); }).length, total: req.codes.length };
  }
  function getBadge(id){ return BADGES.find(function(b){ return b.id===id; }); }

  var LCFG   = BADGE_LEVEL_CONFIG;
  var earned = BADGES.filter(function(b){ return isEarned(b); });
  var counts = ['bronze','silver','gold','platinum'].map(function(l){
    return earned.filter(function(b){ return b.level===l; }).length;
  });

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
  container.appendChild(buildBadgeTree(getBadge, isEarned, getProg, LCFG));

  ['教養','外国語'].forEach(function(cat) {
    var catBadges = BADGES.filter(function(b){ return b.category===cat; });
    if (!catBadges.length) return;
    var section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    var html = '<div class="card-label">'+((CATEGORY_CONFIG[cat]&&CATEGORY_CONFIG[cat].icon)||'📌')+' '+cat.toUpperCase()+'</div>';
    html += '<div class="card-title" style="margin-bottom:10px">'+cat+'バッジ</div>';
    catBadges.forEach(function(badge) {
      var ie=isEarned(badge), lcfg=LCFG[badge.level]||LCFG.bronze, p=getProg(badge), pct=p.total>0?Math.round(p.done/p.total*100):0;
      html += '<div class="badge-card'+(ie?' earned':'')+'" style="'+(ie?'color:'+lcfg.color:'opacity:0.6')+'">';
      html += '<div class="badge-icon">'+(ie?lcfg.icon:'🔒')+'</div>';
      html += '<div class="badge-info">';
      html += '<div class="badge-level-tag" style="'+(ie?'background:'+lcfg.bg+';color:'+lcfg.color:'background:var(--bg3);color:var(--text3)')+'">'+lcfg.label+'</div>';
      html += '<div class="badge-name">'+badge.name+'</div>';
      if (p.total>0) {
        html += '<div class="badge-progress-text" style="color:'+(ie?lcfg.color:'var(--text3)')+'">'+p.done+'/'+p.total+' 科目 ('+pct+'%)</div>';
        html += '<div class="prog-wrap" style="margin-top:4px"><div class="prog-bar" style="width:'+pct+'%;background:'+(ie?lcfg.color:'var(--text3)')+'"></div></div>';
      } else {
        html += '<div class="badge-meta">'+((badge.requirements&&badge.requirements.description)||'')+'</div>';
      }
      html += '</div></div>';
    });
    section.innerHTML = html;
    container.appendChild(section);
  });
}

// ============================================================
// バッジツリー
// 完全縦積み：テクノロジー系→ビジネス系 の順に縦に並べる
// ============================================================
function buildBadgeTree(getBadge, isEarned, getProg, LCFG) {
  var wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.marginBottom = '12px';

  function nd(id, w) {
    var b = getBadge(id);
    if (!b) return '';
    var ie=isEarned(b), lcfg=LCFG[b.level]||LCFG.bronze, p=getProg(b);
    var pct=p.total>0?Math.round(p.done/p.total*100):0;
    var icon=ie?lcfg.icon:'🔒';
    var bc=ie?lcfg.color:'var(--border)', bg=ie?lcfg.color+'1a':'var(--bg3)', tc=ie?lcfg.color:'var(--text3)';
    var fn=w>=80?'10px':w>=64?'9px':'8px';
    var fi=w>=80?'16px':w>=64?'14px':'12px';
    var bar='';
    if (p.total>0) {
      bar='<div style="font-size:7px;color:var(--text3);margin-top:2px">'+p.done+'/'+p.total+'</div>'
        +'<div style="width:75%;height:3px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:2px">'
        +'<div style="width:'+pct+'%;height:100%;background:'+(ie?lcfg.color:'#444')+'"></div></div>';
    }
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +'padding:7px 4px;border-radius:10px;border:2px solid '+bc+';background:'+bg+';'
      +'width:'+w+'px;flex-shrink:0;box-sizing:border-box;min-height:68px">'
      +'<div style="font-size:'+fi+'">'+icon+'</div>'
      +'<div style="font-size:'+fn+';font-weight:700;color:'+tc+';text-align:center;line-height:1.3;margin-top:3px;width:100%">'+b.name+'</div>'
      +bar+'</div>';
  }

  var vl  = '<div style="width:2px;height:14px;background:var(--border);margin:0 auto"></div>';
  var vls = '<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>';
  // 4列の縦線セット
  var vl4 = '<div style="display:flex;justify-content:space-around"><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div></div>';
  var vl5 = '<div style="display:flex;justify-content:space-around"><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div></div>';

  var html = '<div class="card-label">💻 専門</div>';
  html += '<div class="card-title" style="margin-bottom:14px">専門バッジツリー</div>';

  // 横スクロール対応ラッパー
  html += '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch;margin:0 -4px;padding:0 4px 8px">';
  html += '<div style="min-width:320px">';

  // ルート：IT総合学基礎 ── flex center で確実に中央
  html += '<div style="display:flex;justify-content:center;margin-bottom:0">'+nd('badge-it-bronze',96)+'</div>';

  // 分岐ライン（SVG: 中央から左右へ）
  html += '<svg width="100%" height="24" style="display:block">'
    +'<line x1="50%" y1="0" x2="50%" y2="14" stroke="var(--border)" stroke-width="2"/>'
    +'<line x1="25%" y1="14" x2="75%" y2="14" stroke="var(--border)" stroke-width="2"/>'
    +'<line x1="25%" y1="14" x2="25%" y2="24" stroke="var(--border)" stroke-width="2"/>'
    +'<line x1="75%" y1="14" x2="75%" y2="24" stroke="var(--border)" stroke-width="2"/>'
    +'</svg>';

  // 2列グリッド
  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px;align-items:start">';

  // ─── テクノロジー系（左列） ───
  html += '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:8px 6px">';
  html += '<div style="font-size:9px;font-weight:700;color:#60a5fa;text-align:center;margin-bottom:8px">🔷 テクノロジー系</div>';
  html += '<div style="display:flex;justify-content:center;gap:4px">'+nd('badge-tech1-bronze',64)+nd('badge-math-bronze',64)+'</div>';
  html += '<div style="display:flex;justify-content:center">'+vls+'</div>';
  html += '<div style="display:flex;justify-content:center">'+nd('badge-tech2-silver',80)+'</div>';
  html += vls;
  html += '<div style="display:flex;justify-content:space-between;gap:2px">'+nd('badge-network-gold',48)+nd('badge-security-gold',48)+nd('badge-software-gold',48)+nd('badge-ai-gold',48)+'</div>';
  html += vl4;
  html += '<div style="display:flex;justify-content:space-between;gap:2px">'+nd('badge-network-platinum',48)+nd('badge-security-platinum',48)+nd('badge-software-platinum',48)+nd('badge-ai-platinum',48)+'</div>';
  html += '<div style="border-top:1px dashed rgba(96,165,250,0.3);margin-top:6px;padding-top:6px;display:flex;justify-content:center">'+nd('badge-it-platinum',80)+'</div>';
  html += '</div>';

  // ─── ビジネス系（右列） ───
  html += '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:8px 6px">';
  html += '<div style="font-size:9px;font-weight:700;color:#f87171;text-align:center;margin-bottom:8px">🔶 ビジネス系</div>';
  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-bronze',80)+'</div>'+vls;
  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-silver',80)+'</div>'+vls;
  html += '<div style="display:flex;justify-content:space-between;gap:1px">'+nd('badge-genai-gold',46)+nd('badge-dm-gold',46)+nd('badge-mgmt-gold',46)+nd('badge-startup-gold',46)+nd('badge-biz2-gold',46)+'</div>';
  html += '<div style="display:flex;justify-content:space-between;gap:1px"><div style="width:46px"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div></div>';
  html += '<div style="display:flex;justify-content:space-between;gap:1px"><div style="width:46px"></div>'+nd('badge-dm-platinum',46)+nd('badge-mgmt-platinum',46)+nd('badge-startup-platinum',46)+nd('badge-biz2-platinum',46)+'</div>';
  html += '</div>';

  html += '</div>'; // end 2col grid
  html += '</div>'; // end min-width
  html += '</div>'; // end scroll

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)">';
  ['bronze','silver','gold','platinum'].forEach(function(l){ html += '<span>'+LCFG[l].icon+' '+LCFG[l].label+'</span>'; });
  html += '</div>';

  wrap.innerHTML = html;
  return wrap;
}
