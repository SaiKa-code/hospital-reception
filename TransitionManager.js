// TransitionManager.js - TransitionSceneを使用するヘルパー
// 各シーンからトランジションを呼び出すためのインターフェース

export class TransitionManager {
    constructor(scene) {
        this.scene = scene;
    }

    // ==========================================================
    // 🎬 スライドトランジション
    // ==========================================================
    slideTransition(targetScene, direction = 'left', data = null, shouldSleep = true) {
        const transitionScene = this.scene.scene.get('TransitionScene');
        
        // TransitionSceneがまだ起動していなければ起動
        if (!this.scene.scene.isActive('TransitionScene')) {
            this.scene.scene.launch('TransitionScene');
            // 最前面に持ってくる
            this.scene.scene.bringToTop('TransitionScene');
        }
        
        // TransitionSceneを最前面に
        this.scene.scene.bringToTop('TransitionScene');
        
        // 🚨 修正: HUDScene をさらに上に持ってくる（スコアログが見えるように）
        if (this.scene.scene.isActive('HUDScene')) {
            this.scene.scene.bringToTop('HUDScene');
        }
        
        // トランジション実行
        if (transitionScene) {
            transitionScene.executeTransition(
                this.scene.scene.key,  // fromScene
                targetScene,            // toScene
                direction,
                data,
                shouldSleep             // shouldSleep (default: true)
            );
        }
    }

    // ==========================================================
    // 🎬 スリープ＆ラン
    // ==========================================================
    sleepAndRun(targetScene, dataPayload, direction = null) {
        const transitionScene = this.scene.scene.get('TransitionScene');
        
        if (!this.scene.scene.isActive('TransitionScene')) {
            this.scene.scene.launch('TransitionScene');
            this.scene.scene.bringToTop('TransitionScene');
        }
        
        this.scene.scene.bringToTop('TransitionScene');
        
        if (transitionScene && direction) {
            transitionScene.executeTransition(
                this.scene.scene.key,
                targetScene,
                direction,
                dataPayload,
                true                    // isSleepAndRun
            );
        } else if (transitionScene) {
            // direction指定なしの場合はフェード
            transitionScene.executeTransition(
                this.scene.scene.key,
                targetScene,
                'left',
                dataPayload,
                true
            );
        }
    }
}

// ==========================================================
// 🎨 ヘルパー関数
// ==========================================================
export function addTransitionMethods(scene) {
    scene.transitionManager = new TransitionManager(scene);
    
    scene.fadeToScene = (targetScene, data) => {
        scene.transitionManager.slideTransition(targetScene, 'left', data);
    };
    
    scene.slideToScene = (targetScene, direction, data, shouldSleep = true) => {
        scene.transitionManager.slideTransition(targetScene, direction, data, shouldSleep);
    };

    scene.sleepAndRunScene = (targetScene, dataPayload, direction) => {
        scene.transitionManager.sleepAndRun(targetScene, dataPayload, direction);
    };
}
