const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (req, res) => res.send("ok"));

const MAX_PLAYERS = 4;
const GRID_W = 12, GRID_H = 8;
const rooms = new Map(); // code -> room

const genCode = () => {
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let c = "";
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? genCode() : c;
};

const roomInfo = (room) => ({
  code: room.code,
  state: room.state,
  host: room.host,
  players: room.players.map(p => ({ id: p.id, name: p.name, ready: p.ready, color: p.color }))
});

const COLORS = ["#e74c3c", "#3498db", "#2ecc71", "#f39c12"];

io.on("connection", (socket) => {
  let myRoom = null;
  let myName = null;

  socket.on("createRoom", (name, cb) => {
    name = String(name || "Player").slice(0, 16) || "Player";
    const code = genCode();
    const room = {
      code, host: socket.id, state: "lobby",
      grid: Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null)),
      players: [{ id: socket.id, name, ready: false, color: COLORS[0] }],
      chat: []
    };
    rooms.set(code, room);
    socket.join(code);
    myRoom = code; myName = name;
    cb({ ok: true, code, you: socket.id });
  });

  socket.on("joinRoom", ({ code, name }, cb) => {
    code = String(code || "").toUpperCase().trim();
    name = String(name || "Player").slice(0, 16) || "Player";
    const room = rooms.get(code);
    if (!room) return cb({ ok: false, error: "Room not found" });
    if (room.players.length >= MAX_PLAYERS) return cb({ ok: false, error: "Room is full (max 4)" });
    const color = COLORS[room.players.length % COLORS.length];
    room.players.push({ id: socket.id, name, ready: false, color });
    socket.join(code);
    myRoom = code; myName = name;
    socket.to(code).emit("roomUpdate", roomInfo(room));
    socket.to(code).emit("chat", { name: "System", text: `${name} joined the room 🎉`, ts: Date.now() });
    cb({ ok: true, code, you: socket.id, grid: room.grid, chat: room.chat.slice(-50) });
  });

  socket.on("toggleReady", () => {
    const room = rooms.get(myRoom); if (!room) return;
    const p = room.players.find(p => p.id === socket.id); if (!p) return;
    p.ready = !p.ready;
    io.to(myRoom).emit("roomUpdate", roomInfo(room));
  });

  socket.on("startGame", () => {
    const room = rooms.get(myRoom); if (!room) return;
    if (room.host !== socket.id) return;
    if (room.players.length < 2) return;
    if (!room.players.every(p => p.ready)) return;
    room.state = "playing";
    io.to(myRoom).emit("gameStarted");
  });

  socket.on("placeItem", ({ x, y, item }) => {
    const room = rooms.get(myRoom);
    if (!room || room.state !== "playing") return;
    if (x < 0 || x >= GRID_W || y < 0 || y >= GRID_H) return;
    if (item !== null && typeof item !== "string") return;
    room.grid[y][x] = item;
    socket.to(myRoom).emit("cellUpdate", { x, y, item });
  });

  socket.on("chat", (text) => {
    const room = rooms.get(myRoom); if (!room) return;
    text = String(text || "").slice(0, 200).trim(); if (!text) return;
    const p = room.players.find(p => p.id === socket.id);
    const msg = { name: p ? p.name : "???", text, ts: Date.now() };
    room.chat.push(msg);
    if (room.chat.length > 200) room.chat.shift();
    io.to(myRoom).emit("chat", msg);
  });

  socket.on("resetRoom", () => {
    const room = rooms.get(myRoom);
    if (!room || room.host !== socket.id) return;
    room.grid = Array.from({ length: GRID_H }, () => Array(GRID_W).fill(null));
    io.to(myRoom).emit("gridReset");
  });

  socket.on("disconnect", () => {
    const room = rooms.get(myRoom); if (!room) return;
    room.players = room.players.filter(p => p.id !== socket.id);
    if (room.players.length === 0) { rooms.delete(myRoom); return; }
    if (room.host === socket.id) room.host = room.players[0].id;
    io.to(myRoom).emit("roomUpdate", roomInfo(room));
    io.to(myRoom).emit("chat", { name: "System", text: `${myName} left the room`, ts: Date.now() });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🎮 CozyRoom running at http://localhost:${PORT}`));
