const express = require('express');
const router = express.Router();
const Collab = require('../models/Collab');
const authMiddleware = require('../middleware/auth');

// GET /api/collab - Get all collab requests
router.get('/', async (req, res) => {
  try {
    const collabs = await Collab.find()
      .populate('author', 'username profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(collabs);
  } catch (err) {
    console.error('GET /api/collab error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/collab/mine - Get all requests for logged in user
router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const collabs = await Collab.find({ author: userId })
      .populate('author', 'username profilePic')
      .sort({ createdAt: -1 })
      .lean();
    res.json(collabs);
  } catch (err) {
    console.error('GET /api/collab/mine error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/collab - Create a new collab request
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { skillNeeded, projectType, description, budget } = req.body;
    const userId = req.user.id || req.user._id;

    if (!skillNeeded || !projectType || !description?.trim() || !budget) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const collab = await Collab.create({
      author: userId,
      skillNeeded,
      projectType,
      description: description.trim(),
      budget
    });

    const populated = await collab.populate('author', 'username profilePic');
    res.status(201).json(populated);
  } catch (err) {
    console.error('POST /api/collab error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/collab/:id - Delete a collab request
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const collab = await Collab.findById(req.params.id);
    if (!collab) {
      return res.status(404).json({ message: 'Collab request not found' });
    }

    const userId = req.user.id || req.user._id;
    if (collab.author.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to delete this request' });
    }

    await collab.deleteOne();
    res.json({ message: 'Collab request deleted successfully' });
  } catch (err) {
    console.error('DELETE /api/collab/:id error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
