/**
 * ComputeKERNEL Logic Core
 */

const output = document.getElementById('output');
const input = document.getElementById('cmd-input');
const promptLabel = document.getElementById('prompt');
const fileImport = document.getElementById('file-import');

// --- SYSTEM STATE ---
let kernel = {
    user: "user",
    hostname: "computekernel",
    cwd: "/home/user",
    vfs: {
        "/": { type: "dir", children: ["bin", "etc", "home", "tmp"] },
        "/bin": { type: "dir", children: ["clear", "help"] },
        "/etc": { type: "dir", children: ["os-release"] },
        "/etc/os-release": { type: "file", content: "NAME=ComputeKERNEL\nID=web-kernel\nVERSION=1.0.2" },
        "/home": { type: "dir", children: ["user"] },
        "/home/user": { type: "dir", children: ["readme.txt"] },
        "/home/user/readme.txt": { type: "file", content: "Welcome to the ComputeKERNEL browser terminal." }
    }
};

// --- CORE UTILS ---
const print = (text, type = "") => {
    const div = document.createElement('div');
    div.className = type;
    div.textContent = text;
    output.appendChild(div);
    document.getElementById('terminal').scrollTop = document.getElementById('terminal').scrollHeight;
};

const updatePrompt = () => {
    promptLabel.textContent = `{${kernel.user}@${kernel.hostname}} #`;
};

// --- COMMAND HANDLERS ---
const commands = {
    help: () => "Commands: ls, cat, pwd, clear, whoami, export_save, import_save, mkdir, touch",
    
    whoami: () => kernel.user,

    pwd: () => kernel.cwd,

    clear: () => { output.innerHTML = ""; return ""; },

    ls: () => {
        const node = kernel.vfs[kernel.cwd];
        return node.children.join("  ");
    },

    cat: (args) => {
        const path = args[0].startsWith('/') ? args[0] : `${kernel.cwd}/${args[0]}`;
        const file = kernel.vfs[path.replace(/\/$/, "")];
        return (file && file.type === "file") ? file.content : `cat: ${args[0]}: No such file`;
    },

    export_save: () => {
        const data = JSON.stringify(kernel);
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = "system.ckernel";
        a.click();
        return "System snapshot saved to disk.";
    },

    import_save: () => {
        fileImport.click();
        return "Initializing import bridge...";
    }
};

// --- SYSTEM INITIALIZATION ---
async function boot() {
    const bootSequence = [
        "Starting ComputeKERNEL USB Boot...",
        "CPU: WebAssembly Virtualized Instance @ 2.4GHz",
        "Memory: 1024MB Virtual RAM Allocated",
        "VFS: Mounting Root File System...",
        "NET: Establishing socket bridge...",
        "OK: System Ready.",
        "--------------------------------------"
    ];

    for (const line of bootSequence) {
        print(line, "boot-line");
        await new Promise(r => setTimeout(r, 100));
    }
    updatePrompt();
}

// --- EVENT LISTENERS ---
input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
        const raw = input.value.trim();
        const [cmd, ...args] = raw.split(' ');
        
        print(`${promptLabel.textContent} ${raw}`);

        if (cmd && commands[cmd]) {
            const res = await commands[cmd](args);
            if (res) print(res);
        } else if (cmd) {
            print(`kernel: command not found: ${cmd}`);
        }

        input.value = "";
    }
});

fileImport.addEventListener('change', (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            kernel = JSON.parse(event.target.result);
            updatePrompt();
            print(">>> System Restore Complete.", "boot-line");
        } catch (err) {
            print(">>> ERROR: Corrupt .ckernel file.", "boot-line");
        }
    };
    reader.readAsText(file);
});

boot();
