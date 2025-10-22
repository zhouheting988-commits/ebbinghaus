// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - FINAL FIXED VERSION

import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { Cell } from "./core/table/cell.js";

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '1.1.0-Fixed'; // 版本号更新

// --- 核心表格名称常量 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];

/**
 * 插件初始化时，检查并创建我们需要的四张核心表格。
 */
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
        // 创建后刷新一次视图，确保UI上能看到
        await BASE.refreshContextView();
    } else {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
    }
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
        
        // ... (这部分逻辑保持不变，但为了健壮性，可以加上更多检查) ...
        
        // 示例：将 nextDay 的更新也放入 try-catch
        const currentDay = parseInt(controlSheet.findCellByPosition(1, 1).data.value);
        const nextDay = currentDay + 1;
        controlSheet.findCellByPosition(1, 1).editCellData({ value: String(nextDay) }); // 直接使用editCellData
        controlSheet.save();
        EDITOR.success(`[Ebbinghaus] 每日结算完成！已进入第 ${nextDay} 天。`);

    } catch (error) {
        EDITOR.error("[Ebbinghaus] 每日结算时发生严重错误:", error.message, error);
    }
}

/**
 * 当AI返回消息时，处理其中的 <tableEdit> 标签
 * (这是一个占位符，因为我们删除了 tableParser.js，如果需要此功能需要重新实现)
 */
function handleEditStrInMessage(chat) {
    // 由于我们删除了 tableParser.js，这个功能暂时禁用
    if (chat.mes.includes('<tableEdit>')) {
        console.log("[Ebbinghaus] 检测到<tableEdit>标签，但解析器已禁用。");
        // 未来可以在这里重新实现一个简化的解析器
    }
}


/**
 * 注入表格提示词 (修复版)
 */
async function onChatCompletionPromptReady(eventData) {
    // 简化了设置的访问方式，直接从 USER 对象获取
    if (eventData.dryRun || !USER.getSettings().isExtensionAble || !USER.getSettings().isAiReadTable) return;

    try {
        const piece = BASE.getReferencePiece();
        if (!piece?.hash_sheets) return;

        const sheets = BASE.hashSheetsToSheets(piece.hash_sheets)
            .filter(sheet => CORE_TABLES.includes(sheet.name)); // ***修复点***: 使用常量数组过滤

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


/**
 * 消息接收时触发 (优化版)
 */
async function onMessageReceived(event) {
    const { chat_id } = event.detail; // SillyTavern 新版事件传递方式
    if (!USER.getSettings().isExtensionAble) return;
    
    const chat = USER.getContext().chat[chat_id];
    if (!chat) return;
    
    // 使用小写的 'end of day' 进行比对，更健壮
    if (chat.is_user && chat.mes.trim().toLowerCase() === 'end of day') {
        USER.getContext().chat.pop(); // 移除 "end of day" 这条消息
        await USER.saveChat();
        processEndOfDay();
        return; 
    }

    if (!chat.is_user && USER.getSettings().isAiWriteTable) {
        handleEditStrInMessage(chat);
    }

    // 每次消息后都刷新一下数据视图是个好习惯
    await BASE.refreshContextView();
}


// --- 插件主入口 ---
jQuery(async () => {
    // 等待 SillyTavern 核心加载完成
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP) { clearInterval(interval); resolve(); } }, 100);
    });
    
    // ***修复点***: 移除 loadSettings()，因为设置是通过 manager.js 的代理自动加载的
    
    // 初始化我们的核心表格
    await initializeEbbinghausTables();

    // 加载UI模板
    $('#extensions_settings').append(await SYSTEM.getTemplate('index')); // 模板名不需要.html后缀
    $('#app_header_extensions').append(await SYSTEM.getTemplate('appHeaderTableDrawer'));
    $('#extensions_list').append(await SYSTEM.getTemplate('buttons'));
    
    // 给按钮绑定一个简单的点击事件，例如打开抽屉
    $('#open_ebbinghaus_system').on('click', () => {
        $('#table_drawer_icon').click();
    });

    // 监听主程序事件
    APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：加载完成______________________");
});
