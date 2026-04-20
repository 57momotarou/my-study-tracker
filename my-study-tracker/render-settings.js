// ============================================================
// my-study-tracker - render-settings.js
// 設定タブ（履修科目選択）の描画
// ============================================================

function renderSettingsPage() {
  // 学期タブ
  const tabsEl = document.getElementById('semester-tabs');
  tabsEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const btn = document.createElement('button');
    btn.className = 'sem-tab' + (sem.id === state.currentSemesterId ? ' active' : '');
    btn.textContent = sem.name;
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderHeader();
      renderSettingsPage();
    });
    tabsEl.appendChild(btn);
  });

  // カテゴリフィルター
  const filterEl = document.getElementById('subject-filters');
  filterEl.innerHTML = '';
  [
    { key: 'all', label: 'すべて' },
    { key: '専門', label: '💻 専門' },
    { key: '教養', label: '🌿 教養' },
    { key: '外国語', label: '🌐 外国語' },
  ].forEach(f => {
    const btn = document.createElement('button');
    btn.className = `filter-btn f-${f.key}${state.activeSubjectFilter === f.key ? ' active' : ''}`;
    btn.textContent = f.label;
    btn.addEventListener('click', () => {
      state.activeSubjectFilter = f.key;
      renderSettingsPage();
    });
    filterEl.appendChild(btn);
  });

  const enrolled = getEnrolledCodes(state.currentSemesterId);

  // 他の学期で選択済みのコードを収集（今の学期は除く）
  const enrolledInOtherSems = new Set();
  SEMESTERS.forEach(sem => {
    if (sem.id === state.currentSemesterId) return;
    getEnrolledCodes(sem.id).forEach(code => enrolledInOtherSems.add(code));
  });

  const baseList = state.activeSubjectFilter === 'all'
    ? ALL_SUBJECTS
    : ALL_SUBJECTS.filter(s => s.category === state.activeSubjectFilter);

  // 他学期選択済みは非表示（今学期選択済みは表示）
  const filtered = baseList.filter(s =>
    !enrolledInOtherSems.has(s.code) || enrolled.includes(s.code)
  );

  // カテゴリ/タイプでグループ化
  const groups = {};
  filtered.forEach(s => {
    const key = `${s.category} / ${s.type}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const listEl = document.getElementById('subject-list');
  listEl.innerHTML = '';
  Object.entries(groups).forEach(([groupName, subjects]) => {
    listEl.innerHTML += `<div class="subject-group-title">${groupName}</div>`;
    subjects.forEach(s => {
      const isChecked = enrolled.includes(s.code);
      const color = getCategoryColor(s.category);
      const openTag = s.open_type === '一斉'
        ? `<span style="font-size:10px;color:var(--blue);margin-left:4px;">○一斉</span>`
        : '';
      listEl.innerHTML += `
        <div class="subject-row ${isChecked ? 'checked' : ''}" data-code="${s.code}">
          <div class="subject-row-check" style="${isChecked ? `background:${color};border-color:${color}` : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="subject-row-info">
            <div class="subject-row-name">${s.name}${openTag}</div>
            <div class="subject-row-meta">${s.code} ・ ${s.type} ・ ${s.lessons}回</div>
          </div>
          <div class="subject-row-credits">${s.credits}単位</div>
        </div>`;
    });
  });

  // チェックボックスのクリックイベント
  listEl.querySelectorAll('.subject-row').forEach(row => {
    row.addEventListener('click', () => {
      const code = row.dataset.code;
      const semId = state.currentSemesterId;
      if (!state.enrollments[semId]) state.enrollments[semId] = [];
      const idx = state.enrollments[semId].indexOf(code);
      if (idx >= 0) state.enrollments[semId].splice(idx, 1);
      else state.enrollments[semId].push(code);
      saveState();
      renderHeader();
      renderSettingsPage();
    });
  });

  renderEnrolledSummary();
  renderOpenDateList(state.currentSemesterId);
  renderGraduationChecker(state.currentSemesterId);
}

function renderEnrolledSummary() {
  const semId = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);
  const listEl = document.getElementById('enrolled-list');
  const statsEl = document.getElementById('enrolled-stats');

  if (subjects.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:12px;">上のリストから科目を選択してください</div>`;
    statsEl.innerHTML = '';
    return;
  }

  // カテゴリ順にソート（専門→教養→外国語）
  const catOrder = {'専門':0,'教養':1,'外国語':2};
  const sorted = [...subjects].sort((a,b) => (catOrder[a.category]??9) - (catOrder[b.category]??9));

  // カテゴリ区切りを挿入しながら描画
  let html = '';
  let lastCat = null;
  sorted.forEach(s => {
    if (s.category !== lastCat) {
      lastCat = s.category;
      const catColor = getCategoryColor(s.category);
      const catLabel = s.category === '専門' ? '💻 専門' : s.category === '教養' ? '🌿 教養' : '🌐 外国語';
      html += `<div style="font-size:10px;font-weight:700;color:${catColor};letter-spacing:1px;padding:8px 0 4px;border-bottom:1px solid ${catColor}44;margin-bottom:4px">${catLabel}</div>`;
    }
    html += `<div class="enrolled-item">
      <div class="enrolled-dot" style="background:${getCategoryColor(s.category)}"></div>
      <div class="enrolled-name">${s.name}</div>
      <div class="enrolled-credits">${s.credits}単位</div>
    </div>`;
  });
  listEl.innerHTML = html;

  const totalCredits = subjects.reduce((a, s) => a + s.credits, 0);
  const senmonCount  = subjects.filter(s => s.category === '専門').length;
  const kyoyoCount   = subjects.filter(s => s.category === '教養').length;
  const foreignCount = subjects.filter(s => s.category === '外国語').length;

  statsEl.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-num" style="color:var(--amber)">${totalCredits}</div>
      <div class="stat-box-label">合計単位</div>
    </div>
    <div class="stat-box">
      <div class="stat-box-num">${senmonCount}</div>
      <div class="stat-box-label">専門科目</div>
    </div>
    <div class="stat-box">
      <div class="stat-box-num">${kyoyoCount + foreignCount}</div>
      <div class="stat-box-label">教養+外国語</div>
    </div>`;
}

// ============================================================
// 開講日一覧（設定タブ内）
// ============================================================
function renderOpenDateList(semId) {
  var sem      = SEMESTERS.find(function(s){ return s.id===semId; }) || SEMESTERS[0];
  var subjects = getEnrolledSubjects(semId);
  var el       = document.getElementById('open-date-list');
  if (!el) return;
  if (!subjects.length) { el.innerHTML=''; return; }
  if (!sem.attendance)  { el.innerHTML='<div style="font-size:12px;color:var(--text3)">この学期の開講日データはありません</div>'; return; }

  // 各科目の開講日・締切を収集
  var rows = subjects.map(function(s) {
    var key = getAttendanceKey(s, sem);
    var openDate = null, closeDate = null;

    if (key && sem.attendance[key]) {
      var tbl = sem.attendance[key];
      // 開講日（コマ1のstart、または後期開講日）
      if (key === 'kyoyo_koki') {
        openDate = new Date(typeof KYOYO_KOKI_START !== 'undefined' ? KYOYO_KOKI_START : '2026-05-26');
      } else if (tbl[1]) {
        var e1 = tbl[1];
        if (typeof e1 === 'object' && e1.start) openDate = new Date(e1.start);
        else openDate = new Date(sem.start);
      } else {
        openDate = new Date(sem.start);
      }
      // 最終締切（最後のコマ）
      var lastN = s.lessons;
      var last  = tbl[lastN];
      if (last) closeDate = new Date(typeof last === 'string' ? last : last.end);
    } else {
      openDate  = new Date(sem.start);
    }

    var now       = new Date();
    var isOpen    = openDate && openDate <= now;
    var color     = getCategoryColor(s.category);
    var openStr   = openDate  ? openDate.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}) : '-';
    var closeStr  = closeDate ? closeDate.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}) : '-';
    var openType  = s.open_type === '一斉' ? '一斉' : '順次';
    var ttDay     = getTimetableDay(s.code, semId);
    var dayNames  = ['月','火','水','木','金','土'];
    var dayStr    = ttDay !== undefined ? dayNames[ttDay]+'曜' : '';

    return { s, color, isOpen, openStr, closeStr, openType, dayStr };
  }).sort(function(a,b){
    // 開講日順（未開講→開講済み→完了）
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1;
    return a.openStr.localeCompare(b.openStr);
  });

  var html = '';
  html += '<div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;margin-bottom:4px">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 6px">科目</div>';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 4px">開講</div>';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 4px">最終</div>';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 4px">曜日</div>';
  html += '</div>';

  rows.forEach(function(row) {
    var bg     = row.isOpen ? 'transparent' : 'rgba(255,255,255,0.02)';
    var op     = row.isOpen ? '1' : '0.5';
    var badge  = row.isOpen
      ? '<span style="font-size:9px;background:var(--green-dim,rgba(16,185,129,0.15));color:var(--green);padding:1px 5px;border-radius:99px">開講中</span>'
      : '<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 5px;border-radius:99px">開講前</span>';
    html += '<div style="display:grid;grid-template-columns:1fr auto auto auto;gap:0;border-bottom:1px solid var(--border);background:'+bg+';opacity:'+op+'">';
    html += '<div style="padding:7px 6px;min-width:0">';
    html += '<div style="display:flex;align-items:center;gap:5px">';
    html += '<div style="width:6px;height:6px;border-radius:50%;background:'+row.color+';flex-shrink:0"></div>';
    html += '<div style="font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+row.s.name+'</div>';
    html += '</div>';
    html += '<div style="font-size:9px;color:var(--text3);margin-top:1px;padding-left:11px">'+row.openType+' '+badge+'</div>';
    html += '</div>';
    html += '<div style="padding:7px 4px;font-size:11px;color:var(--text2);white-space:nowrap;align-self:center">'+row.openStr+'</div>';
    html += '<div style="padding:7px 4px;font-size:11px;color:var(--text3);white-space:nowrap;align-self:center">'+row.closeStr+'</div>';
    html += '<div style="padding:7px 4px;font-size:11px;color:#60a5fa;white-space:nowrap;align-self:center">'+row.dayStr+'</div>';
    html += '</div>';
  });

  el.innerHTML = html;
}

// ============================================================
// 卒業単位チェッカー
// サイバー大学卒業要件：124単位（必修26単位含む）
//   専門：62単位以上（必修16単位）
//   教養：38単位以上（必修2単位）
//   外国語：8単位（全必修）
// ============================================================
function renderGraduationChecker(semId) {
  var el = document.getElementById('graduation-content');
  if (!el) return;

  var allSubjects = [];
  var allCodes = new Set();
  SEMESTERS.forEach(function(sem) {
    getEnrolledSubjects(sem.id).forEach(function(s) {
      if (!allCodes.has(s.code)) { allCodes.add(s.code); allSubjects.push(s); }
    });
  });

  var REQUIRED_CODES = ['BA101','CS101','CS102','CS103','CS153','CS154','CS156','PM101',
    'SD101E','SD301E','ENGL101E','ENGL151E','ENGL201E','ENGL251E'];
  var GRAD_TOTAL = 124, GRAD_SENMON = 62, GRAD_KYOYO = 38, GRAD_GAIKOKUGO = 8;

  var earned = {'専門':0,'教養':0,'外国語':0};
  allSubjects.forEach(function(s){ earned[s.category] = (earned[s.category]||0) + s.credits; });

  var requiredDone = 0, requiredMissing = [];
  REQUIRED_CODES.forEach(function(code) {
    if (allCodes.has(code)) { requiredDone++; }
    else { var s=ALL_SUBJECTS.find(function(x){return x.code===code;}); if(s) requiredMissing.push(s); }
  });

  var totalEarned = (earned['専門']||0)+(earned['教養']||0)+(earned['外国語']||0);
  var totalPct = Math.min(100, Math.round(totalEarned/GRAD_TOTAL*100));

  function bar(pct, color) {
    return '<div class="prog-wrap" style="height:5px"><div class="prog-bar" style="width:'+pct+'%;background:'+color+'"></div></div>';
  }
  function row(label, done, need, color) {
    var pct=Math.min(100,Math.round(done/need*100)), ok=done>=need;
    var c=ok?'var(--green)':color;
    return '<div style="margin-bottom:10px">'
      +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">'
      +'<span style="font-size:12px;color:var(--text2)">'+label+'</span>'
      +'<span style="font-size:12px;font-weight:700;color:'+c+'">'+done+'<span style="color:var(--text3);font-weight:400">/'+need+'単位</span>'+(ok?' ✅':'')+'</span>'
      +'</div>'+bar(pct,c)+'</div>';
  }

  var html = '<div style="text-align:center;margin-bottom:16px">'
    +'<div style="font-size:36px;font-weight:700;color:'+(totalPct>=100?'var(--green)':'var(--amber)')+'">'+totalPct+'%</div>'
    +'<div style="font-size:11px;color:var(--text3);margin-top:2px">'+totalEarned+' / '+GRAD_TOTAL+' 単位取得済み</div>'
    +'</div>';

  html += '<div class="prog-wrap" style="height:8px;margin-bottom:16px"><div class="prog-bar" style="width:'+totalPct+'%;background:'+(totalPct>=100?'var(--green)':'var(--amber)')+'"></div></div>';

  html += row('専門科目', earned['専門']||0, GRAD_SENMON, 'var(--amber)');
  html += row('教養科目', earned['教養']||0, GRAD_KYOYO, 'var(--green)');
  html += row('外国語科目', earned['外国語']||0, GRAD_GAIKOKUGO, 'var(--purple)');

  html += '<div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border)">'
    +'<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">'
    +'<span style="font-size:12px;font-weight:700;color:var(--text2)">必修科目</span>'
    +'<span style="font-size:12px;color:'+(requiredMissing.length===0?'var(--green)':'var(--red)')+'">'+requiredDone+'/'+REQUIRED_CODES.length+(requiredMissing.length===0?' ✅':'')+'</span>'
    +'</div>';

  if (requiredMissing.length > 0) {
    html += '<div style="font-size:10px;color:var(--red);margin-bottom:4px">未履修の必修科目：</div>';
    requiredMissing.forEach(function(s) {
      html += '<div style="display:flex;align-items:center;gap:6px;padding:3px 0;font-size:11px;color:var(--text3)">'
        +'<div style="width:5px;height:5px;border-radius:50%;background:var(--red);flex-shrink:0"></div>'
        +s.name+'<span style="font-size:10px;color:var(--text3)">('+s.credits+'単位)</span></div>';
    });
  } else {
    html += '<div style="font-size:11px;color:var(--green)">すべての必修科目を履修済みです</div>';
  }
  html += '</div>';

  var remaining = Math.max(0, GRAD_TOTAL - totalEarned);
  if (remaining > 0) {
    html += '<div style="margin-top:10px;padding:8px 12px;background:var(--bg3);border-radius:8px;font-size:11px;color:var(--text3);text-align:center">'
      +'あと <span style="color:var(--amber);font-weight:700">'+remaining+'</span> 単位で卒業要件達成</div>';
  } else {
    html += '<div style="margin-top:10px;padding:8px 12px;background:var(--green-dim);border-radius:8px;font-size:12px;color:var(--green);text-align:center;font-weight:700">🎓 卒業単位要件達成！</div>';
  }

  el.innerHTML = html;
}
