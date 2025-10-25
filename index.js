// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.6.0
//  作者: Dauvier & ChatGPT
//
//  本版要点：
//   1. 学士帽按钮 🎓 保留在顶部工具栏，点击打开面板
//   2. 面板里展示：
//      - 当前是第几天（Current_Day）
//      - 当前轮次 Round（1=单词, 2=短语, 3=句子）
//      - 今日复习安排（用你的艾宾浩斯表 / 之后还会加Round2, Round3的一周冲刺表）
//      - 学习轮次切换区（下一轮↗、回到第1轮...）
//      - 每日固定流程（包含降级、打包List、推进天数）
//   3. 数据四大表：
//      - Vocabulary_Mastery
//      - Word_Lists
//      - Ebbinghaus_Schedule (Round1专用，已灌入你给的Day1-25表)
//      - Study_Control (Current_Day + Current_Round)
//
//  用法日常循环：
//     - 打开面板看“今日复习安排”
//     - 叫“教官”把 NewList 的词塞进今天的 Level_0_New 并考你
//     - 叫“教官”逐个复习 Review 里的旧List
//     - 每个记不住/答错的词 => 调用 downgradeWordToToday("那个词")
//     - 一天结束 => finalizeTodayAndAdvance()
//       （把今天的 Level_5_Mastered_Today 打包成 List{Day}，然后 Current_Day+1）
//
//  Round 2 / Round 3：目标是同一批词一周扫完（短语 / 句子+知识点）。
//     - 我已经给它们留了 Round2_Schedule_7Day / Round3_Schedule_7Day 占位，
//       等你给我那两张7天分配表，我再写死进去。
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v1';

    // ------------------------------------------
    // 数据默认骨架
    // ------------------------------------------
    const defaultData = {
        Vocabulary_Mastery: {
            // "Day_1": {
            //     Level_0_New: [],
            //     Level_1: [],
            //     Level_2: [],
            //     Level_3: [],
            //     Level_4: [],
            //     Level_5_Mastered_Today: [],
            // }
        },

        Word_Lists: {
            // "List1": ["wordA", "wordB", ...]  // finalizeTodayAndAdvance() 时会写进去
        },

        // Round1（单词阶段）艾宾浩斯复习表
        // 你发给我的 Day1~Day25 固定表，我已经按天塞进来了：
        // NewList: 当天要新背/今天主记忆的列表（有些天是 null，表示那天不背新词，只复盘）
        // Review: 旧List要复习的数组
        //
        // 注意：Day11以后其实没有新的List11、12…，而是持续复盘 List1-10。
        Ebbinghaus_Schedule: {
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

            // Day11 开始不再有全新的List11、12...，而是长尾复习
            "11": { NewList: null, Review: ["List4","List7","List9","List10"] },
            "12": { NewList: null, Review: ["List5","List8","List10"] },
            "13": { NewList: null, Review: ["List6","List9"] },
            "14": { NewList: null, Review: ["List7","List10"] },
            "15": { NewList: null, Review: ["List8"] },
            "16": { NewList: null, Review: ["List1","List9"] },
            "17": { NewList: null, Review: ["List2","List10"] },
            "18": { NewList: null, Review: ["List3"] },
            "19": { NewList: null, Review: ["List4"] },
            "20": { NewList: null, Review: ["List5"] },
            "21": { NewList: null, Review: ["List6"] },
            "22": { NewList: null, Review: ["List7"] },
            "23": { NewList: null, Review: ["List8"] },
            "24": { NewList: null, Review: ["List9"] },
            "25": { NewList: null, Review: ["List10"] },
        },

        // Round2 / Round3 的一周冲刺表预留（短语/句子）
        // 等你给我7天分配（每天要扫哪些List）我就填进来
        Round2_Schedule_7Day: {
            // "1": { Focus: ["List1","List2","List3"] },
            // "2": { Focus: [...] },
            // ...
        },
        Round3_Schedule_7Day: {
            // "1": { Focus: ["List1","List2","List3"] },
            // ...
        },

        Study_Control: {
            Current_Day: 1,     // 第几天（不是现实日期，是进度天）
            Current_Round: 1,   // 1=单词, 2=短语, 3=句子
        },
    };

    // 内存镜像
    let EbbData = null;

    // ------------------------------------------
    // 小工具
    // ------------------------------------------
    function deepClone(obj) {
        if (window.structuredClone) return window.structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    }

    // ------------------------------------------
    // 存取本地存档
    // ------------------------------------------
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                console.log(`[${EXT_NAME}] No existing data, using default.`);
                EbbData = deepClone(defaultData);
                saveData();
            } else {
                EbbData = JSON.parse(raw);
                console.log(`[${EXT_NAME}] Data loaded:`, EbbData);

                // 向后兼容：如果老存档里还没有新字段，补上
                if (EbbData.Round2_Schedule_7Day == null) {
                    EbbData.Round2_Schedule_7Day = deepClone(defaultData.Round2_Schedule_7Day);
                }
                if (EbbData.Round3_Schedule_7Day == null) {
                    EbbData.Round3_Schedule_7Day = deepClone(defaultData.Round3_Schedule_7Day);
                }
                if (EbbData.Study_Control.Current_Round == null) {
                    EbbData.Study_Control.Current_Round = 1;
                }
                if (EbbData.Ebbinghaus_Schedule == null) {
                    EbbData.Ebbinghaus_Schedule = deepClone(defaultData.Ebbinghaus_Schedule);
                }
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

    // ------------------------------------------
    // Round 管理
    // ------------------------------------------
    function getCurrentRound() {
        return EbbData?.Study_Control?.Current_Round || 1;
    }

    function setCurrentRound(r) {
        const roundNum = Math.min(Math.max(parseInt(r)||1, 1), 3);
        EbbData.Study_Control.Current_Round = roundNum;
        saveData();
    }

    function nextRound() {
        let r = getCurrentRound();
        r = r >= 3 ? 1 : (r + 1);
        setCurrentRound(r);
    }

    function getRoundName(r) {
        switch (r) {
            case 1: return 'Round 1 / 3';
            case 2: return 'Round 2 / 3';
            case 3: return 'Round 3 / 3';
            default:return `Round ${r}`;
        }
    }

    function getRoundDesc(r) {
        if (r === 1) {
            return '第一轮：单词阶段（只给英文词+中文提示）';
        }
        if (r === 2) {
            return '第二轮：短语阶段（近义/固定搭配/常用短语）';
        }
        if (r === 3) {
            return '第三轮：句子阶段（整句+知识点语境）';
        }
        return '';
    }

    // ------------------------------------------
    // 确保今天这天的桶存在
    // ------------------------------------------
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

    // ------------------------------------------
    // 操作1：把一批新词塞进今天的 Level_0_New
    // （你让“教官”做这件事。Round1时一般用当天的NewList）
    // ------------------------------------------
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

    // ------------------------------------------
    // 操作2：降级某个错词
    // 把它从今天所有level踢掉，再塞回 Level_0_New
    // 还要从所有ListX里移除（它不算毕业词了）
    // ------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }

        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 把它从所有毕业List里移除
        for (const listName of Object.keys(EbbData.Word_Lists)) {
            const arr = EbbData.Word_Lists[listName];
            const idx2 = arr.indexOf(word);
            if (idx2 !== -1) {
                arr.splice(idx2,1);
            }
        }

        saveData();
    }

    // ------------------------------------------
    // 操作3：结束今天 / 打包毕业词 / 推进天数
    // 相当于“结束今天”
    //   1) 把今天 Level_5_Mastered_Today 打成 List{Current_Day}
    //   2) 清空 Level_5_Mastered_Today
    //   3) Current_Day +1
    // ------------------------------------------
    function finalizeTodayAndAdvance() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const grads = [...bucket.Level_5_Mastered_Today];
        const listName = 'List' + todayNum;

        if (grads.length > 0) {
            EbbData.Word_Lists[listName] = grads;
        }

        // 清空今天的 L5_Today
        bucket.Level_5_Mastered_Today = [];

        // 推进到下一天
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // ------------------------------------------
    // 根据当前轮次 + 当前Day，给出“今日复习安排”
    // Round1: 用 Ebbinghaus_Schedule[Current_Day]
    // Round2/Round3: 之后会切到7天冲刺表
    // ------------------------------------------
    function getScheduleForToday() {
        const roundNow = getCurrentRound();
        const dayNum = EbbData.Study_Control.Current_Day;

        if (roundNow === 1) {
            // Round1：单词阶段 => 用你的25天艾宾浩斯表
            const sched = EbbData.Ebbinghaus_Schedule[String(dayNum)];
            if (!sched) {
                return {
                    NewList: null,
                    Review: [],
                };
            }
            return {
                NewList: sched.NewList || null,
                Review: Array.isArray(sched.Review) ? sched.Review : [],
            };
        }

        if (roundNow === 2) {
            // Round2：短语阶段 => 一周扫完全表
            // 现在还没有你的最终分配方案，先放占位
            // 我直接把 Focus 数组拿出来当“要复习的List”
            const d = ((dayNum-1) % 7) + 1; // 让它循环1~7
            const sched2 = EbbData.Round2_Schedule_7Day[String(d)];
            if (!sched2) {
                return {
                    NewList: null,
                    Review: [],
                };
            }
            return {
                NewList: null,   // 二轮不强调“新List”，全是复盘
                Review: Array.isArray(sched2.Focus) ? sched2.Focus : [],
            };
        }

        if (roundNow === 3) {
            // Round3：句子+知识点阶段 => 同样一周扫完
            const d = ((dayNum-1) % 7) + 1;
            const sched3 = EbbData.Round3_Schedule_7Day[String(d)];
            if (!sched3) {
                return {
                    NewList: null,
                    Review: [],
                };
            }
            return {
                NewList: null,
                Review: Array.isArray(sched3.Focus) ? sched3.Focus : [],
            };
        }

        return {
            NewList: null,
            Review: [],
        };
    }

    // ------------------------------------------
    // 读取今日摘要，提供给UI
    // ------------------------------------------
    function getTodaySnapshot() {
        const dayNum = EbbData.Study_Control.Current_Day;
        const roundNow = getCurrentRound();
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const sched = getScheduleForToday();

        return {
            currentDay: dayNum,
            currentRound: roundNow,
            todayLevels: {
                L0: bucket.Level_0_New.length,
                L1: bucket.Level_1.length,
                L2: bucket.Level_2.length,
                L3: bucket.Level_3.length,
                L4: bucket.Level_4.length,
                L5_Today: bucket.Level_5_Mastered_Today.length,
            },
            schedule: sched,
        };
    }

    // ------------------------------------------
    // 暴露给控制台调试
    // ------------------------------------------
    window.EbbinghausDataAPI = {
        loadData,
        saveData,
        addNewWordsToToday,
        downgradeWordToToday,
        finalizeTodayAndAdvance,
        getTodaySnapshot,
        ensureTodayBucket,
        getScheduleForToday,
        nextRound,
        setCurrentRound,
        get data() {
            return EbbData;
        },
    };

    // ======================================================
    // UI：学士帽按钮 + 弹出面板
    // ======================================================

    let overlayEl = null;
    let overlayCardEl = null;
    let topButtonEl = null;
    let uiReady = false;

    // 根据当前数据生成HTML
    function buildOverlayHTML() {
        if (!EbbData) {
            loadData();
        }
        const snap = getTodaySnapshot();

        // 拼接今日复习安排文字
        let scheduleHTML = '';
        const newStr = snap.schedule.NewList
            ? `<div>新记忆 List：<b style="color:#fff;">${snap.schedule.NewList}</b></div>`
            : '';
        const reviewStr = (snap.schedule.Review && snap.schedule.Review.length > 0)
            ? snap.schedule.Review.join(', ')
            : '（无）';

        scheduleHTML = `
            ${newStr}
            <div>需要复习的旧List：<b style="color:#fff;">${reviewStr}</b></div>
        `;

        const roundName = getRoundName(snap.currentRound);
        const roundDesc = getRoundDesc(snap.currentRound);

        // 面板内容
        return `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                margin-bottom:16px;
                flex-wrap:wrap;
            ">
                <div style="
                    font-size:16px;
                    font-weight:bold;
                    display:flex;
                    align-items:flex-start;
                    gap:8px;
                    color:#fff;
                    line-height:1.4;
                ">
                    <span style="font-size:1.2em;">🎓</span>
                    <div>
                        <div>艾宾浩斯词汇导师</div>
                        <div style="font-size:12px;font-weight:normal;color:#bbb;">
                            第 ${snap.currentDay} 天
                            &nbsp;&nbsp;|&nbsp;&nbsp;
                            ${roundName}
                        </div>
                        <div style="font-size:11px;color:#888;margin-top:2px;">
                            ${roundDesc}
                        </div>
                    </div>
                </div>

                <button id="ebb_close_btn" style="
                    background:rgba(255,255,255,0.08);
                    color:#fff;
                    border:1px solid rgba(255,255,255,0.3);
                    border-radius:8px;
                    font-size:12px;
                    line-height:1;
                    padding:4px 8px;
                    cursor:pointer;
                ">关闭</button>
            </div>

            <!-- 今日Levels概况 -->
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
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">
                    今天掌握进度
                </div>

                <div>Level_0_New：${snap.todayLevels.L0} 个</div>
                <div>Level_1：${snap.todayLevels.L1} 个</div>
                <div>Level_2：${snap.todayLevels.L2} 个</div>
                <div>Level_3：${snap.todayLevels.L3} 个</div>
                <div>Level_4：${snap.todayLevels.L4} 个</div>
                <div>Level_5_Today（待毕业）：${snap.todayLevels.L5_Today} 个</div>
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
                <div style="font-weight:bold;color:#fff;margin-bottom:4px;">
                    今日复习安排
                </div>
                <div style="font-size:13px;color:#bfe4ff;">
                    ${scheduleHTML}
                </div>
            </div>

            <!-- 学习轮次控制 (词→短语→句子) -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                margin-bottom:16px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:8px;">
                    学习轮次（词→短语→句子）
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    你可以手动切换轮次，不同轮次让“教官”用不同提问方式。
                </div>

                <div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:10px;">
                    <button id="ebb_btn_next_round" style="
                        background:#1d4624;
                        border:1px solid #4caf50;
                        border-radius:8px;
                        color:#c4ffd1;
                        padding:8px 12px;
                        font-size:14px;
                        font-weight:bold;
                    ">下一轮 ↗</button>

                    <button id="ebb_btn_round1" style="
                        background:rgba(255,255,255,0.07);
                        border:1px solid rgba(255,255,255,0.25);
                        border-radius:8px;
                        color:#fff;
                        padding:8px 12px;
                        font-size:14px;
                    ">回到第1轮</button>

                    <button id="ebb_btn_round2" style="
                        background:rgba(255,255,255,0.07);
                        border:1px solid rgba(255,255,255,0.25);
                        border-radius:8px;
                        color:#fff;
                        padding:8px 12px;
                        font-size:14px;
                    ">第2轮(短语)</button>

                    <button id="ebb_btn_round3" style="
                        background:rgba(255,255,255,0.07);
                        border:1px solid rgba(255,255,255,0.25);
                        border-radius:8px;
                        color:#fff;
                        padding:8px 12px;
                        font-size:14px;
                    ">第3轮(句子)</button>
                </div>

                <div style="font-size:12px;color:#888;line-height:1.4;">
                    这只是把当前轮次写进 Study_Control.Current_Round。<br/>
                    真正问问题时，“教官”要先读这个值，决定是考“生词本体 / 短语 / 整句+知识点”。
                </div>
            </div>

            <!-- 每日固定流程 -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
                margin-bottom:8px;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">
                    每日固定流程（用你的快速回复去指挥“教官”）
                </div>

                <div style="color:#ccc;margin-bottom:8px;">
                    1. <b>开始学习</b>：把今天这批新词交给教官。
                    教官把这些词写入今天的
                    <code style="color:#fff;">Level_0_New</code>。
                    然后按当前轮次提问你：
                    <br/>Round1 = 单词释义
                    <br/>Round2 = 短语搭配
                    <br/>Round3 = 整句+知识点
                </div>

                <div style="color:#ccc;margin-bottom:8px;">
                    2. <b>复习</b>：按“今日复习安排”里的List逐个抽查旧词。
                    你答错 = 严重警报。
                    教官必须执行
                    <code style="color:#fff;">downgradeWordToToday(该词)</code>：
                    把这个词从毕业List里删掉，并重塞回今天的
                    <code style="color:#fff;">Level_0_New</code> 重新记。
                </div>

                <div style="color:#ccc;">
                    3. <b>结束今天</b>：
                    把今天 <code style="color:#fff;">Level_5_Mastered_Today</code>
                    打包成 <code style="color:#fff;">List{今天Day号}</code>
                    存进 <code style="color:#fff;">Word_Lists</code>；
                    然后让教官执行
                    <code style="color:#fff;">finalizeTodayAndAdvance()</code>
                    ，把 <code style="color:#fff;">Current_Day</code> +1，准备下一天。
                </div>
            </div>
        `;
    }

    function attachOverlayEvents() {
        // 关闭按钮
        const closeBtn = overlayCardEl.querySelector('#ebb_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // 下一轮
        const btnNext = overlayCardEl.querySelector('#ebb_btn_next_round');
        if (btnNext) {
            btnNext.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                nextRound();
                rerenderOverlay();
            }, true);
        }

        // 回到第1轮
        const btnR1 = overlayCardEl.querySelector('#ebb_btn_round1');
        if (btnR1) {
            btnR1.addEventListener('click', (ev)=> {
                ev.preventDefault();
                ev.stopPropagation();
                setCurrentRound(1);
                rerenderOverlay();
            }, true);
        }

        // 第2轮
        const btnR2 = overlayCardEl.querySelector('#ebb_btn_round2');
        if (btnR2) {
            btnR2.addEventListener('click', (ev)=> {
                ev.preventDefault();
                ev.stopPropagation();
                setCurrentRound(2);
                rerenderOverlay();
            }, true);
        }

        // 第3轮
        const btnR3 = overlayCardEl.querySelector('#ebb_btn_round3');
        if (btnR3) {
            btnR3.addEventListener('click', (ev)=> {
                ev.preventDefault();
                ev.stopPropagation();
                setCurrentRound(3);
                rerenderOverlay();
            }, true);
        }
    }

    // 创建或显示面板
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

            // 点击遮罩空白区域关闭
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) {
                    hideOverlay();
                }
            }, true);

            // 卡片
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

        rerenderOverlay();
        overlayEl.style.display = 'flex';
    }

    function rerenderOverlay() {
        if (!overlayCardEl) return;
        overlayCardEl.innerHTML = buildOverlayHTML();
        attachOverlayEvents();
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

    // ------------------------------------------
    // 把顶部学士帽按钮插进工具栏
    // （保持和之前一样，别再丢入口）
    // ------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return;
        }

        // 找一个已经存在的顶栏按钮，拿它的父容器
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button');

        if (!probe || !probe.parentNode) {
            return; // 还没渲染好，继续等
        }

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

        // 🎓图标：我们保留彩色/高亮，方便你快速定位
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

        console.log(`[${EXT_NAME}] Topbar study button inserted ✅`);
    }

    // ------------------------------------------
    // 启动
    // ------------------------------------------
    function init() {
        if (uiReady) return;
        uiReady = true;

        loadData(); // 确保EbbData存在

        // 轮询插入顶部按钮（避免ST顶栏还没画完）
        let tries = 0;
        const maxTries = 100;
        const intv = setInterval(() => {
            tries++;
            insertTopButtonIfMissing();

            if (topButtonEl) {
                clearInterval(intv);
                console.log(`[${EXT_NAME}] UI injection complete.`);
            } else {
                if (tries >= maxTries) {
                    clearInterval(intv);
                    console.warn(`[${EXT_NAME}] Failed to locate toolbar for top button.`);
                }
            }
        }, 200);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
