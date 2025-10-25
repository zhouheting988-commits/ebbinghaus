// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.6.1 (UI回到你喜欢的布局样式)
//  作者: Dauvier & ChatGPT
//
// 变动总结（相对0.6.0）：
//  - 学士帽按钮🎓保留在顶栏，别丢入口
//  - 弹出的面板恢复“5.0版”布局：
//      • 顶部：左边🎓+标题，右边[关闭]
//      • 第一块灰卡片 = 今天是第几天 + 当前轮次 + 这一轮干嘛 + 各个Level数量
//      • 第二块蓝卡片 = 今日复习安排（用你给的25天表）
//      • 第三块灰卡片 = 学习轮次切换(下一轮↗ / 回到第1轮 / 第2轮(短语) / 第3轮(句子))
//      • 第四块灰卡片 = 每日固定流程（开始学习 / 复习 / 结束今天）
//
//  数据保持0.6.0：
//    - Ebbinghaus_Schedule: 已写入你Day1~Day25固定表
//    - Round2_Schedule_7Day / Round3_Schedule_7Day: 预留一周冲刺位
//    - Study_Control: Current_Day(第几天) + Current_Round(第几轮:1词/2短语/3句子)
//    - finalizeTodayAndAdvance(): 打包今天掌握词成 List{Day}，推进天数+1
//
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v1';

    // ------------------------------------------
    // 默认数据骨架
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
            // "List1": ["wordA", "wordB", ...]
        },

        // Round1（单词阶段）25天艾宾浩斯固定计划
        // NewList: 当天主背的新List
        // Review: 旧List复习清单
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

        // Round2/3 一周冲刺预留：等你给我7天分配表我就灌进去
        Round2_Schedule_7Day: {
            // "1": { Focus: ["List1","List2","List3"] },
            // ...
        },
        Round3_Schedule_7Day: {
            // "1": { Focus: ["List1","List2","List3"] },
            // ...
        },

        Study_Control: {
            Current_Day: 1,    // 第几天（学习进度Day，不是现实日历）
            Current_Round: 1,  // 1=单词, 2=短语, 3=句子
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
    // 读/写 本地存档
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

                // 补齐新字段（兼容老存档）
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
    // Round 操作
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
        // 用和你截图一致的样式：Round 1 / 3
        switch (r) {
            case 1: return 'Round 1 / 3';
            case 2: return 'Round 2 / 3';
            case 3: return 'Round 3 / 3';
            default:return `Round ${r}`;
        }
    }

    function getRoundDesc(r) {
        if (r === 1) {
            return '第一轮：单词阶段（只给英文单词+中文提示）';
        }
        if (r === 2) {
            return '第二轮：短语阶段（固定搭配/近义表达）';
        }
        if (r === 3) {
            return '第三轮：句子阶段（整句+知识点语境）';
        }
        return '';
    }

    // ------------------------------------------
    // 确保“今天的桶”存在
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
    // （让“教官”去做这步）
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
    // 操作2：降级错词
    // 把它从所有level踢掉 -> 放回今天 Level_0_New
    // 再把它从毕业List里移除
    // ------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 从当日所有level剔除
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }

        // 放回 Level_0_New
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

    // ------------------------------------------
    // 操作3：结束今天 → 打包毕业词 + 推进Day
    // 1) 把今天 Level_5_Mastered_Today 打成 List{Day}
    // 2) 清空 L5_Today
    // 3) Current_Day +1
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

        // 清空今天已掌握
        bucket.Level_5_Mastered_Today = [];

        // 推进Day
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // ------------------------------------------
    // 读今日复习安排（根据当前Round）
    // Round1 => 25天表
    // Round2/Round3 => 7天冲刺表（预留，等你给）
    // ------------------------------------------
    function getScheduleForToday() {
        const roundNow = getCurrentRound();
        const dayNum = EbbData.Study_Control.Current_Day;

        if (roundNow === 1) {
            // 单词阶段：用25天艾宾浩斯表
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
            // 短语阶段：一周冲刺 (预留)
            const d = ((dayNum-1) % 7) + 1;
            const sched2 = EbbData.Round2_Schedule_7Day[String(d)];
            if (!sched2) {
                return { NewList: null, Review: [] };
            }
            return {
                NewList: null,
                Review: Array.isArray(sched2.Focus) ? sched2.Focus : [],
            };
        }

        if (roundNow === 3) {
            // 句子阶段：一周冲刺 (预留)
            const d = ((dayNum-1) % 7) + 1;
            const sched3 = EbbData.Round3_Schedule_7Day[String(d)];
            if (!sched3) {
                return { NewList: null, Review: [] };
            }
            return {
                NewList: null,
                Review: Array.isArray(sched3.Focus) ? sched3.Focus : [],
            };
        }

        // fallback
        return {
            NewList: null,
            Review: [],
        };
    }

    // ------------------------------------------
    // 今日快照（给UI用）
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
    // 给控制台调试
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
    // UI：学士帽按钮 + 弹出面板 (回归你喜欢的布局)
    // ======================================================

    let overlayEl = null;
    let overlayCardEl = null;
    let topButtonEl = null;
    let uiReady = false;

    // --- 生成面板HTML（5.0式布局） ---
    function buildOverlayHTML() {
        if (!EbbData) {
            loadData();
        }
        const snap = getTodaySnapshot();

        const roundName = getRoundName(snap.currentRound);
        const roundDesc = getRoundDesc(snap.currentRound);

        // 今日复习安排
        const reviewStr = (snap.schedule.Review && snap.schedule.Review.length > 0)
            ? snap.schedule.Review.join(', ')
            : '（无）';

        const newListLine = snap.schedule.NewList
            ? `<div>新记忆 List：<b style="color:#fff;">${snap.schedule.NewList}</b></div>`
            : `<div>新记忆 List：<span style="color:#888;">（无）</span></div>`;

        // 这一块是最上面的大灰卡片：第几天 / Round几 / 当前轮次描述 / 各个Level数量
        const topSummaryBoxHTML = `
            <div style="
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:8px;
                padding:12px 12px 10px 12px;
                margin-bottom:16px;
                color:#ccc;
                line-height:1.5;
                font-size:14px;
            ">

                <div style="font-weight:bold;color:#fff;margin-bottom:6px;line-height:1.4;">
                    <span style="
                        display:inline-block;
                        background:#c33;
                        color:#fff;
                        font-size:11px;
                        line-height:1;
                        padding:2px 4px;
                        border-radius:4px;
                        font-weight:bold;
                        margin-right:6px;
                    ">
                        Day ${snap.currentDay}
                    </span>
                    第 ${snap.currentDay} 天 ｜ ${roundName}
                </div>

                <div style="font-size:12px;color:#bbb;line-height:1.4;margin-bottom:10px;">
                    ${roundDesc}
                </div>

                <div style="
                    background:rgba(0,0,0,0.2);
                    border:1px solid rgba(255,255,255,0.1);
                    border-radius:6px;
                    padding:10px 12px;
                    font-size:14px;
                    color:#e0e0e0;
                    line-height:1.6;
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
            </div>
        `;

        // 今日复习安排（蓝边卡片）
        const scheduleBoxHTML = `
            <div style="
                background:rgba(0,0,0,0.4);
                border:1px solid rgba(0,150,255,0.4);
                border-radius:10px;
                padding:12px;
                margin-bottom:16px;
                color:#bfe4ff;
                font-size:14px;
                line-height:1.5;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:8px;font-size:16px;">
                    今日复习安排
                </div>
                <div style="font-size:14px;color:#bfe4ff;">
                    ${newListLine}
                    <div>需要复习的旧List：
                        <b style="color:#fff;">${reviewStr}</b>
                    </div>
                </div>
            </div>
        `;

        // 学习轮次控制（词→短语→句子）
        const roundControlBoxHTML = `
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:12px;
                margin-bottom:16px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:8px;font-size:16px;">
                    学习轮次（词→短语→句子）
                </div>

                <div style="color:#ccc;margin-bottom:10px;font-size:14px;">
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
                    这只是把当前轮次写进
                    Study_Control.Current_Round。<br/>
                    真正问问题时，“教官”要先读这个值，决定是考
                    “生词本体 / 短语 / 整句+知识点”。
                </div>
            </div>
        `;

        // 每日固定流程卡片
        const dailyFlowBoxHTML = `
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
                margin-bottom:8px;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:8px;font-size:16px;">
                    每日固定流程（用你的快速回复去指挥“教官”）
                </div>

                <div style="color:#ccc;margin-bottom:10px;font-size:14px;">
                    <b>1. 开始学习</b>：把今天这批新词交给教官。
                    教官把这些词写入今天的
                    <code style="color:#fff;">Level_0_New</code>。
                    然后按当前轮次提问你：
                    Round1=单词释义 / Round2=短语搭配 / Round3=整句+知识点。
                </div>

                <div style="color:#ccc;margin-bottom:10px;font-size:14px;">
                    <b>2. 复习</b>：按“今日复习安排”里的List逐个抽查旧词。<br/>
                    你答错 = 严重警报。
                    教官必须执行
                    <code style="color:#fff;">downgradeWordToToday(该词)</code>：
                    把这个词从毕业List里删掉，
                    并重塞回今天的
                    <code style="color:#fff;">Level_0_New</code>
                    重新记。
                </div>

                <div style="color:#ccc;font-size:14px;">
                    <b>3. 结束今天</b>：
                    把今天
                    <code style="color:#fff;">Level_5_Mastered_Today</code>
                    打包成
                    <code style="color:#fff;">List{今天Day号}</code>
                    存进
                    <code style="color:#fff;">Word_Lists</code>；<br/>
                    然后让教官执行
                    <code style="color:#fff;">finalizeTodayAndAdvance()</code>，
                    把
                    <code style="color:#fff;">Current_Day</code> +1，准备明天。
                </div>
            </div>
        `;

        // 整个面板：顶部header(🎓 + 关闭按钮) + 四个卡片
        return `
            <!-- Header行：左=icon+标题 右=[关闭] -->
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:flex-start;
                margin-bottom:16px;
                flex-wrap:nowrap;
            ">
                <div style="
                    display:flex;
                    align-items:flex-start;
                    gap:8px;
                    color:#fff;
                    line-height:1.3;
                    font-size:16px;
                    font-weight:bold;
                ">
                    <span style="font-size:1.2em;line-height:1;">🎓</span>
                    <div style="color:#fff;">艾宾浩斯词汇导师</div>
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

            ${topSummaryBoxHTML}
            ${scheduleBoxHTML}
            ${roundControlBoxHTML}
            ${dailyFlowBoxHTML}
        `;
    }

    // --- 把按钮事件绑上去 ---
    function attachOverlayEvents() {
        // 关闭
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

    // --- 显示/隐藏/重渲染 overlay ---
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

            // 点击灰遮罩空白处 => 关闭
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) {
                    hideOverlay();
                }
            }, true);

            // 黑色卡片
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
    // 把顶部🎓按钮插进工具栏（保持入口不丢）
    // ------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return;
        }

        // 找现成的顶栏按钮，复用它的父容器
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button');

        if (!probe || !probe.parentNode) {
            return; // 还没渲染完，下一轮再试
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

        // 用 🎓 图标，保持你喜欢的高亮、位置、辨识度
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

        loadData(); // 确保EbbData准备好

        // 轮询，等顶栏渲染出来再塞我们的🎓
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
