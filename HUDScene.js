import { EventBus, GameEvents } from './EventBus.js';
import { GameStateManager } from './GameStateManager.js';
import { TutorialManager } from './components/TutorialManager.js';
import { TutorialSteps } from './components/TutorialSteps.js';
import { NotificationBadge } from './components/NotificationBadge.js';
import { HelpPopup } from './components/HelpPopup.js';

export class HUDScene extends Phaser.Scene {
    constructor() {
        super('HUDScene');
        this.memoList = []; 
        this.isMemoOpen = false;
        this.heldRecords = [];  
    }

    /* update(time, delta) - Duplicate method removed. Logic moved to main update() at line 1917
    update(time, delta) {
        // チュートリアル監視: 保険ガイドステップなら表示
        const tm = TutorialManager.getInstance(this.game);
        if (tm.isActive) {
            const currentStep = TutorialSteps[tm.currentStepIndex];
            if (currentStep) {
                const guideSteps = ['insurance_guide_intro', 'insurance_shakai', 'insurance_kokuho', 'insurance_elderly'];
                
                if (guideSteps.includes(currentStep.id)) {
                    if (!this.insuranceGuideVisible) {
                        this.showInsuranceGuide();
                    }
                } else {
                    // ガイド関連ステップが終わったら隠す
                    // (ただし、ガイドステップから遷移した直後のみ隠すのが理想だが、
                    //  シンプルに非該当なら隠すロジックで運用)
                    if (this.insuranceGuideVisible) {
                        this.hideInsuranceGuide();
                    }
                }
            }
        }
    }
    */




    create() {
        console.log('[HUDScene] create() 開始 - シーン初期化');
        
        // =========================================================
        // 🔄 ゲーム状態のリセット（リトライ対応）
        // =========================================================
        this.gameFinished = false;
        this.isPaused = false;
        this.timeLimit = 300; 
        this.remainingTime = this.timeLimit;
        this.memoList = [];
        this.heldRecords = [];
        this.isMemoOpen = false;
        
        console.log('[HUDScene] 状態リセット完了 - gameFinished:', this.gameFinished, ', remainingTime:', this.remainingTime);
        
        this.scene.bringToTop('HUDScene');
        if (this.scene.get('HUDScene') && !this.scene.isActive('HUDScene')) {
            this.scene.run('HUDScene');
        }

        // =========================================================
        // 📊 1. 状況ボード (右側) - プレミアムデザイン
        // =========================================================
        this.statusContainer = this.add.container(1430, 30);
        const statusW = 450; const statusH = 120;
        
        // グラデーション背景
        const statusBg = this.add.graphics();
        statusBg.fillGradientStyle(0xF8F9FA, 0xF8F9FA, 0xE9ECEF, 0xE9ECEF, 1);
        statusBg.fillRoundedRect(0, 0, statusW, statusH, 16);
        // グロー効果のボーダー
        statusBg.lineStyle(3, 0x3498DB, 0.8);
        statusBg.strokeRoundedRect(0, 0, statusW, statusH, 16);
        // 内側のアクセントライン
        statusBg.lineStyle(1, 0x3498DB, 0.3);
        statusBg.strokeRoundedRect(4, 4, statusW - 8, statusH - 8, 14);

        // アイコン背景（グラデーション）
        const iconBgOuter = this.add.circle(55, 60, 42, 0x2980B9);
        const iconBgInner = this.add.circle(55, 60, 38, 0x3498DB);
        iconBgInner.setStrokeStyle(2, 0x5DADE2, 0.6);
        const iconText = this.add.text(55, 60, '📊', { fontSize: '28px' }).setOrigin(0.5);
        
        // 縦区切り線
        const divider = this.add.graphics();
        divider.lineStyle(2, 0xDEE2E6, 1);
        divider.lineBetween(105, 20, 105, 100);
        
        // テキスト（モダンスタイル）
        const finishedLabel = this.add.text(120, 25, '会計完了', { fontSize: '18px', fontFamily: '"Noto Sans JP"', color: '#6C757D' });
        this.finishedText = this.add.text(120, 48, '0名', { fontSize: '36px', fontFamily: '"Noto Sans JP"', color: '#27AE60' });
        
        const waitingLabel = this.add.text(280, 25, '待ち人数', { fontSize: '18px', fontFamily: '"Noto Sans JP"', color: '#6C757D' });
        this.waitingText = this.add.text(280, 48, '0名', { fontSize: '36px', fontFamily: '"Noto Sans JP"', color: '#E67E22' });
        
        this.statusContainer.add([statusBg, iconBgOuter, iconBgInner, iconText, divider, finishedLabel, this.finishedText, waitingLabel, this.waitingText]);

        // =========================================================
        // ⏰ 2. 残り時間 (左側) - プレミアムデザイン
        // =========================================================
        this.timerContainer = this.add.container(170, 80);
        
        // 背景グラデーション（ダークテーマ）
        const timerBg = this.add.graphics();
        timerBg.fillGradientStyle(0x1A1A2E, 0x1A1A2E, 0x16213E, 0x16213E, 1);
        timerBg.fillRoundedRect(-130, -40, 260, 80, 12);
        // グロー効果ボーダー
        timerBg.lineStyle(3, 0xE74C3C, 0.9);
        timerBg.strokeRoundedRect(-130, -40, 260, 80, 12);
        // 内側のアクセント
        timerBg.lineStyle(1, 0xE74C3C, 0.3);
        timerBg.strokeRoundedRect(-126, -36, 252, 72, 10);
        
        // アイコン背景
        const timerIconBg = this.add.circle(-95, 0, 28, 0xE74C3C, 0.2);
        timerIconBg.setStrokeStyle(2, 0xE74C3C, 0.5);
        const timerIcon = this.add.text(-95, 0, '⏰', { fontSize: '32px' }).setOrigin(0.5);
        
        // タイマーテキスト
        this.timerText = this.add.text(20, 0, '03:00', {
            fontSize: '48px', fontFamily: '"Courier New", monospace', color: '#E74C3C'
        }).setOrigin(0.5);
        
        this.timerContainer.add([timerBg, timerIconBg, timerIcon, this.timerText]);

        // =========================================================
        // 🎓 チュートリアル進む/戻るボタン（タイマーの下）
        // =========================================================
        this._createTutorialNavButtons();
        
        // 🆕 デバッグ用スキップボタン（廃止）
        // if (this.registry.get('isTutorialMode')) {
        //     this._createDebugButtons();
        // }


        // --- ボタン類の配置 ---
        let btnX = 380;
        const btnGap = 85;
        const btnY = 80;

        // =========================================================
        // 📂 3. 所持カルテアイコン - プレミアムデザイン
        // =========================================================
        this.recordIconContainer = this.add.container(btnX, btnY);
        this.recordIconContainer.setVisible(true);
        
        // 外側グロー（白い縁取り）
        const recordGlow = this.add.circle(0, 0, 40, 0xFFFFFF, 0.3);
        
        // グラデーション背景（明るめ）
        const recordBgGraphics = this.add.graphics();
        recordBgGraphics.fillGradientStyle(0x8D6E63, 0x8D6E63, 0x5D4037, 0x5D4037, 1);
        recordBgGraphics.fillCircle(0, 0, 35);
        recordBgGraphics.lineStyle(3, 0xBCAAA4, 1);
        recordBgGraphics.strokeCircle(0, 0, 35);
        
        this.recordBg = this.add.circle(0, 0, 35).setInteractive({ useHandCursor: true }).setAlpha(0.001);
        const folderIconText = this.add.text(0, 0, '📂', { fontSize: '30px' }).setOrigin(0.5);
        
        // プレミアムバッジコンポーネント使用
        this.recordCountBadge = NotificationBadge.create(this, {
            x: 25,
            y: -25,
            colorScheme: 'red',
            depth: 10
        });

        this.recordIconContainer.add([recordGlow, recordBgGraphics, this.recordBg, folderIconText, this.recordCountBadge]);
        
        this.recordBg.on('pointerdown', () => this.toggleRecordListWindow());

        const recordTip = this._createTooltip('所持カルテ一覧');
        this.recordIconContainer.add(recordTip);
        this.recordBg.on('pointerover', () => { 
            recordTip.setVisible(true);
            recordBgGraphics.clear();
            recordBgGraphics.fillGradientStyle(0x8D6E63, 0x8D6E63, 0x6D4C41, 0x6D4C41, 1);
            recordBgGraphics.fillCircle(0, 0, 35);
            recordBgGraphics.lineStyle(3, 0xBCAAA4, 1);
            recordBgGraphics.strokeCircle(0, 0, 35);
            this.recordIconContainer.setScale(1.1);
        });
        this.recordBg.on('pointerout', () => { 
            recordTip.setVisible(false);
            recordBgGraphics.clear();
            recordBgGraphics.fillGradientStyle(0x6D4C41, 0x6D4C41, 0x4E342E, 0x4E342E, 1);
            recordBgGraphics.fillCircle(0, 0, 35);
            recordBgGraphics.lineStyle(3, 0xA1887F, 0.8);
            recordBgGraphics.strokeCircle(0, 0, 35);
            this.recordIconContainer.setScale(1.0);
        });

        btnX += btnGap; 

        // =========================================================
        // 📝 4. メモボタン - プレミアムデザイン
        // =========================================================
        this.memoIconContainer = this.add.container(btnX, btnY);
        
        // 外側グロー（白い縁取り）
        const memoGlow = this.add.circle(0, 0, 40, 0xFFFFFF, 0.3);
        
        // グラデーション背景（明るめ）
        const memoBgGraphics = this.add.graphics();
        memoBgGraphics.fillGradientStyle(0xF39C12, 0xF39C12, 0xE67E22, 0xE67E22, 1);
        memoBgGraphics.fillCircle(0, 0, 35);
        memoBgGraphics.lineStyle(3, 0xF5B041, 1);
        memoBgGraphics.strokeCircle(0, 0, 35);

        this.memoBg = this.add.circle(0, 0, 35).setInteractive({ useHandCursor: true }).setAlpha(0.001);
        const memoIcon = this.add.text(0, 0, '📝', { fontSize: '30px' }).setOrigin(0.5);
        
        // プレミアムバッジコンポーネント使用
        this.memoCountBadge = NotificationBadge.create(this, {
            x: 25,
            y: -25,
            colorScheme: 'red',
            depth: 10
        });

        this.memoIconContainer.add([memoGlow, memoBgGraphics, this.memoBg, memoIcon, this.memoCountBadge]);

        this.memoBg.on('pointerdown', () => {
            TutorialManager.getInstance(this.game).completeStep('HUD_MEMO_CLICKED');
            this.toggleMemoWindow();
        });
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('hud_memo_button', this.memoIconContainer);
        
        
        const memoTip = this._createTooltip('メモ帳を開く');
        this.memoIconContainer.add(memoTip);
        this.memoBg.on('pointerover', () => { 
            memoTip.setVisible(true);
            memoBgGraphics.clear();
            memoBgGraphics.fillGradientStyle(0xF39C12, 0xF39C12, 0xE67E22, 0xE67E22, 1);
            memoBgGraphics.fillCircle(0, 0, 35);
            memoBgGraphics.lineStyle(3, 0xF5B041, 1);
            memoBgGraphics.strokeCircle(0, 0, 35);
            this.memoIconContainer.setScale(1.1);
        });
        this.memoBg.on('pointerout', () => { 
            memoTip.setVisible(false);
            memoBgGraphics.clear();
            memoBgGraphics.fillGradientStyle(0xE67E22, 0xE67E22, 0xD35400, 0xD35400, 1);
            memoBgGraphics.fillCircle(0, 0, 35);
            memoBgGraphics.lineStyle(3, 0xF39C12, 0.8);
            memoBgGraphics.strokeCircle(0, 0, 35);
            this.memoIconContainer.setScale(1.0);
        });

        btnX += btnGap;

        // ❓ 5. ヘルプボタン (前へ移動)
        this.helpButton = this._createPremiumHudButton(btnX, btnY, '❓', 'ヘルプ', 
            [0x424242, 0x000000], [0x616161, 0x212121], 0xFFFFFF, 0x757575,
            () => this.toggleHelpWindow());
        
        // チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('help_button', this.helpButton);

        btnX += btnGap;

        // ⚙️ 6. 設定ボタン (後ろへ移動)
        this._createPremiumHudButton(btnX, btnY, '⚙️', '設定メニュー', 
            [0x5D6D7E, 0x34495E], [0x85929E, 0x5D6D7E], 0x85929E, 0xABB2B9,
            () => this.toggleSettingsWindow());


        // =========================================================
        // ウィンドウ類の初期生成
        // =========================================================
        this._createMemoWindow(); 
        this._createSettingsWindow();
        this._createVolumeWindow();  // 🔊 音量設定ウィンドウ
        this._createHelpWindow();     
        this._createScoreWindow();    
        this._createRecordListWindow(); 
        
        // =========================================================
        // 🎨 保険種別ガイド（左下に配置）
        // =========================================================
        this._createInsuranceGuide(170, 1000);
        
        // =========================================================
        // 🚪 タイトルへ戻る確認ウィンドウ
        // =========================================================
        this._createQuitConfirmWindow();
        
        // =========================================================
        // ⛏️ ポーズ機能のセットアップ（Escで設定画面を開閉）
        // =========================================================
        this._setupPauseFunction();
        
        // =========================================================
        // 🏆 実績システムのセットアップ
        // =========================================================
        this._setupAchievements();
        
        // =========================================================
        // 🎮 デバッグ用裏コマンドのセットアップ
        // =========================================================
        this._setupDebugCommands();
        
        // =========================================================
        // 🔥 コンボ表示UI（スコアボードの左側）
        // =========================================================
        this._createComboDisplay();
        
        // =========================================================
        // 📡 EventBusリスナー登録（シーン間疎結合通信）
        // =========================================================
        this._setupEventBusListeners();
    }
    
    // ==========================================================
    // 🔥 コンボ表示UI作成
    // ==========================================================
    _createComboDisplay() {
        // コンボコンテナ（ヘッダー右側に配置）
        this.comboContainer = this.add.container(1320, 80).setDepth(100);
        
        // 背景（ダークテーマ、非表示状態で開始）
        const comboBg = this.add.graphics();
        comboBg.fillGradientStyle(0x1A1A2E, 0x1A1A2E, 0x16213E, 0x16213E, 0.9);
        comboBg.fillRoundedRect(-80, -35, 160, 70, 12);
        comboBg.lineStyle(3, 0xFFD700, 0.8);
        comboBg.strokeRoundedRect(-80, -35, 160, 70, 12);
        
        // 「COMBO」ラベル
        const comboLabel = this.add.text(0, -18, '🔥 COMBO', {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFD700'
        }).setOrigin(0.5);
        
        // コンボ数
        this.comboCountText = this.add.text(0, 12, '0', {
            fontSize: '36px',
            fontFamily: '"Orbitron", "Courier New", monospace',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        this.comboContainer.add([comboBg, comboLabel, this.comboCountText]);
        this.comboContainer.setAlpha(0); // 初期状態は非表示
        this.comboContainer.setScale(0.8);
        
        // コンボエフェクト用コンテナ（画面中央、大きな演出用）
        this.comboEffectContainer = this.add.container(960, 400).setDepth(200);
    }
    
    // ==========================================================
    // 🔥 コンボ表示更新
    // ==========================================================
    _updateComboDisplay(comboCount, levelName = null) {
        if (comboCount <= 0) {
            // コンボなし→フェードアウト
            this.tweens.add({
                targets: this.comboContainer,
                alpha: 0,
                scale: 0.8,
                duration: 300,
                ease: 'Power2'
            });
            return;
        }
        
        // コンボ数更新
        this.comboCountText.setText(comboCount.toString());
        
        // 色を設定
        let color = '#FFFFFF';
        if (comboCount >= 20) color = '#FF00FF'; // UNSTOPPABLE!
        else if (comboCount >= 15) color = '#FFD700'; // PERFECT!
        else if (comboCount >= 10) color = '#FFA500'; // EXCELLENT!
        else if (comboCount >= 5) color = '#00FF00'; // GREAT!
        else if (comboCount >= 2) color = '#00BFFF'; // NICE!
        
        this.comboCountText.setColor(color);
        
        // フェードイン + ポップアニメーション
        this.tweens.add({
            targets: this.comboContainer,
            alpha: 1,
            scale: 1,
            duration: 200,
            ease: 'Back.Out'
        });
        
        // ポップ効果
        this.tweens.add({
            targets: this.comboCountText,
            scale: { from: 1.3, to: 1 },
            duration: 200,
            ease: 'Back.Out'
        });
        
        // レベル名が指定されていれば大きな演出
        if (levelName) {
            this._showComboEffect(levelName, comboCount);
        }
    }
    
    // ==========================================================
    // 🎆 コンボ演出（大きなテキスト表示）
    // ==========================================================
    _showComboEffect(levelName, comboCount) {
        // 既存のエフェクトをクリア
        this.comboEffectContainer.removeAll(true);
        
        // 色設定
        let effectColor = '#00BFFF';
        let strokeColor = '#0066AA';
        let glowColor = 0x00BFFF;
        let fontSize = '60px';
        let useParticles = false;
        let useFlash = false;
        
        switch (levelName) {
            case 'NICE!':
                effectColor = '#00BFFF';
                strokeColor = '#003366';
                fontSize = '60px';
                break;
            case 'GREAT!':
                effectColor = '#00FF00';
                strokeColor = '#006600';
                glowColor = 0x00FF00;
                fontSize = '72px';
                useParticles = true;
                break;
            case 'EXCELLENT!':
                effectColor = '#FFA500';
                strokeColor = '#663300';
                glowColor = 0xFFA500;
                fontSize = '84px';
                useParticles = true;
                useFlash = true;
                break;
            case 'PERFECT!':
                effectColor = '#FFD700';
                strokeColor = '#664400';
                glowColor = 0xFFD700;
                fontSize = '96px';
                useParticles = true;
                useFlash = true;
                break;
            case 'UNSTOPPABLE!':
                effectColor = '#FF00FF';
                strokeColor = '#660066';
                glowColor = 0xFF00FF;
                fontSize = '84px';
                useParticles = true;
                break;
        }
        
        // 画面フラッシュ
        if (useFlash) {
            this.cameras.main.flash(200, 255, 215, 0, false);
        }
        
        // パーティクル（簡易版）
        if (useParticles) {
            for (let i = 0; i < 15; i++) {
                const particle = this.add.circle(
                    Phaser.Math.Between(-200, 200),
                    Phaser.Math.Between(-50, 50),
                    Phaser.Math.Between(3, 8),
                    glowColor,
                    0.8
                );
                this.comboEffectContainer.add(particle);
                
                this.tweens.add({
                    targets: particle,
                    y: particle.y - Phaser.Math.Between(50, 150),
                    x: particle.x + Phaser.Math.Between(-50, 50),
                    alpha: 0,
                    scale: 0,
                    duration: Phaser.Math.Between(800, 1200),
                    ease: 'Power2'
                });
            }
        }
        
        // メインテキスト
        const effectText = this.add.text(0, 0, levelName, {
            fontSize: fontSize,
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            color: effectColor,
            stroke: strokeColor,
            strokeThickness: 6
        }).setOrigin(0.5);
        
        this.comboEffectContainer.add(effectText);
        
        // アニメーション
        effectText.setScale(0);
        effectText.setAlpha(0);
        
        this.tweens.add({
            targets: effectText,
            scale: { from: 0, to: 1.2 },
            alpha: 1,
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: effectText,
                    scale: 1,
                    duration: 100,
                    onComplete: () => {
                        // フェードアウト
                        this.tweens.add({
                            targets: effectText,
                            alpha: 0,
                            y: -50,
                            duration: 500,
                            delay: 500,
                            ease: 'Power2'
                        });
                    }
                });
            }
        });
        
        // SE再生
        if (this.sound.get('se_reception_completed')) {
            this.sound.play('se_reception_completed', { volume: 0.6 });
        }
    }
    
    // ==========================================================
    // ⏱️ タイムボーナス演出
    // ==========================================================
    _showTimeBonusEffect(bonus) {
        const effectText = this.add.text(960, 300, `⚡ SPEED BONUS! +${bonus}`, {
            fontSize: '48px',
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            color: '#00FFFF',
            stroke: '#004444',
            strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);
        
        // 画面フラッシュ（軽め）
        this.cameras.main.flash(100, 0, 255, 255, false);
        
        // アニメーション
        effectText.setScale(0);
        effectText.setAlpha(0);
        
        this.tweens.add({
            targets: effectText,
            scale: { from: 0, to: 1.1 },
            alpha: 1,
            duration: 250,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: effectText,
                    scale: 1,
                    duration: 100,
                    onComplete: () => {
                        this.tweens.add({
                            targets: effectText,
                            alpha: 0,
                            y: 250,
                            duration: 500,
                            delay: 800,
                            ease: 'Power2',
                            onComplete: () => effectText.destroy()
                        });
                    }
                });
            }
        });
        
        // SE再生
        if (this.sound.get('se_display_card')) {
            this.sound.play('se_display_card', { volume: 0.8 });
        }
    }
    
    // ==========================================================
    // 📡 EventBusリスナーのセットアップ
    // ==========================================================
    _setupEventBusListeners() {
        // スコア更新イベント
        EventBus.on(GameEvents.HUD_UPDATE_SCORE, (data) => {
            if (data.score !== undefined) {
                this.registry.set('score', data.score);
            }
            if (data.notification) {
                this.showScoreNotification(
                    data.notification.message,
                    data.notification.details || [],
                    data.notification.color || '#FFFFFF'
                );
            }
        });
        
        // 待ち人数更新イベント
        EventBus.on(GameEvents.HUD_UPDATE_WAITING, (data) => {
            if (this.waitingText && data.waiting !== undefined) {
                this.waitingText.setText(`${data.waiting}名`);
            }
            if (this.finishedText && data.finished !== undefined) {
                this.finishedText.setText(`${data.finished}名`);
            }
        });
        
        // メモ追加イベント
        EventBus.on(GameEvents.HUD_ADD_MEMO, (data) => {
            if (data.patientData) {
                this.addMemo(data.patientData);
            }
        });
        
        // アイコン点滅イベント
        EventBus.on(GameEvents.HUD_FLASH_ICON, (data) => {
            if (data.target === 'record' && this.recordBg) {
                this._flashIcon(this.recordBg);
            } else if (data.target === 'memo' && this.memoBg) {
                this._flashIcon(this.memoBg);
            }
        });
        
        // メッセージ表示イベント
        EventBus.on(GameEvents.HUD_SHOW_MESSAGE, (data) => {
            if (data.message) {
                this._showMemoAddedMessage(data.message);
            }
        });
        
        // ゲームポーズ/再開イベント
        EventBus.on(GameEvents.GAME_PAUSE, () => {
            this._pauseGame();
        });
        
        EventBus.on(GameEvents.GAME_RESUME, () => {
            this._resumeGame();
        });
        
        // 🆕 コンボ更新イベント
        EventBus.on(GameEvents.COMBO_UPDATE, (data) => {
            if (data.count !== undefined) {
                this._updateComboDisplay(data.count, data.levelName || null);
            }
        });
        
        // 🆕 コンボ途切れイベント
        EventBus.on(GameEvents.COMBO_BREAK, () => {
            this._updateComboDisplay(0);
            // コンボ途切れ演出（軽いシェイク）
            if (this.comboContainer && this.comboContainer.alpha > 0) {
                this.cameras.main.shake(100, 0.005);
            }
        });
        
        // 🆕 タイムボーナス獲得イベント
        EventBus.on(GameEvents.TIME_BONUS_EARNED, (data) => {
            if (data.bonus !== undefined && data.bonus > 0) {
                this._showTimeBonusEffect(data.bonus);
            }
        });
        
        console.log('[HUDScene] EventBusリスナー登録完了');
    }
    
    // ==========================================================
    // 🎨 保険種別ガイド表示 (ポップ＆スタイリッシュ版)
    // ==========================================================
    _createInsuranceGuide(x, y) {
        const guideData = [
            { label: '社保', color: 0x3498DB, emoji: '🔵' },
            { label: '国保', color: 0xE74C3C, emoji: '🔴' },
            { label: '後期', color: 0x9B59B6, emoji: '🟣' }
        ];
        
        this.insuranceGuideContainer = this.add.container(x, y);
        this.insuranceGuideContainer.setScrollFactor(0).setDepth(500);
        
        // 🆕 チュートリアル用ボタン登録
        TutorialManager.getInstance(this.game).registerButton('insurance_guide_panel', this.insuranceGuideContainer);
        
        // グラデーション風の背景（固定パネルに合わせた暗い色調）
        const bgWidth = 320;
        const bgHeight = 100;
        
        // 外枠（控えめなグロー効果）
        const glow = this.add.rectangle(0, 0, bgWidth + 10, bgHeight + 10, 0x8B7355, 0.2);
        this.insuranceGuideContainer.add(glow);
        
        // メイン背景（固定パネルに合わせた暗い色）
        const mainBg = this.add.graphics();
        mainBg.fillStyle(0x1a1a1a, 0.95);
        mainBg.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 16);
        mainBg.lineStyle(2, 0x8B8B7A, 0.8);
        mainBg.strokeRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 16);
        this.insuranceGuideContainer.add(mainBg);
        
        // ヘッダーライン（控えめな色）
        const headerLine = this.add.rectangle(0, -bgHeight/2 + 28, bgWidth - 20, 2, 0x8B8B7A, 0.4);
        this.insuranceGuideContainer.add(headerLine);
        
        // タイトル（控えめな白系）
        const title = this.add.text(0, -bgHeight/2 + 14, '🏥 保険種別ガイド', {
            fontSize: '18px',
            color: '#CCCCCC',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        this.insuranceGuideContainer.add(title);
        
        // 各保険種別（横並び・大きく）
        const startX = -100;
        const itemY = 15;
        guideData.forEach((item, i) => {
            const itemX = startX + i * 100;
            
            // カラーバッジ（角丸四角）
            const badge = this.add.graphics();
            badge.fillStyle(item.color, 1);
            badge.fillRoundedRect(itemX - 35, itemY - 18, 70, 36, 8);
            badge.lineStyle(2, 0xFFFFFF, 0.8);
            badge.strokeRoundedRect(itemX - 35, itemY - 18, 70, 36, 8);
            this.insuranceGuideContainer.add(badge);
            
            // ラベル
            const label = this.add.text(itemX, itemY, item.label, {
                fontSize: '20px',
                color: '#FFFFFF',
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            this.insuranceGuideContainer.add(label);
        });
        
        // 初期状態は非表示
        this.insuranceGuideContainer.setVisible(false);
        this.insuranceGuideContainer.setAlpha(0);
    }
    
    // 保険ガイドを表示
    showInsuranceGuide() {
        if (!this.insuranceGuideContainer) return;
        
        // 既存のtweenをキャンセル
        this.tweens.killTweensOf(this.insuranceGuideContainer);
        
        // 表示フラグを設定
        this.insuranceGuideVisible = true;
        
        this.insuranceGuideContainer.setVisible(true);
        this.tweens.add({
            targets: this.insuranceGuideContainer,
            alpha: 1,
            duration: 300,
            ease: 'Power2'
        });
    }
    
    // 保険ガイドを非表示
    hideInsuranceGuide() {
        if (!this.insuranceGuideContainer) return;
        
        // 既存のtweenをキャンセル
        this.tweens.killTweensOf(this.insuranceGuideContainer);
        
        // 非表示フラグを設定
        this.insuranceGuideVisible = false;
        
        this.tweens.add({
            targets: this.insuranceGuideContainer,
            alpha: 0,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                // フラグを再チェック（showが呼ばれた場合は非表示にしない）
                if (this.insuranceGuideContainer && !this.insuranceGuideVisible) {
                    this.insuranceGuideContainer.setVisible(false);
                }
            }
        });
    }


    // ==========================================================
    // 🎓 チュートリアルナビゲーションボタン
    // ==========================================================
    _createTutorialNavButtons() {
        const tm = TutorialManager.getInstance(this.game);
        
        // コンテナ（タイマーの下に配置）
        // コンテナ（タイマーの下に配置）
        this.tutorialNavContainer = this.add.container(170, 155).setDepth(20000);
        
        // 背景 (透過黒)
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0x000000, 0.7);
        bgGraphics.fillRoundedRect(-80, -20, 160, 40, 8);
        bgGraphics.lineStyle(1, 0xFFFFFF, 0.3);
        bgGraphics.strokeRoundedRect(-80, -20, 160, 40, 8);
        
        // 戻るボタン
        const prevBtn = this.add.text(-50, 0, '◀', {
            fontSize: '24px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        prevBtn.on('pointerover', () => prevBtn.setColor('#BBBBBB'));
        prevBtn.on('pointerout', () => prevBtn.setColor('#FFFFFF'));
        prevBtn.on('pointerdown', () => {
            tm.goToPreviousStep();
            this._updateTutorialStepDisplay();
        });
        
        // ステップ番号表示
        this.tutorialStepText = this.add.text(0, 0, '1', {
            fontSize: '16px',
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        
        // 進むボタン
        const nextBtn = this.add.text(50, 0, '▶', {
            fontSize: '24px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        nextBtn.on('pointerover', () => nextBtn.setColor('#BBBBBB'));
        nextBtn.on('pointerout', () => nextBtn.setColor('#FFFFFF'));
        nextBtn.on('pointerdown', () => {
            tm.goToNextStep();
            this._updateTutorialStepDisplay();
        });
        
        this.tutorialNavContainer.add([bgGraphics, prevBtn, this.tutorialStepText, nextBtn]);
        
        // 初期状態は非表示（チュートリアルモード時のみ表示）
        this.tutorialNavContainer.setVisible(false);
        
        // チュートリアル開始時に表示を更新
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (tm.isActive) {
                    this.tutorialNavContainer.setVisible(true);
                    this._updateTutorialStepDisplay();
                }
            },
            loop: true
        });
        
        // 🆕 処方箋確認までスキップボタンを追加
        this._createSkipToCheckButton();
    }
    
    _updateTutorialStepDisplay() {
        const tm = TutorialManager.getInstance(this.game);
        if (this.tutorialStepText && tm.isActive) {
            this.tutorialStepText.setText(`${tm.currentStepIndex + 1}`);
        }
    }
    
    // ==========================================================
    // 🆕 処方箋確認までスキップボタン
    // ==========================================================
    _createSkipToCheckButton() {
        const tm = TutorialManager.getInstance(this.game);
        
        // コンテナ（ナビゲーションボタンの下に配置）
        // コンテナ（ナビゲーションボタンの下に配置 - 1⃣ チュートリアル終了）
        // Y: 195 (元のスキップボタン位置)
        this.finishTutorialContainer = this.add.container(170, 195).setDepth(20000);
        
        // 背景 (透過黒)
        const finishBg = this.add.graphics();
        finishBg.fillStyle(0x000000, 0.7);
        finishBg.fillRoundedRect(-80, -15, 160, 30, 6);
        finishBg.lineStyle(1, 0xFFFFFF, 0.3);
        finishBg.strokeRoundedRect(-80, -15, 160, 30, 6);
        
        // テキスト (白)
        const finishBtnText = this.add.text(0, 0, '✓ チュートリアル終了', {
            fontSize: '14px',
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        // ホバー効果 (少し明るい黒)
        finishBtnText.on('pointerover', () => {
            finishBg.clear();
            finishBg.fillStyle(0x222222, 0.8);
            finishBg.fillRoundedRect(-80, -15, 160, 30, 6);
            finishBg.lineStyle(1, 0xFFFFFF, 0.5);
            finishBg.strokeRoundedRect(-80, -15, 160, 30, 6);
        });
        finishBtnText.on('pointerout', () => {
            finishBg.clear();
            finishBg.fillStyle(0x000000, 0.7);
            finishBg.fillRoundedRect(-80, -15, 160, 30, 6);
            finishBg.lineStyle(1, 0xFFFFFF, 0.3);
            finishBg.strokeRoundedRect(-80, -15, 160, 30, 6);
        });
        finishBtnText.on('pointerdown', () => {
            if (this.sound && this.sound.get('se_button_click')) {
                this.sound.play('se_button_click', { volume: 0.5 });
            }
            // チュートリアル完了（成功扱い）
            TutorialManager.getInstance(this.game).complete();
        });
        
        this.finishTutorialContainer.add([finishBg, finishBtnText]);
        // チュートリアルモードのみ表示
        this.finishTutorialContainer.setVisible(this.registry.get('isTutorialMode'));


        // ========================================
        // 2⃣ 処方箋確認へスキップ
        // Y: 235 (元の終了ボタン位置)
        // ========================================
        this.skipToCheckContainer = this.add.container(170, 235).setDepth(20000);
        
        // 背景 (透過黒)
        const bgGraphics = this.add.graphics();
        bgGraphics.fillStyle(0x000000, 0.7);
        bgGraphics.fillRoundedRect(-80, -15, 160, 30, 6);
        bgGraphics.lineStyle(1, 0xFFFFFF, 0.3);
        bgGraphics.strokeRoundedRect(-80, -15, 160, 30, 6);
        
        // スキップボタンテキスト (白)
        const skipBtn = this.add.text(0, 0, '⏭️ 処方箋確認へ', {
            fontSize: '14px',
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        // ホバー効果
        skipBtn.on('pointerover', () => {
            bgGraphics.clear();
            bgGraphics.fillStyle(0x222222, 0.8);
            bgGraphics.fillRoundedRect(-80, -15, 160, 30, 6);
            bgGraphics.lineStyle(1, 0xFFFFFF, 0.5);
            bgGraphics.strokeRoundedRect(-80, -15, 160, 30, 6);
        });
        skipBtn.on('pointerout', () => {
            bgGraphics.clear();
            bgGraphics.fillStyle(0x000000, 0.7);
            bgGraphics.fillRoundedRect(-80, -15, 160, 30, 6);
            bgGraphics.lineStyle(1, 0xFFFFFF, 0.3);
            bgGraphics.strokeRoundedRect(-80, -15, 160, 30, 6);
        });
        skipBtn.on('pointerdown', () => {
            // go_to_checkステップまでスキップ
            while (tm.getCurrentStep()?.id !== 'go_to_check' && tm.currentStepIndex < 200) {
                tm.currentStepIndex++;
            }
            
            // 全ての患者の受付を完了させる
            const receptionScene = this.game.scene.getScene('ReceptionScene');
            if (receptionScene && receptionScene.patientManager) {
                const patients = receptionScene.patientManager.patientQueue || [];
                patients.forEach(patient => {
                    // 受付完了状態にする
                    patient.isFinished = true;
                    patient.questionnaireCompleted = true;
                    patient.processStep = 99; // 完了
                    
                    // 完了済みIDリストに追加
                    if (!receptionScene.completedIds) {
                        receptionScene.completedIds = [];
                    }
                    const patientId = patient.insuranceDetails?.ID || patient.insuranceDetails?.['ID'] || patient.id;
                    if (patientId && !receptionScene.completedIds.includes(patientId)) {
                        receptionScene.completedIds.push(patientId);
                    }
                });
                
                // 完了患者数を更新
                receptionScene.completedCount = patients.length;
                
                // CheckScene用の会計待ちキューを作成してRegistryに保存
                const accountingQueue = patients.map(p => ({
                    ...p, 
                    isFinished: true,
                    processStep: 99
                }));
                this.registry.set('checkSceneAccountingQueue', accountingQueue);
                console.log('[HUDScene] スキップ: 会計キュー作成', accountingQueue.length, '人');
                
                // UIをクリアしてCheckSceneへ移動
                receptionScene._clearStepUI();
                receptionScene.slideToScene('CheckScene', 'left', null, false);
            }
            
            tm.completeStep('CHECK_SCENE_ENTERED');
        });
        
        this.skipToCheckContainer.add([bgGraphics, skipBtn]);
        
        // 初期状態は非表示
        this.skipToCheckContainer.setVisible(false);
        
        // チュートリアル時のみ表示
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                if (tm.isActive && tm.getCurrentStep()?.phase < 6) {
                    this.skipToCheckContainer.setVisible(true);
                } else {
                    this.skipToCheckContainer.setVisible(false);
                }
            },
            loop: true
        });
    }

    _createTooltip(text) {
        const tipBg = this.add.rectangle(0, 60, 180, 40, 0x000000, 0.8);
        const tipText = this.add.text(0, 60, text, { fontSize: '18px', color: '#fff', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        return this.add.container(0, 0, [tipBg, tipText]).setVisible(false);
    }

    _flashIcon(targetBg) {
        targetBg.setFillStyle(0xF39C12); 
        this.tweens.add({
            targets: targetBg, scale: 1.2, duration: 150, yoyo: true,
            onComplete: () => { targetBg.setFillStyle(0x333333); targetBg.setScale(1); }
        });
    }

    addRecord(id) {
        if (!this.heldRecords.includes(id)) {
            this.heldRecords.push(id);
            this._updateRecordIcon(true);
            this._renderRecordList();
            return true; 
        }
        return false; 
    }

    removeRecord(id) {
        const index = this.heldRecords.indexOf(id);
        if (index > -1) {
            this.heldRecords.splice(index, 1);
            this._updateRecordIcon(false);
            this._renderRecordList();
        }
    }

    hasRecord(id) {
        return this.heldRecords.includes(id);
    }

    _updateRecordIcon(doFlash = false) {
        const count = this.heldRecords.length;
        if (this.recordCountBadge && this.recordCountBadge.updateCount) {
            this.recordCountBadge.updateCount(count);
            if (doFlash && count > 0) {
                this.recordCountBadge.pulse();
            }
        }
        if (doFlash && this.recordBg) {
            this._flashIcon(this.recordBg);
        }
    }

    addMemo(patientData) {
        const details = patientData.insuranceDetails || {};
        const id = details['ID'] || '新規';
        const kana = details['フリガナ'] || details['カナ'] || patientData.name || '';
        const type = patientData.visualCategory || (patientData.insuranceType === 'myNumber' ? '社保(マイナ)' : '社保');

        if (id !== '新規' && this.memoList.some(m => m.id === id)) {
            this._showMemoAddedMessage('⚠️ 登録済み');
            return;
        }

        this.memoList.push({ id: id, name: kana, type: type, checked: false });
        this._updateMemoIcon(true);
        this._renderMemoList();
        this._showMemoAddedMessage('✅ メモ追加!');
    }

    _updateMemoIcon(doFlash = false) {
        const count = this.memoList.length;
        if (this.memoCountBadge && this.memoCountBadge.updateCount) {
            this.memoCountBadge.updateCount(count);
            if (doFlash && count > 0) {
                this.memoCountBadge.pulse();
            }
        }
        if (doFlash && this.memoBg) {
            this._flashIcon(this.memoBg);
        }
    }

    _showMemoAddedMessage(msg) {
        const text = this.add.text(460, 140, msg, {
            fontSize: '24px', fontFamily: '"Noto Sans JP"', color: '#2ECC71', stroke: '#000', strokeThickness: 4
        }).setOrigin(0.5).setDepth(200);
        this.tweens.add({ targets: text, y: 110, alpha: 0, duration: 1500, onComplete: () => text.destroy() });
    }

    _renderMemoList() {
        this.memoListContainer.removeAll(true);
        const textStyle = { fontSize: '18px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333' };

        this.memoList.forEach((memo, index) => {
            const y = index * 50; 
            const rowContainer = this.add.container(0, y);
            const checkText = memo.checked ? '☑' : '□';
            const checkBox = this.add.text(15, 10, checkText, { fontSize: '28px', color: '#000' }).setInteractive({ useHandCursor: true });
            const textObj = this.add.text(60, 15, `ID：${memo.id}、${memo.name}、${memo.type}`, textStyle);
            if (memo.checked) {
                textObj.setColor('#AAA');
                const strike = this.add.rectangle(60 + textObj.width/2, 25, textObj.width, 2, 0xAAAAAA);
                rowContainer.add(strike);
            }
            const deleteBtn = this.add.text(400, 15, '✖', { fontSize: '20px', color: '#E74C3C' }).setInteractive({ useHandCursor: true });

            checkBox.on('pointerdown', () => { memo.checked = !memo.checked; this._renderMemoList(); });
            deleteBtn.on('pointerdown', () => { 
                this.memoList.splice(index, 1); 
                this._renderMemoList(); 
                this._updateMemoIcon(false);
            });
            rowContainer.add([checkBox, textObj, deleteBtn]);
            this.memoListContainer.add(rowContainer);
        });
    }

    _createRecordListWindow() {
        const x = 380; 
        const y = 300; 
        const w = 300;
        const h = 400;

        this.recordListWindow = this.add.container(x, y).setVisible(false).setDepth(150);

        const bg = this.add.rectangle(0, 0, w, h, 0xFFFFFF).setStrokeStyle(3, 0xE67E22);
        const titleBg = this.add.rectangle(0, -h/2 + 20, w, 40, 0xE67E22);
        // 🚨 修正: fontStyle: 'bold' 削除
        const title = this.add.text(0, -h/2 + 20, '📂 取得済みカルテ', {
            fontSize: '20px', color: '#FFF', fontFamily: '"Noto Sans JP"'
        }).setOrigin(0.5);

        // 🚨 NEW: 閉じる(×)ボタン追加
        const closeBtn = this.add.text(w/2 - 30, -h/2 + 20, '✖', { 
            fontSize: '24px', color: '#FFF' 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on('pointerdown', () => this.toggleRecordListWindow());

        this.recordListContainer = this.add.container(0, -h/2 + 60);
        this.recordListWindow.add([bg, titleBg, title, closeBtn, this.recordListContainer]);
    }

    toggleRecordListWindow() {
        const isVisible = !this.recordListWindow.visible;
        this.recordListWindow.setVisible(isVisible);
        
        if (isVisible) {
            this.scene.bringToTop();
            this._renderRecordList(); 
            this.tweens.add({ targets: this.recordListWindow, alpha: { from: 0, to: 1 }, duration: 200 });
        }
    }

    _renderRecordList() {
        this.recordListContainer.removeAll(true);
        if (this.heldRecords.length === 0) {
            this.recordListContainer.add(this.add.text(0, 50, '（所持なし）', { fontSize: '18px', color: '#888' }).setOrigin(0.5));
            return;
        }
        this.heldRecords.forEach((id, index) => {
            const rowY = index * 40;
            // 🚨 修正: fontStyle: 'bold' 削除
            const text = this.add.text(-100, rowY, `ID: ${id}`, { 
                fontSize: '22px', color: '#333', fontFamily: 'monospace' 
            });
            this.recordListContainer.add(text);
        });
    }

    createHudButton(x, y, iconChar, tooltipText, onClick) {
        const container = this.add.container(x, y);
        const bg = this.add.circle(0, 0, 35, 0x333333).setStrokeStyle(3, 0xffffff).setInteractive({ useHandCursor: true });
        const icon = this.add.text(0, 0, iconChar, { fontSize: '32px' }).setOrigin(0.5);
        const tipBg = this.add.rectangle(0, 60, 180, 40, 0x000000, 0.8);
        const tipText = this.add.text(0, 60, tooltipText, { fontSize: '18px', color: '#fff', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        const tooltipContainer = this.add.container(0, 0, [tipBg, tipText]).setVisible(false);
        container.add([bg, icon, tooltipContainer]);
        bg.on('pointerover', () => { 
            bg.setFillStyle(0x555555); 
            tooltipContainer.setVisible(true); 
            container.setScale(1.1);
        });
        bg.on('pointerout', () => { 
            bg.setFillStyle(0x333333); 
            tooltipContainer.setVisible(false); 
            container.setScale(1.0);
        });
        bg.on('pointerdown', onClick);
        return container;
    }
    
    // プレミアムHUDボタン（グラデーション・グロー効果）
    _createPremiumHudButton(x, y, iconChar, tooltipText, normalGradient, hoverGradient, normalBorder, hoverBorder, onClick) {
        const container = this.add.container(x, y);
        
        // 外側グロー（白い縁取り）
        const outerGlow = this.add.circle(0, 0, 40, 0xFFFFFF, 0.3);
        
        // グラデーション背景
        const bgGraphics = this.add.graphics();
        bgGraphics.fillGradientStyle(normalGradient[0], normalGradient[0], normalGradient[1], normalGradient[1], 1);
        bgGraphics.fillCircle(0, 0, 35);
        bgGraphics.lineStyle(3, normalBorder, 0.8);
        bgGraphics.strokeCircle(0, 0, 35);
        
        const hitArea = this.add.circle(0, 0, 35).setInteractive({ useHandCursor: true }).setAlpha(0.001);
        const icon = this.add.text(0, 0, iconChar, { fontSize: '30px' }).setOrigin(0.5);
        
        // ツールチップ
        const tipBg = this.add.graphics();
        tipBg.fillStyle(0x1A1A2E, 0.95);
        tipBg.fillRoundedRect(-90, 45, 180, 35, 8);
        tipBg.lineStyle(1, 0x5D6D7E, 0.6);
        tipBg.strokeRoundedRect(-90, 45, 180, 35, 8);
        const tipText = this.add.text(0, 62, tooltipText, { fontSize: '16px', color: '#fff', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        const tooltipContainer = this.add.container(0, 0, [tipBg, tipText]).setVisible(false);
        
        container.add([outerGlow, bgGraphics, hitArea, icon, tooltipContainer]);
        
        hitArea.on('pointerover', () => { 
            tooltipContainer.setVisible(true);
            bgGraphics.clear();
            bgGraphics.fillGradientStyle(hoverGradient[0], hoverGradient[0], hoverGradient[1], hoverGradient[1], 1);
            bgGraphics.fillCircle(0, 0, 35);
            bgGraphics.lineStyle(3, hoverBorder, 1);
            bgGraphics.strokeCircle(0, 0, 35);
            container.setScale(1.1);
        });
        hitArea.on('pointerout', () => { 
            tooltipContainer.setVisible(false);
            bgGraphics.clear();
            bgGraphics.fillGradientStyle(normalGradient[0], normalGradient[0], normalGradient[1], normalGradient[1], 1);
            bgGraphics.fillCircle(0, 0, 35);
            bgGraphics.lineStyle(3, normalBorder, 0.8);
            bgGraphics.strokeCircle(0, 0, 35);
            container.setScale(1.0);
        });
        hitArea.on('pointerdown', onClick);
        return container;
    }

    _createMemoWindow() {
        const startX = 960; const startY = 540; const w = 450; const h = 600; 
        this.memoWindow = this.add.container(startX, startY).setVisible(false);
        const bg = this.add.rectangle(0, 0, w, h, 0xFFF9C4).setStrokeStyle(2, 0x000000);
        const lines = this.add.graphics();
        lines.lineStyle(1, 0x90CAF9, 0.5); 
        for (let y = -h/2 + 100; y < h/2; y += 50) { lines.beginPath(); lines.moveTo(-w/2 + 20, y); lines.lineTo(w/2 - 20, y); lines.strokePath(); }
        lines.lineStyle(2, 0xFFCDD2, 0.8);
        lines.beginPath(); lines.moveTo(-w/2 + 50, -h/2); lines.lineTo(-w/2 + 50, h/2); lines.strokePath();
        const bar = this.add.rectangle(0, -h/2 + 25, w, 50, 0xFBC02D);
        
        // 🚨 修正: fontStyle: 'bold' 削除
        const title = this.add.text(0, -h/2 + 25, '📝 MEMO', { 
            fontSize: '24px', color: '#000' 
        }).setOrigin(0.5);

        // 🚨 NEW: 閉じる(×)ボタン追加
        const closeBtn = this.add.text(w/2 - 40, -h/2 + 25, '✖', { 
            fontSize: '28px', color: '#333' 
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this.toggleMemoWindow());

        this.memoListContainer = this.add.container(-w/2, -h/2 + 80);
        
        this.memoWindow.add([bg, lines, bar, title, closeBtn, this.memoListContainer]);
        this.memoWindow.setDepth(100).setSize(w, h).setInteractive({ draggable: true });
        this.memoWindow.on('drag', (pointer, dragX, dragY) => { this.memoWindow.x = dragX; this.memoWindow.y = dragY; });
    }
    toggleMemoWindow() {
        const isVisible = !this.memoWindow.visible;
        this.memoWindow.setVisible(isVisible);
        if (isVisible) { this.scene.bringToTop(); this.memoWindow.setScale(0.9); this.tweens.add({ targets: this.memoWindow, scale: 1, duration: 200, ease: 'Back.Out' }); }
    }

    _createSettingsWindow() {
        const startX = 960; const startY = 540;
        
        // オーバーレイを別コンテナに分離（アニメーション対象外）
        this.settingsOverlay = this.add.container(startX, startY).setVisible(false).setDepth(299);
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.7).setOrigin(0.5).setInteractive();
        overlay.on('pointerdown', () => this.toggleSettingsWindow()); // クリックで閉じる
        this.settingsOverlay.add(overlay);
        
        this.settingsWindow = this.add.container(startX, startY).setVisible(false).setDepth(300);

        // 背景サイズを調整（ポーズボタン削除により縮小）
        const bg = this.add.rectangle(0, 0, 500, 520, 0x333333).setStrokeStyle(4, 0xFFFFFF);
        
        // タイトル（ポーズ中表示）
        const title = this.add.text(0, -220, '⏸️ ポーズ', { 
            fontSize: '32px', color: '#FFF', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);

        // 続けるボタン (y: -140)
        const resumeBtn = this.add.rectangle(0, -140, 300, 60, 0x27AE60).setInteractive({ useHandCursor: true });
        const resumeText = this.add.text(0, -140, '▶ 続ける', { fontSize: '24px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        resumeBtn.on('pointerdown', () => this.toggleSettingsWindow());
        resumeBtn.on('pointerover', () => resumeBtn.setScale(1.05));
        resumeBtn.on('pointerout', () => resumeBtn.setScale(1.0));

        // 🔊 音量設定ボタン (y: -60)
        const volumeBtn = this.add.rectangle(0, -60, 300, 60, 0x4CAF50).setInteractive({ useHandCursor: true });
        const volumeText = this.add.text(0, -60, '🔊 音量設定', { fontSize: '24px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        volumeBtn.on('pointerdown', () => {
            this.toggleSettingsWindow(); 
            this.toggleVolumeWindow();     
        });
        volumeBtn.on('pointerover', () => volumeBtn.setScale(1.05));
        volumeBtn.on('pointerout', () => volumeBtn.setScale(1.0));

        // 📖 遊び方ボタン (y: 20)
        const helpBtn = this.add.rectangle(0, 20, 300, 60, 0xFFFFFF).setInteractive({ useHandCursor: true });
        const helpText = this.add.text(0, 20, '📖 遊び方・ヘルプ', { fontSize: '24px', color: '#000', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        helpBtn.on('pointerdown', () => {
            this.toggleSettingsWindow(); 
            this.toggleHelpWindow();     
        });
        helpBtn.on('pointerover', () => helpBtn.setScale(1.05));
        helpBtn.on('pointerout', () => helpBtn.setScale(1.0));

        // 🏆 スコアボタン (y: 100)
        const scoreBtn = this.add.rectangle(0, 100, 300, 60, 0xFFD700).setInteractive({ useHandCursor: true });
        const scoreText = this.add.text(0, 100, '🏆 スコアログ', { fontSize: '24px', color: '#000', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        scoreBtn.on('pointerdown', () => {
            this.toggleSettingsWindow(); 
            this.toggleScoreWindow();    
        });
        scoreBtn.on('pointerover', () => scoreBtn.setScale(1.05));
        scoreBtn.on('pointerout', () => scoreBtn.setScale(1.0));
        
        // 🚪 タイトルへ戻るボタン (y: 180)
        const quitBtn = this.add.rectangle(0, 180, 300, 60, 0xE74C3C).setInteractive({ useHandCursor: true });
        const quitText = this.add.text(0, 180, '🏠 タイトルへ戻る', { fontSize: '24px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        quitBtn.on('pointerdown', () => {
            this.toggleSettingsWindow();
            this.toggleQuitConfirmWindow();
        });
        quitBtn.on('pointerover', () => quitBtn.setScale(1.05));
        quitBtn.on('pointerout', () => quitBtn.setScale(1.0));
        
        // ヒント
        const hintText = this.add.text(0, 240, 'Escキーでも開閉できます', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#AAAAAA'
        }).setOrigin(0.5);

        this.settingsWindow.add([bg, title, resumeBtn, resumeText, volumeBtn, volumeText, helpBtn, helpText, scoreBtn, scoreText, quitBtn, quitText, hintText]);
    }
    
    // 🔊 音量設定ウィンドウ
    _createVolumeWindow() {
        const startX = 960; const startY = 540;
        
        // オーバーレイを別コンテナに分離（アニメーション対象外）
        this.volumeOverlay = this.add.container(startX, startY).setVisible(false).setDepth(349);
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.5).setOrigin(0.5).setInteractive();
        overlay.on('pointerdown', () => this.toggleVolumeWindow()); // クリックで閉じる
        this.volumeOverlay.add(overlay);
        
        this.volumeWindow = this.add.container(startX, startY).setVisible(false).setDepth(350);

        // 背景サイズを拡張 (500x420 -> 840x800) TitleSceneに合わせる
        // ただしHUDなのでそこまで大きくなくていいが、スライダーが入る幅が必要
        // TitleScene: 840x800
        // HUD current: 500x420 (sliderWidth=400 in TitleScene, might fit in 500 but tight)
        // Let's increase width to 600 or 700.
        const w = 700;
        const h = 550;
        
        const bg = this.add.rectangle(0, 0, w, h, 0x222222).setStrokeStyle(4, 0x4CAF50);
        const title = this.add.text(0, -h/2 + 50, '🔊 音量設定', { 
            fontSize: '32px', color: '#4CAF50', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);

        // コンテナに追加
        this.volumeWindow.add([bg, title]);

        // ===========================================
        // BGM音量
        // ===========================================
        this._createVolumeSlider(
            this.volumeWindow,
            0, -100,
            '🎵 BGM',
            'bgmVolume', // Registry key in HUD seems to be bgmVolume? TitleScene uses volumeBGM. 
            // HUDScene: this.registry.get('bgmVolume') (line 518)
            // TitleScene: this.registry.get('volumeBGM') (line 623)
            // WAIT! They use different keys?!
            // TitleScene uses 'volumeBGM'. HUDScene uses 'bgmVolume'.
            // I should probably unify them or stick to what works in HUD?
            // User: "start screen settings specification"
            // If I change key, I might break persistence if keys are different.
            // Let's check GameConfig or where keys are defined.
            // TitleScene _openSettings initializes them: volumeBGM, volumeSE, volumeVoice.
            // HUDScene _createVolumeWindow uses: bgmVolume, seVolume, volumeVoice.
            // This is inconsistent. 'volumeVoice' matches. 'bgmVolume' vs 'volumeBGM'.
            // I should use the keys HUDScene uses to avoid breaking existing sound logic in HUD?
            // Or change HUD to use TitleScene keys?
            // If I change HUD to use TitleScene keys, I must ensure HUD's sound playing logic uses new keys.
            // HUDScene: sound.key.startsWith('bgm_')...
            // It doesn't read registry when starting sound?
            // Let's assume for now I should use the keys HUDScene ALREADY uses to avoid breaking.
            // HUD keys: 'bgmVolume', 'seVolume', 'volumeVoice'
            // Title keys: 'volumeBGM', 'volumeSE', 'volumeVoice'
            // I will use HUD keys for now but maybe I should unify them later.
            // For now, adhere to existing HUD keys for safety.
            0x00d4aa,
            (newVol) => {
                // BGM反映
                this.sound.sounds.forEach(sound => {
                    if (sound.isPlaying && sound.key.startsWith('bgm_')) {
                        sound.setVolume(newVol);
                    }
                });
            }
        );
        
        // ===========================================
        // SE音量
        // ===========================================
        this._createVolumeSlider(
            this.volumeWindow,
            0, 20,
            '🔔 SE',
            'seVolume', // HUD key
            0x74b9ff,
            (newVol) => {
                // テストSE
                 this.sound.play('se_scroll', { volume: newVol });
            }
        );
        
        // ===========================================
        // ボイス音量
        // ===========================================
        this._createVolumeSlider(
            this.volumeWindow,
            0, 140,
            '🎤 ボイス',
            'volumeVoice', // Shared key
            0xa29bfe,
            (newVol) => {
                this.sound.sounds.forEach(sound => {
                    if (sound.isPlaying && sound.key.startsWith('novel_vc_')) {
                        sound.setVolume(newVol);
                    }
                });
            }
        );

        // 閉じるボタン
        const closeBtn = this.add.rectangle(0, h/2 - 50, 200, 50, 0x555555).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, h/2 - 50, '戻る', { fontSize: '24px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        closeBtn.on('pointerdown', () => this.toggleVolumeWindow());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.05));
        closeBtn.on('pointerout', () => closeBtn.setScale(1.0));
        
        this.volumeWindow.add([closeBtn, closeText]);
    }
    
    // ==========================================================
    // 🔊 音量スライダー生成 (TitleScene準拠)
    // ==========================================================
    _createVolumeSlider(targetContainer, x, y, label, registryKey, color, onChange, isDisabled = false) {
        const sliderWidth = 300; // HUDに合わせて少し小さく
        
        // ラベル (左側) - 位置を左にずらす (-220 -> -280)
        const labelText = this.add.text(x - 280, y, label, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: isDisabled ? '#7a7a8a' : '#ffffff'
        }).setOrigin(0, 0.5);
        
        // スライダー背景
        const sliderBg = this.add.graphics();
        sliderBg.fillStyle(0x3a3a5a, 1);
        sliderBg.fillRoundedRect(x - 100, y - 8, sliderWidth, 16, 8);
        
        // スライダー塗りつぶし
        const currentVolume = this.registry.get(registryKey) !== undefined ? this.registry.get(registryKey) : 0.5;
        const sliderFill = this.add.graphics();
        
        const drawSlider = (vol) => {
            sliderFill.clear();
            sliderFill.fillStyle(isDisabled ? 0x5a5a6a : color, 1);
            sliderFill.fillRoundedRect(x - 100, y - 8, sliderWidth * vol, 16, 8);
        };
        drawSlider(currentVolume);
        
        // パーセント表示
        const percentText = this.add.text(x + 230, y, `${Math.round(currentVolume * 100)}%`, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: isDisabled ? '#5a5a6a' : '#ffffff'
        }).setOrigin(0, 0.5);
        
        targetContainer.add([labelText, sliderBg, sliderFill, percentText]);
        
        if (!isDisabled) {
            // マイナスボタン (位置調整 -140 -> -150)
            const minusBtn = this._createSmallButton(x - 150, y, '－', 0x5a5a7a, () => {
                let vol = this.registry.get(registryKey);
                if (vol === undefined) vol = 0.5;
                vol = Math.max(0, vol - 0.1);
                // 浮動小数点誤差対策
                vol = Math.round(vol * 10) / 10;
                
                this.registry.set(registryKey, vol);
                drawSlider(vol);
                percentText.setText(`${Math.round(vol * 100)}%`);
                if (onChange) onChange(vol);
            });
            
            // プラスボタン (位置調整 +280 -> +290)
            const plusBtn = this._createSmallButton(x + 290, y, '＋', 0x5a5a7a, () => {
                let vol = this.registry.get(registryKey);
                if (vol === undefined) vol = 0.5;
                vol = Math.min(1, vol + 0.1);
                 // 浮動小数点誤差対策
                vol = Math.round(vol * 10) / 10;
                
                this.registry.set(registryKey, vol);
                drawSlider(vol);
                percentText.setText(`${Math.round(vol * 100)}%`);
                if (onChange) onChange(vol);
            });
            
            targetContainer.add([minusBtn, plusBtn]);
        }
    }

    // ==========================================================
    // 小さいボタン（＋/－用）
    // ==========================================================
    _createSmallButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const btnBg = this.add.graphics();
        btnBg.fillStyle(color, 1);
        btnBg.fillRoundedRect(-20, -20, 40, 40, 10); // 少し小さめ
        btn.add(btnBg);
        
        const btnText = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(btnText);
        
        const hitArea = this.add.rectangle(0, 0, 40, 40)
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

    toggleVolumeWindow() {
        const isVisible = !this.volumeWindow.visible;
        this.volumeWindow.setVisible(isVisible);
        this.volumeOverlay.setVisible(isVisible); // オーバーレイも同期
        if (isVisible) { 
            this.scene.bringToTop(); 
            this.volumeWindow.setScale(0.9); 
            this.tweens.add({ targets: this.volumeWindow, scale: 1, duration: 200, ease: 'Back.Out' }); 
        }
    }

    toggleSettingsWindow() {
        const isVisible = !this.settingsWindow.visible;
        this.settingsWindow.setVisible(isVisible);
        this.settingsOverlay.setVisible(isVisible); // オーバーレイも同期
        
        if (isVisible) { 
            // 設定画面を開いたらポーズ
            this._pauseGame();
            
            this.scene.bringToTop(); 
            this.settingsWindow.setScale(0.9); 
            this.tweens.add({ targets: this.settingsWindow, scale: 1, duration: 200, ease: 'Back.Out' }); 
            
            if (this.sound.get('se_scroll')) {
                this.sound.play('se_scroll', { volume: 0.5 });
            }

        } else {
            // 設定画面を閉じたらポーズ解除
            this._resumeGame();
        }
    }
    
    // ==========================================================
    // ⏸️ ゲームポーズ（内部メソッド）
    // ==========================================================
    _pauseGame() {
        if (this.isPaused) return;
        this.isPaused = true;
        
        // 他のシーンを一時停止
        ['ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene'].forEach(sceneName => {
            const sc = this.scene.get(sceneName);
            if (sc && sc.scene.isActive()) {
                sc.scene.pause();
            }
        });
        
        // タイマー停止
        if (this.timerEvent) {
            this.timerEvent.paused = true;
        }
    }
    
    // ==========================================================
    // ▶️ ゲーム再開（内部メソッド）
    // ==========================================================
    _resumeGame() {
        if (!this.isPaused) return;
        this.isPaused = false;
        
        // 他のシーンを再開
        ['ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene'].forEach(sceneName => {
            const sc = this.scene.get(sceneName);
            if (sc && sc.scene.isPaused()) {
                sc.scene.resume();
            }
        });
        
        // タイマー再開
        if (this.timerEvent) {
            this.timerEvent.paused = false;
        }
    }

    _createHelpWindow() {
        const startX = 960; const startY = 540;
        
        // オーバーレイを別コンテナに分離（アニメーション対象外）
        this.helpOverlay = this.add.container(startX, startY).setVisible(false).setDepth(349);
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.5).setOrigin(0.5).setInteractive();
        overlay.on('pointerdown', () => this.toggleHelpWindow()); // クリックで閉じる
        this.helpOverlay.add(overlay);
        
        this.helpWindow = this.add.container(960, 540).setVisible(false).setDepth(350); 
        const bg = this.add.rectangle(0, 0, 850, 700, 0xFFFFFF).setStrokeStyle(4, 0x333333);
        // 🚨 修正: fontStyle: 'bold' 削除
        const title = this.add.text(0, -300, '🎮 ゲームの遊び方', { 
            fontSize: '32px', color: '#333', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);
        
        const descText = "1. 患者対応: ベルを鳴らしている患者をクリック\n2. 診察券と保険証の確認\n3. スワップで比較\n4. 受付完了 or 修正依頼";
        const desc = this.add.text(0, -180, descText, { fontSize: '22px', color: '#444', lineHeight: 40, fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        
        // スコアルール
        const scoreTitle = this.add.text(0, -50, '📊 スコアルール', { 
            fontSize: '26px', color: '#2196F3', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);
        
        const scoreRules = "✅ 加点\n  ・正しく受付完了: +100点\n  ・保険証の不備指摘: +50点\n\n❌ 減点\n  ・間違った保険証で受付: -50点\n  ・処方箋エラー見逃し: -30点\n  ・薬渡し間違い: -50点";
        const scoreDesc = this.add.text(0, 80, scoreRules, { 
            fontSize: '18px', color: '#555', lineHeight: 32, fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);
        
        const closeBtn = this.add.rectangle(0, 280, 200, 60, 0x333333).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 280, '閉じる', { fontSize: '24px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        closeBtn.on('pointerdown', () => this.toggleHelpWindow());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.05));
        closeBtn.on('pointerout', () => closeBtn.setScale(1.0));
        this.helpWindow.add([bg, title, desc, scoreTitle, scoreDesc, closeBtn, closeText]);
    }
    toggleHelpWindow() {
        const isVisible = !this.helpWindow.visible;
        this.helpWindow.setVisible(isVisible);
        this.helpOverlay.setVisible(isVisible); // オーバーレイも同期
        if (isVisible) { this.scene.bringToTop(); this.helpWindow.setScale(0.8); this.tweens.add({ targets: this.helpWindow, scale: 1, duration: 200, ease: 'Back.Out' }); }
    }

    _createScoreWindow() {
        const startX = 960; const startY = 540;
        
        // オーバーレイを別コンテナに分離（アニメーション対象外）
        this.scoreOverlay = this.add.container(startX, startY).setVisible(false).setDepth(349);
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.5).setOrigin(0.5).setInteractive();
        overlay.on('pointerdown', () => this.toggleScoreWindow()); // クリックで閉じる
        this.scoreOverlay.add(overlay);
        
        this.scoreWindow = this.add.container(startX, startY).setVisible(false).setDepth(350); 

        const bg = this.add.rectangle(0, 0, 800, 600, 0x2C3E50).setStrokeStyle(4, 0xFFD700);
        // 🚨 修正: fontStyle: 'bold' 削除
        const title = this.add.text(0, -260, '🏆 スコアレポート', { 
            fontSize: '36px', color: '#FFD700', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);

        this.totalScoreText = this.add.text(0, -200, 'Total Score: 0 pt', { 
            fontSize: '48px', color: '#FFF', fontFamily: '"Noto Sans JP"' 
        }).setOrigin(0.5);

        this.scoreLogContainer = this.add.container(0, -150);

        const closeBtn = this.add.rectangle(0, 260, 200, 60, 0xFFFFFF).setInteractive({ useHandCursor: true });
        const closeText = this.add.text(0, 260, '閉じる', { fontSize: '24px', color: '#000', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
        closeBtn.on('pointerdown', () => this.toggleScoreWindow());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.05));
        closeBtn.on('pointerout', () => closeBtn.setScale(1.0));

        this.scoreWindow.add([bg, title, this.totalScoreText, this.scoreLogContainer, closeBtn, closeText]);
        
        // 🚨 修正: マスク作成 (スクロール用)
        // ログ表示領域: y=-150 から 高さ350px程度
        // ワールド座標: Window(960, 540) + (-150) = 390 (Top)
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(960 - 380, 540 - 150, 760, 360); // Window中心からの相対座標ではなくワールド座標
        const mask = maskShape.createGeometryMask();
        this.scoreLogContainer.setMask(mask);
        
        // 🚨 修正: スクロール操作
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (this.scoreWindow.visible) {
                this._scrollLog(deltaY);
            }
        });
        
        // 📱 タッチドラッグスクロール対応
        this.scoreLogDragging = false;
        this.scoreLogDragStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            if (this.scoreWindow && this.scoreWindow.visible) {
                // スコアウィンドウ領域内（中央800x600の領域）の場合のみ
                const bounds = { left: 960 - 400, right: 960 + 400, top: 540 - 300, bottom: 540 + 300 };
                if (pointer.x >= bounds.left && pointer.x <= bounds.right &&
                    pointer.y >= bounds.top && pointer.y <= bounds.bottom) {
                    this.scoreLogDragging = true;
                    this.scoreLogDragStartY = pointer.y;
                }
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.scoreLogDragging && this.scoreWindow && this.scoreWindow.visible) {
                const deltaYVal = this.scoreLogDragStartY - pointer.y;
                this._scrollLog(deltaYVal * 2);
                this.scoreLogDragStartY = pointer.y;
            }
        });

        this.input.on('pointerup', () => {
            this.scoreLogDragging = false;
        });

        this.input.on('pointerupoutside', () => {
            this.scoreLogDragging = false;
        });
        
        // キーボード操作
        this.input.keyboard.on('keydown-UP', () => {
            if (this.scoreWindow.visible) this._scrollLog(-50);
        });
        this.input.keyboard.on('keydown-DOWN', () => {
             if (this.scoreWindow.visible) this._scrollLog(50);
        });
        
        // 現在の患者用ログ初期化
        this.currentPatientLog = [];
    }
    
    // ==========================================================
    // 🔄 現在の患者用ログをリセット (CheckScene開始時などに呼ぶ)
    // ==========================================================
    resetCurrentPatientLog() {
        this.currentPatientLog = [];
    }
    
    // ==========================================================
    // 📥 現在の患者用ログを取得
    // ==========================================================
    getCurrentPatientLog() {
        return this.currentPatientLog || [];
    }

    // ==========================================================
    // 🔄 患者ログを復元 (CheckSceneで患者切り替え時などに呼ぶ)
    // ==========================================================
    restoreCurrentPatientLog(log) {
        this.currentPatientLog = Array.isArray(log) ? [...log] : [];
    }

    toggleScoreWindow() {
        const isVisible = !this.scoreWindow.visible;
        
        if (isVisible) {
            this._updateScoreContent();
            
            this.scene.bringToTop();
            this.scoreWindow.setVisible(true);
            this.scoreOverlay.setVisible(true); // オーバーレイも同期
            this.scoreWindow.setScale(0.8);
            this.tweens.add({ targets: this.scoreWindow, scale: 1, duration: 200, ease: 'Back.Out' });
        } else {
            this.scoreWindow.setVisible(false);
            this.scoreOverlay.setVisible(false); // オーバーレイも同期
            this.events.emit('scoreWindowClosed');
        }
    }

// =========================================================
    // 🏆 スコア詳細表示 (履歴データ参照版)
    // =========================================================
    _updateScoreContent() {
        const reception = this.scene.get('ReceptionScene');
        if (!reception) return;

        // 🚨 修正: Total ScoreはRegistryから取得
        const currentScore = this.registry.get('score') || 0;
        this.totalScoreText.setText(`Total Score: ${currentScore} pt`);

        this.scoreLogContainer.removeAll(true);
        
        // 🚨 修正: patientQueueではなく、完了済みの patientHistory を参照する
        // (まだpatientHistoryが未定義の場合に備えて空配列をデフォルトに)
        const allHistory = reception.patientHistory || [];
        
        // 🚨 修正: 全履歴を表示 (スクロール対応)
        // allHistory.slice(-4); // 制限を解除
        const history = allHistory; 
        
        let listY = 0;
        // const maxY = 350; 

        history.forEach((data) => {
            const mistakes = data.currentMistakePoints;
            const details = data.mistakeLog || [];
            
            let resultStr = '⭕️ Perfect';
            let color = '#2ECC71'; 

            if (mistakes > 15) { resultStr = '❌ Bad'; color = '#E74C3C'; } 
            else if (mistakes > 5) { resultStr = '⚠️ Warning'; color = '#F1C40F'; } 

            // 🚨 修正: 各患者の獲得合計スコアを計算 (mistakeLogではなく、currentPatientLogなどの情報が必要だが、ここでは簡易的にMistakeLog分を引くか、ReceptionScene側で計算した値を使う)
            // 実は ReceptionScene.totalScore は全体の累積。
            // ここでは表示用に data.mistakeLog の合計(マイナス) と、成功報酬(プラス) を合わせたいが、dataには成功報酬が含まれていない可能性がある。
            // 暫定対応: data.totalPoints (もしあれば) を使うか、data.mistakeLogの合計を表示。
            // User依頼: "名前の隣には全体ポイント獲得数を表示してください" -> Reception(+40) + Accounting(+100) - Mistakes
            
            // data には currentMistakePoints (正の整数) が入っている。
            // ReceptionScene で addPatientHistory する際に、その患者の獲得スコアを保存する必要がある。
            // 今の data 構造: { name, currentMistakePoints, mistakeLog, ... }
            // これに earnedScore を追加するのがベストだが、今は HUDScene 側で計算できない。
            // 仕方ないので、data.earnedScore がある前提で表示し、なければ計算する。
            
            const earnedScore = data.earnedScore !== undefined ? data.earnedScore : 0;
            
            // 1. ヘッダー
            const headerText = this.add.text(-350, listY, 
                `${data.name} 様: ${resultStr} (Total ${earnedScore >= 0 ? '+' : ''}${earnedScore} pt)`, 
                { fontSize: '24px', color: color, fontFamily: '"Noto Sans JP"' }
            );
            this.scoreLogContainer.add(headerText);
            
            listY += 35; 

            // 2. 詳細（「会計完了」「金額正解」は除外）
            const filteredDetails = details.filter(log => {
                if (!log.reason) return true;
                if (log.reason.includes('会計完了')) return false;
                if (log.reason.includes('金額正解')) return false;
                return true;
            });
            if (filteredDetails.length > 0) {
                filteredDetails.forEach(log => {
                    let pointDisplay = '';
                    const p = log.points;
                    const isMistake = log.isMistake;
                    
                    // 🚨 修正: isMistake フラグで判定（pointsは正の値でもミス）
                    if (isMistake === true) {
                        // ミスの場合: 記号で表示
                        const absPoints = Math.abs(p);
                        let symbol = '⚠️';
                        
                        if (absPoints < 10) {
                            symbol = '△';
                        } else if (absPoints < 20) {
                            symbol = '⚠️';
                        } else {
                            // 20点以上: ❌
                            symbol = '❌';
                        }
                        
                        pointDisplay = symbol;
                    } else if (isMistake === false) {
                        // ボーナスの場合: ポイント表示
                        if (p > 0) {
                            pointDisplay = `(+${p})`;
                        } else if (p < 0) {
                            pointDisplay = `(${p})`;
                        }
                    } else {
                        // isMistake未定義の場合は負ならミス扱い
                        if (p < 0) {
                            const absPoints = Math.abs(p);
                            let symbol = absPoints < 10 ? '△' : (absPoints < 20 ? '⚠️' : '❌');
                            pointDisplay = symbol;
                        } else if (p > 0) {
                            pointDisplay = `(+${p})`;
                        }
                    }

                    const detailText = this.add.text(-320, listY, 
                        `・${log.reason} ${pointDisplay}`, 
                        { fontSize: '20px', color: '#DDDDDD', fontFamily: '"Noto Sans JP"' }
                    );
                    this.scoreLogContainer.add(detailText);
                    listY += 28; 
                });

            } else {
                const noMistake = this.add.text(-320, listY, 
                    `・ミスなし`, 
                    { fontSize: '18px', color: '#888888', fontFamily: '"Noto Sans JP"' }
                );
                this.scoreLogContainer.add(noMistake);
                listY += 28;
            }

            listY += 15;
            
            // 区切り線
            const line = this.add.rectangle(0, listY, 700, 1, 0x666666);
            this.scoreLogContainer.add(line);
            listY += 15;
        });

        if (history.length === 0) {
            const noData = this.add.text(0, 100, 'データがありません', { fontSize: '24px', color: '#AAA', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
            this.scoreLogContainer.add(noData);
            listY += 200;
        }
        
        // スクロール設定
        this.logContentHeight = listY;
        this.logVisibleHeight = 360;
        this.logStartY = -150; // コンテナの初期Y座標 (scoreWindow内)
        
        // コンテンツが溢れている場合、初期位置を一番下（最新）に合わせる
        // コンテナのY座標を上にずらす = コンテンツが上に移動 = 下が見える
        if (this.logContentHeight > this.logVisibleHeight) {
            // 最下部が表示される位置:
            // Top of content relative to container is 0.
            // Bottom of content is this.logContentHeight.
            // Visible area top is this.logStartY.
            // We want (logStartY + logVisibleHeight) to align with (container.y + logContentHeight)?
            // No. Container Y determines where 0 is.
            // If container.y = Y_POS, then visible slice is -Y_POS relative to content?
            
            // Logic:
            // Container Y range: 
            // MaxY: logStartY (Top aligned)
            // MinY: logStartY - (logContentHeight - logVisibleHeight) (Bottom aligned)
            
            this.scoreLogContainer.y = this.logStartY - (this.logContentHeight - this.logVisibleHeight);
        } else {
            this.scoreLogContainer.y = this.logStartY;
        }
    }
    
    // 🖱️ スクロール処理
    _scrollLog(deltaY) {
        if (!this.logContentHeight || this.logContentHeight <= this.logVisibleHeight) return;
        
        const scrollSpeed = 0.5;
        const moveAmount = deltaY * scrollSpeed;
        
        // 現在のY座標から移動 (スクロールダウン=deltaY正 -> コンテンツは上に移動 -> Yは減る)
        // deltaY > 0 means wheel down. We want to see lower content. Content moves UP. Y decreases.
        let newY = this.scoreLogContainer.y - moveAmount;
        
        // Clamping
        const maxY = this.logStartY; // Top aligned
        const minY = this.logStartY - (this.logContentHeight - this.logVisibleHeight); // Bottom aligned
        
        if (newY > maxY) newY = maxY;
        if (newY < minY) newY = minY;
        
        this.scoreLogContainer.y = newY;
    }


    update(time, delta) {
        // 🆕 チュートリアル監視: 保険ガイドステップなら表示 (Dead codeからの移植)
        const tm = TutorialManager.getInstance(this.game);
        if (tm.isActive) {
            const currentStep = TutorialSteps[tm.currentStepIndex];
            if (currentStep) {
                const guideSteps = ['insurance_guide_intro', 'insurance_shakai', 'insurance_kokuho', 'insurance_elderly'];
                
                if (guideSteps.includes(currentStep.id)) {
                    if (!this.insuranceGuideVisible) {
                        this.showInsuranceGuide();
                    }
                } else {
                    if (this.insuranceGuideVisible) {
                        this.hideInsuranceGuide();
                    }
                }
            }
        }

        // ポーズ中はタイマーを更新しない
        if (this.isPaused) return;
        
        // 🆕 チュートリアル中はタイマー停止
        if (tm.isActive) return;

        if (!this.timerText) return;
        
        // ゲーム終了済みなら何もしない
        if (this.gameFinished) return;
        
        if (this.remainingTime > 0) {
            this.remainingTime -= delta / 1000;
            if (this.remainingTime < 0) this.remainingTime = 0;
            const minutes = Math.floor(this.remainingTime / 60).toString().padStart(2, '0');
            const seconds = Math.floor(this.remainingTime % 60).toString().padStart(2, '0');
            this.timerText.setText(`${minutes}:${seconds}`);
            this.timerText.setColor(this.remainingTime <= 60 ? '#FFFF00' : '#FF0000');
        } else {
            // 🚨 タイマー終了 → FINISH演出
            this.timerText.setText('00:00');
            if (!this.gameFinished) {
                this.gameFinished = true;
                this._showFinishSequence();
            }
        }
    }
    
    // ==========================================================
    // 🎬 FINISH演出シーケンス
    // ==========================================================
    _showFinishSequence() {
        // 🆕 チュートリアル中は終了演出を再生しない（TutorialManagerに任せる）
        if (TutorialManager.getInstance(this.game).isActive) {
            console.log('[HUDScene] チュートリアル中のためFINISH演出をスキップ');
            return;
        }

        console.log('[HUDScene] FINISH演出開始');
        
        // 全てのBGMを停止
        this.sound.stopAll();
        
        // 🚨 他のシーンを一時停止
        const scenesToPause = ['ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene'];
        scenesToPause.forEach(name => {
            const s = this.scene.get(name);
            if (s && s.scene.isActive()) {
                this.scene.pause(name);
            }
        });
        
        // 暗転オーバーレイ
        const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0)
            .setDepth(9000).setScrollFactor(0);
        
        this.tweens.add({
            targets: overlay,
            alpha: 0.7,
            duration: 500
        });
        
        // FINISH文字
        const finishText = this.add.text(960, 540, 'FINISH', {
            fontSize: '180px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFD700',
            stroke: '#333333',
            strokeThickness: 12
        }).setOrigin(0.5).setDepth(9001).setScrollFactor(0).setScale(0);
        
        // 登場アニメーション
        this.tweens.add({
            targets: finishText,
            scale: { from: 0, to: 1.2 },
            duration: 500,
            ease: 'Back.Out',
            onComplete: () => {
                // 少し縮んで安定
                this.tweens.add({
                    targets: finishText,
                    scale: 1,
                    duration: 200
                });
            }
        });
        
        // 点滅エフェクト
        this.time.delayedCall(800, () => {
            this.tweens.add({
                targets: finishText,
                alpha: { from: 1, to: 0.5 },
                duration: 200,
                yoyo: true,
                repeat: 3
            });
        });
        
        // 🆕 FINISH専用SE再生 (stopAll後なので直接play)
        try {
            this.sound.play('se_finish', { volume: 1.0 });
            console.log('[HUDScene] se_finish 再生');
        } catch (e) {
            console.warn('[HUDScene] se_finish 再生失敗:', e);
            try {
                this.sound.play('se_reception_completed', { volume: 1.0 });
            } catch (e2) {
                console.warn('[HUDScene] フォールバックSEも再生失敗');
            }
        }
        
        // 2.5秒後にResultSceneへ遷移
        this.time.delayedCall(2500, () => {
            // 最終スコアを取得
            let finalScore = this.registry.get('score') || 0;
            const reception = this.scene.get('ReceptionScene');
            const history = reception ? reception.patientHistory : [];
            
            // 🆕 不要カルテペナルティの計算
            // 来院した患者のIDリストを取得
            const patientQueue = reception && reception.patientManager ? reception.patientManager.patientQueue : [];
            const visitedPatientIds = new Set();
            patientQueue.forEach(patient => {
                const insuranceDetails = patient.insuranceDetails || {};
                const patientId = insuranceDetails['ID'] || insuranceDetails['id'];
                if (patientId) {
                    visitedPatientIds.add(String(patientId));
                }
            });
            
            // heldRecordsのうち、来院した患者のものでないカルテを抽出
            const unusedRecords = this.heldRecords.filter(recordId => {
                return !visitedPatientIds.has(String(recordId));
            });
            
            // 不要カルテペナルティ（-10 × 個数）
            if (unusedRecords.length > 0) {
                const unusedRecordPenalty = -10 * unusedRecords.length;
                finalScore += unusedRecordPenalty;
                this.registry.set('score', finalScore);
                
                console.log(`[HUDScene] 不要カルテペナルティ: ${unusedRecords.length}件 × -10 = ${unusedRecordPenalty}点`);
                console.log(`[HUDScene] 不要カルテID: ${unusedRecords.join(', ')}`);
                
                // スコアログに記録
                let scoreLog = this.registry.get('scoreLog') || [];
                scoreLog.push({
                    reason: `不要カルテ所持 (${unusedRecords.length}件)`,
                    points: unusedRecordPenalty,
                    positive: false,
                    isMistake: true,
                    timestamp: Date.now()
                });
                this.registry.set('scoreLog', scoreLog);
            }
            
            // 🏆 実績チェック
            const scoreLog = this.registry.get('scoreLog') || [];
            const mistakeCount = scoreLog.filter(log => log.isMistake).length;
            const patientCount = history.length;
            this.checkEndGameAchievements(finalScore, mistakeCount, patientCount);
            
            // 全シーンを停止
            scenesToPause.forEach(name => {
                this.scene.stop(name);
            });
            this.scene.stop('HUDScene');
            
            // ResultSceneへ
            this.scene.start('ResultScene', { 
                score: finalScore, 
                history: history 
            });
        });
    }
    updateStatusBoard(finishedCount, currentNum, waitingCount, estimatedTime) {
        if (!this.finishedText || !this.waitingText) return;
        this.finishedText.setText(`${finishedCount}名`);
        this.waitingText.setText(`${waitingCount}名`);
        this.waitingText.setColor(waitingCount >= 5 ? '#E74C3C' : '#555555');
    }
    
    // ==========================================================
    // ➕ スコア加算メソッド (各シーンから呼ばれる) - バッチ処理対応
    // ==========================================================
    addScore(points, reason, isGlobal = true, isMistake = false) {
        // Registryのスコアを更新 (全体ポイントの場合のみ)
        let currentScore = this.registry.get('score') || 0;
        if (isGlobal) {
            currentScore += points;
            this.registry.set('score', currentScore);
        }
        
        // 🆕 ミス時のフィードバック（画面シェイク + 警告SE）
        if (points < 0 || isMistake) {
            this.cameras.main.shake(200, 0.01);
            if (this.sound.get('se_ng')) {
                this.sound.play('se_ng', { volume: 0.6 });
            }
            
            // 🆕 ミス発生時はコンボをリセット
            const gameState = GameStateManager.getInstance(this.game);
            if (gameState) {
                gameState.resetCombo();
            }
        }

        
        // 🚨 修正: スコアログを取得
        let scoreLog = this.registry.get('scoreLog') || [];
        
        let logEntry = {
            reason: reason,
            points: points,
            positive: points >= 0,
            isMistake: isMistake, // 追加
            timestamp: Date.now()
        };
        scoreLog.push(logEntry);
        this.registry.set('scoreLog', scoreLog);
        
        // 現在の患者用ログにも追加
        if (!this.currentPatientLog) this.currentPatientLog = [];
        this.currentPatientLog.push(logEntry);
        
        // 🚨 修正: バッチ処理 - 短時間内に発生したスコアをまとめる
        if (!this.scoreBatch) {
            this.scoreBatch = [];
        }
        
        this.scoreBatch.push({
            reason: reason,
            points: points,
            positive: points >= 0,
            isMistake: isMistake
        });
        
        // 既存のタイマーがあればクリア
        if (this.scoreBatchTimer) {
            clearTimeout(this.scoreBatchTimer);
        }
        
        // 150ms後にまとめて通知を表示
        this.scoreBatchTimer = setTimeout(() => {
            this._showBatchedScoreNotification();
        }, 150);
        
        // ReceptionSceneのスコアも更新しておく（念のため）
        const reception = this.scene.get('ReceptionScene');
        if (reception) {
            reception.totalScore = currentScore;
        }
    }
    
    // ==========================================================
    // 📊 バッチ通知表示（複数スコアをまとめて表示）
    // ==========================================================
    _showBatchedScoreNotification() {
        if (!this.scoreBatch || this.scoreBatch.length === 0) return;
        
        // 🚨 修正: isMistake フラグで分離 (正の値でもミスならミスとして表示)
        // 「金額正解」「会計完了」は通知から除外
        const excludeReasons = ['金額正解', '会計完了'];
        const isExcluded = (reason) => excludeReasons.some(ex => reason && reason.includes(ex));
        
        const scores = this.scoreBatch.filter(s => !s.isMistake && !isExcluded(s.reason));
        const mistakes = this.scoreBatch.filter(s => s.isMistake && !isExcluded(s.reason));
        
        // ミスがある場合は「指摘事項」として表示
        if (mistakes.length > 0) {
            // 🚨 修正: 項目が多い場合は制限する
            let displayMistakes = mistakes;
            let hiddenCount = 0;
            const MAX_ITEMS = 8;
            
            if (mistakes.length > MAX_ITEMS) {
                displayMistakes = mistakes.slice(0, MAX_ITEMS);
                hiddenCount = mistakes.length - MAX_ITEMS;
            }
            
            const notificationData = displayMistakes.map(n => ({
                reason: n.reason,
                positive: false,
                points: n.points,
                isMistake: n.isMistake // 🚨 修正: isMistakeを引き継ぐ
            }));
            
            if (hiddenCount > 0) {
                notificationData.push({
                    reason: `他 ${hiddenCount} 件のミス`,
                    positive: false,
                    points: 0,
                    isMistake: true // 記号表示のため
                });
            }

            this.showScoreNotification('⚠️ 指摘事項', notificationData, '#FF0000');
        }
        
        // スコアがある場合は「得点」として表示
        if (scores.length > 0) {
            // ミスがある場合は少し遅延させる
            const delay = mistakes.length > 0 ? 100 : 0;
            setTimeout(() => {
                const MAX_ITEMS = 8;
                let displayScores = scores;
                let hiddenCount = 0;
                
                if (scores.length > MAX_ITEMS) {
                    displayScores = scores.slice(0, MAX_ITEMS);
                    hiddenCount = scores.length - MAX_ITEMS;
                }
                
                const notificationData = displayScores.map(p => ({
                    reason: p.reason,
                    positive: p.points >= 0,
                    points: p.points,
                    isMistake: p.isMistake // 念のため
                }));
                
                if (hiddenCount > 0) {
                    notificationData.push({
                        reason: `他 ${hiddenCount} 件の加点`,
                        positive: true,
                        points: 0
                    });
                }
                
                this.showScoreNotification('✨ 得点', notificationData, '#00AA00');
            }, delay);
        }
        
        // バッチをクリア
        this.scoreBatch = [];
        this.scoreBatchTimer = null;
    }
    
    // ==========================================================
    // 📊 スコア通知表示（シーン切り替えでも消えない）_showMistakeLog 書式準拠版
    // ==========================================================
    showScoreNotification(headerText, details = [], headerColor = '#00AA00') {
        const startX = 1550; // 画面右側
        const baseY = 220;   // 基準Y座標
        
        // 🚨 修正: アクティブな通知リストを初期化
        if (!this.activeNotifications) {
            this.activeNotifications = [];
        }
        
        // 既存の通知を下にずらす
        const shiftAmount = 100; // 新しい通知のスペース確保
        this.activeNotifications.forEach(notif => {
            if (notif && notif.active) {
                this.tweens.add({
                    targets: notif,
                    y: notif.y + shiftAmount,
                    duration: 200,
                    ease: 'Power2'
                });
            }
        });
        
        const container = this.add.container(startX, baseY);
        container.setDepth(3100).setScrollFactor(0);
        
        // ヘッダー
        const header = this.add.text(0, 0, headerText, {
            fontSize: '28px', 
            color: headerColor, 
            fontFamily: '"Noto Sans JP"', 
            stroke: '#FFF', 
            strokeThickness: 3
        }).setOrigin(0.5);
        container.add(header);
        
        let currentY = 40;
        
        // 詳細ログ一覧
        details.forEach(log => {
            // 点数が0で理由だけの場合はスキップ（患者名のみなど）
            if (log.points === 0 && !log.reason) return;
            
            // 🚨 修正: 得点のみ色分け（指摘事項は常に赤）
            let color;
            if (log.positive) {
                // 得点: プラス=緑、マイナス=赤
                color = log.points > 0 ? '#00FF00' : '#FF6666';
            } else {
                // 指摘事項: 常に赤
                color = '#FF6666';
            }
            
            // 点数表示のフォーマット
            let displayText;
            if (log.points !== 0) {
                // ミス判定: isMistakeフラグがある、または明示的にマイナス点の場合
                const isMistakeLog = log.isMistake || (!log.positive && log.points < 0);
                
                if (isMistakeLog) {
                    // ポイントの絶対値で判定
                    const absPoints = Math.abs(log.points);
                    let symbol = '⚠️';
                    
                    if (absPoints < 10) {
                        symbol = '△'; // 軽微なミス (1~9点)
                    } else if (absPoints < 20) {
                        symbol = '⚠️'; // 注意 (10~19点)
                    } else {
                        // 重大なミス (20点以上): 20点ごとに❌を増やす
                        const count = Math.floor(absPoints / 20);
                        symbol = '❌'.repeat(Math.max(1, count));
                    }
                    displayText = `・${log.reason} ${symbol}`;
                    // ミス内容の後に点数を表示する場合 (オプション)
                    // displayText += ` (-${absPoints})`; 
                } else {
                    // ボーナスは数値表示（プラス/マイナス記号付き）
                    const sign = log.points >= 0 ? '+' : '';
                    displayText = `・${log.reason} (${sign}${log.points})`;
                }
            } else {
                // 点数0の場合は点数を表示しない（例：「タスク完了」などの通知）
                displayText = `・${log.reason}`;
            }
            
            const detailText = this.add.text(0, currentY, displayText, {
                fontSize: '20px', 
                color: color, 
                fontFamily: '"Noto Sans JP"', 
                stroke: '#000', 
                strokeThickness: 2
            }).setOrigin(0.5);
            container.add(detailText);
            currentY += 30;
        });
        
        // 背景ボード
        const bgHeight = currentY + 20;
        
        // 色変換（文字列→数値）
        let borderColor;
        try {
            borderColor = Phaser.Display.Color.HexStringToColor(headerColor).color;
        } catch (e) {
            borderColor = 0x00AA00;
        }
        
        const bg = this.add.rectangle(0, bgHeight/2 - 20, 400, bgHeight, 0x000000, 0.7)
            .setStrokeStyle(2, borderColor);
        container.addAt(bg, 0); // 最背面に追加
        
        // 🚨 修正: アクティブリストに追加
        this.activeNotifications.unshift(container);
        
        // アニメーション (スライドイン)
        container.x += 400; // 画面外へ
        this.tweens.add({
            targets: container,
            x: startX,
            duration: 500,
            ease: 'Power2'
        });
        
        // 自動消滅
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: container,
                alpha: 0,
                x: startX + 100,
                duration: 500,
                onComplete: () => {
                    // 🚨 修正: アクティブリストから削除
                    const index = this.activeNotifications.indexOf(container);
                    if (index > -1) {
                        this.activeNotifications.splice(index, 1);
                    }
                    container.destroy();
                }
            });
        });
    }
    
    // ==========================================================
    // 🚪 タイトルへ戻る確認ウィンドウ作成
    // ==========================================================
    _createQuitConfirmWindow() {
        this.quitConfirmWindow = this.add.container(960, 540).setVisible(false).setDepth(1000);
        
        // 背景（半透明の黒）
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.7).setInteractive();
        
        // ウィンドウ本体
        const windowBg = this.add.graphics();
        windowBg.fillStyle(0xFFFFFF, 1);
        windowBg.lineStyle(4, 0xE74C3C, 1);
        windowBg.fillRoundedRect(-300, -150, 600, 300, 20);
        windowBg.strokeRoundedRect(-300, -150, 600, 300, 20);
        
        // メッセージ
        const title = this.add.text(0, -60, 'タイトルに戻りますか？', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5);
        
        const subTitle = this.add.text(0, 0, '（進行状況は保存されません）', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#E74C3C'
        }).setOrigin(0.5);
        
        // はいボタン
        const yesBtn = this.add.container(-120, 80);
        const yesBg = this.add.rectangle(0, 0, 180, 60, 0xE74C3C).setInteractive({ useHandCursor: true });
        const yesText = this.add.text(0, 0, 'はい', { fontSize: '24px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF' }).setOrigin(0.5);
        
        yesBg.on('pointerdown', () => {
            this._returnToTitle();
        });
        
        yesBg.on('pointerover', () => yesBg.setScale(1.05));
        yesBg.on('pointerout', () => yesBg.setScale(1.0));
        
        yesBtn.add([yesBg, yesText]);
        
        // いいえボタン
        const noBtn = this.add.container(120, 80);
        const noBg = this.add.rectangle(0, 0, 180, 60, 0x95A5A6).setInteractive({ useHandCursor: true });
        const noText = this.add.text(0, 0, 'いいえ', { fontSize: '24px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF' }).setOrigin(0.5);
        
        noBg.on('pointerdown', () => {
            this.toggleQuitConfirmWindow();
        });
        
        noBg.on('pointerover', () => noBg.setScale(1.05));
        noBg.on('pointerout', () => noBg.setScale(1.0));
        
        noBtn.add([noBg, noText]);
        
        this.quitConfirmWindow.add([overlay, windowBg, title, subTitle, yesBtn, noBtn]);
    }
    
    // ==========================================================
    // 🚪 タイトルへ戻る確認ウィンドウ表示切替
    // ==========================================================
    toggleQuitConfirmWindow() {
        const isVisible = !this.quitConfirmWindow.visible;
        this.quitConfirmWindow.setVisible(isVisible);
        
        if (isVisible) {
            this.scene.bringToTop();
            
            // アニメーション
            this.quitConfirmWindow.setAlpha(0);
            this.tweens.add({
                targets: this.quitConfirmWindow,
                alpha: 1,
                duration: 200
            });
        }
    }
    
    // ==========================================================
    // 🏠 タイトルへ戻る処理
    // ==========================================================
    _returnToTitle() {
        // 全シーン停止
        this.game.scene.scenes.forEach(scene => {
            if (scene.scene.key !== 'HUDScene') {
                scene.scene.stop();
            }
        });
        
        // HUDシーンもフェードアウト
        this.cameras.main.fadeOut(500, 0, 0, 0);
        
        this.time.delayedCall(500, () => {
            // 全音声を停止
            this.sound.stopAll();
            
            // タイトルシーンを起動
            this.scene.stop('HUDScene');
            this.scene.start('TitleScene');
        });
    }
    
    // ==========================================================
    // 🎮 デバッグ用裏コマンドのセットアップ
    // ==========================================================
    _setupDebugCommands() {
        console.log('[HUDScene] _setupDebugCommands() 開始');
        
        // Ctrl+Shift+数字キーで各コマンドを実行
        this.input.keyboard.on('keydown', (event) => {
            // 全てのキー入力をログ
            console.log(`[DEBUG KEY] code=${event.code}, ctrl=${event.ctrlKey}, shift=${event.shiftKey}`);
            
            // Ctrl と Shift が両方押されているかチェック
            if (!event.ctrlKey || !event.shiftKey) return;
            
            console.log(`[DEBUG] Ctrl+Shift 検出: ${event.code}`);
            
            switch (event.code) {
                case 'Digit1': // Ctrl+Shift+1: スコア+50
                    console.log('[DEBUG] Digit1 実行');
                    this._debugAddScore(50);
                    break;
                case 'Digit2': // Ctrl+Shift+2: スコア-25
                    console.log('[DEBUG] Digit2 実行');
                    this._debugAddScore(-25);
                    break;
                case 'Digit3': // Ctrl+Shift+3: 受付完了
                    console.log('[DEBUG] Digit3 実行');
                    this._debugCompleteReception();
                    break;
                case 'Digit4': // Ctrl+Shift+4: 会計完了
                    console.log('[DEBUG] Digit4 実行');
                    this._debugCompletePayment();
                    break;
                case 'Digit9': // Ctrl+Shift+9: 残り時間ゼロ
                    console.log('[DEBUG] Digit9 実行');
                    this._debugSetTimeZero();
                    break;
                default:
                    console.log(`[DEBUG] 未対応のキー: ${event.code}`);
            }
        });
        
        console.log('[HUDScene] デバッグコマンド有効: Ctrl+Shift+1/2/3/4/9');
    }
    
    // ==========================================================
    // 🎮 デバッグ: スコア加算/減算
    // ==========================================================
    _debugAddScore(points) {
        const reception = this.scene.get('ReceptionScene');
        if (reception) {
            reception.totalScore = (reception.totalScore || 0) + points;
        }
        
        let currentScore = this.registry.get('score') || 0;
        currentScore += points;
        this.registry.set('score', currentScore);
        
        const sign = points >= 0 ? '+' : '';
        console.log(`[DEBUG] スコア ${sign}${points} (Total: ${currentScore})`);
        
        // 画面に通知表示
        this.showScoreNotification(`🎮 DEBUG: ${sign}${points}pt`, [{
            reason: 'デバッグコマンド',
            points: points,
            positive: true
        }], points >= 0 ? '#00FF00' : '#FF0000');
    }
    
    // ==========================================================
    // 🎮 デバッグ: 受付完了（最先頭の患者を完了に）
    // ==========================================================
    _debugCompleteReception() {
        const reception = this.scene.get('ReceptionScene');
        if (!reception || !reception.patientQueue) {
            console.log('[DEBUG] ReceptionScene not found');
            return;
        }
        
        // まだ処理完了していない最初の患者を探す
        const patient = reception.patientQueue.find(p => !p.isFinished);
        if (!patient) {
            console.log('[DEBUG] 受付待ちの患者がいません');
            return;
        }
        
        // 患者を完了状態に
        patient.isFinished = true;
        patient.questionnaireCompleted = true;
        patient.myNumberAuthDone = true;
        
        // 患者を会計キューに追加
        const checkScene = this.scene.get('CheckScene');
        let checkQueue = this.registry.get('checkSceneAccountingQueue') || [];
        checkQueue.push(patient);
        this.registry.set('checkSceneAccountingQueue', checkQueue);
        
        if (checkScene && checkScene.accountingQueue) {
            checkScene.accountingQueue.push(patient);
        }
        
        // 履歴に追加
        if (!reception.patientHistory) reception.patientHistory = [];
        reception.patientHistory.push({
            ...patient,
            currentMistakePoints: 0,
            mistakeLog: [],
            earnedScore: 40 // 受付完了スコア
        });
        
        // スコア加算
        this._debugAddScore(40);
        
        console.log(`[DEBUG] 受付完了: ${patient.name}`);
        
        // 患者UIを非表示に
        if (patient.button) patient.button.setVisible(false);
        if (patient.nameTag) patient.nameTag.setVisible(false);
        if (patient.bellIcon) patient.bellIcon.setVisible(false);
    }
    
    // ==========================================================
    // 🎮 デバッグ: 会計完了（一番上の患者を完了に）
    // ==========================================================
    _debugCompletePayment() {
        const checkScene = this.scene.get('CheckScene');
        let checkQueue = this.registry.get('checkSceneAccountingQueue') || [];
        
        if (checkQueue.length === 0) {
            console.log('[DEBUG] 会計待ちの患者がいません');
            return;
        }
        
        // 最初の患者を取り出す
        const patient = checkQueue.shift();
        this.registry.set('checkSceneAccountingQueue', checkQueue);
        
        if (checkScene && checkScene.accountingQueue) {
            const idx = checkScene.accountingQueue.findIndex(p => p.name === patient.name);
            if (idx !== -1) {
                checkScene.accountingQueue.splice(idx, 1);
            }
        }
        
        // 完了カウントを増やす
        const reception = this.scene.get('ReceptionScene');
        if (reception) {
            reception.lastFinishedNumber = (reception.lastFinishedNumber || 0) + 1;
        }
        
        // 会計完了スコア加算
        this._debugAddScore(100);
        
        console.log(`[DEBUG] 会計完了: ${patient.name}`);
    }
    
    // ==========================================================
    // 🎮 デバッグ: 残り時間をゼロに
    // ==========================================================
    _debugSetTimeZero() {
        if (this.gameFinished) {
            console.log('[DEBUG] 既にゲーム終了済み');
            return;
        }
        
        this.remainingTime = 0;
        this.timerText.setText('00:00');
        this.gameFinished = true;
        
        console.log('[DEBUG] 残り時間を0に設定 → FINISH演出開始');
        this._showFinishSequence();
    }
    
    // ==========================================================
    // ⏸️ ポーズ機能セットアップ（Escで設定画面を開閉）
    // ==========================================================
    _setupPauseFunction() {
        this.isPaused = false;
        
        // Escキーで設定画面を開閉（= ポーズ切替）
        this.input.keyboard.on('keydown-ESC', () => {
            this.toggleSettingsWindow();
        });
    }
    
    // ==========================================================
    // 🏆 実績システム
    // ==========================================================
    _setupAchievements() {
        // 実績定義
        this.achievementDefinitions = [
            { id: 'first_clear', name: '初クリア', description: 'ゲームを初めてクリアした', icon: '🎉' },
            { id: 'score_500', name: 'ベテラン', description: '500点以上獲得', icon: '⭐' },
            { id: 'score_1000', name: 'エキスパート', description: '1000点以上獲得', icon: '🌟' },
            { id: 'score_2000', name: 'マスター', description: '2000点以上獲得', icon: '🏆' },
            { id: 'no_miss', name: 'パーフェクト', description: 'ミスなしでクリア', icon: '💎' },
            { id: 'patients_10', name: '働き者', description: '10人以上の患者を対応', icon: '👨‍⚕️' },
            { id: 'speed_demon', name: 'スピードスター', description: '1人を30秒以内で対応', icon: '⚡' }
        ];
        
        // LocalStorageから解除済み実績を読み込み
        const saved = localStorage.getItem('hospitalReceptionAchievements');
        this.unlockedAchievements = saved ? JSON.parse(saved) : [];
    }
    
    // 実績解除チェック
    checkAchievement(achievementId) {
        if (this.unlockedAchievements.includes(achievementId)) {
            return false; // 既に解除済み
        }
        
        const achievement = this.achievementDefinitions.find(a => a.id === achievementId);
        if (!achievement) return false;
        
        // 解除
        this.unlockedAchievements.push(achievementId);
        localStorage.setItem('hospitalReceptionAchievements', JSON.stringify(this.unlockedAchievements));
        
        // 通知表示
        this._showAchievementUnlock(achievement);
        return true;
    }
    
    // 実績解除通知
    _showAchievementUnlock(achievement) {
        const container = this.add.container(960, -100).setDepth(600);
        
        const bg = this.add.rectangle(0, 0, 400, 80, 0x222222, 0.95)
            .setStrokeStyle(3, 0xFFD700);
        
        const icon = this.add.text(-160, 0, achievement.icon, { fontSize: '40px' }).setOrigin(0.5);
        const title = this.add.text(-80, -15, '🏆 実績解除！', {
            fontSize: '18px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFD700'
        }).setOrigin(0, 0.5);
        const name = this.add.text(-80, 15, achievement.name, {
            fontSize: '22px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF'
        }).setOrigin(0, 0.5);
        
        container.add([bg, icon, title, name]);
        
        // スライドイン
        this.tweens.add({
            targets: container,
            y: 80,
            duration: 500,
            ease: 'Back.easeOut',
            onComplete: () => {
                // 3秒後にスライドアウト
                this.time.delayedCall(3000, () => {
                    this.tweens.add({
                        targets: container,
                        y: -100,
                        duration: 300,
                        onComplete: () => container.destroy()
                    });
                });
            }
        });
        
        // SE再生（存在チェック付き）
        if (this.sound && this.cache.audio.exists('se_correct')) {
            this.sound.play('se_correct', { volume: 0.8 });
        }
    }
    
    // ゲーム終了時に実績チェック
    checkEndGameAchievements(finalScore, mistakeCount, patientCount) {
        // 初クリア
        this.checkAchievement('first_clear');
        
        // スコア実績
        if (finalScore >= 500) this.checkAchievement('score_500');
        if (finalScore >= 1000) this.checkAchievement('score_1000');
        if (finalScore >= 2000) this.checkAchievement('score_2000');
        
        // ノーミス
        if (mistakeCount === 0) this.checkAchievement('no_miss');
        
        // 患者数
        if (patientCount >= 10) this.checkAchievement('patients_10');
    }

    // ==========================================
    // デバッグ用: チュートリアルスキップボタン
    // ==========================================
    _createDebugButtons() {
        // タイマーの下（Y=220付近）に配置
        const startX = 170;
        const startY = 220;
        const gapY = 45;
        
        const createBtn = (label, y, id) => {
            // 背景
            const btn = this.add.rectangle(startX, y, 220, 36, 0x2C3E50)
                .setStrokeStyle(2, 0x9B59B6)
                .setInteractive({ useHandCursor: true })
                .setDepth(20000);
            
            // ラベル
            const text = this.add.text(startX, y, label, { 
                fontSize: '15px', 
                color: '#FFFFFF', 
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5).setDepth(20001);
            
            // ホバーエフェクト
            btn.on('pointerover', () => {
                btn.setFillStyle(0x9B59B6);
            });
            btn.on('pointerout', () => {
                btn.setFillStyle(0x2C3E50);
            });
            
            // クリックハンドラ
            btn.on('pointerdown', () => {
                console.log(`[HUDScene] Debug button clicked: ${id}`);
                
                // SE再生
                if (this.sound && this.sound.get('se_button_click')) {
                    this.sound.play('se_button_click', { volume: 0.5 });
                }
                
                const tm = TutorialManager.getInstance(this.game);
                
                if (id === 9) {
                    // チュートリアル完了
                    tm.skip();
                    return;
                }
                
                // CheckSceneのメソッドを呼び出し
                const checkScene = this.scene.get('CheckScene');
                if (checkScene && checkScene._debugSkipPatient) {
                    checkScene._debugSkipPatient(id);
                } else {
                    console.warn('[HUDScene] CheckScene or _debugSkipPatient not found, using TutorialManager directly');
                    // フォールバック: TutorialManagerで直接ジャンプ
                    if (id === 1) tm.jumpToStep('check_select_patient_2');
                    if (id === 2) tm.jumpToStep('check_select_patient_3');
                }
            });
        };
        
        createBtn('▶ 1人目をスキップ', startY, 1);
        createBtn('▶▶ 2人目をスキップ', startY + gapY, 2);
        createBtn('✓ チュートリアル完了', startY + gapY * 2, 9);
    }


    // ==========================================================
    // ❓ ヘルプウィンドウ
    // ==========================================================
    _createHelpWindow() {
        this.helpPopup = new HelpPopup(this);
    }
    
    toggleHelpWindow(defaultTab = null) {
        if (!this.helpPopup) return;
        
        if (this.helpPopup.isVisible && !defaultTab) {
            this.helpPopup.hide();
        } else {
            this.helpPopup.show(defaultTab);
        }
    }
}