// /ebbinghaus/index.js - MODERNIZED & STABLE VERSION

// 导入你的所有模块，这部分保持不变
import { APP, BASE, EDITOR, USER, SYSTEM } from './core/manager.js';
import { loadSettings } from "./scripts/settings/userExtensionSetting.js";
import { initAppHeaderTableDrawer, openAppHeaderTableDrawer } from "./scripts/renderer/appHeaderTableBaseDrawer.js";
import { executeTranslation } from "./services/translate.js";

// 使用IIFE（立即调用函数表达式）来封装插件，这是SillyTavern插件的标准做法
(function () {
    const extensionName = "EbbinghausWordHelper"; // 给插件一个唯一的内部名称

    console.log("______________________艾宾浩斯学习插件：开始加载______________________");

    // ================================================================
    //  第一部分：你的所有核心逻辑函数 (完全保留，无需改动)
    // ================================================================
    const TBL_CONTROL = 'Study_Control';
    const TBL_SCHEDULE = 'Ebbinghaus_Schedule';
    const TBL_WORD_LISTS = 'Word_Lists';
    const TBL_MASTERY = 'Vocabulary_Mastery';
    const CORE_TABLES = [TBL_CONTROL, TBL_SCHEDULE, TBL_WORD_LISTS, TBL_MASTERY];

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

    async function onMessageReceived(event) { await BASE.refreshContextView(); }

    // ================================================================
    //  第二部分：插件初始化函数 (包装你的启动逻辑)
    // ================================================================
    async function initializePlugin() {
        try {
            console.log('[Ebbinghaus] 开始执行插件初始化...');

            // 注入你的设置页面和抽屉UI的HTML
            // 这种方式比直接append更健壮
            const settingsHtml = await SYSTEM.getTemplate('index');
            document.getElementById('extensions_settings').insertAdjacentHTML('beforeend', settingsHtml);
            
            const drawerHtml = await SYSTEM.getTemplate('appHeaderTableDrawer');
            document.body.insertAdjacentHTML('beforeend', drawerHtml);
            
            // 执行你的初始化函数
            loadSettings();
            initAppHeaderTableDrawer();
            executeTranslation();
            await initializeEbbinghausTables();

            // 绑定SillyTavern的事件监听
            APP.eventSource.on(APP.event_types.MESSAGE_RECEIVED, onMessageReceived);
            APP.eventSource.on(APP.event_types.CHAT_COMPLETION_PROMPT_READY, onChatCompletionPromptReady);

            console.log("______________________艾宾浩斯学习插件：加载完成______________________");

        } catch (error) {
            console.error('[Ebbinghaus] 插件初始化过程中发生严重错误:', error);
            // 这里可以添加一个更友好的UI错误提示
        }
    }

    // ================================================================
    //  第三部分：创建UI入口并注册到SillyTavern (核心修改)
    // ================================================================
    
    // 1. 创建一个将显示在顶部菜单栏的按钮元素
    const topBarButton = document.createElement('div');
    topBarButton.id = `${extensionName}-button`;
    topBarButton.className = 'custom-icon'; // 使用SillyTavern的通用图标样式
    // 使用Font Awesome图标，SillyTavern已内置。fa-graduation-cap是“学位帽”图标，很适合学习插件
    topBarButton.innerHTML = '<i class="fa-solid fa-graduation-cap" title="艾宾浩斯单词本"></i>';

    // 2. 定义按钮的点击行为
    topBarButton.onclick = () => {
        console.log('[Ebbinghaus] 插件图标被点击，正在打开抽屉...');
        // 调用你已经写好的打开抽屉的函数
        openAppHeaderTableDrawer();
    };

    // 3. 使用官方API将你的按钮注册到SillyTavern的UI中
    SillyTavern.registerExtension({
        name: extensionName,
        target: 'right-icons', // 'right-icons' 就是右上角的那一排图标
        element: topBarButton,
    });

    // 4. 等待SillyTavern的UI和数据准备就绪后，再执行你的初始化逻辑
    jQuery(async () => {
        await initializePlugin();
    });

})(); // 立即执行这个封装函数
