// Ebbinghaus Trainer - toolbar icon -> open panel
// 目标：像 Amily2 那样，等主界面加载好，再插入图标和面板，并绑定点击。
// 没有悬浮球，没有输入框指令，只有顶部学位帽图标可以打开面板。

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const ICON_ID = 'ebbinghaus_trainer_toolbar_icon';
    const PANEL_ID = 'ebbinghaus_trainer_panel';
    const ICON_CLASS = 'fa-graduation-cap'; // 可改成 fa-book / fa-book-open / fa-brain

    // =====================
    // 生成并注入“学习控制面板”的 DOM（默认隐藏）
    // =====================
    function ensurePanelExists() {
        if (document.getElementById(PANEL_ID)) return;

        const panel = document.createElement('div');
        panel.id = PANEL_ID;

        // 基础样式（跟我们之前白色面板一致，只是默认隐藏）
        panel.style.position = 'fixed';
        panel.style.right = '16px';
        panel.style.bottom = '72px';
        panel.style.zIndex = '2147483647';
        panel.style.width = '340px';
        panel.style.maxHeight = '60vh';
        panel.style.overflow = 'auto';
        panel.style.background = '#fff';
        panel.style.border = '1px solid #ccc';
        panel.style.borderRadius = '12px';
        panel.style.boxShadow = '0 6px 18px rgba(0,0,0,.25)';
        panel.style.padding = '12px';
        panel.style.fontSize = '14px';
        panel.style.lineHeight = '1.4';
        panel.style.color = '#333';
        panel.style.display = 'none'; // 默认不显示

        panel.innerHTML = ''
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">'
            + '  <strong style="font-size:14px;">艾宾浩斯词汇导师</strong>'
            + '  <button id="ebbinghaus_close_btn"'
            + '    style="border:0;background:#eee;padding:4px 8px;border-radius:8px;cursor:pointer;font-size:12px;">关闭</button>'
            + '</div>'

            + '<div style="font-size:13px;color:#666;line-height:1.5;margin-bottom:10px;">'
            + '  ·「开始学习」：把你这次给的一批单词放进今天的词库（Level_0_New），并开始三轮提问（词→短语→句子，内容来自世界书）<br/>'
            + '  ·「复习」：按艾宾浩斯计划表抽查旧 List，错的单词降级回每日循环<br/>'
            + '  ·「结束今天」：把今日掌握的词打包成新 List，推进当前天数（Study_Control.Current_Day+1）<br/>'
            + '</div>'

            + '<div style="display:flex;gap:8px;flex-wrap:wrap;">'
            + '  <button id="ebbinghaus_btn_start"'
            + '    style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">开始学习</button>'
            + '  <button id="ebbinghaus_btn_review"'
            + '    style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">复习</button>'
            + '  <button id="ebbinghaus_btn_end"'
            + '    style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">结束今天</button>'
            + '</div>';

        document.body.appendChild(panel);

        // 关闭按钮：只是隐藏
        const closeBtn = document.getElementById('ebbinghaus_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                hidePanel();
            }, true);
        }

        // 三个主功能按钮（现在只是占位 alert，将来我们把真的逻辑塞进来）
        const btnStart = document.getElementById('ebbinghaus_btn_start');
        const btnReview = document.getElementById('ebbinghaus_btn_review');
        const btnEnd = document.getElementById('ebbinghaus_btn_end');

        if (btnStart) {
            btnStart.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                alert('[开始学习] 占位：后续会把这批新词写进 Vocabulary_Mastery.DayX.Level_0_New');
            }, true);
        }

        if (btnReview) {
            btnReview.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                alert('[复习] 占位：后续会根据 Ebbinghaus_Schedule[Current_Day] 抽查旧 List');
            }, true);
        }

        if (btnEnd) {
            btnEnd.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                alert('[结束今天] 占位：后续会把 Level_5_Today 打包成新 List 并 Current_Day+1');
            }, true);
        }
    }

    function showPanel() {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.style.display = 'block';
    }
    function hidePanel() {
        const panel = document.getElementById(PANEL_ID);
        if (panel) panel.style.display = 'none';
    }
    function togglePanel() {
        const panel = document.getElementById(PANEL_ID);
        if (!panel) return;
        panel.style.display = (panel.style.display === 'none' || panel.style.display === '') ? 'block' : 'none';
    }

    // =====================
    // 把学位帽图标插入到顶部工具栏（和原生按钮同风格）
    // =====================
    function ensureToolbarIconExists(anchorEl) {
        // anchorEl 是我们参考的现有按钮，比如扩展按钮、设置按钮
        if (!anchorEl || !anchorEl.parentElement) return null;

        // 如果已经存在我们的图标，就直接返回
        let iconBtn = document.getElementById(ICON_ID);
        if (iconBtn) return iconBtn;

        // 创建新按钮
        iconBtn = document.createElement('div');
        iconBtn.id = ICON_ID;
        iconBtn.className = 'menu_button'; // 关键：使用 SillyTavern 自己的样式
        iconBtn.title = '艾宾浩斯词汇导师';
        iconBtn.setAttribute('role', 'button');
        iconBtn.setAttribute('tabindex', '0');
        iconBtn.style.userSelect = 'none';

        // 只放图标，不放文字，保持和其他图标一致
        iconBtn.innerHTML = '<i class="fa-solid ' + ICON_CLASS + '"></i>';

        // 把它插到锚点后面（跟 Amily2 的做法类似）
        anchorEl.parentElement.insertBefore(iconBtn, anchorEl.nextSibling);

        return iconBtn;
    }

    // =====================
    // 给图标绑点击，点击后 toggle 面板
    // =====================
    function bindToolbarIconClick(iconBtn) {
        if (!iconBtn) return;

        // 避免重复绑定，先移除旧的
        iconBtn.onclick = null;
        iconBtn.ontouchend = null;
        iconBtn.onpointerup = null;
        iconBtn.onmousedown = null;
        iconBtn.onkeyup = null;

        // 统一的 handler
        const handler = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            togglePanel();
            return false;
        };

        // 多通道支持（手机端点按 / 电脑点击 / 键盘）
        iconBtn.addEventListener('click', handler, true);
        iconBtn.addEventListener('touchend', handler, true);
        iconBtn.addEventListener('pointerup', handler, true);
        iconBtn.addEventListener('mousedown', handler, true);
        iconBtn.addEventListener('keyup', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
                handler(ev);
            }
        }, true);
    }

    // =====================
    // 主初始化逻辑（仿 Amily2 的风格）
    // 我们等 SillyTavern 界面真的渲染出来，再插入图标 & 面板
    // =====================
    function initEbbinghausTrainer() {
        console.log(`[${EXT_NAME}] initEbbinghausTrainer() start`);

        // 1. 确保面板在DOM里
        ensurePanelExists();

        // 2. 找一个已知一定存在的顶栏按钮作为锚点
        //    Amily2 用的是 #sys-settings-button
        //    我们也试一下它 + 扩展按钮这两个常见点
        const anchor =
            document.getElementById('sys-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.getElementById('extensions-settings-button') ||
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('.extensions-settings-button');

        if (!anchor) {
            console.warn(`[${EXT_NAME}] 顶栏锚点还没出现，稍后再试`);
            return false;
        }

        // 3. 确保学位帽图标存在
        const iconBtn = ensureToolbarIconExists(anchor);

        if (!iconBtn) {
            console.warn(`[${EXT_NAME}] 无法插入学位帽图标，稍后再试`);
            return false;
        }

        // 4. 给图标绑点击 -> toggle 面板
        bindToolbarIconClick(iconBtn);

        console.log(`[${EXT_NAME}] UI ready: icon injected and bound, panel injected`);
        return true;
    }

    // =====================
    // 延迟/轮询启动（核心）
    // 和 Amily2 的思路一样，我们不是马上跑，而是反复等到 ST UI 渲染完成
    // =====================
    function delayedBoot() {
        let attempts = 0;
        const maxAttempts = 100;     // 最多等 100 次
        const intervalMs = 200;      // 每次间隔 200ms

        const timer = setInterval(function () {
            attempts++;

            // 如果已经有面板和按钮并且按钮有监听，那就说明完成了，直接停
            const alreadyReady =
                document.getElementById(PANEL_ID) &&
                document.getElementById(ICON_ID);

            const ok = initEbbinghausTrainer();
            if (ok || (alreadyReady && attempts > 3)) {
                clearInterval(timer);
                console.log(`[${EXT_NAME}] boot complete after ${attempts} tries`);
            }

            if (attempts >= maxAttempts) {
                clearInterval(timer);
                console.error(`[${EXT_NAME}] boot timeout: still no toolbar anchor after ${maxAttempts} tries`);
            }
        }, intervalMs);
    }

    // =====================
    // 启动监听
    // =====================
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        delayedBoot();
    } else {
        document.addEventListener('DOMContentLoaded', delayedBoot);
    }
})();
