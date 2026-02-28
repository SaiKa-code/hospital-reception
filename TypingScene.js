// TypingScene.js (赤枠位置修正・名前/生年月日左寄せ版)

import { GameStateManager } from './GameStateManager.js';
import { EventBus, GameEvents } from './EventBus.js';
import { TutorialManager } from './components/TutorialManager.js';
export class TypingScene extends Phaser.Scene {
    constructor() {
        super('TypingScene');
        
        // --- 🎨 デザイン設定 ---
        this.COLOR_BG = 0xDDDDDD;         
        this.COLOR_WINDOW = 0xFFFFFF;     
        this.COLOR_HEADER = 0x2C3E50;     
        this.COLOR_FOCUS = 0xFF0000;      // 赤
        this.COLOR_CHART_FOCUS = 0x3498DB;// 青

        // 🔹 ローマ字マップ
        this.romajiMap = {
            'ア': ['A'], 'イ': ['I'], 'ウ': ['U', 'WU'], 'エ': ['E'], 'オ': ['O'],
            'カ': ['KA', 'CA'], 'キ': ['KI'], 'ク': ['KU', 'CU', 'QU'], 'ケ': ['KE'], 'コ': ['KO', 'CO'],
            'サ': ['SA'], 'シ': ['SHI', 'SI', 'CI'], 'ス': ['SU'], 'セ': ['SE'], 'ソ': ['SO'],
            'タ': ['TA'], 'チ': ['CHI', 'TI'], 'ツ': ['TSU', 'TU'], 'テ': ['TE'], 'ト': ['TO'],
            'ナ': ['NA'], 'ニ': ['NI'], 'ヌ': ['NU'], 'ネ': ['NE'], 'ノ': ['NO'],
            'ハ': ['HA'], 'ヒ': ['HI'], 'フ': ['FU', 'HU'], 'ヘ': ['HE'], 'ホ': ['HO'],
            'マ': ['MA'], 'ミ': ['MI'], 'ム': ['MU'], 'メ': ['ME'], 'モ': ['MO'],
            'ヤ': ['YA'], 'ユ': ['YU'], 'ヨ': ['YO'],
            'ラ': ['RA'], 'リ': ['RI'], 'ル': ['RU'], 'レ': ['RE'], 'ロ': ['RO'],
            'ワ': ['WA'], 'ヲ': ['WO'], 'ン': ['N', 'NN'],
            'ガ': ['GA'], 'ギ': ['GI'], 'グ': ['GU'], 'ゲ': ['GE'], 'ゴ': ['GO'],
            'ザ': ['ZA'], 'ジ': ['JI', 'ZI'], 'ズ': ['ZU'], 'ゼ': ['ZE'], 'ゾ': ['ZO'],
            'ダ': ['DA'], 'ヂ': ['JI', 'DI'], 'ヅ': ['ZU', 'DU'], 'デ': ['DE'], 'ド': ['DO'],
            'バ': ['BA'], 'ビ': ['BI'], 'ブ': ['BU'], 'ベ': ['BE'], 'ボ': ['BO'],
            'パ': ['PA'], 'ピ': ['PI'], 'プ': ['PU'], 'ペ': ['PE'], 'ポ': ['PO'],
            'ヴ': ['VU'],
            'ァ': ['LA', 'XA'], 'ィ': ['LI', 'XI'], 'ゥ': ['LU', 'XU'], 'ェ': ['LE', 'XE'], 'ォ': ['LO', 'XO'],
            'ャ': ['LYA', 'XYA'], 'ュ': ['LYU', 'XYU'], 'ョ': ['LYO', 'XYO'],
            'ッ': ['LTU', 'XTU'], 
            'ー': ['-'], ' ': [' ']
        };
        
        // 🔹 複合ローマ字マップ
        this.compoundMap = {
            'キャ': ['KYA'], 'キュ': ['KYU'], 'キョ': ['KYO'],
            'シャ': ['SYA', 'SHA'], 'シュ': ['SYU', 'SHU'], 'ショ': ['SYO', 'SHO'],
            'チャ': ['TYA', 'CHA', 'CYA'], 'チュ': ['TYU', 'CHU', 'CYU'], 'チョ': ['TYO', 'CHO', 'CYO'],
            'ニャ': ['NYA'], 'ニュ': ['NYU'], 'ニョ': ['NYO'],
            'ヒャ': ['HYA'], 'ヒュ': ['HYU'], 'ヒョ': ['HYO'],
            'ミャ': ['MYA'], 'ミュ': ['MYU'], 'ミョ': ['MYO'],
            'リャ': ['RYA'], 'リュ': ['RYU'], 'リョ': ['RYO'],
            'ギャ': ['GYA'], 'ギュ': ['GYU'], 'ギョ': ['GYO'],
            'ジャ': ['ZYA', 'JA', 'JYA'], 'ジュ': ['ZYU', 'JU', 'JYU'], 'ジョ': ['ZYO', 'JO', 'JYO'],
            'ビャ': ['BYA'], 'ビュ': ['BYU'], 'ビョ': ['BYO'],
            'ピャ': ['PYA'], 'ピュ': ['PYU'], 'ピョ': ['PYO'],
            'ティ': ['TI', 'THI'], 'ディ': ['DI', 'DHI'],
            'シェ': ['SHE', 'SYE'], 'ジェ': ['JE', 'JYE'], 'チェ': ['CHE', 'TYE'],
            'ウィ': ['WI'], 'ウェ': ['WE'],
            'ファ': ['FA'], 'フィ': ['FI'], 'フェ': ['FE'], 'フォ': ['FO'],
            'ヴァ': ['VA'], 'ヴィ': ['VI'], 'ヴェ': ['VE'], 'ヴォ': ['VO']
        };
    }

    init(data) {
        this.onComplete = data.onComplete; 
        this.patientData = data.patientData;
        this.details = this.patientData.insuranceDetails || {};
        const furigana = this.details['フリガナ'] || 'ヤマダ タロウ';

        let ageNum = (this.details['年齢'] || '').replace(/[^0-9]/g, '');
        if (!ageNum) ageNum = '30';

        // 🚨【座標再修正】名前と生年月日を左寄せ
        const rawSteps = [
            // 1行目: 記号・番号・枝番 (Y: -95)
            { key: 'symbol', label: '記号', display: this.details['記号'] || '', target: this.details['記号'] || '', type: 'typing_num', 
              pos: {x: -225, y: -95, w: 100, h: 40} }, 
            
            { key: 'number', label: '番号', display: this.details['番号'] || '', target: this.details['番号'] || '', type: 'typing_num',
              pos: {x: -45, y: -95, w: 150, h: 40} },  
            
            { key: 'branch', label: '枝番', display: this.details['枝番'] || '', target: this.details['枝番'] || '', type: 'typing_num',
              pos: {x: 175, y: -95, w: 60, h: 40} },   

            // 2行目: 氏名（漢字） (Y: -50)
            // 🆕 名前は漢字で正解扱い
            // 🚨 修正: フリガナも包含するように高さを拡張 (h:40 -> h:65)
            { key: 'name', label: '氏名', display: this.patientData.name, target: this.patientData.name, type: 'typing_romaji',
              pos: {x: -200, y: -60, w: 400, h: 65} },   
            
            // 3行目: フリガナ (Y: -15) - 名前エリアに含まれるため、個別のガイド枠は不要または位置調整
            // ここでは名前のガイド枠のみでカバーするためフリガナの枠は強調しないか、あえて残すなら位置調整
            // ユーザー要望「氏名の赤枠を大きく」に従い、name枠をメインとする。フリガナ入力時はnameの枠が光るか、
            // ステップ進行に合わせて枠が移動するか。現在の実装はステップごとにposを参照して描画。
            // したがって、フリガナ入力時も「氏名全体」を囲む同じ座標を指定すればよい。
            { key: 'furigana', label: 'フリガナ', display: furigana, target: furigana, type: 'typing_romaji',
              pos: {x: -200, y: -60, w: 400, h: 65} },   

            // 3行目: 年齢 (Y: 0)
            // 🚨 修正: xを 30 -> -180 に移動 (「生年月日(年齢)」全体を囲む)
            { key: 'age', label: '年齢', display: ageNum, target: ageNum, type: 'typing_num',
              pos: {x: -180, y: 0, w: 300, h: 40} },  
            
            // 性別 (Y: 0)
            { key: 'gender', label: '性別', display: this.details['性別'] || 'ー', type: 'select', options: ['男', '女'],
              pos: {x: 175, y: 0, w: 60, h: 40} },    

            // 4行目: 負担割合 (Y: 50)
            { key: 'burden', label: '負担割合', display: this.details['負担'] || '3割', type: 'select', options: ['1割', '2割', '3割'],
              pos: {x: 175, y: 50, w: 60, h: 40} },      

            // 5行目: 保険者番号 (Y: 70)
            { key: 'ins_num', label: '保険者番号', display: this.details['保険者番号'] || '', target: this.details['保険者番号'] || '', type: 'typing_num',
              pos: {x: -165, y: 70, w: 200, h: 30} },   

            // 保険種別 (全体)
            { key: 'type', label: '保険種別', display: this.details['保険種別'] || '社保', type: 'select', options: ['社保', '国保', '後期高齢者'],
              pos: {x: 0, y: 0, w: 600, h: 380} }, 
        ];

        this.steps = rawSteps.filter(step => {
            if ((step.type === 'typing_romaji' || step.type === 'typing_num') && (!step.target || step.target === '')) return false;
            if (step.target === '-' || step.target === 'ー') return false;
            return true;
        });
        
        // 💾 保存された入力状態があれば復元
        if (this.patientData.savedTypingState) {
            this.inputValues = { ...this.patientData.savedTypingState.inputValues };
            this.currentStepIndex = this.patientData.savedTypingState.currentStepIndex || 0;
            
            // 🆕 中断時の入力内容も復元
            this.displayedInput = this.patientData.savedTypingState.displayedInput || "";
            this.currentInput = this.patientData.savedTypingState.currentInput || "";
            this.kanaIndex = this.patientData.savedTypingState.kanaIndex || 0;
            
            console.log('[TypingScene DEBUG] init: 入力状態を復元', {
                inputValuesKeys: Object.keys(this.inputValues),
                inputValues: this.inputValues,
                currentStepIndex: this.currentStepIndex,
                displayedInput: this.displayedInput,
                currentInput: this.currentInput,
                kanaIndex: this.kanaIndex
            });
        } else {
            this.inputValues = {};
            this.currentStepIndex = this.patientData.typingStep || 0;
            this.displayedInput = "";
            this.currentInput = "";
            this.kanaIndex = 0;
            console.log('[TypingScene DEBUG] init: 新規開始 (savedTypingState なし)');
        }
        
        this.isComplete = false;
        
        // ❌ 削除: 以下の3行は復元したデータを上書きしてしまうため削除
        // this.kanaIndex = 0;      
        // this.currentInput = "";  
        // this.displayedInput = ""; 
        this.sheetTextObjects = {};
        this.penaltyScore = 0; 
    }

    create() {
        this.input.keyboard.removeAllListeners('keydown');

        // 🔹 シーン停止時にHTML入力を必ず削除 & データ保存
        this.events.on('shutdown', () => {
            this._saveTypingState(); // 💾 データ保存
            this._removeHtmlInput();
        });
        this.events.on('destroy', () => {
             // 🆕 破棄時も強制保存 (シーン切り替え等)
            this._saveTypingState();
            this._removeHtmlInput();
        });
        
        // ... (rest of create)

        this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.6).setInteractive(); 

        const winW = 1400;
        const winH = 850;
        const winX = 960;
        const winY = 540;
        
        this.add.rectangle(winX, winY, winW, winH, this.COLOR_BG).setStrokeStyle(4, 0x333333);
        
        const leftCenterX = winX - 350; 
        const rightCenterX = winX + 350; 
        const contentY = winY + 20;      

        this.add.text(winX, winY - 390, '📝 患者情報登録', {
            fontSize: '28px', color: '#333333', fontFamily: '"Noto Sans JP", sans-serif', fontStyle: 'bold'
        }).setOrigin(0.5);

        // 入力ガイド
        this.inputGuideContainer = this.add.container(winX, winY - 340); 
        const guideBg = this.add.rectangle(0, 0, 700, 50, 0x2C3E50, 0.9).setStrokeStyle(2, 0xFFFFFF);
        this.inputGuideText = this.add.text(0, 0, '', { fontSize: '24px', color: '#FFFFFF', fontFamily: '"Noto Sans JP", sans-serif' }).setOrigin(0.5);
        this.inputGuideContainer.add([guideBg, this.inputGuideText]);

        // 保険証
        this._drawInsuranceCard(leftCenterX, contentY, this.patientData);
        this.focusRect = this.add.graphics();
        this.focusRect.setDepth(20);

        // 電子カルテ
        this._drawElectronicChart(rightCenterX, contentY);
        this.chartFocusRect = this.add.graphics();
        this.chartFocusRect.setDepth(20);

        // 🆕 保存されている全フィールドの値を復元表示
        this._restoreAllFieldValues();

        this._updateFocus(); 
        this._createCursor(); // ✨ カーソル作成
        this._startStep();   

        this.input.keyboard.on('keydown', this._handleInput, this);

        const closeBtnX = winX + (winW / 2) - 40;
        const closeBtnY = winY - (winH / 2) + 40;
        const closeBtn = this.add.text(closeBtnX, closeBtnY, '✖', {
            fontSize: '40px', color: '#666666', fontFamily: 'Arial'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        closeBtn.on('pointerdown', () => {
            this._saveTypingState(); // 🆕 閉じる前にデータを保存
            this.scene.stop();
        });

        // 🔹 入力完了ボタン
        const completeBtnX = rightCenterX;
        const completeBtnY = winY + 360;
        const completeBtnBg = this.add.rectangle(completeBtnX, completeBtnY, 200, 50, 0x27AE60).setStrokeStyle(3, 0x1E8449);
        const completeBtnText = this.add.text(completeBtnX, completeBtnY, '入力完了', {
            fontSize: '24px', color: '#FFFFFF', fontFamily: '"Noto Sans JP", sans-serif', fontStyle: 'bold'
        }).setOrigin(0.5);
        completeBtnBg.setInteractive({ useHandCursor: true });
        completeBtnBg.on('pointerover', () => completeBtnBg.setFillStyle(0x2ECC71));
        completeBtnBg.on('pointerout', () => completeBtnBg.setFillStyle(0x27AE60));
        completeBtnBg.on('pointerdown', () => this._onCompleteButtonPressed());

        // 🔹 保険種別ガイド（左下、保険証の下に配置）
        this._drawInsuranceGuide(leftCenterX, winY + 280);

        this.scene.bringToTop();
    }
    
    // ==========================================================
    // 🎨 保険種別ガイド表示 (ポップ&スタイリッシュ版)
    // ==========================================================
    _drawInsuranceGuide(x, y) {
        const guideData = [
            { label: '社保', color: 0x3498DB },
            { label: '国保', color: 0xE74C3C },
            { label: '後期', color: 0x9B59B6 }
        ];
        
        const container = this.add.container(x, y);
        
        // グラデーション風の背景（固定パネルに合わせた暗い色調）
        const bgWidth = 180;
        const bgHeight = 130;
        
        // 外枠（控えめなグロー効果）
        const glow = this.add.rectangle(0, 0, bgWidth + 8, bgHeight + 8, 0x8B7355, 0.2);
        container.add(glow);
        
        // メイン背景（固定パネルに合わせた暗い色）
        const mainBg = this.add.graphics();
        mainBg.fillStyle(0x1a1a1a, 0.95);
        mainBg.fillRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 12);
        mainBg.lineStyle(2, 0x8B8B7A, 0.8);
        mainBg.strokeRoundedRect(-bgWidth/2, -bgHeight/2, bgWidth, bgHeight, 12);
        container.add(mainBg);
        
        // ヘッダーライン（控えめな色）
        const headerLine = this.add.rectangle(0, -bgHeight/2 + 28, bgWidth - 16, 2, 0x8B8B7A, 0.4);
        container.add(headerLine);
        
        // タイトル（控えめな白系）
        const title = this.add.text(0, -bgHeight/2 + 14, '🏥 保険種別', {
            fontSize: '14px',
            color: '#CCCCCC',
            fontFamily: '"Noto Sans JP", sans-serif'
        }).setOrigin(0.5);
        container.add(title);
        
        // 各保険種別（縦並び）
        guideData.forEach((item, i) => {
            const itemY = -20 + i * 35;
            
            // カラーバッジ（角丸四角）
            const badge = this.add.graphics();
            badge.fillStyle(item.color, 1);
            badge.fillRoundedRect(-70, itemY - 12, 140, 28, 6);
            badge.lineStyle(2, 0xFFFFFF, 0.7);
            badge.strokeRoundedRect(-70, itemY - 12, 140, 28, 6);
            container.add(badge);
            
            // ラベル
            const label = this.add.text(0, itemY, item.label, {
                fontSize: '18px',
                color: '#FFFFFF',
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            container.add(label);
        });
    }


    _drawElectronicChart(x, y) {
        const w = 550;
        const h = 650;
        const container = this.add.container(x, y);
        this.chartContainer = container;

        const bg = this.add.rectangle(0, 0, w, h, 0xFFFFFF).setStrokeStyle(1, 0x999999);
        const header = this.add.rectangle(0, -h/2 + 25, w, 50, this.COLOR_HEADER);
        const title = this.add.text(-w/2 + 20, -h/2 + 25, '患者情報入力 / 新規', {
            fontSize: '20px', color: '#FFFFFF', fontFamily: 'Arial'
        }).setOrigin(0, 0.5);

        container.add([bg, header, title]);

        const startY = -h/2 + 80;
        const rowHeight = 55;
        const labelX = -w/2 + 30;
        const valueX = -w/2 + 180;
        
        const labelStyle = { fontSize: '18px', color: '#333333', fontFamily: '"Noto Sans JP", sans-serif' };
        const valueStyle = { fontSize: '24px', color: '#000000', fontFamily: 'Courier', fontStyle: 'bold' }; 

        const fields = [
            { key: 'symbol', label: '記号' },
            { key: 'number', label: '番号' },
            { key: 'branch', label: '枝番' },
            { key: 'name', label: '氏名' },
            { key: 'furigana', label: 'フリガナ' },
            { key: 'age', label: '年齢' },
            { key: 'gender', label: '性別' },
            { key: 'burden', label: '負担割合' },
            { key: 'ins_num', label: '保険者番号' },
            { key: 'type', label: '保険種別' }
        ];

        // 🔹 クリックで任意のフィールドに移動するためのマッピング
        this.fieldKeyToStepIndex = {};

        fields.forEach((field, i) => {
            const currentY = startY + (i * rowHeight);
            const labelBg = this.add.rectangle(labelX + 60, currentY, 140, 40, 0xEEEEEE);
            const label = this.add.text(labelX + 10, currentY, field.label, labelStyle).setOrigin(0, 0.5);
            // 🔹 ヒットエリア拡大: 300x40 → 340x50
            const inputBg = this.add.rectangle(valueX + 150, currentY, 340, 50, 0xFFFFFF).setStrokeStyle(1, 0xCCCCCC);
            const valueText = this.add.text(valueX + 10, currentY, '', valueStyle).setOrigin(0, 0.5);
            
            // 🔹 入力フィールドをクリック可能にする
            inputBg.setInteractive({ useHandCursor: true });
            inputBg.on('pointerdown', () => {
                const stepIndex = this._getStepIndexByKey(field.key);
                if (stepIndex !== -1 && stepIndex !== this.currentStepIndex) {
                    this._goToStep(stepIndex);
                }
            });
            
            container.add([labelBg, label, inputBg, valueText]);
            this.sheetTextObjects[field.key] = valueText;
            // 🔹 inputBgの位置情報を保存（HTML入力用）
            this.fieldInputBgs = this.fieldInputBgs || {};
            this.fieldInputBgs[field.key] = inputBg;
            field.posY = currentY; 
        });
    }

    _drawInsuranceCard(x, y, data) {
        const width = 600;
        const height = 380;
        const container = this.add.container(x, y);
        this.cardContainer = container; 

        let cardColor = 0x3498DB; 
        let insurerName = '全国健康保険協会';    
        let workplaceName = '株式会社XXXXX';     
        const categoryDisplay = data.visualCategory || '';
        const details = data.insuranceDetails || {};

        if (categoryDisplay.includes('国保')) {
            cardColor = 0xE74C3C; insurerName = 'XXXX市'; workplaceName = 'XXXX市'; 
        } else if (categoryDisplay.includes('後期')) {
            cardColor = 0x9B59B6; insurerName = 'XX県後期高齢者医療広域連合'; workplaceName = ''; 
        } else {
            if (details['会社名']) workplaceName = details['会社名'];
        }

        const bg = this.add.graphics();
        bg.fillStyle(cardColor, 1); 
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        const headerBg = this.add.graphics();
        headerBg.fillStyle(0xFFFFFF, 0.4);
        headerBg.fillRect(-width/2, -height/2 + 15, width, 50); 
        container.add([bg, headerBg]);

        const fontBase = '"Noto Sans JP", sans-serif';
        const labelStyle = { fontFamily: fontBase, color: '#333333', fontSize: '18px' }; 
        const valueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '24px', fontStyle: 'bold' };
        const footerLabelStyle = { fontFamily: fontBase, color: '#333333', fontSize: '15px' };
        const footerValueStyle = { fontFamily: fontBase, color: '#000000', fontSize: '19px', fontStyle: 'bold' };
        const titleStyle = { fontFamily: fontBase, color: '#000000', fontSize: '32px', fontStyle: 'bold' };

        container.add(this.add.text(0, -height/2 + 40, '健康保険被保険者証', titleStyle).setOrigin(0.5));

        const baseX = -width/2 + 30; 
        let currentY = -90;          
        const lineHeight = 48; 

        container.add(this.add.text(baseX, currentY, '記号', labelStyle));
        container.add(this.add.text(baseX + 50, currentY - 4, details['記号'] || 'XXXX', valueStyle));
        const numX = baseX + 180; 
        container.add(this.add.text(numX, currentY, '番号', labelStyle));
        container.add(this.add.text(numX + 50, currentY - 4, details['番号'] || 'XXXX', valueStyle));
        const branchX = numX + 220;
        container.add(this.add.text(branchX, currentY, '枝番', labelStyle));
        container.add(this.add.text(branchX + 50, currentY - 4, details['枝番'] || '00', valueStyle));

        currentY += lineHeight; // -42
        const kanaVal = details['フリガナ'] || details['カナ'] || 'XXXX XXXX';
        container.add(this.add.text(baseX + 80, currentY - 18, kanaVal, { ...labelStyle, fontSize: '13px' })); 
        container.add(this.add.text(baseX, currentY, '氏名', labelStyle));
        container.add(this.add.text(baseX + 80, currentY - 6, details['氏名'] || data.name, { ...valueStyle, fontSize: '30px' }));

        currentY += lineHeight; // 6
        const dob = details['生年月日'] || 'XXXX/XX/XX';
        const age = details['年齢'] || '??歳'; 
        container.add(this.add.text(baseX, currentY, '生年月日', labelStyle));
        container.add(this.add.text(baseX + 100, currentY - 4, `${dob} (${age})`, valueStyle));
        let genderStr = details['性別'] || 'X';
        if (genderStr === 'X' && data.genderKey) genderStr = (data.genderKey === 'man') ? '男' : '女';
        container.add(this.add.text(branchX, currentY, '性別', labelStyle));
        container.add(this.add.text(branchX + 50, currentY - 4, genderStr, valueStyle));

        currentY += lineHeight; // 54
        const burdenVal = details['負担'] || '3割'; 
        container.add(this.add.text(branchX, currentY, '割合', labelStyle)); 
        container.add(this.add.text(branchX + 50, currentY - 4, burdenVal, valueStyle));

        const footerStartY = 75; 
        const footerLineH = 26;  
        let fY = footerStartY;
        container.add(this.add.text(baseX, fY, '保険者番号', footerLabelStyle));
        container.add(this.add.text(baseX + 110, fY - 2, details['保険者番号'] || 'XXXXXXXX', footerValueStyle));
        fY += footerLineH;
        container.add(this.add.text(baseX, fY, '保険者名称', footerLabelStyle));
        container.add(this.add.text(baseX + 110, fY - 2, insurerName, footerValueStyle));
        if (workplaceName) {
            fY += footerLineH;
            container.add(this.add.text(baseX, fY, '事業所名称', footerLabelStyle));
            container.add(this.add.text(baseX + 110, fY - 2, workplaceName, footerValueStyle));
        }

        const stampX = (width / 2) - 80; 
        const stampY = (height / 2) - 50; 
        const stampMark = this.add.circle(stampX, stampY, 22).setStrokeStyle(3, 0xFF0000);
        const stampChar = this.add.text(stampX, stampY, '印', { fontSize: '20px', color: '#FF0000', fontFamily: fontBase }).setOrigin(0.5);
        container.add([stampMark, stampChar]);
    }

    _updateFocus() {
        this.focusRect.clear();
        this.chartFocusRect.clear();
        
        if (this.currentStepIndex >= this.steps.length) return;
        const step = this.steps[this.currentStepIndex];

        const cardX = this.cardContainer.x;
        const cardY = this.cardContainer.y;
        this.focusRect.lineStyle(4, this.COLOR_FOCUS, 1);
        
        if (step.key === 'type') {
             this.focusRect.strokeRoundedRect(cardX - 300, cardY - 190, 600, 380, 16);
        } else {
             this.focusRect.strokeRect(cardX + step.pos.x, cardY + step.pos.y, step.pos.w, step.pos.h);
        }
        
        const chartX = this.chartContainer.x;
        const chartY = this.chartContainer.y;
        const fieldIndex = Object.keys(this.sheetTextObjects).indexOf(step.key);
        const targetY = (-650/2 + 80 + fieldIndex * 55); 
        const cy = chartY + targetY;

        this.chartFocusRect.lineStyle(3, this.COLOR_CHART_FOCUS, 1);
        this.chartFocusRect.strokeRect(chartX - 95, cy - 20, 300, 40);

        // 入力ガイド（入力時はヒントを追加）
        if (step.type === 'typing_romaji') {
            this.inputGuideText.setText(`【 ${step.label} 】を変換して入力してください`);
        } else {
            this.inputGuideText.setText(`【 ${step.label} 】を入力してください`);
        }
    }

    // ==========================================================
    // 🆕 保存された全フィールドの値をシートに復元
    // ==========================================================
    _restoreAllFieldValues() {
        if (!this.inputValues || Object.keys(this.inputValues).length === 0) {
            console.log('[TypingScene DEBUG] 復元する入力値がありません');
            return;
        }
        
        console.log('[TypingScene DEBUG] 全フィールドを復元表示:', this.inputValues);
        
        // inputValuesに保存されている全ての値をシートに表示
        for (const key in this.inputValues) {
            const value = this.inputValues[key];
            const textObj = this.sheetTextObjects[key];
            if (textObj && value) {
                textObj.setText(value);
                console.log(`[TypingScene DEBUG] フィールド復元: ${key} = ${value}`);
            }
        }
    }


    _startStep() {
        console.log('[TypingScene DEBUG] _startStep開始', {
            currentStepIndex: this.currentStepIndex,
            displayedInput: this.displayedInput,
            currentInput: this.currentInput,
            inputValuesKeys: Object.keys(this.inputValues)
        });
        
        if (this.currentStepIndex >= this.steps.length) {
            this._removeHtmlInput(); // 🔹 入力終了時にHTML入力を削除
            this._finishScene();
            return;
        }

        const step = this.steps[this.currentStepIndex];
        
        // 🔹 既存の入力値を復元（やり直し時に消えないように）
        // 🚨 修正: 復元されたデータ(displayedInput)がある場合はそれを優先する
        // (initで復元された直後の_startStep呼び出し時)
        const savedValue = this.inputValues[step.key] || '';
        
        console.log('[TypingScene DEBUG] ステップ情報', {
            stepKey: step.key,
            stepType: step.type,
            savedValue: savedValue,
            currentDisplayedInput: this.displayedInput
        });
        
        if (this.displayedInput && this.displayedInput !== savedValue) {
             // 既に復元（または入力中）のデータがある場合は上書きしない
             console.log('[TypingScene] 入力中のデータを保持します:', this.displayedInput);
        } else {
             this.displayedInput = savedValue;
             this.currentInput = "";
             this.kanaIndex = savedValue.length;
        }

        if (step.type === 'select') {
            this._removeHtmlInput(); // 🔹 選択UIの場合はHTML入力を非表示
            this._showSelectUI(step);
        } else {
            if (this.selectUIContainer) this.selectUIContainer.setVisible(false);
            // 🔹 タイピングステップの場合はHTML入力を表示
            this._createHtmlInput();
            this._positionHtmlInput(step);
            
            // 🆕 HTML入力にも値を反映（空でも必ずセット）
            if (this.htmlInput) {
                this.htmlInput.value = this.displayedInput + (this.currentInput || "");
                console.log('[TypingScene DEBUG] HTML inputに値をセット:', this.htmlInput.value);
            }
        }
        
        // 🆕 シートテキストも更新
        this._updateSheetText();
        console.log('[TypingScene DEBUG] _startStep完了', {
            displayedInput: this.displayedInput,
            htmlInputValue: this.htmlInput?.value
        });
    }

    // ==========================================================
    // 🔘 選択肢UIの表示 (サイズ・フォント調整版)
    // ==========================================================
    _showSelectUI(step) {
        if (this.selectUIContainer) this.selectUIContainer.destroy();
        
        // 青枠（入力欄）の真上に配置
        const chartX = this.chartContainer.x;
        const chartY = this.chartContainer.y;
        const fieldIndex = Object.keys(this.sheetTextObjects).indexOf(step.key);
        const fieldY = -650/2 + 80 + fieldIndex * 55;
        
        const uiX = chartX + 55; // 入力欄の中心X
        const uiY = chartY + fieldY;

        this.selectUIContainer = this.add.container(uiX, uiY); 

        // 🚨 修正: ボタン幅と間隔を広げる
        const btnW = 100; // 幅: 80 -> 120
        const btnH = 35;  // 高さ: 35 -> 50 (見切れ対策)
        const spacing = 100; // 間隔

        let btnX = -((step.options.length - 1) * spacing) / 2;
        
        step.options.forEach((opt, i) => {
            const btnBg = this.add.rectangle(btnX, 0, btnW, btnH, 0xFFFFFF).setStrokeStyle(2, 0x333333);
            
            // 🚨 修正: フォント指定とサイズ調整
            const btnText = this.add.text(btnX, 0, opt, { 
                fontSize: '20px', 
                color: '#333333',
                fontFamily: '"Noto Sans JP", sans-serif'
            }).setOrigin(0.5);
            
            btnBg.setInteractive({ useHandCursor: true });
            
            btnBg.on('pointerover', () => btnBg.setFillStyle(this.COLOR_CHART_FOCUS));
            btnBg.on('pointerout', () => btnBg.setFillStyle(0xFFFFFF));
            btnBg.on('pointerdown', () => {
                this.displayedInput = opt; 
                this._updateSheetText(true); 
                this._nextStep();
            });

            this.selectUIContainer.add([btnBg, btnText]);
            btnX += spacing;
        });
    }

    _handleInput(event) {
        if (this.isComplete) return;
        const step = this.steps[this.currentStepIndex];
        if (!step) return;

        // 🔹 矢印キーで前のステップに戻る
        if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
            this._prevStep();
            return;
        }
        
        // 🔹 矢印キーで次のステップに進む（入力があれば確定して進む）
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
            this._confirmCurrentInputAndNext();
            return;
        }

        // 🔹 Enterキーで次のステップに進む
        if (event.key === 'Enter') {
            this._confirmCurrentInputAndNext();
            return;
        }

        // selectタイプは文字入力を受け付けない（選択肢ボタンで操作）
        if (step.type === 'select') return;

        if (event.key === 'Backspace') {
            if (this.currentInput.length > 0) {
                this.currentInput = this.currentInput.slice(0, -1);
            } else if (this.displayedInput.length > 0) {
                this.displayedInput = this.displayedInput.slice(0, -1);
            }
            this._updateSheetText();
            return;
        }
        if (event.key.length !== 1) return;

        const inputChar = event.key.toUpperCase();

        // 🔹 typing_num: 自由入力モード（正誤関係なく入力可能）
        if (step.type === 'typing_num') {
            // 数字と一部記号のみ許可
            if (/[0-9\-]/.test(inputChar) || /[0-9\-]/.test(event.key)) {
                this.displayedInput += event.key;
                this._showTypingEffect(); // ✨ エフェクト
                this._updateSheetText();
            }
            return;
        }

        // typing_romaji: 従来通りのローマ字入力
        if (step.type === 'typing_romaji') {
            const targetStr = step.target; 
            if (this.kanaIndex >= targetStr.length) return;

            let { validRomajis, consumedKanaCount } = this._getValidCandidates(targetStr, this.kanaIndex);
            const nextInputBuffer = this.currentInput + inputChar;
            let isCompleteMatch = false;
            let isPartialMatch = false;
            let matchedRomaji = "";

            if (this.currentInput.length > 0) {
                 for (const romaji of validRomajis) { if (romaji.startsWith(inputChar)) { } }
            }
            for (const romaji of validRomajis) {
                if (romaji === nextInputBuffer) { isCompleteMatch = true; matchedRomaji = romaji; break; }
                if (romaji.startsWith(nextInputBuffer)) isPartialMatch = true;
            }

            if (isCompleteMatch) {
                this.displayedInput += matchedRomaji;
                this.currentInput = ""; 
                this.kanaIndex += consumedKanaCount;
                this._showTypingEffect(); // ✨ エフェクト
                this._updateSheetText();
                // 🔹 自動進行を削除（手動でEnterを押すまで待つ）
            } else if (isPartialMatch) {
                this.currentInput += inputChar;
                this._showTypingEffect(); // ✨ エフェクト
                this._updateSheetText();
            } else {
                let isResetStart = false;
                for (const romaji of validRomajis) {
                    if (romaji.startsWith(inputChar)) { isResetStart = true; break; }
                }
                if (isResetStart) {
                    this.currentInput = inputChar;
                    this._showTypingEffect(); // ✨ エフェクト
                    this._updateSheetText();
                } else {
                    this._showError();
                }
            }
        }
    }
    
    _getValidCandidates(targetStr, index) {
        let currentKana = targetStr[index];
        let nextKana = targetStr[index + 1];
        if (nextKana && ['ァ','ィ','ゥ','ェ','ォ','ャ','ュ','ョ'].includes(nextKana)) {
            const compoundKey = currentKana + nextKana;
            if (this.compoundMap[compoundKey]) return { validRomajis: this.compoundMap[compoundKey], consumedKanaCount: 2 };
        }
        if (currentKana === 'ッ') {
            let candidates = [...(this.romajiMap['ッ'] || [])];
            if (nextKana) {
                let nextCandidates = [];
                if (targetStr[index + 2] && ['ァ','ィ','ゥ','ェ','ォ','ャ','ュ','ョ'].includes(targetStr[index + 2])) {
                    nextCandidates = this.compoundMap[nextKana + targetStr[index + 2]] || [];
                } else {
                    nextCandidates = this.romajiMap[nextKana] || [];
                }
                nextCandidates.forEach(r => {
                    const firstChar = r[0];
                    if (firstChar.match(/[A-Z]/) && !['A','I','U','E','O'].includes(firstChar)) candidates.push(firstChar); 
                });
            }
            return { validRomajis: candidates, consumedKanaCount: 1 };
        }
        let candidates = this.romajiMap[currentKana];
        if (!candidates) candidates = [currentKana]; 
        return { validRomajis: candidates, consumedKanaCount: 1 };
    }

    _updateSheetText(isFinished = false) {
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        const textObj = this.sheetTextObjects[step.key];
        if (!textObj) return;

        if (isFinished) {
            // 入力完了時はカーソルなし
            this._hideCursor();
            
            const inputValue = this.displayedInput + this.currentInput;
            
            if (step.type === 'typing_romaji') {
                // 🔹 ローマ字入力の場合、正しく完了したかチェック
                const targetStr = step.target;
                // ローマ字入力が完了（全文字入力済み）かどうかをチェック
                const isRomajiComplete = (this.kanaIndex >= targetStr.length);
                
                // 🔹 直接漢字/カタカナ入力の場合もチェック
                const isDirectMatch = (inputValue === step.display) || (inputValue === step.target);
                
                if (isRomajiComplete || isDirectMatch) {
                    // 正しく入力完了した場合、正規の表示に変換
                    if (isDirectMatch && inputValue === step.display) {
                        // 漢字入力された場合はそのまま
                        textObj.setText(step.display);
                    } else if (step.key === 'name') {
                        textObj.setText(step.display); // 漢字名
                    } else {
                        textObj.setText(step.target);  // カタカナ
                    }
                    // 🆕 チェックマークは表示しない（ユーザー要望）
                    // this._showCompletionEffect(textObj);
                } else {
                    // 🔹 途中で終了した場合はそのまま表示
                    textObj.setText(inputValue);
                }
            } else {
                // 数字やselectタイプ
                textObj.setText(inputValue);
                // 🆕 チェックマークは表示しない（ユーザー要望）
                // if (inputValue.length > 0) this._showCompletionEffect(textObj);
            }
        } else {
            // 🔹 入力中はテキストを更新してカーソル位置も更新
            textObj.setText(this.displayedInput + this.currentInput);
            this._updateCursorPosition(textObj);
        }
    }

    // ==========================================================
    // ✨ 演出エフェクト関連
    // ==========================================================
    
    _createCursor() {
        // カーソル（キャレット）
        this.customCursor = this.add.rectangle(0, 0, 3, 28, this.COLOR_FOCUS).setOrigin(0.5);
        this.customCursor.setDepth(100);
        this.customCursor.setVisible(false);
        
        // 点滅アニメーション
        this.tweens.add({
            targets: this.customCursor,
            alpha: { from: 1, to: 0 },
            duration: 500,
            yoyo: true,
            repeat: -1
        });
        
        // エフェクト用コンテナ
        this.effectContainer = this.add.container(0, 0).setDepth(200);
    }
    
    _updateCursorPosition(targetTextObj) {
        if (!this.customCursor) return;
        
        // テキストオブジェクトのワールド座標を取得
        const matrix = targetTextObj.getWorldTransformMatrix();
        const x = matrix.tx;
        const y = matrix.ty;
        
        // テキストの幅を取得（表示中の文字列幅）
        const textWidth = targetTextObj.width;
        
        this.customCursor.setPosition(x + textWidth + 5, y + 2); // 少し右、少し下補正
        this.customCursor.setVisible(true);
        this.customCursor.setAlpha(1); // 入力時は即座に表示
    }
    
    _hideCursor() {
        if (this.customCursor) this.customCursor.setVisible(false);
    }

    _showTypingEffect() {
        if (!this.customCursor || !this.customCursor.visible) return;
        
        const x = this.customCursor.x;
        const y = this.customCursor.y;
        
        // 光の粒
        const particle = this.add.circle(x, y, 5, this.COLOR_FOCUS);
        this.effectContainer.add(particle);
        
        this.tweens.add({
            targets: particle,
            scale: { from: 1, to: 3 },
            alpha: { from: 0.8, to: 0 },
            duration: 300,
            onComplete: () => particle.destroy()
        });
        
        // 軽快なSE
        this.sound.play('se_typing', { volume: 0.5, detune: Math.random() * 200 - 100 });
    }
    
    _showCompletionEffect(targetTextObj) {
        const matrix = targetTextObj.getWorldTransformMatrix();
        const x = matrix.tx + targetTextObj.width + 30;
        const y = matrix.ty;
        
        // チェックマーク
        const check = this.add.text(x, y, '✅', { fontSize: '24px' }).setOrigin(0.5);
        this.effectContainer.add(check);
        check.setScale(0);
        
        // 決定音
        this.sound.play('se_memo', { volume: 0.6 });
        
        this.tweens.add({
            targets: check,
            scale: { from: 0, to: 1.5 },
            angle: { from: -45, to: 0 },
            duration: 200,
            ease: 'Back.Out',
            onComplete: () => {
                this.tweens.add({
                    targets: check,
                    scale: 1,
                    duration: 100
                });
            }
        });
        
        // 5秒後に消す（または残す）
        // this.time.delayedCall(5000, () => check.destroy());
    }

    _showError() {
        this.cameras.main.shake(50, 0.005);
        this.tweens.add({
            targets: this.chartFocusRect,
            alpha: { from: 1, to: 0 },
            duration: 100,
            yoyo: true,
            repeat: 2,
            onComplete: () => this.chartFocusRect.setAlpha(1)
        });
        
        // 🆕 コンボリセット（ミス時）
        const gameState = GameStateManager.getInstance(this.game);
        if (gameState) {
            gameState.resetCombo();
            EventBus.emit(GameEvents.COMBO_BREAK, {});
        }
    }

    _nextStep() {
        console.log('[TypingScene DEBUG] _nextStep 開始', {
            currentStepIndex: this.currentStepIndex,
            displayedInput: this.displayedInput,
            currentInput: this.currentInput,
            htmlInputValue: this.htmlInput?.value
        });
        
        // 🆕 ステップ移行中フラグ（blurイベントでの保存を抑制）
        this.isTransitioning = true;
        
        // 現在の入力を保存
        const step = this.steps[this.currentStepIndex];
        if (step) {
            const valueToSave = this.displayedInput + this.currentInput;
            this.inputValues[step.key] = valueToSave;
            console.log(`[TypingScene DEBUG] _nextStep: inputValues["${step.key}"] = "${valueToSave}"`);
        }
        
        // 🆕 次のステップに進む前に入力状態をクリア
        this.displayedInput = "";
        this.currentInput = "";
        this.kanaIndex = 0;
        console.log('[TypingScene DEBUG] _nextStep: 入力状態クリア完了');
        
        this.currentStepIndex++;

        this.patientData.typingStep = this.currentStepIndex;
        console.log(`[TypingScene DEBUG] _nextStep: currentStepIndex = ${this.currentStepIndex}`);

        if (this.currentStepIndex >= this.steps.length) {
            // 最後のステップまで来たら入力完了ボタンを待つ
            this.focusRect.clear();
            this.chartFocusRect.clear();
            if (this.selectUIContainer) this.selectUIContainer.destroy();
            this.inputGuideText.setText('【入力完了】ボタンを押してください');
            console.log('[TypingScene DEBUG] _nextStep: 全ステップ完了');
        } else {
            const nextStep = this.steps[this.currentStepIndex];
            console.log(`[TypingScene DEBUG] _nextStep: 次ステップ = ${nextStep?.key}`);
            this._updateFocus(); 
            this._startStep();
        }
        
        // 🆕 ステップ移行完了
        this.isTransitioning = false;
    }

    // 🔹 前のステップに戻る
    _prevStep() {
        if (this.currentStepIndex <= 0) return;
        
        // 🆕 ステップ移行中フラグ
        this.isTransitioning = true;
        
        // 現在の入力を保存
        const step = this.steps[this.currentStepIndex];
        if (step) {
            this.inputValues[step.key] = this.displayedInput + this.currentInput;
        }
        
        // 🆕 移動前に入力状態をクリア
        this.displayedInput = "";
        this.currentInput = "";
        this.kanaIndex = 0;
        
        this.currentStepIndex--;
        this.patientData.typingStep = this.currentStepIndex;
        this._updateFocus();
        this._startStep();
        
        // 前のステップの入力値を復元（_startStepで復元されなかった場合）
        const prevStep = this.steps[this.currentStepIndex];
        if (prevStep && this.inputValues[prevStep.key] && !this.displayedInput) {
            this.displayedInput = this.inputValues[prevStep.key];
            this.currentInput = "";
            this._updateSheetText();
            // HTML入力にも反映
            if (this.htmlInput) {
                this.htmlInput.value = this.displayedInput;
            }
        }
        
        // 🆕 ステップ移行完了
        this.isTransitioning = false;
    }

    // 🔹 任意のステップに移動
    _goToStep(targetIndex) {
        if (targetIndex < 0 || targetIndex >= this.steps.length) return;
        if (targetIndex === this.currentStepIndex) return;
        
        // 🆕 ステップ移行中フラグ
        this.isTransitioning = true;
        
        // 現在の入力を保存
        const step = this.steps[this.currentStepIndex];
        if (step) {
            this.inputValues[step.key] = this.displayedInput + this.currentInput;
        }
        
        // 🆕 移動前に入力状態をクリア
        this.displayedInput = "";
        this.currentInput = "";
        this.kanaIndex = 0;
        
        this.currentStepIndex = targetIndex;
        this.patientData.typingStep = this.currentStepIndex;
        this._updateFocus();
        this._startStep();
        
        // 目標ステップの入力値を復元（_startStepで復元されなかった場合）
        const targetStep = this.steps[this.currentStepIndex];
        if (targetStep && this.inputValues[targetStep.key] && !this.displayedInput) {
            this.displayedInput = this.inputValues[targetStep.key];
            this.currentInput = "";
            this._updateSheetText();
            // HTML入力にも反映
            if (this.htmlInput) {
                this.htmlInput.value = this.displayedInput;
            }
        }
        
        // 🆕 ステップ移行完了
        this.isTransitioning = false;
    }

    // 🔹 キーからステップインデックスを取得
    _getStepIndexByKey(key) {
        return this.steps.findIndex(step => step.key === key);
    }

    // 🔹 現在の入力を確定して次へ
    _confirmCurrentInputAndNext() {
        console.log('[TypingScene DEBUG] _confirmCurrentInputAndNext 開始', {
            currentStepIndex: this.currentStepIndex,
            displayedInput: this.displayedInput,
            currentInput: this.currentInput,
            htmlInputValue: this.htmlInput?.value
        });
        
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        
        // 入力値を保存
        this.inputValues[step.key] = this.displayedInput + this.currentInput;
        console.log(`[TypingScene DEBUG] _confirmCurrentInputAndNext: inputValues["${step.key}"] = "${this.inputValues[step.key]}"`);
        
        this._updateSheetText(true);
        this._nextStep();
    }

    // 🔹 入力完了ボタン押下時の処理
    _onCompleteButtonPressed() {
        if (this.isComplete) return;
        
        // 現在の入力を保存
        const step = this.steps[this.currentStepIndex];
        if (step) {
            this.inputValues[step.key] = this.displayedInput + this.currentInput;
            this._updateSheetText(true);
        }
        
        this._finishScene();
    }

    _finishScene() {
        this.isComplete = true;
        this.focusRect.clear();
        this.chartFocusRect.clear();
        if (this.selectUIContainer) this.selectUIContainer.destroy();
        this.inputGuideContainer.setVisible(false);

        // 🔹 正誤チェック
        let errorCount = 0;
        const errorFields = [];
        
        this.steps.forEach(step => {
            let inputValue = this.inputValues[step.key] || '';
            let expectedValue = '';
            let isMatch = false;
            
            if (step.type === 'typing_num') {
                expectedValue = String(step.target);
                // 数字入力は文字列比較（空白を除去）
                isMatch = inputValue.trim() === expectedValue.trim();
            } else if (step.type === 'typing_romaji') {
                // ローマ字入力の場合、sheetTextObjectsに表示されている最終テキストを使用
                const textObj = this.sheetTextObjects[step.key];
                const displayedText = textObj ? textObj.text.trim() : '';
                
                // 🔹 期待値: 漢字名とカタカナの両方を正解とする
                const expectedKanji = (step.display || '').trim();   // 漢字名
                const expectedKana = (step.target || '').trim();     // カタカナ
                
                // 🆕 ひらがな→カタカナ変換 + 空白除去 + 小文字化
                const hiraganaToKatakana = (str) => {
                    return str.replace(/[\u3041-\u3096]/g, (match) => {
                        return String.fromCharCode(match.charCodeAt(0) + 0x60);
                    });
                };
                const normalize = (str) => hiraganaToKatakana(str).replace(/[\s　]/g, '').toLowerCase();
                
                const normalizedDisplayed = normalize(displayedText);
                const normalizedKanji = normalize(expectedKanji);
                const normalizedKana = normalize(expectedKana);
                const normalizedInput = normalize(inputValue);
                
                // 漢字またはカタカナのいずれかと一致すれば正解
                isMatch = (normalizedDisplayed === normalizedKanji) || 
                          (normalizedDisplayed === normalizedKana) ||
                          (normalizedInput === normalizedKanji) || 
                          (normalizedInput === normalizedKana);
                
                // 🆕 デバッグログ
                console.log(`[TypingScene] 検証: key=${step.key}, displayed="${displayedText}", input="${inputValue}", kanji="${expectedKanji}", kana="${expectedKana}", match=${isMatch}`);
            } else if (step.type === 'select') {
                expectedValue = step.display;
                // 選択入力は文字列比較
                isMatch = inputValue === expectedValue;
            }
            
            // 🔹 不正解の場合（空入力も不正解とみなす）
            if (!isMatch) {
                errorCount++;
                errorFields.push(step.key);
                
                // 🆕 エラー詳細ログ
                console.log(`[TypingScene] ❌ エラー: key=${step.key}, type=${step.type}, input="${inputValue}", expected="${step.type === 'select' ? step.display : step.target}"`);
                
                // 🔹 間違えた項目を赤くハイライト
                const textObj = this.sheetTextObjects[step.key];
                if (textObj) {
                    textObj.setStyle({ color: '#E74C3C' });
                    // 空入力の場合は「未入力」と表示
                    if (inputValue === '') {
                        textObj.setText('（未入力）');
                    } else {
                        textObj.setText(inputValue);
                    }
                }
            }

        });

        // 🔹 ペナルティ計算 (最大-20点に制限)
        const rawPenalty = errorCount * -10;
        this.penaltyScore = Math.max(rawPenalty, -20);
        this.patientData.typingPenalty = this.penaltyScore;
        this.patientData.typingErrorFields = errorFields; // 🆕 エラー項目を保存

        // 🆕 入力完了時にコンボ処理
        const gameState = GameStateManager.getInstance(this.game);
        if (gameState) {
            if (errorCount === 0) {
                // 全項目正解時: 入力項目数分のコンボを一括加算
                const correctItemCount = this.steps.length;
                const comboResult = gameState.addCombo(correctItemCount);
                this.patientData.typingComboBonus = comboResult.totalBonus;
                console.log(`✅ 受付完了 - 全${correctItemCount}項目正解！ コンボ: ${comboResult.finalCount}, ボーナス: +${comboResult.totalBonus}`);
            } else {
                // エラーがある場合はコンボリセット
                gameState.resetCombo();
                EventBus.emit(GameEvents.COMBO_BREAK, {});
                this.patientData.typingComboBonus = 0;
                console.log(`⚠️ 受付完了 - ${errorCount}件のエラーあり、コンボリセット`);
            }
        }


        const cx = this.chartContainer.x;
        const cy = this.chartContainer.y;
        
        // エラーがある場合は結果を表示
        let stampText = '登録\n完了';
        let stampColor = '#27AE60';
        
        if (errorCount > 0) {
            stampText = `完了\n${this.penaltyScore}点`;
            stampColor = '#E74C3C';
        }
        
        const stamp = this.add.text(0, 0, stampText, {

             fontSize: '60px', color: stampColor, fontFamily: '"Noto Sans JP", sans-serif', fontStyle: 'bold', align: 'center'
        }).setOrigin(0.5);
        
        const border = this.add.graphics();
        border.lineStyle(10, errorCount > 0 ? 0xE74C3C : 0x27AE60, 1);
        border.strokeRect(-120, -80, 240, 160); 

        const stampContainer = this.add.container(cx, cy, [border, stamp]);
        stampContainer.setAlpha(0).setScale(2).setAngle(0);

        // 🔊 受付完了SE再生
        this.sound.play('se_reception_completed', { volume: 0.8 });
        
        this.tweens.add({
            targets: stampContainer,
            alpha: 0.9,
            scale: 1,
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
                // 🆕 チュートリアル: タイピング完了を通知（エラー情報付き）
                TutorialManager.getInstance(this.game).completeStep('TYPING_COMPLETED', {
                    errorCount: errorCount,
                    errorFields: errorFields
                });
                
                this.time.delayedCall(1200, () => {
                    this._removeHtmlInput(); // 🔹 HTML入力を削除
                    this.scene.stop(); 
                    if (this.onComplete) this.onComplete(this.penaltyScore);
                });
            }
        });
    }


    _saveTypingState() {
        if (!this.patientData) return;

        // 🆕 HTML入力がある場合は、その値を優先して取り込む
        if (this.htmlInput) {
            this._updateFromHtmlInput(this.htmlInput.value);
        }

        // 現在の入力中の内容も保存しておく
        const step = this.steps[this.currentStepIndex];
        if (step) {
            // ここではinputValuesへのコミットはせず、一時的な状態として保存
            // (次へ進む時にinputValuesへ入るが、中断時はドラフト状態)
        }

        this.patientData.savedTypingState = {
            inputValues: { ...this.inputValues },
            currentStepIndex: this.currentStepIndex,
            // 🆕 詳細な入力状態を保存
            displayedInput: this.displayedInput,
            currentInput: this.currentInput,
            kanaIndex: this.kanaIndex
        };
        console.log('[TypingScene] 入力状態を保存しました', this.patientData.savedTypingState);
    }

    // ==========================================================
    // 🔹 HTML入力要素の作成（IME対応）
    // ==========================================================
    _createHtmlInput() {
        console.log('[TypingScene DEBUG] _createHtmlInput 開始', {
            既存htmlInput: !!this.htmlInput,
            既存htmlInputValue: this.htmlInput?.value,
            displayedInput: this.displayedInput,
            currentInput: this.currentInput
        });
        
        // 既存の入力を削除
        this._removeHtmlInput();
        
        const gameContainer = document.getElementById('game-container');
        if (!gameContainer) return;
        
        this.htmlInput = document.createElement('input');
        this.htmlInput.type = 'text';
        this.htmlInput.className = 'typing-html-input';
        this.htmlInput.autocomplete = 'off';
        this.htmlInput.spellcheck = false;
        
        // 🔹 入力変更時のハンドラ
        this.htmlInput.addEventListener('input', (e) => {
            this._updateFromHtmlInput(e.target.value);
        });

        // 🆕 フォーカスが外れたら自動保存 (他画面への切り替え対策)
        // 🚨 修正: ステップ移行中は保存しない（古い値で上書きされるのを防止）
        this.htmlInput.addEventListener('blur', () => {
            if (!this.isTransitioning) {
                this._saveTypingState();
            }
        });
        
        // 🔹 Enterキーで次のフィールドへ
        this.htmlInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this._confirmCurrentInputAndNext();
            } else if (e.key === 'Tab') {
                e.preventDefault();
                if (e.shiftKey) {
                    this._prevStep();
                } else {
                    this._confirmCurrentInputAndNext();
                }
            } else if (e.key === 'Escape') {
                this._removeHtmlInput();
            }
        });
        
        gameContainer.appendChild(this.htmlInput);
    }

    // ==========================================================
    // 🔹 HTML入力要素の位置設定
    // ==========================================================
    _positionHtmlInput(step) {
        if (!this.htmlInput || !this.chartContainer) return;
        
        const canvas = this.game.canvas;
        const rect = canvas.getBoundingClientRect();
        
        // Phaserの座標をHTML座標に変換
        const scaleX = rect.width / 1920;
        const scaleY = rect.height / 1080;
        
        // chartContainerの位置を取得
        const chartX = this.chartContainer.x;
        const chartY = this.chartContainer.y;
        
        // fieldInputBgsからフィールドの位置を取得
        const inputBg = this.fieldInputBgs ? this.fieldInputBgs[step.key] : null;
        if (!inputBg) {
            this._removeHtmlInput();
            return;
        }
        
        // 入力フィールドの絶対位置を計算
        const fieldX = chartX + inputBg.x - inputBg.width / 2;
        const fieldY = chartY + inputBg.y - inputBg.height / 2;
        
        // HTML座標に変換
        const htmlX = fieldX * scaleX;
        const htmlY = fieldY * scaleY;
        const htmlWidth = inputBg.width * scaleX;
        const htmlHeight = inputBg.height * scaleY;
        
        this.htmlInput.style.left = `${htmlX}px`;
        this.htmlInput.style.top = `${htmlY}px`;
        this.htmlInput.style.width = `${htmlWidth}px`;
        this.htmlInput.style.height = `${htmlHeight}px`;
        this.htmlInput.style.fontSize = `${Math.floor(18 * scaleY)}px`;
        
        // プレースホルダー設定
        if (step.type === 'typing_num') {
            this.htmlInput.placeholder = '数字を入力...';
            this.htmlInput.inputMode = 'numeric';
        } else {
            this.htmlInput.placeholder = '日本語で入力してください';
            this.htmlInput.inputMode = 'text';
        }
        
        // 現在の入力値を設定
        this.htmlInput.value = this.displayedInput + this.currentInput;
        this.htmlInput.focus();
        this.htmlInput.select();
    }

    // ==========================================================
    // 🔹 HTML入力値の反映
    // ==========================================================
    _updateFromHtmlInput(value) {
        const step = this.steps[this.currentStepIndex];
        if (!step) return;
        
        if (step.type === 'typing_num') {
            // 数字とハイフンのみ許可
            this.displayedInput = value.replace(/[^0-9\-]/g, '');
            this.currentInput = '';
        } else if (step.type === 'typing_romaji') {
            // 日本語入力を直接受け付け
            this.displayedInput = value;
            this.currentInput = '';
            // カタカナに変換された場合、kanaIndexを更新
            this.kanaIndex = value.length;
        }
        
        this._updateSheetText();
    }

    // ==========================================================
    // 🔹 HTML入力要素の削除
    // ==========================================================
    _removeHtmlInput() {
        if (this.htmlInput) {
            this.htmlInput.remove();
            this.htmlInput = null;
        }
    }
}