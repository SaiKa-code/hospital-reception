// EventBus.js - グローバルイベントエミッター
// シーン間の疎結合通信を実現

/**
 * EventBus - シーン間通信用のグローバルイベントシステム
 * 
 * 使用例:
 *   import { EventBus } from './EventBus.js';
 *   
 *   // イベント発火
 *   EventBus.emit('hud:updateScore', { score: 100, reason: '正解' });
 *   
 *   // イベントリスニング
 *   EventBus.on('hud:updateScore', (data) => { ... });
 */

class GameEventBus {
    constructor() {
        this._events = {};
    }

    /**
     * イベントリスナーを登録
     * @param {string} event - イベント名 (例: 'hud:updateScore')
     * @param {Function} callback - コールバック関数
     * @returns {Function} unsubscribe関数
     */
    on(event, callback) {
        if (!this._events[event]) {
            this._events[event] = [];
        }
        this._events[event].push(callback);

        // unsubscribe関数を返す
        return () => this.off(event, callback);
    }

    /**
     * 一度だけ発火するイベントリスナーを登録
     * @param {string} event - イベント名
     * @param {Function} callback - コールバック関数
     */
    once(event, callback) {
        const wrapper = (...args) => {
            callback(...args);
            this.off(event, wrapper);
        };
        this.on(event, wrapper);
    }

    /**
     * イベントリスナーを解除
     * @param {string} event - イベント名
     * @param {Function} callback - 解除するコールバック
     */
    off(event, callback) {
        if (!this._events[event]) return;
        this._events[event] = this._events[event].filter(cb => cb !== callback);
    }

    /**
     * イベントを発火
     * @param {string} event - イベント名
     * @param {*} data - 渡すデータ
     */
    emit(event, data) {
        if (!this._events[event]) return;
        this._events[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`[EventBus] Error in event '${event}':`, error);
            }
        });
    }

    /**
     * 特定イベントの全リスナーを削除
     * @param {string} event - イベント名
     */
    clear(event) {
        if (event) {
            delete this._events[event];
        } else {
            this._events = {};
        }
    }

    /**
     * デバッグ用: 登録されているイベント一覧を取得
     */
    debug() {
        console.log('[EventBus] Registered events:', Object.keys(this._events));
        for (const [event, callbacks] of Object.entries(this._events)) {
            console.log(`  ${event}: ${callbacks.length} listeners`);
        }
    }
}

// シングルトンインスタンス
export const EventBus = new GameEventBus();

// イベント名の定数（タイプミス防止）
export const GameEvents = {
    // HUD関連
    HUD_UPDATE_SCORE: 'hud:updateScore',
    HUD_UPDATE_WAITING: 'hud:updateWaiting',
    HUD_ADD_MEMO: 'hud:addMemo',
    HUD_FLASH_ICON: 'hud:flashIcon',
    HUD_SHOW_MESSAGE: 'hud:showMessage',
    
    // 患者関連
    PATIENT_COMPLETED: 'patient:completed',
    PATIENT_ADDED_TO_QUEUE: 'patient:addedToQueue',
    
    // スコア関連
    SCORE_ADD: 'score:add',
    SCORE_RECORD_MISTAKE: 'score:recordMistake',
    
    // 🆕 コンボ関連
    COMBO_UPDATE: 'combo:update',        // コンボ数が変化
    COMBO_BREAK: 'combo:break',          // コンボが途切れた
    
    // 🆕 タイムボーナス関連
    TIME_BONUS_EARNED: 'time:bonus',     // タイムボーナス獲得
    
    // シーン間同期
    SYNC_ACCOUNTING_QUEUE: 'sync:accountingQueue',
    
    // ゲーム状態
    GAME_PAUSE: 'game:pause',
    GAME_RESUME: 'game:resume',
    
    // 🆕 患者タイマー（高難易度用）
    PATIENT_TIMER_PAUSE: 'patient_timer:pause',
    PATIENT_TIMER_RESUME: 'patient_timer:resume',
    
    // 🆕 パーティクルエフェクト
    PARTICLE_BURST: 'effect:particleBurst',  // { x, y, color, count }
    
    // 🆕 エンドレスモード
    TIME_EXTENDED: 'time:extended',  // { seconds, reason }
    
    // 💚 HPシステム（ハードモード用）
    HP_UPDATE: 'hp:update',  // { hp, maxHp, damage }
};
