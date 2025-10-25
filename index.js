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
//   4. 暴露一组API给“教官角色卡 / 你的QR快捷回复”调用
//      - addNewWordsToToday([...])
//      - promoteWord(word)
//      - resetWordToLevel0(word)
//      - punishWordFromList(word)   (= downgradeWordToToday)
//      - finalizeTodayAndAdvance()
//      - getWordsForTodayLevels()
//      - getWordsFromList(listName)
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
            // 你之后可以用自己的艾宾浩斯计划表来完全覆盖
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

    // 内存镜像
    let EbbData = null;

    // ------------------------------------------
    // 工具：深拷贝（兼容旧浏览器/旧WebView）
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
    // 用于“开始学习”阶段，把你这批新词导入今天
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
    // 操作函数 2: 复习错词的"严重警报"处理
    // 逻辑：
    //   - 从今天所有等级中删掉它
    //   - 把它丢回今天的 Level_0_New
    //   - 从所有 Word_Lists (毕业清单) 里把它踢掉
    //
    // 这个动作发生在"艾宾浩斯复习阶段"里，
    // 也就是你在复习旧List的时候答错了。
    // ------------------------------------------
    function downgradeWordToToday(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 1) 从今天所有level清理这个词
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx,1);
            }
        }

        // 2) 丢回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 3) 从毕业List里移除
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
    // 🔼 操作函数 3: promoteWord(word)
    //
    // 日常学习阶段，“我回答对了”：
    //   - 让这个词在今天的等级往右升一级
    //     Level_0_New -> Level_1 -> Level_2 -> Level_3 -> Level_4 -> Level_5_Mastered_Today
    //
    // 细节：
    //   1. 找出它当前在哪个level（如果完全没出现过，当成 Level_0_New 起点）
    //   2. 从旧level删掉它
    //   3. 放进下一个level（最多到 Level_5_Mastered_Today）
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

        // 先确认它是否在任意 level；如果不在就从Level_0_New起步
        let currentIdx = -1;
        for (let i = 0; i < order.length; i++) {
            const lvName = order[i];
            const arr = bucket[lvName];
            const pos = arr.indexOf(word);
            if (pos !== -1) {
                currentIdx = i;
                // 从当前级别移除
                arr.splice(pos, 1);
                break;
            }
        }
        if (currentIdx === -1) {
            // 这个词还没出现过，视为刚加入L0
            currentIdx = 0;
        }

        // 下一个级别
        let nextIdx = currentIdx + 1;
        if (nextIdx >= order.length) {
            nextIdx = order.length - 1; // 不会超过最后一级
        }

        const targetLevel = order[nextIdx];
        if (!bucket[targetLevel].includes(word)) {
            bucket[targetLevel].push(word);
        }

        saveData();
    }

    // ------------------------------------------
    // 🔁 操作函数 4: resetWordToLevel0(word)
    //
    // 日常学习阶段，“我回答错了”：
    //   - 不管它现在在L1~L5哪一级，统统踢掉
    //   - 丢回今天的 Level_0_New 重新记
    //
    // 注意：这个和 downgradeWordToToday 的区别是：
    //   resetWordToLevel0() 不会去管 Word_Lists，
    //   因为日常学习时它还没正式毕业，不一定在任何 List 里。
    // ------------------------------------------
    function resetWordToLevel0(word) {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];
        const levels = [
            "Level_0_New","Level_1","Level_2","Level_3","Level_4","Level_5_Mastered_Today"
        ];

        // 清理它当前所在的等级
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx, 1);
            }
        }

        // 打回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        saveData();
    }

    // ------------------------------------------
    // 📚 操作函数 5: getWordsForTodayLevels()
    //
    // 目的：给“教官角色”读取今天所有等级里的词，好出题。
    // 返回结构是今天的 { Level_0_New: [...], Level_1: [...], ... }
    // 用 deepClone 防止外面直接改原数组。
    // ------------------------------------------
    function getWordsForTodayLevels() {
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];
        return deepClone(bucket);
    }

    // ------------------------------------------
    // 📦 操作函数 6: getWordsFromList(listName)
    //
    // 目的：在“艾宾浩斯复习”阶段，教官需要拿到某个历史List的全部毕业词，
    // 例如 getWordsFromList("List2") -> ["wordA","wordB",...]
    // ------------------------------------------
    function getWordsFromList(listName) {
        const arr = EbbData.Word_Lists[listName];
        if (!arr) return [];
        return [...arr];
    }

    // ------------------------------------------
    // 操作函数 7: 结束今天 / 打包毕业词 / 推进天数
    //
    // “结束今天”的流程：
    //   1) 把今天 Level_5_Mastered_Today 打包成 List{Today}
    //   2) 清空 Level_5_Mastered_Today
    //   3) Current_Day +1
    //
    // 举例：
    //   今天 Day=3，有 ["policy","merge"] 在 Level_5_Mastered_Today
    //   -> 生成 Word_Lists["List3"] = ["policy","merge"]
    //   -> 清空今天的 Level_5_Mastered_Today
    //   -> Current_Day 变成 4
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
    // 读取今日快照：给仪表盘看的摘要
    // ------------------------------------------
    function getTodaySnapshot() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        // 从计划表拿今天安排
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
    // 把API挂到全局，方便教官/快捷回复调用
    //
    // 之后你可以在角色卡提示里写：
    //
    // - 新词入库：
    //   EbbinghausDataAPI.addNewWordsToToday(["apple","banana"])
    //
    // - 我答对了：
    //   EbbinghausDataAPI.promoteWord("apple")
    //
    // - 我在学习阶段答错了：
    //   EbbinghausDataAPI.resetWordToLevel0("apple")
    //
    // - 我在复习旧List时答错了：
    //   EbbinghausDataAPI.punishWordFromList("apple")
    //
    // - 今天结束了：
    //   EbbinghausDataAPI.finalizeTodayAndAdvance()
    //
    // - 教官出题用本日词表：
    //   EbbinghausDataAPI.getWordsForTodayLevels()
    //
    // - 教官复习某个List：
    //   EbbinghausDataAPI.getWordsFromList("List2")
    // ------------------------------------------
    const punishWordFromList = downgradeWordToToday;

    window.EbbinghausDataAPI = {
        // 数据存取
        loadData,
        saveData,

        // 学习阶段
        addNewWordsToToday,
        promoteWord,
        resetWordToLevel0,

        // 复习阶段（艾宾浩斯）
        downgradeWordToToday, // 原函数名
        punishWordFromList,   // 别名，给角色卡用更直观的名字
        getWordsFromList,
        getWordsForTodayLevels,

        // 日结
        finalizeTodayAndAdvance,

        // 信息读取
        getTodaySnapshot,
        ensureTodayBucket,

        // 原始数据镜像（只读用）
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
                    <code style="color:#fff;">punishWordFromList(该词)</code>
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
    // 我们用轮询找“顶栏按钮容器”
    //
    // 步骤：
    //   1. 找任一已经存在的顶栏图标（sys-settings-button等）
    //   2. 在同一父容器里 append 我们的按钮
    // ------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return; // 已经存在了
        }

        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button'); // 兜底

        if (!probe || !probe.parentNode) {
            return; // 还没渲染到顶部栏
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

        // 学位帽emoji作为图标
        topButtonEl.innerHTML = `
            <span style="
                font-size:18px;
                line-height:18px;
                filter: brightness(1.2);
            ">🎓</span>
        `;

        // 点击 -> 打开/关闭面板
        topButtonEl.addEventListener('click', (ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOverlay();
        }, true);

        toolbar.appendChild(topButtonEl);

        console.log(`[${EXT_NAME}] Topbar study button inserted.`);
    }

    // ------------------------------------------
    // 初始化：
    // 1. 载入本地数据
    // 2. 轮询UI，插入顶部按钮
    // ------------------------------------------
    function init() {
        if (uiReady) return;
        uiReady = true;

        loadData(); // 确保 EbbData 初始化

        // 轮询等待顶部栏生成
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

    // DOM加载完就启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
```0
