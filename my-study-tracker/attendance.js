// ============================================================
// my-study-tracker - attendance.js
// 出席認定期限の計算ロジック
// ============================================================

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
      return new Date(dateStr);
    }
  }
  // テーブルがない学期（秋学期以降）は計算式でフォールバック
  const start = new Date(semester.start);
  const deadlineDow = subject.deadline_type === '専門' ? 4 : 2;
  const daysToFirst = (deadlineDow - start.getDay() + 7) % 7;
  const first = new Date(start);
  first.setDate(start.getDate() + daysToFirst);
  first.setHours(12, 0, 0, 0);
  const dl = new Date(first);
  dl.setDate(first.getDate() + (lessonNum - 1) * 7 + 14);
  return dl;
}

// コマnがすでに受講可能かどうか（順次開講は開講前は不可）
function isLessonAvailable(lessonNum, subject, semester) {
  const key = getAttendanceKey(subject, semester);
  if (key && semester.attendance && semester.attendance[key]) {
    const entry = semester.attendance[key][lessonNum];
    if (entry && typeof entry === 'object' && entry.start) {
      return new Date(entry.start) <= new Date();
    }
  }
  return true;
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

// ── 余裕を持ったスケジュール ──
// 「締切の7日前までに完了」を目標とする推奨コマ数を返す
// 例：締切が来週木曜なら「今週中に完了」を推奨
// ADVANCE_DAYS: 締切の何日前を目標にするか（デフォルト7日）
const ADVANCE_DAYS = 7;

function getTodayRecommended(subject, semester) {
  const now = new Date();
  // 締切の ADVANCE_DAYS 日前を目標日として計算
  const targetDate = new Date(now);
  targetDate.setDate(now.getDate() + ADVANCE_DAYS);

  let count = 0;
  for (let n = 1; n <= subject.lessons; n++) {
    const deadline = getLessonDeadline(n, subject, semester);
    // 締切 - ADVANCE_DAYS が今日以前 ＝ 今日時点で「もう進めておくべき」コマ
    const advanceTarget = new Date(deadline.getTime() - ADVANCE_DAYS * 86400000);
    if (advanceTarget <= now) count++;
    else break;
  }
  // 遅刻コマ数を下回らないよう保証
  return Math.max(count, getTodayTarget(subject, semester));
}

// コマnが遅刻（期限切れ）かどうか
function isLessonLate(lessonNum, subject, semester) {
  return getLessonDeadline(lessonNum, subject, semester) < new Date();
}
