// ============================================================
// my-study-tracker - attendance.js
// 出席認定期限の計算ロジック
// ============================================================

// YYYY-MM-DD を UTC ではなく利用端末のローカル日付として扱う。
// JavaScript 標準の new Date('YYYY-MM-DD') は UTC 解釈のため、地域によって日付がずれる。
function parseDateValue(value) {
  if (value instanceof Date) return new Date(value.getTime());
  if (typeof value === 'string') {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (match) return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  }
  return new Date(value);
}

function endOfDate(value) {
  const date = parseDateValue(value);
  date.setHours(23, 59, 59, 999);
  return date;
}

// 時刻の差ではなくカレンダー上の日付差を返す（今日=0、明日=1、昨日=-1）。
function calendarDayDiff(target, origin = new Date()) {
  const targetDate = parseDateValue(target);
  const originDate = parseDateValue(origin);
  const targetDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const originDay = new Date(originDate.getFullYear(), originDate.getMonth(), originDate.getDate());
  return Math.round((targetDay - originDay) / 86400000);
}

// 科目と学期から該当する出席認定テーブルキーを返す
function getAttendanceKey(subject, semester) {
  if (!semester.attendance) return null;
  if (subject.code === 'SD302E') return 'academic_writing';
  if (subject.code === 'SD101E') return 'study_skill';
  if (subject.deadline_type === '外国語') return 'gaikokugo';
  if (subject.deadline_type === '専門') {
    return subject.open_type === '一斉' ? 'senmon_issai' : 'senmon_jyunji';
  }
  if (subject.deadline_type === '教養') {
    if (subject.is_enshu) return 'kyoyo_enshu';
    if (subject.term === '前期') return 'kyoyo_zenki';
    if (subject.term === '後期') return 'kyoyo_koki';
    // 通期科目：春学期→前期テーブル、秋学期→後期テーブル（将来対応）を使用
    if (subject.term === '通期') {
      return semester.season === '春' ? 'kyoyo_zenki' : 'kyoyo_koki';
    }
  }
  return null;
}

// コマnの出席認定締切日時を返す（Dateオブジェクト）
function getLessonDeadline(lessonNum, subject, semester) {
  const key = getAttendanceKey(subject, semester);
  if (key && semester.attendance && semester.attendance[key]) {
    const entry = semester.attendance[key][lessonNum];
    if (entry) {
      const dateStr = typeof entry === 'string' ? entry : entry.end;
      return parseDateValue(dateStr);
    }
  }
  // 未提供の学期は概算。画面に未確定の案内を表示する。
  const start = parseDateValue(semester.start);
  const deadlineDow = subject.deadline_type === '専門' ? 4 : 2;
  const daysToFirst = (deadlineDow - start.getDay() + 7) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() + daysToFirst);
  first.setHours(12, 0, 0, 0);
  const dl = new Date(first);
  dl.setDate(first.getDate() + (lessonNum - 1) * 7 + 14);
  return dl;
}

function getLessonStart(lessonNum, subject, semester) {
  const key = getAttendanceKey(subject, semester);
  if (key && semester.attendance && semester.attendance[key]) {
    const entry = semester.attendance[key][lessonNum];
    if (entry) {
      if (typeof entry === 'object' && entry.start) {
        return parseDateValue(entry.start.includes('T') ? entry.start : entry.start + 'T12:00:00+09:00');
      }
      if (key === 'kyoyo_koki') {
        return parseDateValue(semester.lateTermStart);
      }
      return parseDateValue(semester.lectureStart || semester.start + 'T12:00:00+09:00');
    }
  }
  return parseDateValue(semester.start + 'T12:00:00+09:00');
}

// 一斉開講も、学期開始前や当日正午前には受講可能と表示しない。
function isLessonAvailable(lessonNum, subject, semester) {
  return getLessonStart(lessonNum, subject, semester) <= new Date();
}

// 今日時点で期限が過ぎているコマ数（遅刻の基準）
function getTodayTarget(subject, semester) {
  const now = new Date();
  let count = 0;
  for (let n = 1; n <= subject.lessons; n++) {
    if (getLessonDeadline(n, subject, semester) <= now) count++;
    else break;
  }
  return count;
}

// 推奨完了コマ数（締切7日前を目標とする余裕スケジュール）
const ADVANCE_DAYS = 7;
function getTodayRecommended(subject, semester) {
  const now = new Date();
  let count = 0;
  for (let n = 1; n <= subject.lessons; n++) {
    const dl = getLessonDeadline(n, subject, semester);
    const advTarget = new Date(dl.getTime() - ADVANCE_DAYS * 86400000);
    if (advTarget <= now) count++;
    else break;
  }
  return Math.max(count, getTodayTarget(subject, semester));
}

// コマnが遅刻（期限切れ）かどうか
function isLessonLate(lessonNum, subject, semester) {
  return getLessonDeadline(lessonNum, subject, semester) < new Date();
}
