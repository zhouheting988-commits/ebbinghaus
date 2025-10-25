// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.5.0
//  作者: Dauvier & ChatGPT
//
//  这个版本的 UI 行为：
//   1. 顶栏 🎓 按钮 → 弹出黑色面板
//   2. 面板顶部显示日期徽章 + 当前Day和轮次
//   3. 下面一行4个分页按钮：
//        [掌握进度] Vocabulary_Mastery
//           表格：每一行=Day_1 / Day_2 / Day_3 ...
//                  每列=Level_0_New(新词/答错), Level_1, ..., Level_5
//        [单词清单] Word_Lists
//           表格：ListName | Words
//        [复习计划] Ebbinghaus_Schedule
//           表格：Day | NewList | Review1 | Review2 | Review3 | Review4...
//        [学习控制] Study_Control
//           Current_Day / Current_Round 表格 + 轮次切换按钮
//
//   4. Round(第几轮) 只在第4个分页里可以看到+切换
//
//   5. 数据持久化在 localStorage
//
//  全局API (window.EbbinghausDataAPI):
//    addNewWordsToToday([...])
//    downgradeWordToToday("word")
//    finalizeTodayAndAdvance()
//    nextRound(), setRound(n), getRound()
//    getTodaySnapshot()
//    saveData(), loadData()
//
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v2';

// ------------------------------------------
// 数据区：默认存档骨架（已按你的计划表更新）
// ------------------------------------------
const defaultData = {
    Vocabulary_Mastery: {
        // 运行时会自动生成：
        // "Day_1": {
        //     Level_0_New: [],
        //     Level_1: [],
        //     Level_2: [],
        //     Level_3: [],
        //     Level_4: [],
        //     Level_5_Mastered_Today: [],
        // }
    },

    // 每天结束后打包出来的毕业清单
    // 比如 Day 1 结束后把完全掌握的词放进 List1
    Word_Lists: {
        // "List1": ["wordA","wordB",...]
    },

    // === 这是你那张“艾宾浩斯遗忘曲线复习计划表” ===
    // Round 1（第一轮=单词阶段）专用的日程。
    //
    // 解释：
    // "1":  { NewList: "List1",  Review: [] }
    // 代表：
    //   Day 1 这天要新背的词包是 List1
    //   复习旧词列表为空
    //
    // "6":  { NewList: "List6",  Review: ["List2","List4","List5"] }
    // 代表：
    //   Day 6 新背 List6
    //   同时复习 List2 / List4 / List5
    //
    Ebbinghaus_Schedule: {
        "1":  { NewList: "List1",  Review: [] },
        "2":  { NewList: "List2",  Review: ["List1"] },
        "3":  { NewList: "List3",  Review: ["List1", "List2"] },
        "4":  { NewList: "List4",  Review: ["List2", "List3"] },
        "5":  { NewList: "List5",  Review: ["List1", "List3", "List4"] },
        "6":  { NewList: "List6",  Review: ["List2", "List4", "List5"] },
        "7":  { NewList: "List7",  Review: ["List3", "List5", "List6"] },
        "8":  { NewList: "List8",  Review: ["List1", "List4", "List6", "List7"] },
        "9":  { NewList: "List9",  Review: ["List2", "List5", "List7", "List8"] },
        "10": { NewList: "List10", Review: ["List3", "List6", "List8", "List9"] },

        // 从 Day11 往后，你的表进入“回收阶段”
        // 不再新增 List11、List12…，而是开始把旧List再次拉出来复查
        "11": { NewList: "List4",  Review: ["List7", "List9", "List10"] },
        "12": { NewList: "List5",  Review: ["List8", "List10"] },
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
    },

    // 学习控制信息（保持不动）
    //
    // Current_Day: 现在是第几天（不是现实日历，是训练进度）
    // Current_Round: 当前是第几轮
    //   1 = 单词轮 (Round 1: 纯单词)
    //   2 = 短语轮 (Round 2: 短语搭配)
    //   3 = 句子轮 (Round 3: 整句+知识点)
    //
    Study_Control: {
        Current_Day: 1,
        Current_Round: 1,   // 保持轮次系统不变，UI第4页会读这个
    },
};
    let EbbData = null;

    // ------------------------------------------
    // 工具：深拷贝
    // ------------------------------------------
    function deepClone(obj) {
        if (window.structuredClone) return window.structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    }

    // ------------------------------------------
    // 存档读写
    // ------------------------------------------
    function loadData() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                EbbData = deepClone(defaultData);
                saveData();
            } else {
                EbbData = JSON.parse(raw);

                // 兼容老版本没有 Study_Control 或没有 Current_Round
                if (!EbbData.Study_Control) {
                    EbbData.Study_Control = { Current_Day: 1, Current_Round: 1 };
                } else if (typeof EbbData.Study_Control.Current_Round !== 'number') {
                    EbbData.Study_Control.Current_Round = 1;
                }

                saveData();
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

    // ------------------------------------------
    // 保证“今天这一天”的桶存在
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
    // API 1: 加入新词到今天的 Level_0_New
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
    // API 2: 复习错词降级
    //  - 把词从今天所有等级移除
    //  - 放回今天的 Level_0_New
    //  - 同时从所有 Word_Lists 里删掉它
    // ------------------------------------------
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

        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx, 1);
            }
        }

        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        for (const listName of Object.keys(EbbData.Word_Lists)) {
            const arr = EbbData.Word_Lists[listName];
            const idx2 = arr.indexOf(word);
            if (idx2 !== -1) {
                arr.splice(idx2, 1);
            }
        }

        saveData();
    }

    // ------------------------------------------
    // API 3: 结束今天并推进
    // 1) 把今天的 Level_5_Mastered_Today 作为 List{Day号} 存进 Word_Lists
    // 2) 清空 Level_5_Mastered_Today
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

        bucket.Level_5_Mastered_Today = [];
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // ------------------------------------------
    // Round(轮次)
    // ------------------------------------------
    function nextRound() {
        const sc = EbbData.Study_Control;
        let r = Number(sc.Current_Round) || 1;
        r = Math.min(r + 1, 3);
        sc.Current_Round = r;
        saveData();
        return r;
    }

    function setRound(num) {
        const sc = EbbData.Study_Control;
        const n = Math.min(Math.max(parseInt(num || 1, 10), 1), 3);
        sc.Current_Round = n;
        saveData();
        return n;
    }

    function getRound() {
        return EbbData.Study_Control.Current_Round || 1;
    }

    // ------------------------------------------
    // 汇总快照（给UI）
    // ------------------------------------------
    function getTodaySnapshot() {
        const sc = EbbData.Study_Control;
        const todayNum = sc.Current_Day;
        const roundNow = getRound();

        const roundNameMap = {
            1: '第一轮：单词阶段（只给英文词+中文提示）',
            2: '第二轮：短语阶段（把单词塞进短语里考你）',
            3: '第三轮：句子阶段（整句+知识点）',
        };

        const dayKey = ensureTodayBucket();
        const bucketToday = EbbData.Vocabulary_Mastery[dayKey];

        const schedToday = EbbData.Ebbinghaus_Schedule[String(todayNum)] || {
            NewList: "(未定义)",
            Review: []
        };

        return {
            currentDay: todayNum,
            currentRound: roundNow,
            currentRoundDesc: roundNameMap[roundNow] || '未知轮次',

            bucketToday,
            schedToday,
        };
    }

    // ------------------------------------------
    // 挂到全局
    // ------------------------------------------
    window.EbbinghausDataAPI = {
        loadData,
        saveData,
        ensureTodayBucket,

        addNewWordsToToday,
        downgradeWordToToday,
        finalizeTodayAndAdvance,

        nextRound,
        setRound,
        getRound,

        getTodaySnapshot,

        get data() {
            return EbbData;
        },
    };

    // ======================================================
    // UI 部分
    // ======================================================

    let overlayEl = null;
    let overlayCardEl = null;
    let topButtonEl = null;
    let uiReady = false;

    // 当前激活分页
    // 0=掌握进度 1=单词清单 2=复习计划 3=学习控制
    let activeTabIndex = 0;

    // ---------- 日期徽章 ----------
    function buildDateBadgeHTML() {
        const now = new Date();
        const month = now.getMonth() + 1;
        const day = now.getDate();

        return `
            <div style="
                background:#b30000;
                border-radius:6px;
                color:#fff;
                font-size:11px;
                font-weight:bold;
                line-height:1.2;
                min-width:38px;
                text-align:center;
                box-shadow:0 2px 4px rgba(0,0,0,0.5);
                border:1px solid rgba(255,255,255,0.4);
                padding:4px 4px 3px 4px;
            ">
                <div style="font-size:10px; border-bottom:1px solid rgba(255,255,255,0.4);padding-bottom:2px;margin-bottom:2px;">
                    ${month}月
                </div>
                <div style="font-size:14px;">${day}</div>
            </div>
        `;
    }

    // ======================================================
    // 分页1：掌握进度 (Vocabulary_Mastery)
    //
    // 每一行是 Day_1 / Day_2 ...
    // 每一列是 Level_0_New, Level_1, ..., Level_5_Mastered_Today
    //
    // 表头示例：
    // Day | Level_0_New(新词/答错) | Level_1 | Level_2 | Level_3 | Level_4 | Level_5
    // ======================================================
    function buildTabVocabularyHTML_AllDays() {
    // 收集所有 Day_*（按编号排序）
    const days = Object.keys(EbbData.Vocabulary_Mastery || {})
        .map(k => parseInt(k.replace('Day_',''), 10))
        .filter(n => !Number.isNaN(n))
        .sort((a,b)=>a-b);

    // 如果还没开始，也给出 Day_1 的空行
    if (days.length === 0) days.push(EbbData.Study_Control?.Current_Day || 1);

    let rows = '';
    for (const d of days) {
        const key = 'Day_' + d;
        const b = EbbData.Vocabulary_Mastery[key] || {
            Level_0_New:[], Level_1:[], Level_2:[], Level_3:[], Level_4:[], Level_5_Mastered_Today:[]
        };
        const fmt = arr => (arr && arr.length) ? arr.join(', ') : '…';

        rows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">Day ${d}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_0_New)}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_1)}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_2)}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_3)}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_4)}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${fmt(b.Level_5_Mastered_Today)}</td>
        </tr>`;
    }

    return `
    <div style="border:1px solid rgba(255,255,255,0.25);border-radius:8px;background:rgba(0,0,0,0.2);padding:8px 10px;">
        <div style="max-height:240px;overflow:auto;-webkit-overflow-scrolling:touch;">
            <table style="border-collapse:collapse;min-width:700px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.12);border-radius:6px;overflow:hidden;">
                <thead style="background:rgba(255,255,255,0.07);">
                    <tr>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Day</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_0_New（新词/答错）</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_1</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_2</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_3</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_4</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Level_5</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
    }

    // ======================================================
    // 分页2：单词清单 (Word_Lists)
    //
    // 你的截图是两列：
    //   ListName | Words
    // row: List1 | create, desire, help, ... (所有Day1掌握的单词)
    // ======================================================
    function buildTabWordListsHTML() {
    const lists = EbbData.Word_Lists || {};
    const names = Object.keys(lists); // 原样顺序；你也可以按 List1…List10 排序

    let rows = '';
    for (const name of names) {
        const words = lists[name] || [];
        rows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${name}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;">${words.length ? words.join(', ') : '…'}</td>
        </tr>`;
    }

    return `
    <div style="border:1px solid rgba(255,255,255,0.25);border-radius:8px;background:rgba(0,0,0,0.2);padding:8px 10px;">
        <div style="max-height:240px;overflow-y:auto;-webkit-overflow-scrolling:touch;">
            <table style="border-collapse:collapse;min-width:420px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.12);border-radius:6px;overflow:hidden;">
                <thead style="background:rgba(255,255,255,0.07);">
                    <tr>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">ListName</th>
                        <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;">Words</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>
    </div>`;
    }

    // ======================================================
    // 分页3：复习计划 (Ebbinghaus_Schedule)
    //
    // 你的截图结构：
    //   Day | NewList | Review1 | Review2 | Review3 | Review4 ...
    //
    // 我们会自动计算一共有多少列 ReviewX，
    // 找出所有天里 Review 数组的最大长度 = maxReviewLen
    // 然后生成 Review1..ReviewN 列头
    // ======================================================
    function buildTabScheduleHTML() {
    // 确保有最新数据
    const sched = EbbData.Ebbinghaus_Schedule || {};

    // 取所有天数，按数字从小到大排
    const days = Object.keys(sched)
        .map(d => parseInt(d, 10))
        .sort((a, b) => a - b);

    // 左侧表：Day / NewList / Review1
    let leftRows = '';
    for (const dayNum of days) {
        const entry = sched[String(dayNum)] || { NewList: '', Review: [] };
        const review1 = entry.Review[0] || '…';

        leftRows += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${dayNum}</td>
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${entry.NewList || '—'}</td>
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${review1}</td>
            </tr>
        `;
    }

    // 右侧表：Review2 / Review3 / Review4 / Review5
    // （手机宽度的原因，我们把第2列以后都塞到右边这张表里）
    let rightRows = '';
    for (const dayNum of days) {
        const entry = sched[String(dayNum)] || { Review: [] };

        const review2 = entry.Review[1] || '…';
        const review3 = entry.Review[2] || '…';
        const review4 = entry.Review[3] || '…';
        const review5 = entry.Review[4] || '…';

        rightRows += `
            <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${review2}</td>
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${review3}</td>
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${review4}</td>
                <td style="padding:6px 10px; color:#fff; font-size:14px; white-space:nowrap;">${review5}</td>
            </tr>
        `;
    }

    // 整个块：
    // 1. 最上面那行小说明不用改
    // 2. 我们做了一个外层 scrollContainer，有 max-height 和 overflow-y:auto
    //    → 这样你就可以往下滑从 Day1 一直看到 Day25，不再卡在前5行
    // 3. scrollContainer 里面是两个 table 横着摆，
    //    你可以左右轻轻拖一下，把右半边 (Review2~Review5) 看出来
    return `
        <div style="color:#ddd;font-size:14px;line-height:1.4;margin-bottom:12px;">
            每天要学的新词(NewList) + 要复习的旧词组(Review列)。
        </div>

        <div style="
            border:1px solid rgba(255,255,255,0.25);
            border-radius:8px;
            background:rgba(0,0,0,0.2);
            padding:8px 10px;
        ">

            <div style="
                max-height:220px;
                overflow-y:auto;
                /* 我们让竖向滚动在这个容器里发生 */
            ">

                <div style="
                    display:flex;
                    flex-wrap:nowrap;
                    gap:12px;
                    overflow-x:auto;
function buildTabScheduleHTML() {
    const sched = EbbData.Ebbinghaus_Schedule || {};
    const days = Object.keys(sched).map(n => parseInt(n, 10)).sort((a,b)=>a-b);

    let leftRows = '';
    for (const d of days) {
        const e = sched[String(d)] || { NewList:'', Review:[] };
        leftRows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${d}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${e.NewList || '—'}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${e.Review?.[0] || '…'}</td>
        </tr>`;
    }

    let rightRows = '';
    for (const d of days) {
        const r = (sched[String(d)]?.Review) || [];
        rightRows += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.07);">
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${r[1] || '…'}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${r[2] || '…'}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${r[3] || '…'}</td>
            <td style="padding:6px 10px;color:#fff;font-size:14px;white-space:nowrap;">${r[4] || '…'}</td>
        </tr>`;
    }

    return `
    <div style="color:#ddd;font-size:14px;line-height:1.4;margin-bottom:12px;">
        每天要学的新词(NewList) + 要复习的旧词组(Review列)。
    </div>
    <div style="border:1px solid rgba(255,255,255,0.25);border-radius:8px;background:rgba(0,0,0,0.2);padding:8px 10px;">
        <div style="max-height:240px;overflow-y:auto;">
            <div style="display:flex;gap:12px;overflow-x:auto;-webkit-overflow-scrolling:touch;">
                <table style="border-collapse:collapse;min-width:220px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.12);border-radius:6px;overflow:hidden;flex-shrink:0;">
                    <thead style="background:rgba(255,255,255,0.07);">
                        <tr>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Day</th>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">NewList</th>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Review1</th>
                        </tr>
                    </thead>
                    <tbody>${leftRows}</tbody>
                </table>

                <table style="border-collapse:collapse;min-width:260px;background:rgba(0,0,0,0.15);border:1px solid rgba(255,255,255,0.12);border-radius:6px;overflow:hidden;flex-shrink:0;">
                    <thead style="background:rgba(255,255,255,0.07);">
                        <tr>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Review2</th>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Review3</th>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Review4</th>
                            <th style="text-align:left;padding:6px 10px;color:#fff;font-size:13px;font-weight:bold;white-space:nowrap;">Review5</th>
                        </tr>
                    </thead>
                    <tbody>${rightRows}</tbody>
                </table>
            </div>
        </div>
    </div>`;
}

    // ======================================================
    // 分页4：学习控制 (Study_Control + 轮次按钮)
    // ======================================================
    function buildTabStudyControlHTML() {
        const sc = EbbData.Study_Control;
        const snapshot = getTodaySnapshot();

        const currentDay = sc.Current_Day;
        const currentRound = sc.Current_Round;

        const trs = `
            <tr>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;white-space:nowrap;vertical-align:top;">
                    Current_Day
                </td>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;text-align:center;vertical-align:top;">
                    ${currentDay}
                </td>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;">
                    现在是第几天
                </td>
            </tr>
            <tr>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;white-space:nowrap;vertical-align:top;">
                    Current_Round
                </td>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;text-align:center;vertical-align:top;">
                    ${currentRound}
                </td>
                <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;">
                    ${snapshot.currentRoundDesc}
                </td>
            </tr>
        `;

        const roundBtnsHTML = `
            <div style="margin-top:12px; display:flex; flex-wrap:wrap; gap:8px;">
                <button class="ebb_round_btn" data-round-action="next" style="
                    flex:1;min-width:90px;
                    background:linear-gradient(135deg,#1e3a1e,#0f2a0f);
                    color:#9cff9c;
                    border:1px solid #2a6b2a;
                    border-radius:8px;
                    font-size:13px;
                    line-height:1.4;
                    padding:8px;
                    cursor:pointer;
                    text-align:center;
                    font-weight:bold;
                ">下一轮 ↗</button>

                <button class="ebb_round_btn" data-round-action="set1" style="
                    flex:1;min-width:90px;
                    background:#2a2a2a;
                    color:#fff;
                    border:1px solid rgba(255,255,255,0.2);
                    border-radius:8px;
                    font-size:13px;
                    line-height:1.4;
                    padding:8px;
                    cursor:pointer;
                    text-align:center;
                ">第1轮(单词)</button>

                <button class="ebb_round_btn" data-round-action="set2" style="
                    flex:1;min-width:90px;
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
                    flex:1;min-width:90px;
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
                这些按钮只是在 Study_Control 里更新 Current_Round。<br/>
                让“教官”提问时，他要先读这个值，决定考你单词 / 短语 / 整句+知识点。
            </div>

            <div style="margin-top:16px; font-size:12px; color:#999; line-height:1.4;">
                日终请让“教官”执行
                <code style="color:#fff;">finalizeTodayAndAdvance()</code>
                ：把今天的 Level_5_Mastered_Today 打包成新 List，并把 Current_Day +1。
            </div>
        `;

        return `
            <div style="font-size:13px;color:#ccc;line-height:1.4;margin-bottom:8px;">
                学习控制面板：今天是第几天、当前是第几轮，和轮次切换。
            </div>

            <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.15); border-radius:8px;">
                <table style="border-collapse:collapse; font-size:13px; min-width:100%;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.08);color:#fff;">
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">字段</th>
                            <th style="text-align:center;padding:6px 8px;white-space:nowrap;">值</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">说明</th>
                        </tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>

            ${roundBtnsHTML}
        `;
    }

    // ======================================================
    // 总面板：标题区 + tab按钮 + 当前tab内容
    // ======================================================
    function buildOverlayOuterHTML() {
        if (!EbbData) loadData();

        const snap = getTodaySnapshot();
        const dateBadge = buildDateBadgeHTML();

        const tabNames = [
            '掌握进度',
            '单词清单',
            '复习计划',
            '学习控制',
        ];

        const tabButtonsHTML = tabNames.map((name, idx) => {
            const active = (idx === activeTabIndex);
            return `
                <button class="ebb_tab_btn" data-tab-index="${idx}" style="
                    flex:1;
                    min-width:0;
                    white-space:nowrap;
                    overflow:hidden;
                    text-overflow:ellipsis;
                    font-size:13px;
                    line-height:1.4;
                    padding:8px 6px;
                    border-radius:6px;
                    border:1px solid ${active?'rgba(255,255,255,0.6)':'rgba(255,255,255,0.15)'};
                    background:${active?'rgba(255,255,255,0.12)':'rgba(255,255,255,0.03)'};
                    color:#fff;
                    font-weight:${active?'600':'400'};
                    text-align:center;
                ">${name}</button>
            `;
        }).join('');

        let tabContentHTML = '';
        if (activeTabIndex === 0) {
            tabContentHTML = buildTabVocabularyHTML_AllDays();
        } else if (activeTabIndex === 1) {
            tabContentHTML = buildTabWordListsHTML();
        } else if (activeTabIndex === 2) {
            tabContentHTML = buildTabScheduleHTML();
        } else {
            tabContentHTML = buildTabStudyControlHTML();
        }

        return `
            <!-- 顶部标题块 -->
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;">
                <div style="display:flex;flex-direction:column;gap:6px;color:#fff;">
                    <div style="font-size:16px;font-weight:bold;display:flex;align-items:center;gap:8px;line-height:1.3;">
                        <span style="font-size:1.2em;">🎓</span>
                        <span>艾宾浩斯词汇导师</span>
                    </div>
                    <div style="display:flex;align-items:center;gap:8px;font-size:12px;color:#ccc;line-height:1.4;">
                        ${dateBadge}
                        <div style="display:flex;flex-direction:column;line-height:1.4;">
                            <div>第 <b style="color:#fff;">${snap.currentDay}</b> 天</div>
                            <div>Round <b style="color:#fff;">${snap.currentRound}</b> / 3</div>
                        </div>
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
                    flex-shrink:0;
                ">关闭</button>
            </div>

            <!-- Tab按钮行 -->
            <div style="
                display:flex;
                flex-wrap:nowrap;
                gap:6px;
                margin-bottom:12px;
            ">
                ${tabButtonsHTML}
            </div>

            <!-- Tab内容 -->
            <div style="font-family:'Inter','PingFang SC','Microsoft YaHei',sans-serif;">
                ${tabContentHTML}
            </div>
        `;
    }

    // ======================================================
    // 显示/隐藏面板 + 事件绑定
    // ======================================================
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

            // 点击遮罩空白 -> 关闭
            overlayEl.addEventListener('click', (ev) => {
                if (ev.target === overlayEl) hideOverlay();
            }, true);

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

        overlayCardEl.innerHTML = buildOverlayOuterHTML();
        bindOverlayInnerEvents();
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

    function bindOverlayInnerEvents() {
        if (!overlayCardEl) return;

        // 关闭按钮
        const closeBtn = overlayCardEl.querySelector('#ebb_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // Tab切换按钮
        overlayCardEl.querySelectorAll('.ebb_tab_btn').forEach(btn => {
            btn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                const idx = parseInt(btn.getAttribute('data-tab-index'), 10);
                activeTabIndex = idx;
                overlayCardEl.innerHTML = buildOverlayOuterHTML();
                bindOverlayInnerEvents();
            }, true);
        });

        // 轮次按钮（仅在第4页）
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
                // 重新渲染当前tab
                overlayCardEl.innerHTML = buildOverlayOuterHTML();
                bindOverlayInnerEvents();
            }, true);
        });
    }

    // ======================================================
    // 顶栏学士帽按钮 注入
    // ======================================================
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) return;

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

        // 保留 🎓 外观，和你喜欢的那个小帽子位置一致
        topButtonEl.innerHTML = `
            <span style="font-size:18px;line-height:18px;filter:brightness(1.2);">🎓</span>
        `;

        topButtonEl.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOverlay();
        }, true);

        toolbar.appendChild(topButtonEl);
        console.log(`[${EXT_NAME}] Topbar study button inserted.`);
    }

    // ======================================================
    // 启动
    // ======================================================
    function init() {
        if (uiReady) return;
        uiReady = true;
        loadData();

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
