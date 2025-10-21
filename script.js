(function () {
    const extensionName = "Ebbinghaus Tutor Helper";
    const author = "You & Gemini";

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

    // This function runs when the extension is loaded
    async function onStart() {
        console.log(`${extensionName} by ${author} is starting.`);

        // Get the memory-tables API
        const memoryTables = SillyTavern.extensions.get('memory-tables');
        if (!memoryTables) {
            console.error(`${extensionName}: Memory Tables extension is not available.`);
            toastr.error("Ebbinghaus Tutor Helper requires the 'Memory Tables' extension to be enabled.", "Dependency Error");
            return;
        }

        let createdCount = 0;
        let existingCount = 0;

        // Loop through our required tables and check if they exist
        for (const tableName in requiredTables) {
            const columns = requiredTables[tableName];
            try {
                const exists = await memoryTables.tableExists(tableName);
                if (!exists) {
                    console.log(`Table "${tableName}" not found. Creating it...`);
                    await memoryTables.createTable(tableName, columns);
                    console.log(`Table "${tableName}" created successfully.`);
                    createdCount++;
                } else {
                    console.log(`Table "${tableName}" already exists.`);
                    existingCount++;
                }
            } catch (error) {
                console.error(`Error processing table "${tableName}":`, error);
                toastr.error(`Failed to create or check table: ${tableName}`, "Extension Error");
            }
        }
        
        // Give feedback to the user
        if (createdCount > 0) {
             toastr.success(`Successfully created ${createdCount} new table(s) for the Ebbinghaus system.`, "Ebbinghaus Helper");
        }
        if (existingCount === Object.keys(requiredTables).length) {
            toastr.info("All Ebbinghaus tables already exist. Ready to go!", "Ebbinghaus Helper");
        }
        
        // Initialize the control table if it's freshly created and empty
        const controlTableExists = await memoryTables.tableExists('Study_Control');
        if (controlTableExists) {
            const controlData = await memoryTables.readTable('Study_Control');
            if (controlData.length === 0) {
                console.log('Initializing Study_Control table with default values.');
                await memoryTables.createRow('Study_Control', { Setting: 'Current_Day', Value: '1' });
                await memoryTables.createRow('Study_Control', { Setting: 'Current_Round', Value: '1' });
                toastr.info("Initialized 'Study_Control' table with default settings.", "Ebbinghaus Helper");
            }
        }
    }

    // Register the extension with SillyTavern
    SillyTavern.extension.register(extensionName, author, {
        onLoad: onStart,
    });

})();
