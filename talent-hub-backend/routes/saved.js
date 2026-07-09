const express = require('express');
const router  = express.Router();
const User    = require('../models/User');
const Video   = require('../models/Video');
const { protect } = require('../middleware/authMiddleware');

// ── GET saved videos + performers ────────────────────────
router.get('/', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
      .populate({
        path: 'savedVideos',
        populate: { path: 'uploader', select: 'username profilePic' }
      })
      .populate('savedPerformers', 'username bio category profilePic');

    res.json({
      videos:     user.savedVideos     || [],
      performers: user.savedPerformers || [],
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TOGGLE save video ─────────────────────────────────────
router.post('/video/:videoId', protect, async (req, res) => {
  try {
    const user    = await User.findById(req.user._id);
    const videoId = req.params.videoId;

    const idx = user.savedVideos.findIndex(id => id.toString() === videoId);
    let saved;
    if (idx === -1) {
      user.savedVideos.push(videoId);
      saved = true;
    } else {
      user.savedVideos.splice(idx, 1);
      saved = false;
    }
    await user.save();
    res.json({ saved, count: user.savedVideos.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CHECK if video is saved ───────────────────────────────
router.get('/video/:videoId/check', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('savedVideos');
    const saved = user.savedVideos.map(id => id.toString()).includes(req.params.videoId);
    res.json({ saved });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── TOGGLE save performer ─────────────────────────────────
router.post('/performer/:performerId', protect, async (req, res) => {
  try {
    const user        = await User.findById(req.user._id);
    const performerId = req.params.performerId;

    if (performerId === req.user._id.toString())
      return res.status(400).json({ error: "Can't save yourself" });

    const idx = user.savedPerformers.findIndex(id => id.toString() === performerId);
    let saved;
    if (idx === -1) {
      user.savedPerformers.push(performerId);
      saved = true;
    } else {
      user.savedPerformers.splice(idx, 1);
      saved = false;
    }
    await user.save();
    res.json({ saved, count: user.savedPerformers.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;