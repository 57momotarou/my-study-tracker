// ============================================================
// my-study-tracker - render-timetable.js
// 時間割メーカー
// ============================================================

// 時間割データ（localStorage保存）
const TT_KEY = 'cp-timetable';
const DAYS   = ['月','火','水','木','金','土'];
const DAY_IDX = { '月':0,'火':1,'水':2,'木':3,'金':4,'土':5 };

function loadTimetable() {
  try { return JSON.parse(localStorage.getItem(TT_KEY)||'{}'); } catch(e) { return {}; }
}
function saveTimetable(tt) {
  localStorage.setItem(TT_KEY, JSON.stringify(tt));
}

function renderTimetablePage() {
  const el = document.getElementById('timetable-content');
  if (!el) return;
  const semId    = state.currentSemesterId;
  const sem      = getCurrentSemester();
  const subjects = getEnrolledSubjects(semId);

  if (!subjects.length) {
    el.innerHTML = `<div class="empty-state">
      <div class="empty-state-icon">📋</div>
      <div class="empty-state-text">科目が登録されていません</div>
      <div class="empty-state-sub">「設定」タブで履修科目を選択してください</div>
    </div>`;
    return;
  }

  const tt = loadTimetable();
  if (!tt[semId]) tt[semId] = {};

  el.innerHTML = '';

  // ── 自動配置ボタン ──
  const autoBtn = document.createElement('button');
  autoBtn.style.cssText = 'width:100%;padding:10px;background:var(--amber);color:#000;border:none;border-radius:8px;font-size:13px;font-weight:700;cursor:pointer;margin-bottom:12px;font-family:"Noto Sans JP",sans-serif';
  autoBtn.textContent = '✨ 自動配置（推奨）';
  autoBtn.addEventListener('click', () => {
    autoArrange(subjects, semId);
    renderTimetablePage();
  });
  el.appendChild(autoBtn);

  // ── 説明 ──
  const desc = document.createElement('div');
  desc.style.cssText = 'font-size:11px;color:var(--text3);margin-bottom:12px;line-height:1.6';
  desc.innerHTML = `📌 専門科目→木曜締切 / 教養・外国語→火曜締切<br>
    各科目名をタップして曜日を変更できます`;
  el.appendChild(desc);

  // ── 時間割グリッド ──
  const grid = document.createElement('div');
  grid.style.cssText = 'display:grid;grid-template-columns:repeat(6,1fr);gap:4px;margin-bottom:16px';

  // ヘッダー行
  DAYS.forEach(d => {
    const hdr = document.createElement('div');
    hdr.style.cssText = 'text-align:center;font-size:11px;font-weight:700;color:var(--text3);padding:4px 0';
    hdr.textContent = d;
    grid.appendChild(hdr);
  });

  // 各曜日に配置されている科目
  const daySubjects = { 0:[],1:[],2:[],3:[],4:[],5:[] };
  subjects.forEach(s => {
    const dayIdx = tt[semId][s.code];
    if (dayIdx !== undefined) daySubjects[dayIdx].push(s);
  });

  // 最大行数を計算
  const maxRows = Math.max(1, ...Object.values(daySubjects).map(a=>a.length));

  for (let row = 0; row < maxRows; row++) {
    DAYS.forEach((d, di) => {
      const s = daySubjects[di][row];
      const cell = document.createElement('div');
      if (s) {
        const color = getCategoryColor(s.category);
        const hours = s.deadline_type === '専門' ? 1.5 : 1;
        cell.style.cssText = `background:${color}22;border:1px solid ${color}66;border-radius:6px;padding:5px 4px;cursor:pointer;min-height:52px;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;-webkit-tap-highlight-color:transparent`;
        cell.innerHTML = `
          <div style="font-size:9px;font-weight:700;color:${color};line-height:1.3;word-break:keep-all">${s.name.length>8?s.name.slice(0,8)+'…':s.name}</div>
          <div style="font-size:8px;color:var(--text3);margin-top:2px">${hours}h</div>`;
        // タップで曜日変更メニュー
        cell.addEventListener('click', () => showDayPicker(s, semId, tt));
      } else {
        cell.style.cssText = 'min-height:52px;border:1px dashed var(--border);border-radius:6px;opacity:0.3';
      }
      grid.appendChild(cell);
    });
  }
  el.appendChild(grid);

  // ── 未配置科目 ──
  const unplaced = subjects.filter(s => tt[semId][s.code] === undefined);
  if (unplaced.length) {
    const unplacedDiv = document.createElement('div');
    unplacedDiv.style.cssText = 'background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:12px';
    unplacedDiv.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">📌 未配置の科目（タップで曜日を設定）</div>`;
    unplaced.forEach(s => {
      const color = getCategoryColor(s.category);
      const tag = document.createElement('div');
      tag.style.cssText = `display:inline-flex;align-items:center;gap:4px;background:${color}22;border:1px solid ${color}66;border-radius:99px;padding:4px 10px;margin:3px;cursor:pointer;-webkit-tap-highlight-color:transparent`;
      tag.innerHTML = `<div style="width:5px;height:5px;border-radius:50%;background:${color}"></div>
        <span style="font-size:11px;color:var(--text2)">${s.name}</span>`;
      tag.addEventListener('click', () => showDayPicker(s, semId, tt));
      unplacedDiv.appendChild(tag);
    });
    el.appendChild(unplacedDiv);
  }

  // ── 週間所要時間サマリー ──
  const summaryDiv = document.createElement('div');
  summaryDiv.style.cssText = 'background:var(--bg3);border-radius:8px;padding:10px 12px;margin-bottom:12px';
  let totalHours = 0;
  const dayHours = [0,0,0,0,0,0];
  subjects.forEach(s => {
    const di = tt[semId][s.code];
    if (di !== undefined) {
      const h = s.deadline_type === '専門' ? 1.5 : 1;
      dayHours[di] += h;
      totalHours += h;
    }
  });
  summaryDiv.innerHTML = `<div style="font-size:11px;font-weight:700;color:var(--text2);margin-bottom:8px">⏱ 週間学習時間目安</div>
    <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:6px">
      ${DAYS.map((d,i)=>dayHours[i]>0?`<div style="background:var(--bg2);border-radius:6px;padding:4px 8px;text-align:center">
        <div style="font-size:10px;color:var(--text3)">${d}</div>
        <div style="font-size:13px;font-weight:700;color:var(--amber)">${dayHours[i]}h</div>
      </div>`:''
      ).join('')}
    </div>
    <div style="font-size:12px;color:var(--text2)">合計 <b style="color:var(--amber)">${totalHours}時間</b>/週</div>`;
  el.appendChild(summaryDiv);

  // リセットボタン
  const resetBtn = document.createElement('button');
  resetBtn.style.cssText = 'width:100%;padding:8px;background:var(--bg3);color:var(--text3);border:1px solid var(--border);border-radius:8px;font-size:12px;cursor:pointer;font-family:"Noto Sans JP",sans-serif';
  resetBtn.textContent = '🗑 時間割をリセット';
  resetBtn.addEventListener('click', () => {
    if (confirm('この学期の時間割をリセットしますか？')) {
      delete tt[semId];
      saveTimetable(tt);
      renderTimetablePage();
    }
  });
  el.appendChild(resetBtn);
}

// ============================================================
// 曜日選択ピッカー（ボトムシート）
// ============================================================
function showDayPicker(s, semId, tt) {
  const existing = document.getElementById('day-picker-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'day-picker-modal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:500;background:rgba(0,0,0,0.6);display:flex;align-items:flex-end;padding-bottom:env(safe-area-inset-bottom)';

  const color      = getCategoryColor(s.category);
  const currentDay = tt[semId]?.[s.code];
  const recommended = s.deadline_type==='専門' ? 3 : 1; // 専門→木(3)、教養外国語→火(1)

  let rows = DAYS.map((d,i) => {
    const isCurrent = currentDay === i;
    const isRec     = i === recommended;
    return `<button onclick="assignDay('${s.code}',${semId},${i})"
      style="width:100%;padding:12px 16px;border:none;border-bottom:1px solid var(--border);background:${isCurrent?'var(--amber-dim)':'transparent'};color:${isCurrent?'var(--amber)':'var(--text2)'};font-size:14px;font-weight:${isCurrent?'700':'400'};font-family:'Noto Sans JP',sans-serif;cursor:pointer;display:flex;align-items:center;justify-content:space-between;-webkit-tap-highlight-color:transparent">
      <span>${d}曜日</span>
      <span style="font-size:11px;display:flex;gap:4px">
        ${isRec?`<span style="background:var(--amber);color:#000;padding:2px 6px;border-radius:99px;font-size:10px">推奨</span>`:''}
        ${isCurrent?`<span style="color:var(--amber)">✓ 現在</span>`:''}
      </span>
    </button>`;
  }).join('');

  modal.innerHTML = `
    <div style="background:var(--bg2);border-radius:20px 20px 0 0;width:100%;max-height:70vh;overflow-y:auto">
      <div style="padding:16px;border-bottom:1px solid var(--border);display:flex;align-items:center;justify-content:space-between">
        <div>
          <div style="font-size:10px;font-family:'Space Mono',monospace;color:${color};letter-spacing:2px">ASSIGN DAY</div>
          <div style="font-size:15px;font-weight:700;margin-top:2px">${s.name}</div>
          <div style="font-size:11px;color:var(--text3);margin-top:2px">${s.category} ・ ${s.deadline_type==='専門'?'専門→木曜締切':'教養外国語→火曜締切'}</div>
        </div>
        <button onclick="document.getElementById('day-picker-modal').remove()"
          style="background:var(--bg3);border:none;color:var(--text2);width:32px;height:32px;border-radius:50%;font-size:18px;cursor:pointer">×</button>
      </div>
      ${rows}
      <button onclick="assignDay('${s.code}',${semId},-1)"
        style="width:100%;padding:12px 16px;border:none;background:transparent;color:var(--red);font-size:13px;font-family:'Noto Sans JP',sans-serif;cursor:pointer;-webkit-tap-highlight-color:transparent">
        🗑 配置を削除
      </button>
    </div>`;

  modal.addEventListener('click', e => { if (e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

function assignDay(code, semId, dayIdx) {
  const tt = loadTimetable();
  if (!tt[semId]) tt[semId] = {};
  if (dayIdx === -1) delete tt[semId][code];
  else tt[semId][code] = dayIdx;
  saveTimetable(tt);
  document.getElementById('day-picker-modal')?.remove();
  renderTimetablePage();
}

// ============================================================
// 自動配置ロジック
// ============================================================
function autoArrange(subjects, semId) {
  const tt = loadTimetable();
  if (!tt[semId]) tt[semId] = {};

  // 各曜日の時間を均等化するように配置
  // 専門→木（3）を優先、オーバーなら水(2)・金(4)
  // 教養・外国語→火（1）を優先、オーバーなら月(0)・水(2)
  const senmon    = subjects.filter(s => s.deadline_type==='専門');
  const kyoyo     = subjects.filter(s => s.deadline_type!=='専門');

  // 専門科目の配置（木・水・金・月・火・土の優先順）
  const senmonDays = [3,2,4,0,1,5];
  const senmonBuckets = senmonDays.map(() => []);
  senmon.forEach((s, i) => {
    senmonBuckets[i % senmonDays.length].push(s);
  });
  senmonDays.forEach((d, bi) => {
    senmonBuckets[bi].forEach(s => { tt[semId][s.code] = d; });
  });

  // 教養・外国語（火・月・水・木・金・土の優先順）
  const kyoyoDays = [1,0,2,3,4,5];
  const kyoyoBuckets = kyoyoDays.map(() => []);
  kyoyo.forEach((s, i) => {
    kyoyoBuckets[i % kyoyoDays.length].push(s);
  });
  kyoyoDays.forEach((d, bi) => {
    kyoyoBuckets[bi].forEach(s => { tt[semId][s.code] = d; });
  });

  saveTimetable(tt);
}
