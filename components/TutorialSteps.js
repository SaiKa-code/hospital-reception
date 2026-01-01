/**
 * TutorialSteps.js - チュートリアルステップ定義（新フロー版）
 * 
 * 新しいフロー:
 * 1. 患者1: 基本操作（完全に受付完了）
 * 2. 患者2: 問診票を渡して待機 → 患者3へ切り替え
 * 3. 患者3: カルテ棚へ → 戻ってくる
 * 4. 患者2: 問診完了、残りの処理
 * 5. 患者3: 残りの処理
 * 6. チェック・支払いシーン（全員）
 * 
 * 実際のイベント名（ReceptionScene.jsより）:
 * - PATIENT_CLICKED: 患者選択
 * - NEW_ID_CLICKED: 新規ID発行
 * - MYNUMBER_CONFIRMED: マイナ認証
 * - QUESTIONNAIRE_GIVEN: 問診票を渡す
 * - QUESTIONNAIRE_OPENED: 問診票を見る
 * - TRIAGE_SELECTED: トリアージ選択
 * - WAIT_TIME_SELECTED: 待ち時間選択
 * - TYPING_STARTED: タイピング開始
 * - TYPING_COMPLETED: タイピング完了
 * - ID_ENTERED, NAME_ENTERED, INSURANCE_SELECTED, URINE_CHECKED: 受付票
 * - RECEPTION_COMPLETED: 受付完了
 * - SHELF_SCENE_ENTERED: カルテ棚へ移動
 */

export const TutorialSteps = [
    // ==========================================
    // Phase 1: 導入 & 患者1 (基本操作学習)
    // ==========================================
    {
        id: 'intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'ようこそ！首切クリニック受付へ\nこれから受付の仕事を教えるわね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'intro_flow',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '受付の流れは…\n1. 保険証確認 → 2. トリアージ → 3. 受付票作成',
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
        targetButton: 'patient_0',
        completeOn: 'PATIENT_CLICKED'
    },
    // --- 保険証確認 ---
    {
        id: 'insurance_intro_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この人は「紙の保険証」ね\nまだ診察券（ID）を持っていないみたい',
        speaker: 'トリアージさん',
        targetButton: 'insurance_card',
        completeOn: 'NEXT_CLICK'
    },
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
    // --- 検尿・待ち時間案内 ---
    {
        id: 'triage_intro_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は「検尿・待ち時間案内」よ！\n患者さんの訴えを聞いて対応を決めるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'insurance_guide_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '💡 その前に保険証の見分け方を教えるわね！\n迷ったら「保険種別ガイド」を見てね',
        speaker: 'トリアージさん',
        targetButton: 'insurance_guide_panel',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'insurance_shakai',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '📘 社保（青）: 保険者番号8桁\n会社員とその家族が加入しているわ',
        speaker: 'トリアージさん',
        targetButton: 'insurance_guide_panel',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'insurance_kokuho',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '📕 国保（赤）: 保険者番号6桁\n自営業・無職の方などが加入するの',
        speaker: 'トリアージさん',
        targetButton: 'insurance_guide_panel',
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'insurance_elderly',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '📗 後期高齢者（紫）: 75歳以上の方\n70〜74歳も院内は後期高齢者扱いよ！',
        speaker: 'トリアージさん',
        targetButton: 'insurance_guide_panel',
        completeOn: 'NEXT_CLICK'
    },
    // --- 検尿の判断基準説明 ---
    {
        id: 'urine_test_intro',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は検尿の判断について教えるわね\n患者さんの症状によって必要かどうか決めるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'urine_test_needed',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【検尿が必要なケース】\n排尿痛、血尿、頻尿、腰痛（結石疑い）\n精液に血、精巣の痛み、陰部の打撲',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'urine_test_needed_2',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【検尿が必要な状況】\n性病・結石の既往歴（毎回必要）\n生検結果聞き、カテーテル抜去後の確認など',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'urine_test_not_needed',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【検尿が不要なケース】\nED（勃起不全）、男性更年期障害\n陰部のかゆみ、皮膚表面のみのトラブル',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'urine_test_rule',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【鉄則】迷ったら検尿をお願いする！\nこれが基本ルールよ。覚えておいてね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'triage_select_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'この患者さんの主訴は「排尿時に痛む」\n排尿痛だから検尿が必要ね！',
        speaker: 'トリアージさん',
        targetButton: 'triage_urine_button',
        completeOn: 'TRIAGE_SELECTED'
    },
    // --- 待ち時間案内 ---
    {
        id: 'wait_time_intro_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '待ち時間の案内も忘れずにね\n計算式は「待ち人数 × 6分」よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'wait_time_select_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '今は1人待ちだから…\n1人 × 6分 = 6分 よ！',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_6min',
        completeOn: 'WAIT_TIME_SELECTED',
        arrow: { direction: 'left', offset: { x: -250, y: 0 } }
    },
    // --- タイピング入力 ---
    {
        id: 'typing_intro_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は保険証情報をパソコンに入力するわ\n保険証を見ながら正確に！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'typing_start_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '「入力を開始」を押して！',
        speaker: 'トリアージさん',
        targetButton: 'typing_start_button',
        completeOn: 'TYPING_STARTED'
    },
    {
        id: 'typing_wait_1',
        phase: 1,
        scene: 'TypingScene',
        action: 'wait',
        message: 'タイピング入力中...',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'TYPING_COMPLETED'
    },
    // --- 受付票・カルテの説明 ---
    {
        id: 'reception_form_explain_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次は受付票の作成について説明するわね\n患者さんの状況によって対応が変わるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_explain_2',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【受付票を使うケース】\n・新規患者（初診）の場合\n・電子カルテに移行した患者の場合',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_explain_3',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '【カルテを使うケース】\n紙カルテがある再診患者の場合\nカルテ棚からカルテを持ってくるのよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_explain_4',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この患者さんは新規だから\n受付票を作成するわね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // --- 受付票作成 ---
    {
        id: 'reception_form_intro_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '受付票に患者さんの情報を\n正しく記入してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_form_id_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'まずはIDを入力してね',
        speaker: 'トリアージさん',
        targetButton: 'id_input_area',
        completeOn: 'ID_ENTERED'
    },
    {
        id: 'reception_form_name_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '次に名前を入力してね',
        speaker: 'トリアージさん',
        targetButton: 'name_input_area',
        completeOn: 'NAME_ENTERED'
    },
    {
        id: 'reception_form_insurance_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '保険証の種類を選んでね',
        speaker: 'トリアージさん',
        targetButton: 'radio_paper',
        completeOn: 'INSURANCE_SELECTED'
    },
    {
        id: 'reception_form_urine_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '検尿が必要なのでチェック！',
        speaker: 'トリアージさん',
        targetButton: 'urine_checkbox',
        completeOn: 'URINE_CHECKED'
    },
    {
        id: 'reception_complete_1',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'click',
        message: '「受付完了」を押して終了！',
        speaker: 'トリアージさん',
        targetButton: 'reception_complete_button',
        completeOn: 'RECEPTION_COMPLETED'
    },
    {
        id: 'patient1_done',
        phase: 1,
        scene: 'ReceptionScene',
        action: 'info',
        message: '患者1の受付完了！\nこれが基本の流れよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 2: 患者2 開始（問診票待ち）
    // ==========================================
    {
        id: 'phase2_intro',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: '次の患者さんを対応しましょう\n今度は「問診票」が必要なケースよ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_patient_2',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: '患者リストから2番目の患者さんを選んで！',
        speaker: 'トリアージさん',
        targetButton: 'patient_1',
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'myna_intro',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この人は「マイナ保険証」ね\n認証は済んでいるから、次へ進むわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'new_id_2',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: '新規患者なのでIDを発行して！',
        speaker: 'トリアージさん',
        targetButton: 'new_id_button',
        completeOn: 'NEW_ID_CLICKED'
    },
    // --- 問診票を渡す ---
    {
        id: 'questionnaire_intro',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この患者さんは主訴が表示されていない…\n問診票に記入してもらう必要があるわ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'questionnaire_give',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'click',
        message: '問診票を渡して「記入をお願いします」！',
        speaker: 'トリアージさん',
        targetButton: 'questionnaire_button',
        completeOn: 'QUESTIONNAIRE_GIVEN'
    },
    {
        id: 'questionnaire_wait_notice',
        phase: 2,
        scene: 'ReceptionScene',
        action: 'info',
        message: '問診票の記入中です...\n待っている間に次の患者さんを対応しましょう！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 3: 患者3 開始（カルテ取り）
    // ==========================================
    {
        id: 'phase3_intro',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '患者2さんが記入中の間に\n3番目の患者さんを対応するわよ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // 🆕 パネルを閉じるステップを追加
    {
        id: 'close_panel_before_p3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '他の患者さんを呼ぶために\n一旦パネルを閉じて！',
        speaker: 'トリアージさん',
        targetButton: 'panel_close_button',
        completeOn: 'PANEL_CLOSED',
        arrow: { direction: 'left', offset: { x: -30, y: 0 } }
    },
    {
        id: 'select_patient_3',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '患者リストから3番目の患者さんを選んで！',
        speaker: 'トリアージさん',
        targetButton: 'patient_2',
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'returning_patient_intro',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この人は「再診」の患者さん\n既にIDを持っているわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // --- まずトリアージと待ち時間 ---
    {
        id: 'triage_3_hint',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '主訴を確認…排尿障害ね\nさて、この患者さんにはどの対応が必要かしら？',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'triage_3_first',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '検尿が必要な患者さんね！\n正しい保険種別を選んで！',
        speaker: 'トリアージさん',
        targetButton: 'triage_urine_button',
        completeOn: 'TRIAGE_SELECTED',
        // 特別フラグ: 間違えた場合のメッセージ
        wrongAnswerHint: '💡 70歳以上の患者さんは\n社保・国保に関係なく後期高齢者扱いなの！'
    },
    {
        id: 'triage_3_correct_feedback',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'さすがT橋家技大生！！よく覚えていたわね✨\nこの患者さんは70歳を超えているから\n後期高齢者扱いなの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'age_rule_explain',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '💡 重要だからもう一度言うわね。\n70〜74歳の患者さんは院内では「後期高齢者」として扱うわ！\n忘れないでね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'wait_time_3_first',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '待ち時間を案内して！\n11人待ちだから…約1時間を選んで',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_1hour',
        completeOn: 'WAIT_TIME_SELECTED'
        // 🆕 1人目以降は矢印を非表示
    },
    // --- カルテが必要 → メモ → カルテ棚へ ---
    {
        id: 'shelf_intro',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: '一部の再診患者はカルテが必要よ！\nカルテ棚に取りに行きましょう',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'memo_explain',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'その前に忘れないように患者情報をメモしておいて！\n「＋」を押してメモに追加！',
        speaker: 'トリアージさん',
        targetButton: 'memo_add_button',
        arrow: { direction: 'up', offset: { x: 0, y: 0 } },
        completeOn: 'MEMO_ADDED'
    },
    {
        id: 'memo_optional_note',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'そうね....記憶力に自信があるなら\n別にメモはしなくてもOKよ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'memo_hud_explain',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: '📝 保存したメモは画面上の「メモ」ボタンから確認できるわ！\nクリックして開いてみて！',
        speaker: 'トリアージさん',
        targetButton: 'hud_memo_button',
        arrow: { direction: 'down', offset: { x: 0, y: 0 } },
        completeOn: 'HUD_MEMO_CLICKED',
        messagePosition: 'bottom'
    },
    // 🆕 カルテ棚へ行く前にパネルを閉じる
    {
        id: 'close_panel_for_shelf',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'カルテ棚ボタンを押すために\n一旦パネルを閉じて！',
        speaker: 'トリアージさん',
        targetButton: 'panel_close_button',
        completeOn: 'PANEL_CLOSED',
        arrow: { direction: 'left', offset: { x: -30, y: 0 } }
    },
    {
        id: 'go_to_shelf',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'それじゃカルテ棚に取りに行きましょう\n「カルテ棚」ボタンを押して！',
        speaker: 'トリアージさん',
        targetButton: 'shelf_button',
        completeOn: 'SHELF_SCENE_ENTERED'
    },
    // --- カルテ棚 ---
    {
        id: 'shelf_explain',
        phase: 3,
        scene: 'ShelfScene',
        action: 'info',
        message: 'ここがカルテ棚よ！\n左のタブで保険種別を切り替えるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'shelf_age_rule',
        phase: 3,
        scene: 'ShelfScene',
        action: 'info',
        message: '💡 この患者さんは72歳で「国保」ね\n院内では後期高齢者として扱うけど\nカルテは「国保」タブに保管されているわ',
        speaker: 'トリアージさん',
        targetButton: 'tab_kokuho', // 追加: タブを指すようにする
        arrow: { direction: 'down' },
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'shelf_tab_click',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '「国保」タブをクリックして！',
        speaker: 'トリアージさん',
        targetButton: 'tab_kokuho',
        completeOn: 'SHELF_TAB_SELECTED'
    },
    {
        id: 'shelf_search',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '患者ID「1020」の背表紙を探して！',
        speaker: 'トリアージさん',
        targetButton: 'file_spine_1020',
        completeOn: 'FILE_SELECTED',
        arrow: { direction: 'down' },
        messagePosition: 'bottom'  // カルテが見えるように下部に表示
    },
    {
        id: 'shelf_take',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '「カルテを取る」を押して！',
        speaker: 'トリアージさん',
        targetButton: 'take_file_button',
        completeOn: 'FILE_RETRIEVED'
    },
    {
        id: 'return_to_reception',
        phase: 3,
        scene: 'ShelfScene',
        action: 'click',
        message: '受付に戻るわよ！',
        speaker: 'トリアージさん',
        targetButton: 'back_button',
        completeOn: 'SHELF_RETURNED',
        messagePosition: 'bottom'
    },
    {
        id: 'after_shelf',
        phase: 3,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'カルテを取ってきたわ！\n患者2さんの問診が終わるまで待ちましょう',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 4: 患者2 再開（問診完了後）
    // ==========================================
    {
        id: 'questionnaire_done_wait',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'wait',
        message: '問診票完了待ち...',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'QUESTIONNAIRE_FINISHED'
    },
    {
        id: 'questionnaire_done_notice',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'info',
        message: '💡 患者2さんの問診票が完成したわ！\n患者リストから呼び出して！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_patient_2_again',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'click',
        message: '患者2を選んで！',
        speaker: 'トリアージさん',
        // 🚨 修正: ShelfSceneからの復帰で再レンダリングされ、P1不在のためP2はindex 0になる
        targetButton: 'patient_0', 
        completeOn: 'PATIENT_CLICKED'
    },
    {
        id: 'triage_2',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'click',
        message: '主訴がわかったわね\nED治療だから検尿はどうかしら？',
        speaker: 'トリアージさん',
        targetButton: 'triage_none_button',
        completeOn: 'TRIAGE_SELECTED'
    },
    {
        id: 'wait_time_2',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'この患者さんの前には待ってる人も多いわね…',
        speaker: 'トリアージさん',
        targetButton: 'wait_time_2hours',
        completeOn: 'WAIT_TIME_SELECTED'
        // 🆕 1人目以降は矢印を非表示
    },
    {
        id: 'typing_start_2',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'info',
        message: 'この患者さんはマイナンバーだから初診でもタイピングをする必要がないわ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'reception_complete_2',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'click',
        message: 'あとは受付票を完成させて「受付完了」！',
        speaker: 'トリアージさん',
        targetButton: 'reception_complete_button',
        completeOn: 'RECEPTION_COMPLETED'
    },
    {
        id: 'patient2_done',
        phase: 4,
        scene: 'ReceptionScene',
        action: 'info',
        message: '患者2の受付完了！\n問診待ちでも効率よく対応できたわね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 5: 患者3 再開
    // ==========================================
    {
        id: 'phase5_intro',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'info',
        message: '最後は患者3さんの残りの処理よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'select_patient_3_again',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'click',
        message: '患者3を選んで！',
        speaker: 'トリアージさん',
        // 🚨 修正: ShelfSceneからの復帰時、P3はindex 1 (P2がいるため)
        // その後P2が消えてもボタンIDは変わらない
        targetButton: 'patient_1',
        completeOn: 'PATIENT_CLICKED'
    },
    // --- カルテ操作説明 ---
    {
        id: 'karte_open_click',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'click',
        message: '「カルテを開く」をクリックして！',
        speaker: 'トリアージさん',
        targetButton: 'karte_open_button',
        completeOn: 'KARTE_OPENED'
    },
    {
        id: 'karte_open_explain',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'info',
        message: '紙のカルテにはIDと名前を書く必要がないわ\n代わりに日付のスタンプを押す必要があるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'karte_stamp_explain',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'info',
        message: '検尿をとったら検尿スタンプも忘れないようにね\n間違えたときはもう一回クリックして修正してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    // --- カルテスタンプ → 受付完了 ---
    {
        id: 'karte_complete_3',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'click',
        message: '完成したら受付完了ボタンを押して\n「受付完了」よ！！',
        speaker: 'トリアージさん',
        targetButton: 'reception_complete_button',
        completeOn: 'RECEPTION_COMPLETED'
    },
    {
        id: 'all_reception_done',
        phase: 5,
        scene: 'ReceptionScene',
        action: 'info',
        message: '🎉 3人全員の受付完了！\n次はチェック・支払いシーンよ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },

    // ==========================================
    // Phase 6: チェック・支払いシーン
    // ==========================================
    {
        id: 'go_to_check',
        phase: 6,
        scene: 'ReceptionScene',
        action: 'click',
        message: '処方箋確認へ移動！',
        speaker: 'トリアージさん',
        targetButton: 'check_button',
        completeOn: 'CHECK_SCENE_ENTERED',
        arrow: { direction: 'right', offset: { x: 0, y: 0 } }
    },
    {
        id: 'check_scene_intro',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: 'ここは「チェックシーン」\n処方箋と会計を確認するわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_select_patient',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: 'まずは左のリストから\n患者さんを選択してね',
        speaker: 'トリアージさん',
        targetButton: 'patient_item_0',
        completeOn: 'PATIENT_SELECTED_IN_CHECK',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_prescription_check',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '真ん中にカルテと処方箋が表示されたわね\n内容に間違いがないか確認して！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_prescription_error_hint',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '💡 この患者さんの処方箋には1つ間違いがあるわ。\n薬辞典を使って見つけてみて！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK',
        skipIf: 'PRESCRIPTION_ERROR_ALREADY_REPORTED' // 🆕 既にエラー発見済みならスキップ
    },
    {
        id: 'check_medicine_dict_intro',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '処方内容の確認には\n右下の「薬辞典」を使って！',
        speaker: 'トリアージさん',
        targetButton: 'medicine_list_button',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_open_dict',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: 'クリックして開いてみて！',
        speaker: 'トリアージさん',
        targetButton: 'medicine_list_button',
        completeOn: 'MEDICINE_DICTIONARY_OPENED',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_dict_desc_generic',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '薬には「商品名」と「一般名」があるの。\nカルテには「商品名」が書かれているわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_dict_desc_check',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '薬辞典を読んで、処方箋の「一般名」が合っているかチェックしてね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_dict_desc',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: 'あと、一回に飲む量とタイミングもここで確認できるわ、ここも忘れずにチェックして！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_close_dict',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '確認が終わったら、右上の✕ボタンで閉じてね。\nでは処方箋をチェックしてみましょう！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_click_error_drug',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '処方箋の中から間違っている薬を\nクリックして報告して！',
        speaker: 'トリアージさん',
        targetButton: 'prescription_item_error',
        completeOn: 'PRESCRIPTION_ERROR_REPORTED',
        arrow: { direction: 'left' },
        skipIf: 'PRESCRIPTION_ERROR_ALREADY_REPORTED' // 🆕 既にエラーをクリック済みならスキップ
    },
    {
        id: 'check_reprint_prescription',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: 'よく見つけたわ！\n「処方箋を再印刷」ボタンを押して新しい処方箋に！',
        speaker: 'トリアージさん',
        targetButton: 'reprint_button',
        completeOn: 'PRESCRIPTION_REPRINTED',
        arrow: { direction: 'up' }
    },
    {
        id: 'check_stamp_guide',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '新しい処方箋ができたわ！\n印鑑をポン！と押して承認して',
        speaker: 'トリアージさん',
        targetButton: 'stamp_button',
        completeOn: 'STAMP_PRESSED',
        arrow: { direction: 'up', offset: { x: 0, y: 50 } }
    },
    {
        id: 'check_tab_switch_intro',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '💡 処方箋の隣に「領収証」タブがあるわ！\nここで保険区分を確認できるの',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_click_receipt_tab',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '「領収証」タブをクリックしてみて！',
        speaker: 'トリアージさん',
        targetButton: 'receipt_tab',
        completeOn: 'RECEIPT_TAB_CLICKED',
        arrow: { direction: 'down' }
    },
    {
        id: 'check_receipt_insurance_guide',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '💡 領収証に「保険区分」が書いてあるわね！\nこの情報を元に、正しい保険証を選んでね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_karte_color_explain',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '💡 ちなみに、カルテの患者さんは\n「カルテの色」でも判断できるの！\n青＝社保、緑＝国保、紫＝後期高齢者よ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_click_paper_tab',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '今回は「マイナカード」ではないわ。\nまずは「保険証を探す」タブをクリックして！',
        speaker: 'トリアージさん',
        targetButton: 'insurance_paper_tab',
        completeOn: 'INSURANCE_PAPER_TAB_CLICKED',
        arrow: { direction: 'down' }
    },
    {
        id: 'check_insurance_intro',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: 'ボタンが出てきたわね！\n「保険証を確認」ボタンを押して！',
        speaker: 'トリアージさん',
        targetButton: 'check_insurance_button',
        completeOn: 'INSURANCE_MODAL_OPENED',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_select_shaho',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '今回の患者さんは社会保険よ。\n「社会保険」を選択して',
        speaker: 'トリアージさん',
        targetButton: 'insurance_type_shaho',
        completeOn: 'INSURANCE_CARD_OPENED',
        arrow: { direction: 'down' }
    },
    {
        id: 'check_insurance_shown',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: 'これが今回の患者の保険証ね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_confirm_insurance',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '確認したら「この保険証で確認」ボタンを押して\n承認しましょう',
        speaker: 'トリアージさん',
        targetButton: 'insurance_confirm_button',
        completeOn: 'INSURANCE_CARD_CONFIRMED',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_return_card_intro',
        phase: 6,
        scene: 'CheckScene',
        action: 'info',
        message: '確認できたら、患者さんに保険証を返却してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_go_payment',
        phase: 6,
        scene: 'CheckScene',
        action: 'click',
        message: '準備ができたら「会計へ進む」ボタンをクリック！',
        speaker: 'トリアージさん',
        targetButton: 'check_ok_button',
        completeOn: 'PAYMENT_SCENE_ENTERED',
        arrow: { direction: 'right' }
    },
    {
        id: 'payment_intro',
        phase: 6,
        scene: 'PaymentScene',
        action: 'info',
        message: 'ここはお会計シーン。\n患者さんに請求する金額を確定させるわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_check_receipt',
        phase: 6,
        scene: 'PaymentScene',
        action: 'info',
        message: '真ん中の領収書を見て。\n今回請求する金額が表示されてるわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_input_guide',
        phase: 6,
        scene: 'PaymentScene',
        action: 'info',
        message: '右側のテンキーで、正しい金額を入力して！',
        speaker: 'トリアージさん',
        targetButton: 'numpad_area',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'left' }
    },
    {
        id: 'payment_check_receipt_insurance_type',
        phase: 6,
        scene: 'PaymentScene',
        action: 'info',
        message: '金額を入力したら、保険区分の選択ね！\n保険区分は領収証に書かれているわ！',
        speaker: 'トリアージさん',
        messagePosition: 'bottom',
        targetButton: 'payment_receipt_insurance_type',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'left', offset: { x: -20, y: 0 } }
    },
    {
        id: 'payment_check_input_insurance',
        phase: 6,
        scene: 'PaymentScene',
        action: 'click',
        message: '今回は「社保」ね',
        speaker: 'トリアージさん',
        messagePosition: 'bottom',
        targetButton: 'payment_insurance_shaho',
        completeOn: 'PAYMENT_INSURANCE_SELECTED',
        arrow: { direction: 'top' }
    },
    {
        id: 'payment_reservation_explain',
        phase: 6,
        scene: 'PaymentScene',
        action: 'info',
        message: '最後に次回予約を確認よ。\nこの患者さんは初診だから予約不要よ！\n「予約しない」でOK！',
        speaker: 'トリアージさん',
        targetButton: 'reservation_button_0',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'top' }
    },
    {
        id: 'payment_submit',
        phase: 6,
        scene: 'PaymentScene',
        action: 'click',
        message: '入力できたら「会計完了」ボタンを押して終了！',
        speaker: 'トリアージさん',
        targetButton: 'payment_ok_button',
        completeOn: 'PAYMENT_COMPLETED',
        arrow: { direction: 'left' }
    },

    // ==========================================
    // Phase 7: 患者2 (Check & Payment)
    // ==========================================
    {
        id: 'return_to_reception_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'wait',
        message: '自動的にチェック画面に戻るわ\n少し待ってね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'CHECK_SCENE_ENTERED'
    },
    {
        id: 'go_to_check_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'info',
        message: '戻ってきたわ！\n次の患者さんのチェックへするわよ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_select_patient_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '次の患者さんが待ってるわ。\n上から順に選択してね！',
        speaker: 'トリアージさん',
        targetButton: 'patient_item_0',
        completeOn: 'PATIENT_SELECTED_IN_CHECK',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_prescription_check_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'info',
        message: 'この患者さんは後期高齢者ね。\n負担割合に注意して確認して！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_stamp_guide_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '問題なければ承認！\n印鑑を押してね',
        speaker: 'トリアージさん',
        targetButton: 'stamp_button',
        completeOn: 'STAMP_PRESSED',
        arrow: { direction: 'up', offset: { x: 0, y: 50 } }
    },
    {
        id: 'check_insurance_intro_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'info',
        message: 'この人も保険証ね',
        speaker: 'トリアージさん',
        targetButton: 'check_karte_patient_info', // 登録したカルテ情報
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_insurance_red_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'info',
        message: 'カルテが赤だから国保ね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_click_paper_tab_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: 'まず「保険証を探す」タブをクリック！',
        speaker: 'トリアージさん',
        targetButton: 'insurance_paper_tab',
        completeOn: 'INSURANCE_PAPER_TAB_CLICKED',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_click_search_btn_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '次に「保険証を確認」ボタンをクリック！',
        speaker: 'トリアージさん',
        targetButton: 'check_insurance_button',
        completeOn: 'INSURANCE_MODAL_OPENED',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_select_kokuho_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '国保を選択してね',
        speaker: 'トリアージさん',
        targetButton: 'insurance_type_kokuho',
        completeOn: 'INSURANCE_CARD_OPENED',
        arrow: { direction: 'right' }
    },
    {
        id: 'check_confirm_card_2', // 🆕 カード選択確認ステップ
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '内容を確認したら「この保険証で確認」ボタンを押してね',
        speaker: 'トリアージさん',
        targetButton: 'insurance_confirm_button',
        completeOn: 'INSURANCE_CARD_CONFIRMED',
        arrow: { direction: 'up', offset: { x: 0, y: 50 } }
    },
    {
        id: 'check_return_card_intro_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'info',
        message: '承認したら、保険証とお薬手帳などを忘れずに返却してね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_go_payment_2',
        phase: 7,
        scene: 'CheckScene',
        action: 'click',
        message: '会計へ進むわよ！',
        speaker: 'トリアージさん',
        targetButton: 'check_ok_button',
        completeOn: 'PAYMENT_SCENE_ENTERED',
        arrow: { direction: 'right' }
    },
    // --- 次回予約（患者2: 高血圧）---
    {
        id: 'payment_reservation_intro_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '💡 注意！\n糖尿病などの慢性疾患がある患者さんは\n次回の「予約」が必要よ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_click_karte_tab_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'click',
        message: '【ステップ1】\nまずは「カルテ」タブをクリックして！',
        speaker: 'トリアージさん',
        targetButton: 'payment_karte_tab',
        completeOn: 'PAYMENT_TAB_CLICKED_karte',
        arrow: { direction: 'down' },
        messagePosition: 'bottom'
    },
    {
        id: 'payment_reservation_history_check_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: 'カルテの【既往歴】を確認！\n「糖尿病」があるから予約が必要ね',
        speaker: 'トリアージさん',
        targetButton: null, // カルテ内容エリアを指せればベストだが、一旦なし
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_click_prescription_tab_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'click',
        message: '【ステップ2】\n次に「処方箋」タブをクリックして\n処方日数を確認するわよ！',
        speaker: 'トリアージさん',
        targetButton: 'payment_prescription_tab',
        completeOn: 'PAYMENT_TAB_CLICKED_prescription',
        arrow: { direction: 'down' },
        messagePosition: 'bottom'
    },
    {
        id: 'payment_reservation_days_check_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '薬は28日分ね。\n一番長い日数を基準にするの！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_reservation_rule_explain_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '【ステップ3】 予約日の計算！\n薬が切れる日の「7日前」に予約を取るの！\n例: 28日処方 → 28-7 = 21日後が予約日',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_reservation_closed_day_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '【注意】 休診日に注意！\n木曜日・日曜日・祝日は休診日よ！\n予約日が休診日になる場合はその前後どちらかに予約をとってね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_reservation_click_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'click',
        message: 'じゃあカレンダーを開いて！',
        speaker: 'トリアージさん',
        targetButton: 'reservation_calendar_icon',
        completeOn: 'CALENDAR_OPENED',
        arrow: { direction: 'down' }
    },
    {
        id: 'payment_reservation_select_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'click',
        message: '計算した正解の日付をクリック！',
        speaker: 'トリアージさん',
        targetButton: 'reservation_correct_date',
        completeOn: 'RESERVATION_TOGGLED',
        arrow: { direction: 'down' }
    },
    {
        id: 'payment_insurance_hint_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '⚠️ 保険種別に注意！\n阿部さんは「国保」と表示されているけど\n72歳なので「後期高齢者」を選んでね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_input_guide_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'info',
        message: '金額を入力して会計を完了させて！',
        speaker: 'トリアージさん',
        targetButton: 'numpad_area',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'left' }
    },
    {
        id: 'payment_submit_2',
        phase: 7,
        scene: 'PaymentScene',
        action: 'click',
        message: null,
        speaker: null,
        targetButton: 'payment_ok_button',
        completeOn: 'PAYMENT_COMPLETED',
        arrow: { direction: 'left' },
        hideMessage: true
    },

    // ==========================================
    // Phase 8: 患者3 (Check & Payment)
    // ==========================================
    {
        id: 'return_to_reception_3',
        phase: 8,
        scene: 'PaymentScene',
        action: 'wait',
        message: 'あと一人よ！\nチェック画面に戻るわ',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'CHECK_SCENE_ENTERED'
    },
    {
        id: 'go_to_check_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'info',
        message: '最後の患者さんのチェックへ行くわよ！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_select_patient_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'click',
        message: '最後の患者さんを選択して！',
        speaker: 'トリアージさん',
        targetButton: 'patient_item_0',
        completeOn: 'PATIENT_SELECTED_IN_CHECK',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_prescription_check_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'info',
        message: '今回の患者さんはマイナ保険証ね。\nしっかり確認して！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_stamp_guide_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'click',
        message: '内容を確認したら承認！',
        speaker: 'トリアージさん',
        targetButton: 'stamp_button',
        completeOn: 'STAMP_PRESSED',
        arrow: { direction: 'up', offset: { x: 0, y: 50 } }
    },
    {
        id: 'check_insurance_intro_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'info',
        message: 'この患者さんはマイナ保険証ね。\n「不要（マイナ）」タブになっていればOKよ',
        speaker: 'トリアージさん',
        targetButton: 'check_karte_patient_info',
        completeOn: 'NEXT_CLICK',
        arrow: { direction: 'left' }
    },
    {
        id: 'check_return_card_intro_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'info',
        message: 'マイナだからカードの返却は不要ね',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'check_go_payment_3',
        phase: 8,
        scene: 'CheckScene',
        action: 'click',
        message: '最後の会計へ進むわよ！',
        speaker: 'トリアージさん',
        targetButton: 'check_ok_button',
        completeOn: 'PAYMENT_SCENE_ENTERED',
        arrow: { direction: 'right' }
    },
    // --- 次回予約（患者3: 糖尿病） ---
    {
        id: 'payment_reservation_intro_3',
        phase: 8,
        scene: 'PaymentScene',
        action: 'info',
        message: 'この患者さんは高血圧があるわ。\n予約が必要ね！さっき教えた手順でやってみて！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_free_operation_3',
        phase: 8,
        scene: 'PaymentScene',
        action: 'info',
        message: '自由に操作して会計を完了させてね！\n分からなかったらヘルプボタンを見て！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    },
    {
        id: 'payment_submit_3',
        phase: 8,
        scene: 'PaymentScene',
        action: 'click',
        message: '準備ができたら「会計完了」ボタンを押して！',
        speaker: 'トリアージさん',
        targetButton: 'payment_ok_button',
        completeOn: 'PAYMENT_COMPLETED',
        arrow: { direction: 'left' },
        allowFreeOperation: true,  // 🆕 会計完了ボタン以外は自由操作可能
        hideDialogOnClick: true    // 🆕 クリック時にダイアログを閉じるが矢印は残す
    },

    // ==========================================
    // Phase 9: 完了
    // ==========================================
    {
        id: 'tutorial_finish',
        phase: 9,
        scene: 'CheckScene',
        action: 'info',
        message: 'お疲れ様！ 3人全員の受付から会計まで完了したわ！\nこれで君も一人前の医療事務ね！',
        speaker: 'トリアージさん',
        targetButton: null,
        completeOn: 'NEXT_CLICK'
    }
];

/**
 * 問診票待ちタイマー設定（ミリ秒）
 */
export const QuestionnaireWaitTime = 20000; // 20秒

/**
 * フェーズ名定義（TutorialManagerで使用）
 */
export const TutorialPhases = {
    1: '患者1: 基本操作',
    2: '患者2: 問診票',
    3: '患者3: カルテ棚',
    4: '患者2: 再開',
    5: '患者3: 再開',
    6: '患者1: 会計',
    7: '患者2: 会計',
    8: '患者3: 会計',
    9: 'チュートリアル完了'
};

// 後方互換性のため
export const PhaseNames = TutorialPhases;
