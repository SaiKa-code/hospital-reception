// PreloadScene.js (修正版)
import { GameStateManager } from './GameStateManager.js';

// ====================================================
// 🚨 デフォルトデータ（フォールバック用）
// ====================================================
const DEFAULT_TRIAGE_DATA = [];
const DEFAULT_MYNUMBER_DATA = [];
const DEFAULT_MEDICINE_DATA = { medicines: [] };
const DEFAULT_CHINESE_MEDICINE_DATA = { medicines: [] };
const DEFAULT_NOVEL_DATA = { scenes: [] };

export class PreloadScene extends Phaser.Scene {
    constructor() {
        super('PreloadScene');
        this._failedAssets = [];
        this._criticalAssets = ['triageData', 'myNumberData', 'medicineData'];
    }

    preload() {
        console.log('--- PreloadScene: アセット読み込み開始 ---');

        // ====================================================
        // 📊 ローディング進捗表示
        // ====================================================
        this._createLoadingUI();
        
        // ====================================================
        // 🚨 エラーハンドリングの設定
        // ====================================================
        this._setupErrorHandlers();

        // 問診データの読み込み
        this.load.json('triageData', 'assets/data/triage_data.json');
        this.load.json('myNumberData', 'assets/data/mynumber.json');
        this.load.json('paperInsuranceData', 'assets/data/Health_insurance_card.json'); 
        
        // 💊 薬データの読み込み
        this.load.json('medicineData', 'assets/data/fictional_medicine.json');
        this.load.json('chineseMedicineData', 'assets/data/fictional_chinese_medicine.json');
        
        // 📖 ノベルデータの読み込み
        this.load.json('novelData', 'assets/data/novel_data.json');
        
        // 🎤 ノベルボイスの読み込み
        this.load.audio('novel_vc_001', 'assets/vc/novel_vc/novel_vc_001.wav');
        this.load.audio('novel_vc_003', 'assets/vc/novel_vc/novel_vc_003.wav');
        this.load.audio('novel_vc_004', 'assets/vc/novel_vc/novel_vc_004.wav');
        this.load.audio('novel_vc_004_1', 'assets/vc/novel_vc/novel_vc_004_1.wav');
        this.load.audio('novel_vc_004_2', 'assets/vc/novel_vc/novel_vc_004_2.wav');
        this.load.audio('novel_vc_005', 'assets/vc/novel_vc/novel_vc_005.wav');
        this.load.audio('novel_vc_006', 'assets/vc/novel_vc/novel_vc_006.wav');
        this.load.audio('novel_vc_007', 'assets/vc/novel_vc/novel_vc_007.wav');
        this.load.audio('novel_vc_008', 'assets/vc/novel_vc/novel_vc_008.wav');
        this.load.audio('novel_vc_010', 'assets/vc/novel_vc/novel_vc_010.wav');
        this.load.audio('novel_vc_011', 'assets/vc/novel_vc/novel_vc_011.wav');
        this.load.audio('novel_vc_011_1', 'assets/vc/novel_vc/novel_vc_011_1.wav');
        this.load.audio('novel_vc_011_2', 'assets/vc/novel_vc/novel_vc_011_2.wav');
        this.load.audio('novel_vc_012', 'assets/vc/novel_vc/novel_vc_012.wav');
        this.load.audio('novel_vc_013', 'assets/vc/novel_vc/novel_vc_013.wav'); 
        
        // 🎤 処方箋チェック患者到着時のボイス
        this.load.audio('vc_prescription_check', 'assets/vc/vc_prescription_check.wav'); 

        // WebFontLoaderのスクリプトを読み込む
        this.load.script('webfont', 'https://ajax.googleapis.com/ajax/libs/webfont/1.6.26/webfont.js');

        // 🎵 BGM読み込み
        this.load.audio('bgm_hinokageri', 'assets/bgm/bgm_hinokageri.mp3');
        this.load.audio('bgm_maou_game_town18', 'assets/bgm/bgm_maou_game_town18.ogg');
        this.load.audio('bgm_maou_game_town20', 'assets/bgm/bgm_maou_game_town20.ogg');

        // 🔊 効果音(SE)読み込み (キーをファイル名と同じフルネームに変更)
        this.load.audio('se_caution_required',   'assets/sound_effects/se_caution_required.mp3');
        this.load.audio('se_change',             'assets/sound_effects/se_change.mp3');
        this.load.audio('se_changesean',         'assets/sound_effects/se_changesean.mp3');
        this.load.audio('se_correct_answer',     'assets/sound_effects/se_correct_answer.mp3');
        this.load.audio('se_correction_tape',    'assets/sound_effects/se_correction_tape.mp3');
        this.load.audio('se_display_card',       'assets/sound_effects/se_display_card.mp3');
        this.load.audio('se_inadequate_response', 'assets/sound_effects/se_inadequate_response.mp3');
        this.load.audio('se_memo',               'assets/sound_effects/se_memo.mp3');
        this.load.audio('se_miss',               'assets/sound_effects/se_miss.mp3');
        this.load.audio('se_paper',              'assets/sound_effects/se_paper.mp3');
        this.load.audio('se_reception_completed', 'assets/sound_effects/se_reception_completed.mp3');
        this.load.audio('se_retrieve_or_return_chart', 'assets/sound_effects/se_retrieve_or_return_chart.mp3');
        this.load.audio('se_scroll',             'assets/sound_effects/se_scroll.mp3');
        this.load.audio('se_stamp',              'assets/sound_effects/se_stamp.mp3');
        this.load.audio('se_typing',             'assets/sound_effects/se_typing.mp3');
        this.load.audio('se_payment',            'assets/sound_effects/se_payment.mp3');
        this.load.audio('se_finish',             'assets/sound_effects/se_finish.mp3'); // 🆕 FINISH演出用
        this.load.audio('se_printer_printing',   'assets/sound_effects/se_printer_printing.wav'); // 🆕 処方箋再印刷用
        
        // 🆕 リザルト画面ランク別SE
        this.load.audio('se_score_s1',           'assets/sound_effects/se_score_s1.mp3');
        this.load.audio('se_score_s2',           'assets/sound_effects/se_score_s2.mp3');
        this.load.audio('se_score_a',            'assets/sound_effects/se_score_a.mp3');
        this.load.audio('se_score_b',            'assets/sound_effects/se_score_b.mp3');
        this.load.audio('se_score_d',            'assets/sound_effects/se_score_d.mp3');

        // 🖼️ 背景画像の読み込み
        this.load.image('receptionBg', 'assets/images/reception_background.png');

        // 患者画像の読み込み
        for (let i = 1; i <= 18; i++) {
            this.load.image(`man${i}`, `assets/images/patient/man${i}.png`);
        }
        for (let i = 1; i <= 8; i++) {
            this.load.image(`woman${i}`, `assets/images/patient/woman${i}.png`);
        }
        
        // 🎨 トリアージさん立ち絵の読み込み
        this.load.image('triage_normal', 'assets/images/ms_triage_images/01_normal.png.png');
        this.load.image('triage_smile', 'assets/images/ms_triage_images/02_smile.png');
        this.load.image('triage_happy', 'assets/images/ms_triage_images/03_happy.png');
        this.load.image('triage_serious', 'assets/images/ms_triage_images/04_serious.png.png');
        this.load.image('triage_eyes_closed', 'assets/images/ms_triage_images/05_eyes_closed.png');
        this.load.image('triage_sad', 'assets/images/ms_triage_images/06_sad.png');
        this.load.image('triage_angry', 'assets/images/ms_triage_images/07_angry.png');
        this.load.image('triage_furious', 'assets/images/ms_triage_images/08_furious.png');
        this.load.image('triage_scared', 'assets/images/ms_triage_images/09_scared.png');
        this.load.image('triage_pain', 'assets/images/ms_triage_images/10_pain.png');
        this.load.image('triage_surprised', 'assets/images/ms_triage_images/11_surprised.png');
        this.load.image('triage_blush', 'assets/images/ms_triage_images/12_blush.png');
        this.load.image('triage_disgusted', 'assets/images/ms_triage_images/13_disgusted.png');
        this.load.image('triage_panic', 'assets/images/ms_triage_images/15_panic.png');
        this.load.image('triage_shadowed', 'assets/images/ms_triage_images/17_shadowed.png');
        this.load.image('triage_scheming', 'assets/images/ms_triage_images/18_scheming.png');
        this.load.image('triage_wink', 'assets/images/ms_triage_images/19_wink.png.png');
    }

    create() {
        // 🗂️ GameStateManagerの初期化
        GameStateManager.getInstance(this.game);
        
        // 🚨 失敗したアセットのフォールバック処理
        this._applyFallbacks();
        
        // 🔊 グローバル音量設定の初期化
        this.registry.set('bgmVolume', 0.5);  // BGM音量 (0.0 - 1.0)
        this.registry.set('seVolume', 0.8);   // SE音量 (0.0 - 1.0)
        this.registry.set('voiceVolume', 0.7); // ボイス音量 (0.0 - 1.0)
        
        // WebFontLoaderを使ってフォントを読み込む
        if (typeof WebFont !== 'undefined') {
            WebFont.load({
                google: {
                    families: ['Noto Sans JP'] // プログラム内で使うフォントを指定
                },
                active: () => {
                    console.log('--- PreloadScene: フォント読み込み完了、TitleSceneへ移行 ---');
                    this._destroyLoadingUI();
                    this.scene.start('TitleScene');
                },
                inactive: () => {
                    // フォント読み込み失敗時のフォールバック
                    console.warn('⚠️ フォント読み込み失敗、デフォルトフォントで続行');
                    this._destroyLoadingUI();
                    this.scene.start('TitleScene');
                }
            });
        } else {
            // WebFont自体が読み込めなかった場合
            console.warn('⚠️ WebFontLoader読み込み失敗、デフォルトフォントで続行');
            this._destroyLoadingUI();
            this.scene.start('TitleScene');
        }
    }
    
    // ====================================================
    // 📊 ローディングUI
    // ====================================================
    _createLoadingUI() {
        const width = this.cameras.main.width;
        const height = this.cameras.main.height;
        
        // 背景
        this._loadingBg = this.add.rectangle(width/2, height/2, width, height, 0x0a1628);
        
        // ロゴテキスト
        this._loadingLogo = this.add.text(width/2, height/2 - 100, '🏥 首切クリニック', {
            fontSize: '48px',
            fontFamily: 'sans-serif',
            color: '#00d4aa'
        }).setOrigin(0.5);
        
        // プログレスバー背景
        this._progressBg = this.add.rectangle(width/2, height/2, 400, 30, 0x333333);
        
        // プログレスバー
        this._progressBar = this.add.rectangle(width/2 - 200, height/2, 0, 26, 0x00d4aa).setOrigin(0, 0.5);
        
        // ローディングテキスト
        this._loadingText = this.add.text(width/2, height/2 + 50, 'Loading... 0%', {
            fontSize: '20px',
            fontFamily: 'sans-serif',
            color: '#FFFFFF'
        }).setOrigin(0.5);
        
        // 進捗イベント
        this.load.on('progress', (value) => {
            this._progressBar.width = 396 * value;
            this._loadingText.setText(`Loading... ${Math.floor(value * 100)}%`);
        });
    }
    
    _destroyLoadingUI() {
        if (this._loadingBg) this._loadingBg.destroy();
        if (this._loadingLogo) this._loadingLogo.destroy();
        if (this._progressBg) this._progressBg.destroy();
        if (this._progressBar) this._progressBar.destroy();
        if (this._loadingText) this._loadingText.destroy();
    }
    
    // ====================================================
    // 🚨 エラーハンドリング
    // ====================================================
    _setupErrorHandlers() {
        // アセット読み込みエラー
        this.load.on('loaderror', (fileObj) => {
            console.error(`❌ アセット読み込み失敗: ${fileObj.key} (${fileObj.url})`);
            this._failedAssets.push({
                key: fileObj.key,
                type: fileObj.type,
                url: fileObj.url
            });
        });
        
        // 完了時のサマリー
        this.load.on('complete', () => {
            if (this._failedAssets.length > 0) {
                console.warn(`⚠️ ${this._failedAssets.length}個のアセット読み込みに失敗:`);
                this._failedAssets.forEach(asset => {
                    console.warn(`   - ${asset.key} (${asset.type})`);
                });
            } else {
                console.log('✅ 全アセット読み込み完了');
            }
        });
    }
    
    _applyFallbacks() {
        // 重要なデータのフォールバック
        const fallbacks = {
            'triageData': DEFAULT_TRIAGE_DATA,
            'myNumberData': DEFAULT_MYNUMBER_DATA,
            'paperInsuranceData': [],
            'medicineData': DEFAULT_MEDICINE_DATA,
            'chineseMedicineData': DEFAULT_CHINESE_MEDICINE_DATA,
            'novelData': DEFAULT_NOVEL_DATA
        };
        
        this._failedAssets.forEach(asset => {
            if (fallbacks[asset.key] !== undefined) {
                // キャッシュにデフォルトデータを設定
                this.cache.json.add(asset.key, fallbacks[asset.key]);
                console.log(`🔧 フォールバック適用: ${asset.key}`);
            }
        });
        
        // クリティカルなアセットが失敗した場合に警告
        const criticalFailed = this._failedAssets.filter(
            a => this._criticalAssets.includes(a.key)
        );
        
        if (criticalFailed.length > 0) {
            console.error('🚨 重要なアセットの読み込みに失敗しました。ゲーム体験に影響がある可能性があります。');
            // ユーザーに通知（オプション）
            this.registry.set('loadErrors', criticalFailed.map(a => a.key));
        }
    }
}
