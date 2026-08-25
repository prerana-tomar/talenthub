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

// ── Multer + Cloudinary Thumbnail Storage ──
const thumbnailStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        'talenthub_thumbnails',
    resource_type: 'image',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const uploadThumbnail = multer({ storage: thumbnailStorage });

// ── Multer + Cloudinary Audio Storage ──
const audioStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:        'talenthub_audio',
    resource_type: 'video',
    allowed_formats: ['mp3', 'wav', 'aac', 'm4a', 'ogg'],
  },
});
const uploadAudio = multer({ storage: audioStorage });

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
      Video.find(filter).populate('uploader', 'username email profilePic').sort(sortMap[sort] || { createdAt: -1 }).skip(skip).limit(parseInt(limit)),
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
    const videos = await Video.find(filter).populate('uploader', 'username email profilePic').sort({ createdAt: -1 });
    res.json(videos);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/videos/:id
router.get('/:id', async (req, res) => {
  try {
    const video = await Video.findById(req.params.id)
      .populate('uploader', 'username email profilePic')
      .populate('comments.author', 'username profilePic');
    if (!video) return res.status(404).json({ message: 'Video not found' });
    res.json(video);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/upload-thumbnail
router.post('/upload-thumbnail', protect, uploadThumbnail.single('thumbnail'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No image file uploaded.' });
    res.json({
      url: req.file.path,
      filename: req.file.filename || req.file.public_id,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/upload-audio
router.post('/upload-audio', protect, uploadAudio.single('audio'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No audio file uploaded.' });
    res.json({
      url: req.file.path,
      filename: req.file.filename || req.file.public_id,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos — Upload to Cloudinary
router.post('/', protect, upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No video file uploaded.' });
    const { title, category, thumbnailUrl, thumbnailFilename, musicUrl, musicName } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required.' });

    const video = await Video.create({
      title,
      category: category || 'Other',
      filename: req.file.filename || req.file.public_id,
      url:      req.file.path,
      uploader: req.user._id,
      thumbnailUrl: thumbnailUrl || null,
      thumbnailFilename: thumbnailFilename || null,
      musicUrl: musicUrl || '',
      musicName: musicName || '',
    });

    // Check uploader achievements (e.g. First Upload)
    const { checkAndUnlockAchievements } = require('./achievements');
    await checkAndUnlockAchievements(req.user._id);

    // Trigger notification for successful upload (upload_approved)
    const { sendNotification } = require('../utils/notifications');
    await sendNotification(req, {
      recipient: req.user._id,
      sender: req.user._id,
      type: 'upload_approved',
      message: `Your video "${video.title}" has been successfully uploaded and approved!`,
      link: `/video/${video._id}`,
      relatedVideo: video._id
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

    // Check uploader achievements (e.g. 100 Views, 1,000 Views)
    const { checkAndUnlockAchievements } = require('./achievements');
    await checkAndUnlockAchievements(video.uploader);

    res.json({ views: video.views });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/:id/appreciate
router.post('/:id/appreciate', protect, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const userId = req.user._id.toString();
    const { reactionType = 'lovedIt' } = req.body;
    const validTypes = ['applause', 'lovedIt', 'outstanding', 'inspiring'];
    if (!validTypes.includes(reactionType)) {
      return res.status(400).json({ message: 'Invalid reaction type' });
    }

    if (!video.appreciations) {
      video.appreciations = { applause: [], lovedIt: [], outstanding: [], inspiring: [] };
    }

    let activeReaction = null;
    for (const type of validTypes) {
      const arr = video.appreciations[type] || [];
      const idx = arr.findIndex(id => id.toString() === userId);
      if (idx !== -1) {
        activeReaction = type;
        arr.splice(idx, 1);
      }
    }

    let userSelected = null;
    if (activeReaction !== reactionType) {
      if (!video.appreciations[reactionType]) video.appreciations[reactionType] = [];
      video.appreciations[reactionType].push(req.user._id);
      userSelected = reactionType;

      const { sendNotification } = require('../utils/notifications');
      if (video.uploader.toString() !== userId) {
        await sendNotification(req, {
          recipient: video.uploader,
          sender: req.user._id,
          type: 'like',
          message: `appreciated your video "${video.title}"`,
          link: `/video/${video._id}`,
          relatedVideo: video._id
        });
      }
    }

    await video.save();

    const { checkAndUnlockAchievements } = require('./achievements');
    const newlyUnlocked = await checkAndUnlockAchievements(video.uploader);

    const counts = {
      applause:    video.appreciations.applause?.length || 0,
      lovedIt:     (video.appreciations.lovedIt?.length || 0) + (video.likes?.length || 0),
      outstanding: video.appreciations.outstanding?.length || 0,
      inspiring:   video.appreciations.inspiring?.length || 0,
    };
    const total = counts.applause + counts.lovedIt + counts.outstanding + counts.inspiring;

    res.json({
      counts,
      total,
      userReaction: userSelected,
      newlyUnlocked,
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/videos/:id/like (Legacy fallback)
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

    const { sendNotification } = require('../utils/notifications');
    if (video.uploader.toString() !== userId) {
      await sendNotification(req, {
        recipient: video.uploader,
        sender: req.user._id,
        type: 'like',
        message: `liked your video "${video.title}"`,
        link: `/video/${video._id}`,
        relatedVideo: video._id
      });
    }
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

// POST /api/videos/:id/comments
router.post('/:id/comments', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Comment text is required.' });
    }
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found.' });

    const newComment = {
      author: req.user._id,
      text: text.trim(),
    };

    video.comments.push(newComment);
    await video.save();

    // Populate comments.author to send back
    const populatedVideo = await Video.findById(video._id).populate('comments.author', 'username profilePic');

    // Create Notification
    const uploaderId = video.uploader.toString();
    const commenterId = req.user._id.toString();
    if (uploaderId !== commenterId) {
      const { sendNotification } = require('../utils/notifications');
      await sendNotification(req, {
        recipient: video.uploader,
        sender: req.user._id,
        type: 'comment',
        message: `commented on your video "${video.title}"`,
        link: `/video/${video._id}`,
        relatedVideo: video._id
      });
    }

    res.json({ comments: populatedVideo.comments });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;