// components/UIHeader.js
// シーンヘッダーの共通コンポーネント（プレミアムデザイン）

/**
 * UIHeader - プレミアムなシーンヘッダーを作成
 * 
 * 使用例:
 *   import { UIHeader } from './components/UIHeader.js';
 *   
 *   const header = UIHeader.create(scene, {
 *       x: 960, y: 70,
 *       text: '💊 処方確認',
 *       color: 0x7E57C2,
 *       icon: '📋'
 *   });
 */

export class UIHeader {
    /**
     * プレミアムヘッダーを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} options - オプション
     * @returns {Phaser.GameObjects.Container}
     */
    static create(scene, options = {}) {
        const {
            x = 960,
            y = 70,
            text = 'ヘッダー',
            color = 0x4CAF50,
            icon = '🏥',
            width = 520,
            height = 70,
            depth = 100,
            style = 'modern' // 'modern' | 'classic' | 'minimal'
        } = options;

        const container = scene.add.container(x, y).setDepth(depth);

        if (style === 'modern') {
            return this._createModernHeader(scene, container, { text, color, icon, width, height });
        } else if (style === 'minimal') {
            return this._createMinimalHeader(scene, container, { text, color, icon, width, height });
        } else {
            return this._createClassicHeader(scene, container, { text, color, icon, width, height });
        }
    }

    /**
     * モダンスタイル（デフォルト）- ダークテーマ + グラデーション風
     */
    static _createModernHeader(scene, container, { text, color, icon, width, height }) {
        // ============================================
        // 🌟 プレミアムダークヘッダー
        // ============================================
        
        // 影（ソフトシャドウ）
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.3);
        shadow.fillRoundedRect(-width/2 + 4, -height/2 + 4, width, height, 16);
        
        // メイン背景（ダークグラデーション風）
        const bgRect = scene.add.graphics();
        bgRect.fillGradientStyle(0x1a1a2e, 0x1a1a2e, 0x16213e, 0x16213e, 1);
        bgRect.fillRoundedRect(-width/2, -height/2, width, height, 16);
        
        // アクセントボーダー（テーマカラー）
        bgRect.lineStyle(3, color, 1);
        bgRect.strokeRoundedRect(-width/2, -height/2, width, height, 16);
        
        // 左側のアクセントバー
        const accentBar = scene.add.graphics();
        accentBar.fillStyle(color, 1);
        accentBar.fillRoundedRect(-width/2, -height/2, 8, height, { tl: 16, bl: 16, tr: 0, br: 0 });
        
        // 上部のハイライト
        const highlight = scene.add.graphics();
        highlight.fillStyle(0xFFFFFF, 0.08);
        highlight.fillRoundedRect(-width/2 + 10, -height/2 + 4, width - 20, height/3, { tl: 12, tr: 12, bl: 4, br: 4 });

        // アイコン背景
        const iconBg = scene.add.graphics();
        iconBg.fillStyle(color, 0.2);
        iconBg.lineStyle(2, color, 0.6);
        iconBg.fillCircle(-width/2 + 55, 0, 28);
        iconBg.strokeCircle(-width/2 + 55, 0, 28);
        
        // アイコン
        const iconText = scene.add.text(-width/2 + 55, 0, icon, { 
            fontSize: '32px' 
        }).setOrigin(0.5);

        // タイトル
        const titleText = scene.add.text(20, 0, text, {
            fontSize: '32px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        
        // サブテキスト的な装飾ライン
        const decorLine = scene.add.graphics();
        decorLine.lineStyle(2, color, 0.5);
        decorLine.lineBetween(-width/2 + 100, height/2 - 8, width/2 - 20, height/2 - 8);

        container.add([shadow, bgRect, accentBar, highlight, iconBg, iconText, titleText, decorLine]);
        return container;
    }

    /**
     * クラシックスタイル - 従来のカラフルなデザイン
     */
    static _createClassicHeader(scene, container, { text, color, icon, width, height }) {
        // 影
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.4);
        shadow.fillRoundedRect(-width/2 + 6, -height/2 + 6, width, height, 24);

        // 背景
        const bgRect = scene.add.graphics();
        bgRect.fillStyle(color, 1);
        bgRect.fillRoundedRect(-width/2, -height/2, width, height, 24);
        bgRect.lineStyle(5, 0xFFFFFF, 1);
        bgRect.strokeRoundedRect(-width/2, -height/2, width, height, 24);

        // 光沢
        const shine = scene.add.graphics();
        shine.fillStyle(0xFFFFFF, 0.15);
        shine.fillRoundedRect(-width/2 + 10, -height/2 + 8, width - 20, height/2 - 4, { tl: 16, tr: 16, bl: 4, br: 4 });

        // アイコン円
        const iconCircle = scene.add.circle(-width/2 + 50, 0, 35, 0xFFFFFF)
            .setStrokeStyle(4, 0xFFD700);
        
        // アイコン
        const iconText = scene.add.text(-width/2 + 50, 0, icon, { fontSize: '40px' }).setOrigin(0.5);

        // タイトル
        const titleText = scene.add.text(30, 0, text, {
            fontSize: '38px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5);

        container.add([shadow, bgRect, shine, iconCircle, iconText, titleText]);
        return container;
    }

    /**
     * ミニマルスタイル - シンプルでクリーン
     */
    static _createMinimalHeader(scene, container, { text, color, icon, width, height }) {
        // 薄い背景
        const bgRect = scene.add.graphics();
        bgRect.fillStyle(0x000000, 0.6);
        bgRect.fillRoundedRect(-width/2, -height/2, width, height, 12);
        
        // 下部ボーダー
        bgRect.lineStyle(3, color, 1);
        bgRect.lineBetween(-width/2 + 10, height/2 - 2, width/2 - 10, height/2 - 2);

        // アイコン
        const iconText = scene.add.text(-width/2 + 40, 0, icon, { 
            fontSize: '28px' 
        }).setOrigin(0.5);

        // タイトル
        const titleText = scene.add.text(10, 0, text, {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        container.add([bgRect, iconText, titleText]);
        return container;
    }

    /**
     * サブヘッダーを作成（セクションタイトル用）
     */
    static createSubHeader(scene, options = {}) {
        const {
            x = 960,
            y = 150,
            text = 'セクション',
            color = 0x5D6D7E,
            width = 300,
            depth = 50
        } = options;

        const container = scene.add.container(x, y).setDepth(depth);

        // 背景バー
        const bg = scene.add.graphics();
        bg.fillStyle(color, 0.8);
        bg.fillRoundedRect(-width/2, -18, width, 36, 8);

        // テキスト
        const titleText = scene.add.text(0, 0, text, {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);

        container.add([bg, titleText]);
        return container;
    }
}
