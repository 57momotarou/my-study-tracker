# プロジェクト概要
サイバー大学の学習進捗を管理するPWAアプリ。
GitHub Pages（https://57momotarou.github.io/benkyouganbaru/）でホスト。

# 重要ルール
- 質問・回答は必ず日本語で行う
- 指示があるたびに、直前に書き出したファイルをベースに修正する
- コードは「既存に追加」「全書き換え」「一部書き換え」を明記する
- ファイルを書き出すときはどのフォルダにあるか示す
- data/schedule.jsはGitHubに上げない（.gitignoreで除外済み）

# 技術スタック
- バニラHTML/CSS/JavaScript（フレームワークなし）
- PWA（Service Worker・manifest.json）
- GitHub Pagesでホスト
- データはlocalStorageに保存

# ファイル構成
benkyouganbaru/
├── index.html        # メイン画面
├── manifest.json     # PWA設定
├── sw.js             # Service Worker
├── style.css         # デザイン
├── app.js            # メインロジック
├── CLAUDE.md         # このファイル
└── data/
    └── schedule.js   # 科目データ（GitHubに上げない）

# 科目データについて
data/schedule.jsに科目情報を管理。
GitHubには上げず、ローカルのみで管理する。
iPhoneで使うためschedule.jsのデータはapp.jsに埋め込む方式を検討中。

# 開発者情報
- 開発経験なし・独学
- Windows PCで開発
- iPhoneで使用
- 働きながらサイバー大学に通う社会人

# 学期情報
- 2026年度春学期（4月3日〜8月6日）
- 専門科目5科目（各15コマ・2単位）
- 教養科目6科目（各8コマ・1単位）
- 外国語1科目（15コマ・2単位）
- 出席認定締切：専門は毎週木曜12時、教養・外国語は毎週火曜12時
