// ==========================================
// 科目データ取得（localStorageまたはschedule.js）
// ==========================================
function getSubjects() {
  const saved = localStorage.getItem('cyber-tracker-subjects');
  return saved ? JSON.parse(saved) : (typeof SUBJECTS !== 'undefined' ? SUBJECTS : []);
}

function getWeeklyPlan() {
  const saved = localStorage.getItem('cyber-tracker-weekly');
  return saved ? JSON.parse(saved) : (typeof WEEKLY_PLAN !== 'undefined' ? WEEKLY_PLAN : []);
}

// ==========================================
// 初期化
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

function initApp() {
  loadFromURL();
  loadProgress();
  renderHeader();
  renderToday();
  renderWeek();
  renderSubjects();
  renderSemester();
  setupNav();
  registerSW();
}

// ==========================================
// Service Worker登録
// ==========================================
function registerSW() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js');
  }
}

// ==========================================
// URLパラメータからデータを読み込む（iPhone初回セットアップ用）
// ==========================================
function loadFromURL() {
  const params = new URLSearchParams(window.location.search);
  const data = params.get('data');
  if (!data) return;
  try {
    const json = decodeURIComponent(atob(data));
    const parsed = JSON.parse(json);
    localStorage.setItem('cyber-tracker-subjects', JSON.stringify(parsed.subjects));
    localStorage.setItem('cyber-tracker-weekly', JSON.stringify(parsed.weeklyPlan));
    window.history.replaceState({}, '', './index.html');
    alert('✅ 科目データを保存しました！');
  } catch(e) {
    console.error('データの読み込みに失敗しました', e);
  }
}

// ==========================================
// 進捗データ（localStorage）
// ==========================================
let progress = {};

function loadProgress() {
  const saved = localStorage.getItem('cyber-tracker-progress');
  progress = saved ? JSON.parse(saved) : {};
  getSubjects().forEach(s => {
    if (!progress[s.id]) {
      progress[s.id] = { completedLessons: 0 };
    }
  });
}

function saveProgress() {
  localStorage.setItem('cyber-tracker-progress', JSON.stringify(progress));
}

function getCompletedLessons(subjectId) {
  return progress[subjectId]?.completedLessons || 0;
}

function toggleLesson(subjectId, lessonNum) {
  const p = progress[subjectId];
  const current = p.completedLessons;
  if (lessonNum === current + 1) {
    p.completedLessons = lessonNum;
  } else if (lessonNum === current) {
    p.completedLessons = lessonNum - 1;
  } else {
    return;
  }
  saveProgress();
  renderToday();
  renderSubjects();
  renderSemester();
}

// ==========================================
// 今日の目標コマ数を計算
// ==========================================
function getTodayTarget(subject) {
  const today = new Date();
  const start = new Date('2026-04-03');
  const deadline = new Date(subject.deadline);
  const totalDays = Math.ceil((deadline - start) / (1000 * 60 * 60 * 24));
  const passedDays = Math.ceil((today - start) / (1000 * 60 * 60 * 24));
  const ratio = Math.max(0, Math.min(1, passedDays / totalDays));
  return Math.ceil(subject.totalLessons * ratio);
}

// ==========================================
// ヘッダー
// ==========================================
function renderHeader() {
  const now = new Date();
  const dateStr = now.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  document.getElementById('header-date').textContent = dateStr;
}

// ==========================================
// 今日ページ
// ==========================================
function renderToday() {
  const today = new Date();
  const dow = today.getDay();
  const plan = getWeeklyPlan()[dow];
  const container = document.getElementById('today-subjects');
  container.innerHTML = '';

  // アラート（締め切りチェック）
  const alerts = document.getElementById('today-alerts');
  alerts.innerHTML = '';
  getSubjects().forEach(s => {
    const target = getTodayTarget(s);
    const done = getCompletedLessons(s.id);
    const behind = target - done;
    if (behind >= 3) {
      alerts.innerHTML += `
        <div class="alert alert-danger">
          ⚠️ <b>${s.name}</b> ${behind}コマ遅れています！
        </div>`;
    } else if (behind >= 1) {
      alerts.innerHTML += `
        <div class="alert alert-warn">
          📌 <b>${s.name}</b> ${behind}コマ遅れ気味です
        </div>`;
    }
  });

  if (!plan || plan.isRest) {
    container.innerHTML = `
      <div style="text-align:center;padding:32px;color:#9ca3af;">
        <div style="font-size:48px">😴</div>
        <div style="margin-top:8px;font-weight:600">今日は休息日です</div>
        <div style="font-size:13px;margin-top:4px">ゆっくり充電しましょう！</div>
      </div>`;
    return;
  }

  plan.subjects.forEach(subjectId => {
    const s = getSubjects().find(x => x.id === subjectId);
    if (!s) return;
    const done = getCompletedLessons(s.id);
    const target = getTodayTarget(s);
    const pct = Math.round((done / s.totalLessons) * 100);

    let badgeClass = 'target-ok';
    let badgeText = '✅ 進捗OK';
    if (done < target - 2) {
      badgeClass = 'target-danger';
      badgeText = `🔴 ${target - done}コマ遅れ`;
    } else if (done < target) {
      badgeClass = 'target-warn';
      badgeText = `🟡 ${target - done}コマ遅れ気味`;
    }

    container.innerHTML += `
      <div class="today-subject" style="border-color:${s.color}">
        <div class="subject-name">${s.name}</div>
        <div class="subject-meta">
          ${s.type} ／ ${done}/${s.totalLessons}コマ完了
        </div>
        <div class="progress-bar-wrap">
          <div class="progress-bar" style="width:${pct}%;background:${s.color}"></div>
        </div>
        <span class="target-badge ${badgeClass}">${badgeText}（今日の目標：${target}コマ）</span>
      </div>`;
  });

  // 時間割
  const timeTable = document.getElementById('today-timetable');
  timeTable.innerHTML = `
    <div style="font-size:13px;color:#4b5563;">
      <div style="margin-bottom:6px;">📅 <b>今日の学習スケジュール</b></div>
      <div style="background:#f3f4f6;border-radius:8px;padding:10px;">
        <div>🌞 <b>昼休み（12:00〜13:00）</b></div>
        <div style="margin-left:20px;margin-top:4px;">
          ${plan.subjects[0] ? `・${getSubjects().find(x=>x.id===plan.subjects[0])?.name}：1章視聴（約15分）＋課題` : ''}
        </div>
        <div style="margin-top:8px;">🌙 <b>夜（18:30〜22:00）</b></div>
        <div style="margin-left:20px;margin-top:4px;">
          ${plan.subjects.map(id => {
            const s = getSubjects().find(x => x.id === id);
            return s ? `・${s.name}：1コマ（約90分）` : '';
          }).join('<br>')}
        </div>
      </div>
    </div>`;
}

// ==========================================
// 週間スケジュール
// ==========================================
function renderWeek() {
  const today = new Date().getDay();
  const container = document.getElementById('week-grid');
  container.innerHTML = '';

  getWeeklyPlan().forEach(plan => {
    const isToday = plan.day === today;
    let html = `<div class="week-day ${isToday ? 'today' : ''} ${plan.isRest ? 'rest' : ''}">`;
    html += `<div class="week-day-label">${plan.label}</div>`;
    if (plan.isRest) {
      html += `<div class="week-day-subject">休</div>`;
    } else {
      plan.subjects.forEach(id => {
        const s = getSubjects().find(x => x.id === id);
        if (s) {
          html += `<div class="week-day-subject" style="background:${s.color}22;color:${s.color}">${s.name.slice(0, 4)}</div>`;
        }
      });
    }
    html += `</div>`;
    container.innerHTML += html;
  });
}

// ==========================================
// 科目一覧ページ
// ==========================================
function renderSubjects() {
  const container = document.getElementById('subjects-list');
  container.innerHTML = '';

  // 科目データがない場合
  if (getSubjects().length === 0) {
    container.innerHTML = `
      <div class="card" style="text-align:center;padding:32px;">
        <div style="font-size:48px">📭</div>
        <div style="font-weight:600;margin-top:8px;">科目データがありません</div>
        <div style="font-size:13px;color:#6b7280;margin-top:4px;">
          PCで setup.html を開いてQRコードをスキャンしてください
        </div>
      </div>`;
    return;
  }

  ['専門', '教養', '外国語'].forEach(type => {
    const list = getSubjects().filter(s => s.type === type);
    if (list.length === 0) return;
    container.innerHTML += `<div class="section-title">${type}科目</div>`;

    list.forEach(s => {
      const done = getCompletedLessons(s.id);
      const target = getTodayTarget(s);
      const pct = Math.round((done / s.totalLessons) * 100);
      const deadline = new Date(s.deadline).toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });

      let badgeText = '✅ OK';
      let badgeStyle = `background:#d1fae5;color:#065f46`;
      if (done < target - 2) {
        badgeText = '🔴 遅れ';
        badgeStyle = `background:#fee2e2;color:#991b1b`;
      } else if (done < target) {
        badgeText = '🟡 注意';
        badgeStyle = `background:#fef3c7;color:#92400e`;
      }

      // コマボタン
      let lessonBtns = '<div class="lesson-grid">';
      for (let i = 1; i <= s.totalLessons; i++) {
        const isDone = i <= done;
        const isTarget = i === target;
        lessonBtns += `
          <button
            class="lesson-btn ${isDone ? 'done' : ''} ${isTarget ? 'today-target' : ''}"
            onclick="toggleLesson('${s.id}', ${i})"
            title="${i}コマ目"
          >${i}</button>`;
      }
      lessonBtns += '</div>';

      container.innerHTML += `
        <div class="subject-card">
          <div class="s-header">
            <div class="s-name">${s.name}</div>
            <span class="s-badge" style="${badgeStyle}">${badgeText}</span>
          </div>
          <div class="s-stats">
            ${done}/${s.totalLessons}コマ完了（${pct}%）｜期末：${deadline}｜今日の目標：${target}コマ
          </div>
          <div class="progress-bar-wrap">
            <div class="progress-bar" style="width:${pct}%;background:${s.color}"></div>
          </div>
          ${lessonBtns}
        </div>`;
    });
  });
}

// ==========================================
// 学期全体ページ
// ==========================================
function renderSemester() {
  const container = document.getElementById('semester-content');
  const subjects = getSubjects();
  const totalLessons = subjects.reduce((a, s) => a + s.totalLessons, 0);
  const totalDone = subjects.reduce((a, s) => a + getCompletedLessons(s.id), 0);
  const totalPct = totalLessons > 0 ? Math.round((totalDone / totalLessons) * 100) : 0;

  container.innerHTML = `
    <div class="card">
      <div class="card-title">📊 学期全体の進捗</div>
      <div style="text-align:center;padding:8px 0;">
        <div style="font-size:36px;font-weight:800;color:#2563eb">${totalPct}%</div>
        <div style="color:#6b7280;font-size:13px;">${totalDone} / ${totalLessons} コマ完了</div>
      </div>
      <div class="progress-bar-wrap" style="height:12px;margin-top:8px;">
        <div class="progress-bar" style="width:${totalPct}%;background:#2563eb;height:100%;border-radius:99px;"></div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📅 重要な締め切り</div>
      <div style="font-size:13px;color:#4b5563;">
        <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          📌 出席認定締切（教養・外国語）：<b>毎週火曜 12:00</b>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          📌 出席認定締切（専門）：<b>毎週木曜 12:00</b>
        </div>
        <div style="padding:8px 0;border-bottom:1px solid #f3f4f6;">
          🏁 期末試験：<b>2026年8月6日（木）</b>
        </div>
        <div style="padding:8px 0;">
          📝 成績発表：<b>2026年9月1日（火）</b>
        </div>
      </div>
    </div>

    <div class="card">
      <div class="card-title">📚 科目別進捗サマリー</div>
      ${subjects.map(s => {
        const done = getCompletedLessons(s.id);
        const pct = Math.round((done / s.totalLessons) * 100);
        return `
          <div style="margin-bottom:10px;">
            <div style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:3px;">
              <span>${s.name}</span>
              <span style="color:#6b7280">${done}/${s.totalLessons}</span>
            </div>
            <div class="progress-bar-wrap" style="height:6px;">
              <div class="progress-bar" style="width:${pct}%;background:${s.color};height:100%;border-radius:99px;"></div>
            </div>
          </div>`;
      }).join('')}
    </div>`;
}

// ==========================================
// ナビゲーション
// ==========================================
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.page;
      document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById(`page-${target}`).classList.add('active');
    });
  });
}
