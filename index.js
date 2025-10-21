// Ebbinghaus Tutor - Standalone Extension for SillyTavern
// Author: {{user}} & Gemini

(function () {
    const extensionName = "Ebbinghaus Tutor";
    const dataFileName = "ebbinghaus_data.json";
    let ebbinghausData = {};

    // 默认数据结构，用于第一次加载时创建文件
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
            if (fileContent) {
                ebbinghausData = JSON.parse(fileContent);
                console.log(`${extensionName}: Data loaded successfully.`);
            } else {
                // 如果文件是空的，用默认数据并保存
                ebbinghausData = defaultData;
                await saveData();
                console.log(`${extensionName}: Empty data file found. Initialized with default data.`);
            }
        } catch (error) {
            // 如果文件不存在，创建它
            console.log(`${extensionName}: Data file not found. Creating a new one.`);
            ebbinghausData = defaultData;
            await saveData();
        }
        renderUI();
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

    // --- 界面渲染 ---
    function renderUI() {
        const container = document.getElementById('ebbinghaus-container');
        if (!container) return;
        
        let html = '<h4>Study Control</h4>';
        html += createHtmlTable('Study_Control', ebbinghausData.Study_Control);

        html += '<h4>Vocabulary Mastery (Current Day)</h4>';
        const currentDay = ebbinghausData.Study_Control.Current_Day;
        const masteryData = { [`Day ${currentDay}`]: ebbinghausData.Vocabulary_Mastery[`Day ${currentDay}`] || {} };
        html += createHtmlTable('Vocabulary_Mastery', masteryData);

        html += '<h4>Word Lists Archive</h4>';
        html += createHtmlTable('Word_Lists', ebbinghausData.Word_Lists);
        
        container.innerHTML = html;
    }

    function createHtmlTable(title, data) {
        if (!data || Object.keys(data).length === 0) return `<p>No data for ${title}.</p>`;

        let tableHtml = '<table class="ebbinghaus-table">';
        const isKeyValue = !Array.isArray(data) && Object.values(data).every(v => typeof v !== 'object');

        if (isKeyValue) { // Key-Value a la Study_Control
            tableHtml += '<thead><tr><th>Setting</th><th>Value</th></tr></thead>';
            tableHtml += '<tbody>';
            for (const [key, value] of Object.entries(data)) {
                tableHtml += `<tr><td>${key}</td><td>${value}</td></tr>`;
            }
            tableHtml += '</tbody>';
        } else { // Complex objects
            const headers = new Set();
            Object.values(data).forEach(row => Object.keys(row).forEach(header => headers.add(header)));
            const headerArray = Array.from(headers);

            tableHtml += '<thead><tr><th>ID</th>';
            headerArray.forEach(h => tableHtml += `<th>${h}</th>`);
            tableHtml += '</tr></thead>';

            tableHtml += '<tbody>';
            for (const [rowKey, rowValue] of Object.entries(data)) {
                tableHtml += `<tr><td>${rowKey}</td>`;
                headerArray.forEach(header => {
                    const cellValue = rowValue[header] || '';
                    tableHtml += `<td><div class="word-cell">${cellValue}</div></td>`;
                });
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody>';
        }

        tableHtml += '</table>';
        return tableHtml;
    }
    
    // --- AI指令处理器 ---
    function processAiCommand(text) {
        const commandRegex = /【SYSTEM】\[EBB_COMMAND\|(.*?)]/g;
        let match;
        let commandFound = false;

        while ((match = commandRegex.exec(text)) !== null) {
            commandFound = true;
            const params = new URLSearchParams(match[1].replace(/&/g, '%26').replace(/,/g, '&'));
            const command = Object.fromEntries(params.entries());
            
            console.log(`${extensionName}: Received command:`, command);

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
        }
        return commandFound;
    }

    // --- 指令处理逻辑函数 ---
    function handleAddNewWords(words, day) {
        const dayKey = `Day ${day}`;
        if (!ebbinghausData.Vocabulary_Mastery[dayKey]) {
            ebbinghausData.Vocabulary_Mastery[dayKey] = { ...defaultData.Vocabulary_Mastery["Day 1"], Level_0_New: "" };
        }
        let currentWords = ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New.split(',').filter(Boolean);
        let newWords = words.split(',').filter(w => !currentWords.includes(w));
        currentWords.push(...newWords);
        ebbinghausData.Vocabulary_Mastery[dayKey].Level_0_New = currentWords.join(',');
        saveData();
    }

    function handleMoveWord(word, from, to, day) {
        const dayKey = `Day ${day}`;
        const dayData = ebbinghausData.Vocabulary_Mastery[dayKey];
        if (!dayData) return;

        // 从源列移除
        let fromWords = dayData[from].split(',').filter(Boolean);
        const index = fromWords.indexOf(word);
        if (index > -1) {
            fromWords.splice(index, 1);
            dayData[from] = fromWords.join(',');
        }

        // 添加到目标列
        let toWords = dayData[to].split(',').filter(Boolean);
        if (!toWords.includes(word)) {
            toWords.push(word);
            dayData[to] = toWords.join(',');
        }
        saveData();
    }
    
    function handleArchiveMastered(listName, day) {
        const dayKey = `Day ${day}`;
        const masteredWords = ebbinghausData.Vocabulary_Mastery[dayKey]?.Level_5_Mastered_Today;
        if (masteredWords) {
            ebbinghausData.Word_Lists[listName] = (ebbinghausData.Word_Lists[listName] || '').split(',').filter(Boolean).concat(masteredWords.split(',')).join(',');
            ebbinghausData.Vocabulary_Mastery[dayKey].Level_5_Mastered_Today = "";
            saveData();
        }
    }
    
    function handleDemoteWord(word, listName, day) {
        // 从Word_Lists中移除
        if(ebbinghausData.Word_Lists[listName]) {
            let listWords = ebbinghausData.Word_Lists[listName].split(',').filter(Boolean);
            const index = listWords.indexOf(word);
            if (index > -1) {
                listWords.splice(index, 1);
                ebbinghausData.Word_Lists[listName] = listWords.join(',');
            }
        }
        // 添加回当天的Level_0
        handleAddNewWords(word, day); // 复用添加函数
        saveData();
    }

    function handleAdvanceDay() {
        let nextDay = parseInt(ebbinghausData.Study_Control.Current_Day, 10) + 1;
        ebbinghausData.Study_Control.Current_Day = nextDay.toString();
        // 为新的一天准备好数据结构
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
             const commandFound = processAiCommand(data.message);
             if (commandFound) {
                 // 可以在这里选择是否从最终消息中移除指令文本
                 // a.message = a.message.replace(/【SYSTEM】.*?]/g, '');
             }
        }
    });

    jQuery(async () => {
        const settingsHtml = `
            <div id="ebbinghaus-tutor-settings">
                <h3>Ebbinghaus Tutor</h3>
                <div id="ebbinghaus-container">Loading...</div>
            </div>`;
        SillyTavern.addExtensionSettings(extensionName, settingsHtml);
        await loadData();
    });
})();
