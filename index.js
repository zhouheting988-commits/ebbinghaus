// /ebbinghaus/index.js - ABSOLUTE MINIMAL TEST VERSION

// 使用IIFE（立即调用函数表达式）来确保代码在独立作用域中运行，这是官方推荐的最佳实践。
(function () {

    // 打印一条消息到浏览器的F12控制台，证明这个文件至少被执行了。
    console.log(">>>>>> 艾宾浩斯插件最小化测试脚本已执行！<<<<<<");

    // 1. 创建一个将显示在顶部菜单栏的按钮元素
    const testButton = document.createElement('div');
    testButton.id = `ebbinghaus-test-button`;
    testButton.className = 'custom-icon'; // 使用酒馆的通用图标样式
    
    // 使用一个非常醒目的Font Awesome图标（一个火焰🔥），并添加鼠标悬停提示。
    testButton.innerHTML = '<i class="fa-solid fa-fire" style="color: #ff6347;" title="测试成功！艾宾浩斯入口"></i>';

    // 2. 定义按钮的点击行为：点击后弹出一个提示框
    testButton.onclick = () => {
        alert("图标显示成功！接下来请恢复你的正式代码。");
    };

    // 3. 使用官方API将你的按钮注册到SillyTavern的UI中
    // 这是让图标出现的唯一正确方式。
    SillyTavern.registerExtension({
        name: "EbbinghausFinalTest",
        target: 'right-icons', // 'right-icons' 就是右上角的那一排图标
        element: testButton,
    });

})();
