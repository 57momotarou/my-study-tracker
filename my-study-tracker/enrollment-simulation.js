// お気に入りの条件から重複しない科目案を作り、履修登録とは別に保存する。
function courseCredits(codes) {return [...new Set(codes)].reduce((n,c)=>n+(SUBJECT_BY_CODE.get(c)?.credits||0),0);}
function planningSemesters() {return [...SEMESTERS].sort((a,b)=>semesterOrder(a.year,a.season)-semesterOrder(b.year,b.season));}
function curriculumPlanningLimits() {
  const text=STUDENT_GUIDE.map(g=>g.html.replace(/<[^>]*>/g,'')).join(' ');
  return {annualMax:Number(/年間の上限は(\d+)単位/.exec(text)?.[1])||null,semesterMin:Number(/各学期の最低履修は(\d+)単位/.exec(text)?.[1])||null,
    seminarCredits:Number(/卒業要件単位を(\d+)単位以上/.exec(text)?.[1])||null};
}
function badgeChoiceOptions() {
  const groups={};
  for(const b of BADGES){
    (b.requirements.anyCodeGroups||[]).forEach((g,i)=>{groups[`${b.id}:course:${i}`]=g;});
    if(b.requirements.prerequisiteAny)groups[`${b.id}:badge`]=b.requirements.prerequisiteAny;
  }
  return groups;
}
function normalizeSimulation(value,strict=false,referenceSemId=state.currentSemesterId) {
  const invalid=()=>{if(strict)throw new Error('履修シミュレーションの内容が不正です。');};
  const sems=planningSemesters(),current=sems.findIndex(s=>s.id===referenceSemId),defaults={startSemesterId:(sems[current+1]||sems[current]||sems[0])?.id,
    endSemesterId:sems.at(-1)?.id,semesterLimit:18,balance:true,includeGraduation:true,choices:{},courses:{}};
  if(!isPlainObject(value)){invalid();return defaults;}
  for(const key of ['startSemesterId','endSemesterId'])if(value[key]!==undefined){if(!sems.some(s=>s.id===value[key]))invalid();else defaults[key]=value[key];}
  if(sems.findIndex(s=>s.id===defaults.startSemesterId)>sems.findIndex(s=>s.id===defaults.endSemesterId)){invalid();defaults.endSemesterId=defaults.startSemesterId;}
  if(value.semesterLimit!==undefined){if(!Number.isInteger(value.semesterLimit)||value.semesterLimit<1||value.semesterLimit>50)invalid();else defaults.semesterLimit=value.semesterLimit;}
  for(const key of ['balance','includeGraduation'])if(value[key]!==undefined){if(typeof value[key]!=='boolean')invalid();else defaults[key]=value[key];}
  const options=badgeChoiceOptions();
  if(value.choices!==undefined){
    if(!isPlainObject(value.choices))invalid();else for(const [key,choice] of Object.entries(value.choices)){if(!options[key]?.includes(choice))invalid();else defaults.choices[key]=choice;}
  }
  if(value.courses!==undefined){
    if(!isPlainObject(value.courses))invalid();else for(const [id,codes] of Object.entries(value.courses)){
      if(!sems.some(s=>String(s.id)===id)||!Array.isArray(codes)||codes.length>1000||codes.some(c=>!SUBJECT_BY_CODE.has(c))||new Set(codes).size!==codes.length){invalid();continue;}
      defaults.courses[id]=[...codes];
    }
  }
  return defaults;
}
function getBadgeCourseSelection(badge,covered=new Set(),choices={},visiting=new Set()) {
  const result={codes:new Set(),badges:new Set(),groups:[],creditGroups:[],manual:[],missing:[]};
  if(!badge||visiting.has(badge.id)){result.missing.push('前提条件の参照');return result;}
  const next=new Set(visiting).add(badge.id),req=badge.requirements||{};
  result.badges.add(badge.id);
  const merge=part=>{part.codes.forEach(c=>result.codes.add(c));part.badges.forEach(id=>result.badges.add(id));result.groups.push(...part.groups);result.creditGroups.push(...part.creditGroups);result.manual.push(...part.manual);result.missing.push(...part.missing);};
  (req.codes||[]).forEach(c=>result.codes.add(c));
  for(const id of [...(req.prerequisite?[req.prerequisite]:[]),...(req.prerequisites||[])])merge(getBadgeCourseSelection(BADGES.find(b=>b.id===id),covered,choices,next));
  if(req.prerequisiteAny?.length){
    const key=`${badge.id}:badge`,parts=req.prerequisiteAny.map(id=>({id,plan:getBadgeCourseSelection(BADGES.find(b=>b.id===id),covered,choices,next)}));
    const selected=parts.find(p=>p.id===choices[key])||parts.sort((a,b)=>
      courseCredits([...a.plan.codes].filter(c=>!covered.has(c)))-courseCredits([...b.plan.codes].filter(c=>!covered.has(c)))||a.id.localeCompare(b.id))[0];
    result.groups.push({key,label:`${badge.name}の前提`,kind:'badge',options:req.prerequisiteAny,selected:selected.id});merge(selected.plan);
  }
  for(const [i,group] of (req.anyCodeGroups||[]).entries()){
    const key=`${badge.id}:course:${i}`,selected=group.includes(choices[key])?choices[key]:[...group].sort((a,b)=>Number(covered.has(b))-Number(covered.has(a))
      ||Number(planningSemesters().some(s=>getSubjectAvailability(SUBJECT_BY_CODE.get(b),s).selectable))-Number(planningSemesters().some(s=>getSubjectAvailability(SUBJECT_BY_CODE.get(a),s).selectable))
      ||Number(result.codes.has(b))-Number(result.codes.has(a))||(SUBJECT_BY_CODE.get(a)?.credits||0)-(SUBJECT_BY_CODE.get(b)?.credits||0)||a.localeCompare(b))[0];
    result.codes.add(selected);result.groups.push({key,label:`${badge.name}の選択科目`,kind:'course',options:group,selected});
  }
  for(const group of req.creditGroups||[]){
    result.creditGroups.push({...group,label:badge.name});
    const candidates=ALL_SUBJECTS.filter(s=>s.category==='教養'&&s.type===group.type).sort((a,b)=>Number(covered.has(b.code))-Number(covered.has(a.code))
      ||Number(result.codes.has(b.code))-Number(result.codes.has(a.code))||Number(a.legacy||!!a.retired_from)-Number(b.legacy||!!b.retired_from)||b.credits-a.credits||a.code.localeCompare(b.code));
    let credits=0;for(const s of candidates){if(credits>=group.credits)break;result.codes.add(s.code);credits+=s.credits;}
    if(credits<group.credits)result.missing.push(`${group.type} ${group.credits-credits}単位`);
  }
  if(req.manual)result.manual.push(badge.name+(req.description?'：'+req.description:''));
  return result;
}
function effectiveBadgeChoices(roots,choices) {
  const result={...choices};for(const b of BADGES)if(b.requirements.prerequisiteAny&&!result[`${b.id}:badge`]){
    const chosen=b.requirements.prerequisiteAny.find(id=>roots.includes(id));if(chosen)result[`${b.id}:badge`]=chosen;
  }
  return result;
}
function expandFavoriteGoals(roots,choices=state.simulation?.choices||{},covered=new Set([...getAllPlannedCodes(),...getGradeSummary().passedCodes])) {
  const ids=new Set();
  const effective=effectiveBadgeChoices(roots,choices);
  for(const id of roots)getBadgeCourseSelection(BADGES.find(b=>b.id===id),covered,effective).badges.forEach(b=>ids.add(b));
  return [...ids];
}
function getFavoriteCoursePlan(choices=state.simulation?.choices||{}) {
  const passed=new Set(getGradeSummary().passedCodes),planned=getAllPlannedCodes(),covered=new Set([...passed,...planned]);
  const codes=new Set(),reasons=new Map(),groups=new Map(),creditGroups=new Map(),manual=new Set(),missing=new Set();
  const roots=state.badgePreferences?.favoriteRoots||state.badgePreferences?.goals||[],effective=effectiveBadgeChoices(roots,choices);
  for(const id of roots){
    const badge=BADGES.find(b=>b.id===id),part=getBadgeCourseSelection(badge,covered,effective);
    part.codes.forEach(code=>{codes.add(code);if(!reasons.has(code))reasons.set(code,new Set());reasons.get(code).add(badge.name);});
    part.groups.forEach(g=>groups.set(g.key,g));part.creditGroups.forEach(g=>creditGroups.set(g.label+':'+g.type,g));part.manual.forEach(m=>manual.add(m));part.missing.forEach(m=>missing.add(m));
  }
  return {codes,passed,planned,reasons,groups:[...groups.values()],creditGroups:[...creditGroups.values()],manual:[...manual],missing:[...missing],total:courseCredits(codes),
    additional:courseCredits([...codes].filter(c=>!passed.has(c))),unselected:[...codes].filter(c=>!covered.has(c)),
    combined:courseCredits(new Set([...codes,...covered]))};
}
function favoriteCourseHighlights(plan=getFavoriteCoursePlan()) {
  const result=new Map([...plan.codes].map(c=>[c,{needed:true,reasons:new Set(plan.reasons.get(c))}]));
  const add=(code,label)=>{if(!result.has(code))result.set(code,{needed:false,reasons:new Set()});result.get(code).reasons.add(label);};
  for(const group of plan.groups.filter(g=>g.kind==='course'))group.options.forEach(c=>add(c,group.label));
  for(const group of plan.creditGroups)ALL_SUBJECTS.filter(s=>s.category==='教養'&&s.type===group.type).forEach(s=>add(s.code,group.label));
  return result;
}
function completeGraduationSelection(initial,semesters,balance) {
  const codes=new Set(initial),r=GRADUATION_RULES;
  MC_REQUIRED_CODES.forEach(c=>codes.add(c));
  for(let pass=0;pass<ALL_SUBJECTS.length;pass++){
    const current=getGraduationPlan([...codes]);if(current.meetsPlan)break;
    const counts={前期:0,後期:0};[...codes].map(c=>SUBJECT_BY_CODE.get(c)).filter(s=>s?.credits===1).forEach(s=>{if(s.term in counts)counts[s.term]++;});
    const candidates=ALL_SUBJECTS.filter(s=>!codes.has(s.code)&&semesters.some(sem=>getSubjectAvailability(s,sem).selectable));
    const benefits=new Map(candidates.map(s=>[s.code,getGraduationPlan([...codes,s.code]).counted-current.counted]));
    candidates.sort((a,b)=>benefits.get(b.code)-benefits.get(a.code)
      ||Number(!!a.retired_from)-Number(!!b.retired_from)
      ||(balance?((a.credits===1?(counts[a.term]||0):0)-(b.credits===1?(counts[b.term]||0):0)):0)||a.code.localeCompare(b.code));
    const best=candidates[0];if(!best||getGraduationPlan([...codes,best.code]).counted<=current.counted)break;
    codes.add(best.code);
  }
  return codes;
}
function buildEnrollmentSimulation(raw=state.simulation) {
  const options=normalizeSimulation(raw),all=planningSemesters(),start=all.findIndex(s=>s.id===options.startSemesterId),end=all.findIndex(s=>s.id===options.endSemesterId);
  const semesters=all.slice(start,end+1),limits=curriculumPlanningLimits(),passed=new Set(getGradeSummary().passedCodes);
  const before=new Set([...passed,...all.slice(0,start).flatMap(s=>getEnrolledCodes(s.id).filter(c=>!['F','K','P'].includes(getStudyRecord(s.id,c).grade)))]);
  const favorite=getFavoriteCoursePlan(options.choices),base=new Set([...before,...favorite.codes,...semesters.flatMap(s=>getEnrolledCodes(s.id))]);
  const wanted=options.includeGraduation?completeGraduationSelection(base,semesters,options.balance):base;
  const manual=Object.keys(options.courses).length>0,plan=new Map(semesters.map(s=>[s.id,manual?[...(options.courses[s.id]||[])]:[...getEnrolledCodes(s.id)]]));
  const allocated=new Set([...before,...[...plan.values()].flat()]),pending=[...wanted].filter(c=>!allocated.has(c)),unscheduled=[];
  const annual=new Map();for(const sem of all.slice(0,start))annual.set(sem.year,(annual.get(sem.year)||0)+courseCredits(getEnrolledCodes(sem.id)));
  for(const sem of semesters)annual.set(sem.year,(annual.get(sem.year)||0)+courseCredits(plan.get(sem.id)));
  const priority=code=>{
    const s=SUBJECT_BY_CODE.get(code);if(s?.type==='卒業研究')return 100;
    if(MC_REQUIRED_CODES.includes(code))return 0;
    return favorite.codes.has(code)?1:2;
  };
  if(!manual)for(const [index,sem] of semesters.entries()){
    const codes=plan.get(sem.id),countTerm=term=>codes.filter(c=>{const s=SUBJECT_BY_CODE.get(c);return s.credits===1&&s.term===term;}).length;
    const stillRequired=pending.reduce((n,c)=>n+(SUBJECT_BY_CODE.get(c)?.credits||0),0)+semesters.slice(index).reduce((n,s)=>n+courseCredits(plan.get(s.id)),0);
    const target=Math.min(options.semesterLimit,Math.max(limits.semesterMin||0,Math.ceil(stillRequired/(semesters.length-index))));
    let remaining=target-courseCredits(codes);
    while(remaining>0){
      const prior=new Set([...before,...semesters.filter(s=>semesterOrder(s.year,s.season)<semesterOrder(sem.year,sem.season)).flatMap(s=>plan.get(s.id))]);
      const available=pending.filter(c=>{
        const s=SUBJECT_BY_CODE.get(c);return s&&getSubjectAvailability(s,sem).selectable&&s.credits<=remaining
          &&(!limits.annualMax||(annual.get(sem.year)||0)+s.credits<=limits.annualMax)
          &&(s.type!=='卒業研究'||(sem.year>=all[0].year+3&&(!limits.seminarCredits||getGraduationPlan([...prior]).counted>=limits.seminarCredits)));
      }).sort((a,b)=>{
        const last=code=>semesters.findLastIndex(s=>getSubjectAvailability(SUBJECT_BY_CODE.get(code),s).selectable);
        return Number(last(b)===index)-Number(last(a)===index)||priority(a)-priority(b)
        ||(options.balance?((SUBJECT_BY_CODE.get(a).credits===1?countTerm(SUBJECT_BY_CODE.get(a).term):0)-(SUBJECT_BY_CODE.get(b).credits===1?countTerm(SUBJECT_BY_CODE.get(b).term):0)):0)
        ||a.localeCompare(b);});
      if(!available.length)break;
      const code=available[0],s=SUBJECT_BY_CODE.get(code);codes.push(code);remaining-=s.credits;annual.set(sem.year,(annual.get(sem.year)||0)+s.credits);pending.splice(pending.indexOf(code),1);
    }
  }
  if(!manual&&options.balance){
    const term=c=>SUBJECT_BY_CODE.get(c)?.credits===1?SUBJECT_BY_CODE.get(c).term:null;
    const difference=codes=>codes.filter(c=>term(c)==='前期').length-codes.filter(c=>term(c)==='後期').length;
    for(let pass=0;pass<ALL_SUBJECTS.length;pass++){
      const a=semesters.find(s=>Math.abs(difference(plan.get(s.id)))>1);if(!a)break;
      const sign=Math.sign(difference(plan.get(a.id))),from=sign>0?'前期':'後期',to=sign>0?'後期':'前期';let changed=false;
      for(const b of semesters.filter(s=>s.id!==a.id&&Math.sign(difference(plan.get(s.id)))===-sign)){
        const ac=plan.get(a.id).find(c=>term(c)===from&&!getEnrolledCodes(a.id).includes(c)&&getSubjectAvailability(SUBJECT_BY_CODE.get(c),b).selectable);
        const bc=plan.get(b.id).find(c=>term(c)===to&&!getEnrolledCodes(b.id).includes(c)&&getSubjectAvailability(SUBJECT_BY_CODE.get(c),a).selectable);
        if(!ac||!bc)continue;
        plan.set(a.id,plan.get(a.id).map(c=>c===ac?bc:c));plan.set(b.id,plan.get(b.id).map(c=>c===bc?ac:c));changed=true;break;
      }
      if(!changed)break;
    }
  }
  const finalCodes=new Set([...before,...[...plan.values()].flat()]);
  for(const code of wanted)if(!finalCodes.has(code))unscheduled.push(code);
  const warnings=[],seen=new Set(before),details=[];
  for(const sem of semesters){
    const codes=plan.get(sem.id),subjects=codes.map(c=>SUBJECT_BY_CODE.get(c)),credits=courseCredits(codes);
    const front=subjects.filter(s=>s.credits===1&&s.term==='前期').length,back=subjects.filter(s=>s.credits===1&&s.term==='後期').length;
    const termUnknown=subjects.filter(s=>s.credits===1&&!['前期','後期'].includes(s.term)).length;
    for(const s of subjects){if(seen.has(s.code))warnings.push(`${sem.name}：${s.name}が以前の履修と重複`);seen.add(s.code);
      if(!getSubjectAvailability(s,sem).selectable)warnings.push(`${sem.name}：${s.name}は開講対象外`);
      if(s.type==='卒業研究'&&(sem.year<all[0].year+3||(limits.seminarCredits&&getGraduationPlan([...before,...details.flatMap(p=>p.codes)]).counted<limits.seminarCredits)))warnings.push(`${sem.name}：卒業研究の学年・事前修得単位の条件に不足`);}
    if(credits>options.semesterLimit)warnings.push(`${sem.name}：設定した${options.semesterLimit}単位を超過`);
    if(limits.semesterMin&&credits<limits.semesterMin)warnings.push(`${sem.name}：最低履修${limits.semesterMin}単位に不足`);
    if(options.balance&&Math.abs(front-back)>1)warnings.push(`${sem.name}：1単位科目の前期・後期に${Math.abs(front-back)}科目の差`);
    const minutes=subjects.reduce((n,s)=>n+(s.lessons*state.privateData.planner.lessonMinutes+state.privateData.planner.examMinutes),0);
    const weekly=n=>state.privateData.planner[n].filter(b=>b.kind==='study').reduce((sum,b)=>sum+plannerMinutes(b.end)-plannerMinutes(b.start),0);
    const weeks=(planTime(sem.end,'24:00')-planTime(sem.start,'00:00'))/(7*86400000);
    const half=term=>subjects.reduce((n,s)=>{const minutes=s.lessons*state.privateData.planner.lessonMinutes+state.privateData.planner.examMinutes;return n+(['前期','後期'].includes(s.term)?(s.term===term?minutes:0):minutes/2);},0);
    const weeklyHours=Math.max(half('前期'),half('後期'))/60/(weeks/2);
    const capacity=(weekly('workday')*5+weekly('holiday')*2)/60;
    if(weeklyHours>capacity)warnings.push(`${sem.name}：週${weeklyHours.toFixed(1)}時間必要で、通常・予備枠の週${capacity.toFixed(1)}時間を超過`);
    details.push({semester:sem,codes,credits,front,back,termUnknown,weeklyHours});
  }
  for(const [year,credits] of annual)if(limits.annualMax&&credits>limits.annualMax)warnings.push(`${year}年度：${credits}単位で年間上限${limits.annualMax}単位を超過`);
  const graduate=getGraduationPlan([...finalCodes]),goalMissing=[...favorite.codes].filter(c=>!finalCodes.has(c));
  const capacity=semesters.reduce((n,s)=>n+options.semesterLimit,0),additional=courseCredits([...wanted].filter(c=>!before.has(c)));
  return {options,semesters:details,limits,favorite,before,wanted,finalCodes,graduate,unscheduled,goalMissing,warnings,annual,additional,capacity,
    feasible:!favorite.missing.length&&!unscheduled.length&&!goalMissing.length&&!warnings.some(w=>/超過|不足|対象外|重複/.test(w))&&(!options.includeGraduation||graduate.meetsPlan)};
}
function favoriteCreditSummaryHTML() {
  const favorite=getFavoriteCoursePlan();if(!favorite.codes.size)return '';
  const scenario=buildEnrollmentSimulation(),goalFits=!favorite.missing.length&&!scenario.goalMissing.length&&!scenario.warnings.some(w=>/超過|対象外|重複/.test(w));
  return `<section class="favorite-credit-summary"><h3>⭐ 目標の履修ボリューム</h3><div class="record-stats"><div><strong>${favorite.total}<small>単位</small></strong><span>${favorite.manual.length?'科目条件の合計（追加条件別）':'目標に必要な科目の合計'}</span></div><div><strong>${favorite.additional}<small>単位</small></strong><span>修得済みを除く残り</span></div><div><strong>${favorite.combined}<small>単位</small></strong><span>選択済み＋目標の合計</span></div></div>
    <p class="${goalFits?'plan-ok':'plan-warning'}">${goalFits?'このシミュレーション条件で、卒業予定学期までに目標科目を配置できます。':`現在の条件では目標科目${scenario.goalMissing.length}科目が未配置、または履修量の調整が必要です。`}</p>
    ${favorite.manual.length?'<p class="plan-warning">追加の単位・卒研テーマ条件があります。科目一覧だけでは必要総単位を確定できません。シミュレーションで追加条件を確認してください。</p>':''}
    ${favorite.missing.length?`<p class="plan-warning">資料の候補だけでは満たせない条件：${favorite.missing.map(escapeText).join('、')}</p>`:''}
    <button type="button" class="data-transfer-btn primary" onclick="activatePage('simulation')">学期ごとの履修をシミュレーション ›</button></section>`;
}
let latestEnrollmentSimulation=null;
function persistSimulation(next){state.simulation=normalizeSimulation(next,true);state.badgePreferences=normalizeBadgePreferences(state.badgePreferences);return saveState();}
function simulationDraft(result){return Object.fromEntries(result.semesters.map(s=>[s.semester.id,[...s.codes]]));}
function renderSimulationPage() {
  const root=document.getElementById('simulation-content');if(!root)return;
  const result=buildEnrollmentSimulation();latestEnrollmentSimulation=result;
  const {options}=result,sems=planningSemesters(),choiceLabel=(kind,id)=>kind==='badge'?BADGES.find(b=>b.id===id)?.name:SUBJECT_BY_CODE.get(id)?.name;
  root.innerHTML=`<div class="card"><div class="card-label">ENROLLMENT SIMULATOR</div><h1 class="card-title">毎学期、何をとる？</h1>
    <div class="simulation-controls"><label>開始学期<select data-sim-option="startSemesterId">${sems.map(s=>`<option value="${s.id}" ${s.id===options.startSemesterId?'selected':''}>${escapeText(s.name)}</option>`).join('')}</select></label><label>卒業予定学期<select data-sim-option="endSemesterId">${sems.map(s=>`<option value="${s.id}" ${s.id===options.endSemesterId?'selected':''}>${escapeText(s.name)}</option>`).join('')}</select></label><label>1学期の目安単位<input type="number" data-sim-option="semesterLimit" min="1" max="50" value="${options.semesterLimit}" inputmode="numeric"></label></div>
    <div class="simulation-checks"><label><input type="checkbox" data-sim-option="balance" ${options.balance?'checked':''}>1単位科目を前期・後期で半々に</label><label><input type="checkbox" data-sim-option="includeGraduation" ${options.includeGraduation?'checked':''}>卒業要件の科目も補う</label></div>
    ${result.favorite.groups.map(g=>`<label class="simulation-choice">${escapeText(g.label)}<select data-sim-choice="${g.key}">${g.options.map(id=>`<option value="${id}" ${id===g.selected?'selected':''}>${escapeText(choiceLabel(g.kind,id)||id)}</option>`).join('')}</select></label>`).join('')}
    <button class="data-transfer-btn" type="button" data-sim-reset>条件に合わせて案を作り直す</button><p data-sim-status role="status" class="record-caption"></p></div>
    <div class="card simulation-result"><h2 class="card-title">${result.feasible?'この条件で配置できました':'調整が必要です'}</h2><div class="record-stats"><div><strong>${result.favorite.total}<small>単位</small></strong><span>⭐ 目標科目</span></div><div><strong>${courseCredits(result.finalCodes)}<small>単位</small></strong><span>修得済み・過去履修＋この案</span></div><div><strong>${result.graduate.counted}<small>/${GRADUATION_RULES.total}</small></strong><span>卒業要件への割当</span></div></div>
      <p>残り${result.semesters.length}学期で${result.additional}単位の履修案${result.limits.annualMax?` · 年間上限${result.limits.annualMax}単位`:''}</p>
      <p class="record-caption">試算：予定科目をすべて修得する前提</p>
      ${result.unscheduled.length?`<div class="plan-warning">未配置：${result.unscheduled.map(c=>escapeText(SUBJECT_BY_CODE.get(c).name)).join('、')}</div>`:''}
      ${result.favorite.missing.length?`<div class="plan-warning">資料の候補だけでは満たせない条件：${result.favorite.missing.map(escapeText).join('、')}</div>`:''}
      ${result.warnings.length?`<details class="plan-warning"><summary>確認する点 ${result.warnings.length}件</summary><ul>${result.warnings.map(w=>`<li>${escapeText(w)}</li>`).join('')}</ul></details>`:''}
      ${result.favorite.manual.length?`<details class="plan-warning"><summary>科目履修以外のバッジ条件 ${result.favorite.manual.length}件</summary><ul>${result.favorite.manual.map(m=>`<li>${escapeText(m)}</li>`).join('')}</ul></details>`:''}
      <button type="button" class="data-transfer-btn primary" data-sim-apply ${result.warnings.some(w=>/上限.*超過|対象外|重複/.test(w))?'disabled':''}>この案を履修設定に反映</button><p data-sim-applied role="status" class="record-caption"></p></div>
    ${result.semesters.map(p=>`<section class="card simulation-semester"><div class="simulation-semester-heading"><h2>${escapeText(p.semester.name)}</h2><strong>${p.credits}単位</strong></div><div class="simulation-term-count"><span>1単位科目：前期 <b>${p.front}</b> ／ 後期 <b>${p.back}</b>${p.termUnknown?` ／ 区分未確認 ${p.termUnknown}`:''}</span><span>週約${p.weeklyHours.toFixed(1)}時間</span></div>
      ${p.codes.map(c=>{const s=SUBJECT_BY_CODE.get(c);return `<div class="simulation-course"><div><strong>${result.favorite.codes.has(c)?'⭐ ':''}${escapeText(s.name)}</strong><small>${s.credits}単位${s.term?' · '+escapeText(s.term):''}${s.entry_required?' · 要エントリー':''}</small></div><select data-sim-move="${c}" data-sim-from="${p.semester.id}" aria-label="${escapeText(s.name)}の履修学期">${result.semesters.map(q=>`<option value="${q.semester.id}" ${q.semester.id===p.semester.id?'selected':''} ${getSubjectAvailability(s,q.semester).selectable?'':'disabled'}>${escapeText(q.semester.name)}</option>`).join('')}</select><button type="button" class="simulation-remove" data-sim-remove="${c}" data-sim-from="${p.semester.id}" aria-label="${escapeText(s.name)}を案から外す">×</button></div>`;}).join('')||'<p class="record-caption">科目なし</p>'}
      <label class="simulation-add">科目を追加<select data-sim-add="${p.semester.id}"><option value="">科目を選ぶ</option>${ALL_SUBJECTS.filter(s=>!result.finalCodes.has(s.code)&&getSubjectAvailability(s,p.semester).selectable).map(s=>`<option value="${s.code}">${escapeText(s.name)} · ${s.credits}単位${s.term?' · '+escapeText(s.term):''}</option>`).join('')}</select></label></section>`).join('')}`;
  root.querySelectorAll('[data-sim-option]').forEach(input=>input.addEventListener('change',()=>{
    const key=input.dataset.simOption,next={...options,courses:{},[key]:input.type==='checkbox'?input.checked:Number(input.value)};
    const a=sems.findIndex(s=>s.id===next.startSemesterId),b=sems.findIndex(s=>s.id===next.endSemesterId);
    if(a>b){if(key==='startSemesterId')next.endSemesterId=next.startSemesterId;else next.startSemesterId=next.endSemesterId;}
    try{if(persistSimulation(next)){input.blur();renderSimulationPage();}}catch(error){root.querySelector('[data-sim-status]').textContent=error.message;}
  }));
  root.querySelectorAll('[data-sim-choice]').forEach(input=>input.addEventListener('change',()=>{if(persistSimulation({...options,courses:{},choices:{...options.choices,[input.dataset.simChoice]:input.value}})){input.blur();renderSimulationPage();}}));
  root.querySelector('[data-sim-reset]').addEventListener('click',()=>{if(persistSimulation({...options,courses:{}}))renderSimulationPage();});
  const edit=(code,from,to)=>{
    const courses=simulationDraft(result);if(from)courses[from]=courses[from].filter(c=>c!==code);if(to)courses[to].push(code);
    if(persistSimulation({...options,courses}))renderSimulationPage();
  };
  root.querySelectorAll('[data-sim-move]').forEach(input=>input.addEventListener('change',()=>edit(input.dataset.simMove,Number(input.dataset.simFrom),Number(input.value))));
  root.querySelectorAll('[data-sim-remove]').forEach(b=>b.addEventListener('click',()=>edit(b.dataset.simRemove,Number(b.dataset.simFrom),null)));
  root.querySelectorAll('[data-sim-add]').forEach(input=>input.addEventListener('change',()=>{if(input.value)edit(input.value,null,Number(input.dataset.simAdd));}));
  root.querySelector('[data-sim-apply]').addEventListener('click',()=>{
    const next={...state.enrollments};for(const p of result.semesters)next[p.semester.id]=[...p.codes];state.enrollments=next;
    root.querySelector('[data-sim-applied]').textContent=saveState()?'履修設定に反映しました。予定は次の朝6時に更新します。':'保存できませんでした。元の履修を保持しています。';
  });
}
