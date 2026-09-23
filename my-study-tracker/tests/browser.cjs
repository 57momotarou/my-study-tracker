// Optional browser gate: npm-installed playwright + its Chromium are required.
// STUDY_BASELINE_DIR can point to an extracted older release for the upgrade check.
// STUDY_CHROME_PATH may override the executable. Run: node tests/browser.cjs
const { chromium } = require('playwright');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert/strict');
const root = path.join(__dirname, '..');
const work = fs.mkdtempSync(path.join(os.tmpdir(), 'study-browser-'));
const hosted = path.join(work, 'tracker');
const screenshots = process.env.STUDY_SCREENSHOTS;
function deploy(source) { fs.cpSync(source, hosted, { recursive: true }); }
const types = { '.js': 'text/javascript', '.html': 'text/html', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
const server = http.createServer((request, response) => {
  const name = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
  let filename = path.join(work, name);
  if (!filename.startsWith(work + path.sep)) { response.writeHead(403).end(); return; }
  if (name.endsWith('/')) filename = path.join(filename, 'index.html');
  try { response.writeHead(200, { 'Content-Type': types[path.extname(filename)] || 'text/plain', 'Cache-Control': 'no-store' }); response.end(fs.readFileSync(filename)); }
  catch { response.writeHead(404).end(); }
});
let browser;
let checks = 0;
const pass = text => { checks++; console.log('PASS', text); };
const waitFor = async (page, expression) => page.waitForFunction(expression, null, { timeout: 15000 });

(async () => {
  deploy(process.env.STUDY_BASELINE_DIR || root);
  if (process.env.STUDY_FONT_DIR) fs.cpSync(process.env.STUDY_FONT_DIR,path.join(work,'qa-fonts'),{recursive:true});
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = `http://127.0.0.1:${server.address().port}/tracker/`;
  browser = await chromium.launch({ headless: true, executablePath: process.env.STUDY_CHROME_PATH || undefined,
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--no-zygote', '--single-process'] });
  const context = await browser.newContext({ viewport: {width:390,height:844}, deviceScaleFactor:1, isMobile:true, hasTouch:true, locale:'ja-JP', timezoneId:'Asia/Tokyo', acceptDownloads:true });
  const page = await context.newPage();
  if (process.env.STUDY_FONT_DIR) await context.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => {
      for (const weight of [400,500,700]) {
        const link=document.createElement('link');link.rel='stylesheet';link.href=`/qa-fonts/${weight}.css`;document.head.appendChild(link);
      }
    });
  });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(address);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await waitFor(page, '!!navigator.serviceWorker.controller');
  await page.evaluate(() => {
    state.enrollments = {1:['CS101','CS102','SD101E'],2:['CS101','SD101E']}; state.currentSemesterId=1;
    state.progress={CS101:12}; saveState();
    return caches.open('unrelated-app-cache');
  });
  await page.reload();
  await waitFor(page, 'getCompletedLessons("CS101") === 12');
  if (process.env.STUDY_BASELINE_DIR) {
    deploy(root);
    await page.evaluate(async () => { const registration=await navigator.serviceWorker.getRegistration(); await registration.update(); });
    await waitFor(page, 'typeof APP_VERSION !== "undefined" && APP_VERSION === "67"');
    pass('旧v66からv67へ自動再読み込みし、既存の章数を保持');
  }
  assert.equal(await page.evaluate(() => getCompletedLessons('CS101')), 12);
  assert.equal(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app-cache')), true);
  await page.locator('[data-page="progress"]').click();
  await page.locator('[data-checks-code="CS101"] summary').click();
  assert.equal(await page.locator('[data-code="CS101"][data-assignment="1"]').isChecked(), false);
  await page.locator('[data-code="CS101"][data-assignment="1"]').check();
  await page.locator('[data-exam="CS101"]').check();
  await page.locator('[data-progress-view="grades"]').click();
  await page.locator('[data-grade="CS101"]').selectOption('A');
  await page.locator('[data-grade="CS102"]').selectOption('F');
  assert.equal(await page.evaluate(() => getGradeSummary(1).gpa), 2);
  await page.reload(); await page.locator('[data-page="progress"]').click();
  await page.locator('[data-progress-view="grades"]').click();
  assert.equal(await page.locator('[data-grade="CS101"]').inputValue(), 'A');
  assert.deepEqual(await page.evaluate(() => getStudyRecord(1,'CS101')), { grade:'A', assignments:[1], examTaken:true });
  pass('成績・課題・期末を操作して再起動後も保持');
  if (screenshots) { fs.mkdirSync(screenshots,{recursive:true}); await page.evaluate(()=>document.fonts.ready); await page.screenshot({path:path.join(screenshots,'grades-mobile.png'),fullPage:true}); }

  await page.evaluate(() => {
    const original=Storage.prototype.setItem;
    Storage.prototype.setItem=function(key,value){ if(key==='cp-records-v1'){Storage.prototype.setItem=original;throw new DOMException('Full','QuotaExceededError');} return original.call(this,key,value); };
  });
  await page.locator('[data-grade="CS101"]').selectOption('B');
  assert.equal(await page.locator('[data-grade="CS101"]').inputValue(), 'A');
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('cp-records-v1'))[1].CS101.grade), 'A');
  pass('実ブラウザーでも保存失敗時に入力・保存値を復旧');

  await page.locator('[data-page="schedule"]').click();
  await page.locator('#application-title').fill('申請 <script>unsafe</script> 🙂');
  const day=await page.evaluate(() => formatLocalDate(new Date()));
  await page.locator('[name="date"]').fill(day);
  await page.locator('[name="time"]').fill('12:00');
  await page.locator('#application-notes').fill('確認済み\nメモ, セミコロン;');
  await page.locator('#application-form button[type="submit"]').click();
  await waitFor(page, 'state.applications.length === 1');
  assert.equal(await page.locator('#application-list script').count(), 0);
  assert.match(await page.locator('#application-list').textContent(), /<script>unsafe<\/script>/);
  await page.locator('[data-application-edit]').click();
  await page.locator('#application-title').fill('ゼミ申請');
  await page.locator('[name="allDay"]').check();
  await page.locator('#application-form button[type="submit"]').click();
  assert.equal(await page.evaluate(() => state.applications[0].allDay), true);
  const downloadPromise=page.waitForEvent('download');
  await page.locator('#calendar-export-btn').click();
  const download=await downloadPromise;
  const calendar=fs.readFileSync(await download.path(),'utf8');
  assert(calendar.includes('SUMMARY:ゼミ申請'));
  assert(calendar.includes('DTSTART;VALUE=DATE:'+day.replaceAll('-','')));
  await page.locator('[data-application-done]').check();
  assert.equal(await page.evaluate(() => state.applications[0].done), true);
  pass('申請の登録・編集・対応済みとICSダウンロード');
  if (screenshots) { await page.evaluate(()=>{document.getElementById('storage-warning')?.remove();window.scrollTo(0,0);return document.fonts.ready;}); await page.screenshot({path:path.join(screenshots,'schedule-mobile.png'),fullPage:true}); }

  await page.locator('#header-settings-btn').click();
  await page.locator('[data-settings-tab="data"]').click();
  const backupPromise=page.waitForEvent('download');
  await page.locator('#data-export-btn').click();
  const backup=JSON.parse(fs.readFileSync(await (await backupPromise).path(),'utf8'));
  assert.equal(backup.version,2);assert.equal(backup.data.records[1].CS101.grade,'A');assert.equal(backup.data.applications.length,1);
  const upload=payload=>page.locator('#data-import-input').setInputFiles({name:'backup.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(payload))});
  const old={format:'my-study-tracker-backup',version:1,data:{enrollments:{1:['CS101']},progress:{CS101:20},currentSemesterId:1}};
  page.once('dialog',dialog=>dialog.dismiss()); await upload(old);
  await waitFor(page, '!dataTransferInProgress');
  assert.equal(await page.evaluate(() => getCompletedLessons('CS101')),12);
  await upload({...backup, data:{...backup.data,records:{1:{CS101:{grade:'Z'}}}}});
  await waitFor(page, '!dataTransferInProgress');
  assert.equal(await page.evaluate(() => getStudyRecord(1,'CS101').grade),'A');
  page.once('dialog',dialog=>dialog.accept()); await upload(old);
  await waitFor(page, '!dataTransferInProgress');
  assert.equal(await page.evaluate(() => getCompletedLessons('CS101')),20);
  assert.deepEqual(await page.evaluate(() => state.records),{});
  page.once('dialog',dialog=>dialog.accept()); await upload(backup);
  await waitFor(page, '!dataTransferInProgress');
  assert.equal(await page.evaluate(() => getStudyRecord(1,'CS101').grade),'A');
  pass('バックアップの出力・旧版復元・取消・不正ファイル拒否');

  // 模擬v68は一時配信先だけに作成。配布するv67のソースは変更しない。
  await page.locator('[data-page="schedule"]').click();
  await page.locator('#application-title').fill('編集中の予定');
  fs.writeFileSync(path.join(hosted,'sw.js'),fs.readFileSync(path.join(hosted,'sw.js'),'utf8').replace('v67','v68'));
  fs.writeFileSync(path.join(hosted,'pwa-update.js'),fs.readFileSync(path.join(hosted,'pwa-update.js'),'utf8').replace("APP_VERSION = '67'","APP_VERSION = '68'"));
  await page.evaluate(() => { lastUpdateCheck=0; document.dispatchEvent(new Event('visibilitychange')); });
  await waitFor(page, 'pendingAppReload');
  assert.equal(await page.locator('#application-title').inputValue(),'編集中の予定');
  assert.equal(await page.evaluate(() => APP_VERSION),'67');
  await page.locator('#application-cancel').click();
  await waitFor(page, 'APP_VERSION === "68"');
  assert.equal(await page.evaluate(() => getStudyRecord(1,'CS101').grade),'A');
  assert.equal(await page.evaluate(async () => (await caches.keys()).includes('unrelated-app-cache')),true);
  pass('画面復帰時に更新を取得し、編集中は保留・クリア後に自動適用');
  await context.setOffline(true); await page.reload();
  await page.locator('[data-page="progress"]').click();
  await page.locator('[data-progress-view="grades"]').click();
  assert.equal(await page.locator('[data-grade="CS101"]').inputValue(),'A');
  pass('オフライン再起動で新機能の画面・記録を保持');
  await context.setOffline(false);
  await page.reload();
  await page.evaluate(()=>document.fonts.ready);
  for (const width of [320,390,1280]) {
    await page.setViewportSize({width,height:844});
    for (const view of ['today','progress','schedule','badges','settings']) {
      await page.evaluate(view=>activatePage(view),view);
      await page.evaluate(()=>document.fonts.ready);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= window.innerWidth),`${view} at ${width}px overflow`);
    }
  }
  pass('320/390/1280pxで各画面に横方向のはみ出しなし');
  if (screenshots) {
    await page.evaluate(()=>{activatePage('progress');setProgressView('grades');});
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(screenshots,'grades-desktop.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);
  pass('JavaScriptの実行エラーなし');
  console.log(`${checks} browser checks passed`);
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(async()=>{
  if(browser)await browser.close();server.close();fs.rmSync(work,{recursive:true,force:true});
});
