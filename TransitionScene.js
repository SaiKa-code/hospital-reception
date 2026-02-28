// TransitionScene.js - 専用トランジションシーン
// 白ベース、病院名表示（パネルと共に移動）、ラインなし

export class TransitionScene extends Phaser.Scene {
    constructor() {
        super('TransitionScene');
        this.isTransitioning = false;
    }

    create() {
        this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    }

    // ==========================================================
    // 🎬 ワイプトランジション（ラインなし・テキスト追従）
    // ==========================================================
    executeTransition(fromScene, toScene, direction, data = null, shouldSleep = true) {
        if (this.isTransitioning) return;
        this.isTransitioning = true;

        const width = 1920;
        const height = 1080;
        const isHorizontal = direction === 'left' || direction === 'right';
        const isForward = direction === 'left' || direction === 'up';
        
        const moveX = isHorizontal ? (isForward ? -width : width) : 0;
        const moveY = !isHorizontal ? (isForward ? -height : height) : 0;
        const startX = width/2 - moveX;
        const startY = height/2 - moveY;

        // ========================================
        // 病院カラー（白ベース）
        // ========================================
        const colors = [0xFFFFFF, 0xF5F5F5, 0xEBEBEB];
        const panels = [];
        
        // パネル作成（3層）
        colors.forEach((color, i) => {
            const offsetMultiplier = isForward ? -1 : 1;
            const ox = isHorizontal ? (60 - i * 30) * offsetMultiplier : 0;
            const oy = !isHorizontal ? (60 - i * 30) * offsetMultiplier : 0;
            
            const panel = this.add.rectangle(
                startX + ox, startY + oy,
                width + 100, height + 100,
                color
            ).setDepth(100 + i);
            panels.push(panel);
        });

        // ========================================
        // 🏥 病院名テキスト
        // ========================================
        const hospitalText = this.add.text(width / 2, height / 2, '🏥 首切クリニック', {
            fontSize: '64px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#333333',
            fontStyle: 'bold'
        })
        .setOrigin(0.5)
        .setDepth(200)
        .setVisible(false); // 最初は非表示

        // ========================================
        // アニメーション
        // ========================================
        const baseDuration = 300;

        // パネル
        panels.forEach((panel, i) => {
            this.tweens.add({
                targets: panel,
                x: `+=${moveX}`,
                y: `+=${moveY}`,
                duration: baseDuration + 50,
                delay: i * 30,
                ease: 'Quad.easeInOut'
            });
        });

        // テキスト表示制御
        // 画面が覆われたタイミングでパッと表示
        this.time.delayedCall(baseDuration - 50, () => {
            hospitalText.setVisible(true);
        });

        // シーン切り替えとワイプアウト
        const allElements = [...panels]; // ラインはなし
        
        this.time.delayedCall(baseDuration + 50, () => {
            this._performSceneSwitch(fromScene, toScene, data, shouldSleep);
            this.scene.bringToTop('TransitionScene');
            
            // 🚨 修正: HUDScene を最前面に保持（スコアログが見えるように）
            if (this.scene.isActive('HUDScene')) {
                this.scene.bringToTop('HUDScene');
            }
            
            // ワイプアウト開始
            this.time.delayedCall(50, () => {
                // テキストも一緒にワイプアウトさせる
                this._wipeOut(allElements, hospitalText, direction);
            });
        });
    }

    _performSceneSwitch(fromScene, toScene, data, shouldSleep) {
        try {
            // 🎵 ゲーム内シーン間ではBGMを継続、タイトル/リザルト/チュートリアルへの遷移時のみ停止
            const gameScenes = ['ReceptionScene', 'ShelfScene', 'CheckScene', 'PaymentScene', 'TypingScene'];
            const stopBgmScenes = ['TitleScene', 'ResultScene', 'TutorialScene'];
            
            // 遷移先がタイトル/リザルト/チュートリアルの場合、または遷移元がゲーム外シーンの場合はBGMを停止
            const shouldStopBgm = stopBgmScenes.includes(toScene) || !gameScenes.includes(fromScene);
            
            if (shouldStopBgm) {
                this.sound.stopAll();
            }
            
            // 🚨 修正: スリープ有無に関わらず、元シーンの入力を無効化（ゴーストクリック防止）
            // これにより時間進行は継続するが、ボタンはクリック不可になる
            const fromSceneObj = this.scene.get(fromScene);
            if (fromSceneObj && fromSceneObj.input) {
                console.log(`[TransitionScene] ${fromScene}の入力を無効化`);
                fromSceneObj.input.enabled = false;
            }
            
            if (shouldSleep) {
                this.scene.sleep(fromScene);
            }
            
            if (this.scene.isSleeping(toScene)) {
                // 🚨 修正: wakeする前に遷移先シーンの入力を再有効化
                const toSceneObj = this.scene.get(toScene);
                if (toSceneObj && toSceneObj.input) {
                    console.log(`[TransitionScene] ${toScene}の入力を有効化`);
                    toSceneObj.input.enabled = true;
                }
                
                this.scene.wake(toScene, data);
            } else if (this.scene.isActive(toScene)) {
                // 🚨 修正: アクティブなシーンへの遷移時も入力を有効化
                const toSceneObj = this.scene.get(toScene);
                if (toSceneObj && toSceneObj.input) {
                    console.log(`[TransitionScene] ${toScene}の入力を有効化`);
                    toSceneObj.input.enabled = true;
                }
                
                const targetScene = this.scene.get(toScene);
                if (targetScene && targetScene.init && data) {
                    targetScene.init(data);
                }
            } else {
                this.scene.run(toScene, data);
            }
        } catch (e) {
            console.error('Scene switch error:', e);
        }
    }

    _wipeOut(elements, textObj, inDirection) {
        const width = 1920;
        const height = 1080;
        const isHorizontal = inDirection === 'left' || inDirection === 'right';
        const isForward = inDirection === 'left' || inDirection === 'up';
        
        const exitX = isHorizontal ? (isForward ? -width : width) : 0;
        const exitY = !isHorizontal ? (isForward ? -height : height) : 0;

        const duration = 300;

        // パネルのアニメーション
        elements.forEach((el, i) => {
            const reverseIndex = elements.length - 1 - i;
            this.tweens.add({
                targets: el,
                x: `+=${exitX}`,
                y: `+=${exitY}`,
                duration: duration,
                delay: reverseIndex * 20,
                ease: 'Quad.easeInOut',
                onComplete: () => {
                    el.destroy();
                    if (i === elements.length - 1) {
                        this.isTransitioning = false;
                    }
                }
            });
        });

        // テキストもパネルと一緒に移動して消す
        // 一番手前のパネル（i=0, reverseIndex=2）に近い遅延で動かす
        this.tweens.add({
            targets: textObj,
            x: `+=${exitX}`,
            y: `+=${exitY}`,
            duration: duration,
            delay: 40, // パネルの動きに合わせる
            ease: 'Quad.easeInOut',
            onComplete: () => {
                textObj.destroy();
            }
        });
    }
}
