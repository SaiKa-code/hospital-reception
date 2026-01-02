import { addTransitionMethods } from './TransitionManager.js';
import { PERFORMANCE_CONFIG } from './GameConfig.js';

export class ResultScene extends Phaser.Scene {
    constructor() {
        super('ResultScene');
        
        // パーティクルプール
        this._particlePool = [];
        this._activeParticles = [];
        this._currentQuality = PERFORMANCE_CONFIG.effectQuality;
    }

    init(data) {
        this.finalScore = data.score || 0;
        this.patientHistory = data.history || [];
        // 🆕 チュートリアルモード用データ
        this.tutorialMode = data.tutorialMode || false;
        this.tutorialResult = data.tutorialResult || 'success'; // 'success' | 'fail'
    }

    create() {
        // 🎬 トランジション
        addTransitionMethods(this);

        // 🎵 BGM停止
        this.sound.stopAll();
        
        // 🚀 パフォーマンス最適化: プールの初期化と品質設定
        this._initParticlePool();
        this._setupFPSMonitor();
        
        // チュートリアルモードの場合は専用レイアウトへ分岐
        if (this.tutorialMode) {
            this._createTutorialLayout();
            return;
        }
        
        // 🏆 ハイスコア処理
        this.isNewHighScore = false;
        const savedHighScore = localStorage.getItem('hospitalReceptionHighScore');
        this.highScore = savedHighScore ? parseInt(savedHighScore, 10) : 0;
        
        if (this.finalScore > this.highScore) {
            this.isNewHighScore = true;
            this.highScore = this.finalScore;
            localStorage.setItem('hospitalReceptionHighScore', this.finalScore.toString());
        }

        // ランク判定
        const rankData = this._calculateRank(this.finalScore);
        this.currentRankData = rankData;
        
        // ====================================================
        // ランク別背景・演出
        // ====================================================
        this._createRankBackground(rankData.rank);
        this._createRankEffects(rankData.rank);

        // ====================================================
        // 🎨 プレミアム レイアウト構成
        // ====================================================
        this._createPremiumLayout(rankData);
    }

    // ====================================================
    // 🎓 チュートリアル専用レイアウト
    // ====================================================
    _createTutorialLayout() {
        // 結果に応じた設定
        const isSuccess = this.tutorialResult === 'success';
        const rank = isSuccess ? 'A' : 'F'; // 成功ならA(ピンク), 失敗ならF(赤/黒)
        const message = isSuccess 
            ? '及第点！！\nこれから一緒に働きましょうね！' 
            : '何しにきたの？\n私たちでは手に負えません！';
        
        // 背景とエフェクト（既存メソッド再利用）
        this._createRankBackground(rank);
        this._createRankEffects(rank);
        
        const centerX = 960;
        const centerY = 540;
        const palette = isSuccess 
            ? { primary: '#E91E63', secondary: '#FF4081', accent: '#FFFFFF', glow: 0xE91E63 } // Rank A
            : { primary: '#FF4444', secondary: '#FF0000', accent: '#FFFFFF', glow: 0xFF0000 }; // Rank F

        // メインメッセージ表示
        const messageText = this.add.text(centerX, centerY - 50, message, {
            fontSize: '64px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: palette.primary,
            stroke: palette.secondary,
            strokeThickness: 6,
            align: 'center',
            lineSpacing: 20
        }).setOrigin(0.5).setDepth(150).setAlpha(0);

        // アニメーション
        this.tweens.add({
            targets: messageText,
            alpha: 1,
            scale: { from: 0.5, to: 1 },
            duration: 800,
            ease: 'Back.Out'
        });

        // ボタン配置（下部）
        const btnY = 850;
        const btnWidth = 320;
        const btnHeight = 70;

        if (isSuccess) {
            // 成功時: タイトルへ戻るのみ
            const titleBtn = this._createGlassButton(centerX, btnY, '🏠 タイトルへ', btnWidth, btnHeight, palette);
            titleBtn.on('pointerdown', () => {
                this._playSE('se_changesean');
                this.time.delayedCall(300, () => location.reload());
            });
        } else {
            // 失敗時: タイトルへ戻るのみ
            const titleBtn = this._createGlassButton(centerX, btnY, '🏠 タイトルへ', btnWidth, btnHeight, palette);
            titleBtn.on('pointerdown', () => {
                this._playSE('se_changesean');
                this.time.delayedCall(300, () => location.reload());
            });
        }
    }
    
    // ====================================================
    // 🎨 プレミアム レイアウト作成
    // ====================================================
    _createPremiumLayout(rankData) {
        const centerX = 960;
        const centerY = 540;
        
        // --- ランク別カラーパレット ---
        const palettes = {
            'S': { primary: '#FFD700', secondary: '#FF8C00', accent: '#FFFFFF', bg: 0x1A1A2E, glow: 0xFFD700 },
            'A': { primary: '#E91E63', secondary: '#FF4081', accent: '#FFFFFF', bg: 0x2D1B2E, glow: 0xE91E63 },
            'B': { primary: '#2196F3', secondary: '#03A9F4', accent: '#FFFFFF', bg: 0x1A2A3E, glow: 0x2196F3 },
            'C': { primary: '#8BC34A', secondary: '#CDDC39', accent: '#FFFFFF', bg: 0x1E2E1A, glow: 0x8BC34A },
            'D': { primary: '#00d4aa', secondary: '#00b4d8', accent: '#FFFFFF', bg: 0x0A1628, glow: 0x00d4aa },
            'F': { primary: '#FF4444', secondary: '#FF0000', accent: '#FFFFFF', bg: 0x2E1A1A, glow: 0xFF0000 }
        };
        const palette = palettes[rankData.rank] || palettes['C'];
        
        // ====================================================
        // 🌟 ヒーローランク表示（中央上部）
        // ====================================================
        const heroContainer = this.add.container(centerX, 280).setDepth(150);
        
        // グローリング（発光エフェクト）
        const glowRing = this.add.circle(0, 0, 150, palette.glow, 0.2).setDepth(1);
        this.tweens.add({
            targets: glowRing,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.3, to: 0 },
            duration: 1500,
            repeat: -1,
            ease: 'Cubic.easeOut'
        });
        
        // 内側グロー
        const innerGlow = this.add.circle(0, 0, 120, palette.glow, 0.1).setDepth(2);
        
        // ランクバッジ背景
        const rankBadge = this.add.graphics().setDepth(3);
        rankBadge.fillStyle(Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.15);
        rankBadge.fillCircle(0, 0, 100);
        rankBadge.lineStyle(4, Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.8);
        rankBadge.strokeCircle(0, 0, 100);
        
        // ランク文字
        const rankText = this.add.text(0, 0, rankData.rank, {
            fontSize: '140px',
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            color: palette.primary,
            stroke: palette.secondary,
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(4);
        
        // ランクラベル
        const rankLabel = this.add.text(0, 85, 'RANK', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: palette.accent,
            letterSpacing: 8
        }).setOrigin(0.5).setAlpha(0.8).setDepth(4);
        
        heroContainer.add([glowRing, innerGlow, rankBadge, rankText, rankLabel]);
        
        // ヒーロー登場アニメーション
        heroContainer.setScale(0).setAlpha(0);
        this.tweens.add({
            targets: heroContainer,
            scale: 1,
            alpha: 1,
            duration: 800,
            ease: 'Back.easeOut',
            delay: 200
        });
        
        // ランクテキストアニメーション
        this._animateRankText(rankText, rankData.rank);
        
        // ====================================================
        // 📊 スコアディスプレイ（中央）
        // ====================================================
        const scoreContainer = this.add.container(centerX, 520).setDepth(140);
        
        // スコアカード背景
        const cardBg = this.add.graphics().setDepth(1);
        cardBg.fillStyle(0x000000, 0.5);
        cardBg.fillRoundedRect(-250, -80, 500, 160, 20);
        cardBg.lineStyle(2, Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.6);
        cardBg.strokeRoundedRect(-250, -80, 500, 160, 20);
        
        // スコアラベル
        const scoreLabel = this.add.text(0, -50, 'FINAL SCORE', {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: palette.accent,
            letterSpacing: 4
        }).setOrigin(0.5).setAlpha(0.7).setDepth(2);
        
        // スコア値（カウントアップアニメーション）
        const scoreValue = this.add.text(0, 10, '0', {
            fontSize: '72px',
            fontFamily: '"Orbitron", "Noto Sans JP", sans-serif',
            color: palette.primary
        }).setOrigin(0.5).setDepth(2);
        
        // ハイスコアバッジ
        const highScoreY = 55;
        if (this.isNewHighScore) {
            const newRecordBg = this.add.graphics().setDepth(2);
            newRecordBg.fillStyle(0xFFD700, 0.2);
            newRecordBg.fillRoundedRect(-80, highScoreY - 15, 160, 30, 15);
            scoreContainer.add(newRecordBg);
            
            const newRecordText = this.add.text(0, highScoreY, '🏆 NEW RECORD!', {
                fontSize: '16px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFD700'
            }).setOrigin(0.5).setDepth(3);
            scoreContainer.add(newRecordText);
            
            this.tweens.add({
                targets: newRecordText,
                alpha: { from: 1, to: 0.5 },
                duration: 500,
                yoyo: true,
                repeat: -1
            });
        } else {
            const highScoreText = this.add.text(0, highScoreY, `BEST: ${this.highScore}`, {
                fontSize: '16px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#888888'
            }).setOrigin(0.5).setAlpha(0.7).setDepth(2);
            scoreContainer.add(highScoreText);
        }
        
        scoreContainer.add([cardBg, scoreLabel, scoreValue]);
        
        // スコアカウントアップアニメーション
        scoreContainer.setAlpha(0);
        this.tweens.add({
            targets: scoreContainer,
            alpha: 1,
            duration: 500,
            delay: 600,
            onComplete: () => {
                // カウントアップ
                this.tweens.addCounter({
                    from: 0,
                    to: this.finalScore,
                    duration: 1500,
                    ease: 'Cubic.easeOut',
                    onUpdate: (tween) => {
                        scoreValue.setText(Math.floor(tween.getValue()).toString());
                    }
                });
            }
        });
        
        // ====================================================
        // 💬 コメントエリア
        // ====================================================
        const comment = this.add.text(centerX, 670, rankData.comment, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: palette.accent,
            align: 'center',
            wordWrap: { width: 600 }
        }).setOrigin(0.5).setAlpha(0).setDepth(140);
        
        this.tweens.add({
            targets: comment,
            alpha: 0.9,
            duration: 800,
            delay: 1200
        });
        
        // ====================================================
        // 📋 スコアログ（右サイド・コンパクト）
        // ====================================================
        this._createCompactScoreLog(palette);
        
        // ====================================================
        // 🎮 アクションボタン
        // ====================================================
        this._createPremiumButtons(palette);
    }
    
    // ====================================================
    // 📋 コンパクトスコアログ（スクロール対応・ミス記号表示）
    // ====================================================
    _createCompactScoreLog(palette) {
        const scoreLog = this.registry.get('scoreLog') || [];
        if (scoreLog.length === 0) return;
        
        const panelX = 1650;
        const panelY = 400;
        const panelW = 320;
        const panelH = 450;
        
        // 半透明パネル
        const logPanel = this.add.graphics().setDepth(130);
        logPanel.fillStyle(0x000000, 0.6);
        logPanel.fillRoundedRect(panelX - panelW/2, panelY - panelH/2, panelW, panelH, 15);
        logPanel.lineStyle(1, Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.3);
        logPanel.strokeRoundedRect(panelX - panelW/2, panelY - panelH/2, panelW, panelH, 15);
        
        // ヘッダー
        this.add.text(panelX, panelY - panelH/2 + 30, '📋 スコアログ', {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: palette.accent
        }).setOrigin(0.5).setDepth(131);
        
        // 区切り線
        const divider = this.add.graphics().setDepth(131);
        divider.lineStyle(1, Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.3);
        divider.lineBetween(panelX - panelW/2 + 15, panelY - panelH/2 + 55, panelX + panelW/2 - 15, panelY - panelH/2 + 55);
        
        // スクロール可能なコンテナを作成
        this.scoreLogContainer = this.add.container(panelX, panelY - panelH/2 + 75).setDepth(131);
        
        // ログエントリ（フィルタなし：全件表示してスクロールで対応）
        const filteredLogs = scoreLog.filter(log => log.points !== 0);
        const itemHeight = 28;
        
        filteredLogs.forEach((log, index) => {
            const y = index * itemHeight;
            const isMistake = log.isMistake;
            const points = log.points;
            
            // ポイント表示の決定（HUDSceneと同じロジック）
            let pointDisplay = '';
            let pointColor = '#4CAF50';
            
            if (isMistake === true) {
                // ミスの場合: 記号で表示
                const absPoints = Math.abs(points);
                if (absPoints < 10) {
                    pointDisplay = '△';
                } else if (absPoints < 20) {
                    pointDisplay = '⚠️';
                } else {
                    pointDisplay = '❌';
                }
                pointColor = '#FF5252';
            } else if (isMistake === false) {
                // ボーナスの場合: ポイント表示
                if (points > 0) {
                    pointDisplay = `+${points}`;
                    pointColor = '#4CAF50';
                } else if (points < 0) {
                    pointDisplay = `${points}`;
                    pointColor = '#FF5252';
                }
            } else {
                // isMistake未定義の場合は負ならミス扱い
                if (points < 0) {
                    const absPoints = Math.abs(points);
                    pointDisplay = absPoints < 10 ? '△' : (absPoints < 20 ? '⚠️' : '❌');
                    pointColor = '#FF5252';
                } else if (points > 0) {
                    pointDisplay = `+${points}`;
                    pointColor = '#4CAF50';
                }
            }
            
            // 理由（左）
            const reasonText = this.add.text(-panelW/2 + 20, y, `• ${log.reason}`, {
                fontSize: '13px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#CCCCCC'
            });
            this.scoreLogContainer.add(reasonText);
            
            // ポイント/記号（右）
            const pointText = this.add.text(panelW/2 - 20, y, pointDisplay, {
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: pointColor
            }).setOrigin(1, 0);
            this.scoreLogContainer.add(pointText);
        });
        
        // スクロール可能領域の設定
        const visibleHeight = panelH - 130; // ヘッダーと合計欄を除いた領域
        const contentHeight = filteredLogs.length * itemHeight;
        
        // マスク作成（スクロール領域）
        const maskShape = this.make.graphics();
        maskShape.fillStyle(0xffffff);
        maskShape.fillRect(panelX - panelW/2 + 10, panelY - panelH/2 + 60, panelW - 20, visibleHeight);
        const mask = maskShape.createGeometryMask();
        this.scoreLogContainer.setMask(mask);
        
        // スクロール状態保存
        this.logScrollData = {
            container: this.scoreLogContainer,
            startY: panelY - panelH/2 + 75,
            contentHeight: contentHeight,
            visibleHeight: visibleHeight
        };
        
        // ホイールでスクロール
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            this._scrollScoreLog(deltaY);
        });

        // 📱 タッチドラッグスクロール対応
        this.logDragging = false;
        this.logDragStartY = 0;
        this.logDragStartScrollY = 0;

        const logPanelBounds = {
            left: panelX - panelW/2,
            right: panelX + panelW/2,
            top: panelY - panelH/2,
            bottom: panelY + panelH/2
        };

        this.input.on('pointerdown', (pointer) => {
            // スコアログパネル内でのみドラッグ開始
            if (pointer.x >= logPanelBounds.left && pointer.x <= logPanelBounds.right &&
                pointer.y >= logPanelBounds.top && pointer.y <= logPanelBounds.bottom) {
                this.logDragging = true;
                this.logDragStartY = pointer.y;
                this.logDragStartScrollY = this.scoreLogContainer ? this.scoreLogContainer.y : 0;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (this.logDragging && this.logScrollData) {
                const deltaYVal = this.logDragStartY - pointer.y;
                this._scrollScoreLog(deltaYVal * 2); // ドラッグ距離をスクロール量に変換
                this.logDragStartY = pointer.y; // 継続的なドラッグに対応
            }
        });

        this.input.on('pointerup', () => {
            this.logDragging = false;
        });

        this.input.on('pointerupoutside', () => {
            this.logDragging = false;
        });

        
        // 合計
        const totalY = panelY + panelH/2 - 35;
        const totalBg = this.add.graphics().setDepth(131);
        totalBg.fillStyle(Phaser.Display.Color.HexStringToColor(palette.primary).color, 0.15);
        totalBg.fillRoundedRect(panelX - panelW/2 + 10, totalY - 12, panelW - 20, 30, 8);
        
        const totalPoints = scoreLog.reduce((sum, log) => sum + log.points, 0);
        const totalColor = totalPoints >= 0 ? '#4CAF50' : '#FF5252';
        this.add.text(panelX, totalY, `合計: ${totalPoints >= 0 ? '+' : ''}${totalPoints}`, {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: totalColor
        }).setOrigin(0.5).setDepth(132);
    }
    
    // スコアログスクロール処理
    _scrollScoreLog(deltaY) {
        if (!this.logScrollData) return;
        
        const { container, startY, contentHeight, visibleHeight } = this.logScrollData;
        if (contentHeight <= visibleHeight) return; // スクロール不要
        
        const scrollSpeed = 0.5;
        const moveAmount = deltaY * scrollSpeed;
        
        let newY = container.y - moveAmount;
        
        // 範囲制限
        const maxY = startY;
        const minY = startY - (contentHeight - visibleHeight);
        
        if (newY > maxY) newY = maxY;
        if (newY < minY) newY = minY;
        
        container.y = newY;
    }
    // ====================================================
    // 🎮 プレミアムボタン
    // ====================================================
    _createPremiumButtons(palette) {
        const btnY = 850;
        const btnWidth = 280;
        const btnHeight = 60;
        
        // リトライボタン（ゲームを直接開始）
        const retryBtn = this._createGlassButton(700, btnY, '🔄 リトライ', btnWidth, btnHeight, palette);
        retryBtn.on('pointerdown', () => {
            this._playSE('se_changesean');
            this._restartGame();
        });
        
        // タイトルへ戻るボタン
        const titleBtn = this._createGlassButton(1220, btnY, '🏠 タイトルへ', btnWidth, btnHeight, palette);
        titleBtn.on('pointerdown', () => {
            this._playSE('se_changesean');
            this.time.delayedCall(300, () => location.reload());
        });
    }
    
    // ====================================================
    // 🔄 ゲーム再スタート処理
    // ====================================================
    _restartGame() {
        // 1. すべてのサウンドを停止
        this.sound.stopAll();
        
        // 2. グローバルタイマー・インターバルをクリア
        if (window.delayedQueueInterval) {
            clearInterval(window.delayedQueueInterval);
            window.delayedQueueInterval = null;
        }
        
        // 3. レジストリをリセット
        this.registry.set('scoreLog', []);
        this.registry.set('checkSceneAccountingQueue', []);
        this.registry.set('delayedAccountingQueue', []);
        this.registry.set('totalScore', 0);
        
        // 4. 全シーンを停止
        const scenesToStop = ['HUDScene', 'ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene', 'TransitionScene'];
        scenesToStop.forEach(sceneName => {
            if (this.scene.isActive(sceneName)) {
                this.scene.stop(sceneName);
            }
        });
        
        // 5. シーン遷移（遅延を入れて確実に停止してからスタート）
        this.time.delayedCall(300, () => {
            // TitleSceneを経由せず直接ReceptionSceneを開始
            this.scene.start('ReceptionScene');
        });
    }
    
    // ====================================================
    // SE再生ヘルパー
    // ====================================================
    _playSE(key, volume = null) {
        const seVolume = volume ?? (this.registry.get('seVolume') ?? 0.5);
        if (this.cache.audio.exists(key)) {
            this.sound.play(key, { volume: seVolume });
        }
    }
    
    // ====================================================
    // 🎮 プレミアムゲームボタン作成（一流ゲームデザイン）
    // ====================================================
    _createGlassButton(x, y, text, width, height, palette) {
        const container = this.add.container(x, y).setDepth(200);
        const primaryColor = Phaser.Display.Color.HexStringToColor(palette.primary).color;
        const secondaryColor = Phaser.Display.Color.HexStringToColor(palette.secondary).color;
        
        // ====================================================
        // レイヤー1: 外側グロー（発光エフェクト）
        // ====================================================
        const outerGlow = this.add.graphics();
        outerGlow.fillStyle(primaryColor, 0.15);
        outerGlow.fillRoundedRect(-width/2 - 8, -height/2 - 8, width + 16, height + 16, 20);
        
        // ====================================================
        // レイヤー2: シャドウ（立体感）
        // ====================================================
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, 12);
        
        // ====================================================
        // レイヤー3: メインボディ（グラデーション風）
        // ====================================================
        const body = this.add.graphics();
        // 下部（暗め）
        body.fillStyle(0x1a1a2e, 0.95);
        body.fillRoundedRect(-width/2, -height/2, width, height, 12);
        // 上部ハイライト
        body.fillStyle(0x2a2a4e, 0.6);
        body.fillRoundedRect(-width/2 + 2, -height/2 + 2, width - 4, height/2, { tl: 10, tr: 10, bl: 0, br: 0 });
        
        // ====================================================
        // レイヤー4: ボーダー（ネオン効果）
        // ====================================================
        const border = this.add.graphics();
        border.lineStyle(2, primaryColor, 0.8);
        border.strokeRoundedRect(-width/2, -height/2, width, height, 12);
        // 内側のサブボーダー
        border.lineStyle(1, primaryColor, 0.3);
        border.strokeRoundedRect(-width/2 + 3, -height/2 + 3, width - 6, height - 6, 9);
        
        // ====================================================
        // レイヤー5: アイコン＆テキスト
        // ====================================================
        const parts = text.split(' ');
        const icon = parts[0];
        const labelText = parts.slice(1).join(' ');
        
        // アイコン
        const iconEl = this.add.text(-width/4 + 10, 0, icon, {
            fontSize: '28px'
        }).setOrigin(0.5);
        
        // ラベル
        const label = this.add.text(20, 0, labelText, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // ====================================================
        // レイヤー6: シャイン効果（上部ハイライトライン）
        // ====================================================
        const shine = this.add.graphics();
        shine.lineStyle(2, 0xFFFFFF, 0.2);
        shine.beginPath();
        shine.moveTo(-width/2 + 15, -height/2 + 8);
        shine.lineTo(width/2 - 15, -height/2 + 8);
        shine.strokePath();
        
        container.add([outerGlow, shadow, body, border, iconEl, label, shine]);
        
        // ====================================================
        // インタラクション
        // ====================================================
        const hitArea = new Phaser.Geom.Rectangle(-width/2, -height/2, width, height);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        container.input.cursor = 'pointer';
        
        // ホバー状態
        container.on('pointerover', () => {
            this._playSE('se_scroll', 0.3);
            
            // スケールアップ
            this.tweens.add({
                targets: container,
                scale: 1.08,
                duration: 150,
                ease: 'Back.easeOut'
            });
            
            // グロー強化
            outerGlow.clear();
            outerGlow.fillStyle(primaryColor, 0.35);
            outerGlow.fillRoundedRect(-width/2 - 12, -height/2 - 12, width + 24, height + 24, 24);
            
            // ボーダー輝度アップ
            border.clear();
            border.lineStyle(3, primaryColor, 1);
            border.strokeRoundedRect(-width/2, -height/2, width, height, 12);
            border.lineStyle(1, 0xFFFFFF, 0.5);
            border.strokeRoundedRect(-width/2 + 3, -height/2 + 3, width - 6, height - 6, 9);
            
            // テキスト色変更
            label.setColor(palette.primary);
        });
        
        container.on('pointerout', () => {
            // スケールダウン
            this.tweens.add({
                targets: container,
                scale: 1,
                duration: 150
            });
            
            // グロー元に戻す
            outerGlow.clear();
            outerGlow.fillStyle(primaryColor, 0.15);
            outerGlow.fillRoundedRect(-width/2 - 8, -height/2 - 8, width + 16, height + 16, 20);
            
            // ボーダー元に戻す
            border.clear();
            border.lineStyle(2, primaryColor, 0.8);
            border.strokeRoundedRect(-width/2, -height/2, width, height, 12);
            border.lineStyle(1, primaryColor, 0.3);
            border.strokeRoundedRect(-width/2 + 3, -height/2 + 3, width - 6, height - 6, 9);
            
            // テキスト色元に戻す
            label.setColor('#FFFFFF');
        });
        
        // クリック時のプレスエフェクト
        container.on('pointerdown', () => {
            this.tweens.add({
                targets: container,
                scale: 0.95,
                duration: 50,
                yoyo: true
            });
        });
        
        // ====================================================
        // 登場アニメーション
        // ====================================================
        container.setAlpha(0).setScale(0.8);
        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 500,
            delay: 1500,
            ease: 'Back.easeOut'
        });
        
        // 待機アニメーション（微かな脈動）
        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: outerGlow,
                alpha: { from: 1, to: 0.6 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.easeInOut'
            });
        });
        
        return container;
    }
    
    // ====================================================
    // ランク別背景作成
    // ====================================================
    _createRankBackground(rank) {
        const bgColors = {
            'S': { top: 0xFFD700, bottom: 0xFF8C00, particles: [0xFFD700, 0xFFFFFF, 0xFFA500] },
            'A': { top: 0xFFB6C1, bottom: 0xE91E63, particles: [0xFF69B4, 0xFFB6C1, 0xFFC0CB] },
            'B': { top: 0x87CEEB, bottom: 0x2196F3, particles: [0x00BFFF, 0x87CEFA, 0xADD8E6] },
            'C': { top: 0x90EE90, bottom: 0x8BC34A, particles: [0x98FB98, 0x90EE90, 0x32CD32] },
            'D': { top: 0x0a1628, bottom: 0x1a1a2e, particles: [0x00d4aa, 0x00b4d8, 0x16213e] },
            'F': { top: 0x8B0000, bottom: 0x2F0000, particles: [0xFF0000, 0x8B0000, 0x000000] }
        };
        
        const colors = bgColors[rank] || bgColors['C'];
        
        // グラデーション背景
        const graphics = this.add.graphics();
        for (let y = 0; y <= 1080; y += 2) {
            const ratio = y / 1080;
            const r = Phaser.Display.Color.Interpolate.ColorWithColor(
                Phaser.Display.Color.IntegerToColor(colors.top),
                Phaser.Display.Color.IntegerToColor(colors.bottom),
                1080,
                y
            );
            graphics.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b));
            graphics.fillRect(0, y, 1920, 2);
        }
        graphics.setDepth(0);
        
        // 装飾パーティクル（ランクに応じて量を変える）
        // 🚀 パフォーマンス最適化: 上限と品質設定を適用
        const particleCount = { 'S': 100, 'A': 70, 'B': 50, 'C': 30, 'D': 15, 'F': 20 };
        const baseCount = particleCount[rank] || 30;
        const count = this._getOptimizedParticleCount(baseCount);
        
        for (let i = 0; i < count; i++) {
            const x = Phaser.Math.Between(0, 1920);
            const y = Phaser.Math.Between(0, 1080);
            const color = Phaser.Math.RND.pick(colors.particles);
            const size = rank === 'S' ? Phaser.Math.Between(8, 25) : Phaser.Math.Between(5, 15);
            
            // プールからパーティクルを取得または新規作成
            const particle = this._getParticleFromPool(x, y, size, color, rank === 'F' ? 0.3 : 0.6);
            
            // パーティクルアニメーション
            if (rank === 'S' || rank === 'A') {
                this.tweens.add({
                    targets: particle,
                    y: y - Phaser.Math.Between(50, 200),
                    alpha: 0,
                    duration: Phaser.Math.Between(2000, 4000),
                    repeat: -1,
                    delay: Phaser.Math.Between(0, 2000)
                });
            }
        }
    }
    
    // ====================================================
    // ランク別エフェクト作成
    // ====================================================
    _createRankEffects(rank) {
        // ランク別SE再生
        const seVolume = this.registry.get('seVolume') ?? 0.5;
        
        switch (rank) {
            case 'S':
                // Sランク: 2つのSEをランダムに選択
                const sSE = Phaser.Math.RND.pick(['se_score_s1', 'se_score_s2']);
                if (this.cache.audio.exists(sSE)) {
                    this.sound.play(sSE, { volume: seVolume });
                }
                this._createSRankEffects();
                break;
            case 'A':
                if (this.cache.audio.exists('se_score_a')) {
                    this.sound.play('se_score_a', { volume: seVolume });
                }
                this._createARankEffects();
                break;
            case 'B':
                if (this.cache.audio.exists('se_score_b')) {
                    this.sound.play('se_score_b', { volume: seVolume });
                }
                this._createBRankEffects();
                break;
            case 'C':
                // Cランク: BランクのSEを使用
                if (this.cache.audio.exists('se_score_b')) {
                    this.sound.play('se_score_b', { volume: seVolume * 0.8 });
                }
                this._createCRankEffects();
                break;
            case 'D':
                if (this.cache.audio.exists('se_score_d')) {
                    this.sound.play('se_score_d', { volume: seVolume });
                }
                this._createDRankEffects();
                break;
            case 'F':
                // Fランク: DランクのSEを使用
                if (this.cache.audio.exists('se_score_d')) {
                    this.sound.play('se_score_d', { volume: seVolume });
                }
                this._createFRankEffects();
                break;
        }
    }
    
    // ====================================================
    // Sランク: スタイリッシュ＆クール演出
    // ====================================================
    _createSRankEffects() {
        // 🖤 ダークオーバーレイ（ネオンを際立たせる）
        const darkOverlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.3).setDepth(1);
        
        // ⚡ ネオンライン（八角形パターン）
        this._createNeonOctagon();
        
        // 💠 回転する幾何学フレーム
        this._createGeometricFrames();
        
        // ✨ 流れるライトパーティクル
        this._createLightStreams();
        
        // 🌟 パルシングオーラ
        this._createPulsingAura();
        
        // ⚡ グリッチエフェクト（定期的）
        this.time.addEvent({
            delay: 3000,
            callback: () => this._glitchEffect(),
            loop: true
        });
        
        // 💫 ゴールドダスト（上品なパーティクル）
        this.time.addEvent({
            delay: 80,
            callback: () => this._spawnGoldDust(),
            loop: true
        });
    }
    
    // ネオン八角形パターン
    _createNeonOctagon() {
        const graphics = this.add.graphics().setDepth(3);
        const centerX = 400;
        const centerY = 450;
        const radius = 250;
        
        // 複数層のネオンリング
        for (let layer = 0; layer < 3; layer++) {
            const r = radius - layer * 30;
            const alpha = 1 - layer * 0.3;
            
            graphics.lineStyle(4 - layer, 0xFFD700, alpha);
            graphics.beginPath();
            for (let i = 0; i <= 8; i++) {
                const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                const x = centerX + Math.cos(angle) * r;
                const y = centerY + Math.sin(angle) * r;
                if (i === 0) graphics.moveTo(x, y);
                else graphics.lineTo(x, y);
            }
            graphics.strokePath();
        }
        
        // アニメーション（回転グロー）
        this.tweens.add({
            targets: graphics,
            rotation: Math.PI * 2,
            duration: 20000,
            repeat: -1,
            ease: 'Linear'
        });
    }
    
    // 回転する幾何学フレーム
    _createGeometricFrames() {
        const frames = [];
        const colors = [0xFFD700, 0xFFA500, 0xFFFFFF];
        
        for (let i = 0; i < 3; i++) {
            const size = 600 - i * 80;
            const frame = this.add.graphics().setDepth(2);
            
            frame.lineStyle(2, colors[i], 0.6);
            frame.strokeRect(-size/2, -size/2, size, size);
            
            frame.x = 960;
            frame.y = 540;
            
            this.tweens.add({
                targets: frame,
                rotation: i % 2 === 0 ? Math.PI * 2 : -Math.PI * 2,
                duration: 15000 + i * 5000,
                repeat: -1,
                ease: 'Linear'
            });
            
            frames.push(frame);
        }
    }
    
    // 流れるライトパーティクル
    _createLightStreams() {
        // 横方向のライトストリーム
        for (let i = 0; i < 5; i++) {
            const y = 200 + i * 180;
            const stream = this.add.rectangle(-100, y, 300, 3, 0xFFD700, 0.8).setDepth(4);
            
            // グラデーション効果のための追加レイヤー
            const glow = this.add.rectangle(-100, y, 400, 8, 0xFFD700, 0.3).setDepth(3);
            
            this.tweens.add({
                targets: [stream, glow],
                x: 2020,
                duration: 2000 + i * 300,
                repeat: -1,
                delay: i * 400,
                ease: 'Sine.easeInOut'
            });
        }
        
        // 斜めのライトビーム
        for (let i = 0; i < 4; i++) {
            const beam = this.add.rectangle(
                -200,
                Phaser.Math.Between(0, 1080),
                400,
                2,
                0xFFFFFF,
                0.5
            ).setRotation(-Math.PI / 6).setDepth(4);
            
            this.tweens.add({
                targets: beam,
                x: 2200,
                duration: 1500,
                repeat: -1,
                delay: i * 600
            });
        }
    }
    
    // パルシングオーラ
    _createPulsingAura() {
        const aura = this.add.circle(400, 450, 180, 0xFFD700, 0).setStrokeStyle(6, 0xFFD700, 0.8).setDepth(2);
        
        this.tweens.add({
            targets: aura,
            scale: { from: 0.8, to: 1.3 },
            alpha: { from: 0.8, to: 0 },
            duration: 1500,
            repeat: -1,
            ease: 'Cubic.easeOut'
        });
        
        // 内側のオーラ
        const innerAura = this.add.circle(400, 450, 120, 0xFFFFFF, 0).setStrokeStyle(3, 0xFFFFFF, 0.6).setDepth(2);
        
        this.tweens.add({
            targets: innerAura,
            scale: { from: 0.9, to: 1.2 },
            alpha: { from: 0.6, to: 0 },
            duration: 1200,
            repeat: -1,
            delay: 300,
            ease: 'Cubic.easeOut'
        });
    }
    
    // グリッチエフェクト
    _glitchEffect() {
        // 画面を一瞬ずらす
        const originalX = this.cameras.main.scrollX;
        
        this.tweens.add({
            targets: this.cameras.main,
            scrollX: originalX + Phaser.Math.Between(-20, 20),
            duration: 50,
            yoyo: true,
            repeat: 2,
            onComplete: () => {
                this.cameras.main.scrollX = originalX;
            }
        });
        
        // グリッチライン
        for (let i = 0; i < 5; i++) {
            const line = this.add.rectangle(
                960,
                Phaser.Math.Between(0, 1080),
                1920,
                Phaser.Math.Between(2, 20),
                Phaser.Math.RND.pick([0xFFD700, 0xFFFFFF, 0x00FFFF]),
                0.8
            ).setDepth(1000);
            
            this.time.delayedCall(100, () => line.destroy());
        }
    }
    
    // ゴールドダスト
    _spawnGoldDust() {
        const x = Phaser.Math.Between(0, 1920);
        const y = Phaser.Math.Between(0, 1080);
        
        const dust = this.add.circle(x, y, Phaser.Math.Between(1, 4), 0xFFD700, 0).setDepth(5);
        
        this.tweens.add({
            targets: dust,
            alpha: { from: 0, to: 1 },
            scale: { from: 0, to: 1.5 },
            duration: 500,
            yoyo: true,
            onComplete: () => dust.destroy()
        });
    }
    
    // ====================================================
    // Aランク: 華やかな演出
    // ====================================================
    _createARankEffects() {
        // 💗 ハートが飛ぶ
        for (let i = 0; i < 15; i++) {
            const heart = this.add.text(
                Phaser.Math.Between(0, 1920),
                1100,
                '💗',
                { fontSize: `${Phaser.Math.Between(30, 60)}px` }
            ).setOrigin(0.5).setDepth(3);
            
            this.tweens.add({
                targets: heart,
                y: -100,
                x: heart.x + Phaser.Math.Between(-100, 100),
                rotation: Phaser.Math.Between(-1, 1),
                duration: Phaser.Math.Between(3000, 5000),
                delay: i * 300,
                repeat: -1
            });
        }
        
        // ✨ キラキラ
        for (let i = 0; i < 30; i++) {
            const sparkle = this.add.text(
                Phaser.Math.Between(0, 1920),
                Phaser.Math.Between(0, 1080),
                '✨',
                { fontSize: '30px' }
            ).setOrigin(0.5).setAlpha(0).setDepth(2);
            
            this.tweens.add({
                targets: sparkle,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.5, to: 1.5 },
                duration: 1000,
                yoyo: true,
                repeat: -1,
                delay: i * 200
            });
        }
    }
    
    // ====================================================
    // Bランク: 爽やかな演出
    // ====================================================
    _createBRankEffects() {
        // 🌊 波紋エフェクト
        this.time.addEvent({
            delay: 800,
            callback: () => {
                const ring = this.add.circle(960, 540, 10, 0x2196F3, 0)
                    .setStrokeStyle(3, 0x2196F3)
                    .setDepth(2);
                
                this.tweens.add({
                    targets: ring,
                    scale: 50,
                    alpha: { from: 0.8, to: 0 },
                    duration: 2000,
                    onComplete: () => ring.destroy()
                });
            },
            loop: true
        });
        
        // 💧 泡
        for (let i = 0; i < 20; i++) {
            const bubble = this.add.circle(
                Phaser.Math.Between(0, 1920),
                1100,
                Phaser.Math.Between(10, 30),
                0xFFFFFF,
                0.5
            ).setStrokeStyle(2, 0x87CEEB).setDepth(2);
            
            this.tweens.add({
                targets: bubble,
                y: -50,
                x: bubble.x + Phaser.Math.Between(-50, 50),
                duration: Phaser.Math.Between(4000, 7000),
                delay: i * 400,
                repeat: -1
            });
        }
    }
    
    // ====================================================
    // Cランク: 控えめな演出
    // ====================================================
    _createCRankEffects() {
        // 🍀 クローバーが舞う
        for (let i = 0; i < 10; i++) {
            const clover = this.add.text(
                Phaser.Math.Between(0, 1920),
                -50,
                '🍀',
                { fontSize: `${Phaser.Math.Between(20, 40)}px` }
            ).setOrigin(0.5).setDepth(2);
            
            this.tweens.add({
                targets: clover,
                y: 1100,
                x: clover.x + Phaser.Math.Between(-200, 200),
                rotation: Math.PI * 4,
                duration: Phaser.Math.Between(5000, 8000),
                delay: i * 500,
                repeat: -1
            });
        }
    }
    
    // ====================================================
    // Dランク: 深夜の病院ロビー演出（TitleScene風プレミアムダーク）
    // 「深夜の病院ロビーで、静かに運命を待っている」
    // ====================================================
    _createDRankEffects() {
        // 🎵 タイトルと同じBGMを再生（哀愁・切なさ）
        if (this.cache.audio.exists('bgm_hinokageri')) {
            this.dRankBgm = this.sound.add('bgm_hinokageri', { 
                loop: true, 
                volume: 0.3 
            });
            this.dRankBgm.play();
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 装飾的なネオンライン（上部・下部）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const topLine = this.add.graphics().setDepth(5);
        topLine.fillGradientStyle(0x00d4aa, 0x00b4d8, 0x00d4aa, 0x00b4d8, 0.3);
        topLine.fillRect(0, 0, 1920, 3);
        
        const bottomLine = this.add.graphics().setDepth(5);
        bottomLine.fillGradientStyle(0x00d4aa00, 0x00d4aa, 0x00d4aa, 0x00d4aa00, 0.2);
        bottomLine.fillRect(0, 1077, 1920, 3);
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 浮遊する光の粒子（神秘的・幻想的）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        for (let i = 0; i < 25; i++) {
            const x = Phaser.Math.Between(0, 1920);
            const y = Phaser.Math.Between(0, 1080);
            const size = Phaser.Math.Between(2, 5);
            const alpha = Phaser.Math.FloatBetween(0.1, 0.3);
            const particle = this.add.circle(x, y, size, 0x00d4aa, alpha).setDepth(3);
            
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
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 煌めくスター（星空のような奥行き）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        for (let i = 0; i < 40; i++) {
            const x = Phaser.Math.Between(0, 1920);
            const y = Phaser.Math.Between(0, 1080);
            const size = Phaser.Math.Between(1, 3);
            const star = this.add.circle(x, y, size, 0xffffff, 0.05).setDepth(2);
            
            // ランダムな点滅
            this.tweens.add({
                targets: star,
                alpha: { from: 0.05, to: Phaser.Math.FloatBetween(0.15, 0.4) },
                duration: Phaser.Math.Between(1000, 3000),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 2000),
                ease: 'Sine.InOut'
            });
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // ゆっくり流れる光のストリーム（時の流れ・静けさ）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        for (let i = 0; i < 5; i++) {
            const streamY = Phaser.Math.Between(200, 900);
            const stream = this.add.graphics().setDepth(2);
            stream.fillStyle(0x00d4aa, 0.04);
            stream.fillRect(-200, streamY, 250, 2);
            
            this.tweens.add({
                targets: stream,
                x: { from: -200, to: 2200 },
                duration: Phaser.Math.Between(15000, 25000),
                repeat: -1,
                delay: Phaser.Math.Between(0, 10000)
            });
        }
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // サイバーパンク風のスキャンライン
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const scanLine = this.add.rectangle(960, -5, 1920, 3, 0x00d4aa, 0.3).setDepth(10);
        
        this.tweens.add({
            targets: scanLine,
            y: { from: -5, to: 1085 },
            duration: 4000,
            repeat: -1,
            ease: 'Linear'
        });
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 中央の脈動するリング（不穏な緊張感）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const pulseRing = this.add.circle(400, 450, 200, 0x00d4aa, 0)
            .setStrokeStyle(2, 0x00d4aa, 0.4)
            .setDepth(2);
        
        this.tweens.add({
            targets: pulseRing,
            scale: { from: 0.8, to: 1.2 },
            alpha: { from: 0.4, to: 0 },
            duration: 2500,
            repeat: -1,
            ease: 'Cubic.easeOut'
        });
        
        // 内側のリング
        const innerRing = this.add.circle(400, 450, 150, 0x00d4aa, 0)
            .setStrokeStyle(1, 0x00d4aa, 0.3)
            .setDepth(2);
        
        this.tweens.add({
            targets: innerRing,
            scale: { from: 0.9, to: 1.1 },
            alpha: { from: 0.3, to: 0 },
            duration: 2000,
            repeat: -1,
            delay: 500,
            ease: 'Cubic.easeOut'
        });
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 「試用期間終了」のテキストエフェクト
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const endText = this.add.text(960, 200, '- 試用期間終了 -', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa',
            letterSpacing: 6
        }).setOrigin(0.5).setAlpha(0).setDepth(100);
        
        // フェードイン
        this.tweens.add({
            targets: endText,
            alpha: { from: 0, to: 0.8 },
            duration: 2000,
            delay: 1000
        });
        
        // ゆっくり点滅
        this.time.delayedCall(3000, () => {
            this.tweens.add({
                targets: endText,
                alpha: { from: 0.8, to: 0.4 },
                duration: 1500,
                yoyo: true,
                repeat: -1,
                ease: 'Sine.InOut'
            });
        });
        
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        // 薄い霧のオーバーレイ（サイバーパンク的冷たさ）
        // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
        const coldOverlay = this.add.rectangle(960, 540, 1920, 1080, 0x0a1628, 0.1).setDepth(1);
    }
    
    // ====================================================
    // Fランク: 絶望的な演出
    // ====================================================
    _createFRankEffects() {
        // 🔥 炎が上がる
        for (let i = 0; i < 30; i++) {
            const flame = this.add.text(
                Phaser.Math.Between(0, 1920),
                1100,
                Phaser.Math.RND.pick(['🔥', '💀', '👻']),
                { fontSize: `${Phaser.Math.Between(30, 60)}px` }
            ).setOrigin(0.5).setDepth(3);
            
            this.tweens.add({
                targets: flame,
                y: Phaser.Math.Between(600, 900),
                alpha: { from: 1, to: 0 },
                duration: Phaser.Math.Between(2000, 4000),
                delay: i * 200,
                repeat: -1
            });
        }
        
        // 画面を赤く点滅
        const redOverlay = this.add.rectangle(960, 540, 1920, 1080, 0xFF0000, 0).setDepth(1);
        this.tweens.add({
            targets: redOverlay,
            alpha: { from: 0, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // 画面が小刻みに揺れる
        this.time.addEvent({
            delay: 2000,
            callback: () => this.cameras.main.shake(200, 0.02),
            loop: true
        });
        
        // 警告テキスト
        const warning = this.add.text(960, 200, '⚠️ 警告 ⚠️', {
            fontSize: '60px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FF0000',
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setDepth(100);
        
        this.tweens.add({
            targets: warning,
            scale: { from: 1, to: 1.2 },
            duration: 300,
            yoyo: true,
            repeat: -1
        });
    }
    
    // ====================================================
    // 花火エフェクト（Sランク用）
    // ====================================================
    _createFireworks() {
        this.time.addEvent({
            delay: 1000,
            callback: () => {
                const x = Phaser.Math.Between(200, 1720);
                const y = Phaser.Math.Between(200, 600);
                const colors = [0xFF0000, 0xFFFF00, 0x00FF00, 0x00FFFF, 0xFF00FF, 0xFFD700];
                const color = Phaser.Math.RND.pick(colors);
                
                // 爆発パーティクル
                for (let i = 0; i < 20; i++) {
                    const angle = (i / 20) * Math.PI * 2;
                    const particle = this.add.circle(x, y, 8, color).setDepth(10);
                    
                    this.tweens.add({
                        targets: particle,
                        x: x + Math.cos(angle) * 150,
                        y: y + Math.sin(angle) * 150,
                        alpha: 0,
                        scale: 0,
                        duration: 1000,
                        onComplete: () => particle.destroy()
                    });
                }
            },
            loop: true
        });
    }
    
    // ====================================================
    // 紙吹雪を生成（Sランク用）
    // ====================================================
    _spawnConfetti() {
        const colors = [0xFF5252, 0xFFD740, 0x69F0AE, 0x40C4FF, 0xE040FB, 0xFFFFFF];
        const x = Phaser.Math.Between(0, 1920);
        const confetti = this.add.rectangle(
            x,
            -20,
            Phaser.Math.Between(5, 15),
            Phaser.Math.Between(10, 20),
            Phaser.Math.RND.pick(colors)
        ).setRotation(Math.random() * Math.PI).setDepth(5);
        
        this.tweens.add({
            targets: confetti,
            y: 1100,
            x: x + Phaser.Math.Between(-100, 100),
            rotation: Math.PI * Phaser.Math.Between(2, 5),
            duration: Phaser.Math.Between(3000, 5000),
            onComplete: () => confetti.destroy()
        });
    }
    
    // ====================================================
    // ランク文字アニメーション
    // ====================================================
    _animateRankText(rankText, rank) {
        switch (rank) {
            case 'S':
                // 虹色に変化 + 拡大縮小 + 回転
                this.tweens.add({
                    targets: rankText,
                    scale: { from: 1, to: 1.3 },
                    duration: 500,
                    yoyo: true,
                    repeat: -1
                });
                
                // 虹色グラデーション
                let hue = 0;
                this.time.addEvent({
                    delay: 50,
                    callback: () => {
                        hue = (hue + 5) % 360;
                        const color = Phaser.Display.Color.HSLToColor(hue / 360, 1, 0.5);
                        rankText.setColor(Phaser.Display.Color.RGBToString(color.r, color.g, color.b));
                    },
                    loop: true
                });
                break;
                
            case 'A':
                // 脈動
                this.tweens.add({
                    targets: rankText,
                    scale: { from: 1, to: 1.15 },
                    duration: 600,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'B':
            case 'C':
                // 軽い揺れ
                this.tweens.add({
                    targets: rankText,
                    angle: { from: -3, to: 3 },
                    duration: 1000,
                    yoyo: true,
                    repeat: -1
                });
                break;
                
            case 'D':
                // 震え
                this.tweens.add({
                    targets: rankText,
                    x: rankText.x + 2,
                    duration: 50,
                    yoyo: true,
                    repeat: -1
                });
                break;
                
            case 'F':
                // 激しく点滅
                this.tweens.add({
                    targets: rankText,
                    alpha: { from: 1, to: 0.3 },
                    scale: { from: 1, to: 1.1 },
                    duration: 200,
                    yoyo: true,
                    repeat: -1
                });
                break;
        }
    }
    
    // ====================================================
    // スコアログ表示パネル作成
    // ====================================================
    _createScoreLogPanel() {
        const scoreLog = this.registry.get('scoreLog') || [];
        
        const panelX = 1200;
        const panelY = 450;
        const panelW = 550;
        const panelH = 600;
        
        // パネル背景
        this.add.rectangle(panelX, panelY, panelW, panelH, 0xFFFFFF, 0.9)
            .setStrokeStyle(3, 0x333333).setDepth(100);
        
        // ヘッダー
        this.add.rectangle(panelX, panelY - panelH/2 + 30, panelW, 60, 0x333333).setDepth(100);
        this.add.text(panelX, panelY - panelH/2 + 30, '📋 スコアログ', {
            fontSize: '24px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(100);
        
        // ログ表示エリア
        const startY = panelY - panelH/2 + 80;
        const maxItems = 15;
        const logsToShow = scoreLog.slice(-maxItems);
        
        if (logsToShow.length === 0) {
            this.add.text(panelX, startY + 50, '(ログなし)', {
                fontSize: '20px', fontFamily: '"Noto Sans JP", sans-serif', color: '#999999'
            }).setOrigin(0.5).setDepth(100);
        } else {
            // +0のエントリをフィルタリングし、実際のポイント値で表示
            const filteredLogs = logsToShow.filter(log => log.points !== 0);
            
            filteredLogs.forEach((log, index) => {
                const y = startY + 20 + index * 32;
                // 実際のポイント値から符号と色を決定（log.positiveフラグではなく）
                const isPositive = log.points > 0;
                const sign = isPositive ? '+' : '';  // マイナスは数値に含まれる
                const color = isPositive ? '#00AA00' : '#FF0000';
                
                this.add.text(panelX - panelW/2 + 20, y, `・${log.reason}`, {
                    fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333'
                }).setDepth(100);
                
                this.add.text(panelX + panelW/2 - 20, y, `${sign}${log.points}`, {
                    fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: color
                }).setOrigin(1, 0).setDepth(100);
            });
            
            // 合計表示
            const totalY = panelY + panelH/2 - 40;
            this.add.rectangle(panelX, totalY, panelW - 20, 40, 0xE0E0E0).setDepth(100);
            const totalPoints = scoreLog.reduce((sum, log) => sum + log.points, 0);
            const totalColor = totalPoints >= 0 ? '#00AA00' : '#FF0000';
            this.add.text(panelX, totalY, `合計: ${totalPoints >= 0 ? '+' : ''}${totalPoints} 点`, {
                fontSize: '20px', fontFamily: '"Noto Sans JP", sans-serif', color: totalColor
            }).setOrigin(0.5).setDepth(100);
        }
    }

    _calculateRank(score) {
        // ランク基準
        if (score >= 800) return { rank: 'S', color: '#FFD700', comment: '完璧な仕事ぶり！！これからも一緒に頑張ろう！' };
        if (score >= 600) return { rank: 'A', color: '#E91E63', comment: '素晴らしい！ベテランの風格' };
        if (score >= 400) return { rank: 'B', color: '#2196F3', comment: 'まずまずかな...' };
        if (score >= 200) return { rank: 'C', color: '#8BC34A', comment: 'ちょっと仕事を覚えてほしいかな' };
        if (score >= -200) return { rank: 'D', color: '#00d4aa', comment: '...満足に指導できなくてごめんなさい！！\n試用期間終了とさせていただきます' };
        return { rank: 'E', color: '#FF0000', comment: '...もう二度と来ないでください！！\n警備員を呼びます！！' };
    }
    
    _createButtons() {
        // タイトルへ戻るボタン
        const btn = this.add.text(960, 950, 'タイトルへ戻る', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            backgroundColor: '#333333',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setDepth(200);
        
        btn.on('pointerdown', () => {
            location.reload();
        });
        
        // ホバー
        btn.on('pointerover', () => btn.setScale(1.05));
        btn.on('pointerout', () => btn.setScale(1.0));
    }
    
    // ====================================================
    // 🚀 パフォーマンス最適化: パーティクルプールシステム
    // ====================================================
    
    /**
     * パーティクルプールを初期化
     */
    _initParticlePool() {
        this._particlePool = [];
        this._activeParticles = [];
        
        // プールを事前に確保
        if (PERFORMANCE_CONFIG.enableParticlePooling) {
            const poolSize = PERFORMANCE_CONFIG.particlePoolSize;
            for (let i = 0; i < poolSize; i++) {
                const particle = this.add.circle(0, 0, 5, 0xFFFFFF, 0)
                    .setActive(false)
                    .setVisible(false)
                    .setDepth(1);
                this._particlePool.push(particle);
            }
            console.log(`🚀 パーティクルプール初期化完了: ${poolSize}個`);
        }
    }
    
    /**
     * パーティクルをプールから取得または新規作成
     */
    _getParticleFromPool(x, y, size, color, alpha) {
        let particle;
        
        if (PERFORMANCE_CONFIG.enableParticlePooling && this._particlePool.length > 0) {
            // プールから取得
            particle = this._particlePool.pop();
            particle.setPosition(x, y);
            particle.setRadius(size);
            particle.setFillStyle(color, alpha);
            particle.setActive(true);
            particle.setVisible(true);
        } else {
            // 新規作成
            particle = this.add.circle(x, y, size, color, alpha).setDepth(1);
        }
        
        this._activeParticles.push(particle);
        return particle;
    }
    
    /**
     * パーティクルをプールに返却
     */
    _returnParticleToPool(particle) {
        if (!particle || !PERFORMANCE_CONFIG.enableParticlePooling) return;
        
        const index = this._activeParticles.indexOf(particle);
        if (index > -1) {
            this._activeParticles.splice(index, 1);
        }
        
        particle.setActive(false);
        particle.setVisible(false);
        this._particlePool.push(particle);
    }
    
    /**
     * FPS監視を設定
     */
    _setupFPSMonitor() {
        if (!PERFORMANCE_CONFIG.autoAdjustOnLowFPS) return;
        
        this._fpsCheckInterval = this.time.addEvent({
            delay: 2000,  // 2秒ごとにチェック
            callback: () => this._checkAndAdjustQuality(),
            loop: true
        });
    }
    
    /**
     * FPSをチェックして品質を動的に調整
     */
    _checkAndAdjustQuality() {
        const currentFPS = this.game.loop.actualFps;
        
        if (currentFPS < PERFORMANCE_CONFIG.lowFPSThreshold) {
            // FPSが低い場合、品質を下げる
            if (this._currentQuality === 'high') {
                this._currentQuality = 'medium';
                console.log(`⚠️ FPS低下検出 (${currentFPS.toFixed(1)}fps) → 品質をmediumに変更`);
            } else if (this._currentQuality === 'medium') {
                this._currentQuality = 'low';
                console.log(`⚠️ FPS低下検出 (${currentFPS.toFixed(1)}fps) → 品質をlowに変更`);
            }
            
            // 一部のパーティクルを無効化して負荷軽減
            this._reduceActiveParticles();
        }
    }
    
    /**
     * アクティブなパーティクルを削減
     */
    _reduceActiveParticles() {
        const targetReduction = Math.floor(this._activeParticles.length * 0.3);  // 30%削減
        
        for (let i = 0; i < targetReduction; i++) {
            if (this._activeParticles.length > 10) {  // 最低10個は残す
                const particle = this._activeParticles[this._activeParticles.length - 1];
                this._returnParticleToPool(particle);
            }
        }
        
        console.log(`🔧 パーティクル削減: ${targetReduction}個を無効化`);
    }
    
    /**
     * 品質設定に基づいて最適化されたパーティクル数を取得
     */
    _getOptimizedParticleCount(baseCount) {
        // 上限値を適用
        let count = Math.min(baseCount, PERFORMANCE_CONFIG.maxParticles);
        
        // 品質設定に基づいてさらに調整
        switch (this._currentQuality) {
            case 'low':
                count = Math.floor(count * 0.5);
                break;
            case 'medium':
                count = Math.floor(count * 0.75);
                break;
            case 'high':
            default:
                // フル演出（変更なし）
                break;
        }
        
        return Math.max(count, 5);  // 最低5個は生成
    }
}
