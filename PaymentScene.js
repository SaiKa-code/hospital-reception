// PaymentScene.js - 会計・支払いシーン（患者対面）

import { addTransitionMethods } from './TransitionManager.js';
import { EventBus, GameEvents } from './EventBus.js';
import { PrescriptionDisplay } from './components/PrescriptionDisplay.js';
import { ReceiptDisplay } from './components/ReceiptDisplay.js'; // 🆕 領収書コンポーネント
import { ReceptionSlip } from './components/ReceptionSlip.js'; // 🆕 受付票コンポーネント
import { MedicineUtils } from './components/MedicineUtils.js';
import { UIHeader } from './components/UIHeader.js';
import { SoundManager } from './components/SoundManager.js';
import { NavigationButton } from './components/NavigationButton.js';
import { GameStateManager } from './GameStateManager.js';  // 🆕 コンボ・タイムボーナス用
import { TutorialManager } from './components/TutorialManager.js'; // 🆕 チュートリアル用
import { ReservationCalendar } from './components/ReservationCalendar.js'; // 🆕 予約カレンダー用

export class PaymentScene extends Phaser.Scene {
    constructor() {
        super('PaymentScene');
        
        // 状態管理
        this.currentPatient = null;
        this.correctAmount = 0;
        this.inputAmount = '';
        this.selectedInsurance = null;
        this.reservationDate = null;
        this.isReservationTarget = false;
        
        // 次回予約対象の既往歴キーワード
        this.reservationTargetKeywords = ['癌', 'がん', 'ガン', '高血圧', '糖尿病', '高コレステロール', '高脂血症'];
        
        // スコア設定
        this.SCORE_RESERVATION_CORRECT = 10;    // 予約正解 (個別)
        this.SCORE_RESERVATION_WRONG = 10;      // 予約間違い (個別)
        this.SCORE_RESERVATION_MISSED = 40;     // 予約忘れ (個別)
        this.SCORE_CORRECT_AMOUNT = 0;          // 金額正解 (個別)
        this.SCORE_WRONG_AMOUNT = 20;           // 金額間違い (個別)
        this.SCORE_INSURANCE_NOT_VERIFIED = 20; // 保険証未確認ペナルティ (個別)
        this.SCORE_STAMP_NOT_PRESSED = 20;      // 印鑑未押印ペナルティ (個別)
        this.SCORE_ACCOUNTING_COMPLETE = 100;   // 会計完了ボーナス（全体point）
        
        // 🆕 タイムボーナス設定
        this.TIME_BONUS_TARGET = 25;    // 目標時間（秒）
        this.TIME_BONUS_POINTS = 10;    // 高速ボーナス
        this.TIME_PENALTY_THRESHOLD = 50; // ペナルティ発生時間
        this.TIME_PENALTY_POINTS = -5;  // 低速ペナルティ
    }

    init(data) {
        // 🚨 修正: data が空の場合は Registry から取得（トランジション対応）
        const registryData = this.registry.get('paymentSceneData');
        const sourceData = (data && Object.keys(data).length > 0) ? data : registryData;
        
        this.currentPatient = sourceData?.patient || null;
        this.correctAmount = sourceData?.amount || 0;
        this.receiptData = sourceData?.receiptData || null;
        this.insuranceType = sourceData?.insuranceType || 'paper';  // 'paper' or 'myNumber'
        this.insuranceVerified = sourceData?.insuranceVerified || false;
        this.insuranceTabMode = sourceData?.insuranceTabMode || 'myna';  // 🆕 タブモード受け取り
        this.stampPressed = sourceData?.stampPressed || false;
        this.queuePosition = sourceData?.queuePosition || 0;  // 🆕 キュー順位を受け取り（先頭=0）
        
        // 🚨 修正: 入力状態をリセット（2人目以降の患者に対応）
        this.inputAmount = '';
        this.selectedInsurance = null;
        this.reservationDate = null;
        this.isReservationTarget = false;
        
        // 🚨 追加: ミス累計を追跡
        this.mistakePoints = 0;
        
        // 🆕 タイムボーナス用: 会計開始時刻を記録
        const gameState = GameStateManager.getInstance(this.game);
        gameState.setTimingStart('payment');
    }

    // ==========================================================
    // 🔊 SE再生ヘルパー (SoundManager委譲)
    // ==========================================================
    _playSE(key, volumeOrConfig = 1.0) {
        SoundManager.playSE(this, key, volumeOrConfig);
    }

    create() {
        if (!this.currentPatient) {
            console.error('PaymentScene: 患者データがありません');
            this.scene.switch('CheckScene');
            return;
        }
        
        // 🎬 トランジション初期化
        addTransitionMethods(this);
        
        // 薬データを取得（AccountingSceneと同じデータを参照）
        this.medicineData = this.cache.json.get('medicineData') || [];
        this.chineseMedicineData = this.cache.json.get('chineseMedicineData') || [];
        
        // 背景（グラデーション）
        const bg = this.add.graphics();
        bg.fillGradientStyle(0xE8F5E9, 0xE8F5E9, 0xC8E6C9, 0xC8E6C9, 1);
        bg.fillRect(0, 0, 1920, 1080);
        
        // ヘッダー
        this._createHeader(960, 70, '💰 お会計', 0x4CAF50, '🏥');
        
        // 患者表示エリア（左）
        this._createPatientArea();
        
        // 領収証エリア（中央）
        this._createReceiptArea();
        
        // 金額入力エリア（右）
        this._createPaymentArea();
        
        // 次回予約エリア（下部中央）
        this._createReservationArea();
        
        // ナビゲーションボタン
        this._createNavigationButtons();
        
        // 対象者判定
        this._checkReservationTarget();
        
        // 保険証確認ペナルティチェック（紙保険証で受付したのに確認されなかった場合）
        this._checkInsuranceVerificationPenalty();
        
        // 🆕 チュートリアル通知
        this.time.delayedCall(300, () => {
            TutorialManager.getInstance(this.game).notifySceneReady('PaymentScene');
        });
    }

    // ==========================================================
    // 🏥 ヘッダー（共通コンポーネント使用）
    // ==========================================================
    _createHeader(x, y, text, baseColor, iconChar) {
        return UIHeader.create(this, { x, y, text, color: baseColor, icon: iconChar });
    }

    // ==========================================================
    // 👤 患者エリア（画面左側）- モダンデザイン
    // ==========================================================
    _createPatientArea() {
        const patient = this.currentPatient;
        const details = patient.insuranceDetails || {};
        const genderKey = patient.genderKey || 'man';
        const ageStr = details['年齢'] || '40歳';
        const age = parseInt(ageStr) || 40;
        
        // エリア設定（画面左側）
        const areaWidth = 480;
        const areaX = areaWidth / 2 + 20;
        const areaY = 540;
        
        // ========================================
        // 🎨 モダン背景パネル（シャドウ付きカード）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(4);
        shadowBg.fillStyle(0x000000, 0.12);
        shadowBg.fillRoundedRect(areaX - (areaWidth - 40)/2 + 5, areaY - 400 + 5, areaWidth - 40, 800, 12);
        
        const panelBg = this.add.graphics().setDepth(5);
        panelBg.fillStyle(0xFFFFFF, 1);
        panelBg.fillRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 800, 12);
        panelBg.lineStyle(2, 0xE0E0E0, 1);
        panelBg.strokeRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 800, 12);
        
        // ========================================
        // ヘッダー（黒ベース）
        // ========================================
        const headerBg = this.add.graphics().setDepth(6);
        headerBg.fillStyle(0x1A1A1A, 1);
        headerBg.fillRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 60, { tl: 12, tr: 12, bl: 0, br: 0 });
        
        this.add.text(areaX, 180, '👤 お客様', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(7);
        
        // --- 患者スプライト ---
    const spriteY = 600;
    
    // 🖼️ ReceptionScene から渡された imageKey を使用
    const spriteKey = patient.imageKey;
    
    // スプライトが存在するか確認してから表示
    if (spriteKey && this.textures.exists(spriteKey)) {
        const patientSprite = this.add.image(areaX, spriteY, spriteKey)
            .setDisplaySize(180, 300)
            .setDepth(6);
    } else {
        // スプライトがない場合は大きな絵文字を使用
        const genderKey = patient.genderKey || 'man';
        let avatarIcon = genderKey === 'man' ? '👨' : '👩';
        if (age >= 70) avatarIcon = genderKey === 'man' ? '👴' : '👵';
        else if (age <= 10) avatarIcon = genderKey === 'man' ? '👦' : '👧';
        
        this.add.text(areaX, spriteY, avatarIcon, {
            fontSize: '150px'
        }).setOrigin(0.5).setDepth(6);
    }    
        // 患者名（大きく）
        this.add.text(areaX, 800, patient.name || '不明', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5).setDepth(6);
        
        // // 保険種別バッジ
        // const insuranceType = details['保険種別'] || '社保';
        // let badgeColor = 0x3498DB;
        // if (insuranceType.includes('国保')) badgeColor = 0xE74C3C;
        // else if (insuranceType.includes('後期') || age >= 70) badgeColor = 0x9B59B6;
        
        // this.add.rectangle(areaX, 660, 180, 36, badgeColor).setDepth(6);
        // this.add.text(areaX, 660, age >= 70 ? '後期高齢者' : insuranceType, {
        //     fontSize: '16px',
        //     fontFamily: '"Noto Sans JP", sans-serif',
        //     color: '#FFFFFF'
        // }).setOrigin(0.5).setDepth(7);
        
        // 吹き出し（コンテナ化して後から変更可能に）- 患者スプライトの上に配置
        this._createSpeechBubble(areaX, 350);
    }

    _createSpeechBubble(x, y) {
        this.speechBubbleContainer = this.add.container(x, y).setDepth(6);
        
        // 初期セリフ
        this._updateSpeechBubble('お会計\nお願いします');
    }
    
    // 💬 吹き出し更新メソッド（シンプル版）
    _updateSpeechBubble(text, type = 'normal') {
        if (!this.speechBubbleContainer) return;
        
        this.speechBubbleContainer.removeAll(true);
        
        // 吹き出し設定
        let bubbleColor = 0xFFFFFF;
        let strokeColor = 0x333333;
        let textColor = '#333333';
        
        if (type === 'error') {
            bubbleColor = 0xFFEBEE;
            strokeColor = 0xFF5252;
            textColor = '#D32F2F';
        } else if (type === 'success') {
            bubbleColor = 0xE8F5E9;
            strokeColor = 0x4CAF50;
            textColor = '#1B5E20';
        }
        
        const bubble = this.add.graphics();
        
        // 吹き出しパラメータ
        const x = 0;
        const y = 0;
        const w = 200;
        const h = 70;
        const tailH = 20;
        
        // 1. 本体（角丸四角形）- 塗りのみ
        bubble.fillStyle(bubbleColor, 1);
        bubble.fillRoundedRect(x - w/2, y, w, h, 16);
        
        // 2. 尻尾（三角形）- 塗りのみ（枠線なし）
        bubble.beginPath();
        bubble.moveTo(x - 15, y + h - 1);  // 本体の下端に少し重ねる
        bubble.lineTo(x, y + h + tailH);    // 先端
        bubble.lineTo(x + 15, y + h - 1);   // 本体の下端
        bubble.closePath();
        bubble.fillPath();
        
        // 3. 本体の枠線（尻尾の結合部分を除く）
        bubble.lineStyle(3, strokeColor);
        bubble.strokeRoundedRect(x - w/2, y, w, h, 16);
        
        // 4. 尻尾の枠線（左右の斜線のみ）
        bubble.beginPath();
        bubble.moveTo(x - 15, y + h);
        bubble.lineTo(x, y + h + tailH);
        bubble.lineTo(x + 15, y + h);
        bubble.strokePath();
        
        const textObj = this.add.text(x, y + h/2, text, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: textColor,
            align: 'center',
            wordWrap: { width: 180 }
        }).setOrigin(0.5);
        
        this.speechBubbleContainer.add([bubble, textObj]);
        
        // ポップアニメーション
        this.speechBubbleContainer.setScale(0);
        this.tweens.add({
            targets: this.speechBubbleContainer,
            scale: 1,
            duration: 300,
            ease: 'Back.Out'
        });
    }

    // ==========================================================
    // 🧾 中央エリア（領収証/カルテ切り替え）- モダンデザイン
    // ==========================================================
    _createReceiptArea() {
        const areaWidth = 520;
        const areaX = 960;
        const areaY = 540;
        
        // 現在のタブ状態
        this.currentDocTab = 'receipt'; // 'receipt', 'karte', or 'prescription'
        
        // ========================================
        // 🎨 モダン背景パネル（カード風・シャドウ付き）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(4);
        shadowBg.fillStyle(0x000000, 0.15);
        shadowBg.fillRoundedRect(areaX - areaWidth/2 + 6, areaY - 400 + 6, areaWidth, 800, 12);
        
        this.centerPanelBg = this.add.graphics().setDepth(5);
        this.centerPanelBg.fillStyle(0xFFFFFF, 1);
        this.centerPanelBg.fillRoundedRect(areaX - areaWidth/2, areaY - 400, areaWidth, 800, 12);
        this.centerPanelBg.lineStyle(2, 0xE0E0E0, 1);
        this.centerPanelBg.strokeRoundedRect(areaX - areaWidth/2, areaY - 400, areaWidth, 800, 12);
        
        // ========================================
        // 🆕 モダンタブ（黒白ベース・アクティブ時に黒）
        // ========================================
        const tabY = 160;
        const tabW = 150;
        const tabH = 42;
        const tabGap = 8;
        
        // タブ作成ヘルパー
        const createModernTab = (x, label, isActive) => {
            const tabContainer = this.add.container(x, tabY).setDepth(10);
            
            const bg = this.add.graphics();
            if (isActive) {
                bg.fillStyle(0x1A1A1A, 1);
                bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
            } else {
                bg.fillStyle(0xF5F5F5, 1);
                bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                bg.lineStyle(1, 0xCCCCCC, 1);
                bg.strokeRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
            }
            tabContainer.add(bg);
            
            const text = this.add.text(0, 0, label, {
                fontSize: '15px',
                fontFamily: '"Noto Sans JP", sans-serif',
                fontStyle: 'bold',
                color: isActive ? '#FFFFFF' : '#666666'
            }).setOrigin(0.5);
            tabContainer.add(text);
            
            const hitArea = this.add.rectangle(0, 0, tabW, tabH, 0xFFFFFF, 0)
                .setInteractive({ useHandCursor: true });
            tabContainer.add(hitArea);
            
            // ホバーエフェクト
            hitArea.on('pointerover', () => {
                if (!isActive) {
                    bg.clear();
                    bg.fillStyle(0xE8E8E8, 1);
                    bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                    bg.lineStyle(1, 0xCCCCCC, 1);
                    bg.strokeRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                }
            });
            hitArea.on('pointerout', () => {
                if (!isActive) {
                    bg.clear();
                    bg.fillStyle(0xF5F5F5, 1);
                    bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                    bg.lineStyle(1, 0xCCCCCC, 1);
                    bg.strokeRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                }
            });
            
            return { container: tabContainer, bg, text, hitArea };
        };
        
        // 3つのタブを作成
        this.receiptTabData = createModernTab(areaX - tabW - tabGap, '🧾 領収証', true);
        this.karteTabData = createModernTab(areaX, '📋 カルテ', false);
        this.prescriptionTabData = createModernTab(areaX + tabW + tabGap, '💊 処方箋', false);
        
        // 互換性のための参照
        this.receiptTab = this.receiptTabData.hitArea;
        this.karteTab = this.karteTabData.hitArea;
        this.prescriptionTab = this.prescriptionTabData.hitArea;
        
        // タブクリック処理
        this.receiptTab.on('pointerdown', () => {
            this._playSE('se_scroll', { volume: 0.5 });
            this._switchDocTab('receipt');
            TutorialManager.getInstance(this.game).completeStep('PAYMENT_TAB_CLICKED_receipt');
        });
        this.karteTab.on('pointerdown', () => {
            console.log('[PaymentScene] 🔍 DEBUG: karteTab clicked!');
            this._playSE('se_scroll', { volume: 0.5 });
            this._switchDocTab('karte');
            console.log('[PaymentScene] 🔍 DEBUG: calling completeStep(PAYMENT_TAB_CLICKED_karte)');
            TutorialManager.getInstance(this.game).completeStep('PAYMENT_TAB_CLICKED_karte');
            console.log('[PaymentScene] 🔍 DEBUG: completeStep called');
        });
        this.prescriptionTab.on('pointerdown', () => {
            this._playSE('se_scroll', { volume: 0.5 });
            this._switchDocTab('prescription');
            TutorialManager.getInstance(this.game).completeStep('PAYMENT_TAB_CLICKED_prescription');
        });
        
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('payment_receipt_tab', this.receiptTab);
        TutorialManager.getInstance(this.game).registerButton('payment_karte_tab', this.karteTab);
        TutorialManager.getInstance(this.game).registerButton('payment_prescription_tab', this.prescriptionTab);
        
        // コンテンツコンテナ
        this.docContentContainer = this.add.container(0, 0).setDepth(7);
        
        // 初期表示（領収証）
        this._renderReceiptContent(areaX, areaWidth);
    }

    
    _switchDocTab(tabName) {
        this.currentDocTab = tabName;
        
        const tabW = 150;
        const tabH = 42;
        
        // タブスタイル更新ヘルパー
        const updateTabStyle = (tabData, isActive) => {
            tabData.bg.clear();
            if (isActive) {
                tabData.bg.fillStyle(0x1A1A1A, 1);
                tabData.bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
            } else {
                tabData.bg.fillStyle(0xF5F5F5, 1);
                tabData.bg.fillRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
                tabData.bg.lineStyle(1, 0xCCCCCC, 1);
                tabData.bg.strokeRoundedRect(-tabW/2, -tabH/2, tabW, tabH, 8);
            }
            tabData.text.setColor(isActive ? '#FFFFFF' : '#666666');
        };
        
        // 全タブを更新
        updateTabStyle(this.receiptTabData, tabName === 'receipt');
        updateTabStyle(this.karteTabData, tabName === 'karte');
        updateTabStyle(this.prescriptionTabData, tabName === 'prescription');
        
        // コンテンツ切り替え
        this.docContentContainer.removeAll(true);
        
        const areaX = 960;
        const areaWidth = 520;
        
        if (tabName === 'receipt') {
            this._renderReceiptContent(areaX, areaWidth);
        } else if (tabName === 'karte') {
            this._renderKarteContent(areaX, areaWidth);
        } else if (tabName === 'prescription') {
            this._renderPrescriptionContent(areaX, areaWidth);
        }
    }

    
    _renderReceiptContent(areaX, areaWidth) {
        const patient = this.currentPatient;
        const receiptData = this.receiptData || {};
        
        // 🆕 コンポーネントを使用して領収書を描画
        const result = ReceiptDisplay.render(this, this.docContentContainer, patient, {
            areaX: areaX,
            areaWidth: areaWidth,
            startY: 200,
            receiptData: receiptData
        });
        
        // 戻り値でシーン状態を設定
        this.correctAmount = result.correctAmount;
        
        // 🆕 チュートリアル: 領収書の保険種別を登録
        if (result.insuranceTypeText) {
             TutorialManager.getInstance(this.game).registerButton('payment_receipt_insurance_type', result.insuranceTypeText);
        }
        
        console.log('[DEBUG] PaymentScene _renderReceiptContent - correctAmount:', this.correctAmount);
    }

    
    _renderKarteContent(areaX, areaWidth) {
        const patient = this.currentPatient;
        const details = patient.insuranceDetails || {};
        
        // 🆕 Bルート判定: needsMedicalRecord が false なら受付票を表示
        if (patient.needsMedicalRecord === false) {
            this._renderReceptionSlipContent(areaX, areaWidth);
            return;
        }
        
        // 🔍 DEBUG: カルテ表示時のデバッグ情報
        console.log('[PaymentScene] 🔍 DEBUG: _renderKarteContent called');
        console.log('[PaymentScene] 🔍 DEBUG: patient.name =', patient.name);
        console.log('[PaymentScene] 🔍 DEBUG: patient.insuranceCategory =', patient.insuranceCategory);
        console.log('[PaymentScene] 🔍 DEBUG: patient.visualCategory =', patient.visualCategory);
        console.log('[PaymentScene] 🔍 DEBUG: details.保険種別 =', details['保険種別']);
        console.log('[PaymentScene] 🔍 DEBUG: details.保険区分 =', details['保険区分']);
        
        // ========================================
        // 🎨 保険種別に応じたアクセントカラー
        // ========================================
        const insuranceType = details['保険種別'] || patient.visualCategory || patient.insuranceCategory || '社保';
        let accentColor = 0x3498DB; // 社保 = 青
        if (insuranceType.includes('国保')) {
            accentColor = 0xE74C3C; // 国保 = 赤
        } else if (insuranceType.includes('後期') || insuranceType.includes('高齢')) {
            accentColor = 0x9B59B6; // 後期高齢者 = 紫
        }
        
        const graphics = this.add.graphics().setDepth(7);
        this.docContentContainer.add(graphics);
        
        // 🆕 バインダースタイル背景（保険種別カラー）- CheckSceneと統一
        graphics.fillStyle(accentColor, 1);
        graphics.fillRoundedRect(areaX - areaWidth/2 + 10, 175, areaWidth - 20, 720, 8);
        graphics.lineStyle(3, 0x333333, 1);
        graphics.strokeRoundedRect(areaX - areaWidth/2 + 10, 175, areaWidth - 20, 720, 8);
        
        // 白い紙部分
        graphics.fillStyle(0xFFFFFF, 1);
        graphics.fillRect(areaX - areaWidth/2 + 25, 190, areaWidth - 50, 690);
        
        const leftX = areaX - 220;
        let y = 195;
        
        // 様式番号
        this.docContentContainer.add(this.add.text(leftX, y, '様式第一号（一）の１', {
            fontSize: '12px', color: '#555', fontFamily: 'Serif'
        }));
        
        // タイトル
        this.docContentContainer.add(this.add.text(areaX, y + 15, '診 療 録', {
            fontSize: '28px', color: '#000', fontFamily: 'Serif', fontStyle: 'bold'
        }).setOrigin(0.5));
        
        y += 55;
        
        // 患者情報
        const id = details['ID'] || details['id'] || '---';
        const name = patient.name || details['氏名'] || '';
        const kana = details['フリガナ'] || details['カナ'] || '';
        const dob = details['生年月日'] || '----/--/--';
        const age = details['年齢'] || '';
        const gender = details['性別'] || '';
        
        const contentW = areaWidth - 60;
        
        // ID・氏名枠
        graphics.lineStyle(2, 0x000000, 1);
        graphics.strokeRect(leftX, y, 100, 55);
        graphics.strokeRect(leftX + 100, y, contentW - 100, 55);
        
        this.docContentContainer.add(this.add.text(leftX + 5, y + 3, '患者ID', {
            fontSize: '10px', color: '#555'
        }));
        this.docContentContainer.add(this.add.text(leftX + 50, y + 30, String(id), {
            fontSize: '18px', color: '#000'
        }).setOrigin(0.5));
        
        this.docContentContainer.add(this.add.text(leftX + 105, y + 3, kana, {
            fontSize: '12px', color: '#555'
        }));
        this.docContentContainer.add(this.add.text(leftX + 115, y + 22, name, {
            fontSize: '24px', color: '#000', fontStyle: 'bold'
        }));
        
        y += 55;
        
        // 生年月日・性別枠
        graphics.strokeRect(leftX, y, 250, 45);
        graphics.strokeRect(leftX + 250, y, contentW - 250, 45);
        
        this.docContentContainer.add(this.add.text(leftX + 10, y + 12, `生年月日: ${dob} (満${age})`, {
            fontSize: '15px', color: '#000'
        }));
        this.docContentContainer.add(this.add.text(leftX + 250 + (contentW - 250) / 2, y + 12, gender, {
            fontSize: '18px', color: '#000'
        }).setOrigin(0.5, 0));
        
        y += 45;
        
        // 住所枠
        graphics.strokeRect(leftX, y, contentW, 40);
        this.docContentContainer.add(this.add.text(leftX + 5, y + 3, '住所', {
            fontSize: '10px', color: '#555'
        }));
        
        y += 40;
        
        // 診療記録ヘッダー
        graphics.strokeRect(leftX, y, 80, 30);
        graphics.strokeRect(leftX + 80, y, contentW - 80, 30);
        
        this.docContentContainer.add(this.add.text(leftX + 40, y + 15, '年月日', {
            fontSize: '12px', color: '#000'
        }).setOrigin(0.5));
        this.docContentContainer.add(this.add.text(leftX + 90, y + 15, '記事（経過・処方・処置）', {
            fontSize: '12px', color: '#000'
        }).setOrigin(0, 0.5));
        
        y += 30;
        
        // 診療記録本体
        const noteH = 300;
        graphics.strokeRect(leftX, y, 80, noteH);
        graphics.strokeRect(leftX + 80, y, contentW - 80, noteH);
        
        // 罫線
        graphics.lineStyle(1, 0xCCCCCC, 1);
        for (let i = 1; i < 8; i++) {
            const lineY = y + (i * 37);
            graphics.beginPath();
            graphics.moveTo(leftX, lineY);
            graphics.lineTo(leftX + contentW, lineY);
            graphics.strokePath();
        }
        
        
        // 内容
        let noteY = y + 12;
        
        // 過去の日付を生成（ShelfSceneと同じロジック）
        const generatePastDate = () => {
            const year = Phaser.Math.Between(2015, 2024);
            const maxMonth = (year === 2024) ? 11 : 12;
            const month = Phaser.Math.Between(1, maxMonth);
            const day = Phaser.Math.Between(1, 28);
            return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
        };
        const dateStr = generatePastDate();
        
        // 日付を左カラムに表示
        this.docContentContainer.add(this.add.text(leftX + 40, noteY, dateStr, {
            fontSize: '11px', color: '#000'
        }).setOrigin(0.5, 0));

        
        const triageDataForKarte = patient.triageData || {};
        const ccRaw = patient.complaint || triageDataForKarte['主訴'] || '特になし';
        
        // 🆕 主訴の表示（ShelfSceneと同じロジックで折り返し）
        // 左側のラベル
        this.docContentContainer.add(this.add.text(leftX + 90, noteY, '【主訴】', {
            fontSize: '16px', color: '#000', fontStyle: 'bold'
        }));
        
        // 主訴内容（useAdvancedWrap: true で日本語折り返し）
        const ccText = this.add.text(leftX + 90 + 70, noteY, ccRaw, {
            fontSize: '16px', color: '#000', fontStyle: 'bold',
            wordWrap: { width: contentW - 170, useAdvancedWrap: true },
            lineSpacing: 18 // 行間調整
        });
        this.docContentContainer.add(ccText);
        
        // 高さ計算と次の位置調整
        const textHeight = ccText.height;
        const rowsUsed = Math.ceil(textHeight / 37); // 罫線の高さ37px基準
        const offset = Math.max(1, rowsUsed) * 37;
        
        noteY += offset;

        // アレルギー
        this.docContentContainer.add(this.add.text(leftX + 90, noteY, '【アレルギー】', {
            fontSize: '14px', color: '#555'
        }));
        
        noteY += 37;
        
        // 既往歴
        const triageData = patient.triageData || {};
        const medHistory = patient.medicalHistory || triageData['既往歴'] || 'なし';
        this.docContentContainer.add(this.add.text(leftX + 90, noteY, `【既往歴】 ${medHistory}`, {
            fontSize: '14px', color: '#000'
        }));

        // 🚨 処方薬の表示箇所は削除済み

        
        noteY += 37;
        // 処方薬表示部分を削除

    }
    
    // ==========================================================
    // 💊 処方箋コンテンツ（コンポーネント使用）
    // ==========================================================
    _renderPrescriptionContent(areaX, areaWidth) {
        const patient = this.currentPatient;
        
        // 🆕 コンポーネントを使用して処方箋を描画
        PrescriptionDisplay.render(this, this.docContentContainer, patient, {
            areaX: areaX,
            areaWidth: areaWidth,
            startY: 195,
            medicineData: this.medicineData || [],
            chineseMedicineData: this.chineseMedicineData || []
        });
    }
    
    // ==========================================================
    // 📋 Bルート: 受付票コンテンツ（新規患者用）
    // ==========================================================
    _renderReceptionSlipContent(areaX, areaWidth) {
        const patient = this.currentPatient;
        
        // 🆕 コンポーネントを使用して受付票を描画
        // ReceptionSceneと同じ幅(450)に合わせる
        const slipWidth = 450; 

        const slip = ReceptionSlip.create(this, patient, {
            x: areaX,
            y: 550, // 🚨 修正: さらに下に調整 (240 -> 550)
            width: slipWidth,
            medicineData: this.medicineData || [],
            chineseMedicineData: this.chineseMedicineData || [],
            reservationTargetKeywords: this.reservationTargetKeywords,
            showFooter: false // 🆕 完了ボタンは表示しない
        });
        
        this.docContentContainer.add(slip);
    }

    // ==========================================================
    // 💰 金額入力エリア（画面右側）- モダンデザイン
    // ==========================================================
    _createPaymentArea() {
        const areaWidth = 480;
        const areaX = 1920 - areaWidth / 2 - 20;
        const areaY = 540;
        
        // ========================================
        // 🎨 モダン背景パネル（シャドウ付きカード）
        // ========================================
        const shadowBg = this.add.graphics().setDepth(4);
        shadowBg.fillStyle(0x000000, 0.12);
        shadowBg.fillRoundedRect(areaX - (areaWidth - 40)/2 + 5, areaY - 400 + 5, areaWidth - 40, 800, 12);
        
        const panelBg = this.add.graphics().setDepth(5);
        panelBg.fillStyle(0xFFFFFF, 1);
        panelBg.fillRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 800, 12);
        panelBg.lineStyle(2, 0xE0E0E0, 1);
        panelBg.strokeRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 800, 12);
        
        // ========================================
        // ヘッダー（黒ベース）
        // ========================================
        const headerBg = this.add.graphics().setDepth(6);
        headerBg.fillStyle(0x1A1A1A, 1);
        headerBg.fillRoundedRect(areaX - (areaWidth - 40)/2, areaY - 400, areaWidth - 40, 60, { tl: 12, tr: 12, bl: 0, br: 0 });
        
        this.add.text(areaX, 180, '💰 金額入力', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(7);
        
        // 保険種別選択
        this._createInsuranceSelection(240, areaX, areaWidth - 40);
        
        // 金額入力エリア
        this._createAmountInput(400, areaX, areaWidth - 40);
    }
    
    _createInsuranceSelection(y, baseX, areaWidth) {
        this.add.text(baseX, y, '【保険種別】', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5).setDepth(5);
        
        const insuranceTypes = [
            { key: '社保', label: '社保', color: 0x3498DB },
            { key: '国保', label: '国保', color: 0xE74C3C },
            { key: '後期高齢者', label: '後期', color: 0x9B59B6 }
        ];
        
        const startX = baseX - 130;
        const gap = 130;
        this.insuranceButtons = {};
        
        insuranceTypes.forEach((type, i) => {
            const x = startX + i * gap;
            
            const btn = this.add.rectangle(x, y + 50, 110, 50, type.color)
                .setStrokeStyle(3, 0xFFFFFF)
                .setInteractive({ useHandCursor: true })
                .setDepth(5);
            
            const label = this.add.text(x, y + 50, type.label, {
                fontSize: '16px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#FFFFFF'
            }).setOrigin(0.5).setDepth(6);
            
            btn.on('pointerover', () => {
                if (this.selectedInsurance !== type.key) {
                    btn.setScale(1.1);
                }
            });
            btn.on('pointerout', () => btn.setScale(1.0));
            
            btn.on('pointerdown', () => {
                this._playSE('se_display_card', 0.6);
                // 全ボタンのリセット
                Object.values(this.insuranceButtons).forEach(b => {
                    b.btn.setStrokeStyle(4, 0xFFFFFF);
                    b.btn.setAlpha(0.7);
                });
                // 選択状態
                btn.setStrokeStyle(6, 0xFFD700);
                btn.setAlpha(1);
                this.selectedInsurance = type.key;
                
                // 🆕 チュートリアル完了
                TutorialManager.getInstance(this.game).completeStep('PAYMENT_INSURANCE_SELECTED');
                
                this._checkCanComplete();
            });
            btn.setAlpha(0.7);
            this.insuranceButtons[type.key] = { btn, label };
            
            // 🆕 チュートリアル登録
            if (type.key === '社保') {
                TutorialManager.getInstance(this.game).registerButton('payment_insurance_shaho', btn);
            }
        });
    }
    
    _createAmountInput(y, baseX, areaWidth) {
        this.add.text(baseX, y, '【金額を入力】', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5).setDepth(5);
        
        // 正解金額表示（ヒント）
        const hintText = `※ 領収書の金額を入力`;
        this.add.text(baseX, y + 25, hintText, {
            fontSize: '14px', color: '#888888'
        }).setOrigin(0.5).setDepth(5);
        
        // 入力フィールド背景
        this.inputFieldBg = this.add.rectangle(baseX, y + 80, 260, 60, 0xFFFFFF)
            .setStrokeStyle(4, 0x4CAF50)
            .setDepth(5);
        
        // 入力テキスト表示
        this.inputText = this.add.text(baseX, y + 80, '¥_____', {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }).setOrigin(0.5).setDepth(6);
        
        // テンキー
        this._createNumpad(baseX, y + 200);
        
        // キーボード入力
        this.input.keyboard.on('keydown', (event) => {
            if (event.key >= '0' && event.key <= '9') {
                this._addDigit(event.key);
            } else if (event.key === 'Backspace') {
                this._removeDigit();
            } else if (event.key === 'Enter') {
                this._tryComplete();
            }
        });
    }
    
    _createNumpad(x, y) {
        const keys = [
            ['7', '8', '9'],
            ['4', '5', '6'],
            ['1', '2', '3'],
            ['C', '0', '←']
        ];
        
        // 🆕 チュートリアル用: テンキーエリア全体を登録（ハイライト用）
        // キー配置領域全体をカバーする透明な矩形を作成
        const numpadWidth = 65 * 3;
        const numpadHeight = 65 * 4;
        const numpadBg = this.add.rectangle(x - 65 + numpadWidth/2 - 32, y + numpadHeight/2 - 32, numpadWidth + 20, numpadHeight + 20, 0x000000, 0);
        TutorialManager.getInstance(this.game).registerButton('numpad_area', numpadBg);
        
        const btnSize = 55;
        const gap = 65;
        
        keys.forEach((row, rowIdx) => {
            row.forEach((key, colIdx) => {
                const bx = x - gap + colIdx * gap;
                const by = y + rowIdx * gap;
                
                let color = 0xFFFFFF;
                if (key === 'C') color = 0xE74C3C;
                else if (key === '←') color = 0xFFC107;
                
                const btn = this.add.rectangle(bx, by, btnSize, btnSize, color)
                    .setStrokeStyle(2, 0x333333)
                    .setInteractive({ useHandCursor: true })
                    .setDepth(5);
                
                this.add.text(bx, by, key, {
                    fontSize: '28px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: key === 'C' || key === '←' ? '#FFFFFF' : '#333333'
                }).setOrigin(0.5).setDepth(6);
                
                btn.on('pointerdown', () => {
                    this._playSE('se_typing', 0.5); // 🔊 テンキー入力音 (typing)
                    if (key === 'C') {
                        this.inputAmount = '';
                    } else if (key === '←') {
                        this._removeDigit();
                    } else {
                        this._addDigit(key);
                    }
                    this._updateInputDisplay();
                    this._checkCanComplete();
                });
            });
        });
    }
    
    _addDigit(digit) {
        if (this.inputAmount.length < 7) {
            this.inputAmount += digit;
            this._updateInputDisplay();
            this._checkCanComplete();
        }
    }
    
    _removeDigit() {
        this.inputAmount = this.inputAmount.slice(0, -1);
        this._updateInputDisplay();
        this._checkCanComplete();
    }
    
    _updateInputDisplay() {
        const amount = parseInt(this.inputAmount) || 0;
        this.inputText.setText(`¥${amount.toLocaleString()}`);
    }

    // ==========================================================
    // 📅 次回予約エリア（コンパクト下部バー + ポップアップカレンダー）
    // ==========================================================
    _createReservationArea() {
        const centerX = 960;
        const areaY = 1020; // 画面下部
        
        // 処方日数を取得（カレンダー生成用）
        const patient = this.currentPatient;
        const prescriptionDays = patient?.triageData?.['処方日数'] || patient?.prescriptionDays || '28日';
        
        // ゲーム内の「今日」を定義
        this.gameBaseDate = new Date(2025, 9, 15);
        
        // ========================================
        // プレミアムボタン配置: [予約しない] → [📅] → [❓]
        // ガラスモーフィズム風デザイン
        // ========================================
        const btnGap = 180;
        const startX = centerX - btnGap;
        
        // --- 予約しないボタン（プレミアムデザイン） ---
        const noReservationContainer = this.add.container(startX, areaY).setDepth(10);
        
        // グラデーション風背景
        const noBtnBg = this.add.graphics();
        noBtnBg.fillGradientStyle(0x4CAF50, 0x4CAF50, 0x388E3C, 0x388E3C, 1);
        noBtnBg.fillRoundedRect(-80, -28, 160, 56, 12);
        noBtnBg.lineStyle(2, 0xFFFFFF, 0.3);
        noBtnBg.strokeRoundedRect(-80, -28, 160, 56, 12);
        
        // シャドウ効果
        const noShadow = this.add.graphics();
        noShadow.fillStyle(0x000000, 0.2);
        noShadow.fillRoundedRect(-78, -24, 160, 56, 12);
        noShadow.setPosition(2, 4);
        
        const noLabel = this.add.text(0, 0, '✓ 予約しない', {
            fontSize: '17px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const noHit = this.add.rectangle(0, 0, 160, 56, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        
        noReservationContainer.add([noShadow, noBtnBg, noLabel, noHit]);
        this.noReservationBtn = noReservationContainer;
        this.noReservationLabel = noLabel;
        this.noBtnBg = noBtnBg;
        
        noHit.on('pointerdown', () => {
            this._playSE('se_scroll', 0.6);
            this.reservationDate = 0;
            this.selectedReservationDate = null;
            this._updateReservationButtonStyles('none');
            this._checkCanComplete();
        });
        
        noHit.on('pointerover', () => {
            this.tweens.add({ targets: noReservationContainer, scale: 1.05, duration: 100, ease: 'Back.Out' });
        });
        noHit.on('pointerout', () => {
            this.tweens.add({ targets: noReservationContainer, scale: 1.0, duration: 100, ease: 'Power2' });
        });
        
        TutorialManager.getInstance(this.game).registerButton('reservation_button_0', noReservationContainer);
        
        // --- カレンダーアイコンボタン（プレミアムデザイン） ---
        const calendarIconBtn = this.add.container(centerX, areaY).setDepth(10);
        
        // グラデーション背景
        const calBtnBg = this.add.graphics();
        calBtnBg.fillGradientStyle(0x3498DB, 0x3498DB, 0x2980B9, 0x2980B9, 1);
        calBtnBg.fillRoundedRect(-35, -28, 70, 56, 12);
        calBtnBg.lineStyle(2, 0xFFFFFF, 0.3);
        calBtnBg.strokeRoundedRect(-35, -28, 70, 56, 12);
        
        const calShadow = this.add.graphics();
        calShadow.fillStyle(0x000000, 0.2);
        calShadow.fillRoundedRect(-33, -24, 70, 56, 12);
        calShadow.setPosition(2, 4);
        
        const calIconText = this.add.text(0, 0, '📅', { fontSize: '30px' }).setOrigin(0.5);
        
        const calIconHit = this.add.rectangle(0, 0, 70, 56, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        
        calendarIconBtn.add([calShadow, calBtnBg, calIconText, calIconHit]);
        this.calendarIconBtn = calendarIconBtn;
        this.calBtnBg = calBtnBg;
        
        calIconHit.on('pointerover', () => {
            this.tweens.add({ targets: calendarIconBtn, scale: 1.1, duration: 100, ease: 'Back.Out' });
        });
        calIconHit.on('pointerout', () => {
            this.tweens.add({ targets: calendarIconBtn, scale: 1.0, duration: 100, ease: 'Power2' });
        });
        calIconHit.on('pointerdown', () => {
            this._playSE('se_display_card', 0.6);
            this._showCalendarPopup(prescriptionDays);
        });
        
        TutorialManager.getInstance(this.game).registerButton('reservation_calendar_icon', calendarIconBtn);
        
        // --- ヘルプアイコンボタン（プレミアムデザイン） ---
        const helpIconBtn = this.add.container(startX + btnGap * 2, areaY).setDepth(10);
        
        const helpBtnBg = this.add.graphics();
        helpBtnBg.fillGradientStyle(0x9B59B6, 0x9B59B6, 0x8E44AD, 0x8E44AD, 1);
        helpBtnBg.fillRoundedRect(-28, -28, 56, 56, 28); // 円形
        helpBtnBg.lineStyle(2, 0xFFFFFF, 0.3);
        helpBtnBg.strokeRoundedRect(-28, -28, 56, 56, 28);
        
        const helpShadow = this.add.graphics();
        helpShadow.fillStyle(0x000000, 0.2);
        helpShadow.fillRoundedRect(-26, -24, 56, 56, 28);
        helpShadow.setPosition(2, 4);
        
        const helpIcon = this.add.text(0, 0, '❓', { fontSize: '26px' }).setOrigin(0.5);
        
        const helpHit = this.add.rectangle(0, 0, 56, 56, 0xFFFFFF, 0)
            .setInteractive({ useHandCursor: true });
        
        helpIconBtn.add([helpShadow, helpBtnBg, helpIcon, helpHit]);
        
        // ヘルプツールチップ（プレミアム）
        const helpTooltip = this.add.container(startX + btnGap * 2, areaY - 80).setDepth(300).setVisible(false);
        
        const tooltipBg = this.add.graphics();
        tooltipBg.fillStyle(0xFFFFFF, 0.98);
        tooltipBg.fillRoundedRect(-140, -80, 280, 110, 12);
        tooltipBg.lineStyle(2, 0x9B59B6, 1);
        tooltipBg.strokeRoundedRect(-140, -80, 280, 110, 12);
        
        // 吹き出し三角
        tooltipBg.fillStyle(0xFFFFFF, 1);
        tooltipBg.fillTriangle(0, 30, -10, 15, 10, 15);
        tooltipBg.lineStyle(2, 0x9B59B6, 1);
        tooltipBg.beginPath();
        tooltipBg.moveTo(-10, 15);
        tooltipBg.lineTo(0, 30);
        tooltipBg.lineTo(10, 15);
        tooltipBg.strokePath();
        
        const tooltipTitle = this.add.text(0, -65, '💡 予約が必要な患者', {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#9B59B6',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        const tooltipText = this.add.text(0, -25, '既往歴に「癌」「高血圧」「糖尿病」\n「高コレステロール」「高脂血症」がある方', {
            fontSize: '12px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            align: 'center',
            lineSpacing: 3
        }).setOrigin(0.5);
        
        helpTooltip.add([tooltipBg, tooltipTitle, tooltipText]);
        
        helpHit.on('pointerover', () => {
            this.tweens.add({ targets: helpIconBtn, scale: 1.1, duration: 100, ease: 'Back.Out' });
            helpTooltip.setVisible(true);
            this.tweens.add({ targets: helpTooltip, alpha: { from: 0, to: 1 }, duration: 150 });
        });
        helpHit.on('pointerout', () => {
            this.tweens.add({ targets: helpIconBtn, scale: 1.0, duration: 100, ease: 'Power2' });
            helpTooltip.setVisible(false);
        });
        
        // --- 選択中の予約日表示 ---
        this.reservationStatusText = this.add.text(centerX, areaY - 45, '', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#2E7D32',
            fontStyle: 'bold',
            stroke: '#FFFFFF',
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(10);
        
        // デフォルトで「予約しない」を選択
        this.reservationDate = 0;
        this._updateReservationButtonStyles('none');
    }
    
    // ========================================
    // カレンダーポップアップ表示
    // ========================================
    _showCalendarPopup(prescriptionDays) {
        if (this.calendarPopup) {
            this._closeCalendarPopup();
            return;
        }

        // チュートリアル通知
        TutorialManager.getInstance(this.game).completeStep('CALENDAR_OPENED');
        
        const centerX = 960;
        const centerY = 300; // さらに上に移動して見切れを防止
        
        // オーバーレイ（クリックで閉じる）
        const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.5)
            .setInteractive()
            .setDepth(100);
        overlay.on('pointerdown', () => this._closeCalendarPopup());
        
        // ポップアップコンテナ（ドラッグ可能）
        this.calendarPopup = this.add.container(centerX, centerY).setDepth(150);
        
        // 背景パネル（ドラッグ対象全体）
        const popupBg = this.add.graphics();
        popupBg.fillStyle(0xFFFFFF, 1);
        popupBg.fillRoundedRect(-210, -50, 420, 420, 16);
        popupBg.lineStyle(3, 0x2E7D32, 1);
        popupBg.strokeRoundedRect(-210, -50, 420, 420, 16);
        
        // ドラッグ用ヘッダー
        const dragHandle = this.add.rectangle(0, -30, 400, 40, 0x2E7D32)
            .setInteractive({ useHandCursor: true });
        
        const dragText = this.add.text(0, -30, '📅 次回予約日を選択', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 閉じるボタン
        const closeBtn = this.add.text(185, -30, '✕', {
            fontSize: '20px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => this._closeCalendarPopup());
        closeBtn.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtn.on('pointerout', () => closeBtn.setScale(1.0));
        
        this.calendarPopup.add([popupBg, dragHandle, dragText, closeBtn]);
        
        // カレンダー本体
        const calendar = ReservationCalendar.create(this, {
            x: 0,
            y: 0,
            baseDate: this.gameBaseDate,
            prescriptionDays: prescriptionDays,
            onSelect: (selectedDate, daysFromToday) => {
                console.log(`[予約カレンダー] 選択: ${selectedDate.toLocaleDateString('ja-JP')}, ${daysFromToday}日後`);
                this.reservationDate = daysFromToday;
                this.selectedReservationDate = selectedDate;
                
                // ステータス更新
                const dateStr = selectedDate.toLocaleDateString('ja-JP', { month: 'long', day: 'numeric' });
                this.reservationStatusText.setText(`📅 予約日: ${dateStr}（${daysFromToday}日後）`);
                this._updateReservationButtonStyles('calendar');
                
                // チュートリアル通知
                if (daysFromToday > 0) {
                    TutorialManager.getInstance(this.game).completeStep('RESERVATION_TOGGLED');
                }
                
                this._checkCanComplete();
                
                // 選択後にポップアップを閉じる
                this.time.delayedCall(300, () => this._closeCalendarPopup());
            }
        });
        
        // カレンダーをポップアップに追加（位置調整）
        calendar.setPosition(0, 30);
        this.calendarPopup.add(calendar);
        
        // ドラッグ処理（ポインター位置ベース）
        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;
        
        dragHandle.on('pointerdown', (pointer) => {
            isDragging = true;
            dragStartX = pointer.x - this.calendarPopup.x;
            dragStartY = pointer.y - this.calendarPopup.y;
        });
        
        this.input.on('pointermove', (pointer) => {
            if (isDragging && this.calendarPopup) {
                this.calendarPopup.x = pointer.x - dragStartX;
                this.calendarPopup.y = pointer.y - dragStartY;
            }
        });
        
        this.input.on('pointerup', () => {
            isDragging = false;
        });
        
        // オーバーレイを参照として保持
        this.calendarOverlay = overlay;
        
        // ポップインアニメーション
        this.calendarPopup.setScale(0.8).setAlpha(0);
        this.tweens.add({
            targets: this.calendarPopup,
            scale: 1,
            alpha: 1,
            duration: 200,
            ease: 'Back.Out'
        });
    }
    
    _closeCalendarPopup() {
        if (this.calendarPopup) {
            this.tweens.add({
                targets: this.calendarPopup,
                scale: 0.8,
                alpha: 0,
                duration: 150,
                ease: 'Power2',
                onComplete: () => {
                    if (this.calendarPopup) {
                        this.calendarPopup.destroy();
                        this.calendarPopup = null;
                    }
                }
            });
        }
        if (this.calendarOverlay) {
            this.calendarOverlay.destroy();
            this.calendarOverlay = null;
        }
    }
    
    _updateReservationButtonStyles(selected) {
        if (selected === 'none') {
            // 予約しないが選択 - 緑色
            if (this.noBtnBg) {
                this.noBtnBg.clear();
                this.noBtnBg.fillGradientStyle(0x4CAF50, 0x4CAF50, 0x388E3C, 0x388E3C, 1);
                this.noBtnBg.fillRoundedRect(-80, -28, 160, 56, 12);
                this.noBtnBg.lineStyle(2, 0xFFFFFF, 0.3);
                this.noBtnBg.strokeRoundedRect(-80, -28, 160, 56, 12);
            }
            if (this.noReservationLabel) {
                this.noReservationLabel.setText('✓ 予約しない');
                this.noReservationLabel.setColor('#FFFFFF');
            }
            this.reservationStatusText.setText('');
        } else {
            // カレンダーから選択 - グレー
            if (this.noBtnBg) {
                this.noBtnBg.clear();
                this.noBtnBg.fillGradientStyle(0xBDBDBD, 0xBDBDBD, 0x9E9E9E, 0x9E9E9E, 1);
                this.noBtnBg.fillRoundedRect(-80, -28, 160, 56, 12);
                this.noBtnBg.lineStyle(2, 0xFFFFFF, 0.2);
                this.noBtnBg.strokeRoundedRect(-80, -28, 160, 56, 12);
            }
            if (this.noReservationLabel) {
                this.noReservationLabel.setText('予約しない');
                this.noReservationLabel.setColor('#666666');
            }
        }
    }
    
    _checkReservationTarget() {
        // 内部的に予約対象者かどうかは判定するが、表示はしない
        const patient = this.currentPatient;
        const triage = patient.triageData || {};
        const history = triage['既往歴'] || patient.medicalHistory || '';
        
        this.isReservationTarget = this.reservationTargetKeywords.some(kw => history.includes(kw));
    }

    // ==========================================================
    // ナビゲーション
    // ==========================================================
    _createNavigationButtons() {
        // 戻るボタン
        const backBtn = NavigationButton.create(this, {
            x: 170,
            y: 1000,
            label: '処方確認に戻る',
            icon: '📋',
            colorScheme: 'purple',
            width: 260,
            height: 55,
            arrowDirection: 'left',
            onClick: () => this.slideToScene('CheckScene', 'right')
        });
        backBtn.setDepth(10);
        
        // 会計完了ボタン（金額入力エリア内に配置）
        const paymentAreaX = 1920 - 480 / 2 - 20; // 金額入力エリアの中心X
        this.completeBtn = this.add.rectangle(paymentAreaX, 880, 280, 60, 0xBDBDBD)
            .setStrokeStyle(4, 0x757575)
            .setDepth(10);
        
        this.completeBtnText = this.add.text(paymentAreaX, 880, '✅ 会計完了', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(11);
        
        this.completeBtn.setInteractive({ useHandCursor: true });
        this.completeBtn.on('pointerdown', () => {
            //this._playSE('se_payment', 0.8);
            this._tryComplete();
        });
        // 🆕 チュートリアル登録
        TutorialManager.getInstance(this.game).registerButton('payment_ok_button', this.completeBtn);
    }
    
    _checkCanComplete() {
        const amountEntered = this.inputAmount.length > 0;
        const insuranceSelected = this.selectedInsurance !== null;
        const reservationSelected = this.reservationDate !== null;
        
        if (amountEntered && insuranceSelected && reservationSelected) {
            this.completeBtn.setFillStyle(0x4CAF50);
            this.completeBtn.setStrokeStyle(4, 0x388E3C);
        } else {
            this.completeBtn.setFillStyle(0xBDBDBD);
            this.completeBtn.setStrokeStyle(4, 0x757575);
        }
    }
    
    _tryComplete() {
        // 🚨 修正: 紙保険証患者が「マイナ」タブを選択した場合は会計不可
        // 紙保険証の患者は必ず「保険証を探す」タブで確認が必要
        if (this.insuranceType === 'paper' && this.insuranceTabMode === 'myna') {
            this._showError('保険証の確認が必要です！\n処方確認画面に戻って\n「保険証を探す」から確認してください');
            this._updateSpeechBubble('保険証を渡したと\n思うのですが...', 'error');
            return;
        }
        
        // 🚨 修正: 紙保険証で未確認の場合は支払いを許可しない
        if (this.insuranceType === 'paper' && !this.insuranceVerified) {
            this._showError('保険証が確認されていません！\n処方確認画面に戻って確認してください');
            this._updateSpeechBubble('保険証を渡したと\n思うのですが...', 'error');
            return;
        }
        
        const enteredAmount = parseInt(this.inputAmount) || 0;
        
        // 金額チェック
        if (enteredAmount !== this.correctAmount) {
            this._showError(`金額が違います！\n正解: ¥${this.correctAmount.toLocaleString()}`);
            this._addScore(this.SCORE_WRONG_AMOUNT, '会計時: 金額入力間違い');
            this._updateSpeechBubble('金額が違う\nようですが...', 'error');
            return;
        }
        
        // 保険種別チェック
        const patient = this.currentPatient;
        const details = patient.insuranceDetails || {};
        const age = parseInt(details['年齢']) || 0;
        const correctInsurance = age >= 70 ? '後期高齢者' : (details['保険種別'] || '社保');
        
        if (this.selectedInsurance !== correctInsurance) {
            this._showError(`保険種別が違います！\n正解: ${correctInsurance}`);
            this._addScore(this.SCORE_WRONG_AMOUNT, '会計時: 保険種別間違い');
            this._updateSpeechBubble('保険種別が違う\nようですが...', 'error');
            return;
        }
        
        // 🚨 金額正解（スコアログには表示しない）
        
        // 次回予約スコア計算
        let reservationScore = 0;
        let reservationReason = '';
        
        // 🔍 DEBUG: 予約関連のデバッグ情報
        console.log('[PaymentScene] 🔍 DEBUG: === 予約スコア計算開始 ===');
        console.log('[PaymentScene] 🔍 DEBUG: this.reservationDate =', this.reservationDate);
        console.log('[PaymentScene] 🔍 DEBUG: this.isReservationTarget =', this.isReservationTarget);
        console.log('[PaymentScene] 🔍 DEBUG: this.selectedReservationDate =', this.selectedReservationDate);
        console.log('[PaymentScene] 🔍 DEBUG: this.reservationCalendar =', this.reservationCalendar ? 'exists' : 'null');
        if (this.reservationCalendar) {
            console.log('[PaymentScene] 🔍 DEBUG: calendar.isCorrectSelection() =', this.reservationCalendar.isCorrectSelection());
            console.log('[PaymentScene] 🔍 DEBUG: calendar.getSelectedDate() =', this.reservationCalendar.getSelectedDate());
            console.log('[PaymentScene] 🔍 DEBUG: calendar.getCorrectDate() =', this.reservationCalendar.getCorrectDate());
        }
        
        if (this.reservationDate > 0) {
            console.log('[PaymentScene] 🔍 DEBUG: reservationDate > 0, checking isReservationTarget');
            if (this.isReservationTarget) {
                reservationScore = this.SCORE_RESERVATION_CORRECT;
                reservationReason = '次回予約: 予約作成';
                console.log('[PaymentScene] 🔍 DEBUG: 予約対象者に予約作成 → +', reservationScore);
            } else {
                reservationScore = this.SCORE_RESERVATION_WRONG;
                reservationReason = '次回予約: 予約不要患者への予約';
                console.log('[PaymentScene] 🔍 DEBUG: 予約不要患者に予約作成 → ', reservationScore);
                this._showWarning(`⚠️ 予約不要の患者に予約を入れました！\n${this.SCORE_RESERVATION_WRONG}点`);
                this._updateSpeechBubble('予約はお願いして\nませんが...', 'error');
            }
        } else {
            console.log('[PaymentScene] 🔍 DEBUG: reservationDate <= 0 (予約なし)');
            if (this.isReservationTarget) {
                reservationScore = this.SCORE_RESERVATION_MISSED;
                reservationReason = '次回予約: 予約忘れ';
                console.log('[PaymentScene] 🔍 DEBUG: 予約対象者に予約忘れ → ', reservationScore);
                this._showWarning(`⚠️ 要予約患者の予約を忘れました！\n${this.SCORE_RESERVATION_MISSED}点`);
                this._updateSpeechBubble('次回の予約は\nどうなりますか？', 'error');
            } else {
                console.log('[PaymentScene] 🔍 DEBUG: 予約不要で予約なし → OK');
            }
        }
        
        // スコア加算
        // 🆕 正しい予約(+10)はボーナス扱い(isGlobal=true)、間違い(-40,-20)はミス扱い(isGlobal=false)
        if (reservationScore !== 0) {
            const isBonus = reservationScore > 0;
            this._addScore(Math.abs(reservationScore), reservationReason, isBonus);
        }
        
        // 🚨 修正: ミス累計に応じた会計完了ボーナス (これは全体ポイント)
        const completionResult = this._calculateCompletionBonus();
        this._addScore(completionResult.points, completionResult.reason, true); // isGlobal = true
        
        // 🆕 コンボ処理
        const gameState = GameStateManager.getInstance(this.game);
        const noMistakes = (this.mistakePoints === 0 && reservationScore >= 0);
        
        if (noMistakes) {
            // ミスなし → コンボ増加
            const newComboCount = gameState.incrementCombo();
            const comboBonus = gameState.getComboBonus();
            const levelName = gameState.getComboLevelName();
            
            // コンボボーナス加算
            if (comboBonus > 0) {
                this._addScore(comboBonus, `コンボボーナス (${newComboCount}連続)`, true);
            }
            
            // HUDにコンボ更新を通知
            EventBus.emit(GameEvents.COMBO_UPDATE, {
                count: newComboCount,
                levelName: levelName
            });
            
            // 🆕 チュートリアル: 会計完了を通知
            TutorialManager.getInstance(this.game).completeStep('PAYMENT_COMPLETED');
            
            console.log(`🔥 コンボ: ${newComboCount}連続 (ボーナス: +${comboBonus})`);
        } else {
            // ミスあり → コンボリセット
            if (gameState.getComboCount() > 0) {
                gameState.resetCombo();
                EventBus.emit(GameEvents.COMBO_BREAK, {});
                console.log('💔 コンボ途切れ');
            }
        }
        
        // 🆕 タイムボーナス処理
        const elapsedTime = gameState.getElapsedTime('payment');
        const timeBonus = this._calculateTimeBonus(elapsedTime);
        
        if (timeBonus !== 0) {
            this._addScore(timeBonus, timeBonus > 0 ? '会計タイムボーナス' : '会計時間超過', true);
            
            if (timeBonus > 0) {
                // HUDにタイムボーナス通知
                EventBus.emit(GameEvents.TIME_BONUS_EARNED, { bonus: timeBonus });
            }
        }
        
        // タイミングをクリア
        gameState.clearTiming('payment');
        
        if (completionResult.points >= 30) {
            this._updateSpeechBubble('ありがとう\nございました！', 'success');
        } else if (completionResult.points < 0) {
            this._updateSpeechBubble('お世話に\nなりました...', 'error');
        } else {
            this._updateSpeechBubble('ありがとう\nございます', 'normal');
        }
        
        // 完了
        console.log('会計完了:', patient.name, '金額:', enteredAmount, '予約スコア:', reservationScore, '経過時間:', elapsedTime.toFixed(1) + '秒');
        this._showSuccess();
    }
    
    // ==========================================================
    // ⏱️ タイムボーナス計算
    // ==========================================================
    _calculateTimeBonus(elapsedTime) {
        if (elapsedTime < 0) return 0;  // タイミング未開始
        
        if (elapsedTime <= this.TIME_BONUS_TARGET) {
            // 高速完了 → ボーナス
            return this.TIME_BONUS_POINTS;
        } 
        // 🚨 修正: 時間超過ペナルティを廃止 (常に0を返す)
        // else if (elapsedTime >= this.TIME_PENALTY_THRESHOLD) {
        //     return this.TIME_PENALTY_POINTS;
        // }
        
        return 0;  // 普通
        
        return 0;  // 普通
    }
    
    _showError(message) {
        const overlay = this.add.rectangle(960, 540, 600, 200, 0x000000, 0.8).setDepth(100);
        const text = this.add.text(960, 540, message, {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FF5252',
            align: 'center'
        }).setOrigin(0.5).setDepth(101);
        
        this.time.delayedCall(2000, () => {
            overlay.destroy();
            text.destroy();
        });
    }
    
    _showWarning(message) {
        const overlay = this.add.rectangle(960, 540, 600, 200, 0x000000, 0.8).setDepth(100);
        const text = this.add.text(960, 540, message, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFC107',
            align: 'center'
        }).setOrigin(0.5).setDepth(101);
        
        this.time.delayedCall(2500, () => {
            overlay.destroy();
            text.destroy();
            this._showSuccess();
        });
    }
    
    _showSuccess() {
    // 🔊 支払い完了SE
    this._playSE('se_payment', { volume: 0.8 });
    
    // 🆕 チュートリアル: 会計完了
    TutorialManager.getInstance(this.game).completeStep('PAYMENT_COMPLETED');
    
    // 🔹 完了ボーナスを再計算（表示用）
    const completionResult = this._calculateCompletionBonus();
    const scoreText = completionResult.points >= 0 
        ? `+${completionResult.points}点` 
        : `${completionResult.points}点`;
    const scoreColor = completionResult.points >= 0 ? '#FFD700' : '#FF6B6B';
    
    const overlay = this.add.rectangle(960, 540, 1920, 1080, 0x4CAF50, 0.9).setDepth(100);
    const text = this.add.text(960, 480, '✅ 会計完了！', {
        fontSize: '64px',
        fontFamily: '"Noto Sans JP", sans-serif',
        color: '#FFFFFF'
    }).setOrigin(0.5).setDepth(101);
    
    // 🔹 スコア表示を追加
    const scoreDisplay = this.add.text(960, 580, scoreText, {
        fontSize: '48px',
        fontFamily: '"Noto Sans JP", sans-serif',
        color: scoreColor,
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(101);
    
    // スコアアニメーション
    this.tweens.add({
        targets: scoreDisplay,
        scale: { from: 0.5, to: 1.2 },
        duration: 300,
        ease: 'Back.easeOut',
        yoyo: true,
        repeat: 0
    });
    
    // 会計完了の通知（患者名は不要）
    // HUDScene.addScore で既に通知されているので、ここでは不要
    
    // 🚨 修正: CheckScene の待ちリストから患者を削除
    this._removePatientFromQueue();

    // 🚨 修正: ReceptionSceneの履歴を更新 (グローバルログではなく、この患者だけのログを使用)
    const reception = this.scene.get('ReceptionScene');
    const hud = this.scene.get('HUDScene');
    
    if (reception) {
        // 🚨 修正: 受付時のログ(scoreHistory)とPayment時のログを結合
        // これにより earnedScore が正しく計算される
        const receptionLog = this.currentPatient.scoreHistory || [];
        const paymentLog = (hud && hud.getCurrentPatientLog) ? hud.getCurrentPatientLog() : [];
        const combinedLog = [...receptionLog, ...paymentLog];
        reception.addPatientHistory(this.currentPatient, this.mistakePoints, combinedLog);
    }

    // 🚨 修正: 成功メッセージ表示後にチェックシーンへ遷移
    this.time.delayedCall(2000, () => {
        this.slideToScene('CheckScene', 'right');
    });
}
    
    // 待ちリストから患者を削除
    _removePatientFromQueue() {
        if (!this.currentPatient) return;
        
        // Registry から待ちリストを取得
        let queue = this.registry.get('checkSceneAccountingQueue') || [];
        
        // 患者を検索して削除
        const index = queue.findIndex(p => 
            (p.name.replace(/\s+/g, '') === this.currentPatient.name.replace(/\s+/g, '')) || 
            (p.insuranceDetails?.ID === this.currentPatient.insuranceDetails?.ID)
        );
        
        if (index > -1) {
            queue.splice(index, 1);
            this.registry.set('checkSceneAccountingQueue', queue);
            console.log(`[PaymentScene] 患者 ${this.currentPatient.name} を待ちリストから削除しました`);
        }
    }
    
    // ==========================================================
    // 🪪 ペナルティチェック（印鑑・保険証）
    // ==========================================================
    _checkInsuranceVerificationPenalty() {
        // 印鑑が押されていない場合はペナルティ
        if (!this.stampPressed) {
            console.log('[ペナルティ] 印鑑が押されていません');
            this._addScore(this.SCORE_STAMP_NOT_PRESSED, '会計時: 印鑑未押印');
            this._showStampPenaltyWarning();
            this._updateSpeechBubble('印鑑が押されて\nないようです...', 'error');
        }
        
        // 紙保険証で受付した患者なのに保険証確認がされなかった場合はペナルティ
        if (this.insuranceType === 'paper' && !this.insuranceVerified) {
            console.log('[ペナルティ] 保険証確認がされていません');
            this._addScore(this.SCORE_INSURANCE_NOT_VERIFIED, '会計時: 保険証確認忘れ');
            this._showInsurancePenaltyWarning();
            // 🚨 User要望: テキスト変更
            this._updateSpeechBubble('保険証を渡したと\n思うのですが...', 'error');
        }
    }
    
    _showStampPenaltyWarning() {
        const warning = this.add.text(960, 120, `⚠️ 印鑑を押し忘れました！ (${this.SCORE_STAMP_NOT_PRESSED}点)`, {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FF0000',
            backgroundColor: '#FFEBEE',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(1000);
        
        this.tweens.add({
            targets: warning,
            alpha: 0,
            y: 80,
            duration: 3000,
            delay: 1500,
            onComplete: () => warning.destroy()
        });
    }
    
    _showInsurancePenaltyWarning() {
        // 画面上部の警告も少し変更
        const warning = this.add.text(960, 160, '⚠️ 保険証確認忘れ (-20点)', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FF6600',
            backgroundColor: '#FFF3E0',
            padding: { x: 20, y: 10 }
        }).setOrigin(0.5).setDepth(1000);
        
        this.tweens.add({
            targets: warning,
            alpha: 0,
            y: 120,
            duration: 3000,
            delay: 1500,
            onComplete: () => warning.destroy()
        });
    }
    
    _addScore(points, reason, isGlobal = false) {
        // 🚨 修正: マイナスポイントは存在しない、全て正の値として受け取る
        // isGlobal = true は完了ボーナス(Score)、isGlobal = false はMistake
        
        if (!isGlobal) {
            // Mistake Points (正の値) を加算
            this.mistakePoints += points;
        }
        
        // HUDSceneにスコアを送信
        const hud = this.scene.get('HUDScene');
        if (hud && hud.addScore) {
            // !isGlobal を isMistake フラグとして渡す
            hud.addScore(points, reason, isGlobal, !isGlobal);
        }
        console.log(`スコア: ${points} (${reason}) [累計ミス: ${this.mistakePoints}点] [Global: ${isGlobal}]`);
    }
    
    // ==========================================================
    // 📊 会計完了ボーナス計算（ミス累計・キュー順位に応じた評価）
    // ==========================================================
    _calculateCompletionBonus() {
        const mistakes = this.mistakePoints || 0;
        const queuePosition = this.queuePosition || 0;
        
        // 🔍 デバッグログ
        console.log('[PaymentScene] _calculateCompletionBonus:', {
            mistakes,
            queuePosition,
            expectedPenalty: queuePosition * 10
        });
        
        // 🆕 キュー順位に基づく減算（先頭=0は減算なし、2番目=1で-10pt、...）
        const positionPenalty = queuePosition * 10;
        
        // ミス数による基本ポイント計算
        let basePoints = 100;
        let baseReason = '会計完了';
        
        if (mistakes >= 60) {
            // 大量ミスはペナルティ固定（順位減算なし）
            console.log('[PaymentScene] 大量ミス → -200pt');
            return { points: -200, reason: '会計完了（わからないのにマニュアルも見れないの？）', positionPenalty: 0 };
        } else if (mistakes >= 30) {
            console.log('[PaymentScene] 厳重注意 → -100pt');
            return { points: -100, reason: '会計完了（厳重注意）', positionPenalty: 0 };
        } else if (mistakes >= 20) {
            console.log('[PaymentScene] 対応不備 → -30pt');
            return { points: -30, reason: '会計完了（対応不備）', positionPenalty: 0 };
        } else if (mistakes > 5) {
            basePoints = 30;
            baseReason = '会計完了（要注意）';
        } else {
            basePoints = 100;
            baseReason = '会計完了';
        }
        
        // 🆕 順位によるポイント減算（0未満は0に丸める）
        const adjustedPoints = Math.max(0, basePoints - positionPenalty);
        
        // 理由に順位スキップ情報を追加
        let reason = baseReason;
        if (positionPenalty > 0 && adjustedPoints < basePoints) {
            reason = `${baseReason}（順番スキップ: -${positionPenalty}）`;
        }
        
        console.log('[PaymentScene] 最終計算:', { basePoints, positionPenalty, adjustedPoints, reason });
        
        return { points: adjustedPoints, reason, positionPenalty };
    }
    
    // ==========================================================
    // 💊 薬名変換ヘルパー（漢方は番号+メーカー形式）
    // ==========================================================
    _convertToFakeName(realName) {
        // 西洋薬から検索
        let medicine = this.medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽商品名'];
        
        // 漢方から検索 → 番号+偽メーカー形式で表示
        medicine = this.chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        // 見つからない場合はそのまま返す
        return realName;
    }
    
    _getMedicineInfo(realName) {
        return MedicineUtils.getMedicineInfo(realName, this.medicineData, this.chineseMedicineData);
    }
    
    _getFakeGeneralName(realName) {
        return MedicineUtils.convertToFakeGeneralName(realName, this.medicineData, this.chineseMedicineData);
    }
}
