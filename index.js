// /ebbinghaus/index.js - REBUILT FOR EBBINGHAUS LEARNING SYSTEM

import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { loadSettings } from "./scripts/settings/userExtensionSetting.js";
import { initAppHeaderTableDrawer, openAppHeaderTableDrawer } from "./scripts/renderer/appHeaderTableBaseDrawer.js";
import { executeTranslation } from "./services/translate.js";

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

// --- 核心表格名称常量 (这部分是你自己的逻辑，非常好，保留) ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];

/**
 * 插件初始化时，检查并创建我们需要的四张核心表格。
 * (你编写的这个函数非常完美，无需任何修改)
 */
async function initializeEbbinghausTables() {
    console.log("[Ebbinghaus] 正在检查核心表格...");
    let createdSomething = false;

    for (const tableName of CORE_TABLES) {
        if (!BASE.isSheetExist(tableName)) {
            createdSomething = true;
            EDITOR.info(`[Ebbinghaus] 检测到缺少核心表格 [${tableName}]，正在创建...`);
            
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
        USER.saveSettings(); // 创建完模板后保存一次
    } else {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
    }
}


/**
 * 注入表格提示词 (你的版本，很好，保留)
 */
async function onChatCompletionPromptReady(eventData) {
    if (eventData.dryRun || !USER.tableBaseSetting.isExtensionAble || !USER.tableBaseSetting.isAiReadTable) return;
    try {
        const piece = BASE.getReferencePiece();
        if (!piece?.hash_sheets) return;

        const sheets = BASE.hashSheetsToSheets(piece.hash_sheets)
            .filter(sheet => CORE_TABLES.includes(sheet.name) && sheet.enable);

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
 * 消息接收时触发 (你的逻辑，简化并保留)
 */
async function onMessageReceived(event) {
    // 简化：目前只在接收到消息后刷新视图，让用户能看到AI操作的结果
    await BASE.refreshContextView();
}


// --- 插件主入口 ---
jQuery(async () => {
    // 注入HTML模板到页面 (简化，只注入我们需要的)
    $('#extensions_settings').append(await SYSTEM.getTemplate('index'));
    $('#app_header_extensions').append(await SYSTEM.getTemplate('appHeaderTableDrawer'));
    
    // 关键修复：从这里开始，我们严格按照正确的顺序初始化
    // 1. 加载设置，这是所有UI和逻辑的基础
    loadSettings();
    
    // 2. 初始化顶部的抽屉菜单UI
    initAppHeaderTableDrawer();
    
    // 3. 为我们自己添加的“打开艾宾浩斯”按钮绑定点击事件
    // 这个按钮的模板我们没有加载，所以先注释掉，如果需要再加回来
    // $('#extensions_list').append(await SYSTEM.getTemplate('buttons'));
    // $(document).on('click', '#open_ebbinghaus_system', () => openAppHeaderTableDrawer());
    
    // 4. 执行界面翻译
    executeTranslation();

    // 5. 初始化我们的核心表格
    await initializeEbbinghausTables();

    // 6. 监听主程序事件
    APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：加载完成______________________");
});
