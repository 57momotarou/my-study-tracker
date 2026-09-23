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
  const semester = getCurrentSemester();

  // 他の学期で選択済みのコードを収集（今の学期は除く）
  const enrolledInOtherSems = new Set();
  SEMESTERS.forEach(sem => {
    if (sem.id === state.currentSemesterId) return;
    getEnrolledCodes(sem.id).forEach(code => enrolledInOtherSems.add(code));
  });

  const baseList = state.activeSubjectFilter === 'all'
    ? ALL_SUBJECTS
    : ALL_SUBJECTS.filter(s => s.category === state.activeSubjectFilter);

  // 他学期で履修した科目も、再履修として選択できる。
  const search = (document.getElementById('subject-search')?.value || '').trim().toLocaleLowerCase();
  const filtered = baseList.filter(s =>
    (!s.legacy || enrolled.includes(s.code))
    && (!search || `${s.code} ${s.name}`.toLocaleLowerCase().includes(search))
  );

  // カテゴリ/タイプでグループ化
  const groups = {};
  filtered.forEach(s => {
    const key = `${s.category} / ${s.type || s.category}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(s);
  });

  const listEl = document.getElementById('subject-list');
  let listHtml = '';
  Object.entries(groups).forEach(([groupName, subjects]) => {
    listHtml += `<div class="subject-group-title">${groupName}</div>`;
    subjects.forEach(s => {
      const isChecked = enrolled.includes(s.code);
      const color = getCategoryColor(s.category);
      const subjectType = s.type || s.category;
      const availability = getSubjectAvailability(s, semester);
      const disabled = !availability.selectable && !isChecked;
      const notes = [enrolledInOtherSems.has(s.code) ? '他学期でも選択済み（再履修として選択可）' : '', availability.note, s.entry_required ? '事前エントリー・選考あり' : '', s.open_type === '未確認' ? '開講方式はシラバスで確認' : ''].filter(Boolean);
      const openTag = s.open_type === '一斉'
        ? `<span style="font-size:10px;color:var(--blue);margin-left:4px;">○一斉</span>`
        : '';
      listHtml += `
        <button type="button" class="subject-row ${isChecked ? 'checked' : ''}" data-code="${s.code}" aria-pressed="${isChecked}" ${disabled ? 'disabled' : ''}>
          <div class="subject-row-check" style="${isChecked ? `background:${color};border-color:${color}` : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="subject-row-info">
            <div class="subject-row-name">${s.name}${openTag}</div>
            <div class="subject-row-meta">${s.code} ・ ${subjectType} ・ ${s.lessons}回</div>
            ${notes.length ? `<div class="subject-note">${notes.join(' / ')}</div>` : ''}
          </div>
          <div class="subject-row-credits">${s.credits}単位</div>
        </button>`;
    });
  });
  listEl.innerHTML = listHtml || '<div class="empty-state"><div class="empty-state-text">表示できる科目がありません</div></div>';

  // チェックボックスのクリックイベント
  listEl.querySelectorAll('.subject-row').forEach(row => {
    row.addEventListener('click', () => {
      if (row.disabled) return;
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
  if (!subjects.length) {
    el.innerHTML='<div style="font-size:12px;color:var(--text3);text-align:center;padding:8px">履修科目を選択すると表示されます</div>';
    return;
  }
  if (!sem.attendance)  { el.innerHTML='<div style="font-size:12px;color:var(--text3)">この学期の開講日データはありません</div>'; return; }

  // 各科目の開講日・締切を収集
  var rows = subjects.map(function(s) {
    var openDate = getLessonStart(1, s, sem);
    var closeDate = getLessonDeadline(s.lessons, s, sem);

    var now      = new Date();
    var isEnded  = Boolean(closeDate && closeDate < now);
    var isOpen   = Boolean(openDate && openDate <= now && !isEnded);
    var color    = getCategoryColor(s.category);
    var openStr  = openDate  ? openDate.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}) : '-';
    var closeStr = closeDate ? closeDate.toLocaleDateString('ja-JP',{month:'numeric',day:'numeric'}) : '-';
    var openType = s.open_type === '一斉' ? '一斉' : '順次';

    var statusRank = isOpen ? 0 : isEnded ? 2 : 1;
    return { s, color, isOpen, isEnded, statusRank, openStr, closeStr, openType, openTime: openDate ? openDate.getTime() : Infinity };
  }).sort(function(a,b){
    if (a.statusRank !== b.statusRank) return a.statusRank - b.statusRank;
    return a.openTime - b.openTime;
  });

  var html = '';
  html += '<div style="display:grid;grid-template-columns:1fr auto auto;gap:0;margin-bottom:4px">';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 6px">科目</div>';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 4px">開講</div>';
  html += '<div style="font-size:10px;font-weight:700;color:var(--text3);padding:4px 4px">最終</div>';
  html += '</div>';

  rows.forEach(function(row) {
    var bg    = row.isOpen ? 'transparent' : 'rgba(255,255,255,0.02)';
    var op    = row.isOpen ? '1' : row.isEnded ? '0.65' : '0.5';
    var badge = row.isOpen
      ? '<span style="font-size:9px;background:var(--green-dim,rgba(16,185,129,0.15));color:var(--green);padding:1px 5px;border-radius:99px">開講中</span>'
      : row.isEnded
        ? '<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 5px;border-radius:99px">終了</span>'
        : '<span style="font-size:9px;background:var(--bg3);color:var(--text3);padding:1px 5px;border-radius:99px">開講前</span>';
    html += '<div style="display:grid;grid-template-columns:1fr auto auto;gap:0;border-bottom:1px solid var(--border);background:'+bg+';opacity:'+op+'">';
    html += '<div style="padding:7px 6px;min-width:0">';
    html += '<div style="display:flex;align-items:center;gap:5px">';
    html += '<div style="width:6px;height:6px;border-radius:50%;background:'+row.color+';flex-shrink:0"></div>';
    html += '<div style="font-size:11px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">'+row.s.name+'</div>';
    html += '</div>';
    html += '<div style="font-size:9px;color:var(--text3);margin-top:1px;padding-left:11px">'+row.openType+' '+badge+'</div>';
    html += '</div>';
    html += '<div style="padding:7px 4px;font-size:11px;color:var(--text2);white-space:nowrap;align-self:center">'+row.openStr+'</div>';
    html += '<div style="padding:7px 4px;font-size:11px;color:var(--text3);white-space:nowrap;align-self:center">'+row.closeStr+'</div>';
    html += '</div>';
  });

  el.innerHTML = html;
}

// ============================================================
// 卒業要件と履修計画（成績・在籍年数を自動認定しない）
function renderGraduationChecker() {
  const el = document.getElementById('graduation-content');
  if (!el) return;
  const plan = getGraduationPlan([...getAllPlannedCodes()]);
  function row(label, done, need) {
    const pct = Math.min(100, Math.round(done / need * 100));
    return `<div class="plan-row"><div><span>${label}</span><strong>${done} / ${need}単位</strong></div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:var(--blue)"></div></div></div>`;
  }
  el.innerHTML = `<p class="settings-note">MCカリキュラムの履修計画です。選択した科目を集計しており、単位修得・卒業を認定するものではありません。</p>
    <div class="plan-total"><strong>${plan.counted}<small> / 124</small></strong><span>要件に割り当てた計画単位</span></div>
    ${row('専門（必修18単位を含む）', plan.totals['専門'], 62)}
    ${row('教養（必修2単位を含む）', plan.totals['教養'], 24)}
    ${row('外国語・必修', Math.min(8, plan.totals['外国語']), 8)}
    ${row('外国語・選択（教養で代替可）', plan.foreignElective + plan.liberalReplacement, 4)}
    ${row('共通区分', plan.common, 26)}
    <p class="settings-note">外国語選択のうち${plan.liberalReplacement}単位を教養で代替。共通は上記を超える単位から割り当て、外国語の算入は8単位までです。科目選択の合計：${plan.total}単位。</p>
    <details class="plan-missing"><summary>必修科目：計画済み ${MC_REQUIRED_CODES.length - plan.missing.length} / ${MC_REQUIRED_CODES.length}科目</summary>
    ${plan.missing.length ? '<ul>' + plan.missing.map(code => `<li>${SUBJECT_BY_CODE.get(code).name}</li>`).join('') + '</ul>' : '<p>すべての必修科目が計画に含まれています。</p>'}</details>
    <p class="settings-note">${plan.meetsPlan ? '科目区分と必修の計画条件を満たしています。' : '不足する区分・必修を履修計画に追加してください。'}卒業には単位の修得と在学年数等の確認が必要です。CP・編入・認定単位がある場合は学生ガイドも確認してください。</p>`;
}
