// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
// 这是为艾宾浩斯学习插件最终优化的 manager.js 版本。

// --- 核心依赖导入 ---
import { TTable } from "./tTableManager.js";
import applicationFunctionManager from "../services/appFuncManager.js";
import { defaultSettings } from "../data/pluginSetting.js";
import { buildSheetsByTemplates, convertOldTablesToNewSheets } from "../index.js";
import { createProxy, createProxyWithUserSetting } from "../utils/codeProxy.js";
import { generateRandomString } from "../utils/utility.js";

// --- UI 相关导入 ---
// 我们只保留了与刷新“数据”视图相关的函数，其他UI管理的JS可以后续一并删除
import { refreshContextView } from "../scripts/editor/chatSheetsDataView.js"; 
// 这个函数是用来在UI上更新状态的，虽然UI简化了，但保留它是个好习惯
import { updateSystemMessageTableStatus } from "../scripts/renderer/tablePushToChat.js";


let derivedData = {};

export const APP = applicationFunctionManager;

export const USER = {
    getSettings: () => APP.power_user,
    saveSettings: () => APP.saveSettings(),
    saveChat: () => APP.saveChat(),
    getContext: () => APP.getContext(),
    getChatPiece: (deep = 0) => { // 简化了 direction 参数，我们通常只向上查找
        const chat = APP.getContext().chat;
        if (!chat || chat.length === 0) return { piece: null, deep: -1 };

        let index = chat.length - 1 - deep;
        if (index < 0) return { piece: null, deep: -1 };

        while (chat[index]?.is_user === true) {
            index--;
            if (index < 0 || !chat[index]) return { piece: null, deep: -1 };
        }
        return { piece: chat[index], deep: index };
    },
    loadUserAllTemplates() {
        // 这个函数用于加载全局模板，是我们的核心数据表的基础
        let templates = USER.getSettings().table_database_templates;
        if (!Array.isArray(templates)) {
            templates = [];
            USER.getSettings().table_database_templates = templates;
            USER.saveSettings();
        }
        return templates;
    },
    tableBaseSetting: createProxyWithUserSetting('muyoo_dataTable'),
    tableBaseDefaultSettings: { ...defaultSettings },
};

export const BASE = {
    Sheet: TTable.Sheet,
    SheetTemplate: TTable.Template,
    refreshContextView: refreshContextView,
    updateSystemMessageTableStatus: updateSystemMessageTableStatus,
    get templates() {
        return USER.loadUserAllTemplates();
    },
    sheetsData: new Proxy({}, {
        // get 和 set 逻辑可以简化，因为我们只使用 'context'
        get() {
            const metadata = USER.getContext().chatMetadata ?? {};
            metadata.sheets = metadata.sheets ?? [];
            USER.getContext().chatMetadata = metadata;
            return metadata.sheets;
        },
        set(_, __, value) {
            const metadata = USER.getContext().chatMetadata ?? {};
            metadata.sheets = value;
            USER.getContext().chatMetadata = metadata;
            return true;
        }
    }),
    getChatSheets(process = () => {}) {
        DERIVED.any.chatSheetMap = DERIVED.any.chatSheetMap || {};
        const sheets = [];
        BASE.sheetsData.forEach(sheetData => { // 直接使用 sheetsData (它就是context)
            if (!DERIVED.any.chatSheetMap[sheetData.uid]) {
                DERIVED.any.chatSheetMap[sheetData.uid] = new BASE.Sheet(sheetData.uid);
            }
            process(DERIVED.any.chatSheetMap[sheetData.uid]);
            sheets.push(DERIVED.any.chatSheetMap[sheetData.uid]);
        });
        return sheets;
    },
    getChatSheet(uid) {
        // 简化逻辑
        DERIVED.any.chatSheetMap = DERIVED.any.chatSheetMap || {};
        if (DERIVED.any.chatSheetMap[uid]) {
            return DERIVED.any.chatSheetMap[uid];
        }
        if (BASE.sheetsData.some(sheet => sheet.uid === uid)) {
            const newSheet = new BASE.Sheet(uid);
            DERIVED.any.chatSheetMap[uid] = newSheet;
            return newSheet;
        }
        return null;
    },
    // ---- 以下是为我们的 index.js 定制的、更清晰的辅助函数 ----
    createTemplateSheet(cols, rows, name) {
        const newTemplate = new BASE.SheetTemplate().createNewTemplate(cols, rows, false);
        newTemplate.name = name;
        return newTemplate;
    },
    isSheetExist(name) { // 简化了参数，因为我们只在全局模板中检查
        return BASE.templates.some(t => t.name === name);
    },
    getTemplateSheet(name) {
        const templateData = BASE.templates.find(t => t.name === name);
        if (templateData) {
            return new BASE.SheetTemplate(templateData.uid);
        }
        return null;
    },
    // --------------------------------------------------------
    getLastSheetsPiece() { // 简化，我们通常只需要最新的
        const chat = APP.getContext().chat;
        if (!chat || chat.length === 0) return { deep: -1, piece: null }; // 返回null而不是initHashSheet
        
        for (let i = chat.length - 1; i >= 0; i--) {
            if (chat[i].is_user === true) continue;
            if (chat[i].hash_sheets) return { deep: i, piece: chat[i] };
            if (chat[i].dataTable) { // 保留旧数据兼容性逻辑
                convertOldTablesToNewSheets(chat[i].dataTable, chat[i]);
                return { deep: i, piece: chat[i] };
            }
        }
        return { deep: -1, piece: null }; // 如果找不到，也返回null
    },
    getReferencePiece() {
        const { piece } = BASE.getLastSheetsPiece();
        // 如果找不到任何历史表格数据，则首次初始化
        if (!piece) {
            const { piece: currentPiece } = USER.getChatPiece();
            buildSheetsByTemplates(currentPiece);
            return currentPiece;
        }
        return piece;
    },
    hashSheetsToSheets(hashSheets) {
        if (!hashSheets) return [];
        return BASE.getChatSheets((sheet) => {
            sheet.hashSheet = hashSheets[sheet.uid] ?? [sheet.hashSheet[0]]; // 使用 ?? 操作符简化
        });
    },
    // initHashSheet 函数可以被 getReferencePiece 的逻辑覆盖，故移除
};

export const EDITOR = {
    // 简化，我们只需要弹窗提示
    info: (message, detail = '', timeout = 2000) => toastr.info(message, detail, { timeOut: timeout }),
    success: (message, detail = '', timeout = 1500) => toastr.success(message, detail, { timeOut: timeout }),
    warning: (message, detail = '', timeout = 3000) => toastr.warning(message, detail, { timeOut: timeout }),
    error: (message, detail = '', error, timeout = 5000) => {
        console.error(message, detail, error);
        toastr.error(`${message}<br><small>${detail}</small>`, 'Error', { timeOut: timeout });
    },
};

export const DERIVED = {
    get any() {
        return createProxy(derivedData);
    },
};

export const SYSTEM = {
    // 简化，移除我们不再需要的函数
    getTemplate: (name) => {
        // 硬编码插件路径，让它更健壮
        return APP.renderExtensionTemplateAsync('third-party/Ebbinghaus-Learning-System/assets/templates', name);
    },
    generateRandomString: generateRandomString,
};
