const express  = require('express');
const router   = express.Router();
const multer   = require('multer');
const path     = require('path');
const fs       = require('fs');
const Thought  = require('../models/Thought');
const { protect } = require('../middleware/authMiddleware');

// Multer for thought images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = 'uploads/thoughts';
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only images allowed'));
  },
});

// GET all thoughts
router.get('/', async (req, res) => {
  try {
    const { category, sort = 'newest', page = 1, limit = 10 } = req.query;
    const filter = category && category !== 'All' ? { category } : {};
    const sortMap = {
      newest:  { createdAt: -1 },
      popular: { likes: -1 },
    };
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [thoughts, total] = await Promise.all([
      Thought.find(filter)
        .populate('author',           'username email')
        .populate('comments.user',    'username')
        .sort(sortMap[sort] || { createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Thought.countDocuments(filter),
    ]);
    res.json({ thoughts, total, page: parseInt(page) });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST create thought
router.post('/', protect, upload.single('image'), async (req, res) => {
  try {
    const { text, category } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text required' });

    const thought = await Thought.create({
      author:   req.user._id,
      text:     text.trim(),
      category: category || 'General',
      image:    req.file ? `/uploads/thoughts/${req.file.filename}` : '',
    });

    await thought.populate('author', 'username email');
    res.status(201).json(thought);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST like/unlike
router.post('/:id/like', protect, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    const uid     = req.user._id.toString();
    const liked   = thought.likes.map(l => l.toString()).includes(uid);

    if (liked) thought.likes = thought.likes.filter(l => l.toString() !== uid);
    else        thought.likes.push(req.user._id);

    await thought.save();
    res.json({ likes: thought.likes.length, liked: !liked });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// POST add comment
router.post('/:id/comment', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text required' });

    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    thought.comments.push({ user: req.user._id, text: text.trim() });
    await thought.save();
    await thought.populate('comments.user', 'username');

    res.json(thought.comments[thought.comments.length - 1]);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// DELETE thought
router.delete('/:id', protect, async (req, res) => {
  try {
    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });
    if (thought.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    if (thought.image) {
      const fp = path.join(__dirname, '..', thought.image);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
    await thought.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});







// ================================================
// YEH ROUTE apne talent-hub-backend/routes/thoughts.js
// mein module.exports ke UPAR paste karo
// ================================================

// PUT /api/thoughts/:id — edit thought (sirf author kar sakta hai)
router.put('/:id', protect, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Text required' });

    const thought = await Thought.findById(req.params.id);
    if (!thought) return res.status(404).json({ message: 'Not found' });

    if (thought.author.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });

    thought.text = text.trim();
    await thought.save();

    res.json({ message: 'Updated', text: thought.text });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});




module.exports = router;