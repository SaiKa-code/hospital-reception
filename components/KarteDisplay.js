// components/KarteDisplay.js
// カルテ表示の共通コンポーネント

/**
 * KarteDisplay - カルテ（診療録）を描画する共通コンポーネント
 * 
 * 使用例:
 *   import { KarteDisplay } from './components/KarteDisplay.js';
 *   
 *   const karte = KarteDisplay.create(scene, patientData, {
 *       x: 400, y: 300,
 *       medicineData: this.medicineData,
 *       chineseMedicineData: this.chineseMedicineData
 *   });
 */

export class KarteDisplay {
    /**
     * カルテを作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} patient - 患者データ
     * @param {Object} options - オプション設定
     * @returns {Phaser.GameObjects.Container}
     */
    static create(scene, patient, options = {}) {
        const {
            x = 0,
            y = 0,
            width = 350,
            height = 500,
            depth = 10,
            medicineData = [],
            chineseMedicineData = []
        } = options;

        const container = scene.add.container(x, y).setDepth(depth);
        
        // 背景
        const bg = scene.add.graphics();
        bg.fillStyle(0xFFFFF0, 1);
        bg.lineStyle(3, 0x8B4513, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 10);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 10);
        container.add(bg);
        
        // ヘッダー
        const header = scene.add.text(0, -height/2 + 30, '📋 カルテ', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#8B4513'
        }).setOrigin(0.5);
        container.add(header);
        
        // 患者情報
        const insurance = patient.insuranceDetails || {};
        const patientInfo = scene.add.text(-width/2 + 20, -height/2 + 70, 
            `氏名: ${patient.name}\n` +
            `年齢: ${insurance['年齢'] || '??'}歳\n` +
            `保険: ${insurance['保険種別'] || '不明'}`, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            lineSpacing: 8
        });
        container.add(patientInfo);
        
        // 処方内容（偽商品名に変換）
        const triage = patient.triageData || {};
        const prescriptionText = this._formatPrescription(triage, medicineData, chineseMedicineData);
        
        const prescriptionInfo = scene.add.text(-width/2 + 20, -height/2 + 180,
            `【処方内容】\n${prescriptionText}`, {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#000000',
            lineSpacing: 6,
            wordWrap: { width: width - 40 }
        });
        container.add(prescriptionInfo);
        
        return container;
    }

    /**
     * 処方内容をフォーマット
     * @private
     */
    static _formatPrescription(triage, medicineData, chineseMedicineData) {
        const prescriptionStr = triage['処方薬'] || '';
        const daysStr = triage['処方日数'] || '';
        
        if (!prescriptionStr) return '処方なし';
        
        const drugs = prescriptionStr.split(' / ');
        const days = daysStr.split(' / ');
        
        const lines = drugs.map((drug, i) => {
            const fakeName = this._convertToFakeName(drug.trim(), medicineData, chineseMedicineData);
            const dayInfo = days[i] || '';
            const medicineInfo = this._getMedicineInfo(drug.trim(), medicineData, chineseMedicineData);
            const dosage = medicineInfo ? medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '' : '';
            const timing = medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '' : '';
            
            return `・${fakeName}\n  ${dosage} / ${dayInfo} / ${timing}`;
        });
        
        return lines.join('\n');
    }

    /**
     * 本物の薬名を偽商品名に変換
     * @private
     */
    static _convertToFakeName(realName, medicineData, chineseMedicineData) {
        // 西洋薬から検索
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽商品名'];
        
        // 漢方から検索 → 番号+偽メーカー形式で表示
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
