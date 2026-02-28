/**
 * TutorialManager.js - チュートリアル進行管理
 * 
 * シングルトンパターンでチュートリアル全体を管理
 */

import { TutorialSteps, TutorialPhases } from './TutorialSteps.js';
import { TutorialOverlay } from './TutorialOverlay.js';

export class TutorialManager {
    static instance = null;

    /**
     * シングルトンインスタンスを取得
     */
    static getInstance(game) {
        if (!TutorialManager.instance) {
            TutorialManager.instance = new TutorialManager(game);
        }
        return TutorialManager.instance;
    }

    /**
     * インスタンスをリセット（テスト用）
     */
    static resetInstance() {
        if (TutorialManager.instance) {
            TutorialManager.instance.destroy();
            TutorialManager.instance = null;
        }
    }

    constructor(game) {
        this.game = game;
        this.currentStepIndex = 0;
        this.isActive = false;
        this.isPaused = false;
        this.overlay = null;
        this.currentScene = null;
        this.completedSteps = new Set();
        
        // ボタン管理
        this.registeredButtons = new Map(); // name -> GameObject
        this.activeHighlight = null; // 現在光っているボタン名
        
        // 🆕 ミスカウント（段階的ペナルティ用）
        this.stepMistakeCount = 0;
        
        // 🆕 ミスフィードバック表示中フラグ
        this.isShowingMistakeFeedback = false;
        // 🆕 直前のステップでエラーがあったかどうか
        this.lastStepHadErrors = false;
        
        // 🆕 waitステップ用タイムアウトID
        this.waitTimeoutId = null;
        // 🆕 waitステップの最大待機時間（ミリ秒）
        this.WAIT_TIMEOUT_MS = 30000; // 30秒
        
        // 🆕 ボタン待機リトライカウンター
        this.buttonRetryCount = 0;
        // 🆕 ボタン待機の最大リトライ回数（10回 = 5秒）
        this.MAX_BUTTON_RETRIES = 10;
        
        // チュートリアル完了フラグ（localStorage）
        this.storageKey = 'tutorialCompleted';
        
        // エンターキーハンドラ
        this.enterKeyHandler = (event) => {
            if (event.code === 'Enter' && this.isActive && !this.isPaused) {
                // 🆕 TypingSceneがアクティブな場合はEnterキーを無視
                const typingScene = this.game.scene.getScene('TypingScene');
                if (typingScene && typingScene.scene.isActive()) {
                    return; // TypingScene内でのEnterは無視
                }
                
                // 🆕 入力が必要なステップ（action === 'click'）の場合はEnterキーを無視
                // info ステップのみクリック/エンターで進行可能にする
                if (currentStep && currentStep.completeOn !== 'NEXT_CLICK') {
                    return; // NEXT_CLICK以外の完了条件（ボタンクリックやイベント待機）ではEnterを無視
                }
                
                this.handleNextClick();
            }
        };
        window.addEventListener('keydown', this.enterKeyHandler);
        
        // 🆕 デバッグ用ショートカット: Ctrl+Shift+F1 でチュートリアルを強制進行
        this.debugKeyHandler = (event) => {
            if (event.ctrlKey && event.shiftKey && event.code === 'F1' && this.isActive) {
                event.preventDefault();
                console.log('[TutorialManager] 🔧 デバッグ: 強制ステップ進行');
                this._forceAdvanceStep();
            }
        };
        window.addEventListener('keydown', this.debugKeyHandler);
    }
    
    /**
     * デストラクタ
     */
    destroy() {
        window.removeEventListener('keydown', this.enterKeyHandler);
        window.removeEventListener('keydown', this.debugKeyHandler);
        if (this.overlay) {
            this.overlay.destroy();
            this.overlay = null;
        }
        this.isActive = false;
        this.registeredButtons.clear();
    }

    /**
     * ボタンを登録（各シーンから呼び出し）
     */
    registerButton(name, button) {
        if (!button) return;
        this.registeredButtons.set(name, button);
        // 🐛 DEBUG: ボタンオブジェクトに名前を保存（デバッグ用）
        button._tutorialButtonName = name;
        console.log(`[TutorialManager] 🟢 ボタン登録: ${name}`);
        
        // 既にアクティブならロック状態を適用
        if (this.isActive) {
            this._updateButtonLockState();
            
            // 🆕 遅延登録されたボタンが現在のターゲットならハイライトを更新
            const currentStep = TutorialSteps[this.currentStepIndex];
            if (currentStep && currentStep.targetButton === name) {
                console.log(`[TutorialManager] 🎯 ターゲットボタンが登録されました: ${name}`);
                this._showCurrentStep();
            }
        }
    }
    
    /**
     * ボタンの登録解除
     */
    unregisterButton(name) {
        this.registeredButtons.delete(name);
    }

    /**
     * チュートリアルを開始
     */
    start(startFromStep = 0) {
        console.log('[TutorialManager] チュートリアル開始');
        
        this.currentStepIndex = startFromStep;
        this.isActive = true;
        this.isPaused = false;
        this.completedSteps.clear();
        
        // 最初のステップを表示
        this._showCurrentStep();
    }
    
    /**
     * 🆕 現在のステップを取得
     */
    getCurrentStep() {
        return TutorialSteps[this.currentStepIndex] || null;
    }

    /**
     * 現在のステップのボタンロック状態を適用
     * 🆕 ボタンロック機能は無効化 - 全ボタンを常に有効にする
     */
    /**
     * 現在のステップのボタンロック状態を適用
     * ターゲット以外のボタンを無効化（HUDは除く）
     */
    _updateButtonLockState() {
        if (!this.isActive) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        const targetButtonName = currentStep ? currentStep.targetButton : null;
        
        // 🐛 DEBUG: どのステップ/ターゲットで呼ばれているか確認
        console.log(`[TutorialManager] 🔒 _updateButtonLockState: step=${currentStep?.id}, target=${targetButtonName}`);
        
        // 🆕 allowFreeOperationフラグがtrueの場合、全ボタンを許可（シーン移動以外）
        const allowFreeOperation = currentStep?.allowFreeOperation || false;
        
        // 🆕 グループ判定ロジック
        const isTriageGroup = targetButtonName?.startsWith('triage_');
        const isWaitTimeGroup = targetButtonName?.startsWith('wait_time_');
        const isCloseGroup = (targetButtonName === 'panel_close_button');

        this.registeredButtons.forEach((btn, name) => {
            if (!btn.scene) {
                this.registeredButtons.delete(name);
                return;
            }
            
            // HUDシーンのボタンは常に許可
            const isHUD = btn.scene.key === 'HUDScene';
            
            // 🆕 allowFreeOperationフラグがtrueの場合、シーン遷移以外は許可
            const sceneTransitionButtons = ['shelf_button', 'back_button', 'check_button', 'reception_button', 'check_ok_button'];
            if (allowFreeOperation) {
                // シーン遷移ボタン以外は全て許可
                if (sceneTransitionButtons.includes(name)) {
                    this._setInteractState(btn, name === targetButtonName);
                } else {
                    this._setInteractState(btn, true);
                }
                return; // 次のボタンへ
            }
            
            // ターゲットボタン判定
            let shouldEnable = (name === targetButtonName);
            
            // グループボタンの場合は兄弟要素も許可
            if (isTriageGroup && name.startsWith('triage_')) {
                shouldEnable = true;
            }
            if (isWaitTimeGroup && name.startsWith('wait_time_')) {
                shouldEnable = true;
            }
            if (isCloseGroup && name === 'panel_close_overlay') {
                shouldEnable = true;
            }
            
            // 🆕 薬辞典ボタンは常に許可
            if (name === 'medicine_list_button' || name.startsWith('medicine_')) {
                shouldEnable = true;
            }
            
            // 🆕 処方箋エラーアイテムがターゲットの場合、全ての処方箋アイテムを許可
            // （エラーアイテムが登録されていなくても、他のアイテムをクリックできるようにする）
            if (targetButtonName === 'prescription_item_error') {
                if (name.startsWith('prescription_item_')) {
                    shouldEnable = true;
                    console.log(`[TutorialManager] 🔓 処方箋アイテム有効化: ${name}`);
                }
            }
            
            // 🆕 受付完了ボタンの場合、フォーム操作系は全て許可
            if (targetButtonName === 'reception_complete_button') {
                const allowedFormButtons = [
                    'id_input_area', 'name_input_area',
                    'radio_paper', 'radio_myna',
                    'urine_checkbox',
                    'stamp_date_area', 'stamp_option_paper', 'stamp_option_myna', 'stamp_urine_area'
                ];
                if (allowedFormButtons.includes(name)) {
                    shouldEnable = true;
                }
            }
            
            // 🆕 会計完了ボタンの場合、会計操作系は全て許可
            if (targetButtonName === 'payment_ok_button') {
                // テンキー
                if (name.startsWith('numpad_')) {
                    shouldEnable = true;
                }
                // 保険選択
                if (name.startsWith('payment_insurance_')) {
                    shouldEnable = true;
                }
                // 予約関連
                if (name.startsWith('reservation_')) {
                    shouldEnable = true;
                }
                // タブ
                const allowedPaymentButtons = [
                    'payment_karte_tab', 'payment_prescription_tab', 'payment_receipt_tab',
                    'numpad_area'
                ];
                if (allowedPaymentButtons.includes(name)) {
                    shouldEnable = true;
                }
            }
            
            // 🆕 カルテ棚移動/受付戻りボタンの場合、他のシーン移動ボタンをブロック
            // sceneTransitionButtonsは上で定義済み
            const isSceneTransitionStep = (targetButtonName === 'shelf_button' || targetButtonName === 'back_button');
            
            // 最初にHUDボタンを許可する前に、シーン移動ボタンの処理を行う
            if (isSceneTransitionStep) {
                // シーン移動ステップ中
                if (sceneTransitionButtons.includes(name)) {
                    // ターゲットのシーン移動ボタンのみ有効化、他はブロック
                    shouldEnable = (name === targetButtonName);
                } else if (isHUD) {
                    // 他のHUDボタンは許可
                    shouldEnable = true;
                }
            } else {
                // 通常ステップはHUDボタンを全て許可
                if (isHUD) shouldEnable = true;
            }
            
            this._setInteractState(btn, shouldEnable);
            
            // 視覚的フィードバック（オプション）
            // 半透明にするなどの処理が必要ならここに追加
            // if (!shouldEnable && btn.visible) { ... }
        });
    }

    /**
     * オブジェクトとその子要素のインタラクティブ状態を設定
     */
    _setInteractState(obj, enabled) {
        if (obj.input) {
            const prevState = obj.input.enabled;
            obj.input.enabled = enabled;
            // カーソルの表示も更新（有効ならpointer、無効ならdefault）
            if (enabled) {
                obj.input.cursor = 'pointer';
            } else {
                obj.input.cursor = 'default';
            }
            // 🐛 DEBUG: 処方箋アイテムの状態変更をログ出力
            if (obj._tutorialButtonName && obj._tutorialButtonName.startsWith('prescription_item')) {
                console.log(`[TutorialManager] 🔧 ${obj._tutorialButtonName}: input.enabled ${prevState} → ${enabled}`);
            }
        } else {
            // inputがない場合はログ出力
            if (obj._tutorialButtonName && obj._tutorialButtonName.startsWith('prescription_item')) {
                console.log(`[TutorialManager] ⚠️ ${obj._tutorialButtonName}: input が null`);
            }
        }
        
        // コンテナの場合は子要素も再帰的に設定
        // 🆕 ただし、個別に登録されたボタンはスキップ（上書きを防ぐ）
        if (obj.list && obj.list.length > 0) {
            obj.list.forEach(child => {
                // 登録済みボタンは個別に管理されるためスキップ
                if (child._tutorialButtonName && this.registeredButtons.has(child._tutorialButtonName)) {
                    // 登録済みボタンは親コンテナの影響を受けない
                    return;
                }
                this._setInteractState(child, enabled);
            });
        }
    }
    
    /**
     * 🆕 間違った選択をしたときの処理
     */
    handleWrongSelection(selectedButtonName) {
        if (!this.isActive) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (!currentStep || !currentStep.targetButton) return;
        
        // 🆕 allowFreeOperationの場合はミス判定しない
        if (currentStep.allowFreeOperation) return;
        
        // 正しいボタンを選んだ場合は何もしない
        if (selectedButtonName === currentStep.targetButton) return;
        
        // 🆕 詳細デバッグログ
        const prevStep = this.currentStepIndex > 0 ? TutorialSteps[this.currentStepIndex - 1] : null;
        console.group('[TutorialManager] ❌ ミス判定');
        if (prevStep) {
            console.log('📝 直前のステップ:', {
                stepId: prevStep.id,
                message: prevStep.message,
                speaker: prevStep.speaker
            });
        }
        console.log('📍 現在のステップ:', {
            stepIndex: this.currentStepIndex,
            stepId: currentStep.id,
            phase: currentStep.phase,
            scene: currentStep.scene,
            action: currentStep.action,
            message: currentStep.message
        });
        console.log('🎯 ボタン情報:', {
            押されたボタン: selectedButtonName,
            正解ボタン: currentStep.targetButton,
            完了条件: currentStep.completeOn
        });
        console.log('📋 登録済みボタン一覧:', Array.from(this.registeredButtons.keys()));
        console.groupEnd();
        
        // エラーメッセージを表示
        const hudScene = this.game.scene.getScene('HUDScene');
        if (hudScene) {
            const errorText = hudScene.add.text(960, 400, '❌ あれれ？ もう一度やってみて！', {
                fontSize: '36px',
                color: '#FF6B6B',
                fontFamily: '"Noto Sans JP", sans-serif',
                fontStyle: 'bold',
                stroke: '#000000',
                strokeThickness: 4
            }).setOrigin(0.5).setDepth(10001);
            
            hudScene.tweens.add({
                targets: errorText,
                y: 350,
                alpha: 0,
                duration: 1500,
                ease: 'Power2',
                onComplete: () => errorText.destroy()
            });
            
            // エラーSE
            if (hudScene.sound) {
                hudScene.sound.play('se_error', { volume: 0.6 });
            }
        }
    }

    /**
     * ボタンをハイライト（グローエフェクト）
     */
    _highlightButton(name) {
        // 前のハイライトを消す
        if (this.activeHighlight && this.activeHighlight !== name) {
            this._clearHighlight(this.activeHighlight);
        }
        
        const btn = this.registeredButtons.get(name);
        if (!btn || !btn.scene) return;
        
        this.activeHighlight = name;
        
        // グローエフェクト（再帰的に子要素も考慮するか、とりあえず枠線を出す）
        // Graphicsオブジェクトをボタンのシーンに追加
        if (!btn.glowGraphics) {
            btn.glowGraphics = btn.scene.add.graphics();
            btn.glowGraphics.setDepth(9999); // 最前面
        }
        
        const g = btn.glowGraphics;
        g.clear();
        g.lineStyle(4, 0x00FF00, 1); // 緑色の発光
        
        // ボタンのサイズと位置を取得（親コンテナ考慮）
        // Note: Containerの中にある場合、WorldTransformが必要
        const matrix = btn.getWorldTransformMatrix();
        const x = matrix.tx;
        const y = matrix.ty;
        const width = btn.width * matrix.scaleX; // 単純なスケールのみ対応
        const height = btn.height * matrix.scaleY;
        const originX = btn.originX || 0.5;
        const originY = btn.originY || 0.5;
        
        // 描画（親コンテナの影響を受けないようにシーン直下に描画したいが、追従が面倒）
        // 簡易的にボタン位置に合わせて描画
        // 修正: ボタン自体にaddChildできない（Sprite/Imageの場合）ので、
        // シーンに追加したGraphicsを毎フレーム更新するか、Tweenで誤魔化す
        
        // 今回は静止ボタンが多いので、一度描画してTweenさせる
        // 原点考慮
        const drawX = x - (width * originX);
        const drawY = y - (height * originY);
        
        g.strokeRoundedRect(drawX - 5, drawY - 5, width + 10, height + 10, 12);
        g.setVisible(true);
        
        // パルスアニメーション
        if (btn.glowTween) btn.glowTween.stop();
        btn.glowTween = btn.scene.tweens.add({
            targets: g,
            alpha: { from: 1, to: 0.2 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }
    
    _clearHighlight(name) {
        const btn = this.registeredButtons.get(name);
        if (btn && btn.glowGraphics) {
            btn.glowGraphics.clear();
            btn.glowGraphics.setVisible(false);
            if (btn.glowTween) btn.glowTween.stop();
        }
    }

    /**
     * チュートリアルを一時停止（ゲームタイマーは停止しない）
     */
    pause() {
        if (!this.isActive) return;
        this.isPaused = true;
        
        if (this.overlay) {
            this.overlay.hide();
        }
    }

    /**
     * チュートリアルを再開
     */
    resume() {
        if (!this.isActive) return;
        this.isPaused = false;
        
        this._showCurrentStep();
    }

    /**
     * チュートリアルをスキップ
     */
    skip() {
        console.log('[TutorialManager] チュートリアルスキップ');
        this._finish(true);
    }

    /**
     * チュートリアルを完了（成功扱い）
     */
    complete() {
        console.log('[TutorialManager] チュートリアル強制完了');
        this._finish(false); // skipped=false で終了演出を再生
    }

    /**
     * シーン準備完了通知
     */
    notifySceneReady(sceneName) {
        if (!this.isActive || this.isPaused) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (currentStep && currentStep.scene === sceneName) {
            // 少し遅延してオーバーレイを表示（シーン描画完了を待つ）
            const scene = this.game.scene.getScene(sceneName);
            if (scene) {
                scene.time.delayedCall(300, () => {
                    this._showCurrentStep();
                    // ボタン再登録が必要かも？（シーン遷移で破壊されている場合）
                });
            }
        }
    }

    /**
     * 🆕 オーバーレイクリック時の処理（NEXT_CLICK完了）
     * TutorialOverlayから呼び出される
     */
    handleNextClick() {
        if (!this.isActive || this.isPaused) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (currentStep && currentStep.completeOn === 'NEXT_CLICK') {
            console.log('[TutorialManager] handleNextClick: NEXT_CLICK完了');
            this.completeStep('NEXT_CLICK');
        }
    }

    /**
     * ステップ完了通知
     * @param {string} eventName - イベント名
     * @param {Object} data - オプションの追加データ（ミス情報など）
     */
    completeStep(eventName, data = {}) {
        if (!this.isActive || this.isPaused) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        
        // 現在のステップの完了条件と一致するか確認
        console.log(`[TutorialManager] 🔔 completeStep呼び出し: ${eventName}, 現在ステップ: ${currentStep?.id || 'none'}, 完了条件: ${currentStep?.completeOn || 'none'}`);
        if (currentStep && currentStep.completeOn === eventName) {
            console.log(`[TutorialManager] ステップ完了: ${currentStep.id} (${eventName})`);
            
            // 🆕 ミスカウントをリセット
            this.stepMistakeCount = 0;
            
            // 🆕 waitタイムアウトをクリア（正常完了時に不要なタイムアウトが発火しないように）
            if (this.waitTimeoutId) {
                clearTimeout(this.waitTimeoutId);
                this.waitTimeoutId = null;
            }
            
            // ハイライト消去
            if (currentStep.targetButton) {
                this._clearHighlight(currentStep.targetButton);
            }
            
            this.completedSteps.add(currentStep.id);
            
            // 🆕 ミス情報の処理（タイピング完了時など）
            // dataが空またはerrorCountがない場合は0として扱う
            const errorCount = (data && typeof data.errorCount === 'number') ? data.errorCount : 0;
            const hasErrors = errorCount > 0;
            const errorFields = data?.errorFields || [];
            
            
            console.log(`[TutorialManager] 🔍 ミス情報: hasErrors=${hasErrors}, errorCount=${errorCount}, shouldShowFeedback=${this._shouldShowMistakeFeedback(currentStep.id)}`);
            
            // 🆕 エラー状態を保存（次のステップの分岐に使用）
            this.lastStepHadErrors = hasErrors;
            
            // 🆕 ミスがあった場合は分岐メッセージを表示してから次へ
            
            // 🆕 ミスがあった場合は分岐メッセージを表示してから次へ
            if (hasErrors && this._shouldShowMistakeFeedback(currentStep.id)) {
                console.log(`[TutorialManager] 🔔 ミスフィードバック表示開始: stepId=${currentStep.id}`);
                this._showMistakeFeedback(currentStep.id, data.errorCount, errorFields, () => {
                    console.log(`[TutorialManager] 🔔 ミスフィードバック完了、次のステップへ`);
                    this.currentStepIndex++;
                    this._proceedToNextStep();
                });
                return;
            }
            
            this.currentStepIndex++;
            this._proceedToNextStep();
        } else if (currentStep && currentStep.action === 'click') {
            // 🆕 clickアクション中にイベントが不一致 → 間違った選択の可能性
            // ただし、以下のイベントは間違いとして扱わない（通常のゲーム操作）
            const ignoreEvents = [
                'MEDICINE_DICTIONARY_CLOSED',
                'MEDICINE_DICTIONARY_OPENED',
                'COMBO_UPDATE',
                'QUESTIONNAIRE_COMPLETED',
                'QUESTIONNAIRE_FINISHED',  // 🆕 問診票完了イベント（バックグラウンド発火）
                'MYNUMBER_CONFIRMED',      // 🆕 マイナ認証イベント（バックグラウンド発火）
                'PATIENT_ARRIVED',
                'TIMER_UPDATE',
                'HUD_INTERACTION',
                'PRESCRIPTION_TAB_CLICKED',
                'KARTE_TAB_CLICKED',
                // 支払いシーンのタブ切り替え（ミス判定から除外）
                'PAYMENT_TAB_CLICKED_receipt',
                'PAYMENT_TAB_CLICKED_karte',
                'PAYMENT_TAB_CLICKED_prescription',
                // 保険証関連（ミス判定から除外）
                'INSURANCE_PAPER_TAB_CLICKED',
                'INSURANCE_MODAL_OPENED',
                'INSURANCE_CARD_OPENED',
                'INSURANCE_CARD_CONFIRMED',
                'INSURANCE_TYPE_SELECTED',
                // 予約関連（ミス判定から除外）
                'CALENDAR_OPENED',
                'RESERVATION_TOGGLED',
                'RESERVATION_DATE_SELECTED',
                // 支払い保険種別選択（ミス判定から除外）
                'PAYMENT_INSURANCE_SELECTED',
                // 🆕 シーン遷移イベント（ミス判定から除外）
                'CHECK_SCENE_ENTERED',
                'RECEPTION_SCENE_ENTERED',
                'SHELF_SCENE_ENTERED',
                'PAYMENT_SCENE_ENTERED',
                // 🆕 受付フォーム入力イベント（ミス判定から除外）
                'ID_ENTERED',
                'NAME_ENTERED',
                'INSURANCE_SELECTED',
                'URINE_CHECKED'
            ];
            
            if (!ignoreEvents.includes(eventName)) {
                // 🆕 allowFreeOperationの場合はリトライメッセージを出さない
                if (currentStep.allowFreeOperation) {
                    console.log(`[TutorialManager] 📝 allowFreeOperation中のためイベント不一致を無視: ${eventName}`);
                } else {
                    console.log(`[TutorialManager] ⚠️ イベント不一致: 受信=${eventName}, 必要=${currentStep.completeOn}`);
                    console.log(`[TutorialManager] 🔍 DEBUG: showing retry message`);
                    this._showRetryMessage();
                }
            } else {
                // 無視するイベントはログのみ
                console.log(`[TutorialManager] 📝 無視するイベント: ${eventName} (通常操作)`);
            }
        } else if (currentStep) {
            console.log(`[TutorialManager] ⚠️ イベント不一致: 受信=${eventName}, 必要=${currentStep.completeOn}`);
        }
    }
    
    /**
     * 🆕 次のステップへ進む（共通処理）
     */
    _proceedToNextStep() {
        console.log(`[TutorialManager] 🔄 _proceedToNextStep called, currentStepIndex=${this.currentStepIndex}, totalSteps=${TutorialSteps.length}`);
        if (this.currentStepIndex >= TutorialSteps.length) {
            console.log(`[TutorialManager] 🏁 チュートリアル終了`);
            this._finish(false);
        } else {
            const nextStep = TutorialSteps[this.currentStepIndex];
            console.log(`[TutorialManager] ➡️ 次のステップへ: ${nextStep?.id || 'END'} (シーン: ${nextStep?.scene || '-'}, action: ${nextStep?.action || '-'})`);
            this._showCurrentStep();
        }
    }
    
    /**
     * 🆕 skipIf条件を評価する
     * @param {string} condition - 条件文字列
     * @returns {boolean} - 条件が満たされている場合true
     */
    _evaluateSkipCondition(condition) {
        console.log(`[TutorialManager] 🔍 skipIf評価: ${condition}`);
        
        switch (condition) {
                
            case 'PRESCRIPTION_ERROR_ALREADY_REPORTED':
                // CheckSceneで処方箋エラーが既に報告されているかチェック
                const checkScene = this.game.scene.getScene('CheckScene');
                if (checkScene && checkScene.foundErrors && checkScene.foundErrors.length > 0) {
                    console.log(`[TutorialManager] ✅ 処方箋エラーは既に報告済み (${checkScene.foundErrors.length}件)`);
                    return true;
                }
                // または、prescriptionCheckCompletedフラグをチェック
                if (checkScene && checkScene.prescriptionCheckCompleted) {
                    console.log(`[TutorialManager] ✅ 処方箋チェックは既に完了`);
                    return true;
                }
                return false;
                
            case 'PREVIOUS_STEP_HAD_ERRORS':
                // 直前のステップでエラーがあった場合はスキップしない（＝成功メッセージをスキップするための条件）
                // つまり、エラーがあったらこのステップ（成功メッセージ）をスキップする
                if (this.lastStepHadErrors) {
                    console.log(`[TutorialManager] ✅ 直前のステップでエラーあり → 成功メッセージをスキップ`);
                    return true;
                }
                return false;

            default:
                console.warn(`[TutorialManager] ⚠️ 未知のskipIf条件: ${condition}`);
                return false;
        }
    }
    
    /**
     * 🆕 ミスフィードバックを表示すべきかチェック
     */
    _shouldShowMistakeFeedback(stepId) {
        // タイピング完了時にミスフィードバックを表示
        return stepId.includes('typing_wait') || stepId.includes('reception_complete');
    }
    /**
     * 🆕 ミスがあった場合のフィードバックメッセージを表示
     * トリアージさんのテキストログとして表示する
     */
    _showMistakeFeedback(stepId, errorCount, errorFields, onComplete) {
        const hudScene = this.game.scene.getScene('HUDScene');
        if (!hudScene) {
            onComplete();
            return;
        }
        
        // メッセージ内容を決定
        let message = '';
        
        if (stepId.includes('typing_wait')) {
            // タイピングシーンでのミス
            if (errorCount >= 3) {
                message = 'あらら…入力ミスが多いわね…\n保険証をよく見て入力してね！';
            } else if (errorCount === 2) {
                message = 'ミスが多いわね...\n確認しながら入力してね！';
            } else {
                message = 'ミスが多いわね...\n次は気をつけてね！';
            }
        } else if (stepId.includes('reception_complete')) {
            // 受付票作成でのミス
            if (errorCount >= 2) {
                message = '受付票に複数のミスがあるわ！\nもっと注意して記入してね';
            } else {
                message = '受付票にミスがあったわね\n次は確認してから完了してね！';
            }
        }
        
        if (!message) {
            console.log(`[TutorialManager] 🔍 _showMistakeFeedback: メッセージなし、スキップ`);
            onComplete();
            return;
        }
        
        console.log(`[TutorialManager] 🔍 _showMistakeFeedback: message="${message}", overlay=${!!this.overlay}`);
        
        // 🆕 フィードバック表示中フラグをセット
        this.isShowingMistakeFeedback = true;
        
        // TutorialOverlayを使用してトリアージさんのメッセージとして表示
        if (this.overlay) {
            // 一時的なステップオブジェクトを作成してオーバーレイに表示
            const feedbackStep = {
                id: 'mistake_feedback',
                action: 'info',
                message: message,
                speaker: 'トリアージさん',
                targetButton: null,
                completeOn: 'NEXT_CLICK'
            };
            
            console.log(`[TutorialManager] 🔍 overlay.show呼び出し`);
            this.overlay.show(feedbackStep, null);
            
            // SE再生
            if (hudScene.sound) {
                hudScene.sound.play('se_miss', { volume: 0.6 });
            }
            
            // クリックで次へ進むハンドラを一時的に設定
            const tempClickHandler = () => {
                console.log(`[TutorialManager] 🔍 tempClickHandler fired`);
                // 🆕 フィードバック表示中フラグをクリア
                this.isShowingMistakeFeedback = false;
                // ハンドラを元に戻す
                if (this.overlay && this.overlay.blockingZone) {
                    this.overlay.blockingZone.off('pointerdown', tempClickHandler);
                }
                onComplete();
            };
            
            // blockingZoneにクリックハンドラを追加
            if (this.overlay.blockingZone) {
                console.log(`[TutorialManager] 🔍 blockingZoneにハンドラ追加`);
                this.overlay.blockingZone.setVisible(true);
                this.overlay.blockingZone.once('pointerdown', tempClickHandler);
            } else {
                console.log(`[TutorialManager] ⚠️ blockingZoneがnull`);
            }
            
            // Enterキーでも進めるように
            const tempEnterHandler = (event) => {
                if (event.code === 'Enter') {
                    console.log(`[TutorialManager] 🔍 tempEnterHandler fired`);
                    // 🆕 フィードバック表示中フラグをクリア
                    this.isShowingMistakeFeedback = false;
                    window.removeEventListener('keydown', tempEnterHandler);
                    if (this.overlay && this.overlay.blockingZone) {
                        this.overlay.blockingZone.off('pointerdown', tempClickHandler);
                    }
                    onComplete();
                }
            };
            window.addEventListener('keydown', tempEnterHandler);
            
        } else {
            console.log(`[TutorialManager] ⚠️ overlayがnull、スキップ`);
            // 🆕 フィードバック表示中フラグをクリア
            this.isShowingMistakeFeedback = false;
            // オーバーレイがない場合はそのまま進む
            onComplete();
        }
    }
    
    /**
     * 🆕 現在のステップが指定イベントを期待しているかチェック
     * @param {string} eventName - チェックするイベント名
     * @returns {boolean} - 期待している場合true
     */
    checkStepExpects(eventName) {
        if (!this.isActive) return true; // チュートリアル非アクティブ時は常に許可
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (!currentStep) return true;
        
        return currentStep.completeOn === eventName;
    }
    
    /**
     * 🆕 デバッグ用: 次のステップに進む
     */
    goToNextStep() {
        if (!this.isActive) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (currentStep && currentStep.targetButton) {
            this._clearHighlight(currentStep.targetButton);
        }
        
        this.currentStepIndex++;
        if (this.currentStepIndex >= TutorialSteps.length) {
            this.currentStepIndex = TutorialSteps.length - 1;
        }
        
        console.log(`[TutorialManager] ▶ 次へ: ステップ ${this.currentStepIndex + 1}/${TutorialSteps.length} (${TutorialSteps[this.currentStepIndex]?.id || 'END'})`);
        this._showCurrentStep();
    }
    
    /**
     * 🆕 指定したステップIDへジャンプ（デバッグ用）
     */
    jumpToStep(stepId) {
        if (!this.isActive) return;
        
        const index = TutorialSteps.findIndex(s => s.id === stepId);
        if (index === -1) {
            console.warn(`[TutorialManager] ステップが見つかりません: ${stepId}`);
            return;
        }
        
        // 現在のハイライトをクリア
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (currentStep && currentStep.targetButton) {
            this._clearHighlight(currentStep.targetButton);
        }
        
        console.log(`[TutorialManager] ✈️ ジャンプ: ${currentStep?.id || 'start'} -> ${stepId} (Index: ${index})`);
        
        this.currentStepIndex = index;
        this._showCurrentStep();
    }

    /**
     * 🆕 デバッグ用: 前のステップに戻る
     */
    goToPreviousStep() {
        if (!this.isActive) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (currentStep && currentStep.targetButton) {
            this._clearHighlight(currentStep.targetButton);
        }
        
        this.currentStepIndex--;
        if (this.currentStepIndex < 0) {
            this.currentStepIndex = 0;
        }
        
        console.log(`[TutorialManager] ◀ 前へ: ステップ ${this.currentStepIndex} (${TutorialSteps[this.currentStepIndex]?.id || 'START'})`);
        this._showCurrentStep();
    }
    
    /**
     * 🆕 矢印位置を更新（スライドアニメーション後に呼び出す）
     */
    refreshArrowPosition() {
        if (!this.isActive) return;
        
        const step = TutorialSteps[this.currentStepIndex];
        if (!step || !step.targetButton) return;
        
        console.log(`[TutorialManager] 🔄 矢印位置更新: ${step.id}`);
        
        // オーバーレイに新しい座標を渡す
        const targetRect = this._getButtonRect(step.targetButton);
        if (targetRect && this.overlay) {
            const arrowConfig = step.arrow || { direction: 'down', offset: { x: 0, y: 0 } };
            this.overlay._showArrow(targetRect, arrowConfig);
        }
    }
    
    /**
     * 🆕 リトライメッセージを表示（段階的ペナルティ付き）
     */
    _showRetryMessage() {
        const hudScene = this.game.scene.getScene('HUDScene');
        if (!hudScene) return;
        
        // 既にメッセージ表示中なら何もしない
        if (this._retryMessageActive) return;
        this._retryMessageActive = true;
        
        // 🆕 ミスカウントを増やす
        this.stepMistakeCount++;
        console.log(`[TutorialManager] ミスカウント: ${this.stepMistakeCount}`);
        
        // 🆕 6回以上は強制終了
        if (this.stepMistakeCount >= 6) {
            this._retryMessageActive = false;
            this._showForcedTermination();
            return;
        }
        
        // 🆕 カスタムヒントがあればそれを使用
        const currentStep = TutorialSteps[this.currentStepIndex];
        let message = '❌ あれれ？ もう一度やってみて！';
        let color = '#FF6B6B';
        
        if (currentStep && currentStep.wrongAnswerHint && this.stepMistakeCount === 1) {
            // 最初のミスではカスタムヒントを表示
            message = currentStep.wrongAnswerHint;
            color = '#FFD700'; // ヒントは黄色
        } else if (this.stepMistakeCount >= 5) {
            message = '😐 本当に何がしたいの？';
            color = '#8B0000';
        } else if (this.stepMistakeCount >= 3) {
            message = '😤 話聞いてる？\n真面目にやってくれない？';
            color = '#FF4500';
        }
        
        const errorText = hudScene.add.text(960, 400, message, {
            fontSize: this.stepMistakeCount >= 3 ? '42px' : '36px',
            color: color,
            fontFamily: '"Noto Sans JP", sans-serif',
            fontStyle: 'bold',
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(10001);
        
        hudScene.tweens.add({
            targets: errorText,
            y: 350,
            alpha: 0,
            duration: this.stepMistakeCount >= 3 ? 2500 : 1500,
            ease: 'Power2',
            onComplete: () => {
                errorText.destroy();
                this._retryMessageActive = false;
            }
        });
        
        // エラーSE
        if (hudScene.sound) {
            hudScene.sound.play('se_miss', { volume: 0.6 + (this.stepMistakeCount * 0.1) });
        }
    }
    
    /**
     * 🆕 強制終了 → Fランクリザルト画面へ遷移
     */
    _showForcedTermination() {
        console.log('[TutorialManager] 🚨 強制終了発動 → Fランク画面へ');
        
        const hudScene = this.game.scene.getScene('HUDScene');
        if (!hudScene) return;
        
        // オーバーレイを非表示
        if (this.overlay) {
            this.overlay.hide();
        }
        
        // チュートリアルを終了
        this._finish(true);
        
        // 全画面暗転
        const overlay = hudScene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0)
            .setDepth(10000);
        
        hudScene.tweens.add({
            targets: overlay,
            fillAlpha: 1,
            duration: 800,
            ease: 'Power2',
            onComplete: () => {
                // 他のシーンを停止
                const scenesToStop = ['ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene'];
                scenesToStop.forEach(name => {
                    const s = hudScene.scene.get(name);
                    if (s && s.scene.isActive()) {
                        hudScene.scene.stop(name);
                    }
                });
                
                // Fランク画面（ResultScene）へ遷移
                hudScene.scene.start('ResultScene', {
                    score: 0,
                    tutorialMode: true,
                    tutorialResult: 'fail'
                });
                
                overlay.destroy();
            }
        });
        
        // SE再生
        if (hudScene.sound) {
            try {
                hudScene.sound.play('se_miss', { volume: 0.8 });
            } catch (e) {
                // ignore
            }
        }
    }

    /**
     * 「次へ」クリック処理（infoタイプ用）
     */
    handleNextClick() {
        if (!this.isActive || this.isPaused) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        
        if (currentStep && currentStep.completeOn === 'NEXT_CLICK') {
            this.completeStep('NEXT_CLICK');
        }
    }

    /**
     * ボタンの矩形領域を取得（ワールド座標）
     */
    _getButtonRect(name) {
        const btn = this.registeredButtons.get(name);
        if (!btn || !btn.scene) return null;
        
        // Note: Containerの中にある場合、WorldTransformが必要
        const matrix = btn.getWorldTransformMatrix();
        const x = matrix.tx;
        const y = matrix.ty;
        const width = btn.width * matrix.scaleX; // 単純なスケールのみ対応
        const height = btn.height * matrix.scaleY;
        const originX = btn.originX || 0.5;
        const originY = btn.originY || 0.5;
        
        return {
            x: x - (width * originX),
            y: y - (height * originY),
            width: width,
            height: height
        };
    }

    /**
     * 🆕 ボタンが見つからない場合のフォールバック処理
     * 患者ボタン(patient_0, patient_1等)や処方箋エラーボタンが見つからない場合に
     * 代替ボタンを探して返す
     */
    _findFallbackButton(originalName) {
        // 元のボタンが見つかればそれを返す
        if (this.registeredButtons.has(originalName)) {
            return originalName;
        }
        
        console.log(`[TutorialManager] ⚠️ ボタンが見つかりません: ${originalName} - フォールバック検索中...`);
        
        // 患者ボタン (patient_0, patient_1, patient_2) のフォールバック
        if (originalName.startsWith('patient_')) {
            // patient_0 → patient_1 → patient_2 の順で探す
            for (let i = 0; i <= 5; i++) {
                const fallbackName = `patient_${i}`;
                if (this.registeredButtons.has(fallbackName)) {
                    console.log(`[TutorialManager] ✅ フォールバック発見: ${fallbackName}`);
                    return fallbackName;
                }
            }
        }
        
        // チェックシーンの患者アイテム (patient_item_0, patient_item_1) のフォールバック
        if (originalName.startsWith('patient_item_')) {
            for (let i = 0; i <= 5; i++) {
                const fallbackName = `patient_item_${i}`;
                if (this.registeredButtons.has(fallbackName)) {
                    console.log(`[TutorialManager] ✅ フォールバック発見: ${fallbackName}`);
                    return fallbackName;
                }
            }
        }
        
        // 処方箋エラーボタンのフォールバック
        if (originalName === 'prescription_item_error') {
            // エラーボタンが見つからない場合、最初の処方箋アイテムを探す
            for (let i = 0; i <= 5; i++) {
                const fallbackName = `prescription_item_${i}`;
                if (this.registeredButtons.has(fallbackName)) {
                    console.log(`[TutorialManager] ⚠️ 処方箋エラーボタンが見つからず、代替使用: ${fallbackName}`);
                    return fallbackName;
                }
            }
            // それでも見つからない場合はnullを返す（ステップをスキップする判断に使う）
            console.log(`[TutorialManager] ❌ 処方箋アイテムが全く見つかりません`);
            return null;
        }
        
        // 予約日ボタンのフォールバック
        if (originalName === 'reservation_correct_date') {
            // カレンダーの日付ボタンを探す
            const calendarButtons = Array.from(this.registeredButtons.keys())
                .filter(name => name.startsWith('reservation_date_') || name.startsWith('calendar_day_'));
            if (calendarButtons.length > 0) {
                console.log(`[TutorialManager] ✅ カレンダー日付ボタン発見: ${calendarButtons[0]}`);
                return calendarButtons[0];
            }
        }
        
        // フォールバックが見つからない
        console.log(`[TutorialManager] ❌ フォールバックなし: ${originalName}`);
        return null;
    }

    /**
     * ボタンをハイライト（グローエフェクト）
     */
    _highlightButton(name) {
        // 前のハイライトを消す
        if (this.activeHighlight && this.activeHighlight !== name) {
            this._clearHighlight(this.activeHighlight);
        }
        
        const btn = this.registeredButtons.get(name);
        if (!btn || !btn.scene) return;
        
        this.activeHighlight = name;
        
        // グラフィック準備
        if (!btn.glowGraphics) {
            btn.glowGraphics = btn.scene.add.graphics();
            btn.glowGraphics.setDepth(9999);
        }
        
        const g = btn.glowGraphics;
        g.clear();
        g.lineStyle(4, 0x00FF00, 1);
        
        const rect = this._getButtonRect(name);
        if (!rect) return;
        
        g.strokeRoundedRect(rect.x - 5, rect.y - 5, rect.width + 10, rect.height + 10, 12);
        g.setVisible(true);
        
        // パルスアニメーション
        if (btn.glowTween) btn.glowTween.stop();
        btn.glowTween = btn.scene.tweens.add({
            targets: g,
            alpha: { from: 1, to: 0.2 },
            duration: 600,
            yoyo: true,
            repeat: -1
        });
    }

    /**
     * 現在のステップを表示
     */
    _showCurrentStep() {
        // ミスフィードバック表示中は処理をスキップ
        if (this.isShowingMistakeFeedback) {
            console.log('[TutorialManager] ⏸️ _showCurrentStep: ミスフィードバック表示中のためスキップ');
            return;
        }
        
        if (!this.isActive || this.isPaused) return;
        
        const step = TutorialSteps[this.currentStepIndex];
        if (!step) return;
        
        console.log(`[TutorialManager] ステップ表示: ${this.currentStepIndex + 1}/${TutorialSteps.length} - ${step.id} (Phase ${step.phase})`);
        
        // 🆕 skipIf条件をチェック
        // ステップ定義に skipIf が指定されていて、その条件が満たされている場合はスキップ
        if (step.skipIf) {
            const shouldSkip = this._evaluateSkipCondition(step.skipIf);
            if (shouldSkip) {
                console.log(`[TutorialManager] ⏭️ skipIf条件が満たされたためスキップ: ${step.id}`);
                this.currentStepIndex++;
                this._proceedToNextStep();
                return;
            }
        }
        
        // ロック状態更新
        this._updateButtonLockState();
        
        // ハイライト適用 & ターゲット領域取得
        let targetRect = null;
        let effectiveTargetButton = step.targetButton;
        
        if (step.targetButton) {
            // 🆕 フォールバック処理: ボタンが見つからない場合は代替を探す
            effectiveTargetButton = this._findFallbackButton(step.targetButton);
            
                // 🆕 フォールバックでも見つからない場合
                if (!effectiveTargetButton) {
                    /* 既存のスキップロジックを削除してリトライさせる
                    // 処方箋エラーステップの場合はスキップ
                    if (step.id === 'check_click_error_drug') {
                        console.log(`[TutorialManager] ⏭️ 処方箋エラーボタンが見つからないためスキップ: ${step.id}`);
                        this.buttonRetryCount = 0;  // リセット
                        this.currentStepIndex++;
                        this._proceedToNextStep();
                        return;
                    }
                    */
                
                // 🆕 リトライ上限チェック
                this.buttonRetryCount++;
                if (this.buttonRetryCount >= this.MAX_BUTTON_RETRIES) {
                    console.log(`[TutorialManager] ⚠️ ボタン待機上限到達 (${this.MAX_BUTTON_RETRIES}回): ${step.targetButton}`);
                    console.log(`[TutorialManager] 📋 オーバーレイを非表示にして手動操作を許可します`);
                    
                    // オーバーレイを非表示にしてプレイヤーが操作できるようにする
                    if (this.overlay) {
                        this.overlay.hide();
                    }
                    
                    // リトライカウントをリセット（次のステップ用）
                    this.buttonRetryCount = 0;
                    
                    // completeOn条件が満たされるのを待つ（ステップは進めない）
                    return;
                }
                
                // それ以外は再試行（500ms後）
                const overlayScene = this.game.scene.getScene('HUDScene');
                if (overlayScene) {
                    console.log(`[TutorialManager] 🔄 ボタン待機中... ${this.buttonRetryCount}/${this.MAX_BUTTON_RETRIES} - 500ms後に再試行: ${step.targetButton}`);
                    overlayScene.time.delayedCall(500, () => this._showCurrentStep());
                }
                return;
            }
            
            // ボタンが見つかったらリトライカウントをリセット
            this.buttonRetryCount = 0;
            
            // HUDシーンのタイムイベントを使用
            const overlayScene = this.game.scene.getScene('HUDScene');
            if (overlayScene) {
                overlayScene.time.delayedCall(100, () => {
                    // 🆕 ユーザー要望により緑色のハイライトは廃止し、矢印のみにする
                    // this._highlightButton(effectiveTargetButton);
                });
            }
            // 矢印用座標（遅延なしで取れると仮定、遅延必要ならOverlayも遅延させるべき）
            targetRect = this._getButtonRect(effectiveTargetButton);
        }
        
        // 対象シーン確認
        let targetScene = null;
        if (step.scene) {
            targetScene = this.game.scene.getScene(step.scene);
            // 'wait'アクションの場合はシーンチェックをスキップ（オーバーレイ非表示で待機）
            if (step.action === 'wait') {
                if (this.overlay) {
                    this.overlay.hide();
                }
                console.log(`[TutorialManager] waitステップ: ${step.id} - オーバーレイ非表示で待機`);
                
                // 🆕 タイムアウト処理: 一定時間経過したら自動的に次へ進む
                // 問診票完了待ちなどで永遠に待機しないようにする
                if (this.waitTimeoutId) {
                    clearTimeout(this.waitTimeoutId);
                }
                this.waitTimeoutId = setTimeout(() => {
                    console.log(`[TutorialManager] ⏱️ waitステップタイムアウト: ${step.id} - 自動進行`);
                    // 現在のステップがまだ同じwaitステップなら強制進行
                    const currentStep = TutorialSteps[this.currentStepIndex];
                    if (currentStep && currentStep.id === step.id && currentStep.action === 'wait') {
                        this.completeStep(step.completeOn);
                    }
                }, this.WAIT_TIMEOUT_MS);
                
                return;
            }
            if (!targetScene || !targetScene.scene.isActive()) {
                console.log(`[TutorialManager] シーン待機: ${step.scene}`);
                return;
            }
        }
        
        // HUDシーン取得
        const overlayScene = this.game.scene.getScene('HUDScene');
        if (!overlayScene) return;
        
        // 🆕 HUDシーンのカメラ準備チェック（起動直後はnullの場合がある）
        if (!overlayScene.cameras || !overlayScene.cameras.main) {
            console.warn('[TutorialManager] HUDシーンのカメラが未準備のため待機');
            overlayScene.time.delayedCall(200, () => this._showCurrentStep());
            return;
        }
        
        // Overlay作成
        if (!this.overlay) {
            this.overlay = new TutorialOverlay(overlayScene);
            const result = this.overlay.create();
            // 作成失敗の場合は遅延再試行
            if (result === null) {
                this.overlay = null;
                overlayScene.time.delayedCall(200, () => this._showCurrentStep());
                return;
            }
            // Note: クリックハンドラはTutorialOverlay内で処理するため、ここでは設定しない
        }
        
        // ステップ表示（遅延が必要な場合を考慮して少し待つ？）
        // ボタン座標が未定義（シーン作成直後）の場合もあるので、少し遅らせるのが無難
        // ステップ表示（遅延が必要な場合を考慮して少し待つ？）
        if (overlayScene && this.overlay) {
            // 🆕 フォールバック後のボタン名を使用して座標を取得
            const targetButtonName = effectiveTargetButton || step.targetButton;
            overlayScene.time.delayedCall(150, () => {
                // 再取得 - フォールバック後のボタン名を使用
                if (targetButtonName) targetRect = this._getButtonRect(targetButtonName);
                if (this.overlay) {
                    this.overlay.show(step, targetRect);
                }
            });
        }
    }

    /**
     * チュートリアル終了
     */
    _finish(skipped) {
        console.log(`[TutorialManager] チュートリアル終了 (スキップ: ${skipped})`);
        
        this.isActive = false;
        
        // ロック解除（全ボタン有効化）
        this.registeredButtons.forEach(btn => {
            if(btn.input) btn.input.enabled = true;
            if(btn.glowGraphics) btn.glowGraphics.destroy();
        });
        this.registeredButtons.clear();
        
        // オーバーレイを非表示
        if (this.overlay) {
            this.overlay.hide();
        }
        
        // 完了フラグを保存
        try {
            localStorage.setItem(this.storageKey, 'true');
        } catch (e) {
            console.warn('[TutorialManager] localStorage保存失敗');
        }
        
        // 完了イベントを発火
        const hudScene = this.game.scene.getScene('HUDScene');
        if (hudScene) {
            hudScene.events.emit('tutorialComplete', { skipped });
        }

        // 🆕 リザルトシーンへ遷移（スキップ以外で完了した場合）
        // HUDScene以外のアクティブなシーンを探して遷移を実行
        if (!skipped) {
            const scenes = this.game.scene.getScenes(true);
            const activeScene = scenes.find(s => s.scene.key !== 'HUDScene' && s.scene.key !== 'TutorialOverlay');
            
            if (activeScene && hudScene) {
                // ========================================
                // 🎉 TUTORIAL CLEAR 演出
                // ========================================
                console.log('[TutorialManager] TUTORIAL CLEAR 演出開始');
                
                // 全てのBGMを停止
                hudScene.sound.stopAll();
                
                // 他のシーンを一時停止
                const scenesToPause = ['ReceptionScene', 'CheckScene', 'PaymentScene', 'ShelfScene', 'TypingScene'];
                scenesToPause.forEach(name => {
                    const s = hudScene.scene.get(name);
                    if (s && s.scene.isActive()) {
                        hudScene.scene.pause(name);
                    }
                });
                
                // 暗転オーバーレイ
                const overlay = hudScene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0)
                    .setDepth(9000).setScrollFactor(0);
                
                hudScene.tweens.add({
                    targets: overlay,
                    alpha: 0.7,
                    duration: 500
                });
                
                // TUTORIAL CLEAR 文字
                const clearText = hudScene.add.text(960, 540, 'TUTORIAL\nCLEAR!', {
                    fontSize: '120px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#E91E63',
                    stroke: '#FFFFFF',
                    strokeThickness: 8,
                    align: 'center',
                    lineSpacing: 20
                }).setOrigin(0.5).setDepth(9001).setScrollFactor(0).setScale(0);
                
                // 登場アニメーション
                hudScene.tweens.add({
                    targets: clearText,
                    scale: { from: 0, to: 1.2 },
                    duration: 500,
                    ease: 'Back.Out',
                    onComplete: () => {
                        // 少し縮んで安定
                        hudScene.tweens.add({
                            targets: clearText,
                            scale: 1,
                            duration: 200
                        });
                    }
                });
                
                // キラキラエフェクト
                for (let i = 0; i < 15; i++) {
                    hudScene.time.delayedCall(i * 100, () => {
                        const x = Phaser.Math.Between(400, 1520);
                        const y = Phaser.Math.Between(300, 780);
                        const star = hudScene.add.text(x, y, '✨', {
                            fontSize: `${Phaser.Math.Between(24, 48)}px`
                        }).setDepth(9002).setScrollFactor(0);
                        
                        hudScene.tweens.add({
                            targets: star,
                            scale: { from: 0, to: 1.5 },
                            alpha: { from: 1, to: 0 },
                            y: y - 50,
                            duration: 800,
                            ease: 'Power2',
                            onComplete: () => star.destroy()
                        });
                    });
                }
                
                // SE再生
                try {
                    hudScene.sound.play('se_finish', { volume: 1.0 });
                } catch (e) {
                    try {
                        hudScene.sound.play('se_reception_completed', { volume: 1.0 });
                    } catch (e2) {
                        console.warn('[TutorialManager] SE再生失敗');
                    }
                }
                
                // 3秒後にResultSceneへ遷移
                // 3秒後にResultSceneへ遷移
                hudScene.time.delayedCall(3000, () => {
                    // 演出要素を破棄
                    if (overlay) overlay.destroy();
                    if (clearText) clearText.destroy();
                    
                    activeScene.scene.start('ResultScene', { 
                        score: 0,
                        tutorialMode: true, 
                        tutorialResult: 'success'
                    });
                });
            }
        }
    }

    /**
     * チュートリアルが完了済みかチェック
     */
    isCompleted() {
        try {
            return localStorage.getItem(this.storageKey) === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * 完了フラグをリセット（再プレイ用）
     */
    resetCompletion() {
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) {
            console.warn('[TutorialManager] localStorage削除失敗');
        }
    }

    /**
     * 現在のフェーズ情報を取得
     */
    getCurrentPhase() {
        const step = TutorialSteps[this.currentStepIndex];
        if (!step) return null;
        return TutorialPhases[step.phase] || null;
    }

    /**
     * 進捗率を取得（0-100）
     */
    getProgress() {
        if (TutorialSteps.length === 0) return 100;
        return Math.floor((this.currentStepIndex / TutorialSteps.length) * 100);
    }

    /**
     * 🔧 デバッグ: チュートリアルを強制的に次のステップへ進める
     */
    _forceAdvanceStep() {
        if (!this.isActive) return;
        
        const currentStep = TutorialSteps[this.currentStepIndex];
        if (!currentStep) {
            console.log('[TutorialManager] 🔧 最終ステップに到達');
            this._finish(false);
            return;
        }
        
        console.log(`[TutorialManager] 🔧 強制進行: ${currentStep.id} → 次へ`);
        
        // ハイライト消去
        if (currentStep.targetButton) {
            this._clearHighlight(currentStep.targetButton);
        }
        
        // ステップを完了扱いにして進める
        this.completedSteps.add(currentStep.id);
        this.currentStepIndex++;
        this.stepMistakeCount = 0;
        
        // 次のステップへ
        if (this.currentStepIndex >= TutorialSteps.length) {
            this._finish(false);
        } else {
            this._showCurrentStep();
        }
    }
}
