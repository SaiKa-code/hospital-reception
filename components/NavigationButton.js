/**
 * NavigationButton - プレミアムナビゲーションボタンコンポーネント
 * 
 * 使用例:
 * const btn = NavigationButton.create(this, {
 *     x: 1750, y: 920,
 *     label: '処方箋確認へ',
 *     icon: '📋',
 *     colorScheme: 'purple',
 *     onClick: () => this.slideToScene('CheckScene', 'left')
 * });
 */

// カラースキーム定義
const COLOR_SCHEMES = {
    purple: {
        gradient: [0x8E44AD, 0x5B2C6F],
        hoverGradient: [0xA569BD, 0x7D3C98],
        border: 0xBB8FCE,
        hoverBorder: 0xD7BDE2,
        iconBg: 0x6C3483,
        iconBorder: 0xAF7AC5,
        arrow: '#E8DAEF'
    },
    brown: {
        gradient: [0x6D4C41, 0x3E2723],
        hoverGradient: [0x8D6E63, 0x5D4037],
        border: 0xA1887F,
        hoverBorder: 0xBCAAA4,
        iconBg: 0x4E342E,
        iconBorder: 0x8D6E63,
        arrow: '#D7CCC8'
    },
    blue: {
        gradient: [0x2980B9, 0x1A5276],
        hoverGradient: [0x3498DB, 0x2471A3],
        border: 0x5DADE2,
        hoverBorder: 0x85C1E9,
        iconBg: 0x1F618D,
        iconBorder: 0x5499C7,
        arrow: '#AED6F1'
    },
    green: {
        gradient: [0x27AE60, 0x1E8449],
        hoverGradient: [0x2ECC71, 0x239B56],
        border: 0x58D68D,
        hoverBorder: 0x82E0AA,
        iconBg: 0x1D8348,
        iconBorder: 0x52BE80,
        arrow: '#ABEBC6'
    },
    red: {
        gradient: [0xC0392B, 0x922B21],
        hoverGradient: [0xE74C3C, 0xB03A2E],
        border: 0xEC7063,
        hoverBorder: 0xF1948A,
        iconBg: 0xA93226,
        iconBorder: 0xCD6155,
        arrow: '#F5B7B1'
    },
    dark: {
        gradient: [0x34495E, 0x1C2833],
        hoverGradient: [0x5D6D7E, 0x2C3E50],
        border: 0x5D6D7E,
        hoverBorder: 0x85929E,
        iconBg: 0x2C3E50,
        iconBorder: 0x566573,
        arrow: '#ABB2B9'
    }
};

class NavigationButton {
    /**
     * プレミアムナビゲーションボタンを作成
     * @param {Phaser.Scene} scene - 親シーン
     * @param {Object} options - オプション
     * @param {number} options.x - X座標
     * @param {number} options.y - Y座標
     * @param {string} options.label - ボタンラベル
     * @param {string} options.icon - 絵文字アイコン
     * @param {string} options.colorScheme - カラースキーム (purple/brown/blue/green/red/dark)
     * @param {Function} options.onClick - クリック時のコールバック
     * @param {number} [options.width=280] - ボタン幅
     * @param {number} [options.height=60] - ボタン高さ
     * @param {boolean} [options.showArrow=true] - 矢印を表示するか
     * @returns {Phaser.GameObjects.Container} ボタンコンテナ
     */
    static create(scene, options) {
        const {
            x, y, label, icon,
            colorScheme = 'purple',
            onClick,
            width = 280,
            height = 60,
            showArrow = true,
            arrowDirection = 'right' // 'right' | 'left'
        } = options;

        const scheme = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.purple;
        
        // コンテナ作成
        const container = scene.add.container(x, y);
        
        // グラデーション背景
        const bg = scene.add.graphics();
        NavigationButton._drawBackground(bg, width, height, scheme, false);
        
        // アイコン位置（左矢印の場合は右側に配置）
        const iconX = arrowDirection === 'left' ? width/2 - 35 : -width/2 + 35;
        
        // アイコン背景
        const iconBg = scene.add.circle(iconX, 0, 22, scheme.iconBg);
        iconBg.setStrokeStyle(2, scheme.iconBorder);
        
        // アイコン
        const iconText = scene.add.text(iconX, 0, icon, { fontSize: '22px' }).setOrigin(0.5);
        
        // ラベル位置調整
        // 左矢印の場合: 矢印(左) - ラベル - アイコン(右)
        // 右矢印の場合: アイコン(左) - ラベル - 矢印(右)
        let labelX = 0;
        if (showArrow) {
             labelX = arrowDirection === 'left' ? -15 : 15;
        }

        // ラベル
        const labelText = scene.add.text(labelX, -2, label, { 
            fontSize: '22px', 
            color: '#FFFFFF', 
            fontFamily: '"Noto Sans JP", sans-serif', 
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // 矢印
        let arrow = null;
        let originalArrowX = 0;
        
        if (showArrow) {
            const arrowChar = arrowDirection === 'left' ? '‹' : '›';
            originalArrowX = arrowDirection === 'left' ? -width/2 + 25 : width/2 - 25;
            
            arrow = scene.add.text(originalArrowX, 0, arrowChar, { 
                fontSize: '28px', 
                color: scheme.arrow, 
                fontStyle: 'bold'
            }).setOrigin(0.5);
        }
        
        // ヒットエリア
        const hitArea = scene.add.rectangle(0, 0, width, height)
            .setInteractive({ useHandCursor: true })
            .setAlpha(0.001);
        
        // コンテナに追加
        const children = [bg, iconBg, iconText, labelText, hitArea];
        if (arrow) children.splice(4, 0, arrow);
        container.add(children);
        
        // ホバーエフェクト
        hitArea.on('pointerover', () => {
            scene.tweens.add({ targets: container, scale: 1.05, duration: 150, ease: 'Back.Out' });
            if (arrow) {
                const moveX = arrowDirection === 'left' ? -10 : 10;
                scene.tweens.add({ targets: arrow, x: originalArrowX + moveX, duration: 200, ease: 'Power2', yoyo: true });
            }
            NavigationButton._drawBackground(bg, width, height, scheme, true);
        });
        
        hitArea.on('pointerout', () => {
            scene.tweens.add({ targets: container, scale: 1.0, duration: 150, ease: 'Power2' });
            if (arrow) {
                // 元の位置に戻す
                scene.tweens.add({ targets: arrow, x: originalArrowX, duration: 200, ease: 'Power2' });
            }
            NavigationButton._drawBackground(bg, width, height, scheme, false);
        });
        
        hitArea.on('pointerdown', () => {
            // 効果音（シーンに_playSEがあれば使用）
            if (scene._playSE) {
                scene._playSE('se_changesean');
            }
            if (onClick) onClick();
        });
        
        // コンテナにメタデータを保存
        container.hitArea = hitArea;
        container.bg = bg;
        container.labelText = labelText;
        
        return container;
    }
    
    /**
     * 背景を描画
     * @private
     */
    static _drawBackground(graphics, width, height, scheme, isHover) {
        graphics.clear();
        
        const gradient = isHover ? scheme.hoverGradient : scheme.gradient;
        const borderColor = isHover ? scheme.hoverBorder : scheme.border;
        const borderWidth = isHover ? 3 : 2;
        
        graphics.fillGradientStyle(gradient[0], gradient[0], gradient[1], gradient[1], 1);
        graphics.fillRoundedRect(-width/2, -height/2, width, height, 12);
        graphics.lineStyle(borderWidth, borderColor, isHover ? 1 : 0.8);
        graphics.strokeRoundedRect(-width/2, -height/2, width, height, 12);
    }
    
    /**
     * ボタンを有効/無効化
     * @param {Phaser.GameObjects.Container} button - ボタンコンテナ
     * @param {boolean} enabled - 有効かどうか
     */
    static setEnabled(button, enabled) {
        if (enabled) {
            button.setAlpha(1);
            if (button.hitArea) button.hitArea.setInteractive();
        } else {
            button.setAlpha(0.5);
            if (button.hitArea) button.hitArea.disableInteractive();
        }
    }
}

export { NavigationButton, COLOR_SCHEMES };
