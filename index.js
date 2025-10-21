// Ebbinghaus Tutor - Standalone Extension v4.0 (Latest API for ST 1.12.0+)
// Author: {{user}} & Gemini

(function () {
    const extensionName = "Ebbinghaus Tutor";
    const extensionId = "ebbinghaus-tutor";
    const dataFileName = "ebbinghaus_data.json";
    let ebbinghausData = {};
    let isPanelVisible = false;

    // 默认数据结构 (不变)
    const defaultData = {
        Vocabulary_Mastery: { "Day 1": { "Level_0_New": "", "Level_1": "", "Level_2": "", "Level_3": "", "Level_4": "", "Level_5_Mastered_Today": "" }},
        Word_Lists: {},
        Ebbinghaus_Schedule: {
            "1": { "NewList": "List1", "Review1": "", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
            "2": { "NewList": "List2", "Review1": "List1", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
            "3": { "NewList": "List3", "Review1": "List1", "Review2": "List2", "Review3": "", "Review4": "", "Review5": "" }
            // 你需要在这里手动补充完整的艾宾浩斯计划表
        },
        Study_Control: { "Current_Day": "1", "Current_Round": "1" }
    };

    // --- 数据处理核心函数 (不变) ---
    async function loadData() { try { const file = await SillyTavern.fs.read(`${extensionName}/${dataFileName}`); ebbinghausData = file ? JSON.parse(file) : defaultData; } catch (err) { console.log(`${extensionName}: Data file not found. Creating.`); ebbinghausData = defaultData; await saveData(); } }
    async function saveData() { try { await SillyTavern.fs.write(`${extensionName}/${dataFileName}`, JSON.stringify(ebbinghausData, null, 4)); } catch (err) { console.error(`${extensionName}: Failed to save data.`, err); } if (isPanelVisible) renderUI(); }

    // --- 界面创建与渲染 (不变) ---
    function createPanel() { if (document.getElementById(`${extensionId}-panel`)) return; const panel = document.createElement('div'); panel.id = `${extensionId}-panel`; panel.classList.add('ebbinghaus-modal'); panel.innerHTML = `<div class="ebbinghaus-modal-content"><div class="ebbinghaus-modal-header"><h2>Ebbinghaus Tutor Data</h2><button id="${extensionId}-close-button" class="ebbinghaus-close-button">&times;</button></div><div id="${extensionId}-container" class="ebbinghaus-modal-body">Loading...</div></div>`; document.body.appendChild(panel); document.getElementById(`${extensionId}-close-button`).addEventListener('click', togglePanel); }
    function renderUI() { const container = document.getElementById(`${extensionId}-container`); if (!container || !ebbinghausData) return; const { Study_Control = {}, Vocabulary_Mastery = {}, Word_Lists = {} } = ebbinghausData; const currentDay = Study_Control.Current_Day || '1'; const currentDayMastery = { [`Day ${currentDay}`]: Vocabulary_Mastery[`Day ${currentDay}`] || {} }; let html = '<h4>Study Control</h4>' + createHtmlTable(Study_Control) + '<h4>Vocabulary Mastery (Current Day)</h4>' + createHtmlTable(currentDayMastery) + '<h4>Word Lists Archive</h4>' + createHtmlTable(Word_Lists); container.innerHTML = html; }
    function createHtmlTable(data) { if (!data || Object.keys(data).length === 0) return `<p>No data available.</p>`; let tableHtml = '<table class="ebbinghaus-table">'; const firstRow = Object.values(data)[0]; if (typeof firstRow === 'object' && firstRow !== null) { const headers = new Set(); Object.values(data).forEach(row => Object.keys(row).forEach(header => headers.add(header))); const headerArray = Array.from(headers); tableHtml += '<thead><tr><th>ID</th>' + headerArray.map(h => `<th>${h}</th>`).join('') + '</tr></thead>'; tableHtml += '<tbody>'; for (const [rowKey, rowValue] of Object.entries(data)) { tableHtml += `<tr><td>${rowKey}</td>`; headerArray.forEach(header => { const cellValue = rowValue[header] || ''; tableHtml += `<td><div class="word-cell">${cellValue.toString().replace(/,/g, ', ')}</div></td>`; }); tableHtml += '</tr>'; } tableHtml += '</tbody>'; } else { tableHtml += '<thead><tr><th>Setting</th><th>Value</th></tr></thead>'; tableHtml += '<tbody>'; for (const [key, value] of Object.entries(data)) { tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`; } tableHtml += '</tbody>'; } tableHtml += '</table>'; return tableHtml; }
    function togglePanel() { const panel = document.getElementById(`${extensionId}-panel`); if (!panel) return; isPanelVisible = !isPanelVisible; panel.style.display = isPanelVisible ? 'block' : 'none'; if (isPanelVisible) renderUI(); }

    // --- AI指令处理器 (不变) ---
    function processAiCommand(text) { const commandRegex = /【SYSTEM】\[EBB_COMMAND\|(.*?)]/g; let match; while ((match = commandRegex.exec(text)) !== null) { try { const params = new URLSearchParams(match[1].replace(/&/g, '%26').replace(/,/g, '&')); const command = Object.fromEntries(params.entries()); switch(command.action) { case 'add_new_words': handleAddNewWords(command.words, command.day); break; case 'move_word': handleMoveWord(command.word, command.from, command.to, command.day); break; case 'archive_mastered': handleArchiveMastered(command.listName, command.day); break; case 'demote_word': handleDemoteWord(command.word, command.listName, command.day); break; case 'advance_day': handleAdvanceDay(); break; } } catch (e) { console.error(`${extensionName}: Error parsing command`, e); } } }
    function handleAddNewWords(words, day) { const dayKey = `Day ${day}`; if (!ebbinghausData.Vocabulary_Mastery[dayKey]) ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" }; let currentWords = ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New.split(',').filter(Boolean); let newWords = words.split(',').filter(w => !currentWords.includes(w.trim())); currentWords.push(...newWords.map(w => w.trim())); ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New = currentWords.join(','); saveData(); }
    function handleMoveWord(word, from, to, day) { const dayKey = `Day ${day}`; const dayData = ebbinghausData.Vocabulary_Mastery[dayKey]; if (!dayData) return; let cleanWord = word.trim(); let fromWords = dayData[from]?.split(',').filter(Boolean).map(w => w.trim()) || []; const index = fromWords.indexOf(cleanWord); if (index > -1) { fromWords.splice(index, 1); dayData[from] = fromWords.join(','); } let toWords = dayData[to]?.split(',').filter(Boolean).map(w => w.trim()) || []; if (!toWords.includes(cleanWord)) { toWords.push(cleanWord); dayData[to] = toWords.join(','); } saveData(); }
    function handleArchiveMastered(listName, day) { const dayKey = `Day ${day}`; const masteredWords = ebbinghausData.Vocabulary_Mastery[dayKey]?.Level_5_Mastered_Today; if (masteredWords) { let existingWords = ebbinghausData.Word_Lists[listName]?.split(',').filter(Boolean).map(w => w.trim()) || []; let newMasteredWords = masteredWords.split(',').filter(Boolean).map(w => w.trim()); let combined = [...new Set([...existingWords, ...newMasteredWords])]; ebbinghausData.Word_Lists[listName] = combined.join(','); ebbinghausData.Vocabulary_Mastery[dayKey].Level_5_Mastered_Today = ""; saveData(); } }
    function handleDemoteWord(word, listName, day) { let cleanWord = word.trim(); if (ebbinghausData.Word_Lists[listName]) { let listWords = ebbinghausData.Word_Lists[listName].split(',').filter(Boolean).map(w => w.trim()); const index = listWords.indexOf(cleanWord); if (index > -1) { listWords.splice(index, 1); ebbinghausData.Word_Lists[listName] = listWords.join(','); } } handleAddNewWords(cleanWord, day); }
    function handleAdvanceDay() { let nextDay = parseInt(ebbinghausData.Study_Control.Current_Day, 10) + 1; ebbinghausData.Study_Control.Current_Day = nextDay.toString(); const dayKey = `Day ${nextDay}`; if (!ebbinghausData.Vocabulary_Mastery[dayKey]) ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" }; saveData(); }
    
    // --- 插件加载主入口 ---
    SillyTavern.chat.completions.addEventListener('streamingPart', (event) => { if (event.detail.type === 'MESSAGE_UPDATE' && event.detail.data.is_final) processAiCommand(event.detail.data.message); });

    // 使用 jQuery 的 document ready 来确保 SillyTavern 的 API 已经加载
    jQuery(async () => {
        await loadData();
        createPanel();

        // **这是新版酒馆的官方注册方法**
        const entry = {
            name: extensionName,
            icon: 'fa-solid fa-book-open', // Font Awesome 图标
            action: togglePanel, // 点击时执行的函数
        };

        // 通过官方API将入口添加到扩展菜单中
        SillyTavern.addExtensionEntry(entry);

        console.log(`${extensionName} has been successfully registered using the official API.`);
    });
})();
