// ランク別の獲得状況と、本人が選んだ目標。大学の正式発行状況とは別に管理する。
let badgeRankFilter = 'all', badgeStatusFilter = 'all';
function renderBadgesPage() {
  const completed = getCompletedCourseCodes(), goals = new Set(state.badgePreferences.goals);
  const status = new Map(BADGES.map(b => [b.id, getBadgeAchievement(b, completed)]));
  const earned = BADGES.filter(b => status.get(b.id).satisfied), ranks = ['bronze','silver','gold','platinum'];
  const goalBadges = BADGES.filter(b => goals.has(b.id));
  document.getElementById('badge-summary').innerHTML = `
    <div class="plan-total"><strong>${earned.length}<small> / ${BADGES.length}</small></strong><span>獲得済みのバッジ</span></div>
    <div class="badge-goals"><h3>目標のバッジ <small>${goalBadges.length}件</small></h3>${goalBadges.length ? goalBadges.map(b => {
      const a = status.get(b.id);
      return `<button type="button" class="badge-goal-link" data-badge-open="${b.id}"><span>⭐ ${escapeText(b.name)}<small>${a.satisfied ? '✓ 獲得済み' : `あと${a.total-a.done}条件`}</small></span><span aria-hidden="true">›</span></button>`;
    }).join('') : '<p class="record-caption">☆で目標を選ぶ</p>'}</div>
    ${favoriteCreditSummaryHTML()}
    ${renderGoalEnrollmentCandidates()}
    <div class="badge-rank-filters" aria-label="獲得・目標で絞り込み">${[['all','すべて'],['goals','目標'],['earned','獲得済み']].map(([value,label]) => `<button class="filter-btn${badgeStatusFilter===value?' active':''}" data-badge-status="${value}" aria-pressed="${badgeStatusFilter===value}">${label}</button>`).join('')}</div>
    <div class="badge-rank-filters" aria-label="ランクで絞り込み">${['all',...ranks].map(rank => `<button class="filter-btn${badgeRankFilter===rank?' active':''}" data-badge-rank="${rank}" aria-pressed="${badgeRankFilter===rank}">${rank==='all'?'全ランク':BADGE_LEVEL_CONFIG[rank].label}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-badge-rank]').forEach(b => b.addEventListener('click', () => { badgeRankFilter=b.dataset.badgeRank; renderBadgesPage(); }));
  document.querySelectorAll('[data-badge-status]').forEach(b => b.addEventListener('click', () => { badgeStatusFilter=b.dataset.badgeStatus; renderBadgesPage(); }));
  document.querySelector('[data-next-enrollment]')?.addEventListener('click',event=>{
    state.currentSemesterId=Number(event.currentTarget.dataset.nextEnrollment);
    if (!saveState()) return;
    renderHeader(); activatePage('settings'); document.querySelector('[data-settings-tab="enrollment"]')?.click();
  });
  const container = document.getElementById('badge-list-container'); container.replaceChildren();
  for (const rank of ranks.filter(r => badgeRankFilter==='all' || badgeRankFilter===r)) {
    const level = BADGE_LEVEL_CONFIG[rank];
    const badges = BADGES.filter(b => b.level===rank && (badgeStatusFilter==='all' || (badgeStatusFilter==='goals' ? goals.has(b.id) : status.get(b.id).satisfied)));
    if (!badges.length) continue;
    const section = document.createElement('section'); section.className='card badge-rank-section'; section.dataset.rank=rank;
    section.innerHTML=`<div class="badge-rank-heading"><h2 class="card-title" style="color:${level.color};margin:0">${level.icon} ${level.label}</h2><small>${badges.filter(b=>status.get(b.id).satisfied).length}/${badges.length} 獲得済み</small></div>`;
    for (const category of ['専門','教養','外国語']) {
      const items=badges.filter(b=>b.category===category); if (!items.length) continue;
      const title=document.createElement('h3'); title.className='badge-category-heading'; title.textContent=category; section.appendChild(title);
      const grid=document.createElement('div'); grid.className='badge-plan-grid';
      grid.innerHTML=items.map(b => {
        const a=status.get(b.id), goal=goals.has(b.id);
        return `<div class="badge-plan-item"><button type="button" class="badge-plan-card${a.satisfied?' is-earned':''}" data-badge-open="${b.id}"><strong>${escapeText(b.name)}</strong><small>${a.satisfied?'✓ 獲得済み':`${a.done} / ${a.total} 条件を完了`}</small><div class="prog-wrap"><div class="prog-bar" style="width:${a.total?Math.round(a.done/a.total*100):0}%;background:${level.color}"></div></div><span class="badge-detail-hint">必要な科目を見る ›</span></button>
          <button type="button" class="badge-goal-btn" data-badge-goal="${b.id}" aria-label="${escapeText(b.name)}を${goal?'目標から外す':'目標にする'}" aria-pressed="${goal}">${goal?'⭐':'☆'}</button></div>`;
      }).join('');
      section.appendChild(grid);
    }
    container.appendChild(section);
  }
  if (!container.children.length) container.innerHTML='<div class="card"><p class="settings-note">この条件に当てはまるバッジはありません。</p></div>';
  document.querySelectorAll('#page-badges [data-badge-open]').forEach(b => b.addEventListener('click', () => showBadgeModal(b.dataset.badgeOpen)));
  document.querySelectorAll('#page-badges [data-badge-goal]').forEach(b => b.addEventListener('click', () => {
    const id=b.dataset.badgeGoal; toggleBadgePreference('goals',id); renderBadgesPage();
    document.querySelector(`#page-badges [data-badge-goal="${id}"]`)?.focus({preventScroll:true});
  }));
}

function badgeCourseHTML(code, completed, planned) {
  const s=SUBJECT_BY_CODE.get(code); if (!s) return '';
  const done=completed.has(code), registered=planned.has(code);
  const records=SEMESTERS.filter(sem=>getEnrolledCodes(sem.id).includes(code) || state.records[sem.id]?.[code])
    .map(sem=>getCourseProgress(sem.id,s)).sort((a,b)=>b.done-a.done);
  const progress=records[0], availability=getSubjectAvailability(s,getCurrentSemester());
  const caption=done?'全コマ・期末完了':progress?`コマ ${progress.viewed}/${s.lessons} · 期末${progress.exam?'済み':'未完了'}`:'履修未登録';
  return `<li class="badge-course${done?' is-complete':''}" data-badge-course="${code}"><span>${done?'✓':'○'} ${escapeText(s.name)}</span><small>${escapeText(code)} · ${s.credits}単位 · ${caption}${!done&&registered?' · 履修登録済み':''}${!done&&!availability.selectable?' · '+escapeText(availability.note):''}</small></li>`;
}
// 前提バッジも展開する。「いずれか」の枝を全必須と表示しない。
function badgeRequirementsHTML(badge, completed, planned, visiting=new Set()) {
  if (!badge || visiting.has(badge.id)) return '<p class="settings-note">要件の参照を確認してください。</p>';
  const next=new Set(visiting).add(badge.id), req=badge.requirements, parts=[];
  if (req.codes?.length) parts.push(`<ul class="badge-course-list">${req.codes.map(code=>badgeCourseHTML(code,completed,planned)).join('')}</ul>`);
  for (const group of req.anyCodeGroups || []) {
    const done=group.some(code=>completed.has(code));
    parts.push(`<details class="badge-requirement-group" ${done?'':'open'}><summary>${done?'✓':'○'} 以下から1科目を完了${done?'（達成済み）':''}</summary><ul class="badge-course-list">${group.map(code=>badgeCourseHTML(code,completed,planned)).join('')}</ul></details>`);
  }
  for (const group of req.creditGroups || []) {
    const candidates=ALL_SUBJECTS.filter(s=>s.category==='教養'&&s.type===group.type), credits=candidates.filter(s=>completed.has(s.code)).reduce((n,s)=>n+s.credits,0);
    parts.push(`<details class="badge-requirement-group"><summary>${credits>=group.credits?'✓':'○'} ${escapeText(group.type)}：${credits}/${group.credits}単位完了 · 科目候補</summary><p class="settings-note">以下から合計${group.credits}単位分を完了してください。すべての科目が必須ではありません。</p><ul class="badge-course-list">${candidates.map(s=>badgeCourseHTML(s.code,completed,planned)).join('')}</ul></details>`);
  }
  const prerequisiteHTML=(id,alternative=false)=>{
    const b=BADGES.find(b=>b.id===id), done=getBadgeAchievement(b,completed).satisfied;
    return `<details class="badge-requirement-group" ${!done&&!alternative?'open':''}><summary>${done?'✓':'○'} ${alternative?'選択候補':'前提'}：${escapeText(b?.name||id)}${done?'（獲得済み）':''}</summary>${badgeRequirementsHTML(b,completed,planned,next)}</details>`;
  };
  for (const id of [...(req.prerequisite?[req.prerequisite]:[]),...(req.prerequisites||[])]) parts.push(prerequisiteHTML(id));
  if (req.prerequisiteAny?.length) parts.push(`<div class="badge-alternative"><p class="settings-note">前提バッジ：以下のいずれか1つを獲得</p>${req.prerequisiteAny.map(id=>prerequisiteHTML(id,true)).join('')}</div>`);
  if (req.description) parts.push(`<p class="settings-note">${escapeText(req.description)}</p>`);
  if (req.manual) parts.push(`<label class="badge-manual-check"><input type="checkbox" data-badge-manual="${badge.id}" ${state.badgePreferences.confirmedManual.includes(badge.id)?'checked':''}><span>${escapeText(badge.name)}の卒研テーマ・追加条件を確認済み</span></label>`);
  return parts.join('');
}

function showBadgeModal(badgeId) {
  const badge=BADGES.find(b=>b.id===badgeId); if (!badge) return;
  document.getElementById('badge-modal')?.remove();
  const origin=document.activeElement, modal=document.createElement('div');
  modal.id='badge-modal'; modal.className='badge-plan-modal'; modal.setAttribute('role','dialog'); modal.setAttribute('aria-modal','true'); modal.setAttribute('aria-label',badge.name);
  const close=()=>{modal.remove(); const target=origin?.isConnected?origin:document.querySelector(`#page-badges [data-badge-open="${badgeId}"]`); target?.focus({preventScroll:true});};
  const paint=(focusSelector)=>{
    const scroll=modal.querySelector('.badge-plan-dialog')?.scrollTop||0;
    const openGroups=modal.children.length?[...modal.querySelectorAll('.badge-requirement-group')].map(el=>el.open):null;
    const completed=getCompletedCourseCodes(), a=getBadgeAchievement(badge,completed), level=BADGE_LEVEL_CONFIG[badge.level], goal=state.badgePreferences.goals.includes(badgeId);
    modal.innerHTML=`<div class="badge-plan-dialog"><header><div><p style="color:${level.color};font-size:12px">${level.label}</p><h2>${escapeText(badge.name)}</h2></div><button type="button" class="badge-favorite-icon" data-dialog-goal aria-label="目標${goal?'を解除':'に登録'}" aria-pressed="${goal}">${goal?'⭐':'☆'}</button><button type="button" data-badge-close aria-label="閉じる">閉じる</button></header>
      <p class="badge-achievement-status">${a.satisfied?'✓ 獲得済み':`${a.done} / ${a.total} 条件を完了`}</p>
      <h3 class="badge-requirements-heading">必要科目と選択条件</h3>
      ${badgeRequirementsHTML(badge,completed,getAllPlannedCodes())}
      </div>`;
    modal.querySelector('[data-badge-close]').addEventListener('click',close);
    modal.querySelector('[data-dialog-goal]').addEventListener('click',()=>{toggleBadgePreference('goals',badgeId);renderBadgesPage();paint('[data-dialog-goal]');});
    modal.querySelectorAll('[data-badge-manual]').forEach(input=>input.addEventListener('change',()=>{toggleBadgePreference('confirmedManual',input.dataset.badgeManual);renderBadgesPage();paint(`[data-badge-manual="${input.dataset.badgeManual}"]`);}));
    if(openGroups)modal.querySelectorAll('.badge-requirement-group').forEach((el,i)=>{if(i<openGroups.length)el.open=openGroups[i];});
    modal.querySelector('.badge-plan-dialog').scrollTop=scroll;
    if(focusSelector)modal.querySelector(focusSelector)?.focus({preventScroll:true});
  };
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();close();}
    if(e.key==='Tab'){
      const focusable=[...modal.querySelectorAll('button,input,summary')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first=focusable[0], last=focusable[focusable.length-1];
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  document.body.appendChild(modal);paint('[data-badge-close]');
}
