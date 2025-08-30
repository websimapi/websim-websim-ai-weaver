import { WebsimSocket } from 'websim';

const consoleEl = document.getElementById('console');
const renderTarget = document.getElementById('render-target');
const triggerButton = document.getElementById('trigger-button');

const COLLECTION_TYPE = 'ai_weaver_project_v1';
let room;
let currentCode = {
    html: '<!-- Welcome to the AI Weaver -->\n<div class="center"><h1>Waiting for first merge...</h1><p>The AI will begin its work shortly.</p></div>',
    css: 'body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f0f0f0; } .center { text-align: center; color: #555; }',
    js: 'console.log("Initial state loaded.");'
};
let isMerging = false;

const MOCK_PROJECTS = [
    {
        name: "CosmicChat",
        html: `<div class="chat-container">
                    <div class="messages">
                        <div class="msg user">Hello!</div>
                        <div class="msg bot">Hi there, human!</div>
                    </div>
                    <input type="text" placeholder="Type something..." />
               </div>`,
        css: `
                .chat-container { background: #2c3e50; padding: 20px; border-radius: 10px; color: white; font-family: monospace; }
                .messages { margin-bottom: 10px; }
                .msg { padding: 8px 12px; border-radius: 15px; margin-bottom: 5px; max-width: 70%; }
                .user { background: #3498db; align-self: flex-end; margin-left: auto; }
                .bot { background: #95a5a6; }
                input { width: 95%; padding: 10px; border: none; border-radius: 5px; background: #ecf0f1; }`,
        js: `console.log("CosmicChat module loaded.");
               const input = document.querySelector('input');
               input.addEventListener('keypress', (e) => { if(e.key === 'Enter') { alert("You sent: " + e.target.value); e.target.value = ''; } });`
    },
    {
        name: "RetroPlayer",
        html: `<div class="player">
                    <div class="display">TRACK 01</div>
                    <div class="controls">
                        <button>◀◀</button><button>▶</button><button>▶▶</button>
                    </div>
               </div>`,
        css: `
                .player { border: 2px solid orange; padding: 15px; background: #333; text-align: center; }
                .display { background: black; color: lime; padding: 10px; margin-bottom: 10px; font-weight: bold; }
                .controls button { background: orange; border: none; padding: 10px; font-size: 1.2em; cursor: pointer; }`,
        js: `const buttons = document.querySelectorAll('.controls button');
               buttons.forEach(b => b.addEventListener('click', () => {
                   document.querySelector('.display').textContent = 'BUTTON CLICKED';
                   setTimeout(() => document.querySelector('.display').textContent = 'TRACK 01', 1000);
               }));`
    },
    {
        name: "DataVisualizer",
        html: `<div class="viz">
                 <div class="bar" style="height: 50%;"></div>
                 <div class="bar" style="height: 80%;"></div>
                 <div class="bar" style="height: 30%;"></div>
               </div>`,
        css: `
                .viz { display: flex; justify-content: space-around; align-items: flex-end; height: 150px; border: 1px solid #eee; padding: 10px; }
                .bar { width: 25%; background: linear-gradient(to top, #ff8c00, #ff0080); transition: height 0.5s ease; }`,
        js: `setInterval(() => {
                document.querySelectorAll('.bar').forEach(bar => {
                    bar.style.height = Math.random() * 100 + '%';
                });
            }, 2000);`
    },
    {
        name: "SimpleTodo",
        html: `<ul><li>Buy milk</li><li>Learn quantum physics</li></ul>`,
        css: `ul { list-style: square; padding-left: 20px; color: #4a4a4a; } li { background: #efefef; margin: 4px 0; padding: 5px; }`,
        js: `document.querySelectorAll('li').forEach(item => item.addEventListener('click', () => item.style.textDecoration = 'line-through'));`
    }
];

function logToConsole(message, className = '') {
    const p = document.createElement('p');
    p.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    p.className = `log-line ${className}`;
    consoleEl.appendChild(p);
    consoleEl.scrollTop = consoleEl.scrollHeight;
}

function renderCode(code) {
    const content = `
        <!DOCTYPE html>
        <html>
            <head>
                <style>${code.css}</style>
            </head>
            <body>
                ${code.html}
                <script>${code.js}<\/script>
            </body>
        </html>
    `;
    renderTarget.srcdoc = content;
}

async function saveCurrentCode() {
    logToConsole("Saving state to persistent storage...", "save");
    try {
        const records = room.collection(COLLECTION_TYPE).getList();
        if (records.length > 0) {
            // Update existing record
            const recordToUpdate = records[0]; // Assuming only one state record
            await room.collection(COLLECTION_TYPE).update(recordToUpdate.id, currentCode);
        } else {
            // Create new record
            await room.collection(COLLECTION_TYPE).create(currentCode);
        }
        logToConsole("Save successful.", "save");
    } catch (error) {
        logToConsole(`Error saving state: ${error.message}`, "error");
    }
}

async function loadLatestCode() {
    logToConsole("Attempting to load latest project state...");
    return new Promise((resolve) => {
        const unsubscribe = room.collection(COLLECTION_TYPE).subscribe(records => {
            if (records.length > 0) {
                // getList is newest to oldest, so records[0] is the latest
                const latestRecord = records[0];
                currentCode = {
                    html: latestRecord.html,
                    css: latestRecord.css,
                    js: latestRecord.js
                };
                logToConsole("Successfully loaded saved state.");
                unsubscribe();
                resolve(true);
            } else {
                logToConsole("No saved state found. Starting fresh.");
                unsubscribe();
                resolve(false);
            }
        });
        // Timeout if subscription takes too long
        setTimeout(() => {
            unsubscribe();
            resolve(false);
        }, 3000);
    });
}

async function runAiMerge() {
    if (isMerging) return;
    isMerging = true;
    triggerButton.disabled = true;
    triggerButton.textContent = 'Merging...';

    try {
        logToConsole("AI cycle initiated...", "scan");

        await new Promise(res => setTimeout(res, 1000));
        const randomProject = MOCK_PROJECTS[Math.floor(Math.random() * MOCK_PROJECTS.length)];
        logToConsole(`Found random project: '${randomProject.name}'`, "scan");

        await new Promise(res => setTimeout(res, 1500));
        logToConsole("Fetching code modules...", "fetch");

        await new Promise(res => setTimeout(res, 2000));
        logToConsole("Merging new code with existing project...", "merge");

        // Simple merge strategy: append new content
        currentCode.html += `\n<!-- Injected from ${randomProject.name} -->\n${randomProject.html}`;
        currentCode.css += `\n/* Injected from ${randomProject.name} */\n${randomProject.css}`;
        currentCode.js += `\n// Injected from ${randomProject.name}\ntry { (function() { ${randomProject.js} })(); } catch(e) { console.error('Error in injected script from ${randomProject.name}:', e); }`;

        renderCode(currentCode);
        logToConsole("Render complete. New version is live.", "merge");

        await saveCurrentCode();

    } catch (e) {
        logToConsole(`An error occurred during the merge cycle: ${e.message}`, "error");
    } finally {
        isMerging = false;
        triggerButton.disabled = false;
        triggerButton.textContent = 'Trigger Merge Now';
    }
}

async function init() {
    room = new WebsimSocket();
    await loadLatestCode();
    renderCode(currentCode);
    
    // Start the AI's periodic execution
    setInterval(runAiMerge, 20000); // every 20 seconds
    triggerButton.addEventListener('click', runAiMerge);
    
    logToConsole("AI Weaver is active. Automatic merge in 20 seconds.", "welcome");
}

init();

