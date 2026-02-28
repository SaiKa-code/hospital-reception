// components/MedicineDictionary.js
// 薬辞典パネルの共通コンポーネント

/**
 * MedicineDictionary - 薬辞典パネルを表示する共通コンポーネント
 * 
 * 使用例:
 *   import { MedicineDictionary } from './components/MedicineDictionary.js';
 *   
 *   const panel = MedicineDictionary.show(scene, {
 *       medicineData: this.medicineData,
 *       chineseMedicineData: this.chineseMedicineData
 *   });
 */

export class MedicineDictionary {
    /**
     * 薬辞典パネルを表示
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Object} options - オプション
     * @returns {Phaser.GameObjects.Container} パネルコンテナ
     */
    static show(scene, options = {}) {
        const {
            medicineData = [],
            chineseMedicineData = [],
            x = null,
            y = null,
            panelW = 600,
            panelH = 750,
            depth = 2000,
            onClose = null
        } = options;

        const screenW = scene.cameras.main.width;
        const screenH = scene.cameras.main.height;
        const posX = x !== null ? x : screenW / 2;
        const posY = y !== null ? y : screenH / 2;

        // 状態をシーンに保存
        scene._medDict = {
            medicineData,
            chineseMedicineData,
            currentPage: 0,
            currentTab: 'western',
            sortedData: [],
            totalPages: 0
        };

        const container = scene.add.container(posX, posY).setDepth(depth);

        // パネル背景
        const bg = scene.add.rectangle(0, 0, panelW, panelH, 0xFFFFFF, 1)
            .setStrokeStyle(4, 0x333333)
            .setInteractive();

        // ヘッダー
        const headerH = 60;
        const headerY = -panelH/2 + headerH/2;
        const header = scene.add.rectangle(0, headerY, panelW, headerH, 0x2C3E50);

        // タイトル
        const titleBg = scene.add.rectangle(-panelW/2 + 85, headerY, 160, 40, 0x34495E)
            .setStrokeStyle(2, 0xFFFFFF);
        const title = scene.add.text(-panelW/2 + 85, headerY, '📖 薬辞典', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);

        // 閉じるボタン
        const closeBtnBg = scene.add.rectangle(panelW/2 - 25, headerY, 50, 50, 0x000000, 0)
            .setInteractive({ useHandCursor: true });
        const closeBtn = scene.add.text(panelW/2 - 25, headerY, '✕', {
            fontSize: '28px', color: '#FFFFFF'
        }).setOrigin(0.5);

        closeBtnBg.on('pointerover', () => closeBtn.setScale(1.2));
        closeBtnBg.on('pointerout', () => closeBtn.setScale(1.0));
        closeBtnBg.on('pointerdown', () => {
            this._playSE(scene, 'se_paper', 0.5);
            container.destroy();
            if (onClose) onClose();
        });
        
        // チュートリアル登録用に参照を保存
        container.closeBtnBg = closeBtnBg;

        container.add([bg, header, titleBg, title, closeBtnBg, closeBtn]);

        // タブ
        const tabW = 100;
        const tabH = 36;
        const tabY = headerY;
        const westernX = panelW/2 - 240;
        const kampoX = panelW/2 - 130;

        const westernTabBg = scene.add.rectangle(westernX, tabY, tabW, tabH, 0x3498DB)
            .setStrokeStyle(2, 0xFFFFFF)
            .setInteractive({ useHandCursor: true });
        const westernTabText = scene.add.text(westernX, tabY, '西洋薬', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#FFFFFF'
        }).setOrigin(0.5);

        const kampoTabBg = scene.add.rectangle(kampoX, tabY, tabW, tabH, 0x95A5A6)
            .setStrokeStyle(1, 0xAAAAAA)
            .setInteractive({ useHandCursor: true });
        const kampoTabText = scene.add.text(kampoX, tabY, '漢方薬', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#DDDDDD'
        }).setOrigin(0.5);

        // リストコンテナ
        const listContainer = scene.add.container(0, 0);
        container.add(listContainer);
        scene._medDict.listContainer = listContainer;

        // ページインジケーター
        const pageY = panelH/2 - 50;
        const pageIndicator = scene.add.text(0, pageY, '', {
            fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#333333'
        }).setOrigin(0.5);
        scene._medDict.pageIndicator = pageIndicator;

        const updateTabStyle = () => {
            if (scene._medDict.currentTab === 'western') {
                westernTabBg.setFillStyle(0x3498DB).setStrokeStyle(2, 0xFFFFFF);
                westernTabText.setColor('#FFFFFF');
                kampoTabBg.setFillStyle(0x95A5A6).setStrokeStyle(1, 0xAAAAAA);
                kampoTabText.setColor('#DDDDDD');

                scene._medDict.sortedData = [...medicineData].sort((a, b) => {
                    const nameA = a['偽商品名'] || a['商品名'] || '';
                    const nameB = b['偽商品名'] || b['商品名'] || '';
                    return nameA.localeCompare(nameB, 'ja');
                });
            } else {
                westernTabBg.setFillStyle(0x95A5A6).setStrokeStyle(1, 0xAAAAAA);
                westernTabText.setColor('#DDDDDD');
                kampoTabBg.setFillStyle(0x27AE60).setStrokeStyle(2, 0xFFFFFF);
                kampoTabText.setColor('#FFFFFF');

                scene._medDict.sortedData = [...chineseMedicineData].sort((a, b) => {
                    const numA = parseInt(a['番号']) || 999;
                    const numB = parseInt(b['番号']) || 999;
                    return numA - numB;
                });
            }
            scene._medDict.totalPages = Math.ceil(scene._medDict.sortedData.length / 10);
            scene._medDict.currentPage = 0;
            this._updatePage(scene, panelW, panelH);
        };

        westernTabBg.on('pointerdown', () => {
            if (scene._medDict.currentTab !== 'western') {
                this._playSE(scene, 'se_paper', 0.5);
                scene._medDict.currentTab = 'western';
                updateTabStyle();
            }
        });
        westernTabBg.on('pointerover', () => westernTabBg.setScale(1.05));
        westernTabBg.on('pointerout', () => westernTabBg.setScale(1.0));

        kampoTabBg.on('pointerdown', () => {
            if (scene._medDict.currentTab !== 'kampo') {
                this._playSE(scene, 'se_paper', 0.5);
                scene._medDict.currentTab = 'kampo';
                updateTabStyle();
            }
        });
        kampoTabBg.on('pointerover', () => kampoTabBg.setScale(1.05));
        kampoTabBg.on('pointerout', () => kampoTabBg.setScale(1.0));

        container.add([westernTabBg, westernTabText, kampoTabBg, kampoTabText]);

        // ドラッグ機能
        const dragHandle = scene.add.rectangle(0, headerY, panelW, headerH, 0x000000, 0)
            .setInteractive({ useHandCursor: true, draggable: true });
        container.add(dragHandle);

        let dragOffsetX = 0, dragOffsetY = 0;
        dragHandle.on('dragstart', (pointer) => {
            dragOffsetX = pointer.x - container.x;
            dragOffsetY = pointer.y - container.y;
        });
        dragHandle.on('drag', (pointer) => {
            container.x = pointer.x - dragOffsetX;
            container.y = pointer.y - dragOffsetY;
        });

        // ページネーションボタン
        const prev5Btn = scene.add.text(-200, pageY, '◀◀5', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#2980B9', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        prev5Btn.on('pointerdown', () => {
            this._playSE(scene, 'se_paper', 0.5);
            scene._medDict.currentPage = Math.max(0, scene._medDict.currentPage - 5);
            this._updatePage(scene, panelW, panelH);
        });
        prev5Btn.on('pointerover', () => prev5Btn.setScale(1.1));
        prev5Btn.on('pointerout', () => prev5Btn.setScale(1.0));

        const prevBtn = scene.add.text(-100, pageY, '◀前', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#3498DB', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        prevBtn.on('pointerdown', () => {
            if (scene._medDict.currentPage > 0) {
                this._playSE(scene, 'se_paper', 0.5);
                scene._medDict.currentPage--;
                this._updatePage(scene, panelW, panelH);
            }
        });
        prevBtn.on('pointerover', () => prevBtn.setScale(1.1));
        prevBtn.on('pointerout', () => prevBtn.setScale(1.0));

        const nextBtn = scene.add.text(100, pageY, '次▶', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#3498DB', padding: { x: 12, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        nextBtn.on('pointerdown', () => {
            if (scene._medDict.currentPage < scene._medDict.totalPages - 1) {
                this._playSE(scene, 'se_paper', 0.5);
                scene._medDict.currentPage++;
                this._updatePage(scene, panelW, panelH);
            }
        });
        nextBtn.on('pointerover', () => nextBtn.setScale(1.1));
        nextBtn.on('pointerout', () => nextBtn.setScale(1.0));

        const next5Btn = scene.add.text(200, pageY, '5▶▶', {
            fontSize: '20px', color: '#FFFFFF', backgroundColor: '#2980B9', padding: { x: 10, y: 6 }
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        next5Btn.on('pointerdown', () => {
            this._playSE(scene, 'se_paper', 0.5);
            scene._medDict.currentPage = Math.min(scene._medDict.totalPages - 1, scene._medDict.currentPage + 5);
            this._updatePage(scene, panelW, panelH);
        });
        next5Btn.on('pointerover', () => next5Btn.setScale(1.1));
        next5Btn.on('pointerout', () => next5Btn.setScale(1.0));

        container.add([prev5Btn, prevBtn, nextBtn, next5Btn, pageIndicator]);

        // タブを前面に
        container.bringToTop(westernTabBg);
        container.bringToTop(westernTabText);
        container.bringToTop(kampoTabBg);
        container.bringToTop(kampoTabText);
        container.bringToTop(closeBtnBg);
        container.bringToTop(closeBtn);

        // 初期表示
        updateTabStyle();

        return container;
    }

    /**
     * ページ更新
     * @private
     */
    static _updatePage(scene, panelW, panelH) {
        const dict = scene._medDict;
        if (!dict || !dict.listContainer) return;

        dict.listContainer.removeAll(true);

        const itemsPerPage = 10;
        const startIdx = dict.currentPage * itemsPerPage;
        const endIdx = Math.min(startIdx + itemsPerPage, dict.sortedData.length);
        const pageMeds = dict.sortedData.slice(startIdx, endIdx);

        const listStartY = -panelH/2 + 90;
        const cardHeight = 57;
        const cardWidth = panelW - 60;

        pageMeds.forEach((med, i) => {
            const y = listStartY + (i * cardHeight);
            const card = scene.add.container(0, y + 32);

            const bgColor = dict.currentTab === 'kampo' ? 0xE8F5E9 : 0xF8F9FA;
            const strokeColor = dict.currentTab === 'kampo' ? 0x81C784 : 0xE0E0E0;
            const cardBg = scene.add.rectangle(0, 0, cardWidth, cardHeight - 6, bgColor)
                .setStrokeStyle(2, strokeColor);

            if (dict.currentTab === 'kampo') {
                const fakeMaker = med['偽メーカー'] || '';
                const medNumber = med['番号'] || '?';
                const timing = med['服用タイミング'] || med['タイミング'] || '';
                const fakeName = med['偽商品名'] || med['商品名'] || '';

                const kampoNumText = scene.add.text(-cardWidth/2 + 15, 0, `${medNumber}.`, {
                    fontSize: '20px', color: '#333333', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(0, 0.5);

                const makerText = scene.add.text(-cardWidth/2 + 70, 0, fakeMaker, {
                    fontSize: '18px', color: '#27AE60', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(0, 0.5);

                const nameText = scene.add.text(-cardWidth/2 + 200, 0, fakeName, {
                    fontSize: '22px', fontFamily: '"Noto Sans JP", sans-serif', color: '#2C3E50'
                }).setOrigin(0, 0.5);

                const timingText = scene.add.text(cardWidth/2 - 15, 0, timing, {
                    fontSize: '16px', color: '#E67E22', fontFamily: '"Noto Sans JP", sans-serif'
                }).setOrigin(1, 0.5);

                card.add([cardBg, kampoNumText, makerText, nameText, timingText]);
            } else {
                const fakeName = med['偽商品名'] || med['商品名'] || '';
                const fakeGeneral = med['偽一般名'] || '(一般名なし)';
                const group = this._groupByGojuon(fakeName);

                const numText = scene.add.text(-cardWidth/2 + 10, -15, `${startIdx + i + 1}.`, {
                    fontSize: '12px', color: '#888888'
                });

                const gojuonLabel = scene.add.text(-cardWidth/2 + 40, -5, `【${group}】`, {
                    fontSize: '16px', fontFamily: '"Noto Sans JP", sans-serif', color: '#E74C3C'
                }).setOrigin(0, 0.5);

                const nameText = scene.add.text(-cardWidth/2 + 90, -5, fakeName, {
                    fontSize: '20px', fontFamily: '"Noto Sans JP", sans-serif', color: '#2C3E50'
                }).setOrigin(0, 0.5);

                const rightX = 50;
                const generalText = scene.add.text(rightX, -15, `一般名: ${fakeGeneral}`, {
                    fontSize: '14px', color: '#7B68EE', fontFamily: '"Noto Sans JP", sans-serif'
                });

                const indication = med['主な適応'] || '';
                const dosage = med['1日の服用量'] || '';
                const timing = med['服用タイミング'] || '';
                const detailText = scene.add.text(rightX, 5, `📋 ${indication}  💊 ${dosage} / ${timing}`, {
                    fontSize: '12px', color: '#555555'
                });

                card.add([cardBg, numText, gojuonLabel, nameText, generalText, detailText]);
            }

            dict.listContainer.add(card);
        });

        if (dict.pageIndicator) {
            dict.pageIndicator.setText(`${dict.currentPage + 1} / ${dict.totalPages} ページ`);
        }
    }

    /**
     * 50音グループ分け
     * @private
     */
    static _groupByGojuon(name) {
        if (!name) return 'その他';
        const first = name.charAt(0);
        const gojuon = [
            ['あ', 'い', 'う', 'え', 'お', 'ア', 'イ', 'ウ', 'エ', 'オ'],
            ['か', 'き', 'く', 'け', 'こ', 'が', 'ぎ', 'ぐ', 'げ', 'ご', 'カ', 'キ', 'ク', 'ケ', 'コ', 'ガ', 'ギ', 'グ', 'ゲ', 'ゴ'],
            ['さ', 'し', 'す', 'せ', 'そ', 'ざ', 'じ', 'ず', 'ぜ', 'ぞ', 'サ', 'シ', 'ス', 'セ', 'ソ', 'ザ', 'ジ', 'ズ', 'ゼ', 'ゾ'],
            ['た', 'ち', 'つ', 'て', 'と', 'だ', 'ぢ', 'づ', 'で', 'ど', 'タ', 'チ', 'ツ', 'テ', 'ト', 'ダ', 'ヂ', 'ヅ', 'デ', 'ド'],
            ['な', 'に', 'ぬ', 'ね', 'の', 'ナ', 'ニ', 'ヌ', 'ネ', 'ノ'],
            ['は', 'ひ', 'ふ', 'へ', 'ほ', 'ば', 'び', 'ぶ', 'べ', 'ぼ', 'ぱ', 'ぴ', 'ぷ', 'ぺ', 'ぽ', 'ハ', 'ヒ', 'フ', 'ヘ', 'ホ', 'バ', 'ビ', 'ブ', 'ベ', 'ボ', 'パ', 'ピ', 'プ', 'ペ', 'ポ'],
            ['ま', 'み', 'む', 'め', 'も', 'マ', 'ミ', 'ム', 'メ', 'モ'],
            ['や', 'ゆ', 'よ', 'ヤ', 'ユ', 'ヨ'],
            ['ら', 'り', 'る', 'れ', 'ろ', 'ラ', 'リ', 'ル', 'レ', 'ロ'],
            ['わ', 'を', 'ん', 'ワ', 'ヲ', 'ン']
        ];
        const labels = ['あ', 'か', 'さ', 'た', 'な', 'は', 'ま', 'や', 'ら', 'わ'];
        for (let i = 0; i < gojuon.length; i++) {
            if (gojuon[i].includes(first)) return labels[i];
        }
        return 'その他';
    }

    /**
     * SE再生ヘルパー
     * @private
     */
    static _playSE(scene, key, volume = 0.5) {
        try {
            const seVolume = scene.registry.get('seVolume') ?? 0.5;
            scene.sound.play(key, { volume: volume * seVolume });
        } catch(e) {
            // ignore
        }
    }
}
