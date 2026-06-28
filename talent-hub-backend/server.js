const express    = require('express');
const mongoose   = require('mongoose');
const cors       = require('cors');
const path       = require('path');
const http       = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

const app    = express();
const server = http.createServer(app);
const highlightRoutes = require('./routes/highlights');
const creativeRoutes  = require('./routes/creative');
const helpRequestRoutes = require('./routes/helpRequests');

// ✅ Uploads folder serve karo — SIRF EK BAAR
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://talenthub-mn78.vercel.app',
  'https://talenthub-ochre.vercel.app',
  'https://talenthub-git-main-prerana-tomars-projects.vercel.app',
  'https://talenthub-apkpz4nc7-prerana-tomars-projects.vercel.app',
];

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST'],
  },
});

app.use(cors({ origin: allowedOrigins }));

app.use(express.json());




app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  next();
});





// Routes
app.use('/api/auth',         require('./routes/auth'));
app.use('/api/videos',       require('./routes/videos'));
app.use('/api/thoughts',     require('./routes/thoughts'));
app.use('/api/competitions', require('./routes/competitions'));
app.use('/api/messages',     require('./routes/messages'));
app.use('/api/saved',        require('./routes/saved'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/highlights',   highlightRoutes);
app.use('/api/creative',     creativeRoutes);
app.use('/api/collab', require('./routes/collab'));
app.use('/api/help-requests', helpRequestRoutes);

// MongoDB
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error(err));

// ── Live Rooms Store (in-memory) ──
const liveRooms = new Map();

// ── Socket.io ──
io.on('connection', (socket) => {
  console.log('Socket connected:', socket.id);

  socket.on('go-live', ({ hostId, hostName, title, category }) => {
    const roomId = socket.id;
    liveRooms.set(roomId, {
      roomId,
      hostId,
      hostName,
      title:    title    || 'Live Performance',
      category: category || 'Other',
      viewers:  new Set(),
      chat:     [],
      startedAt: new Date(),
    });
    socket.join(roomId);
    io.emit('live-rooms-update', getLiveRoomsList());
    console.log(`${hostName} went live — room: ${roomId}`);
  });

  socket.on('join-room', ({ roomId, viewerName }) => {
    const room = liveRooms.get(roomId);
    if (!room) { socket.emit('room-not-found'); return; }

    socket.join(roomId);
    room.viewers.add(socket.id);
    socket.data.roomId     = roomId;
    socket.data.viewerName = viewerName;

    io.to(roomId).emit('viewer-count', room.viewers.size);
    io.emit('live-rooms-update', getLiveRoomsList());
    socket.emit('chat-history', room.chat);

    socket.to(room.hostId || roomId).emit('viewer-joined', {
      viewerId: socket.id,
      viewerName,
    });
  });

  socket.on('webrtc-offer', ({ to, offer }) => {
    io.to(to).emit('webrtc-offer', { from: socket.id, offer });
  });

  socket.on('webrtc-answer', ({ to, answer }) => {
    io.to(to).emit('webrtc-answer', { from: socket.id, answer });
  });

  socket.on('webrtc-ice', ({ to, candidate }) => {
    io.to(to).emit('webrtc-ice', { from: socket.id, candidate });
  });

  socket.on('chat-message', ({ roomId, sender, message }) => {
    const room = liveRooms.get(roomId);
    if (!room) return;

    const msg = {
      id:        Date.now(),
      sender,
      message,
      timestamp: new Date().toISOString(),
    };
    room.chat.push(msg);
    if (room.chat.length > 100) room.chat.shift();

    io.to(roomId).emit('chat-message', msg);
  });

  socket.on('end-live', ({ roomId }) => {
    liveRooms.delete(roomId);
    io.to(roomId).emit('live-ended');
    io.emit('live-rooms-update', getLiveRoomsList());
  });

  socket.on('disconnect', () => {
    if (liveRooms.has(socket.id)) {
      io.to(socket.id).emit('live-ended');
      liveRooms.delete(socket.id);
      io.emit('live-rooms-update', getLiveRoomsList());
      console.log(`Host disconnected — room ${socket.id} closed`);
    }

    const roomId = socket.data.roomId;
    if (roomId && liveRooms.has(roomId)) {
      const room = liveRooms.get(roomId);
      room.viewers.delete(socket.id);
      io.to(roomId).emit('viewer-count', room.viewers.size);
      io.emit('live-rooms-update', getLiveRoomsList());
    }
  });
});

function getLiveRoomsList() {
  return Array.from(liveRooms.values()).map(r => ({
    roomId:    r.roomId,
    hostName:  r.hostName,
    title:     r.title,
    category:  r.category,
    viewers:   r.viewers.size,
    startedAt: r.startedAt,
  }));
}

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});



const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));