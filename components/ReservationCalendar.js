// ReservationCalendar.js - 予約カレンダーコンポーネント
// ====================================================
// 🗓️ プレミアムなカレンダーUIで次回予約日を選択
// - 処方日数から正解日付を計算（最長処方日数 - 7日）
// - 月送り対応、日付クリック選択
// ====================================================

import { SoundManager } from './SoundManager.js';
import { TutorialManager } from './TutorialManager.js';

/**
 * 予約カレンダーコンポーネント
 * Phaser Container ベースのカレンダーUI
 */
export class ReservationCalendar {
    /**
     * カレンダーを生成
     * @param {Phaser.Scene} scene - シーン
     * @param {Object} options - オプション
     * @param {number} options.x - X座標（中心）
     * @param {number} options.y - Y座標（上端）
     * @param {Date} options.baseDate - 今日の日付
     * @param {string} options.prescriptionDays - 処方日数文字列（例: "28日 / 14日"）
     * @param {function} options.onSelect - 日付選択時のコールバック (selectedDate, daysFromToday) => void
     * @returns {Phaser.GameObjects.Container}
     */
    static create(scene, options) {
        const {
            x = 960,
            y = 850,
            baseDate = new Date(2025, 9, 15), // デフォルト: 2025年10月15日
            prescriptionDays = '28日',
            onSelect = () => {}
        } = options;

        const container = scene.add.container(x, y);
        container.setDepth(10);

        // 状態管理
        const state = {
            currentYear: baseDate.getFullYear(),
            currentMonth: baseDate.getMonth(),
            selectedDate: null,
            baseDate: baseDate,
            correctDate: null
        };

        // 正解日付を計算（休業日: 木曜=4, 日曜=0 を避ける）
        const maxDays = ReservationCalendar._parseMaxPrescriptionDays(prescriptionDays);
        let targetDate = new Date(baseDate);
        targetDate.setDate(targetDate.getDate() + maxDays - 7);
        
        // 休業日チェック & 正解候補の設定
        const dayOfWeek = targetDate.getDay();
        state.correctDates = []; // 複数の正解日付を許容
        
        if (dayOfWeek === 0 || dayOfWeek === 4) {
            // 木曜(4)または日曜(0)の場合、前日と翌日を正解とする
            const dayBefore = new Date(targetDate);
            dayBefore.setDate(dayBefore.getDate() - 1);
            const dayAfter = new Date(targetDate);
            dayAfter.setDate(dayAfter.getDate() + 1);
            
            // 前日も休業日なら調整
            if (dayBefore.getDay() === 0 || dayBefore.getDay() === 4) {
                dayBefore.setDate(dayBefore.getDate() - 1);
            }
            // 翌日も休業日なら調整
            if (dayAfter.getDay() === 0 || dayAfter.getDay() === 4) {
                dayAfter.setDate(dayAfter.getDate() + 1);
            }
            
            state.correctDates = [dayBefore, dayAfter];
            state.correctDate = dayBefore; // 代表として前日を設定
        } else {
            state.correctDate = targetDate;
            state.correctDates = [targetDate];
        }

        // ========================================
        // 📅 カレンダー描画
        // ========================================
        const calendarWidth = 380;
        const calendarHeight = 320;
        const cellSize = 45;
        const headerHeight = 50;

        // 背景パネル（グラスモーフィズム風）
        const bgPanel = scene.add.graphics();
        bgPanel.fillStyle(0xFFFFFF, 0.95);
        bgPanel.fillRoundedRect(-calendarWidth / 2, 0, calendarWidth, calendarHeight, 16);
        bgPanel.lineStyle(2, 0x3498DB, 0.8);
        bgPanel.strokeRoundedRect(-calendarWidth / 2, 0, calendarWidth, calendarHeight, 16);
        container.add(bgPanel);

        // ヘッダー背景
        const headerBg = scene.add.graphics();
        headerBg.fillStyle(0x3498DB, 1);
        headerBg.fillRoundedRect(-calendarWidth / 2, 0, calendarWidth, headerHeight, { tl: 16, tr: 16, bl: 0, br: 0 });
        container.add(headerBg);

        // 月表示テキスト
        const monthText = scene.add.text(0, headerHeight / 2, '', {
            fontSize: '22px',
            fontFamily: '"Noto Sans JP", sans-serif',
            color: '#FFFFFF',
            fontStyle: 'bold'
        }).setOrigin(0.5);
        container.add(monthText);

        // 月送りボタン（前月）
        const prevBtn = scene.add.text(-calendarWidth / 2 + 30, headerHeight / 2, '◀', {
            fontSize: '20px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        prevBtn.on('pointerdown', () => {
            SoundManager.playSE(scene, 'se_scroll', 0.4);
            state.currentMonth--;
            if (state.currentMonth < 0) {
                state.currentMonth = 11;
                state.currentYear--;
            }
            renderCalendar();
        });
        prevBtn.on('pointerover', () => prevBtn.setScale(1.2));
        prevBtn.on('pointerout', () => prevBtn.setScale(1.0));
        container.add(prevBtn);

        // 月送りボタン（翌月）
        const nextBtn = scene.add.text(calendarWidth / 2 - 30, headerHeight / 2, '▶', {
            fontSize: '20px',
            color: '#FFFFFF'
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
        nextBtn.on('pointerdown', () => {
            SoundManager.playSE(scene, 'se_scroll', 0.4);
            state.currentMonth++;
            if (state.currentMonth > 11) {
                state.currentMonth = 0;
                state.currentYear++;
            }
            renderCalendar();
        });
        nextBtn.on('pointerover', () => nextBtn.setScale(1.2));
        nextBtn.on('pointerout', () => nextBtn.setScale(1.0));
        container.add(nextBtn);

        // 曜日ヘッダー
        const weekdays = ['日', '月', '火', '水', '木', '金', '土'];
        const weekdayColors = ['#E74C3C', '#333', '#333', '#333', '#333', '#333', '#3498DB'];
        const gridStartX = -calendarWidth / 2 + 30;
        const gridStartY = headerHeight + 25;

        weekdays.forEach((day, i) => {
            const dayText = scene.add.text(gridStartX + i * cellSize, gridStartY, day, {
                fontSize: '14px',
                fontFamily: '"Noto Sans JP", sans-serif',
                color: weekdayColors[i],
                fontStyle: 'bold'
            }).setOrigin(0.5);
            container.add(dayText);
        });

        // 日付セルコンテナ（動的に更新）
        let dateCells = [];

        // カレンダー描画関数
        const renderCalendar = () => {
            // 既存セルを削除
            dateCells.forEach(cell => cell.destroy());
            dateCells = [];

            // 月テキスト更新
            monthText.setText(`${state.currentYear}年 ${state.currentMonth + 1}月`);

            // 月の初日と最終日
            const firstDay = new Date(state.currentYear, state.currentMonth, 1);
            const lastDay = new Date(state.currentYear, state.currentMonth + 1, 0);
            const startWeekday = firstDay.getDay();
            const daysInMonth = lastDay.getDate();

            // 日付セル描画
            let row = 0;
            let col = startWeekday;

            for (let day = 1; day <= daysInMonth; day++) {
                const cellX = gridStartX + col * cellSize;
                const cellY = gridStartY + 30 + row * 35;

                const cellDate = new Date(state.currentYear, state.currentMonth, day);
                const isToday = ReservationCalendar._isSameDate(cellDate, state.baseDate);
                const isCorrect = ReservationCalendar._isSameDate(cellDate, state.correctDate);
                const isSelected = state.selectedDate && ReservationCalendar._isSameDate(cellDate, state.selectedDate);
                const isPast = cellDate < state.baseDate;

                // セル背景
                const cellBg = scene.add.graphics();
                if (isSelected) {
                    cellBg.fillStyle(0x4CAF50, 1);
                    cellBg.fillCircle(cellX, cellY, 16);
                } else if (isToday) {
                    cellBg.lineStyle(2, 0x3498DB, 1);
                    cellBg.strokeCircle(cellX, cellY, 16);
                }
                container.add(cellBg);
                dateCells.push(cellBg);

                // 日付テキスト色
                let textColor = '#333333';
                if (isSelected) textColor = '#FFFFFF';
                else if (isPast) textColor = '#CCCCCC';
                else if (col === 0) textColor = '#E74C3C'; // 日曜
                else if (col === 6) textColor = '#3498DB'; // 土曜

                const dayText = scene.add.text(cellX, cellY, day.toString(), {
                    fontSize: '16px',
                    fontFamily: '"Noto Sans JP", sans-serif',
                    color: textColor
                }).setOrigin(0.5);
                container.add(dayText);
                dateCells.push(dayText);

                // クリック領域（過去日付と休業日は除外）
                const isClosed = (col === 0 || col === 4); // 日曜(0)と木曜(4)は休業日
                
                if (!isPast) {
                    const daysFromToday = Math.floor((cellDate - state.baseDate) / (1000 * 60 * 60 * 24));
                    
                    // 休業日マーク
                    if (isClosed) {
                        const closedMark = scene.add.text(cellX + 12, cellY - 10, '×', {
                            fontSize: '12px',
                            fontFamily: '"Noto Sans JP", sans-serif',
                            color: '#E74C3C',
                            fontStyle: 'bold'
                        }).setOrigin(0.5);
                        container.add(closedMark);
                        dateCells.push(closedMark);
                    }
                    
                    const hitArea = scene.add.rectangle(cellX, cellY, cellSize - 5, 32, 0xFFFFFF, 0)
                        .setInteractive({ useHandCursor: !isClosed });

                    // ホバー時のツールチップ（X日後）
                    hitArea.on('pointerover', () => {
                        // ホバー背景
                        if (!container.hoverBg) {
                            container.hoverBg = scene.add.graphics();
                        }
                        container.hoverBg.clear();
                        container.hoverBg.fillStyle(isClosed ? 0xE74C3C : 0x3498DB, 0.15);
                        container.hoverBg.fillCircle(cellX, cellY, 18);
                        container.hoverBg.setDepth(5);
                        container.add(container.hoverBg);
                        
                        // ツールチップ
                        if (!container.hoverTooltip) {
                            container.hoverTooltip = scene.add.text(0, 0, '', {
                                fontSize: '11px',
                                fontFamily: '"Noto Sans JP", sans-serif',
                                color: '#FFFFFF',
                                backgroundColor: '#2E7D32',
                                padding: { x: 5, y: 2 }
                            }).setOrigin(0.5, 1).setDepth(500);
                            container.add(container.hoverTooltip);
                        }
                        const tooltipText = isClosed 
                            ? `${daysFromToday}日後（休診）` 
                            : (daysFromToday === 0 ? '今日' : `${daysFromToday}日後`);
                        container.hoverTooltip.setText(tooltipText);
                        container.hoverTooltip.setStyle({ backgroundColor: isClosed ? '#E74C3C' : '#2E7D32' });
                        container.hoverTooltip.setPosition(cellX, cellY - 18);
                        container.hoverTooltip.setVisible(true);
                    });
                    
                    hitArea.on('pointerout', () => {
                        if (container.hoverBg) {
                            container.hoverBg.clear();
                        }
                        if (container.hoverTooltip) {
                            container.hoverTooltip.setVisible(false);
                        }
                    });

                    // クリック（休業日は除外）
                    if (!isClosed) {
                        hitArea.on('pointerdown', () => {
                            SoundManager.playSE(scene, 'se_display_card', 0.5);
                            state.selectedDate = new Date(state.currentYear, state.currentMonth, day);
                            const daysFromToday = Math.floor((state.selectedDate - state.baseDate) / (1000 * 60 * 60 * 24));
                            onSelect(state.selectedDate, daysFromToday);
                            renderCalendar();
                        });
                        
                        // 正解の日付の場合（チュートリアル用）
                        // 代表の正解日(state.correctDate)と一致するか、もしくは候補群に含まれるか
                        if (ReservationCalendar._isSameDate(cellDate, state.correctDate)) {
                             TutorialManager.getInstance(scene.game).registerButton('reservation_correct_date', hitArea);
                        }
                    }

                    container.add(hitArea);
                    dateCells.push(hitArea);
                }

                // 次のセル位置
                col++;
                if (col > 6) {
                    col = 0;
                    row++;
                }
            }
        };

        // 初回描画
        renderCalendar();

        // 公開メソッド
        container.getSelectedDate = () => state.selectedDate;
        container.getCorrectDate = () => state.correctDate;
        container.getCorrectDates = () => state.correctDates;
        container.isCorrectSelection = () => {
            if (!state.selectedDate) return false;
            // 複数の正解日付のいずれかと一致すればOK
            return state.correctDates.some(d => ReservationCalendar._isSameDate(state.selectedDate, d));
        };
        container.getDaysFromToday = () => {
            if (!state.selectedDate) return 0;
            return Math.floor((state.selectedDate - state.baseDate) / (1000 * 60 * 60 * 24));
        };

        return container;
    }

    /**
     * 処方日数文字列から最大日数を抽出
     * @param {string} prescriptionDays - 例: "28日 / 14日" or "30日"
     * @returns {number} 最大日数
     */
    static _parseMaxPrescriptionDays(prescriptionDays) {
        if (!prescriptionDays) return 28; // デフォルト

        const matches = prescriptionDays.match(/(\d+)日/g);
        if (!matches || matches.length === 0) return 28;

        const days = matches.map(m => parseInt(m.replace('日', '')));
        return Math.max(...days);
    }

    /**
     * 日付が同じかどうか比較
     */
    static _isSameDate(date1, date2) {
        if (!date1 || !date2) return false;
        return date1.getFullYear() === date2.getFullYear() &&
               date1.getMonth() === date2.getMonth() &&
               date1.getDate() === date2.getDate();
    }
}
