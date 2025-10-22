// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - FINAL UI-INTEGRATION VERSION

import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { Cell } from "./core/table/cell.js";

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '1.2.0-UI-Fixed'; // 版本号更新

// --- 核心表格名称常量 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];

// ... (initializeEbbinghausTables, processEndOfDay, handleEditStrInMessage, onChatCompletionPromptReady, onMessageReceived 这些函数保持不变) ...
// (为了简洁，我在这里省略了它们，请确保你复制的是包含所有函数的完整文件)

/**
 * 插件初始化时，检查并创建我们需要的四张核心表格。
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
        await BASE.refreshContextView();
    } else {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
    }
}

async function processEndOfDay() {
    try {
        EDITOR.info("[Ebbinghaus] 开始执行每日结算...");
        const controlSheet = BASE.getTemplateSheet(TBL_CONTROL);
        if (!controlSheet) return EDITOR.error("[Ebbinghaus] 错误：无法找到控制表。");
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


// --- 插件主入口 (UI集成强化版) ---
jQuery(async () => {
    // 等待 SillyTavern 核心加载完成
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP && window.jQuery) { clearInterval(interval); resolve(); } }, 100);
    });

    try {
        // --- 核心逻辑初始化 ---
        await initializeEbbinghausTables();

        // --- UI 注入与初始化 ---
        console.log("[Ebbinghaus] 开始注入UI组件...");

        // 1. 注入顶部栏抽屉图标 (你最想要的入口)
        const topBar = $('#app_header_extensions');
        if (topBar.length) {
            topBar.append(await SYSTEM.getTemplate('appHeaderTableDrawer'));
            console.log("[Ebbinghaus] 顶部栏图标抽屉注入成功。");
        } else {
            console.error("[Ebbinghaus] 错误：找不到顶部栏挂载点 '#app_header_extensions'。图标无法显示。");
        }

        // 2. 注入主设置面板 (最可靠的备用入口)
        const settingsPanel = $('#extensions_settings');
        if (settingsPanel.length) {
            settingsPanel.append(await SYSTEM.getTemplate('index'));
            console.log("[Ebbinghaus] 主设置面板注入成功。");
        } else {
            console.error("[Ebbinghaus] 错误：找不到主设置面板挂载点 '#extensions_settings'。");
        }

        // 3. 注入扩展下拉菜单按钮 (另一个方便的入口)
        const extensionsList = $('#extensions_list');
        if (extensionsList.length) {
            extensionsList.append(await SYSTEM.getTemplate('buttons'));
            // 为这个按钮绑定点击事件，让它能打开抽屉
            $('#open_ebbinghaus_system').on('click', () => {
                const drawerIcon = $('#table_drawer_icon');
                if (drawerIcon.length) {
                    drawerIcon.click();
                    console.log("[Ebbinghaus] 通过菜单按钮打开抽屉。");
                }
            });
            console.log("[Ebbinghaus] 扩展下拉菜单按钮注入成功。");
        } else {
            console.error("[Ebbinghaus] 错误：找不到扩展下拉菜单挂载点 '#extensions_list'。");
        }

        // --- 绑定核心事件监听器 ---
        APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
        APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
        
        console.log("______________________艾宾浩斯学习插件：加载完成______________________");

    } catch (error) {
        console.error("艾宾浩斯插件在初始化过程中发生严重错误:", error);
        EDITOR.error("艾宾浩斯插件加载失败", "详情请查看开发者控制台（F12）的错误日志。", error);
    }
});}

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
