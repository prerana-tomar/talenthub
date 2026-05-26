const express = require('express');
const router  = express.Router();
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const path    = require('path');
const fs      = require('fs');
const User    = require('../models/User');
const Video   = require('../models/Video');
const { OAuth2Client } = require('google-auth-library');

// ── Google Client — .env se aayega ──
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// ── Inline auth middleware ──
const auth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'No token provided.' });
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { _id: decoded.id, id: decoded.id, username: decoded.username };
    next();
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token.' });
  }
};

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password)
    return res.status(400).json({ message: 'All fields are required.' });
  try {
    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ message: 'Email already registered.' });
    const hashed = await bcrypt.hash(password, 10);
    const user   = await User.create({ username, email, password: hashed });
    const token  = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user: { id: user._id, username, email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    return res.status(400).json({ message: 'Email and password required.' });
  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: 'User not found.' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Incorrect password.' });
    const token = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user._id, username: user.username, email } });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/google — Google Login
router.post('/google', async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ message: 'Token required' });

    const ticket = await googleClient.verifyIdToken({
      idToken:  token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const { email, name, picture, sub: googleId } = ticket.getPayload();

    let user = await User.findOne({ email });

    if (!user) {
      user = await User.create({
        username:     name.replace(/\s+/g, '').toLowerCase() + Math.floor(Math.random() * 999),
        email,
        password:     'google_' + googleId,
        profilePic:   picture || '',
        googleId,
        isGoogleUser: true,
      });
    } else {
      if (!user.googleId)               user.googleId   = googleId;
      if (!user.profilePic && picture)  user.profilePic = picture;
      await user.save();
    }

    const jwtToken = jwt.sign(
      { id: user._id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      token: jwtToken,
      user:  { _id: user._id, username: user.username, email: user.email, profilePic: user.profilePic || '' },
    });

  } catch (err) {
    console.error('Google auth error:', err);
    res.status(500).json({ message: 'Google authentication failed', error: err.message });
  }
});

// GET /api/auth/count
router.get('/count', async (req, res) => {
  try {
    const count = await User.countDocuments();
    res.json({ count });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/top-performers
router.get('/top-performers', async (req, res) => {
  try {
    const topUsers = await User.find()
      .select('username profilePic followers bio')
      .lean();
    const usersWithStats = await Promise.all(
      topUsers.map(async (u) => {
        const userVideos = await Video.find({ uploader: u._id });
        const totalViews = userVideos.reduce((sum, v) => sum + (v.views || 0), 0);
        return { ...u, videoCount: userVideos.length, totalViews };
      })
    );
    usersWithStats.sort((a, b) => (b.followers?.length || 0) - (a.followers?.length || 0));
    res.json(usersWithStats.slice(0, 5));
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/users
router.get('/users', auth, async (req, res) => {
  try {
    const users = await User.find({ _id: { $ne: req.user._id } })
      .select('username email followers following profilePic bio')
      .limit(20);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST /api/auth/follow/:id
router.post('/follow/:id', auth, async (req, res) => {
  try {
    const targetId = req.params.id;
    const myId     = req.user._id || req.user.id;
    if (targetId === myId.toString())
      return res.status(400).json({ message: 'Apne aap ko follow nahi kar sakte' });
    const [target, me] = await Promise.all([
      User.findById(targetId),
      User.findById(myId),
    ]);
    if (!target || !me) return res.status(404).json({ message: 'User not found' });
    const alreadyFollowing = me.following?.map(id => id.toString()).includes(targetId);
    if (alreadyFollowing) {
      await User.findByIdAndUpdate(myId,     { $pull: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $pull: { followers: myId } });
      return res.json({ following: false, message: 'Unfollowed' });
    } else {
      await User.findByIdAndUpdate(myId,     { $addToSet: { following: targetId } });
      await User.findByIdAndUpdate(targetId, { $addToSet: { followers: myId } });
      return res.json({ following: true, message: 'Followed' });
    }
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/following
router.get('/following', auth, async (req, res) => {
  try {
    const myId = req.user._id || req.user.id;
    const me   = await User.findById(myId)
      .populate('following', 'username profilePic bio followers').lean();
    if (!me) return res.status(404).json({ message: 'User not found' });
    res.json(me.following || []);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/auth/followers
router.get('/followers', auth, async (req, res) => {
  try {
    const myId = req.user._id || req.user.id;
    const me   = await User.findById(myId)
      .populate('followers', 'username profilePic bio followers').lean();
    if (!me) return res.status(404).json({ message: 'User not found' });
    res.json(me.followers || []);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE /api/auth/delete-account
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId     = req.user._id || req.user.id;
    const userVideos = await Video.find({ uploadedBy: userId });
    for (const video of userVideos) {
      if (video.videoUrl) {
        const filePath = path.join(__dirname, '..', video.videoUrl);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      }
      await video.deleteOne();
    }
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ message: 'Account deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error while deleting account' });
  }
});

module.exports = router;