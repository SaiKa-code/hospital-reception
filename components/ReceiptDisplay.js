// components/ReceiptDisplay.js
// 領収証表示の共通コンポーネント

/**
 * ReceiptDisplay - 領収証を描画する共通コンポーネント
 * 
 * 使用例:
 *   import { ReceiptDisplay } from './components/ReceiptDisplay.js';
 *   
 *   const result = ReceiptDisplay.render(scene, container, patient, {
 *       areaX: 960, areaWidth: 520,
 *       receiptData: this.receiptData
 *   });
 *   console.log('支払い金額:', result.correctAmount);
 */

export class ReceiptDisplay {
    /**
     * 領収証コンテンツを描画（コンテナに追加）
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Phaser.GameObjects.Container} container - 描画先コンテナ
     * @param {Object} patient - 患者データ
     * @param {Object} options - オプション
     * @returns {Object} { correctAmount: number } 計算された支払い金額
     */
    static render(scene, container, patient, options = {}) {
        const {
            areaX = 960,
            areaWidth = 520,
            startY = 200,
            receiptData = {}
        } = options;

        const details = patient.insuranceDetails || {};
        
        let y = startY;
        const leftX = areaX - 220;
        const pointX = areaX - 10;
        const priceX = areaX + 100;
        
        // 患者名
        container.add(scene.add.text(leftX, y, '患者名:', {
            fontSize: '16px', color: '#666666'
        }));
        container.add(scene.add.text(areaX + 50, y, patient.name || '不明', {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        y += 35;
        
        // 保険種別
        const age = parseInt(details['年齢']) || 0;
        const insuranceType = details['保険種別'] || '社保'; // 🚨 修正: 年齢に関わらず実際の保険種別を表示
        container.add(scene.add.text(leftX, y, '保険種別:', {
            fontSize: '16px', color: '#666666'
        }));
        const insuranceTypeText = scene.add.text(areaX + 50, y, insuranceType, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        });
        container.add(insuranceTypeText);
        y += 35;
        
        // 負担割合
        const burdenRate = receiptData.burdenRate || (age >= 70 ? 0.1 : 0.3);
        const copayRate = Math.round(burdenRate * 100);
        container.add(scene.add.text(leftX, y, '負担割合:', {
            fontSize: '16px', color: '#666666'
        }));
        container.add(scene.add.text(areaX + 50, y, `${copayRate}%`, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        y += 40;
        
        // 区切り線
        container.add(scene.add.rectangle(areaX, y, areaWidth - 40, 3, 0xFFB300));
        y += 25;
        
        // ヘッダー
        container.add(scene.add.text(leftX, y, '【医療費明細】', {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#666666'
        }));
        container.add(scene.add.text(pointX, y, '点数', {
            fontSize: '14px', color: '#888888'
        }));
        container.add(scene.add.text(priceX, y, '金額', {
            fontSize: '14px', color: '#888888'
        }));
        y += 30;
        
        // 各費目
        const items = [
            { label: receiptData.visitLabel || '初診・再診料:', points: receiptData.visitPoints || 0 },
            { label: '投薬料:', points: receiptData.medication || 0 },
            { label: '注射料:', points: receiptData.injection || 0 },
            { label: '処置料:', points: receiptData.treatment || 0 },
            { label: '検査料:', points: receiptData.examination || 0 },
            { label: '画像診断:', points: receiptData.imaging || 0 }
        ];
        
        let totalPoints = 0;
        items.forEach(item => {
            const fee = item.points * 10;
            totalPoints += item.points;
            
            container.add(scene.add.text(leftX, y, item.label, {
                fontSize: '15px', color: '#666666'
            }));
            container.add(scene.add.text(pointX, y, `${item.points}点`, {
                fontSize: '15px', color: '#333333'
            }));
            container.add(scene.add.text(priceX, y, `¥${fee.toLocaleString()}`, {
                fontSize: '15px', color: '#333333'
            }));
            y += 28;
        });
        
        if (receiptData.totalPoints) {
            totalPoints = receiptData.totalPoints;
        }
        
        y += 7;
        
        // 区切り線
        container.add(scene.add.rectangle(areaX, y, areaWidth - 40, 3, 0xFFB300));
        y += 25;
        
        // 合計
        const totalFee = receiptData.totalAmount || (totalPoints * 10);
        container.add(scene.add.text(leftX, y, '合計:', {
            fontSize: '17px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        container.add(scene.add.text(pointX, y, `${totalPoints}点`, {
            fontSize: '17px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        container.add(scene.add.text(priceX, y, `¥${totalFee.toLocaleString()}`, {
            fontSize: '17px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333'
        }));
        y += 45;
        
        // 患者負担額
        let correctAmount = receiptData.patientPay || Math.round(totalFee * burdenRate);
        
        // 自費がある場合は加算
        if (receiptData.selfPay && receiptData.selfPay > 0) {
            correctAmount += receiptData.selfPay;
        }
        
        // 支払い金額表示
        container.add(scene.add.rectangle(areaX, y + 25, areaWidth - 40, 70, 0x4CAF50));
        container.add(scene.add.text(areaX, y + 10, `お支払い金額（${copayRate}%負担）`, {
            fontSize: '14px', color: '#000000ff'
        }).setOrigin(0.5));
        container.add(scene.add.text(areaX, y + 38, `¥${correctAmount.toLocaleString()}`, {
            fontSize: '30px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#000000ff'
        }).setOrigin(0.5));
        
        return { correctAmount, burdenRate, totalPoints, totalFee, insuranceTypeText };
    }
}
