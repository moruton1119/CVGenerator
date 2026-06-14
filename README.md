# CVGenerator - 職務経歴書メーカー

ブラウザ上で動く、職務経歴書作成ツール。入力データはlocalStorageに自動保存され、JSONバックアップも可能。

## 🌐 公開URL

https://moruton1119.github.io/CVGenerator/

## ✨ 機能一覧

| 機能 | 説明 |
|------|------|
| 📝 入力フォーム | 基本情報・自己PR・職務経歴・学歴・スキル・保有資格を入力 |
| 👁️ プレビュー | 「入力 / プレビュー」タブ切り替えで完成形を確認 |
| 📋 テンプレート | エンジニア / デザイナー / PM / 空白の4種類から選択可能 |
| 🏷️ 構造化スキル | 言語・FW・ツール・クラウド・その他をカテゴリ別タグ入力 |
| 💻 技術タグ | 各経歴カードに「使用技術」タグを付与可能 |
| 📊 進捗バー | 入力完了度がリアルタイム表示 |
| 📥 JSON保存/読込 | データのバックアップ・復元 |
| 🖨️ PDF出力 | ブラウザの印刷機能でPDF化 |
| 📱 レスポンシブ | PC・タブレット・モバイル対応 |

## 📁 ファイル構成

```
CVGenerator/
├── index.html   # アプリ本体（HTML構造）
├── style.css    # スタイル（画面・プレビュー・印刷・レスポンシブ）
├── script.js    # ロジック（入力管理・プレビュー描画・タグ・テンプレート）
└── README.md    # このファイル
```

フレームワーク不使用（vanilla JS + HTML + CSS）。

## 🚀 デプロイ方法

### 現在の仕組み

GitHub Pages（`Deploy from a branch`）を使用。
公開URLは `gh-pages` ブランチの内容が配信される。

```
[ master ]  開発ブランチ（ここで編集）
     │
     ▼  masterの内容をgh-pagesにマージしてpush
[ gh-pages ] ← GitHub Pagesがこのブランチを配信
```

### デプロイ手順

```bash
# 1. masterで編集・コミット
git add -A
git commit -m "変更内容"
git push origin master

# 2. gh-pagesにマージしてpush（これでサイトが更新される）
git checkout gh-pages
git merge master
git push origin gh-pages
git checkout master
```

⚠️ **重要:** masterにpushしただけではサイトは更新されない。`gh-pages`ブランチの更新が必要。

### 🔧 推奨: GitHub Actionsによる自動化（今後の改善案）

上記の手動マージは忘れやすい。将来的にはGitHub Actionsで「masterにpushしたら自動でgh-pagesにデプロイ」する仕組み（[peaceiris/actions-gh-pages](https://github.com/peaceiris/actions-gh-pages) 等）を導入することを推奨。

## 🌿 ブランチ構成

| ブランチ | 役割 |
|----------|------|
| `master` | 開発のメインブランチ。最新のソースコード。 |
| `gh-pages` | GitHub Pages配信用ブランチ。masterの内容をミラーする。 |

### 機能追加時のフロー

```bash
# 1. 機能ブランチ作成
git checkout -b feature/追加する機能名

# 2. 編集・コミット
git add -A
git commit -m "[機能追加] 機能の説明"

# 3. masterにマージ
git checkout master
git merge feature/追加する機能名
git push origin master

# 4. gh-pagesに反映（デプロイ）
git checkout gh-pages
git merge master
git push origin gh-pages
git checkout master

# 5. ブランチ削除（オプション）
git branch -d feature/追加する機能名
```

## ライセンス

© 2026 CVGenerator By Antigravity
