// TutorialScene.js - ノベルゲーム形式のチュートリアル
import { addTransitionMethods } from './TransitionManager.js';
import { VolumeSettings } from './components/VolumeSettings.js';

export class TutorialScene extends Phaser.Scene {
    constructor() {
        super('TutorialScene');
    }

    create() {
        addTransitionMethods(this);
        
        // =========================================================
        // 🔄 状態リセット（再スタート対応）
        // =========================================================
        // 前回のタイマーをクリア
        if (this.textTimer) {
            this.textTimer.remove();
            this.textTimer = null;
        }
        if (this.autoTimer) {
            this.autoTimer.remove();
            this.autoTimer = null;
        }
        
        // 前回のボイスを停止
        if (this.currentVoice) {
            this.currentVoice.stop();
            this.currentVoice.destroy();
            this.currentVoice = null;
        }
        
        // ノベルデータを取得
        this.novelData = this.cache.json.get('novelData') || [];
        this.currentIndex = 0;
        this.isAnimating = false;
        this.currentText = '';
        this.displayedText = '';
        this.textTimer = null;
        
        // 選択肢への反応を表示中かどうか
        this.showingResponse = false;
        this.selectedChoice = null;
        this.pendingChoices = null;
        
        // 現在再生中のボイス
        this.currentVoice = null;
        
        // ボイスファイルのマッピング（インデックス → オーディオキー）
        // novel_data.json のシーンインデックスと対応
        this.voiceMapping = {
            0: 'novel_vc_001',    // 「おはよー！ 君が…
            // 1: 主人公（ボイスなし）
            2: 'novel_vc_002',    // 「私はトリアージ」
            3: 'novel_vc_003',    // 「ここは今、人手が…
            4: 'novel_vc_004',    // 「特に泌尿器科は男… (選択肢あり)
            5: 'novel_vc_005',    // 「あと、一番助かる…
            6: 'novel_vc_006',    // 「今、うちは絶賛『…
            7: 'novel_vc_007',    // 「例えるなら、『最…
            // 8: 主人公（ボイスなし）
            9: 'novel_vc_008',    // 「そうなの！ 紙カ…
            10: 'novel_vc_009',   // 「でも、Ｔ橋家技大… (選択肢あり)
            11: 'novel_vc_010',   // 「冗談よ！ でも、…
            12: 'novel_vc_011',   // 「さあ、いい働きを期待しているわ」
        };
        
        // 選択肢への反応ボイス
        this.responseVoiceMapping = {
            // '4_A': - VCなし
            '4_B': 'novel_vc_012',   // 「そんなに固くなら…
            '10_A': 'novel_vc_013',  // 「やっぱり！ 専門…
            '10_B': 'novel_vc_015',  // 「あら、照れ屋ね？…
        };
        
        // =========================================================
        // ノベルゲーム機能用プロパティ（リセット）
        // =========================================================
        this.logData = [];              // バックログデータ
        this.isAutoMode = false;        // オートモード
        this.autoTimer = null;          // オート進行用タイマー
        this.isLogOpen = false;         // ログウィンドウ表示中
        this.isConfigOpen = false;      // 設定ウィンドウ表示中
        this.isSkipConfirmOpen = false; // スキップ確認表示中
        
        // =========================================================
        // BGM再生（Web Autoplay Policy 対策）
        // =========================================================
        this.sound.stopAll();
        if (this.cache.audio.exists('bgm_maou_game_town18')) {
            const playBgm = () => {
                if (this.bgm && this.bgm.isPlaying) return;
                this.bgm = this.sound.add('bgm_maou_game_town18', { 
                    loop: true, 
                    volume: 0.3 
                });
                this.bgm.play();
            };

            if (this.sound.locked) {
                this.sound.once('unlocked', playBgm);
            } else {
                playBgm();
            }
        }
        
        // =========================================================
        // 背景
        // =========================================================
        this._createBackground();
        
        // =========================================================
        // キャラクター表示エリア
        // =========================================================
        this._createCharacterArea();
        
        // =========================================================
        // テキストボックス
        // =========================================================
        this._createTextBox();
        
        // =========================================================
        // UI要素
        // =========================================================
        this._createUI();
        
        // =========================================================
        // 入力処理
        // =========================================================
        this._setupInput();
        
        // シーン終了時のクリーンアップを登録
        this.events.on('shutdown', this._cleanup, this);
        
        // 最初のテキストを表示
        this._showCurrentDialogue();
    }
    
    // ==========================================================
    // シーン終了時のクリーンアップ
    // ==========================================================
    _cleanup() {
        // タイマーを停止
        if (this.textTimer) {
            this.textTimer.remove();
            this.textTimer = null;
        }
        if (this.autoTimer) {
            this.autoTimer.remove();
            this.autoTimer = null;
        }
        
        // ボイスを停止
        this._stopVoice();
        
        // BGMを停止
        if (this.bgm) {
            this.bgm.stop();
            this.bgm = null;
        }
        
        // 入力イベントをクリア
        this.input.off('pointerdown');
        this.input.keyboard.off('keydown-SPACE');
        this.input.keyboard.off('keydown-ENTER');
        this.input.off('wheel');
        
        // イベントリスナーを解除
        this.events.off('shutdown', this._cleanup, this);
    }
    
    // ==========================================================
    // 背景
    // ==========================================================
    _createBackground() {
        // 受付シーンと同じ背景画像を使用
        if (this.textures.exists('receptionBg')) {
            const bg = this.add.image(960, 540, 'receptionBg');
            bg.displayWidth = 1920;
            bg.displayHeight = 1080;
        } else {
            // フォールバック：グラデーション背景
            const bgGraphics = this.add.graphics();
            bgGraphics.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x2d2d44, 0x16213e, 1);
            bgGraphics.fillRect(0, 0, 1920, 1080);
        }
    }
    
    // ==========================================================
    // キャラクターエリアの作成（ノベルゲームスタイル）
    // ==========================================================
    _createCharacterArea() {
        // キャラクター表示用コンテナ
        // 画面中央やや下に配置し、テキストボックスと重なる形で大きく表示
        this.characterContainer = this.add.container(960, 580);
        
        // キャラクタースプライト用コンテナ
        this.characterSprite = this.add.container(0, 0);
        this.characterContainer.add(this.characterSprite);
    }
    
    // ==========================================================
    // テキストボックスの作成（FGO風ノベルゲームスタイル）
    // ==========================================================
    _createTextBox() {
        const boxY = 955;  // 画面下端に近づける
        const boxWidth = 1920;
        const boxHeight = 250;  // 高さを拡張
        
        // テキストボックス背景
        this.textBoxContainer = this.add.container(960, boxY);
        
        // メイン背景（青系グラデーション＋半透明）
        const textBoxBg = this.add.graphics();
        // 上から下へのグラデーション（濃い青→やや明るい青）
        textBoxBg.fillGradientStyle(0x1a2a4a, 0x1a2a4a, 0x0a1628, 0x0a1628, 0.9);
        textBoxBg.fillRect(-boxWidth/2, -boxHeight/2, boxWidth, boxHeight);
        // 上部に選いライン
        textBoxBg.lineStyle(2, 0x3a5a8a, 0.8);
        textBoxBg.lineBetween(-boxWidth/2, -boxHeight/2, boxWidth/2, -boxHeight/2);
        this.textBoxContainer.add(textBoxBg);
        
        // =========================================================
        // 話者名表示（テキストボックス左上にプレート表示）
        // =========================================================
        this.speakerNameBg = this.add.graphics();
        this.speakerNameBg.fillStyle(0x2a4a7a, 0.9);
        this.speakerNameBg.fillRoundedRect(-boxWidth/2 + 40, -boxHeight/2 - 5, 180, 36, { tl: 8, tr: 8, bl: 0, br: 0 });
        // アクセントライン（左側）
        this.speakerNameBg.fillStyle(0x00d4aa, 1);
        this.speakerNameBg.fillRect(-boxWidth/2 + 40, -boxHeight/2 - 5, 4, 36);
        this.textBoxContainer.add(this.speakerNameBg);
        
        this.speakerName = this.add.text(-boxWidth/2 + 130, -boxHeight/2 + 13, '', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.textBoxContainer.add(this.speakerName);
        
        // メインテキスト
        this.dialogueText = this.add.text(-boxWidth/2 + 60, -boxHeight/2 + 45, '', {
            fontSize: '26px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff',
            wordWrap: { width: 1100 },  // ボタン領域を除いた幅に制限
            lineSpacing: 10
        });
        this.textBoxContainer.add(this.dialogueText);
        
        // =========================================================
        // 右側コントロールエリア（LOG / AUTO / 設定）
        // =========================================================
        const controlX = boxWidth/2 - 100;
        const btnSpacing = 55;
        
        // LOGボタン
        const logBtn = this._createTextBoxButton(controlX, -boxHeight/2 + 35, 'LOG', () => {
            this._showLogWindow();
        });
        this.textBoxContainer.add(logBtn.container);
        
        // AUTOボタン
        this.autoBtn = this._createTextBoxButton(controlX, -boxHeight/2 + 35 + btnSpacing, 'AUTO', () => {
            this._toggleAutoMode();
            this._updateAutoButtonDisplay();
        });
        this.textBoxContainer.add(this.autoBtn.container);
        
        // 設定ボタン
        const configBtn = this._createTextBoxButton(controlX, -boxHeight/2 + 35 + btnSpacing * 2, '設定', () => {
            this._showConfigWindow();
        });
        this.textBoxContainer.add(configBtn.container);
        
        // クリック促進アイコン（テキストエリア右下）
        this.clickIndicator = this.add.text(500, boxHeight/2 - 30, '▼', {
            fontSize: '20px',
            color: '#5a8aba'
        }).setOrigin(0.5);
        this.textBoxContainer.add(this.clickIndicator);
        
        // 点滅アニメーション
        this.tweens.add({
            targets: this.clickIndicator,
            alpha: { from: 1, to: 0.3 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // 初期状態では非表示
        this.clickIndicator.setVisible(false);
    }
    
    // ==========================================================
    // テキストボックス内ボタン生成
    // ==========================================================
    _createTextBoxButton(x, y, text, onClick) {
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x2a4a6a, 0.8);
        bg.fillRoundedRect(-45, -18, 90, 36, 6);
        container.add(bg);
        
        const label = this.add.text(0, 0, text, {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#aaccee'
        }).setOrigin(0.5);
        container.add(label);
        
        const hit = this.add.rectangle(0, 0, 90, 36)
            .setInteractive({ useHandCursor: true });
        container.add(hit);
        
        hit.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(0x3a6a8a, 0.9);
            bg.fillRoundedRect(-45, -18, 90, 36, 6);
            label.setColor('#ffffff');
        });
        hit.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(0x2a4a6a, 0.8);
            bg.fillRoundedRect(-45, -18, 90, 36, 6);
            label.setColor('#aaccee');
        });
        hit.on('pointerdown', onClick);
        
        return { container, label, bg };
    }
    
    // ==========================================================
    // AUTOボタン表示更新
    // ==========================================================
    _updateAutoButtonDisplay() {
        if (!this.autoBtn) return;
        
        const { label, bg } = this.autoBtn;
        if (this.isAutoMode) {
            label.setText('AUTO▶');
            label.setColor('#00ff88');
            bg.clear();
            bg.fillStyle(0x1a5a4a, 0.9);
            bg.fillRoundedRect(-45, -18, 90, 36, 6);
        } else {
            label.setText('AUTO');
            label.setColor('#aaccee');
            bg.clear();
            bg.fillStyle(0x2a4a6a, 0.8);
            bg.fillRoundedRect(-45, -18, 90, 36, 6);
        }
    }
    
    // ==========================================================
    // UI要素の作成
    // ==========================================================
    _createUI() {
        // SKIPボタン（右上、FGO風）
        const skipBtn = this.add.container(1820, 40);
        
        const skipBg = this.add.graphics();
        skipBg.fillStyle(0x2a3a4a, 0.8);
        skipBg.fillRoundedRect(-50, -18, 100, 36, 5);
        skipBg.lineStyle(1, 0x5a7a9a, 0.8);
        skipBg.strokeRoundedRect(-50, -18, 100, 36, 5);
        skipBtn.add(skipBg);
        
        const skipText = this.add.text(0, 0, 'SKIP▶▶', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        skipBtn.add(skipText);
        
        const skipHit = this.add.rectangle(0, 0, 100, 36)
            .setInteractive({ useHandCursor: true });
        skipBtn.add(skipHit);
        
        skipHit.on('pointerover', () => {
            skipBg.clear();
            skipBg.fillStyle(0x3a5a7a, 0.9);
            skipBg.fillRoundedRect(-50, -18, 100, 36, 5);
            skipBg.lineStyle(1, 0x7a9aba, 0.9);
            skipBg.strokeRoundedRect(-50, -18, 100, 36, 5);
        });
        skipHit.on('pointerout', () => {
            skipBg.clear();
            skipBg.fillStyle(0x2a3a4a, 0.8);
            skipBg.fillRoundedRect(-50, -18, 100, 36, 5);
            skipBg.lineStyle(1, 0x5a7a9a, 0.8);
            skipBg.strokeRoundedRect(-50, -18, 100, 36, 5);
        });
        skipHit.on('pointerdown', () => {
            this._showSkipConfirm();
        });
        
        // 進行状況インジケーター（控えめに）
        this.progressText = this.add.text(1820, 1050, '', {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#5a7a9a'
        }).setOrigin(0.5);
        this._updateProgress();
        
        // 選択肢コンテナ（初期は非表示）
        this.choicesContainer = this.add.container(960, 500).setVisible(false);
    }
    
    // ==========================================================
    // メニューアイコン生成ヘルパー
    // ==========================================================
    _createMenuIcon(x, y, labelText, onClick) {
        const iconContainer = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0x1a2a3a, 0.6);
        bg.fillRoundedRect(-25, -20, 50, 40, 5);
        iconContainer.add(bg);
        
        const label = this.add.text(0, 0, labelText, {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#7a9aba'
        }).setOrigin(0.5);
        iconContainer.add(label);
        
        const hit = this.add.rectangle(0, 0, 50, 40)
            .setInteractive({ useHandCursor: true });
        iconContainer.add(hit);
        
        hit.on('pointerover', () => {
            label.setColor('#ffffff');
            bg.clear();
            bg.fillStyle(0x2a4a6a, 0.8);
            bg.fillRoundedRect(-25, -20, 50, 40, 5);
        });
        hit.on('pointerout', () => {
            // AUTOボタンはモード中は色を維持
            if (labelText === 'AUTO' && this.isAutoMode) {
                label.setColor('#00ff88');
            } else {
                label.setColor('#7a9aba');
            }
            bg.clear();
            bg.fillStyle(0x1a2a3a, 0.6);
            bg.fillRoundedRect(-25, -20, 50, 40, 5);
        });
        hit.on('pointerdown', onClick);
        
        return { container: iconContainer, label, bg };
    }
    
    // ==========================================================
    // 入力処理のセットアップ
    // ==========================================================
    _setupInput() {
        // クリックで次へ
        this.input.on('pointerdown', (pointer) => {
            // 選択肢表示中は無効
            if (this.choicesContainer.visible) return;
            
            this._handleAdvance();
        });
        
        // キーボード入力
        this.input.keyboard.on('keydown-ENTER', () => {
            if (this.choicesContainer.visible) return;
            this._handleAdvance();
        });
        this.input.keyboard.on('keydown-SPACE', () => {
            if (this.choicesContainer.visible) return;
            this._handleAdvance();
        });
    }
    
    // ==========================================================
    // 進行処理
    // ==========================================================
    _handleAdvance() {
        // オートモード中のクリックはオート解除
        if (this.isAutoMode) {
            this._cancelAutoMode();
        }
        
        // テキストアニメーション中なら即座に全文表示
        if (this.isAnimating) {
            this._completeTextAnimation();
            return;
        }
        
        // 反応表示中なら次へ進む
        if (this.showingResponse) {
            this.showingResponse = false;
            this.currentIndex++;
            this._showCurrentDialogue();
            return;
        }
        
        // 次のダイアログへ
        this._advanceDialogue();
    }
    
    // ==========================================================
    // 次のダイアログへ進む
    // ==========================================================
    _advanceDialogue() {
        if (this.currentIndex >= this.novelData.length - 1) {
            // 最後まで到達
            this._endTutorial();
            return;
        }
        
        this.currentIndex++;
        this._showCurrentDialogue();
    }
    
    // ==========================================================
    // 現在のダイアログを表示
    // ==========================================================
    _showCurrentDialogue() {
        if (this.currentIndex >= this.novelData.length) {
            this._endTutorial();
            return;
        }
        
        const dialogue = this.novelData[this.currentIndex];
        
        // 話者名を更新
        this.speakerName.setText(dialogue['話者'] || '');
        
        // 話者によって名前の背景色を変更
        this.speakerNameBg.clear();
        const boxWidth = 1920;
        const boxHeight = 250;  // _createTextBox と同じ値に統一
        
        // ベース色
        let baseColor = 0x2a4a7a;
        let accentColor = 0x00d4aa;
        
        if (dialogue['話者'] === '主人公') {
            baseColor = 0x3a5a8a;
            accentColor = 0x74b9ff;
        } else if (dialogue['話者'] === 'トリアージさん') {
            baseColor = 0x2a5a6a;
            accentColor = 0x00d4aa;
        }
        
        // 背景
        this.speakerNameBg.fillStyle(baseColor, 0.9);
        this.speakerNameBg.fillRoundedRect(-boxWidth/2 + 40, -boxHeight/2 - 5, 180, 36, { tl: 8, tr: 8, bl: 0, br: 0 });
        // アクセントライン
        this.speakerNameBg.fillStyle(accentColor, 1);
        this.speakerNameBg.fillRect(-boxWidth/2 + 40, -boxHeight/2 - 5, 4, 36);
        
        // キャラクター表情の更新
        this._updateCharacterExpression(dialogue['話者'], dialogue['表情']);
        
        // ボイス再生（トリアージさんのセリフのみ）
        if (dialogue['話者'] === 'トリアージさん') {
            this._playVoice(this.currentIndex);
        }
        
        // テキストをアニメーション表示
        const text = dialogue['テキスト'] || '';
        this._animateText(text);
        
        // 選択肢があるかチェック
        if (dialogue['選択肢A'] && dialogue['選択肢B']) {
            // テキスト完了後に選択肢を表示
            this.pendingChoices = {
                choiceA: dialogue['選択肢A'],
                choiceB: dialogue['選択肢B'],
                responseA: dialogue['Aへの反応'],
                responseB: dialogue['Bへの反応']
            };
        } else {
            this.pendingChoices = null;
        }
        
        // バックログに追加
        this.logData.push({
            speaker: dialogue['話者'] || '',
            text: dialogue['テキスト'] || ''
        });
        
        // 進行状況更新
        this._updateProgress();
    }
    
    // ==========================================================
    // ボイス再生
    // ==========================================================
    _playVoice(index, responseChoice = null) {
        // 現在再生中のボイスを停止
        this._stopVoice();
        
        // ボイスキーを取得
        let voiceKey = null;
        
        if (responseChoice) {
            // 選択肢への反応ボイス
            voiceKey = this.responseVoiceMapping[`${index}_${responseChoice}`];
        } else {
            // 通常のダイアログボイス
            voiceKey = this.voiceMapping[index];
        }
        
        // ボイス音量を取得
        const voiceVolume = this.registry.get('voiceVolume') ?? 0.8;
        
        // ボイスを再生
        if (voiceKey && this.cache.audio.exists(voiceKey)) {
            this.currentVoice = this.sound.add(voiceKey, { volume: voiceVolume });
            this.currentVoice.play();
        }
    }
    
    // ==========================================================
    // ボイス停止
    // ==========================================================
    _stopVoice() {
        if (this.currentVoice) {
            this.currentVoice.stop();
            this.currentVoice.destroy();
            this.currentVoice = null;
        }
    }
    
    // ==========================================================
    // キャラクター表情の更新（ノベルゲームスタイル）
    // ==========================================================
    _updateCharacterExpression(speaker, expression) {
        // 話者判定
        const isProtagonist = speaker === '主人公';
        const isTriage = speaker === 'トリアージさん';
        
        // 主人公の場合：キャラクターはそのまま表示維持（表情変更なし）
        if (isProtagonist) {
            // 表情は前のまま維持、キャラクターは消さない
            return;
        }
        
        // トリアージさんの場合：立ち絵を更新
        if (isTriage) {
            // キャラクタースプライトをクリア
            this.characterSprite.removeAll(true);
            this.characterContainer.setVisible(true);
            
            // 表情マッピング
            const expressionMapping = {
                'happy': 'triage_happy',
                'laughing': 'triage_smile',
                'smile': 'triage_smile',
                'annoyed': 'triage_angry',
                'sweat': 'triage_sad',
                'wink': 'triage_wink',
                'nervous': 'triage_scared',
                'serious': 'triage_serious',
                'surprised': 'triage_surprised',
                'blush': 'triage_blush',
                'default': 'triage_normal'
            };
            
            const imageKey = expressionMapping[expression] || expressionMapping['default'];
            
            if (this.textures.exists(imageKey)) {
                const characterImage = this.add.image(0, 0, imageKey);
                
                // キャラクター表示: 適度なサイズで上半身がメイン
                const targetScale = 0.55;  // 適度なサイズに調整
                characterImage.setScale(targetScale);
                
                // 上半身が画面中央に来るよう調整
                characterImage.setOrigin(0.5, 0.4);
                characterImage.setY(50);
                
                this.characterSprite.add(characterImage);
            }
            
            // 中央に配置
            this.characterContainer.setX(960);
            
            // 登場アニメーション（初回のみ）
            if (this.characterSprite.alpha < 1) {
                this.characterSprite.setAlpha(0);
                this.tweens.add({
                    targets: this.characterSprite,
                    alpha: 1,
                    duration: 250,
                    ease: 'Power2'
                });
            }
            
            // ★感情に応じたアニメーション
            this._playExpressionAnimation(expression);
        }
        // その他の話者の場合：キャラクターはそのまま維持
    }
    
    // ==========================================================
    // 感情アニメーション
    // ==========================================================
    _playExpressionAnimation(expression) {
        // 既存のアニメーションを停止
        this.tweens.killTweensOf(this.characterSprite);
        
        // 位置をリセット
        this.characterSprite.setY(0);
        this.characterSprite.setAngle(0);
        
        switch (expression) {
            case 'happy':
            case 'laughing':
                // ジャンプアニメーション
                this.tweens.add({
                    targets: this.characterSprite,
                    y: -30,
                    duration: 200,
                    yoyo: true,
                    ease: 'Quad.easeOut'
                });
                break;
                
            case 'wink':
                // ウィンクで軽く傾く
                this.tweens.add({
                    targets: this.characterSprite,
                    angle: 5,
                    duration: 200,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'surprised':
                // 驚きで大きく跳ねる
                this.tweens.add({
                    targets: this.characterSprite,
                    y: -50,
                    duration: 150,
                    yoyo: true,
                    ease: 'Back.easeOut'
                });
                break;
                
            case 'nervous':
            case 'scared':
            case 'sweat':
                // 小刻みに震える
                this.tweens.add({
                    targets: this.characterSprite,
                    x: { from: -3, to: 3 },
                    duration: 50,
                    repeat: 5,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.characterSprite.setX(0);
                    }
                });
                break;
                
            case 'annoyed':
                // ぷるぷる怒り
                this.tweens.add({
                    targets: this.characterSprite,
                    angle: { from: -2, to: 2 },
                    duration: 80,
                    repeat: 3,
                    yoyo: true,
                    ease: 'Sine.easeInOut',
                    onComplete: () => {
                        this.characterSprite.setAngle(0);
                    }
                });
                break;
                
            case 'blush':
                // 照れて少し縮こまる
                this.tweens.add({
                    targets: this.characterSprite,
                    y: 10,
                    scaleX: 0.98,
                    scaleY: 0.98,
                    duration: 300,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                break;
                
            case 'serious':
                // 真剣な表情で少し前に出る
                this.tweens.add({
                    targets: this.characterSprite,
                    y: -10,
                    duration: 300,
                    ease: 'Power2'
                });
                break;
                
            default:
                // 通常表情：軽く揺れる
                this.tweens.add({
                    targets: this.characterSprite,
                    y: { from: 0, to: -5 },
                    duration: 400,
                    yoyo: true,
                    ease: 'Sine.easeInOut'
                });
                break;
        }
    }
    
    // ==========================================================
    // テキストアニメーション
    // ==========================================================
    _animateText(text) {
        // 手動で改行を挿入（1行あたり約42文字）
        const wrappedText = this._wrapText(text, 42);
        
        this.currentText = wrappedText;
        this.displayedText = '';
        this.isAnimating = true;
        this.clickIndicator.setVisible(false);
        
        // テキストオブジェクトをクリア
        if (this.dialogueText) {
            this.dialogueText.setText('');
        }
        
        let charIndex = 0;
        const speed = 30; // 1文字あたりのミリ秒
        
        // 既存のタイマーをクリア
        if (this.textTimer) {
            this.textTimer.remove();
        }
        
        this.textTimer = this.time.addEvent({
            delay: speed,
            repeat: wrappedText.length - 1,
            callback: () => {
                this.displayedText += wrappedText[charIndex];
                this.dialogueText.setText(this.displayedText);
                charIndex++;
                
                // SE再生（たまに）
                if (charIndex % 3 === 0 && this.cache.audio.exists('se_typing')) {
                    this.sound.play('se_typing', { volume: 0.1 });
                }
                
                // 完了時
                if (charIndex >= wrappedText.length) {
                    this._onTextAnimationComplete();
                }
            }
        });
    }
    
    // ==========================================================
    // 手動テキスト折り返し
    // ==========================================================
    _wrapText(text, maxChars) {
        if (text.length <= maxChars) {
            return text;
        }
        
        let result = '';
        let lineLength = 0;
        
        for (let i = 0; i < text.length; i++) {
            const char = text[i];
            result += char;
            lineLength++;
            
            // 改行文字ならカウントリセット
            if (char === '\n') {
                lineLength = 0;
                continue;
            }
            
            // 最大文字数に達したら改行を挿入
            if (lineLength >= maxChars) {
                // 句読点や閉じ括弧の直後なら改行
                if ('。、！？」』）】'.includes(char)) {
                    result += '\n';
                    lineLength = 0;
                } else if (i + 1 < text.length) {
                    // 次の文字が句読点でなければ改行
                    const nextChar = text[i + 1];
                    if (!'。、！？」』）】'.includes(nextChar)) {
                        result += '\n';
                        lineLength = 0;
                    }
                }
            }
        }
        
        return result;
    }
    
    // ==========================================================
    // テキストアニメーション完了
    // ==========================================================
    _completeTextAnimation() {
        if (this.textTimer) {
            this.textTimer.remove();
            this.textTimer = null;
        }
        
        this.displayedText = this.currentText;
        this.dialogueText.setText(this.displayedText);
        this._onTextAnimationComplete();
    }
    
    // ==========================================================
    // テキスト表示完了時の処理
    // ==========================================================
    _onTextAnimationComplete() {
        this.isAnimating = false;
        
        // 選択肢があれば表示
        if (this.pendingChoices) {
            this._showChoices(this.pendingChoices);
            this.clickIndicator.setVisible(false);
        } else {
            this.clickIndicator.setVisible(true);
            
            // オートモード中なら自動進行を予約
            if (this.isAutoMode) {
                this._scheduleAutoAdvance();
            }
        }
    }
    
    // ==========================================================
    // 選択肢の表示
    // ==========================================================
    _showChoices(choices) {
        this.choicesContainer.removeAll(true);
        this.choicesContainer.setVisible(true);
        
        // 選択肢A
        const choiceA = this._createChoiceButton(-300, 0, choices.choiceA, 0x6c5ce7, () => {
            this._selectChoice('A', choices.responseA);
        });
        this.choicesContainer.add(choiceA);
        
        // 選択肢B
        const choiceB = this._createChoiceButton(300, 0, choices.choiceB, 0x00b894, () => {
            this._selectChoice('B', choices.responseB);
        });
        this.choicesContainer.add(choiceB);
        
        // フェードイン
        this.choicesContainer.setAlpha(0);
        this.tweens.add({
            targets: this.choicesContainer,
            alpha: 1,
            duration: 300
        });
    }
    
    // ==========================================================
    // 選択肢ボタンの生成
    // ==========================================================
    _createChoiceButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(color, 0.9);
        bg.fillRoundedRect(-250, -35, 500, 70, 15);
        bg.lineStyle(3, 0xffffff, 0.5);
        bg.strokeRoundedRect(-250, -35, 500, 70, 15);
        btn.add(bg);
        
        const label = this.add.text(0, 0, text, {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff',
            wordWrap: { width: 460 },
            align: 'center'
        }).setOrigin(0.5);
        btn.add(label);
        
        const hitArea = this.add.rectangle(0, 0, 500, 70)
            .setInteractive({ useHandCursor: true });
        btn.add(hitArea);
        
        hitArea.on('pointerover', () => {
            btn.setScale(1.05);
            if (this.cache.audio.exists('se_scroll')) {
                this.sound.play('se_scroll', { volume: 0.2 });
            }
        });
        
        hitArea.on('pointerout', () => {
            btn.setScale(1.0);
        });
        
        hitArea.on('pointerdown', () => {
            if (this.cache.audio.exists('se_changesean')) {
                this.sound.play('se_changesean', { volume: 0.5 });
            }
            onClick();
        });
        
        return btn;
    }
    
    // ==========================================================
    // 選択肢を選んだ時の処理
    // ==========================================================
    _selectChoice(choice, response) {
        this.selectedChoice = choice;
        this.choicesContainer.setVisible(false);
        
        // 反応テキストを表示
        if (response) {
            this.showingResponse = true;
            
            // 選択肢への反応ボイスを再生
            this._playVoice(this.currentIndex, choice);
            
            this._animateText(response);
        } else {
            this._advanceDialogue();
        }
        
        this.pendingChoices = null;
    }
    
    // ==========================================================
    // 進行状況の更新
    // ==========================================================
    _updateProgress() {
        const current = this.currentIndex + 1;
        const total = this.novelData.length;
        this.progressText.setText(`${current} / ${total}`);
    }
    
    // ==========================================================
    // スキップして終了
    // ==========================================================
    _skipToEnd() {
        this._stopVoice();
        this._endTutorial();
    }
    
    // ==========================================================
    // タイトルに戻る
    // ==========================================================
    _returnToTitle() {
        this._stopVoice();
        // 🎵 BGM は TransitionScene.sound.stopAll() で停止されるので、直接遷移
        this.slideToScene('TitleScene', 'right');
    }
    
    // ==========================================================
    // チュートリアル終了
    // ==========================================================
    _endTutorial() {
        // 完了メッセージ
        const completeContainer = this.add.container(960, 540).setDepth(100);
        
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.7);
        completeContainer.add(overlay);
        
        const panel = this.add.graphics();
        panel.fillStyle(0x1a1a2e, 0.98);
        panel.fillRoundedRect(-400, -200, 800, 400, 20);
        panel.lineStyle(3, 0x00d4aa, 0.8);
        panel.strokeRoundedRect(-400, -200, 800, 400, 20);
        completeContainer.add(panel);
        
        const title = this.add.text(0, -120, '🎉 受付のバイトを始めよう！', {
            fontSize: '42px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa'
        }).setOrigin(0.5);
        completeContainer.add(title);
        
        const message = this.add.text(0, -20, '基本的な説明は以上です。\n実際にゲームをプレイして覚えていきましょう！', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff',
            align: 'center'
        }).setOrigin(0.5);
        completeContainer.add(message);
        
        // ゲーム開始ボタン
        const startBtn = this._createEndButton(0, 100, '▶ ゲームを始める', 0x00d4aa, () => {
            this._stopVoice();
            // 🆕 実践チュートリアルを開始するフラグをセット
            this.registry.set('startPracticeTutorial', true);
            // 🎵 BGM は TransitionScene.sound.stopAll() で停止されるので、直接遷移
            this.slideToScene('ReceptionScene', 'left');
        });
        completeContainer.add(startBtn);
        
        // タイトルに戻るボタン
        const backBtn = this._createEndButton(0, 170, 'タイトルに戻る', 0x5a5a7a, () => {
             this._returnToTitle(); // 共通メソッドを使用
        });
        completeContainer.add(backBtn);
        
        // フェードイン
        completeContainer.setAlpha(0);
        this.tweens.add({
            targets: completeContainer,
            alpha: 1,
            duration: 500
        });
    }
    
    // ==========================================================
    // 終了画面用ボタン
    // ==========================================================
    _createEndButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-150, -25, 300, 50, 25);
        btn.add(bg);
        
        const label = this.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(label);
        
        const hitArea = this.add.rectangle(0, 0, 300, 50)
            .setInteractive({ useHandCursor: true });
        btn.add(hitArea);
        
        hitArea.on('pointerover', () => {
            btn.setScale(1.05);
        });
        hitArea.on('pointerout', () => {
            btn.setScale(1.0);
        });
        hitArea.on('pointerdown', () => {
            if (this.cache.audio.exists('se_changesean')) {
                this.sound.play('se_changesean', { volume: 0.5 });
            }
            onClick();
        });
        
        return btn;
    }
    
    // ==========================================================
    // 🔲 SKIP確認ダイアログ
    // ==========================================================
    _showSkipConfirm() {
        if (this.isSkipConfirmOpen) return;
        this.isSkipConfirmOpen = true;
        
        this.skipConfirmContainer = this.add.container(960, 540).setDepth(200);
        
        // オーバーレイ
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.7)
            .setInteractive();  // 背面クリック防止
        this.skipConfirmContainer.add(overlay);
        
        // パネル
        const panel = this.add.graphics();
        panel.fillStyle(0x1a2a4a, 0.95);
        panel.fillRoundedRect(-200, -80, 400, 160, 15);
        panel.lineStyle(2, 0x3a5a8a, 0.8);
        panel.strokeRoundedRect(-200, -80, 400, 160, 15);
        this.skipConfirmContainer.add(panel);
        
        // テキスト
        const text = this.add.text(0, -35, 'スキップしますか？', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        this.skipConfirmContainer.add(text);
        
        // Yesボタン
        const yesBtn = this._createConfirmButton(-80, 30, 'はい', 0x2a5a8a, () => {
            this._closeSkipConfirm();
            this._skipToEnd();
        });
        this.skipConfirmContainer.add(yesBtn);
        
        // Noボタン
        const noBtn = this._createConfirmButton(80, 30, 'いいえ', 0x5a3a3a, () => {
            this._closeSkipConfirm();
        });
        this.skipConfirmContainer.add(noBtn);
    }
    
    _closeSkipConfirm() {
        if (this.skipConfirmContainer) {
            this.skipConfirmContainer.destroy();
            this.skipConfirmContainer = null;
        }
        this.isSkipConfirmOpen = false;
    }
    
    _createConfirmButton(x, y, text, color, onClick) {
        const btn = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-60, -20, 120, 40, 8);
        btn.add(bg);
        
        const label = this.add.text(0, 0, text, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        btn.add(label);
        
        const hit = this.add.rectangle(0, 0, 120, 40)
            .setInteractive({ useHandCursor: true });
        btn.add(hit);
        
        hit.on('pointerover', () => btn.setScale(1.05));
        hit.on('pointerout', () => btn.setScale(1.0));
        hit.on('pointerdown', onClick);
        
        return btn;
    }
    
    // ==========================================================
    // 📜 バックログ（LOG）ウィンドウ（スクロール対応）
    // ==========================================================
    _showLogWindow() {
        if (this.isLogOpen) {
            this._hideLogWindow();
            return;
        }
        this.isLogOpen = true;
        
        this.logWindowContainer = this.add.container(960, 540).setDepth(150);
        
        // オーバーレイ
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.85)
            .setInteractive();
        this.logWindowContainer.add(overlay);
        
        // パネル
        const panelWidth = 1400;
        const panelHeight = 800;
        const panel = this.add.graphics();
        panel.fillStyle(0x0a1628, 0.98);
        panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        panel.lineStyle(2, 0x3a5a8a, 0.8);
        panel.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        this.logWindowContainer.add(panel);
        
        // タイトル
        const title = this.add.text(0, -panelHeight/2 + 35, '📜 テキストログ', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa'
        }).setOrigin(0.5);
        this.logWindowContainer.add(title);
        
        // 閉じるボタン
        const closeBtn = this.add.text(panelWidth/2 - 40, -panelHeight/2 + 30, '✕', {
            fontSize: '32px',
            color: '#ff6666'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this._hideLogWindow());
        this.logWindowContainer.add(closeBtn);
        
        // =========================================================
        // スクロール可能なログエリア
        // =========================================================
        const logAreaX = -panelWidth/2 + 40;
        const logAreaY = -panelHeight/2 + 80;
        const logAreaWidth = panelWidth - 80;
        const logAreaHeight = panelHeight - 200;
        
        // ログエリアの背景
        const logBg = this.add.graphics();
        logBg.fillStyle(0x0a1020, 0.5);
        logBg.fillRoundedRect(logAreaX, logAreaY, logAreaWidth, logAreaHeight, 10);
        this.logWindowContainer.add(logBg);
        
        // ログテキスト生成
        let logText = '';
        if (this.logData.length === 0) {
            logText = '\n\n（まだ会話がありません）';
        } else {
            this.logData.forEach(log => {
                logText += `【${log.speaker}】\n${log.text}\n\n`;
            });
        }
        
        // ログコンテンツ（マスク用コンテナ内）
        const logContentContainer = this.add.container(0, 0);
        this.logWindowContainer.add(logContentContainer);
        
        const logContent = this.add.text(logAreaX + 20, logAreaY + 15, logText, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#e0e0e0',
            wordWrap: { width: logAreaWidth - 60 },
            lineSpacing: 10
        });
        logContentContainer.add(logContent);
        
        // マスク設定
        const maskShape = this.make.graphics();
        maskShape.fillRect(960 + logAreaX, 540 + logAreaY, logAreaWidth, logAreaHeight);
        const mask = maskShape.createGeometryMask();
        logContentContainer.setMask(mask);
        
        // スクロール変数
        this.logScrollY = 0;
        const maxScroll = Math.max(0, logContent.height - logAreaHeight + 30);
        
        // マウスホイールでスクロール
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY) => {
            if (!this.isLogOpen) return;
            
            this.logScrollY += deltaY * 0.5;
            this.logScrollY = Phaser.Math.Clamp(this.logScrollY, 0, maxScroll);
            logContent.setY(logAreaY + 15 - this.logScrollY);
        });

        // 📱 タッチドラッグスクロール対応
        this.logDragging = false;
        this.logDragStartY = 0;

        this.input.on('pointerdown', (pointer) => {
            if (!this.isLogOpen) return;
            // ログエリア内かチェック
            const worldLogAreaX = 960 + logAreaX;
            const worldLogAreaY = 540 + logAreaY;
            if (pointer.x >= worldLogAreaX && pointer.x <= worldLogAreaX + logAreaWidth &&
                pointer.y >= worldLogAreaY && pointer.y <= worldLogAreaY + logAreaHeight) {
                this.logDragging = true;
                this.logDragStartY = pointer.y;
            }
        });

        this.input.on('pointermove', (pointer) => {
            if (!this.isLogOpen || !this.logDragging) return;
            const deltaYVal = this.logDragStartY - pointer.y;
            this.logScrollY += deltaYVal;
            this.logScrollY = Phaser.Math.Clamp(this.logScrollY, 0, maxScroll);
            logContent.setY(logAreaY + 15 - this.logScrollY);
            this.logDragStartY = pointer.y;
        });

        this.input.on('pointerup', () => {
            this.logDragging = false;
        });

        this.input.on('pointerupoutside', () => {
            this.logDragging = false;
        });
        
        // スクロールバー（見た目のみ）
        if (maxScroll > 0) {
            const scrollBarBg = this.add.graphics();
            scrollBarBg.fillStyle(0x2a3a4a, 0.5);
            scrollBarBg.fillRoundedRect(logAreaX + logAreaWidth - 15, logAreaY + 5, 10, logAreaHeight - 10, 5);
            this.logWindowContainer.add(scrollBarBg);
            
            const scrollBarHeight = Math.max(30, (logAreaHeight / (logAreaHeight + maxScroll)) * (logAreaHeight - 10));
            this.logScrollBar = this.add.graphics();
            this.logScrollBar.fillStyle(0x00d4aa, 0.8);
            this.logScrollBar.fillRoundedRect(logAreaX + logAreaWidth - 15, logAreaY + 5, 10, scrollBarHeight, 5);
            this.logWindowContainer.add(this.logScrollBar);
        }
    }
    
    _createLogControlButton(x, y, text, color, onClick) {
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(color, 1);
        bg.fillRoundedRect(-70, -22, 140, 44, 8);
        container.add(bg);
        
        const label = this.add.text(0, 0, text, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        container.add(label);
        
        const hit = this.add.rectangle(0, 0, 140, 44)
            .setInteractive({ useHandCursor: true });
        container.add(hit);
        
        hit.on('pointerover', () => container.setScale(1.05));
        hit.on('pointerout', () => container.setScale(1.0));
        hit.on('pointerdown', onClick);
        
        return { container, label, bg };
    }
    
    _hideLogWindow() {
        if (this.logWindowContainer) {
            this.logWindowContainer.destroy();
            this.logWindowContainer = null;
        }
        this.isLogOpen = false;
    }
    
    // ==========================================================
    // 🔄 オートモード
    // ==========================================================
    _toggleAutoMode() {
        this.isAutoMode = !this.isAutoMode;
        
        // ボタン表示更新
        if (this.autoButtonLabel) {
            this.autoButtonLabel.setColor(this.isAutoMode ? '#00ff88' : '#7a9aba');
        }
        
        // SE再生
        if (this.cache.audio.exists('se_scroll')) {
            this.sound.play('se_scroll', { volume: 0.3 });
        }
        
        // オートモードON & テキスト表示完了済みなら進行開始
        if (this.isAutoMode && !this.isAnimating && !this.pendingChoices) {
            this._scheduleAutoAdvance();
        }
    }
    
    _scheduleAutoAdvance() {
        if (!this.isAutoMode) return;
        if (this.autoTimer) {
            this.autoTimer.remove();
        }
        
        // ボイス再生中なら待機、そうでなければ2秒後に進行
        const delay = this.currentVoice && this.currentVoice.isPlaying ? 500 : 2000;
        
        this.autoTimer = this.time.delayedCall(delay, () => {
            if (this.isAutoMode && !this.isAnimating && !this.pendingChoices && !this.choicesContainer.visible) {
                // ボイスが終わるまで待機
                if (this.currentVoice && this.currentVoice.isPlaying) {
                    this._scheduleAutoAdvance();
                } else {
                    this._advanceDialogue();
                }
            }
        });
    }
    
    _cancelAutoMode() {
        if (this.autoTimer) {
            this.autoTimer.remove();
            this.autoTimer = null;
        }
        this.isAutoMode = false;
        if (this.autoButtonLabel) {
            this.autoButtonLabel.setColor('#7a9aba');
        }
    }
    
    // ==========================================================
    // ⚙ 設定ウィンドウ（VolumeSettingsコンポーネント使用）
    // ==========================================================
    _showConfigWindow() {
        if (this.isConfigOpen) {
            this._hideConfigWindow();
            return;
        }
        this.isConfigOpen = true;
        
        // VolumeSettingsコンポーネントを使って音量設定ウィンドウを作成
        const result = VolumeSettings.createVolumeWindow(this, {
            depth: 200,
            onBGMChange: (vol) => {
                if (this.bgm) this.bgm.setVolume(vol);
            },
            onSEChange: (vol) => {
                if (this.cache.audio.exists('se_scroll')) {
                    this.sound.play('se_scroll', { volume: vol });
                }
            },
            onVoiceChange: (vol) => {
                // ボイス音量変更時にBGMのボリュームも更新
            },
            onClose: () => {
                this.isConfigOpen = false;
                this.configVolumeWindow = null;
            }
        });
        
        this.configVolumeWindow = result;
        result.show();
    }
    
    _hideConfigWindow() {
        if (this.configVolumeWindow) {
            this.configVolumeWindow.hide();
            this.configVolumeWindow = null;
        }
        if (this.configWindowContainer) {
            this.configWindowContainer.destroy();
            this.configWindowContainer = null;
        }
    }
}
