// TitleScene.js - スタート画面（プレミアムデザイン版）
import { addTransitionMethods } from './TransitionManager.js';
import { VOLUME_KEYS, DEFAULT_VOLUMES } from './GameConfig.js';

export class TitleScene extends Phaser.Scene {
    constructor() {
        super('TitleScene');
    }

    create() {
        addTransitionMethods(this);
        
        const centerX = 960;
        const centerY = 540;
        
        // =========================================================
        // タイトルBGM再生（Web Autoplay Policy 対策）
        // =========================================================
        this.sound.stopAll(); // 他のBGMを停止
        if (this.cache.audio.exists('bgm_hinokageri')) {
            const playTitleBgm = () => {
                if (this.titleBgm && this.titleBgm.isPlaying) return;
                this.titleBgm = this.sound.add('bgm_hinokageri', { 
                    loop: true, 
                    volume: 0.4 
                });
                this.titleBgm.play();
            };

            if (this.sound.locked) {
                // ブラウザがまだ音声をロックしている → 最初のユーザー操作で再生
                this.sound.once('unlocked', playTitleBgm);
            } else {
                // すでにアンロック済み（2回目以降のシーン遷移など）
                playTitleBgm();
            }
        }
        
        // =========================================================
        // プレミアム背景（ダークグラデーション）
        // =========================================================
        const bgGraphics = this.add.graphics();
        
        // 深いネイビー → ダークパープルのグラデーション
        bgGraphics.fillGradientStyle(0x0a1628, 0x0a1628, 0x1a1a2e, 0x16213e, 1);
        bgGraphics.fillRect(0, 0, 1920, 1080);
        
        // 装飾的な光のライン（上部）
        const topLine = this.add.graphics();
        topLine.fillGradientStyle(0x00d4aa, 0x00b4d8, 0x00d4aa, 0x00b4d8, 0.3);
        topLine.fillRect(0, 0, 1920, 3);
        
        // =========================================================
        // 背景アニメーション（浮遊パーティクル）
        // =========================================================
        
        // 浮遊する光の粒子
        for (let i = 0; i < 30; i++) {
            const x = Phaser.Math.Between(0, 1920);
            const y = Phaser.Math.Between(0, 1080);
            const size = Phaser.Math.Between(2, 5);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
            const particle = this.add.circle(x, y, size, 0x00d4aa, alpha);
            
            // ゆっくり上昇するアニメーション
            this.tweens.add({
                targets: particle,
                y: { from: y, to: y - Phaser.Math.Between(100, 300) },
                alpha: { from: alpha, to: 0 },
                duration: Phaser.Math.Between(4000, 8000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 3000),
                onRepeat: () => {
                    particle.x = Phaser.Math.Between(0, 1920);
                    particle.y = Phaser.Math.Between(800, 1200);
                    particle.alpha = alpha;
                }
            });
        }
        
        // 煌めくスター（点滅）
        for (let i = 0; i < 50; i++) {
            const x = Phaser.Math.Between(0, 1920);
            const y = Phaser.Math.Between(0, 1080);
            const size = Phaser.Math.Between(1, 3);
            const star = this.add.circle(x, y, size, 0xffffff, 0.05);
            
            // ランダムな点滅
            this.tweens.add({
                targets: star,
                alpha: { from: 0.05, to: Phaser.Math.FloatBetween(0.2, 0.5) },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Sine.InOut'
            });
        }
        
        // ゆっくり流れる光のストリーム
        for (let i = 0; i < 5; i++) {
            const streamY = Phaser.Math.Between(200, 900);
            const stream = this.add.graphics();
            stream.fillStyle(0x00d4aa, 0.03);
            stream.fillRect(-200, streamY, 200, 2);
            
            this.tweens.add({
                targets: stream,
                x: { from: -200, to: 2200 },
                duration: Phaser.Math.Between(15000, 25000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 10000)
            });
        }
        
        // =========================================================
        // 病院ロゴ（立体3D十字 - 回転アニメーション）
        // =========================================================
        this.crossContainer = this.add.container(centerX, 180);
        this.crossGraphics = this.add.graphics();
        this.crossContainer.add(this.crossGraphics);
        
        // 3D回転の状態
        this.crossRotation = 0;
        this.crossRotationSpeed = 0.015; // 回転速度
        
        // 初回描画
        this._draw3DCross(0);
        
        // =========================================================
        // 病院名（エレガントな書体）
        // =========================================================
        this.add.text(centerX, 300, '首切クリニック', {
            fontSize: '42px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa',
            letterSpacing: 8
        }).setOrigin(0.5);
        
        // サブテキスト
        this.add.text(centerX, 350, 'The clinic where people get fired', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#5a6a7a',
            letterSpacing: 6
        }).setOrigin(0.5);
        
        // 区切りライン
        const divider = this.add.graphics();
        divider.fillGradientStyle(0x00d4aa00, 0x00d4aa, 0x00d4aa, 0x00d4aa00, 0.5);
        divider.fillRect(centerX - 200, 390, 400, 2);
        
        // =========================================================
        // メインタイトル（インパクト重視）
        // =========================================================
        const titleContainer = this.add.container(centerX, 500);
        
        // タイトル背景（グラデーションバー）
        const titleBg = this.add.graphics();
        titleBg.fillGradientStyle(0x1a1a2e, 0x2d2d44, 0x2d2d44, 0x1a1a2e, 0.95);
        titleBg.fillRoundedRect(-480, -80, 960, 160, 4);
        titleBg.lineStyle(2, 0x00d4aa, 0.5);
        titleBg.strokeRoundedRect(-480, -80, 960, 160, 4);
        titleContainer.add(titleBg);
        
        // メインタイトル
        const mainTitle = this.add.text(0, -25, 'クビを回避せよ！', {
            fontSize: '72px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        titleContainer.add(mainTitle);
        
        // サブタイトル
        const subTitle = this.add.text(0, 45, '〜 病院受付シミュレーション 〜', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa'
        }).setOrigin(0.5);
        titleContainer.add(subTitle);
        
        // タイトルアニメーション（光のパルス）
        this.tweens.add({
            targets: mainTitle,
            alpha: { from: 1, to: 0.85 },
            duration: 2000,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.InOut'
        });
        
        // =========================================================
        // メニューボタン（3つ横並び）
        // =========================================================
        const buttonY = 700;
        const buttonSpacing = 340; // ボタン間の間隔を広げる (280 -> 340)
        
        // --- チュートリアルボタン（左） ---
        const tutorialBtn = this._createMenuButton(
            centerX - buttonSpacing, buttonY,
            '📖 チュートリアル',
            0x6c5ce7, // パープル
            0x8b7cf6,
            240, 60, // 幅を広げる (180 -> 240)
            () => {
                // チュートリアル開始（ノベルゲーム形式）
                this._startTutorial();
            }
        );
        
        // --- ゲームスタートボタン（中央・大） ---
        const startBtn = this._createMenuButton(
            centerX, buttonY,
            '▶ ゲームスタート',
            0x00d4aa, // ティール
            0x00ffcc,
            340, 70, // 幅を広げる (220 -> 340)
            () => {
                // ハイスコアチェック
                const savedHighScore = localStorage.getItem('hospitalReceptionHighScore');
                const highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
                
                if (highScore >= 1000) {
                    // 高難易度モード解禁済み -> 難易度選択へ
                    this._showDifficultySelection();
                } else {
                    // 通常スタート
                    this._startGame(false);
                }
            },
            true // メインボタンフラグ
        );
        
        // --- 設定ボタン（右） ---
        const settingsBtn = this._createMenuButton(
            centerX + buttonSpacing, buttonY,
            '⚙ 設定',
            0xe17055, // オレンジ
            0xf0826d,
            240, 60, // 幅を広げる (180 -> 240)
            () => {
                // 設定画面を開く
                this._openSettings();
            }
        );
        
        // 中央ボタンの浮遊アニメーション (削除: hover時にアニメーションさせるため)
        // this.tweens.add({
        //     targets: startBtn,
        //     y: { from: buttonY, to: buttonY + 8 },
        //     duration: 1500,
        //     yoyo: true,
        //     repeat: -1,
        //     ease: 'Sine.InOut'
        // });
        
        // =========================================================
        // 操作説明（ミニマルデザイン）
        // =========================================================
        const instructions = [
            '患者の受付から会計までを正確にこなせ',
            'ミスをするとペナルティ。高得点を獲得しクビを回避せよ！'
        ];
        
        instructions.forEach((text, i) => {
            this.add.text(centerX, 800 + i * 35, text, {
                fontSize: '20px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#7a8a9a'
            }).setOrigin(0.5);
        });
        
        // =========================================================
        // 🏆 ハイスコア表示 & 高難易度モード解禁通知
        // =========================================================
        const savedHighScore = localStorage.getItem('hospitalReceptionHighScore');
        const highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
        
        if (highScore > 0) {
            this.add.text(centerX, 875, `🏆 ハイスコア: ${highScore} 点`, {
                fontSize: '24px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFD700'
            }).setOrigin(0.5);
        }
        
        // 🔥 高難易度モード解禁通知
        if (highScore >= 1000) {
            this.add.text(centerX, 780, '★ ハードモード解禁済み ★', {
                fontSize: '16px',
                fontFamily: '"Noto Sans JP"',
                color: '#FF5555'
            }).setOrigin(0.5);
        }
        
        // =========================================================
        // キーボード入力
        // =========================================================
        const pressStartText = this.add.text(centerX, 920, '[ PRESS ENTER OR CLICK TO START ]', {
            fontSize: '16px',
            fontFamily: 'Arial, sans-serif',
            color: '#5a6a7a',
            letterSpacing: 4
        }).setOrigin(0.5);
        
        this.tweens.add({
            targets: pressStartText,
            alpha: { from: 1, to: 0.3 },
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
        
        // キーボードでゲームスタート
        this.startBtnRef = startBtn;
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.startBtnRef && this.startBtnRef._onClick) {
                this.startBtnRef._onClick();
            }
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.startBtnRef && this.startBtnRef._onClick) {
                this.startBtnRef._onClick();
            }
        });
        
        // =========================================================
        // フッター
        // =========================================================
        this.add.text(1880, 1050, 'v0.1 Prototype', {
            fontSize: '12px',
            fontFamily: 'Arial',
            color: '#3a4a5a'
        }).setOrigin(1);
        
        // 下部装飾ライン
        const bottomLine = this.add.graphics();
        bottomLine.fillGradientStyle(0x00d4aa00, 0x00d4aa, 0x00d4aa, 0x00d4aa00, 0.3);
        bottomLine.fillRect(0, 1077, 1920, 3);
    }
    
    // ==========================================================
    // SE再生ヘルパー
    // ==========================================================
    _playSE(key, volume = 0.5) {
        if (this.cache.audio.exists(key)) {
            this.sound.play(key, { volume: volume });
        }
    }
    
    // ==========================================================
    // フレーム更新（3D十字の回転）
    // ==========================================================
    update(time, delta) {
        if (!this.crossGraphics) return;
        
        // 回転角度を更新
        this.crossRotation += this.crossRotationSpeed;
        if (this.crossRotation > Math.PI * 2) {
            this.crossRotation -= Math.PI * 2;
        }
        
        // 3D十字を再描画
        this._draw3DCross(this.crossRotation);
    }
    
    // ==========================================================
    // 3D十字の描画
    // ==========================================================
    _draw3DCross(angle) {
        const g = this.crossGraphics;
        g.clear();
        
        // 3D効果のパラメータ
        const depth = 15; // 奥行き
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);
        
        // 見える幅（回転による圧縮）
        const scaleX = Math.abs(cosA);
        const sideVisible = sinA; // 側面の見え具合（-1〜1）
        
        // 十字のサイズ
        const armW = 60;  // 腕の幅
        const armH = 120; // 腕の高さ
        
        // 色の設定
        const frontColor = 0x00d4aa;    // 前面
        const sideColor = 0x009977;     // 側面（暗め）
        const innerColor = 0xffffff;    // 内側の白
        const innerSideColor = 0xcccccc; // 内側側面
        
        // --- 側面を先に描画（後ろに見える部分）---
        if (Math.abs(sideVisible) > 0.01) {
            const sideOffset = sideVisible * depth;
            
            // 側面の色
            g.fillStyle(sideColor, 1);
            
            if (sideVisible > 0) {
                // 右側面が見える
                // 縦の腕の右側面
                g.fillRect(armW/2 * scaleX, -armH/2, sideOffset, armH);
                // 横の腕の右側面
                g.fillRect(armH/2 * scaleX, -armW/2, sideOffset, armW);
            } else {
                // 左側面が見える
                // 縦の腕の左側面
                g.fillRect(-armW/2 * scaleX + sideOffset, -armH/2, -sideOffset, armH);
                // 横の腕の左側面
                g.fillRect(-armH/2 * scaleX + sideOffset, -armW/2, -sideOffset, armW);
            }
        }
        
        // --- 前面を描画 ---
        g.fillStyle(frontColor, 1);
        
        // 縦の腕
        g.fillRect(-armW/2 * scaleX, -armH/2, armW * scaleX, armH);
        // 横の腕
        g.fillRect(-armH/2 * scaleX, -armW/2, armH * scaleX, armW);
        
        // --- 内側の白い十字 ---
        const innerArmW = 40;
        const innerArmH = 100;
        
        // 内側側面
        if (Math.abs(sideVisible) > 0.01) {
            const innerSideOffset = sideVisible * (depth - 2);
            g.fillStyle(innerSideColor, 0.9);
            
            if (sideVisible > 0) {
                g.fillRect(innerArmW/2 * scaleX, -innerArmH/2, innerSideOffset * 0.5, innerArmH);
                g.fillRect(innerArmH/2 * scaleX, -innerArmW/2, innerSideOffset * 0.5, innerArmW);
            } else {
                g.fillRect(-innerArmW/2 * scaleX + innerSideOffset * 0.5, -innerArmH/2, -innerSideOffset * 0.5, innerArmH);
                g.fillRect(-innerArmH/2 * scaleX + innerSideOffset * 0.5, -innerArmW/2, -innerSideOffset * 0.5, innerArmW);
            }
        }
        
        // 内側前面
        g.fillStyle(innerColor, 0.9);
        g.fillRect(-innerArmW/2 * scaleX, -innerArmH/2, innerArmW * scaleX, innerArmH);
        g.fillRect(-innerArmH/2 * scaleX, -innerArmW/2, innerArmH * scaleX, innerArmW);
        
        // --- ハイライト（光沢） ---
        if (scaleX > 0.3) {
            g.fillStyle(0xffffff, 0.2 * scaleX);
            g.fillRect(-armW/4 * scaleX, -armH/2 + 5, armW/2 * scaleX, 20);
        }
    }
    
    // ==========================================================
    // メニューボタン生成
    // ==========================================================
    _createMenuButton(x, y, text, color, hoverColor, width, height, onClick, isMain = false) {
        const btn = this.add.container(x, y);
        btn._onClick = onClick; // コールバックを保存
        
        // ボタン外枠（グロー効果）
        const btnGlow = this.add.graphics();
        btnGlow.fillStyle(color, 0.15);
        btnGlow.fillRoundedRect(-width/2 - 10, -height/2 - 8, width + 20, height + 16, height/2 + 8);
        btn.add(btnGlow);
        
        // ボタン本体
        const btnBg = this.add.graphics();
        btnBg.fillStyle(color, 1);
        btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
        btn.add(btnBg);
        
        // ボタンテキスト
        const fontSize = isMain ? '28px' : '20px';
        const btnText = this.add.text(0, 0, text, {
            fontSize: fontSize,
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#0a1628'
        }).setOrigin(0.5);
        btn.add(btnText);
        
        // ヒットエリア
        const hitArea = this.add.rectangle(0, 0, width, height)
            .setInteractive({ useHandCursor: true });
        btn.add(hitArea);
        
        // 初期位置を保存
        btn.startY = y;

        // ホバーエフェクト
        hitArea.on('pointerover', () => {
            this._playSE('se_scroll', 0.3);
            
            // 既存のtweenを停止
            this.tweens.killTweensOf(btn);
            
            // スケール拡大 + 上下浮遊アニメーション開始
            this.tweens.add({
                targets: btn,
                scale: 1.08,
                duration: 150,
                ease: 'Back.Out'
            });
            
            // 浮遊 (yoyo)
            this.tweens.add({
                targets: btn,
                y: btn.startY + 5, // 少し沈む動き
                duration: 600,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });

            btnBg.clear();
            btnBg.fillStyle(hoverColor, 1);
            btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
        });
        
        hitArea.on('pointerout', () => {
            // 既存のtweenを停止してリセット
            this.tweens.killTweensOf(btn);
            
            this.tweens.add({
                targets: btn,
                scale: 1.0,
                y: btn.startY, // 元の位置に戻す
                duration: 150,
                ease: 'Linear'
            });
            
            btnBg.clear();
            btnBg.fillStyle(color, 1);
            btnBg.fillRoundedRect(-width/2, -height/2, width, height, height/2);
        });
        
        // クリック
        hitArea.on('pointerdown', () => {
            this._playSE('se_changesean', 0.6);
            
            // アニメーションを停止
            this.tweens.killTweensOf(btn);
            
            // クリック効果（視覚的フィードバック）
            this.tweens.add({
                targets: btn,
                scale: 0.95,
                duration: 100,
                yoyo: true
            });
            
            // onClickを即座に実行（アニメーション完了を待たない）
            if (onClick) onClick();
        });
        
        return btn;
    }
    
    // ==========================================================
    // チュートリアル開始
    // ==========================================================
    _startTutorial() {
        // BGMをフェードアウト
        if (this.titleBgm) {
            this.tweens.add({
                targets: this.titleBgm,
                volume: 0,
                duration: 500
            });
        }
        
        // チュートリアルシーンへ（まだ未実装の場合はアラート表示）
        if (this.scene.get('TutorialScene')) {
            this.slideToScene('TutorialScene', 'left');
        } else {
            // 仮：チュートリアルモーダルを表示
            this._showTutorialModal();
        }
    }
    
    // ==========================================================
    // チュートリアルモーダル（仮実装）
    // ==========================================================
    _showTutorialModal() {
        const centerX = 960;
        const centerY = 540;
        
        // オーバーレイ
        const overlay = this.add.rectangle(centerX, centerY, 1920, 1080, 0x000000, 0.7)
            .setInteractive()
            .setDepth(1000);
        
        // モーダルパネル
        const panel = this.add.graphics().setDepth(1001);
        panel.fillStyle(0x1a1a2e, 0.98);
        panel.fillRoundedRect(centerX - 400, centerY - 300, 800, 600, 20);
        panel.lineStyle(2, 0x6c5ce7, 0.8);
        panel.strokeRoundedRect(centerX - 400, centerY - 300, 800, 600, 20);
        
        // タイトル
        const title = this.add.text(centerX, centerY - 240, '📖 チュートリアル', {
            fontSize: '36px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#6c5ce7'
        }).setOrigin(0.5).setDepth(1002);
        
        // チュートリアル内容
        const tutorialContent = [
            '【基本操作】',
            '',
            '1. 患者が来院したら、まず保険証を確認',
            '2. カルテ棚から該当カルテを探す',
            '3. 正しい情報を入力して受付を完了',
            '4. 会計処理を行い、領収書を発行',
            '',
            '【ポイント】',
            '・正確さとスピードが重要！',
            '・ミスをするとペナルティ',
            '・高得点を目指してクビを回避しよう！'
        ];
        
        const tutorialTexts = [];
        tutorialContent.forEach((line, i) => {
            const t = this.add.text(centerX - 320, centerY - 160 + i * 32, line, {
                fontSize: '20px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: line.startsWith('【') ? '#00d4aa' : '#ffffff'
            }).setDepth(1002);
            tutorialTexts.push(t);
        });
        
        // 閉じるボタン
        const closeBtn = this._createModalButton(centerX, centerY + 220, '閉じる', 0x6c5ce7, () => {
            overlay.destroy();
            panel.destroy();
            title.destroy();
            tutorialTexts.forEach(t => t.destroy());
            closeBtn.destroy();
        });
        closeBtn.setDepth(1002);
    }
    
    // ==========================================================
    // 設定画面を開く
    // ==========================================================
    _openSettings() {
        const centerX = 960;
        const centerY = 540;
        
        // 音量設定をグローバルに保存（初期化）- 統一されたキーを使用
        if (!this.registry.has(VOLUME_KEYS.BGM)) {
            this.registry.set(VOLUME_KEYS.BGM, DEFAULT_VOLUMES.BGM);
        }
        if (!this.registry.has(VOLUME_KEYS.SE)) {
            this.registry.set(VOLUME_KEYS.SE, DEFAULT_VOLUMES.SE);
        }
        if (!this.registry.has(VOLUME_KEYS.VOICE)) {
            this.registry.set(VOLUME_KEYS.VOICE, DEFAULT_VOLUMES.VOICE);
        }
        
        // オーバーレイ
        const overlay = this.add.rectangle(centerX, centerY, 1920, 1080, 0x000000, 0.7)
            .setInteractive()
            .setDepth(1000);
        
        // モーダルパネル（高さ拡大）
        const panel = this.add.graphics().setDepth(1001);
        panel.fillStyle(0x1a1a2e, 0.98);
        panel.fillRoundedRect(centerX - 420, centerY - 400, 840, 800, 20);
        panel.lineStyle(2, 0xe17055, 0.8);
        panel.strokeRoundedRect(centerX - 420, centerY - 400, 840, 800, 20);
        
        // タイトル
        const title = this.add.text(centerX, centerY - 340, '⚙ 設定', {
            fontSize: '36px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#e17055'
        }).setOrigin(0.5).setDepth(1002);
        
        // 設定メニューコンテナ
        this.settingsElements = [overlay, panel, title];
        
        // ===========================================
        // BGM音量
        // ===========================================
        this._createVolumeSlider(
            centerX, centerY - 200,
            '🎵 BGM音量',
            VOLUME_KEYS.BGM,
            0x00d4aa,
            (newVol) => {
                // BGMの音量を即座に反映
                if (this.titleBgm) {
                    this.titleBgm.setVolume(newVol);
                }
            }
        );
        
        // ===========================================
        // SE音量
        // ===========================================
        this._createVolumeSlider(
            centerX, centerY - 120,
            '🔔 SE音量',
            VOLUME_KEYS.SE,
            0x74b9ff,
            (newVol) => {
                // テストSE再生
                this._playSE('se_scroll', newVol);
            }
        );
        
        // ===========================================
        // ボイス音量
        // ===========================================
        this._createVolumeSlider(
            centerX, centerY - 40,
            '🎤 ボイス音量',
            VOLUME_KEYS.VOICE,
            0xa29bfe,
            (newVol) => {
                // 再生中のボイスがあれば音量を反映
                this.sound.sounds.forEach(sound => {
                    if (sound.isPlaying && sound.key.startsWith('novel_vc_')) {
                        sound.setVolume(newVol);
                    }
                });
            }
        );
        
        // ===========================================
        // 区切りライン
        // ===========================================
        const dividerLine = this.add.graphics().setDepth(1002);
        dividerLine.fillGradientStyle(0xffffff00, 0xffffff, 0xffffff, 0xffffff00, 0.3);
        dividerLine.fillRect(centerX - 300, centerY + 50, 600, 2);
        this.settingsElements.push(dividerLine);
        
        // --- 薬辞典ボタン ---
        const medicineDictBtn = this._createModalButton(centerX, centerY + 120, '💊 薬辞典', 0x00b894, () => {
            this._closeSettings();
            this._showMedicineDictionaryPanel();
        });
        medicineDictBtn.setDepth(1002);
        this.settingsElements.push(medicineDictBtn);

        // --- クレジットボタン ---
        const creditsBtn = this._createModalButton(centerX, centerY + 200, 'クレジット', 0x6c5ce7, () => {
            this._closeSettings();
            this._showCreditsPanel();
        });
        creditsBtn.setDepth(1002);
        this.settingsElements.push(creditsBtn);
        
        // --- 閉じるボタン ---
        const closeBtn = this._createModalButton(centerX, centerY + 280, '閉じる', 0xe17055, () => {
            this._closeSettings();
        });
        closeBtn.setDepth(1002);
        this.settingsElements.push(closeBtn);
    }
    
    // ==========================================================
    // 音量スライダー生成（レイアウト改善版）
    // ==========================================================
    _createVolumeSlider(x, y, label, registryKey, color, onChange, isDisabled = false) {
        const sliderWidth = 300;  // スライダー幅
        const labelWidth = 140;   // ラベル幅
        const btnSize = 40;       // ボタンサイズ
        const percentWidth = 50;  // パーセント表示幅
        
        // 全体の幅を計算して中央揃え
        // ラベル | - | スライダー | + | %
        // 140 + 50 + 300 + 50 + 50 = 590
        const totalWidth = labelWidth + btnSize + sliderWidth + btnSize + percentWidth + 40; // 580
        const startX = x - totalWidth / 2;
        
        // ラベル（左揃え）
        const labelText = this.add.text(startX, y, label, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: isDisabled ? '#7a7a8a' : '#ffffff'
        }).setOrigin(0, 0.5).setDepth(1002);
        this.settingsElements.push(labelText);
        
        // マイナスボタン位置
        const minusBtnX = startX + labelWidth + btnSize / 2 + 10;
        
        // スライダー開始位置
        const sliderStartX = minusBtnX + btnSize / 2 + 15;
        
        // スライダー背景
        const sliderBg = this.add.graphics().setDepth(1002);
        sliderBg.fillStyle(0x3a3a5a, 1);
        sliderBg.fillRoundedRect(sliderStartX, y - 8, sliderWidth, 16, 8);
        this.settingsElements.push(sliderBg);
        
        // スライダー塗りつぶし
        const currentVolume = this.registry.get(registryKey) || 0.5;
        const sliderFill = this.add.graphics().setDepth(1003);
        sliderFill.fillStyle(isDisabled ? 0x5a5a6a : color, 1);
        sliderFill.fillRoundedRect(sliderStartX, y - 8, sliderWidth * currentVolume, 16, 8);
        this.settingsElements.push(sliderFill);
        
        // プラスボタン位置
        const plusBtnX = sliderStartX + sliderWidth + btnSize / 2 + 15;
        
        // パーセント表示
        const percentX = plusBtnX + btnSize / 2 + 15;
        const percentText = this.add.text(percentX, y, `${Math.round(currentVolume * 100)}%`, {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: isDisabled ? '#5a5a6a' : '#ffffff'
        }).setOrigin(0, 0.5).setDepth(1002);
        this.settingsElements.push(percentText);
        
        if (!isDisabled) {
            // マイナスボタン
            const minusBtn = this._createSmallButton(minusBtnX, y, '－', 0x5a5a7a, () => {
                let vol = this.registry.get(registryKey);
                vol = Math.max(0, Math.round((vol - 0.1) * 10) / 10);
                this.registry.set(registryKey, vol);
                
                sliderFill.clear();
                sliderFill.fillStyle(color, 1);
                sliderFill.fillRoundedRect(sliderStartX, y - 8, sliderWidth * vol, 16, 8);
                percentText.setText(`${Math.round(vol * 100)}%`);
                
                if (onChange) onChange(vol);
            });
            minusBtn.setDepth(1003);
            this.settingsElements.push(minusBtn);
            
            // プラスボタン
            const plusBtn = this._createSmallButton(plusBtnX, y, '＋', 0x5a5a7a, () => {
                let vol = this.registry.get(registryKey);
                vol = Math.min(1, Math.round((vol + 0.1) * 10) / 10);
                this.registry.set(registryKey, vol);
                
                sliderFill.clear();
                sliderFill.fillStyle(color, 1);
                sliderFill.fillRoundedRect(sliderStartX, y - 8, sliderWidth * vol, 16, 8);
                percentText.setText(`${Math.round(vol * 100)}%`);
                
                if (onChange) onChange(vol);
            });
            plusBtn.setDepth(1003);
            this.settingsElements.push(plusBtn);
        }
    }
    
    // ==========================================================
    // 小さいボタン（＋/－用）
    // ==========================================================
    _createSmallButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(color, 1);
        btnBg.fillRoundedRect(-25, -20, 50, 40, 10);
        btn.add(btnBg);
        
        const btnText = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(btnText);
        
        const hitArea = this.add.rectangle(0, 0, 50, 40)
            .setInteractive({ useHandCursor: true });
        btn.add(hitArea);
        
        hitArea.on('pointerover', () => {
            btn.setScale(1.1);
        });
        
        hitArea.on('pointerout', () => {
            btn.setScale(1.0);
        });
        
        hitArea.on('pointerdown', () => {
            if (onClick) onClick();
        });
        
        return btn;
    }
    
    // ==========================================================
    // 設定画面を閉じる
    // ==========================================================
    _closeSettings() {
        if (this.settingsElements) {
            this.settingsElements.forEach(el => {
                if (el && el.destroy) el.destroy();
            });
            this.settingsElements = null;
        }
    }
    
    // ==========================================================
    // モーダル用ボタン生成
    // ==========================================================
    _createModalButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(color, 1);
        btnBg.fillRoundedRect(-100, -25, 200, 50, 25);
        btn.add(btnBg);
        
        const btnText = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(btnText);
        
        const hitArea = this.add.rectangle(0, 0, 200, 50)
            .setInteractive({ useHandCursor: true });
        btn.add(hitArea);
        
        hitArea.on('pointerover', () => {
            this._playSE('se_scroll', 0.2);
            btn.setScale(1.05);
        });
        
        hitArea.on('pointerout', () => {
            btn.setScale(1.0);
        });
        
        hitArea.on('pointerdown', () => {
            this._playSE('se_changesean', 0.5);
            if (onClick) onClick();
        });
        
        return btn;
    }
    
    // ==========================================================
    // 薬辞典パネル表示（CheckSceneと同じ書式）
    // ==========================================================
    _showMedicineDictionaryPanel() {
        // 既存のパネルがあれば閉じる
        if (this.medicineListPanel) {
            this.medicineListPanel.destroy();
            this.medicineListPanel = null;
            return;
        }
        
        // 薬データを取得
        this.medicineData = this.cache.json.get('medicineData') || [];
        this.chineseMedicineData = this.cache.json.get('chineseMedicineData') || [];
        
        if (this.medicineData.length === 0 && this.chineseMedicineData.length === 0) {
            const errorMsg = this.add.text(960, 540, '薬データを読み込み中...', {
                fontSize: '24px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#ff6b6b',
                backgroundColor: '#2c2c3e',
                padding: { x: 20, y: 10 }
            }).setOrigin(0.5).setDepth(3000);
            
            this.time.delayedCall(2000, () => errorMsg.destroy());
            return;
        }
        
        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;
        const panelW = 600;
        const panelH = 750;
        
        // 50音順にソート（初期は西洋薬のみ）
        const sortedMeds = [...this.medicineData].sort((a, b) => {
            const nameA = a['偽商品名'] || a['商品名'] || '';
            const nameB = b['偽商品名'] || b['商品名'] || '';
            return nameA.localeCompare(nameB, 'ja');
        });
        
        // 50音の行でグループ化
        const groupByGojuon = (name) => {
            if (!name) return 'その他';
            const first = name.charAt(0);
            const gojuon = [
                ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
                ['か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご', 'カ', 'キ', 'ク', 'ケ', 'コ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
                ['さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
                ['た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
                ['な', 'に', 'ぬ', 'ね', 'の', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
                ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ'],
                ['ま', 'み', 'む', 'め', 'も', 'マ', 'ミ', 'ム', 'メ', 'モ'],
                ['や', 'ゆ', 'よ', 'ヤ', 'ユ', 'ヨ'],
                ['ら', 'り', 'る', 'れ', 'ろ', 'ラ', 'リ', 'ル', 'レ', 'ロ'],
                ['わ', 'を', 'ん', 'ワ', 'ヲ', 'ン']
            ];
            const labels = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
            for (let i = 0; i < gojuon.length; i++) {
                if (gojuon[i].includes(first)) return labels[i];
            }
            return 'その他';
        };
        
        // ページング設定（10件/ページ）
        const itemsPerPage = 10;
        this.medListCurrentPage = 0;
        this.medListSortedData = sortedMeds;
        this.medListTotalPages = Math.ceil(sortedMeds.length / itemsPerPage);
        
        const container = this.add.container(screenW / 2, screenH / 2).setDepth(2000);
        
        // パネル背景（インタラクティブにして背後の要素へのクリックをブロック）
        const bg = this.add.rectangle(0, 0, panelW, panelH, 0xFFFFFF, 1)
            .setStrokeStyle(4, 0x333333)
            .setInteractive(); // クリックを吸収
        
        // ヘッダー（ドラッグ用、クリックでは閉じない）
        const headerH = 60;
        const headerY = -panelH/2 + headerH/2;
        const header = this.add.rectangle(0, headerY, panelW, headerH, 0x2C3E50);
        
        // タイトル（左側）- ボタン風の装飾
        const titleBg = this.add.rectangle(-panelW/2 + 85, headerY, 160, 40, 0x34495E)
            .setStrokeStyle(2, 0xFFFFFF);
        const title = this.add.text(-panelW/2 + 85, headerY, '📖 薬辞典', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 閉じるボタン（右端）- ヒットエリア拡大
        const closeBtnBg = this.add.rectangle(panelW/2 - 25, headerY, 50, 50, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        const closeBtn = this.add.text(panelW/2 - 25, headerY, '✕', {
            fontSize: '28px', color: '#FFFFFF'
        }).setOrigin(0.5);
        
        closeBtnBg.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtnBg.on('pointerout', () => closeBtn.setScale(1.0));
        closeBtnBg.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            container.destroy();
            this.medicineListPanel = null;
        });
        
        container.add([bg, header, titleBg, title, closeBtnBg, closeBtn]);
        
        // --- タブボタン（ヘッダー右側に配置） ---
        this.currentMedTab = 'western'; // 'western' or 'kampo'
        
        // タブ設定
        const tabW = 100;
        const tabH = 36;
        const tabY = headerY;
        const westernX = panelW/2 - 240; // 閉じるボタンの左
        const kampoX = panelW/2 - 130;
        
        const westernTabBg = this.add.rectangle(westernX, tabY, tabW, tabH, 0x3498DB)
            .setStrokeStyle(2, 0xFFFFFF)
            .setInteractive({ useHandCursor: true });
        const westernTabText = this.add.text(westernX, tabY, '西洋薬', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF'
        }).setOrigin(0.5);
        
        const kampoTabBg = this.add.rectangle(kampoX, tabY, tabW, tabH, 0x95A5A6)
            .setStrokeStyle(1, 0xAAAAAA)
            .setInteractive({ useHandCursor: true });
        const kampoTabText = this.add.text(kampoX, tabY, '漢方薬', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#DDDDDD'
        }).setOrigin(0.5);
        
        const updateTabStyle = () => {
            if (this.currentMedTab === 'western') {
                westernTabBg.setFillStyle(0x3498DB).setStrokeStyle(2, 0xFFFFFF);
                westernTabText.setColor('#FFFFFF');
                kampoTabBg.setFillStyle(0x95A5A6).setStrokeStyle(1, 0xAAAAAA);
                kampoTabText.setColor('#DDDDDD');
                
                this.medListSortedData = [...this.medicineData].sort((a, b) => {
                    const nameA = a['偽商品名'] || a['商品名'] || '';
                    const nameB = b['偽商品名'] || b['商品名'] || '';
                    return nameA.localeCompare(nameB, 'ja');
                });
            } else {
                westernTabBg.setFillStyle(0x95A5A6).setStrokeStyle(1, 0xAAAAAA);
                westernTabText.setColor('#DDDDDD');
                kampoTabBg.setFillStyle(0x27AE60).setStrokeStyle(2, 0xFFFFFF);
                kampoTabText.setColor('#FFFFFF');
                
                this.medListSortedData = [...this.chineseMedicineData].sort((a, b) => {
                    // 番号順にソート（カルテの「シモムラ41」と一致させるため）
                    const numA = parseInt(a['番号']) || 999;
                    const numB = parseInt(b['番号']) || 999;
                    return numA - numB;
                });
            }
            this.medListTotalPages = Math.ceil(this.medListSortedData.length / itemsPerPage);
            this.medListCurrentPage = 0;
            this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
        };
        
        westernTabBg.on('pointerdown', () => {
            if (this.currentMedTab !== 'western') {
                this._playSE('se_paper', 0.5);
                this.currentMedTab = 'western';
                updateTabStyle();
            }
        });
        westernTabBg.on('pointerover', () => westernTabBg.setScale(1.05));
        westernTabBg.on('pointerout', () => westernTabBg.setScale(1.0));
        
        kampoTabBg.on('pointerdown', () => {
            if (this.currentMedTab !== 'kampo') {
                this._playSE('se_paper', 0.5);
                this.currentMedTab = 'kampo';
                updateTabStyle();
            }
        });
        kampoTabBg.on('pointerover', () => kampoTabBg.setScale(1.05));
        kampoTabBg.on('pointerout', () => kampoTabBg.setScale(1.0));
        
        container.add([westernTabBg, westernTabText, kampoTabBg, kampoTabText]);
        
        // パネル全体をドラッグ可能にする（ヘッダーをドラッグハンドルとして使用）
        const dragHandle = this.add.rectangle(0, headerY, panelW, headerH, 0x000000, 0)
            .setInteractive({ useHandCursor: true, draggable: true });
        container.add(dragHandle);
        container.bringToTop(dragHandle);
        container.bringToTop(westernTabBg);
        container.bringToTop(westernTabText);
        container.bringToTop(kampoTabBg);
        container.bringToTop(kampoTabText);
        container.bringToTop(closeBtnBg);
        container.bringToTop(closeBtn);
        
        // ドラッグ開始時のオフセットを記録
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        dragHandle.on('dragstart', (pointer) => {
            dragOffsetX = pointer.x - container.x;
            dragOffsetY = pointer.y - container.y;
        });
        
        dragHandle.on('drag', (pointer) => {
            container.x = pointer.x - dragOffsetX;
            container.y = pointer.y - dragOffsetY;
        });
        
        // リスト表示エリア
        this.medListContainer = this.add.container(0, 0);
        container.add(this.medListContainer);
        
        // ページネーションボタン
        const pageY = panelH/2 - 50;
        
        // 5ページ戻るボタン
        const prev5Btn = this.add.text(-200, pageY, '◀◀5', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#2980B9', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        prev5Btn.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            this.medListCurrentPage = Math.max(0, this.medListCurrentPage - 5);
            this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
        });
        prev5Btn.on('pointerover', () => prev5Btn.setScale(1.1));
        prev5Btn.on('pointerout', () => prev5Btn.setScale(1.0));
        
        // 1ページ戻るボタン
        const prevBtn = this.add.text(-100, pageY, '◀前', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#3498DB', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        prevBtn.on('pointerdown', () => {
            if (this.medListCurrentPage > 0) {
                this._playSE('se_paper', 0.5);
                this.medListCurrentPage--;
                this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
            }
        });
        prevBtn.on('pointerover', () => prevBtn.setScale(1.1));
        prevBtn.on('pointerout', () => prevBtn.setScale(1.0));
        
        // 1ページ進むボタン
        const nextBtn = this.add.text(100, pageY, '次▶', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#3498DB', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        nextBtn.on('pointerdown', () => {
            if (this.medListCurrentPage < this.medListTotalPages - 1) {
                this._playSE('se_paper', 0.5);
                this.medListCurrentPage++;
                this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
            }
        });
        nextBtn.on('pointerover', () => nextBtn.setScale(1.1));
        nextBtn.on('pointerout', () => nextBtn.setScale(1.0));
        
        // 5ページ進むボタン
        const next5Btn = this.add.text(200, pageY, '5▶▶', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#2980B9', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        next5Btn.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            this.medListCurrentPage = Math.min(this.medListTotalPages - 1, this.medListCurrentPage + 5);
            this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
        });
        next5Btn.on('pointerover', () => next5Btn.setScale(1.1));
        next5Btn.on('pointerout', () => next5Btn.setScale(1.0));
        
        this.medListPageIndicator = this.add.text(0, pageY, '', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333'
        }).setOrigin(0.5);
        
        container.add([prev5Btn, prevBtn, nextBtn, next5Btn, this.medListPageIndicator]);
        
        // 初期ページ表示
        this._updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage);
        
        this.medicineListPanel = container;
    }

    // ==========================================================
    // 薬一覧ページ更新（カード形式+詳細情報）
    // ==========================================================
    _updateMedicineListPage(panelW, panelH, groupByGojuon, itemsPerPage) {
        if (!this.medListContainer) return;
        this.medListContainer.removeAll(true);
        
        const startIdx = this.medListCurrentPage * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, this.medListSortedData.length);
        const pageMeds = this.medListSortedData.slice(startIdx, endIdx);
        
        const listStartY = -panelH/2 + 90; // リスト開始位置を上に移動してはみ出し防止
        const cardHeight = 57; 
        const cardWidth = panelW - 60;
        
        pageMeds.forEach((med, i) => {
            const y = listStartY + (i * cardHeight);
            const fakeName = med['偽商品名'] || med['商品名'] || '(名前なし)';
            const group = groupByGojuon(fakeName);
            
            // --- カードコンテナ ---
            const card = this.add.container(0, y + 32).setDepth(2001);
            
            // カード背景（漢方薬は緑系に）
            const bgColor = this.currentMedTab === 'kampo' ? 0xE8F5E9 : 0xF8F9FA;
            const strokeColor = this.currentMedTab === 'kampo' ? 0x81C784 : 0xE0E0E0;
            const cardBg = this.add.rectangle(0, 0, cardWidth, cardHeight - 6, bgColor)
                .setStrokeStyle(2, strokeColor);
            
            if (this.currentMedTab === 'kampo') {
                // --- 漢方薬の表示: 番号、メーカー、偽商品名、タイミング ---
                const fakeMaker = med['偽メーカー'] || '';
                const medNumber = med['番号'] || '?';  // JSONデータの実際の番号を使用
                const timing = med['服用タイミング'] || med['タイミング'] || '';
                
                // 番号を大きく濃く（漢方薬専用）- 実際の薬番号を表示
                const kampoNumText = this.add.text(-cardWidth/2 + 15, 0, `${medNumber}.`, {
                    fontSize: '20px', color: '#333333', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(0, 0.5);
                
                // メーカー名（大きく）- 少し右に寄せる
                const makerText = this.add.text(-cardWidth/2 + 70, 0, fakeMaker, {
                    fontSize: '18px', color: '#27AE60', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(0, 0.5);
                
                // 商品名（大きく、見やすく）
                const nameText = this.add.text(-cardWidth/2 + 200, 0, fakeName, {
                    fontSize: '22px', fontFamily: '"Noto Sans JP", sans-serif', color: '#2C3E50'
                }).setOrigin(0, 0.5);
                
                // タイミング（右端に表示）
                const timingText = this.add.text(cardWidth/2 - 15, 0, timing, {
                    fontSize: '16px', color: '#E67E22', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(1, 0.5);
                
                card.add([cardBg, kampoNumText, makerText, nameText, timingText]);
            } else {
                // --- 西洋薬の表示: 五十音ラベル + 商品名、一般名、適応など ---
                const fakeGeneral = med['偽一般名'] || '(一般名なし)';
                
                // 行番号（西洋薬のみ）
                const numText = this.add.text(-cardWidth/2 + 10, -15, `${startIdx + i + 1}.`, {
                    fontSize: '12px', color: '#888888'
                });
                
                // 五十音ラベル（あ、か、さ等）
                const gojuonLabel = this.add.text(-cardWidth/2 + 40, -5, `【${group}】`, {
                    fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#E74C3C'
                }).setOrigin(0, 0.5);
                
                // 商品名（五十音ラベルの右側）
                const nameText = this.add.text(-cardWidth/2 + 90, -5, fakeName, {
                    fontSize: '20px', fontFamily: '"Noto Sans JP", sans-serif', color: '#2C3E50'
                }).setOrigin(0, 0.5);
                
                // 右側：一般名＋その他
                const rightX = 50;
                
                const generalText = this.add.text(rightX, -15, `一般名: ${fakeGeneral}`, {
                    fontSize: '14px', color: '#7B68EE', fontFamily: '"Noto Sans JP", sans-serif'
                });
                
                const indication = med['主な適応'] || '';
                const dosage = med['1日の服用量'] || '';
                const timing = med['服用タイミング'] || '';
                
                const detailText = this.add.text(rightX, 5, `📋 ${indication}  💊 ${dosage} / ${timing}`, {
                    fontSize: '12px', color: '#555555'
                });
                
                card.add([cardBg, numText, gojuonLabel, nameText, generalText, detailText]);
            }
            
            this.medListContainer.add(card);
        });
        
        // ページインジケータ更新
        if (this.medListPageIndicator) {
            this.medListPageIndicator.setText(`${this.medListCurrentPage + 1} / ${this.medListTotalPages} ページ`);
        }
    }

    // ==========================================================
    // クレジットパネル表示
    // ==========================================================
    _showCreditsPanel() {
        const centerX = 960;
        const centerY = 540;

        // オーバーレイ
        const overlay = this.add.rectangle(centerX, centerY, 1920, 1080, 0x000000, 0.7)
            .setInteractive()
            .setDepth(2000);

        // パネル
        const panel = this.add.graphics().setDepth(2001);
        panel.fillStyle(0x1a1a2e, 0.98);
        panel.fillRoundedRect(centerX - 300, centerY - 250, 600, 500, 20);
        panel.lineStyle(2, 0x6c5ce7, 0.8);
        panel.strokeRoundedRect(centerX - 300, centerY - 250, 600, 500, 20);

        // タイトル
        const title = this.add.text(centerX, centerY - 180, 'クレジット', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#6c5ce7'
        }).setOrigin(0.5).setDepth(2002);

        // クレジット内容（2カラムレイアウトで統一感を出す）
        const credits = [
            { label: 'トリアージCV', value: '春日部つむぎ' },
            { label: '音楽', value: '魔王魂' },
            { label: '効果音', value: '効果音ラボ' },
        ];
        const productionCredit = { label: '制作', value: 'SaiKa' };
        
        const creditElements = [];
        const labelX = centerX - 80;   // ラベルの右端
        const valueX = centerX + 10;   // 値の左端
        const lineHeight = 45;
        let startY = centerY - 70;
        
        credits.forEach((credit, i) => {
            const y = startY + i * lineHeight;
            
            const labelText = this.add.text(labelX, y, credit.label, {
                fontSize: '24px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#ffffff'
            }).setOrigin(1, 0.5).setDepth(2002);
            
            const valueText = this.add.text(valueX, y, credit.value, {
                fontSize: '24px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#ffffff'
            }).setOrigin(0, 0.5).setDepth(2002);
            
            creditElements.push(labelText, valueText);
        });
        
        // 制作クレジット（少し下に配置）
        const productionY = startY + credits.length * lineHeight + 50;
        
        const productionLabel = this.add.text(labelX, productionY, productionCredit.label, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(1, 0.5).setDepth(2002);
        
        const productionValue = this.add.text(valueX, productionY, productionCredit.value, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0, 0.5).setDepth(2002);
        
        creditElements.push(productionLabel, productionValue);

        // 閉じるボタン
        const closeBtn = this._createModalButton(centerX, centerY + 180, '閉じる', 0xe17055, () => {
            overlay.destroy();
            panel.destroy();
            title.destroy();
            creditElements.forEach(el => el.destroy());
            closeBtn.destroy();
            // 設定画面に戻るか、そのまま閉じるか。今回はそのまま閉じる（設定画面に戻りたければ _openSettings() を呼ぶ）
            this._openSettings();
        });
        closeBtn.setDepth(2002);
    }
    // ==========================================================
    // 難易度選択ポップアップ
    // ==========================================================
    _showDifficultySelection() {
        const centerX = 960;
        const centerY = 540;
        
        // 高難易度解放チェック
        const tutorialCompleted = localStorage.getItem('tutorialCompleted') === 'true';
        const hardModeUnlocked = tutorialCompleted;

        // オーバーレイ
        const overlay = this.add.rectangle(centerX, centerY, 1920, 1080, 0x000000, 0.7)
            .setInteractive()
            .setDepth(3000);

        // コンテナ
        const container = this.add.container(centerX, centerY).setDepth(3001);
        
        // 背景（エンドレスモード追加で少し大きく）
        const bg = this.add.graphics();
        bg.fillStyle(0x1a1a2e, 0.95);
        bg.fillRoundedRect(-300, -250, 600, 500, 16);
        bg.lineStyle(2, 0x00d4aa, 0.8);
        bg.strokeRoundedRect(-300, -250, 600, 500, 16);
        container.add(bg);

        // タイトル
        const title = this.add.text(0, -190, '難易度を選択してください', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(title);

        // 通常モードボタン
        const normalBtn = this._createDifficultyButton(0, -90, '通常モード', 0x00d4aa, () => {
             this._playSE('se_changesean');
             overlay.destroy();
             container.destroy();
             this._startGame(false, false);
        });
        container.add(normalBtn);
        
        // 高難易度モードボタン
        const hardBtn = this._createDifficultyButton(0, 10, '🔥 ハードモード', 0xd63031, () => {
             this._playSE('se_changesean');
             overlay.destroy();
             container.destroy();
             this._startGame(true, false);
        });
        container.add(hardBtn);
        
        // エンドレスモードボタン（高難易度と同時解放）
        const endlessBtn = this._createDifficultyButton(0, 110, '♾️ エンドレスモード', 0x9b59b6, () => {
             this._playSE('se_changesean');
             overlay.destroy();
             container.destroy();
             this._startGame(false, true);
        });
        container.add(endlessBtn);
        
        // 解放されていない場合はグレーアウト
        if (!hardModeUnlocked) {
            // 高難易度モード
            hardBtn.setAlpha(0.4);
            hardBtn.list.forEach(child => {
                if (child.disableInteractive) child.disableInteractive();
            });
            const hardLockText = this.add.text(0, 10, '🔒 チュートリアル完了で解放', {
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#888888'
            }).setOrigin(0.5);
            container.add(hardLockText);
            
            // エンドレスモード
            endlessBtn.setAlpha(0.4);
            endlessBtn.list.forEach(child => {
                if (child.disableInteractive) child.disableInteractive();
            });
            const endlessLockText = this.add.text(0, 110, '🔒 チュートリアル完了で解放', {
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#888888'
            }).setOrigin(0.5);
            container.add(endlessLockText);
        }
        
        // キャンセルボタン
        const cancelBtnText = this.add.text(0, 200, 'キャンセル', {
             fontSize: '20px',
             color: '#aaaaaa',
             fontFamily: '"Noto Sans JP"'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        cancelBtnText.on('pointerdown', () => {
             this._playSE('se_scroll');
             overlay.destroy();
             container.destroy();
        });
        container.add(cancelBtnText);
        
        // アニメーション
        container.setScale(0.8);
        container.setAlpha(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.Out'
        });
    }

    _createDifficultyButton(x, y, text, color, onClick) {
        const btnContainer = this.add.container(x, y);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(color, 1);
        btnBg.fillRoundedRect(-200, -30, 400, 60, 8);
        
        const btnText = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        
        const hitArea = this.add.rectangle(0, 0, 400, 60).setInteractive({ useHandCursor: true });
        
        hitArea.on('pointerdown', onClick);
        hitArea.on('pointerover', () => btnContainer.setScale(1.05));
        hitArea.on('pointerout', () => btnContainer.setScale(1.0));
        
        btnContainer.add([btnBg, btnText, hitArea]);
        return btnContainer;
    }

    // ==========================================================
    // ゲーム開始処理
    // ==========================================================
    _startGame(isHardMode, isEndlessMode = false) {
        // BGMをフェードアウト
        if (this.titleBgm) {
            this.tweens.add({
                targets: this.titleBgm,
                volume: 0,
                duration: 500
            });
        }
        
        // 難易度設定
        this.registry.set('hardMode', isHardMode);
        this.registry.set('isEndlessMode', isEndlessMode);
        
        // GameStateManagerにエンドレスモードを設定
        import('./GameStateManager.js').then(({ GameStateManager }) => {
            const gameState = GameStateManager.getInstance(this.game);
            gameState.setEndlessMode(isEndlessMode);
            
            // 💚 ハードモード: HPリセット
            if (isHardMode) {
                gameState.resetHp();
            }
        });
        
        console.log(`[TitleScene] ゲーム開始 - ハードモード: ${isHardMode}, エンドレス: ${isEndlessMode}`);
        
        // シーン遷移
        this.slideToScene('ReceptionScene', 'left');
    }
}
