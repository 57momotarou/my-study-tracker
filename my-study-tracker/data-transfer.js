// ============================================================
// my-study-tracker - データのバックアップ／復元
// ============================================================

const BACKUP_FORMAT = 'my-study-tracker-backup';
const BACKUP_VERSION = 2;
const MAX_BACKUP_BYTES = 5 * 1024 * 1024;

function setupDataTransfer() {
  const exportButton = document.getElementById('data-export-btn');
  const importButton = document.getElementById('data-import-btn');
  const importInput = document.getElementById('data-import-input');
  if (!exportButton || !importButton || !importInput) return;

  exportButton.addEventListener('click', exportStudyData);
  importButton.addEventListener('click', () => importInput.click());
  importInput.addEventListener('change', async () => {
    const file = importInput.files?.[0];
    importInput.value = '';
    if (!file) return;
    await importStudyData(file);
  });
}

async function exportStudyData() {
  const exportButton = document.getElementById('data-export-btn');
  setDataTransferBusy(exportButton, true, '準備中...');

  try {
    const now = new Date();
    const backup = {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: now.toISOString(),
      data: {
        enrollments: normalizeEnrollments(state.enrollments),
        progress: normalizeProgress(state.progress),
        currentSemesterId: state.currentSemesterId,
        records: normalizeRecords(state.records),
        applications: normalizeApplications(state.applications),
      },
    };

    const json = JSON.stringify(backup, null, 2);
    const filename = `study-tracker-backup-${formatLocalDate(now)}.json`;
    const file = new File([json], filename, { type: 'application/json' });

    if (isAppleMobileDevice() && navigator.share && navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({
          title: 'Study Tracker バックアップ',
          text: 'Study Trackerの引き継ぎ用バックアップです。',
          files: [file],
        });
        showDataTransferStatus('バックアップを共有しました。大切に保管してください。', 'success');
        return;
      } catch (error) {
        if (error?.name === 'AbortError') return;
        console.warn('共有できなかったため、通常のダウンロードに切り替えます。', error);
      }
    }

    downloadBackupFile(file, filename);
    showDataTransferStatus('バックアップを保存しました。大切に保管してください。', 'success');
  } catch (error) {
    console.error('バックアップの作成に失敗しました。', error);
    showDataTransferStatus('バックアップを作成できませんでした。もう一度お試しください。', 'error');
  } finally {
    setDataTransferBusy(exportButton, false);
  }
}

async function importStudyData(file) {
  const importButton = document.getElementById('data-import-btn');
  setDataTransferBusy(importButton, true, '確認中...');
  dataTransferInProgress = true;

  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('バックアップファイルが大きすぎます。');

    const rawText = await file.text();
    const payload = JSON.parse(rawText);
    const imported = parseBackupPayload(payload);
    const enrollmentCount = Object.values(imported.enrollments).reduce((total, codes) => total + codes.length, 0);
    const progressCount = Object.keys(imported.progress).length;

    const accepted = window.confirm(
      `履修 ${enrollmentCount}科目・動画進捗 ${progressCount}科目、成績・提出記録 ${Object.values(imported.records).reduce((sum, records) => sum + Object.keys(records).length, 0)}科目、申請予定 ${imported.applications.length}件を復元します。\n` +
      (payload.version === 1 ? '旧形式のため成績・課題・期末・申請予定は空になります。\n' : '') +
      '現在この端末にあるデータは置き換わります。続けますか？'
    );
    if (!accepted) return;

    Object.assign(state, imported);
    if (!saveState()) throw new Error('復元データを端末に保存できませんでした。現在の記録は保持しています。');
    // 復元後は古い入力途中の申請を持ち越さない。
    const form = document.getElementById('application-form');
    if (form) form.dataset.dirty = 'false';

    renderHeader();
    renderActivePage();
    showDataTransferStatus(`復元しました（履修 ${enrollmentCount}科目・進捗 ${progressCount}科目）。`, 'success');
  } catch (error) {
    console.error('バックアップの復元に失敗しました。', error);
    const isSyntaxError = error instanceof SyntaxError;
    showDataTransferStatus(
      isSyntaxError ? 'ファイルを読み取れません。Study Trackerのバックアップを選んでください。' : error.message,
      'error'
    );
  } finally {
    setDataTransferBusy(importButton, false);
    dataTransferInProgress = false;
    applyPendingUpdate();
  }
}

function parseBackupPayload(payload) {
  if (!isPlainObject(payload) || payload.format !== BACKUP_FORMAT) {
    throw new Error('Study Trackerのバックアップファイルではありません。');
  }
  if (!Number.isInteger(payload.version) || payload.version < 1 || payload.version > BACKUP_VERSION) {
    throw new Error('このバックアップ形式には対応していません。アプリを最新版に更新してください。');
  }
  if (!isPlainObject(payload.data)) throw new Error('バックアップのデータが見つかりません。');
  if (!isPlainObject(payload.data.enrollments) || !isPlainObject(payload.data.progress)) {
    throw new Error('バックアップの内容が壊れています。');
  }
  if (payload.version === 2) {
    const validEnrollments = Object.entries(payload.data.enrollments).every(([id, codes]) =>
      SEMESTERS.some(sem => String(sem.id) === id) && Array.isArray(codes)
      && codes.every(code => typeof code === 'string' && SUBJECT_BY_CODE.has(code)));
    const validProgress = Object.entries(payload.data.progress).every(([code, value]) =>
      SUBJECT_BY_CODE.has(code) && Number.isInteger(value) && value >= 0 && value <= SUBJECT_BY_CODE.get(code).lessons * 4);
    if (!validEnrollments || !validProgress || !SEMESTERS.some(sem => sem.id === payload.data.currentSemesterId)) {
      throw new Error('履修・動画進捗・学期の内容を確認できません。バックアップとアプリの版を確認してください。');
    }
  }

  const enrollments = normalizeEnrollments(payload.data.enrollments);
  const progress = normalizeProgress(payload.data.progress);
  const requestedSemesterId = Number(payload.data.currentSemesterId);
  const currentSemesterId = SEMESTERS.some(semester => semester.id === requestedSemesterId)
    ? requestedSemesterId
    : getDefaultSemesterId();

  const records = payload.version === 1 ? {} : validateRecords(payload.data.records);
  const applications = payload.version === 1 ? [] : normalizeApplications(payload.data.applications, true);
  return { enrollments, progress, currentSemesterId, records, applications };
}

function isPlainObject(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function downloadBackupFile(file, filename) {
  const url = URL.createObjectURL(file);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = 'noopener';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function formatLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function isAppleMobileDevice() {
  return /iPhone|iPad|iPod/.test(navigator.userAgent)
    || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

function setDataTransferBusy(button, busy, busyLabel = '') {
  if (!button) return;
  if (busy) {
    button.dataset.defaultLabel = button.textContent;
    button.textContent = busyLabel;
  } else if (button.dataset.defaultLabel) {
    button.textContent = button.dataset.defaultLabel;
    delete button.dataset.defaultLabel;
  }
  button.disabled = busy;
}

function showDataTransferStatus(message, type) {
  const status = document.getElementById('data-transfer-status');
  if (!status) return;
  status.textContent = message || '';
  status.className = `data-transfer-status${type ? ` ${type}` : ''}`;
}
