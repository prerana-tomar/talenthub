const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Video   = require('../models/Video');
const { protect } = require('../middleware/authMiddleware');

// ─────────────────────────────────────────────────────────
// GET /api/profile/:id
// Get any user's public profile + their videos
// ─────────────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const videos = await Video.find({ uploader: req.params.id })
      .sort({ createdAt: -1 });

    const totalViews = videos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalLikes = videos.reduce((sum, v) => sum + (Array.isArray(v.likes) ? v.likes.length : 0), 0);

    res.json({
      user,
      videos,
      stats: {
        totalVideos: videos.length,
        totalViews,
        totalLikes,
      },
    });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────
// PUT /api/profile/update
// Update logged-in user's name and bio
// ─────────────────────────────────────────────────────────
router.put('/update', protect, async (req, res) => {
  try {
    const { name, bio } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, bio },
      { new: true }
    ).select('-password');

    // Update localStorage on frontend after this
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;