// Ebbinghaus Trainer - persistent toolbar binding + full overlay panel
// 目标：像 Amily2 一样，点击顶部学位帽 → 弹出一个深色大面板。
// 没有悬浮球，没有命令行触发。只有那个图标。

(function () {
    const EXT_NAME = 'EbbinghausTrainer';
    const ICON_ID = 'ebbinghaus_trainer_toolbar_icon';
    const OVERLAY_ID = 'ebbinghaus_trainer_overlay';
    const CARD_ID = 'ebbinghaus_trainer_card';
    const ICON_CLASS = 'fa-graduation-cap'; // 也可以换成 'fa-book' / 'fa-book-open' / 'fa-brain'

    // ========= 工具函数 =========

    function showOverlay() {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) {
            ov.style.display = 'flex';
        }
    }

    function hideOverlay() {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) {
            ov.style.display = 'none';
        }
    }

    function toggleOverlay() {
        const ov = document.getElementById(OVERLAY_ID);
        if (!ov) return;
        if (ov.style.display === 'none' || ov.style.display === '') {
            ov.style.display = 'flex';
        } else {
            ov.style.display = 'none';
        }
    }

    // ========= 创建/确保 面板(遮罩+卡片) =========
    function ensureOverlayPanel() {
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        // 整个全屏半透明遮罩层
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;

        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '2147483647';
        overlay.style.background = 'rgba(0,0,0,0.4)'; // 半透明背景
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.webkitBackdropFilter = 'blur(4px)';
        overlay.style.display = 'none'; // 默认隐藏
        overlay.style.alignItems = 'center'; // flex 居中
        overlay.style.justifyContent = 'center';

        // 内部深色卡片（核心面板）
        const card = document.createElement('div');
        card.id = CARD_ID;
        card.style.background = '#1a1a1a';
        card.style.color = '#fff';
        card.style.borderRadius = '12px';
        card.style.boxShadow = '0 10px 30px rgba(0,0,0,0.6)';
        card.style.width = '90%';
        card.style.maxWidth = '420px';
        card.style.maxHeight = '80vh';
        card.style.overflowY = 'auto';
        card.style.padding = '16px';
        card.style.fontSize = '14px';
        card.style.lineHeight = '1.5';
        card.style.border = '1px solid rgba(255,255,255,0.15)';

        // 卡片内容：标题栏 + 简介 + 三个主按钮
        // 注意：之后我们会在这三个按钮上接真正的功能（学习 / 复习 / 结束今天）
        card.innerHTML = ''
            + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
            + '  <div style="font-size:16px;font-weight:bold;display:flex;align-items:center;gap:8px;">'
            + '    <i class="fa-solid ' + ICON_CLASS + '" style="color:#fff;"></i>'
            + '    <span>艾宾浩斯词汇导师</span>'
            + '  </div>'
            + '  <button id="ebbinghaus_close_btn"'
            + '    style="background:rgba(255,255,255,0.1);color:#fff;border:1px solid rgba(255,255,255,0.3);'
            + '           border-radius:8px;font-size:12px;padding:4px 8px;cursor:pointer;">关闭</button>'
            + '</div>'

            + '<div style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.12);'
            + '            border-radius:8px;padding:10px 12px;margin-bottom:16px;font-size:13px;color:#ccc;line-height:1.5;">'
            + '  <div style="font-weight:bold;color:#fff;margin-bottom:6px;">学习流程说明</div>'
            + '  <div>1. <b>开始学习</b>：把你这批新词放进今天的词库（Level_0_New），并用这些词从“单词→短语→句子”来提问，句子里的学科内容只允许来自世界书，帮你双线记忆。</div>'
            + '  <div style="margin-top:6px;">2. <b>复习</b>：按艾宾浩斯计划表调度旧 List 的词做抽查，答错的词会被降级回每日循环。</div>'
            + '  <div style="margin-top:6px;">3. <b>结束今天</b>：把今天已经进到 Level_5 的词打包成一个新 List（进入长期复习库），然后把当前学习天数 +1。</div>'
            + '</div>'

            + '<div style="display:flex;flex-direction:column;gap:10px;">'
            + '  <button id="ebbinghaus_btn_start"'
            + '    style="width:100%;text-align:left;'
            + '           background:rgba(46,204,113,0.15);'
            + '           border:1px solid rgba(46,204,113,0.4);'
            + '           color:#aef7c9;'
            + '           border-radius:10px;'
            + '           padding:10px 12px;'
            + '           font-size:14px;'
            + '           line-height:1.4;'
            + '           cursor:pointer;">'
            + '    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">开始学习</div>'
            + '    <div style="font-size:13px;color:#aef7c9;">导入这一批新词并开始三轮提问（词→短语→句子）</div>'
            + '  </button>'

            + '  <button id="ebbinghaus_btn_review"'
            + '    style="width:100%;text-align:left;'
            + '           background:rgba(52,152,219,0.15);'
            + '           border:1px solid rgba(52,152,219,0.4);'
            + '           color:#bfe4ff;'
            + '           border-radius:10px;'
            + '           padding:10px 12px;'
            + '           font-size:14px;'
            + '           line-height:1.4;'
            + '           cursor:pointer;">'
            + '    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">复习</div>'
            + '    <div style="font-size:13px;color:#bfe4ff;">按艾宾浩斯计划抽查旧列表，错词会被降级回每日循环</div>'
            + '  </button>'

            + '  <button id="ebbinghaus_btn_end"'
            + '    style="width:100%;text-align:left;'
            + '           background:rgba(241,196,15,0.15);'
            + '           border:1px solid rgba(241,196,15,0.4);'
            + '           color:#ffef9a;'
            + '           border-radius:10px;'
            + '           padding:10px 12px;'
            + '           font-size:14px;'
            + '           line-height:1.4;'
            + '           cursor:pointer;">'
            + '    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">结束今天</div>'
            + '    <div style="font-size:13px;color:#ffef9a;">打包今天掌握的单词进长期库，并推进学习天数</div>'
            + '  </button>'
            + '</div>';

        overlay.appendChild(card);
        document.body.appendChild(overlay);

        // 关闭按钮：点了就隐藏遮罩
        const closeBtn = document.getElementById('ebbinghaus_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // 点击遮罩外侧空白处也关闭（但点卡片本身不关闭）
        overlay.addEventListener('click', function (ev) {
            // 如果直接点到 overlay（不是点到 card 里的内容）
            if (ev.target && ev.target.id === OVERLAY_ID) {
                hideOverlay();
            }
        }, true);

        // 三个按钮目前只是占位，之后我们把真实逻辑挂上去
        const btnStart = document.getElementById('ebbinghaus_btn_start');
        const btnReview = document.getElementById('ebbinghaus_btn_review');
        const btnEnd = document.getElementById('ebbinghaus_btn_end');

        if (btnStart) {
            btnStart.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                // 之后这里会变成 真正的“开始学习”逻辑
                toastr && toastr.info ? toastr.info('开始学习（占位）：后面会写入今日Level_0_New并开始提问') :
                    console.log('[开始学习] 占位');
            }, true);
        }

        if (btnReview) {
            btnReview.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                // 之后这里会变成 真正的“复习”逻辑
                toastr && toastr.info ? toastr.info('复习（占位）：后面会按艾宾浩斯计划抽查旧List') :
                    console.log('[复习] 占位');
            }, true);
        }

        if (btnEnd) {
            btnEnd.addEventListener('click', function (ev) {
                ev.preventDefault();
                ev.stopPropagation();
                // 之后这里会变成 真正的“结束今天”逻辑
                toastr && toastr.info ? toastr.info('结束今天（占位）：后面会打包Level_5_Today并+1天数') :
                    console.log('[结束今天] 占位');
            }, true);
        }
    }

    // ========= 把学位帽插进导航条 =========
    function ensureToolbarIcon() {
        // 找到一个现成的顶栏按钮作为锚点
        // Amily2 是盯着 #sys-settings-button，我们也优先找它；
        // 找不到就退到 extensions-settings-button
        const anchor =
            document.getElementById('sys-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.getElementById('extensions-settings-button') ||
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('.extensions-settings-button');

        if (!anchor || !anchor.parentElement) {
            return null;
        }

        // 如果我们的图标已经存在，直接返回它
        let iconBtn = document.getElementById(ICON_ID);
        if (iconBtn) {
            return iconBtn;
        }

        // 创建一个跟 SillyTavern 头部按钮同风格的按钮
        iconBtn = document.createElement('div');
        iconBtn.id = ICON_ID;
        iconBtn.className = 'menu_button';
        iconBtn.title = '艾宾浩斯词汇导师';
        iconBtn.setAttribute('role', 'button');
        iconBtn.setAttribute('tabindex', '0');
        iconBtn.style.userSelect = 'none';

        // 只放图标，不放文字，保持和现有按钮一致
        iconBtn.innerHTML = '<i class="fa-solid ' + ICON_CLASS + '"></i>';

        // 放到锚点后面
        anchor.parentElement.insertBefore(iconBtn, anchor.nextSibling);

        return iconBtn;
    }

    // ========= 给学位帽按钮绑定点击 =========
    function bindToolbarIconClick(iconBtn) {
        if (!iconBtn) return;

        // 我们用 dataset 标记一下是否已经绑定过，避免重复叠加监听
        if (iconBtn.dataset.ebbinghausBound === '1') {
            return;
        }

        const handler = function (ev) {
            ev.preventDefault();
            ev.stopPropagation();
            toggleOverlay();
            return false;
        };

        // 支持手机点击 / 触摸 / 鼠标等
        iconBtn.addEventListener('click', handler, true);
        iconBtn.addEventListener('touchend', handler, true);
        iconBtn.addEventListener('pointerup', handler, true);
        iconBtn.addEventListener('mousedown', handler, true);

        iconBtn.addEventListener('keyup', function (ev) {
            if (ev.key === 'Enter' || ev.key === ' ') {
                handler(ev);
            }
        }, true);

        iconBtn.dataset.ebbinghausBound = '1';
    }

    // ========= 守护循环 =========
    // 和 Amily2 的风格类似：不停确认 UI 是否就绪
    // 这里我们不止尝试100次，而是一直守护（每1秒检查一次）
    function startGuardianLoop() {
        // 先跑一遍，立即尝试构建
        ensureOverlayPanel();
        const btnNow = ensureToolbarIcon();
        bindToolbarIconClick(btnNow);

        // 再开一个长驻的 interval，保证将来导航被 ST 重绘后还能继续可点
        setInterval(function () {
            // 1. 确保遮罩+面板存在（如果意外被删掉，就重建）
            ensureOverlayPanel();

            // 2. 确保图标存在（如果被重排丢了，就重建）
            const btn = ensureToolbarIcon();

            // 3. 确保图标有点击事件
            if (btn) {
                bindToolbarIconClick(btn);
            }
        }, 1000);
    }

    // ========= 启动时机 =========
    // Amily2 的做法是等顶栏按钮 (#sys-settings-button) 出现才启动主逻辑
    // 我们也来一套轮询，等界面准备好，再启动守护循环
    function delayedBoot() {
        let attempts = 0;
        const maxAttempts = 200;
        const poll = setInterval(function () {
            attempts++;

            // 判断 SillyTavern 主UI 是否出现（用和 Amily2 一样的锚点来判断）
            const ready =
                document.getElementById('sys-settings-button') ||
                document.querySelector('#sys-settings-button') ||
                document.getElementById('extensions-settings-button') ||
                document.querySelector('#extensions-settings-button') ||
                document.querySelector('.extensions-settings-button');

            if (ready) {
                clearInterval(poll);
                startGuardianLoop();
            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
                console.error(`[${EXT_NAME}] 启动失败：等待主界面超时`);
            }
        }, 200);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        delayedBoot();
    } else {
        document.addEventListener('DOMContentLoaded', delayedBoot);
    }
})();
