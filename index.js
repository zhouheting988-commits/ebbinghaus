// Ebbinghaus Trainer
// 版本：事件代理版（学位帽在哪都能点开面板）
// 交互逻辑：点击顶部学位帽图标 => 打开我们自己的深色大面板
// 不再用 slash 命令，不用右下角悬浮球

(function () {
    const EXT_NAME = 'EbbinghausTrainer';

    // DOM id 常量
    const ICON_ID = 'ebbinghaus_trainer_toolbar_icon';
    const OVERLAY_ID = 'ebbinghaus_trainer_overlay';
    const CARD_ID = 'ebbinghaus_trainer_card';

    // 用哪个 FontAwesome 图标
    const ICON_CLASS = 'fa-graduation-cap'; // 也可以换 'fa-book' / 'fa-brain'

    /************************************
     * 工具函数：显示/隐藏/切换面板
     ************************************/
    function showOverlay() {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) {
            ov.style.display = 'flex';
        }
    }

    function hideOverlay() {
        const ov = document.getElementById(OVERLAY_ID);
        if (ov) {
            ov.style.display = 'flex'; // 先防止闪烁
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

    /************************************
     * 创建/确保 “学习面板” (全屏遮罩+黑卡片)
     ************************************/
    function ensureOverlayPanel() {
        // 如果已经有了就直接返回
        if (document.getElementById(OVERLAY_ID)) {
            return;
        }

        // 半透明全屏遮罩
        const overlay = document.createElement('div');
        overlay.id = OVERLAY_ID;
        overlay.style.position = 'fixed';
        overlay.style.left = '0';
        overlay.style.top = '0';
        overlay.style.width = '100vw';
        overlay.style.height = '100vh';
        overlay.style.zIndex = '2147483647'; // 非常高，盖住一切
        overlay.style.background = 'rgba(0,0,0,0.4)';
        overlay.style.backdropFilter = 'blur(4px)';
        overlay.style.webkitBackdropFilter = 'blur(4px)';
        overlay.style.display = 'none'; // 默认隐藏
        overlay.style.alignItems = 'center'; // flex 居中
        overlay.style.justifyContent = 'center';

        // 深色信息卡片
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

        // 面板内容
        card.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
                <div style="font-size:16px;font-weight:bold;display:flex;align-items:center;gap:8px;">
                    <i class="fa-solid ${ICON_CLASS}" style="color:#fff;"></i>
                    <span>艾宾浩斯词汇导师</span>
                </div>
                <button id="ebbinghaus_close_btn"
                    style="
                        background:rgba(255,255,255,0.1);
                        color:#fff;
                        border:1px solid rgba(255,255,255,0.3);
                        border-radius:8px;
                        font-size:12px;
                        padding:4px 8px;
                        cursor:pointer;
                    ">
                    关闭
                </button>
            </div>

            <div style="
                background:rgba(255,255,255,0.05);
                border:1px solid rgba(255,255,255,0.12);
                border-radius:8px;
                padding:10px 12px;
                margin-bottom:16px;
                font-size:13px;
                color:#ccc;
                line-height:1.5;
            ">
                <div style="font-weight:bold;color:#fff;margin-bottom:6px;">学习流程说明</div>
                <div>
                  1. <b>开始学习</b>：把你这批新词放进今天的词库（Vocabulary_Mastery 的 Level_0_New），
                  然后用这些词按「单词→短语→句子」来提问。句子内容必须用世界书里的知识点，
                  这样同时背单词+背专业知识。
                </div>
                <div style="margin-top:6px;">
                  2. <b>复习</b>：根据艾宾浩斯计划表，从旧 List 里抽查这些“毕业词”。
                  答错则降级回每日循环。
                </div>
                <div style="margin-top:6px;">
                  3. <b>结束今天</b>：把今天达成 Level_5 的词打包成新的 List (存入 Word_Lists)，
                  并把 Study_Control 的 Current_Day +1，准备下一天。
                </div>
            </div>

            <div style="display:flex;flex-direction:column;gap:10px;">
                <button id="ebbinghaus_btn_start"
                    style="
                        width:100%;
                        text-align:left;
                        background:rgba(46,204,113,0.15);
                        border:1px solid rgba(46,204,113,0.4);
                        color:#aef7c9;
                        border-radius:10px;
                        padding:10px 12px;
                        font-size:14px;
                        line-height:1.4;
                        cursor:pointer;
                    ">
                    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">开始学习</div>
                    <div style="font-size:13px;color:#aef7c9;">
                        本批新词入库并开启三轮提问（词→短语→句子）
                    </div>
                </button>

                <button id="ebbinghaus_btn_review"
                    style="
                        width:100%;
                        text-align:left;
                        background:rgba(52,152,219,0.15);
                        border:1px solid rgba(52,152,219,0.4);
                        color:#bfe4ff;
                        border-radius:10px;
                        padding:10px 12px;
                        font-size:14px;
                        line-height:1.4;
                        cursor:pointer;
                    ">
                    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">复习</div>
                    <div style="font-size:13px;color:#bfe4ff;">
                        按艾宾浩斯计划抽查旧 List；错词降级回每日循环
                    </div>
                </button>

                <button id="ebbinghaus_btn_end"
                    style="
                        width:100%;
                        text-align:left;
                        background:rgba(241,196,15,0.15);
                        border:1px solid rgba(241,196,15,0.4);
                        color:#ffef9a;
                        border-radius:10px;
                        padding:10px 12px;
                        font-size:14px;
                        line-height:1.4;
                        cursor:pointer;
                    ">
                    <div style="font-weight:bold;color:#fff;margin-bottom:4px;">结束今天</div>
                    <div style="font-size:13px;color:#ffef9a;">
                        打包今日 Level_5_Today => 新 List；Current_Day +1
                    </div>
                </button>
            </div>
        `;

        // 把卡片塞进遮罩
        overlay.appendChild(card);
        // 把遮罩塞进页面
        document.body.appendChild(overlay);

        // 行为：点击遮罩空白处关闭
        overlay.addEventListener('click', (ev) => {
            if (ev.target && ev.target.id === OVERLAY_ID) {
                hideOverlay();
            }
        }, true);

        // 行为：点击“关闭”按钮关闭
        const closeBtn = document.getElementById('ebbinghaus_close_btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                hideOverlay();
            }, true);
        }

        // 三个主按钮目前先打日志/提示，后面接真实逻辑
        const btnStart = document.getElementById('ebbinghaus_btn_start');
        const btnReview = document.getElementById('ebbinghaus_btn_review');
        const btnEnd = document.getElementById('ebbinghaus_btn_end');

        if (btnStart) {
            btnStart.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                console.log('[EbbinghausTrainer] 开始学习（占位）');
                if (window.toastr?.info) {
                    window.toastr.info('开始学习（占位逻辑）');
                }
            }, true);
        }

        if (btnReview) {
            btnReview.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                console.log('[EbbinghausTrainer] 复习（占位）');
                if (window.toastr?.info) {
                    window.toastr.info('复习（占位逻辑）');
                }
            }, true);
        }

        if (btnEnd) {
            btnEnd.addEventListener('click', (ev) => {
                ev.preventDefault();
                ev.stopPropagation();
                console.log('[EbbinghausTrainer] 结束今天（占位）');
                if (window.toastr?.info) {
                    window.toastr.info('结束今天（占位逻辑）');
                }
            }, true);
        }

        console.log(`[${EXT_NAME}] Overlay panel injected.`);
    }

    /************************************
     * 创建/确保 顶栏上的学位帽按钮
     ************************************/
    function ensureToolbarIcon() {
        // 找一个现成的顶栏锚点（和 Amily2 一样靠这些id）
        const anchor =
            document.getElementById('sys-settings-button') ||
            document.querySelector('#sys-settings-button') ||
            document.getElementById('extensions-settings-button') ||
            document.querySelector('#extensions-settings-button') ||
            document.querySelector('.extensions-settings-button');

        if (!anchor || !anchor.parentElement) {
            return null;
        }

        // 如果我们已经有图标，直接返回它
        let iconBtn = document.getElementById(ICON_ID);
        if (iconBtn) {
            return iconBtn;
        }

        // 否则新建一个跟 ST 自己一样的按钮
        iconBtn = document.createElement('div');
        iconBtn.id = ICON_ID;
        iconBtn.className = 'menu_button';
        iconBtn.title = '艾宾浩斯词汇导师';
        iconBtn.setAttribute('role', 'button');
        iconBtn.setAttribute('tabindex', '0');
        iconBtn.style.userSelect = 'none';
        iconBtn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;

        // 插在 anchor 后面
        anchor.parentElement.insertBefore(iconBtn, anchor.nextSibling);

        console.log(`[${EXT_NAME}] Toolbar icon injected.`);
        return iconBtn;
    }

    /************************************
     * 🔥 核心：全局事件代理
     * 任何时候点击拥有我们ID的按钮，都 toggleOverlay
     * 即使 SillyTavern 把按钮移位/克隆，我们也能捕捉到点击
     ************************************/
    function registerGlobalClickDelegates() {
        // 点击
        document.addEventListener('click', (ev) => {
            const target = ev.target;
            if (!target) return;
            // 可能点到的是 <i>，也可能点到外层 <div>，所以用 closest
            const hatBtn = target.closest('#' + ICON_ID);
            if (hatBtn) {
                ev.preventDefault();
                ev.stopPropagation();
                console.log(`[${EXT_NAME}] toolbar icon clicked (delegated)`);
                toggleOverlay();
            }
        }, true);

        // 触摸（移动端保险）
        document.addEventListener('touchend', (ev) => {
            const target = ev.target;
            if (!target) return;
            const hatBtn = target.closest('#' + ICON_ID);
            if (hatBtn) {
                ev.preventDefault();
                ev.stopPropagation();
                console.log(`[${EXT_NAME}] toolbar icon touchend (delegated)`);
                toggleOverlay();
            }
        }, true);
    }

    /************************************
     * 守护循环：1秒检查一次
     * - 面板在不在？没有就重建
     * - 学位帽图标在不在？没有就重建
     ************************************/
    function startGuardianLoop() {
        // 先确保现在就建一次
        ensureOverlayPanel();
        ensureToolbarIcon();

        // 再启动循环，防止 ST 重绘后把我们的东西冲掉
        setInterval(() => {
            ensureOverlayPanel();
            ensureToolbarIcon();
        }, 1000);
    }

    /************************************
     * 延迟启动：
     * 和 Amily2 同思路——等主界面的导航元素出现了再开始挂守护
     ************************************/
    function delayedBoot() {
        let attempts = 0;
        const maxAttempts = 200;
        const poll = setInterval(() => {
            attempts++;

            // 主UI是否可用（有没有那个 settings / extensions 的锚点）
            const ready =
                document.getElementById('sys-settings-button') ||
                document.querySelector('#sys-settings-button') ||
                document.getElementById('extensions-settings-button') ||
                document.querySelector('#extensions-settings-button') ||
                document.querySelector('.extensions-settings-button');

            if (ready) {
                clearInterval(poll);

                // 装上全局事件代理（只装一次就好）
                registerGlobalClickDelegates();

                // 启动守护循环
                startGuardianLoop();

                console.log(`[${EXT_NAME}] boot complete.`);
            } else if (attempts >= maxAttempts) {
                clearInterval(poll);
                console.error(`[${EXT_NAME}] boot timeout: main toolbar not detected.`);
            }
        }, 200);
    }

    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        delayedBoot();
    } else {
        document.addEventListener('DOMContentLoaded', delayedBoot);
    }
})();
