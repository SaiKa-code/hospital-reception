// components/PrescriptionDisplay.js
// 処方箋表示の共通コンポーネント

/**
 * PrescriptionDisplay - 処方箋を描画する共通コンポーネント
 * 
 * 使用例:
 *   import { PrescriptionDisplay } from './components/PrescriptionDisplay.js';
 *   
 *   PrescriptionDisplay.render(scene, container, patient, {
 *       areaX: 960, areaWidth: 520,
 *       medicineData: this.medicineData,
 *       chineseMedicineData: this.chineseMedicineData
 *   });
 */

export class PrescriptionDisplay {
    /**
     * 処方箋コンテンツを描画（コンテナに追加）
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Phaser.GameObjects.Container} container - 描画先コンテナ
     * @param {Object} patient - 患者データ
     * @param {Object} options - オプション
     */
    static render(scene, container, patient, options = {}) {
        const {
            areaX = 960,
            areaWidth = 520,
            startY = 195,
            medicineData = [],
            chineseMedicineData = []
        } = options;

        const triageData = patient.triageData || {};
        const details = patient.insuranceDetails || {};
        
        let y = startY;
        const leftX = areaX - 230;
        
        // 処方箋ヘッダー
        container.add(scene.add.text(areaX, y, '処 方 箋', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1B5E20'
        }).setOrigin(0.5));
        y += 45;
        
        // 患者情報
        container.add(scene.add.text(leftX, y,
            `保険者番号: ${details['保険者番号'] || 'XXXXXXXX'}\n` +
            `氏名: ${patient.name}\n` +
            `年齢: ${details['年齢'] || '??'}歳`, {
            fontSize: '14px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            lineSpacing: 4
        }));
        y += 65;
        
        // 医療機関コード
        container.add(scene.add.text(leftX, y,
            `都道府県番号: XX  点数表番号: X\n医療機関コード: XXXXXXX`, {
            fontSize: '12px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#666666'
        }));
        y += 50;
        
        // 区切り線
        container.add(scene.add.rectangle(areaX, y, areaWidth - 40, 2, 0x2E7D32));
        y += 15;
        
        // 処方内容ヘッダー
        container.add(scene.add.text(leftX, y, '【処方内容】', {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#1B5E20'
        }));
        y += 30;
        
        // 処方薬リスト
        const prescriptionStr = triageData['処方薬'] || '';
        const daysStr = triageData['処方日数'] || '';
        
        if (prescriptionStr) {
            const drugs = prescriptionStr.split(' / ');
            const days = daysStr.split(' / ');
            const itemWidth = areaWidth - 50;
            
            drugs.forEach((drug, i) => {
                const realName = drug.trim();
                const generalName = this._getFakeGeneralName(realName, medicineData, chineseMedicineData);
                const medicineInfo = this._getMedicineInfo(realName, medicineData, chineseMedicineData);
                const dayValue = days[i] || '7';
                const dosage = medicineInfo ? medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '1回分' : '1回分';
                const timing = medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '' : '';
                
                // 背景ボックス
                const itemBg = scene.add.rectangle(areaX, y + 25, itemWidth, 55, 0xFFFFFF, 0.8)
                    .setStrokeStyle(1, 0x2E7D32);
                container.add(itemBg);
                
                // 薬名
                container.add(scene.add.text(leftX + 10, y + 8, `${generalName}`, {
                    fontSize: '14px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#000000'
                }));
                
                // 詳細
                container.add(scene.add.text(leftX + 10, y + 30, `${dosage} / ${dayValue}日 / ${timing}`, {
                    fontSize: '13px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#666666'
                }));
                
                y += 60;
            });
        } else {
            container.add(scene.add.text(leftX + 10, y, '処方なし', {
                fontSize: '15px', color: '#888888'
            }));
            y += 30;
        }
        
        y += 15;
        
        // 区切り線
        container.add(scene.add.rectangle(areaX, y, areaWidth - 40, 2, 0x2E7D32));
        y += 20;
        
        // 医療機関情報
        container.add(scene.add.text(leftX, y, '【医療機関情報】', {
            fontSize: '14px', color: '#666666'
        }));
        y += 25;
        
        container.add(scene.add.text(leftX, y, '彩華総合病院\n〒XXX-XXXX XX県XX市XX町1-2-3', {
            fontSize: '13px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            lineSpacing: 4
        }));
        
        return y + 50;
    }

    /**
     * 偽一般名を取得
     * @private
     */
    static _getFakeGeneralName(realName, medicineData, chineseMedicineData) {
        // 西洋薬から検索
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽一般名'] || medicine['偽商品名'] || realName;
        
        // 漢方から検索
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        return realName;
    }

    /**
     * 薬情報を取得
     * @private
     */
    static _getMedicineInfo(realName, medicineData, chineseMedicineData) {
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine;
        
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        return medicine || null;
    }
}
