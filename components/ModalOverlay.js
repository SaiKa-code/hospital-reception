// components/ModalOverlay.js
// モーダル/オーバーレイの共通コンポーネント

/**
 * ModalOverlay - モーダルオーバーレイを作成
 * 
 * 使用例:
 *   import { ModalOverlay } from './components/ModalOverlay.js';
 *   
 *   const overlay = ModalOverlay.create(scene, {
 *       onClose: () => console.log('closed'),
 *       alpha: 0.7
 *   });
 */

export class ModalOverlay {
    /**
     * フルスクリーンオーバーレイを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} options - オプション
     * @returns {Phaser.GameObjects.Rectangle}
     */
    static create(scene, options = {}) {
        const {
            width = 1920,
            height = 1080,
            color = 0x000000,
            alpha = 0.7,
            depth = 500,
            interactive = true,
            onClose = null
        } = options;

        const overlay = scene.add.rectangle(width/2, height/2, width, height, color, alpha)
            .setDepth(depth);
        
        if (interactive) {
            overlay.setInteractive({ useHandCursor: false });
            
            if (onClose) {
                overlay.on('pointerdown', () => {
                    onClose();
                });
            }
        }
        
        return overlay;
    }

    /**
     * モーダルダイアログコンテナを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} options - オプション
     * @returns {Object} { overlay, container, close }
     */
    static createModal(scene, options = {}) {
        const {
            width = 600,
            height = 400,
            x = 960,
            y = 540,
            bgColor = 0xFFFFFF,
            borderColor = 0x333333,
            borderWidth = 4,
            cornerRadius = 16,
            depth = 510,
            title = '',
            showCloseButton = true,
            onClose = null
        } = options;

        // オーバーレイ
        const overlay = this.create(scene, {
            depth: depth - 10,
            onClose: showCloseButton ? null : onClose
        });

        // モーダルコンテナ
        const container = scene.add.container(x, y).setDepth(depth);

        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(bgColor, 1);
        bg.lineStyle(borderWidth, borderColor, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, cornerRadius);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, cornerRadius);
        
        // 背景をインタラクティブに（クリック貫通防止）
        const bgHitArea = scene.add.rectangle(0, 0, width, height, 0x000000, 0)
            .setInteractive();
        
        container.add([bg, bgHitArea]);

        // タイトル
        if (title) {
            const titleText = scene.add.text(0, -height/2 + 40, title, {
                fontSize: '28px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#333333'
            }).setOrigin(0.5);
            container.add(titleText);
        }

        // クローズボタン
        let closeBtn = null;
        if (showCloseButton) {
            const closeBtnBg = scene.add.circle(width/2 - 30, -height/2 + 30, 20, 0xFF5555)
                .setInteractive({ useHandCursor: true });
            const closeBtnX = scene.add.text(width/2 - 30, -height/2 + 30, '✕', {
                fontSize: '20px', color: '#FFFFFF'
            }).setOrigin(0.5);

            closeBtnBg.on('pointerover', () => closeBtnBg.setFillStyle(0xFF7777));
            closeBtnBg.on('pointerout', () => closeBtnBg.setFillStyle(0xFF5555));
            closeBtnBg.on('pointerdown', () => {
                if (onClose) onClose();
                overlay.destroy();
                container.destroy();
            });

            container.add([closeBtnBg, closeBtnX]);
            closeBtn = closeBtnBg;
        }

        // クローズ関数
        const close = () => {
            overlay.destroy();
            container.destroy();
        };

        return { overlay, container, close, closeBtn };
    }
}
