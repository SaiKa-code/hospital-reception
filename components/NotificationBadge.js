// NotificationBadge.js - プレミアムUI通知バッジコンポーネント
// iOSスタイルのバッジデザイン - 数字のみ表示

export class NotificationBadge {
    /**
     * プレミアム通知バッジを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} config - 設定オブジェクト
     * @param {number} config.x - X座標
     * @param {number} config.y - Y座標
     * @param {string} [config.colorScheme='red'] - カラースキーム ('red', 'blue', 'green', 'orange')
     * @param {number} [config.depth=100] - 描画深度
     * @returns {Phaser.GameObjects.Container} バッジコンテナ
     */
    static create(scene, config) {
        const {
            x = 0,
            y = 0,
            colorScheme = 'red',
            depth = 100
        } = config;

        // カラーパレット（iOSスタイル）
        const colors = {
            red: { bg: 0xFF3B30, shadow: 0xCC2E26, glow: 0xFF6B61 },
            blue: { bg: 0x007AFF, shadow: 0x0062CC, glow: 0x4DA6FF },
            green: { bg: 0x34C759, shadow: 0x28A745, glow: 0x5DD87A },
            orange: { bg: 0xFF9500, shadow: 0xCC7600, glow: 0xFFB347 }
        };
        const palette = colors[colorScheme] || colors.red;

        // コンテナ作成
        const container = scene.add.container(x, y);
        container.setDepth(depth);

        // バッジサイズ（動的に調整）
        const minSize = 26;
        
        // 影（ドロップシャドウ効果）
        const shadow = scene.add.circle(1.5, 1.5, minSize / 2, 0x000000, 0.25);
        container.add(shadow);
        
        // メインバッジ背景（グラデーション風）
        const bgOuter = scene.add.circle(0, 0, minSize / 2, palette.shadow);
        container.add(bgOuter);
        
        const bgMain = scene.add.circle(0, -1, (minSize / 2) - 1, palette.bg);
        container.add(bgMain);
        
        // ハイライト（光沢効果）
        const highlight = scene.add.ellipse(0, -5, minSize - 8, 8, palette.glow, 0.4);
        container.add(highlight);
        
        // 数字テキスト
        const numberText = scene.add.text(0, 0, '', {
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            fontStyle: 'bold',
            color: '#FFFFFF',
            stroke: '#00000033',
            strokeThickness: 1
        }).setOrigin(0.5);
        container.add(numberText);

        // バッジ参照を保存
        container.badgeElements = {
            shadow,
            bgOuter,
            bgMain,
            highlight,
            numberText
        };
        container.palette = palette;
        container.minSize = minSize;

        // 初期状態は非表示
        container.setVisible(false);

        // カスタムメソッドを追加
        container.updateCount = (count) => NotificationBadge.updateCount(container, count);
        container.pulse = () => NotificationBadge.pulse(scene, container);

        return container;
    }

    /**
     * バッジの数値を更新し、サイズを自動調整
     * @param {Phaser.GameObjects.Container} container - バッジコンテナ
     * @param {number} count - 表示する数値
     */
    static updateCount(container, count) {
        const { shadow, bgOuter, bgMain, highlight, numberText } = container.badgeElements;
        const minSize = container.minSize;

        if (count <= 0) {
            container.setVisible(false);
            return;
        }

        // 数値をテキストに設定
        const displayText = count > 99 ? '99+' : String(count);
        numberText.setText(displayText);

        // テキストの幅に応じてバッジサイズを調整
        const textWidth = numberText.width;
        const badgeWidth = Math.max(minSize, textWidth + 12);
        const badgeHeight = minSize;
        const isWide = badgeWidth > minSize;

        if (isWide) {
            // 横長のピル型バッジ
            const halfHeight = badgeHeight / 2;
            
            shadow.setVisible(false);
            bgOuter.setVisible(false);
            bgMain.setVisible(false);
            highlight.setVisible(false);

            // 既存のピル型がなければ作成
            if (!container.pillShape) {
                const palette = container.palette;
                
                // ピル型背景
                const pillShadow = container.scene.add.graphics();
                pillShadow.fillStyle(0x000000, 0.25);
                pillShadow.fillRoundedRect(-badgeWidth/2 + 1.5, -halfHeight + 1.5, badgeWidth, badgeHeight, halfHeight);
                container.addAt(pillShadow, 0);
                
                const pillBg = container.scene.add.graphics();
                pillBg.fillStyle(palette.bg, 1);
                pillBg.fillRoundedRect(-badgeWidth/2, -halfHeight, badgeWidth, badgeHeight, halfHeight);
                container.addAt(pillBg, 1);
                
                container.pillShape = { pillShadow, pillBg };
            } else {
                // 既存のピル型を更新
                const { pillShadow, pillBg } = container.pillShape;
                const palette = container.palette;
                
                pillShadow.clear();
                pillShadow.fillStyle(0x000000, 0.25);
                pillShadow.fillRoundedRect(-badgeWidth/2 + 1.5, -halfHeight + 1.5, badgeWidth, badgeHeight, halfHeight);
                
                pillBg.clear();
                pillBg.fillStyle(palette.bg, 1);
                pillBg.fillRoundedRect(-badgeWidth/2, -halfHeight, badgeWidth, badgeHeight, halfHeight);
            }
        } else {
            // 円形バッジ
            shadow.setVisible(true);
            bgOuter.setVisible(true);
            bgMain.setVisible(true);
            highlight.setVisible(true);

            if (container.pillShape) {
                container.pillShape.pillShadow.setVisible(false);
                container.pillShape.pillBg.setVisible(false);
            }
        }

        container.setVisible(true);
    }

    /**
     * パルスアニメーション（新しい通知時に呼び出し）
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Phaser.GameObjects.Container} container - バッジコンテナ
     */
    static pulse(scene, container) {
        if (!container.visible) return;

        scene.tweens.add({
            targets: container,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            yoyo: true,
            repeat: 1,
            ease: 'Sine.easeInOut'
        });
    }

    /**
     * バッジを破棄
     * @param {Phaser.GameObjects.Container} container - バッジコンテナ
     */
    static destroy(container) {
        if (container.pillShape) {
            container.pillShape.pillShadow.destroy();
            container.pillShape.pillBg.destroy();
        }
        container.destroy();
    }
}
