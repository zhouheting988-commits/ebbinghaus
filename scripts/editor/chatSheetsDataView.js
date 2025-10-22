// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM - SAFE SIMPLIFIED VERSION
import { BASE, DERIVED, EDITOR, SYSTEM } from '../../core/manager.js';

let viewSheetsContainer = null;
let initializedTableView = null;

/**
 * 核心渲染函数：将表格数据显示为只读视图。
 * @param {number} mesId - 要渲染的消息ID，-1表示最新。
 */
async function renderSheetsDOM(mesId = -1) {
    // 获取要渲染的 piece 和 sheets 数据
    const { deep: lastestDeep, piece: lastestPiece } = BASE.getLastSheetsPiece();
    const { piece, deep } = mesId === -1 ? { piece: lastestPiece, deep: lastestDeep } : { piece: USER.getContext().chat[mesId], deep: mesId };

    // 如果没有数据，则不执行任何操作
    if (!piece || !piece.hash_sheets) {
        if (viewSheetsContainer) $(viewSheetsContainer).empty().append('<p>当前没有可显示的表格数据。</p>');
        $("#table_indicator").text("无数据");
        return;
    };

    // 更新状态
    DERIVED.any.isRenderLastest = (deep === lastestDeep);
    DERIVED.any.renderDeep = deep;

    const sheets = BASE.hashSheetsToSheets(piece.hash_sheets);
    DERIVED.any.renderingSheets = sheets;

    // 清空容器
    if (viewSheetsContainer) $(viewSheetsContainer).empty();
    
    // 遍历并渲染每一个启用的表格
    for (let [index, sheet] of sheets.entries()) {
        if (!sheet.enable) continue;
        
        const sheetContainer = document.createElement('div');
        const sheetTitleText = document.createElement('h3');
        sheetTitleText.innerText = `#${index} ${sheet.name}`;

        // 核心改造：调用 renderSheet 时，传入一个空的回调函数，让表格变成只读
        const sheetElement = await sheet.renderSheet((cell) => {
            // 设置鼠标指针为默认样式，表示不可交互
            cell.element.style.cursor = 'default';
        });

        $(sheetContainer).append(sheetElement);
        $(viewSheetsContainer).append(sheetTitleText);
        $(viewSheetsContainer).append(sheetContainer);
        $(viewSheetsContainer).append(`<hr>`);
    }

    // 更新版本指示器文本
    $("#table_indicator").text(DERIVED.any.isRenderLastest ? "当前为最新数据" : `正在查看历史数据 (第${deep}轮)`);
}

/**
 * 初始化“数据”标签页的视图和事件监听器。
 * 这个函数只会在第一次打开“数据”页时执行一次。
 */
async function initTableView() {
    // 加载HTML模板
    initializedTableView = $(await SYSTEM.getTemplate('manager')).get(0);
    viewSheetsContainer = initializedTableView.querySelector('#tableContainer');

    // 只绑定我们需要的事件：版本切换
    // 点击前一个版本按钮
    $(document).on('click', '#table_prev_button', function () {
        const deep = DERIVED.any.renderDeep;
        // 注意：原版插件的getLastSheetsPiece函数我们已在manager.js中简化，这里直接使用
        const { deep: prevDeep } = BASE.getLastSheetsPiece(deep - 1, 20, false);
        if (prevDeep === -1) {
            EDITOR.info("没有更早的表格数据了。");
            return;
        }
        refreshContextView(prevDeep);
    });

    // 点击后一个版本按钮
    $(document).on('click', '#table_next_button', function () {
        const deep = DERIVED.any.renderDeep;
        const { deep: nextDeep } = BASE.getLastSheetsPiece(deep + 1, 20, false, "down");
        if (nextDeep === -1) {
            EDITOR.info("没有更新的表格数据了。");
            return;
        }
        refreshContextView(nextDeep);
    });

    return initializedTableView;
}

/**
 * 刷新视图的公共入口函数。
 * @param {number} mesId - 要渲染的消息ID，-1表示最新。
 */
export async function refreshContextView(mesId = -1) {
    // 防止重复刷新
    if (BASE.contextViewRefreshing) return;
    BASE.contextViewRefreshing = true;

    try {
        await renderSheetsDOM(mesId);
    } catch (error) {
        console.error("Error refreshing context view:", error);
        EDITOR.error("刷新表格视图时出错", error.message);
    } finally {
        BASE.contextViewRefreshing = false;
    }
}

/**
 * 获取“数据”标签页视图的外部入口函数。
 */
export async function getChatSheetsView(mesId = -1) {
    if (initializedTableView) {
        // 如果视图已初始化，只需刷新内容
        await refreshContextView(mesId);
        return initializedTableView;
    }
    // 否则，先初始化视图，然后刷新内容
    const view = await initTableView();
    await refreshContextView(mesId);
    return view;
}
