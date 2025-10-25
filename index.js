// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.3.0
//  作者: Dauvier & ChatGPT
//  作用:
//   1. 在顶部栏放一个学位帽按钮
//   2. 点击弹出“学习仪表盘”面板
//   3. 管理四张核心表并持久化到 localStorage
//      - Vocabulary_Mastery
//      - Word_Lists
//      - Ebbinghaus_Schedule
//      - Study_Control
//   4. 暴露一组安全API，让“教官”在对话里合法地操作单词
// ======================================================

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const STORAGE_KEY = 'EbbinghausTrainerData_v1';

    // ------------------------------------------
    // 数据区：默认存档骨架
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
            // "List1": ["wordA","wordB",...]
        },
        Ebbinghaus_Schedule: {
            // 你可以之后用自己的艾宾浩斯计划表完全覆盖这里
            "1": { NewList: "List1", Review: [] },
            "2": { NewList: "List2", Review: ["List1"] },
            "3": { NewList: "List3", Review: ["List1","List2"] },
            "4": { NewList: "List4", Review: ["List2","List3"] },
            "5": { NewList: "List5", Review: ["List1","List3","List4"] },
        },
        Study_Control: {
            Current_Day: 1,
        },
    };

    // 内存镜像（运行时的实时数据）
    let EbbData = null;

    // ------------------------------------------
    // 工具：深拷贝（兼容旧环境，没有 structuredClone 的时候用 JSON 方案）
    // ------------------------------------------
    function deepClone(obj) {
        if (window.structuredClone) return window.structuredClone(obj);
        return JSON.parse(JSON.stringify(obj));
    }

    // ------------------------------------------
    // 读 / 写 本地存档
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
    // 保证“今天这一天”的桶存在
    // 例如 Current_Day = 12 -> "Day_12"
    // 并且如果这一天还没建过，就建好六个等级列
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
    // 操作函数 1: 往今天的 Level_0_New 里塞一批新词
    // 用途：开始学习一批词 / 或者把别的地方来的词导入今天重新记
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
    // 操作函数 2: 降级一个词（复习阶段的“严重警报”用）
    //
    // 规则：
    //   - 从今天这天的所有等级中删掉该词
    //   - 再把它重新丢回今天的 Level_0_New
    //   - 同时把它从 Word_Lists[*] 里移除（它不再是毕业生）
    //
    // 这个对应你流程里的：
    // “复习旧List时，你答错 -> 把词剥夺毕业资格 -> 打回炉重练”
    // ------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 1. 从今天所有等级把它踢掉
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }

        // 2. 放回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 3. 把它从所有毕业 List 里移除
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
    // 操作函数 2.5: resetWordToLevel0(word)
    //
    // 用途：日常提问里（单词→短语→句子这三轮）你答错了这个词，
    // 但是它还没真正毕业，只是要回炉。
    //
    // 规则：
    //   - 不管它原来在 L1/L2/.../L5_Today 任何级别，全部移除
    //   - 丢回今天的 Level_0_New
    //   - 不动 Word_Lists（因为它未必是毕业生）
    // ------------------------------------------
    function resetWordToLevel0(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 从所有level移除
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }

        // 丢回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        saveData();
    }

    // ------------------------------------------
    // 操作函数 2.9: promoteWord(word)
    //
    // 用途：你答对了，教官要把这个词往“下一等级”推进。
    //
    // 流程：
    //   - 我们定义等级顺序：
    //     [L0, L1, L2, L3, L4, L5_Today]
    //   - 找它当前在哪一级；没有就当它在 L0 之前（相当于新词）
    //   - 从那个级别删掉
    //   - 放进下一级（L4 的下一级是 L5_Today，L5_Today 里就不再往后升）
    //
    // 注意：
    //   这不会自动打包进 Word_Lists；
    //   真正毕业是在 finalizeTodayAndAdvance() 里做的。
    // ------------------------------------------
    function promoteWord(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const order = [
            "Level_0_New",
            "Level_1",
            "Level_2",
            "Level_3",
            "Level_4",
            "Level_5_Mastered_Today",
        ];

        let currentIdx = -1;

        // 找它现在在哪个level，并且移除
        for (let i = 0; i < order.length; i++) {
            const lvName = order[i];
            const arr = bucket[lvName];
            const idxInArr = arr.indexOf(word);
            if (idxInArr !== -1) {
                currentIdx = i;
                arr.splice(idxInArr, 1); // 移除
                break;
            }
        }

        // 如果完全没找到，说明它还没出现过，我们就当它是从“等级前一档”直接升到 L0
        if (currentIdx === -1) {
            currentIdx = 0 - 1; // 设成 -1，下面 +1 就会放进 Level_0_New
        }

        // 目标等级 = 下一档
        let nextIdx = currentIdx + 1;
        if (nextIdx >= order.length) {
            nextIdx = order.length - 1; // 不会超过最后一档（Level_5_Mastered_Today）
        }

        const targetLvName = order[nextIdx];
        const targetArr = bucket[targetLvName];

        if (!targetArr.includes(word)) {
            targetArr.push(word);
        }

        saveData();
    }

    // ------------------------------------------
    // 操作函数 3: 结束今天 / 打包毕业词 / 推进天数
    //
    // 对应“结束今天”阶段：
    //   1) 把今天 Level_5_Mastered_Today 打成 List{Today}
    //   2) 清空 Level_5_Mastered_Today
    //   3) Current_Day +1
    //
    // 明天开始后，ensureTodayBucket() 会新建 Day_(+1) 的六列
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

        // 清空今天的 L5_Mastered_Today
        bucket.Level_5_Mastered_Today = [];

        // 推进到下一天
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // ------------------------------------------
    // 读函数 A: 读取“今天所有等级的词”
    //
    // 返回的是一个深拷贝，结构类似：
    // {
    //   Level_0_New: [...],
    //   Level_1: [...],
    //   ...
    //   Level_5_Mastered_Today: [...]
    // }
    //
    // 给教官用：出题时可以遍历这些词，按单词→短语→句子三轮提问。
    // ------------------------------------------
    function getWordsForTodayLevels() {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];
        return deepClone(bucket);
    }

    // ------------------------------------------
    // 读函数 B: 读取某个毕业 List 里的所有词
    //
    // 用于艾宾浩斯复习：根据 Ebbinghaus_Schedule[Day].Review
    // 逐个List抽查。
    // ------------------------------------------
    function getWordsFromList(listName) {
        const arr = EbbData.Word_Lists[listName];
        if (!arr) return [];
        return [...arr]; // 浅拷贝足够
    }

    // ------------------------------------------
    // 读取今日快照：给仪表盘看的摘要
    // （面板上用的，就是现在打开学士帽看到的那些统计）
    // ------------------------------------------
    function getTodaySnapshot() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        // 从计划表里拿今天的安排（NewList + 要复习的旧List）
        const sched = EbbData.Ebbinghaus_Schedule[String(todayNum)] || {
            NewList: "(未定义)",
            Review: []
        };

        return {
            currentDay: todayNum,
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

    // ------------------------------------------
    // 把API挂到全局，方便教官 / 快速回复调用
    //
    // 常用：
    //   EbbinghausDataAPI.addNewWordsToToday([...])
    //   EbbinghausDataAPI.promoteWord("apple")
    //   EbbinghausDataAPI.resetWordToLevel0("apple")
    //   EbbinghausDataAPI.punishWordFromList("apple")  // 复习阶段错词，踢出毕业List + 打回今天L0
    //   EbbinghausDataAPI.finalizeTodayAndAdvance()
    //   EbbinghausDataAPI.getWordsForTodayLevels()
    //   EbbinghausDataAPI.getWordsFromList("List3")
    // ------------------------------------------
    const punishWordFromList = downgradeWordToToday; // 只是个更直观的别名

    window.EbbinghausDataAPI = {
        // 持久化
        loadData,
        saveData,

        // 今日桶/天数
        ensureTodayBucket,
        finalizeTodayAndAdvance,

        // 学习阶段操作
        addNewWordsToToday,
        promoteWord,
        resetWordToLevel0,

        // 复习阶段严重警报
        downgradeWordToToday, // 原名
        punishWordFromList,   // 别名，更好理解

        // 读取接口
        getTodaySnapshot,
        getWordsForTodayLevels,
        getWordsFromList,

        // 原始数据(只读访问建议)
        get data() {
            return EbbData;
        },
    };

    // ======================================================
    // UI 部分：顶部按钮 + 弹出面板
    // ======================================================

    let overlayEl = null;      // 整个遮罩层
    let overlayCardEl = null;  // 黑色卡片
    let topButtonEl = null;    // 顶栏学位帽按钮
    let uiReady = false;

    // ------------------------------------------
    // 根据当前数据，动态生成面板HTML
    // ------------------------------------------
    function buildOverlayHTML() {
        // 确保数据就绪
        if (!EbbData) {
            loadData();
        }
        const snap = getTodaySnapshot();

        const reviewStr = (snap.schedule.Review && snap.schedule.Review.length > 0)
            ? snap.schedule.Review.join(', ')
            : '（无）';

        // 这是卡片内部结构
        return `
            <div style="
                display:flex;
                justify-content:space-between;
                align-items:center;
                margin-bottom:12px;
            ">
                <div style="
                    font-size:16px;
                    font-weight:bold;
                    display:flex;
                    align-items:center;
                    gap:8px;
                    color:#fff;
                ">
                    <span style="font-size:1.2em;">🎓</span>
                    <span>艾宾浩斯词汇导师</span>
                </div>

                <button id="ebb_close_btn" style="
                    background:rgba(255,255,
