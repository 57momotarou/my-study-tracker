// 進捗は各コマと期末を個別に記録する。
function renderProgressPage() {
  document.querySelectorAll('[data-progress-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.progressView===progressView)));
  const sem=getCurrentSemester(), semId=sem.id, subjects=getEnrolledSubjects(semId), list=document.getElementById('progress-subject-list');
  if(progressView==='grades'){renderGrades(list,semId);return;}
  if(!subjects.length){list.innerHTML='<div class="card"><p class="settings-note">設定でこの学期の履修科目を選んでください。</p></div>';return;}
  const stats=subjects.map(s=>getCourseProgress(semId,s)), done=stats.reduce((n,s)=>n+s.done,0), total=stats.reduce((n,s)=>n+s.total,0), completed=stats.filter(s=>s.complete).length;
  let html=`${scholarshipSummaryHTML(semId)}<div class="card"><div class="record-stats"><div><strong>${Math.round(done/total*100)}%</strong><span>コマ＋期末の進捗</span></div><div><strong>${done}<small>/${total}</small></strong><span>チェック済み</span></div><div><strong>${completed}<small>/${subjects.length}科目</small></strong><span>学習完了</span></div></div></div>`;
  for(const subject of subjects){
    const p=getCourseProgress(semId,subject), color=getCategoryColor(subject.category), late=getOverdueLessonCount(semId,subject,sem);
    html+=`<div class="progress-subject-card" data-subject-card="${subject.code}"><div class="ps-header"><div><div class="ps-name">${escapeText(subject.name)}</div><div class="settings-note">${p.complete?'✓ この教科は完了':p.viewed===subject.lessons?'期末を記録すると完了':`${p.viewed}/${subject.lessons}コマ提出済み`}${late?` · 期限超過 ${late}コマ`:''}</div></div><strong class="ps-pct" style="color:${color}">${p.percent}%</strong></div>
      <div class="prog-wrap"><div class="prog-bar" style="width:${p.percent}%;background:${color}"></div></div>${renderLessonButtons(subject,sem,semId)}
      <p class="settings-note">${p.exam?'期末：受験済み':'期末：未記録'} <button type="button" class="inline-link" onclick="showDeadlineModal('${subject.code}',${semId})">締切一覧</button></p>
      ${renderSubjectChecks(subject,semId)}</div>`;
  }
  list.innerHTML=html;bindStudyChecks(list,semId);
}
