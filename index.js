// Ebbinghaus Trainer · ultra-sticky panel + global listeners
(function () {
  // 你喜欢哪种图标就换这个class，比如：
  // 'fa-graduation-cap' 🎓  'fa-book' 📕  'fa-brain' 🧠  'fa-book-open' 📖
  const ICON_CLASS = 'fa-graduation-cap';

  // 我们允许这些指令触发面板
  const SLASH_TRIGGERS = ['/eb', '/ed', '/记忆表', '/memory'];

  // ====== 1. 先把面板做好(隐藏)，后面只切 display，不重复创建 ======
  function ensurePanelExists() {
    let panel = document.getElementById('eb-trainer-panel');
    if (panel) return panel;

    panel = document.createElement('div');
    panel.id = 'eb-trainer-panel';

    Object.assign(panel.style, {
      position: 'fixed',
      right: '16px',
      bottom: '72px',
      zIndex: 2147483647, // 顶在所有UI之上
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
      display: 'none', // 默认隐藏
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
        ✅ 面板已激活。<br/>
        下面三颗按钮是占位，下一步会接上真正的学习流程：<br/><br/>
        •【开始学习】把这批新单词塞进当日 Level_0_New，并开始三轮提问（单词→短语→句子，全都用“世界书”的知识点做填空）<br/>
        •【复习】按艾宾浩斯计划，对旧List抽查，错的降级回 Level_0_New 并从对应List里删掉<br/>
        •【结束今天】把 Level_5_Today 打包成今日新List，清空列，并把 Current_Day +1<br/>
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

    // 绑定面板内按钮（先弹告知，后面我们会把真逻辑塞这里）
    const closeBtn = panel.querySelector('#eb-panel-close');
    const startBtn = panel.querySelector('#eb-start');
    const reviewBtn = panel.querySelector('#eb-review');
    const endBtn = panel.querySelector('#eb-end');

    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      panel.style.display = 'none';
    });

    startBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      alert('开始学习 StartStudy() —— 占位触发');
    });

    reviewBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      alert('复习 ReviewLists() —— 占位触发');
    });

    endBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      alert('结束今天 EndDay() —— 占位触发');
    });

    return panel;
  }

  function openPanel() {
    const panel = ensurePanelExists();
    panel.style.display = 'block';
  }

  // ====== 2. 把学位帽图标塞到导航栏，保持 SillyTavern 风格 ======
  function injectToolbarIcon() {
    const anchor = document.getElementById('extensions-settings-button')
                || document.querySelector('#extensions-settings-button')
                || document.querySelector('.extensions-settings-button');
    if (!anchor || !anchor.parentElement) return null;

    let btn = document.getElementById('eb-toolbar-native');
    if (!btn) {
      btn = document.createElement('div');
      btn.id = 'eb-toolbar-native';
      btn.className = 'menu_button'; // 跟官方按钮一样的class
      btn.title = '艾宾浩斯词汇导师';
      btn.setAttribute('role', 'button');
      btn.setAttribute('tabindex', '0');
      btn.style.userSelect = 'none';
      btn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;
      anchor.parentElement.insertBefore(btn, anchor.nextSibling);
    }
    return btn;
  }

  // ====== 3. 给图标绑定点击（+全局兜底监听） ======
  function bindToolbarClickWatchdog() {
    const fire = (ev) => {
      if (ev) {
        ev.preventDefault?.();
        ev.stopPropagation?.();
        ev.stopImmediatePropagation?.();
      }
      openPanel();
      return false;
    };

    // 每500ms检查一次图标是否在，是否有监听
    let tries = 0;
    const t = setInterval(() => {
      const icon = injectToolbarIcon(); // 没有就再塞一个
      if (!icon) {
        tries++;
        if (tries > 40) clearInterval(t); // 20秒后也不再尝试
        return;
      }

      // 我们一直给它重新挂监听，不怕它被 SillyTavern 重绘掉
      icon.onclick = fire;
      icon.ontouchend = fire;
      icon.onpointerup = fire;
      icon.onkeydown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') fire(e);
      };

      // 兜底：全局捕获，只要点到了这个图标(或里面的小帽子<i>标签)，我就开面板
      document.addEventListener('click', (e) => {
        if (!e.target) return;
        if (e.target.closest && e.target.closest('#eb-toolbar-native')) {
          fire(e);
        }
      }, true);

      document.addEventListener('touchend', (e) => {
        if (!e.target) return;
        if (e.target.closest && e.target.closest('#eb-toolbar-native')) {
          fire(e);
        }
      }, true);

      // 一旦我们成功挂上了事件，就不需要一直轮询更多逻辑，
      // 但我们保留interval继续运行一会儿是为了防止 ST 重新渲染头部吃掉监听。
      tries++;
      if (tries > 40) clearInterval(t); // ~20秒够稳定了
    }, 500);
  }

  // ====== 4. 监听聊天输入框，实现 /eb /ed /记忆表 /memory 开面板 ======
  function bindSlashIntercept() {
    // 这个逻辑并不依赖点“发送”，而是拦在回车之前
    const isTriggerText = (text) => {
      if (!text) return false;
      const v = text.trim();
      return SLASH_TRIGGERS.includes(v);
    };

    // 我们在 document 层面捕获 keydown，这样优先级比 SillyTavern 自己的 slash parser 还高
    document.addEventListener('keydown', (e) => {
      // 只关心回车
      if (e.key !== 'Enter' || e.shiftKey) return;

      const active = document.activeElement;
      if (!active) return;
      if (active.tagName !== 'TEXTAREA' && active.tagName !== 'INPUT') return;

      const curVal = active.value || '';
      if (!isTriggerText(curVal)) return;

      // 如果输入的是 /eb /ed /记忆表 /memory
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();

      // 清空输入框，避免真的发出去
      active.value = '';

      // 打开面板
      openPanel();
    }, true);

    // 再兜底一层：点“发送按钮”也劫持
    const tryBindSendButton = () => {
      const sendBtn = document.querySelector('#send_button, #send_message_button, #send_now, .send_button, button.send_button');
      const inputBox = document.getElementById('send_textarea') || document.querySelector('textarea');

      if (!sendBtn || !inputBox) return false;

      sendBtn.addEventListener('click', (e) => {
        const curVal = (inputBox.value || '').trim();
        if (isTriggerText(curVal)) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation?.();
          inputBox.value = '';
          openPanel();
        }
      }, true);

      return true;
    };

    // 发送键可能是动态渲染的，所以轮询几次尝试挂监听
    let tries = 0;
    const t = setInterval(() => {
      if (tryBindSendButton() || ++tries > 10) clearInterval(t);
    }, 800);
  }

  // ====== 5. “记忆表”按钮进到每条 AI 消息卡片的功能区（作为额外入口） ======
  function injectPerMessageButton() {
    // 监听这个按钮的点击
    document.addEventListener('click', (e) => {
      const hit = e.target && e.target.closest && e.target.closest('.eb-open-panel');
      if (!hit) return;
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation?.();
      openPanel();
    }, true);

    // 轮询把按钮塞到 .extraMesButtons 里
    function addBtnToAllMessages() {
      document.querySelectorAll('.extraMesButtons').forEach(box => {
        if (box.querySelector('.eb-open-panel')) return;
        const div = document.createElement('div');
        div.className = 'mes_button eb-open-panel';
        div.textContent = '记忆表';
        div.title = '打开艾宾浩斯词汇导师';
        div.style.cursor = 'pointer';
        box.appendChild(div);
      });
    }

    let tries = 0;
    const t = setInterval(() => {
      addBtnToAllMessages();
      if (++tries > 10) clearInterval(t);
    }, 800);
  }

  // ====== 6. 初始化顺序 ======
  function init() {
    // 把面板先准备好（隐藏）
    ensurePanelExists();

    // 把导航栏学位帽塞进去并且疯狂绑定监听
    bindToolbarClickWatchdog();

    // 给输入框加 /eb /记忆表 触发器
    bindSlashIntercept();

    // 给每条消息的操作栏加“记忆表”按钮
    injectPerMessageButton();

    console.log('[EbbinghausTrainer] super-sticky init complete.');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    init();
  } else {
    document.addEventListener('DOMContentLoaded', init);
  }
})();
