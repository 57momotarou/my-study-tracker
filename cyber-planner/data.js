// ============================================================
// CyberPlanner データ定義
// ============================================================

// --- 全科目マスター ---
const ALL_SUBJECTS = [
  // === 専門科目（コンピュータサイエンス系） ===
  { code: 'CS101', name: 'ITのための基礎知識', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS102', name: 'インターネット入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS103', name: 'データサイエンス入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS104E', name: 'オフィスソフトウェア基礎演習', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS106', name: '情報セキュリティ入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS151', name: 'コンピュータ入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS152E', name: 'プログラミング入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS153', name: 'Web入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS154', name: '情報セキュリティ入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS156', name: 'デジタル技術と情報化社会', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS201', name: 'IoT入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS202', name: 'ネットワーク技術基礎', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS203E', name: 'Cプログラミング演習', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS251E', name: 'UNIX入門', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS252E', name: 'Pythonプログラミング入門', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS253E', name: 'C言語で学ぶアルゴリズムとデータ構造', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS301', name: 'ソフトウェア工学', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS302', name: 'ネットワーク技術応用', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS303E', name: 'Web応用', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS304', name: '情報セキュリティ応用', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS305', name: '暗号技術と情報セキュリティ', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS307', name: 'ネットワーク実践論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS308', name: 'データベース論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS309', name: 'デジタル社会のコミュニケーション演習', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS351E', name: 'Javaプログラミング', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS352E', name: 'Pythonプログラミング実践', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS353', name: 'AI技術応用', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS354E', name: 'AIプログラミング', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS356E', name: 'データサイエンス応用', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS350E', name: 'Webアプリケーション開発', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS359E', name: 'JavaScriptフレームワークによるWebプログラミング', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS360E', name: 'Linuxサーバ構築演習', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'CS361', name: '認証システム論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  // === 専門科目（プロジェクトマネジメント） ===
  { code: 'PM101', name: 'プロジェクトマネジメント入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'PM301', name: 'ITプロジェクトマネジメント講義', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'PM351E', name: 'ITプロジェクトマネジメント演習', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  // === 専門科目（経済・経営） ===
  { code: 'ECON101', name: '経済学入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'ECON201', name: 'マクロ経済学', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA101', name: '企業経営入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA151', name: 'マーケティング入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA152', name: '経営組織論', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA201', name: '起業入門', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA252', name: '業務効率化のためのデジタルツール活用', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA253', name: '生成AI概論', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA301', name: '事業創造詳論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA302', name: 'コーポレート・ファイナンス', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA304', name: '経営戦略論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA351', name: 'デジタルマーケティング論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA354', name: 'ビジネスモデル構築論', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA355', name: 'プロダクトマネジメント', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'BA357E', name: '生成AIによるビジネススキル演習', category: '専門', type: '専門応用', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  // === 数学 ===
  { code: 'MATH201', name: 'ITとビジネスのための基礎数学', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'MATH202', name: '情報処理のための基礎数学', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  { code: 'MATH251', name: 'データサイエンスのための確率統計', category: '専門', type: '専門基礎', credits: 2, lessons: 15, deadline_type: '専門', available: ['春', '秋'] },
  // === 教養科目（キャリアデザイン分野） ===
  { code: 'SD101E', name: 'スタディスキル入門', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', term: '前期', available: ['春', '秋'] },
  { code: 'SD104', name: 'セルフマネジメント論', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD106', name: 'ロジカルライティング', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD111', name: 'コミュニケーション論', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD112', name: 'Webデザイン入門', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD113', name: 'ロジカルシンキング', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD114', name: 'リーダーシップ概論', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD116', name: 'キャリアデザイン', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD301E', name: 'スタディスキル実践', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'SD302E', name: 'アカデミックライティング', category: '教養', type: 'キャリアデザイン', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  // === 教養科目（自然科学分野） ===
  { code: 'GENS101', name: '暮らしの中の物理学', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS102', name: '健康管理入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS105', name: '我々の宇宙', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS111', name: 'AI（人工知能）入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS113', name: '地球科学入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS114', name: '防災論入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS115', name: '生物学入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS121', name: '化学入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GENS124', name: '人工衛星入門', category: '教養', type: '自然科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  // === 教養科目（人文科学分野） ===
  { code: 'GEHM101', name: '心理学入門', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM103', name: '宗教学入門', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM104', name: '写真・映像制作の基礎', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM105', name: '日本文学入門', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM111', name: '西洋音楽史', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM112', name: '西洋建築歴史の旅', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM113', name: '日本の心と異文化理解', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM114', name: '世界遺産でたどる日本の歴史', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM116', name: '和食文化論', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM117', name: '人間社会と感染症の歴史', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM122', name: 'キリスト教文化Ⅰ', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM124', name: '韓流文化論', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GEHM152', name: 'キリスト教文化Ⅱ', category: '教養', type: '人文科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  // === 教養科目（社会科学分野） ===
  { code: 'GESS101', name: '社会学入門', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS103', name: 'ゲームの歴史と未来', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS104', name: 'コンビニ経済学', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS105', name: '行動経済学入門', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS111', name: 'ソーシャルメディア概論', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS112', name: '政治学入門', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS113', name: '社会保障入門', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS114', name: '企業環境学', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS115', name: '六法と法哲学', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS116', name: 'SDGs入門', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  { code: 'GESS122', name: 'スポーツビジネスのしくみ', category: '教養', type: '社会科学', credits: 1, lessons: 8, deadline_type: '教養', available: ['春', '秋'] },
  // === 外国語科目 ===
  { code: 'ENGL101E', name: '基礎英語Ⅰ', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'ENGL151E', name: '基礎英語Ⅱ', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'ENGL201E', name: '中級英語Ⅰ', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'ENGL251E', name: '中級英語Ⅱ', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'ENGL301E', name: '上級英語Ⅰ-A', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'ENGL302E', name: '上級英語Ⅰ-B', category: '外国語', type: '英語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
  { code: 'CHIN103E', name: '中国語基礎Ⅰ', category: '外国語', type: '中国語', credits: 2, lessons: 15, deadline_type: '外国語', available: ['春', '秋'] },
];

// --- オープンバッジ定義 ---
const BADGES = [
  // === 教養系 ===
  {
    id: 'badge-academic-literacy',
    name: 'アカデミックリテラシー',
    level: 'bronze',
    category: '教養',
    requirements: { codes: ['SD101E', 'SD301E'] }
  },
  {
    id: 'badge-academic-writing',
    name: 'アカデミックライティング',
    level: 'silver',
    category: '教養',
    requirements: { prerequisite: 'badge-academic-literacy', codes: ['SD106', 'SD113', 'SD302E'] }
  },
  {
    id: 'badge-communication',
    name: 'コミュニケーション',
    level: 'silver',
    category: '教養',
    requirements: { codes: ['SD111', 'SD301E'] }
  },
  {
    id: 'badge-edu-startup',
    name: '教養スタートアップ',
    level: 'bronze',
    category: '教養',
    requirements: {
      description: '各分野から2単位以上修得',
      multiGroup: true
    }
  },
  // === IT総合学基礎（ブロンズ） ===
  {
    id: 'badge-it-bronze',
    name: 'IT総合学基礎',
    level: 'bronze',
    category: '専門',
    requirements: {
      codes: ['CS101', 'CS102', 'CS103', 'CS104E', 'PM101', 'BA101']
    }
  },
  // === テクノロジー基礎Ⅰ（シルバー） ===
  {
    id: 'badge-tech1-silver',
    name: 'テクノロジー基礎Ⅰ',
    level: 'silver',
    category: '専門',
    requirements: {
      prerequisite: 'badge-it-bronze',
      codes: ['CS151', 'CS152E', 'CS153', 'CS154', 'CS201']
    }
  },
  // === テクノロジー基礎Ⅱ（シルバー） ===
  {
    id: 'badge-tech2-silver',
    name: 'テクノロジー基礎Ⅱ',
    level: 'silver',
    category: '専門',
    requirements: {
      prerequisite: 'badge-tech1-silver',
      codes: ['CS251E', 'CS252E', 'CS253E']
    }
  },
  // === 数学基礎（シルバー） ===
  {
    id: 'badge-math-silver',
    name: '数学基礎',
    level: 'silver',
    category: '専門',
    requirements: {
      prerequisite: 'badge-it-bronze',
      codes: ['MATH201', 'MATH202', 'MATH251']
    }
  },
  // === ビジネス基礎（シルバー） ===
  {
    id: 'badge-biz-silver',
    name: 'ビジネス基礎',
    level: 'silver',
    category: '専門',
    requirements: {
      prerequisite: 'badge-it-bronze',
      codes: ['ECON101', 'BA151', 'BA152', 'BA253']
    }
  },
  // === ネットワーク（ゴールド） ===
  {
    id: 'badge-network-gold',
    name: 'ネットワーク',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-tech2-silver',
      codes: ['CS202', 'CS307']
    }
  },
  // === セキュリティ（ゴールド） ===
  {
    id: 'badge-security-gold',
    name: 'セキュリティ',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-tech2-silver',
      codes: ['CS304', 'CS305']
    }
  },
  // === ソフトウェア（ゴールド） ===
  {
    id: 'badge-software-gold',
    name: 'ソフトウェア',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-tech2-silver',
      codes: ['CS301', 'CS351E', 'CS350E', 'CS359E']
    }
  },
  // === AI（ゴールド） ===
  {
    id: 'badge-ai-gold',
    name: 'AI',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-math-silver',
      codes: ['CS353', 'CS354E', 'CS252E', 'CS356E']
    }
  },
  // === 生成AI活用（ゴールド） ===
  {
    id: 'badge-genai-gold',
    name: '生成AI活用',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-biz-silver',
      codes: ['BA253', 'BA252', 'BA357E']
    }
  },
  // === デジタルマーケティング（ゴールド） ===
  {
    id: 'badge-dm-gold',
    name: 'デジタルマーケティング',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-biz-silver',
      codes: ['BA351']
    }
  },
  // === 管理（ゴールド） ===
  {
    id: 'badge-mgmt-gold',
    name: '管理',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-biz-silver',
      codes: ['PM301', 'PM351E']
    }
  },
  // === 起業（ゴールド） ===
  {
    id: 'badge-startup-gold',
    name: '起業',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-biz-silver',
      codes: ['BA201', 'BA301', 'BA354']
    }
  },
  // === 経営（ゴールド） ===
  {
    id: 'badge-biz2-gold',
    name: '経営',
    level: 'gold',
    category: '専門',
    requirements: {
      prerequisite: 'badge-biz-silver',
      codes: ['BA302', 'BA304', 'BA355']
    }
  },
  // === 総合英語（ブロンズ） ===
  {
    id: 'badge-english-bronze',
    name: '総合英語',
    level: 'bronze',
    category: '外国語',
    requirements: { codes: ['ENGL101E', 'ENGL151E', 'ENGL201E', 'ENGL251E'] }
  },
  // === 実践英語Ⅰ（シルバー） ===
  {
    id: 'badge-english-silver1',
    name: '実践英語Ⅰ',
    level: 'silver',
    category: '外国語',
    requirements: {
      prerequisite: 'badge-english-bronze',
      codes: ['ENGL301E', 'ENGL302E']
    }
  },
];

// --- 学期マスター（8学期分） ---
const SEMESTERS = [
  { id: 1, name: '2026年度春学期', year: 2026, season: '春', start: '2026-04-03', end: '2026-08-06', deadlineThu: '木', deadlineTue: '火' },
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
  '専門': { color: '#f59e0b', bg: '#78350f', icon: '💻' },
  '教養': { color: '#10b981', bg: '#064e3b', icon: '🌿' },
  '外国語': { color: '#8b5cf6', bg: '#4c1d95', icon: '🌐' },
};

const BADGE_LEVEL_CONFIG = {
  bronze: { label: 'ブロンズ', color: '#cd7f32', bg: '#431407', icon: '🥉' },
  silver: { label: 'シルバー', color: '#94a3b8', bg: '#1e293b', icon: '🥈' },
  gold: { label: 'ゴールド', color: '#f59e0b', bg: '#451a03', icon: '🥇' },
  platinum: { label: 'プラチナ', color: '#67e8f9', bg: '#0c4a6e', icon: '💎' },
};
