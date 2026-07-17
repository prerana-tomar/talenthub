const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');

router.post('/generate', protect, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt || !prompt.trim()) {
    return res.status(400).json({ message: 'Prompt is required' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(400).json({
      message: 'GEMINI_API_KEY is missing in the backend .env file. Please add it to enable AI creative generation.'
    });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });
    
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error?.message || `Gemini API responded with status ${response.status}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Generation failed';
    res.json({ text });
  } catch (err) {
    console.error('Gemini content generation error:', err);
    res.status(500).json({ message: 'AI generation failed', error: err.message });
  }
});

module.exports = router;
