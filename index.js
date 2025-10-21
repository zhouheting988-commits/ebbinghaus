// Ebbinghaus Tutor - Standalone Extension v5.0 (Final, Module-based version)
// Author: {{user}} & Gemini

const extensionName = "Ebbinghaus Tutor";
const extensionId = "ebbinghaus-tutor";
const dataFileName = "ebbinghaus_data.json";
let ebbinghausData = {};
let isPanelVisible = false;

// 默认数据结构
const defaultData = {
    Vocabulary_Mastery: { "Day 1": { "Level_0_New": "", "Level_1": "", "Level_2": "", "Level_3": "", "Level_4": "", "Level_5_Mastered_Today": "" }},
    Word_Lists: {},
    Ebbinghaus_Schedule: {
        "1": { "NewList": "List1", "Review1": "", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
        "2": { "NewList": "List2", "Review1": "List1", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
        "3": { "NewList": "List3", "Review1": "List1", "Review2": "List2", "Review3": "", "Review4": "", "Review5": "" }
    },
    Study_Control: { "Current_Day": "1", "Current_Round": "1" }
};

// --- 数据处理核心函数 (这部分逻辑不变) ---
async function loadData() { try { const file = await SillyTavern.fs.read(`${extensionName}/${dataFileName}`); ebbinghausData = file ? JSON.parse(file) : defaultData; } catch (err) { console.log(`${extensionName}: Data file not found. Creating.`); ebbinghausData = defaultData; await saveData(); } }
async function saveData() { try { await SillyTavern.fs.write(`${extensionName}/${dataFileName}`, JSON.stringify(ebbinghausData, null, 4)); } catch (err) { console.error(`${extensionName}: Failed to save data.`, err); } if (isPanelVisible) renderUI(); }
function processAiCommand(text) { const commandRegex = /【SYSTEM】\[EBB_COMMAND\|(.*?)]/g; let match; while ((match = commandRegex.exec(text)) !== null) { try { const params = new URLSearchParams(match[1].replace(/&/g, '%26').replace(/,/g, '&')); const command = Object.fromEntries(params.entries()); switch(command.action) { case 'add_new_words': handleAddNewWords(command.words, command.day); break; case 'move_word': handleMoveWord(command.word, command.from, command.to, command.day); break; case 'archive_mastered': handleArchiveMastered(command.listName, command.day); break; case 'demote_word': handleDemoteWord(command.word, command.listName, command.day); break; case 'advance_day': handleAdvanceDay(); break; } } catch (e) { console.error(`${extensionName}: Error parsing command`, e); } } }
function handleAddNewWords(words, day) { const dayKey = `Day ${day}`; if (!ebbinghausData.Vocabulary_Mastery[dayKey]) ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" }; let currentWords = ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New.split(',').filter(Boolean); let newWords = words.split(',').filter(w => !currentWords.includes(w.trim())); currentWords.push(...newWords.map(w => w.trim())); ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New = currentWords.join(','); saveData(); }
function handleMoveWord(word, from, to, day) { const dayKey = `Day ${day}`; const dayData = ebbinghausData.Vocabulary_Mastery[dayKey]; if (!dayData) return; let cleanWord = word.trim(); let fromWords = dayData[from]?.split(',').filter(Boolean).map(w => w.trim()) || []; const index = fromWords.indexOf(cleanWord); if (index > -1) { fromWords.splice(index, 1); dayData[from] = fromWords.join(','); } let toWords = dayData[to]?.split(',').filter(Boolean).map(w => w.trim()) || []; if (!toWords.includes(cleanWord)) { toWords.push(cleanWord); dayData[to] = toWords.join(','); } saveData(); }
function handleArchiveMastered(listName, day) { const dayKey = `Day ${day}`; const masteredWords = ebbinghausData.Vocabulary_Mastery[dayKey]?.Level_5_Mastered_Today; if (masteredWords) { let existingWords = ebbinghausData.Word_Lists[listName]?.split(',').filter(Boolean).map(w => w.trim()) || []; let newMasteredWords = masteredWords.split(',').filter(Boolean).map(w => w.trim()); let combined = [...new Set([...existingWords, ...newMasteredWords])]; ebbinghausData.Word_Lists[listName] = combined.join(','); ebbinghausData.Vocabulary_Mastery[dayKey].Level_5_Mastered_Today = ""; saveData(); } }
function handleDemoteWord(word, listName, day) { let cleanWord = word.trim(); if (ebbinghausData.Word_Lists[listName]) { let listWords = ebbinghausData.Word_Lists[listName].split(',').filter(Boolean).map(w => w.trim()); const index = listWords.indexOf(cleanWord); if (index > -1) { listWords.splice(index, 1); ebbinghausData.Word_Lists[listName] = listWords.join(','); } } handleAddNewWords(cleanWord, day); }
function handleAdvanceDay() { let nextDay = parseInt(ebbinghausData.Study_Control.Current_Day, 10) + 1; ebbinghausData.Study_Control.Current_Day = nextDay.toString(); const dayKey = `Day ${nextDay}`; if (!ebbinghausData.Vocabulary_Mastery[dayKey]) ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" }; saveData(); }

// --- 界面渲染 (逻辑不变，但由新方式调用) ---
function togglePanel() { const panel = document.getElementById(`${extensionId}-panel`); if (!panel) return; isPanelVisible = !isPanelVisible; panel.style.display = isPanelVisible ? 'block' : 'none'; if (isPanelVisible) renderUI(); }
function renderUI() { const container = document.getElementById(`${extensionId}-container`); if (!container || !ebbinghausData) return; const { Study_Control = {}, Vocabulary_Mastery = {}, Word_Lists = {} } = ebbinghausData; const currentDay = Study_Control.Current_Day || '1'; const currentDayMastery = { [`Day ${currentDay}`]: Vocabulary_Mastery[`Day ${currentDay}`] || {} }; let html = '<h4>Study Control</h4>' + createHtmlTable(Study_Control) + '<h4>Vocabulary Mastery (Current Day)</h4>' + createHtmlTable(currentDayMastery) + '<h4>Word Lists Archive</h4>' + createHtmlTable(Word_Lists); container.innerHTML = html; }
function createHtmlTable(data) { if (!data || Object.keys(data).length === 0) return `<p>No data available.</p>`; let tableHtml = '<table class="ebbinghaus-table">'; const firstRow = Object.values(data)[0]; if (typeof firstRow === 'object' && firstRow !== null) { const headers = new Set(); Object.values(data).forEach(row => Object.keys(row).forEach(header => headers.add(header))); const headerArray = Array.from(headers); tableHtml += '<thead><tr><th>ID</th>' + headerArray.map(h => `<th>${h}</th>`).join('') + '</tr></thead>'; tableHtml += '<tbody>'; for (const [rowKey, rowValue] of Object.entries(data)) { tableHtml += `<tr><td>${rowKey}</td>`; headerArray.forEach(header => { const cellValue = rowValue[header] || ''; tableHtml += `<td><div class="word-cell">${cellValue.toString().replace(/,/g, ', ')}</div></td>`; }); tableHtml += '</tr>'; } tableHtml += '</tbody>'; } else { tableHtml += '<thead><tr><th>Setting</th><th>Value</th></tr></thead>'; tableHtml += '<tbody>'; for (const [key, value] of Object.entries(data)) { tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`; } tableHtml += '</tbody>'; } tableHtml += '</table>'; return tableHtml; }

// --- 插件加载主入口 ---
jQuery(async () => {
    // 1. 加载插件数据
    await loadData();

    // 2. 加载HTML模板并注入到页面
    // 路径必须是相对于酒馆根目录的
    const templateUrl = `./extensions/${extensionName}/ebbinghaus-panel.html`;
    const response = await fetch(templateUrl);
    if (response.ok) {
        const html = await response.text();
        document.body.insertAdjacentHTML('beforeend', html);
        // 为新注入的HTML元素绑定事件
        document.getElementById(`${extensionId}-close-button`).addEventListener('click', togglePanel);
    } else {
        console.error(`${extensionName}: Could not load template file.`);
        return;
    }

    // 3. 在扩展设置列表中创建入口按钮 (最可靠的方式)
    const settingsList = document.querySelector('#extensions_settings > .list-group');
    if (settingsList) {
        const button = document.createElement('div');
        button.classList.add('list-group-item');
        button.innerHTML = `
            <div class="d-flex w-100 justify-content-between">
                <h5 class="mb-1">
                    <span class="fa-solid fa-book-open"></span>
                    ${extensionName}
                </h5>
            </div>
            <small class="text-muted">Click to open the vocabulary management panel.</small>
        `;
        button.addEventListener('click', togglePanel);
        settingsList.appendChild(button);
    }

    // 4. 监听AI回复事件
    SillyTavern.chat.completions.addEventListener('streamingPart', (event) => {
        if (event.detail.type === 'MESSAGE_UPDATE' && event.detail.data.is_final) {
            processAiCommand(event.detail.data.message);
        }
    });

    console.log(`______________________${extensionName}: 加载完成______________________`);
});
