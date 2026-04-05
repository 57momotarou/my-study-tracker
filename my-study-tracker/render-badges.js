// ============================================================
// my-study-tracker - render-badges.js
// バッジタブ（ビジュアルツリー表示）
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
    if (!req.codes || !req.codes.length) return false;
    return req.codes.every(c => allCodes.has(c));
  }
  function getProg(badge) {
    const req = badge.requirements;
    if (!req || !req.codes || !req.codes.length) return { done:0, total:0 };
    return { done: req.codes.filter(c => allCodes.has(c)).length, total: req.codes.length };
  }

  const LCFG = BADGE_LEVEL_CONFIG;
  const earned = BADGES.filter(b => isEarned(b));
  const counts = ['bronze','silver','gold','platinum'].map(l => earned.filter(b=>b.level===l).length);

  document.getElementById('badge-summary').innerHTML = `
    <div class="badge-summary-grid">
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#cd7f32">${counts[0]}</div><div class="badge-summary-label">🥉 ブロンズ</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#94a3b8">${counts[1]}</div><div class="badge-summary-label">🥈 シルバー</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:var(--amber)">${counts[2]}</div><div class="badge-summary-label">🥇 ゴールド</div></div>
      <div class="badge-summary-item"><div class="badge-summary-num" style="color:#67e8f9">${counts[3]}</div><div class="badge-summary-label">💎 プラチナ</div></div>
    </div>
    <div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px">合計 ${earned.length} / ${BADGES.length} バッジ取得済み</div>`;

  const container = document.getElementById('badge-list-container');
  container.innerHTML = '';
  container.appendChild(buildBadgeTree(isEarned, getProg, LCFG));

  ['教養','外国語'].forEach(cat => {
    const catBadges = BADGES.filter(b => b.category === cat);
    if (!catBadges.length) return;
    const section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    let html = '<div class="card-label">' + (CATEGORY_CONFIG[cat]&&CATEGORY_CONFIG[cat].icon||'📌') + ' ' + cat.toUpperCase() + '</div>';
    html += '<div class="card-title" style="margin-bottom:10px">' + cat + 'バッジ</div>';
    catBadges.forEach(function(badge) {
      var ie   = isEarned(badge);
      var lcfg = LCFG[badge.level]||LCFG.bronze;
      var p    = getProg(badge);
      var pct  = p.total>0 ? Math.round(p.done/p.total*100) : 0;
      html += '<div class="badge-card' + (ie?' earned':'') + '" style="' + (ie?'color:'+lcfg.color:'opacity:0.6') + '">';
      html += '<div class="badge-icon">' + (ie?lcfg.icon:'🔒') + '</div>';
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

function buildBadgeTree(isEarned, getProg, LCFG) {
  var wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.marginBottom = '12px';

  function getBadge(id) { return BADGES.find(function(b){return b.id===id;}); }

  function node(id, size) {
    var b = getBadge(id);
    if (!b) return '';
    var ie   = isEarned(b);
    var lcfg = LCFG[b.level]||LCFG.bronze;
    var p    = getProg(b);
    var pct  = p.total>0 ? Math.round(p.done/p.total*100) : 0;
    var icon = ie ? lcfg.icon : '🔒';
    var w    = size==='lg'?'82px' : size==='md'?'70px' : '56px';
    var fi   = size==='lg'?'18px' : size==='md'?'15px' : '13px';
    var fn   = size==='lg'?'10px' : size==='md'?'9px'  : '8px';
    var bc   = ie ? lcfg.color : 'var(--border)';
    var bg   = ie ? lcfg.color+'20' : 'var(--bg3)';
    var nc   = ie ? lcfg.color : 'var(--text3)';
    var bar  = '';
    if (p.total > 0) {
      bar = '<div style="font-size:7px;color:var(--text3);margin-top:1px">'+p.done+'/'+p.total+'</div>'
          + '<div style="width:80%;height:2px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:2px">'
          + '<div style="width:'+pct+'%;height:100%;background:'+(ie?lcfg.color:'var(--text3)')+'"></div></div>';
    }
    return '<div style="display:flex;flex-direction:column;align-items:center;padding:5px 3px;border-radius:8px;border:1px solid '+bc+';background:'+bg+';width:'+w+';flex-shrink:0;box-sizing:border-box">'
      + '<div style="font-size:'+fi+'">'+icon+'</div>'
      + '<div style="font-size:'+fn+';font-weight:700;color:'+nc+';text-align:center;line-height:1.3;margin-top:2px;overflow:hidden;width:100%;word-break:keep-all">'+b.name+'</div>'
      + bar + '</div>';
  }

  var vl = '<div style="width:1px;height:12px;background:var(--border);margin:0 auto"></div>';
  var vls4 = [0,1,2,3].map(function(){return '<div style="flex:1;display:flex;justify-content:center">'+vl+'</div>';}).join('');
  var vls5 = '<div style="flex:1"></div>'+[0,1,2,3].map(function(){return '<div style="flex:1;display:flex;justify-content:center">'+vl+'</div>';}).join('');

  var html = '<div class="card-label">💻 専門</div>'
    + '<div class="card-title" style="margin-bottom:12px">専門バッジツリー</div>'
    + '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><div style="min-width:280px">';

  // 共通ルート
  html += '<div style="text-align:center">'+node('badge-it-bronze','md')+'</div>'+vl;

  // 横2分割
  html += '<div style="display:flex;gap:4px;align-items:flex-start">';

  // テクノロジー系
  html += '<div style="flex:1;min-width:0;background:rgba(59,130,246,0.06);border-radius:8px;padding:6px 4px">'
    + '<div style="font-size:8px;font-weight:700;color:#60a5fa;text-align:center;margin-bottom:6px">テクノロジー系</div>';
  html += '<div style="display:flex;justify-content:center;gap:3px">'+node('badge-tech1-silver','sm')+node('badge-math-silver','sm')+'</div>';
  html += '<div style="display:flex;justify-content:flex-start;padding-left:4px">'+vl+'</div>';
  html += '<div style="display:flex;justify-content:flex-start;padding-left:4px">'+node('badge-tech2-silver','sm')+'</div>';
  html += vl;
  html += '<div style="display:flex;justify-content:space-around;gap:2px">'+node('badge-network-gold','sm')+node('badge-security-gold','sm')+node('badge-software-gold','sm')+node('badge-ai-gold','sm')+'</div>';
  html += '<div style="display:flex;justify-content:space-around">'+vls4+'</div>';
  html += '<div style="display:flex;justify-content:space-around;gap:2px;margin-bottom:6px">'+node('badge-network-platinum','sm')+node('badge-security-platinum','sm')+node('badge-software-platinum','sm')+node('badge-ai-platinum','sm')+'</div>';
  html += '<div style="border-top:1px dashed var(--border);padding-top:5px;text-align:center">'
    + '<div style="font-size:7px;color:var(--text3);margin-bottom:3px">IT総合学</div>'
    + node('badge-it-platinum','sm')+'</div>';
  html += '</div>'; // end テクノロジー系

  // ビジネス系
  html += '<div style="flex:1;min-width:0;background:rgba(239,68,68,0.06);border-radius:8px;padding:6px 4px">'
    + '<div style="font-size:8px;font-weight:700;color:#f87171;text-align:center;margin-bottom:6px">ビジネス系</div>';
  html += '<div style="text-align:center">'+node('badge-biz-silver','md')+'</div>'+vl;
  html += '<div style="display:flex;justify-content:space-around;gap:1px">'+node('badge-genai-gold','sm')+node('badge-dm-gold','sm')+node('badge-mgmt-gold','sm')+node('badge-startup-gold','sm')+node('badge-biz2-gold','sm')+'</div>';
  html += '<div style="display:flex;justify-content:space-around">'+vls5+'</div>';
  html += '<div style="display:flex;justify-content:space-around;gap:1px;margin-bottom:6px">'
    + '<div style="flex:1"></div>'
    + node('badge-dm-platinum','sm')+node('badge-mgmt-platinum','sm')+node('badge-startup-platinum','sm')+node('badge-biz2-platinum','sm')+'</div>';
  html += '</div>'; // end ビジネス系

  html += '</div>'; // end 横2分割

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:10px;padding-top:8px;border-top:1px solid var(--border);font-size:10px;color:var(--text3)">';
  ['bronze','silver','gold','platinum'].forEach(function(l){
    html += '<span>'+LCFG[l].icon+' '+LCFG[l].label+'</span>';
  });
  html += '</div>';
  html += '</div></div>'; // end min-width / overflow-x

  wrap.innerHTML = html;
  return wrap;
}
