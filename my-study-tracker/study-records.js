// 学期ごとの成績・提出・受験記録。動画の旧保存形式は変更しない。
const GRADE_POINTS = Object.freeze({ A: 4, B: 3, C: 2, D: 1, F: 0 });
const GRADE_LABELS = Object.freeze({ A: 'A', B: 'B', C: 'C', D: 'D', F: 'F（不合格）', K: 'K（履修放棄）', P: 'P（単位認定）' });

function escapeText(value) {
  return String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

function normalizeRecords(value) {
  if (!isPlainObject(value)) return {};
  const result = {};
  SEMESTERS.forEach(semester => {
    if (!isPlainObject(value[semester.id])) return;
    const records = {};
    Object.entries(value[semester.id]).forEach(([code, record]) => {
      const subject = SUBJECT_BY_CODE.get(code);
      if (!subject || !isPlainObject(record)) return;
      records[code] = {
        grade: Object.hasOwn(GRADE_LABELS, record.grade) ? record.grade : '',
        assignments: Array.isArray(record.assignments)
          ? [...new Set(record.assignments.filter(n => Number.isInteger(n) && n >= 1 && n <= subject.lessons))].sort((a, b) => a - b) : [],
        examTaken: record.examTaken === true,
      };
    });
    if (Object.keys(records).length) result[semester.id] = records;
  });
  return result;
}

function validateRecords(value) {
  if (!isPlainObject(value)) throw new Error('成績・提出記録の形式が不正です。');
  for (const [semId, records] of Object.entries(value)) {
    if (!SEMESTERS.some(sem => String(sem.id) === semId) || !isPlainObject(records)) throw new Error('記録の学期を確認できません。');
    for (const [code, record] of Object.entries(records)) {
      const subject = SUBJECT_BY_CODE.get(code);
      if (!subject || !isPlainObject(record)
          || !(record.grade === '' || Object.hasOwn(GRADE_LABELS, record.grade))
          || typeof record.examTaken !== 'boolean' || !Array.isArray(record.assignments)
          || record.assignments.some(n => !Number.isInteger(n) || n < 1 || n > subject.lessons)) {
        throw new Error('成績・提出記録の内容が不正です。');
      }
    }
  }
  return normalizeRecords(value);
}

function getStudyRecord(semId, code) {
  return state.records[semId]?.[code] || { grade: '', assignments: [], examTaken: false };
}

function getRecordedSubjects(semId) {
  return [...new Set([...getEnrolledCodes(semId), ...Object.keys(state.records[semId] || {})])]
    .map(code => SUBJECT_BY_CODE.get(code)).filter(Boolean);
}

function changeStudyRecord(semId, code, change) {
  if (!SEMESTERS.some(sem => sem.id === semId) || !SUBJECT_BY_CODE.has(code)) return false;
  const current = getStudyRecord(semId, code);
  state.records = { ...state.records, [semId]: { ...state.records[semId], [code]: { ...current, ...change } } };
  return saveState();
}

function setAssignment(semId, code, lesson, checked) {
  const subject = SUBJECT_BY_CODE.get(code);
  const sem = SEMESTERS.find(item => item.id === semId);
  if (!subject || !sem || !Number.isInteger(lesson) || lesson < 1 || lesson > subject.lessons
      || !isLessonAvailable(lesson, subject, sem)) return false;
  const assignments = new Set(getStudyRecord(semId, code).assignments);
  if (checked) assignments.add(lesson); else assignments.delete(lesson);
  return changeStudyRecord(semId, code, { assignments: [...assignments].sort((a, b) => a - b) });
}

function isLessonRecorded(semId, code, lesson) {
  return getCompletedLessons(code) >= lesson * 4 && getStudyRecord(semId, code).assignments.includes(lesson);
}

function getAttendanceSummary(semId, subject) {
  const record = getStudyRecord(semId, subject.code);
  const count = record.assignments.filter(n => getCompletedLessons(subject.code) >= n * 4).length;
  return { count, required: Math.ceil(subject.lessons * 2 / 3) };
}

function getGradeSummary(semId = null) {
  let weighted = 0, gpaCredits = 0, graded = 0;
  const passed = new Set(), recognized = new Set(), attempts = new Map();
  Object.entries(state.records).forEach(([id, records]) => {
    if (semId !== null && Number(id) !== semId) return;
    Object.entries(records).forEach(([code, record]) => {
      const subject = SUBJECT_BY_CODE.get(code);
      if (!subject || !record.grade) return;
      graded++;
      attempts.set(code, (attempts.get(code) || 0) + 1);
      if (Object.hasOwn(GRADE_POINTS, record.grade)) {
        gpaCredits += subject.credits;
        weighted += subject.credits * GRADE_POINTS[record.grade];
        if (record.grade !== 'F') passed.add(code);
      } else if (record.grade === 'P') recognized.add(code);
    });
  });
  passed.forEach(code => recognized.delete(code));
  const credits = codes => [...codes].reduce((sum, code) => sum + SUBJECT_BY_CODE.get(code).credits, 0);
  return { gpa: gpaCredits ? weighted / gpaCredits : null, gpaCredits, graded,
    earnedCredits: credits(passed) + credits(recognized), recognizedCredits: credits(recognized),
    passedCodes: [...passed], repeated: [...attempts.values()].some(count => count > 1) };
}

function renderSubjectChecks(subject, semId) {
  const sem = SEMESTERS.find(item => item.id === semId);
  const record = getStudyRecord(semId, subject.code);
  const attendance = getAttendanceSummary(semId, subject);
  const rows = Array.from({ length: subject.lessons }, (_, index) => {
    const n = index + 1;
    const available = isLessonAvailable(n, subject, sem);
    return `<label class="assignment-check"><input type="checkbox" data-assignment="${n}" data-code="${subject.code}"
      ${record.assignments.includes(n) ? 'checked' : ''} ${available ? '' : 'disabled'}
      aria-label="${escapeText(subject.name)} 第${n}回の課題提出"><span>${n}回</span></label>`;
  }).join('');
  return `<details class="study-checks" data-checks-code="${subject.code}">
    <summary>課題 ${record.assignments.length}/${subject.lessons}回 · 期末 ${record.examTaken ? '受験済み' : '未記録'}</summary>
    <p class="settings-note">提出した回だけチェックしてください。動画の記録とは別に保存します。</p>
    <div class="assignment-grid">${rows}</div>
    <label class="exam-check"><input type="checkbox" data-exam="${subject.code}" ${record.examTaken ? 'checked' : ''}>期末試験を受験した</label>
    <p class="settings-note">動画＋課題の記録：${attendance.count}/${subject.lessons}回。3分の2の目安：${attendance.required}回。
    正式な出席・受験可否はCloud Campusで確認してください。</p>
  </details>`;
}

function bindStudyChecks(container, semId) {
  container.querySelectorAll('[data-assignment]').forEach(input => input.addEventListener('change', () => {
    const code = input.dataset.code;
    setAssignment(semId, code, Number(input.dataset.assignment), input.checked);
    refreshStudyChecks(code, input.dataset.assignment);
  }));
  container.querySelectorAll('[data-exam]').forEach(input => input.addEventListener('change', () => {
    const code = input.dataset.exam;
    changeStudyRecord(semId, code, { examTaken: input.checked });
    refreshStudyChecks(code, 'exam');
  }));
}

function refreshStudyChecks(code, field) {
  const opened = [...document.querySelectorAll('[data-checks-code][open]')].map(item => item.dataset.checksCode);
  renderProgressPage();
  document.querySelectorAll('[data-checks-code]').forEach(item => { item.open = opened.includes(item.dataset.checksCode); });
  const selector = field === 'exam' ? `[data-exam="${code}"]` : `[data-code="${code}"][data-assignment="${field}"]`;
  document.querySelector(selector)?.focus({ preventScroll: true });
}

let progressView = 'learning';
function setProgressView(view) {
  progressView = view === 'grades' ? 'grades' : 'learning';
  renderProgressPage();
}

function renderGrades(container, semId) {
  const semester = getGradeSummary(semId), all = getGradeSummary();
  const plan = getGraduationPlan(all.passedCodes);
  const subjects = getRecordedSubjects(semId);
  const formatGPA = summary => summary.gpa === null ? '未計算' : summary.gpa.toFixed(2);
  container.innerHTML = `<div class="card">
    <div class="card-label">GRADES</div><div class="card-title">成績と修得単位</div>
    <div class="record-stats">
      <div><strong>${formatGPA(semester)}</strong><span>この学期の参考GPA</span></div>
      <div><strong>${all.earnedCredits}<small>単位</small></strong><span>全学期の修得記録</span></div>
      <div><strong>${formatGPA(all)}</strong><span>全学期の参考GPA</span></div>
    </div>
    <p class="settings-note">A=4・B=3・C=2・D=1・F=0。Fも単位数の分母に含み、K・P・未登録は除きます。
    この学期のGPA対象：${semester.gpaCredits}単位。修得単位は同じ科目を1回だけ数えます。</p>
    <details class="plan-missing"><summary>MC卒業要件に照らした修得記録を見る</summary>
      <p class="settings-note">A〜Dの登録分を要件に割り当て：${plan.counted}/124単位。
      専門 ${plan.totals['専門']}/62・教養 ${plan.totals['教養']}/24・外国語 ${plan.totals['外国語']}/12・共通割当 ${plan.common}/26。
      Pのみの認定 ${all.recognizedCredits}単位は区分未確認のため、この判定には含めません。</p>
      <p class="settings-note">未修得の必修：${plan.missing.length ? plan.missing.map(code => escapeText(SUBJECT_BY_CODE.get(code).name)).join('、') : '登録上はなし'}。</p>
      <p class="settings-note">履修予定は設定の「履修計画」で確認できます。卒業・認定単位の正式な判定は大学で確認してください。</p>
    </details>
    <p class="settings-note">参考GPAは登録した全履修回を集計します。再履修時の公式な扱いは大学で確認してください。${all.repeated ? '同じ科目の複数学期の成績が含まれています。' : ''}</p>
  </div>
  <div class="card"><div class="card-title">この学期の成績を登録</div>
    <p class="settings-note">大学で発表された評価を選択してください。変更は自動保存されます。</p>
    ${subjects.length ? subjects.map(subject => `<label class="grade-row"><span><strong>${escapeText(subject.name)}</strong>
      <small>${subject.code} · ${subject.credits}単位${getEnrolledCodes(semId).includes(subject.code) ? '' : ' · 履修選択を解除した記録'}</small></span>
      <select class="record-select" data-grade="${subject.code}" aria-label="${escapeText(subject.name)}の成績">
        <option value="">未登録</option>${Object.entries(GRADE_LABELS).map(([grade, label]) => `<option value="${grade}" ${getStudyRecord(semId, subject.code).grade === grade ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>`).join('') : '<p class="settings-note">設定で履修科目を選ぶと、ここで成績を登録できます。</p>'}
  </div>`;
  container.querySelectorAll('[data-grade]').forEach(select => select.addEventListener('change', () => {
    const code = select.dataset.grade;
    changeStudyRecord(semId, code, { grade: select.value });
    renderGrades(container, semId);
    container.querySelector(`[data-grade="${code}"]`)?.focus({ preventScroll: true });
  }));
}
