const APP_VERSION = '67';
let pwaRegistration = null;
let pendingAppReload = false;
let appReloadStarted = false;
let lastUpdateCheck = 0;
let updateCheckRunning = false;
let dataTransferInProgress = false;

function setUpdateStatus(message) {
  const status = document.getElementById('app-update-status');
  if (status) status.textContent = message;
}

function applyPendingUpdate() {
  if (!pendingAppReload || appReloadStarted) return;
  if (document.getElementById('application-form')?.dataset.dirty === 'true' || dataTransferInProgress) {
    let banner = document.getElementById('update-pending');
    if (!banner) {
      banner = document.createElement('div'); banner.id = 'update-pending'; banner.setAttribute('role', 'status');
      banner.className = 'update-pending'; document.body.appendChild(banner);
    }
    banner.textContent = '新版を取得しました。入力内容を保存またはクリアすると更新します。';
    return;
  }
  appReloadStarted = true;
  location.reload();
}

async function checkAppUpdate(manual = false) {
  if (!pwaRegistration) {
    if (manual) setUpdateStatus('更新機能を準備中です。HTTPSの公開ページで少し待ってからお試しください。');
    return;
  }
  if (navigator.onLine === false) { if (manual) setUpdateStatus('オフラインです。接続後に更新を確認してください。'); return; }
  if (updateCheckRunning || (!manual && Date.now() - lastUpdateCheck < 30000)) return;
  lastUpdateCheck = Date.now(); updateCheckRunning = true;
  if (manual) setUpdateStatus('更新を確認しています…');
  try {
    await pwaRegistration.update();
    if (manual) setUpdateStatus(pwaRegistration.installing || pendingAppReload
      ? '新版を取得しています。完了すると自動で切り替わります。'
      : `公開済みの更新を確認しました。現在のアプリ：v${APP_VERSION}`);
    applyPendingUpdate();
  } catch (error) {
    if (manual) setUpdateStatus('更新を確認できませんでした。通信状態と公開の完了を確認してください。');
    console.warn('更新確認に失敗しました。', error);
  } finally { updateCheckRunning = false; }
}

function registerSW() {
  document.getElementById('app-version').textContent = `v${APP_VERSION}`;
  document.getElementById('app-update-btn').addEventListener('click', () => checkAppUpdate(true));
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') {
    setUpdateStatus('自動更新はHTTPSで公開したアプリで利用できます。'); return;
  }
  let hadController = Boolean(navigator.serviceWorker.controller);
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) { hadController = true; return; }
    pendingAppReload = true; applyPendingUpdate();
  });
  navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).then(registration => {
    pwaRegistration = registration; checkAppUpdate();
  }).catch(error => { setUpdateStatus('更新機能を登録できませんでした。通信状態を確認してください。'); console.warn(error); });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') checkAppUpdate(); });
  window.addEventListener('pageshow', () => checkAppUpdate());
  window.addEventListener('focus', () => checkAppUpdate());
  window.addEventListener('online', () => checkAppUpdate(true));
}
