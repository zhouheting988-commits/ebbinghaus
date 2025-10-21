// index.js - v0.2 - 移动端UI适配版

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

// --- 插件初始化入口 ---
jQuery(async () => {
    try {
        const html = await $.get('extensions/ebbinghaus/templates/ebbinghaus.html');
        $("#character_edit_panel").after(html); // 换个更稳妥的注入点
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

    // ================== 【核心修改点】 ==================
    // 1. 创建一个新的按钮，并给它加上酒馆的通用样式 `menu_button`
    const openButton = $('<div id="open-ebbinghaus-trainer" class="menu_button" title="艾宾浩斯词汇导师"><span class="fa-solid fa-brain"></span></div>');
    
    // 2. 将按钮插入到顶部扩展菜单按钮的后面，这是最稳妥的位置
    $("#extensions_button").after(openButton);
    // ================================================

    $(document).on('click', '#open-ebbinghaus-trainer', () => $('#ebbinghaus-trainer-popup').toggle());
    $(document).on('click', '#ebbinghaus-trainer-popup .popup-close-button', () => $('#ebbinghaus-trainer-popup').hide());
    
    if (typeof APP !== 'undefined' && APP.eventSource) {
         APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    } else {
        console.error("艾宾浩斯插件：无法监听消息，APP.eventSource 未定义！");
    }
   
    console.log("______________________艾宾浩斯词汇插件：加载完成______________________");
});    // 4. 绑定界面上的按钮事件
    $(document).on('click', '#ebbinghaus-start-btn', startDay);
    $(document).on('click', '#ebbinghaus-save-btn', saveData);

    // 5. 添加一个按钮来打开和关闭我们的插件窗口
    $('body').append('<button id="open-ebbinghaus-trainer" class="menu-button">艾宾浩斯</button>');
    $(document).on('click', '#open-ebbinghaus-trainer', () => $('#ebbinghaus-trainer-popup').toggle());
    $(document).on('click', '#ebbinghaus-trainer-popup .popup-close-button', () => $('#ebbinghaus-trainer-popup').hide());
    
    // 6. 注册对SillyTavern核心事件的监听
    // 确保 APP 和 eventSource 存在
    if (typeof APP !== 'undefined' && APP.eventSource) {
         APP.eventSource.on(APP.event_types.CHARACTER_MESSAGE_RENDERED, onMessageRendered);
    } else {
        console.error("艾宾浩斯插件：无法监听消息，APP.eventSource 未定义！");
    }
   
    console.log("______________________艾宾浩斯词汇插件：加载完成______________________");
});    // 2. 加载之前保存的学习数据
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
