# 🏡 CozyRoom — Multiplayer Decorating Game (MVP)

A real-time multiplayer game where **2–4 players** join a room with a code,
chat together, and collaboratively decorate a shared room grid.

## Features
- Create/join rooms with a 6-character code
- 2–4 players per room, ready-up flow, host controls
- Real-time shared decorating grid (furniture, plants, pets…)
- In-room chat 💬
- Host can reset the room

## How to run
1. Install Node.js (https://nodejs.org)
2. In this folder, run:
   ```
   npm install
   npm start
   ```
3. Open http://localhost:3000 in your browser
4. To play with friends on the same Wi-Fi, share your local IP
   (e.g. http://192.168.x.x:3000). For internet play, deploy to
   Render/Railway/Heroku or use a tunnel like ngrok.

## Project structure
- `server.js` — Express + Socket.IO server (rooms, game state, chat)
- `public/index.html` — UI
- `public/style.css` — styling
- `public/client.js` — game client logic

## Next steps / roadmap
1. Add accounts + persistent saved rooms
2. Turn-based puzzle mode (memory match, sliding puzzle)
3. Replace grid with 2.5D/3D view (Three.js) or port to Unity
4. Moderation: profanity filter, report/block in chat
5. Mobile app wrapper (Capacitor) or Unity rewrite with Photon
