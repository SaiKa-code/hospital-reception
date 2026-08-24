// components/InsuranceCardDisplay.js
// 保険証カード表示の共通コンポーネント

/**
 * InsuranceCardDisplay - 保険証カードを描画する共通コンポーネント
 * 
 * 使用例:
 *   import { InsuranceCardDisplay } from './components/InsuranceCardDisplay.js';
 *   
 *   const card = InsuranceCardDisplay.create(scene, patientData, {
 *       x: 400, y: 300,
 *       compact: false  // trueで簡易表示
 *   });
 */

export class InsuranceCardDisplay {
    /**
     * 保険証カードを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} data - 患者データ（insuranceDetails含む）
     * @param {Object} options - オプション設定
     * @returns {Phaser.GameObjects.Container}
     */
    static create(scene, data, options = {}) {
        const {
            x = 0,
            y = 0,
            compact = false,
            showStamp = true,
            showFooter = true,
            depth = 10
        } = options;

        const width = compact ? 550 : 600;
        const height = compact ? 320 : 380;
        const container = scene.add.container(x, y).setDepth(depth);

        // --- 1. 色と保険者情報の決定 ---
        const { cardColor, insurerName, workplaceName } = this._determineCardStyle(data);
        const details = data.insuranceDetails || {};

        // --- 2. カード背景 ---
        const bg = scene.add.graphics();
        bg.fillStyle(cardColor, 1);
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        // ヘッダー帯
        const headerBg = scene.add.graphics();
        headerBg.fillStyle(0xFFFFFF, 0.4);
        headerBg.fillRect(-width/2, -height/2 + 15, width, 50);

        container.add([bg, headerBg]);

        // --- 3. スタイル ---
        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, color: '#333333', fontSize: compact ? '16px' : '18px' };
        const valueStyle = { fontFamily: fontBase, color: '#000000', fontSize: compact ? '20px' : '24px', stroke: '#000000', strokeThickness: 1 };
        const titleStyle = { fontFamily: fontBase, color: '#000000', fontSize: compact ? '28px' : '32px', stroke: '#000000', strokeThickness: 1 };

        // タイトル
        const title = scene.add.text(0, -height/2 + 40, '健康保険被保険者証', titleStyle).setOrigin(0.5);
        container.add(title);

        // --- 4. データ配置 ---
        const baseX = -width/2 + 30;
        let currentY = compact ? -60 : -90;
        const lineHeight = compact ? 40 : 48;

        // 記号・番号・枝番
        container.add(scene.add.text(baseX, currentY, '記号', labelStyle));
        container.add(scene.add.text(baseX + 50, currentY - 4, details['記号'] || 'XXXX', valueStyle));

        const numX = baseX + 180;
        container.add(scene.add.text(numX, currentY, '番号', labelStyle));
        container.add(scene.add.text(numX + 50, currentY - 4, details['番号'] || 'XXXX', valueStyle));

        if (!compact) {
            const branchX = numX + 220;
            container.add(scene.add.text(branchX, currentY, '枝番', labelStyle));
            container.add(scene.add.text(branchX + 50, currentY - 4, details['枝番'] || '00', valueStyle));
        }

        // 氏名
        currentY += lineHeight;
        const kanaVal = details['フリガナ'] || details['カナ'] || '';
        if (kanaVal && !compact) {
            container.add(scene.add.text(baseX + 80, currentY - 18, kanaVal, { ...labelStyle, fontSize: '13px' }));
        }
        container.add(scene.add.text(baseX, currentY, '氏名', labelStyle));
        container.add(scene.add.text(baseX + (compact ? 60 : 80), currentY - (compact ? 0 : 6), details['氏名'] || data.name, { ...valueStyle, fontSize: compact ? '24px' : '30px' }));

        // 生年月日・性別
        currentY += lineHeight;
        const dob = details['生年月日'] || 'XXXX/XX/XX';
        const age = details['年齢'] || '??歳';

        if (compact) {
            container.add(scene.add.text(baseX, currentY, `年齢: ${age}`, valueStyle));
            container.add(scene.add.text(baseX + 200, currentY, `性別: ${details['性別'] || '??'}`, valueStyle));
        } else {
            container.add(scene.add.text(baseX, currentY, '生年月日', labelStyle));
            container.add(scene.add.text(baseX + 100, currentY - 4, `${dob} (${age})`, valueStyle));

            let genderStr = details['性別'] || 'X';
            if (genderStr === 'X' && data.genderKey) genderStr = (data.genderKey === 'man') ? '男' : '女';

            const branchX = numX + 220;
            container.add(scene.add.text(branchX, currentY, '性別', labelStyle));
            container.add(scene.add.text(branchX + 50, currentY - 4, genderStr, valueStyle));
        }

        // 負担割合
        currentY += lineHeight;
        const burdenVal = details['負担'] || '3割';
        
        if (compact) {
            container.add(scene.add.text(baseX, currentY, `負担: ${burdenVal}`, { ...valueStyle, fontSize: '22px' }));
        } else {
            const branchX = numX + 220;
            container.add(scene.add.text(branchX, currentY, '割合', labelStyle));
            container.add(scene.add.text(branchX + 50, currentY - 4, burdenVal, valueStyle));
        }

        // フッターエリア（フルモードのみ）
        if (!compact && showFooter) {
            const footerLabelStyle = { fontFamily: fontBase, color: '#333333', fontSize: '15px' };
            const footerValueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '19px', stroke: '#000000', strokeThickness: 1 };

            const footerStartY = 60;
            const footerLineH = 35;

            let fY = footerStartY;
            container.add(scene.add.text(baseX, fY, '保険者番号', footerLabelStyle));
            container.add(scene.add.text(baseX + 110, fY - 2, details['保険者番号'] || 'XXXXXXXX', footerValueStyle));

            fY += footerLineH;
            container.add(scene.add.text(baseX, fY, '保険者名称', footerLabelStyle));
            container.add(scene.add.text(baseX + 110, fY - 2, insurerName, footerValueStyle));

            if (workplaceName) {
                fY += footerLineH;
                container.add(scene.add.text(baseX, fY, '事業所名称', footerLabelStyle));
                container.add(scene.add.text(baseX + 110, fY - 2, workplaceName, footerValueStyle));
            }
        }

        // 印鑑（フルモードのみ）
        if (!compact && showStamp) {
            const stampX = (width / 2) - 80;
            const stampY = (height / 2) - 50;

            const stampMark = scene.add.circle(stampX, stampY, 22).setStrokeStyle(3, 0xFF0000);
            const stampChar = scene.add.text(stampX, stampY, '印', { fontSize: '20px', color: '#FF0000', fontFamily: fontBase }).setOrigin(0.5);
            container.add([stampMark, stampChar]);
        }

        return container;
    }

    /**
     * カードスタイルを決定
     * @private
     */
    static _determineCardStyle(data) {
        let cardColor = 0x3498DB; // 社保(青)
        let insurerName = '全国健康保険協会';
        let workplaceName = '株式会社XXXXX';

        const categoryDisplay = data.visualCategory || '';
        const details = data.insuranceDetails || {};

        if (categoryDisplay.includes('国保')) {
            cardColor = 0xE74C3C;
            insurerName = 'XXXX市';
            workplaceName = 'XXXX市';
        } else if (categoryDisplay.includes('後期')) {
            cardColor = 0x9B59B6;
            insurerName = 'XX県後期高齢者医療広域連合';
            workplaceName = '';
        } else {
            cardColor = 0x3498DB;
            if (details['会社名']) workplaceName = details['会社名'];
        }

        return { cardColor, insurerName, workplaceName };
    }

    /**
     * マイナンバーカードを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} data - 患者データ
     * @param {Object} options - オプション設定
     * @returns {Phaser.GameObjects.Container}
     */
    static createMyNumberCard(scene, data, options = {}) {
        const { x = 0, y = 0, depth = 10 } = options;
        
        const width = 600;
        const height = 380;
        const container = scene.add.container(x, y).setDepth(depth);

        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(0xFFCCDD, 1);
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        // アイコン
        const iconBg = scene.add.graphics();
        iconBg.fillStyle(0xFFFFFF, 1);
        iconBg.fillCircle(width/2 - 50, -height/2 + 50, 35);
        const iconText = scene.add.text(width/2 - 50, -height/2 + 50, '🐰', { fontSize: '40px' }).setOrigin(0.5);

        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, color: '#555555', fontSize: '18px' };
        const valueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '24px', stroke: '#000000', strokeThickness: 1 };
        const titleStyle = { fontFamily: fontBase, color: '#000000', fontSize: '28px', stroke: '#000000', strokeThickness: 1 };

        const title = scene.add.text(0, -height/2 + 30, '個人番号カード', titleStyle).setOrigin(0.5);

        const startY = -40;
        const leftX = -width/2 + 40;
        const details = data.insuranceDetails || {};

        const t1_label = scene.add.text(leftX, startY, '氏名', labelStyle);
        const t1_val = scene.add.text(leftX + 60, startY - 5, data.name, { ...valueStyle, fontSize: '32px' });

        const t2_label = scene.add.text(leftX, startY + 50, '生年月日', labelStyle);
        const dob = details['生年月日'] || '????/??/??';
        const t2_val = scene.add.text(leftX + 100, startY + 45, dob, valueStyle);

        const t3_label = scene.add.text(leftX, startY + 100, '住所', labelStyle);
        const t3_val = scene.add.text(leftX + 60, startY + 95, details['住所'] || 'XX県XX市XX町', { ...valueStyle, fontSize: '18px' });

        container.add([bg, iconBg, iconText, title, t1_label, t1_val, t2_label, t2_val, t3_label, t3_val]);

        return container;
    }
}
