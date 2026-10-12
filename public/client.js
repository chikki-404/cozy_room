const socket = io();
const $ = (id) => document.getElementById(id);
const GRID_W = 12, GRID_H = 8;

const ITEMS = { "🛋️":1,"🛏️":1,"🪑":1,"🪴":1,"📺":1,"🖼️":1,"🕯️":1,"🐱":1,"🧸":1,"🍽️":1 };
const PALETTE = [...Object.keys(ITEMS), "🧱", null]; // null = eraser

let myId = null, myRoom = null, isHost = false, selected = "🛋️", gameActive = false;
const cells = [];

function show(id) { $(id).classList.remove("hidden"); }
function hide(id) { $(id).classList.add("hidden"); }

// ---- Lobby ----
$("createBtn").onclick = () => socket.emit("createRoom", $("nameInput").value, onJoined);
$("joinBtn").onclick = () => socket.emit("joinRoom", { code: $("codeInput").value, name: $("nameInput").value }, onJoined);

function onJoined(res) {
  if (!res.ok) { $("lobbyError").textContent = res.error; return; }
  myId = res.you; myRoom = res.code;
  $("roomCode").textContent = res.code;
  hide("lobby"); show("room");
  if (res.grid) { buildGrid(); res.grid.forEach((row,y)=>row.forEach((it,x)=>setCell(x,y,it))); }
  (res.chat || []).forEach(addChatMsg);
  addChatMsg({ name: "System", text: "Welcome! Share the code so friends can join." });
}

$("copyBtn").onclick = () => navigator.clipboard.writeText(myRoom).then(()=> $("copyBtn").textContent = "Copied!");
$("leaveBtn").onclick = () => location.reload();
$("readyBtn").onclick = () => socket.emit("toggleReady");
$("startBtn").onclick = () => socket.emit("startGame");
$("resetBtn").onclick = () => socket.emit("resetRoom");

socket.on("roomUpdate", (info) => {
  isHost = info.host === myId;
  const list = $("playersList"); list.innerHTML = "";
  info.players.forEach(p => {
    const d = document.createElement("div");
    d.className = "player";
    d.innerHTML = `<span class="dot" style="background:${p.color}"></span>${p.name}${p.id===info.host?" 👑":""}${p.ready?" ✅":""}`;
    list.appendChild(d);
  });
  $("lobbyHint").textContent = info.players.length < 2
    ? "Need at least 2 players — share the room code!"
    : "Everyone must be ready to start.";
  $("startBtn").classList.toggle("hidden", !isHost || info.state !== "lobby");
  $("readyBtn").classList.toggle("hidden", info.state !== "lobby");
  $("resetBtn").classList.toggle("hidden", !isHost || info.state !== "playing");
});

socket.on("gameStarted", () => {
  gameActive = true;
  hide("lobbyView"); show("gameView");
  buildGrid(); buildPalette();
  addChatMsg({ name: "System", text: "Game started! Decorate together 🎨" });
});

socket.on("cellUpdate", ({ x, y, item }) => setCell(x, y, item));
socket.on("gridReset", () => { for (let y=0;y<GRID_H;y++) for (let x=0;x<GRID_W;x++) setCell(x,y,null); });

// ---- Game ----
function buildGrid() {
  const g = $("grid"); g.innerHTML = ""; cells.length = 0;
  for (let y = 0; y < GRID_H; y++) for (let x = 0; x < GRID_W; x++) {
    const c = document.createElement("div");
    c.className = "cell";
    c.onclick = () => { if (selected !== null) socket.emit("placeItem", { x, y, item: selected }); };
    c.oncontextmenu = (e) => { e.preventDefault(); socket.emit("placeItem", { x, y, item: null }); };
    g.appendChild(c); cells.push(c);
  }
}
function setCell(x, y, item) { cells[y*GRID_W+x].textContent = item || ""; }

function buildPalette() {
  const p = $("palette"); p.innerHTML = "";
  PALETTE.forEach(it => {
    const d = document.createElement("div");
    d.className = "pal-item" + (it === selected ? " selected" : "");
    d.textContent = it === null ? "🧽 Eraser" : it;
    d.onclick = () => { selected = it; buildPalette(); };
    p.appendChild(d);
  });
}

// ---- Chat ----
function addChatMsg({ name, text }) {
  const log = $("chatLog");
  const d = document.createElement("div");
  d.className = "msg";
  d.innerHTML = `<b>${escapeHtml(name)}:</b> ${escapeHtml(text)}`;
  log.appendChild(d); log.scrollTop = log.scrollHeight;
}
function escapeHtml(s) { const d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

function sendChat() {
  const t = $("chatInput").value;
  if (t.trim()) socket.emit("chat", t);
  $("chatInput").value = "";
}
$("sendBtn").onclick = sendChat;
$("chatInput").addEventListener("keydown", e => { if (e.key === "Enter") sendChat(); });
