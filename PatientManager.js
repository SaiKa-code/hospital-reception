import { ReceptionConfig } from './ReceptionConfig.js';

export class PatientManager {
    constructor(scene) {
        this.scene = scene; // Reference to the scene for accessing cache/registry, but NOT for UI manipulation
        this.patientQueue = [];
        this.completedRecordIds = [];
        this.patientHistory = [];
        this.lastFinishedNumber = 10;
        this.totalScore = 0;
        this.usedNumbers = new Set(); // 使用済み受付番号を追跡
    }

    /**
     * 重み付きランダムで受付番号を生成（若い番号ほど出やすい）
     * @returns {number|null} 受付番号 or null（全番号使用済みの場合）
     */
    _generateWeightedReceptionNumber() {
        const maxNumber = 50;  // 1〜50の範囲
        const available = [];
        
        for (let i = 1; i <= maxNumber; i++) {
            if (!this.usedNumbers.has(i)) {
                // 若い番号ほど重み付けを高くする（例：1番は99回、99番は1回リストに追加）
                const weight = Math.ceil((maxNumber - i + 1) / 10); // 重みを1/10に軽減（1番は10回、99番は1回）
                for (let w = 0; w < weight; w++) {
                    available.push(i);
                }
            }
        }
        
        if (available.length === 0) {
            console.warn('[PatientManager] 全ての受付番号が使用済みです');
            return null;
        }
        
        const selected = Phaser.Utils.Array.GetRandom(available);
        this.usedNumbers.add(selected);
        console.log(`[PatientManager] 受付番号 ${selected} を割り当て（使用済み: ${this.usedNumbers.size}個）`);
        return selected;
    }

    /**
     * Generate random patients based on game data
     * @returns {Array} List of patient data objects
     */
    generateRandomPatients(count = 10) {
        // Access raw JSON data from scene cache
        const triageData = this.scene.cache.json.get('triageData');
        const myNumberData = this.scene.cache.json.get('myNumberData');
        const paperInsuranceData = this.scene.cache.json.get('paperInsuranceData');

        if (!triageData || !myNumberData || !paperInsuranceData) {
            console.error('[PatientManager] Missing data JSONs');
            return [];
        }

        const shuffledTriage = Phaser.Utils.Array.Shuffle(triageData.slice()); 
        let myNumberPool = Phaser.Utils.Array.Shuffle(myNumberData.slice());
        let paperInsurancePool = Phaser.Utils.Array.Shuffle(paperInsuranceData.slice());
        
        // ノーマルモード: 使用済み番号をリセット
        this.usedNumbers.clear();
        
        const maxPatients = Math.min(count, shuffledTriage.length); 
        this.patientQueue = []; // Reset queue

        for (let i = 0; i < maxPatients; i++) {
            const triage = shuffledTriage[i];
            
            // Determine source data (MyNumber vs Paper)
            let insuranceType = Phaser.Math.RND.pick(['paper', 'myNumber']);
            let sourceData = null;
            if (insuranceType === 'myNumber' && myNumberPool.length > 0) {
                sourceData = myNumberPool.pop();
            } else if (paperInsurancePool.length > 0) {
                sourceData = paperInsurancePool.pop();
                insuranceType = 'paper'; 
            }
            if (!sourceData) break;

            // Construct basic info
            let insuranceDetail = { ...sourceData };
            let originalComplaint = triage["主訴"] || triage["主訴（問診表記入内容）"] || "特になし";
            let complaint = originalComplaint;
            let needsQuestionnaire = false;
            let patientID = sourceData['ID'] || sourceData['id'];

            // 1. New Patient Logic
            const isTreatAsNew = (Math.random() < 0.40);
            
            if (isTreatAsNew) {
                patientID = null; 
                insuranceDetail['ID'] = null; 
                if (Math.random() < 0.70) {
                    complaint = null;           
                    needsQuestionnaire = true;  
                }
            }

            // 2. Medical Record Logic
            let needsMedicalRecord = false;
            if (!isTreatAsNew) {
                needsMedicalRecord = (Math.random() < 0.50);
            }

            // 3. Urine Test Logic
            let rawTest = triage["検尿"]; 
            let isTestNeeded = (String(rawTest).toUpperCase() === 'TRUE');

            // Gender & Age
            let genderKey = 'man';
            let genderText = insuranceDetail['性別']; 
            if (genderText) genderKey = (genderText === '男' || genderText === '男性') ? 'man' : 'woman';
            else {
                genderKey = Phaser.Math.RND.pick(['man', 'woman']);
                insuranceDetail['性別'] = (genderKey === 'man') ? '男' : '女';
            }

            let age = 0;
            if (insuranceDetail["年齢"]) {
                const ageMatch = String(insuranceDetail["年齢"]).match(/\d+/);
                age = ageMatch ? parseInt(ageMatch[0]) : 0;
            } else {
                age = Phaser.Math.RND.integerInRange(20, 85);
                insuranceDetail["年齢"] = `${age}歳`;
            }

            let visualCategory = insuranceDetail['保険区分'] || insuranceDetail["保険種別"] || '社保';
            let logicCategory = '社保';
            if (age >= 70) logicCategory = '後期高齢者';
            else if (visualCategory.includes('国保')) logicCategory = '国保';
            insuranceDetail['保険種別'] = visualCategory;

            // Insurance Type Validation
            const hasSymbolAndNumber = (sourceData['記号'] && sourceData['番号']);
            if (hasSymbolAndNumber) {
                insuranceType = 'paper';
            } else {
                insuranceType = 'myNumber';
            }
            
            // Normalize Insurance Details
            if (!insuranceDetail['記号']) insuranceDetail['記号'] = 'XXXX';
            if (!insuranceDetail['番号']) insuranceDetail['番号'] = 'XXXX';
            if (!insuranceDetail['枝番']) insuranceDetail['枝番'] = '00';
            if (!insuranceDetail['負担割合']) insuranceDetail['負担割合'] = insuranceDetail['負担'] || '3割';

            // Final Data Structure
            const patientData = {
                id: `p_${Date.now()}_${i}`, // Internal unique ID
                name: insuranceDetail["氏名"] || insuranceDetail["名前"],
                complaint: complaint,               
                hiddenComplaint: originalComplaint, 
                needsQuestionnaire: needsQuestionnaire,
                
                testNeeded: isTestNeeded, 
                isNewPatient: isTreatAsNew,
                
                triageReason: triage["判定理由"], 
                receptionNumber: this._generateWeightedReceptionNumber(),
                insuranceType: insuranceType,
                insuranceDetails: insuranceDetail,
                visualCategory: visualCategory, 
                insuranceCategory: logicCategory, 
                genderKey: genderKey,
                
                // State Flags
                processStep: 0, 
                typingStep: 0,
                questionnaireCompleted: false, 
                needsMedicalRecord: needsMedicalRecord, 
                isRecordRetrieved: false,               
                urineCheckChecked: false,               
                myNumberAuthDone: false, 
                
                // Accounting Data (passed to next scenes)
                medicalHistory: triage["既往歴"] || "",     
                prescription: triage["処方薬"] || "",         
                prescriptionDays: triage["処方日数"] || "",   
                injectionCost: parseInt(triage["注射"]) || 0, 
                procedureCost: parseInt(triage["処置"]) || 0, 
                anesthesiaCost: parseInt(triage["麻酔"]) || 0,
                examinationCost: parseInt(triage["検査"]) || 0, 
                imagingCost: parseInt(triage["画像診断"]) || 0, 
                selfPayCost: parseInt(triage["自費"]) || 0,    
                
                // Score Data
                currentMistakePoints: 0, 
                mistakeLog: []           
            };
            
            this.patientQueue.push(patientData);
        }
        
        return this.patientQueue;
    }

    /**
     * 単一の患者を動的に生成（時間経過で追加する用）
     * @returns {Object|null} 患者データ or null（生成不可の場合）
     */
    generateSinglePatient() {
        const triageData = this.scene.cache.json.get('triageData');
        const myNumberData = this.scene.cache.json.get('myNumberData');
        const paperInsuranceData = this.scene.cache.json.get('paperInsuranceData');

        if (!triageData || !myNumberData || !paperInsuranceData) {
            console.error('[PatientManager] Missing data JSONs');
            return null;
        }

        // 未使用のトリアージデータを探す
        const usedTriageIndices = new Set(this.patientQueue.map(p => p.triageIndex));
        const availableTriage = triageData.filter((_, i) => !usedTriageIndices.has(i));
        
        if (availableTriage.length === 0) {
            console.warn('[PatientManager] 全てのトリアージデータを使用済みです');
            return null;
        }

        const receptionNumber = this._generateWeightedReceptionNumber();
        if (receptionNumber === null) {
            console.warn('[PatientManager] 受付番号が割り当てられません');
            return null;
        }

        const triage = Phaser.Utils.Array.GetRandom(availableTriage);
        const triageIndex = triageData.indexOf(triage);
        
        // 保険データを選択
        let insuranceType = Phaser.Math.RND.pick(['paper', 'myNumber']);
        let sourceData = null;
        
        if (insuranceType === 'myNumber' && myNumberData.length > 0) {
            sourceData = Phaser.Utils.Array.GetRandom(myNumberData);
        } else if (paperInsuranceData.length > 0) {
            sourceData = Phaser.Utils.Array.GetRandom(paperInsuranceData);
            insuranceType = 'paper';
        }
        
        if (!sourceData) {
            console.warn('[PatientManager] 保険データがありません');
            return null;
        }

        let insuranceDetail = { ...sourceData };
        let originalComplaint = triage["主訴"] || triage["主訴（問診表記入内容）"] || "特になし";
        let complaint = originalComplaint;
        let needsQuestionnaire = false;
        let patientID = sourceData['ID'] || sourceData['id'];

        // 新患ロジック（40%の確率）
        const isTreatAsNew = (Math.random() < 0.40);
        if (isTreatAsNew) {
            patientID = null;
            insuranceDetail['ID'] = null;
            if (Math.random() < 0.70) {
                complaint = null;
                needsQuestionnaire = true;
            }
        }

        // カルテ必要フラグ（再診の50%）
        let needsMedicalRecord = !isTreatAsNew && (Math.random() < 0.50);

        // 検尿チェック
        let rawTest = triage["検尿"];
        let isTestNeeded = (String(rawTest).toUpperCase() === 'TRUE');

        // 性別と年齢
        let genderKey = 'man';
        let genderText = insuranceDetail['性別'];
        if (genderText) {
            genderKey = (genderText === '男' || genderText === '男性') ? 'man' : 'woman';
        } else {
            genderKey = Phaser.Math.RND.pick(['man', 'woman']);
            insuranceDetail['性別'] = (genderKey === 'man') ? '男' : '女';
        }

        let age = 0;
        if (insuranceDetail["年齢"]) {
            const ageMatch = String(insuranceDetail["年齢"]).match(/\d+/);
            age = ageMatch ? parseInt(ageMatch[0]) : 0;
        } else {
            age = Phaser.Math.RND.integerInRange(20, 85);
            insuranceDetail["年齢"] = `${age}歳`;
        }

        let visualCategory = insuranceDetail['保険区分'] || insuranceDetail["保険種別"] || '社保';
        let logicCategory = '社保';
        if (age >= 70) logicCategory = '後期高齢者';
        else if (visualCategory.includes('国保')) logicCategory = '国保';
        insuranceDetail['保険種別'] = visualCategory;

        // 保険証タイプ検証
        const hasSymbolAndNumber = (sourceData['記号'] && sourceData['番号']);
        insuranceType = hasSymbolAndNumber ? 'paper' : 'myNumber';

        // 保険詳細の正規化
        if (!insuranceDetail['記号']) insuranceDetail['記号'] = 'XXXX';
        if (!insuranceDetail['番号']) insuranceDetail['番号'] = 'XXXX';
        if (!insuranceDetail['枝番']) insuranceDetail['枝番'] = '00';
        if (!insuranceDetail['負担割合']) insuranceDetail['負担割合'] = insuranceDetail['負担'] || '3割';

        const patientData = {
            id: `p_${Date.now()}_dyn`,
            name: insuranceDetail["氏名"] || insuranceDetail["名前"],
            complaint: complaint,
            hiddenComplaint: originalComplaint,
            needsQuestionnaire: needsQuestionnaire,
            testNeeded: isTestNeeded,
            isNewPatient: isTreatAsNew,
            triageReason: triage["判定理由"],
            receptionNumber: receptionNumber,
            triageIndex: triageIndex,
            insuranceType: insuranceType,
            insuranceDetails: insuranceDetail,
            visualCategory: visualCategory,
            insuranceCategory: logicCategory,
            genderKey: genderKey,
            processStep: 0,
            typingStep: 0,
            questionnaireCompleted: false,
            needsMedicalRecord: needsMedicalRecord,
            isRecordRetrieved: false,
            urineCheckChecked: false,
            myNumberAuthDone: false,
            medicalHistory: triage["既往歴"] || "",
            prescription: triage["処方薬"] || "",
            prescriptionDays: triage["処方日数"] || "",
            injectionCost: parseInt(triage["注射"]) || 0,
            procedureCost: parseInt(triage["処置"]) || 0,
            anesthesiaCost: parseInt(triage["麻酔"]) || 0,
            examinationCost: parseInt(triage["検査"]) || 0,
            imagingCost: parseInt(triage["画像診断"]) || 0,
            selfPayCost: parseInt(triage["自費"]) || 0,
            currentMistakePoints: 0,
            mistakeLog: []
        };

        console.log(`[PatientManager] 新しい患者を追加: ${patientData.name} (受付番号: ${receptionNumber})`);
        return patientData;
    }

    /**
     * Record a mistake for a patient (Pure Logic)
     */
    recordMistake(data, points, reason) {
        data.currentMistakePoints += points;
        data.mistakeLog.push({ 
            points: points, 
            reason: reason,
            isMistake: true
        });
        console.log(`[PatientManager] Mistake recorded: ${data.name} -${points} (${reason})`);
    }

    /**
     * Calculate score and rank for a completed patient
     * @returns {Object} Result object { rank, addPoint, mistakeCount }
     */
    evaluatePatient(data) {
        // 1. Logic Validation (Mistake Checks)
        this._validatePatientActions(data);

        // 2. Score Calculation
        const mistake = data.currentMistakePoints;
        let rank = 'perfect'; 
        let addPoint = 0;

        if (mistake <= 5) {
            rank = 'perfect';
            addPoint = 40;
        } else if (mistake <= 15) {
            rank = 'warning';
            addPoint = 20;
        } else {
            rank = 'bad';
            addPoint = -10;
        }

        this.totalScore += addPoint;
        
        // Save to history
        if (!this.patientHistory.includes(data)) {
            this.patientHistory.push(data);
        }

        return {
            rank: rank,
            addPoint: addPoint,
            totalMistakes: mistake,
            mistakeLog: data.mistakeLog
        };
    }

    /**
     * Internal method to check for missing stamps etc.
     */
    _validatePatientActions(data) {
        // A-Route (Medical Record)
        if (data.needsMedicalRecord) {
            if (!data.stampDate) this.recordMistake(data, 10, 'カルテ: 日付印忘れ');
            if (!data.stampInsurance) {
                this.recordMistake(data, 10, 'カルテ: 保険確認忘れ');
            } else {
                if (data.stampInsurance !== data.insuranceType) this.recordMistake(data, 10, 'カルテ: 保険種別不一致');
            }

            // Urine Test Logic
            if (data.testNeeded) {
                if (!data.stampUrine) this.recordMistake(data, 10, 'カルテ: 検尿印忘れ');
            } else if (data.playerGaveCup) {
                if (!data.stampUrine) this.recordMistake(data, 10, 'カルテ: 検尿印忘れ\n(渡したのに未記録)');
            } else {
                if (data.stampUrine) this.recordMistake(data, 10, 'カルテ: 検尿印過剰');
            }
            
            // Typing Logic
            if (data.idTypingMistakes && data.idTypingMistakes > 0) {
                this.recordMistake(data, 10, 'カルテ: ID入力ミス');
            }
            if (data.typedName) {
                if (!this._checkNameMatch(data.typedName, data)) {
                    this.recordMistake(data, 10, 'カルテ: 氏名入力ミス');
                }
            }
        } 
        // B-Route (Reception Ticket)
        else {
            if (!data.selectedInsurance) {
                this.recordMistake(data, 10, '受付票: 保険確認忘れ');
            } else {
                if (data.selectedInsurance !== data.insuranceType) this.recordMistake(data, 10, '受付票: 保険種別不一致');
            }

            // Urine Test Logic (Ticket)
            if (data.testNeeded) {
                if (!data.urineCheckChecked) this.recordMistake(data, 10, '受付票: 検尿チェック漏れ');
            } else if (data.playerGaveCup) {
                if (!data.urineCheckChecked) this.recordMistake(data, 10, '受付票: 検尿チェック漏れ\n(渡したのに未記録)');
            } else {
                if (data.urineCheckChecked) this.recordMistake(data, 10, '受付票: 検尿チェック過剰');
            }

            // Typing Logic (Ticket)
            if (data.idTypingMistakes && data.idTypingMistakes > 0) {
                this.recordMistake(data, 10, '受付票: ID入力ミス');
            }
            if (data.typedName) {
                 if (!this._checkNameMatch(data.typedName, data)) {
                    this.recordMistake(data, 10, '受付票: 氏名入力ミス');
                 }
            }
        }
    }

    _checkNameMatch(inputName, data) {
        const kanjiName = data.name || '';
        const furigana = data.insuranceDetails['フリガナ'] || data.insuranceDetails['カナ'] || '';
        const normalizedTypedName = inputName.trim().replace(/\s+/g, ' ');
        const normalizedKanjiName = kanjiName.trim().replace(/\s+/g, ' ');

        if (normalizedTypedName === normalizedKanjiName) return true;
        
        // This helper should ideally be passed in or this logic moved elsewhere if complex
        // For now, simple check is enough or we rely on the scene's helper if we kept it active
        return false; 
    }
}
