const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const Video    = require('../models/Video');
const { protect } = require('../middleware/authMiddleware');

// ── Cloudinary Config ──
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ── Multer + Cloudinary Storage ──
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        'talenthub',
    resource_type: 'video',
    allowed_formats: ['mp4', 'mov', 'webm'],
  },
});
const upload = multer({ storage });

// GET /api/videos/search
router.get('/search', async (req, res) => {
  try {
    const { q = '', category, sort = 'newest', page = 1, limit = 12 } = req.query;
    const filter = {};
    if (q.trim()) {
      filter.$or = [
        { title:       { $regex: q.trim(), $options: 'i' } },
        { description: { $regex: q.trim(), $options: 'i' } },
      ];
    }
    if (category && category !== 'All') filter.category = category;
    const sortMap = { newest: { createdAt: -1 }, popular: { views: -1 }, trending: { views: -1 }, likes: { likes: -1 } };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [videos, total] = await Promise.all([
      Video.find(filter).populate('uploader', 'username email').sort(sortMap[sort] || { createdAt: -1 }).skip(skip).limit(parseInt(limit)),
      Video.countDocuments(filter),
    ]);
    res.json({ videos, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Search failed', error: err.message });
  }
});

// GET /api/videos/my
router.get('/my', protect, async (req, res) => {
  try {
    const videos = await Video.find({ uploader: req.user._id }).sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/videos
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category && category !== 'All' ? { category } : {};
    const videos = await Video.find(filter).populate('uploader', 'username email').sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id).populate('uploader', 'username email profilePic');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos — Upload to Cloudinary
router.post('/', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file uploaded.' });
    const { title, category } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    const video = await Video.create({
      title,
      category: category || 'Other',
      filename: req.file.filename || req.file.public_id,
      url:      req.file.path,
      uploader: req.user._id,
    });

    res.status(201).json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/:id/view
router.post('/:id/view', async (req, res) => {
  try {
    const video = await Video.findByIdAndUpdate(req.params.id, { $inc: { views: 1 } }, { new: true });
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json({ views: video.views });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/:id/like
router.post('/:id/like', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    const userId = req.user._id.toString();
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

// DELETE /api/videos/:id
router.delete('/:id', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    if (video.uploader.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this video' });
    }
    // Cloudinary se bhi delete karo
    if (video.filename) {
      await cloudinary.uploader.destroy(video.filename, { resource_type: 'video' }).catch(() => {});
    }
    await video.deleteOne();
    res.json({ message: 'Video deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;