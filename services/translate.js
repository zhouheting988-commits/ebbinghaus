import applicationFunctionManager from "./appFuncManager.js";

let _lang = undefined;
let _translations = undefined;

/**
 * 异步获取翻译文件 (保留)
 */
async function fetchTranslations(locale) {
    // ... (代码保持不变)
}

/**
 * 获取翻译配置 (保留)
 */
async function getTranslationsConfig() {
    // ... (代码保持不变)
}

/**
 * 将翻译应用到 DOM 元素 (保留并简化)
 */
function applyTranslations(translations) {
    console.log("[Ebbinghaus] Applying UI translations...");
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        // 简化逻辑，只处理 key 存在的情况
        if (translations[key]) {
            // 移除对 title 的特殊处理，简化为只翻译 textContent
            element.textContent = translations[key];
        }
    });
}

/**
 * 对初始化加载的html应用翻译和本地化的主函数 (保留)
 */
export async function executeTranslation() {
    const { translations, lang } = await getTranslationsConfig();
    // 默认语言是中文，则无需翻译
    if (lang.startsWith('zh')) {
        return;
    }
    
    if (!translations || Object.keys(translations).length === 0) {
        console.warn("No translations found for locale:", lang);
        return;
    }

    applyTranslations(translations);
    console.log("Translation completed for locale:", lang);
}

// 移除了 switchLanguage 和 translating 函数
