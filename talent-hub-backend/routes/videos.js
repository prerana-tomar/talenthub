const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Video    = require('../models/Video');
const { protect } = require('../middleware/authMiddleware');

// ── Multer Storage Setup ──
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename:    (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage });

// ─────────────────────────────────────────────
// GET /api/videos/search — Search videos
// ─────────────────────────────────────────────
router.get('/search', async (req, res) => {
  try {
    const {
      q = '',
      category,
      sort = 'newest',
      page = 1,
      limit = 12,
    } = req.query;

    const filter = {};

    if (q.trim()) {
      filter.$or = [
        { title:       { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    const sortMap = {
      newest:   { createdAt: -1 },
      popular:  { views: -1 },
      trending: { views: -1 },
      likes:    { likes: -1 },
    };

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [videos, total] = await Promise.all([
      Video.find(filter)
        .populate('uploader', 'username email')
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Video.countDocuments(filter),
    ]);

    res.json({ videos, total, page: parseInt(page) });

  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/videos/my — Logged in user ke saare videos
// ─────────────────────────────────────────────
router.get('/my', protect, async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.user._id })
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/videos — Get all videos
// ─────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'All' ? { category } : {};

    const videos = await Video.find(filter)
      .populate('uploader', 'username email')
      .sort({ createdAt: -1 });

    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// GET /api/videos/:id — Single video fetch  ← YE NAYA ADD HUA
// ─────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploader', 'username email profilePic');

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    res.json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/videos — Upload new video
// ─────────────────────────────────────────────
router.post('/', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No video file uploaded.' });
    }

    const { title, category } = req.body;
    if (!title) {
      return res.status(400).json({ message: 'Title is required.' });
    }

    const video = await Video.create({
      title,
      category: category || 'Other',
      filename: req.file.filename,
      url:      `/uploads/${req.file.filename}`,
      uploader: req.user._id,
    });

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/videos/:id/view — Increment views
// ─────────────────────────────────────────────
router.post('/:id/view', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(
      req.params.id,
      { $inc: { views: 1 } },
      { new: true }
    );
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json({ views: video.views });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// POST /api/videos/:id/like — Like video
// ─────────────────────────────────────────────
router.post('/:id/like', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const userId       = req.user._id.toString();
    const alreadyLiked = video.likes.map(id => id.toString()).includes(userId);

    if (alreadyLiked) {
      video.likes = video.likes.filter(id => id.toString() !== userId);
      await video.save();
      return res.json({ alreadyLiked: false, likes: video.likes.length });
    }

    video.likes.push(req.user._id);
    await video.save();

    res.json({ alreadyLiked: true, likes: video.likes.length });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────
// DELETE /api/videos/:id — Delete video
// ─────────────────────────────────────────────
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({ message: 'Video not found' });
    }

    if (video.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this video' });
    }

    const filePath = path.join(__dirname, '..', 'uploads', video.filename);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await video.deleteOne();

    res.json({ message: 'Video deleted successfully' });

  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;