const express = require('express');
const router = express.Router();
const HelpRequest = require('../models/HelpRequest');
const auth = require('../middleware/auth');

// POST /api/help-requests - Create a new help request (user)
router.post('/', auth, async (req, res) => {
  try {
    const { writing, context, type, language, mood } = req.body;
    if (!writing) {
      return res.status(400).json({ message: 'Writing content is required' });
    }

    const helpRequest = await HelpRequest.create({
      userId: req.user.id || req.user._id,
      writing: writing.trim(),
      context: context ? context.trim() : '',
      type,
      language,
      mood,
      status: 'pending'
    });

    res.status(201).json(helpRequest);
  } catch (err) {
    console.error('Create help request error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/help-requests/my - Get current user's submitted requests (user)
router.get('/my', auth, async (req, res) => {
  try {
    const userId = req.user.id || req.user._id;
    const requests = await HelpRequest.find({ userId }).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    console.error('Get my help requests error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/help-requests/all - Get all help requests (admin)
router.get('/all', async (req, res) => {
  try {
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized: Admin password mismatch' });
    }

    const requests = await HelpRequest.find()
      .populate('userId', 'username email')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    console.error('Get all help requests error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// PUT /api/help-requests/:id/respond - Respond to a help request (admin)
router.put('/:id/respond', async (req, res) => {
  try {
    const adminPassword = req.headers['x-admin-password'];
    if (!adminPassword || adminPassword !== process.env.ADMIN_PASSWORD) {
      return res.status(401).json({ message: 'Unauthorized: Admin password mismatch' });
    }

    const { response } = req.body;
    if (!response || !response.trim()) {
      return res.status(400).json({ message: 'Response content is required' });
    }

    const helpRequest = await HelpRequest.findById(req.params.id);
    if (!helpRequest) {
      return res.status(404).json({ message: 'Help request not found' });
    }

    helpRequest.response = response.trim();
    helpRequest.status = 'resolved';
    await helpRequest.save();

    res.json(helpRequest);
  } catch (err) {
    console.error('Respond to help request error:', err);
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
