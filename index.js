// 注意：我们已经删除了顶部的 import 语句。
// SillyTavern 会自动提供 APP, SYSTEM, USER 等全局变量。

console.log("______________________艾宾浩斯词汇插件：开始加载______________________");

// 插件的全局状态，未来我们所有的数据都会存在这里
let pluginData = {
    // 控制台数据
    control: {
        current_day: 1,
        current_round: 1,
    },
    // 每日学习与晋级表
    vocabulary_mastery: {},
    // 单词列表档案库
    word_lists: {},
    // 艾宾浩斯计划表
    ebbinghaus_schedule: {},
};

// --- 核心功能函数 (当前为空壳) ---

/**
 * 根据 pluginData 的内容，渲染插件的用户界面
 */
function renderUI() {
    console.log("艾宾浩斯插件：正在渲染UI...");
    // 示例：更新界面上的天数显示
    $('#ebbinghaus-trainer-popup #current-day-display').text(pluginData.control.current_day);
}

/**
 * “开始今日学习”按钮的点击事件处理函数
 */
function startDay() {
    console.log("艾宾浩斯插件：开始第 " + pluginData.control.current_day + " 天的学习。");
    // 未来在这里添加逻辑
    alert("“开始学习”按钮被点击！功能待开发。");
}

/**
 * “结束并存档”按钮的点击事件处理函数
 */
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


/**
 * 监听AI的回复，并处理其中的指令标签
 * @param {number} chat_id AI回复消息的ID
 */
function onMessageRendered(chat_id) {
    // 检查 USER 和 getContext 是否存在
    if (typeof USER === 'undefined' || typeof USER.getContext !== 'function') {
        return;
    }

    const chat = USER.getContext().chat[chat_id];
    // 我们只关心AI的回复
    if (!chat || chat.is_user) return;

    console.log("艾宾浩斯插件：监听到AI回复。");
    // 未来在这里添加逻辑
}


// --- 插件初始化入口 ---

jQuery(async () => {
    // 1. 加载插件的HTML界面文件
    try {
        const html = await $.get('extensions/ebbinghaus/templates/ebbinghaus.html');
        $("#hottest_loras_popup").after(html); 
    } catch (error) {
        console.error("艾宾浩斯插件：加载 ebbinghaus.html 失败！请检查文件路径和内容。", error);
        return; // 加载失败则停止后续操作
    }

    // 2. 加载之前保存的学习数据
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

    // 3. 渲染初始界面
    renderUI();

    // 4. 绑定界面上的按钮事件
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
