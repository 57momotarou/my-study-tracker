// ============================================================
// my-study-tracker データ定義
// ============================================================

// --- 全科目マスター ---
const ALL_SUBJECTS = [
  // === 専門科目 - 専門基礎 ===
  { code: 'BA101',    name: '企業経営入門',                        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA111',    name: '会計簿記入門',                        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA151',    name: 'マーケティング入門',                  category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA152',    name: '経営組織論',                          category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA201',    name: '起業入門',                            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA211',    name: '管理会計',                            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA252',    name: '業務効率化のためのデジタルツール活用',category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'BA253',    name: '生成AI概論',                          category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },

  // === 専門科目 - 専門応用 ===
  { code: 'BA301',    name: '事業創造詳論',                        category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA302',    name: 'コーポレート・ファイナンス',          category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA303',    name: 'eコマース実践論',                     category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA304',    name: '経営戦略論',                          category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA305',    name: '業務アプリケーションの進化と開発',    category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA306',    name: 'デジタルマーケティング論',            category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA351',    name: 'ネットマーケティング論',              category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA352',    name: '商品企画論',                          category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA353',    name: '地域マーケティング論',                category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA354',    name: 'ビジネスモデル構築論',                category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA355',    name: 'プロダクトマネジメント',              category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'BA357E',   name: '生成AIによるビジネススキル演習',      category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },

  // === 外国語科目（中国語）===
  { code: 'CHIN101E', name: '中国語入門A',   category: '外国語', type: '中国語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },
  { code: 'CHIN201E', name: '中国語応用B',   category: '外国語', type: '中国語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },

  // === 専門科目 - 専門基礎 ===
  { code: 'CS101',    name: 'ITのための基礎知識',                  category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS102',    name: 'インターネット入門',                  category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS103',    name: 'データサイエンス入門',                category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS104E',   name: 'オフィスソフトウェア基礎演習',        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS106',    name: '情報端末とネットサービス入門',        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS151',    name: 'コンピュータ入門',                    category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS152E',   name: 'プログラミング入門',                  category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS153',    name: 'Web入門',                             category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS154',    name: '情報セキュリティ入門',                category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS156',    name: 'デジタル技術と情報化社会',            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS201',    name: 'IoT入門',                             category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'CS202',    name: 'ネットワーク技術基礎',                category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS203E',   name: 'Cプログラミング演習',                 category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: true },
  { code: 'CS251E',   name: 'UNIX入門',                            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS252E',   name: 'Pythonプログラミング入門',            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS253E',   name: 'C言語で学ぶアルゴリズムとデータ構造',category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },

  // === 専門科目 - 専門応用 ===
  { code: 'CS301',    name: 'ソフトウェア工学',                    category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS302',    name: 'ネットワーク技術応用',                category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS303E',   name: 'Web応用',                             category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS304',    name: '情報セキュリティ応用',                category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS305',    name: '暗号技術と情報セキュリティ',          category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS307',    name: 'ネットワーク実践論',                  category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS308',    name: 'データベース論',                      category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS309E',   name: 'デジタル社会のコミュニケーション演習',category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS351E',   name: 'Javaプログラミング',                  category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS352E',   name: 'Pythonプログラミング実践',            category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS353',    name: 'AI技術応用',                          category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'CS354E',   name: 'AIプログラミング',                    category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS356E',   name: 'データサイエンス応用',                category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS358E',   name: 'Webアプリケーション開発',             category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS359E',   name: 'JavaScriptフレームワークによるWebプログラミング', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS360E',   name: 'Linuxサーバ構築演習',                 category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },
  { code: 'CS361',    name: '認証システム論',                      category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },

  // === 専門科目 - 専門基礎 ===
  { code: 'ECON101',  name: '経済学入門',                          category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'ECON201',  name: 'マクロ経済学',                        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },

  // === 外国語科目（英語）===
  { code: 'ENGL101E', name: '基礎英語Ⅰ',   category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '一斉', term: '通期', is_enshu: true },
  { code: 'ENGL151E', name: '基礎英語Ⅱ',   category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '一斉', term: '通期', is_enshu: true },
  { code: 'ENGL201E', name: '中級英語Ⅰ',   category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '一斉', term: '通期', is_enshu: true },
  { code: 'ENGL251E', name: '中級英語Ⅱ',   category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '一斉', term: '通期', is_enshu: true },
  { code: 'ENGL301E', name: '上級英語Ⅰ-A', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },
  { code: 'ENGL302E', name: '上級英語Ⅰ-B', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },
  { code: 'ENGL351E', name: '上級英語Ⅱ-A', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },
  { code: 'ENGL352E', name: '上級英語Ⅱ-B', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },

  // === 教養科目（人文科学分野）===
  { code: 'GEHM101',  name: '心理学入門',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM102',  name: '日本の伝統芸能',                      category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM103',  name: '宗教学入門',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM104',  name: '写真・映像制作の基礎',                category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM105',  name: '日本文学入門',                        category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM111',  name: '西洋音楽史',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM112',  name: '西洋建築歴史の旅',                    category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM113',  name: '日本の心と異文化理解',                category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM114',  name: '世界遺産でたどる日本の歴史',          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM116',  name: '和食文化論',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM117',  name: '人間社会と感染症の歴史',              category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM121',  name: '講談の世界',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM122',  name: 'キリスト教文化Ⅰ',                   category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM124',  name: '韓流文化論',                          category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GEHM151',  name: '「使いやすさ」の心理学',             category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GEHM152',  name: 'キリスト教文化Ⅱ',                   category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },

  // === 教養科目（自然科学分野）===
  { code: 'GENS101',  name: '暮らしの中の物理学',                  category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GENS102',  name: '健康管理入門',                        category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GENS105',  name: '我々の宇宙',                          category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GENS111',  name: 'AI（人工知能）入門',                  category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GENS113',  name: '地球科学入門',                        category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GENS114',  name: '防災論入門',                          category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GENS115',  name: '生物学入門',                          category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GENS121',  name: '化学入門',                            category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GENS122',  name: '医療・ヘルスケアとIT',                category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GENS124',  name: '人工衛星入門',                        category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GENS151',  name: '物理学入門',                          category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },

  // === 教養科目（社会科学分野）===
  { code: 'GESS101',  name: '社会学入門',                          category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS102',  name: '地域おこし実践論',                    category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS103',  name: 'ゲームの歴史と未来',                  category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS104',  name: 'コンビニ経済学',                      category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GESS111',  name: 'ソーシャルメディア概論',              category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS112',  name: '政治学入門',                          category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS113',  name: '社会保障入門',                        category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS114',  name: '企業環境学',                          category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GESS115',  name: '六法と法哲学',                        category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'GESS116',  name: 'SDGs入門',                            category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'GESS122',  name: 'スポーツビジネスのしくみ',            category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },

  // === 専門科目 - 専門基礎 ===
  { code: 'LAW101',   name: 'ビジネス法務入門',                    category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'LAW201',   name: 'リスク管理と監査',                    category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'MATH201',  name: 'ITとビジネスのための基礎数学',        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'MATH202',  name: '情報処理のための基礎知識',            category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'MATH251',  name: 'データサイエンスのための確率統計',    category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },
  { code: 'PM101',    name: 'プロジェクトマネジメント入門',        category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '一斉', is_enshu: false },

  // === 専門科目 - 専門応用 ===
  { code: 'PM301',    name: 'ITプロジェクトマネジメント講義',      category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: false },
  { code: 'PM351E',   name: 'ITプロジェクトマネジメント演習',      category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'], open_type: '順次', is_enshu: true },

  // === 教養科目（キャリアデザイン分野）===
  { code: 'SD101E',   name: 'スタディスキル入門',                  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: true },
  { code: 'SD103',    name: 'セルフマネジメント論',                category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD104',    name: 'プレゼンテーション入門',              category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD105',    name: 'キャリア入門',                        category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD106',    name: 'ロジカルライティング',                category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD111',    name: 'コミュニケーション論',                category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD112',    name: 'Webデザイン入門',                     category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD113',    name: 'ロジカルシンキング',                  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD114',    name: 'リーダーシップ概論',                  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD115',    name: 'ITによる知的生産術',                  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD116',    name: 'キャリアデザイン',                    category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD117',    name: 'マインドフルネス入門',                category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD121',    name: 'ファイナンシャル・プランニング入門',  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: false },
  { code: 'SD131E',   name: '文献調査と整理術',                    category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: true },
  { code: 'SD151',    name: '資産運用実践論',                      category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '後期', is_enshu: false },
  { code: 'SD152E',   name: '就職活動実践演習',                    category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: true },
  { code: 'SD301E',   name: 'スタディスキル実践',                  category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '前期', is_enshu: true },
  { code: 'SD302E',   name: 'アカデミックライティング',            category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'], open_type: '順次', term: '通期', is_enshu: true },
];

// --- オープンバッジ定義 ---
const BADGES = [
  { id: 'badge-academic-literacy', name: 'アカデミックリテラシー', level: 'bronze', category: '教養',
    requirements: { codes: ['SD101E', 'SD301E'] } },
  { id: 'badge-tech-bronze', name: 'テクノロジー基礎', level: 'bronze', category: '専門',
    requirements: { codes: ['CS101', 'CS102', 'CS153', 'CS106', 'CS156'] } },
  { id: 'badge-tech-silver', name: 'テクノロジー基礎Ⅱ', level: 'silver', category: '専門',
    requirements: { prerequisite: 'badge-tech-bronze', codes: ['CS151', 'MATH201', 'CS201'] } },
  { id: 'badge-network-gold', name: 'ネットワーク', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-tech-silver', codes: ['CS202', 'CS302', 'CS307'] } },
  { id: 'badge-security-gold', name: 'セキュリティ', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-tech-silver', codes: ['CS304', 'CS305', 'CS361'] } },
  { id: 'badge-software-gold', name: 'ソフトウェア', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-tech-silver', codes: ['CS252E', 'CS303E', 'CS350E'] } },
  { id: 'badge-ai-gold', name: 'AI', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-tech-silver', codes: ['CS353', 'CS354E', 'CS356E'] } },
  { id: 'badge-biz-bronze', name: 'ビジネス基礎', level: 'bronze', category: '専門',
    requirements: { codes: ['ECON101', 'BA101', 'BA151', 'BA152'] } },
  { id: 'badge-biz-silver', name: 'ビジネス基礎Ⅱ', level: 'silver', category: '専門',
    requirements: { prerequisite: 'badge-biz-bronze', codes: ['PM101', 'BA201', 'BA253'] } },
  { id: 'badge-genai-gold', name: '生成AI活用', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-biz-silver', codes: ['BA253', 'BA252', 'BA357E'] } },
  { id: 'badge-dm-gold', name: 'デジタルマーケティング', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-biz-silver', codes: ['BA351'] } },
  { id: 'badge-mgmt-gold', name: '管理', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-biz-silver', codes: ['PM301', 'PM351E'] } },
  { id: 'badge-startup-gold', name: '起業', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-biz-silver', codes: ['BA201', 'BA301', 'BA354'] } },
  { id: 'badge-biz2-gold', name: '経営', level: 'gold', category: '専門',
    requirements: { prerequisite: 'badge-biz-silver', codes: ['BA302', 'BA304', 'BA355'] } },
  { id: 'badge-english-bronze', name: '総合英語', level: 'bronze', category: '外国語',
    requirements: { codes: ['ENGL101E', 'ENGL151E', 'ENGL201E', 'ENGL251E'] } },
  { id: 'badge-english-silver1', name: '実践英語Ⅰ', level: 'silver', category: '外国語',
    requirements: { prerequisite: 'badge-english-bronze', codes: ['ENGL301E', 'ENGL302E'] } },
];

// --- 出席認定期間テーブル（2026年度春学期） ---
// 科目種別ごとにコマ番号→締切日時(ISO)を定義
// open_type='一斉' かつ deadline_type='専門' → ATTENDANCE_SENMON_ISSAI
// open_type='順次' かつ deadline_type='専門' → ATTENDANCE_SENMON_JYUNJI
// term='前期' かつ deadline_type='教養' → ATTENDANCE_KYOYO_ZENKI
// term='後期' かつ deadline_type='教養' → ATTENDANCE_KYOYO_KOKI
// is_enshu=true かつ deadline_type='教養' → ATTENDANCE_KYOYO_ENSHU
// code='SD302E'(アカデミックライティング) → ATTENDANCE_ACADEMIC_WRITING
// deadline_type='外国語' → ATTENDANCE_GAIKOKUGO

const ATTENDANCE_2026_SPRING = {
  // 専門科目（一斉開講）締切のみ
  senmon_issai: [
    null,                    // index 0 unused
    '2026-04-16T12:00:00',  // コマ1
    '2026-04-23T12:00:00',  // コマ2
    '2026-05-07T12:00:00',  // コマ3
    '2026-05-14T12:00:00',  // コマ4
    '2026-05-21T12:00:00',  // コマ5
    '2026-05-28T12:00:00',  // コマ6
    '2026-06-04T12:00:00',  // コマ7
    '2026-06-11T12:00:00',  // コマ8
    '2026-06-18T12:00:00',  // コマ9
    '2026-06-25T12:00:00',  // コマ10
    '2026-07-02T12:00:00',  // コマ11
    '2026-07-09T12:00:00',  // コマ12
    '2026-07-16T12:00:00',  // コマ13
    '2026-07-23T12:00:00',  // コマ14
    '2026-07-30T12:00:00',  // コマ15
  ],
  // 専門科目（順次開講）開始〜締切
  senmon_jyunji: [
    null,
    { start: '2026-04-03', end: '2026-04-16T12:00:00' },  // コマ1
    { start: '2026-04-09', end: '2026-04-23T12:00:00' },  // コマ2
    { start: '2026-04-16', end: '2026-05-07T12:00:00' },  // コマ3
    { start: '2026-04-23', end: '2026-05-14T12:00:00' },  // コマ4
    { start: '2026-05-07', end: '2026-05-21T12:00:00' },  // コマ5
    { start: '2026-05-14', end: '2026-05-28T12:00:00' },  // コマ6
    { start: '2026-05-21', end: '2026-06-04T12:00:00' },  // コマ7
    { start: '2026-05-28', end: '2026-06-11T12:00:00' },  // コマ8
    { start: '2026-06-04', end: '2026-06-18T12:00:00' },  // コマ9
    { start: '2026-06-11', end: '2026-06-25T12:00:00' },  // コマ10
    { start: '2026-06-18', end: '2026-07-02T12:00:00' },  // コマ11
    { start: '2026-06-25', end: '2026-07-09T12:00:00' },  // コマ12
    { start: '2026-07-02', end: '2026-07-16T12:00:00' },  // コマ13
    { start: '2026-07-09', end: '2026-07-23T12:00:00' },  // コマ14
    { start: '2026-07-16', end: '2026-07-30T12:00:00' },  // コマ15
    { start: '2026-07-16', end: '2026-08-06T12:00:00' },  // 期末
  ],
  // 教養前期（講義・一斉）締切のみ
  kyoyo_zenki: [
    null,
    '2026-04-14T12:00:00',  // コマ1
    '2026-04-21T12:00:00',  // コマ2
    '2026-04-28T12:00:00',  // コマ3
    '2026-05-12T12:00:00',  // コマ4
    '2026-05-19T12:00:00',  // コマ5
    '2026-05-26T12:00:00',  // コマ6
    '2026-06-02T12:00:00',  // コマ7
    '2026-06-09T12:00:00',  // コマ8
  ],
  // 教養後期（講義・一斉）締切のみ
  kyoyo_koki: [
    null,
    '2026-06-12T12:00:00',  // コマ1
    '2026-06-19T12:00:00',  // コマ2
    '2026-06-23T12:00:00',  // コマ3
    '2026-06-30T12:00:00',  // コマ4
    '2026-07-07T12:00:00',  // コマ5
    '2026-07-14T12:00:00',  // コマ6
    '2026-07-21T12:00:00',  // コマ7
    '2026-07-28T12:00:00',  // コマ8
  ],
  // 教養（演習・順次）開始〜締切
  kyoyo_enshu: [
    null,
    { start: '2026-04-03', end: '2026-04-14T12:00:00' },  // コマ1
    { start: '2026-04-07', end: '2026-04-21T12:00:00' },  // コマ2
    { start: '2026-04-14', end: '2026-04-28T12:00:00' },  // コマ3
    { start: '2026-04-21', end: '2026-05-12T12:00:00' },  // コマ4
    { start: '2026-04-28', end: '2026-05-19T12:00:00' },  // コマ5
    { start: '2026-05-12', end: '2026-05-26T12:00:00' },  // コマ6
    { start: '2026-05-19', end: '2026-06-02T12:00:00' },  // コマ7
    { start: '2026-05-26', end: '2026-06-09T12:00:00' },  // コマ8
  ],
  // アカデミックライティング（隔週・順次）開始〜締切
  academic_writing: [
    null,
    { start: '2026-04-03', end: '2026-04-14T12:00:00' },  // コマ1
    { start: '2026-04-14', end: '2026-04-28T12:00:00' },  // コマ2
    { start: '2026-04-28', end: '2026-05-19T12:00:00' },  // コマ3
    { start: '2026-05-19', end: '2026-06-02T12:00:00' },  // コマ4
    { start: '2026-06-02', end: '2026-06-16T12:00:00' },  // コマ5
    { start: '2026-06-16', end: '2026-06-30T12:00:00' },  // コマ6
    { start: '2026-06-30', end: '2026-07-14T12:00:00' },  // コマ7
    { start: '2026-07-14', end: '2026-07-28T12:00:00' },  // コマ8
  ],
  // 外国語（一斉・15回）締切のみ
  gaikokugo: [
    null,
    '2026-04-14T12:00:00',  // コマ1
    '2026-04-21T12:00:00',  // コマ2
    '2026-04-28T12:00:00',  // コマ3
    '2026-05-12T12:00:00',  // コマ4
    '2026-05-19T12:00:00',  // コマ5
    '2026-05-26T12:00:00',  // コマ6
    '2026-06-02T12:00:00',  // コマ7
    '2026-06-09T12:00:00',  // コマ8
    '2026-06-16T12:00:00',  // コマ9
    '2026-06-23T12:00:00',  // コマ10
    '2026-06-30T12:00:00',  // コマ11
    '2026-07-07T12:00:00',  // コマ12
    '2026-07-14T12:00:00',  // コマ13
    '2026-07-21T12:00:00',  // コマ14
    '2026-07-28T12:00:00',  // コマ15
  ],
  // スタディスキル入門（一斉・特殊）開始4/2(木)〜締切
  study_skill: [
    null,
    { start: '2026-04-02', end: '2026-04-07T12:00:00' },  // コマ1
    { start: '2026-04-02', end: '2026-04-14T12:00:00' },  // コマ2
    { start: '2026-04-02', end: '2026-04-21T12:00:00' },  // コマ3
    { start: '2026-04-02', end: '2026-04-28T12:00:00' },  // コマ4
    { start: '2026-04-02', end: '2026-05-12T12:00:00' },  // コマ5
    { start: '2026-04-02', end: '2026-05-19T12:00:00' },  // コマ6
    { start: '2026-04-02', end: '2026-05-26T12:00:00' },  // コマ7
    { start: '2026-04-02', end: '2026-05-26T12:00:00' },  // コマ8
  ],
};

// --- 学期マスター（8学期分）---
const SEMESTERS = [
  { id: 1, name: '2026年度春学期', year: 2026, season: '春', start: '2026-04-03', end: '2026-08-06', attendance: ATTENDANCE_2026_SPRING },
  { id: 2, name: '2026年度秋学期', year: 2026, season: '秋', start: '2026-10-01', end: '2027-02-06' },
  { id: 3, name: '2027年度春学期', year: 2027, season: '春', start: '2027-04-01', end: '2027-08-06' },
  { id: 4, name: '2027年度秋学期', year: 2027, season: '秋', start: '2027-10-01', end: '2028-02-06' },
  { id: 5, name: '2028年度春学期', year: 2028, season: '春', start: '2028-04-01', end: '2028-08-06' },
  { id: 6, name: '2028年度秋学期', year: 2028, season: '秋', start: '2028-10-01', end: '2029-02-06' },
  { id: 7, name: '2029年度春学期', year: 2029, season: '春', start: '2029-04-01', end: '2029-08-06' },
  { id: 8, name: '2029年度秋学期', year: 2029, season: '秋', start: '2029-10-01', end: '2030-02-06' },
];

// --- カテゴリ表示設定 ---
const CATEGORY_CONFIG = {
  '専門':   { color: '#f59e0b', bg: '#78350f', icon: '💻' },
  '教養':   { color: '#10b981', bg: '#064e3b', icon: '🌿' },
  '外国語': { color: '#8b5cf6', bg: '#4c1d95', icon: '🌐' },
};

const BADGE_LEVEL_CONFIG = {
  bronze:   { label: 'ブロンズ', color: '#cd7f32', bg: '#431407', icon: '🥉' },
  silver:   { label: 'シルバー', color: '#94a3b8', bg: '#1e293b', icon: '🥈' },
  gold:     { label: 'ゴールド', color: '#f59e0b', bg: '#451a03', icon: '🥇' },
  platinum: { label: 'プラチナ', color: '#67e8f9', bg: '#0c4a6e', icon: '💎' },
};
