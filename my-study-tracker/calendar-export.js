// 日本時間の申請予定と、資料で確認できた締切のiCalendar出力。
function validCalendarDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
    && Number(value.slice(0, 4)) >= 2000 && Number(value.slice(0, 4)) <= 2100;
}

function normalizeApplications(value, strict = false) {
  const invalid = () => { if (strict) throw new Error('申請予定の内容が不正です。'); };
  if (!Array.isArray(value) || value.length > 1000) { invalid(); return []; }
  const result = [], ids = new Set();
  for (const item of value) {
    if (!isPlainObject(item) || typeof item.id !== 'string' || !/^[a-zA-Z0-9-]{1,80}$/.test(item.id)
        || ids.has(item.id) || !SEMESTERS.some(sem => sem.id === item.semesterId)
        || typeof item.title !== 'string' || !item.title.trim() || item.title.length > 120
        || !validCalendarDate(item.date) || typeof item.allDay !== 'boolean'
        || typeof item.time !== 'string' || (item.allDay ? item.time !== '' : !/^([01]\d|2[0-3]):[0-5]\d$/.test(item.time))
        || typeof item.notes !== 'string' || item.notes.length > 2000
        || typeof item.done !== 'boolean' || !Number.isInteger(item.revision) || item.revision < 0 || item.revision > 2147483647) { invalid(); continue; }
    ids.add(item.id);
    result.push({ id: item.id, semesterId: item.semesterId, title: item.title.trim(), date: item.date,
      allDay: item.allDay, time: item.time, notes: item.notes, done: item.done, revision: item.revision });
  }
  return result;
}

function getApplications(semId) {
  return state.applications.filter(item => item.semesterId === semId)
    .sort((a, b) => `${a.date} ${a.time}`.localeCompare(`${b.date} ${b.time}`));
}

function confirmedLessonDeadline(subject, semester, lesson) {
  if (!['一斉', '順次'].includes(subject.open_type)) return null;
  const entry = semester.attendance?.[getAttendanceKey(subject, semester)]?.[lesson];
  const raw = typeof entry === 'string' ? entry : entry?.end;
  // 概算へのフォールバックは使用しない。元テーブルの時刻なしも対象外。
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw)) return null;
  const date = new Date(/[Zz]|[+-]\d{2}:\d{2}$/.test(raw) ? raw : raw + '+09:00');
  return Number.isFinite(date.getTime()) ? date : null;
}

function getCalendarEvents(semId, options = { lessons: true, exams: true, applications: true }) {
  const semester = SEMESTERS.find(sem => sem.id === semId);
  if (!semester) return { events: [], skipped: 0 };
  const events = [];
  let skipped = 0;
  if (options.lessons) for (const subject of getEnrolledSubjects(semId)) {
    for (let n = 1; n <= subject.lessons; n++) {
      const start = confirmedLessonDeadline(subject, semester, n);
      if (!start) { skipped++; continue; }
      events.push({ uid: `lesson-${semId}-${subject.code}-${n}@my-study-tracker`, start,
        title: `${subject.name} 第${n}回 締切`,
        description: `${semester.name}\n動画視聴・課題の締切（日本時間）。Cloud Campusで詳細を確認してください。` });
    }
  }
  if (options.exams) for (const exam of getRelevantExams(semester)) {
    // 対象区分・締切時刻が明示された期末のみ。春の旧日付のみの行は出力しない。
    if (!exam.keys?.length || !/T\d{2}:\d{2}:\d{2}(?:Z|[+-]\d{2}:\d{2})$/.test(exam.date)) { skipped++; continue; }
    events.push({ uid: `exam-${semId}-${exam.keys.join('-')}@my-study-tracker`, start: new Date(exam.date),
      title: `${exam.label} 締切`, description: `${semester.name}\n期末試験の締切（日本時間）。受験開始日時・対象科目はCloud Campusで確認してください。` });
  }
  if (options.applications) for (const item of getApplications(semId)) {
    events.push({ uid: `application-${item.id}@my-study-tracker`, title: item.title,
      allDay: item.allDay, start: item.allDay ? item.date : new Date(`${item.date}T${item.time}:00+09:00`),
      revision: item.revision, description: `${semester.name}\n本人が登録した申請予定${item.done ? '（対応済み）' : ''}\n${item.notes}` });
  }
  return { events, skipped };
}

function escapeICSText(value) {
  return String(value).replace(/\\/g, '\\\\').replace(/\r\n|\r|\n/g, '\\n').replace(/;/g, '\\;').replace(/,/g, '\\,');
}

function foldICSLine(line) {
  const encoder = new TextEncoder();
  const lines = [];
  let part = '', bytes = 0;
  for (const char of line) {
    const size = encoder.encode(char).length;
    if (bytes + size > 75) { lines.push(part); part = ' '; bytes = 1; }
    part += char; bytes += size;
  }
  lines.push(part);
  return lines.join('\r\n');
}

function icsUTC(date) { return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z'); }

function buildCalendarICS(events, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Study Tracker//Study Calendar//JA', 'CALSCALE:GREGORIAN'];
  events.forEach(event => {
    lines.push('BEGIN:VEVENT', `UID:${event.uid}`, `DTSTAMP:${icsUTC(now)}`, `SEQUENCE:${event.revision || 0}`);
    if (event.allDay) {
      const next = new Date(event.start + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1);
      lines.push(`DTSTART;VALUE=DATE:${event.start.replace(/-/g, '')}`, `DTEND;VALUE=DATE:${next.toISOString().slice(0, 10).replace(/-/g, '')}`);
    } else {
      // 締切は一点の時刻。DTENDなしのDATE-TIMEイベント。
      lines.push(`DTSTART:${icsUTC(event.start)}`);
    }
    lines.push(`SUMMARY:${escapeICSText(event.title)}`, `DESCRIPTION:${escapeICSText(event.description || '')}`, 'TRANSP:TRANSPARENT', 'END:VEVENT');
  });
  lines.push('END:VCALENDAR');
  return lines.map(foldICSLine).join('\r\n') + '\r\n';
}

async function exportStudyCalendar() {
  const button = document.getElementById('calendar-export-btn');
  const status = document.getElementById('calendar-export-status');
  setDataTransferBusy(button, true, '準備中…');
  try {
    const options = Object.fromEntries(['lessons', 'exams', 'applications'].map(name => [name, document.getElementById(`calendar-${name}`).checked]));
    const { events, skipped } = getCalendarEvents(state.currentSemesterId, options);
    if (!events.length) { status.textContent = '出力できる確定予定がありません。対象の選択・履修科目・申請予定を確認してください。'; return; }
    const filename = `study-calendar-${state.currentSemesterId}.ics`;
    const file = new File([buildCalendarICS(events)], filename, { type: 'text/calendar;charset=utf-8' });
    if (isAppleMobileDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], title: 'Study Tracker カレンダー' }); }
      catch (error) { if (error.name === 'AbortError') return; downloadBackupFile(file, filename); }
    } else downloadBackupFile(file, filename);
    status.textContent = `${events.length}件を書き出しました。${skipped ? `日時・区分が未確定の${skipped}件は除外しています。` : ''}カレンダーアプリで取り込んでください。`;
  } catch (error) { status.textContent = 'カレンダーを出力できませんでした。もう一度お試しください。'; console.warn(error); }
  finally { setDataTransferBusy(button, false); }
}

function renderApplicationPanel() {
  const el = document.getElementById('application-panel');
  if (!el) return;
  const draft = document.getElementById('application-form');
  if (draft?.dataset.dirty === 'true') {
    const originalSem = SEMESTERS.find(sem => sem.id === Number(draft.elements.semesterId.value));
    if (originalSem?.id !== state.currentSemesterId) {
      document.getElementById('application-status').textContent = `入力中の予定は${originalSem.name}に保存します。別の学期で新しく登録するには「入力をクリア」を押してください。`;
    }
    renderApplicationList();
    return;
  }
  el.innerHTML = `<div class="card"><div class="card-label">APPLICATIONS</div><div class="card-title">申請・自分の予定</div>
    <p class="settings-note">${escapeText(getCurrentSemester().name)}の予定です。大学の案内で確認した日付・時刻を登録してください。</p>
    <form id="application-form" data-dirty="false">
      <input type="hidden" name="id"><input type="hidden" name="semesterId" value="${state.currentSemesterId}">
      <label class="search-label" for="application-title">予定名</label>
      <input class="settings-search" id="application-title" name="title" maxlength="120" required placeholder="例：ゼミエントリー締切">
      <div class="application-datetime">
        <label class="search-label">日付<input class="settings-search" type="date" name="date" min="2000-01-01" max="2100-12-31" required></label>
        <label class="search-label">時刻（日本時間）<input class="settings-search" type="time" name="time" required></label>
      </div>
      <label class="exam-check"><input type="checkbox" name="allDay">終日の予定</label>
      <label class="search-label" for="application-notes">メモ・確認した案内（任意）</label>
      <textarea class="settings-search" id="application-notes" name="notes" rows="2" maxlength="2000"></textarea>
      <div class="data-transfer-actions"><button class="data-transfer-btn primary" type="submit">予定を保存</button>
        <button class="data-transfer-btn" type="button" id="application-cancel">入力をクリア</button></div>
      <p id="application-status" class="settings-note" role="status"></p>
    </form><div id="application-list"></div>
  </div>`;
  const form = document.getElementById('application-form');
  form.addEventListener('input', () => { form.dataset.dirty = 'true'; });
  form.elements.allDay.addEventListener('change', () => {
    form.elements.time.disabled = form.elements.allDay.checked;
    form.elements.time.required = !form.elements.allDay.checked;
  });
  form.addEventListener('submit', event => {
    event.preventDefault();
    const previous = state.applications.find(item => item.id === form.elements.id.value);
    const id = previous?.id || (typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `app-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const candidate = { id, semesterId: Number(form.elements.semesterId.value), title: form.elements.title.value,
      date: form.elements.date.value, allDay: form.elements.allDay.checked,
      time: form.elements.allDay.checked ? '' : form.elements.time.value, notes: form.elements.notes.value,
      done: previous?.done || false, revision: previous ? previous.revision + 1 : 0 };
    try {
      const normalized = normalizeApplications([candidate], true)[0];
      if (!previous && state.applications.length >= 1000) throw new Error('予定は1000件まで登録できます。');
      state.applications = [...state.applications.filter(item => item.id !== id), normalized];
      if (!saveState()) throw new Error('保存できませんでした。入力を残しています。');
      form.dataset.dirty = 'false';
      renderSchedulePage();
      document.getElementById('application-status').textContent = '予定を保存しました。';
      applyPendingUpdate();
    } catch (error) { document.getElementById('application-status').textContent = error.message; }
  });
  document.getElementById('application-cancel').addEventListener('click', () => {
    form.dataset.dirty = 'false'; renderApplicationPanel(); applyPendingUpdate();
  });
  renderApplicationList();
}

function renderApplicationList() {
  const el = document.getElementById('application-list');
  el.innerHTML = getApplications(state.currentSemesterId).map(item => `<article class="application-item">
    <label class="exam-check"><input type="checkbox" data-application-done="${item.id}" ${item.done ? 'checked' : ''}>
      <span><strong>${escapeText(item.title)}</strong><small>${item.date} ${item.allDay ? '終日' : item.time + '（日本時間）'}${item.done ? ' · 対応済み' : ''}</small></span></label>
    ${item.notes ? `<p class="application-notes">${escapeText(item.notes)}</p>` : ''}
    <div class="application-actions"><button class="data-transfer-btn" type="button" data-application-edit="${item.id}">編集</button>
      <button class="data-transfer-btn" type="button" data-application-delete="${item.id}">削除</button></div>
  </article>`).join('') || '<p class="settings-note">この学期の申請予定はまだありません。</p>';
  el.querySelectorAll('[data-application-done]').forEach(input => input.addEventListener('change', () => {
    state.applications = state.applications.map(item => item.id === input.dataset.applicationDone ? { ...item, done: input.checked, revision: item.revision + 1 } : item);
    saveState(); renderApplicationList(); renderMonthSchedule(getEnrolledSubjects(state.currentSemesterId), getCurrentSemester(), state.currentSemesterId);
  }));
  el.querySelectorAll('[data-application-edit]').forEach(button => button.addEventListener('click', () => {
    const form = document.getElementById('application-form');
    if (form.dataset.dirty === 'true' && !window.confirm('入力中の内容を破棄して、この予定を編集しますか？')) return;
    const item = state.applications.find(entry => entry.id === button.dataset.applicationEdit);
    for (const name of ['id', 'semesterId', 'title', 'date', 'time', 'notes']) form.elements[name].value = item[name];
    form.elements.allDay.checked = item.allDay;
    form.elements.time.disabled = item.allDay; form.elements.time.required = !item.allDay;
    form.dataset.dirty = 'true'; form.elements.title.focus();
  }));
  el.querySelectorAll('[data-application-delete]').forEach(button => button.addEventListener('click', () => {
    if (!window.confirm('この申請予定を削除しますか？')) return;
    const form = document.getElementById('application-form');
    const deletingDraft = form.elements.id.value === button.dataset.applicationDelete;
    state.applications = state.applications.filter(item => item.id !== button.dataset.applicationDelete);
    if (saveState() && deletingDraft) form.dataset.dirty = 'false';
    renderSchedulePage(); renderApplicationList();
  }));
}
