// Ebbinghaus Trainer · robust entry for mobile
(function () {
  // —— 统一的面板（现在是占位，验证入口用） ——
  function openPanel() {
    let panel = document.getElementById('eb-trainer-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'eb-trainer-panel';
      Object.assign(panel.style, {
        position: 'fixed', right: '16px', bottom: '72px', zIndex: 2147483647,
        width: '340px', maxHeight: '60vh', overflow: 'auto',
        background: '#fff', border: '1px solid #ccc', borderRadius: '12px',
        boxShadow: '0 6px 18px rgba(0,0,0,.25)', padding: '12px'
      });
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>艾宾浩斯词汇导师</strong>
          <button id="eb-panel-close" style="border:0;background:#eee;padding:4px 8px;border-radius:8px;cursor:pointer;">关闭</button>
        </div>
        <div style="font-size:13px;color:#666;line-height:1.5;">
          入口就绪 ✅（扩展已运行）<br/>
          这三枚按钮当前为占位，用来验证事件钩子；下一步我会把真实逻辑接上。
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button id="eb-start"  style="padding:6px 10px;border-radius:8px;">开始学习（空）</button>
          <button id="eb-review" style="padding:6px 10px;border-radius:8px;">复习（空）</button>
          <button id="eb-end"    style="padding:6px 10px;border-radius:8px;">结束今天（空）</button>
        </div>
      `;
      document.body.appendChild(panel);
      document.getElementById('eb-panel-close').onclick = () => panel.remove();
      document.getElementById('eb-start').onclick  = () => alert('StartStudy() 占位触发');
      document.getElementById('eb-review').onclick = () => alert('ReviewLists() 占位触发');
      document.getElementById('eb-end').onclick    = () => alert('EndDay() 占位触发');
    }
  }

  // —— 入口#1：浮动按钮（移动端稳定可见） ——
  function addFloatingButton() {
    if (document.getElementById('eb-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'eb-fab';
    btn.textContent = '记忆表';
    Object.assign(btn.style, {
      position: 'fixed', left: '16px', top: '16px',
      zIndex: 2147483647,
      padding: '10px 14px', borderRadius: '12px', border: '1px solid #999',
      background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.2)', cursor: 'pointer'
    });
    btn.onclick = openPanel;
    document.body.appendChild(btn);
  }

  // —— 入口#2：本地斜杠命令（不依赖 ST 的 registerSlashCommand） ——
  function addLocalSlash() {
    // 监听“发送”动作：回车 或 发送按钮
    const tryBind = () => {
      const input = document.getElementById('send_textarea') || document.querySelector('textarea');
      const sendBtn = document.querySelector('#send_button, #send_message_button, #send_now, .send_button');
      if (!input) return false;

      const tryOpen = () => {
        const v = (input.value || '').trim();
        if (v === '/记忆表' || v === '/eb' || v === '/memory') {
          input.value = '';
          openPanel();
          return true;
        }
        return false;
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (tryOpen()) { e.preventDefault(); e.stopPropagation(); }
        }
      }, true);

      if (sendBtn) {
        sendBtn.addEventListener('click', () => { tryOpen(); }, true);
      }

      // 打开输入框获得焦点时提示一次
      input.addEventListener('focus', () => {
        input.placeholder = (input.placeholder || '') + ' （输入 /记忆表 可打开面板）';
      }, { once: true });

      return true;
    };

    // 输入框是动态渲染的，延迟多试几次
    let tries = 0;
    const timer = setInterval(() => {
      if (tryBind() || ++tries > 10) clearInterval(timer);
    }, 500);
  }

  // —— 入口#3：消息卡片按钮（每条 AI 消息旁边出现一个“记忆表”） ——
  function addMessageButton() {
    // 用事件代理，适配后续渲染的消息
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.eb-open-panel');
      if (el) openPanel();
    });
    // 首次渲染时试着挂一点
    const inject = () => {
      document.querySelectorAll('.extraMesButtons').forEach(box => {
        if (box.querySelector('.eb-open-panel')) return;
        const div = document.createElement('div');
        div.className = 'mes_button eb-open-panel';
        div.textContent = '记忆表';
        div.title = '打开艾宾浩斯词汇导师';
        box.appendChild(div);
      });
    };
    // 多试几次，适配移动端延迟渲染
    let count = 0;
    const t = setInterval(() => { inject(); if (++count > 10) clearInterval(t); }, 800);
  }

  // ——（可选）尝试注册官方 toolbar / slash（部分版本可能不可见） ——
  function tryOfficialEntries() {
    try {
      const ctx = window.SillyTavern?.getContext?.();
      const es = ctx?.eventSource, et = ctx?.event_types;
      const addBtn = ctx?.addToolbarButton || ctx?.ui?.addToolbarButton;
      const regSlash = ctx?.registerSlashCommand || window.registerSlashCommand;

      if (es && et && typeof addBtn === 'function') {
        es.on(et.APP_READY, () => addBtn('记忆表', openPanel));
      }
      if (typeof regSlash === 'function') {
        regSlash('记忆表', '打开艾宾浩斯词汇导师', openPanel);
      }
    } catch (e) {
      console.log('[EbbinghausTrainer] official entries unavailable on this build');
    }
  }

  function init() {
    addFloatingButton();
    addLocalSlash();
    addMessageButton();
    tryOfficialEntries(); // 能用就用，不能用就靠上面三个入口
    console.log('[EbbinghausTrainer] entry initialized');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
