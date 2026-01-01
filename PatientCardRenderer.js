import { ReceptionConfig } from './ReceptionConfig.js';

export class PatientCardRenderer {
    constructor(scene) {
        this.scene = scene;
    }

    /**
     * Render Insurance Card
     */
    renderInsuranceCard(data) {
        const width = 600;
        const height = 380;
        const container = this.scene.add.container(0, 0); 
        
        // 1. Determine Colors
        let cardColor = 0x3498DB; // Default Blue
        let insurerName = '全国健康保険協会';    
        let workplaceName = '株式会社XXXXX';     
        const details = data.insuranceDetails || {};
        const categoryDisplay = data.visualCategory || '';

        if (categoryDisplay.includes('国保')) {
            cardColor = 0xE74C3C; 
            insurerName = 'XXXX市';
            workplaceName = 'XXXX市'; 
        } 
        else if (categoryDisplay.includes('後期')) {
            cardColor = 0x9B59B6; 
            insurerName = 'XX県後期高齢者医療広域連合';
            workplaceName = ''; 
        } 
        else if (details['会社名']) {
            workplaceName = details['会社名'];
        }

        // 2. Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(cardColor, 1); 
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);

        const headerBg = this.scene.add.graphics();
        headerBg.fillStyle(0xFFFFFF, 0.4);
        headerBg.fillRect(-width/2, -height/2 + 15, width, 50); 
        container.add([bg, headerBg]);

        // 3. Text Styles
        const font = ReceptionConfig.STYLES.FONT_FAMILY;
        const labelStyle = { fontFamily: font, color: '#333', fontSize: '18px' }; 
        const valueStyle = { fontFamily: font, color: '#000', fontSize: '24px', stroke: '#000', strokeThickness: 1 };
        const titleStyle = { fontFamily: font, color: '#000', fontSize: '32px', stroke: '#000', strokeThickness: 1 };

        const title = this.scene.add.text(0, -height/2 + 40, '健康保険被保険者証', titleStyle).setOrigin(0.5);
        container.add(title);

        // 4. Content Layout
        const baseX = -width/2 + 30; 
        let currentY = -90;          
        const lineHeight = 48;

        // Row 1: Symbols
        container.add(this.scene.add.text(baseX, currentY, '記号', labelStyle));
        container.add(this.scene.add.text(baseX + 50, currentY - 4, details['記号'] || 'XXXX', valueStyle));
        
        const numX = baseX + 180; 
        container.add(this.scene.add.text(numX, currentY, '番号', labelStyle));
        container.add(this.scene.add.text(numX + 50, currentY - 4, details['番号'] || 'XXXX', valueStyle));

        const branchX = numX + 220;
        container.add(this.scene.add.text(branchX, currentY, '枝番', labelStyle));
        container.add(this.scene.add.text(branchX + 50, currentY - 4, details['枝番'] || '00', valueStyle));

        // Row 2: Name
        currentY += lineHeight;
        const kanaVal = details['フリガナ'] || details['カナ'] || 'XXXX XXXX';
        container.add(this.scene.add.text(baseX + 80, currentY - 18, kanaVal, { ...labelStyle, fontSize: '13px' })); 
        container.add(this.scene.add.text(baseX, currentY, '氏名', labelStyle));
        container.add(this.scene.add.text(baseX + 80, currentY - 6, details['氏名'] || data.name, { ...valueStyle, fontSize: '30px' }));

        // Row 3: DOB & Burden
        currentY += lineHeight;
        const dob = details['生年月日'] || 'XXXX/XX/XX';
        const age = details['年齢'] || '??歳'; 
        container.add(this.scene.add.text(baseX, currentY, '生年月日', labelStyle));
        container.add(this.scene.add.text(baseX + 100, currentY - 4, `${dob} (${age})`, valueStyle));
        
        const burdenVal = details['負担'] || '3割';
        container.add(this.scene.add.text(branchX, currentY, '割合', labelStyle));
        container.add(this.scene.add.text(branchX + 50, currentY - 4, burdenVal, valueStyle));

        // Stamp
        const stampX = (width / 2) - 80; 
        const stampY = (height / 2) - 50; 
        const stampMark = this.scene.add.circle(stampX, stampY, 22).setStrokeStyle(3, 0xFF0000);
        const stampChar = this.scene.add.text(stampX, stampY, '印', { fontSize: '20px', color: '#FF0000', fontFamily: font }).setOrigin(0.5);
        container.add([stampMark, stampChar]);

        return container;
    }

    /**
     * Render My Number Card
     */
    renderMyNumberCard(data) {
        const width = 600;
        const height = 380;
        const container = this.scene.add.container(0, 0); 
        
        // 1. Background (Pinkish like MyNumber)
        const bg = this.scene.add.graphics();
        bg.fillStyle(0xFFE4E1, 1); 
        bg.lineStyle(4, 0x000000, 1);
        bg.fillRoundedRect(-width/2, -height/2, width, height, 16);
        bg.strokeRoundedRect(-width/2, -height/2, width, height, 16);
        
        // Header Stripe
        const headerBg = this.scene.add.graphics();
        headerBg.fillStyle(0xFFFFFF, 0.4);
        headerBg.fillRect(-width/2, -height/2 + 15, width, 50); 
        container.add([bg, headerBg]);

        // 2. Text Styles
        const font = ReceptionConfig.STYLES.FONT_FAMILY;
        const titleStyle = { fontFamily: font, color: '#000', fontSize: '32px', stroke: '#000', strokeThickness: 1 };
        const labelStyle = { fontFamily: font, color: '#555', fontSize: '18px' }; 
        const valueStyle = { fontFamily: font, color: '#000', fontSize: '24px', stroke: '#000', strokeThickness: 1 };

        // 3. Content
        // Title
        const title = this.scene.add.text(0, -height/2 + 40, '個人番号カード', titleStyle).setOrigin(0.5);
        container.add(title);
        
        // Rabbit Icon (Simplified placeholder)
        const rabbit = this.scene.add.text(width/2 - 50, -height/2 + 40, '🐰', { fontSize: '40px' }).setOrigin(0.5);
        container.add(rabbit);

        const details = data.insuranceDetails || {};
        const baseX = -width/2 + 30; 
        let currentY = -70;          
        const lineHeight = 55;

        // Name
        const nameVal = details['氏名'] || data.name || 'XXXX XXXX';
        container.add(this.scene.add.text(baseX, currentY, '氏名', labelStyle));
        container.add(this.scene.add.text(baseX + 60, currentY - 5, nameVal, { ...valueStyle, fontSize: '32px' }));

        // Address
        currentY += lineHeight;
        const addrVal = details['住所'] || '東京都千代田区1-1-1';
        container.add(this.scene.add.text(baseX, currentY, '住所', labelStyle));
        container.add(this.scene.add.text(baseX + 60, currentY - 5, addrVal, { ...valueStyle, fontSize: '20px' }));

        // DOB
        currentY += lineHeight;
        const dob = details['生年月日'] || 'XXXX年XX月XX日';
        container.add(this.scene.add.text(baseX, currentY, '生年月日', labelStyle));
        container.add(this.scene.add.text(baseX + 100, currentY - 5, dob, valueStyle));
        
        // Gender
        const gender = details['性別'] || '男';
        container.add(this.scene.add.text(baseX + 400, currentY - 5, gender, valueStyle));

        // Photo Placeholder
        const photoX = width/2 - 80;
        const photoY = height/2 - 80;
        const photo = this.scene.add.rectangle(photoX, photoY, 120, 140, 0xCCCCCC).setStrokeStyle(2, 0x666666);
        const photoText = this.scene.add.text(photoX, photoY, '写真', { fontSize: '18px', color: '#666' }).setOrigin(0.5);
        container.add([photo, photoText]);

        return container;
    }
}
