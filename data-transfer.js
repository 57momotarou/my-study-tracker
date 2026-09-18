// ============================================================
// my-study-tracker - データのバックアップ／復元
// ============================================================

const BACKUP_FORMAT = 'my-study-tracker-backup';
const BACKUP_VERSION = 1;
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

  try {
    if (file.size > MAX_BACKUP_BYTES) throw new Error('バックアップファイルが大きすぎます。');

    const rawText = await file.text();
    const payload = JSON.parse(rawText);
    const imported = parseBackupPayload(payload);
    const enrollmentCount = Object.values(imported.enrollments).reduce((total, codes) => total + codes.length, 0);
    const progressCount = Object.keys(imported.progress).length;

    const accepted = window.confirm(
      `履修 ${enrollmentCount}科目・進捗 ${progressCount}科目を復元します。\n` +
      '現在この端末にあるデータは置き換わります。続けますか？'
    );
    if (!accepted) return;

    const previous = {
      enrollments: state.enrollments,
      progress: state.progress,
      currentSemesterId: state.currentSemesterId,
    };

    state.enrollments = imported.enrollments;
    state.progress = imported.progress;
    state.currentSemesterId = imported.currentSemesterId;

    const saved = saveState() && writeStoredValue(KEYS.migrated, '1');
    if (!saved) {
      state.enrollments = previous.enrollments;
      state.progress = previous.progress;
      state.currentSemesterId = previous.currentSemesterId;
      saveState();
      throw new Error('復元データを端末に保存できませんでした。');
    }

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

  const enrollments = normalizeEnrollments(payload.data.enrollments);
  const progress = normalizeProgress(payload.data.progress);
  const requestedSemesterId = Number(payload.data.currentSemesterId);
  const currentSemesterId = SEMESTERS.some(semester => semester.id === requestedSemesterId)
    ? requestedSemesterId
    : getDefaultSemesterId();

  return { enrollments, progress, currentSemesterId };
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
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
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
