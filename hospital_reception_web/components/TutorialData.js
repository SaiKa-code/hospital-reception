/**
 * TutorialData.js - チュートリアル用固定データ
 * 
 * ゲーム内の実データ構造に準拠
 * - triage_data.json の主訴・処方データ
 * - Health_insurance_card.json の保険証データ
 * - mynumber.json のマイナ保険証データ
 */

export const TutorialPatients = [
    // =========================================================================
    // 患者1: 基本操作学習
    // - 紙保険証（社保）、新規（IDなし）、検尿必要、問診なし、6分待ち
    // - Check: 薬あり・ミスなし、予約不要
    // - triage_data.json No.4 ベース
    // =========================================================================
    {
        id: 'tutorial_patient_1',
        name: '菊地 修平',
        complaint: '急に強い尿意が来て、我慢できずに漏らしてしまいそうになります。',
        hiddenComplaint: '急に強い尿意が来て、我慢できずに漏らしてしまいそうになります。',
        needsQuestionnaire: false,
        testNeeded: true,           // 検尿必要
        isNewPatient: true,         // 新規患者（IDなし）
        triageReason: '頻尿・切迫感のため',
        receptionNumber: 1,
        insuranceType: 'paper',     // 紙保険証
        insuranceDetails: {
            'ID': null,             // 新規なのでIDなし
            '氏名': '菊地　修平',
            'フリガナ': 'キクチ　シュウヘイ',
            '性別': '男',
            '生年月日': 'XXXX/8/31',
            '年齢': '30',
            '保険種別': '社保',
            '負担': '3割',
            '保険者番号': '13476280',
            '記号': '9055',
            '番号': '110',
            '枝番': '0'
        },
        visualCategory: '社保',
        insuranceCategory: '社保',
        genderKey: 'man',
        processStep: 0,
        typingStep: 0,
        questionnaireCompleted: false,
        needsMedicalRecord: false,
        isRecordRetrieved: false,
        urineCheckChecked: false,
        myNumberAuthDone: false,
        medicalHistory: 'なし',
        // triage_data.json No.4
        prescription: 'ベシケア / ベオーバ',
        prescriptionDays: '28日 / 28日',
        prescriptionErrors: [],
        注射: 0,
        処置: 0,
        麻酔: 0,
        検査: 53,
        画像診断: 530,
        自費: 0,
        // CheckScene用triageData
        triageData: {
            '処方薬': 'ベシケア / ベオーバ',
            '処方日数': '28日 / 28日',
            '既往歴': 'なし',
            '注射': '0',
            '処置': '0',
            '麻酔': '0',
            '検査': '53',
            '画像診断': '530',
            '自費': '0'
        },
        currentMistakePoints: 0,
        mistakeLog: [],
        isTutorial: true,
        correctTriage: '泌尿器科',
        correctWaitTime: '約6分',
        tutorialPhase: 'basic',
        paymentRatio: 0.3
    },

    // =========================================================================
    // 患者2: 問診票・マイナカード学習
    // - マイナ保険証（社保）、新規（IDなし）、検尿不要、問診あり、2時間待ち
    // - Check: 薬あり・ミスあり、予約必要（既往歴キーワード）
    // - triage_data.json No.100 ベース（定期処方）
    // =========================================================================
    {
        id: 'tutorial_patient_2',
        name: '佐藤 太郎',
        complaint: null,            // 問診票必要なので主訴非表示
        hiddenComplaint: 'ED治療の薬が欲しいです。',
        needsQuestionnaire: true,   // 問診票あり
        testNeeded: false,          // 検尿不要
        isNewPatient: true,         // 新規患者
        triageReason: 'ED治療のため',
        receptionNumber: 22,
        insuranceType: 'myNumber',  // マイナ保険証
        // mynumber.json形式
        insuranceDetails: {
            'ID': null,             // 新規なのでIDなし
            '名前': '佐藤　太郎',
            'フリガナ': 'サトウ　タロウ',
            '性別': '男',
            '生年月日': 'XXXX/11/3',
            '年齢': '43',
            '保険区分': '社保',
            '保険者番号': '82910472',
            '負担割合': '3割'
        },
        visualCategory: '社保',
        insuranceCategory: '社保',
        genderKey: 'man',
        processStep: 0,
        typingStep: 0,
        questionnaireCompleted: false,
        needsMedicalRecord: false,
        isRecordRetrieved: false,
        urineCheckChecked: false,
        myNumberAuthDone: false,
        medicalHistory: '高血圧症',   // 予約必要キーワード
        // triage_data.json No.100
        prescription: 'アムロジン / アジルバ',
        prescriptionDays: '30日 / 30日',
        prescriptionErrors: [
            { type: 'dosage', index: 0, message: '用量が通常の2倍です' }
        ],
        注射: 0,
        処置: 0,
        麻酔: 0,
        検査: 0,
        画像診断: 0,
        自費: 0,
        // CheckScene用triageData
        triageData: {
            '処方薬': 'アムロジン / アジルバ',
            '処方日数': '30日 / 30日',
            '既往歴': '高血圧症',
            '注射': '0',
            '処置': '0',
            '麻酔': '0',
            '検査': '0',
            '画像診断': '0',
            '自費': '0'
        },
        currentMistakePoints: 0,
        mistakeLog: [],
        isTutorial: true,
        correctTriage: '泌尿器科',
        correctWaitTime: '約2時間',
        tutorialPhase: 'questionnaire',
        paymentRatio: 0.3,
        questionnaireData: {
            symptoms: 'ED治療の薬が欲しいです。',
            duration: 'ED治療',
            allergies: 'なし',
            currentMedications: 'シアリス（ED治療薬）'
        }
    },

    // =========================================================================
    // 患者3: カルテ棚・後期高齢者学習
    // - 紙保険証（国保・72歳 → 後期高齢者として処理）、再診、検尿必要、1時間待ち
    // - カルテ出しあり（Aルート）
    // - Check: 薬あり・ミスあり、予約必要
    // - triage_data.json No.2 ベース（排尿障害）
    // =========================================================================
    {
        id: 'tutorial_patient_3',
        name: '阿部 誠',
        complaint: 'おしっこの勢いが弱くて、出し切るのに時間がかかります。',
        hiddenComplaint: 'おしっこの勢いが弱くて、出し切るのに時間がかかります。',
        needsQuestionnaire: false,
        testNeeded: true,           // 検尿必要
        isNewPatient: false,        // 再診患者
        triageReason: '排尿障害のため',
        receptionNumber: 11,
        insuranceType: 'paper',     // 紙保険証
        // Health_insurance_card.json ID:1020 ベース
        insuranceDetails: {
            'ID': '1020',           // 再診なのでIDあり
            '氏名': '阿部　誠',
            'フリガナ': 'アベ　マコト',
            '性別': '男',
            '生年月日': 'XXXX/7/8',
            '年齢': '72',           // 70歳以上 → 後期高齢者処理
            '保険種別': '国保',     // 表示は国保
            '負担': '2割',
            '保険者番号': '583196',
            '記号': '5982',
            '番号': '1001',
            '枝番': '0'
        },
        visualCategory: '国保',     // 表示は国保
        insuranceCategory: '後期高齢者', // 処理は後期高齢者！
        genderKey: 'man',
        processStep: 0,
        typingStep: 0,
        questionnaireCompleted: false,
        needsMedicalRecord: true,   // カルテ必要（Aルート）！
        isRecordRetrieved: false,
        urineCheckChecked: false,
        myNumberAuthDone: false,
        medicalHistory: '糖尿病',   // 予約必要キーワード
        // triage_data.json No.2
        prescription: 'ユリーフ / ザルティア',
        prescriptionDays: '28日 / 28日',
        prescriptionErrors: [
            { type: 'drug_interaction', index: 1, message: '相互作用の可能性があります' }
        ],
        注射: 0,
        処置: 0,
        麻酔: 0,
        検査: 258,
        画像診断: 530,
        自費: 0,
        // CheckScene用triageData
        triageData: {
            '処方薬': 'ユリーフ / ザルティア',
            '処方日数': '28日 / 28日',
            '既往歴': '糖尿病',
            '注射': '0',
            '処置': '0',
            '麻酔': '0',
            '検査': '258',
            '画像診断': '530',
            '自費': '0'
        },
        currentMistakePoints: 0,
        mistakeLog: [],
        isTutorial: true,
        correctTriage: '泌尿器科',
        correctWaitTime: '約1時間',
        tutorialPhase: 'shelf',
        paymentRatio: 0.2,          // 2割負担（70歳以上）
        shelfTab: '後期高齢者',     // 国保表示だが後期高齢者タブから探す！
        shelfHint: '国保と表示されていても、70歳以上は後期高齢者タブから探す'
    }
];

/**
 * チュートリアル中の正解データ
 * 点数計算: (検査 + 画像診断 + 注射 + 処置 + 麻酔 + 自費) × 10 × 負担割合
 */
export const TutorialAnswers = {
    patient1: {
        id: null,
        name: '菊地 修平',
        triage: '泌尿器科',
        waitTime: '約6分',
        // (53+530) × 10 × 0.3 = 1749
        paymentAmount: 1749,
        needsReservation: false     // 既往歴なし
    },
    patient2: {
        id: null,
        name: '佐藤 太郎',
        triage: '泌尿器科',
        waitTime: '約2時間',
        // (1053+530+6) × 10 × 0.3 = 4767
        paymentAmount: 4767,
        needsReservation: true,     // 高血圧症 → 予約必要
        prescriptionError: true
    },
    patient3: {
        id: '1020',
        name: '阿部 誠',
        triage: '泌尿器科',
        waitTime: '約1時間',
        // (258+530) × 10 × 0.2 = 1576
        paymentAmount: 1576,
        needsReservation: true,     // 糖尿病 → 予約必要
        prescriptionError: true,
        shelfTab: '後期高齢者'
    }
};

/**
 * チュートリアル用問診票テンプレート
 */
export const TutorialQuestionnaireTemplate = {
    patient2: {
        title: '問診票',
        fields: [
            { label: '本日の症状', value: 'おしっこが真っ赤でした。痛みはありません。' },
            { label: '症状が出始めた時期', value: '今朝から' },
            { label: 'アレルギー', value: 'なし' },
            { label: '現在服用中の薬', value: 'なし' },
            { label: '過去の病歴', value: '高血圧症' }
        ],
        completionTime: 20000
    }
};
