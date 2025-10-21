(function () {
    const extensionName = "Ebbinghaus Tutor Helper";
    const author = "You & Gemini";
    const version = "2.0.1"; // Let's bump the version again to confirm the update

    // Define the structure of our four essential tables
    const requiredTables = {
        'Vocabulary_Mastery': [
            'Day', 'Level_0_New', 'Level_1', 'Level_2', 'Level_3', 'Level_4', 'Level_5_Mastered_Today'
        ],
        'Word_Lists': [
            'ListName', 'Words'
        ],
        'Ebbinghaus_Schedule': [
            'Day', 'NewList', 'Review1', 'Review2', 'Review3', 'Review4', 'Review5'
        ],
        'Study_Control': [
            'Setting', 'Value'
        ]
    };

    let memoryTables; // Will hold the API for memory-tables

    // Function to ensure all required tables exist, creating them if necessary
    async function initializeTables() {
        if (!memoryTables) {
            memoryTables = SillyTavern.extensions.get('memory-tables');
            if (!memoryTables) {
                console.error(`${extensionName}: Memory Tables extension is not available.`);
                toastr.error("Ebbinghaus Tutor Helper requires the 'Memory Tables' extension.", "Dependency Error");
                return false;
            }
        }

        try {
            for (const tableName in requiredTables) {
                const columns = requiredTables[tableName];
                const exists = await memoryTables.tableExists(tableName);
                if (!exists) {
                    console.log(`Table "${tableName}" not found. Creating it...`);
                    await memoryTables.createTable(tableName, columns);
                    console.log(`Table "${tableName}" created successfully.`);
                }
            }

            // Special handling for Study_Control initialization
            const controlData = await memoryTables.readTable('Study_Control');
            if (controlData.length === 0) {
                console.log('Initializing Study_Control table with default values.');
                await memoryTables.createRow('Study_Control', { Setting: 'Current_Day', Value: '1' });
                await memoryTables.createRow('Study_Control', { Setting: 'Current_Round', Value: '1' });
                toastr.info("Initialized 'Study_Control' table with default settings.", "Ebbinghaus Helper");
            }
            return true;
        } catch (error) {
            console.error(`${extensionName}: Error during table initialization.`, error);
            toastr.error("An error occurred while setting up Ebbinghaus tables.", "Extension Error");
            return false;
        }
    }

    // Function to create and manage the UI Panel
    function setupUI() {
        // Create the panel elements only once
        if (document.getElementById('ebbinghaus-panel')) return;

        const backdrop = document.createElement('div');
        backdrop.id = 'ebbinghaus-panel-backdrop';

        const panel = document.createElement('div');
        panel.id = 'ebbinghaus-panel';
        panel.innerHTML = `
            <div id="ebbinghaus-panel-header">
                <h2>艾宾浩斯学习仪表盘</h2>
                <div id="ebbinghaus-panel-close" title="关闭">&times;</div>
            </div>
            <div id="ebbinghaus-panel-content">
                <p>正在加载表格数据...</p>
            </div>
        `;
        document.body.appendChild(backdrop);
        document.body.appendChild(panel);

        // Add event listeners for closing
        backdrop.addEventListener('click', () => togglePanel(false));
        panel.querySelector('#ebbinghaus-panel-close').addEventListener('click', () => togglePanel(false));
    }

    // Function to show/hide the panel
    function togglePanel(show) {
        const backdrop = document.getElementById('ebbinghaus-panel-backdrop');
        const panel = document.getElementById('ebbinghaus-panel');
        if (show) {
            backdrop.style.display = 'block';
            panel.style.display = 'flex';
            updatePanelData(); // Refresh data every time panel is opened
        } else {
            backdrop.style.display = 'none';
            panel.style.display = 'none';
        }
    }

    // Function to fetch data and update the panel's content
    async function updatePanelData() {
        const contentDiv = document.getElementById('ebbinghaus-panel-content');
        contentDiv.innerHTML = '刷新中...'; // Clear previous content

        for (const tableName of Object.keys(requiredTables)) {
            const container = document.createElement('div');
            container.className = 'ebbinghaus-table-container';
            container.innerHTML = `<h3>${tableName}</h3>`;
            
            try {
                const data = await memoryTables.readTable(tableName);
                if (!data || data.length === 0) {
                    container.innerHTML += '<p>此表格为空。</p>';
                } else {
                    const table = document.createElement('table');
                    // ... (rest of the table generation logic is the same)
                    const thead = document.createElement('thead');
                    const tbody = document.createElement('tbody');
                    const headers = Object.keys(data[0]);
                    const headerRow = document.createElement('tr');
                    headers.forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);
                    data.forEach(rowData => {
                        const row = document.createElement('tr');
                        headers.forEach(header => {
                            const td = document.createElement('td');
                            td.textContent = rowData[header];
                            row.appendChild(td);
                        });
                        tbody.appendChild(row);
                    });
                    table.appendChild(thead);
                    table.appendChild(tbody);
                    container.appendChild(table);
                }
            } catch (error) {
                container.innerHTML += `<p>读取表格 ${tableName} 时出错。</p>`;
            }
            contentDiv.appendChild(container);
        }
        // Remove the "刷新中..." message if it's the first element
        if (contentDiv.firstChild.tagName === 'P') {
            contentDiv.removeChild(contentDiv.firstChild);
        }
    }

    // This is the main function that runs when the extension is loaded
    async function onStart() {
        console.log(`${extensionName} v${version} by ${author} is starting.`);

        // 1. Ensure all backend tables are ready
        const tablesReady = await initializeTables();
        if (!tablesReady) {
            console.error(`${extensionName}: Initialization failed. UI will not be loaded.`);
            return; // Stop if tables can't be set up
        }

        // 2. Set up the frontend UI elements
        setupUI();
        SillyTavern.ui.add_button({
            id: "ebbinghaus-tutor-button",
            icon: "fa-solid fa-graduation-cap",
            tooltip: "打开艾宾浩斯学习仪表盘",
            onClick: () => togglePanel(true),
        });
        
        console.log(`${extensionName} has been successfully loaded.`);
    }

    // Register the extension with SillyTavern
    SillyTavern.extension.register(extensionName, author, {
        onLoad: onStart,
    });
})();
