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
    if (entry) {
      // 順次開講：startがあればそれで判定
      if (typeof entry === 'object' && entry.start) {
        return new Date(entry.start) <= new Date();
      }
      // 一斉開講（文字列の締切のみ）：科目の開講キーに応じて開始日を判定
      // kyoyo_kokiは春学期5月頃から開講
      if (key === 'kyoyo_koki') {
        // 後期は5月の最初の締切日の2週間前から開講と推定
        const firstEntry = semester.attendance[key][1];
        if (firstEntry) {
          const firstDL = new Date(typeof firstEntry==='string' ? firstEntry : firstEntry.end);
          const startDate = new Date(firstDL.getTime() - 14 * 86400000);
          return startDate <= new Date();
        }
      }
      // senmon_issai, kyoyo_zenki, gaikokugo等: 学期開始と同時に開講
      return true;
    }
  }
  // テーブルなし（秋学期以降）は学期開始日で判定
  if (semester.start) {
    return new Date(semester.start) <= new Date();
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
