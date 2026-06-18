const express = require('express');
const router = express.Router();

router.post('/generate', async (req, res) => {
  const { prompt } = req.body;
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    res.json({ content: [{ text }] });
  } catch (err) {
    res.status(500).json({ message: 'Generation failed', error: err.message });
  }
});

module.exports = router;
