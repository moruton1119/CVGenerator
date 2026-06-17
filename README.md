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

GitHub Actionsによる自動デプロイ。
`master` ブランチにpushすると、自動的にGitHub Pagesにデプロイされる。

```
[ master ]  開発ブランチ（ここで編集・push）
     │
     ▼  pushすると自動でGitHub Actionsが実行
[ GitHub Pages ] ← サイトが自動更新される
```

### デプロイ手順

```bash
# masterで編集・コミット・pushするだけ！
git add -A
git commit -m "変更内容"
git push origin master
# → GitHub Actionsが自動でデプロイを実行
```

数分後に https://moruton1119.github.io/CVGenerator/ に反映される。

デプロイ状況は GitHub リポジトリの **Actions** タブで確認可能。

## 🌿 ブランチ構成

| ブランチ | 役割 |
|----------|------|
| `master` | 開発のメインブランチ。pushすると自動デプロイされる。 |

> **Note:** `gh-pages` ブランチは過去のデプロイ用に使用していた名残。現在は未使用（GitHub Actions経由でデプロイしているため削除可能）。

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
# → GitHub Actionsが自動でデプロイを実行！

# 4. ブランチ削除（オプション）
git branch -d feature/追加する機能名
```

## ライセンス

© 2026 CVGenerator By Moruton
