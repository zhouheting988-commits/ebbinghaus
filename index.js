// index.js - v0.3 - 终极加载时序安全版

console.log("______________________艾宾浩斯词汇插件：开始加载______________________");

let pluginData = {
    control: { current_day: 1, current_round: 1 },
    vocabulary_mastery: {},
    word_lists: {},
    ebbinghaus_schedule: {},
};

function renderUI() {
    console.log("艾宾浩斯插件：正在渲染UI...");
    $('#ebbinghaus-trainer-popup #current-day-display').text(pluginData.control.current_day);
}

function startDay() {
    console.log("艾宾浩斯插件：开始第 " + pluginData.control.current_day + " 天的学习。");
    alert("“开始学习”按钮被点击！功能待开发。");
}

function saveData() {
    try {
        localStorage.setItem('ebbinghaus_plugin_data', JSON.stringify(pluginData));
        console.log("艾宾浩斯插件：学习进度已保存至浏览器缓存。");
        alert("进度已保存！");
    } catch (error) {
        console.error("艾宾浩斯插件：保存数据失败！", error);
        alert("保存失败，请查看F12控制台错误信息。");
    }
}

function onMessageRendered(chat_id) {
    if (typeof USER === 'undefined' || typeof USER.getContext !== 'function') return;
    const chat = USER.getContext().chat[chat_id];
    if (!chat || chat.is_user) return;
    console.log("艾宾浩斯插件：监听到AI回复。");
}


// ================== 【核心修改点：小侦探函数】 ==================
/**
 * 等待指定元素出现，然后执行操作
 * @param {string} selector - 要等待的jQuery选择器
 * @param {function} callback - 元素出现后要执行的函数
 * @param {number} maxAttempts - 最大尝试次数
 * @param {number} intervalTime - 每次尝试的间隔时间 (毫秒)
 */
function waitForElement(selector, callback, maxAttempts = 20, intervalTime = 200) {
    let attempts = 0;
    const interval = setInterval(() => {
        const element = $(selector);
        if (element.length > 0) {
            clearInterval(interval);
            callback(element);
        } else {
            attempts++;
            if (attempts >= maxAttempts) {
                clearInterval(interval);
                console.error(`艾宾浩斯插件：等待超时！未能找到元素: ${selector}`);
            }
        }
    }, intervalTime);
}
// =============================================================


// --- 插件初始化入口 ---
jQuery(async () => {
    try {
        const html = await $.get('extensions/ebbinghaus/templates/ebbinghaus.html');
        $("#character_edit_panel").after(html);
    } catch (error) {
        console.error("艾宾浩斯插件：加载 ebbinghaus.html 失败！", error);
        return;
    }

    const savedData = localStorage.getItem('ebbinghaus_plugin_data');
    if (savedData) {
        try {
            pluginData = JSON.parse(savedData);
            console.log("艾宾浩斯插件：从浏览器缓存中恢复了学习进度。");
        } catch(e) {
            console.error("艾宾浩斯插件：解析缓存数据失败！", e);
        }
    } else {
        console.log("艾宾浩斯插件：未找到缓存数据，使用初始设置。");
    }

    renderUI();

    $(document).on('click', '#ebbinghaus-start-btn', startDay);
    $(document).on('click', '#ebbinghaus-save-btn', saveData);
    $(document).on('click', '#open-ebbinghaus-trainer', () => $('#ebbinghaus-trainer-popup').toggle());
    $(document).on('click', '#ebbinghaus-trainer-popup .popup-close-button', () => $('#ebbinghaus-trainer-popup').hide());
    
    // ================== 【核心修改点：使用小侦探】 ==================
    // 我们不再直接添加按钮，而是让“小侦探”去完成任务
    waitForElement("#extensions_button", (extensionsButton) => {
        console.log("艾宾浩斯插件：成功找到 #extensions_button，正在注入按钮...");
        const openButton = $('<div id="open-ebbinghaus-trainer" class="menu_button" title="艾宾浩斯词汇导师"><span class="fa-solid fa-brain"></span></div>');
        extensionsButton.after(openButton);
    });
    // =============================================================

    if (typeof APP !== 'undefined' && APP.eventSource) {
         APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    } else {
        console.error("艾宾浩斯插件：无法监听消息，APP.eventSource 未定义！");
    }
   
    console.log("______________________艾宾浩斯词汇插件：加载完成______________________");
});});    // 2. 加载之前保存的学习数据
    // 我们从LocalStorage加载，而不是文件，因为写文件权限受限
    const savedData = localStorage.getItem('ebbinghaus_plugin_data');
    if (savedData) {
        pluginData = JSON.parse(savedData);
        console.log("艾宾浩斯插件：从浏览器缓存中恢复了学习进度。");
    } else {
        console.log("艾宾浩斯插件：未找到缓存数据，使用初始设置。");
    }


    // 3. 渲染初始界面
    renderUI();

    // 4. 绑定界面上的按钮事件
    // 我们约定HTML中有一个id为 'ebbinghaus-start-btn' 的按钮
    $(document).on('click', '#ebbinghaus-start-btn', startDay);
    // 更多按钮...

    // 5. 注册对SillyTavern核心事件的监听
    APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);

    console.log("______________________艾宾浩斯词汇插件：加载完成______________________");
});
