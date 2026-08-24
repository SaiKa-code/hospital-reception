# クビを回避せよ！ 🏥 ブラウザ体験版

病院受付シミュレーションゲーム「クビを回避せよ！！」の**無料体験版**です。
受付・書類確認・会計といった受付業務の一部を、ブラウザで試遊できます。

製品版はSteamで配信しています。体験版とは収録内容が異なります。

- Steamストアページ: https://store.steampowered.com/app/4334400/
- 公式サイト: https://saika-code.github.io/kubikiri-clinic-web/
- 制作: SaiKa工房

## 🎮 遊び方

ブラウザで `index.html` を開くか、ローカルサーバーを起動してプレイできます。

```bash
node server.js
```

ブラウザで `http://localhost:3000` にアクセスしてください。

## 🛠️ 技術スタック

- **HTML5 / JavaScript**
- **Phaser.js** (ゲームエンジン)
- **Node.js** (ローカルサーバー)

## 📁 ファイル構成

```
├── index.html          # エントリーポイント
├── server.js           # ローカルサーバー
├── assets/             # 画像・音声・データ
├── components/         # 共通コンポーネント
├── TitleScene.js       # タイトル画面
├── ReceptionScene.js   # 受付シーン（メインゲーム）
├── HUDScene.js         # HUD表示
├── CheckScene.js       # チェックシーン
├── PaymentScene.js     # 会計シーン
├── ResultScene.js      # リザルト画面
└── ...
```

## ⚠️ 収録データについて

登場する**医薬品名・患者情報・保険証の記載内容は、すべて架空のものです**。
実在の医薬品、実在の人物・団体とは一切関係ありません。
本作はゲームであり、医療上の助言を与えるものではありません。

## ライセンス

このプロジェクトは非公開ライセンスです（UNLICENSED）。
ソースコードおよびアセットの再利用・再配布は許可していません。
