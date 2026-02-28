// components/MedicineUtils.js
// 薬関連のユーティリティ関数

/**
 * MedicineUtils - 薬名変換・情報取得の共通ユーティリティ
 * 
 * 使用例:
 *   import { MedicineUtils } from './components/MedicineUtils.js';
 *   
 *   const fakeName = MedicineUtils.convertToFakeName('ロキソニン', medicineData, chineseMedicineData);
 *   const info = MedicineUtils.getMedicineInfo('ロキソニン', medicineData, chineseMedicineData);
 */

export class MedicineUtils {
    /**
     * 本物の薬名を偽商品名に変換（処方箋表示用）
     * @param {string} realName - 元の薬名
     * @param {Array} medicineData - 西洋薬データ
     * @param {Array} chineseMedicineData - 漢方薬データ
     * @returns {string} 偽商品名
     */
    static convertToFakeName(realName, medicineData = [], chineseMedicineData = []) {
        // 西洋薬から検索
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽商品名'] || realName;
        
        // 漢方から検索 → 偽商品名を使用（処方箋表示用）
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            // 偽商品名が存在すればそれを使用
            if (medicine['偽商品名']) {
                return medicine['偽商品名'];
            }
            // フォールバック: 番号+偽メーカー形式
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        return realName;
    }

    /**
     * 本物の薬名をカルテ形式に変換（シモムラ〇〇形式）
     * @param {string} realName - 元の薬名
     * @param {Array} medicineData - 西洋薬データ
     * @param {Array} chineseMedicineData - 漢方薬データ
     * @returns {string} カルテ用表示名
     */
    static convertToKarteFormat(realName, medicineData = [], chineseMedicineData = []) {
        // 西洋薬から検索 → 偽商品名を使用
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽商品名'] || realName;
        
        // 漢方から検索 → 番号+偽メーカー形式（カルテ表示用）
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        return realName;
    }

    /**
     * 本物の薬名を偽一般名に変換
     * @param {string} realName - 元の薬名
     * @param {Array} medicineData - 西洋薬データ
     * @param {Array} chineseMedicineData - 漢方薬データ
     * @returns {string} 偽一般名
     */
    static convertToFakeGeneralName(realName, medicineData = [], chineseMedicineData = []) {
        // 西洋薬から検索
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽一般名'] || medicine['偽商品名'] || realName;
        
        // 漢方から検索 → 偽一般名 or 偽商品名を使用
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            // 偽一般名 or 偽商品名が存在すればそれを使用、なければ番号+偽メーカー形式
            if (medicine['偽一般名']) {
                return medicine['偽一般名'];
            }
            if (medicine['偽商品名']) {
                return medicine['偽商品名'];
            }
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        return realName;
    }

    /**
     * 薬情報を取得
     * @param {string} realName - 元の薬名
     * @param {Array} medicineData - 西洋薬データ
     * @param {Array} chineseMedicineData - 漢方薬データ
     * @returns {Object|null} 薬情報オブジェクト
     */
    static getMedicineInfo(realName, medicineData = [], chineseMedicineData = []) {
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine;
        
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        return medicine || null;
    }

    /**
     * 処方内容をフォーマット
     * @param {Object} triageData - トリアージデータ
     * @param {Array} medicineData - 西洋薬データ
     * @param {Array} chineseMedicineData - 漢方薬データ
     * @returns {string} フォーマットされた処方内容
     */
    static formatPrescription(triageData, medicineData = [], chineseMedicineData = []) {
        const prescriptionStr = triageData['処方薬'] || '';
        const daysStr = triageData['処方日数'] || '';
        
        if (!prescriptionStr) return '処方なし';
        
        const drugs = prescriptionStr.split(' / ');
        const days = daysStr.split(' / ');
        
        const lines = drugs.map((drug, i) => {
            const fakeName = this.convertToFakeName(drug.trim(), medicineData, chineseMedicineData);
            const dayInfo = days[i] || '';
            const medicineInfo = this.getMedicineInfo(drug.trim(), medicineData, chineseMedicineData);
            const dosage = medicineInfo ? medicineInfo['1日の服用量'] || medicineInfo['1日の量'] || '' : '';
            const timing = medicineInfo ? medicineInfo['服用タイミング'] || medicineInfo['タイミング'] || '' : '';
            
            return `・${fakeName}\n  ${dosage} / ${dayInfo} / ${timing}`;
        });
        
        return lines.join('\n');
    }

    /**
     * 処方薬リストをパース
     * @param {Object} triageData - トリアージデータ
     * @returns {Array} 処方薬配列 [{ drug, days }]
     */
    static parsePrescription(triageData) {
        const prescriptionStr = triageData['処方薬'] || '';
        const daysStr = triageData['処方日数'] || '';
        
        if (!prescriptionStr) return [];
        
        const drugs = prescriptionStr.split(' / ');
        const days = daysStr.split(' / ');
        
        return drugs.map((drug, i) => ({
            drug: drug.trim(),
            days: days[i] || '7'
        }));
    }
}
