
import { addTransitionMethods } from './TransitionManager.js';
import { ReceptionConfig } from './ReceptionConfig.js';
import { PatientManager } from './PatientManager.js';
import { ReceptionUIManager } from './ReceptionUIManager.js';
import { EventBus, GameEvents } from './EventBus.js';
import { InsuranceCardDisplay } from './components/InsuranceCardDisplay.js';
import { SoundManager } from './components/SoundManager.js';
import { UIUtils } from './components/UIUtils.js';
import { NavigationButton } from './components/NavigationButton.js';
import { UIHeader } from './components/UIHeader.js';
import { NotificationBadge } from './components/NotificationBadge.js';
import { GameStateManager } from './GameStateManager.js';  // 🆕 コンボ・タイムボーナス用
import { TutorialManager } from './components/TutorialManager.js'; // 🆕 チュートリアル用
import { TutorialPatients } from './components/TutorialData.js'; // 🆕 チュートリアル用固定データ
// We will restore the internal card rendering logic to match the backup exactly
// import { PatientCardRenderer } from './PatientCardRenderer.js'; 

const BTN_WIDTH = 550;
const BTN_HEIGHT = 65;
const BTN_GAP = 80;

export class ReceptionScene extends Phaser.Scene {
    constructor() {
        super('ReceptionScene');
        // Managers
        this.patientManager = null;
        this.uiManager = null;
        // this.cardRenderer = null;

        // State
        this.activePatientUI = []; 
        this.patientQueue = [];
        this.currentPatientIndex = 0;
        this.patientContainer = null;
        this.lastFinishedNumber = 0; // 🚨 修正: create()で初期会計患者数に基づき設定
        this.stepUI = [];
        this.isClickProcessing = false;
        this.isResultDisplaying = false;
        this.isPanelShowing = false;
        
        this.completedForAccountingQueue = [];
        this.delayedAccountingQueue = [];
        this.patientHistory = [];
        this.totalScore = 0;
        this.completedRecordIds = [];
    }

    preload() {
        this.load.image('receptionBg', 'assets/images/reception_background.png');
    }

    create() {
        // State Reset
        this.isClickProcessing = false;
        this.isResultDisplaying = false;
        this.isPanelShowing = false;
        this.activePatientUI = [];
        this.stepUI = [];
        this.completedForAccountingQueue = [];
        this.delayedAccountingQueue = [];
        this.completedRecordIds = [];
        this.patientHistory = [];
        this.totalScore = 0;

        addTransitionMethods(this);

        this.patientManager = new PatientManager(this);
        this.uiManager = new ReceptionUIManager(this);
        // this.cardRenderer = new PatientCardRenderer(this);

        // Background
        const bg = this.add.image(960, 540, 'receptionBg');
        bg.displayWidth = 1920;
        bg.displayHeight = 1080;

        // Header
        this.uiManager.createHeader('総合受付', '🏥');
        
        // 🆕 チュートリアルモード判定
        this.isTutorialMode = this.registry.get('startPracticeTutorial') || false;
        
        // 🆕 HUDSceneで参照できるようにregistryにもセット
        this.registry.set('isTutorialMode', this.isTutorialMode);
        
        // Data Generation
        if (this.isTutorialMode) {
            // チュートリアル用: 固定患者データを使用
            this.patientQueue = this._createTutorialPatients();
        } else {
            // 通常モード: ランダム生成
            this.patientQueue = this.patientManager.generateRandomPatients(ReceptionConfig.GAME.INITIAL_PATIENTS);
        }
        // Sync manager queue with local queue if needed, or just use manager's
        // For backup fidelity, we use the manager but keep local references if usage dictates
        
        // Render Patients
        this._renderPatientQueue();

        // Nav
        this._createNavigationButtons();
        // 🚨 修正: 初期会計患者数を設定（0人）
        const INITIAL_ACCOUNTING_PATIENTS = 0;
        this.lastFinishedNumber = INITIAL_ACCOUNTING_PATIENTS * 5; // 会計患者1人あたり5番進んでいる想定
        this._addInitialAccountingPatients(INITIAL_ACCOUNTING_PATIENTS);

        // HUD
        this.scene.run('HUDScene');
        this.time.delayedCall(100, () => this._updateHUD());
        
        this._playBGM('bgm_maou_game_town20', 0.3);

        this.events.on('wake', () => { 
            this._updateHUD(); 
            this._updatePrescriptionBadge();
            
            // 🆕 チュートリアルモード: カルテ棚から戻った際に問診が終わっていなければ強制完了
            if (this.isTutorialMode && this.patientManager && this.patientManager.patientQueue) {
                const tm = TutorialManager.getInstance(this.game);
                let hasQuestionnairePatient = false;
                let questionnaireAlreadyDone = true;
                
                this.patientManager.patientQueue.forEach(patient => {
                    if (patient.needsQuestionnaire) {
                        hasQuestionnairePatient = true;
                        if (!patient.questionnaireCompleted) {
                            console.log('[ReceptionScene] チュートリアル: 問診を強制完了', patient.name);
                            patient.questionnaireCompleted = true;
                            questionnaireAlreadyDone = false;
                        }
                    }
                });
                
                // 問診患者がいて、既に完了している場合はafter_shelfとwaitをスキップ
                if (hasQuestionnairePatient) {
                    // 現在のステップIDを確認
                    const currentStep = tm.getCurrentStep();
                    console.log('[ReceptionScene] 現在のステップ:', currentStep?.id);
                    
                    // after_shelfまたはquestionnaire_done_waitにいる場合、questionnaire_done_noticeまでスキップ
                    if (currentStep?.id === 'after_shelf' || currentStep?.id === 'questionnaire_done_wait') {
                        // questionnaire_done_noticeまでスキップ
                        this.time.delayedCall(100, () => {
                            while (tm.getCurrentStep()?.id !== 'questionnaire_done_notice' && tm.currentStepIndex < 100) {
                                tm.goToNextStep();
                            }
                        });
                    }
                }
                
                // 患者リストを更新
                this._renderPatientQueue();
            }
            
            // 🆕 チュートリアル: シーン復帰時にも通知
            this.time.delayedCall(300, () => {
                TutorialManager.getInstance(this.game).notifySceneReady('ReceptionScene');
                TutorialManager.getInstance(this.game).completeStep('RECEPTION_SCENE_ENTERED');
            });
        });
        this.events.on('resume', () => { this._updateHUD(); this._updatePrescriptionBadge(); });
        
        if (!window.delayedQueueInterval) {
            window.delayedQueueInterval = setInterval(() => {
                const scene = this.game.scene.getScene('ReceptionScene');
                if (scene && scene._processDelayedQueue) scene._processDelayedQueue();
            }, 1000);
        }
        
        // =========================================================
        // Scroll Arrows - プレミアムデザイン
        // =========================================================
        this.scrollLeftBtn = this._createPremiumScrollButton(80, 540, 'left', () => this._scrollLeft());
        this.scrollRightBtn = this._createPremiumScrollButton(1840, 540, 'right', () => this._scrollRight());
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('scroll_left', this.scrollLeftBtn);
        TutorialManager.getInstance(this.game).registerButton('scroll_right', this.scrollRightBtn);

        this._updateScrollArrows();
        
        this.input.keyboard.on('keydown-RIGHT', this._scrollRight, this);
        this.input.keyboard.on('keydown-LEFT', this._scrollLeft, this);
        
        // =========================================================
        // ノーマルモード: 時間経過で患者追加（30～70秒間隔）
        // =========================================================
        if (!this.isTutorialMode) {
            this._scheduleNextPatient();
        }
        
        // 🆕 チュートリアル：フラグがセットされている場合のみ開始
        this.time.delayedCall(500, () => {
            const tutorialManager = TutorialManager.getInstance(this.game);
            
            // TitleSceneからチュートリアルモードで開始した場合のみ起動
            if (this.registry.get('startPracticeTutorial')) {
                this.registry.set('startPracticeTutorial', false);
                tutorialManager.start();
            }
            
            tutorialManager.notifySceneReady('ReceptionScene');
        });
    }
    
    // =================================================================================================
    // 📚 チュートリアル用固定患者データ生成
    // =================================================================================================
    
    /**
     * チュートリアル用固定患者データを生成
     * TutorialData.jsはPatientManagerと同じ構造なのでそのまま使用
     */
    _createTutorialPatients() {
        // TutorialPatientsはPatientManagerと同じ構造なのでそのまま使用
        const patients = TutorialPatients.map((data, index) => ({
            ...data,
            // 追加の必須フィールド
            isFinished: false,
            image: `patient_${(index % 6) + 1}` // 画像キー
        }));
        
        // PatientManagerのキューにもセット
        this.patientManager.patientQueue = patients;
        
        console.log('[ReceptionScene] チュートリアル患者をセット:', patients.length, '人');
        
        return patients;
    }
    
    // =================================================================================================
    // ⏰ ノーマルモード: 時間経過で患者追加
    // =================================================================================================
    
    /**
     * 次の患者追加をスケジュール（30〜70秒後）
     */
    _scheduleNextPatient() {
        const delay = Phaser.Math.RND.integerInRange(30000, 70000); // 30〜70秒
        console.log(`[ReceptionScene] 次の患者追加まで ${Math.floor(delay/1000)} 秒`);
        
        this.time.delayedCall(delay, () => {
            this._addNewPatient();
            this._scheduleNextPatient(); // 次の患者をスケジュール
        });
    }
    
    /**
     * 新しい患者を動的に追加
     */
    _addNewPatient() {
        const newPatient = this.patientManager.generateSinglePatient();
        if (newPatient) {
            this.patientManager.patientQueue.push(newPatient);
            this._renderPatientQueue();
            this._updateHUD();
            this._updateScrollArrows();
            
            // 通知音を再生（どのシーンにいても聞こえるようにグローバル再生）
            const seVolume = this.registry.get('seVolume') ?? 0.8;
            try {
                this.sound.play('se_changesean', { volume: seVolume * 0.6 });
            } catch (e) {
                console.warn('[ReceptionScene] 通知音再生失敗:', e);
            }
            
            // HUDに通知（どのシーンにいても表示）
            const hud = this.scene.get('HUDScene');
            if (hud && hud.showScoreNotification) {
                hud.showScoreNotification(`👤 新しい患者が来院 (No.${newPatient.receptionNumber})`, [], '#3498DB');
            }
            
            console.log(`[ReceptionScene] 新しい患者が来院: ${newPatient.name} (受付番号: ${newPatient.receptionNumber})`);
        }
    }
    
    // =================================================================================================
    // 🎨 Rendering
    // =================================================================================================

    _renderPatientQueue() {
        if (this.patientContainer) this.patientContainer.destroy();
        this.patientContainer = this.add.container(0, 0);

        const C = ReceptionConfig.UI.PATIENT_AREA;
        const patients = this.patientManager.patientQueue;
        
        patients.forEach((data, index) => {
            const x = 300 + (index * 350); 
            const y = 380;
            this._createPatient(data, x, y);
        });
        
        this.currentPatientIndex = -1;
        
        // Initialize HUD with patient count
        this.time.delayedCall(100, () => this._updateHUD());
    }

    _createPatient(data, x, y) {
        // Image
        const gender = data.genderKey || 'man';
        const maxImageNum = (gender === 'man') ? 18 : 8;
        const key = data.imageKey || `${gender}${Phaser.Math.RND.integerInRange(1, maxImageNum)}`;
        data.imageKey = key; 

        const img = this.add.image(x, y + 50, key);
        const targetHeight = 400;
        const scale = targetHeight / img.height;
        img.setScale(scale);
        
        // Name Tag
        const tagContainer = this._createNameTag(x, y + 250, data.name, data.insuranceType);
        
        // Bell Icon
        const bellIcon = this.add.text(x, y - 150, '🔔', { fontSize: '60px' }).setOrigin(0.5).setVisible(false);
        if (data.questionnaireCompleted) {
             bellIcon.setVisible(true);
             this.tweens.add({ targets: bellIcon, angle: {from:-20, to:20}, duration: 300, yoyo: true, repeat: -1 });
        }
        data.bellIcon = bellIcon;

        // Container
        this.patientContainer.add([img, tagContainer, bellIcon]);

        // Links
        data.visuals = { image: img, nameTag: tagContainer, originalScale: scale };
        data.button = img; 
        data.nameTag = tagContainer;

        // Interaction
        img.setInteractive({ useHandCursor: true })
           .on('pointerdown', () => this._onPatientClick(data));
           
        // Hover
        img.on('pointerover', () => {
             if (!data.isFinished && !this.isPanelShowing) {
                 img.setScale(scale * 1.05);
                 bellIcon.setScale(1.05);
             }
        });
        img.on('pointerout', () => {
             img.setScale(scale);
             bellIcon.setScale(1.0);
        });

        // 🆕 チュートリアル用登録
        const patientIndex = this.patientManager.patientQueue.indexOf(data);
        if (patientIndex >= 0) {
            console.log(`[ReceptionScene] 🎯 患者ボタン登録: patient_${patientIndex} = ${data.name} (キュー長: ${this.patientManager.patientQueue.length})`);
            TutorialManager.getInstance(this.game).registerButton(`patient_${patientIndex}`, img);
        }
        // 問診票アイコン (bell)
        if (bellIcon) {
            TutorialManager.getInstance(this.game).registerButton('questionnaire_icon', bellIcon);
        }
    }

    _createNameTag(x, y, name, type) {
        const C = ReceptionConfig.UI.NAME_TAG;
        const container = this.add.container(x, y);
        
        const bg = this.add.graphics();
        bg.fillStyle(0xFFFFFF, 1);
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-C.WIDTH/2, -C.HEIGHT/2, C.WIDTH, C.HEIGHT, C.CORNER_RADIUS);
        bg.strokeRoundedRect(-C.WIDTH/2, -C.HEIGHT/2, C.WIDTH, C.HEIGHT, C.CORNER_RADIUS);

        const typeStr = (type === 'myNumber') ? '（マイナ）' : '（保険証）';
        const nameText = this.add.text(0, -15, name, {
            fontSize: '28px', color: '#000', fontFamily: ReceptionConfig.STYLES.FONT_FAMILY
        }).setOrigin(0.5);
        
        const subText = this.add.text(0, 25, typeStr, {
            fontSize: '22px', color: '#555', fontFamily: ReceptionConfig.STYLES.FONT_FAMILY
        }).setOrigin(0.5);

        container.add([bg, nameText, subText]);
        return container;
    }

    _createNavigationButtons() {
         const btnX = 1750;
         const btnWidth = 280;
         const btnHeight = 60;
         const btnSpacing = 80;
         
         // ============================================================
         // 📋 処方箋確認ボタン (NavigationButtonコンポーネント使用)
         // ============================================================
         const accBtnY = 920;
         
         this.toAccountingBtn = NavigationButton.create(this, {
             x: btnX,
             y: accBtnY,
             label: '処方箋確認へ',
             icon: '📋',
             colorScheme: 'purple',
             width: btnWidth,
             height: btnHeight,
             onClick: () => this.slideToScene('CheckScene', 'left', null, false)
         });
         this.toAccountingBtnBg = this.toAccountingBtn.hitArea;
         // 🆕 チュートリアル登録
         TutorialManager.getInstance(this.game).registerButton('check_button', this.toAccountingBtn);
         
         // ============================================================
         // 🗄️ カルテ棚ボタン (NavigationButtonコンポーネント使用)
         // ============================================================
         const shelfBtnY = accBtnY + btnSpacing;
         
         this.toShelfBtn = NavigationButton.create(this, {
             x: btnX,
             y: shelfBtnY,
             label: 'カルテ棚へ',
             icon: '🗄️',
             colorScheme: 'brown',
             width: btnWidth,
             height: btnHeight,
            onClick: () => {
                // 🆕 固定パネルを閉じる
                this._clearStepUI();
                TutorialManager.getInstance(this.game).completeStep('SHELF_SCENE_ENTERED');
                this.sleepAndRunScene('ShelfScene', { queue: this.patientManager.patientQueue }, 'up');
            }
         });
         this.toShelfBtnBg = this.toShelfBtn.hitArea;
         // 🆕 チュートリアル登録
         TutorialManager.getInstance(this.game).registerButton('shelf_button', this.toShelfBtn);

         this.prescriptionBadge = NotificationBadge.create(this, {
             x: btnX + btnWidth/2 - 5,
             y: accBtnY - btnHeight/2 - 5,
             colorScheme: 'red',
             depth: 11
         });
    }
    
    _addHoverEffect(obj) {
        const originalScale = obj.scaleX || 1;
        obj.on('pointerover', () => obj.setScale(originalScale * 1.05));
        obj.on('pointerout', () => obj.setScale(originalScale));
    }
    
    // プレミアムスクロールボタン（モダン・低彩度デザイン）
    _createPremiumScrollButton(x, y, direction, onClick) {
        const container = this.add.container(x, y);
        const size = 50;
        const isRight = direction === 'right';
        
        // 半透明の背景（ガラスモーフィズム風）
        const bg = this.add.graphics();
        bg.fillStyle(0x000000, 0.4);
        bg.fillCircle(0, 0, size);
        bg.lineStyle(2, 0xFFFFFF, 0.3);
        bg.strokeCircle(0, 0, size);
        
        // 矢印アイコン（シンプルなシェブロン）
        const arrow = this.add.graphics();
        arrow.lineStyle(4, 0xFFFFFF, 0.9);
        if (isRight) {
            arrow.beginPath();
            arrow.moveTo(-10, -18);
            arrow.lineTo(10, 0);
            arrow.lineTo(-10, 18);
            arrow.strokePath();
        } else {
            arrow.beginPath();
            arrow.moveTo(10, -18);
            arrow.lineTo(-10, 0);
            arrow.lineTo(10, 18);
            arrow.strokePath();
        }
        
        // ヒットエリア
        const hitArea = this.add.circle(0, 0, size).setInteractive({ useHandCursor: true }).setAlpha(0.001);
        
        container.add([bg, arrow, hitArea]);
        container.setDepth(50).setAlpha(0);
        
        // ホバーエフェクト
        hitArea.on('pointerover', () => {
            this.tweens.add({ targets: container, scale: 1.1, duration: 150, ease: 'Power2' });
            bg.clear();
            bg.fillStyle(0x000000, 0.6);
            bg.fillCircle(0, 0, size);
            bg.lineStyle(2, 0xFFFFFF, 0.5);
            bg.strokeCircle(0, 0, size);
        });
        
        hitArea.on('pointerout', () => {
            this.tweens.add({ targets: container, scale: 1.0, duration: 150, ease: 'Power2' });
            bg.clear();
            bg.fillStyle(0x000000, 0.4);
            bg.fillCircle(0, 0, size);
            bg.lineStyle(2, 0xFFFFFF, 0.3);
            bg.strokeCircle(0, 0, size);
        });
        
        hitArea.on('pointerdown', () => {
            this._playSE('se_scroll', { volume: 0.5 });
            onClick();
        });
        
        return container;
    }

    _onPatientClick(data) {
        // 連打防止: 複数のフラグをチェック
        if (this.isClickProcessing || this.isResultDisplaying || this.isPanelShowing) {
            console.log('[DEBUG] Click blocked - processing:', this.isClickProcessing, 'result:', this.isResultDisplaying, 'panel:', this.isPanelShowing);
            return;
        }
        if (data.isFinished) return;

        this.isClickProcessing = true;
        
        // 🆕 連打防止：物理的に押せなくする
        if (data.button) {
            data.button.disableInteractive();
        }
        
        // 🆕 吹き出しがあれば消す
        if (data.callBubble) {
            data.callBubble.destroy();
            data.callBubble = null;
        }
        
        try {
            this._playSE('se_display_card', { volume: 0.6 });
            
            // 🆕 タイムボーナス用: 受付開始時刻を記録
            const gameState = GameStateManager.getInstance(this.game);
            gameState.setTimingStart('reception');

            // Highlight
            this.patientManager.patientQueue.forEach(p => {
                 if (p === data) {
                     if(p.button) p.button.clearTint();
                     if(p.nameTag) p.nameTag.setAlpha(1);
                 } else {
                     if(p.button) p.button.setTint(0x555555);
                     if(p.nameTag) p.nameTag.setAlpha(0.6);
                 }
            });
            
            this.currentPatientIndex = this.patientManager.patientQueue.indexOf(data);
            this._showFixedPanel(data);
            
            // 🆕 チュートリアル: パネル表示完了を通知
            TutorialManager.getInstance(this.game).completeStep('PATIENT_CLICKED');
            
            // Update HUD with this patient's waiting count
            this._updateHUD(data);
        } catch (e) {
            console.error('[ReceptionScene] _onPatientClick error:', e);
            this.isClickProcessing = false;
            this.isPanelShowing = false;
        }

        // クールダウン延長 (300ms -> 500ms)
        this.time.delayedCall(500, () => this.isClickProcessing = false);
    }
    
    // =================================================================================================
    // 🖥️ FIXED PANEL LOGIC (Step Based)
    // =================================================================================================
    _showFixedPanel(data) {
        this.isPanelShowing = true;
        this.setAccountingButtonActive(false);
        if(this.prescriptionBadge) this.prescriptionBadge.setVisible(false);
        const hud = this.scene.get('HUDScene');
        // if(hud && hud.showInsuranceGuide) hud.showInsuranceGuide(); // ❌ 浮いてしまうため廃止、パネル内に統合

        // 1. Overlay - 画面上半分のみクリックで閉じる (下部パネル誤操作防止)
        const overlay = this.add.rectangle(960, 270, 1920, 540, 0x000000, 0.01).setInteractive().setDepth(9);
        overlay.on('pointerdown', () => {
             // 🆕 チュートリアル: パネル閉じる完了
             TutorialManager.getInstance(this.game).completeStep('PANEL_CLOSED');
             
             if (!this.isResultDisplaying) {
                 this.isSwapCooldown = false; // 🚨 修正: スワップ中に閉じてもフラグをリセット
                 this._resetInteraction();
                 // 🆕 キャンセル時は復帰
                 if (data.button && !data.isFinished) data.button.setInteractive({ useHandCursor: true });
             }
        });
        this.activePatientUI.push(overlay);
        
        // 🆕 チュートリアル登録（閉じる機能の制御用）
        TutorialManager.getInstance(this.game).registerButton('panel_close_overlay', overlay);
        
        // 2. Card Rendering (Left Side)
        const cardCenterX = 600;
        const cardCenterY = 500;
        
        // Status Banner
        const needsRecord = data.needsMedicalRecord;
        const statusText = needsRecord ? '⚠️ カルテ出し: 必要' : '✅ カルテ出し: 不要';
        const sCol = needsRecord ? 0xFF0000 : 0x2ECC71;
        const sTxtCol = needsRecord ? '#FF0000' : '#2ECC71';
        
        const statusBg = this.add.rectangle(cardCenterX, cardCenterY - 300, 380, 60, 0xFFFFFF).setStrokeStyle(4, sCol).setDepth(25);
        const statusObj = this.add.text(cardCenterX, cardCenterY - 300, statusText, { fontSize: '32px', color: sTxtCol, stroke:'#FFF', strokeThickness:4, fontFamily: '"Noto Sans JP", sans-serif'}).setOrigin(0.5).setDepth(26);
        this.activePatientUI.push(statusBg, statusObj);
        
        // ============================================
        // 📝 メモ追加ボタン (プレミアムデザイン)
        // ============================================
        const memoC = this.add.container(950, cardCenterY - 100).setDepth(25);
        
        // ボタン背景（ダークモダン）
        const memoBg = this.add.graphics();
        memoBg.fillStyle(0x2C3E50, 1);
        memoBg.lineStyle(2, 0x5D6D7E, 1);
        memoBg.fillRoundedRect(-32, -32, 64, 64, 12);
        memoBg.strokeRoundedRect(-32, -32, 64, 64, 12);
        
        // アイコン
        const memoIcon = this.add.text(0, -2, '📝', { fontSize: '28px' }).setOrigin(0.5);
        const plusIcon = this.add.text(16, 14, '+', { fontSize: '16px', color: '#2ECC71', fontStyle: 'bold' }).setOrigin(0.5);
        
        // ヒットエリア
        const memoHitArea = this.add.rectangle(0, 0, 64, 64, 0xFFFFFF, 0).setInteractive({ useHandCursor: true });
        
        // ツールチップ（初期は非表示）
        const tooltipBg = this.add.graphics();
        tooltipBg.fillStyle(0x000000, 0.85);
        tooltipBg.fillRoundedRect(-90, -60, 180, 28, 6);
        tooltipBg.setVisible(false);
        
        const tooltipText = this.add.text(0, -46, '患者情報をメモに追加', {
            fontSize: '13px',
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5).setVisible(false);
        
        const tooltipArrow = this.add.triangle(0, -32, 0, 0, 8, -8, -8, -8, 0x000000, 0.85).setVisible(false);
        
        // 🌟 ホバーエフェクト
        memoHitArea.on('pointerover', () => {
            this.tweens.add({ targets: memoC, scale: 1.1, duration: 150, ease: 'Back.Out' });
            memoBg.clear();
            memoBg.fillStyle(0x3498DB, 1);
            memoBg.lineStyle(2, 0x5DADE2, 1);
            memoBg.fillRoundedRect(-32, -32, 64, 64, 12);
            memoBg.strokeRoundedRect(-32, -32, 64, 64, 12);
            // ツールチップ表示
            tooltipBg.setVisible(true);
            tooltipText.setVisible(true);
            tooltipArrow.setVisible(true);
        });
        
        memoHitArea.on('pointerout', () => {
            this.tweens.add({ targets: memoC, scale: 1.0, duration: 100, ease: 'Power2' });
            memoBg.clear();
            memoBg.fillStyle(0x2C3E50, 1);
            memoBg.lineStyle(2, 0x5D6D7E, 1);
            memoBg.fillRoundedRect(-32, -32, 64, 64, 12);
            memoBg.strokeRoundedRect(-32, -32, 64, 64, 12);
            // ツールチップ非表示
            tooltipBg.setVisible(false);
            tooltipText.setVisible(false);
            tooltipArrow.setVisible(false);
        });
        
        memoHitArea.on('pointerdown', () => {
            // 🆕 チュートリアル完了通知
            TutorialManager.getInstance(this.game).completeStep('MEMO_ADDED');
            
            this._playSE('se_memo');
            // クリックフィードバック
            this.tweens.add({
                targets: memoC,
                scale: 0.9,
                duration: 50,
                yoyo: true,
                onComplete: () => {
                    if (hud && hud.addMemo) {
                        hud.addMemo(data);
                    }
                }
            });
        });
        
        memoC.add([memoBg, memoIcon, plusIcon, memoHitArea, tooltipBg, tooltipArrow, tooltipText]);
        this.activePatientUI.push(memoC);
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('memo_add_button', memoC);
        
        // Cards
        const regCard = this._createRegistrationCardDisplay(data);
        let insCard;
        if(data.insuranceType === 'myNumber') {
             insCard = this._createMyNumberCardDisplay(data);
        } else {
             insCard = this._createInsuranceCardDisplay(data);
        }
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('insurance_card', insCard);
        if (data.insuranceType === 'myNumber') {
            TutorialManager.getInstance(this.game).registerButton('mynumber_dialog', insCard); // マイナカードもここ
        }
        
        let front = regCard;
        let back = insCard;
        
        front.setDepth(20);
        back.setDepth(10);
        
        const swapCards = () => {
            if(this.isSwapCooldown) return;
            this.isSwapCooldown = true;
            this._playSE('se_display_card');
            front.disableInteractive(); back.disableInteractive();
            
            const temp = front; front = back; back = temp;
            
            this.tweens.add({ targets: front, x: cardCenterX, y: cardCenterY, scale:1, duration: 300, ease: 'Back.Out'});
            this.tweens.add({ targets: back, x: cardCenterX + 50, y: cardCenterY - 50, duration: 300, ease: 'Power2', onComplete: () => {
                if(!front.scene || !back.scene) return;
                front.setDepth(20); back.setDepth(10);
                
                // Front card interactive with hover
                front.setInteractive(new Phaser.Geom.Rectangle(-300,-190,600,380), Phaser.Geom.Rectangle.Contains);
                front.on('pointerover', () => this.tweens.add({ targets: front, scale: 1.03, duration: 100, ease: 'Power2' }));
                front.on('pointerout', () => this.tweens.add({ targets: front, scale: 1.0, duration: 100, ease: 'Power2' }));
                front.on('pointerdown', swapCards);
                
                // Back card interactive with hover
                back.setInteractive(new Phaser.Geom.Rectangle(-300,-190,600,380), Phaser.Geom.Rectangle.Contains);
                back.on('pointerover', () => this.tweens.add({ targets: back, scale: 1.03, duration: 100, ease: 'Power2' }));
                back.on('pointerout', () => this.tweens.add({ targets: back, scale: 1.0, duration: 100, ease: 'Power2' }));
                back.on('pointerdown', swapCards);
                
                this.isSwapCooldown = false;
            }});
        };
        
        front.setPosition(cardCenterX, cardCenterY + 200).setAlpha(0);
        back.setPosition(cardCenterX+50, cardCenterY - 50 + 200).setAlpha(0).setScale(1);
        
        this.tweens.add({ targets: front, y: cardCenterY, alpha:1, duration: 400, ease: 'Back.Out'});
        this.tweens.add({ targets: back, y: cardCenterY - 50, alpha:1, duration: 400, ease: 'Back.Out', onComplete: () => {
             if (!front.scene || !back.scene) return;
             // Front card interactive with hover
             front.setInteractive(new Phaser.Geom.Rectangle(-300,-190,600,380), Phaser.Geom.Rectangle.Contains);
             front.on('pointerover', () => this.tweens.add({ targets: front, scale: 1.03, duration: 100, ease: 'Power2' }));
             front.on('pointerout', () => this.tweens.add({ targets: front, scale: 1.0, duration: 100, ease: 'Power2' }));
             front.on('pointerdown', swapCards);
             
             // Back card interactive with hover
             back.setInteractive(new Phaser.Geom.Rectangle(-300,-190,600,380), Phaser.Geom.Rectangle.Contains);
             back.on('pointerover', () => this.tweens.add({ targets: back, scale: 1.03, duration: 100, ease: 'Power2' }));
             back.on('pointerout', () => this.tweens.add({ targets: back, scale: 1.0, duration: 100, ease: 'Power2' }));
             back.on('pointerdown', swapCards);
        }});
        
        this.activePatientUI.push(front, back);
        
        // =========================================================
        // Swap Button - モダンデザイン（ガラスモーフィズム風）
        // =========================================================
        const swapBtnX = cardCenterX + 350;
        const swapBtnY = cardCenterY - 230;
        const swapContainer = this.add.container(swapBtnX, swapBtnY);
        const swapSize = 40;
        
        // 半透明の背景
        const swapBg = this.add.graphics();
        swapBg.fillStyle(0x000000, 0.5);
        swapBg.fillCircle(0, 0, swapSize);
        swapBg.lineStyle(2, 0xFFFFFF, 0.4);
        swapBg.strokeCircle(0, 0, swapSize);
        
        // 矢印アイコン（上下シェブロン）
        const swapArrow = this.add.graphics();
        swapArrow.lineStyle(3, 0xFFFFFF, 0.9);
        // 上矢印
        swapArrow.beginPath();
        swapArrow.moveTo(-8, -5);
        swapArrow.lineTo(0, -15);
        swapArrow.lineTo(8, -5);
        swapArrow.strokePath();
        // 下矢印
        swapArrow.beginPath();
        swapArrow.moveTo(-8, 5);
        swapArrow.lineTo(0, 15);
        swapArrow.lineTo(8, 5);
        swapArrow.strokePath();
        
        // ヒットエリア
        const swapHitArea = this.add.circle(0, 0, swapSize).setInteractive({useHandCursor: true}).setAlpha(0.001);
        
        swapContainer.add([swapBg, swapArrow, swapHitArea]);
        swapContainer.setDepth(30);
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('card_swap_button', swapHitArea);
        
        // ホバーエフェクト
        swapHitArea.on('pointerover', () => {
            this.tweens.add({ targets: swapContainer, scale: 1.15, duration: 100, ease: 'Back.Out' });
            swapBg.clear();
            swapBg.fillStyle(0x000000, 0.7);
            swapBg.fillCircle(0, 0, swapSize);
            swapBg.lineStyle(2, 0xFFFFFF, 0.6);
            swapBg.strokeCircle(0, 0, swapSize);
        });
        swapHitArea.on('pointerout', () => {
            this.tweens.add({ targets: swapContainer, scale: 1.0, duration: 100, ease: 'Power2' });
            swapBg.clear();
            swapBg.fillStyle(0x000000, 0.5);
            swapBg.fillCircle(0, 0, swapSize);
            swapBg.lineStyle(2, 0xFFFFFF, 0.4);
            swapBg.strokeCircle(0, 0, swapSize);
        });
        swapHitArea.on('pointerdown', () => {
            this._playSE('se_paper', { volume: 0.4 });
            swapCards();
        });
        this.activePatientUI.push(swapContainer);

        // ============================================================
        // 🛠️ UI配置専門家による「ユーザビリティ優先」リデザイン
        // ============================================================
        // 
        // 【改善ポイント】
        // 1. **主訴の視認性最大化**: フォントサイズを28pxに拡大、専用エリアを確保。
        // 2. **Fの法則とZの法則**: 情報（左）→ アクション（右）の自然な視線移動。
        // 3. **コントラスト**: 背景をダークフラットにし、文字を白・黄色でくっきり表示。
        // 4. **情報のグルーピング**: 
        //    - 左パネル: 判断材料（誰が？何に困っている？）
        //    - 右パネル: 操作（どうする？）
        // ============================================================
        
        const panelY = 700;
        const panelHeight = 380; // 少し高さを抑えて圧迫感を減らす
        
        // 1. ベースパネル（フラットでクリーンなダーク）
        const panelBg = this.add.graphics();
        panelBg.fillStyle(0x000000, 1); // 深いブルーグレー (Midnight Blue)
        panelBg.fillRect(0, panelY, 1920, panelHeight);
        
        // 🆕 入力ブロック用 (下のボタンが反応しないように)
        panelBg.setInteractive(new Phaser.Geom.Rectangle(0, panelY, 1920, panelHeight), Phaser.Geom.Rectangle.Contains);
        
        // 上部ボーダー（視覚的な区切り）
        panelBg.fillStyle(0x34495E, 1);
        panelBg.fillRect(0, panelY, 1920, 6);
        
        this.activePatientUI.push(panelBg);

        // ============================================================
        // 【左エリア：判断材料】(幅 40% - 768px)
        // ユーザーがアクションを決めるための情報をここに集約
        // ============================================================
        const leftAreaX = 50;

        // 1-1. タイトル行（アイコン + 名前 + ラベルを同一行に）
        const titleY = panelY + 35;
        
        // アイコン (小さく)
        const iconBg = this.add.circle(leftAreaX + 25, titleY, 22, 0x2C3E50);
        this.activePatientUI.push(iconBg);
        
        const patientIcon = this.add.text(leftAreaX + 25, titleY, '👤', { fontSize: '24px' }).setOrigin(0.5);
        this.activePatientUI.push(patientIcon);
        
        // 患者名（コンパクトに）
        const nameText = this.add.text(leftAreaX + 55, titleY, data.name + ' 様', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ECF0F1',
            fontStyle: 'bold'
        }).setOrigin(0, 0.5);
        this.activePatientUI.push(nameText);
        
        // 主訴ラベルを同一行右側に配置
        const complaintLabel = this.add.text(leftAreaX + 280, titleY, '▼ 患者の訴え (主訴)', {
            fontSize: '16px',
            color: '#F1C40F',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0, 0.5);
        this.activePatientUI.push(complaintLabel);
        
        // 1-2. 主訴エリア（拡大！ panelY+60 から panelY+260 まで = 高さ200px）
        const complaintWidth = 1020;
        const complaintHeight = 195;
        const complaintStartY = panelY + 60;
        
        const complaintBg = this.add.graphics();
        complaintBg.fillStyle(0x000000, 0.4);
        complaintBg.fillRoundedRect(leftAreaX, complaintStartY, complaintWidth, complaintHeight, 12);
        complaintBg.lineStyle(3, 0xF1C40F, 1);
        complaintBg.strokeRoundedRect(leftAreaX, complaintStartY, complaintWidth, complaintHeight, 12);
        this.activePatientUI.push(complaintBg);
        
        // 主訴本文（特大サイズ、ハイコントラスト）
        const complaint = data.complaint || "（記入なし）";
        
        // 長文対応：文字数に応じてフォントサイズを自動調整
        let displayFontSize = 30;
        if(complaint.length > 40) displayFontSize = 26;
        if(complaint.length > 70) displayFontSize = 22;
        if(complaint.length > 100) displayFontSize = 18;

        const complaintText = this.add.text(leftAreaX + 25, complaintStartY + complaintHeight / 2, `「${complaint}」`, {
            fontSize: `${displayFontSize}px`, 
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            lineSpacing: 12,
            wordWrap: { width: complaintWidth - 50 }
        }).setOrigin(0, 0.5);
        this.activePatientUI.push(complaintText);
        
        // ============================================================
        // 1-3. 保険証ガイド（リデザイン: より目立つピル型）
        // ============================================================
        const guideY = panelY + 275;
        
        // ガイドコンテナ背景
        const guideWidth = 400;
        const guideBg = this.add.graphics();
        guideBg.fillStyle(0x1a2634, 0.9);
        guideBg.fillRoundedRect(leftAreaX, guideY, guideWidth, 80, 10);
        guideBg.lineStyle(1, 0x445566, 1);
        guideBg.strokeRoundedRect(leftAreaX, guideY, guideWidth, 80, 10);
        this.activePatientUI.push(guideBg);
        
        // ガイドタイトル (中央揃え)
        const guideTitle = this.add.text(leftAreaX + guideWidth / 2, guideY + 12, '📋 保険証の色ガイド', { 
            fontSize: '13px', 
            color: '#ffffffff',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5, 0);
        this.activePatientUI.push(guideTitle);
        
        // ピル共通設定
        const pillY = guideY + 52;
        const pillHeight = 30;
        const pillRadius = 15;
        const pillGap = 15;
        
        // ピルサイズ
        const pill1Width = 90;
        const pill2Width = 90;
        const pill3Width = 130;
        
        // 全ピルの合計幅
        const totalPillWidth = pill1Width + pill2Width + pill3Width + (pillGap * 2);
        // 開始位置（中央揃え）
        const pillStartX = leftAreaX + (guideWidth - totalPillWidth) / 2;
        
        // --- 社保 (Blue) ---
        const g1CenterX = pillStartX + pill1Width / 2;
        const g1Pill = this.add.graphics();
        g1Pill.fillStyle(0x3498DB, 1);
        g1Pill.fillRoundedRect(pillStartX, pillY - pillHeight/2, pill1Width, pillHeight, pillRadius);
        g1Pill.lineStyle(2, 0x5DADE2, 1);
        g1Pill.strokeRoundedRect(pillStartX, pillY - pillHeight/2, pill1Width, pillHeight, pillRadius);
        const g1Txt = this.add.text(g1CenterX, pillY, '🔵 社保', { 
            fontSize: '16px', 
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.activePatientUI.push(g1Pill, g1Txt);
        
        // --- 国保 (Red) ---
        const g2StartX = pillStartX + pill1Width + pillGap;
        const g2CenterX = g2StartX + pill2Width / 2;
        const g2Pill = this.add.graphics();
        g2Pill.fillStyle(0xE74C3C, 1);
        g2Pill.fillRoundedRect(g2StartX, pillY - pillHeight/2, pill2Width, pillHeight, pillRadius);
        g2Pill.lineStyle(2, 0xEC7063, 1);
        g2Pill.strokeRoundedRect(g2StartX, pillY - pillHeight/2, pill2Width, pillHeight, pillRadius);
        const g2Txt = this.add.text(g2CenterX, pillY, '🔴 国保', { 
            fontSize: '16px', 
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.activePatientUI.push(g2Pill, g2Txt);
        
        // --- 後期高齢者 (Purple) ---
        const g3StartX = g2StartX + pill2Width + pillGap;
        const g3CenterX = g3StartX + pill3Width / 2;
        const g3Pill = this.add.graphics();
        g3Pill.fillStyle(0x9B59B6, 1);
        g3Pill.fillRoundedRect(g3StartX, pillY - pillHeight/2, pill3Width, pillHeight, pillRadius);
        g3Pill.lineStyle(2, 0xAF7AC5, 1);
        g3Pill.strokeRoundedRect(g3StartX, pillY - pillHeight/2, pill3Width, pillHeight, pillRadius);
        const g3Txt = this.add.text(g3CenterX, pillY, '🟣 後期高齢者', { 
            fontSize: '16px', 
            color: '#FFFFFF',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        this.activePatientUI.push(g3Pill, g3Txt);
        
        // 縦の区切り線
        const dividerX = 1100;
        const divider = this.add.rectangle(dividerX, panelY + 40, 2, 300, 0x5D6D7E);
        divider.setOrigin(0,0);
        this.activePatientUI.push(divider);

        // ============================================================
        // 【右エリア：アクション & ステータス】(幅 42%)
        // ============================================================
        const rightAreaCenter = 1510;
        
        // 2-1. ステップ・進行状況
        const stepLabels = ['STEP 1: トリアージ', 'STEP 2: 待ち時間案内', 'STEP 3: 保険確認'];
        const currentStep = data.processStep || 0;
        
        const stepText = this.add.text(rightAreaCenter, panelY + 40, stepLabels[currentStep] || '', {
            fontSize: '20px',
            color: '#BDC3C7',
            fontFamily: '"Noto Sans JP", sans-serif',
            backgroundColor: '#2C3E50',
            padding: { x: 15, y: 5 }
        }).setOrigin(0.5);
        this.activePatientUI.push(stepText);

        // 2-2. 閉じるボタン
        const closeBtn = this._createPopButton(1850, panelY + 50, '閉じる ✕', () => {
             // 🆕 チュートリアル: パネル閉じる完了
             TutorialManager.getInstance(this.game).completeStep('PANEL_CLOSED');
             
            this.isSwapCooldown = false; // 🚨 修正: スワップ中に閉じてもフラグをリセット
            this._resetInteraction();
            // 🆕 キャンセル時は復帰
            if (data.button && !data.isFinished) data.button.setInteractive({ useHandCursor: true });
        }, 140, '#E74C3C', 0xFFFFFF, 0x000000);
        this.activePatientUI.push(closeBtn);
        // 🆕 チュートリアル登録（閉じるボタン）
        TutorialManager.getInstance(this.game).registerButton('panel_close_button', closeBtn);

        // 2-3. アクションコンテンツ
        const contentX = rightAreaCenter;
        const contentY = panelY + 120;

        if (currentStep === 0) {
            this._showTriageOptionsInPanel(data, contentX, contentY);
        } else if (currentStep === 1) {
            this._showWaitTimeOptionsInPanel(data, contentX, contentY);
        } else if (currentStep === 2) {
            this._showInsurancePhase(data, contentX, contentY);
        }
    }
    
    // ==========================================================
    // 💳 診察券表示 (修正版)
    // ==========================================================
    _createRegistrationCardDisplay(data) {
        // 画面の真ん中の座標 (or 0,0 relative)
        const width = 600;
        const height = 380;
        const container = this.add.container(0, 0);

        // ---------------------------------------------------
        // 1. 診察券を描画する関数
        // ---------------------------------------------------
        const drawCard = () => {
            // 背景
            const bg = this.add.graphics();
            bg.fillStyle(0xF0F0F0, 1); 
            bg.lineStyle(4, 0x666666, 1);
            bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
            bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

            // ヘッダー帯
            const headerBg = this.add.graphics();
            headerBg.fillStyle(0x2ECC71, 1); 
            headerBg.fillRect(-width/2, -height/2 + 20, width, 60);

            container.add([bg, headerBg]);

            // スタイル
            const fontBase = '"Noto Sans JP", sans-serif';
            const idStyle = { fontFamily: fontBase, color: '#000000', fontSize: '50px', stroke: '#000000', strokeThickness: 1 };
            const nameStyle = { fontFamily: fontBase, color: '#000000', fontSize: '40px', stroke: '#000000', strokeThickness: 1 };
            const kanaStyle = { fontFamily: fontBase, color: '#333333', fontSize: '18px' };

            // 固定テキスト
            const tClinic = this.add.text(0, -height/2 + 50, '首切クリニック', { 
                fontFamily: fontBase, color: '#FFFFFF', fontSize: '32px',  stroke: '#ffffff', strokeThickness: 1.5
            }).setOrigin(0.5);
            const tTitle = this.add.text(0, -height/2 + 110, '診察券', { fontFamily: fontBase, color: '#555555', fontSize: '24px' }).setOrigin(0.5);

            // IDを insuranceDetails から取得
            const currentID = data.insuranceDetails['ID']; 
            
            const tIdLabel = this.add.text(-100, 20, 'ID :', { ...idStyle, fontSize: '30px' }).setOrigin(1, 0.5);
            const tId = this.add.text(0, 20, String(currentID), idStyle).setOrigin(0.5);

            // 名前・カナ
            const kanaVal = data.insuranceDetails['フリガナ'] || data.insuranceDetails['カナ'] || '';
            const nameVal = data.insuranceDetails['氏名'] || data.insuranceDetails['名前'] || '';
            
            const tKana = this.add.text(0, 85, kanaVal, kanaStyle).setOrigin(0.5);
            const tName = this.add.text(0, 120, nameVal, nameStyle).setOrigin(0.5);

            container.add([tClinic, tTitle, tIdLabel, tId, tKana, tName]);
        };

        // ---------------------------------------------------
        // 2. 🔔 ベルマークを表示する関数
        // ---------------------------------------------------
        const showBellMark = () => {
            if (container.getByName('bellIcon')) return;

            const bell = this.add.text(0, -280, '🔔', { fontSize: '80px' })
                .setOrigin(0.5)
                .setName('bellIcon');

            this.tweens.add({
                targets: bell,
                angle: { from: -15, to: 15 },
                duration: 200,
                yoyo: true,
                repeat: -1
            });
            
            container.add(bell);
        };

        // ---------------------------------------------------
        // 3. 問診票フロー
        // ---------------------------------------------------
        const checkAndShowQuestionnaire = () => {
            if (!data.needsQuestionnaire) return;

            const qBtnY = 160;

            const updateButton = () => {
                if (data.questionnaireCompleted) return;

                const now = this.time.now;
                if (data.questionnaireEndTime && data.questionnaireEndTime > now) {
                    const baseX = 500;           
                    const baseY = qBtnY - 130;
                    const cardW = 320;
                    const cardH = 180;

                    // 🎨 プレミアム記入中カード
                    const cardShadow = this.add.graphics();
                    cardShadow.fillStyle(0x000000, 0.25);
                    cardShadow.fillRoundedRect(baseX - cardW/2 + 5, baseY - cardH/2 + 5, cardW, cardH, 16);
                    
                    const cardBg = this.add.graphics();
                    cardBg.fillStyle(0x2E7D32, 1); 
                    cardBg.fillRoundedRect(baseX - cardW/2, baseY - cardH/2, cardW, cardH, 16);
                    
                    const accentBar = this.add.graphics();
                    accentBar.fillStyle(0x4CAF50, 1);
                    accentBar.fillRoundedRect(baseX - cardW/2, baseY - cardH/2, cardW, 45, { tl: 16, tr: 16, bl: 0, br: 0 });
                    
                    const icon = this.add.text(baseX - cardW/2 + 25, baseY - cardH/2 + 22, '📋', {
                        fontSize: '28px'
                    }).setOrigin(0.5);
                    
                    const headerText = this.add.text(baseX, baseY - cardH/2 + 22, '問診票に記入中', {
                        fontSize: '18px',
                        fontFamily: '"Noto Sans JP", sans-serif',
                        color: '#FFFFFF'
                    }).setOrigin(0.5);
                    
                    const penIcon = this.add.text(baseX + cardW/2 - 30, baseY - cardH/2 + 22, '✍️', {
                        fontSize: '22px'
                    }).setOrigin(0.5);
                    
                    this.tweens.add({
                        targets: penIcon,
                        angle: { from: -8, to: 8 },
                        duration: 400,
                        yoyo: true,
                        repeat: -1,
                        ease: 'Sine.easeInOut'
                    });
                    
                    const progBgY = baseY + 5; const progW = 260; const progH = 12;
                    const progBg = this.add.graphics();
                    progBg.fillStyle(0x1B5E20, 1);
                    progBg.fillRoundedRect(baseX - progW/2, progBgY, progW, progH, 6);
                    
                    const progFill = this.add.graphics();
                    const total = 20000;
                    
                    const remainSec = Math.ceil((data.questionnaireEndTime - now) / 1000);
                    const progressLabel = this.add.text(baseX, progBgY + progH + 18, `残り ${remainSec} 秒`, {
                        fontSize: '14px', fontFamily: '"Noto Sans JP", sans-serif', color: '#C8E6C9'
                    }).setOrigin(0.5);
                    
                    const updateProgress = this.time.addEvent({
                        delay: 100, loop: true,
                        callback: () => {
                            if (!progFill.scene) { updateProgress.remove(); return; }
                            const nowTime = this.time.now;
                            const elapsedTime = nowTime - (data.questionnaireEndTime - 20000);
                            const newProgress = Math.min(elapsedTime / total, 1);
                            const newW = progW * newProgress;
                            
                            progFill.clear();
                            if (newW > 0) {
                                progFill.fillStyle(0x81C784, 1);
                                progFill.fillRoundedRect(baseX - progW/2, progBgY, newW, progH, 6);
                            }
                            const newRemain = Math.max(0, Math.ceil((data.questionnaireEndTime - nowTime) / 1000));
                            progressLabel.setText(`残り ${newRemain} 秒`);
                            if(newRemain <= 0) updateProgress.remove();
                        }
                    });
                    
                    const tipText = this.add.text(baseX, baseY + cardH/2 - 25, '💡 他の患者さんの対応を先に', {
                        fontSize: '13px', fontFamily: '"Noto Sans JP", sans-serif', color: '#A5D6A7'
                    }).setOrigin(0.5);
                    
                    container.add([cardShadow, cardBg, accentBar, icon, headerText, penIcon, progBg, progFill, progressLabel, tipText]);
                    return;
                }

                // 未記入 (ボタン表示)
                const btnBg = this.add.rectangle(500, qBtnY - 150, 300, 70, 0xff5722).setStrokeStyle(2, 0xffffff);
                const btnText = this.add.text(500, qBtnY - 150, '問診票に記入をお願いする', {
                    fontSize: '20px', color: '#ffffff', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(0.5);

                btnBg.setInteractive({ useHandCursor: true });
                btnBg.on('pointerover', () => { btnBg.setScale(1.05); btnBg.setFillStyle(0xff8a50); });
                btnBg.on('pointerout', () => { btnBg.setScale(1.0); btnBg.setFillStyle(0xff5722); });

                btnBg.on('pointerdown', () => {
                    // 🆕 チュートリアル: 問診票を渡した
                    TutorialManager.getInstance(this.game).completeStep('QUESTIONNAIRE_GIVEN');
                    
                    data.questionnaireEndTime = this.time.now + 20000; 
                    btnBg.destroy(); btnText.destroy();
                    updateButton();
                    
                    // ========================================
                    // 🆕 患者イラスト上にプログレスバーを表示
                    // ========================================
                    if (data.visuals && data.visuals.image) {
                        const patientImg = data.visuals.image;
                        const imgX = patientImg.x;
                        const imgY = patientImg.y;
                        
                        // プログレスバーコンテナ
                        const progressContainer = this.add.container(imgX, imgY + 180).setDepth(1000);
                        data.questionnaireProgressBar = progressContainer;
                        
                        // 背景（半透明ダーク）
                        const bgWidth = 200;
                        const bgHeight = 50;
                        const bg = this.add.graphics();
                        bg.fillStyle(0x000000, 0.85);
                        bg.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 12);
                        progressContainer.add(bg);
                        
                        // ラベル
                        const label = this.add.text(0, -12, '📝 記入中...', {
                            fontSize: '14px',
                            fontFamily: '"Noto Sans JP", sans-serif',
                            color: '#4CAF50'
                        }).setOrigin(0.5);
                        progressContainer.add(label);
                        
                        // プログレスバー背景
                        const barWidth = 160;
                        const barHeight = 8;
                        const barBg = this.add.graphics();
                        barBg.fillStyle(0x333333, 1);
                        barBg.fillRoundedRect(-barWidth/2, 8, barWidth, barHeight, 4);
                        progressContainer.add(barBg);
                        
                        // プログレスバー塗り
                        const barFill = this.add.graphics();
                        progressContainer.add(barFill);
                        
                        // リアルタイム更新
                        const startTime = this.time.now;
                        const duration = 20000;
                        
                        // 🚨 修正: 既存のタイマーがあれば再利用（リセット防止）
                        if (data.questionnaireTimer) {
                            if (data.questionnaireProgressBar) {
                                if (data.questionnaireProgressBar.scene) data.questionnaireProgressBar.destroy();
                            }
                            // 既存タイマーが走っているので、UIだけ現在の進行状況に合わせて再描画する
                            // ただし phaserのtimer eventからelapsedを取得するのは少し難しいので
                            // 簡易的に「見た目だけ」リスタートさせる（許容範囲）
                            // 厳密には data.questionnaireStartTime を保持すべきだが、
                            // ここでは「二重にタイマーを作らない」ことを優先する
                        } else {
                            data.questionnaireTimer = this.time.addEvent({
                                delay: 50,
                                loop: true,
                                callback: () => {
                                    if (!barFill.scene) { data.questionnaireTimer.remove(); return; }
                                    const elapsed = this.time.now - startTime;
                                    const progress = Math.min(elapsed / duration, 1);
                                    const fillWidth = barWidth * progress;
                                    
                                    barFill.clear();
                                    // グラデーション風（緑→黄色）
                                    const color = progress < 0.7 ? 0x4CAF50 : (progress < 0.9 ? 0xFFC107 : 0x8BC34A);
                                    barFill.fillStyle(color, 1);
                                    barFill.fillRoundedRect(-barWidth/2, 8, fillWidth, barHeight, 4);
                                    
                                    if (progress >= 1) {
                                        data.questionnaireTimer.remove();
                                    }
                                }
                            });
                        }
                        
                        // patientContainerに追加（患者と一緒にスクロール）
                        if (this.patientContainer) {
                            this.patientContainer.add(progressContainer);
                        }
                    }

                    this.time.delayedCall(20000, () => {
                        data.complaint = data.hiddenComplaint; 
                        data.questionnaireCompleted = true;
                        data.questionnaireEndTime = null;
                        
                        // 🆕 問診票完了時にコンボ加算
                        const gameState = GameStateManager.getInstance(this.game);
                        if (gameState) {
                            gameState.incrementCombo();
                        }

                        // プログレスバーを削除（パネルの状態に関わらず削除）
                        if (data.questionnaireProgressBar) {
                            if (data.questionnaireProgressBar.scene) data.questionnaireProgressBar.destroy();
                            data.questionnaireProgressBar = null;
                        }

                        // 🔔 問診票完了演出（これはパネルの状態に関わらず実行）
                        this._playActiveCallEffect(data);
                        // 🆕 チュートリアル: 問診票完了を通知
                        TutorialManager.getInstance(this.game).completeStep('QUESTIONNAIRE_FINISHED');
                        
                        // 🛑 安全装置: パネル（コンテナ）が既に破棄されていたら、UI更新は中止
                        if (!container || !container.scene) { 
                            return;
                        }
                        
                        container.removeAll(true);
                        drawCard();
                        showBellMark();
                        
                        // 🆕 問診票閲覧ボタンを追加
                        const viewQuestBtn = this.add.text(500, 180, '📋 問診票を見る', {
                            fontSize: '18px', fontFamily: '"Noto Sans JP"', color: '#FFFFFF', backgroundColor: '#2E7D32', padding: { x: 15, y: 8 }
                        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
                        
                        viewQuestBtn.on('pointerdown', () => {
                            TutorialManager.getInstance(this.game).completeStep('QUESTIONNAIRE_OPENED');
                            this._showQuestionnaireModal(data);
                        });
                        container.add(viewQuestBtn);
                        
                        // 🆕 チュートリアル登録
                        TutorialManager.getInstance(this.game).registerButton('questionnaire_button', viewQuestBtn);
                        // if (data.bellIcon) data.bellIcon.setVisible(true);
                        // this._playActiveCallEffect(data); // 上に移動済み
                    });
                });
                container.add([btnBg, btnText]);
                
                // 🆕 チュートリアル: 問診票ボタン登録
                TutorialManager.getInstance(this.game).registerButton('questionnaire_button', btnBg);
            };
            updateButton();
        };

        // ---------------------------------------------------
        // メイン分岐
        // ---------------------------------------------------
        const idVal = data.insuranceDetails['ID'];
        const hasID = (idVal !== null && idVal !== undefined && idVal !== '新規' && idVal !== '');

        if (hasID) {
            drawCard();
            checkAndShowQuestionnaire();
        } else {
            // 新規ID発行ボタン
            const btnBg = this.add.rectangle(0, 0, 400, 120, 0x007bff).setStrokeStyle(4, 0xffffff);
            const btnText = this.add.text(0, 0, '新規IDを発行する', {
                fontSize: '24px', color: '#ffffff', fontFamily: '"Noto Sans JP", sans-serif', stroke: '#ffffffff', strokeThickness: 1
            }).setOrigin(0.5);
            
            // Interaction container
            const btnContainer = this.add.container(0, 0, [btnBg, btnText]);
            const hitArea = new Phaser.Geom.Rectangle(-200, -60, 400, 120);
            btnContainer.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            
            btnContainer.on('pointerover', () => { btnBg.setScale(1.05); btnBg.setFillStyle(0x4da3ff); });
            btnContainer.on('pointerout', () => { btnBg.setScale(1.0); btnBg.setFillStyle(0x007bff); });
            
            btnContainer.on('pointerdown', () => {
                this._playSE('se_display_card');
                // 🆕 チュートリアルイベント
                TutorialManager.getInstance(this.game).completeStep('NEW_ID_CLICKED');
                
                data.isNewPatient = true;
                data.insuranceDetails['ID'] = Phaser.Math.Between(10000, 99999);
                btnContainer.destroy();
                drawCard();
                checkAndShowQuestionnaire();
            });
            container.add(btnContainer);
            
            // 🆕 チュートリアル登録
            TutorialManager.getInstance(this.game).registerButton('new_id_button', btnContainer);
        }

        return container;
    }

    // ==========================================================
    // 📇 紙保険証カード (共通コンポーネント使用)
    // ==========================================================
    _createInsuranceCardDisplay(data) {
        // 共通コンポーネントを使用（フルモード）
        return InsuranceCardDisplay.create(this, data, {
            compact: false,
            showStamp: true,
            showFooter: true,
            depth: 10
        });
    }

    _createMyNumberCardDisplay(data) {
        const width = 600;
        const height = 380;
        const container = this.add.container(0, 0);

        // ============================================
        // 背景（淡いピンクから緑へのグラデーション風）
        // ============================================
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xFFF0F5, 0xFFF0F5, 0xE8F5E9, 0xE8F5E9, 1); // ピンク -> 薄緑
        bg.lineStyle(2, 0xD4A59A, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
        
        // 装飾パターン（ドット）
        const patternArea = this.add.graphics();
        patternArea.fillStyle(0xFFFFFF, 0.3);
        const cols = 20;
        const rows = 12;
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                if ((r + c) % 2 === 0) {
                    patternArea.fillCircle(-width/2 + 20 + c * 30, -height/2 + 20 + r * 30, 4);
                }
            }
        }

        // スタイル定義
        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, color: '#555555', fontSize: '14px' };
        const valueStyle = { fontFamily: fontBase, color: '#333333', fontSize: '20px' };
        
        // データ取得
        const details = data.insuranceDetails || {};
        const dobPhrase = details['生年月日'] || 'XXXX/XX/XX';
        const age = details['年齢'] || '??';
        const insuranceType = data.visualCategory || '社保'; // 保険種別
        const burden = details['負担割合'] || '-';

        // ============================================
        // 📷 本人写真エリア（左側）
        // ============================================
        const photoX = -width/2 + 70; // 左に移動 (元90)
        const photoY = 20;
        const photoW = 120;
        const photoH = 155;
        
        const photoFrame = this.add.graphics();
        photoFrame.fillStyle(0xFFFFFF, 1);
        photoFrame.lineStyle(1, 0xAAAAAA, 1);
        photoFrame.fillRect(photoX - photoW/2, photoY - photoH/2, photoW, photoH);
        photoFrame.strokeRect(photoX - photoW/2, photoY - photoH/2, photoW, photoH);
        
        let patientPhoto = null;
        if (data.imageKey && this.textures.exists(data.imageKey)) {
            patientPhoto = this.add.image(photoX, photoY, data.imageKey)
                .setDisplaySize(photoW - 4, photoH - 4);
        } else {
            const gender = data.gender || '男';
            const icon = gender === '女' ? '👩' : '👨';
            patientPhoto = this.add.text(photoX, photoY, icon, { fontSize: '50px' }).setOrigin(0.5);
        }

        // ============================================
        // 上部情報エリア（氏名・住所）
        // ============================================
        const topX = -width/2 + 140; // 写真とのギャップを詰める
        let topY = -height/2 + 45;

        // 氏名
        const nameLabel = this.add.text(topX-120, topY, '氏  名', labelStyle);
        const nameVal = this.add.text(topX -60, topY - 5, data.name, { ...valueStyle, fontSize: '30px', color: '#000000' });
        
        // 住所
        topY += 45;
        const addressLabel = this.add.text(topX-120, topY, '住  所', labelStyle);
        const addressVal = this.add.text(topX -60, topY - 2, 'XX県XX市XX町X丁目X番XX号', { ...valueStyle, fontSize: '16px' });

        // 個人番号カードロゴ（右上）
        // 🐰 マイナちゃんアイコン
        const rabbitIcon = this.add.text(width/2 - 55, -height/2 + 25, '🐰', { fontSize: '22px' }).setOrigin(0.5);
        
        const logoBg = this.add.graphics();
        logoBg.fillStyle(0xFFFFFF, 0.8);
        logoBg.fillRoundedRect(width/2 - 90, -height/2 + 40, 70, 40, 5);
        const logoText1 = this.add.text(width/2 - 55, -height/2 + 50, '個人番号', { fontFamily: fontBase, color: '#333333', fontSize: '10px' }).setOrigin(0.5);
        const logoText2 = this.add.text(width/2 - 55, -height/2 + 65, 'カード', { fontFamily: fontBase, color: '#333333', fontSize: '12px' }).setOrigin(0.5);

        // ============================================
        // 中段右エリア（生年月日・性別・有効期限・市長）
        // ============================================
        const midX = width/2 - 20; // 右端基準
        let midY = -height/2 + 100;

        // 性別 (insuranceDetailsから抽出、なければgenderKeyから変換)
        let genderStr = details['性別'] || '';
        if (!genderStr && data.genderKey) {
            genderStr = (data.genderKey === 'man') ? '男' : '女';
        }
        if (!genderStr) genderStr = '−';
        const genderLabel = this.add.text(midX - 70, midY, '性別', labelStyle);
        const genderVal = this.add.text(midX - 20, midY - 2, genderStr, valueStyle);

        // 生年月日 (年齢)
        midY += 35;
        // 生年月日を左揃えに変更 (重なり防止)
        const dobVal = this.add.text(topX + 20, midY, `${dobPhrase}生 (${age}歳)`, { ...valueStyle, fontSize: '18px' });
        const expLabel = this.add.text(midX - 200, midY + 2, 'XXXX年XX月XX日まで有効', { ...labelStyle, fontSize: '11px', color: '#000000' });

        // 市長（電子署名の真横）
        midY += 30;
        const issuerVal = this.add.text(midX - 250, midY + 22, 'XX市長', { ...valueStyle, fontSize: '14px' });

        // 電子証明書有効期限（黒帯）
        const certBg = this.add.graphics();
        certBg.fillStyle(0x333333, 1);
        certBg.fillRect(midX - 160, midY + 20, 150, 20);
        const certLabel = this.add.text(midX - 155, midY + 22, '署名用電子証明書', { fontFamily: fontBase, color: '#FFFFFF', fontSize: '8px' });
        const certDate = this.add.text(midX - 60, midY + 22, '年  月  日', { fontFamily: fontBase, color: '#FFFFFF', fontSize: '12px' });


        // ============================================
        // 下段右エリア（青い枠：臓器提供意思表示欄 -> 保険情報表示エリアとして利用）
        // ============================================
        const botX = topX + 20; // 生年月日と同X座標で少し右へ
        const botY = midY + 50;
        
        const infoBoxWidth = 380;
        const infoBoxHeight = 110;

        const infoBox = this.add.graphics();
        infoBox.fillStyle(0xE1F5FE, 1); // 薄い青
        infoBox.lineStyle(1, 0x81D4FA, 1);
        infoBox.fillRect(botX - 10, botY, infoBoxWidth, infoBoxHeight);
        infoBox.strokeRect(botX - 10, botY, infoBoxWidth, infoBoxHeight);
        
        // 罫線
        infoBox.lineStyle(1, 0x81D4FA, 0.5);
        infoBox.lineBetween(botX - 10, botY + 36, botX - 10 + infoBoxWidth, botY + 36);
        infoBox.lineBetween(botX - 10, botY + 72, botX - 10 + infoBoxWidth, botY + 72);

        // 患者情報の抽出表示（保険種別、負担割合）
        const insuranceLabel = this.add.text(botX, botY + 8, '保険種別', { ...labelStyle, color: '#0277BD' });
        const insuranceVal = this.add.text(botX + 80, botY + 5, insuranceType, { ...valueStyle, fontSize: '22px', color: '#01579B' });

        const burdenLabel = this.add.text(botX, botY + 44, '負担割合', { ...labelStyle, color: '#0277BD' });
        const burdenVal = this.add.text(botX + 80, botY + 41, burden, { ...valueStyle, fontSize: '22px', color: '#01579B' });
        
        const noteLabel = this.add.text(botX, botY + 80, '【特記事項】', { ...labelStyle, fontSize: '10px', color: '#555555' });


        // ============================================
        // 最下部（番号）
        // ============================================
        const numberVal = this.add.text(-width/2 + 30, height/2 - 30, '01234567890123456', { 
            fontFamily: 'monospace', color: '#999999', fontSize: '14px' 
        });
        const numberVal2 = this.add.text(-width/2 + 200, height/2 - 30, '0123', { 
            fontFamily: 'monospace', color: '#333333', fontSize: '16px' 
        });

        // 全ての要素をコンテナに追加
        container.add([bg, patternArea, photoFrame, patientPhoto, 
            nameLabel, nameVal, addressLabel, addressVal, rabbitIcon, logoBg, logoText1, logoText2,
            genderLabel, genderVal, dobVal, expLabel, issuerVal,
            certBg, certLabel, certDate,
            infoBox, insuranceLabel, insuranceVal, burdenLabel, burdenVal, noteLabel,
            numberVal, numberVal2]);
        
        return container;
    }

    // ===================================
    // STEP 0: Triage
    // ===================================
    _showTriageOptionsInPanel(data, x, y) {
        this._clearStepUI();
        this._showGuideText(x, y-70, 'Q. 検尿は必要ですか？');
        
        const checkQ = () => {
            if(data.needsQuestionnaire && !data.questionnaireCompleted) {
                // Warning
                const w = this.add.text(x, y-150, '先に問診！', {fontSize:'32px', color:'red', stroke:'white', strokeThickness:6}).setOrigin(0.5).setDepth(9999);
                this.tweens.add({targets:w, y: y-200, alpha:0, duration:1000, onComplete:()=>w.destroy()});
                return false;
            }
            return true;
        }
        
        const btn1 = this._createPopButton(x, y, '✅ 検尿カップを渡す', () => {
            if(!checkQ()) return;
            this._playSE('se_display_card');
            this._showCupInsuranceSelection(data, x, y);
        }, BTN_WIDTH, '#22e63cff', 0xFFFFFF, 0x000, 'left');
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('triage_urine_button', btn1);
        
        const btn2 = this._createPopButton(x, y + BTN_GAP, '❌ そのまま待たせる', () => {
            if(!checkQ()) return;
            this._handleTriageJudge(data, false, null, x, y);
        }, BTN_WIDTH, '#E74C3C', 0xFFFFFF, 0x000, 'left');
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('triage_none_button', btn2);
        
        this.stepUI.push(btn1, btn2);
    }
    
    _showCupInsuranceSelection(data, x, y) {
        this._clearStepUI();
        this._showGuideText(x, y-70, 'Q. カップに書く保険種別は？');
        
        const opts = [
            {l:'社保 (会社員)', c:'#3498DB'}, {l:'国保 (自営業)', c:'#E74C3C'}, {l:'後期高齢者', c:'#9B59B6'}
        ];
        
        opts.forEach((o, i) => {
            const btn = this._createPopButton(x, y + i*BTN_GAP, `🖊️ ${o.l}`, () => {
                 this._handleTriageJudge(data, true, o.l.split(' ')[0], x, y);
            }, BTN_WIDTH, o.c, 0xFFFFFF, 0x000, 'left');
            this.stepUI.push(btn);
        });
        
        // Back Btn
        const bX = x - 360;
        const bC = this.add.container(bX, y);
        const bBg = this.add.circle(0,0,40,0x95a5a6).setStrokeStyle(3,0xFFFFFF).setInteractive({useHandCursor:true});
        const bI = this.add.text(0,0,'↩',{fontSize:'50px', color:'#FFF'}).setOrigin(0.5);
        bBg.on('pointerdown', () => this._showTriageOptionsInPanel(data, x, y));
        bC.add([bBg, bI]).setDepth(100);
        this.stepUI.push(bC);
    }
    
    _handleTriageJudge(data, givenCup, category, x, y) {
        this._clearStepUI();
        let correct = false; let msg = ''; let col = '';
        const reason = data.triageReason || '理由なし';
        
        data.playerGaveCup = givenCup;
        
        if (givenCup) {
            if(data.testNeeded) {
                // Check category
                let trueCat = (data.insuranceCategory||'').includes('社保') ? '社保' : data.insuranceCategory;
                if((data.insuranceCategory||'').includes('家')) trueCat = '社保';
                if((category||'').includes('社保')) category = '社保';
                
                if(category === trueCat) {
                    correct = true; msg = `✅ 正解！\n(${reason})`; col = '#00FF00'; this._playSE('se_correct_answer');
                } else {
                    msg = `⚠️ 種別ミス (正解: ${trueCat})`; col = '#FFA500'; this._playSE('se_miss');
                    this._recordMistake(data, 10, '検尿時: 種別ミス');
                }
            } else {
                msg = `⚠️ 過剰対応 (不要でした)`; col = '#FFA500'; this._playSE('se_miss');
                this._recordMistake(data, 5, '検尿不要なのに渡した');
            }
        } else {
            if(!data.testNeeded) {
                correct = true; msg = `✅ 正解！\n(${reason})`; col = '#00FF00'; this._playSE('se_correct_answer');
            } else {
                msg = `❌ 見逃し！\n(${reason})`; col = '#FF0000'; this._playSE('se_miss');
                this._recordMistake(data, 20, '検尿スルー(重大)');
            }
        }
        
        if(correct) {
            this._fireConfetti();
            // コンボ加算 (トリアージ成功)
            GameStateManager.getInstance(this.game).incrementCombo();
            // チュートリアル: トリアージ選択完了を通知
            TutorialManager.getInstance(this.game).completeStep('TRIAGE_SELECTED');
        } else {
            // コンボリセット
            GameStateManager.getInstance(this.game).resetCombo();
            EventBus.emit(GameEvents.COMBO_BREAK, {});
            
            // 🆕 チュートリアル中は間違った選択でリトライを促す
            const tm = TutorialManager.getInstance(this.game);
            if (tm.isActive) {
                // 間違ったイベントを送信 → リトライメッセージ表示
                tm.completeStep('WRONG_TRIAGE_SELECTION');
                // メッセージだけ表示して、再選択UIを表示
                this._showResultOverlay(msg, col);
                this.time.delayedCall(1500, () => {
                    this._showTriageOptionsInPanel(data, x, y);
                });
                return; // ゲームを進めない
            }
        }
        this._showResultOverlay(msg, col);
        
        const next = () => {
             data.processStep = 1;
             this._showWaitTimeOptionsInPanel(data, x, y);
        }
        
        this.time.delayedCall(1500, next);
    }
    
    // ===================================
    // STEP 1: Wait Time
    // ===================================
    _showWaitTimeOptionsInPanel(data, x, y) {
        this._clearStepUI();
        const waiting = data.receptionNumber - this.lastFinishedNumber;
        this._showGuideText(x, y-70, `Q. 待ち時間を案内してください (待人数:${waiting}人)`);
        
        const opts = [
            {t:'案内しない (10人未満)', c:'#7F8C8D', ok: waiting < 10},
            {t:'1時間くらい (10~19人)', c:'#2ECC71', ok: waiting >= 10 && waiting < 20},
            {t:'2時間くらい (20~29人)', c:'#F1C40F', ok: waiting >= 20 && waiting < 30},
            {t:'3時間以上 (30人以上)', c:'#E74C3C', ok: waiting >= 30}
        ];
        
        opts.forEach((o, i) => {
             const btn = this._createPopButton(x, y + i*(BTN_GAP-10), `🕒 ${o.t}`, () => {
                 this._handleWaitTimeJudge(data, o, x, y);
             }, BTN_WIDTH, o.c, 0xFFFFFF, 0x000, 'left');
             this.stepUI.push(btn);
             
             // 🆕 チュートリアル登録
             const waitId = i === 0 ? 'wait_time_6min'
                          : i === 1 ? 'wait_time_1hour'
                          : i === 2 ? 'wait_time_2hours'
                          : i === 3 ? 'wait_time_3hours' : null;
             if (waitId) {
                 TutorialManager.getInstance(this.game).registerButton(waitId, btn);
             }
        });
    }
    
    _handleWaitTimeJudge(data, opt, x, y) {
        this._clearStepUI();
        if(opt.ok) {
            this._playSE('se_correct_answer');
            this._fireConfetti();
            this._showResultOverlay('✅ 正解！', '#00FF00');
            // コンボ加算 (案内成功)
            GameStateManager.getInstance(this.game).incrementCombo();
            // チュートリアル: 待ち時間選択完了を通知
            TutorialManager.getInstance(this.game).completeStep('WAIT_TIME_SELECTED');
        } else {
            this._playSE('se_miss');
            this._recordMistake(data, 10, '待ち時間案内ミス');
            this._showResultOverlay('⚠️ 案内ミス', '#FFA500');
            // コンボリセット
            GameStateManager.getInstance(this.game).resetCombo();
            EventBus.emit(GameEvents.COMBO_BREAK, {});
            
            // 🆕 チュートリアル中は間違った選択でリトライを促す
            const tm = TutorialManager.getInstance(this.game);
            if (tm.isActive) {
                // 間違ったイベントを送信 → リトライメッセージ表示
                tm.completeStep('WRONG_WAIT_TIME_SELECTION');
                // 再選択UIを表示
                this.time.delayedCall(1500, () => {
                    this._showWaitTimeOptionsInPanel(data, x, y);
                });
                return; // ゲームを進めない
            }
        }
        
        data.processStep = 2;
        this.time.delayedCall(500, () => this._showInsurancePhase(data, x, y));
    }

    // ===================================
    // STEP 2: Insurance
    // ===================================
    _showInsurancePhase(data, x, y) {
        this._clearStepUI();
        
        if (data.insuranceType === 'myNumber') {
            if(data.myNumberAuthDone) {
                this._showGuideText(x, y-70, 'マイナンバー確認済み');
                this._showCompleteButton(data, x, y);
            } else {
                this._showMyNumberFlow(data, x, y);
            }
        } else {
            if(data.isNewPatient) {
                this._showTypingFlow(data, x, y);
            } else {
                this._showGuideText(x, y-70, '保険証確認 (再診:入力不要)');
                this._showCompleteButton(data, x, y);
            }
        }
    }
    
    _showMyNumberFlow(data, x, y) {
        this._showGuideText(x, y-70, 'マイナンバーカード確認');
        const btn = this._createPopButton(x, y+80, '📋 暗証番号コピー＆照会', () => {
             btn.destroy();
             data.myNumberAuthDone = true;
             // 🆕 チュートリアル: マイナ確認完了を通知
             TutorialManager.getInstance(this.game).completeStep('MYNUMBER_CONFIRMED');
             this._showCompleteButton(data, x, y);
        }, BTN_WIDTH, '#3498DB', 0xFFFFFF, 0x000);
        this.stepUI.push(btn);
    }
    
    _showTypingFlow(data, x, y) {
        this._showGuideText(x, y, '保険証情報の入力 (タイピング)');

        // 既存のボタンがあれば削除（重複防止）
        if (this.typingStartBtn && this.typingStartBtn.active) {
            this.typingStartBtn.destroy();
        }

        // 手順1: 入力開始ボタン
        const btnStart = this._createPopButton(x, y + 80, '⌨️ 入力を開始', () => {
            // 🆕 チュートリアル: タイピング開始を通知
            TutorialManager.getInstance(this.game).completeStep('TYPING_STARTED');
            
            // TypingScene を起動
            this.scene.launch('TypingScene', { 
                patientData: data, 
                
                // ★重要: TypingScene側でタイピング完了時に実行される関数
                onComplete: (penaltyScore) => {
                    // 1. TypingSceneを閉じる
                    this.scene.stop('TypingScene');
                    
                    // 🔹 タイピングのエラー項目を詳細に記録
                    // 🔹 タイピングのエラー項目を詳細に記録
                    const errorFields = data.typingErrorFields || [];
                    if (errorFields.length > 0) {
                        // 項目名のラベルマッピング
                        const fieldLabels = {
                            'type': '保険種別',
                            'symbol': '記号',
                            'number': '番号',
                            'branch': '枝番',
                            'name': '氏名',
                            'dob': '生年月日',
                            'furigana': 'フリガナ',
                            'age': '年齢',
                            'gender': '性別',
                            'burden': '負担割合',
                            'ins_num': '保険者番号'
                        };
                        
                        // エラー項目ごとに分割して記録
                        const totalPenalty = Math.abs(penaltyScore);
                        // (中略) recordMistake
                        const unitScore = Math.floor(totalPenalty / Math.max(1, errorFields.length));
                        const remainder = totalPenalty % Math.max(1, errorFields.length);

                        errorFields.forEach((field, index) => {
                             let score = unitScore;
                             if (index === 0) score += remainder; 
                             
                             const label = fieldLabels[field] || field;
                             this._recordMistake(data, score, `保険証入力: ${label}不一致`);
                        });
                    }

                    
                    // 2. 🚨【修正】完了したので、入力開始ボタンを消す
                    if (this.typingStartBtn && this.typingStartBtn.active) {
                        this.typingStartBtn.setVisible(false); // 先に非表示
                        this.typingStartBtn.destroy();
                        this.typingStartBtn = null;
                    }

                    // 3. 受付完了ボタンを表示する
                    this._showCompleteButton(data, x, y);
                    
                    // 🆕 チュートリアル: ReceptionSceneに戻ったので次のステップを表示
                    const tm = TutorialManager.getInstance(this.game);
                    if (tm.isActive) {
                        // 少し長めに待つ（シーン遷移安定化）
                        this.time.delayedCall(500, () => {
                            tm._showCurrentStep();
                        });
                    }
                }
            });

        }, BTN_WIDTH, '#E67E22', 0xFFFFFF, 0x000000);

        this.stepUI.push(btnStart);
        this.typingStartBtn = btnStart; // プロパティに保存
        
        // 🆕 チュートリアル: ボタン登録
        TutorialManager.getInstance(this.game).registerButton('typing_start_button', btnStart);
    }

    _showCompleteButton(data, x, y) {
        const hud = this.scene.get('HUDScene');
        // A Route check
        if(data.needsMedicalRecord) {
             const id = data.insuranceDetails['ID'];
             const hasRec = hud ? hud.hasRecord(id) : false;
             if(!hasRec) {
                 this._clearStepUI();
                 
                 // プレミアムアラートカード
                 const alertContainer = this.add.container(x, y).setDepth(100);
                 
                 // 背景カード（グラデーション風）
                 const cardBg = this.add.graphics();
                 cardBg.fillStyle(0x2C3E50, 0.95);
                 cardBg.fillRoundedRect(-220, -100, 440, 200, 16);
                 cardBg.lineStyle(3, 0xE74C3C, 1);
                 cardBg.strokeRoundedRect(-220, -100, 440, 200, 16);
                 alertContainer.add(cardBg);
                 
                 // 上部アクセントバー
                 const accentBar = this.add.graphics();
                 accentBar.fillStyle(0xE74C3C, 1);
                 accentBar.fillRoundedRect(-220, -100, 440, 8, {tl: 16, tr: 16, bl: 0, br: 0});
                 alertContainer.add(accentBar);
                 
                 // アイコン
                 const icon = this.add.text(0, -55, '📋', {fontSize: '48px'}).setOrigin(0.5);
                 alertContainer.add(icon);
                 
                 // タイトル
                 const title = this.add.text(0, -5, 'カルテが必要です', {
                     fontSize: '28px',
                     fontFamily: '"Noto Sans JP", sans-serif',
                     color: '#E74C3C',
                     fontStyle: 'bold'
                 }).setOrigin(0.5);
                 alertContainer.add(title);
                 
                 // 説明文
                 const desc = this.add.text(0, 45, 'カルテ棚へ移動して取得してください', {
                     fontSize: '18px',
                     fontFamily: '"Noto Sans JP", sans-serif',
                     color: '#BDC3C7'
                 }).setOrigin(0.5);
                 alertContainer.add(desc);
                 
                 // パルスアニメーション
                 this.tweens.add({
                     targets: alertContainer,
                     scale: { from: 0.95, to: 1 },
                     alpha: { from: 0.8, to: 1 },
                     duration: 800,
                     yoyo: true,
                     repeat: -1,
                     ease: 'Sine.InOut'
                 });
                 
                 this.stepUI.push(alertContainer);
                 return;
             }
             this._showOpenRecordButton(data, x, y);
        } else {
             // B Route - New patient stamping only
             this._showNewPatientStamping(data, x, y);
        }
    }
    
    _showOpenRecordButton(data, x, y) {
        this._clearStepUI();
        this._showGuideText(x, y-70, '📋 カルテを確認してください');
        const btn = this._createPopButton(x, y+80, '📂 カルテを開く', () => {
             // ボタンを非アクティブ化
             btn.disableInteractive();
             if (btn.updateColor) btn.updateColor(0x7f8c8d, 0x555555); // グレーアウト
             
             this._playSE('se_paper');
             // 🆕 チュートリアル: カルテを開くイベント発火
             TutorialManager.getInstance(this.game).completeStep('KARTE_OPENED');
             this._showMedicalRecordStamping(data, x, y);
        }, BTN_WIDTH, '#5D4037', 0xFFFFFF, 0x000);
        this.stepUI.push(btn);
        
        // 🆕 チュートリアル: カルテを開くボタンを登録
        TutorialManager.getInstance(this.game).registerButton('karte_open_button', btn);
    }
    
    _showMedicalRecordStamping(data, x, y) {
        this._playSE('se_paper', { volume: 0.8 }); 
        this._showGuideText(x, y, 'カルテを開いて記録を作成\n(ドラッグで移動できます)');

        const containerYOffset = -350; 
        const mainContainer = this.add.container(x, y + containerYOffset);
        mainContainer.setDepth(2000);
        this.stepUI.push(mainContainer);

        const paperWidth = 450; const paperHeight = 636;
        const binderWidth = 480; const binderHeight = 660;

        const binderColor = (data.insuranceCategory||'').includes('国保') ? 0xE74C3C : 
                            ((data.insuranceCategory||'').includes('後期') ? 0x9B59B6 : 0x3498DB);
        
        const binder = this.add.rectangle(0, 0, binderWidth, binderHeight, binderColor).setStrokeStyle(4, 0x333333);
        const paper = this.add.rectangle(0, 0, paperWidth, paperHeight, 0xFFFFFF).setStrokeStyle(1, 0xCCCCCC);
        
        mainContainer.add([binder, paper]);
        mainContainer.setInteractive(new Phaser.Geom.Rectangle(-binderWidth/2, -binderHeight/2, binderWidth, binderHeight), Phaser.Geom.Rectangle.Contains);
        mainContainer.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
        });

        // --- ヘッダー ---
        const topY = -paperHeight/2 + 30;
        const title = this.add.text(-180, topY, '様式第一号（一）の２', { fontSize: '12px', color: '#333', fontFamily: 'Serif', resolution: 2 });
        const header = this.add.text(0, topY + 30, '診療録 (Medical Record)', { fontSize: '24px', color: '#000', fontFamily: 'Serif', resolution: 2 }).setOrigin(0.5);
        
        const infoY = topY + 80;
        const infoBox = this.add.rectangle(0, infoY, paperWidth - 40, 50, 0xFFFFFF).setStrokeStyle(1, 0x000000);
        const patientInfo = this.add.text(-200, infoY, `ID: ${data.insuranceDetails['ID'] || '-----'}   氏名: ${data.name}`, { fontSize: '20px', color: '#000', fontFamily: 'Serif', resolution: 2 }).setOrigin(0, 0.5);

        const line = this.add.line(0, 0, -210, infoY + 35, 210, infoY + 35, 0x000000).setOrigin(0);
        mainContainer.add([title, header, infoBox, patientInfo, line]);

        // 中心線
        const centerLineY1 = infoY + 40; const centerLineY2 = paperHeight/2 - 100;
        const centerLine = this.add.line(0, 0, 0, centerLineY1, 0, centerLineY2, 0xCCCCCC).setOrigin(0);
        mainContainer.add(centerLine);

        if (typeof data.stampDate === 'undefined') data.stampDate = false;
        if (typeof data.stampInsurance === 'undefined') data.stampInsurance = null;
        if (typeof data.stampUrine === 'undefined') data.stampUrine = false;

        // --- 完了ボタン ---
        const btnY = paperHeight/2 - 60;
        const finishBtn = this._createPopButton(0, btnY, '✨ 受付完了', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();

            // 🆕 チュートリアル中は期待されるステップかチェック
            const tm = TutorialManager.getInstance(this.game);
            if (tm.isActive) {
                const canComplete = tm.checkStepExpects('RECEPTION_COMPLETED');
                if (!canComplete) {
                    // 期待されるステップでない場合はブロック
                    tm.completeStep('RECEPTION_COMPLETED'); // リトライメッセージ表示
                    return; // 処理を中断
                }
            }

            // 🆕 再診受付票のミス検出
            let receptionErrorCount = 0;
            const receptionErrorFields = [];
            
            // 日付印確認
            if (!data.stampDate) {
                receptionErrorCount++;
                receptionErrorFields.push('date');
            }
            
            // 保険確認印（paper または myNumber を正しく選択しているか）
            const correctInsurance = data.insuranceType === 'myNumber' ? 'myNumber' : 'paper';
            if (data.stampInsurance !== correctInsurance) {
                receptionErrorCount++;
                receptionErrorFields.push('insurance');
            }
            
            // 検尿印確認（必要な場合のみ）
            if (data.needsUrine && !data.stampUrine) {
                receptionErrorCount++;
                receptionErrorFields.push('urine');
            }
            
            console.log(`[ReceptionScene] 再診受付票ミス検出: ${receptionErrorCount}件`, receptionErrorFields);

            // 🆕 チュートリアル: 受付完了イベント（エラー情報付き）
            TutorialManager.getInstance(this.game).completeStep('RECEPTION_COMPLETED', {
                errorCount: receptionErrorCount,
                errorFields: receptionErrorFields
            });

            finishBtn.list[0].disableInteractive(); 
            this.input.off('drag');
            
            // 🎬 演出再生後に完了処理へ（受付票と同じ演出）
            this._playCompletionAnimation(mainContainer, () => {
                this._finalizeReception(data);
            });
            
        }, BTN_WIDTH * 0.7, '#000000', 0xFFFFFF, 0x000000);

        // 🆕 チュートリアル: ボタン登録
        TutorialManager.getInstance(this.game).registerButton('reception_complete_button', finishBtn);

        finishBtn.updateColor(0x2ECC71, 0xFFFFFF);
        if (finishBtn.list[1]) finishBtn.list[1].setColor('#000000').setResolution(2);
        mainContainer.add(finishBtn);

        // --- レイアウト座標 ---
        const contentStartY = -150; const leftX = -100; const rightX = 100;
        const labelStyle = { fontSize: '18px', color: '#333', resolution: 2, padding: { top: 10, bottom: 10 } };

        // --- ① 日付印エリア ---
        const dateY = contentStartY;
        const dateLabel = this.add.text(leftX, dateY, '【日付】', labelStyle).setOrigin(0.5);
        const dateZone = this.add.rectangle(leftX, dateY + 60, 80, 80, 0xEEEEEE).setStrokeStyle(1, 0x999999).setInteractive({ useHandCursor: true });
        const dateHint = this.add.text(leftX, dateY + 60, '押印', { fontSize: '16px', color: '#AAA', resolution: 2 }).setOrigin(0.5);
        const dateMark = this.add.text(leftX, dateY + 60, '20XX年\nXX月XX日', {
            fontSize: '16px', color: '#E74C3C', align: 'center', fontFamily: 'Serif',
            border: '2px solid #E74C3C', borderRadius: 20, padding: 4, resolution: 2
        }).setOrigin(0.5).setAlpha(0).setRotation(-0.1);

        if (data.stampDate) { dateHint.setVisible(false); dateMark.setAlpha(1); }

        dateZone.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            if (data.stampDate) {
                const effectX = mainContainer.x + leftX;
                const effectY = mainContainer.y + dateY + 60;
                this._playCorrectionTape(effectX, effectY, 100, 40, () => {
                    data.stampDate = false;
                    dateMark.setAlpha(0);
                    dateHint.setVisible(true);
                });
            } else {
                this._playSE('se_paper', { volume: 1.5 });
                data.stampDate = true;
                dateHint.setVisible(false);
                dateMark.setAlpha(1).setScale(1.5);
                this.tweens.add({ targets: dateMark, scale: 1, duration: 200, ease: 'Bounce.Out' });
            }
        });
        // 🆕 チュートリアル: 日付印エリア登録
        TutorialManager.getInstance(this.game).registerButton('stamp_date_area', dateZone);
        mainContainer.add([dateLabel, dateZone, dateHint, dateMark]);

        // --- 処方薬スペース（受付時は非表示） ---
        const rxY = dateY + 160;
        const rxBox = this.add.rectangle(leftX, rxY + 50, 180, 120, 0xFFFFFF).setStrokeStyle(1, 0xCCCCCC); 
        const rxLabel = this.add.text(leftX, rxY, '【処方薬】', { ...labelStyle, color: '#777' }).setOrigin(0.5);
        const rxNote = this.add.text(leftX, rxY + 50, '(会計時に\n追記されます)', { 
            fontSize: '14px', 
            color: '#AAA', 
            align: 'center', 
            resolution: 2
        }).setOrigin(0.5);
        mainContainer.add([rxBox, rxLabel, rxNote]);

        // --- ② 保険選択エリア ---
        const insY = contentStartY;
        const insLabel = this.add.text(rightX, insY, '【保険確認】', labelStyle).setOrigin(0.5);
        const optPaper = this.add.text(rightX, insY + 30, '保険証', { fontSize: '20px', color: '#000', resolution: 2 }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        const optMyNa = this.add.text(rightX, insY + 70, 'マイナ', { fontSize: '20px', color: '#000', resolution: 2 }).setOrigin(0.5).setInteractive({ useHandCursor: true });

        const circleMark = this.add.graphics().setVisible(false);
        const drawCircle = (type) => {
            const targetY = (type === 'paper') ? (insY + 30) : (insY + 70);
            circleMark.clear().setVisible(true);
            circleMark.lineStyle(3, 0xFF0000, 1);
            circleMark.strokeEllipse(rightX, targetY, 140, 40);
        };
        mainContainer.add(circleMark); 
        
        if (data.stampInsurance) drawCircle(data.stampInsurance);

        optPaper.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            data.stampInsurance = 'paper';
            drawCircle('paper');
            this._playSE('se_scroll', { volume: 0.5, rate: 2.0 });
        });
        optMyNa.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            data.stampInsurance = 'myNumber';
            drawCircle('myNumber');
            this._playSE('se_scroll', { volume: 0.5, rate: 2.0 });
        });
        // 🆕 チュートリアル: 保険印選択肢登録
        TutorialManager.getInstance(this.game).registerButton('stamp_option_paper', optPaper);
        TutorialManager.getInstance(this.game).registerButton('stamp_option_myna', optMyNa);
        mainContainer.add([insLabel, optPaper, optMyNa]);

        // --- ③ 検尿印エリア ---
        const urineY = insY + 130; 
        const urineLabel = this.add.text(rightX, urineY, '【検査実施】', labelStyle).setOrigin(0.5);
        const urineZone = this.add.rectangle(rightX, urineY + 50, 80, 80, 0xEEEEEE).setStrokeStyle(1, 0x999999).setInteractive({ useHandCursor: true });
        const urineHint = this.add.text(rightX, urineY + 50, '検尿\n押印', { fontSize: '16px', color: '#AAA', align: 'center', resolution: 2 }).setOrigin(0.5);
        const urineMark = this.add.text(rightX, urineY + 50, '検尿\n済', {
            fontSize: '20px', color: '#F39C12', align: 'center', fontFamily: 'Serif',
            border: '2px solid #F39C12', padding: 2, resolution: 2
        }).setOrigin(0.5).setAlpha(0).setRotation(0.05);

        if (data.stampUrine) { urineHint.setVisible(false); urineMark.setAlpha(1); }

        urineZone.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            if (data.stampUrine) {
                const effectX = mainContainer.x + rightX;
                const effectY = mainContainer.y + urineY + 50;
                this._playCorrectionTape(effectX, effectY, 100, 40, () => {
                    data.stampUrine = false;
                    urineMark.setAlpha(0);
                    urineHint.setVisible(true);
                });
            } else {
                this._playSE('se_paper', { volume: 1.5 });
                data.stampUrine = true;
                urineHint.setVisible(false);
                urineMark.setAlpha(1).setScale(1.5);
                this.tweens.add({ targets: urineMark, scale: 1, duration: 200, ease: 'Bounce.Out' });
            }
        });
        // 🆕 チュートリアル: 検尿印エリア登録
        TutorialManager.getInstance(this.game).registerButton('stamp_urine_area', urineZone);
        mainContainer.add([urineLabel, urineZone, urineHint, urineMark]);

        this.input.setDraggable(mainContainer);
        this.input.off('drag');
        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            if (gameObject === mainContainer) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }
        });
    }
    
    // ==========================================================
    // 📝 ルートB: カルテ不要（新規）の受付票フロー
    // ==========================================================
    _showNewPatientStamping(data, x, y) {
        this._playSE('se_paper', { volume: 0.8 });
        this._showGuideText(x, y+100, '受付票を作成してください\n(ドラッグで移動できます)');

        const containerYOffset = -300; 
        const mainContainer = this.add.container(x, y + containerYOffset);
        mainContainer.setDepth(2000); 
        this.stepUI.push(mainContainer);

        // --- 1. 受付票の背景 ---
        const paperWidth = 450;
        const paperHeight = 636;
        const paper = this.add.rectangle(0, 0, paperWidth, paperHeight, 0xFFFFFF).setStrokeStyle(2, 0x555555);

        mainContainer.setInteractive(new Phaser.Geom.Rectangle(-paperWidth/2, -paperHeight/2, paperWidth, paperHeight), Phaser.Geom.Rectangle.Contains);
        mainContainer.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
        });

        const clip = this.add.rectangle(0, -paperHeight/2 + 20, 180, 40, 0x444444).setStrokeStyle(2, 0x000000);
        mainContainer.add([paper, clip]);

        const dateText = this.add.text(paperWidth/2 - 10, -paperHeight/2 + 50, '20XX年XX月XX日', {
            fontSize: '16px', color: '#000', fontFamily: 'Serif', resolution: 2, padding: { top: 5 }
        }).setOrigin(1, 0.5); 
        mainContainer.add(dateText);

        // --- 2. タイトルと情報 ---
        const startY = -paperHeight/2 + 80;
        const title = this.add.text(0, startY, '新規患者 受付票', {
            fontSize: '28px', color: '#000', fontFamily: '"Noto Sans JP"', fontStyle: 'bold',
            resolution: 2, padding: { top: 10, bottom: 10 }
        }).setOrigin(0.5);

        const infoY = startY + 60;
        
        // タイピング完了フラグの初期化
        if (typeof data.typedId === 'undefined') data.typedId = null;
        if (typeof data.typedName === 'undefined') data.typedName = null;
        if (typeof data.idTypingMistakes === 'undefined') data.idTypingMistakes = 0;
        
        // --- ID入力エリア (クリックで入力開始) ---
        const idLabel = this.add.text(-180, infoY, 'ID:', {
            fontSize: '18px', color: '#333', fontFamily: 'Arial', resolution: 2
        });
        
        const idValue = this.add.text(-150, infoY, data.typedId || '____', {
            fontSize: '20px', color: data.typedId ? '#000' : '#999', fontFamily: 'Courier', resolution: 2,
            backgroundColor: '#FFFFFF', padding: { x: 5, y: 2 }
        });
        
        const idHitArea = this.add.rectangle(-100, infoY, 120, 40, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        
        idHitArea.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this._launchSimpleTyping(data, 'id', idValue, mainContainer);
        });
        
        // --- 名前入力エリア (クリックで入力開始) ---
        const nameLabel = this.add.text(30, infoY, '氏名:', {
            fontSize: '18px', color: '#333', fontFamily: 'Arial', resolution: 2
        });
        
        const nameValue = this.add.text(80, infoY, data.typedName || '________', {
            fontSize: '20px', color: data.typedName ? '#000' : '#999', fontFamily: '"Noto Sans JP"', resolution: 2,
            backgroundColor: '#FFFFFF', padding: { x: 5, y: 2 }
        });
        
        const nameHitArea = this.add.rectangle(140, infoY, 160, 40, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        
        nameHitArea.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this._launchSimpleTyping(data, 'name', nameValue, mainContainer);
        });

        // 🆕 チュートリアル: 入力エリア登録
        TutorialManager.getInstance(this.game).registerButton('id_input_area', idHitArea);
        TutorialManager.getInstance(this.game).registerButton('name_input_area', nameHitArea);
        
        const line1 = this.add.line(0, 0, -200, infoY + 40, 200, infoY + 40, 0x888888).setOrigin(0);
        mainContainer.add([title, idLabel, idHitArea, idValue, nameLabel, nameHitArea, nameValue, line1]);

        if (typeof data.selectedInsurance === 'undefined') data.selectedInsurance = null;
        if (typeof data.urineCheckChecked === 'undefined') data.urineCheckChecked = false;

        // --- 完了ボタン ---
        const btnY = paperHeight/2 - 60;
        
        const finishBtn = this._createPopButton(0, btnY, '✨ 受付完了', (pointer, localX, localY, event) => {
            if (event && event.stopPropagation) event.stopPropagation();
            
            // 🆕 チュートリアル中は期待されるステップかチェック
            const tm = TutorialManager.getInstance(this.game);
            if (tm.isActive) {
                const canComplete = tm.checkStepExpects('RECEPTION_COMPLETED');
                if (!canComplete) {
                    // 期待されるステップでない場合はブロック
                    tm.completeStep('RECEPTION_COMPLETED'); // リトライメッセージ表示
                    return; // 処理を中断
                }
            }
            
            // 🆕 受付票のミス検出
            let receptionErrorCount = 0;
            const receptionErrorFields = [];
            
            // ID確認（入力済みかつ正しいか）
            if (!data.typedId || data.typedId !== String(data.patientId)) {
                receptionErrorCount++;
                receptionErrorFields.push('ID');
            }
            
            // 名前確認
            if (!data.typedName || !data.typedName.includes(data.name.replace(/\s+/g, ''))) {
                receptionErrorCount++;
                receptionErrorFields.push('name');
            }
            
            // 保険種別確認
            const correctInsurance = data.insuranceType === 'myNumber' ? 'myNumber' : 'paper';
            if (data.selectedInsurance !== correctInsurance) {
                receptionErrorCount++;
                receptionErrorFields.push('insurance');
            }
            
            // 検尿確認（必要な場合のみ）
            if (data.needsUrine && !data.urineCheckChecked) {
                receptionErrorCount++;
                receptionErrorFields.push('urine');
            }
            
            console.log(`[ReceptionScene] 受付票ミス検出: ${receptionErrorCount}件`, receptionErrorFields);
            
            // 🆕 チュートリアル: 受付完了イベント（エラー情報付き）
            TutorialManager.getInstance(this.game).completeStep('RECEPTION_COMPLETED', {
                errorCount: receptionErrorCount,
                errorFields: receptionErrorFields
            });

            finishBtn.list[0].disableInteractive();
            this.input.off('drag');
            
            // 🎬 演出再生後に完了処理へ
            this._playCompletionAnimation(mainContainer, () => {
                this._finalizeReception(data);
            });
            
        }, BTN_WIDTH * 0.7, '#000000', 0xFFFFFF, 0x000000);

        // 🆕 チュートリアル: ボタン登録
        TutorialManager.getInstance(this.game).registerButton('reception_complete_button', finishBtn);

        finishBtn.updateColor(0x2ECC71, 0xFFFFFF);
        if (finishBtn.list[1]) finishBtn.list[1].setColor('#000000').setResolution(2);
        mainContainer.add(finishBtn);


        // --- ③ 保険種別 ---
        const radioY = infoY + 80;
        mainContainer.add(this.add.text(-180, radioY, '【保険種別】', { 
            fontSize: '18px', color: '#000', resolution: 2, padding: { top: 5 } 
        }).setOrigin(0, 0.5));

        const updateRadios = () => {
            this._refreshRadiosInContainer(mainContainer, 'radio_paper', 'radio_myna', data.selectedInsurance);
        };

        const btnIns = this._createSimpleRadio(-50, radioY, '保険証', data.selectedInsurance === 'paper', (event) => {
            if (event) event.stopPropagation();
            this._playSE('se_scroll', { volume: 0.5, rate: 2.0 });
            data.selectedInsurance = 'paper';
            updateRadios();
            // 🆕 チュートリアル: 保険選択イベント
            TutorialManager.getInstance(this.game).completeStep('INSURANCE_SELECTED');
        });
        const btnMyNa = this._createSimpleRadio(70, radioY, 'マイナ', data.selectedInsurance === 'myNumber', (event) => {
            if (event) event.stopPropagation();
            this._playSE('se_scroll', { volume: 0.5, rate: 2.0 });
            data.selectedInsurance = 'myNumber';
            updateRadios();
            // 🆕 チュートリアル: 保険選択イベント
            TutorialManager.getInstance(this.game).completeStep('INSURANCE_SELECTED');
        });
        btnIns.setName('radio_paper');
        btnMyNa.setName('radio_myna');
        mainContainer.add([btnIns, btnMyNa]);
        updateRadios();
        
        // 🆕 チュートリアル: ラジオボタン登録
        TutorialManager.getInstance(this.game).registerButton('radio_paper', btnIns);
        TutorialManager.getInstance(this.game).registerButton('radio_myna', btnMyNa);

        // --- ④ 検尿チェック ---
        const checkY = radioY + 60;
        const cbContainer = this._createCheckbox(0, checkY, '検尿実施済み', data.urineCheckChecked, (checked, event) => {
            if(event) event.stopPropagation();
            data.urineCheckChecked = checked;
            // 🆕 チュートリアル: 検尿チェックイベント
            TutorialManager.getInstance(this.game).completeStep('URINE_CHECKED');
        });
        mainContainer.add(cbContainer);
        
        // 🆕 チュートリアル: チェックボックス登録
        TutorialManager.getInstance(this.game).registerButton('urine_checkbox', cbContainer);

        // --- ⑤ 処方薬スペース（受付時は非表示） ---
        const spaceStartY = checkY + 40;
        const spaceHeight = btnY - spaceStartY - 50;
        const spaceBox = this.add.rectangle(0, spaceStartY + spaceHeight/2, paperWidth - 60, spaceHeight, 0xFFFFFF).setStrokeStyle(1, 0xCCCCCC);
        const spaceLabel = this.add.text(0, spaceStartY + 20, '【処方薬】', { 
            fontSize: '16px', color: '#AAAAAA', resolution: 2, padding: { top: 5 }
        }).setOrigin(0.5);
        
        const spaceContent = this.add.text(0, spaceStartY + spaceHeight/2 + 10, '(会計時に追記されます)', { 
            fontSize: '14px', color: '#AAA', resolution: 2, align: 'center'
        }).setOrigin(0.5);
        mainContainer.add([spaceBox, spaceLabel, spaceContent]);

        this.input.setDraggable(mainContainer);
        this.input.off('drag');
        this.input.on('drag', function (pointer, gameObject, dragX, dragY) {
            if (gameObject === mainContainer) {
                gameObject.x = dragX;
                gameObject.y = dragY;
            }
        });
    }

    // ==========================================================
    // ⌨️ 直接入力 (ID/名前用) - HTML入力でIME対応
    // ==========================================================
    _launchSimpleTyping(data, type, displayTextObj, parentContainer) {
        if (this._activeInputField) return;
        
        this._playSE('se_paper', { volume: 0.5 });
        
        let correctValue = '';
        let kanjiName = data.name || '';
        let furigana = '';
        
        if (type === 'id') {
            correctValue = String(data.insuranceDetails['ID'] || '');
        } else {
            furigana = data.insuranceDetails['フリガナ'] || data.insuranceDetails['カナ'] || '';
            correctValue = furigana;
        }

        let inputValue = '';
        if (type === 'id' && data.typedId) {
            inputValue = data.typedId;
        } else if (type === 'name' && data.typedName) {
            inputValue = data.typedName;
        }

        const paperWidth = 450;
        const paperHeight = 636;
        const blocker = this.add.rectangle(
            parentContainer.x, parentContainer.y, 
            paperWidth, paperHeight, 
            0x000000, 0
        ).setDepth(2500).setInteractive();

        this._activeInputField = true;
        displayTextObj.setVisible(false);

        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) {
            displayTextObj.setVisible(true);
            blocker.destroy();
            this._activeInputField = null;
            return;
        }
        
        const htmlInput = document.createElement('input');
        htmlInput.type = 'text';
        htmlInput.className = 'typing-html-input';
        htmlInput.autocomplete = 'off';
        htmlInput.spellcheck = false;
        htmlInput.value = inputValue;

        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        const scaleX = rect.width / 1920;
        const scaleY = rect.height / 1080;
        
        const containerX = parentContainer.x;
        const containerY = parentContainer.y;
        const fieldX = containerX + displayTextObj.x;
        const fieldY = containerY + displayTextObj.y;
        
        const inputWidth = type === 'id' ? 120 : 180;
        const htmlX = fieldX * scaleX;
        const htmlY = (fieldY - 15) * scaleY;
        
        htmlInput.style.left = `${htmlX}px`;
        htmlInput.style.top = `${htmlY}px`;
        htmlInput.style.width = `${inputWidth * scaleX}px`;
        htmlInput.style.height = `${30 * scaleY}px`;
        htmlInput.style.fontSize = `${Math.floor(16 * scaleY)}px`;
        
        if (type === 'id') {
            htmlInput.placeholder = '数字を入力...';
            htmlInput.inputMode = 'numeric';
        } else {
            htmlInput.placeholder = '日本語で入力...';
            htmlInput.inputMode = 'text';
        }
        
        gameContainer.appendChild(htmlInput);
        
        setTimeout(() => {
            htmlInput.focus();
            htmlInput.select();
        }, 50);

        const confirmInput = () => {
            if (!htmlInput.parentNode) return;
            inputValue = htmlInput.value;
            if (type === 'id') {
                data.typedId = inputValue;
                // 🆕 チュートリアル: ID入力完了
                TutorialManager.getInstance(this.game).completeStep('ID_ENTERED');
            } else {
                data.typedName = inputValue;
                // 🆕 チュートリアル: 名前入力完了
                TutorialManager.getInstance(this.game).completeStep('NAME_ENTERED');
            }
            cleanup();
        };
        
        htmlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === 'Escape') {
                e.preventDefault();
                confirmInput();
            }
        });
        
        blocker.on('pointerdown', () => {
            confirmInput();
        });

        let isCleanedUp = false;
        const cleanup = (playSE = true) => {
            if (isCleanedUp) return;
            isCleanedUp = true;
            
            if (playSE) this._playSE('se_paper', { volume: 0.4 });
            
            if (htmlInput.parentNode) {
                htmlInput.remove();
            }
            if (blocker.active) blocker.destroy();
            this._activeInputField = null;
            
            if (displayTextObj.active) {
                displayTextObj.setVisible(true);
                
                if (type === 'id') {
                    if (inputValue.length > 0) {
                        const correctId = data.insuranceDetails['ID'] ? String(data.insuranceDetails['ID']) : null;
                        
                        // 🆕 新規患者（ID未設定）の場合は入力されたIDをそのまま使用
                        if (!correctId || correctId === 'null') {
                            // 新規患者: 入力されたIDを採用
                            displayTextObj.setText(inputValue + ' ✅').setColor('#000');
                            data.typedId = inputValue;
                            console.log('[ReceptionScene] 新規患者のID設定:', inputValue);
                        } else {
                            // 既存患者: 正しいIDと照合
                            const isIdCorrect = (inputValue === correctId);
                            if (isIdCorrect) {
                                displayTextObj.setText(inputValue + ' ✅').setColor('#000');
                                data.typedId = correctId;
                            } else {
                                displayTextObj.setText(inputValue).setColor('#CC0000');
                                data.typedId = inputValue; // 間違いでも入力値を保持
                            }
                        }
                    }
                } else {
                    if (inputValue.length > 0) {
                        const isCorrect = this._checkNameInputWithKanji(inputValue, kanjiName, furigana);
                        if (isCorrect) {
                            displayTextObj.setText(kanjiName + ' ✅').setColor('#000');
                            data.typedName = kanjiName;
                        } else {
                            displayTextObj.setText(inputValue).setColor('#CC0000');
                        }
                    }
                }
            }
        };
        
        parentContainer.once('destroy', () => {
            cleanup(false);
        });
    }

    // ==========================================================
    // 🔍 名前入力チェック (漢字・カタカナ・ローマ字対応)
    // ==========================================================
    _checkNameInputWithKanji(inputValue, kanjiName, furigana) {
        // 🆕 スペースを正規化（全角・半角両方を除去）
        const normalize = (str) => (str || '').replace(/[\s　]+/g, '');
        
        const normalizedInput = normalize(inputValue);
        const normalizedKanji = normalize(kanjiName);
        const normalizedFurigana = normalize(furigana);
        
        if (normalizedInput === normalizedKanji) return true;
        if (normalizedInput === normalizedFurigana) return true;
        return this._checkNameInput(inputValue, furigana);
    }

    _checkNameInput(inputValue, furigana) {
        const romajiMap = {
            'ア': ['A'], 'イ': ['I'], 'ウ': ['U', 'WU'], 'エ': ['E'], 'オ': ['O'],
            'カ': ['KA', 'CA'], 'キ': ['KI'], 'ク': ['KU', 'CU', 'QU'], 'ケ': ['KE'], 'コ': ['KO', 'CO'],
            'サ': ['SA'], 'シ': ['SI', 'SHI'], 'ス': ['SU'], 'セ': ['SE'], 'ソ': ['SO'],
            'タ': ['TA'], 'チ': ['TI', 'CHI'], 'ツ': ['TU', 'TSU'], 'テ': ['TE'], 'ト': ['TO'],
            'ナ': ['NA'], 'ニ': ['NI'], 'ヌ': ['NU'], 'ネ': ['NE'], 'ノ': ['NO'],
            'ハ': ['HA'], 'ヒ': ['HI'], 'フ': ['HU', 'FU'], 'ヘ': ['HE'], 'ホ': ['HO'],
            'マ': ['MA'], 'ミ': ['MI'], 'ム': ['MU'], 'メ': ['ME'], 'モ': ['MO'],
            'ヤ': ['YA'], 'ユ': ['YU'], 'ヨ': ['YO'],
            'ラ': ['RA'], 'リ': ['RI'], 'ル': ['RU'], 'レ': ['RE'], 'ロ': ['RO'],
            'ワ': ['WA'], 'ヲ': ['WO'], 'ン': ['N', 'NN'],
            'ガ': ['GA'], 'ギ': ['GI'], 'グ': ['GU'], 'ゲ': ['GE'], 'ゴ': ['GO'],
            'ザ': ['ZA'], 'ジ': ['ZI', 'JI'], 'ズ': ['ZU'], 'ゼ': ['ZE'], 'ゾ': ['ZO'],
            'ダ': ['DA'], 'ヂ': ['DI'], 'ヅ': ['DU'], 'デ': ['DE'], 'ド': ['DO'],
            'バ': ['BA'], 'ビ': ['BI'], 'ブ': ['BU'], 'ベ': ['BE'], 'ボ': ['BO'],
            'パ': ['PA'], 'ピ': ['PI'], 'プ': ['PU'], 'ペ': ['PE'], 'ポ': ['PO'],
            'ッ': ['XTU', 'LTU'], ' ': [' '], '　': [' '], 'ー': ['-']
        };
        
        const compoundMap = {
            'キャ': ['KYA'], 'キュ': ['KYU'], 'キョ': ['KYO'],
            'シャ': ['SYA', 'SHA'], 'シュ': ['SYU', 'SHU'], 'ショ': ['SYO', 'SHO'],
            'チャ': ['TYA', 'CHA'], 'チュ': ['TYU', 'CHU'], 'チョ': ['TYO', 'CHO'],
            'ニャ': ['NYA'], 'ニュ': ['NYU'], 'ニョ': ['NYO'],
            'ヒャ': ['HYA'], 'ヒュ': ['HYU'], 'ヒョ': ['HYO'],
            'ミャ': ['MYA'], 'ミュ': ['MYU'], 'ミョ': ['MYO'],
            'リャ': ['RYA'], 'リュ': ['RYU'], 'リョ': ['RYO'],
            'ギャ': ['GYA'], 'ギュ': ['GYU'], 'ギョ': ['GYO'],
            'ジャ': ['ZYA', 'JA', 'JYA'], 'ジュ': ['ZYU', 'JU', 'JYU'], 'ジョ': ['ZYO', 'JO', 'JYO'],
            'ビャ': ['BYA'], 'ビュ': ['BYU'], 'ビョ': ['BYO'],
            'ピャ': ['PYA'], 'ピュ': ['PYU'], 'ピョ': ['PYO']
        };
        
        const normalizedInput = inputValue.replace(/\s+/g, ' ').trim().toUpperCase();
        
        const generatePatterns = (kanaStr) => {
            let patterns = [''];
            let i = 0;
            while (i < kanaStr.length) {
                const char = kanaStr[i];
                const nextChar = kanaStr[i + 1];
                
                const compound = char + (nextChar || '');
                if (compoundMap[compound]) {
                    const newPatterns = [];
                    for (const p of patterns) {
                        for (const romaji of compoundMap[compound]) {
                            newPatterns.push(p + romaji);
                        }
                    }
                    patterns = newPatterns;
                    i += 2;
                    continue;
                }
                
                if (char === 'ッ' && nextChar) {
                    const nextRomajis = compoundMap[nextChar + (kanaStr[i + 2] || '')] || 
                                        romajiMap[nextChar] || [nextChar];
                    const newPatterns = [];
                    for (const p of patterns) {
                        for (const romaji of nextRomajis) {
                            const firstChar = romaji[0];
                            if (firstChar.match(/[A-Z]/) && !'AIUEO'.includes(firstChar)) {
                                newPatterns.push(p + firstChar);
                            }
                        }
                        newPatterns.push(p + 'XTU');
                    }
                    patterns = newPatterns;
                    i++;
                    continue;
                }
                
                const romajis = romajiMap[char] || [char];
                const newPatterns = [];
                for (const p of patterns) {
                    for (const romaji of romajis) {
                        newPatterns.push(p + romaji);
                    }
                }
                patterns = newPatterns;
                i++;
            }
            return patterns;
        };
        
        const validPatterns = generatePatterns(furigana);
        return validPatterns.some(p => p.replace(/\s+/g, ' ').trim() === normalizedInput);
    }

    // ==========================================================
    // 🛠️ 補助関数: ラジオボタンやチェックボックスの生成・更新
    // ==========================================================
    _createSimpleRadio(x, y, label, isSelected, onClick) {
        const container = this.add.container(x, y);
        
        const circle = this.add.circle(0, 0, 15, isSelected ? 0x0000FF : 0xFFFFFF).setStrokeStyle(2, 0x000000);
        const text = this.add.text(25, 0, label, { 
            fontSize: '20px', color: '#000', resolution: 2, padding: { top: 5 } 
        }).setOrigin(0, 0.5);
        
        const hitArea = new Phaser.Geom.Rectangle(-25, -30, 160, 60);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        
        container.on('pointerdown', (pointer, localX, localY, event) => {
             onClick(event); 
        });
        
        container.add([circle, text]);
        return container;
    }

    _refreshRadiosInContainer(container, name1, name2, selectedType, callback) {
        const pBtn = container.list.find(o => o.name === name1);
        const mBtn = container.list.find(o => o.name === name2);

        if (pBtn) {
            pBtn.list[0].setFillStyle(selectedType === 'paper' ? 0x3498DB : 0xFFFFFF);
        }
        if (mBtn) {
            mBtn.list[0].setFillStyle(selectedType === 'myNumber' ? 0xE67E22 : 0xFFFFFF);
        }
        
        if (callback) callback();
    }

    _createCheckbox(x, y, label, isChecked, onChange) {
        const container = this.add.container(x, y);
        
        const box = this.add.rectangle(-100, 0, 30, 30, 0xFFFFFF).setStrokeStyle(2, 0x000000);
        const checkMark = this.add.text(-100, 0, '✔', { 
            fontSize: '28px', color: '#0000FF', resolution: 2, padding: { top: 5 } 
        }).setOrigin(0.5).setVisible(isChecked);
        const text = this.add.text(-70, 0, label, { 
            fontSize: '22px', color: '#000', resolution: 2, padding: { top: 5 } 
        }).setOrigin(0, 0.5);

        container.add([box, checkMark, text]);
        
        const hitArea = new Phaser.Geom.Rectangle(-120, -25, 240, 50);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

        container.on('pointerdown', (pointer, localX, localY, event) => {
            if (event) event.stopPropagation();
            this._playSE('se_scroll', { volume: 0.5, rate: 2.0 });
            isChecked = !isChecked;
            checkMark.setVisible(isChecked);
            if (onChange) onChange(isChecked, event);
        });
        
        return container;
    }
    
    // ===================================
    // Helpers
    // ===================================
    _createPopButton(x, y, text, onClick, width=BTN_WIDTH, textColor='#000', bgColor=0xFFFFFF, strokeColor=0x000, align='center') {
        const c = this.add.container(x, y);
        c.currentBgColor = bgColor; c.currentStrokeColor = strokeColor;
        const h = BTN_HEIGHT;
        
        const bg = this.add.graphics();
        const hit = new Phaser.Geom.Rectangle(-width/2, -h/2, width, h);
        bg.setInteractive(hit, Phaser.Geom.Rectangle.Contains);
        
        const refresh = (f, s) => {
            bg.clear(); bg.fillStyle(f, 1); bg.lineStyle(4, s, 1);
            bg.fillRoundedRect(-width/2, -h/2, width, h, 12);
            bg.strokeRoundedRect(-width/2, -h/2, width, h, 12);
        };
        refresh(bgColor, strokeColor);
        
        const t = this.add.text(0, 0, text, {fontSize:'26px', fontFamily:'"Noto Sans JP"', color:textColor});
        if(align === 'left') { t.setOrigin(0, 0.5); t.x = -width/2 + 40; } else { t.setOrigin(0.5); }
        
        bg.on('pointerover', () => { c.setScale(1.02); });
        bg.on('pointerout', () => { c.setScale(1.0); });
        bg.on('pointerdown', onClick);
        
        c.add([bg, t]);
        c.setDepth(200);
        c.updateColor = (bgC, stC) => { c.currentBgColor = bgC; c.currentStrokeColor = stC; refresh(bgC, stC); };
        return c;
    }
    
    _showGuideText(x, y, text) {
        if(this.currentGuideText) this.currentGuideText.destroy();
        
        // プレミアムガイドテキスト（ピルバッジスタイル）
        const container = this.add.container(x, y).setDepth(200);
        
        // テキスト作成（サイズ計測用）
        const textObj = this.add.text(0, 0, text, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            align: 'center',
            lineSpacing: 8
        }).setOrigin(0.5);
        
        // 背景バッジ
        const padding = { x: 24, y: 12 };
        const bgWidth = textObj.width + padding.x * 2;
        const bgHeight = textObj.height + padding.y * 2;
        
        const bg = this.add.graphics();
        // グラデーション風背景
        bg.fillStyle(0x1A1A2E, 0.9);
        bg.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 20);
        // ボーダー（ゴールドアクセント）
        bg.lineStyle(2, 0xFFD700, 0.8);
        bg.strokeRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 20);
        
        container.add([bg, textObj]);
        
        // 登場アニメーション
        container.setAlpha(0).setScale(0.8);
        this.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            duration: 200,
            ease: 'Back.Out'
        });
        
        this.currentGuideText = container;
        this.stepUI.push(container);
    }
    
    _clearStepUI() {
        this.stepUI.forEach(u => u.destroy());
        this.stepUI = [];
        if(this.currentGuideText) { this.currentGuideText.destroy(); this.currentGuideText=null; }
    }
    
    _resetInteraction(resetSelection=true) {
        this._clearStepUI();
        this.activePatientUI.forEach(u => u.destroy());
        this.activePatientUI = [];
        this.isPanelShowing = false;
        this.setAccountingButtonActive(true);
        if(resetSelection) {
            this.patientManager.patientQueue.forEach(p => { p.button.clearTint(); p.nameTag.setAlpha(1); });
            this.currentPatientIndex = -1;
            const hud = this.scene.get('HUDScene');
            if(hud && hud.hideInsuranceGuide) hud.hideInsuranceGuide();
        }
        if(this.prescriptionBadge) this.prescriptionBadge.setVisible(this.delayedAccountingQueue.length > 0);
    }
    
    _playCorrectionTape(x, y, w, h, onComp) {
        this._playSE('se_correction_tape');
        const tape = this.add.rectangle(x-w/2, y, 0, h, 0xFFFFFF).setOrigin(0, 0.5).setDepth(2005);
        this.tweens.add({targets:tape, width:w, duration:300});
        this.time.delayedCall(400, () => {
             tape.destroy(); if(onComp) onComp();
        });
    }

    // ==========================================================
    // 🏁 最終完了処理 (スコアログ用に履歴保存追加)
    // ==========================================================
    _finalizeReception(data) {
        
        // --- 最終チェック ---
        if (data.needsMedicalRecord) {
            // カルテルート（再診患者）のチェック
            if (!data.stampDate) this._recordMistake(data, 10, 'カルテ: 日付印忘れ');
            if (!data.stampInsurance) {
                this._recordMistake(data, 10, 'カルテ: 保険確認忘れ');
            } else {
                if (data.stampInsurance !== data.insuranceType) this._recordMistake(data, 10, 'カルテ: 保険種別不一致');
            }
            // 🚨 検尿判定ロジック (修正版)
            if (data.testNeeded) {
                // 検尿が必要な患者: スタンプが必要
                if (!data.stampUrine) this._recordMistake(data, 10, 'カルテ: 検尿印忘れ');
            } else if (data.playerGaveCup) {
                // 🚨 NEW: 検尿不要だったがカップを渡した場合
                // → スタンプを押していれば正解、押していなければ不正解
                if (!data.stampUrine) this._recordMistake(data, 10, 'カルテ: 検尿印忘れ\n(渡したのに未記録)');
            } else {
                // 検尿不要でカップも渡していない: スタンプがあれば過剰
                if (data.stampUrine) this._recordMistake(data, 10, 'カルテ: 検尿印過剰');
            }
            
            // カルテにはID/氏名入力欄がないため、入力バリデーションは不要
        } else {
            // 受付票ルート（新規患者）のチェック
            if (!data.selectedInsurance) {
                this._recordMistake(data, 10, '受付票: 保険確認忘れ');
            } else {
                if (data.selectedInsurance !== data.insuranceType) this._recordMistake(data, 10, '受付票: 保険種別不一致');
            }
            // 🚨 検尿判定ロジック (受付票版・修正版)
            if (data.testNeeded) {
                // 検尿が必要な患者: チェックが必要
                if (!data.urineCheckChecked) this._recordMistake(data, 10, '受付票: 検尿チェック漏れ');
            } else if (data.playerGaveCup) {
                // 🚨 NEW: 検尿不要だったがカップを渡した場合
                // → チェックしていれば正解、していなければ不正解
                if (!data.urineCheckChecked) this._recordMistake(data, 10, '受付票: 検尿チェック漏れ\n(渡したのに未記録)');
            } else {
                // 検尿不要でカップも渡していない: チェックがあれば過剰
                if (data.urineCheckChecked) this._recordMistake(data, 10, '受付票: 検尿チェック過剰');
            }
            
            // 🚨 NEW: 受付票のID/名前入力ミスのペナルティ
            if (data.idTypingMistakes && data.idTypingMistakes > 0) {
                this._recordMistake(data, 10, '受付票: ID入力ミス');
            }
            // 🚨 NEW: IDが未入力の場合のペナルティ
            if (!data.typedId || data.typedId.trim() === '') {
                this._recordMistake(data, 10, '受付票: ID未入力');
            }
            // 名前入力チェック: typedNameがあり、正しい名前と不一致なら減点
            // 🔹 修正: _checkNameInputWithKanjiを使用して漢字名も正解として判定
            if (data.typedName) {
                const kanjiName = data.name || '';
                const furigana = data.insuranceDetails['フリガナ'] || data.insuranceDetails['カナ'] || '';
                const normalizedTypedName = data.typedName.trim().replace(/\s+/g, ' ');
                const normalizedKanjiName = kanjiName.trim().replace(/\s+/g, ' ');
                
                // 漢字名と完全一致ならOK（cleanup時に更新済み）
                let isCorrect = (normalizedTypedName === normalizedKanjiName);
                
                // 一致しなければ詳細チェック
                if (!isCorrect) {
                    isCorrect = this._checkNameInputWithKanji(data.typedName, kanjiName, furigana);
                }
                
                console.log('[_finalizeReception 名前判定] typedName:', JSON.stringify(data.typedName), 
                    'kanjiName:', JSON.stringify(kanjiName), 'isCorrect:', isCorrect);
                
                if (!isCorrect) {
                    this._recordMistake(data, 10, '受付票: 氏名入力ミス');
                }
            } else {
                // 🚨 NEW: 名前が未入力の場合のペナルティ
                this._recordMistake(data, 10, '受付票: 氏名未入力');
            }
        }

        // --- スコア判定 ---
        const mistake = data.currentMistakePoints || 0;
        let rank = 'perfect'; 
        let addPoint = 0;
        let stampText = '';
        let stampColor = '';

        if (mistake <= 5) {
            rank = 'perfect';
            addPoint = 40;
            stampText = '受 付\n完 了';
            // 🔊 修正: フルネーム (se_reception_completed)
            this._playSE('se_reception_completed', { volume: 0.8 }); 
            stampColor = '#ff3333'; 
        } else if (mistake <= 15) {
            rank = 'warning';
            addPoint = 20;
            stampText = '要\n注 意'; 
            // 🔊 修正: フルネーム (se_caution_required)
            this._playSE('se_caution_required', { volume: 0.8 }); 
            stampColor = '#F39C12'; 
        } else {
            rank = 'bad';
            addPoint = -10;
            stampText = '対 応\n不 備';
            // 🔊 修正: フルネーム (se_inadequate_response)
            this._playSE('se_inadequate_response', { volume: 0.8 }); 
            stampColor = '#2C3E50'; 
        }
        
        // 🆕 順番スキップペナルティを計算
        // 患者がキュー内で何番目かを確認（問診記入中の患者は除外）
        let queuePosition = 0;
        if (this.patientManager && this.patientManager.patientQueue) {
            const queue = this.patientManager.patientQueue.filter(p => {
                if (p.isFinished) return false;
                // 問診記入中の患者はスキップ対象としてカウントしない
                if (p.needsQuestionnaire && !p.questionnaireCompleted) return false;
                return true;
            });
            const patientIndex = queue.findIndex(p => 
                p.name === data.name || 
                (p.insuranceDetails?.ID === data.insuranceDetails?.ID)
            );
            queuePosition = patientIndex >= 0 ? patientIndex : 0;
            
            console.log('[Reception Skip Debug] キュー:', queue.map(p => p.name));
            console.log('[Reception Skip Debug] 患者Index:', patientIndex, '→ queuePosition:', queuePosition);
        }
        
        // 順番スキップペナルティ適用（先頭=0は減算なし、2番目=1で-10pt、...）
        const skipPenalty = queuePosition * 10;
        if (skipPenalty > 0 && addPoint > 0) {
            // ペナルティ適用（ただし減点時は適用しない）
            addPoint = Math.max(0, addPoint - skipPenalty);
            console.log('[Reception Skip Debug] ペナルティ適用:', skipPenalty, '→ 最終得点:', addPoint);
            this._recordMistake(data, skipPenalty, `順番スキップ: ${queuePosition}人抜かし`);
        }

        this.totalScore += addPoint;
        console.log(`[Score] ${data.name}: ミス${mistake}点 / 評価:${rank} / 得点:${addPoint} (スキップ: ${queuePosition}人)`);
        
        // 🚨 修正: HUDにスコアを追加 (グローバルスコアとして反映)
        const hud = this.scene.get('HUDScene');
        if (hud && hud.addScore) {
            // 🔹 ランクに応じた詳細なコメントを追加
            let scoreReason = '受付完了';
            if (rank === 'perfect') {
                scoreReason = '受付完了: 完璧な対応';
            } else if (rank === 'warning') {
                scoreReason = '受付完了: 要注意(軽微なミスあり)';
            } else {
                scoreReason = '受付完了: 対応不備(減点)';
            }
            
            // 🆕 スキップペナルティがある場合は理由に追加
            if (skipPenalty > 0 && addPoint >= 0) {
                scoreReason += ` (順番スキップ: -${skipPenalty})`;
            }
            
            hud.addScore(addPoint, scoreReason, true);
            
            // 🚨 修正: ログを患者データに保存して、HUDログはリセット (次の患者のため)
            // これにより CheckScene でこのログを復元できる
            if (hud.getCurrentPatientLog) {
                data.scoreHistory = hud.getCurrentPatientLog();
                hud.resetCurrentPatientLog();
            }
        }

        // 🚨 修正: 受付完了時に履歴に追加 (PaymentSceneで更新される)
        // 🆕 earnedScoreを設定（スコアレポートで使用）
        data.earnedScore = addPoint;  // 受付時点の獲得ポイント（スキップペナルティ適用後）
        
        if (!this.patientHistory) this.patientHistory = [];
        if (!this.patientHistory.includes(data)) {
            this.patientHistory.push(data);
        }

        // 終了処理コールバック
        const onComplete = () => {
            this._finishPatientProcess(data);
        };

        // 結果演出 (コールバックを渡す)
        this._completionStamp(stampText, stampColor, rank, addPoint, onComplete);

        // ミスログ表示
        if (data.mistakeLog && data.mistakeLog.length > 0) {
            this._showMistakeLog(data);
        }
        
        // --- Remove from record list if applicable ---
        const id = data.insuranceDetails['ID'];
        if (id && hud && hud.removeRecord) {
            hud.removeRecord(id);
        }
    }
    
    // ===================================
    // ✨ 受付完了演出（スタンプ＆スライド）
    // ===================================
    _playCompletionAnimation(container, onComplete) {
        // 1. スタンプ作成
        const stampGroup = this.add.container(0, 0);
        
        // 外枠（二重丸）
        const outerCircle = this.add.circle(0, 0, 70).setStrokeStyle(5, 0xE74C3C);
        const innerCircle = this.add.circle(0, 0, 62).setStrokeStyle(2, 0xE74C3C);
        
        // テキスト
        const stampText = this.add.text(0, 0, '受付済', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#E74C3C',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 日付
        const dateText = this.add.text(0, 42, '20XX.XX.XX', {
            fontSize: '14px',
            fontFamily: 'Serif',
            color: '#E74C3C'
        }).setOrigin(0.5);
        
        stampGroup.add([outerCircle, innerCircle, stampText, dateText]);
        stampGroup.setAngle(-15); // ちょっと傾ける
        stampGroup.setScale(3);   // 最初はデカく
        stampGroup.setAlpha(0);
        
        container.add(stampGroup); // コンテナに追加（一緒に動くように）
        
        // 2. スタンプアニメーション（ドンッ！）
        this.tweens.add({
            targets: stampGroup,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.Out',
            onStart: () => {
                this._playSE('se_stamp', { volume: 1.0 }); // なければ se_decision
            },
            onComplete: () => {
                // 3. 画面シェイク＆パーティクル
                this.cameras.main.shake(100, 0.005);
                
                // パーティクル（簡易的な星などを飛ばす）
                for(let i=0; i<8; i++) {
                    const angle = i * (360/8);
                    const rad = Phaser.Math.DegToRad(angle);
                    const star = this.add.text(0, 0, '✨', { fontSize: '20px' }).setOrigin(0.5);
                    container.add(star);
                    
                    this.tweens.add({
                        targets: star,
                        x: Math.cos(rad) * 120,
                        y: Math.sin(rad) * 120,
                        alpha: 0,
                        scale: 0.5,
                        angle: 180,
                        duration: 600,
                        ease: 'Power2'
                    });
                }
                
                // 4. 少し待ってからスライドアウト
                this.time.delayedCall(600, () => {
                    this._playSE('se_paper', { volume: 0.8 });
                    
                    this.tweens.add({
                        targets: container,
                        x: container.x + 800, // 右へスライド
                        y: container.y - 50,  // 少し上へ
                        alpha: 0,
                        rotation: 0.2, // 少し回転
                        duration: 500,
                        ease: 'Back.In',
                        onComplete: () => {
                            if (onComplete) onComplete();
                        }
                    });
                });
            }
        });
    }

    // ===================================
    // 🔔 問診票記入完了のアクティブコール
    // ===================================
    _playActiveCallEffect(patientData) {
        if (!patientData.visuals || !patientData.visuals.image) return;

        const container = this.patientContainer; // 患者たちのコンテナ
        // 座標調整: 患者画像の中心上部
        const x = patientData.visuals.image.x;
        const y = patientData.visuals.image.y - 180; 

        // 1. SE再生 (ちょっとお茶目な音があればベスト、なければ決定音など)
        this._playSE('se_display_card', { volume: 0.8, rate: 1.5 }); 

        // 2. 吹き出し作成
        const bubble = this.add.container(x, y);
        
        // 吹き出し背景（白に黒フチ）
        const bubbleBg = this.add.graphics();
        bubbleBg.fillStyle(0xFFFFFF, 1);
        bubbleBg.lineStyle(3, 0x333333, 1);
        
        // 楕円
        bubbleBg.fillEllipse(0, 0, 140, 50);
        bubbleBg.strokeEllipse(0, 0, 140, 50);
        
        // 尻尾
        bubbleBg.beginPath();
        bubbleBg.moveTo(-10, 20);
        bubbleBg.lineTo(0, 40);
        bubbleBg.lineTo(20, 15);
        bubbleBg.fillPath();
        bubbleBg.strokePath();
        
        // テキスト
        const msg = Phaser.Utils.Array.GetRandom(['できました！', 'お願い！', 'はいっ！']);
        const bubbleText = this.add.text(0, -2, msg, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        bubble.add([bubbleBg, bubbleText]);
        bubble.setScale(0);
        
        if (container) container.add(bubble);
        else this.add.existing(bubble); // フォールバック

        // 3. 吹き出しのアニメーション（ポンッと出て、ゆらゆら）
        this.tweens.add({
            targets: bubble,
            scale: 1,
            y: y - 10,
            duration: 400,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: bubble,
                    y: y - 15,
                    duration: 1500,
                    yoyo: true,
                    repeat: -1,
                    ease: 'Sine.InOut'
                });
            }
        });

        // 4. 患者のジャンプ（気づいてアピール）
        if (patientData.visuals.image) {
            this.tweens.add({
                targets: patientData.visuals.image,
                y: patientData.visuals.image.y - 15,
                duration: 150,
                yoyo: true,
                repeat: 0,
                ease: 'Power1'
            });
        }
        
        // 5. ベルアイコンのアニメーション強化
        if (patientData.bellIcon) {
            patientData.bellIcon.setVisible(true);
            this.tweens.add({
                targets: patientData.bellIcon,
                scale: { from: 1.0, to: 1.4 },
                angle: { from: -10, to: 10 },
                duration: 250,
                yoyo: true,
                repeat: 3
            });
        }
        
        // 参照を保持（クリック時に消すため）
        patientData.callBubble = bubble;
    }

    // ==========================================================
    // 📝 スコアログ表示 → HUDScene に委譲（バッチ処理対応）
    // ==========================================================
    _showMistakeLog(data) {
        const hudScene = this.scene.get('HUDScene');
        if (hudScene && hudScene.addScore) {
            // 各ミスを addScore 経由で登録（バッチ処理によりまとめて表示される）
            data.mistakeLog.forEach(log => {
                // 🚨 修正: ポイントは正の値として渡す, isMistake=true
                hudScene.addScore(log.points, log.reason, false, true);
            });
        }
    }
    
    // ==========================================================
    // 🏁 患者処理終了（共通処理）
    // ==========================================================
    _finishPatientProcess(data) {
        this._resetInteraction();
        data.isFinished = true;
        
        // --- Patient UI removal and slide ---
        if (data.visuals && data.visuals.image) {
            if (this.patientContainer) {
                this.patientContainer.remove(data.visuals.image);
            }
            data.visuals.image.destroy();
            data.visuals.image = null;
        }
        if (data.nameTag) {
            if (this.patientContainer) {
                this.patientContainer.remove(data.nameTag);
            }
            data.nameTag.destroy();
            data.nameTag = null;
        }
        if (data.bellIcon) {
            if (this.patientContainer) {
                this.patientContainer.remove(data.bellIcon);
            }
            data.bellIcon.destroy();
            data.bellIcon = null;
        }
        
        // Remove from queue
        const queue = this.patientManager ? this.patientManager.patientQueue : this.patientQueue;
        const index = queue.indexOf(data);
        if (index > -1) {
            queue.splice(index, 1);
        }
        
        // Slide remaining patients left
        const startX = 300;
        const gapX = 350;
        queue.forEach((p, i) => {
            const targetX = startX + (i * gapX);
            if (p.visuals && p.visuals.image) {
                this.tweens.add({ targets: p.visuals.image, x: targetX, duration: 500, ease: 'Power2' });
            }
            if (p.nameTag) {
                this.tweens.add({ targets: p.nameTag, x: targetX, duration: 500, ease: 'Power2' });
            }
            if (p.bellIcon) {
                this.tweens.add({ targets: p.bellIcon, x: targetX, duration: 500, ease: 'Power2' });
            }
        });
        
        // 🆕 スライド完了後に矢印位置を更新（チュートリアル矢印のズレ防止）
        this.time.delayedCall(550, () => {
            TutorialManager.getInstance(this.game).refreshArrowPosition();
        });
        
        // Increment finished count for HUD
        this.lastFinishedNumber++;
        
        this._updateHUD();
        if (this._updateScrollArrows) this._updateScrollArrows();
        
        // 会計キューに追加
        this._addToAccountingQueue(data);
    }
    
    // ==========================================================
    // 🎮 タイピングシーン連携
    // ==========================================================
    _startTypingGame(data) {
        const targetString = `${data.insuranceDetails["番号"]}`;
        console.log('タイピング開始:', targetString);
        this.scene.pause();
        this.scene.launch('TypingScene', { 
            targetText: targetString, 
            parentScene: this,
            patientData: data
        });
    }

    returnFromTyping(data, isSuccess) {
        console.log('タイピング完了');
        this._finalizeReception(data);
    }
    
    // ==========================================================
    // 🎨 受付完了スタンプ演出 (プレミアムデザイン)
    // ==========================================================
    _completionStamp(text, color, rank, delta, onComplete) {
        // 🚨 スキップ機能実装のため、input.enabled = false は削除し、
        // 代わりに透明なオーバーレイで入力をブロック＆スキップ検知を行う


        const centerX = 960;
        const centerY = 540;
        
        // 色定義（ランクに応じたグラデーション）
        const colorSchemes = {
            'perfect': {
                primary: 0x2ECC71,    // エメラルドグリーン
                secondary: 0x27AE60,
                glow: 0x58D68D,
                text: '#FFFFFF',
                icon: '✨'
            },
            'warning': {
                primary: 0xF39C12,    // オレンジ
                secondary: 0xD68910,
                glow: 0xF5B041,
                text: '#FFFFFF',
                icon: '⚠️'
            },
            'bad': {
                primary: 0xE74C3C,    // レッド
                secondary: 0xC0392B,
                glow: 0xEC7063,
                text: '#FFFFFF',
                icon: '❌'
            }
        };
        const scheme = colorSchemes[rank] || colorSchemes['perfect'];
        
        // コンテナ
        const container = this.add.container(centerX, centerY).setDepth(5000);
        
        // ⏩ スキップ用オーバーレイ (全画面・最前面)
        // これが他のUIへの入力をブロックする役割も兼ねる
        const skipZone = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.01) // 完全透明だと反応しない場合があるため微小なアルファ
            .setInteractive()
            .setDepth(5001); // コンテナ(5000)より上
        container.add(skipZone);

        // 完了トリガー（重複防止）
        let isFinished = false;
        const triggerComplete = () => {
            if (isFinished) return;
            isFinished = true;
            
            // アニメーション停止
            if (container.scene) {
                this.tweens.killTweensOf(container);
                container.destroy();
            }
            if (timer) timer.remove();
            
            if (onComplete) onComplete();
        };

        // 通常終了タイマー
        const timer = this.time.delayedCall(2500, triggerComplete);
        
        // タップでスキップ
        skipZone.on('pointerdown', () => {
            console.log('⏩ 演出スキップ');
            triggerComplete();
        });

        // 背景オーバーレイ（視覚効果用）
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.6);
        // skipZoneがあるのでinteractive不要
        container.addAt(overlay, 0); // 最背面へ
        
        // メインスタンプカード（グラスモーフィズム風）
        const cardWidth = 420;
        const cardHeight = 280;
        
        // カード背景（グラデーション効果）
        const cardBg = this.add.graphics();
        cardBg.fillStyle(scheme.primary, 0.95);
        cardBg.fillRoundedRect(-cardWidth/2, -cardHeight/2, cardWidth, cardHeight, 24);
        
        // 内側のハイライト
        cardBg.lineStyle(3, 0xFFFFFF, 0.3);
        cardBg.strokeRoundedRect(-cardWidth/2 + 4, -cardHeight/2 + 4, cardWidth - 8, cardHeight - 8, 20);
        
        // 外側のグロー
        const glowBg = this.add.graphics();
        glowBg.fillStyle(scheme.glow, 0.3);
        glowBg.fillRoundedRect(-cardWidth/2 - 8, -cardHeight/2 - 8, cardWidth + 16, cardHeight + 16, 28);
        
        container.add([glowBg, cardBg]);
        
        // アイコン
        const icon = this.add.text(0, -80, scheme.icon, {
            fontSize: '64px'
        }).setOrigin(0.5);
        container.add(icon);
        
        // メインテキスト（縦書き風に調整）
        const mainText = this.add.text(0, 10, text.replace('\n', '  '), {
            fontSize: '52px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: scheme.text,
            fontStyle: 'bold',
            align: 'center'
        }).setOrigin(0.5);
        container.add(mainText);
        
        // スコア表示
        const scorePrefix = delta >= 0 ? '+' : '';
        const scoreText = this.add.text(0, 90, `${scorePrefix}${delta} pt`, {
            fontSize: '36px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: delta >= 0 ? '#FFFFFF' : '#FFE0E0',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(scoreText);
        
        // デコレーションライン
        const line1 = this.add.rectangle(-110, 120, 80, 3, 0xFFFFFF, 0.5);
        const line2 = this.add.rectangle(110, 120, 80, 3, 0xFFFFFF, 0.5);
        container.add([line1, line2]);
        
        // ============ アニメーション ============
        
        // 初期状態
        container.setScale(0.3).setAlpha(0);
        glowBg.setAlpha(0);
        
        // 登場アニメーション
        this.tweens.add({
            targets: container,
            scale: 1,
            alpha: 1,
            duration: 400,
            ease: 'Back.Out'
        });
        
        // グローのパルス
        this.tweens.add({
            targets: glowBg,
            alpha: { from: 0, to: 0.5 },
            duration: 300,
            delay: 200,
            yoyo: true,
            repeat: 2
        });
        
        // アイコンのバウンス
        this.tweens.add({
            targets: icon,
            y: -90,
            duration: 150,
            yoyo: true,
            repeat: 1,
            delay: 300,
            ease: 'Bounce.Out'
        });
        
        // 消滅アニメーション
        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: container,
                scale: 0.8,
                alpha: 0,
                duration: 300,
                ease: 'Power2',
                onComplete: () => container.destroy()
            });
        });
    }

    _addToAccountingQueue(data) {
        // Queue Transfer logic same as before
        // 🚨 修正: PatientManagerは prescription/prescriptionDays を直接フィールドとして持つため、
        // triageData に明示的にマッピングする
        const ap = {
            name: data.name, receptionNumber: data.receptionNumber, insuranceDetails: data.insuranceDetails,
            triageData: { 
                ...(data.triageData || {}), // 既存のtriageData（チュートリアル等）を維持
                '処方薬': data.prescription || data.triageData?.['処方薬'] || '',
                '処方日数': data.prescriptionDays || data.triageData?.['処方日数'] || '',
                '検尿': data.testNeeded ? 'TRUE' : 'FALSE', 
                '既往歴': data.medicalHistory || '',
                '注射': data.injectionCost || data.triageData?.['注射'] || 0,
                '処置': data.procedureCost || data.triageData?.['処置'] || 0,
                '麻酔': data.anesthesiaCost || data.triageData?.['麻酔'] || 0,
                '検査': data.examinationCost || data.triageData?.['検査'] || 0,
                '画像診断': data.imagingCost || data.triageData?.['画像診断'] || 0,
                '自費': data.selfPayCost || data.triageData?.['自費'] || 0
            },
            hasRegistrationCard: !data.isNewPatient, insuranceType: data.insuranceType, imageKey: data.imageKey, needsMedicalRecord: data.needsMedicalRecord,
            typedId: data.typedId // 🆕 ID情報を引き継ぐ
        };
        this.delayedAccountingQueue.push({patient:ap, arrivalTime: Date.now()+5000});
        this.registry.set('delayedAccountingQueue', this.delayedAccountingQueue);
    }
    _processDelayedQueue() {
        if(!this.delayedAccountingQueue || !this.delayedAccountingQueue.length) return;
        const now = Date.now();
        const readyPatients = [];
        
        // Filter out ready patients
        this.delayedAccountingQueue = this.delayedAccountingQueue.filter(entry => {
            if (now >= entry.arrivalTime) {
                readyPatients.push(entry.patient);
                return false;
            }
            return true;
        });
        
        if(readyPatients.length) {
            const q = this.registry.get('checkSceneAccountingQueue') || [];
            readyPatients.forEach(patient => {
                q.push(patient);
                console.log(`[DelayedQueue] ${patient.name} が会計待ちリストに到着しました`);
            });
            this.registry.set('checkSceneAccountingQueue', q);
            
            // Update badge immediately
            this._updatePrescriptionBadge();
            
            // Play voice cue for prescription check
            this._playPrescriptionCheckVoice();
            
            // Update CheckScene if active
            const checkScene = this.scene.get('CheckScene');
            if (checkScene && checkScene.scene.isActive()) {
                checkScene.accountingQueue = q;
                if (checkScene._updateWaitingList) {
                    checkScene._updateWaitingList();
                }
            }
            
            // Save to registry
            this.registry.set('delayedAccountingQueue', this.delayedAccountingQueue);
        }
    }
    
    _playPrescriptionCheckVoice() {
        try {
            const voiceVolume = this.registry.get('voiceVolume') ?? 0.8;
            this.sound.play('vc_prescription_check', { volume: voiceVolume });
        } catch(e) {
            console.log('[Voice] Prescription check voice not found');
        }
    }
    // ==========================================================
    // 🏥 ゲーム開始時に初期患者を会計キューに追加（順次表示・ランダム選択）
    // ==========================================================
    _addInitialAccountingPatients(count) {
        const triageData = this.cache.json.get('triageData') || [];
        const myNumberData = this.cache.json.get('myNumberData') || [];
        const paperInsuranceData = this.cache.json.get('paperInsuranceData') || [];
        
        // 🚨 修正: データソースをタグ付けして保持
        const taggedMyNumber = myNumberData.map(d => ({ ...d, _sourceType: 'myNumber' }));
        const taggedPaper = paperInsuranceData.map(d => ({ ...d, _sourceType: 'paper' }));
        const insuranceData = [...taggedMyNumber, ...taggedPaper];
        
        // 🎲 insuranceDataをシャッフル（MyNumberと紙保険証がランダムに混在するように）
        for (let i = insuranceData.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [insuranceData[i], insuranceData[j]] = [insuranceData[j], insuranceData[i]];
        }
        
        // 🎲 ランダムにインデックスを選択（重複なし）
        const maxIndex = Math.min(triageData.length, insuranceData.length);
        const selectedIndices = [];
        while (selectedIndices.length < count && selectedIndices.length < maxIndex) {
            const randomIndex = Math.floor(Math.random() * maxIndex);
            if (!selectedIndices.includes(randomIndex)) {
                selectedIndices.push(randomIndex);
            }
        }
        
        // 🕐 順次表示: 最初の1人は即時、以降は1分間隔で表示
        selectedIndices.forEach((dataIndex, i) => {
            const triage = triageData[dataIndex];
            const insurance = insuranceData[dataIndex];
            
            // 🎲 ランダムにフラグを設定
            const isNewPatient = Math.random() < 0.3; // 30%の確率で新患
            const needsMedicalRecord = !isNewPatient && Math.random() > 0.2; // 新患でなければ80%でAルート
            
            // 🚨 修正: insuranceType はデータソースに基づいて決定
            const insuranceType = insurance._sourceType || 'paper';
            
            // 🚨 修正: 保険種別と負担割合は元データを使用
            const modifiedInsurance = { ...insurance };
            
            // 保険種別を統一キー「保険種別」に設定（元データのキーを探す）
            const originalCategory = insurance['保険区分'] || insurance['保険種別'] || '社保';
            modifiedInsurance['保険種別'] = originalCategory;
            
            // 負担割合を統一キー「負担」に設定（元データのキーを探す）
            const originalBurden = insurance['負担割合'] || insurance['負担'] || '3割';
            modifiedInsurance['負担'] = originalBurden;
            modifiedInsurance['負担割合'] = originalBurden;
            
            const patient = {
                name: insurance['氏名'] || insurance['名前'] || `初期患者${i + 1}`,
                receptionNumber: i + 1,
                insuranceDetails: modifiedInsurance,
                triageData: {
                    '主訴': triage['主訴'] || '定期検診',
                    '検尿': triage['検尿'] || 'FALSE',
                    '判定理由': triage['判定理由'] || '',
                    '既往歴': triage['既往歴'] || '',
                    '処方薬': triage['処方薬'] || '',
                    '処方日数': triage['処方日数'] || '',
                    '注射': parseInt(triage['注射']) || 0,
                    '処置': parseInt(triage['処置']) || 0,
                    '麻酔': parseInt(triage['麻酔']) || 0,
                    '検査': parseInt(triage['検査']) || 0,
                    '画像診断': parseInt(triage['画像診断']) || 0,
                    '自費': parseInt(triage['自費']) || 0
                },
                hasRegistrationCard: !isNewPatient, // 新患でなければ再診
                insuranceType: insuranceType,
                needsMedicalRecord: needsMedicalRecord, // Aルート/Bルート判定
                isNewPatient: isNewPatient, // 新患フラグ
                // 🖼️ ランダムに画像キーを生成
                imageKey: (() => {
                    const genderKey = insurance['性別'] === '女' ? 'woman' : 'man';
                    const maxNum = genderKey === 'man' ? 18 : 8;
                    const num = Math.floor(Math.random() * maxNum) + 1;
                    return `${genderKey}${num}`;
                })()
            };
            
            // 最初の1人は即時、以降は1分間隔で遅延キューに追加
            const delaySeconds = i * 60; // 0, 60, 120, 180...秒（1分間隔）
            const arrivalTime = Date.now() + (delaySeconds * 1000);
            
            this.delayedAccountingQueue.push({
                patient: patient,
                arrivalTime: arrivalTime
            });
        });
        
        // 🚨 修正: 遅延キューを Registry に保存
        this.registry.set('delayedAccountingQueue', this.delayedAccountingQueue);
        
        console.log(`[GameStart] ${count}人の初期患者を遅延キューに追加しました（1分間隔で順次表示）`);
    }

    _updatePrescriptionBadge() {
        const q = this.registry.get('checkSceneAccountingQueue')||[];
        if(this.prescriptionBadge && this.prescriptionBadge.updateCount) {
            // パネル表示中は非表示
            if (this.isPanelShowing) {
                this.prescriptionBadge.setVisible(false);
            } else {
                this.prescriptionBadge.updateCount(q.length);
            }
        }
    }
    
    _updateHUD(currentPatientData = null) {
        const hud = this.scene.get('HUDScene');
        if (!hud || !hud.updateStatusBoard) return;
        
        // Calculate waiting count based on current patient's reception number
        // Same formula as wait time guide: receptionNumber - lastFinishedNumber
        let waitingCount = 0;
        let displayNum = '-';
        
        if (currentPatientData && currentPatientData.receptionNumber) {
            waitingCount = currentPatientData.receptionNumber - this.lastFinishedNumber;
            displayNum = currentPatientData.receptionNumber;
        } else {
            // No patient selected - show 0 or queue summary
            const queue = this.patientManager ? this.patientManager.patientQueue : (this.patientQueue || []);
            const activePatients = queue.filter(p => !p.isFinished);
            if (activePatients.length > 0) {
                // Show the first unfinished patient's waiting count
                const firstPatient = activePatients[0];
                waitingCount = firstPatient.receptionNumber - this.lastFinishedNumber;
            }
        }
        
        // Estimate time: 6 minutes per person
        const estimatedTime = waitingCount * 6;
        
        // Update the HUD (maintaining backward compatibility with direct call)
        hud.updateStatusBoard(this.lastFinishedNumber, displayNum, waitingCount, estimatedTime);
        
        // Also emit via EventBus for decoupled communication
        EventBus.emit(GameEvents.HUD_UPDATE_WAITING, {
            waiting: waitingCount,
            finished: this.lastFinishedNumber
        });
    }
    
    // ==========================================================
    // 📋 問診票モーダル表示 (閲覧用・シンプル版)
    // ==========================================================
    _showQuestionnaireModal(data) {
        const centerX = 960; // Fixed 1920/2
        const centerY = 540; // Fixed 1080/2
        const modalW = 550;
        const modalH = 420;

        // モーダルコンテナ
        const modalContainer = this.add.container(centerX, centerY).setDepth(5000);

        // 背景オーバーレイ
        const overlay = this.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.5)
            .setInteractive({ useHandCursor: true });
        
        // Define closeModal first so we can use it
        const closeModal = () => {
            this.tweens.add({
                targets: modalContainer,
                alpha: 0,
                scale: 0.9,
                duration: 200,
                onComplete: () => modalContainer.destroy()
            });
        };

        overlay.on('pointerdown', () => closeModal());
        modalContainer.add(overlay);

        // 用紙の影
        const shadow = this.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-modalW/2 + 6, -modalH/2 + 6, modalW, modalH, 8);
        modalContainer.add(shadow);

        // 用紙背景
        const paper = this.add.graphics();
        paper.fillStyle(0xFFFEFA, 1);
        paper.lineStyle(3, 0x8B4513, 1);
        paper.fillRoundedRect(-modalW/2, -modalH/2, modalW, modalH, 8);
        paper.strokeRoundedRect(-modalW/2, -modalH/2, modalW, modalH, 8);
        modalContainer.add(paper);

        // 罫線
        const lines = this.add.graphics();
        lines.lineStyle(1, 0xD0D0D0, 0.5);
        for (let i = 1; i < 10; i++) {
            const lineY = -modalH/2 + 50 + i * 38;
            lines.lineBetween(-modalW/2 + 25, lineY, modalW/2 - 25, lineY);
        }
        modalContainer.add(lines);

        // ヘッダー
        const headerBg = this.add.graphics();
        headerBg.fillStyle(0x2E7D32, 1);
        headerBg.fillRect(-modalW/2, -modalH/2, modalW, 50);
        modalContainer.add(headerBg);

        const title = this.add.text(0, -modalH/2 + 25, '📋 問 診 票', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        modalContainer.add(title);

        // 閉じるボタン
        const closeBtn = this.add.text(modalW/2 - 25, -modalH/2 + 25, '✕', {
            fontSize: '22px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtn.on('pointerout', () => closeBtn.setScale(1.0));
        closeBtn.on('pointerdown', () => closeModal());
        modalContainer.add(closeBtn);

        // スタイル
        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, fontSize: '15px', color: '#666666' };
        const valueStyle = { fontFamily: fontBase, fontSize: '17px', color: '#333333' };
        const inputStyle = { fontFamily: fontBase, fontSize: '16px', color: '#1565C0' };

        let y = -modalH/2 + 75;
        const leftX = -modalW/2 + 35;

        // 患者情報
        const details = data.insuranceDetails || {};
        const patientName = details['氏名'] || data.name || '匿名';
        const dob = details['生年月日'] || '----/--/--';
        const age = details['年齢'] || '??';

        modalContainer.add(this.add.text(leftX, y, '氏　名:', labelStyle));
        modalContainer.add(this.add.text(leftX + 70, y, `${patientName}`, valueStyle));
        y += 35;

        modalContainer.add(this.add.text(leftX, y, '生年月日:', labelStyle));
        modalContainer.add(this.add.text(leftX + 90, y, `${dob}  (${age}歳)`, valueStyle));
        y += 45;

        // 区切り線
        const divider = this.add.graphics();
        divider.lineStyle(2, 0x2E7D32, 0.6);
        divider.lineBetween(-modalW/2 + 25, y, modalW/2 - 25, y);
        modalContainer.add(divider);
        y += 20;

        // 本日の症状
        modalContainer.add(this.add.text(leftX, y, '本日の症状:', labelStyle));
        y += 28;

        const complaintText = data.hiddenComplaint || data.complaint || '特になし';
        const complaintDisplay = this.add.text(leftX + 10, y, complaintText, {
            ...inputStyle,
            wordWrap: { width: modalW - 80, useAdvancedWrap: true },
            lineSpacing: 5
        });

        // 🆕 行数制限 (最大2行)
        // 一度描画設定を行った後にラップされた行を取得して判定
        const wrappedLines = complaintDisplay.getWrappedText(complaintText);
        if (wrappedLines.length > 2) {
             // 2行分だけ結合して末尾に...をつける
             const truncated = wrappedLines.slice(0, 2).join('\n') + '...';
             complaintDisplay.setText(truncated);
        }
        
        modalContainer.add(complaintDisplay);

        // 既往歴
        y += 90;
        modalContainer.add(this.add.text(leftX, y, '既往歴:', labelStyle));

        const historyText = data.medicalHistory || 'なし';
        modalContainer.add(this.add.text(leftX + 70, y, historyText, {
            ...inputStyle,
            wordWrap: { width: modalW - 130 }
        }));
    }
    
    // =======================================
    // 🔊 サウンド共通メソッド (SoundManager委譲)
    // =======================================
    _playSE(key, options = {}) {
        SoundManager.playSE(this, key, options);
    }
    
    _playBGM(key, volumeScale = 0.5) {
        SoundManager.playBGM(this, key, volumeScale);
    }
    

    setAccountingButtonActive(active) {
         if(this.toAccountingBtnBg) {
             if(active) {
                this.toAccountingBtnBg.setInteractive({useHandCursor:true});
                this.toAccountingBtn.setAlpha(1);
             } else {
                this.toAccountingBtnBg.disableInteractive();
                this.toAccountingBtn.setAlpha(0.5);
             }
         }
    }

    _scrollLeft() { this.tweens.add({targets:this.patientContainer, x: Math.min(0, this.patientContainer.x+350), duration:200, onComplete:()=>this._updateScrollArrows()}); }
    _scrollRight() { this.tweens.add({targets:this.patientContainer, x: this.patientContainer.x-350, duration:200, onComplete:()=>this._updateScrollArrows()}); }
    _updateScrollArrows() {
         const x = this.patientContainer.x;
         this.scrollLeftBtn.setAlpha(x < 0 ? 1 : 0);
         // Simplified end check
         this.scrollRightBtn.setAlpha(1); 
    }
    
    _fireConfetti() {
        const cx = 960; const cy = 540;
        const circle = this.add.circle(cx, cy, 10, 0x2ECC71).setStrokeStyle(5, 0xFFFFFF).setDepth(9999);
        const text = this.add.text(cx, cy, 'OK!', {
            fontSize:'60px', fontFamily:'Arial Black', color:'#FFF', stroke:'#2ECC71', strokeThickness:8
        }).setOrigin(0.5).setScale(0).setDepth(9999);
        
        this.tweens.add({targets:circle, radius:300, alpha:{from:0.8, to:0}, duration:500, ease:'Quad.Out'});
        this.tweens.add({targets:text, scale:{from:0, to:1.5}, alpha:{from:1, to:0}, duration:600, ease:'Back.Out', onComplete:()=>{
            if(circle.active) circle.destroy(); 
            if(text.active) text.destroy();
        }});
    }
    
    _showResultOverlay(message, color) {
        if(this.isResultDisplaying) return;
        this.isResultDisplaying = true;
        
        const cx = 960; const cy = 540;
        // Background
        const bg = this.add.rectangle(cx, cy, 1400, 250, 0x000000, 0.8).setDepth(2100);
        // Text
        const txt = this.add.text(cx, cy, message, {
            fontSize:'50px', fontFamily:'"Noto Sans JP"', color:color, stroke:'#000', strokeThickness:6, align:'center', lineSpacing:20
        }).setOrigin(0.5).setDepth(2101);
        
        this.time.delayedCall(1500, () => {
             if(bg.active) bg.destroy();
             if(txt.active) txt.destroy();
             this.isResultDisplaying = false;
        });
    }
    _recordMistake(d, p, r) { d.currentMistakePoints=(d.currentMistakePoints||0)+p; if(!d.mistakeLog)d.mistakeLog=[]; d.mistakeLog.push({points:p, reason:r, isMistake:true}); }
    
    // ==========================================================
    // 📝 患者履歴を追加/更新 (HUDのスコアレポート用)
    // PaymentSceneから呼び出される
    // ==========================================================
    addPatientHistory(patient, mistakePoints, mistakeLog) {
        // 🔍 デバッグログ
        console.log('[addPatientHistory] 受信データ:', {
            patientName: patient.name,
            mistakePoints,
            mistakeLogLength: mistakeLog?.length || 0,
            mistakeLog: mistakeLog
        });
        
        // 🚨 修正: 獲得スコアを計算 (ボーナス - ミス)
        // isMistake=false はボーナス（加算）、isMistake=true はミス（減算）
        let earnedScore = 0;
        if (mistakeLog && Array.isArray(mistakeLog)) {
            mistakeLog.forEach(log => {
                if (log.isMistake) {
                    // ミスポイントは減算（正の値で保存されているので負にする）
                    earnedScore -= (log.points || 0);
                    console.log('[addPatientHistory] ミス減算:', log.reason, -log.points);
                } else {
                    // ボーナスは加算
                    earnedScore += (log.points || 0);
                    console.log('[addPatientHistory] ボーナス加算:', log.reason, log.points);
                }
            });
        }
        
        console.log('[addPatientHistory] 最終earnedScore:', earnedScore);
        
        // 既存の患者を更新または新規追加
        const existingIndex = this.patientHistory.findIndex(h => 
            h.name === patient.name && 
            h.insuranceDetails && 
            patient.insuranceDetails &&
            h.insuranceDetails['ID'] === patient.insuranceDetails['ID']
        );
        
        if (existingIndex >= 0) {
            // 既存の患者データを更新
            this.patientHistory[existingIndex].currentMistakePoints = mistakePoints;
            this.patientHistory[existingIndex].mistakeLog = mistakeLog;
            this.patientHistory[existingIndex].earnedScore = earnedScore;
        } else {
            // 新規追加（ただし患者オブジェクト自体がpatientHistoryに含まれていなければ）
            if (!this.patientHistory.includes(patient)) {
                // 必要なプロパティを設定
                patient.currentMistakePoints = mistakePoints;
                patient.mistakeLog = mistakeLog;
                patient.earnedScore = earnedScore;
                this.patientHistory.push(patient);
            } else {
                // 既に含まれている場合は更新
                patient.currentMistakePoints = mistakePoints;
                patient.mistakeLog = mistakeLog;
                patient.earnedScore = earnedScore;
            }
        }
    }
}