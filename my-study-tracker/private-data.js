// 非公開資料はアップロードしない。JSONを選んだ端末のlocalStorageだけに保存する。
const PRIVATE_FORMAT = 'my-study-tracker-private';
let privateDataReady = false;
let privateDataError = '';

function validatePrivateData(value) {
  const fail = () => { throw new Error('非公開データの形式・内容を確認できません。配布した専用JSONを選んでください。'); };
  if (!isPlainObject(value)) fail();
  // HTMLを持つのはガイド本文だけ。他の値は既存画面のテキストとして安全な範囲に限定。
  function inspect(item, key = '', depth = 0) {
    if (depth > 20) fail();
    if (typeof item === 'string' && key !== 'html' && (item.length > 5000 || /[<>"'`&\\]/.test(item))) fail();
    if (item && typeof item === 'object') for (const [k, v] of Object.entries(item)) {
      if (['__proto__','constructor','prototype'].includes(k)) fail();
      inspect(v, k, depth + 1);
    }
  }
  inspect(value);
  const { subjects, semesters, badges, guide, rules, requiredCodes, planner } = value;
  const safeId = s => typeof s === 'string' && /^[A-Za-z0-9_-]{1,80}$/.test(s);
  const text = s => typeof s === 'string' && s.length > 0 && s.length < 500;
  const categories = Object.keys(CATEGORY_CONFIG);
  if (!Array.isArray(subjects) || !subjects.length || subjects.length > 1000
      || subjects.some(s => !isPlainObject(s) || !safeId(s.code) || !text(s.name) || !categories.includes(s.category)
        || !Number.isInteger(s.lessons) || s.lessons < 1 || s.lessons > 100 || !Number.isFinite(s.credits) || s.credits < 0 || s.credits > 50
        || !['一斉','順次','未確認'].includes(s.open_type)
        || (s.unavailable_terms && !Array.isArray(s.unavailable_terms)))
      || new Set(subjects.map(s => s.code)).size !== subjects.length) fail();
  const codes = new Set(subjects.map(s => s.code));
  const date = s => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})?)?$/.test(s) && Number.isFinite(parseDateValue(s).getTime());
  if (!Array.isArray(semesters) || !semesters.length || semesters.length > 50 || new Set(semesters.map(s => s.id)).size !== semesters.length) fail();
  for (const s of semesters) {
    if (!isPlainObject(s) || !Number.isInteger(s.id) || s.id < 1 || !text(s.name) || !Number.isInteger(s.year)
        || !['春','秋'].includes(s.season) || !validCalendarDate(s.start) || !validCalendarDate(s.end) || s.start > s.end) fail();
    for (const k of ['lectureStart','lateTermStart','seiseki']) if (s[k] && !date(s[k])) fail();
    if (s.attendance) {
      if (!isPlainObject(s.attendance)) fail();
      for (const [key, entries] of Object.entries(s.attendance)) {
        if (!safeId(key) || !Array.isArray(entries) || entries.length > 102) fail();
        entries.forEach((entry, i) => { if (i === 0 && entry === null) return;
          if (!(date(entry) || (isPlainObject(entry) && date(entry.end) && (!entry.start || date(entry.start))))) fail();
        });
      }
    }
    if (s.exams && (!Array.isArray(s.exams) || s.exams.some(e => !isPlainObject(e) || !text(e.label) || !date(e.date) || (e.start && !date(e.start)) || (e.keys && (!Array.isArray(e.keys) || e.keys.some(k => !safeId(k))))))) fail();
  }
  if (!Array.isArray(badges) || badges.length > 300 || new Set(badges.map(b => b.id)).size !== badges.length) fail();
  const ids = new Set(badges.map(b => b.id));
  for (const b of badges) {
    if (!isPlainObject(b) || !safeId(b.id) || !text(b.name) || !Object.hasOwn(BADGE_LEVEL_CONFIG, b.level) || !categories.includes(b.category) || !isPlainObject(b.requirements)) fail();
    const r = b.requirements;
    for (const key of ['codes','prerequisites','prerequisiteAny']) if (r[key] && (!Array.isArray(r[key]) || r[key].some(v => !(key === 'codes' ? codes : ids).has(v)))) fail();
    if (r.prerequisite && !ids.has(r.prerequisite)) fail();
    if (r.anyCodeGroups && (!Array.isArray(r.anyCodeGroups) || r.anyCodeGroups.some(g => !Array.isArray(g) || !g.length || g.some(c => !codes.has(c))))) fail();
    if (r.creditGroups && (!Array.isArray(r.creditGroups) || r.creditGroups.some(g => !isPlainObject(g) || !text(g.type) || !Number.isFinite(g.credits) || g.credits < 0))) fail();
  }
  if (!Array.isArray(guide) || guide.length > 100 || guide.some(g => !isPlainObject(g) || !text(g.title) || typeof g.tags !== 'string' || typeof g.source !== 'string' || typeof g.html !== 'string' || g.html.length > 50000)) fail();
  if (!Array.isArray(requiredCodes) || requiredCodes.some(c => !codes.has(c)) || !isPlainObject(rules)) fail();
  for (const k of ['specialized','liberal','foreignRequired','foreignElective','foreignCommonMax','common','total']) if (!Number.isFinite(rules[k]) || rules[k] < 0 || rules[k] > 1000) fail();
  if (rules.total <= 0 || rules.total !== rules.specialized + rules.liberal + rules.foreignRequired + rules.foreignElective + rules.common) fail();
  validatePlannerProfile(planner);
  return JSON.parse(JSON.stringify(value));
}

function hydratePrivateData(data) {
  privateDataReady = Boolean(data);
  ALL_SUBJECTS = data?.subjects || []; BADGES = data?.badges || []; SEMESTERS = data?.semesters || [];
  STUDENT_GUIDE = data?.guide || []; MC_REQUIRED_CODES = data?.requiredCodes || []; GRADUATION_RULES = data?.rules || {};
  SUBJECT_BY_CODE.clear(); ALL_SUBJECTS.forEach(s => SUBJECT_BY_CODE.set(s.code, s));
}

// ガイドは表示用要素だけ許可。スクリプト、画像、リンク、イベント属性は実行・取得しない。
function sanitizeGuideHTML(html) {
  const template = document.createElement('template'); template.innerHTML = html;
  const allowed = new Set(['P','UL','OL','LI','B','STRONG','EM','BR','DIV','TABLE','CAPTION','THEAD','TBODY','TR','TH','TD']);
  template.content.querySelectorAll('*').forEach(el => {
    if (!allowed.has(el.tagName)) { el.remove(); return; }
    for (const attr of [...el.attributes]) el.removeAttribute(attr.name);
    if (el.tagName === 'TABLE') el.className = 'private-guide-table';
  });
  return template.innerHTML;
}

function ensurePrivateCompatibility(data) {
  const codes = new Map(data.subjects.map(s => [s.code, s]));
  const sems = new Set(data.semesters.map(s => String(s.id)));
  const enrollments = readStoredJson(KEYS.enrollments, {}), records = readStoredJson(KEYS.records, {}), progress = readStoredJson(KEYS.progress, {});
  const valid = Object.entries(enrollments).every(([id, list]) => sems.has(id) && Array.isArray(list) && list.every(c => codes.has(c)))
    && Object.entries(records).every(([id, entries]) => sems.has(id) && Object.entries(entries).every(([code, record]) => codes.has(code)
      && [...(record.assignments || []), ...(record.viewedLessons || [])].every(n => n <= codes.get(code).lessons)))
    && Object.entries(progress).every(([code, n]) => codes.has(code) && n <= codes.get(code).lessons * 4)
    && readStoredJson(KEYS.applications, []).every(a => sems.has(String(a.semesterId)));
  if (!valid) throw new Error('端末にある科目・学期の記録をすべて引き継げないため、読み込みを中止しました。対応する資料データを確認してください。');
}

function setupPrivateData() {
  const input = document.getElementById('private-import-input');
  document.querySelectorAll('[data-private-import]').forEach(b => b.addEventListener('click', () => input.click()));
  input.addEventListener('change', async () => {
    const file = input.files?.[0]; input.value = ''; if (!file) return;
    dataTransferInProgress = true;
    try {
      if (file.size > MAX_BACKUP_BYTES) throw new Error('ファイルが大きすぎます。');
      const payload = JSON.parse(await file.text());
      if (payload.format !== PRIVATE_FORMAT || payload.version !== 1) throw new Error('「非公開データ」専用のJSONを選んでください。');
      const data = validatePrivateData(payload.data); ensurePrivateCompatibility(data);
      if (privateDataReady && !window.confirm('端末内の大学資料・生活時間をこのファイルで更新します。学習記録は保持します。続けますか？')) return;
      const previous = snapshotStudyState();
      loadState(data, false); lastSavedState = previous;
      if (!saveState()) throw new Error('端末に保存できませんでした。元の記録は保持しています。');
      privateDataError = ''; render(); renderStudentGuide();
      document.querySelectorAll('[data-private-status]').forEach(el => { el.textContent = '非公開データをこの端末に読み込みました。'; });
    } catch (error) {
      document.querySelectorAll('[data-private-status]').forEach(el => { el.textContent = error instanceof SyntaxError ? 'JSONを読み取れませんでした。' : error.message; });
      renderPrivateGate();
    } finally { dataTransferInProgress = false; applyPendingUpdate(); }
  });
}

function renderPrivateGate() {
  const gate = document.getElementById('private-gate'); if (!gate) return;
  gate.hidden = privateDataReady;
  document.body.classList.toggle('needs-private-data', !privateDataReady);
  document.querySelectorAll('.nav-btn,#header-sem-trigger').forEach(b => { b.disabled = !privateDataReady; });
  if (!privateDataReady) document.getElementById('header-semester').textContent = '非公開データを読み込んでください';
  if (privateDataError) document.querySelectorAll('[data-private-status]').forEach(el => { el.textContent = privateDataError; });
}
