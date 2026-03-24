// SAFE INIT (prevents null errors)
window.addEventListener("DOMContentLoaded", () => {
  const output = document.getElementById("output");
  const input = document.getElementById("input");
  const promptEl = document.getElementById("prompt");
  const overlay = document.getElementById("overlay");

  let state = {
    user: "user",
    host: "computekernel",
    cwd: "/",
    fs: { "/": { type: "dir", children: {} } },
    history: []
  };

  /* ---------------- PRINT ---------------- */

  function print(text = "") {
    output.innerHTML += text + "\n";
    output.scrollTop = output.scrollHeight;
  }

  function updatePrompt() {
    promptEl.textContent = `{${state.user}@${state.host}} ${state.cwd} #`;
  }

  /* ---------------- PATH ---------------- */

  function resolve(path = "") {
    if (!path) return state.cwd;

    let base = path.startsWith("/") ? path : state.cwd + "/" + path;
    let parts = base.split("/");

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

  /* ---------------- FS OPS ---------------- */

  function mkdir(p) {
    let full = resolve(p);
    let { parent, name } = getParent(full);

    if (!parent) return "Invalid path";
    if (parent.children[name]) return "Already exists";

    parent.children[name] = { type: "dir", children: {} };
  }

  function touch(p) {
    let full = resolve(p);
    let { parent, name } = getParent(full);

    if (!parent) return "Invalid path";

    parent.children[name] = { type: "file", content: "" };
  }

  function rm(p) {
    let full = resolve(p);
    let { parent, name } = getParent(full);

    if (!parent || !parent.children[name]) return "Not found";

    delete parent.children[name];
  }

  /* ---------------- COMMANDS ---------------- */

  const commands = {
    help: () =>
      "help clear whoami pwd ls cd cat echo mkdir touch rm write export_save import_save reboot shutdown",

    clear: () => (output.innerHTML = ""),

    whoami: () => state.user,

    pwd: () => state.cwd,

    ls: () => {
      let dir = getNode(state.cwd);
      return Object.entries(dir.children)
        .map(([k, v]) => (v.type === "dir" ? `[${k}]` : k))
        .join("  ");
    },

    cd: (args) => {
      let path = resolve(args[0] || "/");
      let node = getNode(path);

      if (!node || node.type !== "dir") return "No such directory";

      state.cwd = path;
    },

    cat: (args) => {
      let node = getNode(resolve(args[0]));
      if (!node || node.type !== "file") return "Not a file";
      return node.content;
    },

    echo: (args) => args.join(" "),

    mkdir: (args) => mkdir(args[0]),

    touch: (args) => touch(args[0]),

    rm: (args) => rm(args[0]),

    write: (args) => {
      let file = resolve(args[0]);
      let node = getNode(file);
      if (!node || node.type !== "file") return "File not found";
      node.content = args.slice(1).join(" ");
    },

    export_save: () => {
      let blob = new Blob([JSON.stringify(state)], {
        type: "application/json"
      });

      let a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "computekernel.json";
      a.click();
    },

    import_save: () => {
      let inputFile = document.createElement("input");
      inputFile.type = "file";

      inputFile.onchange = e => {
        let file = e.target.files[0];
        let reader = new FileReader();

        reader.onload = () => {
          try {
            state = JSON.parse(reader.result);
            print("Session restored.");
            updatePrompt();
            save();
          } catch {
            print("Invalid save file");
          }
        };

        reader.readAsText(file);
      };

      inputFile.click();
    },

    reboot: () => location.reload(),

    shutdown: () => {
      overlay.classList.remove("hidden");
      overlay.textContent = "System halted.";
    }
  };

  function run(line) {
    state.history.push(line);

    let [cmd, ...args] = line.trim().split(/\s+/);
    if (!cmd) return;

    if (!commands[cmd]) {
      print("Command not found");
      return;
    }

    let result = commands[cmd](args);
    if (result) print(result);

    updatePrompt();
    save();
  }

  /* ---------------- STORAGE ---------------- */

  function save() {
    localStorage.setItem("ckernel", JSON.stringify(state));
  }

  function load() {
    let s = localStorage.getItem("ckernel");
    if (s) {
      try {
        state = JSON.parse(s);
      } catch {}
    }
  }

  /* ---------------- BOOT ---------------- */

  async function boot() {
    const lines = [
      "Booting ComputeKERNEL...",
      "[ OK ] Initializing...",
      "[ OK ] Loading modules...",
      "[ OK ] Mounting fs...",
      "[ OK ] Starting services...",
      "Welcome to ComputeKERNEL"
    ];

    for (let l of lines) {
      print(l);
      await new Promise(r => setTimeout(r, 300));
    }
  }

  /* ---------------- INPUT ---------------- */

  input.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      print(`${promptEl.textContent} ${input.value}`);
      run(input.value);
      input.value = "";
    }
  });

  /* ---------------- INIT ---------------- */

  async function init() {
    load();
    await boot();
    updatePrompt();
  }

  init();
});
