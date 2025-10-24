// Ebbinghaus Trainer · stable entry
(function () {
  // —— 面板：先做占位，验证入口可用 ——
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
          下面三枚按钮当前为占位，用于验证事件钩子；等你把表格/规则给我后，我把真实逻辑接上。
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

  // —— 入口#1：顶部工具栏按钮（可能在手机端“⋯”里） ——
  function addToolbarBtn() {
    try {
      const ctx = window.SillyTavern?.getContext?.();
      const es = ctx?.eventSource, et = ctx?.event_types;
      const addBtn = ctx?.addToolbarButton || ctx?.ui?.addToolbarButton;
      if (es && et && typeof addBtn === 'function') {
        es.on(et.APP_READY, () => {
          addBtn('记忆表', openPanel);
          console.log('[EbbinghausTrainer] toolbar button registered');
        });
        return true;
      }
    } catch (e) { console.warn(e); }
    return false;
  }

  // —— 入口#2：斜杠命令 /记忆表 ——
  function addSlash() {
    try {
      const ctx = window.SillyTavern?.getContext?.();
      const register = ctx?.registerSlashCommand || window.registerSlashCommand;
      if (typeof register === 'function') {
        register('记忆表', '打开艾宾浩斯词汇导师', openPanel);
        console.log('[EbbinghausTrainer] slash command registered');
        return true;
      }
    } catch (e) { console.warn(e); }
    return false;
  }

  // —— 入口#3：浮动按钮（高层级，移动端可见） ——
  function addFloatingButton() {
    if (document.getElementById('eb-fab')) return;
    const btn = document.createElement('button');
    btn.id = 'eb-fab';
    btn.textContent = '记忆表';
    Object.assign(btn.style, {
      position: 'fixed',
      left: '16px', top: '16px',  // 避免被底部遮挡
      zIndex: 2147483647,
      padding: '10px 14px', borderRadius: '12px', border: '1px solid #999',
      background: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,.2)', cursor: 'pointer'
    });
    btn.onclick = openPanel;
    document.body.appendChild(btn);
  }

  function init() {
    const ok1 = addToolbarBtn();
    const ok2 = addSlash();
    setTimeout(addFloatingButton, (ok1 || ok2) ? 1200 : 300);
    console.log('[EbbinghausTrainer] entry initialized');
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') init();
  else document.addEventListener('DOMContentLoaded', init);
})();
