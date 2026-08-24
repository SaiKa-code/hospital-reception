/**
 * ReceptionSlip.js
 * 新規患者（カルテなし）用の受付票を表示する共通コンポーネント
 * 
 * 使用例:
 * import { ReceptionSlip } from './components/ReceptionSlip.js';
 * const slip = ReceptionSlip.create(scene, patient, { x: 300, y: 200, width: 500 });
 * this.add.existing(slip);
 */

export class ReceptionSlip {
    /**
     * 受付票を作成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} patient - 患者データ
     * @param {Object} options - オプション設定
     */
    static create(scene, patient, options = {}) {
        const {
            x = 0,
            y = 0,
            width = 450, // width increased to match ReceptionScene
            showTitle = true,
            title = '新規患者 受付票',
            showFooter = true,
            medicineData = [],        
            chineseMedicineData = [], 
            reservationTargetKeywords = ['糖尿病', '高血圧', '癌', 'がん', '悪性腫瘍', '心疾患', '脳卒中', '腎臓病'] 
        } = options;

        const container = scene.add.container(x, y);
        
        // --- 1. 背景 (ReceptionScene style) ---
        const paperHeight = 636;
        // ReceptionSceneでは x,y がコンテナの基準点。ここでは中心基準で描画する
        const leftX = -width / 2;
        const rightX = width / 2;
        const topY = -paperHeight / 2;
        
        // 紙
        const paper = scene.add.rectangle(0, 0, width, paperHeight, 0xFFFFFF)
            .setStrokeStyle(2, 0x555555);
        container.add(paper);

        // クリップ
        const clip = scene.add.rectangle(0, topY + 20, 180, 40, 0x444444)
            .setStrokeStyle(2, 0x000000);
        container.add(clip);

        // 日付
        const dateText = scene.add.text(width/2 - 10, topY + 50, '20XX年XX月XX日', {
            fontSize: '16px', color: '#000', fontFamily: 'Serif', resolution: 2, padding: { top: 5 }
        }).setOrigin(1, 0.5); 
        container.add(dateText);

        // --- 2. タイトル ---
        const startY = topY + 80;
        if (showTitle) {
            const titleText = scene.add.text(0, startY, title, {
                fontSize: '28px', color: '#000', fontFamily: '"Noto Sans JP"', fontStyle: 'bold',
                resolution: 2, padding: { top: 10, bottom: 10 }
            }).setOrigin(0.5);
            container.add(titleText);
        }

        const infoY = startY + 60;

        const details = patient.insuranceDetails || {};
        const triage = patient.triageData || {};
        
        // 🔍 DEBUG: ID表示ロジックの追跡
        console.log('🔷 ReceptionSlip Debug:');
        console.log('  - patient object:', patient);
        console.log('  - insuranceDetails:', details);
        console.log('  - patient.typedId:', patient.typedId);
        console.log('  - details.ID:', details['ID']);
        console.log('  - patient.id:', patient.id);

        let patientId = '----';
        
        if (patient.typedId) {
            patientId = patient.typedId;
            console.log('  ✅ Selected ID source: patient.typedId ->', patientId);
        } else if (details['ID']) {
            patientId = details['ID'];
            console.log('  ✅ Selected ID source: details.ID ->', patientId);
        } else if (patient.id && !String(patient.id).startsWith('tutorial_')) {
            patientId = patient.id;
            console.log('  ✅ Selected ID source: patient.id ->', patientId);
        } else {
             console.log('  ❌ Selected ID source: NONE (Default to ----)');
        }
        
        const patientName = patient.typedName || patient.name || '----';

        // --- ID入力エリア風表示 ---
        const idLabel = scene.add.text(-180, infoY, 'ID:', {
            fontSize: '18px', color: '#333', fontFamily: 'Arial', resolution: 2
        });
        const idValue = scene.add.text(-150, infoY, String(patientId), {
            fontSize: '20px', color: '#000', fontFamily: 'Courier', resolution: 2,
            backgroundColor: '#FFFFFF', padding: { x: 5, y: 2 }
        });
        container.add([idLabel, idValue]);

        // --- 名前入力エリア風表示 ---
        const nameLabel = scene.add.text(30, infoY, '氏名:', {
            fontSize: '18px', color: '#333', fontFamily: 'Arial', resolution: 2
        });
        const nameValue = scene.add.text(80, infoY, patientName, {
            fontSize: '20px', color: '#000', fontFamily: '"Noto Sans JP"', resolution: 2,
            backgroundColor: '#FFFFFF', padding: { x: 5, y: 2 }
        });
        container.add([nameLabel, nameValue]);

        // 区切り線
        const line1 = scene.add.line(0, 0, -200, infoY + 40, 200, infoY + 40, 0x888888).setOrigin(0);
        container.add(line1);

        // --- 3. 保険種別 (ラジオボタン風) ---
        const radioY = infoY + 80;
        container.add(scene.add.text(-180, radioY, '【保険種別】', { 
            fontSize: '18px', color: '#000', resolution: 2, padding: { top: 5 } 
        }).setOrigin(0, 0.5));

        const isMyNumber = patient.insuranceType === 'myNumber';

        // ラジオボタン描画ヘルパー
        const createRadioVisual = (rx, ry, label, isSelected) => {
            const rContainer = scene.add.container(rx, ry);
            const outer = scene.add.circle(0, 0, 10).setStrokeStyle(2, 0x000000);
            rContainer.add(outer);
            if (isSelected) {
                const inner = scene.add.circle(0, 0, 6, 0x000000);
                rContainer.add(inner);
            }
            const txt = scene.add.text(15, 0, label, { 
                fontSize: '18px', color: '#000', fontFamily: '"Noto Sans JP"', resolution: 2 
            }).setOrigin(0, 0.5);
            rContainer.add(txt);
            return rContainer;
        };

        const radioPaper = createRadioVisual(-50, radioY, '保険証', !isMyNumber);
        const radioMyna = createRadioVisual(70, radioY, 'マイナ', isMyNumber);
        container.add([radioPaper, radioMyna]);

        // --- 4. 検尿チェック (チェックボックス風) ---
        const checkY = radioY + 60;
        const needsUrine = triage['検尿'] === 'TRUE' || triage['検尿'] === '必要' || triage['検尿'] === true || patient.testNeeded === true;
        const isChecked = needsUrine; // 完了済み前提なので、必要ならチェックされているはず

        // チェックボックス描画
        const cbX = 0; 
        const cbBox = scene.add.rectangle(cbX - 80, checkY, 24, 24).setStrokeStyle(2, 0x000000);
        container.add(cbBox);
        
        if (isChecked) {
            const checkMark = scene.add.text(cbX - 80, checkY, '✔', { 
                fontSize: '28px', color: '#000', resolution: 2 
            }).setOrigin(0.5);
            container.add(checkMark);
        }
        
        container.add(scene.add.text(cbX - 60, checkY, '検尿実施済み', { 
            fontSize: '18px', color: '#000', fontFamily: '"Noto Sans JP"', resolution: 2 
        }).setOrigin(0, 0.5));

        // --- 5. 処方薬スペース ---
        const spaceStartY = checkY + 40;
        const btnY = paperHeight/2 - 60;
        const spaceHeight = btnY - spaceStartY - 50 + 40; // 少し広めに調整
        const spaceBox = scene.add.rectangle(0, spaceStartY + spaceHeight/2, width - 60, spaceHeight, 0xFFFFFF)
            .setStrokeStyle(1, 0xCCCCCC);
        container.add(spaceBox);

        container.add(scene.add.text(0, spaceStartY + 20, '【処方薬】', { 
            fontSize: '16px', color: '#AAAAAA', resolution: 2, padding: { top: 5 }
        }).setOrigin(0.5));

        // 処方薬一覧生成
        const rawPrescription = triage['処方薬'] || '';
        let rxText = ''; // ReceptionSceneでは初期はplaceholderだが、完了後は内容を表示したい
        
        if (rawPrescription) {
            const drugs = rawPrescription.split(' / ');
            const prescriptionDays = triage['処方日数'] || '';
            const days = prescriptionDays.split(' / ');
            
            const fakeNames = drugs.map((drug, index) => {
                const fakeName = ReceptionSlip._convertToFakeName(drug.trim(), medicineData, chineseMedicineData);
                const dayInfo = days[index] ? days[index].trim() : '';
                return dayInfo && dayInfo !== '0日' ? `${fakeName} (${dayInfo})` : fakeName;
            });
            rxText = '・' + fakeNames.join('\n・');
        } else {
            rxText = '(処方なし)';
        }

        container.add(scene.add.text(0, spaceStartY + spaceHeight/2 + 10, rxText, { 
            fontSize: '16px', color: '#000', resolution: 2, align: 'center',
            wordWrap: { width: width - 80 }
        }).setOrigin(0.5));

        // --- 6. 受付完了スタンプ (ReceptionSceneのボタン風) ---
        if (showFooter) {
            // ボタン風の見た目だけ再現
            const stampBg = scene.add.rectangle(0, btnY, width * 0.7, 65, 0x2ECC71) // Green color
                .setStrokeStyle(2, 0xFFFFFF);
            
            const stampText = scene.add.text(0, btnY, '✨ 受付完了', {
                fontSize: '24px', color: '#FFFFFF', fontFamily: '"Noto Sans JP"', fontStyle: 'bold'
            }).setOrigin(0.5);

            container.add([stampBg, stampText]);
        }

        // --- 予約必須スタンプ (Payment/CheckScene専用) ---
        const history = triage['既往歴'] || patient.medicalHistory || '';
        const needsReservation = reservationTargetKeywords.some(kw => history.includes(kw));

        if (needsReservation) {
             const stampX = leftX + 160; 
             const stampY = infoY + 15;
             
             // 赤い斜めスタンプ
             const stamp = scene.add.text(stampX, stampY, '【予約必須】', {
                 fontSize: '16px',
                 fontFamily: '"Noto Sans JP", sans-serif',
                 color: '#FFFFFF',
                 backgroundColor: '#D32F2F',
                 padding: { x: 8, y: 4 }
             }).setOrigin(0.5).setAngle(-15);
             
             container.add(stamp);
        }

        return container;
    }


    /**
     * 偽名変換ヘルパー (KarteDisplayから流用・簡略化)
     */
    static _convertToFakeName(realName, medicineData, chineseMedicineData) {
        if (!medicineData || !chineseMedicineData) return realName;

        // 西洋薬
        let medicine = medicineData.find(m => m['商品名'] === realName);
        if (medicine) return medicine['偽商品名'];
        
        // 漢方
        medicine = chineseMedicineData.find(m => m['商品名'] === realName);
        if (medicine) {
            const number = medicine['番号'] || '';
            const fakeManufacturer = medicine['偽メーカー'] || '';
            return `${fakeManufacturer}${number}`;
        }
        
        return realName;
    }
}
