export class HelpPopup {
    /**
     * @param {Phaser.Scene} scene 
     */
    constructor(scene) {
        this.scene = scene;
        this.isVisible = false;
        this.currentTab = 'reception'; // reception, check, accounting
        
        // スクロール関連
        this.scrollY = 0;
        this.maxScrollY = 0;
        this.viewportHeight = 380; // 表示領域の高さ

        // コンテンツデータ（詳細版）
        this.contentData = {
            reception: {
                title: '受付業務',
                content: [
                    { type: 'header', text: '業務の流れ' },
                    { type: 'text', text: '1. 患者さんが来たらクリックして呼び出す' },
                    { type: 'text', text: '2. 保険証またはマイナカードを受け取る' },
                    { type: 'text', text: '3. 症状を聞き取り、診療科を案内する' },
                    { type: 'text', text: '4. 必要であれば検尿を案内する' },
                    { type: 'text', text: '5. 受付票を発行する（再診はカルテを探す）' },

                    { type: 'header', text: '★ 保険証の確認（重要）' },
                    { type: 'text', text: '保険証の種類によって色が違います。' },
                    { type: 'list', text: '🔵 社会保険 (青): 会社員とその家族\n🔴 国民健康保険 (赤): 自営業など\n🟣 後期高齢者 (紫): 75歳以上' },
                    { type: 'note', text: '注意: 70〜74歳は国保(赤)を持っていても\n院内ルールでは「後期高齢者」扱いです！' },

                    { type: 'header', text: '★ 検尿の判断基準' },
                    { type: 'text', text: '「迷ったら検尿をお願いする」が基本です。' },
                    { type: 'text', text: '【検尿が必要な症状】' },
                    { type: 'list', text: '・泌尿器系の症状（排尿痛、血尿、頻尿）\n・腰痛（結石の疑い）\n・陰部の痛み、打撲' },
                    { type: 'text', text: '【検尿が不要な症状】' },
                    { type: 'list', text: '・ED（勃起不全）\n・男性更年期障害\n・皮膚のかゆみ' }
                ]
            },
            check: {
                title: '処方箋チェック',
                content: [
                    { type: 'header', text: '業務の流れ' },
                    { type: 'text', text: '1. 左のリストから患者を選択' },
                    { type: 'text', text: '2. 処方箋の内容に間違いがないか確認' },
                    { type: 'text', text: '3. 間違いがあれば指摘して再印刷' },
                    { type: 'text', text: '4. 正しければ印鑑を押して承認' },
                    { type: 'text', text: '5. 保険証の種類を最終確認して返却' },

                    { type: 'header', text: '★ 薬のチェックポイント' },
                    { type: 'text', text: 'カルテ（医師の指示）と処方箋を照らし合わせます。' },
                    { type: 'text', text: '右下の「薬辞典」を活用しましょう。' },
                    { type: 'list', text: '・商品名と一般名の対応は合っているか？\n・投与日数は日数の上限を超えていないか？\n・用法（1日◯回）は正しいか？' },

                    { type: 'header', text: '★ 保険証確認（CheckScene）' },
                    { type: 'text', text: '「領収証」タブで保険区分を確認できます。' },
                    { type: 'text', text: '「保険証を探す」タブで正しい保険証を選び、\n内容と一致しているか確認してください。' },
                    { type: 'note', text: 'ここでも「70歳以上は後期高齢者」ルールを\n忘れずに！' }
                ]
            },
            accounting: {
                title: '会計業務',
                content: [
                    { type: 'header', text: '業務の流れ' },
                    { type: 'text', text: '1. 領収書の「請求金額」を確認' },
                    { type: 'text', text: '2. テンキーで金額を入力' },
                    { type: 'text', text: '3. 領収書の「保険区分」を確認して選択' },
                    { type: 'text', text: '4. 次回予約が必要か判断して設定' },
                    { type: 'text', text: '5. 会計完了ボタンを押す' },

                    { type: 'header', text: '★ 次回予約のルール（重要）' },
                    { type: 'text', text: '慢性疾患の患者さんは予約が必要です。' },
                    { type: 'text', text: 'カルテの「既往歴」を確認してください。' },
                    { type: 'text', text: '【予約が必要なキーワード】' },
                    { type: 'list', text: '・糖尿病\n・高血圧\n・高コレステロール（脂質異常症）\n・癌（がん/ガン）' },
                    
                    { type: 'header', text: '★ 予約日の計算方法' },
                    { type: 'text', text: '「薬が切れる日の 7日前」に予約を取ります。' },
                    { type: 'text', text: '計算式: 処方日数 － 7日 ＝ 予約日' },
                    { type: 'list', text: '例: 28日分 → 21日後\n例: 30日分 → 23日後' },
                    { type: 'note', text: '※ 重複して一番長い日数を基準にします。\n※ 木・日・祝日は休診日なので、\n　 前後にずらして予約を取ってください。' }
                ]
            }
        };

        this.create();
    }

    create() {
        const { width, height } = this.scene.scale;
        
        // 1. オーバーレイ（クリックブロック）
        this.overlay = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.5)
            .setOrigin(0, 0)
            .setInteractive()
            .setVisible(false);
            
        this.overlay.on('pointerdown', () => this.hide());
        
        // 2. メインコンテナ
        this.container = this.scene.add.container(width / 2, height / 2);
        this.container.setDepth(2000);
        this.container.setVisible(false);

        // ウィンドウサイズ
        const winW = 800;
        const winH = 600;
        
        // 背景
        const bg = this.scene.add.graphics();
        bg.fillGradientStyle(0xF8F9FA, 0xF8F9FA, 0xE9ECEF, 0xE9ECEF, 1);
        bg.fillRoundedRect(-winW/2, -winH/2, winW, winH, 16);
        bg.lineStyle(4, 0x34495E, 1);
        bg.strokeRoundedRect(-winW/2, -winH/2, winW, winH, 16);
        
        // ヘッダー
        const headerH = 60;
        const headerBg = this.scene.add.graphics();
        headerBg.fillStyle(0x34495E, 1);
        headerBg.fillRoundedRect(-winW/2, -winH/2, winW, headerH, { tl: 16, tr: 16, bl: 0, br: 0 });
        
        const titleText = this.scene.add.text(0, -winH/2 + 30, '🏥 業務ハイパーマニュアル', {
            fontSize: '28px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontWeight: 'bold'
        }).setOrigin(0.5);

        // 閉じるボタン
        const closeBtn = this.scene.add.circle(winW/2 - 30, -winH/2 + 30, 20, 0xE74C3C)
            .setInteractive({ useHandCursor: true });
        const closeIcon = this.scene.add.text(winW/2 - 30, -winH/2 + 30, '×', {
            fontSize: '28px', color: '#FFFFFF'
        }).setOrigin(0.5);
        
        closeBtn.on('pointerdown', () => this.hide());

        // タブエリア
        this.tabsContainer = this.scene.add.container(0, -winH/2 + headerH + 30);
        this._createTabs();

        // -------------------------------------------------
        // スクロールエリアのセットアップ
        // -------------------------------------------------
        const contentY = -winH/2 + headerH + 70; // コンテンツ開始Y位置
        this.viewportHeight = 440; // 表示領域高さ
        
        // マスク用グラフィックス（コンテナ内座標）
        const maskGraphics = this.scene.make.graphics();
        maskGraphics.fillStyle(0xffffff);
        // マスクの座標はワールド座標系が必要
        // コンテナの中央配置を考慮して計算
        const maskX = (width / 2) - winW/2 + 20;
        const maskY = (height / 2) + contentY;
        maskGraphics.fillRect(maskX, maskY, winW - 40, this.viewportHeight);
        
        const mask = maskGraphics.createGeometryMask();
        
        // コンテンツコンテナ
        this.contentContainer = this.scene.add.container(0, contentY);
        this.contentContainer.setMask(mask);
        
        // スクロールバー背景
        this.scrollBarBg = this.scene.add.rectangle(winW/2 - 20, contentY + this.viewportHeight/2, 10, this.viewportHeight, 0xBDC3C7);
        // スクロールバーハンドル
        this.scrollBarHandle = this.scene.add.rectangle(winW/2 - 20, contentY + 20, 10, 40, 0x7F8C8D)
            .setInteractive({ useHandCursor: true, draggable: true });
            
        // スクロールバーのドラッグイベント
        this.scene.input.setDraggable(this.scrollBarHandle);
        this.scrollBarHandle.on('drag', (pointer, dragX, dragY) => {
            // ハンドルの可動範囲制限
            const minY = contentY + this.scrollBarHandle.height/2;
            const maxY = contentY + this.viewportHeight - this.scrollBarHandle.height/2;
            const newY = Phaser.Math.Clamp(dragY, minY, maxY);
            this.scrollBarHandle.y = newY;
            
            // スクロール率計算
            const progress = (newY - minY) / (maxY - minY);
            this.scrollY = progress * this.maxScrollY;
            this._updateContentPosition();
        });

        // マウスホイールイベント
        this.scene.input.on('wheel', (pointer, gameObjects, deltaX, deltaY, deltaZ) => {
            if (this.isVisible) {
                this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaY * 0.5, 0, this.maxScrollY);
                this._updateScrollbarFromContent();
                this._updateContentPosition();
            }
        });

        // 📱 タッチドラッグスクロール対応
        this.isDragging = false;
        this.dragStartY = 0;

        this.scene.input.on('pointerdown', (pointer) => {
            if (!this.isVisible) return;
            // スクロールエリア内かチェック (maskX, maskY, winW-40, viewportHeight)
            if (pointer.x >= maskX && pointer.x <= maskX + winW - 40 &&
                pointer.y >= maskY && pointer.y <= maskY + this.viewportHeight) {
                this.isDragging = true;
                this.dragStartY = pointer.y;
            }
        });

        this.scene.input.on('pointermove', (pointer) => {
            if (!this.isVisible || !this.isDragging) return;
            const deltaYVal = this.dragStartY - pointer.y;
            this.scrollY = Phaser.Math.Clamp(this.scrollY + deltaYVal, 0, this.maxScrollY);
            this._updateScrollbarFromContent();
            this._updateContentPosition();
            this.dragStartY = pointer.y;
        });

        this.scene.input.on('pointerup', () => {
            this.isDragging = false;
        });

        this.scene.input.on('pointerupoutside', () => {
            this.isDragging = false;
        });

        this.container.add([bg, headerBg, titleText, closeBtn, closeIcon, 
                          this.tabsContainer, this.contentContainer, 
                          this.scrollBarBg, this.scrollBarHandle]);
        
        // 初期コンテンツ
        this._showContent('reception');
    }

    _createTabs() {
        const tabs = [
            { key: 'reception', label: '① 受付業務' },
            { key: 'check', label: '② 処方箋チェック' },
            { key: 'accounting', label: '③ 会計業務' }
        ];

        const tabW = 200;
        const tabH = 50;
        const gap = 10;
        const startX = -((tabW * 3) + (gap * 2)) / 2 + tabW / 2;

        this.tabButtons = {};

        tabs.forEach((tab, index) => {
            const x = startX + index * (tabW + gap);
            
            const btnContainer = this.scene.add.container(x, 0);
            
            const bg = this.scene.add.rectangle(0, 0, tabW, tabH, 0xBDC3C7)
                .setInteractive({ useHandCursor: true });
            
            const text = this.scene.add.text(0, 0, tab.label, {
                fontSize: '20px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: '#2C3E50',
                fontWeight: 'bold'
            }).setOrigin(0.5);

            btnContainer.add([bg, text]);
            this.tabsContainer.add(btnContainer);

            bg.on('pointerdown', () => {
                this.currentTab = tab.key;
                this._updateTabs();
                this._showContent(tab.key);
            });

            this.tabButtons[tab.key] = { container: btnContainer, bg: bg, text: text };
        });

        this._updateTabs();
    }

    _updateTabs() {
        Object.keys(this.tabButtons).forEach(key => {
            const btn = this.tabButtons[key];
            const isActive = (key === this.currentTab);
            
            btn.bg.setFillStyle(isActive ? 0x3498DB : 0xBDC3C7);
            btn.text.setColor(isActive ? '#FFFFFF' : '#2C3E50');
            btn.container.y = isActive ? -5 : 0;
        });
    }

    _showContent(key) {
        this.contentContainer.removeAll(true);
        const data = this.contentData[key];
        if (!data) return;

        let y = 0;
        const startX = -360; // 左端
        const width = 720;   // 横幅

        // コンテンツ生成
        data.content.forEach(item => {
            if (item.type === 'header') {
                y += 20;
                const hBg = this.scene.add.rectangle(0, y, width, 36, 0xEBF5FB);
                this.contentContainer.add(hBg);
                
                const text = this.scene.add.text(startX + 10, y, `■ ${item.text}`, {
                    fontSize: '22px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#2980B9',
                    fontWeight: 'bold'
                }).setOrigin(0, 0.5);
                this.contentContainer.add(text);
                y += 45;
            } else if (item.type === 'text') {
                const text = this.scene.add.text(startX + 10, y, item.text, {
                    fontSize: '20px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#333333',
                    lineSpacing: 10
                }).setOrigin(0, 0);
                this.contentContainer.add(text);
                y += text.height + 15;
            } else if (item.type === 'list') {
                // リストボックス風
                const text = this.scene.add.text(startX + 30, y + 10, item.text, {
                    fontSize: '19px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#555555',
                    backgroundColor: '#F7F9F9',
                    padding: { x: 10, y: 10 },
                    lineSpacing: 8
                }).setOrigin(0, 0);
                this.contentContainer.add(text);
                y += text.height + 25;
            } else if (item.type === 'note') {
                y += 5;
                const text = this.scene.add.text(startX + 10, y, item.text, {
                    fontSize: '18px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: '#E74C3C',
                    fontWeight: 'bold',
                    backgroundColor: '#FDEDEC',
                    padding: { x: 10, y: 5 }
                }).setOrigin(0, 0);
                this.contentContainer.add(text);
                y += text.height + 20;
            }
        });

        // スクロール範囲の再計算
        const contentHeight = y + 50; // 余白
        this.maxScrollY = Math.max(0, contentHeight - this.viewportHeight);
        this.scrollY = 0;
        this._updateContentPosition();
        this._updateScrollbarFromContent();
        
        // スクロールバーの表示非表示
        const needScroll = this.maxScrollY > 0;
        this.scrollBarBg.setVisible(needScroll);
        this.scrollBarHandle.setVisible(needScroll);
    }
    
    _updateContentPosition() {
        this.contentContainer.y = (-300 + 60 + 70) - this.scrollY; // winH/2 + headerH + ... の再計算が必要
        // 最初の基準位置は create() で設定した contentY
        // create() の contentY = -winH/2 + headerH + 70
        // winH = 600, headerH = 60 -> -300 + 60 + 70 = -170
        
        const initialY = -170;
        this.contentContainer.y = initialY - this.scrollY;
    }
    
    _updateScrollbarFromContent() {
        if (this.maxScrollY <= 0) return;
        
        const progress = this.scrollY / this.maxScrollY;
        const barAreaHeight = this.viewportHeight;
        const handleHeight = this.scrollBarHandle.height;
        
        const contentY = -170; // initialY
        const minY = contentY + handleHeight/2;
        const maxY = contentY + barAreaHeight - handleHeight/2;
        
        // contentYはコンテナ内座標なので、スクロールバーもコンテナ内座標で配置している
        // create内のスクロールバーY位置定義: contentY + this.viewportHeight/2 などを基準にしている
        // ここでの contentY はスクロールビューの開始Y座標（固定）
        
        const trackTop = -170; 
        const trackBottom = -170 + this.viewportHeight;
        const handleY = trackTop + (handleHeight/2) + (progress * (this.viewportHeight - handleHeight));
        
        this.scrollBarHandle.y = handleY;
    }

    show(defaultTab = null) {
        if (defaultTab && this.contentData[defaultTab]) {
            this.currentTab = defaultTab;
            // Accountingが指定された場合はキー名が以前の 'accounting' と一致してるのでOK
            // TutorialSteps側で指定するタブキーを確認する必要あり
        }
        
        this._updateTabs();
        this._showContent(this.currentTab);
        
        this.isVisible = true;
        this.container.setVisible(true);
        this.overlay.setVisible(true);
        
        this.container.setAlpha(0);
        this.container.setScale(0.9);
        
        this.scene.tweens.add({
            targets: this.container,
            alpha: 1,
            scale: 1,
            duration: 200,
            ease: 'Back.Out'
        });
    }

    hide() {
        if (!this.isVisible) return;
        
        this.scene.tweens.add({
            targets: this.container,
            alpha: 0,
            scale: 0.9,
            duration: 150,
            ease: 'Power2',
            onComplete: () => {
                this.isVisible = false;
                this.container.setVisible(false);
                this.overlay.setVisible(false);
            }
        });
    }
}
