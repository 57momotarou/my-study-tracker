// ============================================================
// my-study-tracker - render-progress.js
// ============================================================
const CHAPTERS_PER_LESSON = 4;

function renderProgressPage() {
  const selEl = document.getElementById('semester-progress-selector');
  selEl.innerHTML = '';
  SEMESTERS.forEach(sem => {
    if (getEnrolledCodes(sem.id).length === 0) return;
    const btn = document.createElement('button');
    btn.className = `filter-btn${state.currentSemesterId === sem.id ? ' active f-専門' : ''}`;
    btn.textContent = sem.name.replace('年度','').replace('学期','S');
    btn.addEventListener('click', () => {
      state.currentSemesterId = sem.id;
      saveState();
      renderProgressPage();
    });
    selEl.appendChild(btn);
  });

  const semId    = state.currentSemesterId;
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(semId);
  const listEl   = document.getElementById('progress-subject-list');
  listEl.innerHTML = '';

  if (subjects.length === 0) {
    listEl.innerHTML = `<div class="card"><div class="empty-state">
      <div class="empty-state-icon">📭</div>
      <div class="empty-state-text">この学期に登録された科目がありません</div>
      <div class="empty-state-sub">「設定」タブで履修登録してください</div>
    </div></div>`;
    return;
  }

  const CPL      = CHAPTERS_PER_LESSON;
  const totalCh  = subjects.reduce((a,s)=>a+s.lessons*CPL,0);
  const doneCh   = subjects.reduce((a,s)=>a+getCompletedLessons(s.code),0);
  const pctAll   = totalCh>0?Math.round(doneCh/totalCh*100):0;
  const doneLen  = subjects.reduce((a,s)=>a+Math.floor(getCompletedLessons(s.code)/CPL),0);
  const totalLen = subjects.reduce((a,s)=>a+s.lessons,0);
  const lateCount= subjects.filter(s=>Math.floor(getCompletedLessons(s.code)/CPL)<getTodayTarget(s,sem)).length;

  const summaryCard = document.createElement('div');
  summaryCard.className = 'card';
  summaryCard.innerHTML = `
    <div style="display:flex;gap:10px;margin-bottom:10px">
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:var(--amber)">${pctAll}%</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">全体進捗</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700">${doneLen}<span style="font-size:13px;color:var(--text3)">/${totalLen}</span></div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">完了コマ</div>
      </div>
      <div style="flex:1;background:var(--bg3);border-radius:10px;padding:12px;text-align:center">
        <div style="font-family:'Space Mono',monospace;font-size:22px;font-weight:700;color:${lateCount>0?'var(--red)':'var(--green)'}">${lateCount}</div>
        <div style="font-size:10px;color:var(--text3);margin-top:2px">遅刻科目</div>
      </div>
    </div>
    <div class="prog-wrap" style="height:8px"><div class="prog-bar" style="width:${pctAll}%;background:var(--amber)"></div></div>`;
  listEl.appendChild(summaryCard);

  subjects.forEach(s => listEl.appendChild(buildProgressCard(s, sem, semId)));
}

function buildProgressCard(s, sem, semId) {
  const CPL         = CHAPTERS_PER_LESSON;
  const doneCh      = getCompletedLessons(s.code);
  const doneLessons = Math.floor(doneCh / CPL);
  const doneChInLes = doneCh % CPL;
  const target      = getTodayTarget(s, sem);
  const recommended = getTodayRecommended(s, sem);
  const pct         = Math.round(doneCh / (s.lessons * CPL) * 100);
  const late        = Math.max(0, target - doneLessons);
  const color       = getCategoryColor(s.category);
  const openLabel   = s.open_type === '一斉' ? '一斉' : '順次';

  let statusText = '✅ 出席認定 順調', statusColor = 'var(--green)';
  if (doneLessons >= s.lessons)       { statusText='🎓 受講完了';                              statusColor=color; }
  else if (late >= 1)                 { statusText=`🔴 遅刻${late}コマ`;                       statusColor='var(--red)'; }
  else if (recommended > doneLessons) { statusText=`🟡 今週あと${recommended*CPL-doneCh}章で認定`; statusColor='var(--amber)'; }

  const progressLabel = doneChInLes > 0
    ? `コマ${doneLessons+1} 第${doneChInLes}章まで`
    : doneLessons > 0 ? `コマ${doneLessons} 完了` : '未受講';

  const card = document.createElement('div');
  card.className = 'progress-subject-card';

  // ── アコーディオンヘッダー ──
  const icon = document.createElement('svg');
  icon.setAttribute('viewBox','0 0 24 24');
  icon.setAttribute('fill','none');
  icon.setAttribute('stroke','currentColor');
  icon.setAttribute('stroke-width','2.5');
  icon.setAttribute('width','16');
  icon.setAttribute('height','16');
  icon.style.cssText = 'color:var(--text3);transition:transform 0.2s;pointer-events:none;flex-shrink:0';
  icon.innerHTML = '<polyline points="6 9 12 15 18 9"/>';

  const headerDiv = document.createElement('div');
  headerDiv.innerHTML = `
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
      </div>
    </div>
    <div class="ps-meta">${progressLabel} ・ <span style="color:var(--text3)">${openLabel}開講</span>${late>0?` ・ <span style="color:var(--red)">遅刻${late}コマ</span>`:''}</div>
    <div class="prog-wrap"><div class="prog-bar" style="width:${pct}%;background:${color}"></div></div>`;

  // アイコンをps-headerの右端に追加
  const psHeader = headerDiv.querySelector('.ps-header');
  const iconWrap = psHeader.querySelector('div:last-child');
  if (iconWrap) iconWrap.appendChild(icon);

  // ── 章グリッドコンテナ ──
  const gridContainer = document.createElement('div');
  gridContainer.style.cssText = 'display:none;margin-top:10px';
  gridContainer.appendChild(buildChapterGrid(s, sem, semId, doneCh, doneLessons, recommended, color));

  // makeAccordion で確実に接続
  makeAccordion(headerDiv, gridContainer, null);
  headerDiv.addEventListener('click', (e) => {
    if (gridContainer.contains(e.target)) return;
    const open = gridContainer.style.display === 'none';
    icon.style.transform = open ? 'rotate(180deg)' : 'rotate(0deg)';
  });

  card.appendChild(headerDiv);
  card.appendChild(gridContainer);
  return card;
}
