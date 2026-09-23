// Run: TZ=Asia/Tokyo node tests/regression.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.join(__dirname, '..');
let now = new Date('2026-09-17T12:00:00+09:00').getTime();
class Clock extends Date { constructor(...args) { super(...(args.length ? args : [now])); } static now() { return now; } }
const storage = new Map();
let failWriteKey = null;
const context = vm.createContext({
  console, Date: Clock, setTimeout, clearTimeout, TextEncoder,
  document: { addEventListener() {} },
  localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => { if (key === failWriteKey) { failWriteKey = null; throw new Error("simulated quota"); } storage.set(key, value); }, removeItem: key => storage.delete(key) },
});
const run = expression => vm.runInContext(expression, context);
for (const name of ['data.js','curriculum.js','attendance.js','study-records.js','calendar-export.js','pwa-update.js','data-transfer.js','app.js']) {
  vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'), context, {filename:name});
}
const json = expression => JSON.parse(JSON.stringify(run(expression)));
let count = 0;
function test(name, fn) { fn(); count++; console.log('PASS', name); }
const deadline = (code,n) => run(`getLessonDeadline(${n},SUBJECT_BY_CODE.get('${code}'),SEMESTERS[1]).toISOString()`);

test('科目コードに重複がなく、バッジ参照が存在する', () => {
  assert.equal(run('ALL_SUBJECTS.length'), run('SUBJECT_BY_CODE.size'));
  assert.equal(run('BADGES.length'), run('new Set(BADGES.map(b=>b.id)).size'));
  for (const badge of json('BADGES')) {
    for (const code of [...(badge.requirements.codes||[]),...(badge.requirements.anyCodeGroups||[]).flat()]) assert.equal(run(`SUBJECT_BY_CODE.has('${code}')`),true);
    for (const id of [...(badge.requirements.prerequisite ? [badge.requirements.prerequisite] : []),...(badge.requirements.prerequisites||[]),...(badge.requirements.prerequisiteAny||[])]) assert.equal(run(`BADGES.some(b=>b.id==='${id}')`),true);
  }
});
test('開講前・廃止予定・当学期の非開講を区別する', () => {
  const available = (code,index) => run(`getSubjectAvailability(SUBJECT_BY_CODE.get('${code}'),SEMESTERS[${index}]).selectable`);
  for (const code of ['BA358E','CHIN104E']) { assert.equal(available(code,1),false); assert.equal(available(code,2),true); }
  for (const code of ['BA303','BA351','GENS111']) { assert.equal(available(code,1),true); assert.equal(available(code,2),false); }
  assert.equal(available('ENGL351E',1),false); assert.equal(available('ENGL351E',2),true);
});
test('科目名・期間・ゼミの単位が写真に一致する', () => {
  assert.equal(run("SUBJECT_BY_CODE.get('BA301').name"),'事業創造詳論');
  assert.equal(run("SUBJECT_BY_CODE.get('TH401E').credits"),2);
  assert.equal(run("SUBJECT_BY_CODE.get('TH401E').type"),'卒業研究');
  for (const code of ['GEHM112','GESS113']) assert.equal(run(`SUBJECT_BY_CODE.get('${code}').term`),'前期');
  assert.equal(run("SUBJECT_BY_CODE.get('GEHM124').term"),'後期');
});
test('秋の締切は祝日・年末年始・金曜の例外を反映する', () => {
  assert.equal(deadline('CS101',1),'2026-10-15T03:00:00.000Z');
  assert.equal(deadline('CS101',12),'2027-01-07T03:00:00.000Z');
  assert.equal(deadline('CS101',15),'2027-01-28T03:00:00.000Z');
  assert.equal(deadline('GEHM101',4),'2026-11-04T03:00:00.000Z');
  assert.equal(deadline('GEHM103',1),'2026-12-04T03:00:00.000Z');
  assert.equal(deadline('GEHM103',2),'2026-12-11T03:00:00.000Z');
  assert.equal(deadline('ENGL101E',12),'2027-01-05T03:00:00.000Z');
  assert.equal(deadline('SD101E',7),'2026-11-17T03:00:00.000Z');
  assert.equal(deadline('SD101E',8),deadline('SD101E',7));
  assert.equal(deadline('SD302E',7),'2027-01-12T03:00:00.000Z');
});
test('一斉開講は開始日の正午から。教養後期は11/17から', () => {
  const available = code => run(`isLessonAvailable(1,SUBJECT_BY_CODE.get('${code}'),SEMESTERS[1])`);
  now = new Date('2026-10-02T11:59:59+09:00').getTime(); assert.equal(available('CS101'),false);
  now += 1000; assert.equal(available('CS101'),true); assert.equal(available('GEHM103'),false);
  now = new Date('2026-11-17T12:00:00+09:00').getTime(); assert.equal(available('GEHM103'),true);
  assert.equal(run("getLessonStart(2,SUBJECT_BY_CODE.get('BA151'),SEMESTERS[1]).toISOString()"),'2026-10-08T03:00:00.000Z');
});
test('履修中の区分に対応した期末だけを表示する', () => {
  run("state.currentSemesterId=2; state.enrollments={2:['SD101E','ENGL101E']}");
  assert.deepEqual(json('getRelevantExams(SEMESTERS[1]).map(e=>e.date)'),['2026-11-24T12:00:00+09:00','2027-02-02T12:00:00+09:00']);
});
test('全必修は28単位であり、卒業計画は未達成', () => {
  const plan=json('getGraduationPlan(MC_REQUIRED_CODES)');
  assert.equal(plan.total,28); assert.equal(plan.meetsPlan,false); assert.equal(plan.missing.length,0);
});
test('124単位あっても専門だけでは卒業計画達成にならない', () => {
  const plan=json("getGraduationPlan(ALL_SUBJECTS.filter(s=>s.category==='専門').map(s=>s.code))");
  assert(plan.total>=124); assert.equal(plan.meetsPlan,false); assert.equal(plan.counted,88);
});
test('教養による外国語選択の代替は二重計上しない', () => {
  run(`globalThis.sampleCodes = [...new Set([...MC_REQUIRED_CODES,
    ...ALL_SUBJECTS.filter(s=>s.category==='専門'&&!MC_REQUIRED_CODES.includes(s.code)).slice(0,35).map(s=>s.code),
    ...ALL_SUBJECTS.filter(s=>s.category==='教養'&&!MC_REQUIRED_CODES.includes(s.code)).slice(0,26).map(s=>s.code)])]`);
  const plan=json('getGraduationPlan(sampleCodes)');
  assert.equal(plan.totals['専門'],88); assert.equal(plan.totals['教養'],28); assert.equal(plan.totals['外国語'],8);
  assert.equal(plan.total,124); assert.equal(plan.liberalReplacement,4); assert.equal(plan.common,26); assert.equal(plan.counted,124); assert.equal(plan.meetsPlan,true);
  assert.equal(run('getGraduationPlan([...sampleCodes,...sampleCodes]).total'),124);
});
test('必修漏れがあれば合計・区分が足りても未達成', () => {
  run("globalThis.missingCodes=sampleCodes.filter(c=>c!=='CS101'); missingCodes.push(ALL_SUBJECTS.find(s=>s.category==='専門'&&!sampleCodes.includes(s.code)).code)");
  assert.equal(run('getGraduationPlan(missingCodes).counted'),124);
  assert.equal(run('getGraduationPlan(missingCodes).meetsPlan'),false);
});
test('共通へ割り当てる外国語は8単位が上限', () => {
  const plan=json("getGraduationPlan(ALL_SUBJECTS.filter(s=>s.category==='外国語').map(s=>s.code))");
  assert.equal(plan.common,8); assert.equal(plan.counted,20);
});
test('シルバーレベル・ビジネス基礎Ⅱ削除・マーケティング必要科目を修正', () => {
  for (const id of ['badge-tech1-bronze','badge-math-bronze','badge-biz-bronze','badge-communication']) assert.equal(run(`BADGES.find(b=>b.id==='${id}').level`),'silver');
  assert.equal(run("BADGES.some(b=>b.name==='ビジネス基礎Ⅱ')"),false);
  assert.deepEqual(json("BADGES.find(b=>b.id==='badge-dm-gold').requirements.codes"),['BA306','BA358E','BA352']);
});
test('教養スタートアップは各分野2単位必要', () => {
  const check = codes => run(`getBadgePlan(BADGES.find(b=>b.id==='badge-startup-kyoyo'),new Set(${JSON.stringify(codes)})).satisfied`);
  assert.equal(check(['SD116','GENS101','GEHM101','GESS101']),false);
  assert.equal(check(['SD116','SD103','GENS101','GENS102','GEHM101','GEHM102','GESS101','GESS102']),true);
});
test('中国語は基礎Ⅰ/Ⅱまたは既存の旧科目で計画できる', () => {
  const check = codes => run(`getBadgePlan(BADGES.find(b=>b.id==='badge-chinese-bronze'),new Set(${JSON.stringify(codes)})).satisfied`);
  assert.equal(check(['CHIN103E']),false); assert.equal(check(['CHIN103E','CHIN104E']),true); assert.equal(check(['CHIN101E','CHIN202E']),true);
});
test('プラチナはゼミ科目の選択だけで認定しない', () => {
  assert.equal(run("BADGES.filter(b=>b.level==='platinum').some(b=>getBadgePlan(b,new Set(ALL_SUBJECTS.map(s=>s.code))).satisfied)"),false);
});
test('従来のバックアップと廃止科目の記録を引き継ぐ', () => {
  const backup={format:'my-study-tracker-backup',version:1,data:{enrollments:{1:['CHIN101E','CHIN202E','BA303','GENS111'],2:['BA101']},progress:{CHIN101E:12,CHIN202E:60,BA303:24,GENS111:20},currentSemesterId:2}};
  assert.deepEqual(json(`parseBackupPayload(${JSON.stringify(backup)})`),{...backup.data,records:{},applications:[]});
  storage.set('cp-enrollments',JSON.stringify(backup.data.enrollments)); storage.set('cp-progress',JSON.stringify(backup.data.progress)); storage.set('cp-current-sem','2'); storage.set('cp-migrated-v1','1');
  run('loadState()');
  assert.deepEqual(json('state.enrollments'),backup.data.enrollments); assert.deepEqual(json('state.progress'),backup.data.progress);
});
test('HTMLの読み込み順とサービスワーカーの対象ファイルがそろう', () => {
  const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
  const scripts=[...html.matchAll(/<script src="\.\/(.*?)"/g)].map(m=>m[1]);
  assert(scripts.indexOf('curriculum.js')>scripts.indexOf('data.js'));
  assert(scripts.indexOf('student-guide.js')<scripts.indexOf('app.js'));
  for(const script of scripts) assert(fs.existsSync(path.join(root,script)));
  const sw=fs.readFileSync(path.join(root,'sw.js'),'utf8');
  for(const asset of [...sw.matchAll(/'\.\/(.*?)'/g)].map(m=>m[1]).filter(Boolean)) assert(fs.existsSync(path.join(root,asset)),asset);
  for(const script of scripts) assert(sw.includes(`'./${script}'`),script);
});
test('GPAは単位数で加重し、Fを含め、K・Pを除外する', () => {
  run("state.records={1:{CS101:{grade:'A',assignments:[],examTaken:false},CS102:{grade:'F',assignments:[],examTaken:false},CS103:{grade:'K',assignments:[],examTaken:false},CS153:{grade:'P',assignments:[],examTaken:false}}}");
  const result = json('getGradeSummary(1)');
  assert.equal(result.gpa, 2); assert.equal(result.gpaCredits, 4);
  assert.equal(result.earnedCredits, 4); assert.equal(result.recognizedCredits, 2);
  run("state.records[1].SD101E={grade:'B',assignments:[],examTaken:false}");
  assert.equal(run('getGradeSummary(1).gpa'), 11/5);
});
test('未登録・K・PだけならGPAは未計算', () => {
  run("state.records={1:{CS101:{grade:'P',assignments:[],examTaken:false},CS102:{grade:'K',assignments:[],examTaken:false}}}");
  assert.equal(run('getGradeSummary().gpa'), null);
  assert.equal(run('getGradeSummary().earnedCredits'), 2);
  assert.equal(run('getGraduationPlan(getGradeSummary().passedCodes).counted'), 0);
});
test('再履修の修得単位は二重計上せず、履修予定では増えない', () => {
  run("state.enrollments={1:['CS101','CS102'],2:['CS101']};state.records={1:{CS101:{grade:'A',assignments:[],examTaken:false}},2:{CS101:{grade:'B',assignments:[],examTaken:false}}}");
  assert.equal(run('getGradeSummary().earnedCredits'), 2);
  assert.equal(run('getGradeSummary().gpa'), 3.5);
  assert.equal(run('getGradeSummary().repeated'), true);
  run('state.enrollments={}');
  assert.equal(run('getRecordedSubjects(1).length'), 1);
  assert.equal(run('getGradeSummary().earnedCredits'), 2);
});
test('動画・課題・期末は独立し、提出記録は学期ごとに保持', () => {
  run("state.records={};state.progress={CS101:60};state.enrollments={1:['CS101'],2:['CS101']};saveState()");
  assert.equal(run("isLessonRecorded(1,'CS101',1)"), false);
  assert.equal(run("getStudyRecord(1,'CS101').examTaken"), false);
  assert.equal(run("setAssignment(1,'CS101',1,true)"), true);
  assert.equal(run("isLessonRecorded(1,'CS101',1)"), true);
  assert.equal(run("isLessonRecorded(2,'CS101',1)"), false);
  run("changeStudyRecord(1,'CS101',{examTaken:true});state.progress.CS101=0;saveState()");
  assert.deepEqual(json("getStudyRecord(1,'CS101').assignments"), [1]);
  assert.equal(run("getStudyRecord(1,'CS101').examTaken"), true);
  assert.equal(run("getAttendanceSummary(1,SUBJECT_BY_CODE.get('CS101')).count"), 0);
});
test('未開講の動画・課題は正午前に操作できない', () => {
  now = new Date('2026-10-02T11:59:59+09:00').getTime();
  run("state.progress={};state.records={};saveState();toggleLesson('CS101',1,2)");
  assert.equal(run("getCompletedLessons('CS101')"), 0);
  assert.equal(run("setAssignment(2,'CS101',1,true)"), false);
  now += 1000;
  run('rerenderAfterProgressChange=()=>{}');
  run("toggleLesson('CS101',1,2)");
  assert.equal(run("getCompletedLessons('CS101')"), 4);
  assert.equal(run("setAssignment(2,'CS101',1,true)"), true);
  assert.equal(run("isLessonRecorded(2,'CS101',1)"), true);
});
test('出席の目安は動画と課題の共通部分だけ数える', () => {
  run("state.progress={CS101:40};state.records={2:{CS101:{grade:'',assignments:[1,2,3,4,5,6,7,8,9,11],examTaken:false}}}");
  assert.deepEqual(json("getAttendanceSummary(2,SUBJECT_BY_CODE.get('CS101'))"), {count:9,required:10});
  assert.equal(run("getAttendanceSummary(2,SUBJECT_BY_CODE.get('SD101E')).required"), 6);
});
test('version 2のバックアップと再起動で全記録を保持する', () => {
  run("state.applications=[{id:'check-1',semesterId:2,title:'申請',date:'2027-01-01',allDay:false,time:'12:00',notes:'備考',done:false,revision:0}];state.currentSemesterId=2;saveState()");
  const previous = json('snapshotStudyState()');
  assert.deepEqual(json(`parseBackupPayload({format:BACKUP_FORMAT,version:2,data:${JSON.stringify(previous)}})`), previous);
  run('loadState()'); assert.deepEqual(json('snapshotStudyState()'), previous);
});
test('不正な新形式や未対応版は復元前に拒否する', () => {
  const base = json('snapshotStudyState()');
  for (const data of [{...base,records:null},{...base,applications:{}},
    {...base,enrollments:{1:'CS101'}},{...base,progress:{CS101:-1}},
    {...base,records:{2:{CS101:{grade:'S',assignments:[],examTaken:false}}}},
    {...base,records:{2:{CS101:{grade:'A',assignments:[99],examTaken:false}}}},
    {...base,applications:[{...base.applications[0],date:'2027-02-30'}]},
    {...base,applications:[{...base.applications[0],time:'24:00'}]},
    {...base,applications:[base.applications[0],base.applications[0]]}]) {
    assert.throws(() => run(`parseBackupPayload({format:BACKUP_FORMAT,version:2,data:${JSON.stringify(data)}})`));
  }
  assert.throws(() => run('parseBackupPayload({format:BACKUP_FORMAT,version:3,data:{}})'));
  assert.deepEqual(json('snapshotStudyState()'), base);
});
test('保存途中の失敗で既存の各キーとメモリーを元に戻す', () => {
  run('saveState()'); const previous = json('snapshotStudyState()'); const stored = [...storage.entries()];
  failWriteKey = 'cp-records-v1';
  run("state.enrollments={1:['CS102']};state.progress={CS102:8};state.records={};state.applications=[]");
  assert.equal(run('saveState()'), false);
  assert.deepEqual([...storage.entries()], stored);
  assert.deepEqual(json('snapshotStudyState()'), previous);
  run('loadState()'); assert.deepEqual(json('snapshotStudyState()'), previous);
});
test('保存中断のジャーナルを次の起動で回復する', () => {
  const previous = json('snapshotStudyState()');
  const values = Object.fromEntries(Object.values(json('KEYS')).map(key => [key, storage.get(key) ?? null]));
  storage.set('cp-save-journal-v1', JSON.stringify(values));
  storage.set('cp-progress','{}');storage.set('cp-records-v1','{}');
  run('loadState()'); assert.deepEqual(json('snapshotStudyState()'), previous);
  assert.equal(storage.has('cp-save-journal-v1'), false);
});
test('旧コマ数から章数への変換とマーカーを一度だけ保存する', () => {
  storage.delete('cp-migrated-v1'); storage.set('cp-progress','{"CS101":3}');
  run('loadState()'); assert.equal(run("getCompletedLessons('CS101')"), 12);
  run('loadState()'); assert.equal(run("getCompletedLessons('CS101')"), 12);
  assert.equal(storage.get('cp-migrated-v1'), '1');
});
test('秋の確定締切・期末だけを日本時間で出力する', () => {
  run("state.enrollments={2:['CS101','SD101E'],3:['CS101']};state.applications=[]");
  const current = json('getCalendarEvents(2)');
  assert.equal(current.events.length, 25); // 15+8授業、2区分の期末
  assert.equal(current.events.find(e => e.uid==='lesson-2-CS101-1@my-study-tracker').start, '2026-10-15T03:00:00.000Z');
  const future = json('getCalendarEvents(3)');
  assert.equal(future.events.length, 0); assert.equal(future.skipped, 15);
  run("state.enrollments[1]=['CS101']");
  assert.equal(run("getCalendarEvents(1,{exams:true}).events.length"), 0);
});
test('申請の時刻は端末のタイムゾーンに依存せず日本時間', () => {
  run("state.applications=[{id:'time-1',semesterId:2,title:'申請',date:'2027-01-01',allDay:false,time:'00:30',notes:'',done:false,revision:0}]");
  assert.equal(json('getCalendarEvents(2,{applications:true}).events')[0].start, '2026-12-31T15:30:00.000Z');
});
test('終日は排他的な翌日まで、年越し・うるう日に対応', () => {
  for (const [date, next] of [['2026-12-31','20270101'],['2028-02-29','20280301']]) {
    const ics = run(`buildCalendarICS([{uid:'all-day',title:'締切',allDay:true,start:'${date}'}])`);
    assert(ics.includes('DTSTART;VALUE=DATE:'+date.replaceAll('-','')));
    assert(ics.includes('DTEND;VALUE=DATE:'+next));
  }
  assert.equal(run("validCalendarDate('2027-02-29')"), false);
});
test('ICSのUIDは再出力・予定編集でも変わらない', () => {
  const before = json('getCalendarEvents(2).events.map(e=>e.uid)');
  run("state.applications[0].title='変更';state.applications[0].date='2027-02-02';state.applications[0].revision++");
  assert.deepEqual(json('getCalendarEvents(2).events.map(e=>e.uid)'), before);
  assert.equal(new Set(before).size, before.length);
});
test('ICSの特殊文字・改行をエスケープし、UTF-8の75バイトで折り返す', () => {
  const title='日本語の長い予定🙂'.repeat(20)+'\\;,\n新しい行';
  const ics=run(`buildCalendarICS([{uid:'escape-test',title:${JSON.stringify(title)},description:'説明',start:new Date('2026-10-01T12:00:00+09:00')}])`);
  for (const line of ics.split('\r\n')) assert(Buffer.byteLength(line,'utf8')<=75);
  const unfolded=ics.replace(/\r\n /g,'');
  assert(unfolded.includes('\\\\\\;\\,\\n新しい行'));
  assert(unfolded.includes('DTSTART:20261001T030000Z'));
  assert(!unfolded.includes('\ufffd'));
});
test('新形式は旧版の復元処理でも未対応として拒否される', () => {
  // 古い版の版チェックは1超を拒否。成果物では原本に依存しないため、条件自体を確認。
  assert.equal(run('BACKUP_VERSION'), 2);
  const oldCode = fs.readFileSync(path.join(root,'data-transfer.js'),'utf8').replace('const BACKUP_VERSION = 2;', 'const BACKUP_VERSION = 1;');
  const oldContext=vm.createContext({});vm.runInContext(oldCode,oldContext);
  assert.throws(()=>vm.runInContext("parseBackupPayload({format:'my-study-tracker-backup',version:2,data:{}})",oldContext),/最新版/);
});
console.log(`${count} regression checks passed`);
