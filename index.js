// Ebbinghaus Trainer · toolbar icon entry (no floating button)
(function () {
  // —— 面板（占位：确认入口可用，后续把真逻辑接到三个按钮） ——
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
          这三枚按钮目前为占位，用来验证事件钩子；下一步把真逻辑接进来。
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

  // —— 顶部工具栏图标（优先采用官方 API，标签只用 Emoji 图标，不显示文字） ——
  function addToolbarIcon() {
    try {
      const ctx = window.SillyTavern?.getContext?.();
      const es = ctx?.eventSource, et = ctx?.event_types;
      const addBtn = ctx?.addToolbarButton || ctx?.ui?.addToolbarButton;

      if (es && et && typeof addBtn === 'function') {
        es.on(et.APP_READY, () => {
          // 仅用 emoji 作为“按钮标题”，能显著降低被折叠到“更多”的概率
          addBtn('📚', openPanel);
          console.log('[EbbinghausTrainer] toolbar emoji button registered');
        });
      }

      // Fallback：直接往设置按钮旁边插入一个小图标（即使官方 API 在某些版本不可用，也有图标）
      setTimeout(() => {
        if (document.getElementById('eb-toolbar-icon')) return;
        const anchor = document.getElementById('extensions-settings-button') ||
                       document.querySelector('#extensions-settings-button') ||
                       document.querySelector('.extensions-settings-button');

        if (anchor && anchor.parentNode) {
          const btn = document.createElement('button');
          btn.id = 'eb-toolbar-icon';
          btn.title = '艾宾浩斯词汇导师';
          btn.textContent = '📚';
          Object.assign(btn.style, {
            marginLeft: '8px',
            padding: '4px 8px',
            border: '1px solid var(--SmartThemeBorderColor, #999)',
            background: 'var(--SmartThemeBodyColor, #fff)',
            borderRadius: '8px',
            lineHeight: '1',
            cursor: 'pointer'
          });
          btn.addEventListener('click', openPanel);
          anchor.parentNode.insertBefore(btn, anchor.nextSibling);
          console.log('[EbbinghausTrainer] toolbar emoji fallback injected');
        }
      }, 1200);
    } catch (e) {
      console.warn('[EbbinghausTrainer] addToolbarIcon failed', e);
    }
  }

  // —— 本地斜杠命令（/记忆表 或 /eb 或 /memory） ——
  function addLocalSlash() {
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
      return true;
    };

    let tries = 0;
    const timer = setInterval(() => {
      if (tryBind() || ++tries > 10) clearInterval(timer);
    }, 500);
  }

  // —— 消息卡片按钮（每条 AI 消息“更多”按钮那行会多一枚“记忆表”） ——
  function addMessageButton() {
    document.addEventListener('click', (e) => {
      const el = e.target.closest('.eb-open-panel');
      if (el) openPanel();
    });
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
    addToolbarIcon();   // 顶部“📚”图标（首选）
    addLocalSlash();    // /记忆表 /eb /memory
    addMessageButton(); // 卡片行“记忆表”按钮
    console.log('[EbbinghausTrainer] entry (toolbar icon) initialized');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
