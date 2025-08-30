import { WebsimSocket } from 'websim';

const consoleEl = document.getElementById('console');
const renderTarget = document.getElementById('render-target');
const triggerButton = document.getElementById('trigger-button');
const spinner = document.getElementById('spinner');

const COLLECTION_TYPE = 'ai_weaver_project_v2'; // Bumped version for new merge logic
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
            const recordToUpdate = records[0];
            await room.collection(COLLECTION_TYPE).update(recordToUpdate.id, currentCode);
        } else {
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
        // Give the socket some time to connect and fetch initial data.
        setTimeout(() => {
            const records = room.collection(COLLECTION_TYPE).getList();
            if (records && records.length > 0) {
                const latestRecord = records[0];
                currentCode = {
                    html: latestRecord.html || currentCode.html,
                    css: latestRecord.css || currentCode.css,
                    js: latestRecord.js || currentCode.js
                };
                logToConsole("Successfully loaded saved state from database.");
            } else {
                logToConsole("No saved state found. Starting with initial template.");
            }
            resolve(true);
        }, 1500); // Wait 1.5s for records to populate
    });
}

async function runAiMerge() {
    if (isMerging) return;
    isMerging = true;
    triggerButton.disabled = true;
    triggerButton.textContent = 'AI is Weaving...';
    spinner.classList.remove('hidden');

    try {
        logToConsole("AI cycle initiated...", "scan");
        await new Promise(res => setTimeout(res, 1000));
        
        const randomProject = MOCK_PROJECTS[Math.floor(Math.random() * MOCK_PROJECTS.length)];
        logToConsole(`Found random project: '${randomProject.name}'`, "scan");
        await new Promise(res => setTimeout(res, 1500));
        
        logToConsole("Engaging AI to merge code...", "merge");

        const systemPrompt = `You are an expert web developer AI. Your task is to merge two codebases (HTML, CSS, JS).
Combine the 'new code' into the 'current code' in a creative and functional way.
The goal is to create a single, coherent, and visually interesting webpage.
- You can add, remove, or modify elements.
- You can rewrite styles to make them compatible.
- You can adjust scripts to work together, avoiding conflicts.
- Be creative! The result should be a surprising and functional mashup.

Respond ONLY with a JSON object with 'html', 'css', and 'js' keys containing the new, merged code as strings.
Do not include any other text, explanations, or markdown formatting.
The JSON response should look like:
{
  "html": "...",
  "css": "...",
  "js": "..."
}`;

        const userPrompt = `Current Code:
HTML:
\`\`\`html
${currentCode.html}
\`\`\`
CSS:
\`\`\`css
${currentCode.css}
\`\`\`
JS:
\`\`\`javascript
${currentCode.js}
\`\`\`

New Code to merge (from project '${randomProject.name}'):
HTML:
\`\`\`html
${randomProject.html}
\`\`\`
CSS:
\`\`\`css
${randomProject.css}
\`\`\`
JS:
\`\`\`javascript
${randomProject.js}
\`\`\`
`;

        const completion = await websim.chat.completions.create({
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: [{ type: "text", text: userPrompt }] }
            ],
            json: true,
        });

        const result = JSON.parse(completion.content);
        
        currentCode = {
            html: result.html,
            css: result.css,
            js: result.js
        };

        renderCode(currentCode);
        logToConsole("AI merge complete. New version is live.", "merge");

        await saveCurrentCode();

    } catch (e) {
        logToConsole(`An error occurred during the merge cycle: ${e.message}`, "error");
        console.error(e);
    } finally {
        isMerging = false;
        triggerButton.disabled = false;
        triggerButton.textContent = 'Trigger Merge Now';
        spinner.classList.add('hidden');
    }
}

async function init() {
    room = new WebsimSocket();
    logToConsole("Websim socket connected.", "welcome");

    await loadLatestCode();
    
    renderCode(currentCode);
    logToConsole("Initial render complete.", "welcome");
    
    // Start the AI's periodic execution
    setInterval(runAiMerge, 30000); // every 30 seconds
    triggerButton.addEventListener('click', runAiMerge);
    
    logToConsole("AI Weaver is active. Automatic merge in 30 seconds.", "welcome");
}

init();