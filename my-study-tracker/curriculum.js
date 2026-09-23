// 提供資料：開講予定表 2026-06-19、取得要件チェックリスト 2026-08-01。
// 年度・学期をまたぐ開講情報と、履修「計画」の集計をまとめる。
function semesterOrder(year, season) { return Number(year) * 2 + (season === '秋' ? 1 : 0); }
function termOrder(term) { const [year, season] = term.split('-'); return semesterOrder(year, season); }

function getSubjectAvailability(subject, semester) {
  const order = semesterOrder(semester.year, semester.season);
  if (subject.legacy) return { selectable: false, note: '旧科目・新規開講は資料で未確認' };
  if (subject.offered_from && order < termOrder(subject.offered_from)) {
    return { selectable: false, note: '2027年春に開講予定' };
  }
  if (subject.retired_from && order >= termOrder(subject.retired_from)) {
    return { selectable: false, note: '2027年春から廃止予定' };
  }
  if (subject.unavailable_terms?.includes(`${semester.year}-${semester.season}`)) {
    return { selectable: false, note: 'この学期は開講予定なし' };
  }
  return { selectable: true, note: subject.retired_from ? '2027年春から廃止予定' : subject.offered_from ? '2027年春に新規開講予定' : '' };
}

const MC_REQUIRED_CODES = ['CS101','CS102','CS103','CS153','CS154','CS156','PM101','BA101',
  'TH401E','SD101E','SD301E','ENGL101E','ENGL151E','ENGL201E','ENGL251E'];

// 62専門 + 24教養 + 12外国語（選択4単位は教養で代替可）+ 共通26。
// 共通に回せる外国語は8単位まで。各科目を二重計上しない。
function getGraduationPlan(codes) {
  const selected = [...new Set(codes)].map(code => SUBJECT_BY_CODE.get(code)).filter(Boolean);
  const totals = { '専門': 0, '教養': 0, '外国語': 0 };
  selected.forEach(subject => { totals[subject.category] += subject.credits; });
  const foreignElective = Math.min(4, Math.max(0, totals['外国語'] - 8));
  const liberalReplacement = Math.min(4 - foreignElective, Math.max(0, totals['教養'] - 24));
  const common = Math.max(0, totals['専門'] - 62)
    + Math.max(0, totals['教養'] - 24 - liberalReplacement)
    + Math.min(8, Math.max(0, totals['外国語'] - 8 - foreignElective));
  const counted = Math.min(62, totals['専門']) + Math.min(24, totals['教養'])
    + Math.min(8, totals['外国語']) + foreignElective + liberalReplacement + Math.min(26, common);
  const set = new Set(codes);
  const missing = MC_REQUIRED_CODES.filter(code => !set.has(code));
  return { totals, foreignElective, liberalReplacement, common, counted, missing,
    total: selected.reduce((sum, subject) => sum + subject.credits, 0),
    meetsPlan: counted >= 124 && missing.length === 0 };
}

function getAllPlannedCodes() {
  return new Set(SEMESTERS.flatMap(semester => getEnrolledCodes(semester.id)));
}

function getBadgePlan(badge, codes, visiting = new Set()) {
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
    checks.push({ label: `前提：${find(id)?.name || id}`, done: getBadgePlan(find(id), codes, next).satisfied });
  }
  if (req.prerequisiteAny) checks.push({
    label: '前提：' + req.prerequisiteAny.map(id => find(id)?.name || id).join(' / ') + ' のいずれか',
    done: req.prerequisiteAny.some(id => getBadgePlan(find(id), codes, next).satisfied),
  });
  if (req.manual) checks.push({ label: '卒研テーマ・追加条件は大学で確認', done: false });
  const done = checks.filter(check => check.done).length;
  return { satisfied: checks.length > 0 && done === checks.length, done, total: checks.length, checks };
}

// 2026年度秋学期講義日程（IMG_9287）。授業開始・締切はいずれも日本時間12時。
const autumnNoon = date => `${date}T12:00:00+09:00`;
const autumnDates = dates => dates.split(' ').map(date => `${date.startsWith('01') || date.startsWith('02') ? '2027' : '2026'}-${date}`);
function autumnTable(ends, starts) {
  const endDates = autumnDates(ends);
  const startDates = starts ? autumnDates(starts) : null;
  return [null, ...endDates.map((end, index) => startDates
    ? { start: autumnNoon(startDates[index]), end: autumnNoon(end) } : autumnNoon(end))];
}
const ATTENDANCE_2026_AUTUMN = {
  senmon_issai: autumnTable('10-15 10-22 10-29 11-05 11-12 11-19 11-26 12-03 12-10 12-17 12-24 01-07 01-14 01-21 01-28'),
  senmon_jyunji: autumnTable('10-15 10-22 10-29 11-05 11-12 11-19 11-26 12-03 12-10 12-17 12-24 01-07 01-14 01-21 01-28 02-04',
    '10-02 10-08 10-15 10-22 10-29 11-05 11-12 11-19 11-26 12-03 12-10 12-17 12-24 01-07 01-14 01-14'),
  kyoyo_zenki: autumnTable('10-13 10-20 10-27 11-04 11-10 11-17 11-24 12-01'),
  kyoyo_koki: autumnTable('12-04 12-11 12-15 12-22 01-05 01-12 01-19 01-26'),
  kyoyo_enshu: autumnTable('10-13 10-20 10-27 11-04 11-10 11-17 11-24 12-01',
    '10-02 10-06 10-13 10-20 10-27 11-03 11-10 11-17'),
  academic_writing: autumnTable('10-13 10-27 11-10 11-24 12-08 12-22 01-12 01-26',
    '10-02 10-13 10-27 11-10 11-24 12-08 12-22 01-12'),
  gaikokugo: autumnTable('10-13 10-20 10-27 11-04 11-10 11-17 11-24 12-01 12-08 12-15 12-22 01-05 01-12 01-19 01-26'),
  study_skill: autumnTable('10-06 10-13 10-20 10-27 11-04 11-10 11-17 11-17',
    '10-01 10-01 10-01 10-01 10-01 10-01 10-01 10-01'),
};
Object.assign(SEMESTERS.find(semester => semester.id === 1), {
  lectureStart: '2026-04-03T12:00:00+09:00', lateTermStart: '2026-05-26T12:00:00+09:00',
});
Object.assign(SEMESTERS.find(semester => semester.id === 2), {
  attendance: ATTENDANCE_2026_AUTUMN,
  lectureStart: autumnNoon('2026-10-02'), lateTermStart: autumnNoon('2026-11-17'),
  exams: [
    { label: 'スタディスキル入門 期末', keys: ['study_skill'], start: autumnNoon('2026-10-01'), date: autumnNoon('2026-11-24') },
    { label: '教養前期（講義）期末', keys: ['kyoyo_zenki'], start: autumnNoon('2026-10-02'), date: autumnNoon('2026-12-08') },
    { label: '教養（演習）期末', keys: ['kyoyo_enshu'], start: autumnNoon('2026-11-24'), date: autumnNoon('2026-12-08') },
    { label: '教養後期（講義）期末', keys: ['kyoyo_koki'], start: autumnNoon('2026-11-17'), date: autumnNoon('2027-02-02') },
    { label: '外国語 期末', keys: ['gaikokugo'], start: autumnNoon('2026-10-02'), date: autumnNoon('2027-02-02') },
    { label: 'アカデミックライティング 期末', keys: ['academic_writing'], start: autumnNoon('2027-01-12'), date: autumnNoon('2027-02-02') },
    { label: '専門（一斉開講）期末', keys: ['senmon_issai'], start: autumnNoon('2026-10-02'), date: autumnNoon('2027-02-04') },
    { label: '専門（順次開講）期末', keys: ['senmon_jyunji'], start: autumnNoon('2027-01-14'), date: autumnNoon('2027-02-04') },
  ],
});

function getRelevantExams(semester) {
  const keys = new Set(getEnrolledSubjects(semester.id).map(subject => getAttendanceKey(subject, semester)));
  return (semester.exams || []).filter(exam => !exam.keys || exam.keys.some(key => keys.has(key)));
}
