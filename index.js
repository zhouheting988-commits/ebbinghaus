// Ebbinghaus Trainer · click-bulletproof version
(function () {
  // 你喜欢哪种图标就换这个class，比如：
  // 'fa-graduation-cap' 🎓  'fa-book' 📕  'fa-brain' 🧠  'fa-book-open' 📖
  const ICON_CLASS = 'fa-graduation-cap';

  // =============== 面板本体（我们后面把真实学习逻辑挂到这三颗按钮） ===============
  function openPanel() {
    // 如果已经有面板了，就直接显示并return
    let panel = document.getElementById('eb-trainer-panel');
    if (panel) {
      panel.style.display = 'block';
      return;
    }

    panel = document.createElement('div');
    panel.id = 'eb-trainer-panel';

    Object.assign(panel.style, {
      position: 'fixed',
      right: '16px',
      bottom: '72px',
      zIndex: 2147483647,
      width: '340px',
      maxHeight: '60vh',
      overflow: 'auto',
      background: '#fff',
      border: '1px solid #ccc',
      borderRadius: '12px',
      boxShadow: '0 6px 18px rgba(0,0,0,.25)',
      padding: '12px',
      fontSize: '14px',
      lineHeight: '1.4',
      color: '#333',
    });

    panel.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong style="font-size:14px;">艾宾浩斯词汇导师</strong>
        <button id="eb-panel-close"
          style="border:0;background:#eee;padding:4px 8px;border-radius:8px;cursor:pointer;font-size:12px;">
          关闭
        </button>
      </div>

      <div style="font-size:13px;color:#666;line-height:1.5;margin-bottom:10px;">
        ✅ 入口正常运行。<br/>
        下面三颗按钮现在只是占位，后面会变成：<br/>
        • 开始学习 → 把这次提交的单词放进当日 Level_0_New 并开始三轮提问（词→短语→句子，来源世界书）<br/>
        • 复习 → 按艾宾浩斯计划抽查旧 List，错词降级<br/>
        • 结束今天 → 打包 Level_5_Today、推进 Current_Day<br/>
      </div>

      <div style="display:flex;gap:8px;flex-wrap:wrap;">
        <button id="eb-start"
          style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">
          开始学习（空）
        </button>
        <button id="eb-review"
          style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">
          复习（空）
        </button>
        <button id="eb-end"
          style="padding:6px 10px;border-radius:8px;border:1px solid #999;background:#fff;font-size:13px;cursor:pointer;">
          结束今天（空）
        </button>
      </div>
    `;

    document.body.appendChild(panel);

    // 绑定按钮行为（先弹提示，后面我会把真逻辑塞进来）
    document.getElementById('eb-panel-close').addEventListener('click', () => {
        panel.style.display = 'none';
    });

    document.getElementById('eb-start').addEventListener('click', (e) => {
        e.stopPropagation();
        alert('开始学习 StartStudy() 占位触发');
    });

    document.getElementById('eb-review').addEventListener('click', (e) => {
        e.stopPropagation();
        alert('复习 ReviewLists() 占位触发');
    });

    document.getElementById('eb-end').addEventListener('click', (e) => {
        e.stopPropagation();
        alert('结束今天 EndDay() 占位触发');
    });
  }

  // =============== 顶部图标注入（学位帽） ===============
  function injectToolbarIcon() {
    // 找到顶栏里现有的按钮，准备把我们塞在它旁边
    const anchor = document.getElementById('extensions-settings-button')
                || document.querySelector('#extensions-settings-button')
                || document.querySelector('.extensions-settings-button');
    if (!anchor || !anchor.parentElement) return;

    // 如果已经有我们自己的按钮了，就别重复加
    if (document.getElementById('eb-toolbar-native')) return;

    // 按 SillyTavern 原生按钮风格做一个 div.menu_button
    const btn = document.createElement('div');
    btn.id = 'eb-toolbar-native';
    btn.className = 'menu_button';           // 关键：用 ST 自己的样式类
    btn.title = '艾宾浩斯词汇导师';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.style.userSelect = 'none';

    // 只放图标，不放文字（统一风格）
    btn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;

    // 把按钮插到 anchor 后面
    anchor.parentElement.insertBefore(btn, anchor.nextSibling);
  }

  // =============== 给图标绑定点击（多重绑定 + 兜底） ===============
  function bindToolbarClick() {
    const fire = (ev) => {
      if (!ev) ev = window.event;
      try { ev.preventDefault(); } catch(_) {}
      try { ev.stopPropagation(); } catch(_) {}
      try { ev.stopImmediatePropagation(); } catch(_) {}
      openPanel();
      return false;
    };

    const bindNow = () => {
      const icon = document.getElementById('eb-toolbar-native');
      if (!icon) return false;

      // 主绑定：click / touchend / keydown(回车 空格)
      icon.onclick = fire;
      icon.ontouchend = fire;
      icon.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') fire(e);
      };

      // 兜底：全局捕获。即使顶栏父容器在手机上吃掉了点击，这里还能拦截到“是谁被点了”
      document.addEventListener('click', (e) => {
        if (e.target && e.target.closest && e.target.closest('#eb-toolbar-native')) {
          fire(e);
        }
      }, true);

      document.addEventListener('touchend', (e) => {
        if (e.target && e.target.closest && e.target.closest('#eb-toolbar-native')) {
          fire(e);
        }
      }, true);

      return true;
    };

    // 菜单会被 SillyTavern 重新渲染，所以我们用一个小轮询，反复确保监听存在
    let tries = 0;
    const t = setInterval(() => {
      injectToolbarIcon();    // 图标不在就再塞一次
      if (bindNow()) {
        // 只要成功绑上了，就可以停止轮询
        clearInterval(t);
      }
      if (++tries > 20) {
        clearInterval(t);
      }
    }, 500);
  }

  // =============== 聊天输入框斜杠命令：/记忆表 /eb /memory ===============
  function bindSlashCommand() {
    const attempt = () => {
      const input = document.getElementById('send_textarea') || document.querySelector('textarea');
      const sendBtn = document.querySelector('#send_button, #send_message_button, #send_now, .send_button');

      if (!input) return false;

      const maybeOpen = () => {
        const v = (input.value || '').trim();
        if (v === '/记忆表' || v === '/eb' || v === '/memory') {
          input.value = '';
          openPanel();
          return true;
        }
        return false;
      };

      // 回车发送的时候拦一下
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (maybeOpen()) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation?.();
          }
        }
      }, true);

      // 小纸飞机“发送”按钮也拦一下
      if (sendBtn) {
        sendBtn.addEventListener('click', () => { maybeOpen(); }, true);
      }

      return true;
    };

    let tries = 0;
    const t = setInterval(() => {
      if (attempt() || ++tries > 10) clearInterval(t);
    }, 500);
  }

  // =============== “记忆表”出现在每条 AI 消息卡片的操作区（额外后备入口） ===============
  function injectPerMessageButton() {
    // 1. 点击这个按钮就开面板
    document.addEventListener('click', (e) => {
      const hit = e.target && e.target.closest && e.target.closest('.eb-open-panel');
      if (hit) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation?.();
        openPanel();
      }
    }, true);

    // 2. 反复往 .extraMesButtons 里塞“记忆表”小按钮
    const addBtnToAllMessages = () => {
      document.querySelectorAll('.extraMesButtons').forEach(box => {
        if (box.querySelector('.eb-open-panel')) return;
        const div = document.createElement('div');
        div.className = 'mes_button eb-open-panel';
        div.textContent = '记忆表';
        div.title = '打开艾宾浩斯词汇导师';
        div.style.cursor = 'pointer';
        box.appendChild(div);
      });
    };

    let tries = 0;
    const t = setInterval(() => {
      addBtnToAllMessages();
      if (++tries > 10) clearInterval(t);
    }, 800);
  }

  // =============== 启动顺序 ===============
  function init() {
    // 1. 顶栏图标 + 点击绑定（含轮询确保不会丢监听）
    bindToolbarClick();

    // 2. slash 命令：发 /eb /记忆表 也能打开
    bindSlashCommand();

    // 3. 每条AI消息里的“记忆表”按钮
    injectPerMessageButton();

    console.log('[EbbinghausTrainer] fully initialized');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
