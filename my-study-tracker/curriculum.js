// 端末に読み込んだ科目・要件を使って計画を計算する。
// 年度・学期をまたぐ開講情報と、履修「計画」の集計をまとめる。
function semesterOrder(year, season) { return Number(year) * 2 + (season === '秋' ? 1 : 0); }
function termOrder(term) { const [year, season] = term.split('-'); return semesterOrder(year, season); }

function getSubjectAvailability(subject, semester) {
  const order = semesterOrder(semester.year, semester.season);
  if (subject.legacy) return { selectable: false, note: '旧科目・新規開講は資料で未確認' };
  if (subject.offered_from && order < termOrder(subject.offered_from)) {
    return { selectable: false, note: `${subject.offered_from.replace('-', '年')}に開講予定` };
  }
  if (subject.retired_from && order >= termOrder(subject.retired_from)) {
    return { selectable: false, note: `${subject.retired_from.replace('-', '年')}から廃止予定` };
  }
  if (subject.unavailable_terms?.includes(`${semester.year}-${semester.season}`)) {
    return { selectable: false, note: 'この学期は開講予定なし' };
  }
  return { selectable: true, note: subject.retired_from ? `${subject.retired_from.replace('-', '年')}から廃止予定` : subject.offered_from ? `${subject.offered_from.replace('-', '年')}に新規開講予定` : '' };
}

function getGraduationPlan(codes) {
  const r = GRADUATION_RULES;
  const selected = [...new Set(codes)].map(code => SUBJECT_BY_CODE.get(code)).filter(Boolean);
  const totals = { '専門': 0, '教養': 0, '外国語': 0 };
  selected.forEach(subject => { totals[subject.category] += subject.credits; });
  const foreignElective = Math.min(r.foreignElective, Math.max(0, totals['外国語'] - r.foreignRequired));
  const liberalReplacement = Math.min(r.foreignElective - foreignElective, Math.max(0, totals['教養'] - r.liberal));
  const common = Math.max(0, totals['専門'] - r.specialized)
    + Math.max(0, totals['教養'] - r.liberal - liberalReplacement)
    + Math.min(r.foreignCommonMax, Math.max(0, totals['外国語'] - r.foreignRequired - foreignElective));
  const counted = Math.min(r.specialized, totals['専門']) + Math.min(r.liberal, totals['教養'])
    + Math.min(r.foreignRequired, totals['外国語']) + foreignElective + liberalReplacement + Math.min(r.common, common);
  const set = new Set(codes);
  const missing = MC_REQUIRED_CODES.filter(code => !set.has(code));
  return { totals, foreignElective, liberalReplacement, common, counted, missing,
    total: selected.reduce((sum, subject) => sum + subject.credits, 0),
    meetsPlan: counted >= r.total && missing.length === 0 };
}

function getAllPlannedCodes() {
  return new Set(SEMESTERS.flatMap(semester => getEnrolledCodes(semester.id)));
}

function getBadgePlan(badge, codes, visiting = new Set(), confirmedManual = new Set()) {
  if (!badge || visiting.has(badge.id)) return { satisfied: false, done: 0, total: 0, checks: [] };
  const next = new Set(visiting).add(badge.id);
  const req = badge.requirements || {};
  const find = id => BADGES.find(item => item.id === id);
  const checks = [];
  for (const code of req.codes || []) checks.push({ label: SUBJECT_BY_CODE.get(code)?.name || code, done: codes.has(code) });
  for (const group of req.anyCodeGroups || []) checks.push({
    label: group.map(code => SUBJECT_BY_CODE.get(code)?.name || code).join(' / ') + ' から1科目',
    done: group.some(code => codes.has(code)),
  });
  for (const group of req.creditGroups || []) {
    const credits = [...codes].reduce((sum, code) => {
      const subject = SUBJECT_BY_CODE.get(code);
      return sum + (subject?.category === '教養' && subject.type === group.type ? subject.credits : 0);
    }, 0);
    checks.push({ label: `${group.type}分野 ${credits}/${group.credits}単位`, done: credits >= group.credits });
  }
  for (const id of [...(req.prerequisite ? [req.prerequisite] : []), ...(req.prerequisites || [])]) {
    checks.push({ label: `前提：${find(id)?.name || id}`, done: getBadgePlan(find(id), codes, next, confirmedManual).satisfied });
  }
  if (req.prerequisiteAny) checks.push({
    label: '前提：' + req.prerequisiteAny.map(id => find(id)?.name || id).join(' / ') + ' のいずれか',
    done: req.prerequisiteAny.some(id => getBadgePlan(find(id), codes, next, confirmedManual).satisfied),
  });
  if (req.manual) checks.push({ label: '卒研テーマ・追加条件の確認', done: confirmedManual.has(badge.id) });
  const done = checks.filter(check => check.done).length;
  return { satisfied: checks.length > 0 && done === checks.length, done, total: checks.length, checks };
}

// バッジの獲得は、いずれか一つの学期で全コマ＋期末を終えた科目から計算する。
// 別々の学期の途中記録を足し合わせず、単位・成績の判定とも分ける。
function getCompletedCourseCodes() {
  const codes = new Set();
  for (const sem of SEMESTERS) for (const subject of getRecordedSubjects(sem.id)) {
    if (getCourseProgress(sem.id, subject).complete) codes.add(subject.code);
  }
  return codes;
}
function getBadgeAchievement(badge, completed = getCompletedCourseCodes()) {
  return getBadgePlan(badge, completed, new Set(), new Set(state.badgePreferences?.confirmedManual || []));
}
function normalizeBadgePreferences(value, strict = false) {
  const invalid = () => { if (strict) throw new Error('バッジの目標・追加条件確認の内容が不正です。'); };
  if (!isPlainObject(value)) { invalid(); return { goals: [], confirmedManual: [] }; }
  const result = {};
  for (const key of ['goals', 'confirmedManual']) {
    const ids = value[key];
    if (!Array.isArray(ids) || ids.length > 300) { invalid(); result[key] = []; continue; }
    result[key] = [];
    for (const id of ids) {
      const badge = BADGES.find(b => b.id === id);
      if (!badge || (key === 'confirmedManual' && !badge.requirements.manual) || result[key].includes(id)) { invalid(); continue; }
      result[key].push(id);
    }
  }
  return result;
}
function toggleBadgePreference(key, id) {
  const badge = BADGES.find(b => b.id === id);
  if (!badge || !['goals','confirmedManual'].includes(key) || (key === 'confirmedManual' && !badge.requirements.manual)) return false;
  const prefs = normalizeBadgePreferences(state.badgePreferences), ids = new Set(prefs[key]);
  if (ids.has(id)) ids.delete(id); else ids.add(id);
  state.badgePreferences = { ...prefs, [key]: [...ids] };
  return saveState();
}

function getRelevantExams(semester) {
  const keys = new Set(getEnrolledSubjects(semester.id).map(subject => getAttendanceKey(subject, semester)));
  return (semester.exams || []).filter(exam => !exam.keys || exam.keys.some(key => keys.has(key)));
}
