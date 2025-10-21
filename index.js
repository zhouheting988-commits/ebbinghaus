// 导入SillyTavern提供的核心API对象
import { APP, SYSTEM, USER } from './core/manager.js';

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

const DATA_FILE_PATH = 'extensions/ebbinghaus/ebbinghaus_data.json';

// --- 核心功能函数 (当前为空壳) ---

/**
 * 从文件加载数据到 pluginData
 */
async function loadData() {
    try {
        const response = await fetch(DATA_FILE_PATH);
        if (response.ok) {
            pluginData = await response.json();
            console.log("艾宾浩斯插件：成功加载学习数据。");
        } else {
            console.log("艾宾浩斯插件：未找到数据文件，将使用初始数据。");
            // 可在此处初始化默认的艾宾浩斯表格
        }
    } catch (error) {
        console.error("艾宾浩斯插件：加载数据失败！", error);
    }
}

/**
 * 将 pluginData 保存到文件
 */
async function saveData() {
    // SillyTavern的安全策略不允许插件直接写文件。
    // 我们将数据保存在浏览器本地存储(LocalStorage)中。
    try {
        localStorage.setItem('ebbinghaus_plugin_data', JSON.stringify(pluginData));
        console.log("艾宾浩斯插件：学习进度已保存至浏览器缓存。");
    } catch (error) {
        console.error("艾宾浩斯插件：保存数据失败！", error);
    }
}

/**
 * 根据 pluginData 的内容，渲染插件的用户界面
 */
function renderUI() {
    console.log("艾宾浩斯插件：正在渲染UI...");
    // 未来在这里添加代码来更新HTML界面上的表格和数据显示
    // 例如：$('#current-day-display').text(pluginData.control.current_day);
}

/**
 * “开始今日学习”按钮的点击事件处理函数
 */
function startDay() {
    console.log("艾宾浩斯插件：开始第 " + pluginData.control.current_day + " 天的学习。");
    // 未来在这里添加逻辑：
    // 1. 根据艾宾浩斯计划表，确定今天要学习和复习的Lists。
    // 2. 生成系统提示(System Note)并注入到聊天中。
    // 3. 提示用户输入新单词。
}

/**
 * 监听AI的回复，并处理其中的指令标签
 * @param {number} chat_id AI回复消息的ID
 */
function onMessageRendered(chat_id) {
    const chat = USER.getContext().chat[chat_id];
    // 我们只关心AI的回复
    if (chat.is_user) return;

    console.log("艾宾浩斯插件：监听到AI回复。");
    // 未来在这里添加逻辑：
    // 1. 用正则表达式搜索 chat.mes 中是否有【CORRECT:word】或【WRONG:word】。
    // 2. 如果找到，就更新 pluginData 中的数据。
    // 3. 调用 renderUI() 刷新界面。
    // 4. 调用 saveData() 保存进度。
}


// --- 插件初始化入口 ---

jQuery(async () => {
    // 1. 加载插件的HTML界面文件
    // 我们约定HTML文件名为 ebbinghaus.html，放在 templates/ 目录下
    const html = await $.get('extensions/ebbinghaus/templates/ebbinghaus.html');
    $("#hottest_loras_popup").after(html); // 将界面插入到酒馆的某个元素后面

    // 2. 加载之前保存的学习数据
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
