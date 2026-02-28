// components/UIUtils.js
// UI共通ユーティリティ

/**
 * UIUtils - UIインタラクション用の共通ユーティリティ
 * 
 * 使用例:
 *   import { UIUtils } from './components/UIUtils.js';
 *   
 *   UIUtils.addHoverEffect(scene, button);
 *   UIUtils.addHoverEffect(scene, button, { scale: 1.1. tint: 0x555555 });
 */

export class UIUtils {
    /**
     * ホバーエフェクトを追加
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Phaser.GameObjects.GameObject} target - 対象オブジェクト
     * @param {Object} options - オプション
     */
    static addHoverEffect(scene, target, options = {}) {
        const {
            scale = 1.05,
            duration = 100,
            tint = null,
            originalScale = target.scaleX || 1,
            originalTint = target.tintTopLeft
        } = options;

        if (!target.input) {
            target.setInteractive({ useHandCursor: true });
        }

        target.on('pointerover', () => {
            scene.tweens.add({
                targets: target,
                scaleX: originalScale * scale,
                scaleY: originalScale * scale,
                duration: duration,
                ease: 'Back.Out'
            });
            if (tint !== null && target.setTint) {
                target.setTint(tint);
            }
        });

        target.on('pointerout', () => {
            scene.tweens.add({
                targets: target,
                scaleX: originalScale,
                scaleY: originalScale,
                duration: duration,
                ease: 'Power2'
            });
            if (tint !== null && target.clearTint) {
                target.clearTint();
            }
        });
    }

    /**
     * シンプルなホバーエフェクト（スケールのみ）
     * @param {Phaser.GameObjects.GameObject} target - 対象オブジェクト
     * @param {number} scaleTo - ホバー時のスケール倍率
     */
    static addSimpleHover(target, scaleTo = 1.05) {
        const originalScale = target.scaleX || 1;
        
        if (!target.input) {
            target.setInteractive({ useHandCursor: true });
        }

        target.on('pointerover', () => {
            target.setScale(originalScale * scaleTo);
        });

        target.on('pointerout', () => {
            target.setScale(originalScale);
        });
    }

    /**
     * フィルスタイル付きホバー（Rectangle用）
     * @param {Phaser.GameObjects.Rectangle} target - 対象矩形
     * @param {number} normalColor - 通常時の色
     * @param {number} hoverColor - ホバー時の色
     * @param {number} scale - ホバー時のスケール
     */
    static addFillHover(target, normalColor, hoverColor, scale = 1.05) {
        const originalScale = target.scaleX || 1;
        
        if (!target.input) {
            target.setInteractive({ useHandCursor: true });
        }

        target.on('pointerover', () => {
            target.setFillStyle(hoverColor);
            target.setScale(originalScale * scale);
        });

        target.on('pointerout', () => {
            target.setFillStyle(normalColor);
            target.setScale(originalScale);
        });
    }

    /**
     * 汎用ポップボタンを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} options - オプション
     * @returns {Phaser.GameObjects.Container}
     */
    static createPopButton(scene, options = {}) {
        const {
            x = 0,
            y = 0,
            text = 'ボタン',
            width = 200,
            height = 60,
            bgColor = 0xFFFFFF,
            textColor = '#000000',
            strokeColor = 0x000000,
            fontSize = '22px',
            onClick = null,
            depth = 10
        } = options;

        const container = scene.add.container(x, y).setDepth(depth);

        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(bgColor, 1);
        bg.lineStyle(3, strokeColor, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);

        // テキスト
        const label = scene.add.text(0, 0, text, {
            fontSize: fontSize,
            fontFamily: '"Noto Sans JP", sans-serif',
            color: textColor
        }).setOrigin(0.5);

        container.add([bg, label]);

        // ヒットエリア
        container.setSize(width, height);
        container.setInteractive({ useHandCursor: true });

        // ホバーエフェクト
        container.on('pointerover', () => {
            container.setScale(1.05);
        });
        container.on('pointerout', () => {
            container.setScale(1.0);
        });

        // クリック
        if (onClick) {
            container.on('pointerdown', onClick);
        }

        return container;
    }

    /**
     * 矩形ボタンを作成（既存の_createPopButtonパターン互換）
     * @param {Phaser.Scene} scene - Phaserシーン  
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} text - ボタンテキスト
     * @param {Function} onClick - クリックコールバック
     * @param {Object} options - 追加オプション
     * @returns {Phaser.GameObjects.Container}
     */
    static createRectButton(scene, x, y, text, onClick, options = {}) {
        const {
            width = 550,
            height = 65,
            textColor = '#000000',
            bgColor = 0xFFFFFF,
            strokeColor = 0x000000,
            fontSize = '24px'
        } = options;

        return this.createPopButton(scene, {
            x, y, text, width, height, bgColor, textColor, strokeColor, fontSize, onClick
        });
    }
}
