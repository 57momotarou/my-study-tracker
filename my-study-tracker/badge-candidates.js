// 目標の要件を、端末にある次学期の開講情報・履修記録と照合する。
function getNextPlanningSemester(current = getCurrentSemester()) {
  const order = semesterOrder(current.year,current.season);
  return [...SEMESTERS].filter(s=>semesterOrder(s.year,s.season)>order)
    .sort((a,b)=>semesterOrder(a.year,a.season)-semesterOrder(b.year,b.season))[0] || null;
}
function getGoalEnrollmentCandidates(current = getCurrentSemester()) {
  const semester = getNextPlanningSemester(current), completed = getCompletedCourseCodes();
  if (!semester) return {semester:null,groups:[]};
  const past = new Set([...completed,...getGradeSummary().passedCodes]);
  for (const sem of SEMESTERS) if (semesterOrder(sem.year,sem.season)<semesterOrder(semester.year,semester.season)) {
    getEnrolledCodes(sem.id).forEach(code=>past.add(code));
  }
  const selected = new Set(getEnrolledCodes(semester.id)), covered = new Set([...past,...selected]);
  // 選択肢の枝を絞るときだけ追加条件を除外。獲得判定には使わない。
  const allManual = new Set(BADGES.filter(b=>b.requirements.manual).map(b=>b.id));
  const groups = [];
  for (const badge of BADGES.filter(b=>state.badgePreferences.goals.includes(b.id))) {
    if (getBadgeAchievement(badge,completed).satisfied) continue;
    const candidates = new Map(), existing = new Map(), unavailable = new Map(), notes = new Set();
    const add = (code,reason,optional=false) => {
      const subject = SUBJECT_BY_CODE.get(code); if (!subject || completed.has(code)) return;
      const availability = getSubjectAvailability(subject,semester);
      const collection = past.has(code) ? existing : availability.selectable ? candidates : unavailable;
      if (!collection.has(code)) collection.set(code,{subject,reasons:[],optional:true,selected:selected.has(code),note:availability.note});
      const item = collection.get(code);
      if (!item.reasons.includes(reason)) item.reasons.push(reason);
      item.optional = item.optional && optional;
    };
    const visit = (b,context='必要科目',optional=false,seen=new Set()) => {
      if (!b || seen.has(b.id)) return;
      const next = new Set(seen).add(b.id), req = b.requirements;
      for (const code of req.codes || []) add(code,context,optional);
      for (const codes of req.anyCodeGroups || []) {
        const already = codes.filter(c=>covered.has(c));
        for (const code of already.length ? already : codes) add(code,`${context}：この組から1科目`,true);
      }
      for (const group of req.creditGroups || []) {
        const subjects = ALL_SUBJECTS.filter(s=>s.category==='教養' && s.type===group.type);
        const priorCredits = subjects.filter(s=>past.has(s.code)).reduce((n,s)=>n+s.credits,0);
        if (priorCredits >= group.credits) {
          subjects.filter(s=>past.has(s.code)).forEach(s=>add(s.code,`${context}：${group.type}の履修済み分`,true));
          continue;
        }
        const chosen = subjects.filter(s=>selected.has(s.code));
        const enoughSelected = priorCredits + chosen.reduce((n,s)=>n+s.credits,0) >= group.credits;
        for (const s of enoughSelected ? chosen : subjects) add(s.code,`${context}：${group.type}からあと${group.credits-priorCredits}単位分を選択`,true);
      }
      for (const id of [...(req.prerequisite ? [req.prerequisite] : []),...(req.prerequisites || [])]) {
        const pre = BADGES.find(b=>b.id===id);
        visit(pre,`${context} → 前提「${pre?.name || id}」`,optional,next);
      }
      if (req.prerequisiteAny?.length) {
        const alternatives = req.prerequisiteAny.map(id=>BADGES.find(b=>b.id===id)).filter(Boolean);
        const chosen = alternatives.find(b=>getBadgePlan(b,covered,new Set(),allManual).satisfied);
        for (const pre of chosen ? [chosen] : alternatives) visit(pre,`${context} → 前提バッジから1つ「${pre.name}」`,true,next);
      }
      if (req.manual) notes.add(`${b.name}：${req.description || '卒研テーマなどの追加条件も確認してください。'}`);
    };
    visit(badge);
    const sorted = items => [...items.values()].sort((a,b)=>Number(a.optional)-Number(b.optional) || a.subject.code.localeCompare(b.subject.code));
    groups.push({badge,candidates:sorted(candidates),existing:sorted(existing),unavailable:sorted(unavailable),notes:[...notes]});
  }
  return {semester,groups};
}
function enrollmentCandidateHTML(item,kind='candidate') {
  const s = item.subject, label = kind==='existing' ? '履修済み・履修中' : kind==='unavailable' ? '次学期は選択不可' : item.selected ? '次学期に選択済み' : item.optional ? '選択候補' : '必要科目';
  return `<li class="badge-enrollment-course" data-enrollment-candidate="${kind==='candidate' ? s.code : ''}"><div><strong>${escapeText(s.name)}</strong><span class="candidate-tag">${label}</span></div>
    <small>${escapeText(s.code)} · ${s.credits}単位${s.entry_required ? ' · 事前エントリー・選考あり' : ''}${s.open_type==='未確認' ? ' · 開講方式を確認' : ''}${kind==='unavailable' ? ' · '+escapeText(item.note) : ''}</small>
    <p>${item.reasons.map(escapeText).join(' / ')}</p></li>`;
}
function renderGoalEnrollmentCandidates() {
  const plan = getGoalEnrollmentCandidates(), goals = state.badgePreferences.goals;
  let html = '<section class="badge-enrollment-suggestions"><h3>目標バッジ向けの履修候補</h3>';
  if (!goals.length) return html+'<p class="settings-note">目標を登録すると、次学期に選ぶとよい科目が表示されます。</p></section>';
  if (!plan.semester) return html+'<p class="settings-note">次学期の開講情報が未登録です。大学資料を読み込むと候補を表示できます。</p></section>';
  html += `<p class="settings-note">${escapeText(plan.semester.name)}の候補です。以前に選んだ科目と完了済みの科目を除きます。選択候補は、指定された科目数・単位分だけ選んでください。</p>`;
  for (const group of plan.groups) {
    html += `<details class="badge-candidate-group" ${plan.groups.length===1 ? 'open' : ''}><summary>★ ${escapeText(group.badge.name)} <small>次学期の候補 ${group.candidates.length}科目</small></summary>
      ${group.candidates.length ? `<ul class="badge-enrollment-list">${group.candidates.map(c=>enrollmentCandidateHTML(c)).join('')}</ul>` : '<p class="settings-note">次学期に新しく選べる対象科目はありません。履修中の完了状況と追加条件を確認してください。</p>'}
      ${group.existing.length ? `<details class="badge-requirement-group"><summary>履修済み・履修中の必要科目 ${group.existing.length}科目</summary><p class="settings-note">これらは新しい履修候補から除いています。全コマ・期末の完了記録も必要です。</p><ul class="badge-enrollment-list">${group.existing.map(c=>enrollmentCandidateHTML(c,'existing')).join('')}</ul></details>` : ''}
      ${group.unavailable.length ? `<details class="badge-requirement-group"><summary>次学期の開講対象外 ${group.unavailable.length}科目</summary><ul class="badge-enrollment-list">${group.unavailable.map(c=>enrollmentCandidateHTML(c,'unavailable')).join('')}</ul></details>` : ''}
      ${group.notes.map(note=>`<p class="settings-note">${escapeText(note)}</p>`).join('')}</details>`;
  }
  if (!plan.groups.length) html += '<p class="plan-ok">目標のバッジはすべて獲得済みです。</p>';
  html += `<button type="button" class="data-transfer-btn" data-next-enrollment="${plan.semester.id}">次学期の履修設定を開く</button><p class="settings-note">候補は自動登録されません。開講・選考の条件は大学の案内で確認してください。</p></section>`;
  return html;
}
