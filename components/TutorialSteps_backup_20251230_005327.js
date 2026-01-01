/**
 * TutorialSteps.js - 完全版チュートリアルステップ定義
 * 
 * 仕様書準拠: 3人の患者を受付してからCheckSceneへ移動
 * 
 * 正しい受付フロー（カルテ出し不要の場合）:
 * 1. 患者クリック → 保険証表示
 * 2. ID発行（新規の場合）
 * 3. STEP 0: トリアージ（検尿判断）
 * 4. STEP 1: 待ち時間案内
 * 5. タイピング（紙保険証の場合）← 保険証情報入力
 * 6. STEP 2: 受付票への記入
 * 7. 受付完了
 * 
 * 患者構成:
 * - 患者1: 紙保険証 + 検尿 + 新規ID発行
 * - 患者2: マイナ保険証 + 問診票
 * - 患者3: 後期高齢者 + カルテ棚
 */

export const TutorialSteps = [
    // ==========================================
    // Phase 1: 導入 & 患者1 (紙保険証・検尿・新規ID)
    // ==========================================
    {
        id: 'intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '新人さん、今日からよろしくね！\n私は指導役の「トリアージ」よ\n(クリックまたはEnterで進む)',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'game_overview',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '病院の受付スタッフとして働くゲームよ\n患者さんを正確に・素早く対応してスコアを稼いでね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'patient_order_rule',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '💡 ポイント: 順番通りに対応するとボーナス！\n飛ばすと-10点のペナルティよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // --- 患者1: 呼び出し ---
    {
        id: 'select_patient_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '早速だけど、最初の患者さんが来てるわ\nクリックして呼び出して！',
        speaker: 'トリアージさん',
        targetButton: 'patient_first',
        arrow: { direction: 'up', offset: { x: 0, y: 80 } },
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'paper_insurance_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この人は「紙の保険証」ね\nまだ診察券（ID）を持っていないみたい',
        speaker: 'トリアージさん',
        targetButton: 'insurance_card',
        completeOn: 'NEXT_CLICK'
    },
    // --- ID発行 ---
    {
        id: 'click_new_id_button',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'まずはIDを発行する必要があるわ\n「新規IDを発行する」を押して！',
        speaker: 'トリアージさん',
        targetButton: 'new_id_button',
        completeOn: 'NEW_ID_CLICKED'
    },
    // --- STEP 0: トリアージ ---
    {
        id: 'triage_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は「トリアージ」よ！\n患者さんの訴えを聞いて対応を決めるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'urine_test_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '「尿が近い」という主訴ね…\nこれは検尿が必要よ！「検尿カップを渡す」を選んで',
        speaker: 'トリアージさん',
        targetButton: 'triage_urology',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_triage_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '主訴と対応の関係を覚えてね\n間違えると-10点よ！',
        speaker: 'トリアージさん',
        targetButton: 'triage_urology',
        completeOn: 'TRIAGE_SELECTED'
    },
    // --- STEP 1: 待ち時間案内 ---
    {
        id: 'wait_time_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '待ち時間の案内も忘れずにね\n計算式は「待ち人数 × 6分」よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_wait_time_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '今は1人待ちだから…\n1人 × 6分 = 6分 よ！',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_6min',
        completeOn: 'WAIT_TIME_SELECTED'
    },
    // --- タイピング（待ち時間の後！）---
    {
        id: 'typing_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '紙の保険証は情報を手入力する必要があるの\n「入力を開始」を押してタイピングを始めて！',
        speaker: 'トリアージさん',
        targetButton: 'typing_start_button',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'typing_detail',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '📝 入力項目は…\n・記号、番号、枝番\n・氏名（フリガナ）\n・年齢、性別、負担割合\n・保険者番号、保険種別よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // 入力開始とタイピング待機を一つのフローに
    {
        id: 'typing_start',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '「入力を開始」を押してね\n保険証を見ながら正確に入力！',
        speaker: 'トリアージさん',
        targetButton: 'typing_start_button',
        completeOn: 'TYPING_STARTED'
    },
    {
        id: 'typing_wait',
        phase: 1,
        scene: 'TypingScene',
        action: 'wait',
        message: 'タイピング入力中...\n焦らず正確に！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'TYPING_COMPLETED'
    },
    // --- STEP 2: 受付票への記入（受付完了）---
    {
        id: 'reception_form_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は受付票の作成よ！\n患者さんの情報を正しく記入してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_id',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'まずはIDを入力してね\n患者さんのIDを確認して記入！',
        speaker: 'トリアージさん',
        targetButton: 'id_input_area',
        completeOn: 'ID_ENTERED'
    },
    {
        id: 'reception_form_name',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '次に名前を入力してね\nクリックして入力を開始！',
        speaker: 'トリアージさん',
        targetButton: 'name_input_area',
        completeOn: 'NAME_ENTERED'
    },
    {
        id: 'reception_form_insurance_guide',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '保険証の種類を選んでね\n「保険証」か「マイナ」をクリック！',
        speaker: 'トリアージさん',
        targetButton: 'radio_paper', // どちらかを示す
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_insurance',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '保険証の種類を選択！',
        speaker: 'トリアージさん',
        targetButton: null, // 両方OKなので矢印なし（または点滅なし）
        completeOn: 'INSURANCE_SELECTED'
    },
    {
        id: 'reception_form_urine_guide',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '検尿が必要ならチェックを入れてね\n今回の患者さんは…？',
        speaker: 'トリアージさん',
        targetButton: 'urine_checkbox',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_urine',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '検尿が必要なのでチェック！',
        speaker: 'トリアージさん',
        targetButton: 'urine_checkbox',
        completeOn: 'URINE_CHECKED'
    },
    {
        id: 'reception_complete_guide',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '入力できたら確認して\n「受付完了」ボタンを押してね！',
        speaker: 'トリアージさん',
        targetButton: 'reception_complete_button',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_complete_click',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '「受付完了」を押して受付終了！',
        speaker: 'トリアージさん',
        targetButton: 'reception_complete_button',
        completeOn: 'RECEPTION_COMPLETED'
    },
    {
        id: 'patient1_complete',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '患者1の受付完了！\nこの調子で次の患者さんも対応しましょう',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 2: 患者2 (マイナ保険証・問診票)
    // ==========================================
    {
        id: 'phase2_start',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は「マイナ保険証」の患者さんよ\nデータが自動で入るから楽なの！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_patient_2',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'さあ、次の患者さんを呼んで！',
        speaker: 'トリアージさん',
        targetButton: 'patient_first',
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'mynumber_check',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'ほら見て！ マイナカードだとデータが自動で入ってくるわ\n入力不要、これがデジタルの力よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'questionnaire_intro',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'あ、この患者さんは初診ね\n「問診票」アイコン(🔔)が出るまで待つのよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // トリアージ & 待ち時間
    {
        id: 'triage_phase2',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: '主訴を確認して…トリアージを選んで！',
        speaker: 'トリアージさん',
        targetButton: 'triage_urology',
        completeOn: 'TRIAGE_SELECTED'
    },
    {
        id: 'wait_time_phase2',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: '待ち人数を確認して案内してね\n計算式は同じ「人数 × 6分」よ',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_2hours',
        completeOn: 'WAIT_TIME_SELECTED'
    },
    {
        id: 'patient2_complete',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: '患者2の受付も完了！\nもう1人対応してから会計に進むわよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 3: 患者3 (後期高齢者・カルテ棚)
    // ==========================================
    {
        id: 'phase3_start',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '最後は「再診」の患者さん\nカルテ棚まで走るわよ、ついてきて！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_patient_3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'これが最後の患者さんよ\n気合入れていきましょ！',
        speaker: 'トリアージさん',
        targetButton: 'patient_first',
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'elderly_intro',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '保険証は「国保」だけど…年齢を見て！\n72歳…ここが落とし穴よ',
        speaker: 'トリアージさん',
        targetButton: 'insurance_card',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'late_elderly_rule',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '⚠️ 重要: 70歳以上は「後期高齢者」として扱うの\n負担割合が1割になるから会計時に注意！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // トリアージ & 待ち時間
    {
        id: 'triage_phase3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '主訴を確認して…トリアージを選んで！',
        speaker: 'トリアージさん',
        targetButton: 'triage_urology',
        completeOn: 'TRIAGE_SELECTED'
    },
    {
        id: 'wait_time_phase3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '待ち人数を確認！\n計算して時間を選んでね',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_1hour',
        completeOn: 'WAIT_TIME_SELECTED'
    },
    // タイピング（紙保険証なので必要）
    {
        id: 'typing_phase3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'この患者さんも紙保険証ね\nタイピングで情報を入力して！',
        speaker: 'トリアージさん',
        targetButton: 'typing_start_button',
        completeOn: 'TYPING_STARTED'
    },
    {
        id: 'typing_wait_phase3',
        phase: 3,
        scene: 'TypingScene',
        action: 'wait',
        message: '画面に表示される文字を入力してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'TYPING_COMPLETED'
    },
    // カルテ棚へ
    {
        id: 'go_to_shelf',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '再診だからカルテが必要ね\n「カルテ棚」へGo！',
        speaker: 'トリアージさん',
        targetButton: 'shelf_button',
        completeOn: 'SHELF_SCENE_ENTERED'
    },
    // ShelfScene
    {
        id: 'shelf_tab_intro',
        phase: 3,
        scene: 'ShelfScene',
        action: 'info',
        message: 'ここがカルテ棚\n保険の種類で棚が分かれているの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_shelf_tab',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: 'さっきの人は72歳…つまり「後期高齢者」！\n国保じゃなくて「後期」タブを選んで！',
        speaker: 'トリアージさん',
        targetButton: 'tab_late_elderly',
        completeOn: 'SHELF_TAB_SELECTED'
    },
    {
        id: 'search_file',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '患者IDの背表紙を探して！\n見つけたらクリックして',
        speaker: 'トリアージさん',
        targetButton: 'file_spine_target',
        completeOn: 'FILE_SELECTED'
    },
    {
        id: 'get_file',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '中身を確認したら\n「GET」ボタンで確保よ！',
        speaker: 'トリアージさん',
        targetButton: 'file_get_button',
        completeOn: 'FILE_RETRIEVED'
    },
    {
        id: 'reception_complete',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '受付研修は完了！\n3人分の受付が終わったわ\n次は「会計準備」のCheckSceneよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 4: CheckScene (会計準備)
    // ==========================================
    {
        id: 'check_intro',
        phase: 4,
        scene: 'CheckScene',
        action: 'info',
        message: 'ここは「会計準備」シーン\n処方箋チェックと印鑑押印が主な仕事よ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_list_intro',
        phase: 4,
        scene: 'CheckScene',
        action: 'info',
        message: '左の待ちリストから患者を選んでね\n順番通りに処理するのが基本よ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'prescription_intro',
        phase: 4,
        scene: 'CheckScene',
        action: 'info',
        message: '処方箋にエラーがないか確認して！\n見逃すと-40点の大減点よ…',
        speaker: 'トリアージさん',
        targetButton: 'prescription_panel',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'stamp_intro',
        phase: 4,
        scene: 'CheckScene',
        action: 'info',
        message: '確認したら印鑑を押してね\n押し忘れると-20点よ！',
        speaker: 'トリアージさん',
        targetButton: 'stamp_button',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'stamp_press',
        phase: 4,
        scene: 'CheckScene',
        action: 'click',
        message: '印鑑ボタンを押して！',
        speaker: 'トリアージさん',
        targetButton: 'stamp_button',
        completeOn: 'STAMP_PRESSED'
    },
    {
        id: 'insurance_verify_intro',
        phase: 4,
        scene: 'CheckScene',
        action: 'info',
        message: '紙保険証の患者は「保険証確認」が必須！\nマイナカードの人は不要よ',
        speaker: 'トリアージさん',
        targetButton: 'insurance_confirm_button',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_proceed',
        phase: 4,
        scene: 'CheckScene',
        action: 'click',
        message: '確認が終わったら「会計へ進む」を押して！',
        speaker: 'トリアージさん',
        targetButton: 'check_ok_button',
        completeOn: 'CHECK_OK_CLICKED'
    },

    // ==========================================
    // Phase 5: PaymentScene (会計)
    // ==========================================
    {
        id: 'payment_intro',
        phase: 5,
        scene: 'PaymentScene',
        action: 'info',
        message: '最後はお会計！ 計算式を覚えてね\n「合計点数 × 10円 × 負担割合」よ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_calc_intro',
        phase: 5,
        scene: 'PaymentScene',
        action: 'info',
        message: '例: 点数500点、3割負担の場合\n500 × 10 × 0.3 = 1500円 になるわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_input',
        phase: 5,
        scene: 'PaymentScene',
        action: 'input',
        message: 'テンキーで金額を入力してね\n間違えたらCでクリアよ',
        speaker: 'トリアージさん',
        targetButton: 'numpad_area',
        completeOn: 'PAYMENT_COMPLETED'
    },
    {
        id: 'reservation_intro',
        phase: 5,
        scene: 'PaymentScene',
        action: 'info',
        message: '既往歴に「癌」「高血圧」「糖尿病」などがある患者は\n次回予約が必須よ！忘れると-40点',
        speaker: 'トリアージさん',
        targetButton: 'reservation_button_14',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'combo_intro',
        phase: 5,
        scene: 'PaymentScene',
        action: 'info',
        message: '連続で正確に処理するとコンボボーナス！\nミスするとリセットされちゃうから注意ね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // チュートリアル完了
    // ==========================================
    {
        id: 'tutorial_finish',
        phase: 5,
        scene: 'PaymentScene',
        action: 'info',
        message: 'お疲れ様！ これで研修は修了よ\n本番でもその調子で頑張ってね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'TUTORIAL_END'
    }
];

// Phase定義もエクスポート
export const TutorialPhases = {
    PHASE1_PATIENT1: 1,       // 患者1: 紙保険証・検尿・新規ID
    PHASE2_PATIENT2: 2,       // 患者2: マイナ・問診票
    PHASE3_PATIENT3: 3,       // 患者3: 後期高齢者・カルテ棚
    PHASE4_CHECK: 4,          // CheckScene
    PHASE5_PAYMENT: 5         // PaymentScene
};
