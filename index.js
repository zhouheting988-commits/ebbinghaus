// /ebbinghaus/index.js - FINAL DEBUGGING VERSION

// 导入所有需要的模块
import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { loadSettings } from "./scripts/settings/userExtensionSetting.js";
import { initAppHeaderTableDrawer, openAppHeaderTableDrawer } from "./scripts/renderer/appHeaderTableBaseDrawer.js";
import { executeTranslation } from "./services/translate.js";

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

// 你的核心表格创建逻辑，这部分非常完美，保持原样
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];
async function initializeEbbinghausTables() { /* ... 你的代码 ... */ }
async function onChatCompletionPromptReady(eventData) { /* ... 你的代码 ... */ }
async function onMessageReceived(event) { await BASE.refreshContextView(); }

// 上面这部分函数体太长，为了方便你复制，我先省略。
// 请确保你粘贴时，上面这些函数是完整的。
// 我将在下面重新提供完整的函数体，请以最终的完整代码块为准。

// 完整函数体开始
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
        USER.saveSettings();
    } else {
        console.log("[Ebbinghaus] 所有核心表格已存在，无需创建。");
    }
}
async function onChatCompletionPromptReady(eventData) {
    if (eventData.dryRun || !USER.tableBaseSetting.isExtensionAble || !USER.tableBaseSetting.isAiReadTable) return;
    try {
        const piece = BASE.getReferencePiece();
        if (!piece?.hash_sheets) return;
        const sheets = BASE.hashSheetsToSheets(piece.hash_sheets).filter(sheet => CORE_TABLES.includes(sheet.name) && sheet.enable);
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
// 完整函数体结束


// --- 插件主入口 (全新调试版) ---
jQuery(async () => {
    
    // 调试第一步：最暴力的测试。如果连这个弹窗都没有，说明index.js根本没被执行。
    alert("艾宾浩斯插件 index.js 已开始执行！");

    // 延迟执行，等待SillyTavern的主界面完全渲染完成
    setTimeout(async () => {
        try {
            // 调试第二步：审问SillyTavern的界面结构
            console.log("--- 艾宾浩斯UI挂载点诊断 ---");
            console.log("检查顶部挂载点 #app_header_extensions:", $('#app_header_extensions'));
            console.log("检查顶部备用挂载点 #extensions-settings-button:", $('#extensions-settings-button'));
            console.log("检查左侧菜单挂载点 #extensions_list:", $('#extensions_list'));
            console.log("检查设置页面挂载点 #extensions_settings:", $('#extensions_settings'));
            console.log("--- 诊断结束 ---");

            // 注入HTML模板
            const settingsHtml = await SYSTEM.getTemplate('index');
            $('#extensions_settings').append(settingsHtml);

            const drawerHtml = await SYSTEM.getTemplate('appHeaderTableDrawer');
            // 找到任意一个存在的顶部元素就挂载上去
            if ($('#app_header_extensions').length) {
                $('#app_header_extensions').append(drawerHtml);
            } else {
                $('#extensions-settings-button').after(drawerHtml);
            }

            // 调试第三步：强制在页面左上角显示一个入口按钮，绕过所有挂载点问题
            const forceButton = $('<div id="force-ebbinghaus-entry" style="position: fixed; top: 10px; left: 10px; z-index: 9999; background: #ff4500; color: white; padding: 10px; border-radius: 5px; cursor: pointer;">强制打开艾宾浩斯</div>');
            $('body').append(forceButton);
            
            // 严格的初始化顺序
            loadSettings();
            initAppHeaderTableDrawer();
            
            // 为强制按钮和抽屉图标都绑定事件
            forceButton.on('click', () => {
                const icon = $('#table_drawer_icon').get(0);
                if (icon && typeof APP.doNavbarIconClick === 'function') {
                    APP.doNavbarIconClick.call(icon);
                } else {
                    openAppHeaderTableDrawer();
                }
            });

            executeTranslation();
            await initializeEbbinghausTables();

            // 监听主程序事件
            APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
            APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
            
            console.log("______________________艾宾浩斯学习插件：加载完成______________________");
            alert("艾宾浩斯插件已加载完成，请检查界面和F12控制台的诊断信息。");

        } catch (e) {
            console.error("艾宾浩斯插件在初始化过程中发生致命错误:", e);
            alert(`艾宾浩斯插件初始化失败！请按F12查看控制台错误详情。\n错误信息: ${e.message}`);
        }
    }, 2000); // 延迟2秒执行，给SillyTavern足够的时间渲染
});
