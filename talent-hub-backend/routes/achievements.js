const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Video = require('../models/Video');
const Thought = require('../models/Thought');
const Collab = require('../models/Collab');
const authMiddleware = require('../middleware/auth');

const ALL_ACHIEVEMENTS = [
  { key: 'first_upload',       title: 'First Upload',          icon: '🥇', description: 'Uploaded your first performance video' },
  { key: 'views_100',          title: '100 Views',             icon: '⭐', description: 'Reached 100 total video views' },
  { key: 'views_1000',         title: '1,000 Views',           icon: '⭐', description: 'Reached 1,000 total video views' },
  { key: 'appreciations_100',  title: '100 Appreciations',     icon: '❤️', description: 'Earned 100 total appreciations' },
  { key: 'appreciations_1000', title: '1,000 Appreciations',   icon: '❤️', description: 'Earned 1,000 total appreciations' },
  { key: 'followers_100',      title: '100 Followers',         icon: '👥', description: 'Gained 100 followers on TalentHub' },
  { key: 'top_performer',     title: 'Top Performer',         icon: '🏆', description: 'Recognized as a Top Performer' },
  { key: 'active_streak_7',    title: '7-Day Active Streak',   icon: '🔥', description: 'Maintained an active streak for 7 consecutive days' },
  { key: 'first_live',         title: 'First Live Stream',     icon: '🎤', description: 'Hosted your first live performance' },
  { key: 'first_collab',       title: 'First Collaboration',   icon: '🤝', description: 'Created or joined a collaboration request' },
];

// Helper: Helper function to calculate total appreciations for a post/video
const countAppreciations = (item) => {
  if (!item) return 0;
  let count = 0;
  if (item.likes && Array.isArray(item.likes)) count += item.likes.length;
  if (item.appreciations) {
    const apps = item.appreciations;
    count += (apps.applause?.length || 0) +
             (apps.lovedIt?.length || 0) +
             (apps.outstanding?.length || 0) +
             (apps.inspiring?.length || 0);
  }
  return count;
};

// Internal function to evaluate achievements
const checkAndUnlockAchievements = async (userId) => {
  try {
    const user = await User.findById(userId);
    if (!user) return [];

    const userVideos = await Video.find({ uploader: userId });
    const userThoughts = await Thought.find({ author: userId });
    const userCollabs = await Collab.find({ $or: [{ creator: userId }, { 'applicants.user': userId }] });

    const totalVideos = userVideos.length;
    const totalViews = userVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const totalVideoApps = userVideos.reduce((sum, v) => sum + countAppreciations(v), 0);
    const totalThoughtApps = userThoughts.reduce((sum, t) => sum + countAppreciations(t), 0);
    const totalAppreciations = totalVideoApps + totalThoughtApps;
    const followerCount = user.followers ? user.followers.length : 0;
    const streakCount = user.activeStreak ? user.activeStreak.count : 0;
    const totalCollabs = userCollabs.length;

    const currentUnlockedKeys = new Set((user.achievements || []).map(a => a.key));
    const newlyUnlocked = [];

    const checkCondition = (key, condition) => {
      if (condition && !currentUnlockedKeys.has(key)) {
        newlyUnlocked.push(key);
      }
    };

    checkCondition('first_upload', totalVideos >= 1);
    checkCondition('views_100', totalViews >= 100);
    checkCondition('views_1000', totalViews >= 1000);
    checkCondition('appreciations_100', totalAppreciations >= 100);
    checkCondition('appreciations_1000', totalAppreciations >= 1000);
    checkCondition('followers_100', followerCount >= 100);
    checkCondition('top_performer', totalViews >= 500 && totalAppreciations >= 50);
    checkCondition('active_streak_7', streakCount >= 7);
    checkCondition('first_live', user.hasGoneLive === true);
    checkCondition('first_collab', totalCollabs >= 1);

    if (newlyUnlocked.length > 0) {
      const now = new Date();
      newlyUnlocked.forEach(key => {
        user.achievements.push({ key, unlockedAt: now });
      });
      await user.save();
    }

    return newlyUnlocked.map(key => ALL_ACHIEVEMENTS.find(a => a.key === key)).filter(Boolean);
  } catch (err) {
    console.error('Error evaluating achievements:', err);
    return [];
  }
};

// GET /api/achievements/user/:userId
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    await checkAndUnlockAchievements(userId);

    const user = await User.findById(userId).select('achievements');
    if (!user) return res.status(404).json({ message: 'User not found' });

    const unlockedMap = new Map();
    (user.achievements || []).forEach(a => unlockedMap.set(a.key, a.unlockedAt));

    const result = ALL_ACHIEVEMENTS.map(ach => ({
      ...ach,
      unlocked: unlockedMap.has(ach.key),
      unlockedAt: unlockedMap.get(ach.key) || null,
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/achievements/check (Authenticated check)
router.post('/check', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const newlyUnlocked = await checkAndUnlockAchievements(userId);
    res.json({ newlyUnlocked });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = { router, checkAndUnlockAchievements };
