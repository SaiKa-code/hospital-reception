// GameStateManager.js
// ====================================================
// 🗂️ 中央集権的な状態管理システム
// シーン間のデータ受け渡しを簡素化し、状態の一元管理を実現
// ====================================================

// ====================================================
import { EventBus, GameEvents } from './EventBus.js';

/**
 * ゲーム全体の状態を管理するシングルトンクラス
 * Phaserのregistryと連携して動作
 */
export class GameStateManager {
    static _instance = null;
    
    /**
     * シングルトンインスタンスを取得
     * @param {Phaser.Game} game - Phaserゲームインスタンス（初回のみ必要）
     */
    static getInstance(game = null) {
        if (!GameStateManager._instance) {
            if (!game) {
                console.warn('⚠️ GameStateManager: 初回呼び出し時にはgameインスタンスが必要です');
            }
            GameStateManager._instance = new GameStateManager(game);
        }
        return GameStateManager._instance;
    }
    
    /**
     * インスタンスをリセット（テスト用）
     */
    static reset() {
        GameStateManager._instance = null;
    }
    
    constructor(game) {
        this._game = game;
        
        // ====================================================
        // 🎮 ゲーム状態
        // ====================================================
        this._state = {
            // プレイヤー情報
            score: 0,
            highScore: 0,
            
            // 患者管理
            currentPatient: null,
            patientHistory: [],
            patientQueue: [],
            
            // ゲーム進行
            gamePhase: 'title',  // 'title' | 'tutorial' | 'playing' | 'result'
            currentScene: null,
            
            // スコアログ
            scoreLog: [],
            
            // 🆕 コンボシステム
            combo: {
                count: 0,        // 現在のコンボ数
                maxCombo: 0      // 最大コンボ数（ゲーム中の記録）
            },
            
            // 🆕 タイミングシステム（タイムボーナス用）
            timing: {
                patientStartTime: null,    // 患者処理全体の開始時刻
                receptionStartTime: null,  // 受付開始時刻
                typingStartTime: null,     // タイピング開始時刻
                paymentStartTime: null     // 会計開始時刻
            },
            
            // 設定
            settings: {
                bgmVolume: 0.5,
                seVolume: 0.8,
                voiceVolume: 0.7,
                tutorialCompleted: false
            },
            
            // タイマー・ゲーム時間
            remainingTime: 0,
            totalPatientsProcessed: 0
        };
        
        // Phaserのregistryと同期
        this._syncWithRegistry();
        
        console.log('🗂️ GameStateManager: 初期化完了');
    }
    
    // ====================================================
    // 📊 スコア管理
    // ====================================================
    
    /**
     * スコアを取得
     */
    getScore() {
        return this._state.score;
    }
    
    /**
     * スコアを設定
     */
    setScore(score) {
        this._state.score = score;
        this._syncToRegistry('score', score);
        return this;
    }
    
    /**
     * スコアを加算（ログ付き）
     * @param {number} points - 加算するポイント
     * @param {string} reason - 理由
     */
    addScore(points, reason = '') {
        this._state.score += points;
        
        // 🆕 ミス（負のポイント）ならコンボリセット
        if (points < 0) {
            this.resetCombo();
            EventBus.emit(GameEvents.COMBO_BREAK, {});
        }
        
        // スコアログに記録
        this._state.scoreLog.push({
            points,
            reason,
            timestamp: Date.now(),
            positive: points >= 0
        });
        
        this._syncToRegistry('score', this._state.score);
        this._syncToRegistry('scoreLog', this._state.scoreLog);
        
        return this;
    }
    
    /**
     * スコアログを取得
     */
    getScoreLog() {
        return [...this._state.scoreLog];
    }
    
    /**
     * スコアログをクリア
     */
    clearScoreLog() {
        this._state.scoreLog = [];
        this._syncToRegistry('scoreLog', []);
        return this;
    }
    
    // ====================================================
    // 🏥 患者管理
    // ====================================================
    
    /**
     * 現在の患者を取得
     */
    getCurrentPatient() {
        return this._state.currentPatient;
    }
    
    /**
     * 現在の患者を設定
     */
    setCurrentPatient(patient) {
        this._state.currentPatient = patient;
        this._syncToRegistry('currentPatient', patient);
        return this;
    }
    
    /**
     * 患者履歴に追加
     */
    addToPatientHistory(patientRecord) {
        this._state.patientHistory.push(patientRecord);
        this._state.totalPatientsProcessed++;
        this._syncToRegistry('patientHistory', this._state.patientHistory);
        return this;
    }
    
    /**
     * 患者履歴を取得
     */
    getPatientHistory() {
        return [...this._state.patientHistory];
    }
    
    // ====================================================
    // 🎬 ゲーム進行管理
    // ====================================================
    
    /**
     * ゲームフェーズを取得
     */
    getGamePhase() {
        return this._state.gamePhase;
    }
    
    /**
     * ゲームフェーズを設定
     */
    setGamePhase(phase) {
        this._state.gamePhase = phase;
        this._syncToRegistry('gamePhase', phase);
        return this;
    }
    
    /**
     * 現在のシーンを設定
     */
    setCurrentScene(sceneName) {
        this._state.currentScene = sceneName;
        return this;
    }
    
    /**
     * 残り時間を設定
     */
    setRemainingTime(time) {
        this._state.remainingTime = time;
        this._syncToRegistry('remainingTime', time);
        return this;
    }
    
    /**
     * 残り時間を取得
     */
    getRemainingTime() {
        return this._state.remainingTime;
    }
    
    // ====================================================
    // ⚙️ 設定管理
    // ====================================================
    
    /**
     * 設定を取得
     */
    getSettings() {
        return { ...this._state.settings };
    }
    
    /**
     * 設定を更新
     */
    updateSettings(newSettings) {
        this._state.settings = { ...this._state.settings, ...newSettings };
        
        // 各設定をregistryに同期
        Object.keys(newSettings).forEach(key => {
            if (key === 'bgmVolume') this._syncToRegistry('bgmVolume', newSettings[key]);
            if (key === 'seVolume') this._syncToRegistry('seVolume', newSettings[key]);
            if (key === 'voiceVolume') this._syncToRegistry('voiceVolume', newSettings[key]);
        });
        
        return this;
    }
    
    // ====================================================
    // 💾 状態の保存/復元
    // ====================================================
    
    /**
     * 状態全体を取得（不変性を保証）
     */
    getState() {
        return JSON.parse(JSON.stringify(this._state));
    }
    
    /**
     * ゲームをリセット（新規ゲーム開始時）
     */
    resetGame() {
        this._state.score = 0;
        this._state.currentPatient = null;
        this._state.patientHistory = [];
        this._state.patientQueue = [];
        this._state.scoreLog = [];
        this._state.gamePhase = 'playing';
        this._state.remainingTime = 0;
        this._state.totalPatientsProcessed = 0;
        
        // 🆕 コンボリセット
        this._state.combo.count = 0;
        this._state.combo.maxCombo = 0;
        
        // 🆕 タイミングリセット
        this._state.timing.patientStartTime = null;
        this._state.timing.receptionStartTime = null;
        this._state.timing.typingStartTime = null;
        this._state.timing.paymentStartTime = null;
        
        this._syncWithRegistry();
        console.log('🔄 GameStateManager: ゲームリセット完了');
        
        return this;
    }
    
    // ====================================================
    // 🔥 コンボシステム
    // ====================================================
    
    /**
     * コンボを増加（ミスなく患者処理完了時に呼び出し）
     * @returns {number} 新しいコンボ数
     */
    incrementCombo() {
        this._state.combo.count++;
        if (this._state.combo.count > this._state.combo.maxCombo) {
            this._state.combo.maxCombo = this._state.combo.count;
        }
        console.log(`🔥 コンボ増加: ${this._state.combo.count} (最大: ${this._state.combo.maxCombo})`);
        
        // 🆕 イベント発行
        EventBus.emit(GameEvents.COMBO_UPDATE, {
            count: this._state.combo.count,
            levelName: this.getComboLevelName()
        });
        
        return this._state.combo.count;
    }
    
    /**
     * 複数のコンボを一度に加算（タイピング完了時など）
     * @param {number} count - 加算するコンボ数
     * @returns {Object} { finalCount: 最終コンボ数, totalBonus: 累積ボーナスポイント }
     */
    addCombo(count) {
        let totalBonus = 0;
        
        for (let i = 0; i < count; i++) {
            this._state.combo.count++;
            if (this._state.combo.count > this._state.combo.maxCombo) {
                this._state.combo.maxCombo = this._state.combo.count;
            }
            // 各増加時点でのボーナスを累積
            totalBonus += this.getComboBonus();
        }
        
        console.log(`🔥 コンボ一括加算: +${count} → ${this._state.combo.count} (最大: ${this._state.combo.maxCombo}, 累積ボーナス: ${totalBonus})`);
        
        // イベント発行（最終状態）
        EventBus.emit(GameEvents.COMBO_UPDATE, {
            count: this._state.combo.count,
            levelName: this.getComboLevelName()
        });
        
        return {
            finalCount: this._state.combo.count,
            totalBonus: totalBonus
        };
    }

    
    /**
     * コンボをリセット（ミス時に呼び出し）
     */
    resetCombo() {
        if (this._state.combo.count > 0) {
            console.log(`💔 コンボリセット: ${this._state.combo.count} → 0`);
        }
        this._state.combo.count = 0;
    }
    
    /**
     * 現在のコンボ数を取得
     */
    getComboCount() {
        return this._state.combo.count;
    }
    
    /**
     * 最大コンボ数を取得
     */
    getMaxCombo() {
        return this._state.combo.maxCombo;
    }
    
    /**
     * コンボボーナスポイントを計算
     * @returns {number} ボーナスポイント（0の場合もあり）
     */
    getComboBonus() {
        const count = this._state.combo.count;
        
        if (count >= 20) {
            // 20連続以上: +10/回（継続ボーナス）
            return 10;
        } else if (count >= 15) {
            // 15連続: +50 PERFECT!
            return 50;
        } else if (count >= 10) {
            // 10連続: +30 EXCELLENT!
            return 30;
        } else if (count >= 5) {
            // 5連続: +15 GREAT!
            return 15;
        } else if (count >= 2) {
            // 2連続: +5 NICE!
            return 5;
        }
        
        return 0;
    }
    
    /**
     * コンボレベル名を取得（演出用）
     * @returns {string|null} レベル名（'NICE!', 'GREAT!', 'EXCELLENT!', 'PERFECT!', 'UNSTOPPABLE!'）
     */
    getComboLevelName() {
        const count = this._state.combo.count;
        
        if (count >= 20) return 'UNSTOPPABLE!';
        if (count >= 15) return 'PERFECT!';
        if (count >= 10) return 'EXCELLENT!';
        if (count >= 5) return 'GREAT!';
        if (count >= 2) return 'NICE!';
        
        return null;
    }
    
    // ====================================================
    // ⏱️ タイミングシステム（タイムボーナス用）
    // ====================================================
    
    /**
     * タイミング開始を記録
     * @param {string} phase - 'patient' | 'reception' | 'typing' | 'payment'
     */
    setTimingStart(phase) {
        const now = Date.now();
        switch (phase) {
            case 'patient':
                this._state.timing.patientStartTime = now;
                break;
            case 'reception':
                this._state.timing.receptionStartTime = now;
                break;
            case 'typing':
                this._state.timing.typingStartTime = now;
                break;
            case 'payment':
                this._state.timing.paymentStartTime = now;
                break;
        }
        console.log(`⏱️ タイミング開始: ${phase} @ ${now}`);
    }
    
    /**
     * 経過時間を取得（秒単位）
     * @param {string} phase - 'patient' | 'reception' | 'typing' | 'payment'
     * @returns {number} 経過秒数（開始時刻がない場合は-1）
     */
    getElapsedTime(phase) {
        let startTime = null;
        switch (phase) {
            case 'patient':
                startTime = this._state.timing.patientStartTime;
                break;
            case 'reception':
                startTime = this._state.timing.receptionStartTime;
                break;
            case 'typing':
                startTime = this._state.timing.typingStartTime;
                break;
            case 'payment':
                startTime = this._state.timing.paymentStartTime;
                break;
        }
        
        if (startTime === null) return -1;
        
        return (Date.now() - startTime) / 1000;
    }
    
    /**
     * 特定フェーズのタイミングをクリア
     * @param {string} phase - 'patient' | 'reception' | 'typing' | 'payment' | 'all'
     */
    clearTiming(phase) {
        if (phase === 'all') {
            this._state.timing.patientStartTime = null;
            this._state.timing.receptionStartTime = null;
            this._state.timing.typingStartTime = null;
            this._state.timing.paymentStartTime = null;
        } else {
            switch (phase) {
                case 'patient':
                    this._state.timing.patientStartTime = null;
                    break;
                case 'reception':
                    this._state.timing.receptionStartTime = null;
                    break;
                case 'typing':
                    this._state.timing.typingStartTime = null;
                    break;
                case 'payment':
                    this._state.timing.paymentStartTime = null;
                    break;
            }
        }
    }
    
    /**
     * ハイスコアを更新
     */
    updateHighScore() {
        if (this._state.score > this._state.highScore) {
            this._state.highScore = this._state.score;
            localStorage.setItem('hospitalReceptionHighScore', this._state.highScore.toString());
            return true;  // 新記録
        }
        return false;
    }
    
    /**
     * ハイスコアをロード
     */
    loadHighScore() {
        const saved = localStorage.getItem('hospitalReceptionHighScore');
        this._state.highScore = saved ? parseInt(saved, 10) : 0;
        return this._state.highScore;
    }
    
    // ====================================================
    // 🔄 Registry同期
    // ====================================================
    
    /**
     * Phaserのregistryと同期
     */
    _syncWithRegistry() {
        if (!this._game) return;
        
        const registry = this._game.registry;
        
        registry.set('score', this._state.score);
        registry.set('scoreLog', this._state.scoreLog);
        registry.set('currentPatient', this._state.currentPatient);
        registry.set('patientHistory', this._state.patientHistory);
        registry.set('gamePhase', this._state.gamePhase);
        registry.set('bgmVolume', this._state.settings.bgmVolume);
        registry.set('seVolume', this._state.settings.seVolume);
        registry.set('voiceVolume', this._state.settings.voiceVolume);
    }
    
    /**
     * 特定の値をregistryに同期
     */
    _syncToRegistry(key, value) {
        if (!this._game) return;
        this._game.registry.set(key, value);
    }
}

// ====================================================
// 🛠️ ヘルパー関数
// ====================================================

/**
 * シーンからGameStateManagerを簡単に取得
 * @param {Phaser.Scene} scene - 現在のシーン
 */
export function getGameState(scene) {
    return GameStateManager.getInstance(scene.game);
}
