// ======================================================
//  Ebbinghaus Trainer - 词汇记忆四表系统
//  版本: 0.3.0
//  作者: Dauvier & ChatGPT
//  作用:
//   1. 在顶部栏放一个学位帽按钮（🎓）
//   2. 点击后弹出“学习仪表盘”黑色面板
//   3. 管理四张核心表并持久化到 localStorage：
//      - Vocabulary_Mastery
//      - Word_Lists
//      - Ebbinghaus_Schedule
//      - Study_Control
//
//  0.3.0 更新点：
//   - Study_Control 里加入 Current_Round
//     1 = 第一轮（单词认读）
//     2 = 第二轮（短语填空）
//     3 = 第三轮（句子填空）
//   - 面板 UI 改成 “三大轮周目” 解释，而不是 “一个词立刻走 单词→短语→句子”
//   - 面板显示当前轮次，并告诉 AI 出题形式跟轮次走
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
            // "List1": ["wordA","wordB", ...]
        },
        Ebbinghaus_Schedule: {
            // 你之后可以把完整的艾宾浩斯计划表覆盖掉这里
            "1": { NewList: "List1", Review: [] },
            "2": { NewList: "List2", Review: ["List1"] },
            "3": { NewList: "List3", Review: ["List1", "List2"] },
            "4": { NewList: "List4", Review: ["List2", "List3"] },
            "5": { NewList: "List5", Review: ["List1", "List3", "List4"] },
        },
        Study_Control: {
            Current_Day: 1,
            // 学习第几轮（整本词库的第几遍）
            // 1 = 第一轮：单词认读（裸词 -> 说意思）
            // 2 = 第二轮：短语填空（短语挖空补词）
            // 3 = 第三轮：句子填空（整句挖空补词，句子必须带世界书知识点）
            Current_Round: 1,
        },
    };

    // 内存镜像
    let EbbData = null;

    // ------------------------------------------
    // 工具：深拷贝（旧浏览器兜底）
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

                // 兼容老版本：如果还没有 Current_Round，就补上默认值 1
                if (!EbbData.Study_Control) {
                    EbbData.Study_Control = deepClone(defaultData.Study_Control);
                } else {
                    if (EbbData.Study_Control.Current_Round == null) {
                        EbbData.Study_Control.Current_Round = 1;
                    }
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
    // 操作函数 1: 把一批新词塞进“今天”的 Level_0_New
    // 用于“开始学习今天的新词”
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
    // 操作函数 2: 降级一个词
    // 对应复习时答错了 -> 严重警报
    //   - 从今天所有 Level_* 里删掉它
    //   - 再丢回今天的 Level_0_New
    //   - 从所有毕业 List 里剔除它
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
            "Level_5_Mastered_Today"
        ];

        // 先把它从所有 level 里踢掉
        for (const lv of levels) {
            const idx = bucket[lv].indexOf(word);
            if (idx !== -1) {
                bucket[lv].splice(idx, 1);
            }
        }

        // 放回 Level_0_New
        if (!bucket.Level_0_New.includes(word)) {
            bucket.Level_0_New.push(word);
        }

        // 再把它从所有已经打包过的 List 里移除
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
    // 操作函数 3: 结束今天 / 打包毕业词 / 推进天数
    //
    // “日终结算”做了三件事：
    //   1) 取今天的 Level_5_Mastered_Today 作为毕业词
    //      => 存成 Word_Lists["List{Today}"]
    //   2) 清空今天的 Level_5_Mastered_Today
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

        // 清空今天的 L5 列
        bucket.Level_5_Mastered_Today = [];

        // 下一天
        EbbData.Study_Control.Current_Day = todayNum + 1;

        saveData();
    }

    // ------------------------------------------
    // Round 可读化
    // Current_Round: 1 / 2 / 3
    // ------------------------------------------
    function roundLabel(roundNum) {
        if (roundNum === 1) {
            return "第1轮：单词认读阶段（裸词→中文意思）";
        }
        if (roundNum === 2) {
            return "第2轮：短语填空阶段（短语挖空→补单词）";
        }
        if (roundNum === 3) {
            return "第3轮：句子填空阶段（整句挖空→补单词，句子必须带世界书知识点）";
        }
        return `第${roundNum}轮`;
    }

    // ------------------------------------------
    // 读取“今天”的摘要信息（用于面板展示）
    // ------------------------------------------
    function getTodaySnapshot() {
        const todayNum = EbbData.Study_Control.Current_Day;
        const dayKey = ensureTodayBucket();
        const bucket = EbbData.Vocabulary_Mastery[dayKey];

        // 今天的艾宾浩斯安排（要新学哪个 List，要复习哪些旧 List）
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
    // 把API挂到全局，方便手动调试/以后快捷回复调用
    // 你可以在控制台输入 EbbinghausDataAPI 查看
    // ------------------------------------------
    window.EbbinghausDataAPI = {
        loadData,
        saveData,
        addNewWordsToToday,
        downgradeWordToToday,
        finalizeTodayAndAdvance,
        getTodaySnapshot,
        ensureTodayBucket,
        get data() {
            return EbbData;
        },
    };

    // ======================================================
    // UI 部分
    // 1. 顶栏学位帽按钮
    // 2. 点击后弹出黑色面板
    // ======================================================

    let overlayEl = null;      // 整个遮罩层
    let overlayCardEl = null;  // 黑色内容卡片
    let topButtonEl = null;    // 顶栏学位帽图标
    let uiReady = false;

    // ------------------------------------------
    // 动态生成面板 HTML
    // （会根据当前 Day、当前 Round、计划表、桶内词数来更新）
    // ------------------------------------------
    function buildOverlayHTML() {
        if (!EbbData) {
            loadData();
        }

        const snap = getTodaySnapshot();
        const reviewStr = (snap.schedule.Review && snap.schedule.Review.length > 0)
            ? snap.schedule.Review.join(', ')
            : '（无）';

        const roundNum = EbbData.Study_Control.Current_Round || 1;
        const roundText = roundLabel(roundNum);

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
                <div>🔁 当前学习轮次：<b style="color:#fff;">${roundText}</b></div>

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

                <div style="font-size:12px;color:#86a9c6;margin-top:8px;">
                    复习这些 List 里的词时，出题方式要跟【当前学习轮次】一致：
                    <br/>- 轮次1：直接给英文单词，让我说中文意思
                    <br/>- 轮次2：给短语/搭配，挖掉这个词，让我填回去
                    <br/>- 轮次3：给完整句子（句子必须包含世界书里的学科知识点），挖空这个词让我填
                </div>
            </div>

            <!-- 学习模式（解释三大轮，而不是同一天“单词→短语→句子”） -->
            <div style="
                background:rgba(255,255,255,0.03);
                border:1px solid rgba(255,255,255,0.2);
                border-radius:10px;
                padding:10px 12px;
                font-size:13px;
                line-height:1.5;
                color:#ddd;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">
                    学习模式（整本词库是分三大轮来背的）
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    <b>第1轮：单词认读阶段</b><br/>
                    - 教官只给英文单词（中文提示里可以引用世界书知识点）。<br/>
                    - 我需要说出它的意思。<br/>
                    - 这些词会出现在
                      <code style="color:#fff;">Vocabulary_Mastery.Day_${snap.currentDay}</code>
                      里，从 Level_0_New 慢慢升到 Level_5_Mastered_Today。<br/>
                    - 当单词到 Level_5_Mastered_Today，就算“今天的毕业词”。
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    <b>日终结算（结束今天）</b><br/>
                    - 把今天
                      <code style="color:#fff;">Level_5_Mastered_Today</code>
                      的词打包成
                      <code style="color:#fff;">List${snap.currentDay}</code>
                      ，写入 Word_Lists。<br/>
                    - 然后执行
                      <code style="color:#fff;">finalizeTodayAndAdvance()</code>
                      ：这些词进入艾宾浩斯复习系统，并把 Current_Day +1。
                </div>

                <div style="color:#ccc;margin-bottom:10px;">
                    <b>第2轮：短语填空阶段</b><br/>
                    - 等我告诉你“开始第二轮”的时候，
                      Study_Control.Current_Round 变成 2。<br/>
                    - 不再直接问“这个英文单词是什么意思？”，而是拿短语/搭配挖空，让我把那个词填回来。<br/>
                    - 语境提示依旧必须来自世界书里的知识点。
                </div>

                <div style="color:#ccc;">
                    <b>第3轮：句子填空阶段</b><br/>
                    - 当我说“开始第三轮”，Current_Round 变成 3。<br/>
                    - 出题格式：完整句子（句子内容必须讲世界书里的知识点，比如学科/背景设定），把目标词挖空让我填。<br/>
                    - 目标是我能从阅读场景里立即反应出词义/用法，做到阅读+写作级别掌握。
                </div>

                <div style="color:#888;font-size:12px;margin-top:12px;">
                    降级错误词：
                    <code style="color:#fff;">downgradeWordToToday(那个词)</code>
                    会把这个词从所有毕业 List 里移除，并且丢回今天的
                    Level_0_New 重新开始背。
                </div>
            </div>
        `;
    }

    // ------------------------------------------
    // 创建 / 显示 / 隐藏 面板DOM
    // ------------------------------------------
    function showOverlay() {
        if (!overlayEl) {
            // 遮罩
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

            // 黑色主卡片
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

        // 每次打开都重渲染，保证Day/轮次/数量是最新的
        overlayCardEl.innerHTML = buildOverlayHTML();

        // 绑定“关闭”按钮
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
    //
    // 我们会轮询，直到能拿到 ST 顶栏里的任意一个按钮（例如 #extensions-settings-button）
    // 然后在同一父节点里 append 我们的按钮
    // ------------------------------------------
    function insertTopButtonIfMissing() {
        if (topButtonEl && document.body.contains(topButtonEl)) {
            return; // 已经在DOM里
        }

        // 猜测顶栏里必定存在的一个按钮
        const probe =
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.querySelector('.extensions-settings-button') ||
            document.querySelector('.menu_button');

        if (!probe || !probe.parentNode) {
            return; // 顶栏还没渲染好
        }

        const toolbar = probe.parentNode;

        // 创建我们自己的按钮
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

        // 学位帽图标（保持 emoji，这样主题会统一浅色调）
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
    // 启动流程
    // ------------------------------------------
    function init() {
        if (uiReady) return;
        uiReady = true;

        loadData(); // 确保 EbbData 初始化并有 Current_Round

        // 轮询插入顶部按钮（SillyTavern 的 UI 可能滞后渲染）
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

    // DOM 就绪后启动
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

})();
```0
