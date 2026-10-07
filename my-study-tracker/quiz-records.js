// 小テストは素点と満点を保存する。正式な成績と、評価配分による予測は分ける。
function validQuizScore(value) {
  return isPlainObject(value) && Number.isFinite(value.score) && Number.isFinite(value.max)
    && value.max > 0 && value.max <= 10000 && value.score >= 0 && value.score <= value.max;
}
function normalizeQuizScores(value, subject) {
  return Object.fromEntries(Object.entries(value).filter(([n,v])=>n!=='exam'&&validStudyUnit(n,subject)&&validQuizScore(v))
    .map(([n,v])=>[n,{score:v.score,max:v.max}]));
}
function validEvaluation(value) {
  if (!isPlainObject(value)) return false;
  const weights=['quizWeight','examWeight','otherWeight'];
  if (weights.some(k=>!Number.isFinite(value[k])||value[k]<0||value[k]>100)
      || Math.abs(weights.reduce((n,k)=>n+value[k],0)-100)>0.00001) return false;
  return ['examScore','otherScore'].every(k=>value[k]===undefined||(Number.isFinite(value[k])&&value[k]>=0&&value[k]<=100));
}
function gradeForScore(score) { return score>=90?'A':score>=80?'B':score>=70?'C':score>=60?'D':'F'; }
function getQuizSummary(semId,subject) {
  const record=getStudyRecord(semId,subject.code), scores=Object.values(record.quizScores||{}).filter(validQuizScore);
  const average=scores.length?scores.reduce((n,s)=>n+s.score/s.max*100,0)/scores.length:null;
  const evaluation=validEvaluation(record.evaluation)?record.evaluation:null;
  let predicted=null,requiredExam=null;
  if (evaluation && (evaluation.quizWeight===0||average!==null)) {
    predicted=((average??0)*evaluation.quizWeight+(evaluation.examScore??80)*evaluation.examWeight+(evaluation.otherScore??80)*evaluation.otherWeight)/100;
    if(evaluation.examWeight>0)requiredExam=(8000-(average??0)*evaluation.quizWeight-(evaluation.otherScore??80)*evaluation.otherWeight)/evaluation.examWeight;
  }
  return {count:scores.length,average,evaluation,predicted,requiredExam,
    grade:predicted===null?null:gradeForScore(predicted),low:average!==null&&average<80};
}
function getScholarshipSummary(semId=null) {
  const actual=getGradeSummary(semId);
  let weighted=(actual.gpa??0)*actual.gpaCredits,credits=actual.gpaCredits,unpredicted=0,predictedCourses=0,remainingCredits=0;
  const risks=[];
  for(const sem of SEMESTERS.filter(s=>semId===null||s.id===semId)) for(const s of getRecordedSubjects(sem.id)) {
    const record=getStudyRecord(sem.id,s.code),q=getQuizSummary(sem.id,s);
    if(q.low)risks.push({semId:sem.id,subject:s,average:q.average});
    if(record.grade)continue;
    remainingCredits+=s.credits;
    if(q.grade===null){unpredicted++;continue;}
    weighted+=GRADE_POINTS[q.grade]*s.credits;credits+=s.credits;predictedCourses++;
  }
  const requiredGP=remainingCredits?(3*(actual.gpaCredits+remainingCredits)-(actual.gpa??0)*actual.gpaCredits)/remainingCredits:null;
  return {actual,predicted:predictedCourses&&credits?weighted/credits:null,predictedCourses,unpredicted,risks,remainingCredits,requiredGP};
}
function scholarshipSummaryHTML(semId) {
  const semester=getScholarshipSummary(semId),all=getScholarshipSummary(),format=n=>n===null?'未計算':n.toFixed(2);
  const below=[semester.actual.gpa,all.actual.gpa,semester.predicted,all.predicted].some(n=>n!==null&&n<3);
  return `<div class="card scholarship-card${below?' needs-attention':''}"><div class="card-label">SCHOLARSHIP</div><h2 class="card-title">GPA 3.0をキープ</h2>
    <div class="record-stats"><div><strong>${format(semester.actual.gpa)}</strong><span>確定成績 · この学期</span></div><div><strong>${format(all.actual.gpa)}</strong><span>確定成績 · 累計</span></div><div><strong>3.00</strong><span>目標GPA</span></div></div>
    ${below?'<p class="plan-warning">登録済み成績または予測が3.0を下回っています。</p>':''}
    ${semester.predicted!==null?`<p class="record-caption">この学期の予測GPA <strong>${format(semester.predicted)}</strong> · ${semester.predictedCourses}科目を予測${semester.unpredicted?`／${semester.unpredicted}科目は予測未入力`:''}</p>`:`<p class="record-caption">評価配分を登録すると、小テストからGPAを予測できます。</p>`}
    ${all.predicted!==null?`<p class="record-caption">累計の予測GPA <strong>${format(all.predicted)}</strong>${all.unpredicted?` · ${all.unpredicted}科目は予測未入力`:''}</p>`:''}
    ${semester.requiredGP!==null?`<p class="record-caption">この学期の未確定${semester.remainingCredits}単位で必要な平均GP：<strong>${Math.max(0,semester.requiredGP).toFixed(2)}</strong>${semester.requiredGP>4?' · この学期の登録範囲では3.0に届きません':''}</p>`:''}
    ${semester.risks.length?`<p class="plan-warning">小テスト平均80点未満：${semester.risks.map(r=>`${escapeText(r.subject.name)} ${r.average.toFixed(1)}点`).join('、')}</p>`:''}
    <button type="button" class="inline-link" onclick="openStudyRecords()">点数・評価配分を管理 ›</button></div>`;
}
function quizCourseSummaryHTML(semId,subject) {
  const q=getQuizSummary(semId,subject);
  return `<div class="quiz-course-summary"><span>小テスト ${q.count}/${subject.lessons}</span>${q.average!==null?`<strong class="${q.low?'score-low':''}">平均 ${q.average.toFixed(1)}点</strong>`:''}
    ${q.predicted!==null?`<span>予測 ${q.predicted.toFixed(1)}点 · ${q.grade}</span>`:''}
    ${q.requiredExam!==null&&q.evaluation.examScore===undefined?`<span> B目標の期末 ${Math.max(0,q.requiredExam).toFixed(1)}点${q.requiredExam>100?'（期末だけでは届きません）':''}</span>`:''}
    <button type="button" class="inline-link" onclick="openStudyRecords('${subject.code}')">点数を確認 ›</button></div>`;
}
function saveQuizResult(semId,code,lesson,score,markComplete=false) {
  const subject=SUBJECT_BY_CODE.get(code);
  if(!subject||!SEMESTERS.some(s=>s.id===semId)||!Number.isInteger(lesson)||lesson<1||lesson>subject.lessons||(score!==null&&!validQuizScore(score)))return false;
  const record=getStudyRecord(semId,code),quizScores={...record.quizScores},change={};
  if(score!==null)quizScores[lesson]={score:score.score,max:score.max};else delete quizScores[lesson];
  change.quizScores=quizScores;
  if(markComplete){
    const done=new Set(getViewedLessons(semId,code)),studyDates={...record.studyDates};
    if(!done.has(lesson))studyDates[lesson]=japanDate();
    done.add(lesson);change.viewedLessons=[...done].sort((a,b)=>a-b);change.assignments=[...change.viewedLessons];change.studyDates=studyDates;
  }
  return changeStudyRecord(semId,code,change);
}
function showQuizModal(semId,code,lesson,markComplete=false) {
  const subject=SUBJECT_BY_CODE.get(code);if(!subject)return;
  document.getElementById('quiz-modal')?.remove();
  const origin=document.activeElement,modal=document.createElement('div'),old=getStudyRecord(semId,code).quizScores?.[lesson];
  const previous=Object.values(getStudyRecord(semId,code).quizScores||{}).filter(validQuizScore).at(-1);
  modal.id='quiz-modal';modal.className='badge-plan-modal';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','quiz-modal-title');
  modal.innerHTML=`<form class="badge-plan-dialog quiz-dialog" data-quiz-form><header><div><p class="card-label">QUIZ SCORE</p><h2 id="quiz-modal-title">${escapeText(subject.name)} · コマ${lesson}</h2></div><button type="button" data-quiz-close aria-label="閉じる">×</button></header>
    <div class="quiz-inputs"><label>点数<input type="number" name="score" min="0" max="10000" step="any" inputmode="decimal" value="${old?.score??''}" required autofocus></label><label>満点<input type="number" name="max" min="0.01" max="10000" step="any" inputmode="decimal" value="${old?.max??previous?.max??100}" required></label></div>
    <p class="quiz-preview" data-quiz-preview>点数を入力してください</p><p class="plan-warning" data-quiz-error role="alert" hidden></p>
    <div class="quiz-actions"><button type="submit" class="data-transfer-btn primary">${markComplete?'保存して完了':'点数を保存'}</button><button type="button" class="data-transfer-btn" data-quiz-later>${markComplete?'点数は後で入力':'点数を削除'}</button><button type="button" class="inline-link" data-quiz-cancel>キャンセル</button></div></form>`;
  const close=()=>{modal.remove();if(origin?.isConnected)origin.focus({preventScroll:true});applyPendingUpdate();};
  modal.querySelectorAll('[data-quiz-close],[data-quiz-cancel]').forEach(b=>b.addEventListener('click',close));
  modal.addEventListener('click',e=>{if(e.target===modal)close();});
  modal.addEventListener('keydown',e=>{
    if(e.key==='Escape'){e.stopPropagation();close();}
    if(e.key==='Tab'){
      const inputs=[...modal.querySelectorAll('button,input')].filter(el=>!el.disabled),first=inputs[0],last=inputs.at(-1);
      if(e.shiftKey&&document.activeElement===first){e.preventDefault();last.focus();}
      else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}
    }
  });
  const form=modal.querySelector('form'),error=modal.querySelector('[data-quiz-error]');
  const read=()=>({score:Number(form.elements.score.value),max:Number(form.elements.max.value)});
  form.addEventListener('input',()=>{
    const value=read(),preview=modal.querySelector('[data-quiz-preview]');
    preview.textContent=form.elements.score.value!==''&&validQuizScore(value)?`${(value.score/value.max*100).toFixed(1)}点 / 100点 · ${gradeForScore(value.score/value.max*100)}相当`:'点数と満点を確認してください';
  });
  const commit=value=>{
    if(!saveQuizResult(semId,code,lesson,value,markComplete)){error.hidden=false;error.textContent='保存できませんでした。入力を保持しています。';return;}
    close();rerenderAfterProgressChange();
  };
  form.addEventListener('submit',e=>{e.preventDefault();const value=read();if(form.elements.score.value===''||!validQuizScore(value)){error.hidden=false;error.textContent='0点以上、満点以下の点数を入力してください。';return;}commit(value);});
  modal.querySelector('[data-quiz-later]').addEventListener('click',()=>commit(null));
  document.body.appendChild(modal);form.elements.score.focus({preventScroll:true});
}
let studyRecordsFocusCode=null;
function openStudyRecords(code=null) {
  studyRecordsFocusCode=code;activatePage('settings');document.querySelector('[data-settings-tab="records"]')?.click();
  if(code)document.querySelector(`[data-record-course="${code}"]`)?.scrollIntoView({block:'start'});
}
function renderStudyRecords() {
  const root=document.getElementById('study-records-content');if(!root)return;
  const sem=getCurrentSemester(),opened=new Set([...root.querySelectorAll('[data-record-course][open]')].map(el=>el.dataset.recordCourse));
  if(studyRecordsFocusCode)opened.add(studyRecordsFocusCode);
  root.innerHTML=`<div class="card"><div class="card-label">STUDY RECORDS</div><h2 class="card-title">🍑 学習日と小テスト</h2><p>${escapeText(sem.name)}</p>
    ${getRecordedSubjects(sem.id).map(s=>{
      const record=getStudyRecord(sem.id,s.code),e=record.evaluation||{},done=getViewedLessons(sem.id,s.code);
      return `<details class="record-course" data-record-course="${s.code}" ${opened.has(s.code)?'open':''}><summary>${escapeText(s.name)}</summary>${quizCourseSummaryHTML(sem.id,s)}
        <div class="record-unit-list">${Array.from({length:s.lessons},(_,i)=>{const n=i+1,q=record.quizScores?.[n];return `<div class="record-unit-row"><span>コマ${n}${done.includes(n)?' ✓':''}</span>${done.includes(n)?studyDateInputHTML(sem.id,s.code,String(n)):'<span class="record-caption">学習日未記録</span>'}<button type="button" class="score-edit" data-edit-score="${s.code}" data-score-lesson="${n}">${q?`${q.score} / ${q.max}点`:'点数を入力'}</button></div>`;}).join('')}${record.examTaken?`<label class="study-date-row"><span>期末 ✓</span>${studyDateInputHTML(sem.id,s.code,'exam')}</label>`:''}</div>
        <form class="evaluation-form" data-evaluation="${s.code}"><h3>シラバスの評価配分</h3><div class="evaluation-grid">${[['quizWeight','小テスト %'],['examWeight','期末 %'],['otherWeight','その他 %'],['examScore','期末 100点換算'],['otherScore','その他 100点換算']].map(([key,label])=>`<label>${label}<input name="${key}" type="number" min="0" max="100" step="any" inputmode="decimal" value="${e[key]??''}" ${key.endsWith('Weight')?'required':''}></label>`).join('')}</div><button type="submit" class="data-transfer-btn">評価配分を保存</button><p data-evaluation-status role="status" class="record-caption">${record.evaluation?'登録済み':'未設定'}</p></form></details>`;
    }).join('')||'<p>履修科目を選ぶと、記録を管理できます。</p>'}</div>`;
  bindStudyDateInputs(root,()=>renderStudyRecords());
  root.querySelectorAll('[data-edit-score]').forEach(b=>b.addEventListener('click',()=>showQuizModal(sem.id,b.dataset.editScore,Number(b.dataset.scoreLesson))));
  root.querySelectorAll('[data-evaluation]').forEach(form=>{
    form.addEventListener('input',()=>{form.dataset.dirty='true';});
    form.addEventListener('submit',event=>{
      event.preventDefault();const evaluation={};
      for(const key of ['quizWeight','examWeight','otherWeight','examScore','otherScore'])if(form.elements[key].value!=='')evaluation[key]=Number(form.elements[key].value);
      const status=form.querySelector('[data-evaluation-status]');
      if(!validEvaluation(evaluation)){status.textContent='評価配分は合計100%にしてください。';return;}
      if(changeStudyRecord(sem.id,form.dataset.evaluation,{evaluation})){
        form.dataset.dirty='false';status.textContent='保存しました';
        form.closest('[data-record-course]').querySelector('.quiz-course-summary').outerHTML=quizCourseSummaryHTML(sem.id,SUBJECT_BY_CODE.get(form.dataset.evaluation));
        applyPendingUpdate();
      }
      else status.textContent='保存できませんでした。入力を保持しています。';
    });
  });
  studyRecordsFocusCode=null;
}
