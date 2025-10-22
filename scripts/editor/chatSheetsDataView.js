import { BASE, DERIVED, EDITOR, SYSTEM, USER } from '../../core/manager.js';
// ... 只保留需要的 import ...

// ... 删除所有 copy, paste, import, export, clear, cellEdit, cellHistory 等函数 ...

async function renderSheetsDOM(mesId = -1) {
    // ... (获取 piece 和 sheets 的逻辑保留) ...
    
    $(viewSheetsContainer).empty();
    
    // 简化版的渲染调用
    for (let [index, sheet] of sheets.entries()) {
        if (!sheet.enable) continue;
        
        const sheetContainer = document.createElement('div');
        const sheetTitleText = document.createElement('h3');
        sheetTitleText.innerText = `#${index} ${sheet.name}`;

        // 核心改造：调用 renderSheet 时，传入一个空的回调函数，让表格变成只读
        const sheetElement = await sheet.renderSheet((cell) => {
            // Do nothing, cells are not clickable.
            cell.element.style.cursor = 'default'; // 设置鼠标指针为默认样式
        });

        $(sheetContainer).append(sheetElement);
        $(viewSheetsContainer).append(sheetTitleText);
        $(viewSheetsContainer).append(sheetContainer);
        $(viewSheetsContainer).append(`<hr>`);
    }

    $("#table_indicator").text(DERIVED.any.isRenderLastest ? "当前为最新数据" : `正在查看第${deep}轮对话的数据`);
}

async function initTableView(mesId) {
    // ... (加载 manager.html 的逻辑保留) ...

    // 大幅简化的事件绑定
    // 点击前一个版本按钮
    $(document).on('click', '#table_prev_button', function () {
        // ... (保留版本切换逻辑) ...
    });

    // 点击后一个版本按钮
    $(document).on('click', '#table_next_button', function () {
        // ... (保留版本切换逻辑) ...
    });

    // ... (删除所有其他按钮的事件绑定) ...

    return initializedTableView;
}

// ... (保留 refreshContextView 和 getChatSheetsView 函数，它们是外部入口) ...
