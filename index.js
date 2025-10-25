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

    // -----------------------------
    // 默认数据骨架
    // -----------------------------
    const defaultData = {
        Vocabulary_Mastery: {
            // "Day_1": { Level_0_New:[], Level_1:[], ..., Level_5_Mastered_Today:[] }
        },
        Word_Lists: {
            // "List1": ["create","desire","help", ...]
        },
        Ebbinghaus_Schedule: {
            "1": { NewList: "List1", Review: [] },
            "2": { NewList: "List2", Review: ["List1"] },
            "3": { NewList: "List3", Review: ["List1","List2"] },
            "4": { NewList: "List4", Review: ["List2","List3"] },
            "5": { NewList: "List5", Review: ["List1","List3","List4"] },
        },
        Study_Control: {
            Current_Day: 1,
            Current_Round: 1, // 1=单词, 2=短语, 3=句子
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
        const vm = EbbData.Vocabulary_Mastery || {};
        const dayKeys = Object.keys(vm)
            .sort((a,b) => {
                const na = parseInt(a.replace('Day_',''),10);
                const nb = parseInt(b.replace('Day_',''),10);
                return na-nb;
            });

        // 如果还没有一天，就至少保证今天存在
        if (dayKeys.length === 0) {
            const todayKey = ensureTodayBucket();
            dayKeys.push(todayKey);
        }

        // 生成行
        const trs = dayKeys.map(dayKey => {
            const dayNum = dayKey.replace('Day_','');
            const bucket = vm[dayKey] || {};

            const L0 = (bucket.Level_0_New || []).join(', ') || '…';
            const L1 = (bucket.Level_1 || []).join(', ') || '…';
            const L2 = (bucket.Level_2 || []).join(', ') || '…';
            const L3 = (bucket.Level_3 || []).join(', ') || '…';
            const L4 = (bucket.Level_4 || []).join(', ') || '…';
            const L5 = (bucket.Level_5_Mastered_Today || []).join(', ') || '…';

            return `
                <tr>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;white-space:nowrap;vertical-align:top;">
                        Day ${dayNum}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L0}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L1}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L2}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L3}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L4}
                    </td>
                    <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;min-width:120px;word-break:break-word;">
                        ${L5}
                    </td>
                </tr>
            `;
        }).join('');

        return `
            <div style="font-size:13px;color:#ccc;line-height:1.4;margin-bottom:8px;">
                （按天查看）每一列是不同掌握等级。<br/>
                Level_0_New = 今天的新词/本轮答错词重新打回。
            </div>

            <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.15); border-radius:8px;">
                <table style="border-collapse:collapse; font-size:13px; min-width:700px;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.08);color:#fff;">
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Day</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">
                                Level_0_New<br/><span style="font-weight:400;color:#bbb;">(新词/答错)</span>
                            </th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Level_1</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Level_2</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Level_3</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Level_4</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Level_5</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${trs}
                    </tbody>
                </table>
            </div>
        `;
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
        const keys = Object.keys(lists);

        const trs = (keys.length === 0)
            ? `<tr><td colspan="2" style="padding:8px;color:#999;text-align:center;">暂无 List（还没有毕业词）</td></tr>`
            : keys.map(listName => {
                const arr = lists[listName] || [];
                const wordsStr = arr.length ? arr.join(', ') : '…';
                return `
                    <tr>
                        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;white-space:nowrap;vertical-align:top;">
                            ${listName}
                        </td>
                        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;word-break:break-word;min-width:200px;">
                            ${wordsStr}
                        </td>
                    </tr>
                `;
            }).join('');

        return `
            <div style="font-size:13px;color:#ccc;line-height:1.4;margin-bottom:8px;">
                每天结束后，“已彻底掌握的词”会打包成一个 ListN。
            </div>

            <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.15); border-radius:8px;">
                <table style="border-collapse:collapse; font-size:13px; min-width:400px;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.08);color:#fff;">
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">ListName</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Words</th>
                        </tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
        `;
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
        const sched = EbbData.Ebbinghaus_Schedule || {};
        const days = Object.keys(sched)
            .sort((a,b)=>Number(a)-Number(b));

        // 找出最大复习列数
        let maxReviewLen = 0;
        for (const d of days) {
            const revArr = Array.isArray(sched[d].Review) ? sched[d].Review : [];
            if (revArr.length > maxReviewLen) {
                maxReviewLen = revArr.length;
            }
        }

        // 生成表头里的 Review 列
        const reviewHeadHTML = [];
        for (let i=0; i<maxReviewLen; i++) {
            reviewHeadHTML.push(`
                <th style="text-align:left;padding:6px 8px;white-space:nowrap;">
                    Review${i+1}
                </th>
            `);
        }

        // 生成每一行
        const trs = (days.length === 0)
            ? `<tr><td colspan="${2+maxReviewLen}" style="padding:8px;color:#999;text-align:center;">暂无复习计划</td></tr>`
            : days.map(dayNum => {
                const info = sched[dayNum];
                const newList = info.NewList || '(未定义)';
                const revArr = Array.isArray(info.Review) ? info.Review : [];

                // 把每个Review填到列里
                const reviewCols = [];
                for (let i=0; i<maxReviewLen; i++) {
                    const val = revArr[i] || '…';
                    reviewCols.push(`
                        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;word-break:break-word;min-width:100px;">
                            ${val}
                        </td>
                    `);
                }

                return `
                    <tr>
                        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#fff;white-space:nowrap;vertical-align:top;">
                            ${dayNum}
                        </td>
                        <td style="padding:6px 8px;border-bottom:1px solid rgba(255,255,255,0.08);color:#ccc;vertical-align:top;word-break:break-word;min-width:100px;">
                            ${newList}
                        </td>
                        ${reviewCols.join('')}
                    </tr>
                `;
            }).join('');

        return `
            <div style="font-size:13px;color:#ccc;line-height:1.4;margin-bottom:8px;">
                每天要学的新词(NewList)＋要复习的旧词组(Review列)。
            </div>

            <div style="overflow-x:auto; border:1px solid rgba(255,255,255,0.15); border-radius:8px;">
                <table style="border-collapse:collapse; font-size:13px; min-width:${200 + maxReviewLen*110}px;">
                    <thead>
                        <tr style="background:rgba(255,255,255,0.08);color:#fff;">
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">Day</th>
                            <th style="text-align:left;padding:6px 8px;white-space:nowrap;">NewList</th>
                            ${reviewHeadHTML.join('')}
                        </tr>
                    </thead>
                    <tbody>${trs}</tbody>
                </table>
            </div>
        `;
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
           
