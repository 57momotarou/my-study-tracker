// ============================================================
// my-study-tracker - render-progress.js
// 進捗タブ（科目カードタップ→章グリッドアコーディオン展開）
// ============================================================

const CHAPTERS_PER_LESSON = 4;

// 展開中の科目コードを管理
const expandedSubjects = new Set();

function renderProgressPage() {
  const selectorEl = document.getElementById('semester-progress-selector');
  selectorEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    const codes = getEnrolledCodes(sem.id);
    if (codes.length === 0) return;
    const btn = document.createElement('button');
    btn.className = `filter-btn${state.currentSemesterId === sem.id ? ' active f-専門' : ''}`;
    btn.textContent = sem.name.replace('年度', '').replace('学期', 'S');
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderProgressPage();
    });
    selectorEl.appendChild(btn);
  });

  const semId = state.currentSemesterId;
  const sem = getCurrentSemester();
  const subjects = getEnrolledSubjects(semId);
  const listEl = document.getElementById('progress-subject-list');
  listEl.innerHTML = '';

  if (subjects.length === 0) {
    listEl.innerHTML = `<div class="card"><div class="empty-state"><div class="empty-state-icon">📭</div><div class="empty-state-text">この学期に登録された科目がありません</div><div class="empty-state-sub">「設定」タブで履修登録してください</div></div></div>`;
    return;
  }

  // 今期全体のサマリー
  const totalChAll = subjects.reduce((a,s) => a + s.lessons * CHAPTERS_PER_LESSON, 0);
  const doneChAll  = subjects.reduce((a,s) => a + getCompletedLessons(s.code), 0);
  const pctAll = totalChAll > 0 ? Math.round(doneChAll / totalChAll * 100) : 0;
  const lateCount = subjects.filter(s => {
    const t = getTodayTarget(s, sem);
    return Math.floor(getCompletedLessons(s.code) / CHAPTERS_PER_LESSON) < t;
  }).length;

  const summaryEl = document.createElement('div');
  summaryEl.className = 'card';
  summaryEl.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--amber)">${pctAll}%</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">全体進捗</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700">${Math.floor(doneChAll/CHAPTERS_PER_LESSON)}<span style="font-size:13px;color:var(--text3)">/${subjects.reduce((a,s)=>a+s.lessons,0)}</span></div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">完了コマ</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'}">${lateCount}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">遅刻科目</div>
      </div>
    </div>
    <div class="prog-wrap" style="height:8px">
      <div class="prog-bar" style="width:${pctAll}%;background:var(--amber)"></div>
    </div>`;
  listEl.appendChild(summaryEl);

  subjects.forEach(s => {
    const card = buildSubjectCard(s, sem, semId);
    listEl.appendChild(card);
  });
}

// 科目カードを構築（今日タブからも呼び出し可能）
function buildSubjectCard(s, sem, semId) {
  const CPL = CHAPTERS_PER_LESSON;
  const totalChapters = s.lessons * CPL;
  const doneChapters  = getCompletedLessons(s.code);
  const doneLessons   = Math.floor(doneChapters / CPL);
  const doneChInLes   = doneChapters % CPL;

  const target      = getTodayTarget(s, sem);
  const recommended = getTodayRecommended(s, sem);
  const pct  = Math.round(doneChapters / totalChapters * 100);
  const late = Math.max(0, target - doneLessons);
  const color = getCategoryColor(s.category);
  const openLabel = s.open_type === '一斉' ? '一斉' : '順次';

  let statusText = '✅ 出席認定 順調';
  let statusColor = 'var(--green)';
  if (doneLessons >= s.lessons) {
    statusText = '🎓 受講完了';
    statusColor = color;
  } else if (late >= 1) {
    statusText = `🔴 遅刻${late}コマ`;
    statusColor = 'var(--red)';
  } else if (recommended > doneLessons) {
    const need = recommended * CPL - doneChapters;
    statusText = `🟡 今週あと${need}章で出席認定`;
    statusColor = 'var(--amber)';
  }

  const progressLabel = doneChInLes > 0
    ? `コマ${doneLessons+1} 第${doneChInLes}章まで`
    : doneLessons > 0 ? `コマ${doneLessons}完了` : '未受講';

  const isExpanded = expandedSubjects.has(s.code);

  const card = document.createElement('div');
  card.className = 'progress-subject-card';
  card.id = `pcard-${s.code}`;

  // ── ヘッダー部分（常時表示・タップで展開） ──
  const header = document.createElement('div');
  header.style.cssText = 'cursor:pointer;user-select:none;-webkit-user-select:none';
  header.innerHTML = `
    <div class="ps-header">
      <div style="display:flex;flex-direction:column;gap:2px;flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:6px">
          <div style="width:8px;height:8px;border-radius:50%;background:${color};flex-shrink:0"></div>
          <div class="ps-name">${s.name}</div>
        </div>
        <div style="font-size:11px;color:${statusColor};margin-left:14px">${statusText}</div>
      </div>
      <div style="display:flex;align-items:center;gap:6px">
        <div class="ps-pct" style="color:${color}">${pct}%</div>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"
          width="16" height="16" style="color:var(--text3);transition:transform 0.2s;transform:rotate(${isExpanded?'180deg':'0deg'})"
          class="expand-icon-${s.code}">
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </div>
    </div>
    <div class="ps-meta">${progressLabel} ・ <span style="color:var(--text3)">${openLabel}開講</span>${late>0?` ・ <span style="color:var(--red)">遅刻${late}コマ</span>`:''}</div>
    <div class="prog-wrap" style="margin-bottom:${isExpanded?'10px':'0'}">
      <div class="prog-bar" style="width:${pct}%;background:${color}"></div>
    </div>`;

  header.addEventListener('click', () => toggleSubjectExpand(s.code, sem, semId));
  card.appendChild(header);

  // ── 展開部分（章グリッド＋締切ボタン） ──
  const detail = document.createElement('div');
  detail.id = `pdetail-${s.code}`;
  detail.style.display = isExpanded ? 'block' : 'none';
  detail.appendChild(buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color));
  card.appendChild(detail);

  return card;
}

function toggleSubjectExpand(code, sem, semId) {
  if (expandedSubjects.has(code)) {
    expandedSubjects.delete(code);
  } else {
    expandedSubjects.add(code);
  }
  // アイコン回転
  const icon = document.querySelector(`.expand-icon-${code}`);
  if (icon) icon.style.transform = expandedSubjects.has(code) ? 'rotate(180deg)' : 'rotate(0deg)';
  // 詳細部の表示切替
  const detail = document.getElementById(`pdetail-${code}`);
  if (detail) {
    const show = expandedSubjects.has(code);
    detail.style.display = show ? 'block' : 'none';
    // プログレスバー下のmargin調整
    const progWrap = detail.previousElementSibling?.querySelector('.prog-wrap');
    if (progWrap) progWrap.style.marginBottom = show ? '10px' : '0';
  }
}

function buildChapterGrid(s, sem, semId, doneChapters, doneLessons, recommended, color) {
  const CPL = CHAPTERS_PER_LESSON;
  const wrapper = document.createElement('div');

  // 章グリッド
  let gridHtml = '<div style="display:grid;grid-template-columns:repeat(8,1fr);gap:3px;margin-bottom:8px">';
  for (let lesson = 1; lesson <= s.lessons; lesson++) {
    const isLessonLate_ = isLessonLate(lesson, s, sem);
    const isThisWeek   = lesson <= recommended && lesson > doneLessons;
    const notYetLesson = !isLessonAvailable(lesson, s, sem);

    for (let ch = 1; ch <= CPL; ch++) {
      const chNum   = (lesson - 1) * CPL + ch;
      const isDone  = chNum <= doneChapters;
      const isLateC = !isDone && isLessonLate_;
      const isWeekC = !isDone && !isLateC && isThisWeek;
      const notYet  = !isDone && !isLateC && !isWeekC && notYetLesson;

      let btnStyle = '';
      if (isDone)   btnStyle = `background:${color};color:#000`;
      else if (isLateC) btnStyle = `background:var(--red-dim);color:var(--red);border:1px solid var(--red)`;
      else if (isWeekC) btnStyle = `background:var(--amber-dim);color:var(--amber);border:1px solid var(--amber)`;
      else if (notYet)  btnStyle = `opacity:0.25;pointer-events:none`;

      const borderLeft = ch === 1 && lesson > 1 ? 'margin-left:2px;' : '';
      gridHtml += `<button
        class="lesson-btn${isDone?' done':''}"
        onclick="toggleChapter('${s.code}',${chNum},${semId})"
        style="${btnStyle}${borderLeft}"
        title="コマ${lesson} 第${ch}章"
      >${lesson}-${ch}</button>`;
    }
  }
  gridHtml += '</div>';

  // 凡例＋締切ボタン
  const legendHtml = `
    <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
      <div style="display:flex;gap:10px;font-size:10px;color:var(--text3)">
        <span><span style="color:${color}">■</span> 完了</span>
        <span><span style="color:var(--red)">■</span> 遅刻</span>
        <span><span style="color:var(--amber)">■</span> 今週期限</span>
        <span style="opacity:0.4">■ 未開講</span>
      </div>
      <button onclick="showDeadlineModal('${s.code}',${semId})" style="
        background:var(--bg3);border:1px solid var(--border);color:var(--text3);
        font-size:10px;padding:3px 10px;border-radius:99px;cursor:pointer;
        font-family:'Noto Sans JP',sans-serif;white-space:nowrap;
      ">締切一覧</button>
    </div>`;

  wrapper.innerHTML = gridHtml + legendHtml;
  return wrapper;
}
