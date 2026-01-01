// CheckScene.js - 会計処理シーン

import { addTransitionMethods } from './TransitionManager.js';
import { EventBus, GameEvents } from './EventBus.js';
import { GameStateManager } from './GameStateManager.js';
import { InsuranceCardDisplay } from './components/InsuranceCardDisplay.js';
import { MedicineUtils } from './components/MedicineUtils.js';
import { UIHeader } from './components/UIHeader.js';
import { SoundManager } from './components/SoundManager.js';
import { UIUtils } from './components/UIUtils.js';
import { NavigationButton } from './components/NavigationButton.js';
import { MedicineDictionary } from './components/MedicineDictionary.js';
import { NotificationBadge } from './components/NotificationBadge.js';
import { ReceptionSlip } from './components/ReceptionSlip.js'; // 🆕 受付票コンポーネント
import { TutorialManager } from './components/TutorialManager.js'; // 🆕 チュートリアル用

export class CheckScene extends Phaser.Scene {
    constructor() {
        super('CheckScene');
        
        // 状態管理 (Registry から復元)
        this.accountingQueue = [];           // 会計待ち患者リスト
        this.completedInsuranceCards = [];   // 保険証リスト（種別ごと）
        this.currentPatient = null;          // 現在処理中の患者
        this.medicineData = [];              // 薬リスト (西洋薬+漢方)
        this.chineseMedicineData = [];       // 漢方薬リスト
        this.accountingPhase = 'idle';       // 'idle' | 'prescription' | 'insurance' | 'payment'
        this.prescriptionErrors = [];        // 処方箋に含まれるエラー
        this.foundErrors = [];               // プレイヤーが発見したエラー
        this.activeUI = [];                  // アクティブなUI要素
        this.stampPressed = false;           // 印鑑押下済みフラグ
        
        // スコア関連
        this.errorBonusPoints = 20;          // エラー発見ボーナス（全体point）
        this.errorMissedPenalty = -40;        // エラー見逃しペナルティ (1件につき)
        this.falsePositivePenalty = -2;       // 正しい項目をエラー報告時のペナルティ
        
        // 処方確認完了フラグ
        this.prescriptionCheckCompleted = false;
    }

    preload() {
        // PreloadSceneがない場合に必要
        this.load.image('receptionBg2', 'assets/images/reception_background2.png');
        this.load.json('medicineData', 'assets/data/fictional_medicine.json');
        this.load.json('chineseMedicineData', 'assets/data/fictional_chinese_medicine.json');
        this.load.json('triageData', 'assets/data/triage_data.json');
        this.load.json('insuranceData', 'assets/data/Health_insurance_card.json');
    }

    create() {
        // 🎬 トランジション初期化
        addTransitionMethods(this);
        
        // 🚨 修正: シーン開始時はログをリセット
        const hud = this.scene.get('HUDScene');
        if (hud && hud.resetCurrentPatientLog) {
            hud.resetCurrentPatientLog();
        }
        
        // 🗄️ Registry から待ちリストを復元（シーン切り替え対応）
        const savedQueue = this.registry.get('checkSceneAccountingQueue');
        // 🚨 修正: 常に Registry の値を使用（空配列でも）
        this.accountingQueue = (savedQueue && Array.isArray(savedQueue)) ? savedQueue : [];
        console.log('[CheckScene] Registry から待ちリストを復元:', this.accountingQueue.length, '人');
        
        // データ読み込み
        this.medicineData = this.cache.json.get('medicineData') || [];
        this.chineseMedicineData = this.cache.json.get('chineseMedicineData') || [];
        this.triageData = this.cache.json.get('triageData') || [];
        this.insuranceCardData = this.cache.json.get('insuranceData') || [];
        
        // 統合薬リスト作成
        this.allMedicineData = [...this.medicineData, ...this.chineseMedicineData];
        
        // 保険証選択状態
        this.selectedInsuranceCard = null;
        this.insuranceVerified = false;
        
        // 🚨 修正: 同じ減点を複数回カウントしないための追跡用
        this.appliedScoreReasons = new Set();
        
        // ============================================
        // 🎨 新UIレイアウト: 3カラム構成
        // ============================================
        
        // --- 背景（シンプルなグラデーション） ---
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xE8EAF6, 0xE8EAF6, 0xC5CAE9, 0xC5CAE9, 1);
        bg.fillRect(0, 0, 1920, 1080);
        
        
        // --- ヘッダー ---
        this._createHeader(960, 70, '💊 処方確認・照合', 0x7E57C2, '📋');
        
        // --- 進捗バー ---
        this._createProgressBar();
        
        // --- 左カラム: 待ちリスト (幅280px) ---
        this._createLeftPanel();
        
        // --- 中央カラム: 患者情報 (幅900px) ---
        this._createCenterPanel();
        
        // --- 右カラム: レジエリア (幅350px) ---
        this._createRightPanel();
        
        // --- ナビゲーションボタン ---
        this._createBackButton();
        
        // --- 薬一覧ボタン ---
        this._createMedicineListButton();
        
        
        // --- テスト用ダミー患者は使用しない ---
        // 患者は ReceptionScene から completedForAccountingQueue 経由で受け取る
        // this._addTestPatients();
        
        
        // --- ドラッグ＆ドロップイベント設定 ---
        // グローバルハンドラは削除（個別コンテナで処理するため）
        
        // 定期的に会計キューをチェック
        this.time.addEvent({
            delay: 3000,
            callback: () => this._checkForNewPatients(),
            loop: true
        });
        
        // 🚨 修正: シーン開始時に即座に患者リストをチェック（表示遅延を解消）
        // 🆕 チュートリアル
        TutorialManager.getInstance(this.game).notifySceneReady('CheckScene');
        TutorialManager.getInstance(this.game).completeStep('CHECK_SCENE_ENTERED');

        this._checkForNewPatients();
        
        // 🚨 修正: Registry から復元した患者リストを即座に描画
        this._updateWaitingList();
        
        // 🚨 修正: シーン再開時にも待ちリストを更新（PaymentScene から戻った時用）
        this.events.on('wake', () => {
            console.log('[CheckScene] wake event - refreshing waiting list');
            this._updateWaitingList();
            this._checkAndClearCompletedPatient();
            
            // 🆕 チュートリアル
            TutorialManager.getInstance(this.game).notifySceneReady('CheckScene');
            TutorialManager.getInstance(this.game).completeStep('CHECK_SCENE_ENTERED');
        });
        this.events.on('resume', () => {
            console.log('[CheckScene] resume event - refreshing waiting list');
            this._updateWaitingList();
            this._checkAndClearCompletedPatient();
        });
        
        // 🆕 チュートリアル通知
        this.time.delayedCall(300, () => {
            TutorialManager.getInstance(this.game).notifySceneReady('CheckScene');
        });
    }
    
    // ==========================================================
    // 会計完了した患者のUIをクリア
    // ==========================================================
    _checkAndClearCompletedPatient() {
        // 🚨 修正: currentPatient が null でも、UI が残っている場合は強制クリーニング
        if (!this.currentPatient) {
            if (this.documentContainer && this.documentContainer.list && this.documentContainer.list.length > 0) {
                 console.log('[CheckScene] currentPatient is null but DocumentContainer has items. Forcing cleanup.');
                 this.documentContainer.removeAll(true);
                 this._clearActiveUI();
                 this._showEmptyRegister();
                 if (this.noPatientText) this.noPatientText.setVisible(true);
            }
            return;
        }
        
        // Registry から最新の待ちリストを取得
        const queue = this.registry.get('checkSceneAccountingQueue') || [];
        
        // 現在表示中の患者がまだ待ちリストにいるかチェック
        // 🚨 修正: 空白の有無による不一致を防ぐため、スペースを除去して比較
        const patientStillInQueue = queue.some(p => 
            p.name.replace(/\s+/g, '') === this.currentPatient.name.replace(/\s+/g, '') || 
            (p.insuranceDetails?.ID === this.currentPatient.insuranceDetails?.ID)
        );
        
        console.log(`[CheckScene] 患者クリアチェック: ${this.currentPatient.name} (Queue残存: ${patientStillInQueue})`);
        
        if (!patientStillInQueue) {
            console.log('[CheckScene] 現在の患者は会計完了済み - UIをクリア');
            
            // UIをクリア
            this._clearActiveUI();
            if (this.documentContainer) this.documentContainer.removeAll(true); // 🚨 修正: 中央パネルもクリア
            this.insuranceTabMode = undefined; // 🚨 修正: 保険証タブ状態もリセット
            this.insuranceVerified = false; // 🚨 修正: 保険証確認フラグもリセット
            this._showEmptyRegister(); // 🚨 修正: 右パネル（レジ情報）も明示的にクリア
            
            // 🚨 修正: 患者切り替え時に現在の患者ログをリセット
             const hud = this.scene.get('HUDScene');
             if (hud && hud.resetCurrentPatientLog) {
                 hud.resetCurrentPatientLog();
             }

            // 状態をリセット
            this.currentPatient = null;
            this.selectedPatient = null;
            this.prescriptionItems = null;
            this.prescriptionErrors = [];
            this.foundErrors = [];
            this.stampPressed = false;
            this.prescriptionCheckCompleted = false;
            
            // 「患者を選択してください」メッセージを表示
            if (this.noPatientText) {
                this.noPatientText.setVisible(true);
            }
            
            // 進捗バーをリセット
            this._updateProgress('waiting');
        }
    }

    // ==========================================================
    // 🔊 SE再生ヘルパー (SoundManager委譲)
    // ==========================================================
    _playSE(key, volumeOrConfig = 1.0) {
        SoundManager.playSE(this, key, volumeOrConfig);
    }

    // ==========================================================
    // 🎤 処方箋チェック患者到着時のボイス再生
    // ==========================================================
    _playPrescriptionCheckVoice() {
        const globalSeVolume = this.registry.get('seVolume') ?? 0.8;
        try {
            this.sound.play('vc_prescription_check', { volume: globalSeVolume });
        } catch (e) {
            console.error("Prescription check voice play error:", e);
        }
    }

    // ==========================================================
    // 📊 進捗バー（ステップ表示）
    // ==========================================================
    _createProgressBar() {
        const steps = [
            { icon: '1️⃣', label: 'カルテ確認', key: 'karte' },
            { icon: '2️⃣', label: '処方確認', key: 'prescription' },
            { icon: '3️⃣', label: 'お支払い', key: 'payment' }
        ];
        
        const barY = 140;
        const stepWidth = 250;
        const startX = 960 - (stepWidth * steps.length / 2) + stepWidth / 2;
        
        this.progressSteps = {};
        
        steps.forEach((step, i) => {
            const x = startX + i * stepWidth;
            
            const stepBg = this.add.rectangle(x, barY, 220, 50, 0xFFFFFF)
                .setStrokeStyle(3, 0xBDBDBD)
                .setDepth(5);
            
            const stepText = this.add.text(x, barY, `${step.icon} ${step.label}`, {
                fontSize: '20px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#757575'
            }).setOrigin(0.5).setDepth(6);
            
            this.progressSteps[step.key] = { bg: stepBg, text: stepText };
        });
    }
    
    _updateProgress(currentStep) {
        const order = ['karte', 'prescription', 'payment'];
        const currentIndex = order.indexOf(currentStep);
        
        order.forEach((key, i) => {
            const step = this.progressSteps[key];
            if (!step) return;
            
            if (i < currentIndex) {
                // 完了
                step.bg.setFillStyle(0x4CAF50);
                step.bg.setStrokeStyle(3, 0x388E3C);
                step.text.setColor('#FFFFFF');
            } else if (i === currentIndex) {
                // 現在
                step.bg.setFillStyle(0xFFC107);
                step.bg.setStrokeStyle(3, 0xFFA000);
                step.text.setColor('#000000');
            } else {
                // 未完了
                step.bg.setFillStyle(0xFFFFFF);
                step.bg.setStrokeStyle(3, 0xBDBDBD);
                step.text.setColor('#757575');
            }
        });
    }

    // ==========================================================
    // 📋 左パネル: 待ちリスト - モダンデザイン
    // ==========================================================
    _createLeftPanel() {
        const panelX = 20;
        const panelY = 180;
        const panelW = 260;
        const panelH = 800;
        
        // ========================================
        // 🎨 モダン背景パネル（シャドウ付きカード）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(0);
        shadowBg.fillStyle(0x000000, 0.12);
        shadowBg.fillRoundedRect(panelX + 5, panelY + 5, panelW, panelH, 12);
        
        const bg = this.add.graphics().setDepth(1);
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
        
        // ヘッダー（黒ベース）
        const headerBg = this.add.graphics().setDepth(2);
        headerBg.fillStyle(0x1A1A1A, 1);
        headerBg.fillRoundedRect(panelX, panelY, panelW, 60, { tl: 12, tr: 12, bl: 0, br: 0 });
        
        this.add.text(panelX + panelW/2, panelY + 30, '📋 待ちリスト', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(3);
        
        // リストコンテナ
        this.waitingListContainer = this.add.container(panelX + 20, panelY + 80).setDepth(3);
    }

    // ==========================================================
    // 👤 中央パネル: 患者情報エリア - モダンデザイン
    // ==========================================================
    _createCenterPanel() {
        const panelX = 300;
        const panelY = 180;
        const panelW = 1200;
        const panelH = 800;
        
        // ========================================
        // 🎨 モダン背景パネル（シャドウ付きカード）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(0);
        shadowBg.fillStyle(0x000000, 0.12);
        shadowBg.fillRoundedRect(panelX + 5, panelY + 5, panelW, panelH, 12);
        
        const bg = this.add.graphics().setDepth(1);
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
        
        // ヘッダー（黒ベース）
        const headerBg = this.add.graphics().setDepth(2);
        headerBg.fillStyle(0x1A1A1A, 1);
        headerBg.fillRoundedRect(panelX, panelY, panelW, 60, { tl: 12, tr: 12, bl: 0, br: 0 });
        
        this.add.text(panelX + panelW/2, panelY + 30, '👤 患者さん情報', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(3);
        
        // ドキュメントコンテナ
        this.documentContainer = this.add.container(panelX + panelW/2, panelY + panelH/2 + 30).setDepth(5);
        
        // プレースホルダー
        this.noPatientText = this.add.text(panelX + panelW/2, panelY + panelH/2, '⬅️ 左のリストから\n患者さんを選んでね！', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#AAAAAA',
            align: 'center'
        }).setOrigin(0.5).setDepth(5);
    }

    // ==========================================================
    // 💰 右パネル: レジエリア - モダンデザイン
    // ==========================================================
    _createRightPanel() {
        const panelX = 1520;
        const panelY = 180;
        const panelW = 380;
        const panelH = 800;
        
        // ========================================
        // 🎨 モダン背景パネル（シャドウ付きカード）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(0);
        shadowBg.fillStyle(0x000000, 0.12);
        shadowBg.fillRoundedRect(panelX + 5, panelY + 5, panelW, panelH, 12);
        
        const bg = this.add.graphics().setDepth(1);
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(panelX, panelY, panelW, panelH, 12);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.strokeRoundedRect(panelX, panelY, panelW, panelH, 12);
        
        // ヘッダー（黒ベース）
        const headerBg = this.add.graphics().setDepth(2);
        headerBg.fillStyle(0x1A1A1A, 1);
        headerBg.fillRoundedRect(panelX, panelY, panelW, 60, { tl: 12, tr: 12, bl: 0, br: 0 });
        
        this.add.text(panelX + panelW/2, panelY + 30, '✅ 照合→会計', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(3);
        
        // レジコンテナ（ヘッダーの下から開始）
        this.registerContainer = this.add.container(panelX + panelW/2, panelY + 430).setDepth(5);
        
        // 初期状態
        this._showEmptyRegister();
    }
    
    _showEmptyRegister() {
        if (!this.registerContainer) return;
        this.registerContainer.removeAll(true);
        
        const elements = [];
        
        // 患者が選択されているかチェック
        const hasPatient = !!this.selectedPatient;
        
        // 手順説明テキスト（上部に配置）
        const step1 = this.add.text(0, -320, '1. 患者さんを選んでください', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: hasPatient ? '#4CAF50' : '#555555'
        }).setOrigin(0.5);
        
        const step2 = this.add.text(0, -290, '2. カルテ・処方箋を確認', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#555555'
        }).setOrigin(0.5);
        
        const step3 = this.add.text(0, -260, '3. 印鑑を押して確認', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#555555'
        }).setOrigin(0.5);
        
        const step4 = this.add.text(0, -230, '4. 会計へ進む', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#555555'
        }).setOrigin(0.5);
        
        elements.push(step1, step2, step3, step4);
        
        // 患者未選択時のメッセージ
        if (!hasPatient) {
            elements.push(this.add.text(0, 0, '👆 左の患者リストから\n患者を選択してください', {
                fontSize: '18px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#666666',
                align: 'center'
            }).setOrigin(0.5));
        }
        
        this.registerContainer.add(elements);
    }
    
    _showRegisterInfo(patient) {
        if (!this.registerContainer) return;
        this.registerContainer.removeAll(true);
        
        // 領収書データ計算
        this._calculateReceiptData(patient);
        console.log('[DEBUG] _showRegisterInfo receiptData:', JSON.stringify(this.receiptData));
        if (!this.receiptData) return;
        
        const elements = [];
        let y = -280;
        
        // 患者名（大きく）
        elements.push(this.add.text(0, y, `${patient.name} 様`, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5));
        y += 50;
        
        // 印鑑ステータス (ユーザー要望により非表示)
        // const stampStatus = this.stampPressed ? '🔴 印鑑: ✓' : '⭕ 印鑑: 未押印';
        // const stampColor = this.stampPressed ? '#4CAF50' : '#E74C3C';
        // elements.push(this.add.text(0, y, stampStatus, {
        //     fontSize: '18px', color: stampColor,
        //     fontFamily: '"Noto Sans JP", sans-serif'
        // }).setOrigin(0.5));
        // y += 40;
        
        // 保険証タブ切り替え
        // デフォルトは「保険証不要（マイナ）」
        if (this.insuranceTabMode === undefined) {
            this.insuranceTabMode = 'myna';  // 'paper' or 'myna'
            this.insuranceVerified = true;   // マイナの場合は確認不要
        }
        
        const tabWidth = 140;
        const tabHeight = 35;
        const tabGap = 10;
        const leftTabX = -tabWidth/2 - tabGap/2;
        const rightTabX = tabWidth/2 + tabGap/2;
        
        // 「保険証を探す」タブ
        const paperTabColor = this.insuranceTabMode === 'paper' ? 0x3498DB : 0xBDBDBD;
        const paperTab = this.add.rectangle(leftTabX, y, tabWidth, tabHeight, paperTabColor)
            .setStrokeStyle(2, this.insuranceTabMode === 'paper' ? 0x2980B9 : 0x9E9E9E)
            .setInteractive({ useHandCursor: true });
        
        // 🆕 チュートリアル: ボタン登録
        TutorialManager.getInstance(this.game).registerButton('insurance_paper_tab', paperTab);
            
        const paperTabText = this.add.text(leftTabX, y, '🪪 保険証を探す', {
            fontSize: '12px', color: this.insuranceTabMode === 'paper' ? '#FFFFFF' : '#666666',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        
        // 「保険証不要（マイナ）」タブ
        const mynaTabColor = this.insuranceTabMode === 'myna' ? 0x7E57C2 : 0xBDBDBD;
        const mynaTab = this.add.rectangle(rightTabX, y, tabWidth, tabHeight, mynaTabColor)
            .setStrokeStyle(2, this.insuranceTabMode === 'myna' ? 0x5E35B1 : 0x9E9E9E)
            .setInteractive({ useHandCursor: true });
        const mynaTabText = this.add.text(rightTabX, y, '💳 不要（マイナ）', {
            fontSize: '12px', color: this.insuranceTabMode === 'myna' ? '#FFFFFF' : '#666666',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        
        // タブ切り替えイベント
        paperTab.on('pointerdown', () => {
            console.log('[CheckScene] 🔍 DEBUG: paperTab (保険証を探す) clicked!');
            console.log('[CheckScene] 🔍 DEBUG: current insuranceTabMode =', this.insuranceTabMode);
            if (this.insuranceTabMode !== 'paper') {
                this._playSE('se_scroll', { volume: 0.5 });
                this.insuranceTabMode = 'paper';
                this.insuranceVerified = false;  // 保険証が必要になったので未確認に
                
                // 🆕 チュートリアル: タブクリック完了
                console.log('[CheckScene] 🔍 DEBUG: calling completeStep(INSURANCE_PAPER_TAB_CLICKED)');
                TutorialManager.getInstance(this.game).completeStep('INSURANCE_PAPER_TAB_CLICKED');
                console.log('[CheckScene] 🔍 DEBUG: completeStep called, re-rendering');
                
                this._showRegisterInfo(patient);  // 再描画
            } else {
                console.log('[CheckScene] 🔍 DEBUG: already in paper mode, skipping completeStep');
            }
        });
        
        mynaTab.on('pointerdown', () => {
            if (this.insuranceTabMode !== 'myna') {
                this._playSE('se_scroll', { volume: 0.5 });
                this.insuranceTabMode = 'myna';
                this.insuranceVerified = true;  // マイナなので確認完了扱い
                this._showRegisterInfo(patient);  // 再描画
            }
        });
        
        elements.push(paperTab, paperTabText, mynaTab, mynaTabText);
        y += 45;
        
        // 保険証を探すモードの場合、確認ボタンを表示
        if (this.insuranceTabMode === 'paper' && !this.insuranceVerified) {
            const insBtn = this.add.rectangle(0, y, 200, 40, 0x4CAF50)
                .setStrokeStyle(3, 0x388E3C)
                .setInteractive({ useHandCursor: true });
            const insBtnText = this.add.text(0, y, '🔍 保険証を確認', {
                fontSize: '14px', color: '#FFFFFF',
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            
            insBtn.on('pointerover', () => insBtn.setFillStyle(0x66BB6A));
            insBtn.on('pointerout', () => insBtn.setFillStyle(0x4CAF50));
            insBtn.on('pointerdown', () => {
                console.log('[CheckScene] 🔍 DEBUG: 保険証を確認 button clicked!');
                this._playSE('se_display_card', 0.6);
                // 🆕 チュートリアル: モーダルオープン完了
                console.log('[CheckScene] 🔍 DEBUG: calling completeStep(INSURANCE_MODAL_OPENED)');
                TutorialManager.getInstance(this.game).completeStep('INSURANCE_MODAL_OPENED');
                console.log('[CheckScene] 🔍 DEBUG: completeStep called, now showing modal');
                this._showInsuranceTypeModal();
            });

            // 🆕 チュートリアル登録
            TutorialManager.getInstance(this.game).registerButton('check_insurance_button', insBtn);
            
            elements.push(insBtn, insBtnText);
        } else if (this.insuranceTabMode === 'paper' && this.insuranceVerified) {
            // 確認済みの場合はチェックマーク表示
            elements.push(this.add.text(0, y, '✅ 保険証確認済み', {
                fontSize: '14px', color: '#4CAF50',
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5));
        }
        
        // 区切り線
        y = 100; 
        elements.push(this.add.rectangle(0, y, 320, 3, 0x4CAF50));
        y += 30;
        
        // 金額プレビュー
        elements.push(this.add.text(0, y, `お支払い予定:`, {
            fontSize: '18px', color: '#000000ff',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5));
        y += 40;
        
        const totalPay = this.receiptData.patientPay + (this.receiptData.selfPay || 0);
        elements.push(this.add.text(0, y, `¥${totalPay.toLocaleString()}`, {
            fontSize: '36px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#000000ff'
        }).setOrigin(0.5));
        y += 70;
        
        // ========================================
        // 💰 会計へ進むボタン（黄色・共通カラースキーム）
        // ========================================
        const BUTTON_COLORS = {
            payment: { bg: 0xF9A825, hover: 0xFBC02D, border: 0xC17900, text: '#000000' }
        };
        const colors = BUTTON_COLORS.payment;
        
        const btnWidth = 280;
        const btnHeight = 55;
        const btnContainer = this.add.container(0, y);
        
        // メイン背景（黄色ベース）
        const bg = this.add.graphics();
        bg.fillStyle(colors.bg, 1);
        bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
        bg.lineStyle(2, colors.border, 1);
        bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
        btnContainer.add(bg);
        
        // テキスト
        const goText = this.add.text(0, btnHeight / 2, '💰 会計へ進む ▶', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: colors.text
        }).setOrigin(0.5);
        btnContainer.add(goText);
        
        // インタラクティブ領域
        const goBtn = this.add.rectangle(0, btnHeight / 2, btnWidth, btnHeight, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        btnContainer.add(goBtn);
        
        // ホバーエフェクト
        goBtn.on('pointerover', () => {
            bg.clear();
            bg.fillStyle(colors.hover, 1);
            bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            bg.lineStyle(2, colors.border, 1);
            bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            this.tweens.add({
                targets: btnContainer,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 80,
                ease: 'Quad.easeOut'
            });
        });
        
        goBtn.on('pointerout', () => {
            bg.clear();
            bg.fillStyle(colors.bg, 1);
            bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            bg.lineStyle(2, colors.border, 1);
            bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            this.tweens.add({
                targets: btnContainer,
                scaleX: 1,
                scaleY: 1,
                duration: 80,
                ease: 'Quad.easeOut'
            });
        });
        
        goBtn.on('pointerdown', () => {
            this.tweens.add({
                targets: btnContainer,
                scaleX: 0.97,
                scaleY: 0.97,
                duration: 40,
                yoyo: true,
                ease: 'Quad.easeInOut'
            });
            this._playSE('se_changesean', 0.8);
            this._goToPayment(patient);
        });
        
        elements.push(btnContainer);
        
        this.registerContainer.add(elements);
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('check_ok_button', goBtn);
    }
    
    _goToPayment(patient) {
        // 🚨 修正: 患者の削除は PaymentScene で支払い完了時のみ行う
        // ここでは削除せず、PaymentScene に患者情報を渡すだけ
        
        // PaymentSceneへ遷移（印鑑・保険証情報を渡してペナルティチェックに使用）
        const insuranceType = patient.insuranceType || 'paper';  // 'paper' or 'myNumber'
        console.log('会計へ:', patient.name, '保険タイプ:', insuranceType, '印鑑:', this.stampPressed, '保険確認:', this.insuranceVerified, 'タブモード:', this.insuranceTabMode);
        
        // 🆕 チュートリアル: 会計シーン遷移完了
        TutorialManager.getInstance(this.game).completeStep('PAYMENT_SCENE_ENTERED');
        
        // 🆕 キュー順位を計算（先頭=0、2番目=1、...）
        // ReceptionSceneのpatientQueueから未完了患者のみを抽出し、順位を計算
        // 🆕 問診記入中の患者（needsQuestionnaire && !questionnaireCompleted）はスキップ減点対象外
        const receptionScene = this.scene.get('ReceptionScene');
        let queuePosition = 0;
        if (receptionScene && receptionScene.patientManager && receptionScene.patientManager.patientQueue) {
            const originalQueue = receptionScene.patientManager.patientQueue;
            // 未完了かつ問診記入が完了している患者のみを対象とする
            const queue = originalQueue.filter(p => {
                if (p.isFinished) return false;
                // 問診記入中の患者はスキップ対象としてカウントしない
                if (p.needsQuestionnaire && !p.questionnaireCompleted) return false;
                return true;
            });
            const patientIndex = queue.findIndex(p => 
                p.name === patient.name || 
                (p.insuranceDetails?.ID === patient.insuranceDetails?.ID)
            );
            queuePosition = patientIndex >= 0 ? patientIndex : 0;
            
            // 🔍 デバッグログ
            console.log('[Queue Debug] 元のキュー:', originalQueue.map(p => ({
                name: p.name, 
                isFinished: p.isFinished,
                needsQ: p.needsQuestionnaire,
                qCompleted: p.questionnaireCompleted
            })));
            console.log('[Queue Debug] フィルタ後キュー:', queue.map(p => p.name));
            console.log('[Queue Debug] 患者Index:', patientIndex, '→ queuePosition:', queuePosition);
        }
        console.log('キュー順位:', queuePosition, '(0=先頭, 問診記入中は除外)');
        
        // 🚨 修正: Registry を先にセット（slideToScene より前に！）
        this.registry.set('paymentSceneData', {
            patient: patient,
            amount: this.receiptData.patientPay,
            receiptData: this.receiptData,
            insuranceType: insuranceType,
            insuranceVerified: this.insuranceVerified || false,
            insuranceTabMode: this.insuranceTabMode || 'myna',  // 🆕 タブモードも渡す
            stampPressed: this.stampPressed || false,
            queuePosition: queuePosition  // 🆕 キュー順位を追加
        });
        
        // シーンを完全に再起動するため、stop してから start
        this.scene.stop('PaymentScene');
        this.slideToScene('PaymentScene', 'left');
    }
    
    // ==========================================================
    // 📊 スコアログ表示 → HUDScene に委譲
    // ==========================================================
    _showQuickScoreInfo(patientName, score) {
        // HUDScene.showScoreNotification で表示（患者名不要のため空配列）
        const hudScene = this.scene.get('HUDScene');
        if (hudScene && hudScene.showScoreNotification) {
            // スコア情報の通知（患者名は不要、シンプルに）
            hudScene.showScoreNotification('📋 会計へ移動', [], '#00AA00');
        }
    }
    
    // ==========================================================
    // 🪪 保険種別選択モーダル（ステップ1）
    // ==========================================================
    _showInsuranceTypeModal() {
        // 患者未選択の場合は警告を表示
        if (!this.selectedPatient) {
            this._showMessage('先に患者を選択してください', '#FF6600');
            return;
        }
        
        // 既存のモーダルがあれば閉じる
        if (this.insuranceModal) {
            this.insuranceModal.destroy();
            this.insuranceModal = null;
            return;
        }

        
        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;
        const modalW = 500;
        const modalH = 400;

        // Note: INSURANCE_MODAL_OPENED イベントはボタンクリック時に既に送信済み
        // ここで再度送信すると重複エラーになるため削除
        
        // モーダルコンテナ
        const container = this.add.container(screenW / 2, screenH / 2).setDepth(2000);
        
        // 背景オーバーレイ
        const overlay = this.add.rectangle(0, 0, screenW, screenH, 0x000000, 0.6)
            .setInteractive();
        overlay.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            container.destroy();
            this.insuranceModal = null;
        });
        
        // モーダル背景
        const bg = this.add.rectangle(0, 0, modalW, modalH, 0xFFFFFF)
            .setStrokeStyle(4, 0x4CAF50)
            .setInteractive();
        
        // ヘッダー
        const header = this.add.rectangle(0, -modalH/2 + 40, modalW, 80, 0x4CAF50);
        const title = this.add.text(0, -modalH/2 + 40, '🪪 保険種別を選択', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 閉じるボタン
        const closeBtn = this.add.text(modalW/2 - 30, -modalH/2 + 40, '✕', {
            fontSize: '28px', color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            container.destroy();
            this.insuranceModal = null;
        });
        
        container.add([overlay, bg, header, title, closeBtn]);
        
        // 保険種別ボタン
        const types = [
            { key: '社保', color: 0x3498DB, label: '🏢 社会保険' },
            { key: '国保', color: 0xE74C3C, label: '🏠 国民健康保険' },
            { key: '後期高齢者', color: 0x9B59B6, label: '👴 後期高齢者' }
        ];
        
        let btnY = -50;
        types.forEach(type => {
            const btn = this.add.rectangle(0, btnY, 350, 65, type.color)
                .setStrokeStyle(3, 0xFFFFFF)
                .setInteractive({ useHandCursor: true });
            
            const btnText = this.add.text(0, btnY, type.label, {
                fontSize: '22px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            
            btn.on('pointerover', () => btn.setScale(1.05));
            btn.on('pointerout', () => btn.setScale(1));
            btn.on('pointerdown', () => {
                console.log(`[CheckScene] 🔍 DEBUG: Insurance type button clicked: ${type.key}`);
                this._playSE('se_display_card', 0.6);
                container.destroy();
                this.insuranceModal = null;
                // 🆕 チュートリアル通知（閉じる扱い）
                console.log('[CheckScene] 🔍 DEBUG: calling completeStep(INSURANCE_CARD_OPENED)');
                TutorialManager.getInstance(this.game).completeStep('INSURANCE_CARD_OPENED');
                console.log('[CheckScene] 🔍 DEBUG: now calling _showInsuranceCardByType');
                this._showInsuranceCardByType(type.key);
            });
            
            // 🆕 チュートリアル登録
            if (type.key === '社保') {
                TutorialManager.getInstance(this.game).registerButton('insurance_type_shaho', btn);
            } else if (type.key === '国保') {
                TutorialManager.getInstance(this.game).registerButton('insurance_type_kokuho', btn);
            }
            
            container.add([btn, btnText]);
            btnY += 85;
        });
        
        this.insuranceModal = container;
    }
    
    // ==========================================================
    // 🪪 保険証カード表示（ステップ2）
    // ==========================================================
    _showInsuranceCardByType(insuranceType) {
        console.log(`[CheckScene] 🔍 DEBUG: _showInsuranceCardByType called with type: ${insuranceType}`);
        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;
        const modalW = 700;
        const modalH = 620;

        // Note: INSURANCE_CARD_OPENED イベントはボタンクリック時に既に送信済み
        // ここで再度送信すると重複エラーになるため削除
        
        // モーダルコンテナ
        const container = this.add.container(screenW / 2, screenH / 2).setDepth(2000);
        
        // 背景オーバーレイ
        const overlay = this.add.rectangle(0, 0, screenW, screenH, 0x000000, 0.6)
            .setInteractive();
        overlay.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            container.destroy();
            this.insuranceModal = null;
        });
        
        // モーダル背景
        const bg = this.add.rectangle(0, 0, modalW, modalH, 0xFFFFFF)
            .setStrokeStyle(4, 0x4CAF50)
            .setInteractive();
        
        // ヘッダー
        let headerColor = 0x3498DB;
        if (insuranceType === '国保') headerColor = 0xE74C3C;
        else if (insuranceType === '後期高齢者') headerColor = 0x9B59B6;
        
        const header = this.add.rectangle(0, -modalH/2 + 30, modalW, 60, headerColor);
        const title = this.add.text(0, -modalH/2 + 30, `🪪 ${insuranceType}の保険証を選択`, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 閉じるボタン
        const closeBtn = this.add.text(modalW/2 - 25, -modalH/2 + 30, '✕', {
            fontSize: '24px', color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtn.on('pointerout', () => closeBtn.setScale(1));
        closeBtn.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            container.destroy();
            this.insuranceModal = null;
        });
        
        container.add([overlay, bg, header, title, closeBtn]);
        
        // 該当する保険種別の患者をフィルタリング
        const patients = (this.accountingQueue || []).filter(p => {
            // 🚨 修正: マイナンバー患者は保険証確認リストに表示しない
            if (p.insuranceType === 'myNumber') return false;

            const details = p.insuranceDetails || {};
            const age = parseInt(details['年齢']) || 0;
            const pType = details['保険種別'] || '社保';
            
            if (insuranceType === '後期高齢者') {
                return pType.includes('後期');
            } else if (insuranceType === '国保') {
                return pType.includes('国保');
            } else {
                return !pType.includes('国保') && !pType.includes('後期');
            }
        });
        
        if (patients.length === 0) {
            const noPatients = this.add.text(0, 0, `${insuranceType}の患者がいません`, {
                fontSize: '20px', color: '#888888'
            }).setOrigin(0.5);
            container.add(noPatients);
        } else {
            // 現在選択中の患者インデックス
            this.currentCardIndex = 0;
            this.cardPatients = patients;
            
            // カードコンテナ（切り替え用）
            this.cardDisplayContainer = this.add.container(0, 20);
            container.add(this.cardDisplayContainer);
            
            // 保険証カード描画
            this._updateCardDisplay(insuranceType, container);
            
            // 矢印ナビゲーション（複数患者の場合）
            if (patients.length > 1) {
                // 左矢印
                const leftArrow = this.add.text(-modalW/2 + 30, 20, '◀', {
                    fontSize: '40px',
                    color: '#333333',
                    backgroundColor: '#EEEEEE',
                    padding: { x: 10, y: 20 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                
                leftArrow.on('pointerover', () => {
                    leftArrow.setBackgroundColor('#DDDDDD');
                    leftArrow.setScale(1.1);
                });
                leftArrow.on('pointerout', () => {
                    leftArrow.setBackgroundColor('#EEEEEE');
                    leftArrow.setScale(1);
                });
                leftArrow.on('pointerdown', () => {
                    if (this.currentCardIndex > 0) {
                        this._playSE('se_scroll', 0.5);
                        this.currentCardIndex--;
                        this._updateCardDisplay(insuranceType, container);
                    }
                });
                
                // 右矢印
                const rightArrow = this.add.text(modalW/2 - 30, 20, '▶', {
                    fontSize: '40px',
                    color: '#333333',
                    backgroundColor: '#EEEEEE',
                    padding: { x: 10, y: 20 }
                }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                
                rightArrow.on('pointerover', () => {
                    rightArrow.setBackgroundColor('#DDDDDD');
                    rightArrow.setScale(1.1);
                });
                rightArrow.on('pointerout', () => {
                    rightArrow.setBackgroundColor('#EEEEEE');
                    rightArrow.setScale(1);
                });
                rightArrow.on('pointerdown', () => {
                    if (this.currentCardIndex < this.cardPatients.length - 1) {
                        this._playSE('se_scroll', 0.5);
                        this.currentCardIndex++;
                        this._updateCardDisplay(insuranceType, container);
                    }
                });
                
                container.add([leftArrow, rightArrow]);
                
                // ページインジケーター
                this.pageIndicator = this.add.text(0, modalH/2 - 90, '', {
                    fontSize: '16px',
                    color: '#666666'
                }).setOrigin(0.5);
                container.add(this.pageIndicator);
                this._updatePageIndicator();
            }
            
            // 確認ボタン
            const confirmBtn = this.add.rectangle(0, modalH/2 - 45, 220, 50, 0x4CAF50)
                .setStrokeStyle(3, 0x388E3C)
                .setInteractive({ useHandCursor: true });
            const confirmText = this.add.text(0, modalH/2 - 45, '✓ この保険証で確認', {
                fontSize: '18px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            
            confirmBtn.on('pointerover', () => {
                confirmBtn.setScale(1.05);
                confirmBtn.setFillStyle(0x66BB6A);
            });
            confirmBtn.on('pointerout', () => {
                confirmBtn.setScale(1);
                confirmBtn.setFillStyle(0x4CAF50);
            });
            confirmBtn.on('pointerdown', () => {
                const selectedCardPatient = this.cardPatients[this.currentCardIndex];
                
                // 選択された保険証が選択中の患者と一致するかチェック
                const selectedPatientId = this.selectedPatient?.insuranceDetails?.['ID'];
                const cardPatientId = selectedCardPatient?.insuranceDetails?.['ID'];
                
                if (selectedPatientId !== cardPatientId) {
                    // 異なる患者の保険証を選択した場合
                    this._playSE('se_miss', 0.6); // 🔊 ミス音
                    this._showMessage('⚠️ 患者が一致しません！', '#FF0000');
                    
                    // 赤くフラッシュ
                    this.cardDisplayContainer.iterate((child) => {
                        if (child.setTint) child.setTint(0xFF0000);
                    });
                    
                    this.time.delayedCall(500, () => {
                        this.cardDisplayContainer.iterate((child) => {
                            if (child.clearTint) child.clearTint();
                        });
                    });
                    return;
                }

                
                // 正しい患者の保険証を選択
                console.log('[CheckScene] 🔍 DEBUG: Correct patient selected for insurance confirmation');
                this._playSE('se_display_card', 0.6); // 🔊 決定音
                this.selectedInsuranceCard = {
                    patient: selectedCardPatient,
                    type: insuranceType,
                    useMyna: false
                };
                this.insuranceVerified = true;
                
                // 🆕 チュートリアル通知
                console.log('[CheckScene] 🔍 DEBUG: calling completeStep(INSURANCE_CARD_CONFIRMED)');
                TutorialManager.getInstance(this.game).completeStep('INSURANCE_CARD_CONFIRMED');
                
                // 🆕 保険証確認完了時にコンボ加算
                const gameState = GameStateManager.getInstance(this.game);
                if (gameState) {
                    gameState.incrementCombo();
                }
                
                container.destroy();
                this.insuranceModal = null;
                
                if (this.selectedPatient) {
                    this._showRegisterInfo(this.selectedPatient);
                }
            });

            
            
            container.add([confirmBtn, confirmText]);
            
            // 🆕 チュートリアル登録
            TutorialManager.getInstance(this.game).registerButton('insurance_confirm_button', confirmBtn);
        }
        
        this.insuranceModal = container;
    }
    
    // ページインジケーター更新
    _updatePageIndicator() {
        if (this.pageIndicator && this.cardPatients) {
            this.pageIndicator.setText(`${this.currentCardIndex + 1} / ${this.cardPatients.length}`);
        }
    }
    
    // カード表示更新
    _updateCardDisplay(insuranceType, parentContainer) {
        // カードコンテナが存在しない場合は何もしない
        if (!this.cardDisplayContainer) return;

        // 既存のカードをクリア（destroy時にエラーが出ないようにtry-catch）
        try {
            this.cardDisplayContainer.removeAll(true);
        } catch (e) {
            console.warn('Error clearing card container:', e);
            // 失敗した場合はコンテナ自体を作り直す
            this.cardDisplayContainer.destroy();
            this.cardDisplayContainer = this.add.container(0, 20);
            parentContainer.add(this.cardDisplayContainer);
        }
        
        // 患者データがある場合のみ描画
        if (this.cardPatients && this.cardPatients.length > 0) {
            const patient = this.cardPatients[this.currentCardIndex];
            if (patient) {
                this._drawInsuranceCardInModal(patient, insuranceType, this.cardDisplayContainer);
            }
        }
        
        this._updatePageIndicator();
    }
    

    // ==========================================================
    // 📇 紙保険証カード描画（モーダル内）- ユーザー指定レイアウト移植版
    // ==========================================================
    _drawInsuranceCardInModal(patient, insuranceType, parentContainer) {
        const width = 600;
        const height = 380;
        
        // --- 1. 色と保険者情報の決定 ---
        let cardColor = 0x3498DB; // 社保(青)
        let insurerName = '全国健康保険協会';    
        let workplaceName = '株式会社XXXXX';     
        
        const details = patient.insuranceDetails || {};
        
        // データの補完と正規化
        // データがない場合はXXXで置き換える
        const symbol = details['記号'] || 'XXXX';
        const number = details['番号'] || 'XXXX';
        const branch = details['枝番'] || '00';
        
        // ログによると '負担割合' というキーが入っているが、コードは '負担' を探していた
        const burdenVal = details['負担'] || details['負担割合'] || '3割';

        // 保険種別判定
        if (insuranceType.includes('国保')) {
            cardColor = 0xE74C3C; 
            insurerName = 'XXXX市';
            workplaceName = 'XXXX市'; 
        } 
        else if (insuranceType.includes('後期')) {
            cardColor = 0x9B59B6; 
            insurerName = 'XX県後期高齢者医療広域連合';
            workplaceName = ''; 
        } 
        else {
            cardColor = 0x3498DB; 
            if (details['会社名']) workplaceName = details['会社名'];
        }

        // --- 2. カード背景 ---
        const bg = this.add.graphics();
        bg.fillStyle(cardColor, 1); 
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        // ヘッダー帯
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0xFFFFFF, 0.4);
        headerBg.fillRect(-width/2, -height/2 + 15, width, 50); 

        parentContainer.add([bg, headerBg]);

        // --- 3. スタイル ---
        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, color: '#333333', fontSize: '18px' }; 
        const valueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '24px', stroke: '#000000', strokeThickness: 1 };
        const footerLabelStyle = { fontFamily: fontBase, color: '#333333', fontSize: '15px' };
        const footerValueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '19px', stroke: '#000000', strokeThickness: 1 };
        const titleStyle = { fontFamily: fontBase, color: '#000000', fontSize: '32px', stroke: '#000000', strokeThickness: 1 };

        // タイトル
        const title = this.add.text(0, -height/2 + 40, '健康保険被保険者証', titleStyle).setOrigin(0.5);
        parentContainer.add(title);

        // --- 4. データ配置 ---
        const baseX = -width/2 + 30; 
        let currentY = -90;          
        const lineHeight = 48; // 行間

        // --- 1行目: 記号・番号・枝番 ---
        parentContainer.add(this.add.text(baseX, currentY, '記号', labelStyle));
        parentContainer.add(this.add.text(baseX + 50, currentY - 4, symbol, valueStyle));
        
        const numX = baseX + 180; 
        parentContainer.add(this.add.text(numX, currentY, '番号', labelStyle));
        parentContainer.add(this.add.text(numX + 50, currentY - 4, number, valueStyle));

        const branchX = numX + 220;
        parentContainer.add(this.add.text(branchX, currentY, '枝番', labelStyle));
        parentContainer.add(this.add.text(branchX + 50, currentY - 4, branch, valueStyle));

        // --- 2行目: 氏名 ---
        currentY += lineHeight;
        const kanaVal = details['フリガナ'] || details['カナ'] || 'XXXX XXXX';
        parentContainer.add(this.add.text(baseX + 80, currentY - 18, kanaVal, { ...labelStyle, fontSize: '13px' })); 

        parentContainer.add(this.add.text(baseX, currentY, '氏名', labelStyle));
        parentContainer.add(this.add.text(baseX + 80, currentY - 6, details['氏名'] || patient.name, { ...valueStyle, fontSize: '30px' }));

        // --- 3行目: 生年月日・性別 ---
        currentY += lineHeight;
        
        const dob = details['生年月日'] || 'XXXX/XX/XX';
        const age = details['年齢'] || '??歳'; 
        
        parentContainer.add(this.add.text(baseX, currentY, '生年月日', labelStyle));
        parentContainer.add(this.add.text(baseX + 100, currentY - 4, `${dob} (${age})`, valueStyle));

        let genderStr = details['性別'] || 'X';
        
        // 性別位置
        parentContainer.add(this.add.text(branchX, currentY, '性別', labelStyle));
        parentContainer.add(this.add.text(branchX + 50, currentY - 4, genderStr, valueStyle));

        // --- 4行目: 負担割合 (性別の下に追加) ---
        currentY += lineHeight;
        
        parentContainer.add(this.add.text(branchX, currentY, '割合', labelStyle)); 
        parentContainer.add(this.add.text(branchX + 50, currentY - 4, burdenVal, valueStyle));


        // --- フッターエリア ---
        const footerStartY = 60; // ユーザー指定: 60
        const footerLineH = 35;  

        // 1. 保険者番号
        let fY = footerStartY;
        parentContainer.add(this.add.text(baseX, fY, '保険者番号', footerLabelStyle));
        parentContainer.add(this.add.text(baseX + 110, fY - 2, details['保険者番号'] || 'XXXXXXXX', footerValueStyle));
        
        // 2. 保険者名称
        fY += footerLineH;
        parentContainer.add(this.add.text(baseX, fY, '保険者名称', footerLabelStyle));
        parentContainer.add(this.add.text(baseX + 110, fY - 2, insurerName, footerValueStyle));

        // 3. 事業所名称 (Optional)
        if (workplaceName) {
            fY += footerLineH;
            parentContainer.add(this.add.text(baseX, fY, '事業所名称', footerLabelStyle));
            parentContainer.add(this.add.text(baseX + 110, fY - 2, workplaceName, footerValueStyle));
        }

        // --- 印鑑 ---
        const stampX = (width / 2) - 80; 
        const stampY = (height / 2) - 50; 

        const stampMark = this.add.circle(stampX, stampY, 22).setStrokeStyle(3, 0xFF0000);
        const stampChar = this.add.text(stampX, stampY, '印', { fontSize: '20px', color: '#FF0000', fontFamily: fontBase }).setOrigin(0.5);
        parentContainer.add([stampMark, stampChar]);
    }

    
    // ==========================================================
    // 💳 マイナンバーカード選択
    // ==========================================================
    _selectMynaCard() {
        if (!this.selectedPatient) {
            // 患者未選択時はアラート
            const alert = this.add.text(960, 540, '先に患者さんを選んでください', {
                fontSize: '24px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFFFFF',
                backgroundColor: '#E74C3C',
                padding: { x: 30, y: 15 }
            }).setOrigin(0.5).setDepth(3000);
            
            this.time.delayedCall(2000, () => alert.destroy());
            return;
        }
        
        // マイナカード選択として記録
        this.selectedInsuranceCard = {
            patient: this.selectedPatient,
            type: 'マイナ',
            useMyna: true
        };
        this.insuranceVerified = true;
        
        // 確認演出
        const confirm = this.add.text(960, 540, '💳 マイナンバーカードで確認', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            backgroundColor: '#7E57C2',
            padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setDepth(3000);
        
        this.tweens.add({
            targets: confirm,
            scale: { from: 0.5, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
                this.time.delayedCall(1500, () => {
                    confirm.destroy();
                    // 照合エリアを更新
                    this._showRegisterInfo(this.selectedPatient);
                });
            }
        });
    }

    // ==========================================================
    // 💡 ホバーエフェクト
    // ==========================================================
    _addHoverEffect(gameObject) {
        const hoverColor = '#ADD8E6';
        const defaultColor = gameObject.style?.backgroundColor || '#FFFFFF';

        gameObject.on('pointerover', () => {
            gameObject.setBackgroundColor(hoverColor);
            gameObject.setScale(1.05);
        });

        gameObject.on('pointerout', () => {
            if (!gameObject.getData('selected')) {
                gameObject.setBackgroundColor(defaultColor);
            }
            gameObject.setScale(1.0);
        });
    }

    // ==========================================================
    // 🏥 [共通] リッチヘッダー作成メソッド（共通コンポーネント使用）
    // ==========================================================
    _createHeader(x, y, text, baseColor, iconChar) {
        return UIHeader.create(this, { x, y, text, color: baseColor, icon: iconChar });
    }



    // ==========================================================
    // ナビゲーションボタン（受付・カルテ棚）
    // ==========================================================
    _createBackButton() {
        const btnWidth = 230;
        const btnHeight = 55;
        const btnX = 140;
        
        // --- 受付へ戻るボタン ---
        const toReceptionBtn = NavigationButton.create(this, {
            x: btnX,
            y: 920,
            label: '受付へ',
            icon: '🏥',
            colorScheme: 'blue',
            width: btnWidth,
            height: btnHeight,
            arrowDirection: 'left',
            onClick: () => {
                console.log('受付画面へ戻る');
                this.slideToScene('ReceptionScene', 'right');
            }
        });
        toReceptionBtn.setDepth(10);
        
        // --- 受付待ち人数バッジ（プレミアムコンポーネント）---
        this.receptionWaitingBadge = NotificationBadge.create(this, {
            x: btnX + btnWidth/2 - 5,
            y: 920 - btnHeight/2 - 5,
            colorScheme: 'red',
            depth: 15
        });
        
        // 定期的にバッジを更新
        this.time.addEvent({
            delay: 2000,
            callback: () => this._updateReceptionWaitingBadge(),
            loop: true
        });
        this._updateReceptionWaitingBadge();

        // --- カルテ棚へ移動ボタン ---
        const toShelfBtn = NavigationButton.create(this, {
            x: btnX,
            y: 990,
            label: 'カルテ棚へ',
            icon: '🗄️',
            colorScheme: 'brown',
            width: btnWidth,
            height: btnHeight,
            arrowDirection: 'left',
            onClick: () => {
                console.log('カルテ棚へ移動');
                const dataPayload = {
                    parent: this,
                    queue: this.accountingQueue,
                    currentPatient: this.selectedPatient || null,
                    completedIds: []
                };
                this.sleepAndRunScene('ShelfScene', dataPayload, 'up');
            }
        });
        toShelfBtn.setDepth(10);
    }
    
    /**
     * 受付待ち人数バッジを更新
     */
    _updateReceptionWaitingBadge() {
        if (!this.receptionWaitingBadge || !this.receptionWaitingBadge.updateCount) return;
        
        const receptionScene = this.scene.get('ReceptionScene');
        if (receptionScene && receptionScene.patientManager && receptionScene.patientManager.patientQueue) {
            const queue = receptionScene.patientManager.patientQueue;
            // 未処理の患者数をカウント
            const waitingCount = queue.filter(p => !p.isFinished).length;
            this.receptionWaitingBadge.updateCount(waitingCount);
        } else {
            this.receptionWaitingBadge.setVisible(false);
        }
    }

    // ==========================================================
    // 💊 薬一覧表示ボタン
    // ==========================================================
    _createMedicineListButton() {
        const btnX = 1800;
        const btnY = 1020;
        
        // ボタンコンテナ
        const btnContainer = this.add.container(btnX, btnY).setDepth(10);
        
        // ドロップシャドウ（浮遊感）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-75, -25 + 5, 150, 50, 16);
        
        // グラデーション背景（紫→インディゴ）
        const bgGradient = this.add.graphics();
        bgGradient.fillGradientStyle(0x9B59B6, 0x9B59B6, 0x3F51B5, 0x3F51B5, 1);
        bgGradient.fillRoundedRect(-75, -25, 150, 50, 16);
        
        // 白い縁取り
        bgGradient.lineStyle(3, 0xFFFFFF, 0.8);
        bgGradient.strokeRoundedRect(-75, -25, 150, 50, 16);
        
        // 光沢ハイライト
        const shine = this.add.graphics();
        shine.fillStyle(0xFFFFFF, 0.2);
        shine.fillRoundedRect(-70, -22, 140, 20, { tl: 12, tr: 12, bl: 4, br: 4 });
        
        // アイコンとテキスト
        const icon = this.add.text(-50, 0, '📖', { fontSize: '28px' }).setOrigin(0.5);
        const label = this.add.text(15, 0, '薬辞典', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5);
        
        btnContainer.add([shadow, bgGradient, shine, icon, label]);
        
        // インタラクティブ領域
        const hitArea = this.add.rectangle(btnX, btnY, 150, 50)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.001)
            .setDepth(11);
            
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('medicine_list_button', hitArea);
        
        // ホバーアニメーション（浮き上がり）
        hitArea.on('pointerover', () => {
            this.tweens.add({
                targets: btnContainer,
                y: btnY - 8,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 150,
                ease: 'Power2'
            });
        });
        
        hitArea.on('pointerout', () => {
            this.tweens.add({
                targets: btnContainer,
                y: btnY,
                scaleX: 1,
                scaleY: 1,
                duration: 150,
                ease: 'Power2'
            });
        });
        
        hitArea.on('pointerdown', () => {
            this._playSE('se_paper', 0.5);
            this._showMedicineListPanel();
        });
    }

    // ==========================================================
    // 💊 薬一覧パネル表示（コンポーネント使用）
    // ==========================================================
    _showMedicineListPanel() {
        // 既存のパネルがあれば閉じる
        if (this.medicineListPanel) {
            this.medicineListPanel.destroy();
            this.medicineListPanel = null;
            return;
        }
        
        // 🆕 コンポーネントを使用して薬辞典を表示
        // 🆕 コンポーネントを使用して薬辞典を表示
        this.medicineListPanel = MedicineDictionary.show(this, {
            medicineData: this.medicineData || [],
            chineseMedicineData: this.chineseMedicineData || [],
            x: this.cameras.main.width - 350,
            y: this.cameras.main.height / 2,
            onClose: () => {
                this.medicineListPanel = null;
                // 🆕 チュートリアル通知
                TutorialManager.getInstance(this.game).completeStep('MEDICINE_DICTIONARY_CLOSED');
            }
        });
        
        // 🆕 チュートリアル: 閉じるボタンを登録
        if (this.medicineListPanel && this.medicineListPanel.closeBtnBg) {
            TutorialManager.getInstance(this.game).registerButton('medicine_dict_close_button', this.medicineListPanel.closeBtnBg);
        }
        
        // 🆕 チュートリアル通知
        TutorialManager.getInstance(this.game).completeStep('MEDICINE_DICTIONARY_OPENED');
    }


    // ==========================================================
    // テスト用ダミー患者追加
    // ==========================================================
    _addTestPatients() {
        // 既にキューにデータがある場合は追加しない（重複防止）
        if (this.accountingQueue.length > 0) {
            this._updateWaitingList();
            return;
        }
        
        // triage_dataからランダムに選んでテスト患者を作成
        const testTriageData = this.triageData.slice(0, 3);
        const testInsuranceData = this.insuranceCardData.slice(0, 3);
        
        testTriageData.forEach((triage, i) => {
            if (!testInsuranceData[i]) return;
            
            const insurance = testInsuranceData[i];
            const patient = {
                name: insurance['氏名'] || `テスト患者${i + 1}`,
                insuranceDetails: insurance,
                triageData: triage,
                hasRegistrationCard: Math.random() > 0.5, // 50%で再診
                receptionNumber: 100 + i,
                insuranceType: insurance['保険種別'] || '社保'
            };
            
            this.accountingQueue.push(patient);
            // 🚨 修正: マイナンバー患者でない場合のみ保険証を追加
            if (patient.insuranceType !== 'myNumber') {
                this.completedInsuranceCards.push(insurance);
            }
        });
        
        this._updateWaitingList();
    }

    // ==========================================================
    // 新しい患者をチェック（ReceptionSceneからのデータ連携）
    // ==========================================================
    _checkForNewPatients() {
        // ReceptionSceneから完了患者を取得
        const receptionScene = this.scene.get('ReceptionScene');
        if (receptionScene && receptionScene.completedForAccountingQueue) {
            const newPatients = receptionScene.completedForAccountingQueue;
            if (newPatients.length > 0) {
                newPatients.forEach(p => {
                    // 🐛 DEBUG: 患者データの詳細をログ出力
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    console.log('[DEBUG] 新規患者追加:', p.name);
                    console.log('[DEBUG] insuranceType:', p.insuranceType);
                    console.log('[DEBUG] hasRegistrationCard (再診):', p.hasRegistrationCard);
                    console.log('[DEBUG] isNewPatient (新患 = Bルート):', p.isNewPatient);
                    console.log('[DEBUG] receptionNumber:', p.receptionNumber);
                    console.log('[DEBUG] insuranceDetails:', JSON.stringify(p.insuranceDetails, null, 2));
                    console.log('[DEBUG] triageData:', JSON.stringify(p.triageData, null, 2));
                    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
                    
                    this.accountingQueue.push(p);
                    // 🚨 修正: マイナンバー患者の場合は保険証を預かっていないので追加しない
                    if (p.insuranceDetails && p.insuranceType !== 'myNumber') {
                        this.completedInsuranceCards.push(p.insuranceDetails);
                    }
                });
                receptionScene.completedForAccountingQueue = [];
                
                // 🗄️ Registry に保存（シーン切り替え対応）
                this.registry.set('checkSceneAccountingQueue', this.accountingQueue);
                
                // 🎤 処方箋チェック患者到着時のボイスを再生
                this._playPrescriptionCheckVoice();
                
                this._updateWaitingList();
                
                // 🔔 通知バッジを更新
                this._updateNavButtonBadge();
            } else {
                this._checkGameCompletion();
            }
        } else {
             this._checkGameCompletion();
        }
    }
    
    // ==========================================================
    // 🔔 通知バッジ更新（ReceptionScene のバッジを更新）
    // ==========================================================
    _updateNavButtonBadge() {
        const receptionScene = this.scene.get('ReceptionScene');
        if (receptionScene && receptionScene._updatePrescriptionBadge) {
            receptionScene._updatePrescriptionBadge();
        }
    }

    // ==========================================================
    // 会計待ちリスト更新（新UIスタイル）
    // ==========================================================
    _updateWaitingList() {
        if (!this.waitingListContainer) return;
        
        // 🚨 修正: Registry から最新のキューを再読み込み（PaymentScene で削除された患者を反映）
        const savedQueue = this.registry.get('checkSceneAccountingQueue');
        if (savedQueue && Array.isArray(savedQueue)) {
            this.accountingQueue = savedQueue;
        }
        
        // ノーマルモード: 受付番号で昇順ソート（若い番号が先）
        this.accountingQueue.sort((a, b) => {
            return (a.receptionNumber || 0) - (b.receptionNumber || 0);
        });
        
        // 既存のリストをクリア
        this.waitingListContainer.removeAll(true);
        
        this.accountingQueue.forEach((patient, index) => {
            const itemY = index * 80;
            
            // カード型のボタン
            const card = this.add.container(100, itemY + 30);
            
            const cardBg = this.add.rectangle(0, 0, 210, 65, 0xFFFFFF)
                .setStrokeStyle(3, 0x2196F3)
                .setInteractive({ useHandCursor: true });
            
            // 番号アイコン（受付番号を表示）
            const numBg = this.add.circle(-75, 0, 22, 0x2196F3);
            const receptionNum = patient.receptionNumber || (index + 1);
            const numText = this.add.text(-75, 0, `${receptionNum}`, {
                fontSize: '16px',
                fontFamily: '\"Noto Sans JP\", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5);
            
            // 名前
            const nameText = this.add.text(15, 0, patient.name || '???', {
                fontSize: '16px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#333333',
                wordWrap: { width: 110 }
            }).setOrigin(0.5);
            
            card.add([cardBg, numBg, numText, nameText]);
            
            // ホバー効果
            cardBg.on('pointerover', () => {
                cardBg.setFillStyle(0xE3F2FD);
                card.setScale(1.05);
            });
            cardBg.on('pointerout', () => {
                if (this.selectedPatient !== patient) {
                    cardBg.setFillStyle(0xFFFFFF);
                }
                card.setScale(1.0);
            });
            
            // 選択時
            cardBg.on('pointerdown', () => {
                this._playSE('se_paper', { volume: 0.6 });
                // 全カードの選択状態をリセット
                this.waitingListContainer.each(c => {
                    if (c.list && c.list[0]) {
                        c.list[0].setFillStyle(0xFFFFFF);
                        c.list[0].setStrokeStyle(3, 0x2196F3);
                    }
                });
                // このカードを選択状態に
                cardBg.setFillStyle(0xFFC107);
                cardBg.setStrokeStyle(3, 0xFFA000);
                
                this._selectPatient(patient);
            });
            
            this.waitingListContainer.add(card);
            
            // 🆕 チュートリアル: 患者ボタンを登録
            // 常にリストの全項目を登録しておく（indexが変わるため）
            TutorialManager.getInstance(this.game).registerButton(`patient_item_${index}`, cardBg);
        });
    }



    // ゲーム終了判定（すべての患者対応完了ボーナス）
    _checkGameCompletion() {
        if (this.accountingQueue.length === 0 && this.completedInsuranceCards.length === 0) {
            const receptionScene = this.scene.get('ReceptionScene');
            
            // 受付で全ての患者が完了しているかチェック
            let allPatientsFinished = false;
            if (receptionScene && receptionScene.patientManager && receptionScene.patientManager.patientQueue) {
                const queue = receptionScene.patientManager.patientQueue;
                allPatientsFinished = queue.length > 0 && queue.every(p => p.isFinished);
            }
            
            // 受付・会計ともに完了していて、まだボーナスを付与していない場合
            if (allPatientsFinished && !this.allCompletedBonusGiven) {
                this.allCompletedBonusGiven = true;
                
                // +100pt ボーナス付与
                const currentScore = this.registry.get('score') || 0;
                this.registry.set('score', currentScore + 100);
                
                // HUD に通知
                const hud = this.scene.get('HUDScene');
                if (hud && hud.showScoreNotification) {
                    hud.showScoreNotification('🎉 すべての患者に対応しました！', ['+100pt'], '#FFD700');
                }
                
                // SE 再生
                this._playSE('se_finish', { volume: 0.8 });
                
                console.log('[CheckScene] 全患者対応完了ボーナス +100pt 付与');
                
                // リザルトへ遷移（チュートリアルモードでない場合のみ）
                const isTutorial = this.registry.get('isTutorialMode');
                if (!isTutorial) {
                    const finalScore = this.registry.get('score') || 0;
                    this.time.delayedCall(3000, () => {
                        this.scene.start('ResultScene', { score: finalScore });
                    });
                }
                // チュートリアルモードの場合はTutorialManagerが遷移を制御
            }
        }
    }

    // ==========================================================
    // 患者選択
    // ==========================================================
    _selectPatient(patient) {
        // 🐛 DEBUG: 選択された患者データをログ出力
        console.log('🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷');
        console.log('[DEBUG] 患者選択:', patient.name);
        console.log('[DEBUG] insuranceType:', patient.insuranceType, '(myNumber = マイナ, paper = 紙保険証)');
        console.log('[DEBUG] hasRegistrationCard:', patient.hasRegistrationCard, '(true = 再診, false = 新患)');
        console.log('[DEBUG] needsMedicalRecord:', patient.needsMedicalRecord, '(true = Aルート = カルテ必要, false = Bルート = カルテ不要)');
        console.log('[DEBUG] isNewPatient:', patient.isNewPatient, '(true = 新患)');
        console.log('🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷🔷');
        
        // 🆕 チュートリアル: 患者選択完了
        TutorialManager.getInstance(this.game).completeStep('PATIENT_SELECTED_IN_CHECK');
        
        this.selectedPatient = patient;
        this.currentPatient = patient;
        this.accountingPhase = 'prescription';
        
        // 🚨 修正: 患者切り替え時に保険証状態をリセット（初期値: マイナかつ未確認状態）
        this.insuranceVerified = false;
        this.insuranceTabMode = undefined;
        this.reservationChecked = false; // 🆕 予約状態リセット
        
        // 🚨 修正: この患者のスコアログをHUDに復元
        const hud = this.scene.get('HUDScene');
        if (hud && hud.restoreCurrentPatientLog) {
            if (patient.scoreHistory) {
                console.log(`[CheckScene] 患者 ${patient.name} のスコアログを復元します`, patient.scoreHistory);
                hud.restoreCurrentPatientLog(patient.scoreHistory);
            } else {
                console.log(`[CheckScene] 患者 ${patient.name} のスコアログはありません (リセット)`);
                hud.resetCurrentPatientLog();
            }
        }
        
        if (this.noPatientText) {
            this.noPatientText.setVisible(false);
        }
        
        this.prescriptionErrors = [];
        this.foundErrors = [];
        this.stampPressed = false;
        this.prescriptionCheckCompleted = false;
        
        // 🚨 修正: 患者切り替え時にスコア適用履歴をリセット
        this.appliedScoreReasons = new Set();
        
        // 🚨 修正: 従来の prescriptionItems リセットは削除
        // 処方箋データは患者オブジェクトに保存されるため、ここでのリセットは不要
        // this.prescriptionItems = null; // 削除
        
        // 進捗バー更新
        this._updateProgress('karte');
        
        // 新UI: 中央にカルテと処方箋を表示
        this._showPatientDocuments(patient);
        
        // 新UI: レジに金額情報を表示
        this._showRegisterInfo(patient);
    }
    
    // ==========================================================
    // 患者ドキュメント表示（カルテ・処方箋）
    // ==========================================================
    _showPatientDocuments(patient) {
        this._clearActiveUI();
        
        const docX = 550;
        const docY = 600;
        const docContainer = this.add.container(docX, docY).setDepth(15);
        
        // 🔄 Aルート/Bルートで表示を切り替え
        if (patient.needsMedicalRecord) {
            // 🅰️ Aルート: カルテを表示
            this._drawKarteInContainer(patient, docContainer);
        } else {
            // 🅱️ Bルート: 受付票を表示
            this._drawReceptionSlipInContainer(patient, docContainer);
        }
        
        // ドキュメントにドラッグ機能を追加（オフセット方式）
        const hitArea = this.add.rectangle(0, 0, 390, 540, 0x000000, 0)
            .setInteractive({ useHandCursor: true, draggable: true });
        docContainer.add(hitArea);
        docContainer.sendToBack(hitArea);
        
        // ドラッグオフセット
        let dragOffsetX = 0;
        let dragOffsetY = 0;
        
        hitArea.on('dragstart', (pointer) => {
            dragOffsetX = pointer.x - docContainer.x;
            dragOffsetY = pointer.y - docContainer.y;
            docContainer.setDepth(100);
        });
        
        hitArea.on('drag', (pointer) => {
            docContainer.x = pointer.x - dragOffsetX;
            docContainer.y = pointer.y - dragOffsetY;
        });
        
        hitArea.on('dragend', () => docContainer.setDepth(15));
        
        this.activeUI.push(docContainer);
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('prescription_panel', docContainer);
        
        // 処方箋・領収書タブエリアを表示
        this._createDocumentTabArea(patient, 1020, 600); // 🆕 少し右へ (950->970)
        
        // 🚨 修正: アクションパネル（印鑑・再印刷ボタン）を表示
        this._createActionPanel(patient, 1350, 650);
    }


    // ==========================================================
    // 🅱️ Bルート: 受付票描画（ReceptionScene形式）
    // ==========================================================
    // ==========================================================
    // 🅱️ Bルート: 受付票描画（ReceptionScene形式）
    // ==========================================================
    _drawReceptionSlipInContainer(patient, container) {
        // 薬データをキャッシュから取得
        const medicineData = this.cache.json.get('medicineData') || [];
        const chineseMedicineData = this.cache.json.get('chineseMedicineData') || [];
        
        // 予約必須キーワード (PaymentSceneと同じ)
        const reservationTargetKeywords = ['癌', 'がん', 'ガン', '高血圧', '糖尿病', '高コレステロール', '高脂血症'];

        // 🆕 受付票コンポーネントを使用
        // コンテナの(0, 0)を中心に配置
        const slip = ReceptionSlip.create(this, patient, {
            x: 0,
            y: 0,
            width: 450, // ReceptionSceneに合わせて450
            medicineData: medicineData,
            chineseMedicineData: chineseMedicineData,
            reservationTargetKeywords: reservationTargetKeywords,
            reservationTargetKeywords: reservationTargetKeywords,
            showTitle: true,
            showFooter: false // 🆕 完了ボタンは表示しない
        });
        
        container.add(slip);
    }

    _drawKarteInContainer(patient, container) {
        // A4アスペクト比 (210:297 = 1:1.414) - 少し大きめに
        const paperWidth = 360;
        const paperHeight = Math.round(paperWidth * 1.414); // 509
        const width = paperWidth + 30;
        const height = paperHeight + 30;
        
        // バインダー背景
        const details = patient.insuranceDetails || {};
        const insuranceType = details['保険種別'] || '社保';
        let binderColor = 0x3498DB;
        if (insuranceType.includes('国保')) binderColor = 0xE74C3C;
        else if (insuranceType.includes('後期')) binderColor = 0x9B59B6;
        
        const binder = this.add.rectangle(0, 0, width, height, binderColor)
            .setStrokeStyle(4, 0x333333);
        container.add(binder);
        
        // 紙
        const paper = this.add.rectangle(0, 0, paperWidth, paperHeight, 0xFFFFFF)
            .setStrokeStyle(1, 0xCCCCCC);
        container.add(paper);
        
        // ヘッダー
        const topY = -paperHeight/2 + 25;
        container.add(this.add.text(-paperWidth/2 + 10, topY, '様式第一号（一）の２', {
            fontSize: '10px', color: '#333', fontFamily: 'Serif'
        }));
        container.add(this.add.text(0, topY + 20, '診療録 (Medical Record)', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#000'
        }).setOrigin(0.5));
        
        // 患者情報枠
        // 患者情報枠
        const infoY = topY + 60;
        container.add(this.add.rectangle(0, infoY, paperWidth - 30, 35, 0xFFFFFF)
            .setStrokeStyle(1, 0x000000));

        // 🆔 ID決定ロジック
        let displayId = details['ID'] || '';
        if (patient.isNewPatient && patient.typedId) {
            displayId = patient.typedId;
        }
        
        // フォールバック: IDがない場合はランダムな5桁の数字を表示（キャッシュして固定）
        if (!displayId || displayId === '-----') {
            if (!patient._generatedRandomId) {
                patient._generatedRandomId = Phaser.Math.Between(10000, 99999).toString();
            }
            displayId = patient._generatedRandomId;
        }

        container.add(this.add.text(-paperWidth/2 + 20, infoY, `ID: ${displayId}   氏名: ${patient.name}`, {
            fontSize: '13px', fontFamily: '"Noto Sans JP", sans-serif', color: '#000'
        }).setOrigin(0, 0.5));
        
        // 中心線
        const centerLineY1 = infoY + 25;
        const centerLineY2 = paperHeight/2 - 30;
        container.add(this.add.line(0, 0, 0, centerLineY1, 0, centerLineY2, 0xCCCCCC).setOrigin(0));
        
        // 左側レイアウト
        const leftX = -paperWidth/4;
        const rightX = paperWidth/4;
        const contentStartY = infoY + 50;
        const labelStyle = { fontSize: '13px', color: '#333', fontFamily: '"Noto Sans JP", sans-serif' };
        
        // --- 日付印（済） ---
        container.add(this.add.text(leftX, contentStartY, '【日付】', labelStyle).setOrigin(0.5));
        const dateStamp = this.add.text(leftX, contentStartY + 40, '20XX年\nXX月XX日', {
            fontSize: '11px', color: '#E74C3C', align: 'center', fontFamily: 'Serif'
        }).setOrigin(0.5).setRotation(-0.1);
        container.add(dateStamp);
        
        // 日付印の枠
        container.add(this.add.rectangle(leftX, contentStartY + 40, 70, 50, 0xFFFFFF, 0)
            .setStrokeStyle(2, 0xE74C3C));
        
        // --- 処方薬 （偽商品名に変換）---
        const rxY = contentStartY + 100;
        const triage = patient.triageData || {};
        const rawPrescription = triage['処方薬'] || '';
        const prescriptionDays = triage['処方日数'] || '';
        
        container.add(this.add.text(leftX, rxY, '【処方薬】', { ...labelStyle, color: '#2E7D32' }).setOrigin(0.5));
        
        // 処方薬をカルテ形式（シモムラ〇〇）に変換
        let rxText = '(処方なし)';
        if (rawPrescription) {
            const drugs = rawPrescription.split(' / ');
            const days = prescriptionDays.split(' / ');
            
            // 🆕 各薬ごとに日数を表示（例：「フラキット (7日)」）
            const fakeNames = drugs.map((drug, index) => {
                const fakeName = this._convertToKarteFormat(drug.trim());
                const dayInfo = days[index] ? days[index].trim() : '';
                // 日数がある場合は括弧で追加
                return dayInfo && dayInfo !== '0日' ? `${fakeName} (${dayInfo})` : fakeName;
            });
            rxText = fakeNames.join('\n');
        }
        
        container.add(this.add.text(leftX, rxY + 50, rxText, {
            fontSize: '14px', color: '#000', align: 'center',
            fontFamily: '"Noto Sans JP", sans-serif',
            wordWrap: { width: 150 }
        }).setOrigin(0.5));
        
        // --- 右側: 保険確認（済） ---
        container.add(this.add.text(rightX, contentStartY, '【保険確認】', labelStyle).setOrigin(0.5));
        
        // 保険証/マイナ選択（済） - patient.insuranceType を使用
        // insuranceType が 'myNumber' ならマイナ、それ以外は保険証
        const isMyNumber = patient.insuranceType === 'myNumber';
        console.log('[DEBUG カルテ描画] patient.insuranceType:', patient.insuranceType, '→ isMyNumber:', isMyNumber);
        
        container.add(this.add.text(rightX, contentStartY + 25, '保険証', {
            fontSize: '14px', color: '#000'
        }).setOrigin(0.5));
        container.add(this.add.text(rightX, contentStartY + 50, 'マイナ', {
            fontSize: '14px', color: '#000'
        }).setOrigin(0.5));
        
        // 選択済みの丸（マイナなら下、保険証なら上）
        const selectedY = isMyNumber ? contentStartY + 50 : contentStartY + 25;
        const circleMark = this.add.graphics();
        circleMark.lineStyle(2, 0xFF0000, 1);
        circleMark.strokeEllipse(rightX, selectedY, 90, 25);
        container.add(circleMark);
        
        // --- 右側: 検尿印（済） ---
        const urineY = contentStartY + 90;
        container.add(this.add.text(rightX, urineY, '【検査実施】', labelStyle).setOrigin(0.5));
        
        const needsUrine = triage['検尿'] === '必要';
        if (needsUrine) {
            container.add(this.add.rectangle(rightX, urineY + 40, 55, 45, 0xFFFFFF, 0)
                .setStrokeStyle(2, 0xF39C12));
            container.add(this.add.text(rightX, urineY + 40, '検尿\n済', {
                fontSize: '14px', color: '#F39C12', align: 'center', fontFamily: 'Serif'
            }).setOrigin(0.5).setRotation(0.05));
        } else {
            container.add(this.add.text(rightX, urineY + 40, '(検尿なし)', {
                fontSize: '12px', color: '#999', align: 'center'
            }).setOrigin(0.5));
        }
    }



    // ==========================================================
    // 領収書データ計算
    // ==========================================================
    _calculateReceiptData(patient) {
        const triage = patient.triageData || {};
        const insurance = patient.insuranceDetails || {};
        
        const visitLabel = patient.hasRegistrationCard ? '再診料' : '初診料';
        const visitPoints = patient.hasRegistrationCard ? 73 : 288;
        
        const injection = parseInt(triage['注射']) || 0;
        const treatment = parseInt(triage['処置']) || 0;
        const anesthesia = parseInt(triage['麻酔']) || 0;
        const examination = parseInt(triage['検査']) || 0;
        const imaging = parseInt(triage['画像診断']) || 0;
        const medication = parseInt(triage['投薬']) || 0;
        const selfPay = parseInt(triage['自費']) || 0;
        
        const totalPoints = visitPoints + injection + treatment + anesthesia + examination + imaging + medication;
        const totalAmount = totalPoints * 10;
        const burden = insurance['負担'] || '3割';
        let burdenRate = 0.3;
        
        if (typeof burden === 'string') {
            if (burden.includes('割')) {
                burdenRate = parseFloat(burden) / 10;
            } else if (burden.includes('%')) {
                burdenRate = parseFloat(burden) / 100;
            } else {
                const val = parseFloat(burden);
                burdenRate = val >= 1 ? val / 10 : val;
            }
        } else if (typeof burden === 'number') {
             burdenRate = burden >= 1 ? burden / 10 : burden; 
        }
        
        const patientPay = Math.floor(totalAmount * burdenRate);
        
        this.receiptData = {
            visitLabel, visitPoints,
            injection, treatment, anesthesia, examination, imaging, selfPay,
            totalPoints, totalAmount, patientPay, burdenRate,
            defaultBurdenRate: burdenRate
        };
        
        console.log('[DEBUG] _calculateReceiptData:', JSON.stringify(this.receiptData));
    }

    // ==========================================================
    // 💊 処方箋描画（B5サイズ + ドラッグ可能）
    // ==========================================================

    // ==========================================================
    // 📇 保険証カード表示 (共通コンポーネント使用)
    // ==========================================================
    _createInsuranceCardDisplay(patient, x, y) {
        // 共通コンポーネントを使用（コンパクトモード）
        const container = InsuranceCardDisplay.create(this, patient, {
            x: x,
            y: y,
            compact: true,
            showStamp: false,
            showFooter: false,
            depth: 10
        });
        
        this.activeUI.push(container);
        return container;
    }

    // ==========================================================
    // カルテ作成（偽商品名表示）
    // ==========================================================
    _createKarte(patient, x, y) {
        const width = 350;
        const height = 500;
        const container = this.add.container(x, y).setDepth(10);
        
        // 背景
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFF0, 1);
        bg.lineStyle(3, 0x8B4513, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        container.add(bg);
        
        // ヘッダー
        const header = this.add.text(0, -height/2 + 30, '📋 カルテ', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#8B4513'
        }).setOrigin(0.5);
        container.add(header);
        
        // 患者情報
        const insurance = patient.insuranceDetails || {};
        const patientInfo = this.add.text(-width/2 + 20, -height/2 + 70, 
            `氏名: ${patient.name}\n` +
            `年齢: ${insurance['年齢'] || '??'}歳\n` +
            `保険: ${insurance['保険種別'] || '不明'}`, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            lineSpacing: 10
        }).setOrigin(0, 0);
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('check_karte_patient_info', patientInfo);
        
        container.add(patientInfo);
        
        // 処方内容（偽商品名に変換）
        const triage = patient.triageData || {};
        const prescriptionText = this._formatKartePrescription(triage);
        
        const prescriptionInfo = this.add.text(-width/2 + 20, -height/2 + 180,
            `【処方内容】\n${prescriptionText}`, {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#000000',
            lineSpacing: 6,
            wordWrap: { width: width - 40 }
        });
        container.add(prescriptionInfo);
        
        this.activeUI.push(container);
        return container;
    }

    // ==========================================================
    // カルテ用処方内容フォーマット（シモムラ〇〇形式に変換）
    // ==========================================================
    _formatKartePrescription(triage) {
        const prescriptionStr = triage['処方薬'] || '';
        const daysStr = triage['処方日数'] || '';
        
        if (!prescriptionStr) return '処方なし';
        
        const drugs = prescriptionStr.split(' / ');
        const days = daysStr.split(' / ');
        
        const lines = drugs.map((drug, i) => {
            // カルテ用: シモムラ〇〇形式を使用
            const karteName = this._convertToKarteFormat(drug.trim());
            const dayInfo = days[i] || '';
            const medicineInfo = this._getMedicineInfo(drug.trim());
            const dosage = medicineInfo ? medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '' : '';
            const timing = medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '' : '';
            
            return `・${karteName}\n  ${dosage} / ${dayInfo} / ${timing}`;
        });
        
        return lines.join('\n');
    }

    // ==========================================================
    // 薬関連ユーティリティ（MedicineUtils使用）
    // ==========================================================
    _convertToFakeName(realName) {
        return MedicineUtils.convertToFakeName(realName, this.medicineData, this.chineseMedicineData);
    }

    _getMedicineInfo(realName) {
        return MedicineUtils.getMedicineInfo(realName, this.medicineData, this.chineseMedicineData);
    }

    _getFakeGeneralName(realName) {
        return MedicineUtils.convertToFakeGeneralName(realName, this.medicineData, this.chineseMedicineData);
    }

    _convertToKarteFormat(realName) {
        return MedicineUtils.convertToKarteFormat(realName, this.medicineData, this.chineseMedicineData);
    }

    // ==========================================================
    // 処方箋作成（偽一般名表示 + エラー混入）
    // ==========================================================
    // ==========================================================
    // 📖 ドキュメントタブエリア（処方箋・領収書切り替え）
    // ==========================================================
    _createDocumentTabArea(patient, x, y) {
        // 全てを包括するメインコンテナ（タブ＋処方箋/領収書）
        const mainContainer = this.add.container(x, y).setDepth(15);
        
        const docWidth = 380;
        const docHeight = 550;
        
        // --- タブボタン ---
        const tabW = 120;
        const tabH = 40;
        const tabY = -docHeight/2 - 25; // コンテンツの上
        
        // 処方箋タブ（アクティブ：黒）
        const rxTabBg = this.add.rectangle(-tabW/2 - 5, tabY, tabW, tabH, 0x1A1A1A)
            .setStrokeStyle(2, 0x1A1A1A)
            .setInteractive({ useHandCursor: true });
        const rxTabText = this.add.text(-tabW/2 - 5, tabY, '処方箋', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', fontStyle: 'bold', color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 領収書タブ（非アクティブ：グレー）
        const receiptTabBg = this.add.rectangle(tabW/2 + 5, tabY, tabW, tabH, 0xF5F5F5)
            .setStrokeStyle(1, 0xCCCCCC)
            .setInteractive({ useHandCursor: true });
        const receiptTabText = this.add.text(tabW/2 + 5, tabY, '領収書', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', fontStyle: 'bold', color: '#666666'
        }).setOrigin(0.5);
        
        mainContainer.add([rxTabBg, rxTabText, receiptTabBg, receiptTabText]);
        
        // --- 処方箋コンテンツ（mainContainer内に直接描画） ---
        const rxContent = this._drawPrescriptionContent(patient, docWidth, docHeight);
        mainContainer.add(rxContent);
        
        // --- 領収書コンテンツ（非表示で作成） ---
        const receiptContent = this._drawReceiptContent(patient, docWidth, docHeight);
        receiptContent.setVisible(false);
        mainContainer.add(receiptContent);
        
        // Store references for tab switching
        this.documentTabContent = {
            rxContent: rxContent,
            receiptContent: receiptContent,
            rxTab: { bg: rxTabBg, text: rxTabText },
            receiptTab: { bg: receiptTabBg, text: receiptTabText }
        };
        
        // タブ切り替えイベント
        rxTabBg.on('pointerdown', () => this._switchDocumentTab('rx'));
        receiptTabBg.on('pointerdown', () => this._switchDocumentTab('receipt'));
        
        // 🆕 チュートリアル: 領収証タブをボタンとして登録
        TutorialManager.getInstance(this.game).registerButton('receipt_tab', receiptTabBg);
        
        // --- ドラッグ機能（コンテナ全体） ---
        const dragHitArea = this.add.rectangle(0, 0, docWidth, docHeight, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        this.input.setDraggable(dragHitArea);
        mainContainer.add(dragHitArea);
        mainContainer.sendToBack(dragHitArea);
        
        let dragOffX = 0;
        let dragOffY = 0;
        
        dragHitArea.on('dragstart', (pointer) => {
            dragOffX = pointer.x - mainContainer.x;
            dragOffY = pointer.y - mainContainer.y;
            mainContainer.setDepth(100);
        });
        
        dragHitArea.on('drag', (pointer) => {
            mainContainer.x = pointer.x - dragOffX;
            mainContainer.y = pointer.y - dragOffY;
        });
        
        dragHitArea.on('dragend', () => {
            mainContainer.setDepth(15);
        });
        
        this.activeUI.push(mainContainer);
        this.prescriptionContainer = mainContainer;
    }
    
    // 処方箋の中身を描画（コンテナを返す）- PaymentSceneと同一書式
    _drawPrescriptionContent(patient, width, height) {
        const content = this.add.container(0, 0);
        const triageData = patient.triageData || {};
        const details = patient.insuranceDetails || {};
        
        // 背景（PaymentSceneと統一：白ベース）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.fillRect(-width/2, -height/2, width, height);
        bg.strokeRect(-width/2, -height/2, width, height);
        content.add(bg);
        
        let y = -height/2 + 25;
        const leftX = -width/2 + 15;
        const rightX = width/2 - 15;
        
        // 処方箋ヘッダー
        content.add(this.add.text(0, y, '処 方 箋', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1B5E20'
        }).setOrigin(0.5));
        y += 45;
        
        // 患者情報
        content.add(this.add.text(leftX, y,
            `保険者番号: ${details['保険者番号'] || 'XXXXXXXX'}\n` +
            `氏名: ${patient.name}\n` +
            `年齢: ${details['年齢'] || '??'}歳`, {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            lineSpacing: 4
        }));
        y += 65;
        
        // 医療機関コード
        content.add(this.add.text(leftX, y,
            `都道府県番号: XX  点数表番号: X\n医療機関コード: XXXXXXX`, {
            fontSize: '12px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#666666'
        }));
        y += 50;
        
        // 区切り線
        content.add(this.add.rectangle(0, y, width - 40, 2, 0x2E7D32));
        y += 15;
        
        // 処方内容ヘッダー
        content.add(this.add.text(leftX, y, '【処方内容】', {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1B5E20'
        }));
        y += 30;
        
        // 処方薬リスト（偶一般名で表示・エラー混入あり）
        const triageForItems = triageData;
        
        // 🐛 DEBUG: 処方箋生成プロセスを追跡
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('[DEBUG _drawPrescriptionContent] 患者名:', patient.name);
        
        // 🚨 修正: 処方箋データを患者オブジェクトにキャッシュ（再クリックで再生成しない）
        // 🆕 チュートリアル患者1はエラーが必要なので、エラーがなければ再生成
        // 注意: startPracticeTutorial は ReceptionScene で false にリセットされるため、患者IDで判定
        const isTutorialPatient = patient.id && patient.id.startsWith('tutorial_patient');
        const isPatient1 = patient.id === 'tutorial_patient_1';
        const needsRegenForTutorial = isTutorialPatient && isPatient1 && 
            (!patient._cachedPrescriptionErrors || patient._cachedPrescriptionErrors.length === 0);
        
        if (!patient._cachedPrescriptionItems || patient._cachedPrescriptionItems.length === 0 || needsRegenForTutorial) {
            console.log('[DEBUG] 処方箋アイテムを新規生成します...');
            if (needsRegenForTutorial) {
                console.log('[DEBUG] チュートリアル患者1: エラー混入のため強制再生成');
            }
            patient._cachedPrescriptionItems = this._generatePrescriptionItems(triageForItems);
            // 🆕 エラー情報もキャッシュに保存
            patient._cachedPrescriptionErrors = [...this.prescriptionErrors];
            console.log('[DEBUG] 生成完了。アイテム数:', patient._cachedPrescriptionItems ? patient._cachedPrescriptionItems.length : 0);
            console.log('[DEBUG] エラー数:', patient._cachedPrescriptionErrors.length);
        } else {
            console.log('[DEBUG] ✅ キャッシュ済みの処方箋アイテムを再利用します');
            // 🆕 キャッシュからエラー情報も復元
            if (patient._cachedPrescriptionErrors && patient._cachedPrescriptionErrors.length > 0) {
                this.prescriptionErrors = [...patient._cachedPrescriptionErrors];
                console.log('[DEBUG] エラー情報を復元:', this.prescriptionErrors.length, '件');
            }
        }
        
        // キャッシュをローカル変数にコピー（後方互換性のため）
        this.prescriptionItems = patient._cachedPrescriptionItems;
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        if (this.prescriptionItems && this.prescriptionItems.length > 0) {
            const itemWidth = width - 50;
            
            this.prescriptionItems.forEach((item, i) => {
                // 背景ボックス（クリック可能）
                const itemBg = this.add.rectangle(0, y + 25, itemWidth, 55, 0xFFFFFF, 0.8)
                    .setStrokeStyle(1, 0x2E7D32)
                    .setInteractive({ useHandCursor: true });
                content.add(itemBg);
                
                // 薬名（クリック可能）
                const nameText = this.add.text(leftX + 10, y + 8, `${item.generalName}`, {
                    fontSize: '14px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#000000'
                }).setInteractive({ useHandCursor: true });
                content.add(nameText);
                
                // 詳細テキスト（用量・日数・タイミング）
                const detailText = this.add.text(leftX + 10, y + 30, `${item.dosage} / ${item.days}日 / ${item.timing}`, {
                    fontSize: '13px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#666666'
                });
                content.add(detailText);
                
                // ホバーエフェクト（クリック可能であることを示す）
                const hoverHandler = () => {
                    if (!itemBg.getData('reported')) {
                        itemBg.setFillStyle(0xFFF9C4, 1); // 黄色っぽく
                        itemBg.setStrokeStyle(2, 0xFFA000);
                    }
                };
                const outHandler = () => {
                    if (!itemBg.getData('reported')) {
                        itemBg.setFillStyle(0xFFFFFF, 0.8);
                        itemBg.setStrokeStyle(1, 0x2E7D32);
                    }
                };
                
                itemBg.on('pointerover', hoverHandler);
                nameText.on('pointerover', hoverHandler);
                itemBg.on('pointerout', outHandler);
                nameText.on('pointerout', outHandler);
                
                // クリック時にエラー報告（正誤判定）
                const clickHandler = () => {
                    this._reportPrescriptionError(item, itemBg);
                };
                itemBg.on('pointerdown', clickHandler);
                nameText.on('pointerdown', clickHandler);
                
                y += 60;
            });
        } else {
            content.add(this.add.text(leftX + 10, y, '処方なし', {
                fontSize: '15px', color: '#888888'
            }));
            y += 30;
        }
        
        y += 15;
        
        // 区切り線
        content.add(this.add.rectangle(0, y, width - 40, 2, 0x2E7D32));
        y += 20;
        
        // 医療機関情報
        content.add(this.add.text(leftX, y, '【医療機関情報】', {
            fontSize: '14px', color: '#666666'
        }));
        y += 22;
        
        content.add(this.add.text(leftX, y, '首切クリニック', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        y += 22;
        
        content.add(this.add.text(leftX, y, '〒XXX-XXXX 東京都○○区○○町1-2-3', {
            fontSize: '11px', color: '#666666'
        }));
        y += 18;
        
        content.add(this.add.text(leftX, y, 'TEL: 03-XXXX-XXXX', {
            fontSize: '11px', color: '#666666'
        }));
        y += 25;
        
        // 発行日（左側に配置して印と被らないようにする）
        content.add(this.add.text(leftX, y, '発行日: 20XX年XX月XX日', {
            fontSize: '13px', color: '#333333'
        }));
        
        // 印鑑エリア
        this.stampArea = this.add.container(width/2 - 50, height/2 - 50);
        this._updateStampVisual();
        
        const stampHitArea = this.add.circle(0, 0, 30, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        stampHitArea.on('pointerdown', () => {
            if (!this.stampPressed) this._pressStamp();
        });
        this.stampArea.add(stampHitArea);
        content.add(this.stampArea);
        
        return content;
    }
    
    // 領収書の中身を描画（コンテナを返す）- PaymentScene書式に完全対応
    _drawReceiptContent(patient, width, height) {
        // 🚨 修正: 常に同じ患者のデータを使用するように再計算
        this._calculateReceiptData(patient);
        const data = this.receiptData;
        const details = patient.insuranceDetails || {};
        
        const content = this.add.container(0, 0);
        
        // 背景（PaymentSceneと統一：白ベース）
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.lineStyle(2, 0xE0E0E0, 1);
        bg.fillRect(-width/2, -height/2, width, height);
        bg.strokeRect(-width/2, -height/2, width, height);
        content.add(bg);
        
        // ヘッダー
        content.add(this.add.text(0, -height/2 + 20, '🧾 領収書', {
            fontSize: '20px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333'
        }).setOrigin(0.5));
        
        // 座標設定（PaymentSceneスタイルに合わせる）
        // パネル幅380px、中央原点なので -190 ~ +190
        let y = -height/2 + 50;
        const leftX = -width/2 + 15;      // ラベル（左端から15px）
        const valueX = 20;                 // 値表示（中央より少し右）
        const pointX = 30;                 // 点数（中央寄り）
        const priceX = width/2 - 15;       // 金額（右端から15px）
        const lineH = 22;
        
        // 患者情報
        const age = parseInt(details['年齢']) || 0;
        const insuranceType = details['保険種別'] || '社保'; // 🚨 修正: 年齢に関わらず実際の保険種別を表示
        const burdenRate = data.burdenRate || (age >= 70 ? 0.1 : 0.3);
        const copayRate = Math.round(burdenRate * 100);
        
        // 患者名
        content.add(this.add.text(leftX, y, '患者名:', { fontSize: '12px', color: '#666666' }));
        content.add(this.add.text(valueX, y, patient.name || '不明', { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }));
        y += lineH + 2;
        
        // 保険種別
        content.add(this.add.text(leftX, y, '保険種別:', { fontSize: '12px', color: '#666666' }));
        content.add(this.add.text(valueX, y, insuranceType, { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }));
        y += lineH + 2;
        
        // 負担割合
        content.add(this.add.text(leftX, y, '負担割合:', { fontSize: '12px', color: '#666666' }));
        content.add(this.add.text(valueX, y, `${copayRate}%`, { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }));
        y += lineH + 8;
        
        // 区切り線
        content.add(this.add.rectangle(0, y, width - 20, 2, 0xFFB300));
        y += 15;
        
        // 明細ヘッダー
        content.add(this.add.text(leftX, y, '【医療費明細】', { fontSize: '12px', color: '#666666', fontFamily: '"Noto Sans JP", sans-serif' }));
        content.add(this.add.text(pointX, y, '点数', { fontSize: '10px', color: '#888888' }));
        content.add(this.add.text(priceX, y, '金額', { fontSize: '10px', color: '#888888' }).setOrigin(1, 0));
        y += lineH;
        
        // 各費目（0点含む全て表示）
        const items = [
            { label: data.visitLabel || '初診・再診料:', points: data.visitPoints || 0 },
            { label: '投薬料:', points: data.medication || 0 },
            { label: '注射料:', points: data.injection || 0 },
            { label: '処置料:', points: data.treatment || 0 },
            { label: '検査料:', points: data.examination || 0 },
            { label: '画像診断:', points: data.imaging || 0 }
        ];
        
        items.forEach(item => {
            const fee = item.points * 10;
            content.add(this.add.text(leftX, y, item.label, { fontSize: '12px', color: '#666666' }));
            content.add(this.add.text(pointX, y, `${item.points}点`, { fontSize: '12px', color: '#333333' }));
            content.add(this.add.text(priceX, y, `¥${fee.toLocaleString()}`, { fontSize: '12px', color: '#333333' }).setOrigin(1, 0));
            y += lineH;
        });
        
        y += 5;
        
        // 区切り線
        content.add(this.add.rectangle(0, y, width - 20, 2, 0xFFB300));
        y += 15;
        
        // 合計
        content.add(this.add.text(leftX, y, '合計:', { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }));
        content.add(this.add.text(pointX, y, `${data.totalPoints}点`, { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }));
        content.add(this.add.text(priceX, y, `¥${data.totalAmount.toLocaleString()}`, { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' }).setOrigin(1, 0));
        y += 30;
        
        // 患者負担額（緑のバナー）
        const pay = data.patientPay + (data.selfPay || 0);
        content.add(this.add.rectangle(0, y + 18, width - 20, 50, 0x4CAF50));
        content.add(this.add.text(0, y + 6, `お支払い金額（${copayRate}%負担）`, { fontSize: '10px', color: '#000000ff' }).setOrigin(0.5));
        content.add(this.add.text(0, y + 26, `¥${pay.toLocaleString()}`, { fontSize: '22px', fontFamily: '"Noto Sans JP", sans-serif', color: '#000000ff' }).setOrigin(0.5));
        
        return content;
    }
    
    _switchDocumentTab(tabKey) {
        const c = this.documentTabContent;
        if (!c) return;
        
        if (tabKey === 'rx') {
            if (c.rxContent) c.rxContent.setVisible(true);
            if (c.receiptContent) c.receiptContent.setVisible(false);
            
            // 処方箋タブ（アクティブ：黒）
            c.rxTab.bg.setFillStyle(0x1A1A1A);
            c.rxTab.bg.setStrokeStyle(2, 0x1A1A1A);
            c.rxTab.text.setColor('#FFFFFF');
            
            // 領収書タブ（非アクティブ：グレー）
            c.receiptTab.bg.setFillStyle(0xF5F5F5);
            c.receiptTab.bg.setStrokeStyle(1, 0xCCCCCC);
            c.receiptTab.text.setColor('#666666');
        } else {
            if (c.rxContent) c.rxContent.setVisible(false);
            if (c.receiptContent) c.receiptContent.setVisible(true);
            
            // 処方箋タブ（非アクティブ：グレー）
            c.rxTab.bg.setFillStyle(0xF5F5F5);
            c.rxTab.bg.setStrokeStyle(1, 0xCCCCCC);
            c.rxTab.text.setColor('#666666');
            
            // 領収書タブ（アクティブ：黒）
            c.receiptTab.bg.setFillStyle(0x1A1A1A);
            c.receiptTab.bg.setStrokeStyle(2, 0x1A1A1A);
            c.receiptTab.text.setColor('#FFFFFF');
            
            // 🆕 チュートリアル: 領収証タブクリック完了
            TutorialManager.getInstance(this.game).completeStep('RECEIPT_TAB_CLICKED');
        }
    }



    // ==========================================================
    // 処方箋アイテム生成（10%でエラー混入）
    // チュートリアル時: 患者1のみ1番目の薬にエラー、他はエラーなし
    // ==========================================================
    _generatePrescriptionItems(triage) {
        const prescriptionStr = triage['処方薬'] || '';
        const daysStr = triage['処方日数'] || '';
        
        if (!prescriptionStr) return [];
        
        const drugs = prescriptionStr.split(' / ');
        const days = daysStr.split(' / ');
        
        // 🆕 チュートリアルモード判定
        // 注意: startPracticeTutorial は ReceptionScene で false にリセットされるため、
        // 患者IDでチュートリアル判定を行う
        const currentPatientId = this.selectedPatient?.id || '';
        const isTutorialPatient = currentPatientId.startsWith('tutorial_patient');
        const isPatient1 = currentPatientId === 'tutorial_patient_1';
        
        // 🐛 DEBUG: チュートリアル判定をログ出力
        console.log('🔴🔴🔴 [_generatePrescriptionItems] チュートリアル判定:');
        console.log('  currentPatientId:', currentPatientId);
        console.log('  isTutorialPatient:', isTutorialPatient);
        console.log('  isPatient1:', isPatient1);
        console.log('  allMedicineData.length:', this.allMedicineData ? this.allMedicineData.length : 'undefined');
        
        return drugs.map((drug, i) => {
            const realName = drug.trim();
            const medicineInfo = this._getMedicineInfo(realName);
            const dayInfo = days[i] || '';
            
            let generalName = this._getFakeGeneralName(realName);
            let dosage = medicineInfo ? medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '1回分' : '1回分';
            let timing = medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '' : '';
            let daysVal = dayInfo;
            
            let hasError = false;
            let errorType = null;
            
            // 🆕 チュートリアル時のエラー制御（患者IDベース）
            if (isTutorialPatient) {
                console.log(`🔴 [薬 ${i}] チュートリアルモード有効、isPatient1=${isPatient1}`);
                // 患者1: 1番目の薬のみエラー混入（ただし再印刷後は正しい処方箋を表示）
                const hasReprinted = this.selectedPatient?._hasReprinted || false;
                if (isPatient1 && i === 0 && !hasReprinted) {
                    console.log('🔴🔴 [薬 0] 患者1の1番目の薬 - エラーを混入します');
                    hasError = true;
                    // 薬名エラー（別の薬の偽一般名に置き換え）
                    const originalFakeName = this._getFakeGeneralName(realName);
                    console.log('  originalFakeName:', originalFakeName);
                    
                    let randomMedicine;
                    let attempts = 0;
                    do {
                        randomMedicine = this.allMedicineData[Math.floor(Math.random() * this.allMedicineData.length)];
                        attempts++;
                    } while (randomMedicine && randomMedicine['偽一般名'] === originalFakeName && attempts < 10);
                    
                    console.log('  randomMedicine:', randomMedicine);
                    console.log('  randomMedicine[偽一般名]:', randomMedicine ? randomMedicine['偽一般名'] : 'undefined');
                    
                    if (randomMedicine && randomMedicine['偽一般名']) {
                        generalName = randomMedicine['偽一般名'];
                    } else {
                        // フォールバック: 固定のエラー名を使用
                        generalName = '【エラー薬】テストエラープリン';
                        console.log('  ⚠️ フォールバック: 固定エラー名を使用');
                    }
                    errorType = 'name';
                    
                    this.prescriptionErrors.push({
                        index: i,
                        type: errorType,
                        wrongValue: generalName,
                        correctValue: originalFakeName
                    });
                    
                    console.log('[CheckScene] チュートリアル: 患者1に処方箋エラーを混入', { originalFakeName, wrongName: generalName });
                }
                // 患者2,3: エラーなし（何もしない）
            } else {
                // 通常モード: 10%の確率でエラーを混入
                if (Math.random() < 0.1) {
                    hasError = true;
                    const errorChoice = Math.floor(Math.random() * 3);
                    
                    if (errorChoice === 0) {
                        // 薬名エラー（別の薬の偽一般名に置き換え）
                        const originalFakeName = this._getFakeGeneralName(realName);
                        let randomMedicine;
                        let attempts = 0;
                        // 🚨 修正: allMedicineDataが空の場合はエラー混入をスキップ
                        if (this.allMedicineData && this.allMedicineData.length > 0) {
                            do {
                                randomMedicine = this.allMedicineData[Math.floor(Math.random() * this.allMedicineData.length)];
                                attempts++;
                            } while (randomMedicine && randomMedicine['偽一般名'] === originalFakeName && attempts < 10);
                            
                            if (randomMedicine && randomMedicine['偽一般名']) {
                                generalName = randomMedicine['偽一般名'];
                                errorType = 'name';
                            } else {
                                // 偽一般名がない場合はエラー混入をスキップ
                                hasError = false;
                            }
                        } else {
                            // allMedicineDataがない場合はエラー混入をスキップ
                            hasError = false;
                        }
                    } else if (errorChoice === 1) {
                        // 日数エラー
                        const originalDays = parseInt(daysVal) || 14;
                        daysVal = `${originalDays + 7}日`;
                        errorType = 'days';
                    } else {
                        // 服用タイミングエラー
                        const wrongTimings = ['朝食後', '夕食後', '毎食後', '寝る前'];
                        timing = wrongTimings[Math.floor(Math.random() * wrongTimings.length)];
                        errorType = 'timing';
                    }
                    
                    this.prescriptionErrors.push({
                        index: i,
                        type: errorType,
                        wrongValue: errorType === 'name' ? generalName : (errorType === 'days' ? daysVal : timing),
                        correctValue: errorType === 'name' ? this._getFakeGeneralName(realName) : 
                                      (errorType === 'days' ? dayInfo : 
                                       (medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] : ''))
                    });
                }
            }
            
            return {
                generalName,
                dosage,
                days: daysVal,
                timing,
                hasError,
                errorType,
                index: i
            };
        });
    }

    // ==========================================
    // デバッグ用: チュートリアルスキップボタン
    // ==========================================
    _createDebugButtons() {
        // タイマーの下（Y=220付近）に配置
        const startX = 170;
        const startY = 220;
        const gapY = 40;
        
        const createBtn = (label, y, callback) => {
            const btn = this.add.rectangle(startX, y, 200, 30, 0x333333)
                .setStrokeStyle(2, 0xFFFFFF)
                .setInteractive({ useHandCursor: true });
            const text = this.add.text(startX, y, label, { fontSize: '14px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
            btn.on('pointerdown', () => {
                this._playSE('se_button_click', 0.5);
                callback();
            });
            btn.setDepth(10000);
            text.setDepth(10001);
            this.add.existing(btn);
            this.add.existing(text);
        };
        
        createBtn('Skip P1 (To P2)', startY, () => this._debugSkipPatient(1));
        createBtn('Skip P2 (To P3)', startY + gapY, () => this._debugSkipPatient(2));
        createBtn('Complete Tutorial', startY + gapY * 2, () => this._debugSkipPatient(9));
    }

    // ==========================================================
    // 処方箋アイテムUI作成
    // ==========================================================
    _createPrescriptionItem(item, x, y, width, index) {
        const container = this.add.container(x, y);
        
        const itemBg = this.add.rectangle(width/2, 25, width, 60, 0xFFFFFF, 0.8)
            .setStrokeStyle(1, 0x2E7D32)
            .setInteractive({ useHandCursor: true });
        
        const text = this.add.text(10, 10,
            `${item.generalName}\n${item.dosage} / ${item.days} / ${item.timing}`, {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#000000',
            lineSpacing: 4
        });
        
        container.add([itemBg, text]);
        
        // クリックでエラー報告
        itemBg.on('pointerdown', () => this._reportPrescriptionError(item, itemBg));
        
        // ホバー効果
        itemBg.on('pointerover', () => {
            itemBg.setFillStyle(0xFFEB3B, 0.5);
        });
        
        // 🆕 チュートリアル登録
        if (item.hasError) {
             TutorialManager.getInstance(this.game).registerButton('prescription_item_error', itemBg);
        } else {
             // 必要なら正解項目も登録可能
             // TutorialManager.getInstance(this.game).registerButton('prescription_item_' + index, itemBg);
        }
        itemBg.on('pointerout', () => {
            if (!itemBg.getData('reported')) {
                itemBg.setFillStyle(0xFFFFFF, 0.8);
            }
        });
        
        return container;
    }

    // ==========================================================
    // エラー報告
    // ==========================================================
    _reportPrescriptionError(item, itemBg) {
        if (itemBg.getData('reported')) return;
        
        if (item.hasError) {
            // 正解！エラーを発見
            this._playSE('se_memo', 0.8);
            // 🆕 チュートリアル: エラー報告完了
            TutorialManager.getInstance(this.game).completeStep('PRESCRIPTION_ERROR_REPORTED');
            itemBg.setData('reported', true);
            itemBg.setFillStyle(0x4CAF50, 0.8);
            this.foundErrors.push(item);
            
            this._showMessage('✅ エラー発見！処方箋を再印刷してください', '#00AA00');
            
            // スコア加算
            this._addScore(this.errorBonusPoints, '処方確認時: エラー発見ボーナス');
            
            // 🆕 コンボ加算
            const gameState = GameStateManager.getInstance(this.game);
            if (gameState) {
                gameState.incrementCombo();
            }

            // 再印刷ボタンを有効化（コンテナのalphaを戻す）
            if (this.reprintBtnContainer) {
                this.reprintBtnContainer.setAlpha(1);
            }
            if (this.reprintBtn) {
                this.reprintBtn.setInteractive({ useHandCursor: true });
            }
        } else {
            // 間違い！正しい項目をエラーとして報告
            itemBg.setFillStyle(0xF44336, 0.3);
            this._showMessage('❌ この項目は正しいです（-2点）', '#FF0000');
            
            // 正しい項目をエラー報告した場合のペナルティ
            this._addScore(this.falsePositivePenalty, '処方確認時: 正しい項目を誤報告');
            
            // 🆕 コンボリセット
            const gameState = GameStateManager.getInstance(this.game);
            if (gameState) {
                gameState.resetCombo();
                EventBus.emit(GameEvents.COMBO_BREAK, {});
            }

            this.time.delayedCall(1000, () => {
                itemBg.setFillStyle(0xFFFFFF, 0.8);
            });
        }
    }

    // ==========================================================
    // メッセージ表示
    // ==========================================================
    _showMessage(text, color) {
        const msg = this.add.text(960, 100, text, {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: color,
            backgroundColor: '#FFFFFF',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(100);
        
        this.tweens.add({
            targets: msg,
            alpha: 0,
            y: 50,
            duration: 2000,
            onComplete: () => msg.destroy()
        });
    }

    // ==========================================================
    // 💊 薬詳細ポップアップ（処方箋からクリック時）
    // ==========================================================
    _showMedicineDetailPopup(realName, medicineInfo) {
        // 既存のポップアップがあれば先に閉じる
        if (this.medicinePopup) {
            this.medicinePopup.destroy();
            this.medicinePopup = null;
        }
        
        const screenW = this.cameras.main.width;
        const screenH = this.cameras.main.height;
        const popupW = 450;
        const popupH = 280;
        
        const container = this.add.container(screenW / 2, screenH / 2).setDepth(3000);
        
        // 背景（高級感のあるグラデーション風）
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRoundedRect(-popupW/2 + 8, -popupH/2 + 8, popupW, popupH, 16);
        
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.fillRoundedRect(-popupW/2, -popupH/2, popupW, popupH, 16);
        bg.lineStyle(3, 0x3498DB, 1);
        bg.strokeRoundedRect(-popupW/2, -popupH/2, popupW, popupH, 16);
        
        // ヘッダー
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x3498DB, 1);
        headerBg.fillRoundedRect(-popupW/2, -popupH/2, popupW, 50, { tl: 16, tr: 16, bl: 0, br: 0 });
        
        const headerTitle = this.add.text(0, -popupH/2 + 25, '💊 薬剤情報', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        container.add([shadow, bg, headerBg, headerTitle]);
        
        // 閉じるボタン
        const closeBtn = this.add.text(popupW/2 - 25, -popupH/2 + 25, '✕', {
            fontSize: '20px', color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        closeBtn.on('pointerdown', () => {
            container.destroy();
            this.medicinePopup = null;
        });
        container.add(closeBtn);
        
        // 薬情報の表示
        let y = -popupH/2 + 75;
        const leftX = -popupW/2 + 25;
        const labelStyle = { fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#666666' };
        const valueStyle = { fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333' };
        
        if (medicineInfo) {
            const fakeName = medicineInfo['偽商品名'] || medicineInfo['商品名'] || realName;
            const fakeGeneral = medicineInfo['偽一般名'] || medicineInfo['一般名'] || '';
            const indication = medicineInfo['主な適応'] || '';
            const dosage = medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '';
            const timing = medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '';
            
            // 商品名
            container.add(this.add.text(leftX, y, '商品名:', labelStyle));
            container.add(this.add.text(leftX + 80, y, fakeName, { ...valueStyle, color: '#1565C0' }));
            y += 30;
            
            // 一般名
            container.add(this.add.text(leftX, y, '一般名:', labelStyle));
            container.add(this.add.text(leftX + 80, y, fakeGeneral, valueStyle));
            y += 30;
            
            // 適応
            if (indication) {
                container.add(this.add.text(leftX, y, '適応:', labelStyle));
                const indicationText = this.add.text(leftX + 80, y, indication, { 
                    ...valueStyle, 
                    wordWrap: { width: popupW - 130 },
                    fontSize: '14px'
                });
                container.add(indicationText);
                y += 35;
            }
            
            // 用量・タイミング
            container.add(this.add.text(leftX, y, '用量:', labelStyle));
            container.add(this.add.text(leftX + 80, y, dosage, valueStyle));
            y += 30;
            
            container.add(this.add.text(leftX, y, 'タイミング:', labelStyle));
            container.add(this.add.text(leftX + 80, y, timing, valueStyle));
        } else {
            container.add(this.add.text(0, 0, `${realName}\n\n薬情報が見つかりませんでした`, {
                ...valueStyle,
                align: 'center'
            }).setOrigin(0.5));
        }
        
        // アニメーション
        container.setScale(0.5).setAlpha(0);
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.Out'
        });
        
        // 3秒後に自動で閉じる
        this.time.delayedCall(2500, () => {
            if (container && container.active) {
                this.tweens.add({
                    targets: container,
                    alpha: 0,
                    scale: 0.8,
                    duration: 200,
                    onComplete: () => {
                        container.destroy();
                        this.medicinePopup = null;
                    }
                });
            }
        });
        
        this.medicinePopup = container;
    }

    // ==========================================================
    // アクションパネル作成（印鑑・再印刷ボタンのみ）
    // ==========================================================
    _createActionPanel(patient, x, y) {
        const container = this.add.container(x, y).setDepth(10);
        
        // ========================================
        // 🎨 共通カラースキーム（PaymentSceneと共有）
        // ========================================
        const BUTTON_COLORS = {
            stamp: { bg: 0xC62828, hover: 0xE53935, border: 0x8E0000, text: '#FFFFFF' },       // 赤系
            reprint: { bg: 0xFFFFFF, hover: 0xF5F5F5, border: 0x333333, text: '#000000' },    // 白背景・黒文字
            payment: { bg: 0xF9A825, hover: 0xFBC02D, border: 0xC17900, text: '#000000' }     // 黄系
        };
        
        // ========================================
        // 🆕 スタイリッシュボタン作成ヘルパー
        // ========================================
        const createStylishButton = (yOffset, label, colorKey, isEnabled = true) => {
            const btnWidth = 260;
            const btnHeight = 50;
            const btnContainer = this.add.container(0, yOffset);
            const colors = BUTTON_COLORS[colorKey];
            
            // メイン背景
            const bg = this.add.graphics();
            bg.fillStyle(colors.bg, 1);
            bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            bg.lineStyle(2, colors.border, 1);
            bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
            btnContainer.add(bg);
            
            // テキスト
            const text = this.add.text(0, btnHeight / 2, label, {
                fontSize: '20px',
                fontFamily: '"Noto Sans JP", sans-serif',
                fontStyle: 'bold',
                color: colors.text
            }).setOrigin(0.5);
            btnContainer.add(text);
            
            // インタラクティブ領域
            const hitArea = this.add.rectangle(0, btnHeight / 2, btnWidth, btnHeight, 0xFFFFFF, 0)
                .setInteractive({ useHandCursor: true });
            btnContainer.add(hitArea);
            
            // ホバー・クリックエフェクト
            hitArea.on('pointerover', () => {
                if (!hitArea.input.enabled) return;
                bg.clear();
                bg.fillStyle(colors.hover, 1);
                bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
                bg.lineStyle(2, colors.border, 1);
                bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
                this.tweens.add({
                    targets: btnContainer,
                    scaleX: 1.03,
                    scaleY: 1.03,
                    duration: 80,
                    ease: 'Quad.easeOut'
                });
            });
            
            hitArea.on('pointerout', () => {
                bg.clear();
                bg.fillStyle(colors.bg, 1);
                bg.fillRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
                bg.lineStyle(2, colors.border, 1);
                bg.strokeRoundedRect(-btnWidth/2, 0, btnWidth, btnHeight, 8);
                this.tweens.add({
                    targets: btnContainer,
                    scaleX: 1,
                    scaleY: 1,
                    duration: 80,
                    ease: 'Quad.easeOut'
                });
            });
            
            hitArea.on('pointerdown', () => {
                if (!hitArea.input.enabled) return;
                this.tweens.add({
                    targets: btnContainer,
                    scaleX: 0.97,
                    scaleY: 0.97,
                    duration: 40,
                    yoyo: true,
                    ease: 'Quad.easeInOut'
                });
            });
            
            // 無効状態の場合
            if (!isEnabled) {
                btnContainer.setAlpha(0.4);
                hitArea.disableInteractive();
            }
            
            return { container: btnContainer, hitArea, text, bg, colors };
        };
        
        // ========================================
        // ✍️ 印鑑押すボタン（赤）
        // ========================================
        const stampBtnData = createStylishButton(0, '✍️ 印を押す', 'stamp', true);
        stampBtnData.hitArea.on('pointerdown', () => this._pressStamp());
        container.add(stampBtnData.container);
        this.stampBtn = stampBtnData.hitArea;
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('stamp_button', stampBtnData.hitArea);
        
        // ========================================
        // 🔄 処方箋再印刷ボタン（青・初期無効）
        // ========================================
        const reprintBtnData = createStylishButton(65, '🔄 処方箋を再印刷', 'reprint', false);
        reprintBtnData.hitArea.on('pointerdown', () => this._reprintPrescription());
        container.add(reprintBtnData.container);
        this.reprintBtn = reprintBtnData.hitArea;
        this.reprintBtnContainer = reprintBtnData.container;
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('reprint_button', reprintBtnData.hitArea);
        
        this.activeUI.push(container);
        this.actionContainer = container;
    }

    // ==========================================================
    // 処方箋チェック完了（印鑑押下時に自動実行）
    // ==========================================================
    _completePrescriptionCheck() {
        // 既に完了している場合はスキップ
        if (this.prescriptionCheckCompleted) return;
        this.prescriptionCheckCompleted = true;
        
        // 見逃したエラーをチェック
        const missedErrors = this.prescriptionErrors.filter(err => 
            !this.foundErrors.find(f => f.index === err.index)
        );
        
        if (missedErrors.length > 0) {
            // ミスを見逃した場合: -30点 × 見逃し数 (個別ポイント)
            this._showMessage(`⚠️ ${missedErrors.length}件のエラーを見逃しました！（-${Math.abs(this.errorMissedPenalty) * missedErrors.length}点）`, '#FF6600');
            this._addScore(this.errorMissedPenalty * missedErrors.length, '処方確認時: エラー見逃し(' + missedErrors.length + '件)', false); // isGlobal = false
        } else if (this.prescriptionErrors.length > 0) {
            this._showMessage('🎉 すべてのエラーを発見しました！(+10pt)', '#00AA00');
            // 🚨 修正: エラー発見ボーナス (+10点 全体ポイント)
            this._addScore(this.errorBonusPoints, '処方確認時: 全エラー発見ボーナス', true); // isGlobal = true
        } else {
            this._showMessage('✅ 処方箋に問題はありませんでした', '#0066FF');
        }
    }

    // ==========================================================
    // 処方箋を再印刷（エラー発見後に新しい処方箋を生成）
    // ==========================================================
    _reprintPrescription() {
        if (!this.currentPatient) return;
        
        // 🆕 チュートリアル患者1の場合、再印刷フラグを設定（次回は正しい処方箋を生成）
        const isTutorialPatient1 = this.currentPatient.id === 'tutorial_patient_1';
        if (isTutorialPatient1) {
            this.currentPatient._hasReprinted = true;
            console.log('[CheckScene] チュートリアル患者1: 再印刷フラグを設定');
        }
        
        // 🚨 修正: 患者のキャッシュもクリア（新しい処方箋を生成するため）
        if (this.currentPatient._cachedPrescriptionItems) {
            delete this.currentPatient._cachedPrescriptionItems;
        }
        if (this.currentPatient._cachedPrescriptionErrors) {
            delete this.currentPatient._cachedPrescriptionErrors;
        }
        
        // 処方箋関連の状態をリセット
        this.prescriptionItems = [];
        this.prescriptionErrors = [];
        this.foundErrors = [];
        this.stampPressed = false;
        this.prescriptionCheckCompleted = false;
        
        // 再印刷ボタンを非表示
        if (this.reprintBtn) {
            this.reprintBtn.setAlpha(0.5);
            this.reprintBtn.disableInteractive();
        }
        
        // 印鑑表示をリセット
        this._updateStampVisual();
        
        // 金額入力ボタンを無効化
        if (this.proceedBtn) {
            this.proceedBtn.setAlpha(0.5);
            this.proceedBtn.disableInteractive();
        }
        
        // 処方箋コンテンツを再生成
        if (this.documentTabContent && this.documentTabContent.rxContent) {
            // 既存のコンテンツを削除
            this.documentTabContent.rxContent.destroy();
            
            // 新しい処方箋コンテンツを作成
            const docWidth = 380;
            const docHeight = 550;
            const newRxContent = this._drawPrescriptionContent(this.currentPatient, docWidth, docHeight);
            
            // コンテナに追加
            if (this.prescriptionContainer) {
                this.prescriptionContainer.add(newRxContent);
            }
            
            this.documentTabContent.rxContent = newRxContent;

            // 🖨️ 印刷アニメーション (Mask + Slide)
            
            // 1. SE再生
            this._playSE('se_printer_printing', { volume: 0.5 });

            // 2. マスクの作成 (表示エリアを限定)
            // コンテンツの親コンテナ(prescriptionContainer)の座標系に合わせる必要があるが、
            // Maskはワールド座標系で指定するか、GameObjectに関連付けるのが一般的。
            // ここではBitmapMaskではなくGeometryMaskを使用。
            
            // 親コンテナの位置を取得 (prescriptionContainerはシーン直下にある)
            const parentX = this.prescriptionContainer.x;
            const parentY = this.prescriptionContainer.y;
            
            // マスク用のRect (ワールド座標)
            const maskShape = this.make.graphics();
            maskShape.fillStyle(0xffffff);
            maskShape.fillRect(parentX - docWidth/2, parentY - docHeight/2, docWidth, docHeight);
            const mask = maskShape.createGeometryMask();
            
            // コンテンツにマスクを適用
            newRxContent.setMask(mask);
            
            // 3. 初期位置: 上に隠す (高さ分だけ上にずらす)
            // newRxContentはコンテナ(0,0)に追加されているので、ローカルyを操作
            const originalY = newRxContent.y;
            newRxContent.y = originalY - docHeight;
            newRxContent.alpha = 1; // 最初から表示状態だが、マスクの外にあるので見えない
            
            // 4. アニメーション: 上から下へスライド
            this.tweens.add({
                targets: newRxContent,
                y: originalY,
                duration: 2500, // SEの長さに合わせる
                ease: 'Linear', // 印刷機っぽい等速移動
                onStart: () => {
                    // プリンターヘッドのようなバーを表示しても良いが、シンプルに
                },
                onComplete: () => {
                   this._playSE('se_paper'); // 排出完了音
                   
                   // マスク解除 (不要なら残してもいいが、パフォーマンスと後々の表示崩れ防止のため)
                   newRxContent.clearMask();
                   maskShape.destroy();
                }
            });
        }
        
        this._showMessage('🔄 処方箋を再印刷しました', '#2196F3');
        
        // 🆕 チュートリアル: 再印刷完了
        TutorialManager.getInstance(this.game).completeStep('PRESCRIPTION_REPRINTED');
    }

    // ==========================================================
    // 印鑑押す
    // ==========================================================
    _pressStamp() {
        if (this.stampPressed) return;
        
        this.stampPressed = true;
        
        // 🆕 チュートリアル: 印鑑押下完了
        TutorialManager.getInstance(this.game).completeStep('STAMP_PRESSED');
        
        // 🔊 SE再生
        this._playSE('se_stamp', 0.8);
        
        // 🆕 印鑑押下時にコンボ加算
        const gameState = GameStateManager.getInstance(this.game);
        if (gameState) {
            gameState.incrementCombo();
        }
        
        // 印鑑表示を更新
        this._updateStampVisual();
        
        // 印鑑を押したら処方確認を完了とする
        this._completePrescriptionCheck();
        
        // 進捗バーを更新
        this._updateProgress('prescription');
        
        // 金額入力ボタンを有効化
        if (this.proceedBtn) {
            this.proceedBtn.setAlpha(1);
            this.proceedBtn.setInteractive({ useHandCursor: true });
            this._addHoverEffect(this.proceedBtn);
            this.proceedBtn.on('pointerdown', () => this._showPaymentPhase());
        }
    }

    // ==========================================================
    // 印鑑の見た目を更新
    // ==========================================================
    _updateStampVisual() {
        if (!this.stampArea) return;
        this.stampArea.removeAll(true);
        
        // インタラクティブエリア用 (透明)
        const hitArea = this.add.circle(0, 0, 30, 0x000000, 0);
        
        if (this.stampPressed) {
            // 押印済み
            const stampCircle = this.add.circle(0, 0, 30).setStrokeStyle(3, 0xFF0000);
            const stampText = this.add.text(0, 0, '首切', {
                fontSize: '14px', color: '#FF0000', fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            this.stampArea.add([hitArea, stampCircle, stampText]);
        } else {
            // 未押印
            const stampCircle = this.add.circle(0, 0, 30).setStrokeStyle(2, 0x999999, 0.5);
            const stampLabel = this.add.text(0, 0, '印', {
                fontSize: '20px', color: '#999999'
            }).setOrigin(0.5);
            this.stampArea.add([hitArea, stampCircle, stampLabel]);
        }
    }


    // // ==========================================================
    // // 📝 スコアログ表示
    // // ==========================================================
    // _showScoreLog(scoreLog) {
    //     if (!scoreLog || scoreLog.length === 0) return;
        
    //     const startX = 1550;
    //     const startY = 220;
        
    //     const container = this.add.container(startX, startY);
    //     container.setDepth(3100).setScrollFactor(0);
        
    //     // ヘッダー
    //     const header = this.add.text(0, 0, '📝 会計結果', {
    //         fontSize: '28px',
    //         color: '#00AA00',
    //         fontFamily: '"Noto Sans JP"',
    //         stroke: '#FFF',
    //         strokeThickness: 3
    //     }).setOrigin(0.5);
    //     container.add(header);
        
    //     let currentY = 40;
    //     let totalPoints = 0;
        
    //     // ログ一覧作成
    //     scoreLog.forEach(log => {
    //         const color = log.positive ? '#00FF00' : '#FF6666';
    //         const sign = log.positive ? '+' : '-';
    //         const text = this.add.text(0, currentY, `・${log.reason} (${sign}${Math.abs(log.points)})`, {
    //             fontSize: '20px',
    //             color: color,
    //             fontFamily: '"Noto Sans JP"',
    //             stroke: '#000',
    //             strokeThickness: 2
    //         }).setOrigin(0.5);
    //         container.add(text);
    //         currentY += 30;
    //         totalPoints += log.positive ? log.points : -log.points;
    //     });
        
    //     // 合計
    //     currentY += 10;
    //     const totalText = this.add.text(0, currentY, `合計: ${totalPoints > 0 ? '+' : ''}${totalPoints}pt`, {
    //         fontSize: '24px',
    //         color: totalPoints >= 0 ? '#FFFF00' : '#FF0000',
    //         fontFamily: '"Noto Sans JP"',
    //         stroke: '#000',
    //         strokeThickness: 3
    //     }).setOrigin(0.5);
    //     container.add(totalText);
    //     currentY += 35;
        
    //     // 背景ボード
    //     const bgHeight = currentY + 20;
    //     const bg = this.add.rectangle(0, bgHeight / 2 - 20, 350, bgHeight, 0x000000, 0.8)
    //         .setStrokeStyle(3, 0x00AA00);
    //     container.addAt(bg, 0);
        
    //     // アニメーション (スライドイン)
    //     container.x += 400;
    //     this.tweens.add({
    //         targets: container,
    //         x: startX,
    //         duration: 500,
    //         ease: 'Power2'
    //     });
        
    //     // 自動消滅
    //     this.time.delayedCall(3000, () => {
    //         this.tweens.add({
    //             targets: container,
    //             alpha: 0,
    //             x: startX + 100,
    //             duration: 500,
    //             onComplete: () => container.destroy()
    //         });
    //     });
    // }

    // ==========================================================
    // 保険証選択
    // ==========================================================
    _selectInsuranceCard(card) {
        if (!this.currentPatient) {
            this._showMessage('⚠️ 先に患者を選択してください', '#FF6600');
            return;
        }
        
        const patientInsurance = this.currentPatient.insuranceDetails || {};
        
        if (card['ID'] === patientInsurance['ID']) {
            this._showMessage('✅ 正しい保険証を選択しました', '#00AA00');
            this.selectedInsuranceCard = card;
        } else {
            this._showMessage('❌ 違う患者の保険証です', '#FF0000');
        }
    }

    // ==========================================================
    // スコア加算（重複防止機能付き）
    // ==========================================================
    // ==========================================================
    // スコア加算（重複防止機能付き）
    // ==========================================================
    _addScore(points, reason, isGlobal = false, allowDuplicate = false) {
        // 🚨 修正: 以前の引数シグネチャ (points, reason, allowDuplicate) に対応する場合、第3引数が boolean かチェック
        if (typeof isGlobal === 'boolean' && arguments.length === 3 && arguments[2] === true) {
             // arguments[2]がallowDuplicateとして渡された場合の互換性（念のため）
             // しかし新しい呼び出しは (points, reason, isGlobal) なので、ここでは標準的に実装
        }
        
        // isGlobal が allowDuplicate (boolean) として渡された場合のハンドリング
        // 既存コードで _addScore(p, r, true) と呼んでいる箇所があるかもしれないため要注意
        // 今回の変更では isGlobal を明示的に渡すようにする

        if (!allowDuplicate && this.appliedScoreReasons && this.appliedScoreReasons.has(reason)) {
            console.log(`[スコア重複スキップ] ${reason} は既に適用済み`);
            return;
        }
        
        // 適用済みとして記録
        if (this.appliedScoreReasons) {
            this.appliedScoreReasons.add(reason);
        }
        
        // HUDSceneにスコアを送信
        const hud = this.scene.get('HUDScene');
        if (hud && hud.addScore) {
            hud.addScore(points, reason, isGlobal);
        }
        console.log(`スコア: ${points > 0 ? '+' : ''}${points} (${reason}) [Global: ${isGlobal}]`);
    }

    // ==========================================================
    // アクティブUI削除
    // ==========================================================
    _clearActiveUI() {
        this.activeUI.forEach(ui => {
            if (ui && ui.destroy) {
                ui.destroy();
            }
        });
        this.activeUI = [];
    }
}

