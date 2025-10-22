        const masterySheet = BASE.getTemplateSheet(TBL_MASTERY);
        const wordListsSheet = BASE.getTemplateSheet(TBL_WORD_LISTS);
        const scheduleSheet = BASE.getTemplateSheet(TBL_SCHEDULE);

// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
// 这是为艾宾浩斯学习法设计的专用插件主文件。

import { APP, BASE, EDITOR, USER } from './core/manager.js';
// 假设你已经把原插件的UI设置逻辑提取到了这个文件
import { loadSettings } from "./scripts/settings/userExtensionSetting.js"; 
import { Cell } from "./core/table/cell.js";

// ***重要***: 假设你已创建 'tools/tableParser.js' 并将以下函数放入其中
// (getTableEditTag, handleTableEditTag, sortActions, formatParams, classifyParams, fixUnescapedSingleQuotes)
import { getTableEditTag, handleTableEditTag, sortActions, formatParams, classifyParams, fixUnescapedSingleQuotes } from './tools/tableParser.js'; 

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '1.0.0-Ebbinghaus';

const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';

/**
 * 插件初始化时，检查并创建我们需要的四张核心表格。
 */
async function initializeEbbinghausTables() {
    console.log("[Ebbinghaus] 正在检查核心表格...");

    const needed = {
        [TBL_CONTROL]: false,
        [TBL_SCHEDULE]: false,
        [TBL_WORD_LISTS]: false,
        [TBL_MASTERY]: false,
    };
    let allExist = true;
    for (const name in needed) {
        if (!BASE.isSheetExist(name)) {
            needed[name] = true;
            allExist = false;
        }
    }

    if (allExist) {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
        return;
    }

    EDITOR.info("[Ebbinghaus] 检测到缺少核心表格，正在执行首次创建...");

    if (needed[TBL_CONTROL]) {
        const sheet = BASE.createTemplateSheet(2, 3, TBL_CONTROL);
        sheet.findCellByPosition(0, 0).data.value = 'Setting';
        sheet.findCellByPosition(0, 1).data.value = 'Value';
        sheet.findCellByPosition(1, 0).data.value = 'Current_Day';
        sheet.findCellByPosition(1, 1).data.value = '1';
        sheet.findCellByPosition(2, 0).data.value = 'Current_Round';
        sheet.findCellByPosition(2, 1).data.value = '1';
        sheet.save();
    }

    if (needed[TBL_SCHEDULE]) {
        const sheet = BASE.createTemplateSheet(7, 2, TBL_SCHEDULE);
        ['Day', 'NewList', 'Review1', 'Review2', 'Review3', 'Review4', 'Review5'].forEach((h, i) => sheet.findCellByPosition(0, i).data.value = h);
        sheet.findCellByPosition(1, 0).data.value = '1';
        sheet.findCellByPosition(1, 1).data.value = 'List1';
        sheet.save();
        EDITOR.info("艾宾浩斯插件：[Ebbinghaus_Schedule] 表已创建，请手动填充复习计划。");
    }

    if (needed[TBL_WORD_LISTS]) {
        const sheet = BASE.createTemplateSheet(2, 2, TBL_WORD_LISTS);
        sheet.findCellByPosition(0, 0).data.value = 'ListName';
        sheet.findCellByPosition(0, 1).data.value = 'Words';
        sheet.findCellByPosition(1, 0).data.value = 'List1';
        sheet.findCellByPosition(1, 1).data.value = 'example,word';
        sheet.save();
    }

    if (needed[TBL_MASTERY]) {
        const sheet = BASE.createTemplateSheet(7, 2, TBL_MASTERY);
        ['Day', 'Level_0_New', 'Level_1', 'Level_2', 'Level_3', 'Level_4', 'Level_5_Mastered_Today'].forEach((h, i) => sheet.findCellByPosition(0, i).data.value = h);
        sheet.findCellByPosition(1, 0).data.value = 'Day 1';
        sheet.save();
    }
    
    console.log("[Ebbinghaus] 核心表格创建完成。");
    await BASE.refreshContextView();
}


/**
 * 核心逻辑：执行每日学习结束时的存档操作
 */
async function processEndOfDay() {
    try {
        EDITOR.info("[Ebbinghaus] 开始执行每日结算...");

        const controlSheet = BASE.getTemplateSheet(TBL_CONTROL);
        const masterySheet = BASE.getTemplateSheet(TBL_MASTERY);
        const wordListsSheet = BASE.getTemplateSheet(TBL_WORD_LISTS);
        const scheduleSheet = BASE.getTemplateSheet(TBL_SCHEDULE);

        if (!controlSheet || !masterySheet || !wordListsSheet || !scheduleSheet) {
            return EDITOR.error("[Ebbinghaus] 错误：缺少核心表格，无法执行每日结算。");
        }

        const currentDay = parseInt(controlSheet.findCellByPosition(1, 1).data.value);
        
        const scheduleRowIndex = scheduleSheet.hashSheet.findIndex(row => scheduleSheet.cells.get(row[0])?.data.value == currentDay);
        
        if (scheduleRowIndex !== -1) {
            const newListName = scheduleSheet.getCellsByRowIndex(scheduleRowIndex)[1].data.value;
            const masteredWords = [];

            for (let i = 1; i < masterySheet.getRowCount(); i++) {
                const cell = masterySheet.findCellByPosition(i, 6); // Level_5_Mastered_Today is the 7th column (index 6)
                if (cell && cell.data.value.trim()) {
                    masteredWords.push(...cell.data.value.split(',').map(w => w.trim()).filter(Boolean));
                    cell.newAction(Cell.CellAction.editCell, { value: '' }, false);
                }
            }
            masterySheet.save();

            if (masteredWords.length > 0) {
                let listRowIndex = wordListsSheet.hashSheet.findIndex(row => wordListsSheet.cells.get(row[0])?.data.value === newListName);
                if (listRowIndex === -1) {
                    wordListsSheet.findCellByPosition(wordListsSheet.getRowCount() - 1, 0).newAction(Cell.CellAction.insertDownRow, {}, false);
                    listRowIndex = wordListsSheet.getRowCount() - 1;
                    wordListsSheet.findCellByPosition(listRowIndex, 0).newAction(Cell.CellAction.editCell, { value: newListName }, false);
                }
                wordListsSheet.findCellByPosition(listRowIndex, 1).newAction(Cell.CellAction.editCell, { value: masteredWords.join(',') }, true); // 最后一步执行保存
                EDITOR.success(`[Ebbinghaus] ${masteredWords.length}个单词已存档至'${newListName}'。`);
            } else {
                EDITOR.info("[Ebbinghaus] 今天没有新掌握的单词需要存档。");
            }
        } else {
            EDITOR.warning(`[Ebbinghaus] 在计划表中未找到第 ${currentDay} 天的计划，无法存档新词表。`);
        }

        const nextDay = currentDay + 1;
        controlSheet.findCellByPosition(1, 1).newAction(Cell.CellAction.editCell, { value: String(nextDay) }, true);
        EDITOR.success(`[Ebbinghaus] 每日结算完成！已进入第 ${nextDay} 天。`);

    } catch (error) {
        EDITOR.error("[Ebbinghaus] 每日结算时发生严重错误:", error.message, error);
    }
}


/**
 * 当AI返回消息时，处理其中的 <tableEdit> 标签 (移植自原插件并简化)
 */
function handleEditStrInMessage(chat) {
    try {
        const { matches } = getTableEditTag(chat.mes);
        if (!matches || matches.length === 0) return;

        const tableEditActions = handleTableEditTag(matches);
        tableEditActions.forEach((action, index) => action.action = classifyParams(formatParams(action.param)));
        
        const sheets = BASE.getChatSheets();
        
        for (const EditAction of sortActions(tableEditActions)) {
            const action = EditAction.action;
            const sheet = sheets[action.tableIndex];
            if (!sheet) continue;

            if (action.data) action.data = fixUnescapedSingleQuotes(action.data);
            
            switch (EditAction.type) {
                case 'update':
                    const rowIndex = action.rowIndex ? parseInt(action.rowIndex) : 0;
                    if (!action.data) break;
                    Object.entries(action.data).forEach(([key, value]) => {
                        const cell = sheet.findCellByPosition(rowIndex + 1, parseInt(key) + 1);
                        if (cell) cell.newAction(Cell.CellAction.editCell, { value }, false);
                    });
                    break;
                // 'insert' 和 'delete' 的逻辑可以根据未来需求添加
            }
        }
        sheets.forEach(sheet => sheet.save());
        console.log("[Ebbinghaus] 表格编辑指令执行完毕。");
    } catch (error) {
        EDITOR.error("[Ebbinghaus] 解析<tableEdit>指令时出错:", error.message, error);
    }
}


/**
 * 注入表格提示词 (优化版)
 */
async function onChatCompletionPromptReady(eventData) {
    if (eventData.dryRun || !USER.tableBaseSetting.isExtensionAble || !USER.tableBaseSetting.isAiReadTable) return;

    try {
        const piece = BASE.getReferencePiece();
        if (!piece?.hash_sheets) return; // 如果还没有任何表格数据，则不注入

        const sheets = BASE.hashSheetsToSheets(piece.hash_sheets)
            .filter(sheet => Object.values(needed).includes(sheet.name)); // 确保只注入我们的核心表格

        if (sheets.length === 0) return;

        const tableData = sheets.map((sheet, index) => sheet.getTableText(index, ['title', 'headers', 'rows'])).join('\n');
        
        const promptContent = USER.tableBaseSetting.message_template.replace('{{tableData}}', tableData);

        const role = USER.tableBaseSetting.injection_mode === 'deep_system' ? 'system' : 'user';
        const deep = USER.tableBaseSetting.deep ?? 2;
        
        eventData.chat.splice(-deep, 0, { role, content: promptContent });
        
        console.log("[Ebbinghaus] 已注入学习系统提示词及数据。");
    } catch (error) {
        EDITOR.error(`[Ebbinghaus] 表格数据注入失败:`, error.message, error);
    }
}


/**
 * 消息接收时触发 (优化版)
 */
async function onMessageReceived(chat_id) {
    if (!USER.tableBaseSetting.isExtensionAble) return;
    
    const chat = USER.getContext().chat[chat_id];
    
    if (chat.is_user && chat.mes.trim().toLowerCase() === 'end of day') {
        USER.getContext().chat.pop();
        await USER.saveChat();
        processEndOfDay();
        return; 
    }

    if (!chat.is_user && USER.tableBaseSetting.isAiWriteTable) {
        handleEditStrInMessage(chat);
    }

    await BASE.refreshContextView();
}


// --- 插件主入口 ---
jQuery(async () => {
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP) { clearInterval(interval); resolve(); } }, 100);
    });
    
    loadSettings();
    await initializeEbbinghausTables();

    // 加载UI模板
    $('#extensions_settings').append(await SYSTEM.getTemplate('index.html'));
    $('#app_header_extensions').append(await SYSTEM.getTemplate('appHeaderTableDrawer.html'));
    // 在扩展菜单中添加按钮
    $('#extensions_list').append(await SYSTEM.getTemplate('buttons.html'));
    $('#open_ebbinghaus_system').on('click', () => { /* 在这里添加打开主面板的逻辑 */ });

    // 监听主程序事件
    APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：加载完成______________________");
});
