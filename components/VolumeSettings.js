// components/VolumeSettings.js
// 音量設定UIコンポーネント

import { VOLUME_KEYS, DEFAULT_VOLUMES } from '../GameConfig.js';

/**
 * VolumeSettings - 音量設定UIを生成する共通コンポーネント
 * 
 * 使用例:
 *   import { VolumeSettings } from './components/VolumeSettings.js';
 *   VolumeSettings.createVolumeControl(scene, container, x, y, 'BGM', 'bgmVolume', 0x00d4aa, (vol) => { ... });
 */

export class VolumeSettings {
    /**
     * シンプルな音量コントロールを生成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {Phaser.GameObjects.Container} container - 追加先のコンテナ
     * @param {number} x - X座標
     * @param {number} y - Y座標
     * @param {string} labelText - ラベルテキスト
     * @param {string} registryKey - registryのキー
     * @param {number} color - バーの色
     * @param {function} onChange - 値変更時のコールバック
     */
    static createVolumeControl(scene, container, x, y, labelText, registryKey, color = 0x00d4aa, onChange = null) {
        const currentVol = scene.registry.get(registryKey) ?? 0.5;
        
        // ラベル
        const label = scene.add.text(x - 150, y, labelText, {
            fontSize: '18px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0, 0.5);
        container.add(label);
        
        // 音量表示
        const volText = scene.add.text(x + 160, y, `${Math.round(currentVol * 100)}%`, {
            fontSize: '16px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#7a9aba'
        }).setOrigin(0.5);
        container.add(volText);
        
        // バー背景
        const barBg = scene.add.graphics();
        barBg.fillStyle(0x3a3a5a, 1);
        barBg.fillRoundedRect(x - 40, y - 8, 160, 16, 8);
        container.add(barBg);
        
        // バー
        const bar = scene.add.graphics();
        const drawBar = (vol) => {
            bar.clear();
            bar.fillStyle(color, 1);
            bar.fillRoundedRect(x - 40, y - 8, 160 * vol, 16, 8);
        };
        drawBar(currentVol);
        container.add(bar);
        
        // -ボタン（ASCII使用）
        const minusBtn = scene.add.text(x - 70, y, '−', {
            fontSize: '26px',
            color: '#ff6666'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        minusBtn.on('pointerover', () => minusBtn.setScale(1.2));
        minusBtn.on('pointerout', () => minusBtn.setScale(1.0));
        minusBtn.on('pointerdown', () => {
            let vol = scene.registry.get(registryKey) ?? 0.5;
            vol = Math.max(0, Math.round((vol - 0.1) * 10) / 10);
            scene.registry.set(registryKey, vol);
            volText.setText(`${Math.round(vol * 100)}%`);
            drawBar(vol);
            if (onChange) onChange(vol);
        });
        container.add(minusBtn);
        
        // +ボタン（ASCII使用）
        const plusBtn = scene.add.text(x + 130, y, '+', {
            fontSize: '26px',
            color: '#66ff66'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        
        plusBtn.on('pointerover', () => plusBtn.setScale(1.2));
        plusBtn.on('pointerout', () => plusBtn.setScale(1.0));
        plusBtn.on('pointerdown', () => {
            let vol = scene.registry.get(registryKey) ?? 0.5;
            vol = Math.min(1, Math.round((vol + 0.1) * 10) / 10);
            scene.registry.set(registryKey, vol);
            volText.setText(`${Math.round(vol * 100)}%`);
            drawBar(vol);
            if (onChange) onChange(vol);
        });
        container.add(plusBtn);
        
        return { label, volText, bar, minusBtn, plusBtn };
    }
    
    /**
     * 音量設定ウィンドウ全体を生成
     * @param {Phaser.Scene} scene - Phaserシーン
     * @param {object} options - オプション
     * @returns {object} { container, overlay, hide }
     */
    static createVolumeWindow(scene, options = {}) {
        const {
            depth = 200,
            panelWidth = 500,
            panelHeight = 350,
            onBGMChange = null,
            onSEChange = null,
            onVoiceChange = null,
            onClose = null
        } = options;
        
        // オーバーレイ
        const overlay = scene.add.container(960, 540).setDepth(depth - 1).setVisible(false);
        const overlayBg = scene.add.rectangle(0, 0, 1920, 1080, 0x000000, 0.7).setInteractive();
        overlayBg.on('pointerdown', () => hide());
        overlay.add(overlayBg);
        
        // メインコンテナ
        const container = scene.add.container(960, 540).setDepth(depth).setVisible(false);
        
        // パネル背景
        const panel = scene.add.graphics();
        panel.fillStyle(0x1a2a4a, 0.95);
        panel.fillRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        panel.lineStyle(2, 0x00d4aa, 0.8);
        panel.strokeRoundedRect(-panelWidth/2, -panelHeight/2, panelWidth, panelHeight, 15);
        container.add(panel);
        
        // タイトル
        const title = scene.add.text(0, -panelHeight/2 + 40, '🔊 音量設定', {
            fontSize: '26px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#00d4aa'
        }).setOrigin(0.5);
        container.add(title);
        
        // BGM
        VolumeSettings.createVolumeControl(scene, container, 0, -60, '🎵 BGM', 'bgmVolume', 0x00d4aa, onBGMChange);
        
        // SE
        VolumeSettings.createVolumeControl(scene, container, 0, 10, '🔔 SE', 'seVolume', 0x74b9ff, onSEChange);
        
        // ボイス
        VolumeSettings.createVolumeControl(scene, container, 0, 80, '🎤 ボイス', 'voiceVolume', 0xa29bfe, onVoiceChange);
        
        // 閉じるボタン
        const closeBtn = scene.add.container(0, panelHeight/2 - 45);
        const closeBg = scene.add.graphics();
        closeBg.fillStyle(0x3a5a8a, 1);
        closeBg.fillRoundedRect(-80, -22, 160, 44, 10);
        closeBtn.add(closeBg);
        
        const closeText = scene.add.text(0, 0, '閉じる', {
            fontSize: '20px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#ffffff'
        }).setOrigin(0.5);
        closeBtn.add(closeText);
        
        const closeHit = scene.add.rectangle(0, 0, 160, 44).setInteractive({ useHandCursor: true });
        closeBtn.add(closeHit);
        
        closeHit.on('pointerover', () => closeBtn.setScale(1.05));
        closeHit.on('pointerout', () => closeBtn.setScale(1.0));
        closeHit.on('pointerdown', () => hide());
        
        container.add(closeBtn);
        
        // 表示/非表示関数
        const show = () => {
            overlay.setVisible(true);
            container.setVisible(true);
            container.setScale(0.9);
            scene.tweens.add({
                targets: container,
                scale: 1,
                duration: 200,
                ease: 'Back.Out'
            });
        };
        
        const hide = () => {
            overlay.setVisible(false);
            container.setVisible(false);
            if (onClose) onClose();
        };
        
        return { container, overlay, show, hide };
    }
}
