// /scripts/ui/uiManager.js
import { loadSettings } from '../settings/userExtensionSetting.js';
import { executeTranslation } from '../../services/translate.js';
import { initAppHeaderTableDrawer, openAppHeaderTableDrawer } from '../renderer/appHeaderTableBaseDrawer.js';

/**
 * 初始化所有用户界面相关的组件和事件
 */
export function initializeUI() {
    // 1. 加载并应用用户设置，同时绑定设置界面的事件
    loadSettings();

    // 2. 初始化顶部的抽屉菜单
    initAppHeaderTableDrawer();
    
    // 3. 为我们自己添加的按钮绑定点击事件，用来打开抽屉
    $(document).on('click', '#open_ebbinghaus_system', function () {
        openAppHeaderTableDrawer('database'); // 默认打开“数据”视图
    });

    // 4. 应用界面翻译
    executeTranslation();
    
    console.log("[Ebbinghaus] UI Manager initialized successfully.");
}
