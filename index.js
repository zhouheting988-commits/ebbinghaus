// ===== MemorySheet: Emergency Entry Patch =====
(function () {
  function showToast(msg) {
    try { alert(msg); } catch (e) { console.log('[MemorySheet]', msg); }
  }

  // 1) 悬浮按钮（右下角）
  function addFloatingButton() {
    if (document.getElementById('memsheet-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'memsheet-fab';
    btn.textContent = '记忆表';
    Object.assign(btn.style, {
      position: 'fixed', right: '16px', bottom: '16px', zIndex: 99999,
      padding: '10px 14px', borderRadius: '12px', border: '1px solid #999',
      background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,.15)', cursor: 'pointer'
    });
    btn.onclick = openPanel;
    document.body.appendChild(btn);
  }

  // 2) 简易面板（先占位，将来挂真正的功能）
  function openPanel() {
    let panel = document.getElementById('memsheet-panel');
    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'memsheet-panel';
      Object.assign(panel.style, {
        position: 'fixed', right: '16px', bottom: '64px', zIndex: 99999,
        width: '320px', maxHeight: '60vh', overflow: 'auto',
        background: '#fff', border: '1px solid #ccc', borderRadius: '12px',
        boxShadow: '0 2px 12px rgba(0,0,0,.2)', padding: '12px'
      });
      panel.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <strong>Memory Sheet · 面板</strong>
          <button id="memsheet-close" style="border:0;background:#eee;padding:4px 8px;border-radius:8px;cursor:pointer;">关闭</button>
        </div>
        <div style="font-size:13px;color:#666;line-height:1.5;">
          入口已就绪 ✅ 说明扩展加载成功。<br/>
          现在你可以：<br/>
          • 点击“开始学习（空壳）”试运行事件钩子；<br/>
          • 先验证入口，再把真正逻辑挂载到这些按钮。<br/>
        </div>
        <div style="margin-top:10px;display:flex;gap:8px;flex-wrap:wrap;">
          <button id="memsheet-start" style="padding:6px 10px;border-radius:8px;">开始学习（空壳）</button>
          <button id="memsheet-review" style="padding:6px 10px;border-radius:8px;">复习（空壳）</button>
          <button id="memsheet-end" style="padding:6px 10px;border-radius:8px;">结束今天（空壳）</button>
        </div>
      `;
      document.body.appendChild(panel);

      document.getElementById('memsheet-close').onclick = () => panel.remove();
      document.getElementById('memsheet-start').onclick = () => showToast('StartStudy() 占位被触发');
      document.getElementById('memsheet-review').onclick = () => showToast('ReviewLists() 占位被触发');
      document.getElementById('memsheet-end').onclick = () => showToast('EndDay() 占位被触发');
    }
  }

  // 3) 斜杠命令 /记忆表（若 ST 暴露 registerSlashCommand 则注册；否则忽略）
  function registerSlash() {
    const api = window.SillyTavern?.getContext?.();
    const register = api?.registerSlashCommand || window.registerSlashCommand;
    if (typeof register === 'function') {
      register('记忆表', '打开 Memory Sheet 面板', openPanel);
    }
  }

  // 安全初始化：页面就绪后执行
  function ready(fn) {
    if (document.readyState === 'complete' || document.readyState === 'interactive') fn();
    else document.addEventListener('DOMContentLoaded', fn);
  }

  ready(() => {
    addFloatingButton();
    registerSlash();
    console.log('[MemorySheet] Emergency entry patch loaded.');
  });
})();
