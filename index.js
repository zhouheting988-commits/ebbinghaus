// 最终的图标显示代码
(function () {

    console.log(">>>>>> 艾宾浩斯图标创建脚本已执行！<<<<<<");

    // 1. 创建一个将显示在顶部菜单栏的按钮元素
    const iconButton = document.createElement('div');
    iconButton.id = `ebbinghaus-icon-button`;
    iconButton.className = 'custom-icon'; // 使用酒馆的通用图标样式
    
    // 使用一个醒目的Font Awesome图标（火焰🔥），并添加鼠标悬停提示。
    iconButton.innerHTML = '<i class="fa-solid fa-fire" style="color: #ff6347;" title="艾宾浩斯插件入口"></i>';

    // 2. 定义按钮的点击行为：点击后弹出一个提示框
    iconButton.onclick = () => {
        alert("图标入口点击成功！");
    };

    // 3. 使用官方API将你的按钮注册到SillyTavern的UI中
    SillyTavern.registerExtension({
        name: "UltimateTest", // 这里的name要和manifest.json里的一致
        target: 'right-icons', // 目标位置：右上角图标栏
        element: iconButton,
    });

})();
