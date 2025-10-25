// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统  v0.6.0
//  作者: Dauvier & ChatGPT
//
//  作用：
//   1. 顶部学士帽按钮（🎓图标还在原位，不会再消失）
//   2. 点击后弹出黑色面板（覆盖层）
//   3. 管理四张核心表并持久化到 localStorage：
//        - Vocabulary_Mastery         (每天的 Level_0_New ~ Level_5_Today)
//        - Word_Lists                 (List1 / List2 / ... 每天毕业词包)
//        - Study_Control              (Current_Day, Current_Round 等控制位)
//        - Ebbinghaus_Schedule        (第一轮：你给的25天艾宾浩斯表，已写死)
//      另外还预留 Round2_Schedule_7Day / Round3_Schedule_7Day
//
//  使用方式（现实执行流，Round 1：单词阶段）：
//   - 当天开始：把今天要学的新词塞进 addNewWordsToToday([...])
//       -> 这些词会进 Vocabulary_Mastery.Day_N.Level_0_New
//   - 复习旧List：按“今日复习安排”里列的 ListX，全量抽查
//       -> 你答错的词，必须调用 downgradeWordToToday("那个词")
//          这样该词会被踢出毕业List，塞回今天的 Level_0_New 重新记
//   - 晚上收工：finalizeTodayAndAdvance()
//       -> 把今天 Level_5_Mastered_Today 打包成 ListN
//       -> Current_Day +1，准备明天
//
//  后续 Round 2 / Round 3：
//   - Round 2 = 短语轮（1周刷全表）
//   - Round 3 = 句子+知识点轮（再1周刷全表）
//   - 现在只是留了结构和UI按钮，真正的7天分配等你给我表，我再塞进来
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v6';

    // --------------------------------------------------
    // 你的“第一轮（Round 1）艾宾浩斯复习计划表”
    // 已经写死在这里：Day1 ~ Day25
    //
    // 解释：
    //   NewList = 当天要“记忆”的列表
    //   Review = 当天要复习的旧 List 数组（可以为空）
    //
    // 说明：
    //   Day11 之后其实是回收旧List（记忆列里重复 List4/List5...）
    //   我们依然当它是 NewList，这样 UI 上会告诉你
    // --------------------------------------------------
    const ROUND1_SCHEDULE = {
        "1":  { NewList: "List1",  Review: [] },
        "2":  { NewList: "List2",  Review: ["List1"] },
        "3":  { NewList: "List3",  Review: ["List1","List2"] },
        "4":  { NewList: "List4",  Review: ["List2","List3"] },
        "5":  { NewList: "List5",  Review: ["List1","List3","List4"] },
        "6":  { NewList: "List6",  Review: ["List2","List4","List5"] },
        "7":  { NewList: "List7",  Review: ["List3","List5","List6"] },
        "8":  { NewList: "List8",  Review: ["List1","List4","List6","List7"] },
        "9":  { NewList: "List9",  Review: ["List2","List5","List7","List8"] },
        "10": { NewList: "List10", Review: ["List3","List6","List8","List9"] },

        "11": { NewList: "List4",  Review: ["List7","List9","List10"] },
        "12": { NewList: "List5",  Review: ["List8","List10"] },
        "13": { NewList: "List6",  Review: ["List9"] },
        "14": { NewList: "List7",  Review: ["List10"] },
        "15": { NewList: "List8",  Review: [] },
        "16": { NewList: "List1",  Review: ["List9"] },
        "17": { NewList: "List2",  Review: ["List10"] },
        "18": { NewList: "List3",  Review: [] },
        "19": { NewList: "List4",  Review: [] },
        "20": { NewList: "List5",  Review: [] },
        "21": { NewList: "List6",  Review: [] },
        "22": { NewList: "List7",  Review: [] },
        "23": { NewList: "List8",  Review: [] },
        "24": { NewList: "List9",  Review: [] },
        "25": { NewList: "List10", Review: [] },
    };

    // --------------------------------------------------
    // Round2 / Round3 占位表
    // 之后你会给我“一周内扫完整个词表”的分配，我就填进来
    // 结构说明：
    //   - 这里的 key 我们还是用 "1","2","3","4","5","6","7"
    //   - NewList: 可以是数组，表示当天要过的词包范围
    //   - Review: 同理
    // --------------------------------------------------
    const ROUND2_SCHEDULE = {
        "1": { NewList: ["(待定)"], Review: [] },
        "2": { NewList: ["(待定)"], Review: [] },
        "3": { NewList: ["(待定)"], Review: [] },
        "4": { NewList: ["(待定)"], Review: [] },
        "5": { NewList: ["(待定)"], Review: [] },
        "6": { NewList: ["(待定)"], Review: [] },
        "7": { NewList: ["(待定)"], Review: [] },
    };

    const ROUND3_SCHEDULE = {
        "1": { NewList: ["(待定)"], Review: [] },
        "2": { NewList: ["(待定)"], Review: [] },
        "3": { NewList: ["(待定)"], Review: [] },
        "4": { NewList: ["(待定)"], Review: [] },
        "5": { NewList: ["(待定)"], Review: [] },
        "6": { NewList: ["(待定)"], Review: [] },
        "7": { NewList: ["(待定)"], Review: [] },
    };

    // --------------------------------------------------
    // 默认总数据骨架
    // --------------------------------------------------
    const defaultData = {
        Vocabulary_Mastery: {
            // Day_1: { Level_0_New:[], Level_1:[], ... Level_5_Mastered_Today:[] }
        },
        Word_Lists: {
            // "List1": [...已毕业的词...]
        },
        // Round1 schedule = 你那张25天表
        // Round2 / Round3 在UI里也会用到
        Ebbinghaus_Schedule: ROUND1_SCHEDULE,
        Round2_Schedule_7Day: ROUND2_SCHEDULE,
        Round3_Schedule_7Day: ROUND3_SCHEDULE,
        Study_Control: {
            Current_Day: 1,        // 我们的“第几天”（不是现实日期，只是阶段计数）
            Current_Round: 1,      // 1=单词轮, 2=短语轮, 3=句子轮
            Current_CycleRound: 1, // 在学习轮次box里展示 Round 1 / 3
        },
    };

    // 内存镜像
    let EbbData = null;

    // --------------------------------------------------
    // 工具函数：深拷贝
    // --------------------------------------------------
    function deepClone(obj) {
        if (window.structuredClone) return window.structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    }

    // --------------------------------------------------
    // 载入/保存 到 localStorage
    // --------------------------------------------------
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                console.log(`[${EXT_NAME}] No saved data -> init defaultData`);
                EbbData = deepClone(defaultData);
                saveData();
            } else {
                EbbData = JSON.parse(raw);

                // 向后兼容：如果以后我们加字段了，旧存档里可能没有
                // 逐项补齐
                if (!EbbData.Vocabulary_Mastery) EbbData.Vocabulary_Mastery = {};
                if (!EbbData.Word_Lists) EbbData.Word_Lists = {};
                if (!EbbData.Ebbinghaus_Schedule) EbbData.Ebbinghaus_Schedule = ROUND1_SCHEDULE;
                if (!EbbData.Round2_Schedule_7Day) EbbData.Round2_Schedule_7Day = ROUND2_SCHEDULE;
                if (!EbbData.Round3_Schedule_7Day) EbbData.Round3_Schedule_7Day = ROUND3_SCHEDULE;
                if (!EbbData.Study_Control) {
                    EbbData.Study_Control = deepClone(defaultData.Study_Control);
                } else {
                    if (EbbData.Study_Control.Current_Day == null) {
                        EbbData.Study_Control.Current_Day = 1;
                    }
                    if (EbbData.Study_Control.Current_Round == null) {
                        EbbData.Study_Control.Current_Round = 1;
                    }
                    if (EbbData.Study_Control.Current_CycleRound == null) {
                        EbbData.Study_Control.Current_CycleRound = 1;
                    }
                }

                console.log(`[${EXT_NAME}] Data loaded:`, EbbData);
            }
        } catch (err) {
            console.error(`[${EXT_NAME}] loadData error:`, err);
            EbbData = deepClone(defaultData);
            saveData();
        }
    }

    function saveData() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(EbbData));
            console.log(`[${EXT_NAME}] Data saved.`);
        } catch (err) {
            console.error(`[${EXT_NAME}] saveData error:`, err);
        }
    }

    // --------------------------------------------------
    // 保证“今天这天”的桶存在
    // （Day_数字 结构）
    // --------------------------------------------------
    function ensureTodayBucket() {
        const dayNum = EbbData.Study_Control.Current_Day;
        const dayKey = 'Day_' + dayNum;
        if (!EbbData.Vocabulary_Mastery[dayKey]) {
            EbbData.Vocabulary_Mastery[dayKey] = {
                Level_0_New: [],
                Level_1: [],
                Level_2: [],
                Level_3: [],
                Level_4: [],
                Level_5_Mastered_Today: [],
            };
        }
        return dayKey;
    }

    // --------------------------------------------------
    // 核心操作1：把一批新词塞到今天 Level_0_New
    // --------------------------------------------------
    function addNewWordsToToday(wordListArray) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        for (const w of wordListArray) {
            const word = String(w).trim();
            if (!word) continue;
            if (!bucket.Level_0_New.includes(word)) {
                bucket.Level_0_New.push(word);
            }
        }
        saveData();
    }

    // --------------------------------------------------
    // 核心操作2：错词降级
    //  - 从今天所有level里删掉它
    //  - 再塞回 Level_0_New
    //  - 同时把它从 Word_Lists 的毕业清单里移除
    // --------------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 从所有level里移除
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }
        // 塞回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 从所有毕业List中移除
        for (const listName of Object.keys(EbbData.Word_Lists)) {
            const arr = EbbData.Word_Lists[listName];
            const idx2 = arr.indexOf(word);
            if (idx2 !== -1) {
                arr.splice(idx2,1);
            }
        }

        saveData();
    }

    // --------------------------------------------------
    // 核心操作3：结束今天
    //  - 把今天 Level_5_Mastered_Today 打包成 List{DayNum} 存到 Word_Lists
    //  - 清空今天的 Level_5_Mastered_Today
    //  - Current_Day +1
    // --------------------------------------------------
    function finalizeTodayAndAdvance() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const grads = [...bucket.Level_5_Mastered_Today];
        const listName = 'List' + todayNum;

        if (grads.length > 0) {
            EbbData.Word_Lists[listName] = grads;
        }

        // 清空今天的 Level_5_Mastered_Today
        bucket.Level_5_Mastered_Today = [];

        // 推进 Day
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // --------------------------------------------------
    // 轮次控制（Round 1 / Round 2 / Round 3）
    // --------------------------------------------------
    function setCurrentRound(roundNum) {
        // roundNum 应该是 1 / 2 / 3
        if (![1,2,3].includes(roundNum)) return;
        EbbData.Study_Control.Current_Round = roundNum;
        EbbData.Study_Control.Current_CycleRound = roundNum;
        saveData();
    }

    // --------------------------------------------------
    // 获取今天的摘要信息，用于仪表盘显示
    // --------------------------------------------------
    function getTodaySnapshot() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const roundNow = EbbData.Study_Control.Current_Round || 1;

        // Round 1 -> 用 25天艾宾浩斯表
        // Round 2 -> 用“一周短语轮”表
        // Round 3 -> 用“一周句子轮”表
        let scheduleSource;
        if (roundNow === 1) {
            scheduleSource = EbbData.Ebbinghaus_Schedule;
        } else if (roundNow === 2) {
            scheduleSource = EbbData.Round2_Schedule_7Day;
        } else {
            scheduleSource = EbbData.Round3_Schedule_7Day;
        }

        // 对于 Round2/3，我们仍用 Current_Day 做 key，
        // 但如果超过7天，就用 ((Current_Day-1) % 7)+1 当成循环（周循环）
        let lookupKey = String(todayNum);
        if (roundNow !== 1) {
            const dayMod = ((todayNum - 1) % 7) + 1;
            lookupKey = String(dayMod);
        }

        const sched = scheduleSource[lookupKey] || { NewList: "(未定义)", Review: [] };

        // 格式清理一下，确保 NewList 展示成字符串
        let newListDisplay = "";
        if (Array.isArray(sched.NewList)) {
            newListDisplay = sched.NewList.join(", ");
        } else {
            newListDisplay = sched.NewList || "(未定义)";
        }

        const reviewDisplayArr = Array.isArray(sched.Review) ? sched.Review : [];
        const reviewDisplay = (reviewDisplayArr.length === 0) ? "（无）" : reviewDisplayArr.join(", ");

        return {
            currentDay: todayNum,
            currentRound: roundNow,
            todayLevels: {
                L0: bucket.Level_0_New.length,
                L1: bucket.Level_1.length,
                L2: bucket.Level_2.length,
                L3: bucket.Level_3.length,
                L4: bucket.Level_4.length,
                L5_Today: bucket.Level_5_Mastered_Today.length,
            },
            scheduleForToday: {
                NewListDisplay: newListDisplay,
                ReviewDisplay: reviewDisplay,
            },
        };
    }

    // 暴露到全局方便调试/手动调用
    window.EbbinghausDataAPI = {
        loadData,
        saveData,
        addNewWordsToToday,
        downgradeWordToToday,
        finalizeTodayAndAdvance,
        setCurrentRound,
        getTodaySnapshot,
        ensureTodayBucket,
        get data() { return EbbData; },
    };

    // ======================================================
    // UI: 顶部按钮 + 弹出的覆盖层面板
    // ======================================================

    let overlayEl = null;
    let overlayCardEl = null;
    let topButtonEl = null;
    let uiReady = false;

    // --------------------------------------------------
    // 面板HTML - 根据当前数据动态生成
    // --------------------------------------------------
    function buildOverlayHTML() {
        if (!EbbData) loadData();
        const snap = getTodaySnapshot();

        // 小贴士文案根据 Round 变化
        let roundExplain = "";
        if (snap.currentRound === 1) {
            roundExplain = "第一轮：单词阶段（只给英文单词+中文提示）。";
        } else if (snap.currentRound === 2) {
            roundExplain = "第二轮：短语搭配阶段（要求你说出固定搭配 / 短语用法）。";
        } else {
            roundExplain = "第三轮：整句+知识点阶段（句子必须带真实知识点，让你用语境回答）。";
        }

        // “每日固定流程”里，我们用你现在的描述（轮次独立，先Round1全部背，再Round2一周扫表，再Round3一周扫表）
        const dailyFlowHTML = `
            <div style="
                background:rgba(0,0,0,0.4);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:14px;
                line-height:1.6;
                color:#eee;
                margin-top:16px;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:10px;">
                    每日固定流程（用你的快捷回复去指挥“教官”）
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    1. 开始学习：把今天这批新词交给教官。教官把这些词写入
                    <b style="color:#fff;">今天的 Level_0_New</b>。
                    然后按当前轮次来提问你：
                    <br/>
                    Round1 = 单词释义；
                    Round2 = 短语搭配；
                    Round3 = 整句+知识点。
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    2. 复习：按“今日复习安排”里的列表挨个抽查旧词。
                    任何错误 = 严重警报。教官必须执行
                    <code style="color:#fff;">downgradeWordToToday("错词")</code>：
                    这会把错词从毕业 List 里移除，并重新塞回今天的 Level_0_New 重新背。
                </div>

                <div style="color:#ccc;">
                    3. 结算今天：让教官把今天
                    <b style="color:#fff;">Level_5_Mastered_Today</b>
                    打包成 <b style="color:#fff;">List{当天Day号}</b> 存进 Word_Lists；
                    然后让教官执行
                    <code style="color:#fff;">finalizeTodayAndAdvance()</code>，
                    把 Current_Day +1，准备下一天。
                </div>
            </div>
        `;

        // 轮次控制 UI
        const roundControlHTML = `
            <div style="
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:10px;
                padding:12px;
                color:#fff;
                font-size:14px;
                line-height:1.5;
                margin-top:16px;
            ">
                <div style="font-weight:bold; color:#fff; margin-bottom:6px;">
                    学习轮次（词→短语→句子）
                </div>
                <div style="color:#ccc; margin-bottom:12px;">
                    现在是 <b style="color:#fff;">Round ${snap.currentRound} / 3</b>。
                    <br/>
                    ${roundExplain}
                    <br/>
                    你可以手动切换轮次（比如整本单词第一轮啃完后，进入短语大扫荡）。
                </div>

                <div style="
                    display:flex;
                    flex-wrap:wrap;
                    gap:8px;
                ">
                    <button data-round="1" style="
                        flex:1;
                        min-width:30%;
                        background:${snap.currentRound===1?'#2e7d32':'rgba(255,255,255,0.08)'};
                        border:1px solid ${snap.currentRound===1?'#4caf50':'rgba(255,255,255,0.4)'};
                        color:#fff;
                        border-radius:8px;
                        padding:8px;
                        font-size:14px;
                        text-align:center;
                    ">
                        Round 1（单词）
                    </button>

                    <button data-round="2" style="
                        flex:1;
                        min-width:30%;
                        background:${snap.currentRound===2?'#1565c0':'rgba(255,255,255,0.08)'};
                        border:1px solid ${snap.currentRound===2?'#64b5f6':'rgba(255,255,255,0.4)'};
                        color:#fff;
                        border-radius:8px;
                        padding:8px;
                        font-size:14px;
                        text-align:center;
                    ">
                        Round 2（短语）
                    </button>

                    <button data-round="3" style="
                        flex:1;
                        min-width:30%;
                        background:${snap.currentRound===3?'#4e342e':'rgba(255,255,255,0.08)'};
                        border:1px solid ${snap.currentRound===3?'#d7ccc8':'rgba(255,255,255,0.4)'};
                        color:#fff;
                        border-radius:8px;
                        padding:8px;
                        font-size:14px;
                        text-align:center;
                    ">
                        Round 3（句子）
                    </button>
                </div>

                <div style="color:#888; font-size:12px; margin-top:10px; line-height:1.4;">
                    这些按钮只是写入 Study_Control.Current_Round。
                    真正提问/复习时，你要把
                    “现在是第几轮，请用对应方式考我”
                    作为指令发给教官。
                </div>
            </div>
        `;

        return `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                flex-wrap:wrap;
                margin-bottom:12px;
                color:#fff;
            ">
                <div style="font-size:16px;font-weight:bold;line-height:1.4;">
                    <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                        <span style="font-size:1.2em;">🎓</span>
                        <span>艾宾浩斯词汇导师</span>
                    </div>
                    <div style="
                        margin-top:6px;
                        font-size:14px;
                        font-weight:normal;
                        color:#ccc;
                        line-height:1.4;
                        display:flex;
                        flex-wrap:wrap;
                        gap:6px;
                    ">
                        <span style="
                            background:#1a1a1a;
                            border:1px solid rgba(255,255,255,0.2);
                            border-radius:6px;
                            padding:2px 6px;
                            font-size:12px;
                            color:#fff;
                            line-height:1.4;
                            display:inline-flex;
                            align-items:center;
                            gap:4px;
                        ">
                            <span style="font-size:1.1em;">📅</span>
                            <span>第 ${snap.currentDay} 天</span>
                        </span>

                        <span style="
                            background:#1a1a1a;
                            border:1px solid rgba(255,255,255,0.2);
                            border-radius:6px;
                            padding:2px 6px;
                            font-size:12px;
                            color:#fff;
                            line-height:1.4;
                        ">
                            Round ${snap.currentRound} / 3
                        </span>
                    </div>
                </div>

                <button id="ebb_close_btn" style="
                    background:rgba(255,255,255,0.1);
                    color:#fff;
                    border:1px solid rgba(255,255,255,0.3);
                    border-radius:8px;
                    font-size:12px;
                    line-height:1;
                    padding:4px 8px;
                    cursor:pointer;
                    height:fit-content;
                ">关闭</button>
            </div>

            <!-- 今天的词量状态 -->
            <div style="
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:8px;
                padding:10px 12px;
                margin-bottom:16px;
                font-size:13px;
                color:#ccc;
                line-height:1.5;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">今天的掌握进度</div>
                <div style="color:#ccc;">
                    Level_0_New：<b style="color:#fff;">${snap.todayLevels.L0}</b> 个<br/>
                    Level_1：<b style="color:#fff;">${snap.todayLevels.L1}</b> 个<br/>
                    Level_2：<b style="color:#fff;">${snap.todayLevels.L2}</b> 个<br/>
                    Level_3：<b style="color:#fff;">${snap.todayLevels.L3}</b> 个<br/>
                    Level_4：<b style="color:#fff;">${snap.todayLevels.L4}</b> 个<br/>
                    Level_5_Today（待毕业）：<b style="color:#fff;">${snap.todayLevels.L5_Today}</b> 个
                </div>
            </div>

            <!-- 今日复习安排 -->
            <div style="
                background:rgba(0,0,0,0.4);
                border:1px solid rgba(0,150,255,0.4);
                border-radius:10px;
                padding:10px 12px;
                margin-bottom:16px;
                color:#bfe4ff;
                font-size:14px;
                line-height:1.5;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:4px;">今日复习安排</div>
                <div style="font-size:13px;color:#bfe4ff;">
                    新词 / 主攻包：<b style="color:#fff;">${snap.scheduleForToday.NewListDisplay}</b><br/>
                    需要复习的旧List：<b style="color:#fff;">${snap.scheduleForToday.ReviewDisplay}</b>
                </div>
            </div>

            ${roundControlHTML}
            ${dailyFlowHTML}
        `;
    }

    // --------------------------------------------------
    // 显示/隐藏覆盖层
    // --------------------------------------------------
    function showOverlay() {
        if (!overlayEl) {
            overlayEl = document.createElement('div');
            overlayEl.id = 'ebb_overlay_root';
            overlayEl.style.position = 'fixed';
            overlayEl.style.left = '0';
            overlayEl.style.top = '0';
            overlayEl.style.width = '100vw';
            overlayEl.style.height = '100vh';
            overlayEl.style.background = 'rgba(0,0,0,0.4)';
            overlayEl.style.zIndex = '9999';
            overlayEl.style.display = 'flex';
            overlayEl.style.alignItems = 'center';
            overlayEl.style.justifyContent = 'center';
            overlayEl.style.padding = '20px';
            overlayEl.style.boxSizing = 'border-box';

            // 点击遮罩关
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) {
                    hideOverlay();
                }
            }, true);

            overlayCardEl = document.createElement('div');
            overlayCardEl.id = 'ebb_overlay_card';
            overlayCardEl.style.background = 'rgba(20,20,20,0.95)';
            overlayCardEl.style.borderRadius = '12px';
            overlayCardEl.style.border = '1px solid rgba(255,255,255,0.2)';
            overlayCardEl.style.color = '#fff';
            overlayCardEl.style.width = '90%';
            overlayCardEl.style.maxWidth = '480px';
            overlayCardEl.style.maxHeight = '80vh';
            overlayCardEl.style.overflowY = 'auto';
            overlayCardEl.style.padding = '16px 16px 20px 16px';
            overlayCardEl.style.boxShadow = '0 20px 60px rgba(0,0,0,0.8)';

            overlayEl.appendChild(overlayCardEl);
            document.body.appendChild(overlayEl);
        }

        // 每次打开重新渲染
        overlayCardEl.innerHTML = buildOverlayHTML();

        // 绑定关闭
        const closeBtn = overlayCardEl.querySelector('#ebb_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // 绑定轮次切换按钮
        overlayCardEl.querySelectorAll('button[data-round]').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const r = parseInt(btn.getAttribute('data-round'),10);
                setCurrentRound(r);
                // 重新渲染整块UI，立刻反映颜色和Round显示
                overlayCardEl.innerHTML = buildOverlayHTML();
                // 重新绑事件
                attachInternalEvents();
            }, true);
        });

        overlayEl.style.display = 'flex';

        function attachInternalEvents(){
            const closeBtn2 = overlayCardEl.querySelector('#ebb_close_btn');
            if (closeBtn2) {
                closeBtn2.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    hideOverlay();
                }, true);
            }
            overlayCardEl.querySelectorAll('button[data-round]').forEach(btn => {
                btn.addEventListener('click', (ev) => {
                    ev.preventDefault();
                    ev.stopPropagation();
                    const r2 = parseInt(btn.getAttribute('data-round'),10);
                    setCurrentRound(r2);
                    overlayCardEl.innerHTML = buildOverlayHTML();
                    attachInternalEvents();
                }, true);
            });
        }
    }

    function hideOverlay() {
        if (overlayEl) {
            overlayEl.style.display = 'none';
        }
    }

    function toggleOverlay() {
        if (!overlayEl || overlayEl.style.display === 'none') {
            showOverlay();
        } else {
            hideOverlay();
        }
    }

    // --------------------------------------------------
    // 把学士帽按钮塞到顶栏
    // 我们用轮询，等SillyTavern头部按钮都渲染好了再插
    // --------------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return;
        }

        // 找一个现成的顶栏按钮当锚点
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button');

        if (!probe || !probe.parentNode) return;

        const toolbar = probe.parentNode;

        topButtonEl = document.createElement('div');
        topButtonEl.id = 'ebb_toolbar_btn';
        topButtonEl.className = 'menu_button';
        topButtonEl.style.display = 'flex';
        topButtonEl.style.alignItems = 'center';
        topButtonEl.style.justifyContent = 'center';
        topButtonEl.style.minWidth = '32px';
        topButtonEl.style.minHeight = '32px';
        topButtonEl.style.padding = '6px';
        topButtonEl.style.borderRadius = '6px';
        topButtonEl.style.cursor = 'pointer';
        topButtonEl.style.userSelect = 'none';

        // 用学士帽emoji，颜色由主题染色
        // 你之前截图里的位置：我们不会动它
        topButtonEl.innerHTML = `
            <span style="
                font-size:18px;
                line-height:18px;
                filter: brightness(1.2);
            ">🎓</span>
        `;

        topButtonEl.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOverlay();
        }, true);

        toolbar.appendChild(topButtonEl);

        console.log(`[${EXT_NAME}] Topbar study button inserted.`);
    }

    // --------------------------------------------------
    // 启动：载入数据 + 轮询插入按钮
    // --------------------------------------------------
    function init() {
        if (uiReady) return;
        uiReady = true;

        loadData(); // 初始化内存镜像

        let tries = 0;
        const maxTries = 100;
        const intv = setInterval(() => {
            tries++;
            insertTopButtonIfMissing();
            if (topButtonEl) {
                clearInterval(intv);
                console.log(`[${EXT_NAME}] UI injection complete.`);
            } else if (tries >= maxTries) {
                clearInterval(intv);
                console.warn(`[${EXT_NAME}] Failed to locate toolbar for top button.`);
            }
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
```0
