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
// バッジツリー（縦積み・全幅使用で見やすく）
// ============================================================
function buildBadgeTree(getBadge, isEarned, getProg, LCFG) {
  var wrap = document.createElement('div');
  wrap.className = 'card';
  wrap.style.marginBottom = '12px';

  // ノード（幅固定、テキスト折り返しあり）
  function nd(id, w) {
    var b = getBadge(id);
    if (!b) return '';
    var ie=isEarned(b), lcfg=LCFG[b.level]||LCFG.bronze, p=getProg(b);
    var pct=p.total>0?Math.round(p.done/p.total*100):0;
    var icon=ie?lcfg.icon:'🔒';
    var bc=ie?lcfg.color:'var(--border)', bg=ie?lcfg.color+'1a':'var(--bg3)', tc=ie?lcfg.color:'var(--text3)';
    var fi=w>=88?'18px':w>=72?'16px':w>=60?'14px':'12px';
    var fn=w>=88?'10px':w>=72?'9.5px':w>=60?'9px':'8px';
    var bar='';
    if (p.total>0) {
      bar='<div style="font-size:7px;color:var(--text3);margin-top:2px">'+p.done+'/'+p.total+'</div>'
        +'<div style="width:75%;height:3px;background:var(--bg2);border-radius:99px;overflow:hidden;margin-top:2px">'
        +'<div style="width:'+pct+'%;height:100%;background:'+(ie?lcfg.color:'#444')+'"></div></div>';
    }
    return '<div style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +'padding:7px 4px;border-radius:10px;border:2px solid '+bc+';background:'+bg+';'
      +'width:'+w+'px;flex-shrink:0;box-sizing:border-box;min-height:72px">'
      +'<div style="font-size:'+fi+'">'+icon+'</div>'
      +'<div style="font-size:'+fn+';font-weight:700;color:'+tc+';text-align:center;line-height:1.3;margin-top:3px;width:100%;">'+b.name+'</div>'
      +bar+'</div>';
  }

  // 縦線
  var vl  = '<div style="width:2px;height:16px;background:var(--border);margin:0 auto"></div>';
  var vls = '<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>';
  // 横分岐線（子ノード群の上）
  function hline(totalW) {
    return '<div style="width:'+totalW+'px;height:2px;background:var(--border);margin:0 auto"></div>';
  }
  // 各子の上に縦線（flex間隔に合わせる）
  function childVlines(count, nodeW, gap) {
    var items = [];
    for (var i=0;i<count;i++) items.push('<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>');
    return '<div style="display:flex;gap:'+(nodeW+gap-2)+'px;justify-content:center">'+items.join('')+'</div>';
  }

  var html = '<div style="overflow-x:auto;-webkit-overflow-scrolling:touch"><div style="min-width:340px">';
  html += '<div class="card-label">💻 専門</div>';
  html += '<div class="card-title" style="margin-bottom:14px">専門バッジツリー</div>';

  // ── ルート：IT総合学基礎 ──
  html += '<div style="display:flex;justify-content:center">'+nd('badge-it-bronze',100)+'</div>';

  // 左右分岐ライン
  html += '<div style="position:relative;height:24px;margin:0 auto;width:70%">'
    +'<div style="position:absolute;top:0;left:50%;transform:translateX(-50%);width:2px;height:24px;background:var(--border)"></div>'
    +'<div style="position:absolute;top:14px;left:10%;right:10%;height:2px;background:var(--border)"></div>'
    +'<div style="position:absolute;bottom:0;left:10%;width:2px;height:10px;background:var(--border)"></div>'
    +'<div style="position:absolute;bottom:0;right:10%;width:2px;height:10px;background:var(--border)"></div>'
    +'</div>';

  // テクノロジー系 ｜ ビジネス系
  html += '<div style="display:flex;gap:6px;align-items:flex-start">';

  // ────── テクノロジー系（左・全幅の半分） ──────
  html += '<div style="flex:1;min-width:0">';
  html += '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:10px 8px">';
  html += '<div style="font-size:10px;font-weight:700;color:#60a5fa;text-align:center;margin-bottom:10px">🔷 テクノロジー系</div>';

  // テクノロジー基礎Ⅰ ＋ 数学基礎（横並び）
  html += '<div style="display:flex;justify-content:center;gap:6px">'+nd('badge-tech1-bronze',72)+nd('badge-math-bronze',72)+'</div>';
  // Ⅰの下だけ縦線
  html += '<div style="display:flex;justify-content:flex-start;padding-left:calc(50% - 37px - 3px)">'+vls+'</div>';
  // テクノロジー基礎Ⅱ（中央寄せ）
  html += '<div style="display:flex;justify-content:flex-start;padding-left:calc(50% - 44px)">'+nd('badge-tech2-silver',88)+'</div>';
  html += vl;
  // ゴールド4種（全幅）
  html += '<div style="display:flex;justify-content:space-between;gap:4px">'+nd('badge-network-gold',60)+nd('badge-security-gold',60)+nd('badge-software-gold',60)+nd('badge-ai-gold',60)+'</div>';
  html += '<div style="display:flex;justify-content:space-between;padding:0 30px">'+vls+vls+vls+vls+'</div>';
  // プラチナ4種（全幅）
  html += '<div style="display:flex;justify-content:space-between;gap:4px">'+nd('badge-network-platinum',60)+nd('badge-security-platinum',60)+nd('badge-software-platinum',60)+nd('badge-ai-platinum',60)+'</div>';
  // IT総合学プラチナ（点線区切り）
  html += '<div style="border-top:1px dashed rgba(96,165,250,0.3);margin-top:8px;padding-top:8px;display:flex;justify-content:center">'+nd('badge-it-platinum',88)+'</div>';
  html += '</div>'; // end bg block
  html += '</div>'; // end テクノロジー系

  // ────── ビジネス系（右・全幅の半分） ──────
  html += '<div style="flex:1;min-width:0">';
  html += '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:10px 8px">';
  html += '<div style="font-size:10px;font-weight:700;color:#f87171;text-align:center;margin-bottom:10px">🔶 ビジネス系</div>';

  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-bronze',88)+'</div>';
  html += vls;
  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-silver',88)+'</div>';
  html += vl;
  // ゴールド5種（1行横並び）
  html += '<div style="display:flex;justify-content:center;gap:5px">';
  html += nd('badge-genai-gold',60)+nd('badge-dm-gold',60)+nd('badge-mgmt-gold',60)+nd('badge-startup-gold',60)+nd('badge-biz2-gold',60);
  html += '</div>';
  html += '<div style="display:flex;justify-content:flex-end;gap:5px;padding-right:0">';
  html += vls+vls+vls+vls;
  html += '</div>';
  // プラチナ4種（生成AIなし）
  html += '<div style="display:flex;justify-content:center;gap:5px">';
  html += '<div style="width:65px"></div>';
  html += nd('badge-dm-platinum',60)+nd('badge-mgmt-platinum',60)+nd('badge-startup-platinum',60)+nd('badge-biz2-platinum',60);
  html += '</div>';
  html += '</div>'; // end bg block
  html += '</div>'; // end ビジネス系

  html += '</div>'; // end flex row

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;gap:12px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)">';
  ['bronze','silver','gold','platinum'].forEach(function(l){ html += '<span>'+LCFG[l].icon+' '+LCFG[l].label+'</span>'; });
  html += '</div>';
  html += '</div></div>'; // スクロールラッパー終了

  wrap.innerHTML = html;
  return wrap;
}
