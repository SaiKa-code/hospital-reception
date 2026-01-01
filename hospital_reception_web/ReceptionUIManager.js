import { ReceptionConfig } from './ReceptionConfig.js';
import { UIHeader } from './components/UIHeader.js';

export class ReceptionUIManager {
    constructor(scene) {
        this.scene = scene;
        this.currentButtons = [];
        this.activePatientUI = [];
    }

    /**
     * Create the top header using UIHeader component
     */
    createHeader(title = '総合受付', iconChar = '🏥') {
        const C = ReceptionConfig.UI.HEADER;
        return UIHeader.create(this.scene, {
            x: C.X,
            y: C.Y,
            text: title,
            color: C.COLORS.BASE,
            icon: iconChar,
            width: C.WIDTH,
            height: C.HEIGHT,
            depth: 100,
            style: 'modern' // プレミアムダークテーマを使用
        });
    }

    /**
     * Show result overlay (Completion Stamp & Popup)
     */
    showCompletionResult(text, colorStr, rank, scoreDelta) {
        // 1. Stamp
        this._showStamp(text, colorStr);

        // 2. Score Popup
        const centerX = 960;
        const centerY = 540;
        
        let scoreTextStr = (scoreDelta >= 0) ? `+${scoreDelta} Point` : `${scoreDelta} Point`;
        let scoreColor = (scoreDelta >= 0) ? '#FFFF00' : '#888888';
        
        let commentStr = '';
        if (rank === 'warning') commentStr = '次回は丁寧に確認しよう！';
        if (rank === 'bad') commentStr = 'ミスが多すぎます...';

        const scorePopup = this.scene.add.text(centerX, centerY + 150, `${scoreTextStr}\n${commentStr}`, {
            fontSize: '40px',
            fontFamily: ReceptionConfig.STYLES.FONT_FAMILY,
            color: scoreColor,
            stroke: '#000000',
            strokeThickness: 4,
            align: 'center'
        }).setOrigin(0.5).setDepth(3001).setAlpha(0);

        this.scene.tweens.add({
            targets: scorePopup,
            y: centerY + 100,
            alpha: 1,
            duration: 500,
            delay: 300,
            ease: 'Power2',
            onComplete: () => {
                 this.scene.time.delayedCall(2000, () => {
                    if (scorePopup.active) scorePopup.destroy();
                });
            }
        });
    }

    _showStamp(text, colorStr) {
         const centerX = 960;
         const centerY = 540;

         const stampText = this.scene.add.text(0, 0, text, {
            fontSize: '80px',
            fontFamily: ReceptionConfig.STYLES.FONT_FAMILY,
            color: colorStr,
            stroke: colorStr,
            strokeThickness: 1.5,
            align: 'center',
            padding: { x: 20, y: 20 }
        }).setOrigin(0.5);

        const bounds = stampText.getBounds();
        const border = this.scene.add.graphics();
        const colorNum = parseInt(colorStr.replace('#', '0x'));
        border.lineStyle(10, colorNum, 1);
        border.strokeRoundedRect(-bounds.width/2, -bounds.height/2, bounds.width, bounds.height, 16);

        const container = this.scene.add.container(centerX, centerY, [border, stampText]);
        container.setDepth(3000);
        container.setScale(2.0).setAlpha(0);

        this.scene.tweens.add({
            targets: container,
            alpha: 1,
            scale: 1,
            angle: -10,
            duration: 300,
            ease: 'Back.Out',
            onComplete: () => {
                this.scene.cameras.main.shake(100, 0.005);
                this.scene.time.delayedCall(2000, () => container.destroy());
            }
        });
    }

    /**
     * Create a standard button
     */
    createButton(x, y, text, onClick, color=0xFFFFFF, textColor='#000000') {
        const width = 550;
        const height = 65;
        const container = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(color, 1);
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 12);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 12);

        const txt = this.scene.add.text(0, 0, text, {
            fontSize: '26px',
            fontFamily: ReceptionConfig.STYLES.FONT_FAMILY,
            color: textColor
        }).setOrigin(0.5);

        container.add([bg, txt]);
        container.setSize(width, height);
        
        container.setInteractive(new Phaser.Geom.Rectangle(-width/2, -height/2, width, height), Phaser.Geom.Rectangle.Contains)
            .on('pointerdown', onClick)
            .on('pointerover', () => container.setScale(1.02))
            .on('pointerout', () => container.setScale(1));
            
        return container;
    }

    // ... Helper methods ...
    playSE(key, config = {}) {
        if (this.scene._playSE) {
            this.scene._playSE(key, config);
        }
    }
}
