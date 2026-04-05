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

  listEl.innerHTML = subjects.map(s => `
    <div class="enrolled-item">
      <div class="enrolled-dot" style="background:${getCategoryColor(s.category)}"></div>
      <div class="enrolled-name">${s.name}</div>
      <div class="enrolled-credits">${s.credits}単位</div>
    </div>
  `).join('');

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
