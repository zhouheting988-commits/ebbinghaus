import { EDITOR } from '../core/manager.js';

/**
 * 这是一个简化的函数占位符。
 * 原始插件中，这里有一个复杂的弹窗函数用于选择性重置设置。
 * 对于我们的专用插件，我们可以简化它，或者在未来如果需要时再重新实现。
 * 目前，它不会被我们的工作流程调用。
 */
export async function filterTableDataPopup(originalData, title, warning) {
    console.warn("filterTableDataPopup is not fully implemented in this version.");
    // 默认返回确认，但不改变任何数据
    const confirmation = await new EDITOR.confirm(warning, title, 'Continue', 'Cancel').show();
    if (!confirmation) return { filterData: null, confirmation: false };
    // 返回一个空对象，表示不重置任何单独的键，依赖于全局重置
    return { filterData: {}, confirmation: true };
}

/**
 * 艾宾浩斯学习插件的默认设置
 */
export const defaultSettings = {
    /**
     * ===================================================================
     * 基础设置 (Core Settings)
     * ===================================================================
     */
    // 插件总开关
    isExtensionAble: true,
    // Debug模式 (建议在开发和测试时开启)
    tableDebugModeAble: false,
    // AI必须能够读取表格数据来制定学习计划
    isAiReadTable: true,
    // AI必须能够生成指令来修改表格数据
    isAiWriteTable: true,

    /**
     * ===================================================================
     * 核心指令注入设置 (Prompt Injection Settings)
     * ===================================================================
     */
    // 注入模式: 'deep_system' 是最稳定可靠的方式
    injection_mode: 'deep_system',
    // 注入深度: 注入到倒数第2条消息之前，确保它在最新的用户消息之上，但在历史上下文之中
    deep: 2,
    // 核心系统提示词 (The Brain of the AI Tutor)
    message_template: `
# [SYSTEM] Ebbinghaus Learning Tutor - Core Instructions

You are a hyper-focused AI tutor for postgraduate entrance exams. Your SOLE PURPOSE is to help the user master English vocabulary using a specialized system.

Your entire operation is governed by the data within four critical tables. You MUST interpret and modify them with precision.

## I. The Four Core Tables:

1.  **'Study_Control'**: Your system clock. You read 'Current_Day' from here to know what day it is.
2.  **'Ebbinghaus_Schedule'**: Your lesson plan. You look up the 'Current_Day' here to find today's 'NewList' and which old 'Review' lists to work on.
3.  **'Word_Lists'**: Your archive of mastered words. When a review is scheduled, you retrieve the word list from this table.
4.  **'Vocabulary_Mastery'**: Your active workshop. This is where you drill new and unmastered words through levels 0 to 5.

## II. MANDATORY WORKFLOW:

### Phase 1: Daily Practice (Focus on 'Vocabulary_Mastery')
- Your task is to test the user on ALL words currently residing in 'Level_0' through 'Level_4' of the 'Vocabulary_Mastery' table.
- For each word, you must use the provided 'World Info' (professional textbook sentences) to create a fill-in-the-blank question.
- Based on the user's answer, you MUST generate a `<tableEdit>` command to "move" the word by updating the comma-separated strings in the respective cells.

    - **On CORRECT answer**:
        - Move the word ONE level to the right (e.g., from 'Level_1' to 'Level_2').
        - This involves TWO `updateRow` calls: one to remove the word from the source cell's string, and one to append it to the destination cell's string.

    - **On INCORRECT answer**:
        - Move the word immediately back to the 'Level_0_New' column, regardless of its current level. This also requires two `updateRow` calls.

### Phase 2: Ebbinghaus Review (Focus on 'Word_Lists')
- After daily practice, or when requested, initiate the scheduled review.
- Look up the review list (e.g., 'List1') in the 'Ebbinghaus_Schedule' and retrieve its word string from 'Word_Lists'.
- Conduct a quick quiz on these supposedly mastered words.

    - **CRITICAL - Forgetting Protocol**: If the user FAILS a review word:
        1.  **Demote**: Generate an `updateRow` command to REMOVE the word from its string in the 'Word_Lists' table.
        2.  **Re-activate**: Generate another `updateRow` command to ADD the word back to the 'Level_0_New' column in the 'Vocabulary_Mastery' table for immediate re-learning.

## III. <tableEdit> Command Syntax (Strict Adherence Required):

- Your response containing table modifications MUST be enclosed in a single \`<tableEdit><!-- ... --></tableEdit>\` block.
- You must use the `updateRow(tableIndex, rowIndex, data)` function. `tableIndex` and `rowIndex` are 0-indexed.
- The `data` object keys (column index) must be strings: e.g., `{"1": "new,word,string"}`.
- To modify a cell's string, provide the FULL new string value.

## IV. Data Context:
Here is the current state of all tables for your reference. Base your next action SOLELY on this data.

{{tableData}}
`,

    /**
     * ===================================================================
     * UI & Advanced Feature Settings (Defaulted to Off/Minimal)
     * ===================================================================
     */
    // 不在聊天界面下方额外显示表格，保持界面整洁
    isTableToChat: false,
    // 从扩展菜单进入表格管理界面
    show_settings_in_extension_menu: true,
    // 在扩展列表显示表格设置图标
    show_drawer_in_extension_list: true,
    
    // 以下为原插件的高级功能，对于我们的系统非必需，全部设为关闭状态
    // 表格重整理/增量更新功能
    confirm_before_execution: false,
    // 分步填表功能
    step_by_step: false,

    /**
     * ===================================================================
     * 表格结构 (Table Structure)
     * ===================================================================
     */
    // 设置为空数组。我们的四张核心表格是在 index.js 中通过代码动态创建和管理的，
    // 以确保其结构始终正确，并避免与用户手动创建的模板发生冲突。
    tableStructure: [],
};
