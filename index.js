// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.3.0
//  作者: Dauvier & ChatGPT
//
//  功能概览：
//   1. 在顶部工具栏插入一个🎓学士帽按钮（和别的图标齐平）
//   2. 点击后弹出黑色半透明学习面板
//   3. 持久化管理四张核心“表”到 localStorage：
//        - Vocabulary_Mastery
//        - Word_Lists
//        - Ebbinghaus_Schedule
//        - Study_Control
//      其中 Study_Control 里现在有两个关键字段：
//        * Current_Day   今天第几天
//        * Current_Round 当前学习轮次：1=单词轮，2=短语轮，3=句子轮
//
//   4. 面板上能看到：
//        - 今天是 Day 几
//        - 当前是第几轮 (Round 1/2/3)
//        - 每个等级里有多少词
//        - 今天要复习哪些 List
//        - “下一轮 / 回到第1轮”等按钮，纯粹修改 Current_Round
//
//   5. 核心API都挂到 window.EbbinghausDataAPI 方便以后让“教官”/QR用：
//        addNewWordsToToday([...])
//        downgradeWordToToday("word")
//        finalizeTodayAndAdvance()
//        nextRound(), setRound(n), getRound()
//        getTodaySnapshot()
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v2';

    // --------------------------------------------------
    // 默认数据骨架（四张表 + 轮次）
    // --------------------------------------------------
    const defaultData = {
        // ① Vocabulary_Mastery
        //    以“天”为单位的复习仓，比如：
        //    Day_1: {
        //       Level_0_New: [],
        //       Level_1: [],
        //       Level_2: [],
        //       Level_3: [],
        //       Level_4: [],
        //       Level_5_Mastered_Today: [],
        //    }
        Vocabulary_Mastery: {
            // "Day_1": { ... }
        },

        // ② Word_Lists
        //    每天毕业的高掌握度词会被打包成 ListN
        Word_Lists: {
            // "List1": ["foo","bar",...]
        },

        // ③ Ebbinghaus_Schedule
        //    每一天要学哪批新词 (NewList) + 要复习哪些旧 List
        Ebbinghaus_Schedule: {
            "1": { NewList: "List1", Review: [] },
            "2": { NewList: "List2", Review: ["List1"] },
            "3": { NewList: "List3", Review: ["List1","List2"] },
            "4": { NewList: "List4", Review: ["List2","List3"] },
            "5": { NewList: "List5", Review: ["List1","List3","List4"] },
        },

        // ④ Study_Control
        //    Current_Day:   当前第几天
        //    Current_Round: 当前学习轮次
        //                   1 = 单词轮 (只问生词本体)
        //                   2 = 短语轮 (把词塞进常见短语里问)
        //                   3 = 句子轮 (把词塞进完整句子/学科知识点里问)
        //    注意：这个轮次是“全局节奏”，而不是“单个词的level”
        Study_Control: {
            Current_Day: 1,
            Current_Round: 1,
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
    // 存档读写
    // --------------------------------------------------
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                console.log(`[${EXT_NAME}] No existing data, init with defaults`);
                EbbData = deepClone(defaultData);
                saveData();
            } else {
                EbbData = JSON.parse(raw);

                // 向后兼容：如果旧存档里还没有 Study_Control / Current_Round
                if (!EbbData.Study_Control) {
                    EbbData.Study_Control = { Current_Day: 1, Current_Round: 1 };
                } else {
                    if (typeof EbbData.Study_Control.Current_Round !== 'number') {
                        EbbData.Study_Control.Current_Round = 1;
                    }
                }

                saveData();
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
        } catch (err) {
            console.error(`[${EXT_NAME}] saveData error:`, err);
        }
    }

    // --------------------------------------------------
    // 保障“今天这一桶”存在
    //    Day_X 里六个层级：
    //      Level_0_New
    //      Level_1
    //      Level_2
    //      Level_3
    //      Level_4
    //      Level_5_Mastered_Today
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
    // API 1: addNewWordsToToday
    // 把一批新词扔进今天的 Level_0_New
    // （这一步你可以在“开始学习”快捷回复里让教官执行）
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
    // API 2: downgradeWordToToday
    // 复习时如果某词答错：
    //   - 从今天所有等级里把它删掉
    //   - 放回今天的 Level_0_New
    //   - 并且把它从所有 Word_Lists 毕业清单里移除
    // 你可以在“复习错词 -> 严重警报”时让教官调用它
    // --------------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New",
            "Level_1",
            "Level_2",
            "Level_3",
            "Level_4",
            "Level_5_Mastered_Today",
        ];

        // 把这个词从所有 level 里拔掉
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx, 1);
            }
        }

        // 丢回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 再把它从所有毕业 List 里删掉（它不算毕业了）
        for (const listName of Object.keys(EbbData.Word_Lists)) {
            const arr = EbbData.Word_Lists[listName];
            const idx2 = arr.indexOf(word);
            if (idx2 !== -1) {
                arr.splice(idx2, 1);
            }
        }

        saveData();
    }

    // --------------------------------------------------
    // API 3: finalizeTodayAndAdvance
    // “结束今天”时用：
    //   1. 把今天 Level_5_Mastered_Today 的词打包成 List{今天Day号}
    //   2. 清空今天的 Level_5_Mastered_Today
    //   3. Current_Day +1 (往后推进一天)
    // --------------------------------------------------
    function finalizeTodayAndAdvance() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        // 复制今天毕业词
        const grads = [...bucket.Level_5_Mastered_Today];
        const listName = 'List' + todayNum;

        // 把这些毕业词存进 Word_Lists
        if (grads.length > 0) {
            EbbData.Word_Lists[listName] = grads;
        }

        // 清空今天的 L5 记录
        bucket.Level_5_Mastered_Today = [];

        // 时间+1，准备明天
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // --------------------------------------------------
    // Round 控制：
    //   nextRound() : Round1 -> Round2 -> Round3 (上限3)
    //   setRound(n) : 1/2/3
    //   getRound()  : 读当前轮次
    // 用法：不是给AI自动升轮，是你/AI手动说“我们现在进入短语轮了(=2)”
    // --------------------------------------------------
    function nextRound() {
        if (!EbbData.Study_Control) {
            EbbData.Study_Control = { Current_Day: 1, Current_Round: 1 };
        }
        let r = Number(EbbData.Study_Control.Current_Round) || 1;
        r = r + 1;
        if (r > 3) r = 3;
        EbbData.Study_Control.Current_Round = r;
        saveData();
        return r;
    }

    function setRound(num) {
        if (!EbbData.Study_Control) {
            EbbData.Study_Control = { Current_Day: 1, Current_Round: 1 };
        }
        const n = Math.min(Math.max(parseInt(num || 1, 10), 1), 3);
        EbbData.Study_Control.Current_Round = n;
        saveData();
        return n;
    }

    function getRound() {
        return (EbbData.Study_Control && EbbData.Study_Control.Current_Round) || 1;
    }

    // --------------------------------------------------
    // 汇总快照：给面板看的
    // --------------------------------------------------
    function getTodaySnapshot() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        // 今天的计划安排
        const sched = EbbData.Ebbinghaus_Schedule[String(todayNum)] || {
            NewList: "(未定义)",
            Review: []
        };

        // 当前轮次
        const roundNow = getRound();
        const roundNameMap = {
            1: '第一轮：单词阶段（只给英文词+中文提示）',
            2: '第二轮：短语阶段（把单词塞进常见短语里）',
            3: '第三轮：句子阶段（把单词融进长句/专业知识点）',
        };
        const roundDesc = roundNameMap[roundNow] || '未知轮次';

        return {
            currentDay: todayNum,
            currentRound: roundNow,
            currentRoundDesc: roundDesc,
            todayLevels: {
                L0: bucket.Level_0_New.length,
                L1: bucket.Level_1.length,
                L2: bucket.Level_2.length,
                L3: bucket.Level_3.length,
                L4: bucket.Level_4.length,
                L5_Today: bucket.Level_5_Mastered_Today.length,
            },
            schedule: {
                NewList: sched.NewList,
                Review: sched.Review,
            },
        };
    }

    // --------------------------------------------------
    // 暴露到全局，方便调试和给“教官”调用
    // --------------------------------------------------
    window.EbbinghausDataAPI = {
        // 存档相关
        loadData,
        saveData,

        // bucket保障
        ensureTodayBucket,

        // 学习动作
        addNewWordsToToday,
        downgradeWordToToday,
        finalizeTodayAndAdvance,

        // 轮次控制
        nextRound,
        setRound,
        getRound,

        // 汇总
        getTodaySnapshot,

        // 直接看原始大对象
        get data() {
            return EbbData;
        },
    };

    // ======================================================
    // UI 区域：
    //   - 顶部学士帽按钮
    //   - 黑色弹出面板 (overlay)
    // ======================================================

    let overlayEl = null;      // 半透明背景
    let overlayCardEl = null;  // 中央黑卡片
    let topButtonEl = null;    // 顶栏 🎓 按钮
    let uiReady = false;

    // 面板 HTML（每次打开都会重建，保证数据是最新的）
    function buildOverlayInnerHTML() {
        if (!EbbData) {
            loadData();
        }

        const snap = getTodaySnapshot();
        const reviewStr = (snap.schedule.Review && snap.schedule.Review.length > 0)
            ? snap.schedule.Review.join(', ')
            : '（无）';

        return `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                margin-bottom:12px;
            ">
                <div style="
                    font-size:16px;
                    font-weight:bold;
                    display:flex;
                    align-items:center;
                    gap:8px;
                    color:#fff;
                    line-height:1.3;
                ">
                    <span style="font-size:1.2em;">🎓</span>
                    <span>艾宾浩斯词汇导师</span>
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
                ">关闭</button>
            </div>

            <!-- 今日概况 -->
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
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                    <div style="display:flex;align-items:center;gap:6px;">
                        <span>📅</span>
                        <span>第 <b style="color:#fff;">${snap.currentDay}</b> 天</span>
                    </div>
                    <div style="
                        background:rgba(255,255,255,0.08);
                        border:1px solid rgba(255,255,255,0.2);
                        border-radius:6px;
                        padding:2px 6px;
                        font-size:12px;
                        line-height:1.4;
                        font-weight:600;
                        color:#fff;
                    ">
                        Round ${snap.currentRound} / 3
                    </div>
                </div>

                <div style="font-size:12px;color:#aaa;line-height:1.4;margin-bottom:8px;">
                    ${snap.currentRoundDesc}
                </div>

                <div style="margin-top:6px;">
                    <div>Level_0_New：${snap.todayLevels.L0} 个</div>
                    <div>Level_1：${snap.todayLevels.L1} 个</div>
                    <div>Level_2：${snap.todayLevels.L2} 个</div>
                    <div>Level_3：${snap.todayLevels.L3} 个</div>
                    <div>Level_4：${snap.todayLevels.L4} 个</div>
                    <div>Level_5_Today（待毕业）：${snap.todayLevels.L5_Today} 个</div>
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
                line-height:1.4;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:4px;">今日复习安排</div>
                <div style="font-size:13px;color:#bfe4ff;">
                    新词列表名 (NewList)：<b style="color:#fff;">${snap.schedule.NewList}</b><br/>
                    需要复习的旧List：<b style="color:#fff;">${reviewStr}</b>
                </div>
            </div>

            <!-- 学习轮次控制 -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">学习轮次 (词→短语→句子)</div>

                <div style="color:#ccc;margin-bottom:12px;font-size:13px;">
                    当前是 <b style="color:#fff;">Round ${snap.currentRound}</b>。
                    你可以手动切换轮次，不同轮次让教官用不同提问方式。
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:8px;">
                    <button class="ebb_round_btn" data-round-action="next" style="
                        flex:1;
                        min-width:90px;
                        background:#114514;
                        background:linear-gradient(135deg,#1e3a1e,#0f2a0f);
                        color:#9cff9c;
                        border:1px solid #2a6b2a;
                        border-radius:8px;
                        font-size:13px;
                        line-height:1.4;
                        padding:8px;
                        cursor:pointer;
                        text-align:center;
                    ">下一轮 ↗</button>

                    <button class="ebb_round_btn" data-round-action="set1" style="
                        flex:1;
                        min-width:90px;
                        background:#2a2a2a;
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.2);
                        border-radius:8px;
                        font-size:13px;
                        line-height:1.4;
                        padding:8px;
                        cursor:pointer;
                        text-align:center;
                    ">回到第1轮</button>

                    <button class="ebb_round_btn" data-round-action="set2" style="
                        flex:1;
                        min-width:90px;
                        background:#2a2a2a;
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.2);
                        border-radius:8px;
                        font-size:13px;
                        line-height:1.4;
                        padding:8px;
                        cursor:pointer;
                        text-align:center;
                    ">第2轮(短语)</button>

                    <button class="ebb_round_btn" data-round-action="set3" style="
                        flex:1;
                        min-width:90px;
                        background:#2a2a2a;
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.2);
                        border-radius:8px;
                        font-size:13px;
                        line-height:1.4;
                        padding:8px;
                        cursor:pointer;
                        text-align:center;
                    ">第3轮(句子)</button>
                </div>

                <div style="color:#777;margin-top:10px;font-size:12px;line-height:1.4;">
                    这只是把当前轮次写进 Study_Control.Current_Round。真正问你题目时，教官要读取这个值，决定是考“生词本体 / 短语 / 全句”。
                </div>
            </div>

            <!-- 流程复习说明 -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
                margin-top:16px;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">每日固定流程（用你的快速回复去指挥“教官”）</div>

                <div style="color:#ccc;margin-bottom:8px;">
                    1. 开始学习：把今天这批新词交给教官。教官把这些词写入
                    <code style="color:#fff;">Level_0_New</code>
                    （今天这天）。然后按当前轮次提问你：<br/>
                    Round1=单词释义；Round2=短语搭配；Round3=整句+知识点。
                </div>

                <div style="color:#ccc;margin-bottom:8px;">
                    2. 复习：按“今日复习安排”里的 List 抽查旧词。<br/>
                    错词 = 严重警报。教官必须执行
                    <code style="color:#fff;">downgradeWordToToday(该词)</code>
                    ：把词从毕业 List 里删掉，并重新塞回今天的
                    <code style="color:#fff;">Level_0_New</code>
                    重新开始记。
                </div>

                <div style="color:#ccc;">
                    3. 结束今天：把今天
                    <code style="color:#fff;">Level_5_Mastered_Today</code>
                    打包成
                    <code style="color:#fff;">List{今天Day号}</code>
                    存进 <code style="color:#fff;">Word_Lists</code>；
                    然后执行
                    <code style="color:#fff;">finalizeTodayAndAdvance()</code>
                    ，把 <code style="color:#fff;">Current_Day</code> +1，准备明天。
                </div>
            </div>
        `;
    }

    // --------------------------------------------------
    // 显示 / 隐藏 overlay
    // --------------------------------------------------
    function showOverlay() {
        if (!overlayEl) {
            // 半透明背景
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

            // 点击遮罩空白处=关闭
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) {
                    hideOverlay();
                }
            }, true);

            // 中央黑卡片
            overlayCardEl = document.createElement('div');
            overlayCardEl.id = 'ebb_overlay_card';
            overlayCardEl.style.background = 'rgba(20,20,20,0.95)';
            overlayCardEl.style.borderRadius = '12px';
            overlayCardEl.style.border = '1px solid rgba(255,255,255,0.2)';
            overlayCardEl.style.color = '#fff';
            overlayCardEl.style.width = '90%';
            overlayCardEl.style.maxWidth = '500px';
            overlayCardEl.style.maxHeight = '80vh';
            overlayCardEl.style.overflowY = 'auto';
            overlayCardEl.style.padding = '16px 16px 20px 16px';
            overlayCardEl.style.boxShadow = '0 24px 60px rgba(0,0,0,0.8)';
            overlayCardEl.style.fontFamily = '"Inter","PingFang SC","Microsoft YaHei",sans-serif';

            overlayEl.appendChild(overlayCardEl);
            document.body.appendChild(overlayEl);
        }

        // 每次打开都刷新里面的内容
        overlayCardEl.innerHTML = buildOverlayInnerHTML();

        // 绑定“关闭”按钮
        const closeBtn = overlayCardEl.querySelector('#ebb_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // 绑定轮次按钮（下一轮 / 回到第1轮 / 第2轮 / 第3轮）
        overlayCardEl.querySelectorAll('.ebb_round_btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const act = btn.getAttribute('data-round-action');
                if (act === 'next') {
                    nextRound();
                } else if (act === 'set1') {
                    setRound(1);
                } else if (act === 'set2') {
                    setRound(2);
                } else if (act === 'set3') {
                    setRound(3);
                }
                // 点完后立即刷新面板内容
                overlayCardEl.innerHTML = buildOverlayInnerHTML();
            }, true);
        });

        overlayEl.style.display = 'flex';
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
    // 在顶部工具栏插入“学士帽”按钮
    //
    // 做法：
    //  1. 找到任意现成的顶栏按钮（sys-settings-button / extensions-settings-button / .menu_button）
    //  2. 用它的 parentNode 当作工具栏容器
    //  3. append 我们的按钮
    //
    // 这个学士帽按钮用 emoji 🎓，你的主题会把它渲染成和其他图标同一行的浅色按钮。
    // --------------------------------------------------
    function insertTopButtonIfMissing() {
        // 如果已经有按钮并且仍在DOM里，就不用再加了
        if (topButtonEl && document.body.contains(topButtonEl)) return;

        // 找一个已经存在的顶栏按钮来定位工具栏
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button'); // 兜底

        if (!probe || !probe.parentNode) {
            return; // 还没渲染好顶栏，等会再试
        }

        const toolbar = probe.parentNode;

        // 创建我们自己的按钮
        topButtonEl = document.createElement('div');
        topButtonEl.id = 'ebb_toolbar_btn';
        topButtonEl.className = 'menu_button'; // 复用ST的按钮样式
        topButtonEl.style.display = 'flex';
        topButtonEl.style.alignItems = 'center';
        topButtonEl.style.justifyContent = 'center';
        topButtonEl.style.minWidth = '32px';
        topButtonEl.style.minHeight = '32px';
        topButtonEl.style.padding = '6px';
        topButtonEl.style.borderRadius = '6px';
        topButtonEl.style.cursor = 'pointer';
        topButtonEl.style.userSelect = 'none';

        topButtonEl.innerHTML = `
            <span style="
                font-size:18px;
                line-height:18px;
                filter: brightness(1.2);
            ">🎓</span>
        `;

        // 点击 => 打开/关闭面板
        topButtonEl.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOverlay();
        }, true);

        // 插到工具栏末尾
        toolbar.appendChild(topButtonEl);

        console.log(`[${EXT_NAME}] Topbar study button inserted.`);
    }

    // --------------------------------------------------
    // 启动：加载数据 + 轮询等待顶部栏出现再插按钮
    // --------------------------------------------------
    function init() {
        if (uiReady) return;
        uiReady = true;

        loadData(); // 确保 EbbData 有了

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

    // DOM准备好后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
