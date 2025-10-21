// Ebbinghaus Tutor - Standalone Extension v2.0 with UI
// Author: {{user}} & Gemini

(function () {
    const extensionName = "Ebbinghaus Tutor";
    const dataFileName = "ebbinghaus_data.json";
    let ebbinghausData = {};
    let isPanelVisible = false;

    // 默认数据结构
    const defaultData = {
        Vocabulary_Mastery: {
            "Day 1": { "Level_0_New": "", "Level_1": "", "Level_2": "", "Level_3": "", "Level_4": "", "Level_5_Mastered_Today": "" }
        },
        Word_Lists: {},
        Ebbinghaus_Schedule: {
            "1": { "NewList": "List1", "Review1": "", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
            "2": { "NewList": "List2", "Review1": "List1", "Review2": "", "Review3": "", "Review4": "", "Review5": "" },
            "3": { "NewList": "List3", "Review1": "List1", "Review2": "List2", "Review3": "", "Review4": "", "Review5": "" }
            // 你需要在这里手动补充完整的艾宾浩斯计划表
        },
        Study_Control: {
            "Current_Day": "1",
            "Current_Round": "1"
        }
    };

    // --- 数据处理核心函数 ---
    async function loadData() {
        try {
            const fileContent = await SillyTavern.fs.read(`${extensionName}/${dataFileName}`);
            ebbinghausData = fileContent ? JSON.parse(fileContent) : defaultData;
        } catch (error) {
            console.log(`${extensionName}: Data file not found. Creating a new one.`);
            ebbinghausData = defaultData;
            await saveData();
        }
    }

    async function saveData() {
        try {
            await SillyTavern.fs.write(`${extensionName}/${dataFileName}`, JSON.stringify(ebbinghausData, null, 4));
            console.log(`${extensionName}: Data saved successfully.`);
        } catch (error) {
            console.error(`${extensionName}: Failed to save data.`, error);
        }
        renderUI(); // 每次保存后都刷新界面
    }

    // --- 界面创建与渲染 ---
    function createPanel() {
        // 创建主面板
        const panel = document.createElement('div');
        panel.id = 'ebbinghaus-panel';
        panel.classList.add('ebbinghaus-modal');
        panel.innerHTML = `
            <div class="ebbinghaus-modal-content">
                <div class="ebbinghaus-modal-header">
                    <h2>Ebbinghaus Tutor Data</h2>
                    <button id="ebbinghaus-close-button" class="ebbinghaus-close-button">&times;</button>
                </div>
                <div id="ebbinghaus-container" class="ebbinghaus-modal-body">
                    Loading...
                </div>
            </div>
        `;
        document.body.appendChild(panel);

        // 添加关闭按钮事件
        document.getElementById('ebbinghaus-close-button').addEventListener('click', togglePanel);
    }

    function renderUI() {
        const container = document.getElementById('ebbinghaus-container');
        if (!container || !ebbinghausData) return;
        
        const controlData = ebbinghausData.Study_Control || {};
        const masteryData = ebbinghausData.Vocabulary_Mastery || {};
        const wordListsData = ebbinghausData.Word_Lists || {};
        const currentDay = controlData.Current_Day || '1';
        const currentDayMastery = { [`Day ${currentDay}`]: masteryData[`Day ${currentDay}`] || {} };

        let html = '<h4>Study Control</h4>';
        html += createHtmlTable(controlData);

        html += '<h4>Vocabulary Mastery (Current Day)</h4>';
        html += createHtmlTable(currentDayMastery);

        html += '<h4>Word Lists Archive</h4>';
        html += createHtmlTable(wordListsData);
        
        container.innerHTML = html;
    }

    function createHtmlTable(data) {
        if (!data || Object.keys(data).length === 0) return `<p>No data available.</p>`;
        
        let tableHtml = '<table class="ebbinghaus-table">';
        const firstRow = Object.values(data)[0];
        
        if (typeof firstRow === 'object' && firstRow !== null) { // For Mastery, Word Lists etc.
            const headers = new Set();
            Object.values(data).forEach(row => Object.keys(row).forEach(header => headers.add(header)));
            const headerArray = Array.from(headers);
            
            tableHtml += '<thead><tr><th>ID</th>' + headerArray.map(h => `<th>${h}</th>`).join('') + '</tr></thead>';
            tableHtml += '<tbody>';
            for (const [rowKey, rowValue] of Object.entries(data)) {
                tableHtml += `<tr><td>${rowKey}</td>`;
                headerArray.forEach(header => {
                    const cellValue = rowValue[header] || '';
                    tableHtml += `<td><div class="word-cell">${cellValue.toString().replace(/,/g, ', ')}</div></td>`;
                });
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody>';
        } else { // For simple Key-Value like Study_Control
            tableHtml += '<thead><tr><th>Setting</th><th>Value</th></tr></thead>';
            tableHtml += '<tbody>';
            for (const [key, value] of Object.entries(data)) {
                tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`;
            }
            tableHtml += '</tbody>';
        }
        
        tableHtml += '</table>';
        return tableHtml;
    }
    
    function togglePanel() {
        const panel = document.getElementById('ebbinghaus-panel');
        if (!panel) return;

        isPanelVisible = !isPanelVisible;
        panel.style.display = isPanelVisible ? 'block' : 'none';
        
        if (isPanelVisible) {
            renderUI(); // 打开时刷新数据
        }
    }

    function addTopBarIcon() {
        const iconHtml = `<div id="ebbinghaus-top-icon" class="ebbinghaus-top-icon fa-solid fa-book-open" title="Ebbinghaus Tutor"></div>`;
        document.getElementById('top-bar-icons').insertAdjacentHTML('beforeend', iconHtml);
        document.getElementById('ebbinghaus-top-icon').addEventListener('click', togglePanel);
    }
    
    // --- AI指令处理器 (这部分不变) ---
    function processAiCommand(text) {
        const commandRegex = /【SYSTEM】\[EBB_COMMAND\|(.*?)]/g;
        let match;
        let commandFound = false;
        while ((match = commandRegex.exec(text)) !== null) {
            commandFound = true;
            try {
                const params = new URLSearchParams(match[1].replace(/&/g, '%26').replace(/,/g, '&'));
                const command = Object.fromEntries(params.entries());
                console.log(`${extensionName}: Received command:`, command);
                // ... (后面所有switch-case逻辑保持不变)
                switch(command.action) {
                    case 'add_new_words':
                        handleAddNewWords(command.words, command.day);
                        break;
                    case 'move_word':
                        handleMoveWord(command.word, command.from, command.to, command.day);
                        break;
                    case 'archive_mastered':
                        handleArchiveMastered(command.listName, command.day);
                        break;
                    case 'demote_word':
                        handleDemoteWord(command.word, command.listName, command.day);
                        break;
                    case 'advance_day':
                        handleAdvanceDay();
                        break;
                }
            } catch (e) {
                console.error(`${extensionName}: Error parsing command`, e);
            }
        }
        return commandFound;
    }
    
    function handleAddNewWords(words, day) {
        const dayKey = `Day ${day}`;
        if (!ebbinghausData.Vocabulary_Mastery[dayKey]) {
            ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" };
        }
        let currentWords = ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New.split(',').filter(Boolean);
        let newWords = words.split(',').filter(w => !currentWords.includes(w.trim()));
        currentWords.push(...newWords.map(w => w.trim()));
        ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New = currentWords.join(',');
        saveData();
    }
    function handleMoveWord(word, from, to, day) {
        const dayKey = `Day ${day}`;
        const dayData = ebbinghausData.Vocabulary_Mastery[dayKey];
        if (!dayData) return;
        let cleanWord = word.trim();

        let fromWords = dayData[from]?.split(',').filter(Boolean).map(w => w.trim()) || [];
        const index = fromWords.indexOf(cleanWord);
        if (index > -1) {
            fromWords.splice(index, 1);
            dayData[from] = fromWords.join(',');
        }
        
        let toWords = dayData[to]?.split(',').filter(Boolean).map(w => w.trim()) || [];
        if (!toWords.includes(cleanWord)) {
            toWords.push(cleanWord);
            dayData[to] = toWords.join(',');
        }
        saveData();
    }
    function handleArchiveMastered(listName, day) {
        const dayKey = `Day ${day}`;
        const masteredWords = ebbinghausData.Vocabulary_Mastery[dayKey]?.Level_5_Mastered_Today;
        if (masteredWords) {
            let existingWords = ebbinghausData.Word_Lists[listName]?.split(',').filter(Boolean).map(w => w.trim()) || [];
            let newMasteredWords = masteredWords.split(',').filter(Boolean).map(w => w.trim());
            let combined = [...new Set([...existingWords, ...newMasteredWords])]; // 去重
            ebbinghausData.Word_Lists[listName] = combined.join(',');
            ebbinghausData.Vocabulary_Mastery[dayKey].Level_5_Mastered_Today = "";
            saveData();
        }
    }
    function handleDemoteWord(word, listName, day) {
        let cleanWord = word.trim();
        if(ebbinghausData.Word_Lists[listName]) {
            let listWords = ebbinghausData.Word_Lists[listName].split(',').filter(Boolean).map(w => w.trim());
            const index = listWords.indexOf(cleanWord);
            if (index > -1) {
                listWords.splice(index, 1);
                ebbinghausData.Word_Lists[listName] = listWords.join(',');
            }
        }
        handleAddNewWords(cleanWord, day);
    }
    function handleAdvanceDay() {
        let nextDay = parseInt(ebbinghausData.Study_Control.Current_Day, 10) + 1;
        ebbinghausData.Study_Control.Current_Day = nextDay.toString();
        const dayKey = `Day ${nextDay}`;
        if (!ebbinghausData.Vocabulary_Mastery[dayKey]) {
            ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" };
        }
        saveData();
    }
    
    // --- 初始化和事件监听 ---
    SillyTavern.chat.completions.addEventListener('streamingPart', (event) => {
        const { type, data } = event.detail;
        if (type === 'MESSAGE_UPDATE' && data.is_final) {
             processAiCommand(data.message);
        }
    });

    // 插件加载的主入口
    document.addEventListener('DOMContentLoaded', async () => {
        // 等待SillyTavern UI完全加载
        const topBar = await SillyTavern.waitForElement('#top-bar-icons');
        if (topBar) {
            await loadData();
            createPanel();
            addTopBarIcon();
            console.log(`${extensionName} has been loaded successfully.`);
        }
    });
})();
