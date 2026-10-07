// 着色は視聴・課題提出をまとめた一段階の完了記録。旧保存キーを引き継ぐ。
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
        ...(Array.isArray(record.viewedLessons) ? { viewedLessons: [...new Set(record.viewedLessons.filter(n => Number.isInteger(n) && n >= 1 && n <= subject.lessons))].sort((a,b) => a-b) } : {}),
        ...(isPlainObject(record.studyDates) ? { studyDates: Object.fromEntries(Object.entries(record.studyDates).filter(([unit, date]) => validStudyUnit(unit, subject) && validCalendarDate(date))) } : {}),
        ...(isPlainObject(record.quizScores) ? {quizScores:normalizeQuizScores(record.quizScores,subject)} : {}),
        ...(isPlainObject(record.evaluation) && validEvaluation(record.evaluation) ? {evaluation:{...record.evaluation}} : {}),
      };
      // 以前どちらか一方で記録したコマも、今回の一段階の完了として引き継ぐ。
      if (Array.isArray(records[code].viewedLessons)) {
        const done = [...new Set([...records[code].viewedLessons, ...records[code].assignments])].sort((a,b) => a-b);
        records[code].viewedLessons = done; records[code].assignments = [...done];
      }
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
          || record.assignments.some(n => !Number.isInteger(n) || n < 1 || n > subject.lessons)
          || (Object.hasOwn(record, 'viewedLessons') && (!Array.isArray(record.viewedLessons) || record.viewedLessons.some(n => !Number.isInteger(n) || n < 1 || n > subject.lessons)))
          || (Object.hasOwn(record, 'studyDates') && (!isPlainObject(record.studyDates) || Object.entries(record.studyDates).some(([unit,date]) => !validStudyUnit(unit,subject) || !validCalendarDate(date))))
          || (Object.hasOwn(record,'quizScores') && (!isPlainObject(record.quizScores) || Object.entries(record.quizScores).some(([unit,score])=>!validStudyUnit(unit,subject)||unit==='exam'||!validQuizScore(score))))
          || (Object.hasOwn(record,'evaluation') && !validEvaluation(record.evaluation))) {
        throw new Error('成績・提出記録の内容が不正です。');
      }
    }
  }
  return normalizeRecords(value);
}

function getStudyRecord(semId, code) {
  return state.records[semId]?.[code] || { grade: '', assignments: [], examTaken: false };
}

function getViewedLessons(semId, code) {
  const record = getStudyRecord(semId, code);
  if (Array.isArray(record.viewedLessons)) return [...new Set([...record.viewedLessons, ...(record.assignments || [])])].sort((a,b) => a-b);
  const count = Math.min(SUBJECT_BY_CODE.get(code)?.lessons || 0, Math.floor(getCompletedLessons(code) / 4));
  return [...new Set([...Array.from({length:count}, (_, i) => i + 1), ...(record.assignments || [])])].sort((a,b) => a-b);
}
function isLessonViewed(semId, code, lesson) { return getViewedLessons(semId, code).includes(lesson); }
function getCourseProgress(semId, subject) {
  const viewed = getViewedLessons(semId, subject.code), exam = getStudyRecord(semId, subject.code).examTaken;
  return { viewed:viewed.length, exam, done:viewed.length + Number(exam), total:subject.lessons+1,
    complete:viewed.length === subject.lessons && exam, next:Array.from({length:subject.lessons}, (_,i)=>i+1).find(n=>!viewed.includes(n)) || null,
    percent:Math.round((viewed.length + Number(exam))/(subject.lessons+1)*100) };
}
function getOverdueLessonCount(semId, subject, semester) {
  return Array.from({length:subject.lessons}, (_,i)=>i+1).filter(n=>!isLessonViewed(semId,subject.code,n) && isLessonLate(n,subject,semester)).length;
}
function renderLessonButtons(subject, semester, semId) {
  const color=getCategoryColor(subject.category), exam=getStudyRecord(semId,subject.code).examTaken;
  let html='<div class="lesson-grid" aria-label="コマ・期末の進捗">';
  for(let n=1;n<=subject.lessons;n++) {
    const done=isLessonViewed(semId,subject.code,n), late=!done && isLessonLate(n,subject,semester), future=!isLessonAvailable(n,subject,semester);
    const style=done?`background:${color};color:#081020;border-color:${color}`:late?'background:var(--red-dim);color:var(--red);border-color:var(--red)':'background:var(--bg3);color:var(--text2)';
    html+=`<button type="button" class="lesson-btn${done?' done':''}" style="${style}" aria-pressed="${done}" aria-label="${escapeText(subject.name)} コマ${n}${future?'（開講前・手動記録）':''}" onclick="toggleLesson('${subject.code}',${n},${semId})">${done?'✓ ':''}${n}</button>`;
  }
  html+=`<button type="button" class="lesson-btn final${exam?' done':''}" style="${exam?`background:${color};color:#081020;border-color:${color}`:'background:var(--bg3);color:var(--text2)'}" aria-pressed="${exam}" aria-label="${escapeText(subject.name)} 期末" onclick="toggleFinalExam('${subject.code}',${semId})">${exam?'✓ ':''}期末</button></div>`;
  return html;
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

function validStudyUnit(unit, subject) {
  return unit === 'exam' || (/^[1-9]\d*$/.test(unit) && Number(unit) <= subject.lessons);
}
function setLessonCompletion(semId, code, lesson, checked) {
  const subject = SUBJECT_BY_CODE.get(code);
  if (!subject || !SEMESTERS.some(s => s.id === semId) || !Number.isInteger(lesson) || lesson < 1 || lesson > subject.lessons) return false;
  const done = new Set(getViewedLessons(semId, code)), record = getStudyRecord(semId, code), studyDates = {...record.studyDates};
  if (checked) {
    // 再度「完了」を指定しても、本人が変更した日付を上書きしない。
    if (!done.has(lesson)) studyDates[lesson] = japanDate();
    done.add(lesson);
  } else { done.delete(lesson); delete studyDates[lesson]; }
  const lessons = [...done].sort((a,b) => a-b);
  return changeStudyRecord(semId, code, {viewedLessons:lessons, assignments:[...lessons], studyDates});
}
function setAssignment(semId, code, lesson, checked) { return setLessonCompletion(semId, code, lesson, checked); }

function isLessonRecorded(semId, code, lesson) {
  return isLessonViewed(semId, code, lesson);
}

function getAttendanceSummary(semId, subject) {
  const count = getViewedLessons(semId, subject.code).length;
  return { count, required: Math.ceil(subject.lessons * 2 / 3) };
}

function setStudyDate(semId, code, unit, date) {
  const subject = SUBJECT_BY_CODE.get(code), record = getStudyRecord(semId, code);
  if (!subject || !validStudyUnit(String(unit),subject) || !validCalendarDate(date) || date > japanDate()
      || !(unit === 'exam' ? record.examTaken : isLessonRecorded(semId,code,Number(unit)))) return false;
  return changeStudyRecord(semId,code,{studyDates:{...record.studyDates,[unit]:date}});
}
function getStudyEntries(day = null) {
  const entries = [];
  for (const sem of SEMESTERS) for (const subject of getRecordedSubjects(sem.id)) {
    const record = getStudyRecord(sem.id,subject.code), units = [...getViewedLessons(sem.id,subject.code).map(String), ...(record.examTaken ? ['exam'] : [])];
    for (const unit of units) {
      const date = record.studyDates?.[unit];
      if (validCalendarDate(date) && (!day || date === day)) entries.push({semId:sem.id, code:subject.code, unit, date,
        label:`${subject.name} ${unit === 'exam' ? '期末' : `コマ${unit}`}`, semester:sem.name});
    }
  }
  return entries.sort((a,b) => a.date.localeCompare(b.date) || a.semId-b.semId || a.code.localeCompare(b.code) || (a.unit === 'exam' ? 999 : Number(a.unit))-(b.unit === 'exam' ? 999 : Number(b.unit)));
}
function studyDateInputHTML(semId, code, unit) {
  const subject = SUBJECT_BY_CODE.get(code), date = getStudyRecord(semId,code).studyDates?.[unit] || '';
  return `<input type="date" data-study-date="${unit}" data-study-code="${code}" data-study-sem="${semId}" value="${date}" min="2000-01-01" max="${japanDate()}" aria-label="${escapeText(subject.name)} ${unit === 'exam' ? '期末' : `コマ${unit}`}の学習日">`;
}
function studyDayRecordsHTML(day) {
  const entries = getStudyEntries(day);
  if (!entries.length) return '';
  return `<section class="study-day-records"><h4>🍑 この日に勉強した記録 · ${entries.length}件</h4>${entries.map(e => `<label class="study-date-row"><span>${escapeText(e.label)}<small>${escapeText(e.semester)}</small></span>${studyDateInputHTML(e.semId,e.code,e.unit)}</label>`).join('')}<p class="settings-note">深夜に記録した分も、学習日を前日などへ変更できます。</p></section>`;
}
function bindStudyDateInputs(container, onSaved) {
  container.querySelectorAll('[data-study-date]').forEach(input => input.addEventListener('change', () => {
    const {studySem,studyCode,studyDate} = input.dataset;
    const saved = setStudyDate(Number(studySem),studyCode,studyDate,input.value);
    input.value = getStudyRecord(Number(studySem),studyCode).studyDates?.[studyDate] || '';
    input.blur();
    if (saved) onSaved(studyCode,studyDate);
  }));
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
  return quizCourseSummaryHTML(semId,subject);
}

function bindStudyChecks(container, semId) {
  bindStudyDateInputs(container,refreshStudyChecks);
}

function refreshStudyChecks(code, field) {
  const opened = [...document.querySelectorAll('[data-checks-code][open]')].map(item => item.dataset.checksCode);
  renderProgressPage();
  document.querySelectorAll('[data-checks-code]').forEach(item => { item.open = opened.includes(item.dataset.checksCode); });
}

let progressView = 'learning';
function setProgressView(view) {
  progressView = view === 'grades' ? 'grades' : 'learning';
  renderProgressPage();
}

function renderGradeSummary(semId) {
  const semester = getGradeSummary(semId), all = getGradeSummary();
  const plan = getGraduationPlan(all.passedCodes);
  const formatGPA = summary => summary.gpa === null ? '未計算' : summary.gpa.toFixed(2);
  const r = GRADUATION_RULES;
  return `<div class="card">
    <div class="card-label">GRADES</div><div class="card-title">成績と修得単位</div>
    <div class="record-stats">
      <div><strong>${formatGPA(semester)}</strong><span>この学期の参考GPA</span></div>
      <div><strong>${all.earnedCredits}<small>単位</small></strong><span>全学期の修得記録</span></div>
      <div><strong>${formatGPA(all)}</strong><span>全学期の参考GPA</span></div>
    </div>
    <p class="record-caption">GPA対象：この学期 ${semester.gpaCredits}単位</p>
    <details class="plan-missing"><summary>MC卒業要件に照らした修得記録を見る</summary>
      <p class="settings-note">A〜Dの登録分を要件に割り当て：${plan.counted}/${r.total}単位。
      専門 ${plan.totals['専門']}/${r.specialized}・教養 ${plan.totals['教養']}/${r.liberal}・外国語 ${plan.totals['外国語']}/${r.foreignRequired+r.foreignElective}・共通割当 ${plan.common}/${r.common}。
      Pのみの認定 ${all.recognizedCredits}単位は区分未確認のため、この判定には含めません。</p>
      <p class="settings-note">未修得の必修：${plan.missing.length ? plan.missing.map(code => escapeText(SUBJECT_BY_CODE.get(code).name)).join('、') : '登録上はなし'}。</p>
    </details>
  </div>
`;
}
function renderGrades(container, semId) {
  const subjects = getRecordedSubjects(semId);
  container.innerHTML = `<div id="grade-summary">${renderGradeSummary(semId)}${scholarshipSummaryHTML(semId)}</div>
  <div class="card"><div class="card-title">この学期の成績を登録</div>
    ${subjects.length ? subjects.map(subject => `<label class="grade-row"><span><strong>${escapeText(subject.name)}</strong>
      <small>${subject.code} · ${subject.credits}単位${getEnrolledCodes(semId).includes(subject.code) ? '' : ' · 履修選択を解除した記録'}</small></span>
      <select class="record-select" data-grade="${subject.code}" aria-label="${escapeText(subject.name)}の成績">
        <option value="">未登録</option>${Object.entries(GRADE_LABELS).map(([grade, label]) => `<option value="${grade}" ${getStudyRecord(semId, subject.code).grade === grade ? 'selected' : ''}>${label}</option>`).join('')}
      </select></label>`).join('') : '<p class="settings-note">設定で履修科目を選ぶと、ここで成績を登録できます。</p>'}
  </div>`;
  container.querySelectorAll('[data-grade]').forEach(select => select.addEventListener('change', () => {
    const code = select.dataset.grade;
    changeStudyRecord(semId, code, { grade: select.value });
    select.value = getStudyRecord(semId, code).grade;
    document.getElementById('grade-summary').innerHTML = renderGradeSummary(semId)+scholarshipSummaryHTML(semId);
    select.blur();
  }));
}
