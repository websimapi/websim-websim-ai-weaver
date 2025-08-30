// Global state
let room = null;
let isInitialized = false;
let currentCode = {
    html: '<div class="welcome"><h1>AI Weaver Starting...</h1><p>Please wait while we initialize.</p></div>',
    css: 'body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background: #f5f5f5; } .welcome { text-align: center; color: #333; }',
    js: '// Initial state'
};

const COLLECTION_TYPE = 'ai_weaver_v3';
const STEP_DELAY = 800; // Delay between steps for visibility

// DOM elements
const consoleEl = document.getElementById('console');
const renderTarget = document.getElementById('render-target');
const triggerButton = document.getElementById('trigger-button');
const spinner = document.getElementById('spinner');

// Mock projects for testing
const SAMPLE_PROJECTS = [
    {
        name: "ColorfulCard", 
        html: '<div class="card"><h3>Hello World</h3><p>This is a sample card.</p></div>',
        css: '.card { background: linear-gradient(45deg, #ff6b6b, #4ecdc4); padding: 20px; border-radius: 10px; color: white; margin: 10px; }',
        js: 'console.log("ColorfulCard loaded");'
    },
    {
        name: "SimpleCounter",
        html: '<div class="counter"><button id="decBtn">-</button><span id="count">0</span><button id="incBtn">+</button></div>',
        css: '.counter { display: flex; gap: 10px; align-items: center; } .counter button { padding: 10px 15px; font-size: 18px; } #count { font-size: 24px; font-weight: bold; }',
        js: 'let count = 0; document.getElementById("incBtn")?.addEventListener("click", () => { count++; document.getElementById("count").textContent = count; }); document.getElementById("decBtn")?.addEventListener("click", () => { count--; document.getElementById("count").textContent = count; });'
    }
];

function log(message, type = 'info') {
    const timestamp = new Date().toLocaleTimeString();
    const typeClass = type === 'error' ? 'error' : type === 'success' ? 'merge' : type === 'warning' ? 'scan' : 'welcome';
    
    const logEntry = document.createElement('div');
    logEntry.className = `log-line ${typeClass}`;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    
    consoleEl.appendChild(logEntry);
    consoleEl.scrollTop = consoleEl.scrollHeight;
    
    // Also log to browser console for debugging
    console.log(`[AI Weaver] ${message}`);
}

function updateUI(state) {
    switch(state) {
        case 'initializing':
            triggerButton.disabled = true;
            triggerButton.textContent = 'Initializing...';
            spinner.classList.remove('hidden');
            break;
        case 'ready':
            triggerButton.disabled = false;
            triggerButton.textContent = 'Trigger AI Merge';
            spinner.classList.add('hidden');
            break;
        case 'merging':
            triggerButton.disabled = true;
            triggerButton.textContent = 'AI is Merging...';
            spinner.classList.remove('hidden');
            break;
        case 'error':
            triggerButton.disabled = false;
            triggerButton.textContent = 'Try Again';
            spinner.classList.add('hidden');
            break;
    }
}

function renderCode() {
    try {
        const content = `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>${currentCode.css}</style>
</head>
<body>
    ${currentCode.html}
    <script>
        try {
            ${currentCode.js}
        } catch(e) {
            console.error('Render error:', e);
        }
    </script>
</body>
</html>`;
        
        renderTarget.srcdoc = content;
        log("✅ Code rendered successfully", 'success');
    } catch (error) {
        log(`❌ Render error: ${error.message}`, 'error');
    }
}

async function step1_InitializeUI() {
    log("🚀 <strong>STEP 1:</strong> Initializing user interface...");
    
    try {
        consoleEl.innerHTML = '';
        log("UI elements found and cleared", 'success');
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        renderCode();
        log("Initial render completed", 'success');
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        return true;
    } catch (error) {
        log(`❌ Step 1 failed: ${error.message}`, 'error');
        throw error;
    }
}

async function step2_ConnectDatabase() {
    log("🔌 <strong>STEP 2:</strong> Connecting to Websim database...");
    
    try {
        log("Creating WebsimSocket instance...");
        room = new WebsimSocket();
        log("✅ WebsimSocket created successfully", 'success');
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        log("Testing database connection...");
        
        // Test the connection with a simple operation
        const testPromise = new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                reject(new Error('Database connection timeout after 5 seconds'));
            }, 5000);
            
            try {
                const unsubscribe = room.collection(COLLECTION_TYPE).subscribe((records) => {
                    clearTimeout(timeout);
                    log("✅ Database subscription successful", 'success');
                    log(`📊 Found ${records.length} existing records`);
                    unsubscribe();
                    resolve(records);
                });
            } catch (subscribeError) {
                clearTimeout(timeout);
                reject(subscribeError);
            }
        });
        
        const records = await testPromise;
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        return records;
    } catch (error) {
        log(`❌ Step 2 failed: ${error.message}`, 'error');
        throw error;
    }
}

async function step3_LoadExistingData(records) {
    log("📁 <strong>STEP 3:</strong> Loading existing data...");
    
    try {
        if (records && records.length > 0) {
            log(`Found ${records.length} saved creation(s)`);
            const latest = records[0];
            
            log("Loading saved code...");
            if (latest.html) currentCode.html = latest.html;
            if (latest.css) currentCode.css = latest.css;
            if (latest.js) currentCode.js = latest.js;
            
            log("✅ Saved creation loaded successfully", 'success');
        } else {
            log("No saved creations found, using default state");
        }
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        renderCode();
        return true;
    } catch (error) {
        log(`❌ Step 3 failed: ${error.message}`, 'error');
        throw error;
    }
}

async function step4_SetupEventListeners() {
    log("🎛️ <strong>STEP 4:</strong> Setting up controls...");
    
    try {
        log("Attaching button click handler...");
        triggerButton.addEventListener('click', handleManualMerge);
        log("✅ Manual merge button ready", 'success');
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        log("Setting up automatic merge timer (45 seconds)...");
        setInterval(() => {
            if (isInitialized && !isMerging) {
                log("🤖 Automatic merge triggered");
                handleMerge();
            }
        }, 45000);
        log("✅ Auto-merge timer active", 'success');
        
        await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
        
        return true;
    } catch (error) {
        log(`❌ Step 4 failed: ${error.message}`, 'error');
        throw error;
    }
}

let isMerging = false;

async function handleManualMerge() {
    log("👆 Manual merge requested by user");
    await handleMerge();
}

async function handleMerge() {
    if (isMerging) {
        log("⚠️ Merge already in progress, skipping", 'warning');
        return;
    }
    
    isMerging = true;
    updateUI('merging');
    
    try {
        log("🔍 <strong>MERGE CYCLE STARTED</strong>");
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        log("Selecting random project to merge...");
        const randomProject = SAMPLE_PROJECTS[Math.floor(Math.random() * SAMPLE_PROJECTS.length)];
        log(`🎯 Selected project: <strong>${randomProject.name}</strong>`);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        log("🧠 Sending to AI for intelligent merging...");
        
        const systemPrompt = `You are a creative web developer AI. Merge the new code into the current code creatively.
Rules:
- Combine elements in interesting ways
- Avoid conflicts between scripts
- Make the result visually cohesive
- Keep it functional and interesting

Respond with valid JSON: {"html": "...", "css": "...", "js": "..."}`;

        const userPrompt = `Current Code:
HTML: ${currentCode.html}
CSS: ${currentCode.css}
JS: ${currentCode.js}

New Code (${randomProject.name}):
HTML: ${randomProject.html}
CSS: ${randomProject.css}
JS: ${randomProject.js}`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: [{ type: "text", text: userPrompt }] }
            ],
            json: true,
        });

        log("🎨 AI merge completed, parsing result...");
        
        const result = JSON.parse(completion.content);
        
        if (!result.html || !result.css || !result.js) {
            throw new Error("AI response missing required fields");
        }
        
        currentCode = result;
        
        await new Promise(resolve => setTimeout(resolve, 500));
        
        log("🖼️ Rendering merged creation...");
        renderCode();
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        log("💾 Saving to database...");
        await saveToDatabase();
        
        log("✨ <strong>MERGE CYCLE COMPLETE!</strong>", 'success');
        
    } catch (error) {
        log(`❌ Merge failed: ${error.message}`, 'error');
        console.error('Merge error details:', error);
    } finally {
        isMerging = false;
        updateUI('ready');
    }
}

async function saveToDatabase() {
    try {
        const records = room.collection(COLLECTION_TYPE).getList();
        
        if (records.length > 0) {
            log("Updating existing database record...");
            await room.collection(COLLECTION_TYPE).update(records[0].id, currentCode);
        } else {
            log("Creating new database record...");
            await room.collection(COLLECTION_TYPE).create(currentCode);
        }
        
        log("✅ Database save successful", 'success');
    } catch (error) {
        log(`❌ Database save failed: ${error.message}`, 'error');
        throw error;
    }
}

async function initializeApp() {
    updateUI('initializing');
    
    try {
        log("🌟 <strong>AI WEAVER INITIALIZATION STARTED</strong>");
        log("This AI merges code from random Websim projects into a living creation");
        
        await step1_InitializeUI();
        
        const records = await step2_ConnectDatabase();
        
        await step3_LoadExistingData(records);
        
        await step4_SetupEventListeners();
        
        log("🎉 <strong>INITIALIZATION COMPLETE!</strong>", 'success');
        log("Click 'Trigger AI Merge' to start creating, or wait for automatic merges");
        
        isInitialized = true;
        updateUI('ready');
        
    } catch (error) {
        log(`💥 <strong>INITIALIZATION FAILED:</strong> ${error.message}`, 'error');
        log("Please refresh the page to try again", 'error');
        console.error('Full initialization error:', error);
        updateUI('error');
    }
}

// Start the app
log("Starting AI Weaver application...");
initializeApp();