// Ebbinghaus Trainer (艾宾浩斯词汇导师)
// 稳定版：和 Amily2 的思路一样，等主界面加载后再往里面挂入口。
// 修复：面板 DOM 现在用 insertAdjacentHTML 注入，避免 firstElementChild 的换行节点问题。

(function () {
    const EXT_ID = 'ebbinghaus_trainer';
    const BTN_ID = 'ebbinghaus_trainer_button';
    const PANEL_ID = 'ebbinghaus_trainer_panel';
    const STYLE_ID = 'ebbinghaus_trainer_styles';

    // 顶栏按钮用的 FontAwesome 图标类
    const ICON_CLASS = 'fa-graduation-cap';

    // 面板 HTML（默认是隐藏的，我们只负责插入）
    function buildPanelHtml() {
        return `
<div id="${PANEL_ID}" style="display:none;">
    <div class="${EXT_ID}-header">
        <div class="${EXT_ID}-title">艾宾浩斯词汇导师</div>
        <button class="${EXT_ID}-close-btn" title="关闭面板">×</button>
    </div>

    <div class="${EXT_ID}-body">
        <div class="${EXT_ID}-sectionIntro">
            <p>✅ 控制面板加载成功。</p>
            <p>后续这里会真正驱动你的四张表（保存在本地，不丢）：</p>
            <ul>
                <li><b>Vocabulary_Mastery</b>（每日学习与等级：Level_0_New ~ Level_5）</li>
                <li><b>Word_Lists</b>（把每天毕业的 Level_5_Today 打包成 List1/List2/...）</li>
                <li><b>Ebbinghaus_Schedule</b>（艾宾浩斯复习日程，告诉今天要复习哪些旧 List）</li>
                <li><b>Study_Control</b>（Current_Day 学习日时钟）</li>
            </ul>

            <p>还有三大动作：</p>
            <ol>
                <li><b>开始学习</b>：我接收你这批50~100个新词，写进今天的 Level_0_New，然后按“单词→短语→句子”的形式出题。句子会只用世界书里的知识点（考研专业课内容），让你同时刷单词+背知识点。</li>
                <li><b>复习</b>：我根据 Ebbinghaus_Schedule 读出要复习的 List（以前学过、已经到过Level_5的词），抽查你。答错→严重警报→从 Word_Lists 里剔除并降回 Level_0_New，明天重新炼。</li>
                <li><b>结束今天</b>：把今天升到 Level_5 的词打包成新 ListN 存入 Word_Lists；清空 Level_5_Today；Current_Day +1。</li>
            </ol>
        </div>

        <div class="${EXT_ID}-buttonRow">
            <button class="${EXT_ID}-action-btn" data-action="start">开始学习</button>
            <button class="${EXT_ID}-action-btn" data-action="review">复习</button>
            <button class="${EXT_ID}-action-btn" data-action="end">结束今天</button>
        </div>

        <div class="${EXT_ID}-footnote">
            <p>这三个按钮现在还是占位，不会真的写表和出题。</p>
            <p>等我们确认“面板能正常开合”这一关通过之后，我就把真实逻辑塞进来，数据会保存在 localStorage 里，这样下次开SillyTavern还能继续昨天的Day X，而不是从零开始。</p>
        </div>
    </div>
</div>`;
    }

    // 注入样式（只注入一次）
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = `
            /* 面板整体外框 */
            #${PANEL_ID} {
                position: fixed;
                right: 12px;
                bottom: 70px;
                width: 360px;
                max-height: 65vh;
                background: var(--SmartThemeBodyColor, #fff);
                color: var(--SmartThemeTextColor, #000);
                border: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.3));
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.4);
                font-size: 14px;
                line-height: 1.45;
                display: flex;
                flex-direction: column;
                z-index: 2147483647;
                overflow: hidden;
            }

            /* 头部区域 */
            #${PANEL_ID} .${EXT_ID}-header {
                display: flex;
                align-items: center;
                justify-content: space-between;
                background: var(--SmartThemeContrastColor, rgba(0,0,0,0.25));
                color: var(--SmartThemeTextColor, #fff);
                padding: 8px 10px;
                border-bottom: 1px solid var(--SmartThemeBorderColor, rgba(255,255,255,0.2));
            }

            #${PANEL_ID} .${EXT_ID}-title {
                font-weight: bold;
                font-size: 14px;
                display: flex;
                align-items: center;
                gap: 6px;
            }

            #${PANEL_ID} .${EXT_ID}-close-btn {
                background: rgba(255,255,255,0.15);
                border: 1px solid rgba(255,255,255,0.4);
                border-radius: 6px;
                color: #fff;
                font-size: 14px;
                line-height: 1;
                padding: 2px 6px;
                cursor: pointer;
            }

            #${PANEL_ID} .${EXT_ID}-close-btn:hover {
                background: rgba(255,255,255,0.3);
            }

            /* 主体滚动内容区 */
            #${PANEL_ID} .${EXT_ID}-body {
                padding: 10px;
                background: var(--SmartThemeBodyColor, #1e1e2e);
                color: var(--SmartThemeTextColor, #fff);
                overflow-y: auto;
                flex: 1;
            }

            #${PANEL_ID} .${EXT_ID}-sectionIntro p,
            #${PANEL_ID} .${EXT_ID}-sectionIntro li {
                margin: 4px 0;
            }

            #${PANEL_ID} .${EXT_ID}-sectionIntro ul,
            #${PANEL_ID} .${EXT_ID}-sectionIntro ol {
                margin: 6px 0 10px 18px;
                padding: 0;
            }

            /* 三个主操作按钮 */
            #${PANEL_ID} .${EXT_ID}-buttonRow {
                display: flex;
                flex-wrap: wrap;
                gap: 8px;
                margin: 12px 0;
            }

            #${PANEL_ID} .${EXT_ID}-action-btn {
                flex: 1 1 auto;
                min-width: 80px;
                padding: 8px 10px;
                border-radius: 8px;
                background: rgba(255,255,255,0.08);
                color: var(--SmartThemeTextColor, #fff);
                border: 1px solid rgba(255,255,255,0.4);
                box-shadow: 0 0 6px rgba(0,0,0,0.5);
                font-size: 13px;
                cursor: pointer;
            }

            #${PANEL_ID} .${EXT_ID}-action-btn:hover {
                background: rgba(255,255,255,0.18);
            }

            #${PANEL_ID} .${EXT_ID}-footnote {
                font-size: 12px;
                line-height: 1.4;
                color: #bbb;
                border-top: 1px solid rgba(255,255,255,0.2);
                padding-top: 10px;
            }

            /* 顶栏学位帽按钮的样式修正，跟现有 .menu_button 风格保持一致大小 */
            #${BTN_ID}.menu_button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                min-width: 32px;
                min-height: 32px;
                padding: 6px;
                cursor: pointer;
            }

            #${BTN_ID}.menu_button i {
                font-size: 16px;
                line-height: 1;
            }

            #${BTN_ID}.menu_button.eb-active {
                background: var(--SmartThemeContrastColor, rgba(255,255,255,0.15));
                border-radius: 6px;
            }
        `;
        document.head.appendChild(styleEl);
    }

    // 把学位帽按钮塞到顶栏（只要顶栏准备好了）
    function injectToolbarButton() {
        const anchor =
            document.getElementById('extensions-settings-button') ||
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('.extensions-settings-button');

        if (!anchor || !anchor.parentElement) {
            return false;
        }

        if (document.getElementById(BTN_ID)) {
            return true;
        }

        const btn = document.createElement('div');
        btn.id = BTN_ID;
        btn.className = 'menu_button';
        btn.title = '艾宾浩斯词汇导师';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;

        anchor.parentElement.insertBefore(btn, anchor.nextSibling);
        return true;
    }

    // 把面板 DOM 放进 body（如果还没有的话）
    function ensurePanelDom() {
        if (document.getElementById(PANEL_ID)) {
            return true;
        }

        // 这里是修正点：不用 wrapper.firstElementChild，
        // 直接把字符串插进 <body>，DOM 就稳稳存在了。
        document.body.insertAdjacentHTML('beforeend', buildPanelHtml());

        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) {
            console.error('[EbbinghausTrainer] 面板注入失败：未找到面板节点');
            return false;
        }

        // 关闭按钮
        const closeBtn = panelEl.querySelector(`.${EXT_ID}-close-btn`);
        if (closeBtn) {
            closeBtn.addEventListener('click', function () {
                hidePanel();
            });
        }

        // 三个操作按钮（目前只是占位提示）
        panelEl.querySelectorAll(`.${EXT_ID}-action-btn`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const act = e.target.getAttribute('data-action');
                let msg = '';
                if (act === 'start') {
                    msg = '开始学习（占位）：后面会把你本次发送的单词批量放入今天的Level_0_New并开始三轮提问。';
                } else if (act === 'review') {
                    msg = '复习（占位）：后面会按艾宾浩斯计划抽查旧List，错的单词会被降级回每日循环。';
                } else if (act === 'end') {
                    msg = '结束今天（占位）：后面会把今天升到Level_5的词打包成一个新List，并推进Current_Day。';
                }
                if (window.toastr) {
                    window.toastr.info(msg, '功能占位');
                } else {
                    alert(msg);
                }
            });
        });

        return true;
    }

    function showPanel() {
        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) return;
        panelEl.style.display = 'flex';

        const btnEl = document.getElementById(BTN_ID);
        if (btnEl) {
            btnEl.classList.add('eb-active');
        }
    }

    function hidePanel() {
        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) return;
        panelEl.style.display = 'none';

        const btnEl = document.getElementById(BTN_ID);
        if (btnEl) {
            btnEl.classList.remove('eb-active');
        }
    }

    function togglePanel() {
        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) return;
        const now = panelEl.style.display;
        if (now === 'none' || now === '') {
            showPanel();
        } else {
            hidePanel();
        }
    }

    // 给学位帽按钮绑定点击（重复绑定时先清理旧监听）
    function bindButtonEvents() {
        const btnEl = document.getElementById(BTN_ID);
        if (!btnEl) return false;

        // 防止多次叠加
        btnEl.onclick = null;
        btnEl.onkeydown = null;
        btnEl.ontouchend = null;

        btnEl.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePanel();
        }, true);

        btnEl.addEventListener('keydown', function (e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.stopPropagation();
                togglePanel();
            }
        }, true);

        // 移动端补一手 touchend
        btnEl.addEventListener('touchend', function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePanel();
        }, true);

        return true;
    }

    // 主初始化流程：模仿 Amily2 的轮询，等到顶栏/DOM稳定
    function mainInitOnceReady() {
        let tries = 0;
        const maxTries = 200; // 最长等20秒左右可以接受
        const timer = setInterval(() => {
            tries++;

            injectStyles(); // 样式先插

            const btnOk = injectToolbarButton(); // 学位帽按钮
            const panelOk = ensurePanelDom();    // 主面板
            const bindOk = bindButtonEvents();   // 点击 toggle 面板

            if (btnOk && panelOk && bindOk) {
                console.log('[EbbinghausTrainer] UI ready: 学位帽按钮 + 面板注入 + 点击绑定 全部完成');
                clearInterval(timer);
            }

            if (tries >= maxTries) {
                console.error('[EbbinghausTrainer] 初始化超时：没能成功挂载到导航栏');
                clearInterval(timer);
            }
        }, 100);
    }

    // 和别的 ST 插件一样，走 jQuery(async () => {...}) 风格
    if (window.jQuery) {
        jQuery(async () => {
            mainInitOnceReady();
        });
    } else {
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            mainInitOnceReady();
        } else {
            document.addEventListener('DOMContentLoaded', mainInitOnceReady);
        }
    }
})();
