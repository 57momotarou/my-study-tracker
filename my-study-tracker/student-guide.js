// 写真の記載を要約。ここにある年月・規程は資料時点のもの。
const STUDENT_GUIDE = [
  { title: '今回の科目・バッジデータの修正', tags: '追加 廃止 中国語 開講', source: 'IMG_9283・9284・9285・9286・9288', html: `
    <ul>
      <li><b>追加：</b>BA358E「デジタルマーケティング実践」、CHIN104E「中国語基礎Ⅱ」。いずれも2027年春に開講予定。</li>
      <li><b>名称：</b>BA301を「事業創造詳論」、GEHM112を「西洋建築 歴史の旅」に修正。</li>
      <li><b>開講期間：</b>GEHM112・GESS113は前期、GEHM124は後期。</li>
      <li><b>単位・区分：</b>ゼミナールは卒業研究・必修2単位。8回の教養科目（地理学入門・脳科学とテクノロジー・行動経済学入門）は資料の授業回数と単位の対応に合わせ1単位に修正。</li>
      <li><b>2027年春から廃止予定：</b>BA303「eコマース実践論」、BA351「ネットマーケティング論」、GENS111「AI（人工知能）入門」。過去の記録は保持。</li>
      <li><b>2026年秋は開講予定なし：</b>ENGL351E「上級英語Ⅱ-A」。</li>
      <li>中国語の旧科目は記録保持用。新規選択は現在の開講予定表にある基礎Ⅰ・Ⅱを使用。</li>
      <li>バッジのレベル・前提条件を修正。資料にない「ビジネス基礎Ⅱ」を除き、日本の伝統文化・資産形成・自然科学基礎を追加。デジタルマーケティングの必要科目はBA351からBA358Eへ更新。</li>
    </ul>
    <p>科目表は2026年6月19日、バッジ表は2026年8月1日時点。将来の開講は予定です。専門科目ごとの一斉／順次方式は今回の科目表だけでは確定できないため、既存の設定を引き継いでいます。新科目BA358Eの方式は未確認です。</p>
    <p>MC表にありCP表にない科目：BA253・BA306・BA356E・BA357E・BA358E・GEHM107・GENS116・GESS105・GESS116。アプリの履修計画・バッジ条件はMCを基準にしています。</p>` },
  { title: '出席・課題・単位修得', tags: '動画 小テスト レポート ディベート 期末 遅刻 受験', source: 'IMG_9289・9290', html: `
    <ul>
      <li>標準は2単位科目が15回、1単位科目が8回で、その後に期末試験。</li>
      <li>1回の授業は4章、1章15〜20分程度。動画の視聴に加えて、その回の課題を実施して出席扱いになります。</li>
      <li>課題には小テスト、レポート、ディベート等があります。小テストは標準8問、最大5回まで。課題の種類や回数は科目の指示を確認。</li>
      <li>レポートはWord等で提出し、パソコンが必要。科目によって動画提出もあります。</li>
      <li>出席認定期間を過ぎた受講は遅刻出席。順次開講は原則週1回、一斉開講は学期初めにまとめて公開。</li>
      <li>締切は原則、専門が木曜12時、教養・外国語が火曜12時。祝日・長期休暇・科目による例外があります。</li>
      <li>期末試験の受験条件は3分の2以上の出席。期末試験を受けない場合は単位を修得できません。</li>
    </ul>
    <p>「進捗」の動画ボタンは視聴記録です。「課題・期末」は学期ごとに別々に記録できます。動画だけでは出席完了にしません。Cloud Campusの出席・提出状況と照らし合わせて使ってください。</p>` },
  { title: '2026年度秋学期の日程', tags: '締切 10月 11月 12月 1月 2月 正午 祝日 冬休み', source: 'IMG_9287', html: `
    <p>開始・締切はすべて日本時間12:00。各回の日程は「予定」「進捗」に反映しています。</p>
    <div class="guide-table-wrap"><table><caption>区分別の開始と期末締切</caption><thead><tr><th>区分</th><th>授業開始</th><th>期末締切</th></tr></thead><tbody>
      <tr><td>スタディスキル入門</td><td>10/1</td><td>11/24</td></tr>
      <tr><td>教養前期・教養演習</td><td>10/2</td><td>12/8</td></tr>
      <tr><td>教養後期</td><td>11/17</td><td>2027/2/2</td></tr>
      <tr><td>外国語・アカデミックライティング</td><td>10/2</td><td>2027/2/2</td></tr>
      <tr><td>専門</td><td>10/2</td><td>2027/2/4</td></tr>
    </tbody></table></div>
    <ul>
      <li>スタディスキル入門の第7・8回は、両方とも11/17締切。</li>
      <li>11/3の祝日に伴い、該当の火曜締切は11/4へ移動。</li>
      <li>教養後期の第1・2回締切は、12/4・12/11の金曜日。</li>
      <li>冬休みに伴う延長を反映。12/26〜1/3はQ&amp;A・ディベート等への教員・TAの返信はありません。</li>
      <li>成績発表は2027/3/1。</li>
    </ul>
    <p>2027年度以降の各回日程は未提供のため、アプリでは概算表示です。</p>` },
  { title: '成績評価とGPA', tags: 'A B C D F K P 点数 グレード', source: 'IMG_9290', html: `
    <p>各回の課題と期末試験を、シラバスの評価配分に従って100点満点で評価します。</p>
    <div class="guide-table-wrap"><table><thead><tr><th>評点・区分</th><th>評価</th><th>GP</th></tr></thead><tbody>
      <tr><td>90〜100点</td><td>A</td><td>4</td></tr><tr><td>80〜90点未満</td><td>B</td><td>3</td></tr>
      <tr><td>70〜80点未満</td><td>C</td><td>2</td></tr><tr><td>60〜70点未満</td><td>D</td><td>1</td></tr>
      <tr><td>60点未満・不合格</td><td>F</td><td>0</td></tr><tr><td>履修放棄（申請）</td><td>K</td><td>対象外</td></tr><tr><td>単位認定（申請）</td><td>P</td><td>対象外</td></tr>
    </tbody></table></div>
    <p>GPA＝各科目の「単位数×GP」の合計 ÷ 履修単位数の合計。分母にはFを含め、K・Pは含めません。</p>
    <p>「進捗」→「成績・単位」で評価を登録できます。アプリの参考GPAは登録した全履修回を集計し、修得単位は科目の重複を除きます。再履修・認定単位の正式な扱いは大学で確認してください。</p>` },
  { title: 'MC・CPカリキュラムの違い', tags: '移行 入学年度 コース プログラム 2028 廃止', source: 'IMG_9293・9294・9297', html: `
    <ul>
      <li><b>MC：</b>2024年度春以降の入学者。複数の専門分野を組み合わせ、小さな学修成果をマイクロクレデンシャルで証明する仕組み。</li>
      <li><b>CP→MC：</b>2023年度以前の入学者で、所定の申請によりMCへ移行した人。</li>
      <li><b>CP：</b>2023年度秋までの入学者で、従来のコース・プログラムを継続する人。3コース・8プログラムから選択。</li>
      <li>どちらも取得する学位は学士（IT総合学）。CPはプログラムごとに必修の専門科目が異なります。</li>
      <li>CPのITコミュニケーションプログラムでは、科目表の注記で指定された教養科目等を、12単位を上限に専門選択へ算入できる特例があります。このアプリのMC集計には適用していません。</li>
      <li>CPの継続で2027年度秋の終了までに卒業できなかった場合、2028年度春からMCが自動適用されます。</li>
      <li>CP→MC移行時、2019年度以前に廃止された科目は卒業要件の単位に算入されません。成績証明書には要件外科目として記載。該当科目は元資料の一覧で確認。</li>
    </ul>
    <p>MCの組み合わせ例：ソフトウェア＋管理、AI＋起業、経営＋セキュリティ＋ネットワーク。進路に合わせて履修計画を組めます。</p>` },
  { title: '卒業要件・必要単位', tags: '124 62 24 12 共通 必修 選択 卒業研究 編入', source: 'IMG_9296・9301', html: `
    <div class="guide-table-wrap"><table><caption>MC / CP→MC：124単位の内訳</caption><thead><tr><th>区分</th><th>単位</th><th>内訳</th></tr></thead><tbody>
      <tr><td>専門</td><td>62</td><td>専門基礎の必修16＋選択44＋卒業研究2</td></tr>
      <tr><td>教養</td><td>24</td><td>必修2＋選択22</td></tr>
      <tr><td>外国語</td><td>12</td><td>必修8＋選択4</td></tr>
      <tr><td>共通</td><td>26</td><td>専門・教養・外国語の超過分</td></tr>
    </tbody></table></div>
    <ul>
      <li>外国語の選択4単位は、教養の選択科目で代替できます。共通区分へ回せる外国語は8単位まで。</li>
      <li>MCの専門必修8科目：ITのための基礎知識、インターネット入門、データサイエンス入門、Web入門、情報セキュリティ入門、プロジェクトマネジメント入門、企業経営入門、デジタル技術と情報化社会。これら16単位でIT総合学基礎の対象。</li>
      <li>CPでは専門の必修が卒業研究2単位を含む16単位、専門選択は46単位。合計62単位は同じです。</li>
      <li>1年次入学の通常の卒業要件は在学4年以上、合計124単位以上。最長在学8年。各学期の最低履修は8単位、年間の上限は45単位。</li>
    </ul>
    <p>編入・認定単位・早期卒業等は個別条件があります。履修計画の集計だけで卒業の可否を判断せず、大学の成績・要件と確認してください。</p>` },
  { title: '卒業研究・ゼミナールのエントリー', tags: '100単位 4年次 スタディスキル実践 必修 シルバー', source: 'IMG_9297・9288', html: `
    <p>希望ゼミナールの開講学期の開始時点で、条件を満たす見込みが必要です。</p>
    <ul>
      <li>原則4年次。早期卒業が認められている場合のみ3年次も可。</li>
      <li>卒業要件単位を100単位以上修得。</li>
      <li>教養「スタディスキル実践」を修得。</li>
      <li><b>MC：</b>IT総合学基礎と希望ゼミが指定するマイクロクレデンシャルを取得し、担当教員指定科目を修得。</li>
      <li><b>CP：</b>希望するコース・プログラムの専門必修と、担当教員指定科目を修得。</li>
      <li>MCの「ゼミナール（IT総合学）」は、シルバーバッジの指定なし。担当教員指定科目に代えて専門応用から4単位以上の修得が必要。</li>
    </ul>
    <p>教員指定科目はエントリー開始時のCloud Campusのお知らせで確認。チェックリストの★も教員指定科目を表します。</p>
    <p>ゼミへのエントリー条件と、卒業研究のプラチナバッジ取得条件は別です。</p>` },
  { title: 'マイクロクレデンシャルとオープンバッジ', tags: 'ブロンズ シルバー ゴールド プラチナ MDASH 証明', source: 'IMG_9288・9294・9298', html: `
    <ul>
      <li>対象科目の合格等の条件を満たすと、専門分野の学修成果を示すマイクロクレデンシャルと、それを証明するオープンバッジの対象になります。</li>
      <li>バッジはSNS、メール署名、履歴書等でスキルを示すために利用できます。</li>
      <li>専門ではIT総合学基礎から、テクノロジー・数学・ビジネスの基礎へ進み、専門領域のゴールド、卒業研究のプラチナにつながります。</li>
      <li>教養・外国語のバッジもあります。条件一覧は下部の「バッジ」で確認できます。</li>
      <li>AIリテラシーレベル・AI応用基礎レベルは、文部科学省の数理・データサイエンス・AI教育プログラム認定制度（MDASH）に関係する教育プログラム。対象科目の詳細は大学の案内で確認。</li>
      <li>2025年度以降にCPで卒業する学生はバッジを取得できません。卒業後に科目等履修生として再入学すると、プラチナ・レインボー以外を目指せます。在学中の修得単位と合算でき、未修得の対象科目を修得します。</li>
      <li>卒業生特典として学籍管理料・システム利用料等は免除され、授業料のみ。科目によって実習環境利用料が必要になる場合があります。</li>
    </ul>
    <p>アプリのバッジ表示は履修計画の充足状況です。公式なバッジの発行・取得は大学の案内で確認してください。</p>` },
  { title: '年間の主な学事スケジュール', tags: '履修登録 授業料 成績 奨学金 学事', source: 'IMG_9292', html: `
    <div class="guide-table-wrap"><table><caption>おおよその時期（正式な日付は大学の案内）</caption><thead><tr><th>月</th><th>主な予定</th></tr></thead><tbody>
      <tr><td>4月</td><td>上旬：春授業・資格等の単位認定申請開始</td></tr>
      <tr><td>5月</td><td>上旬：教養後期の追加履修登録</td></tr>
      <tr><td>6月</td><td>中旬：教養前期の期末試験</td></tr>
      <tr><td>7月</td><td>上旬：卒業研究エントリー開始</td></tr>
      <tr><td>8月</td><td>上旬：専門・外国語・教養後期期末／中旬：授業考慮受付</td></tr>
      <tr><td>9月</td><td>上旬：春成績／中旬：秋履修登録／下旬：授業料等納付・JASSO奨学金受付</td></tr>
      <tr><td>10月</td><td>上旬：秋授業・資格等の単位認定申請開始</td></tr>
      <tr><td>11月</td><td>上旬：教養後期の追加履修登録</td></tr>
      <tr><td>12月</td><td>中旬：卒業研究エントリー・教養前期の期末試験</td></tr>
      <tr><td>2月</td><td>上旬：専門・外国語・教養後期期末／中旬：授業考慮受付</td></tr>
      <tr><td>3月</td><td>上旬：秋成績／中旬：春履修登録／下旬：授業料等納付・JASSO奨学金受付・卒業式</td></tr>
    </tbody></table></div>
    <p>Cloud Campusのお知らせと大学メールを確認してください。履修登録・納付の正確な期間は在学生ガイドブック別冊P2に記載されていますが、そのページは今回の写真には含まれていません。</p>` },
  { title: '申請・事前エントリーが必要なもの', tags: '資格 単位認定 文献調査 就職活動 生成AI 演習 定員', source: 'IMG_9300・9283・9284', html: `
    <p><b>資格等の単位認定：</b>所定の細則を確認し、専用フォームから申請、資格証明書の原本を提出します。</p>
    <ul><li>春：4/1〜4/30（大学必着）、結果は5月末。</li><li>秋：10/1〜10/31（大学必着）、結果は11月末。</li><li>結果はメールで通知。詳細はCloud Campusのお知らせを確認。</li></ul>
    <div class="guide-table-wrap"><table><caption>定員制科目のエントリー時期の目安</caption><thead><tr><th>科目</th><th>時期</th></tr></thead><tbody>
      <tr><td>ゼミナール</td><td>7月 / 12月頃</td></tr>
      <tr><td>就職活動実践演習</td><td>6月 / 12月頃</td></tr>
      <tr><td>文献調査と整理術</td><td>7月 / 1月頃</td></tr>
      <tr><td>アカデミックライティング</td><td>7月 / 1月頃</td></tr>
      <tr><td>生成AIによるビジネススキル演習</td><td>7月 / 1月頃</td></tr>
    </tbody></table></div>
    <p>生成AIメディア・クリエーション演習も科目表で「定員制・選考あり」。受付時期は写真にないため、お知らせで確認してください。</p>` },
  { title: '履修計画の目安と相談先', tags: 'LA ラーニングアドバイザー 18単位 15時間 編入 30 52', source: 'IMG_9299・9301', html: `
    <ul>
      <li>1年次入学・就職希望なしの4年卒業モデル：初学期18単位、学修は週約15時間〜が目安。</li>
      <li>8学期のモデルは順に18・18・18・16・14・14・14・12単位で合計124単位。自分の関心や生活に合わせて調整できます。</li>
      <li>外国語選択4単位を教養に置き換えるモデルでは、教養を計28単位修得します。</li>
      <li>2年次編入の例は30単位認定、3年次編入の例は52単位認定。実際の認定内容で必要な科目・単位数が変わります。</li>
      <li>履修計画に迷ったらラーニングアドバイザー（LA）へ。メール・電話・Zoom等で相談できます。</li>
    </ul>
    <p>相談ページ等へのアクセスは、大学メールでのログインが必要です。</p>` },
  { title: '受験上の注意・生成AI・規程の探し方', tags: '不正行為 マニュアル 学生サポート', source: 'IMG_9300', html: `
    <ul>
      <li><b>受験上の注意：</b>Cloud Campus → 学生サポート → 各種申請 → 受験上の注意。課題・試験の不正行為は単位不認定や処分の対象になる場合があります。</li>
      <li><b>生成AI：</b>科目内で利用を認める指示がある場合を除き、原則として生成AIの出力を用いた課題への回答は禁止と記載されています。</li>
      <li><b>生成AIガイドライン：</b>Cloud Campus → 学生サポート → 規程・マニュアル → 生成AIの利用に関するガイドライン。</li>
      <li><b>その他の規程：</b>Cloud Campus → 学生サポート → 規程・マニュアル。</li>
    </ul>
    <p>写真のQRコードのリンク先はこのアプリでは未確認のため、上記のメニュー経路を案内しています。</p>` },
];

function setupSettingsHub() {
  const tabs = [...document.querySelectorAll('[data-settings-tab]')];
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      document.getElementById(`settings-${button.dataset.settingsTab}`).hidden = !selected;
    });
  }));
  tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[target].click();
    tabs[target].focus();
  }));
  document.getElementById('subject-search').addEventListener('input', renderSettingsPage);
  document.getElementById('guide-search').addEventListener('input', event => renderStudentGuide(event.target.value));
  renderStudentGuide();
}

function renderStudentGuide(query = '') {
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const container = document.getElementById('student-guide-list');
  container.replaceChildren();
  let count = 0;
  STUDENT_GUIDE.forEach(section => {
    const details = document.createElement('details');
    details.className = 'guide-section';
    const summary = document.createElement('summary');
    summary.textContent = section.title;
    const content = document.createElement('div');
    content.className = 'guide-content';
    content.innerHTML = section.html;
    const searchable = `${section.title} ${section.tags} ${content.textContent}`.normalize('NFKC').toLocaleLowerCase();
    if (!terms.every(term => searchable.includes(term))) return;
    const source = document.createElement('p');
    source.className = 'guide-source';
    source.textContent = '参照：提供写真 ' + section.source;
    content.appendChild(source);
    details.append(summary, content);
    details.open = Boolean(normalized);
    container.appendChild(details);
    count++;
  });
  document.getElementById('guide-search-status').textContent = count ? `${count}項目` : '一致する項目がありません。別の言葉で検索してください。';
}
