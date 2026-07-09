const express  = require('express');
const router   = express.Router();
const Message  = require('../models/Message');
const User     = require('../models/User');
const { protect } = require('../middleware/authMiddleware');

// ── GET all conversations for current user ────────────────
router.get('/conversations', protect, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get latest message per conversation
    const messages = await Message.find({
      participants: userId
    })
    .sort({ createdAt: -1 })
    .populate('sender',   'username profilePic')
    .populate('receiver', 'username profilePic');

    // Build unique conversations
    const convMap = new Map();
    for (const msg of messages) {
      const otherId = msg.sender._id.toString() === userId.toString()
        ? msg.receiver._id.toString()
        : msg.sender._id.toString();

      if (!convMap.has(otherId)) {
        const otherUser = msg.sender._id.toString() === userId.toString()
          ? msg.receiver
          : msg.sender;

        // Count unread
        const unread = await Message.countDocuments({
          sender: otherId,
          receiver: userId,
          read: false,
        });

        convMap.set(otherId, {
          userId:     otherId,
          username:   otherUser.username,
          profilePic: otherUser.profilePic,
          lastMsg:    msg.text,
          lastTime:   msg.createdAt,
          unread,
        });
      }
    }

    res.json(Array.from(convMap.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET messages between two users ────────────────────────
router.get('/:userId', protect, async (req, res) => {
  try {
    const me    = req.user._id;
    const other = req.params.userId;

    const messages = await Message.find({
      $or: [
        { sender: me,    receiver: other },
        { sender: other, receiver: me    },
      ]
    })
    .sort({ createdAt: 1 })
    .populate('sender',   'username profilePic')
    .populate('receiver', 'username profilePic');

    // Mark as read
    await Message.updateMany(
      { sender: other, receiver: me, read: false },
      { $set: { read: true, readAt: new Date() } }
    );

    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEND message (REST fallback) ──────────────────────────
router.post('/send', protect, async (req, res) => {
  try {
    const { receiverId, text } = req.body;
    if (!receiverId || !text?.trim())
      return res.status(400).json({ error: 'receiverId and text required' });

    const receiver = await User.findById(receiverId);
    if (!receiver) return res.status(404).json({ error: 'User not found' });

    const msg = await Message.create({
      participants: [req.user._id, receiverId].sort(),
      sender:   req.user._id,
      receiver: receiverId,
      text:     text.trim(),
    });

    await msg.populate('sender',   'username profilePic');
    await msg.populate('receiver', 'username profilePic');

    res.json(msg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── SEARCH users to start new conversation ────────────────
router.get('/users/search', protect, async (req, res) => {
  try {
    const q = req.query.q || '';
    if (q.trim().length < 1) return res.json([]);

    const users = await User.find({
      _id:      { $ne: req.user._id },
      username: { $regex: q, $options: 'i' },
    }).select('username profilePic').limit(8);

    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE conversation ───────────────────────────────────
router.delete('/conversation/:userId', protect, async (req, res) => {
  try {
    const me    = req.user._id;
    const other = req.params.userId;
    await Message.deleteMany({
      $or: [
        { sender: me,    receiver: other },
        { sender: other, receiver: me    },
      ]
    });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;