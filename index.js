// Ebbinghaus Trainer (艾宾浩斯词汇导师)
// 目标：像 Amily2 那样，等到 ST 顶栏稳定后再注入UI，
// 然后：学位帽图标 -> 点击 -> 打开/关闭我们自己的面板。

(function () {
    const EXT_ID = 'ebbinghaus_trainer';
    const BTN_ID = 'ebbinghaus_trainer_button';
    const PANEL_ID = 'ebbinghaus_trainer_panel';
    const STYLE_ID = 'ebbinghaus_trainer_styles';

    // 想用的 FontAwesome 图标（和你的截图保持一致）
    const ICON_CLASS = 'fa-graduation-cap'; // fa-book / fa-book-open 也可以

    // 这个是我们面板的HTML结构（先隐藏，点图标时toggle）
    function buildPanelHtml() {
        return `
            <div id="${PANEL_ID}" style="display:none;">
                <div class="${EXT_ID}-header">
                    <div class="${EXT_ID}-title">艾宾浩斯词汇导师</div>
                    <button class="${EXT_ID}-close-btn" title="关闭面板">×</button>
                </div>

                <div class="${EXT_ID}-body">
                    <div class="${EXT_ID}-sectionIntro">
                        <p>这是学习控制面板（测试版 UI 已加载成功 ✅）。</p>
                        <p>之后这里会真正驱动你的四张表：</p>
                        <ul>
                            <li><b>Vocabulary_Mastery</b>（每日进度&等级）</li>
                            <li><b>Word_Lists</b>（List1/List2…归档）</li>
                            <li><b>Ebbinghaus_Schedule</b>（复习日程）</li>
                            <li><b>Study_Control</b>（Current_Day时钟）</li>
                        </ul>
                        <p>同时会管理三种动作：</p>
                        <ol>
                            <li>开始学习：接收这批词，放进当日 Level_0_New，并开始三轮出题（单词→短语→句子，句子内容来自你的世界书）</li>
                            <li>复习：按当日计划抽查旧 List，答错的单词会降级回 Level_0_New</li>
                            <li>结束今天：把今天升到 Level_5 的词打包成新 List，写进 Word_Lists，并让 Current_Day +1</li>
                        </ol>
                    </div>

                    <div class="${EXT_ID}-buttonRow">
                        <button class="${EXT_ID}-action-btn" data-action="start">开始学习</button>
                        <button class="${EXT_ID}-action-btn" data-action="review">复习</button>
                        <button class="${EXT_ID}-action-btn" data-action="end">结束今天</button>
                    </div>

                    <div class="${EXT_ID}-footnote">
                        <p>⚠ 这三个按钮当前只是空壳。</p>
                        <p>等入口确认能稳定点开后，我会把真实逻辑直接写进来，并把数据放在 localStorage 里，这样你每次打开SillyTavern还能接着学，不会丢。</p>
                    </div>
                </div>
            </div>
        `;
    }

    // 我们插入一段<style>，让面板长得像独立抽屉
    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const styleEl = document.createElement('style');
        styleEl.id = STYLE_ID;
        styleEl.textContent = `
            /* 整个面板容器 */
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

            /* 头部栏 */
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

            /* 内容滚动区 */
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

            /* 三个主按钮区域 */
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

            /* 顶栏按钮（学位帽）的额外修正：保持和其他 icon 一样的外观大小 */
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

    // 把按钮塞进导航栏（和 Amily2 的“createDrawer”类似，我们等到 ST 顶栏出现才动手）
    function injectToolbarButton() {
        // 找锚点：我们选“extensions-settings-button”（就是你截图里那个带齿轮的小人/设置位置附近）
        const anchor =
            document.getElementById('extensions-settings-button') ||
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('.extensions-settings-button');

        if (!anchor || !anchor.parentElement) {
            return false;
        }

        // 如果已经有了就别重复
        if (document.getElementById(BTN_ID)) {
            return true;
        }

        // 创建按钮
        const btn = document.createElement('div');
        btn.id = BTN_ID;
        btn.className = 'menu_button';
        btn.title = '艾宾浩斯词汇导师';
        btn.setAttribute('role', 'button');
        btn.setAttribute('tabindex', '0');
        btn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;

        // 把按钮插到 anchor 后面（这样它就排在同一行、同一风格）
        anchor.parentElement.insertBefore(btn, anchor.nextSibling);

        return true;
    }

    // 创建（如果还没有）我们的主面板 DOM，并挂事件
    function ensurePanelDom() {
        if (document.getElementById(PANEL_ID)) return true;

        const wrapper = document.createElement('div');
        wrapper.innerHTML = buildPanelHtml();
        document.body.appendChild(wrapper.firstElementChild);

        // 绑定面板里的关闭按钮
        const panelEl = document.getElementById(PANEL_ID);
        const closeBtn = panelEl.querySelector(`.${EXT_ID}-close-btn`);
        closeBtn.addEventListener('click', () => {
            hidePanel();
        });

        // 面板中三个主按钮目前只是占位点击
        panelEl.querySelectorAll(`.${EXT_ID}-action-btn`).forEach(btn => {
            btn.addEventListener('click', (e) => {
                const act = e.target.getAttribute('data-action');
                // 先简单提示，等入口稳定后我们会把真实逻辑写进去
                let msg = '';
                if (act === 'start') msg = '开始学习（未来会：接这批单词→进Level_0_New→按单词/短语/句子出题）';
                if (act === 'review') msg = '复习（未来会：按艾宾浩斯计划抽查旧List，错词降级）';
                if (act === 'end') msg = '结束今天（未来会：归档Level_5_Today→生成新List→Current_Day+1）';

                if (msg) {
                    // 用 ST 的 toastr 提示一下你点到哪里了
                    if (window.toastr) {
                        window.toastr.info(msg, '功能占位');
                    } else {
                        alert(msg);
                    }
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
        if (btnEl) btnEl.classList.add('eb-active');
    }

    function hidePanel() {
        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) return;
        panelEl.style.display = 'none';

        const btnEl = document.getElementById(BTN_ID);
        if (btnEl) btnEl.classList.remove('eb-active');
    }

    function togglePanel() {
        const panelEl = document.getElementById(PANEL_ID);
        if (!panelEl) return;
        if (panelEl.style.display === 'none' || panelEl.style.display === '') {
            showPanel();
        } else {
            hidePanel();
        }
    }

    // 给学位帽按钮绑定点击事件（重复绑定前先解绑，防止多次加监听）
    function bindButtonEvents() {
        const btnEl = document.getElementById(BTN_ID);
        if (!btnEl) return false;

        // 为了避免重复注册，先清掉旧的
        btnEl.onclick = null;
        btnEl.onkeydown = null;
        btnEl.ontouchend = null;

        btnEl.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            togglePanel();
        }, true);

        btnEl.addEventListener('ontouchend', function (e) {
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

        return true;
    }

    // 和 Amily2 一样：等环境 ready 再注入，而不是立即注入
    // 我们持续轮询 DOM，直到顶栏元素出现，再执行一次性初始化
    function mainInitOnceReady() {
        let tries = 0;
        const maxTries = 200; // 200 * 100ms = 20秒耐心，和 Amily2 的风格类似
        const timer = setInterval(() => {
            tries++;

            // 1. 注入样式
            injectStyles();

            // 2. 顶栏按钮注入
            const btnOk = injectToolbarButton();

            // 3. 面板DOM注入
            const panelOk = ensurePanelDom();

            // 4. 事件绑定
            const bindOk = bindButtonEvents();

            // 如果按钮和面板都已经在了，并且绑定成功 -> 我们宣布完成初始化
            if (btnOk && panelOk && bindOk) {
                console.log('[EbbinghausTrainer] UI ready: 顶栏学位帽 + 可开合的控制面板 已就绪');
                clearInterval(timer);
            }

            if (tries >= maxTries) {
                console.error('[EbbinghausTrainer] 初始化超时：没有等到可挂载的导航栏元素');
                clearInterval(timer);
            }
        }, 100);
    }

    // SillyTavern 扩展常见写法：等 jQuery ready 再跑主逻辑
    if (window.jQuery) {
        jQuery(async () => {
            mainInitOnceReady();
        });
    } else {
        // 极少数情况下 jQuery 变量名冲突，这里兜底
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            mainInitOnceReady();
        } else {
            document.addEventListener('DOMContentLoaded', mainInitOnceReady);
        }
    }
})();
