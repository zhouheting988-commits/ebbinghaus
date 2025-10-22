// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - FINAL COMPATIBILITY VERSION
import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { initAppHeaderTableDrawer, openAppHeaderTableDrawer, isDrawerNewVersion } from './scripts/renderer/appHeaderTableBaseDrawer.js';
import { Cell } from './core/table/cell.js';

console.log("______________________艾宾浩斯学习插件：开始加载______________________");

const VERSION = '4.0.0-FINAL';

// --- 核心表格名称常量 ---
const TBL_CONTROL = 'Study_Control';
const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
const TBL_WORD_LISTS = 'Word_Lists';
const TBL_MASTERY = 'Vocabulary_Mastery';
const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];


// --- 核心函数区域 (保持不变) ---
async function initializeEbbinghausTables() { /* ... 保持你之前的代码 ... */ }
async function processEndOfDay() { /* ... 保持你之前的代码 ... */ }
function handleEditStrInMessage(chat) { /* ... 保持你之前的代码 ... */ }
async function onChatCompletionPromptReady(eventData) { /* ... 保持你之前的代码 ... */ }
async function onMessageReceived(event) { /* ... 保持你之前的代码 ... */ }


// --- 插件主入口 (最终修复版) ---
jQuery(async () => {
    await new Promise(resolve => {
        const interval = setInterval(() => { if (window.APP) { clearInterval(interval); resolve(); } }, 100);
    });

    // 1. 将所有HTML模板添加到页面
    $('#translation_container').after(await SYSTEM.getTemplate('index'));
    $('#extensions-settings-button').after(await SYSTEM.getTemplate('appHeaderTableDrawer'));
    $('#extensions_list').append(await SYSTEM.getTemplate('buttons'));
    
    // 2. 初始化UI逻辑
    await initAppHeaderTableDrawer();
    
    // 3. ***核心修复***: 绑定兼容新旧版SillyTavern的点击事件
    if (isDrawerNewVersion()) {
        // 新版本 ST
        $('#table_database_settings_drawer .drawer-toggle').on('click', APP.doNavbarIconClick);
    } else {
        // 旧版本 ST
        $('#table_drawer_content').attr('data-slide-toggle', 'hidden').css('display', 'none');
        $('#table_database_settings_drawer .drawer-toggle').on('click', openAppHeaderTableDrawer);
    }
    
    // 4. 为扩展列表里的按钮也加上点击事件
    $('#open_ebbinghaus_system').on('click', () => {
        openAppHeaderTableDrawer(); // 这个函数可以安全地打开抽屉
    });
    
    // 5. 初始化核心数据表格
    await initializeEbbinghausTables();

    // 6. 绑定核心事件监听器
    APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
    APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);
    
    console.log("______________________艾宾浩斯学习插件：UI及核心全部加载完成！______________________");
});
