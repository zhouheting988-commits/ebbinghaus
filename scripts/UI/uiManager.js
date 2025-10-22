// 这是我们的新UI控制器，负责激活所有界面元素

import { SYSTEM, EDITOR } from '../../core/manager.js';
import { getChatSheetsView } from '../editor/chatSheetsDataView.js';

let isInitialized = false;

/**
 * 切换抽屉内显示的内容（数据视图 vs 设置视图）
 * @param {jQuery} targetContent - 要显示的目标内容的jQuery对象
 */
function switchContent(targetContent) {
    const appHeaderTableContainer = $('#app_header_table_container');
    const currentContent = appHeaderTableContainer.children(':visible');

    if (currentContent.is(targetContent)) {
        return; // 如果已经是当前内容，则不执行任何操作
    }

    if (currentContent.length > 0) {
        currentContent.stop(true, true).slideUp(200);
    }
    targetContent.stop(true, true).slideDown(200);
}

/**
 * 主初始化函数，激活所有UI元素和事件
 */
export async function initializeUI() {
    if (isInitialized) return;

    try {
        // --- 缓存DOM元素 ---
        const tableDrawerIcon = $('#table_drawer_icon');
        const databaseButton = $('#database_button');
        const settingButton = $('#setting_button');
        const openSystemButton = $('#open_ebbinghaus_system');

        // --- 获取内容面板 ---
        // 1. 数据面板 (从chatSheetsDataView.js获取)
        const dataContentView = $(await getChatSheetsView(-1));
        // 2. 设置面板 (它已经被注入到页面中，我们只需要找到它)
        const settingsContentView = $('#memory_enhancement_settings_inline_drawer_content');

        // 将两个内容面板都放入抽屉的容器中，并默认隐藏设置面板
        const appHeaderTableContainer = $('#app_header_table_container');
        appHeaderTableContainer.empty().append(dataContentView).append(settingsContentView);
        settingsContentView.hide();

        // --- 绑定核心事件 ---
        // 1. 顶部工具栏图标点击事件 -> 开/关抽屉
        tableDrawerIcon.on('click', function() {
            const drawerContent = $('#table_drawer_content');
            const options = EDITOR.getSlideToggleOptions ? EDITOR.getSlideToggleOptions() : { duration: 200 };
            
            $(this).toggleClass('closedIcon openIcon');
            drawerContent.toggleClass('closedDrawer openDrawer');
            EDITOR.slideToggle(drawerContent.get(0), options);
        });

        // 2. 抽屉内“数据”按钮点击事件
        databaseButton.on('click', function() {
            $(this).css('opacity', '1');
            settingButton.css('opacity', '0.5');
            switchContent(dataContentView);
        });

        // 3. 抽屉内“设置”按钮点击事件
        settingButton.on('click', function() {
            $(this).css('opacity', '1');
            databaseButton.css('opacity', '0.5');
            switchContent(settingsContentView);
        });

        // 4. 扩展列表中的“打开系统”按钮点击事件
        openSystemButton.on('click', () => {
            // 如果抽屉是关的，就打开它
            if (tableDrawerIcon.hasClass('closedIcon')) {
                tableDrawerIcon.click();
            }
            // 切换到设置视图
            settingButton.click();
        });
        
        // 默认激活“数据”按钮
        databaseButton.click();

        isInitialized = true;
        console.log("[Ebbinghaus UI] 界面控制器初始化成功！");

    } catch (error) {
        console.error("[Ebbinghaus UI] 界面控制器初始化失败:", error);
        EDITOR.error("插件UI初始化失败", error.message, error);
    }
}
