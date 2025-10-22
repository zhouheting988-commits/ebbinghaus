// MODIFIED FOR EBBINGHAUS LEARNING SYSTEM
// 这是一个清理了对已删除文件（如 tableTemplateEditView.js）依赖的 manager.js 版本。

import { TTable } from "./tTableManager.js";
import applicationFunctionManager from "../services/appFuncManager.js";
import { defaultSettings } from "../data/pluginSetting.js";
import { buildSheetsByTemplates, convertOldTablesToNewSheets } from "../index.js";
import { createProxy, createProxyWithUserSetting } from "../utils/codeProxy.js";
import { refreshContextView } from "../scripts/editor/chatSheetsDataView.js"; // 保留，用于刷新“数据”视图
import { updateSystemMessageTableStatus } from "../scripts/renderer/tablePushToChat.js"; // 保留
import { generateRandomString } from "../utils/utility.js"; // 保留系统工具

// 删除了所有其他不再需要的导入

let derivedData = {};

export const APP = applicationFunctionManager;

export const USER = {
    getSettings: () => APP.power_user,
    saveSettings: () => APP.saveSettings(),
    saveChat: () => APP.saveChat(),
    getContext: () => APP.getContext(),
    getChatPiece: (deep = 0, direction = 'up') => {
        const chat = APP.getContext().chat;
        if (!chat || chat.length === 0 || deep >= chat.length) return { piece: null, deep: -1 };
        let index = chat.length - 1 - deep;
        while (chat[index]?.is_user === true) { // 增加 ?. 避免undefined错误
            if (direction === 'up') index--;
            else index++;
            if (!chat[index]) return { piece: null, deep: -1 };
        }
        return { piece: chat[index], deep: index };
    },
    loadUserAllTemplates() {
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
    refreshContextView: refreshContextView, // 保留
    updateSystemMessageTableStatus: updateSystemMessageTableStatus, // 保留
    get templates() {
        return USER.loadUserAllTemplates();
    },
    sheetsData: new Proxy({}, {
        get(_, target) {
            switch (target) {
                case 'context':
                    if (!USER.getContext().chatMetadata) USER.getContext().chatMetadata = {};
                    if (!USER.getContext().chatMetadata.sheets) USER.getContext().chatMetadata.sheets = [];
                    return USER.getContext().chatMetadata.sheets;
                default:
                    // 简化，我们只关心 context
                    if (!USER.getContext().chatMetadata) USER.getContext().chatMetadata = {};
                    if (!USER.getContext().chatMetadata.sheets) USER.getContext().chatMetadata.sheets = [];
                    return USER.getContext().chatMetadata.sheets;
            }
        },
        set(_, target, value) {
            if (target === 'context') {
                if (!USER.getContext().chatMetadata) USER.getContext().chatMetadata = {};
                USER.getContext().chatMetadata.sheets = value;
                return true;
            }
            throw new Error(`Cannot set sheetsData target: ${target}`);
        }
    }),
    getChatSheets(process = () => {}) {
        DERIVED.any.chatSheetMap = DERIVED.any.chatSheetMap || {};
        const sheets = [];
        BASE.sheetsData.context.forEach(sheetData => {
            if (!DERIVED.any.chatSheetMap[sheetData.uid]) {
                const newSheet = new BASE.Sheet(sheetData.uid);
                DERIVED.any.chatSheetMap[sheetData.uid] = newSheet;
            }
            process(DERIVED.any.chatSheetMap[sheetData.uid]);
            sheets.push(DERIVED.any.chatSheetMap[sheetData.uid]);
        });
        return sheets;
    },
    getChatSheet(uid) {
        if (DERIVED.any.chatSheetMap && DERIVED.any.chatSheetMap[uid]) {
            return DERIVED.any.chatSheetMap[uid];
        }
        if (BASE.sheetsData.context.some(sheet => sheet.uid === uid)) {
            const newSheet = new BASE.Sheet(uid);
            if (!DERIVED.any.chatSheetMap) DERIVED.any.chatSheetMap = {};
            DERIVED.any.chatSheetMap[uid] = newSheet;
            return newSheet;
        }
        return null;
    },
    createTemplateSheet(cols, rows, name) { // 新增一个简化版的创建Template的函数
        const newTemplate = new BASE.SheetTemplate().createNewTemplate(cols, rows, false);
        newTemplate.name = name;
        return newTemplate;
    },
    isSheetExist(name, domain, type) { // 新增一个检查函数
        return BASE.templates.some(t => t.name === name);
    },
    getTemplateSheet(name) { // 新增一个获取Template的函数
        const templateData = BASE.templates.find(t => t.name === name);
        if (templateData) {
            return new BASE.SheetTemplate(templateData.uid);
        }
        return null;
    },
    getLastSheetsPiece(deep = 0, cutoff = 1000, deepStartAtLastest = true, direction = 'up') {
        const chat = APP.getContext().chat;
        if (!chat || chat.length === 0) return { deep: -1, piece: BASE.initHashSheet() };
        
        const startIndex = deepStartAtLastest ? chat.length - deep - 1 : deep;
        for (let i = startIndex; direction === 'up' ? i >= 0 : i < chat.length; direction === 'up' ? i-- : i++) {
            if (i >= chat.length || i < 0) break;
            if (chat[i].is_user === true) continue;
            if (chat[i].hash_sheets) return { deep: i, piece: chat[i] };
            if (chat[i].dataTable) { // 兼容旧数据
                convertOldTablesToNewSheets(chat[i].dataTable, chat[i]);
                return { deep: i, piece: chat[i] };
            }
        }
        return { deep: -1, piece: BASE.initHashSheet() };
    },
    getReferencePiece() {
        // 简化逻辑
        return BASE.getLastSheetsPiece().piece;
    },
    hashSheetsToSheets(hashSheets) {
        if (!hashSheets) return [];
        return BASE.getChatSheets((sheet) => {
            if (hashSheets[sheet.uid]) {
                sheet.hashSheet = hashSheets[sheet.uid];
            } else {
                sheet.initHashSheet();
            }
        });
    },
    initHashSheet() {
        const { piece: currentPiece } = USER.getChatPiece();
        if (BASE.sheetsData.context.length === 0) {
            buildSheetsByTemplates(currentPiece);
            if (currentPiece?.hash_sheets) return currentPiece;
        }
        const hash_sheets = {};
        BASE.sheetsData.context.forEach(sheet => {
            hash_sheets[sheet.uid] = [sheet.hashSheet[0]];
        });
        return { hash_sheets };
    }
};

export const EDITOR = {
    Popup: APP.Popup,
    callGenericPopup: APP.callGenericPopup,
    POPUP_TYPE: APP.POPUP_TYPE,
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
    getTemplate: (name) => {
        return APP.renderExtensionTemplateAsync('third-party/st-memory-enhancement/assets/templates', name);
    },
    generateRandomString: generateRandomString,
};
