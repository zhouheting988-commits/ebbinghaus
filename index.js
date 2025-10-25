// Ebbinghaus Trainer · toolbar icon (robust click binding)
(function () {
  const ICON_CLASS = 'fa-graduation-cap';

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
          这三枚按钮暂为占位，稍后把真逻辑接进来。
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

  // —— 顶部“原生风格”图标按钮 ——（加多重兜底绑定）
  function addNativeToolbarIcon() {
    const anchor = document.getElementById('extensions-settings-button')
               || document.querySelector('#extensions-settings-button')
               || document.querySelector('.extensions-settings-button');
    if (!anchor || !anchor.parentElement) return;
    if (document.getElementById('eb-toolbar-native')) return;

    const btn = document.createElement('div');
    btn.id = 'eb-toolbar-native';
    btn.className = 'menu_button';
    btn.title = '艾宾浩斯词汇导师';
    btn.setAttribute('role', 'button');
    btn.setAttribute('tabindex', '0');
    btn.style.userSelect = 'none';
    btn.style.pointerEvents = 'auto';
    btn.innerHTML = `<i class="fa-solid ${ICON_CLASS}"></i>`;

    // 直接绑定点击/触摸
    const fire = (e) => { e.preventDefault(); e.stopPropagation(); openPanel(); };
    btn.addEventListener('click', fire, true);
    btn.addEventListener('touchend', fire, true);
    btn.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') fire(e); }, true);

    anchor.parentElement.insertBefore(btn, anchor.nextSibling);

    // 全局事件代理（兜底：即使外层有捕获，也能命中）
    document.addEventListener('click', (e) => {
      if (e.target.closest('#eb-toolbar-native')) { fire(e); }
    }, true);

    console.log('[EbbinghausTrainer] native toolbar icon injected & bound');
  }

  // —— /记忆表 /eb /memory ——（备用入口）
  function addLocalSlash() {
    const tryBind = () => {
      const input = document.getElementById('send_textarea') || document.querySelector('textarea');
      const sendBtn = document.querySelector('#send_button, #send_message_button, #send_now, .send_button');
      if (!input) return false;

      const tryOpen = () => {
        const v = (input.value || '').trim();
        if (v === '/记忆表' || v === '/eb' || v === '/memory') {
          input.value = ''; openPanel(); return true;
        }
        return false;
      };

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          if (tryOpen()) { e.preventDefault(); e.stopPropagation(); }
        }
      }, true);
      if (sendBtn) sendBtn.addEventListener('click', () => { tryOpen(); }, true);
      return true;
    };

    let tries = 0;
    const t = setInterval(() => { if (tryBind() || ++tries > 10) clearInterval(t); }, 500);
  }

  // —— 消息卡片按钮（再备份一层）
  function addMessageButton() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.eb-open-panel');
      if (el) { e.preventDefault(); e.stopPropagation(); openPanel(); }
    }, true);

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
    let count = 0;
    const t = setInterval(() => { inject(); if (++count > 10) clearInterval(t); }, 800);
  }

  function init() {
    addNativeToolbarIcon();
    addLocalSlash();
    addMessageButton();
    console.log('[EbbinghausTrainer] entry initialized');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
