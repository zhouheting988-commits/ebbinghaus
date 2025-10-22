// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - FINAL UI-ENABLED VERSION

import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { Cell } from "./core/table/cell.js";
// *** 新增：导入我们的UI控制器 ***
import { initDrawer } from './scripts/ui/drawer.js';

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '1.2.0-UI-Enabled';

// --- 核心表格名称常量 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];

// (initializeEbbinghausTables, processEndOfDay, handleEditStrInMessage, onChatCompletionPromptReady, onMessageReceived 这些函数保持不变... 为了简洁省略)
// ... 请确保你保留了上一版中这些函数的完整代码 ...
async function initializeEbbinghausTables() {
    console.log("[Ebbinghaus] 正在检查核心表格...");
    let createdSomething = false;

    // 使用 for...of 循环确保异步操作按顺序完成
    for (const tableName of CORE_TABLES) {
        if (!BASE.isSheetExist(tableName)) {
            createdSomething = true;
            EDITOR.info(`[Ebbinghaus] 检测到缺少核心表格 [${tableName}]，正在创建...`);
            
            // 使用 switch 语句创建不同的表格
            switch (tableName) {
                case TBL_CONTROL:
                    const controlSheet = BASE.createTemplateSheet(2, 3, TBL_CONTROL);
                    controlSheet.findCellByPosition(0, 0).editCellData({ value: 'Setting' });
                    controlSheet.findCellByPosition(0, 1).editCellData({ value: 'Value' });
                    controlSheet.findCellByPosition(1, 0).editCellData({ value: 'Current_Day' });
                    controlSheet.findCellByPosition(1, 1).editCellData({ value: '1' });
                    controlSheet.findCellByPosition(2, 0).editCellData({ value: 'Current_Round' });
                    controlSheet.findCellByPosition(2, 1).editCellData({ value: '1' });
                    controlSheet.save();
                    break;

                case TBL_SCHEDULE:
                    const scheduleSheet = BASE.createTemplateSheet(7, 2, TBL_SCHEDULE);
                    ['Day', 'NewList', 'Review1', 'Review2', 'Review3', 'Review4', 'Review5'].forEach((h, i) => scheduleSheet.findCellByPosition(0, i).editCellData({ value: h }));
                    scheduleSheet.findCellByPosition(1, 0).editCellData({ value: '1' });
                    scheduleSheet.findCellByPosition(1, 1).editCellData({ value: 'List1' });
                    scheduleSheet.save();
                    EDITOR.info("[Ebbinghaus] [Ebbinghaus_Schedule] 表已创建，请手动填充复习计划。");
                    break;

                case TBL_WORD_LISTS:
                    const wordListsSheet = BASE.createTemplateSheet(2, 2, TBL_WORD_LISTS);
                    wordListsSheet.findCellByPosition(0, 0).editCellData({ value: 'ListName' });
                    wordListsSheet.findCellByPosition(0, 1).editCellData({ value: 'Words' });
                    wordListsSheet.findCellByPosition(1, 0).editCellData({ value: 'List1' });
                    wordListsSheet.findCellByPosition(1, 1).editCellData({ value: 'example,word' });
                    wordListsSheet.save();
                    break;

                case TBL_MASTERY:
                    const masterySheet = BASE.createTemplateSheet(7, 2, TBL_MASTERY);
                    ['Day', 'Level_0_New', 'Level_1', 'Level_2', 'Level_3', 'Level_4', 'Level_5_Mastered_Today'].forEach((h, i) => masterySheet.findCellByPosition(0, i).editCellData({ value: h }));
                    masterySheet.findCellByPosition(1, 0).editCellData({ value: 'Day 1' });
                    masterySheet.save();
                    break;
            }
        }
    }

    if (createdSomething) {
        console.log("[Ebbinghaus] 核心表格创建完成。");
        await BASE.refreshContextView();
    } else {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
    }
}
async function processEndOfDay() {
    try {
        EDITOR.info("[Ebbinghaus] 开始执行每日结算...");
        const controlSheet = BASE.getTemplateSheet(TBL_CONTROL);
        if(!controlSheet) return
        const currentDay = parseInt(controlSheet.findCellByPosition(1, 1).data.value);
        const nextDay = currentDay + 1;
        controlSheet.findCellByPosition(1, 1).editCellData({ value: String(nextDay) });
        controlSheet.save();
        EDITOR.success(`[Ebbinghaus] 每日结算完成！已进入第 ${nextDay} 天。`);
    } catch (error) {
        EDITOR.error("[Ebbinghaus] 每日结算时发生严重错误:", error.message, error);
    }
}
function handleEditStrInMessage(chat) {
    if (chat.mes.includes('<tableEdit>')) {
        console.log("[Ebbinghaus] 检测到<tableEdit>标签，但解析器已禁用。");
    }
}
async function onChatCompletionPromptReady(eventData) {
    if (eventData.dryRun || !USER.getSettings().isExtensionAble || !USER.getSettings().isAiReadTable) return;
    try {
        const piece = BASE.getReferencePiece();
        if (!piece?.hash_sheets) return;
        const sheets = BASE.hashSheetsToSheets(piece.hash_sheets).filter(sheet => CORE_TABLES.includes(sheet.name));
        if (sheets.length === 0) return;
        const tableData = sheets.map((sheet, index) => sheet.getTableText(index, ['title', 'headers', 'rows'])).join('\n');
        const promptContent = USER.getSettings().message_template.replace('{{tableData}}', tableData);
        const role = USER.getSettings().injection_mode === 'deep_system' ? 'system' : 'user';
        const deep = USER.getSettings().deep ?? 2;
        eventData.chat.splice(-deep, 0, { role, content: promptContent });
        console.log("[Ebbinghaus] 已注入学习系统提示词及数据。");
    } catch (error) {
        EDITOR.error(`[Ebbinghaus] 表格数据注入失败:`, error.message, error);
    }
}
async function onMessageReceived(event) {
    const { chat_id } = event.detail;
    if (!USER.getSettings().isExtensionAble) return;
    const chat = USER.getContext().chat[chat_id];
    if (!chat) return;
    if (chat.is_user && chat.mes.trim().toLowerCase() === 'end of day') {
        USER.getContext().chat.pop();
        await USER.saveChat();
        processEndOfDay();
        return; 
    }
    if (!chat.is_user && USER.getSettings().isAiWriteTable) {
        handleEditStrInMessage(chat);
    }
    await BASE.refreshContextView();
}


// --- 插件主入口 ---
jQuery(async () => {
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP) { clearInterval(interval); resolve(); } }, 100);
    });
    
    await initializeEbbinghausTables();

    // --- UI 加载与初始化 (修复版) ---
    // 1. 将HTML模板注入到SillyTavern的正确位置
    const settingsHtml = await SYSTEM.getTemplate('index');
    const drawerHtml = await SYSTEM.getTemplate('appHeaderTableDrawer');
    const buttonHtml = await SYSTEM.getTemplate('buttons');

    // 注入设置面板 (会被抽屉里的“设置”按钮控制显示)
    $('#extensions_settings').append(settingsHtml);
    // 注入顶部的抽屉面板 (包含图标)
    $('#app_header_extensions').append(drawerHtml);
    // 注入扩展列表中的菜单项 (可选，但保持完整性)
    $('#extensions_list').append(buttonHtml);

    // 2. ***关键步骤***: 调用我们的UI控制器来激活抽屉
    initDrawer();

    // 3. 移除旧的、不正确的按钮绑定
    // $('#open_ebbinghaus_system').on('click', ...); // 这行现在由 initDrawer() 处理

    // 监听主程序事件
    APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：加载完成，UI已激活______________________");
});
