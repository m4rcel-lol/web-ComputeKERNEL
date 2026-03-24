const output = document.getElementById("output");
const input = document.getElementById("input");
const promptEl = document.getElementById("prompt");
const overlay = document.getElementById("overlay");

let state = {
  user: "user",
  host: "computekernel",
  cwd: "/",
  fs: {
    "/": { type: "dir", children: {} }
  },
  history: []
};

/* ---------------- UTIL ---------------- */

function updatePrompt() {
  promptEl.textContent = `{${state.user}@${state.host}} ${state.cwd} #`;
}

function print(text = "") {
  output.innerHTML += text + "\n";
  output.scrollTop = output.scrollHeight;
}

function pathResolve(path) {
  if (!path) return state.cwd;
  let parts = (path.startsWith("/") ? path : state.cwd + "/" + path).split("/");
  let stack = [];
  for (let p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") stack.pop();
    else stack.push(p);
  }
  return "/" + stack.join("/");
}

function getNode(path) {
  let parts = path.split("/").filter(Boolean);
  let node = state.fs["/"];
  for (let p of parts) {
    if (!node.children[p]) return null;
    node = node.children[p];
  }
  return node;
}

function getParent(path) {
  let parts = path.split("/").filter(Boolean);
  let name = parts.pop();
  let parent = getNode("/" + parts.join("/"));
  return { parent, name };
}

/* ---------------- FILE SYSTEM ---------------- */

function mkdir(path) {
  let full = pathResolve(path);
  let { parent, name } = getParent(full);
  if (!parent || parent.type !== "dir") return "Invalid path";
  if (parent.children[name]) return "Already exists";
  parent.children[name] = { type: "dir", children: {} };
}

function touch(path) {
  let full = pathResolve(path);
  let { parent, name } = getParent(full);
  if (!parent) return "Invalid path";
  parent.children[name] = { type: "file", content: "" };
}

function writeFile(path, content) {
  let node = getNode(pathResolve(path));
  if (!node || node.type !== "file") return "File not found";
  node.content = content;
}

function remove(path) {
  let full = pathResolve(path);
  let { parent, name } = getParent(full);
  if (!parent || !parent.children[name]) return "Not found";
  delete parent.children[name];
}

/* ---------------- COMMANDS ---------------- */

const commands = {
  help() {
    return `
help clear whoami pwd ls cd cat echo mkdir touch rm write export_save import_save reboot shutdown
    `;
  },

  clear() {
    output.innerHTML = "";
  },

  whoami() {
    return state.user;
  },

  pwd() {
    return state.cwd;
  },

  ls() {
    let dir = getNode(state.cwd);
    return Object.entries(dir.children)
      .map(([k, v]) => (v.type === "dir" ? `[${k}]` : k))
      .join("  ");
  },

  cd(args) {
    let newPath = pathResolve(args[0] || "/");
    let node = getNode(newPath);
    if (!node || node.type !== "dir") return "No such directory";
    state.cwd = newPath;
  },

  cat(args) {
    let node = getNode(pathResolve(args[0]));
    if (!node || node.type !== "file") return "Not a file";
    return node.content;
  },

  echo(args) {
    return args.join(" ");
  },

  mkdir(args) {
    return mkdir(args[0]);
  },

  touch(args) {
    return touch(args[0]);
  },

  rm(args) {
    return remove(args[0]);
  },

  write(args) {
    let file = args[0];
    let content = args.slice(1).join(" ");
    return writeFile(file, content);
  },

  export_save() {
    let data = JSON.stringify(state, null, 2);
    let blob = new Blob([data], { type: "application/json" });
    let a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "computekernel_save.json";
    a.click();
  },

  import_save() {
    let fileInput = document.createElement("input");
    fileInput.type = "file";
    fileInput.onchange = e => {
      let file = e.target.files[0];
      let reader = new FileReader();
      reader.onload = () => {
        state = JSON.parse(reader.result);
        updatePrompt();
        print("Session restored.");
        saveLocal();
      };
      reader.readAsText(file);
    };
    fileInput.click();
  },

  reboot() {
    location.reload();
  },

  shutdown() {
    overlay.classList.remove("hidden");
    overlay.innerText = "System halted.";
  }
};

/* ---------------- COMMAND HANDLER ---------------- */

function runCommand(line) {
  state.history.push(line);
  let [cmd, ...args] = line.trim().split(" ");
  if (!cmd) return;

  if (!commands[cmd]) {
    print("Command not found");
    return;
  }

  let result = commands[cmd](args);
  if (result) print(result);

  updatePrompt();
  saveLocal();
}

/* ---------------- STORAGE ---------------- */

function saveLocal() {
  localStorage.setItem("ckernel_save", JSON.stringify(state));
}

function loadLocal() {
  let saved = localStorage.getItem("ckernel_save");
  if (saved) state = JSON.parse(saved);
}

/* ---------------- BOOT ---------------- */

async function boot() {
  const bootLines = [
    "Booting ComputeKERNEL...",
    "[ OK ] Initializing system...",
    "[ OK ] Loading kernel modules...",
    "[ OK ] Mounting filesystem...",
    "[ OK ] Starting services...",
    "Welcome to ComputeKERNEL"
  ];

  for (let line of bootLines) {
    print(line);
    await new Promise(r => setTimeout(r, 400));
  }
}

/* ---------------- INIT ---------------- */

input.addEventListener("keydown", e => {
  if (e.key === "Enter") {
    print(`${promptEl.textContent} ${input.value}`);
    runCommand(input.value);
    input.value = "";
  }
});

async function init() {
  loadLocal();
  await boot();
  updatePrompt();
}

init();
