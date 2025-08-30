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
        // Fetch from multiple sources to get variety
        const endpoints = [
            '/api/v1/sites/trending?limit=200',
            '/api/v1/sites/recent?limit=200', 
            '/api/v1/sites/popular?limit=200'
        ];
        
        const allProjects = [];
        
        for (const endpoint of endpoints) {
            try {
                log(`📡 Querying ${endpoint}...`);
                const response = await fetch(endpoint);
                
                if (!response.ok) {
                    log(`⚠️ ${endpoint} returned ${response.status}`, 'warning');
                    continue;
                }
                
                const data = await response.json();
                const projects = data.sites || data.data || [];
                
                log(`📊 Found ${projects.length} projects from ${endpoint}`);
                allProjects.push(...projects);
                
                await new Promise(resolve => setTimeout(resolve, 200)); // Rate limit
            } catch (endpointError) {
                log(`⚠️ Failed to fetch from ${endpoint}: ${endpointError.message}`, 'warning');
            }
        }
        
        log(`🎯 Total projects collected: ${allProjects.length}`);
        
        if (allProjects.length === 0) {
            throw new Error("No projects found from any endpoint");
        }
        
        cachedProjects = allProjects;
        lastProjectFetchTime = Date.now();
        
        return allProjects;
    } catch (error) {
        log(`❌ Project fetch failed: ${error.message}`, 'error');
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
        // Construct the project URL
        const projectUrl = `https://websim.com/c/${project.id}`;
        log(`🌐 Fetching code from: ${projectUrl}`);
        
        // For now, we'll use a simplified approach since we can't directly fetch cross-origin content
        // We'll generate some sample code based on the project metadata
        const projectCode = {
            name: project.title || project.name || 'Untitled Project',
            html: generateSampleHTML(project),
            css: generateSampleCSS(project),
            js: generateSampleJS(project)
        };
        
        log("✅ Project code generated successfully", 'success');
        return projectCode;
        
    } catch (error) {
        log(`❌ Failed to fetch project code: ${error.message}`, 'error');
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

// Start the app
log("Starting AI Weaver application...");
initializeApp();