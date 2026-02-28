// components/SoundManager.js
// サウンド再生の共通ユーティリティ

import { VOLUME_KEYS, DEFAULT_VOLUMES } from '../GameConfig.js';

/**
 * SoundManager - SE/BGM/Voice再生を統一管理
 * 
 * 使用例:
 *   import { SoundManager } from './components/SoundManager.js';
 *   
 *   SoundManager.playSE(scene, 'se_correct_answer');
 *   SoundManager.playSE(scene, 'se_paper', { volume: 0.5 });
 *   SoundManager.playBGM(scene, 'bgm_title');
 */

export class SoundManager {
    /**
     * SE（効果音）を再生
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {string} key - サウンドキー
     * @param {Object|number} options - volume number、または { volume, rate } オブジェクト
     */
    static playSE(scene, key, options = 1.0) {
        let scale = 1.0;
        let rate = 1.0;
        
        if (typeof options === 'number') {
            scale = options;
        } else if (typeof options === 'object' && options !== null) {
            scale = options.volume !== undefined ? options.volume : 1.0;
            rate = options.rate !== undefined ? options.rate : 1.0;
        }

        const globalSeVolume = scene.registry.get(VOLUME_KEYS.SE) ?? DEFAULT_VOLUMES.SE;
        let finalVol = globalSeVolume * scale;
        if (isNaN(finalVol) || !isFinite(finalVol)) finalVol = DEFAULT_VOLUMES.SE;

        try {
            scene.sound.play(key, { volume: finalVol, rate: rate });
        } catch (e) {
            console.error('[SoundManager] SE play error:', key, e);
        }
    }

    /**
     * ボイスを再生
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {string} key - ボイスキー
     * @param {number} volumeScale - ボリュームスケール（0-1）
     */
    static playVoice(scene, key, volumeScale = 1.0) {
        const globalVoiceVolume = scene.registry.get(VOLUME_KEYS.VOICE) ?? DEFAULT_VOLUMES.VOICE;
        let finalVol = globalVoiceVolume * volumeScale;
        if (isNaN(finalVol) || !isFinite(finalVol)) finalVol = DEFAULT_VOLUMES.VOICE;

        try {
            scene.sound.play(key, { volume: finalVol });
        } catch (e) {
            console.error('[SoundManager] Voice play error:', key, e);
        }
    }

    /**
     * BGMを再生
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {string} key - BGMキー
     * @param {number} volumeScale - ボリュームスケール（0-1）
     * @param {boolean} loop - ループ再生
     * @returns {Phaser.Sound.BaseSound|null} - 再生中のBGMオブジェクト
     */
    static playBGM(scene, key, volumeScale = 1.0, loop = true) {
        const globalBgmVolume = scene.registry.get(VOLUME_KEYS.BGM) ?? DEFAULT_VOLUMES.BGM;
        let finalVol = globalBgmVolume * volumeScale;
        if (isNaN(finalVol) || !isFinite(finalVol)) finalVol = DEFAULT_VOLUMES.BGM;
        
        try {
            // 既存のBGMがあれば停止
            if (scene.currentBGM && scene.currentBGM.isPlaying) {
                scene.currentBGM.stop();
            }
            
            scene.currentBGM = scene.sound.add(key, { 
                volume: finalVol, 
                loop: loop 
            });
            scene.currentBGM.play();
            return scene.currentBGM;
        } catch (e) {
            console.error('[SoundManager] BGM play error:', key, e);
            return null;
        }
    }

    /**
     * BGMをフェードアウト
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {number} duration - フェード時間（ミリ秒）
     */
    static fadeOutBGM(scene, duration = 500) {
        if (scene.currentBGM && scene.currentBGM.isPlaying) {
            scene.tweens.add({
                targets: scene.currentBGM,
                volume: 0,
                duration: duration,
                onComplete: () => {
                    if (scene.currentBGM) {
                        scene.currentBGM.stop();
                    }
                }
            });
        }
    }

    /**
     * すべてのサウンドを停止
     * @param {Phaser.Scene} scene - Phaserシーン
     */
    static stopAll(scene) {
        scene.sound.stopAll();
    }

    /**
     * 音量設定を初期化（PreloadScene用）
     * @param {Phaser.Scene} scene - Phaserシーン
     */
    static initializeVolumes(scene) {
        if (!scene.registry.has(VOLUME_KEYS.BGM)) {
            scene.registry.set(VOLUME_KEYS.BGM, DEFAULT_VOLUMES.BGM);
        }
        if (!scene.registry.has(VOLUME_KEYS.SE)) {
            scene.registry.set(VOLUME_KEYS.SE, DEFAULT_VOLUMES.SE);
        }
        if (!scene.registry.has(VOLUME_KEYS.VOICE)) {
            scene.registry.set(VOLUME_KEYS.VOICE, DEFAULT_VOLUMES.VOICE);
        }
    }
}
