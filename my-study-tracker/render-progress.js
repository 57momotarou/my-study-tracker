// 進捗は各コマと期末を個別に記録する。
function renderProgressPage() {
  const selector = document.getElementById('semester-progress-selector'); selector.replaceChildren();
  SEMESTERS.forEach(sem => {
    if (!getEnrolledCodes(sem.id).length && !Object.keys(state.records[sem.id] || {}).length) return;
    const b = document.createElement('button'); b.className = `filter-btn${sem.id === state.currentSemesterId ? ' active' : ''}`; b.textContent = sem.name;
    b.addEventListener('click', () => {state.currentSemesterId = sem.id; saveState(); renderHeader(); renderProgressPage();}); selector.appendChild(b);
  });
  document.querySelectorAll('[data-progress-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.progressView===progressView)));
  const sem=getCurrentSemester(), semId=sem.id, subjects=getEnrolledSubjects(semId), list=document.getElementById('progress-subject-list');
  if(progressView==='grades'){renderGrades(list,semId);return;}
  if(!subjects.length){list.innerHTML='<div class="card"><p class="settings-note">設定でこの学期の履修科目を選んでください。</p></div>';return;}
  const stats=subjects.map(s=>getCourseProgress(semId,s)), done=stats.reduce((n,s)=>n+s.done,0), total=stats.reduce((n,s)=>n+s.total,0), completed=stats.filter(s=>s.complete).length;
  let html=`<div class="card"><div class="record-stats"><div><strong>${Math.round(done/total*100)}%</strong><span>コマ＋期末の進捗</span></div><div><strong>${done}<small>/${total}</small></strong><span>チェック済み</span></div><div><strong>${completed}<small>/${subjects.length}科目</small></strong><span>学習完了</span></div></div>
    <p class="settings-note">コマをタップすると色がつき、もう一度で解除。全コマ＋期末でその教科が完了になります。色が付いたコマは視聴・課題提出済みです。成績・単位は別に登録できます。</p>
    <p class="settings-note">開講前でも手動記録できます。実際の受講可能日を示すものではありません。旧版の動画進捗を引き継ぎ、編集後は学期ごとに保存します。</p></div>`;
  for(const subject of subjects){
    const p=getCourseProgress(semId,subject), color=getCategoryColor(subject.category), late=getOverdueLessonCount(semId,subject,sem);
    html+=`<div class="progress-subject-card" data-subject-card="${subject.code}"><div class="ps-header"><div><div class="ps-name">${escapeText(subject.name)}</div><div class="settings-note">${p.complete?'✓ この教科は完了':p.viewed===subject.lessons?'期末を記録すると完了':`${p.viewed}/${subject.lessons}コマ提出済み`}${late?` · 期限超過 ${late}コマ`:''}</div></div><strong class="ps-pct" style="color:${color}">${p.percent}%</strong></div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${p.percent}%;background:${color}"></div></div>${renderLessonButtons(subject,sem,semId)}
      <p class="settings-note">${p.exam?'期末：受験済み':'期末：未記録'} <button type="button" class="inline-link" onclick="showDeadlineModal('${subject.code}',${semId})">締切一覧</button></p>
      ${renderSubjectChecks(subject,semId)}</div>`;
  }
  list.innerHTML=html;bindStudyChecks(list,semId);
}
