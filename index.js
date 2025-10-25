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
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">今日概况</div>
                <div>📅 当前 Day：<b style="color:#fff;">${snap.currentDay}</b></div>

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

            <!-- 使用说明：配合你的快速回复(QR) -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">使用流程（用你的快速回复来发指令给教官）</div>

                <div style="color:#ccc;margin-bottom:8px;">
                    1. 开始学习：把这一批新词交给教官。教官要把这些词放进
                    <code style="color:#fff;">Vocabulary_Mastery.Day_${snap.currentDay}.Level_0_New</code>
                    ，并按“单词→短语→句子（句子内容必须来自世界书知识点）”三轮提问你。
                </div>

                <div style="color:#ccc;margin-bottom:8px;">
                    2. 复习：教官根据 “今日复习安排” 里的 List 逐个抽查。<br/>
                    你答错的词 = 严重警报。教官必须调用
                    <code style="color:#fff;">downgradeWordToToday(该词)</code>
                    的效果：把这个词从毕业List里移除，并塞回今天的 Level_0_New 重新记。
                </div>

                <div style="color:#ccc;">
                    3. 结束今天：教官把今天
                    <code style="color:#fff;">Level_5_Mastered_Today</code>
                    的单词打包成
                    <code style="color:#fff;">List${snap.currentDay}</code>
                    存进 Word_Lists；然后执行
                    <code style="color:#fff;">finalizeTodayAndAdvance()</code>
                    的效果，把 Current_Day +1，准备明天。
                </div>
            </div>
        `;
    }

    // ------------------------------------------
    // 创建 / 更新 面板DOM
    // ------------------------------------------
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

            // 黑卡片
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

        // 每次打开都重新渲染最新内容
        overlayCardEl.innerHTML = buildOverlayHTML();

        // 绑定关闭按钮
        const closeBtn = overlayCardEl.querySelector('#ebb_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

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

    // ------------------------------------------
    // 把顶部学位帽按钮插入到工具栏
    // 做法：
    //   1. 轮询顶栏，等到 ST 的顶栏按钮出来
    //   2. 在同一父容器里 append 我们的按钮
    // ------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return; // 已存在
        }

        // 找一个已经存在的顶栏按钮，拿它的 parent 当容器
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button'); // 兜底

        if (!probe || !probe.parentNode) {
            return; // 顶栏还没渲染好
        }

        const toolbar = probe.parentNode;

        // 创建我们的按钮
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

        // 学位帽emoji，主题会把它调成和别的顶栏icon类似的浅色
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

        toolbar.appendChild(topButtonEl);

        console.log(`[${EXT_NAME}] Topbar study button inserted.`);
    }

    // ------------------------------------------
// 启动流程：
// 1. 载入本地数据
// 2. 轮询等待 SillyTavern 顶部UI 出现，再插入按钮
// ------------------------------------------
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
            console.log(`[EbbinghausTrainer] UI injection complete.`);
        } else if (tries >= maxTries) {
            clearInterval(intv);
            console.warn(`[EbbinghausTrainer] Failed to locate toolbar for top button.`);
        }
    }, 200);
}

    // DOM加载完就启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
