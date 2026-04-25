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
    '<div style="font-size:12px;color:var(--text3);text-align:center;margin-top:6px">合計 '+earned.length+' / '+BADGES.length+' バッジ取得済み</div>' +
    '<div style="font-size:11px;color:var(--text3);text-align:center;margin-top:4px">バッジをタップすると必要科目を確認できます</div>';

  var container = document.getElementById('badge-list-container');
  container.innerHTML = '';

  // 専門バッジツリー
  container.appendChild(buildBadgeTree(getBadge, isEarned, getProg, LCFG));

  // 専門以外のカテゴリ（教養・外国語）を動的に収集して表示
  // BADGESから直接categoryを取得することで表示漏れを防ぐ
  var nonSenmonCategories = [];
  BADGES.forEach(function(b) {
    if (b.category && b.category !== '専門' && nonSenmonCategories.indexOf(b.category) === -1) {
      nonSenmonCategories.push(b.category);
    }
  });

  nonSenmonCategories.forEach(function(cat) {
    var catBadges = BADGES.filter(function(b){ return b.category===cat; });
    if (!catBadges.length) return;

    var catIcon = cat === '教養' ? '🌿' : cat === '外国語' ? '🌐' : '📌';
    var section = document.createElement('div');
    section.className = 'card';
    section.style.marginBottom = '12px';
    var html = '<div class="card-label">'+catIcon+' '+cat.toUpperCase()+'</div>';
    html += '<div class="card-title" style="margin-bottom:10px">'+cat+'バッジ</div>';
    catBadges.forEach(function(badge) {
      var ie=isEarned(badge), lcfg=LCFG[badge.level]||LCFG.bronze, p=getProg(badge), pct=p.total>0?Math.round(p.done/p.total*100):0;
      var badgeId = badge.id;
      html += '<div class="badge-card'+(ie?' earned':'')+'" style="'+(ie?'color:'+lcfg.color:'opacity:0.6')+';cursor:pointer;-webkit-tap-highlight-color:transparent" onclick="showBadgeModal(\''+badgeId+'\')">';
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
// バッジ必要科目モーダル
// ============================================================
function showBadgeModal(badgeId) {
  var badge = BADGES.find(function(b){ return b.id===badgeId; });
  if (!badge) return;

  var allCodes = new Set();
  SEMESTERS.forEach(function(sem){ getEnrolledCodes(sem.id).forEach(function(c){ allCodes.add(c); }); });

  var LCFG = BADGE_LEVEL_CONFIG;
  var lcfg = LCFG[badge.level] || LCFG.bronze;
  var req  = badge.requirements || {};
  var codes = req.codes || [];

  var preBadge = req.prerequisite ? BADGES.find(function(b){ return b.id===req.prerequisite; }) : null;

  var existing = document.getElementById('badge-modal');
  if (existing) existing.remove();

  var modal = document.createElement('div');
  modal.id = 'badge-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.7);display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom)';

  var subjectRows = '';
  if (codes.length > 0) {
    codes.forEach(function(code) {
      var s = ALL_SUBJECTS.find(function(x){ return x.code===code; });
      var isEnrolled = allCodes.has(code);
      var name = s ? s.name : code;
      var credits = s ? s.credits+'単位' : '';
      var catColor = s ? getCategoryColor(s.category) : 'var(--text3)';
      subjectRows += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid var(--border)">'
        + '<span style="font-size:16px;flex-shrink:0">'+(isEnrolled?'✅':'⬜')+'</span>'
        + '<div style="width:6px;height:6px;border-radius:50%;background:'+catColor+';flex-shrink:0"></div>'
        + '<div style="flex:1;min-width:0"><div style="font-size:13px;font-weight:'+(isEnrolled?'700':'400')+';color:'+(isEnrolled?'var(--text)':'var(--text2)')+';white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+name+'</div>'
        + '<div style="font-size:10px;color:var(--text3)">'+code+(credits?' ・ '+credits:'')+'</div></div>'
        + '</div>';
    });
  } else {
    subjectRows = '<div style="font-size:12px;color:var(--text3);padding:8px 0">'+(req.description||'条件未定義')+'</div>';
  }

  var doneCount = codes.filter(function(c){ return allCodes.has(c); }).length;
  var pct = codes.length > 0 ? Math.round(doneCount/codes.length*100) : 0;

  var preHtml = '';
  if (preBadge) {
    var preLcfg = LCFG[preBadge.level] || LCFG.bronze;
    preHtml = '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;background:var(--bg3);border-radius:8px;margin-bottom:12px">'
      + '<span style="font-size:14px">🔗</span>'
      + '<div style="font-size:12px;color:var(--text3)">前提バッジ：<span style="color:'+preLcfg.color+';font-weight:700">'+preBadge.name+'</span></div>'
      + '</div>';
  }

  modal.innerHTML = '<div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:80vh;overflow-y:auto;padding:20px 16px">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:16px">'
    + '<div>'
    + '<div style="font-size:10px;font-family:\'Space Mono\',monospace;color:'+lcfg.color+';letter-spacing:2px;margin-bottom:4px">'+lcfg.label.toUpperCase()+'</div>'
    + '<div style="font-size:18px;font-weight:700">'+badge.name+'</div>'
    + '<div style="font-size:12px;color:var(--text3);margin-top:4px">'+doneCount+' / '+codes.length+' 科目履修済み（'+pct+'%）</div>'
    + '</div>'
    + '<button onclick="document.getElementById(\'badge-modal\').remove()" style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer;flex-shrink:0">×</button>'
    + '</div>'
    + (codes.length > 0 ? '<div class="prog-wrap" style="margin-bottom:16px"><div class="prog-bar" style="width:'+pct+'%;background:'+lcfg.color+'"></div></div>' : '')
    + preHtml
    + '<div style="font-size:11px;font-weight:700;color:var(--text3);letter-spacing:1px;margin-bottom:6px">必要科目</div>'
    + subjectRows
    + '</div>';

  modal.addEventListener('click', function(e){ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ============================================================
// バッジツリー（専門）
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
    return '<div onclick="showBadgeModal(\''+id+'\')" style="display:flex;flex-direction:column;align-items:center;justify-content:center;'
      +'padding:7px 4px;border-radius:10px;border:2px solid '+bc+';background:'+bg+';'
      +'width:'+w+'px;flex-shrink:0;box-sizing:border-box;min-height:68px;cursor:pointer;-webkit-tap-highlight-color:transparent">'
      +'<div style="font-size:'+fi+'">'+icon+'</div>'
      +'<div style="font-size:'+fn+';font-weight:700;color:'+tc+';text-align:center;line-height:1.3;margin-top:3px;width:100%">'+b.name+'</div>'
      +bar+'</div>';
  }

  var vls = '<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>';
  var vl4 = '<div style="display:flex;justify-content:space-around"><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div><div style="width:2px;height:10px;background:var(--border)"></div></div>';

  var html = '<div class="card-label">💻 専門</div>';
  html += '<div class="card-title" style="margin-bottom:10px">専門バッジツリー</div>';

  html += '<div style="display:flex;justify-content:center">';
  html += nd('badge-it-bronze', 88);
  html += '</div>';

  html += '<div style="display:flex;justify-content:center">';
  html += '<div style="width:2px;height:10px;background:var(--border)"></div>';
  html += '</div>';

  html += '<div style="position:relative;height:10px;margin:0 2px">';
  html += '<div style="position:absolute;top:0;left:calc(25% - 1px);right:calc(25% - 1px);height:2px;background:var(--border)"></div>';
  html += '<div style="position:absolute;top:0;left:calc(25% - 1px);width:2px;height:10px;background:var(--border)"></div>';
  html += '<div style="position:absolute;top:0;right:calc(25% - 1px);width:2px;height:10px;background:var(--border)"></div>';
  html += '</div>';

  html += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">';

  // 左列: テクノロジー系
  html += '<div style="background:rgba(59,130,246,0.06);border:1px solid rgba(96,165,250,0.2);border-radius:10px;padding:8px 5px">';
  html += '<div style="font-size:9px;font-weight:700;color:#60a5fa;text-align:center;margin-bottom:8px">🔷 テクノロジー系</div>';
  html += '<div style="display:flex;justify-content:center;gap:3px">'+nd('badge-tech1-bronze',58)+nd('badge-math-bronze',58)+'</div>';
  html += '<div style="display:flex;justify-content:center">'+vls+'</div>';
  html += '<div style="display:flex;justify-content:center">'+nd('badge-tech2-silver',72)+'</div>';
  html += vls;
  html += '<div style="display:flex;justify-content:space-between;gap:2px">'+nd('badge-network-gold',40)+nd('badge-security-gold',40)+nd('badge-software-gold',40)+nd('badge-ai-gold',40)+'</div>';
  html += vl4;
  html += '<div style="display:flex;justify-content:space-between;gap:2px">'+nd('badge-network-platinum',40)+nd('badge-security-platinum',40)+nd('badge-software-platinum',40)+nd('badge-ai-platinum',40)+'</div>';
  html += '<div style="border-top:1px dashed rgba(96,165,250,0.3);margin-top:6px;padding-top:6px;display:flex;justify-content:center">'+nd('badge-it-platinum',72)+'</div>';
  html += '</div>';

  // 右列: ビジネス系
  html += '<div style="background:rgba(239,68,68,0.06);border:1px solid rgba(248,113,113,0.2);border-radius:10px;padding:8px 5px">';
  html += '<div style="font-size:9px;font-weight:700;color:#f87171;text-align:center;margin-bottom:8px">🔶 ビジネス系</div>';
  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-bronze',72)+'</div>'+vls;
  html += '<div style="display:flex;justify-content:center">'+nd('badge-biz-silver',72)+'</div>'+vls;
  html += '<div style="display:flex;justify-content:space-between;gap:1px">'+nd('badge-genai-gold',38)+nd('badge-dm-gold',38)+nd('badge-mgmt-gold',38)+nd('badge-startup-gold',38)+nd('badge-biz2-gold',38)+'</div>';
  html += '<div style="display:flex;justify-content:space-between;gap:1px">'
    +'<div style="width:38px"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'<div style="width:2px;height:10px;background:var(--border);margin:0 auto"></div>'
    +'</div>';
  html += '<div style="display:flex;justify-content:space-between;gap:1px">'
    +'<div style="width:38px"></div>'
    +nd('badge-dm-platinum',38)+nd('badge-mgmt-platinum',38)+nd('badge-startup-platinum',38)+nd('badge-biz2-platinum',38)
    +'</div>';
  html += '</div>';

  html += '</div>'; // end grid

  // 凡例
  html += '<div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:12px;padding-top:10px;border-top:1px solid var(--border);font-size:11px;color:var(--text3)">';
  ['bronze','silver','gold','platinum'].forEach(function(l){ html += '<span>'+LCFG[l].icon+' '+LCFG[l].label+'</span>'; });
  html += '</div>';

  wrap.innerHTML = html;
  return wrap;
}
