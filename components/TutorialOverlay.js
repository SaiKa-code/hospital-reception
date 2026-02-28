/**
 * TutorialOverlay.js - チュートリアルオーバーレイUI
 * 
 * 画面上にハイライト・指示テキスト・矢印を表示するコンポーネント
 */



export class TutorialOverlay {
    constructor(scene) {
        this.scene = scene;
        this.container = null;
        this.isVisible = false;
        this.currentStep = null;
        this.blockingRects = [];
        this.borderGraphics = null;
        this.pulseGraphics = null;
    }

    /**
     * オーバーレイを作成
     */
    create() {
        // シーンの準備チェック（カメラやシステムが未初期化の場合のエラー回避）
        if (!this.scene || !this.scene.add || !this.scene.cameras || !this.scene.cameras.main) {
            console.warn('[TutorialOverlay] シーンが未準備のため作成をスキップ');
            return null;
        }
        
        // 最前面に表示するコンテナ
        this.container = this.scene.add.container(0, 0).setDepth(30000);
        this.container.setVisible(false);
        
        // 🆕 背後のクリックをブロックする全画面ゾーン
        this.blockingZone = this.scene.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.3)
            .setInteractive()
            .setDepth(29999);
        this.blockingZone.setVisible(false);
        
        // ブロッキングゾーンをクリックしても進行（info時のみ）
        this.blockingZone.on('pointerdown', () => {
            this._handleOverlayClick();
        });
        
        // メッセージボックス
        this._createMessageBox();
        
        // 矢印
        this._createArrow();
        
        return this;
    }

    _createMessageBox() {
        this.messageContainer = this.scene.add.container(960, 950);
        
        // 背景
        const bg = this.scene.add.rectangle(0, 0, 1200, 200, 0x000033, 0.9)
            .setStrokeStyle(4, 0x0088FF);
        
        // スピーカー枠
        const speakerBg = this.scene.add.rectangle(-450, -100, 260, 50, 0x0088FF)
            .setStrokeStyle(2, 0xFFFFFF);
        
        this.speakerText = this.scene.add.text(-450, -100, '', {
            fontSize: '24px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // メッセージテキスト
        this.messageText = this.scene.add.text(0, -10, '', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            align: 'center',
            lineSpacing: 10,
            wordWrap: { width: 1100 }
        }).setOrigin(0.5);
        
        // クリックで次へアイコン（点滅）
        this.nextIcon = this.scene.add.text(550, 60, '▼', {
            fontSize: '24px', color: '#0088FF'
        }).setOrigin(0.5);
        
        this.scene.tweens.add({
            targets: this.nextIcon,
            y: 70,
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        this.messageContainer.add([bg, speakerBg, this.speakerText, this.messageText, this.nextIcon]);
        this.container.add(this.messageContainer);
        
        // 🆕 メッセージボックス全体をクリック可能に
        bg.setInteractive({ useHandCursor: true });
        bg.on('pointerdown', () => {
            this._handleOverlayClick();
        });
    }
    
    /**
     * オーバーレイクリック時の処理
     */
    _handleOverlayClick() {
        // infoタイプのステップならクリックで進行
        if (this.currentStep && this.currentStep.action === 'info') {
            // TutorialManagerのhandleNextClickを呼ぶ
            import('./TutorialManager.js').then(module => {
                module.TutorialManager.getInstance(this.scene.game).handleNextClick();
            });
        }
    }

    _createArrow() {
        this.arrowContainer = this.scene.add.container(0, 0);
        this.arrowContainer.setVisible(false);
        
        // 三角形を描画 (🆕 2倍拡大: 20→40, 40→80)
        const arrow = this.scene.add.graphics();
        arrow.fillStyle(0xFFD700, 1); // Gold
        arrow.lineStyle(4, 0xFFFFFF, 1); // 枠線も太く
        
        // 下向き三角形 (基準点0,0から下へ) - 2倍サイズ
        arrow.beginPath();
        arrow.moveTo(-40, -80);
        arrow.lineTo(40, -80);
        arrow.lineTo(0, 0);
        arrow.closePath();
        arrow.fillPath();
        arrow.strokePath();
        
        this.arrowContainer.add(arrow);
        this.container.add(this.arrowContainer);
    }
    
    /**
     * ステップを表示
     */
    show(step, targetRect = null) {
        this.currentStep = step;
        this.isVisible = true;
        this.container.setVisible(true);
        
        // 🆕 hideDialogOnClick 状態をリセット
        this.dialogHidden = false;
        
        // 🆕 ブロッキングゾーンはinfoステップ時のみ表示
        // clickステップ時はターゲットボタンをクリックできるよう非表示
        const isClickStep = step.action === 'click';
        if (this.blockingZone) {
            // hideDialogOnClick が true の場合もブロッキングゾーンを表示（クリック検知用）
            const showBlocking = !isClickStep || step.hideDialogOnClick;
            this.blockingZone.setVisible(showBlocking);
            
            // 🆕 hideDialogOnClick の場合、クリックでダイアログのみ閉じる
            if (step.hideDialogOnClick && !this.dialogHidden) {
                this.blockingZone.once('pointerdown', () => {
                    this.dialogHidden = true;
                    // メッセージボックスをフェードアウト
                    this.scene.tweens.add({
                        targets: this.messageContainer,
                        alpha: 0,
                        duration: 200,
                        ease: 'Power2',
                        onComplete: () => {
                            this.messageContainer.setVisible(false);
                            // ブロッキングゾーンも非表示にしてボタンをクリック可能に
                            this.blockingZone.setVisible(false);
                        }
                    });
                });
            }
        }
        
        // 🆕 clickステップ時はメッセージボックス背景のインタラクティブを無効化
        // これによりHUDのボタンをクリックできるようになる
        const msgBg = this.messageContainer?.list?.[0];
        if (msgBg && msgBg.setInteractive) {
            if (isClickStep) {
                msgBg.disableInteractive();
            } else {
                msgBg.setInteractive({ useHandCursor: true });
            }
        }
        
        // 矢印表示
        if (targetRect) {
            // 🆕 ユーザー要望: 緑ハイライトの代わりに必ず矢印を表示
            // 設定がなければデフォルトで下向き（ボタンの上から下を指す）
            const arrowConfig = step.arrow || { direction: 'down', offset: { x: 0, y: 0 } };
            this._showArrow(targetRect, arrowConfig);
        } else {
            this.arrowContainer.setVisible(false);
        }
        
        // メッセージ更新
        this.speakerText.setText(step.speaker || '');
        this.messageText.setText(step.message || '');
        
        // 🆕 メッセージボックスの位置（デフォルトは画面上部）
        // ステップにmessagePositionプロパティがあればその位置を使用
        let targetX = 960; // 中央
        let targetY = 150; // デフォルト: 画面上部
        
        if (step.messagePosition) {
            if (step.messagePosition === 'bottom') {
                targetY = 950; // 画面下部
            } else if (step.messagePosition === 'center') {
                targetY = 540; // 画面中央
            } else if (typeof step.messagePosition.y === 'number') {
                targetY = step.messagePosition.y;
            }
            if (step.messagePosition.x !== undefined) {
                targetX = step.messagePosition.x;
            }
        }
        
        const startY = targetY < 540 ? 50 : 1050; // 上から来るか下から来るか
        
        // 🆕 hideMessage が true の場合はメッセージボックスを非表示
        if (step.hideMessage) {
            this.messageContainer.setVisible(false);
        } else {
            this.messageContainer.setVisible(true);
            this.messageContainer.setAlpha(0);
            this.messageContainer.setPosition(targetX, startY);
            
            // 前のアニメーションをキャンセル
            this.scene.tweens.killTweensOf(this.messageContainer);
            
            // 🆕 infoステップでテキストが表示される時にSEを再生
            if (step.action === 'info' && this.scene.sound) {
                try {
                    this.scene.sound.play('se_scroll', { volume: 0.4 });
                } catch (e) {
                    // SE再生失敗は無視
                }
            }
            
            this.scene.tweens.add({
                targets: this.messageContainer,
                alpha: 1,
                y: targetY,
                duration: 300,
                ease: 'Power2'
            });
        }
    }

    /**
     * 矢印を表示
     */
    _showArrow(area, arrowConfig) {
        const { direction, offset } = arrowConfig;
        let x, y, rotation;
        
        // area = {x, y, width, height}
        // 🆕 矢印サイズ2倍に合わせてボタンの外側に表示（矢印の高さ80px考慮）
        const buttonOffset = 50;
        
        switch (direction) {
            case 'down':
                // 矢印は上から下を指す → 先端がボタン上端の外側に
                x = area.x + area.width / 2 + (offset?.x || 0);
                y = area.y - 10 + (offset?.y || 0);  // 先端がボタン上端の10px上
                rotation = 0;
                break;
            case 'up':
                // 矢印は下から上を指す → 先端がボタン下端の外側に
                x = area.x + area.width / 2 + (offset?.x || 0);
                y = area.y + area.height + 10 + (offset?.y || 0);  // 先端がボタン下端の10px下
                rotation = Math.PI;
                break;
            case 'left':
                // 矢印は右から左を指す → 先端がボタン右端の外側に
                x = area.x + area.width + 10 + (offset?.x || 0);  // 先端がボタン右端の10px右
                y = area.y + area.height / 2 + (offset?.y || 0);
                rotation = Math.PI / 2;
                break;
            case 'right':
                // 矢印は左から右を指す → 先端がボタン左端の外側に
                // 🆕 矢印本体(80px)が左に伸びるので、先端をボタン左端から10px離す
                x = area.x - 10 + (offset?.x || 0);  // 先端がボタン左端の10px左
                y = area.y + area.height / 2 + (offset?.y || 0);
                rotation = -Math.PI / 2;
                break;
            default:
                x = area.x + area.width / 2;
                y = area.y - 10;
                rotation = 0;
        }
        
        this.arrowContainer.setPosition(x, y);
        this.arrowContainer.setRotation(rotation);
        this.arrowContainer.setVisible(true);
        
        // 🆕 バウンスアニメーション - 常に動くように確実に設定
        this.scene.tweens.killTweensOf(this.arrowContainer); // 前のアニメーションを停止
        
        // 🆕 バウンス幅を大きく (15→25) して全方向で確実に動くように
        const bounceAmount = 25;
        let tweenConfig = {
            targets: this.arrowContainer,
            duration: 500,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        };
        
        // 方向に応じたアニメーション
        if (direction === 'down') {
            tweenConfig.y = y - bounceAmount;
        } else if (direction === 'up') {
            tweenConfig.y = y + bounceAmount;
        } else if (direction === 'left') {
            tweenConfig.x = x + bounceAmount;
        } else if (direction === 'right') {
            tweenConfig.x = x - bounceAmount;
        } else {
            // デフォルトは下向き
            tweenConfig.y = y - bounceAmount;
        }
        
        this.scene.tweens.add(tweenConfig);
    }

    /**
     * オーバーレイを非表示
     */
    hide() {
        this.isVisible = false;
        
        // 🆕 ブロッキングゾーンを非表示
        if (this.blockingZone) {
            this.blockingZone.setVisible(false);
        }
        
        this.scene.tweens.add({
            targets: this.messageContainer,
            alpha: 0,
            y: 950,
            duration: 200,
            ease: 'Power2',
            onComplete: () => {
                this.container.setVisible(false);
            }
        });
    }

    /**
     * オーバーレイを破棄
     */
    destroy() {
        if (this.container) {
            this.container.destroy(true);
            this.container = null;
        }
    }
}
