// 最小入口：加载后在控制台打日志 + 加一个工具栏按钮，证明扩展已运行
(function () {
  const ctx = SillyTavern.getContext();
  const { eventSource, event_types, addToolbarButton } = ctx;

  function init() {
    console.log("[MemorySheet] Extension loaded.");
    if (typeof addToolbarButton === 'function') {
      addToolbarButton("记忆表测试", () => {
        alert("入口OK：扩展已加载并能响应点击。");
      });
    }
  }

  // 等应用就绪再初始化（官方文档推荐的事件）
  eventSource.on(event_types.APP_READY, init);
})();
