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

// Add new project fetching functionality
let cachedProjects = [];
let lastProjectFetchTime = 0;
const PROJECT_CACHE_DURATION = 300000; // 5 minutes

async function fetchRandomProjects() {
    log("🔍 Fetching projects from Websim database...");
    
    try {
        // Use websim.fetchApi for proper API access
        const endpoints = [
            '/api/v1/sites?limit=500&sort=created_at',
            '/api/v1/sites?limit=500&sort=updated_at', 
            '/api/v1/sites?limit=500&sort=random'
        ];
        
        const allProjects = [];
        
        for (const endpoint of endpoints) {
            try {
                log(`📡 Querying ${endpoint}...`);
                
                const apiResponse = await window.websim.fetchApi({
                    url: endpoint,
                    options: {
                        method: 'GET'
                    }
                });
                
                log(`📊 API Response status: ${apiResponse.status} ${apiResponse.statusText}`);
                
                if (apiResponse.status !== 200) {
                    log(`⚠️ ${endpoint} returned ${apiResponse.status}: ${apiResponse.statusText}`, 'warning');
                    continue;
                }
                
                // Read the response body
                const reader = apiResponse.body.getReader();
                const chunks = [];
                
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    chunks.push(value);
                }
                
                const responseText = new TextDecoder().decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
                log(`📄 Raw response length: ${responseText.length} characters`);
                
                let data;
                try {
                    data = JSON.parse(responseText);
                    log(`🔍 Response structure: ${JSON.stringify(Object.keys(data))}`);
                } catch (parseError) {
                    log(`❌ JSON parse error: ${parseError.message}`, 'error');
                    log(`🔍 First 200 chars of response: ${responseText.substring(0, 200)}`, 'warning');
                    continue;
                }
                
                // Extract projects from various possible response structures
                const projects = data.sites || data.data || data.results || data.projects || [];
                log(`📊 Found ${projects.length} real projects from ${endpoint}`);
                
                if (projects.length > 0) {
                    log(`🔍 Sample project structure: ${JSON.stringify(Object.keys(projects[0]))}`);
                    allProjects.push(...projects);
                }
                
                await new Promise(resolve => setTimeout(resolve, 300)); // Rate limit
            } catch (endpointError) {
                log(`❌ Failed to fetch from ${endpoint}: ${endpointError.message}`, 'error');
                console.error('Endpoint error details:', endpointError);
            }
        }
        
        log(`🎯 Total real projects collected: ${allProjects.length}`);
        
        if (allProjects.length === 0) {
            throw new Error("No real projects found from any API endpoint. Check API access or endpoint URLs.");
        }
        
        // Deep search - ensure we have a diverse set
        const uniqueProjects = Array.from(new Map(allProjects.map(p => [p.id, p])).values());
        log(`🔄 Deduplicated to ${uniqueProjects.length} unique projects`);
        
        cachedProjects = uniqueProjects;
        lastProjectFetchTime = Date.now();
        
        return uniqueProjects;
    } catch (error) {
        log(`❌ Project fetch failed: ${error.message}`, 'error');
        console.error('Full fetch error:', error);
        throw error;
    }
}

async function selectRandomProject() {
    // Refresh cache if needed
    if (cachedProjects.length === 0 || (Date.now() - lastProjectFetchTime) > PROJECT_CACHE_DURATION) {
        await fetchRandomProjects();
    }
    
    log(`🎲 Selecting from ${cachedProjects.length} available projects...`);
    const randomProject = cachedProjects[Math.floor(Math.random() * cachedProjects.length)];
    
    log(`🎯 Selected project: <strong>${randomProject.title || randomProject.name || 'Untitled'}</strong>`);
    log(`👤 Created by: @${randomProject.username || 'unknown'}`);
    
    return randomProject;
}

async function fetchProjectCode(project) {
    log("📥 Downloading project source code...");
    
    try {
        log(`🌐 Fetching real code from project ID: ${project.id}`);
        
        // Try to fetch the actual project content
        const projectResponse = await window.websim.fetchApi({
            url: `/api/v1/sites/${project.id}`,
            options: {
                method: 'GET'
            }
        });
        
        if (projectResponse.status === 200) {
            const reader = projectResponse.body.getReader();
            const chunks = [];
            
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
            }
            
            const responseText = new TextDecoder().decode(new Uint8Array(chunks.reduce((acc, chunk) => [...acc, ...chunk], [])));
            const projectData = JSON.parse(responseText);
            
            log(`✅ Retrieved real project data for: ${projectData.title || project.title}`, 'success');
            
            // Extract real code if available
            const projectCode = {
                name: projectData.title || project.title || 'Untitled Project',
                html: projectData.html || generateSampleHTML(projectData),
                css: projectData.css || generateSampleCSS(projectData),
                js: projectData.js || generateSampleJS(projectData)
            };
            
            return projectCode;
        } else {
            log(`⚠️ Could not fetch project content, status: ${projectResponse.status}`, 'warning');
            throw new Error(`Failed to fetch project content: ${projectResponse.status}`);
        }
        
    } catch (error) {
        log(`❌ Failed to fetch real project code: ${error.message}`, 'error');
        throw error;
    }
}

function generateSampleHTML(project) {
    const title = project.title || project.name || 'Untitled';
    const description = project.description || 'A Websim creation';
    
    return `<div class="project-${project.id}">
        <h2>${title}</h2>
        <p>${description}</p>
        <div class="content">
            <button class="action-btn">Interactive Element</button>
        </div>
    </div>`;
}

function generateSampleCSS(project) {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#feca57', '#ff9ff3', '#54a0ff'];
    const randomColor = colors[Math.floor(Math.random() * colors.length)];
    
    return `.project-${project.id} {
        background: linear-gradient(135deg, ${randomColor}22, ${randomColor}11);
        padding: 20px;
        margin: 10px;
        border-radius: 12px;
        border: 1px solid ${randomColor}44;
    }
    .project-${project.id} h2 {
        color: ${randomColor};
        margin-bottom: 10px;
    }
    .project-${project.id} .action-btn {
        background: ${randomColor};
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        transition: transform 0.2s ease;
    }
    .project-${project.id} .action-btn:hover {
        transform: translateY(-2px);
    }`;
}

function generateSampleJS(project) {
    return `
// Code from project: ${project.title || 'Untitled'}
document.querySelectorAll('.project-${project.id} .action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        btn.textContent = btn.textContent === 'Interactive Element' ? 'Clicked!' : 'Interactive Element';
        btn.style.transform = 'scale(0.95)';
        setTimeout(() => btn.style.transform = '', 100);
    });
});
console.log('Project ${project.id} initialized');`;
}

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
        
        const selectedProject = await selectRandomProject();
        const projectCode = await fetchProjectCode(selectedProject);
        
        await new Promise(resolve => setTimeout(resolve, 800));
        
        log("🧠 Sending to AI for intelligent merging...");
        
        const systemPrompt = `You are a creative web developer AI. Merge the new code into the current code creatively.
Rules:
- Combine elements in interesting ways
- Avoid conflicts between scripts
- Make the result visually cohesive
- Keep it functional and interesting
- Preserve existing functionality while adding new features

Respond with valid JSON: {"html": "...", "css": "...", "js": "..."}`;

        const userPrompt = `Current Code:
HTML: ${currentCode.html}
CSS: ${currentCode.css}
JS: ${currentCode.js}

New Code (${projectCode.name}):
HTML: ${projectCode.html}
CSS: ${projectCode.css}
JS: ${projectCode.js}`;

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

async function step1_InitializeUI() {
    log("🎨 Step 1: Initializing UI components...");
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    
    // Render initial code
    renderCode();
    log("✅ UI initialized successfully", 'success');
}

async function step2_ConnectDatabase() {
    log("🔌 Step 2: Connecting to WebsimSocket database...");
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    
    try {
        room = new WebsimSocket();
        log("✅ Database connection established", 'success');
        
        const records = room.collection(COLLECTION_TYPE).getList();
        log(`📊 Found ${records.length} existing records`);
        
        return records;
    } catch (error) {
        log(`❌ Database connection failed: ${error.message}`, 'error');
        throw error;
    }
}

async function step3_LoadExistingData(records) {
    log("📂 Step 3: Loading existing data...");
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    
    if (records && records.length > 0) {
        const latestRecord = records[0];
        log(`🔄 Loading saved creation from ${new Date(latestRecord.created_at).toLocaleString()}`);
        
        if (latestRecord.html && latestRecord.css && latestRecord.js) {
            currentCode = {
                html: latestRecord.html,
                css: latestRecord.css,
                js: latestRecord.js
            };
            renderCode();
            log("✅ Existing data loaded successfully", 'success');
        } else {
            log("⚠️ Existing record incomplete, using defaults", 'warning');
        }
    } else {
        log("📝 No existing data found, starting fresh");
    }
}

async function step4_SetupEventListeners() {
    log("🎛️ Step 4: Setting up event listeners...");
    await new Promise(resolve => setTimeout(resolve, STEP_DELAY));
    
    triggerButton.addEventListener('click', handleManualMerge);
    
    log("✅ Event listeners configured", 'success');
}

// Start the app
log("Starting AI Weaver application...");
initializeApp();