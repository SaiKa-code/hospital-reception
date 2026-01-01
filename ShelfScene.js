// ShelfScene.js

import { addTransitionMethods } from './TransitionManager.js';
import { UIHeader } from './components/UIHeader.js';
import { SoundManager } from './components/SoundManager.js';
import { NavigationButton } from './components/NavigationButton.js';
import { NotificationBadge } from './components/NotificationBadge.js';
import { TutorialManager } from './components/TutorialManager.js';
const BTN_WIDTH = 550;
const BTN_HEIGHT = 65;

export class ShelfScene extends Phaser.Scene {
    constructor() {
        super('ShelfScene');
        this.masterData = [];
        this.currentCategory = '社保';
        this.tabs = [];
        this.shelfContainer = null;
        this.binderContainer = null;
    }

    init(data) {
        this.receptionScene = data.parent;
        this.queue = data.queue || [];
        this.completedIds = data.completedIds || []; 
    }

    // ==========================================================
    // 🔊 SE再生ヘルパー (SoundManager委譲)
    // ==========================================================
    _playSE(key, volumeOrConfig = 1.0) {
        SoundManager.playSE(this, key, volumeOrConfig);
    }

create() {
        // 🎬 トランジション初期化
        addTransitionMethods(this);
        
        // --- データ統合 & ソート ---
        const myNumData = this.cache.json.get('myNumberData') || [];
        const paperData = this.cache.json.get('paperInsuranceData') || [];
        
        this.masterData = [...myNumData, ...paperData].sort((a, b) => {
            const idA = parseInt(a['ID'] || a['id'] || 999999);
            const idB = parseInt(b['ID'] || b['id'] || 999999);
            return idA - idB;
        });

        // Wakeイベント
        this.events.on('wake', (sys, data) => {
            if (data) {
                if (data.queue) this.queue = data.queue; 
                if (data.completedIds) this.completedIds = data.completedIds;
            }
            this._renderBinders(this.currentCategory);
        });

        // ==========================================================
        // 🔒 固定背景・UIレイヤー (ここは動かないのでそのままでOK)
        // ==========================================================
        
        this.add.rectangle(960, 540, 1920, 1080, 0xF5F5DC).setOrigin(0.5);
        this.add.rectangle(140, 540, 280, 1080, 0xE0E0E0).setOrigin(0.5);
        this.add.line(0, 0, 280, 0, 280, 1080, 0x999999).setOrigin(0);

        const header = this._createHeader(960, 90, 'カルテ保管室', 0x5D4037, '🗄️');
        header.setDepth(200);

        // ==========================================================
        // 📜 スクロールコンテンツ (親コンテナを作成！)
        // ==========================================================
        
        // 🚨 修正: スクロール対象をまとめる親コンテナを作成
        this.scrollableContent = this.add.container(0, 0);

        // 棚とバインダーのコンテナもこれに追加するようにします
        this.shelfContainer = this.add.container(0, 0);
        this.binderContainer = this.add.container(0, 0);
        
        // 親コンテナの中に、棚とバインダーを入れる
        this.scrollableContent.add([this.shelfContainer, this.binderContainer]);

        // ==========================================================
        // 🔒 固定UIパーツ
        // ==========================================================

        this._createNavigationButtons();
        this._createSideTabs();
        
        // ==========================================================
        // 🖱️ スクロール制御 (物理移動方式に変更)
        // ==========================================================
        
        this.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            // 🚨 修正: カメラではなくコンテナのY座標を動かす
            // deltaYが正(下スクロール)なら、コンテナを上に持ち上げる(=yを減らす)
            this.scrollableContent.y -= deltaY * 1.5;
            this._clampScroll();
        });

        // スクロール範囲変数の初期化
        this.minScrollY = 0;
        
        // 初期描画
        this._renderBinders(this.currentCategory);
        
        // 🆕 チュートリアル: シーン準備完了を通知
        this.time.delayedCall(300, () => {
            TutorialManager.getInstance(this.game).notifySceneReady('ShelfScene');
        });
    }

    // ==========================================================
    // 🏥 [共通] リッチヘッダー作成メソッド（共通コンポーネント使用）
    // ==========================================================
    _createHeader(x, y, text, baseColor, iconChar) {
        return UIHeader.create(this, { x, y, text, color: baseColor, icon: iconChar });
    }


_clampScroll() {
        // 🚨 修正: コンテナのY座標を制限する
        // 初期位置: 0
        // 最下部: this.minScrollY (マイナスの値)
        // 📏 上下に200pxの余裕を追加
        
        const maxScrollY = 200; // 上方向への余裕
        if (this.scrollableContent.y > maxScrollY) {
            this.scrollableContent.y = maxScrollY;
        }
        if (this.scrollableContent.y < this.minScrollY) {
            this.scrollableContent.y = this.minScrollY;
        }
    }

    _addHoverEffect(target, scaleTo = 1.05) {
        if (!target.input) {
            target.setInteractive({ useHandCursor: true });
        } else {
            target.input.cursor = 'pointer';
        }
        target.on('pointerover', () => {
            this.tweens.add({ targets: target, scale: scaleTo, duration: 100, ease: 'Power1' });
            if (target.setAlpha) target.setAlpha(0.8); 
        });
        target.on('pointerout', () => {
            this.tweens.add({ targets: target, scale: 1.0, duration: 100, ease: 'Power1' });
            if (target.setAlpha) target.setAlpha(1.0); 
        });
    }

// ==========================================================
    // 📚 バインダー描画
    // ==========================================================
    _renderBinders(category) {
        this.binderContainer.removeAll(true);
        
        const hud = this.scene.get('HUDScene');
        const heldIdsStr = hud ? hud.heldRecords.map(id => String(id)) : [];

        let finishedIds = this.completedIds || [];
        if (finishedIds.length === 0 && this.receptionScene && this.receptionScene.completedRecordIds) {
            finishedIds = this.receptionScene.completedRecordIds;
        }

        const filtered = this.masterData.filter(d => {
            const type = d['保険種別'] || d['保険区分'] || '';
            const age = parseInt(d['年齢']) || 0;

            if (category === '社保') return !type.includes('国保') && !type.includes('後期') && age < 75;
            if (category === '国保') return type.includes('国保') && age < 75;
            if (category === '後期高齢者') return type.includes('後期') || age >= 75;
            return false;
        });

        let x = 380;
        let currentShelfY = 250; 
        const shelfGapY = 200; 
        let y = currentShelfY - 70; 
        const gapX = 50; 
        let maxRowIndex = 0;

        filtered.forEach((data) => {
            if (x > 1850) { 
                x = 380; 
                currentShelfY += shelfGapY; 
                y = currentShelfY - 70;
                maxRowIndex++;
            } 

            const rawId = data['ID'] || data['id'];
            const idStr = String(rawId);

            if (finishedIds.includes(idStr)) {
                x += gapX; 
                return;    
            }

            const isHeld = heldIdsStr.includes(idStr);

            if (isHeld) {
                const returnBtn = this.add.rectangle(x, y, 40, 140, 0x222222).setStrokeStyle(2, 0x666666);
                const returnLabel = this.add.text(x, y, '返却', { 
                    fontSize: '14px', color: '#FFFF00', fontFamily: '"Noto Sans JP"' 
                }).setOrigin(0.5).setRotation(1.57);

                this._addHoverEffect(returnBtn, 1.1);

                returnBtn.on('pointerdown', () => {
                    this._playSE('se_retrieve_or_return_chart', { volume: 0.8 }); // 🔊 返却音追加
                    if (finishedIds.includes(idStr)) return;
                    const patient = this.queue.find(p => String(p.insuranceDetails['ID'] || p.insuranceDetails['id']) === idStr);
                    if (patient && (patient.stampDate || patient.stampInsurance || patient.stampUrine)) {
                        const errorMsg = this.add.text(x, y - 100, '記入済みのため\n返却不可！', {
                            fontSize: '24px', color: '#FF0000', stroke: '#FFF', strokeThickness: 4, align: 'center', fontFamily: '"Noto Sans JP"'
                        }).setOrigin(0.5).setDepth(1000);
                        this.tweens.add({ targets: errorMsg, y: y - 150, alpha: 0, duration: 1500, ease: 'Power2', onComplete: () => errorMsg.destroy() });
                        return; 
                    }
                    if (hud) {
                        const idx = hud.heldRecords.findIndex(r => String(r) === idStr);
                        if (idx > -1) {
                            hud.heldRecords.splice(idx, 1);
                            hud._updateRecordIcon(false);
                            hud._renderRecordList();
                        }
                        this._renderBinders(this.currentCategory);
                    }
                });
                this.binderContainer.add([returnBtn, returnLabel]);

            } else {
                let binderColor = 0x3498DB; 
                const type = data['保険種別'] || data['保険区分'] || '';
                const age = parseInt(data['年齢']) || 0;
                if (type.includes('後期') || age >= 75) binderColor = 0x9B59B6;
                else if (type.includes('国保')) binderColor = 0xE74C3C;

                const binder = this.add.rectangle(x, y, 40, 140, binderColor).setStrokeStyle(2, 0x333333);
                const label = this.add.text(x, y, idStr, { fontSize: '24px', color: '#FFF', fontFamily: 'Arial' }).setOrigin(0.5).setRotation(1.57);
                this._addHoverEffect(binder, 1.1); 
                binder.on('pointerdown', () => {
                    this._playSE('se_paper', { volume: 0.8 }); // 🔊 カルテを開くSE
                    
                    // 🆕 チュートリアル: バインダー選択を通知
                    TutorialManager.getInstance(this.game).completeStep('FILE_SELECTED');
                    
                    this._openMedicalRecord(data);
                });
                
                // 🆕 チュートリアル: バインダーをボタンとして登録
                TutorialManager.getInstance(this.game).registerButton(`file_spine_${idStr}`, binder);
                
                this.binderContainer.add([binder, label]);
            }
            x += gapX;
        });

        const rowsNeeded = maxRowIndex + 1;
        this._drawShelvesDynamic(rowsNeeded);
        
        // 🚨 修正: スクロール範囲の計算
        // コンテンツの底辺位置を計算
        const contentBottom = 250 + (rowsNeeded * 200) + 100;
        
        // 画面の高さ(1080)から、どれくらいはみ出しているか
        // はみ出している分だけ、マイナス方向（上）へ動かせるようにする
        const overflow = Math.max(0, contentBottom - 1080);
        
        // 上限は0（初期位置）、下限は -overflow - 200（📏 下方向にも余裕を追加）
        this.minScrollY = -overflow - 200;

        // カメラ設定は削除
        // this.cameras.main.setBounds(...) 
        
        // 位置調整（中身が減ったときなどに空白ができないように）
        this._clampScroll();
    }
    
    // ==========================================================
    // 📝 リアルカルテ (修正版: クリック挙動の改善)
    // ==========================================================
    _openMedicalRecord(data) {
        // コンテナ作成
        const overlayContainer = this.add.container(0, 0).setDepth(2000); 
        overlayContainer.setScrollFactor(0); 

        // -----------------------------------------------------------------
        // 1. 背景 (クリックで閉じる処理)
        // -----------------------------------------------------------------
        const bg = this.add.rectangle(960, 540, 1920, 1080, 0x000000, 0.7);
        // インタラクティブを明示的に、かつ最優先で設定
        bg.setInteractive(new Phaser.Geom.Rectangle(0, 0, 1920, 1080), Phaser.Geom.Rectangle.Contains);
        
        bg.on('pointerdown', () => {
            console.log("Bg Clicked: Closing Overlay");
            this._playSE('se_paper', { volume: 0.5 }); // 🔊 閉じるSE
            overlayContainer.destroy();
            this._renderBinders(this.currentCategory); 
        });

        // -----------------------------------------------------------------
        // 2. カルテ用紙 (クリックイベントを伝播させないための防波堤)
        // -----------------------------------------------------------------
        let paperColor = 0xEBF5FB; 
        const type = data['保険種別'] || data['保険区分'] || '';
        const patientAge = parseInt(data['年齢']) || 0;
        if (type.includes('後期') || patientAge >= 75) paperColor = 0xF5EEF8; 
        else if (type.includes('国保')) paperColor = 0xFADBD8; 
        // A4アスペクト比 (210mm × 297mm = 約 1:1.414)
        const paperW = 650;
        const paperH = 920;
        
        const paper = this.add.rectangle(960, 540, paperW, paperH, paperColor)
            .setStrokeStyle(2, 0x000000)
            .setInteractive(); // インタラクティブだがコールバックなし＝ここでクリックが止まる(用紙をクリックしても閉じない)

        // -----------------------------------------------------------------
        // 3. 閉じるボタン
        // -----------------------------------------------------------------
        const startY = 540 - paperH/2 + 50;
        const btnClose = this.add.text(960 + paperW/2 - 50, startY, '✖', { fontSize: '40px', color: '#333' })
            .setOrigin(0.5)
            .setInteractive({ useHandCursor: true }); 

        this._addHoverEffect(btnClose, 1.2); 
        
        btnClose.on('pointerdown', () => {
            this._playSE('se_paper', { volume: 0.5 }); // 🔊 閉じるSE
            overlayContainer.destroy();
            this._renderBinders(this.currentCategory);
        });

        // -----------------------------------------------------------------
        // 4. データ取得 & 取り出しボタン
        // -----------------------------------------------------------------
        const rawId = data['ID'] || data['id'];
        const id = String(rawId); 
        const hud = this.scene.get('HUDScene');
        const isHeld = hud ? hud.heldRecords.map(String).includes(id) : false;

        const btnY = 540 + paperH/2 - 60;
        const btnText = isHeld ? '✅ 取得済み' : '📂 このカルテを取り出す';
        const btnColor = isHeld ? '#2ECC71' : '#3498DB'; 

        const btnSelect = this.add.text(960, btnY, btnText, {
            fontSize: '28px', color: '#FFF', backgroundColor: btnColor, padding: { x: 30, y: 15 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        // 🆕 チュートリアル: カルテを取るボタンを登録
        TutorialManager.getInstance(this.game).registerButton('take_file_button', btnSelect);

        if (isHeld) btnSelect.setAlpha(0.6); 
        else this._addHoverEffect(btnSelect, 1.05);

        btnSelect.on('pointerdown', () => {
            if (isHeld) return; 
            if (hud) {
                const success = hud.addRecord(id);
                if (success) {
                    this._playSE('se_retrieve_or_return_chart', { volume: 0.8 }); // 🔊 カルテ取得SE
                    
                    // 🆕 チュートリアル: カルテ取得を通知
                    TutorialManager.getInstance(this.game).completeStep('FILE_RETRIEVED');
                    
                    btnSelect.setText('✅ 取得しました').setBackgroundColor('#2ECC71');
                    btnSelect.disableInteractive(); 
                    
                    // GET演出 (Sceneに直接追加することで、コンテナの影響を受けないようにする)
                    // かつ、クリック判定をスルーさせる
                    const getMsg = this.add.text(960, 540, 'GET!', {
                        fontSize: '100px', color: '#FFFF00', stroke: '#000', strokeThickness: 8
                    }).setOrigin(0.5).setDepth(2001).setScrollFactor(0);
                    
                    // アニメーション
                    this.tweens.add({
                        targets: getMsg, scale: { from: 0, to: 1.5 }, alpha: { from: 1, to: 0 },
                        duration: 800, ease: 'Back.Out', onComplete: () => getMsg.destroy()
                    });
                    
                    // 裏側のバインダー表示を更新
                    this._renderBinders(this.currentCategory);
                }
            }
        });

        // -----------------------------------------------------------------
        // 5. カルテ内容描画 (様式第一号風)
        // -----------------------------------------------------------------
        const contentContainer = this.add.container(0, 0);
        const graphics = this.add.graphics();
        
        // 描画基準位置
        const leftX = 960 - paperW/2 + 60; 
        const topY = startY + 20;
        const contentW = paperW - 120; 

        // ヘッダー情報
        const formNum = this.add.text(leftX, topY, '様式第一号（一）の１', { fontSize: '14px', color: '#333', fontFamily: 'Serif' });
        const title = this.add.text(960, topY + 20, '診 療 録', {
            fontSize: '36px', color: '#000', fontFamily: 'Serif', fontStyle: 'bold'
        }).setOrigin(0.5, 0);

        // 患者情報取得
        const name = data['氏名'] || data['名前'] || '';
        const kana = data['フリガナ'] || data['カナ'] || '';
        const dob = data['生年月日'] || '----/--/--';
        const age = data['年齢'] || '';
        const gender = data['性別'] || '';
        
        // 罫線枠 (表形式)
        graphics.lineStyle(2, 0x000000, 1);
        let gridY = topY + 80;
        
        graphics.strokeRect(leftX, gridY, 150, 60); // ID枠
        graphics.strokeRect(leftX + 150, gridY, contentW - 150, 60); // 氏名枠
        
        contentContainer.add(this.add.text(leftX + 10, gridY + 5, '患者ID', { fontSize: '12px', color: '#555' }));
        contentContainer.add(this.add.text(leftX + 75, gridY + 30, id, { fontSize: '24px', color: '#000' }).setOrigin(0.5));

        contentContainer.add(this.add.text(leftX + 160, gridY + 5, kana, { fontSize: '14px', color: '#555' }));
        contentContainer.add(this.add.text(leftX + 170, gridY + 25, name, { fontSize: '32px', color: '#000', fontStyle: 'bold' }));

        gridY += 60;

        graphics.strokeRect(leftX, gridY, 300, 50); // 生年月日
        graphics.strokeRect(leftX + 300, gridY, 100, 50); // 性別
        graphics.strokeRect(leftX + 400, gridY, contentW - 400, 50); // 職業

        contentContainer.add(this.add.text(leftX + 10, gridY + 15, `生年月日: ${dob} (満${age})`, { fontSize: '18px', color: '#000' }));
        contentContainer.add(this.add.text(leftX + 350, gridY + 15, gender, { fontSize: '20px', color: '#000' }).setOrigin(0.5));
        contentContainer.add(this.add.text(leftX + 410, gridY + 5, '職業', { fontSize: '12px', color: '#555' }));

        gridY += 50;

        graphics.strokeRect(leftX, gridY, contentW, 50);
        contentContainer.add(this.add.text(leftX + 10, gridY + 5, '住所', { fontSize: '12px', color: '#555' }));

        gridY += 50;

        // 診療記録エリア
        graphics.strokeRect(leftX, gridY, 120, 30); // 日付列ヘッダー
        graphics.strokeRect(leftX + 120, gridY, contentW - 120, 30); // 記事列ヘッダー
        contentContainer.add(this.add.text(leftX + 60, gridY + 15, '年 月 日', { fontSize: '14px', color: '#000' }).setOrigin(0.5));
        contentContainer.add(this.add.text(leftX + 130, gridY + 15, '記事（経過・処方・処置）', { fontSize: '14px', color: '#000' }).setOrigin(0, 0.5));

        gridY += 30;

        const noteH = 400;
        graphics.strokeRect(leftX, gridY, 120, noteH); // 日付列
        graphics.strokeRect(leftX + 120, gridY, contentW - 120, noteH); // 記事列

        graphics.lineStyle(1, 0xCCCCCC, 1);
        for(let i = 1; i < 10; i++) {
            const lineY = gridY + (i * 40);
            graphics.beginPath();
            graphics.moveTo(leftX, lineY);
            graphics.lineTo(leftX + contentW, lineY);
            graphics.strokePath();
        }

        // 内容の表示
        const activePatient = this.queue.find(p => String(p.insuranceDetails['ID'] || p.insuranceDetails['id']) === id);
        const cc = activePatient ? (activePatient.complaint || '特になし') : '（カルテ記載なし）';
        
        // 既往歴の取得（キューにいない患者用にランダム生成も可能）
        let medHistory = 'なし';
        if (activePatient && activePatient.medicalHistory) {
            medHistory = activePatient.medicalHistory;
        } else {
            // キューにいない患者用にランダムな既往歴を生成
            const randomHistories = ['高血圧症', '糖尿病', '前立腺肥大症', '脂質異常症', 'なし', 'なし'];
            medHistory = Phaser.Utils.Array.GetRandom(randomHistories);
        }
        
        // 2024年12月以前のランダム日付を生成
        const generatePastDate = () => {
            const year = Phaser.Math.Between(2015, 2024);
            const maxMonth = (year === 2024) ? 11 : 12; // 2024年は11月まで
            const month = Phaser.Math.Between(1, maxMonth);
            const day = Phaser.Math.Between(1, 28);
            return `${year}/${month.toString().padStart(2, '0')}/${day.toString().padStart(2, '0')}`;
        };

        let noteY = gridY + 10; // 少し上に調整 (+15 -> +10)
        
        // 主訴テキスト作成
        const compText = this.add.text(leftX + 130, noteY, `【主訴】 ${cc}`, { 
            fontSize: '20px', 
            color: '#000', 
            fontStyle: 'bold',
            wordWrap: { width: contentW - 140, useAdvancedWrap: true }, // 🆕 日本語折り返し有効化
            lineSpacing: 18 // 罫線(40px)に合うように行間を調整 (20px + 18px ≈ 40px)
        });
        contentContainer.add(compText);

        // テキストの高さを取得して、次の開始位置を計算
        // 罫線1行分(40px)を最小単位として、何行分使ったか計算
        const textHeight = compText.height;
        const rowsUsed = Math.ceil(textHeight / 40); 
        const offset = Math.max(1, rowsUsed) * 40; // 最低1行分は確保

        noteY += offset; 
        
        // アレルギー
        contentContainer.add(this.add.text(leftX + 130, noteY, '【アレルギー】', { fontSize: '18px', color: '#555' })); 

        noteY += 40;
        
        // 既往歴を日付と共に表示
        const historyDate = generatePastDate();
        if (medHistory && medHistory !== 'なし') {
            contentContainer.add(this.add.text(leftX + 60, noteY + 5, historyDate, { fontSize: '14px', color: '#000' }).setOrigin(0.5));
            contentContainer.add(this.add.text(leftX + 130, noteY, `【既往歴】 ${medHistory}`, { fontSize: '18px', color: '#000' }));
        } else {
            contentContainer.add(this.add.text(leftX + 130, noteY, '【既往歴】 なし', { fontSize: '18px', color: '#555' }));
        }

        // -----------------------------------------------------------------
        // 6. コンテナへの追加 (bgを一番最初に追加して最背面に配置)
        // -----------------------------------------------------------------
        overlayContainer.add([bg, paper, graphics, formNum, title, btnClose, btnSelect, contentContainer]);
    }

    _addLabelValue(container, x, y, label, value) {
        container.add(this.add.text(x, y, `${label}:`, { fontSize: '18px', color: '#555', fontFamily: 'Arial' }));
        container.add(this.add.text(x + 100, y - 2, value, { 
            fontSize: '22px', color: '#000', fontFamily: 'Times New Roman', border: '1px solid #ccc' 
        }));
    }

    _addSection(container, x, y, title, content) {
        container.add(this.add.text(x, y, title, { fontSize: '18px', color: '#000' }));
        container.add(this.add.text(x + 20, y + 25, content, { fontSize: '20px', color: '#333' })); 
    }

    _createNavigationButtons() {
        const btnWidth = 260;
        const btnHeight = 55;
        const btnX = 150;
        
        // --- 受付へ戻るボタン ---
        const toReceptionBtn = NavigationButton.create(this, {
            x: btnX,
            y: 920,
            label: '受付へ',
            icon: '🏥',
            colorScheme: 'blue',
            width: btnWidth,
            height: btnHeight,
            arrowDirection: 'left',
            onClick: () => {
                // 🆕 チュートリアル: カルテ棚から戻る
                TutorialManager.getInstance(this.game).completeStep('SHELF_RETURNED');
                this.slideToScene('ReceptionScene', 'down');
            }
        });
        toReceptionBtn.setScrollFactor(0).setDepth(200);
        
        // 🆕 チュートリアル: 戻るボタン登録
        TutorialManager.getInstance(this.game).registerButton('back_button', toReceptionBtn);
        
        // 受付待ち人数バッジ
        this.receptionBadge = NotificationBadge.create(this, {
            x: btnX + btnWidth/2 - 5,
            y: 920 - btnHeight/2 - 5,
            colorScheme: 'red',
            depth: 201
        });
        this.receptionBadge.setScrollFactor(0);

        // --- 処方確認へ移動ボタン ---
        const toAccountingBtn = NavigationButton.create(this, {
            x: btnX,
            y: 990,
            label: '処方箋確認へ',
            icon: '📋',
            colorScheme: 'purple',
            width: btnWidth,
            height: btnHeight,
            arrowDirection: 'left',
            onClick: () => this.slideToScene('CheckScene', 'right')
        });
        toAccountingBtn.setScrollFactor(0).setDepth(200);
        
        // 会計待ち人数バッジ
        this.checkBadge = NotificationBadge.create(this, {
            x: btnX + btnWidth/2 - 5,
            y: 990 - btnHeight/2 - 5,
            colorScheme: 'red',
            depth: 201
        });
        this.checkBadge.setScrollFactor(0);
        
        // バッジ更新
        this._updateShelfBadges();
        this.time.addEvent({
            delay: 2000,
            callback: () => this._updateShelfBadges(),
            loop: true
        });
    }
    
    /**
     * ShelfSceneのナビゲーションバッジを更新
     */
    _updateShelfBadges() {
        // 受付待ち人数
        if (this.receptionBadge && this.receptionBadge.updateCount) {
            const receptionScene = this.scene.get('ReceptionScene');
            if (receptionScene && receptionScene.patientManager && receptionScene.patientManager.patientQueue) {
                const queue = receptionScene.patientManager.patientQueue;
                const waitingCount = queue.filter(p => !p.isFinished).length;
                this.receptionBadge.updateCount(waitingCount);
            }
        }
        
        // 会計待ち人数
        if (this.checkBadge && this.checkBadge.updateCount) {
            const checkQueue = this.registry.get('checkSceneAccountingQueue') || [];
            this.checkBadge.updateCount(checkQueue.length);
        }
    }

    _createPopButton(x, y, text, onClick, fixedWidth = BTN_WIDTH, textColor = '#000000', bgColor = 0xFFFFFF, strokeColor = 0x000000) {
        const container = this.add.container(x, y);
        const width = fixedWidth; const height = BTN_HEIGHT;
        const bg = this.add.graphics();
        const hitArea = new Phaser.Geom.Rectangle(-width/2, -height/2, width, height);
        
        const drawStyle = (fill, stroke) => {
            bg.clear(); bg.fillStyle(fill, 1); bg.lineStyle(4, stroke, 1);
            bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
            bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);
        };
        drawStyle(bgColor, strokeColor);

        const fontSize = (fixedWidth < 300) ? '20px' : '26px';
        const textObj = this.add.text(0, 0, text, {
            fontSize: fontSize, fontFamily: '"Noto Sans JP", sans-serif',
            color: typeof textColor === 'number' ? Phaser.Display.Color.IntegerToColor(textColor).rgba : textColor
        }).setOrigin(0.5);

        container.add([bg, textObj]);
        container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
        this._addHoverEffect(container, 1.05);
        container.on('pointerdown', () => {
            this._playSE('se_display_card', 0.5); // 🔊 汎用ボタン音
            if (onClick) onClick();
        });
        return container;
    }

    _drawShelvesDynamic(rowsNeeded) {
        this.shelfContainer.removeAll(true);
        const shelfCenterX = 1120; const shelfWidth = 1550; const startY = 250; const gapY = 200;
        const totalRows = Math.max(5, rowsNeeded);
        for (let i = 0; i < totalRows; i++) {
            const y = startY + (i * gapY);
            const shadow = this.add.rectangle(shelfCenterX, y + 10, shelfWidth, 20, 0x5D4037).setOrigin(0.5); 
            const plank = this.add.rectangle(shelfCenterX, y, shelfWidth, 20, 0x8D6E63).setOrigin(0.5);     
            this.shelfContainer.add([shadow, plank]);
        }
    }

_createSideTabs() {
        const categories = [
            { label: '社保', color: 0x3498DB },
            { label: '国保', color: 0xE74C3C },
            { label: '後期高齢者', color: 0x9B59B6 }
        ];
        
        let startY = 250; const centerX = 140; 
        this.tabs = []; 

        categories.forEach(cat => {
            const container = this.add.container(centerX, startY);
            // ... (中略: ボタン作成部分は変更なし) ...
            const bg = this.add.rectangle(0, 0, 240, 80, cat.color).setStrokeStyle(4, 0xFFFFFF);
            const text = this.add.text(0, 0, cat.label, { fontSize: '28px', color: '#FFF', fontFamily: '"Noto Sans JP"' }).setOrigin(0.5);
            container.add([bg, text]);
            
            // setScrollFactor(0) は不要になりますが、念のため残しておいても害はありません
            container.setScrollFactor(0).setDepth(200);
            const hitArea = new Phaser.Geom.Rectangle(-120, -40, 240, 80);
            container.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);
            this._addHoverEffect(container, 1.1);

            container.on('pointerdown', () => {
                this._playSE('se_scroll', { volume: 0.5 }); // 🔊 タブ切り替えSE
                this.currentCategory = cat.label;
                
                // 🆕 チュートリアル: タブ選択を通知
                TutorialManager.getInstance(this.game).completeStep('SHELF_TAB_SELECTED');
                
                // 🚨 修正: カメラではなくコンテナ位置をリセット
                // this.cameras.main.scrollY = -300; 
                this.scrollableContent.y = 0; // 最上部へ戻す
                
                this._renderBinders(this.currentCategory);
                this._updateTabStyles();
            });
            
            this.tabs.push({ label: cat.label, bg: bg, container: container, baseColor: cat.color });
            
            // 🆕 チュートリアル: タブをボタンとして登録
            const tabId = cat.label === '後期高齢者' ? 'tab_elderly' 
                        : cat.label === '社保' ? 'tab_shakai' 
                        : cat.label === '国保' ? 'tab_kokuho' : null;
            if (tabId) {
                TutorialManager.getInstance(this.game).registerButton(tabId, container);
            }
            
            startY += 120;
        });
        this._updateTabStyles();
    }

    _updateTabStyles() {
        this.tabs.forEach(tab => {
            if (tab.label === this.currentCategory) {
                tab.bg.setFillStyle(tab.baseColor);
                tab.bg.setStrokeStyle(4, 0xFFFF00);
                this.tweens.add({ targets: tab.container, x: 160, duration: 200, ease: 'Power2' });
            } else {
                tab.bg.setFillStyle(0x7F8C8D); 
                tab.bg.setStrokeStyle(2, 0xCCCCCC);
                this.tweens.add({ targets: tab.container, x: 140, duration: 200, ease: 'Power2' });
            }
        });
    }
}
