// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
import { USER, EDITOR } from '../../core/manager.js';
import { defaultSettings } from "../../data/pluginSetting.js"; // 我们需要默认设置

/**
 * 更新设置中的开关状态
 */
function updateSwitch(selector, switchValue) {
    $(selector).prop('checked', !!switchValue);
}

/**
 * 绑定核心设置的事件
 */
function InitBinging() {
    console.log('[Ebbinghaus] Initializing settings bindings...');
    
    // 插件总体开关
    $('#table_switch').on('change', function () {
        USER.tableBaseSetting.isExtensionAble = this.checked;
        EDITOR.success(this.checked ? '插件已开启' : '插件已关闭');
    });

    // AI读表开关
    $('#table_read_switch').on('change', function () {
        USER.tableBaseSetting.isAiReadTable = this.checked;
    });

    // AI写表开关
    $('#table_edit_switch').on('change', function () {
        USER.tableBaseSetting.isAiWriteTable = this.checked;
    });

    // 表格消息模板 (使用防抖保存)
    let debounceTimer;
    $('#dataTable_message_template').on("input", function () {
        const value = $(this).val();
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
            USER.tableBaseSetting.message_template = value;
            USER.saveSettings(); // 保存设置
            EDITOR.success('消息模板已保存');
        }, 500); // 500ms延迟
    });

    // 保存按钮事件 (可以添加一个手动保存按钮)
    // $('#save_all_settings_button').on('click', () => {
    //     USER.saveSettings();
    //     EDITOR.success('所有设置已保存');
    // });
}

/**
 * 渲染设置到UI
 */
export function renderSetting() {
    // 填充文本框
    $('#dataTable_message_template').val(USER.tableBaseSetting.message_template);

    // 更新开关状态
    updateSwitch('#table_switch', USER.tableBaseSetting.isExtensionAble);
    updateSwitch('#table_read_switch', USER.tableBaseSetting.isAiReadTable);
    updateSwitch('#table_edit_switch', USER.tableBaseSetting.isAiWriteTable);

    console.log("[Ebbinghaus] Settings rendered to UI.");
}

/**
 * 加载设置 (入口函数)
 */
export function loadSettings() {
    // 确保基础设置对象存在
    if (USER.tableBaseSetting === undefined) {
        USER.getSettings().muyoo_dataTable = {};
    }

    // 检查并应用默认设置
    Object.keys(defaultSettings).forEach(key => {
        if (USER.tableBaseSetting[key] === undefined) {
            USER.tableBaseSetting[key] = defaultSettings[key];
        }
    });

    renderSetting();
    InitBinging();
}
