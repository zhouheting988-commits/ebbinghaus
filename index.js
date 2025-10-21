// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
// 这是一个基于 "记忆增强" 插件改造的、为艾宾浩斯学习法设计的专用插件。
// 核心思想：保留其强大的表格操作引擎，但将功能聚焦于我们预设的四张学习表格上。

import { APP, BASE, EDITOR, SYSTEM, USER } from './core/manager.js';
// 保留了大部分核心导入，因为底层功能依然需要它们
import { loadSettings } from "./scripts/settings/userExtensionSetting.js";
import { SheetBase } from "./core/table/base.js";
import { Cell } from "./core/table/cell.js";

console.log("______________________艾宾浩斯学习插件：开始加载______________________")

const VERSION = '1.0.0-Ebbinghaus'

// --- 核心：定义我们的四张表格的名称 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';

/**
 * 插件初始化时，检查并创建我们需要的四张核心表格。
 * 这是这个插件作为“独立插件”的核心功能。
 */
async function initializeEbbinghausTables() {
    console.log("[Ebbinghaus] 正在检查核心表格是否存在...");

    // 使用 BASE.isSheetExist 来检查表格是否已存在于模板中
    const controlExists = BASE.isSheetExist(TBL_CONTROL, SheetBase.SheetDomain.template, SheetBase.SheetType.dynamic);
    const scheduleExists = BASE.isSheetExist(TBL_SCHEDULE, SheetBase.SheetDomain.template, SheetBase.SheetType.dynamic);
    const wordListsExists = BASE.isSheetExist(TBL_WORD_LISTS, SheetBase.SheetDomain.template, SheetBase.SheetType.dynamic);
    const masteryExists = BASE.isSheetExist(TBL_MASTERY, SheetBase.SheetDomain.template, SheetBase.SheetType.dynamic);

    if (controlExists && scheduleExists && wordListsExists && masteryExists) {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
        return;
    }

    console.log("[Ebbinghaus] 检测到缺少核心表格，正在执行首次创建...");

    // 表格1: Study_Control
    if (!controlExists) {
        const sheet = BASE.createTemplateSheet(2, 2, TBL_CONTROL);
        sheet.setCell(0, 0, 'Setting');
        sheet.setCell(0, 1, 'Value');
        sheet.setCell(1, 0, 'Current_Day');
        sheet.setCell(1, 1, '1'); // 默认从第一天开始
        sheet.setCell(2, 0, 'Current_Round'); // 兼容之前的设计
        sheet.setCell(2, 1, '1');
        sheet.save();
    }

    // 表格2: Ebbinghaus_Schedule
    if (!scheduleExists) {
        const sheet = BASE.createTemplateSheet(7, 2, TBL_SCHEDULE); // 创建一个有足够列的空表
        sheet.setCell(0, 0, 'Day');
        sheet.setCell(0, 1, 'NewList');
        sheet.setCell(0, 2, 'Review1');
        sheet.setCell(0, 3, 'Review2');
        sheet.setCell(0, 4, 'Review3');
        sheet.setCell(0, 5, 'Review4');
        sheet.setCell(0, 6, 'Review5');
        sheet.setCell(1, 0, '1'); // 示例数据
        sheet.setCell(1, 1, 'List1');
        sheet.save();
        EDITOR.info("艾宾浩斯插件：[Ebbinghaus_Schedule] 表已创建，请根据你的计划手动填充它。");
    }

    // 表格3: Word_Lists
    if (!wordListsExists) {
        const sheet = BASE.createTemplateSheet(2, 2, TBL_WORD_LISTS);
        sheet.setCell(0, 0, 'ListName');
        sheet.setCell(0, 1, 'Words');
        sheet.setCell(1, 0, 'List1'); // 示例数据
        sheet.setCell(1, 1, 'example,word');
        sheet.save();
    }

    // 表格4: Vocabulary_Mastery
    if (!masteryExists) {
        const sheet = BASE.createTemplateSheet(7, 2, TBL_MASTERY);
        sheet.setCell(0, 0, 'Day');
        sheet.setCell(0, 1, 'Level_0_New');
        sheet.setCell(0, 2, 'Level_1');
        sheet.setCell(0, 3, 'Level_2');
        sheet.setCell(0, 4, 'Level_3');
        sheet.setCell(0, 5, 'Level_4');
        sheet.setCell(0, 6, 'Level_5_Mastered_Today');
        sheet.setCell(1, 0, 'Day 1'); // 示例数据
        sheet.save();
    }
    
    console.log("[Ebbinghaus] 核心表格创建完成。");
    // 创建后需要刷新一下UI才能看到
    updateSheetsView();
}


/**
 * 核心逻辑：执行每日学习结束时的存档操作
 * 这是我们为这个插件定制的核心功能。
 */
async function processEndOfDay() {
    try {
        EDITOR.info("[Ebbinghaus] 开始执行每日结算...");

        const controlSheet = BASE.getTemplateSheet(TBL_CONTROL);
        const masterySheet = BASE.getTemplateSheet(TBL_MASTERY);
        const wordListsSheet = BASE.getTemplateSheet(TBL_WORD_LISTS);
        const scheduleSheet = BASE.getTemplateSheet(TBL_SCHEDULE);

        if (!controlSheet || !masterySheet || !wordListsSheet || !scheduleSheet) {
            EDITOR.error("[Ebbinghaus] 错误：缺少核心表格，无法执行每日结算。");
            return;
        }

        // 1. 获取当前是第几天
        const currentDayCell = controlSheet.findCellByValue('Current_Day', 0);
        if (!currentDayCell) {
            EDITOR.error("[Ebbinghaus] 错误：在Study_Control表中未找到'Current_Day'。");
            return;
        }
        const currentDay = parseInt(controlSheet.getCell(currentDayCell.row, 1).data.value);
        
        // 2. 找到今天的NewList名称
        const dayScheduleRow = scheduleSheet.findCellByValue(String(currentDay), 0);
        if (!dayScheduleRow) {
             EDITOR.warning(`[Ebbinghaus] 在计划表中未找到第 ${currentDay} 天的计划，无法存档新词表。`);
             return;
        }
        const newListName = scheduleSheet.getCell(dayScheduleRow.row, 1).data.value;

        // 3. 从 Vocabulary_Mastery 表中收集今天掌握的单词
        const masteredWords = [];
        // 遍历每一行，收集 Level_5 列的单词
        for (let i = 1; i < masterySheet.getRowCount(); i++) {
            const cell = masterySheet.getCell(i, 6); // 第6列是 Level_5_Mastered_Today
            if (cell && cell.data.value.trim() !== '') {
                masteredWords.push(...cell.data.value.split(',').map(w => w.trim()));
                // 4. 清空该单元格
                cell.newAction(Cell.CellAction.editCell, { value: '' });
            }
        }

        if (masteredWords.length > 0) {
            // 5. 将收集到的单词存入 Word_Lists 表
            let listRowCell = wordListsSheet.findCellByValue(newListName, 0);
            if (!listRowCell) {
                // 如果列表不存在，则创建新的一行
                const lastRow = wordListsSheet.getRowCount();
                wordListsSheet.getCell(lastRow - 1, 0).newAction(Cell.CellAction.insertDownRow, {});
                listRowCell = wordListsSheet.getCell(lastRow, 0);
                listRowCell.newAction(Cell.CellAction.editCell, { value: newListName });
            }
            const wordsCell = wordListsSheet.getCell(listRowCell.row, 1);
            wordsCell.newAction(Cell.CellAction.editCell, { value: masteredWords.join(',') });
            EDITOR.success(`[Ebbinghaus] ${masteredWords.length}个单词已存档至'${newListName}'。`);
        } else {
            EDITOR.info("[Ebbinghaus] 今天没有新掌握的单词需要存档。");
        }

        // 6. 更新 Current_Day
        const nextDay = currentDay + 1;
        const dayValueCell = controlSheet.getCell(currentDayCell.row, 1);
        dayValueCell.newAction(Cell.CellAction.editCell, { value: String(nextDay) });

        EDITOR.success(`[Ebbinghaus] 每日结算完成！已进入第 ${nextDay} 天。`);

    } catch (error) {
        EDITOR.error("[Ebbinghaus] 每日结算过程中发生严重错误:", error.message, error);
    }
}


// --- 保留并适配原插件的核心功能 ---

/**
 * 通过表格索引查找表格结构
 * @param {number} index 表格索引
 * @returns 此索引的表格结构
 */
export function findTableStructureByIndex(index) {
    // 这个函数在新版Sheet系统中可能不那么重要了，但保留以防万一
    return USER.tableBaseSetting.tableStructure[index];
}


/**
 * 获取表格相关提示词 (为我们的系统做了简化和定制)
 * @returns {string} 表格相关提示词
 */
export function getTablePrompt(eventData, isPureData = false) {
    const lastSheetsPiece = BASE.getReferencePiece()
    if(!lastSheetsPiece) return ''
    
    // 我们只关心我们的四张表
    const requiredTables = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];
    
    const sheets = BASE.hashSheetsToSheets(lastSheetsPiece.hash_sheets)
        .filter(sheet => sheet.enable && requiredTables.includes(sheet.name)); // 只发送我们需要的表格
        
    console.log("[Ebbinghaus] 构建提示词时的表格信息 (已过滤):", sheets)
    
    const customParts = ['title', 'headers', 'rows']; // 只发送纯数据，AI不需要知道规则
    const sheetDataPrompt = sheets.map((sheet, index) => sheet.getTableText(index, customParts, lastSheetsPiece)).join('\n')
    return sheetDataPrompt
}

/**
 * 处理文本内的表格编辑事件
 * @description 这是AI修改表格的核心入口，我们几乎完整保留它。
 * 我们的角色卡会生成 <tableEdit> 标签，这个函数会解析并执行它。
 */
export function handleEditStrInMessage(chat, mesIndex = -1, ignoreCheck = false) {
    // parseTableEditTag 是原插件的核心，我们直接复用
    parseTableEditTag(chat, mesIndex, ignoreCheck) 
}

/**
 * 解析并执行表格编辑标签
 * @description 保留原插件的核心功能
 */
export function parseTableEditTag(piece, mesIndex = -1, ignoreCheck = false) {
    const { getTableEditTag } = window.stMemoryEnhancement; // 假设它会被注册到全局
    if (!getTableEditTag) return; 

    const { matches } = getTableEditTag(piece.mes);
    
    // ... 此处省略了原插件中大量复杂的解析和执行代码 ...
    // ... 假设原插件的 executeTableEditActions 能够被调用且正常工作 ...
    // 在实际集成中，这部分代码需要从原插件完整复制过来。
    // 为了这个示例的简洁性，我们假设有一个函数可以执行这些操作。
    if (window.stMemoryEnhancement.executeTableEditActions) {
         window.stMemoryEnhancement.executeTableEditActions(matches, piece);
    } else {
        console.warn("[Ebbinghaus] executeTableEditActions 函数未找到，表格编辑功能可能无法工作。");
    }
    
    console.log("[Ebbinghaus] 已处理表格编辑指令。");
    return true
}


/**
 * 注入表格总体提示词
 * @description 当AI思考时，我们把表格数据喂给它
 */
async function onChatCompletionPromptReady(eventData) {
    if (eventData.dryRun === true || USER.tableBaseSetting.isExtensionAble === false || USER.tableBaseSetting.isAiReadTable === false || USER.tableBaseSetting.injection_mode === "injection_off") {
        return;
    }

    try {
        const tableData = getTablePrompt(eventData, true);
        if (tableData) {
            // 定制化的提示词，引导AI扮演我们的学习助手
            const finalPrompt = `
[Ebbinghaus System Prompt]
你正在使用艾宾浩斯学习系统。以下是当前的学习数据，请严格依据这些数据与用户进行互动。
你的任务是：
1. 根据'Vocabulary_Mastery'表中的Level 0-4单词，结合用户专业课内容出题。
2. 根据'Ebbinghaus_Schedule'和'Word_Lists'，对旧单词列表进行复习抽查。
3. 根据用户的回答，生成<tableEdit>指令来更新'Vocabulary_Mastery'表中的单词位置（例如，从Level_1移动到Level_2）。
4. 如果复习抽查时发现用户忘记了某个单词，生成指令将其从'Word_Lists'中移除，并重新加入到'Vocabulary_Mastery'的Level_0中。

当前数据如下：
${tableData}`;

            // 注入方式保持不变
            const role = USER.tableBaseSetting.injection_mode === 'deep_system' ? 'system' : 'user';
            const deep = USER.tableBaseSetting.deep || 0;
            if (deep === 0)
                eventData.chat.push({ role, content: finalPrompt })
            else
                eventData.chat.splice(-deep, 0, { role, content: finalPrompt })
            
            console.log("[Ebbinghaus] 已注入学习系统提示词及数据。");
        }
    } catch (error) {
        EDITOR.error(`[Ebbinghaus] 表格数据注入失败:`, error.message, error);
    }
}


/**
 * 消息接收时触发
 * @description 我们在这里增加一个对我们自定义指令的监听
 */
async function onMessageReceived(chat_id) {
    const chat = USER.getContext().chat[chat_id];
    
    // --- 新增：监听我们的自定义指令 ---
    if (chat.is_user && chat.mes.trim() === '结束今天') {
        processEndOfDay();
        // 阻止这条消息发送给AI
        USER.getContext().chat.pop(); 
        USER.saveChat();
        return; 
    }

    // --- 保留：处理AI返回的表格编辑指令 ---
    if (USER.tableBaseSetting.isExtensionAble === false || USER.tableBaseSetting.isAiWriteTable === false) return
    if(chat.is_user === false){
        try {
            handleEditStrInMessage(chat)
        } catch (error) {
            EDITOR.error("[Ebbinghaus] 表格自动更改失败:", error.message, error)
        }
    }

    updateSheetsView()
}


/**
 * 更新表格视图
 * @description 必须保留，用于在界面上显示表格的变化
 */
export async function updateSheetsView(mesId) {
    try{
        console.log("[Ebbinghaus] 更新表格视图。");
        BASE.refreshContextView(mesId)
        if (window.updateSystemMessageTableStatus) { // 检查函数是否存在
            window.updateSystemMessageTableStatus(); 
        }
    }catch (error) {
        EDITOR.error("[Ebbinghaus] 更新表格视图失败:", error.message, error)
    }
}


// --- 插件主入口 ---
jQuery(async () => {
    // 等待核心系统加载完成
    await new Promise(resolve => {
        const interval = setInterval(() => {
            if (APP.ready && BASE.ready && USER.ready) {
                clearInterval(interval);
                resolve();
            }
        }, 100);
    });
    
    // 注册API (这部分是从原插件复制的，以确保我们的函数能被其他部分调用)
    // 这是个好习惯，即使我们现在不打算被外部调用
    window.stMemoryEnhancement = {
        ...(window.stMemoryEnhancement || {}), // 保留可能已存在的其他部分
        // 从原插件复制过来的核心函数，确保系统能自洽运行
        parseTableEditTag: (p, m, i) => parseTableEditTag(p, m, i),
        executeTableEditActions: (m, p) => executeTableEditActions(m, p), // 需要从原插件复制实现
        getTableEditTag: (mes) => getTableEditTag(mes), // 需要从原插件复制实现
    };

    // 应用程序启动时加载设置
    loadSettings();

    // 我们的核心初始化函数
    await initializeEbbinghausTables();

    // 监听主程序事件
    APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    // 其他事件监听可以根据需要保留或移除
    // APP.eventSource.on(APP.event_types.CHAT_CHANGED, onChatChanged);
    // APP.eventSource.on(APP.event_types.MESSAGE_EDITED, onMessageEdited);
    
    console.log("______________________艾宾浩斯学习插件：加载完成______________________")
});

// 关键提示：
// 这个文件只是插件的一部分。你还需要从原插件中复制一些文件，特别是：
// 1. `plugin.json` - 插件的清单文件，必须有。
// 2. 包含 `executeTableEditActions` 和 `getTableEditTag` 等核心工具函数的文件。
//    通常它们位于 `scripts/` 或 `utils/` 目录下。你需要找到它们并一起打包。
// 3. `core/` 目录下的文件，因为 `index.js` 依赖它们。
//
// 简单来说，最好的方法是：
// 1. 完整复制一份原插件。
// 2. 用上面这个 `index.js` 替换掉原插件的 `index.js`。
// 3. 这样可以确保所有依赖都存在，插件能够成功加载。
