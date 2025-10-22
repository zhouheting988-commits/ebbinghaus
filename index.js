// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - FINAL VERSION WITH UI INITIALIZATION
import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { initAppHeaderTableDrawer } from './scripts/renderer/appHeaderTableBaseDrawer.js'; // ***核心修复***: 导入UI初始化器
import { Cell } from './core/table/cell.js';

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '3.0.0-FINAL';

// --- 核心表格名称常量 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];


// --- 核心函数区域 (这部分代码是正确的，保持不变) ---

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
async function processEndOfDay() { /* ... 保持你之前的代码 ... */ }
function handleEditStrInMessage(chat) { /* ... 保持你之前的代码 ... */ }
async function onChatCompletionPromptReady(eventData) { /* ... 保持你之前的代码 ... */ }
async function onMessageReceived(event) { /* ... 保持你之前的代码 ... */ }


// --- 插件主入口 (最终修复版) ---
jQuery(async () => {
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP) { clearInterval(interval); resolve(); } }, 100);
    });
    
    // ***核心修复1***: 使用原插件的UI挂载方法，确保位置正确
    // 将设置面板的主体HTML添加到页面（但暂时不可见）
    $('#translation_container').after(await SYSTEM.getTemplate('index')); 
    // 将顶部抽屉的HTML添加到页面
    $('#extensions-settings-button').after(await SYSTEM.getTemplate('appHeaderTableDrawer'));
    // 将扩展菜单中的按钮HTML添加到列表
    $('#extensions_list').append(await SYSTEM.getTemplate('buttons'));
    
    // ***核心修复2***: 调用UI初始化函数，唤醒所有UI元素！
    initAppHeaderTableDrawer();
    
    // 为扩展菜单里的按钮也绑定上点击事件，让它能打开抽屉
    $('#open_ebbinghaus_system').on('click', () => {
        $('#table_drawer_icon').click();
    });
    
    // 初始化核心数据表格
    await initializeEbbinghausTables();

    // 绑定核心事件监听器
    APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：UI及核心全部加载完成！______________________");
});
