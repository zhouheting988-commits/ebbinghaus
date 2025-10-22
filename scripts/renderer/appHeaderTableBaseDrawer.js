// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
import { EDITOR } from "../../core/manager.js";
import { getChatSheetsView } from "../editor/chatSheetsDataView.js";

// 全局变量定义 (简化)
let tableDrawerIcon = null;
let tableDrawerContent = null;
let appHeaderTableContainer = null;
let databaseButton = null;
// let editorButton = null; // 移除
let settingButton = null;

let tableViewDom = null;
// let tableEditDom = null; // 移除
let settingContainer = null;

let databaseContentDiv = null;
// let editorContentDiv = null; // 移除
let settingContentDiv = null;

let isEventListenersBound = false;
let currentActiveButton = null;

/**
 * 更新按钮选中状态
 */
function updateButtonStates(selectedButton) {
    if (currentActiveButton && currentActiveButton.is(selectedButton)) {
        return false;
    }
    databaseButton.css('opacity', '0.5');
    // editorButton.css('opacity', '0.5'); // 移除
    settingButton.css('opacity', '0.5');
    selectedButton.css('opacity', '1');
    currentActiveButton = selectedButton;
    return true;
}

/**
 * 初始化应用头部表格抽屉
 */
export async function initAppHeaderTableDrawer() {
    if (isEventListenersBound) {
        return;
    }

    // DOM 元素选择
    tableDrawerIcon = $('#table_drawer_icon');
    tableDrawerContent = $('#table_drawer_content');
    appHeaderTableContainer = $('#app_header_table_container');
    databaseButton = $('#database_button');
    // editorButton = $('#editor_button'); // 移除
    settingButton = $('#setting_button');
    const inlineDrawerHeaderContent = $('#inline_drawer_header_content');

    // 异步获取内容
    if (tableViewDom === null) {
        tableViewDom = await getChatSheetsView(-1);
    }
    // 移除了 tableEditDom 的加载
    if (settingContainer === null) {
        const header = $(`<div></div>`).append($(`<div style="margin: 10px 0;"></div>`).append(inlineDrawerHeaderContent));
        settingContainer = header.append($('.memory_enhancement_container').find('#memory_enhancement_settings_inline_drawer_content'));
    }

    // 创建容器 div
    databaseContentDiv = $(`<div id="database-content" style="width: 100%; height: 100%; overflow: hidden;"></div>`).append(tableViewDom);
    // 移除了 editorContentDiv 的创建
    settingContentDiv = $(`<div id="setting-content" style="width: 100%; height: 100%; display: none; overflow: hidden;"></div>`).append(settingContainer);

    // 添加内容容器到主面板
    appHeaderTableContainer.append(databaseContentDiv);
    // 移除了 editorContentDiv 的添加
    appHeaderTableContainer.append(settingContentDiv);

    // 初始化按钮状态
    updateButtonStates(databaseButton);

    // 按钮点击事件
    databaseButton.on('click', function() {
        if (updateButtonStates(databaseButton)) {
            switchContent(databaseContentDiv);
        }
    });

    // 移除了 editorButton 的点击事件

    settingButton.on('click', function() {
        if (updateButtonStates(settingButton)) {
            switchContent(settingContentDiv);
        }
    });

    isEventListenersBound = true;
    $('.memory_enhancement_container').remove();
}

/**
 * 打开/关闭抽屉 (简化，移除 target === 'editor' 的分支)
 */
export async function openAppHeaderTableDrawer(target = undefined) {
    // ... (这部分逻辑可以保持原样，或者为了更干净可以移除 if (target === 'editor') 的判断)
    // 保持原样通常是安全的
}

/**
 * 内容切换函数 (保持不变)
 */
async function switchContent(targetContent) {
    // ... (这部分逻辑完全可以复用，无需修改)
}
