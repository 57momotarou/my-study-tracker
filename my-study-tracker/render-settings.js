// ============================================================
// my-study-tracker - render-settings.js
// 設定タブ（履修科目選択・卒業単位チェッカー）
// ============================================================

// 卒業要件定数
const GRAD_REQ = {
  senmon:   62,  // 専門科目
  kyoyo:    24,  // 教養科目
  gaikokugo: 12, // 外国語科目
  total:   124,  // 合計
  kyotsu:   26,  // 共通区分（専門・教養・外国語どれでも可）
  gaikokugo_kyotsu_max: 8, // 共通区分に充てられる外国語上限
  sem_min:   8,  // 1学期最低履修単位
  year_max: 45,  // 年間上限単位
};

function renderSettingsPage() {
  // 学期タブ（設定タブ内）
  const tabsEl = document.getElementById('semester-tabs');
  tabsEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const btn = document.createElement('button');
    btn.className = 'sem-tab' + (sem.id === state.currentSemesterId ? ' active' : '');
    btn.textContent = sem.name;
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderSemesterTabs(); // ヘッダータブも更新
      renderSettingsPage();
    });
    tabsEl.appendChild(btn);
  });

  // 卒業単位チェッカー
  renderGraduationChecker();

  // カテゴリフィルター
  const filterEl = document.getElementById('subject-filters');
  filterEl.innerHTML = '';
  [
    { key: 'all',   label: 'すべて' },
    { key: '専門',   label: '💻 専門' },
    { key: '教養',   label: '🌿 教養' },
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

  // 他学期選択済みを非表示（今学期選択済みは表示）
  const enrolledInOtherSems = new Set();
  SEMESTERS.forEach(sem => {
    if (sem.id === state.currentSemesterId) return;
    getEnrolledCodes(sem.id).forEach(code => enrolledInOtherSems.add(code));
  });

  const baseList = state.activeSubjectFilter === 'all'
    ? ALL_SUBJECTS
    : ALL_SUBJECTS.filter(s => s.category === state.activeSubjectFilter);

  const filtered = baseList.filter(s =>
    !enrolledInOtherSems.has(s.code) || enrolled.includes(s.code)
  );

  // グループ化
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
      const isChecked  = enrolled.includes(s.code);
      const isRequired = s.required === true;
      const color      = getCategoryColor(s.category);
      const openTag    = s.open_type === '一斉'
        ? `<span style="font-size:10px;color:var(--blue);margin-left:4px;">○一斉</span>`
        : '';
      const reqTag = isRequired
        ? `<span style="font-size:9px;background:var(--red-dim);color:var(--red);border:1px solid var(--red);border-radius:4px;padding:1px 5px;margin-left:4px;font-weight:700">必修</span>`
        : '';
      // 必修未登録は行に警告スタイル
      const rowExtra = isRequired && !isChecked
        ? 'border-left:2px solid var(--red);padding-left:8px;'
        : '';

      listEl.innerHTML += `
        <div class="subject-row ${isChecked ? 'checked' : ''}" data-code="${s.code}" style="${rowExtra}">
          <div class="subject-row-check" style="${isChecked ? `background:${color};border-color:${color}` : ''}">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#000" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>
          </div>
          <div class="subject-row-info">
            <div class="subject-row-name">${s.name}${reqTag}${openTag}</div>
            <div class="subject-row-meta">${s.code} ・ ${s.type} ・ ${s.lessons}回 ・ ${s.credits}単位</div>
          </div>
          <div class="subject-row-credits">${s.credits}単位</div>
        </div>`;
    });
  });

  // クリックイベント
  listEl.querySelectorAll('.subject-row').forEach(row => {
    row.addEventListener('click', () => {
      const code  = row.dataset.code;
      const semId = state.currentSemesterId;
      if (!state.enrollments[semId]) state.enrollments[semId] = [];
      const idx = state.enrollments[semId].indexOf(code);
      if (idx >= 0) state.enrollments[semId].splice(idx, 1);
      else state.enrollments[semId].push(code);
      saveState();
      renderSemesterTabs();
      renderSettingsPage();
    });
  });

  renderEnrolledSummary();
}

// ============================================================
// 卒業単位チェッカー
// ============================================================
function renderGraduationChecker() {
  const el = document.getElementById('graduation-content');
  if (!el) return;

  // 全学期の登録科目を集計
  const allEnrolled = new Set();
  SEMESTERS.forEach(sem => getEnrolledCodes(sem.id).forEach(c => allEnrolled.add(c)));

  const allSubjects = [...allEnrolled]
    .map(code => ALL_SUBJECTS.find(s => s.code === code))
    .filter(Boolean);

  const senmonCredits   = allSubjects.filter(s => s.category === '専門').reduce((a,s) => a+s.credits, 0);
  const kyoyoCredits    = allSubjects.filter(s => s.category === '教養').reduce((a,s) => a+s.credits, 0);
  const gaikokugoCredits = allSubjects.filter(s => s.category === '外国語').reduce((a,s) => a+s.credits, 0);
  const totalCredits    = senmonCredits + kyoyoCredits + gaikokugoCredits;

  // 共通区分：外国語は上限8単位まで充当可能
  const gaikokugoForKyotsu = Math.min(gaikokugoCredits, GRAD_REQ.gaikokugo_kyotsu_max);
  const kyotsuCredits = Math.min(senmonCredits + kyoyoCredits + gaikokugoForKyotsu, GRAD_REQ.kyotsu);

  // 各カテゴリの残り
  const senmonRemain    = Math.max(0, GRAD_REQ.senmon    - senmonCredits);
  const kyoyoRemain     = Math.max(0, GRAD_REQ.kyoyo     - kyoyoCredits);
  const gaikokugoRemain = Math.max(0, GRAD_REQ.gaikokugo - gaikokugoCredits);
  const totalRemain     = Math.max(0, GRAD_REQ.total     - totalCredits);

  // 各学期の単位数
  const semCredits = SEMESTERS.map(sem => ({
    sem,
    credits: getEnrolledSubjects(sem.id).reduce((a,s) => a+s.credits, 0),
  }));

  // 必修未登録チェック
  const requiredSubjects = ALL_SUBJECTS.filter(s => s.required);
  const unregisteredRequired = requiredSubjects.filter(s => !allEnrolled.has(s.code));

  // バー描画ヘルパー
  function bar(done, total, color) {
    const pct = Math.min(100, Math.round(done / total * 100));
    const ok = done >= total;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:3px">
        <span style="font-size:11px;color:${ok?'var(--green)':'var(--text2)'};font-weight:${ok?'700':'400'}">${done}/${total}単位</span>
        <span style="font-size:11px;color:${ok?'var(--green)':'var(--amber)'}">残${Math.max(0,total-done)}単位${ok?' ✅':''}</span>
      </div>
      <div class="prog-wrap" style="height:6px;margin-bottom:8px">
        <div class="prog-bar" style="width:${pct}%;background:${ok?'var(--green)':color}"></div>
      </div>`;
  }

  let html = '';

  // 必修警告
  if (unregisteredRequired.length > 0) {
    html += `<div style="background:var(--red-dim);border:1px solid var(--red);border-radius:8px;padding:10px 12px;margin-bottom:12px">
      <div style="font-size:11px;font-weight:700;color:var(--red);margin-bottom:6px">⚠️ 未登録の必修科目 ${unregisteredRequired.length}件</div>
      ${unregisteredRequired.map(s =>
        `<div style="font-size:11px;color:var(--red);padding:2px 0">• ${s.name}（${s.credits}単位）</div>`
      ).join('')}
    </div>`;
  }

  // 合計進捗
  const totalPct = Math.min(100, Math.round(totalCredits / GRAD_REQ.total * 100));
  html += `
    <div style="text-align:center;margin-bottom:14px">
      <div style="font-family:'Space Mono',monospace;font-size:28px;font-weight:700;color:${totalCredits>=GRAD_REQ.total?'var(--green)':'var(--amber)'}">
        ${totalCredits}<span style="font-size:14px;color:var(--text3)">/${GRAD_REQ.total}単位</span>
      </div>
      <div style="font-size:11px;color:var(--text3);margin-top:2px">残 ${totalRemain} 単位</div>
    </div>
    <div class="prog-wrap" style="height:10px;margin-bottom:14px">
      <div class="prog-bar" style="width:${totalPct}%;background:${totalCredits>=GRAD_REQ.total?'var(--green)':'var(--amber)'}"></div>
    </div>`;

  // カテゴリ別
  html += `<div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px">`;
  [
    { label: '💻 専門', done: senmonCredits,    total: GRAD_REQ.senmon,    color: 'var(--amber)' },
    { label: '🌿 教養', done: kyoyoCredits,     total: GRAD_REQ.kyoyo,     color: 'var(--green)' },
    { label: '🌐 外国語', done: gaikokugoCredits, total: GRAD_REQ.gaikokugo, color: 'var(--purple)' },
    { label: '🔗 共通区分', done: kyotsuCredits,  total: GRAD_REQ.kyotsu,    color: '#60a5fa' },
  ].forEach(({ label, done, total, color }) => {
    const pct = Math.min(100, Math.round(done / total * 100));
    const ok  = done >= total;
    html += `
      <div style="background:var(--bg3);border-radius:10px;padding:10px 12px;border:1px solid ${ok?'var(--green)':'var(--border)'}">
        <div style="font-size:11px;color:var(--text3);margin-bottom:4px">${label}</div>
        <div style="font-family:'Space Mono',monospace;font-size:18px;font-weight:700;color:${ok?'var(--green)':color}">${done}<span style="font-size:11px;color:var(--text3)">/${total}</span></div>
        <div class="prog-wrap" style="height:4px;margin-top:6px">
          <div class="prog-bar" style="width:${pct}%;background:${ok?'var(--green)':color}"></div>
        </div>
        <div style="font-size:10px;color:${ok?'var(--green)':'var(--text3)'};margin-top:4px">${ok?'✅ 充足':'残'+Math.max(0,total-done)+'単位'}</div>
      </div>`;
  });
  html += `</div>`;

  // 学期別単位一覧
  html += `<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">学期別登録単位数</div>`;
  html += `<div style="display:flex;flex-direction:column;gap:4px">`;

  // 年ごとにグループ化
  const years = [1,2,3,4].map(y => ({
    year: y,
    sems: semCredits.filter(sc => Math.ceil(sc.sem.id/2) === y),
    total: semCredits.filter(sc => Math.ceil(sc.sem.id/2) === y).reduce((a,sc) => a+sc.credits, 0),
  }));

  years.forEach(({ year, sems, total: yearTotal }) => {
    const overLimit = yearTotal > GRAD_REQ.year_max;
    html += `<div style="display:flex;align-items:center;gap:6px;padding:6px 0;border-bottom:1px solid var(--border)">
      <span style="font-size:11px;color:var(--text3);width:36px">${year}年目</span>
      <div style="flex:1;display:flex;gap:4px">
        ${sems.map(sc => {
          const isUnder = sc.credits < GRAD_REQ.sem_min && sc.credits > 0;
          return `<span style="font-size:11px;background:var(--bg3);padding:2px 8px;border-radius:99px;color:${isUnder?'var(--red)':'var(--text2)'};border:1px solid ${isUnder?'var(--red)':'var(--border)'}">${sc.sem.name.includes('春')?'春':'秋'}${sc.credits}単位${isUnder?'⚠️':''}</span>`;
        }).join('')}
      </div>
      <span style="font-size:11px;font-weight:700;color:${overLimit?'var(--red)':yearTotal>=16?'var(--green)':'var(--text2)'};flex-shrink:0">計${yearTotal}単位${overLimit?'（上限超）':''}</span>
    </div>`;
  });
  html += `</div>`;

  // 注意事項
  html += `<div style="font-size:10px;color:var(--text3);margin-top:10px;line-height:1.6">
    ※ 1学期最低 ${GRAD_REQ.sem_min} 単位 ／ 年間上限 ${GRAD_REQ.year_max} 単位<br>
    ※ 共通区分26単位は専門・教養・外国語(上限8単位)のいずれでも可
  </div>`;

  el.innerHTML = html;
}

// ============================================================
// 選択済みサマリー
// ============================================================
function renderEnrolledSummary() {
  const semId    = state.currentSemesterId;
  const subjects = getEnrolledSubjects(semId);
  const listEl   = document.getElementById('enrolled-list');
  const statsEl  = document.getElementById('enrolled-stats');

  if (subjects.length === 0) {
    listEl.innerHTML = `<div style="color:var(--text3);font-size:13px;text-align:center;padding:12px;">上のリストから科目を選択してください</div>`;
    statsEl.innerHTML = '';
    return;
  }

  listEl.innerHTML = subjects.map(s => {
    const reqTag = s.required
      ? `<span style="font-size:9px;background:var(--red-dim);color:var(--red);border-radius:4px;padding:1px 5px;margin-left:4px">必修</span>`
      : '';
    return `
      <div class="enrolled-item">
        <div class="enrolled-dot" style="background:${getCategoryColor(s.category)}"></div>
        <div class="enrolled-name">${s.name}${reqTag}</div>
        <div class="enrolled-credits">${s.credits}単位</div>
      </div>`;
  }).join('');

  const totalCredits = subjects.reduce((a,s) => a+s.credits, 0);
  const senmonCount  = subjects.filter(s => s.category === '専門').length;
  const kyoyoCount   = subjects.filter(s => s.category === '教養').length;
  const foreignCount = subjects.filter(s => s.category === '外国語').length;
  const semMin       = totalCredits >= GRAD_REQ.sem_min;

  statsEl.innerHTML = `
    <div class="stat-box">
      <div class="stat-box-num" style="color:${semMin?'var(--amber)':'var(--red)'}">${totalCredits}</div>
      <div class="stat-box-label">合計単位${!semMin?'⚠️':''}</div>
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
