// GameConfig.js
import { ReceptionScene } from "./ReceptionScene.js";
import { CheckScene } from "./CheckScene.js";
import { PaymentScene } from "./PaymentScene.js";
import { HUDScene } from './HUDScene.js';
import { PreloadScene } from './PreloadScene.js';
import { TitleScene } from './TitleScene.js';
import { TutorialScene } from './TutorialScene.js';
import { TypingScene } from './TypingScene.js';
import { ResultScene } from './ResultScene.js';
import { ShelfScene } from './ShelfScene.js';
import { TransitionScene } from './TransitionScene.js';
import { GameStateManager, getGameState } from './GameStateManager.js';

// Re-export for convenience
export { GameStateManager, getGameState };

// ====================================================
// パフォーマンス設定
// ====================================================
export const PERFORMANCE_CONFIG = {
    // パーティクル上限数 (ランク別の値を超えないように制限)
    maxParticles: 50,
    
    // エフェクトクオリティ: 'low' | 'medium' | 'high'
    // low: パーティクル50%、アニメーション簡略化
    // medium: パーティクル75%、通常アニメーション
    // high: フル演出 (デフォルト)
    effectQuality: 'high',
    
    // FPSが低下した際にエフェクトを自動調整するかどうか
    autoAdjustOnLowFPS: true,
    
    // FPS閾値 (これ以下になったらエフェクトを軽減)
    lowFPSThreshold: 30,
    
    // オブジェクトプーリングを有効にするかどうか
    enableParticlePooling: true,
    
    // パーティクルプールの最大サイズ
    particlePoolSize: 100
};

// ====================================================
// 音量設定キー (Registry キーの統一)
// ====================================================
export const VOLUME_KEYS = {
    BGM: 'bgmVolume',
    SE: 'seVolume',
    VOICE: 'voiceVolume'
};

// ====================================================
// デフォルト音量
// ====================================================
export const DEFAULT_VOLUMES = {
    BGM: 0.4,
    SE: 0.8,
    VOICE: 0.8
};

const config = {
  type: Phaser.AUTO,
  width: 1920,
  height: 1080,
  parent: 'game-container',  // HTML input要素を正しく配置するためのコンテナ
  scene: [
    PreloadScene,
    TitleScene,
    TutorialScene,
    ReceptionScene,
    CheckScene,
    PaymentScene,
    HUDScene,     
    TypingScene, 
    ShelfScene,
    TransitionScene,
    ResultScene,
  ],

  // その他、必要な設定...
};

const game = new Phaser.Game(config);