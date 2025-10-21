(function () {
    const extensionName = "Ebbinghaus Tutor Helper";
    const author = "You & Gemini";
    const version = "2.0.0";

    const tableNames = [
        'Vocabulary_Mastery',
        'Word_Lists',
        'Ebbinghaus_Schedule',
        'Study_Control'
    ];
    let memoryTables;

    // Function to create the HTML for our panel
    function createUIPanel() {
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
        contentDiv.innerHTML = ''; // Clear previous content

        if (!memoryTables) {
            contentDiv.innerHTML = '<p>错误: 无法连接到记忆表格插件。</p>';
            return;
        }

        for (const tableName of tableNames) {
            const container = document.createElement('div');
            container.className = 'ebbinghaus-table-container';
            container.innerHTML = `<h3>${tableName}</h3>`;
            
            try {
                const data = await memoryTables.readTable(tableName);
                if (data.length === 0) {
                    container.innerHTML += '<p>此表格为空。</p>';
                } else {
                    const table = document.createElement('table');
                    const thead = document.createElement('thead');
                    const tbody = document.createElement('tbody');
                    const headers = Object.keys(data[0]);

                    // Create table headers
                    const headerRow = document.createElement('tr');
                    headers.forEach(header => {
                        const th = document.createElement('th');
                        th.textContent = header;
                        headerRow.appendChild(th);
                    });
                    thead.appendChild(headerRow);

                    // Create table rows
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
                console.error(`Error reading table ${tableName}:`, error);
                container.innerHTML += `<p>读取表格 ${tableName} 时出错。</p>`;
            }
            contentDiv.appendChild(container);
        }
    }

    // This function runs when the extension is loaded
    async function onStart() {
        console.log(`${extensionName} v${version} by ${author} is starting.`);

        // Setup the UI
        createUIPanel();
        SillyTavern.ui.add_button({
            id: "ebbinghaus-tutor-button",
            icon: "fa-solid fa-graduation-cap",
            tooltip: "打开艾宾浩斯学习仪表盘",
            onClick: () => togglePanel(true),
        });

        // The background logic for creating tables remains the same
        memoryTables = SillyTavern.extensions.get('memory-tables');
        if (!memoryTables) {
            console.error(`${extensionName}: Memory Tables extension is not available.`);
            toastr.error("Ebbinghaus Tutor Helper requires the 'Memory Tables' extension.", "Dependency Error");
            return;
        }
        // ... (The table creation logic can be added back here if needed, but it's often better to assume they exist)
    }

    // Register the extension with SillyTavern
    SillyTavern.extension.register(extensionName, author, {
        onLoad: onStart,
    });

})();
