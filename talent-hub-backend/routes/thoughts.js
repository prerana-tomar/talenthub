const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Thought  = require('../models/Thought');
const authMiddleware = require('../middleware/auth');

// ── Cloudinary config ─────────────────────────────────────────
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer + Cloudinary Storage ───────────────────────────────
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          'talenthub/thoughts',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation:  [{ width: 1080, crop: 'limit', quality: 'auto' }],
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
});

// GET /api/thoughts
router.get('/', async (req, res) => {
  try {
    const filter = {};
    if (req.query.category && req.query.category !== 'All') {
      filter.category = req.query.category;
    }
    const thoughts = await Thought.find(filter)
      .populate('author', 'username profilePic')
      .populate('comments.author', 'username profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(thoughts);
  } catch (err) {
    console.error('GET thoughts error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/thoughts
router.post('/', authMiddleware, upload.array('images', 4), async (req, res) => {
  try {
    const text     = req.body.text     || '';
    const category = req.body.category || 'General';

    if (!text.trim() && (!req.files || req.files.length === 0)) {
      return res.status(400).json({ message: 'Text ya image zaroori hai' });
    }

    const images = req.files ? req.files.map(f => f.path) : [];

    const thought = await Thought.create({
      author:   req.user.id || req.user._id,
      text:     text.trim(),
      category,
      images,
      image: images[0] || null,
    });

    const populated = await thought.populate('author', 'username profilePic');
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST thought error:', err);
    res.status(500).json({ message: 'Server error: ' + err.message });
  }
});

// PUT /api/thoughts/:id
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Thought not found' });

    const userId = req.user.id || req.user._id;
    if (thought.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    thought.text = req.body.text || thought.text;
    await thought.save();
    res.json({ text: thought.text });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/thoughts/:id
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    const userId = req.user.id || req.user._id;
    if (thought.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (thought.images && thought.images.length > 0) {
      for (const imgUrl of thought.images) {
        try {
          const parts    = imgUrl.split('/');
          const file     = parts[parts.length - 1].split('.')[0];
          const folder   = parts[parts.length - 2];
          const publicId = `${folder}/${file}`;
          await cloudinary.uploader.destroy(publicId);
        } catch (e) {}
      }
    }

    await thought.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/thoughts/:id/like
router.post('/:id/like', authMiddleware, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    const userId = (req.user.id || req.user._id).toString();
    const idx    = thought.likes.findIndex(id => id.toString() === userId);

    if (idx === -1) thought.likes.push(userId);
    else            thought.likes.splice(idx, 1);

    await thought.save();
    res.json({ likes: thought.likes.length, liked: idx === -1 });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/thoughts/:id/comments
router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    thought.comments.push({
      author: req.user.id || req.user._id,
      text:   text.trim(),
    });
    await thought.save();
    await thought.populate('comments.author', 'username profilePic');

    res.json({ comments: thought.comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;